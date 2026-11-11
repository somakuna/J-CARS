import { Car } from 'lucide-react'
import type { ReactNode } from 'react'
import { LicensePlate } from '@/components/LicensePlate'
import { Card } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { ActivityVehicle } from '@/data/activities'
import { cn } from '@/lib/cn'
import { ACTIVITY_ICON_TONES, ACTIVITY_TYPES } from '@/lib/labels'
import type { ActivityType } from '@/types/database'

interface ActivitySummaryBarProps {
  vehicle: ActivityVehicle
  type?: ActivityType | null
  /** Ako postoji, uz vozilo se prikazuje „Promijeni”. */
  onChangeVehicle?: () => void
  onChangeType?: () => void
}

/** Odabrano vozilo i vrsta aktivnosti iznad obrasca. */
export function ActivitySummaryBar({ vehicle, type, onChangeVehicle, onChangeType }: ActivitySummaryBarProps) {
  return (
    <Card className="mb-4 divide-y divide-border">
      <Row
        icon={
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-muted">
            <Car className="size-5" aria-hidden="true" />
          </span>
        }
        label="Vozilo"
        onChange={onChangeVehicle}
        changeLabel="Promijeni vozilo"
      >
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-medium">
            {vehicle.make} {vehicle.model}
          </span>
          <LicensePlate value={vehicle.registration_number} />
          {!vehicle.is_active && <StatusBadge tone="neutral">Neaktivno</StatusBadge>}
        </span>
      </Row>

      {type && (
        <Row
          icon={<TypeIcon type={type} />}
          label="Vrsta"
          onChange={onChangeType}
          changeLabel="Promijeni vrstu aktivnosti"
        >
          <span className="font-medium">{ACTIVITY_TYPES[type].label}</span>
        </Row>
      )}
    </Card>
  )
}

export function TypeIcon({ type, large = false }: { type: ActivityType; large?: boolean }) {
  const Icon = ACTIVITY_TYPES[type].icon
  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center rounded-xl',
        large ? 'size-11' : 'size-9',
        ACTIVITY_ICON_TONES[type],
      )}
    >
      <Icon className="size-5" aria-hidden="true" />
    </span>
  )
}

function Row({
  icon,
  label,
  children,
  onChange,
  changeLabel,
}: {
  icon: ReactNode
  label: string
  children: ReactNode
  onChange?: () => void
  changeLabel: string
}) {
  return (
    <div className="flex items-center gap-3 px-3.5 py-2.5">
      {icon}
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted">{label}</p>
        <div className="text-sm">{children}</div>
      </div>
      {onChange && (
        <button
          type="button"
          onClick={onChange}
          aria-label={changeLabel}
          className="shrink-0 rounded-lg px-2 py-1.5 text-sm font-medium underline underline-offset-2 hover:bg-surface-2"
        >
          Promijeni
        </button>
      )}
    </div>
  )
}
