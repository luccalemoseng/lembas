import { z } from 'zod'
import { assembleContent, type Content } from './assemble'
import { Achievement, LexiconItem, PronunciationItem, Track, Unit } from './schema'

/** Validates raw JSON against the schemas, then assembles it. Used by tests and in dev. */
export function buildContent(raw: {
  achievements: unknown
  lexicon: unknown
  pronunciation: unknown
  tracks: unknown
  units: unknown[]
}): Content {
  return assembleContent({
    achievements: z.array(Achievement).parse(raw.achievements),
    lexicon: z.array(LexiconItem).parse(raw.lexicon),
    pronunciation: z.array(PronunciationItem).parse(raw.pronunciation),
    tracks: z.array(Track).parse(raw.tracks),
    units: raw.units.map((u) => Unit.parse(u)),
  })
}
