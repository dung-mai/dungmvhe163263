---
name: test-plan
description: Lane 3 QA, runs in parallel with build. Use to derive test-plan.md from the acceptance criteria only, without reading the implementation, and optionally write the QA-owned test files listed in plan.md.
---

# Test plan (lane 3 · QA, parallel with build)

Independence is the point: tests come from what was asked, not from what was built.

## Inputs
- `work/<feature>/spec.md` and the "Tests do QA sở hữu" list in `plan.md`
- `.agents/rules/testing.md`, `.agents/rules/security.md` if auth/money is flagged
- Existing test helpers only (to match style): search `apps/api/test` and `apps/storefront` e2e folders

## Do not read
- Files the build lane is changing (listed in plan.md tasks). Do not open `git diff`.

## Steps
1. For every AC, write at least one case in the matrix (type, data, expected). Add negative and boundary cases.
2. If auth/money is flagged, add security cases: wrong password, missing cookie, expired token, USER calling an ADMIN endpoint, trying to set own role, IDOR.
3. Write "Bằng chứng cần thu": which screenshots or videos verify needs, at which viewport.
4. If plan.md lists QA-owned test files, write them now. They may fail until build is done; mark with a comment `// QA-owned: from AC-n`.

## Output
- `work/<feature>/test-plan.md`, QA-owned test files (if listed)

## Stop
Print the AC→test count per AC. No gate; verify will use this.
