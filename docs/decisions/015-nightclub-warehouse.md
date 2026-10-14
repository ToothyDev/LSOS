# 015: Nightclub warehouse goods

2026-10-14, issue #7. Builds on decisions 004, 011, 012 and 013.

## Decision

- **Data** (`src/data/nightclub.ts`): the seven goods types with value per crate, capacity with
  one and five floors and minutes per crate without and with the Equipment Upgrade, all from
  gta.wiki (Nightclubs/Warehouse Management). Each lists the properties that unlock it; Cargo
  and Shipments is unlocked by the Hangar or the Special Cargo Warehouse, which join the
  catalog as owned/not owned only.
- **Settings:** the Nightclub property has Equipment (toggle), Warehouse floors (choice 1 to 5)
  and five technician choices ("Not assigned"/"Not hired", then each goods type). Staff and
  security upgrades do not change goods: left out.
- **Only ownership is needed.** The source says technicians need no supplies, so goods do not
  depend on the linked business's stock or supplies. Goods whose business is not owned do not
  run and the card says "Locked". Two technicians on one type count once (the game allows one).
- **Saved state** (version 6): `nightclub` maps a goods id to crates, fractions included. Crates,
  not percent, so changing the floors keeps the count the game shows. Stock above the capacity
  (fewer floors set) stays until changed.
- **Production is continuous** on play time, like decision 012; count and value use whole crates.
- **Capacity for 2 to 4 floors is an estimate** (decision 013): every floor holds as much as the
  first, as the source's one- and five-floor numbers (exactly five times) suggest. The source's
  "each subsequent floor doubles that storage capacity" contradicts its own table and is not used. Open question: issue #35.
- **UI:** collapsed, the card shows a row per goods type that is being made or has stock: bar,
  crates and value, and "Full in" (play time); the next to fill gets an accent edge and "Next
  full in". A total value follows. "Edit" lists all seven types as `EditableValue` fields in
  crates, with Sold and Full, so goods from Business Battles can be entered too.

## Why

Crates match what the game shows per goods type and survive a change of floors. Listing the
unlocking properties keeps the rule ("owns the business") in data with its source.
