// Business production: stock rises on play time while supplies last (issue #6, decision 012).
// Pure logic: play time and wall-clock time come in as arguments (decision 003).
import type { Production, ProductionBoost, ProductionRate } from '../data/production'
import type { Property } from '../data/properties'
import type { NextEvent } from './events'
import { isOwned, isRunning, isShutDown, upgradeValue, type OwnedProperties } from './properties'
import { settleBars, type Bars } from './resync'
import { mansionBoostOn, type MansionBoost, type MansionBoostData } from './timers'

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

/** A speed-up for part of a forecast: `speed` times as fast for the next `msLeft`. */
export interface SpeedUp {
  msLeft: number
  speed: number
}

/**
 * What comes first, in play time. With `boostUnitsLeft`, that many units are made at the
 * boosted speed first (the rate must have one). With `speedUp`, everything runs that much
 * faster until its time is up, counted as play time (the Mansion boost, issue #14).
 */
export function forecast(
  bars: Bars,
  production: Production,
  rate: KnownRate,
  boostUnitsLeft = 0,
  speedUp?: SpeedUp,
): Forecast {
  if (speedUp && speedUp.msLeft > 0 && speedUp.speed !== 1) {
    const fast = spedUp(rate, speedUp.speed)
    const during = forecast(bars, production, fast, boostUnitsLeft)
    if ((during.fullInMs ?? during.suppliesOutInMs ?? 0) <= speedUp.msLeft) return during
    const after = boostedRun(bars, production, fast, boostUnitsLeft, speedUp.msLeft)
    return later(forecast(after.bars, production, rate, after.unitsLeft), speedUp.msLeft)
  }
  if (boostUnitsLeft <= 0 || rate.boostedMinutesPerUnit === undefined) {
    return plainForecast(bars, production, rate)
  }
  const fast: KnownRate = { ...rate, minutesPerUnit: rate.boostedMinutesPerUnit }
  const boostMs = boostUnitsLeft * fast.minutesPerUnit * MINUTE_MS
  const boosted = plainForecast(bars, production, fast)
  if ((boosted.fullInMs ?? boosted.suppliesOutInMs ?? 0) <= boostMs) return boosted
  return later(plainForecast(produce(bars, production, fast, boostMs), production, rate), boostMs)
}

/**
 * What comes first from wall-clock time `now`, with the production boost and the Mansion boost
 * (until `mansion.endsAt`) as they run then.
 */
export function forecastAt(
  bars: Bars,
  production: Production,
  rate: KnownRate,
  now: number,
  { boost, mansion }: { boost?: Boost; mansion?: { endsAt: number; speed: number } } = {},
): Forecast {
  const boosting = boostRunning(boost, production.boost, now)
  return forecast(
    bars,
    production,
    rate,
    boosting ? boost!.unitsLeft : 0,
    mansion && now < mansion.endsAt
      ? { msLeft: mansion.endsAt - now, speed: mansion.speed }
      : undefined,
  )
}

