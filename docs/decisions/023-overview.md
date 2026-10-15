# 023: Overview tab: every tracker's next event in one list, made for a second screen

2026-10-15, issue #15. Builds on decisions 003, 012, 013, 015, 016, 017, 018 and 022.

## Decision

- **Shared shape:** each tracker gives its next events as `NextEvent` (`src/lib/events.ts`): what
  happens, where, the time left and on which clock (play or real), whether it is good or bad news
  once due, the action to take, the bar that moves toward it, the money waiting and whether it
  rests on an estimate. The trackers build them: `productionEvents`, `goodsEvents`, `safeEvents`,
  `frontsEvents`, `timerEvents`. `src/lib/overview.ts` only gathers and sorts them; the Overview
  knows nothing else of a tracker.
- **Events:** per running business with a known rate, whichever comes first: stock full (Sell) or
  supplies out (Resupply), or "Supplies arrive" while bought supplies are on their way. The Acid
  Lab boost and the Mansion boost when they can be started; the Lucky Wheel spin; each nightclub
  goods type a technician makes, when full; each owned safe, when full; the Money Fronts safe,
  when full, and the Car Wash at max heat, as the safe card shows them. Nightclub popularity is
  left out: it falls below the top payout within a day of being maxed, so it would always be due.
- **Order:** due items first, bad news (something stopped) before good news, then the rest by
  time left. Play and real time are compared directly: they run at the same pace while playing.
- **Layout, made to stay open on a 1080p second screen without scrolling:** a strip with the
  number of items ready and the money waiting (business stock at the value the cards show,
  nightclub goods, safes, total); "Ready now" as large cards with the action first; "Coming up"
  as one line per item (time, name, bar, value) in two columns. Every item links to the tab where
  it is handled. While play time is paused, play-time countdowns turn grey and the heading says
  they wait for Start.
- **Notifications:** opt-in in Settings ("Alerts"). The browser is asked for permission when the
  box is ticked. One notification per item that becomes due while the LSOS page is not focused;
  items already due when LSOS opens, or when notifications are turned on, do not notify.
- **Saved state** (version 12): `alerts: { notify }`, false by default.

## Why

A player glancing at a second screen wants three answers: what to do now, what comes next and
how much money is waiting. Actions as verbs ("Sell", "Resupply", "Collect") answer the first
without reading further. The shape came from the trackers that exist; each one fills it from its
own logic, so the Overview's numbers are the cards' numbers. Quick actions on the Overview (mark
sold, collected, spun) are left for later: they need each tracker's undo and resync rules.
