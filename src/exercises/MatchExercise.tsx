import { useMemo, useState } from 'react'
import type { MatchExercise as Match } from '../engine/lesson'
import { shuffle, type Rng } from '../engine/random'
import { t } from '../i18n'
import { LangText } from '../components/ui'
import { vibrate } from '../lib/feedback'

type Side = 'left' | 'right'

/**
 * Tap one item in each column to pair them. Wrong pairs flash red and count as a
 * mistake; the exercise finishes when every pair is matched.
 */
export function MatchExercise(props: {
  exercise: Match
  rng: Rng
  onDone: (mistakes: number) => void
}) {
  const { exercise, rng, onDone } = props
  const [rightOrder] = useState(() =>
    shuffle(
      exercise.pairs.map((_, i) => i),
      rng,
    ),
  )
  const [leftOrder] = useState(() =>
    shuffle(
      exercise.pairs.map((_, i) => i),
      rng,
    ),
  )
  const [selected, setSelected] = useState<{ side: Side; index: number } | null>(null)
  const [matched, setMatched] = useState<Set<number>>(new Set())
  const [wrong, setWrong] = useState<{ left: number; right: number } | null>(null)
  const [mistakes, setMistakes] = useState(0)

  const columns = useMemo(
    () => [
      { side: 'left' as const, order: leftOrder, lang: exercise.leftLang },
      { side: 'right' as const, order: rightOrder, lang: 'en' as const },
    ],
    [leftOrder, rightOrder, exercise.leftLang],
  )

  function tap(side: Side, index: number) {
    if (matched.has(index)) return
    setWrong(null)
    if (!selected || selected.side === side) {
      setSelected({ side, index })
      return
    }
    const left = side === 'left' ? index : selected.index
    const right = side === 'right' ? index : selected.index
    setSelected(null)
    if (left === right) {
      const next = new Set(matched).add(left)
      setMatched(next)
      vibrate('correct')
      if (next.size === exercise.pairs.length) onDone(mistakes)
    } else {
      setMistakes((m) => m + 1)
      setWrong({ left, right })
      vibrate('wrong')
    }
  }

  return (
    <div>
      <h2 className="mb-6 font-display text-2xl font-bold text-forest-800">
        {t('exercise.match')}
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {columns.map((col) => (
          <ul key={col.side} className="grid gap-3">
            {col.order.map((pairIndex) => {
              const pair = exercise.pairs[pairIndex]!
              const text = col.side === 'left' ? pair.left : pair.right
              const isMatched = matched.has(pairIndex)
              const isSelected = selected?.side === col.side && selected.index === pairIndex
              const isWrong = wrong?.[col.side] === pairIndex
              let tone = 'border-stone-300 bg-vellum'
              if (isMatched) tone = 'border-stone-200 bg-stone-100 text-stone-500'
              else if (isWrong) tone = 'border-bad-700 bg-bad-100 animate-shake'
              else if (isSelected) tone = 'border-forest-600 bg-forest-50'
              return (
                <li key={pairIndex}>
                  <button
                    type="button"
                    disabled={isMatched}
                    aria-pressed={isSelected}
                    onClick={() => tap(col.side, pairIndex)}
                    className={`min-h-14 w-full rounded-2xl border-2 px-3 py-2 text-base font-semibold shadow-[0_3px_0_var(--color-stone-300)] ${tone}`}
                  >
                    <LangText lang={col.lang}>{text}</LangText>
                  </button>
                </li>
              )
            })}
          </ul>
        ))}
      </div>
    </div>
  )
}
