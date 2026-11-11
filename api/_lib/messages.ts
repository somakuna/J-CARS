import type { PushPayload } from './push.js'

export interface ReminderItem {
  vehicleId: string
  plate: string
  /** „Istek registracije: ističe za 7 dana (18.11.2026)” */
  text: string
}

/** 1 rok, 2 roka, 5 rokova, 21 rok… */
export function rokWord(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'rok'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'roka'
  return 'rokova'
}

/** Jedna obavijest sa svim rokovima kojima je danas na redu podsjetnik (prikazuju se prva tri). */
export function reminderPush(items: ReminderItem[]): PushPayload {
  const single = items.length === 1 ? items[0] : null
  const shown = items.slice(0, 3).map((i) => `${i.plate}: ${i.text}`)
  if (items.length > 3) shown.push(`… i još ${items.length - 3}`)
  return {
    title: single ? `J-CARS · ${single.plate}` : `J-CARS: ${items.length} ${rokWord(items.length)}`,
    body: shown.join('\n'),
    url: single ? `/vozila/${single.vehicleId}` : '/kalendar?prikaz=nadolazece',
    tag: 'jcars-reminders',
  }
}

export function testPush(): PushPayload {
  return {
    title: 'J-CARS: probna obavijest',
    body: 'Push obavijesti rade na ovom uređaju.',
    url: '/postavke/obavijesti',
    tag: 'jcars-test',
  }
}
