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
  /** The card on that tab to scroll to and highlight (`data-focus`), e.g. the property id. */
  focus: string
  /**
   * Can be marked done right from the Overview, e.g. "Spun": `label` is the button. With
   * `choices`, one must be picked first (the Mansion boost's business).
   */
  quick?: { label: string; choices?: readonly { id: string; label: string }[] }
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

/** Whether an alert `leadMs` ahead is due for the event: it is that close or due. */
export function isNear(event: NextEvent, leadMs: number): boolean {
  return event.inMs <= leadMs
}

/** The ids of the events within `leadMs` of being due, or due. */
export function nearIds(events: readonly NextEvent[], leadMs: number): Set<string> {
  return new Set(events.filter((e) => isNear(e, leadMs)).map((e) => e.id))
}

/** The events that came within `leadMs` since `before` (ids, from `nearIds`): one alert each. */
export function newlyNear(
  before: ReadonlySet<string>,
  events: readonly NextEvent[],
  leadMs: number,
): NextEvent[] {
  return events.filter((e) => isNear(e, leadMs) && !before.has(e.id))
}
