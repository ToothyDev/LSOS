# 029: Shared card parts, always-editable cards and the Settings list

2026-10-15, issue #60. Builds on decisions 009, 011 and 026; amends 010.

## Decision

- **One component per repeated pattern** in `src/components/ui/`:
  - `Hint`: muted help text in two sizes, normal (`--text-sm`) and `fine` (`--text-xs`, for
    footnotes such as how an estimate is made).
  - `Note`: a callout with a bar on its left and a bold title first. Tones:
    - `warn`: needs a look ("Estimate.", "Payout cut.").
    - `quiet`: a plain state ("Shut down.").
    - `good`: a tip, with `actions` on their own line.
  - `MarkOwned`: what a tab shows while nothing on it is owned, with the link to Settings. With
    a property, the link opens Settings on that property (`#/settings/<id>`).
  - `UndoStatus` with `TimedUndo` (`lib/cards.svelte.ts`): "Boost started. [Undo]" for 15
    seconds, right where the press was. Used for the Acid Lab boost, the Timers cards and the
    Overview's quick actions. The Undo puts back what the press replaced.
  - `Button small`: for rows of several actions and the title bar.
- **Cards are always editable.** No Edit button and no separate edit view:
  - Every value can be clicked to type it in.
  - Bars can be dragged. The drag handle shows only while the pointer is over the card, or the
    bar has focus. Touch screens always show it.
  - The read-only extras stay, next to the editable value: units, "of $cap", value per goods.
  - Decided after trying both styles side by side.
- **Fewer one-click presets** (amends 010): no Full on stock, safes or goods, and no Raided.
  No Maxed on popularity either. Sold, Supplies bought, Collected and the popularity boosts stay.
  Rarely used, and every value can be typed or dragged instead.
- **No card footer.** The settings gear is a small button at the right end of the title bar.
  One card per tab has its settings open at a time.
- **Money Fronts heat:** each front's bar has its three actions right under it, as small
  buttons in one row: +10% Laundering, +10% Faber, Legal job.
- **One card width:** `--card-width` (20rem) for every card grid.
- **Order by use:** `USE_ORDER` in `src/data/properties.ts` sorts Settings and gives each tab
  its card order until the user moves the cards:
  - Acid Lab, Bunker and Nightclub first.
  - Then the MC businesses by money per hour at full upgrades, from `production.ts`: Cocaine,
    Meth, Cash, Weed, Documents.
  - Then the Money Fronts and the safes. The properties that only unlock something or add to a
    safe come last, with the Mansion and the Bail Enforcement Office at the bottom.
  - A test checks that the list names every property.
- **Bars grab at their ends:** the draggable area reaches half a handle past each end of the
  bar, so a handle at 0% or 100% can be grabbed anywhere on it.
- **Settings is a list with a detail panel:**
  - Every property is a row that keeps its height, with a gear in front of its name, a
    one-line upgrade summary, and Owned (and Running) buttons in fixed-width slots.
  - Pick a row to set its upgrades in a panel beside the list. The panel is centred on the
    row, kept within the list, and has an arrow pointing at the row.
  - Without room beside the list, the upgrades open under the picked row instead.
  - A property that is not owned shows its upgrades greyed, so marking it owned changes
    nothing in the layout.
  - On wide screens the other settings are a narrow column on the right.

## Alternatives

- Edit and settings as two exclusive modes behind buttons: tried. It kept a footer and a
  second view of every card.
- Global CSS classes instead of `Hint` and `Note`: shorter markup, but the tones and the title
  would still be written out by hand in every card.
- Settings with collapsible rows, or grouped cards: either one still moves things around as
  properties are marked owned or opened.
- One "+10%" button with a choice of mission: one more click for every mission logged.
