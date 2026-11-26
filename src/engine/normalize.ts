/**
 * Normalisation used when comparing typed answers.
 * - case-insensitive
 * - accents ignored (á → a, û → u, ë → e)
 * - punctuation ignored, whitespace collapsed
 */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '') // strip combining marks (accents, diaeresis, circumflex)
    .toLowerCase()
    .replace(/[’'`]/g, '') // apostrophes join words: "lúmenn'" → "lumenn"
    .replace(/[^\p{L}\p{N}]+/gu, ' ') // any other punctuation/hyphen becomes a space
    .trim()
    .replace(/\s+/g, ' ')
}

const LEADING_ARTICLE = /^(the|a|an|to) /

/**
 * English answers additionally ignore a leading article or "to" ("the Black Land" =
 * "Black Land", "to speak" = "speak"), but never reduce an answer to nothing
 * (so the gloss "the" itself still works).
 */
export function normalizeEnglish(text: string): string {
  const n = normalize(text)
  const stripped = n.replace(LEADING_ARTICLE, '')
  return stripped.length > 0 ? stripped : n
}

/** Classic Levenshtein distance. Inputs are expected to be short. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const curr = [i]
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j]! + 1, curr[j - 1]! + 1, prev[j - 1]! + cost)
    }
    prev = curr
  }
  return prev[b.length]!
}
