# Consistency Check Report — 2026-08-04 (lần 2 trong ngày, post hệ #15)

> **Verdict**: **PASS** — 0 xung đột, 0 stale registry, 1 ghi chú informational
> **Scope**: full (delta-optimized)
> **Registry**: 28 formulas + 18 constants = 46 entries
> **GDDs quét**: 15/15 (toàn bộ hệ thống MVP — lần đầu tiên đủ 15)

---

## Phương pháp

Bản full-run cùng ngày (sáng 2026-08-04, trước khi thiết kế hệ #15) đã xác minh
sạch 44 entry (28 formulas + 16 constants) trên 14 GDD với 0 xung đột. Từ mốc
đó đến lần chạy này, các thay đổi duy nhất trong `design/gdd/` + registry:

1. GDD mới: `core-ui-screen-navigation.md` (hệ #15, Designed 2026-08-04)
2. Registry: +2 constants mới (`TOUCH_TARGET_MIN`, `card_transition_ms`),
   +7 cập nhật `referenced_by`/note (không đổi giá trị nào)
3. `systems-index.md` (không phải system GDD — ngoài scope scan)

Do đó scan delta phủ toàn bộ phạm vi thay đổi:
- **Quét 1**: toàn bộ 46 tên registry × GDD #15 (tài liệu mới duy nhất)
- **Quét 2**: 2 constant mới × toàn bộ 15 GDD

## Kết quả chi tiết

### 🔴 Conflicts: 0

Mọi giá trị/ngữ nghĩa GDD #15 sử dụng đều khớp registry:

| Entry | Registry | Usage trong #15 | Kết quả |
|---|---|---|---|
| `suggested_action_count` | 4 (turn-manager) | Khung 4-gợi-ý chuẩn (Core Rule #3, AC ghi chú test) | ✅ |
| `undo_depth` | 1 (turn-manager) | Ghi chú test setup | ✅ |
| `ai_call_timeout_seconds` | 30 (turn-manager) | Core Rule #9, AC-33 (đọc registry, không hardcode) | ✅ |
| `undo_availability_window` | 4 điều kiện AND, `is_death_turn` ngoại lệ | Core Rule #5: nút ẨN hoàn toàn khi `undo_available=false`, kể cả sau lượt chết; D.1 dual-condition | ✅ |
| `card_exists` | giữ true vĩnh viễn kể cả khi chết | Core Rule #8 tap-tên; S5 xem thẻ mang triện `alive=false` | ✅ |
| `continuation_choice_eligible` | `is_death_turn AND death_confirmed` | Cổng duy nhất S2→S5 (D.2 guard, AC-11/12) | ✅ |
| `card_transition_ms` | 200, range 0–400 (source #14) | D.6 tầng `overlay_card` trỏ nguồn, không bản sao; khớp bảng knob #14 dòng 540 | ✅ |
| `TOUCH_TARGET_MIN` | 44 px (source #15, mới) | D.4, UI Requirements, AC-20 | ✅ |
| `alive`, `death_and_consequence_blocked` | (formulas #12) | Chỉ tham chiếu hiển thị qua Card — không định nghĩa lại | ✅ |

Các tên registry còn lại (24 formula + 9 constant không liên quan UI) **không
xuất hiện** trong GDD #15 — đúng kỳ vọng (mọi hiển thị số liệu đi qua Character
Card hoặc khung tường thuật, hệ #15 không chạm giá trị gameplay).

### ⚠️ Stale registry: 0

### ℹ️ Informational: 1

- `TOUCH_TARGET_MIN` đăng ký `referenced_by: character-card-identity.md` theo
  kiểu **tiền-đăng-ký** (nút Song Tu/Hồi phục/đóng overlay của #14 phải tuân
  cùng chuẩn 44px), nhưng văn bản `character-card-identity.md` hiện chưa trích
  tên hằng này. Cùng pattern hợp lệ đã dùng cho `exp_threshold` trước đây.
  → Hành động đề xuất: khi `/review-all-gdds` chạy, thêm 1 câu trích chuẩn
  `TOUCH_TARGET_MIN=44` vào phần nút tương tác của #14.

### ✅ Clean: 46/46 entries

## Ghi chú tồn đọng từ lần chạy trước (không đổi)

- `persistence-save-system.md:264-266` — ví dụ N=3 cần tính lại tại `/review-all-gdds`
- `exp-realm-progression.md:469-471` — footnote gap-analysis lịch sử, giữ nguyên
- `combat-system.md:776` — parenthetical cần đọc lại tại `/review-all-gdds`

## Bước tiếp theo đề xuất

1. **Phiên MỚI**: `/design-review design/gdd/core-ui-screen-navigation.md`
   (12 GDD #4–#15 đều Designed — Pending Review, mỗi review 1 phiên mới)
2. `/review-all-gdds` (Opus) — rà chéo toàn bộ 15 GDD + design theory; xử lý
   luôn 3 ghi chú tồn đọng + 1 informational ở trên, và 2 Open Questions
   cross-file của #15 (interface phân trang World Memory, cờ `reset_in_progress`
   của #13)
3. `/gate-check pre-production`
4. `/create-architecture`
