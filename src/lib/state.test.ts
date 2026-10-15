import { describe, expect, it } from 'vitest'
import {
  CURRENT_VERSION,
  defaultState,
  exportFileName,
  migrate,
  parseState,
  serializeState,
  type Migration,
} from './state'

// Version 12 defaults: alerts off, 10 minutes ahead, also while focused.
const ALERTS = { browser: false, popup: false, leadMs: 600_000, unfocusedOnly: false }
// Version 13 defaults: safe and timer cards in their default order.
const ORDERS = { safeOrder: [], timerOrder: [] }
// Version 14 defaults: nothing hidden from the Overview.
const HIDDEN = { overviewHidden: [] }

describe('parseState', () => {
  it('round-trips the default state', () => {
    const result = parseState(serializeState(defaultState()))
    expect(result).toEqual({ ok: true, state: defaultState(), fromVersion: CURRENT_VERSION })
  })

  it('drops unknown fields', () => {
    const result = parseState(JSON.stringify({ ...defaultState(), junk: 1 }))
    expect(result.ok && result.state).toEqual(defaultState())
  })

  it('migrates a version 1 sample, starting paused by default', () => {
    const result = parseState('{"version":1}')
    expect(result).toEqual({
      ok: true,
      state: {
        version: 14,
        ...HIDDEN,
        clock: { trackOnOpen: false },
        properties: {},
        businesses: {},
        businessOrder: [],
        safeOrder: [],
        timerOrder: [],
        nightclub: {},
        safes: {},
        boosts: {},
        timers: {},
        alerts: ALERTS,
      },
      fromVersion: 1,
    })
  })

  it('migrates a version 2 sample, owning nothing', () => {
    const result = parseState('{"version":2,"clock":{"trackOnOpen":true}}')
    expect(result).toEqual({
      ok: true,
      state: {
        version: 14,
        ...HIDDEN,
        clock: { trackOnOpen: true },
        properties: {},
        businesses: {},
        businessOrder: [],
        safeOrder: [],
        timerOrder: [],
        nightclub: {},
        safes: {},
        boosts: {},
        timers: {},
        alerts: ALERTS,
      },
      fromVersion: 2,
    })
  })

  it('migrates a version 3 sample, tracking no business yet', () => {
    const properties = { 'mc-weed': { owned: true, upgrades: { equipment: true } } }
    const result = parseState(
      JSON.stringify({ version: 3, clock: { trackOnOpen: false }, properties }),
    )
    expect(result).toEqual({
      ok: true,
      state: {
        version: 14,
        ...HIDDEN,
        clock: { trackOnOpen: false },
        properties,
        businesses: {},
        businessOrder: [],
        safeOrder: [],
        timerOrder: [],
        nightclub: {},
        safes: {},
        boosts: {},
        timers: {},
        alerts: ALERTS,
      },
      fromVersion: 3,
    })
  })

  it('migrates a version 4 sample, keeping the catalog order of the cards', () => {
    const properties = { bunker: { owned: true, upgrades: {} } }
    const businesses = { bunker: { stock: 30, supplies: 80 } }
    const result = parseState(
      JSON.stringify({ version: 4, clock: { trackOnOpen: true }, properties, businesses }),
    )
    expect(result).toEqual({
      ok: true,
      state: {
        version: 14,
        ...HIDDEN,
        clock: { trackOnOpen: true },
        properties,
        businesses,
        businessOrder: [],
        safeOrder: [],
        timerOrder: [],
        nightclub: {},
        safes: {},
        boosts: {},
        timers: {},
        alerts: ALERTS,
      },
      fromVersion: 4,
    })
  })

  it('migrates a version 5 sample, with an empty nightclub warehouse', () => {
    const properties = { nightclub: { owned: true, upgrades: { 'technician-1': 'cash' } } }
    const sample = {
      version: 5,
      clock: { trackOnOpen: false },
      properties,
      businesses: {},
      businessOrder: ['bunker'],
    }
    expect(parseState(JSON.stringify(sample))).toEqual({
      ok: true,
      state: {
        ...sample,
        version: 14,
        ...HIDDEN,
        ...ORDERS,
        nightclub: {},
        safes: {},
        boosts: {},
        timers: {},
        alerts: ALERTS,
      },
      fromVersion: 5,
    })
  })

  it('migrates a version 6 sample, with empty safes', () => {
    const sample = {
      version: 6,
      clock: { trackOnOpen: true },
      properties: { nightclub: { owned: true, upgrades: { equipment: true } } },
      businesses: {},
      businessOrder: [],
      nightclub: { cash: 4 },
    }
    expect(parseState(JSON.stringify(sample))).toEqual({
      ok: true,
      state: {
        ...sample,
        version: 14,
        ...HIDDEN,
        ...ORDERS,
        safes: {},
        boosts: {},
        timers: {},
        alerts: ALERTS,
      },
      fromVersion: 6,
    })
  })

  it('migrates a version 7 sample, with no boosts', () => {
    const sample = {
      version: 7,
      clock: { trackOnOpen: false },
      properties: { 'acid-lab': { owned: true, upgrades: {} } },
      businesses: { 'acid-lab': { stock: 10, supplies: 50 } },
      businessOrder: [],
      nightclub: {},
      safes: {},
    }
    expect(parseState(JSON.stringify(sample))).toEqual({
      ok: true,
      state: {
        ...sample,
        version: 14,
        ...ORDERS,
        ...HIDDEN,
        boosts: {},
        timers: {},
        alerts: ALERTS,
      },
      fromVersion: 7,
    })
  })

  it('migrates a version 8 sample, keeping its safes', () => {
    const sample = {
      version: 8,
      clock: { trackOnOpen: false },
      properties: { nightclub: { owned: true, upgrades: {} } },
      businesses: {},
      businessOrder: [],
      nightclub: {},
      safes: { nightclub: { money: 50_000, sinceMs: 600_000, popularity: 85 } },
      boosts: {},
    }
    expect(parseState(JSON.stringify(sample))).toEqual({
      ok: true,
      state: { ...sample, version: 14, ...ORDERS, ...HIDDEN, timers: {}, alerts: ALERTS },
      fromVersion: 8,
    })
  })

  it('migrates a version 9 sample, keeping its properties as running', () => {
    const sample = {
      version: 9,
      clock: { trackOnOpen: false },
      properties: { 'mc-weed': { owned: true, upgrades: { equipment: true } } },
      businesses: {},
      businessOrder: [],
      nightclub: {},
      safes: {},
      boosts: {},
    }
    expect(parseState(JSON.stringify(sample))).toEqual({
      ok: true,
      state: { ...sample, version: 14, ...ORDERS, ...HIDDEN, timers: {}, alerts: ALERTS },
      fromVersion: 9,
    })
  })

  it('migrates a version 10 sample, with no timers', () => {
    const sample = {
      version: 10,
      clock: { trackOnOpen: true },
      properties: { 'mc-weed': { owned: true, upgrades: {}, shutDown: true } },
      businesses: { 'mc-weed': { stock: 20, supplies: 60 } },
      businessOrder: [],
      nightclub: {},
      safes: {},
      boosts: {},
    }
    expect(parseState(JSON.stringify(sample))).toEqual({
      ok: true,
      state: { ...sample, version: 14, ...ORDERS, ...HIDDEN, timers: {}, alerts: ALERTS },
      fromVersion: 10,
    })
  })

  it('migrates a version 11 sample, with alerts off', () => {
    const sample = {
      version: 11,
      clock: { trackOnOpen: false },
      properties: { bunker: { owned: true, upgrades: {} } },
      businesses: { bunker: { stock: 40, supplies: 80 } },
      businessOrder: [],
      nightclub: {},
      safes: {},
      boosts: {},
      timers: { luckyWheelSpunAt: 5_000 },
    }
    expect(parseState(JSON.stringify(sample))).toEqual({
      ok: true,
      state: { ...sample, version: 14, ...ORDERS, ...HIDDEN, alerts: ALERTS },
      fromVersion: 11,
    })
  })

  it('migrates a version 12 sample, with safe and timer cards in their default order', () => {
    const sample = {
      version: 12,
      clock: { trackOnOpen: false },
      properties: { agency: { owned: true, upgrades: {} } },
      businesses: {},
      businessOrder: ['bunker'],
      nightclub: {},
      safes: { agency: { money: 10_000, sinceMs: 0 } },
      boosts: {},
      timers: { luckyWheelSpunAt: 5_000 },
      alerts: ALERTS,
    }
    expect(parseState(JSON.stringify(sample))).toEqual({
      ok: true,
      state: { ...sample, version: 14, ...ORDERS, ...HIDDEN },
      fromVersion: 12,
    })
  })

  it('migrates a version 13 sample, with nothing hidden from the Overview', () => {
    const sample = {
      version: 13,
      clock: { trackOnOpen: false },
      properties: { 'car-wash': { owned: true, upgrades: {} } },
      businesses: {},
      businessOrder: [],
      safeOrder: ['car-wash'],
      timerOrder: [],
      nightclub: {},
      safes: { 'car-wash': { money: 5_000, sinceMs: 0 } },
      boosts: {},
      timers: {},
      alerts: ALERTS,
    }
    expect(parseState(JSON.stringify(sample))).toEqual({
      ok: true,
      state: { ...sample, version: 14, ...HIDDEN },
      fromVersion: 13,
    })
  })

  it('keeps the cards hidden from the Overview, once each', () => {
    const text = JSON.stringify({
      ...defaultState(),
      overviewHidden: ['car-wash', 'lucky-wheel', 'car-wash'],
    })
    expect(parseState(text)).toMatchObject({
      ok: true,
      state: { overviewHidden: ['car-wash', 'lucky-wheel'] },
    })
  })

  it('rejects unreadable hidden cards', () => {
    const text = JSON.stringify({ ...defaultState(), overviewHidden: [1] })
    expect(parseState(text)).toMatchObject({ ok: false, reason: 'invalid' })
  })

  it('keeps the safe and timer card order', () => {
    const order = { safeOrder: ['car-wash', 'agency'], timerOrder: ['mansion', 'lucky-wheel'] }
    const text = JSON.stringify({ ...defaultState(), ...order })
    expect(parseState(text)).toMatchObject({ ok: true, state: order })
  })

  it('keeps the alert settings', () => {
    const alerts = { browser: true, popup: true, leadMs: 0, unfocusedOnly: true }
    const text = JSON.stringify({ ...defaultState(), alerts })
    expect(parseState(text)).toMatchObject({ ok: true, state: { alerts } })
  })

  it('rejects unreadable alert settings', () => {
    const text = JSON.stringify({ ...defaultState(), alerts: { ...ALERTS, leadMs: -1 } })
    expect(parseState(text)).toMatchObject({ ok: false, reason: 'invalid' })
  })

  it('keeps saved timers', () => {
    const timers = {
      luckyWheelSpunAt: 5_000,
      mansionBoost: { propertyId: 'bunker', startedAt: 7_000 },
    }
    const text = JSON.stringify({ ...defaultState(), timers })
    expect(parseState(text)).toMatchObject({ ok: true, state: { timers } })
  })

  it('keeps a saved shut-down flag', () => {
    const properties = { 'mc-weed': { owned: true, upgrades: {}, shutDown: true } }
    const text = JSON.stringify({ ...defaultState(), properties })
    expect(parseState(text)).toMatchObject({ ok: true, state: { properties } })
  })

  it('keeps saved Money Fronts heat', () => {
    const safes = { 'car-wash': { money: 9_000, sinceMs: 0, heat: { 'car-wash': 30 } } }
    const text = JSON.stringify({ ...defaultState(), safes })
    expect(parseState(text)).toMatchObject({ ok: true, state: { safes } })
  })

  it('keeps saved boosts', () => {
    const boosts = { 'acid-lab': { startedAt: 1_000, unitsLeft: 42.5 } }
    const text = JSON.stringify({ ...defaultState(), boosts })
    expect(parseState(text)).toMatchObject({ ok: true, state: { boosts } })
  })

  it('keeps saved safes', () => {
    const safes = { nightclub: { money: 50_000, sinceMs: 600_000, popularity: 85 } }
    const text = JSON.stringify({ ...defaultState(), safes })
    expect(parseState(text)).toMatchObject({ ok: true, state: { safes } })
  })

  it('keeps saved nightclub stock', () => {
    const text = JSON.stringify({ ...defaultState(), nightclub: { cash: 12.5 } })
    expect(parseState(text)).toMatchObject({ ok: true, state: { nightclub: { cash: 12.5 } } })
  })

  it('keeps the saved clock setting', () => {
    const text =
      '{"version":7,"clock":{"trackOnOpen":true,"playMs":5},"properties":{},"businesses":{},"businessOrder":[],"nightclub":{},"safes":{}}'
    expect(parseState(text)).toMatchObject({ ok: true, state: { clock: { trackOnOpen: true } } })
  })

  it('keeps saved properties', () => {
    const properties = { lab: { owned: true, upgrades: { equipment: true, tech: 'cash' } } }
    const text = JSON.stringify({ ...defaultState(), properties })
    expect(parseState(text)).toMatchObject({ ok: true, state: { properties } })
  })

  it('keeps saved business bars', () => {
    const businesses = { bunker: { stock: 12.5, supplies: 40, suppliesDueAt: 1000 } }
    const text = JSON.stringify({ ...defaultState(), businesses })
    expect(parseState(text)).toMatchObject({ ok: true, state: { businesses } })
  })

  it('keeps the saved card order', () => {
    const businessOrder = ['bunker', 'mc-weed']
    const text = JSON.stringify({ ...defaultState(), businessOrder })
    expect(parseState(text)).toMatchObject({ ok: true, state: { businessOrder } })
  })

  it.each([
    [
      'a missing clock',
      '{"version":5,"properties":{},"businesses":{},"businessOrder":[],"nightclub":{}}',
      'clock section is missing',
    ],
    [
      'a bad tracking setting',
      '{"version":5,"clock":{"trackOnOpen":"yes"},"properties":{},"businesses":{},"businessOrder":[],"nightclub":{}}',
      'tracking setting',
    ],
    [
      'missing properties',
      '{"version":5,"clock":{"trackOnOpen":false},"businesses":{},"businessOrder":[],"nightclub":{}}',
      'properties section',
    ],
    [
      'missing businesses',
      '{"version":5,"clock":{"trackOnOpen":false},"properties":{},"businessOrder":[],"nightclub":{}}',
      'businesses section',
    ],
    [
      'stock over 100%',
      '{"version":5,"clock":{"trackOnOpen":false},"properties":{},"businesses":{"bunker":{"stock":120}},"businessOrder":[],"nightclub":{}}',
      'business "bunker"',
    ],
    [
      'a card order that is not a list',
      '{"version":5,"clock":{"trackOnOpen":false},"properties":{},"businesses":{},"businessOrder":"bunker"}',
      'card order',
    ],
  ])('rejects %s', (_, text, message) => {
    const result = parseState(text)
    expect(result).toMatchObject({ ok: false, reason: 'invalid' })
    expect(!result.ok && result.message).toContain(message)
  })

  it('reports a newer version without touching it', () => {
    const result = parseState(JSON.stringify({ version: CURRENT_VERSION + 1 }))
    expect(result).toMatchObject({ ok: false, reason: 'newer', version: CURRENT_VERSION + 1 })
  })

  it.each([
    ['not JSON', '{oops', 'not valid JSON'],
    ['an array', '[1]', 'expected a JSON object'],
    ['null', 'null', 'expected a JSON object'],
    ['no version', '{}', 'no valid version'],
    ['a string version', '{"version":"1"}', 'no valid version'],
    ['a fractional version', '{"version":1.5}', 'no valid version'],
    ['version zero', '{"version":0}', 'no valid version'],
  ])('rejects %s', (_, text, message) => {
    const result = parseState(text)
    expect(result.ok).toBe(false)
    expect(!result.ok && result.reason).toBe('invalid')
    expect(!result.ok && result.message).toContain(message)
  })
})

