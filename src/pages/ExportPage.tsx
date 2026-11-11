import { ArrowLeft, Car, DatabaseBackup, Download, FileSpreadsheet, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { todayISO } from '@shared/dates'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { ErrorState, Skeleton } from '@/components/ui/States'
import type { ExportData } from '@/data/export'
import { useExportData } from '@/hooks/useExportData'
import { saveTextFile } from '@/lib/download'
import { errorMessage } from '@/lib/errors'
import { activitiesCsv, backupJson, exportFileName, vehiclesCsv } from '@/lib/exportData'
import { useToast } from '@/lib/toastContext'

type ExportKind = 'vozila' | 'aktivnosti' | 'sigurnosna-kopija'

/** 1 vozilo, 2 vozila, 21 vozilo… */
function countLabel(count: number, one: string, many: string): string {
  return `${count} ${count % 10 === 1 && count % 100 !== 11 ? one : many}`
}

function buildFile(kind: ExportKind, data: ExportData, today: string) {
  switch (kind) {
    case 'vozila':
      return { name: exportFileName(kind, today, 'csv'), content: vehiclesCsv(data.overview), type: 'text/csv;charset=utf-8' }
    case 'aktivnosti':
      return {
        name: exportFileName(kind, today, 'csv'),
        content: activitiesCsv(data.activitiesWithVehicle),
        type: 'text/csv;charset=utf-8',
      }
    case 'sigurnosna-kopija':
      return { name: exportFileName(kind, today, 'json'), content: backupJson(data), type: 'application/json' }
  }
}

export function ExportPage() {
  const { data, isPending, error, refetch } = useExportData()
  const { showToast } = useToast()
  const [busy, setBusy] = useState<ExportKind | null>(null)

  // Datoteka se izrađuje odmah u kliku (bez čekanja mreže) – iOS inače odbije izbornik „Dijeli”.
  async function download(kind: ExportKind) {
    if (!data) return
    setBusy(kind)
    try {
      const file = buildFile(kind, data, todayISO())
      const result = await saveTextFile(file.name, file.content, file.type)
      if (result === 'saved') showToast(`Preuzeto: ${file.name}`)
    } catch (err) {
      showToast(errorMessage(err, 'Izvoz nije uspio. Pokušajte ponovno.'), 'danger')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/postavke" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Postavke
      </Link>
      <PageHeader title="Izvoz podataka" description="Tablice za Excel i sigurnosna kopija svih podataka" />

      {isPending ? (
        <Card className="divide-y divide-border overflow-hidden" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3 p-4">
              <Skeleton className="size-9" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-9 w-24" />
            </div>
          ))}
        </Card>
      ) : error ? (
        <Card>
          <ErrorState error={error} onRetry={() => void refetch()} />
        </Card>
      ) : (
        <ExportList data={data} busy={busy} onDownload={download} />
      )}
    </div>
  )
}

interface ExportListProps {
  data: ExportData
  busy: ExportKind | null
  onDownload: (kind: ExportKind) => void
}

function ExportList({ data, busy, onDownload }: ExportListProps) {
  const vehicleCount = data.overview.length
  const activeCount = data.overview.filter((v) => v.is_active).length
  const activityCount = data.activitiesWithVehicle.length

  return (
    <div className="space-y-5">
      {vehicleCount === 0 && (
        <Card className="flex items-center gap-3 p-4 text-sm">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-muted">
            <Car className="size-5" aria-hidden="true" />
          </div>
          <p className="text-muted">
            Još nema vozila ni aktivnosti za izvoz.{' '}
            <Link to="/vozila/novo" className="font-medium text-fg underline underline-offset-2">
              Dodajte prvo vozilo
            </Link>
            .
          </p>
        </Card>
      )}

      <section>
        <h2 className="mb-2 px-1 text-xs font-semibold tracking-wide text-muted uppercase">Tablice (CSV)</h2>
        <Card className="divide-y divide-border overflow-hidden">
          <ExportRow
            icon={FileSpreadsheet}
            title="Vozila"
            description={
              vehicleCount === 0
                ? 'Nema vozila'
                : `${countLabel(vehicleCount, 'vozilo', 'vozila')}${activeCount < vehicleCount ? `, od toga ${activeCount} aktivnih` : ''} – trenutni podaci, rokovi i gume`
            }
            disabled={vehicleCount === 0}
            busy={busy === 'vozila'}
            onClick={() => onDownload('vozila')}
          />
          <ExportRow
            icon={FileSpreadsheet}
            title="Aktivnosti"
            description={activityCount === 0 ? 'Nema aktivnosti' : `${countLabel(activityCount, 'aktivnost', 'aktivnosti')} – cijela povijest`}
            disabled={activityCount === 0}
            busy={busy === 'aktivnosti'}
            onClick={() => onDownload('aktivnosti')}
          />
        </Card>
        <p className="mt-2 px-1 text-xs text-muted">
          Otvaraju se u Excelu, Numbersu ili Google tablicama. Datumi su u obliku DD.MM.YYYY.
        </p>
      </section>

      <section>
        <h2 className="mb-2 px-1 text-xs font-semibold tracking-wide text-muted uppercase">Sigurnosna kopija</h2>
        <Card className="overflow-hidden">
          <ExportRow
            icon={DatabaseBackup}
            title="Svi podaci (JSON)"
            description="Vozila, aktivnosti, postavke obavijesti i evidencija poslanih obavijesti"
            busy={busy === 'sigurnosna-kopija'}
            onClick={() => onDownload('sigurnosna-kopija')}
          />
        </Card>
        <p className="mt-2 px-1 text-xs text-muted">
          Kopiju čuvajte na sigurnom mjestu jer sadrži sve podatke. Prijave uređaja za push obavijesti nisu dio
          kopije – vezane su uz pojedini uređaj.
        </p>
      </section>
    </div>
  )
}

interface ExportRowProps {
  icon: LucideIcon
  title: string
  description: string
  disabled?: boolean
  busy: boolean
  onClick: () => void
}

function ExportRow({ icon: Icon, title, description, disabled, busy, onClick }: ExportRowProps) {
  return (
    <div className="flex items-center gap-3 p-4">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-fg">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium">{title}</p>
        <p className="mt-0.5 text-muted">{description}</p>
      </div>
      <Button variant="secondary" size="sm" onClick={onClick} disabled={disabled || busy} aria-label={`Preuzmi: ${title}`}>
        <Download className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">Preuzmi</span>
      </Button>
    </div>
  )
}
