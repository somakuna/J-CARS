import { ClipboardList, Plus, Search, SearchX } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ActivityList } from '@/components/activities/ActivityList'
import { NEW_ACTIVITY_PATH } from '@/components/layout/navigation'
import { Button } from '@/components/ui/Button'
import { buttonClasses } from '@/components/ui/buttonClasses'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { TextField } from '@/components/ui/Field'
import { inputClasses } from '@/components/ui/fieldUtils'
import { PageHeader } from '@/components/ui/PageHeader'
import { ErrorState, Skeleton } from '@/components/ui/States'
import { useActivities } from '@/hooks/useActivities'
import { useVehicles } from '@/hooks/useVehicles'
import {
  ACTIVITY_TYPE_FILTERS,
  countByType,
  isActivityTypeFilter,
  matchesActivitySearch,
} from '@/lib/activityFilters'
import { cn } from '@/lib/cn'
import { sortVehicles } from '@/lib/vehicleFilters'

/** Koliko se aktivnosti prikazuje odjednom. */
const PAGE_SIZE = 50

export function ActivitiesPage() {
  const [params, setParams] = useSearchParams()
  const { data: activities, isPending, error, refetch } = useActivities()
  const { data: vehicles } = useVehicles()
  const [limit, setLimit] = useState(PAGE_SIZE)

  const query = params.get('q') ?? ''
  const typeParam = params.get('vrsta')
  const typeFilter = isActivityTypeFilter(typeParam) ? typeParam : 'all'
  const vehicleFilter = params.get('vozilo') ?? ''

  /** Filtri su u adresi, pa ostaju nakon povratka s profila vozila. */
  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value && value !== 'all') next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
    setLimit(PAGE_SIZE)
  }

  // Brojevi po vrsti uzimaju u obzir pretragu i vozilo, ali ne i odabranu vrstu.
  const { byVehicleAndSearch, filtered } = useMemo(() => {
    const base = (activities ?? []).filter(
      (a) => (!vehicleFilter || a.vehicle_id === vehicleFilter) && matchesActivitySearch(a, query),
    )
    return {
      byVehicleAndSearch: base,
      filtered: typeFilter === 'all' ? base : base.filter((a) => a.activity_type === typeFilter),
    }
  }, [activities, vehicleFilter, query, typeFilter])

  const counts = countByType(byVehicleAndSearch)
  const hasFilters = query !== '' || typeFilter !== 'all' || vehicleFilter !== ''
  const sortedVehicles = useMemo(() => sortVehicles(vehicles ?? [], 'name'), [vehicles])

  return (
    <>
      <PageHeader
        title="Aktivnosti"
        description="Povijest registracija, guma, servisa i ostalih zapisa"
        actions={
          <Link to={NEW_ACTIVITY_PATH} className={buttonClasses('primary', 'md', 'hidden lg:inline-flex')}>
            <Plus className="size-4" aria-hidden="true" />
            Nova aktivnost
          </Link>
        }
      />

      {isPending ? (
        <Card className="space-y-4 p-4 sm:p-5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="size-10 shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
          ))}
        </Card>
      ) : error ? (
        <Card>
          <ErrorState error={error} onRetry={() => refetch()} />
        </Card>
      ) : activities.length === 0 ? (
        <Card>
          <EmptyState
            icon={ClipboardList}
            title="Još nema aktivnosti"
            description="Svaka registracija, promjena guma, servis ili drugi zapis bit će vidljiv ovdje i u profilu vozila."
            action={
              <Link to={NEW_ACTIVITY_PATH} className={buttonClasses('primary')}>
                <Plus className="size-4" aria-hidden="true" />
                Nova aktivnost
              </Link>
            }
          />
        </Card>
      ) : (
        <>
          <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_16rem]">
            <TextField
              label="Pretraži aktivnosti"
              type="search"
              value={query}
              onChange={(e) => setParam('q', e.target.value)}
              placeholder="Naslov, opis, vozilo ili oznaka"
              autoComplete="off"
              className="[&_label]:sr-only"
              trailing={<Search className="mr-3 size-4 text-muted" aria-hidden="true" />}
            />
            <label className="block">
              <span className="sr-only">Vozilo</span>
              <select
                value={vehicleFilter}
                onChange={(e) => setParam('vozilo', e.target.value)}
                className={cn(inputClasses, 'pr-8')}
              >
                <option value="">Sva vozila</option>
                {sortedVehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registration_number} · {v.make} {v.model}
                    {v.is_active ? '' : ' (neaktivno)'}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div
            className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
            role="group"
            aria-label="Filtar vrste aktivnosti"
          >
            {ACTIVITY_TYPE_FILTERS.map(({ value, label }) => {
              const active = typeFilter === value
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setParam('vrsta', value)}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors',
                    active
                      ? 'border-ink bg-ink text-white dark:border-brand dark:bg-brand dark:text-ink'
                      : 'border-border bg-surface text-muted hover:text-fg',
                  )}
                >
                  {label}
                  <span className={cn('tabular-nums', active ? 'opacity-80' : 'opacity-70')}>{counts[value]}</span>
                </button>
              )
            })}
          </div>

          {filtered.length === 0 ? (
            <Card>
              <EmptyState
                icon={SearchX}
                title="Nema rezultata"
                description="Nijedna aktivnost ne odgovara odabranim filtrima."
                action={
                  hasFilters && (
                    <Button variant="secondary" onClick={() => setParams({}, { replace: true })}>
                      Očisti filtre
                    </Button>
                  )
                }
              />
            </Card>
          ) : (
            <>
              <p className="mb-2 text-sm text-muted" aria-live="polite">
                {filtered.length === activities.length
                  ? `Ukupno: ${activities.length}`
                  : `Prikazano ${filtered.length} od ${activities.length}`}
              </p>
              <Card>
                <ActivityList activities={filtered.slice(0, limit)} showVehicle={!vehicleFilter} />
              </Card>
              {filtered.length > limit && (
                <div className="mt-4 flex justify-center">
                  <Button variant="secondary" onClick={() => setLimit((current) => current + PAGE_SIZE)}>
                    Prikaži još ({filtered.length - limit})
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </>
  )
}
