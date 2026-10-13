// The persisted root state, its versions and migrations (decision 006).

/** Bump when the stored shape changes, and add a migration from the previous version. */
export const CURRENT_VERSION = 1

/** All user state. Trackers add their own sections here as they are built. */
export interface AppState {
  version: typeof CURRENT_VERSION
}

export function defaultState(): AppState {
  return { version: CURRENT_VERSION }
}

export type StoredData = Record<string, unknown> & { version: number }

/** Upgrades data of one version to the next. Pure: returns new data, never mutates its input. */
export type Migration = (data: StoredData) => Record<string, unknown>

/** `MIGRATIONS[n]` upgrades version `n` to `n + 1`. Each one has a test with a stored sample. */
export const MIGRATIONS: Readonly<Record<number, Migration>> = {}

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
  return { version: CURRENT_VERSION }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function invalid(message: string): ParseResult {
  return { ok: false, reason: 'invalid', message }
}
