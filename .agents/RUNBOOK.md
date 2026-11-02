# RUNBOOK — chạy thử AI delivery flow trên flashlab

Tài liệu này để **làm theo từng bước và copy prompt**. Mọi prompt đều trỏ tới file skill, nên dán vào Claude Code, Codex hay OpenCode đều chạy được.

---

## 0. Cài đặt (15 phút, một lần)

```bash
# ở root repo flashlab, trên branch mới
git checkout -b factory/v1
# copy toàn bộ nội dung kit vào root repo (giữ nguyên các thư mục ẩn .agents, .claude)
bash scripts/ai/install.sh
git add -A && git commit -m "chore: add AI delivery kit v1"
```

`install.sh` làm 4 việc: link `.claude/skills → .agents/skills`, thêm script `pnpm verify`, thêm `.gitignore`, kiểm tra tool nào đã cài.

DeepSeek (chỉ cần cho lane test-plan, security, pr):

1. Tạo API key ở platform.deepseek.com, nạp ít tiền (vài USD là đủ thử).
2. `opencode auth login` → chọn DeepSeek → dán key.
3. `opencode models deepseek` → kiểm tra tên model, sửa `.agents/models.env` nếu khác `deepseek/deepseek-v4-flash` / `deepseek/deepseek-v4-pro`.

Kiểm tra nhanh mỗi tool đã thấy skills:

| Tool | Gõ | Kỳ vọng |
| --- | --- | --- |
| Claude Code | `claude` rồi hỏi "Liệt kê skills trong repo này" | thấy intake, define, design... |
| Codex | `codex` rồi gõ `/skills` hoặc `$` | thấy cùng danh sách (đọc từ `.agents/skills`) |
| OpenCode | `opencode` rồi hỏi "Liệt kê skills" | thấy cùng danh sách |

---

## 1. Chọn task để thử

| Task | Slug | Profile dự kiến | Vì sao chọn |
| --- | --- | --- | --- |
| A · Sắp xếp sản phẩm (nhẹ) | `product-sort` | vibe hoặc standard | Không có cờ rủi ro, đi hết flow trong ~1 giờ, học cơ chế |
| B · Đăng nhập + phân quyền USER/ADMIN | `rbac-login` | standard, bật security + e2e | Chạm auth và schema: thấy rõ giá trị của gate, test-plan độc lập, review chéo |

Nên chạy **A trước** để quen, rồi B.

```bash
# Task A
scripts/ai/new-feature.sh product-sort "Thêm sắp xếp sản phẩm: GET /api/products nhận sort=price_asc|price_desc|newest (mặc định giữ thứ tự hiện tại). Trang danh sách có dropdown Sắp xếp, giữ giá trị trên URL. Giá sau khuyến mãi là giá dùng để sắp xếp."

# Task B
scripts/ai/new-feature.sh rbac-login "Thêm đăng nhập email + mật khẩu với 2 vai trò USER và ADMIN. Có trang /login và nút đăng xuất. ADMIN vào được /admin: trang danh sách sản phẩm đơn giản, bật/tắt trạng thái active. USER và khách không vào được /admin và không gọi được API admin. Không có đăng ký công khai ở bản này; tạo 1 admin và 1 user mẫu qua seed, mật khẩu lấy từ biến môi trường."
```

---

## 2. Bảng định tuyến (ai làm lane nào)

Mặc định trong `.agents/models.env`. Sửa file đó để đổi.

| Lane | Engine | Model gợi ý | Vì sao |
| --- | --- | --- | --- |
| 0 intake | Claude Code | sonnet | nhanh, đủ phân loại |
| 1 define | Claude Code | sonnet (opus nếu mơ hồ) | cần hỏi đáp tốt |
| 2 design | Claude Code | opus nếu quota còn, không thì sonnet | suy luận kiến trúc |
| 3 test-plan | OpenCode | deepseek-v4-flash | việc nhiều, rẻ, độc lập với người code |
| 3 build | Codex | mặc định của Codex | gói Plus, code tốt, khác hãng với reviewer |
| 4 verify | Claude Code | sonnet + subagent `reviewer` | khác engine với build |
| 4 security | OpenCode | deepseek-v4-pro | khác hãng với cả build và verify, vẫn rẻ |
| 4 pr | OpenCode | deepseek-v4-flash | viết mô tả, việc đơn giản |
| 6 retro | Claude Code | sonnet | tổng hợp, đề xuất |

