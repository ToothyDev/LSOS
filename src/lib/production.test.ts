import { describe, expect, it } from 'vitest'
import { PRODUCTION, type Production } from '../data/production'
import { PROPERTIES } from '../data/properties'
import {
  estimatedParts,
  forecast,
  matchingRate,
  parseBusinessBars,
  produce,
  produceAll,
  rateFor,
  stockUnits,
  stockValue,
  type KnownRate,
} from './production'
import type { OwnedProperties } from './properties'
import type { Bars } from './resync'

const MIN = 60_000

const bunker = PRODUCTION.find((p) => p.propertyId === 'bunker')!
const cocaine = PRODUCTION.find((p) => p.propertyId === 'mc-cocaine')!
const property = (id: string) => PROPERTIES.find((p) => p.id === id)!

function owning(id: string, upgrades: Record<string, boolean> = {}): OwnedProperties {
  return { [id]: { owned: true, upgrades } }
}

// Bunker with both upgrades: 1 unit (1% stock) per 7 minutes, 20 units (5% supplies each) per bar.
const fast = rateFor(
  bunker,
  owning('bunker', { equipment: true, staff: true }),
  property('bunker'),
)!

describe('data', () => {
  it('has a property for every production entry and a rate per combination at most once', () => {
    for (const production of PRODUCTION) {
      expect(property(production.propertyId)).toBeDefined()
      const keys = production.rates.map((r) => [...r.upgrades].sort().join('+'))
      expect(new Set(keys).size).toBe(keys.length)
    }
  })
})

describe('rateFor', () => {
  it('matches exactly the upgrades bought', () => {
    const owned = owning('bunker', { equipment: true })
    expect(rateFor(bunker, owned, property('bunker'))).toMatchObject({
      minutesPerUnit: 8.5,
      unitValue: 6_000,
      unitsPerFullSupplies: 20,
    })
    expect(rateFor(bunker, owning('bunker'), property('bunker'))?.minutesPerUnit).toBe(10)
    expect(fast.minutesPerUnit).toBe(7)
  })

  it('has no rate for a combination the data does not list', () => {
    const rates = cocaine.rates.filter((r) => r.upgrades.join() !== 'staff')
    const partial: Production = { ...cocaine, rates }
    const owned = owning('mc-cocaine', { staff: true })
    expect(matchingRate(partial, owned, property('mc-cocaine'))).toBeUndefined()
    expect(rateFor(partial, owned, property('mc-cocaine'))).toBeUndefined()
  })

  it('has no running rate while supply use is unknown, but still the value', () => {
    const { unitsPerFullSupplies: _, ...noSupplies } = cocaine.rates[0]!
    const partial: Production = { ...cocaine, rates: [noSupplies] }
    expect(matchingRate(partial, owning('mc-cocaine'), property('mc-cocaine'))?.unitValue).toBe(
      27_000,
    )
    expect(rateFor(partial, owning('mc-cocaine'), property('mc-cocaine'))).toBeUndefined()
  })
})

describe('MC estimates (decision 013)', () => {
  const rate = (upgrades: Record<string, boolean>) =>
    rateFor(cocaine, owning('mc-cocaine', upgrades), property('mc-cocaine'))!

  it('keeps sourced values sourced', () => {
    expect(rate({ equipment: true, staff: true }).estimate).toBeUndefined()
    expect(estimatedParts(rate({ equipment: true, staff: true }))).toEqual({
      value: false,
      production: false,
    })
  })

  it('estimates supply use: as with both upgrades with equipment, half without', () => {
    expect(rate({ equipment: true })).toMatchObject({ minutesPerUnit: 40, unitsPerFullSupplies: 4 })
    expect(rate({})).toMatchObject({ minutesPerUnit: 50, unitsPerFullSupplies: 2 })
    expect(estimatedParts(rate({}))).toEqual({ value: false, production: true })
  })

  it('estimates staff only as equipment only, with supplies as without equipment', () => {
    expect(rate({ staff: true })).toMatchObject({
      minutesPerUnit: 40,
      unitValue: 31_000,
      unitsPerFullSupplies: 2,
    })
    expect(estimatedParts(rate({ staff: true }))).toEqual({ value: true, production: true })
  })
})

describe('produce', () => {
  it('raises stock and uses supplies at the rate', () => {
    expect(produce({ stock: 0, supplies: 100 }, bunker, fast, 70 * MIN)).toEqual({
      stock: 10,
      supplies: 50,
    })
  })

  it('stops when supplies run out', () => {
    expect(produce({ stock: 0, supplies: 100 }, bunker, fast, 10 * 60 * MIN)).toEqual({
      stock: 20,
      supplies: 0,
    })
  })

  it('stops when stock is full, keeping the supplies left', () => {
    expect(produce({ stock: 95, supplies: 100 }, bunker, fast, 60 * MIN)).toEqual({
      stock: 100,
      supplies: 75,
    })
  })

  it('does nothing without supplies or with full stock', () => {
    const empty = { stock: 30, supplies: 0 }
    expect(produce(empty, bunker, fast, 60 * MIN)).toBe(empty)
    const full = { stock: 100, supplies: 50 }
    expect(produce(full, bunker, fast, 60 * MIN)).toBe(full)
  })

  it('keeps a delivery on its way', () => {
    const bars = { stock: 0, supplies: 100, suppliesDueAt: 5 }
    expect(produce(bars, bunker, fast, 7 * MIN)).toEqual({ ...bars, stock: 1, supplies: 95 })
  })

  it('adds up the same in small steps as in one', () => {
    let bars: Bars = { stock: 0, supplies: 100 }
    for (let i = 0; i < 70 * 60; i++) bars = produce(bars, bunker, fast, 1000)
    expect(bars.stock).toBeCloseTo(10, 9)
    expect(bars.supplies).toBeCloseTo(50, 9)
  })
})

