import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router'
import { cn } from '@/lib/cn'
import type { BadgeTone } from './StatusBadge'

const iconTones: Record<BadgeTone, string> = {
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
  neutral: 'bg-surface-2 text-fg',
}

interface StatCardProps {
  icon: LucideIcon
  label: string
  value: string | number
  tone?: BadgeTone
  /** Ako je zadano, kartica vodi na detalje. */
  to?: string
}

export function StatCard({ icon: Icon, label, value, tone = 'neutral', to }: StatCardProps) {
  const content = (
    <>
      <div className={cn('flex size-10 items-center justify-center rounded-xl', iconTones[tone])}>
        <Icon className="size-5" aria-hidden="true" />
      </div>
      <div className="mt-3 text-2xl font-semibold tabular-nums">{value}</div>
      <div className="mt-0.5 text-sm leading-snug text-muted">{label}</div>
    </>
  )

  const base = 'block rounded-2xl border border-border bg-surface p-4'

  if (to) {
    return (
      <Link to={to} className={cn(base, 'transition-colors hover:border-muted/40 hover:bg-surface-2/50')}>
        {content}
      </Link>
    )
  }
  return <div className={base}>{content}</div>
}
