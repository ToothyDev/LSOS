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
- [004](004-game-data.md) Every game value lives in `src/data/` with a source; never guessed
- [005](005-weekly-data.md) Weekly events come from a JSON file updated by PR, not a live API
- [006](006-persisted-state.md) Persisted state is versioned, migrated on load, exportable as JSON
- [007](007-state-store.md) State store: unreadable data blocks saving like a newer version; import overrides
- [008](008-clock-details.md) Clock details: session play time, opens paused (setting), throttled ticks counted, long gaps asked about
