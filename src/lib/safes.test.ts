import { describe, expect, it } from 'vitest'
import { PROPERTIES } from '../data/properties'
import { SAFES } from '../data/safes'
import type { OwnedProperties, UpgradeValue } from './properties'
import {
  advanceSafe,
  advanceSafes,
  bestPayout,
  capacity,
  dailyPayout,
  DAY_MS,
  emptySafe,
  estimatedParts,
  fullInMs,
  nextPayoutInMs,
  parseSafes,
  popularityLoss,
} from './safes'

const MIN = 60_000
const safe = (id: string) => SAFES.find((s) => s.propertyId === id)!
const property = (id: string) => PROPERTIES.find((p) => p.id === id)!

function owning(id: string, upgrades: Record<string, UpgradeValue> = {}): OwnedProperties {
  return { [id]: { owned: true, upgrades } }
}

describe('data', () => {
  it('has a property for every safe and a whole-dollar payout table from 0%', () => {
    for (const s of SAFES) expect(property(s.propertyId)).toBeDefined()
    const payout = safe('nightclub').payout
    expect(payout.kind === 'popularity' && payout.rows.at(-1)?.from).toBe(0)
  })

  it('lasts one in-game day of 48 minutes between payouts', () => {
    expect(DAY_MS).toBe(48 * MIN)
  })
})

describe('dailyPayout', () => {
  const nightclub = [safe('nightclub'), owning('nightclub'), property('nightclub')] as const

  it('pays the nightclub by the popularity row at or below it', () => {
    expect(dailyPayout(...nightclub, 100)).toBe(50_000)
    expect(dailyPayout(...nightclub, 95)).toBe(50_000)
    expect(dailyPayout(...nightclub, 94)).toBe(45_000)
    expect(dailyPayout(...nightclub, 85)).toBe(25_000)
    expect(dailyPayout(...nightclub, 3)).toBe(1_500)
  })

  it('pays the agency $500 per 5 contracts, up to $20,000', () => {
    const agency = (contracts: string) =>
      dailyPayout(safe('agency'), owning('agency', { contracts }), property('agency'))
    expect(agency('0')).toBe(0)
    expect(agency('5')).toBe(500)
    expect(agency('100')).toBe(10_000)
    expect(agency('200')).toBe(20_000)
  })

  it('pays the arcade $5,000 when full, else its share of 35 slots', () => {
    const arcade = (slots?: string) =>
      dailyPayout(
        safe('arcade'),
        owning('arcade', slots ? { 'floor-slots': slots } : {}),
        property('arcade'),
      )
    expect(arcade()).toBe(5_000)
    expect(arcade('full')).toBe(5_000)
    expect(arcade('14')).toBe(2_000)
    expect(arcade('0')).toBe(0)
  })

  it('pays the salvage yard its 0% reputation amount, more with Staff', () => {
    const yard = (staff: boolean) =>
      dailyPayout(safe('salvage-yard'), owning('salvage-yard', { staff }), property('salvage-yard'))
    expect(yard(false)).toBe(250)
    expect(yard(true)).toBe(300)
  })

  it('knows the best payout of the nightclub', () => {
    expect(bestPayout(safe('nightclub'), owning('nightclub'), property('nightclub'))).toBe(50_000)
  })
})

describe('upgrades', () => {
  it('holds more in the salvage yard with the Wall Safe', () => {
    const yard = (wall: boolean) =>
      capacity(
        safe('salvage-yard'),
        owning('salvage-yard', { 'wall-safe': wall }),
        property('salvage-yard'),
      )
    expect(yard(false)).toBe(100_000)
    expect(yard(true)).toBe(250_000)
  })

  it('loses popularity slower with nightclub Staff', () => {
    const loss = (staff: boolean) =>
      popularityLoss(safe('nightclub'), owning('nightclub', { staff }), property('nightclub'))
    expect(loss(false)).toBe(10)
    expect(loss(true)).toBe(5)
    expect(popularityLoss(safe('arcade'), owning('arcade'), property('arcade'))).toBe(0)
  })

  it('marks estimated payouts and popularity', () => {
    const parts = (id: string, upgrades: Record<string, UpgradeValue> = {}) =>
      estimatedParts(safe(id), owning(id, upgrades), property(id))
    expect(parts('nightclub')).toEqual({ payout: false, popularity: true })
    expect(parts('agency')).toEqual({ payout: true, popularity: false })
    expect(parts('arcade')).toEqual({ payout: false, popularity: false })
    expect(parts('arcade', { 'floor-slots': '20' })).toEqual({ payout: true, popularity: false })
    expect(parts('salvage-yard').payout).toBe(true)
  })
})

