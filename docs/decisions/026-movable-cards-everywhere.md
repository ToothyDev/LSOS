# 026: Movable cards on every card tab, easier to swap

2026-10-15, issue #51. Builds on decision 014.

## Decision

- **Shared grid.** The drag and keyboard moving of decision 014 lives in `ui/CardGrid`, which
  renders each card through a snippet and hands it the title bar handlers (`Panel`'s `move`).
  Businesses, Safes (Money Fronts and the property safes) and Timers use it. Settings stays
  fixed (its panels are not cards to compare), and the Overview is lists, not cards.
- **Title bar only.** A card is picked up by its title bar, with mouse, pen and touch alike;
  the rest of the card keeps its text selectable and its controls undisturbed (issue #51
  review: grabbing anywhere got in the way of both). It lifts only after 4 px of travel, so a
  click on the title bar stays a click.
- **Swap by where the card is.** A swap is decided by the middle of the dragged card, not the
  pointer: held by its title bar, a card hangs far below the pointer, so the pointer often sat
  on a border while the card already covered its target. The middle must be 10% in from each
  side of the other card (was 20%), which still leaves a band where neither swap applies, so
  the cards do not flick back and forth.
- **Saved state** (version 13): `safeOrder` and `timerOrder`, lists of card ids like
  `businessOrder`. Safe cards use property ids (the car wash for Money Fronts), timer cards
  `lucky-wheel` and `mansion`, the same ids the Overview links scroll to.

## Why

Issue #51: only business cards moved, and they were hard to swap.
One grid component keeps the three tabs behaving alike; it came from three real cases.
