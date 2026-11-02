# flashlab AI kit v1

Bộ khung AI delivery flow, độc lập với tool: cùng một bộ rules + skills cho Claude Code, Codex và OpenCode (DeepSeek).

**Cách dùng:** copy mọi thứ trong thư mục này (kể cả `.agents/`, `.claude/`) vào root repo flashlab, chạy `bash scripts/ai/install.sh`, rồi mở `.agents/RUNBOOK.md`.

```
AGENTS.md                         rules chung, mọi tool đều đọc (< 60 dòng)
CLAUDE.md                         @AGENTS.md + ghi chú riêng Claude Code
opencode.json                     OpenCode: model DeepSeek mặc định + quyền bash
.agents/
  RUNBOOK.md                      hướng dẫn chạy + prompt từng lane  ← bắt đầu ở đây
  flow.yaml                       lane, profile, risk triggers, gate
  models.env                      lane nào chạy engine/model nào
  journal.md                      nhật ký lỗi agent → đầu vào retro
  rules/                          architecture, money, security, testing
  skills/                         intake, define, design, test-plan, build, verify,
                                  security-review, handoff, create-pr, retro
  templates/                      brief, spec, design, plan, test-plan, review, status, pr
  hooks/                          stop-verify, block-dangerous, protect-files
  providers/                      ví dụ chạy Claude Code trên DeepSeek
.claude/
  settings.json                   hooks + quyền cho Claude Code
  agents/                         reviewer (sonnet), security-reviewer (sonnet), explorer (haiku)
  skills -> ../.agents/skills     (install.sh tạo link)
scripts/ai/
  install.sh                      cài một lần
  new-feature.sh                  tạo work/<feature>/ + branch
  step.sh                         chạy một lane trên engine đã định tuyến
knowledge/flashlab.md             context sản phẩm
work/                             mỗi feature một thư mục artifact
```

Vị trí skills: Codex đọc `.agents/skills`, OpenCode đọc `.agents/skills` và `.claude/skills`, Claude Code đọc `.claude/skills` (link sang cùng chỗ). Sửa skill một lần, cả ba tool đều thấy.
