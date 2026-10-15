import { describe, expect, it } from 'vitest'
import { FRONTS, SHARES } from '../data/fronts'
import { PROPERTIES } from '../data/properties'
import {
  advanceFronts,
  dailyPayout,
  emptyFronts,
  fullInMs,
  heatOf,
  heatRise,
  legalJob,
  maxHeatInMs,
  mission,
  payoutParts,
  setHeat,
  syncFronts,
} from './fronts'
import { setShutDown, type OwnedProperties, type UpgradeValue } from './properties'
import { DAY_MS, type SafeState } from './safes'

const MIN = 60_000
const ALL_FRONTS = ['car-wash', 'helitours', 'smoke-on-the-water']

function owning(
  ids: readonly string[],
  upgrades: Record<string, Record<string, UpgradeValue>> = {},
): OwnedProperties {
  return Object.fromEntries(ids.map((id) => [id, { owned: true, upgrades: upgrades[id] ?? {} }]))
}

const safe = (money: number, heat: Record<string, number> = {}, sinceMs = 0): SafeState => ({
  money,
  sinceMs,
  heat,
})

describe('data', () => {
  it('has a property for every front and every business that adds to the safe', () => {
    for (const id of [...FRONTS.map((f) => f.propertyId), ...SHARES.map((s) => s.propertyId)]) {
      expect(PROPERTIES.find((p) => p.id === id)).toBeDefined()
    }
  })

  it('adds up to the in-game totals: $28,000, and $30,250 with all fronts doubled', () => {
    const everything = owning(PROPERTIES.map((p) => p.id))
    expect(dailyPayout(emptyFronts(), everything, PROPERTIES)).toBe(28_000)
    const doubled = owning(
      PROPERTIES.map((p) => p.id),
      Object.fromEntries(ALL_FRONTS.map((id) => [id, { laundering: 15 }])),
    )
    expect(dailyPayout(emptyFronts(), doubled, PROPERTIES)).toBe(30_250)
  })
})

describe('payoutParts', () => {
  it('pays nothing without the car wash', () => {
    expect(dailyPayout(emptyFronts(), owning(['helitours', 'bunker']), PROPERTIES)).toBe(0)
  })

  it('pays $750 per front, $1,500 after 15 laundering missions', () => {
    const owned = owning(ALL_FRONTS, {
      helitours: { laundering: 15 },
      'car-wash': { laundering: 14 },
    })
    expect(payoutParts(emptyFronts(), owned, PROPERTIES)).toEqual({ fronts: 3_000, others: 0 })
  })

  it('adds other businesses, the warehouse by its largest size', () => {
    const owned = owning(['car-wash', 'agency', 'special-cargo'], {
      'special-cargo': { largest: 'medium' },
    })
    expect(payoutParts(emptyFronts(), owned, PROPERTIES)).toEqual({ fronts: 750, others: 3_000 })
    const large = owning(['car-wash', 'special-cargo'])
    expect(payoutParts(emptyFronts(), large, PROPERTIES).others).toBe(1_500)
  })

  it('leaves out a shut-down business (issue #38)', () => {
    const owned = setShutDown(owning(['car-wash', 'bunker', 'mc-weed']), 'bunker', true)
    expect(payoutParts(emptyFronts(), owned, PROPERTIES)).toEqual({ fronts: 750, others: 1_000 })
  })

  it('drops a front at 100% heat, and everything when the car wash is at 100%', () => {
    const owned = owning([...ALL_FRONTS, 'bunker'])
    expect(dailyPayout(safe(0, { helitours: 100 }), owned, PROPERTIES)).toBe(1_500 + 1_500)
    expect(dailyPayout(safe(0, { 'car-wash': 100 }), owned, PROPERTIES)).toBe(0)
  })
})

describe('heatRise', () => {
  it('is 10% alone, one less per other front below 100%', () => {
    expect(heatRise(emptyFronts(), owning(['car-wash']))).toBe(10)
    expect(heatRise(emptyFronts(), owning(['car-wash', 'helitours']))).toBe(9)
    expect(heatRise(emptyFronts(), owning(ALL_FRONTS))).toBe(8)
    expect(heatRise(safe(0, { helitours: 100 }), owning(ALL_FRONTS))).toBe(9)
  })
})

