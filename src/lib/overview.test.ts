import { describe, expect, it } from 'vitest'
import { SUPPLY_PURCHASE } from '../data/business-events'
import { GOODS } from '../data/nightclub'
import { PRODUCTION } from '../data/production'
import { PROPERTIES } from '../data/properties'
import { SAFES } from '../data/safes'
import { LUCKY_WHEEL, MANSION_BOOST } from '../data/timers'
import { dueIds, newlyDue, sortEvents, type NextEvent } from './events'
import { allEvents, holdings, type TrackerData } from './overview'
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
    })
  })

  it('gives supplies out when that comes first, and arriving once bought', () => {
    const owned = owning({ bunker: { equipment: true, staff: true } })
    const s = state({ properties: owned, businesses: { bunker: { stock: 50, supplies: 100 } } })
    expect(find(allEvents(s, DATA, NOW), 'supplies:bunker')).toMatchObject({
      inMs: 140 * MIN,
      tone: 'bad',
      action: 'Resupply',
    })
    const bought = state({
      properties: owned,
      businesses: { bunker: { stock: 50, supplies: 0, suppliesDueAt: NOW + 4 * MIN } },
    })
    const events = allEvents(bought, DATA, NOW)
    expect(find(events, 'supplies:bunker')).toBeUndefined()
    expect(find(events, 'delivery:bunker')).toMatchObject({ inMs: 4 * MIN, clock: 'real' })
    // Once arrived, the supplies count again.
    expect(find(allEvents(bought, DATA, NOW + 4 * MIN), 'supplies:bunker')?.inMs).toBe(140 * MIN)
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
  })

  it('puts due bad news first, then due good news, then the soonest', () => {
    const events = [event('later', 5), event('ready', 0), event('soon', 1), event('out', 0, 'bad')]
    expect(sortEvents(events).map((e) => e.id)).toEqual(['out', 'ready', 'soon', 'later'])
  })

  it('finds what became due since the last look', () => {
    const before = dueIds([event('a', 0), event('b', 3)])
    const now = [event('a', 0), event('b', 0), event('c', 2)]
    expect(newlyDue(before, now).map((e) => e.id)).toEqual(['b'])
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
