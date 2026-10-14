// The order the user put cards in by dragging them (issue #30).

/**
 * `ids` sorted by the saved `order`: ids it lists come first in that order, the rest follow in
 * their own order (e.g. a business bought after the cards were last moved).
 */
export function applyOrder(ids: readonly string[], order: readonly string[]): string[] {
  const rank = new Map(order.map((id, index) => [id, index]))
  const listed = ids.filter((id) => rank.has(id)).sort((a, b) => rank.get(a)! - rank.get(b)!)
  return [...listed, ...ids.filter((id) => !rank.has(id))]
}

/** `ids` with `id` moved to `index` (clamped to the list). Unchanged if `id` is not in it. */
export function moveId(ids: readonly string[], id: string, index: number): string[] {
  const from = ids.indexOf(id)
  if (from < 0) return [...ids]
  const rest = ids.filter((other) => other !== id)
  const to = Math.min(rest.length, Math.max(0, index))
  return [...rest.slice(0, to), id, ...rest.slice(to)]
}

/**
 * `ids` with `id` put at `index` and the id there put where `id` was, so no other card moves
 * (dragging a card onto another). Unchanged if `id` is not in it or `index` is out of range.
 */
export function swapAt(ids: readonly string[], id: string, index: number): string[] {
  const next = [...ids]
  const from = next.indexOf(id)
  if (from < 0 || index < 0 || index >= next.length) return next
  ;[next[from], next[index]] = [next[index]!, id]
  return next
}

/**
 * The order to save after the shown cards were rearranged to `shown`: the shown ids, then the
 * saved ids not shown now (e.g. a business sold for now), so owning it again restores its place
 * near the end rather than forgetting it.
 */
export function saveOrder(shown: readonly string[], saved: readonly string[]): string[] {
  const visible = new Set(shown)
  return [...shown, ...saved.filter((id) => !visible.has(id))]
}

/** Reads a saved order: a list of ids. Returns an error message if it is not one. */
export function parseOrder(data: unknown): string[] | string {
  if (!Array.isArray(data) || !data.every((id) => typeof id === 'string'))
    return 'The saved card order is not a list of names.'
  return [...new Set(data)]
}
