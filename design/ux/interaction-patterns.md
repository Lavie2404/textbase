# Interaction Pattern Library

> **Status**: In Design
> **Author**: duchx + ux-designer
> **Last Updated**: 2026-08-13
> **Template**: Interaction Pattern Library

---

## Overview

Thư viện pattern tương tác dùng chung cho toàn bộ UI của Vô Danh Lục.
Đây là phiên bản đầu tiên — toàn bộ 11 pattern khởi tạo từ
`design/ux/main-screen.md` (S2), UX spec đầu tiên của dự án. Mỗi
pattern mới phát sinh từ các spec sau sẽ được thêm vào đây thay vì bị
phát minh lại.

---

## Pattern Catalog

| Pattern | Category | Dùng ở |
|---|---|---|
| `marginalia-nav-link` | Navigation | main-screen (S2) |
| `scene-header` | Data Display | main-screen (S2) |
| `tap-name-span` | Navigation | main-screen (S2) |
| `boundary-continue-link` | Navigation | main-screen (S2) |
| `ink-sweep-loading` | Feedback | main-screen (S2) |
| `suggestion-card` | Input | main-screen (S2) |
| `intent-chip` | Input | main-screen (S2) |
| `free-text-input` | Input | main-screen (S2) |
| `nudge-line` | Feedback | main-screen (S2) |
| `undo-button` | Input / Feedback | main-screen (S2) |
| `breathing-continue-line` | Navigation / Modal (takeover) | main-screen (S2) |

---

## Patterns

### marginalia-nav-link

**Category**: Navigation
**Used In**: main-screen (S2), dự kiến: story-log (S4), 3-path (S5)

**Description**: Text link mỏng (font-weight 300), không border/icon/màu — mô phỏng ghi chú viết tay ở lề trang sách, dùng cho các điểm điều hướng thường trực (Thẻ/Log/Menu) mà không phá vỡ cảm giác "đang đọc sách".

**Specification**:
- Font-weight 300, cùng màu chữ tường thuật (không màu accent riêng)
- Không background/border/icon
- Touch target `≥44px` dù ký tự hiển thị nhỏ (padding vô hình xung quanh)
- Luôn readonly-class action (D.1) — không bao giờ bị khóa bởi `tm_state`

**When to Use**: Điểm điều hướng thường trực, không tốn lượt, cần "ẩn mình" trong giao diện.
**When NOT to Use**: Hành động ghi-trạng-thái (mutating) — pattern này CHỈ dành cho readonly navigation, không bao giờ dùng cho submit/mutating action.
**Reference**: `design/ux/main-screen.md` §Component Inventory

---

### scene-header

**Category**: Data Display
**Used In**: main-screen (S2)

**Description**: Header tĩnh hiển thị tên địa điểm hiện tại + badge/triện cảnh báo nguy hiểm (nếu có) — không sticky, cuộn theo nội dung, đặt ở đỉnh khung tường thuật.

**Specification**:
- Không sticky (cuộn cùng nội dung)
- Triện nguy hiểm chỉ hiện khi scene có flag nguy hiểm — không render khi rỗng
- Không tương tác (trừ khi UX/AC sau này định nghĩa tap-để-xem-chi-tiết)

**When to Use**: Đầu mỗi khối nội dung cảnh/địa điểm cần orient người chơi.
**When NOT to Use**: Không dùng làm sticky/persistent chrome (vi phạm "không thanh chrome thường trực" của Core UI).
**Reference**: `design/ux/main-screen.md` §Component Inventory

---

### tap-name-span

**Category**: Navigation
**Used In**: main-screen (S2), story-log (S4/S4-RO), 3-path (S5) — mọi nơi hiển thị văn tường thuật

**Description**: Vùng chạm nhúng trong văn xuôi — tên nhân vật có `card_exists=true` được đánh dấu font-weight 600 (không màu/không gạch chân), tap mở overlay Thẻ Nhân Vật. Cơ chế `RichTextLabel` BBCode meta-tag (ADR-0006).

**Specification**:
- Font-weight 600 vs thân văn 400, KHÔNG màu/underline/box
- `card_exists=false` → không styling, không phản hồi
- Touch target dùng công thức riêng D.4a (best-effort, giới hạn vật lý bởi kích thước chữ dòng) — KHÔNG đạt `TOUCH_TARGET_MIN=44px` chuẩn
- ⚠️ Ngoài phạm vi Tab/screen-reader ở MVP (ADR-0006) — luôn cần fallback bàn phím riêng (`marginalia-nav-link` 「Thẻ」)
- Luôn readonly-class action — không bao giờ khóa bởi `tm_state`

**When to Use**: Văn xuôi tường thuật có nhắc tên nhân vật đã có thẻ.
**When NOT to Use**: Không dùng cho bất kỳ text nào ngoài tên nhân vật hợp lệ; không dùng làm điểm vào bàn phím DUY NHẤT (luôn cần `marginalia-nav-link` đi kèm).
**Reference**: `design/ux/main-screen.md` §Interaction Map, §Accessibility; ADR-0006

---

### boundary-continue-link

**Category**: Navigation
**Used In**: main-screen (S2)

