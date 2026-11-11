import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { PasswordToggle } from '@/components/PasswordToggle'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { buttonClasses } from '@/components/ui/buttonClasses'
import { TextField } from '@/components/ui/Field'
import { FullScreenLoader, Spinner } from '@/components/ui/Spinner'
import { MIN_PASSWORD_LENGTH as MIN_LENGTH, useAuth } from '@/lib/authContext'
import { errorMessage } from '@/lib/errors'

/** Postavljanje nove lozinke nakon otvaranja poveznice iz e-maila. */
export function ResetPasswordPage() {
  const { session, loading, updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (loading) return <FullScreenLoader />

  if (!session) {
    return (
      <AuthLayout title="Poveznica nije valjana" description="Poveznica je istekla ili je već iskorištena.">
        <Link to="/prijava" className={buttonClasses('secondary', 'lg', 'w-full')}>
          Natrag na prijavu
        </Link>
      </AuthLayout>
    )
  }

  const tooShort = password.length > 0 && password.length < MIN_LENGTH
  const mismatch = confirm.length > 0 && confirm !== password

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (password.length < MIN_LENGTH || password !== confirm) return
    setError(null)
    setSubmitting(true)
    try {
      await updatePassword(password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(errorMessage(err))
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout title="Nova lozinka" description={`Račun: ${session.user.email ?? ''}`}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert tone="danger">{error}</Alert>}
        <TextField
          label="Nova lozinka"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          required
          minLength={MIN_LENGTH}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint={`Najmanje ${MIN_LENGTH} znakova.`}
          error={tooShort ? `Lozinka mora imati najmanje ${MIN_LENGTH} znakova.` : undefined}
          trailing={<PasswordToggle visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />}
        />
        <TextField
          label="Ponovite lozinku"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={mismatch ? 'Lozinke se ne podudaraju.' : undefined}
        />
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={submitting || password.length < MIN_LENGTH || password !== confirm}
        >
          {submitting && <Spinner className="size-4" />}
          Spremi lozinku
        </Button>
      </form>
    </AuthLayout>
  )
}
