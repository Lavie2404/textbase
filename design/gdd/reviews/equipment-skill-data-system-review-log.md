# Review Log: Equipment & Skill Data System

## Review — 2026-08-02 — Verdict: APPROVED (sau khi sửa 1 blocker + 1 recommended tại chỗ)
Scope signal: M
Specialists: Không có (lean mode — phân tích một phiên, không spawn specialist agent)
Blocking items: 1 (đã sửa) | Recommended: 1 (đã sửa)
Summary: Phát hiện mâu thuẫn cấu trúc giữa Core Rule #1 (mỗi kỹ năng gắn đúng 1 weapon_type) và Edge Cases yêu cầu "Đánh thường" (basic attack) phải khả dụng bất kể vũ khí đang trang bị là gì — một entry kỹ năng duy nhất không thể thỏa cả hai. Người dùng chọn hướng giải quyết: tách "Đánh thường" thành N entry riêng theo từng `weapon_type`, mỗi entry tuân thủ Core Rule #1 bình thường và tự động coi là "đã học" cho mọi Character có vũ khí khớp loại đó — không cần ngoại lệ cho Core Rule #1. Cũng đã đặt tên tường minh cho field "họ kỹ năng" (`family_id`) để nhất quán với phần schema còn lại.
Prior verdict resolved: Lần review đầu tiên (không có review trước đó).
