import type { ActivityFields } from '@/data/activities'
import type { Activity, ActivityType, ServiceType, TireType, VehicleOverview } from '@/types/database'
import { addYears, formatMileage, parseDisplayDate, toDisplayDate, type ISODate } from '@shared/dates'
import { emptyToNull, numberToText, parseInteger } from './forms'

export interface ActivityFormValues {
  date: string
  registrationExpiry: string
  tireType: TireType | null
  tireSize: string
  serviceType: ServiceType | null
  mileage: string
  nextServiceDate: string
  nextServiceMileage: string
  title: string
  description: string
  reminderEnabled: boolean
}

export type ActivityFormErrors = Partial<Record<keyof ActivityFormValues, string>>

const MAX_MILEAGE = 9_999_999
/** Zaštita od tipfelera (npr. 2072. umjesto 2027.). */
const MAX_REGISTRATION_YEARS = 3

/** Nakon zimskih slijede ljetne i obratno. */
const NEXT_TIRES: Partial<Record<TireType, TireType>> = { winter: 'summer', summer: 'winter' }

/** Datum isteka koji se predlaže za datum registracije: godinu dana kasnije. */
export function suggestedExpiry(dateText: string): string {
  const date = parseDisplayDate(dateText)
  return date ? toDisplayDate(addYears(date, 1)) : ''
}

export function initialActivityValues(
  type: ActivityType,
  today: ISODate,
  vehicle?: Pick<VehicleOverview, 'current_tire_type' | 'current_tire_size'> | null,
  activity?: Activity,
): ActivityFormValues {
  if (activity) {
    return {
      date: toDisplayDate(activity.activity_date),
      registrationExpiry: toDisplayDate(activity.registration_expiry),
      tireType: activity.tire_type,
      tireSize: activity.tire_size ?? '',
      serviceType: activity.service_type,
      mileage: numberToText(activity.mileage),
      nextServiceDate: toDisplayDate(activity.next_service_date),
      nextServiceMileage: numberToText(activity.next_service_mileage),
      title: activity.title ?? '',
      description: activity.description ?? '',
      reminderEnabled: activity.reminder_enabled,
    }
  }

  const date = toDisplayDate(today)
  return {
    date,
    // Registracija obično vrijedi godinu dana – prijedlog koji korisnik može promijeniti.
    registrationExpiry: type === 'registration' ? suggestedExpiry(date) : '',
    tireType: type === 'tires' && vehicle?.current_tire_type ? (NEXT_TIRES[vehicle.current_tire_type] ?? null) : null,
    tireSize: type === 'tires' ? (vehicle?.current_tire_size ?? '') : '',
    serviceType: null,
    mileage: '',
    nextServiceDate: '',
    nextServiceMileage: '',
    title: '',
    description: '',
    reminderEnabled: false,
  }
}

/**
 * Promjena jednog polja. Ako korisnik promijeni datum registracije, a istek je
 * još predloženi (datum + 1 godina), istek se pomiče zajedno s datumom.
 */
export function updateActivityValues<K extends keyof ActivityFormValues>(
  type: ActivityType,
  values: ActivityFormValues,
  key: K,
  value: ActivityFormValues[K],
): ActivityFormValues {
  const next = { ...values, [key]: value }
  if (
    type === 'registration' &&
    key === 'date' &&
    (values.registrationExpiry === '' || values.registrationExpiry === suggestedExpiry(values.date))
  ) {
    const suggestion = suggestedExpiry(value as string)
    if (suggestion) next.registrationExpiry = suggestion
  }
  return next
}

/** Je li za ovu vrstu i datum moguće uključiti podsjetnik (samo „Ostalo”, danas ili kasnije). */
export function canHaveReminder(type: ActivityType, dateText: string, today: ISODate): boolean {
  const date = parseDisplayDate(dateText)
  return type === 'other' && date !== null && date >= today
}

function mileageError(text: string, required: boolean): string | undefined {
  const value = parseInteger(text)
  if (value === null) return required ? 'Unesite kilometražu.' : undefined
  if (value === 'invalid') return 'Unesite kilometražu kao cijeli broj.'
  if (value > MAX_MILEAGE) return 'Kilometraža je prevelika.'
  return undefined
}

