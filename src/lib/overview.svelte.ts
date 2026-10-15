// The Overview's events, holdings and popularity on the live state, its quick actions, and the
// alerts when an item comes due: browser notifications and pop-ups (issue #15). Logic lives in
// overview.ts and events.ts; this file only wires it to the clock, the store and the browser.
import { untrack } from 'svelte'
import { SUPPLY_PURCHASE } from '../data/business-events'
import { GOODS } from '../data/nightclub'
import { PRODUCTION } from '../data/production'
import { PROPERTIES } from '../data/properties'
import { SAFES } from '../data/safes'
import { LUCKY_WHEEL, MANSION_BOOST } from '../data/timers'
import { clocks } from './clock.svelte'
import { isDue, nearIds, newlyNear, type NextEvent } from './events'
import {
  allEvents,
  clubPopularity,
  holdings,
  quickAction,
  visibleEvents,
  type QuickResult,
  type TrackerData,
} from './overview'
import { store } from './store.svelte'

const DATA: TrackerData = {
  catalog: PROPERTIES,
  productions: PRODUCTION,
  goods: GOODS,
  safes: SAFES,
  wheel: LUCKY_WHEEL,
  mansion: MANSION_BOOST,
  fillsTo: SUPPLY_PURCHASE.fillsTo,
  deliveryMs: SUPPLY_PURCHASE.deliveryMs,
}

class Overview {
  /** Every tracker's events, the hidden cards' too. */
  all = $derived(allEvents(store.state, DATA, clocks.now))
  /** What the Overview shows and alerts on: the hidden cards left out (issue #62). */
  events = $derived(visibleEvents(this.all, store.state.overviewHidden))
  holdings = $derived(holdings(store.state, DATA, clocks.now))
  popularity = $derived(clubPopularity(store.state, DATA))
  /** Ids of the events with a pop-up open, oldest first. */
  popups: string[] = $state([])
}

export const overview = new Overview()

/** Marks an event done from the Overview (its `quick`). Returns what undoes it, if done. */
export function quick(event: NextEvent, choice?: string): QuickResult | null {
  const result = quickAction(store.state, DATA, event.id, Date.now(), choice)
  if (result) apply(result.change)
  return result
}

/** Takes back a quick action on event `id`: it is ready again, but that is no news to alert. */
export function undoQuick(id: string, undo: QuickResult['undo']): void {
  Object.assign(store.state, undo(store.state))
  seen?.add(id)
}

function apply(change: QuickResult['change']): void {
  Object.assign(store.state, change)
}

/** Leaves a card's items (event `focus`) out of the Overview and the alerts (issue #62). */
export function hideFromOverview(focus: string): void {
  const hidden = store.state.overviewHidden
  if (!hidden.includes(focus)) store.state.overviewHidden = [...hidden, focus]
}

/** Shows a hidden card's items on the Overview again. */
export function showOnOverview(focus: string): void {
  store.state.overviewHidden = store.state.overviewHidden.filter((f) => f !== focus)
}

export function dismissPopup(id: string): void {
  overview.popups = overview.popups.filter((p) => p !== id)
}

/** Whether this browser can show notifications at all. */
export function notificationsSupported(): boolean {
  return typeof Notification !== 'undefined'
}

/**
 * Turns browser notifications on after asking the browser for permission, or off. Returns why
 * they could not be turned on, if they could not.
 */
export async function setBrowserAlerts(on: boolean): Promise<string | null> {
  if (on) {
    if (!notificationsSupported()) return 'This browser cannot show notifications.'
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') {
      return 'The browser blocked notifications for LSOS. Allow them in its site settings, then try again.'
    }
  }
  store.state.alerts = { ...store.state.alerts, browser: on }
  return null
}

function notify(event: NextEvent): void {
  const body = isDue(event)
    ? event.action && `${event.action} now.`
    : `In ${Math.ceil(event.inMs / 60_000)} min.`
  new Notification(`${event.source}: ${event.what}`, { body: body || undefined, tag: event.id })
}

// What was already near when LSOS opened, or when the alert time changed, alerts no one.
let seen: Set<string> | null = null
let seenLead = -1

$effect.root(() => {
  $effect(() => {
    const events = overview.events
    const { browser, popup, leadMs, unfocusedOnly } = store.state.alerts
    // Hidden items count as seen, so showing them again brings no alert for what is already near.
    const near = nearIds(overview.all, leadMs)
    if (seen && seenLead === leadMs && !(unfocusedOnly && document.hasFocus())) {
      const fresh = newlyNear(seen, events, leadMs)
      if (browser && notificationsSupported() && Notification.permission === 'granted') {
        fresh.forEach(notify)
      }
      if (popup && fresh.length > 0) {
        untrack(() => (overview.popups = [...overview.popups, ...fresh.map((e) => e.id)]))
      }
    }
    seen = near
    seenLead = leadMs
    // A pop-up closes on its own once its item is handled (sold, collected, spun) or hidden.
    untrack(() => {
      const shown = nearIds(events, leadMs)
      const open = overview.popups.filter((id) => shown.has(id))
      if (open.length !== overview.popups.length) overview.popups = open
    })
  })
})
