// The app's one reactive state, saved to localStorage on every change (decision 006).
// Logic lives in persistence.ts and state.ts; this file only wires them to Svelte and the browser.
import { createPersistence, type KeyValueStorage, type PersistStatus } from './persistence'
import { defaultState, parseState, type AppState } from './state'

function browserStorage(): KeyValueStorage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

class Store {
  state: AppState = $state(defaultState())
  status: PersistStatus = $state({ kind: 'saved' })
}

export const store = new Store()

const persistence = createPersistence({
  storage: browserStorage(),
  schedule: (fn, ms) => {
    const id = setTimeout(fn, ms)
    return () => clearTimeout(id)
  },
  onStatus: (status) => (store.status = status),
})

store.state = persistence.load()
store.status = persistence.status

$effect.root(() => {
  $effect(() => persistence.queue($state.snapshot(store.state)))
})
window.addEventListener('pagehide', () => persistence.flush())

/**
 * Saves the current state now, for changes made while the page is hiding. The save effect runs
 * only after the current task, which may never come for a page being closed or frozen.
 */
export function saveNow(): void {
  persistence.queue($state.snapshot(store.state))
  persistence.flush()
}

/** JSON text for a backup file. While stored data is blocked, that data is exported instead. */
export function exportText(): string {
  return persistence.exportText($state.snapshot(store.state))
}

/** Replaces all state with an imported file. Returns an error message if the file is unusable. */
export function importText(text: string): string | null {
  const result = parseState(text)
  if (!result.ok) return result.message
  persistence.replace(result.state)
  store.state = result.state
  return null
}
