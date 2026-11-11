/**
 * Nova verzija aplikacije.
 * Pri svakom pokretanju aplikacija se učitava s mreže (service worker: prvo mreža), pa je odmah najnovija.
 * Instalirana aplikacija na mobitelu može, međutim, danima ostati otvorena u pozadini sa starim kodom –
 * zato se /version.json provjerava kad se aplikacija vrati u prvi plan i povremeno dok je otvorena.
 */

const CHECK_INTERVAL_MS = 30 * 60_000

let available = false
const listeners = new Set<() => void>()

async function check(): Promise<void> {
  if (available || !navigator.onLine || import.meta.env.DEV) return
  try {
    const response = await fetch('/version.json', { cache: 'no-store' })
    if (!response.ok) return
    const { build } = (await response.json()) as { build?: string }
    if (build && build !== __BUILD_ID__) {
      available = true
      for (const listener of listeners) listener()
      // Neka i service worker odmah dohvati svoju novu verziju.
      void navigator.serviceWorker?.getRegistration('/').then((r) => r?.update())
    }
  } catch {
    // Bez veze ili neispravan odgovor – provjera se ponavlja kasnije.
  }
}

let started = false

/** Pokreće provjere (jednom za cijelu aplikaciju). */
export function watchForUpdates(): void {
  if (started) return
  started = true
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void check()
  })
  window.addEventListener('online', () => void check())
  window.setInterval(() => void check(), CHECK_INTERVAL_MS)
  void check()
}

export function subscribeUpdate(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function isUpdateAvailable(): boolean {
  return available
}
