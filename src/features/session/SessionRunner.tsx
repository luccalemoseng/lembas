import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button, Icon, ProgressBar } from '../../components/ui'
import { content } from '../../content'
import { checkBuiltSentence, checkTypedAnswer } from '../../engine/answer'
import { todayKey } from '../../engine/dates'
import { heartsToday } from '../../engine/hearts'
import type { Exercise } from '../../engine/lesson'
import type { Rng } from '../../engine/random'
import { BuildExercise } from '../../exercises/BuildExercise'
import { ChoiceExercise } from '../../exercises/ChoiceExercise'
import { MatchExercise } from '../../exercises/MatchExercise'
import { TypeExercise } from '../../exercises/TypeExercise'
import { t } from '../../i18n'
import { vibrate } from '../../lib/feedback'
import { useProgress, type AnswerResult, type SessionReward } from '../../store/progress'
import { FeedbackSheet, type Feedback } from './FeedbackSheet'
import { OutOfHearts } from './OutOfHearts'
import { SessionSummary } from './SessionSummary'

export interface SessionOutcome {
  mistakes: number
  /** Result of the first attempt at each item. */
  firstTry: Record<string, AnswerResult>
  /** Items answered wrongly at least once. */
  wrongItemIds: string[]
}

/**
 * Plays a list of exercises. Wrong answers are queued again at the end; the
 * session ends when every exercise has been answered correctly.
 *
 * In "lesson" mode every wrong answer costs a heart, and running out ends the
 * session without reward. "practice" mode never costs hearts.
 */
