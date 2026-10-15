// Money Fronts (issue #11, decision 018): one safe in the Car Wash paid once per in-game day of
// play time by the fronts and every other business owned, and a heat bar per front that rises
// each day and with missions. Pure logic: play time comes in as an argument (decision 003).
import {
  CAR_WASH,
  DOUBLE_AFTER,
  FRONTS,
  FRONTS_CAPACITY,
  HEAT_PER_MISSION,
  HEAT_RISE_ALONE,
  MISSIONS_UPGRADE,
  SHARES,
  WAREHOUSE_SHARES,
  WAREHOUSE_SIZE_UPGRADE,
  type Front,
} from '../data/fronts'
import type { Property } from '../data/properties'
import type { NextEvent } from './events'
import { isOwned, isRunning, setUpgrade, upgradeValue, type OwnedProperties } from './properties'
import { DAY_MS, nextPayoutInMs, type SafeState } from './safes'

/** The heat a front is stopped at: no pay from it, and none at all from the Car Wash. */
export const MAX_HEAT = 100

/** A safe nobody has entered yet: empty, a whole day to the first payout, no heat. */
export function emptyFronts(): SafeState {
  return { money: 0, sinceMs: 0, heat: {} }
}

export function heatOf(state: SafeState, frontId: string): number {
  return state.heat?.[frontId] ?? 0
}

/** The fronts the user owns; none without the Car Wash, which the others are bought through. */
export function ownedFronts(owned: OwnedProperties): readonly Front[] {
  if (!isOwned(owned, CAR_WASH)) return []
  return FRONTS.filter((front) => isOwned(owned, front.propertyId))
}

function missionsDone(owned: OwnedProperties, catalog: readonly Property[], id: string): number {
  const upgrade = catalog.find((p) => p.id === id)?.upgrades.find((u) => u.id === MISSIONS_UPGRADE)
  return upgrade ? Number(upgradeValue(owned, id, upgrade)) : 0
}

/** What a front pays per day while its heat is below 100%. */
export function frontPay(front: Front, owned: OwnedProperties, catalog: readonly Property[]) {
  return missionsDone(owned, catalog, front.propertyId) >= DOUBLE_AFTER
    ? front.doubled
    : front.amount
}

/**
 * What the other businesses owned add per day; the warehouse counts by its largest size. A
 * shut-down business adds nothing (issue #38).
 */
export function sharesPay(owned: OwnedProperties, catalog: readonly Property[]): number {
  let total = 0
  for (const share of SHARES) if (isRunning(owned, share.propertyId)) total += share.amount
  const warehouse = catalog.find((p) => p.id === 'special-cargo')
  const size = warehouse?.upgrades.find((u) => u.id === WAREHOUSE_SIZE_UPGRADE)
  if (warehouse && size && isOwned(owned, warehouse.id)) {
    total += WAREHOUSE_SHARES[String(upgradeValue(owned, warehouse.id, size))] ?? 0
  }
  return total
}

/** The day's payout in two parts: the fronts below 100% heat, and the other businesses. */
export function payoutParts(
  state: SafeState,
  owned: OwnedProperties,
  catalog: readonly Property[],
): { fronts: number; others: number } {
  const fronts = ownedFronts(owned)
  if (fronts.length === 0 || heatOf(state, CAR_WASH) >= MAX_HEAT) return { fronts: 0, others: 0 }
  let paid = 0
  for (const front of fronts) {
    if (heatOf(state, front.propertyId) < MAX_HEAT) paid += frontPay(front, owned, catalog)
  }
  return { fronts: paid, others: sharesPay(owned, catalog) }
}

export function dailyPayout(
  state: SafeState,
  owned: OwnedProperties,
  catalog: readonly Property[],
): number {
  const { fronts, others } = payoutParts(state, owned, catalog)
  return fronts + others
}

/** Heat each front below 100% gains per day: 10%, one less per other front below 100%. */
export function heatRise(state: SafeState, owned: OwnedProperties): number {
  const cool = ownedFronts(owned).filter((f) => heatOf(state, f.propertyId) < MAX_HEAT).length
  return cool === 0 ? 0 : HEAT_RISE_ALONE - (cool - 1)
}

/** The heat of every front below 100% after an in-game day. */
function riseHeat(state: SafeState, owned: OwnedProperties): SafeState {
  const rise = heatRise(state, owned)
  const heat = { ...state.heat }
  for (const front of ownedFronts(owned)) {
    const now = heatOf(state, front.propertyId)
    if (now < MAX_HEAT) heat[front.propertyId] = Math.min(MAX_HEAT, now + rise)
  }
  return { ...state, heat }
}

/** The end of an in-game day: the safe is paid up to its capacity, then heat rises. */
function endOfDay(
  state: SafeState,
  owned: OwnedProperties,
  catalog: readonly Property[],
): SafeState {
  const paid = dailyPayout(state, owned, catalog)
  const money =
    state.money < FRONTS_CAPACITY ? Math.min(FRONTS_CAPACITY, state.money + paid) : state.money
  return riseHeat({ ...state, money }, owned)
}

