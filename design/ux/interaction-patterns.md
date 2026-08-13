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
| `tool-panel-header` | Navigation | o-customize |
| `tool-panel-close` | Navigation | o-customize |
| `hack-undo-lock-warning` | Feedback | o-customize |
| `tool-field-input` | Input | o-customize |
| `tool-segmented-choice` | Input | o-customize, dự kiến: settings (O-Set, cỡ chữ S/M/L đã dùng trước đó — retro-fit khi viết spec settings) |
| `tool-derived-readout` | Data Display | o-customize |
| `tool-save-feedback` | Feedback | o-customize |
| `tool-inline-error` | Feedback | o-customize |
| `tool-repeatable-list` | Input | o-customize |
| `tool-soft-warning` | Feedback | o-customize |
| `tool-deletable-list-row` | Data Display / Input | o-customize |

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
- **Leo thang diegetic nhẹ** (đóng OQ#14 `core-ui-screen-navigation.md`,
  2026-08-13): sau `ai_writing_escalation_seconds` (provisional 15s,
  knob 10–25s, PHẢI `< ai_call_timeout_seconds`), văn bản đổi sang
  biến thể thứ hai ĐÚNG 1 lần (copy chốt với `narrative-director`) —
  vẫn ink-sweep, vẫn không spinner/%/progress
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
- **Bàn phím**: là Card tappable (KHÔNG phải Button bản chất) — phải
  khai báo focus mode + xử lý Enter/Space tường minh khi implement;
  Tab-reachable, Enter/Space kích hoạt = submit (cover AC-56a)

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
- Biến mất: tween alpha 1.0→0 **≤150ms**, gỡ node khỏi layout SAU khi
  tween hoàn tất (AC-59a/59b `core-ui-screen-navigation.md` — không
  snap giữa 2 frame), kể cả ngay sau `is_death_turn=true`; mọi nguyên
  nhân biến mất render CÙNG hiệu ứng *(sửa 2026-08-13 sau `/ux-review`
  — bản trước ghi "KHÔNG fade, tức thì", mâu thuẫn AC-59a)*
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
- **Bàn phím (BẮT BUỘC)**: Tab-reachable + Enter/Space-activatable,
  TỰ NHẬN focus cùng nhịp auto-scroll — nếu đây là con đường duy nhất
  đi tiếp (như S2→S5), thiếu route bàn phím = người dùng keyboard-only
  kẹt vĩnh viễn (ngoài phạm vi exception ADR-0006)

**When to Use**: Khoảnh khắc cao-stakes, không thể đảo ngược, cần trọng lượng thao tác chủ động (không phải side-effect tự động của hệ thống).
**When NOT to Use**: Không dùng cho chuyển cảnh thông thường — đây là pattern hiếm, chỉ dành cho đúng 1 khoảnh khắc trong toàn game (death → 3-path).
**Reference**: `design/ux/main-screen.md` §Component Inventory, §Transitions & Animations; Core Rule #6 (`core-ui-screen-navigation.md`)

---

### tool-panel-header

**Category**: Navigation
**Used In**: o-customize, dự kiến: mọi overlay "công cụ" phi-diegetic tương lai

**Description**: Tiêu đề tĩnh + nút đóng (X) đứng đầu 1 overlay thuộc trục hình học phi-diegetic (khác Card/marginalia) — đối lập trực tiếp `scene-header` (không icon-badge, không mực loang, chữ rõ ràng kiểu công cụ).

**Specification**:
- Text tĩnh, không animation entrance riêng (ăn theo chữ ký chuyển cảnh của overlay chứa nó)
- Luôn kèm `tool-panel-close` cùng hàng

**When to Use**: Đầu mỗi overlay thuộc nhóm "công cụ" (chủ động phá vỡ Visual Identity Anchor, VD panel cấu hình/debug).
**When NOT to Use**: Không dùng cho overlay diegetic (Card, banner) — nơi đã có `scene-header`/ngôn ngữ marginalia riêng.
**Reference**: `design/ux/o-customize.md` §Component Inventory

---

### tool-panel-close

**Category**: Navigation
**Used In**: o-customize

