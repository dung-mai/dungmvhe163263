# Plan — {{feature}}

Mỗi task nhỏ (≤ 30 phút cho agent), có test trước, có lệnh kiểm tra.

## Tasks
- [ ] **T1** — <việc>
  - Files: 
  - Test trước: 
  - Kiểm tra: `pnpm --filter @flashlab/api exec tsx --test test/<name>.test.ts` (unit) hoặc `pnpm test` (integration)
  - AC: AC-1
  - Mode: ai
- [ ] **T2** — <việc cần người, ví dụ chạy migration trên DB thật, đặt secret, quyết định giao diện>
  - Mode: human
  - Người làm / lệnh: 

## Tests do QA sở hữu (lane test-plan viết, build không sửa)
- (mỗi file một dòng, đường dẫn trong dấu backtick, ví dụ `apps/api/test/<name>.test.mjs`, `apps/storefront/e2e/<name>.spec.ts`)
- Orchestrator chốt các file này sau khi test-plan và build xong. Build bớt assertion, thêm skip/only hoặc xóa file thì flow dừng.
- File test API mới phải được thêm vào `apps/api/scripts/test.mjs` (ghi rõ task nào làm việc này)

## Mode của task
- `Mode: ai` (mặc định): agent làm được và kiểm được bằng test tự động, không chạm hệ thống thật.
- `Mode: human`: cần hệ thống thật (migration trên DB thật, secret, key thanh toán, thao tác trên môi trường chung) hoặc cần phán đoán của người (giao diện, nội dung). Agent không làm; orchestrator dừng trước verify để bạn làm xong và xác nhận.

## Thứ tự & phụ thuộc
T1 → T2 → …

## Done khi
- [ ] Tất cả task tick
- [ ] `pnpm verify` xanh
- [ ] Mọi AC có test