/** `forecast` as seen `ms` earlier. */
function later(ahead: Forecast, ms: number): Forecast {
  return {
    fullInMs: ahead.fullInMs === null ? null : ahead.fullInMs + ms,
    suppliesOutInMs: ahead.suppliesOutInMs === null ? null : ahead.suppliesOutInMs + ms,
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

/** `rate` running `speed` times as fast, e.g. during the Mansion boost (issue #14). */
export function spedUp(rate: KnownRate, speed: number): KnownRate {
  if (speed === 1) return rate
  return {
    ...rate,
    minutesPerUnit: rate.minutesPerUnit / speed,
    ...(rate.boostedMinutesPerUnit !== undefined && {
      boostedMinutesPerUnit: rate.boostedMinutesPerUnit / speed,
    }),
  }
}

/**
 * `ms` of production with `unitsLeft` units still to make at the boosted speed (the rate must
 * have one), then at the normal speed. Returns the units the boost still has left.
 */
function boostedRun(
  bars: Bars,
  production: Production,
  rate: KnownRate,
  unitsLeft: number,
  ms: number,
): { bars: Bars; unitsLeft: number } {
  const boosted = rate.boostedMinutesPerUnit
  if (unitsLeft <= 0 || boosted === undefined) {
    return { bars: produce(bars, production, rate, ms), unitsLeft }
  }
  const fast: KnownRate = { ...rate, minutesPerUnit: boosted }
  const boostMs = Math.min(ms, unitsLeft * boosted * MINUTE_MS)
  const after = produce(bars, production, fast, boostMs)
  if (after === bars) return { bars, unitsLeft }
  const made = ((after.stock - bars.stock) * production.maxUnits) / 100
  // The small margin ends the boost despite floating-point leftovers.
  const left = unitsLeft - made < 1e-6 ? 0 : unitsLeft - made
  return { bars: produce(after, production, rate, ms - boostMs), unitsLeft: left }
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
  if (!boost || !boostRunning(boost, production.boost, at)) {
    return { bars: produce(bars, production, rate, ms), boost }
  }
  const run = boostedRun(bars, production, rate, boost.unitsLeft, ms)
  if (run.unitsLeft === boost.unitsLeft) return { bars: run.bars, boost }
  return { bars: run.bars, boost: { ...boost, unitsLeft: run.unitsLeft } }
}

/**
 * Counts a stretch of play time for every running business with a known rate: a shut-down one
 * keeps its bars as they are (issue #38). The stretch is
 * taken to end at `now` (wall clock), which is exact for normal ticks: supplies bought that
 * arrived during it count from their arrival, and a boost runs from its start to its end, as
 * does the Mansion boost (`mansion`, issue #14) for the business it boosts.
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
  mansion?: { boost: MansionBoost | undefined; data: MansionBoostData },
): { businesses: BusinessBarsById; boosts: BoostsById } {
  let next = { businesses, boosts }
  for (const production of productions) {
    const property = catalog.find((p) => p.id === production.propertyId)
    if (!property || !isRunning(owned, property.id)) continue
    const rate = rateFor(production, owned, property)
    if (!rate) continue
    const id = property.id
    let bars = businesses[id] ?? emptyBars()
    let boost = boosts[id]
    // Where something changes during the stretch, in wall-clock time.
    const start = now - playMs
    const ends = boost && production.boost ? boost.startedAt + production.boost.maxRealMs : 0
    const sped = mansion?.boost?.propertyId === id ? mansion.boost : undefined
    const spedEnds = sped && sped.startedAt + mansion!.data.durationMs
    const cuts = [bars.suppliesDueAt, boost?.startedAt, boost && ends, sped?.startedAt, spedEnds]
      .filter((t): t is number => t !== undefined && t > start && t < now)
      .sort((a, b) => a - b)
    let at = start
    for (const cut of [...cuts, now]) {
      bars = settleBars(bars, at, fillsTo)
      const fast = mansion && mansionBoostOn(mansion.boost, mansion.data, id, at)
      const r = fast ? spedUp(rate, mansion.data.speed) : rate
      ;({ bars, boost } = step(bars, production, r, boost, cut - at, at))
      at = cut
    }
    bars = settleBars(bars, now, fillsTo)
    if (bars !== businesses[id]) next = { ...next, businesses: { ...next.businesses, [id]: bars } }
    if (boost !== boosts[id] && boost) next = { ...next, boosts: { ...next.boosts, [id]: boost } }
  }
  return next
}

/**
 * What comes next for each running business with a known rate (issue #15): stock full, or
 * supplies out (or arriving, if bought), and a production boost that is ready to start again.
 */
export function productionEvents(
  businesses: BusinessBarsById,
  catalog: readonly Property[],
  productions: readonly Production[],
  owned: OwnedProperties,
  now: number,
  fillsTo: number,
  boosts: BoostsById,
  mansion: { boost: MansionBoost | undefined; data: MansionBoostData },
): NextEvent[] {
  const events: NextEvent[] = []
  for (const production of productions) {
    const property = catalog.find((p) => p.id === production.propertyId)
    if (!property || !isRunning(owned, property.id)) continue
    const rate = rateFor(production, owned, property)
    if (!rate) continue
    const id = property.id
    const bars = settleBars(businesses[id] ?? emptyBars(), now, fillsTo)
    const boost = boosts[id]
    const sped = mansionBoostOn(mansion.boost, mansion.data, id, now)
    const ahead = forecastAt(bars, production, rate, now, {
      boost,
      mansion: sped
        ? { endsAt: mansion.boost!.startedAt + mansion.data.durationMs, speed: mansion.data.speed }
        : undefined,
    })
    const parts = estimatedParts(rate)
    // Both boosts at once: no source gives the speed (BusinessProduction says so).
    const estimated = parts.production || (sped && boostRunning(boost, production.boost, now))
    const source = property.label
    const tab = 'businesses'
    if (ahead.fullInMs !== null) {
      const value = stockValue(bars, production, rate, valueBonus(production, owned, property))
      events.push({
        id: `stock:${id}`,
        source,
        what: 'Stock full',
        action: 'Sell',
        inMs: ahead.fullInMs,
        clock: 'play',
        tone: 'good',
        level: { value: bars.stock, max: 100, kind: 'stock' },
        value: value.far ?? value.nearby,
        estimated: estimated || parts.value || farValueEstimated(production, owned),
        tab,
      })
    } else if (bars.suppliesDueAt !== undefined) {
      events.push({
        id: `delivery:${id}`,
        source,
        what: 'Supplies arrive',
        inMs: Math.max(0, bars.suppliesDueAt - now),
        clock: 'real',
        tone: 'good',
        level: { value: bars.supplies ?? 0, max: 100, kind: 'supplies' },
        estimated: false,
        tab,
      })
    } else {
      events.push({
        id: `supplies:${id}`,
        source,
        what: 'Supplies out',
        action: 'Resupply',
        inMs: ahead.suppliesOutInMs ?? 0,
        clock: 'play',
        tone: 'bad',
        level: { value: bars.supplies ?? 0, max: 100, kind: 'supplies' },
        estimated,
        tab,
      })
    }
    if (
      production.boost &&
      rate.boostedMinutesPerUnit !== undefined &&
      !boostRunning(boost, production.boost, now)
    ) {
      events.push({
        id: `boost:${id}`,
        source,
        what: 'Boost ready',
        action: 'Start boost',
        inMs: Math.max(0, nextBoostAt(boost, production.boost) - now),
        clock: 'real',
        tone: 'good',
        estimated: false,
        tab,
      })
    }
  }
  return events
}

/**
 * Empties the stock of every business that `after` shuts down and `before` did not: the game
 * clears the stock but keeps the supplies (issue #38). Returns `businesses` itself if none.
 */
export function clearShutDownStock(
  businesses: BusinessBarsById,
  before: OwnedProperties,
  after: OwnedProperties,
): BusinessBarsById {
  let next = businesses
  for (const [id, bars] of Object.entries(businesses)) {
    if (bars.stock > 0 && isShutDown(after, id) && !isShutDown(before, id)) {
      next = { ...next, [id]: { ...bars, stock: 0 } }
    }
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
