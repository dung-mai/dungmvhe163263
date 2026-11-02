#!/usr/bin/env bash
# Claude Code "PreToolUse" hook for Edit/Write/MultiEdit: protect sensitive files.
set -u

input="$(cat || true)"
file="$(printf '%s' "$input" | node -e '
let s = ""; process.stdin.on("data", d => s += d).on("end", () => {
  try { process.stdout.write(String(JSON.parse(s)?.tool_input?.file_path ?? "")); } catch { /* ignore */ }
});')"

[ -z "$file" ] && exit 0

case "$file" in
  *.env|*/.env|*.env.local|*.env.production)
    echo "Blocked: do not edit $file. Put new settings in .env.example." >&2; exit 2 ;;
  */prisma/migrations/*/migration.sql)
    # New migrations are created by `prisma migrate dev`; existing ones must not change.
    if [ -f "$file" ]; then
      echo "Blocked: $file is a committed migration. Create a new migration instead." >&2; exit 2
    fi ;;
  */pnpm-lock.yaml)
    echo "Blocked: edit dependencies with pnpm add/remove, not by editing the lockfile." >&2; exit 2 ;;
esac
exit 0
