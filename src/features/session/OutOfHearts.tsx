import { useNavigate } from 'react-router'
import { Button, Icon } from '../../components/ui'
import { t } from '../../i18n'

/** Shown when a lesson cannot start or continue because no hearts are left. */
export function OutOfHearts() {
  const navigate = useNavigate()
  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-5 p-6 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-full bg-bad-100 text-bad-700">
        <Icon name="heart" className="h-14 w-14" />
      </div>
      <h1 className="font-display text-3xl font-bold text-forest-800">{t('hearts.outTitle')}</h1>
      <p className="text-stone-700">{t('hearts.outText')}</p>
      <Button className="w-full" onClick={() => navigate('/practice')}>
        {t('hearts.goPractice')}
      </Button>
      <Button variant="secondary" className="w-full" onClick={() => navigate('/')}>
        {t('lesson.backHome')}
      </Button>
    </main>
  )
}
