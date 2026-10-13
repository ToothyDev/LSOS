---
name: finish-pr
description: Get a PR ready to merge - empty the handoff, update docs, verify, rewrite the PR title and description. Use when the work on a PR is done.
---

# Finishing a PR

1. **Empty the handoff.** Move every lasting fact out of `docs/handoff/<file>.md`:
   - design choices → a new decision (`docs/decisions/`, next free number, plus an index line)
   - unfinished or out-of-scope work → a new issue (link it from the PR)
   - game facts → `src/data/` with their source
   - anything else → drop it

   Then delete the handoff file. The `handoff` status check turns green once it is gone.

2. **Update docs.** README if what LSOS does or how it is used changed. `CLAUDE.md` if the map,
   commands or workflow changed, and its "Next up" line.
3. **Verify.** `npm run verify 2>&1 | tail -n 5` must pass.
4. **Rewrite the PR title and description** to describe what the whole PR does now. With squash
   merge the title becomes the commit message on main. Keep `Closes #N`. No session links.
5. Mark the PR ready for review (out of draft).
