import { CalendarCheck, CircleDot, ClipboardList, Snowflake, Sun, SunSnow, Wrench, type LucideIcon } from 'lucide-react'
import type { ActivityType, ServiceType, TireType } from '@/types/database'

export const TIRE_TYPES: Record<TireType, { label: string; icon: LucideIcon }> = {
  summer: { label: 'Ljetne', icon: Sun },
  winter: { label: 'Zimske', icon: Snowflake },
  all_season: { label: 'Cjelogodišnje', icon: SunSnow },
}

export const SERVICE_TYPES: Record<ServiceType, string> = {
  minor: 'Mali servis',
  major: 'Veliki servis',
  repair: 'Popravak',
  other: 'Ostalo',
}

export const ACTIVITY_TYPES: Record<ActivityType, { label: string; icon: LucideIcon }> = {
  registration: { label: 'Registracija', icon: CalendarCheck },
  tires: { label: 'Promjena guma', icon: CircleDot },
  service: { label: 'Servis', icon: Wrench },
  other: { label: 'Ostalo', icon: ClipboardList },
}

/** Boja ikone po vrsti aktivnosti (povijest, izbor vrste). */
export const ACTIVITY_ICON_TONES: Record<ActivityType, string> = {
  registration: 'bg-ok-soft text-ok',
  tires: 'bg-info-soft text-info',
  service: 'bg-brand/25 text-fg',
  other: 'bg-surface-2 text-muted',
}

export const ACTIVITY_TYPE_ORDER: ActivityType[] = ['registration', 'tires', 'service', 'other']

export function isActivityType(value: string | null): value is ActivityType {
  return ACTIVITY_TYPE_ORDER.includes(value as ActivityType)
}
