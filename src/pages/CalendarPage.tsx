import { CalendarDays, CalendarX2, Car, ChevronLeft, ChevronRight, History, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { EventRow } from '@/components/calendar/EventRow'
import { EVENT_STYLES } from '@/components/calendar/eventStyles'
import { Button } from '@/components/ui/Button'
import { buttonClasses } from '@/components/ui/buttonClasses'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { ErrorState, Skeleton } from '@/components/ui/States'
import { useActivities } from '@/hooks/useActivities'
import { useVehicles } from '@/hooks/useVehicles'
import {
  buildCalendarEvents,
  EVENT_KIND_LABELS,
  groupByDate,
  groupByMonth,
  isMonthKey,
  monthGrid,
  monthLabel,
  monthOf,
  shiftMonth,
  WEEKDAY_SHORT,
  type CalendarEvent,
  type CalendarEventKind,
  type MonthKey,
} from '@/lib/calendar'
import { cn } from '@/lib/cn'
import { formatDate, todayISO, type ISODate } from '@shared/dates'

type View = 'mjesec' | 'nadolazece' | 'proslo'

const VIEWS: Array<{ value: View; label: string }> = [
  { value: 'mjesec', label: 'Mjesec' },
  { value: 'nadolazece', label: 'Nadolazeće' },
  { value: 'proslo', label: 'Prošlo' },
]

const PAST_PAGE_SIZE = 100

function isView(value: string | null): value is View {
  return VIEWS.some((v) => v.value === value)
}

export function CalendarPage() {
  const [params, setParams] = useSearchParams()
  const vehicles = useVehicles()
  const activities = useActivities()
  const today = todayISO()

  const viewParam = params.get('prikaz')
  const view: View = isView(viewParam) ? viewParam : 'mjesec'
  const monthParam = params.get('mjesec')
  const month: MonthKey = isMonthKey(monthParam) ? monthParam : monthOf(today)
  const dayParam = params.get('dan')
  const selectedDay = dayParam && monthOf(dayParam) === month ? dayParam : null

  /** Prikaz i mjesec su u adresi – povratak s profila vozila vraća isti pogled. */
  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setParams(next, { replace: true })
  }

  const events = useMemo(
    () => (vehicles.data && activities.data ? buildCalendarEvents(vehicles.data, activities.data) : []),
    [vehicles.data, activities.data],
  )

  const error = vehicles.error ?? activities.error
  // Oba upita moraju biti učitana; inače se prikazuje kostur stranice.
  const ready = vehicles.data && activities.data ? { vehicles: vehicles.data, activities: activities.data } : null

  return (
    <>
      <PageHeader title="Kalendar" description="Istek registracija, servisi i ostale aktivnosti" />

      <div className="mb-4 inline-flex rounded-xl border border-border bg-surface p-1" role="group" aria-label="Prikaz">
        {VIEWS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={view === value}
            onClick={() => update({ prikaz: value === 'mjesec' ? null : value })}
            className={cn(
              'rounded-lg px-3.5 py-1.5 text-sm transition-colors',
              view === value ? 'bg-brand font-semibold text-ink' : 'text-muted hover:text-fg',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <Card>
          <ErrorState
            error={error}
            onRetry={() => {
              void vehicles.refetch()
              void activities.refetch()
            }}
          />
        </Card>
      ) : !ready ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : ready.vehicles.length === 0 ? (
        <Card>
          <EmptyState
            icon={Car}
            title="Još nema vozila"
            description="Kad dodate vozila, ovdje će se prikazivati istek registracija, servisi i aktivnosti."
            action={
              <Link to="/vozila/novo" className={buttonClasses('primary')}>
                <Plus className="size-4" aria-hidden="true" />
                Dodaj vozilo
              </Link>
            }
          />
        </Card>
      ) : view === 'mjesec' ? (
        <MonthView
          month={month}
          events={events}
          today={today}
          selectedDay={selectedDay}
          onSelectDay={(day) =>
            // Dan iz susjednog mjeseca prebacuje i mjesec.
            update({
              mjesec: monthOf(day) === monthOf(today) ? null : monthOf(day),
              dan: day === selectedDay ? null : day,
            })
          }
          onMonthChange={(next) => update({ mjesec: next === monthOf(today) ? null : next, dan: null })}
        />
      ) : view === 'nadolazece' ? (
        <UpcomingView events={events} today={today} />
      ) : (
        <PastView events={events} today={today} />
      )}
    </>
  )
}

// ---------------------------------------------------------------------------

interface MonthViewProps {
  month: MonthKey
  events: CalendarEvent[]
  today: ISODate
  selectedDay: ISODate | null
  onSelectDay: (day: ISODate) => void
  onMonthChange: (month: MonthKey) => void
}

function MonthView({ month, events, today, selectedDay, onSelectDay, onMonthChange }: MonthViewProps) {
  const byDate = useMemo(() => groupByDate(events), [events])
  const weeks = monthGrid(month)
  const monthEvents = events.filter((e) => monthOf(e.date) === month)
  const listed = selectedDay ? (byDate.get(selectedDay) ?? []) : monthEvents
  const isCurrentMonth = month === monthOf(today)

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center gap-2 border-b border-border px-3 py-2.5 sm:px-4">
          <Button variant="ghost" size="icon" onClick={() => onMonthChange(shiftMonth(month, -1))} aria-label="Prethodni mjesec">
            <ChevronLeft className="size-5" aria-hidden="true" />
          </Button>
          <h2 className="flex-1 text-center text-base font-semibold" aria-live="polite">
            {monthLabel(month)}
          </h2>
          <Button variant="ghost" size="icon" onClick={() => onMonthChange(shiftMonth(month, 1))} aria-label="Sljedeći mjesec">
            <ChevronRight className="size-5" aria-hidden="true" />
          </Button>
          {!isCurrentMonth && (
            <Button variant="secondary" size="sm" onClick={() => onMonthChange(monthOf(today))}>
              Danas
            </Button>
          )}
        </div>

        <div className="p-2 sm:p-3">
          <div className="grid grid-cols-7 pb-1" aria-hidden="true">
            {WEEKDAY_SHORT.map((day) => (
              <div key={day} className="py-1 text-center text-xs font-medium text-muted">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {weeks.flat().map((day) => (
              <DayCell
                key={day}
                day={day}
                events={byDate.get(day) ?? []}
                inMonth={monthOf(day) === month}
                isToday={day === today}
                selected={day === selectedDay}
                onSelect={() => onSelectDay(day)}
              />
            ))}
          </div>
        </div>

        <Legend />
      </Card>

      <Card>
        <CardHeader
          title={selectedDay ? formatDate(selectedDay) : `Događaji – ${monthLabel(month)}`}
          description={selectedDay ? undefined : 'Odaberite dan u kalendaru za događaje tog dana.'}
          action={
            selectedDay && (
              <Button variant="ghost" size="sm" onClick={() => onSelectDay(selectedDay)}>
                Cijeli mjesec
              </Button>
            )
          }
        />
        {listed.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title={selectedDay ? 'Nema događaja za ovaj dan' : 'Nema događaja u ovom mjesecu'}
            className="py-8"
          />
        ) : (
          <ul className="divide-y divide-border">
            {listed.map((event) => (
              <EventRow key={event.key} event={event} today={today} showDate={!selectedDay} />
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

interface DayCellProps {
  day: ISODate
  events: CalendarEvent[]
  inMonth: boolean
  isToday: boolean
  selected: boolean
  onSelect: () => void
}

function DayCell({ day, events, inMonth, isToday, selected, onSelect }: DayCellProps) {
  const dayNumber = Number(day.slice(8))
  const shown = events.slice(0, 2)
  const hidden = events.length - shown.length

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${formatDate(day)}${isToday ? ', danas' : ''}${events.length ? `, događaja: ${events.length}` : ''}`}
      className={cn(
        'flex h-14 min-w-0 flex-col items-stretch gap-1 rounded-lg border p-1 text-left transition-colors sm:h-24 sm:p-1.5',
        selected ? 'border-brand bg-brand/10' : 'border-transparent hover:bg-surface-2',
        !inMonth && 'opacity-40',
      )}
    >
      <span
        className={cn(
          'flex size-6 shrink-0 items-center justify-center self-center rounded-full text-xs tabular-nums sm:self-start',
          isToday ? 'bg-brand font-bold text-ink' : 'font-medium',
        )}
      >
        {dayNumber}
      </span>

      {events.length > 0 && (
        <>
          {/* Mobitel: točkice u boji vrste događaja */}
          <span className="flex justify-center gap-0.5 sm:hidden" aria-hidden="true">
            {events.slice(0, 3).map((e) => (
              <span key={e.key} className={cn('size-1.5 rounded-full', EVENT_STYLES[e.kind].dot)} />
            ))}
          </span>
          {/* Šire: oznaka vozila u boji vrste događaja */}
          <span className="hidden min-w-0 flex-col gap-0.5 sm:flex" aria-hidden="true">
            {shown.map((e) => (
              <span
                key={e.key}
                className={cn('truncate rounded px-1 text-[11px] leading-4 font-medium', EVENT_STYLES[e.kind].tone)}
              >
                {e.plate}
              </span>
            ))}
            {hidden > 0 && <span className="px-1 text-[11px] leading-4 text-muted">+{hidden} još</span>}
          </span>
        </>
      )}
    </button>
  )
}

function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-border px-4 py-3 text-xs text-muted">
      {(Object.keys(EVENT_KIND_LABELS) as CalendarEventKind[]).map((kind) => (
        <li key={kind} className="inline-flex items-center gap-1.5">
          <span className={cn('size-2 rounded-full', EVENT_STYLES[kind].dot)} aria-hidden="true" />
          {EVENT_KIND_LABELS[kind]}
        </li>
      ))}
    </ul>
  )
}

// ---------------------------------------------------------------------------

function UpcomingView({ events, today }: { events: CalendarEvent[]; today: ISODate }) {
  const overdue = events.filter((e) => e.isDeadline && e.date < today)
  const upcoming = events.filter((e) => e.date >= today)

  if (overdue.length === 0 && upcoming.length === 0) {
    return (
      <Card>
        <EmptyState icon={CalendarDays} title="Nema nadolazećih događaja" />
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {overdue.length > 0 && (
        <Card className="border-danger/40">
          <CardHeader title="Isteklo / zakašnjelo" description="Rokovi koji su već prošli" />
          <ul className="divide-y divide-border">
            {overdue.map((event) => (
              <EventRow key={event.key} event={event} today={today} />
            ))}
          </ul>
        </Card>
      )}
      <MonthGroups events={upcoming} today={today} />
    </div>
  )
}

function PastView({ events, today }: { events: CalendarEvent[]; today: ISODate }) {
  const [limit, setLimit] = useState(PAST_PAGE_SIZE)
  const past = useMemo(() => events.filter((e) => !e.isDeadline && e.date < today).reverse(), [events, today])

  if (past.length === 0) {
    return (
      <Card>
        <EmptyState icon={History} title="Još nema prošlih aktivnosti" />
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <MonthGroups events={past.slice(0, limit)} today={today} />
      {past.length > limit && (
        <div className="flex justify-center">
          <Button variant="secondary" onClick={() => setLimit((current) => current + PAST_PAGE_SIZE)}>
            Prikaži još ({past.length - limit})
          </Button>
        </div>
      )}
    </div>
  )
}

function MonthGroups({ events, today }: { events: CalendarEvent[]; today: ISODate }) {
  if (events.length === 0) {
    return (
      <Card>
        <EmptyState icon={CalendarX2} title="Nema događaja" className="py-8" />
      </Card>
    )
  }
  return (
    <>
      {groupByMonth(events).map(({ month, events: monthEvents }) => (
        <Card key={month}>
          <CardHeader title={monthLabel(month)} />
          <ul className="divide-y divide-border">
            {monthEvents.map((event) => (
              <EventRow key={event.key} event={event} today={today} />
            ))}
          </ul>
        </Card>
      ))}
    </>
  )
}
