---
name: project-story-log-ux-open-items
description: Các khoảng trống UX của màn hình Story Log phát hiện khi review world-memory-context-management.md (2026-08-05) — cần giải quyết khi chạy /ux-design story-log.md ở Pre-Production
metadata:
  type: project
---

Review `world-memory-context-management.md` (2026-08-05) phát hiện Story Log
(#15 Core UI/Screen Navigation sở hữu chrome, World Memory #5 sở hữu dữ liệu)
KHÔNG có cách nhảy nhanh đến 1 mốc quá khứ cụ thể — chỉ có cuộn/lật tuần tự
(`get_turn_page(anchor_turn_id, count, direction)`) + nút "về đầu câu chuyện".
Không có tìm kiếm theo NPC/từ khóa, không có nhảy-đến-lượt-N, không bookmark.

**Why**: với 1 playthrough Full Vision hàng nghìn lượt, đây là "cuốn nhật ký
không mục lục" — người chơi muốn tìm lại 1 đoạn hội thoại cũ với 1 NPC cụ thể
không có đường nào ngoài lật tuần tự hàng chục trang. Đây là 1 ví dụ CỤ THỂ
của căng thẳng cố hữu "marginalia not chrome" (tối ưu immersion, hy sinh
discoverability) đã ghi ở [[project-game-identity-context]] — không phải lỗi
thiết kế, mà là đánh đổi cần quyết định có ý thức.

**Ghi chú kỹ thuật quan trọng**: interface `get_turn_page` NHẬN `anchor_turn_id`
tùy ý làm tham số — nghĩa là tầng dữ liệu (World Memory) ĐÃ hỗ trợ "nhảy đến
lượt N bất kỳ" nếu UI cung cấp `turn_id` mục tiêu. Cái thiếu là AFFORDANCE ở
tầng UI (#15), không phải năng lực dữ liệu. Tìm kiếm full-text theo nội dung
`narration_text`/theo NPC là bài toán khác (cần index riêng, không có sẵn) —
nặng hơn nhiều so với "nhảy đến lượt N".

Không blocking cho GDD `world-memory-context-management.md` (đúng phạm vi —
đây là UI Requirements, đã có 📌 UX Flag hẹn `/ux-design` ở Pre-Production,
trích `design/ux/story-log.md`). Cũng không phát hiện trong review log của
`core-ui-screen-navigation.md` trước đây — là finding mới, chưa có quyết định
nào chốt.

**How to apply**: khi chạy `/ux-design` cho `design/ux/story-log.md`, PHẢI đặt
câu hỏi rõ ràng cho user về 3 mức độ giải pháp (không quyết thay):
1. Không làm gì thêm (chấp nhận đánh đổi, giữ tối giản)
2. Nhảy-đến-lượt-N qua ô nhập số (rẻ, tận dụng `anchor_turn_id` có sẵn, nhưng lộ số liệu turn_id — có thể phá vỡ ẩn dụ "nhật ký", cần bàn với art-director cách style hóa để không giống UI kỹ thuật)
3. Tìm kiếm theo NPC (lọc theo entity_id — có thể tận dụng luôn tầng "Sự kiện đã trích xuất" của World Memory làm chỉ mục, KHÔNG cần index full-text mới) hoặc theo từ khóa narration_text (cần index riêng, tốn nhất)

Liên quan: [[project-game-identity-context]], [[project-gdd-review-process]]

---

**Bổ sung — vòng re-review 2 (2026-08-06), phát hiện MỚI, chưa có ở vòng 1:**

1. **Ranh giới `recency_window_turns` (AI Context View) vô hình đối với người
   chơi ở Story Log**: Story Log hiển thị `narration_text` của Nhật ký đầy đủ
   NGUYÊN VĂN VĨNH VIỄN cho MỌI lượt (không phân biệt lượt còn trong cửa sổ
   AI nhớ nguyên văn vs lượt đã bị trích xuất thành fact, mất `narration_text`
   khỏi AI Context View — Core Rule #3/Formula #2 của
   `world-memory-context-management.md`). Rủi ro: người chơi đọc lại 1 chi
   tiết roleplay thuần túy (không có field cơ học) ở Story Log, tưởng AI vẫn
   "nhớ" nó, nhưng AI chưa từng giữ nó ngoài cửa sổ gần đây (mặc định 8
   lượt) — khi AI sau đó "quên" đúng chi tiết đó, cảm giác là AI mâu thuẫn dù
   đúng thiết kế. **Không đề xuất thêm marker kỹ thuật lộ liễu trong Story
   Log** (phá vỡ ẩn dụ "Mực Chưa Khô"/"không bao giờ bị sửa hay tóm tắt") —
   đây là vấn đề cần quản lý ở tầng NỘI DUNG (`game-designer`/
   `creative-director`: đảm bảo chi tiết định tính quan trọng có field cơ
   học tương ứng nếu cần AI nhớ lâu dài), không phải tầng UI. Liên quan trực
   tiếp Open Question có sẵn của `world-memory-context-management.md`:
   "`recency_window_turns` đo theo lượt thô, không nhận biết ranh giới
   cảnh/hội thoại" — cùng gốc, xử lý cùng lúc khi playtest Vertical Slice.
   **Chưa ghi vào Open Questions chính thức của GDD nào** — cần đề xuất khi
   `/ux-design story-log.md` chạy, hoặc sớm hơn nếu `game-designer` muốn.

2. **Race condition D.3 (Story Log) khi lượt mới confirm trong lúc đang xem
   trang cuối cùng ở Resolving**: `core-ui-screen-navigation.md` cho phép mở
   Story Log trong lúc Resolving (dòng ~585). GDD D.3 chỉ đặc tả invalidate-
   reload khi Undo xảy ra trong trang đang tải, KHÔNG đặc tả khi 1 lượt MỚI
   confirm (không phải Undo) rơi vào đúng trang cuối đang mở — `total_pages`
   có thể tăng, trang "cuối" cũ không còn là cuối. Song song với Open
   Question #13 đã có ở `core-ui-screen-navigation.md` (D.3b, S2 — nội dung
   đang đọc bị evict khi lượt mới confirm) nhưng #13 chỉ áp cho S2, chưa áp
   cho D.3/Story Log. Thuộc phạm vi sửa `core-ui-screen-navigation.md`
   (owner: `game-designer`), không phải World Memory.
