/** Share of `max` that `value` fills, clamped to 0..1. A non-positive or invalid max counts as empty. */
export function meterFraction(value: number, max: number): number {
  if (!(max > 0) || !Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value / max))
}

export interface NumberBounds {
  min?: number
  max?: number
  /** Round to whole numbers. */
  integer?: boolean
}

/**
 * Parses what the user typed into a number field. Returns null for empty or non-numeric text,
 * so the field can fall back to its last valid value; otherwise rounds and clamps to the bounds.
 */
export function parseNumberField(text: string, bounds: NumberBounds = {}): number | null {
  const trimmed = text.trim()
  if (trimmed === '') return null
  let value = Number(trimmed)
  if (!Number.isFinite(value)) return null
  if (bounds.integer) value = Math.round(value)
  if (bounds.min !== undefined) value = Math.max(bounds.min, value)
  if (bounds.max !== undefined) value = Math.min(bounds.max, value)
  return value
}
