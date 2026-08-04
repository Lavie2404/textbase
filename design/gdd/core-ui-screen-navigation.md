# Core UI / Screen Navigation

> **Status**: Designed — Pending Review
> **Author**: duchx + Claude Code agents (systems-designer: Formulas; art-director: Visual/Audio; qa-lead: Acceptance Criteria)
> **Last Updated**: 2026-08-04
> **Implements Pillar**: Pillar 4 (Tường Thuật Sống Động), Pillar 2 (Hệ Quả Thực Sự)
> **Creative Director Review (CD-GDD-ALIGN)**: skipped — Lean mode

## Overview

**Core UI / Screen Navigation** là khung trình bày và điều hướng toàn cục của Vô Danh Lục — hệ thống sở hữu **màn hình chơi chính** (khung tường thuật + khu nhập hành động với 4 gợi ý, chip intent, ô tự do) và điều phối việc di chuyển giữa số ít bề mặt còn lại: Save Slot Screen (điểm vào khi mở game), Nhật ký câu chuyện (Story Log), overlay Thẻ Nhân Vật, và màn hình 3 lối tiếp tục sau cái chết. Hệ này **không sở hữu nội dung** bên trong các bề mặt đó — nội dung thuộc về các GDD tương ứng (Persistence, World Memory, Character Card, Character Continuation) — nó sở hữu **cấu trúc điều hướng, luật ưu tiên hiển thị giữa các bề mặt, các điểm vào (nút, tap-tên nhân vật qua `card_exists`), và việc thực thi trạng thái khóa input của Turn Manager ở tầng hiển thị** (Resolving/Undoing → từ chối thao tác thứ hai). Với người chơi, đây là hệ quyết định cảm giác toàn cục của game: không phải một "app có nhiều màn hình" mà là **một cuốn nhật ký đang mở** — xem thẻ, đọc lại chuyện cũ, hay chọn slot chỉ là lật sang trang khác của cùng cuốn sổ (Visual Identity Anchor "Mực Chưa Khô"). Nếu thiếu hệ này, 14 hệ thống còn lại có đầy đủ nội dung nhưng không có cửa vào — không tồn tại đường đi nào từ lúc mở game đến lượt chơi đầu tiên.

## Player Fantasy

**Cảm giác đích: "Tôi đang cầm cuốn nhật ký tu luyện của chính mình — không phải đang dùng một app."**

Người chơi không bao giờ có cảm giác "chuyển màn hình". Mở Thẻ Nhân Vật là **lật nghiêng một trang để xem mặt sau**; đọc Story Log là **giở ngược về các trang đã viết**; chọn slot là **rút một cuốn sổ từ ngăn kéo**. Điều hướng tốt nhất trong game này là điều hướng người chơi không nhận ra — mạch đọc tiểu thuyết không bao giờ bị cắt bởi loading screen, menu dạng lưới, hay bất kỳ chrome nào gợi nhắc "đây là phần mềm" (phản-HUD, theo "Mực Chưa Khô").

**Khoảnh khắc neo** (player moment): giữa một tình huống căng — người chơi tap tên đối thủ ngay trong câu văn đang đọc, thẻ nhân vật loang mực mở ra *đè lên* trang truyện, xem chỉ số, đóng lại — và câu văn vẫn nằm nguyên chỗ cũ, chưa mất một nhịp đọc nào. Cảm giác cần đạt: *"tôi vừa liếc tài liệu, chưa hề rời bàn."*

**Trọng lượng của thao tác**: vì Pillar 2 (Hệ Quả Thực Sự), khu nhập hành động phải mang cảm giác **chấp bút** — viết dòng tiếp theo vào nhật ký — chứ không phải bấm nút lệnh. Nút Undo hiếm hoi (chỉ 1 lượt) xuất hiện như quyền *gạch dòng vừa viết khi mực còn ướt*; khi nó biến mất, người chơi hiểu ngay: mực đã khô, chuyện đã thành sử.

**Phản-fantasy** (những cảm giác phải tránh): cảm giác "app nhiều tab" (bottom nav bar kiểu mobile app), cảm giác "game menu" (pause screen, settings chiếm chỗ trang trọng), và cảm giác "bị giam" khi input khóa lúc Resolving — chờ AI phải đọc ra thành *"thế giới đang viết nốt trang này"*, không phải spinner của phần mềm.

**Pillar phục vụ**: Pillar 4 — *"luôn ưu tiên tường thuật, số liệu chỉ là hậu trường"* (mọi bề mặt số liệu đều là overlay tạm, văn xuôi là mặc định); Pillar 2 — Undo 1-lượt hiển thị đúng như thiết kế test của pillar: *"undo đúng 1 lượt gần nhất để sửa lỗi thao tác, khóa vĩnh viễn ngay khi lượt kế tiếp được xác nhận."*

## Detailed Design

### Core Rules

**#1 — Mô hình 3 tầng hiển thị.** Toàn bộ UI xếp vào đúng 3 tầng, ưu tiên từ thấp đến cao:

- **Tầng màn hình** (1 màn hình active tại mọi thời điểm): Save Slot Screen, Màn chơi chính, Story Log, Màn hình 3 lối. Chuyển màn hình = lật trang, không có loading screen (mọi dữ liệu đều local, trừ AI call).
- **Tầng overlay** (đè lên màn hình, tối đa 1 overlay mở tại một thời điểm): Thẻ Nhân Vật, Bảng Settings. Mở/đóng overlay không tiêu tốn lượt, không làm mất vị trí cuộn của màn hình bên dưới.
- **Tầng banner** (thông báo không chặn): cảnh báo quota, lỗi ghi save (Persistence). Banner hiện tại chỗ trên màn hình hiện hành, không bao giờ là modal, không bao giờ tự điều hướng.

**#2 — Save Slot Screen là gốc.** Mở game → luôn vào Save Slot Screen (hệ #6 sở hữu nội dung). Từ đây: "Tiếp tục"/"Bắt đầu mới" → Màn chơi chính; "Xem lại" (slot đã khép) → Story Log ở **chế độ read-only**.

**#3 — Màn chơi chính là mặc định trong phiên.** Gồm: khung tường thuật (cuộn dọc), header cảnh (nội dung thuộc Situation Gen — tên địa điểm + triện nguy hiểm, không sticky), và khu nhập hành động (4 thẻ gợi ý + hàng chip intent + ô tự do — nội dung thuộc Situation Gen/Turn Manager). **Điểm vào điều hướng gộp vào lề cạnh header cảnh** dưới dạng 3 bút tích nhỏ: 「Thẻ」 (thẻ bản thân — vị trí mà hệ #14 ủy quyền cho hệ này), 「Lục」 (Story Log), 「Mục」 (menu: Về danh sách sổ / Settings). Không thêm bất kỳ thanh chrome thường trực nào khác.

**#4 — Khóa input có một nguồn sự thật duy nhất.** UI đọc trạng thái Turn Manager (Awaiting Action / Resolving / Undoing) và áp dụng luật:

