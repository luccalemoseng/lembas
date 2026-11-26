import { useNavigate } from 'react-router'
import { Button, Icon } from '../../components/ui'
import { content } from '../../content'
import { todayKey } from '../../engine/dates'
import { HEARTS_PER_PRACTICE, heartsToday, MAX_HEARTS } from '../../engine/hearts'
import { learnedItemIds } from '../../engine/progress'
import { dueItems } from '../../engine/srs'
import { t } from '../../i18n'
import { useProgress } from '../../store/progress'

export function PracticePage() {
  const navigate = useNavigate()
  const today = todayKey()
  const deck = useProgress((s) => s.deck)
  const completed = useProgress((s) => s.completed)
  const hearts = useProgress((s) => heartsToday(s.hearts, today))
  // Cards whose item was removed from the content (or sent back to review) are skipped.
  const due = dueItems(deck, today).filter((id) => content.items[id])
  const learned = learnedItemIds(content.units, completed)

  return (
    <>
      <h1 className="py-4 font-display text-3xl font-bold text-forest-800">
        {t('practice.title')}
      </h1>

      <section className="rounded-2xl border border-stone-300/80 shadow-soft bg-vellum p-4">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold text-forest-800">
          <Icon name="heart" className="h-6 w-6 text-bad-700" />
          {t('hearts.count', { count: hearts, max: MAX_HEARTS })}
        </h2>
        <p className="mt-1 text-sm text-stone-700">
          {t('practice.heartsHelp', { n: HEARTS_PER_PRACTICE, max: MAX_HEARTS })}
        </p>
      </section>

      <section className="mt-6 rounded-2xl border border-stone-300/80 shadow-soft bg-vellum p-4">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold text-forest-800">
          <Icon name="refresh" className="h-6 w-6" />
          {due.length === 1 ? t('practice.dueOne') : t('practice.due', { count: due.length })}
        </h2>
        <p className="mt-1 text-sm text-stone-700">{t('practice.srsHelp')}</p>
        {due.length > 0 ? (
          <Button className="mt-4 w-full" onClick={() => navigate('/practice/session')}>
            {t('practice.start')}
          </Button>
        ) : learned.length > 0 ? (
          <>
            <p className="mt-3 text-sm font-semibold text-forest-800">{t('practice.nothingDue')}</p>
            <Button
              variant="secondary"
              className="mt-3 w-full"
              onClick={() => navigate('/practice/session?mode=review')}
            >
              {t('practice.general')}
            </Button>
          </>
        ) : (
          <p className="mt-3 text-sm font-semibold text-forest-800">{t('practice.noLessons')}</p>
        )}
      </section>
    </>
  )
}
