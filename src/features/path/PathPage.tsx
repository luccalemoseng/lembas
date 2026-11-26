import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { StatsBar } from '../../components/StatsBar'
import { Button, Icon, Ornament } from '../../components/ui'
import { content, unitsOfTrack } from '../../content'
import type { Lesson } from '../../content/schema'
import { lessonStatuses, type LessonStatus } from '../../engine/progress'
import { t } from '../../i18n'
import { useProgress } from '../../store/progress'

/** Horizontal offsets that make the lesson nodes snake down the screen. */
const ZIGZAG = [0, 48, 72, 48, 0, -48, -72, -48]
/** Node height (h-18) plus the gap between nodes (gap-6), in px. */
const NODE_SIZE = 72
const NODE_STEP = NODE_SIZE + 24
const TRAIL_WIDTH = 300

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
        className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-3"
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
              className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors ${
                selected
                  ? 'border-forest-800 bg-forest-800 text-gold-200 shadow-soft'
                  : disabled
                    ? 'border-dashed border-stone-400/70 text-stone-600'
                    : 'border-stone-300 bg-vellum text-forest-800'
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
          <div className="bg-contours relative mb-8 overflow-hidden rounded-2xl p-5 text-white shadow-soft">
            {/* Gold hairline just inside the edge. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-1.5 rounded-xl border border-gold-300/30"
            />
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.25em] text-gold-300">
              {t('path.unit', { n: unitIdx + 1 })}
            </p>
            <h2
              id={`unit-${unit.id}`}
              className="mt-0.5 font-display text-[1.7rem] font-bold leading-tight text-gold-200"
            >
              {unit.title}
            </h2>
            <Ornament tone="gold" className="my-1.5 -ml-1 w-28" />
            <p className="text-sm leading-relaxed text-forest-100">{unit.description}</p>
          </div>
          <ol className="relative flex flex-col items-center gap-6">
            <Trail offsets={unit.lessons.map((_, i) => ZIGZAG[(nodeIndex + i) % ZIGZAG.length]!)} />
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
      ? 'bg-linear-to-b from-gold-300 to-gold-400 text-forest-900 shadow-[0_6px_0_var(--color-gold-600)] ring-2 ring-inset ring-gold-200'
      : status === 'current'
        ? 'animate-glow bg-linear-to-b from-forest-600 to-forest-800 text-gold-200 shadow-[0_6px_0_var(--color-forest-950)] ring-2 ring-inset ring-gold-300/60'
        : 'bg-linear-to-b from-mithril-100 to-mithril-300 text-stone-600 shadow-[0_6px_0_var(--color-mithril-500)] ring-2 ring-inset ring-white/60'
  const popoverId = `lesson-pop-${lesson.id}`

  return (
    <li
      // The transform makes each node its own stacking context, so the open node
      // must sit above its siblings or later nodes paint over its popover.
      className={`relative flex flex-col items-center ${open ? 'z-30' : ''}`}
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
          className="animate-pop absolute top-22 z-20 w-64 rounded-2xl border border-gold-500/30 bg-vellum p-4 text-center shadow-soft"
        >
          <p className="font-display text-xl font-bold leading-snug text-forest-800">{label}</p>
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

/** A dotted route between the lesson nodes, like a path drawn on a map. */
function Trail({ offsets }: { offsets: number[] }) {
  if (offsets.length < 2) return null
  const mid = TRAIL_WIDTH / 2
  const points = offsets.map((o, i) => [mid + o, NODE_SIZE / 2 + i * NODE_STEP] as const)
  let d = `M${points[0]![0]} ${points[0]![1]}`
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1]!
    const [x1, y1] = points[i]!
    d += ` C${x0} ${y0 + NODE_STEP / 2} ${x1} ${y1 - NODE_STEP / 2} ${x1} ${y1}`
  }
  const height = NODE_SIZE + (offsets.length - 1) * NODE_STEP
  return (
    <svg
      aria-hidden="true"
      width={TRAIL_WIDTH}
      height={height}
      viewBox={`0 0 ${TRAIL_WIDTH} ${height}`}
      className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 overflow-visible"
    >
      <path
        d={d}
        fill="none"
        stroke="var(--color-gold-500)"
        strokeOpacity="0.9"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray="0.5 11"
      />
    </svg>
  )
}
