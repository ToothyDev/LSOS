// Nightclub warehouse: goods rise on play time per assigned technician (issue #7, decision 015).
// Pure logic: play time comes in as an argument (decision 003).
import { MAX_TECHNICIANS, NIGHTCLUB_ID, type Goods } from '../data/nightclub'
import type { Property } from '../data/properties'
import type { NextEvent } from './events'
import { isOwned, isRunning, upgradeValue, type OwnedProperties } from './properties'

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
  const picks = technicianPicks(owned, nightclub).filter((pick) => pick !== 'none')
  const assigned = [...new Set(picks)]
  return {
    floors: Number(value('floors')) || 1,
    equipment: value('equipment') === true,
    assigned,
    doubled: assigned.length < picks.length,
  }
}

/** What each technician is on, `technician-1` first: a goods id, or 'none'. */
export function technicianPicks(owned: OwnedProperties, nightclub: Property): string[] {
  return Array.from({ length: MAX_TECHNICIANS }, (_, i) => {
    const upgrade = nightclub.upgrades.find((u) => u.id === `technician-${i + 1}`)
    const value = upgrade ? upgradeValue(owned, nightclub.id, upgrade) : 'none'
    return typeof value === 'string' ? value : 'none'
  })
}

/** Crates that fit with this many warehouse floors. */
export function capacity(goods: Goods, floors: number): number {
  return goods.cratesPerFloor * floors
}

export function msPerCrate(goods: Goods, equipment: boolean): number {
  return (equipment ? goods.minutesPerCrate.equipment : goods.minutesPerCrate.base) * MINUTE_MS
}

/** Whether a business that unlocks these goods is owned and not shut down (issue #38). */
export function isUnlocked(goods: Goods, owned: OwnedProperties): boolean {
  return goods.requires.some((id) => isRunning(owned, id))
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
  const room = capacity(goods, setup.floors) - stock
  return Math.max(0, room) * msPerCrate(goods, setup.equipment)
}

/** Sale value of the whole crates in stock. */
export function goodsValue(goods: Goods, stock: number): number {
  return wholeCrates(stock) * goods.crateValue
}

/** Goods a technician is on that are full: the technician makes nothing until they are sold. */
export function fullGoods(
  catalog: readonly Goods[],
  stock: GoodsStock,
  setup: WarehouseSetup,
  owned: OwnedProperties,
): string[] {
  return catalog
    .filter((g) => isProducing(g, setup, owned) && fullInMs(g, stock[g.id] ?? 0, setup) <= 0)
    .map((g) => g.id)
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
    const cap = capacity(goods, setup.floors)
    if (before >= cap) continue
    const after = Math.min(cap, before + playMs / msPerCrate(goods, setup.equipment))
    next = { ...next, [goods.id]: after }
  }
  return next
}

/**
 * When each goods type a technician is making is full (issue #15): the technician then makes
 * nothing until it is sold.
 */
export function goodsEvents(
  stock: GoodsStock,
  catalog: readonly Goods[],
  properties: readonly Property[],
  owned: OwnedProperties,
): NextEvent[] {
  const nightclub = properties.find((p) => p.id === NIGHTCLUB_ID)
  if (!nightclub || !isOwned(owned, nightclub.id)) return []
  const setup = warehouseSetup(owned, nightclub)
  return catalog
    .filter((goods) => isProducing(goods, setup, owned))
    .map((goods) => {
      const crates = stock[goods.id] ?? 0
      return {
        id: `goods:${goods.id}`,
        source: nightclub.label,
        what: `${goods.label} full`,
        action: 'Sell',
        inMs: fullInMs(goods, crates, setup),
        clock: 'play',
        tone: 'good',
        level: { value: crates, max: capacity(goods, setup.floors), kind: 'stock' },
        value: goodsValue(goods, crates),
        estimated: false,
        tab: 'businesses',
      }
    })
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

/** Sale value made per hour of play time while not full. */
export function valuePerHour(goods: Goods, equipment: boolean): number {
  return (goods.crateValue * 60 * MINUTE_MS) / msPerCrate(goods, equipment)
}

/** One technician moved to other goods. `from` is 'none' if they were not assigned. */
export interface TechnicianMove {
  technician: number
  from: string
  to: string
}

export interface TechnicianSuggestion {
  /** The technician choices after the moves, one per technician (`technician-1` first). */
  picks: string[]
  moves: TechnicianMove[]
  /** Value per hour of play time it adds. */
  gainPerHour: number
}

/**
 * The assignment that makes the most money per hour from what the user owns: the unlocked goods
 * that are not full, best value per hour first, one per available technician (Yohan always,
 * the others once hired). Technicians already on one of those goods stay. Undefined if the
 * current assignment earns as much.
 */
export function suggestTechnicians(
  catalog: readonly Goods[],
  stock: GoodsStock,
  owned: OwnedProperties,
  nightclub: Property,
): TechnicianSuggestion | undefined {
  const setup = warehouseSetup(owned, nightclub)
  const picks = technicianPicks(owned, nightclub)
  const available = picks.flatMap((pick, i) => (i === 0 || pick !== 'none' ? [i] : []))
  const earning = (g: Goods) => isUnlocked(g, owned) && fullInMs(g, stock[g.id] ?? 0, setup) > 0
  const rate = (g: Goods) => valuePerHour(g, setup.equipment)
  const best = catalog
    .filter(earning)
    .sort((a, b) => rate(b) - rate(a))
    .slice(0, available.length)
  const total = (ids: Iterable<string>) =>
    [...ids].reduce((sum, id) => {
      const g = catalog.find((c) => c.id === id)
      return g && earning(g) ? sum + rate(g) : sum
    }, 0)
  const now = total(new Set(picks))
  const gainPerHour = total(best.map((g) => g.id)) - now
  if (gainPerHour <= 0) return undefined

  const next = [...picks]
  const kept = new Set<string>()
  const free: number[] = []
  for (const i of available) {
    const pick = picks[i]!
    if (best.some((g) => g.id === pick) && !kept.has(pick)) kept.add(pick)
    else free.push(i)
  }
  const missing = best.filter((g) => !kept.has(g.id))
  const moves: TechnicianMove[] = []
  missing.forEach((g, n) => {
    const i = free[n]!
    moves.push({ technician: i + 1, from: picks[i]!, to: g.id })
    next[i] = g.id
  })
  return { picks: next, moves, gainPerHour }
}
