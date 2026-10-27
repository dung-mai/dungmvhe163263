# Flashlab architecture

## Modules

- Catalog: products, variants (SKU/pricing/availability), images, brands, categories.
- Merchandising: banners, collections, homepage assembly.
- Promotions: pure flash-sale time/pricing rules. Persisted via Prisma; not an inventory reservation/payment system.

Dependency: HTTP controller -> use case -> repository interface <- Prisma adapter. Domain/application have no NestJS/Prisma import. Nest modules are composition roots. Prisma records map to transport contracts; no ORM types exported to FE. `packages/contracts` contains public DTO types and Money string format only.

All amounts are integer VND strings, backed by PostgreSQL Decimal(18,0). Frontend formats with BigInt. Active sale interval is [startsAt, endsAt); when several sales overlap the lowest active price wins. Sale never raises base price. Original comparison price is only exposed when higher than actual effective price. Listing hides draft products. Catalog pagination is bounded and stable.

## API

`GET /api/home`, `/api/categories`, `/api/products?search=&category=&collection=&page=1&limit=12`, `/api/products/:slug`, `/api/health` (database probe). Swagger UI `/api/docs`, OpenAPI `/api/docs-json`. Product/home DTO examples are in OpenAPI. Missing products 404; bad queries 400; unexpected errors return a generic message. Responses include x-request-id; error JSON includes requestId.

## Logging

Pino HTTP: generated or validated request ID, method, path without query, status, duration. Pretty dev logs, JSON production logs, silent test logs. Headers, raw request bodies, query values and customer credentials are not logged by serializers. Unexpected server errors are recorded internally, sanitized errors sent to clients. No authentication/payment requests are implemented.

## Frontend

Server page loads home with no-store; client sections handle carousel, countdown, local cart/wishlist, panels. Countdown uses server-time offset, refreshes server data at campaign boundary. API failure produces a real error state and retry. Browser search requests are cancelable, loading/empty/error states explicit. No silent fallback from database failure to static catalog.

## Demo boundaries

Static editorial/service/newsletter/account content; 34 seeded catalog entries including a draft product and an unavailable variant. Prices, ratings and campaign stock status are demo data. No order API, real checkout, auth, payment, inventory, review management or admin. Existing starter order endpoint was removed as part of approved catalog/home replacement. Cart snapshots are client-local, untrusted and never used for server charging.
