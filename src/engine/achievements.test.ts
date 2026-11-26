import { describe, expect, it } from 'vitest'
import { content } from '../content'
import type { Achievement } from '../content/schema'
import { achievementProgress, newlyEarned, type AchievementSnapshot } from './achievements'

const empty: AchievementSnapshot = {
  completed: {},
  units: content.units,
  tracks: content.tracks,
  longestStreak: 0,
  xpTotal: 0,
  perfectLessons: 0,
  practiceSessions: 0,
}
const rec = { completions: 1, bestMistakes: 0, lastCompletedDay: '2026-11-25' }
const find = (id: string) => content.achievements.find((a) => a.id === id)!

describe('achievements', () => {
  it('nothing is earned at the start', () => {
    expect(newlyEarned(content.achievements, empty, {})).toEqual([])
  })

  it('Elf-friend needs every lesson of The Doors of Durin', () => {
    const unit = content.units['sin-doors-of-durin']!
    const allButOne = Object.fromEntries(unit.lessons.slice(1).map((l) => [l.id, rec]))
    const all = Object.fromEntries(unit.lessons.map((l) => [l.id, rec]))
    expect(achievementProgress(find('elf-friend'), { ...empty, completed: allButOne })).toEqual({
      current: unit.lessons.length - 1,
      target: unit.lessons.length,
      earned: false,
    })
    expect(achievementProgress(find('elf-friend'), { ...empty, completed: all }).earned).toBe(true)
  })

  it('track achievements need every unit of the track', () => {
    const units = content.tracks.find((t) => t.id === 'pronunciation')!.units
    const lessons = units.flatMap((u) => content.units[u]!.lessons)
    const all = Object.fromEntries(lessons.map((l) => [l.id, rec]))
    const most = Object.fromEntries(lessons.slice(0, -1).map((l) => [l.id, rec]))
    expect(achievementProgress(find('clear-voice'), { ...empty, completed: most }).earned).toBe(
      false,
    )
    expect(achievementProgress(find('clear-voice'), { ...empty, completed: all }).earned).toBe(true)
  })

  it('an empty ("coming soon") track can never be completed', () => {
    const a: Achievement = {
      id: 'x',
      title: 'X',
      description: 'X',
      kind: 'track',
      target: 'quenya',
    }
    expect(achievementProgress(a, empty).earned).toBe(false)
  })

  it('counts thresholds and caps progress at the target', () => {
    expect(achievementProgress(find('kindled-lamp'), { ...empty, longestStreak: 2 })).toEqual({
      current: 2,
      target: 3,
      earned: false,
    })
    expect(achievementProgress(find('waybread'), { ...empty, xpTotal: 250 })).toEqual({
      current: 100,
      target: 100,
      earned: true,
    })
  })

  it('reports each achievement only once', () => {
    const snap = { ...empty, xpTotal: 600 }
    const first = newlyEarned(content.achievements, snap, {})
    expect(first).toEqual(expect.arrayContaining(['waybread', 'loremaster']))
    const earned = Object.fromEntries(first.map((id) => [id, '2026-11-25']))
    expect(newlyEarned(content.achievements, snap, earned)).toEqual([])
  })

  it('every unit/track achievement points at real content', () => {
    for (const a of content.achievements) {
      if (a.kind === 'unit') expect(content.units[a.target], a.id).toBeDefined()
      if (a.kind === 'track')
        expect(
          content.tracks.some((t) => t.id === a.target),
          a.id,
        ).toBe(true)
    }
  })
})
