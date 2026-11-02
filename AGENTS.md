# AGENTS.md — flashlab

Storefront + flash sale. pnpm workspace: `apps/storefront` (Next.js App Router, Tailwind v4, shadcn/ui),
`apps/api` (NestJS + Prisma + PostgreSQL), `packages/contracts` (public API types).

## Commands
- Install: `pnpm install --frozen-lockfile`
- DB: `pnpm db:up && pnpm db:migrate && pnpm db:seed`
- Dev: `pnpm dev` (storefront :3000, API 127.0.0.1:4000/api, Swagger /api/docs)
- Gate before saying "done": `pnpm verify` (= lint + typecheck + test). Fast check: `pnpm lint && pnpm typecheck`
- E2E: `pnpm test:e2e` (needs seeded dev DB)

## Hard rules
1. Money is an integer VND string in contracts, Decimal in DB, BigInt when formatting. Never float.
2. Domain/application code must not import Nest or Prisma. Nest modules are the composition root.
3. Frontend never imports Prisma types; it uses `packages/contracts`.
4. Promotions apply on `[startsAt, endsAt)` and never raise the base price.
5. Never edit committed migrations; create a new one. Never run `prisma migrate reset` or touch `.env`.
6. Authorization is enforced on the API, not only in the UI.
7. Keep changes inside the files listed in the current `plan.md`; note any extra file in `status.md`.

## How we work (AI delivery flow)
- Every feature lives in `work/<feature>/` (brief, spec, design, plan, test-plan, review, status, evidence).
- Lanes and gates: `.agents/flow.yaml`. Each lane has a skill in `.agents/skills/<lane>/SKILL.md`.
- Rules: `.agents/rules/*.md` (read the ones a skill points to). Product context: `knowledge/`.
- Start any session by reading `work/<feature>/status.md` if a feature is named.
- Before stopping (done, blocked, or out of quota) run the `handoff` skill.
- Stop at human gates (G1 scope, G2 design, G3 merge). Do not start the next lane yourself.

## Writing style
- Artifacts in `work/` in Vietnamese; code, identifiers, commits and code comments in English.
- Commits: `feat(<feature>): T<n> <what>` / `fix(<feature>): ...`. One task per commit.
