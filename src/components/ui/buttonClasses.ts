import { cn } from '@/lib/cn'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-ink hover:bg-brand-strong shadow-sm',
  secondary: 'bg-surface text-fg border border-border hover:bg-surface-2',
  ghost: 'text-fg hover:bg-surface-2',
  danger: 'bg-danger text-white hover:opacity-90 dark:text-ink',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-11 px-4 text-sm gap-2',
  lg: 'h-12 px-5 text-base gap-2',
  /** Kvadratni gumb samo s ikonom (uz aria-label). */
  icon: 'size-9 shrink-0 text-sm',
}

/** Zajednički izgled gumba – koristi se i za <Link> koji izgleda kao gumb. */
export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string) {
  return cn(
    'inline-flex items-center justify-center rounded-xl font-medium transition-colors',
    'disabled:pointer-events-none disabled:opacity-50',
    variants[variant],
    sizes[size],
    className,
  )
}
