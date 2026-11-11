import { daysBetween, type ISODate } from './dates.js'
import { mileageStatus, toneForDays, WARN_DAYS, type DeadlineTone } from './status.js'

/**
 * Obveze (rokovi) voznog parka – ista pravila koriste nadzorna ploča, kalendar
 * i dnevna provjera za obavijesti. Prate se samo aktivna vozila:
 *  - istek registracije (najkasniji od datuma na vozilu i aktivnosti registracije),
 *  - sljedeći servis iz zadnjeg servisa (po datumu i/ili kilometraži),
 *  - aktivnosti „Ostalo” s današnjim ili budućim datumom.
 */

export interface ObligationVehicle {
  id: string
  is_active: boolean
  effective_registration_expiry: ISODate
  effective_mileage: number | null
  next_service_date: ISODate | null
  next_service_mileage: number | null
}

export interface ObligationActivity {
  id: string
  vehicle_id: string
  activity_type: string
  activity_date: ISODate
  title: string | null
  reminder_enabled: boolean
}

export type ObligationKind = 'registration' | 'service' | 'activity'

export interface Obligation {
  key: string
  kind: ObligationKind
  vehicleId: string
  activityId: string | null
  /** Naslov za prikaz: „Istek registracije”, „Servis” ili naslov aktivnosti. */
  title: string
  /** Datum roka; null samo za servis zadan isključivo kilometražom. */
  date: ISODate | null
  daysLeft: number | null
  /** Servis po kilometraži: preostali km (negativno = prekoračeno). */
  kmLeft: number | null
  nextMileage: number | null
  reminderEnabled: boolean
  tone: DeadlineTone
}

const TONE_RANK: Record<DeadlineTone, number> = { ok: 0, warn: 1, danger: 2 }

function worstTone(tones: DeadlineTone[]): DeadlineTone {
  return tones.reduce((worst, tone) => (TONE_RANK[tone] > TONE_RANK[worst] ? tone : worst), 'ok')
}

/** Redoslijed: najraniji rok prvi; servis bez datuma prema hitnosti kilometraže. */
function sortKey(o: Obligation): number {
  if (o.daysLeft !== null) return o.daysLeft
  return o.tone === 'danger' ? 0 : o.tone === 'warn' ? WARN_DAYS : Number.MAX_SAFE_INTEGER
}

export function compareObligations(a: Obligation, b: Obligation): number {
  return sortKey(a) - sortKey(b) || TONE_RANK[b.tone] - TONE_RANK[a.tone] || a.key.localeCompare(b.key)
}

export function buildObligations(
  vehicles: ObligationVehicle[],
  activities: ObligationActivity[],
  today: ISODate,
): Obligation[] {
  const active = new Map(vehicles.filter((v) => v.is_active).map((v) => [v.id, v]))
  const result: Obligation[] = []

  for (const v of active.values()) {
    const regDays = daysBetween(today, v.effective_registration_expiry)
    result.push({
      key: `registration:${v.id}`,
      kind: 'registration',
      vehicleId: v.id,
      activityId: null,
      title: 'Istek registracije',
      date: v.effective_registration_expiry,
      daysLeft: regDays,
      kmLeft: null,
      nextMileage: null,
      reminderEnabled: true,
      tone: toneForDays(regDays),
    })

    if (v.next_service_date || v.next_service_mileage !== null) {
      const serviceDays = v.next_service_date ? daysBetween(today, v.next_service_date) : null
      const km = mileageStatus(v.effective_mileage, v.next_service_mileage)
      result.push({
        key: `service:${v.id}`,
        kind: 'service',
        vehicleId: v.id,
        activityId: null,
        title: 'Servis',
        date: v.next_service_date,
        daysLeft: serviceDays,
        kmLeft: km?.kmLeft ?? null,
        nextMileage: v.next_service_mileage,
        reminderEnabled: true,
        tone: worstTone([serviceDays !== null ? toneForDays(serviceDays) : 'ok', km?.tone ?? 'ok']),
      })
    }
  }

  for (const a of activities) {
    if (a.activity_type !== 'other' || !active.has(a.vehicle_id) || a.activity_date < today) continue
    const days = daysBetween(today, a.activity_date)
    result.push({
      key: `activity:${a.id}`,
      kind: 'activity',
      vehicleId: a.vehicle_id,
      activityId: a.id,
      title: a.title ?? 'Ostalo',
      date: a.activity_date,
      daysLeft: days,
      kmLeft: null,
      nextMileage: null,
      reminderEnabled: a.reminder_enabled,
      tone: toneForDays(days),
    })
  }

  return result.sort(compareObligations)
}

/** Obveze koje treba istaknuti: hitne ili s rokom unutar `horizonDays` dana. */
export function upcomingObligations(obligations: Obligation[], horizonDays: number): Obligation[] {
  return obligations.filter((o) => o.tone !== 'ok' || (o.daysLeft !== null && o.daysLeft <= horizonDays))
}
