import { AuthError } from '@supabase/supabase-js'

const AUTH_MESSAGES: Record<string, string> = {
  invalid_credentials: 'Neispravna e-mail adresa ili lozinka.',
  email_not_confirmed: 'E-mail adresa još nije potvrđena.',
  user_banned: 'Korisnički račun je blokiran.',
  over_request_rate_limit: 'Previše pokušaja. Pričekajte nekoliko minuta pa pokušajte ponovno.',
  over_email_send_rate_limit: 'Previše poslanih e-mailova. Pričekajte nekoliko minuta pa pokušajte ponovno.',
  weak_password: 'Lozinka je preslaba. Koristite barem 8 znakova.',
  same_password: 'Nova lozinka mora se razlikovati od stare.',
  session_not_found: 'Prijava je istekla. Prijavite se ponovno.',
  refresh_token_not_found: 'Prijava je istekla. Prijavite se ponovno.',
  otp_expired: 'Poveznica je istekla ili je već iskorištena. Zatražite novu.',
}

/** Postgres / PostgREST kodovi grešaka. */
const DB_MESSAGES: Record<string, string> = {
  '23505': 'Takav zapis već postoji.',
  '23514': 'Uneseni podaci nisu ispravni.',
  '23503': 'Povezani zapis više ne postoji. Osvježite stranicu.',
  '42501': 'Nemate ovlasti za ovu radnju. Prijavite se ponovno.',
  PGRST301: 'Prijava je istekla. Prijavite se ponovno.',
  PGRST303: 'Prijava je istekla. Prijavite se ponovno.',
  PGRST116: 'Zapis nije pronađen. Možda je obrisan.',
}

/** Greška čija je poruka već napisana za korisnika (na hrvatskom). */
export class UserFacingError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options)
    this.name = 'UserFacingError'
  }
}

/** Pretvara grešku (Supabase, mreža, ostalo) u poruku na hrvatskom. */
export function errorMessage(error: unknown, fallback = 'Došlo je do pogreške. Pokušajte ponovno.'): string {
  if (error instanceof UserFacingError) return error.message
  if (error instanceof AuthError) {
    if (error.code && AUTH_MESSAGES[error.code]) return AUTH_MESSAGES[error.code]
    if (error.status === 0 || /fetch/i.test(error.message)) return 'Nema veze s poslužiteljem. Provjerite internetsku vezu.'
    return fallback
  }
  if (error && typeof error === 'object') {
    const { code, message } = error as { code?: unknown; message?: unknown }
    if (typeof message === 'string' && /failed to fetch|networkerror|load failed/i.test(message)) {
      return 'Nema veze s poslužiteljem. Provjerite internetsku vezu.'
    }
    if (typeof code === 'string' && DB_MESSAGES[code]) return DB_MESSAGES[code]
  }
  return fallback
}
