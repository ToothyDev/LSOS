import { describe, expect, it } from 'vitest'
import { SUPPLY_PURCHASE } from '../data/business-events'
import { GOODS } from '../data/nightclub'
import { PRODUCTION } from '../data/production'
import { PROPERTIES } from '../data/properties'
import { SAFES } from '../data/safes'
import { LUCKY_WHEEL, MANSION_BOOST } from '../data/timers'
import { nearIds, newlyNear, sortEvents, type NextEvent } from './events'
import {
  allEvents,
  clubPopularity,
  hiddenLabel,
  holdings,
  quickAction,
  visibleEvents,
  type TrackerData,
} from './overview'
import type { OwnedProperties } from './properties'
import { DAY_MS } from './safes'
import { defaultState, type AppState } from './state'

const MIN = 60_000
const HOUR = 60 * MIN
const NOW = Date.UTC(2026, 9, 15, 12)

const DATA: TrackerData = {
  catalog: PROPERTIES,
  productions: PRODUCTION,
  goods: GOODS,
  safes: SAFES,
  wheel: LUCKY_WHEEL,
  mansion: MANSION_BOOST,
  fillsTo: SUPPLY_PURCHASE.fillsTo,
  deliveryMs: SUPPLY_PURCHASE.deliveryMs,
}

function owning(upgrades: Record<string, Record<string, boolean | string | number>>) {
  const owned: OwnedProperties = {}
  for (const [id, u] of Object.entries(upgrades)) owned[id] = { owned: true, upgrades: u }
  return owned
}

function state(changes: Partial<AppState>): AppState {
  return { ...defaultState(), ...changes }
}

const find = (events: NextEvent[], id: string) => events.find((e) => e.id === id)

