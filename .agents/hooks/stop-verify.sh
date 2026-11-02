#!/usr/bin/env bash
# Claude Code "Stop" hook: fast sensor = lint + typecheck.
# Silent on success. On failure prints the tail of the errors to stderr and exits 2,
# which tells Claude Code to keep working and fix them before stopping.
# Other engines (Codex, OpenCode) are told in AGENTS.md to run the same commands.
set -u

input="$(cat || true)"

# Avoid an endless loop: if Claude is already continuing because of this hook, let it stop.
if printf '%s' "$input" | grep -Eq '"stop_hook_active"[[:space:]]*:[[:space:]]*true'; then
  exit 0
fi

root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null || pwd)}"
cd "$root" || exit 0

# Skip when no source changed (pure planning/doc sessions stay fast).
changed="$(git status --porcelain -- apps packages 2>/dev/null)"
[ -z "$changed" ] && exit 0

run() {
  local name="$1"; shift
  local out
  if ! out="$("$@" 2>&1)"; then
    echo "[$name failed] fix these before stopping:" >&2
    printf '%s\n' "$out" | tail -n 60 >&2
    exit 2
  fi
}

run "pnpm lint" pnpm -s lint
run "pnpm typecheck" pnpm -s typecheck
exit 0
