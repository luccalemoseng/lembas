import type { ComponentProps, ReactNode } from 'react'
import type { TextLang } from '../engine/lesson'

/** BCP 47 / ISO 639-3 codes: Sindarin = sjn, Quenya = qya. */
const LANG_CODE: Record<TextLang, string> = { en: 'en', sindarin: 'sjn', quenya: 'qya' }

export function LangText({
  lang,
  children,
  className,
}: {
  lang: TextLang
  children: ReactNode
  className?: string
}) {
  return (
    <span lang={LANG_CODE[lang]} className={className}>
      {children}
    </span>
  )
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-forest-700 text-white shadow-[0_4px_0_var(--color-forest-900)] active:translate-y-[2px] active:shadow-[0_2px_0_var(--color-forest-900)] disabled:bg-stone-300 disabled:text-stone-600 disabled:shadow-none',
  secondary:
    'bg-white text-forest-800 border-2 border-stone-300 shadow-[0_3px_0_var(--color-stone-300)] active:translate-y-[2px] active:shadow-none',
  ghost: 'bg-transparent text-forest-700 underline-offset-4 hover:underline',
  danger: 'bg-white text-bad-700 border-2 border-bad-700',
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ComponentProps<'button'> & { variant?: Variant }) {
  return (
    <button
      type="button"
      {...props}
      className={`min-h-12 rounded-2xl px-5 py-3 font-bold tracking-wide transition-transform disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
    />
  )
}

const ICONS = {
  flame: 'M12 2c1 4 5 6 5 11a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-6 1-9.5z',
  star: 'M12 2l3 6.5 7 .8-5.2 4.8 1.5 7-6.3-3.7L5.7 21l1.5-7L2 9.3l7-.8z',
  lock: 'M7 10V7a5 5 0 0 1 10 0v3h1a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1zm2 0h6V7a3 3 0 0 0-6 0z',
  check: 'M9 16.2l-3.5-3.5L4 14.2l5 5 11-11-1.5-1.5z',
  close:
    'M18.3 5.7L12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3z',
  leaf: 'M12 2C7 6 5 11 6 16c.6 3 3 5 6 6 3-1 5.4-3 6-6 1-5-1-10-6-14zm-1 5h2v13h-2z',
  heart:
    'M12 21s-7.5-4.6-9.6-9.2C.9 8.2 3 4.5 6.6 4.5c2.1 0 3.6 1.1 4.4 2.6.8-1.5 2.3-2.6 4.4-2.6 3.6 0 5.7 3.7 4.2 7.3C19.5 16.4 12 21 12 21z',
  refresh:
    'M12 4a8 8 0 0 1 7.4 5H17v2h6V5h-2v2.3A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8zm8 8a8 8 0 0 1-14.6 4.5L7 15H1v6h2v-2.4A10 10 0 0 0 22 12z',
  trophy:
    'M7 3h10v2h4v3a5 5 0 0 1-4.6 5A5 5 0 0 1 13 16.9V19h3v2H8v-2h3v-2.1A5 5 0 0 1 7.6 13 5 5 0 0 1 3 8V5h4zm0 4H5v1a3 3 0 0 0 2 2.8zm10 0v3.8A3 3 0 0 0 19 8V7z',
  user: 'M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0 2c-5 0-9 2.5-9 6v2h18v-2c0-3.5-4-6-9-6z',
  snow: 'M11 2h2v4l2-2 1.4 1.4L13 8.8V11h2.2l3.4-3.4L20 9l-2 2h4v2h-4l2 2-1.4 1.4-3.4-3.4H13v2.2l3.4 3.4L15 20l-2-2v4h-2v-4l-2 2-1.4-1.4 3.4-3.4V13H8.8l-3.4 3.4L4 15l2-2H2v-2h4L4 9l1.4-1.4L8.8 11H11V8.8L7.6 5.4 9 4l2 2z',
} as const

export type IconName = keyof typeof ICONS

export function Icon({ name, className = 'h-6 w-6' }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill="currentColor">
      <path d={ICONS[name]} fillRule="evenodd" />
    </svg>
  )
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100)
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      className="h-4 w-full overflow-hidden rounded-full bg-stone-300"
    >
      <div
        className="h-full rounded-full bg-gold-400 transition-[width] duration-300"
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
