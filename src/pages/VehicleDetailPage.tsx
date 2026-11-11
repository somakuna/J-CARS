import {
  ArrowLeft,
  CalendarCheck,
  CalendarClock,
  CircleDot,
  SquarePen,
  Trash2,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { VehicleActivityHistory } from '@/components/activities/VehicleActivityHistory'
import { LicensePlate } from '@/components/LicensePlate'
import { TireBadge } from '@/components/vehicles/TireBadge'
import { Button } from '@/components/ui/Button'
import { buttonClasses } from '@/components/ui/buttonClasses'
import { Card } from '@/components/ui/Card'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ErrorState, Skeleton } from '@/components/ui/States'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { useDeleteVehicle, useVehicle, useVehicleActivityCount } from '@/hooks/useVehicles'
import { errorMessage } from '@/lib/errors'
import { SERVICE_TYPES } from '@/lib/labels'
import { useToast } from '@/lib/toastContext'
import type { VehicleOverview } from '@/types/database'
import { formatDate, formatMileage, formatNumber, todayISO } from '@shared/dates'
import { deadlineStatus, mileageStatus, relativeDueLabel } from '@shared/status'
import { VehicleNotFound } from './VehicleFormPage'

export function VehicleDetailPage() {
  const { id = '' } = useParams()
  const { data: vehicle, isPending, error, refetch } = useVehicle(id)

  return (
    <div className="mx-auto max-w-4xl">
      <Link to="/vozila" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Vozila
      </Link>

      {isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-2xl" />
          <div className="grid gap-3 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
        </div>
      ) : error ? (
        <Card>
          <ErrorState error={error} onRetry={() => refetch()} />
        </Card>
      ) : !vehicle ? (
        <VehicleNotFound />
      ) : (
        <VehicleProfile vehicle={vehicle} />
      )}
    </div>
  )
}

