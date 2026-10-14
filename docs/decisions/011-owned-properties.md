# 011: Owned properties and upgrades

2026-10-14, issue #5. Builds on decisions 004 and 006.

## Decision

- **Catalog:** `src/data/properties.ts` lists the properties LSOS supports, each with a stable
  `id` (saved in user data, never changed or reused), a label, its upgrades and a source. It
  starts empty: each tracker issue adds its own property with sourced upgrades.
- **Two kinds of upgrade:** `toggle` (bought or not, e.g. an equipment or staff upgrade) and
  `choice` (one of several options, the first being the default, e.g. what a nightclub
  technician is assigned to, with "not hired" first). Several technicians are several choices.
- **Saved state** (version 3): `properties` maps a property id to `{ owned, upgrades }`, where an
  upgrade is saved as `true`/`false` or the chosen option id. A missing entry means not owned,
  no upgrades. Unchecking "owned" keeps the upgrades, so owning it again restores them. Entries
  for ids the catalog does not list are kept; a saved value that no longer fits its upgrade
  reads as the default. Logic: `src/lib/properties.ts`.
- **UI:** Settings has a Properties panel with every catalog entry: the name as the row label and
  a toggle button next to it, "Owned" (accent, filled) or "Not owned" (muted, outlined), with
  `aria-pressed` and the name as its accessible label, so the state reads at a glance (issue
  #31; it replaced an "Own <name>" checkbox). Upgrades appear once owned. The Businesses tab shows only owned properties, each panel with a gear
  button that opens the same settings in place; closed, it summarises the bought upgrades.
  Both components take the catalog as a prop, so `#/kit` previews them with sample entries.

## Why

Production rates depend on ownership and upgrades, so trackers need them, and users must be
able to change them where they look at a business as well as in Settings. Two kinds cover every
upgrade named in the issue without a separate shape per business. Keeping upgrades on sale and
unknown ids on load avoids throwing away user input over a misclick or a catalog change.
