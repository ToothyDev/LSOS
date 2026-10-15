// Business production: stock rises on play time while supplies last (issue #6, decision 012).
// Pure logic: play time and wall-clock time come in as arguments (decision 003).
import type { Production, ProductionBoost, ProductionRate } from '../data/production'
import type { Property } from '../data/properties'
import { isOwned, upgradeValue, type OwnedProperties } from './properties'
import { settleBars, type Bars } from './resync'

/** A rate with everything needed to run production on its own. */
export type KnownRate = ProductionRate & { unitsPerFullSupplies: number }

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

/**
 * Which shown numbers rest on estimated values (decision 013): the value, and everything that
 * moves with production (bars, stock count, countdowns).
 */
export function estimatedParts(rate: ProductionRate | undefined): {
  value: boolean
  production: boolean
} {
  const fields = rate?.estimate?.fields ?? []
  return {
    value: fields.includes('unitValue'),
    production: fields.includes('minutesPerUnit') || fields.includes('unitsPerFullSupplies'),
  }
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

/**
 * What comes first, in play time. With `boostUnitsLeft`, that many units are made at the
 * boosted speed first (the rate must have one).
 */
export function forecast(
  bars: Bars,
  production: Production,
  rate: KnownRate,
  boostUnitsLeft = 0,
): Forecast {
  if (boostUnitsLeft <= 0 || rate.boostedMinutesPerUnit === undefined) {
    return plainForecast(bars, production, rate)
  }
  const fast: KnownRate = { ...rate, minutesPerUnit: rate.boostedMinutesPerUnit }
  const boostMs = boostUnitsLeft * fast.minutesPerUnit * MINUTE_MS
  const boosted = plainForecast(bars, production, fast)
  if ((boosted.fullInMs ?? boosted.suppliesOutInMs ?? 0) <= boostMs) return boosted
  const rest = plainForecast(produce(bars, production, fast, boostMs), production, rate)
  return {
    fullInMs: rest.fullInMs === null ? null : rest.fullInMs + boostMs,
    suppliesOutInMs: rest.suppliesOutInMs === null ? null : rest.suppliesOutInMs + boostMs,
  }
}

function plainForecast(bars: Bars, production: Production, rate: KnownRate): Forecast {
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

/**
 * What bought upgrades and owned properties add to the sale value, e.g. 0.05 for a named
 * product or 0.35 for a Money Front. No business has both yet.
 */
export function valueBonus(
  production: Production,
  owned: OwnedProperties,
  property: Property,
): number {
  const named = production.valueBonus
  const upgrade = named && property.upgrades.find((u) => u.id === named.upgrade)
  const fromUpgrade = named && upgrade && upgradeValue(owned, property.id, upgrade) === true
  const fromOwned = ownedBonusApplies(production, owned)
  return (fromUpgrade ? named.bonus : 0) + (fromOwned ? production.ownedBonus!.bonus : 0)
}

/** Whether the property behind `ownedBonus` is owned, so the bonus is in the value. */
export function ownedBonusApplies(production: Production, owned: OwnedProperties): boolean {
  return production.ownedBonus !== undefined && isOwned(owned, production.ownedBonus.propertyId)
}

/**
 * Whether the far value is an estimate (decision 013): no source says how an owned-property
 * bonus combines with the far-sale bonus; LSOS adds them, the lower guess (decision 019).
 */
export function farValueEstimated(production: Production, owned: OwnedProperties): boolean {
  return production.farSale !== undefined && ownedBonusApplies(production, owned)
}

/** Sale value of the stock nearby, and far if a far sale pays more (null if not). */
export function stockValue(
  bars: Bars,
  production: Production,
  rate: ProductionRate,
  bonus = 0,
): { nearby: number; far: number | null } {
  // The game pays whole dollars per unit: 5% on $2,095 is $2,199 (gta.wiki, Acid Product).
  const units = stockUnits(bars, production)
  const nearby = units * Math.floor(rate.unitValue * (1 + bonus))
  // The far bonus adds its share of the base value; with no other bonus that is nearby × 1.5.
  const far = production.farSale ? nearby + units * rate.unitValue * production.farSale.bonus : null
  return { nearby, far }
}

/** A production boost the user started: when (wall clock) and the units it still speeds up. */
export interface Boost {
  startedAt: number
  unitsLeft: number
}

/** The last boost of each business by property id, kept after it ends for the daily limit. */
export type BoostsById = Record<string, Boost>

const DAY_MS = 24 * 60 * MINUTE_MS

/** A boost started at `now`. */
export function startBoost(boost: ProductionBoost, now: number): Boost {
  return { startedAt: now, unitsLeft: boost.units }
}

/** Whether the boost speeds up production at wall-clock time `now`. */
export function boostRunning(
  boost: Boost | undefined,
  data: ProductionBoost | undefined,
  now: number,
): boolean {
  return (
    !!boost &&
    !!data &&
    boost.unitsLeft > 0 &&
    now >= boost.startedAt &&
    now < boost.startedAt + data.maxRealMs
  )
}

/** When the next boost can be started (wall clock): the first daily reset after the last one. */
export function nextBoostAt(boost: Boost | undefined, data: ProductionBoost): number {
  if (!boost) return -Infinity
  const day = new Date(boost.startedAt)
  const reset = Date.UTC(
    day.getUTCFullYear(),
    day.getUTCMonth(),
    day.getUTCDate(),
    data.resetUtcHour,
  )
  return reset > boost.startedAt ? reset : reset + DAY_MS
}

/**
 * `ms` of production starting at wall-clock time `at`, boosted while the boost runs. The boost
 * counts the units it made.
 */
function step(
  bars: Bars,
  production: Production,
  rate: KnownRate,
  boost: Boost | undefined,
  ms: number,
  at: number,
): { bars: Bars; boost: Boost | undefined } {
  const boosted = rate.boostedMinutesPerUnit
  if (!boost || boosted === undefined || !boostRunning(boost, production.boost, at)) {
    return { bars: produce(bars, production, rate, ms), boost }
  }
  const fast: KnownRate = { ...rate, minutesPerUnit: boosted }
  const boostMs = Math.min(ms, boost.unitsLeft * boosted * MINUTE_MS)
  const after = produce(bars, production, fast, boostMs)
  if (after === bars) return { bars, boost }
  const made = ((after.stock - bars.stock) * production.maxUnits) / 100
  // The small margin ends the boost despite floating-point leftovers.
  const unitsLeft = boost.unitsLeft - made < 1e-6 ? 0 : boost.unitsLeft - made
  return {
    bars: produce(after, production, rate, ms - boostMs),
    boost: { ...boost, unitsLeft },
  }
}

/**
 * Counts a stretch of play time for every owned business with a known rate. The stretch is
 * taken to end at `now` (wall clock), which is exact for normal ticks: supplies bought that
 * arrived during it count from their arrival, and a boost runs from its start to its end.
 * Returns `businesses` and `boosts` themselves if nothing changed, so an idle tick does not
 * trigger a save.
 */
export function produceAll(
  businesses: BusinessBarsById,
  catalog: readonly Property[],
  productions: readonly Production[],
  owned: OwnedProperties,
  playMs: number,
  now: number,
  fillsTo: number,
  boosts: BoostsById = {},
): { businesses: BusinessBarsById; boosts: BoostsById } {
  let next = { businesses, boosts }
  for (const production of productions) {
    const property = catalog.find((p) => p.id === production.propertyId)
    if (!property || !isOwned(owned, property.id)) continue
    const rate = rateFor(production, owned, property)
    if (!rate) continue
    const id = property.id
    let bars = businesses[id] ?? emptyBars()
    let boost = boosts[id]
    // Where something changes during the stretch, in wall-clock time.
    const start = now - playMs
    const ends = boost && production.boost ? boost.startedAt + production.boost.maxRealMs : 0
    const cuts = [bars.suppliesDueAt, boost?.startedAt, boost && ends]
      .filter((t): t is number => t !== undefined && t > start && t < now)
      .sort((a, b) => a - b)
    let at = start
    for (const cut of [...cuts, now]) {
      bars = settleBars(bars, at, fillsTo)
      ;({ bars, boost } = step(bars, production, rate, boost, cut - at, at))
      at = cut
    }
    bars = settleBars(bars, now, fillsTo)
    if (bars !== businesses[id]) next = { ...next, businesses: { ...next.businesses, [id]: bars } }
    if (boost !== boosts[id] && boost) next = { ...next, boosts: { ...next.boosts, [id]: boost } }
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

/** Checks saved boosts. Returns an error message if the shape is wrong. */
export function parseBoosts(data: unknown): BoostsById | string {
  if (!isRecord(data)) return 'The boosts section is missing.'
  const result: BoostsById = {}
  for (const [id, entry] of Object.entries(data)) {
    if (
      !isRecord(entry) ||
      typeof entry.startedAt !== 'number' ||
      !Number.isFinite(entry.startedAt) ||
      typeof entry.unitsLeft !== 'number' ||
      !(entry.unitsLeft >= 0)
    ) {
      return `The saved boost of business "${id}" is not readable.`
    }
    result[id] = { startedAt: entry.startedAt, unitsLeft: entry.unitsLeft }
  }
  return result
}
