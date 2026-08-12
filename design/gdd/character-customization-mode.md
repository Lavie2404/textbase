# Character Customization Mode

> **Status**: In Design
> **Author**: duchx + Claude Code agents
> **Last Updated**: 2026-08-12
> **Implements Pillar**: Không phục vụ pillar nào của lối chơi chính —
> tồn tại song song, tính năng meta/dev-tool ngoài phạm vi 5 Pillar của
> `game-concept.md` (xem Overview + Player Fantasy)

## Overview

**Character Customization Mode** là một cơ chế **tùy chọn (opt-in)** cho
phép người chơi tự ghi trực tiếp lên nhân vật chính của mình: cấp độ, 12
chỉ số cơ bản, và tạo vật phẩm/kỹ năng tùy chỉnh — bỏ qua hoàn toàn con
đường "kiếm được qua gameplay" mà `exp-realm-progression.md` và
`equipment-skill-data-system.md` quy định cho lối chơi thông thường.

Về tầng dữ liệu, đây là một **write path hoàn toàn mới**, độc lập với
Turn Manager — không tốn lượt, không qua AI tường thuật, không nằm trong
phạm vi Undo — khác biệt với *mọi* cơ chế ghi trạng thái hiện có trong
game (vốn luôn đi qua chu trình xác nhận lượt, kể cả 2 nút ghi-trạng-thái
hiếm hoi trên Thẻ Nhân Vật là Song Tu/Hồi phục).

Về tầng người chơi, hệ này **không sửa đổi** Pillar 2 (Hệ Quả Thực Sự)
hay Pillar 3 (Sức Mạnh Có Logic) của lối chơi mặc định — nó là một "cửa
sau" minh bạch, người chơi tự bật, tự chịu trách nhiệm, tồn tại **song
song** chứ không thay thế thiết kế gốc, giống cơ chế cheat console phổ
biến trong game single-player. Vì `game-concept.md` xác nhận đây là dự
án cá nhân, phi thương mại, người chơi duy nhất là nhà phát triển — hệ
này tồn tại để nhà phát triển thử nghiệm nhanh các nhánh nhân vật, hoặc
tập trung trải nghiệm tường thuật/roleplay ở một trạng thái cụ thể, mà
không cần cày lại từ đầu qua lối chơi thật mỗi lần.

Người chơi tương tác **chủ động, không thường xuyên** — bật/tắt qua 1
toggle, chỉnh sửa qua 1 panel riêng, hoàn toàn tách khỏi vòng lặp
moment-to-moment (chọn hành động mỗi lượt) của lối chơi chính.

## Player Fantasy

*(Ghi chú: `creative-director` không được tham vấn cho mục này — review
mode `lean`, chỉ Formulas/Acceptance Criteria bắt buộc specialist. Nên
xem lại thủ công trước khi vào production.)*

**Cảm giác đích**: *"Tôi đang đứng ngoài luật chơi trong giây lát —
không phải để thắng dễ hơn, mà để tự do thử nghiệm."*

Đây là một fantasy **hoàn toàn khác** với lối chơi chính. Trong khi
Pillar 2/3 xây dựng cảm giác "thực lực kiếm được, hệ quả thật" xuyên
suốt game, Character Customization Mode phục vụ cảm giác **"đạo diễn
đứng sau hậu trường"** — tạm rời khỏi vai nhân vật chính đang tu luyện,
để chỉnh sửa trực tiếp điểm xuất phát của một lần chơi. Gần với cảm
giác dùng console lệnh trong Skyrim/Bethesda hay Debug Mode của
Stardew Valley: **bật lên có chủ đích, biết rõ mình đang làm gì**,
không phải một phần thưởng/tiến trình tự nhiên của gameplay.

**Phản-fantasy** (cần tránh): tuyệt đối không được cảm thấy giống một
phần tự nhiên của "cuốn nhật ký đang sống" (Visual Identity Anchor của
`core-ui-screen-navigation.md`) — nếu panel này mang cùng ngôn ngữ
hình ảnh với màn chơi chính (mực loang, con dấu, marginalia), người
chơi sẽ mất ranh giới giữa "chuyện đang thật" và "mình vừa chỉnh tay",
làm xói mòn chính minh bạch mà tính năng này cam kết giữ.

## Detailed Design

*(Ghi chú: `systems-designer`/`game-designer` không được tham vấn cho
mục này — review mode `lean`.)*

### Core Rules

**#1 — Truy cập 2 lớp.** (a) **Toggle bật/tắt** tính năng — cấu hình
device-level trong Settings (O-Set, nhóm mới "Tùy chỉnh nhân vật"),
**ngoài slot bundle** (giống cỡ chữ), mặc định **OFF**. (b) Khi toggle
ON, VÀ đang ở S2 (Màn chơi chính) với `tm_state=awaiting_action` VÀ
`in_combat=false`, O-Set hiện thêm nút **"Chỉnh sửa nhân vật"** mở
overlay mới **O-Customize**. Nút này ẩn/mờ nếu không thỏa điều kiện
trên — kể cả khi mở O-Set từ S1 (không có nhân vật sống để chỉnh).

**#2 — O-Customize là overlay thứ 3**, tuân theo state machine overlay
có sẵn (`core-ui-screen-navigation.md`): tối đa 1 overlay mở cùng lúc —
mở O-Customize tự đóng O-Card/O-Set nếu đang mở.

**#3 — Ghi `level`, không bao giờ ghi `tier`.** Panel chỉ cho nhập
field `level`; `tier` LUÔN derive theo công thức có sẵn của
`exp-realm-progression.md` (`tier = floor((level-1)/10)+1`) — không có
field tier riêng, tránh desync mà GDD đó đã cảnh báo.

**#4 — Ghi 12 chỉ số cơ bản: all-12-or-nothing.** Bắt buộc nhập đủ
12/12 `base_X0` cùng lúc — submit bị chặn nếu thiếu bất kỳ field nào,
hoặc nếu `base_HP0 ≤ 0` (khớp D.5 `base_stat_completeness_check` của
`character-card-identity.md`, vì downstream dùng HP làm mẫu số).

