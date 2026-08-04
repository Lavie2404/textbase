# Setting & Canon Integration

> **Status**: Designed — Pending Review
> **Author**: user + agents
> **Last Updated**: 2026-08-03
> **Implements Pillar**: Pillar 1 (Thế Giới Khách Quan), Pillar 2 (Hệ Quả Thực Sự); nền cho aesthetic Discovery & đặc quyền xuyên không

## Overview

**Setting & Canon Integration** là hệ thống sở hữu **toàn bộ tri thức về
danh tác nền** mà người chơi chọn làm thế giới (Đấu La Đại Lục, Phàm Nhân
Tu Tiên...): hồ sơ nhân vật nguyên tác (danh tính thật, kể cả khi cải
trang), dòng sự kiện canon, **tiền đề nhân quả** của từng sự kiện (điều
kiện khiến sự kiện đó xảy ra như nguyên tác), và dữ liệu luật thế giới
theo bối cảnh — trong đó có `breakthrough_requirement` (điều kiện đột phá
bậc, VD: Hồn Hoàn) mà EXP & Realm Progression phụ thuộc cứng. Với người
chơi, đây là hệ thống hiện thực hóa fantasy **xuyên không**: bước vào thế
giới đã thuộc lòng, biết trước ai là ai (kể cả nhân vật lớn đang cải
trang) và chuyện gì sắp đến — rồi dùng chính hiểu biết đó để **phá vỡ
định mệnh**: bẻ gãy tiền đề nhân quả của một sự kiện canon (cứu người lẽ
ra phải chết, hóa giải mối thù lẽ ra phải nổ ra) và nhìn thế giới rẽ sang
nhánh mới không còn ràng buộc bởi nguyên tác.

Về mặt kiến trúc, hệ này là **trọng tài canon duy nhất**: nó — chứ không
phải AI — phán quyết sự kiện nào cố định (lực đẩy vĩ mô có nguyên nhân
độc lập với người chơi), sự kiện nào phụ thuộc tiền đề có thể phá vỡ, và
tiền đề nào ĐÃ bị phá tại thời điểm nào (`canon_break_flag` khóa vào
`locked_result`, đúng Khế Ước Cơ Học/Tường Thuật — AI chỉ tường thuật
nhánh rẽ, không tự quyết). Các hệ tiêu thụ: EXP đọc
`breakthrough_requirement_met`; Character Card đọc quy tắc danh tính/cải
trang; Situation/Encounter Generation đọc trạng thái canon để tạo tình
huống đúng dòng thời gian; World Memory ghi sự kiện phá canon thành fact
vĩnh viễn (và để ngỏ `importance_score` cho hệ này chấm điểm tầm quan
trọng sự kiện).

## Player Fantasy

*(`creative-director` không được tham vấn — Lean mode, không phải section
rủi ro cao theo quy tắc skill.)*

Người chơi trải nghiệm hệ này ở **cả hai tầng**. **Trực tiếp**: đây là
fantasy của **kẻ biết trước** — bước vào Đấu La Đại Lục với toàn bộ ký ức
về nguyên tác, người chơi chủ động khai thác lợi thế thông tin: nhận ra
"Vương Đông" chính là Đường Vũ Đồng khi mọi NPC khác còn bị lừa, chuẩn bị
trước cho đại nạn sắp đến, đón đầu cơ duyên trước cả nhân vật chính
nguyên tác. Lợi thế này thuần túy là **thông tin của người chơi** — thế
giới không hề biết và không nể nang: NPC vẫn đối xử theo thực lực thật
(Pillar 1), nên biết trước chỉ có giá trị khi người chơi đủ giỏi để hành
động dựa trên nó.

**Gián tiếp**: cảm giác **sống trong danh tác yêu thích** một cách chân
thực — thế giới vận hành đúng luật mình thuộc lòng: đúng người xuất hiện
đúng nơi, sự kiện lớn diễn tiến đúng nhịp nguyên tác chừng nào chưa ai
chạm vào tiền đề của nó, điều kiện đột phá đúng như trong truyện (muốn
lên bậc phải săn Hồn Hoàn, không có lối tắt). Người chơi không thấy bộ
máy phán quyết — họ chỉ thấy một thế giới nhất quán đến mức tin được.

Đỉnh của fantasy là khoảnh khắc **phá vỡ định mệnh**: dùng hiểu biết +
thực lực để bẻ gãy một tiền đề nhân quả — cứu người "chắc chắn phải
chết", hóa giải mối thù "chắc chắn phải nổ ra" — và nhìn thế giới THẬT SỰ
rẽ nhánh, vĩnh viễn, không quay lại nguyên tác nữa (Pillar 2: Hệ Quả
Thực Sự). Cảm giác đúng: định mệnh không phải kịch bản bất khả xâm phạm,
cũng không phải thứ đổi được bằng ý muốn — nó là một cấu trúc nhân quả có
thật mà người đủ hiểu và đủ mạnh có thể can thiệp. "Thế giới khách quan,
nhưng không bất biến trước một người chơi đủ giỏi."

## Detailed Design

### Core Rules

1. **Setting pack là nguồn chân lý bối cảnh**: mỗi danh tác là một bộ
   data (setting pack) gồm: hồ sơ nhân vật nguyên tác, hồ sơ sự kiện
   canon, và luật thế giới theo bối cảnh (`breakthrough_requirement`
   theo tier, tên cảnh giới, quy tắc đặc thù). MVP: 1 setting (VD: Đấu
   La Đại Lục), 1 vùng, data tối thiểu đủ cho 3 NPC + 2–3 sự kiện canon.
2. **Hồ sơ nhân vật nguyên tác**: `{char_id, true_identity, danh sách bí
   danh/cải trang, is_major_canon, hồ sơ level/tier, vai trong các sự
   kiện}`. **Đặc quyền xuyên không**: với `is_major_canon=true`,
   Character Card của người chơi LUÔN hiển thị danh tính thật kể cả khi
   đang cải trang; NPC thường thì chỉ hiển thị "đang che giấu/dịch
   dung". Đặc quyền là THÔNG TIN người chơi — không đổi world-state:
   các NPC khác vẫn bị lừa cho đến khi danh tính lộ qua diễn biến (đúng
   `game-concept.md` mục Bối Cảnh).
3. **Hồ sơ sự kiện canon**: `{event_id, trigger_condition (predicate
   world-state), earliest_world_time, roles[] (vai + yêu cầu đủ điều
   kiện + nhân vật đang gắn), premises[] (tiền đề — predicate cơ học +
   chính sách on_break riêng), canon_outcome (hệ quả cơ học + tóm tắt
   tường thuật cho AI), status}`.
