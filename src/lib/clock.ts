// Play time and real time (decision 003). Pure logic: every function takes `now` (epoch ms).

/** The play clock of the current session. Kept in memory only; each session starts at zero. */
export interface ClockState {
  /** Play time counted this session, in ms. */
  playMs: number
  /** While paused, play time does not advance. */
  paused: boolean
  /** Wall-clock time of the last tick while running, epoch ms. `null` while paused or closed. */
  lastTickMs: number | null
  /** Long gaps waiting for the user to say whether they were playing (decision 008). */
  unconfirmedMs: number
}

/** The saved clock setting. */
export interface ClockSettings {
  /** Start tracking as soon as LSOS opens, instead of paused. */
  trackOnOpen: boolean
}

export function defaultClockSettings(): ClockSettings {
  return { trackOnOpen: false }
}

/** A new session's clock: paused unless the user chose to track on open. */
export function startSession(settings: ClockSettings, now: number): ClockState {
  return {
    playMs: 0,
    paused: !settings.trackOnOpen,
    lastTickMs: settings.trackOnOpen ? now : null,
    unconfirmedMs: 0,
  }
}

/**
 * Gaps between ticks up to this long are counted as play time; longer ones are asked about.
 * Chrome runs timers in hidden tabs only once a minute, aligned to the minute, so throttled gaps
 * can approach two minutes. Five minutes leaves room for that and for a busy machine.
 * Longer gaps come from a frozen tab (still playing) or a sleeping computer (not playing),
 * which LSOS cannot tell apart, so the user decides.
 */
export const MAX_TICK_GAP_MS = 5 * 60_000

/** How often the app ticks while open. Any interval works; it only sets display smoothness. */
export const TICK_INTERVAL_MS = 1000

/**
 * Advances play time from timestamps, never from tick counts, so throttled ticks lose nothing.
 * Returns the play time counted by this tick, for trackers to add to their progress.
 */
export function tick(clock: ClockState, now: number): number {
  if (clock.paused) return 0
  let counted = 0
  if (clock.lastTickMs !== null) {
    const gap = now - clock.lastTickMs
    // A negative gap means the system clock was set back; nothing is counted.
    if (gap > MAX_TICK_GAP_MS) clock.unconfirmedMs += gap
    else if (gap > 0) counted = gap
  }
  clock.playMs += counted
  clock.lastTickMs = now
  return counted
}

/** Counts the time up to `now`, then stops play time. Returns the play time counted. */
export function pause(clock: ClockState, now: number): number {
  const counted = tick(clock, now)
  clock.paused = true
  clock.lastTickMs = null
  return counted
}

/** Starts play time again from `now`; the paused stretch is not counted. */
export function resume(clock: ClockState, now: number): void {
  clock.paused = false
  clock.lastTickMs = now
}

/**
 * The page is being left (`pagehide`): counts up to `now`, then forgets the last tick, so time
 * away is not counted if the page comes back from the back/forward cache.
 */
export function close(clock: ClockState, now: number): number {
  const counted = tick(clock, now)
  clock.lastTickMs = null
  return counted
}

/** The user was playing during the long gaps: count them. Returns the play time counted. */
export function confirmGaps(clock: ClockState): number {
  const counted = clock.unconfirmedMs
  clock.playMs += counted
  clock.unconfirmedMs = 0
  return counted
}

/** The user was not playing during the long gaps: drop them. */
export function dismissGaps(clock: ClockState): void {
  clock.unconfirmedMs = 0
}

/** Real time since `sinceMs` (epoch ms). Never negative, even if the clock was set back. */
export function realElapsed(sinceMs: number, now: number): number {
  return Math.max(0, now - sinceMs)
}

/** A duration as `h:mm:ss`, e.g. `12:04:09`; hours grow past 99 as needed. */
export function formatDuration(ms: number): string {
  const total = Math.floor(Math.max(0, ms) / 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  const hours = Math.floor(total / 3600)
  return `${hours}:${pad(Math.floor(total / 60) % 60)}:${pad(total % 60)}`
}
