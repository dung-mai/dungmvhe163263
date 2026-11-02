#!/usr/bin/env bash
# One-time setup after copying the kit into the flashlab repo root.
#
#   bash scripts/ai/install.sh
set -euo pipefail

root="$(git rev-parse --show-toplevel)"
cd "$root"

echo "== flashlab AI kit install =="

# 1. Claude Code reads skills from .claude/skills -> point it at the shared .agents/skills
mkdir -p .claude
if [ -L .claude/skills ] || [ -d .claude/skills ]; then
  echo "• .claude/skills already exists, leaving it."
else
  if ln -s ../.agents/skills .claude/skills 2>/dev/null; then
    echo "• linked .claude/skills -> ../.agents/skills"
  else
    cp -R .agents/skills .claude/skills
    echo "• symlink not allowed here (Windows?). Copied skills into .claude/skills."
    echo "  Re-run this script after editing .agents/skills, or enable Developer Mode for symlinks."
  fi
fi

# 2. Executable scripts and hooks
chmod +x scripts/ai/*.sh .agents/hooks/*.sh

# 3. pnpm verify script
node -e '
  const fs = require("fs");
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  pkg.scripts = pkg.scripts || {};
  if (!pkg.scripts.verify) {
    pkg.scripts.verify = "pnpm lint && pnpm typecheck && pnpm test";
    fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");
    console.log("• added \"verify\" script to package.json");
  } else {
    console.log("• package.json already has a verify script");
  }
'

# 4. .gitignore entries
touch .gitignore
for line in "work/*/logs/" ".agents/providers/*.local.json"; do
  grep -qxF "$line" .gitignore || { echo "$line" >> .gitignore; echo "• .gitignore += $line"; }
done

# 5. Tool check
echo
echo "== tools =="
for t in pnpm node git claude codex opencode gh; do
  if command -v "$t" >/dev/null 2>&1; then
    printf '  ✔ %-9s %s\n' "$t" "$("$t" --version 2>/dev/null | head -n1)"
  else
    printf '  ✘ %-9s not found\n' "$t"
  fi
done

cat <<'EOF'

Missing tools:
  Claude Code : npm i -g @anthropic-ai/claude-code   then `claude` and log in with Pro
  Codex CLI   : npm i -g @openai/codex               then `codex` and sign in with ChatGPT Plus
  OpenCode    : curl -fsSL https://opencode.ai/install | bash
                then `opencode auth login` -> DeepSeek -> paste API key
                and `opencode models deepseek` to confirm the model ids used in .agents/models.env

Next: open .agents/RUNBOOK.md
EOF
