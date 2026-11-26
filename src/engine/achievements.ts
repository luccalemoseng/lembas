import type { Achievement, Track, Unit } from '../content/schema'
import type { CompletedLessons } from './progress'
import { isUnitComplete } from './progress'

/** Everything an achievement condition can look at. */
export interface AchievementSnapshot {
  completed: CompletedLessons
  units: Record<string, Unit>
  tracks: Track[]
  longestStreak: number
  xpTotal: number
  perfectLessons: number
  practiceSessions: number
}

export interface AchievementProgress {
  current: number
  target: number
  earned: boolean
}

export function achievementProgress(a: Achievement, s: AchievementSnapshot): AchievementProgress {
  switch (a.kind) {
    case 'lessons':
      return ratio(Object.keys(s.completed).length, a.target)
    case 'perfectLessons':
      return ratio(s.perfectLessons, a.target)
    case 'streak':
      return ratio(s.longestStreak, a.target)
    case 'xp':
      return ratio(s.xpTotal, a.target)
    case 'practiceSessions':
      return ratio(s.practiceSessions, a.target)
    case 'unit': {
      const unit = s.units[a.target]
      if (!unit || unit.lessons.length === 0) return ratio(0, 1)
      const done = unit.lessons.filter((l) => s.completed[l.id]).length
      return ratio(done, unit.lessons.length)
    }
    case 'track': {
      const track = s.tracks.find((t) => t.id === a.target)
      const units = (track?.units ?? []).map((id) => s.units[id]).filter((u): u is Unit => !!u)
      // An empty track (e.g. "coming soon") can never be completed.
      if (units.length === 0) return ratio(0, 1)
      const done = units.filter((u) => isUnitComplete(u, s.completed)).length
      return ratio(done, units.length)
    }
  }
}

function ratio(current: number, target: number): AchievementProgress {
  return { current: Math.min(current, target), target, earned: current >= target }
}

/** Ids of achievements earned in `snapshot` that are not yet in `alreadyEarned`. */
export function newlyEarned(
  all: Achievement[],
  snapshot: AchievementSnapshot,
  alreadyEarned: Record<string, string>,
): string[] {
  return all
    .filter((a) => !alreadyEarned[a.id] && achievementProgress(a, snapshot).earned)
    .map((a) => a.id)
}
