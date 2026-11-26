import type {
  Achievement,
  ContentItem,
  Lesson,
  LexiconItem,
  PronunciationItem,
  Track,
  Unit,
} from './schema'

export interface Content {
  achievements: Achievement[]
  tracks: Track[]
  units: Record<string, Unit>
  /** Every item, including those still marked "review". */
  allItems: Record<string, ContentItem>
  /** Only items approved for lessons (confidence "high"). */
  items: Record<string, ContentItem>
}

export interface ContentInput {
  achievements: Achievement[]
  lexicon: LexiconItem[]
  pronunciation: PronunciationItem[]
  tracks: Track[]
  units: Unit[]
}

/**
 * Indexes already-validated content and removes "review" items from lessons.
 * Has no dependency on zod so it stays out of the production bundle.
 */
export function assembleContent(input: ContentInput): Content {
  const allItems: Record<string, ContentItem> = {}
  for (const item of input.lexicon) addUnique(allItems, { type: 'lexicon', ...item })
  for (const item of input.pronunciation) addUnique(allItems, { type: 'pronunciation', ...item })

  const items = Object.fromEntries(
    Object.entries(allItems).filter(([, item]) => item.confidence === 'high'),
  )

  const units: Record<string, Unit> = {}
  for (const unit of input.units) {
    if (units[unit.id]) throw new Error(`Duplicate unit id: ${unit.id}`)
    // Lessons only keep approved items. A lesson left empty is dropped.
    const lessons: Lesson[] = unit.lessons
      .map((lesson) => ({ ...lesson, items: lesson.items.filter((id) => items[id]) }))
      .filter((lesson) => lesson.items.length > 0)
    units[unit.id] = { ...unit, lessons }
  }

  const ids = new Set<string>()
  for (const a of input.achievements) {
    if (ids.has(a.id)) throw new Error(`Duplicate achievement id: ${a.id}`)
    ids.add(a.id)
  }

  return { achievements: input.achievements, tracks: input.tracks, units, allItems, items }
}

function addUnique(target: Record<string, ContentItem>, item: ContentItem) {
  if (target[item.id]) throw new Error(`Duplicate item id: ${item.id}`)
  target[item.id] = item
}
