# Rule: testing

## Where tests live and how they run
- API unit tests (pure domain/application): `apps/api/test/<name>.test.ts`, run with tsx. Example: `test/promotions.test.ts`.
- API HTTP/DB integration tests: `apps/api/test/<name>.test.mjs`, run with `node --test` against the built app and the `flashlab_test` DB. Example: `test/catalog.test.mjs`.
- `apps/api/scripts/test.mjs` lists every test file explicitly. **A new file must be added there**, or it never runs. The sensor `node .agents/sensors/check-test-registry.mjs` (part of `pnpm verify`) fails if you forget.
- Storefront e2e: `apps/storefront/e2e/<name>.spec.ts` (Playwright, desktop + mobile projects). Example: `e2e/home.spec.ts`.

## Commands (narrowest first, keep output small)
- One unit file: `pnpm --filter @flashlab/api exec tsx --test test/<name>.test.ts`
- All API tests (needs `pnpm db:up`): `pnpm test`
- E2E (needs seeded dev DB): `pnpm test:e2e`
- Full gate: `pnpm verify` = lint + typecheck + test-registry sensor + `pnpm test`

## Rules
- Each AC in `spec.md` maps to at least one test; the test name starts with the AC id: `test('AC-3: user cannot open /admin', ...)`.
- TDD in the build lane: write the failing test, run it, implement, run it again.
- Domain logic -> unit test. HTTP route -> integration test. UI flows touching auth, money or checkout -> e2e.
- Tests never depend on real time; inject a clock. No sleeps. No `.only` / `.skip` left behind.
- Integration tests reuse the existing seed; add seed data in `apps/api/prisma/seed.ts` (idempotent upserts) instead of inserting ad-hoc rows.
