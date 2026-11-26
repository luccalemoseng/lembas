import { describe, expect, it } from 'vitest'
import { checkTypedAnswer } from './answer'
import { levenshtein, normalize, normalizeEnglish } from './normalize'

describe('normalize', () => {
  it('ignores accents, diaeresis and circumflex', () => {
    expect(normalize('Andúril')).toBe('anduril')
    expect(normalize('Eärendil')).toBe('earendil')
    expect(normalize('Henneth Annûn')).toBe('henneth annun')
  })
  it('ignores case, punctuation and extra spaces', () => {
    expect(normalize('  Speak,  friend, and   enter! ')).toBe('speak friend and enter')
  })
  it('treats hyphens as spaces and drops apostrophes', () => {
    expect(normalize('true-silver')).toBe('true silver')
    expect(normalize("lúmenn' omentielvo")).toBe('lumenn omentielvo')
  })
  it('handles precomposed and decomposed accents the same way', () => {
    expect(normalize('á')).toBe(normalize('á'))
  })
})

describe('normalizeEnglish', () => {
  it('drops a leading article or "to"', () => {
    expect(normalizeEnglish('The Black Land')).toBe('black land')
    expect(normalizeEnglish('to speak')).toBe('speak')
    expect(normalizeEnglish('an elf')).toBe('elf')
  })
  it('never reduces an answer to nothing', () => {
    expect(normalizeEnglish('the')).toBe('the')
    expect(normalizeEnglish('a')).toBe('a')
  })
  it('only strips whole words', () => {
    expect(normalizeEnglish('anor')).toBe('anor')
    expect(normalizeEnglish('them')).toBe('them')
  })
})

describe('levenshtein', () => {
  it('computes edit distance', () => {
    expect(levenshtein('friend', 'friend')).toBe(0)
    expect(levenshtein('freind', 'friend')).toBe(2)
    expect(levenshtein('frend', 'friend')).toBe(1)
    expect(levenshtein('', 'abc')).toBe(3)
  })
})

describe('checkTypedAnswer', () => {
  it('accepts any listed gloss', () => {
    expect(checkTypedAnswer('king', ['lord', 'king'], 'en')).toMatchObject({
      correct: true,
      typo: false,
    })
  })
  it('reports the first accepted answer as expected', () => {
    expect(checkTypedAnswer('x', ['lord', 'king'], 'en').expected).toBe('lord')
  })
  it('accepts Elvish without accents', () => {
    expect(checkTypedAnswer('Henneth Annun', ['Henneth Annûn'], 'elvish').correct).toBe(true)
    expect(checkTypedAnswer('anduril', ['Andúril'], 'elvish').correct).toBe(true)
  })
  it('accepts Elvish with accents typed in', () => {
    expect(checkTypedAnswer('Henneth Annûn', ['Henneth Annûn'], 'elvish').correct).toBe(true)
  })
  it('does NOT forgive a one-letter difference in Elvish', () => {
    // mellon (friend) vs mellyn (friends) differ by one letter.
    expect(checkTypedAnswer('mellyn', ['mellon'], 'elvish').correct).toBe(false)
  })
  it('forgives one typo in longer English answers and flags it', () => {
    expect(checkTypedAnswer('frend', ['friend'], 'en')).toEqual({
      correct: true,
      typo: true,
      expected: 'friend',
    })
  })
  it('rejects one-letter changes that make another real word (short words)', () => {
    expect(checkTypedAnswer('those', ['these'], 'en').correct).toBe(false)
    expect(checkTypedAnswer('Black Hand', ['Black Land'], 'en').correct).toBe(false)
  })
  it('never forgives a singular/plural difference', () => {
    expect(checkTypedAnswer('door', ['doors', 'gates'], 'en').correct).toBe(false)
    expect(checkTypedAnswer('friends', ['friend'], 'en').correct).toBe(false)
    expect(
      checkTypedAnswer(
        'the Door of Durin, Lord of Moria',
        ['the Doors of Durin, Lord of Moria'],
        'en',
      ).correct,
    ).toBe(false)
  })
  it('in phrases, forgives one typo in one long word only', () => {
    const accepted = ['Celebrimbor of Hollin drew these signs']
    expect(checkTypedAnswer('Celebrimbor of Holin drew these signs', accepted, 'en')).toMatchObject(
      { correct: true, typo: true },
    )
    expect(checkTypedAnswer('Celebrimbor of Hollin drew those signs', accepted, 'en').correct).toBe(
      false,
    )
    expect(checkTypedAnswer('Celebrimbr of Holin drew these signs', accepted, 'en').correct).toBe(
      false,
    )
  })
  it('does not forgive typos in short English answers', () => {
    // "them" vs "then" would change the meaning.
    expect(checkTypedAnswer('then', ['them'], 'en').correct).toBe(false)
  })
  it('does not forgive two typos', () => {
    expect(checkTypedAnswer('frnd', ['friend'], 'en').correct).toBe(false)
  })
  it('accepts a phrase without punctuation or leading article', () => {
    const accepted = ['the Doors of Durin, Lord of Moria']
    expect(checkTypedAnswer('doors of durin lord of moria', accepted, 'en').correct).toBe(true)
  })
  it('rejects an empty answer', () => {
    expect(checkTypedAnswer('   ', ['friend'], 'en').correct).toBe(false)
  })
  it('rejects an unrelated answer', () => {
    expect(checkTypedAnswer('enemy', ['friend'], 'en').correct).toBe(false)
  })
})
