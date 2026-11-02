# Rule: testing

- Each AC in `spec.md` maps to at least one test. Test names reference the AC id: `it('AC-3: user cannot open /admin', ...)`.
- TDD in the build lane: write the failing test, run it, implement, run it again.
- API: domain logic -> unit test; HTTP route -> integration test against the test DB (`flashlab_test`, port 5433).
- UI flows that touch auth, money or checkout -> Playwright e2e, desktop and mobile project.
- Tests never depend on real time; inject a clock. No sleeps.
- Keep output small: run the narrowest test command first (`pnpm --filter @flashlab/api test -- <pattern>`), full `pnpm verify` at the end.
