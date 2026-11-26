import { useNavigate } from 'react-router'
import { Button } from '../../components/ui'
import { t } from '../../i18n'

export function AboutPage() {
  const navigate = useNavigate()
  return (
    <article className="space-y-4 py-4 leading-relaxed">
      <h1 className="font-display text-2xl font-bold text-forest-800">{t('about.title')}</h1>
      <p>{t('app.tagline')}</p>
      <h2 className="text-lg font-bold text-forest-800">{t('about.sourcesTitle')}</h2>
      <p>{t('about.sources')}</p>
      <h2 className="text-lg font-bold text-forest-800">{t('about.accuracyTitle')}</h2>
      <p>{t('about.accuracy')}</p>
      <p>
        <a
          href="https://eldamo.org"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block min-h-11 py-3 font-semibold text-forest-700 underline"
        >
          {t('about.eldamoLink')}
        </a>
      </p>
      <Button variant="secondary" onClick={() => navigate(-1)}>
        {t('about.back')}
      </Button>
    </article>
  )
}
