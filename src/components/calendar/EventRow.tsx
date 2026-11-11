import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router'
import { LicensePlate } from '@/components/LicensePlate'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { CalendarEvent } from '@/lib/calendar'
import { cn } from '@/lib/cn'
import { daysBetween, formatDate, type ISODate } from '@shared/dates'
import { relativeDaysLabel, relativeDueLabel, toneForDays } from '@shared/status'
import { EVENT_STYLES } from './eventStyles'

interface EventRowProps {
  event: CalendarEvent
  today: ISODate
  /** Datum se ne prikazuje kad je popis već za jedan dan. */
  showDate?: boolean
}

/** Jedan događaj; klik otvara profil vozila s poviješću aktivnosti. */
export function EventRow({ event, today, showDate = true }: EventRowProps) {
  const { icon: Icon, tone } = EVENT_STYLES[event.kind]
  const days = daysBetween(today, event.date)
  const label = event.kind === 'registration_expiry' ? relativeDaysLabel(days) : relativeDueLabel(days)

  return (
    <li>
      <Link
        to={`/vozila/${event.vehicleId}`}
        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2/60 sm:px-5"
      >
        <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', tone)}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium break-words">{event.title}</p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
            <span className="truncate">{event.vehicleName}</span>
            <LicensePlate value={event.plate} />
          </div>
          {event.detail && <p className="mt-1 text-sm text-muted break-words">{event.detail}</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 text-right">
          {showDate && <span className="text-sm font-medium tabular-nums">{formatDate(event.date)}</span>}
          {event.isDeadline && <StatusBadge tone={toneForDays(days)}>{label}</StatusBadge>}
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted" aria-hidden="true" />
      </Link>
    </li>
  )
}
