import type { Unit } from '../content/schema'

export interface LessonRecord {
  completions: number
  /** Fewest mistakes in any completion. */
  bestMistakes: number
  lastCompletedDay: string
}

export type CompletedLessons = Record<string, LessonRecord>

export type LessonStatus = 'locked' | 'current' | 'completed'

export function isUnitComplete(unit: Unit, completed: CompletedLessons): boolean {
  return unit.lessons.every((l) => completed[l.id])
}

/**
 * Lessons unlock strictly in order within a track: a unit opens only when the
 * previous unit is finished, and a lesson only when the previous lesson is.
 */
export function lessonStatuses(
  trackUnits: Unit[],
  completed: CompletedLessons,
): Record<string, LessonStatus> {
  const statuses: Record<string, LessonStatus> = {}
  let previousDone = true
  for (const unit of trackUnits) {
    for (const lesson of unit.lessons) {
      if (completed[lesson.id]) {
        // A completed lesson stays open even if content changes reorder things.
        statuses[lesson.id] = 'completed'
        previousDone = true
      } else {
        statuses[lesson.id] = previousDone ? 'current' : 'locked'
        previousDone = false
      }
    }
  }
  return statuses
}

export function isUnitUnlocked(trackUnits: Unit[], unitId: string, completed: CompletedLessons) {
  const index = trackUnits.findIndex((u) => u.id === unitId)
  if (index < 0) return false
  return trackUnits.slice(0, index).every((u) => isUnitComplete(u, completed))
}

/**
 * Whether a lesson may be played. Guards direct URLs such as /lesson/<id>, so a
 * locked lesson cannot be completed (and earn XP) by typing its address.
 */
export function canPlayLesson(
  trackUnits: Unit[],
  lessonId: string,
  completed: CompletedLessons,
): boolean {
  const status = lessonStatuses(trackUnits, completed)[lessonId]
  return status === 'current' || status === 'completed'
}

/** Ids of approved items taught in lessons the learner has completed. */
export function learnedItemIds(units: Record<string, Unit>, completed: CompletedLessons): string[] {
  const ids = new Set<string>()
  for (const unit of Object.values(units)) {
    for (const lesson of unit.lessons) {
      if (completed[lesson.id]) for (const id of lesson.items) ids.add(id)
    }
  }
  return [...ids]
}