export function validateActivity(type: ActivityType, v: ActivityFormValues, today: ISODate): ActivityFormErrors {
  const errors: ActivityFormErrors = {}

  const date = parseDisplayDate(v.date)
  if (!v.date.trim()) errors.date = 'Unesite datum.'
  else if (!date) errors.date = 'Unesite ispravan datum u obliku DD.MM.GGGG.'
  else if (type !== 'other' && date > today) errors.date = 'Datum ne može biti u budućnosti.'

  if (type === 'registration') {
    const expiry = parseDisplayDate(v.registrationExpiry)
    if (!v.registrationExpiry.trim()) errors.registrationExpiry = 'Unesite datum isteka registracije.'
    else if (!expiry) errors.registrationExpiry = 'Unesite ispravan datum u obliku DD.MM.GGGG.'
    else if (date && expiry <= date) errors.registrationExpiry = 'Datum isteka mora biti nakon datuma registracije.'
    else if (date && expiry > addYears(date, MAX_REGISTRATION_YEARS)) {
      errors.registrationExpiry = `Provjerite datum – više je od ${MAX_REGISTRATION_YEARS} godine nakon registracije.`
    }
  }

  if (type === 'tires') {
    if (!v.tireType) errors.tireType = 'Odaberite vrstu guma.'
    if (v.tireSize.trim().length > 40) errors.tireSize = 'Najviše 40 znakova.'
  }

  if (type === 'tires' || type === 'service' || type === 'other') {
    const error = mileageError(v.mileage, type === 'service')
    if (error) errors.mileage = error
  }

  if (type === 'service') {
    if (!v.serviceType) errors.serviceType = 'Odaberite vrstu servisa.'

    if (v.nextServiceDate.trim()) {
      const next = parseDisplayDate(v.nextServiceDate)
      if (!next) errors.nextServiceDate = 'Unesite ispravan datum u obliku DD.MM.GGGG.'
      else if (date && next <= date) errors.nextServiceDate = 'Mora biti nakon datuma servisa.'
    }

    const nextKm = parseInteger(v.nextServiceMileage)
    const km = parseInteger(v.mileage)
    if (nextKm === 'invalid') errors.nextServiceMileage = 'Unesite kilometražu kao cijeli broj.'
    else if (nextKm !== null && nextKm > MAX_MILEAGE) errors.nextServiceMileage = 'Kilometraža je prevelika.'
    else if (nextKm !== null && typeof km === 'number' && nextKm <= km) {
      errors.nextServiceMileage = `Mora biti veća od ${formatMileage(km)}.`
    }
  }

  if (type === 'other') {
    if (!v.title.trim()) errors.title = 'Unesite naslov aktivnosti.'
    else if (v.title.trim().length > 120) errors.title = 'Najviše 120 znakova.'
  }

  if (v.description.length > 4000) errors.description = 'Najviše 4000 znakova.'
  return errors
}

/** Ispravne vrijednosti obrasca → zapis za bazu. Polja drugih vrsta uvijek su null. */
export function toActivityFields(type: ActivityType, v: ActivityFormValues, today: ISODate): ActivityFields {
  const date = parseDisplayDate(v.date)!
  const asNumber = (text: string) => parseInteger(text) as number | null
  return {
    activity_type: type,
    activity_date: date,
    title: type === 'other' ? v.title.trim() : null,
    description: emptyToNull(v.description),
    mileage: type === 'registration' ? null : asNumber(v.mileage),
    registration_expiry: type === 'registration' ? parseDisplayDate(v.registrationExpiry) : null,
    tire_type: type === 'tires' ? v.tireType : null,
    tire_size: type === 'tires' ? emptyToNull(v.tireSize) : null,
    service_type: type === 'service' ? v.serviceType : null,
    next_service_date: type === 'service' && v.nextServiceDate.trim() ? parseDisplayDate(v.nextServiceDate) : null,
    next_service_mileage: type === 'service' ? asNumber(v.nextServiceMileage) : null,
    reminder_enabled: v.reminderEnabled && canHaveReminder(type, v.date, today),
  }
}
