import { describe, expect, it } from 'vitest'
import {
  MAX_TICK_GAP_MS,
  PlayClock,
  defaultClock,
  elapsedSince,
  formatDuration,
  markNow,
  type ClockState,
} from './clock'
import { defaultState, parseState, serializeState } from './state'

const START = Date.UTC(2026, 9, 13, 20, 0)
const SECOND = 1000
const MINUTE = 60 * SECOND

function setup(state: ClockState = defaultClock()) {
  const clock = new PlayClock(() => state)
  let now = START
  return {
    state,
    clock,
    /** Moves the fake clock forward by each step and ticks after each one. */
    tickAfter(...steps: number[]) {
      for (const step of steps) {
        now += step
        clock.tick(now)
      }
    },
    advance(ms: number) {
      now += ms
    },
    now: () => now,
  }
}

describe('PlayClock', () => {
  it('starts measuring at the first tick', () => {
    const t = setup()
    t.tickAfter(0)
    expect(t.state.playMs).toBe(0)
  })

  it('adds the time between ticks in a normal run', () => {
    const t = setup()
    t.tickAfter(0, ...Array<number>(90).fill(SECOND))
    expect(t.state.playMs).toBe(90 * SECOND)
  })

  it('counts elapsed time, not ticks, in a throttled background tab', () => {
    const t = setup()
    t.tickAfter(0, SECOND, 59 * SECOND, MINUTE, 118 * SECOND, 1500)
    expect(t.state.playMs).toBe(SECOND + 59 * SECOND + MINUTE + 118 * SECOND + 1500)
  })

  it('counts a gap of exactly the threshold', () => {
    const t = setup()
    t.tickAfter(0, MAX_TICK_GAP_MS)
    expect(t.state.playMs).toBe(MAX_TICK_GAP_MS)
  })

  it('ignores a gap too large to be throttling, then continues', () => {
    const t = setup()
    t.tickAfter(0, 10 * SECOND, 8 * 60 * MINUTE, SECOND, SECOND)
    expect(t.state.playMs).toBe(12 * SECOND)
  })

  it('ignores a clock set back', () => {
    const t = setup()
    t.tickAfter(0, 10 * SECOND, -MINUTE, SECOND)
    expect(t.state.playMs).toBe(11 * SECOND)
  })

  it('does not count paused time, and counts up to the pause', () => {
    const t = setup()
    t.tickAfter(0, SECOND)
    t.advance(400)
    t.clock.pause(t.now())
    expect(t.state).toEqual({ playMs: 1400, paused: true })

    t.tickAfter(SECOND, 30 * MINUTE)
    expect(t.state.playMs).toBe(1400)

    t.advance(SECOND)
    t.clock.resume(t.now())
    expect(t.state.paused).toBe(false)
    t.tickAfter(SECOND, SECOND)
    expect(t.state.playMs).toBe(3400)
  })

  it('resumes from the saved total after a reload, without counting closed time', () => {
    const before = setup()
    before.tickAfter(0, MINUTE)
    const saved = parseState(serializeState({ ...defaultState(), clock: before.state }))
    if (!saved.ok) throw new Error(saved.message)

    const after = setup(saved.state.clock)
    after.advance(2 * MINUTE)
    after.tickAfter(0, SECOND)
    expect(after.state.playMs).toBe(MINUTE + SECOND)
  })

  it('stays paused after a reload', () => {
    const t = setup({ playMs: 5000, paused: true })
    t.tickAfter(0, SECOND)
    expect(t.state).toEqual({ playMs: 5000, paused: true })
  })

  it('reads the state on each tick, so a replaced state is used', () => {
    let state: ClockState = defaultClock()
    const clock = new PlayClock(() => state)
    clock.tick(START)
    state = { playMs: 10 * SECOND, paused: false }
    clock.tick(START + SECOND)
    expect(state.playMs).toBe(11 * SECOND)
  })
})

describe('elapsedSince', () => {
  it('reports play and real time since a mark', () => {
    const t = setup()
    t.tickAfter(0, MINUTE)
    const mark = markNow(t.state, t.now())
    t.tickAfter(SECOND)
    t.clock.pause(t.now())
    t.advance(MINUTE)
    expect(elapsedSince(mark, t.state, t.now())).toEqual({
      playMs: SECOND,
      realMs: MINUTE + SECOND,
    })
  })

  it('is never negative', () => {
    const mark = { playMs: 5000, realMs: START }
    expect(elapsedSince(mark, { playMs: 0, paused: false }, START - MINUTE)).toEqual({
      playMs: 0,
      realMs: 0,
    })
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
