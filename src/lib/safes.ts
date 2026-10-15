// Property safes: money paid in once per in-game day of play time, nightclub popularity falling
// with it (issue #8, decision 016). Pure logic: play time comes in as an argument (decision 003).
import type { Property } from '../data/properties'
import { PAYOUT_MINUTES, type Safe } from '../data/safes'
import type { NextEvent } from './events'
import { isOwned, upgradeValue, type OwnedProperties, type UpgradeValue } from './properties'

/** Play time of one in-game day, the payout interval. */
export const DAY_MS = PAYOUT_MINUTES * 60_000

export interface SafeState {
  /** Dollars in the safe. */
  money: number
  /** Play time since the last payout. */
  sinceMs: number
  /** Popularity in percent, for a safe whose payout depends on it. */
  popularity?: number
  /** Money Fronts safe only: heat in percent by front property id (lib/fronts.ts). */
  heat?: Record<string, number>
}

/** Saved safes by property id. */
export type SafesById = Record<string, SafeState>

/** A safe nobody has entered yet: empty, a whole day to the first payout, popularity 0. */
export function emptySafe(safe: Safe): SafeState {
  return safe.popularity ? { money: 0, sinceMs: 0, popularity: 0 } : { money: 0, sinceMs: 0 }
}

/** The upgrade values a safe reads, with their defaults (lib/properties.ts). */
function upgrade(owned: OwnedProperties, property: Property, id: string): UpgradeValue {
  const found = property.upgrades.find((u) => u.id === id)
  return found ? upgradeValue(owned, property.id, found) : false
}

export function capacity(safe: Safe, owned: OwnedProperties, property: Property): number {
  return safe.bigger && upgrade(owned, property, safe.bigger.upgrade) === true
    ? safe.bigger.capacity
    : safe.capacity
}

/** Dollars paid in at the end of an in-game day, at this popularity. */
export function dailyPayout(
  safe: Safe,
  owned: OwnedProperties,
  property: Property,
  popularity = 0,
): number {
  const payout = safe.payout
  switch (payout.kind) {
    case 'popularity':
      return payout.rows.find((row) => popularity >= row.from)?.amount ?? 0
    case 'steps': {
      const steps = Math.floor(Number(upgrade(owned, property, payout.upgrade)) / payout.stepSize)
      return Math.min(payout.max, payout.base + steps * payout.perStep)
    }
    case 'slots': {
      const filled = Math.min(payout.slots, Number(upgrade(owned, property, payout.upgrade)))
      return Math.round((payout.full * filled) / payout.slots)
    }
    case 'fixed':
      return payout.withUpgrade && upgrade(owned, property, payout.withUpgrade.upgrade) === true
        ? payout.withUpgrade.amount
        : payout.amount
    case 'range':
      return Math.round((payout.min + payout.max) / 2)
  }
}

/** The most this safe pays per day with its upgrades, popularity aside. */
export function bestPayout(safe: Safe, owned: OwnedProperties, property: Property): number {
  return dailyPayout(safe, owned, property, 100)
}

/** Popularity lost per in-game day, or 0 for a safe without popularity. */
export function popularityLoss(safe: Safe, owned: OwnedProperties, property: Property): number {
  const popularity = safe.popularity
  if (!popularity) return 0
  return upgrade(owned, property, popularity.slower.upgrade) === true
    ? popularity.slower.lossPerDay
    : popularity.lossPerDay
}

/**
 * Which shown numbers rest on estimates (decision 013): the payout (and so everything it adds
 * up to), and popularity, which falls at an estimated rate.
 */
export function estimatedParts(
  safe: Safe,
  owned: OwnedProperties,
  property: Property,
): { payout: boolean; popularity: boolean } {
  const payout = safe.payout
  return {
    payout:
      payout.kind === 'steps' ||
      payout.kind === 'fixed' ||
      payout.kind === 'range' ||
      (payout.kind === 'slots' && Number(upgrade(owned, property, payout.upgrade)) < payout.slots),
    popularity: safe.popularity !== undefined,
  }
}

/**
 * The safe after `playMs` of play time: at the end of each in-game day it is paid at the
 * popularity of that moment, up to its capacity, and then popularity drops. Money already over
 * the capacity (set by hand) stays until changed.
 */
export function advanceSafe(
  state: SafeState,
  safe: Safe,
  owned: OwnedProperties,
  property: Property,
  playMs: number,
): SafeState {
  if (playMs <= 0) return state
  const cap = capacity(safe, owned, property)
  const loss = popularityLoss(safe, owned, property)
  let { money, popularity } = state
  let sinceMs = state.sinceMs + playMs
  while (sinceMs >= DAY_MS) {
    sinceMs -= DAY_MS
    if (money < cap) money = Math.min(cap, money + dailyPayout(safe, owned, property, popularity))
    if (popularity !== undefined) popularity = Math.max(0, popularity - loss)
  }
  return popularity === undefined ? { money, sinceMs } : { money, sinceMs, popularity }
}

