# Rule: architecture boundaries (matches docs/architecture.md)

## API (`apps/api/src`)
- One folder per bounded module: `modules/<name>/`
  - `domain/` — entities, pure rules, repository interfaces (e.g. `catalog.repository.ts`, `promotions/domain/sale.ts`)
  - `application/` — use cases (e.g. `catalog.use-cases.ts`, `merchandising/application/get-home.ts`)
  - `infrastructure/` — Prisma adapters implementing the domain interfaces (`prisma-<name>.repository.ts`)
  - `presentation/` — controllers and OpenAPI docs (`<name>.controller.ts`, `<name>.openapi.ts`)
  - `<name>.module.ts` — Nest composition root, the only place that wires interfaces to adapters
- Dependency: controller -> use case -> repository interface <- Prisma adapter. `domain/` and `application/` import neither `@nestjs/*` nor Prisma.
- Shared pieces: `common/api-exception.filter.ts` (error JSON with `requestId`), `infrastructure/app-logger.ts` (Pino), `infrastructure/prisma.service.ts`, `infrastructure/persistence.module.ts`.
- Errors: missing resource 404, bad query 400, unexpected 500 with a generic message. Keep the `requestId` shape.
- Logging: never add headers, raw bodies, query values or credentials to log serializers.
- Every new endpoint gets OpenAPI docs in `presentation/<name>.openapi.ts`.

## Contracts (`packages/contracts/src/index.ts`)
- The only shape the storefront knows. Changing it is a public-contract change: design lane is mandatory.

## Storefront (`apps/storefront`)
- Read `apps/storefront/AGENTS.md` first (Next.js 16 differs from training data; read `node_modules/next/dist/docs/`).
- Routes in `app/`, feature code in `features/<feature>/{api,components}`, shared UI in `components/ui` (shadcn), helpers in `lib/` (`lib/api/client.ts`, `lib/formatters.ts`).
- Server components fetch through `lib/api/client.ts`. No Prisma, no direct DB.
- Reuse components from `components/ui` and check the `/design-system` route before adding new ones.
- Explicit loading / empty / error states; no silent fallback to static data.
