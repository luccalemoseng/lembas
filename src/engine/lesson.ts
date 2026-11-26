import type { Content } from '../content'
import type { ContentItem, LexiconItem, PronunciationItem, Unit } from '../content/schema'
import { normalize, normalizeEnglish } from './normalize'
import { pick, shuffle, type Rng } from './random'

export type TextLang = 'en' | 'sindarin' | 'quenya'

interface Base {
  id: string
  /** The item this exercise is about; used for feedback and spaced review. */
  itemId: string
}

export interface ChoiceExercise extends Base {
  kind: 'choice'
  variant: 'elv-en' | 'en-elv' | 'pronounce' | 'stress'
  prompt: string
  promptLang: TextLang
  options: string[]
  optionsLang: TextLang
  answer: string
}

export interface MatchExercise {
  kind: 'match'
  id: string
  leftLang: TextLang
  pairs: { left: string; right: string; itemId: string }[]
}

export interface TypeExercise extends Base {
  kind: 'type'
  prompt: string
  promptLang: TextLang
  answerLanguage: 'en' | 'elvish'
  accepted: string[]
}

/** Put a sentence together from word tiles (some tiles are distractors). */
export interface BuildExercise extends Base {
  kind: 'build'
  prompt: string
  promptLang: TextLang
  answerLang: TextLang
  /** Shuffled tiles: the words of the answer plus a few distractors. */
  tiles: string[]
  /** Full sentences accepted as correct. */
  accepted: string[]
}

export type Exercise = ChoiceExercise | MatchExercise | TypeExercise | BuildExercise

export const MIN_EXERCISES = 6
export const MAX_EXERCISES = 12
const MAX_MATCH_PAIRS = 5
const CHOICE_OPTIONS = 4
const BUILD_DISTRACTORS = 3
/** Phrases longer than this are only built in English (Elvish tiles get confusing). */
const MAX_ELVISH_BUILD_WORDS = 6

type Lex = Extract<ContentItem, { type: 'lexicon' }>
type Pron = Extract<ContentItem, { type: 'pronunciation' }>

export interface LessonContext {
  content: Content
  /** Units of the lesson's track, in order. */
  trackUnits: Unit[]
  unitId: string
  lessonId: string
  rng: Rng
}

/**
 * Builds the exercise list for a lesson. Order: first meet each new item
 * (recognition), then a matching round, then harder production exercises.
 * Short lessons are padded with review of items from earlier lessons.
 */
export function generateLesson(ctx: LessonContext): Exercise[] {
  const { content, rng } = ctx
  const { lessonItems, earlierItems } = collectItems(ctx)

  const lex = lessonItems.filter((i): i is Lex => i.type === 'lexicon')
  const pron = lessonItems.filter((i): i is Pron => i.type === 'pronunciation')
  const lexPool: DistractorPool = {
    items: Object.values(content.items).filter((i): i is Lex => i.type === 'lexicon'),
    known: new Set([...lessonItems, ...earlierItems].map((i) => i.id)),
  }

  const recognition: Exercise[] = []
  const production: Exercise[] = []
  const counter = { n: 0 }
  const nextId = () => `ex-${counter.n++}`

  for (const item of shuffle(lex, rng)) {
    recognition.push(choiceElvToEn(item, lexPool, rng, nextId()))
  }
  shuffle(lex, rng).forEach((item, i) => {
    if (item.kind === 'phrase') {
      production.push(buildSentence(item, 'en', lexPool, rng, nextId()))
      if (tokenize(item.word).length <= MAX_ELVISH_BUILD_WORDS) {
        production.push(buildSentence(item, 'elvish', lexPool, rng, nextId()))
      }
    } else if (i % 2 === 0) production.push(choiceEnToElv(item, lexPool, rng, nextId()))
    else production.push(typeToElvish(item, nextId()))
  })

  for (const item of shuffle(pron, rng)) {
    recognition.push(...pronunciationExercises(item, rng, nextId))
  }

  const match = buildMatch(lex, pron, earlierItems, rng, nextId())

  let exercises: Exercise[] = [
    ...recognition,
    ...(match ? [match] : []),
    ...shuffle(production, rng),
  ]

  // Pad with review of earlier items when the lesson is short.
  if (exercises.length < MIN_EXERCISES) {
    for (const item of shuffle(earlierItems, rng)) {
      if (exercises.length >= MIN_EXERCISES) break
      if (item.type === 'lexicon') exercises.push(choiceElvToEn(item, lexPool, rng, nextId()))
      else exercises.push(...pronunciationExercises(item, rng, nextId).slice(0, 1))
    }
  }

  if (exercises.length > MAX_EXERCISES) {
    // Keep the first meeting with every new item, trim the rest.
    const keep = new Set(recognition.slice(0, MAX_EXERCISES).map((e) => e.id))
    const rest = exercises.filter((e) => !keep.has(e.id))
    const room = MAX_EXERCISES - keep.size
    const extra = new Set(rest.slice(0, Math.max(0, room)).map((e) => e.id))
    exercises = exercises.filter((e) => keep.has(e.id) || extra.has(e.id))
  }
  return exercises
}

