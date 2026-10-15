// Real-time timers (issues #13, #14): the Lucky Wheel cooldown and the Mansion production boost.
// Pure logic: wall-clock time comes in as an argument (decision 003).
import type { LUCKY_WHEEL, MANSION_BOOST } from '../data/timers'
import type { NextEvent } from './events'
import type { Property } from '../data/properties'
import { isOwned, isRunning, type OwnedProperties } from './properties'

export type MansionBoostData = typeof MANSION_BOOST

/** The last Mansion boost: which business, and when it started (wall clock). */
export interface MansionBoost {
  propertyId: string
  startedAt: number
}

/** Saved real-time timers; a timer is left out until first used. */
export interface Timers {
  /** When the Lucky Wheel was last spun (wall clock). */
  luckyWheelSpunAt?: number
  /** The last Mansion boost, kept after it ends for the cooldown and the back-to-back rule. */
  mansionBoost?: MansionBoost
}

/** When a cooldown that started at `startedAt` is over; long ago if it never started. */
export function readyAt(startedAt: number | undefined, cooldownMs: number): number {
  return startedAt === undefined ? -Infinity : startedAt + cooldownMs
}

/**
 * The start time that leaves `remainingMs` of a `lengthMs` timer at `now`, for correcting a
 * countdown by hand (decision 010).
 */
export function startForRemaining(remainingMs: number, lengthMs: number, now: number): number {
  return now + Math.min(Math.max(remainingMs, 0), lengthMs) - lengthMs
}

/** Whether the boost speeds up business `propertyId` at wall-clock time `at`. */
export function mansionBoostOn(
  boost: MansionBoost | undefined,
  data: MansionBoostData,
  propertyId: string,
  at: number,
): boolean {
  return (
    !!boost &&
    boost.propertyId === propertyId &&
    at >= boost.startedAt &&
    at < boost.startedAt + data.durationMs
  )
}

/**
 * The businesses the next boost can go to: owned, running, and not the one boosted last time
 * (the game does not boost the same business back-to-back).
 */
export function boostableBusinesses(
  catalog: readonly Property[],
  owned: OwnedProperties,
  data: MansionBoostData,
  last: MansionBoost | undefined,
): Property[] {
  return catalog.filter(
    (p) =>
      (data.propertyIds as readonly string[]).includes(p.id) &&
      isOwned(owned, p.id) &&
      isRunning(owned, p.id) &&
      p.id !== last?.propertyId,
  )
}

/**
 * When the Lucky Wheel can be spun, and when the Mansion boost can be started again if a Mansion
 * and a business it can boost are owned (issue #15). Both on real time.
 */
export function timerEvents(
  timers: Timers,
  catalog: readonly Property[],
  owned: OwnedProperties,
  now: number,
  wheel: typeof LUCKY_WHEEL,
  mansion: MansionBoostData,
): NextEvent[] {
  const events: NextEvent[] = [
    {
      id: 'lucky-wheel',
      source: 'Lucky Wheel',
      what: 'Spin ready',
      action: 'Spin',
      inMs: Math.max(0, readyAt(timers.luckyWheelSpunAt, wheel.cooldownMs) - now),
      clock: 'real',
      tone: 'good',
      estimated: false,
      tab: 'timers',
      focus: 'lucky-wheel',
      quick: { label: 'Spun' },
    },
  ]
  const last = timers.mansionBoost
  const choices = boostableBusinesses(catalog, owned, mansion, last)
  if (isOwned(owned, mansion.propertyId) && choices.length > 0) {
    events.push({
      id: 'mansion-boost',
      source: catalog.find((p) => p.id === mansion.propertyId)?.label ?? 'Mansion',
      what: 'Boost ready',
      action: 'Start boost',
      inMs: Math.max(0, readyAt(last?.startedAt, mansion.cooldownMs) - now),
      clock: 'real',
      tone: 'good',
      estimated: false,
      tab: 'timers',
      focus: 'mansion',
      quick: { label: 'Started', choices: choices.map((p) => ({ id: p.id, label: p.label })) },
    })
  }
  return events
}

/** Checks saved timers. Returns an error message if the shape is wrong. */
export function parseTimers(data: unknown): Timers | string {
  if (!isRecord(data)) return 'The timers section is missing.'
  const result: Timers = {}
  if (data.luckyWheelSpunAt !== undefined) {
    if (!isTime(data.luckyWheelSpunAt)) return 'The saved Lucky Wheel spin is not readable.'
    result.luckyWheelSpunAt = data.luckyWheelSpunAt
  }
  if (data.mansionBoost !== undefined) {
    const boost = data.mansionBoost
    if (!isRecord(boost) || typeof boost.propertyId !== 'string' || !isTime(boost.startedAt)) {
      return 'The saved Mansion boost is not readable.'
    }
    result.mansionBoost = { propertyId: boost.propertyId, startedAt: boost.startedAt }
  }
  return result
}

function isTime(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
