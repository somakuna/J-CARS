import { ArrowLeft, Car, ChevronRight, Plus, Search, SearchX } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { ActivityForm } from '@/components/activities/ActivityForm'
import { ActivitySummaryBar, TypeIcon } from '@/components/activities/ActivitySummaryBar'
import { LicensePlate } from '@/components/LicensePlate'
import { buttonClasses } from '@/components/ui/buttonClasses'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { TextField } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { ErrorState, Skeleton } from '@/components/ui/States'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { ActivityFields } from '@/data/activities'
import { useCreateActivity } from '@/hooks/useActivities'
import { useGoBack } from '@/hooks/useGoBack'
import { useVehicles } from '@/hooks/useVehicles'
import { cn } from '@/lib/cn'
import { errorMessage } from '@/lib/errors'
import { ACTIVITY_TYPE_ORDER, ACTIVITY_TYPES, isActivityType } from '@/lib/labels'
import { useToast } from '@/lib/toastContext'
import { matchesSearch, sortVehicles } from '@/lib/vehicleFilters'
import type { ActivityType, VehicleOverview } from '@/types/database'

const STEPS = ['Vozilo', 'Vrsta', 'Podaci'] as const

const TYPE_DESCRIPTIONS: Record<ActivityType, string> = {
  registration: 'Datum registracije i novi istek',
  tires: 'Ljetne, zimske ili cjelogodišnje',
  service: 'Mali, veliki servis ili popravak',
  other: 'Bilo koji drugi zapis ili podsjetnik',
}

/** Popis s više vozila od ovoga dobiva polje za pretraživanje. */
const SEARCH_THRESHOLD = 6

/**
 * Nova aktivnost u tri koraka: vozilo → vrsta → podaci.
 * Koraci su u adresi (?vozilo=…&vrsta=…), pa tipka „natrag” vraća na prethodni korak,
 * a profil vozila može otvoriti obrazac s već odabranim vozilom.
 */
export function NewActivityPage() {
  const [params, setParams] = useSearchParams()
  const { data: vehicles, isPending, error, refetch } = useVehicles()
  const goBack = useGoBack('/')

  const vehicleId = params.get('vozilo')
  const typeParam = params.get('vrsta')
  const type = isActivityType(typeParam) ? typeParam : null
  const vehicle = vehicleId ? (vehicles?.find((v) => v.id === vehicleId) ?? null) : null
  const step = !vehicle ? 0 : !type ? 1 : 2

  /** Novi korak = novi zapis u povijesti preglednika. */
  function go(changes: { vozilo?: string | null; vrsta?: string | null }) {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setParams(next)
  }

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

      <PageHeader title="Nova aktivnost" />

      <ol className="mb-5 flex gap-2" aria-label="Koraci">
        {STEPS.map((label, index) => (
          <li key={label} className="flex-1" aria-current={index === step ? 'step' : undefined}>
            <div className={cn('h-1.5 rounded-full', index <= step ? 'bg-brand' : 'bg-surface-2')} />
            <p className={cn('mt-1.5 text-xs', index === step ? 'font-medium text-fg' : 'text-muted')}>
              {index + 1}. {label}
            </p>
          </li>
        ))}
      </ol>

      {isPending ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <Card>
          <ErrorState error={error} onRetry={() => refetch()} />
        </Card>
      ) : !vehicle ? (
        <VehicleStep vehicles={vehicles} onSelect={(id) => go({ vozilo: id })} />
      ) : (
        <>
          <ActivitySummaryBar
            vehicle={vehicle}
            type={type}
            onChangeVehicle={() => go({ vozilo: null })}
            onChangeType={() => go({ vrsta: null })}
          />
          {!type ? (
            <TypeStep onSelect={(value) => go({ vrsta: value })} />
          ) : (
            <NewActivityForm key={`${vehicle.id}-${type}`} vehicle={vehicle} type={type} />
          )}
        </>
      )}
    </div>
  )
}

function VehicleStep({ vehicles, onSelect }: { vehicles: VehicleOverview[]; onSelect: (id: string) => void }) {
  const [query, setQuery] = useState('')

  if (vehicles.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={Car}
          title="Još nema vozila"
          description="Aktivnost se uvijek veže uz vozilo. Najprije dodajte vozilo."
          action={
            <Link to="/vozila/novo" className={buttonClasses('primary')}>
              <Plus className="size-4" aria-hidden="true" />
              Dodaj vozilo
            </Link>
          }
        />
      </Card>
    )
  }

  const shown = sortVehicles(vehicles, 'name').filter((v) => matchesSearch(v, query))

  return (
    <section aria-labelledby="vehicle-step-title">
      <h2 id="vehicle-step-title" className="mb-3 text-base font-semibold">
        Odaberite vozilo
      </h2>

      {vehicles.length > SEARCH_THRESHOLD && (
        <TextField
          label="Pretraži vozila"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Oznaka, marka, model ili vozač"
          autoComplete="off"
          className="mb-3 [&_label]:sr-only"
          trailing={<Search className="mr-3 size-4 text-muted" aria-hidden="true" />}
        />
      )}

      {shown.length === 0 ? (
        <Card>
          <EmptyState icon={SearchX} title="Nema rezultata" description={`Nijedno vozilo ne odgovara upitu „${query}”.`} />
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-border">
            {shown.map((v) => (
              <li key={v.id}>
                <button
                  type="button"
                  onClick={() => onSelect(v.id)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors first:rounded-t-2xl last:rounded-b-2xl hover:bg-surface-2"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">
                      {v.make} {v.model}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
                      <LicensePlate value={v.registration_number} />
                      {v.responsible_person && <span className="truncate">{v.responsible_person}</span>}
                      {!v.is_active && <StatusBadge tone="neutral">Neaktivno</StatusBadge>}
                    </div>
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  )
}

function TypeStep({ onSelect }: { onSelect: (type: ActivityType) => void }) {
  return (
    <section aria-labelledby="type-step-title">
      <h2 id="type-step-title" className="mb-3 text-base font-semibold">
        Odaberite vrstu aktivnosti
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {ACTIVITY_TYPE_ORDER.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => onSelect(value)}
            className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4 text-left transition-colors hover:border-brand hover:bg-surface-2"
          >
            <TypeIcon type={value} large />
            <span className="min-w-0">
              <span className="block font-semibold">{ACTIVITY_TYPES[value].label}</span>
              <span className="block text-sm text-muted">{TYPE_DESCRIPTIONS[value]}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}

function NewActivityForm({ vehicle, type }: { vehicle: VehicleOverview; type: ActivityType }) {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const createActivity = useCreateActivity(vehicle.id)
  const [serverError, setServerError] = useState<string | null>(null)

  function handleSubmit(fields: ActivityFields) {
    setServerError(null)
    createActivity.mutate(fields, {
      onSuccess: () => {
        showToast('Aktivnost je spremljena.')
        navigate(`/vozila/${vehicle.id}`, { replace: true })
      },
      onError: (error) => setServerError(errorMessage(error, 'Spremanje nije uspjelo. Pokušajte ponovno.')),
    })
  }

  return (
    <ActivityForm
      type={type}
      vehicle={vehicle}
      submitLabel="Spremi aktivnost"
      submitting={createActivity.isPending}
      serverError={serverError}
      onSubmit={handleSubmit}
      onCancel={() => navigate(`/vozila/${vehicle.id}`)}
    />
  )
}
