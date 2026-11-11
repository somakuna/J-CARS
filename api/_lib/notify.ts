import type { User } from '@supabase/supabase-js'
import type { Database, NotificationChannel, Settings } from '../../src/types/database.js'
import { buildObligations } from '../../shared/obligations.js'
import { enabledIntervals, planReminders, reminderKey, reminderText, type PlannedReminder } from '../../shared/reminders.js'
import { sendEmail } from './email.js'
import { env } from './env.js'
import { reminderEmail, reminderPush, testEmail, testPush, type ReminderItem } from './messages.js'
import { pushRecipient, sendPush, type PushPayload } from './push.js'
import type { AdminClient } from './supabaseAdmin.js'

type LogInsert = Database['public']['Tables']['notification_logs']['Insert']

export interface UserResult {
  userId: string
  planned: number
  email: 'sent' | 'failed' | 'disabled' | 'nothing'
  push: 'sent' | 'failed' | 'disabled' | 'nothing' | 'no_devices'
  error?: string
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** Dnevna provjera rokova za sve korisnike. Greška kod jednog korisnika ne zaustavlja ostale. */
export async function runDailyCheck(db: AdminClient, today: string): Promise<UserResult[]> {
  const { data: settingsRows, error } = await db.from('settings').select('*')
  if (error) throw error
  const results: UserResult[] = []
  for (const settings of settingsRows) {
    try {
      results.push(await processUser(db, settings, today))
    } catch (err) {
      results.push({ userId: settings.user_id, planned: 0, email: 'failed', push: 'failed', error: message(err) })
    }
  }
  return results
}

async function processUser(db: AdminClient, settings: Settings, today: string): Promise<UserResult> {
  const result: UserResult = { userId: settings.user_id, planned: 0, email: 'disabled', push: 'disabled' }
  if (!settings.email_notifications_enabled && !settings.push_notifications_enabled) return result

  const [vehiclesRes, activitiesRes] = await Promise.all([
    db.from('vehicle_overview').select('*').eq('user_id', settings.user_id).eq('is_active', true),
    db
      .from('activities')
      .select('id, vehicle_id, activity_type, activity_date, title, reminder_enabled')
      .eq('user_id', settings.user_id)
      .eq('activity_type', 'other')
      .eq('reminder_enabled', true)
      .gte('activity_date', today),
  ])
  if (vehiclesRes.error) throw vehiclesRes.error
  if (activitiesRes.error) throw activitiesRes.error

  const vehicles = new Map(vehiclesRes.data.map((v) => [v.id, v]))
  const planned = planReminders(buildObligations(vehiclesRes.data, activitiesRes.data, today), enabledIntervals(settings))
  result.planned = planned.length
  if (planned.length === 0) {
    result.email = settings.email_notifications_enabled ? 'nothing' : 'disabled'
    result.push = settings.push_notifications_enabled ? 'nothing' : 'disabled'
    return result
  }

  // Što je za ove rokove već poslano (isti ključ kao jedinstveni indeks u bazi).
  const { data: sentLogs, error: logsError } = await db
    .from('notification_logs')
    .select('vehicle_id, deadline_type, activity_id, deadline_date, reminder_interval, notification_type')
    .eq('user_id', settings.user_id)
    .eq('status', 'sent')
    .neq('deadline_type', 'test')
    .in('deadline_date', [...new Set(planned.map((p) => p.deadlineDate))])
  if (logsError) throw logsError
  const sent = new Set(
    sentLogs.map((l) =>
      reminderKey(l.vehicle_id ?? '', l.deadline_type, l.activity_id, l.deadline_date ?? '', l.reminder_interval ?? -1, l.notification_type),
    ),
  )
  const pending = (channel: NotificationChannel) =>
    planned.filter(
      (p) => !sent.has(reminderKey(p.obligation.vehicleId, p.deadlineType, p.obligation.activityId, p.deadlineDate, p.interval, channel)),
    )

  const toItem = (p: PlannedReminder): ReminderItem => {
    const v = vehicles.get(p.obligation.vehicleId)
    return {
      vehicleId: p.obligation.vehicleId,
      vehicleName: v ? `${v.make} ${v.model}` : 'Vozilo',
      plate: v?.registration_number ?? '',
      text: reminderText(p.obligation),
      tone: p.obligation.tone,
    }
  }
  const logRows = (items: PlannedReminder[], channel: NotificationChannel, status: 'sent' | 'failed', recipient: string | null, error?: string): LogInsert[] =>
    items.map((p) => ({
      user_id: settings.user_id,
      vehicle_id: p.obligation.vehicleId,
      activity_id: p.obligation.activityId,
      deadline_type: p.deadlineType,
      deadline_date: p.deadlineDate,
      reminder_interval: p.interval,
      notification_type: channel,
      status,
      recipient,
      error_message: error ?? null,
    }))

  // E-mail: jedna poruka sa svim rokovima kojima je danas na redu podsjetnik.
  if (settings.email_notifications_enabled) {
    const items = pending('email')
    if (items.length === 0) result.email = 'nothing'
    else {
      const to = await recipientEmail(db, settings)
      try {
        if (!to) throw new Error('Nema e-mail adrese primatelja.')
        await sendEmail({ to, ...reminderEmail(items.map(toItem), env.appUrl()) })
        await insertLogs(db, logRows(items, 'email', 'sent', to))
        result.email = 'sent'
      } catch (err) {
        await insertLogs(db, logRows(items, 'email', 'failed', to, message(err)))
        result.email = 'failed'
        result.error = message(err)
      }
    }
  }

  // Push: jedna obavijest na svaki prijavljeni uređaj.
  if (settings.push_notifications_enabled) {
    const items = pending('push')
    if (items.length === 0) result.push = 'nothing'
    else {
      const outcome = await pushToUser(db, settings.user_id, reminderPush(items.map(toItem)))
      if (outcome.devices === 0) result.push = 'no_devices'
      else {
        const ok = outcome.sent > 0
        await insertLogs(db, logRows(items, 'push', ok ? 'sent' : 'failed', `push: ${outcome.sent}/${outcome.devices} uređaja`, outcome.error))
        result.push = ok ? 'sent' : 'failed'
        if (!ok) result.error = outcome.error
      }
    }
  }

  return result
}

/** Probna obavijest za prijavljenog korisnika (gumb u postavkama). Vraća poruku za prikaz. */
export async function sendTestNotification(db: AdminClient, user: User, channel: NotificationChannel): Promise<string> {
  const { data: settings, error } = await db.from('settings').select('*').eq('user_id', user.id).maybeSingle()
  if (error) throw error

  if (channel === 'email') {
    const to = settings?.email_address || user.email || null
    if (!to) throw new Error('Upišite e-mail adresu za obavijesti.')
    try {
      await sendEmail({ to, ...testEmail(env.appUrl()) })
      await insertLogs(db, [testLog(user.id, 'email', 'sent', to)])
      return `Probni e-mail poslan je na ${to}.`
    } catch (err) {
      await insertLogs(db, [testLog(user.id, 'email', 'failed', to, message(err))])
      throw err
    }
  }

  const outcome = await pushToUser(db, user.id, testPush())
  if (outcome.devices === 0) throw new Error('Nijedan uređaj nema uključene push obavijesti. Uključite ih na ovom uređaju.')
  const recipient = `push: ${outcome.sent}/${outcome.devices} uređaja`
  if (outcome.sent === 0) {
    await insertLogs(db, [testLog(user.id, 'push', 'failed', recipient, outcome.error)])
    throw new Error(outcome.error ?? 'Push obavijest nije poslana.')
  }
  await insertLogs(db, [testLog(user.id, 'push', 'sent', recipient)])
  return outcome.devices === 1 ? 'Probna push obavijest je poslana.' : `Probna push obavijest poslana je na ${outcome.sent} od ${outcome.devices} uređaja.`
}

// ---------------------------------------------------------------------------

async function recipientEmail(db: AdminClient, settings: Settings): Promise<string | null> {
  if (settings.email_address) return settings.email_address
  const { data } = await db.auth.admin.getUserById(settings.user_id)
  return data.user?.email ?? null
}

/** Šalje na sve uređaje korisnika; brisanje pretplata kojih više nema (404/410). */
async function pushToUser(db: AdminClient, userId: string, payload: PushPayload) {
  const { data: subscriptions, error } = await db.from('push_subscriptions').select('*').eq('user_id', userId)
  if (error) throw error
  let sent = 0
  let lastError: string | undefined
  for (const sub of subscriptions) {
    try {
      const status = await sendPush(sub, payload)
      if (status === 'gone') {
        await db.from('push_subscriptions').delete().eq('id', sub.id)
        lastError = `Pretplata ${pushRecipient(sub.endpoint)} više ne postoji i obrisana je.`
      } else {
        sent += 1
        await db.from('push_subscriptions').update({ last_success_at: new Date().toISOString() }).eq('id', sub.id)
      }
    } catch (err) {
      lastError = message(err)
    }
  }
  return { devices: subscriptions.length, sent, error: lastError }
}

function testLog(userId: string, channel: NotificationChannel, status: 'sent' | 'failed', recipient: string | null, error?: string): LogInsert {
  return {
    user_id: userId,
    deadline_type: 'test',
    notification_type: channel,
    status,
    recipient,
    error_message: error ?? null,
  }
}

async function insertLogs(db: AdminClient, rows: LogInsert[]): Promise<void> {
  if (rows.length === 0) return
  const { error } = await db.from('notification_logs').insert(rows)
  // 23505: isti podsjetnik već je zabilježen (npr. dvije provjere u isto vrijeme) – nije greška.
  if (error && error.code !== '23505') throw error
}
