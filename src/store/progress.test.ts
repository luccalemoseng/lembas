import { beforeEach, describe, expect, it } from 'vitest'
import {
  XP_HISTORY_DAYS,
  XP_LESSON_FIRST,
  XP_LESSON_REPEAT,
  XP_PERFECT_BONUS,
  addXpForDay,
  XP_PRACTICE,
} from '../engine/xp'
import { dueItems } from '../engine/srs'
import {
  applyLessonResult,
  applyPracticeResult,
  initialProgress,
  migrate,
  perfectLessonCount,
  sanitize,
  STORAGE_KEY,
  useProgress,
} from './progress'

describe('applyLessonResult', () => {
  it('awards first-time XP plus perfect bonus', () => {
    const { next, reward } = applyLessonResult(
      initialProgress,
      { lessonId: 'l1', mistakes: 0 },
      '2026-11-25',
    )
    expect(reward.xp).toBe(XP_LESSON_FIRST + XP_PERFECT_BONUS)
    expect(reward.perfect).toBe(true)
    expect(next.xpTotal).toBe(reward.xp)
    expect(next.xpByDay['2026-11-25']).toBe(reward.xp)
    expect(next.completed.l1).toEqual({
      completions: 1,
      bestMistakes: 0,
      lastCompletedDay: '2026-11-25',
    })
  })
  it('awards less XP on a repeat and no bonus with mistakes', () => {
    const first = applyLessonResult(
      initialProgress,
      { lessonId: 'l1', mistakes: 0 },
      '2026-11-25',
    ).next
    const { next, reward } = applyLessonResult(first, { lessonId: 'l1', mistakes: 2 }, '2026-11-25')
    expect(reward.xp).toBe(XP_LESSON_REPEAT)
    expect(reward.firstTime).toBe(false)
    expect(next.completed.l1).toMatchObject({ completions: 2, bestMistakes: 0 })
  })
  it('reports the daily goal only at the moment it is crossed', () => {
    const goal = { ...initialProgress, dailyGoal: 20 }
    const a = applyLessonResult(goal, { lessonId: 'l1', mistakes: 1 }, '2026-11-25') // 10 XP
    expect(a.reward.dailyGoalReachedNow).toBe(false)
    const b = applyLessonResult(a.next, { lessonId: 'l2', mistakes: 1 }, '2026-11-25') // 20 XP
    expect(b.reward.dailyGoalReachedNow).toBe(true)
    const c = applyLessonResult(b.next, { lessonId: 'l3', mistakes: 1 }, '2026-11-25') // 30 XP
    expect(c.reward.dailyGoalReachedNow).toBe(false)
  })
  it('extends the streak only once per day', () => {
    const a = applyLessonResult(initialProgress, { lessonId: 'l1', mistakes: 0 }, '2026-11-25')
    expect(a.reward).toMatchObject({ streak: 1, streakExtended: true })
    const b = applyLessonResult(a.next, { lessonId: 'l2', mistakes: 0 }, '2026-11-25')
    expect(b.reward).toMatchObject({ streak: 1, streakExtended: false })
    const c = applyLessonResult(b.next, { lessonId: 'l3', mistakes: 0 }, '2026-11-26')
    expect(c.reward).toMatchObject({ streak: 2, streakExtended: true })
  })
  it('does not call a reset streak "extended"', () => {
    const state = {
      ...initialProgress,
      streak: { count: 5, lastActiveDay: '2026-11-01', freezes: 0, longest: 5 },
    }
    const { reward } = applyLessonResult(state, { lessonId: 'l1', mistakes: 0 }, '2026-11-25')
    expect(reward).toMatchObject({ streak: 1, streakReset: true, streakExtended: false })
  })
})

describe('addXpForDay', () => {
  it(`keeps only the last ${XP_HISTORY_DAYS} days`, () => {
    const h = addXpForDay({ '2026-01-01': 50, '2026-11-20': 10 }, '2026-11-25', 5)
    expect(h).toEqual({ '2026-11-20': 10, '2026-11-25': 5 })
  })
})

