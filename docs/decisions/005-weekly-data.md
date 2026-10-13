# 005: Weekly events come from a committed JSON file

2026-10-13, project bootstrap

## Decision

The current week's events (bonus payouts, sale boosts, discounts) are stored in a JSON file in the
repo and served with the site. It is updated by a pull request each week, written by a scheduled
Claude Code routine or by hand. The site never fetches Rockstar pages itself.

The file format, the Breaking News bar and the routine are tracked in their own issues.

## Why

- Rockstar has no public API for GTA Online events, and browsers block cross-origin requests to
  Rockstar's sites, so a static site cannot fetch them live (decision 001).
- A PR per week leaves a reviewable history and lets a human catch a wrong summary before it ships.
- Each entry records the week it applies to, so stale data can be shown as stale instead of wrong.
