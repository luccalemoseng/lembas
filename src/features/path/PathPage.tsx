import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { StatsBar } from '../../components/StatsBar'
import { Button, Icon } from '../../components/ui'
import { content, unitsOfTrack } from '../../content'
import type { Lesson } from '../../content/schema'
import { lessonStatuses, type LessonStatus } from '../../engine/progress'
import { t } from '../../i18n'
import { useProgress } from '../../store/progress'

/** Horizontal offsets that make the lesson nodes snake down the screen. */
const ZIGZAG = [0, 48, 72, 48, 0, -48, -72, -48]

export function PathPage() {
  const [params, setParams] = useSearchParams()
  const available = content.tracks.filter((tr) => tr.status === 'available')
  const trackId = params.get('track') ?? available[0]?.id ?? ''
  const track = content.tracks.find((tr) => tr.id === trackId) ?? available[0]
  const completed = useProgress((s) => s.completed)
  const [open, setOpen] = useState<string | null>(null)
  const navigate = useNavigate()

  if (!track) return null
  const units = unitsOfTrack(content, track.id)
  const statuses = lessonStatuses(units, completed)
  let nodeIndex = 0

  return (
    <>
      <StatsBar />
      <div
        role="group"
        aria-label={t('path.trackTabs')}
        className="-mx-4 flex gap-2 overflow-x-auto px-4 py-3"
      >
        {content.tracks.map((tr) => {
          const selected = tr.id === track.id
          const disabled = tr.status !== 'available'
          return (
            <button
              key={tr.id}
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => {
                setOpen(null)
                setParams({ track: tr.id }, { replace: true })
              }}
              className={`min-h-11 shrink-0 rounded-full border-2 px-4 text-sm font-bold ${
                selected
                  ? 'border-forest-700 bg-forest-700 text-white'
                  : disabled
                    ? 'border-stone-300 text-stone-600'
                    : 'border-stone-300 bg-white text-forest-800'
              }`}
            >
              {tr.title}
              {disabled && <span className="ml-1 font-normal">· {t('path.comingSoon')}</span>}
            </button>
          )
        })}
      </div>

      <p className="mb-4 text-sm text-stone-700">{track.description}</p>

      {units.map((unit, unitIdx) => (
        <section key={unit.id} aria-labelledby={`unit-${unit.id}`} className="mb-10">
          <div className="mb-6 rounded-2xl bg-forest-700 p-4 text-white">
            <p className="text-xs font-bold uppercase tracking-widest text-gold-300">
              {t('path.unit', { n: unitIdx + 1 })}
            </p>
            <h2 id={`unit-${unit.id}`} className="font-display text-xl font-bold">
              {unit.title}
            </h2>
            <p className="mt-1 text-sm text-forest-100">{unit.description}</p>
          </div>
          <ol className="flex flex-col items-center gap-6">
            {unit.lessons.map((lesson, i) => {
              const status = statuses[lesson.id] ?? 'locked'
              const offset = ZIGZAG[nodeIndex++ % ZIGZAG.length]!
              return (
                <LessonNode
                  key={lesson.id}
                  lesson={lesson}
                  number={i + 1}
                  status={status}
                  offset={offset}
                  open={open === lesson.id}
                  onToggle={() => setOpen(open === lesson.id ? null : lesson.id)}
                  onStart={() => navigate(`/lesson/${lesson.id}`)}
                />
              )
            })}
          </ol>
        </section>
      ))}
    </>
  )
}

function LessonNode(props: {
  lesson: Lesson
  number: number
  status: LessonStatus
  offset: number
  open: boolean
  onToggle: () => void
  onStart: () => void
}) {
  const { lesson, number, status, offset, open, onToggle, onStart } = props
  const label = t('path.lesson', { n: number, title: lesson.title })
  const style =
    status === 'completed'
      ? 'bg-gold-400 text-forest-900 shadow-[0_6px_0_var(--color-gold-600)]'
      : status === 'current'
        ? 'bg-forest-700 text-white shadow-[0_6px_0_var(--color-forest-900)] ring-4 ring-gold-300'
        : 'bg-stone-300 text-stone-600 shadow-[0_6px_0_var(--color-stone-400)]'
  const popoverId = `lesson-pop-${lesson.id}`

  return (
    <li
      className="relative flex flex-col items-center"
      style={{ transform: `translateX(${offset}px)` }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={popoverId}
        aria-label={`${label}. ${status === 'locked' ? t('path.locked') : status === 'completed' ? t('path.completed') : ''}`}
        className={`flex h-18 w-18 items-center justify-center rounded-full transition-transform active:translate-y-1 ${style}`}
      >
        <Icon
          name={status === 'locked' ? 'lock' : status === 'completed' ? 'check' : 'star'}
          className="h-8 w-8"
        />
      </button>
      {open && (
        <div
          id={popoverId}
          className="animate-pop absolute top-22 z-20 w-64 rounded-2xl border-2 border-stone-200 bg-white p-4 text-center shadow-xl"
        >
          <p className="font-bold text-forest-800">{label}</p>
          {status === 'locked' ? (
            <p className="mt-2 text-sm text-stone-700">{t('path.locked')}</p>
          ) : (
            <Button className="mt-3 w-full" onClick={onStart}>
              {status === 'completed' ? t('path.practiceAgain') : t('path.start')}
            </Button>
          )}
        </div>
      )}
    </li>
  )
}
