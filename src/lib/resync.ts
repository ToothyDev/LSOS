// Resync: correcting a tracked value by hand (decision 003, decision 010).
// The tracker stores the typed value as of now and keeps counting from there; this module only
// parses, formats and undoes what the user types.

/** percent: stock and supplies. money: safes, in dollars. duration: time left, in milliseconds. */
export type ValueUnit = 'percent' | 'money' | 'duration'

export interface ValueBounds {
  min?: number
  max?: number
}

/** One confirmed edit: the value shown just before it, and the value it set. */
export interface Resync {
  before: number
  after: number
}

const MINUTE_MS = 60_000

export function clampValue(value: number, { min, max }: ValueBounds = {}): number {
  if (min !== undefined) value = Math.max(min, value)
  if (max !== undefined) value = Math.min(max, value)
  return value
}

/**
 * Text for a value in its unit: "40%", "$120,000", "1:05" (h:mm). Time left is rounded up to the
 * minute, so "0:00" only shows once it is done.
 */
export function formatValue(value: number, unit: ValueUnit): string {
  switch (unit) {
    case 'percent':
      return `${Math.round(value)}%`
    case 'money':
      return `$${Math.round(value).toLocaleString('en-US')}`
    case 'duration': {
      const minutes = Math.ceil(Math.max(0, value) / MINUTE_MS)
      return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`
    }
  }
}

/**
 * Reads what the user typed, as the game shows it. Returns null for anything that is not a
 * non-negative value in that unit, so the field can say so instead of guessing.
 *
 * - percent: "40" or "40%"
 * - money: "120000", "$120,000", "120k", "1.2m"
 * - duration: "1:05" (h:mm) or "45" (minutes); returns milliseconds
 */
export function parseValue(text: string, unit: ValueUnit): number | null {
  const trimmed = text.trim().toLowerCase()
  switch (unit) {
    case 'percent':
      return nonNegative(trimmed.replace(/\s*%$/, ''))
    case 'money': {
      const match = /^\$?\s*([\d.,]+)\s*([km]?)$/.exec(trimmed)
      if (!match) return null
      const amount = nonNegative((match[1] ?? '').replaceAll(',', ''))
      if (amount === null) return null
      const factor = match[2] === 'k' ? 1_000 : match[2] === 'm' ? 1_000_000 : 1
      return Math.round(amount * factor)
    }
    case 'duration': {
      const clock = /^(\d+):(\d{1,2})$/.exec(trimmed)
      if (clock) {
        const minutes = Number(clock[2])
        if (minutes > 59) return null
        return (Number(clock[1]) * 60 + minutes) * MINUTE_MS
      }
      const minutes = nonNegative(trimmed)
      return minutes === null ? null : Math.round(minutes * MINUTE_MS)
    }
  }
}

function nonNegative(text: string): number | null {
  if (!/^\d*\.?\d+$|^\d+\.$/.test(text)) return null
  return Number(text)
}

/**
 * The value to set when undoing `edit`, given the value shown now. Takes back what the edit
 * changed and keeps what the tracker counted since, so undoing a mistyped cooldown a few minutes
 * later still lands where the old estimate would be now.
 */
export function undoValue(edit: Resync, current: number, bounds: ValueBounds = {}): number {
  return clampValue(current - (edit.after - edit.before), bounds)
}