export function SessionRunner(props: {
  exercises: Exercise[]
  rng: Rng
  mode: 'lesson' | 'practice'
  exitTo: string
  onFinish: (outcome: SessionOutcome) => SessionReward
}) {
  const { rng, mode, exitTo, onFinish } = props
  const navigate = useNavigate()
  const loseHeart = useProgress((s) => s.loseHeart)
  const recordMistake = useProgress((s) => s.recordMistake)
  const hearts = useProgress((s) => heartsToday(s.hearts, todayKey()))

  const [queue, setQueue] = useState<Exercise[]>(props.exercises)
  const [total] = useState(props.exercises.length)
  const [position, setPosition] = useState(0)
  const [done, setDone] = useState(0)
  const [mistakes, setMistakes] = useState(0)
  const [answered, setAnswered] = useState(0)
  const [firstTry, setFirstTry] = useState<Record<string, AnswerResult>>({})
  const [wrongIds, setWrongIds] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [typed, setTyped] = useState('')
  const [tiles, setTiles] = useState<number[]>([])
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [heartsGone, setHeartsGone] = useState(false)
  const [failed, setFailed] = useState(false)
  const [reward, setReward] = useState<SessionReward | null>(null)

  const current = queue[position]

  if (failed) return <OutOfHearts />
  if (reward) {
    const accuracy = answered === 0 ? 1 : (answered - mistakes) / answered
    return (
      <SessionSummary
        reward={reward}
        accuracy={Math.max(0, accuracy)}
        onContinue={() => navigate(exitTo)}
      />
    )
  }
  if (!current) return null

  function showFeedback(result: Feedback & { itemId: string }) {
    setAnswered((n) => n + 1)
    const outcome: AnswerResult = !result.correct ? 'wrong' : result.typo ? 'typo' : 'correct'
    setFirstTry((f) => (result.itemId in f ? f : { ...f, [result.itemId]: outcome }))
    if (!result.correct) {
      setMistakes((m) => m + 1)
      if (!wrongIds.includes(result.itemId)) {
        setWrongIds((ids) => [...ids, result.itemId])
        // Saved now, so quitting the lesson cannot lose it. Practice mistakes are
        // scheduled by the practice result instead.
        if (mode === 'lesson') recordMistake(result.itemId)
      }
      // Wrong answers come back at the end.
      setQueue((q) => [...q, { ...current!, id: `${current!.id}-again-${q.length}` }])
      if (mode === 'lesson' && loseHeart() === 0) setHeartsGone(true)
    }
    vibrate(result.correct ? 'correct' : 'wrong')
    setFeedback(result)
  }

  function check() {
    if (!current || feedback) return
    if (current.kind === 'choice') {
      if (selected === null) return
      showFeedback({
        correct: selected === current.answer,
        typo: false,
        expected: current.answer,
        expectedLang: current.optionsLang,
        itemId: current.itemId,
      })
    } else if (current.kind === 'type') {
      if (!typed.trim()) return
      const r = checkTypedAnswer(typed, current.accepted, current.answerLanguage)
      showFeedback({
        correct: r.correct,
        typo: r.typo,
        expected: r.expected,
        expectedLang: current.answerLanguage === 'en' ? 'en' : itemLang(current.itemId),
        itemId: current.itemId,
      })
    } else if (current.kind === 'build') {
      if (tiles.length === 0) return
      const r = checkBuiltSentence(
        tiles.map((i) => current.tiles[i]!),
        current.accepted,
        current.answerLang === 'en' ? 'en' : 'elvish',
      )
      showFeedback({
        correct: r.correct,
        typo: false,
        expected: r.expected,
        expectedLang: current.answerLang,
        itemId: current.itemId,
      })
    }
  }

  function next() {
    const wasCorrect = feedback?.correct ?? true
    setFeedback(null)
    setSelected(null)
    setTyped('')
    setTiles([])
    if (heartsGone) {
      setFailed(true)
      return
    }
    if (wasCorrect) setDone((d) => d + 1)
    const nextPosition = position + 1
    if (nextPosition >= queue.length) {
      setReward(onFinish({ mistakes, firstTry, wrongItemIds: wrongIds }))
    } else {
      setPosition(nextPosition)
    }
  }

  function onMatchDone(matchMistakes: number) {
    if (current?.kind !== 'match') return
    setMistakes((m) => m + matchMistakes)
    setAnswered((n) => n + 1 + matchMistakes)
    // Matching mistakes cannot be pinned to one item, so items count as known.
    setFirstTry((f) => {
      const next = { ...f }
      for (const p of current.pairs) if (!(p.itemId in next)) next[p.itemId] = 'correct'
      return next
    })
    setFeedback({ correct: true, typo: false, expected: null, expectedLang: 'en', itemId: null })
  }

  function quit() {
    if (window.confirm(t(mode === 'lesson' ? 'lesson.quitConfirm' : 'practice.quitConfirm'))) {
      navigate(exitTo)
    }
  }

  const canCheck =
    (current.kind === 'choice' && selected !== null) ||
    (current.kind === 'type' && typed.trim() !== '') ||
    (current.kind === 'build' && tiles.length > 0)

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <header className="flex items-center gap-3 px-4 pt-4">
        <button
          type="button"
          onClick={quit}
          aria-label={t(mode === 'lesson' ? 'lesson.quit' : 'practice.quit')}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-stone-600 hover:bg-stone-200"
        >
          <Icon name="close" />
        </button>
        <ProgressBar value={done / total} label={t('lesson.progress')} />
        {mode === 'lesson' && (
          <span
            role="img"
            aria-label={hearts === 1 ? t('hearts.labelOne') : t('hearts.label', { count: hearts })}
            className="flex shrink-0 items-center gap-1 font-bold text-bad-700"
          >
            <Icon name="heart" className="h-6 w-6" />
            <span aria-hidden="true">{hearts}</span>
          </span>
        )}
      </header>

      <main key={current.id} className="animate-pop flex-1 px-4 pb-48 pt-6">
        {current.kind === 'choice' && (
          <ChoiceExercise
            exercise={current}
            selected={selected}
            onSelect={setSelected}
            revealed={feedback !== null}
          />
        )}
        {current.kind === 'type' && (
          <TypeExercise
            exercise={current}
            value={typed}
            onChange={setTyped}
            onSubmit={check}
            revealed={feedback !== null}
          />
        )}
        {current.kind === 'build' && (
          <BuildExercise
            exercise={current}
            selected={tiles}
            onChange={setTiles}
            revealed={feedback !== null}
          />
        )}
        {current.kind === 'match' && (
          <MatchExercise exercise={current} rng={rng} onDone={onMatchDone} />
        )}
      </main>

      {feedback ? (
        <FeedbackSheet feedback={feedback} onContinue={next} />
      ) : (
        current.kind !== 'match' && (
          <div
            className="fixed inset-x-0 bottom-0 border-t-2 border-stone-200 bg-parchment p-4"
            style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
          >
            <div className="mx-auto max-w-lg">
              <Button className="w-full" disabled={!canCheck} onClick={check}>
                {t('lesson.check')}
              </Button>
            </div>
          </div>
        )
      )}
    </div>
  )
}

function itemLang(itemId: string): 'sindarin' | 'quenya' {
  const item = content.items[itemId]
  return item?.type === 'lexicon' ? item.lang : 'sindarin'
}