describe('persistence', () => {
  beforeEach(() => {
    localStorage.clear()
    useProgress.getState().resetProgress()
  })
  it('writes progress to localStorage so closing the app keeps it', () => {
    useProgress.getState().completeLesson({ lessonId: 'pron-vowels-1', mistakes: 0 }, '2026-11-25')
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    expect(saved.state.completed['pron-vowels-1'].completions).toBe(1)
    expect(saved.state.xpTotal).toBe(XP_LESSON_FIRST + XP_PERFECT_BONUS)
    // Functions are not persisted.
    expect(saved.state.completeLesson).toBeUndefined()
  })
  it('restores progress from localStorage', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ state: { ...initialProgress, xpTotal: 123 }, version: 1 }),
    )
    await useProgress.persist.rehydrate()
    expect(useProgress.getState().xpTotal).toBe(123)
  })
})

describe('Phase 2: deck, hearts, practice, achievements', () => {
  const T = '2026-11-25'

  it('a lesson mistake enters the review deck at once, due today', () => {
    useProgress.getState().resetProgress()
    useProgress.getState().recordMistake('sin-mellon', T)
    expect(useProgress.getState().deck['sin-mellon']).toMatchObject({ due: T, lapses: 1 })
  })

  it('counts perfect lessons and unlocks "Setting Out" on the first lesson', () => {
    const { next, reward } = applyLessonResult(
      initialProgress,
      { lessonId: 'pron-vowels-1', mistakes: 0 },
      T,
    )
    expect(perfectLessonCount(next.completed)).toBe(1)
    expect(reward.achievements).toContain('setting-out')
    expect(next.achievements['setting-out']).toBe(T)
    const again = applyLessonResult(next, { lessonId: 'pron-vowels-1', mistakes: 0 }, T)
    expect(again.reward.achievements).not.toContain('setting-out')
  })

  it('practice reviews due cards, refills a heart and gives XP', () => {
    const state = {
      ...initialProgress,
      hearts: { count: 0, day: T },
      deck: { 'sin-mellon': { ease: 2.5, interval: 0, reps: 0, due: T, lapses: 1 } },
    }
    const { next, reward } = applyPracticeResult(
      state,
      { results: { 'sin-mellon': 'correct' }, mistakes: 0 },
      T,
    )
    expect(next.deck['sin-mellon']).toMatchObject({ reps: 1, due: '2026-11-26' })
    expect(next.hearts).toEqual({ count: 1, day: T })
    expect(reward).toMatchObject({ kind: 'practice', heartsRefilled: 1, xp: XP_PRACTICE })
    expect(next.stats.practiceSessions).toBe(1)
    expect(reward.achievements).toContain('second-look')
  })

  it('practice reports 0 hearts refilled when already full', () => {
    const { reward } = applyPracticeResult(initialProgress, { results: {}, mistakes: 0 }, T)
    expect(reward.heartsRefilled).toBe(0)
  })

  it('general review adds only missed items to the deck', () => {
    const { next } = applyPracticeResult(
      initialProgress,
      { results: { 'sin-mellon': 'correct', 'sin-pedo': 'wrong' }, mistakes: 1 },
      T,
    )
    expect(Object.keys(next.deck)).toEqual(['sin-pedo'])
  })

  it('running out of hearts and quitting still leaves the misses to practise', () => {
    // Mirrors what SessionRunner does on each wrong answer in a lesson.
    useProgress.getState().resetProgress()
    const items = ['pr-vowel-a', 'pr-vowel-e', 'pr-vowel-i', 'pr-vowel-o', 'pr-vowel-u']
    for (const id of items) {
      useProgress.getState().loseHeart(T)
      useProgress.getState().recordMistake(id, T)
    }
    // The learner quits here: no completeLesson call.
    const s = useProgress.getState()
    expect(s.hearts.count).toBe(0)
    expect(dueItems(s.deck, T).sort()).toEqual([...items].sort())
    expect(s.xpTotal).toBe(0)
    expect(s.completed).toEqual({})
  })

  it('True-silver needs 5 different perfect lessons, not 5 repeats of one', () => {
    let state = initialProgress
    for (let i = 0; i < 5; i++) {
      state = applyLessonResult(state, { lessonId: 'pron-vowels-1', mistakes: 0 }, T).next
    }
    expect(state.achievements['true-silver']).toBeUndefined()
    for (const id of ['pron-vowels-2', 'pron-vowels-3', 'pron-vowels-4', 'pron-consonants-1']) {
      state = applyLessonResult(state, { lessonId: id, mistakes: 0 }, T).next
    }
    expect(state.achievements['true-silver']).toBe(T)
  })

  it('general review leaves a not-yet-due card alone when answered right', () => {
    const card = { ease: 2.5, interval: 1, reps: 1, due: '2026-11-26', lapses: 1 }
    const state = { ...initialProgress, deck: { 'sin-mellon': card } }
    const ok = applyPracticeResult(state, { results: { 'sin-mellon': 'correct' }, mistakes: 0 }, T)
    expect(ok.next.deck['sin-mellon']).toEqual(card)
    const miss = applyPracticeResult(state, { results: { 'sin-mellon': 'wrong' }, mistakes: 1 }, T)
    expect(miss.next.deck['sin-mellon']).toMatchObject({ due: T, lapses: 2, reps: 0 })
  })
})

