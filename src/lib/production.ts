// Business production: stock rises on play time while supplies last (issue #6, decision 012).
// Pure logic: play time and wall-clock time come in as arguments (decision 003).
import type { Production, ProductionRate } from '../data/production'
import type { Property } from '../data/properties'
import { isOwned, upgradeValue, type OwnedProperties } from './properties'
import { settleBars, type Bars } from './resync'

/** A rate with everything needed to run production on its own. */
export type KnownRate = Required<ProductionRate>

const MINUTE_MS = 60_000

/** Saved bars by property id, in percent like `BusinessBars` shows them (decision 010). */
export type BusinessBarsById = Record<string, Bars>

/** Bars of a business nobody has entered yet: empty until the user sets them. */
export function emptyBars(): Bars {
  return { stock: 0, supplies: 0 }
}

/**
 * The rate for exactly the upgrades bought, or undefined if the data has none for that
 * combination. Upgrades no rate mentions (none yet) are ignored.
 */
export function matchingRate(
  production: Production,
  owned: OwnedProperties,
  property: Property,
): ProductionRate | undefined {
  const relevant = new Set(production.rates.flatMap((rate) => rate.upgrades))
  const bought = property.upgrades
    .filter((upgrade) => relevant.has(upgrade.id))
    .filter((upgrade) => upgradeValue(owned, property.id, upgrade) === true)
    .map((upgrade) => upgrade.id)
  return production.rates.find(
    (r) => r.upgrades.length === bought.length && bought.every((id) => r.upgrades.includes(id)),
  )
}

/** `matchingRate` if it is complete enough to run production: its supply use is known. */
export function rateFor(
  production: Production,
  owned: OwnedProperties,
  property: Property,
): KnownRate | undefined {
  const rate = matchingRate(production, owned, property)
  return rate?.unitsPerFullSupplies === undefined ? undefined : (rate as KnownRate)
}

/** Play time per unit, and percent of each bar one unit adds or uses. */
function perUnit(production: Production, rate: KnownRate) {
  return {
    ms: rate.minutesPerUnit * MINUTE_MS,
    stock: 100 / production.maxUnits,
    supplies: 100 / rate.unitsPerFullSupplies,
  }
}

/** Play time until stock is full and until supplies run out, ignoring the other bar. */
function timeLeft(bars: Bars, production: Production, rate: KnownRate) {
  const unit = perUnit(production, rate)
  return {
    unit,
    untilFull: ((100 - bars.stock) / unit.stock) * unit.ms,
    untilOut: ((bars.supplies ?? 0) / unit.supplies) * unit.ms,
  }
}

/**
 * The bars after `playMs` of production: stock rises and supplies fall until stock is full or
 * supplies run out, whichever comes first.
 */
export function produce(bars: Bars, production: Production, rate: KnownRate, playMs: number): Bars {
  const { unit, untilFull, untilOut } = timeLeft(bars, production, rate)
  const ms = Math.min(playMs, untilFull, untilOut)
  if (ms <= 0) return bars
  const units = ms / unit.ms
  return {
    ...bars,
    // Exact at the end, so floating-point leftovers do not keep production going.
    stock: ms === untilFull ? 100 : bars.stock + units * unit.stock,
    supplies: ms === untilOut ? 0 : (bars.supplies ?? 0) - units * unit.supplies,
  }
}

export interface Forecast {
  /** Play time until stock is full; null if supplies run out first. 0 when full. */
  fullInMs: number | null
  /** Play time until supplies run out; null if stock fills first. 0 when out. */
  suppliesOutInMs: number | null
}

export function forecast(bars: Bars, production: Production, rate: KnownRate): Forecast {
  const { untilFull, untilOut } = timeLeft(bars, production, rate)
  if (untilFull <= 0) return { fullInMs: 0, suppliesOutInMs: null }
  return {
    fullInMs: untilFull <= untilOut ? untilFull : null,
    suppliesOutInMs: untilOut < untilFull ? untilOut : null,
  }
}

/** Whole units in stock: the game sells whole units only. */
export function stockUnits(bars: Bars, production: Production): number {
  // The small margin keeps 39.99999...% of 10 units at 4 after float math.
  return Math.floor((bars.stock * production.maxUnits) / 100 + 1e-6)
}

/** Sale value of the stock, nearby and far. */
export function stockValue(
  bars: Bars,
  production: Production,
  rate: ProductionRate,
): { nearby: number; far: number } {
  const nearby = stockUnits(bars, production) * rate.unitValue
  return { nearby, far: nearby * (1 + production.farSaleBonus) }
}

/**
 * Counts a stretch of play time for every owned business with a known rate. Supplies bought
 * that arrived during the stretch count from their arrival: the stretch is taken to end at
 * `now` (wall clock), which is exact for normal ticks. Returns `businesses` itself if nothing
 * changed, so an idle tick does not trigger a save.
 */
export function produceAll(
  businesses: BusinessBarsById,
  catalog: readonly Property[],
  productions: readonly Production[],
  owned: OwnedProperties,
  playMs: number,
  now: number,
  fillsTo: number,
): BusinessBarsById {
  let next = businesses
  for (const production of productions) {
    const property = catalog.find((p) => p.id === production.propertyId)
    if (!property || !isOwned(owned, property.id)) continue
    const rate = rateFor(production, owned, property)
    if (!rate) continue
    let bars = businesses[property.id] ?? emptyBars()
    const due = bars.suppliesDueAt
    const afterDelivery = due === undefined ? 0 : Math.min(playMs, Math.max(0, now - due))
    bars = produce(bars, production, rate, playMs - afterDelivery)
    bars = settleBars(bars, now, fillsTo)
    bars = produce(bars, production, rate, afterDelivery)
    if (bars !== businesses[property.id]) next = { ...next, [property.id]: bars }
  }
  return next
}

/**
 * Checks saved bars. Entries are kept for any id, like owned properties (decision 011).
 * Returns an error message if the shape is wrong.
 */
export function parseBusinessBars(data: unknown): BusinessBarsById | string {
  if (!isRecord(data)) return 'The businesses section is missing.'
  const result: BusinessBarsById = {}
  for (const [id, entry] of Object.entries(data)) {
    const bad = `The saved bars of business "${id}" are not readable.`
    if (!isRecord(entry) || !isPercent(entry.stock)) return bad
    const bars: Bars = { stock: entry.stock }
    if (entry.supplies !== undefined) {
      if (!isPercent(entry.supplies)) return bad
      bars.supplies = entry.supplies
    }
    if (entry.suppliesDueAt !== undefined) {
      if (typeof entry.suppliesDueAt !== 'number' || !Number.isFinite(entry.suppliesDueAt)) {
        return bad
      }
      bars.suppliesDueAt = entry.suppliesDueAt
    }
    result[id] = bars
  }
  return result
}

function isPercent(value: unknown): value is number {
  return typeof value === 'number' && value >= 0 && value <= 100
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
