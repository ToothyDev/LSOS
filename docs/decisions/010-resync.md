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
  to the tracker's `min`/`max`. "Bars" is not a unit yet: how many bars a business screen shows
  is a game fact without a source (decision 004).
- **The tracker owns "as of now".** The component calls `onresync(value)`; the tracker stores
  it with its own clock and keeps counting from there (a play-time tracker sets its saved
  progress, a real-time cooldown stores `now + timeLeft`). The component never reads a clock.
- **Presets** are one-click values passed in by the tracker ("Sold" sets stock to 0, "Full" to
  the maximum). What "Raided" and similar events do is game data, so each tracker defines its
  own presets with sources; the component only applies them.
- **Undo takes back the last edit or preset** of that value. It subtracts what the edit changed
  rather than restoring the old number, so progress counted since is kept: a cooldown mistyped
  as 1:30 instead of 2:00 and undone ten minutes later shows 1:50. The undo lives in the
  component for the session and is not saved.

## Why

Estimates drift (forgotten pause, disconnects, raids), so correcting a value must be one click
and a number, everywhere, in the unit the game shows. Keeping the clock out of the component
lets each tracker use its own clock (decision 003) and keeps the logic testable.
