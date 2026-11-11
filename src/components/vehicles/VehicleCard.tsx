import { CalendarCheck, ChevronRight, Gauge, UserRound } from 'lucide-react'
import { Link } from 'react-router'
import { LicensePlate } from '@/components/LicensePlate'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { cn } from '@/lib/cn'
import type { VehicleOverview } from '@/types/database'
import { formatDate, formatMileage } from '@shared/dates'
import { deadlineStatus } from '@shared/status'
import { TireBadge } from './TireBadge'

export function VehicleCard({ vehicle, today }: { vehicle: VehicleOverview; today: string }) {
  const status = deadlineStatus(vehicle.effective_registration_expiry, today)

  return (
    <Link
      to={`/vozila/${vehicle.id}`}
      className={cn(
        'group block rounded-2xl border border-border bg-surface p-4 transition-colors hover:border-muted/40 hover:bg-surface-2/40',
        !vehicle.is_active && 'opacity-70',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold">
            {vehicle.make} {vehicle.model}
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <LicensePlate value={vehicle.registration_number} />
            {!vehicle.is_active && <StatusBadge tone="neutral">Neaktivno</StatusBadge>}
          </div>
        </div>
        <ChevronRight className="mt-0.5 size-5 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="flex items-center gap-2 text-muted">
            <CalendarCheck className="size-4" aria-hidden="true" />
            Registracija
          </dt>
          <dd className="font-medium tabular-nums">{formatDate(vehicle.effective_registration_expiry)}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="flex items-center gap-2 text-muted">
            <Gauge className="size-4" aria-hidden="true" />
            Kilometraža
          </dt>
          <dd className="font-medium tabular-nums">{formatMileage(vehicle.effective_mileage)}</dd>
        </div>
        {vehicle.responsible_person && (
          <div className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-2 text-muted">
              <UserRound className="size-4" aria-hidden="true" />
              Zadužen/a
            </dt>
            <dd className="truncate font-medium">{vehicle.responsible_person}</dd>
          </div>
        )}
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        {vehicle.is_active && <StatusBadge tone={status.tone}>{status.label}</StatusBadge>}
        <TireBadge type={vehicle.current_tire_type} />
      </div>
    </Link>
  )
}
