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

export interface SliderScale {
  max: number
  /** Equal segments the bar is split into, e.g. 5 like the in-game business bars. */
  segments?: number
}

/** Drag snaps to a segment edge from this close, in hundredths of `max`. */
export const SNAP_TO_EDGE = 1.5

/**
 * Value under a drag on a slider: `fraction` is how far along the track the pointer is (any
 * number; clamped to 0..1). Rounds to whole hundredths of `max` (1% of a business bar) and
 * snaps to a segment edge when within `SNAP_TO_EDGE` of it, so the edges are easy to hit.
 */
export function dragValue(fraction: number, scale: SliderScale): number {
  const { max, segments } = scale
  const raw = meterFraction(fraction, 1) * max
  const unit = max / 100
  if (segments && segments > 0) {
    const width = max / segments
    const edge = Math.round(raw / width) * width
    if (Math.abs(raw - edge) <= SNAP_TO_EDGE * unit) return edge
  }
  return Math.round(raw / unit) * unit
}

/**
 * Value after a slider key: arrows step by a hundredth of `max` to the next whole step, Page
 * Up/Down jump to the next segment edge (a tenth of `max` without segments), Home/End go to
 * 0/max. Null for any other key.
 */
export function keyValue(value: number, key: string, scale: SliderScale): number | null {
  const { max, segments } = scale
  const jump = segments && segments > 0 ? max / segments : max / 10
  const next = (step: number, up: boolean) =>
    up ? (Math.floor(value / step + 1e-9) + 1) * step : (Math.ceil(value / step - 1e-9) - 1) * step
  let result: number
  switch (key) {
    case 'ArrowRight':
    case 'ArrowUp':
      result = next(max / 100, true)
      break
    case 'ArrowLeft':
    case 'ArrowDown':
      result = next(max / 100, false)
      break
    case 'PageUp':
      result = next(jump, true)
      break
    case 'PageDown':
      result = next(jump, false)
      break
    case 'Home':
      result = 0
      break
    case 'End':
      result = max
      break
    default:
      return null
  }
  return Math.min(max, Math.max(0, result))
}