- **Resolving/Undoing khóa mọi thao tác ghi-trạng-thái**: submit hành động, chip, thẻ gợi ý, Undo, nút Song Tu/Hồi phục trên Card (đúng luật hệ #14), "Về danh sách sổ", "Xóa slot". Trạng thái disabled = mờ mực (giảm alpha), không đổi màu.
- **Thao tác chỉ-đọc luôn tự do**: mở/đóng Thẻ, đọc Story Log, cuộn, mở Settings. Người chơi không bao giờ bị "giam" hoàn toàn trong lúc chờ AI.
- Submit lần 2 trong lúc Resolving bị **từ chối ở tầng UI** (không đến được Turn Manager) — thực thi bằng khóa đệ quy cả cây node khu nhập.

**#5 — Nút Undo hiện/ẩn theo đúng `undo_availability_window`.** Khi `undo_available=false` nút **biến mất hoàn toàn** (không phải disabled) — kể cả ngay sau lượt `is_death_turn=true`. Đây là biểu hiện UI của Pillar 2: nút tồn tại = mực còn ướt.

**#6 — Takeover 3 lối.** Khi `continuation_choice_eligible=true`: Màn hình 3 lối **thay thế** Màn chơi chính; khu nhập hành động + chip + gợi ý bị gỡ hoàn toàn (Turn Manager không hoạt động, đúng hệ #13). Điểm vào 「Lục」 và 「Thẻ」 **vẫn còn** (read-only — xem lại đời vừa kết thúc, thẻ mang triện `alive=false`); 「Mục」 chỉ còn "Về danh sách sổ". Chọn "Chơi lại" thành công → về Màn chơi chính trên slot mới.

**#7 — Chế độ read-only (slot đã khép).** Vào từ "Xem lại": chỉ có Story Log + overlay Thẻ (tap-tên hoạt động bình thường); không có khu nhập, không có đường vào Màn chơi chính; mọi nút ghi-trạng-thái không render. Thoát duy nhất → Save Slot Screen.

**#8 — Điểm vào Thẻ Nhân Vật.** Hai điểm vào MVP: (a) **tap-tên trong văn tường thuật** — mọi tên có `card_exists=true` là tap target, hoạt động ở cả Màn chơi chính, Story Log (kể cả read-only), và Màn hình 3 lối; (b) **bút tích 「Thẻ」** (thẻ bản thân) — ở lề header cảnh (S2, S5) VÀ trên thanh chrome Story Log (S4/S4-RO — mở thẻ nhân vật chính của đời đang xem; GAP-3, qa-lead: nếu thiếu, người đang đọc Log không có đường mở thẻ bản thân). Danh sách nhân vật/địa điểm làm điểm vào thứ 3 — **ngoài scope MVP** (đúng ủy quyền hệ #14 đã hoãn).

**#9 — Trạng thái chờ AI.** Trong Resolving, khung tường thuật hiển thị chỉ báo "thế giới đang viết" (nét mực đang kéo dài — không phải spinner). Quá `ai_call_timeout_seconds=30` → AI layer báo lỗi → UI trả người chơi về Awaiting Action với thông báo trong khung tường thuật (không banner, không mất world_time — đúng AC-13 Turn Manager).

**#10 — Settings tối thiểu (MVP).** Overlay mở từ 「Mục」 (có mặt ở cả Save Slot Screen và Màn chơi chính), gồm đúng 2 nhóm: (a) **Cỡ chữ** — 3 nấc S/M/L, áp dụng toàn cục qua Theme scale, lưu ở cấu hình cấp-thiết-bị (ngoài slot bundle — không thuộc Persistence, xem Dependencies); (b) **Cấu hình AI** — ô nhập API key; danh sách field chính xác **do ADR backend AI quyết định**, GDD này chỉ giữ chỗ nhóm mục.

### States and Transitions

| # | Trạng thái | Vào từ | Thoát đến | Điều kiện |
|---|---|---|---|---|
| S1 | Save Slot Screen | Mở game; S2/S4/S5 qua "Về danh sách sổ"; S4-RO thoát | S2 (Tiếp tục/Bắt đầu mới), S4-RO (Xem lại) | luôn khả dụng khi không Resolving |
| S2 | Màn chơi chính — Awaiting Action | S1; S2-R xong; S2-U xong; S5 (Chơi lại OK); S4 (lật về) | S2-R (submit), S4 (「Lục」), S1 (menu), S2-U (Undo) | theo Turn Manager |
| S2-R | Màn chơi chính — Resolving | S2 submit | S2 (thành công/lỗi AI), S2-D | khóa ghi-trạng-thái (#4) |
| S2-U | Màn chơi chính — Undoing | S2 bấm Undo | S2 | khóa như S2-R |
| S2-D | Turn Confirmed, `is_death_turn=true` | S2-R | S5 | Undo ẩn vĩnh viễn (#5); tự chuyển khi `continuation_choice_eligible=true` |
| S4 | Story Log (live) | S2 「Lục」 (cả ở Awaiting Action lẫn trong Resolving — đọc trong lúc chờ được phép, #4) | S2 (lật về) | chỉ-đọc |
| S4-RO | Story Log (read-only) | S1 "Xem lại"; S5 「Lục」 | S1 (hoặc S5 nếu vào từ S5) | không nút ghi-trạng-thái (#7) |
| S5 | Màn hình 3 lối | S2-D | S2 (slot mới), S1 (menu), S4-RO (「Lục」) | takeover (#6); Reset Failed hiện inline + Thử lại |
| O-Card | Overlay Thẻ | tap-tên / 「Thẻ」 từ S2, S4, S4-RO, S5 | đóng (X / tap ngoài / Esc) | không tiêu lượt; nút ghi-trạng-thái tuân #4 |
| O-Set | Overlay Settings | 「Mục」 từ S1, S2 | đóng | không tiêu lượt |

### Interactions with Other Systems

| Hệ | Chiều | Dữ liệu qua interface | Ai sở hữu |
|---|---|---|---|
| Turn Manager | đọc + gửi | Đọc state machine (Awaiting/Resolving/Undoing/`is_death_turn`) + `undo_available`; gửi action submit + lệnh Undo qua đường chuẩn | Turn Manager sở hữu state; hệ này sở hữu cách thể hiện |
| Contract Enforcement | ràng buộc | Hệ này là **mặt thực thi hiển thị** của Core Rule #4 bên đó: số liệu chỉ render trong khung con dấu ở các bề mặt UI, không bao giờ trong văn tường thuật | Contract Enforcement sở hữu luật |
| Situation Gen | đọc | Menu chip intent + nhóm theo NPC, header cảnh (location + triện), nudge heuristic (1 dòng gợi ý, không auto-activate) | Situation Gen sở hữu nội dung; hệ này sở hữu khung render |
| Combat | ràng buộc | Ràng buộc áp cho HỆ THỐNG: Combat không bao giờ tự kích hoạt chuyển màn hình (không màn combat riêng/mode-switch); điều hướng do người chơi trong trận vẫn theo D.1/D.2 chuẩn (an toàn nhờ auto-save + `turn_snapshot` serialize trạng thái trận — GAP-2, qa-lead); danh sách hành động trận đấu đi qua đúng khung 4-gợi-ý chuẩn | Combat sở hữu nội dung |
| Character Card (#14) | cung cấp | Điểm vào tap-tên (query `card_exists`) + bút tích 「Thẻ」 + tầng overlay; timing mở thẻ theo knob `card_transition_ms` bên đó | Hệ này sở hữu điểm vào; #14 sở hữu nội dung thẻ |
| World Memory | đọc | Nội dung Story Log qua API phân trang (lazy-load bắt buộc); marker "Lượt N" | World Memory sở hữu dữ liệu |
| Persistence | đọc + hiển thị | Danh sách slot + metadata; banner quota/lỗi ghi (tầng banner, #1); auto-save vô hình với UI | Persistence sở hữu logic; hệ này sở hữu chỗ đặt banner |
| Character Continuation | đọc | Cờ `continuation_choice_eligible` kích takeover S5; trạng thái Reset Failed + retry | #13 sở hữu nội dung màn 3 lối |
| Death & Consequence | pass-through | Gợi ý Kết liễu/Tha mạng (Pending Fate) đi qua khung 4-gợi-ý chuẩn — không UI riêng | #12 sở hữu nội dung |
| AI/LLM Layer | gián tiếp | Chỉ báo "đang viết" trong Resolving; ngưỡng `ai_call_timeout_seconds=30` | AI layer sở hữu timeout |
| Setting & Canon / NPC Affinity / EXP | gián tiếp | Mọi hiển thị đi qua Card hoặc khung tường thuật — không interface trực tiếp | các hệ tương ứng |

## Formulas

*(Đề xuất bởi `systems-designer`, duyệt 2026-08-04. D.6 giữ dạng formula theo quyết định người dùng; `TOUCH_TARGET_MIN` + `card_transition_ms` sẽ đăng ký registry.)*

### D.1 — `write_action_allowed(action, tm_state)`

```
class(action) ∈ {mutating, readonly}   // bảng phân loại cố định bên dưới
write_action_allowed(action, tm_state) =
    1                                          if class(action) = readonly
    (tm_state = awaiting_action)               if class(action) = mutating
```

**Bảng phân loại action** (dữ liệu hỗ trợ, để QA lặp hết mọi cặp):

| `class = mutating` (khóa khi Resolving/Undoing) | `class = readonly` (luôn tự do) |
|---|---|
| `submit_action`, `tap_suggestion_card`, `tap_intent_chip` | `open_card`, `close_card`, `tap_name_link` (mở Card) |
| `tap_undo` | `open_story_log`, `scroll_story_log` |
| `tap_song_tu_button`, `tap_recovery_button` (trên Card, luật hệ #14) | `open_settings`, `close_settings` |
| `tap_back_to_slots`, `tap_delete_slot` | — |

*Ghi chú (GAP-4, qa-lead 2026-08-04): `tap_retry_reset` (nút "Thử lại" ở S5) KHÔNG thuộc bảng này — Turn Manager không hoạt động tại S5 nên `tm_state` vô nghĩa ở đó. Nút Thử lại khóa theo cờ riêng `reset_in_progress` do Character Continuation (#13) sở hữu (xem Edge Cases).*

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Hành động đang xét | `action` | enum | 15 giá trị bảng trên (8 mutating + 7 readonly) | Sự kiện input người chơi gửi tới UI |
| Lớp hành động | `class(action)` | enum | `{mutating, readonly}` | Tra bảng tĩnh, không đổi runtime |
| Trạng thái Turn Manager | `tm_state` | enum | `{awaiting_action, resolving, undoing}` | Nguồn sự thật duy nhất (Core Rule #4), đọc trực tiếp từ Turn Manager |
| Kết quả | `write_action_allowed` | bool | `{0,1}` | `1` = UI cho phép gửi hành động này ngay bây giờ |

**Output Range:** Boolean thuần, hàm tổng (total function) — mọi cặp `(action, tm_state)` hợp lệ luôn có đúng 1 kết quả. 15 action × 3 trạng thái = **45 tổ hợp** = ma trận test case đầy đủ cho QA (số đã sửa theo GAP-1, qa-lead 2026-08-04).

**Example:** `write_action_allowed(tap_undo, resolving) = 0`; `write_action_allowed(open_card, resolving) = 1` (mở Card lúc AI đang viết vẫn được); `write_action_allowed(tap_back_to_slots, awaiting_action) = 1`.

**Edge cases:**
- Formula này **không** kiêm việc ẩn/hiện nút Undo — đó là `undo_availability_window` (registry, Turn Manager). Nút Undo phải thỏa **CẢ HAI**: `undo_available=true` (output của formula `undo_availability_window` — mới render nút) AND `write_action_allowed(tap_undo, tm_state)=1` (mới bấm được) — khi `is_death_turn=true`, vế đầu đã false nên không bao giờ có trạng thái "nút hiện nhưng bấm không phản hồi".
- Submit lần 2 trong lúc Resolving: `write_action_allowed(submit_action, resolving)=0` — đúng Core Rule #4 "từ chối ở tầng UI". Khóa đệ quy cây node khu nhập chỉ là **cách hiện thực hóa**; formula là nguồn sự thật. QA test cả hai (formula đúng + UI thật sự chặn) như 2 AC tách biệt.

**Rationale:** Hình thức hóa Core Rule #4 thành 1 predicate thuần túy, unit-test được không cần dựng scene Godot. Không phải tuning knob — invariant logic.

### D.2 — `screen_transition_valid(from, to, ctx)`

Chỉ xét **tầng màn hình** (5 node: `S1, S2, S4, S4-RO, S5`) — `S2-R/S2-U/S2-D` là sub-state Turn Manager bên trong `S2` (D.1 xử lý). Overlay tier không vào đồ thị (luật 1 dòng, xem Edge cases).

```
screen_transition_valid(from, to, ctx) = 1  iff  ∃ (from, to, guard) ∈ EDGES  such that  guard(ctx) = true
else 0
```

**EDGES** (rút thẳng từ bảng States and Transitions):

| from | to | guard(ctx) | Nguồn |
|---|---|---|---|
| S1 | S2 | `true` | "Tiếp tục/Bắt đầu mới" |
| S1 | S4-RO | `true` | "Xem lại" |
| S2 | S4 | `true` | 「Lục」— luôn được kể cả Resolving (đọc-only, D.1) |
| S4 | S2 | `true` | lật về |
| S2 | S1 | `tm_state = awaiting_action` | menu, gated bởi D.1 (`tap_back_to_slots`) |
| S2 | S5 | `continuation_choice_eligible = true` | takeover tự động (Core Rule #6), KHÔNG do người chơi tap |
| S5 | S2 | `new_slot_created = true` | "Chơi lại" thành công |
| S5 | S1 | `true` | menu |
| S5 | S4-RO | `true` | 「Lục」 từ S5 |
| S4-RO | S1 | `origin_screen = S1` | thoát về nơi vào |
| S4-RO | S5 | `origin_screen = S5` | thoát về nơi vào |

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Màn hình nguồn | `from` | enum | `{S1,S2,S4,S4-RO,S5}` | Màn hình hiện tại |
| Màn hình đích | `to` | enum | `{S1,S2,S4,S4-RO,S5}` | Màn hình muốn chuyển tới |
| Trạng thái Turn Manager | `ctx.tm_state` | enum | `{awaiting_action, resolving, undoing}` | Chỉ có ý nghĩa khi `from=S2` |
| Cờ takeover 3 lối | `ctx.continuation_choice_eligible` | bool | `{0,1}` | registry, chỉ có ý nghĩa khi `from=S2, to=S5` |
| Nơi vào Story Log read-only | `ctx.origin_screen` | enum | `{S1,S5}` | Chỉ có ý nghĩa khi `from=S4-RO` |
| Cờ tạo slot mới thành công | `ctx.new_slot_created` | bool | `{0,1}` | Chỉ có ý nghĩa khi `from=S5, to=S2` |
| Kết quả | `screen_transition_valid` | bool | `{0,1}` | `1` = điều hướng hợp lệ |

**Output Range:** Boolean, **hàm đóng (total)** — mọi cặp `(from,to)` không nằm trong `EDGES` trả `0` mặc định, không ném lỗi. `0` nghĩa là "không render điều khiển điều hướng này", không phải trạng thái lỗi.

**Example 1:** `screen_transition_valid(S2, S1, {tm_state: resolving}) = 0` → nút "Về danh sách sổ" mờ mực lúc AI đang viết (khớp D.1).

**Example 2 (bắt lỗi bằng cấu trúc):** `screen_transition_valid(S4-RO, S1, {origin_screen: S5}) = 0` nhưng `screen_transition_valid(S4-RO, S5, {origin_screen: S5}) = 1` — mở 「Lục」 từ Màn hình 3 lối rồi thoát → **phải** quay lại S5, không rơi về Save Slot Screen.

**Edge cases:**
- Cạnh `(S2, S5)` là hệ thống tự kích hoạt — formula vẫn dùng được làm assertion: nếu code cố route sang S5 mà `continuation_choice_eligible=false` → trả `0` → integrity check trong state machine.
- `(S1, S2)` luôn `true` ở tầng màn hình — slot có tồn tại/hợp lệ để mở hay không là trách nhiệm Persistence, **ngoài phạm vi** formula này.
- Tầng overlay: `O-Card` mở được từ mọi `from ∈ {S2,S4,S4-RO,S5}` khi `card_exists(char_id)=true`; `O-Set` mở được từ `{S1,S2}` — overlay là tầng độc lập (Core Rule #1), không gộp vào đồ thị màn hình.

**Rationale:** Biến bảng States and Transitions thành predicate máy kiểm được — điều hướng bất hợp pháp **bất khả thi theo cấu trúc** thay vì phụ thuộc rải đúng `if` trong code. Không phải tuning knob — invariant kiến trúc.

### D.3 — Cửa sổ phân trang Story Log

Đóng gap tường minh của `world-memory-context-management.md` ("page size chưa được định nghĩa ở đâu"). Kèm **luật eviction** — không có eviction thì cuộn ngược từ lượt 900 về lượt 1 vẫn chất đầy bộ nhớ UI, phá chứng minh O(1).

```
total_pages(slot)        = ceil(total_turns(slot) / PAGE_SIZE)
default_page_index(slot) = total_pages(slot) − 1                      // trang chứa lượt gần nhất
ui_memory_bound          = MAX_LOADED_PAGES × PAGE_SIZE                // hằng số, ĐỘC LẬP total_turns
should_prefetch(scroll_position, direction) =
    1  if distance_to_window_edge(scroll_position, direction) ≤ PREFETCH_THRESHOLD
    0  otherwise
```

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Slot đang xem (live hoặc closed) | `slot` | id | hợp lệ | Nguồn `total_turns` |
| Tổng lượt confirmed-không-undone | `total_turns(slot)` | int | `[0, ∞)` | Nguồn World Memory (lượt undo không tính) |
| Số lượt/trang | `PAGE_SIZE` | int const | ≥1 | Tuning knob `log_page_size`, mặc định **20** |
| Số trang tối đa resident | `MAX_LOADED_PAGES` | int const | ≥1 | Tuning knob `log_max_loaded_pages`, mặc định **3** |
| Ngưỡng tải trước | `PREFETCH_THRESHOLD` | int const | ≥0 | Tuning knob `log_prefetch_threshold`, mặc định **5** (lượt) |
| Tổng số trang | `total_pages(slot)` | int | `[0, ∞)` | |
| Trang mặc định khi mở | `default_page_index(slot)` | int | `[0, total_pages−1]` | |
| Trần bộ nhớ UI | `ui_memory_bound` | int const | = `MAX_LOADED_PAGES × PAGE_SIZE` | **Chứng minh O(1)** — không phụ thuộc `total_turns` |
| Cờ tải thêm | `should_prefetch` | bool | `{0,1}` | |

**Output Range:** `ui_memory_bound` là **hằng số cố định** (mặc định 60 lượt resident) bất kể `total_turns` lớn tới đâu — mảnh ghép cuối cho "UI memory O(1) độc lập world_time", cùng cấu trúc chứng minh World Memory đã dùng cho AI context.

**Example:** Slot `total_turns=842`, `PAGE_SIZE=20` → `total_pages=43`, `default_page_index=42` (lượt 821–842). `ui_memory_bound = 3×20 = 60` — dù slot 842 hay 8.420 lượt, số vẫn là 60. Cuộn lên tới lượt 825 (cách biên trên cửa sổ đã tải 4 lượt `< 5`) → `should_prefetch=1` → tải trang 41 (lượt 801–820), evict trang xa nhất.

**Edge cases:**
- `total_turns=0` (vừa "Bắt đầu mới") → `total_pages=ceil(0/20)=0` — Story Log hiện trạng thái rỗng, không cần nhánh chống chia-0. **`default_page_index` KHÔNG được gọi khi `total_pages=0`** — UI rẽ nhánh empty-state trước khi truy vấn trang (tránh giá trị −1 ngoài range khai báo; GAP-5, qa-lead).
- `total_turns < PAGE_SIZE` → `total_pages=1`; `ui_memory_bound` là **trần**, không phải giá trị luôn-đầy.
- Undo xảy ra khi lượt bị undo nằm trong trang đang tải (mở 「Lục」 lúc Resolving rồi Undo) → trang đó **invalidate và tải lại**, không patch tại chỗ; `total_turns` giảm 1, có thể kéo `total_pages` giảm.
- Chế độ S4-RO (slot đã khép): `total_turns` là giá trị tĩnh đóng băng — công thức không đổi, không bao giờ cần invalidate do ghi mới.

**Rationale:** Đóng gap World Memory + chứng minh trực tiếp yêu cầu hiệu năng mobile (memory-constrained, 60 FPS). **Interface yêu cầu World Memory expose**: API phân trang theo `(anchor_turn_id, count, direction)`, không trả nguyên Nhật ký đầy đủ (ghi ở Dependencies).

### D.4 — Kích thước vùng chạm tối thiểu (tap-name & chip)

Hai nhóm vì bản chất vật lý khác nhau: **(a)** tap-target nhúng trong văn xuôi — bị giới hạn bởi văn bản xung quanh; **(b)** phần tử độc lập — phải đạt chuẩn không điều kiện.

```
// (a) Tap-target nhúng trong prose — best-effort, có trần bởi mật độ chữ xung quanh
pad_v(fragment) = min( max(0, TOUCH_TARGET_MIN − h(fragment)) / 2,  line_gap(fragment) / 2 )
pad_h(fragment) = min( max(0, TOUCH_TARGET_MIN − w(fragment)) / 2,  max(0, gap_to_neighbor(fragment) − MIN_ADJACENT_GAP_PX) / 2 )
hit_height(fragment) = h(fragment) + 2 × pad_v(fragment)
hit_width(fragment)  = w(fragment) + 2 × pad_h(fragment)

// (b) Phần tử độc lập (chip/card/bút tích/nút) — bắt buộc tuyệt đối
hit_height ≥ TOUCH_TARGET_MIN  AND  hit_width ≥ TOUCH_TARGET_MIN
```

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Ngưỡng chạm tối thiểu | `TOUCH_TARGET_MIN` | int px const | = **44** | Chuẩn CSS-equivalent (WCAG 2.5.5/Apple HIG/Material — hằng khóa, sẽ đăng ký registry) |
| Khoảng đệm liền kề tối thiểu | `MIN_ADJACENT_GAP_PX` | int px const | = **4** | Vùng trắng KHÔNG được lấn giữa 2 tap-target độc lập |
| Đoạn tên trên 1 dòng | `fragment` | entity | — | 1 lần wrap = 1 fragment riêng |
| Kích thước glyph thật | `w`, `h` | float px | >0 | Từ font metrics tại `theme_scale` hiện hành (liên kết D.5) |
| Khoảng trắng dọc khả dụng | `line_gap` | float px | ≥0 | Giữa dòng chứa tên và dòng liền kề |
| Khoảng trắng ngang tới ký tự gần nhất | `gap_to_neighbor` | float px | ≥0 hoặc ∞ (cuối dòng) | |
| Đệm tính được | `pad_v`, `pad_h` | float px | ≥0 | |
| Vùng chạm cuối | `hit_height`, `hit_width` | float px | `[w hoặc h, TOUCH_TARGET_MIN]` | |

**Output Range:** Nhóm (a) **KHÔNG đảm bảo** đạt đúng 44px — best-effort có trần bởi văn bản xung quanh. Nhóm (b) đảm bảo tuyệt đối `≥44px`.

**Example:** Tên 1 ký tự "Vệ" tại M scale: `w=18, h=24`; `line_gap=12`, `gap_to_neighbor=10` hai bên. `pad_v = min((44−24)/2, 12/2) = 6` → `hit_height=36`. `pad_h = min((44−18)/2, (10−4)/2) = 3` → `hit_width=24`. Vùng chạm `24×36` — nhỏ hơn lý tưởng nhưng đã tối đa trong ràng buộc typography, **không bao giờ lấn** sang từ liền kề.

**Edge cases:**
- Hai tên sát nhau → `gap_to_neighbor` nhỏ → `pad_h≈0` → chấp nhận "chật" để 2 tap-target không bao giờ chồng lấn (đánh đổi có chủ đích: chính xác > thoải mái).
- Tên cuối dòng trước wrap → cạnh không giáp chữ có `gap_to_neighbor = ∞` → công thức áp dụng **theo từng cạnh riêng**, cạnh trống dùng đủ đệm mong muốn.
- Font scale L (×1.25) làm glyph lớn hơn → đệm mong muốn tự giảm — công thức tự điều chỉnh, không cần nhánh theo font scale.

**Rationale:** Mobile Web là platform chính (touch, không hover) và tap-tên là điểm vào MVP xuyên 4 bề mặt (Core Rule #8) — phải chạm chính xác được. Không phải tuning knob — hằng khóa theo chuẩn accessibility, đổi cần re-review chuẩn ngoài.

### D.5 — Ánh xạ cỡ chữ S/M/L và ngưỡng layout 2 cột

```
theme_scale(setting) = FONT_SCALE_STEP[setting],  setting ∈ {S, M, L}
two_column_layout(viewport_width_px, setting) =
    1  if viewport_width_px ≥ 2 × BASE_COLUMN_WIDTH_PX × theme_scale(setting) + COLUMN_GUTTER_PX
    0  otherwise
```

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Nấc cỡ chữ | `setting` | enum | `{S,M,L}` | Người chơi chọn ở Settings (Core Rule #10) |
| Hệ số nhân | `FONT_SCALE_STEP` | float const | `{0.875, 1.0, 1.25}` | Tuning knob `font_scale_steps` — đúng 3 giá trị |
| Bề rộng cột cơ sở | `BASE_COLUMN_WIDTH_PX` | int const | ≥0 | Tuning knob `base_column_width_px`, mặc định **360** |
| Khoảng cách 2 cột | `COLUMN_GUTTER_PX` | int const | ≥0 | Tuning knob `column_gutter_px`, mặc định **24** |
| Bề rộng viewport | `viewport_width_px` | float px | `(0, ∞)` | Runtime, từ device |
| Kết quả | `two_column_layout` | bool | `{0,1}` | `1` = đủ chỗ 2 cột (VD Character Card desktop) |

**Output Range:** Boolean. `theme_scale` chỉ nhận đúng 3 giá trị rời rạc (không phải slider).

**Example:** Viewport `1280px`, M → ngưỡng `2×360×1.0+24=744` → `two_column=1`. Cùng viewport, L → ngưỡng `924` → vẫn `1`. Viewport `820px`, L → `820<924` → `0` — người chọn cỡ chữ L mất 2-cột **sớm hơn** người chọn S/M ở cùng thiết bị.

**Chứng minh bất biến** (mirror phong cách O(1) của World Memory): với Mobile Web (`viewport ≤ 480px`), ngay cả ở S (ngưỡng thấp nhất): `2×360×0.875+24 = 654 > 480` — **luôn đúng với mọi setting** → `two_column_layout` **luôn = 0 trên mobile**, suy ra từ công thức, không cần `if is_mobile` viết tay.

**Edge cases:**
- Đổi cỡ chữ giữa lúc màn hình 2-cột đang mở: đây là **tham số hiển thị, không phải world-state** → reflow cập nhật **ngay lập tức** (Core Rule #10 "áp dụng toàn cục") — NGƯỢC với luật "không re-render Card giữa chừng khi `concealment` đổi" của hệ #14 (world-state). Hai luật trông giống nhau nhưng áp dụng ngược nhau — ghi rõ để tránh nhầm.
- Cửa sổ desktop kéo hẹp xuống 500px: xử lý y hệt mobile qua cùng công thức — không có nhánh "desktop vs mobile" riêng.

**Rationale:** Vận hành hóa Core Rule #10 + yêu cầu responsive (technical-preferences.md) thành predicate kiểm được, thay vì media-query rải rác không giải thích được ngưỡng.

### D.6 — Họ thời lượng chuyển cảnh

```
rank(banner)=1 < rank(overlay_settings)=2 < rank(overlay_card)=3 < rank(screen)=4
transition_duration(tier) = DURATION_MS[tier]
INVARIANT: DURATION_MS[banner] ≤ DURATION_MS[overlay_settings] ≤ DURATION_MS[overlay_card] ≤ DURATION_MS[screen]
```

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Tầng chuyển cảnh | `tier` | enum | `{banner, overlay_settings, overlay_card, screen}` | 4 loại chuyển động UI |
| Hạng trọng lượng thị giác | `rank(tier)` | int | `1–4` | Cố định, banner nhẹ nhất → screen nặng nhất |
| Thời lượng | `DURATION_MS[tier]` | int ms | `[80, 400]` | Tuning knob; `overlay_card` = `card_transition_ms` (hệ #14, không tạo bản sao) |
| Kết quả | `transition_duration` | int ms | tra bảng | Thời lượng animation |

**Output Range:** Giá trị rời rạc theo `tier`; ràng buộc là **bất biến thứ tự** (monotonic theo `rank`).

**Example:** `DURATION_MS = {banner: 120, overlay_settings: 150, overlay_card: 200, screen: 260}` — mở Story Log (screen) lật trang 260ms; mở Card 200ms (khóa theo #14); banner quota fade 120ms — nhanh nhất, không giành chú ý với page-flip bên dưới.

**Edge case:** Nếu tune sau này đẩy `overlay_settings` cao hơn `overlay_card` → phá bất biến → design smell (Settings có chủ đích "tức thời" hơn "mực loang" của Card — thứ tự có chủ đích).

**Rationale:** Mở rộng tiền lệ `card_transition_ms` (#14) thành họ nhất quán. Vì bất biến phụ thuộc giá trị chính xác của `card_transition_ms`, hằng số đó sẽ được **đăng ký registry** (`source: #14`, `referenced_by: #14, #15`) để thay đổi bên #14 có dấu vết.

## Edge Cases

- **Nếu lượt resolve thành cái chết trong lúc người chơi đang đọc Story Log (S4, vào lúc Resolving)**: KHÔNG giật người chơi về giữa chừng — takeover S5 hoãn đến khi người chơi lật về; hành động "lật về" lúc này route đến **S5 thay vì S2** (chuỗi hợp lệ theo D.2: S4→S2→S5 tự động, người chơi chỉ thấy 1 lần lật). Lượt chết đã hiện trong Log họ đang đọc — đúng, vì lượt đã confirmed.
- **Nếu một chuyển màn hình xảy ra khi overlay đang mở** (VD: takeover S5 kích hoạt khi Thẻ đang mở): mọi chuyển tầng-màn-hình **tự đóng overlay đang mở** trước khi lật. Overlay thuộc về màn hình bên dưới, không sống sót qua lật trang.
- **Nếu người chơi mở overlay thứ hai khi overlay thứ nhất đang mở** (VD: đang xem Thẻ, bấm 「Mục」→Settings): overlay mới **tự đóng overlay cũ** (không xếp chồng — Core Rule #1: tối đa 1 overlay). Không thông báo, hành vi như "lật sang tờ ghi chú khác".
- **Nếu người chơi tap 2 lần liên tiếp cực nhanh vào thẻ gợi ý** (double-fire trên touch): tap thứ nhất chuyển `tm_state=resolving` **đồng bộ ngay trong frame đó**; tap thứ hai rơi vào `write_action_allowed(submit_action, resolving)=0` → bị nuốt. Không cần debounce timer riêng — D.1 là đủ nếu chuyển trạng thái đồng bộ.
- **Nếu tên nhân vật xuất hiện trong văn tường thuật nhưng `card_exists=false`** (nhân vật được AI nhắc đến nhưng chưa từng xuất hiện trong lượt confirm): tên đó render như chữ thường — **không phải tap target, không gạch chân, không styling link**. Không có trạng thái "link chết".
- **Nếu Undo xóa đúng lượt đầu tiên làm một nhân vật tồn tại** (`card_exists` chuyển true→false): văn tường thuật của lượt đó biến mất theo Undo (Turn Manager), tap-target biến mất cùng văn bản — không cần xử lý riêng. Nếu Thẻ của nhân vật đó **đang mở** khi Undo hoàn tất: Thẻ tự đóng (không còn nguồn tồn tại), người chơi về S2 bình thường.
- **Nếu AI timeout (30s) trong lúc người chơi không ở S2** (đang đọc S4): xử lý lỗi theo Core Rule #9 diễn ra ở S2 (thông báo trong khung tường thuật); người chơi lật về thấy thông báo + khu nhập đã mở khóa. Không banner, không kéo người chơi về.
- **Nếu người chơi bấm nút back của trình duyệt** (HTML5 export): **ngoài phạm vi kiểm soát MVP** — browser back rời khỏi trang game; auto-save 2-checkpoint của Persistence đảm bảo không mất gì ngoài lượt đang Resolving dở (lượt chưa khóa → không tồn tại, đúng ngữ nghĩa). KHÔNG bind lịch sử điều hướng in-app vào browser history ở MVP — ghi thành Open Question cho ADR web export.
- **Nếu xoay màn hình / resize viewport khi overlay 2-cột đang mở**: D.5 tính lại ngay → Thẻ reflow 1↔2 cột live, vị trí cuộn neo theo block đang đọc (block đầu tiên visible giữ nguyên).
- **Nếu bấm "Thử lại" (Reset Failed) liên tục**: nút disabled (mờ mực) khi lần reset đang chạy — khóa theo cờ `reset_in_progress` do Character Continuation (#13) sở hữu, KHÔNG qua D.1/`tm_state` vì Turn Manager không hoạt động tại S5 (GAP-4, qa-lead).
- **Nếu banner quota xuất hiện khi đang ở Màn hình 3 lối (S5)**: tầng banner render trên **mọi** màn hình kể cả S5 — cảnh báo dung lượng vẫn hợp lệ lúc đang chọn lối tiếp tục (slot mới sắp được tạo cần chỗ).
- **Nếu mở Story Log khi `total_turns=0`** (vừa Bắt đầu mới, chưa confirm lượt nào): `total_pages=0` (D.3) → trạng thái rỗng: trang giấy trắng + một dòng "Chưa có trang nào được viết" — không lỗi, không placeholder khung xám.
- **Nếu Esc được bấm trên desktop**: tầng cao nhất đang mở tiêu thụ sự kiện — overlay mở → đóng overlay; không overlay → **không làm gì** (không có pause menu — game turn-based không cần pause). Esc không bao giờ thoát màn hình tầng-screen.

## Dependencies

### Phụ thuộc chính (theo systems-index)

| Hệ | Chiều | Interface cụ thể | Cứng/Mềm |
|---|---|---|---|
| **Character Card & Identity (#14)** | 2 chiều | #15 cung cấp: điểm vào tap-tên (query `card_exists`) + bút tích 「Thẻ」 + tầng overlay + `two_column_layout` (D.5). #14 cung cấp: toàn bộ nội dung thẻ + `card_transition_ms` | **Cứng** — đóng dependency "Hard (provisional)" mà #14 đã khai về hệ này |
| **Situation/Encounter Generation (#11)** | đọc | Menu chip intent (nhóm theo NPC) + header cảnh (location + triện) + nudge heuristic — #15 chỉ render, không sở hữu nội dung | **Cứng** — đóng row downstream "Core UI (#15)" bên đó |
| **Combat System (#7)** | ràng buộc | Combat không bao giờ tự kích hoạt chuyển màn hình (ràng buộc HỆ THỐNG — điều hướng người chơi trong trận vẫn theo D.1/D.2 chuẩn); danh sách hành động trận đi qua khung 4-gợi-ý chuẩn | **Cứng** (ràng buộc kiến trúc, không phải data flow) |

### Phụ thuộc bổ sung (chưa có trong bảng index — cùng pattern gap các hệ trước)

| Hệ | Chiều | Interface cụ thể | Cứng/Mềm |
|---|---|---|---|
| **Turn Manager (#1)** | 2 chiều | Đọc `tm_state` + `undo_available` (input cho D.1/D.2); gửi action submit + Undo qua đường chuẩn | **Cứng** |
| **Contract Enforcement (#2)** | ràng buộc | #15 là mặt thực thi hiển thị của Core Rule #4 bên đó (số liệu chỉ trong khung con dấu) | **Cứng** |
| **World Memory (#5)** | đọc | **Interface yêu cầu**: API phân trang `(anchor_turn_id, count, direction)` — KHÔNG trả nguyên Nhật ký (điều kiện để D.3 giữ trần bộ nhớ O(1)); `total_turns(slot)` | **Cứng** |
| **Persistence (#6)** | đọc + hiển thị | Danh sách slot + metadata (tên, cảnh giới, world_time, trạng thái, timestamp); banner quota/lỗi ghi | **Cứng** (chiều #15→#6; bên đó đã khai chiều ngược là Mềm — nhất quán: #6 chạy được không cần UI, #15 không chạy được thiếu #6) |
| **Character Continuation (#13)** | đọc | Cờ `continuation_choice_eligible` (kích takeover S5) + trạng thái Reset Failed/retry | **Cứng** |
| **Death & Consequence (#12)** | pass-through | Gợi ý Pending Fate đi qua khung 4-gợi-ý chuẩn | Mềm |
| **AI/LLM Layer (#4)** | gián tiếp | Chỉ báo "đang viết" + `ai_call_timeout_seconds=30` | Mềm |
| EXP (#8) / NPC Affinity (#9) / Setting & Canon (#10) | gián tiếp | Mọi hiển thị đi qua Thẻ hoặc khung tường thuật — không interface trực tiếp | — |

### Sở hữu mới phát sinh

- **Cấu hình cấp thiết bị (`app_config`)**: cỡ chữ S/M/L lưu **ngoài** slot bundle (không thuộc Persistence — bên đó chỉ sở hữu dữ liệu playthrough). #15 sở hữu key config nhỏ này; cơ chế lưu web (localStorage) → chung ADR persistence HTML5 đã dự kiến. Xem Open Questions.

### Kiểm tra 2 chiều — gap phát hiện

Đã liệt kê #15 ở chiều ngược: **#6 Persistence** (Mềm), **#11 Situation Gen** (row downstream), **#14 Character Card** (Hard provisional — nay đóng). **Chưa liệt kê** (gap một chiều, cùng pattern 13 gap trước, footnote vào systems-index — không sửa bảng của các GDD đã Approved/Designed): **#1 Turn Manager**, **#2 Contract Enforcement**, **#5 World Memory** (chỉ có UX Flag ngầm), **#7 Combat** (chỉ có văn UI Requirements), **#13 Character Continuation** (khai qua #14, không trực tiếp).

## Tuning Knobs

| Knob | Mặc định | Dải an toàn | Quá cao thì sao | Quá thấp thì sao | Tương tác |
|---|---|---|---|---|---|
| `log_page_size` (D.3) | 20 lượt | 10–50 | Mỗi lần tải trang khựng thấy rõ trên mobile (nhiều node RichText/lần) | Prefetch xoay vòng liên tục, nhiều lần gọi World Memory | Trần bộ nhớ UI = tích với `log_max_loaded_pages` — chỉnh 1 trong 2 phải nhìn tích |
| `log_max_loaded_pages` (D.3) | 3 trang | 2–5 | Trần bộ nhớ phình (5×50=250 lượt resident ở biên trên cả hai knob) | <2 thì cửa sổ không giữ nổi trang-hiện-tại + trang-kề → thrash tải/evict | Như trên; 2 là sàn cứng logic |
| `log_prefetch_threshold` (D.3) | 5 lượt | 0–`log_page_size`/2 | Prefetch tham lam — tải trang mới khi vừa cuộn nhẹ | 0 = khựng thấy được đúng lúc chạm biên trang | Vô nghĩa nếu ≥ `log_page_size` (luôn prefetch) |
| `font_scale_steps` (D.5) | {0.875, 1.0, 1.25} | mỗi nấc ±0.125; **đúng 3 nấc** (Core Rule #10) | Nấc L quá lớn → hàng chip wrap gãy, tên dài tràn khung con dấu | Nấc S quá nhỏ → vi phạm mục đích accessibility của chính knob này | Đầu vào của D.4 (glyph size) và D.5 (ngưỡng 2 cột) |
| `base_column_width_px` (D.5) | 360 | 320–420 | 2-cột hiếm khi kích hoạt kể cả desktop rộng | 2 cột bị bóp hẹp, dòng chữ gãy vụn | Cặp với `column_gutter_px`; hệ #14 cần đối chiếu khi khóa layout thẻ thật (note chéo) |
| `column_gutter_px` (D.5) | 24 | 12–48 | Lãng phí bề ngang, đẩy ngưỡng 2-cột lên cao | 2 cột dính nhau, mất ranh giới thị giác | Như trên |
| `transition_banner_ms` (D.6) | 120 | 80–200 | Banner giành chú ý với nội dung chính | Xuất hiện đột ngột như glitch | **Bất biến D.6**: ≤ settings ≤ card ≤ screen — chỉnh knob nào cũng phải giữ chuỗi |
| `transition_settings_ms` (D.6) | 150 | 80–300 | Settings "sang trọng" quá mức tiện ích | — | Như trên |
| `transition_screen_ms` (D.6) | 260 | 150–400 | Lật trang chậm gây ức chế khi qua lại Log↔Chơi nhiều lần | Mất cảm giác "lật trang", thành cắt cảnh khô | Như trên; luôn ≥ `card_transition_ms` (#14) |

**Không phải knob** (hằng khóa, đổi = re-review chuẩn ngoài): `TOUCH_TARGET_MIN=44`, `MIN_ADJACENT_GAP_PX=4` (D.4).

**Knob thuộc hệ khác, không nhân bản** (trỏ nguồn): `card_transition_ms=200` (#14 — tầng `overlay_card` của D.6), `quota_warn_threshold` (#6 — ngưỡng kích banner), `suggested_action_count=4` (hằng registry #1, không phải knob).

## Visual/Audio Requirements

*(Đặc tả bởi `art-director`, duyệt 2026-08-04 — toàn bộ 10 giả định (a)–(j) được chấp nhận. Audio: tối thiểu theo game-concept, không có yêu cầu riêng ở MVP.)*

### 1. Ba bút tích lề 「Thẻ」「Lục」「Mục」

- **Thuần typography** — chính 3 chữ LÀ icon, không asset icon riêng (tái dùng nguyên tắc badge 「che giấu」 hệ #14). Font họ "văn Hồ sơ" (bút lông, cùng family chữ tường thuật) — KHÔNG dùng family "số trong seal". Trọng lượng NHẸ HƠN thân văn 1 bậc — bút tích lùi vào hậu cảnh nhưng đọc được ngay.
- **Không khung bao** ở trạng thái mặc định — không viền tròn/vuông/pill (khác hẳn ngôn ngữ "nav bar icon"). Vùng chạm thật (D.4 nhóm (b), ≥44px) vô hình, mở rộng ngoài glyph.
- **Bố trí**: xếp dọc lề phải header cảnh, mỗi bút tích 1 dòng riêng, tôn trọng `MIN_ADJACENT_GAP_PX`.
- **Trạng thái "không có"** phân biệt 2 loại: khóa tạm bởi Turn Manager → chỉ áp cho hành động MUTATING bên trong overlay (mờ mực alpha); không áp dụng về cấu trúc cho màn hình hiện tại (VD 「Mục」 ở S4-RO) → **ẩn hoàn toàn**, không ghost (cùng logic nút Undo biến mất). Bút tích tự nó không bao giờ mờ mực — cả 3 đều readonly, luôn tự do.
- Ở S5, 「Mục」 chỉ còn "Về danh sách sổ" — bút tích không đổi hình, chỉ nội dung menu đổi.

→ **Art Bible**: "Marginalia, not chrome" — điểm vào điều hướng toàn cục đọc như ghi chú tay, không bao giờ dùng ngôn ngữ button/icon-badge kiểu app.

### 2. Họ chuyển cảnh lật trang (D.6)

- **Tầng `screen` (260ms)**: màn hình ĐI skew nhẹ + scale_x co (1.0→~0.85) pivot tại cạnh "gáy" trong 60% đầu, fade 40% cuối; màn hình ĐẾN nằm sẵn layer dưới, KHÔNG tự animate — chỉ 1 Control cần animate, rẻ.
- **Hướng lật mã hóa chiều điều hướng**: tiến (vào sâu) lật từ phải; lùi/đóng lật từ trái — wayfinding tự nhiên không cần breadcrumb/nút back.
- **Không fade-to-black** — nền giấy kem là base xuyên suốt; degradation xấu nhất là cắt cứng giấy-sang-giấy.
- Highlight mép giấy đang lật (gradient chéo alpha thấp) = polish tùy chọn, giao `technical-artist`, không blocking.
- **Mỗi tầng có 1 chữ ký chuyển động riêng** (không tái dùng chéo): `screen` = lật trang; `overlay_card` = mực loang (#14 sở hữu, không định nghĩa lại); `overlay_settings` = trượt dọc từ mép trên + fade, KHÔNG mực loang (Settings là hành chính, không "sống"); `banner` = fade + rơi nhẹ 1 nấc.

→ **Art Bible**: "Mỗi tầng UI có đúng 1 chữ ký chuyển động — trọng lượng thị giác mã hóa bằng CẢ thời lượng LẪN loại chuyển động."

### 3. Chỉ báo "Thế giới đang viết" (Resolving, Core Rule #9)

- Vị trí: **inline trong khung tường thuật**, tại chỗ đoạn văn kế tiếp sẽ xuất hiện — không overlay/toast riêng.
- Hình thức: 1 nét mực ngang ngắn (~60–80px ở scale M) quét trái→phải lặp, đuôi mờ dần — **vòng lặp bất định**, KHÔNG map % thời gian thật. Tuyệt đối không spinner — chỉ chuyển động NGANG.
- Kèm dòng chữ tĩnh "Thế giới đang viết…" font Hồ sơ (không seal — không phải sự thật cơ học), -1 bậc alpha.
- Timeout: nét mực bị **thay thế** mượt bởi thông báo lỗi đen-xám — không đỏ son (lỗi kỹ thuật ≠ hệ quả cơ học).
- Chi phí: 1 Control clip-rect width tween hoặc Line2D — không shader.

→ **Art Bible**: "Trạng thái chờ không bao giờ dùng ẩn dụ máy móc (spinner/progress/loading) — luôn dùng ẩn dụ mực/bút."

### 4. Save Slot Screen

- **Bố cục**: list dọc, mỗi slot = 1 hình "gáy sách" — thanh gáy đậm mực trái (~8–12px) + "bìa" giấy kem chứa metadata (tên, cảnh giới, world_time, lần lưu cuối). Cố tình HÌNH HỌC/thẳng nét — đối lập khung mực loang hữu cơ của Card, tránh nhầm lẫn bề mặt.
- **Slot đang chơi**: mép phải có cue trang hé mở hoặc góc gấp nhẹ (dog-ear); mực đậm bình thường.
- **Slot đã khép**: bìa phẳng đóng kín; góc trên-phải mang con dấu Persistence đã đặc tả (chỉ định vị trí, không thiết kế lại); **toàn bộ gáy+bìa+chữ khử bão hòa xám-đen** (không alpha, KHÔNG đỏ son — xem mục 10).
- **"Bắt đầu mới"**: đầu danh sách, gáy nét đứt rất nhạt, không cue mở/dấu khép — "cuốn sổ trắng chưa viết".
- **Xóa slot**: xác nhận giữ style con dấu đen-xám, KHÔNG nút đỏ/danger — thao tác menu ≠ hệ quả cơ học.
- **Nhiều slot**: virtualize danh sách (cùng tinh thần trần bộ nhớ D.3).

→ **Art Bible**: "Mỗi 'kho chứa' trong ẩn dụ nhật ký có 1 hình khối riêng — organic-blot = dữ liệu sống; geometric-spine = vật thể chứa; seal góc cạnh = sự thật đã khóa."

### 5. Banner tier

- **1 style duy nhất mọi nguồn**: dải giấy mỏng ngang, nền giấy kem đậm hơn nền chính 1 bậc, viền mực mảnh CHỈ cạnh dưới, chữ đen-xám.
- **Luật chung cả tầng** (nâng tiền lệ Reset Failed #13): KHÔNG BAO GIỜ đỏ son/xanh ngọc cho banner, mọi nguồn — lỗi kỹ thuật không phải hệ quả cơ học vĩnh viễn.
- KHÔNG icon cảnh báo màu — dùng TỪ tiếng Việt rõ nghĩa (nguyên tắc "chữ thay icon" của #14).
- **Tối đa 1 banner** cùng lúc (mirror Core Rule #1) — banner mới xếp hàng chờ.
- Dismiss: tap X (readonly) hoặc tự biến mất khi điều kiện gốc hết — **không auto-timeout** (cảnh báo cần hành động).
- Render trên MỌI màn hình kể cả S5.

→ **Art Bible**: "Đỏ son = hệ quả thế giới đã khóa. Không bao giờ dùng cho lỗi hạ tầng/kỹ thuật."

### 6. Settings overlay

- Nền giấy kem + typography chuẩn — KHÔNG bảng điều khiển xám/xanh kiểu app.
- **Ngoại lệ hình học phẳng duy nhất toàn game**: 1 tấm giấy chữ nhật phẳng, list dọc nhãn+control — không khung mực loang (dành riêng Card), không drop-shadow, không bo góc app hiện đại.
- **Cỡ chữ S/M/L**: 3 tap target ngang hàng, mỗi ô hiển thị CHÍNH glyph mẫu ở kích thước thật sẽ áp dụng (xem trước bằng mắt); ô đang chọn = 1 chấm mực đặc nhỏ bên dưới (KHÔNG gạch chân — đã mang nghĩa "hậu quả thoáng qua" ở hệ #12).
- **Cấu hình AI**: hàng nhãn+input đơn dòng cùng style — field cụ thể do ADR backend quyết.

→ **Art Bible**: "Đúng 1 ngoại lệ hình học phẳng được phép: Settings — phi-diegetic có chủ đích, không phải sơ suất."

### 7. Story Log screen chrome (nội dung do World Memory sở hữu)

- Chuyển cảnh vào/ra: page-flip tầng `screen`, tiến khi vào từ S2, lùi khi lật về.
- **"về đầu câu chuyện"**: bút tích nhỏ cùng family mục 1, ở thanh chrome mỏng đầu màn hình; ký hiệu mũi tên = 1 nét mực hất chéo tay vẽ, KHÔNG chevron UI chuẩn. Tap → `default_page_index → 0`, reload theo D.3.
- **S4 vs S4-RO**: S4-RO mang 1 con dấu tĩnh góc trên-trái (TÁI DÙNG con dấu "đã khép" mục 4); toàn chrome + văn bản S4-RO **khử bão hòa xuyên suốt** — "cuốn sách đã đóng đọc xám hơn", không chỉ 1 badge. S4 live giữ full-contrast.
- S4 mở trong Resolving: cuộn tới cuối thấy đúng chỉ báo "thế giới đang viết" (mục 3) — nhất quán với S2.
- **Exit ở S4-RO**: bút tích văn bản thích ứng theo `origin_screen` (D.2): "« về danh sách sổ" (từ S1) / "« về [tên nhân vật]" (từ S5).

→ **Art Bible**: "Sách đã đóng đọc xám hơn sách đang mở — bằng tông màu xuyên suốt bề mặt, không phải badge phụ."

### 8. Empty states

- **Story Log 0 lượt**: dòng "Chưa có trang nào được viết" (đã khóa ở Edge Cases), căn giữa, font Hồ sơ, -1 bậc alpha, KHÔNG icon/khung xám.
- **Save Slot 0 slot**: dòng "Chưa có sổ nào — hãy bắt đầu cuốn đầu tiên"; mục "Bắt đầu mới" VẪN hiển thị phía trên — empty state giải thích danh sách trống, không thay CTA.
- Công thức chung toàn game: **1 dòng chữ lặng lẽ, font prose, -1 bậc alpha, không khung, không icon, căn giữa.**

→ **Art Bible**: "Rỗng có chủ đích ≠ lỗi tải — luôn 1 dòng chữ mực nhạt, không bao giờ khung xám/spinner/icon cảnh báo."

### 9. Focus/hover/touch feedback (Godot 4.6 dual-focus)

| Kênh | Khi nào | Hình thức | Bắt buộc? |
|---|---|---|---|
| **Pressed** | Mọi input (touch + mouse) | Tăng 1 bậc độ đậm mực tức thời (không fill nền, không scale-bounce) | BẮT BUỘC — kênh duy nhất touch nhận |
| **Hover** | Chỉ mouse (desktop) | Y hệt pressed nhưng khi chưa nhấn | Bonus — không load-bearing |
| **Focus** | Tab/bàn phím | Viền mực mảnh 1–2px đen thuần (không glow/blur) bao đúng **vùng chạm thật D.4** | BẮT BUỘC — kênh duy nhất người dùng bàn phím nhận |
| **Disabled** | Resolving/Undoing, action mutating | Alpha giảm (mờ mực), không nhận kênh nào khác | Đã khóa Core Rule #4 |

- Không ripple Material, không scale-bounce — mọi thay đổi là hard cut hoặc fade ≤150ms (chung quy tắc chuyển động toàn UI với Combat System).

→ **Art Bible**: "3 kênh phản hồi input tách biệt: pressed (bắt buộc, mọi input), hover (bonus, mouse), focus (bắt buộc, bàn phím) — không kênh nào thay thế kênh kia."

### 10. Khẩu phần màu — #15 hoàn toàn MONO

Mọi bề mặt #15 **tự sở hữu** (bút tích, page-flip, chỉ báo đang-viết, chrome Save Slot, banner, Settings, chrome Story Log) đều MONO — giống hệ #13, không phát sinh cách dùng đỏ son/xanh ngọc mới. Hai màu accent chỉ xuất hiện khi #15 làm **sân khấu** cho nội dung hệ khác (Card mở từ 「Thẻ」 mang nguyên badge đỏ son của #14/#12; văn tường thuật trong khung #15 mang nét đỏ thoáng qua của #12) — #15 không restyle, không nhân bản.

**Mở rộng precedent log màu** (được duyệt): con dấu "đã khép" trên Save Slot/Story Log read-only dùng **khử bão hòa, KHÔNG đỏ son** — dù slot khép tương ứng `alive=false` và Card nhân vật đó hợp lệ mang triện đỏ. Không mâu thuẫn: Card = "soi 1 đời cụ thể" (màu khẩu phần hợp lệ, hiếm); Save Slot = "mục lục nhiều đời cùng lúc" — tô đỏ ở đây nhân bản tần suất màu, phá cơ chế hiếm-mới-có-nghĩa.

→ **Art Bible**: "Cùng 1 sự thật cơ học có thể có 2 biểu đạt thị giác tùy MẬT ĐỘ bề mặt — bề mặt 'soi 1 mục tiêu' dùng màu khẩu phần; bề mặt 'liệt kê nhiều mục tiêu' dùng khử bão hòa."

> 📌 **Asset Spec** — Visual/Audio requirements đã định nghĩa. Sau khi art bible được duyệt, chạy `/asset-spec system:core-ui-screen-navigation` để sinh mô tả per-asset, kích thước, và generation prompt từ section này.

## UI Requirements

### Màn chơi chính (S2) — phân vùng layout

| Vùng | Mobile portrait (1 cột) | Desktop/landscape |
|---|---|---|
| Header cảnh + 3 bút tích lề | Đầu trang, cuộn theo nội dung (không sticky — hệ #11 đã khóa) | Như mobile, bút tích lề phải |
| Khung tường thuật | Chiếm toàn bề ngang, cuộn dọc, tối đa ~70ch/dòng để dễ đọc | Cột giữa tối đa `readable_width` (~65–75ch), căn giữa, 2 lề giấy trống |
| Khu nhập hành động | Dưới cùng luồng cuộn (KHÔNG sticky footer — người chơi cuộn xuống để hành động, như viết tiếp trang giấy) | Như mobile, cùng cột với khung tường thuật |
| Nút Undo | Cạnh khu nhập, chỉ render khi `undo_available=true` | Như mobile |

- Thứ tự trong khu nhập (trên→xuống): 4 thẻ gợi ý → hàng chip intent (wrap theo nội dung, nhóm theo NPC) → ô tự do + nút gửi (+ dòng nudge heuristic khi có).
- Tap + click parity toàn bộ; không hover-only; mọi phần tử độc lập ≥ `TOUCH_TARGET_MIN=44px` (D.4).

### Save Slot Screen (S1)

- List dọc virtualized; mỗi hàng gáy-sách ≥ 44px cao (thực tế ~72–88px để chứa 2 dòng metadata); "Bắt đầu mới" ghim đầu danh sách.
- Hành động theo trạng thái slot đúng hệ #6: Tiếp tục/Xóa (đang chơi), Xem lại/Xóa (đã khép); "Xóa" cần xác nhận riêng (con dấu đen-xám, không danger-red).

### Story Log (S4/S4-RO)

- Thanh chrome mỏng đầu màn hình: bút tích "về đầu câu chuyện" + bút tích 「Thẻ」 (thẻ bản thân — GAP-3) + (S4-RO) con dấu đã-khép + nút thoát thích ứng `origin_screen`.
- Nội dung phân trang theo D.3; scroll container duy nhất; marker "Lượt N" thuộc World Memory.

### Settings (O-Set)

- Tấm giấy phẳng, 2 nhóm (Cỡ chữ / Cấu hình AI); đóng bằng X / tap ngoài / Esc như mọi overlay.

### Trách nhiệm responsive (toàn cục)

- Breakpoint duy nhất được phép: ngưỡng `two_column_layout` (D.5) — không media-query rải rác. Mobile luôn 1 cột (đã chứng minh ở D.5).
- Xoay màn hình/resize: reflow live, neo cuộn theo block đầu tiên đang thấy (Edge Cases).
- Safe-area insets (notch/home bar trên mobile web): padding tự động vùng header + khu nhập — không phần tử tương tác nào nằm dưới home indicator.

### Godot notes (→ ADR khi vào architecture)

- Tap-tên qua `RichTextLabel` meta tag (đã flag ADR từ hệ #14 — dùng chung).
- Khóa đệ quy cây node khu nhập (Godot 4.5+ recursive disable) cho D.1.
- Screen stack: cấu trúc scene/Autoload cho tầng màn hình + overlay → **ADR riêng khi `/create-architecture`** (không quyết trong GDD).
- Dual-focus 4.6: test cả mouse/touch focus lẫn keyboard focus cho mọi phần tử (bảng kênh feedback ở Visual/Audio mục 9).

> **📌 UX Flag — Core UI / Screen Navigation**: Hệ này sở hữu nhiều màn hình. Ở Phase 4 (Pre-Production), chạy `/ux-design` cho **từng màn hình** trước khi viết epic: `design/ux/main-play-screen.md` (màn chơi chính — gộp yêu cầu hệ #11 + #1), `design/ux/save-slot-screen.md` (đã được hệ #6 flag), `design/ux/story-log.md` (đã được hệ #5 flag), `design/ux/settings.md`. Story tham chiếu UI phải trích file `design/ux/*.md`, không trích GDD trực tiếp.

## Acceptance Criteria

*(Đề xuất bởi `qa-lead` 2026-08-04, duyệt cùng ngày sau khi khép GAP-1..5, GAP-8. Hệ Presentation/Navigation đọc phần lớn trạng thái từ nơi khác — mặc định **ADVISORY** (bằng chứng: walkthrough/screenshot tại `production/qa/evidence/core-ui-screen-navigation/`). NGOẠI LỆ BLOCKING: mọi AC gắn **[Unit]** (D.1–D.5 là hàm tất định) — bắt buộc file test tại `tests/unit/core-ui-screen-navigation/` (naming `core_ui_[feature]_test.gd`, hàm `test_[scenario]_[expected]`) trước khi story tương ứng Complete. **[Integration]** = ADVISORY, bắt buộc trước QA sign-off build. **[Manual]** = walkthrough/screenshot. **[Config]** = smoke-check.)*

**Ghi chú test setup**: Mọi phụ thuộc ngoài (Turn Manager `tm_state`/`undo_available`, World Memory `total_turns`/API phân trang, Character Continuation `continuation_choice_eligible`/`reset_in_progress`, Combat `in_combat`) phải **inject** qua mock/fixture — không gọi hệ thật, không AI, không mạng, không đồng hồ thật, không random không-seed (property test dùng seed cố định). Hằng số tham chiếu registry (`TOUCH_TARGET_MIN=44`, `card_transition_ms=200`, `suggested_action_count=4`, `undo_depth=1`, `ai_call_timeout_seconds=30`) — import từ nguồn, không định nghĩa lại.

### 1. Tầng hiển thị & bất biến toàn cục (Core Rule #1)

- **AC-01** [Unit] (max 1 overlay): GIVEN O-Card đang mở, WHEN người chơi mở O-Set (「Mục」→Settings), THEN O-Card đóng ngay trước khi O-Set mở; tại mọi thời điểm ≤1 overlay `open=true`.
- **AC-02** [Unit] (max 1 banner, hàng chờ): GIVEN banner A đang hiển thị, WHEN điều kiện banner B kích hoạt, THEN B không hiện đè lên A — B vào hàng chờ, hiện sau khi A dismiss; tại mọi thời điểm ≤1 banner visible.
- **AC-03** [Unit] (overlay miễn phí): GIVEN cả 3 trạng thái Turn Manager, WHEN mở/đóng O-Card hoặc O-Set, THEN không action nào gửi Turn Manager (spy=0), `world_time` không đổi.

### 2. Khóa input — `write_action_allowed` (D.1)

- **AC-04** [Unit] (ma trận đầy đủ 15×3=45): GIVEN toàn bộ 15 action × 3 `tm_state`, WHEN chạy `write_action_allowed` từng cặp, THEN khớp bảng phân loại: 8 action `mutating` → `0` khi `resolving`/`undoing`, `1` khi `awaiting_action`; 7 action `readonly` → luôn `1`. *(parametrized 45 case — regression anchor GAP-1)*
- **AC-05** [Integration] (UI thật sự chặn submit lần 2): GIVEN `tm_state=resolving`, WHEN cố submit lần 2 (thẻ gợi ý/chip/ô tự do), THEN request KHÔNG đến Turn Manager (spy=0) — verify cây node khu nhập bị khóa đệ quy thật, không chỉ formula.
- **AC-06** [Integration] (double-tap swallow): GIVEN tap 2 lần cực nhanh cùng 1 thẻ gợi ý, WHEN tap 1 chuyển `tm_state→resolving` đồng bộ trong frame, THEN tap 2 bị nuốt — Turn Manager nhận đúng 1 action (spy=1).
- **AC-07** [Unit + Manual] (Undo dual-condition — ẩn vs mờ là 2 cơ chế): GIVEN 4 tổ hợp `(undo_available, tm_state)`: (a) `false, awaiting`; (b) `true, awaiting`; (c) `true, resolving`; (d) `false, resolving`, WHEN dựng UI nút Undo, THEN (a)(d) **không render**; (b) render + bấm được; (c) render + mờ mực + không bấm được — không bao giờ có "nút hiện, bấm không phản hồi, không mờ". *(logic [Unit]; render mờ mực [Manual] screenshot)*

### 3. Đồ thị chuyển màn hình — `screen_transition_valid` (D.2)

- **AC-08** [Unit] (11 cạnh hợp lệ + cạnh cấm): GIVEN 11 cạnh EDGES với `ctx` thỏa guard, WHEN chạy formula, THEN tất cả trả `1`; GIVEN ≥5 cặp ngoài EDGES (S1→S5, S4→S1, S4-RO→S2...), THEN tất cả trả `0`, không ném lỗi.
- **AC-09** [Unit] (guard `tm_state` cạnh S2→S1): GIVEN `from=S2, to=S1, tm_state=resolving`, THEN `0`; đối chứng `awaiting_action` → `1`.
- **AC-10** [Unit] (S4-RO thoát đúng `origin_screen`): GIVEN `from=S4-RO, origin_screen=S5`, THEN `to=S1→0`, `to=S5→1` — Log read-only mở từ S5 PHẢI thoát về S5, không rơi về Save Slot.
- **AC-11** [Unit] (S2→S5 là integrity check): GIVEN `continuation_choice_eligible=false`, WHEN thử `screen_transition_valid(S2, S5, ctx)`, THEN `0` — assertion chặn code route sai.
- **AC-12** [Integration] (chuỗi S4→S2→S5 khi chết confirm lúc đọc Log): GIVEN người chơi ở S4 khi lượt resolve thành `is_death_turn=true` + `continuation_choice_eligible=true`, WHEN bấm "lật về", THEN engine chạy S4→S2 rồi NGAY S2→S5 trong cùng thao tác — người chơi thấy đúng 1 lần chuyển cảnh.
- **AC-13** [Integration] (chuyển màn hình tự đóng overlay): GIVEN O-Card mở trên S2, WHEN takeover S5 kích hoạt, THEN O-Card đóng TRƯỚC khi S5 hiện.

### 4. Story Log — pagination D.3

- **AC-14** [Unit] (regression ví dụ 842 lượt): GIVEN `total_turns=842, PAGE_SIZE=20`, THEN `total_pages=43`, `default_page_index=42`.
- **AC-15** [Unit] (O(1) property test): GIVEN `total_turns ∈ {0,1,19,20,500,8420,999999}` (seed cố định), `MAX_LOADED_PAGES=3, PAGE_SIZE=20`, THEN `ui_memory_bound` LUÔN `=60` — không nhánh code nào đọc `total_turns` để tính trần.
- **AC-16** [Unit] (biên prefetch): GIVEN `distance ∈ {4,5,6}`, `PREFETCH_THRESHOLD=5`, THEN `4→1, 5→1, 6→0` (boundary `≤`).
- **AC-17** [Unit] (empty — đóng GAP-5): GIVEN `total_turns=0`, WHEN mở Story Log, THEN `total_pages=0`, UI render empty-state, `default_page_index` KHÔNG được gọi (spy=0) — không có `-1`/crash.
- **AC-18** [Unit] (undo invalidate, không patch): GIVEN trang chứa lượt N đang resident, WHEN Undo lượt N, THEN trang invalidate + tải lại (spy `reload`=1, không `patch`), `total_turns` giảm 1, `total_pages` tính lại đúng.
- **AC-19** [Unit] (S4-RO đóng băng): GIVEN slot đã khép, WHEN mở Story Log nhiều lần, THEN `total_turns` không đổi, không invalidate/eviction nào phát sinh do ghi mới.

### 5. Vùng chạm — D.4

- **AC-20** [Unit] (nhóm (b) ≥44px tuyệt đối): GIVEN 5 loại phần tử độc lập (chip, card gợi ý, bút tích, Undo, Song Tu) với glyph gốc <44px, THEN `hit_height`/`hit_width` LUÔN `≥ TOUCH_TARGET_MIN` (đọc registry, không hardcode).
- **AC-21** [Unit] (regression ví dụ "Vệ"): GIVEN `w=18, h=24, line_gap=12, gap_to_neighbor=10`, THEN `pad_v=6, hit_height=36; pad_h=3, hit_width=24`.
- **AC-22** [Unit] (never-overlap property test): GIVEN `gap_to_neighbor` ngẫu nhiên `[0,20]` (seed cố định, 50 case) cho 2 tap-target liền kề, THEN tổng vùng chạm 2 bên KHÔNG BAO GIỜ lấn vào khoảng `MIN_ADJACENT_GAP_PX`, kể cả gap→0.

### 6. Cỡ chữ & 2 cột — D.5

- **AC-23** [Unit] (3 nấc chính xác): GIVEN `setting ∈ {S,M,L}`, THEN `theme_scale` trả đúng `{0.875, 1.0, 1.25}` — không nấc thứ 4.
- **AC-24** [Unit] (regression ngưỡng 2-cột): GIVEN `(1280,M)`, `(1280,L)`, `(820,L)`, THEN lần lượt `1, 1, 0`.
- **AC-25** [Unit] (bất biến 1-cột, scope ≤480px theo GAP-6): GIVEN `viewport=480` × cả 3 `setting`, THEN `two_column_layout` LUÔN `=0`. *(KHÔNG khẳng định cho viewport >480px — chờ dải viewport target chính thức, xem Open Questions)*
- **AC-26** [Integration] (reflow tức thời): GIVEN màn hình 2-cột đang mở, WHEN đổi `setting`, THEN reflow NGAY — đối lập có chủ đích với luật "không re-render giữa chừng" của Card (world-state).

### 7. Chuyển cảnh — D.6

- **AC-27** [Config] (bất biến thứ tự): GIVEN bộ `DURATION_MS` hiện hành, WHEN smoke-check đọc từ data file/registry, THEN `banner ≤ overlay_settings ≤ overlay_card ≤ screen`; `overlay_card` PHẢI khớp `card_transition_ms` registry (không bản sao). *(chạy lại mỗi lần tune)*

### 8. Điểm vào Character Card (Core Rule #8)

- **AC-28** [Manual] (tap-name 4 màn hình, tap=click parity): GIVEN tên `card_exists=true` ở S2/S4/S4-RO/S5, WHEN tap (mobile) hoặc click (desktop), THEN O-Card mở đúng `char_id` ở cả 4 nơi, cả 2 phương thức.
- **AC-29** [Unit] (tên không tap được): GIVEN `card_exists(char_id)=false`, WHEN dựng style đoạn text chứa tên, THEN không meta tag/link styling/gạch chân — chữ thường, không "link chết".
- **AC-30** [Integration] (Card tự đóng khi Undo xóa nguồn tồn tại): GIVEN O-Card mở cho X, WHEN Undo xóa lượt làm `card_exists(X)→false`, THEN O-Card tự đóng, về S2 bình thường — không crash.
- **AC-31** [Manual] (「Thẻ」 4 nơi — GAP-3 đã khép): GIVEN S2, S5 (lề header) và S4, S4-RO (chrome Story Log), WHEN kiểm tra bút tích 「Thẻ」, THEN có mặt và mở đúng thẻ ở cả 4 màn hình.

### 9. Chờ AI & timeout (Core Rule #9)

- **AC-32** [Manual] (chỉ báo "đang viết"): GIVEN `tm_state=resolving`, THEN chỉ báo inline tại vị trí đoạn kế tiếp, chuyển động NGANG duy nhất, không spinner. *(screenshot + lead sign-off — visual fidelity không tự động hóa)*
- **AC-33** [Integration] (timeout → Awaiting Action, world_time bất biến): GIVEN AI mock treo quá `ai_call_timeout_seconds` (đọc registry), WHEN timeout, THEN `tm_state→awaiting_action`, lỗi hiện TRONG khung tường thuật (không banner), `world_time` không đổi.
- **AC-34** [Integration] (timeout khi ở S4): GIVEN người chơi ở S4 khi timeout xảy ra, WHEN lật về S2, THEN thấy thông báo + khu nhập mở khóa — không banner, không bị kéo cưỡng chế.

### 10. Settings (Core Rule #10)

- **AC-35** [Integration] (persist cấp thiết bị): GIVEN đổi cỡ chữ, WHEN reload app và mở SLOT KHÁC, THEN giá trị giữ nguyên — xác nhận `app_config` ngoài slot blob.
- **AC-36** [Manual] (nguồn mở giới hạn): GIVEN S4, S4-RO, S5, THEN không tồn tại đường vào Settings ở 3 màn hình này.

### 11. Chế độ read-only S4-RO (Core Rule #7)

- **AC-37** [Unit] (không render nút mutating): GIVEN màn hình = S4-RO, WHEN liệt kê mọi phần tử tương tác được dựng, THEN không phần tử nào thuộc `class=mutating` (bảng D.1) xuất hiện — kể cả dạng disabled; phải là KHÔNG RENDER.
- **AC-38** (thoát đúng `origin_screen`): cross-reference AC-10 — không test lặp.

### 12. Takeover 3 lối S5 (Core Rule #6)

- **AC-39** [Unit] (khu nhập không tồn tại): GIVEN màn hình = S5, WHEN dựng layout, THEN không node nào của khu nhập (4 thẻ/chip/ô tự do) được TẠO trong scene tree — không phải ẩn.
- **AC-40** [Manual] (bút tích ở S5): GIVEN S5, THEN 「Lục」「Thẻ」 đầy đủ chức năng (read-only); 「Mục」 chỉ còn "Về danh sách sổ".
- **AC-41** [Integration] (retry-lock theo `reset_in_progress` — GAP-4 đã khép): GIVEN `reset_in_progress=true` (cờ hệ #13, KHÔNG dùng `tm_state`), WHEN bấm "Thử lại" liên tục, THEN nút mờ mực + không phản hồi tới khi `reset_in_progress=false`.

### 13. Banner tier & empty states

- **AC-42** [Manual] (banner mọi màn hình): GIVEN banner quota kích hoạt khi ở S5, THEN banner hiện đúng vị trí tầng banner.
- **AC-43** [Unit] (không auto-timeout): GIVEN banner đang hiển thị, WHEN mock clock trôi dài, THEN banner KHÔNG tự biến mất nếu điều kiện gốc chưa hết và chưa tap X.
- **AC-44** [Manual] (2 empty state): GIVEN `total_turns=0` và GIVEN 0 slot, THEN mỗi nơi hiện đúng 1 dòng đã khóa ("Chưa có trang nào được viết" / "Chưa có sổ nào — hãy bắt đầu cuốn đầu tiên"), Save Slot VẪN giữ CTA "Bắt đầu mới" phía trên.
- **AC-45** [Manual] (Esc layering): GIVEN overlay mở, WHEN Esc, THEN overlay đóng; GIVEN không overlay, WHEN Esc, THEN không hành động nào (không pause menu, không thoát tầng screen).

### 14. Cross-system — Combat inline

- **AC-46** [Integration] (hệ thống không tự đổi màn hình khi in_combat — GAP-2 đã khép theo ngữ nghĩa hệ-thống): GIVEN `in_combat` chuyển `false→true→false` (mock Combat), WHEN quan sát tầng màn hình, THEN không chuyển màn hình nào do HỆ THỐNG tự kích hoạt (mọi chuyển màn hình trong trận đều truy về được 1 thao tác người chơi hợp lệ theo D.1/D.2); danh sách hành động trận render đúng trong 4 slot gợi ý chuẩn, không UI riêng.

**Tổng**: 46 AC (AC-38 là cross-ref) — 21 [Unit] BLOCKING; [Integration]/[Manual]/[Config] ADVISORY.

## Open Questions

| # | Câu hỏi | Chủ sở hữu | Mục tiêu giải quyết |
|---|---|---|---|
| 1 | **Dải viewport target cho "Mobile Web"** (GAP-6, qa-lead): tablet 768px thuộc nhóm nào? Bất biến 1-cột hiện chỉ chứng minh ≤480px; cần chốt dải chính thức trong `technical-preferences.md` (cùng chỗ Memory Ceiling đang TBD) | technical-director | Trước `/create-architecture` |
| 2 | **Browser back / history binding** (HTML5 export): MVP không bind — có cần intercept `beforeunload` cảnh báo khi đang Resolving không? | technical-director | ADR web export tại `/create-architecture` |
| 3 | **Danh sách field nhóm "Cấu hình AI"** trong Settings (API key, chọn model?): phụ thuộc ADR backend AI | technical-director | ADR backend AI tại `/create-architecture` |
| 4 | **Cơ chế lưu `app_config`** (cỡ chữ, cấp thiết bị): localStorage riêng hay góc nhỏ trong hệ lưu trữ Persistence? Không nằm trong slot bundle — cần ghi vào ADR persistence HTML5 đã dự kiến | technical-director | ADR persistence tại `/create-architecture` |
| 5 | **Kiến trúc screen stack** (scene tree/Autoload cho 3 tầng màn hình-overlay-banner): quyết định implementation, không thuộc GDD | godot-specialist | ADR tại `/create-architecture` |
| 6 | **Duyệt câu chữ empty-state mới** "Chưa có sổ nào — hãy bắt đầu cuốn đầu tiên" (giả định (j) của art-director — chữ mới, chưa qua narrative) | writer / narrative-director | Trước `/ux-design save-slot-screen` |
| 7 | **Interface phân trang World Memory** `(anchor_turn_id, count, direction)`: yêu cầu từ D.3 hệ này — GDD World Memory (Designed) chưa mô tả API shape này; cần bên đó xác nhận khi rà chéo | game-designer | `/review-all-gdds` |
| 8 | **Cờ `reset_in_progress`**: D.1/AC-41 tham chiếu cờ này thuộc sở hữu Character Continuation (#13), nhưng GDD #13 chưa định nghĩa tường minh — cần bổ sung bên đó khi rà chéo | game-designer | `/review-all-gdds` |
