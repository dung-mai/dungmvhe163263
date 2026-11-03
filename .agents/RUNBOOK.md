# RUNBOOK — AI delivery flow trên flashlab

**Một lệnh chạy cả dây chuyền.** Bạn đưa đề bài, hệ thống tự đi qua các lane, tự chọn model cho từng lane, tự chuyển engine khi hết quota, tự quay lại sửa khi review không đạt. Bạn chỉ trả lời ở các cổng duyệt.

```bash
pnpm ai product-sort "Thêm sắp xếp sản phẩm theo giá và mới nhất"
```

---

## 1. Lệnh này nghĩa là gì?

```
pnpm ai   <tên-feature>   "<đề bài>"
          ───────┬──────   ────┬────
                 │             └─ yêu cầu bằng lời, như nội dung một ticket Jira.
                 │                Viết càng rõ (API nào, màn hình nào, ràng buộc gì) thì spec càng đúng.
                 └─ tên ngắn kiểu kebab-case. Dùng làm thư mục work/<tên>/ và branch feat/<tên>.
```

Khi bạn chạy lệnh, chuyện sau xảy ra:

1. Tạo `work/product-sort/` (hồ sơ của feature) và branch `feat/product-sort`.
2. **Intake** (Claude) đọc đề bài, chọn profile và gắn cờ rủi ro. Ví dụ đề bài có "login", "admin", "giá" thì tự bật security review.
3. Chạy lần lượt các lane theo profile. Mỗi lane gọi đúng engine đã cấu hình. **Bạn không phải đổi model bằng tay.**
4. Dừng ở **gate** để bạn duyệt: `a` duyệt · `e` mở file sửa · `r` gõ góp ý để agent làm lại · `q` dừng, chạy tiếp sau.
5. Build và test-plan **chạy song song**. Verify và security **luôn dùng engine khác** engine đã build.
6. Review không đạt thì tự quay lại build để sửa, tối đa `MAX_FIX_ROUNDS` vòng (mặc định 2), rồi mới hỏi bạn.
7. Kết thúc: `pr.md` sẵn để tạo PR, `run-summary.md` ghi lane nào chạy model nào, mất bao lâu.

Dừng giữa chừng (`q`, Ctrl+C, hết quota mọi engine) thì gõ lại `pnpm ai product-sort` là chạy tiếp từ chỗ dở.

### Màn hình trông như thế nào

```
◆ AI delivery flow · rbac-login

  Profile: standard  · rủi ro: auth_or_roles, data_model  · tối đa 2 vòng sửa
  intake     claude    default                      fallback: codex → deepseek ✔
  define     claude    default                      fallback: codex → deepseek
  design     claude    default                      fallback: codex → deepseek ⏸ G1+G2
  test-plan  deepseek  deepseek/deepseek-v4-flash   fallback: codex → claude
  build      codex     default                      fallback: claude → deepseek-cc
  verify     claude    default                      fallback: codex → deepseek
  security   deepseek  deepseek/deepseek-v4-pro     fallback: claude → codex
  pr         deepseek  deepseek/deepseek-v4-flash   fallback: claude → codex ⏸ G3

▶ design → claude
✔ design (claude, 3m12s)

━━━ G1+G2 · cần bạn duyệt ━━━
  📄 work/rbac-login/spec.md  (64 dòng)
  📄 work/rbac-login/design.md  (88 dòng)
  📄 work/rbac-login/plan.md  (41 dòng)
  [a] duyệt   [e] mở file để sửa   [r] yêu cầu làm lại kèm góp ý   [q] dừng, chạy tiếp sau
  G1+G2 > a

⇉ Song song: test-plan ‖ build
▶ build → codex
⚠ build: codex dừng (exit 1, có vẻ hết quota/rate limit). Chuyển engine tiếp theo…
▶ build → claude
✔ test-plan (deepseek, 48s)
✔ build (claude, 14m03s)
▶ verify → deepseek          ← tự né claude vì claude vừa build
↺ Vòng sửa 1/2: quay lại build
…
◆ Xong
```

Mẫu trên lấy từ lần chạy thử bằng engine giả, chỉ đổi thời gian cho giống thật.

---

