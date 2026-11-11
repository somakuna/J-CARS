import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../src/types/database.js'
import { env } from './env.js'

export type AdminClient = SupabaseClient<Database>

/**
 * Supabase klijent sa secret ključem – zaobilazi RLS, zato postoji samo na poslužitelju.
 * Svaki upit ovdje mora sam filtrirati po user_id.
 */
export function createAdminClient(): AdminClient {
  return createClient<Database>(env.supabaseUrl(), env.supabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

/** Korisnik iz pristupnog tokena (Authorization: Bearer …) ili null. */
export async function userFromRequest(db: AdminClient, request: Request) {
  const header = request.headers.get('authorization') ?? ''
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : ''
  if (!token) return null
  const { data, error } = await db.auth.getUser(token)
  if (error || !data.user) return null
  return data.user
}
