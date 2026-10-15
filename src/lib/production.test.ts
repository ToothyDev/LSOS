import { describe, expect, it } from 'vitest'
import { PRODUCTION, type Production } from '../data/production'
import { PROPERTIES } from '../data/properties'
import { MANSION_BOOST } from '../data/timers'
import {
  clearShutDownStock,
  estimatedParts,
  farValueEstimated,
  forecast,
  matchingRate,
  parseBusinessBars,
  produce,
  boostRunning,
  nextBoostAt,
  parseBoosts,
  produceAll,
  rateFor,
  stockUnits,
  stockValue,
  valueBonus,
  type Boost,
  type KnownRate,
} from './production'
import { setShutDown, type OwnedProperties } from './properties'
import type { Bars } from './resync'

const MIN = 60_000

const bunker = PRODUCTION.find((p) => p.propertyId === 'bunker')!
const cocaine = PRODUCTION.find((p) => p.propertyId === 'mc-cocaine')!
const acid = PRODUCTION.find((p) => p.propertyId === 'acid-lab')!
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

describe('bunker staff assignment (issue #33)', () => {
  const staffOn = (assignment: string): KnownRate =>
    rateFor(
      bunker,
      {
        bunker: {
          owned: true,
          upgrades: { equipment: true, staff: true, 'staff-assignment': assignment },
        },
      },
      property('bunker'),
    )!

  it('keeps the sourced rate on manufacturing, the default', () => {
    expect(staffOn('manufacturing')).toEqual(fast)
    expect(fast.stockShare).toBeUndefined()
    expect(fast.estimate).toBeUndefined()
  })

  it('makes stock at half speed on both, with supplies used as fast (est.)', () => {
    const both = staffOn('both')
    // 1 unit every 14 minutes with both upgrades (gta.wiki), supplies for 20 x 7 minutes.
    expect(produce({ stock: 0, supplies: 100 }, bunker, both, 70 * MIN)).toEqual({
      stock: 5,
      supplies: 50,
    })
    expect(forecast({ stock: 0, supplies: 100 }, bunker, both)).toEqual({
      fullInMs: null,
      suppliesOutInMs: 140 * MIN,
    })
    expect(estimatedParts(both)).toEqual({ value: false, production: true })
  })

  it('makes no stock on research, and supplies still run out (est.)', () => {
    const research = staffOn('research')
    expect(produce({ stock: 40, supplies: 100 }, bunker, research, 70 * MIN)).toEqual({
      stock: 40,
      supplies: 50,
    })
    expect(forecast({ stock: 100, supplies: 100 }, bunker, research)).toEqual({
      fullInMs: null,
      suppliesOutInMs: 140 * MIN,
    })
    expect(produce({ stock: 40, supplies: 0 }, bunker, research, 70 * MIN)).toEqual({
      stock: 40,
      supplies: 0,
    })
    expect(research.estimate?.fields).toEqual(['unitsPerFullSupplies'])
  })

  it('adds its estimate to one the rate already has', () => {
    const rates = bunker.rates.map((r) =>
      r.upgrades.length === 0
        ? { ...r, estimate: { fields: ['unitValue' as const], how: 'A.' } }
        : r,
    )
    const owned = { bunker: { owned: true, upgrades: { 'staff-assignment': 'both' } } }
    const rate = matchingRate({ ...bunker, rates }, owned, property('bunker'))
    expect(rate?.estimate).toEqual({
      fields: ['unitValue', 'unitsPerFullSupplies'],
      how: `A. ${bunker.staffSplit!.how}`,
    })
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

describe('money front value bonus', () => {
  const cash = PRODUCTION.find((p) => p.propertyId === 'mc-cash')!
  const weed = PRODUCTION.find((p) => p.propertyId === 'mc-weed')!
  const both = { equipment: true, staff: true }
  const full = { stock: 100 }

  function valueOf(production: Production, owned: OwnedProperties) {
    const factory = property(production.propertyId)
    const rate = rateFor(production, owned, factory)!
    return stockValue(full, production, rate, valueBonus(production, owned, factory))
  }

  it('adds 35% to the nearby value when the front is owned', () => {
    const factory = owning('mc-cash', both)
    expect(valueOf(cash, factory)).toEqual({ nearby: 245_000, far: 367_500 })
    expect(farValueEstimated(cash, factory)).toBe(false)
    // $6,125 × 1.35 = $8,268.75, paid as whole dollars per stack.
    const withWash = { ...factory, 'car-wash': { owned: true, upgrades: {} } }
    expect(valueBonus(cash, withWash, property('mc-cash'))).toBe(0.35)
    expect(valueOf(cash, withWash).nearby).toBe(40 * 8_268)
  })

  it('adds the far bonus on the base value, not on top of the front bonus', () => {
    const owned = {
      ...owning('mc-weed', both),
      'smoke-on-the-water': { owned: true, upgrades: {} },
    }
    // 80 × $3,543 nearby, plus 50% of 80 × $2,625.
    expect(valueOf(weed, owned)).toEqual({ nearby: 283_440, far: 283_440 + 105_000 })
    expect(farValueEstimated(weed, owned)).toBe(true)
  })

  it('ignores a front that belongs to another business', () => {
    const owned = { ...owning('mc-weed', both), 'car-wash': { owned: true, upgrades: {} } }
    expect(valueBonus(weed, owned, property('mc-weed'))).toBe(0)
    expect(farValueEstimated(weed, owned)).toBe(false)
  })
})

describe('produceAll', () => {
  const owned = owning('bunker', { equipment: true, staff: true })

  it('runs owned businesses with a known rate only', () => {
    const businesses = {
      bunker: { stock: 0, supplies: 100 },
      'mc-cocaine': { stock: 0, supplies: 100 },
    }
    const next = produceAll(businesses, PROPERTIES, PRODUCTION, owned, 7 * MIN, 0, 100).businesses
    expect(next).toEqual({ ...businesses, bunker: { stock: 1, supplies: 95 } })
  })

  it('keeps a shut-down business as it is (issue #38)', () => {
    const businesses = { bunker: { stock: 0, supplies: 100 } }
    const shut = setShutDown(owned, 'bunker', true)
    const next = produceAll(businesses, PROPERTIES, PRODUCTION, shut, 7 * MIN, 0, 100)
    expect(next.businesses).toBe(businesses)
  })

  it('returns the same object when nothing changed', () => {
    const businesses = { bunker: { stock: 50, supplies: 0 } }
    const next = produceAll(businesses, PROPERTIES, PRODUCTION, owned, 7 * MIN, 0, 100)
    expect(next.businesses).toBe(businesses)
  })

  it('starts a business without saved bars empty', () => {
    expect(produceAll({}, PROPERTIES, PRODUCTION, owned, 7 * MIN, 0, 100).businesses).toEqual({
      bunker: { stock: 0, supplies: 0 },
    })
  })

  it('counts supplies from the moment they arrived', () => {
    const businesses = { bunker: { stock: 0, supplies: 0, suppliesDueAt: 1000 * MIN } }
    // 14 minutes of play ending 7 minutes after the delivery: only the last 7 produce.
    const next = produceAll(businesses, PROPERTIES, PRODUCTION, owned, 14 * MIN, 1007 * MIN, 100)
    expect(next.businesses.bunker).toEqual({ stock: 1, supplies: 95 })
  })

  it('leaves a delivery still on its way', () => {
    const businesses = { bunker: { stock: 0, supplies: 10, suppliesDueAt: 1000 * MIN } }
    const next = produceAll(businesses, PROPERTIES, PRODUCTION, owned, 7 * MIN, 999 * MIN, 100)
    expect(next.businesses.bunker).toEqual({ stock: 1, supplies: 5, suppliesDueAt: 1000 * MIN })
  })
})

describe('clearShutDownStock', () => {
  const running = owning('bunker')
  const shut = setShutDown(running, 'bunker', true)

  it('empties the stock and keeps the supplies when a business is shut down', () => {
    const businesses = { bunker: { stock: 40, supplies: 60 }, 'mc-weed': { stock: 10 } }
    expect(clearShutDownStock(businesses, running, shut)).toEqual({
      bunker: { stock: 0, supplies: 60 },
      'mc-weed': { stock: 10 },
    })
  })

  it('changes nothing when it was already shut down or starts again', () => {
    const businesses = { bunker: { stock: 40, supplies: 60 } }
    expect(clearShutDownStock(businesses, shut, shut)).toBe(businesses)
    expect(clearShutDownStock(businesses, shut, running)).toBe(businesses)
  })
})

describe('acid lab', () => {
  const lab = property('acid-lab')
  const upgraded = owning('acid-lab', { equipment: true })
  // With equipment: 1.5 minutes per unit, 45 s boosted; 160 units (0.625% each), 100 per bar.
  const rate = rateFor(acid, upgraded, lab)!
  const run = (bars: Bars, boost: Boost | undefined, playMs: number, now: number) =>
    produceAll({ 'acid-lab': bars }, PROPERTIES, PRODUCTION, upgraded, playMs, now, 100, {
      ...(boost && { 'acid-lab': boost }),
    })

  it('has a rate with and without equipment, named or not', () => {
    expect(rateFor(acid, owning('acid-lab', { named: true }), lab)?.unitValue).toBe(1_485)
    expect(rate).toMatchObject({ unitValue: 2_095, unitsPerFullSupplies: 100 })
  })

  it('matches the full values on the wiki, named and not', () => {
    const full = { stock: 100 }
    expect(stockValue(full, acid, rate)).toEqual({ nearby: 335_200, far: null })
    const named = owning('acid-lab', { equipment: true, named: true })
    expect(valueBonus(acid, named, lab)).toBe(0.05)
    expect(stockValue(full, acid, rate, valueBonus(acid, named, lab)).nearby).toBe(351_840)
    const plain = rateFor(acid, owning('acid-lab'), lab)!
    expect(stockValue(full, acid, plain, 0.05).nearby).toBe(249_440)
    expect(valueBonus(acid, upgraded, lab)).toBe(0)
  })

  it('fills in the times the wiki gives, without and with the upgrade', () => {
    const plain = rateFor(acid, owning('acid-lab'), lab)!
    // Supplies for 50 units, 100 with equipment; the wiki times assume enough supplies.
    expect(plain.minutesPerUnit * 160).toBe(6 * 60)
    expect(rate.minutesPerUnit * 160).toBe(4 * 60)
  })

  it('makes the boosted units at the boosted speed, then the rest at the normal one', () => {
    const boost = { startedAt: 0, unitsLeft: 80 }
    // 80 units in 60 minutes boosted, then 20 in 30 minutes until supplies run out.
    const next = run({ stock: 0, supplies: 100 }, boost, 90 * MIN, 90 * MIN)
    expect(next.businesses['acid-lab']).toEqual({ stock: 62.5, supplies: 0 })
    expect(next.boosts['acid-lab']).toEqual({ startedAt: 0, unitsLeft: 0 })
  })

  it('ends the boost after 24 real hours', () => {
    const boost = { startedAt: 0, unitsLeft: 80 }
    // 30 minutes boosted (40 units), then 30 minutes not (20 units).
    const next = run({ stock: 0, supplies: 100 }, boost, 60 * MIN, 24 * 60 * MIN + 30 * MIN)
    expect(next.businesses['acid-lab']?.stock).toBeCloseTo(37.5, 9)
    expect(next.boosts['acid-lab']?.unitsLeft).toBeCloseTo(40, 9)
  })

  it('starts the boost when it was started', () => {
    const boost = { startedAt: 30 * MIN, unitsLeft: 80 }
    // 30 minutes not boosted (20 units), then 30 minutes boosted (40 units).
    const next = run({ stock: 0, supplies: 100 }, boost, 60 * MIN, 60 * MIN)
    expect(next.businesses['acid-lab']?.stock).toBeCloseTo(37.5, 9)
    expect(next.boosts['acid-lab']?.unitsLeft).toBeCloseTo(40, 9)
  })

  it('keeps the boost while nothing is made', () => {
    const boosts = { 'acid-lab': { startedAt: 0, unitsLeft: 80 } }
    const businesses = { 'acid-lab': { stock: 10, supplies: 0 } }
    const next = produceAll(businesses, PROPERTIES, PRODUCTION, upgraded, MIN, MIN, 100, boosts)
    expect(next).toEqual({ businesses, boosts })
    expect(next.boosts).toBe(boosts)
  })

  it('forecasts with the boost first', () => {
    expect(forecast({ stock: 0, supplies: 100 }, acid, rate, 80)).toEqual({
      fullInMs: null,
      suppliesOutInMs: 90 * MIN,
    })
    expect(forecast({ stock: 50, supplies: 100 }, acid, rate, 80).fullInMs).toBe(60 * MIN)
    expect(forecast({ stock: 50, supplies: 100 }, acid, rate).fullInMs).toBe(120 * MIN)
  })

  it('runs a boost until its units are made or 24 real hours pass', () => {
    const boost = { startedAt: 1_000, unitsLeft: 5 }
    expect(boostRunning(boost, acid.boost, 999)).toBe(false)
    expect(boostRunning(boost, acid.boost, 1_000)).toBe(true)
    expect(boostRunning(boost, acid.boost, 1_000 + 24 * 60 * MIN)).toBe(false)
    expect(boostRunning({ ...boost, unitsLeft: 0 }, acid.boost, 2_000)).toBe(false)
  })

  it('allows the next boost after the next 6:00 UTC', () => {
    const at = (iso: string) => ({ startedAt: Date.parse(iso), unitsLeft: 80 })
    expect(nextBoostAt(undefined, acid.boost!)).toBe(-Infinity)
    expect(nextBoostAt(at('2026-10-15T05:59:00Z'), acid.boost!)).toBe(
      Date.parse('2026-10-15T06:00:00Z'),
    )
    expect(nextBoostAt(at('2026-10-15T06:00:00Z'), acid.boost!)).toBe(
      Date.parse('2026-10-16T06:00:00Z'),
    )
  })
})

describe('mansion boost (issue #14)', () => {
  const owned = owning('bunker', { equipment: true, staff: true })
  const DAY = 24 * 60 * MIN
  const mansion = (propertyId: string, startedAt = 0) => ({
    boost: { propertyId, startedAt },
    data: MANSION_BOOST,
  })
  const run = (playMs: number, now: number, boosted = mansion('bunker')) =>
    produceAll(
      { bunker: { stock: 0, supplies: 100 } },
      PROPERTIES,
      PRODUCTION,
      owned,
      playMs,
      now,
      100,
      {},
      boosted,
    ).businesses.bunker

  it('makes three times as much while on, using supplies per unit as before', () => {
    expect(run(7 * MIN, 7 * MIN)).toEqual({ stock: 3, supplies: 85 })
  })

  it('stops after 24 real hours', () => {
    // 7 minutes boosted (3 units), then 7 minutes not (1 unit).
    const bars = run(14 * MIN, DAY + 7 * MIN)!
    expect(bars.stock).toBeCloseTo(4, 9)
    expect(bars.supplies).toBeCloseTo(80, 9)
  })

  it('starts when it was activated and only for the business boosted', () => {
    // 7 minutes before the start (1 unit), then 7 minutes boosted (3 units).
    expect(run(14 * MIN, 14 * MIN, mansion('bunker', 7 * MIN))!.stock).toBeCloseTo(4, 9)
    expect(run(7 * MIN, 7 * MIN, mansion('mc-weed'))).toEqual({ stock: 1, supplies: 95 })
  })

  it('forecasts three times as fast until it ends', () => {
    const bars = { stock: 0, supplies: 100 }
    expect(forecast(bars, bunker, fast, 0, { msLeft: DAY, speed: 3 }).suppliesOutInMs).toBeCloseTo(
      (140 / 3) * MIN,
      6,
    )
    // 9 units in 21 minutes, then the other 11 units of supplies at 7 minutes each.
    expect(forecast(bars, bunker, fast, 0, { msLeft: 21 * MIN, speed: 3 })).toEqual({
      fullInMs: null,
      suppliesOutInMs: 98 * MIN,
    })
  })

  it('speeds up the Acid Lab boost too, by estimate', () => {
    const rate = rateFor(acid, owning('acid-lab', { equipment: true }), property('acid-lab'))!
    // 80 units at 15 s, then 20 at 30 s until supplies run out.
    const ahead = forecast({ stock: 0, supplies: 100 }, acid, rate, 80, { msLeft: DAY, speed: 3 })
    expect(ahead.fullInMs).toBeNull()
    expect(ahead.suppliesOutInMs).toBeCloseTo(30 * MIN, 6)
  })
})

describe('parseBoosts', () => {
  it('reads boosts', () => {
    const data = { 'acid-lab': { startedAt: 5, unitsLeft: 0 } }
    expect(parseBoosts(data)).toEqual(data)
  })

  it.each([
    ['not an object', [], 'missing'],
    ['a missing start', { a: { unitsLeft: 5 } }, 'business "a"'],
    ['units below zero', { a: { startedAt: 0, unitsLeft: -1 } }, 'business "a"'],
  ])('rejects %s', (_, data, message) => {
    expect(parseBoosts(data)).toContain(message)
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
