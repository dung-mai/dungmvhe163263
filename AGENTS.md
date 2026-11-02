# AGENTS.md — flashlab

Storefront + flash sale. pnpm workspace: `apps/storefront` (Next.js 16, App Router, Tailwind v4, shadcn/ui),
`apps/api` (NestJS 12 + Prisma 7 + PostgreSQL), `packages/contracts` (public API types). Node 24.

## Commands
- DB: `pnpm db:up && pnpm db:migrate && pnpm db:seed` · Dev: `pnpm dev` (web :3000, API 127.0.0.1:4000/api)
- Fast check: `pnpm lint && pnpm typecheck` · Full gate before "done": `pnpm verify`
- API tests: `pnpm test` (migrates + seeds the test DB, builds, runs the files listed in `apps/api/scripts/test.mjs`)
- One unit test file: `pnpm --filter @flashlab/api exec tsx --test test/<name>.test.ts` (no DB)
- E2E: `pnpm test:e2e` (Playwright in `apps/storefront/e2e/`, needs seeded dev DB)
- New migration: `pnpm --filter @flashlab/api exec prisma migrate dev --name <name>` (dev DB must be up)

## Hard rules
1. Money is an integer VND string in contracts, Decimal(18,0) in DB, BigInt when formatting. Never float.
2. Domain/application never import Nest or Prisma. Layout: `apps/api/src/modules/<name>/{domain,application,infrastructure,presentation}` + `<name>.module.ts` as composition root.
3. Frontend never imports Prisma types; it uses `packages/contracts`.
4. Promotions apply on `[startsAt, endsAt)`, lowest active price wins, never above base price.
5. Never edit committed migrations, `.env`, or run `prisma migrate reset`. New settings go to `.env.example`.
6. Authorization is enforced on the API, not only in the UI. Never log credentials, headers or request bodies.
7. Every new API test file must be added to `apps/api/scripts/test.mjs` (a sensor in `pnpm verify` checks it).
8. Before touching `apps/storefront`, read `apps/storefront/AGENTS.md`: this Next.js version differs from training data (check `node_modules/next/dist/docs/`; e.g. request interception may be `proxy.ts`, not `middleware.ts`).
9. Stay inside the files listed in the current `plan.md`; note any extra file in `status.md`.

## How we work (AI delivery flow)
- Each feature lives in `work/<feature>/` (brief, spec, design, plan, test-plan, review, status, evidence).
- Lanes, profiles, risk triggers: `.agents/flow.yaml`. One skill per lane in `.agents/skills/<lane>/SKILL.md`.
- Rules: `.agents/rules/*.md`. Product context: `knowledge/flashlab.md`, `docs/architecture.md`.
- If a feature is named, start by reading `work/<feature>/status.md`. Before stopping, run the `handoff` skill.
- Stop at human gates (G1 scope, G2 design, G3 merge). Never start the next lane yourself.

## Style
- Artifacts in `work/` in Vietnamese; code, identifiers, commits and comments in English.
- Commits: `feat(<feature>): T<n> <what>`, one task per commit, stage only the task's files.
