# 60: UI consolidation and improvement

**Status:** all issue items built (PR #68, draft); waiting on the pick between the two edit styles.

## Goal

Remove copied UI patterns (hints, notes, card grid width, Undo placement, empty states), rework
the crowded Settings tab, and make Edit and the settings gear exclusive or drop Edit entirely,
after trying both. Issue #60.

## Read first (only these)

- Issue #60 body
- Decision 029
- `src/lib/cards.svelte.ts` (`editTrial`, `setEditStyle`, `CardModes`)
- `src/components/ui/CardFooter.svelte`
- The "Card editing (trial)" panel in `src/components/Settings.svelte`

## State now

- Done: `Hint`, `Note`, `MarkOwned`, `CardFooter`, `CardModes`, `--card-width`, the Acid Lab
  boost Undo in the footer, the Settings list with the detail panel, `upgradeSummary` in
  `lib/properties.ts` (tested), decision 029.
- Trial: there is a switch on Settings for each style. It is saved in localStorage under
  `lsos-trial-edit-style`. It ships in the normal build because the Cloudflare preview does not
  run in dev mode, so it cannot be dev-only.
  - `exclusive`: Edit button; Edit and the gear close each other.
  - `always`: no Edit button; edit controls show on every card except while its settings are
    open.

## Findings

- Screenshots were checked at 1280 px and 400 px wide.
  - Wide Settings: three columns (list, sticky detail, other settings).
  - At 400 px: one column, the upgrades open under the picked row, and long names wrap onto
    two or three lines. Narrower button slots (6.5rem) made "NOT OWNED" wrap, so they stay
    7.5rem.
- Container queries in `PropertyList` must come last in its `<style>`: the `.inline` rule
  defined after them overrode them.

## Next steps

1. Ask which edit style won. Remove the other one: the `editTrial` state, its localStorage key
   and the Settings trial panel. Keep `CardModes`. With `always`, also drop `editable` from
   `CardFooter`.
2. Update the trial line in decision 029 and its index line.
3. Run the `finish-pr` skill.

## Open questions

- Which edit style: Edit button or always editable?
