import { describe, expect, it } from 'vitest'
import { DEFAULT_TAB, TABS, hashForTab, tabFromHash } from './tabs'

describe('tabFromHash', () => {
  it('round-trips every tab through its hash', () => {
    for (const tab of TABS) expect(tabFromHash(hashForTab(tab.id))).toBe(tab.id)
  })

  it('accepts a hash without the slash', () => {
    expect(tabFromHash('#heists')).toBe('heists')
  })

  it('falls back to the default tab for empty or unknown hashes', () => {
    expect(tabFromHash('')).toBe(DEFAULT_TAB)
    expect(tabFromHash('#/nope')).toBe(DEFAULT_TAB)
  })
})
