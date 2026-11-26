import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { content, findLesson, unitsOfTrack } from '../../content'
import { todayKey } from '../../engine/dates'
import { heartsToday } from '../../engine/hearts'
import { generateLesson } from '../../engine/lesson'
import { canPlayLesson } from '../../engine/progress'
import { seededRng } from '../../engine/random'
import { t } from '../../i18n'
import { useProgress } from '../../store/progress'
import { OutOfHearts } from '../session/OutOfHearts'
import { SessionRunner } from '../session/SessionRunner'

export function LessonPage() {
  const { lessonId = '' } = useParams()
  const completed = useProgress((s) => s.completed)
  const hearts = useProgress((s) => heartsToday(s.hearts, todayKey()))
  const found = findLesson(content, lessonId)
  if (!found) return <LessonMessage text={t('lesson.notFound')} />
  if (!canPlayLesson(unitsOfTrack(content, found.unit.trackId), lessonId, completed)) {
    return <LessonMessage text={t('path.locked')} trackId={found.unit.trackId} />
  }
  // Remount (fresh lesson) whenever the lesson id changes.
  return (
    <LessonRunner
      key={lessonId}
      lessonId={lessonId}
      unitId={found.unit.id}
      trackId={found.unit.trackId}
      canStart={hearts > 0}
    />
  )
}

function LessonMessage({ text, trackId }: { text: string; trackId?: string }) {
  return (
    <main className="mx-auto max-w-lg p-6 text-center">
      <p className="mb-4">{text}</p>
      <Link
        to={trackId ? `/?track=${trackId}` : '/'}
        className="inline-block min-h-11 py-3 font-bold text-forest-700 underline"
      >
        {t('lesson.backHome')}
      </Link>
    </main>
  )
}

function LessonRunner(props: {
  lessonId: string
  unitId: string
  trackId: string
  canStart: boolean
}) {
  const { lessonId, unitId, trackId } = props
  const completeLesson = useProgress((s) => s.completeLesson)
  // Decided once: losing the last heart mid-lesson is handled by the runner.
  const [canStart] = useState(props.canStart)
  const [rng] = useState(() => seededRng(Date.now()))
  const [exercises] = useState(() =>
    generateLesson({ content, trackUnits: unitsOfTrack(content, trackId), unitId, lessonId, rng }),
  )
  if (!canStart) return <OutOfHearts />
  return (
    <SessionRunner
      exercises={exercises}
      rng={rng}
      mode="lesson"
      exitTo={`/?track=${trackId}`}
      onFinish={({ mistakes }) => completeLesson({ lessonId, mistakes })}
    />
  )
}