## 2. Cài đặt (15 phút, một lần)

```bash
git checkout -b factory/v1
# copy toàn bộ nội dung kit (kể cả .agents/, .claude/) vào root repo
bash scripts/ai/install.sh
git add -A && git commit -m "chore: add AI delivery kit v1"
```

`install.sh` thêm `pnpm ai` và `pnpm verify` vào `package.json`, link skills cho Claude Code, bổ sung `.gitignore`, và kiểm tra tool nào đã cài.

Đăng nhập ba engine, mỗi cái một lần:

| Engine | Cài | Đăng nhập |
| --- | --- | --- |
| Claude Code | `npm i -g @anthropic-ai/claude-code` | `claude` → login gói Pro |
| Codex | `npm i -g @openai/codex` | `codex` → sign in ChatGPT Plus |
| OpenCode (DeepSeek) | `curl -fsSL https://opencode.ai/install \| bash` | `opencode auth login` → DeepSeek → dán API key |

Rồi kiểm tra tên model DeepSeek: `opencode models deepseek`. Nếu khác `deepseek/deepseek-v4-flash` / `deepseek/deepseek-v4-pro`, sửa trong `.agents/models.env`.

Trước lần chạy thật đầu tiên, xem kế hoạch mà không gọi model nào:

```bash
pnpm ai product-sort "Thêm sắp xếp sản phẩm" --dry-run
```

---

## 3. Hai task để thử

**Task A — nhẹ, chạy trước để quen** (không có cờ rủi ro):

```bash
pnpm ai product-sort "GET /api/products nhận thêm sort=price_asc|price_desc|newest; không truyền thì giữ thứ tự hiện tại. Trang danh sách sản phẩm có dropdown Sắp xếp, giá trị lưu trên URL (?sort=). Sắp xếp theo giá sau khuyến mãi."
```

**Task B — thật, có rủi ro** (auth + schema, tự bật security):

```bash
pnpm ai rbac-login "Đăng nhập email + mật khẩu với 2 vai trò USER và ADMIN. Có trang /login và nút đăng xuất. ADMIN vào được /admin: danh sách sản phẩm đơn giản, bật/tắt active. USER và khách không vào được /admin và không gọi được API admin. Chưa cần đăng ký công khai; seed 1 admin và 1 user, mật khẩu lấy từ biến môi trường."
```

### Ở mỗi gate, nhìn gì

**G1+G2 (sau design)** — mở `spec.md`, `design.md`, `plan.md`:
- [ ] Có AC âm: USER gọi API admin → 403, khách vào /admin → về /login
- [ ] Ngoài phạm vi ghi rõ (đăng ký, quên mật khẩu, OAuth)
- [ ] Mật khẩu hash argon2/bcrypt; phiên trong cookie httpOnly; guard nằm ở API
- [ ] Migration mới, không sửa migration cũ; seed admin lấy từ env
- [ ] Task nhỏ, mỗi task có test trước

Chưa ổn thì gõ `r` rồi viết góp ý một dòng, ví dụ: `Thêm rate limit cho /login và AC cho trường hợp sai mật khẩu 5 lần`.

**G3 (sau pr)** — đọc `pr.md`, `review.md`, `security.md`, xem ảnh trong `evidence/`, rồi tạo PR:

```bash
gh pr create --body-file work/rbac-login/pr.md
```

---

## 4. Tinh chỉnh: tất cả nằm trong `.agents/models.env`

| Muốn | Sửa |
| --- | --- |
| Đổi engine cho một lane | `ENGINE_BUILD=claude` |
| Đổi model cho một lane | `MODEL_DESIGN=opus`, `MODEL_TEST_PLAN=deepseek/deepseek-v4-pro` |
| Đổi thứ tự dự phòng | `FALLBACK_BUILD="claude deepseek-cc"` |
| Cho sửa nhiều vòng hơn | `MAX_FIX_ROUNDS=3` |
| Engine hết quota bị bỏ qua bao lâu | `LIMIT_COOLDOWN_MIN=60` |
| Không tự commit artifact | `AUTO_COMMIT_ARTIFACTS=0` |

