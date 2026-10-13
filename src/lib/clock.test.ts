import { describe, expect, it } from 'vitest'
import {
  MAX_TICK_GAP_MS,
  close,
  confirmGaps,
  defaultClock,
  dismissGaps,
  elapsedSince,
  formatDuration,
  markNow,
  pause,
  resume,
  tick,
  type ClockState,
} from './clock'
import { defaultState, parseState, serializeState } from './state'

const START = Date.UTC(2026, 9, 13, 20, 0)
const SECOND = 1000
const MINUTE = 60 * SECOND

function setup(clock: ClockState = defaultClock(), start = START) {
  let now = start
  return {
    clock,
    /** Moves the fake clock forward by each step and ticks after each one. */
    tickAfter(...steps: number[]) {
      for (const step of steps) {
        now += step
        tick(clock, now)
      }
    },
    advance(ms: number) {
      now += ms
    },
    now: () => now,
  }
}

/** Saves and loads the clock the way a reload does. */
function reload(clock: ClockState): ClockState {
  const result = parseState(serializeState({ ...defaultState(), clock }))
  if (!result.ok) throw new Error(result.message)
  return result.state.clock
}

describe('tick', () => {
  it('starts measuring at the first tick', () => {
    const t = setup()
    t.tickAfter(0)
    expect(t.clock.playMs).toBe(0)
  })

  it('adds the time between ticks in a normal run', () => {
    const t = setup()
    t.tickAfter(0, ...Array<number>(90).fill(SECOND))
    expect(t.clock.playMs).toBe(90 * SECOND)
  })

  it('counts elapsed time, not ticks, in a throttled background tab', () => {
    const t = setup()
    t.tickAfter(0, SECOND, 59 * SECOND, MINUTE, 118 * SECOND, 1500)
    expect(t.clock.playMs).toBe(SECOND + 59 * SECOND + MINUTE + 118 * SECOND + 1500)
    expect(t.clock.unconfirmedMs).toBe(0)
  })

  it('counts a gap of exactly the threshold', () => {
    const t = setup()
    t.tickAfter(0, MAX_TICK_GAP_MS)
    expect(t.clock.playMs).toBe(MAX_TICK_GAP_MS)
  })

  it('holds a larger gap (frozen tab or sleep) for the user to confirm, then continues', () => {
    const t = setup()
    t.tickAfter(0, 10 * SECOND, 40 * MINUTE, SECOND, 2 * 60 * MINUTE, SECOND)
    expect(t.clock).toMatchObject({ playMs: 12 * SECOND, unconfirmedMs: 160 * MINUTE })
  })

  it('ignores a clock set back', () => {
    const t = setup()
    t.tickAfter(0, 10 * SECOND, -MINUTE, SECOND)
    expect(t.clock).toMatchObject({ playMs: 11 * SECOND, unconfirmedMs: 0 })
  })
})

describe('confirming long gaps', () => {
  it('adds them to play time when the user was playing', () => {
    const t = setup()
    t.tickAfter(0, MINUTE, 30 * MINUTE)
    confirmGaps(t.clock)
    expect(t.clock).toMatchObject({ playMs: 31 * MINUTE, unconfirmedMs: 0 })
  })

  it('drops them when the user was not playing', () => {
    const t = setup()
    t.tickAfter(0, MINUTE, 30 * MINUTE)
    dismissGaps(t.clock)
    expect(t.clock).toMatchObject({ playMs: MINUTE, unconfirmedMs: 0 })
  })
})

describe('pause and resume', () => {
  it('does not count paused time, and counts up to the pause', () => {
    const t = setup()
    t.tickAfter(0, SECOND)
    t.advance(400)
    pause(t.clock, t.now())
    expect(t.clock).toMatchObject({ playMs: 1400, paused: true })

    t.tickAfter(SECOND, 30 * MINUTE)
    expect(t.clock).toMatchObject({ playMs: 1400, unconfirmedMs: 0 })

    t.advance(SECOND)
    resume(t.clock, t.now())
    expect(t.clock.paused).toBe(false)
    t.tickAfter(SECOND, SECOND)
    expect(t.clock.playMs).toBe(3400)
  })
})

describe('reload', () => {
  it('resumes from the saved total after a normal close, without counting closed time', () => {
    const before = setup()
    before.tickAfter(0, MINUTE)
    before.advance(500)
    close(before.clock, before.now())

    const after = setup(reload(before.clock))
    after.advance(2 * MINUTE)
    after.tickAfter(0, SECOND)
    expect(after.clock).toMatchObject({ playMs: MINUTE + 500 + SECOND, unconfirmedMs: 0 })
  })

  it('counts a short gap after the browser discarded and reloaded the tab', () => {
    const before = setup()
    before.tickAfter(0, MINUTE)

    const after = setup(reload(before.clock), before.now())
    after.tickAfter(3 * MINUTE)
    expect(after.clock.playMs).toBe(4 * MINUTE)
  })

  it('asks about a long gap after the browser discarded and reloaded the tab', () => {
    const before = setup()
    before.tickAfter(0, MINUTE)

    const after = setup(reload(before.clock), before.now())
    after.tickAfter(45 * MINUTE)
    expect(after.clock).toMatchObject({ playMs: MINUTE, unconfirmedMs: 45 * MINUTE })
  })

  it('stays paused after a reload', () => {
    const t = setup()
    pause(t.clock, t.now())
    const after = setup(reload(t.clock))
    after.tickAfter(0, SECOND)
    expect(after.clock).toMatchObject({ playMs: 0, paused: true })
  })
})

describe('elapsedSince', () => {
  it('reports play and real time since a mark', () => {
    const t = setup()
    t.tickAfter(0, MINUTE)
    const mark = markNow(t.clock, t.now())
    t.tickAfter(SECOND)
    pause(t.clock, t.now())
    t.advance(MINUTE)
    expect(elapsedSince(mark, t.clock, t.now())).toEqual({
      playMs: SECOND,
      realMs: MINUTE + SECOND,
    })
  })

  it('is never negative', () => {
    const mark = { playMs: 5000, realMs: START }
    expect(elapsedSince(mark, defaultClock(), START - MINUTE)).toEqual({ playMs: 0, realMs: 0 })
  })
})

describe('formatDuration', () => {
  it.each([
    [0, '0:00:00'],
    [999, '0:00:00'],
    [61 * SECOND, '0:01:01'],
    [(12 * 3600 + 4 * 60 + 9) * SECOND, '12:04:09'],
    [123 * 3600 * SECOND, '123:00:00'],
    [-5, '0:00:00'],
  ])('formats %d ms as %s', (ms, text) => {
    expect(formatDuration(ms)).toBe(text)
  })
})
