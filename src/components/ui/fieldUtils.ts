import type { ReactNode } from 'react'

export const inputClasses =
  'block w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-base text-fg placeholder:text-muted/70 ' +
  'transition-colors focus:border-brand-strong focus:outline-none focus:ring-2 focus:ring-brand/40 ' +
  'disabled:bg-surface-2 disabled:text-muted aria-invalid:border-danger sm:text-sm'

/** aria atributi koji povezuju polje s porukom greške ili pomoćnim tekstom. */
export function fieldAria(inputId: string, error?: string, hint?: ReactNode) {
  return {
    'aria-invalid': error ? true : undefined,
    'aria-describedby': error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined,
  } as const
}