**Description**: Nút đóng dạng chữ "X" (không icon asset, nhất quán nguyên tắc "chữ thay icon" toàn dự án) — đóng ngay lập tức, không qua luật 2-bậc (khác tap-ngoài/Esc).

**Specification**:
- Touch target ≥44px
- Đóng NGAY khi bấm — hành động tường minh, bỏ mọi draft chưa Lưu không cảnh báo

**When to Use**: Đường thoát tường minh, ưu tiên cao nhất, cho mọi overlay dạng form/panel.
**When NOT to Use**: Không thay thế được luật tap-ngoài/Esc 2-bậc khi có field đang focus (2 cơ chế song song, không loại trừ nhau).
**Reference**: `design/ux/o-customize.md` §Component Inventory, §Interaction Map

---

### hack-undo-lock-warning

**Category**: Feedback
**Used In**: o-customize

**Description**: Banner cảnh báo cố định đầu panel, chỉ hiện khi 1 hành động sắp thực hiện trong panel sẽ khóa vĩnh viễn 1 cơ chế khác (ở đây: Undo của lượt gameplay trước) — xuất hiện TRƯỚC khi người chơi chạm bất kỳ điều khiển nào, không đợi tới lúc sắp bấm nút gây hệ quả.

**Specification**:
- 1 banner DUY NHẤT, không lặp lại cạnh từng nút gây hệ quả (dù có nhiều nút)
- Live re-evaluate: biến mất ngay khi điều kiện gốc hết (VD sau khi hệ quả đã xảy ra), không cần đóng/mở lại overlay
- Không dùng 2 màu accent đã khẩu phần hóa của thế giới thật

**When to Use**: Khi 1 overlay có ≥1 hành động ghi-trạng-thái sẽ tạo hệ quả phụ không hiển nhiên (khóa 1 cơ chế khác) mà người chơi cần biết TRƯỚC khi bắt đầu thao tác.
**When NOT to Use**: Không dùng cho cảnh báo lỗi kỹ thuật (đó là banner tầng `#1` chuẩn của `core-ui-screen-navigation.md`) — pattern này riêng cho cảnh báo hệ quả cơ học của chính overlay đang mở.
**Reference**: `design/ux/o-customize.md` §Information Hierarchy, §States & Variants

---

### tool-field-input

**Category**: Input
**Used In**: o-customize

**Description**: Field nhập liệu dạng input-box chuẩn (không khung con dấu, không mực loang) — đối lập trực tiếp ngôn ngữ "số phải minh họa bằng nét mực" của thế giới thật; biến thể số nguyên/float/text dùng chung 1 vỏ style, khác nhau ở validation.

**Specification**:
- Touch target ≥44px; chừa sẵn khoảng trống error-text cố định dưới field (tránh reflow khi validate bật)
- Pre-fill giá trị hiện tại nếu có (không luôn bắt đầu rỗng)
- Validate inline chỉ kích hoạt SAU first-interaction/blur, không khi vừa render

**When to Use**: Mọi field nhập số/text trong overlay thuộc trục phi-diegetic.
**When NOT to Use**: Không dùng để hiển thị số liệu chỉ-đọc thuộc thế giới thật (đó vẫn cần khung con dấu theo Visual Identity Anchor, ngoại lệ chỉ áp cho riêng O-Customize).
**Reference**: `design/ux/o-customize.md` §Component Inventory, §Interaction Map

---

### tool-segmented-choice

**Category**: Input
**Used In**: o-customize, dự kiến: settings (O-Set, cỡ chữ S/M/L đã dùng trước đó theo cùng ngôn ngữ)

**Description**: Nhóm 2-3 lựa chọn loại trừ lẫn nhau xếp ngang hàng, lựa chọn đang chọn đánh dấu bằng 1 chấm mực đặc nhỏ (không gạch chân — nghĩa đó đã bị hệ Death & Consequence chiếm).

**Specification**:
- Mỗi lựa chọn ≥44px touch target
- 1 lựa chọn có thể mờ mực + lý do ngắn nếu điều kiện chưa thỏa (không ẩn hoàn toàn — người chơi cần biết lựa chọn đó tồn tại)
- Tap = đổi lựa chọn NGAY, không cần bước xác nhận riêng

