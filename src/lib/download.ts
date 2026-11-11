import { isIos } from './push'

export type SaveResult = 'saved' | 'shared' | 'cancelled'

/**
 * Sprema tekstualnu datoteku na uređaj.
 * Na iPhoneu/iPadu (posebno u instaliranoj aplikaciji) preuzimanje preko poveznice nije
 * pouzdano, pa se otvara izbornik „Dijeli” iz kojeg se datoteka sprema u Datoteke ili šalje.
 * Mora se pozvati izravno iz klika (bez čekanja prije), inače preglednik odbije dijeljenje.
 */
export async function saveTextFile(name: string, content: string, type: string): Promise<SaveResult> {
  const blob = new Blob([content], { type })

  if (isIos() && typeof navigator.canShare === 'function') {
    const file = new File([blob], name, { type })
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file] })
        return 'shared'
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
        // Ostale greške: pokušaj običnim preuzimanjem.
      }
    }
  }

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.rel = 'noopener'
  document.body.append(link)
  link.click()
  link.remove()
  // Preglednik mora stići pročitati datoteku prije oslobađanja.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  return 'saved'
}
