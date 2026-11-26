import { daysBetween, type DayKey } from './dates'

export interface StreakState {
  /** Consecutive days with at least one completed lesson. */
  count: number
  lastActiveDay: DayKey | null
  /** Streak freezes in reserve. Each one covers one missed day. */
  freezes: number
  longest: number
}

export const MAX_FREEZES = 2
/** A freeze is earned every time the streak reaches a multiple of this. */
export const FREEZE_EVERY = 7

export const initialStreak: StreakState = { count: 0, lastActiveDay: null, freezes: 1, longest: 0 }

export interface StreakUpdate {
  state: StreakState
  /** Freezes spent to bridge missed days during this update. */
  freezesUsed: number
  /** True when the streak was broken and restarted at 1. */
  reset: boolean
  /** True when a new freeze was earned. */
  freezeEarned: boolean
}

/**
 * Records activity on `today`. Missed days are covered by freezes if there are
 * enough of them; otherwise the streak restarts. Freezes are only spent when
 * they actually save the streak.
 */
export function registerActivity(state: StreakState, today: DayKey): StreakUpdate {
  const noChange = { state, freezesUsed: 0, reset: false, freezeEarned: false }

  if (state.lastActiveDay === null) {
    return bump({ ...state, count: 0 }, today, 0, false)
  }

  const gap = daysBetween(state.lastActiveDay, today)
  // Same day, or the clock went backwards (time zone change): nothing to do.
  if (gap <= 0) return noChange
  if (gap === 1) return bump(state, today, 0, false)

  const missed = gap - 1
  if (missed <= state.freezes) {
    return bump({ ...state, freezes: state.freezes - missed }, today, missed, false)
  }
  return bump({ ...state, count: 0 }, today, 0, true)
}

function bump(
  state: StreakState,
  today: DayKey,
  freezesUsed: number,
  reset: boolean,
): StreakUpdate {
  const count = state.count + 1
  const earns = count % FREEZE_EVERY === 0 && state.freezes < MAX_FREEZES
  return {
    state: {
      count,
      lastActiveDay: today,
      freezes: earns ? state.freezes + 1 : state.freezes,
      longest: Math.max(state.longest, count),
    },
    freezesUsed,
    reset,
    freezeEarned: earns,
  }
}

/**
 * The streak to show today without mutating anything. Shows 0 when the streak
 * is already lost (more missed days than freezes).
 */
export function currentStreak(state: StreakState, today: DayKey): number {
  if (state.lastActiveDay === null) return 0
  const gap = daysBetween(state.lastActiveDay, today)
  if (gap <= 1) return state.count
  return gap - 1 <= state.freezes ? state.count : 0
}

/** Whether a lesson has already been completed today. */
export function isActiveToday(state: StreakState, today: DayKey): boolean {
  return state.lastActiveDay === today
}
