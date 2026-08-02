# Review Log: Mechanic/Narration Contract Enforcement

## Review — 2026-08-02 — Verdict: APPROVED (sau khi sửa 1 blocker + 2 recommended tại chỗ)
Scope signal: XL
Specialists: Không có (lean mode — phân tích một phiên, không spawn specialist agent)
Blocking items: 1 (đã sửa) | Recommended: 2 (đã sửa)
Summary: Phát hiện mâu thuẫn phạm vi giữa mô tả pipeline tổng quát ("mọi điểm gọi AI cho tường thuật/sinh gợi ý") và Edge Cases (Core Rules #1-4 + Formulas chỉ áp dụng cho narration_call) — Checkpoint 1 (yêu cầu locked_result) nếu áp dụng literal cho suggestion_call sẽ chặn đứng tính năng sinh gợi ý vì loại lệnh gọi đó không hề có locked_result. Đã sửa bảng Checkpoint để thêm cột "Áp dụng cho", làm rõ Checkpoint 1 chỉ gate narration_call. Cũng đã đóng 1 Open Question lỗi thời (cạnh phụ thuộc Turn Manager → Contract Enforcement thực ra đã được systems-index.md ghi nhận từ trước) và làm rõ digits(f.value) dùng giá trị tuyệt đối cho Formula 1.
Prior verdict resolved: Lần review đầu tiên (không có review trước đó).
