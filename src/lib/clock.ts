// Play time and real time (decision 003). Pure logic: every function takes `now` (epoch ms).

/** The saved part of the clocks. Real time needs no saved state: it is the wall clock. */
export interface ClockState {
  /** Total play time counted so far, in ms. */
  playMs: number
  /** While paused, play time does not advance. Saved, so a reload stays paused. */
  paused: boolean
}

export function defaultClock(): ClockState {
  return { playMs: 0, paused: false }
}

/**
 * Gaps between ticks longer than this are not counted (sleep, hibernate, a frozen tab).
 * Chrome's intensive throttling runs timers in hidden tabs only once a minute, aligned to the
 * minute, so real gaps can approach two minutes. Five minutes leaves room for that and for a
 * busy machine, while losing at most a few minutes of play when a sleep is not caught.
 */
export const MAX_TICK_GAP_MS = 5 * 60_000

/** How often the app ticks while open. Any interval works; it only sets display smoothness. */
export const TICK_INTERVAL_MS = 1000

/**
 * Advances play time from timestamps, never from tick counts. `lastTick` is not saved:
 * after a reload the first tick only starts measuring, so closed time is never counted.
 */
export class PlayClock {
  private lastTick: number | null = null

  /** `state` is read on each call because an import can replace the whole state object. */
  constructor(private readonly state: () => ClockState) {}

  tick(now: number): void {
    const clock = this.state()
    if (clock.paused) {
      this.lastTick = null
      return
    }
    if (this.lastTick !== null) clock.playMs += countedGap(now - this.lastTick)
    this.lastTick = now
  }

  /** Counts the time up to `now`, then stops play time. */
  pause(now: number): void {
    this.tick(now)
    this.state().paused = true
    this.lastTick = null
  }

  /** Starts play time again from `now`; the paused stretch is not counted. */
  resume(now: number): void {
    this.state().paused = false
    this.lastTick = now
  }
}

function countedGap(gap: number): number {
  // A negative gap means the system clock was set back; nothing is counted.
  return gap > 0 && gap <= MAX_TICK_GAP_MS ? gap : 0
}

/** A point in both clocks, stored by trackers to ask later how much time has passed. */
export interface TimeMark {
  /** `ClockState.playMs` at that moment. */
  playMs: number
  /** Wall-clock time, epoch ms. */
  realMs: number
}

export function markNow(clock: ClockState, now: number): TimeMark {
  return { playMs: clock.playMs, realMs: now }
}

export interface Elapsed {
  playMs: number
  realMs: number
}

/** Play and real time since `mark`. Never negative, even if the system clock was set back. */
export function elapsedSince(mark: TimeMark, clock: ClockState, now: number): Elapsed {
  return {
    playMs: Math.max(0, clock.playMs - mark.playMs),
    realMs: Math.max(0, now - mark.realMs),
  }
}

/** A duration as `h:mm:ss`, e.g. `12:04:09`; hours grow past 99 as needed. */
export function formatDuration(ms: number): string {
  const total = Math.floor(Math.max(0, ms) / 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  const hours = Math.floor(total / 3600)
  return `${hours}:${pad(Math.floor(total / 60) % 60)}:${pad(total % 60)}`
}
