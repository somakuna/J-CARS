import { Car, Plus, Search, SearchX, X } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router'
import { VehicleCard } from '@/components/vehicles/VehicleCard'
import { buttonClasses } from '@/components/ui/buttonClasses'
import { Card } from '@/components/ui/Card'
import { EmptyState } from '@/components/ui/EmptyState'
import { inputClasses } from '@/components/ui/fieldUtils'
import { PageHeader } from '@/components/ui/PageHeader'
import { ErrorState, Skeleton } from '@/components/ui/States'
import { useVehicles } from '@/hooks/useVehicles'
import { cn } from '@/lib/cn'
import {
  STATUS_FILTERS,
  countByStatus,
  isStatusFilter,
  matchesSearch,
  matchesStatus,
  sortVehicles,
  type VehicleSort,
} from '@/lib/vehicleFilters'
import { todayISO } from '@shared/dates'

export function VehiclesPage() {
  const { data: vehicles, isPending, error, refetch } = useVehicles()
  const [params, setParams] = useSearchParams()

  const query = params.get('q') ?? ''
  const statusParam = params.get('status')
  const status = isStatusFilter(statusParam) ? statusParam : 'all'
  const sort: VehicleSort = params.get('sort') === 'name' ? 'name' : 'deadline'
  const today = todayISO()

  function updateParam(key: string, value: string | null) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (value) next.set(key, value)
        else next.delete(key)
        return next
      },
      { replace: true },
    )
  }

  const counts = useMemo(() => (vehicles ? countByStatus(vehicles, today) : null), [vehicles, today])
  const visible = useMemo(() => {
    if (!vehicles) return []
    const filtered = vehicles.filter((v) => matchesStatus(v, status, today) && matchesSearch(v, query))
    return sortVehicles(filtered, sort)
  }, [vehicles, status, query, sort, today])

  const addButton = (
    <Link to="/vozila/novo" className={buttonClasses('primary')}>
      <Plus className="size-4" aria-hidden="true" />
      Dodaj vozilo
    </Link>
  )

  const hasVehicles = (vehicles?.length ?? 0) > 0

  return (
    <>
      <PageHeader
        title="Vozila"
        description={vehicles ? `${vehicles.length} ${vehicleWord(vehicles.length)} u evidenciji` : undefined}
        actions={hasVehicles ? addButton : undefined}
      />

      {isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-52 rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <Card>
          <ErrorState error={error} onRetry={() => refetch()} />
        </Card>
      ) : !hasVehicles ? (
        <Card>
          <EmptyState
            icon={Car}
            title="Još nema vozila"
            description="Dodajte prvo vozilo s registracijskom oznakom i datumom isteka registracije."
            action={addButton}
          />
        </Card>
      ) : (
        <>
          <div className="mb-4 space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" aria-hidden="true" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => updateParam('q', e.target.value || null)}
                  placeholder="Traži po marki, modelu, oznaci ili vozaču"
                  aria-label="Pretraživanje vozila"
                  className={cn(inputClasses, 'pr-10 pl-10 [&::-webkit-search-cancel-button]:hidden')}
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => updateParam('q', null)}
                    className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:text-fg"
                    aria-label="Očisti pretraživanje"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                )}
              </div>
              <select
                value={sort}
                onChange={(e) => updateParam('sort', e.target.value === 'name' ? 'name' : null)}
                aria-label="Poredak"
                className={cn(inputClasses, 'w-auto shrink-0 pr-8')}
              >
                <option value="deadline">Po roku</option>
                <option value="name">Po nazivu</option>
              </select>
            </div>

            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filtar statusa">
              {STATUS_FILTERS.map((f) => {
                const active = status === f.value
                return (
                  <button
                    key={f.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => updateParam('status', f.value === 'all' ? null : f.value)}
                    className={cn(
                      'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors',
                      active ? 'border-ink bg-ink text-white dark:border-brand dark:bg-brand dark:text-ink' : 'border-border bg-surface text-muted hover:text-fg',
                    )}
                  >
                    {f.label}
                    <span className={cn('tabular-nums', active ? 'opacity-80' : 'opacity-70')}>{counts?.[f.value] ?? 0}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {visible.length === 0 ? (
            <Card>
              <EmptyState
                icon={SearchX}
                title="Nema vozila za odabrane uvjete"
                description="Promijenite pojam pretraživanja ili filtar."
                action={
                  <button
                    type="button"
                    onClick={() => setParams({}, { replace: true })}
                    className={buttonClasses('secondary')}
                  >
                    Prikaži sva vozila
                  </button>
                }
              />
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((vehicle) => (
                <VehicleCard key={vehicle.id} vehicle={vehicle} today={today} />
              ))}
            </div>
          )}
        </>
      )}
    </>
  )
}

/** 1 vozilo, 2 vozila, 5 vozila, 21 vozilo. */
function vehicleWord(count: number): string {
  return count % 10 === 1 && count % 100 !== 11 ? 'vozilo' : 'vozila'
}
