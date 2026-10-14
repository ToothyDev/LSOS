# 010: Resync: correcting tracked values by hand

2026-10-14, issue #4. Builds on decision 003 ("Resync").

## Decision

- **One component for every tracked value:** `src/components/ui/EditableValue.svelte`. It shows
  the current estimate; clicking it opens a text field prefilled with that value. Enter or "Set"
  confirms, Escape or "Cancel" leaves it unchanged. Input the field cannot read is not guessed
  at: it stays open and says what it expects.
- **Units** (`src/lib/resync.ts`): `percent` (stock, supplies), `money` (safes; "$120,000",
  "120k" and "1.2m" all work) and `duration` (time left as h:mm or plain minutes, stored in
  milliseconds; shown rounded up to the minute, so "0:00" means done). Typed values are clamped
  to the tracker's `min`/`max`. "Bars" are the stock and supplies meters, edited in percent:
  most businesses have both, some only stock.
- **The tracker owns "as of now".** The component calls `onresync(value)`; the tracker stores
  it with its own clock and keeps counting from there (a play-time tracker sets its saved
  progress, a real-time cooldown stores `now + timeLeft`). The component never reads a clock.
- **Presets** are one-click values passed in by the tracker ("Full" sets a bar to 100%,
  "Collected" empties a safe).
- **Business bars** (`src/components/ui/BusinessBars.svelte`): stock and, if the business has
  one, supplies, each an `EditableValue` with its meter, plus the business events "Sold"
  (empties stock) and "Raided" (a successful police raid empties stock and supplies). Stock has
  "Full". All these actions share one row under the bars (compacted in issue #6). Raided is hidden for a business without supplies. Trackers pass the bars in percent
  and store what comes back.
- **Supplies bought** starts a delivery instead of filling at once: the bars keep
  `suppliesDueAt` (wall-clock time), the panel counts down, and once due `settleBars` fills
  supplies to 100%. Trackers store bars as set and settle them whenever they read them, so a
  delivery that arrives while nobody looks still counts. The wait is 10 minutes for every
  business and runs on real time for now; which clock the game uses is not confirmed. A raid
  also cancels a delivery on its way.
- **Segmented bars, drag to resync** (issue #32): stock and supplies bars are split into five
  segments like in game (`BAR_SEGMENTS` in `src/data/business-events.ts`), in the resync
  controls only; collapsed cards keep a plain bar to stay clean.
  In `BusinessBars` each bar is also a slider (`Meter` with `onset`): drag its handle with mouse,
  pen or touch, or use the keys (arrows step 1% to the next whole percent, Page Up/Down jump to
  the next segment edge, Home/End to 0/100%). A drag rounds to whole percent and snaps to a
  segment edge from up to 1.5% away (`dragValue`/`keyValue` in `src/lib/ui.ts`), so 19% and 21%
  are reached by key or typing. It commits once, on release, and shows the level under the
  pointer as the value while dragging. Typing stays for exact values.
- What each event does, and the delivery, are game data in `src/data/business-events.ts`
  (decision 004).
- **Undo takes back the last edit or preset** of that value; in `BusinessBars` one Undo covers
  the last change to either bar, events included. Dragging and key steps on one bar in a row
  are one change (`recordEdit`), so Undo takes back the whole adjustment, not the last 1%. It subtracts what the edit changed
  rather than restoring the old number, so progress counted since is kept: a cooldown mistyped
  as 1:30 instead of 2:00 and undone ten minutes later shows 1:50. The undo lives in the
  component for the session and is not saved.

## Why

Estimates drift (forgotten pause, disconnects, raids), so correcting a value must be one click
and a number, everywhere, in the unit the game shows. Keeping the clock out of the component
lets each tracker use its own clock (decision 003) and keeps the logic testable.
