# Plan — {{feature}}

Mỗi task nhỏ (≤ 30 phút cho agent), có test trước, có lệnh kiểm tra.

## Tasks
- [ ] **T1** — <việc>
  - Files: 
  - Test trước: 
  - Kiểm tra: `pnpm --filter @flashlab/api exec tsx --test test/<name>.test.ts` (unit) hoặc `pnpm test` (integration)
  - AC: AC-1
- [ ] **T2** — 

## Tests do QA sở hữu (lane test-plan viết, build không sửa)
- (đường dẫn file test mới, ví dụ `apps/api/test/<name>.test.mjs`, `apps/storefront/e2e/<name>.spec.ts`)
- File test API mới phải được thêm vào `apps/api/scripts/test.mjs` (ghi rõ task nào làm việc này)

## Thứ tự & phụ thuộc
T1 → T2 → …

## Done khi
- [ ] Tất cả task tick
- [ ] `pnpm verify` xanh
- [ ] Mọi AC có test
