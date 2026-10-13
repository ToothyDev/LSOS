// Play time and real time (decision 003). Pure logic: every function takes `now` (epoch ms).

/** The saved part of the clocks. Real time needs no saved state: it is the wall clock. */
export interface ClockState {
  /** Total play time counted so far, in ms. */
  playMs: number
  /** While paused, play time does not advance. Saved, so a reload stays paused. */
  paused: boolean
  /**
   * Wall-clock time of the last tick while running, epoch ms. `null` while paused or after the
   * tab was closed normally. Saved, so a tab the browser discarded and reloaded continues.
   */
  lastTickMs: number | null
  /** Long gaps waiting for the user to say whether they were playing (decision 008). */
  unconfirmedMs: number
}

export function defaultClock(): ClockState {
  return { playMs: 0, paused: false, lastTickMs: null, unconfirmedMs: 0 }
}

/**
 * Gaps between ticks up to this long are counted as play time; longer ones are asked about.
 * Chrome runs timers in hidden tabs only once a minute, aligned to the minute, so throttled gaps
 * can approach two minutes. Five minutes leaves room for that and for a busy machine.
 * Longer gaps come from a frozen or discarded tab (still playing) or a sleeping computer (not
 * playing), which LSOS cannot tell apart, so the user decides.
 */
export const MAX_TICK_GAP_MS = 5 * 60_000

/** How often the app ticks while open. Any interval works; it only sets display smoothness. */
export const TICK_INTERVAL_MS = 1000

/**
 * Advances play time from timestamps, never from tick counts, so throttled ticks lose nothing.
 * The first tick after starting only starts measuring.
 */
export function tick(clock: ClockState, now: number): void {
  if (clock.paused) return
  if (clock.lastTickMs !== null) {
    const gap = now - clock.lastTickMs
    // A negative gap means the system clock was set back; nothing is counted.
    if (gap > MAX_TICK_GAP_MS) clock.unconfirmedMs += gap
    else if (gap > 0) clock.playMs += gap
  }
  clock.lastTickMs = now
}

/** Counts the time up to `now`, then stops play time. */
export function pause(clock: ClockState, now: number): void {
  tick(clock, now)
  clock.paused = true
  clock.lastTickMs = null
}

/** Starts play time again from `now`; the paused stretch is not counted. */
export function resume(clock: ClockState, now: number): void {
  clock.paused = false
  clock.lastTickMs = now
}

/**
 * The tab is closing normally (`pagehide`): counts up to `now`, then forgets the last tick so
 * closed time is not counted. A discarded tab gets no `pagehide`, so its gap is kept.
 */
export function close(clock: ClockState, now: number): void {
  tick(clock, now)
  clock.lastTickMs = null
}

/** The user was playing during the long gaps: count them. */
export function confirmGaps(clock: ClockState): void {
  clock.playMs += clock.unconfirmedMs
  clock.unconfirmedMs = 0
}

/** The user was not playing during the long gaps: drop them. */
export function dismissGaps(clock: ClockState): void {
  clock.unconfirmedMs = 0
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
