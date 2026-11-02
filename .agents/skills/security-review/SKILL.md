---
name: security-review
description: Lane 4 Security, turned on by risk triggers (auth, roles, money, PII). Use to review the feature diff against .agents/rules/security.md and common web risks, read-only, and write security.md with severity and fixes.
---

# Security review (lane 4 · Security, risk-based)

## Inputs
- `.agents/rules/security.md`, `work/<feature>/design.md`, `spec.md`
- Diff: `git diff $(git merge-base HEAD main)...HEAD`

## Checklist (answer each with pass / fail / n.a. and evidence `file:line`)
1. Secrets: nothing in code, tests, fixtures, logs; new settings only in `.env.example`.
2. Password storage: argon2id or bcrypt ≥ 12; no hash or password in responses or logs.
3. Session: httpOnly cookie, secure in prod, sameSite; expiry; logout clears it.
4. AuthZ: every admin route guarded on the server; deny by default; UI checks are not the only check.
5. Role escalation: no DTO or endpoint lets a user set their own role; registration always creates USER.
6. IDOR: resources fetched by id check the owner or role.
7. Input validation: DTO validation with whitelist; unknown fields rejected.
8. Login abuse: rate limit; generic error message; no user enumeration on register/reset.
9. CSRF for cookie auth on state-changing routes.
10. Error responses: requestId kept, no stack trace or SQL.
11. Dependencies added: list them; flag anything unmaintained or unexpected.

## Output
- `work/<feature>/security.md`: table (item, result, evidence, fix), then blockers first.
- Never edit source code in this lane. Run handoff.
- The LAST line of `security.md` must be exactly one of:
  - `VERDICT: pass` — no failing item of high impact
  - `VERDICT: blockers` — at least one failing item that must be fixed before merge
