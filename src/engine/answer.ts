import { levenshtein, normalize, normalizeEnglish } from './normalize'

export type AnswerLanguage = 'en' | 'elvish'

export interface CheckResult {
  correct: boolean
  /** Accepted, but with a small spelling slip worth pointing out. */
  typo: boolean
  /** The canonical answer to display (first accepted answer). */
  expected: string
}

/** Minimum length of the misspelled word before a one-letter slip is forgiven. */
const TYPO_MIN_WORD_LENGTH = 6

/**
 * Checks a typed answer.
 *
 * Accents are always optional. In English answers, exactly one misspelled word
 * with a single-letter slip is forgiven, but only for words of 6+ letters and
 * never when the difference is a plural "s". Short words are too easily turned
 * into other real words (these/those, land/hand, door/doors).
 *
 * Elvish must be spelled exactly: a single letter often changes the word
 * (mellon "friend" vs. mellyn "friends").
 */
export function checkTypedAnswer(
  input: string,
  accepted: readonly string[],
  language: AnswerLanguage,
): CheckResult {
  if (accepted.length === 0) throw new Error('checkTypedAnswer needs at least one accepted answer')
  const expected = accepted[0]!
  const norm = language === 'en' ? normalizeEnglish : normalize
  const given = norm(input)
  if (given.length === 0) return { correct: false, typo: false, expected }

  const targets = accepted.map(norm)
  if (targets.includes(given)) return { correct: true, typo: false, expected }

  if (language === 'en' && targets.some((target) => isForgivableTypo(given, target))) {
    return { correct: true, typo: true, expected }
  }
  return { correct: false, typo: false, expected }
}

function isForgivableTypo(given: string, target: string): boolean {
  const a = given.split(' ')
  const b = target.split(' ')
  if (a.length !== b.length) return false
  const differing = a.flatMap((word, i) => (word === b[i] ? [] : [[word, b[i]!] as const]))
  if (differing.length !== 1) return false
  const [typed, wanted] = differing[0]!
  if (wanted.length < TYPO_MIN_WORD_LENGTH) return false
  if (typed + 's' === wanted || wanted + 's' === typed) return false
  return levenshtein(typed, wanted) === 1
}

/**
 * Checks a sentence built from tiles. Tiles are spelled correctly by
 * construction, so no typo tolerance: only the words and their order matter.
 */
export function checkBuiltSentence(
  tiles: readonly string[],
  accepted: readonly string[],
  language: AnswerLanguage,
): CheckResult {
  const expected = accepted[0] ?? ''
  const norm = language === 'en' ? normalizeEnglish : normalize
  const given = norm(tiles.join(' '))
  const correct = given.length > 0 && accepted.some((a) => norm(a) === given)
  return { correct, typo: false, expected }
}