describe('allEvents', () => {
  it('always has the Lucky Wheel, ready until spun', () => {
    expect(allEvents(defaultState(), DATA, NOW)).toEqual([
      expect.objectContaining({ id: 'lucky-wheel', inMs: 0, clock: 'real', tab: 'timers' }),
    ])
    const spun = state({ timers: { luckyWheelSpunAt: NOW - 23 * HOUR } })
    expect(find(allEvents(spun, DATA, NOW), 'lucky-wheel')?.inMs).toBe(HOUR)
  })

  it('gives a business stock full when that comes first, with its value', () => {
    // Bunker with both upgrades: 1% stock per 7 minutes; supplies last 20 units.
    const s = state({
      properties: owning({ bunker: { equipment: true, staff: true } }),
      businesses: { bunker: { stock: 90, supplies: 100 } },
    })
    expect(find(allEvents(s, DATA, NOW), 'stock:bunker')).toEqual({
      id: 'stock:bunker',
      source: 'Bunker',
      what: 'Stock full',
      action: 'Sell',
      inMs: 70 * MIN,
      clock: 'play',
      tone: 'good',
      level: { value: 90, max: 100, kind: 'stock' },
      // 90 units at $7,000, sold in Los Santos for 50% more.
      value: 945_000,
      estimated: false,
      tab: 'businesses',
      focus: 'bunker',
      quick: { label: 'Sold' },
    })
  })

  it('gives supplies out when that comes first', () => {
    const owned = owning({ bunker: { equipment: true, staff: true } })
    const s = state({ properties: owned, businesses: { bunker: { stock: 50, supplies: 100 } } })
    expect(find(allEvents(s, DATA, NOW), 'supplies:bunker')).toMatchObject({
      inMs: 140 * MIN,
      tone: 'bad',
      action: 'Resupply',
    })
  })

  describe('with supplies on their way', () => {
    const owned = owning({ bunker: { equipment: true, staff: true } })
    const at = (stock: number, supplies: number) =>
      allEvents(
        state({
          properties: owned,
          businesses: { bunker: { stock, supplies, suppliesDueAt: NOW + 4 * MIN } },
        }),
        DATA,
        NOW,
      )

    it('counts them from their arrival', () => {
      // Empty: nothing is made for 4 minutes, then full supplies last 140 minutes.
      expect(find(at(50, 0), 'supplies:bunker')?.inMs).toBe(144 * MIN)
      // Supplies for 2 more units: they keep running until the delivery tops them up.
      expect(find(at(50, 10), 'supplies:bunker')?.inMs).toBeCloseTo(144 * MIN)
    })

    it('gives stock full if it fills before or after they arrive', () => {
      expect(find(at(99, 100), 'stock:bunker')?.inMs).toBeCloseTo(7 * MIN)
      // No supplies: the last unit starts once they arrive.
      expect(find(at(99, 0), 'stock:bunker')?.inMs).toBeCloseTo(11 * MIN)
    })

    it('shows no countdown of its own', () => {
      expect(at(50, 0).map((e) => e.id)).toEqual(['lucky-wheel', 'supplies:bunker'])
    })
  })

  it('counts the Mansion boost and offers it again after its cooldown', () => {
    const owned = owning({ bunker: { equipment: true, staff: true }, mansion: {} })
    const s = state({
      properties: owned,
      businesses: { bunker: { stock: 50, supplies: 100 } },
      timers: { mansionBoost: { propertyId: 'bunker', startedAt: NOW - 23 * HOUR } },
    })
    const events = allEvents(s, DATA, NOW)
    // Three times as fast: 20 units in 140 / 3 minutes.
    expect(find(events, 'supplies:bunker')?.inMs).toBeCloseTo((140 * MIN) / 3)
    // Only the Bunker can be boosted, and not twice in a row: nothing to start.
    expect(find(events, 'mansion-boost')).toBeUndefined()
    const two = state({ ...s, properties: { ...owned, ...owning({ 'mc-weed': {} }) } })
    expect(find(allEvents(two, DATA, NOW), 'mansion-boost')?.inMs).toBe(HOUR)
  })

  it('gives the Acid Lab boost on real time, not while it runs', () => {
    const s = state({ properties: owning({ 'acid-lab': { equipment: true } }) })
    expect(find(allEvents(s, DATA, NOW), 'boost:acid-lab')).toMatchObject({ inMs: 0 })
    const started = state({ ...s, boosts: { 'acid-lab': { startedAt: NOW, unitsLeft: 80 } } })
    expect(find(allEvents(started, DATA, NOW), 'boost:acid-lab')).toBeUndefined()
    // All 80 units made: the next one comes at the 06:00 UTC reset.
    const done = state({ ...s, boosts: { 'acid-lab': { startedAt: NOW, unitsLeft: 0 } } })
    expect(find(allEvents(done, DATA, NOW), 'boost:acid-lab')?.inMs).toBe(18 * HOUR)
  })

  it('leaves out shut-down businesses', () => {
    const owned = owning({ 'mc-weed': {} })
    owned['mc-weed']!.shutDown = true
    const ids = allEvents(state({ properties: owned }), DATA, NOW).map((e) => e.id)
    expect(ids).toEqual(['lucky-wheel'])
  })

  it('gives nightclub goods full per technician', () => {
    // One floor: 8 crates of Cash Creation, one per 60 minutes.
    const s = state({
      properties: owning({ nightclub: { 'technician-1': 'cash' }, 'mc-cash': {} }),
      nightclub: { cash: 6 },
    })
    expect(find(allEvents(s, DATA, NOW), 'goods:cash')).toMatchObject({
      source: 'Nightclub',
      what: 'Cash Creation full',
      inMs: 120 * MIN,
      level: { value: 6, max: 8, kind: 'stock' },
      value: 28_350,
    })
  })

  it('gives safes full, and the Car Wash at max heat', () => {
    const s = state({
      properties: owning({ nightclub: {}, 'car-wash': {} }),
      safes: {
        nightclub: { money: 120_000, sinceMs: 0, popularity: 100 },
        // Alone, heat rises 10% a day: 75% reaches 100% at the third payout.
        'car-wash': { money: 0, sinceMs: 8 * MIN, heat: { 'car-wash': 75 } },
      },
    })
    const events = allEvents(s, DATA, NOW)
    expect(find(events, 'safe:nightclub')).toMatchObject({ inMs: 3 * DAY_MS, value: 120_000 })
    expect(find(events, 'heat:car-wash')).toMatchObject({
      inMs: 40 * MIN + 2 * DAY_MS,
      tone: 'bad',
      estimated: true,
    })
    expect(find(events, 'safe:car-wash')).toMatchObject({ source: 'Money Fronts' })
  })
})

describe('visibleEvents', () => {
  const owned = owning({ 'car-wash': {}, nightclub: {} })

  it('leaves out every item of a hidden card, and only those', () => {
    const events = allEvents(state({ properties: owned }), DATA, NOW)
    const ids = visibleEvents(events, ['car-wash']).map((e) => e.id)
    expect(events.some((e) => e.focus === 'car-wash')).toBe(true)
    expect(ids.some((id) => id.endsWith(':car-wash'))).toBe(false)
    expect(ids).toEqual(events.filter((e) => e.focus !== 'car-wash').map((e) => e.id))
  })

  it('hides the Lucky Wheel, which belongs to no property', () => {
    const events = allEvents(state({ properties: owned }), DATA, NOW)
    expect(find(events, 'lucky-wheel')).toBeDefined()
    expect(find(visibleEvents(events, ['lucky-wheel']), 'lucky-wheel')).toBeUndefined()
  })

  it('keeps hidden cards in the money waiting', () => {
    const safes = { 'car-wash': { money: 5_000, sinceMs: 0 } }
    const s = state({ properties: owned, safes, overviewHidden: ['car-wash'] })
    expect(holdings(s, DATA, NOW).safes).toBe(5_000)
  })
})