/**
 * The safe right after the game says a payout came in: the day restarts now. If LSOS has not
 * counted that payout yet (its next one was due within half a day), it is paid now, as at the
 * end of a day; if LSOS counted it less than half a day ago, only the timer moves.
 */
export function syncPayout(
  state: SafeState,
  safe: Safe,
  owned: OwnedProperties,
  property: Property,
): SafeState {
  if (state.sinceMs < DAY_MS / 2) return { ...state, sinceMs: 0 }
  return advanceSafe(state, safe, owned, property, nextPayoutInMs(state))
}

/** Play time until the next payout. */
export function nextPayoutInMs(state: SafeState): number {
  return Math.max(0, DAY_MS - state.sinceMs)
}

/**
 * Play time until the safe is full if popularity stays where it is now, so the time grows as
 * popularity falls. 0 when full; null if nothing is paid.
 */
export function fullInMs(
  state: SafeState,
  safe: Safe,
  owned: OwnedProperties,
  property: Property,
): number | null {
  const cap = capacity(safe, owned, property)
  if (state.money >= cap) return 0
  const paid = dailyPayout(safe, owned, property, state.popularity)
  if (paid <= 0) return null
  const payouts = Math.ceil((cap - state.money) / paid)
  return nextPayoutInMs(state) + (payouts - 1) * DAY_MS
}

/**
 * Counts a stretch of play time for every owned property with a safe. Returns `safes` itself if
 * nothing changed, so an idle tick does not trigger a save.
 */
export function advanceSafes(
  safes: SafesById,
  data: readonly Safe[],
  catalog: readonly Property[],
  owned: OwnedProperties,
  playMs: number,
): SafesById {
  let next = safes
  for (const safe of data) {
    const property = catalog.find((p) => p.id === safe.propertyId)
    if (!property || !isOwned(owned, property.id)) continue
    const state = safes[safe.propertyId] ?? emptySafe(safe)
    const after = advanceSafe(state, safe, owned, property, playMs)
    if (after !== state) next = { ...next, [safe.propertyId]: after }
  }
  return next
}

/** When each owned safe is full (issue #15), if it is paid anything. */
export function safeEvents(
  safes: SafesById,
  data: readonly Safe[],
  catalog: readonly Property[],
  owned: OwnedProperties,
): NextEvent[] {
  return data.flatMap((safe) => {
    const property = catalog.find((p) => p.id === safe.propertyId)
    if (!property || !isOwned(owned, property.id)) return []
    const state = safes[safe.propertyId] ?? emptySafe(safe)
    const full = fullInMs(state, safe, owned, property)
    if (full === null) return []
    return [
      {
        id: `safe:${property.id}`,
        source: property.label,
        what: 'Safe full',
        action: 'Collect',
        inMs: full,
        clock: 'play',
        tone: 'good',
        level: { value: state.money, max: capacity(safe, owned, property), kind: 'stock' },
        value: state.money,
        estimated: estimatedParts(safe, owned, property).payout,
        tab: 'safes',
        focus: property.id,
        quick: { label: 'Collected' },
      },
    ]
  })
}

/**
 * Checks saved safes. Entries are kept for any id, like owned properties (decision 011).
 * Returns an error message if the shape is wrong.
 */
export function parseSafes(data: unknown): SafesById | string {
  if (!isRecord(data)) return 'The safes section is missing.'
  const result: SafesById = {}
  for (const [id, entry] of Object.entries(data)) {
    const bad = `The saved safe of "${id}" is not readable.`
    if (!isRecord(entry) || !isAmount(entry.money) || !isAmount(entry.sinceMs)) return bad
    const state: SafeState = { money: entry.money, sinceMs: entry.sinceMs }
    if (entry.popularity !== undefined) {
      const { popularity } = entry
      if (!isPercent(popularity)) return bad
      state.popularity = popularity
    }
    if (entry.heat !== undefined) {
      if (!isRecord(entry.heat)) return bad
      const heat: Record<string, number> = {}
      for (const [front, value] of Object.entries(entry.heat)) {
        if (!isPercent(value)) return bad
        heat[front] = value
      }
      state.heat = heat
    }
    result[id] = state
  }
  return result
}

function isPercent(value: unknown): value is number {
  return typeof value === 'number' && value >= 0 && value <= 100
}

function isAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
