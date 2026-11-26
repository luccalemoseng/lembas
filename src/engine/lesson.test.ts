import { describe, expect, it } from 'vitest'
import { content, unitsOfTrack } from '../content'
import { checkBuiltSentence, checkTypedAnswer } from './answer'
import { normalizeEnglish } from './normalize'
import {
  generateLesson,
  generatePractice,
  MAX_EXERCISES,
  MIN_EXERCISES,
  tokenize,
  type BuildExercise,
  type Exercise,
} from './lesson'
import { canPlayLesson, lessonStatuses } from './progress'
import { seededRng } from './random'

function allLessons() {
  return content.tracks.flatMap((track) => {
    const units = unitsOfTrack(content, track.id)
    return units.flatMap((unit) => unit.lessons.map((lesson) => ({ track, units, unit, lesson })))
  })
}

/** A build exercise must be solvable with its tiles, in exactly one way. */
function checkBuild(ex: BuildExercise) {
  const lang = ex.answerLang === 'en' ? 'en' : 'elvish'
  const answerWords = tokenize(ex.accepted[0]!)
  const bank = [...ex.tiles]
  for (const w of answerWords) {
    const i = bank.indexOf(w)
    expect(i, `${ex.prompt}: tile "${w}" missing`).toBeGreaterThanOrEqual(0)
    bank.splice(i, 1)
  }
  expect(checkBuiltSentence(answerWords, ex.accepted, lang).correct).toBe(true)
  // Leftover tiles are distractors: none may also be a word of any accepted answer.
  const acceptedWords = new Set(ex.accepted.flatMap(tokenize).map((w) => w.toLowerCase()))
  for (const d of bank) expect(acceptedWords.has(d.toLowerCase()), `${ex.prompt}: ${d}`).toBe(false)
  expect(bank.length).toBeGreaterThan(0)
}

function generate(lessonId: string, seed = 1): Exercise[] {
  const entry = allLessons().find((l) => l.lesson.id === lessonId)!
  return generateLesson({
    content,
    trackUnits: entry.units,
    unitId: entry.unit.id,
    lessonId,
    rng: seededRng(seed),
  })
}

describe('generateLesson (every lesson, several seeds)', () => {
  for (const { lesson } of allLessons()) {
    it(`${lesson.id} produces a valid exercise list`, () => {
      for (const seed of [1, 2, 3, 42, 999]) {
        const exercises = generate(lesson.id, seed)
        expect(exercises.length).toBeGreaterThanOrEqual(MIN_EXERCISES)
        expect(exercises.length).toBeLessThanOrEqual(MAX_EXERCISES)
        expect(new Set(exercises.map((e) => e.id)).size).toBe(exercises.length)

        for (const ex of exercises) {
          if (ex.kind === 'choice') {
            expect(ex.options).toContain(ex.answer)
            expect(ex.options.length).toBeGreaterThanOrEqual(2)
            // No duplicated options (after normalisation, so near-duplicates also count).
            expect(new Set(ex.options.map(normalizeEnglish)).size).toBe(ex.options.length)
            // Exactly one option may be correct. Checked independently of the
            // generator: run every option through the real answer checker, which
            // also forgives typos, so near-duplicates are caught too.
            const item = content.items[ex.itemId]
            if (item?.type === 'lexicon') {
              const ok =
                ex.variant === 'elv-en'
                  ? ex.options.filter((o) => checkTypedAnswer(o, item.gloss, 'en').correct)
                  : ex.options.filter((o) => checkTypedAnswer(o, [item.word], 'elvish').correct)
              expect(ok, `${ex.prompt}: ${ex.options.join(' | ')}`).toEqual([ex.answer])
            }
          }
          if (ex.kind === 'match') {
            expect(ex.pairs.length).toBeGreaterThanOrEqual(3)
            expect(new Set(ex.pairs.map((p) => p.left)).size).toBe(ex.pairs.length)
            expect(new Set(ex.pairs.map((p) => p.right)).size).toBe(ex.pairs.length)
            // Each left side must match exactly one right side.
            for (const pair of ex.pairs) {
              const item = content.items[pair.itemId]
              if (item?.type !== 'lexicon') continue
              const fits = ex.pairs.filter(
                (p) => checkTypedAnswer(p.right, item.gloss, 'en').correct,
              )
              expect(
                fits.map((p) => p.right),
                pair.left,
              ).toEqual([pair.right])
            }
          }
          if (ex.kind === 'type') expect(ex.accepted.length).toBeGreaterThan(0)
          if (ex.kind === 'build') checkBuild(ex)
          // Only approved items ever reach a lesson.
          const ids = ex.kind === 'match' ? ex.pairs.map((p) => p.itemId) : [ex.itemId]
          for (const id of ids) expect(content.items[id]?.confidence).toBe('high')
        }
      }
    })
  }

  it('introduces each new word with a recognition exercise before production', () => {
    const exercises = generate('sin-durin-1')
    const firstSeen = new Map<string, Exercise>()
    for (const ex of exercises) {
      if (ex.kind !== 'match' && !firstSeen.has(ex.itemId)) firstSeen.set(ex.itemId, ex)
    }
    for (const ex of firstSeen.values()) {
      expect(ex.kind).toBe('choice')
      if (ex.kind === 'choice') expect(ex.variant).toBe('elv-en')
    }
  })

  it('prefers distractors the learner has already met', () => {
    // Lesson 1 of the first Sindarin unit teaches 4 single words, so every word
    // question can be answered with the other 3 as distractors.
    const lessonWords = new Set(['mellon', 'pedo', 'a', 'minno'])
    const glosses = new Set(['friend', 'speak', 'and', 'enter'])
    for (const seed of [1, 2, 3, 4, 5]) {
      for (const ex of generate('sin-durin-1', seed)) {
        if (ex.kind !== 'choice' || !lessonWords.has(ex.prompt)) continue
        for (const o of ex.options) expect(glosses.has(o), `${ex.prompt}: ${o}`).toBe(true)
      }
    }
  })

  it('is reproducible for the same seed', () => {
    expect(generate('sin-light-1', 7)).toEqual(generate('sin-light-1', 7))
  })

  it('stress options keep syllable order and mark the stressed one', () => {
    const ex = generate('pron-stress-3').find(
      (e) => e.kind === 'choice' && e.variant === 'stress' && e.prompt === 'Ilúvatar',
    )
    expect(ex).toMatchObject({ options: ['I', 'lú', 'va', 'tar'], answer: 'lú' })
  })
})

