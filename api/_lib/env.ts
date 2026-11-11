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

export const env = {
  supabaseUrl: () => required('SUPABASE_URL'),
  supabaseSecretKey: () => required('SUPABASE_SECRET_KEY'),
  vapid: () => ({
    publicKey: required('VAPID_PUBLIC_KEY'),
    privateKey: required('VAPID_PRIVATE_KEY'),
    subject: required('VAPID_SUBJECT'),
  }),
  cronSecret: () => required('CRON_SECRET'),
}
