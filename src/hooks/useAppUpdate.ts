import { useEffect, useSyncExternalStore } from 'react'
import { isUpdateAvailable, subscribeUpdate, watchForUpdates } from '@/lib/appUpdate'

/** true kad je objavljena novija verzija od one koja je trenutno otvorena. */
export function useAppUpdate(): boolean {
  useEffect(watchForUpdates, [])
  return useSyncExternalStore(subscribeUpdate, isUpdateAvailable, () => false)
}