4. **Rubric phá vỡ (giải cờ HIGH-RISK — quyết định người dùng
   2026-08-03)**: **MỌI sự kiện canon đều phá vỡ được** — không tồn tại
   sự kiện bất khả xâm phạm. Phá = làm sai ≥1 premise. Chính sách xử lý
   theo `on_break` của premise bị phá, ưu tiên theo thứ tự:
   - **`substitute` (mặc định)**: premise gắn một VAI thay thế được →
     thế giới tìm nhân vật khác đủ điều kiện lấp vai (chọn cơ học, xem
     Formulas D.3) — sự kiện vẫn diễn ra dạng biến thể. Đây là cách mô
     hình "lực đẩy vĩ mô": giết sứ giả Vũ Hồn Điện thì sứ giả khác đến,
     chiến tranh vẫn nổ ra.
   - **`vanish`**: premise là LÕI TỒN TẠI của sự kiện (VD: Tiểu Vũ
     trong "Tiểu Vũ hiến tế" — cướp Tiểu Vũ làm vợ trước thời điểm đó
     thì sự kiện hiến tế không còn tồn tại) → sự kiện vào trạng thái
     **Suspended (treo)** chờ biến mất — KHÔNG biến mất tức thì: người
     chơi có thể "cứu" sự kiện bằng cách mô tả vai thay thế qua ô nhập
     hành động tự do trước khi sự kiện đến hạn (quyết định người dùng
     2026-08-03, "ưu tiên trải nghiệm người chơi" — xem Core Rule #4b).
     Đến hạn mà vai lõi vẫn trống → **Vanished** chính thức, mọi sự
     kiện downstream phụ thuộc nó (premise `event_completed`) bị kiểm
     tra dây chuyền tại thời điểm đó.
   - **`branch`**: data khai sẵn nhánh thay thế cụ thể (sự kiện khác
     kích hoạt thay).

   **Rule #4b — Người chơi cứu sự kiện bị phá lõi**: khi một sự kiện ở
   trạng thái Suspended, một hành động tự do của người chơi được
   Situation/Encounter Generation phân loại là `canon_role_rescue`
   (đề cử/tạo nhân vật thay vai lõi cho sự kiện đó — provisional) sẽ
   được PHÁN QUYẾT CƠ HỌC: nhân vật được đề cử phải qua kiểm tra
   eligibility của Formulas D.3 (sống, đúng khoảng tier của vai, đúng
   phe, không bị loại trừ). Hợp lệ → vai được gắn lại, sự kiện →
   Dormant-Modified (tiếp tục tồn tại dạng biến thể, khóa
   `canon_role_filled_[npc_id]`); không hợp lệ → hành động vẫn diễn ra
   về mặt tường thuật nhưng sự kiện KHÔNG được cứu (kết quả phán quyết
   khóa trước khi AI tường thuật — đúng Khế Ước, AI không quyết).

   **Tie-break tự động** (khi người chơi không can thiệp, 1 event có
   nhiều premise bị phá cùng lúc với chính sách khác nhau): **`vanish`
   > `branch` > `substitute`** — vi phạm lõi tồn tại là tuyệt đối;
   branch là nhánh đã tác giả hóa; substitute là fallback nhẹ nhất.
5. **Phán quyết thuần cơ học — không AI**: premise là predicate trên
   world-state cơ học: `alive(X)`, `affinity(X) so ngưỡng`,
   `possesses(X, item)`, `location(X)`, `world_time`,
   `event_completed(E)`, `song_tu_active(X)`... Không lệnh gọi AI nào
   tham gia phán quyết (giữ `calls_per_turn ≤ 3`); AI chỉ nhận kết quả
   đã khóa (phá/thay vai/biến mất) để tường thuật — đúng Khế Ước Cơ
   Học/Tường Thuật.
6. **Phát hiện eager/lazy**: premise **không đảo được** sai (nhân vật
   chết, vật phẩm bị hủy, sự kiện upstream đã vanish) → khóa
   `canon_break_flag` **NGAY lượt đó** vào `locked_result`
   (`{event_id, premise bị phá, resolution}`) — người chơi thấy định
   mệnh gãy ngay khoảnh khắc gây ra nó. Premise **đảo được** (Hảo cảm,
   vị trí, sở hữu có thể lấy lại) → chỉ phán quyết tại thời điểm sự
   kiện đến hạn.
7. **Sự kiện đến hạn**: khi `trigger_condition=true` VÀ `world_time ≥
   earliest_world_time` → hệ này phán quyết trạng thái cuối (Canon
   nguyên bản / Substituted / Vanished / Branched) trong cùng lượt,
   khóa kết quả, phát cho Situation/Encounter Generation dựng tình
   huống tương ứng (provisional — hệ đó nay đã Designed).
8. **`breakthrough_requirement` data**: mỗi setting định nghĩa predicate
   cơ học theo tier (VD Đấu La: đã hấp thụ Hồn Hoàn phù hợp cho tier
   kế). Hệ này cung cấp evaluation `breakthrough_requirement_met(tier)`
   — đóng interface provisional mà `exp-realm-progression.md` Core Rule
   #6 chờ.
9. **`importance_score` cho World Memory (quyết định người dùng: định
   nghĩa ngay)**: hệ này sở hữu bảng trọng số tầm quan trọng theo loại
   fact (Formulas D.5); World Memory có thể chuyển key chọn fact từ
   recency thuần sang `(importance_tier giảm dần, world_time giảm dần)`
   — đúng khe cắm mà WM Formula #3 đã để ngỏ, không đổi cấu trúc công
   thức WM.
10. **Tuân thủ vòng đời lượt**: mọi thay đổi status sự kiện/
    `canon_break_flag` tuân Turn Manager Core Rule #8 — chưa final đến
    khi lượt xác nhận và không undo; undo hoàn tác cả phán quyết canon
    của lượt (trừ lượt chết thật vốn không undo được).

### States and Transitions

Mỗi canon event một instance:

| State | Điều kiện | Chuyển sang |
|---|---|---|
| Dormant | Trigger chưa thỏa hoặc chưa tới `earliest_world_time`; mọi premise lõi còn đúng | → Due (trigger + earliest thỏa) HOẶC → Suspended (premise `on_break=vanish` bị phá không-đảo-được — eager, `canon_break_flag` khóa ngay) HOẶC → Dormant-Modified (premise `on_break=substitute/branch` bị phá không-đảo-được — ghi flag, chờ đến hạn xử lý) |
| Dormant-Modified | Đã có premise bị phá vĩnh viễn, chính sách substitute/branch — sự kiện vẫn sẽ đến nhưng dạng biến thể | → Due (như Dormant) HOẶC → Suspended (nếu sau đó premise `on_break=vanish` khác cũng bị phá) |
| Suspended | Vai lõi bị trống (premise vanish đã phá vĩnh viễn) — sự kiện "treo", chờ người chơi cứu hoặc biến mất khi đến hạn. Cascade CHƯA chạy | → Dormant-Modified (người chơi cứu thành công qua `canon_role_rescue` — Rule #4b) HOẶC → Vanished (đến hạn mà vai lõi vẫn trống — cascade chạy TẠI ĐÂY) |
| Due | Đến hạn — phán quyết trong lượt hiện tại | → Resolved-Canon (mọi premise đúng) / Resolved-Substituted (rebind vai thành công) / Branched (kích hoạt sự kiện nhánh) / Vanished (tie-break tự động chọn vanish, hoặc substitute thất bại không còn ai đủ điều kiện) |
| Resolved-Canon / Resolved-Substituted / Branched / Vanished | Terminal — ghi vào World Memory dạng fact | (không chuyển tiếp; sự kiện downstream đọc qua premise `event_completed`) |

### Interactions with Other Systems

- **EXP & Realm Progression** (downstream, Designed): cung cấp
  `breakthrough_requirement_met(tier)` — predicate đánh giá mỗi lượt khi
  nhân vật ở Chờ Đột Phá. Đóng dependency HARD của GDD đó.
- **World Memory** (upstream + downstream, Designed): ĐỌC fact theo
  `entity_id` để đánh giá premise cần lịch sử; GHI `canon_break_flag`/
  kết quả sự kiện thành field trong `locked_result` (fact vĩnh viễn);
  CUNG CẤP bảng trọng số `importance_score` cho công thức chọn fact của
  WM.
- **NPC Affinity & Relationship** (upstream, Designed): đọc `affinity`,
  `song_tu_active`, cờ thù địch sâu sắc làm predicate premise (VD tiền
  đề "Tiểu Vũ chưa thuộc về ai" phá bằng quan hệ Song Tu).
- **Death & Consequence** (upstream, đã Designed, provisional): nguồn
  premise-break "chết" quan trọng nhất — sự kiện NPC chết kích hoạt
  kiểm tra eager mọi premise `alive(X)`.
- **Situation/Encounter Generation** (downstream, đã Designed,
  provisional): tiêu thụ trạng thái sự kiện Due/Resolved để dựng tình
  huống đúng dòng canon; nhận `canon_outcome` narrative summary làm
  nguyên liệu.
- **Character Card & Identity** (downstream, đã Designed): đọc hồ sơ
  nhân vật nguyên tác — danh tính thật (major canon), trạng thái cải
  trang, hồ sơ tier.
- **Turn Manager / Mechanic-Narration Contract Enforcement** (upstream,
  hard): vòng đời lượt (deferred-commit, undo) + khóa mọi phán quyết
  trước tường thuật.

## Formulas

*(Đề xuất bởi `systems-designer`; người dùng chốt 2026-08-03: tie-break
tự động `vanish > branch > substitute` + cơ chế người-chơi-cứu-sự-kiện
(Suspended, Core Rule #4b). Mọi field trong `locked_result` là số
nguyên/boolean/enum; không AI call nào trong phán quyết.)*

### D.0 — Kiến trúc: `world_state` là adapter, không phải kho dữ liệu riêng

Hệ này **không lưu bản sao world-state của riêng nó**. `world_state`
trong mọi công thức là lớp truy vấn mỏng gọi thẳng interface đọc của hệ
sở hữu dữ liệu — đúng vai "trọng tài", không phải "chủ đất":

| Predicate | Hệ sở hữu thật | Interface đọc |
|---|---|---|
| `alive(X)` | Death & Consequence (đã Designed) | cờ boolean per-char |
| `affinity(X) so ngưỡng` | NPC Affinity & Relationship | `A_after` sau `resolve_turn_affinity` |
| `possesses(X, item)` | Equipment/Inventory | cờ sở hữu + cờ `destroyed` |
| `location(X)` | Situation Gen (provisional) | vị trí hiện tại |
| `world_time` | Turn Manager | `world_time_advancement` (registry) |
| `event_completed(E)` | **Chính hệ này** | `status(E)` — xem D.1 |
| `song_tu_active(X, npc)` | NPC Affinity | tập active (registry `song_tu_active`) |
| `custom_flag(flag_id)` | Hệ cơ học bất kỳ ghi flag vào `locked_result` | boolean, theo data setting-pack |

Mọi truy vấn là **O(1) trên state hiện tại**, không bao giờ quét lịch sử.

### D.1 — premise_satisfied(premise, world_state)

`premise_satisfied(premise, world_state) = EVAL[premise.type](premise.args, world_state)`

**Tập premise type chuẩn (8 loại) + tính đảo được** (quyết định
eager/lazy theo Core Rule #6):

| `type` | Predicate | Đảo được? | Lý do |
|---|---|---|---|
| `alive` | `alive(char_id) == true` | **KHÔNG** | Chết là chết thật (Anti-Pillar) — false thì false mãi |
| `affinity_at_least` | `affinity(npc_id) ≥ threshold` | **CÓ** | Hảo cảm lên xuống bình thường |
| `affinity_at_most` | `affinity(npc_id) ≤ threshold` | **CÓ** | Cùng lý do |
| `possesses` | `possesses(char_id, item_id) == true` | **CÓ, TRỪ KHI** `item.destroyed == true` | Sở hữu lấy lại được; vật phẩm bị hủy là trạng thái vĩnh viễn riêng |
| `at_location` | `location(char_id) == location_id` | **CÓ** | Di chuyển lại được |
| `event_completed` | `status(E) ∈ {Resolved-Canon, Resolved-Substituted, Branched}` (KHÔNG gồm Vanished) | **KHÔNG** | Status terminal — đúng thì đúng mãi; Vanished thì không bao giờ đúng nữa |
| `world_time_reached` | `world_time ≥ threshold` | **KHÔNG** | world_time monotonic |
| `song_tu_active` | `npc_id ∈ active_song_tu_set(char_id)` | **CÓ** | Active ↔ Broken ↔ Active lại được |
| `custom_flag` | `flag(flag_id) == expected_value` | **Khai tường minh trong data**, mặc định `reversible=false` | An toàn hướng eager-check thay vì bỏ sót break |

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Loại premise | `premise.type` | enum | 8 giá trị trên | Loại predicate |
| Tham số | `premise.args` | struct | tùy type | VD `{npc_id, threshold}` |
| Tính đảo được | `reversible(premise.type)` | bool | {0,1} | Tra bảng — quyết định eager (false) hay lazy (true) |
| Kết quả | `premise_satisfied` | bool | {0,1} | Không có trạng thái "chưa biết" — mọi predicate đọc dữ liệu cơ học đã khóa |

**Output Range:** boolean. **Ví dụ 1** (đảo được): `{type:
affinity_at_least, npc_id: "duong_vu_dong", threshold: 60}` (đúng
`song_tu_threshold` registry), affinity=72 → true. **Ví dụ 2** (không
đảo được): `{type: alive, char_id: "tieu_vu"}`, Tiểu Vũ vừa chết →
false, `reversible=false` → break **eager** ngay lượt đó.

### D.2 — event_due(event) + thứ tự nhiều event cùng Due

```
is_due(event) = trigger_condition(event, world_state)
             AND world_time ≥ earliest_world_time(event)
             AND status(event) ∈ {Dormant, Dormant-Modified, Suspended}
resolution_order = sort(due_this_turn, key=(earliest_world_time ASC, event_id ASC))
```

Xử lý TUẦN TỰ theo `resolution_order` — "sự kiện lẽ ra xảy ra trước xử
lý trước", `event_id` (chuỗi, tăng dần) là tie-break ổn định cuối. NPC
đã được chọn làm substitute trong lượt bị loại khỏi pool của các event
Due sau trong CÙNG lượt (`substitutes_used_this_turn`) — một NPC không
thay vai 2 sự kiện trong 1 lượt.

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Điều kiện khởi phát | `trigger_condition` | bool | {0,1} | Predicate riêng của event (điều kiện KHỞI PHÁT — khác premises[] là điều kiện DUY TRÌ) |
| Mốc sớm nhất | `earliest_world_time` | int | [1,∞) | Data setting-pack |
| Tập Due lượt này | `due_this_turn` | set | 0 → số event active | Chặn trên bởi event ACTIVE — giảm dần theo thời gian chơi, quét O(active_events)/lượt |

**Output Range:** tập hữu hạn, không tăng theo world_time. **Ví dụ**: 2
event cùng `earliest_world_time=30` Due tại world_time=32 → tie-break
`event_id`: `"e03..." < "e07..."` → xử lý e03 trước; nếu e03 dùng
`npc_012` làm substitute thì e07 loại `npc_012` khỏi pool lượt này.

### D.3 — substitute_selection(role) — thuần cơ học, deterministic

```
eligible(c, role) = alive(c)
                 AND tier(c) ∈ [role.tier_min, role.tier_max]
                 AND (role.allowed_factions = ∅ OR faction(c) ∈ role.allowed_factions)
                 AND c ∉ role.excluded_ids
                 AND c ∉ substitutes_used_this_turn
fit_score(c, role) = |tier(c) − role.target_tier|
substitute_selection(role) = argmin over eligible của (fit_score, candidate_id)
```

Không RNG, không AI — cùng world_state chạy 1.000 lần ra đúng 1 kết
quả (phán quyết canon phải deterministic, khác `song_tu_action` vốn là
RNG). Pool rỗng → trả `NULL` → fallback theo ngữ cảnh gọi (Due:
Vanished; rescue: không cứu được). Cùng một hàm `eligible` dùng cho
kiểm tra đề cử của người chơi (Core Rule #4b).

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Khoảng tier vai | `role.tier_min/max` | int | 1–∞ | Data setting-pack |
| Tier lý tưởng | `role.target_tier` | int | 1–∞ | Thường = tier nhân vật gốc bị mất |
| Phe cho phép | `role.allowed_factions` | set\|∅ | data | ∅ = không giới hạn |
| Loại trừ | `role.excluded_ids` | set | data | VD loại người chơi khỏi vai phản diện |
| Đã dùng lượt này | `substitutes_used_this_turn` | set | runtime, reset đầu lượt | Chặn double-booking (D.2) |
| Kết quả | `substitute_selection` | char_id \| NULL | — | NULL ⇒ fallback |

**Output Range:** char_id hợp lệ hoặc NULL — không có giá trị thứ 3.
**Ví dụ** (nhiều ứng viên bằng điểm): vai tier 2–4 (target 3), phe Vũ
Hồn Điện; `npc_004` (tier 3, fit=0) và `npc_012` (tier 3, fit=0) hòa →
tie-break id: chọn `npc_004`; `npc_099` (tier 3, sai phe) loại từ đầu.

### D.4 — cascade_vanish_check(event)

**Ràng buộc authoring bắt buộc**: đồ thị phụ thuộc "event B phụ thuộc
event A qua premise `event_completed(A)`" **PHẢI là DAG** — validate ở
bước load setting-pack (lỗi authoring, không phải runtime). Chỉ mục
ngược `downstream_index: event_id → [event phụ thuộc]` precomputed lúc
load — tra O(1), duyệt O(out-degree).

```
cascade_vanish_check(E, world_state, visited = ∅):   // CHỈ gọi khi E Vanished CHÍNH THỨC
  IF E.id ∈ visited: RETURN []                        // guard chống chu trình (log lỗi authoring, không crash)
  visited.add(E.id)
  affected = []
  FOR D IN downstream_index[E.id] WHERE status(D) ∈ {Dormant, Dormant-Modified, Suspended}:
    p = premise type=event_completed target=E.id của D
    // p không đảo được và giờ vĩnh viễn false → áp on_break của p:
    //   vanish → D vào Suspended (nếu chưa đến hạn — người chơi còn cơ hội cứu)
    //            hoặc Vanished (nếu D đang Due/đến hạn) → đệ quy tầng kế
    //   substitute/branch → D vào Dormant-Modified (xử lý tại Due)
    affected.append((D.id, resolution))
    IF resolution == Vanished: affected += cascade_vanish_check(D, world_state, visited)
  RETURN affected
```

DAG hữu hạn + visited-guard → **luôn kết thúc**. `affected` chặn trên
bởi tổng event trong setting-pack (hàng chục ở Full Vision) — không
tăng theo world_time.

**Ví dụ 2 tầng**: E1 "Tiểu Vũ hiến tế" Vanished chính thức → E2 "chiến
tranh trả thù" (premise `event_completed(E1)`, on_break=vanish, chưa
đến hạn) → Suspended (còn cứu được); nếu E2 sau đó Vanished → E3
(on_break=substitute) → Dormant-Modified, thử thay vai tại Due — cascade
dừng khi không còn Vanished mới.

### D.5 — importance_score(fact) cho World Memory

Bảng trọng số rule-based THUẦN từ `field_name`/`field_value` của fact
(WM trích fact rule-based từ `locked_result` — tier phải suy ra được
không cần đọc world-state ngoài):

| `importance_tier` | Loại fact | Rule khớp |
|---|---|---|
| **3** | canon break / kết quả event, chết NPC | `canon_event_[id]_status` (terminal bất kỳ), `canon_break_flag_[id]=true`, `death_flag_[char]=true` *(provisional)* |
| **2** | đột phá tier, affinity swing lớn | `breakthrough_flag_[char]=true` *(provisional)*, `affinity_delta_[npc]` với \|value\| ≥ `AFFINITY_MAGNITUDE_TIER2` |
| **1** | combat outcome | `battle_result_[char]` *(provisional — Combat chưa đặt tên field enum outcome)* |
| **0** | delta thường | mọi field `has_signal=true` khác |

```
importance_tier(fact) = TIER_RULE(fact.field_name, fact.field_value)   // pure function, O(1)
selected_facts(entity_id) = top_K(facts(entity_id),
                                   key = (importance_tier DESC, world_time DESC),
                                   K = max_facts_per_entity)
```

Thay đúng khe cắm `key` của `entity_fact_selection` (WM Formula #3) —
cấu trúc `top_K` và bất biến `|selected| ≤ max_facts_per_entity` không
đổi. **Tương thích ngược**: mọi fact cùng tier → key suy biến thành
`(world_time DESC)` = recency thuần (hành vi WM hiện tại). **Ghi chú
proxy**: fact chỉ chứa delta (không có A_before/A_after) nên "vượt
ngưỡng affinity" phát hiện bằng BIÊN ĐỘ delta làm proxy — compromise có
chủ đích, không phải phát hiện ngưỡng chính xác 100%.

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Tên field | `fact.field_name` | string | quy ước entity_id WM | Input rule matching |
| Giá trị | `fact.field_value` | numeric\|bool\|enum | tùy field | Chỉ dùng magnitude |
| Ngưỡng biên độ tier 2 | `AFFINITY_MAGNITUDE_TIER2` | int (knob) | 10–25 | Mặc định 15 |
| Kết quả | `importance_tier` | int | {0,1,2,3} | Compact, rule-based |

**Ví dụ giá trị gia tăng**: entity "duong_vu_dong", K=3, pool 5 fact —
key recency cũ chọn 3 fact mới nhất, BỎ LỠ fact `canon_event_e07_status`
(wt=20, cũ nhất nhưng quan trọng nhất); key mới giữ canon (tier 3) +
betray -30 (tier 2) + fact mới nhất (tier 0) — "nhớ đúng cái đáng nhớ".

### D.6 — resolve_turn_canon(turn) — pipeline mỗi lượt

**Ràng buộc thứ tự trong lượt**: hệ này resolve **SAU**
Combat/Death & Consequence/NPC Affinity (cần `locked_result` của họ để
eager-check) và **TRƯỚC** `resolve_turn_exp` của EXP (EXP cần
`breakthrough_requirement_met` đầu vào — khớp Edge Case "đột phá trước,
EXP sau" của `exp-realm-progression.md`).

```
resolve_turn_canon(turn):
  // STEP 1 — Eager check tới fixpoint:
  WHILE có thay đổi:
    FOR event chưa terminal, FOR premise không-đảo-được của event:
      IF touched_this_turn(premise, locked_results các hệ khác CÙNG lượt)   // O(1)
         AND NOT premise_satisfied(premise):
        lock canon_break_flag_[event.id] = true                              // eager, Core Rule #6
        on_break=vanish     → status = Suspended (chờ cứu / đến hạn)
        on_break=substitute/branch → status = Dormant-Modified

  // STEP 1b — Người chơi cứu sự kiện (Core Rule #4b):
  IF classified_event(turn) == canon_role_rescue(event_E, char_C)            // nguồn: Situation Gen, provisional
     AND status(E) == Suspended AND eligible(C, E.vacant_core_role):         // D.3, cơ học
    E.status = Dormant-Modified; lock canon_role_filled_[C] = true
  // không hợp lệ → không cứu, kết quả khóa trước narration (AI không quyết)

  // STEP 2 — Phán quyết event Due theo resolution_order (D.2):
  FOR event IN resolution_order(due_this_turn):
    Suspended + vai lõi còn trống → Vanished + cascade (D.4)
    mọi premise đúng             → Resolved-Canon
    tie-break tự động vanish > branch > substitute:
      vanish  → Vanished + cascade
      branch  → Branched + activate(branch_target)
      substitute → rebind mọi vai trống qua D.3; NULL bất kỳ → Vanished + cascade
                   thành công → Resolved-Substituted, lock canon_role_filled_[npc]
    lock canon_event_[event.id]_status

  // STEP 3 — breakthrough_requirement_met cho nhân vật đang Chờ Đột Phá:
  setting thiếu định nghĩa tier → false CỨNG + log_warning "content gap"
  (phân biệt với "đã kiểm tra, chưa đủ điều kiện"); ngược lại →
  premise_satisfied(setting_pack.breakthrough_requirement[tier]); hand-off EXP.

  // STEP 4 — locked_result: {canon_break_flag_*, canon_event_*_status,
  //          canon_role_filled_*}
  // STEP 5 — TM Core Rule #8 tự động: mọi lock chỉ nằm trong locked_result
  //          của lượt; undo hoàn tác toàn bộ (status, flag, cascade). Lượt
  //          chết thật là is_death_turn → không undo (TM Core Rule #9).
```

**Schema field (quy ước entity_id cho WM):**

| Field pattern | Type | `entity_id` suy ra | Khi nào ghi |
|---|---|---|---|
| `canon_break_flag_[event_id]` | bool | `"global"` | Lần đầu 1 premise của event bị phá (eager hoặc tại Due) |
| `canon_event_[event_id]_status` | enum | `"global"` | Khi event đạt terminal status trong lượt |
| `canon_role_filled_[npc_id]` | bool | `[npc_id]` | Lượt NPC được gắn vai thay (tự động D.3 hoặc người chơi cứu #4b) |

**Output Range:** số field/lượt chặn trên bởi (event active × premise +
số nhân vật Chờ Đột Phá) — hữu hạn, không tăng theo world_time.

**Ví dụ tổng hợp** (lượt 41, Tiểu Vũ vừa chết qua Death & Consequence):
Step 1 → `canon_break_flag_e01=true`, e01 (hiến tế) → Suspended. Người
chơi KHÔNG cứu trong các lượt sau; e01 đến hạn lượt 55 với vai lõi
trống → Vanished + cascade: e02 → Suspended (on_break=vanish, chưa đến
hạn), e03 giữ Dormant-Modified. `locked_result` lượt 55 =
`{canon_event_e01_status: "Vanished", canon_break_flag_e02: true}`.

**Ca biên đã kiểm** (nguồn cho Acceptance Criteria): (1) 2 event cùng
Due → tie-break D.2 + loại NPC đã dùng; (2) "premise vừa phá vừa hồi
trong 1 lượt" — không thể xảy ra theo cấu trúc (1 lượt = 1 delta
ròng/hệ, hệ này đọc SAU khi các hệ upstream khóa kết quả ròng); (3)
nhiều ứng viên bằng điểm → tie-break candidate_id; (4) cascade 2 tầng
dừng đúng khi gặp non-Vanished; (5) undo lượt có canon_break → TM
#8/#9; (6) event Due ngay lượt đầu (world_time=1) chạy đúng, không có
phép trừ âm; (7) breakthrough thiếu data tier → false cứng + warning
"content gap".

## Edge Cases

- **Nếu lượt có phán quyết canon (break/cứu/resolve) bị Undo**: TOÀN BỘ
  hoàn tác — status event quay về trước lượt (kể cả chuỗi cascade và
  trạng thái Suspended), `canon_break_flag`/`canon_role_filled` chưa
  từng tồn tại (Turn Manager Core Rule #8). Riêng lượt có cái chết thật
  (`is_death_turn=true`) không undo được (TM Core Rule #9) — canon
  break sinh từ cái chết là vĩnh viễn ngay lập tức.
- **Nếu nhân vật vừa được gắn vai thay (cứu/substitute) chết ở lượt
  sau**: vai đã gắn trở thành premise `alive(char mới)` với cùng chính
  sách `on_break` của vai gốc → event lại vào Suspended (nếu vanish) —
  người chơi có thể cứu tiếp bằng ứng viên khác. Không giới hạn số lần
  cứu.
- **Nếu người chơi đề cử nhân vật KHÔNG đủ điều kiện** (sai tier/phe/đã
  chết): không cứu được — kết quả phán quyết khóa trước tường thuật, AI
  kể hành động diễn ra nhưng không ai lấp được vai. Người chơi được thử
  lại ở lượt khác, không giới hạn.
- **Nếu hành động được phân loại `canon_role_rescue` nhưng event đích
  không ở Suspended**: no-op cơ học — không field nào ghi, tường thuật
  vẫn diễn ra như hành động thường. Không phải lỗi.
- **Nếu premise `on_break=vanish` thuộc loại ĐẢO ĐƯỢC** (VD affinity)
  và sai tại thời điểm Due: Vanished ngay tại Due theo tie-break —
  KHÔNG có cửa sổ cứu (Suspended chỉ dành cho break eager từ premise
  không-đảo-được; premise đảo được còn cơ hội tự hồi cho đến đúng thời
  điểm phán quyết).
- **Nhân vật chính không bao giờ được TỰ ĐỘNG chọn làm substitute**
  (D.3): `role.excluded_ids` mặc định luôn chứa người chơi — thế giới
  không tự "bốc" người chơi vào vai canon; người chơi chỉ vào vai qua
  hành động chủ động của chính họ (agency, Pillar 1). Authoring có thể
  mở nếu event cụ thể cho phép.
- **Nếu setting pack không có event nào** (danh tác chỉ author luật thế
  giới): hệ vẫn chạy đầy đủ — `breakthrough_requirement` hoạt động,
  không phán quyết event nào, `resolve_turn_canon` trả locked_result
  rỗng. Hợp lệ.
- **Nếu setting pack có lỗi authoring** (đồ thị event có chu trình,
  premise trỏ char/item/event không tồn tại, breakthrough_requirement
  dùng predicate từ hệ chưa có nguồn): phát hiện ở bước LOAD pack
  (authoring-time validation) — từ chối load kèm danh sách lỗi, không
  phải lỗi runtime giữa phiên chơi.
- **Nếu save/load giữa chừng**: status mọi event (kể cả Suspended) là
  trạng thái bền → Persistence serialize trong state blob — event
  Suspended trước khi save vẫn Suspended sau khi load, cửa sổ cứu không
  mất; `substitutes_used_this_turn` là runtime reset mỗi lượt, không
  cần lưu.
- **Nếu nhân vật lớn nguyên tác (`is_major_canon`) chết**: đặc quyền
  xuyên không với nhân vật đó vẫn giữ trong lịch sử (Character
  Card/Nhật ký hiển thị đúng danh tính thật); mọi premise `alive` liên
  quan break eager như thường — KHÔNG có ngoại lệ "nhân vật quan trọng
  không thể chết" (Pillar 1: không ai được kịch bản bảo kê).
- **Nếu người chơi tự phá tiền đề rồi tự cứu trong cùng một lượt**:
  không thể — 1 lượt = 1 hành động; hành động gây break và hành động
  cứu là 2 lượt khác nhau (lượt gây break không thể đồng thời là lượt
  có classified_event = canon_role_rescue).
- **Nếu `trigger_condition` không bao giờ thỏa được nữa** (VD điều kiện
  phụ thuộc event đã Vanished): event ở Dormant vĩnh viễn — không lỗi,
  không rò rỉ; nó đơn giản không bao giờ Due. Tối ưu tùy chọn: đánh dấu
  "unreachable" khi mọi đường thỏa trigger đã đóng (không bắt buộc
  MVP).

## Dependencies

| System | Chiều | Bản chất giao diện | Hard/Soft |
|---|---|---|---|
| Turn Manager | Hệ này phụ thuộc | Vòng đời lượt: mọi phán quyết canon deferred-commit (Core Rule #8), `world_time` cho `event_due`/`world_time_reached` | Hard |
| Mechanic/Narration Contract Enforcement | Hệ này phụ thuộc | Mọi phán quyết (break/cứu/resolve/substitute) khóa vào `locked_result` trước tường thuật; AI nhận kết quả + `canon_outcome` summary, không quyết | Hard |
| World Memory & Context Management | 2 chiều | ĐỌC fact theo `entity_id` (premise cần lịch sử); GHI field `canon_break_flag_[event_id]`/`canon_event_[event_id]_status` (entity "global") + `canon_role_filled_[npc_id]` — khớp quy ước entity_id; CUNG CẤP `importance_tier` thay key chọn fact (khe cắm Formula #3 của WM) | Hard |
| NPC Affinity & Relationship | Hệ này phụ thuộc | Predicate `affinity_at_least/at_most`, `song_tu_active`, cờ thù địch sâu sắc | Hard (cho premise loại affinity) |
| Death & Consequence (đã Designed) | Hệ này phụ thuộc, provisional | Cờ `alive(X)` — nguồn premise-break eager quan trọng nhất; field `death_flag_[char]` (tên provisional) | Hard (hệ đó đã Designed) |
| Equipment & Skill Data / Inventory | Hệ này phụ thuộc | Predicate `possesses` + cờ `destroyed` (GDD equipment hiện chưa có cờ destroyed — cần đối chiếu, xem Open Questions) | Soft (chỉ event dùng premise possesses cần) |
| EXP & Realm Progression | EXP phụ thuộc hệ này | `breakthrough_requirement_met(tier)` — đóng dependency HARD của GDD đó; thứ tự trong lượt: canon resolve TRƯỚC EXP | Hard (chiều ngược) |
| Situation/Encounter Generation (đã Designed) | 2 chiều, provisional | NHẬN trạng thái event Due/Resolved + `canon_outcome` để dựng tình huống; CUNG CẤP phân loại `canon_role_rescue` từ hành động tự do + `location(X)` cho premise `at_location` | Soft (MVP chạy được không có rescue/location) |
| Character Card & Identity (đã Designed) | Character Card phụ thuộc hệ này | Hồ sơ nhân vật nguyên tác: danh tính thật (`is_major_canon` → đặc quyền xuyên không), trạng thái cải trang, tier profile | Hard (chiều ngược) |
| Persistence/Save System | Persistence phụ thuộc hệ này | Serialize: status mọi event (kể cả Suspended), vai đã rebind; setting pack là data tĩnh không cần lưu | Hard (chiều ngược) |

## Tuning Knobs

| Knob | Default | Safe Range | Ảnh hưởng nếu chỉnh |
|---|---|---|---|
| `AFFINITY_MAGNITUDE_TIER2` | 15 | 10–25 | Tăng: chỉ swing cực lớn mới lên tier 2 — risk bỏ sót sự kiện cận ngưỡng. Giảm: loãng tier 2 |
| `CASCADE_MAX_DEPTH` | 20 | 5–50 | Safety valve — không nên chạm nếu DAG authoring đúng; quá thấp cắt cascade hợp lệ ở Full Vision |

*(KHÔNG phải tuning knob: bảng reversibility 8 loại premise (D.1),
tie-break `(earliest_world_time, event_id)` (D.2), tie-break
`(fit_score, candidate_id)` (D.3), tie-break chính sách `vanish >
branch > substitute`, quy tắc tier D.5 — là quyết định thiết kế đã
khóa, đổi cần re-review. `earliest_world_time`/`tier_min/max`/
`target_tier`/`allowed_factions`/premise data là AUTHORING CONTENT
per-event trong setting pack, không phải knob toàn cục.)*

## Visual/Audio Requirements

Hệ data/luật — không asset riêng. Hai loại khoảnh khắc thuộc hệ này chạm
đúng "khẩu phần màu" của Visual Identity Anchor ("Mực Chưa Khô",
`game-concept.md`): **định mệnh gãy** (`canon_break_flag` — thay đổi
vĩnh viễn của thế giới → accent **đỏ son**) và **đột phá cảnh giới**
(`breakthrough_requirement_met` dẫn tới đột phá → accent **xanh ngọc**).
Chi tiết thể hiện (hiệu ứng mực, con dấu) chốt ở `/art-bible` — GDD này
chỉ khai 2 sự kiện này thuộc nhóm HIẾM được dùng màu accent, không thêm
sự kiện nào khác vào khẩu phần.

## UI Requirements

Hệ này không sở hữu màn hình riêng, nhưng định nghĩa 3 hành vi hiển thị
bắt buộc:

1. **Danh tính thật trên Character Card** (Character Card & Identity
   tôn trọng): NPC `is_major_canon=true` đang cải trang → thẻ hiển thị
   CẢ danh tính cải trang lẫn danh tính thật (đặc quyền xuyên không);
   NPC thường đang che giấu/dịch dung → thẻ chỉ hiển thị trạng thái
   "đang che giấu", KHÔNG lộ giá trị thật.
2. **Thông báo định mệnh gãy**: khi `canon_break_flag` khóa, người chơi
   phải NHẬN BIẾT được sự kiện định mệnh vừa gãy (qua tường thuật + tín
   hiệu thị giác đỏ son) — nhưng KHÔNG hiển thị event_id/data thô; sự
   kiện Suspended cần người chơi biết "còn cứu được" qua gợi ý tường
   thuật, không qua UI timer cơ học.
3. **Không lộ số liệu canon trong tường thuật** (Contract Enforcement
   Core Rule #4): trạng thái event, premise, tier requirements chỉ thể
   hiện qua văn tường thuật do AI kể từ kết quả đã khóa.

📌 **UX Flag — Setting & Canon Integration**: hành vi 1–2 là input cho
UX spec Character Card + màn hình chính. Ở Phase 4 (Pre-Production),
chạy `/ux-design` trước khi viết epic — story tham chiếu UI trích
`design/ux/[screen].md`, không trích thẳng GDD này.

## Acceptance Criteria

*(Đề xuất bởi `qa-lead`. Hệ này thuần data/logic, không network, không
AI call trong phán quyết — phần lớn kiểm bằng unit test thuần; mọi hệ
ngoài (Death & Consequence, NPC Affinity, Inventory, Turn Manager,
Situation Gen, Persistence, narration) phải **inject** như tham
số/mock, không gọi hệ thật.)*

**Story Type**: Logic (data-driven state machine + pipeline formula) →
**BLOCKING** gate, test tự động bắt buộc tại
`tests/unit/setting-canon-integration/` (naming:
`setting_canon_[feature]_test.gd`, `test_[scenario]_[expected]`).

**Ghi chú test setup**: Trừ khi ghi chú khác, mọi AC dùng fixture
**setting pack tối thiểu** (3 NPC, 2–3 event, `breakthrough_requirement`
theo tier) + knobs default (`AFFINITY_MAGNITUDE_TIER2=15,
CASCADE_MAX_DEPTH=20`). Interface provisional (Situation Gen —
`classified_event`/`location`; Death & Consequence —
`alive`/`death_flag_*`; Character Card; Combat — `battle_result_*`)
đánh dấu `provisional-interface` trong file test, rà lại khi hệ đó được
thiết kế. Rule #9 phủ tại AC-23/24/25 (D.5), Rule #10 tại AC-32 (Edge
Undo).

### Core Rules

**AC-01** (Rule #1 — setting pack là nguồn chân lý): GIVEN 2 fixture
pack khác nhau (hồ sơ nhân vật/sự kiện/luật khác nhau), WHEN load từng
pack và truy vấn hồ sơ nhân vật, hồ sơ sự kiện, luật thế giới, THEN mọi
kết quả đúng theo data của pack đang load — đổi pack đổi kết quả, không
giá trị bối cảnh nào hard-code trong code. *(unit)*

**AC-02** (Rule #2 — đặc quyền xuyên không là THÔNG TIN, không đổi
world-state): GIVEN nhân vật `is_major_canon=true` đang mang bí danh và
1 NPC thường cũng đang cải trang, WHEN đọc interface hồ sơ cho
Character Card, THEN major canon trả `true_identity`; NPC thường chỉ
trả trạng thái "đang che giấu/dịch dung"; VÀ mock-spy xác nhận truy vấn
KHÔNG ghi field nào — cờ nhận diện của các NPC khác không đổi (họ vẫn
bị lừa) cho đến khi danh tính lộ qua diễn biến. *(unit + mock-spy,
provisional-interface)*

**AC-03** (Rule #3 — trigger_condition ≠ premises): GIVEN event có
`trigger_condition=false` nhưng mọi premise đúng và `world_time ≥
earliest`, WHEN đánh giá, THEN KHÔNG Due (trigger là điều kiện KHỞI
PHÁT); GIVEN trigger=true + world_time đủ nhưng 1 premise
`on_break=substitute` đã bị phá, THEN VẪN Due dạng biến thể (premise là
điều kiện DUY TRÌ, không chặn Due). *(unit)*

**AC-04** (Rule #4 — mọi event phá được, 3 chính sách `on_break`):
GIVEN 3 event mỗi cái 1 premise không-đảo-được với `on_break` lần lượt
`substitute`/`vanish`/`branch`, WHEN premise từng cái bị phá, THEN
status lần lượt → Dormant-Modified (rebind tại Due qua D.3) / Suspended
/ Dormant-Modified (tại Due kích hoạt `branch_target`); VÀ schema event
KHÔNG tồn tại thuộc tính "bất khả xâm phạm" nào (schema inspection).
*(unit)*

**AC-05** (Rule #4 — tie-break tự động `vanish > branch > substitute`):
GIVEN event Due với nhiều premise bị phá cùng lúc, 3 tổ hợp chính sách:
{substitute, branch}, {substitute, vanish}, {cả 3}, WHEN phán quyết tại
Due, THEN kết quả lần lượt Branched / Vanished / Vanished — bất kể thứ
tự khai báo premise trong data. *(unit)*

**AC-06** (Rule #4b — cứu THÀNH CÔNG): GIVEN event E ở Suspended (vai
lõi trống), WHEN lượt có `classified_event=canon_role_rescue(E, C)` với
C qua đủ `eligible` D.3 (sống, tier trong khoảng vai, đúng phe, không
excluded), THEN E → Dormant-Modified, `canon_role_filled_[C]=true` nằm
trong `locked_result` ĐÚNG lượt đó; các lượt sau khi E đến hạn →
Resolved-Substituted (biến thể), KHÔNG Vanished. *(unit,
provisional-interface)*

**AC-07** (Rule #4b — cứu THẤT BẠI, khóa trước tường thuật): GIVEN E
Suspended, đề cử C không đủ điều kiện (3 biến thể: đã chết / sai tier /
sai phe), WHEN xử lý, THEN E VẪN Suspended, KHÔNG field
`canon_role_filled` nào ghi; VÀ mock-spy call-order xác nhận kết quả
"không cứu" đã khóa TRƯỚC `narration_call` — AI chỉ tường thuật hành
động diễn ra, không quyết. *(unit + mock-spy)*

**AC-08** (Rule #4b + State Suspended — đến hạn Vanished, cascade đúng
THỜI ĐIỂM): GIVEN E Suspended từ lượt N, downstream D có premise
`event_completed(E)`, WHEN các lượt N+1..N+k−1 trôi qua không ai cứu và
E đến hạn tại lượt N+k, THEN assert TỪNG lượt trong khoảng: E giữ
Suspended và D hoàn toàn KHÔNG bị chạm (cascade CHƯA chạy khi
Suspended); đúng lượt N+k: E → Vanished VÀ cascade D.4 chạy ngay lượt
đó. *(unit)*

**AC-09** (Rule #5 — phán quyết thuần cơ học, 0 AI call): GIVEN 1 lượt
chứa đủ loại phán quyết (eager break + rescue + Due resolve có
substitute + cascade), WHEN `resolve_turn_canon` chạy trọn, THEN
mock-spy đếm lệnh gọi AI phát sinh bởi pipeline = 0 — không ảnh hưởng
budget `calls_per_turn ≤ 3`. *(unit + mock-spy)*

**AC-10** (Rule #6 — eager vs lazy): GIVEN event có premise `alive`
(không đảo) và premise `affinity_at_least` (đảo được), WHEN (a) NPC của
premise alive chết (mock locked_result D&C cùng lượt) THEN
`canon_break_flag_[event]` khóa NGAY lượt đó; (b) affinity tụt dưới
ngưỡng THEN KHÔNG break flag lượt đó — nếu hồi kịp trước Due →
Resolved-Canon; vẫn dưới ngưỡng tại Due → phán quyết tại Due. *(unit)*

**AC-11** (Rule #7 — Due phán quyết cùng lượt, đủ 4 terminal): GIVEN 4
fixture event dàn cho 4 kết cục, WHEN từng event đến hạn, THEN trạng
thái cuối Resolved-Canon / Resolved-Substituted / Vanished / Branched
khóa trong `locked_result` của CHÍNH lượt Due (không trễ lượt); payload
phát cho mock consumer Situation Gen chứa status + `canon_outcome`
narrative summary. *(unit, provisional-interface)*

**AC-12** (Rule #8 — `breakthrough_requirement` là data thuần): GIVEN 2
pack với `breakthrough_requirement[tier]` là predicate khác nhau, WHEN
gọi `breakthrough_requirement_met(tier)` trên cùng world-state, THEN
kết quả đúng theo data từng pack — code path không chứa logic
setting-specific nào (không string "Hồn Hoàn" hard-code; đối xứng với
exp-realm AC-11 phía tiêu thụ). *(unit)*

### Formulas

**AC-13** (D.0 — adapter O(1), không kho dữ liệu riêng): GIVEN mọi hệ
sở hữu inject dạng mock có spy, WHEN đánh giá từng loại predicate trong
bảng D.0, THEN mỗi truy vấn gọi ĐÚNG interface hệ sở hữu tương ứng; số
lệnh gọi tại lượt 5 và lượt 500 với cùng state là NHƯ NHAU (không quét
lịch sử — O(1)); VÀ đổi giá trị trong mock giữa 2 lần đọc → lần sau
thấy giá trị mới (không cache/bản sao stale). *(unit + mock-spy)*

**AC-14** (D.1 — semantics 8 loại premise): GIVEN table test từng loại,
THEN: `alive` ==true; `affinity_at_least` dùng ≥ (biên bằng ngưỡng →
true); `affinity_at_most` dùng ≤; `possesses` ==true; `at_location` ==;
`event_completed` chỉ true khi `status ∈ {Resolved-Canon,
Resolved-Substituted, Branched}` — **Vanished → false**;
`world_time_reached` dùng ≥; `song_tu_active` theo membership;
`custom_flag` so `expected_value`. Mọi kết quả boolean — không tồn tại
"chưa biết". *(unit)*

**AC-15** (D.1 — bảng reversibility quyết định eager/lazy): GIVEN tra
`reversible(type)` đủ 8 loại, THEN: `alive` KHÔNG;
`affinity_at_least/at_most` CÓ; `possesses` CÓ nhưng khi
`item.destroyed=true` → KHÔNG (break eager); `at_location` CÓ;
`event_completed` KHÔNG; `world_time_reached` KHÔNG; `song_tu_active`
CÓ; `custom_flag` mặc định `reversible=false` khi data không khai. VÀ
hành vi khớp: non-reversible sai → break NGAY lượt; reversible sai →
không break trước Due. *(unit — table test + nhánh destroyed,
provisional-interface cho destroyed)*

**AC-16** (D.2 — `is_due` là AND 3 điều kiện + status hợp lệ): GIVEN ma
trận (trigger, world_time, status), WHEN thiếu bất kỳ 1 trong 3, THEN
không Due; status terminal KHÔNG BAO GIỜ Due lại; Suspended CÓ THỂ Due
(để phán quyết Vanished tại hạn). *(unit)*

**AC-17** (D.2 — thứ tự nhiều event Due + chặn double-booking): GIVEN 2
event cùng `earliest_world_time=30` Due tại wt=32, WHEN xử lý, THEN
tie-break `event_id`: e03 trước e07; e03 chọn `npc_012` làm substitute
→ e07 loại `npc_012` khỏi pool CÙNG lượt; VÀ event `earliest=20` xử
trước event `earliest=30` bất kể id. *(unit — regression neo ví dụ)*

**AC-18** (D.3 — eligibility đủ điều kiện, biên bao gồm): GIVEN ma trận
ứng viên vi phạm đúng 1 điều kiện mỗi ca (chết / tier=tier_min−1 /
tier=tier_max+1 / sai phe khi `allowed_factions≠∅` / thuộc
`excluded_ids` / thuộc `substitutes_used_this_turn`), WHEN chạy
`eligible`, THEN từng ca bị loại; tier=tier_min và =tier_max ĐỀU hợp lệ
(biên bao gồm); `allowed_factions=∅` → mọi phe hợp lệ. *(unit)*

**AC-19** (D.3 — argmin + tie-break + NULL fallback theo ngữ cảnh):
GIVEN vai tier 2–4 target 3 với `npc_004`/`npc_012` cùng fit=0 và
`npc_099` sai phe, WHEN chọn, THEN `npc_004` (tie-break candidate_id);
GIVEN pool rỗng, THEN trả NULL không throw — NULL tại Due → Vanished +
cascade; NULL tại rescue → không cứu. *(unit — regression neo ví dụ)*

**AC-20** (D.3 — DETERMINISM bắt buộc): GIVEN world_state cố định với
pool ≥ 5 ứng viên (nhiều cặp đồng fit_score), WHEN chạy
`substitute_selection` 1.000 lần, VÀ chạy lại sau khi khởi tạo hệ với
thứ tự chèn dữ liệu khác (đảo insertion order chống phụ thuộc
dict/hash order), THEN toàn bộ các lần ra ĐÚNG 1 kết quả duy nhất —
không RNG, không phụ thuộc thứ tự duyệt. *(unit + property-based
seeded)*

**AC-21** (D.4 — DAG validation tại LOAD, từ chối chu trình): GIVEN
pack có chu trình `event_completed` (E1→E2→E3→E1), WHEN load, THEN TỪ
CHỐI load kèm thông báo nêu rõ chu trình — lỗi authoring-time, không
phải runtime; GIVEN pack DAG hợp lệ, THEN load thành công và
`downstream_index` precompute khớp 100% khai báo premise (đối chiếu 2
chiều). *(unit)*

**AC-22** (D.4 — cascade 2 tầng dừng đúng + guard): GIVEN E1 Vanished
chính thức, E2 (`event_completed(E1)`, on_break=vanish, CHƯA đến hạn),
E3 (on_break=substitute), WHEN cascade chạy, THEN E2 → **Suspended**
(còn cửa cứu, KHÔNG Vanished), E3 → Dormant-Modified, đệ quy DỪNG;
biến thể: downstream đang Due tại thời điểm cascade → Vanished ngay +
đệ quy tầng kế; fixture chu trình cố ý (bypass validation qua test
hook) → visited-guard kết thúc + log lỗi authoring, không crash; chuỗi
sâu 25 > `CASCADE_MAX_DEPTH=20` → cắt tại 20 + log, không crash.
*(unit — regression neo ví dụ)*

**AC-23** (Rule #9 + D.5 — bảng tier rules là pure function): GIVEN
table test: `canon_event_x_status` (terminal bất kỳ) → 3;
`canon_break_flag_x=true` → 3; `death_flag_x=true` → 3 *(provisional)*;
`breakthrough_flag_x=true` → 2 *(provisional)*; `affinity_delta_x` với
|value|=15 → 2 và |value|=14 → 0 (biên knob BAO GỒM); `battle_result_x`
→ 1 *(provisional)*; field `has_signal` khác → 0, WHEN tính
`importance_tier`, THEN đúng bảng; VÀ spy xác nhận hàm CHỈ đọc
`field_name`/`field_value` — không truy vấn world-state ngoài (pure,
O(1)). *(unit + mock-spy)*

**AC-24** (D.5 — top_K key mới, khớp ví dụ GDD): GIVEN entity
"duong_vu_dong", K=3, pool 5 fact như ví dụ (fact canon tier 3 tại
wt=20 CŨ NHẤT), WHEN chọn theo key `(importance_tier DESC, world_time
DESC)`, THEN giữ fact canon tier 3 + betray −30 (tier 2) + fact mới
nhất (tier 0); bất biến `|selected| ≤ max_facts_per_entity` không đổi.
*(unit — regression neo ví dụ)*

**AC-25** (D.5 — TƯƠNG THÍCH NGƯỢC bắt buộc): GIVEN pool fact trong đó
MỌI fact cùng `importance_tier` (cả 2 biến thể: toàn tier 0, toàn tier
3; pool sinh seeded kích thước ngẫu nhiên), WHEN chọn top_K theo key
mới và theo key recency thuần `(world_time DESC)` của WM hiện tại, THEN
2 kết quả GIỐNG HỆT nhau — key suy biến đúng thành recency. *(unit +
property-based seeded)*

**AC-26** (D.6 — ràng buộc thứ tự trong lượt): GIVEN pipeline lượt đầy
đủ với mock-spy call-order, WHEN lượt resolve, THEN
`resolve_turn_canon` chạy SAU khi Combat/Death & Consequence/NPC
Affinity đã khóa `locked_result` (eager-check STEP 1 đọc delta RÒNG của
họ CÙNG lượt — đồng thời chốt ca biên "vừa phá vừa hồi trong 1 lượt"
bất khả) và TRƯỚC `resolve_turn_exp`. *(unit + mock-spy)*

**AC-27** (D.6 STEP 1 — fixpoint + `touched_this_turn`): GIVEN event B
có premise `custom_flag` (reversible=false mặc định) trỏ vào field
`canon_break_flag_e01` mà chính STEP 1 sinh ra khi event A break, WHEN
A break trong lượt, THEN vòng WHILE lặp tới fixpoint — cả A VÀ B đều
break trong CÙNG lượt; VÀ premise không bị chạm lượt này
(`touched=false`) KHÔNG bị đánh giá lại (spy đếm số lần eval). *(unit +
mock-spy)*

**AC-28** (D.6 STEP 3 — content-gap: false CỨNG + warning phân biệt):
GIVEN nhân vật Chờ Đột Phá tại tier T mà pack KHÔNG định nghĩa
`breakthrough_requirement[T]`, WHEN STEP 3 chạy, THEN trả `false` cứng
+ log warning "content gap" — assert nội dung log; GIVEN tier CÓ định
nghĩa nhưng điều kiện chưa đủ, THEN trả `false` KHÔNG kèm warning — 2
code path phân biệt được. *(unit)*

**AC-29** (D.6 STEP 4 — schema field + kiểu giá trị): GIVEN lượt sinh
cả 3 loại field, WHEN Resolving hoàn tất, THEN đúng pattern
`canon_break_flag_[event_id]` (bool), `canon_event_[event_id]_status`
(enum), `canon_role_filled_[npc_id]` (bool), TẤT CẢ trong CÙNG 1
`locked_result` của đúng lượt; mọi giá trị là int/bool/enum — không
float/string tự do; số field/lượt ≤ (event active × premise + số nhân
vật Chờ Đột Phá). *(unit)*

**AC-30** (D.6 — REGRESSION TỔNG HỢP CỐ ĐỊNH lượt 41/55): GIVEN lượt 41
Tiểu Vũ chết (mock D&C), WHEN chạy tiếp tới lượt 55 không cứu, THEN:
`locked_result` lượt 41 chứa `canon_break_flag_e01=true`, e01 →
Suspended; các lượt 42–54: e01 giữ Suspended, KHÔNG field canon mới nào
sinh; lượt 55 (e01 đến hạn, vai lõi trống): e01 → Vanished + cascade —
e02 → Suspended, e03 giữ Dormant-Modified; `locked_result` lượt 55 =
`{canon_event_e01_status: "Vanished", canon_break_flag_e02: true}` —
ĐÚNG 2 field. Regression cố định — thay đổi fixture phải có chủ đích.
*(unit — regression cố định)*

**AC-31** (D.6 — Due ngay lượt đầu): GIVEN event `earliest_world_time=1`,
trigger=true từ đầu, WHEN lượt đầu tiên (world_time=1) resolve, THEN
event Due và phán quyết đúng ngay lượt đầu — không underflow. *(unit)*

### Edge Cases

**AC-32** (Undo + Rule #10 — hoàn tác TOÀN BỘ cascade + Suspended):
GIVEN snapshot X trước lượt N; lượt N chứa đồng thời: eager break →
Suspended, 1 event Vanished tại Due kéo cascade nhiều tầng, và 1
`canon_role_filled`, WHEN Turn Manager Undo lượt N (mock TM), THEN TOÀN
BỘ về ĐÚNG X: status MỌI event (kể cả chuỗi cascade và Suspended),
`canon_break_flag`/`canon_role_filled` chưa từng tồn tại — không
rollback một phần; VÀ GIVEN lượt có `is_death_turn=true` sinh canon
break từ cái chết, THEN không undo được (TM Core Rule #9) — break vĩnh
viễn ngay lập tức. *(unit + mock Turn Manager)*

**AC-33** (nhân vật thay vai chết ở lượt sau, cứu không giới hạn):
GIVEN E đã rebind vai lõi cho C, WHEN C chết lượt sau (mock D&C), THEN
vai trở thành premise `alive(C)` mang CÙNG chính sách `on_break` của
vai gốc → E lại Suspended; cứu lần 2 bằng C2 hợp lệ → lại
Dormant-Modified — không tồn tại giới hạn số lần cứu. *(unit)*

**AC-34** (thử lại rescue + rescue nhắm event không Suspended là
no-op): GIVEN (a) lượt M đề cử không hợp lệ, lượt M+2 đề cử hợp lệ →
cứu thành công (thử lại không giới hạn); (b) `canon_role_rescue` nhắm
event đang Dormant / Due / Resolved-Canon, WHEN xử lý, THEN (b) no-op
cơ học: KHÔNG field nào ghi, status không đổi, không lỗi. *(unit,
provisional-interface)*

**AC-35** (premise vanish ĐẢO ĐƯỢC: không có cửa sổ Suspended): GIVEN
event có premise `affinity_at_least` với `on_break=vanish`, affinity
dưới ngưỡng liên tục nhiều lượt TRƯỚC Due, WHEN kiểm từng lượt, THEN
event vẫn Dormant (không Suspended, không break flag); tại Due mà vẫn
dưới ngưỡng → Vanished NGAY tại Due, KHÔNG qua Suspended; hồi kịp
trước Due → Resolved-Canon. *(unit)*

**AC-36** (người chơi không bao giờ bị auto-chọn substitute): GIVEN
người chơi thỏa MỌI điều kiện và là ứng viên fit nhất, WHEN
`substitute_selection` tự động chạy, THEN người chơi KHÔNG được chọn
(`excluded_ids` mặc định luôn chứa player); GIVEN event authoring mở
tường minh → được chọn. *(unit)*

**AC-37** (pack không có event nào): GIVEN pack chỉ author luật thế
giới (0 event), WHEN load + chạy nhiều lượt, THEN load hợp lệ,
`resolve_turn_canon` trả locked_result rỗng mỗi lượt,
`breakthrough_requirement_met` hoạt động đầy đủ, không lỗi. *(unit)*

**AC-38** (authoring validation: dangling refs + predicate không
nguồn): GIVEN pack có ĐỒNG THỜI nhiều lỗi: premise trỏ char/item/event
không tồn tại + `breakthrough_requirement` dùng predicate từ hệ chưa có
nguồn, WHEN load, THEN từ chối load kèm DANH SÁCH ĐẦY ĐỦ mọi lỗi (không
dừng ở lỗi đầu tiên). *(unit)*

**AC-39** (save/load giữa chừng): GIVEN giữa phiên có e01 Suspended +
e02 Dormant-Modified + 1 vai đã rebind, WHEN serialize → deserialize
qua state blob (logic Persistence), THEN status mọi event và vai rebind
giữ NGUYÊN — Suspended vẫn Suspended, cửa sổ cứu không mất; VÀ
`substitutes_used_this_turn` KHÔNG nằm trong blob (runtime, reset đầu
lượt). *(unit + integration với logic Persistence)*

**AC-40** (`is_major_canon` chết: không bảo kê): GIVEN nhân vật lớn
nguyên tác chết (mock D&C), WHEN kiểm, THEN mọi premise `alive` liên
quan break EAGER như thường — không code path ngoại lệ "nhân vật quan
trọng"; VÀ interface hồ sơ VẪN trả `true_identity` cho Character
Card/lịch sử sau khi chết. *(unit)*

**AC-41** (tự phá tự cứu cùng lượt: bất khả theo cấu trúc): GIVEN
contract input 1 lượt = 1 `classified_event`, WHEN kiểm cấu trúc
pipeline, THEN hành động được phân loại `canon_role_rescue` KHÔNG đồng
thời là nguồn break nào ở STEP 1, và lượt có hành động gây break mang
classified khác — assert input contract từ chối/bỏ qua tổ hợp mâu
thuẫn. *(unit — contract assert)*

**AC-42** (trigger không bao giờ thỏa được nữa): GIVEN event có trigger
phụ thuộc `event_completed(E)` với E đã Vanished, WHEN chạy 100 lượt,
THEN event giữ Dormant vĩnh viễn — không Due, không lỗi, không rò rỉ
(số event quét/lượt chặn trên bởi active events). *(unit)*

### Cross-System

**AC-43** (EXP — mock 2 chiều, thứ tự trước `resolve_turn_exp`): GIVEN
logic EXP tiêu thụ `breakthrough_requirement_met(tier)` qua mock 2
chiều, WHEN cùng lượt điều kiện đột phá vừa thỏa và pipeline chạy, THEN
spy call-order xác nhận STEP 3 của canon tính predicate TRƯỚC
`resolve_turn_exp`, EXP nhận đúng giá trị của CHÍNH lượt đó và đột phá
NGAY lượt (khớp Edge Case "đột phá trước, EXP sau" của exp GDD); đổi
mock predicate false/true → hành vi EXP đổi theo, không logic trùng lặp
ở phía EXP. *(integration với logic EXP, mock 2 chiều + mock-spy)*

**AC-44** (World Memory — fact extraction đúng `entity_id`): GIVEN
`locked_result` lượt 55 từ regression AC-30 + 1 lượt có
`canon_role_filled_npc_007=true`, WHEN đưa qua logic trích fact của WM
(Công thức #2), THEN `canon_event_e01_status` và `canon_break_flag_e02`
sinh fact `entity_id="global"`; `canon_role_filled_npc_007` sinh fact
`entity_id="npc_007"`; VÀ mọi `event_id`/`npc_id` trong fixture pack
pass validator quy ước đặt tên entity_id của WM. *(integration với
logic World Memory)*

**AC-45** (Contract Enforcement — khóa trước narration, không parse
ngược): GIVEN pipeline 1 lượt đầy đủ với `narration_call` mock, WHEN
kiểm bằng spy, THEN (a) call-order: MỌI field `canon_*` đã trong
`locked_result` TRƯỚC `narration_call`; (b) payload prompt chứa
`canon_outcome` summary + resolution đã khóa — không chứa gì cho phép
AI đảo phán quyết; (c) sửa `narration_text` trả về thành nội dung mâu
thuẫn hoàn toàn (VD "sự kiện vẫn diễn ra như nguyên tác" khi
status=Vanished) → status/flag KHÔNG đổi. *(unit + mock-spy)*

**AC-46** (NPC Affinity — premise đọc `A_after` cùng lượt): GIVEN
premise `affinity_at_least threshold=60`, NPC có `A_before=55`, lượt có
sự kiện đẩy `A_after=62` (mock NPC Affinity đã khóa delta +7), event
Due CÙNG lượt, WHEN canon resolve (SAU `resolve_turn_affinity` theo
AC-26), THEN premise đánh giá trên `A_after=62` → true →
Resolved-Canon — KHÔNG dùng `A_before`. *(unit + mock-spy)*

### Non-automatable (FLAG — mô hình 2 tầng)

**AC-47** (Tường thuật nhánh rẽ — **KHÔNG test tự động được**): GIVEN
build chơi thật, các resolution đã khóa (Resolved-Canon / Substituted /
Branched / Vanished / rescue thất bại), WHEN đọc narration, THEN văn
bản nhất quán với phán quyết (Vanished không được kể như đã xảy ra;
Substituted kể biến thể với đúng nhân vật thay; rescue thất bại kể hành
động diễn ra nhưng vai không lấp). **FLAG: non-automatable** — kiểm
theo mô hình 2 tầng (finding `ai-narrative-test-evidence-gap`): tầng cơ
học (AC-01→AC-46) = Logic/BLOCKING; tầng narrative = ADVISORY — golden
scenario set ≥ 1 kịch bản/loại resolution, 2 lượt đánh giá độc lập, đạt
khi ≥ 90% consistent, evidence lưu `production/qa/evidence/`, re-run
khi prompt/model đổi. *(manual — ADVISORY)*

**AC-48** (Hiển thị đặc quyền xuyên không — manual, deferred): GIVEN
build thật có nhân vật major canon đang cải trang xuất hiện, WHEN mở
Character Card, THEN UI hiển thị danh tính thật (và "đang che giấu" cho
NPC thường). Tầng cơ học đã kiểm ở AC-02; tầng hiển thị thuộc Character
Card & Identity (đã Designed) — **FLAG: manual walkthrough** khi hệ
đó có UI, ADVISORY, deferred. *(manual — ADVISORY, deferred)*

## Open Questions

- **3 tên field provisional trong D.5** (`death_flag_[char]`,
  `breakthrough_flag_[char]`, `battle_result_[char]`) — cần đối chiếu
  khi Death & Consequence/EXP/Combat chốt schema `locked_result` thật
  của họ. *(Owner: systems-designer, target: `/design-system
  death-and-consequence` + `/consistency-check`)*
- **Phân loại `canon_role_rescue` từ hành động tự do** — thuộc
  Situation/Encounter Generation (provisional), cùng nhóm với taxonomy
  sự kiện xã hội của NPC Affinity. *(Owner: narrative-director +
  systems-designer, target: `/design-system
  situation-encounter-generation`)*
- **Cờ `destroyed` cho vật phẩm** — premise `possesses` cần nhưng
  `equipment-skill-data-system.md` (Approved) chưa có; cần bổ sung nhỏ
  vào GDD đó hoặc ADR data model. *(Owner: systems-designer, target:
  trước `/create-architecture`)*
- **Authoring 2–3 canon event MVP cho Đấu La Đại Lục** (event nào?
  premises/roles cụ thể?) + `breakthrough_requirement` cho các tier
  MVP — authoring content, quyết định giá trị thật. *(Owner:
  narrative-director + world-builder, target: trước vertical slice)*
- **`location(X)` chưa có hệ sở hữu** — premise `at_location` chỉ dùng
  được khi Situation Gen định nghĩa mô hình vị trí. MVP có thể né bằng
  cách không author premise loại này. *(Owner: systems-designer,
  target: `/design-system situation-encounter-generation`)*
- **Playtest rubric với ≥2–3 tình huống canon khác nhau** (mitigation
  cờ HIGH-RISK từ systems-index) — rubric đã tổng quát hóa trong Core
  Rule #4/#4b nhưng chưa playtest thật. *(Owner: qa-lead +
  game-designer, target: vertical slice)*