describe('lessonStatuses', () => {
  const units = unitsOfTrack(content, 'sindarin')
  const [u1, u2] = units
  it('opens only the first lesson at the start', () => {
    const st = lessonStatuses(units, {})
    expect(st[u1!.lessons[0]!.id]).toBe('current')
    expect(st[u1!.lessons[1]!.id]).toBe('locked')
    expect(st[u2!.lessons[0]!.id]).toBe('locked')
  })
  it('opens the next unit only after the whole previous unit', () => {
    const rec = { completions: 1, bestMistakes: 0, lastCompletedDay: '2026-11-25' }
    const allButLast = Object.fromEntries(u1!.lessons.slice(0, -1).map((l) => [l.id, rec]))
    expect(lessonStatuses(units, allButLast)[u2!.lessons[0]!.id]).toBe('locked')
    const all = Object.fromEntries(u1!.lessons.map((l) => [l.id, rec]))
    expect(lessonStatuses(units, all)[u2!.lessons[0]!.id]).toBe('current')
  })
  it('refuses to play a locked lesson (direct URL guard)', () => {
    const rec = { completions: 1, bestMistakes: 0, lastCompletedDay: '2026-11-25' }
    expect(canPlayLesson(units, u2!.lessons.at(-1)!.id, {})).toBe(false)
    expect(canPlayLesson(units, u1!.lessons[1]!.id, {})).toBe(false)
    expect(canPlayLesson(units, u1!.lessons[0]!.id, {})).toBe(true)
    const done = { [u1!.lessons[0]!.id]: rec }
    expect(canPlayLesson(units, u1!.lessons[0]!.id, done)).toBe(true) // replay
    expect(canPlayLesson(units, u1!.lessons[1]!.id, done)).toBe(true)
    expect(canPlayLesson(units, 'no-such-lesson', done)).toBe(false)
  })
})

describe('build exercises', () => {
  it('phrase lessons include sentence building in both directions', () => {
    const kinds = new Set<string>()
    for (const seed of [1, 2, 3]) {
      for (const ex of generate('sin-durin-1', seed)) {
        if (ex.kind === 'build') kinds.add(ex.answerLang)
      }
    }
    expect(kinds).toEqual(new Set(['en', 'sindarin']))
  })

  it('rejects the right words in the wrong order', () => {
    expect(
      checkBuiltSentence(['friend', 'speak', 'and', 'enter'], ['speak, friend, and enter'], 'en')
        .correct,
    ).toBe(false)
    expect(
      checkBuiltSentence(['speak', 'friend', 'and', 'enter'], ['speak, friend, and enter'], 'en')
        .correct,
    ).toBe(true)
  })

  it('tokenize drops punctuation but keeps hyphens and accents', () => {
    expect(tokenize('I, Narvi, made them.')).toEqual(['I', 'Narvi', 'made', 'them'])
    expect(tokenize('true-silver Annûn')).toEqual(['true-silver', 'Annûn'])
  })
})

describe('generatePractice', () => {
  const ids = ['sin-mellon', 'sin-pedo-mellon-a-minno', 'pr-cons-c', 'pr-stress-iluvatar']
  it('makes exactly one valid exercise per available item, in order', () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const exs = generatePractice({
        content,
        itemIds: ids,
        known: new Set(ids),
        rng: seededRng(seed),
      })
      expect(exs.map((e) => (e.kind === 'match' ? '' : e.itemId))).toEqual(ids)
      for (const ex of exs) {
        if (ex.kind === 'build') checkBuild(ex)
        if (ex.kind === 'choice') expect(ex.options).toContain(ex.answer)
      }
    }
  })
  it('skips items that no longer exist or are back in review', () => {
    const exs = generatePractice({
      content,
      itemIds: ['sin-mellon', 'gone', 'sin-mae-govannen'],
      known: new Set(),
      rng: seededRng(1),
    })
    expect(exs).toHaveLength(1)
  })
})
