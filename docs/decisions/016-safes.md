# 016: Property safes and nightclub popularity

2026-10-14, issue #8. Builds on decisions 003, 004, 010, 011 and 013.

## Decision

- **Own tab.** Safes get a "Safes" tab instead of more on the Businesses cards: Nightclub,
  Agency, Arcade and Salvage Yard. Agency, Arcade and Salvage Yard join the catalog with
  `card: false` (no Businesses card); their settings are on the Safes card's gear and in
  Settings.
- **Data** (`src/data/safes.ts`): per safe, its capacity (a bigger one with an upgrade), how
  it pays per in-game day and, for the nightclub, popularity loss and one-click boosts.
- **Payouts on play time,** once per in-game day (48 minutes), as a lump at the end of the day,
  up to the capacity. Saved state (version 7): `safes` maps a property id to the money, the play
  time since the last payout and, for the nightclub, popularity in percent.
- **Nightclub:** paid by the sourced popularity table (the row at or below the popularity),
  then popularity drops by the day's loss. Loss 10% a day, 5% with Staff: an estimate (guides
  disagree, the wiki only says Staff reduces it; issue #41). Boosts: Maxed (a new DJ fills the bar),
  Promotion +25% (sourced), DJ +10% (switching back, sourced), Event +10% (Marcel's jobs,
  estimate). Below the top payout the card warns "Payout cut".
- **Agency:** $250 base plus $500 per 5 security contracts, at most $20,000. Contracts done is
  typed as a number. Step size and base are estimates (issue #40).
- **Count settings:** a third upgrade kind next to toggle and choice (decision 011): a whole
  number typed in (`NumberField`), with a default and an optional maximum, saved as a number.
  Used for contracts done and arcade floor slots; long dropdowns were hard to use.
- **Arcade:** $5,000 with all 35 floor slots filled (the default); fewer slots get an even
  share ($5,000 × filled / 35), marked as an estimate (issue #42). A machine taking two slots counts as two.
- **Salvage Yard:** too little documented to track reputation (its decay has no source), so it
  pays the 0% reputation amount ($250, $300 with Staff). $250,000 with the Wall Safe, $100,000
  without (issue #43).
- **"Full in"** assumes popularity stays where it is now, so it grows as popularity falls
  instead of resting on the estimated loss.
- **Popularity bar** is split into five segments in the edit controls, like the business bars
  (decision 010).
- **Estimates** follow decision 013: numbers that rest on them say "(est.)" and each card with
  one carries a small best-estimate note.
- **Resync** uses `EditableValue` (decision 010): safe money (Collected, Full), popularity (also
  a slider, with the boosts as presets) and the time to the next payout.

## Why

Safes, popularity and the four properties are their own topic and would crowd the business
cards. Lump payouts at the end of a day match how the game pays, so the next payout and the
time until full are exact for sourced values. Best estimates, clearly marked, are more useful
than leaving the less documented safes out.
