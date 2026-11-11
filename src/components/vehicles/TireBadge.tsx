import { cn } from '@/lib/cn'
import { TIRE_TYPES } from '@/lib/labels'
import type { TireType } from '@/types/database'

const tones: Record<TireType, string> = {
  summer: 'bg-warn-soft text-warn',
  winter: 'bg-info-soft text-info',
  all_season: 'bg-ok-soft text-ok',
}

/** Trenutna vrsta guma; „Nije evidentirano” ako još nema promjene guma. */
export function TireBadge({ type, className }: { type: TireType | null; className?: string }) {
  if (!type) {
    return (
      <span className={cn('inline-flex items-center rounded-full bg-surface-2 px-2.5 py-1 text-xs text-muted', className)}>
        Gume nisu evidentirane
      </span>
    )
  }
  const { label, icon: Icon } = TIRE_TYPES[type]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap',
        tones[type],
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {label}
    </span>
  )
}
