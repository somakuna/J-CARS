/** Mala slova, bez dijakritike (č → c, š → s, đ → d…) – za pretraživanje. */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/g, 'd')
}

/** Bez razmaka i crtica – „zg 1234-ab” i „ZG1234AB” su isto. */
export function compactText(text: string): string {
  return normalizeText(text).replace(/[\s-]/g, '')
}

/** Svaka riječ upita mora se pojaviti u tekstu (redoslijed nije bitan). */
export function matchesWords(haystack: string, query: string): boolean {
  const words = normalizeText(query.trim()).split(/\s+/).filter(Boolean)
  if (words.length === 0) return true
  const text = normalizeText(haystack)
  return words.every((word) => text.includes(word))
}
