import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { t } from '../i18n'
import { Button } from './ui'

/**
 * Registers the service worker (registerType "prompt"). Shows a short note when
 * the app first becomes available offline, and an "Update" button when a new
 * version is waiting. The page is never reloaded without the user's tap.
 */
export function UpdatePrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  // The "ready offline" note is informational: hide it after a few seconds so
  // it never covers a lesson.
  useEffect(() => {
    if (!offlineReady) return
    const timer = setTimeout(() => setOfflineReady(false), 4000)
    return () => clearTimeout(timer)
  }, [offlineReady, setOfflineReady])

  if (!offlineReady && !needRefresh) return null

  return (
    <div
      role="status"
      className="fixed inset-x-4 top-4 z-50 mx-auto flex max-w-md items-center justify-between gap-3 rounded-2xl bg-forest-800 p-3 text-sm text-white shadow-lg"
    >
      <span>{needRefresh ? t('update.available') : t('offline.ready')}</span>
      {needRefresh ? (
        <Button
          variant="secondary"
          className="min-h-11 py-2"
          onClick={() => updateServiceWorker(true)}
        >
          {t('update.reload')}
        </Button>
      ) : (
        <button
          type="button"
          onClick={() => setOfflineReady(false)}
          className="min-h-11 px-3 font-bold underline"
        >
          {t('path.close')}
        </button>
      )}
    </div>
  )
}
