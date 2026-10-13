---
name: handoff
description: Write or update the handoff file for an unfinished PR so the next session can continue cheaply. Use when a session ends with its PR not done.
---

# Writing a handoff

A handoff lives at `docs/handoff/<issue>-<few-words>.md` and exists **only on the PR's branch**.
There is one per PR: update it, never add a second. Keep it under about 150 lines.

Use this template:

```markdown
# <issue number>: <title>

**Status:** one line, e.g. "store works, migrations untested"

## Goal

What the PR must do, in two or three sentences. Link the issue.

## Read first (only these)

- Issue #N (body and comments)
- Decision NNN
- `src/lib/state/store.ts` `load()` and `migrate()`
  (exact files with function names or line ranges, never "read everything")

## State now

What works, what does not. Quote the maintainer where their words constrain the work.

## Findings

What was learned, with the numbers written out (not "see the log"). Describe screenshots in
a sentence so the next session does not have to open them.

## Next steps

1. ...

## Open questions

- ...
```

Facts that stay true after the PR merges belong in a decision or in the code's data sources as
soon as they are known; the handoff only points to them.
