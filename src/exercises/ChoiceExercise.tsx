import type { ChoiceExercise as Choice } from '../engine/lesson'
import { t, type MessageKey } from '../i18n'
import { LangText } from '../components/ui'

const QUESTION: Record<Choice['variant'], MessageKey> = {
  'elv-en': 'exercise.elvEn',
  'en-elv': 'exercise.enElv',
  pronounce: 'exercise.pronounce',
  stress: 'exercise.stress',
}

export function ChoiceExercise(props: {
  exercise: Choice
  selected: string | null
  onSelect: (option: string) => void
  /** After checking: options are frozen and coloured. */
  revealed: boolean
}) {
  const { exercise, selected, onSelect, revealed } = props
  const isStress = exercise.variant === 'stress'

  return (
    <div>
      <h2 className="mb-4 text-xl font-bold text-forest-800">{t(QUESTION[exercise.variant])}</h2>
      <p className="mb-6 rounded-2xl border-2 border-stone-200 bg-white p-4 text-center font-display text-2xl">
        <LangText lang={exercise.promptLang}>{exercise.prompt}</LangText>
      </p>
      <div
        role="radiogroup"
        aria-label={t('exercise.options')}
        className={isStress ? 'flex flex-wrap justify-center gap-2' : 'grid gap-3'}
      >
        {exercise.options.map((option, i) => {
          const isSelected = selected === option
          const isAnswer = option === exercise.answer
          let tone = 'border-stone-300 bg-white'
          if (revealed && isAnswer) tone = 'border-ok-700 bg-ok-100'
          else if (revealed && isSelected) tone = 'border-bad-700 bg-bad-100 animate-shake'
          else if (isSelected) tone = 'border-forest-600 bg-forest-50'
          return (
            <button
              key={`${i}-${option}`}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={revealed}
              onClick={() => onSelect(option)}
              className={`min-h-12 rounded-2xl border-2 px-4 py-3 text-left text-lg font-semibold shadow-[0_3px_0_var(--color-stone-300)] ${tone} ${
                isStress ? 'min-w-16 text-center font-display' : ''
              }`}
            >
              <LangText lang={exercise.optionsLang}>{option}</LangText>
            </button>
          )
        })}
      </div>
    </div>
  )
}
