import { cn } from '@/lib/cn'

interface LogoProps {
  /** Prikaži i tekst „J-CARS” uz znak. */
  withText?: boolean
  className?: string
}

export function Logo({ withText = true, className }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <img src="/logo.svg" alt={withText ? '' : 'J-CARS'} className="size-9 rounded-lg" width={36} height={36} />
      {withText && (
        <span className="leading-tight">
          <span className="block text-base font-bold tracking-tight">J-CARS</span>
          <span className="block text-xs text-muted">Službena vozila</span>
        </span>
      )}
    </span>
  )
}
