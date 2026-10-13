import { describe, expect, it } from 'vitest'
import {
  MAX_TICK_GAP_MS,
  close,
  confirmGaps,
  dismissGaps,
  formatDuration,
  pause,
  realElapsed,
  resume,
  startSession,
  tick,
  type ClockState,
} from './clock'

const START = Date.UTC(2026, 9, 13, 20, 0)
const SECOND = 1000
const MINUTE = 60 * SECOND

/** A session that is tracking from `START`. */
function setup(clock: ClockState = startSession({ trackOnOpen: true }, START)) {
  let now = START
  let reported = 0
  return {
    clock,
    /** Moves the fake clock forward by each step and ticks after each one. */
    tickAfter(...steps: number[]) {
      for (const step of steps) {
        now += step
        reported += tick(clock, now)
      }
    },
    advance(ms: number) {
      now += ms
    },
    now: () => now,
    /** Play time handed to trackers so far. */
    reported: () => reported,
  }
}

describe('startSession', () => {
  it('starts paused at zero by default', () => {
    const clock = startSession({ trackOnOpen: false }, START)
    expect(clock).toEqual({ playMs: 0, paused: true, lastTickMs: null, unconfirmedMs: 0 })
    tick(clock, START + MINUTE)
    expect(clock.playMs).toBe(0)
  })

  it('starts tracking from now when set to track on open', () => {
    const clock = startSession({ trackOnOpen: true }, START)
    expect(tick(clock, START + SECOND)).toBe(SECOND)
  })
})

describe('tick', () => {
  it('adds the time between ticks in a normal run and reports it', () => {
    const t = setup()
    t.tickAfter(...Array<number>(90).fill(SECOND))
    expect(t.clock.playMs).toBe(90 * SECOND)
    expect(t.reported()).toBe(90 * SECOND)
  })

  it('counts elapsed time, not ticks, in a throttled background tab', () => {
    const t = setup()
    t.tickAfter(SECOND, 59 * SECOND, MINUTE, 118 * SECOND, 1500)
    expect(t.clock.playMs).toBe(SECOND + 59 * SECOND + MINUTE + 118 * SECOND + 1500)
    expect(t.clock.unconfirmedMs).toBe(0)
  })

  it('counts a gap of exactly the threshold', () => {
    const t = setup()
    t.tickAfter(MAX_TICK_GAP_MS)
    expect(t.clock.playMs).toBe(MAX_TICK_GAP_MS)
  })

  it('holds a larger gap (frozen tab or sleep) for the user to confirm, then continues', () => {
    const t = setup()
    t.tickAfter(10 * SECOND, 40 * MINUTE, SECOND, 2 * 60 * MINUTE, SECOND)
    expect(t.clock).toMatchObject({ playMs: 12 * SECOND, unconfirmedMs: 160 * MINUTE })
    expect(t.reported()).toBe(12 * SECOND)
  })

  it('ignores a clock set back', () => {
    const t = setup()
    t.tickAfter(10 * SECOND, -MINUTE, SECOND)
    expect(t.clock).toMatchObject({ playMs: 11 * SECOND, unconfirmedMs: 0 })
  })
})

describe('confirming long gaps', () => {
  it('adds them to play time and reports them when the user was playing', () => {
    const t = setup()
    t.tickAfter(MINUTE, 30 * MINUTE)
    expect(confirmGaps(t.clock)).toBe(30 * MINUTE)
    expect(t.clock).toMatchObject({ playMs: 31 * MINUTE, unconfirmedMs: 0 })
  })

  it('drops them when the user was not playing', () => {
    const t = setup()
    t.tickAfter(MINUTE, 30 * MINUTE)
    dismissGaps(t.clock)
    expect(t.clock).toMatchObject({ playMs: MINUTE, unconfirmedMs: 0 })
  })
})

describe('pause and resume', () => {
  it('does not count paused time, and counts up to the pause', () => {
    const t = setup()
    t.tickAfter(SECOND)
    t.advance(400)
    expect(pause(t.clock, t.now())).toBe(400)
    expect(t.clock).toMatchObject({ playMs: 1400, paused: true })

    t.tickAfter(SECOND, 30 * MINUTE)
    expect(t.clock).toMatchObject({ playMs: 1400, unconfirmedMs: 0 })

    t.advance(SECOND)
    resume(t.clock, t.now())
    t.tickAfter(SECOND, SECOND)
    expect(t.clock.playMs).toBe(3400)
  })
})

describe('leaving the page', () => {
  it('counts up to the close and not the time away', () => {
    const t = setup()
    t.tickAfter(MINUTE)
    t.advance(500)
    expect(close(t.clock, t.now())).toBe(500)

    // Back from the back/forward cache two minutes later.
    t.tickAfter(2 * MINUTE, SECOND)
    expect(t.clock.playMs).toBe(MINUTE + 500 + SECOND)
  })

  it('starts the next session at zero, paused by default', () => {
    const t = setup()
    t.tickAfter(MINUTE)
    close(t.clock, t.now())
    expect(startSession({ trackOnOpen: false }, t.now() + MINUTE)).toMatchObject({
      playMs: 0,
      paused: true,
    })
  })
})

describe('realElapsed', () => {
  it('is the wall-clock time since a moment, never negative', () => {
    expect(realElapsed(START, START + MINUTE)).toBe(MINUTE)
    expect(realElapsed(START, START - MINUTE)).toBe(0)
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
