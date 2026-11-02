# Knowledge — flashlab

Product context for agents. Update this when the product changes; keep it factual.

## Product
- Electronics storefront with flash sales. Demo scope: catalog, home merchandising, flash sale, cart and wishlist stored on the device.
- Not built yet (as of the README): checkout, login, payment, stock reservation, admin, reviews management.
- Blog, policy, newsletter, account pages are demo content; the UI says when something is not supported.

## Data
- Seed: 34 records including 1 draft product and 1 out-of-stock SKU. `pnpm db:seed` upserts and never duplicates.
- Draft products never appear in public endpoints.

## Public API (prefix /api)
| Endpoint | Purpose |
| --- | --- |
| GET /health | app + DB check |
| GET /home | hero, categories, 3 product groups, flash sale |
| GET /categories | ordered categories |
| GET /products | search, category, collection, page (default 1), limit (default 12, max 48) |
| GET /products/:slug | active product detail |

- Every response has `x-request-id`; errors include `requestId`.
- Pagination order is stable.

## Glossary
- Collection: curated product group on the home page.
- Campaign / flash sale: time-boxed promotion `[startsAt, endsAt)`.

## Decisions to remember
- (add ADR links here, e.g. docs/adr/0001-auth-cookie-jwt.md)
