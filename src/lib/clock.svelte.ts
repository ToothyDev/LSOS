// Runs the play clock while LSOS is open and offers both clocks to the UI (decision 003).
// Logic lives in clock.ts; this file only wires it to Svelte, timers and the browser.
import { PlayClock, TICK_INTERVAL_MS } from './clock'
import { saveNow, store } from './store.svelte'

class Clocks {
  /** Wall-clock time of the latest tick, epoch ms. Read it to re-render once per tick. */
  now = $state(Date.now())
}

export const clocks = new Clocks()

const playClock = new PlayClock(() => store.state.clock)

function tick() {
  clocks.now = Date.now()
  playClock.tick(clocks.now)
}

export function togglePause(): void {
  clocks.now = Date.now()
  if (store.state.clock.paused) playClock.resume(clocks.now)
  else playClock.pause(clocks.now)
}

tick()
setInterval(tick, TICK_INTERVAL_MS)
// A hidden tab may not have ticked for up to a minute; count that time before saving.
document.addEventListener('visibilitychange', tick)
window.addEventListener('pagehide', () => {
  tick()
  saveNow()
})
