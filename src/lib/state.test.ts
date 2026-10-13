import { describe, expect, it } from 'vitest'
import {
  CURRENT_VERSION,
  defaultState,
  exportFileName,
  migrate,
  parseState,
  serializeState,
  type Migration,
} from './state'

describe('parseState', () => {
  it('round-trips the default state', () => {
    const result = parseState(serializeState(defaultState()))
    expect(result).toEqual({ ok: true, state: defaultState(), fromVersion: CURRENT_VERSION })
  })

  it('drops unknown fields', () => {
    const result = parseState(JSON.stringify({ ...defaultState(), junk: 1 }))
    expect(result.ok && result.state).toEqual(defaultState())
  })

  it('migrates a version 1 sample, starting paused by default', () => {
    const result = parseState('{"version":1}')
    expect(result).toEqual({
      ok: true,
      state: {
        version: 2,
        clock: { trackOnOpen: false },
      },
      fromVersion: 1,
    })
  })

  it('keeps the saved clock setting', () => {
    const text = '{"version":2,"clock":{"trackOnOpen":true,"playMs":5}}'
    expect(parseState(text)).toMatchObject({ ok: true, state: { clock: { trackOnOpen: true } } })
  })

  it.each([
    ['a missing clock', '{"version":2}', 'clock section is missing'],
    ['a bad tracking setting', '{"version":2,"clock":{"trackOnOpen":"yes"}}', 'tracking setting'],
  ])('rejects %s', (_, text, message) => {
    const result = parseState(text)
    expect(result).toMatchObject({ ok: false, reason: 'invalid' })
    expect(!result.ok && result.message).toContain(message)
  })

  it('reports a newer version without touching it', () => {
    const result = parseState(JSON.stringify({ version: CURRENT_VERSION + 1 }))
    expect(result).toMatchObject({ ok: false, reason: 'newer', version: CURRENT_VERSION + 1 })
  })

  it.each([
    ['not JSON', '{oops', 'not valid JSON'],
    ['an array', '[1]', 'expected a JSON object'],
    ['null', 'null', 'expected a JSON object'],
    ['no version', '{}', 'no valid version'],
    ['a string version', '{"version":"1"}', 'no valid version'],
    ['a fractional version', '{"version":1.5}', 'no valid version'],
    ['version zero', '{"version":0}', 'no valid version'],
  ])('rejects %s', (_, text, message) => {
    const result = parseState(text)
    expect(result.ok).toBe(false)
    expect(!result.ok && result.reason).toBe('invalid')
    expect(!result.ok && result.message).toContain(message)
  })
})

describe('migrate', () => {
  const migrations: Record<number, Migration> = {
    1: (data) => ({ ...data, renamed: data.old }),
    2: ({ renamed, ...rest }) => ({ ...rest, list: [renamed] }),
  }

  it('runs each step in order and sets the version', () => {
    expect(migrate({ version: 1, old: 'x' }, 3, migrations)).toEqual({
      version: 3,
      old: 'x',
      list: ['x'],
    })
  })

  it('starts from the stored version', () => {
    expect(migrate({ version: 2, renamed: 'y' }, 3, migrations)).toEqual({
      version: 3,
      list: ['y'],
    })
  })

  it('leaves current data alone', () => {
    const data = { version: 3, list: [] }
    expect(migrate(data, 3, migrations)).toBe(data)
  })

  it('does not mutate its input', () => {
    const data = { version: 1, old: 'x' }
    migrate(data, 3, migrations)
    expect(data).toEqual({ version: 1, old: 'x' })
  })

  it('reports a missing step', () => {
    expect(migrate({ version: 1 }, 4, migrations)).toBe('No migration from data version 3.')
  })
})

describe('exportFileName', () => {
  it('uses the local date', () => {
    expect(exportFileName(new Date(2026, 0, 5, 23, 59))).toBe('lsos-backup-2026-01-05.json')
  })
})