Đổi model trong session: Claude Code `/model`, Codex `/model`, OpenCode `/models`.

---

## 3. Chạy tương tác — task B `rbac-login` (khuyến nghị để học)

Mở VS Code ở root repo, mở 2–3 terminal. Mỗi lane: mở đúng tool, dán prompt, kiểm tra gate, rồi chuyển lane.

### Lane 0 · Intake — Claude Code

```
Feature: rbac-login. Lane: intake.
Đọc AGENTS.md và work/rbac-login/brief.md, rồi làm theo .agents/skills/intake/SKILL.md.
```

Kiểm tra: profile = standard, cờ `auth_or_roles` và `data_model` được bật, security + e2e có trong lane list. Nếu agent chọn vibe là sai: sửa lại và ghi journal.

### Lane 1 · Define — Claude Code (cùng session hoặc session mới)

```
Feature: rbac-login. Lane: define.
Làm theo .agents/skills/define/SKILL.md. Hỏi tôi các câu hỏi mở trong một tin nhắn trước khi chốt spec.
```

**Gate G1 — bạn kiểm:**
- [ ] Bảng vai trò có cột "Không được làm" cho USER và khách
- [ ] Có AC âm: USER gọi API admin → 403; khách vào /admin → chuyển về /login
- [ ] Ngoài phạm vi ghi rõ: đăng ký, quên mật khẩu, OAuth
- [ ] Mỗi AC máy kiểm được

Trả lời `G1 ok` hoặc sửa thẳng vào spec.md.

### Lane 2 · Design — Claude Code (`/model opus` nếu còn quota)

```
Feature: rbac-login. Lane: design. G1 đã duyệt.
Làm theo .agents/skills/design/SKILL.md. Dùng subagent explorer để tìm pattern module, error/requestId, test helper và seed hiện có trước khi thiết kế.
```

**Gate G2 — bạn kiểm:**
- [ ] Mật khẩu hash bằng argon2id hoặc bcrypt, không lộ ra response/log
- [ ] Phiên đăng nhập trong cookie httpOnly, không localStorage
- [ ] Guard ở API (ví dụ JwtAuthGuard + RolesGuard + decorator `@Roles('ADMIN')`), Next.js chặn `/admin` chỉ là lớp phụ
- [ ] Migration mới thêm `User` + enum `Role`, không sửa migration cũ
- [ ] Seed admin lấy mật khẩu từ env, có dòng mới trong `.env.example`
- [ ] Có rate limit cho login
- [ ] plan.md chia task nhỏ, có mục "Tests do QA sở hữu"

Trả lời `G2 ok`. Commit artifacts: `git add work/rbac-login && git commit -m "docs(rbac-login): spec + design"`.

### Lane 3 · Build ‖ Test-plan — chạy song song 2 terminal

**Terminal 1 — Codex (build):**

```
Feature: rbac-login. Lane: build. G2 đã duyệt.
Đọc AGENTS.md, work/rbac-login/status.md, plan.md, design.md.
Làm theo .agents/skills/build/SKILL.md, từng task một, commit từng task.
Sau mỗi task chạy: pnpm lint && pnpm typecheck và lệnh kiểm tra của task.
```

**Terminal 2 — OpenCode + DeepSeek (test-plan):**

```
Feature: rbac-login. Lane: test-plan.
Làm theo .agents/skills/test-plan/SKILL.md. Chỉ đọc spec.md và mục "Tests do QA sở hữu" trong plan.md.
Không đọc file mà các task trong plan.md đang sửa, không chạy git diff.
```

Lưu ý:
- Codex mặc định chặn mạng trong sandbox. Nếu test cần Postgres ở localhost mà bị chặn, cho phép mạng cho phiên đó: `codex -c sandbox_workspace_write.network_access=true`, hoặc tự chạy `pnpm test` ở terminal 3.
- Hai agent ghi file khác nhau trong cùng thư mục. Build chỉ `git add` file của task, nên không lẫn test của QA.

### Lane 4 · Verify — Claude Code (khác Codex đã build)

```
Feature: rbac-login. Lane: verify.
Làm theo .agents/skills/verify/SKILL.md. Giao phần review diff cho subagent reviewer.
Chạy pnpm verify và pnpm test:e2e. Chụp ảnh /login, /admin (admin), /admin (user bị chặn) ở desktop và mobile vào work/rbac-login/evidence/.
```

