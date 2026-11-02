---
name: create-pr
description: Use after verify says ready to write the pull request description from the template with AC checklist, evidence images and test results, and open the PR with gh only when the user asks. Ends at gate G3.
---

# Create PR (lane 4 → G3)

## Inputs
- `spec.md`, `review.md`, `security.md` (if any), `evidence/`, `git log` of the feature branch
- Template `.agents/templates/pr.md`

## Steps
1. Summary in one line, link to spec.
2. Change list grouped by layer (API, contracts, storefront, DB), from `git diff --stat` and commits.
3. AC checklist: each AC with its test name and evidence file.
4. Images: reference files in `work/<feature>/evidence/` with relative paths.
5. Tests: paste the result lines of `pnpm verify` and e2e from review.md (no full logs).
6. Risks and rollback: migrations, env variables, feature flags.
7. Reviewer notes: which engine built, which reviewed.
8. Write `work/<feature>/pr.md`.
9. Only if the user explicitly asked to open the PR: `gh pr create --title "<title>" --body-file work/<feature>/pr.md`. Otherwise print the command.

## Gate G3 · Merge
The human reviews and merges. Stop after writing pr.md.
