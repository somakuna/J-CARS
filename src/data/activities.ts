import { supabase } from '@/lib/supabase'
import type { Activity, ActivityInsert, Vehicle } from '@/types/database'

export type ActivityVehicle = Pick<Vehicle, 'id' | 'make' | 'model' | 'registration_number' | 'is_active'>
export type ActivityWithVehicle = Activity & { vehicle: ActivityVehicle | null }

/** Podaci aktivnosti iz obrasca (bez vozila). */
export type ActivityFields = Required<Omit<ActivityInsert, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'vehicle_id'>>

const ACTIVITY_SELECT = '*, vehicle:vehicles(id, make, model, registration_number, is_active)'

/** Aktivnosti od najnovije prema najstarijoj; po želji samo za jedno vozilo. */
export async function fetchActivities(vehicleId?: string): Promise<ActivityWithVehicle[]> {
  let query = supabase
    .from('activities')
    .select(ACTIVITY_SELECT)
    .order('activity_date', { ascending: false })
    .order('created_at', { ascending: false })
  if (vehicleId) query = query.eq('vehicle_id', vehicleId)
  const { data, error } = await query
  if (error) throw error
  return data as ActivityWithVehicle[]
}

/** Jedna aktivnost; null ako ne postoji (ili je obrisana). */
export async function fetchActivity(id: string): Promise<ActivityWithVehicle | null> {
  const { data, error } = await supabase.from('activities').select(ACTIVITY_SELECT).eq('id', id).maybeSingle()
  if (error) throw error
  return data as ActivityWithVehicle | null
}

export async function createActivity(vehicleId: string, fields: ActivityFields): Promise<Activity> {
  const { data, error } = await supabase
    .from('activities')
    .insert({ ...fields, vehicle_id: vehicleId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateActivity(id: string, fields: ActivityFields): Promise<Activity> {
  const { data, error } = await supabase.from('activities').update(fields).eq('id', id).select().single()
  if (error) throw error
  return data
}

/** Briše aktivnost. Stanje vozila izvodi se iz preostalih aktivnosti. */
export async function deleteActivity(id: string): Promise<void> {
  const { error } = await supabase.from('activities').delete().eq('id', id)
  if (error) throw error
}
