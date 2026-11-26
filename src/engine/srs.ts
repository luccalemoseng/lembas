import { addDays, type DayKey } from './dates'

/**
 * Simplified SM-2 spaced repetition.
 *
 * Only items the learner got wrong in a lesson enter the review deck. Each card
 * is then scheduled with SM-2: the interval grows by the card's "ease" after
 * every successful review and collapses back to one day after a miss.
 */
export interface Card {
  /** SM-2 easiness factor, never below MIN_EASE. */
  ease: number
  /** Days until the next review after the last one. */
  interval: number
  /** Successful reviews in a row. */
  reps: number
  due: DayKey
  lapses: number
}

export type Deck = Record<string, Card>

/** Answer quality on the SM-2 0–5 scale. */
export type Quality = 0 | 1 | 2 | 3 | 4 | 5

export const DEFAULT_EASE = 2.5
export const MIN_EASE = 1.3
/** Penalty to ease when an item is missed. */
export const LAPSE_EASE_PENALTY = 0.2
/** Intervals for the first and second successful review (SM-2 uses 1 and 6; we use 1 and 3). */
export const FIRST_INTERVAL = 1
export const SECOND_INTERVAL = 3
/** Maximum cards per practice session. */
export const PRACTICE_SIZE = 10

/** Quality for an answer: right first time = 4, right with a typo = 3, wrong = 1. */
export function qualityOf(result: 'correct' | 'typo' | 'wrong'): Quality {
  return result === 'correct' ? 4 : result === 'typo' ? 3 : 1
}

/**
 * A mistake made during a lesson. The card is due immediately, so the learner
 * can practise it (and win back hearts) the same day.
 */
export function recordLessonMistake(card: Card | undefined, today: DayKey): Card {
  if (!card) return { ease: DEFAULT_EASE, interval: 0, reps: 0, due: today, lapses: 1 }
  return {
    ease: Math.max(MIN_EASE, card.ease - LAPSE_EASE_PENALTY),
    interval: 0,
    reps: 0,
    due: today,
    lapses: card.lapses + 1,
  }
}

/** Schedules a card after a practice review. */
export function review(card: Card, quality: Quality, today: DayKey): Card {
  if (quality < 3) {
    return {
      ease: Math.max(MIN_EASE, card.ease - LAPSE_EASE_PENALTY),
      interval: FIRST_INTERVAL,
      reps: 0,
      due: addDays(today, FIRST_INTERVAL),
      lapses: card.lapses + 1,
    }
  }
  const reps = card.reps + 1
  const interval =
    reps === 1
      ? FIRST_INTERVAL
      : reps === 2
        ? SECOND_INTERVAL
        : Math.max(card.interval + 1, Math.round(card.interval * card.ease))
  // Standard SM-2 ease update: q=5 → +0.10, q=4 → ±0, q=3 → −0.14.
  const q = 5 - quality
  const ease = Math.max(MIN_EASE, card.ease + (0.1 - q * (0.08 + q * 0.02)))
  return { ease, interval, reps, due: addDays(today, interval), lapses: card.lapses }
}

/** Item ids due on or before `today`, most overdue first (ties: most lapses first). */
export function dueItems(deck: Deck, today: DayKey): string[] {
  return Object.entries(deck)
    .filter(([, card]) => card.due <= today)
    .sort(([idA, a], [idB, b]) =>
      a.due !== b.due ? (a.due < b.due ? -1 : 1) : b.lapses - a.lapses || (idA < idB ? -1 : 1),
    )
    .map(([id]) => id)
}
