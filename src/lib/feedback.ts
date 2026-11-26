/** Light haptic feedback where supported (Android Chrome). iOS Safari has no Vibration API. */
export function vibrate(kind: 'correct' | 'wrong'): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  navigator.vibrate(kind === 'correct' ? 30 : [40, 60, 40])
}
