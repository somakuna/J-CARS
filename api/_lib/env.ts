/**
 * Varijable okruženja za /api. Tajne su samo ovdje (Vercel → Settings → Environment Variables),
 * nikad s prefiksom VITE_ i nikad u pregledniku.
 */

export class ConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConfigError'
  }
}

function required(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new ConfigError(`Nije postavljena varijabla okruženja ${name}.`)
  return value
}

function optional(name: string): string | undefined {
  return process.env[name]?.trim() || undefined
}

export const env = {
  supabaseUrl: () => required('SUPABASE_URL'),
  supabaseSecretKey: () => required('SUPABASE_SECRET_KEY'),
  resendApiKey: () => required('RESEND_API_KEY'),
  emailFrom: () => optional('EMAIL_FROM') ?? 'J-CARS <onboarding@resend.dev>',
  vapid: () => ({
    publicKey: required('VAPID_PUBLIC_KEY'),
    privateKey: required('VAPID_PRIVATE_KEY'),
    subject: required('VAPID_SUBJECT'),
  }),
  cronSecret: () => required('CRON_SECRET'),
  /** Adresa aplikacije za poveznice u obavijestima. */
  appUrl: () => (optional('APP_URL') ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:5173')).replace(/\/$/, ''),
}
