import {
  Bell,
  CircleCheck,
  ChevronRight,
  Download,
  Info,
  LogOut,
  Monitor,
  Moon,
  Share,
  Smartphone,
  SquarePlus,
  Sun,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PageHeader } from '@/components/ui/PageHeader'
import { Spinner } from '@/components/ui/Spinner'
import { useInstall } from '@/hooks/useInstall'
import { useAuth } from '@/lib/authContext'
import { cn } from '@/lib/cn'
import { errorMessage } from '@/lib/errors'
import { useTheme, type ThemePreference } from '@/lib/themeContext'
import { useToast } from '@/lib/toastContext'

const THEME_OPTIONS: Array<{ value: ThemePreference; label: string; icon: LucideIcon }> = [
  { value: 'system', label: 'Sustav', icon: Monitor },
  { value: 'light', label: 'Svijetla', icon: Sun },
  { value: 'dark', label: 'Tamna', icon: Moon },
]

export function SettingsPage() {
  const { preference, setPreference } = useTheme()

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Postavke" />

      <div className="space-y-5">
        <SettingsSection title="Obavijesti">
          <SettingsRow
            icon={Bell}
            title="Obavijesti"
            description="E-mail i push obavijesti, podsjetnici prije rokova"
            to="/postavke/obavijesti"
          />
        </SettingsSection>

        <SettingsSection title="Izgled">
          <div className="p-4">
            <p className="mb-3 text-sm font-medium" id="theme-label">
              Tema
            </p>
            <div role="radiogroup" aria-labelledby="theme-label" className="grid grid-cols-3 gap-2">
              {THEME_OPTIONS.map(({ value, label, icon: Icon }) => {
                const selected = preference === value
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setPreference(value)}
                    className={cn(
                      'flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-sm transition-colors',
                      selected
                        ? 'border-brand bg-brand/15 font-semibold text-fg'
                        : 'border-border text-muted hover:bg-surface-2',
                    )}
                  >
                    <Icon className="size-5" aria-hidden="true" />
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
        </SettingsSection>

        <SettingsSection title="Podaci">
          <SettingsRow
            icon={Download}
            title="Izvoz podataka"
            description="CSV izvoz vozila i aktivnosti – uskoro"
            disabled
          />
        </SettingsSection>

        <SettingsSection title="O aplikaciji">
          <div className="flex gap-3 p-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-muted">
              <Info className="size-5" aria-hidden="true" />
            </div>
            <div className="text-sm">
              <p className="font-medium">J-CARS · verzija {__APP_VERSION__}</p>
              <p className="mt-0.5 text-muted">Evidencija i praćenje službenih vozila, rokova i aktivnosti.</p>
            </div>
          </div>
        </SettingsSection>

        <InstallSection />

        <AccountSection />
      </div>
    </div>
  )
}

function InstallSection() {
  const { installed, canPrompt, ios, promptInstall } = useInstall()
  const { showToast } = useToast()

  async function install() {
    try {
      if (await promptInstall()) showToast('J-CARS se instalira na ovaj uređaj.')
    } catch {
      showToast('Instalacija nije pokrenuta. Pokušajte iz izbornika preglednika.', 'danger')
    }
  }

  return (
    <SettingsSection title="Aplikacija">
      <div className="space-y-3 p-4 text-sm">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-fg">
            {installed ? <CircleCheck className="size-5 text-ok" aria-hidden="true" /> : <Smartphone className="size-5" aria-hidden="true" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium">{installed ? 'J-CARS je instaliran na ovom uređaju' : 'Instalirajte J-CARS'}</p>
            <p className="mt-0.5 text-muted">
              {installed
                ? 'Aplikacija se otvara s početnog zaslona, bez trake preglednika.'
                : 'Pokretanje s početnog zaslona, bez trake preglednika, i push obavijesti.'}
            </p>
          </div>
          {!installed && canPrompt && (
            <Button onClick={install}>
              <Download className="size-4" aria-hidden="true" />
              Instaliraj
            </Button>
          )}
        </div>

        {!installed && !canPrompt && (
          <div className="rounded-xl bg-surface-2 px-3.5 py-3 text-muted">
            {ios ? (
              <ol className="list-decimal space-y-1 pl-4">
                <li>
                  Otvorite J-CARS u <strong className="text-fg">Safariju</strong>.
                </li>
                <li>
                  Dodirnite <Share className="inline size-4 align-text-bottom text-fg" aria-label="Dijeli" />{' '}
                  <strong className="text-fg">Dijeli</strong>.
                </li>
                <li>
                  Odaberite <SquarePlus className="inline size-4 align-text-bottom text-fg" aria-hidden="true" />{' '}
                  <strong className="text-fg">Dodaj na početni zaslon</strong>.
                </li>
              </ol>
            ) : (
              <p>
                U izborniku preglednika (⋮ ili ⋯) odaberite <strong className="text-fg">Instaliraj aplikaciju</strong> ili{' '}
                <strong className="text-fg">Dodaj na početni zaslon</strong>.
              </p>
            )}
          </div>
        )}

        <details className="group rounded-xl border border-border px-3.5 py-2.5">
          <summary className="cursor-pointer font-medium">Podrška za push obavijesti po uređajima</summary>
          <ul className="mt-2 space-y-1.5 text-muted">
            <li>
              <strong className="text-fg">Android</strong> (Chrome, Edge, Samsung Internet, Firefox) – rade u pregledniku i u
              instaliranoj aplikaciji.
            </li>
            <li>
              <strong className="text-fg">iPhone i iPad</strong> – samo u aplikaciji dodanoj na početni zaslon, iOS/iPadOS 16.4 ili
              noviji. U Safariju bez instalacije ne rade.
            </li>
            <li>
              <strong className="text-fg">Windows, macOS, Linux</strong> (Chrome, Edge, Firefox, Safari 16+) – rade dok je
              preglednik pokrenut.
            </li>
            <li>Ako obavijesti blokirate u pregledniku ili sustavu, ne stižu – u tom slučaju i dalje stiže e-mail.</li>
          </ul>
        </details>
      </div>
    </SettingsSection>
  )
}

function AccountSection() {
  const { user, signOut } = useAuth()
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSignOut() {
    setError(null)
    setSigningOut(true)
    try {
      await signOut()
    } catch (err) {
      setError(errorMessage(err, 'Odjava nije uspjela. Pokušajte ponovno.'))
      setSigningOut(false)
    }
  }

  return (
    <SettingsSection title="Račun">
      <div className="flex flex-wrap items-center gap-3 p-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-fg">
          <UserRound className="size-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-medium">Administrator</p>
          <p className="mt-0.5 truncate text-muted">{user?.email}</p>
        </div>
        <Button variant="secondary" onClick={handleSignOut} disabled={signingOut}>
          {signingOut ? <Spinner className="size-4" /> : <LogOut className="size-4" aria-hidden="true" />}
          Odjava
        </Button>
        {error && (
          <Alert tone="danger" className="w-full">
            {error}
          </Alert>
        )}
      </div>
    </SettingsSection>
  )
}

function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 px-1 text-xs font-semibold tracking-wide text-muted uppercase">{title}</h2>
      <Card className="divide-y divide-border overflow-hidden">{children}</Card>
    </section>
  )
}

interface SettingsRowProps {
  icon: LucideIcon
  title: string
  description?: string
  to?: string
  disabled?: boolean
}

function SettingsRow({ icon: Icon, title, description, to, disabled }: SettingsRowProps) {
  const content = (
    <>
      <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-fg">
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium">{title}</p>
        {description && <p className="mt-0.5 text-muted">{description}</p>}
      </div>
      {to && !disabled && <ChevronRight className="size-5 shrink-0 text-muted" aria-hidden="true" />}
    </>
  )

  const base = 'flex items-center gap-3 p-4'

  if (to && !disabled) {
    return (
      <Link to={to} className={cn(base, 'transition-colors hover:bg-surface-2/60')}>
        {content}
      </Link>
    )
  }
  return <div className={cn(base, disabled && 'opacity-60')}>{content}</div>
}
