import { ConfigError } from '../_lib/env.js'
import { sendTestNotification } from '../_lib/notify.js'
import { createAdminClient, userFromRequest } from '../_lib/supabaseAdmin.js'

/**
 * Probna obavijest za prijavljenog korisnika: POST { "channel": "email" | "push" }
 * s „Authorization: Bearer <Supabase access token>”.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const db = createAdminClient()
    const user = await userFromRequest(db, request)
    if (!user) return Response.json({ error: 'Prijava je istekla. Prijavite se ponovno.' }, { status: 401 })

    const body = (await request.json().catch(() => null)) as { channel?: unknown } | null
    const channel = body?.channel
    if (channel !== 'email' && channel !== 'push') {
      return Response.json({ error: 'Neispravan zahtjev.' }, { status: 400 })
    }

    const message = await sendTestNotification(db, user, channel)
    return Response.json({ message })
  } catch (error) {
    console.error('[test] slanje nije uspjelo', error)
    if (error instanceof ConfigError) {
      return Response.json({ error: `Poslužitelj nije podešen: ${error.message}` }, { status: 500 })
    }
    return Response.json(
      { error: error instanceof Error ? error.message : 'Slanje nije uspjelo. Pokušajte ponovno.' },
      { status: 502 },
    )
  }
}
