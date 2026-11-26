import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { content as defaultContent, type Content } from '../content'
import { newlyEarned } from '../engine/achievements'
import { todayKey, type DayKey } from '../engine/dates'
import {
  HEARTS_PER_PRACTICE,
  heartsToday,
  initialHearts,
  loseHeart,
  refillHearts,
  type HeartsState,
} from '../engine/hearts'
import type { CompletedLessons } from '../engine/progress'
import { qualityOf, recordLessonMistake, review, type Deck } from '../engine/srs'
import { initialStreak, registerActivity, type StreakState } from '../engine/streak'
import { addXpForDay, DEFAULT_DAILY_GOAL, lessonXp, XP_PRACTICE } from '../engine/xp'

export interface LessonResult {
  lessonId: string
  mistakes: number
}

export type AnswerResult = 'correct' | 'typo' | 'wrong'

export interface PracticeResult {
  /** First-attempt result for each reviewed item. */
  results: Record<string, AnswerResult>
  mistakes: number
}

export interface SessionReward {
  kind: 'lesson' | 'practice'
  xp: number
  perfect: boolean
  firstTime: boolean
  streak: number
  streakExtended: boolean
  freezesUsed: number
  freezeEarned: boolean
  streakReset: boolean
  dailyGoalReachedNow: boolean
  /** Hearts won back (practice only). */
  heartsRefilled: number
  /** Ids of achievements unlocked by this session. */
  achievements: string[]
}

export interface ProgressData {
  xpTotal: number
  xpByDay: Record<DayKey, number>
  dailyGoal: number
  completed: CompletedLessons
  streak: StreakState
  hearts: HeartsState
  deck: Deck
  /** Achievement id → day it was earned. */
  achievements: Record<string, DayKey>
  stats: { practiceSessions: number }
}

interface ProgressActions {
  completeLesson: (result: LessonResult, today?: DayKey) => SessionReward
  /**
   * A wrong answer in a lesson. Saved immediately (not at the end of the lesson)
   * so that quitting or running out of hearts never loses it: every heart lost
   * always leaves something to practise.
   */
  recordMistake: (itemId: string, today?: DayKey) => void
  completePractice: (result: PracticeResult, today?: DayKey) => SessionReward
  /** Spend one heart; returns how many are left today. */
  loseHeart: (today?: DayKey) => number
  setDailyGoal: (xp: number) => void
  resetProgress: () => void
}

export type ProgressState = ProgressData & ProgressActions

export const initialProgress: ProgressData = {
  xpTotal: 0,
  xpByDay: {},
  dailyGoal: DEFAULT_DAILY_GOAL,
  completed: {},
  streak: initialStreak,
  hearts: initialHearts,
  deck: {},
  achievements: {},
  stats: { practiceSessions: 0 },
}

/** Distinct lessons whose best run had no mistakes (repeats do not count twice). */
export function perfectLessonCount(completed: CompletedLessons): number {
  return Object.values(completed).filter((r) => r.bestMistakes === 0).length
}

function snapshotOf(data: ProgressData, content: Content) {
  return {
    completed: data.completed,
    units: content.units,
    tracks: content.tracks,
    longestStreak: data.streak.longest,
    xpTotal: data.xpTotal,
    perfectLessons: perfectLessonCount(data.completed),
    practiceSessions: data.stats.practiceSessions,
  }
}

/** XP, streak, daily goal and achievements shared by lessons and practice. */
function finishSession(
  state: ProgressData,
  next: ProgressData,
  xp: number,
  today: DayKey,
  content: Content,
) {
  const before = state.xpByDay[today] ?? 0
  const xpByDay = addXpForDay(state.xpByDay, today, xp)
  const after = xpByDay[today] ?? 0
  const streakUpdate = registerActivity(state.streak, today)
  const withXp: ProgressData = {
    ...next,
    xpTotal: state.xpTotal + xp,
    xpByDay,
    streak: streakUpdate.state,
  }
  const earned = newlyEarned(content.achievements, snapshotOf(withXp, content), state.achievements)
  const final: ProgressData = {
    ...withXp,
    achievements: { ...state.achievements, ...Object.fromEntries(earned.map((id) => [id, today])) },
  }
  return {
    final,
    shared: {
      xp,
      streak: streakUpdate.state.count,
      // True on the first session of the day, unless the streak had to restart.
      streakExtended: streakUpdate.state.count > state.streak.count,
      freezesUsed: streakUpdate.freezesUsed,
      freezeEarned: streakUpdate.freezeEarned,
      streakReset: streakUpdate.reset,
      dailyGoalReachedNow: before < state.dailyGoal && after >= state.dailyGoal,
      achievements: earned,
    },
  }
}

/** Pure reducer, kept separate from zustand so it is easy to test. */
export function applyLessonResult(
  state: ProgressData,
  result: LessonResult,
  today: DayKey,
  content: Content = defaultContent,
): { next: ProgressData; reward: SessionReward } {
  const previous = state.completed[result.lessonId]
  const firstTime = !previous
  const perfect = result.mistakes === 0
  const next: ProgressData = {
    ...state,
    completed: {
      ...state.completed,
      [result.lessonId]: {
        completions: (previous?.completions ?? 0) + 1,
        bestMistakes: Math.min(previous?.bestMistakes ?? Infinity, result.mistakes),
        lastCompletedDay: today,
      },
    },
  }
  const { final, shared } = finishSession(
    state,
    next,
    lessonXp({ firstTime, perfect }),
    today,
    content,
  )
  return {
    next: final,
    reward: { ...shared, kind: 'lesson', perfect, firstTime, heartsRefilled: 0 },
  }
}

