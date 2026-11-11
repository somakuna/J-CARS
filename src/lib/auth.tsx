import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AuthContext } from './authContext'
import { disablePushOnDevice } from './push'
import { supabase } from './supabase'

export const PASSWORD_RESET_PATH = '/nova-lozinka'

/** Prati prijavu korisnika (Supabase Auth). Sesija se pamti na uređaju. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [passwordRecovery, setPasswordRecovery] = useState(false)
  const queryClient = useQueryClient()

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      setLoading(false)
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true)
      if (event === 'SIGNED_OUT') {
        setPasswordRecovery(false)
        // Podaci prethodne prijave ne smiju ostati u memoriji.
        queryClient.clear()
      }
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [queryClient])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    // Nakon odjave ovaj uređaj ne smije primati tuđe podsjetnike (npr. kad se prijavi drugi korisnik).
    await disablePushOnDevice().catch(() => undefined)
    // 'local' odjavljuje samo ovaj uređaj; ostali ostaju prijavljeni.
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    if (error) throw error
  }, [])

  const sendPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}${PASSWORD_RESET_PATH}`,
    })
    if (error) throw error
  }, [])

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password })
    if (error) throw error
    setPasswordRecovery(false)
  }, [])

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      passwordRecovery,
      signIn,
      signOut,
      sendPasswordReset,
      updatePassword,
    }),
    [session, loading, passwordRecovery, signIn, signOut, sendPasswordReset, updatePassword],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