describe('migrate', () => {
  const migrations: Record<number, Migration> = {
    1: (data) => ({ ...data, renamed: data.old }),
    2: ({ renamed, ...rest }) => ({ ...rest, list: [renamed] }),
  }

  it('runs each step in order and sets the version', () => {
    expect(migrate({ version: 1, old: 'x' }, 3, migrations)).toEqual({
      version: 3,
      old: 'x',
      list: ['x'],
    })
  })

  it('starts from the stored version', () => {
    expect(migrate({ version: 2, renamed: 'y' }, 3, migrations)).toEqual({
      version: 3,
      list: ['y'],
    })
  })

  it('leaves current data alone', () => {
    const data = { version: 3, list: [] }
    expect(migrate(data, 3, migrations)).toBe(data)
  })

  it('does not mutate its input', () => {
    const data = { version: 1, old: 'x' }
    migrate(data, 3, migrations)
    expect(data).toEqual({ version: 1, old: 'x' })
  })

  it('reports a missing step', () => {
    expect(migrate({ version: 1 }, 4, migrations)).toBe('No migration from data version 3.')
  })
})

describe('exportFileName', () => {
  it('uses the local date', () => {
    expect(exportFileName(new Date(2026, 0, 5, 23, 59))).toBe('lsos-backup-2026-01-05.json')
  })
})
