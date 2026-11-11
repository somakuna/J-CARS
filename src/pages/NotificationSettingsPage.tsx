import { ArrowLeft, BellRing, Clock, Send, Smartphone, type LucideIcon } from 'lucide-react'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card, CardHeader } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { ErrorState, Skeleton } from '@/components/ui/States'
import { StatusBadge, type BadgeTone } from '@/components/ui/StatusBadge'
import { Switch } from '@/components/ui/Switch'
import type { NotificationLogWithVehicle, SettingsPatch } from '@/data/settings'
import { useNotificationLogs, useSendTestNotification, useSettings, useUpdateSettings } from '@/hooks/useSettings'
import { cn } from '@/lib/cn'
import { errorMessage } from '@/lib/errors'
import { disablePushOnDevice, enablePushOnDevice, getDevicePushState, isIos, type DevicePushState } from '@/lib/push'
import { useToast } from '@/lib/toastContext'
import type { NotificationStatus, Settings } from '@/types/database'
import { formatDate, formatDateTime } from '@shared/dates'


const REMINDER_OPTIONS: Array<{ key: keyof Settings & `reminder_${string}`; label: string }> = [
  { key: 'reminder_30_days', label: '30 dana prije' },
  { key: 'reminder_14_days', label: '14 dana prije' },
  { key: 'reminder_7_days', label: '7 dana prije' },
  { key: 'reminder_1_day', label: '1 dan prije' },
  { key: 'reminder_on_expiry', label: 'Na dan isteka' },
]

export function NotificationSettingsPage() {
  const { data: settings, isPending, error, refetch } = useSettings()

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/postavke" className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden="true" />
        Postavke
      </Link>
      <PageHeader title="Obavijesti" description="Push podsjetnici prije rokova" />

      {isPending ? (
        <div className="space-y-4">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-56 rounded-2xl" />
        </div>
      ) : error ? (
        <Card>
          <ErrorState error={error} onRetry={() => refetch()} />
        </Card>
      ) : (
        <SettingsForm settings={settings} />
      )}
    </div>
  )
}

function SettingsForm({ settings }: { settings: Settings }) {
  const { showToast } = useToast()
  const update = useUpdateSettings()

  const save = useCallback(
    (patch: SettingsPatch, successMessage?: string) => {
      update.mutate(
        { id: settings.id, patch },
        {
          onSuccess: () => successMessage && showToast(successMessage),
          onError: (error) => showToast(errorMessage(error, 'Postavka nije spremljena. Pokušajte ponovno.'), 'danger'),
        },
      )
    },
    [settings.id, update, showToast],
  )

  const noChannel = !settings.push_notifications_enabled
  const noInterval = REMINDER_OPTIONS.every(({ key }) => !settings[key])

  return (
    <div className="space-y-4">
      {(noChannel || noInterval) && (
        <Alert tone="info">
          {noChannel
            ? 'Push obavijesti su isključene – podsjetnici se neće slati.'
            : 'Nijedan podsjetnik nije uključen – obavijesti se neće slati.'}
        </Alert>
      )}

      <PushSection settings={settings} save={save} />

      <Card>
        <CardHeader
          title="Podsjetnici"
          description="Za istek registracije, planirani servis i aktivnosti „Ostalo” s uključenim podsjetnikom."
        />
        <div className="divide-y divide-border">
          {REMINDER_OPTIONS.map(({ key, label }) => (
            <Switch
              key={key}
              label={label}
              checked={settings[key]}
              onChange={(checked) => save({ [key]: checked })}
              className="px-4 py-3 sm:px-5"
            />
          ))}
        </div>
        <p className="flex gap-2 border-t border-border px-4 py-3 text-sm text-muted sm:px-5">
          <Clock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Rokovi se provjeravaju automatski svaki dan ujutro, i kad aplikacija nije otvorena. Isti podsjetnik za isti
          rok šalje se samo jednom.
        </p>
      </Card>

      <LogsSection />
    </div>
  )
}

// ---------------------------------------------------------------------------

type Save = (patch: SettingsPatch, successMessage?: string) => void

const DEVICE_STATE_TEXT: Record<DevicePushState, { label: string; tone: BadgeTone; help?: string }> = {
  on: { label: 'Uključeno', tone: 'ok' },
  off: { label: 'Nije uključeno', tone: 'neutral' },
  denied: {
    label: 'Blokirano',
    tone: 'danger',
    help: 'Obavijesti su blokirane u pregledniku. Dopustite ih u postavkama stranice (ikona lokota pokraj adrese), pa osvježite stranicu.',
  },
  'needs-install': {
    label: 'Potrebna instalacija',
    tone: 'warn',
    help: 'Na iPhoneu i iPadu push radi samo kad je aplikacija na početnom zaslonu: u Safariju dodirnite Dijeli → „Dodaj na početni zaslon”, otvorite J-CARS s početnog zaslona i ovdje uključite obavijesti (iOS 16.4 ili noviji).',
  },
  unsupported: { label: 'Nije podržano', tone: 'neutral', help: 'Ovaj preglednik ne podržava push obavijesti.' },
  'not-configured': {
    label: 'Nije podešeno',
    tone: 'neutral',
    help: 'Push obavijesti nisu podešene na poslužitelju (nedostaje VAPID ključ).',
  },
}

