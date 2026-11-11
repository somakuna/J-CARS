/**
 * Instalacija aplikacije (PWA).
 * Chrome, Edge i Samsung Internet šalju `beforeinstallprompt` – tada aplikacija sama
 * nudi gumb „Instaliraj”. Safari (iPhone/iPad/Mac) to ne podržava: instalira se ručno
 * preko Dijeli → „Dodaj na početni zaslon”.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null
let installedNow = false
const listeners = new Set<() => void>()

function notify() {
  for (const listener of listeners) listener()
}

/** Poziva se jednom pri pokretanju – događaj stiže prije nego se otvori stranica Postavke. */
export function captureInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredPrompt = event as BeforeInstallPromptEvent
    notify()
  })
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    installedNow = true
    notify()
  })
}

export function subscribeInstall(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export interface InstallSnapshot {
  canPrompt: boolean
  installedNow: boolean
}

let snapshot: InstallSnapshot = { canPrompt: false, installedNow: false }

export function getInstallSnapshot(): InstallSnapshot {
  const canPrompt = deferredPrompt !== null
  if (snapshot.canPrompt !== canPrompt || snapshot.installedNow !== installedNow) {
    snapshot = { canPrompt, installedNow }
  }
  return snapshot
}

/** Otvara sistemski dijalog za instalaciju; true ako je korisnik prihvatio. */
export async function promptInstall(): Promise<boolean> {
  const prompt = deferredPrompt
  if (!prompt) return false
  await prompt.prompt()
  const { outcome } = await prompt.userChoice
  // Isti događaj ne može se iskoristiti dvaput.
  deferredPrompt = null
  notify()
  return outcome === 'accepted'
}
