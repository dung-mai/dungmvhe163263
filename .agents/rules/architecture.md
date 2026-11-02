# Rule: architecture boundaries

- Dependency direction: `domain` <- `application` <- `infrastructure` / `nest modules`. Domain and application never import `@nestjs/*` or `@prisma/client`.
- Nest modules wire things together (composition root). Controllers are thin: validate input, call an application service, map to a contract type.
- Prisma lives in infrastructure repositories. Map Prisma rows to domain objects before returning.
- `packages/contracts` is the only shape the storefront knows. Changing it is a public-contract change: design lane is mandatory.
- Storefront: server components fetch through `API_URL` or same-origin `/api/*`. No Prisma, no direct DB.
- Reuse existing components from `components/ui` (shadcn) and the `/design-system` route before adding new ones.
- New module checklist: module file, service, controller, DTO with validation, repository, unit tests for domain logic, integration test for the HTTP route.
