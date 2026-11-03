---
name: build
description: Lane 3 Developer. Use after G2 to implement plan.md task by task with TDD, one commit per task, keeping pnpm lint and typecheck green. Does not change QA-owned tests or the spec.
---

# Build (lane 3 · Developer)

## Inputs
- `work/<feature>/plan.md` (approved at G2), `design.md`, `spec.md`, `status.md`
- `.agents/rules/*.md` that the design references

## Loop for each unchecked task Tn
1. Read the task. If it is unclear or wrong, stop and write the question in `status.md` instead of guessing.
2. Write the test first. If it is a new file under `apps/api/test/`, register it in `apps/api/scripts/test.mjs` in the same task. Run the narrowest command and confirm it fails for the right reason.
3. Implement the smallest change that passes. Stay inside the task's files; if you must touch another file, note it in `status.md`.
4. Run the task's check command, then `pnpm lint && pnpm typecheck`.
5. Stage only the files of this task (`git add <files>`, never `git add -A`; QA may be writing tests in parallel). Commit: `feat(<feature>): Tn <what>`. Tick the task in `plan.md`.
   If `git add`/`git commit` is not allowed (e.g. Codex sandbox, `.git/index.lock: Permission denied`), do not retry or work around it: tick the task and go on. The orchestrator commits your changes after the lane.
6. Update `status.md` (handoff skill) every 2–3 tasks, so another engine can continue if you stop.

## Tasks marked `Mode: human`
Some tasks in `plan.md` carry `Mode: human` (real database, secrets, shared environments, judgement calls). Skip them: do not do them, do not tick them. List each under "Đang chờ người" in `status.md` with the exact command or decision the human needs to make. The orchestrator asks the human before verify.

## Test naming
Every automated test for an acceptance criterion carries its id in the name, e.g. `test('AC-3 sorts by price ascending', …)`. A script checks that each AC in `spec.md` appears in some test; an AC without a test sends the work back to you.

## Environment blockers
If something outside the code blocks you (DB down, port busy, no network, permission denied), stop trying after one attempt, write it under "Đang chờ người" in `status.md` with the command the human should run, and finish the tasks you can.

## Never
- Edit QA-owned test files (listed in plan.md under "Tests do QA sở hữu") to make them pass; if one looks wrong, write it in `status.md`. The orchestrator freezes them: fewer assertions, `skip`/`only` or a deleted file stops the run. New tests of your own are fine.
- Edit committed migrations, `.env`, or the spec.
- Weaken a test or add `skip`/`only`.

## Done
All tasks ticked, `pnpm verify` green (if the sandbox blocks the DB, say so and list what you ran). Run handoff with "Lane tiếp theo: verify".
