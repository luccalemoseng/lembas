// Lists every content item still marked "review" (kept out of lessons).
// Usage: npm run content:review
import { readFileSync } from 'node:fs'

interface Item {
  id: string
  word?: string
  gloss?: string[]
  source: string
  confidence: string
}

const files = ['src/content/lexicon.json', 'src/content/pronunciation.json']
let total = 0
for (const file of files) {
  const items = JSON.parse(readFileSync(file, 'utf8')) as Item[]
  const review = items.filter((i) => i.confidence === 'review')
  total += review.length
  for (const i of review) {
    const label = i.word ? `${i.word} = ${(i.gloss ?? []).join(' / ')}` : i.id
    console.log(`- [${i.id}] ${label}\n    source: ${i.source}`)
  }
}
console.log(`\n${total} item(s) awaiting review.`)
