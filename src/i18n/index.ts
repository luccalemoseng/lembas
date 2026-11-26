import en from './en.json'

export type MessageKey = keyof typeof en
type Params = Record<string, string | number>

const messages: Record<MessageKey, string> = en

/**
 * Translate a UI string. All user-facing text lives in /src/i18n/*.json; add a
 * new language by adding a file with the same keys.
 */
export function t(key: MessageKey, params?: Params): string {
  const template = messages[key] ?? key
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  )
}
