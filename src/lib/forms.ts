/** Pomoćne funkcije za obrasce. */

/** Tekst → cijeli broj. Dopušta razmake i točke kao razdjelnike tisućica ("125.000"). */
export function parseInteger(text: string): number | null | 'invalid' {
  const cleaned = text.replace(/[\s.]/g, '')
  if (cleaned === '') return null
  if (!/^\d+$/.test(cleaned)) return 'invalid'
  const value = Number(cleaned)
  return Number.isSafeInteger(value) ? value : 'invalid'
}

/** Prazan tekst → null, inače obrezan tekst. */
export function emptyToNull(text: string): string | null {
  const trimmed = text.trim()
  return trimmed === '' ? null : trimmed
}

/** Broj → tekst za polje obrasca. */
export function numberToText(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value)
}

/** Postgres kod greške iz Supabase odgovora (npr. '23505' za duplikat). */
export function pgErrorCode(error: unknown): string | undefined {
  if (error && typeof error === 'object' && 'code' in error && typeof error.code === 'string') return error.code
  return undefined
}
