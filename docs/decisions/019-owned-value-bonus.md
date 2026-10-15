# 019: Sale value bonus for owning another property

2026-10-15, issue #49. Builds on decisions 012, 013, 017 and 018.

## Decision

- **Optional `ownedBonus`** in `src/data/production.ts`: a property that must be owned, its
  label, the bonus and its own source. Used by two Money Fronts: Hands On Car Wash (+35%
  Counterfeit Cash) and Smoke on the Water (+35% Weed Farm), both from gta.wiki.
- The bonus joins `valueBonus` and raises the nearby value, rounded down to whole dollars per
  unit like the named Acid Lab product (decision 017). Heat does not turn it off: no source says
  it does.
- **Far value is an estimate (decision 013).** No source says how the front bonus combines with
  the +50% far sale. LSOS adds the percentages (base × 1.85), the lower of adding and
  multiplying (base × 2.025), and marks the far value "(est.)" with the rule in its tooltip.
- **Only Biker Sell Missions:** the sources name only those, so nightclub goods (Cash Creation,
  Organic Produce) keep their value.
- **Higgins Helitours** (+10% Air Freight with a Hangar) is left out: the hangar is tracked
  only as owned, without stock or value.

## Why

Adding is the lower guess, so the tracker does not promise money a sale may not pay. A separate
`ownedBonus` keeps the upgrade-based `valueBonus` as it is; both are real cases, but they come
from different places (an upgrade of the business, ownership of another property).
