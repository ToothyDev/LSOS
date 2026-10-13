// Runs the play clock while LSOS is open and offers both clocks to the UI (decision 003).
// Logic lives in clock.ts; this file only wires it to Svelte, timers and the browser.
import { TICK_INTERVAL_MS, close, confirmGaps, dismissGaps, pause, resume, tick } from './clock'
import { saveNow, store } from './store.svelte'

class Clocks {
  /** Wall-clock time of the latest tick, epoch ms. Read it to re-render once per tick. */
  now = $state(Date.now())
}

export const clocks = new Clocks()

/** Set on `pagehide`. Browsers fire `visibilitychange` after it, which must not restart the clock. */
let closed = false

function onTick() {
  if (closed) return
  clocks.now = Date.now()
  tick(store.state.clock, clocks.now)
}

export function togglePause(): void {
  clocks.now = Date.now()
  if (store.state.clock.paused) resume(store.state.clock, clocks.now)
  else pause(store.state.clock, clocks.now)
}

export function answerGaps(playing: boolean): void {
  if (playing) confirmGaps(store.state.clock)
  else dismissGaps(store.state.clock)
}

onTick()
setInterval(onTick, TICK_INTERVAL_MS)
// A hidden tab may not have ticked for up to a minute. Count that time whenever the page is
// hidden, frozen (Chrome Energy Saver) or shown again, and save before it can be discarded.
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
  close(store.state.clock, Date.now())
  closed = true
  saveNow()
})
// Back from the back/forward cache: the time away was not spent in LSOS, so start measuring anew.
window.addEventListener('pageshow', (event) => {
  if (!event.persisted) return
  closed = false
  onTick()
})