export function applyPracticeResult(
  state: ProgressData,
  result: PracticeResult,
  today: DayKey,
  content: Content = defaultContent,
): { next: ProgressData; reward: SessionReward } {
  const deck = { ...state.deck }
  for (const [itemId, answer] of Object.entries(result.results)) {
    const card = deck[itemId]
    if (card && card.due <= today) {
      // A scheduled review.
      deck[itemId] = review(card, qualityOf(answer), today)
    } else if (answer === 'wrong') {
      // A miss in general review: new card, or an early card that is reset.
      deck[itemId] = recordLessonMistake(card, today)
    }
    // A right answer to a card that is not due yet (general review) leaves its
    // schedule alone, so reviewing early cannot push it further ahead.
  }
  const heartsBefore = heartsToday(state.hearts, today)
  const hearts = refillHearts(state.hearts, today, HEARTS_PER_PRACTICE)
  const next: ProgressData = {
    ...state,
    deck,
    hearts,
    stats: { ...state.stats, practiceSessions: state.stats.practiceSessions + 1 },
  }
  const { final, shared } = finishSession(state, next, XP_PRACTICE, today, content)
  return {
    next: final,
    reward: {
      ...shared,
      kind: 'practice',
      perfect: result.mistakes === 0,
      firstTime: false,
      heartsRefilled: hearts.count - heartsBefore,
    },
  }
}

export const STORAGE_KEY = 'lembas-progress'
export const STORAGE_VERSION = 2

/**
 * Fills in any missing or malformed field with its default, one level down too,
 * so a partial save can never produce NaN counters or undefined objects.
 */
export function sanitize(saved: unknown): ProgressData {
  const old = (saved && typeof saved === 'object' ? saved : {}) as Partial<ProgressData>
  const obj = <T extends object>(value: unknown, fallback: T): T =>
    value && typeof value === 'object' ? { ...fallback, ...(value as Partial<T>) } : fallback
  const num = (value: unknown, fallback: number) =>
    typeof value === 'number' && Number.isFinite(value) ? value : fallback
  return {
    xpTotal: num(old.xpTotal, 0),
    xpByDay: obj(old.xpByDay, {}),
    dailyGoal: num(old.dailyGoal, DEFAULT_DAILY_GOAL),
    completed: obj(old.completed, {}),
    streak: obj(old.streak, initialStreak),
    hearts: obj(old.hearts, initialHearts),
    deck: obj(old.deck, {}),
    achievements: obj(old.achievements, {}),
    stats: { practiceSessions: num(old.stats?.practiceSessions, 0) },
  }
}

/** Upgrades data saved by older versions of the app. Never drops progress. */
export function migrate(
  persisted: unknown,
  version: number,
  today: DayKey = todayKey(),
  content: Content = defaultContent,
): ProgressData {
  const data = sanitize(persisted)
  if (version < 2) {
    // Award what the learner had already achieved before achievements existed.
    const earned = newlyEarned(content.achievements, snapshotOf(data, content), {})
    data.achievements = Object.fromEntries(earned.map((id) => [id, today]))
  }
  return data
}

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      ...initialProgress,
      completeLesson: (result, today = todayKey()) => {
        const { next, reward } = applyLessonResult(get(), result, today)
        set(next)
        return reward
      },
      recordMistake: (itemId, today = todayKey()) => {
        const deck = get().deck
        set({ deck: { ...deck, [itemId]: recordLessonMistake(deck[itemId], today) } })
      },
      completePractice: (result, today = todayKey()) => {
        const { next, reward } = applyPracticeResult(get(), result, today)
        set(next)
        return reward
      },
      loseHeart: (today = todayKey()) => {
        const hearts = loseHeart(get().hearts, today)
        set({ hearts })
        return hearts.count
      },
      setDailyGoal: (xp) => set({ dailyGoal: xp }),
      resetProgress: () => set({ ...initialProgress }),
    }),
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      migrate: (persisted, version) => migrate(persisted, version),
      // Also repair partial saves of the current version.
      merge: (persisted, current) => ({ ...current, ...sanitize(persisted) }),
      storage: createJSONStorage(() => localStorage),
      partialize: (s): ProgressData => ({
        xpTotal: s.xpTotal,
        xpByDay: s.xpByDay,
        dailyGoal: s.dailyGoal,
        completed: s.completed,
        streak: s.streak,
        hearts: s.hearts,
        deck: s.deck,
        achievements: s.achievements,
        stats: s.stats,
      }),
    },
  ),
)

/** Ask the browser not to evict our storage (helps on iOS). Safe to call often. */
export function requestPersistentStorage(): void {
  if (typeof navigator !== 'undefined' && navigator.storage?.persist) {
    navigator.storage.persist().catch(() => undefined)
  }
}
