# Decisions

One file per decision: `NNN-short-name.md` with the date, the decision and **why**. Code and docs
cite decisions by number ("decision 003"). Numbers are never reused or renumbered.

**Adding one:** read this whole index first so nothing is duplicated or contradicted, take the next
free number, add one line below. **Replacing one:** write a new decision, then mark the old line
`(replaced by NNN)` here and in the old file's header. Never delete a decision.

**Finding one:** search this index for two or three keywords, then open only the matching file.

## Index

- [001](001-static-site.md) Static site, all user data in browser storage, no backend or accounts
- [002](002-stack.md) Svelte 5 + TypeScript + Vite, Vitest for tests, Prettier for formatting
- [003](003-time-model.md) Two clocks: play time (only while LSOS is open and not paused) and real time (session play time: 008)
- [004](004-game-data.md) Every game value lives in `src/data/` with a source; never guessed (amended by 013)
- [005](005-weekly-data.md) Weekly events come from a JSON file updated by PR, not a live API
- [006](006-persisted-state.md) Persisted state is versioned, migrated on load, exportable as JSON
- [007](007-state-store.md) State store: unreadable data blocks saving like a newer version; import overrides
- [008](008-clock-details.md) Clock details: session play time, opens paused (setting), throttled ticks counted, long gaps asked about
- [009](009-terminal-design.md) Terminal look: tokens in `app.css`, self-hosted Oswald (OFL), browser-style tabs, base components in `src/components/ui/`
- [010](010-resync.md) Resync: `EditableValue` for every tracked value, `BusinessBars` with Sold/Raided/Full and supply deliveries, undo keeps progress since, five-segment bars you can drag (duration format amended by 022)
- [011](011-owned-properties.md) Owned properties and upgrades: catalog in `src/data/properties.ts`, toggle/choice upgrades (count: 016), Settings panel and Businesses gear
- [012](012-business-production.md) Business production: rate per exact upgrade combination in `src/data/production.ts`, continuous on play time, unknown rates do not run
- [013](013-marked-estimates.md) Missing game values may be estimated by a stated rule from sourced ones, marked "(est.)" wherever shown
- [014](014-card-order.md) Business cards: drag a title bar to lift a card and swap it with another, or move it with arrow keys; order saved as property ids
- [015](015-nightclub-warehouse.md) Nightclub warehouse: goods per technician on play time, saved in crates, unlocked by owning the business, best technician setup by value per hour
- [016](016-safes.md) Safes tab: Nightclub, Agency, Arcade, Salvage Yard, Garment Factory paid per in-game day of play time, nightclub popularity with estimated loss and boosts
- [017](017-production-boost.md) Acid Lab: optional far sale, value bonus (named product), no raids; production boost by units made or 24 real hours, once a day
- [018](018-money-fronts.md) Money Fronts: one Car Wash safe card on the Safes tab, paid by the fronts and other businesses, heat per front (est.), missions and legal jobs
- [019](019-owned-value-bonus.md) Money Front value bonus: owning Car Wash or Smoke on the Water adds 35% to Counterfeit Cash or Weed, far value adds the bonuses (est.), Helitours left out
- [020](020-shut-down.md) Shut-down businesses: a Running/Shut down button next to Owned for biker businesses and the Bunker; shutting down clears the stock; no production, card greyed, nightclub goods locked, nothing to the Money Fronts safe
- [021](021-no-heist-tracker.md) No heist cooldown tracker: only Cayo Perico has one worth a timer; Heists tab removed
- [022](022-real-time-timers.md) Timers tab on real time: Lucky Wheel (24 h) and Mansion production boost (×3 for 24 h, 24 h cooldown, not the same business twice in a row; with the Acid Lab boost: est.)
- [023](023-overview.md) Overview tab: trackers give a shared `NextEvent`, due first then soonest, supplies on their way counted in the forecast, links that scroll to the card, quick actions with undo on every ready item, popularity in view; alerts as pop-ups and/or notifications, set time ahead
- [024](024-several-tabs.md) Several tabs: a tab takes the state another tab saves (`storage` event); only the tab that last started counting counts play time (`BroadcastChannel`)
- [025](025-bunker-staff.md) Bunker staff on Manufacturing, Both or Research: a stock share (Both 0.5, Research 0) on the sourced rates, supplies used as fast on every option (est.), research progress not tracked
- [026](026-movable-cards-everywhere.md) Movable cards on Businesses, Safes and Timers (`ui/CardGrid`): grab anywhere but controls with mouse/pen, title bar on touch; swap by the dragged card's middle, 10% in; orders saved per tab
