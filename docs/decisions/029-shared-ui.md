# 029: Shared card parts and the Settings list

2026-10-15, issue #60. Builds on decisions 009, 011 and 026.

## Decision

- **One component per repeated pattern** in `src/components/ui/`:
  - `Hint`: muted help text in two sizes, normal (`--text-sm`) and `fine` (`--text-xs`, for
    footnotes such as how an estimate is made).
  - `Note`: a callout with a bar on its left, bold title first. Tones: `warn` (needs a look:
    "Estimate.", "Payout cut."), `quiet` (a plain state: "Shut down.") and `good` (a tip, with
    `actions` on their own line).
  - `MarkOwned`: what a tab shows while nothing on it is owned, with the link to Settings. With
    a property, the link opens Settings on that property (`#/settings/<id>`).
  - `CardFooter`: the action strip. An Undo for the last press goes on the left; Edit and the
    gear go on the right.
- **One mode per card.** `CardModes` (`lib/cards.svelte.ts`) holds which card on a tab has Edit
  or its settings open. Opening one closes the other.
- **Every Undo is in the footer**, as on Timers. It is offered only right after a press in that
  session, and it puts back what the press replaced. The Acid Lab boost's Undo moved there; it
  used to clear the boost.
- **One card width:** `--card-width` (20rem) for every card grid.
- **Settings: list and detail.** Every property is a fixed-height row with its name, a one-line
  upgrade summary, and Owned (and Running) buttons in fixed-width slots. Pick a row to set its
  upgrades in a sticky panel beside the list. When there is no room beside it, the panel opens
  under the picked row instead. A property that is not owned shows its upgrades greyed, so
  marking it owned changes nothing in the layout. On wide screens the other settings are a
  narrow column on the right.
- **Trial, open:** cards are edited either behind the Edit button or always editable (no Edit
  button; the gear is the only mode). The temporary switch on Settings ("Card editing (trial)")
  stays until one is picked. The other style and the switch are removed then, and this line is
  updated.

## Alternatives

- Global CSS classes instead of `Hint` and `Note`: shorter markup, but the tones and the title
  would still be written out by hand in every card.
- Settings with collapsible rows, or grouped cards: either one still moves things around as
  properties are marked owned or opened.
