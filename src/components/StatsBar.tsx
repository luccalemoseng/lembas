import { todayKey } from '../engine/dates'
import { heartsToday } from '../engine/hearts'
import { currentStreak } from '../engine/streak'
import { t } from '../i18n'
import { useProgress } from '../store/progress'
import { Icon } from './ui'

export function StatsBar() {
  const streak = useProgress((s) => s.streak)
  const xpByDay = useProgress((s) => s.xpByDay)
  const goal = useProgress((s) => s.dailyGoal)
  const today = todayKey()
  const hearts = useProgress((s) => heartsToday(s.hearts, today))
  const xp = xpByDay[today] ?? 0
  const count = currentStreak(streak, today)
  const pct = Math.min(1, xp / goal)

  return (
    <header className="flex items-center justify-between gap-3 py-3">
      <h1 className="flex items-center gap-1.5 font-display text-[1.75rem] font-bold leading-none tracking-wide text-forest-800">
        <Icon name="leaf" className="h-5 w-5 text-gold-500" />
        {t('app.name')}
      </h1>
      <div className="flex items-center gap-3 text-sm font-bold">
        <span
          role="img"
          className="flex items-center gap-1 text-bad-700"
          aria-label={hearts === 1 ? t('hearts.labelOne') : t('hearts.label', { count: hearts })}
        >
          <Icon name="heart" className="h-6 w-6" />
          <span aria-hidden="true">{hearts}</span>
        </span>
        <span
          role="img"
          className={`flex items-center gap-1 ${count > 0 ? 'text-orange-700' : 'text-stone-600'}`}
          aria-label={t('stats.streak', { count })}
        >
          <Icon name="flame" className="h-6 w-6" />
          <span aria-hidden="true">{count}</span>
        </span>
        <span
          role="img"
          className="flex items-center gap-2"
          aria-label={t('stats.xpToday', { xp, goal })}
        >
          <svg viewBox="0 0 36 36" className="h-8 w-8 -rotate-90" aria-hidden="true">
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke="var(--color-stone-300)"
              strokeOpacity="0.7"
              strokeWidth="5"
            />
            <circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke="var(--color-gold-600)"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={`${pct * 94.25} 94.25`}
            />
          </svg>
          <span aria-hidden="true" className="text-gold-600">
            {xp}/{goal}
          </span>
        </span>
      </div>
    </header>
  )
}
