import { CloudOff, RotateCw } from 'lucide-react'
import { cn } from '@/lib/cn'
import { errorMessage } from '@/lib/errors'
import { Button } from './Button'
import { EmptyState } from './EmptyState'

/** Siva ploha koja se prikazuje dok se podaci učitavaju. */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-surface-2', className)} aria-hidden="true" />
}

interface ErrorStateProps {
  error: unknown
  onRetry?: () => void
  title?: string
}

/** Poruka kad dohvat podataka ne uspije, s gumbom za ponovni pokušaj. */
export function ErrorState({ error, onRetry, title = 'Podaci se nisu mogli učitati' }: ErrorStateProps) {
  return (
    <EmptyState
      icon={CloudOff}
      title={title}
      description={errorMessage(error)}
      action={
        onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            <RotateCw className="size-4" aria-hidden="true" />
            Pokušaj ponovno
          </Button>
        )
      }
    />
  )
}
