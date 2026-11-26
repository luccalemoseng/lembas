import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { content } from '.'
import { buildContent } from './validate'
import achievements from './achievements.json'
import lexicon from './lexicon.json'
import pronunciation from './pronunciation.json'
import tracks from './tracks.json'

const unitFiles = readdirSync(join(__dirname, 'units')).map((f) =>
  JSON.parse(readFileSync(join(__dirname, 'units', f), 'utf8')),
)

describe('content files', () => {
  it('pass schema validation', () => {
    expect(() =>
      buildContent({ achievements, lexicon, pronunciation, tracks, units: unitFiles }),
    ).not.toThrow()
  })

  it('every item has a source and a confidence', () => {
    for (const item of Object.values(content.allItems)) {
      expect(item.source.trim().length, item.id).toBeGreaterThan(5)
      expect(['high', 'review']).toContain(item.confidence)
    }
  })

  it('every lesson references existing items only', () => {
    for (const unit of unitFiles) {
      for (const lesson of unit.lessons) {
        for (const id of lesson.items)
          expect(content.allItems[id], `${lesson.id} → ${id}`).toBeDefined()
      }
    }
  })

  it('every lesson still has at least two items after review items are removed', () => {
    for (const unit of Object.values(content.units)) {
      expect(unit.lessons.length, unit.id).toBe(
        unitFiles.find((u) => u.id === unit.id).lessons.length,
      )
      for (const lesson of unit.lessons)
        expect(lesson.items.length, lesson.id).toBeGreaterThanOrEqual(2)
    }
  })

  it('review items never appear in loaded lessons', () => {
    const review = Object.values(content.allItems).filter((i) => i.confidence === 'review')
    expect(review.length).toBeGreaterThan(0) // the fixture set does contain some
    const used = new Set(
      Object.values(content.units).flatMap((u) => u.lessons.flatMap((l) => l.items)),
    )
    for (const item of review) expect(used.has(item.id), item.id).toBe(false)
  })

  it('every unit belongs to exactly one track, and tracks point to real units', () => {
    const seen = new Map<string, string>()
    for (const track of content.tracks) {
      for (const unitId of track.units) {
        expect(content.units[unitId], unitId).toBeDefined()
        expect(content.units[unitId]!.trackId).toBe(track.id)
        expect(seen.has(unitId), unitId).toBe(false)
        seen.set(unitId, track.id)
      }
    }
    expect(seen.size).toBe(Object.keys(content.units).length)
  })

  it('lesson ids are unique across all units', () => {
    const ids = unitFiles.flatMap((u) => u.lessons.map((l: { id: string }) => l.id))
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('stress items have distinct syllables (options must be unambiguous)', () => {
    for (const item of Object.values(content.allItems)) {
      if (item.type === 'pronunciation' && item.kind === 'stress') {
        const lower = item.syllables.map((s) => s.toLowerCase())
        expect(new Set(lower).size, item.id).toBe(lower.length)
      }
    }
  })

  it('pronunciation answers never appear among their own distractors', () => {
    for (const item of Object.values(content.allItems)) {
      if (item.type === 'pronunciation' && item.kind !== 'stress') {
        for (const q of item.questions) expect(q.distractors, item.id).not.toContain(q.answer)
      }
    }
  })
})

describe('rejects bad content', () => {
  const base = { achievements, lexicon, pronunciation, tracks, units: unitFiles }
  it('rejects an item without source', () => {
    const broken = structuredClone(lexicon) as Record<string, unknown>[]
    delete broken[0]!.source
    expect(() => buildContent({ ...base, lexicon: broken })).toThrow()
  })
  it('rejects an invalid confidence value', () => {
    const broken = structuredClone(lexicon) as Record<string, unknown>[]
    broken[0]!.confidence = 'maybe'
    expect(() => buildContent({ ...base, lexicon: broken })).toThrow()
  })
  it('rejects a unit with fewer than 4 lessons', () => {
    const broken = structuredClone(unitFiles)
    broken[0].lessons = broken[0].lessons.slice(0, 3)
    expect(() => buildContent({ ...base, units: broken })).toThrow()
  })
  it('rejects a stress item whose syllables do not spell the word', () => {
    const broken = structuredClone(pronunciation) as Record<string, unknown>[]
    const stress = broken.find((p) => p.kind === 'stress')!
    stress.syllables = ['X', 'y']
    expect(() => buildContent({ ...base, pronunciation: broken })).toThrow()
  })
  it('rejects duplicate ids', () => {
    expect(() => buildContent({ ...base, lexicon: [...lexicon, lexicon[0]] })).toThrow(/Duplicate/)
  })
})

/** Walk source files for the UI checks below. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) return sourceFiles(p)
    return /\.(ts|tsx)$/.test(name) && !/\.test\./.test(name) ? [p] : []
  })
}

const TEXT_ATTRIBUTES = new Set(['aria-label', 'placeholder', 'title', 'alt', 'aria-description'])

describe('UI text', () => {
  const srcDir = join(__dirname, '..')
  const files = sourceFiles(srcDir)

  it('has no hard-coded text between JSX tags (all strings come from i18n)', () => {
    const offenders: string[] = []
    for (const file of files.filter((f) => f.endsWith('.tsx'))) {
      const sf = ts.createSourceFile(
        file,
        readFileSync(file, 'utf8'),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      )
      const visit = (node: ts.Node) => {
        const where = `${file}:${sf.getLineAndCharacterOfPosition(node.getStart()).line + 1}`
        // Text attributes read by users or screen readers.
        if (
          ts.isJsxAttribute(node) &&
          TEXT_ATTRIBUTES.has(node.name.getText()) &&
          node.initializer &&
          (ts.isStringLiteral(node.initializer) ||
            (ts.isJsxExpression(node.initializer) &&
              node.initializer.expression &&
              (ts.isStringLiteral(node.initializer.expression) ||
                ts.isNoSubstitutionTemplateLiteral(node.initializer.expression))))
        ) {
          offenders.push(`${where}: ${node.getText()}`)
        }
        // {'literal'} or {`literal`} rendered as a child.
        if (
          ts.isJsxExpression(node) &&
          node.parent &&
          (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent)) &&
          node.expression &&
          (ts.isStringLiteral(node.expression) ||
            ts.isNoSubstitutionTemplateLiteral(node.expression)) &&
          /\p{L}/u.test(node.expression.text)
        ) {
          offenders.push(`${where}: ${node.getText()}`)
        }
        if (ts.isJsxText(node) && /\p{L}/u.test(node.text))
          offenders.push(`${file}: "${node.text.trim()}"`)
        ts.forEachChild(node, visit)
      }
      visit(sf)
    }
    expect(offenders).toEqual([])
  })

  it('contains no Portuguese characters in code or UI strings', () => {
    const en = readFileSync(join(srcDir, 'i18n', 'en.json'), 'utf8')
    for (const text of [en, ...files.map((f) => readFileSync(f, 'utf8'))]) {
      expect(text).not.toMatch(/[ãõçÃÕÇ]/)
    }
  })
})
