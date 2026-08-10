# Systems Index: Vô Danh Lục

> **Status**: Draft
> **Created**: 2026-08-01
> **Last Updated**: 2026-08-04
> **Source Concept**: design/gdd/game-concept.md

---

## Overview

Vô Danh Lục là một RPG tu tiên tường thuật bằng văn bản, theo lượt, dựa trên
**Khế Ước Cơ Học/Tường Thuật**: mọi kết quả cơ học (chiến đấu, EXP, Hảo cảm,
cái chết) phải được hệ thống tính toán và khóa TRƯỚC khi AI được phép tường
thuật nó thành văn xuôi. Điều này tạo ra hai lớp song song xuyên suốt toàn bộ
hệ thống bên dưới: các hệ thống sở hữu trạng thái (logic thuần) và một tầng
tường thuật AI render kết quả đã khóa của chúng thành văn bản sống động
(Pillar 4). Toàn bộ phục vụ Core Fantasy — một kẻ vô danh tu luyện trong một
thế giới khách quan công bằng, hệ quả vĩnh viễn (Pillar 1-3), với một khoảng
mở cho tự do nhập vai (Pillar 5) mà kiến trúc nền tảng (Khế Ước một chiều) đã
được kiểm chứng kỹ thuật qua concept prototype (`prototypes/khe-uoc-ai-concept/`,
verdict PROCEED).

---

## Systems Enumeration

| # | System Name | Category | Priority | Status | Design Doc | Depends On |
|---|-------------|----------|----------|--------|------------|------------|
| 1 | Turn Manager / Core Game Loop (inferred) | Core | MVP | Approved | [turn-manager.md](turn-manager.md) | — |
| 2 | Mechanic/Narration Contract Enforcement (inferred) | Core | MVP | Approved | [mechanic-narration-contract-enforcement.md](mechanic-narration-contract-enforcement.md) | — |
| 3 | Equipment & Skill Data System (inferred) | Gameplay | MVP | Approved | [equipment-skill-data-system.md](equipment-skill-data-system.md) | — |
| 4 | AI/LLM Integration Layer | Core | MVP | Designed | [ai-llm-integration-layer.md](ai-llm-integration-layer.md) | Mechanic/Narration Contract Enforcement |
| 5 | World Memory & Context Management (inferred) | Core | MVP | Designed | [world-memory-context-management.md](world-memory-context-management.md) | Turn Manager |
| 6 | Persistence / Save System | Persistence | MVP | Designed | [persistence-save-system.md](persistence-save-system.md) | Turn Manager |
| 7 | Combat System | Gameplay | MVP | Designed | [combat-system.md](combat-system.md) | Equipment & Skill Data, AI Integration Layer, Turn Manager, Contract Enforcement |
| 8 | EXP & Realm Progression | Progression | MVP | Designed | [exp-realm-progression.md](exp-realm-progression.md) | Combat System, Turn Manager |
| 9 | NPC Affinity & Relationship | Progression | MVP | Designed | [npc-affinity-relationship.md](npc-affinity-relationship.md) | Turn Manager, World Memory |
| 10 | Setting & Canon Integration | Narrative | MVP | Designed | [setting-canon-integration.md](setting-canon-integration.md) | World Memory |
| 11 | Situation/Encounter Generation (inferred) | Narrative | MVP | Designed | [situation-encounter-generation.md](situation-encounter-generation.md) | AI Integration Layer, Turn Manager, World Memory |
| 12 | Death & Consequence | Gameplay | MVP | Designed | [death-and-consequence.md](death-and-consequence.md) | Combat System, NPC Affinity |
| 13 | Character Continuation (inferred) | Gameplay | MVP | Approved | [character-continuation.md](character-continuation.md) | Death & Consequence |
| 14 | Character Card & Identity | UI | MVP | Designed | [character-card-identity.md](character-card-identity.md) | Equipment & Skill Data, NPC Affinity, Setting & Canon Integration |
| 15 | Core UI/Screen Navigation (inferred) | UI | MVP | Designed | [core-ui-screen-navigation.md](core-ui-screen-navigation.md) | Combat System, Character Card, Situation Generation |

---

## Categories

