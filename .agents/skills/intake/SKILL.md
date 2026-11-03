---
name: intake
description: Lane 0 router. Use when a new feature request arrives or work/<feature>/brief.md has an unclassified request. Picks the profile (vibe/standard/full), flags risks and decides which lanes and gates run.
---

# Intake (lane 0 · Router)

## Inputs
- `work/<feature>/brief.md` (section "Yêu cầu gốc")
- `.agents/flow.yaml` (profiles, risk_triggers)
- `knowledge/*.md`

## Steps
1. Read the request. Restate it in one sentence at the top of "Phân loại".
2. Find the likely touched areas with a quick search (prefer the `explorer` subagent if you are Claude Code). Do not read whole files.
3. Match `risk_triggers` by path and keyword, and read each trigger's comment: a keyword alone is not a match (e.g. sorting by price does not change money). List only real matches and the steps they turn on; mention near-misses in one line.
4. Pick a profile: start from `default_profile`; go down to `vibe` only if no risk trigger matches and size is S; go up to `full` only if `auth_or_roles` or `money` matches together with another trigger, or the user says the change is client-facing. Read-only or additive changes stay `standard` or `vibe`.
5. Fill the brief: profile + reason, risk flags, lanes that will run, gates, size S/M/L, open questions (max 3).
6. Create `status.md` from `.agents/templates/status.md` if missing.

## Output
- Updated `brief.md`, `status.md` with "Lane tiếp theo".
- The LAST lines of `brief.md` must be exactly these two machine-readable lines (the orchestrator reads them):

```
PROFILE: standard
RISKS: auth_or_roles, data_model
```

`PROFILE` is one of `vibe | standard | full`. `RISKS` lists matched trigger names from `flow.yaml`, comma-separated, or `none`.

## Stop
Show the profile, risk flags and lane list in 5 lines and stop. No gate here, but the user may change the profile.
