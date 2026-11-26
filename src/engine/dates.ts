/** A calendar day in the user's local time zone, formatted YYYY-MM-DD. */
export type DayKey = string

export function toDayKey(date: Date): DayKey {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayKey(): DayKey {
  return toDayKey(new Date())
}

function parse(key: DayKey): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  if (!match) throw new Error(`Invalid day key: ${key}`)
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

/**
 * Whole calendar days from `from` to `to` (negative if `to` is earlier).
 * Computed in UTC on the date parts only, so daylight-saving shifts cannot
 * produce 23- or 25-hour "days".
 */
export function daysBetween(from: DayKey, to: DayKey): number {
  return Math.round((parse(to) - parse(from)) / 86_400_000)
}

export function addDays(key: DayKey, days: number): DayKey {
  const d = new Date(parse(key) + days * 86_400_000)
  return d.toISOString().slice(0, 10)
}
