# Handoffs

A handoff is a short note that lets the next session continue an unfinished PR without rereading
everything. Rules:

- One per open PR, at `docs/handoff/<issue>-<few-words>.md`, only on that PR's branch.
  On `main` this folder holds only this README.
- Written with the `handoff` skill (`.claude/skills/handoff/SKILL.md`), under about 150 lines.
- Removed by the `finish-pr` skill before merging. The `handoff` status check stays pending
  while a handoff exists, which blocks the merge.