**Description**: Dòng link xuất hiện khi người chơi cuộn chạm biên cửa sổ dữ liệu đã tải (VD biên trên của live window 30 lượt) — mời chuyển sang bề mặt có đầy đủ lịch sử hơn (Story Log).

**Specification**:
- Style Họ B (đậm hơn thân văn 1 bậc — khác `marginalia-nav-link` nhạt hơn)
- Chỉ render khi `distance_to_window_edge ≤ 0` thật sự chạm biên (không phải prefetch threshold)
- Tap → page-flip sang màn hình đích, giữ đúng vị trí ngữ cảnh (anchor đúng lượt)

**When to Use**: Ranh giới dữ liệu đã tải (pagination/windowing) cần lối thoát rõ ràng sang nguồn đầy đủ hơn.
**When NOT to Use**: Không dùng khi dữ liệu đã đủ tải hết (tránh link vô nghĩa).
**Reference**: `design/ux/main-screen.md` §Component Inventory, §D.3 (`core-ui-screen-navigation.md`)

---

### ink-sweep-loading

**Category**: Feedback
**Used In**: main-screen (S2), dự kiến bất kỳ nơi nào chờ AI call

**Description**: Chỉ báo chờ dạng "nét mực đang kéo dài" — KHÔNG PHẢI spinner, KHÔNG map với % hay thời gian thực đã trôi. Xuất hiện khi `tm_state=resolving`.

**Specification**:
- Animation ngang, tốc độ cố định, không phụ thuộc elapsed time
- Không có label số (không "đang tải... 45%")
- Timeout tại `ai_call_timeout_seconds=30` → chuyển sang thông báo lỗi trong khung tường thuật

**When to Use**: Mọi lúc chờ AI response trong game.
**When NOT to Use**: Không dùng cho loading screen chuyển màn hình (S1-S5 không bao giờ có loading — dữ liệu local).
**Reference**: `design/ux/main-screen.md` §States & Variants, §Transitions & Animations

---

### suggestion-card

**Category**: Input
**Used In**: main-screen (S2) — cả nhánh không-combat (Situation Gen) lẫn combat (action list)

**Description**: Card tappable chứa 1 gợi ý hành động do AI/hệ thống sinh — 4 card cố định mỗi lượt, submit ngay khi tap (không cần bước xác nhận 2 lần).

**Specification**:
- 4 slot cố định; trong combat: slot 3=Phòng thủ, slot 4=Bỏ chạy luôn cố định vị trí, không bị đẩy bởi kỹ năng
- Biến thể **Pending Fate**: đậm mực hơn 1 bậc, KHÔNG có `intent-chip` đi kèm, chiếm 2/4 slot đúng 1 lượt
- Khóa đệ quy khi `tm_state≠awaiting_action` (D.1), alpha 0.38
- Touch target `≥44px`

**When to Use**: Danh sách gợi ý hành động do hệ thống sinh, số lượng cố định nhỏ (4).
**When NOT to Use**: Danh sách dài/động số lượng — pattern này giả định đúng 4 slot cố định, không phải list cuộn.
**Reference**: `design/ux/main-screen.md` §Component Inventory, §States & Variants

---

### intent-chip

**Category**: Input
**Used In**: main-screen (S2)

**Description**: Chip nhỏ, nhóm theo NPC, tap để điền nội dung tương ứng vào ô tự do — KHÔNG tự submit, chỉ hỗ trợ soạn.

**Specification**:
- Nhóm theo NPC; chip không thuộc NPC nào (`move_to`, `investigate`...) nhóm riêng ở cuối
- Tap → điền ô tự do, đổi trạng thái "đã chọn" — không gửi hành động
- Khóa đệ quy cùng nhóm với `suggestion-card` khi Resolving/Undoing
- Không bao giờ tự động bật (nguyên tắc 1 chiều — chỉ tap mới enable)

**When to Use**: Shortcut nhập liệu phụ trợ cho ô tự do, không phải hành động độc lập.
**When NOT to Use**: Không dùng làm hành động submit trực tiếp (khác `suggestion-card`).
**Reference**: `design/ux/main-screen.md` §Component Inventory, §Interaction Map

---

### free-text-input

**Category**: Input
**Used In**: main-screen (S2)

**Description**: Ô nhập văn bản tự do + nút gửi, mang ý nghĩa "chấp bút" — luôn giữ nguyên nội dung qua mọi lỗi hệ thống (không bao giờ tự xóa input người dùng).

**Specification**:
- KHÔNG BAO GIỜ tự xóa/reset nội dung khi lỗi AI/timeout — giữ nguyên nguyên vẹn
- Khóa khi Resolving/Undoing (đệ quy)
- Nút gửi disable ngay sau khi bấm cho tới khi có kết quả (tránh double-submit)

**When to Use**: Nhập liệu tự do cho hành động chính của người chơi.
**When NOT to Use**: Không dùng cho input phụ/cấu hình (đó là input field chuẩn khác, không mang trọng lượng "chấp bút").
**Reference**: `design/ux/main-screen.md` §Component Inventory, §Player Fantasy (Core UI GDD)

