import { BellOff, ChevronRight, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { useSettings } from '@/hooks/useSettings'
import { getDevicePushState, type DevicePushState } from '@/lib/push'

const DISMISS_KEY = 'jcars-push-prompt-dismissed'
/** Nakon „Sakrij” obavijest se ponovno pokazuje tek nakon ovoliko dana. */
const DISMISS_DAYS = 7

function dismissedRecently(): boolean {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY))
    return Number.isFinite(at) && Date.now() - at < DISMISS_DAYS * 86_400_000
  } catch {
    return false
  }
}

function rememberDismiss() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()))
  } catch {
    // Bez spremanja – obavijest se samo sakrije do sljedećeg otvaranja.
  }
}

/** Stanje push obavijesti ovog uređaja; ponovno se provjerava kad se aplikacija vrati u prvi plan. */
function useDevicePushState(): DevicePushState | null {
  const [state, setState] = useState<DevicePushState | null>(null)
  useEffect(() => {
    let active = true
    const refresh = () => {
      getDevicePushState()
        .then((next) => active && setState(next))
        .catch(() => undefined)
    }
    refresh()
    const onVisible = () => document.visibilityState === 'visible' && refresh()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      active = false
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])
  return state
}

/** Poruka i poveznica za pojedino stanje; null kad nema što popraviti. */
function promptFor(device: DevicePushState, enabledForAccount: boolean): { text: string; action: string; to: string } | null {
  if (device === 'unsupported' || device === 'not-configured') return null
  if (device === 'needs-install') {
    return { text: 'Za podsjetnike na iPhoneu dodajte J-CARS na početni zaslon.', action: 'Kako', to: '/postavke' }
  }
  if (device === 'denied') {
    return { text: 'Obavijesti su blokirane u pregledniku – podsjetnici ne stižu.', action: 'Pomoć', to: '/postavke/obavijesti' }
  }
  if (!enabledForAccount) {
    return { text: 'Push obavijesti su isključene – podsjetnici ne stižu.', action: 'Uključi', to: '/postavke/obavijesti' }
  }
  if (device === 'off') {
    return { text: 'Podsjetnici ne stižu na ovaj uređaj.', action: 'Uključi', to: '/postavke/obavijesti' }
  }
  return null
}

/** Mala obavijest na nadzornoj ploči kad ovaj uređaj ne prima push podsjetnike. */
export function PushPrompt() {
  const device = useDevicePushState()
  const { data: settings } = useSettings()
  const [hidden, setHidden] = useState(dismissedRecently)

  if (hidden || !device || !settings) return null
  const prompt = promptFor(device, settings.push_notifications_enabled)
  if (!prompt) return null

  return (
    <div
      role="status"
      className="mb-4 flex items-center gap-2 rounded-xl border border-warn/30 bg-warn-soft py-1.5 pr-1.5 pl-3.5 text-sm text-warn"
    >
      <BellOff className="size-4 shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1 py-1">{prompt.text}</span>
      <Link
        to={prompt.to}
        className="inline-flex shrink-0 items-center gap-0.5 rounded-lg px-2 py-1 font-semibold hover:bg-warn/10"
      >
        {prompt.action}
        <ChevronRight className="size-4" aria-hidden="true" />
      </Link>
      <button
        type="button"
        onClick={() => {
          rememberDismiss()
          setHidden(true)
        }}
        className="shrink-0 rounded-lg p-1.5 hover:bg-warn/10"
        aria-label={`Sakrij na ${DISMISS_DAYS} dana`}
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}
