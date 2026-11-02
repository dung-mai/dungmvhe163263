---
name: handoff
description: Use before stopping for any reason (lane done, blocked, quota running out, switching tool) to write work/<feature>/status.md so another person, engine or model can continue without the chat history.
---

# Handoff

Write `work/<feature>/status.md` from `.agents/templates/status.md`. Keep it under 40 lines.

1. Lane hiện tại and profile.
2. Engine/model you are (for example "Codex CLI", "Claude Code sonnet", "OpenCode deepseek-v4-flash") and the time.
3. Đã xong: tasks or artifacts finished, with commit hashes when there are commits.
4. Đang dở: exactly where you stopped (task id, file, what was half-done).
5. Quyết định đã chốt: decisions made in this session that are not yet written in spec/design.
6. Đang chờ người: gate or question, if any.
7. Lệnh kiểm tra: commands the next agent should run first.
8. Lane tiếp theo and the suggested engine from `.agents/models.env`.

Also append one line to `.agents/journal.md` if something went wrong or surprised you (format in that file).
