import { addDays, type DayKey } from './dates'

export const XP_LESSON_FIRST = 10
export const XP_LESSON_REPEAT = 5
export const XP_PERFECT_BONUS = 5
/** XP for finishing a practice (review) session. */
export const XP_PRACTICE = 5

export const DAILY_GOAL_OPTIONS = [10, 20, 30, 50] as const
export const DEFAULT_DAILY_GOAL = 20

/** How many days of per-day XP history to keep. */
export const XP_HISTORY_DAYS = 30

export function lessonXp({ firstTime, perfect }: { firstTime: boolean; perfect: boolean }): number {
  return (firstTime ? XP_LESSON_FIRST : XP_LESSON_REPEAT) + (perfect ? XP_PERFECT_BONUS : 0)
}

export function addXpForDay(
  history: Record<DayKey, number>,
  today: DayKey,
  xp: number,
): Record<DayKey, number> {
  const next: Record<DayKey, number> = { ...history, [today]: (history[today] ?? 0) + xp }
  const cutoff = addDays(today, -(XP_HISTORY_DAYS - 1))
  for (const day of Object.keys(next)) {
    // DayKeys sort lexicographically in date order.
    if (day < cutoff) delete next[day]
  }
  return next
}
