---
name: retro
description: Lane 6 Learn. Use after a feature merges or weekly to turn journal entries, review findings and logs into concrete changes to rules, skills, hooks or tests, proposed as a list and applied only after the user approves.
---

# Retro (lane 6 · Learn)

## Inputs
- `.agents/journal.md` (new entries since the last retro marker)
- `work/<feature>/review.md`, `security.md`, `status.md`, `logs/`

## Steps
1. Group problems by cause: missing context, unclear rule, wrong skill step, missing test/sensor, model weakness, tool/harness issue.
2. For each group propose ONE change, the cheapest that would have prevented it:
   - deterministic first: a lint rule, a hook pattern, a test
   - then a rule line in `.agents/rules/*.md` or `AGENTS.md` (keep AGENTS.md under 60 lines)
   - then a skill step
   - routing: a lane that failed on a cheap model moves up a tier in `models.env`, and the reverse
3. Show the proposals as a table (problem, change, file). Wait for approval.
4. Apply the approved ones. Append `--- retro YYYY-MM-DD ---` to the journal.

## Also record
- Rough cost/quota per lane if known (for example "test-plan on deepseek-v4-flash: ~$0.01").
