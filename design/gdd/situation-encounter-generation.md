# Situation/Encounter Generation

> **Status**: Designed — Pending Review
> **Author**: user + agents
> **Last Updated**: 2026-08-03
> **Implements Pillar**: Pillar 1 (Thế Giới Khách Quan — scheduler khách quan, ngưỡng 20 cấp), Pillar 2 (Hệ Quả Thực Sự — cảnh mọc từ lịch sử), Pillar 5 (Tự Do Nhập Vai — văn tự do + intent chip)
> *(CD-GDD-ALIGN skipped — Lean mode. Review độc lập qua `/design-review` ở phiên mới.)*

## Overview

Situation/Encounter Generation là "đạo diễn hiện trường" của Vô Danh Lục:
ở mỗi lượt chơi, hệ này quyết định **tình huống hiện tại** — cảnh diễn ra
ở đâu (`location`), những NPC nào có mặt (`entities_in_scope`), và mầm
kịch tính nào đang mở (cơ hội, xung đột, sự kiện canon đến hạn) — rồi
giao cấu trúc cảnh đã khóa đó làm nguyên liệu cho lệnh gọi AI của Turn
Manager (sinh 4 gợi ý hành động, tường thuật). Ở chiều ngược lại, khi
người chơi hành động — đặc biệt là hành động nhập tự do — hệ này **phân
loại** hành động thành sự kiện cơ học đã chuẩn hóa (taxonomy sự kiện xã
hội cho NPC Affinity, `canon_role_rescue` cho Setting & Canon, kích hoạt
Combat...) để đúng hệ sở hữu tính toán và khóa kết quả TRƯỚC khi AI tường
thuật, theo Khế Ước Cơ Học/Tường Thuật. Hệ này cũng sở hữu logic "ai được
phép chủ động gây sự" (ngưỡng chênh lệch 20 cấp đọc `level` từ EXP & Realm
Progression) và điều tiết nhịp nội dung (không bày sẵn cơ hội tăng Hảo cảm
on-demand mọi lượt — ràng buộc chống ratchet). Với người chơi, đây là hệ
khiến thế giới có vẻ đang sống: tình huống kế tiếp không rơi từ trên trời
xuống mà mọc ra từ chính lịch sử lựa chọn của họ — thiếu nó, game chỉ còn
là chuỗi lệnh gọi AI rời rạc không nhịp, không hiện trường, không nhân
chứng.

*(Hệ này KHÔNG sở hữu kết quả cơ học nào ngoài cấu trúc cảnh — location,
danh sách NPC có mặt, phân loại sự kiện. Mọi con số — delta Hảo cảm, EXP,
HP — vẫn thuộc hệ chuyên trách tương ứng.)*

## Player Fantasy

Cảm giác đích: **"thế giới không chờ tôi, nhưng luôn nhớ tôi."** Mỗi đầu
lượt, tình huống mở ra như thể thế giới vẫn đang tự vận hành — NPC có mặt
ở nơi họ *có lý do* để có mặt, sự kiện nguyên tác đến hạn thì cứ diễn ra
dù người chơi ở đâu — và những gì người chơi từng làm quyết định họ đang
đứng giữa hiện trường nào: kẻ họ sỉ nhục tháng trước nay dẫn người chặn
đường, vị sư tỷ được cứu mạng xuất hiện đúng lúc cần một lời bảo lãnh.
Người chơi không bao giờ được cảm thấy tình huống là một "quest" bày sẵn
cho nhân vật chính (Anti-Pillar: không hào quang chính chủ) — họ phải cảm
thấy mình đang **len vào** một thế giới bận rộn có nhịp riêng, và từng
bước chen chân đó do chính họ viết nên (Pillar 1: Thế Giới Khách Quan;
Pillar 2: Hệ Quả Thực Sự).

Ba khoảnh khắc neo cảm xúc:

1. **Khoảnh khắc nhận ra dấu vết của mình** (Discovery, ưu tiên 1 trong
   MDA): một tình huống mới nhắc lại — bằng hệ quả, không phải bằng lời
   kể lể — một lựa chọn cũ. "À, chuyện này xảy ra vì MÌNH."
2. **Khoảnh khắc an toàn có luật** (Challenge): cao thủ vượt quá 20 cấp
   đứng ngay đó nhưng không thèm để mắt — "mây tầng nào gặp gió tầng
   nấy". Nguy hiểm trong thế giới này ĐỌC ĐƯỢC, không phải ngẫu nhiên; và
   vì đọc được, khi người chơi *chủ động* khiêu khích kẻ mạnh hơn, cảm
   giác rủi ro là thật và tự chuốc.
3. **Khoảnh khắc "nó hiểu ý tôi"** (Expression / Pillar 5): gõ một hành
   động tự do không nằm trong 4 gợi ý — kể cả một ý đồ lắt léo như đề cử
   người thế vai một sự kiện nguyên tác đã đổ vỡ — và thế giới phản hồi
   đúng tầng cơ học, không chỉ bằng văn vẻ.

Phản-cảm-giác cần tránh: (a) cảm giác "máy bán quest" — mỗi lượt đều bày
sẵn cơ hội tặng quà/lấy lòng là phá vỡ ngay ảo giác thế giới khách quan
(đây chính là lý do tồn tại của ràng buộc chống ratchet); (b) cảm giác
"sân khấu quay quanh mình" — NPC xuất hiện vô cớ chỉ để phục vụ drama của
người chơi.

## Detailed Design

### Core Rules