---

### nudge-line

**Category**: Feedback
**Used In**: main-screen (S2)

**Description**: 1 dòng gợi ý heuristic, tap để enable 1 `intent-chip` cụ thể — không tự động kích hoạt gì.

**Specification**:
- Chỉ hiện khi heuristic kích hoạt (điều kiện thuộc Situation Gen, không phải UI)
- Tap → bật đúng 1 chip tương ứng, không submit

**When to Use**: Gợi ý nhẹ, không ép buộc, giúp người chơi khám phá tùy chọn.
**When NOT to Use**: Không dùng để ép hành động hoặc thay thế lựa chọn của người chơi.
**Reference**: `design/ux/main-screen.md` §Component Inventory, §Interaction Map

---

### undo-button

**Category**: Input / Feedback
**Used In**: main-screen (S2)

**Description**: Nút ẩn/hiện (KHÔNG disable/mờ) theo đúng cửa sổ khả dụng của Undo — biến mất là tín hiệu "mực đã khô", không phải trạng thái tạm khóa.

**Specification**:
- Xuất hiện: fade-in khi `undo_available=true`
- Biến mất: KHÔNG fade — tức thì, kể cả ngay sau `is_death_turn=true`
- Khóa đệ quy khi Resolving/Undoing (nhưng vẫn hiện, chỉ mờ trong lúc xử lý — khác với biến mất vĩnh viễn)

**When to Use**: Hành động hoàn tác có giới hạn thời gian/điều kiện rõ ràng, nơi sự biến mất TỰ THÂN mang ý nghĩa.
**When NOT to Use**: Không dùng cho nút disable thông thường — pattern này CỐ Ý phân biệt "biến mất" khỏi "mờ đi", không hoán đổi 2 khái niệm.
**Reference**: `design/ux/main-screen.md` §Component Inventory, §Transitions & Animations

---

### breathing-continue-line

**Category**: Navigation / Modal (takeover)
**Used In**: main-screen (S2) — chuyển tiếp sang 3-path (S5)

**Description**: Dòng dẫn "chạm để tiếp tục" xuất hiện sau 1 sự kiện cao-stakes (lượt gây chết thật) — nhịp thở alpha liên tục để tự thu hút chú ý, tap kích hoạt chuyển cảnh MỘT CHIỀU, không tự động, không timeout.

**Specification**:
- Style Họ B (đậm hơn thân văn), nhịp thở alpha `[0.85, 1.0]`, chu kỳ ~2s
- Auto-scroll BẮT BUỘC tới dòng này ngay khi điều kiện set — ngoại lệ DUY NHẤT của luật "không auto-scroll" toàn game
- KHÔNG có timeout tự động — chờ vô hạn cho tới khi người chơi tap
- Tap → chuyển cảnh một chiều, không có đường quay lại trạng thái trước

**When to Use**: Khoảnh khắc cao-stakes, không thể đảo ngược, cần trọng lượng thao tác chủ động (không phải side-effect tự động của hệ thống).
**When NOT to Use**: Không dùng cho chuyển cảnh thông thường — đây là pattern hiếm, chỉ dành cho đúng 1 khoảnh khắc trong toàn game (death → 3-path).
**Reference**: `design/ux/main-screen.md` §Component Inventory, §Transitions & Animations; Core Rule #6 (`core-ui-screen-navigation.md`)

---

## Gaps & Patterns Needed

Chỉ 1 UX spec (`main-screen.md`) đã viết — 5 màn hình + 3 overlay còn
lại của `core-ui-screen-navigation.md` chưa có spec, chắc chắn sẽ cần
pattern mới:
- **S1 (Save Slot Screen)**: cần pattern cho danh sách slot (list-item
  card, có thể không giới hạn số lượng — cần cuộn/virtualize)
- **O-ConfirmDelete**: cần pattern modal có ô nhập text (gõ lại tên
  xác nhận) — khác hẳn `suggestion-card`/overlay hiện có, chưa có
  pattern "text-confirm-modal" nào trong thư viện
- **O-Set**: cần pattern cho nhóm cấu hình (switch, radio 3 nấc cỡ
  chữ) — chưa có "settings-group" pattern
- **O-Card**: cần pattern hiển thị chỉ số trong khung con dấu (theo
  Visual Identity Anchor) — chưa có "stat-seal-display" pattern
- **S4/S4-RO (Story Log)**: có thể tái dùng `tap-name-span` +
  `boundary-continue-link` nhưng cần thêm pattern phân trang

## Open Questions

1. **Thư viện mới có 1 nguồn duy nhất (S2)** — chưa được kiểm chứng
   chéo với spec khác để xem pattern có thật sự tái dùng được hay chỉ
   đúng cho riêng S2. Cần review lại sau khi có spec thứ 2 (khuyến
   nghị: S1 hoặc O-Card, theo đúng gợi ý tiếp theo của `/ux-design`).
2. **`is_touch_primary` 2-column rule** (Character Card, D.5 của
   `core-ui-screen-navigation.md`) chưa có pattern tương ứng trong
   thư viện — sẽ thêm khi viết spec Character Card.
