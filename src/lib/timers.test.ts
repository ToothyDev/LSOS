import { describe, expect, it } from 'vitest'
import { PROPERTIES } from '../data/properties'
import { MANSION_BOOST } from '../data/timers'
import { setShutDown, type OwnedProperties } from './properties'
import {
  boostableBusinesses,
  mansionBoostOn,
  parseTimers,
  readyAt,
  startForRemaining,
} from './timers'

const HOUR = 60 * 60_000

describe('readyAt', () => {
  it('is the start plus the cooldown, or long ago if never started', () => {
    expect(readyAt(1_000, 24 * HOUR)).toBe(1_000 + 24 * HOUR)
    expect(readyAt(undefined, 24 * HOUR)).toBe(-Infinity)
  })
})

describe('startForRemaining', () => {
  it('puts the start where the time left matches', () => {
    expect(startForRemaining(3 * HOUR, 24 * HOUR, 100 * HOUR)).toBe(79 * HOUR)
  })

  it('keeps the time left between none and the whole length', () => {
    expect(startForRemaining(30 * HOUR, 24 * HOUR, 100 * HOUR)).toBe(100 * HOUR)
    expect(startForRemaining(-5, 24 * HOUR, 100 * HOUR)).toBe(76 * HOUR)
  })
})

describe('mansionBoostOn', () => {
  const boost = { propertyId: 'bunker', startedAt: 10 * HOUR }

  it('runs for 24 real hours from its start, for the business boosted only', () => {
    expect(mansionBoostOn(boost, MANSION_BOOST, 'bunker', 10 * HOUR - 1)).toBe(false)
    expect(mansionBoostOn(boost, MANSION_BOOST, 'bunker', 10 * HOUR)).toBe(true)
    expect(mansionBoostOn(boost, MANSION_BOOST, 'bunker', 34 * HOUR - 1)).toBe(true)
    expect(mansionBoostOn(boost, MANSION_BOOST, 'bunker', 34 * HOUR)).toBe(false)
    expect(mansionBoostOn(boost, MANSION_BOOST, 'mc-weed', 11 * HOUR)).toBe(false)
    expect(mansionBoostOn(undefined, MANSION_BOOST, 'bunker', 11 * HOUR)).toBe(false)
  })
})

describe('boostableBusinesses', () => {
  const owned: OwnedProperties = {
    bunker: { owned: true, upgrades: {} },
    'mc-weed': { owned: true, upgrades: {} },
    'mc-meth': { owned: true, upgrades: {} },
    nightclub: { owned: true, upgrades: {} },
  }
  const ids = (owned: OwnedProperties, last?: string) =>
    boostableBusinesses(
      PROPERTIES,
      owned,
      MANSION_BOOST,
      last ? { propertyId: last, startedAt: 0 } : undefined,
    ).map((p) => p.id)

  it('lists owned, running businesses the boost covers', () => {
    expect(ids(owned)).toEqual(['mc-meth', 'mc-weed', 'bunker'])
    expect(ids(setShutDown(owned, 'bunker', true))).toEqual(['mc-meth', 'mc-weed'])
  })

  it('leaves out the business boosted last time', () => {
    expect(ids(owned, 'bunker')).toEqual(['mc-meth', 'mc-weed'])
  })
})

describe('parseTimers', () => {
  it('reads timers, with or without each one', () => {
    expect(parseTimers({})).toEqual({})
    const full = { luckyWheelSpunAt: 5, mansionBoost: { propertyId: 'bunker', startedAt: 7 } }
    expect(parseTimers(full)).toEqual(full)
  })

  it.each([
    ['not an object', [], 'missing'],
    ['a bad spin time', { luckyWheelSpunAt: 'now' }, 'Lucky Wheel'],
    ['a boost without a business', { mansionBoost: { startedAt: 7 } }, 'Mansion boost'],
    ['a boost without a start', { mansionBoost: { propertyId: 'bunker' } }, 'Mansion boost'],
  ])('rejects %s', (_, data, message) => {
    expect(parseTimers(data)).toContain(message)
  })
})
