import { CircleAlert, CircleCheck, Info } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

type AlertTone = 'danger' | 'ok' | 'info'

const styles: Record<AlertTone, { box: string; icon: string; Icon: typeof Info }> = {
  danger: { box: 'border-danger/25 bg-danger-soft', icon: 'text-danger', Icon: CircleAlert },
  ok: { box: 'border-ok/25 bg-ok-soft', icon: 'text-ok', Icon: CircleCheck },
  info: { box: 'border-info/25 bg-info-soft', icon: 'text-info', Icon: Info },
}

interface AlertProps {
  tone: AlertTone
  children: ReactNode
  className?: string
}

export function Alert({ tone, children, className }: AlertProps) {
  const { box, icon, Icon } = styles[tone]
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-xl border px-3.5 py-3 text-sm', box, className)}
    >
      <Icon className={cn('mt-0.5 size-4 shrink-0', icon)} aria-hidden="true" />
      <div className="min-w-0">{children}</div>
    </div>
  )
}
