# 022: Timers tab: Lucky Wheel and Mansion boost on real time

2026-10-15, issues #13 and #14. Builds on decisions 003, 010, 012 and 017.

## Decision

- A **Timers** tab holds cooldowns that run on **real time** (decision 003), also while LSOS is
  closed. Values and sources are in `src/data/timers.ts`; the logic is in `src/lib/timers.ts`.
- **Lucky Wheel:** "Spun" starts a 24-hour real-time countdown to the next spin. The extra daily
  GTA+ spin is left out because no source says how it is timed.
- **Mansion boost:** the Mansion is an owned property with no card (decision 011), and the boost
  card shows only while you own one. You pick an eligible business that is owned and running,
  then press "Activated". That business makes stock 3× as fast for 24 real hours. The next boost
  can start 24 real hours after the last one started (gta.wiki, Mansions), and never on the same
  business twice in a row.
- **Production:** `produceAll` cuts a play-time stretch at the boost's real-time start and end,
  the same way it cuts at the Acid Lab boost (decision 017), and runs the boosted business at its
  rate ÷ 3. Supplies per unit stay the same, so they run out 3× as fast. The business card shows
  the time left on the boost, and its forecast counts that time as play time.
- **With the Acid Lab's own boost:** no source gives the combined speed, so LSOS takes the
  boosted rate ÷ 3 and marks the production numbers "(est.)" while both are on (decision 013).
- Both countdowns can be corrected as "time left" (decision 010). A `duration` value now shows
  as h:mm:ss like every `Countdown`, so it visibly ticks. It accepts h:mm, h:mm:ss, "5h 30m", or
  plain minutes. After "Spun" or "Activated", an Undo button for that press shows in the card's
  footer strip. It restores the previous value, including the last boost the back-to-back rule
  needs.
- **Saved state** (version 11): `timers` has `luckyWheelSpunAt` and `mansionBoost`
  (`propertyId`, `startedAt`). Each is left out until first used.

## Why

These cooldowns don't depend on play, and a separate tab keeps them apart from the play-time
trackers. One community guide puts the Mansion boost's reset at the daily server reset
(6:00 UTC). gta.wiki says 24 real hours, and gta.wiki is the trusted source. The boost is saved
with the Timers state rather than in `boosts`, because it belongs to the Mansion and not to the
business it speeds up.
