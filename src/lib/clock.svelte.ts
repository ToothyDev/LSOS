// Runs the session's play clock and offers both clocks to the UI (decision 003).
// Logic lives in clock.ts; this file only wires it to Svelte, timers and the browser.
import {
  TICK_INTERVAL_MS,
  close,
  confirmGaps,
  dismissGaps,
  pause,
  resume,
  startSession,
  tick,
  type ClockState,
} from './clock'
import { saveNow, store } from './store.svelte'

class Clocks {
  /** Wall-clock time of the latest tick, epoch ms. Read it to re-render once per tick. */
  now = $state(Date.now())
  /** This session's play clock. */
  play: ClockState = $state(startSession(store.state.clock, Date.now()))
}

export const clocks = new Clocks()

type PlayListener = (ms: number) => void
const listeners = new Set<PlayListener>()

/**
 * Calls `listener` with each stretch of play time as it is counted, so a tracker can add it to
 * its own saved progress. Returns a function that stops the calls.
 */
export function onPlayTime(listener: PlayListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function report(ms: number) {
  if (ms > 0) for (const listener of listeners) listener(ms)
}

/** Set on `pagehide`. Browsers fire `visibilitychange` after it, which must not restart the clock. */
let closed = false

function onTick() {
  if (closed) return
  clocks.now = Date.now()
  report(tick(clocks.play, clocks.now))
}

// Only one tab counts play time, or trackers would get it twice (issue #22): a tab that starts
// counting pauses the others.
const tabs = typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('lsos:clock')
tabs?.addEventListener('message', () => {
  if (clocks.play.paused) return
  clocks.now = Date.now()
  report(pause(clocks.play, clocks.now))
  saveNow()
})
if (!clocks.play.paused) tabs?.postMessage('counting')

export function togglePause(): void {
  clocks.now = Date.now()
  if (clocks.play.paused) {
    resume(clocks.play, clocks.now)
    tabs?.postMessage('counting')
  } else report(pause(clocks.play, clocks.now))
}

export function answerGaps(playing: boolean): void {
  if (playing) report(confirmGaps(clocks.play))
  else dismissGaps(clocks.play)
}

setInterval(onTick, TICK_INTERVAL_MS)
// A hidden tab may not have ticked for up to a minute. Count that time whenever the page is
// hidden, frozen (Chrome Energy Saver) or shown again, and save trackers' progress before the
// browser can discard the tab.
document.addEventListener('visibilitychange', () => {
  onTick()
  saveNow()
})
document.addEventListener('freeze', () => {
  onTick()
  saveNow()
})
document.addEventListener('resume', onTick)
window.addEventListener('pagehide', () => {
  report(close(clocks.play, Date.now()))
  closed = true
  saveNow()
})
// Back from the back/forward cache: the time away was not spent in LSOS, so start measuring anew.
window.addEventListener('pageshow', (event) => {
  if (!event.persisted) return
  closed = false
  onTick()
})
