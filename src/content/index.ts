import achievementsJson from './achievements.json'
import { assembleContent, type Content } from './assemble'
import lexiconJson from './lexicon.json'
import pronunciationJson from './pronunciation.json'
import type { Achievement, Lesson, LexiconItem, PronunciationItem, Track, Unit } from './schema'
import tracksJson from './tracks.json'

export type { Content } from './assemble'

const unitModules = import.meta.glob<{ default: unknown }>('./units/*.json', { eager: true })

export const rawContent = {
  achievements: achievementsJson as unknown,
  lexicon: lexiconJson as unknown,
  pronunciation: pronunciationJson as unknown,
  tracks: tracksJson as unknown,
  units: Object.values(unitModules).map((m) => m.default),
}

/**
 * The JSON files are validated against the zod schemas by the test suite
 * (content.test.ts) and, during development, on start-up below. Production
 * trusts the validated files, keeping zod out of the bundle.
 */
export const content: Content = assembleContent({
  achievements: rawContent.achievements as Achievement[],
  lexicon: rawContent.lexicon as LexiconItem[],
  pronunciation: rawContent.pronunciation as PronunciationItem[],
  tracks: rawContent.tracks as Track[],
  units: rawContent.units as Unit[],
})

if (import.meta.env.DEV) {
  void import('./validate').then(({ buildContent }) => {
    try {
      buildContent(rawContent)
    } catch (error) {
      console.error('Content files are invalid:', error)
    }
  })
}

export function unitsOfTrack(c: Content, trackId: string): Unit[] {
  const track = c.tracks.find((t) => t.id === trackId)
  if (!track) return []
  return track.units.map((id) => c.units[id]).filter((u): u is Unit => Boolean(u))
}

export function findLesson(
  c: Content,
  lessonId: string,
): { unit: Unit; lesson: Lesson; index: number } | undefined {
  for (const unit of Object.values(c.units)) {
    const index = unit.lessons.findIndex((l) => l.id === lessonId)
    if (index >= 0) return { unit, lesson: unit.lessons[index]!, index }
  }
  return undefined
}
