import { useEffect } from 'react'
import { Button, Icon } from '../../components/ui'
import { t } from '../../i18n'
import { content } from '../../content'
import type { SessionReward } from '../../store/progress'

export function SessionSummary({
  reward,
  accuracy,
  onContinue,
}: {
  reward: SessionReward
  accuracy: number
  onContinue: () => void
}) {
  useEffect(() => {
    document.getElementById('summary-title')?.focus()
  }, [])

  const messages = [
    reward.freezesUsed > 0 && t('summary.freezeUsed'),
    reward.streakReset && t('summary.streakReset'),
    reward.streakExtended &&
      !reward.streakReset &&
      (reward.streak === 1
        ? t('summary.streakStarted')
        : t('summary.streakExtended', { count: reward.streak })),
    reward.freezeEarned && t('summary.freezeEarned'),
    reward.dailyGoalReachedNow && t('stats.goalReached'),
    reward.heartsRefilled > 0 &&
      (reward.heartsRefilled === 1
        ? t('summary.heartRefilled')
        : t('summary.heartsRefilled', { count: reward.heartsRefilled })),
  ].filter((m): m is string => Boolean(m))

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="animate-pop flex h-24 w-24 items-center justify-center rounded-full bg-gold-400 text-forest-900">
        <Icon name="star" className="h-14 w-14" />
      </div>
      <h1
        id="summary-title"
        tabIndex={-1}
        className="font-display text-3xl font-bold text-forest-800 outline-none"
      >
        {reward.kind === 'practice'
          ? t('summary.practiceTitle')
          : reward.perfect
            ? t('summary.perfect')
            : t('summary.title')}
      </h1>
      <dl className="grid w-full grid-cols-3 gap-3">
        <Stat label={t('summary.xpLabel')} value={t('summary.xp', { xp: reward.xp })} />
        <Stat label={t('summary.accuracy')} value={`${Math.round(accuracy * 100)}%`} />
        <Stat
          label={t('summary.streak')}
          value={
            reward.streak === 1
              ? t('summary.streakDay')
              : t('summary.streakDays', { count: reward.streak })
          }
        />
      </dl>
      {messages.length > 0 && (
        <ul className="space-y-1 text-forest-800" aria-live="polite">
          {messages.map((m) => (
            <li key={m} className="font-semibold">
              {m}
            </li>
          ))}
        </ul>
      )}
      {reward.achievements.length > 0 && (
        <section aria-labelledby="new-achievements" className="w-full">
          <h2 id="new-achievements" className="mb-2 font-bold text-forest-800">
            {t('achievements.unlocked')}
          </h2>
          <ul className="space-y-2">
            {reward.achievements.map((id) => {
              const a = content.achievements.find((x) => x.id === id)
              if (!a) return null
              return (
                <li
                  key={id}
                  className="animate-pop flex items-center gap-3 rounded-2xl border-2 border-gold-400 bg-white p-3 text-left"
                >
                  <Icon name="trophy" className="h-8 w-8 shrink-0 text-gold-600" />
                  <span>
                    <span className="block font-bold text-forest-800">{a.title}</span>
                    <span className="block text-sm text-stone-700">{a.description}</span>
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}
      <Button className="w-full" onClick={onContinue}>
        {t('summary.continue')}
      </Button>
    </main>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border-2 border-gold-400 bg-white p-3">
      <dt className="text-xs font-bold uppercase tracking-wide text-stone-700">{label}</dt>
      <dd className="mt-1 text-lg font-bold text-forest-800">{value}</dd>
    </div>
  )
}
