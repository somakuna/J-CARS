import type { BackupData, ExportActivity } from '@/lib/exportData'
import { supabase } from '@/lib/supabase'
import type { VehicleOverview } from '@/types/database'

/** Supabase vraća najviše 1000 redaka po upitu – izvoz mora dohvatiti sve, pa ide po stranicama. */
const PAGE_SIZE = 1000

type Page<T> = PromiseLike<{ data: T[] | null; error: unknown }>

async function fetchAll<T>(page: (from: number, to: number) => Page<T>): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1)
    if (error) throw error
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE_SIZE) return rows
  }
}

export interface ExportData extends BackupData {
  overview: VehicleOverview[]
  activitiesWithVehicle: ExportActivity[]
}

/** Svi podaci prijavljenog korisnika za izvoz (RLS vraća samo njegove zapise). */
export async function fetchExportData(): Promise<ExportData> {
  const [overview, vehicles, activities, settings, notificationLogs] = await Promise.all([
    fetchAll((from, to) => supabase.from('vehicle_overview').select('*').order('id').range(from, to)),
    fetchAll((from, to) => supabase.from('vehicles').select('*').order('id').range(from, to)),
    fetchAll((from, to) =>
      supabase
        .from('activities')
        .select('*, vehicle:vehicles(make, model, registration_number)')
        .order('id')
        .range(from, to)
        .overrideTypes<ExportActivity[], { merge: false }>(),
    ),
    supabase.from('settings').select('*').maybeSingle(),
    fetchAll((from, to) => supabase.from('notification_logs').select('*').order('id').range(from, to)),
  ])
  if (settings.error) throw settings.error

  // Sigurnosna kopija sadrži izvorne retke, bez ugniježđenog vozila.
  const plainActivities = activities.map(({ vehicle: _vehicle, ...activity }) => activity)

  return {
    overview,
    vehicles,
    activities: plainActivities,
    activitiesWithVehicle: activities,
    settings: settings.data,
    notificationLogs,
  }
}
