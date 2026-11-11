import { ClipboardList, Plus } from 'lucide-react'
import { Link } from 'react-router'
import { NEW_ACTIVITY_PATH } from '@/components/layout/navigation'
import { buttonClasses } from '@/components/ui/buttonClasses'
import { Card, CardHeader } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorState, Skeleton } from '@/components/ui/States'
import { useActivities } from '@/hooks/useActivities'
import { ActivityList } from './ActivityList'

/** Kronološka povijest aktivnosti jednog vozila (profil vozila). */
export function VehicleActivityHistory({ vehicleId }: { vehicleId: string }) {
  const { data: activities, isPending, error, refetch } = useActivities(vehicleId)
  const newActivityLink = `${NEW_ACTIVITY_PATH}?vozilo=${vehicleId}`

  return (
    <Card className="mt-4">
      <CardHeader
        title="Povijest aktivnosti"
        description={activities && activities.length > 0 ? `Ukupno: ${activities.length}` : undefined}
        action={
          <Link to={newActivityLink} className={buttonClasses('primary', 'sm')}>
            <Plus className="size-4" aria-hidden="true" />
            Dodaj aktivnost
          </Link>
        }
      />

      {isPending ? (
        <div className="space-y-3 p-4 sm:p-5" aria-label="Učitavanje">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="size-10 shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} title="Aktivnosti se nisu mogle učitati" />
      ) : activities.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Još nema aktivnosti"
          description="Dodajte registraciju, promjenu guma, servis ili drugi zapis – prikazat će se ovdje kronološki."
        />
      ) : (
        <ActivityList activities={activities} />
      )}
    </Card>
  )
}
