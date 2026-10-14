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
  one, supplies, each an `EditableValue` with its meter and "Full", plus the business events
  "Sold" (empties stock) and "Raided" (a successful police raid empties stock and supplies).
  What each event empties is game data in `src/data/business-events.ts` (decision 004); Raided
  is hidden for a business without supplies. Trackers pass the bars in percent and store what
  comes back.
- **Undo takes back the last edit or preset** of that value; in `BusinessBars` one Undo covers
  the last change to either bar, events included. It subtracts what the edit changed
  rather than restoring the old number, so progress counted since is kept: a cooldown mistyped
  as 1:30 instead of 2:00 and undone ten minutes later shows 1:50. The undo lives in the
  component for the session and is not saved.

## Why

Estimates drift (forgotten pause, disconnects, raids), so correcting a value must be one click
and a number, everywhere, in the unit the game shows. Keeping the clock out of the component
lets each tracker use its own clock (decision 003) and keeps the logic testable.