function collectItems(ctx: LessonContext) {
  const { content, trackUnits, unitId, lessonId } = ctx
  const lessonItems: ContentItem[] = []
  const earlierItems: ContentItem[] = []
  let found = false
  outer: for (const unit of trackUnits) {
    for (const lesson of unit.lessons) {
      const items = lesson.items
        .map((id) => content.items[id])
        .filter((i): i is ContentItem => Boolean(i))
      if (unit.id === unitId && lesson.id === lessonId) {
        lessonItems.push(...items)
        found = true
        break outer
      }
      earlierItems.push(...items)
    }
  }
  if (!found) throw new Error(`Lesson ${lessonId} not found in unit ${unitId}`)
  const inLesson = new Set(lessonItems.map((i) => i.id))
  const uniqueEarlier = [...new Map(earlierItems.map((i) => [i.id, i])).values()].filter(
    (i) => !inLesson.has(i.id),
  )
  return { lessonItems, earlierItems: uniqueEarlier }
}

function glossKeys(item: LexiconItem): Set<string> {
  return new Set(item.gloss.map(normalizeEnglish))
}

/** Other items whose meaning cannot be confused with `item`. */
interface DistractorPool {
  items: Lex[]
  /** Ids of items from this lesson and earlier lessons of the track. */
  known: Set<string>
}

function distractorPool(item: Lex, pool: Lex[]): Lex[] {
  const own = glossKeys(item)
  return pool.filter(
    (other) =>
      other.id !== item.id &&
      other.lang === item.lang &&
      other.word.toLowerCase() !== item.word.toLowerCase() &&
      ![...glossKeys(other)].some((g) => own.has(g)),
  )
}

/** Prefer distractors of the same kind (word with words, phrase with phrases). */
function chooseDistractors(item: Lex, pool: DistractorPool, rng: Rng): Lex[] {
  const candidates = distractorPool(item, pool.items)
  const sameKind = (c: Lex) => (c.kind === 'phrase') === (item.kind === 'phrase')
  const known = (c: Lex) => pool.known.has(c.id)
  // Prefer words the learner has already met, and of the same kind (word vs. phrase).
  const tiers = [
    candidates.filter((c) => known(c) && sameKind(c)),
    candidates.filter((c) => known(c) && !sameKind(c)),
    candidates.filter((c) => !known(c) && sameKind(c)),
    candidates.filter((c) => !known(c) && !sameKind(c)),
  ]
  const chosen: Lex[] = []
  for (const tier of tiers) {
    if (chosen.length >= CHOICE_OPTIONS - 1) break
    chosen.push(...pick(tier, CHOICE_OPTIONS - 1 - chosen.length, rng))
  }
  return chosen
}

function uniqueOptions(answer: string, others: string[], rng: Rng): string[] {
  const seen = new Set([normalizeEnglish(answer)])
  const out = [answer]
  for (const o of others) {
    const key = normalizeEnglish(o)
    if (!seen.has(key)) {
      seen.add(key)
      out.push(o)
    }
  }
  return shuffle(out, rng)
}