/**
 * The safe after `playMs` of play time. Money already over the capacity (set by hand) stays
 * until changed.
 */
export function advanceFronts(
  state: SafeState,
  owned: OwnedProperties,
  catalog: readonly Property[],
  playMs: number,
): SafeState {
  if (playMs <= 0 || ownedFronts(owned).length === 0) return state
  let next = { ...state, sinceMs: state.sinceMs + playMs }
  while (next.sinceMs >= DAY_MS) {
    next = endOfDay({ ...next, sinceMs: next.sinceMs - DAY_MS }, owned, catalog)
  }
  return next
}

/** Right after the game says a payout came in; the same half-day rule as other safes. */
export function syncFronts(
  state: SafeState,
  owned: OwnedProperties,
  catalog: readonly Property[],
): SafeState {
  if (state.sinceMs < DAY_MS / 2) return { ...state, sinceMs: 0 }
  return advanceFronts(state, owned, catalog, nextPayoutInMs(state))
}

/**
 * Play time until the safe is full if heat stays where it is now, like popularity on the other
 * safes. 0 when full; null if nothing is paid.
 */
export function fullInMs(
  state: SafeState,
  owned: OwnedProperties,
  catalog: readonly Property[],
): number | null {
  if (state.money >= FRONTS_CAPACITY) return 0
  const paid = dailyPayout(state, owned, catalog)
  if (paid <= 0) return null
  return nextPayoutInMs(state) + (Math.ceil((FRONTS_CAPACITY - state.money) / paid) - 1) * DAY_MS
}

/**
 * Play time until a front reaches 100% heat if no missions or legal jobs are done. 0 when it is
 * there; null if the front is not owned.
 */
export function maxHeatInMs(state: SafeState, owned: OwnedProperties, frontId: string) {
  if (!ownedFronts(owned).some((f) => f.propertyId === frontId)) return null
  let day = state
  let ms = nextPayoutInMs(state)
  if (heatOf(day, frontId) >= MAX_HEAT) return 0
  // At 8% or more a day, 100% is at most 13 days away.
  while (heatOf((day = riseHeat(day, owned)), frontId) < MAX_HEAT) ms += DAY_MS
  return ms
}

/**
 * A laundering mission (counts for this front) or a Mr. Faber job (counts for every front)
 * launched from `frontId`: its heat rises by 10%. Returns the new safe and the new mission counts.
 */
export function mission(
  state: SafeState,
  owned: OwnedProperties,
  catalog: readonly Property[],
  frontId: string,
  kind: 'laundering' | 'faber',
): { state: SafeState; owned: OwnedProperties } {
  const heat = Math.min(MAX_HEAT, heatOf(state, frontId) + HEAT_PER_MISSION)
  let counts = owned
  const counted = kind === 'faber' ? ownedFronts(owned).map((f) => f.propertyId) : [frontId]
  for (const id of counted) {
    counts = setUpgrade(counts, id, MISSIONS_UPGRADE, missionsDone(owned, catalog, id) + 1)
  }
  return { state: setHeat(state, frontId, heat), owned: counts }
}

/** Legal work at a front (washing cars, a helitour, a weed delivery) clears its heat. */
export function legalJob(state: SafeState, frontId: string): SafeState {
  return setHeat(state, frontId, 0)
}

export function setHeat(state: SafeState, frontId: string, heat: number): SafeState {
  return { ...state, heat: { ...state.heat, [frontId]: heat } }
}

/**
 * When the Money Fronts safe is full, and when the Car Wash reaches 100% heat and stops paying
 * into it (issue #15), as the safe card shows them.
 */
export function frontsEvents(
  state: SafeState,
  owned: OwnedProperties,
  catalog: readonly Property[],
): NextEvent[] {
  if (ownedFronts(owned).length === 0) return []
  const events: NextEvent[] = []
  const full = fullInMs(state, owned, catalog)
  if (full !== null) {
    events.push({
      id: `safe:${CAR_WASH}`,
      source: 'Money Fronts',
      what: 'Safe full',
      action: 'Collect',
      inMs: full,
      clock: 'play',
      tone: 'good',
      level: { value: state.money, max: FRONTS_CAPACITY, kind: 'stock' },
      value: state.money,
      estimated: false,
      tab: 'safes',
      focus: CAR_WASH,
    })
  }
  const heat = maxHeatInMs(state, owned, CAR_WASH)
  if (heat !== null) {
    events.push({
      id: `heat:${CAR_WASH}`,
      source: FRONTS.find((f) => f.propertyId === CAR_WASH)!.label,
      what: 'Max heat',
      action: 'Legal job',
      inMs: heat,
      clock: 'play',
      tone: 'bad',
      level: { value: heatOf(state, CAR_WASH), max: MAX_HEAT, kind: 'heat' },
      estimated: true,
      tab: 'safes',
      focus: CAR_WASH,
    })
  }
  return events
}
