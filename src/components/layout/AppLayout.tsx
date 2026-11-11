import { Plus, WifiOff } from 'lucide-react'
import { useEffect } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { Logo } from '@/components/Logo'
import { buttonClasses } from '@/components/ui/buttonClasses'
import { useOnline } from '@/hooks/useOnline'
import { cn } from '@/lib/cn'
import { NAV_ITEMS, NEW_ACTIVITY_PATH } from './navigation'

export function AppLayout() {
  const { pathname } = useLocation()
  // Na obrascima „+” ne smije prekrivati gumb za spremanje.
  const onForm = pathname === NEW_ACTIVITY_PATH || /\/(novo|uredi)$/.test(pathname)
  // Na profilu vozila „+” otvara novu aktivnost s već odabranim vozilom.
  const vehicleId = /^\/vozila\/([^/]+)$/.exec(pathname)?.[1]
  const newActivityLink = vehicleId && vehicleId !== 'novo' ? `${NEW_ACTIVITY_PATH}?vozilo=${vehicleId}` : NEW_ACTIVITY_PATH

  // Nova stranica počinje od vrha.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="min-h-dvh lg:pl-64">
      <Sidebar newActivityLink={newActivityLink} />
      <MobileHeader />

      <main className="mx-auto w-full max-w-6xl px-4 pt-4 pb-32 sm:px-6 lg:px-8 lg:pt-8 lg:pb-12">
        <OfflineNotice />
        <Outlet />
      </main>

      {!onForm && <FloatingAddButton to={newActivityLink} />}
      <BottomNav />
    </div>
  )
}

function Sidebar({ newActivityLink }: { newActivityLink: string }) {
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-surface lg:flex">
      <div className="px-5 pt-6 pb-5">
        <Link to="/" aria-label="J-CARS – nadzorna ploča">
          <Logo />
        </Link>
      </div>

      <div className="px-4 pb-4">
        <Link to={newActivityLink} className={buttonClasses('primary', 'md', 'w-full')}>
          <Plus className="size-4" aria-hidden="true" />
          Nova aktivnost
        </Link>
      </div>

      <nav aria-label="Glavna navigacija" className="flex-1 px-3">
        <ul className="space-y-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
                    isActive ? 'bg-surface-2 font-semibold text-fg' : 'text-muted hover:bg-surface-2/60 hover:text-fg',
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={cn('size-5', isActive && 'text-fg')} aria-hidden="true" />
                    {label}
                    {isActive && <span className="ml-auto h-5 w-1 rounded-full bg-brand" aria-hidden="true" />}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <p className="px-5 py-4 text-xs text-muted">J-CARS v{__APP_VERSION__}</p>
    </aside>
  )
}

function MobileHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg/85 pt-[env(safe-area-inset-top)] backdrop-blur lg:hidden">
      <div className="flex h-14 items-center px-4 sm:px-6">
        <Link to="/" aria-label="J-CARS – nadzorna ploča">
          <Logo className="[&_img]:size-8" />
        </Link>
      </div>
    </header>
  )
}

function BottomNav() {
  return (
    <nav
      aria-label="Glavna navigacija"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-lg grid-cols-5">
        {NAV_ITEMS.map(({ to, shortLabel, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium',
                  isActive ? 'text-fg' : 'text-muted',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                      isActive && 'bg-brand text-ink',
                    )}
                  >
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  {shortLabel}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function FloatingAddButton({ to }: { to: string }) {
  return (
    <Link
      to={to}
      aria-label="Nova aktivnost"
      title="Nova aktivnost"
      className="fixed right-4 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 flex size-14 items-center justify-center rounded-2xl bg-brand text-ink shadow-lg shadow-black/15 transition-colors hover:bg-brand-strong sm:right-6 lg:hidden"
    >
      <Plus className="size-7" aria-hidden="true" />
    </Link>
  )
}

function OfflineNotice() {
  const online = useOnline()
  if (online) return null
  return (
    <div role="status" className="mb-4 flex items-center gap-2 rounded-xl border border-warn/30 bg-warn-soft px-3.5 py-2.5 text-sm text-warn">
      <WifiOff className="size-4 shrink-0" aria-hidden="true" />
      Nema internetske veze – podaci se ne mogu učitati ni spremiti dok se veza ne vrati.
    </div>
  )
}
