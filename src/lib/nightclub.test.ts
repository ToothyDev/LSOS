import { describe, expect, it } from 'vitest'
import { GOODS, NIGHTCLUB_ID } from '../data/nightclub'
import { PROPERTIES } from '../data/properties'
import {
  capacity,
  fullGoods,
  fullInMs,
  goodsValue,
  nextToFill,
  parseGoodsStock,
  produceGoods,
  suggestTechnicians,
  valuePerHour,
  warehouseSetup,
  wholeCrates,
} from './nightclub'
import type { OwnedProperties, UpgradeValue } from './properties'

const MIN = 60_000
const nightclub = PROPERTIES.find((p) => p.id === NIGHTCLUB_ID)!
const goods = (id: string) => GOODS.find((g) => g.id === id)!

/** Owns the nightclub with `upgrades` and every property in `also`. */
function owning(upgrades: Record<string, UpgradeValue>, also: string[] = []): OwnedProperties {
  const owned: OwnedProperties = { [NIGHTCLUB_ID]: { owned: true, upgrades } }
  for (const id of also) owned[id] = { owned: true, upgrades: {} }
  return owned
}

describe('data', () => {
  it('unlocks every goods type with properties in the catalog', () => {
    for (const g of GOODS) {
      for (const id of g.requires) expect(PROPERTIES.some((p) => p.id === id)).toBe(true)
    }
  })

  it('offers every goods type to each technician', () => {
    const techs = nightclub.upgrades.filter((u) => u.id.startsWith('technician-'))
    expect(techs).toHaveLength(5)
    for (const tech of techs) {
      expect(tech.kind === 'choice' && tech.options.map((o) => o.id)).toEqual([
        'none',
        ...GOODS.map((g) => g.id),
      ])
    }
  })
})

describe('warehouseSetup', () => {
  it('defaults to one floor, no equipment, nothing assigned', () => {
    expect(warehouseSetup(owning({}), nightclub)).toEqual({
      floors: 1,
      equipment: false,
      assigned: [],
      doubled: false,
    })
  })

  it('counts a goods type once when two technicians are on it', () => {
    const owned = owning({
      'technician-1': 'cash',
      'technician-3': 'cash',
      'technician-2': 'cargo',
    })
    expect(warehouseSetup(owned, nightclub)).toMatchObject({
      assigned: ['cash', 'cargo'],
      doubled: true,
    })
  })
})

describe('capacity', () => {
  it('grows by the same amount per floor', () => {
    expect(capacity(goods('cargo'), 1)).toBe(10)
    expect(capacity(goods('cargo'), 3)).toBe(30)
    expect(capacity(goods('cargo'), 5)).toBe(50)
  })
})

describe('produceGoods', () => {
  const owned = owning({ 'technician-1': 'cash', floors: '5', equipment: true }, ['mc-cash'])

  it('makes one Cash Creation crate per 30 minutes with equipment', () => {
    const after = produceGoods({}, GOODS, PROPERTIES, owned, 90 * MIN)
    expect(after).toEqual({ cash: 3 })
  })

  it('takes twice as long without equipment', () => {
    const slow = owning({ 'technician-1': 'cash' }, ['mc-cash'])
    expect(produceGoods({}, GOODS, PROPERTIES, slow, 90 * MIN)).toEqual({ cash: 1.5 })
  })

  it('stops at the capacity', () => {
    expect(produceGoods({ cash: 39 }, GOODS, PROPERTIES, owned, 120 * MIN)).toEqual({ cash: 40 })
  })

  it('keeps stock above the capacity as it is', () => {
    const stock = { cash: 12 }
    const oneFloor = owning({ 'technician-1': 'cash' }, ['mc-cash'])
    expect(produceGoods(stock, GOODS, PROPERTIES, oneFloor, 60 * MIN)).toBe(stock)
  })

  it('makes nothing without the linked business or the nightclub', () => {
    const stock = {}
    const noCash = owning({ 'technician-1': 'cash' })
    expect(produceGoods(stock, GOODS, PROPERTIES, noCash, 60 * MIN)).toBe(stock)
    const sold = { ...owned, [NIGHTCLUB_ID]: { ...owned[NIGHTCLUB_ID]!, owned: false } }
    expect(produceGoods(stock, GOODS, PROPERTIES, sold, 60 * MIN)).toBe(stock)
  })

  it('unlocks cargo with either the hangar or the special cargo warehouse', () => {
    const viaHangar = owning({ 'technician-1': 'cargo' }, ['hangar'])
    expect(produceGoods({}, GOODS, PROPERTIES, viaHangar, 140 * MIN)).toEqual({ cargo: 1 })
    const viaWarehouse = owning({ 'technician-1': 'cargo' }, ['special-cargo'])
    expect(produceGoods({}, GOODS, PROPERTIES, viaWarehouse, 140 * MIN)).toEqual({ cargo: 1 })
  })
})