**#5 — Tạo vật phẩm/kỹ năng tùy chỉnh dùng chung namespace ID** với
nội dung gốc (quyết định người dùng — không có prefix riêng). Hệ
thống bắt buộc chạy kiểm tra uniqueness (kiểu Formula 2
`is_valid_dataset`, `equipment-skill-data-system.md`) **tại runtime**
khi submit, so với toàn bộ ID đã tồn tại (nội dung gốc + custom trước
đó) — nếu trùng, **chặn submit**, yêu cầu người chơi tự đổi ID (không
tự động đổi tên).

**#6 — Bypass hoàn toàn Turn Manager.** Mọi ghi trong O-Customize áp
dụng **ngay lập tức** khi submit — không tốn lượt, không qua AI tường
thuật, không thuộc phạm vi Undo 1-lượt của Pillar 2.

**#7 — Vĩnh viễn, không hoàn tác.** Không có cơ chế undo/revert riêng
cho panel này — người chơi tự chịu trách nhiệm (khớp Player Fantasy).

**#8 — Cờ minh bạch không thể xóa.** Lần đầu tiên bất kỳ field nào
được ghi qua O-Customize trong 1 slot, set
`hack_mode_used_this_slot = true` (lưu trong slot bundle, không phải
device-level) — cờ này **không bao giờ** bị xóa/reset trong đời của
slot đó, kể cả khi tắt toggle sau đó.

**#9 — Khóa cứng khi combat.** Panel disabled hoàn toàn khi
`in_combat=true` (đọc từ Combat System) — khớp Combat Core Rule #4
(tier/level không đổi giữa trận).

