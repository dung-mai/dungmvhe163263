#!/usr/bin/env bash
# Claude Code "PreToolUse" hook for Bash: block destructive commands.
# Exit 2 = block the call and show the message to the agent.
set -u

input="$(cat || true)"
cmd="$(printf '%s' "$input" | node -e '
let s = ""; process.stdin.on("data", d => s += d).on("end", () => {
  try { process.stdout.write(String(JSON.parse(s)?.tool_input?.command ?? "")); } catch { /* ignore */ }
});')"

[ -z "$cmd" ] && exit 0

patterns=(
  'prisma[[:space:]]+migrate[[:space:]]+reset'
  'prisma[[:space:]]+db[[:space:]]+push.*--force-reset'
  'git[[:space:]]+push.*(--force|[[:space:]]-f([[:space:]]|$))'
  'git[[:space:]]+reset[[:space:]]+--hard'
  'git[[:space:]]+clean[[:space:]]+-[a-z]*f'
  'rm[[:space:]]+-[a-z]*r[a-z]*f?[[:space:]]+(/|~|\.|\*)([[:space:]]|$)'
  'docker[[:space:]]+compose[[:space:]]+down[[:space:]]+.*-v'
  '(cat|less|more|head|tail|bat)[[:space:]].*\.env([[:space:]]|$)'
  '(^|[;&|[:space:]])(printenv|env)[[:space:]]*($|[;&|])'
)

for p in "${patterns[@]}"; do
  if printf '%s' "$cmd" | grep -Eq -- "$p"; then
    echo "Blocked by .agents/hooks/block-dangerous.sh (pattern: $p)." >&2
    echo "If this is really needed, ask the user to run it manually." >&2
    exit 2
  fi
done
exit 0
