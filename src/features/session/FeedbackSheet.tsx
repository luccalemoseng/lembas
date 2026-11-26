import { useEffect, useRef } from 'react'
import { Button, Icon, LangText } from '../../components/ui'
import { content } from '../../content'
import type { TextLang } from '../../engine/lesson'
import { t } from '../../i18n'

export interface Feedback {
  correct: boolean
  typo: boolean
  /** Answer to display, or null when there is nothing to show (e.g. matching). */
  expected: string | null
  expectedLang: TextLang
  itemId: string | null
}

export function FeedbackSheet({
  feedback,
  onContinue,
}: {
  feedback: Feedback
  onContinue: () => void
}) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    buttonRef.current?.focus()
  }, [])

  const { correct, typo, expected, expectedLang, itemId } = feedback
  const item = itemId ? content.allItems[itemId] : undefined
  const explanation = item
    ? item.type === 'lexicon'
      ? [item.elements?.map((e) => `${e.form} = ${e.meaning}`).join(' · '), item.note].filter(
          Boolean,
        )
      : [item.explanation]
    : []

  const showAnswer = expected !== null && (!correct || typo)
  const title = !correct
    ? t('lesson.incorrect')
    : typo
      ? t('lesson.correctTypo')
      : t('lesson.correct')

  return (
    <div
      role="status"
      aria-live="assertive"
      className={`animate-slide-up fixed inset-x-0 bottom-0 z-30 border-t-2 p-4 ${
        correct ? 'border-ok-700 bg-ok-100' : 'border-bad-700 bg-bad-100'
      }`}
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      <div className="mx-auto max-w-lg">
        <p
          className={`flex items-center gap-2 text-xl font-bold ${correct ? 'text-ok-700' : 'text-bad-700'}`}
        >
          <Icon name={correct ? 'check' : 'close'} className="h-7 w-7" />
          {title}
        </p>
        {showAnswer && (
          <p className="mt-2 text-ink">
            {!correct && <span className="font-semibold">{t('lesson.correctAnswer')} </span>}
            <LangText lang={expectedLang} className="font-display text-lg font-bold">
              {expected}
            </LangText>
          </p>
        )}
        {explanation.map((line) => (
          <p key={line} className="mt-2 text-sm text-ink">
            {line}
          </p>
        ))}
        <Button
          ref={buttonRef}
          className={`mt-4 w-full ${correct ? '' : 'bg-bad-700! shadow-[0_4px_0_#6b170f]!'}`}
          onClick={onContinue}
        >
          {t('lesson.continue')}
        </Button>
      </div>
    </div>
  )
}
