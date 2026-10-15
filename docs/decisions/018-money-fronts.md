# 018: Money Fronts safe and heat

2026-10-15, issue #11. Builds on decisions 004, 010, 011, 013 and 016.

## Decision

- **One card on the Safes tab,** not its own tab or the Businesses tab. The game pays all three
  fronts into one safe in the Hands On Car Wash, so a tab would hold a single card, and the safe
  works like the others (decision 016). The card shows a heat bar per owned front, the safe, the
  payout, the next payout, time until full and time until the Car Wash reaches 100% heat.
- **Properties:** the three fronts join the catalog with `card: false` and a "Laundering
  missions done" count (15 doubles that front's pay). Vehicle Warehouse, Auto Shop, Bail
  Enforcement Office and McKenzie Field Hangar join as owned-only properties because they add
  to the safe. The Special Cargo Warehouse gets a "Largest owned" choice (default Large): the
  game counts only the largest warehouse. The card shows only while the Car Wash is owned.
- **Payout** (`src/data/fronts.ts`), every in-game day (48 minutes of play time), up to
  $100,000: $750 per front ($1,500 after 15 laundering missions) plus a fixed amount for each
  other business owned, from the in-game safe screen (data comment has the sources). A front at
  100% heat pays nothing; the Car Wash at 100% stops the whole safe. LSOS counts every owned
  business; the game skips biker businesses and the Bunker while shut down or not set up, which
  the card says (shutting down: issue #38).
- **Heat** per front, saved with the safe (`heat` by front id, data version 9). At the end of
  each day, after the payout, every front below 100% gains 10%, one less per other front below
  100% (8% with all three). A laundering mission or Mr. Faber job adds 10% to the front it was
  launched from; a laundering mission counts toward that front's 15, a Faber job toward all
  three. Legal work clears the front's heat. The rise comes from a player's notes, and which
  fronts rise is LSOS's reading of them, so heat is marked "(est.)" (decision 013).
- **One countdown, whichever comes first:** "Full in", assuming heat stays where it is now
  (like popularity on the other safes), or "Car Wash max heat in (est.)" when the Car Wash would
  reach 100% and stop the safe sooner.
- **Heat bars** are amber, red at 100% like the in-game bar (Meter `heat` kind).
- **Dragging a bar** shows the value under the pointer while dragging, on every editable
  percentage bar (stock, supplies, popularity, heat): one `ui/EditableBar` component.
- **Edit mode** adds the resync controls (decision 010: heat values and bars, safe money with
  Collected/Full, "Payout just arrived" with the half-day rule of decision 016) and per front
  "Laundering +10%", "Faber job +10%" and "Legal job" buttons.
- **Data version 9** with an unchanged migration: an older LSOS would silently drop the heat.

## Why

Following the game's own shape (one safe, heat per front) keeps the card small and the numbers
exact where sources are exact. Logging missions in one click keeps both heat and the doubling
count right without typing. Full-in on today's heat stays exact and matches decision 016; the
heat countdown covers the risk that the safe stops.
