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

## Environment problems are not code findings
Permission errors (`.git/index.lock`, sandbox), busy ports, DB not running, no network, a missing tool: the build agent cannot fix these.
List them under `## Cần người xử lý` in review.md with the exact command the human should run, and end with `VERDICT: blocked-env`.
Never send environment problems back to build. Code that is correct but uncommitted is not a finding: the orchestrator commits build changes.

## Spec or design is the problem, not the code
If an AC is ambiguous, contradicts another, cannot be met by the design, or cannot be tested at all, build cannot fix it: another build round only burns quota.
Describe it under `## Cần sửa spec hoặc design` (which AC or paragraph, why, what you propose) and end with `VERDICT: back-to-design`.

## Sensors already ran
The orchestrator runs deterministic checks before this lane and puts the results in your prompt: AC with no test (`work/<feature>/ac-trace.md`), QA-owned tests that build changed (originals in `work/<feature>/.qa-freeze/`), tasks marked `Mode: human` that are not done.
Do not redo them by hand. A removed assertion, a new `skip`/`only` or a weaker expectation in a QA-owned test is a blocker. Tasks marked `Mode: human` go under `## Cần người xử lý`; they are not code defects.

## You are read-only
Write only inside `work/<feature>/` (review.md, evidence/). The orchestrator compares the code before and after this lane and stops the run if it changed.

## Do not
- Fix code in this lane. Findings go to review.md; blockers send the feature back to build.
- Re-review unchanged code from scratch in a fix round: check the previous findings first, then only the new diff.

## Output
- `work/<feature>/review.md`, `work/<feature>/evidence/*`
- Conclusion: ready for PR, or back to build with the blocker list. Run handoff.
- The LAST line of `review.md` must be exactly one of these (the orchestrator reads it):
  - `VERDICT: ready` — no blocker and no major finding left
  - `VERDICT: back-to-build` — at least one blocker or major finding in the code, or `pnpm verify` fails because of the code
  - `VERDICT: blocked-env` — cannot verify because of the environment (see above); nothing for build to fix
  - `VERDICT: back-to-design` — the spec or design is wrong or untestable (see above); needs a human decision and a re-approved gate
