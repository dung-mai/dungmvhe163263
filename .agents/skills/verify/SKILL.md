---
name: verify
description: Lane 4 QA + Reviewer. Use after build to run the gates, check every acceptance criterion against tests and the diff, review code quality, capture UI evidence and write review.md. Must run on a different engine from the one that built.
---

# Verify (lane 4 · QA + Reviewer)

## Inputs
- `spec.md`, `plan.md`, `test-plan.md`, `status.md` in `work/<feature>/`
- The diff: `git diff $(git merge-base HEAD main)...HEAD`
- Template `.agents/templates/review.md`

## Steps
1. Record which engine/model you are. If it is the same engine that built, say so at the top of review.md.
2. Run `pnpm verify` (lint, typecheck, test-registry sensor, API tests). If AC touch UI, auth or money, also run `pnpm test:e2e`. Paste only failing lines. If the DB is not running, say so and mark the gate as not verified (never as passed).
3. AC table: for each AC, find the test that covers it (by `AC-n` in the name) and whether it passes. Missing test = major finding.
4. Compare `test-plan.md` cases with the real tests; list cases nobody implemented.
5. Review the diff against `.agents/rules/*.md` and design.md: boundaries, money rules, error shape, naming, duplication, dead code. Each finding has a severity and `file:line`.
6. Evidence: for UI changes, take screenshots with Playwright (desktop + mobile) into `work/<feature>/evidence/` named `AC-n-<viewport>.png`.
7. If Claude Code: delegate the read-only part to the `reviewer` subagent to keep your context clean.

## Do not
- Fix code in this lane. Findings go to review.md; blockers send the feature back to build.

## Output
- `work/<feature>/review.md`, `work/<feature>/evidence/*`
- Conclusion: ready for PR, or back to build with the blocker list. Run handoff.
- The LAST line of `review.md` must be exactly one of these (the orchestrator reads it):
  - `VERDICT: ready` — no blocker and no major finding left
  - `VERDICT: back-to-build` — at least one blocker or major finding, or `pnpm verify` fails
