import { useState } from 'react'
import { Navigate, useSearchParams } from 'react-router'
import { content } from '../../content'
import { todayKey } from '../../engine/dates'
import { generatePractice } from '../../engine/lesson'
import { learnedItemIds } from '../../engine/progress'
import { seededRng, shuffle } from '../../engine/random'
import { dueItems, PRACTICE_SIZE } from '../../engine/srs'
import { useProgress } from '../../store/progress'
import { SessionRunner } from '../session/SessionRunner'

/**
 * A review session. Default: the cards due today, most overdue first.
 * ?mode=review: when nothing is due, a general review of learned items.
 */
export function PracticeSession() {
  const [params] = useSearchParams()
  const completePractice = useProgress((s) => s.completePractice)
  const [rng] = useState(() => seededRng(Date.now()))
  const [exercises] = useState(() => {
    const { deck, completed } = useProgress.getState()
    const learned = learnedItemIds(content.units, completed)
    const due = dueItems(deck, todayKey()).filter((id) => content.items[id])
    const itemIds =
      params.get('mode') === 'review'
        ? shuffle(learned, rng).slice(0, PRACTICE_SIZE)
        : due.slice(0, PRACTICE_SIZE)
    return generatePractice({
      content,
      itemIds,
      known: new Set([...learned, ...Object.keys(deck)]),
      rng,
    })
  })

  if (exercises.length === 0) return <Navigate to="/practice" replace />
  return (
    <SessionRunner
      exercises={exercises}
      rng={rng}
      mode="practice"
      exitTo="/practice"
      onFinish={({ mistakes, firstTry }) => completePractice({ results: firstTry, mistakes })}
    />
  )
}
