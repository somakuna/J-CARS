import { ConfigError } from '../_lib/env.js'
import { sendTestNotification, testCooldown } from '../_lib/notify.js'
import { createAdminClient, userFromRequest } from '../_lib/supabaseAdmin.js'

/**
 * Probna push obavijest za prijavljenog korisnika: POST
 * s „Authorization: Bearer <Supabase access token>”.
 */
export async function POST(request: Request): Promise<Response> {
  try {
    const db = createAdminClient()
    const user = await userFromRequest(db, request)
    if (!user) return Response.json({ error: 'Prijava je istekla. Prijavite se ponovno.' }, { status: 401 })

    const wait = await testCooldown(db, user.id)
    if (wait > 0) {
      return Response.json(
        { error: `Probna obavijest je upravo poslana. Pričekajte još ${wait} s.` },
        { status: 429, headers: { 'Retry-After': String(wait) } },
      )
    }

    const message = await sendTestNotification(db, user)
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
