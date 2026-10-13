# 007: How the state store handles bad, blocked and unsaved data

2026-10-13, issue #1

## Decision

Builds on decision 006. Code: `src/lib/state.ts` (versions, migrations, parsing),
`src/lib/persistence.ts` (storage, debounce), `src/lib/store.svelte.ts` (Svelte wiring).

- **Unreadable data is treated like a newer version.** Invalid JSON or a bad shape under the
  storage key blocks saving, shows a warning and is offered for export as it is. It is never
  replaced by a fresh state on its own.
- **Import is the only way past a block.** Importing a file replaces everything, overwrites
  blocked data and saves at once. The Settings tab asks for confirmation first, with a stronger
  warning while data is blocked.
- **Export while blocked exports the stored text**, not the empty in-memory state, because that
  text is the data worth keeping.
- **Storage full or unavailable:** the app keeps running in memory and shows a warning. When
  storage exists, every save still tries again, so the warning clears once space is freed.
- **Only known fields are kept** when parsing the current version; unknown keys are dropped.
  Each tracker validates its own section when it adds one.
- **Saves are skipped when the text equals what was last read or written**, so loading the app
  does not rewrite storage.
- The debounce timer is injected (`Schedule`), so tests drive time by hand (decision 003).

## Why

`localStorage` is the only copy (decision 001). Any automatic path that writes over data the app
cannot read would lose it for good; requiring an explicit import keeps that a user decision.