describe('hiddenLabel', () => {
  it('names properties by the catalog, and the Lucky Wheel', () => {
    expect(hiddenLabel('car-wash', PROPERTIES)).toBe(
      PROPERTIES.find((p) => p.id === 'car-wash')?.label,
    )
    expect(hiddenLabel('lucky-wheel', PROPERTIES)).toBe('Lucky Wheel')
  })

  it('falls back to the id for a card no longer known', () => {
    expect(hiddenLabel('gone', PROPERTIES)).toBe('gone')
  })
})

describe('sortEvents', () => {
  const event = (id: string, inMs: number, tone: 'good' | 'bad' = 'good'): NextEvent => ({
    id,
    source: id,
    what: id,
    inMs,
    clock: 'play',
    tone,
    estimated: false,
    tab: 'overview',
    focus: id,
  })

  it('puts due bad news first, then due good news, then the soonest', () => {
    const events = [event('later', 5), event('ready', 0), event('soon', 1), event('out', 0, 'bad')]
    expect(sortEvents(events).map((e) => e.id)).toEqual(['out', 'ready', 'soon', 'later'])
  })

  it('finds what came within the alert time since the last look', () => {
    const before = nearIds([event('a', 0), event('b', 3 * MIN), event('c', 20 * MIN)], 0)
    const now = [event('a', 0), event('b', 0), event('c', 9 * MIN), event('d', 11 * MIN)]
    expect(newlyNear(before, now, 0).map((e) => e.id)).toEqual(['b'])
    // Alerting 10 minutes ahead: c is that close now.
    expect(newlyNear(nearIds(now, 10 * MIN), now, 10 * MIN)).toEqual([])
    expect(newlyNear(before, now, 10 * MIN).map((e) => e.id)).toEqual(['b', 'c'])
  })
})

describe('holdings', () => {
  it('adds up stock, goods and safes', () => {
    const s = state({
      properties: owning({
        bunker: { equipment: true, staff: true },
        nightclub: {},
        'car-wash': {},
      }),
      businesses: { bunker: { stock: 10, supplies: 0 } },
      nightclub: { cash: 2.5, cargo: 1 },
      safes: {
        nightclub: { money: 40_000, sinceMs: 0, popularity: 100 },
        'car-wash': { money: 5_000, sinceMs: 0 },
      },
    })
    expect(holdings(s, DATA, NOW)).toEqual({
      stock: 105_000,
      goods: 2 * 4_725 + 10_000,
      safes: 45_000,
      estimated: false,
    })
  })
})

