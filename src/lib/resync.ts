// Resync: correcting a tracked value by hand (decision 003, decision 010).
// The tracker stores the typed value as of now and keeps counting from there; this module only
// parses, formats and undoes what the user types.

/**
 * percent: stock and supplies. money: safes, in dollars. duration: time left, in milliseconds.
 * crates: nightclub goods, whole crates as the game shows them.
 */
export type ValueUnit = 'percent' | 'money' | 'duration' | 'crates'

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
    case 'crates':
      // Whole crates made so far; the margin keeps 3.9999... at 4 after float math.
      return String(Math.floor(value + 1e-6))
  }
}

/**
 * Reads what the user typed, as the game shows it. Returns null for anything that is not a
 * non-negative value in that unit, so the field can say so instead of guessing.
 *
 * - percent: "40" or "40%"
 * - money: "120000", "$120,000", "120k", "1.2m"
 * - duration: "1:05" (h:mm) or "45" (minutes); returns milliseconds
 * - crates: a whole number, e.g. "12"
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
    case 'crates':
      return /^\d+$/.test(trimmed) ? Number(trimmed) : null
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

/** A business's bars in percent. Some businesses have only a stock bar. */
export interface Bars {
  stock: number
  supplies?: number
  /** Wall-clock time bought supplies arrive, while a delivery is on its way. */
  suppliesDueAt?: number
}

const PERCENT: ValueBounds = { min: 0, max: 100 }

/**
 * The bars after an event such as a sale or a raid: the bars it empties go to zero, and a
 * delivery on its way is dropped if the event cancels it.
 */
export function applyEvent(
  bars: Bars,
  event: { empties: readonly ('stock' | 'supplies')[]; cancelsDelivery: boolean },
): Bars {
  const next = { ...bars }
  for (const bar of event.empties) if (next[bar] !== undefined) next[bar] = 0
  if (event.cancelsDelivery) delete next.suppliesDueAt
  return next
}

/** The bars after buying supplies at `now`: a delivery arrives `deliveryMs` later. */
export function buySupplies(bars: Bars, now: number, deliveryMs: number): Bars {
  if (bars.supplies === undefined) return bars
  return { ...bars, suppliesDueAt: now + deliveryMs }
}

/**
 * The bars as of `now`: a delivery that has arrived fills supplies to `fillsTo` and is done.
 * Trackers store bars as they were set and settle them whenever they read them.
 */
export function settleBars(bars: Bars, now: number, fillsTo: number): Bars {
  if (bars.suppliesDueAt === undefined || now < bars.suppliesDueAt) return bars
  const { suppliesDueAt: _, ...rest } = bars
  return rest.supplies === undefined ? rest : { ...rest, supplies: fillsTo }
}

/** `undoValue` for each bar, for an edit or event that changed several at once. */
export function undoBars(edit: { before: Bars; after: Bars }, current: Bars): Bars {
  const next = { ...current }
  if (edit.before.suppliesDueAt !== edit.after.suppliesDueAt) {
    if (edit.before.suppliesDueAt === undefined) delete next.suppliesDueAt
    else next.suppliesDueAt = edit.before.suppliesDueAt
  }
  for (const bar of ['stock', 'supplies'] as const) {
    const before = edit.before[bar]
    const after = edit.after[bar]
    const now = current[bar]
    if (before === undefined || after === undefined || now === undefined) continue
    next[bar] = undoValue({ before, after }, now, PERCENT)
  }
  return next
}

/** The last change to a business's bars, for its one Undo (decision 010). */
export interface BarsEdit {
  before: Bars
  after: Bars
  label: string
  /** Changes with the same group in a row form one edit, e.g. dragging and nudging one bar. */
  group?: string
}

/**
 * Records a change from `before` to `after`. A change in the same `group` as the last edit
 * extends it, so Undo takes back the whole run; any other change starts a new edit.
 */
export function recordEdit(
  last: BarsEdit | null,
  before: Bars,
  after: Bars,
  label: string,
  group?: string,
): BarsEdit {
  if (group !== undefined && last?.group === group) return { ...last, after }
  return { before: { ...before }, after, label, group }
}
