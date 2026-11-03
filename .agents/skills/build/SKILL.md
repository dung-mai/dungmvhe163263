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

## Environment blockers
If something outside the code blocks you (DB down, port busy, no network, permission denied), stop trying after one attempt, write it under "Đang chờ người" in `status.md` with the command the human should run, and finish the tasks you can.

## Never
- Edit QA-owned test files to make them pass; if one looks wrong, write it in `status.md`.
- Edit committed migrations, `.env`, or the spec.
- Weaken a test or add `skip`/`only`.

## Done
All tasks ticked, `pnpm verify` green (if the sandbox blocks the DB, say so and list what you ran). Run handoff with "Lane tiếp theo: verify".
