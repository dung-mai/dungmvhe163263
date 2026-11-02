# Plan — {{feature}}

Mỗi task nhỏ (≤ 30 phút cho agent), có test trước, có lệnh kiểm tra.

## Tasks
- [ ] **T1** — <việc>
  - Files: 
  - Test trước: 
  - Kiểm tra: `pnpm --filter @flashlab/api test -- <pattern>`
  - AC: AC-1
- [ ] **T2** — 

## Tests do QA sở hữu (lane test-plan viết, build không sửa)
- (đường dẫn file test e2e/integration mới, nếu có)

## Thứ tự & phụ thuộc
T1 → T2 → …

## Done khi
- [ ] Tất cả task tick
- [ ] `pnpm verify` xanh
- [ ] Mọi AC có test
