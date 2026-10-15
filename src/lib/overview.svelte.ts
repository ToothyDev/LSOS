// The Overview's events and holdings on the live state, and browser notifications when one
// becomes due (issue #15). Logic lives in overview.ts and events.ts; this file only wires it to
// the clock, the store and the browser.
import { SUPPLY_PURCHASE } from '../data/business-events'
import { GOODS } from '../data/nightclub'
import { PRODUCTION } from '../data/production'
import { PROPERTIES } from '../data/properties'
import { SAFES } from '../data/safes'
import { LUCKY_WHEEL, MANSION_BOOST } from '../data/timers'
import { clocks } from './clock.svelte'
import { dueIds, newlyDue } from './events'
import { allEvents, holdings, type TrackerData } from './overview'
import { store } from './store.svelte'

const DATA: TrackerData = {
  catalog: PROPERTIES,
  productions: PRODUCTION,
  goods: GOODS,
  safes: SAFES,
  wheel: LUCKY_WHEEL,
  mansion: MANSION_BOOST,
  fillsTo: SUPPLY_PURCHASE.fillsTo,
}

class Overview {
  events = $derived(allEvents(store.state, DATA, clocks.now))
  holdings = $derived(holdings(store.state, DATA, clocks.now))
}

export const overview = new Overview()

/** Whether this browser can show notifications at all. */
export function notificationsSupported(): boolean {
  return typeof Notification !== 'undefined'
}

/**
 * Turns notifications on after asking the browser for permission, or off. Returns why they
 * could not be turned on, if they could not.
 */
export async function setNotify(on: boolean): Promise<string | null> {
  if (!on) {
    store.state.alerts = { notify: false }
    return null
  }
  if (!notificationsSupported()) return 'This browser cannot show notifications.'
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    return 'The browser blocked notifications for LSOS. Allow them in its site settings, then try again.'
  }
  store.state.alerts = { notify: true }
  return null
}

// Due when LSOS opened (or when notifications were turned on) counts as already seen.
let seen: Set<string> | null = null

$effect.root(() => {
  $effect(() => {
    const events = overview.events
    const on = store.state.alerts.notify
    const due = dueIds(events)
    // Only while the user looks elsewhere, e.g. at the game: the page shows it otherwise.
    const allowed = notificationsSupported() && Notification.permission === 'granted'
    if (seen && on && allowed && !document.hasFocus()) {
      for (const event of newlyDue(seen, events)) {
        new Notification(`${event.source}: ${event.what}`, {
          body: event.action ? `${event.action} now.` : undefined,
          tag: event.id,
        })
      }
    }
    seen = on ? due : null
  })
})
