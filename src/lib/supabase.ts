import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

/** false ako u .env.local (ili na Vercelu) nedostaju Supabase varijable. */
export const isSupabaseConfigured = Boolean(url && key)

/**
 * Supabase klijent za preglednik. Koristi javni (publishable) ključ –
 * pristup podacima ograničavaju RLS pravila u bazi.
 */
export const supabase = createClient<Database>(url ?? 'http://localhost', key ?? 'missing-key', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