Nếu kết luận "back to build": quay lại terminal Codex: `Đọc work/rbac-login/review.md, sửa các blocker, rồi chạy lại skill build cho phần còn lại.`

### Lane 4 · Security — OpenCode (`/models` → deepseek-v4-pro)

```
Feature: rbac-login. Lane: security.
Làm theo .agents/skills/security-review/SKILL.md. Ghi kết quả vào work/rbac-login/security.md. Không sửa code.
```

### Lane 4 · PR — OpenCode (deepseek-v4-flash)

```
Feature: rbac-login. Lane: pr.
Làm theo .agents/skills/create-pr/SKILL.md. Chỉ ghi pr.md, không tạo PR.
```

**Gate G3 — bạn:** đọc pr.md + review.md + security.md, xem ảnh, rồi tự `gh pr create --body-file work/rbac-login/pr.md` hoặc bảo agent làm.

### Lane 6 · Retro — Claude Code (sau khi merge)

```
Lane: retro. Làm theo .agents/skills/retro/SKILL.md cho feature rbac-login.
```

---

## 4. Chạy bán tự động — task A `product-sort`

Mỗi lệnh chạy một lane trên engine trong `models.env`, log nằm ở `work/<feature>/logs/`.

```bash
scripts/ai/step.sh intake product-sort
scripts/ai/step.sh define product-sort      # rồi đọc spec.md, sửa nếu cần  -> G1
scripts/ai/step.sh design product-sort      # đọc design.md + plan.md       -> G2
scripts/ai/step.sh test-plan product-sort & # chạy nền, DeepSeek
scripts/ai/step.sh build product-sort       # Codex
wait
scripts/ai/step.sh verify product-sort      # Claude
scripts/ai/step.sh pr product-sort          # DeepSeek                      -> G3
```

Thử đổi engine cho một lane mà không sửa file: `scripts/ai/step.sh build product-sort claude`.

Chế độ headless không hỏi lại bạn được, nên câu hỏi mở nằm trong artifact. Với lane có gate (define, design), chế độ tương tác ở mục 3 thường cho kết quả tốt hơn.

---

## 5. Khi hết quota giữa chừng

1. Nếu tool còn trả lời được: `Chạy skill handoff ngay.`
2. Mở tool khác, dán:

```
Feature: <slug>. Đọc AGENTS.md rồi work/<slug>/status.md.
Tiếp tục đúng lane đang dở theo skill tương ứng trong .agents/skills/. Không làm lại phần đã xong.
```

3. Ghi một dòng vào `.agents/journal.md`: lane nào, tool nào hết quota, tool mới có hiểu status.md không.

---

## 6. Sau mỗi task: ghi journal

Mỗi lần bạn phải sửa tay hoặc agent làm sai, ghi một dòng vào `.agents/journal.md`. Cuối tuần chạy lane retro để biến chúng thành rule, hook, test hoặc đổi routing.

Những thứ nên quan sát lần đầu:
- Agent có tự nạp đúng skill không, hay phải trỏ đường dẫn?
- Codex có hiểu status.md do Claude viết không (và ngược lại)?
- DeepSeek viết test-plan có bám AC không, có bịa endpoint không?
- Stop hook của Claude có bắt được lỗi lint/typecheck không?
- Chi phí DeepSeek mỗi lane (xem `opencode stats`).

---

## 7. Sự cố thường gặp

| Triệu chứng | Cách xử lý |
| --- | --- |
| Claude Code không thấy skills | Kiểm tra `.claude/skills` là link tới `.agents/skills`; trên Windows chạy lại `install.sh` sau mỗi lần sửa skill |
| Stop hook chạy mãi | Hook tự thoát khi `stop_hook_active`; nếu vẫn lặp, sửa lỗi lint thủ công rồi chạy lại |
| `opencode run` đứng chờ quyền bash | Lệnh đó không nằm trong danh sách allow của `opencode.json`; thêm pattern hoặc chạy tương tác |
| Codex không chạy được test DB | Xem lưu ý mạng sandbox ở lane 3 |
| DeepSeek báo sai model | `opencode models deepseek`, sửa tên trong `models.env` và `opencode.json` |
| Hook chặn lệnh bạn cần | Tự chạy lệnh đó, hoặc sửa pattern trong `.agents/hooks/block-dangerous.sh` (ghi journal lý do) |
