#!/usr/bin/env bash
# SessionStart hook. Prints nothing when everything is in order.
#  1. Installs npm dependencies when node_modules is missing.
#  2. Cloud sessions only: unshallows the clone, fast-forwards the branch when that is safe,
#     and reports (never merges) a diverged branch or one that is behind main.
set -uo pipefail
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

if [ ! -d node_modules ]; then
  npm ci --no-audit --no-fund --loglevel=error >/dev/null 2>&1 ||
    echo "session-start: npm ci failed, run it by hand"
fi

[ "${CLAUDE_CODE_REMOTE:-}" = "true" ] || exit 0

if [ "$(git rev-parse --is-shallow-repository)" = "true" ]; then
  git fetch --quiet --unshallow origin 2>/dev/null
fi
git fetch --quiet origin '+refs/heads/*:refs/remotes/origin/*' 2>/dev/null ||
  { echo "session-start: git fetch failed, git state not checked"; exit 0; }

branch=$(git branch --show-current)
[ -n "$branch" ] || exit 0

if git rev-parse --verify --quiet "origin/$branch" >/dev/null; then
  read -r ahead behind < <(git rev-list --left-right --count "$branch...origin/$branch")
  if [ "$behind" -gt 0 ]; then
    if [ "$ahead" -eq 0 ] && [ -z "$(git status --porcelain)" ]; then
      git merge --quiet --ff-only "origin/$branch" && echo "session-start: fast-forwarded $branch by $behind commit(s)"
    else
      echo "session-start: $branch has diverged from origin/$branch ($ahead ahead, $behind behind); resolve before working"
    fi
  fi
fi

if [ "$branch" != main ] && git rev-parse --verify --quiet origin/main >/dev/null; then
  behind_main=$(git rev-list --count "HEAD..origin/main")
  [ "$behind_main" -gt 0 ] && echo "session-start: $branch is $behind_main commit(s) behind main; merge origin/main if the task needs it"
fi
exit 0