describe('quickAction', () => {
  it('spins the Lucky Wheel; undo puts back the last spin', () => {
    const s = state({ timers: { luckyWheelSpunAt: 1 } })
    const result = quickAction(s, DATA, 'lucky-wheel', NOW)!
    expect(result.change).toEqual({ timers: { luckyWheelSpunAt: NOW } })
    expect(result.done).toBe('Lucky Wheel spun')
    expect(result.undo(state({ timers: { luckyWheelSpunAt: NOW } }))).toEqual({
      timers: { luckyWheelSpunAt: 1 },
    })
  })

  it('starts the Mansion boost on a business it can take', () => {
    const owned = owning({ mansion: {}, bunker: {}, 'mc-weed': {} })
    const last = { propertyId: 'bunker', startedAt: NOW - 25 * HOUR }
    const s = state({ properties: owned, timers: { mansionBoost: last } })
    const event = find(allEvents(s, DATA, NOW), 'mansion-boost')
    expect(event?.quick?.choices).toEqual([{ id: 'mc-weed', label: 'Weed Farm' }])
    const result = quickAction(s, DATA, 'mansion-boost', NOW, 'mc-weed')!
    expect(result.change).toEqual({
      timers: { mansionBoost: { propertyId: 'mc-weed', startedAt: NOW } },
    })
    expect(result.undo(state({ ...s, ...result.change }))).toEqual({
      timers: { mansionBoost: last },
    })
    // Not the same business twice in a row, and not without a pick.
    expect(quickAction(s, DATA, 'mansion-boost', NOW, 'bunker')).toBeNull()
    expect(quickAction(s, DATA, 'mansion-boost', NOW)).toBeNull()
  })

  it('starts a production boost; undo removes it', () => {
    const s = state({ properties: owning({ 'acid-lab': { equipment: true } }) })
    const result = quickAction(s, DATA, 'boost:acid-lab', NOW)!
    expect(result.change).toEqual({ boosts: { 'acid-lab': { startedAt: NOW, unitsLeft: 80 } } })
    expect(result.done).toBe('Acid Lab boost started')
    expect(result.undo(state({ ...s, ...result.change }))).toEqual({ boosts: {} })
  })

  it('sells the stock; undo adds it back on top of what was made since', () => {
    const s = state({ businesses: { bunker: { stock: 100, supplies: 40 } } })
    const result = quickAction(s, DATA, 'stock:bunker', NOW)!
    expect(result.change).toEqual({ businesses: { bunker: { stock: 0, supplies: 40 } } })
    expect(result.done).toBe('Bunker: stock sold')
    const later = state({ businesses: { bunker: { stock: 2, supplies: 30 } } })
    expect(result.undo(later)).toEqual({ businesses: { bunker: { stock: 100, supplies: 30 } } })
  })

  it('buys supplies; undo cancels the delivery', () => {
    const s = state({ businesses: { bunker: { stock: 50, supplies: 0 } } })
    const result = quickAction(s, DATA, 'supplies:bunker', NOW)!
    expect(result.change).toEqual({
      businesses: { bunker: { stock: 50, supplies: 0, suppliesDueAt: NOW + 10 * MIN } },
    })
    expect(result.undo(state({ ...s, ...result.change }))).toEqual({
      businesses: { bunker: { stock: 50, supplies: 0 } },
    })
  })

  it('collects a safe; undo adds the money back to any payout since', () => {
    const s = state({ safes: { agency: { money: 250_000, sinceMs: 30 * MIN } } })
    const result = quickAction(s, DATA, 'safe:agency', NOW)!
    expect(result.change).toEqual({ safes: { agency: { money: 0, sinceMs: 30 * MIN } } })
    expect(result.done).toBe('Agency safe collected')
    const paid = state({ safes: { agency: { money: 1_250, sinceMs: 2 * MIN } } })
    expect(result.undo(paid)).toEqual({ safes: { agency: { money: 251_250, sinceMs: 2 * MIN } } })
  })

  it('collects the Money Fronts safe and clears the Car Wash heat', () => {
    const fronts = { money: 100_000, sinceMs: 0, heat: { 'car-wash': 100 } }
    const s = state({ safes: { 'car-wash': fronts } })
    expect(quickAction(s, DATA, 'safe:car-wash', NOW)?.change).toEqual({
      safes: { 'car-wash': { ...fronts, money: 0 } },
    })
    const job = quickAction(s, DATA, 'heat:car-wash', NOW)!
    expect(job.change).toEqual({ safes: { 'car-wash': { ...fronts, heat: { 'car-wash': 0 } } } })
    expect(job.undo(state({ ...s, ...job.change }))).toEqual({ safes: { 'car-wash': fronts } })
  })

  it('sells nightclub goods; undo adds them back', () => {
    const s = state({ nightclub: { cash: 8, cargo: 3 } })
    const result = quickAction(s, DATA, 'goods:cash', NOW)!
    expect(result.change).toEqual({ nightclub: { cash: 0, cargo: 3 } })
    expect(result.undo(state({ nightclub: { cash: 0.5, cargo: 3 } }))).toEqual({
      nightclub: { cash: 8.5, cargo: 3 },
    })
  })

  it('has nothing for unknown events', () => {
    expect(quickAction(defaultState(), DATA, 'stock:nope', NOW)).toBeNull()
    expect(quickAction(defaultState(), DATA, 'boost:bunker', NOW)).toBeNull()
    expect(quickAction(defaultState(), DATA, 'safe:nope', NOW)).toBeNull()
  })
})

describe('clubPopularity', () => {
  it('gives popularity and the payout it makes, with a nightclub owned', () => {
    expect(clubPopularity(defaultState(), DATA)).toBeNull()
    const s = state({
      properties: owning({ nightclub: {} }),
      safes: { nightclub: { money: 0, sinceMs: 0, popularity: 85 } },
    })
    expect(clubPopularity(s, DATA)).toEqual({ value: 85, payout: 25_000, best: 50_000 })
  })
})
