# 001: Static site, all user data in browser storage

2026-10-13, project bootstrap

## Decision

LSOS is a static site: plain HTML, CSS and JS served by any static host. All user data (owned
businesses, upgrades, stock levels, timers) is kept in the browser's `localStorage`. There is no
backend, no accounts and no server-side storage.

## Why

- The maintainer asked for it, and it keeps hosting free and trivial (GitHub Pages, Cloudflare).
- Nothing in the backlog needs a server: every tracker is arithmetic over time and user input.
- Data stays private to the user's browser.

## Consequences

- Data does not sync between devices; export/import (decision 006) is the way to move it.
- Rockstar data cannot be fetched live from the browser (no public API, and cross-origin
  requests to Rockstar sites are blocked). Weekly data is baked in instead (decision 005).
- Clearing site data wipes the user's state; the UI should say so near export.
