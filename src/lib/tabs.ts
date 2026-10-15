export const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'businesses', label: 'Businesses' },
  { id: 'safes', label: 'Safes' },
  { id: 'timers', label: 'Timers' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'settings', label: 'Settings' },
] as const

export type TabId = (typeof TABS)[number]['id']

export const DEFAULT_TAB: TabId = 'overview'

/**
 * Maps a location hash like `#/safes` (or `#/safes/agency`) to a tab id, falling back to the
 * default tab.
 */
export function tabFromHash(hash: string): TabId {
  const id = hash.replace(/^#\/?/, '').split('/')[0]
  return TABS.find((tab) => tab.id === id)?.id ?? DEFAULT_TAB
}

/** What to scroll to and highlight on the tab, e.g. `agency` in `#/safes/agency` (issue #15). */
export function focusFromHash(hash: string): string | undefined {
  const rest = hash.replace(/^#\/?/, '').split('/').slice(1).join('/')
  return rest ? decodeURIComponent(rest) : undefined
}

/** The hash of a tab, or of one item on it to scroll to and highlight. */
export function hashForTab(id: TabId, focus?: string): string {
  return focus ? `#/${id}/${encodeURIComponent(focus)}` : `#/${id}`
}