1. **Cảnh (Scene) là trạng thái cơ học do hệ này sở hữu.** `scene =
   {location_id, entities_in_scope, scene_tags, active_hook}`.
   `entities_in_scope` = các NPC có mặt + `"global"`, tối đa
   `MAX_NPC_PER_SCENE = 3` NPC — để `|entities_in_scope| ≤
   max_entities_per_prompt = 4` (registry, World Memory) luôn đúng theo
   cấu trúc. `scene_tags` là tập cờ bối cảnh chuẩn hóa
   (`private`/`public`, `dangerous`, `faction_[id]`...) do data +
   scheduler đặt, dùng làm input gating (Rule #5) và premise. Cảnh được
   KHÓA trước mọi lệnh gọi AI trong lượt — AI chỉ nhận cảnh để viết,
   không bao giờ quyết định cảnh.
2. **Vòng đời trong lượt.** Sau khi lượt N xác nhận (và không undo):
   scheduler cập nhật cảnh cho lượt N+1 → khóa cảnh → tính
   `allowed_envelope_menu` → Turn Manager gọi `suggestion_call` (ngữ
   cảnh = cảnh đã khóa + Khung ngữ cảnh AI của World Memory). Khi người
   chơi hành động: hệ này resolve envelope → phát sự kiện đã phân loại
   cho đúng hệ sở hữu, theo thứ tự lượt đã chốt (Combat/Death → NPC
   Affinity → Canon → EXP — khớp `resolve_turn_canon` chạy TRƯỚC
   `resolve_turn_exp`). Hệ này KHÔNG tự tính bất kỳ delta/kết quả nào.
3. **Envelope chuẩn hóa + menu whitelist.** `envelope = {envelope_type,
   target?, params?}`. Danh mục `envelope_type` (chuẩn hóa taxonomy mà
   NPC Affinity chờ): `gift`, `small_help`, `save_life`, `insult`,
   `threaten`, `betray`, `combat_challenge` (kèm cờ `spar_friendly` —
   đóng Open Question của GDD #9), `song_tu_action`,
   `canon_role_rescue(event_id, char_id)`, `move_to(location_id)`,
   `investigate`, `rp_only` (mặc định). Mỗi lượt hệ này tính
   `allowed_envelope_menu(turn)` **deterministic** từ cảnh + gating;
   prompt `suggestion_call` chỉ liệt kê menu đó; nhãn AI trả về NGOÀI
   menu → hạ cứng xuống `rp_only` (validate một chiều, không tốn retry —
   retry chỉ theo luật <4/trùng của Turn Manager).
4. **Văn tự do phân loại DUY NHẤT bằng ý định người chơi khai báo.** Ô
   nhập tự do có bộ chip intent (chỉ hiện chip nằm trong menu lượt đó;
   mặc định `rp_only`). Không chip → `rp_only`: AI tường thuật nhưng
   KHÔNG được khẳng định hệ quả cơ học nào (ràng buộc ghi trong prompt +
   hậu kiểm leak của Contract Enforcement). Một heuristic từ khóa phía
   client CHỈ được gợi ý bật chip trước khi gửi (nudge UI), không bao
   giờ tự phân loại — giữ 100% deterministic. **Chip phản chiếu đúng
   mục menu** (fix gap qa-lead 2026-08-03): envelope gắn NPC hiển thị
   chip theo cặp (loại, NPC) — VD 2 NPC present thì có chip "Tặng quà
   [NPC A]" và "Tặng quà [NPC B]" riêng — không cần target selector
   riêng, target nằm ngay trong chip.
5. **Gating chống ratchet (ràng buộc bắt buộc từ economy-designer, GDD
   #9).** (a) Envelope tích cực (`gift`, `small_help`) chỉ vào menu khi
   có hook thật (NPC có mặt + bối cảnh phù hợp) VÀ hết cooldown
   `POSITIVE_SOCIAL_COOLDOWN_TURNS` per (loại, NPC) — áp cho CẢ chip lẫn
   gợi ý AI; (b) `song_tu_action` chỉ vào menu khi `scene_tags` chứa
   `private` VÀ NPC sẵn lòng (affinity ≥ `song_tu_threshold=60` hoặc
   quan hệ đã active — đọc từ NPC Affinity); (c) gate áp lên TÍNH SẴN CÓ
   (menu/chip), không đụng vào delta — giảm dần/fatigue vẫn thuộc
   D.2/D.3 của GDD #9.
6. **Scheduler encounter deterministic — ưu tiên cứng:** (1) **Canon
   Due** (payload từ `resolve_turn_canon` lượt trước) → cảnh lượt kế
   phải dựng theo sự kiện đó; (2) **NPC chủ động**: NPC được phép chủ
   động mang địch ý CHỈ KHI `level(npc) − level(player) ≤ 20` (đọc
   `level` thô từ EXP — hệ này sở hữu logic ngưỡng, đúng AC-17 của GDD
   #8) HOẶC cờ `provoked_[npc_id]=true` (bị khiêu khích nghiêm trọng —
   sự kiện severity cao nhắm vào NPC đó, định nghĩa ở Formulas); NPC
   trung lập/hảo cảm chủ động thân thiện không bị giới hạn gap;
   NPC-initiated có cooldown riêng; (3) **Ambient**: không có gì bắt
   buộc → cảnh tiếp diễn tự do. Mỗi lượt chỉ 1 hook chính.
7. **Di chuyển & vị trí.** Setting pack khai đồ thị location (danh sách
   + cạnh kề). `move_to` chỉ hợp lệ tới location kề. Hệ này sở hữu
   `location(X)` cho người chơi VÀ NPC (bảng presence data-driven,
   scheduler cập nhật khi hook yêu cầu) — cung cấp predicate
   `at_location` mà Setting & Canon chờ (đóng Open Question bên đó).
8. **Tuân thủ Turn Manager Core Rule #8 + Khế Ước.** Mọi thay đổi trạng
   thái của hệ này (location, presence, cooldown, `provoked_*`, trạng
   thái hook) chỉ "final" khi lượt xác nhận và không undo; Undo khôi
   phục nguyên cảnh + menu tính lại deterministic từ cảnh khôi phục (gợi
   ý AI thì sinh mới theo TM Rule #5). Các field hệ này khóa vào
   `locked_result`: `location_change_player` (entity `global`),
   `encounter_initiated_[npc_id]` (entity `[npc_id]`),
   `classified_event_[npc_id]` — theo đúng quy ước entity_id của World
   Memory.

### States and Transitions

| State | Mô tả | Chuyển sang |
|---|---|---|
| Scene Pending Update | Lượt trước vừa confirmed / game start / load / vừa undo — scheduler chạy: tiêu thụ canon Due, xét NPC initiative, cập nhật presence/cooldown | → Scene Locked (scheduler xong — trong cùng frame xử lý, không có input người chơi ở giữa) |
| Scene Locked | Cảnh bất biến trong lượt; `allowed_envelope_menu` đã tính; TM gọi suggestion_call | → Awaiting Player Action |
| Awaiting Player Action | Chip hiển thị theo menu; chờ người chơi (trùng nhịp TM Awaiting Action) | → Classifying (khi submit) |
| Classifying | Resolve envelope (deterministic, tức thời, 0 AI call) → dispatch sự kiện cho các hệ sở hữu theo thứ tự lượt | → Dispatched |
| Dispatched | Kết quả các hệ đã khóa, TM tường thuật + xác nhận lượt | → Scene Pending Update (confirmed → commit staging; HOẶC undo → rollback staging rồi cũng về Scene Pending Update với cảnh khôi phục) |

### Interactions with Other Systems

| Hệ | Chiều | Dữ liệu vào/ra |
|---|---|---|
| Turn Manager | upstream hard | TM trigger scene update sau confirm; hệ này trả cảnh đã khóa + classified_event; nằm trọn trong `calls_per_turn ≤ 3` (0 call riêng) |
| AI/LLM Integration Layer | upstream hard | Payload `suggestion_call` = cảnh + menu; **cần mở schema từ array[4] string → array[4] {text, envelope}** (sửa nhỏ GDD đó — xem Open Questions) |
| World Memory | upstream hard | Hệ này CUNG CẤP `entities_in_scope` (trách nhiệm đã khai bên đó); truy vấn fact theo entity_id khi dựng hook; ghi field đúng quy ước entity_id |
| NPC Affinity (#9) | downstream | Cung cấp sự kiện xã hội đã phân loại + danh sách nhân chứng = `entities_in_scope`; tôn trọng content-gating (Rule #5); ĐỌC affinity/dải thái độ + `song_tu_active` cho gating & NPC initiative |
| Setting & Canon (#10) | 2 chiều hard | NHẬN event Due/Resolved + `canon_outcome` → dựng cảnh; CUNG CẤP `canon_role_rescue` + `location(X)` (đóng 2 interface provisional bên đó) |
| EXP (#8) | upstream soft | Đọc `level` thô cho ngưỡng 20 cấp (hệ này sở hữu logic ngưỡng) |
| Combat (#7) | downstream | `combat_challenge(target, spar_friendly)` khởi tạo trận; cảnh cung cấp đối thủ/nhân chứng |
| Death & Consequence (#12, chưa thiết kế) | 2 chiều provisional | Nhận thông tin chết để cập nhật presence/cảnh; witness list cho `kill_witnessed` |
| Contract Enforcement (#2) | upstream hard | Mọi field của hệ này khóa trước narration; `rp_only` = không field nào được ghi |
| Persistence (#6) | downstream (chiều ngược) | Serialize: scene, presence, cooldowns, `provoked_*`, trạng thái hook — trong `turn_snapshot` |
| Core UI (#15, chưa thiết kế) | downstream | Render chip intent theo menu; header cảnh (location) |

## Formulas

*(Đề xuất bởi `systems-designer` 2026-08-03, duyệt cùng ngày. Toàn bộ
deterministic, 0 AI call — Turn Manager Core Rule #8 áp dụng cho mọi
state hệ này ghi ra: cooldown tracker, `provoked_*`,
`npc_last_initiated`, không "final" cho đến khi lượt xác nhận và không
undo. Mọi hằng số đọc từ hệ khác (registry: `song_tu_threshold=60`,
`deep_hostility_threshold=-80`, `max_entities_per_prompt=4`,
`tier_from_level`) được TRA CỨU, không định nghĩa lại.)*

**Quy ước chung:**
- `turn` = lượt hiện tại đang ở state Scene Pending Update (đầu lượt,
  trước khi khóa cảnh).
- `scene` = `{location_id, entities_in_scope, scene_tags, active_hook}`
  (Core Rule #1).
- `present(npc, scene) = npc ∈ entities_in_scope(scene)` — presence là
  bảng data-driven hệ này sở hữu (Core Rule #7), KHÔNG suy từ affinity.
- `level(C)` đọc thô từ EXP & Realm Progression; hệ này KHÔNG cache —
  luôn đọc giá trị đầu lượt hiện tại.
- `ENVELOPE_TYPES = {gift, small_help, save_life, insult, threaten,
  betray, combat_challenge, song_tu_action, canon_role_rescue, move_to,
  investigate, rp_only}` (Core Rule #3).
- Mọi bảng tracker (`cooldown`, `provoked_*`, `npc_last_initiated`) là
  state runtime của hệ này, serialize trong `turn_snapshot`
  (Persistence), rollback toàn bộ khi undo.

### D.1 — allowed_envelope_menu(turn)

Công thức `allowed_envelope_menu` được định nghĩa như sau:

`allowed_envelope_menu(turn) = { t ∈ ENVELOPE_TYPES : gate(t, turn, npc?) = true }`

...trong đó `gate` là predicate riêng theo từng `envelope_type` (envelope
không gắn `npc` cụ thể — `move_to`, `investigate`, `rp_only`,
`canon_role_rescue` — menu chỉ ghi loại đó 1 lần; envelope gắn NPC ghi 1
mục/NPC hợp lệ):

| `envelope_type` | `gate(t, turn, npc)` |
|---|---|
| `gift` | `present(npc, scene) AND "dangerous" ∉ scene_tags AND cooldown_elapsed(gift, npc, turn)` |
| `small_help` | `present(npc, scene) AND "dangerous" ∉ scene_tags AND cooldown_elapsed(small_help, npc, turn)` |
| `save_life` | `present(npc, scene) AND active_hook.type == "npc_in_danger" AND npc == active_hook.at_risk_npc` |
| `insult` | `present(npc, scene)` |
| `threaten` | `present(npc, scene)` |
| `betray` | `present(npc, scene)` |
| `combat_challenge` | `present(npc, scene) AND alive(npc)` (cờ `spar_friendly` là tham số của envelope, không ảnh hưởng gate) |
| `song_tu_action` | `"private" ∈ scene_tags AND (affinity(npc) ≥ song_tu_threshold OR npc ∈ active_song_tu_set)` |
| `canon_role_rescue` | `∃ E ∈ canon_events : status(E) == Suspended` (`char_id` đề cử đến từ văn tự do + chip, không từ menu liệt kê sẵn) |
| `move_to` | `\|adjacent(location_id)\| ≥ 1` (chip hiện 1 mục/location kề) |
| `investigate` | `true` (luôn sẵn có — mặc định khám phá) |
| `rp_only` | `true` (luôn sẵn có — mặc định) |

*(Chủ đích tường minh — xác nhận 2026-08-03: các envelope tiêu cực
`insult`/`threaten`/`betray` CHỈ cần NPC present, KHÔNG có cooldown/gate
thêm — "rủi ro tự chuốc luôn sẵn có", đối xứng với việc delta âm không
bị diminish/cap ở npc-affinity-relationship.md D.2–D.4.)*

**Định nghĩa `cooldown_elapsed`:**
```
cooldown_elapsed(t, npc, turn) = (last_used(t, npc) == null)
                               OR (turn − last_used(t, npc) ≥ POSITIVE_SOCIAL_COOLDOWN_TURNS)
```
`last_used(t, npc)` cập nhật = `turn` khi envelope đó được RESOLVE
(không phải khi chỉ xuất hiện trong menu) — tracker riêng cho MỖI cặp
`(envelope_type, npc)` (đúng chữ "per (loại, NPC)" của Core Rule #5a).

**Đóng 2 điểm để ngỏ của Core Rule #5(a)** (duyệt 2026-08-03):
1. *"Bối cảnh phù hợp"* cho `gift`/`small_help` = KHÔNG ở cảnh gắn tag
   `dangerous` (NPC đang lo sinh tồn thì không nhận quà).
2. `save_life` (base_delta +15, cao nhất bảng D.1 của NPC Affinity) gate
   CHẶT HƠN: không dùng cooldown mà **hoàn toàn hook-gated** qua
   `active_hook.type == "npc_in_danger"` — không có cooldown nào đủ an
   toàn cho +15 điểm on-demand; phải có tình huống nguy hiểm thật (do
   scheduler D.4 dựng) mới mở.

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Loại envelope | `envelope_type` | enum | 12 giá trị `ENVELOPE_TYPES` | Nhãn chuẩn hóa Core Rule #3 |
| NPC mục tiêu (nếu có) | `npc` | npc_id \| null | tối đa 3 NPC MVP | Envelope không gắn NPC dùng `null` |
| Lượt gần nhất dùng | `last_used(t, npc)` | int \| null | [1, turn) | Tracker runtime riêng theo cặp `(t, npc)` |
| Cooldown dương | `POSITIVE_SOCIAL_COOLDOWN_TURNS` | int (knob) | 2–8 | Áp cho `gift`, `small_help` |
| NPC đang gặp nguy tại hook | `active_hook.at_risk_npc` | npc_id \| null | — | Chỉ set khi scheduler (D.4) dựng hook loại "npc_in_danger" |
| Kết quả | `allowed_envelope_menu` | set of (type[, npc]) | 1 → 12+ | Whitelist gửi vào `suggestion_call`; nhãn AI trả ngoài menu → hạ `rp_only` (Core Rule #3) |

**Output Range:** tập con của `ENVELOPE_TYPES × ({npc_id} ∪ {null})`,
**luôn chứa `rp_only`, `investigate`**. Kích thước tối thiểu = 1; thực
tế chặn bởi `MAX_NPC_PER_SCENE=3` × số envelope gắn NPC.

**Example:** Lượt 42, `location_id="tuu_lau"`, `entities_in_scope =
{npc_A, npc_B, "global"}`, `scene_tags = {"public"}`, `active_hook =
{type: "ambient"}`, `affinity(npc_A)=45`, `affinity(npc_B)=70` (đã
Active Song Tu), `last_used(gift, npc_A)=38` (42−38=4 ≥ 4 → hết
cooldown), không event Suspended → menu gồm `gift/small_help/insult/
threaten/betray/combat_challenge` cho cả 2 NPC, `move_to[...kề]`,
`investigate`, `rp_only`. `song_tu_action[npc_B]` bị loại dù affinity ≥
60 vì cảnh đang `public` — minh họa gate 2 điều kiện AND.

### D.2 — hostile_initiative_allowed(npc)

Công thức `hostile_initiative_allowed` được định nghĩa như sau:

`hostile_initiative_allowed(npc) = (level(npc) − level(player) ≤ HOSTILE_INITIATIVE_LEVEL_GAP_MAX) OR provoked_flag(npc)`

**Quyết định thiết kế — MỘT CHIỀU (one-sided), không phải trị tuyệt
đối** (duyệt 2026-08-03): biểu thức dùng `level(npc) − level(player)`,
KHÔNG dùng trị tuyệt đối. Rào chắn này BẢO VỆ người chơi khỏi bị NPC
mạnh hơn nhiều chủ động tìm đến ("mây tầng nào gặp gió tầng nấy"), KHÔNG
bảo vệ NPC khỏi bị người chơi mạnh hơn "bắt nạt" — NPC yếu hơn tấn công
lên là ngu nhưng hợp pháp. Với `gap < 0` biểu thức luôn `true`.

**Tương tác với thù địch sâu sắc (`deep_hostility_threshold = -80`) —
KHÔNG bypass:** `affinity ≤ -80` chỉ là TRẠNG THÁI thái độ, không tự cấp
quyền chủ động vượt gap. Chỉ `provoked_flag` (D.3 — sự kiện NGHIÊM TRỌNG
GẦN ĐÂY nhắm trực tiếp vào NPC đó) mới bypass. Một cao thủ ghét người
chơi tận xương (qua tiếng đồn/lan truyền) vẫn "không thèm để mắt" nếu
chưa bị đụng trực tiếp — nguy hiểm là CÓ THẬT (mức hậu quả khi thua trận
vẫn do ngưỡng -80 quyết định, thuộc NPC Affinity/Death & Consequence)
nhưng **đọc được** — đúng Player Fantasy #2 "an toàn có luật".

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Cấp độ NPC | `level(npc)` | int | [1, ∞) | Đọc thô từ EXP & Realm Progression |
| Cấp độ người chơi | `level(player)` | int | [1, ∞) | Đọc thô từ EXP & Realm Progression |
| Chênh lệch một chiều | `gap` | int | (−∞, ∞) | `level(npc) − level(player)`; âm = NPC yếu hơn |
| Trần chênh lệch | `HOSTILE_INITIATIVE_LEVEL_GAP_MAX` | int | **20** (LOCKED, không phải knob) | Từ game-concept.md — đổi cần re-review toàn game |
| Cờ bị khiêu khích | `provoked_flag(npc)` | bool | {0,1} | D.3 |
| Kết quả | `hostile_initiative_allowed` | bool | {0,1} | Gate cho D.4/D.5 — KHÔNG phải bản thân "NPC có muốn gây sự" (đó là attitude, D.4) |

**Output Range:** boolean.

**Example:** `level(player)=30`. NPC_X `level=48` (gap +18 ≤ 20) →
`true`. NPC_Y `level=65` (gap +35), `provoked_flag=false`,
`affinity=-90` → `false` — thù địch sâu sắc không bypass. Người chơi
`threaten` NPC_Y (severity 3) → `provoked_flag=true` → `true` bất kể
gap — "rủi ro là thật và tự chuốc". NPC_Z `level=10` (gap −20) → `true`.

### D.3 — provoked_flag(npc)

Công thức `provoked_flag` được định nghĩa như sau:

`provoked_flag(npc) = true` khi có sự kiện đã phân loại thỏa điều kiện
dưới và **chưa bị xóa**; `false` mặc định.

```
SET provoked_flag(npc) = true KHI resolve lượt có classified_event e THỎA:
    (e.target == npc AND severity(e) ≥ PROVOKE_SEVERITY_MIN)
    OR (e.type == kill_witnessed AND npc ∈ witnesses(e))

CLEAR provoked_flag(npc) = false KHI (kiểm tra ĐẦU mỗi lượt, TRƯỚC D.4):
    (flag vừa được TIÊU THỤ — lượt trước NPC này đã thành active_hook
     qua nhánh NPC-initiated HOSTILE trong khi provoked_flag=true,
     BẤT KỂ flag có phải lý do mở quyền hay không — fix gap qa-lead
     2026-08-03: NPC gap≤20 tự nhiên được chọn làm hook hostile cũng
     tiêu thụ flag)
    OR (affinity(npc) ≥ PROVOKE_RECONCILE_AFFINITY)   // hòa giải cơ học
```

`severity` tra từ bảng D.1 của `npc-affinity-relationship.md` — hệ này
KHÔNG định nghĩa lại. Với `PROVOKE_SEVERITY_MIN=3`: `threaten`(3),
`betray`(4), `combat_win_vs_npc` thắng áp đảo (nâng lên 3), chứng kiến
`kill_witnessed`(5) đủ điều kiện; `insult`(2) không đủ.

**Quyết định: KHÔNG decay theo lượt** (duyệt 2026-08-03) — bền vững tới
khi TIÊU THỤ hoặc HÒA GIẢI. Lý do: (1) nhất quán chính sách "không
decay" đã khóa ở NPC Affinity Core Rule #3 — thù hận không "tự nguôi"
khi đứng chờ thụ động, chặn exploit chờ-reset; (2) không nhân đôi khái
niệm timer ở 2 hệ cho cùng ý niệm "quên dần"; (3) flag chỉ MỞ KHÓA quyền
chủ động — NPC dùng quyền 1 lần rồi reset là hợp lý tường thuật; (4) hòa
giải cơ học (affinity leo lại ≥ `PROVOKE_RECONCILE_AFFINITY`) là lối
thoát chủ động thứ 2 — khớp "chuộc lỗi là con đường dài nhưng mở".

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Sự kiện đã phân loại | `e` | struct | — | Từ pipeline resolve của NPC Affinity, đọc cùng lượt |
| Mức nghiêm trọng | `severity(e)` | int | {0..5} | Tra bảng D.1 `npc-affinity-relationship.md` |
| Ngưỡng kích hoạt | `PROVOKE_SEVERITY_MIN` | int (knob) | 2–4 | Mặc định **3** |
| Ngưỡng hòa giải | `PROVOKE_RECONCILE_AFFINITY` | int (knob) | −20…0 | Mặc định **−10** (biên "Trung lập" dải thái độ NPC Affinity) |
| Kết quả | `provoked_flag(npc)` | bool | {0,1} | Persistent tới khi tiêu thụ hoặc hòa giải |

**Output Range:** boolean, per-NPC.

**Example:** Lượt 20, `threaten` NPC_Y (severity 3) →
`provoked_flag(NPC_Y)=true` từ lượt 21. NPC_Y (gap +35) chủ động gây sự
lượt 23 (D.4 chọn nhờ flag) → đầu lượt 24 flag CLEAR (đã tiêu thụ) → từ
đó NPC_Y lại bị chặn bởi D.2 trừ khi bị khiêu khích lần nữa.

### D.4 — select_primary_hook(turn)

Công thức `select_primary_hook` được định nghĩa như sau:

```
select_primary_hook(turn):
  // ưu tiên 1: Canon Due (Core Rule #6)
  payload = canon_due_payload(turn)          // từ resolve_turn_canon lượt trước
  IF payload != null AND payload.resolved_events ≠ ∅:
    RETURN canon_hook(payload.resolved_events[0])
    // tie-break NHIỀU event Due xử lý UPSTREAM bởi resolution_order của
    // Setting & Canon (D.2 GDD đó) — hệ này chỉ lấy phần tử ĐẦU danh
    // sách đã sắp; các event còn lại vẫn vào facts/scene_tags

  // ưu tiên 2: NPC chủ động
  candidates = { npc : is_initiative_candidate(npc, turn) }
  IF candidates ≠ ∅:
    RETURN npc_hook(argmin over candidates của tie_break_key(npc))
    // tie_break_key(npc) = (-hostility_rank(npc), -|affinity(npc)|, npc_id)
    //   hostility_rank = 1 nếu hostile candidate, 0 nếu friendly

  // ưu tiên 3: Ambient
  RETURN ambient_hook()
```

**Định nghĩa `is_initiative_candidate`** (dùng lại ở D.5):
```
is_hostile_candidate(npc)  = affinity(npc) ≤ HOSTILE_INITIATIVE_AFFINITY_MAX
                           AND hostile_initiative_allowed(npc)      // D.2
                           AND present_or_adjacent(npc, player_location)
                           AND cooldown_ok(npc, hostile, turn)      // D.5, valence hostile
is_friendly_candidate(npc) = affinity(npc) ≥ FRIENDLY_INITIATIVE_AFFINITY_MIN
                           AND present_or_adjacent(npc, player_location)
                           AND cooldown_ok(npc, friendly, turn)     // D.5, valence friendly; KHÔNG cần D.2 (Core Rule #6)
is_initiative_candidate(npc, turn) = is_hostile_candidate OR is_friendly_candidate
```

**Lý do tie-break "hostile trước"** (duyệt 2026-08-03): xung đột mang
tải trọng kịch tính/cơ học cao hơn — ưu tiên giữ nhịp căng thẳng
(Challenge), tránh game luôn chọn nhánh "an toàn". **`|affinity|` giảm
dần**: thái độ càng cực đoan càng có động cơ bức thiết. **`npc_id`
cuối**: chốt xác định 100% cho test tự động.

**Chủ đích tường minh — provoked mở QUYỀN, không mở ĐỘNG CƠ** (xác nhận
2026-08-03): `provoked_flag` chỉ bypass rào gap trong D.2;
`is_hostile_candidate` VẪN đòi `affinity ≤ HOSTILE_INITIATIVE_AFFINITY_MAX`
— NPC chỉ chủ động gây sự khi vừa ĐƯỢC PHÉP (D.2) vừa ĐỦ GHÉT (D.4).
NPC bị chọc giận nhưng affinity chưa đủ thấp sẽ không chủ động (và nếu
affinity ≥ `PROVOKE_RECONCILE_AFFINITY`, flag tự xóa qua nhánh hòa giải
D.3 — tự nhất quán).

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Payload canon Due | `canon_due_payload(turn)` | struct \| null | — | Từ `resolve_turn_canon` lượt trước (registry) |
| Tập ứng viên | `candidates` | set of npc_id | 0..3 (MVP) | Đã lọc gate + cooldown + presence |
| Hạng chủ động | `hostility_rank(npc)` | int | {0,1} | 1 = hostile, 0 = friendly |
| Ngưỡng ứng viên thù địch | `HOSTILE_INITIATIVE_AFFINITY_MAX` | int (knob) | −60…−10 | Mặc định **−40** (khớp biên dải "Thù địch" — knob RIÊNG của hệ này) |
| Ngưỡng ứng viên thân thiện | `FRIENDLY_INITIATIVE_AFFINITY_MIN` | int (knob) | +10…+60 | Mặc định **+40** (khớp biên "Thân thiết") |
| Kết quả | `select_primary_hook` | hook struct | 1 hook/lượt | `{type: canon\|npc_initiated\|ambient, ...payload}` |

**Output Range:** đúng 1 hook/lượt (nhánh `ambient` là fallback không
điều kiện — không bao giờ 0 hoặc >1).

**Example:** Lượt 23, không canon Due. Candidates: NPC_Y
(`affinity=-85`, hostile hợp lệ nhờ provoked) và NPC_B (`affinity=+72`,
friendly). `hostility_rank(NPC_Y)=1 > 0` → chọn NPC_Y →
`npc_hook(NPC_Y, hostile)`.

### D.5 — npc_initiative_cooldown

Công thức `npc_initiative_cooldown` được định nghĩa như sau:

`cooldown_ok(npc, valence, turn) = per_npc_ready(npc, valence, turn) AND global_window_ready(turn)`

```
per_npc_ready(npc, valence, turn) = (npc_last_initiated[valence](npc) == null)
                         OR (turn − npc_last_initiated[valence](npc) ≥ NPC_INITIATIVE_COOLDOWN_TURNS)
  với valence ∈ {hostile, friendly} — 2 tracker RIÊNG theo sắc thái

global_window_ready(turn) = count({ t' : t' ∈ [turn − NPC_INITIATED_WINDOW_TURNS, turn),
                                      hook_type(t') == npc_initiated })   // đếm CHUNG mọi sắc thái
                            < NPC_INITIATED_WINDOW_CAP
```

**Mục đích 2 tầng**: `per_npc_ready` chặn CÙNG một NPC chủ động liên tục
(NPC nào cũng có việc khác phải làm); `global_window_ready` là **van thở
toàn cục** — dù nhiều NPC khác nhau đủ điều kiện, thế giới không dồn dập
"ai đó luôn chủ động" mỗi lượt, chừa chỗ cho `ambient` (thế giới cũng
không LUÔN xáo động vì người chơi — cần khoảng lặng).

**Quyết định: tracker cá nhân TÁCH theo sắc thái** (người dùng chốt
2026-08-03, thay đề xuất tracker chung của systems-designer): NPC vừa
chủ động thân thiện VẪN có thể chủ động thù địch trong cùng cửa sổ (và
ngược lại) — cooldown cá nhân chỉ chặn lặp CÙNG sắc thái; van thở toàn
cục vẫn đếm CHUNG mọi hook `npc_initiated` bất kể sắc thái nên nhịp tổng
thể không đổi.

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Lượt NPC chủ động gần nhất (theo sắc thái) | `npc_last_initiated[valence](npc)` | int \| null | [1, turn) | 2 tracker/NPC (`hostile`, `friendly`); cập nhật tracker ĐÚNG sắc thái khi D.4 chọn npc này |
| Cooldown cá nhân | `NPC_INITIATIVE_COOLDOWN_TURNS` | int (knob) | 3–10 | Mặc định **5** |
| Cửa sổ trượt toàn cục | `NPC_INITIATED_WINDOW_TURNS` | int (knob) | 2–6 | Mặc định **3** |
| Trần trong cửa sổ | `NPC_INITIATED_WINDOW_CAP` | int (knob) | 1–2 | Mặc định **1** — tối đa 1 hook NPC-initiated mỗi 3 lượt |
| Kết quả | `cooldown_ok(npc, valence, turn)` | bool | {0,1} | Input cho `is_*_candidate` (D.4) — hostile candidate dùng valence `hostile`, friendly candidate dùng `friendly` |

**Output Range:** boolean, per (npc, valence, turn).

**Example:** NPC_Y chủ động HOSTILE lượt 23
(`npc_last_initiated[hostile](NPC_Y)=23`). Lượt 25: NPC_B đủ điều kiện
D.4 nhưng `global_window_ready(25) = count 1 ≥ CAP 1` → `false` → hook
rơi về `ambient`. Lượt 27: `per_npc_ready(NPC_Y, hostile, 27) =
(27−23=4 < 5)` → NPC_Y vẫn khóa nhánh hostile; NHƯNG
`npc_last_initiated[friendly](NPC_Y)=null` → nếu NPC_Y đủ điều kiện
friendly candidate và cửa sổ toàn cục trống, NPC_Y VẪN có thể chủ động
thân thiện lượt 27 — minh họa tracker tách sắc thái.

### D.6 — entities_in_scope(scene)

Công thức `entities_in_scope` được định nghĩa như sau:

`entities_in_scope(scene) = {"global"} ∪ top_K(candidates(scene), key=priority_key, K=MAX_NPC_PER_SCENE)`

```
candidates(scene) = hook_participants(active_hook)
                   ∪ canon_role_npcs(location_id)   // NPC có vai trong event Due/Suspended liên quan cảnh
                   ∪ other_present_npcs(location_id)

priority_key(npc) = (tier(npc), -|affinity(npc)|, npc_id)
  tier = 0 nếu npc ∈ hook_participants(active_hook)   // luôn giữ
  tier = 1 nếu npc ∈ canon_role_npcs \ hook_participants
  tier = 2 còn lại
```

**Lý do thứ tự**: (1) `hook_participants` PHẢI có mặt — hook đã khóa mà
thiếu người tham gia thì AI không có nguyên liệu kể đúng (vi phạm Khế
Ước gián tiếp); (2) vai canon giữ cảm giác "thế giới khách quan vẫn vận
hành" khi đứng nền; (3) `|affinity|` giảm dần — NPC thái độ cực đoan
"đáng xuất hiện" hơn NPC trung lập; (4) `npc_id` chốt xác định.

**Edge case cấu trúc** (không xảy ra ở MVP-3-NPC): nếu
`|hook_participants| > MAX_NPC_PER_SCENE`, cắt trong tier 0 theo
`(role_priority trong event definition ASC, npc_id ASC)` + log warning
"content gap" (nhất quán pattern `breakthrough_requirement_met`).

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Trần NPC/cảnh | `MAX_NPC_PER_SCENE` | int | **3** (LOCKED, Core Rule #1) | Để `\|entities_in_scope\| ≤ max_entities_per_prompt=4` luôn đúng |
| NPC tham gia hook | `hook_participants(active_hook)` | set | 0..3 | Từ payload D.4 |
| NPC có vai canon | `canon_role_npcs(location_id)` | set | 0..3 (MVP) | Query Setting & Canon theo event tại location |
| Bậc ưu tiên | `tier(npc)` | int | {0,1,2} | Khóa sort chính |
| Kết quả | `entities_in_scope(scene)` | set | `{"global"}` + 0..3 NPC | ≤ 4 phần tử luôn đúng |

**Output Range:** `1 ≤ |entities_in_scope| ≤ MAX_NPC_PER_SCENE + 1 = 4`.

**Example:** Hook = NPC-initiated hostile của NPC_Y;
`canon_role_npcs("tuu_lau") = {NPC_B}`; `other_present_npcs = {NPC_A}` →
cả 3 vừa đủ → `entities_in_scope = {"global", NPC_Y, NPC_B, NPC_A}`.

### D.7 — encounter_level_range(player_level)

Công thức `encounter_level_range` được định nghĩa như sau:

`encounter_level_range(player_level) = [max(1, player_level − AMBIENT_LEVEL_BAND_DOWN), player_level + AMBIENT_HOSTILE_LEVEL_CAP]`

Cấp độ đối thủ AMBIENT (sinh thủ tục — "một toán cướp", "yêu thú hoang")
chọn ngẫu nhiên đều (uniform, RNG injectable) trong khoảng này.

**Ràng buộc bắt buộc — trần trên PHẢI ≤ D.2**: `AMBIENT_HOSTILE_LEVEL_CAP`
khóa an toàn ở `≤ HOSTILE_INITIATIVE_LEVEL_GAP_MAX = 20`. Lý do: đối thủ
ambient vừa sinh KHÔNG THỂ có `provoked_flag` (D.3 chỉ set từ sự kiện đã
phân loại nhắm vào NPC cụ thể — NPC vừa sinh chưa từng có sự kiện nào) →
con đường DUY NHẤT hợp lệ theo D.2 là `gap ≤ 20`. Sinh đối thủ `gap > 20`
sẽ tạo trạng thái tự mâu thuẫn — ràng buộc này là hệ quả logic bắt buộc.

**NPC/canon có danh tính KHÔNG dùng formula này**: cấp độ 3 NPC MVP và
mọi nhân vật có vai canon là DATA cố định trong setting pack — D.7 CHỈ
áp dụng cho đối thủ vô danh sinh thủ tục, không bao giờ ghi đè NPC có
`char_id` định danh.

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Cấp độ người chơi đầu lượt | `player_level` | int | [1, ∞) | Đọc thô EXP, KHÔNG cache — tính lại mỗi lượt |
| Biên dưới | `AMBIENT_LEVEL_BAND_DOWN` | int (knob) | 5–30 | Mặc định **15** |
| Biên trên | `AMBIENT_HOSTILE_LEVEL_CAP` | int (knob) | **5–20** (trần cứng 20) | Mặc định **15** — chừa biên an toàn cho tuning |
| Kết quả | `encounter_level_range` | [int, int] | `[1, player_level + 20]` tối đa | Khoảng sinh level đối thủ ambient |

**Output Range:** `[max(1, player_level − AMBIENT_LEVEL_BAND_DOWN),
player_level + AMBIENT_HOSTILE_LEVEL_CAP]` với cap ≤ 20 luôn đúng.

**Example:** `player_level=35`, knob mặc định → `[20, 50]`. RNG chọn 47
→ gap 12 ≤ 20 → tự thỏa D.2 không cần kiểm tra riêng. `player_level=5` →
`[1, 20]` — sàn tự nhiên chặn bởi 1.

## Edge Cases

- **Nếu AI trả về gợi ý mang nhãn envelope NGOÀI `allowed_envelope_menu`**:
  gợi ý đó bị hạ cứng xuống `rp_only` (giữ nguyên text, tước nhãn cơ
  học). Việc hạ nhãn KHÔNG tự kích hoạt retry — retry chỉ theo luật
  <4/trùng của Turn Manager (AC-16 bên đó).
- **Nếu Turn Manager phải dùng gợi ý dự phòng chung chung** ("Quan sát
  xung quanh", "Chờ đợi", "Rời đi" — sau khi retry thất bại): các gợi ý
  dự phòng map cứng vào envelope an toàn: "Quan sát xung quanh" →
  `investigate`, "Chờ đợi" → `rp_only`, "Rời đi" → `move_to` (location
  kề đầu tiên theo thứ tự khai trong data; nếu `adjacent = ∅` thì thay
  bằng `rp_only`).
- **Nếu người chơi gõ văn tự do mô tả hành động cơ học nhưng không bật
  chip** ("ta rút kiếm chém X"): resolve là `rp_only` — không trận đấu,
  không delta nào. AI tường thuật trong giới hạn "không được khẳng định
  hệ quả cơ học" (ràng buộc prompt + hậu kiểm leak của Contract
  Enforcement); heuristic client chỉ nudge bật chip TRƯỚC khi gửi, đã
  gửi thì không hỏi lại.
- **Nếu menu chỉ còn `{move_to, investigate, rp_only}`** (cảnh vắng NPC,
  không private, không canon Suspended): hợp lệ, không phải lỗi — lượt
  "khoảng lặng" đúng thiết kế.
- **Nếu `adjacent(location_id) = ∅`** (lỗi authoring đồ thị): `move_to`
  bị loại khỏi menu, log warning "content gap" (cùng pattern
  `breakthrough_requirement_met`), không crash.
- **Nếu NPC bị `provoked` nhưng gap vốn đã ≤ 20**: override vô hại —
  hành vi giống hệt không-provoked, không cần phân biệt trong tường
  thuật/UI.
- **Nếu NPC bị `provoked` nhưng người chơi rời xa** (không
  `present_or_adjacent`): flag TỒN TẠI vô thời hạn (D.3 không decay),
  chờ đến khi đủ điều kiện presence — mối thù không tự nguôi.
- **Nếu nhiều NPC đủ điều kiện chủ động cùng lượt**: chỉ 1 được chọn
  theo tie-break D.4; NPC KHÔNG được chọn không tốn cooldown cá nhân
  (`npc_last_initiated` không cập nhật), thử lại bình thường lượt sau.
- **Nếu `global_window_ready` chặn dù NPC cá nhân sẵn sàng**: hook rơi
  về `ambient`; KHÔNG có "tồn kho" cơ hội bị bỏ lỡ — lượt sau xét lại
  từ đầu theo điều kiện hiện hành.
- **Nếu NPC đang giữ `provoked_flag` chết trước khi flag được tiêu
  thụ**: flag dọn theo dữ liệu NPC (provisional — chờ Death &
  Consequence chốt vòng đời data NPC chết).
- **Nếu canon Due payload chứa NHIỀU event cùng lượt**: chỉ event ĐẦU
  (theo `resolution_order` của Setting & Canon) thành hook chính; các
  event còn lại không mất, chỉ không được "dựng cảnh riêng" — fact của
  chúng đã TỰ CÓ qua field `canon_event_[event_id]_status` do Setting &
  Canon khóa (World Memory trích tự động, không cần hệ này làm gì thêm);
  phía cảnh, mỗi event nền được thêm tag `canon_bg_[event_id]` vào
  `scene_tags` để AI có thể nhắc đến trong tường thuật (fix gap qa-lead
  2026-08-03).
- **Nếu lượt bị Undo từng: set `provoked_flag` / tiêu thụ cooldown /
  chọn hook NPC-initiated**: TOÀN BỘ tracker (provoked, `last_used`,
  cả 2 tracker `npc_last_initiated[valence]`, lịch sử hook trong cửa sổ
  D.5) rollback cùng lúc theo Turn Manager Core Rule #8; menu lượt đó tính lại
  deterministic từ cảnh khôi phục → menu GIỐNG HỆT trước undo (chỉ 4
  gợi ý AI là sinh mới theo TM Rule #5).
- **Nếu game bắt đầu / load lại giữa Awaiting Player Action**: cảnh khôi
  phục từ `turn_snapshot`; menu tính lại deterministic cho kết quả y
  hệt. `world_time=0`: cảnh khởi tạo đọc từ setting pack (starting
  location + presence ban đầu), không hook → `ambient`.
- **Nếu affinity thay đổi TRONG lượt sau khi menu đã tính** (VD Song Tu
  bị hủy giữa lượt): menu KHÔNG tính lại giữa lượt — gate đánh giá đúng
  1 lần tại thời điểm khóa cảnh (Scene Locked), nhất quán "cảnh bất
  biến trong lượt" (Core Rule #1). Hệ quả nhận ở lượt kế.
- **Nếu `|hook_participants| > MAX_NPC_PER_SCENE`** (chỉ có thể ở Full
  Vision): cắt trong tier 0 theo `(role_priority, npc_id)`, log warning
  "content gap" — đã định nghĩa tại D.6.

## Dependencies

| Hệ | Chiều | Bản chất giao diện | Hard/Soft |
|---|---|---|---|
| Turn Manager (Approved) | Hệ này phụ thuộc TM | Trigger scene update sau confirm; cung cấp cảnh + menu cho suggestion_call; classified_event trả về pipeline lượt; Core Rule #8 deferred-commit cho mọi tracker; 0 AI call riêng (`calls_per_turn ≤ 3` giữ nguyên) | Hard |
| AI/LLM Integration Layer (Designed) | Hệ này phụ thuộc | Payload suggestion_call = cảnh đã khóa + `allowed_envelope_menu`; **cần mở schema array[4] string → array[4] {text, envelope}** (sửa nhỏ GDD đó — xem Open Questions) | Hard |
| World Memory (Designed) | 2 chiều | CUNG CẤP `entities_in_scope` (D.6 — đóng trách nhiệm GDD đó đã khai chờ); ĐỌC fact theo entity_id khi dựng hook; GHI field `location_change_player` (global), `encounter_initiated_[npc_id]`, `classified_event_[npc_id]` đúng quy ước entity_id | Hard |
| Mechanic/Narration Contract Enforcement (Approved) | Hệ này phụ thuộc | Mọi field khóa trước narration; `rp_only` = 0 field; ràng buộc "AI không khẳng định hệ quả cơ học" cho lượt `rp_only` dựa vào hậu kiểm leak của hệ đó | Hard |
| NPC Affinity & Relationship (Designed) | 2 chiều | CUNG CẤP: sự kiện xã hội đã phân loại (taxonomy chuẩn hóa tại Core Rule #3/D.1 — đóng Open Question "taxonomy chính thức" + cờ `spar_friendly` của GDD đó) + danh sách nhân chứng = `entities_in_scope`; tôn trọng ràng buộc content-gating của economy-designer (Core Rule #5). ĐỌC: affinity, `song_tu_active`, bảng severity D.1 (cho D.3 provoked) | Hard (2 chiều) |
| Setting & Canon Integration (Designed) | 2 chiều | NHẬN event Due/Resolved + `canon_outcome` (hook ưu tiên 1, D.4); CUNG CẤP `canon_role_rescue` (envelope) + `location(X)` (đồ thị location + presence — đóng 2 interface provisional/Open Questions của GDD đó) | Hard (2 chiều) |
| EXP & Realm Progression (Designed) | Hệ này phụ thuộc | Đọc `level` thô cho D.2/D.7 — hệ này sở hữu logic ngưỡng 20 cấp (khớp AC-17 GDD đó) | Soft (thiếu thì D.2 mặc định cho phép, D.7 không scale) |
| Combat System (Designed) | Combat phụ thuộc hệ này | `combat_challenge(target, spar_friendly)` khởi tạo trận; D.7 cung cấp level đối thủ ambient (input cho `stat_growth` sinh chỉ số) | Soft (chiều ngược — Combat vẫn chạy khi trận đến từ nguồn khác) |
| Death & Consequence (chưa thiết kế) | 2 chiều, provisional | NHẬN thông tin chết → cập nhật presence + dọn `provoked_flag`; CUNG CẤP witness list (`entities_in_scope`) cho `kill_witnessed` | Hard khi được thiết kế |
| Persistence/Save System (Designed) | Persistence phụ thuộc hệ này | Serialize trong `turn_snapshot`: scene, presence, `last_used` cooldowns, `provoked_*`, `npc_last_initiated[hostile/friendly]` (2 tracker/NPC), lịch sử hook cửa sổ D.5 | Hard (chiều ngược) |
| Character Card & Identity (chưa thiết kế) | Card phụ thuộc hệ này | Đọc `location` hiện tại (hiển thị hồ sơ/bối cảnh) — interface nhỏ | Soft (chiều ngược) |
| Core UI/Screen Navigation (chưa thiết kế) | UI phụ thuộc hệ này | Render chip intent theo menu; header cảnh (location); nudge heuristic client | Hard (chiều ngược) |

*(Ghi chú đối chiếu ngược: `systems-index.md` hiện ghi "Depends On: AI
Integration Layer, Turn Manager, World Memory" cho hệ #11 — bảng trên bổ
sung Contract Enforcement, NPC Affinity, Setting & Canon, EXP (upstream)
và các cạnh chiều ngược, cùng dạng 9 gap đã ghi nhận trước. Footnote vào
systems-index ở bước cập nhật cuối, không sửa bảng Enumeration.)*

## Tuning Knobs

| Knob | Default | Safe Range | Nguồn | Ảnh hưởng nếu chỉnh |
|---|---|---|---|---|
| `POSITIVE_SOCIAL_COOLDOWN_TURNS` | 4 | 2–8 | D.1 | Thấp → cơ hội tăng Hảo cảm dày lên, nguy cơ ratchet (economy-designer cảnh báo <2); cao → NPC "lạnh nhạt", nguồn tăng affinity khan hiếm |
| `PROVOKE_SEVERITY_MIN` | 3 | 2–4 | D.3 | Thấp (2) → cả `insult` cũng chọc giận cao thủ — thế giới "nóng tính"; cao (4) → chỉ `betray`/giết mới chọc được |
| `PROVOKE_RECONCILE_AFFINITY` | −10 | −20…0 | D.3 | Cao (0) → phải leo hẳn về trung lập mới xóa thù; thấp (−20) → hòa giải dễ hơn |
| `HOSTILE_INITIATIVE_AFFINITY_MAX` | −40 | −60…−10 | D.4 | Cao (−10) → NPC hơi ghét đã có thể gây sự — thế giới hung hãn; thấp (−60) → chỉ kẻ thù thật sự mới chủ động |
| `FRIENDLY_INITIATIVE_AFFINITY_MIN` | +40 | +10…+60 | D.4 | Thấp → NPC quen sơ đã hay bắt chuyện; cao → chỉ tri kỷ mới chủ động tìm |
| `NPC_INITIATIVE_COOLDOWN_TURNS` | 5 | 3–10 | D.5 | Thấp → cùng 1 NPC đeo bám; cao → NPC thụ động |
| `NPC_INITIATED_WINDOW_TURNS` | 3 | 2–6 | D.5 | Cùng `WINDOW_CAP` quyết định mật độ "thế giới chủ động" |
| `NPC_INITIATED_WINDOW_CAP` | 1 | 1–2 | D.5 | 2 → thế giới dồn dập hơn, ít khoảng lặng ambient |
| `AMBIENT_LEVEL_BAND_DOWN` | 15 | 5–30 | D.7 | Rộng → gặp nhiều đối thủ "lót đường" dễ; hẹp → mọi encounter đều sát tầm |
| `AMBIENT_HOSTILE_LEVEL_CAP` | 15 | 5–20 (**trần cứng 20**) | D.7 | Cao → ambient nguy hiểm hơn; KHÔNG BAO GIỜ vượt 20 — tự mâu thuẫn với D.2 |

**KHÔNG phải tuning knob** (hằng số khóa): `HOSTILE_INITIATIVE_LEVEL_GAP_MAX
= 20` (từ game-concept.md — đổi cần re-review toàn game);
`MAX_NPC_PER_SCENE = 3` (Core Rule #1 — ràng buộc cấu trúc với
`max_entities_per_prompt=4` của World Memory). Knob của hệ khác được
tham chiếu, không tạo bản sao: `song_tu_threshold=60` (NPC Affinity),
`max_entities_per_prompt=4`, `recency_window_turns=5` (World Memory).

## Visual/Audio Requirements

*(Đề xuất bởi `art-director` 2026-08-03, duyệt cùng ngày — anchor duy
nhất hiện có là mục "Visual Identity Anchor" của `game-concept.md` ("Mực
Chưa Khô"); chưa có Art Bible chính thức.)*

### 1. Tín hiệu thị giác cho các sự kiện chính

**Chuyển cảnh (`move_to`, đổi `location_id`)**: header cảnh (tên địa
điểm) chuyển bằng hiệu ứng "mực loang" — tên cũ mờ dần như mực khô đi,
tên mới hiện lên như vệt mực mới thấm giấy (≤ 300–400ms). Danh sách NPC
hiện diện đổi cùng nhịp với header — một khối, không lệch pha. KHÔNG
chạy hiệu ứng khi cảnh giữ nguyên `location_id` (ambient tiếp diễn) —
chạy mỗi lượt sẽ mất giá trị tín hiệu. Không có ảnh nền/bản đồ minh họa
địa điểm (Art Pipeline Complexity: Thấp).

**Encounter opening — phân biệt hostile/friendly TRƯỚC khi đọc chữ**:
không dùng màu (đỏ son/xanh ngọc khẩu phần hóa cho hệ quả vĩnh viễn —
một cảnh mở đầu chưa phải hệ quả). Phân biệt bằng **độ đậm/nét mực**:
NPC chủ động thù địch → tên NPC trong khung mực loang **đậm và loang
mạnh hơn** (gợi "xộc vào"); thân thiện → khung nhạt, mềm. Nếu
`scene_tags` chứa `dangerous`: thêm badge nhỏ dạng **con dấu góc cạnh**
"[nguy hiểm]" cạnh header — cờ cơ học đã khóa xứng đáng ngôn ngữ hình
khối sắc bén, vẫn đơn sắc.

**Cảnh sự kiện canon Due**: nhận **badge con dấu góc cạnh** riêng (VD
"[Sự kiện nguyên tác]") cạnh header — sắc bén nhưng đen-xám, không mượn
màu accent. *(Mở rộng ngôn ngữ con dấu từ "con số cứng" sang "sự thật
cấu trúc đã khóa" — duyệt 2026-08-03, cần tái xác nhận khi viết Art
Bible đầy đủ.)*

**Chip biến mất/xuất hiện do gating chống ratchet**: chip vắng mặt =
**không render gì cả** — không ô xám/disabled/tooltip giải thích, đúng
tinh thần "thế giới không nợ người chơi lời giải thích". Hàng chip tự
dồn như dòng chữ co giãn, không phải lưới nút cố định có "ô trống". Chip
quay lại sau cooldown KHÔNG có badge "mới!"/hiệu ứng nhấn — làm nổi sẽ
lộ bộ đếm cooldown, phá ảo giác "thế giới tự nhiên vậy thôi".

### 2. Chip intent trong ngôn ngữ Mực Chưa Khô

- **Hình khối**: chip là một "nét bút" ngắn, viền hữu cơ mềm — **KHÔNG**
  dùng khung con dấu. Tại thời điểm chạm chip chưa có sự thật cơ học nào
  được khẳng định — envelope là *ý định*, kết quả chỉ khóa sau resolve.
- **Màu**: không chip nào — kể cả `threaten`/`betray`/`combat_challenge`
  — dùng đỏ son/xanh ngọc tại thời điểm hiển thị menu (nhất quán tiền lệ
  Combat: cảnh báo trước trận không đổi màu).
- **Phân cấp không dùng màu**: chip valence tiêu cực render nét đậm hơn
  1 bậc so với chip trung tính/tích cực — "mực nặng hơn vì việc này nặng
  hơn".
- **`save_life` và `canon_role_rescue`** (hiếm, hook-gated): viền con
  dấu **rỗng** (outline, không tô, không màu) riêng cho 2 chip này —
  đánh dấu "gắn với hook cơ học đã khóa" bằng hình khối (duyệt
  2026-08-03).
- **`rp_only`** không có chip hiển thị — mặc định của ô nhập tự do khi
  không chọn gì đã LÀ `rp_only` (duyệt 2026-08-03).

### 3. Ràng buộc từ art direction

- Không ảnh minh họa địa điểm/NPC (avatar, portrait) trong hệ này — chỉ
  chữ + badge con dấu nhỏ.
- Header cảnh đọc như **tiêu đề một trang nhật ký** đầu mỗi lượt, KHÔNG
  phải sticky status bar — mỗi lượt là một trang mới.
- Menu có thể lên 8–12+ chip (3 NPC × nhiều envelope + `move_to`): nhóm
  chip theo tiểu mục tên NPC (typography thuần, không icon) — duyệt
  2026-08-03, `ux-designer` xác nhận chi tiết ở `/ux-design`.
- Tuyệt đối không màu nào ngoài 2 accent khẩu phần hóa — không "xanh
  info"/"xanh lá success" cho trạng thái menu/chip; phân biệt chỉ bằng
  độ đậm/nét/hình khối mực.

### 4. Âm thanh (ADVISORY — "Audio Needs: Tối thiểu")

- Tối đa 1 SFX ngắn (<0.3s, "bút chạm giấy") khi đổi `location_id` thật
  — không phát mỗi lượt; có thể bỏ hoàn toàn ở bản đầu.
- Nếu sonify 1 khoảnh khắc duy nhất: **NPC chủ động thù địch** (đỉnh
  căng thẳng) — 1 âm chung, không tách hostile/friendly (thị giác đã đủ
  phân biệt).
- Không nhạc nền riêng cho "chế độ encounter", không âm hiệu cho badge
  canon Due.

### 5. Nguyên tắc anchor áp dụng

- *"Mọi con số minh họa bằng nét mực trước khi đọc như dữ liệu"* — diễn
  dịch mở rộng: mọi **trạng thái cấu trúc đã khóa** (location, presence,
  scene_tags) cần dấu hiệu thị giác riêng → vai trò của 2 badge con dấu.
- *Con dấu CHỈ ở nơi khẳng định sự thật cơ học* → badge `dangerous`,
  badge canon Due; KHÔNG áp cho chip (ý định, chưa phải sự thật).
- *Màu accent khẩu phần hóa* → hệ này **không bao giờ** tự phát màu —
  mọi lượt kích hoạt màu (chết/trọng thương = đỏ son, đột phá = xanh
  ngọc) thuộc hệ downstream sở hữu hệ quả đó.
- *Mood "nhật ký riêng, không phải HUD"* → header-là-tiêu-đề-trang.

📌 **Asset Spec** — sau khi Art Bible được duyệt, chạy `/asset-spec
system:situation-encounter-generation` để cụ thể hóa badge con dấu,
chip, và hiệu ứng chuyển cảnh thành spec asset.

## UI Requirements

- **Khu nhập hành động**: ô văn tự do + hàng chip intent. Chip nhóm theo
  tiểu mục tên NPC (typography thuần — xem Visual/Audio §3); chip không
  gắn NPC (`move_to`, `investigate`, `canon_role_rescue`) nhóm riêng
  cuối hàng. Hàng chip tự dồn/cuộn theo nội dung, không lưới cố định.
- **4 thẻ gợi ý AI**: hiển thị text thuần — envelope là metadata NỘI BỘ,
  không lộ nhãn cơ học lên thẻ (người chơi đọc gợi ý như văn, không như
  nút lệnh gắn tag).
- **Nudge heuristic**: khi văn tự do khớp mẫu từ khóa, hiển thị 1 dòng
  gợi ý nhỏ phía trên nút gửi (VD: "Có vẻ bạn muốn khiêu chiến — bật
  chip?") — bấm vào MỚI bật chip, không bao giờ tự bật (Core Rule #4).
  Sau khi gửi, không hỏi lại.
- **Header cảnh**: tên location + badge con dấu (nếu có `dangerous`/
  canon Due) như tiêu đề trang nhật ký đầu lượt — không sticky bar.
- **Responsive**: mọi chip/thẻ tap-friendly, hỗ trợ cả tap lẫn click,
  không tương tác hover-only (theo `technical-preferences.md` — Web +
  Mobile Web).
- **Trạng thái Undo**: sau undo, hàng chip render lại theo menu khôi
  phục (giống hệt trước undo — AC-39); 4 thẻ gợi ý là nội dung AI mới.

> **📌 UX Flag — Situation/Encounter Generation**: Hệ này có UI
> requirements thật (khu chip intent, nudge, header cảnh). Ở Phase 4
> (Pre-Production), chạy `/ux-design` cho màn hình chơi chính (khu nhập
> + gợi ý + header cảnh) TRƯỚC khi viết epics. Story tham chiếu UI phải
> cite `design/ux/[screen].md`, không cite thẳng GDD này.

## Acceptance Criteria

*(Đề xuất bởi `qa-lead` 2026-08-03, hiệu chỉnh sau 6 gap fix cùng ngày.
Hệ này thuần data/logic + orchestration (0 lệnh gọi AI trong logic của
chính hệ) — kiểm chứng chủ yếu bằng unit test thuần; mọi hệ ngoài (level
từ EXP, bảng affinity/severity của NPC Affinity,
`canon_due_payload`/sự kiện Suspended của Setting & Canon, Turn Manager,
World Memory, Persistence, RNG cho D.7) phải được INJECT như tham
số/mock, không gọi hệ thật.)*

**Story Type**: Logic (state cảnh + pipeline công thức deterministic +
orchestration lịch trình) → **BLOCKING** gate, test tự động bắt buộc tại
`tests/unit/situation-encounter-generation/` (naming:
`situation_gen_[feature]_test.gd`, `test_[scenario]_[expected]`).

**Ghi chú test setup**: Trừ khi ghi chú khác, mọi AC dùng cố định giá
trị default ở Tuning Knobs làm fixture
(`POSITIVE_SOCIAL_COOLDOWN_TURNS=4, PROVOKE_SEVERITY_MIN=3,
PROVOKE_RECONCILE_AFFINITY=−10, HOSTILE_INITIATIVE_AFFINITY_MAX=−40,
FRIENDLY_INITIATIVE_AFFINITY_MIN=+40, NPC_INITIATIVE_COOLDOWN_TURNS=5,
NPC_INITIATED_WINDOW_TURNS=3, NPC_INITIATED_WINDOW_CAP=1,
AMBIENT_LEVEL_BAND_DOWN=15, AMBIENT_HOSTILE_LEVEL_CAP=15`) cùng hằng số
khóa (`HOSTILE_INITIATIVE_LEVEL_GAP_MAX=20, MAX_NPC_PER_SCENE=3,
song_tu_threshold=60`). RNG (D.7) phải inject được (seeded stub) để test
deterministic. AC dùng interface Death & Consequence (chưa thiết kế)
đánh dấu **provisional-interface**, rà lại khi hệ đó được thiết kế.

### Core Rules

**AC-01** (Rule #1 — cấu trúc scene + trần `entities_in_scope`): GIVEN
scene vừa dựng với `hook_participants={npc_Y}`, `canon_role_npcs={npc_B}`,
`other_present_npcs={npc_A}` (đúng biên 3 NPC MVP), WHEN đọc
`scene.entities_in_scope`, THEN kết quả = `{"global", npc_Y, npc_B,
npc_A}` — ĐÚNG 4 phần tử, luôn thỏa `|entities_in_scope| ≤
max_entities_per_prompt=4`; VÀ `scene` có ĐÚNG 4 field `{location_id,
entities_in_scope, scene_tags, active_hook}`, không field runtime nào
khác lọt vào struct công khai. *(unit)*

**AC-02** (Rule #2 — cảnh khóa TRƯỚC `suggestion_call`): GIVEN mock spy
theo dõi thứ tự gọi `lock_scene()` và `suggestion_call()` qua Turn
Manager mock, WHEN 50 lượt mô phỏng chạy trọn vẹn, THEN spy ghi nhận
`lock_scene()` được gọi TRƯỚC `suggestion_call()` trong MỌI lượt (0 lần
đảo thứ tự); VÀ `allowed_envelope_menu` đã có giá trị final tại thời
điểm `suggestion_call()` được gọi (không đổi sau đó trong cùng lượt).
*(unit + mock-spy call-order)*

**AC-03** (Rule #2 — thứ tự dispatch đúng thứ tự lượt): GIVEN 1 lượt có
đồng thời sự kiện Combat kết thúc, sự kiện xã hội NPC Affinity, canon
Due, và EXP thay đổi, WHEN hệ này dispatch `classified_event` cho các hệ
sở hữu (mock spy trên từng hệ nhận), THEN thứ tự gọi ĐÚNG `Combat/Death
→ NPC Affinity → Canon → EXP`; cụ thể `resolve_turn_canon` (mock) được
gọi TRƯỚC `resolve_turn_exp` (mock) trong MỌI lượt kiểm tra. *(unit +
mock-spy call-order)*

**AC-04** (Rule #3 — nhãn AI ngoài menu hạ cứng `rp_only`, không retry):
GIVEN `allowed_envelope_menu(turn) = {gift[npc_A], move_to[loc_X],
investigate, rp_only}`, AI trả về gợi ý mang nhãn
`envelope_type="threaten"` (ngoài menu), WHEN resolve, THEN gợi ý bị hạ
xuống `rp_only` NHƯNG text gốc GIỮ NGUYÊN; VÀ mock-spy trên cơ chế retry
của Turn Manager ghi nhận 0 lệnh gọi retry phát sinh TỪ việc hạ nhãn này
(retry chỉ theo luật <4/trùng riêng của TM). *(unit + mock-spy)*

**AC-05** (Rule #3 — `allowed_envelope_menu` deterministic): GIVEN 1
scene cố định và toàn bộ tracker cố định, WHEN gọi
`allowed_envelope_menu(turn)` 2 lần liên tiếp không có sự kiện xen giữa,
THEN 2 kết quả GIỐNG HỆT NHAU — không phụ thuộc RNG hay thời điểm gọi.
*(unit)*

**AC-06** (Rule #4 — không chip → `rp_only`, heuristic không tự phân
loại): GIVEN văn tự do "ta rút kiếm chém X" gửi KHÔNG kèm chip intent,
WHEN resolve, THEN envelope kết quả = `rp_only` — không trận đấu, không
delta nào phát sinh (0 lệnh gọi tới Combat/NPC Affinity mock); VÀ
interface inspection xác nhận public API của module heuristic
client-side CHỈ có `suggest_chip(text) -> chip_id | null` (side-effect:
set UI state gợi ý), KHÔNG tồn tại method nào trả `envelope_type` để tự
phân loại. *(unit + interface inspection)*

**AC-07** (Rule #5a — cooldown áp CẢ chip lẫn gợi ý AI): GIVEN
`last_used(gift, npc_A)=turn−2` (chưa hết cooldown 4 lượt), WHEN tính
`allowed_envelope_menu`, THEN `gift[npc_A]` bị loại khỏi menu CẢ theo
đường chip UI LẪN đường payload `suggestion_call` gửi cho AI — cùng 1
nguồn gate, không có "cửa sau" riêng cho AI. *(unit)*

**AC-08** (Rule #5a — `dangerous` chặn gift/small_help bất kể cooldown):
GIVEN `scene_tags={"dangerous"}`, `last_used(gift, npc_A)=null`
(cooldown lẽ ra hết), WHEN tính menu, THEN `gift[npc_A]` và
`small_help[npc_A]` VẪN bị loại — điều kiện `"dangerous" ∉ scene_tags`
là AND bắt buộc, không thể bù bởi cooldown hết hạn. *(unit)*

**AC-09** (Rule #5b — `song_tu_action` cần private VÀ willing): GIVEN 4
tổ hợp `(scene_tags, affinity/active)`: (a) `{"public"}`, affinity=70 →
loại; (b) `{"private"}`, affinity=59, không active → loại; (c)
`{"private"}`, affinity=60 → vào menu; (d) `{"private"}`, affinity=30
nhưng `npc ∈ active_song_tu_set` → vào menu, WHEN tính gate, THEN kết
quả lần lượt = `false, false, true, true`. *(unit)*

**AC-10** (Rule #5b — `save_life` hook-gated, không dùng cooldown):
GIVEN `active_hook={type:"npc_in_danger", at_risk_npc: npc_A}`,
`last_used(save_life, npc_A)=turn−1`, WHEN tính gate `save_life[npc_A]`,
THEN = `true` (không bị chặn bởi cooldown nào); GIVEN
`active_hook={type:"ambient"}` lượt kế, THEN `save_life[npc_A]` biến
mất khỏi menu dù npc_A vẫn present. *(unit)*

**AC-11** (Rule #6 — thứ tự cứng canon > NPC-initiated > ambient + đúng
1 hook/lượt): GIVEN 3 kịch bản độc lập: (a) canon Due tồn tại VÀ có
candidate hợp lệ, (b) không canon Due nhưng có candidate, (c) không
canon Due, không candidate, WHEN `select_primary_hook(turn)` chạy, THEN
(a) trả `canon_hook` (bỏ qua candidate), (b) trả `npc_hook`, (c) trả
`ambient_hook`; VÀ cả 3 trường hợp trả về ĐÚNG 1 struct hook (không bao
giờ null/mảng >1) — bất biến "1 hook chính/lượt". *(unit)*

**AC-12** (Rule #7 — `move_to` chỉ hợp lệ tới location kề): GIVEN đồ
thị `tuu_lau ↔ {cho, hau_vien}`, người chơi tại `tuu_lau`, WHEN gửi
`move_to(target="thanh_ngoai")` (không kề), THEN resolve từ chối có
kiểm soát — không đổi `location(player)`, không crash; GIVEN
`move_to(target="cho")` (kề), THEN `location(player)` đổi thành `"cho"`
sau khi lượt xác nhận. *(unit)*

**AC-13** (Rule #7 — presence data-driven, predicate `at_location`):
GIVEN hệ này cập nhật presence npc_B sang `"hau_vien"`, WHEN mock
Setting & Canon gọi `at_location(npc_B, "hau_vien")`, THEN trả `true`;
gọi `at_location(npc_B, "tuu_lau")` trả `false` — presence NPC đọc từ
cùng bảng data-driven, không suy từ affinity/hook. *(unit + mock
consumer)*

**AC-14** (Rule #8 — deferred-commit; field khóa đúng entity_id): GIVEN
1 lượt có `move_to` thành công VÀ NPC_Y chủ động, WHEN Resolving hoàn
tất TRƯỚC khi TM xác nhận, THEN `locked_result` chứa ĐÚNG
`location_change_player` (entity `"global"`), `encounter_initiated_npc_Y`
(entity `"npc_Y"`), `classified_event_npc_Y` — không field nào tồn tại
ngoài `locked_result` ở thời điểm chưa "final". *(unit)*

### Formulas

**AC-15** (D.1 — khớp ví dụ GDD lượt 42, gate 2 điều kiện AND): GIVEN
lượt 42 y hệt ví dụ GDD (`entities_in_scope={npc_A, npc_B, "global"}`,
`scene_tags={"public"}`, `active_hook={type:"ambient"}`,
`affinity(npc_A)=45`, `affinity(npc_B)=70` active Song Tu,
`last_used(gift, npc_A)=38`, không event Suspended), WHEN tính
`allowed_envelope_menu(42)`, THEN menu chứa
`gift/small_help/insult/threaten/betray/combat_challenge` cho CẢ npc_A
và npc_B, `move_to[...kề]`, `investigate`, `rp_only`; VÀ
`song_tu_action[npc_B]` KHÔNG có trong menu dù `affinity=70≥60` — vì
`"private" ∉ {"public"}`. *(unit, regression neo số)*

**AC-16** (D.1 — biên `cooldown_elapsed`, `last_used` chỉ đổi khi
RESOLVE): GIVEN `last_used(gift, npc_A)=38`, WHEN kiểm tại `turn=41`
(3<4) và `turn=42` (4≥4), THEN `cooldown_elapsed` = `false, true`; GIVEN
`gift[npc_A]` xuất hiện trong menu lượt 42 nhưng người chơi KHÔNG chọn,
WHEN kiểm `last_used(gift, npc_A)` sau lượt 42, THEN VẪN = 38 — chỉ đổi
khi thực sự RESOLVE. *(unit)*

**AC-17** (D.2 — khớp ví dụ GDD, bypass qua provoked, không-bypass qua
thù địch sâu sắc): GIVEN `level(player)=30`, WHEN kiểm NPC_X `level=48`
(gap +18) → `true`; NPC_Y `level=65` (gap +35), `provoked_flag=false`,
`affinity=-90` → `false`; NPC_Z `level=10` (gap −20) → `true`; VÀ sau
khi `threaten` NPC_Y (severity 3) làm `provoked_flag=true`, WHEN kiểm
lại NPC_Y cùng gap +35, THEN `hostile_initiative_allowed=true` — bypass
CHỈ qua provoked, không qua affinity thấp. *(unit, regression neo số)*

**AC-18** (D.2 — predicate một chiều, không trị tuyệt đối): GIVEN
`level(player)=50`, NPC `level=20` (gap = −30, ÂM), WHEN tính, THEN =
`true` vô điều kiện; đối chiếu: nếu dùng `|gap|` kết quả sẽ SAI thành
`false` (30>20) — test khẳng định công thức đúng là một chiều. *(unit)*

**AC-19** (D.2 — property-based, 500 mẫu seeded): GIVEN 500 tổ hợp
`(player_level, npc_level)` sinh seeded đều trong `[1,300]×[1,300]`,
`provoked_flag=false` cố định, WHEN tính `hostile_initiative_allowed`,
THEN với MỌI tổ hợp: kết quả == `(npc_level − player_level ≤ 20)` —
khớp 100% predicate một chiều. *(unit, property-based seeded)*

**AC-20** (D.3 — vòng đời set/consume khớp ví dụ GDD lượt 20→24): GIVEN
lượt 20, `threaten` NPC_Y (severity 3), WHEN kiểm `provoked_flag(NPC_Y)`
từ lượt 21, THEN = `true`; GIVEN D.4 chọn NPC_Y làm hook NPC-initiated
HOSTILE lượt 23 trong khi flag=true, WHEN kiểm đầu lượt 24, THEN
`provoked_flag=false` (CLEAR — tiêu thụ BẤT KỂ flag có phải lý do mở
quyền hay không, theo fix 2026-08-03); từ lượt 24,
`hostile_initiative_allowed(NPC_Y)` quay lại phụ thuộc gap thuần (D.2).
*(unit, regression neo số)*

**AC-21** (D.3 — không decay theo lượt, hòa giải qua affinity): GIVEN
`provoked_flag(npc_X)=true` chưa tiêu thụ, WHEN chạy 50 lượt liên tiếp
không sự kiện chạm npc_X, THEN VẪN `true` (không decay); GIVEN affinity
leo từ −85 lên −10 (đúng `PROVOKE_RECONCILE_AFFINITY`), WHEN kiểm đầu
lượt kế, THEN `provoked_flag=false`; tại `affinity=−11` (chưa chạm),
flag VẪN `true`. *(unit)*

**AC-22** (D.3 — biên `PROVOKE_SEVERITY_MIN=3`): GIVEN sự kiện
`insult`(2), `threaten`(3), `betray`(4), `kill_witnessed`(5, npc trong
witnesses), WHEN kiểm `provoked_flag` sau resolve, THEN lần lượt =
`false, true, true, true`. *(unit)*

**AC-23** (D.4 — khớp ví dụ GDD lượt 23, tie-break hostile trước): GIVEN
lượt 23, không canon Due, candidates = `{NPC_Y (affinity=−85, hostile
hợp lệ nhờ provoked), NPC_B (affinity=+72, friendly)}`, WHEN
`select_primary_hook(23)`, THEN trả `npc_hook(NPC_Y, hostile)` —
`hostility_rank` thắng trước khi so `|affinity|`. *(unit, regression neo
số)*

**AC-24** (D.4 — tie-break bậc 2/3): GIVEN 2 candidate cùng
`hostility_rank=1`: NPC_P `affinity=−45`, NPC_Q `affinity=−70`, WHEN
tie-break, THEN chọn NPC_Q; GIVEN 2 candidate cùng rank và `|affinity|`
bằng nhau, WHEN so đến `npc_id`, THEN kết quả xác định 100% (không
random). *(unit)*

**AC-25** (D.4 — ambient là fallback không điều kiện): GIVEN
`candidates=∅` và không canon Due, WHEN `select_primary_hook`, THEN trả
`ambient_hook()` — never null, never throw. *(unit)*

**AC-26** (D.5 — khớp ví dụ GDD lượt 23/25/27, 2 tầng cooldown + tách
sắc thái): GIVEN NPC_Y chủ động HOSTILE lượt 23
(`npc_last_initiated[hostile](NPC_Y)=23`), WHEN kiểm lượt 25: NPC_B đủ
điều kiện D.4 riêng nhưng `global_window_ready(25)=false` (count 1 ≥
CAP 1) → hook rơi về `ambient`; WHEN kiểm lượt 27:
`global_window_ready(27)=true` NHƯNG `per_npc_ready(NPC_Y, hostile,
27)=(27−23=4<5)=false` → NPC_Y vẫn khóa nhánh hostile; VÀ
`npc_last_initiated[friendly](NPC_Y)=null` → nếu NPC_Y đủ điều kiện
friendly candidate lượt 27, `cooldown_ok(NPC_Y, friendly, 27)=true` —
tracker tách sắc thái hoạt động độc lập (quyết định 2026-08-03). *(unit,
regression neo số)*

**AC-27** (D.6 — thứ tự tier + trần 4 phần tử, khớp ví dụ GDD): GIVEN
hook NPC-initiated hostile NPC_Y (`hook_participants={NPC_Y}`),
`canon_role_npcs("tuu_lau")={NPC_B}`, `other_present_npcs={NPC_A}`, WHEN
tính `entities_in_scope`, THEN = `{"global", NPC_Y, NPC_B, NPC_A}` —
NPC_Y tier 0, NPC_B tier 1, NPC_A tier 2, ĐÚNG 4 phần tử. *(unit,
regression neo số)*

**AC-28** (D.6 — cắt khi vượt trần, log content-gap): GIVEN
`|hook_participants|=4` (giả lập Full Vision, vượt `MAX_NPC_PER_SCENE=3`)
với `role_priority` phân biệt, WHEN tính `entities_in_scope`, THEN chỉ 3
NPC `role_priority` thấp nhất trong tier 0 được giữ (`role_priority ASC,
npc_id ASC`), NPC còn lại bị loại hoàn toàn; VÀ 1 log warning "content
gap" phát ra (mock logger spy = 1), không crash. *(unit, mock logger)*

**AC-29** (D.7 — khớp 2 ví dụ GDD): GIVEN `player_level=35`, knob mặc
định, WHEN tính `encounter_level_range(35)`, THEN = `[20, 50]`; GIVEN
`player_level=5`, THEN = `[1, 20]` (sàn tự nhiên chặn ở 1). *(unit,
regression neo số)*

**AC-30** (D.7 — bất biến cap ≤ 20, property-based 1.000 mẫu seeded):
GIVEN RNG seeded sinh 1.000 `player_level` ngẫu nhiên đều trong
`[1,200]`, WHEN tính `encounter_level_range` với
`AMBIENT_HOSTILE_LEVEL_CAP` ở biên safe-range 5/15/20, THEN với MỌI mẫu:
`range.upper − player_level ≤ HOSTILE_INITIATIVE_LEVEL_GAP_MAX=20` —
không tổ hợp nào phá bất biến tự-mâu-thuẫn-với-D.2. *(unit,
property-based seeded)*

### Edge Cases

**AC-31** (fallback suggestion → map cứng envelope): GIVEN Turn Manager
(mock) trả "Quan sát xung quanh", "Chờ đợi", "Rời đi" sau retry thất
bại, WHEN map sang envelope, THEN lần lượt = `investigate`, `rp_only`,
`move_to(location kề đầu tiên theo thứ tự khai trong data)`; GIVEN
`adjacent(location_id)=∅` tại thời điểm map "Rời đi", THEN thay bằng
`rp_only`. *(unit)*

**AC-32** (menu tối giản hợp lệ): GIVEN scene không NPC present, không
`"private"`, không Suspended, không `npc_in_danger`, WHEN tính menu,
THEN = ĐÚNG `{move_to[...kề], investigate, rp_only}`, không throw, không
log warning nào — lượt "khoảng lặng" hợp lệ theo thiết kế. *(unit)*

**AC-33** (`adjacent=∅` loại `move_to`, log content-gap, không crash):
GIVEN `adjacent(location_id)=∅` (lỗi authoring), WHEN tính menu, THEN
`move_to` không có trong menu, 1 log warning "content gap" phát ra
(spy=1), không exception. *(unit, mock logger)*

**AC-34** (NPC giữ `provoked_flag` chết trước khi tiêu thụ —
provisional): GIVEN `provoked_flag(npc_X)=true` chưa tiêu thụ, mock
Death & Consequence phát npc_X chết, WHEN dữ liệu NPC dọn theo interface
provisional, THEN `provoked_flag(npc_X)` không còn ảnh hưởng D.4/D.2
(npc_X không thể là candidate). *(unit + mock D&C,
provisional-interface)*

**AC-35** (nhiều canon Due cùng lượt): GIVEN mock
`canon_due_payload(turn).resolved_events = [event_A, event_B]` (đã sắp
theo `resolution_order` upstream), WHEN `select_primary_hook(turn)`,
THEN trả `canon_hook(event_A)` CHỈ phần tử đầu; VÀ `scene_tags` lượt đó
chứa tag `canon_bg_event_B` (event nền không mất — fix 2026-08-03; fact
của event_B đã tự có qua field `canon_event_event_B_status` do Setting
& Canon khóa). *(unit)*

**AC-36** (affinity đổi giữa lượt KHÔNG tính lại menu): GIVEN menu đã
tính tại Scene Locked với `affinity(npc_B)=65` (song_tu_action hợp lệ),
sau đó `affinity(npc_B)` tụt xuống 30 do sự kiện xen giữa TRONG cùng
lượt, WHEN kiểm menu HIỆN TẠI (chưa sang lượt mới), THEN VẪN chứa
`song_tu_action[npc_B]` — gate chỉ đánh giá 1 lần tại thời điểm khóa
cảnh; hệ quả chỉ thấy ở lượt kế. *(unit)*

**AC-37** (candidate không được chọn không tốn cooldown): GIVEN lượt 23
có NPC_Y (hostile, được chọn) và NPC_B (friendly, không được chọn, cả
hai đủ điều kiện D.4), WHEN kiểm `npc_last_initiated[friendly](NPC_B)`
sau lượt 23, THEN VẪN = giá trị trước lượt 23 — NPC_B không bị "phạt" vì
thua tie-break. *(unit)*

**AC-38** (load/restore tính lại menu giống hệt): GIVEN `turn_snapshot`
lưu scene + tracker tại Awaiting Player Action, WHEN load lại (mock
Persistence), THEN scene khôi phục y hệt VÀ `allowed_envelope_menu` tính
lại GIỐNG HỆT tập trước khi lưu; GIVEN `world_time=0` (khởi tạo mới),
THEN scene đọc từ setting pack, `active_hook=ambient_hook()`, không lỗi
thiếu dữ liệu. *(unit + mock Persistence)*

### Integration / Cross-System

**AC-39** (Turn Manager Undo — rollback toàn bộ tracker; phần AI
advisory): GIVEN snapshot X trước lượt N; lượt N gồm NPC_Y chủ động
hostile, `threaten` set `provoked_flag`, `gift` tiêu thụ cooldown, WHEN
Turn Manager Undo (mock TM), THEN toàn bộ tracker (`provoked_flag`, mọi
`last_used`, CẢ 2 tracker `npc_last_initiated[hostile/friendly]`, lịch
sử hook cửa sổ D.5) về đúng snapshot X — không rollback một phần; VÀ
`allowed_envelope_menu` tính lại từ cảnh khôi phục GIỐNG HỆT menu trước
lượt N. **Phần AI** (ADVISORY, không blocking): 4 gợi ý sinh mới sau
undo có thể khác nội dung lần trước (non-deterministic, đúng TM Rule
#5) — chỉ assert `suggestion_call` được gọi lại đúng 1 lần với payload =
cảnh khôi phục + menu khôi phục, không assert nội dung text. *(unit +
mock Turn Manager — phần menu BLOCKING, phần nội dung AI ADVISORY)*

**AC-40** (Setting & Canon — `canon_role_rescue` không liệt kê sẵn
`char_id`): GIVEN mock Setting & Canon trả `∃E: status(E)=Suspended`,
WHEN tính menu, THEN `canon_role_rescue` có trong menu nhưng KHÔNG kèm
danh sách `char_id` cụ thể (interface inspection: payload menu loại này
không có trường liệt kê ứng viên) — `char_id` chỉ đến từ input người
chơi khi resolve. *(unit + mock consumer)*

**AC-41** (EXP soft dependency — thiếu level không crash): GIVEN mock
EXP trả `level(npc)=null`/lỗi, WHEN tính `hostile_initiative_allowed`
(D.2), THEN mặc định = `true`, không throw; WHEN tính
`encounter_level_range(player_level=null)` (D.7), THEN không scale theo
level, trả fallback cố định định nghĩa sẵn trong code, không crash.
*(unit + mock EXP failure)*

## Open Questions

- **Sửa schema `suggestion_call` của `ai-llm-integration-layer.md`**
  (Designed — Pending Review): từ array[4] string → array[4] `{text,
  envelope}`; validate whitelist nằm ở phía hệ này (Core Rule #3). Sửa
  nhỏ nhưng phải đối chiếu chính thức, không sửa lén. *(Owner:
  systems-designer, target: `/consistency-check` phiên tới + trước
  `/design-review` của GDD đó)*
- **Authoring đồ thị location + bảng presence NPC + scene_tags data**
  cho vùng MVP Đấu La Đại Lục (~5–8 địa điểm, 3 NPC) — content thật,
  quyết định giá trị thật. *(Owner: narrative-director + world-builder,
  target: trước vertical slice — cùng nhóm authoring 2–3 canon event của
  GDD #10)*
- **Xử lý Hảo cảm cho trận `spar_friendly`**: cờ đã chuẩn hóa ở envelope
  `combat_challenge` (đóng Open Question GDD #9 về taxonomy), nhưng GDD
  #9 scope-cut MVP chưa phân biệt delta đấu thân thiện vs địch ý —
  `combat_win/loss_vs_npc` hiện áp cùng delta. *(Owner:
  systems-designer, target: rà khi `/design-review` GDD #9 hoặc
  `/quick-design` bổ sung)*
- **Chỉ số đầy đủ của đối thủ ambient**: D.7 sinh `level`; chỉ số chi
  tiết kỳ vọng dùng `stat_growth` (EXP, registry) với level đó — Combat
  cần xác nhận pipeline sinh đối thủ này khi implement. *(Owner:
  systems-designer, target: `/consistency-check` + `/create-architecture`)*
- **~~Interface Death & Consequence~~** (provisional) — **đã thiết kế
  2026-08-03** (`death-and-consequence.md`, hệ #12): dọn presence +
  `provoked_flag` khi NPC chết; tiêu thụ witness list
  (`entities_in_scope`) cho `kill_witnessed`. Interface khớp đúng những
  gì hệ này đã để ngỏ — không có xung đột.
- **Điều kiện trigger `external_abort_signal` cho Combat** (mới
  2026-08-03, từ sửa đổi `combat-system.md` Core Rule #8/#13 — bỏ trần
  cứng `MAX_EXCHANGE_COUNT`, thay bằng đường "tình huống khẩn cấp xen
  ngang trận đấu"): hệ này SỞ HỮU quyết định KHI NÀO set
  `requested:true` (VD: một sự kiện canon/scene nghiêm trọng cần ngắt
  trận đang diễn ra) — Combat chỉ định nghĩa phía lắng nghe, không định
  nghĩa điều kiện trigger. Cần: (a) danh sách tình huống nào đủ "khẩn
  cấp" để ngắt trận, (b) hệ này gọi API nào của Combat để set tín hiệu,
  (c) `reason_tag` (opaque với Combat) nên chứa gì để tường thuật hợp
  lý. *(Owner: narrative-director + game-designer, target:
  `/design-system` retrofit hoặc chỉnh sửa trực tiếp cho hệ này trước
  khi `combat-system.md` qua `/design-review`)*
- **UX spec cho chip intent + nudge heuristic + header cảnh**: cần
  `/ux-design` cho màn hình chơi chính trước khi viết epics (xem UX Flag
  ở UI Requirements). *(Owner: ux-designer, target: Pre-Production)*
