import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { PasswordToggle } from '@/components/PasswordToggle'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Spinner'
import { useAuth } from '@/lib/authContext'
import { errorMessage } from '@/lib/errors'

type Mode = 'login' | 'reset'

export function LoginPage() {
  const { session, signIn, sendPasswordReset } = useAuth()
  const location = useLocation()
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)

  if (session) {
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate to={from && from !== '/prijava' ? from : '/'} replace />
  }

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
    setResetSent(false)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (mode === 'login') {
        await signIn(email, password)
      } else {
        await sendPasswordReset(email)
        setResetSent(true)
      }
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (mode === 'reset') {
    return (
      <AuthLayout title="Zaboravljena lozinka" description="Poslat ćemo vam poveznicu za postavljanje nove lozinke.">
        {resetSent ? (
          <Alert tone="ok">
            Ako adresa pripada administratoru, poveznica je poslana na <strong>{email.trim()}</strong>. Provjerite i
            mapu neželjene pošte.
          </Alert>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <Alert tone="danger">{error}</Alert>}
            <TextField
              label="E-mail adresa"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting && <Spinner className="size-4" />}
              Pošalji poveznicu
            </Button>
          </form>
        )}
        <button
          type="button"
          onClick={() => switchMode('login')}
          className="mt-4 w-full text-center text-sm text-muted hover:text-fg"
        >
          Natrag na prijavu
        </button>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Prijava" description="Prijavite se administratorskim računom.">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert tone="danger">{error}</Alert>}
        <TextField
          label="E-mail adresa"
          type="email"
          autoComplete="username"
          inputMode="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          label="Lozinka"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          trailing={<PasswordToggle visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />}
        />
        <Button type="submit" size="lg" className="w-full" disabled={submitting}>
          {submitting && <Spinner className="size-4" />}
          Prijavi se
        </Button>
      </form>
      <button
        type="button"
        onClick={() => switchMode('reset')}
        className="mt-4 w-full text-center text-sm text-muted hover:text-fg"
      >
        Zaboravili ste lozinku?
      </button>
    </AuthLayout>
  )
}
