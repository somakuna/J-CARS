import type { LucideIcon } from 'lucide-react'
import { useId } from 'react'
import { cn } from '@/lib/cn'

interface ChoiceOption<T extends string> {
  value: T
  label: string
  icon?: LucideIcon
}

interface ChoiceGroupProps<T extends string> {
  label: string
  options: Array<ChoiceOption<T>>
  value: T | null
  onChange: (value: T) => void
  error?: string
  required?: boolean
  className?: string
  /** Broj stupaca na širim zaslonima (na mobitelu najviše 2). */
  columns?: 2 | 3 | 4
}

const columnClasses = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-2 sm:grid-cols-4' }

/** Izbor jedne od nekoliko opcija – pravi radio gumbi, pa strelice na tipkovnici rade same. */
export function ChoiceGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  error,
  required,
  className,
  columns = 3,
}: ChoiceGroupProps<T>) {
  const name = useId()
  const errorId = `${name}-error`

  return (
    <fieldset className={className} aria-describedby={error ? errorId : undefined}>
      <legend className="mb-1.5 text-sm font-medium">
        {label}
        {required && (
          <span className="text-danger" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </legend>
      <div className={cn('grid gap-2', columnClasses[columns])}>
        {options.map(({ value: optionValue, label: optionLabel, icon: Icon }) => {
          const checked = value === optionValue
          return (
            <label
              key={optionValue}
              className={cn(
                'relative flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-xl border px-2 py-3 text-center text-sm transition-colors',
                'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand/60',
                checked
                  ? 'border-brand bg-brand/15 font-semibold text-fg'
                  : error
                    ? 'border-danger text-muted hover:bg-surface-2'
                    : 'border-border text-muted hover:bg-surface-2',
              )}
            >
              <input
                type="radio"
                name={name}
                value={optionValue}
                checked={checked}
                onChange={() => onChange(optionValue)}
                aria-invalid={error ? true : undefined}
                className="sr-only"
              />
              {Icon && <Icon className="size-5 shrink-0" aria-hidden="true" />}
              <span className="max-w-full break-words">{optionLabel}</span>
            </label>
          )
        })}
      </div>
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      )}
    </fieldset>
  )
}
