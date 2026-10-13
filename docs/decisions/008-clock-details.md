# 008: Clock details: throttling, frozen tabs, saved pause, time marks

2026-10-13, issue #2

## Decision

Builds on decision 003. Code: `src/lib/clock.ts` (logic), `src/lib/clock.svelte.ts` (timers and
browser events), `src/components/ClockBar.svelte` (indicator, toggle, gap prompt).

- **Throttled ticks lose nothing.** Each tick adds the time since the previous one, so a hidden
  tab ticking once a minute (Chrome's intensive throttling, typical while a fullscreen game
  covers the browser) still counts every second.
- **Gaps up to 5 minutes count; longer gaps are asked about.** Throttled gaps stay under about
  two minutes. Longer ones come from the browser freezing the tab (Chrome Energy Saver freezes
  tabs hidden for over five minutes), discarding it (Memory Saver), or the computer sleeping.
  The first two happen while the user plays, the last does not, and the page cannot tell them
  apart. So long gaps add up in `unconfirmedMs` and a prompt asks "Were you playing?" with
  "Count it" and "Skip". Until answered nothing is counted. Negative gaps (clock set back) count
  zero.
- **The last tick is saved** (`lastTickMs`), so a tab the browser discarded and reloaded
  continues where it left off (short gap counted, long gap asked about). A normal close
  (`pagehide`) clears it, so time with LSOS closed never counts. `visibilitychange` fires after
  `pagehide` and must not restart the clock.
- **The page saves when hidden or frozen** (`visibilitychange`, `freeze`), since a frozen tab
  may be discarded without another event. `saveNow` writes the current state directly because
  the save effect would run too late.
- **The pause setting is saved.** Reopening a paused LSOS stays paused, so time is never counted
  by surprise; the indicator shows it.
- **Trackers ask for elapsed time with a `TimeMark`** (`{ playMs, realMs }` taken with
  `markNow`) and `elapsedSince(mark, clock, now)`. A tracker stores the mark when its value is
  set or resynced and computes progress from it, so trackers need no ticking of their own.

## Why

Play time is the base of most estimates, and browsers throttle or freeze background tabs exactly
when the user is gaming. Guessing either way is wrong in one of the cases, so LSOS counts what
it can prove and asks about the rest.
