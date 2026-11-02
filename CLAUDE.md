@AGENTS.md

## Claude Code only
- Skills are in `.claude/skills/` (same files as `.agents/skills/`).
- Subagents: `reviewer` (independent review), `security-reviewer`, `explorer` (cheap codebase search).
  Use `explorer` before reading many files; it returns `file:line` pointers, not file dumps.
- Hooks in `.claude/settings.json` run lint + typecheck when you stop. If they fail, fix and continue.
