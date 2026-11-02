---
name: define
description: Lane 1 BA/PO. Use to turn work/<feature>/brief.md into a testable spec.md with roles, scope in/out, acceptance criteria (Given/When/Then), UI flow and open questions. Ends at gate G1.
---

# Define (lane 1 · BA / PO)

## Inputs
- `work/<feature>/brief.md`, `knowledge/*.md`
- Template `.agents/templates/spec.md`

## Steps
1. Write "Bối cảnh" from the brief. Do not invent business facts; put guesses under "Giả định".
2. Fill the roles table. For anything permission-related, list what each role must NOT be able to do.
3. Scope: be explicit about what is out of scope this time. Smaller is better.
4. Acceptance criteria: numbered `AC-1..n`, Given/When/Then, each one testable by a machine. Include at least one negative AC per role (what is denied).
5. UI/flow: routes, states (loading, empty, error, forbidden), main path in bullets. No visual design yet.
6. Open questions: at most 5, each with your recommended default answer.
7. If you can talk to the user now, ask the open questions in one message and update the spec with the answers. If not (headless run), leave them in the spec.

## Output
- `work/<feature>/spec.md`

## Gate G1 · Scope
Print: number of ACs, the out-of-scope list, open questions. Then stop and wait for "G1 ok" (or edits). Do not design or code.
