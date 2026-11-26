import type { DayKey } from './dates'

export const MAX_HEARTS = 5
/** Hearts won back by finishing a practice session. */
export const HEARTS_PER_PRACTICE = 1

export interface HeartsState {
  count: number
  /** The day `count` refers to. On a new day the learner has a full set again. */
  day: DayKey | null
}

export const initialHearts: HeartsState = { count: MAX_HEARTS, day: null }

/** Hearts available today (a new day means a full set). */
export function heartsToday(state: HeartsState, today: DayKey): number {
  return state.day === today ? state.count : MAX_HEARTS
}

/** One mistake in a lesson. Never goes below zero. */
export function loseHeart(state: HeartsState, today: DayKey): HeartsState {
  return { count: Math.max(0, heartsToday(state, today) - 1), day: today }
}

/** Practice refills hearts, up to the maximum. */
export function refillHearts(state: HeartsState, today: DayKey, amount: number): HeartsState {
  return { count: Math.min(MAX_HEARTS, heartsToday(state, today) + amount), day: today }
}