Profile và cờ rủi ro nằm trong `.agents/flow.yaml`. Ví dụ, muốn mọi thay đổi trong `apps/api/src/orders/**` đều bật security thì thêm path đó vào `risk_triggers`.

### Tùy chọn của lệnh

| Lệnh | Tác dụng |
| --- | --- |
| `pnpm ai <f>` | chạy tiếp feature đang dở |
| `pnpm ai <f> "..." --dry-run` | xem kế hoạch, không gọi model |
| `pnpm ai <f> "..." --yes` | tự duyệt mọi gate (chỉ nên dùng cho việc nhỏ) |
| `pnpm ai <f> "..." --profile vibe` | ép profile thay vì để intake chọn |
| `pnpm ai <f> --from build` | chạy lại từ lane build trở đi |
| `pnpm ai <f> --only verify` | chỉ chạy một lane |
| `pnpm ai <f> --quiet` | ẩn output của agent, chỉ hiện tiến trình |

Ba profile:
- **vibe:** intake → design (kèm AC ngắn) → build → verify. Một gate duy nhất là G2.
- **standard** (mặc định): đủ lane, gộp G1+G2 sau design, rồi G3.
- **full:** đủ lane, G1, G2, G3 tách riêng, security luôn chạy.

---

## 5. Muốn tự lái từng lane (để học, hoặc khi cần can thiệp)

Mọi lane là một skill trong `.agents/skills/`, nên bạn có thể mở bất kỳ tool nào và dán prompt kiểu:

```
Feature: rbac-login. Lane: design.
Đọc AGENTS.md, work/rbac-login/status.md, rồi làm theo .agents/skills/design/SKILL.md.
```

Hoặc chạy đúng một lane bằng engine đã định tuyến: `pnpm ai rbac-login --only design`.

Khi tự lái, nhớ dặn agent chạy skill `handoff` trước khi dừng, để `pnpm ai` chạy tiếp được từ `status.md`.

---

## 6. Sau mỗi feature: học từ lỗi

- Mỗi lần phải sửa tay hoặc agent làm sai, ghi một dòng vào `.agents/journal.md`.
- Xem `run-summary.md`: lane nào hay phải sửa vòng, lane nào hay chuyển engine.
- Chạy retro để biến chúng thành rule, hook, test, hoặc đổi routing:

```
Lane: retro. Làm theo .agents/skills/retro/SKILL.md cho feature rbac-login.
```

Lần đầu chạy, hãy để ý:
- Intake có chọn đúng profile và cờ rủi ro không?
- Codex có hiểu `status.md` do Claude viết không (và ngược lại)?
- Test-plan của DeepSeek có bám AC không, có bịa endpoint không?
- Có lane nào bị chuyển engine dù chưa hết quota không? Nếu có, gửi log trong `work/<f>/logs/` để chỉnh nhận diện.

---

## 7. Sự cố thường gặp

| Triệu chứng | Cách xử lý |
| --- | --- |
| `Không tìm thấy dòng VERDICT` | Agent quên dòng cuối trong review.md. Trả lời `y` để đi tiếp hoặc `n` để dừng; ghi journal |
| Lane bị chuyển engine liên tục | Xem `work/<f>/logs/*.log`: nếu engine thoát lỗi vì thiếu quyền chứ không phải quota, thêm quyền trong `.claude/settings.json` / `opencode.json` |
| Codex không chạy được test DB | Sandbox chặn mạng: đặt `CODEX_SANDBOX=danger-full-access` trong models.env **chỉ trên máy cá nhân**, hoặc tự chạy `pnpm test` |
| `opencode run` đứng chờ quyền bash | Lệnh không nằm trong danh sách allow của `opencode.json`; thêm pattern |
| DeepSeek báo sai model | `opencode models deepseek`, sửa `models.env` và `opencode.json` |
| Claude Code không thấy skills | `.claude/skills` phải là link tới `.agents/skills`; trên Windows chạy lại `install.sh` sau khi sửa skill |
| Chạy trên Windows | Dùng Git Bash hoặc WSL cho `install.sh`; `pnpm ai` tự chuyển prompt sang file để tránh lỗi shell |
| Muốn làm lại một lane | `pnpm ai <f> --from <lane>` |
