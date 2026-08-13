# UX Spec: Màn chơi chính (S2)

> **Status**: In Design
> **Author**: duchx + ux-designer
> **Last Updated**: 2026-08-13
> **Journey Phase(s)**: [To be designed — no player-journey.md yet]
> **Template**: UX Spec

---

## Purpose & Player Need

Người chơi đến S2 với đúng một nhu cầu lặp lại mỗi lượt: **chọn một hành
động (1 lượt = 1 hành động) và xem thế giới phản hồi lại hành động đó bằng
tường thuật sống động** — không phải một kết quả khô khan kiểu "thành
công/thất bại".

- **Nhánh không-combat**: AI tự suy diễn những gì xảy ra *xung quanh* hành
  động đã chọn, không chỉ chính hành động đó. Ví dụ: chọn "vào rừng săn
  hồn hoàn" → AI tường thuật cả hành trình — đi một mình hay có ai đi
  cùng, gặp ai dọc đường, gặp hồn thú gì — chứ không tóm tắt thành 1 câu
  kết quả. Player need ở đây là **cảm giác thế giới đang "diễn" ra một
  cách có logic và bất ngờ**, không phải chỉ nhận phản hồi hệ thống.
- **Nhánh combat**: cùng 1 khung 4-gợi-ý, nhưng mỗi lượt là 1 giao tranh
  (exchange) — Lực chiến được tính, nhưng luôn hiện ra dưới dạng văn xuôi
  tường thuật (Pillar 4), không phải bảng số.
- Vì Pillar 2 (Hệ Quả Thực Sự), mỗi lựa chọn mang trọng lượng thật — S2 là
  nơi player *cảm* được trọng lượng đó ngay khi vừa chấp bút, không phải
  nơi họ "duyệt qua" một menu hành động.

**Điều hỏng nặng nhất nếu màn hình này khó dùng**: player mất niềm tin
rằng hành động của họ *thực sự* tạo ra khác biệt trong tường thuật — biến
trải nghiệm từ "một cuốn nhật ký đang sống" thành "một cái máy random
text", phá vỡ đúng pillar trung tâm của game.

---

## Player Context on Arrival

S2 hiếm khi là nơi "vừa đến" theo nghĩa truyền thống — phần lớn thời gian
player **đã ở sẵn trong S2**, đây là vòng lặp lặp lại mỗi lượt. Có 4 điểm
vào (nguồn `core-ui-screen-navigation.md` §States and Transitions):

| Nguồn | Bối cảnh player mang theo | Ghi chú thiết kế |
|---|---|---|
| **S1 → "Bắt đầu mới"** | Chưa có lịch sử nào để đọc. AI viết **một đoạn mở truyện/giới thiệu thế giới trước khi 4 gợi ý hành động đầu tiên xuất hiện** — không đi thẳng vào "chọn hành động" ngay. | ⚠️ Cơ chế "cold-start narration" này **chưa thấy được đặc tả** trong `situation-encounter-generation.md` — flag vào Open Questions, cần Situation Gen xác nhận sở hữu nội dung này (đúng nguyên tắc "S2 chỉ render, không sở hữu nội dung"). |
| **S1 → "Tiếp tục"** | Đã có lịch sử. Theo D.3b, cửa sổ live tự backfill 30 lượt gần nhất ngay khi mở — không bao giờ để trống khi resume. | Player kỳ vọng "tiếp tục đúng chỗ đang đọc dở" — không mất vị trí. |
| **Vừa Undo xong (S2-U → S2)** | Vừa "gạch dòng" một lựa chọn. | Tâm thế: vừa sửa lỗi thao tác, muốn chọn lại ngay — cần 4 gợi ý mới xuất hiện nhanh, không có độ trễ cảm nhận được. |
| **S5 → S2 (slot mới)** | Nhân vật cũ vừa mất, vừa chọn "Chơi lại". | Tâm thế "bắt đầu lại" — về bản chất giống "Bắt đầu mới" (cần cold-start narration tương tự), nhưng mang theo dư âm cảm xúc từ cái chết vừa xảy ra. |

