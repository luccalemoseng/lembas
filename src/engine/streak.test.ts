import { describe, expect, it } from 'vitest'
import { addDays, daysBetween, toDayKey } from './dates'
import {
  currentStreak,
  FREEZE_EVERY,
  initialStreak,
  MAX_FREEZES,
  registerActivity,
  type StreakState,
} from './streak'

const s = (over: Partial<StreakState>): StreakState => ({ ...initialStreak, ...over })

describe('dates', () => {
  it('counts calendar days across a daylight-saving change', () => {
    // Brazil, US and EU DST transitions all fall inside these ranges.
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2)
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2)
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1)
    expect(daysBetween('2028-02-28', '2028-03-01')).toBe(2) // leap year
  })
  it('adds days', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
  it('formats local dates, not UTC', () => {
    // 23:30 local time must still be the same local day.
    expect(toDayKey(new Date(2026, 10, 25, 23, 30))).toBe('2026-11-25')
    expect(toDayKey(new Date(2026, 0, 1, 0, 5))).toBe('2026-01-01')
  })
})

describe('registerActivity', () => {
  it('starts a streak on the first activity', () => {
    const r = registerActivity(initialStreak, '2026-11-25')
    expect(r.state).toMatchObject({ count: 1, lastActiveDay: '2026-11-25', longest: 1 })
  })
  it('does not count twice on the same day', () => {
    const r = registerActivity(s({ count: 3, lastActiveDay: '2026-11-25' }), '2026-11-25')
    expect(r.state.count).toBe(3)
  })
  it('grows on consecutive days', () => {
    const r = registerActivity(s({ count: 3, lastActiveDay: '2026-11-24' }), '2026-11-25')
    expect(r.state.count).toBe(4)
    expect(r.freezesUsed).toBe(0)
  })
  it('uses a freeze to bridge one missed day', () => {
    const r = registerActivity(
      s({ count: 3, lastActiveDay: '2026-11-23', freezes: 1 }),
      '2026-11-25',
    )
    expect(r.state).toMatchObject({ count: 4, freezes: 0 })
    expect(r.freezesUsed).toBe(1)
    expect(r.reset).toBe(false)
  })
  it('uses two freezes for two missed days', () => {
    const r = registerActivity(
      s({ count: 3, lastActiveDay: '2026-11-22', freezes: 2 }),
      '2026-11-25',
    )
    expect(r.state).toMatchObject({ count: 4, freezes: 0 })
  })
  it('resets, and keeps the freezes, when there are not enough of them', () => {
    const r = registerActivity(
      s({ count: 9, lastActiveDay: '2026-11-20', freezes: 2, longest: 9 }),
      '2026-11-25',
    )
    expect(r.state).toMatchObject({ count: 1, freezes: 2, longest: 9 })
    expect(r.reset).toBe(true)
    expect(r.freezesUsed).toBe(0)
  })
  it('ignores the clock going backwards', () => {
    const before = s({ count: 5, lastActiveDay: '2026-11-25' })
    expect(registerActivity(before, '2026-11-24').state).toBe(before)
  })
  it(`earns a freeze every ${FREEZE_EVERY} days, up to ${MAX_FREEZES}`, () => {
    let state = s({ count: 0, freezes: 0, lastActiveDay: null })
    let day = '2026-11-01'
    const earnedAt: number[] = []
    for (let i = 0; i < 21; i++) {
      const r = registerActivity(state, day)
      if (r.freezeEarned) earnedAt.push(r.state.count)
      state = r.state
      day = addDays(day, 1)
    }
    expect(earnedAt).toEqual([7, 14])
    expect(state.freezes).toBe(MAX_FREEZES)
  })
})

describe('currentStreak', () => {
  it('is 0 before any activity', () => {
    expect(currentStreak(initialStreak, '2026-11-25')).toBe(0)
  })
  it('shows the streak today and the day after', () => {
    const st = s({ count: 4, lastActiveDay: '2026-11-24', freezes: 0 })
    expect(currentStreak(st, '2026-11-24')).toBe(4)
    expect(currentStreak(st, '2026-11-25')).toBe(4)
  })
  it('shows the streak while freezes can still cover the gap', () => {
    const st = s({ count: 4, lastActiveDay: '2026-11-22', freezes: 2 })
    expect(currentStreak(st, '2026-11-25')).toBe(4)
  })
  it('shows 0 once the streak is lost', () => {
    const st = s({ count: 4, lastActiveDay: '2026-11-22', freezes: 1 })
    expect(currentStreak(st, '2026-11-25')).toBe(0)
  })
})