function PushSection({ settings, save }: { settings: Settings; save: Save }) {
  const { showToast } = useToast()
  const test = useSendTestNotification()
  const [deviceState, setDeviceState] = useState<DevicePushState | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    getDevicePushState().then((state) => active && setDeviceState(state))
    return () => {
      active = false
    }
  }, [])

  async function toggleDevice() {
    setBusy(true)
    try {
      if (deviceState === 'on') {
        await disablePushOnDevice()
        showToast('Push obavijesti isključene su na ovom uređaju.')
      } else {
        await enablePushOnDevice()
        if (!settings.push_notifications_enabled) save({ push_notifications_enabled: true })
        showToast('Push obavijesti uključene su na ovom uređaju.')
      }
    } catch (error) {
      showToast(errorMessage(error, 'Push obavijesti se nisu mogle uključiti.'), 'danger')
    } finally {
      setDeviceState(await getDevicePushState())
      setBusy(false)
    }
  }

  function sendTest() {
    test.mutate(undefined, {
      onSuccess: (message) => showToast(message),
      onError: (error) => showToast(errorMessage(error), 'danger'),
    })
  }

  const info = deviceState ? DEVICE_STATE_TEXT[deviceState] : null
  const canToggle = deviceState === 'on' || deviceState === 'off'

  return (
    <Card>
      <SectionTitle icon={BellRing} title="Push obavijesti" />
      <div className="space-y-4 px-4 pb-4 sm:px-5">
        <Switch
          label="Šalji push obavijesti"
          description="Na sve uređaje na kojima su obavijesti uključene."
          checked={settings.push_notifications_enabled}
          onChange={(checked) => save({ push_notifications_enabled: checked })}
        />

        <div className="rounded-xl border border-border p-3.5">
          <div className="flex items-center gap-3">
            <Smartphone className="size-5 shrink-0 text-muted" aria-hidden="true" />
            <p className="flex-1 text-sm font-medium">Ovaj uređaj</p>
            {info ? <StatusBadge tone={info.tone}>{info.label}</StatusBadge> : <Spinner className="size-4" />}
          </div>
          {info?.help && <p className="mt-2 text-sm text-muted">{info.help}</p>}
          {deviceState === 'off' && isIos() && (
            <p className="mt-2 text-sm text-muted">Na iPhoneu push radi samo iz aplikacije dodane na početni zaslon.</p>
          )}
          {canToggle && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button variant={deviceState === 'on' ? 'secondary' : 'primary'} onClick={toggleDevice} disabled={busy}>
                {busy && <Spinner className="size-4" />}
                {deviceState === 'on' ? 'Isključi na ovom uređaju' : 'Uključi na ovom uređaju'}
              </Button>
              {deviceState === 'on' && (
                <Button variant="secondary" onClick={sendTest} disabled={test.isPending}>
                  {test.isPending ? <Spinner className="size-4" /> : <Send className="size-4" aria-hidden="true" />}
                  Pošalji probnu obavijest
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------------------

const STATUS_TEXT: Record<NotificationStatus, { label: string; tone: BadgeTone }> = {
  sent: { label: 'Poslano', tone: 'ok' },
  failed: { label: 'Nije uspjelo', tone: 'danger' },
  skipped: { label: 'Preskočeno', tone: 'neutral' },
}

const DEADLINE_TEXT = { registration: 'Istek registracije', service: 'Planirani servis', activity: 'Podsjetnik', test: 'Probna obavijest' }

function intervalText(interval: number | null): string | null {
  if (interval === null) return null
  if (interval === 0) return 'na dan roka'
  return interval === 1 ? '1 dan prije' : `${interval} dana prije`
}

function LogsSection() {
  const { data: logs, isPending, error, refetch } = useNotificationLogs()

  return (
    <Card>
      <CardHeader title="Zadnje obavijesti" description="Poslani podsjetnici i probne obavijesti" />
      {isPending ? (
        <div className="space-y-2 p-4">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : logs.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-muted sm:px-5">Još nije poslana nijedna obavijest.</p>
      ) : (
        <ul className="divide-y divide-border">
          {logs.map((log) => (
            <LogRow key={log.id} log={log} />
          ))}
        </ul>
      )}
    </Card>
  )
}

function LogRow({ log }: { log: NotificationLogWithVehicle }) {
  const status = STATUS_TEXT[log.status]
  const details = [
    log.vehicle && `${log.vehicle.registration_number} · ${log.vehicle.make} ${log.vehicle.model}`,
    log.deadline_date && `rok ${formatDate(log.deadline_date)}`,
    intervalText(log.reminder_interval),
  ].filter(Boolean)

  return (
    <li className="flex gap-3 px-4 py-3 sm:px-5">
      <BellRing className={cn('mt-0.5 size-4 shrink-0', log.status === 'failed' ? 'text-danger' : 'text-muted')} aria-hidden="true" />
      <div className="min-w-0 flex-1 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <p className="font-medium">{DEADLINE_TEXT[log.deadline_type]}</p>
          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
        </div>
        {details.length > 0 && <p className="mt-0.5 text-muted">{details.join(' · ')}</p>}
        <p className="mt-0.5 text-muted">
          {formatDateTime(log.sent_at)}
          {log.recipient && ` · ${log.recipient}`}
        </p>
        {log.error_message && <p className="mt-1 text-danger break-words">{log.error_message}</p>}
      </div>
    </li>
  )
}

function SectionTitle({ icon: Icon, title }: { icon: LucideIcon; title: string }): ReactNode {
  return (
    <h2 className="flex items-center gap-2 px-4 pt-4 pb-3 text-base font-semibold sm:px-5">
      <Icon className="size-5 text-muted" aria-hidden="true" />
      {title}
    </h2>
  )
}