describe('forecast and value', () => {
  const owned = owning(
    { 'technician-1': 'cash', 'technician-2': 'imports', floors: '5', equipment: true },
    ['mc-cash', 'mc-cocaine'],
  )
  const setup = warehouseSetup(owned, nightclub)

  it('gives the play time until full', () => {
    // 40 crates at 30 minutes: 20 hours, as the source says.
    expect(fullInMs(goods('cash'), 0, setup)).toBe(20 * 60 * MIN)
    expect(fullInMs(goods('cash'), 40, setup)).toBe(0)
  })

  it('picks the producing goods that fill first and are not full', () => {
    expect(nextToFill(GOODS, { cash: 39, imports: 0 }, setup, owned)).toBe('cash')
    expect(nextToFill(GOODS, { cash: 40, imports: 0 }, setup, owned)).toBe('imports')
    expect(nextToFill(GOODS, { cash: 40, imports: 10 }, setup, owned)).toBeUndefined()
  })

  it('lists the producing goods that are full', () => {
    expect(fullGoods(GOODS, { cash: 40, imports: 3, organic: 80 }, setup, owned)).toEqual(['cash'])
  })

  it('values whole crates only', () => {
    expect(wholeCrates(3.9999999)).toBe(4)
    expect(goodsValue(goods('imports'), 2.5)).toBe(54_000)
  })
})

describe('parseGoodsStock', () => {
  it('keeps any id with a non-negative number', () => {
    expect(parseGoodsStock({ cash: 3.5, future: 1 })).toEqual({ cash: 3.5, future: 1 })
  })

  it('rejects a bad shape', () => {
    expect(parseGoodsStock(null)).toBeTypeOf('string')
    expect(parseGoodsStock({ cash: -1 })).toBeTypeOf('string')
    expect(parseGoodsStock({ cash: '3' })).toBeTypeOf('string')
  })
})

describe('valuePerHour', () => {
  it('matches the per-hour values the source lists with equipment', () => {
    expect(valuePerHour(goods('imports'), true)).toBe(13_500)
    expect(valuePerHour(goods('cash'), true)).toBe(9_450)
    expect(Math.floor(valuePerHour(goods('cargo'), true))).toBe(8_571)
  })
})

describe('suggestTechnicians', () => {
  const all = ['mc-cash', 'mc-cocaine', 'mc-meth', 'mc-weed', 'mc-documents', 'bunker', 'hangar']

  it('moves technicians to the best goods the user owns, keeping the ones already there', () => {
    const owned = owning(
      {
        equipment: true,
        'technician-1': 'cash',
        'technician-2': 'organic',
        'technician-3': 'printing',
      },
      all,
    )
    const suggestion = suggestTechnicians(GOODS, {}, owned, nightclub)!
    // Best three: imports 13,500/h, pharma 11,475/h, cash 9,450/h. Cash stays with Yohan.
    expect(suggestion.picks).toEqual(['cash', 'imports', 'pharma', 'none', 'none'])
    expect(suggestion.moves).toEqual([
      { technician: 2, from: 'organic', to: 'imports' },
      { technician: 3, from: 'printing', to: 'pharma' },
    ])
    expect(suggestion.gainPerHour).toBe(13_500 + 11_475 - 6_075 - 5_400)
  })

  it('skips goods that are full or locked and never hires', () => {
    const owned = owning({ 'technician-1': 'organic' }, ['mc-weed', 'mc-cash', 'mc-cocaine'])
    const suggestion = suggestTechnicians(GOODS, { imports: 2 }, owned, nightclub)!
    expect(suggestion.picks).toEqual(['cash', 'none', 'none', 'none', 'none'])
  })

  it('has nothing to suggest once the setup is the best', () => {
    const owned = owning({ 'technician-1': 'cash', 'technician-2': 'imports' }, all)
    // Imports stays with technician 2; Yohan moves from cash to pharma.
    expect(suggestTechnicians(GOODS, {}, owned, nightclub)?.picks).toEqual([
      'pharma',
      'imports',
      'none',
      'none',
      'none',
    ])
    const best = owning({ 'technician-1': 'pharma', 'technician-2': 'imports' }, all)
    expect(suggestTechnicians(GOODS, {}, best, nightclub)).toBeUndefined()
  })
})
