import { describe, expect, it } from 'vitest'
import {
  SAVE_DELAY_MS,
  STORAGE_KEY,
  createPersistence,
  type KeyValueStorage,
  type PersistStatus,
} from './persistence'
import { CURRENT_VERSION, defaultState, serializeState } from './state'

/** In-memory storage that can be told to fail. */
function fakeStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  const storage = {
    writes: 0,
    failWith: null as unknown,
    failReads: false,
    getItem(key: string) {
      if (storage.failReads) throw new Error('SecurityError')
      return data.get(key) ?? null
    },
    setItem(key: string, value: string) {
      if (storage.failWith) throw storage.failWith
      storage.writes++
      data.set(key, value)
    },
    get stored() {
      return data.get(STORAGE_KEY)
    },
  }
  return storage satisfies KeyValueStorage
}

/** Collects scheduled callbacks so a test decides when time passes. */
function fakeSchedule() {
  let tasks: { fn: () => void; ms: number }[] = []
  return {
    schedule(fn: () => void, ms: number) {
      const task = { fn, ms }
      tasks.push(task)
      return () => (tasks = tasks.filter((t) => t !== task))
    },
    get pending() {
      return tasks.length
    },
    runAll() {
      const due = tasks
      tasks = []
      for (const task of due) {
        expect(task.ms).toBe(SAVE_DELAY_MS)
        task.fn()
      }
    },
  }
}

function setup(storage: KeyValueStorage | null = fakeStorage()) {
  const clock = fakeSchedule()
  const statuses: PersistStatus[] = []
  const persistence = createPersistence({
    storage,
    schedule: clock.schedule,
    onStatus: (s) => statuses.push(s),
  })
  return { persistence, clock, statuses }
}

const current = serializeState(defaultState())

describe('load', () => {
  it('starts fresh when nothing is stored', () => {
    const { persistence } = setup()
    expect(persistence.load()).toEqual(defaultState())
    expect(persistence.status).toEqual({ kind: 'saved' })
  })

  it('reads the stored state', () => {
    const { persistence } = setup(fakeStorage({ [STORAGE_KEY]: current }))
    expect(persistence.load()).toEqual(defaultState())
  })

  it('blocks saving over a newer version and offers it for export', () => {
    const raw = JSON.stringify({ version: CURRENT_VERSION + 1, future: true })
    const storage = fakeStorage({ [STORAGE_KEY]: raw })
    const { persistence, clock } = setup(storage)

    expect(persistence.load()).toEqual(defaultState())
    expect(persistence.status).toMatchObject({ kind: 'blocked', reason: 'newer', raw })

    persistence.queue(defaultState())
    clock.runAll()
    persistence.flush()
    expect(storage.stored).toBe(raw)
    expect(persistence.exportText(defaultState())).toBe(raw)
  })

  it('blocks saving over unreadable data', () => {
    const storage = fakeStorage({ [STORAGE_KEY]: '{broken' })
    const { persistence, clock } = setup(storage)
    persistence.load()
    expect(persistence.status).toMatchObject({ kind: 'blocked', reason: 'invalid' })
    persistence.queue(defaultState())
    clock.runAll()
    expect(storage.stored).toBe('{broken')
  })

  it('works in memory when storage cannot be read', () => {
    const storage = fakeStorage()
    storage.failReads = true
    const { persistence, statuses } = setup(storage)
    expect(persistence.load()).toEqual(defaultState())
    expect(statuses).toEqual([{ kind: 'memory', reason: 'unavailable' }])
  })

  it('works in memory without any storage', () => {
    const { persistence, clock } = setup(null)
    expect(persistence.load()).toEqual(defaultState())
    expect(persistence.status).toEqual({ kind: 'memory', reason: 'unavailable' })
    persistence.queue(defaultState())
    clock.runAll()
  })
})

describe('save', () => {
  it('debounces writes and keeps the latest state', () => {
    const storage = fakeStorage()
    const { persistence, clock } = setup(storage)
    persistence.load()
    persistence.queue({ ...defaultState(), n: 1 } as never)
    persistence.queue({ ...defaultState(), n: 2 } as never)
    expect(clock.pending).toBe(1)
    expect(storage.writes).toBe(0)

    clock.runAll()
    expect(storage.writes).toBe(1)
    expect(JSON.parse(storage.stored!)).toEqual({ ...defaultState(), n: 2 })
  })

  it('writes a pending save on flush and cancels the timer', () => {
    const storage = fakeStorage()
    const { persistence, clock } = setup(storage)
    persistence.load()
    persistence.queue(defaultState())
    persistence.flush()
    expect(storage.stored).toBe(current)
    expect(clock.pending).toBe(0)
  })

  it('does nothing on flush without a pending save', () => {
    const storage = fakeStorage()
    const { persistence } = setup(storage)
    persistence.load()
    persistence.flush()
    expect(storage.writes).toBe(0)
  })

  it('skips writing what is already stored', () => {
    const storage = fakeStorage({ [STORAGE_KEY]: current })
    const { persistence, clock } = setup(storage)
    persistence.load()
    persistence.queue(defaultState())
    clock.runAll()
    expect(storage.writes).toBe(0)
  })

  it('keeps working in memory when storage is full, and recovers', () => {
    const storage = fakeStorage()
    const { persistence, clock, statuses } = setup(storage)
    persistence.load()

    storage.failWith = Object.assign(new Error('full'), { name: 'QuotaExceededError' })
    persistence.queue(defaultState())
    clock.runAll()
    expect(persistence.status).toEqual({ kind: 'memory', reason: 'full' })

    storage.failWith = null
    persistence.queue(defaultState())
    clock.runAll()
    expect(storage.stored).toBe(current)
    expect(statuses).toEqual([{ kind: 'memory', reason: 'full' }, { kind: 'saved' }])
  })

  it('reports other write errors as unavailable', () => {
    const storage = fakeStorage()
    storage.failWith = new Error('SecurityError')
    const { persistence } = setup(storage)
    persistence.load()
    persistence.replace(defaultState())
    expect(persistence.status).toEqual({ kind: 'memory', reason: 'unavailable' })
  })
})

describe('replace (import)', () => {
  it('saves at once and drops a pending save', () => {
    const storage = fakeStorage()
    const { persistence, clock } = setup(storage)
    persistence.load()
    persistence.queue({ ...defaultState(), n: 1 } as never)
    persistence.replace(defaultState())
    expect(storage.stored).toBe(current)
    expect(clock.pending).toBe(0)
  })

  it('overwrites blocked data when the user imports', () => {
    const storage = fakeStorage({ [STORAGE_KEY]: JSON.stringify({ version: 999 }) })
    const { persistence } = setup(storage)
    persistence.load()
    persistence.replace(defaultState())
    expect(storage.stored).toBe(current)
    expect(persistence.status).toEqual({ kind: 'saved' })
    expect(persistence.exportText(defaultState())).toBe(current)
  })
})
