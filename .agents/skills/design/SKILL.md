---
name: design
description: Lane 2 TL/SA. Use after G1 to check Definition of Ready, design the solution across Prisma, Nest, contracts and storefront, and split it into small test-first tasks in plan.md. Ends at gate G2.
---

# Design (lane 2 · TL / SA)

## Inputs
- `work/<feature>/spec.md` (approved at G1), `brief.md`
- Rules: `.agents/rules/architecture.md`, plus `security.md` / `money.md` if the brief flags them
- Templates: `design.md`, `plan.md`

## Steps
1. DoR check (6 items in the template). If an item fails, write why and stop: send the feature back to define.
2. Research the codebase for existing patterns: module layout, how errors and requestId work, test helpers, seed. Use `explorer` if available. Cite `file:line`.
3. Fill "Thay đổi theo lớp" and the API table. Respect the dependency direction.
4. Security & risk section: copy each relevant rule from `.agents/rules/security.md` and say how the design satisfies it.
5. List 2 alternatives you rejected and why (one line each).
6. If a decision is hard to reverse (auth mechanism, schema shape), write `docs/adr/NNNN-<slug>.md` (context, decision, consequences).
7. plan.md: tasks T1..Tn, each ≤ 30 minutes, each with files, the test to write first, a check command, the AC it serves and `Mode: ai` or `Mode: human`. Mark test files owned by QA, one per line in backticks under "Tests do QA sở hữu".
   Use `Mode: human` for anything an agent must not do alone: migrations on a real database, secrets or keys, shared environments, and judgement calls (look and feel, copy). Everything that has a test and touches only the repo is `Mode: ai`.
   In spec.md every AC has a verification label `[auto]`, `[semi]` or `[manual]`; if you add or split an AC in design, keep that label and the `AC-n` numbering.
8. Order tasks so the app builds after every task.

## Output
- `work/<feature>/design.md`, `work/<feature>/plan.md`, optional ADR

## Gate G2 · Design
Print a 6-line summary: approach, schema change, new endpoints, security choices, number of tasks, biggest risk. Stop and wait for "G2 ok". Do not write production code.
