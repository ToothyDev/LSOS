// The persisted root state, its versions and migrations (decision 006).
import { defaultClockSettings, type ClockSettings } from './clock'
import { parseGoodsStock, type GoodsStock } from './nightclub'
import { parseOrder } from './order'
import { parseBusinessBars, type BusinessBarsById } from './production'
import { parseOwnedProperties, type OwnedProperties } from './properties'
import { parseSafes, type SafesById } from './safes'

/** Bump when the stored shape changes, and add a migration from the previous version. */
export const CURRENT_VERSION = 7

/** All user state. Trackers add their own sections here as they are built. */
export interface AppState {
  version: typeof CURRENT_VERSION
  /** Clock settings (decision 008). Play time itself lasts one session and is not saved. */
  clock: ClockSettings
  /** Owned properties and their upgrades (decision 011). */
  properties: OwnedProperties
  /** Stock and supplies of each business, as of the last play time counted (issue #6). */
  businesses: BusinessBarsById
  /** Property ids in the order the user dragged the business cards into (issue #30). */
  businessOrder: string[]
  /** Nightclub warehouse crates by goods id, as of the last play time counted (issue #7). */
  nightclub: GoodsStock
  /** Money in each safe and nightclub popularity, as of the last play time counted (issue #8). */
  safes: SafesById
}

export function defaultState(): AppState {
  return {
    version: CURRENT_VERSION,
    clock: defaultClockSettings(),
    properties: {},
    businesses: {},
    businessOrder: [],
    nightclub: {},
    safes: {},
  }
}

export type StoredData = Record<string, unknown> & { version: number }

/** Upgrades data of one version to the next. Pure: returns new data, never mutates its input. */
export type Migration = (data: StoredData) => Record<string, unknown>

/** `MIGRATIONS[n]` upgrades version `n` to `n + 1`. Each one has a test with a stored sample. */
export const MIGRATIONS: Readonly<Record<number, Migration>> = {
  // Version 2 adds the clock (issue #2).
  1: (data) => ({ ...data, clock: defaultClockSettings() }),
  // Version 3 adds owned properties and upgrades (issue #5); nothing is owned yet.
  2: (data) => ({ ...data, properties: {} }),
  // Version 4 adds business stock and supplies (issue #6); nothing is tracked yet.
  3: (data) => ({ ...data, businesses: {} }),
  // Version 5 adds the order of the business cards (issue #30); catalog order until moved.
  4: (data) => ({ ...data, businessOrder: [] }),
  // Version 6 adds the nightclub warehouse stock (issue #7); empty until set or produced.
  5: (data) => ({ ...data, nightclub: {} }),
  // Version 7 adds property safes (issue #8); empty until set or paid.
  6: (data) => ({ ...data, safes: {} }),
}

export type ParseResult =
  | { ok: true; state: AppState; fromVersion: number }
  | { ok: false; reason: 'newer'; version: number; message: string }
  | { ok: false; reason: 'invalid'; message: string }

/** Parses saved or imported JSON text, migrating older versions to the current one. */
export function parseState(text: string): ParseResult {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return invalid('This is not valid JSON.')
  }
  if (!isRecord(data)) return invalid('This is not LSOS data: expected a JSON object.')
  const { version } = data
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return invalid('This is not LSOS data: it has no valid version number.')
  }
  if (version > CURRENT_VERSION) {
    return {
      ok: false,
      reason: 'newer',
      version,
      message: `This data is from a newer LSOS (data version ${version}; this LSOS knows up to ${CURRENT_VERSION}).`,
    }
  }

  const migrated = migrate({ ...data, version }, CURRENT_VERSION)
  if (typeof migrated === 'string') return invalid(migrated)
  const state = toState(migrated)
  if (typeof state === 'string') return invalid(state)
  return { ok: true, state, fromVersion: version }
}

/**
 * Runs migrations one version at a time until `data` reaches `target`.
 * Returns an error message if a step is missing.
 */
export function migrate(
  data: StoredData,
  target: number,
  migrations: Readonly<Record<number, Migration>> = MIGRATIONS,
): StoredData | string {
  let current = data
  for (let v = data.version; v < target; v++) {
    const migration = migrations[v]
    if (!migration) return `No migration from data version ${v}.`
    current = { ...migration(current), version: v + 1 }
  }
  return current
}

export function serializeState(state: AppState): string {
  return JSON.stringify(state)
}

/** Name for an exported backup, e.g. `lsos-backup-2026-10-13.json` (local date). */
export function exportFileName(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  return `lsos-backup-${date}.json`
}

/** Checks current-version data and keeps only known fields. Returns an error message if bad. */
function toState(data: StoredData): AppState | string {
  if (data.version !== CURRENT_VERSION) return `Unexpected data version ${data.version}.`
  const clock = toClock(data.clock)
  if (typeof clock === 'string') return clock
  const properties = parseOwnedProperties(data.properties)
  if (typeof properties === 'string') return properties
  const businesses = parseBusinessBars(data.businesses)
  if (typeof businesses === 'string') return businesses
  const businessOrder = parseOrder(data.businessOrder)
  if (typeof businessOrder === 'string') return businessOrder
  const nightclub = parseGoodsStock(data.nightclub)
  if (typeof nightclub === 'string') return nightclub
  const safes = parseSafes(data.safes)
  if (typeof safes === 'string') return safes
  return {
    version: CURRENT_VERSION,
    clock,
    properties,
    businesses,
    businessOrder,
    nightclub,
    safes,
  }
}

function toClock(data: unknown): ClockSettings | string {
  if (!isRecord(data)) return 'The clock section is missing.'
  const { trackOnOpen } = data
  if (typeof trackOnOpen !== 'boolean') return 'The saved tracking setting is not true or false.'
  return { trackOnOpen }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function invalid(message: string): ParseResult {
  return { ok: false, reason: 'invalid', message }
}
