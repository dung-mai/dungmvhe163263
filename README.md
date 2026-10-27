# Flashlab

Storefront đồ điện tử và flash sale. pnpm workspace: Next.js App Router + Tailwind CSS v4 + shadcn/ui + NestJS + Prisma + PostgreSQL.

```text
apps/storefront        Giao diện, design system, browser tests
apps/api               Catalog, merchandising, promotions, Prisma migrations/seed
packages/contracts     Public API types, integer VND money strings
```

## Yêu cầu

Node.js 24 (pin trong `.node-version`), pnpm 11.25.0, Docker với Compose. GitHub/package registry và `binaries.prisma.sh` phải truy cập được để cài dependencies và tải Prisma engine có checksum.

## Chạy local

```sh
pnpm install --frozen-lockfile
cp apps/api/.env.example apps/api/.env  # Chỉ chạy nếu chưa có .env; giữ cấu hình riêng đang có.
pnpm db:up
pnpm db:generate
pnpm db:migrate
pnpm db:seed
pnpm dev
```

- Storefront: port **3000**, route `/`.
- Design system: route **`/design-system`**, dùng component thực tế của trang chủ.
- API: **127.0.0.1:4000**, prefix `/api`; Swagger `/api/docs` và `/api/docs-json`.
- PostgreSQL dev: **127.0.0.1:5432/flashlab**, test: **127.0.0.1:5433/flashlab_test**.

Compose credentials chỉ dành cho local development và đã ghi rõ trong `.env.example`. Với database khác, đổi `DATABASE_URL`. Nest tự đọc `.env` khi chạy dev/start; không commit `.env`. Frontend dùng `API_URL` mặc định `http://127.0.0.1:4000`, server fetch và proxy cùng origin `/api/*`. Khi đổi biến này, restart dev hoặc build lại production.

`pnpm db:migrate` áp dụng migration đã commit, không reset database. `pnpm db:seed` upsert các record demo, refresh các collection demo và không nhân đôi record. Campaign đang chạy giữ nguyên mốc thời gian khi seed lại; campaign hết hạn được gia hạn. Test database là service riêng dùng tmpfs, không phải nơi lưu dữ liệu lâu dài.

## Kiểm tra

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

- `pnpm test`: migration/seed **database test riêng**, API build, 2 domain tests và 9 HTTP/database integration tests. Runner từ chối TEST_DATABASE_URL nếu tên database khác `flashlab_test`.
- `pnpm test:e2e`: 12 browser checks (6 desktop + 6 mobile), tự khởi động API/Next dev nếu chưa chạy. Cần seed dev database trước. Lần đầu cài browser bằng `pnpm --filter @flashlab/storefront exec playwright install chromium`. Trong cloud đã có Chromium: `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium pnpm test:e2e`.
- Playwright lưu screenshot và trace khi cần trong `apps/storefront/test-results`, HTML report trong `playwright-report` (đã ignore).
- Dừng Next dev trước `pnpm build` vì cả hai dùng `.next`. Build xong chạy `pnpm start` để chạy production.

## API

| Endpoint                | Nội dung                                        |
| ----------------------- | ----------------------------------------------- |
| GET /api/health         | Kiểm tra app và kết nối DB                      |
| GET /api/home           | Hero, categories, 3 nhóm sản phẩm và flash sale |
| GET /api/categories     | Danh mục đã sắp thứ tự                          |
| GET /api/products       | Search, category, collection, page, limit       |
| GET /api/products/:slug | Chi tiết sản phẩm active                        |

`page` mặc định 1, `limit` mặc định 12, tối đa 48. Phân trang có thứ tự ổn định; sản phẩm draft không xuất hiện. Giá là chuỗi số nguyên VND (Decimal trong DB; BigInt khi format), không float. Promotion áp dụng trong khoảng `[startsAt, endsAt)` và không tăng giá gốc. Error response có requestId; mỗi response có x-request-id.

## Thiết kế và kiến trúc

- [Design system](docs/design-system.md): tokens, typography, grid, responsive và khác biệt chủ đích với ảnh mẫu.
- [Architecture](docs/architecture.md): module boundaries, dependency direction, pricing, logging.
- [Assets](docs/assets.md), [third-party notices](THIRD_PARTY_NOTICES.md).

Component shadcn đã được đưa vào `components/ui`, có `components.json` để quản lý. Không dùng Prisma types ở FE. Domain/application không import Nest hoặc Prisma; Nest module là composition root.

## Phạm vi demo

Catalog/home sử dụng API thật và PostgreSQL thật với dữ liệu seed. Có 34 record, gồm 1 draft và 1 SKU hết hàng để kiểm tra trạng thái. Hero/category/product ảnh được lưu local; một số ảnh là SVG minh họa.

Giỏ hàng và wishlist lưu trên thiết bị; chưa có checkout, đăng nhập, thanh toán, giữ tồn kho, admin hay quản lý review. Không có order API từ bộ khung cũ. Blog, chính sách, newsletter và account là nội dung demo: UI nói rõ khi chưa hỗ trợ và không giả vờ gửi email hoặc xử lý giao dịch. Review count/rating là dữ liệu mẫu, không phải thống kê người dùng thực.

## Cloud environment

Mỗi task đã được cách ly: dùng checkout hiện tại, không tạo Git worktree trừ khi người dùng yêu cầu. Với home read-only, export trước khi chạy pnpm:

```sh
export XDG_DATA_HOME=/workspace/.local/share
export XDG_CACHE_HOME=/workspace/.cache
export XDG_STATE_HOME=/workspace/.local/state
```

Dependency/cache là file, còn app và database là process cần khởi động lại. Chạy `pnpm db:up`, `pnpm db:migrate`, `pnpm db:seed` khi chuẩn bị demo database, sau đó `pnpm dev`. Volume DB nằm trong Docker daemon; không giả định volume được khôi phục trong cloud task mới. Nếu volume mới, migration/seed dựng lại catalog mẫu. Không tạo preview link localhost trong onboarding UI.
