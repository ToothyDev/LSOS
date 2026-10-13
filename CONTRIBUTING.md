# Contributing

Thanks for helping! Humans and Claude Code sessions follow the same workflow.

## Workflow

1. **Pick or open an issue.** All work is tracked in GitHub issues. Wrong game values have their
   own issue template: please include a source.
2. **Branch** from `main`: `<issue>-<few-words>`, e.g. `6-mc-businesses`
   (Claude Code sessions use `claude/<issue>-<few-words>`).
3. **Keep the PR to one issue.** Put `Closes #N` in the description. Open a new issue for anything
   out of scope that you notice.
4. **Run `npm run verify`** before pushing. It runs the same checks as CI: types, formatting, tests, build.
5. PRs are **squash-merged**, so commit as often as you like. The PR title becomes the commit
   message on `main`.

## Rules worth knowing

- **Game data needs a source** (decision 004): wiki link, Newswire post, or how you measured it
  in game. Never guess a value.
- **Logic is plain TypeScript** in `src/lib/` with unit tests. Components only display and edit
  state (decision 002).
- **No real time in logic or tests** (decision 003): pass `now` in or inject a clock.
- **No Rockstar assets** (logos, artwork, ripped game files) in the repo.
- Non-obvious design choices get a decision record in `docs/decisions/`.

## Using Claude Code

`CLAUDE.md` is the entry point for Claude Code sessions, and also a decent map of the repo for
humans.
