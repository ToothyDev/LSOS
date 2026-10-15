# 023: Overview tab: every tracker's next event in one list, made for a second screen

2026-10-15, issue #15. Builds on decisions 003, 010, 012, 013, 015, 016, 017, 018 and 022.

## Decision

- **Shared shape:** each tracker gives its next events as `NextEvent` (`src/lib/events.ts`): what
  happens, where, the time left and on which clock (play or real), whether it is good or bad news
  once due, the action to take, the bar that moves toward it, the money waiting, whether it rests
  on an estimate, the card it belongs to (`tab` and `focus`) and, for timers that need nothing
  else, a quick action. The trackers build them: `productionEvents`, `goodsEvents`, `safeEvents`,
  `frontsEvents`, `timerEvents`. `src/lib/overview.ts` gathers and sorts them.
- **Events:** per running business with a known rate, whichever comes first: stock full (Sell) or
  supplies out (Resupply). The Acid Lab boost and the Mansion boost when they can be started; the
  Lucky Wheel spin; each nightclub goods type a technician makes, when full; each owned safe,
  when full; the Money Fronts safe, when full, and the Car Wash at max heat, as the safe card
  shows them.
- **Supplies on their way** are no event of their own: they need nothing from the player. The
  forecast (`forecastAt`, also on the business cards) runs the business on what it has until
  they arrive, then on full supplies. If the stock fills before they arrive, that comes first.
  Play time is taken to run along with real time meanwhile, as `produceAll` does.
- **Order:** due items first, bad news (something stopped) before good news, then the rest by
  time left. Play and real time are compared directly: they run at the same pace while playing.
- **Layout, made to stay open on a 1080p second screen without scrolling:** a strip with the
  number of items ready, the money waiting (business stock at the value the cards show, nightclub
  goods, safes, total) and nightclub popularity with its bar, amber when it cuts the payout;
  "Ready now" as large cards with the action first; "Coming up" as one line per item (time,
  name, bar, value) in two columns. While play time is paused, play-time countdowns turn grey.
- **Jump to the card:** every item links to `#/<tab>/<focus>`. The tab opens, the card with that
  `data-focus` (a `Panel` prop) scrolls into view and glows for a moment, and the address drops
  back to `#/<tab>` so the same link works again.
- **Quick actions:** every Ready now card has a button to mark it done right there: Sold (stock
  or nightclub goods, as the Sold event on the card), Bought (supplies, a delivery as on the
  card), Collected (a safe), Done (a legal job clears the Car Wash heat), Spun (Lucky Wheel),
  Started (a production boost; the Mansion boost picks its business in a dropdown first). Undo
  stays offered for 15 seconds and puts back only what the action took, on top of progress
  since: stock or money made meanwhile is kept. Partial sales and corrections stay on the cards
  (decision 010).
- **Alerts** (Settings, all off until opted in): pop-ups inside LSOS on any tab, and browser
  notifications (permission asked when ticked). Both come a chosen time before an item is due
  (when it happens, or 1, 5, 10, 15 or 30 minutes before; default 10), once per item, and
  optionally only while LSOS is not the focused window. A pop-up shows the live countdown, links
  to the card, and closes when dismissed or once the item is handled. Items already that close
  when LSOS opens, when the alert time changes, or after an undo, do not alert.
- **Saved state** (version 12): `alerts: { browser, popup, leadMs, unfocusedOnly }`.

## Why

A player glancing at a second screen wants three answers: what to do now, what comes next and
how much money is waiting. Actions as verbs ("Sell", "Resupply", "Collect") answer the first
without reading further. A supply delivery is not something to do, so it must not hide what
comes next. Nightclub popularity is rarely checked in game, yet it cuts the safe's payout, so it
gets a place in the strip rather than a list item: as an event it would almost always be due,
since it falls below the top payout within a day of being maxed. The shape came from the
trackers that exist; each one fills it from its own logic, so the Overview's numbers are the
cards' numbers.
