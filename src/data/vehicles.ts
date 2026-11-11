import { supabase } from '@/lib/supabase'
import type { Vehicle, VehicleInsert, VehicleOverview } from '@/types/database'

/** Sva vozila s izvedenim podacima (stvarni istek registracije, gume, servis). */
export async function fetchVehicles(): Promise<VehicleOverview[]> {
  const { data, error } = await supabase
    .from('vehicle_overview')
    .select('*')
    .order('make')
    .order('model')
  if (error) throw error
  return data
}

/** Jedno vozilo; null ako ne postoji (ili je obrisano). */
export async function fetchVehicle(id: string): Promise<VehicleOverview | null> {
  const { data, error } = await supabase.from('vehicle_overview').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  return data
}

export async function createVehicle(input: VehicleInsert): Promise<Vehicle> {
  const { data, error } = await supabase.from('vehicles').insert(input).select().single()
  if (error) throw error
  return data
}

export async function updateVehicle(id: string, input: Partial<VehicleInsert>): Promise<Vehicle> {
  const { data, error } = await supabase.from('vehicles').update(input).eq('id', id).select().single()
  if (error) throw error
  return data
}

/** Broj aktivnosti vozila – za poruku pri brisanju. */
export async function countVehicleActivities(vehicleId: string): Promise<number> {
  const { count, error } = await supabase
    .from('activities')
    .select('id', { count: 'exact', head: true })
    .eq('vehicle_id', vehicleId)
  if (error) throw error
  return count ?? 0
}

/** Briše vozilo; njegove aktivnosti brišu se automatski (on delete cascade). */
export async function deleteVehicle(id: string): Promise<void> {
  const { error } = await supabase.from('vehicles').delete().eq('id', id)
  if (error) throw error
}
