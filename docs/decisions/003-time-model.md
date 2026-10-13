# 003: Two clocks, play time and real time

2026-10-13, project bootstrap

## Decision

LSOS cannot see the game, so it estimates progress from time. There are two clocks:

- **Play time** advances only while LSOS is open **and** the user has not paused tracking.
  The maintainer's model is "keep LSOS open as long as you play". Anything that only progresses
  while you are in a GTA Online session (business production, nightclub goods, safes that fill
  per in-game day) runs on play time.
- **Real time** is the wall clock and always runs, even with LSOS closed. Anything with a
  real-world cooldown (e.g. the Lucky Wheel) runs on real time.

Each tracker declares which clock it uses, and the data for it cites why (decision 004).

## How play time is measured

- Never count ticks. On each tick, add the time elapsed since the previous tick
  (`now - lastTick`). Browsers throttle timers in background tabs, so tick counts lie but
  timestamps do not.
- If the gap between two ticks is too large to be throttling (e.g. the computer slept), it is not
  counted. The exact threshold is set when the clock is built and must exceed browser background
  throttling (about one minute).
- Closing the tab stops play time. Reopening resumes from the saved total.
- A pause toggle covers "LSOS open, but not playing".

## Resync

Estimates drift. Every tracked value can be edited by hand ("resync"); editing sets the value as
of now and the clock continues from there.

## Testing

Logic takes the current time as a parameter (or an injected clock), never calls `Date.now()`
directly, so tests are deterministic and never wait on real timers.
