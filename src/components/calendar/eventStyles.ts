import { CalendarCheck, CalendarClock, CalendarX2, CircleDot, ClipboardList, Wrench, type LucideIcon } from 'lucide-react'
import type { CalendarEventKind } from '@/lib/calendar'
import { ACTIVITY_ICON_TONES } from '@/lib/labels'

/** Boja i ikona po vrsti događaja – iste u mreži mjeseca, popisima i legendi. */
export const EVENT_STYLES: Record<CalendarEventKind, { icon: LucideIcon; tone: string; dot: string }> = {
  registration_expiry: { icon: CalendarX2, tone: 'bg-danger-soft text-danger', dot: 'bg-danger' },
  service_due: { icon: CalendarClock, tone: 'bg-warn-soft text-warn', dot: 'bg-warn' },
  registration: { icon: CalendarCheck, tone: ACTIVITY_ICON_TONES.registration, dot: 'bg-ok' },
  tires: { icon: CircleDot, tone: ACTIVITY_ICON_TONES.tires, dot: 'bg-info' },
  service: { icon: Wrench, tone: ACTIVITY_ICON_TONES.service, dot: 'bg-brand-strong' },
  other: { icon: ClipboardList, tone: ACTIVITY_ICON_TONES.other, dot: 'bg-muted' },
}
