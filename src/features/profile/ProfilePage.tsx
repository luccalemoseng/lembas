import { Button, Icon } from '../../components/ui'
import { content } from '../../content'
import { achievementProgress } from '../../engine/achievements'
import { todayKey } from '../../engine/dates'
import { currentStreak, MAX_FREEZES } from '../../engine/streak'
import { DAILY_GOAL_OPTIONS } from '../../engine/xp'
import { t } from '../../i18n'
import { perfectLessonCount, useProgress } from '../../store/progress'

export function ProfilePage() {
  const state = useProgress()
  const today = todayKey()
  const streak = currentStreak(state.streak, today)
  const lessonsDone = Object.keys(state.completed).length

  return (
    <>
      <h1 className="py-4 font-display text-2xl font-bold text-forest-800">{t('profile.title')}</h1>

      <dl className="grid grid-cols-2 gap-3">
        <Stat icon="flame" label={t('stats.streakShort')} value={streak} />
        <Stat icon="star" label={t('stats.totalXp')} value={state.xpTotal} />
        <Stat icon="flame" label={t('stats.longestStreak')} value={state.streak.longest} />
        <Stat icon="check" label={t('stats.lessonsDone')} value={lessonsDone} />
      </dl>

      <section className="mt-6 rounded-2xl border-2 border-stone-200 bg-white p-4">
        <h2 className="flex items-center gap-2 font-bold text-forest-800">
          <Icon name="snow" className="h-5 w-5 text-sky-700" />
          {t('stats.freezes')}: {state.streak.freezes} / {MAX_FREEZES}
        </h2>
        <p className="mt-1 text-sm text-stone-700">{t('profile.freezesHelp')}</p>
      </section>

      <section className="mt-6 rounded-2xl border-2 border-stone-200 bg-white p-4">
        <h2 id="goal-label" className="font-bold text-forest-800">
          {t('profile.dailyGoal')}
        </h2>
        <p className="mt-1 text-sm text-stone-700">{t('profile.dailyGoalHelp')}</p>
        <div role="radiogroup" aria-labelledby="goal-label" className="mt-3 grid grid-cols-4 gap-2">
          {DAILY_GOAL_OPTIONS.map((xp) => (
            <button
              key={xp}
              type="button"
              role="radio"
              aria-checked={state.dailyGoal === xp}
              onClick={() => state.setDailyGoal(xp)}
              className={`min-h-12 rounded-xl border-2 text-sm font-bold ${
                state.dailyGoal === xp
                  ? 'border-forest-700 bg-forest-700 text-white'
                  : 'border-stone-300 bg-white text-forest-800'
              }`}
            >
              {t('profile.goalOption', { xp })}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-6" aria-labelledby="achievements-title">
        <h2 id="achievements-title" className="mb-3 font-bold text-forest-800">
          {t('achievements.title')}
        </h2>
        <ul className="grid gap-2">
          {content.achievements.map((a) => {
            const p = achievementProgress(a, {
              completed: state.completed,
              units: content.units,
              tracks: content.tracks,
              longestStreak: state.streak.longest,
              xpTotal: state.xpTotal,
              perfectLessons: perfectLessonCount(state.completed),
              practiceSessions: state.stats.practiceSessions,
            })
            const earned = Boolean(state.achievements[a.id])
            return (
              <li
                key={a.id}
                className={`flex items-center gap-3 rounded-2xl border-2 p-3 ${
                  earned ? 'border-gold-400 bg-white' : 'border-stone-200 bg-stone-100'
                }`}
              >
                <Icon
                  name={earned ? 'trophy' : 'lock'}
                  className={`h-8 w-8 shrink-0 ${earned ? 'text-gold-600' : 'text-stone-600'}`}
                />
                <span className="flex-1">
                  <span className="block font-bold text-forest-800">{a.title}</span>
                  <span className="block text-sm text-stone-700">{a.description}</span>
                </span>
                <span className="shrink-0 text-sm font-bold text-stone-700">
                  {earned
                    ? t('achievements.earned')
                    : t('achievements.progress', { current: p.current, target: p.target })}
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      <p className="mt-6 text-sm text-stone-700">{t('profile.storageNote')}</p>
      <Button
        variant="danger"
        className="mt-3 w-full"
        onClick={() => {
          if (window.confirm(t('profile.resetConfirm'))) state.resetProgress()
        }}
      >
        {t('profile.reset')}
      </Button>
    </>
  )
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: 'flame' | 'star' | 'check'
  label: string
  value: number
}) {
  return (
    <div className="rounded-2xl border-2 border-stone-200 bg-white p-3">
      <dt className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-stone-700">
        <Icon name={icon} className="h-4 w-4" />
        {label}
      </dt>
      <dd className="mt-1 text-2xl font-bold text-forest-800">{value}</dd>
    </div>
  )
}
