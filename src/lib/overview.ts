// The Overview tab (issue #15, decision 023): every tracker's next events in one list, and the
// money waiting across them. Pure logic: wall-clock time comes in as an argument (decision 003).
import { BUSINESS_EVENTS } from '../data/business-events'
import { CAR_WASH } from '../data/fronts'
import { NIGHTCLUB_ID, type Goods } from '../data/nightclub'
import type { Production } from '../data/production'
import type { Property } from '../data/properties'
import type { Safe } from '../data/safes'
import type { LUCKY_WHEEL } from '../data/timers'
import { sortEvents, type NextEvent } from './events'
import { emptyFronts, frontsEvents, heatOf, legalJob, ownedFronts, setHeat } from './fronts'
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
import { applyEvent, buySupplies, settleBars } from './resync'
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
  /** Supplies after a bought delivery arrives, in percent, and how long it takes. */
  fillsTo: number
  deliveryMs: number
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

/**
 * The events the Overview shows and alerts on: those of cards the user hid are left out (issue
 * #62). `hidden` holds event `focus` ids, e.g. `car-wash`.
 */
export function visibleEvents(
  events: readonly NextEvent[],
  hidden: readonly string[],
): NextEvent[] {
  return events.filter((e) => !hidden.includes(e.focus))
}

/** The name of a card hidden from the Overview (an event `focus`), for the list to show it again. */
export function hiddenLabel(focus: string, catalog: readonly Property[]): string {
  if (focus === 'lucky-wheel') return 'Lucky Wheel'
  return catalog.find((p) => p.id === focus)?.label ?? focus
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

/**
 * A quick action's result: what to change in the state, what was done, and how to take it back
 * later. The undo puts back only what the action changed, so progress made since stays.
 */
export interface QuickResult {
  change: Partial<AppState>
  undo: (state: AppState) => Partial<AppState>
  done: string
}

/**
 * Marks event `id` done from the Overview at `now` (its `quick`): stock sold, supplies bought,
 * a safe collected, a legal job at the Car Wash, the Lucky Wheel spun, a production boost or the
 * Mansion boost (on `choice`) started. Null if the event has none, or the choice is not one the
 * boost can take.
 */
export function quickAction(
  state: AppState,
  data: TrackerData,
  id: string,
  now: number,
  choice?: string,
): QuickResult | null {
  const [kind, target = ''] = id.split(':')
  const label = (propertyId: string) =>
    data.catalog.find((p) => p.id === propertyId)?.label ?? propertyId
  const { timers } = state
  switch (kind) {
    case 'stock':
    case 'supplies': {
      const before = state.businesses[target]
      if (!data.productions.some((p) => p.propertyId === target)) return null
      const bars = settleBars(before ?? emptyBars(), now, data.fillsTo)
      const after =
        kind === 'stock'
          ? applyEvent(bars, BUSINESS_EVENTS.sold)
          : buySupplies(bars, now, data.deliveryMs)
      return {
        change: { businesses: { ...state.businesses, [target]: after } },
        undo: (s) => {
          const now = s.businesses[target] ?? after
          if (kind === 'supplies') {
            const { suppliesDueAt: _, ...rest } = now
            return { businesses: { ...s.businesses, [target]: rest } }
          }
          // The stock sold comes back on top of what was made since.
          const stock = Math.min(100, bars.stock + now.stock)
          return { businesses: { ...s.businesses, [target]: { ...now, stock } } }
        },
        done: `${label(target)}: ${kind === 'stock' ? 'stock sold' : 'supplies bought'}`,
      }
    }
    case 'goods': {
      const goods = data.goods.find((g) => g.id === target)
      if (!goods) return null
      const before = state.nightclub[target]
      return {
        change: { nightclub: { ...state.nightclub, [target]: 0 } },
        undo: (s) => ({
          nightclub: { ...s.nightclub, [target]: (before ?? 0) + (s.nightclub[target] ?? 0) },
        }),
        done: `${goods.label} sold`,
      }
    }
    case 'safe': {
      const fronts = target === CAR_WASH
      if (!fronts && !data.safes.some((safe) => safe.propertyId === target)) return null
      const before = state.safes[target]
      const current =
        before ??
        (fronts ? emptyFronts() : emptySafe(data.safes.find((x) => x.propertyId === target)!))
      return {
        change: { safes: { ...state.safes, [target]: { ...current, money: 0 } } },
        // The money collected comes back on top of any payout since.
        undo: (s) => {
          const now = s.safes[target] ?? current
          return { safes: { ...s.safes, [target]: { ...now, money: current.money + now.money } } }
        },
        done: `${fronts ? 'Money Fronts' : label(target)} safe collected`,
      }
    }
    case 'heat': {
      const before = state.safes[target] ?? emptyFronts()
      return {
        change: { safes: { ...state.safes, [target]: legalJob(before, target) } },
        undo: (s) => ({
          safes: {
            ...s.safes,
            [target]: setHeat(s.safes[target] ?? before, target, heatOf(before, target)),
          },
        }),
        done: `Legal job at ${label(target)}`,
      }
    }
    case 'lucky-wheel': {
      const before = timers.luckyWheelSpunAt
      return {
        change: { timers: { ...timers, luckyWheelSpunAt: now } },
        undo: (s) => ({ timers: { ...s.timers, luckyWheelSpunAt: before } }),
        done: 'Lucky Wheel spun',
      }
    }
    case 'mansion-boost': {
      const choices = boostableBusinesses(
        data.catalog,
        state.properties,
        data.mansion,
        timers.mansionBoost,
      )
      if (!choice || !choices.some((p) => p.id === choice)) return null
      const before = timers.mansionBoost
      return {
        change: { timers: { ...timers, mansionBoost: { propertyId: choice, startedAt: now } } },
        undo: (s) => ({ timers: { ...s.timers, mansionBoost: before } }),
        done: `Mansion boost started on ${label(choice)}`,
      }
    }
    case 'boost': {
      const boost = data.productions.find((p) => p.propertyId === target)?.boost
      if (!boost) return null
      const before = state.boosts[target]
      return {
        change: { boosts: { ...state.boosts, [target]: startBoost(boost, now) } },
        undo: (s) => ({ boosts: restore(s.boosts, target, before) }),
        done: `${label(target)} boost started`,
      }
    }
  }
  return null
}

/** `record` with entry `id` put back to `value`, or removed if there was none. */
function restore<T>(
  record: Record<string, T>,
  id: string,
  value: T | undefined,
): Record<string, T> {
  const { [id]: _, ...rest } = record
  return value === undefined ? rest : { ...rest, [id]: value }
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
