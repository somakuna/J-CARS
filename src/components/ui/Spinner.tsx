import { LoaderCircle } from 'lucide-react'
import { cn } from '@/lib/cn'

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle className={cn('size-5 animate-spin', className)} aria-hidden="true" />
}

/** Prikaz preko cijelog zaslona dok se aplikacija priprema. */
export function FullScreenLoader({ label = 'Učitavanje…' }: { label?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 text-muted" role="status">
      <img src="/logo.svg" alt="" className="size-14 rounded-xl" width={56} height={56} />
      <Spinner />
      <span className="sr-only">{label}</span>
    </div>
  )
}
