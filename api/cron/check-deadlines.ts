import { todayISO } from '../../shared/dates.js'
import { ConfigError, env } from '../_lib/env.js'
import { runDailyCheck } from '../_lib/notify.js'
import { createAdminClient } from '../_lib/supabaseAdmin.js'

/**
 * Dnevna provjera rokova – pokreće je Vercel Cron (vercel.json → crons).
 * Vercel šalje „Authorization: Bearer <CRON_SECRET>”; bez toga se zahtjev odbija.
 * Ručno pokretanje: curl -H "Authorization: Bearer $CRON_SECRET" https://…/api/cron/check-deadlines
 */
export async function GET(request: Request): Promise<Response> {
  try {
    if (request.headers.get('authorization') !== `Bearer ${env.cronSecret()}`) {
      return Response.json({ error: 'Neovlašten pristup.' }, { status: 401 })
    }
    const today = todayISO()
    const results = await runDailyCheck(createAdminClient(), today)
    const failed = results.filter((r) => r.error)
    console.log(`[cron] ${today}: korisnika ${results.length}, s greškom ${failed.length}`, JSON.stringify(results))
    return Response.json({ today, users: results.length, results }, { status: failed.length > 0 ? 207 : 200 })
  } catch (error) {
    console.error('[cron] provjera nije uspjela', error)
    const status = error instanceof ConfigError ? 500 : 502
    return Response.json({ error: error instanceof Error ? error.message : 'Provjera nije uspjela.' }, { status })
  }
}
