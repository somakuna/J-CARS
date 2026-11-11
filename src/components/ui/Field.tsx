import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react'
import { cn } from '@/lib/cn'
import { fieldAria, inputClasses } from './fieldUtils'

export interface FieldProps {
  label: string
  /** Poruka greške ispod polja. */
  error?: string
  /** Pomoćni tekst ispod polja. */
  hint?: ReactNode
  required?: boolean
}

interface FieldShellProps extends FieldProps {
  inputId: string
  className?: string
  children: ReactNode
}

/** Oznaka, polje, pomoćni tekst i poruka greške – zajedničko svim poljima. */
export function FieldShell({ label, error, hint, required, inputId, className, children }: FieldShellProps) {
  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium">
        {label}
        {required && (
          <span className="text-danger" aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>
      {children}
      {error ? (
        <p id={`${inputId}-error`} className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="mt-1.5 text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

type TextFieldProps = FieldProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'required'> & {
    /** Element desno od polja (npr. gumb za prikaz lozinke). */
    trailing?: ReactNode
  }

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, hint, required, trailing, className, id, ...props },
  ref,
) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  return (
    <FieldShell label={label} error={error} hint={hint} required={required} inputId={inputId} className={className}>
      <div className="relative">
        <input
          ref={ref}
          id={inputId}
          required={required}
          {...fieldAria(inputId, error, hint)}
          className={cn(inputClasses, trailing ? 'pr-12' : undefined)}
          {...props}
        />
        {trailing && <div className="absolute inset-y-0 right-1 flex items-center">{trailing}</div>}
      </div>
    </FieldShell>
  )
})

type TextAreaFieldProps = FieldProps & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'required'>

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(function TextAreaField(
  { label, error, hint, required, className, id, rows = 3, ...props },
  ref,
) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  return (
    <FieldShell label={label} error={error} hint={hint} required={required} inputId={inputId} className={className}>
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        required={required}
        {...fieldAria(inputId, error, hint)}
        className={cn(inputClasses, 'resize-y')}
        {...props}
      />
    </FieldShell>
  )
})
