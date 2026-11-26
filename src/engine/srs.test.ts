import { describe, expect, it } from 'vitest'
import { heartsToday, initialHearts, loseHeart, MAX_HEARTS, refillHearts } from './hearts'
import {
  DEFAULT_EASE,
  dueItems,
  FIRST_INTERVAL,
  MIN_EASE,
  qualityOf,
  recordLessonMistake,
  review,
  SECOND_INTERVAL,
  type Card,
} from './srs'

const T = '2026-11-25'

describe('srs: lesson mistakes', () => {
  it('creates a card due today so it can be practised at once', () => {
    expect(recordLessonMistake(undefined, T)).toEqual({
      ease: DEFAULT_EASE,
      interval: 0,
      reps: 0,
      due: T,
      lapses: 1,
    })
  })
  it('resets an existing card and lowers its ease', () => {
    const card: Card = { ease: 2.5, interval: 10, reps: 4, due: '2026-12-05', lapses: 0 }
    expect(recordLessonMistake(card, T)).toEqual({
      ease: 2.3,
      interval: 0,
      reps: 0,
      due: T,
      lapses: 1,
    })
  })
})

describe('srs: review (SM-2)', () => {
  const fresh = recordLessonMistake(undefined, T)

  it('grows intervals 1 → 3 → interval × ease on successive correct answers', () => {
    const r1 = review(fresh, 4, T)
    expect(r1).toMatchObject({ reps: 1, interval: FIRST_INTERVAL, due: '2026-11-26' })
    const r2 = review(r1, 4, '2026-11-26')
    expect(r2).toMatchObject({ reps: 2, interval: SECOND_INTERVAL, due: '2026-11-29' })
    const r3 = review(r2, 4, '2026-11-29')
    expect(r3.interval).toBe(Math.round(SECOND_INTERVAL * r2.ease)) // 3 × 2.5 = 7.5 → 8
    expect(r3.interval).toBe(8)
    expect(r3.due).toBe('2026-12-07')
  })

  it('applies the SM-2 ease formula', () => {
    expect(review(fresh, 5, T).ease).toBeCloseTo(2.6)
    expect(review(fresh, 4, T).ease).toBeCloseTo(2.5)
    expect(review(fresh, 3, T).ease).toBeCloseTo(2.36)
  })

  it('a miss sends the card back to day 1 and counts a lapse', () => {
    const good: Card = { ease: 2.5, interval: 20, reps: 5, due: T, lapses: 0 }
    expect(review(good, 1, T)).toEqual({
      ease: 2.3,
      interval: 1,
      reps: 0,
      due: '2026-11-26',
      lapses: 1,
    })
  })

  it('never lets ease fall below the minimum', () => {
    let card: Card = { ease: 1.4, interval: 1, reps: 0, due: T, lapses: 0 }
    for (let i = 0; i < 5; i++) card = review(card, 1, T)
    expect(card.ease).toBe(MIN_EASE)
    card = review({ ...card, reps: 3 }, 3, T)
    expect(card.ease).toBe(MIN_EASE)
  })

  it('always moves the due date forward after a success', () => {
    // With the minimum ease, round(interval × ease) could equal the interval for
    // small intervals; the interval must still grow.
    const card: Card = { ease: MIN_EASE, interval: 1, reps: 2, due: T, lapses: 3 }
    expect(review(card, 4, T).interval).toBeGreaterThan(1)
  })

  it('maps answer results to quality', () => {
    expect(qualityOf('correct')).toBe(4)
    expect(qualityOf('typo')).toBe(3)
    expect(qualityOf('wrong')).toBe(1)
  })
})

describe('srs: dueItems', () => {
  const c = (due: string, lapses = 0): Card => ({ ease: 2.5, interval: 1, reps: 1, due, lapses })
  it('returns only due cards, most overdue first, ties broken by lapses', () => {
    const deck = {
      future: c('2026-11-26'),
      today: c(T),
      old: c('2026-11-20'),
      todayHard: c(T, 3),
    }
    expect(dueItems(deck, T)).toEqual(['old', 'todayHard', 'today'])
  })
})

describe('hearts', () => {
  it('starts full and refills on a new day', () => {
    expect(heartsToday(initialHearts, T)).toBe(MAX_HEARTS)
    expect(heartsToday({ count: 0, day: '2026-11-24' }, T)).toBe(MAX_HEARTS)
  })
  it('loses one per mistake and never goes negative', () => {
    let h = initialHearts
    for (let i = 0; i < 7; i++) h = loseHeart(h, T)
    expect(heartsToday(h, T)).toBe(0)
  })
  it('a mistake on a new day starts from a full set', () => {
    expect(heartsToday(loseHeart({ count: 1, day: '2026-11-24' }, T), T)).toBe(MAX_HEARTS - 1)
  })
  it('practice refills up to the maximum', () => {
    expect(heartsToday(refillHearts({ count: 0, day: T }, T, 1), T)).toBe(1)
    expect(heartsToday(refillHearts({ count: MAX_HEARTS, day: T }, T, 1), T)).toBe(MAX_HEARTS)
  })
})