describe('forecast', () => {
  it('says when supplies run out if that comes first', () => {
    expect(forecast({ stock: 0, supplies: 100 }, bunker, fast)).toEqual({
      fullInMs: null,
      suppliesOutInMs: 140 * MIN,
    })
  })

  it('says when stock is full if that comes first', () => {
    expect(forecast({ stock: 90, supplies: 100 }, bunker, fast)).toEqual({
      fullInMs: 70 * MIN,
      suppliesOutInMs: null,
    })
  })

  it('counts both ending together as full', () => {
    expect(forecast({ stock: 80, supplies: 100 }, bunker, fast)).toEqual({
      fullInMs: 140 * MIN,
      suppliesOutInMs: null,
    })
  })

  it('shows done states as zero', () => {
    expect(forecast({ stock: 100, supplies: 40 }, bunker, fast).fullInMs).toBe(0)
    expect(forecast({ stock: 10, supplies: 0 }, bunker, fast).suppliesOutInMs).toBe(0)
  })
})

describe('stock value', () => {
  const full: KnownRate = {
    upgrades: [],
    minutesPerUnit: 30,
    unitValue: 35_000,
    unitsPerFullSupplies: 4,
  }

  it('counts whole units only', () => {
    expect(stockUnits({ stock: 39.99999999 }, cocaine)).toBe(4)
    expect(stockUnits({ stock: 45 }, cocaine)).toBe(4)
    expect(stockValue({ stock: 45 }, cocaine, full)).toEqual({ nearby: 140_000, far: 210_000 })
  })
})

describe('produceAll', () => {
  const owned = owning('bunker', { equipment: true, staff: true })

  it('runs owned businesses with a known rate only', () => {
    const businesses = {
      bunker: { stock: 0, supplies: 100 },
      'mc-cocaine': { stock: 0, supplies: 100 },
    }
    const next = produceAll(businesses, PROPERTIES, PRODUCTION, owned, 7 * MIN, 0, 100)
    expect(next).toEqual({ ...businesses, bunker: { stock: 1, supplies: 95 } })
  })

  it('returns the same object when nothing changed', () => {
    const businesses = { bunker: { stock: 50, supplies: 0 } }
    expect(produceAll(businesses, PROPERTIES, PRODUCTION, owned, 7 * MIN, 0, 100)).toBe(businesses)
  })

  it('starts a business without saved bars empty', () => {
    expect(produceAll({}, PROPERTIES, PRODUCTION, owned, 7 * MIN, 0, 100)).toEqual({
      bunker: { stock: 0, supplies: 0 },
    })
  })

  it('counts supplies from the moment they arrived', () => {
    const businesses = { bunker: { stock: 0, supplies: 0, suppliesDueAt: 1000 * MIN } }
    // 14 minutes of play ending 7 minutes after the delivery: only the last 7 produce.
    const next = produceAll(businesses, PROPERTIES, PRODUCTION, owned, 14 * MIN, 1007 * MIN, 100)
    expect(next.bunker).toEqual({ stock: 1, supplies: 95 })
  })

  it('leaves a delivery still on its way', () => {
    const businesses = { bunker: { stock: 0, supplies: 10, suppliesDueAt: 1000 * MIN } }
    const next = produceAll(businesses, PROPERTIES, PRODUCTION, owned, 7 * MIN, 999 * MIN, 100)
    expect(next.bunker).toEqual({ stock: 1, supplies: 5, suppliesDueAt: 1000 * MIN })
  })
})

describe('parseBusinessBars', () => {
  it('reads bars with and without supplies or a delivery', () => {
    const data = { a: { stock: 10 }, b: { stock: 0, supplies: 55.5, suppliesDueAt: 99 } }
    expect(parseBusinessBars(data)).toEqual(data)
  })

  it.each([
    ['not an object', [], 'missing'],
    ['a missing stock', { a: { supplies: 5 } }, 'business "a"'],
    ['supplies below zero', { a: { stock: 0, supplies: -1 } }, 'business "a"'],
    ['a text delivery time', { a: { stock: 0, suppliesDueAt: 'soon' } }, 'business "a"'],
  ])('rejects %s', (_, data, message) => {
    expect(parseBusinessBars(data)).toContain(message)
  })
})
