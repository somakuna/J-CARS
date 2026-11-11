import { ArrowLeft, SearchX } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { VehicleForm } from '@/components/vehicles/VehicleForm'
import { buttonClasses } from '@/components/ui/buttonClasses'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageHeader } from '@/components/ui/PageHeader'
import { ErrorState, Skeleton } from '@/components/ui/States'
import { useCreateVehicle, useUpdateVehicle, useVehicle } from '@/hooks/useVehicles'
import { errorMessage } from '@/lib/errors'
import { pgErrorCode } from '@/lib/forms'
import { useToast } from '@/lib/toastContext'
import type { VehicleInsert } from '@/types/database'

type ServerError = { field?: 'registrationNumber'; message: string } | null

function toServerError(error: unknown): ServerError {
  if (pgErrorCode(error) === '23505') {
    return { field: 'registrationNumber', message: 'Vozilo s ovom registracijskom oznakom već postoji.' }
  }
  return { message: errorMessage(error, 'Spremanje nije uspjelo. Pokušajte ponovno.') }
}

/** Dodavanje novog vozila (/vozila/novo). */
export function NewVehiclePage() {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const createVehicle = useCreateVehicle()
  const [serverError, setServerError] = useState<ServerError>(null)

  function handleSubmit(values: Partial<VehicleInsert>) {
    setServerError(null)
    createVehicle.mutate(values as VehicleInsert, {
      onSuccess: (vehicle) => {
        showToast('Vozilo je dodano.')
        navigate(`/vozila/${vehicle.id}`, { replace: true })
      },
      onError: (error) => setServerError(toServerError(error)),
    })
  }

  return (
    <FormLayout title="Novo vozilo" backTo="/vozila" backLabel="Vozila">
      <VehicleForm
        submitLabel="Dodaj vozilo"
        submitting={createVehicle.isPending}
        serverError={serverError}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/vozila')}
      />
    </FormLayout>
  )
}

/** Uređivanje vozila (/vozila/:id/uredi). */
export function EditVehiclePage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { data: vehicle, isPending, error, refetch } = useVehicle(id)
  const updateVehicle = useUpdateVehicle(id)
  const [serverError, setServerError] = useState<ServerError>(null)

  function handleSubmit(values: Partial<VehicleInsert>) {
    setServerError(null)
    updateVehicle.mutate(values, {
      onSuccess: () => {
        showToast('Promjene su spremljene.')
        navigate(`/vozila/${id}`, { replace: true })
      },
      onError: (err) => setServerError(toServerError(err)),
    })
  }

  return (
    <FormLayout title="Uredi vozilo" backTo={`/vozila/${id}`} backLabel="Profil vozila">
      {isPending ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : error ? (
        <Card>
          <ErrorState error={error} onRetry={() => refetch()} />
        </Card>
      ) : !vehicle ? (
        <VehicleNotFound />
      ) : (
        <VehicleForm
          vehicle={vehicle}
          submitLabel="Spremi promjene"
          submitting={updateVehicle.isPending}
          serverError={serverError}
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/vozila/${id}`)}
        />
      )}
    </FormLayout>
  )
}

function FormLayout({ title, backTo, backLabel, children }: { title: string; backTo: string; backLabel: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl">
      <Link to={backTo} className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden="true" />
        {backLabel}
      </Link>
      <PageHeader title={title} description="Polja označena * su obavezna." />
      {children}
    </div>
  )
}

export function VehicleNotFound() {
  return (
    <Card>
      <EmptyState
        icon={SearchX}
        title="Vozilo nije pronađeno"
        description="Vozilo je možda obrisano ili poveznica nije ispravna."
        action={
          <Link to="/vozila" className={buttonClasses('secondary')}>
            Na popis vozila
          </Link>
        }
      />
    </Card>
  )
}
