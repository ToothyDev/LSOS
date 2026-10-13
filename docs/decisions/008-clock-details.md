# 008: Clock details: gap threshold, saved pause, time marks

2026-10-13, issue #2

## Decision

Builds on decision 003. Code: `src/lib/clock.ts` (logic), `src/lib/clock.svelte.ts` (timers and
browser events), `src/components/ClockBar.svelte` (indicator and toggle).

- **Gaps over 5 minutes are dropped whole**, not capped. Chrome's intensive throttling fires
  hidden-tab timers once a minute, aligned to the minute, so real gaps can approach two minutes;
  five leaves room for a busy machine. A gap that long is almost always sleep or a frozen tab,
  where counting even part of it would be wrong. Negative gaps (system clock set back) count zero.
- **The pause setting is saved.** Reopening a paused LSOS stays paused, so time is never counted
  by surprise; the indicator shows it. The time of the last tick is not saved, so closed time is
  never counted.
- **The clock ticks on `visibilitychange` and `pagehide` too**, then saves, so closing a throttled
  background tab does not lose up to a minute of play.
- **Trackers ask for elapsed time with a `TimeMark`** (`{ playMs, realMs }` taken with
  `markNow`) and `elapsedSince(mark, clock, now)`. A tracker stores the mark when its value is
  set or resynced and computes progress from it, so trackers need no ticking of their own.

## Why

Play time is the base of most estimates; overcounting is worse than undercounting because a user
sees a full business that is not full. Each choice above errs toward not counting.
