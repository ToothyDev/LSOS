# 025: Bunker staff assignment

2026-10-15, issue #33. Builds on decisions 011, 012 and 013.

## Decision

- **A choice upgrade on the Bunker:** "Staff on" Manufacturing (default), Both or Research
  (`staff-assignment` in `src/data/properties.ts`). Saved like any choice, so no migration.
- **A stock share, not separate rates:** `staffSplit` in `src/data/production.ts` gives the share
  of the work that makes stock per option: Both 0.5, Research 0. `matchingRate` applies it on top
  of the manufacturing rate for the bought upgrades, so the four sourced rates stay the only ones.
  Both then makes 1 unit every 20 / 17 / 14 minutes, as gta.wiki lists for the split.
- **Supply use is the same whatever the staff work on (est.):** no source gives it. Research is
  taken to use supplies as fast as manufacturing, so supplies last as long on every option, Both
  makes half the stock from a bar and Research none. The bars and countdowns say "(est.)" on Both
  and Research, and the card explains the rule.
- **Research on its own** never fills the stock: the card counts down to supplies out only.
- **Research progress is not tracked:** no project bar, "done in" or "Project finished" event.
  Only its effect on supplies and stock matters here.
- **Not modelled:** whether staff on Both keep researching once the stock is full. Production
  stops at full stock, as on Manufacturing.

## Why

The supply use is what decides when to resupply and sell. A share on the existing rates covers
both options without inventing rates per upgrade level, and keeps the estimate to one stated
rule.
