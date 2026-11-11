import type { ReactNode } from 'react'
import type { DeadlineTone } from '@shared/status'
import { cn } from '@/lib/cn'

export type BadgeTone = DeadlineTone | 'neutral' | 'info'

const tones: Record<BadgeTone, string> = {
  ok: 'bg-ok-soft text-ok',
  warn: 'bg-warn-soft text-warn',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
  neutral: 'bg-surface-2 text-muted',
}

const dots: Record<BadgeTone, string> = {
  ok: 'bg-ok',
  warn: 'bg-warn',
  danger: 'bg-danger',
  info: 'bg-info',
  neutral: 'bg-muted',
}

interface StatusBadgeProps {
  tone: BadgeTone
  children: ReactNode
  className?: string
}

/** Oznaka statusa s točkom u boji – uvijek uz tekst, ne oslanja se samo na boju. */
export function StatusBadge({ tone, children, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium',
        tones[tone],
        className,
      )}
    >
      <span className={cn('size-1.5 rounded-full', dots[tone])} aria-hidden="true" />
      {children}
    </span>
  )
}
