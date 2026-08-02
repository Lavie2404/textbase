# Review Log: Turn Manager / Core Game Loop

## Review — 2026-08-02 — Verdict: APPROVED (sau khi sửa 2 blocker tại chỗ)
Scope signal: L
Specialists: Không có (lean mode — phân tích một phiên, không spawn specialist agent)
Blocking items: 2 (đã sửa) | Recommended: 2 (còn mở, không chặn)
Summary: Phát hiện 2 mâu thuẫn nội bộ — (1) câu văn "tối đa 2 lần gọi AI/lượt" ở mục Interactions mâu thuẫn với Formula 2/AC-16 vốn cho phép 3 lần khi có retry; (2) bảng State Transitions không rẽ nhánh cho trường hợp `is_death_turn=true`, khiến "Turn Confirmed" trông như luôn sinh gợi ý/luôn cho Undo. Cả hai đã được sửa trực tiếp trong phiên review: câu văn Interactions cập nhật khớp Formula 2; bảng State Transitions tách thành 2 dòng theo `is_death_turn`, thêm lối thoát sang Character Continuation. 2 khuyến nghị không chặn (làm rõ Formula 1 dạng pseudocode theo sự kiện; UI/Visual Requirements còn trống, cần `/ux-design` trước khi implement) vẫn còn mở.
Prior verdict resolved: Lần review đầu tiên (không có review trước đó).
