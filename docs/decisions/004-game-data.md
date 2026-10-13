# 004: Game data lives in `src/data/` and is always sourced

2026-10-13, project bootstrap

## Decision

Every GTA Online value LSOS relies on (production times, capacities, upgrade effects, safe
payouts, cooldowns, prices) lives in typed modules under `src/data/`, never inline in components
or logic. Each value carries a source: a link (wiki page, Rockstar Newswire, datamine) or a note
on how it was measured in game, and the date it was checked.

Values that are unknown are not guessed. They are left out or marked unknown in the data, and an
issue labelled `data` records the open question.

Target edition: PC Enhanced / PS5 / Xbox Series X|S. Legacy-only differences are out of scope.

## Why

A tracker with a wrong rate is worse than none: users plan sales around it. Sources make wrong
values easy to spot and fix, by maintainers and by players filing the data issue template.
