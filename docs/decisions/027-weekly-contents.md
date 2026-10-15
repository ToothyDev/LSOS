# 027: Weekly events: one typed file per week, its contents, week and source

2026-10-15, issue #16 (format) and #17 (routine). Builds on decision 005.

## Decision

- **One typed TypeScript file, not JSON.** The week is `WEEK` in `src/data/weekly.ts`, typed by
  `Week` in `src/lib/weekly.ts`, and bundled with the site. The type checker is the schema, and
  a unit test runs `weekProblems` on it (dates in order, factors above 1, discounts 1 to 100%,
  known property ids, a gta.wiki source), so `npm run verify` and CI reject a bad week before it
  merges. No fetch, loading state or runtime validator. This replaces the `public/weekly.json`
  of issue #16; decision 005 (a committed file, updated by pull request) still holds. Most
  entries are plain strings, copied as the wiki words them; only what the UI sorts or groups
  by has fields (a multiplier's factor and property, a discount's kind and percent).
- **Contents**, per week:
  - **Money multipliers**: activity, factor (2x, 3x, ...), what it pays (GTA$, RP or both).
  - **Weekly Challenge**: the objective and its reward.
  - **Rotations**: Salvage Yard robbery vehicles, FIB Priority File, Kortz Center paintings,
    Lucky Wheel podium vehicle, Prize Ride (vehicle and condition), LS Car Meet Test Rides,
    Luxury Autos and Premium Deluxe Motorsport showrooms, Gun Van weapon stock, Premium Race,
    Time Trial, HSW Time Trial and HSW Premium Test Ride.
  - **Discounts**: vehicles, properties and Gun Van weapons, each with its percentage (free = 100).
  - **Gifts and one-off bonuses**: free items, and rewards for doing something this week
    (e.g. "complete X, get GTA$500,000 within 72 hours"), with any deadline.
  - **Still running**: seasonal activities carried over from earlier weeks without a bonus
    this week (e.g. Ghosts Exposed, Phantom Car), names only. Shown below the week's events,
    more out of the way (e.g. a collapsed or muted "Also running" list), and never in the
    Breaking News bar.
  - **Week**: start and end as exact UTC instants, plus the source link.
- **Left out:**
  - **GTA+**: no member-only multipliers, discounts or monthly benefits. Where an entry has a
    separate GTA+ value (e.g. "3x, 6x for GTA+"), only the standard value is kept.
  - **Daily, map-bound rotations**: the Gun Van's location, and the daily Junk Energy and RC
    Time Trials. They change every day and only make sense on a map, which LSOS does not have.
    The Gun Van's weekly stock and discounts stay (they are not tied to a place).
- **Shown** on the Weekly tab (bonus payouts with owned ones first, challenge and gifts,
  rotation, discounts by vehicles, properties and Gun Van; then a collapsed "Also running" list)
  and in a Breaking News bar on every tab (multipliers, then gifts; links to the Weekly tab).
  The Weekly panels keep a fixed order: unlike the business cards, there is nothing to compare
  between them. A multiplier names its `property` id when it pays through one (e.g. bounties
  through the Bail Office), so owners see it first.
- **Out of date:** once `now >= end` the bar says the weekly events are out of date and the tab
  shows a warning over dimmed panels, instead of old bonuses as current.
- **The week** runs Thursday to the next Thursday. The file stores explicit `start` and `end`
  instants and the site uses only those (staleness: `now >= end`), never a weekday rule: some
  events ran 12 to 14 days (gta.wiki, Lucky Wheel). Instants are written as Thursday 2:00 AM US
  Pacific time: 09:00 UTC while the US is on daylight saving time, 10:00 UTC otherwise.
  Community guides give this time; no official source states it, so it is a convention for
  writing the file, not a game fact used in logic.
- **Source: gta.wiki**, the weekly event page (`Category:Weekly events`, infobox
  `type = weeklyevent`, e.g. "Halloween 2026 (Week 3)"). The routine reads its wikitext through
  the MediaWiki API (`https://gta.wiki/api.php?action=parse&page=<title>&prop=wikitext&format=json`).
  The page's Rockstar Newswire link is kept as a second link in the file.
- **Routine time** (#17): Thursday late afternoon, about 16:00 UTC, so the wiki page is complete.

## Why

- The contents are the ones that matter to someone planning a session's money; GTA+ and map
  widgets were declined for this project.
- gta.wiki is trusted for game facts (CLAUDE.md) and its weekly pages list every category above
  under fixed headings, with a previous and next week link. The Rockstar Newswire needs
  JavaScript to show its text, its API was not reachable from the cloud environment, and it
  often posts one article for a whole month of weeks.
- Timing seen on 2026-10-15: the week's wiki page was created on 2026-10-14 at 23:53 UTC (before
  the reset, likely from leaks) and its Gun Van, Salvage Yard and Prize Ride parts were filled in
  between 11:52 and 11:57 UTC on Thursday. A run right after the reset would miss them.
