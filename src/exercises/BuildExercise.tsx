import type { BuildExercise as Build } from '../engine/lesson'
import { t } from '../i18n'
import { LangText } from '../components/ui'

/**
 * Tap word tiles to build the sentence. Tapping a placed tile sends it back.
 * `selected` holds indexes into `exercise.tiles`, in answer order.
 */
export function BuildExercise(props: {
  exercise: Build
  selected: number[]
  onChange: (selected: number[]) => void
  revealed: boolean
}) {
  const { exercise, selected, onChange, revealed } = props
  const used = new Set(selected)

  const tile = (index: number, placed: boolean) => (
    <button
      key={index}
      type="button"
      disabled={revealed}
      onClick={() => onChange(placed ? selected.filter((i) => i !== index) : [...selected, index])}
      className="min-h-11 rounded-xl border-2 border-stone-300 bg-white px-3 py-2 text-lg font-semibold shadow-[0_3px_0_var(--color-stone-300)] active:translate-y-0.5 active:shadow-none"
    >
      <LangText lang={exercise.answerLang}>{exercise.tiles[index]}</LangText>
    </button>
  )

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold text-forest-800">
        {exercise.answerLang === 'en' ? t('exercise.buildEn') : t('exercise.buildElvish')}
      </h2>
      <p className="mb-6 rounded-2xl border-2 border-stone-200 bg-white p-4 text-center font-display text-2xl">
        <LangText lang={exercise.promptLang}>{exercise.prompt}</LangText>
      </p>

      <div
        aria-label={t('exercise.yourAnswer')}
        role="group"
        className="mb-6 flex min-h-16 flex-wrap content-start gap-2 border-b-2 border-stone-300 pb-3"
      >
        {selected.map((i) => tile(i, true))}
      </div>

      <div
        role="group"
        aria-label={t('exercise.wordBank')}
        className="flex flex-wrap justify-center gap-2"
      >
        {exercise.tiles.map((_, i) =>
          used.has(i) ? (
            // Keep the slot so the bank does not jump around.
            <span
              key={i}
              aria-hidden="true"
              className="min-h-11 rounded-xl bg-stone-200 px-3 py-2 text-lg font-semibold text-transparent"
            >
              {exercise.tiles[i]}
            </span>
          ) : (
            tile(i, false)
          ),
        )}
      </div>
    </div>
  )
}
