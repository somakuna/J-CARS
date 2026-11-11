import { UserFacingError } from '@/lib/errors'
import { supabase } from '@/lib/supabase'
import type { NotificationChannel, NotificationLog, Settings, Vehicle } from '@/types/database'

export type SettingsPatch = Partial<Omit<Settings, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
export type NotificationLogWithVehicle = NotificationLog & {
  vehicle: Pick<Vehicle, 'make' | 'model' | 'registration_number'> | null
}

/** Postavke prijavljenog korisnika (jedan red, nastaje automatski pri izradi korisnika). */
export async function fetchSettings(): Promise<Settings> {
  const { data, error } = await supabase.from('settings').select('*').maybeSingle()
  if (error) throw error
  if (!data) throw new UserFacingError('Postavke nisu pronađene. Odjavite se i ponovno prijavite.')
  return data
}

export async function updateSettings(id: string, patch: SettingsPatch): Promise<Settings> {
  const { data, error } = await supabase.from('settings').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function fetchNotificationLogs(limit = 20): Promise<NotificationLogWithVehicle[]> {
  const { data, error } = await supabase
    .from('notification_logs')
    .select('*, vehicle:vehicles(make, model, registration_number)')
    .order('sent_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data as NotificationLogWithVehicle[]
}

/** Probna obavijest preko /api (tajni ključevi postoje samo na poslužitelju). */
export async function sendTestNotification(channel: NotificationChannel): Promise<string> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new UserFacingError('Prijava je istekla. Prijavite se ponovno.')

  let response: Response
  try {
    response = await fetch('/api/notifications/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ channel }),
    })
  } catch (error) {
    throw new UserFacingError('Nema veze s poslužiteljem. Provjerite internetsku vezu.', { cause: error })
  }

  const body = (await response.json().catch(() => null)) as { message?: string; error?: string } | null
  if (!response.ok || !body) {
    throw new UserFacingError(body?.error ?? 'Poslužitelj za obavijesti nije dostupan. Pokušajte ponovno kasnije.')
  }
  return body.message ?? 'Poslano.'
}