function choiceElvToEn(item: Lex, pool: DistractorPool, rng: Rng, id: string): ChoiceExercise {
  const answer = item.gloss[0]!
  const others = chooseDistractors(item, pool, rng).map((d) => d.gloss[0]!)
  return {
    kind: 'choice',
    variant: 'elv-en',
    id,
    itemId: item.id,
    prompt: item.word,
    promptLang: item.lang,
    options: uniqueOptions(answer, others, rng),
    optionsLang: 'en',
    answer,
  }
}

function choiceEnToElv(item: Lex, pool: DistractorPool, rng: Rng, id: string): ChoiceExercise {
  const others = chooseDistractors(item, pool, rng).map((d) => d.word)
  return {
    kind: 'choice',
    variant: 'en-elv',
    id,
    itemId: item.id,
    prompt: item.gloss[0]!,
    promptLang: 'en',
    options: uniqueOptions(item.word, others, rng),
    optionsLang: item.lang,
    answer: item.word,
  }
}

function typeToEnglish(item: Lex, id: string): TypeExercise {
  return {
    kind: 'type',
    id,
    itemId: item.id,
    prompt: item.word,
    promptLang: item.lang,
    answerLanguage: 'en',
    accepted: item.gloss,
  }
}

function typeToElvish(item: Lex, id: string): TypeExercise {
  return {
    kind: 'type',
    id,
    itemId: item.id,
    prompt: item.gloss[0]!,
    promptLang: 'en',
    answerLanguage: 'elvish',
    accepted: [item.word],
  }
}

function pronunciationExercises(
  item: Pron & PronunciationItem,
  rng: Rng,
  nextId: () => string,
): ChoiceExercise[] {
  if (item.kind === 'stress') {
    return [
      {
        kind: 'choice',
        variant: 'stress',
        id: nextId(),
        itemId: item.id,
        prompt: item.word,
        promptLang: item.lang === 'both' ? 'sindarin' : item.lang,
        // Syllables are shown in their natural order, not shuffled.
        options: [...item.syllables],
        optionsLang: item.lang === 'both' ? 'sindarin' : item.lang,
        answer: item.syllables[item.stressed]!,
      },
    ]
  }
  return item.questions.map((q) => ({
    kind: 'choice' as const,
    variant: 'pronounce' as const,
    id: nextId(),
    itemId: item.id,
    prompt: q.prompt,
    promptLang: 'en' as const,
    options: shuffle([q.answer, ...q.distractors], rng),
    optionsLang: 'en' as const,
    answer: q.answer,
  }))
}

function buildMatch(
  lex: Lex[],
  pron: Pron[],
  earlier: ContentItem[],
  rng: Rng,
  id: string,
): MatchExercise | null {
  if (lex.length > 0) {
    const pool = uniqueBy(
      [...lex, ...earlier.filter((i): i is Lex => i.type === 'lexicon')],
      [(i) => i.word.toLowerCase(), (i) => normalizeEnglish(i.gloss[0]!)],
    )
    const chosen = [
      ...lex.filter((i) => pool.includes(i)),
      ...shuffle(
        pool.filter((i) => !lex.includes(i)),
        rng,
      ),
    ]
      .filter((i) => i.kind !== 'phrase')
      .slice(0, MAX_MATCH_PAIRS)
    if (chosen.length < 3) return null
    return {
      kind: 'match',
      id,
      leftLang: chosen[0]!.lang,
      pairs: chosen.map((i) => ({ left: i.word, right: i.gloss[0]!, itemId: i.id })),
    }
  }
  const sounds = (items: ContentItem[]) =>
    items.filter(
      (i): i is Pron & { kind: 'sound'; grapheme: string; sound: string } =>
        i.type === 'pronunciation' && i.kind === 'sound',
    )
  const own = sounds(pron)
  if (own.length === 0) return null
  const pool = uniqueBy(
    [...own, ...shuffle(sounds(earlier), rng)],
    [(i) => i.grapheme, (i) => i.sound],
  )
  const chosen = pool.slice(0, MAX_MATCH_PAIRS)
  if (chosen.length < 3) return null
  return {
    kind: 'match',
    id,
    leftLang: 'sindarin',
    pairs: chosen.map((i) => ({ left: i.grapheme, right: i.sound, itemId: i.id })),
  }
}

