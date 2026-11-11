import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Alert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ChoiceGroup } from '@/components/ui/ChoiceGroup'
import { DateField } from '@/components/ui/DateField'
import { TextAreaField, TextField } from '@/components/ui/Field'
import { Spinner } from '@/components/ui/Spinner'
import { Switch } from '@/components/ui/Switch'
import type { ActivityFields } from '@/data/activities'
import {
  canHaveReminder,
  initialActivityValues,
  toActivityFields,
  updateActivityValues,
  validateActivity,
  type ActivityFormValues,
} from '@/lib/activityForm'
import { SERVICE_TYPES, TIRE_TYPES } from '@/lib/labels'
import type { Activity, ActivityType, ServiceType, TireType, VehicleOverview } from '@/types/database'
import { addYears, formatMileage, parseDisplayDate, todayISO, toDisplayDate } from '@shared/dates'

const TIRE_OPTIONS = (Object.keys(TIRE_TYPES) as TireType[]).map((value) => ({
  value,
  label: TIRE_TYPES[value].label,
  icon: TIRE_TYPES[value].icon,
}))

const SERVICE_OPTIONS = (Object.keys(SERVICE_TYPES) as ServiceType[]).map((value) => ({
  value,
  label: SERVICE_TYPES[value],
}))

const DATE_LABELS: Record<ActivityType, string> = {
  registration: 'Datum registracije',
  tires: 'Datum promjene',
  service: 'Datum servisa',
  other: 'Datum',
}

const DESCRIPTION_LABELS: Record<ActivityType, string> = {
  registration: 'Napomena',
  tires: 'Napomena',
  service: 'Opis radova',
  other: 'Opis',
}

interface ActivityFormProps {
  type: ActivityType
  /** Vozilo – za prijedloge (trenutne gume) i zadnju kilometražu. */
  vehicle?: VehicleOverview | null
  /** Postojeća aktivnost kod uređivanja. */
  activity?: Activity
  submitLabel: string
  submitting: boolean
  serverError: string | null
  onSubmit: (fields: ActivityFields) => void
  onCancel: () => void
}

export function ActivityForm({
  type,
  vehicle,
  activity,
  submitLabel,
  submitting,
  serverError,
  onSubmit,
  onCancel,
}: ActivityFormProps) {
  const today = todayISO()
  const [values, setValues] = useState<ActivityFormValues>(() => initialActivityValues(type, today, vehicle, activity))
  const [submitted, setSubmitted] = useState(false)
  const serverErrorRef = useRef<HTMLDivElement>(null)

  // Na mobitelu je gumb za spremanje na dnu – greška sa servera mora biti vidljiva.
  useEffect(() => {
    if (serverError) serverErrorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [serverError])

  const errors = submitted ? validateActivity(type, values, today) : {}

  function set<K extends keyof ActivityFormValues>(key: K, value: ActivityFormValues[K]) {
    setValues((current) => updateActivityValues(type, current, key, value))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    setSubmitted(true)
    if (Object.keys(validateActivity(type, values, today)).length > 0) {
      requestAnimationFrame(() => form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }
    onSubmit(toActivityFields(type, values, today))
  }

  const lastMileage = vehicle?.effective_mileage
  const mileageHint = lastMileage != null ? `Zadnja zabilježena: ${formatMileage(lastMileage)}.` : undefined
  const activityDate = parseDisplayDate(values.date)

  const dateField = (
    <DateField
      label={DATE_LABELS[type]}
      required
      value={values.date}
      onChange={(text) => set('date', text)}
      error={errors.date}
    />
  )

  const mileageField = (
    <TextField
      label={type === 'service' ? 'Kilometraža (km)' : 'Kilometraža (km, neobavezno)'}
      required={type === 'service'}
      inputMode="numeric"
      autoComplete="off"
      value={values.mileage}
      onChange={(e) => set('mileage', e.target.value)}
      error={errors.mileage}
      placeholder="npr. 125000"
      hint={mileageHint}
    />
  )

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {serverError && (
        <div ref={serverErrorRef}>
          <Alert tone="danger">{serverError}</Alert>
        </div>
      )}

      <Card className="space-y-4 p-4 sm:p-5">
        {type === 'registration' && (
          <div className="grid gap-4 sm:grid-cols-2">
            {dateField}
            <DateField
              label="Datum isteka registracije"
              required
              value={values.registrationExpiry}
              onChange={(text) => set('registrationExpiry', text)}
              error={errors.registrationExpiry}
              hint="Registracija obično vrijedi godinu dana."
            />
          </div>
        )}

        {type === 'tires' && (
          <>
            <ChoiceGroup
              label="Vrsta guma"
              required
              options={TIRE_OPTIONS}
              value={values.tireType}
              onChange={(value) => set('tireType', value)}
              error={errors.tireType}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              {dateField}
              {mileageField}
            </div>
            <TextField
              label="Dimenzija guma (neobavezno)"
              value={values.tireSize}
              onChange={(e) => set('tireSize', e.target.value.toUpperCase())}
              error={errors.tireSize}
              placeholder="npr. 205/55 R16"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
            />
          </>
        )}

        {type === 'service' && (
          <>
            <ChoiceGroup
              label="Vrsta servisa"
              required
              columns={4}
              options={SERVICE_OPTIONS}
              value={values.serviceType}
              onChange={(value) => set('serviceType', value)}
              error={errors.serviceType}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              {dateField}
              {mileageField}
            </div>
          </>
        )}

        {type === 'other' && (
          <>
            <TextField
              label="Naslov"
              required
              value={values.title}
              onChange={(e) => set('title', e.target.value)}
              error={errors.title}
              placeholder="npr. Tehnički pregled, pranje, kazna…"
              maxLength={120}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              {dateField}
              {mileageField}
            </div>
          </>
        )}

        <TextAreaField
          label={`${DESCRIPTION_LABELS[type]} (neobavezno)`}
          value={values.description}
          onChange={(e) => set('description', e.target.value)}
          error={errors.description}
          rows={type === 'service' ? 4 : 3}
          placeholder={type === 'service' ? 'npr. zamjena ulja i filtera, kočione pločice…' : undefined}
        />

        {type === 'service' && (
          <div className="space-y-4 border-t border-border pt-4">
            <div>
              <h3 className="text-sm font-semibold">Sljedeći servis (neobavezno)</h3>
              <p className="mt-0.5 text-sm text-muted">Po datumu, po kilometraži ili oboje – što prije nastupi.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <DateField
                label="Po datumu"
                value={values.nextServiceDate}
                onChange={(text) => set('nextServiceDate', text)}
                error={errors.nextServiceDate}
                hint={
                  activityDate && !values.nextServiceDate ? (
                    <button
                      type="button"
                      onClick={() => set('nextServiceDate', toDisplayDate(addYears(activityDate, 1)))}
                      className="font-medium text-fg underline underline-offset-2"
                    >
                      Za godinu dana
                    </button>
                  ) : undefined
                }
              />
              <TextField
                label="Po kilometraži (km)"
                inputMode="numeric"
                autoComplete="off"
                value={values.nextServiceMileage}
                onChange={(e) => set('nextServiceMileage', e.target.value)}
                error={errors.nextServiceMileage}
                placeholder="npr. 140000"
              />
            </div>
          </div>
        )}

        {type === 'other' && canHaveReminder(type, values.date, today) && (
          <Switch
            label="Podsjetnik"
            description="Obavijest prije ovog datuma, prema postavkama obavijesti."
            checked={values.reminderEnabled}
            onChange={(checked) => set('reminderEnabled', checked)}
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