**When to Use**: Chọn 1-trong-N (N nhỏ, 2-3) khi mọi lựa chọn nên luôn hiển thị đồng thời (không cần ẩn trong dropdown).
**When NOT to Use**: Không dùng khi N lớn (>3-4) — khi đó cần dropdown chuẩn thay vì segmented.
**Reference**: `design/ux/o-customize.md` §Component Inventory, §States & Variants

---

### tool-derived-readout

**Category**: Data Display
**Used In**: o-customize

**Description**: Giá trị chỉ-đọc, tính lại real-time từ 1 field khác đang được chỉnh sửa (ở đây: `tier` derive từ `level`) — giúp người chơi thấy ngay hệ quả trước khi Lưu.

**Specification**:
- Cập nhật NGAY khi field nguồn đổi (không chờ submit)
- Style rõ ràng "chỉ đọc" (khác field nhập được) — không cần border input-box

**When to Use**: Khi 1 giá trị derive có ý nghĩa cần thấy trước khi commit, và công thức derive đã tồn tại sẵn ở hệ khác (tái dùng, không tính lại logic).
**When NOT to Use**: Không dùng nếu giá trị derive không ảnh hưởng quyết định của người chơi trước khi Lưu.
**Reference**: `design/ux/o-customize.md` §Component Inventory (Khu 1 — `tier`)

---

### tool-save-feedback

**Category**: Feedback
**Used In**: o-customize

**Description**: Cặp nút Lưu + dòng phản hồi cục bộ ngay trong khu vực vừa thao tác — không toast/banner riêng, không tự động biến mất theo timer (chỉ biến mất khi field bị sửa tiếp).

**Specification**:
- In-flight: khóa TOÀN BỘ nút Lưu/Xóa/Undo liên quan (không chỉ nút vừa bấm) trong cửa sổ commit bất đồng bộ
- Thành công: text "Đã ghi" (hoặc tương đương) NGAY trong khu đó
- Thất bại: KHÔNG đổi state, báo lỗi trong khu đó, mở khóa lại

**When to Use**: Form nhiều khu độc lập, mỗi khu tự chịu trách nhiệm 1 giao dịch nguyên tử riêng.
**When NOT to Use**: Không dùng khi 1 nút submit duy nhất cho toàn form (khi đó feedback nên ở cấp form, không cấp khu).
**Reference**: `design/ux/o-customize.md` §Component Inventory, §States & Variants, §Interaction Map

---

### tool-inline-error

**Category**: Feedback
**Used In**: o-customize

**Description**: Text lỗi ngắn, xuất hiện NGAY dưới field gây lỗi, chỉ sau first-interaction/blur — không phải banner/toast, không chặn thao tác ở field khác.

**Specification**:
- Kèm viền đỏ trên field — nhưng LUÔN có text đi cùng (color-independence, không chỉ dựa vào màu)
- Khoảng trống hiển thị lỗi được chừa sẵn cố định (tránh giật layout khi lỗi xuất hiện/biến mất)

**When to Use**: Validate field-level trong form nhiều field.
**When NOT to Use**: Không dùng cho cảnh báo không-chặn (đó là `tool-soft-warning`, khác pattern này ở chỗ không ngăn submit).
**Reference**: `design/ux/o-customize.md` §Component Inventory, §Acceptance Criteria

---

### tool-repeatable-list

**Category**: Input
**Used In**: o-customize

**Description**: Danh sách dòng field lặp lại, người chơi tự thêm/bớt qua nút tường minh (KHÔNG qua side-effect của phím Enter) — có invariant cardinality tối thiểu (≥1 dòng), nút xóa dòng cuối cùng bị mờ khi chạm ngưỡng đó.

**Specification**:
- Nút "+ Thêm [đơn vị]" thêm 1 dòng field trống, fade-in ≤150ms
- Nút xóa từng dòng, fade-out ≤150ms trước khi gỡ khỏi layout; mờ mực khi chỉ còn đúng ngưỡng tối thiểu
- Enter trong field của 1 dòng KHÔNG thêm dòng mới (tránh submit/thêm nhầm) — hành vi Enter theo đúng luật chung của form chứa nó (VD submit cả khu)

