import { CalendarDays } from 'lucide-react'
import { useId } from 'react'
import { cn } from '@/lib/cn'
import { parseDisplayDate, toDisplayDate } from '@shared/dates'
import { FieldShell, type FieldProps } from './Field'
import { fieldAria, inputClasses } from './fieldUtils'

interface DateFieldProps extends FieldProps {
  /** Tekst u obliku DD.MM.GGGG (može biti nepotpun dok korisnik tipka). */
  value: string
  onChange: (text: string) => void
  onBlur?: () => void
  disabled?: boolean
  className?: string
  autoFocus?: boolean
}

/** Znamenke → DD.MM.GGGG; točke se umeću automatski dok korisnik tipka. */
function maskDate(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 8)
  let out = digits.slice(0, 2)
  if (digits.length > 2) out += `.${digits.slice(2, 4)}`
  if (digits.length > 4) out += `.${digits.slice(4, 8)}`
  return out
}

/**
 * Polje za datum u hrvatskom obliku DD.MM.GGGG.
 * Datum se može utipkati ili odabrati iz kalendara uređaja (gumb desno).
 * Ne koristi se samo <input type="date"> jer on prikazuje format jezika preglednika.
 */
export function DateField({ label, error, hint, required, value, onChange, onBlur, disabled, className, autoFocus }: DateFieldProps) {
  const inputId = useId()
  const iso = parseDisplayDate(value) ?? ''

  return (
    <FieldShell label={label} error={error} hint={hint} required={required} inputId={inputId} className={className}>
      <div className="relative">
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="DD.MM.GGGG"
          maxLength={10}
          value={value}
          disabled={disabled}
          required={required}
          autoFocus={autoFocus}
          onChange={(e) => onChange(maskDate(e.target.value))}
          onBlur={onBlur}
          {...fieldAria(inputId, error, hint)}
          className={cn(inputClasses, 'pr-12 tabular-nums')}
        />
        {!disabled && (
          <div className="absolute inset-y-0 right-1 flex items-center">
            <div className="relative size-10">
              <span className="flex size-10 items-center justify-center rounded-lg text-muted" aria-hidden="true">
                <CalendarDays className="size-5" />
              </span>
              {/* Izvorni izbornik datuma uređaja: nevidljiv, preko ikone kalendara. */}
              <input
                type="date"
                tabIndex={-1}
                aria-hidden="true"
                value={iso}
                onChange={(e) => onChange(toDisplayDate(e.target.value))}
                onClick={(e) => {
                  try {
                    e.currentTarget.showPicker()
                  } catch {
                    // Preglednik sam otvara izbornik ili ga ne podržava.
                  }
                }}
                className="absolute inset-0 size-full cursor-pointer opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:size-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
              />
            </div>
          </div>
        )}
      </div>
    </FieldShell>
  )
}
