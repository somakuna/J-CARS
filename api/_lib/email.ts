import { env } from './env.js'

export interface EmailMessage {
  to: string
  subject: string
  html: string
  text: string
}

/** Slanje e-maila preko Resend API-ja. Baca grešku s porukom na hrvatskom. */
export async function sendEmail(message: EmailMessage): Promise<void> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.resendApiKey()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.emailFrom(), ...message }),
  })
  if (response.ok) return

  const body = (await response.json().catch(() => ({}))) as { message?: string; name?: string }
  const detail = body.message ?? `HTTP ${response.status}`
  if (response.status === 403 && /own email|testing emails|verify a domain/i.test(detail)) {
    throw new Error(
      'Resend bez potvrđene domene šalje samo na adresu vlasnika Resend računa. ' +
        'Potvrdite domenu u Resendu (Domains) i postavite EMAIL_FROM na adresu s te domene.',
    )
  }
  if (response.status === 401 || response.status === 403) throw new Error(`Resend je odbio ključ ili pošiljatelja: ${detail}`)
  if (response.status === 422) throw new Error(`Resend je odbio poruku: ${detail}`)
  if (response.status === 429) throw new Error('Resend: previše zahtjeva, pokušajte ponovno za minutu.')
  throw new Error(`Slanje e-maila nije uspjelo: ${detail}`)
}

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}
