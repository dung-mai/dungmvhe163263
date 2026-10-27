# Flashlab validation

Validated in the current cloud instance on 2026-10-27.

| Check                          | Result                                                                |
| ------------------------------ | --------------------------------------------------------------------- |
| pnpm install --frozen-lockfile | Passed                                                                |
| Prisma generate                | Passed, official engine/checksum verification preserved               |
| Prisma migrate deploy          | Passed on dev and separate test PostgreSQL                            |
| Seed repeatability             | Seed run twice on dev, still 34 product records                       |
| pnpm test                      | 2 promotion-domain tests + 9 HTTP/PostgreSQL integration tests passed |
| pnpm lint                      | Passed for all workspaces                                             |
| pnpm typecheck                 | Passed for all workspaces                                             |
| pnpm build                     | NestJS + Next.js production builds passed                             |
| pnpm peers check               | No peer dependency issues                                             |
| pnpm test:e2e                  | 12 passed against running production apps, 6 desktop + 6 mobile       |
| Compose health                 | Dev and test DB healthy                                               |

Browser coverage: selected homepage sections, all local images loading, no horizontal page overflow, client exceptions, search/category/collection panels, empty search, API error/retry, cart/wishlist persistence, quantity changes, carousel, newsletter demo disclosure, design-system states. Browser size: desktop 1440×1000; mobile 390×664 via Playwright iPhone 13 profile. Asset checks force eager loading in tests so below-fold/hidden images are also verified.

Screenshots from the passing production browser run:

- [Desktop](screenshots/home-desktop.png)
- [Mobile](screenshots/home-mobile.png)

The two user-supplied screenshots were used for manual visual comparison: header/nav hierarchy, center hero with side slides, seven category tiles, six bestseller cards, two New In banners, asymmetric arrivals grid, full-width campaign, five-item sale row, three editorial cards, service tiles, newsletter strip and dark column footer. Intentional content/image substitutions are documented in design-system.md. No automated pixel-diff against the original uploaded files was performed.

Current-instance verification and saved environment configuration do not establish publication or fresh-task restoration. Source files are not committed or pushed.
