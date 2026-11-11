import { formatDate, type ISODate } from './dates.js'
import type { Obligation } from './obligations.js'
import { relativeDaysLabel, relativeDueLabel } from './status.js'

/**
 * Podsjetnici za obavijesti (e-mail i push). Dnevna provjera za svaku obvezu
 * s datumom bira NAJMANJI uključeni interval koji je dosegnut (dana do roka ≤ interval)
 * i šalje ga samo ako za isti rok, interval i kanal još ništa nije poslano.
 * Tako propušteni dan ne gubi podsjetnik, a isti se nikad ne šalje dvaput.
 * Promjena roka (npr. nova registracija) mijenja datum pa podsjetnici kreću ispočetka.
 */

export const REMINDER_INTERVALS = [30, 14, 7, 1, 0] as const
export type ReminderInterval = (typeof REMINDER_INTERVALS)[number]

export interface ReminderSettings {
  reminder_30_days: boolean
  reminder_14_days: boolean
  reminder_7_days: boolean
  reminder_1_day: boolean
  reminder_on_expiry: boolean
}

export function enabledIntervals(s: ReminderSettings): ReminderInterval[] {
  const flags: Record<ReminderInterval, boolean> = {
    30: s.reminder_30_days,
    14: s.reminder_14_days,
    7: s.reminder_7_days,
    1: s.reminder_1_day,
    0: s.reminder_on_expiry,
  }
  return REMINDER_INTERVALS.filter((i) => flags[i])
}

/** Najmanji uključeni interval koji je dosegnut; null ako još nijedan. */
export function dueInterval(daysLeft: number, enabled: readonly ReminderInterval[]): ReminderInterval | null {
  const reached = enabled.filter((interval) => daysLeft <= interval)
  return reached.length === 0 ? null : Math.min(...reached) as ReminderInterval
}

export type ReminderDeadlineType = 'registration' | 'service' | 'activity'

export interface PlannedReminder {
  obligation: Obligation
  deadlineType: ReminderDeadlineType
  deadlineDate: ISODate
  interval: ReminderInterval
}

/** Obveze kojima je danas na redu podsjetnik (prije provjere što je već poslano). */
export function planReminders(obligations: Obligation[], enabled: readonly ReminderInterval[]): PlannedReminder[] {
  const result: PlannedReminder[] = []
  for (const o of obligations) {
    // Servis zadan samo kilometražom nema datum – upozorenje je samo u aplikaciji.
    if (o.date === null || o.daysLeft === null) continue
    if (o.kind === 'activity' && !o.reminderEnabled) continue
    const interval = dueInterval(o.daysLeft, enabled)
    if (interval === null) continue
    result.push({ obligation: o, deadlineType: o.kind, deadlineDate: o.date, interval })
  }
  return result
}

/** Ključ za sprječavanje dvostrukog slanja – isti stupci kao jedinstveni indeks u notification_logs. */
export function reminderKey(
  vehicleId: string,
  deadlineType: string,
  activityId: string | null,
  deadlineDate: string,
  interval: number,
  channel: string,
): string {
  return [vehicleId, deadlineType, activityId ?? '-', deadlineDate, interval, channel].join('|')
}

/** „Istek registracije: ističe za 7 dana (18.11.2026)” */
export function reminderText(o: Obligation): string {
  const days = o.daysLeft ?? 0
  const status = o.kind === 'registration' ? relativeDaysLabel(days) : relativeDueLabel(days)
  const title = o.kind === 'service' ? 'Planirani servis' : o.title
  return `${title}: ${status.charAt(0).toLowerCase()}${status.slice(1)} (${formatDate(o.date)})`
}
