import webpush, { WebPushError } from 'web-push'
import { env } from './env.js'

export interface PushPayload {
  title: string
  body: string
  /** Adresa unutar aplikacije koja se otvara klikom na obavijest. */
  url: string
  /** Ista oznaka zamjenjuje prethodnu obavijest umjesto da ih se nakupi više. */
  tag: string
}

export interface PushTarget {
  endpoint: string
  p256dh: string
  auth: string
}

/** 'sent' ili 'gone' (pretplata više ne postoji – treba je obrisati). Ostale greške baca. */
export async function sendPush(target: PushTarget, payload: PushPayload): Promise<'sent' | 'gone'> {
  const { publicKey, privateKey, subject } = env.vapid()
  try {
    await webpush.sendNotification(
      { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
      JSON.stringify(payload),
      { vapidDetails: { subject, publicKey, privateKey }, TTL: 60 * 60 * 24, urgency: 'normal' },
    )
    return 'sent'
  } catch (error) {
    if (error instanceof WebPushError && (error.statusCode === 404 || error.statusCode === 410)) return 'gone'
    if (error instanceof WebPushError) throw new Error(`Push servis je odbio obavijest (HTTP ${error.statusCode}).`)
    throw error
  }
}

/** Kratak opis pretplate za evidenciju (bez tajnih dijelova adrese). */
export function pushRecipient(endpoint: string): string {
  try {
    return `push: ${new URL(endpoint).hostname}`
  } catch {
    return 'push'
  }
}
