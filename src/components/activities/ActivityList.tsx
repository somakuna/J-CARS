import { BellRing, SquarePen, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { LicensePlate } from '@/components/LicensePlate'
import { TireBadge } from '@/components/vehicles/TireBadge'
import { Button } from '@/components/ui/Button'
import { buttonClasses } from '@/components/ui/buttonClasses'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { ActivityWithVehicle } from '@/data/activities'
import { useDeleteActivity } from '@/hooks/useActivities'
import { activityHeading } from '@/lib/activityFilters'
import { cn } from '@/lib/cn'
import { errorMessage } from '@/lib/errors'
import { ACTIVITY_ICON_TONES, ACTIVITY_TYPES, SERVICE_TYPES } from '@/lib/labels'
import { useToast } from '@/lib/toastContext'
import { formatDate, formatMileage, todayISO } from '@shared/dates'

interface ActivityListProps {
  activities: ActivityWithVehicle[]
  /** Prikaz vozila uz svaku aktivnost (stranica Aktivnosti). */
  showVehicle?: boolean
}

/** Kronološki popis aktivnosti s uređivanjem i brisanjem. */
export function ActivityList({ activities, showVehicle = false }: ActivityListProps) {
  const { showToast } = useToast()
  const deleteActivity = useDeleteActivity()
  const [toDelete, setToDelete] = useState<ActivityWithVehicle | null>(null)

  function handleDelete() {
    if (!toDelete) return
    deleteActivity.mutate(toDelete.id, {
      onSuccess: () => {
        setToDelete(null)
        showToast('Aktivnost je obrisana.')
      },
      onError: (error) => {
        setToDelete(null)
        showToast(errorMessage(error, 'Brisanje nije uspjelo. Pokušajte ponovno.'), 'danger')
      },
    })
  }

  return (
    <>
      <ul className="divide-y divide-border">
        {activities.map((activity) => (
          <ActivityItem
            key={activity.id}
            activity={activity}
            showVehicle={showVehicle}
            onDelete={() => setToDelete(activity)}
          />
        ))}
      </ul>

      <ConfirmDialog
        open={toDelete !== null}
        title="Obrisati aktivnost?"
        confirmLabel="Obriši aktivnost"
        destructive
        busy={deleteActivity.isPending}
        onConfirm={handleDelete}
        onCancel={() => setToDelete(null)}
      >
        {toDelete && (
          <>
            <p>
              <strong className="text-fg">{activityHeading(toDelete)}</strong> od {formatDate(toDelete.activity_date)}
 bit će trajno obrisana.
            </p>
            {toDelete.activity_type !== 'other' && (
              <p className="mt-2">Podaci u profilu vozila izračunat će se ponovno iz preostalih aktivnosti.</p>
            )}
          </>
        )}
      </ConfirmDialog>
    </>
  )
}

function ActivityItem({
  activity,
  showVehicle,
  onDelete,
}: {
  activity: ActivityWithVehicle
  showVehicle: boolean
  onDelete: () => void
}) {
  const { icon: Icon, label: typeLabel } = ACTIVITY_TYPES[activity.activity_type]
  const heading = activityHeading(activity)
  const reminderActive = activity.reminder_enabled && activity.activity_date >= todayISO()

  return (
    <li className="flex gap-3 px-4 py-3.5 sm:px-5">
      <span
        className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', ACTIVITY_ICON_TONES[activity.activity_type])}
        title={typeLabel}
      >
        <Icon className="size-5" aria-hidden="true" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-medium break-words">
              {heading}
              {activity.activity_type === 'other' && <span className="sr-only"> ({typeLabel})</span>}
            </h3>
            <p className="text-sm text-muted tabular-nums">
              {formatDate(activity.activity_date)}
              {activity.mileage != null && ` · ${formatMileage(activity.mileage)}`}
            </p>
          </div>

          <div className="-mt-1 -mr-2 flex shrink-0">
            <Link
              to={`/aktivnosti/${activity.id}/uredi`}
              className={buttonClasses('ghost', 'icon')}
              aria-label={`Uredi: ${heading}, ${formatDate(activity.activity_date)}`}
              title="Uredi"
            >
              <SquarePen className="size-4" aria-hidden="true" />
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="text-danger"
              aria-label={`Obriši: ${heading}, ${formatDate(activity.activity_date)}`}
              title="Obriši"
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        <ActivityDetails activity={activity} />

        {showVehicle && activity.vehicle && (
          <Link
            to={`/vozila/${activity.vehicle.id}`}
            className="mt-2 inline-flex max-w-full items-center gap-2 text-sm text-muted hover:text-fg"
          >
            <span className="truncate">
              {activity.vehicle.make} {activity.vehicle.model}
            </span>
            <LicensePlate value={activity.vehicle.registration_number} />
          </Link>
        )}

        {activity.description && (
          <p className="mt-2 line-clamp-4 text-sm whitespace-pre-line break-words">{activity.description}</p>
        )}

        {reminderActive && (
          <StatusBadge tone="info" className="mt-2">
            <BellRing className="size-3" aria-hidden="true" />
            Podsjetnik uključen
          </StatusBadge>
        )}
      </div>
    </li>
  )
}

/** Podaci specifični za vrstu aktivnosti. */
function ActivityDetails({ activity }: { activity: ActivityWithVehicle }) {
  switch (activity.activity_type) {
    case 'registration':
      return (
        <p className="mt-1 text-sm">
          Vrijedi do <span className="font-medium tabular-nums">{formatDate(activity.registration_expiry)}</span>
        </p>
      )
    case 'tires':
      return (
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm">
          <TireBadge type={activity.tire_type} />
          {activity.tire_size && <span>{activity.tire_size}</span>}
        </div>
      )
    case 'service': {
      const next = [
        activity.next_service_date && formatDate(activity.next_service_date),
        activity.next_service_mileage != null && `na ${formatMileage(activity.next_service_mileage)}`,
      ].filter(Boolean)
      return (
        <div className="mt-1 text-sm">
          {activity.service_type && <p className="font-medium">{SERVICE_TYPES[activity.service_type]}</p>}
          {next.length > 0 && <p className="text-muted">Sljedeći servis: {next.join(' ili ')}</p>}
        </div>
      )
    }
    default:
      return null
  }
}