**Trạng thái cảm xúc mặc định**: **calm / immersed** — khớp Player Fantasy
đã Approved ("tôi đang cầm cuốn nhật ký", không phải "đang dùng app").
Baseline này áp dụng đồng nhất cho cả 4 điểm vào; tình huống cần tạo căng
thẳng thị giác (VD: Pending Fate) đã được GDD xử lý riêng qua trọng lượng
hiển thị (Core Rule #3b — thẻ đậm mực hơn), **không phải** qua thay đổi
giả định cảm xúc nền của layout.

**Voluntary vs. sent**: player luôn *chủ động* ở lại/quay lại S2 — không
có cơ chế "bị đẩy vào S2" (S5→S2 gần nhất cũng qua hành động tap "Chơi
lại" của player, không tự động).

---

## Navigation Position

Màn hình này nằm ở: **Save Slot Screen (S1, gốc)** → **Màn chơi chính
(S2)** — không có tầng trung gian nào giữa gốc và S2. S2 là điểm đến
**top-level trong phạm vi 1 slot đang mở** (context-dependent: chỉ tồn
tại/reachable khi có 1 slot live đang active — không phải "trang chủ"
độc lập như S1).

**Có thể quay lại S2 từ nhiều nơi**: từ S4 (Story Log live, lật về);
từ S5 (Màn hình 3 lối, sau khi "Chơi lại" thành công tạo slot mới);
và lặp lại ngay tại chính nó theo mỗi lượt (S2 → S2-R Resolving → S2
Turn Confirmed). S2 **không bao giờ** truy cập được từ S4-RO (Story
Log read-only) — slot đã khép không có đường vào S2 (đúng Core Rule #7
"chế độ read-only").

---

## Entry & Exit Points

| Entry Source | Trigger | Player carries this context |
|---|---|---|
| S1 | "Tiếp tục" (slot có sẵn) | Toàn bộ lịch sử/trạng thái slot — D.3b tự backfill 30 lượt gần nhất, không bao giờ để trống |
| S1 | "Bắt đầu mới" | Không có lịch sử — cold-start narration trước 4 gợi ý đầu tiên |
| S4 | Lật về (nút quay lại Story Log) | Vị trí đọc trong Log không ảnh hưởng S2 — S2 luôn hiện đúng resident window hiện tại, không đồng bộ theo vị trí đã đọc |
| S5 | "Chơi lại" thành công (`new_slot_created=true`) | Slot hoàn toàn mới — level=1, mọi trạng thái reset theo Character Continuation |
| S2 (self-loop) | Turn Confirmed (thành công hoặc lỗi AI timeout) | Lượt vừa resolve, `world_time+1` (hoặc giữ nguyên nếu lỗi AI) |

| Exit Destination | Trigger | Notes |
|---|---|---|
| S2-R (Resolving) | `submit_action` | Không phải "rời màn hình" thật — sub-state Turn Manager bên trong S2 |
| S4 | Tap 「Lục」 | Luôn khả dụng kể cả đang Resolving (readonly, D.1) |
| S1 | Tap 「Mục」 → "Về danh sách sổ" | Chỉ khi `tm_state=awaiting_action` (D.1 gate) — mờ mực khi Resolving/Undoing |
| S5 | Tap dòng dẫn cuối đoạn văn lượt chết | Chỉ khi `continuation_choice_eligible=true`, KHÔNG tự động — **một chiều**: không quay lại được S2 của slot này nữa (slot đã khép), chỉ có thể vào S2 mới qua "Chơi lại" |
| O-Card | Tap-tên trong văn / bút tích 「Thẻ」 | Overlay đè lên, không thật sự "rời" S2 |
| O-Set | Bút tích 「Mục」 | Overlay đè lên |

**Exit một chiều duy nhất**: S2 → S5 qua dòng dẫn tap-to-continue —
đây là điểm không thể hoàn tác trong điều hướng (khác các exit khác
đều có đường quay lại S2).

---

## Layout Specification

### Information Hierarchy

**Ưu tiên cao nhất (luôn nổi bật nhất, chiếm phần lớn viewport)**:
1. Văn bản tường thuật — nội dung chính, lý do người chơi ở đây

**Ưu tiên cao (luôn hiện, không sticky nhưng dễ thấy khi tới lượt)**:
2. Header cảnh (đỉnh khung tường thuật)
3. 4 thẻ gợi ý hành động (khu nhập hành động — nổi bật nhất trong 3 phương thức nhập)

**Ưu tiên trung bình (hỗ trợ, phụ trợ trực quan cho thẻ gợi ý)**:
4. Hàng chip intent — shortcut phụ, nhỏ/nhẹ hơn 4 thẻ về thị giác

**Ưu tiên thấp nhất trong khu nhập (luôn sẵn sàng nhưng không kéo mắt)**:
5. Ô nhập tự do + nút gửi — fallback tự do, để cảm giác "chấp bút" không bị lấn át bởi 4 thẻ nhưng cũng không phải điểm nhấn thị giác chính

**Điều kiện/phụ trợ (chỉ xuất hiện khi đúng trạng thái, không chiếm chỗ khi không cần)**:
6. Nút Undo — chỉ khi `undo_available=true`
7. 3 bút tích 「Thẻ」「Lục」「Mục」— luôn có nhưng cố ý thiết kế NHẸ (font-weight 300, không màu/border) để không cạnh tranh với nội dung chính
8. Chỉ báo "thế giới đang viết" — chỉ khi Resolving
9. Thẻ Pending Fate — đậm mực hơn 1 bậc khi xuất hiện, không chip đi kèm (trọng lượng thị giác riêng theo Core Rule #3b)
10. Dòng nudge heuristic — chỉ khi kích hoạt
11. Dòng "đọc tiếp về trước" — chỉ khi cuộn chạm biên cửa sổ live
12. Dòng dẫn tap-to-continue — chỉ khi `continuation_choice_eligible=true`, có nhịp "thở" để tự thu hút sự chú ý đúng lúc cần

### Layout Zones

*(Ghi chú: không đưa ra nhiều phương án zone arrangement khác nhau —
`core-ui-screen-navigation.md` Core Rule #3 đã quy định chặt 1 luồng
cuộn dọc liên tục, không sticky header/footer. Đây là luật cứng đã
Approved, không phải lựa chọn thẩm mỹ để mở lại.)*

**1 luồng cuộn dọc liên tục duy nhất** (không có zone cố định/sticky
nào — khớp Core Rule #3, "không thêm bất kỳ thanh chrome thường trực
nào"):

```
[Bút tích Thẻ/Lục/Mục — lề header, không sticky]
[Header cảnh — tên địa điểm + triện, không sticky]
[Khung tường thuật — cuộn dọc, cửa sổ 30 lượt]
  ↕ (dòng "đọc tiếp về trước" khi chạm biên trên)
[Chỉ báo "thế giới đang viết" — chỉ khi Resolving]
[4 thẻ gợi ý hành động]
[Hàng chip intent]
[Ô nhập tự do + nút gửi]
[Nút Undo — chỉ khi có]
[Bút tích Thẻ/Lục/Mục — lặp lại, cạnh khu nhập]
```

**Desktop/mouse-primary**: cột nội dung căn giữa, max-width 65–75ch
(paper margins 2 bên) — vẫn 1 cột, KHÔNG chuyển sang 2-column (khác
Character Card, nơi `is_touch_primary=false` cho phép 2-column; S2
không tham chiếu `two_column_layout` — luôn 1 cột bất kể input
method).
**Mobile/touch-primary**: full width, padding an toàn theo safe-area
insets (ADR-0007).

### Component Inventory

*(`design/ux/interaction-patterns.md` chưa tồn tại — đây là UX spec
đầu tiên của dự án, nên hầu hết component dưới đây là pattern MỚI, sẽ
flag ở Cross-Reference Check cuối file để đưa vào thư viện sau.)*

| Zone | Component | Loại | Nội dung | Interactive? | Pattern |
|---|---|---|---|---|---|
| Header | Bút tích 「Thẻ」「Lục」「Mục」 | Text link, font-weight 300 | 3 nhãn cố định | Có — mở Card/Log/Menu | **MỚI**: `marginalia-nav-link` |
| Header | Header cảnh | Text tĩnh + seal badge tùy chọn | Tên địa điểm + triện nguy hiểm | Không (trừ triện có thể tap để xem chi tiết — TBD ở Interaction Map) | **MỚI**: `scene-header` |
| Narrative | Khung tường thuật | RichTextLabel cuộn | Văn xuôi + tap-name spans (BBCode meta) | Có — tap-name (ADR-0006) | **MỚI**: `tap-name-span` |
| Narrative | Dòng "đọc tiếp về trước" | Text link, style Họ B | 1 dòng cố định | Có — mở S4 | **MỚI**: `boundary-continue-link` |
| Narrative | Chỉ báo "thế giới đang viết" | Text animated (ink-sweep) | Không có nội dung cố định, hiệu ứng nét mực | Không | **MỚI**: `ink-sweep-loading` |
| Action Input | Thẻ gợi ý hành động (×4) | Card tappable | Nội dung do Situation Gen sinh; 2 slot cố định trong combat (Phòng thủ/Bỏ chạy) | Có | **MỚI**: `suggestion-card` (biến thể Pending Fate: đậm mực hơn, không chip) |
| Action Input | Chip intent | Chip tappable, nhóm theo NPC | Nhãn ngắn (VD tên hành động) | Có — bật ô tự do với nội dung tương ứng | **MỚI**: `intent-chip` |
| Action Input | Ô nhập tự do + nút gửi | Text field + button | Placeholder gợi ý, giữ nguyên nội dung qua timeout | Có | **MỚI**: `free-text-input` (styled) |
| Action Input | Dòng nudge heuristic | Text tĩnh, 1 dòng | Gợi ý enable 1 chip cụ thể | Gián tiếp (tap để bật chip) | **MỚI**: `nudge-line` |
| Action Input | Nút Undo | Button, ẩn/hiện (không disable) | Nhãn "Hoàn tác"/tương đương | Có — chỉ khi `undo_available=true` | **MỚI**: `undo-button` (ẩn hoàn toàn, không mờ) |
| Death flow | Dòng dẫn tap-to-continue | Text link, style Họ B + nhịp thở alpha | "…(chạm để tiếp tục)" | Có — kích hoạt takeover S5 | **MỚI**: `breathing-continue-line` |

### ASCII Wireframe

Mobile portrait, trạng thái Awaiting Action (trạng thái phổ biến nhất):

```
┌─────────────────────────────────┐
│ 「Thẻ」「Lục」「Mục」            │  ← bút tích, font nhẹ, không sticky
│                                   │
│ Rừng Hắc Vụ  🔴                  │  ← header cảnh (địa điểm + triện)
├───────────────────────────────────┤
│                                   │
│  (khung tường thuật — cuộn dọc)  │
│  ...văn xuôi tường thuật...      │
│  ...tap-name: Đường Vũ Đồng...   │  ← tap-name span, font-weight 600
│  ...tiếp tục văn bản...          │
│                                   │
│  — đọc tiếp về trước, mở 「Lục」 —│  ← chỉ hiện khi cuộn chạm biên trên
│                                   │
├───────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐          │
│ │ Thẻ gợi ý│ │ Thẻ gợi ý│          │  ← 4 thẻ gợi ý (2×2 hoặc 1 cột
│ │    1     │ │    2     │          │     tùy bề rộng màn hình)
│ └─────────┘ └─────────┘          │
│ ┌─────────┐ ┌─────────┐          │
│ │ Thẻ gợi ý│ │ Thẻ gợi ý│          │
│ │    3     │ │    4     │          │
│ └─────────┘ └─────────┘          │
│                                   │
│ [chip] [chip] [chip] [chip]      │  ← hàng chip intent, wrap theo NPC
│                                   │
│ 💡 gợi ý: thử "..." (nudge)      │  ← chỉ hiện khi kích hoạt
│                                   │
│ ┌───────────────────────────┐   │
│ │ (ô nhập tự do...)      [Gửi]│   │  ← ô tự do + nút gửi
│ └───────────────────────────┘   │
│                                   │
│ [Hoàn tác]  「Thẻ」「Lục」「Mục」│  ← Undo (nếu có) + bút tích lặp lại
└─────────────────────────────────┘
```

**Trạng thái Resolving** (khác biệt duy nhất so với trên): toàn bộ khu
nhập hành động mờ đi (alpha 0.38, đệ quy), thay bằng dòng "*thế giới
đang viết…*" ngay dưới đoạn văn cuối; bút tích 「Thẻ」「Lục」「Mục」
vẫn full alpha, vẫn bấm được.

---

## States & Variants

| State / Variant | Trigger | What Changes |
|---|---|---|
| Default (Awaiting Action) | Bình thường, chờ hành động | — (baseline) |
| Empty / cold-start | "Bắt đầu mới" hoặc "Chơi lại" (slot mới) | AI viết đoạn mở truyện trước khi 4 gợi ý đầu tiên xuất hiện; khung tường thuật trống trước đó |
| Resolving | `submit_action` | Toàn bộ khu nhập khóa (alpha 0.38, đệ quy); chỉ báo "thế giới đang viết" hiện dưới đoạn văn cuối; 「Thẻ」「Lục」「Mục」 vẫn tự do |
| Undoing | Tap Undo | Khóa giống Resolving |
| Turn Confirmed (`is_death_turn=false`) | AI trả kết quả thành công | Undo xuất hiện (nếu còn trong cửa sổ); 4 thẻ gợi ý mới sinh |
| Turn Confirmed (`is_death_turn=true`) | AI trả kết quả, lượt gây chết thật | Undo **ẩn vĩnh viễn** (không phải mờ); không có 4 thẻ mới; khi `continuation_choice_eligible=true` → dòng dẫn tap-to-continue xuất hiện cuối đoạn văn, auto-scroll tới đó |
| Pending Fate | Vừa thắng 1 trận, đối thủ có `pending_fate` | 2/4 slot thẻ gợi ý bị chiếm bởi "Kết liễu"/"Tha mạng" — đậm mực hơn 1 bậc, KHÔNG có chip đi kèm, chỉ tồn tại đúng 1 lượt |
| Lỗi AI (timeout) | Vượt `ai_call_timeout_seconds=30` | Quay về Awaiting Action, thông báo lỗi HIỆN TRONG khung tường thuật (không banner); **nội dung ô tự do được giữ nguyên**, không xóa |
| Live-window eviction | Cửa sổ đầy (30 lượt) + lượt mới confirm | Lượt cũ nhất bị gỡ hẳn (không chỉ ẩn), vị trí cuộn được bù trừ để không giật |
| Prefetch biên | Cuộn gần biên cửa sổ đã tải (`distance ≤ PREFETCH_THRESHOLD`) | Tải thêm 1 trang cũ hơn, evict trang xa nhất nếu vượt `MAX_LOADED_PAGES` |
| Silent-append | Có lượt mới xác nhận trong khi S2 đang bị che (S4/S5/overlay mở) | Không render ngay; khi quay lại S2, đồng bộ qua delta 1 lượt |

---

## Interaction Map

Mapping cho: Touch/Mouse hỗn hợp (không gamepad).

| Component | Input | Feedback tức thời | Outcome |
|---|---|---|---|
| Thẻ gợi ý (×4) | Tap/click | Highlight nhẹ khi nhấn | `submit_action` — khóa nếu `tm_state≠awaiting_action` (D.1) |
| Chip intent | Tap/click | Chip chuyển trạng thái "đã chọn"; nội dung tương ứng điền vào ô tự do | Bật nội dung gợi ý vào ô tự do — KHÔNG tự submit, người chơi vẫn phải gửi |
| Ô tự do | Gõ (tap để focus trên mobile) | Con trỏ nhấp nháy chuẩn | Text được giữ nguyên qua mọi lỗi/timeout |
| Nút Gửi | Tap/click | Khóa ngay lập tức (chuyển sang Resolving) | `submit_action` với nội dung ô tự do |
| Nút Undo | Tap/click | Tween alpha 1.0→0 ≤150ms rồi gỡ hẳn khỏi layout (AC-59a — không snap, không disabled-ghost) | Hoàn tác lượt vừa confirm, khóa như Resolving trong lúc xử lý |
| Tap-tên (`card_exists=true`) | Tap/click | Không hiệu ứng riêng biệt trước khi mở — mở O-Card ngay (200ms transition) | Mở overlay Thẻ Nhân Vật, luôn khả dụng kể cả Resolving (D.1 readonly) |
| Tap-tên (`card_exists=false`) | Tap/click | Không có gì xảy ra — không styling, không phản hồi | Không hành động (đây là 1 điểm ⚠️ về mặt accessibility — xem Accessibility) |
| Bút tích 「Thẻ」 | Tap/click | Mở O-Card cho nhân vật chính | Luôn khả dụng, kể cả Resolving |
| Bút tích 「Lục」 | Tap/click | Page-flip transition (260ms) | Chuyển sang S4, luôn khả dụng kể cả Resolving |
| Bút tích 「Mục」 | Tap/click | Mở O-Set | Luôn khả dụng kể cả Resolving |
| Dòng "đọc tiếp về trước" | Tap/click | Page-flip transition | Chuyển sang S4 tại đúng lượt kế biên cửa sổ |
| Dòng dẫn tap-to-continue | Tap/click (bất kỳ đâu trên dòng) / Enter hoặc Space khi đang focus (dòng dẫn TỰ NHẬN focus cùng nhịp auto-scroll) | Nhịp thở alpha dừng lại, chuyển cảnh sang S5 | Kích hoạt takeover Character Continuation — **hành động 1 chiều duy nhất không auto-timeout của toàn S2** |
| Nudge heuristic line | Tap/click | Chip tương ứng được bật (1 chiều — tap để enable, không tự enable) | Không submit, chỉ hỗ trợ điền |
| Khu nhập (bàn phím) | Tab/Shift+Tab di chuyển focus; Enter/Space kích hoạt phần tử đang focus (thẻ gợi ý/chip/nút Gửi/nút Undo) | Focus ring 2px chuẩn (mục 9 Visual/Audio GDD) | Outcome giống hệt tap/click tương ứng — cùng gate D.1 (`tm_state≠awaiting_action` → từ chối ở tầng UI) |

---

## Events Fired

*(Ghi chú: "event" ở đây là game-state signal nội bộ (Godot signal
bus) — dự án chưa cấu hình hệ analytics nào.)*

| Player Action | Event Fired | Payload / Data |
|---|---|---|
| Tap thẻ gợi ý / Gửi ô tự do | `action_submitted` | nội dung action, `screen=S2` |
| Tap Undo | `undo_requested` | — |
| Tap-tên (`card_exists=true`) / Tap 「Thẻ」 | `card_opened` | `char_id` |
| Tap 「Lục」 (kể cả qua "đọc tiếp về trước") | `story_log_opened` | `anchor_turn_id` (nếu có, khi vào từ dòng biên) |
| Tap 「Mục」 | `settings_opened` | — |
| Tap dòng dẫn tap-to-continue | `continuation_takeover_triggered` | — |
| Tap chip intent | **Không có event** — chỉ thay đổi state cục bộ của ô tự do, không ghi world state | — |
| Nudge heuristic tap | **Không có event** — cùng lý do trên | — |

**⚠️ Action ghi trạng thái bền vững (persistent), cần chú ý đặc biệt
từ team kiến trúc**: `action_submitted` (ghi 1 lượt mới), `undo_requested`
(hoàn tác lượt), `continuation_takeover_triggered` (đóng slot hiện tại,
chuyển sang S5 — không thể quay lại). 3 event này là những nơi DUY
NHẤT trên S2 thay đổi dữ liệu đã lưu; các event còn lại (`card_opened`,
`story_log_opened`, `settings_opened`) chỉ điều hướng UI, không ghi gì.

---

## Transitions & Animations

**Screen enter/exit** (S2 ↔ S1/S4/S5): page-flip animation,
`transition_screen_ms=260ms` (registry, ≥`card_transition_ms` theo
ràng buộc thứ tự `banner ≤ overlay_settings ≤ overlay_card ≤ screen`).

**In-screen state-change animations**:
- **Vào Resolving**: khu nhập hành động fade alpha xuống `0.38`
  (đệ quy cả cây node); chỉ báo "thế giới đang viết" fade-in cùng lúc,
  hiệu ứng ink-sweep (nét mực kéo dài ngang, KHÔNG map với thời gian
  thực đã trôi).
- **Leo thang diegetic nhẹ khi AI call kéo dài** (đóng OQ#14
  `core-ui-screen-navigation.md`): sau `ai_writing_escalation_seconds`
  (provisional **15s**, tuning knob — dải an toàn 10–25s, PHẢI
  `< ai_call_timeout_seconds=30`), văn bản chỉ báo đổi sang biến thể
  thứ hai (VD "*thế giới vẫn đang viết…*" — copy chính thức chốt với
  `narrative-director` khi implement, xem Open Questions), đổi ĐÚNG 1
  LẦN, không leo thang tiếp; giữ nguyên hiệu ứng ink-sweep, KHÔNG
  spinner/%/progress — không đổi ngôn ngữ thị giác đã khóa (Art
  Bible).
- **Turn Confirmed → 4 thẻ gợi ý mới**: fade-in nhẹ (thời lượng chưa
  có trong GDD nguồn — đề xuất provisional 150ms, cần xác nhận với
  `ui-programmer`/`art-director` khi implement).
- **Nút Undo xuất hiện**: fade-in khi `undo_available` chuyển `true`.
- **Nút Undo biến mất**: tween alpha 1.0→0 thời lượng **≤150ms**, node
  chỉ bị gỡ khỏi layout SAU khi tween hoàn tất (AC-59a GDD) — mờ dần
  mượt, không snap giữa 2 frame (AC-59b); mọi nguyên nhân biến mất
  (lượt kế tiếp confirm / `is_death_turn=true` / vừa bấm Undo) đều
  render CÙNG hiệu ứng. "Biến mất hoàn toàn" của Core Rule #5 nghĩa là
  gỡ hẳn khỏi layout (không disabled-ghost), KHÔNG có nghĩa là snap
  tức thì. *(Sửa 2026-08-13 sau `/ux-review` — bản trước ghi "KHÔNG
  fade, tức thì", mâu thuẫn trực tiếp AC-59a/59b.)*
- **Dòng dẫn tap-to-continue**: nhịp thở alpha liên tục `[0.85, 1.0]`,
  chu kỳ ~2s, không dừng cho tới khi được tap; auto-scroll BẮT BUỘC
  tới dòng này ngay khi `continuation_choice_eligible=true` — ngoại lệ
  DUY NHẤT của luật "không sticky/không auto-scroll" toàn game.
- **Thẻ Pending Fate**: không có animation entrance riêng biệt — xuất
  hiện cùng lúc với 3 thẻ còn lại, chỉ khác ở mức mực đậm hơn tĩnh.

**Reduced-motion**: ⚠️ GDD nguồn hiện **chưa có toggle giảm chuyển
động** ở Settings MVP (chỉ có Cỡ chữ + Cấu hình AI, Core Rule #10) —
nhịp thở của dòng tap-to-continue là animation liên tục dài nhất trên
S2, đáng cân nhắc nhất nếu cần giảm motion. Flag vào Open Questions.

---

## Data Requirements

| Data | Nguồn hệ | Read/Write | Ghi chú |
|---|---|---|---|
| `tm_state`, `undo_available`, `is_death_turn` | Turn Manager | Read | Nguồn sự thật cho input-lock (D.1) + hiện/ẩn Undo |
| `total_turns(slot)`, `last_confirmed_turn_id`, `get_turn_page(anchor, count, direction)` | World Memory | Read | API phân trang — S2 KHÔNG BAO GIỜ request toàn bộ log |
| `s2_resident_turns`, `s2_oldest_resident_turn_id`, `s2_last_synced_turn_id` | S2 tự sở hữu (buffer state, D.3b) | Read/Write | State-based, không tính lại từ đầu mỗi lần |
| 4 thẻ gợi ý, chip intent, dòng nudge | Situation/Encounter Generation | Read | S2 chỉ render, không sở hữu nội dung |
| Thẻ Pending Fate | Death & Consequence | Read | Pass-through, S2 chỉ sở hữu trọng lượng hiển thị |
| Danh sách hành động combat | Combat System | Read | Tái dùng đúng khung 4-thẻ chuẩn |
| `card_exists(char_id)` | Character Card & Identity | Read | Gate styling/interactivity của tap-tên |
| `continuation_choice_eligible` | Character Continuation | Read | Gate hiện dòng dẫn tap-to-continue |
| `ai_call_timeout_seconds=30` | AI/LLM Integration Layer | Read | Ngưỡng chuyển từ Resolving sang lỗi |
| Số liệu chỉ số (stat numbers) | Mechanic/Narration Contract Enforcement | **KHÔNG BAO GIỜ xuất hiện** trong văn tường thuật S2 | Formula 1 leak-detector của hệ đó bắt lỗi nếu rò rỉ vào `narration_text` |
| Nội dung action submit | Turn Manager | Write | Từ thẻ gợi ý/chip/ô tự do |
| Yêu cầu Undo | Turn Manager | Write | Từ nút Undo |

**Lưu ý kiến trúc** (không phải quyết định UI): việc UI cần sở hữu
buffer state riêng (`s2_resident_turns` etc.) cho D.3b là 1 điểm cần
`technical-director` xác nhận khi vào `/create-architecture` — spec
này chỉ định nghĩa UI CẦN gì, không quyết định cách triển khai.

---

## Accessibility

*(Chưa có `design/accessibility-requirements.md` — tier accessibility
chính thức chưa được định nghĩa cho toàn dự án. Baseline đề xuất:
WCAG-AA, trừ 2 ngoại lệ đã có ghi chép chính thức bên dưới. Xem Open
Questions.)*

- **Keyboard-only navigation**: 3 bút tích 「Thẻ」「Lục」「Mục」 PHẢI
  Tab-reachable + Enter-activatable (ADR-0006 xác nhận đây là fallback
  bàn phím duy nhất được đảm bảo). 4 thẻ gợi ý, hàng chip, ô tự do,
  nút Gửi, nút Undo: Tab order theo đúng thứ tự visual (header
  bookmarks → thẻ gợi ý → chip → ô tự do → nút gửi → Undo → bookmarks
  đáy), Enter/Space kích hoạt phần tử đang focus. ⚠️ Lưu ý implement:
  thẻ gợi ý/chip là **Card/Chip tappable, KHÔNG phải Button bản chất**
  — phải khai báo focus mode + xử lý Enter/Space tường minh, không
  mặc định có sẵn như Button (cover đúng bước "submit action" của
  AC-56a GDD).
- **Dòng dẫn tap-to-continue (bàn phím)**: khi
  `continuation_choice_eligible=true`, dòng dẫn PHẢI Tab-reachable +
  Enter/Space-activatable, và TỰ NHẬN focus cùng nhịp auto-scroll
  (sau lượt chết khu nhập không còn render — Tab order lúc này chỉ
  còn: bút tích header → dòng dẫn → bút tích đáy). Đây là con đường
  DUY NHẤT sang S5 (Core Rule #6), KHÔNG thuộc phạm vi 2 ngoại lệ
  ADR-0006 — thiếu route này, người dùng keyboard-only kẹt vĩnh viễn
  tại S2 sau lượt chết.
- **⚠️ Ngoại lệ đã ghi chép (ADR-0006 Part 2)**: tap-tên trong văn
  tường thuật **KHÔNG** Tab-reachable ở MVP (WCAG SC 4.1.2 & 1.3.1
  không đạt) — đây là exception có chủ đích, có ghi chép, không phải
  bỏ sót. Người dùng bàn phím thuần muốn mở Thẻ phải qua bút tích
  「Thẻ」 (chỉ mở được Thẻ nhân vật chính, không mở được Thẻ NPC qua
  bàn phím ở MVP — AC-56b BLOCKED, chờ giải pháp tương lai).
- **Text contrast & cỡ chữ**: tuân 3 nấc `font_scale_steps`
  `{0.875, 1.0, 1.25}` (S/M/L) từ Settings — khung tường thuật phải
  re-wrap đúng khi đổi cỡ, không cắt chữ.
- **Color-independent**: đã tự nhiên đạt được nhờ Visual Identity
  Anchor — Pending Fate phân biệt bằng **độ đậm mực** (không màu),
  trạng thái Resolving/disabled phân biệt bằng **alpha** (không màu)
  — không có thông tin nào trên S2 chỉ truyền đạt qua màu sắc.
- **Screen reader**: tap-tên VÀ 3 bút tích đều **ngoài phạm vi hỗ trợ
  AT ở MVP** (ADR-0006 — ngoại lệ có ghi chép, không phải miễn trừ
  accessibility nói chung). Khung tường thuật (văn xuôi thuần) và ô
  tự do (input chuẩn) không có rào cản đặc biệt.
- **Touch target**: `TOUCH_TARGET_MIN=44px` áp dụng cho mọi phần tử
  tap độc lập (thẻ, chip, bookmark, Undo). Tap-tên NHÚNG trong văn
  xuôi dùng công thức riêng D.4a (best-effort, bị giới hạn vật lý bởi
  kích thước chữ trong dòng) — đây là ngoại lệ "Inline" hợp lệ theo
  WCAG, nhưng **chưa có validate mis-tap thật trên thiết bị** cho tên
  1-2 ký tự — cần playtest tripwire trước khi ship.
- **Reduced motion**: chưa có toggle ở Settings MVP (xem Transitions
  & Animations) — flag Open Questions.

---

## Localization Considerations

**Ngoài phạm vi hiện tại**: dự án là sản phẩm cá nhân, đơn ngôn ngữ
(tiếng Việt), không có kế hoạch đa ngôn ngữ (`game-concept.md` Target
Player Profile — người chơi duy nhất là nhà phát triển). Không có
yêu cầu localization thật cho S2 ở giai đoạn này.

**Ghi chú dự phòng** (nếu localize trong tương lai, không chặn MVP):
phần tử layout-critical nhất là 4 thẻ gợi ý hành động (không gian cố
định, text dài có thể vỡ layout) và nhãn bút tích 「Thẻ」「Lục」「Mục」
(1 ký tự, thiết kế đặc thù tiếng Hán-Việt — không có tương đương trực
tiếp bằng ngôn ngữ khác nếu cần dịch sau này).

---

## Acceptance Criteria

- [ ] Mở S2 từ S1 ("Tiếp tục"/"Bắt đầu mới"): dữ liệu hiển thị sẵn sàng trong <100ms (local, không network); độ trễ cảm nhận được của người chơi = trọn page-flip `transition_screen_ms=260ms`; **mốc pass/fail: khi animation lật trang kết thúc, S2 đã render hoàn chỉnh** — không loading screen, không frame trống/skeleton nào sau khi lật xong
- [ ] Từ S2, tap 「Lục」 điều hướng đúng tới S4 (Story Log live) và giữ nguyên vị trí cuộn của S2 khi quay lại
- [ ] Khi AI call vượt `ai_call_timeout_seconds=30`, S2 quay về Awaiting Action với thông báo lỗi TRONG khung tường thuật (không banner) và **nội dung ô tự do người chơi đã gõ được giữ nguyên nguyên vẹn**, không bị xóa/reset
- [ ] Toàn bộ 3 bút tích 「Thẻ」「Lục」「Mục」 reachable và activatable bằng Tab + Enter thuần bàn phím, kể cả khi `tm_state=resolving`
- [ ] Submit 1 hành động (thẻ gợi ý/chip/ô tự do) → `tm_state` chuyển `resolving` → khu nhập khóa đệ quy (alpha 0.38) → AI trả kết quả → narrative frame cập nhật đoạn văn mới → `tm_state` về `awaiting_action`, 4 thẻ gợi ý mới xuất hiện
- [ ] Submit hành động thứ 2 trong lúc `tm_state=resolving` bị từ chối Ở TẦNG UI (không tới được Turn Manager) — verify bằng cả 2: (a) `write_action_allowed`-style formula trả `false`, (b) thao tác UI thật sự không phản hồi
- [ ] Nút Undo hiện đúng khi `undo_available=true`; khi `undo_available=false` (kể cả ngay sau `is_death_turn=true`), tween alpha 1.0→0 chạy đúng thời lượng ≤150ms TRƯỚC khi node bị gỡ hẳn khỏi layout — không disabled-ghost, không snap giữa 2 frame (mirror AC-59a/59b GDD)
- [ ] Khi có `pending_fate`, đúng 2/4 slot thẻ gợi ý hiển thị "Kết liễu"/"Tha mạng", render đậm mực hơn 1 bậc so với 3 thẻ còn lại, và KHÔNG có chip intent đi kèm 2 thẻ đó
- [ ] Cửa sổ live giữ đúng trần D.3b: `s2_resident_turns(slot) = min(total_turns(slot), LIVE_WINDOW_TURNS)` với `LIVE_WINDOW_TURNS=30` — verify với 1 slot có `total_turns` rất lớn (VD 1000+): số lượt resident trong khung tường thuật không bao giờ vượt 30, số node không tăng theo `total_turns` (mirror AC-48/AC-66 GDD; KHÔNG dùng `ui_memory_bound = MAX_LOADED_PAGES × PAGE_SIZE` — đó là công thức D.3 của Story Log S4)
- [ ] Khi `continuation_choice_eligible=true`, S2 auto-scroll tới dòng dẫn tap-to-continue NGAY khi cờ được set (không chờ người chơi tự cuộn) — verify đây là animation auto-scroll DUY NHẤT xảy ra trên toàn S2
- [ ] Tap dòng dẫn tap-to-continue → chuyển sang S5, và slot hiện tại không còn đường quay lại S2 cũ (chỉ có thể vào S2 mới qua "Chơi lại" ở S5)
- [ ] (Bàn phím) GIVEN `continuation_choice_eligible=true`, dòng dẫn tap-to-continue TỰ NHẬN focus cùng nhịp auto-scroll, Tab-reachable, và Enter/Space kích hoạt chuyển sang S5 — toàn bộ luồng sau-lượt-chết đi được bằng bàn phím thuần, không cần chuột/touch lần nào
- [ ] (Bàn phím) Submit 1 hành động bằng bàn phím thuần: Tab tới 1 thẻ gợi ý → Enter/Space → `submit_action` được gọi với nội dung thẻ đó (cùng gate D.1 như tap) — cover đúng bước "submit action" của AC-56a (GDD)
- [ ] Chỉ báo "thế giới đang viết" đổi văn bản sang biến thể thứ hai ĐÚNG 1 lần sau `ai_writing_escalation_seconds=15` (mock clock, không đo thời gian thực), KHÔNG đổi trước ngưỡng, và KHÔNG spinner/%/progress xuất hiện ở bất kỳ thời điểm nào của Resolving

---

## Open Questions

1. **Cơ chế "cold-start narration" chưa được đặc tả** (owner: game
   designer/`situation-encounter-generation.md`, target: trước
   implement) — S2 cần AI viết đoạn mở truyện trước 4 gợi ý đầu tiên
   khi "Bắt đầu mới"/"Chơi lại", nhưng GDD sở hữu nội dung
   (`situation-encounter-generation.md`) chưa đặc tả cơ chế này.
2. **Chưa có toggle giảm chuyển động (reduced-motion)** (owner:
   `ux-designer`, target: trước khi ship) — nhịp thở alpha của dòng
   tap-to-continue là animation liên tục dài nhất S2; Settings MVP
   hiện chỉ có Cỡ chữ + Cấu hình AI.
3. **Chưa validate mis-tap thật cho tap-tên 1-2 ký tự trên thiết bị**
   (owner: `qa-lead`, target: trước playtest chính thức) — công thức
   D.4a (best-effort touch target cho tap-tên nhúng trong văn) chưa
   có bằng chứng thực nghiệm trên thiết bị thật.
4. **Thời lượng fade-in cho 4 thẻ gợi ý mới chưa được GDD nguồn định
   nghĩa** (owner: `ui-programmer`/`art-director`, target: khi
   implement) — đề xuất provisional 150ms trong spec này, cần xác
   nhận chính thức.
5. **11 pattern mới trong Component Inventory chưa có trong
   `design/ux/interaction-patterns.md`** (chưa tồn tại) — xem Cross-
   Reference Check bên dưới.
6. **`design/player-journey.md` chưa tồn tại** — thiết kế này dựa
   trên giả định về bối cảnh người chơi (Player Context on Arrival)
   thay vì hành trình đã map. Cân nhắc chạy phiên player-journey sau
   khi spec này được duyệt.
7. **Copy chính thức cho biến thể leo thang của chỉ báo "đang viết"**
   (owner: `narrative-director`, target: khi implement) — spec đã
   chốt CƠ CHẾ (đổi văn bản đúng 1 lần sau
   `ai_writing_escalation_seconds=15`, đóng OQ#14 GDD, xem
   §Transitions & Animations); câu chữ cụ thể của biến thể thứ hai
   (VD "*thế giới vẫn đang viết…*") còn provisional, cần
   `narrative-director` duyệt.
