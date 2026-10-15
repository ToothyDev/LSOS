// The common "next event" shape every tracker gives the Overview tab (issue #15, decision 023):
// what happens next, when, and what to do then. The Overview knows nothing else of a tracker.
import type { TabId } from './tabs'

export interface NextEvent {
  /** Stable while the event is the same thing, e.g. `stock:bunker`; one alert per id. */
  id: string
  /** Where it happens, e.g. "Bunker". */
  source: string
  /** What happens when it is due, e.g. "Stock full". */
  what: string
  /** What to do once it is due, e.g. "Sell"; left out if nothing is to be done. */
  action?: string
  /** Time left until it is due; 0 when due. */
  inMs: number
  /** The clock it counts on: play time stops while LSOS is paused (decision 003). */
  clock: 'play' | 'real'
  /** Due is good news (money waiting, a timer ready) or bad news (something stopped). */
  tone: 'good' | 'bad'
  /** The bar that moves toward it, e.g. stock filling up or supplies running out. */
  level?: { value: number; max: number; kind: 'stock' | 'supplies' | 'heat' }
  /** Money waiting now, e.g. the stock's sale value or the safe's money. */
  value?: number
  /** Resting on an estimate (decision 013). */
  estimated: boolean
  /** The tab where the user acts on it. */
  tab: TabId
}

export function isDue(event: NextEvent): boolean {
  return event.inMs <= 0
}

/**
 * Due events first, bad news before good, then the rest by time left. Ties keep the order the
 * trackers gave.
 */
export function sortEvents(events: readonly NextEvent[]): NextEvent[] {
  const rank = (e: NextEvent) => (isDue(e) ? (e.tone === 'bad' ? 0 : 1) : 2)
  return [...events].sort((a, b) => rank(a) - rank(b) || Math.max(a.inMs, 0) - Math.max(b.inMs, 0))
}

/** The events due now that were not due in `before` (ids), for alerts. */
export function newlyDue(before: ReadonlySet<string>, events: readonly NextEvent[]): NextEvent[] {
  return events.filter((e) => isDue(e) && !before.has(e.id))
}

/** The ids of the events due now. */
export function dueIds(events: readonly NextEvent[]): Set<string> {
  return new Set(events.filter(isDue).map((e) => e.id))
}
