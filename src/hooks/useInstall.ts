import { useSyncExternalStore } from 'react'
import { getInstallSnapshot, promptInstall, subscribeInstall } from '@/lib/install'
import { isIos, isStandalone } from '@/lib/push'

/** Stanje instalacije na ovom uređaju i preglednik-specifičan način instalacije. */
export function useInstall() {
  const { canPrompt, installedNow } = useSyncExternalStore(subscribeInstall, getInstallSnapshot, getInstallSnapshot)
  return {
    /** Aplikacija je pokrenuta kao instalirana (bez sučelja preglednika) ili je upravo instalirana. */
    installed: isStandalone() || installedNow,
    canPrompt,
    ios: isIos(),
    promptInstall,
  }
}
