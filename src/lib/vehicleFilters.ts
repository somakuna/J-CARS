import type { VehicleOverview } from '@/types/database'
import { daysBetween } from '@shared/dates'
import { WARN_DAYS } from '@shared/status'
import { compactText, matchesWords } from './text'

export type VehicleStatusFilter = 'all' | 'expiring' | 'expired' | 'inactive'
export type VehicleSort = 'deadline' | 'name'

export const STATUS_FILTERS: Array<{ value: VehicleStatusFilter; label: string }> = [
  { value: 'all', label: 'Sva' },
  { value: 'expiring', label: 'Uskoro ističe' },
  { value: 'expired', label: 'Isteklo' },
  { value: 'inactive', label: 'Neaktivna' },
]

export function isStatusFilter(value: string | null): value is VehicleStatusFilter {
  return STATUS_FILTERS.some((f) => f.value === value)
}

export function matchesSearch(vehicle: VehicleOverview, query: string): boolean {
  if (!query.trim()) return true
  const haystack = [vehicle.make, vehicle.model, vehicle.registration_number, vehicle.responsible_person ?? '', vehicle.note ?? ''].join(' ')
  if (matchesWords(haystack, query)) return true
  return compactText(vehicle.registration_number).includes(compactText(query))
}

export function matchesStatus(vehicle: VehicleOverview, filter: VehicleStatusFilter, today: string): boolean {
  if (filter === 'all') return true
  if (filter === 'inactive') return !vehicle.is_active
  if (!vehicle.is_active) return false
  const days = daysBetween(today, vehicle.effective_registration_expiry)
  if (filter === 'expired') return days < 0
  return days >= 0 && days <= WARN_DAYS
}

export function sortVehicles(vehicles: VehicleOverview[], sort: VehicleSort): VehicleOverview[] {
  return [...vehicles].sort((a, b) => {
    // Neaktivna vozila uvijek na kraju.
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1
    if (sort === 'deadline' && a.effective_registration_expiry !== b.effective_registration_expiry) {
      return a.effective_registration_expiry < b.effective_registration_expiry ? -1 : 1
    }
    return `${a.make} ${a.model}`.localeCompare(`${b.make} ${b.model}`, 'hr')
  })
}

export function countByStatus(vehicles: VehicleOverview[], today: string): Record<VehicleStatusFilter, number> {
  return {
    all: vehicles.length,
    expiring: vehicles.filter((v) => matchesStatus(v, 'expiring', today)).length,
    expired: vehicles.filter((v) => matchesStatus(v, 'expired', today)).length,
    inactive: vehicles.filter((v) => !v.is_active).length,
  }
}