describe('migration', () => {
  it('upgrades version 1 data without losing progress', () => {
    const v1 = {
      xpTotal: 40,
      xpByDay: { '2026-11-25': 40 },
      dailyGoal: 30,
      completed: {
        a: { completions: 1, bestMistakes: 0, lastCompletedDay: '2026-11-25' },
        b: { completions: 2, bestMistakes: 3, lastCompletedDay: '2026-11-25' },
      },
      streak: { count: 2, lastActiveDay: '2026-11-25', freezes: 1, longest: 2 },
    }
    const v2 = migrate(v1, 1, '2026-11-26')
    expect(v2).toMatchObject(v1)
    expect(v2.hearts).toEqual(initialProgress.hearts)
    expect(v2.deck).toEqual({})
    // Lesson "a" was completed, so "Setting Out" is awarded at migration.
    expect(v2.achievements).toEqual({ 'setting-out': '2026-11-26' })
    expect(v2.stats).toEqual({ practiceSessions: 0 })
  })

  it('rehydrates version 1 data from localStorage through the store', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        state: {
          xpTotal: 77,
          xpByDay: {},
          dailyGoal: 20,
          completed: {},
          streak: { count: 0, lastActiveDay: null, freezes: 1, longest: 0 },
        },
      }),
    )
    await useProgress.persist.rehydrate()
    const s = useProgress.getState()
    expect(s.xpTotal).toBe(77)
    expect(s.hearts.count).toBe(5)
    expect(s.stats.practiceSessions).toBe(0)
  })
  it('a v1 learner who finished The Doors of Durin gets Elf-friend on upgrade', () => {
    const rec = { completions: 1, bestMistakes: 1, lastCompletedDay: '2026-11-25' }
    const completed = Object.fromEntries(
      ['sin-durin-1', 'sin-durin-2', 'sin-durin-3', 'sin-durin-4', 'sin-durin-5'].map((id) => [
        id,
        rec,
      ]),
    )
    const v2 = migrate({ ...initialProgress, completed }, 1, '2026-11-26')
    expect(v2.achievements['elf-friend']).toBe('2026-11-26')
  })

  it('repairs partial saves so counters never become NaN', () => {
    const fixed = sanitize({ xpTotal: 'oops', stats: {}, hearts: { count: 2 }, streak: null })
    expect(fixed.xpTotal).toBe(0)
    expect(fixed.stats.practiceSessions).toBe(0)
    expect(fixed.hearts).toEqual({ count: 2, day: null })
    expect(fixed.streak).toEqual(initialProgress.streak)
    expect(
      applyPracticeResult(fixed, { results: {}, mistakes: 0 }, '2026-11-25').next.stats,
    ).toEqual({ practiceSessions: 1 })
  })
})
