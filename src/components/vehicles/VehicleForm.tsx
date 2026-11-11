import { useState, type FormEvent } from 'react'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { DateField } from '@/components/ui/DateField'
import { TextAreaField, TextField } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Spinner'
import { Switch } from '@/components/ui/Switch'
import { emptyToNull, numberToText, parseInteger } from '@/lib/forms'
import type { VehicleInsert, VehicleOverview } from '@/types/database'
import { formatDate, formatMileage, parseDisplayDate, toDisplayDate } from '@shared/dates'

interface FormValues {
  make: string
  model: string
  registrationNumber: string
  year: string
  mileage: string
  registrationExpiry: string
  responsiblePerson: string
  note: string
  isActive: boolean
}

type Errors = Partial<Record<keyof FormValues, string>>

interface VehicleFormProps {
  /** Postojeće vozilo kod uređivanja; prazno kod dodavanja. */
  vehicle?: VehicleOverview
  submitLabel: string
  submitting: boolean
  /** Greška sa servera; `field` označava polje uz koje se prikazuje. */
  serverError: { field?: keyof FormValues; message: string } | null
  onSubmit: (values: Partial<VehicleInsert>) => void
  onCancel: () => void
}

const CURRENT_YEAR = new Date().getFullYear()
const PLATE_PATTERN = /^[\p{L}\d\s-]+$/u

function initialValues(vehicle?: VehicleOverview): FormValues {
  return {
    make: vehicle?.make ?? '',
    model: vehicle?.model ?? '',
    registrationNumber: vehicle?.registration_number ?? '',
    year: numberToText(vehicle?.year),
    mileage: numberToText(vehicle?.effective_mileage ?? vehicle?.current_mileage),
    registrationExpiry: toDisplayDate(vehicle?.effective_registration_expiry ?? vehicle?.registration_expiry),
    responsiblePerson: vehicle?.responsible_person ?? '',
    note: vehicle?.note ?? '',
    isActive: vehicle?.is_active ?? true,
  }
}