function VehicleProfile({ vehicle }: { vehicle: VehicleOverview }) {
  const today = todayISO()
  const registration = deadlineStatus(vehicle.effective_registration_expiry, today)

  return (
    <>
      {/* Zaglavlje */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold tracking-tight">
              {vehicle.make} {vehicle.model}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <LicensePlate value={vehicle.registration_number} className="text-sm" />
              {!vehicle.is_active && <StatusBadge tone="neutral">Neaktivno vozilo</StatusBadge>}
            </div>
          </div>
          <VehicleActions vehicle={vehicle} />
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4 text-sm sm:grid-cols-4">
          <InfoItem label="Godina proizvodnje" value={vehicle.year ? `${vehicle.year}.` : '—'} />
          <InfoItem label="Kilometraža" value={formatMileage(vehicle.effective_mileage)} />
          <InfoItem label="Zadužena osoba" value={vehicle.responsible_person ?? '—'} />
          <InfoItem label="Istek registracije" value={formatDate(vehicle.effective_registration_expiry)} />
        </dl>

        {vehicle.note && (
          <div className="mt-4 rounded-xl bg-surface-2 px-3.5 py-3 text-sm whitespace-pre-line">{vehicle.note}</div>
        )}
      </Card>

      {/* Pregled najvažnijih podataka */}
      <section aria-label="Pregled" className="mt-4 grid gap-3 sm:grid-cols-2">
        <SummaryCard icon={CalendarCheck} title="Registracija">
          <p className="text-lg font-semibold tabular-nums">{formatDate(vehicle.effective_registration_expiry)}</p>
          {vehicle.is_active ? (
            <StatusBadge tone={registration.tone} className="mt-2">
              {registration.label}
            </StatusBadge>
          ) : (
            <p className="mt-1 text-sm text-muted">Rokovi se ne prate za neaktivno vozilo.</p>
          )}
        </SummaryCard>

        <SummaryCard icon={CircleDot} title="Gume">
          {vehicle.current_tire_type ? (
            <>
              <TireBadge type={vehicle.current_tire_type} />
              <p className="mt-2 text-sm text-muted">
                {vehicle.current_tire_size && <span className="text-fg">{vehicle.current_tire_size} · </span>}
                Promijenjeno {formatDate(vehicle.last_tire_change_date)}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted">Još nema zabilježene promjene guma.</p>
          )}
        </SummaryCard>

        <SummaryCard icon={Wrench} title="Zadnji servis">
          {vehicle.last_service_date ? (
            <>
              <p className="text-lg font-semibold tabular-nums">{formatDate(vehicle.last_service_date)}</p>
              <p className="mt-1 text-sm text-muted">
                {vehicle.last_service_type && SERVICE_TYPES[vehicle.last_service_type]}
                {vehicle.last_service_mileage != null && ` · ${formatMileage(vehicle.last_service_mileage)}`}
              </p>
            </>
          ) : (
            <p className="text-sm text-muted">Još nema zabilježenog servisa.</p>
          )}
        </SummaryCard>

        <SummaryCard icon={CalendarClock} title="Sljedeći servis">
          <NextService vehicle={vehicle} today={today} />
        </SummaryCard>
      </section>

      <VehicleActivityHistory vehicleId={vehicle.id} />
    </>
  )
}

function NextService({ vehicle, today }: { vehicle: VehicleOverview; today: string }) {
  const byDate = vehicle.next_service_date ? deadlineStatus(vehicle.next_service_date, today) : null
  const byKm = mileageStatus(vehicle.effective_mileage, vehicle.next_service_mileage)

  if (!vehicle.next_service_date && vehicle.next_service_mileage == null) {
    return <p className="text-sm text-muted">Nije planiran.</p>
  }

  return (
    <div className="space-y-2">
      {vehicle.next_service_date && byDate && (
        <div>
          <p className="text-lg font-semibold tabular-nums">{formatDate(vehicle.next_service_date)}</p>
          {vehicle.is_active && (
            <StatusBadge tone={byDate.tone} className="mt-1">
              {relativeDueLabel(byDate.daysLeft)}
            </StatusBadge>
          )}
        </div>
      )}
      {vehicle.next_service_mileage != null && (
        <div>
          <p className={vehicle.next_service_date ? 'text-sm' : 'text-lg font-semibold'}>
            na {formatMileage(vehicle.next_service_mileage)}
          </p>
          {byKm && vehicle.is_active && (
            <StatusBadge tone={byKm.tone} className="mt-1">
              {byKm.kmLeft > 0 ? `Još ${formatNumber(byKm.kmLeft)} km` : `Prekoračeno za ${formatNumber(-byKm.kmLeft)} km`}
            </StatusBadge>
          )}
        </div>
      )}
    </div>
  )
}

function VehicleActions({ vehicle }: { vehicle: VehicleOverview }) {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const deleteVehicle = useDeleteVehicle()
  const activityCount = useVehicleActivityCount(vehicle.id, confirmOpen)

  function handleDelete() {
    deleteVehicle.mutate(vehicle.id, {
      onSuccess: () => {
        setConfirmOpen(false)
        showToast('Vozilo je obrisano.')
        navigate('/vozila', { replace: true })
      },
      onError: (error) => {
        setConfirmOpen(false)
        showToast(errorMessage(error, 'Brisanje nije uspjelo. Pokušajte ponovno.'), 'danger')
      },
    })
  }

  const count = activityCount.data
  return (
    <div className="flex gap-2">
      <Link to={`/vozila/${vehicle.id}/uredi`} className={buttonClasses('secondary')}>
        <SquarePen className="size-4" aria-hidden="true" />
        Uredi
      </Link>
      <Button variant="secondary" onClick={() => setConfirmOpen(true)} aria-label="Obriši vozilo" className="text-danger">
        <Trash2 className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">Obriši</span>
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        title="Obrisati vozilo?"
        confirmLabel="Obriši vozilo"
        destructive
        busy={deleteVehicle.isPending}
        onConfirm={handleDelete}
        onCancel={() => setConfirmOpen(false)}
      >
        <p>
          Vozilo <strong className="text-fg">{vehicle.registration_number}</strong> ({vehicle.make} {vehicle.model})
          {count === undefined
            ? ' i sve njegove aktivnosti'
            : count === 0
              ? ''
              : ` i ${count} ${count % 10 === 1 && count % 100 !== 11 ? 'aktivnost' : 'aktivnosti'}`}{' '}
          bit će trajno obrisani.
        </p>
        <p className="mt-2">Ova radnja se ne može poništiti.</p>
        {vehicle.is_active && (
          <p className="mt-2">Ako se vozilo samo više ne koristi, možete ga umjesto toga označiti kao neaktivno.</p>
        )}
      </ConfirmDialog>
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted">{label}</dt>
      <dd className="mt-0.5 truncate font-medium">{value}</dd>
    </div>
  )
}

function SummaryCard({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: ReactNode }) {
  return (
    <Card className="p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted">
        <Icon className="size-4" aria-hidden="true" />
        {title}
      </h2>
      {children}
    </Card>
  )
}
