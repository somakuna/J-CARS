import { UserFacingError } from './errors'
import { supabase } from './supabase'

const VAPID_PUBLIC_KEY = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined)?.trim() || undefined
const SW_URL = '/sw.js'

/**
 * Stanje push obavijesti na OVOM uređaju:
 *  - on / off       – pretplata ovog uređaja za prijavljenog korisnika postoji / ne postoji
 *  - denied         – korisnik je blokirao obavijesti u pregledniku
 *  - needs-install  – iPhone/iPad: push radi tek kad je aplikacija dodana na početni zaslon (iOS 16.4+)
 *  - unsupported    – preglednik ne podržava push
 *  - not-configured – nedostaje VITE_VAPID_PUBLIC_KEY
 */
export type DevicePushState = 'on' | 'off' | 'denied' | 'needs-install' | 'unsupported' | 'not-configured'

export function isIos(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1)
}

export function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
}

function pushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

/** Registracija service workera (poziva se pri pokretanju aplikacije). */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  try {
    return await navigator.serviceWorker.register(SW_URL, { scope: '/' })
  } catch {
    return null
  }
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration('/')
  return (await registration?.pushManager.getSubscription()) ?? null
}

export async function getDevicePushState(): Promise<DevicePushState> {
  if (!VAPID_PUBLIC_KEY) return 'not-configured'
  if (!pushSupported()) return isIos() && !isStandalone() ? 'needs-install' : 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  const subscription = await currentSubscription()
  if (!subscription) return 'off'
  // Pretplata preglednika može pripadati drugom korisniku koji je ovdje bio prijavljen (RLS ga ne vraća).
  const { data, error } = await supabase.from('push_subscriptions').select('id').eq('endpoint', subscription.endpoint).maybeSingle()
  if (error) return 'on' // bez veze ne možemo provjeriti – pretpostavi da je uključeno
  return data ? 'on' : 'off'
}

/** Traži dopuštenje, pretplaćuje uređaj i sprema pretplatu u bazu. */
export async function enablePushOnDevice(): Promise<void> {
  if (!VAPID_PUBLIC_KEY) throw new UserFacingError('Push obavijesti nisu podešene (nedostaje VAPID ključ).')
  if (!pushSupported()) throw new UserFacingError('Ovaj preglednik ne podržava push obavijesti.')

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new UserFacingError('Obavijesti nisu dopuštene. Dopustite ih u postavkama preglednika za ovu stranicu.')
  }

  const registration = (await registerServiceWorker()) ?? (await navigator.serviceWorker.ready)
  await navigator.serviceWorker.ready
  const serverKey = base64UrlToUint8Array(VAPID_PUBLIC_KEY)

  let subscription = await registration.pushManager.getSubscription()
  // Pretplata napravljena drugim ključem ne može primati obavijesti – zamijeni je.
  if (subscription && !sameKey(subscription.options.applicationServerKey, serverKey)) {
    await subscription.unsubscribe()
    subscription = null
  }
  subscription ??= await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: serverKey })

  const { error } = await saveSubscription(subscription)
  if (!error) return
  // 42501: pretplatu ovog preglednika spremio je drugi korisnik – napravi novu, samo za prijavljenog.
  if (error.code !== '42501') throw error
  await subscription.unsubscribe()
  const fresh = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: serverKey })
  const retry = await saveSubscription(fresh)
  if (retry.error) throw retry.error
}

function saveSubscription(subscription: PushSubscription) {
  const json = subscription.toJSON()
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) throw new UserFacingError('Preglednik nije vratio ispravnu pretplatu.')
  return supabase
    .from('push_subscriptions')
    .upsert(
      { endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth, device_info: describeDevice() },
      { onConflict: 'endpoint' },
    )
}

/** Odjavljuje ovaj uređaj (ostali uređaji i dalje primaju obavijesti). */
export async function disablePushOnDevice(): Promise<void> {
  const subscription = await currentSubscription()
  if (!subscription) return
  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint)
  if (error) throw error
  await subscription.unsubscribe()
}

/** „iPhone · Safari”, „Android · Chrome”, „Windows · Edge”… */
export function describeDevice(): string {
  const ua = navigator.userAgent
  const os = isIos()
    ? /iPad/.test(ua) || ua.includes('Macintosh') ? 'iPad' : 'iPhone'
    : /Android/.test(ua) ? 'Android' : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Uređaj'
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /SamsungBrowser/.test(ua)
      ? 'Samsung Internet'
      : /Firefox|FxiOS/.test(ua)
        ? 'Firefox'
        : /Chrome|CriOS/.test(ua)
          ? 'Chrome'
          : /Safari/.test(ua)
            ? 'Safari'
            : 'preglednik'
  return `${os} · ${browser}${isStandalone() ? ' (aplikacija)' : ''}`
}

function base64UrlToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4)
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const bytes = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i)
  return bytes
}

function sameKey(current: ArrayBuffer | null, expected: Uint8Array): boolean {
  if (!current) return false
  const a = new Uint8Array(current)
  return a.length === expected.length && a.every((byte, i) => byte === expected[i])
}
