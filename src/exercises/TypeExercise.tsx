import { useEffect, useRef } from 'react'
import type { TypeExercise as Typed } from '../engine/lesson'
import { t } from '../i18n'
import { LangText } from '../components/ui'

export function TypeExercise(props: {
  exercise: Typed
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  revealed: boolean
}) {
  const { exercise, value, onChange, onSubmit, revealed } = props
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = `answer-${exercise.id}`

  useEffect(() => {
    inputRef.current?.focus()
  }, [exercise.id])

  return (
    <div>
      <h2 className="mb-4 font-display text-2xl font-bold text-forest-800">
        <label htmlFor={inputId}>
          {exercise.answerLanguage === 'en' ? t('exercise.typeEn') : t('exercise.typeElvish')}
        </label>
      </h2>
      <p className="mb-6 rounded-2xl border border-stone-300/80 shadow-soft bg-vellum p-4 text-center font-display text-2xl">
        <LangText lang={exercise.promptLang}>{exercise.prompt}</LangText>
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!revealed && value.trim()) onSubmit()
        }}
      >
        <input
          id={inputId}
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={revealed}
          placeholder={t('exercise.typePlaceholder')}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          lang={exercise.answerLanguage === 'en' ? 'en' : undefined}
          className="min-h-14 w-full rounded-2xl border-2 border-stone-300 bg-vellum px-4 text-lg focus:border-forest-600 focus:outline-none"
        />
        {exercise.answerLanguage === 'elvish' && (
          <p className="mt-2 text-sm text-stone-700">{t('exercise.accentHint')}</p>
        )}
      </form>
    </div>
  )
}
