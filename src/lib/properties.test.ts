import { describe, expect, it } from 'vitest'
import { PROPERTIES, USE_ORDER, type Property, type Upgrade } from '../data/properties'
import {
  isOwned,
  isRunning,
  isShutDown,
  ownedProperties,
  parseOwnedProperties,
  setOwned,
  setShutDown,
  setUpgrade,
  upgradeSummary,
  upgradeValue,
  type OwnedProperties,
} from './properties'

// Sample catalog: shapes only, no game data (decision 004).
const toggle: Upgrade = { kind: 'toggle', id: 'equipment', label: 'Equipment' }
const choice: Upgrade = {
  kind: 'choice',
  id: 'tech',
  label: 'Technician',
  options: [
    { id: 'none', label: 'Not hired' },
    { id: 'cash', label: 'Cash' },
  ],
}
const sample = (id: string): Property => ({
  id,
  label: id,
  upgrades: [toggle, choice],
  source: 'test',
  checked: '2026-10-14',
})
const catalog = [sample('a'), sample('b'), sample('c')]

describe('owning', () => {
  it('owns nothing by default', () => {
    expect(isOwned({}, 'a')).toBe(false)
    expect(ownedProperties(catalog, {})).toEqual([])
  })

  it('lists owned properties in catalog order', () => {
    const owned = setOwned(setOwned(setOwned({}, 'c', true), 'a', true), 'b', false)
    expect(ownedProperties(catalog, owned).map((p) => p.id)).toEqual(['a', 'c'])
  })

  it('keeps upgrades when a property is sold and bought again', () => {
    let owned = setUpgrade(setOwned({}, 'a', true), 'a', 'equipment', true)
    owned = setOwned(owned, 'a', false)
    expect(isOwned(owned, 'a')).toBe(false)
    owned = setOwned(owned, 'a', true)
    expect(upgradeValue(owned, 'a', toggle)).toBe(true)
  })

  it('does not mutate its input', () => {
    const owned: OwnedProperties = { a: { owned: false, upgrades: {} } }
    setOwned(owned, 'a', true)
    setUpgrade(owned, 'a', 'equipment', true)
    expect(owned).toEqual({ a: { owned: false, upgrades: {} } })
  })
})

describe('upgradeValue', () => {
  const count: Upgrade = { kind: 'count', id: 'slots', label: 'Slots', max: 35, default: 35 }

  it('reads a count, or its default when missing or out of range', () => {
    expect(upgradeValue({}, 'a', count)).toBe(35)
    expect(upgradeValue(setUpgrade({}, 'a', 'slots', 12), 'a', count)).toBe(12)
    expect(upgradeValue(setUpgrade({}, 'a', 'slots', 0), 'a', count)).toBe(0)
    expect(upgradeValue(setUpgrade({}, 'a', 'slots', 36), 'a', count)).toBe(35)
    expect(upgradeValue(setUpgrade({}, 'a', 'slots', 2.5), 'a', count)).toBe(35)
    expect(upgradeValue(setUpgrade({}, 'a', 'slots', '12'), 'a', count)).toBe(35)
  })

  it('defaults to not bought and the first option', () => {
    expect(upgradeValue({}, 'a', toggle)).toBe(false)
    expect(upgradeValue({}, 'a', choice)).toBe('none')
  })

  it('reads saved values', () => {
    const owned = setUpgrade(setUpgrade({}, 'a', 'equipment', true), 'a', 'tech', 'cash')
    expect(upgradeValue(owned, 'a', toggle)).toBe(true)
    expect(upgradeValue(owned, 'a', choice)).toBe('cash')
    expect(upgradeValue(owned, 'b', choice)).toBe('none')
  })

  it('falls back to the default for values that do not fit', () => {
    const owned = { a: { owned: true, upgrades: { equipment: 'yes', tech: 'gone' } } }
    expect(upgradeValue(owned, 'a', toggle)).toBe(false)
    expect(upgradeValue(owned, 'a', choice)).toBe('none')
  })
})

describe('USE_ORDER', () => {
  it('lists every property once, so each has its place', () => {
    expect(PROPERTIES.map((p) => p.id)).toEqual([...USE_ORDER])
  })
})

describe('upgradeSummary', () => {
  it('names the bought upgrades and leaves out the first choice', () => {
    const property = sample('lab')
    let owned = setOwned({}, 'lab', true)
    expect(upgradeSummary(owned, property)).toBe('No upgrades')
    owned = setUpgrade(owned, 'lab', 'equipment', true)
    owned = setUpgrade(owned, 'lab', 'tech', 'cash')
    expect(upgradeSummary(owned, property)).toBe('Equipment, Technician: Cash')
  })
})

describe('parseOwnedProperties', () => {
  it('keeps every entry, listed or not', () => {
    const data = {
      a: { owned: true, upgrades: { tech: 'cash', contracts: 42 } },
      old: { owned: false, upgrades: {} },
    }
    expect(parseOwnedProperties(data)).toEqual(data)
  })

  it('drops unknown fields', () => {
    expect(parseOwnedProperties({ a: { owned: true, upgrades: {}, x: 1 } })).toEqual({
      a: { owned: true, upgrades: {} },
    })
  })

  it.each([
    ['a missing section', undefined, 'properties section is missing'],
    ['an array', [], 'properties section is missing'],
    ['a bad owned flag', { a: { owned: 'yes', upgrades: {} } }, 'property "a"'],
    ['missing upgrades', { a: { owned: true } }, 'property "a"'],
    ['a bad upgrade', { a: { owned: true, upgrades: { tech: null } } }, 'upgrade "tech"'],
  ])('rejects %s', (_, data, message) => {
    expect(parseOwnedProperties(data)).toContain(message)
  })
})

describe('shutting down', () => {
  it('runs an owned property by default', () => {
    const owned = setOwned({}, 'a', true)
    expect(isShutDown(owned, 'a')).toBe(false)
    expect(isRunning(owned, 'a')).toBe(true)
    expect(isRunning(owned, 'b')).toBe(false)
  })

  it('keeps a shut-down property owned and its upgrades', () => {
    const owned = setShutDown(
      setUpgrade(setOwned({}, 'a', true), 'a', 'equipment', true),
      'a',
      true,
    )
    expect(isOwned(owned, 'a')).toBe(true)
    expect(isRunning(owned, 'a')).toBe(false)
    expect(upgradeValue(owned, 'a', toggle)).toBe(true)
    expect(isRunning(setShutDown(owned, 'a', false), 'a')).toBe(true)
  })

  it('keeps the flag when ownership changes', () => {
    const owned = setOwned(setShutDown(setOwned({}, 'a', true), 'a', true), 'a', false)
    expect(isShutDown(setOwned(owned, 'a', true), 'a')).toBe(true)
  })

  it('reads a saved flag and rejects a bad one', () => {
    const saved = { a: { owned: true, upgrades: {}, shutDown: true } }
    expect(parseOwnedProperties(saved)).toEqual(saved)
    expect(parseOwnedProperties({ a: { owned: true, upgrades: {} } })).toEqual({
      a: { owned: true, upgrades: {} },
    })
    expect(parseOwnedProperties({ a: { owned: true, upgrades: {}, shutDown: 'yes' } })).toBe(
      'The saved shut-down setting of property "a" is not true or false.',
    )
  })
})
