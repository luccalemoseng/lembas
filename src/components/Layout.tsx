import { NavLink, Outlet } from 'react-router'
import { t } from '../i18n'
import { Icon, type IconName } from './ui'
import { Footer } from './Footer'

export function AppLayout() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <main className="flex-1 px-4 pb-28 pt-2">
        <Outlet />
        <Footer />
      </main>
      <BottomNav />
    </div>
  )
}

function BottomNav() {
  const items: { to: string; label: string; icon: IconName }[] = [
    { to: '/', label: t('nav.learn'), icon: 'leaf' },
    { to: '/practice', label: t('nav.practice'), icon: 'refresh' },
    { to: '/profile', label: t('nav.profile'), icon: 'user' },
  ]
  return (
    <nav
      aria-label={t('nav.main')}
      className="fixed inset-x-0 bottom-0 z-10 border-t border-gold-500/25 bg-vellum/80 shadow-[0_-8px_24px_-12px_rgb(28_26_21/0.25)] backdrop-blur-md"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto flex max-w-lg">
        {items.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              end
              className={({ isActive }) =>
                `relative flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-semibold tracking-wide ${
                  isActive
                    ? 'text-forest-700 before:absolute before:top-0 before:h-0.5 before:w-10 before:rounded-full before:bg-gold-500'
                    : 'text-stone-600'
                }`
              }
            >
              <Icon name={item.icon} />
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
