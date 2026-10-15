// The Overview tab (issue #15, decision 023): every tracker's next events in one list, and the
// money waiting across them. Pure logic: wall-clock time comes in as an argument (decision 003).
import { CAR_WASH } from '../data/fronts'
import { NIGHTCLUB_ID, type Goods } from '../data/nightclub'
import type { Production } from '../data/production'
import type { Property } from '../data/properties'
import type { Safe } from '../data/safes'
import type { LUCKY_WHEEL } from '../data/timers'
import { sortEvents, type NextEvent } from './events'
import { emptyFronts, frontsEvents, ownedFronts } from './fronts'
import { goodsEvents, goodsValue } from './nightclub'
import {
  emptyBars,
  estimatedParts,
  farValueEstimated,
  matchingRate,
  productionEvents,
  startBoost,
  stockValue,
  valueBonus,
} from './production'
import { isOwned } from './properties'
import { settleBars } from './resync'
import { bestPayout, dailyPayout, emptySafe, safeEvents } from './safes'
import type { AppState } from './state'
import { boostableBusinesses, timerEvents, type MansionBoostData } from './timers'

/** The game data the trackers run on, passed in so tests can use their own. */
export interface TrackerData {
  catalog: readonly Property[]
  productions: readonly Production[]
  goods: readonly Goods[]
  safes: readonly Safe[]
  wheel: typeof LUCKY_WHEEL
  mansion: MansionBoostData
  /** Supplies after a bought delivery arrives, in percent. */
  fillsTo: number
}

/** Every tracker's next events at `now`, due ones first (`sortEvents`). */
export function allEvents(state: AppState, data: TrackerData, now: number): NextEvent[] {
  const owned = state.properties
  return sortEvents([
    ...productionEvents(
      state.businesses,
      data.catalog,
      data.productions,
      owned,
      now,
      data.fillsTo,
      state.boosts,
      { boost: state.timers.mansionBoost, data: data.mansion },
    ),
    ...goodsEvents(state.nightclub, data.goods, data.catalog, owned),
    ...safeEvents(state.safes, data.safes, data.catalog, owned),
    ...frontsEvents(state.safes[CAR_WASH] ?? emptyFronts(), owned, data.catalog),
    ...timerEvents(state.timers, data.catalog, owned, now, data.wheel, data.mansion),
  ])
}

/** Money waiting to be collected or sold, by where it is. */
export interface Holdings {
  /** Business stock at its sale value: far where a far sale pays more, as the cards show it. */
  stock: number
  /** Nightclub warehouse goods, whole crates. */
  goods: number
  /** Money in the safes, the Money Fronts safe included. */
  safes: number
  /** Whether the stock value rests on an estimate (decision 013). */
  estimated: boolean
}

export function holdings(state: AppState, data: TrackerData, now: number): Holdings {
  const owned = state.properties
  let stock = 0
  let estimated = false
  for (const production of data.productions) {
    const property = data.catalog.find((p) => p.id === production.propertyId)
    if (!property || !isOwned(owned, property.id)) continue
    const rate = matchingRate(production, owned, property)
    if (!rate) continue
    const bars = settleBars(state.businesses[property.id] ?? emptyBars(), now, data.fillsTo)
    const value = stockValue(bars, production, rate, valueBonus(production, owned, property))
    if (value.nearby <= 0) continue
    stock += value.far ?? value.nearby
    const parts = estimatedParts(rate)
    if (parts.value || parts.production || farValueEstimated(production, owned)) estimated = true
  }
  const goods = isOwned(owned, NIGHTCLUB_ID)
    ? data.goods.reduce((sum, g) => sum + goodsValue(g, state.nightclub[g.id] ?? 0), 0)
    : 0
  let safes = data.safes
    .filter((safe) => isOwned(owned, safe.propertyId))
    .reduce((sum, safe) => sum + (state.safes[safe.propertyId]?.money ?? 0), 0)
  if (ownedFronts(owned).length > 0) safes += state.safes[CAR_WASH]?.money ?? 0
  return { stock, goods, safes, estimated }
}

/** A quick action's result: what to change in the state, what undoes it, and what was done. */
export interface QuickResult {
  change: Partial<AppState>
  undo: Partial<AppState>
  done: string
}

/**
 * Marks event `id` done from the Overview at `now` (its `quick`): the Lucky Wheel spun, a
 * production boost or the Mansion boost (on `choice`) started. Null if the event has none, or
 * the choice is not one the boost can take.
 */
export function quickAction(
  state: AppState,
  data: TrackerData,
  id: string,
  now: number,
  choice?: string,
): QuickResult | null {
  const { timers, boosts } = state
  const label = (propertyId: string) =>
    data.catalog.find((p) => p.id === propertyId)?.label ?? propertyId
  if (id === 'lucky-wheel') {
    return {
      change: { timers: { ...timers, luckyWheelSpunAt: now } },
      undo: { timers },
      done: 'Lucky Wheel spun',
    }
  }
  if (id === 'mansion-boost') {
    const choices = boostableBusinesses(
      data.catalog,
      state.properties,
      data.mansion,
      timers.mansionBoost,
    )
    if (!choice || !choices.some((p) => p.id === choice)) return null
    return {
      change: { timers: { ...timers, mansionBoost: { propertyId: choice, startedAt: now } } },
      undo: { timers },
      done: `Mansion boost started on ${label(choice)}`,
    }
  }
  const boosted = id.startsWith('boost:') ? id.slice('boost:'.length) : undefined
  const boost = data.productions.find((p) => p.propertyId === boosted)?.boost
  if (!boosted || !boost) return null
  return {
    change: { boosts: { ...boosts, [boosted]: startBoost(boost, now) } },
    undo: { boosts },
    done: `${label(boosted)} boost started`,
  }
}

/** Nightclub popularity, if a nightclub is owned: it sets the safe's payout (decision 016). */
export interface Popularity {
  /** Percent. */
  value: number
  /** The payout at this popularity, and the most it can be. */
  payout: number
  best: number
}

export function clubPopularity(state: AppState, data: TrackerData): Popularity | null {
  for (const safe of data.safes) {
    const property = data.catalog.find((p) => p.id === safe.propertyId)
    if (!safe.popularity || !property || !isOwned(state.properties, property.id)) continue
    const saved = state.safes[safe.propertyId] ?? emptySafe(safe)
    const value = saved.popularity ?? 0
    return {
      value,
      payout: dailyPayout(safe, state.properties, property, value),
      best: bestPayout(safe, state.properties, property),
    }
  }
  return null
}
