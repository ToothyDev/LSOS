# 006: Persisted state is versioned, migrated and exportable

2026-10-13, project bootstrap

## Decision

- All user state is stored under one `localStorage` key as JSON carrying a `version` number.
- On load, older versions are migrated step by step to the current one. Each migration is a pure
  function with a test. A version the app does not know is never overwritten: the app shows an
  error and offers export instead.
- Users can export their state to a JSON file and import it again (backup, moving devices).
- Writes are debounced and also happen on `pagehide`, so closing the tab loses at most a moment.

## Why

`localStorage` is the only copy of the user's data (decision 001). Schema changes are certain as
trackers are added, and a silent reset would throw away hours of tracking.
