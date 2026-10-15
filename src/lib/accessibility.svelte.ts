// Applies the accessibility settings (decision 030) to the page: attributes on <html> for the CSS
// in app.css, and `motionReduced()` for motion made in script (card glides, scrolling).
import { reducesMotion } from './accessibility'
import { store } from './store.svelte'

const query = window.matchMedia('(prefers-reduced-motion: reduce)')
let systemReduces = $state(query.matches)
query.addEventListener('change', (event) => (systemReduces = event.matches))

/** Whether to leave out animations: the saved setting, or the device's when set to follow it. */
export function motionReduced(): boolean {
  return reducesMotion(store.state.accessibility.motion, systemReduces)
}

$effect.root(() => {
  $effect(() => {
    const root = document.documentElement
    root.toggleAttribute('data-reduce-motion', motionReduced())
    root.toggleAttribute('data-no-scanlines', !store.state.accessibility.scanlines)
  })
})