| Category | Description | Systems in this project |
|----------|-------------|--------------------------|
| **Core** | Foundation systems everything depends on | Turn Manager, Contract Enforcement, AI Integration Layer, World Memory |
| **Gameplay** | The systems that make the game fun | Equipment & Skill Data, Combat, Death & Consequence, Character Continuation |
| **Progression** | How the player grows over time | EXP & Realm Progression, NPC Affinity & Relationship |
| **Persistence** | Save state and continuity | Persistence / Save System |
| **UI** | Player-facing information displays | Character Card & Identity, Core UI/Screen Navigation |
| **Narrative** | Story and dialogue delivery | Setting & Canon Integration, Situation/Encounter Generation |

*(Economy và Audio bị loại bỏ — game không có currency/shop, và audio ở mức tối
thiểu chưa cần hệ thống riêng theo Technical Considerations của game-concept.md.)*

---

## Priority Tiers

Toàn bộ 15 hệ thống đều ở tier **MVP** — không có hệ thống nào hoãn sang
Vertical Slice/Alpha/Full Vision ở cấp hệ thống; chỉ có phạm vi BÊN TRONG một
số hệ thống bị cắt (xem cột "Ghi chú scope MVP" bên dưới). Quyết định này đã
được người dùng xác nhận sau khi Producer (qua `/gate-check`) cảnh báo về rủi
ro scope creep.

| System | Ghi chú scope MVP |
|---|---|
| Character Continuation | Chỉ cần 1/3 lối (Chơi lại) hoạt động đầy đủ ở MVP — Quỷ tu và Chuyển sinh hoãn sang Vertical Slice (khuyến nghị Producer, `/gate-check` 2026-08-01) |

---

## Dependency Map

### Foundation Layer (no dependencies)

1. **Turn Manager / Core Game Loop** — mọi hệ thống khác đều "cắm vào" một lượt chơi; chưa có định nghĩa tường minh nào về trình tự lượt trong game-concept.md
2. **Mechanic/Narration Contract Enforcement** — nguyên tắc kiến trúc thuần (state → khóa → AI chỉ kể), không phụ thuộc hệ thống nào khác để tồn tại như một luật

