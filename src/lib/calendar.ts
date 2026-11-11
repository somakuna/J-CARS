import type { ActivityWithVehicle } from '@/data/activities'
import type { VehicleOverview } from '@/types/database'
import { formatDate, formatMileage, type ISODate } from '@shared/dates'
import { activityHeading } from './activityFilters'
import { SERVICE_TYPES, TIRE_TYPES } from './labels'

/** 'YYYY-MM' */
export type MonthKey = string

export const MONTH_NAMES = [
  'Siječanj', 'Veljača', 'Ožujak', 'Travanj', 'Svibanj', 'Lipanj',
  'Srpanj', 'Kolovoz', 'Rujan', 'Listopad', 'Studeni', 'Prosinac',
]
export const WEEKDAY_SHORT = ['Pon', 'Uto', 'Sri', 'Čet', 'Pet', 'Sub', 'Ned']

const pad = (n: number) => String(n).padStart(2, '0')

export function isMonthKey(value: string | null): value is MonthKey {
  return value !== null && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
}

export function monthOf(date: ISODate): MonthKey {
  return date.slice(0, 7)
}

export function shiftMonth(month: MonthKey, delta: number): MonthKey {
  const [y, m] = month.split('-').map(Number)
  const index = y * 12 + (m - 1) + delta
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`
}

/** „Studeni 2026.” */
export function monthLabel(month: MonthKey): string {
  const [y, m] = month.split('-').map(Number)
  return `${MONTH_NAMES[m - 1]} ${y}.`
}

/** Tjedni (pon – ned) koji pokrivaju mjesec; dani izvan mjeseca također su uključeni. */
export function monthGrid(month: MonthKey): ISODate[][] {
  const [y, m] = month.split('-').map(Number)
  const first = new Date(Date.UTC(y, m - 1, 1))
  const offset = (first.getUTCDay() + 6) % 7 // ponedjeljak = 0
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const weeks = Math.ceil((offset + daysInMonth) / 7)
  const grid: ISODate[][] = []
  for (let w = 0; w < weeks; w++) {
    const week: ISODate[] = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(Date.UTC(y, m - 1, 1 - offset + w * 7 + d))
      week.push(`${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`)
    }
    grid.push(week)
  }
  return grid
}

/** Vrste događaja u kalendaru: rokovi i obavljene/planirane aktivnosti. */
export type CalendarEventKind = 'registration_expiry' | 'service_due' | 'registration' | 'tires' | 'service' | 'other'

export interface CalendarEvent {
  key: string
  date: ISODate
  kind: CalendarEventKind
  title: string
  detail: string | null
  /** Rok (istek, planirani servis) – za prikaz statusa. */
  isDeadline: boolean
  vehicleId: string
  vehicleName: string
  plate: string
  activityId: string | null
}

export const EVENT_KIND_LABELS: Record<CalendarEventKind, string> = {
  registration_expiry: 'Istek registracije',
  service_due: 'Planirani servis',
  registration: 'Registracija',
  tires: 'Promjena guma',
  service: 'Servis',
  other: 'Ostalo',
}

function activityDetail(a: ActivityWithVehicle): string | null {
  switch (a.activity_type) {
    case 'registration':
      return a.registration_expiry ? `Vrijedi do ${formatDate(a.registration_expiry)}` : null
    case 'tires':
      return [a.tire_type && TIRE_TYPES[a.tire_type].label, a.tire_size].filter(Boolean).join(' · ') || null
    case 'service':
      return [a.service_type && SERVICE_TYPES[a.service_type], a.mileage != null && formatMileage(a.mileage)]
        .filter(Boolean)
        .join(' · ') || null
    default:
      return a.description ? a.description.split('\n')[0].slice(0, 80) : null
  }
}

/**
 * Svi događaji: rokovi aktivnih vozila (istek registracije, planirani servis po datumu)
 * i sve aktivnosti (i za neaktivna vozila – to je povijest).
 */
export function buildCalendarEvents(vehicles: VehicleOverview[], activities: ActivityWithVehicle[]): CalendarEvent[] {
  const events: CalendarEvent[] = []

  for (const v of vehicles) {
    if (!v.is_active) continue
    const vehicle = { vehicleId: v.id, vehicleName: `${v.make} ${v.model}`, plate: v.registration_number }
    events.push({
      key: `registration_expiry:${v.id}`,
      date: v.effective_registration_expiry,
      kind: 'registration_expiry',
      title: 'Istek registracije',
      detail: null,
      isDeadline: true,
      activityId: null,
      ...vehicle,
    })
    if (v.next_service_date) {
      events.push({
        key: `service_due:${v.id}`,
        date: v.next_service_date,
        kind: 'service_due',
        title: 'Planirani servis',
        detail: v.next_service_mileage != null ? `ili na ${formatMileage(v.next_service_mileage)}` : null,
        isDeadline: true,
        activityId: null,
        ...vehicle,
      })
    }
  }

  for (const a of activities) {
    if (!a.vehicle) continue
    events.push({
      key: `activity:${a.id}`,
      date: a.activity_date,
      kind: a.activity_type,
      title: activityHeading(a),
      detail: activityDetail(a),
      isDeadline: false,
      vehicleId: a.vehicle.id,
      vehicleName: `${a.vehicle.make} ${a.vehicle.model}`,
      plate: a.vehicle.registration_number,
      activityId: a.id,
    })
  }

  return events.sort((x, y) => (x.date === y.date ? Number(y.isDeadline) - Number(x.isDeadline) : x.date < y.date ? -1 : 1))
}

/** Događaji po datumu (za mrežu mjeseca). */
export function groupByDate(events: CalendarEvent[]): Map<ISODate, CalendarEvent[]> {
  const map = new Map<ISODate, CalendarEvent[]>()
  for (const e of events) {
    const list = map.get(e.date)
    if (list) list.push(e)
    else map.set(e.date, [e])
  }
  return map
}

/** Grupe po mjesecu u zadanom redoslijedu (za popise „Nadolazeće” i „Prošlo”). */
export function groupByMonth(events: CalendarEvent[]): Array<{ month: MonthKey; events: CalendarEvent[] }> {
  const groups: Array<{ month: MonthKey; events: CalendarEvent[] }> = []
  for (const e of events) {
    const month = monthOf(e.date)
    const last = groups[groups.length - 1]
    if (last && last.month === month) last.events.push(e)
    else groups.push({ month, events: [e] })
  }
  return groups
}
