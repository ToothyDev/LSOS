# 008: Clock details: session play time, start paused, throttling and frozen tabs

2026-10-13, issue #2. Changes one point of decision 003 (play time is no longer kept between
sessions).

## Decision

Builds on decision 003. Code: `src/lib/clock.ts` (logic), `src/lib/clock.svelte.ts` (timers,
browser events, listeners), `src/components/ClockBar.svelte` (indicator, toggle, gap prompt).

- **Play time lasts one session.** It starts at zero each time LSOS opens and is not saved.
  Trackers keep their own saved progress, so a running total across sessions adds nothing.
- **Trackers get play time as it is counted**: `onPlayTime(listener)` calls the listener with
  each counted stretch (every tick, on pause, on close, and when a long gap is confirmed), and
  the tracker adds it to its saved progress. Real-time trackers store a wall-clock time and use
  `realElapsed(sinceMs, now)`.
- **LSOS opens paused** unless "Start tracking play time when LSOS opens" is on in Settings
  (`clock.trackOnOpen`, saved, off by default). Opening LSOS without playing then counts nothing.
  While paused, the clock bar says to press Start once loaded into a GTA Online session, not
  during loading screens: per the maintainer, that is close to when the game starts counting.
- **Throttled ticks lose nothing.** Each tick adds the time since the previous one, so a hidden
  tab ticking once a minute (Chrome's intensive throttling, typical while a fullscreen game
  covers the browser) still counts every second.
- **Gaps up to 5 minutes count; longer gaps are asked about.** Throttled gaps stay under about
  two minutes. Longer ones come from the browser freezing the tab (Chrome Energy Saver freezes
  tabs hidden for over five minutes) or the computer sleeping. The first happens while the user
  plays, the second does not, and the page cannot tell them apart. So long gaps add up and a
  prompt asks "Were you playing?" with "Count it" and "Skip". Until answered nothing is counted.
  Negative gaps (clock set back) count zero.
- **The page saves when hidden or frozen** (`visibilitychange`, `freeze`), so trackers' progress
  survives a tab the browser discards without another event. `saveNow` writes the current state
  directly because the save effect would run too late. A discarded tab reloads as a new session.
- **Leaving the page** (`pagehide`) counts up to that moment and stops measuring, so time away
  is not counted if the page returns from the back/forward cache. `visibilitychange` fires after
  `pagehide` and must not restart the clock.

## Why

Play time drives most estimates, and browsers throttle or freeze background tabs exactly when the
user is gaming. Guessing either way is wrong in one of the cases, so LSOS counts what it can prove
and asks about the rest. Starting paused errs the same way: nothing is counted until the user
says they are playing.