export function VehicleForm({ vehicle, submitLabel, submitting, serverError, onSubmit, onCancel }: VehicleFormProps) {
  const [values, setValues] = useState<FormValues>(() => initialValues(vehicle))
  const [submitted, setSubmitted] = useState(false)

  // Datum isteka koji dolazi iz aktivnosti registracije mijenja se samo kroz aktivnosti.
  const expiryFromActivities =
    vehicle !== undefined && vehicle.effective_registration_expiry !== vehicle.registration_expiry
  // Kilometraža zabilježena u aktivnostima – ručni unos ne smije biti manji.
  const activityMileage =
    vehicle?.effective_mileage != null && vehicle.effective_mileage > (vehicle.current_mileage ?? -1)
      ? vehicle.effective_mileage
      : null

  function validate(v: FormValues): Errors {
    const errors: Errors = {}
    if (!v.make.trim()) errors.make = 'Unesite marku vozila.'
    else if (v.make.trim().length > 60) errors.make = 'Najviše 60 znakova.'
    if (!v.model.trim()) errors.model = 'Unesite model vozila.'
    else if (v.model.trim().length > 60) errors.model = 'Najviše 60 znakova.'

    const plate = v.registrationNumber.trim()
    if (!plate) errors.registrationNumber = 'Unesite registracijsku oznaku.'
    else if (plate.length < 2 || plate.length > 20) errors.registrationNumber = 'Oznaka mora imati od 2 do 20 znakova.'
    else if (!PLATE_PATTERN.test(plate)) errors.registrationNumber = 'Dopuštena su slova, brojevi, razmak i crtica.'

    const year = parseInteger(v.year)
    if (year === 'invalid' || (year !== null && (year < 1950 || year > CURRENT_YEAR + 1))) {
      errors.year = `Unesite godinu između 1950. i ${CURRENT_YEAR + 1}.`
    }

    const mileage = parseInteger(v.mileage)
    if (mileage === 'invalid') errors.mileage = 'Unesite kilometražu kao cijeli broj.'
    else if (mileage !== null && mileage > 9_999_999) errors.mileage = 'Kilometraža je prevelika.'
    else if (mileage !== null && activityMileage !== null && mileage < activityMileage) {
      errors.mileage = `Ne može biti manja od ${formatMileage(activityMileage)} zabilježenih u aktivnostima.`
    }

    if (!expiryFromActivities) {
      if (!v.registrationExpiry.trim()) errors.registrationExpiry = 'Unesite datum isteka registracije.'
      else if (!parseDisplayDate(v.registrationExpiry)) errors.registrationExpiry = 'Unesite ispravan datum u obliku DD.MM.GGGG.'
    }

    if (v.responsiblePerson.trim().length > 100) errors.responsiblePerson = 'Najviše 100 znakova.'
    if (v.note.length > 2000) errors.note = 'Najviše 2000 znakova.'
    return errors
  }

  const errors = submitted ? validate(values) : {}
  const fieldError = (field: keyof FormValues) =>
    errors[field] ?? (serverError?.field === field ? serverError.message : undefined)

  function set<K extends keyof FormValues>(key: K, value: FormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    setSubmitted(true)
    const found = validate(values)
    if (Object.keys(found).length > 0) {
      // Fokus na prvo neispravno polje (nakon što se prikažu poruke).
      requestAnimationFrame(() => form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }

    const year = parseInteger(values.year) as number | null
    const mileage = parseInteger(values.mileage) as number | null

    const payload: Partial<VehicleInsert> = {
      make: values.make.trim(),
      model: values.model.trim(),
      registration_number: values.registrationNumber.trim(),
      year,
      responsible_person: emptyToNull(values.responsiblePerson),
      note: emptyToNull(values.note),
      is_active: values.isActive,
    }

    // Kilometraža iz aktivnosti ostaje netaknuta ako je korisnik nije promijenio.
    if (!(activityMileage !== null && mileage === activityMileage)) payload.current_mileage = mileage
    if (!expiryFromActivities) payload.registration_expiry = parseDisplayDate(values.registrationExpiry)!

    onSubmit(payload)
  }

  const isEdit = vehicle !== undefined

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {serverError && !serverError.field && <Alert tone="danger">{serverError.message}</Alert>}

      <Card className="space-y-4 p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Marka"
            required
            autoFocus={!isEdit}
            value={values.make}
            onChange={(e) => set('make', e.target.value)}
            error={fieldError('make')}
            placeholder="npr. Škoda"
            autoCapitalize="words"
          />
          <TextField
            label="Model"
            required
            value={values.model}
            onChange={(e) => set('model', e.target.value)}
            error={fieldError('model')}
            placeholder="npr. Octavia"
          />
          <TextField
            label="Registracijska oznaka"
            required
            value={values.registrationNumber}
            onChange={(e) => set('registrationNumber', e.target.value.toUpperCase())}
            error={fieldError('registrationNumber')}
            placeholder="npr. ZG 1234-AB"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
          />
          <DateField
            label="Datum isteka registracije"
            required={!expiryFromActivities}
            value={values.registrationExpiry}
            onChange={(text) => set('registrationExpiry', text)}
            error={fieldError('registrationExpiry')}
            disabled={expiryFromActivities}
            hint={
              expiryFromActivities
                ? `Vrijedi do ${formatDate(vehicle.effective_registration_expiry)} prema zadnjoj registraciji. Mijenja se kroz aktivnost registracije.`
                : undefined
            }
          />
          <TextField
            label="Godina proizvodnje"
            inputMode="numeric"
            value={values.year}
            onChange={(e) => set('year', e.target.value)}
            error={fieldError('year')}
            placeholder={`npr. ${CURRENT_YEAR - 3}`}
            maxLength={4}
          />
          <TextField
            label="Trenutna kilometraža (km)"
            inputMode="numeric"
            value={values.mileage}
            onChange={(e) => set('mileage', e.target.value)}
            error={fieldError('mileage')}
            placeholder="npr. 125000"
            hint={activityMileage !== null ? `Zadnja zabilježena: ${formatMileage(activityMileage)}.` : undefined}
          />
        </div>

        <TextField
          label="Zadužena osoba / vozač"
          value={values.responsiblePerson}
          onChange={(e) => set('responsiblePerson', e.target.value)}
          error={fieldError('responsiblePerson')}
          placeholder="Ime i prezime"
          autoCapitalize="words"
        />
        <TextAreaField
          label="Napomena"
          value={values.note}
          onChange={(e) => set('note', e.target.value)}
          error={fieldError('note')}
          rows={3}
        />

        {isEdit && (
          <Switch
            label="Aktivno vozilo"
            description="Neaktivna vozila ostaju u evidenciji, ali se ne prate rokovi i ne šalju podsjetnici."
            checked={values.isActive}
            onChange={(checked) => set('isActive', checked)}
            className="border-t border-border pt-4"
          />
        )}
      </Card>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" size="lg" onClick={onCancel} disabled={submitting}>
          Odustani
        </Button>
        <Button type="submit" size="lg" disabled={submitting}>
          {submitting && <Spinner className="size-4" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
