import { Link } from 'react-router'
import { t } from '../i18n'
import { Ornament } from './ui'

export function Footer() {
  return (
    <footer className="mt-12 space-y-2 pt-2 text-xs leading-relaxed text-stone-600">
      <Ornament className="mx-auto mb-3" />
      <p>{t('footer.disclaimer')}</p>
      <p>
        <Link
          to="/about"
          className="inline-block min-h-11 py-3 font-semibold text-forest-700 underline"
        >
          {t('footer.sources')}
        </Link>
      </p>
    </footer>
  )
}
