import {
  AlertTriangle,
  CalendarCheck,
  CalendarClock,
  Car,
  CarFront,
  ChevronRight,
  ClipboardList,
  History,
  Plus,
  ShieldAlert,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router'
import { TypeIcon } from '@/components/activities/ActivitySummaryBar'
import { LicensePlate } from '@/components/LicensePlate'
import { PushPrompt } from '@/components/PushPrompt'
import { buttonClasses } from '@/components/ui/buttonClasses'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { StatCard } from '@/components/ui/StatCard'
import { ErrorState, Skeleton } from '@/components/ui/States'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { ActivityWithVehicle } from '@/data/activities'
import { useActivities } from '@/hooks/useActivities'
import { useVehicles } from '@/hooks/useVehicles'
import { activityHeading } from '@/lib/activityFilters'
import { cn } from '@/lib/cn'
import { countByStatus } from '@/lib/vehicleFilters'
import type { VehicleOverview } from '@/types/database'
import { daysBetween, formatDate, formatNumber, todayISO, type ISODate } from '@shared/dates'
import { buildObligations, upcomingObligations, type Obligation, type ObligationKind } from '@shared/obligations'
import { relativeDaysLabel, relativeDueLabel, type DeadlineTone } from '@shared/status'

/** Obveze unutar ovoliko dana prikazuju se na nadzornoj ploči (hitne uvijek). */
const UPCOMING_HORIZON_DAYS = 60
const MAX_OBLIGATIONS = 8
const RECENT_DAYS = 30
const MAX_RECENT = 5

function todayLabel(today: ISODate): string {
  const weekday = new Intl.DateTimeFormat('hr-HR', { weekday: 'long', timeZone: 'Europe/Zagreb' }).format(new Date())
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)}, ${formatDate(today)}`
}

const TONE_RANK: Record<DeadlineTone, number> = { ok: 0, warn: 1, danger: 2 }

export function DashboardPage() {
  const today = todayISO()
  const vehicles = useVehicles()
  const activities = useActivities()

  const error = vehicles.error ?? activities.error
  // Oba upita moraju biti učitana; inače se prikazuje kostur stranice.
  const ready = vehicles.data && activities.data ? { vehicles: vehicles.data, activities: activities.data } : null

  return (
    <>
      <PageHeader title="Nadzorna ploča" description={todayLabel(today)} />
      <PushPrompt />

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
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <Skeleton className="h-72 rounded-2xl" />
            <Skeleton className="h-72 rounded-2xl" />
          </div>
        </>
      ) : ready.vehicles.length === 0 ? (
        <Card>
          <EmptyState
            icon={Car}
            title="Dobro došli u J-CARS"
            description="Dodajte prvo vozilo – nakon toga ovdje ćete vidjeti stanje voznog parka i nadolazeće rokove."
            action={
              <Link to="/vozila/novo" className={buttonClasses('primary')}>
                <Plus className="size-4" aria-hidden="true" />
                Dodaj vozilo
              </Link>
            }
          />
        </Card>
      ) : (
        <Overview vehicles={ready.vehicles} activities={ready.activities} today={today} />
      )}
    </>
  )
}

function Overview({
  vehicles,
  activities,
  today,
}: {
  vehicles: VehicleOverview[]
  activities: ActivityWithVehicle[]
  today: ISODate
}) {
  const obligations = useMemo(() => buildObligations(vehicles, activities, today), [vehicles, activities, today])
  const vehicleById = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles])

  const counts = countByStatus(vehicles, today)
  const activeCount = vehicles.filter((v) => v.is_active).length
  const services = obligations.filter((o) => o.kind === 'service' && o.tone !== 'ok')
  const serviceTone = services.reduce<DeadlineTone>((worst, o) => (TONE_RANK[o.tone] > TONE_RANK[worst] ? o.tone : worst), 'ok')
  const recent = activities.filter((a) => {
    const age = daysBetween(a.activity_date, today)
    return age >= 0 && age <= RECENT_DAYS
  })
  const upcoming = upcomingObligations(obligations, UPCOMING_HORIZON_DAYS)
  // Aktivnosti su poredane od najnovije; buduće („Ostalo”) su već među obvezama.
  const latest = activities.filter((a) => a.activity_date <= today).slice(0, MAX_RECENT)

  return (
    <>
      <section aria-label="Stanje voznog parka" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard icon={Car} label="Ukupno vozila" value={vehicles.length} to="/vozila" />
        <StatCard icon={CarFront} label="Aktivna vozila" value={activeCount} tone="ok" to="/vozila" />
        <StatCard
          icon={AlertTriangle}
          label="Registracije ističu u 30 dana"
          value={counts.expiring}
          tone={counts.expiring > 0 ? 'warn' : 'ok'}
          to="/vozila?status=expiring"
        />
        <StatCard
          icon={ShieldAlert}
          label="Istekle registracije"
          value={counts.expired}
          tone={counts.expired > 0 ? 'danger' : 'ok'}
          to="/vozila?status=expired"
        />
        <StatCard
          icon={Wrench}
          label="Nadolazeći servisi"
          value={services.length}
          tone={serviceTone}
          to="/kalendar?prikaz=nadolazece"
        />
        <StatCard icon={History} label={`Aktivnosti u ${RECENT_DAYS} dana`} value={recent.length} to="/aktivnosti" />
      </section>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Nadolazeće obveze"
            description={`Istekli rokovi i rokovi u sljedećih ${UPCOMING_HORIZON_DAYS} dana`}
          />
          {upcoming.length === 0 ? (
            <EmptyState
              icon={CalendarCheck}
              title="Sve je u redu"
              description={`Nema isteklih rokova ni obveza u sljedećih ${UPCOMING_HORIZON_DAYS} dana.`}
              className="py-10"
            />
          ) : (
            <ul className="divide-y divide-border">
              {upcoming.slice(0, MAX_OBLIGATIONS).map((o) => (
                <ObligationRow key={o.key} obligation={o} vehicle={vehicleById.get(o.vehicleId)} />
              ))}
            </ul>
          )}
          <CardFooterLink
            to="/kalendar?prikaz=nadolazece"
            label={upcoming.length > MAX_OBLIGATIONS ? `Svi rokovi (${upcoming.length})` : 'Svi rokovi u kalendaru'}
          />
        </Card>

        <Card>
          <CardHeader title="Nedavne aktivnosti" />
          {latest.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="Još nema aktivnosti"
              description="Registracije, promjene guma i servisi prikazat će se ovdje."
              className="py-10"
            />
          ) : (
            <ul className="divide-y divide-border">
              {latest.map((a) => (
                <RecentActivityRow key={a.id} activity={a} />
              ))}
            </ul>
          )}
          <CardFooterLink to="/aktivnosti" label="Sve aktivnosti" />
        </Card>
      </div>
    </>
  )
}

const OBLIGATION_ICONS: Record<ObligationKind, LucideIcon> = {
  registration: CalendarCheck,
  service: Wrench,
  activity: CalendarClock,
}

const TONE_CLASSES: Record<DeadlineTone, string> = {
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger',
}

function obligationLabel(o: Obligation): string {
  if (o.kind === 'registration' && o.daysLeft !== null) return relativeDaysLabel(o.daysLeft)
  if (o.daysLeft !== null) return relativeDueLabel(o.daysLeft)
  if (o.kmLeft !== null) return o.kmLeft > 0 ? `Još ${formatNumber(o.kmLeft)} km` : `Prekoračeno ${formatNumber(-o.kmLeft)} km`
  return 'Po kilometraži'
}

/** Dodatni opis servisa: kilometraža uz datum. */
function obligationDetail(o: Obligation): string | null {
  if (o.kind !== 'service' || o.nextMileage === null) return null
  const km = `na ${formatNumber(o.nextMileage)} km`
  if (o.date === null) return km
  if (o.kmLeft !== null && o.kmLeft <= 0) return `${km} – prekoračeno`
  return `ili ${km}`
}

function ObligationRow({ obligation: o, vehicle }: { obligation: Obligation; vehicle: VehicleOverview | undefined }) {
  const Icon = OBLIGATION_ICONS[o.kind]
  const detail = obligationDetail(o)
  return (
    <li>
      <Link
        to={`/vozila/${o.vehicleId}`}
        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2/60 sm:px-5"
      >
        <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', TONE_CLASSES[o.tone])}>
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium break-words">{o.title}</p>
          {vehicle && (
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
              <span className="truncate">
                {vehicle.make} {vehicle.model}
              </span>
              <LicensePlate value={vehicle.registration_number} />
            </div>
          )}
          {detail && <p className="mt-1 text-sm text-muted">{detail}</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 text-right">
          {o.date && <span className="text-sm font-medium tabular-nums">{formatDate(o.date)}</span>}
          <StatusBadge tone={o.tone}>{obligationLabel(o)}</StatusBadge>
        </div>
      </Link>
    </li>
  )
}

function RecentActivityRow({ activity }: { activity: ActivityWithVehicle }) {
  return (
    <li>
      <Link
        to={activity.vehicle ? `/vozila/${activity.vehicle.id}` : '/aktivnosti'}
        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-2/60 sm:px-5"
      >
        <TypeIcon type={activity.activity_type} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{activityHeading(activity)}</p>
          {activity.vehicle && (
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
              <span className="truncate">
                {activity.vehicle.make} {activity.vehicle.model}
              </span>
              <LicensePlate value={activity.vehicle.registration_number} />
            </div>
          )}
        </div>
        <span className="shrink-0 text-sm text-muted tabular-nums">{formatDate(activity.activity_date)}</span>
      </Link>
    </li>
  )
}

function CardFooterLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-center gap-1 rounded-b-2xl border-t border-border px-4 py-3 text-sm font-medium hover:bg-surface-2/60"
    >
      {label}
      <ChevronRight className="size-4" aria-hidden="true" />
    </Link>
  )
}
