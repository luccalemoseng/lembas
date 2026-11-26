import { z } from 'zod'

/**
 * Content model. All learning content lives in JSON files next to this one and is
 * validated against these schemas by the test suite (see content.test.ts).
 *
 * Every item carries `source` (where it appears in the published work) and
 * `confidence`. Items with confidence "review" are filtered out of lessons until a
 * human has checked them (suggested reference: https://eldamo.org).
 */

const id = z.string().regex(/^[a-z0-9-]+$/, 'ids are lowercase kebab-case')

export const Confidence = z.enum(['high', 'review'])
export const ElvishLang = z.enum(['sindarin', 'quenya'])

export const LexiconItem = z
  .object({
    id,
    /** word = ordinary word, name = proper name, phrase = several words, element = name-building piece */
    kind: z.enum(['word', 'name', 'phrase', 'element']),
    lang: ElvishLang,
    word: z.string().min(1),
    /** English glosses. The first one is shown; all of them are accepted as answers. */
    gloss: z.array(z.string().min(1)).min(1),
    /** Breakdown of a name or phrase into meaningful pieces. */
    elements: z.array(z.object({ form: z.string().min(1), meaning: z.string().min(1) })).optional(),
    /** Short explanation in our own words (never quoted from the books). */
    note: z.string().optional(),
    source: z.string().min(1),
    confidence: Confidence,
  })
  .strict()

const PronQuestion = z
  .object({
    prompt: z.string().min(1),
    answer: z.string().min(1),
    distractors: z.array(z.string().min(1)).min(1).max(3),
  })
  .strict()

const PronBase = {
  id,
  lang: z.enum(['sindarin', 'quenya', 'both']),
  /** Shown after answering. Our own words. */
  explanation: z.string().min(1),
  source: z.string().min(1),
  confidence: Confidence,
}

export const PronunciationItem = z.discriminatedUnion('kind', [
  z
    .object({
      ...PronBase,
      kind: z.literal('sound'),
      /** Letter(s) as written, e.g. "dh". */
      grapheme: z.string().min(1),
      /** Very short description of the sound, used in matching exercises. */
      sound: z.string().min(1),
      questions: z.array(PronQuestion).min(1),
    })
    .strict(),
  z
    .object({
      ...PronBase,
      kind: z.literal('stress'),
      word: z.string().min(1),
      syllables: z.array(z.string().min(1)).min(2),
      /** Index into `syllables` of the stressed syllable. */
      stressed: z.number().int().min(0),
    })
    .strict()
    .refine((s) => s.stressed < s.syllables.length, 'stressed index out of range')
    .refine(
      (s) => s.syllables.join('').toLowerCase() === s.word.toLowerCase().replace(/[\s-]/g, ''),
      'syllables must spell the word',
    ),
  z
    .object({
      ...PronBase,
      kind: z.literal('rule'),
      questions: z.array(PronQuestion).min(1),
    })
    .strict(),
])

export const Lesson = z
  .object({
    id,
    title: z.string().min(1),
    /** Ids of lexicon or pronunciation items taught in this lesson. */
    items: z.array(id).min(1),
  })
  .strict()

export const Unit = z
  .object({
    id,
    trackId: id,
    title: z.string().min(1),
    description: z.string().min(1),
    lessons: z.array(Lesson).min(4).max(6),
  })
  .strict()

export const Track = z
  .object({
    id,
    title: z.string().min(1),
    description: z.string().min(1),
    units: z.array(id),
    status: z.enum(['available', 'coming-soon']),
  })
  .strict()

const AchievementBase = { id, title: z.string().min(1), description: z.string().min(1) }

/** Achievements: titles and descriptions are content (English), conditions are typed. */
export const Achievement = z.discriminatedUnion('kind', [
  z
    .object({
      ...AchievementBase,
      kind: z.enum(['lessons', 'perfectLessons', 'streak', 'xp', 'practiceSessions']),
      target: z.number().int().positive(),
    })
    .strict(),
  z.object({ ...AchievementBase, kind: z.enum(['unit', 'track']), target: id }).strict(),
])

export type Achievement = z.infer<typeof Achievement>
export type LexiconItem = z.infer<typeof LexiconItem>
export type PronunciationItem = z.infer<typeof PronunciationItem>
export type Lesson = z.infer<typeof Lesson>
export type Unit = z.infer<typeof Unit>
export type Track = z.infer<typeof Track>
export type ContentItem =
  ({ type: 'lexicon' } & LexiconItem) | ({ type: 'pronunciation' } & PronunciationItem)
