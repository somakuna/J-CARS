/**
 * Datumi u aplikaciji.
 *
 * Datumi rokova u bazi su tipa `date` i u aplikaciju stižu kao 'YYYY-MM-DD'.
 * Računamo s kalendarskim danima (bez sati), kako promjena ljetnog/zimskog
 * vremena ne bi pomaknula broj preostalih dana.
 */

export type ISODate = string // 'YYYY-MM-DD'

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})/
const MS_PER_DAY = 86_400_000

export const APP_TIME_ZONE = 'Europe/Zagreb'

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** Rastavlja 'YYYY-MM-DD' (ili ISO datum-vrijeme) na godinu, mjesec i dan. */
function parts(value: ISODate): [number, number, number] | null {
  const match = ISO_DATE.exec(value)
  if (!match) return null
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

/** Broj dana od 1.1.1970. za kalendarski datum – neovisno o vremenskoj zoni. */
function dayNumber(value: ISODate): number | null {
  const p = parts(value)
  if (!p) return null
  return Date.UTC(p[0], p[1] - 1, p[2]) / MS_PER_DAY
}

/** Današnji datum kao 'YYYY-MM-DD' u zadanoj vremenskoj zoni (zadano Europe/Zagreb). */
export function todayISO(timeZone: string = APP_TIME_ZONE, now: Date = new Date()): ISODate {
  // 'en-CA' formatira kao YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

/** Lokalni Date objekt u 'YYYY-MM-DD' (za kalendar i obrasce). */
export function toISODate(date: Date): ISODate {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** 'YYYY-MM-DD' → DD.MM.YYYY. Prazna ili neispravna vrijednost → '—'. */
export function formatDate(value: ISODate | null | undefined): string {
  if (!value) return '—'
  const p = parts(value)
  if (!p) return '—'
  return `${pad(p[2])}.${pad(p[1])}.${p[0]}`
}

/** Vremenska oznaka (timestamptz) → DD.MM.YYYY. HH:mm u hrvatskom vremenu. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  const f = new Intl.DateTimeFormat('hr-HR', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) => f.find((p) => p.type === type)?.value ?? ''
  return `${get('day')}.${get('month')}.${get('year')} ${get('hour')}:${get('minute')}`
}

/** Broj kalendarskih dana od `from` do `to` (negativno ako je `to` prošao). */
export function daysBetween(from: ISODate, to: ISODate): number {
  const a = dayNumber(from)
  const b = dayNumber(to)
  if (a === null || b === null) return Number.NaN
  return Math.round(b - a)
}

/** Koliko je dana ostalo do datuma, računajući od danas (Europe/Zagreb). */
export function daysUntil(date: ISODate, today: ISODate = todayISO()): number {
  return daysBetween(today, date)
}

/** Ispravan hrvatski oblik riječi „dan” (1 dan, 2 dana, 11 dana, 21 dan). */
export function dayWord(count: number): string {
  const n = Math.abs(count)
  return n % 10 === 1 && n % 100 !== 11 ? 'dan' : 'dana'
}

/** Formatira broj s točkom kao razdjelnikom tisućica: 125000 → '125.000'. */
export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return new Intl.NumberFormat('hr-HR').format(value)
}

/** Kilometraža za prikaz: 125000 → '125.000 km'. */
export function formatMileage(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return `${formatNumber(value)} km`
}

/**
 * Unos datuma u obliku DD.MM.GGGG → 'YYYY-MM-DD'.
 * Vraća null za nepotpun ili nepostojeći datum (npr. 31.02.2027).
 */
export function parseDisplayDate(text: string): ISODate | null {
  const match = /^(\d{1,2})\.(\d{1,2})\.(\d{4})\.?$/.exec(text.trim())
  if (!match) return null
  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  if (year < 1900 || year > 2200 || month < 1 || month > 12 || day < 1) return null
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  if (day > daysInMonth) return null
  return `${year}-${pad(month)}-${pad(day)}`
}

/** 'YYYY-MM-DD' → 'DD.MM.YYYY' za polje obrasca; prazno za praznu vrijednost. */
export function toDisplayDate(value: ISODate | null | undefined): string {
  return value ? formatDate(value) : ''
}

/** Isti datum za `years` godina; 29.02. → 28.02. ako sljedeća godina nije prijestupna. */
export function addYears(value: ISODate, years: number): ISODate {
  const [y, m, d] = value.split('-').map(Number)
  const year = y + years
  const daysInMonth = new Date(Date.UTC(year, m, 0)).getUTCDate()
  return `${year}-${pad(m)}-${pad(Math.min(d, daysInMonth))}`
}
