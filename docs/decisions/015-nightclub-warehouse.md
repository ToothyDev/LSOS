# 015: Nightclub warehouse goods

2026-10-14, issue #7. Builds on decisions 004, 011, 012 and 013.

## Decision

- **Data** (`src/data/nightclub.ts`): the seven goods types with value per crate, crates per
  warehouse floor and minutes per crate without and with the Equipment Upgrade, from gta.wiki
  (Nightclubs/Warehouse Management). Each lists the properties that unlock it; Cargo and
  Shipments is unlocked by the Hangar or the Special Cargo Warehouse, which join the catalog as
  owned/not owned only, with no card on the Businesses tab (`card: false`).
- **Settings:** the Nightclub property has Equipment (toggle), Warehouse floors (choice 1 to 5)
  and five technician choices ("Not assigned"/"Not hired", then each goods type). Staff and
  security upgrades do not change goods: left out.
- **Only ownership is needed.** The source says technicians need no supplies, so goods do not
  depend on the linked business's stock or supplies. Goods whose business is not owned do not
  run and the card says "Locked". Two technicians on one type count once (the game allows one).
  A shut-down business locks its goods too (decision 020).
- **Saved state** (version 6): `nightclub` maps a goods id to crates, fractions included. Crates,
  not percent, so changing the floors keeps the count the game shows. Stock above the capacity
  (fewer floors set) stays until changed.
- **Production is continuous** on play time, like decision 012; count and value use whole crates.
- **Every floor holds the same:** the source gives 1 and 5 floors (exactly five times as much);
  2 to 4 floors were confirmed in game (issue #35). The source's "each subsequent floor doubles
  that storage capacity" contradicts its own table and is not used.
- **UI:** collapsed, the card shows two lines per goods type that is being made or has stock:
  name with crates and value, then the bar with its play time to full under one "Full in"
  header ("Full", or "Idle" when no technician makes it). The next to fill gets an accent edge.
  A total value follows. Technicians are left out of the card's upgrade summary, as the rows
  show them. "Edit" lists all seven types as `EditableValue` fields in crates, with Sold and
  Full, so goods from Business Battles can be entered too.
- **Best setup:** goods are ranked by value per hour of play time (value per crate over time
  per crate, the source's own "value per hour" column). The card suggests putting the available
  technicians (Yohan, plus those hired; it never hires) on the best unlocked goods that are not
  full, keeping technicians already on one of them, and shows the gain per hour with an Apply
  button ("Move"). Full goods earn nothing, so a full type frees its technician: the card says
  "<goods> is full. Sell it, or move technician N to <goods>", or only "Sell it" when there is
  nothing better to move to.

## Why

Crates match what the game shows per goods type and survive a change of floors. Listing the
unlocking properties keeps the rule ("owns the business") in data with its source.