/** Keeps the first item for each key, across all key functions. */
function uniqueBy<T>(items: T[], keys: ((item: T) => string)[]): T[] {
  const seen = keys.map(() => new Set<string>())
  return items.filter((item) => {
    const values = keys.map((k) => k(item))
    if (values.some((v, i) => seen[i]!.has(v))) return false
    values.forEach((v, i) => seen[i]!.add(v))
    return true
  })
}

/** Splits a sentence into word tiles, dropping surrounding punctuation. */
export function tokenize(sentence: string): string[] {
  return sentence
    .split(/\s+/)
    .map((w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter((w) => w.length > 0)
}

function buildSentence(
  item: Lex,
  target: 'en' | 'elvish',
  pool: DistractorPool,
  rng: Rng,
  id: string,
): BuildExercise {
  const answer = target === 'en' ? item.gloss[0]! : item.word
  const words = tokenize(answer)
  // Same normalisation as the answer checker, so a distractor that differs from an
  // answer word only by an accent can never be offered.
  const norm = target === 'en' ? normalizeEnglish : normalize
  // Distractor tiles must not be any word that appears in an accepted answer.
  const forbidden = new Set(
    (target === 'en' ? item.gloss : [item.word]).flatMap(tokenize).map((w) => norm(w)),
  )
  const source = (other: Lex) => (target === 'en' ? other.gloss[0]! : other.word)
  const candidates = pool.items.filter((o) => o.id !== item.id && o.lang === item.lang)
  const known = candidates.filter((o) => pool.known.has(o.id))
  const unknown = candidates.filter((o) => !pool.known.has(o.id))
  const distractors: string[] = []
  const seen = new Set(forbidden)
  for (const group of [known, unknown]) {
    for (const other of shuffle(group, rng)) {
      for (const w of tokenize(source(other))) {
        const key = norm(w)
        if (distractors.length < BUILD_DISTRACTORS && !seen.has(key)) {
          seen.add(key)
          distractors.push(w)
        }
      }
    }
  }
  return {
    kind: 'build',
    id,
    itemId: item.id,
    prompt: target === 'en' ? item.word : item.gloss[0]!,
    promptLang: target === 'en' ? item.lang : 'en',
    answerLang: target === 'en' ? 'en' : item.lang,
    tiles: shuffle([...words, ...distractors], rng),
    accepted: target === 'en' ? item.gloss : [item.word],
  }
}

export interface PracticeContext {
  content: Content
  /** Items to review, in priority order. */
  itemIds: string[]
  /** Items the learner has already met (used to pick distractors). */
  known: Set<string>
  rng: Rng
}

/** One exercise per item, of a randomly chosen kind, for spaced review. */
export function generatePractice(ctx: PracticeContext): Exercise[] {
  const { content, rng } = ctx
  const pool: DistractorPool = {
    items: Object.values(content.items).filter((i): i is Lex => i.type === 'lexicon'),
    known: ctx.known,
  }
  const exercises: Exercise[] = []
  let n = 0
  const nextId = () => `px-${n++}`
  for (const id of ctx.itemIds) {
    const item = content.items[id]
    if (!item) continue // removed or moved back to "review" since it was added
    if (item.type === 'pronunciation') {
      const options = pronunciationExercises(item, rng, nextId)
      exercises.push(options[Math.floor(rng() * options.length)]!)
      continue
    }
    const makers: (() => Exercise)[] =
      item.kind === 'phrase'
        ? [
            () => buildSentence(item, 'en', pool, rng, nextId()),
            () => buildSentence(item, 'elvish', pool, rng, nextId()),
            () => typeToEnglish(item, nextId()),
          ]
        : [
            () => choiceElvToEn(item, pool, rng, nextId()),
            () => choiceEnToElv(item, pool, rng, nextId()),
            () => typeToElvish(item, nextId()),
            () => typeToEnglish(item, nextId()),
          ]
    exercises.push(makers[Math.floor(rng() * makers.length)]!())
  }
  return exercises
}
