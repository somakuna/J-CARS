import { dayWord, daysUntil, todayISO, type ISODate } from './dates.js'

/**
 * Sustav boja za rokove:
 *  - ok     (zeleno)     – više od WARN_DAYS dana do roka
 *  - warn   (narančasto) – rok se približava
 *  - danger (crveno)     – rok je istekao ili je hitno (URGENT_DAYS dana ili manje)
 */
export type DeadlineTone = 'ok' | 'warn' | 'danger'

export const WARN_DAYS = 30
export const URGENT_DAYS = 7

/** Koliko km prije zadane kilometraže servisa se prikazuje upozorenje. */
export const SERVICE_MILEAGE_WARNING_KM = 1000

export interface DeadlineStatus {
  tone: DeadlineTone
  daysLeft: number
  /** Kratak opis za oznaku, npr. „Ističe za 12 dana”. */
  label: string
}

export function toneForDays(daysLeft: number): DeadlineTone {
  if (daysLeft <= URGENT_DAYS) return 'danger'
  if (daysLeft <= WARN_DAYS) return 'warn'
  return 'ok'
}

export function relativeDaysLabel(daysLeft: number): string {
  if (daysLeft < 0) {
    const late = Math.abs(daysLeft)
    return `Isteklo prije ${late} ${dayWord(late)}`
  }
  if (daysLeft === 0) return 'Ističe danas'
  if (daysLeft === 1) return 'Ističe sutra'
  return `Ističe za ${daysLeft} ${dayWord(daysLeft)}`
}

/** Status roka (registracija, servis…) u odnosu na današnji dan. */
export function deadlineStatus(date: ISODate, today: ISODate = todayISO()): DeadlineStatus {
  const daysLeft = daysUntil(date, today)
  return { tone: toneForDays(daysLeft), daysLeft, label: relativeDaysLabel(daysLeft) }
}

/** Status servisa po kilometraži; `null` ako kilometraža servisa nije zadana. */
export function mileageStatus(currentMileage: number | null, nextServiceMileage: number | null) {
  if (nextServiceMileage === null || currentMileage === null) return null
  const kmLeft = nextServiceMileage - currentMileage
  const tone: DeadlineTone = kmLeft <= 0 ? 'danger' : kmLeft <= SERVICE_MILEAGE_WARNING_KM ? 'warn' : 'ok'
  return { tone, kmLeft }
}

/** Opis za planirane obveze (servis, podsjetnik): „Za 12 dana”, „Danas”, „Prošlo prije 3 dana”. */
export function relativeDueLabel(daysLeft: number): string {
  if (daysLeft < 0) {
    const late = Math.abs(daysLeft)
    return `Prošlo prije ${late} ${dayWord(late)}`
  }
  if (daysLeft === 0) return 'Danas'
  if (daysLeft === 1) return 'Sutra'
  return `Za ${daysLeft} ${dayWord(daysLeft)}`
}
