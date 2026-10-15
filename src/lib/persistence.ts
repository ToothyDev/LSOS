// Saving and loading the root state in browser storage (decision 006).
import { defaultState, parseState, serializeState, type AppState } from './state'

export const STORAGE_KEY = 'lsos:state'
export const SAVE_DELAY_MS = 500

/** The part of `localStorage` used here, so tests can pass a plain object. */
export interface KeyValueStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/** Runs `fn` after `ms` and returns a function that cancels it (`setTimeout` in the app). */
export type Schedule = (fn: () => void, ms: number) => () => void

export type PersistStatus =
  /** Saving works. */
  | { kind: 'saved' }
  /** Changes stay in memory only and are lost when the tab closes. */
  | { kind: 'memory'; reason: 'unavailable' | 'full' }
  /** Stored data could not be read; it is never overwritten. `raw` is offered for export. */
  | { kind: 'blocked'; reason: 'newer' | 'invalid'; message: string; raw: string }

export interface Persistence {
  readonly status: PersistStatus
  /** Reads the stored state. Falls back to a fresh state if there is none or it is unusable. */
  load(): AppState
  /** Saves `state` after a short delay; a newer call replaces a pending one. */
  queue(state: AppState): void
  /**
   * Takes the text another tab just saved (`storage` event) and drops this tab's pending save,
   * which would overwrite it. Returns the new state, or `null` if there is nothing usable.
   */
  receive(raw: string | null): AppState | null
  /** Writes a pending save now (on `pagehide`). */
  flush(): void
  /** Replaces the state with an imported one and saves it now, even over blocked data. */
  replace(state: AppState): void
  /** Text for an export file: the blocked stored data if there is any, else `state`. */
  exportText(state: AppState): string
}

interface Options {
  /** `null` when browser storage cannot be used at all. */
  storage: KeyValueStorage | null
  schedule: Schedule
  onStatus?: (status: PersistStatus) => void
}

export function createPersistence({ storage, schedule, onStatus }: Options): Persistence {
  let status: PersistStatus = storage
    ? { kind: 'saved' }
    : { kind: 'memory', reason: 'unavailable' }
  /** Last text written or read, to skip writes that change nothing. */
  let lastText: string | null = null
  let pending: string | null = null
  let cancel: (() => void) | null = null

  function setStatus(next: PersistStatus) {
    status = next
    onStatus?.(next)
  }

  function write(text: string) {
    if (!storage || status.kind === 'blocked' || text === lastText) return
    try {
      storage.setItem(STORAGE_KEY, text)
      lastText = text
      if (status.kind !== 'saved') setStatus({ kind: 'saved' })
    } catch (error) {
      setStatus({ kind: 'memory', reason: isQuotaError(error) ? 'full' : 'unavailable' })
    }
  }

  /** Parses stored text; unusable text blocks saving so it is never overwritten. */
  function read(raw: string): AppState | null {
    const result = parseState(raw)
    if (!result.ok) {
      setStatus({ kind: 'blocked', reason: result.reason, message: result.message, raw })
      return null
    }
    // A migrated state differs from what is stored, so it is written on the next save.
    lastText = result.fromVersion === result.state.version ? raw : null
    return result.state
  }

  function cancelPending() {
    cancel?.()
    cancel = null
    pending = null
  }

  return {
    get status() {
      return status
    },

    load() {
      if (!storage) return defaultState()
      let raw: string | null
      try {
        raw = storage.getItem(STORAGE_KEY)
      } catch {
        setStatus({ kind: 'memory', reason: 'unavailable' })
        return defaultState()
      }
      if (raw === null) return defaultState()
      return read(raw) ?? defaultState()
    },

    receive(raw) {
      if (!storage || raw === null) return null
      cancelPending()
      const state = read(raw)
      if (state && status.kind === 'blocked') setStatus({ kind: 'saved' })
      return state
    },

    queue(state) {
      cancelPending()
      pending = serializeState(state)
      cancel = schedule(() => {
        const text = pending
        cancel = null
        pending = null
        if (text !== null) write(text)
      }, SAVE_DELAY_MS)
    },

    flush() {
      const text = pending
      cancelPending()
      if (text !== null) write(text)
    },

    replace(state) {
      cancelPending()
      if (status.kind === 'blocked') setStatus({ kind: 'saved' })
      write(serializeState(state))
    },

    exportText(state) {
      return status.kind === 'blocked' ? status.raw : serializeState(state)
    },
  }
}

/** Browsers name this differently; Firefox used its own name and code. */
function isQuotaError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  const { name, code } = error as { name?: unknown; code?: unknown }
  return (
    name === 'QuotaExceededError' ||
    name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    code === 22 ||
    code === 1014
  )
}
