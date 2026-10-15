# 017: Acid Lab and production boosts

2026-10-15, issue #9. Builds on decisions 010, 011 and 012.

## Decision

- **Acid Lab** runs on the business production of decision 012: one rate without and one with
  the equipment upgrade, all values sourced. Supply use with the upgrade comes from the cost to
  fill the lab (GTABoom: $96,000, 1.6 full bars at $60,000), not from an estimate.
- **Optional per-business data** in `src/data/production.ts`: `farSale` (left out: sales pay the
  same anywhere, one value shown), `valueBonus` (a toggle upgrade that adds to the value, here a
  named product, +5%; the game pays whole dollars per unit), `raids: false` (no "Raided" button)
  and `boost`.
- **Production boost:** started by the user with "Boost started". It runs production at the
  rate's `boostedMinutesPerUnit` until it has made `units` (80) or `maxRealMs` (24 hours) of real
  time has passed. It counts units made, so it waits while there are no supplies or the stock is
  full. Forecasts make the boosted units first.
- **Saved state** (version 8): `boosts` maps a property id to its last boost (wall-clock start,
  units left). It stays after the boost ends so the card can show "Next boost in" until the
  daily reset (6:00 UTC); until then "Boost started" is hidden. "Undo" removes a boost started by
  mistake; production already counted stays and can be resynced.
- Units left are not resyncable: the game does not show them.

## Why

The boost counts units, not time, so it is tracked by units made inside the same production
step; the 24 hours are real time, like deliveries, and split a stretch the same way. A separate
`boosts` section keeps `Bars`, which `BusinessBars` edits and undoes, unchanged.
