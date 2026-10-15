import { describe, expect, it } from 'vitest'
import { DEFAULT_TAB, TABS, focusFromHash, hashForTab, tabFromHash } from './tabs'

describe('tabFromHash', () => {
  it('round-trips every tab through its hash', () => {
    for (const tab of TABS) expect(tabFromHash(hashForTab(tab.id))).toBe(tab.id)
  })

  it('accepts a hash without the slash', () => {
    expect(tabFromHash('#safes')).toBe('safes')
  })

  it('falls back to the default tab for empty or unknown hashes', () => {
    expect(tabFromHash('')).toBe(DEFAULT_TAB)
    expect(tabFromHash('#/nope')).toBe(DEFAULT_TAB)
  })
})

describe('focusFromHash', () => {
  it('round-trips an item on a tab', () => {
    const hash = hashForTab('safes', 'salvage-yard')
    expect(hash).toBe('#/safes/salvage-yard')
    expect(tabFromHash(hash)).toBe('safes')
    expect(focusFromHash(hash)).toBe('salvage-yard')
  })

  it('is undefined without an item', () => {
    expect(focusFromHash('#/safes')).toBeUndefined()
    expect(focusFromHash('')).toBeUndefined()
  })
})