describe('advanceFronts', () => {
  const owned = owning([...ALL_FRONTS, 'nightclub'])

  it('pays at the end of each in-game day, then raises heat', () => {
    const start = safe(0, { helitours: 95 })
    expect(advanceFronts(start, owned, PROPERTIES, DAY_MS - 1)).toEqual({
      ...start,
      sinceMs: DAY_MS - 1,
    })
    const day = advanceFronts(start, owned, PROPERTIES, DAY_MS + 5 * MIN)
    expect(day.money).toBe(750 * 3 + 1_500)
    expect(day.sinceMs).toBe(5 * MIN)
    expect(day.heat).toEqual({ 'car-wash': 8, helitours: 100, 'smoke-on-the-water': 8 })
    // Next day Helitours no longer pays and the others rise by 9%.
    const next = advanceFronts(day, owned, PROPERTIES, DAY_MS)
    expect(next.money).toBe(3_750 + 3_000)
    expect(next.heat).toEqual({ 'car-wash': 17, helitours: 100, 'smoke-on-the-water': 17 })
  })

  it('stops at the $100,000 cap', () => {
    const near = advanceFronts(safe(99_000), owned, PROPERTIES, DAY_MS)
    expect(near.money).toBe(100_000)
  })

  it('keeps the same object when nothing is owned or no time passed', () => {
    const start = emptyFronts()
    expect(advanceFronts(start, {}, PROPERTIES, DAY_MS)).toBe(start)
    expect(advanceFronts(start, owned, PROPERTIES, 0)).toBe(start)
  })
})

describe('syncFronts', () => {
  const owned = owning(['car-wash'])

  it('only restarts the day when the payout was counted moments ago', () => {
    expect(syncFronts(safe(750, {}, 10 * MIN), owned, PROPERTIES)).toEqual(safe(750))
  })

  it('pays now when the payout was still to come', () => {
    expect(syncFronts(safe(0, {}, 40 * MIN), owned, PROPERTIES)).toEqual(
      safe(750, { 'car-wash': 10 }),
    )
  })
})

describe('fullInMs', () => {
  const owned = owning(['car-wash'], { 'car-wash': { laundering: 15 } })

  it('counts whole days at the payout of now', () => {
    // $1,500 a day: 97,000 needs 2 payouts, the first in 30 minutes.
    expect(fullInMs(safe(97_000, {}, 18 * MIN), owned, PROPERTIES)).toBe(30 * MIN + DAY_MS)
    expect(fullInMs(safe(100_000), owned, PROPERTIES)).toBe(0)
  })

  it('is null when nothing is paid', () => {
    expect(fullInMs(safe(0, { 'car-wash': 100 }), owned, PROPERTIES)).toBeNull()
  })
})

describe('maxHeatInMs', () => {
  it('counts days of rising heat until 100%', () => {
    // 10% a day alone: 75% reaches 100% at the third payout.
    const alone = owning(['car-wash'])
    expect(maxHeatInMs(safe(0, { 'car-wash': 75 }, 8 * MIN), alone, 'car-wash')).toBe(
      40 * MIN + 2 * DAY_MS,
    )
    expect(maxHeatInMs(safe(0, { 'car-wash': 100 }), alone, 'car-wash')).toBe(0)
    expect(maxHeatInMs(emptyFronts(), alone, 'helitours')).toBeNull()
  })

  it('speeds up as other fronts reach 100%', () => {
    // 8% while all three are cool, 9% once Helitours is at 100%: 84, 93, 100.
    const owned = owning(ALL_FRONTS)
    const start = safe(0, { 'car-wash': 76, helitours: 92 })
    expect(maxHeatInMs(start, owned, 'car-wash')).toBe(3 * DAY_MS)
  })
})

describe('missions and legal work', () => {
  const owned = owning(ALL_FRONTS, { helitours: { laundering: 3 } })

  it('adds 10% heat, up to 100%, and counts a laundering mission for that front', () => {
    const after = mission(safe(0, { helitours: 95 }), owned, PROPERTIES, 'helitours', 'laundering')
    expect(heatOf(after.state, 'helitours')).toBe(100)
    expect(after.owned.helitours!.upgrades.laundering).toBe(4)
    expect(after.owned['car-wash']!.upgrades.laundering).toBeUndefined()
  })

  it('counts a Mr. Faber job for every front, heat only where it was launched', () => {
    const after = mission(emptyFronts(), owned, PROPERTIES, 'car-wash', 'faber')
    expect(after.state.heat).toEqual({ 'car-wash': 10 })
    expect(ALL_FRONTS.map((id) => after.owned[id]!.upgrades.laundering)).toEqual([1, 4, 1])
  })

  it('clears heat with legal work', () => {
    expect(legalJob(setHeat(emptyFronts(), 'car-wash', 70), 'car-wash').heat).toEqual({
      'car-wash': 0,
    })
  })
})