*(Phát hiện từ `/design-system` hệ #2, 2026-08-02: dù cả hai đều ở Foundation
layer, Turn Manager's Core Rule #4/#8 trên thực tế GIẢ ĐỊNH pipeline
enforcement của hệ #2 tồn tại — một phụ thuộc trong-tier chưa được liệt kê
tường minh ở bảng Systems Enumeration phía trên. Không sửa cột "Depends
On" của Turn Manager để giữ nguyên ngữ nghĩa "Foundation = 0 dependency
bên ngoài" của bảng đó; ghi nhận ở đây làm nguồn tham chiếu chính thức.)*
3. **Equipment & Skill Data System** — data model thuần cho vũ khí/kỹ năng/thức, độc lập với logic game

### Core Layer (depends on foundation)

1. **AI/LLM Integration Layer** — depends on: Mechanic/Narration Contract Enforcement (phải tuân thủ kiến trúc một chiều khi gọi AI)

*(Phát hiện từ `/design-system` hệ #4, 2026-08-02, cùng dạng với ghi chú ở
Foundation Layer phía trên: Turn Manager gọi thẳng vào AI/LLM Integration
Layer (`request_ai()`, tối đa 3 lần/lượt) — một phụ thuộc chưa được liệt
kê tường minh ở bảng Systems Enumeration (Turn Manager vẫn giữ "Depends
On: —" để đúng ngữ nghĩa "Foundation = 0 dependency bên ngoài"). Ghi nhận
ở đây làm nguồn tham chiếu chính thức, giống cách xử lý cạnh Turn Manager
→ Contract Enforcement.)*
2. **World Memory & Context Management** — depends on: Turn Manager (thời gian thế giới chỉ trôi theo lượt người chơi)

*(Phát hiện từ `/design-system` hệ #5, 2026-08-02, cùng dạng với 2 ghi chú
phía trên: Turn Manager đọc Khung ngữ cảnh AI trực tiếp từ World Memory
(chưa được liệt kê tường minh ở bảng Systems Enumeration — Turn Manager
vẫn giữ "Depends On: —"). Ghi nhận ở đây làm nguồn tham chiếu chính thức,
giống cách xử lý 2 cạnh trước.)*
3. **Persistence / Save System** — depends on: Turn Manager (cần biết trạng thái nào tồn tại sau mỗi lượt để lưu)

*(Phát hiện từ `/design-system` hệ #6, 2026-08-02, cùng dạng với 3 ghi chú
phía trên: `equipment-skill-data-system.md` (Approved) không hề nhắc đến
Persistence/Save System trong Dependencies của chính nó, dù Persistence
GDD liệt kê nó là 1 downstream hard dependency (blob chứa
`known_skill_ids`, trang bị). Ghi nhận ở đây làm nguồn tham chiếu chính
thức, giống cách xử lý 3 cạnh trước.)*

### Feature Layer (depends on core)

1. **Combat System** — depends on: Equipment & Skill Data, AI Integration Layer, Turn Manager, Contract Enforcement
2. **EXP & Realm Progression** — depends on: Combat System (nguồn EXP), Turn Manager
3. **NPC Affinity & Relationship** — depends on: Turn Manager, World Memory (lan truyền xã hội cần lịch sử)

*(Phát hiện từ `/design-system` hệ #9, 2026-08-03, cùng dạng với các ghi
chú phía trên: `npc-affinity-relationship.md` (Designed) có các phụ
thuộc chưa được liệt kê tường minh ở bảng Systems Enumeration (hàng hệ
#9 vẫn giữ "Depends On: Turn Manager, World Memory" theo phạm vi phụ
thuộc chính) — (a) **Combat System** (hard, upstream: hand-off
`outcome`/`margin_ratio` → sự kiện `combat_win/loss_vs_npc`), (b)
**Mechanic/Narration Contract Enforcement** (hard, upstream: khóa
`affinity_delta_[npc_id]` trước tường thuật), (c) Death & Consequence
(2 chiều: đọc cờ `deep_hostility_threshold=-80`, phát sự kiện
`kill_witnessed`), (d) EXP & Realm Progression (chiều ngược, đọc
`song_tu_active` — đóng Open Question interface của GDD đó), (e)
Character Card & Identity (chiều ngược, đọc Hảo cảm/dải thái độ/nút
Song Tu 5 trạng thái), (f) Persistence (chiều ngược, serialize affinity
+ tập Song Tu + streak trackers + link_strength graph), (g)
Situation/Encounter Generation (soft, provisional: phân loại sự kiện xã
hội + `entities_in_scope` làm danh sách nhân chứng — kèm RÀNG BUỘC
content-gating chống ratchet ghi ở Dependencies của GDD hệ #9). Ghi
nhận ở đây làm nguồn tham chiếu chính thức, giống cách xử lý 5 gap
trước.)*
4. **Setting & Canon Integration** — depends on: World Memory (luật tiền đề nhân quả phá vỡ cần theo dõi lịch sử)

*(Phát hiện từ `/design-system` hệ #10, 2026-08-03, cùng dạng các ghi
chú trên: `setting-canon-integration.md` (Designed) có các phụ thuộc
chưa liệt kê tường minh ở Systems Enumeration — (a) **Turn Manager** +
**Contract Enforcement** (hard, upstream), (b) **NPC Affinity &
Relationship** (hard cho premise loại affinity/song_tu), (c) Death &
Consequence (hard khi thiết kế — nguồn premise `alive`), (d) Equipment
& Skill Data (soft — premise `possesses`, cần bổ sung cờ `destroyed`),
(e) EXP & Realm Progression (chiều ngược — `breakthrough_requirement_met`,
đóng dependency HARD của hệ #8), (f) Situation/Encounter Generation (2
chiều, provisional — nhận event Due/Resolved, cung cấp phân loại
`canon_role_rescue` + `location`), (g) Character Card (chiều ngược —
hồ sơ danh tính thật/cải trang), (h) Persistence (chiều ngược —
serialize status event kể cả Suspended), (i) World Memory chiều ngược
bổ sung: hệ #10 cung cấp `canon_importance_tier` thay key chọn fact.
Ghi nhận ở đây làm nguồn tham chiếu chính thức.)*
5. **Situation/Encounter Generation** — depends on: AI Integration Layer, Turn Manager, World Memory

*(Phát hiện từ `/design-system` hệ #11, 2026-08-03, cùng dạng các ghi
chú trên: `situation-encounter-generation.md` (Designed) có các phụ
thuộc chưa liệt kê tường minh ở Systems Enumeration — (a) **Mechanic/
Narration Contract Enforcement** (hard, upstream: mọi field khóa trước
narration, `rp_only` = 0 field), (b) **NPC Affinity & Relationship**
(hard 2 chiều: cung cấp taxonomy sự kiện xã hội chuẩn hóa +
`entities_in_scope` làm nhân chứng — đóng Open Question bên đó; đọc
affinity/severity/`song_tu_active`; tôn trọng ràng buộc content-gating
chống ratchet của economy-designer qua Core Rule #5 + D.1), (c)
**Setting & Canon Integration** (hard 2 chiều: nhận event Due/Resolved
+ `canon_outcome`; cung cấp `canon_role_rescue` + `location(X)` — đóng
2 interface provisional bên đó), (d) EXP & Realm Progression (soft,
upstream: đọc `level` thô — hệ #11 sở hữu ngưỡng 20 cấp, registry
`hostile_initiative_allowed`), (e) Combat System (chiều ngược:
`combat_challenge`+`spar_friendly` khởi tạo trận, `encounter_level_range`
sinh level đối thủ ambient), (f) Death & Consequence (2 chiều,
provisional), (g) Persistence (chiều ngược: serialize scene + tracker
trong `turn_snapshot`), (h) Character Card (chiều ngược, đọc location),
(i) Core UI (chiều ngược: chip intent + header cảnh — đã có UX Flag).
Ghi nhận ở đây làm nguồn tham chiếu chính thức, gap thứ 10 cùng
pattern.)*
6. **Death & Consequence** — depends on: Combat System (kích hoạt "phải chết"), NPC Affinity (ngưỡng thù địch sâu sắc -100→-80)
7. **Character Continuation** — depends on: Death & Consequence (chỉ kích hoạt khi cái chết thật xảy ra)

*(Phát hiện từ `/design-system` hệ #8, 2026-08-03, cùng dạng với các ghi
chú phía trên: `exp-realm-progression.md` (Designed) có 5 dependency chưa
được liệt kê tường minh ở bảng Systems Enumeration (hàng của hệ #8 vẫn giữ
"Depends On: Combat System, Turn Manager" để đúng phạm vi phụ thuộc cứng
chính) — (a) NPC Affinity & Relationship (soft, trạng thái Song Tu active
cho nguồn EXP), (b) Death & Consequence (soft, cờ "phế đan điền" chặn tích
lũy EXP), (c) Setting & Canon Integration (**hard** cho việc đột phá bậc —
dữ liệu `breakthrough_requirement` cụ thể theo bối cảnh), (d) Character
Card & Identity (chiều ngược, đọc `level`/`tier` để hiển thị), (e)
Situation/Encounter Generation (chiều ngược, đọc `level` cho ngưỡng 20
cấp). Ghi nhận ở đây làm nguồn tham chiếu chính thức, giống cách xử lý 4
gap trước.)*

*(Phát hiện từ `/design-system` hệ #12, 2026-08-03, cùng dạng các ghi
chú trên: `death-and-consequence.md` (Designed) có 6 dependency chưa
liệt kê tường minh ở Systems Enumeration (hàng hệ #12 vẫn giữ "Depends
On: Combat System, NPC Affinity" theo phạm vi phụ thuộc cứng chính) —
(a) **Turn Manager** (hard 2 chiều: đọc `current_turn`/
`suggested_action_count`, cung cấp `is_death_turn` cho
`undo_availability_window`), (b) **Setting & Canon Integration** (hard,
chiều ngược: cung cấp `alive(X)`/`death_flag_[char_id]` — đóng interface
provisional bên đó), (c) EXP & Realm Progression (soft, chiều ngược:
cung cấp `death_and_consequence_blocked(self)`, đúng tên provisional GDD
đó đã dùng), (d) Situation/Encounter Generation (hard 2 chiều: phát
thông tin chết để dọn presence/`provoked_flag`, nhận witness list
`entities_in_scope` cho `kill_witnessed`), (e) Character Continuation
(hard, chiều ngược, chưa thiết kế — nhận hand-off `death_confirmed`),
(f) Equipment & Skill Data System (soft — đọc field `efficacy` trên
item cho `recovery_attempt`, field này CHƯA tồn tại trên schema, xem
Open Questions GDD đó). Ghi nhận ở đây làm nguồn tham chiếu chính thức,
gap thứ 11 cùng pattern.)*

*(Phát hiện từ `/design-system` hệ #13, 2026-08-03, cùng dạng các ghi
chú trên: `character-continuation.md` (Designed) có 6 dependency chưa
liệt kê tường minh ở Systems Enumeration (hàng hệ #13 vẫn giữ "Depends
On: Death & Consequence" theo phạm vi phụ thuộc cứng chính) — (a) **Turn
Manager** (hard 2 chiều: đọc `is_death_turn`, cung cấp quyền điều khiển
trở lại "Awaiting Action" ở slot mới), (b) **Persistence/Save System**
(hard — TRIGGER thật của "Khóa slot"/"Tạo slot mới", sửa lại điểm quy
thuộc sai trước đây gán cho Death & Consequence), (c) Setting & Canon
Integration (soft — reset event states cho playthrough mới), (d) NPC
Affinity & Relationship (soft — reset Hảo cảm mọi NPC), (e) EXP & Realm
Progression (soft — khởi tạo `level=1`/`EXP=0`), (f) Equipment & Skill
Data System (soft — khởi tạo loadout khởi điểm), (g) Character Card &
Identity (chiều ngược, chưa thiết kế — hiển thị màn hình 3 lối). Ghi
nhận ở đây làm nguồn tham chiếu chính thức, gap thứ 12 cùng pattern.)*

### Presentation Layer (depends on features)

1. **Character Card & Identity** — depends on: Equipment & Skill Data, NPC Affinity, Setting & Canon Integration (quy tắc cải trang/xuyên không)

*(Phát hiện từ `/design-system` hệ #14, 2026-08-04, cùng dạng các ghi
chú trên: `character-card-identity.md` (Designed) có các phụ thuộc chưa
liệt kê tường minh ở Systems Enumeration (hàng hệ #14 giữ "Depends On:
Equipment & Skill Data, NPC Affinity, Setting & Canon Integration" theo
phạm vi phụ thuộc cứng chính) — (a) **Turn Manager** (hard 2 chiều: nút
Song Tu/Hồi phục gửi action qua đường chuẩn, đọc trạng thái khóa input +
undo cho `card_exists` D.1), (b) **World Memory** (hard: entity record là
nguồn `card_exists` + storage instance hồ sơ/`base_X0`/`npc_tag`/
`concealment`), (c) **Combat System** (hard 2 chiều: đọc
`combat_power_estimate`/khối giao đấu; cung cấp `base_X(C)` thật cho D.1
Combat), (d) **Death & Consequence** (hard 2 chiều: đọc `alive`/
`blocked`/`pending_fate`; cung cấp schema `npc_tag.medium_override` —
đóng Open Question bên đó), (e) **EXP & Realm Progression** (hard 2
chiều: đọc `level`/`tier`/`stat_growth`/`exp_threshold`; cung cấp
`base_X0` — đóng ownership hand-off bên đó), (f) **Character
Continuation** (hard: render màn hình 3 lối), (g) **Mechanic/Narration
Contract Enforcement** (hard: Card là bề mặt số liệu hợp lệ duy nhất —
mặt ngược Core Rule #4 bên đó), (h) Situation Gen (soft: `location`;
nhận bàn giao Open Question cơ chế điều tra lộ `concealment`). Ghi nhận
ở đây làm nguồn tham chiếu chính thức, gap thứ 13 cùng pattern.)*
2. **Core UI/Screen Navigation** — depends on: Combat System, Character Card, Situation/Encounter Generation

*(Phát hiện từ `/design-system` hệ #15, 2026-08-04, cùng dạng các ghi
chú trên: `core-ui-screen-navigation.md` (Designed) có các phụ thuộc
chưa liệt kê tường minh ở Systems Enumeration (hàng hệ #15 giữ "Depends
On: Combat System, Character Card, Situation Generation" theo phạm vi
phụ thuộc cứng chính) — (a) **Turn Manager** (hard 2 chiều: đọc
`tm_state`/`undo_available` cho D.1/D.2, gửi action/Undo qua đường
chuẩn), (b) **Mechanic/Narration Contract Enforcement** (hard: hệ #15
là mặt thực thi hiển thị của Core Rule #4 bên đó), (c) **World Memory**
(hard: API phân trang `(anchor_turn_id, count, direction)` cho Story
Log — interface yêu cầu mới, xem Open Question #7 GDD hệ #15), (d)
**Combat System** (hard, ràng buộc kiến trúc: Combat không bao giờ tự
kích hoạt chuyển màn hình — bên đó chỉ mô tả bằng văn UI Requirements,
chưa có row Dependencies), (e) **Character Continuation** (hard: đọc
`continuation_choice_eligible` kích takeover màn 3 lối + cờ
`reset_in_progress` — cờ này GDD #13 chưa định nghĩa tường minh, xem
Open Question #8 GDD hệ #15). Gap thứ 14 cùng pattern. Hệ #15 cũng
ĐÓNG 3 interface chiều ngược đã khai sẵn: #6 Persistence (row soft),
#11 Situation Gen (row downstream), #14 Character Card (Hard
provisional). Ghi nhận ở đây làm nguồn tham chiếu chính thức.)*

*(Cập nhật 2026-08-04, sau 5 vòng `/design-review` cùng phiên trên
`core-ui-screen-navigation.md`: (1) **Ghi chú trên đã LỖI THỜI ở 2 điểm**
— Open Question #7 (interface `get_turn_page` World Memory) và Open
Question #8 (cờ `reset_in_progress`/#13) đều đã **ĐÓNG** ngay từ vòng 1
revision cùng phiên (không phải gap còn treo); GDD #15 hiện ghi
"reset_in_progress ≡ state='Processing Chơi Lại' của #13", không định
nghĩa cờ song song. (2) **Phụ thuộc số MỚI phát hiện vòng 4-5** (chưa
từng khai trước đó): #15 phụ thuộc **Combat System (#7)** không chỉ ở
ràng buộc kiến trúc "không tự chuyển màn hình" (đã khai) mà còn ở mức
**invariant liên-GDD tường minh** — `live_window_turns` (#15, D.3b,
mặc định 30) PHẢI `≥ CONTENT_EXCHANGE_ESTIMATE` (#7, mặc định 30, dải
15–50). Đây là phụ thuộc HARD mới, cần route sang `technical-director`
khi `/create-architecture` đăng ký cả 2 hằng số vào registry cùng lúc
(tương tự cảnh báo đã có cho `card_transition_ms`/#14). (3) **Trạng
thái review**: 5 vòng `/design-review` hoàn tất cùng phiên (2026-08-04)
— verdict NEEDS REVISION mỗi vòng (10→7→6→9→14 blocking), nhưng kiến
trúc khái niệm (mô hình 3 tầng, D.1-D.6) chưa từng bị đánh đổ ở bất kỳ
vòng nào. GDD hiện ở trạng thái "Designed — Revised, chờ re-review
(vòng 6)" — Status ở bảng Systems Enumeration GIỮ NGUYÊN "Designed"
(chưa Approved). Creative-director khuyến nghị vòng 6 dùng chiến lược
3 nhịp (vệ sinh cấu trúc → sửa → prototype throwaway D.3b) thay vì tiếp
tục review-thuần-văn-bản — xem chi tiết
`design/gdd/reviews/core-ui-screen-navigation-review-log.md`.)*

### Polish Layer (depends on everything)

*(Chưa có hệ thống nào ở layer này trong scope hiện tại — tutorial/accessibility/analytics chưa được đề cập trong game-concept.md)*

---

## Recommended Design Order

| Order | System | Priority | Layer | Agent(s) | Est. Effort |
|-------|--------|----------|-------|----------|-------------|
| 1 | Turn Manager / Core Game Loop | MVP | Foundation | systems-designer | S |
| 2 | Mechanic/Narration Contract Enforcement | MVP | Foundation | systems-designer, godot-specialist | M |
| 3 | Equipment & Skill Data System | MVP | Foundation | systems-designer, game-designer | M |
| 4 | AI/LLM Integration Layer | MVP | Core | godot-specialist, systems-designer | M |
| 5 | World Memory & Context Management | MVP | Core | systems-designer, technical-director (context) | L |
| 6 | Persistence / Save System | MVP | Core | godot-specialist | M |
| 7 | Combat System | MVP | Feature | systems-designer, game-designer | L |
| 8 | EXP & Realm Progression | MVP | Feature | systems-designer, economy-designer | M |
| 9 | NPC Affinity & Relationship | MVP | Feature | systems-designer, economy-designer | L |
| 10 | Setting & Canon Integration | MVP | Feature | narrative-director, game-designer | L |
| 11 | Situation/Encounter Generation | MVP | Feature | narrative-director, systems-designer | M |
| 12 | Death & Consequence | MVP | Feature | game-designer, systems-designer | M |
| 13 | Character Continuation | MVP | Feature | narrative-director, game-designer | S |
| 14 | Character Card & Identity | MVP | Presentation | ux-designer, game-designer | M |
| 15 | Core UI/Screen Navigation | MVP | Presentation | ux-designer, ui-programmer | M |

*(S = 1 phiên thiết kế, M = 2-3 phiên, L = 4+ phiên.)*

---

## Circular Dependencies

- Không phát hiện. Một vòng lặp tiềm ẩn giữa Death & Consequence ↔ Character
  Continuation đã được giải quyết bằng cách xác định rõ chiều phụ thuộc: Death
  & Consequence kích hoạt Character Continuation (không ngược lại) — Character
  Continuation chỉ là một nhánh xử lý được gọi SAU KHI cái chết thật xảy ra.

---

## High-Risk Systems

| System | Risk Type | Risk Description | Mitigation |
|--------|-----------|-------------------|------------|
| World Memory & Context Management | Technical | "Nhật ký thế giới vô hạn" xung đột trực tiếp với giới hạn context window của LLM — cảnh báo từ technical-director tại `/gate-check` 2026-08-01 | Đặc tả chiến lược nén/rotate NGAY trong GDD, không hoãn; cần ADR riêng trước `/create-architecture` |
| Setting & Canon Integration | Design | ~~Luật "tiền đề nhân quả cố định vs. có thể phá vỡ" chỉ có 1 ví dụ, chưa có rubric tổng quát~~ — **đã giải quyết 2026-08-03** tại `/design-system` hệ #10: rubric tổng quát hóa (Core Rule #4/#4b — mọi event phá được qua premise cơ học, on_break substitute/vanish/branch, người chơi cứu được sự kiện bị phá lõi qua state Suspended); phán quyết 100% rule-based, 0 AI call | Còn lại: playtest rubric với ≥2–3 tình huống canon (Open Questions, target vertical slice) + authoring 2–3 event MVP thật |
| NPC Affinity & Relationship | Design | ~~Chưa có tốc độ tăng/giảm/suy giảm Hảo cảm, rủi ro clamp qua chuỗi lan truyền~~ — **đã giải quyết 2026-08-03** tại `/design-system` hệ #9: bảng sự kiện D.1 + diminishing/fatigue/cap (D.2–D.4, quyết định KHÔNG decay), lan truyền one-hop + clamp độc lập per-NPC loại bỏ cấu trúc rủi ro clamp dây chuyền (D.5), property-based AC-11 kiểm 1.000 tổ hợp | Còn lại: kiểm chứng pacing thật ở Vertical Slice (NPC bắt đầu từ Hảo cảm = 0) + ràng buộc content-gating chống ratchet lên Situation Gen (ghi ở Dependencies GDD hệ #9) |
| Combat System | Design | Rủi ro biên công thức (0/0 khi 2 bên đều 0 điểm, floor khi chồng phạt vượt bậc + áp chế cảnh giới) — đã flag từ `/design-review`, MỘT PHẦN đã kiểm chứng qua prototype (thức/nhịp trận) | Dùng nguyên bộ test case biên trong review log làm Acceptance Criteria của GDD |
| AI/LLM Integration Layer | Technical | Backend AI/LLM chưa chốt; ToS Gemini cho nội dung NSFW (Pillar 5) chưa xác minh | Resolve qua ADR trước `/create-architecture`; kiến trúc pattern (one-way lock, safetySettings) đã kiểm chứng khả thi qua prototype — chỉ còn vấn đề pháp lý/nhà cung cấp |

---

## Progress Tracker

| Metric | Count |
|--------|-------|
| Total systems identified | 15 |
| Design docs started | 15 |
| Design docs reviewed | 3 |
| Design docs approved | 3 |
| MVP systems designed | 15/15 |
| Vertical Slice systems designed | 0/0 |

---

## Next Steps

- [x] Review and approve this systems enumeration
- [ ] Design MVP-tier systems first (use `/design-system [system-name]`), theo đúng Recommended Design Order ở trên
- [ ] Run `/design-review` on each completed GDD
- [ ] Run `/gate-check pre-production` when MVP systems are designed
- [ ] Validate the highest-risk systems (World Memory context management, Combat formula boundaries) with focused spikes before committing to full implementation
