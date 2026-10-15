# 024: Several LSOS tabs open at once

2026-10-15, issue #22. Builds on decisions 003 and 006.

## Decision

- **Saves follow the latest tab.** When another tab saves, the browser's `storage` event hands
  its state to every other tab, which takes it and drops its own pending save. So no tab
  overwrites a newer save with an older copy. A newer saved version, or unreadable data, blocks
  saving in the other tabs as it does on load.
- **One tab counts play time.** A tab that starts counting (resume, or opening with "track on
  open") tells the others over a `BroadcastChannel`, and they pause their play clock. Otherwise
  every open tab would add the same play time to the trackers.

## Why

These are the usual browser mechanisms for keeping tabs in step; both tabs stay usable, unlike
making a second tab read-only. A change made in the last half second before another tab's save
can be lost, which is small next to losing whole sessions.