**When to Use**: Nhập N≥1 mục con cùng loại trong 1 form lớn hơn, số lượng không cố định trước.
**When NOT to Use**: Không dùng khi số lượng mục con CỐ ĐỊNH đã biết trước (khi đó dùng field tĩnh, không cần thêm/bớt).
**Reference**: `design/ux/o-customize.md` §Component Inventory (Khu 3 — danh sách thức), §Open Questions #8

---

### tool-soft-warning

**Category**: Feedback
**Used In**: o-customize

**Description**: Cảnh báo hiển thị khi 1 giá trị dưới ngưỡng khuyến nghị (không phải ngưỡng hợp lệ cứng) — KHÔNG chặn submit, khác hẳn `tool-inline-error`.

**Specification**:
- Text cảnh báo, không viền đỏ (để không lẫn với lỗi chặn)
- Không ngăn nút Lưu — submit vẫn thành công bình thường

**When to Use**: Khi có 2 tầng validate riêng biệt cho cùng 1 giá trị — 1 ngưỡng cứng (chặn) và 1 ngưỡng khuyến nghị (không chặn, chỉ nhắc).
**When NOT to Use**: Không dùng nếu hệ thống chỉ có 1 tầng validate (khi đó chỉ cần `tool-inline-error`).
**Reference**: `design/ux/o-customize.md` §Component Inventory (Khu 3 — dưới `min_thuc_per_skill`), §Acceptance Criteria

---

### tool-deletable-list-row

**Category**: Data Display / Input
**Used In**: o-customize

**Description**: Danh sách read-only các entry đã tồn tại, mỗi dòng kèm nút xóa CÓ ĐIỀU KIỆN — mờ mực + lý do ngắn khi entry không đủ điều kiện xóa (đã tham chiếu ở nơi khác), thay vì ẩn nút hoàn toàn.

**Specification**:
- Empty state chuẩn khi danh sách rỗng (công thức chung toàn game — 1 dòng chữ nhạt, không icon/khung)
- Nút xóa mỗi dòng: bấm được HOẶC mờ mực + lý do (không bao giờ ẩn — người chơi cần thấy TẠI SAO không xóa được)
- Xóa thành công → dòng fade-out, ID/tên được giải phóng để dùng lại

**When to Use**: Danh sách entry do người chơi tự tạo, có thể xóa NHƯNG điều kiện xóa phụ thuộc trạng thái tham chiếu ở hệ khác.
**When NOT to Use**: Không dùng khi mọi entry LUÔN xóa được vô điều kiện (khi đó chỉ cần nút xóa chuẩn, không cần trạng thái mờ+lý do).
**Reference**: `design/ux/o-customize.md` §Component Inventory (Khu 3 — danh sách entry custom), §States & Variants

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
   đúng cho riêng S2. **Cập nhật sau spec thứ 2 (o-customize)**: 0/11
   pattern gốc của S2 được tái dùng — O-Customize phát sinh 11 pattern
   HOÀN TOÀN MỚI, không pattern nào chồng lấn. Đây KHÔNG phải dấu hiệu
   thư viện thất bại — 2 spec thuộc 2 trục hình học đối lập có chủ
   đích (S2 = diegetic "mực/marginalia", O-Customize = phi-diegetic
   "công cụ", xem Visual/Audio Requirements `character-customization-mode.md`)
   nên việc 0 pattern tái dùng là kết quả ĐÚNG dự kiến, không phải gap.
   Câu hỏi gốc (tái dùng thật hay chỉ đúng cho 1 spec) vẫn cần 1 lần
   kiểm chứng nữa trong CÙNG trục hình học — khuyến nghị spec kế tiếp
   nên là 1 màn hình diegetic khác (S1/O-Card/S4) để test lại trục
   "mực/marginalia", và/hoặc `settings.md` (O-Set) để test lại trục
   "công cụ" — `tool-segmented-choice` đã dự đoán tái dùng được ở đó
   (cỡ chữ S/M/L).
2. **`is_touch_primary` 2-column rule** (Character Card, D.5 của
   `core-ui-screen-navigation.md`) chưa có pattern tương ứng trong
   thư viện — sẽ thêm khi viết spec Character Card.
