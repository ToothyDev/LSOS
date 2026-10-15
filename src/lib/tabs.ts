export const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'businesses', label: 'Businesses' },
  { id: 'safes', label: 'Safes' },
  { id: 'heists', label: 'Heists' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'settings', label: 'Settings' },
] as const

export type TabId = (typeof TABS)[number]['id']

export const DEFAULT_TAB: TabId = 'overview'

/** Maps a location hash like `#/heists` to a tab id, falling back to the default tab. */
export function tabFromHash(hash: string): TabId {
  const id = hash.replace(/^#\/?/, '')
  return TABS.find((tab) => tab.id === id)?.id ?? DEFAULT_TAB
}

export function hashForTab(id: TabId): string {
  return `#/${id}`
}
