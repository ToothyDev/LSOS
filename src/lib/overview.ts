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
  stockValue,
  valueBonus,
} from './production'
import { isOwned } from './properties'
import { settleBars } from './resync'
import { safeEvents } from './safes'
import type { AppState } from './state'
import { timerEvents, type MansionBoostData } from './timers'

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
