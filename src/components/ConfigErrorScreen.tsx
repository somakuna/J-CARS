import { AuthLayout } from '@/components/layout/AuthLayout'
import { Alert } from '@/components/ui/Alert'

/** Prikazuje se ako nedostaju Supabase varijable okruženja. */
export function ConfigErrorScreen() {
  return (
    <AuthLayout title="Aplikacija nije konfigurirana">
      <Alert tone="danger">
        Nedostaju varijable <code className="font-mono text-xs">VITE_SUPABASE_URL</code> i{' '}
        <code className="font-mono text-xs">VITE_SUPABASE_PUBLISHABLE_KEY</code>. Dodajte ih u{' '}
        <code className="font-mono text-xs">.env.local</code> (lokalno) ili u postavke projekta na Vercelu.
      </Alert>
    </AuthLayout>
  )
}
