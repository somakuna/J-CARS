/**
 * CSV za Excel u hrvatskim postavkama: odvajanje točkom-zarezom (zarez je decimalni znak),
 * UTF-8 s oznakom BOM (inače Excel krivo prikaže č, ć, ž, š, đ) i CRLF kraj reda.
 */

export type CsvValue = string | number | boolean | null | undefined

const SEPARATOR = ';'
const BOM = '\uFEFF'

/**
 * Tekst koji počinje s = + - @ (ili tabulatorom/novim redom) Excel bi izvršio kao formulu
 * (CSV injection) – ispred se dodaje apostrof pa ostaje običan tekst.
 */
function neutralizeFormula(text: string): string {
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
}

export function csvCell(value: CsvValue): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'boolean') return value ? 'Da' : 'Ne'
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : ''
  const text = neutralizeFormula(value)
  return /[";\r\n]/.test(text) || text !== text.trim() ? `"${text.replaceAll('"', '""')}"` : text
}

export interface CsvColumn<T> {
  header: string
  value: (row: T) => CsvValue
}

export function toCsv<T>(columns: CsvColumn<T>[], rows: readonly T[]): string {
  const lines = [columns.map((c) => csvCell(c.header)), ...rows.map((row) => columns.map((c) => csvCell(c.value(row))))]
  return BOM + lines.map((cells) => cells.join(SEPARATOR)).join('\r\n') + '\r\n'
}
