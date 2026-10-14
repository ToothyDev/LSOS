# 014: Business cards in the user's order

2026-10-14, issue #30. Builds on decisions 006 and 009.

## Decision

- **The title bar is the handle.** `Panel` takes an optional `move` prop: its title bar (with the
  dot grips of the in-game cards) becomes a focusable handle with a grab cursor. The Businesses
  tab passes it for every card; other panels stay fixed.
- **Pointer drag** (mouse, pen and touch alike, through pointer events), like moving apps on a
  phone: pressing the handle lifts the card, which then sticks to the pointer while its slot
  stays outlined. Over another card, the two swap: that card slides into the empty slot and
  nothing else moves (`swapAt`; issue #30 review: shifting every card in between made them race
  along the rows like one long list). A swap needs the pointer in the middle of the other
  card (20% in from each side, `cardAt`), measured where cards end up rather than mid-slide, so
  a pointer resting on a border does not flick the cards back and forth. Releasing saves the
  order and the card glides into its slot; a cancelled pointer leaves the order as it was. The handle has `touch-action: none`, so
  a touch that starts on a title bar drags instead of scrolling.
- **Keyboard:** with the handle focused, arrow keys move the card one place back or forward
  (reading order, since the grid wraps), Home/End to the first or last place. A polite live
  region says where it went, and focus stays on the handle.
- **Saved state** (version 5): `businessOrder`, a list of property ids. Shown cards follow it;
  owned businesses it does not list (e.g. bought later) come after in catalog order. Ids of
  businesses not owned now are kept at the end, so owning one again does not lose it.
  Logic: `src/lib/order.ts`.

## Why

Not everyone cares about every business equally, and the in-game card titles already look like
drag handles. Pointer events cover touch without a second code path, unlike HTML drag and drop.
Saving ids rather than positions keeps the order stable when businesses are bought or sold.
