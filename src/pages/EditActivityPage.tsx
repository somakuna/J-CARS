import { ArrowLeft, SearchX } from 'lucide-react'
import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { ActivityForm } from '@/components/activities/ActivityForm'
import { ActivitySummaryBar } from '@/components/activities/ActivitySummaryBar'
import { buttonClasses } from '@/components/ui/buttonClasses'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { ErrorState, Skeleton } from '@/components/ui/States'
import type { ActivityFields, ActivityWithVehicle } from '@/data/activities'
import { useActivity, useUpdateActivity } from '@/hooks/useActivities'
import { useGoBack } from '@/hooks/useGoBack'
import { useVehicle } from '@/hooks/useVehicles'
import { errorMessage } from '@/lib/errors'
import { useToast } from '@/lib/toastContext'

/** Uređivanje aktivnosti (/aktivnosti/:id/uredi). Vozilo i vrsta se ne mijenjaju. */
export function EditActivityPage() {
  const { id = '' } = useParams()
  const { data: activity, isPending, error, refetch } = useActivity(id)
  const goBack = useGoBack(activity ? `/vozila/${activity.vehicle_id}` : '/aktivnosti')

  return (
    <div className="mx-auto max-w-2xl">
      <button
        type="button"
        onClick={goBack}
        className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Natrag
      </button>

      <PageHeader title="Uredi aktivnost" description="Polja označena * su obavezna." />

      {isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      ) : error ? (
        <Card>
          <ErrorState error={error} onRetry={() => refetch()} />
        </Card>
      ) : !activity || !activity.vehicle ? (
        <Card>
          <EmptyState
            icon={SearchX}
            title="Aktivnost nije pronađena"
            description="Aktivnost je možda obrisana ili poveznica nije ispravna."
            action={
              <Link to="/aktivnosti" className={buttonClasses('secondary')}>
                Na popis aktivnosti
              </Link>
            }
          />
        </Card>
      ) : (
        <EditForm activity={activity} onDone={goBack} />
      )}
    </div>
  )
}

function EditForm({ activity, onDone }: { activity: ActivityWithVehicle; onDone: () => void }) {
  const { showToast } = useToast()
  const updateActivity = useUpdateActivity(activity.id)
  // Vozilo s izvedenim podacima – za prikaz zadnje kilometraže.
  const { data: vehicle } = useVehicle(activity.vehicle_id)
  const [serverError, setServerError] = useState<string | null>(null)

  function handleSubmit(fields: ActivityFields) {
    setServerError(null)
    updateActivity.mutate(fields, {
      onSuccess: () => {
        showToast('Promjene su spremljene.')
        onDone()
      },
      onError: (error) => setServerError(errorMessage(error, 'Spremanje nije uspjelo. Pokušajte ponovno.')),
    })
  }

  return (
    <>
      <ActivitySummaryBar vehicle={activity.vehicle!} type={activity.activity_type} />
      <ActivityForm
        type={activity.activity_type}
        vehicle={vehicle}
        activity={activity}
        submitLabel="Spremi promjene"
        submitting={updateActivity.isPending}
        serverError={serverError}
        onSubmit={handleSubmit}
        onCancel={onDone}
      />
    </>
  )
}
