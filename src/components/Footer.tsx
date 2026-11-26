import { Link } from 'react-router'
import { t } from '../i18n'

export function Footer() {
  return (
    <footer className="mt-12 space-y-2 border-t border-stone-300 pt-4 text-xs leading-relaxed text-stone-600">
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
