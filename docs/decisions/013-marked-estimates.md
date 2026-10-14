# 013: Marked estimates for missing game data

2026-10-14, issue #6. Amends decision 004.

## Decision

- Where no source gives a value a tracker needs, it may be **estimated**, but only by a rule
  stated in the data that derives it from sourced values (e.g. "as in the Bunker, where …").
  Values with no such rule stay out, as decision 004 says.
- The data marks which values of an entry are estimates and how they were derived
  (`estimate: { fields, how }` on a production rate). Sourced values never carry it.
- **Every number shown that rests on an estimate says so:** its label gets "(est.)", and the
  card shows an "Estimate" note with the rule. A tracker with no value and no rule stays
  "Not tracked" and does not move on its own.
- Each estimate keeps an open `data` issue, so a sourced or measured value can replace it.

First use (decision 012, issue #28): MC businesses without both upgrades. Supply use with
equipment only is taken as with both (only equipment "stretches" supplies, per the upgrade
text); without equipment, supplies last half as long, as in the Bunker. Staff only is taken as
equipment only, as in the Bunker, where either upgrade alone gives the same rate.

## Why

A tracker that stops for the most common upgrade combinations is less useful than a clearly
labelled best guess, as long as users can tell estimates from sourced values and planning
around them is their choice.