**#10 — Ghi `level` kéo theo reset `current_exp`.** Khi submit ghi
`level` mới (Rule #3), `current_exp` được reset về `0` trong CÙNG một
lần ghi — tránh vi phạm bất biến `current_exp ∈ [0, exp_threshold(level)]`
(`character-card-identity.md` D.3) mà một level nhảy vọt/giảm đột ngột
chắc chắn sẽ phá.

### States and Transitions

| # | Trạng thái | Vào từ | Thoát đến | Điều kiện |
|---|---|---|---|---|
| O-Customize | Overlay chỉnh sửa nhân vật | nút "Chỉnh sửa nhân vật" trong O-Set, chỉ khi mở từ S2 | đóng (X/tap ngoài/Esc) sau mỗi submit hoặc hủy | toggle ON + `tm_state=awaiting_action` + `in_combat=false`; không tiêu lượt; mỗi submit ghi ngay, không qua Turn Manager |

### Interactions with Other Systems

| Hệ | Chiều | Dữ liệu qua interface | Ai sở hữu |
|---|---|---|---|
| EXP & Realm Progression | ghi | `level` (chỉ field này, `tier` derive) | Hệ này sở hữu write path mới; EXP GDD sở hữu formula derive `tier` |
| Character Card & Identity | ghi | 12 `base_X0` (all-12-or-nothing, `HP0>0`) | như trên |
| Equipment & Skill Data System | ghi | custom item (`item_id`, `efficacy`), custom skill/thức (theo schema hiện có) | như trên, tôn trọng uniqueness runtime check (Rule #5) |
| Turn Manager | không tương tác | — | Bypass hoàn toàn (Rule #6); chỉ đọc `tm_state` để gate Rule #1/#9 |
| Combat System | đọc | `in_combat` (gate Rule #9) | Combat sở hữu cờ |
| Persistence | ghi | `hack_mode_used_this_slot` (trong slot bundle); toggle bật/tắt (device-level, ngoài slot bundle) | Persistence sở hữu lưu trữ, hệ này sở hữu nội dung |
| Core UI/Screen Navigation | cung cấp | overlay O-Customize tích hợp vào state machine overlay hiện có (tối đa 1 mở cùng lúc); entry point nút trong O-Set | Core UI sở hữu khung overlay; hệ này sở hữu nội dung O-Customize |

## Formulas

*(Đề xuất bởi `systems-designer` — mục bắt buộc specialist dù ở lean
mode.)*

### D.1 — `customize_panel_available(toggle_enabled, screen, tm_state, in_combat)`

The `customize_panel_available` formula is defined as:

`customize_panel_available = toggle_enabled AND (screen=S2) AND (tm_state=awaiting_action) AND (NOT in_combat)`

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Toggle tính năng | `toggle_enabled` | bool | `{0,1}` | Cấu hình device-level (O-Set → "Tùy chỉnh nhân vật"), mặc định OFF (Rule #1a) |
| Màn hình hiện tại | `screen` | enum | `{S1,S2,S4,S4-RO,S5}` | Nguồn: state machine của `core-ui-screen-navigation.md` D.2 |
| Trạng thái Turn Manager | `tm_state` | enum | `{awaiting_action, resolving, undoing}` | Nguồn sự thật duy nhất, đọc chung interface với D.1 của `core-ui-screen-navigation.md` |
| Đang giao đấu | `in_combat` | bool | `{0,1}` | Đọc từ Combat System (Dependencies) |
| Kết quả | `customize_panel_available` | bool | `{0,1}` | `1` = nút "Chỉnh sửa nhân vật" trong O-Set hiện & bấm được |

**Output Range:** Boolean thuần, hàm tổng — 60 tổ hợp test đầy đủ (2×5×3×2).

**Example:** `(true,S2,awaiting_action,false)=true` — mọi điều kiện Rule #1b thỏa. `(true,S1,awaiting_action,false)=false` — mở O-Set từ S1, không có nhân vật sống để chỉnh. `(true,S2,resolving,false)=false` — AI đang viết. `(true,S2,awaiting_action,true)=false` — Rule #9 khóa cứng combat. `(false,S2,awaiting_action,false)=false` — toggle OFF.

**Edge cases:** không cần carve-out riêng cho `screen=S5` — không có đường dẫn hợp lệ nào tới O-Customize từ S5. `toggle_enabled` không đổi được trong lúc O-Customize đang mở (O-Set/O-Customize loại trừ nhau, Rule #2). Nếu `in_combat` chuyển `true` ngay lúc panel đang mở, formula đánh giá lại trả `false` → panel phải force-close, không chỉ ẩn nút.

**Rationale:** Hình thức hóa Rule #1b + #9 thành 1 predicate AND thuần túy, cùng phong cách D.1 gốc của `core-ui-screen-navigation.md` — unit-test được không cần dựng scene Godot.

### D.2 — `is_valid_level_write(level)`

The `is_valid_level_write` formula is defined as:

`is_valid_level_write(level) = is_int(level) AND (level ≥ 1) AND (level ≤ LEVEL_WRITE_MAX)`

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Giá trị nhập | `level` | int/float/string (raw UI input) | không giới hạn trước validate | Giá trị người chơi gõ vào field `level` của O-Customize |
| Trần vệ sinh kỹ thuật | `LEVEL_WRITE_MAX` | int (knob) | mặc định 1,000,000; safe range 1,000–10,000,000 | Chặn giá trị phi thực tế — KHÔNG phải cân bằng gameplay (Combat đã tự bảo vệ bằng `FLOOR_TOTAL`) |
| Kết quả | `is_valid_level_write` | bool | `{0,1}` | `1` = submit được phép ghi `level`; `tier` sau đó derive tự động (Rule #3), `current_exp` reset (Rule #10) |

**Output Range:** Boolean.

**Example:** `(50)=true`. `(0)=false` — vi phạm `level≥1` (nếu lọt qua sẽ làm `tier_from_level(0)=0`, phá bất biến "`tier` không bao giờ = 0 với `level≥1` hợp lệ"). `(-5)=false`. `(3.5)=false` — không phải số nguyên, fail-fast thay vì âm thầm làm tròn. `(2,000,000)=false` — vượt `LEVEL_WRITE_MAX`.

**Edge cases:** `level=1` hợp lệ (biên dưới model gốc). Input phi số/rỗng → `is_int=false` → chặn toàn bộ, không có giá trị mặc định ngầm. Submit trùng giá trị hiện tại của nhân vật → hợp lệ, coi là no-op ghi lại.

**Rationale:** `level≥1` là bắt buộc cứng (bảo vệ bất biến `tier_from_level`, dùng chung với Combat/Character Card). `LEVEL_WRITE_MAX` là quyết định thiết kế riêng của hệ này — vệ sinh kỹ thuật, không kế thừa từ hệ khác.

### D.3 — `is_valid_base_stat_set(base_X0_map)`

The `is_valid_base_stat_set` formula is defined as:

```
STAT_FIELDS_12 = {HP, ATK, DEF, SPD, ACC, Né tránh, Crit Rate, Crit Damage, Amp, Mitigation, Lifesteal, HPRegen}

is_valid_base_stat_set(base_X0_map) =
    (keys(base_X0_map) = STAT_FIELDS_12)                                    // đủ 12/12, không thừa/thiếu field nào
    AND (base_X0_map[HP] là số VÀ base_X0_map[HP] > 0)                       // HP: strict >0
    AND ∀X ∈ STAT_FIELDS_12∖{HP}: (base_X0_map[X] là số VÀ base_X0_map[X] ≥ 0)  // 11 chỉ số còn lại: ≥0
```

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Bộ 12 chỉ số nháp | `base_X0_map` | map (key→float) | 12 key cố định | Payload panel gửi khi submit — draft, chưa phải entity record |
| Chỉ số khởi điểm HP | `base_X0_map[HP]` | float \| undefined | `(0, ∞)` khi có | Strict >0 — khớp `character-card-identity.md` D.5 |
| Chỉ số khởi điểm (11 còn lại) | `base_X0_map[X]` | float \| undefined | `[0, ∞)` khi có | ≥0 — khớp D.5 |
| Kết quả | `is_valid_base_stat_set` | bool | `{0,1}` | `1` = submit được phép ghi cả 12 field cùng lúc (Rule #4) |

**Output Range:** Boolean.

**Example (pass):** đủ 12/12 key, `HP=120`, các field còn lại ≥0 → `true` → ghi ngay (bypass Turn Manager, Rule #6).
**Example (fail — thiếu field):** chỉ 11/12 (thiếu `Lifesteal`) → `false` — cùng lớp lỗi AC-27 của `character-card-identity.md` D.5.
**Example (fail — HP=0):** đủ 12/12 nhưng `HP=0` → `false` — cùng lớp lỗi AC-46 của D.5.
**Example (fail — chỉ số âm):** `ATK=-5` → `false`.

**Edge cases:** chỉ số dạng % vượt `PERCENT_STAT_CAP` (VD `Crit Rate=5.0`) **không bị chặn ở đây** — clamp là việc của read-time (`exp-realm-progression.md`'s `percentage_stat_value`), không phải write-time; mirror đúng D.5 gốc, không tự thêm giới hạn mới — seed quá lớn chỉ "vô nghĩa" (bị nén khi hiển thị), không gây lỗi. Field lạ/thừa trong `base_X0_map` → equality check (không phải superset-check) → fail-fast thay vì âm thầm bỏ qua.

**Rationale:** Tái dùng chính xác bất biến `base_stat_completeness_check` (D.5, `character-card-identity.md`) — chỉ khác điểm áp dụng: D.5 gốc validate 1 char_id record đã tồn tại, formula này validate 1 map nháp tại thời điểm submit, trước khi entity record bị ghi đè.

### D.4 — `is_valid_custom_id(new_id, namespace, existing_id_set)`

The `is_valid_custom_id` formula is defined as:

`is_valid_custom_id = non_empty(new_id) AND (new_id ∉ existing_id_set)`

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| ID mới | `new_id` | string | bất kỳ chuỗi | ID người chơi tự đặt, không có prefix bắt buộc (Rule #5) |
| Loại namespace | `namespace` | enum | `{item, skill, thuc}` | 3 namespace tách biệt, khớp cấu trúc dữ liệu có sẵn của `equipment-skill-data-system.md` — ID vật phẩm chỉ cần khác ID vật phẩm khác, không cần khác ID kỹ năng |
| Tập ID đã tồn tại | `existing_id_set` | set(string) | — | Nội dung gốc + custom trước đó, CÙNG `namespace`, nạp lại runtime tại thời điểm submit |
| Kết quả | `is_valid_custom_id` | bool | `{0,1}` | `1` = ID hợp lệ, submit tiến hành; `0` = chặn, yêu cầu tự đổi ID (không tự động đổi tên) |

**Output Range:** Boolean.

**Example (pass):** `new_id="huyet_dan_cai_tien"`, `namespace=item`, không trùng `existing_id_set` → `true`.
**Example (fail — trùng nội dung gốc):** `new_id="huyet_dan"` (đã là 1 `item_id` gốc) → `false` — chặn, KHÔNG tự đổi tên.
**Example (fail — chuỗi rỗng):** `new_id=""` → `false`.

**Edge cases:** tạo 1 kỹ năng kèm N thức trong CÙNG 1 lần submit → gọi `is_valid_custom_id` N+1 lần (1 cho `skill_id`, N cho từng `thuc_id`); các lần gọi `thuc` sau phải thấy các `thuc_id` mới vừa được lần trước chấp nhận trong cùng batch (chặn tự-trùng giữa 2 thức mới, không chỉ trùng dữ liệu cũ). So khớp phân biệt hoa/thường (mirror Formula 2 gốc — `"Huyet_Dan"` và `"huyet_dan"` là 2 ID khác nhau).

**Rationale:** Tái dùng nguyên vẹn ngữ nghĩa uniqueness của Formula 2 (`equipment-skill-data-system.md`), chuyển từ kiểm tra CI/authoring-time (toàn bộ dataset) sang kiểm tra runtime/submit-time (1 ID mới so với pool hiện có).

## Edge Cases

*(Ghi chú: `systems-designer` không được tham vấn cho mục này — lean
mode.)*

- **Nếu số kỹ năng đã biết (gồm custom) vượt `max_known_skills_per_character=6`**
  (`equipment-skill-data-system.md`): **KHÔNG chặn submit** — knob đó là
  giả định UI/AI narration, không phải schema cap cứng. Panel hiển thị
  cảnh báo "vượt số kỹ năng khuyến nghị — AI có thể chọn kỹ năng kém
  tối ưu khi tường thuật combat", nhưng vẫn cho ghi.
- **Nếu custom item không khai `efficacy` hoặc khai ngoài `[0,1]`**:
  chặn submit — mirror đúng ràng buộc author-mandatory, không có
  default, của `equipment-skill-data-system.md` (item hồi phục).
- **Nếu custom skill có `weapon_type` không khớp vũ khí đang trang bị**:
  vẫn cho tạo — không phải lỗi. Skill chỉ đơn giản **không dùng được
  cho tới khi** trang bị đúng loại vũ khí, đúng luật đã áp dụng cho nội
  dung gốc (không có ngoại lệ riêng cho nội dung hack-tạo).
- **Nếu load lại 1 slot có `hack_mode_used_this_slot=true` trên thiết bị
  mà toggle đang OFF** (mặc định trên máy mới): dữ liệu đã ghi (level/
  stat/item/skill) **vẫn tải và hoạt động bình thường**, cùng code path
  với nội dung gốc — toggle chỉ gate quyền **mở panel chỉnh sửa tiếp**,
  không gate quyền đọc dữ liệu đã tồn tại. Cờ `hack_mode_used_this_slot`
  chỉ là dấu vết lịch sử, không phải điều kiện runtime.
- **Undo (Pillar 2, undo 1-lượt) không có tương tác gì với dữ liệu đã
  ghi qua O-Customize**: vì mọi ghi qua panel bypass Turn Manager hoàn
  toàn (Rule #6), chúng không nằm trong bất kỳ turn snapshot nào — Undo
  một lượt thường không hoàn tác, không ảnh hưởng gì tới giá trị đã
  hack-ghi trước hoặc sau đó.
- **Nếu người chơi bấm submit 2 lần liên tiếp nhanh (double-tap)**: nút
  submit tự khóa ngay sau lần bấm đầu tiên cho tới khi ghi xong
  (debounce chuẩn, cùng pattern khóa input đệ quy đã dùng ở
  `core-ui-screen-navigation.md` D.1) — tránh ghi đè 2 lần hoặc race
  condition.
- **Sau khi ghi, giá trị hack-injected được coi là sự thật như mọi giá
  trị khác** trong toàn bộ gameplay logic (Combat, Death & Consequence,
  NPC Affinity...) — không có cờ "giả"/"tạm" nào được theo dõi riêng ở
  tầng cơ học; nhân vật hack-boost vẫn có thể chết thật theo đúng luật
  Cái Chết ở ngưỡng thù địch sâu sắc, không có miễn trừ.
- **Panel chỉ thao tác trên `char_id` của nhân vật chính đang active
  trong slot** — không có UI nào cho phép chọn NPC khác làm mục tiêu
  ghi, dù schema Equipment & Skill vốn keyed theo `char_id` tổng quát.

## Dependencies

**Hard — upstream (hệ này không hoạt động được nếu thiếu):**

| Hệ | Vì sao hard | Interface cụ thể |
|---|---|---|
| Core UI/Screen Navigation | Cần state machine overlay có sẵn để host O-Customize; cần đọc `screen`/`tm_state` | Đọc `screen=S2`, `tm_state`; cung cấp overlay O-Customize (Rule #1, #2, D.1) |
| Turn Manager | Cần đọc `tm_state` để gate — dù KHÔNG BAO GIỜ ghi qua đường này | Đọc `tm_state` (D.1); không gửi action/không tiêu lượt (Rule #6) |
| Combat System | Cần đọc `in_combat` để khóa cứng (Rule #9); ràng buộc tier/level không đổi giữa trận là lý do tồn tại của gate này | Đọc `in_combat` (D.1) |
| EXP & Realm Progression | Ghi `level`, phải tôn trọng công thức derive `tier`, `exp_threshold` | Ghi `level` + reset `current_exp=0` (Rule #3, #10, D.2) |
| Character Card & Identity | Ghi 12 `base_X0`, phải tôn trọng `base_stat_completeness_check` (D.5) | Ghi `base_X0_map` (Rule #4, D.3) |
| Equipment & Skill Data System | Ghi custom item/skill/thức, phải tôn trọng uniqueness (Formula 2) | Ghi item/skill/thức mới (Rule #5, D.4) |
| Persistence / Save System | Field mới bắt buộc bump `schema_version`; lưu `hack_mode_used_this_slot` trong slot bundle, toggle device-level ngoài slot bundle | Ghi `hack_mode_used_this_slot` (Rule #8) |

**Soft — downstream (bị ảnh hưởng gián tiếp khi dữ liệu thay đổi, không
cần phối hợp trực tiếp):** Situation/Encounter Generation (đọc `level`
cho ngưỡng chênh 20 cấp — không cần biết giá trị đến từ hack mode hay
gameplay thật), NPC Affinity (không trực tiếp, chỉ qua kết quả combat
nếu có).

**⚠️ Phụ thuộc một chiều CẦN xử lý** (vi phạm "Dependencies must be
bidirectional", `coding-standards.md`/`design-docs.md`): 5 GDD hard-
dependency ở trên đều đã **Approved** và **không hề biết tới hệ thống
này** — `core-ui-screen-navigation.md` chưa có O-Customize trong bảng
States/overlay; `exp-realm-progression.md`, `character-card-identity.md`,
`equipment-skill-data-system.md`, `persistence-save-system.md` đều chưa
liệt kê hệ này ở Dependencies của chính chúng. Gap cùng dạng đã xảy ra
14 lần trước với các hệ khác (xem lịch sử "Phát hiện từ `/design-system`
hệ #N" trong `systems-index.md`) — cần chạy `/propagate-design-change`
sau khi GDD này hoàn tất để cascade đúng.

## Tuning Knobs

| Knob | Mặc định | Safe Range | Ảnh hưởng nếu thấp quá / cao quá |
|---|---|---|---|
| `LEVEL_WRITE_MAX` | 1,000,000 | 1,000 – 10,000,000 | **Thấp quá**: chặn cả những giá trị testing hợp lý (VD muốn test level 5,000 để xem UI hiển thị bậc lớn). **Cao quá (vượt safe range)**: không phá công thức nào (Combat đã tự bảo vệ bằng `FLOOR_TOTAL`), chỉ mất tác dụng vệ sinh input — không còn chặn được lỗi đánh máy thừa số 0 |
| `SUBMIT_DEBOUNCE_MS` | 500ms | 200 – 1000ms | **Thấp quá**: double-tap vẫn lọt qua, rủi ro race condition ghi đè (xem Edge Cases). **Cao quá**: cảm giác panel phản hồi chậm, người chơi tưởng nút không hoạt động |
| `hack_mode_toggle_default` | `false` (OFF) | `{true, false}` — cố định, không phải dải số | Đây là giá trị mặc định lúc cài đặt mới, không phải "quá cao/quá thấp" — đổi giá trị này tương đương đổi chính sách "tính năng ẩn theo mặc định" của toàn hệ, không phải tuning cân bằng |

Không định nghĩa lại `max_known_skills_per_character` (đã thuộc
`equipment-skill-data-system.md`) — hệ này chỉ tham chiếu, không sở
hữu (xem Edge Cases: vượt ngưỡng đó chỉ cảnh báo, không chặn).

## Visual/Audio Requirements

*(Ghi chú: `art-director` không được tham vấn — category "Gameplay"
không nằm trong danh sách bắt buộc của skill; đây là ghi chú ngắn theo
đúng mức cần thiết ở giai đoạn GDD.)*

**Nguyên tắc chủ đạo**: O-Customize phải **chủ động phá vỡ** Visual
Identity Anchor "Mực Chưa Khô" của toàn game (khớp Player Fantasy —
"phản-fantasy"). Cụ thể:
- **Không** dùng khung/viền mép mực loang hữu cơ — dùng border thẳng,
  góc vuông, kiểu bảng điều khiển/công cụ kỹ thuật.
- **Không** dùng nền giấy dó kem/trắng ngà — dùng nền trung tính khác
  biệt rõ (VD xám nhạt hoặc tối, tùy theo theme UI kỹ thuật của
  Godot), để không thể nhầm với 1 trang truyện.
- **Không** dùng 2 màu accent đã "khẩu phần hóa" của thế giới thật (đỏ
  son = trọng thương/chết, xanh ngọc = đột phá cảnh giới) cho bất kỳ
  yếu tố nào trong panel — tránh gây hiểu nhầm "thế giới vừa đổi thật"
  khi thực chất là thao tác hack. Nếu cần 1 accent riêng, dùng màu
  trung tính khác (VD xám/cam kỹ thuật) chưa từng dùng ở nơi khác.
- Chữ số liệu **không cần** đặt trong khung con dấu (quy tắc "mọi con
  số phải minh họa bằng nét mực" chỉ áp dụng cho thế giới thật) — hiển
  thị dạng field nhập liệu chuẩn (input box), đúng tinh thần "công cụ",
  không phải "tường thuật".

**Audio**: không cần SFX riêng — khớp `game-concept.md` Technical
Considerations ("Audio Needs: Tối thiểu"). Nếu game sau này có SFX
UI chung (click/confirm), panel dùng lại đúng bộ đó, không cần âm
thanh đặc trưng riêng.

## UI Requirements

**Toggle (trong O-Set, nhóm mới "Tùy chỉnh nhân vật")**:
- 1 dòng switch on/off, label rõ ràng (VD "Bật chế độ tùy chỉnh nhân
  vật (hack mode)"), kèm 1 dòng mô tả ngắn cảnh báo hệ quả (không thể
  hoàn tác, minh bạch vĩnh viễn trên slot) — hiển thị NGAY DƯỚI switch,
  không cần dialog xác nhận riêng (khớp tinh thần "tự chịu trách
  nhiệm", không phải "chặn bằng thủ tục").
- Vị trí: nhóm thứ 3 trong O-Set, sau "Cỡ chữ" và "Cấu hình AI" —
  không thay thế 2 nhóm hiện có.

**O-Customize (overlay panel)** — 3 khu vực rõ ràng, không cuộn ngang:
1. **Khu Cấp độ**: 1 field nhập `level` (số nguyên), hiển thị `tier`
   derive real-time bên cạnh (read-only, không phải input) để người
   chơi thấy ngay hệ quả trước khi submit.
2. **Khu 12 chỉ số cơ bản**: lưới 12 field nhập (khớp `STAT_FIELDS_12`),
   mỗi field có validate inline tức thời (viền đỏ + thông báo ngắn nếu
   âm hoặc HP=0) — không đợi tới lúc bấm submit mới báo lỗi toàn bộ.
3. **Khu Tạo vật phẩm/kỹ năng**: form riêng — chọn loại (Vật phẩm/Kỹ
   năng/Thức), các field theo đúng schema `equipment-skill-data-system.md`
   (item: `item_id`+`efficacy`; skill: `weapon_type`+`tier`+
   `family_id`+`style_descriptor`; thức: tên + thuộc 1 skill). Validate
   ID trùng hiển thị NGAY khi rời field (không đợi submit).

**Chung cho cả 3 khu**: 1 nút "Lưu" duy nhất cuối panel (áp dụng
`SUBMIT_DEBOUNCE_MS=500ms`, tự khóa sau khi bấm) — submit từng khu độc
lập (sửa `level` không bắt buộc phải điền đủ 12 chỉ số cùng lúc). Nút
"Hủy"/hoặc tap-ngoài/Esc đóng panel không lưu gì.

**Touch target**: mọi field/nút trong panel tuân `TOUCH_TARGET_MIN=44px`
(registry constant, đã dùng ở `core-ui-screen-navigation.md`) — cùng
chuẩn toàn game, không có ngoại lệ cho panel "kỹ thuật" này.

**Responsive**: touch-primary device → 1 cột dọc (khớp D.5 rule của
`core-ui-screen-navigation.md` — mọi touch-primary luôn 1-column bất
kể chiều rộng màn hình); desktop/mouse-primary có thể xếp Khu 2 (12
chỉ số) thành lưới 2-3 cột để đỡ cuộn dài.

*(Đây là yêu cầu ở mức GDD — bố cục ASCII wireframe, spacing chi tiết,
copy chính xác từng dòng thuộc phạm vi `/ux-design`, chạy sau khi GDD
này Approved.)*

## Acceptance Criteria

*(Đề xuất bởi `qa-lead` — mục bắt buộc specialist dù ở lean mode. Phân
loại theo bảng Story Type của `coding-standards.md`: D.1–D.4 và hầu hết
AC là **Logic/Integration → BLOCKING**, cần test file tại
`tests/unit/character-customization-mode/` (naming
`character_customization_[feature]_test.gd`, hàm
`test_[scenario]_[expected]`) và
`tests/integration/character-customization-mode/`. Chỉ AC-32 là
**Visual/Feel → ADVISORY**, bằng chứng screenshot + lead sign-off tại
`production/qa/evidence/character-customization-mode/`. Không có AC dạng
Config/Data thuần túy trong hệ này.)*

**Ghi chú test setup**: mọi phụ thuộc ngoài phải inject qua mock/fixture
— không gọi hệ thật, không AI, không mạng, không đồng hồ thật, không
random không-seed. Hằng số của chính hệ này: `LEVEL_WRITE_MAX=1,000,000`,
`SUBMIT_DEBOUNCE_MS=500ms`, `hack_mode_toggle_default=false`. Hằng
số/formula tham chiếu từ hệ khác (import, không định nghĩa lại):
`tier_from_level`, `exp_threshold` (EXP & Realm Progression);
`get_base_X0`, `base_stat_completeness_check` D.5 (Character Card &
Identity); Formula 2 `is_valid_dataset`, `weapon_type` gate AC-14
(Equipment & Skill Data System); `gap_realm`, `PENALTY_PER_TIER`,
`FLOOR_TOTAL` (Combat System D.1); `HOSTILE_INITIATIVE_LEVEL_GAP_MAX=20`
(Situation/Encounter Generation).

### 1. Truy cập 2 lớp & `customize_panel_available` — D.1 (Core Rule #1)

- [ ] **AC-01** [Unit] Ma trận đầy đủ 60 tổ hợp (2×5×3×2 của `toggle_enabled`×`screen`×`tm_state`×`in_combat`): `customize_panel_available` chỉ `true` khi CẢ 4 điều kiện đồng thời thỏa (`toggle_enabled=true` AND `screen=S2` AND `tm_state=awaiting_action` AND `in_combat=false`); 59 tổ hợp còn lại `false`.
- [ ] **AC-02** [Integration] GIVEN O-Customize đang mở hợp lệ, WHEN `in_combat` chuyển `true` giữa lúc panel đang mở, THEN panel đóng NGAY — không chỉ disable nút bên trong.
- [ ] **AC-03** [Integration] GIVEN O-Set mở từ `screen=S1`, `toggle_enabled=true`, WHEN dựng O-Set, THEN nút "Chỉnh sửa nhân vật" không render/không bấm được.

### 2. O-Customize là overlay thứ 3 (Core Rule #2)

- [ ] **AC-04** [Unit] GIVEN O-Card đang mở, WHEN mở O-Customize, THEN O-Card đóng NGAY trước khi O-Customize mở; ≤1 overlay có `open=true` tại mọi thời điểm trong {O-Card, O-Set, O-Customize}.
- [ ] **AC-05** [Integration] Chiều ngược lại: mở O-Set/O-Card khi O-Customize đang mở → O-Customize đóng trước; không có thời điểm nào 2 overlay cùng `open=true`.

### 3. Ghi `level`, `tier` luôn derive — D.2 (Core Rule #3, #10)

- [ ] **AC-06** [Unit] GIVEN các giá trị `{1, 50, 0, -5, 3.5, 1000000, 1000001, "", "abc"}`, WHEN chạy `is_valid_level_write`, THEN kết quả đúng lần lượt: `1=true, 50=true, 0=false, -5=false, 3.5=false, 1000000=true, 1000001=false, ""=false, "abc"=false`.
- [ ] **AC-07** [Integration] GIVEN cây UI O-Customize, THEN không có field nào gắn với `tier` (chỉ `level`). WHEN 1 lần ghi `level` hợp lệ commit, THEN `tier` tính lại đúng `tier=floor((level-1)/10)+1` — kiểm 3 biên: `level=1→tier=1`, `level=10→tier=1`, `level=11→tier=2`.
- [ ] **AC-08** [Integration] GIVEN nhân vật `level=25, current_exp=340`, WHEN submit `level=50`, THEN TRONG CÙNG 1 giao dịch: `level→50`, `tier` tính lại, VÀ `current_exp→0` — không tồn tại trạng thái trung gian nào có `level=50` mà `current_exp=340` (bất biến `current_exp∈[0,exp_threshold(level)]` không vi phạm dù chỉ thoáng qua).

### 4. Ghi 12 chỉ số cơ bản — D.3 (Core Rule #4)

- [ ] **AC-09** [Unit] GIVEN 4 ca — (a) đủ 12/12, `HP=120`, còn lại ≥0 → `true`; (b) 11/12 (thiếu `Lifesteal`) → `false`; (c) đủ 12/12 nhưng `HP=0` → `false`; (d) đủ 12/12 nhưng `ATK=-5` → `false`, WHEN chạy `is_valid_base_stat_set`, THEN khớp đúng cả 4.
- [ ] **AC-10** [Integration] GIVEN chỉ điền 11/12 field, WHEN submit, THEN bị chặn (spy write=0) — entity record giống hệt trước/sau (không ghi bán phần).
- [ ] **AC-11** [Unit] GIVEN `base_X0_map` đủ 12 key bắt buộc CỘNG 1 key lạ (VD `"Luck"`), WHEN chạy `is_valid_base_stat_set`, THEN `false` (equality check, không phải superset-check).

### 5. Custom ID uniqueness — D.4 (Core Rule #5)

- [ ] **AC-12** [Unit] GIVEN `new_id="huyet_dan_cai_tien"` (không trùng, `namespace=item`)→`true`; `new_id="huyet_dan"` (trùng gốc)→`false`; `new_id=""`→`false`, WHEN chạy `is_valid_custom_id`, THEN khớp đúng cả 3.
- [ ] **AC-13** [Unit] GIVEN `existing_id_set` chứa `"huyet_dan"`, WHEN test `new_id="Huyet_Dan"`, THEN `true` — phân biệt hoa/thường (mirror Formula 2 gốc).
- [ ] **AC-14** [Unit] GIVEN `existing_id_set` của `namespace=item` chứa `"phong_van"`, WHEN test `new_id="phong_van"` với `namespace=skill`, THEN `true` — 2 pool ID tách biệt.
- [ ] **AC-15** [Integration] GIVEN 1 lần submit tạo 1 `skill_id`+2 `thuc_id` cùng lúc, WHEN `thuc_id` thứ 2 trùng `thuc_id` thứ 1 VỪA được chấp nhận trong CÙNG batch, THEN submit bị chặn — `is_valid_custom_id` gọi đúng N+1 lần, lần sau thấy ID mới vừa chấp nhận.
- [ ] **AC-16** [Integration] GIVEN `new_id` trùng ID đã tồn tại, WHEN submit, THEN KHÔNG tự sinh ID thay thế — không ghi nào xảy ra.

### 6. Bypass Turn Manager (Core Rule #6)

- [ ] **AC-17** [Integration] GIVEN Turn Manager mock `tm_state=awaiting_action, world_time=T`, WHEN submit bất kỳ ghi hợp lệ nào, THEN không action nào gửi tới Turn Manager, `world_time` giữ nguyên `T`, `tm_state` giữ nguyên, không có AI call nào (spy=0).

### 7. Vĩnh viễn, không hoàn tác (Core Rule #7)

- [ ] **AC-18** [Integration] GIVEN panel O-Customize, THEN không có control Undo/revert nào trong panel. GIVEN 1 lần ghi vừa commit, WHEN Undo 1-lượt chuẩn của Pillar 2 gọi ngay sau đó, THEN giá trị hack-ghi KHÔNG bị ảnh hưởng (không nằm trong turn snapshot nào).

### 8. Cờ minh bạch không thể xóa (Core Rule #8)

- [ ] **AC-19** [Integration] GIVEN slot mới `hack_mode_used_this_slot=false`, WHEN lần ghi ĐẦU TIÊN qua O-Customize commit, THEN `→true` cùng lần ghi. WHEN toggle device-level tắt VÀ app reload, THEN cờ vẫn `true`.

### 9. Khóa cứng khi combat (Core Rule #9)

- [ ] **AC-20** cross-reference AC-01, AC-02 — nhánh `in_combat=true` đã phủ đầy đủ bởi ma trận D.1 + hành vi force-close; không test lặp.

### 10. Cross-system

- [ ] **AC-21** [Integration] GIVEN nhân vật chính hack-ghi `level=15` (`tier=2`) và NPC đối thủ `level=45` (`tier=5`), WHEN Combat tính `gap_realm(self=player)`, THEN `=max(0,5-2)=3` — CHÍNH XÁC như nếu đạt tier đó qua gameplay thật, không nhánh riêng cho hack; khung "con dấu" chênh lệch cảnh giới trên Card xuất hiện đúng.
- [ ] **AC-22** [Integration] GIVEN hack-ghi đủ 12/12 `base_X0`, WHEN mở O-Card, THEN cả 12 giá trị khớp CHÍNH XÁC, đọc qua CÙNG interface `get_base_X0(char_id, X)` dùng cho dữ liệu gameplay thật.
- [ ] **AC-23** [Integration] GIVEN custom item hợp lệ (`efficacy∈[0,1]`, ID không trùng), WHEN trang bị và dùng trong combat, THEN resolve bằng ĐÚNG logic dùng cho item nội dung gốc.
- [ ] **AC-24** [Integration] GIVEN hack-ghi `level` sao cho chênh lệch vượt `HOSTILE_INITIATIVE_LEVEL_GAP_MAX=20`, WHEN scheduler tính `hostile_initiative_allowed`, THEN đọc `level` hack-ghi CHÍNH XÁC như gameplay thật — kiểm 1 ca ngay dưới ngưỡng (19), 1 ca ngay trên (21).

### 11. Edge Cases (8/8)

- [ ] **AC-25** [Integration] GIVEN nhân vật đã có đúng 6 kỹ năng (`max_known_skills_per_character=6`), WHEN tạo thêm kỹ năng thứ 7, THEN submit THÀNH CÔNG + hiển thị cảnh báo — KHÔNG bị chặn.
- [ ] **AC-26** [Unit] GIVEN `efficacy∈{undefined,-0.1,0,0.5,1.0,1.1}`, WHEN validate, THEN: `undefined=chặn, -0.1=chặn, 0=cho phép, 0.5=cho phép, 1.0=cho phép, 1.1=chặn`.
- [ ] **AC-27** [Integration] GIVEN custom skill `weapon_type=kiếm` khi đang trang bị `weapon_type=quyền`, WHEN submit, THEN tạo THÀNH CÔNG; WHEN dùng skill đó lúc vẫn trang bị sai loại, THEN KHÔNG dùng được — cùng luật AC-14 của `equipment-skill-data-system.md`, không ngoại lệ.
- [ ] **AC-28** [Integration] GIVEN slot `hack_mode_used_this_slot=true`, toggle device `=false`, WHEN load slot, THEN dữ liệu hack-ghi trước đó hoạt động đúng, cùng code path nội dung gốc; nút "Chỉnh sửa nhân vật" vẫn ẩn.
- [ ] **AC-29** [Integration] GIVEN bấm submit 2 lần trong `SUBMIT_DEBOUNCE_MS=500ms`, WHEN trace, THEN đúng 1 lần ghi commit.
- [ ] **AC-30** [Integration] GIVEN nhân vật hack-boost cực đoan, WHEN đạt ngưỡng thù địch sâu sắc kích hoạt luật Cái Chết, THEN chết theo ĐÚNG luật gameplay thật — không miễn trừ, không nhánh ngoại lệ.
- [ ] **AC-31** [Integration] GIVEN O-Customize đang mở, THEN không có control nào cho phép chọn `char_id` khác ngoài nhân vật chính đang active.
- [ ] *(Edge case "Undo không tương tác với dữ liệu hack-ghi" — cross-reference AC-18, không test lặp.)*

### 12. Player Fantasy — ngôn ngữ hình ảnh (phản-fantasy)

- [ ] **AC-32** [Manual] GIVEN O-Customize đang mở, THEN nền/khung/iconography KHÔNG tái sử dụng Visual Identity Anchor của S2/S4/S4-RO/S5 (mực loang, con dấu, marginalia) — screenshot + lead sign-off xác nhận khác biệt nhận ra được ngay bằng mắt. *(screenshot + lead sign-off, `production/qa/evidence/character-customization-mode/`)*

### Gap Analysis (từ `qa-lead`)

- **AC-25** chỉ test hành vi "không chặn submit", không khóa literal copy cảnh báo (chưa có UI Requirements/copy doc riêng).
- **AC-27** phụ thuộc `equipment-skill-data-system.md` AC-14 không đổi — rủi ro doc-drift giữa 2 GDD nếu bên đó được review lại.
- **Cố ý KHÔNG** thêm AC cho việc bump `schema_version` — đó là nghĩa vụ của `persistence-save-system.md`, không phải hệ này sở hữu.
- Khi UI Requirements được viết sau, nên bổ sung AC-33+ cho bố cục panel cụ thể (vị trí toggle, layout 12 field, thông báo lỗi inline).
- Nếu `/propagate-design-change` sau này đổi shape các interface mà AC-08/19/21-24 coi là đã ổn định (`get_base_X0`, `tier_from_level`, `gap_realm`, `hack_mode_used_this_slot`), các AC cross-system này cần review lại đồng bộ.

## Open Questions

1. **Phụ thuộc một chiều chưa cascade** (owner: `technical-director`,
   target: trước khi implement) — 5 GDD Approved (`core-ui-screen-
   navigation.md`, `exp-realm-progression.md`, `character-card-
   identity.md`, `equipment-skill-data-system.md`, `persistence-save-
   system.md`) chưa biết hệ này tồn tại. Cần chạy `/propagate-design-
   change` để cascade đúng (xem Dependencies).

2. **Giới hạn cho build công khai trong tương lai** (owner:
   `creative-director`, target: trước khi cân nhắc public release,
   KHÔNG chặn MVP) — game hiện là dự án cá nhân, phi thương mại,
   người chơi duy nhất là nhà phát triển (`game-concept.md`). Nếu dự
   án sau này công khai/chia sẻ, cần quyết định có nên gate/loại bỏ
   hack mode khỏi build công khai hay giữ nguyên như 1 tính năng
   chính thức.

3. **`base_X0` không có trần trên** (owner: `systems-designer`,
   target: trước implement, ưu tiên thấp) — D.3 chỉ chặn âm/`HP=0`,
   không chặn giá trị cực lớn (VD `ATK=999999999`). Chỉ số dạng % tự
   được chặn ở read-time qua `PERCENT_STAT_CAP`, nhưng chỉ số dạng
   tuyệt đối (HP/ATK/DEF/SPD...) hoàn toàn không có trần — có cần 1
   knob kiểu `LEVEL_WRITE_MAX` áp dụng tương tự không, hay chấp nhận
   vì đây vốn là bản chất "hack mode"?

4. **AC-25 chưa khóa văn bản cảnh báo chính xác** (owner:
   `ux-designer`, target: khi chạy `/ux-design` cho O-Customize) —
   cần UI copy doc riêng để test literal string, hiện AC chỉ test
   hành vi "không chặn submit".

5. **AC-27 phụ thuộc `equipment-skill-data-system.md` AC-14 không
   đổi** (owner: `qa-lead`, target: theo dõi lần review kế tiếp của
   GDD đó) — rủi ro doc-drift nếu AC-14 bên đó được sửa mà không
   cascade về đây.

6. **`/ux-design` cho O-Customize chưa chạy** (owner: `ux-designer`,
   target: sau khi GDD này Approved) — UI Requirements ở mục trên chỉ
   ở mức GDD (bố cục/nguyên tắc), chưa có wireframe/copy/interaction
   map chi tiết.
