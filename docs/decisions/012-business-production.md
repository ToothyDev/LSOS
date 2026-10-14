# 012: Business production on play time

2026-10-14, issue #6. Builds on decisions 003, 004, 010 and 011.

## Decision

- **Data** (`src/data/production.ts`): per business, its unit name, stock capacity, far-sale
  bonus and one rate per upgrade combination: minutes per unit, value of one unit sold nearby,
  and units one full supply bar makes. A rate applies only to exactly the upgrades it lists.
  Combinations the source does not cover are left out, and supply use may be missing on its own.
- **Saved state** (version 4): `businesses` maps a property id to its bars in percent, the same
  `Bars` that `BusinessBars` edits, including a supply delivery on its way. A business without an
  entry starts empty.
- **Production is continuous** on play time (`src/lib/production.ts`): stock rises and supplies
  fall at a steady rate until stock is full or supplies run out. The game makes whole units, so
  the stock count and value shown are rounded down to whole units. Bars stay in percent so the
  user can resync them in the unit the game shows.
- **Unknown stays unknown:** if there is no rate for the bought upgrades, or its supply use is
  not known, nothing moves on its own; the card says so and the bars can still be set by hand.
  The value is shown whenever the rate is known.
- **Deliveries during a stretch of play time** count from their arrival: the stretch is taken to
  end at the wall-clock time it is reported, so production before the arrival uses the old
  supplies and after it the new ones. Exact for normal ticks; for a long confirmed gap it is the
  best guess LSOS has.
- **Wiring** (`src/lib/production.svelte.ts`) adds every play-time stretch to each owned business
  with a running rate.
- **Cards start collapsed:** stock meter (units and percent), supplies meter, value (nearby and
  far on one line) and one play-time countdown, whichever comes first: "Full in" or "Supplies
  out in" (the other cannot happen before it). A delivery on its way shows too. "Edit" in the
  card footer swaps the meters for `BusinessBars`, whose actions (Full, Supplies bought, Sold,
  Raided, Undo) share one row. Which card is open lasts for the session only.
- Bunker staff are taken to be on manufacturing only; research and the split are issue #33.

## Why

A rate per exact upgrade combination matches how the wiki lists them and leaves no room to
guess an unlisted combination from the others. Continuous production keeps the maths and
resync simple; whole units for value match what a sale pays.
