// Nightclub warehouse: goods rise on play time per assigned technician (issue #7, decision 015).
// Pure logic: play time comes in as an argument (decision 003).
import { MAX_TECHNICIANS, NIGHTCLUB_ID, type Goods } from '../data/nightclub'
import type { Property } from '../data/properties'
import { isOwned, upgradeValue, type OwnedProperties } from './properties'

const MINUTE_MS = 60_000

/** Crates in stock by goods id, as of the last play time counted. Fractions are crates in progress. */
export type GoodsStock = Record<string, number>

/** What the nightclub settings mean for its warehouse. */
export interface WarehouseSetup {
  floors: number
  equipment: boolean
  /** Goods ids with a technician, in technician order, each once. */
  assigned: string[]
  /** Whether two technicians are on the same goods: only one of them counts. */
  doubled: boolean
}

export function warehouseSetup(owned: OwnedProperties, nightclub: Property): WarehouseSetup {
  const value = (id: string) => {
    const upgrade = nightclub.upgrades.find((u) => u.id === id)
    return upgrade ? upgradeValue(owned, nightclub.id, upgrade) : undefined
  }
  const picks: string[] = []
  for (let i = 1; i <= MAX_TECHNICIANS; i++) {
    const pick = value(`technician-${i}`)
    if (typeof pick === 'string' && pick !== 'none') picks.push(pick)
  }
  const assigned = [...new Set(picks)]
  return {
    floors: Number(value('floors')) || 1,
    equipment: value('equipment') === true,
    assigned,
    doubled: assigned.length < picks.length,
  }
}

/** Crates that fit, and whether that is an estimate: the source gives 1 and 5 floors only. */
export function capacity(goods: Goods, floors: number): { crates: number; estimated: boolean } {
  if (floors <= 1) return { crates: goods.capacity.oneFloor, estimated: false }
  if (floors >= 5) return { crates: goods.capacity.fiveFloors, estimated: false }
  return { crates: goods.capacity.oneFloor * floors, estimated: true }
}

export function msPerCrate(goods: Goods, equipment: boolean): number {
  return (equipment ? goods.minutesPerCrate.equipment : goods.minutesPerCrate.base) * MINUTE_MS
}

/** Whether the user owns a business that unlocks these goods. */
export function isUnlocked(goods: Goods, owned: OwnedProperties): boolean {
  return goods.requires.some((id) => isOwned(owned, id))
}

/** Whether these goods are being made: a technician is on them and they are unlocked. */
export function isProducing(goods: Goods, setup: WarehouseSetup, owned: OwnedProperties): boolean {
  return setup.assigned.includes(goods.id) && isUnlocked(goods, owned)
}

/** Whole crates: the game sells whole crates only. */
export function wholeCrates(stock: number): number {
  // The small margin keeps 3.9999... crates at 4 after float math.
  return Math.floor(stock + 1e-6)
}

/** Play time until these goods are full; 0 when full. */
export function fullInMs(goods: Goods, stock: number, setup: WarehouseSetup): number {
  const room = capacity(goods, setup.floors).crates - stock
  return Math.max(0, room) * msPerCrate(goods, setup.equipment)
}

/** Sale value of the whole crates in stock. */
export function goodsValue(goods: Goods, stock: number): number {
  return wholeCrates(stock) * goods.crateValue
}

/** The producing goods that fill up next (not full yet), if any. */
export function nextToFill(
  catalog: readonly Goods[],
  stock: GoodsStock,
  setup: WarehouseSetup,
  owned: OwnedProperties,
): string | undefined {
  let next: { id: string; ms: number } | undefined
  for (const goods of catalog) {
    if (!isProducing(goods, setup, owned)) continue
    const ms = fullInMs(goods, stock[goods.id] ?? 0, setup)
    if (ms > 0 && (!next || ms < next.ms)) next = { id: goods.id, ms }
  }
  return next?.id
}

/**
 * Counts a stretch of play time: each producing goods type gains crates until full. Stock above
 * the capacity (e.g. after selling a floor) stays as it is. Returns `stock` itself if nothing
 * changed, so an idle tick does not trigger a save.
 */
export function produceGoods(
  stock: GoodsStock,
  catalog: readonly Goods[],
  properties: readonly Property[],
  owned: OwnedProperties,
  playMs: number,
): GoodsStock {
  const nightclub = properties.find((p) => p.id === NIGHTCLUB_ID)
  if (!nightclub || !isOwned(owned, nightclub.id) || playMs <= 0) return stock
  const setup = warehouseSetup(owned, nightclub)
  let next = stock
  for (const goods of catalog) {
    if (!isProducing(goods, setup, owned)) continue
    const before = stock[goods.id] ?? 0
    const cap = capacity(goods, setup.floors).crates
    if (before >= cap) continue
    const after = Math.min(cap, before + playMs / msPerCrate(goods, setup.equipment))
    next = { ...next, [goods.id]: after }
  }
  return next
}

/**
 * Checks saved stock. Entries are kept for any id, like owned properties (decision 011).
 * Returns an error message if the shape is wrong.
 */
export function parseGoodsStock(data: unknown): GoodsStock | string {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return 'The nightclub section is missing.'
  }
  const result: GoodsStock = {}
  for (const [id, crates] of Object.entries(data)) {
    if (typeof crates !== 'number' || !Number.isFinite(crates) || crates < 0) {
      return `The saved nightclub stock of "${id}" is not readable.`
    }
    result[id] = crates
  }
  return result
}
