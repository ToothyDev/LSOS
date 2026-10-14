import { describe, expect, it } from 'vitest'
import { GOODS, NIGHTCLUB_ID } from '../data/nightclub'
import { PROPERTIES } from '../data/properties'
import {
  capacity,
  fullInMs,
  goodsValue,
  nextToFill,
  parseGoodsStock,
  produceGoods,
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
  it('is sourced for one and five floors, estimated in between', () => {
    expect(capacity(goods('cargo'), 1)).toEqual({ crates: 10, estimated: false })
    expect(capacity(goods('cargo'), 3)).toEqual({ crates: 30, estimated: true })
    expect(capacity(goods('cargo'), 5)).toEqual({ crates: 50, estimated: false })
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
