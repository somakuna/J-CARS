import type { ActivityWithVehicle } from '@/data/activities'
import type { Activity, ActivityType } from '@/types/database'
import { ACTIVITY_TYPES, SERVICE_TYPES, TIRE_TYPES } from './labels'
import { compactText, matchesWords } from './text'

export type ActivityTypeFilter = 'all' | ActivityType

export const ACTIVITY_TYPE_FILTERS: Array<{ value: ActivityTypeFilter; label: string }> = [
  { value: 'all', label: 'Sve' },
  { value: 'registration', label: 'Registracije' },
  { value: 'tires', label: 'Gume' },
  { value: 'service', label: 'Servisi' },
  { value: 'other', label: 'Ostalo' },
]

export function isActivityTypeFilter(value: string | null): value is ActivityTypeFilter {
  return ACTIVITY_TYPE_FILTERS.some((f) => f.value === value)
}

/** Naslov aktivnosti u povijesti: vlastiti naslov za „Ostalo”, inače naziv vrste. */
export function activityHeading(activity: Pick<Activity, 'activity_type' | 'title'>): string {
  if (activity.activity_type === 'other' && activity.title) return activity.title
  return ACTIVITY_TYPES[activity.activity_type].label
}

export function matchesActivitySearch(activity: ActivityWithVehicle, query: string): boolean {
  if (!query.trim()) return true
  const haystack = [
    ACTIVITY_TYPES[activity.activity_type].label,
    activity.title,
    activity.description,
    activity.tire_type && TIRE_TYPES[activity.tire_type].label,
    activity.tire_size,
    activity.service_type && SERVICE_TYPES[activity.service_type],
    activity.vehicle?.make,
    activity.vehicle?.model,
    activity.vehicle?.registration_number,
  ]
    .filter(Boolean)
    .join(' ')
  if (matchesWords(haystack, query)) return true
  const plate = activity.vehicle?.registration_number
  return plate ? compactText(plate).includes(compactText(query)) : false
}

export function countByType(activities: Array<Pick<Activity, 'activity_type'>>): Record<ActivityTypeFilter, number> {
  const counts: Record<ActivityTypeFilter, number> = { all: activities.length, registration: 0, tires: 0, service: 0, other: 0 }
  for (const a of activities) counts[a.activity_type] += 1
  return counts
}
