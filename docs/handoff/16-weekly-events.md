# 16: Weekly events: data file, Weekly tab and Breaking News bar

**Status:** scope, source and still-running list decided (decision 027); no code yet.

## Goal

Show this week's GTA Online events from a committed `public/weekly.json` ([#16]): a typed,
validated schema, a Weekly tab, a Breaking News bar on every tab, a stale-data notice, and a
short guide on writing a week's file by hand. The routine that writes the file is #17, not this
PR.

[#16]: https://github.com/ToothyDev/LSOS/issues/16

## Read first (only these)

- Issue #16 (body)
- Decision 005 and 027
- `src/lib/tabs.ts` (the `weekly` tab id already exists) and the tab switch in `src/App.svelte`
- `src/lib/clock.ts` for how `now` reaches logic (decision 003, 008)
- One existing `src/data/` file with sources, e.g. `src/data/timers.ts`, for the comment style
- gta.wiki page "Halloween 2026 (Week 3)" wikitext as the sample week (API URL in decision 027)

## State now

Only docs: decision 027 and this handoff. The maintainer's answers:

- Multipliers, Weekly Challenge, rotations, discounts, gifts and one-offs: in.
- GTA+: "honestly no, screw GTA+". Leave all of it out.
- Daily map-bound items (Gun Van location, daily time trials): out; "not sure i wanna make a
  whole map widget for it".
- Still-running seasonal activities (Ghosts Exposed, Phantom Car, ...): "add them but slightly
  more out of the way than the actual weekly events".
- Reset time: "pick what fits best" (picked: explicit instants, written as Thursday 2:00 AM US
  Pacific; decision 027).

## Findings

Sample week, gta.wiki "Halloween 2026 (Week 3)", 2026-10-15 to 2026-10-21. Its headings, which
the schema can mirror:

- `Job Updates`: Salvage Yard vehicles (BF Weevil, Grotti Itali RSX, Albany Fränken Stange),
  Kortz Center paintings, list of returning seasonal events.
- `Bonuses`: one-offs (complete "Don't Fuck With Dre" this week: GTA$500,000 within 72 hours;
  all Weekly Challenges through November 4: GTA$2,000,000; free T-shirt), `Weekly Challenge`
  (win 3 races: GTA$100,000), `FIB Priority File` (The Brute Force File), `Standard Bonuses`
  (podium LSCM Cheetah Classic, Prize Ride Kanjo SJ, Test Rides, showrooms, Gun Van stock,
  then lines like "3x GTA$ and RP from Slasher" and "2x GTA$ and RP from Dispatch Work").
- `Discounts`: vehicles ("Albany Brigham – 40% off", some with a trade price too), properties
  ("Agencies including upgrades and modifications – 40% off"), Gun Van weapons (FREE, 30% off).
- `Races and Time Trials`: Premium Race, Time Trial, HSW Time Trial (keep); Junk Energy and RC
  Time Trials per day (drop).
- The Enhanced-only section (HSW) is the only console split on the page; LSOS ignores Legacy
  (CLAUDE.md non-goals), so HSW items can be kept without a platform flag.
- A multiplier names an activity; some match owned things (Bail Office bounties, business
  sales, Business Battles). The Breaking News bar should rank those first; how to match an
  activity to a property id is still to design (perhaps an optional `property` id per entry).

## Next steps

1. Schema in `src/lib/weekly.ts`: types plus a validator (pure TS, unit-tested) that rejects a
   malformed file; staleness from `start`/`end` and an injected `now`.
2. A first `public/weekly.json` for 2026-10-15 to 2026-10-22 from the sample page.
3. Weekly tab: grouped sections in the page's order (multipliers, challenge, gifts, rotations,
   discounts), then a less prominent "Also running" list (collapsed or muted) at the bottom.
4. Breaking News bar on every tab: multipliers and gifts, owned matches first; stale notice
   when `now >= end`.
5. Contributor section on writing a week by hand (in the PR or `docs/`).
6. `npm run verify`, then the `finish-pr` skill.

## Open questions

- Exact reset time is not officially sourced; check once against a real reset.
