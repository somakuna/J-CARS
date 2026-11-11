/**
 * Izvoz podataka: CSV tablice za Excel i JSON sigurnosna kopija.
 * Samo pretvorba podataka – dohvat je u data/export.ts, spremanje u lib/download.ts.
 */
import { formatDate, formatDateTime, type ISODate } from '@shared/dates'
import type { Activity, NotificationLog, Settings, Vehicle, VehicleOverview } from '@/types/database'
import { activityHeading } from './activityFilters'
import { toCsv, type CsvColumn } from './csv'
import { ACTIVITY_TYPES, SERVICE_TYPES, TIRE_TYPES } from './labels'

/** Prazno polje u CSV-u umjesto „—” iz prikaza. */
function date(value: ISODate | null | undefined): string {
  return value ? formatDate(value) : ''
}

const VEHICLE_COLUMNS: CsvColumn<VehicleOverview>[] = [
  { header: 'Marka', value: (v) => v.make },
  { header: 'Model', value: (v) => v.model },
  { header: 'Registracija', value: (v) => v.registration_number },
  { header: 'Godina proizvodnje', value: (v) => v.year },
  { header: 'Kilometraža', value: (v) => v.effective_mileage },
  { header: 'Istek registracije', value: (v) => date(v.effective_registration_expiry) },
  { header: 'Gume', value: (v) => v.current_tire_type && TIRE_TYPES[v.current_tire_type].label },
  { header: 'Dimenzija guma', value: (v) => v.current_tire_size },
  { header: 'Zadnja promjena guma', value: (v) => date(v.last_tire_change_date) },
  { header: 'Zadnji servis', value: (v) => date(v.last_service_date) },
  { header: 'Vrsta zadnjeg servisa', value: (v) => v.last_service_type && SERVICE_TYPES[v.last_service_type] },
  { header: 'Sljedeći servis (datum)', value: (v) => date(v.next_service_date) },
  { header: 'Sljedeći servis (km)', value: (v) => v.next_service_mileage },
  { header: 'Odgovorna osoba', value: (v) => v.responsible_person },
  { header: 'Aktivno', value: (v) => v.is_active },
  { header: 'Napomena', value: (v) => v.note },
  { header: 'Dodano', value: (v) => formatDateTime(v.created_at) },
]

export type ExportActivity = Activity & { vehicle: Pick<Vehicle, 'make' | 'model' | 'registration_number'> | null }

const ACTIVITY_COLUMNS: CsvColumn<ExportActivity>[] = [
  { header: 'Datum', value: (a) => date(a.activity_date) },
  { header: 'Vozilo', value: (a) => (a.vehicle ? `${a.vehicle.make} ${a.vehicle.model}` : '') },
  { header: 'Registracija vozila', value: (a) => a.vehicle?.registration_number },
  { header: 'Vrsta', value: (a) => ACTIVITY_TYPES[a.activity_type].label },
  { header: 'Naslov', value: (a) => activityHeading(a) },
  { header: 'Opis', value: (a) => a.description },
  { header: 'Kilometraža', value: (a) => a.mileage },
  { header: 'Registracija vrijedi do', value: (a) => date(a.registration_expiry) },
  { header: 'Gume', value: (a) => a.tire_type && TIRE_TYPES[a.tire_type].label },
  { header: 'Dimenzija guma', value: (a) => a.tire_size },
  { header: 'Vrsta servisa', value: (a) => a.service_type && SERVICE_TYPES[a.service_type] },
  { header: 'Sljedeći servis (datum)', value: (a) => date(a.next_service_date) },
  { header: 'Sljedeći servis (km)', value: (a) => a.next_service_mileage },
  { header: 'Podsjetnik', value: (a) => a.reminder_enabled },
]

/** Vozila po marki, modelu i registraciji. */
export function vehiclesCsv(vehicles: readonly VehicleOverview[]): string {
  const sorted = [...vehicles].sort(
    (a, b) =>
      a.make.localeCompare(b.make, 'hr') ||
      a.model.localeCompare(b.model, 'hr') ||
      a.registration_number.localeCompare(b.registration_number, 'hr'),
  )
  return toCsv(VEHICLE_COLUMNS, sorted)
}

/** Aktivnosti od najnovije prema najstarijoj. */
export function activitiesCsv(activities: readonly ExportActivity[]): string {
  const sorted = [...activities].sort(
    (a, b) => b.activity_date.localeCompare(a.activity_date) || b.created_at.localeCompare(a.created_at),
  )
  return toCsv(ACTIVITY_COLUMNS, sorted)
}

export const BACKUP_FORMAT = 'j-cars-backup'
export const BACKUP_VERSION = 1

export interface BackupData {
  vehicles: Vehicle[]
  activities: Activity[]
  settings: Settings | null
  notificationLogs: NotificationLog[]
}

/**
 * Potpuna sigurnosna kopija: izvorni zapisi iz baze (ISO datumi, izvorni ID-jevi),
 * kako bi se iz nje mogli vratiti podaci. Push pretplate se ne izvoze – vezane su
 * uz pojedini uređaj i sadrže njegove ključeve.
 */
export function backupJson(data: BackupData, exportedAt: Date = new Date()): string {
  return JSON.stringify(
    {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      app: 'J-CARS',
      exportedAt: exportedAt.toISOString(),
      counts: {
        vehicles: data.vehicles.length,
        activities: data.activities.length,
        notificationLogs: data.notificationLogs.length,
      },
      vehicles: data.vehicles,
      activities: data.activities,
      settings: data.settings,
      notificationLogs: data.notificationLogs,
    },
    null,
    2,
  )
}

/** Naziv datoteke s današnjim datumom, npr. j-cars-vozila-2026-11-11.csv */
export function exportFileName(kind: 'vozila' | 'aktivnosti' | 'sigurnosna-kopija', today: ISODate, ext: 'csv' | 'json'): string {
  return `j-cars-${kind}-${today}.${ext}`
}
