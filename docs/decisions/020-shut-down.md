# 020: Shut-down businesses

2026-10-15, issue #38. Builds on decisions 011, 012, 015 and 018.

## Decision

- **A flag apart from owned:** `shutDown` in a property's saved settings, next to `owned` and
  the upgrades (data version 10). Absent means running, so older entries need no change. Owning
  or selling keeps it, like the upgrades.
- **Only businesses the game can shut down** get a "Running"/"Shut down" toggle button next to
  "Owned", shown while owned (`canShutDown` in `src/data/properties.ts`): the five biker
  businesses and the Bunker, the ones decision 018 names. The Acid Lab is left out: no source
  says it can be shut down. A button like "Owned", not an upgrade checkbox: it is a state of the
  business, not something bought.
- **Shutting down empties the stock and keeps the supplies** (checked in game, 2026-10-15):
  `clearShutDownStock` in `lib/production.ts`, applied by `setProperties` in the store whenever a
  business goes from running to shut down. Starting it again changes nothing.
- **Shut down means "not running" everywhere** (`isRunning` in `lib/properties.ts`):
  - production (decision 012) makes no stock and uses no supplies; the card is greyed out but
    readable, keeps its bars and value, has a grey "Shut down" note (not the yellow warning),
    and hides the countdowns and the boost;
  - nightclub goods (decision 015) whose only unlocking business is shut down count as locked,
    so the Locked note and the best-setup suggestion follow;
  - the Money Fronts safe (decision 018) gets nothing from it.
- **Not modelled:** whether a nightclub technician must be reassigned after the business starts
  again. LSOS keeps the assignment and resumes counting.

## Why

Marking a shut-down business "Not owned" hid its stock and lost the card. The flag keeps both.
gta.wiki does not describe shutting down from the laptop (checked 2026-10-15); the nightclub
and Money Fronts rules rest on the sources in decisions 015 and 018 and the issue.
