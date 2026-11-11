import { formatDate, todayISO } from '../../shared/dates.js'
import type { DeadlineTone } from '../../shared/status.js'
import type { EmailMessage } from './email.js'
import { escapeHtml } from './email.js'
import type { PushPayload } from './push.js'

export interface ReminderItem {
  vehicleId: string
  vehicleName: string
  plate: string
  /** „Istek registracije: ističe za 7 dana (18.11.2026)” */
  text: string
  tone: DeadlineTone
}

/** 1 rok, 2 roka, 5 rokova, 21 rok… */
export function rokWord(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return 'rok'
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'roka'
  return 'rokova'
}

const TONE_COLORS: Record<DeadlineTone, string> = { ok: '#15803d', warn: '#c2410c', danger: '#b91c1c' }

function layout(title: string, content: string, appUrl: string, buttonLabel: string, buttonUrl: string): string {
  return `<!doctype html>
<html lang="hr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:24px 12px;background:#f4f4f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#2b2a29">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e4e4e7">
    <div style="background:#ffcc00;padding:16px 20px;font-weight:700;font-size:18px">J-CARS</div>
    <div style="padding:20px">
      <h1 style="margin:0 0 12px;font-size:18px">${escapeHtml(title)}</h1>
      ${content}
      <p style="margin:24px 0 0"><a href="${escapeHtml(buttonUrl)}" style="display:inline-block;background:#2b2a29;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:10px;font-weight:600">${escapeHtml(buttonLabel)}</a></p>
    </div>
    <div style="padding:12px 20px;border-top:1px solid #e4e4e7;font-size:12px;color:#71717a">
      Automatska obavijest aplikacije J-CARS. Podsjetnike možete promijeniti u
      <a href="${escapeHtml(appUrl)}/postavke/obavijesti" style="color:#71717a">postavkama obavijesti</a>.
    </div>
  </div>
</body></html>`
}

export function reminderEmail(items: ReminderItem[], appUrl: string): Omit<EmailMessage, 'to'> {
  const single = items.length === 1 ? items[0] : null
  const subject = single
    ? `J-CARS: ${single.plate} – ${single.text}`
    : `J-CARS: ${items.length} ${rokWord(items.length)} zahtijeva pažnju`

  const rows = items
    .map(
      (item) => `<tr>
        <td style="padding:10px 0;border-top:1px solid #e4e4e7;vertical-align:top;width:14px">
          <span style="display:inline-block;width:10px;height:10px;border-radius:5px;background:${TONE_COLORS[item.tone]};margin-top:5px"></span>
        </td>
        <td style="padding:10px 0 10px 8px;border-top:1px solid #e4e4e7">
          <a href="${escapeHtml(`${appUrl}/vozila/${item.vehicleId}`)}" style="color:#2b2a29;font-weight:600;text-decoration:none">${escapeHtml(item.vehicleName)} · ${escapeHtml(item.plate)}</a><br>
          <span style="color:#3f3f46">${escapeHtml(item.text)}</span>
        </td>
      </tr>`,
    )
    .join('')

  const html = layout(
    single ? 'Podsjetnik na rok' : `Rokovi koji zahtijevaju pažnju (${items.length})`,
    `<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;font-size:15px">${rows}</table>`,
    appUrl,
    single ? 'Otvori vozilo' : 'Otvori J-CARS',
    single ? `${appUrl}/vozila/${single.vehicleId}` : `${appUrl}/kalendar?prikaz=nadolazece`,
  )
  const text = [
    single ? 'Podsjetnik na rok' : `Rokovi koji zahtijevaju pažnju (${items.length})`,
    '',
    ...items.map((i) => `• ${i.vehicleName} (${i.plate}) – ${i.text}`),
    '',
    `${appUrl}/kalendar?prikaz=nadolazece`,
  ].join('\n')

  return { subject, html, text }
}

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

export function testEmail(appUrl: string): Omit<EmailMessage, 'to'> {
  const when = formatDate(todayISO())
  return {
    subject: 'J-CARS: probna obavijest',
    html: layout(
      'Probna obavijest',
      `<p style="margin:0;font-size:15px">E-mail obavijesti rade. Podsjetnici na rokove stizat će na ovu adresu.</p>
       <p style="margin:8px 0 0;font-size:13px;color:#71717a">Poslano ${escapeHtml(when)}.</p>`,
      appUrl,
      'Otvori J-CARS',
      appUrl,
    ),
    text: `Probna obavijest\n\nE-mail obavijesti rade. Podsjetnici na rokove stizat će na ovu adresu.\nPoslano ${when}.\n\n${appUrl}`,
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
