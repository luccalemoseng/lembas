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
      className="fixed inset-x-0 bottom-0 z-10 border-t-2 border-stone-200 bg-parchment/95 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto flex max-w-lg">
        {items.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              end
              className={({ isActive }) =>
                `flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-bold ${
                  isActive ? 'text-forest-700' : 'text-stone-600'
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