describe('advanceSafe', () => {
  const nightclub = [safe('nightclub'), owning('nightclub'), property('nightclub')] as const

  it('pays at the end of each day, then loses popularity', () => {
    const start = { money: 0, sinceMs: 40 * MIN, popularity: 100 }
    expect(advanceSafe(start, ...nightclub, 7 * MIN)).toEqual({
      money: 0,
      sinceMs: 47 * MIN,
      popularity: 100,
    })
    expect(advanceSafe(start, ...nightclub, 8 * MIN)).toEqual({
      money: 50_000,
      sinceMs: 0,
      popularity: 90,
    })
    // 100% pays 50k, then 90% 45k, then 80% 24k.
    expect(advanceSafe(start, ...nightclub, 8 * MIN + 2 * DAY_MS)).toEqual({
      money: 119_000,
      sinceMs: 0,
      popularity: 70,
    })
  })

  it('loses 5% a day with Staff', () => {
    const staffed = [
      safe('nightclub'),
      owning('nightclub', { staff: true }),
      property('nightclub'),
    ] as const
    const after = advanceSafe({ money: 0, sinceMs: 0, popularity: 100 }, ...staffed, 2 * DAY_MS)
    // 100% and 95% both pay 50k.
    expect(after).toEqual({ money: 100_000, sinceMs: 0, popularity: 90 })
  })

  it('stops at the capacity and keeps money set above it', () => {
    const start = { money: 240_000, sinceMs: 0, popularity: 100 }
    expect(advanceSafe(start, ...nightclub, DAY_MS).money).toBe(250_000)
    const over = { money: 300_000, sinceMs: 0, popularity: 100 }
    expect(advanceSafe(over, ...nightclub, DAY_MS).money).toBe(300_000)
  })

  it('does not go below 0% popularity', () => {
    const after = advanceSafe({ money: 0, sinceMs: 0, popularity: 5 }, ...nightclub, DAY_MS)
    expect(after.popularity).toBe(0)
  })

  it('has no popularity for other safes', () => {
    const arcade = [safe('arcade'), owning('arcade'), property('arcade')] as const
    expect(advanceSafe({ money: 0, sinceMs: 0 }, ...arcade, 3 * DAY_MS)).toEqual({
      money: 15_000,
      sinceMs: 0,
    })
  })

  it('changes nothing without play time', () => {
    const state = emptySafe(safe('nightclub'))
    expect(advanceSafe(state, ...nightclub, 0)).toBe(state)
  })
})

describe('forecasts', () => {
  const nightclub = [safe('nightclub'), owning('nightclub'), property('nightclub')] as const

  it('counts down to the next payout', () => {
    expect(nextPayoutInMs({ money: 0, sinceMs: 30 * MIN })).toBe(18 * MIN)
  })

  it('counts the days until full as popularity falls', () => {
    // 50k at 100%, then 45k at 90%, 24k at 80%, 22k at 70%: full on the 4th payout.
    const state = { money: 120_000, sinceMs: 0, popularity: 100 }
    expect(fullInMs(state, ...nightclub)).toBe(4 * DAY_MS)
    // Down to $1,500 a day at 0%: 10 payouts make $185,100, then 30 more at $1,500.
    expect(fullInMs({ ...state, money: 21_000 }, ...nightclub)).toBe(40 * DAY_MS)
    expect(fullInMs({ ...state, money: 200_000, sinceMs: 18 * MIN }, ...nightclub)).toBe(30 * MIN)
  })

  it('is 0 when full and null when nothing is paid', () => {
    expect(fullInMs({ money: 250_000, sinceMs: 0, popularity: 0 }, ...nightclub)).toBe(0)
    const agency = [safe('agency'), owning('agency'), property('agency')] as const
    expect(fullInMs({ money: 0, sinceMs: 0 }, ...agency)).toBeNull()
  })
})

describe('advanceSafes', () => {
  it('pays owned safes only, starting empty', () => {
    const owned = { ...owning('arcade'), agency: { owned: false, upgrades: {} } }
    expect(advanceSafes({}, SAFES, PROPERTIES, owned, DAY_MS)).toEqual({
      arcade: { money: 5_000, sinceMs: 0 },
    })
  })

  it('returns the same object when nothing is owned', () => {
    const safes = {}
    expect(advanceSafes(safes, SAFES, PROPERTIES, {}, DAY_MS)).toBe(safes)
  })
})

describe('parseSafes', () => {
  it('keeps valid entries', () => {
    const data = {
      nightclub: { money: 10, sinceMs: 5, popularity: 50 },
      arcade: { money: 0, sinceMs: 0 },
    }
    expect(parseSafes(data)).toEqual(data)
  })

  it('rejects bad shapes', () => {
    expect(parseSafes(null)).toBeTypeOf('string')
    expect(parseSafes({ arcade: { money: -1, sinceMs: 0 } })).toBeTypeOf('string')
    expect(parseSafes({ arcade: { money: 1 } })).toBeTypeOf('string')
    expect(parseSafes({ nightclub: { money: 1, sinceMs: 0, popularity: 120 } })).toBeTypeOf(
      'string',
    )
  })
})
