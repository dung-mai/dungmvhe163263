# Knowledge — flashlab

Product context for agents. Source of truth for architecture: `docs/architecture.md`. Keep this file factual and short.

## Product
- Electronics storefront with flash sales. Real API + PostgreSQL for catalog and home; seed data.
- Not built yet: checkout, orders, login/auth, payment, inventory reservation, admin, review management.
- Cart and wishlist are client-local snapshots, untrusted, never used for server charging.
- Blog, policy, newsletter, account pages are demo content; the UI says when something is not supported.

## Stack (versions matter: training data may be older)
- Storefront: Next.js 16.4, React 19.3, Tailwind v4, shadcn/ui. Read `apps/storefront/AGENTS.md` first.
- API: NestJS 12, Prisma 7 (`apps/api/prisma.config.ts`), class-validator, Pino logging.
- Node 24, pnpm 11.

## Modules (apps/api/src/modules)
- catalog: products, variants (SKU, pricing, availability), images, brands, categories.
- merchandising: banners, collections, home assembly.
- promotions: pure flash-sale time/price rules (`domain/sale.ts`). Not inventory, not payment.

## Business rules
- Money: integer VND string, Decimal(18,0) in DB, BigInt when formatting.
- Active sale interval `[startsAt, endsAt)`; overlapping sales -> lowest active price wins; a sale never raises base price.
- The original comparison price is exposed only when it is higher than the effective price.
- Listing hides draft products; pagination is bounded (limit max 48) and stable.

## Public API (prefix /api)
| Endpoint | Purpose |
| --- | --- |
| GET /health | app + DB probe |
| GET /home | hero, categories, product groups, flash sale |
| GET /categories | ordered categories |
| GET /products | search, category, collection, page (1), limit (12, max 48) |
| GET /products/:slug | active product detail, 404 when missing |

- Bad query 400, unexpected 500 with a generic message. Every response has `x-request-id`; error JSON has `requestId`.
- Swagger UI `/api/docs`, OpenAPI JSON `/api/docs-json`.

## Data
- 34 seeded catalog entries, including 1 draft product and 1 unavailable variant. `pnpm db:seed` upserts, never duplicates; running campaigns keep their times, expired ones are extended.
- Test DB is a separate tmpfs service `flashlab_test` on port 5433.

## Tests today
- `apps/api/test/promotions.test.ts` (2 domain tests), `apps/api/test/catalog.test.mjs` (9 HTTP/DB tests), listed in `apps/api/scripts/test.mjs`.
- `apps/storefront/e2e/home.spec.ts`: 12 checks (6 desktop + 6 mobile).

## Decisions to remember
- (add ADR links here, e.g. docs/adr/0001-auth-cookie-jwt.md)
