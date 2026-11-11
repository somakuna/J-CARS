import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { FullScreenLoader } from '@/components/ui/Spinner'
import { PASSWORD_RESET_PATH } from '@/lib/auth'
import { useAuth } from '@/lib/authContext'

/** Propušta samo prijavljenog korisnika; ostale šalje na prijavu. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading, passwordRecovery } = useAuth()
  const location = useLocation()

  if (loading) return <FullScreenLoader />

  if (!session) {
    return <Navigate to="/prijava" replace state={{ from: location.pathname + location.search }} />
  }

  // Otvorena poveznica za novu lozinku – najprije postaviti lozinku.
  if (passwordRecovery) return <Navigate to={PASSWORD_RESET_PATH} replace />

  return children
}
