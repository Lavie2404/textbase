# Death & Consequence

> **Status**: Designed — Pending Review
> **Author**: user + agents
> **Last Updated**: 2026-08-03
> **Implements Pillar**: Pillar 3 (Sức Mạnh Có Logic), Pillar 2 (Hệ Quả Thực Sự)
> **Creative Director Review (CD-GDD-ALIGN)**: Skipped — Lean mode (not a PHASE-GATE)

## Overview

Death & Consequence là hệ sở hữu duy nhất quyết định điều gì xảy ra SAU KHI
nhân vật chính thua một trận đấu: nó đọc tín hiệu "đã thua" từ Combat System,
đối chiếu với ngưỡng thù địch sâu sắc (`affinity ≤ -80`) do NPC Affinity cung
cấp, rồi khóa MỘT trong hai loại kết quả — cái chết thật (không thể cứu,
không ngoại lệ, kể cả AI) hoặc một hậu quả nghiêm trọng không gây chết (trọng
thương, ép uống độc, sỉ nhục trước đám đông, phế đan điền/võ công) — trước
khi AI được phép tường thuật lại. Hệ này cũng là chủ sở hữu duy nhất của cờ
`alive(X)`/`death_flag_[char]` mà Setting & Canon Integration cần để phán
quyết premise-break, và của `is_death_turn` mà Turn Manager cần để khóa Undo
vĩnh viễn ngay khi cái chết thật xảy ra. Về mặt người chơi, đây chính là nơi
Core Fantasy "không ai cho không bạn điều gì" trở thành rủi ro cụ thể, đo
lường được — không phải một cảnh cắt (cutscene) trang trí.

## Player Fantasy

*(Ghi chú: `creative-director` không được tham vấn — chế độ review `lean` chỉ
bắt buộc spawn cho Section D và H. Nên rà lại thủ công trước khi vào
production.)*

Người chơi phải cảm nhận TRỌNG LƯỢNG thật của rủi ro trước khi giao chiến
với một kẻ thù thù địch sâu sắc — một cảm giác lo lắng có căn cứ, không phải
sợ hãi mơ hồ, vì ranh giới -80 Hảo cảm luôn đọc được qua Thẻ Nhân Vật trước
khi hành động (đúng tinh thần "an toàn có luật" mà Situation/Encounter
Generation đã xác lập). Khi thua không dẫn đến chết, hậu quả phải cảm thấy
THẬT và ĐAU nhưng không phải ngõ cụt — trọng thương/phế đan điền là một cái
giá phải trả, một câu chuyện mới để viết tiếp (tìm đại cơ duyên khôi phục),
không phải một màn hình Game Over. Khi cái chết thật xảy ra, đó phải là một
cú sốc THẬT SỰ — không có nút "thử lại" ẩn giấu nào cứu được, kể cả AI —
nhưng game vẫn tiếp tục có ý nghĩa qua Quỷ tu/Chuyển sinh/Chơi lại, đúng
nguyên tắc "lưới an toàn nằm ở việc tiếp tục sống có ý nghĩa sau khi chết,
không phải ở việc né tránh cái chết" (`game-concept.md`, mục Cái Chết).

## Detailed Design

*(Lean mode: Section C không bắt buộc spawn specialist — chỉ D và H. Quyết
định kiến trúc đã chốt qua vòng câu hỏi trước khi draft.)*

### Core Rules

1. **Phạm vi kích hoạt**: Death & Consequence resolve trong lượt CHỈ KHI
   Combat System phát hand-off với `battle_active=false` VÀ
   `outcome.type ∈ {win, lose}` (KHÔNG áp dụng khi `outcome.type="no_outcome"`
   — bỏ chạy/chạm trần `MAX_EXCHANGE_COUNT` không được diễn giải thành
   thắng/thua, đúng ràng buộc đã khóa ở `combat-system.md`) VÀ một trong
   hai bên là nhân vật chính. Không xử lý combat NPC-vs-NPC (không tồn
   tại trong phạm vi MVP).

2. **Thứ tự trong lượt**: Death & Consequence resolve NGAY SAU khi Combat
   khóa hand-off, và TRƯỚC NPC Affinity (để `kill_witnessed` phát ra kịp
   cho pipeline `resolve_turn_affinity` cùng lượt) và TRƯỚC Setting &
   Canon Integration (đúng ràng buộc đã khóa bên đó: "SAU Combat/Death &
   Consequence/NPC Affinity, TRƯỚC resolve_turn_exp").

3. **Nhánh A — Nhân vật chính THUA** (`outcome.type="lose"`, loser=nhân
   vật chính):
   a. Đọc `affinity(đối thủ)` hiện hành (giá trị ĐẦU lượt, trước khi NPC
      Affinity áp delta của chính lượt này) qua interface public của NPC
      Affinity.
   b. Nếu đối thủ KHÔNG phải NPC có Hảo cảm theo dõi (VD quái vật/thú
      hoang tương lai): mặc định coi `affinity=0` (an toàn, không đạt
      ngưỡng thù địch sâu sắc) — xem Edge Cases.
   c. Nếu `affinity(đối thủ) ≤ deep_hostility_threshold` (registry, `-80`,
      bao gồm): chạy **Formula D.1 (death_roll)**. Nếu kết quả = chết:
      khóa `alive(nhân vật chính)=false`, `death_flag_player=true`,
      `turn.is_death_turn=true`, bàn giao cho Character Continuation (hệ
      #13) — KHÔNG chạy tiếp bước d. Nếu kết quả = sống sót: đặt cờ nội
      bộ `forced_severe=true` — vừa thoát chết trước thù địch sâu sắc
      thì không thể chỉ là "trọng thương nhẹ" — rồi tiếp tục bước d.
   d. Chạy **Formula D.2 (severity_tier)** theo `margin_ratio` (từ
      hand-off Combat) để chọn 1 trong 4 loại hậu quả không-chết. Nếu
      `forced_severe=true` (từ bước c): kết quả D.2 bị ÉP CỨNG thành
      `severe`, bỏ qua bảng ngưỡng margin thông thường. Khóa
      `death_and_consequence_blocked(nhân vật chính) = true` nếu tier =
      severe (phế đan điền/võ công); các tier khác không đặt cờ chặn
      EXP.

4. **Nhánh B — Nhân vật chính THẮNG** (`outcome.type="win"`,
   winner=nhân vật chính): đối thủ bị đánh bại (HP=0) bước vào trạng
   thái tạm thời `pending_fate(npc_id)` đúng 1 lượt kế tiếp (xem States
   and Transitions). Turn Manager nhận 2 gợi ý hành động bổ sung từ hệ
   này trong lượt đó: "Kết liễu [NPC]" và "Tha mạng [NPC]" (nằm trong
   `suggested_action_count=4`, phối hợp với gợi ý khác nếu có); người
   chơi cũng có thể diễn đạt ý định qua input tự do (phân loại xác
   định, không qua AI — cùng pattern các hệ khác).
   - **Kết liễu**: khóa `alive(npc)=false`, `death_flag_[npc]=true`;
     phát sự kiện `kill_witnessed` (nạn nhân=npc,
     nhân chứng=`entities_in_scope(scene) \ {npc}`) cho NPC Affinity xử
     lý lan truyền.
   - **Tha mạng** (mặc định — kích hoạt đúng tại thời điểm Turn Manager
     XÁC NHẬN lượt `pending_fate` đó mà người chơi không chọn "Kết
     liễu" tường minh, kể cả khi làm việc khác trong lượt — đúng
     Pillar 1, thế giới không tự giết thay người chơi): NPC bị đánh bại
     chịu **CÙNG bảng hậu quả không-chết**
     (Formula D.2, `margin_ratio` của chính trận đó) như khi nhân vật
     chính thua — không có bảng riêng cho NPC. Không có nhánh "NPC chết
     vì thua trận" — chỉ chết khi người chơi chủ động chọn Kết liễu.

5. **Cờ `alive(X)` và `death_flag_[char_id]`**: hệ này SỞ HỮU DUY NHẤT 2
   field này cho MỌI nhân vật (chính + NPC). Mặc định `alive=true` khi
   nhân vật được tạo/xuất hiện lần đầu. Chỉ chuyển `false` qua Nhánh A
   bước c (chết thật) hoặc Nhánh B "Kết liễu" — KHÔNG có đường nào khác
   trong toàn bộ game được phép đổi 2 field này (đóng interface
   provisional mà Setting & Canon Integration chờ).

6. **Cờ `death_and_consequence_blocked(self)`**: boolean per-character,
   mặc định `false`. Đặt `true` khi severity tier = severe (phế đan
   điền/võ công). Chỉ gỡ qua **Formula D.3 (recovery_attempt)** thành
   công (xem Formulas) — không tự hết hạn theo thời gian.

### States and Transitions

**A. Luồng giải quyết ngay sau trận** (transient, tối đa 1-2 lượt):

| State | Mô tả | Chuyển sang |
|---|---|---|
| Idle | Không có trận vừa kết thúc cần xử lý | → Resolving Loss / Resolving Win (khi Combat phát hand-off `lose`/`win`) |
| Resolving Loss | Đang chạy Nhánh A (death_roll nếu áp dụng, rồi severity_tier) | → Idle (đã khóa toàn bộ kết quả, có thể là Death Confirmed) |
| Death Confirmed | `is_death_turn=true`, bàn giao Character Continuation | → [ngoài phạm vi hệ này] |
| Pending Fate | Đối thủ HP=0 sau trận thắng, chờ đúng 1 lượt để người chơi chọn Kết liễu/Tha mạng | → Idle (Kết liễu hoặc Tha mạng đã xử lý — kể cả mặc định Tha mạng khi hết lượt không chọn) |

**B. Vòng đời cờ `death_and_consequence_blocked` (persistent, xuyên
nhiều lượt)**:

| State | Entry Condition | Exit Condition |
|---|---|---|
| Healthy | Mặc định | → Crippled (severity tier = severe) |
| Crippled | `death_and_consequence_blocked=true` | → Healthy (Formula D.3 thành công) |

### Interactions with Other Systems

- **Combat System** (upstream, hard) — nhận hand-off
  `outcome={type,winner_id,loser_id}` + `hp_after`/`max_HP` (→
  `margin_ratio`, công thức giống `npc-affinity-relationship.md` D.1
  dùng) khi `battle_active=false`. Combat không đọc/ghi lại field nào
  của hệ này.
- **NPC Affinity & Relationship** (2 chiều, hard) — ĐỌC
  `affinity(đối thủ)` để quyết định death_roll; PHÁT `kill_witnessed`
  (nạn nhân + witnesses) cho hệ đó lan truyền — đóng interface
  provisional bên đó.
- **Setting & Canon Integration** (downstream, hard) — CUNG CẤP
  `alive(X)` + `death_flag_[char_id]` làm premise-break eager-check
  quan trọng nhất — đóng interface provisional bên đó. Resolve TRƯỚC
  hệ đó trong cùng lượt.
- **EXP & Realm Progression** (downstream, soft) — CUNG CẤP
  `death_and_consequence_blocked(self)` — đúng TÊN đã được GDD đó dùng
  provisional, không đổi tên để tránh sửa chéo file không cần thiết.
- **Turn Manager** (downstream, hard) — CUNG CẤP `is_death_turn` cho
  `undo_availability_window` (registry) — khóa Undo vĩnh viễn đúng lượt
  chết thật; CUNG CẤP 2 gợi ý hành động bổ sung trong cửa sổ
  `Pending Fate`.
- **Situation/Encounter Generation** (2 chiều, hard — Designed) — PHÁT
  thông tin chết để hệ đó dọn presence/`provoked_flag`; NHẬN witness
  list (`entities_in_scope`) làm input cho `kill_witnessed`.
- **Character Continuation** (downstream, hard) — bàn giao tín hiệu
  `death_confirmed` khi Nhánh A kết thúc bằng chết thật — hệ này KHÔNG
  tự xử lý Quỷ tu/Chuyển sinh/Chơi lại.
- **Equipment & Skill Data System** (upstream, soft) — đọc field
  `recovery_item` + `efficacy` (item data, cần bổ sung — xem Open
  Questions) cho Formula D.3 nhánh tiên thảo dị bảo.

## Formulas

*(Đề xuất bởi `systems-designer`, lean mode — Section D bắt buộc spawn.
Ký hiệu chung: `margin_ratio(battle) = hp_after(người thắng) /
max_HP(người thắng)` tại `battle_active=false` — Nhánh A dùng của đối
thủ, Nhánh B "Tha mạng" dùng của nhân vật chính, cùng công thức khác
chủ thể. Không đăng ký registry — chỉ là pattern tái dùng từ
`npc-affinity-relationship.md` D.1, không phải formula sở hữu duy nhất.)*

### D.1 — death_roll

The `death_roll` formula is defined as:
`death_roll = roll_uniform[0,1) < clamp(DEATH_ROLL_BASE + DEATH_ROLL_SCALE × margin_ratio, DEATH_ROLL_MIN, DEATH_ROLL_MAX)`

Chỉ chạy khi `affinity(đối thủ) ≤ deep_hostility_threshold` (Core Rule
3c). `margin_ratio` ở đây luôn là của **đối thủ** (người thắng trận đó).

**Variables:**

| Variable | Symbol | Type | Range | Description |
|----------|--------|------|-------|-------------|
| Tỷ lệ HP còn lại của đối thủ | `margin_ratio` | float | [0,1] | `hp_after(đối thủ)/max_HP(đối thủ)` từ hand-off Combat |
| Xác suất chết nền | `DEATH_ROLL_BASE` | float (knob) | 0–0.3 | Xác suất chết khi đối thủ thắng sát nút (`margin_ratio≈0`) |
| Hệ số margin | `DEATH_ROLL_SCALE` | float (knob) | 0–1 | Độ dốc tăng xác suất chết theo mức áp đảo của đối thủ |
| Sàn xác suất | `DEATH_ROLL_MIN` | float (knob) | 0–0.2 | Không bao giờ 0% chết tuyệt đối |
| Trần xác suất | `DEATH_ROLL_MAX` | float (knob) | 0.8–1.0 | Không bao giờ 100% chết tuyệt đối |
| Xác suất chết thật | `P_death` | float | `[DEATH_ROLL_MIN, DEATH_ROLL_MAX]` | Đầu ra trung gian trước roll |
| Số ngẫu nhiên | `roll_uniform[0,1)` | float | [0,1) | Lấy đúng thời điểm formula chạy, không tái sử dụng |
| Kết quả | `death` | bool | {true,false} | `true`→chết thật (Core Rule 3c); `false`→sống sót, BUỘC severity=`severe` |

**Output Range:** `P_death ∈ [DEATH_ROLL_MIN, DEATH_ROLL_MAX]` mặc định
`[0.05, 0.95]`. Trần 0.95 (không phải 1.0) là quyết định có chủ đích:
dù `margin_ratio=1.0` (thua tan nát), vẫn giữ 5% cơ hội sống sót, khớp
đúng shape language đã khóa ở `combat-system.md` (`P_MIN=0.05/P_MAX=0.95`)
và triết lý "không có gì tuyệt đối" của dự án. Đây là knob RIÊNG
(`DEATH_ROLL_MIN/MAX`), không chia sẻ constant với `P_MIN/P_MAX` của
Combat — tránh coupling 2 hệ khác domain.

**Example:** `DEATH_ROLL_BASE=0.10, DEATH_ROLL_SCALE=0.85` → tại
`margin_ratio=0.3` (đối thủ còn 30% HP, thắng sát nút):
`P_death = clamp(0.10+0.85×0.3, 0.05, 0.95) = 0.355` → roll=0.2 < 0.355
→ **chết**. Tại `margin_ratio=1.0` (đối thủ thắng tuyệt đối):
`P_death = clamp(0.95,...) = 0.95` → roll=0.97 ≥ 0.95 → **sống sót**,
nhưng Core Rule 3c buộc severity=`severe` (bỏ qua bảng D.2).

### D.2 — severity_tier

The `severity_tier` formula is defined as:
`severity_tier = "mild" if margin_ratio < SEVERITY_MILD_THRESHOLD else "medium" if margin_ratio < SEVERITY_SEVERE_THRESHOLD else "severe"`
(ép cứng `"severe"` nếu Core Rule 3c kích hoạt — sống sót sau
`death_roll` dù thù địch sâu sắc)

Kèm hàm chọn tên hậu quả cụ thể trong tier:
`consequence_type(tier, npc_tag) = "trọng thương"` (mild) `| npc_tag.medium_override ?? "sỉ nhục"` (medium) `| "phế đan điền/võ công" + set death_and_consequence_blocked(loser)=true` (severe)

**Variables:**

| Variable | Symbol | Type | Range | Description |
|----------|--------|------|-------|-------------|
| Tỷ lệ HP còn lại người thắng trận đó | `margin_ratio` | float | [0,1] | Nhánh A: của đối thủ; Nhánh B Tha mạng: của nhân vật chính (cùng công thức, khác chủ thể) |
| Ngưỡng mild/medium | `SEVERITY_MILD_THRESHOLD` | float (knob) | 0.2–0.5 | Dưới ngưỡng này → trọng thương |
| Ngưỡng medium/severe | `SEVERITY_SEVERE_THRESHOLD` | float (knob) | 0.6–0.85 | Từ ngưỡng này trở lên → phế đan điền/võ công |
| Tag ghi đè NPC (chỉ tier medium) | `npc_tag.medium_override` | enum \| null | {`"ep_uong_doc"`, null} | Content-authored, mặc định null → "sỉ nhục" |
| Tier | `severity_tier` | enum | {mild, medium, severe} | Kết quả chính |
| Tên hậu quả | `consequence_type` | string | 4 giá trị cố định | trọng thương / sỉ nhục / ép uống độc / phế đan điền-võ công |

**Output Range:** Categorical — 3 tier × tối đa 4 tên hậu quả cụ thể.
Domain đầu vào `margin_ratio ∈ [0,1]`. **Lưu ý thiết kế**: KHÔNG tái
dùng `SEVERE_WIN_MARGIN_THRESHOLD` của `combat-system.md`/
`npc-affinity-relationship.md` cho `SEVERITY_SEVERE_THRESHOLD` dù giá
trị đề xuất trùng khoảng — 2 domain khác nhau (affinity-delta severity
vs. hậu quả nhân vật), giữ tách biệt để không coupling ngầm 2 hệ tuning
khác nhau.

**Example:** `SEVERITY_MILD_THRESHOLD=0.35, SEVERITY_SEVERE_THRESHOLD=0.75`.
`margin_ratio=0.42` → `0.35≤0.42<0.75` → `medium`; NPC không có tag →
`"sỉ nhục"`. `margin_ratio=0.85` → `≥0.75` → `severe` →
`"phế đan điền/võ công"`, `death_and_consequence_blocked=true`.
**Ví dụ forced-severe (3c)**: `margin_ratio=0.15` (đáng lẽ `mild` theo
bảng) nhưng nhân vật chính vừa sống sót sau `death_roll` trước thù địch
sâu sắc → bỏ qua bảng, ép `severe` → `"phế đan điền/võ công"`.

### D.3 — recovery_attempt

The `recovery_attempt` formula is defined as:
`recovery_attempt = roll_uniform[0,1) < P_recovery(method, character)`,
với `P_recovery` theo phương pháp, và chi phí bị trừ **bất kể kết quả**.

```
P_recovery(method, character) =
    RECOVERY_FORTUNE_RATE                                        nếu method = đại_cơ_duyên
    clamp(efficacy(item), RECOVERY_ITEM_MIN, RECOVERY_ITEM_MAX)    nếu method = tiên_thảo_dị_bảo
    RECOVERY_SELF_RATE                                            nếu method = tự_tu

recovery_self_attempt_allowed(character, current_turn) =
    last_self_attempt_turn(character) = null
    OR (current_turn − last_self_attempt_turn(character)) ≥ RECOVERY_SELF_COOLDOWN_TURNS
```

Kết quả: `true` → `death_and_consequence_blocked(character) = false`.
`false` → cờ giữ nguyên `true`.
Chi phí (LUÔN trừ, không hoàn khi thất bại — đúng "không dễ dàng và
không đảm bảo"): `đại_cơ_duyên` → sự kiện cơ duyên đó bị tiêu (không
lặp lại); `tiên_thảo_dị_bảo` → item bị tiêu thụ (mất charge/instance);
`tự_tu` → `last_self_attempt_turn(character) = current_turn` (reset
cooldown dù thành hay bại).

**Variables:**

| Variable | Symbol | Type | Range | Description |
|----------|--------|------|-------|-------------|
| Phương pháp | `method` | enum | {đại_cơ_duyên, tiên_thảo_dị_bảo, tự_tu} | Người chơi chủ động chọn |
| Tỷ lệ thành công cơ duyên | `RECOVERY_FORTUNE_RATE` | float (knob) | 0.5–0.9 | Cố định, không phụ thuộc input nào khác |
| Hiệu lực vật phẩm (EXTERNAL, GAP) | `efficacy(item)` | float | [0,1] | Chưa tồn tại trên item schema của Equipment & Skill Data System — xem Open Questions |
| Sàn hiệu lực item | `RECOVERY_ITEM_MIN` | float (knob) | 0–0.2 | Item yếu nhất vẫn có cơ hội tối thiểu |
| Trần hiệu lực item | `RECOVERY_ITEM_MAX` | float (knob) | 0.7–0.95 | Không item nào đảm bảo 100% |
| Tỷ lệ tự tu | `RECOVERY_SELF_RATE` | float (knob) | 0.03–0.15 | Thấp — miễn phí ngoại trừ thời gian |
| Cooldown tự tu | `RECOVERY_SELF_COOLDOWN_TURNS` | int (knob) | 5–15 | Số lượt chờ giữa 2 lần thử tự tu |
| Lượt thử gần nhất | `last_self_attempt_turn(character)` | int \| null | ≥0 hoặc null | State nội bộ hệ này, `null` = chưa từng thử |
| Lượt hiện tại | `current_turn` | int | ≥0 | Từ Turn Manager |
| Kết quả | `recovery_success` | bool | {true,false} | Gỡ cờ `death_and_consequence_blocked` nếu true |

**Output Range:** `P_recovery` bị chặn theo method — cơ duyên là hằng
cố định `(0,1)`; item bị `clamp` vào `[RECOVERY_ITEM_MIN, RECOVERY_ITEM_MAX]`
bất kể `efficacy(item)` gốc; tự tu là hằng thấp cố định. `recovery_success`
boolean.

**Example (a — đại cơ duyên):** `RECOVERY_FORTUNE_RATE=0.70` → roll=0.42
< 0.70 → thành công → gỡ cờ.
**Example (b — tiên thảo dị bảo):** `efficacy(item)=0.55,
RECOVERY_ITEM_MIN=0.05, RECOVERY_ITEM_MAX=0.90` → `P=0.55` → roll=0.71
≥ 0.55 → **thất bại** — item vẫn bị tiêu (mất trắng).
**Example (c — tự tu):** `RECOVERY_SELF_RATE=0.08,
RECOVERY_SELF_COOLDOWN_TURNS=8`; `last_self_attempt_turn=92,
current_turn=100` → `100−92=8≥8` → được phép thử → roll=0.03 < 0.08 →
thành công.

## Edge Cases

*(Lean mode: không bắt buộc spawn specialist cho Section E — chỉ D và
H.)*

- **Nếu đối thủ không có Hảo cảm theo dõi** (VD quái vật/thú hoang trong
  tình huống tương lai, chưa có trong MVP 3-NPC): `affinity(đối thủ)`
  mặc định = 0 — không bao giờ đạt ngưỡng thù địch sâu sắc qua đường
  này, luôn đi Nhánh A bước d (severity_tier thường), không có nguy cơ
  chết thật từ đối thủ vô danh ở MVP.
- **Nếu nhân vật chính đã `death_and_consequence_blocked=true` (đang
  phế đan điền) mà THUA TIẾP** trước khi khôi phục: cờ giữ nguyên
  `true` (idempotent — không "phế 2 lần", không cộng dồn hiệu ứng);
  `severity_tier` vẫn chạy để chọn tên hậu quả tường thuật cho lần thua
  này, nhưng không ảnh hưởng gì thêm nếu tier lại ra severe.
- **Nếu nhân vật chính đang phế đan điền mà rơi vào Nhánh A (thua trước
  thù địch sâu sắc)**: `death_roll` vẫn chạy bình thường — bị phế
  KHÔNG miễn trừ nguy cơ chết thật. Nếu `death=true`: chết thật xảy ra
  dù đang phế (không có "bảo hiểm kép").
- **Nếu người chơi diễn đạt ý định mơ hồ trong cửa sổ `Pending Fate`**
  (VD input tự do không rõ Kết liễu hay Tha mạng): phân loại hạ về mặc
  định **Tha mạng** — cùng nguyên tắc "nhãn ngoài menu → hạ an toàn"
  đã dùng ở Situation/Encounter Generation (`rp_only`).
- **Nếu `kill_witnessed` xảy ra với 0 nhân chứng còn sống**
  (`entities_in_scope(scene) \ {npc}` rỗng): "tội ác hoàn hảo" hợp lệ —
  đã chốt sẵn ở registry (`resolve_turn_affinity`: "Giết không nhân
  chứng: 0 field"). Death & Consequence vẫn khóa `alive(npc)=false`/
  `death_flag_[npc]=true` bình thường; chỉ NPC Affinity không nhận
  field lan truyền nào.
- **Nếu `affinity(đối thủ)` đúng biên `-80`**: Core Rule 3c dùng `≤` nên
  tự động tính vào nhánh thù địch sâu sắc — khớp registry
  `deep_hostility_threshold` (bao gồm).
- **Nếu `recovery_attempt` được gọi khi `death_and_consequence_blocked=false`**
  (nhân vật không hề bị phế): hành động không hợp lệ, bị chặn TRƯỚC khi
  tiêu tốn bất kỳ resource nào (đại cơ duyên/item/lượt tự tu) — không
  phải một no-op âm thầm, mà là action không xuất hiện trong gợi ý/
  không được chấp nhận.
- **Nếu nhân vật chính chết thật trong khi đang phế đan điền, rồi người
  chơi chọn Chơi lại** (Character Continuation): nhân vật MỚI khởi tạo
  `death_and_consequence_blocked=false`, `alive=true` từ đầu — cờ
  KHÔNG kế thừa sang nhân vật mới, kể cả với Quỷ tu/Chuyển sinh khi các
  lối đó được thiết kế đầy đủ (Vertical Slice).
- **Nếu NPC đang có quan hệ Song Tu active bị Kết liễu**: hành vi phía
  NPC Affinity đã chốt sẵn (state → Ended, terminal) — Death &
  Consequence chỉ cần khóa `alive`/`death_flag` đúng lúc, không cần
  logic riêng cho trường hợp Song Tu.
- **Nếu người chơi Undo đúng lượt Death & Consequence vừa resolve**
  (KHÔNG phải lượt chết thật — lượt chết thật không thể Undo theo Turn
  Manager Core Rule #9): mọi cờ hệ này vừa khóa trong lượt đó
  (`death_and_consequence_blocked`, kết quả `pending_fate`) rollback
  theo đúng Turn Manager Core Rule #8 ("chưa final tới khi xác nhận và
  không undo") — trách nhiệm tuân thủ thuộc về chính hệ này, giống
  cách `combat-system.md` đã xác nhận cho các hệ downstream của nó.
- **Nếu trận đấu kết thúc với `outcome.type="no_outcome"`** (bỏ chạy
  thành công hoặc chạm trần `MAX_EXCHANGE_COUNT`): Death & Consequence
  hoàn toàn KHÔNG resolve — không được diễn giải thành thắng hoặc thua
  (đúng ràng buộc đã khóa ở `combat-system.md`).

## Dependencies

| System | Direction | Nature of Dependency | Hard/Soft |
|---|---|---|---|
| Combat System (Designed) | Hệ này phụ thuộc Combat | Hand-off `outcome={type,winner_id,loser_id}` + `hp_after`/`max_HP` (→ `margin_ratio`) khi `battle_active=false` | Hard |
| NPC Affinity & Relationship (Designed) | 2 chiều | ĐỌC `affinity(đối thủ)` cho `death_roll`; PHÁT `kill_witnessed` (nạn nhân + witnesses) cho lan truyền | Hard |
| Turn Manager (Approved) | 2 chiều | ĐỌC `current_turn`, `suggested_action_count=4`; CUNG CẤP `is_death_turn` cho `undo_availability_window` (registry) + 2 gợi ý hành động trong cửa sổ `Pending Fate` | Hard |
| Setting & Canon Integration (Designed) | Setting & Canon phụ thuộc hệ này | CUNG CẤP `alive(X)` + `death_flag_[char_id]` — đóng interface provisional bên đó, hệ này resolve TRƯỚC trong cùng lượt | Hard (chiều ngược) |
| EXP & Realm Progression (Designed) | EXP phụ thuộc hệ này | CUNG CẤP `death_and_consequence_blocked(self)` — đúng tên provisional GDD đó đã dùng | Soft (chiều ngược) — thiếu thì EXP không bị chặn, hệ vẫn hoạt động |
| Situation/Encounter Generation (Designed) | 2 chiều | PHÁT thông tin chết để hệ đó dọn presence/`provoked_flag`; NHẬN witness list (`entities_in_scope`) cho `kill_witnessed` | Hard |
| Character Continuation (đã Designed, hệ #13) | Character Continuation phụ thuộc hệ này | Bàn giao tín hiệu `death_confirmed` khi chết thật — hệ này KHÔNG tự xử lý Quỷ tu/Chuyển sinh/Chơi lại | Hard (chiều ngược) |
| Equipment & Skill Data System (Approved) | Hệ này phụ thuộc (mềm) | Đọc field `efficacy` trên item cho `recovery_attempt` nhánh tiên thảo dị bảo — field này CHƯA tồn tại trên schema hiện tại (xem Open Questions) | Soft |

*(`systems-index.md` hiện chỉ liệt kê Combat System + NPC Affinity là
dependency của hệ #12 — 6 dependency còn lại ở trên tạo ra dependency
gap một chiều, cùng pattern các gap đã ghi nhận trước đó trong phiên
này — sẽ footnote ở `systems-index.md`, không sửa cấu trúc bảng.)*

## Tuning Knobs

| Parameter | Current Value | Safe Range | Effect of Increase | Effect of Decrease |
|---|---|---|---|---|
| `DEATH_ROLL_BASE` | 0.10 | 0–0.3 | Ngay cả thua sát nút trước thù địch sâu sắc cũng rủi ro hơn — có thể cảm thấy quá khắc nghiệt nếu quá cao | Thua sát nút gần như luôn an toàn — làm nhạt "nguy cơ THẬT SỰ" mà game-concept.md yêu cầu |
| `DEATH_ROLL_SCALE` | 0.85 | 0–1 | Độ dốc dốc hơn — thua càng đậm càng nhanh chạm trần chết gần như chắc chắn | Xác suất chết tăng chậm theo margin — ngay cả thua tan nát vẫn khá an toàn |
| `DEATH_ROLL_MIN` | 0.05 | 0–0.2 | Không bao giờ hoàn toàn an toàn dù thắng sát nút trước thù địch sâu sắc | Có thể chạm 0% — mất tính "không có gì tuyệt đối" |
| `DEATH_ROLL_MAX` | 0.95 | 0.8–1.0 | Gần 1.0 — thua tan nát gần như chắc chắn chết | Dưới 0.8 — ngay cả thua thảm hại nhất vẫn có cơ hội sống đáng kể, giảm trọng lượng ngưỡng thù địch sâu sắc |
| `SEVERITY_MILD_THRESHOLD` | 0.35 | 0.2–0.5 | Dải "trọng thương" (nhẹ nhất) thu hẹp — dễ rơi vào medium/severe hơn | Dải "trọng thương" mở rộng — khó đạt hậu quả nghiêm trọng hơn |
| `SEVERITY_SEVERE_THRESHOLD` | 0.75 | 0.6–0.85 | Khó đạt "phế đan điền/võ công" hơn — chỉ khi thua cực kỳ áp đảo | Dễ bị phế đan điền hơn — có thể cảm thấy quá trừng phạt cho MVP |
| `RECOVERY_FORTUNE_RATE` | 0.70 | 0.5–0.9 | Đại cơ duyên gần như luôn thành công — giảm căng thẳng của phế đan điền | Đại cơ duyên cũng có thể thất bại đáng kể — "không dễ dàng và không đảm bảo" rõ hơn nhưng có thể nản |
| `RECOVERY_ITEM_MIN` | 0.05 | 0–0.2 | Item yếu nhất vẫn có cơ hội đáng kể | Item yếu gần như vô dụng — khuyến khích chỉ dùng item tốt |
| `RECOVERY_ITEM_MAX` | 0.90 | 0.7–0.95 | Item tốt nhất gần như đảm bảo — giảm rủi ro sưu tầm | Ngay cả item tốt nhất vẫn có rủi ro thất bại đáng kể |
| `RECOVERY_SELF_RATE` | 0.08 | 0.03–0.15 | Tự tu trở thành lối thoát khả thi hơn — giảm áp lực phải tìm cơ duyên/item | Tự tu gần như vô dụng — buộc người chơi phụ thuộc cơ duyên/item |
| `RECOVERY_SELF_COOLDOWN_TURNS` | 8 | 5–15 | Người chơi thử tự tu ít lần hơn trong cùng khoảng thời gian chơi | Có thể spam thử tự tu liên tục — làm nhạt chi phí "thời gian" của phương pháp này |

## Visual/Audio Requirements

*(Đề xuất bởi `art-director` — Visual/Audio BẮT BUỘC cho hệ này (nhóm
Combat/damage/health). Chưa có Art Bible chính thức, dựa trên Visual
Identity Anchor "Mực Chưa Khô" của `game-concept.md`.)*

**Giải quyết vấn đề "đỏ son trùng lặp" với Combat**: Combat đã dùng đỏ
son làm viền mỏng, thoáng qua quanh khung Character Card khi
`outcome.type="lose"`. Hệ này xử lý các trạng thái NẶNG và BỀN hơn
nhiều (trọng thương thoáng qua → phế đan điền kéo dài → chết vĩnh
viễn), nhưng luật "khẩu phần hóa nghiêm ngặt" cấm thêm màu/sắc độ mới.
Giải pháp: KHÔNG đổi màu, chỉ đổi **diện tích, độ đặc, và độ bền** của
cùng một đỏ son — độ bền tín hiệu thị giác phản chiếu đúng độ bền trạng
thái cơ học. "Hồi phục" biểu đạt bằng sự BIẾN MẤT của đỏ son (không
dùng xanh ngọc — xanh ngọc độc quyền cho đột phá cảnh giới).

| Event | Visual Feedback | Audio Feedback | Priority |
|---|---|---|---|
| **1. Chết thật** (`is_death_turn=true`) | Một nét đỏ son "gạch" ngang dưới mục tường thuật cuối cùng như đang đóng một trang nhật ký — KHÔNG phải màn hình Game Over. Ngay sau đó, toàn trang khô lại thành xám-đen đơn sắc vĩnh viễn; đỏ son không xuất hiện sống động cho nhân vật này nữa. Character Card từ đây về sau mang dấu triện đỏ son nhỏ, TĨNH (không hoạt ảnh) cố định góc thẻ đánh dấu `alive=false`. Không particle/rung màn hình (Anti-Pillar). | (Tùy chọn) âm "cộp" ngắn (<1s) mô phỏng đóng dấu triện, sau đó im lặng hoàn toàn — sự vắng mặt âm thanh củng cố tính chung cuộc. | BLOCKING (visual) / ADVISORY (audio) |
| **2. Phế đan điền/võ công** (severe, khóa `death_and_consequence_blocked`) | Khung con dấu tại vùng chỉ số/đan điền của Character Card đóng lại thành khối đỏ son ĐẶC (khác viền mảnh của Combat `lose`) — cục bộ, chỉ vùng đó. Bền — hiển thị lại mỗi lần mở thẻ cho tới khi D.3 thành công. | Không bắt buộc — nếu có, âm đóng dấu tương tự event 1 nhưng nhỏ/trầm hơn. | BLOCKING (visual) / ADVISORY (audio) |
| **3. Hậu quả nhẹ/vừa** (trọng thương/sỉ nhục/ép uống độc) | Nét đỏ son mảnh kiểu "gạch chân" thoáng qua dưới dòng tường thuật khi hậu quả được viết ra, mờ đi trong cùng nhịp đọc — KHÔNG lưu dấu trên Character Card. | Không cần. | ADVISORY |
| **4. Pending Fate — Kết liễu vs Tha mạng** | Chưa có sự thật cơ học nào khóa ở thời điểm này → KHÔNG dùng đỏ son. 2 gợi ý này trình bày chữ đậm hơn gợi ý thường (cùng pattern Combat dùng cho cảnh báo áp chế cảnh giới), trong khung mực loang hữu cơ (tường thuật, không phải khung con dấu dữ liệu cứng) — phản ánh đây là quyết định nhập vai, chưa phải kết quả đã khóa. | Không cần. | BLOCKING (visual framing) / ADVISORY (audio) |
| **5. Hồi phục thành công** (D.3, gỡ cờ) | Con dấu đỏ son đặc (event 2) nứt và tan biến, lộ lại nền giấy dó trung tính — hiệu ứng "sáng nhẹ" thoáng qua bằng tông giấy kem, KHÔNG dùng xanh ngọc. Sự biến mất của đỏ son chính là tín hiệu hy vọng. | Tùy chọn: âm nhẹ kiểu hơi thở/chuông thoáng, khác hẳn âm "cộp" của event 1/2. | ADVISORY |
| **6. Character Card hiển thị `alive=false`/crippled khi xem lại sau** | Nhân vật đã chết: dấu triện đỏ son nhỏ/tĩnh cố định góc thẻ + vùng chân dung/tên chuyển xám nhạt đơn sắc. Nhân vật đang phế: badge đỏ son đặc cục bộ vùng chỉ số, tiếp tục hiển thị mỗi lần mở thẻ. Áp dụng ĐỒNG NHẤT cho cả nhân vật chính lẫn NPC. | Không cần (màn hình tĩnh). | BLOCKING |

*(Toàn bộ khác biệt giữa 3 tầng nghiêm trọng nằm ở diện tích + độ đặc +
độ bền của cùng một đỏ son, không phát sinh sắc độ mới — giữ đúng luật
khẩu phần hóa đã khóa ở `game-concept.md`. Audio ở mức tối thiểu/tùy
chọn — project chưa có hệ audio chính thức.)*

## UI Requirements

| Information | Display Location | Update Frequency | Condition |
|---|---|---|---|
| Trạng thái `alive=false` (đã chết) | Character Card (badge góc thẻ, xem Visual/Audio event 1/6) | Tĩnh, không đổi sau khi set | Khi nhân vật (chính hoặc NPC) đã chết thật |
| Trạng thái `death_and_consequence_blocked=true` (phế đan điền) | Character Card, vùng chỉ số/đan điền (badge, xem event 2/6) | Mỗi lần mở thẻ, cho tới khi gỡ cờ | Khi đang phế đan điền/võ công |
| Nút "Hồi phục" | Character Card, cạnh badge phế đan điền — cùng pattern nút Song Tu (chỉ hiện khi đủ điều kiện) | Theo trạng thái mỗi lượt | CHỈ hiện khi `death_and_consequence_blocked=true`; liệt kê tối đa 2 lựa chọn khả dụng ngay lúc đó: "Dùng [tên item]" (nếu sở hữu ≥1 item có `efficacy`) và "Tự tu" (nếu `recovery_self_attempt_allowed=true`) — "Đại cơ duyên" KHÔNG phải nút bấm, phát sinh từ tình huống do Situation/Encounter Generation dựng, không thuộc UI này |
| Gợi ý "Kết liễu [NPC]" / "Tha mạng [NPC]" | Danh sách 4 gợi ý hành động chuẩn (đã có UX Flag từ Turn Manager/Combat) | Đúng 1 lượt (cửa sổ `Pending Fate`) | Chỉ khi vừa thắng trận và đối thủ còn `pending_fate` |
| Đoạn tường thuật hậu quả (mọi tier) | Khung tường thuật chính (không phải UI riêng — do AI viết dựa trên `consequence_type` đã khóa) | Mỗi lần hệ này resolve | Luôn — mọi nhánh A/B đều có tường thuật tương ứng |

*(Không tạo màn hình riêng cho hệ này — mọi hiển thị đều lồng vào
Character Card và luồng tường thuật/gợi ý hành động đã có sẵn, đúng
tinh thần "không phải HUD game" của Visual Identity Anchor.)*

📌 **UX Flag — Death & Consequence**: Hệ này có yêu cầu UI (badge trạng
thái + nút Hồi phục có điều kiện trên Character Card, 2 gợi ý hành
động bổ sung trong cửa sổ Pending Fate). Ở Phase 4 (Pre-Production),
chạy `/ux-design` cho Character Card (nếu chưa có UX spec riêng)
**trước khi** viết epics — story liên quan nên trích
`design/ux/character-card.md`, không trích thẳng GDD này.

## Acceptance Criteria

*(Đề xuất bởi `qa-lead`. Hệ này thuần logic/state machine + RNG, không
network — mọi phụ thuộc ngoài (Combat hand-off, NPC Affinity đọc
affinity, Turn Manager, Character Continuation, Situation/Encounter
Generation witness list, Equipment & Skill Data `efficacy`) phải được
**inject** như tham số/mock, không gọi hệ thật. Tường thuật hậu quả do
AI viết SAU khi hệ này khóa `consequence_type` (Mechanic/Narration
Contract một chiều) — nằm NGOÀI phạm vi Section này, không có AC nào ở
đây kiểm nội dung narration.)*

**Story Type**: Logic (formula + state machine + pipeline resolution,
RNG-driven) → **BLOCKING** gate, test tự động bắt buộc tại
`tests/unit/death-and-consequence/` (naming:
`death_consequence_[feature]_test.gd`, `test_[scenario]_[expected]`).

**Ghi chú test setup**: Trừ khi ghi chú khác, mọi AC dùng cố định giá
trị default ở Tuning Knobs làm fixture, cùng hằng số khóa
(`deep_hostility_threshold=-80` bao gồm, registry). RNG phải inject
được (seeded stub) để test deterministic. `margin_ratio` đổi CHỦ THỂ
theo nhánh — Nhánh A dùng của **đối thủ** (người thắng), Nhánh B "Tha
mạng" dùng của **nhân vật chính** (người thắng) — mọi fixture phải ghi
rõ chủ thể để tránh nhầm lẫn khi viết test. Các AC dùng interface
provisional (Character Continuation — đã Designed; Equipment & Skill
Data — `efficacy` chưa có schema) đánh dấu "provisional-interface", rà
lại khi hệ nguồn được thiết kế/bổ sung field.

### Core Rules

**AC-01** (Rule #1 — phạm vi kích hoạt; đóng Edge Case "no_outcome"):
GIVEN 3 kịch bản hand-off từ Combat: (a) `outcome.type="lose"`,
loser=nhân vật chính; (b) `outcome.type="win"`, winner=nhân vật chính;
(c) `outcome.type="no_outcome"` (bỏ chạy hoặc chạm `MAX_EXCHANGE_COUNT`),
WHEN Combat phát `battle_active=false`, THEN Death & Consequence resolve
ở (a) và (b) — khóa đúng 1 trong 2 nhánh tương ứng — nhưng KHÔNG resolve
ở (c): không nhánh nào chạy, không field nào bị khóa. *(integration
test, mock Combat hand-off)*

**AC-02** (Rule #2 — thứ tự trong lượt: sau Combat, trước NPC
Affinity/Setting & Canon): GIVEN 1 lượt xác nhận có đủ 4 hệ tham gia
(Combat → Death & Consequence → NPC Affinity → Setting & Canon, spy ghi
thứ tự gọi), WHEN lượt resolve, THEN thứ tự gọi ĐÚNG: Combat trước,
Death & Consequence kế tiếp (`kill_witnessed` đã sẵn sàng khi
`resolve_turn_affinity` chạy), rồi mới tới NPC Affinity và Setting &
Canon (đọc `alive`/`death_flag` mới nhất). *(integration test, spy
call-order)*

**AC-03** (Rule #3a — đọc affinity ĐẦU lượt, TRƯỚC delta cùng lượt của
NPC Affinity): GIVEN `affinity(đối thủ)` lưu trữ hiện hành = -85 đầu
lượt, VÀ NPC Affinity của CHÍNH lượt đó (mock) đã chuẩn bị delta +10
nhưng CHƯA apply (chờ resolve sau theo AC-02), WHEN Death & Consequence
đọc `affinity(đối thủ)` qua interface public để chạy `death_roll`, THEN
giá trị đọc được = -85 (đầu lượt), KHÔNG phải -75. *(integration test,
mock NPC Affinity delta pending)*

**AC-04** (Rule #3b — đối thủ không theo dõi Hảo cảm → affinity=0 mặc
định; đóng Edge Case #1): GIVEN đối thủ KHÔNG nằm trong danh sách NPC
theo dõi Hảo cảm (mock trả not-found), WHEN đọc `affinity(đối thủ)`,
THEN mặc định = 0 — KHÔNG BAO GIỜ đạt `deep_hostility_threshold=-80`
qua đường này → luôn đi thẳng bước d (severity_tier thường);
`death_roll` KHÔNG được gọi (spy đếm=0). *(unit + spy)*

**AC-05** (Rule #3c — biên `deep_hostility_threshold=-80` bao gồm, gate
death_roll; đóng Edge Case #6): GIVEN `affinity(đối thủ)` lần lượt =
-79, -80, -81, WHEN nhân vật chính thua, THEN `death_roll` ĐƯỢC gọi
(spy đếm=1) chỉ ở -80 và -81, KHÔNG được gọi ở -79 (spy đếm=0) — khớp
đúng registry (`<=`, bao gồm). *(unit + spy)*

**AC-06** (Rule #3c — chết thật: khóa flags + bàn giao Character
Continuation, KHÔNG chạy tiếp Formula D.2): GIVEN `affinity(đối thủ)=-90`,
`death_roll` mock trả `death=true`, WHEN resolve Nhánh A, THEN khóa
`alive(nhân vật chính)=false`, `death_flag_player=true`,
`turn.is_death_turn=true`; phát tín hiệu `death_confirmed` cho
Character Continuation (mock, spy đếm=1); Formula D.2 KHÔNG được gọi ở
nhánh này (spy đếm=0). *(unit + spy, provisional-interface)*

**AC-07** (Rule #3c/3d — sống sót ép `severe` qua `forced_severe`, ĐỘC
LẬP với margin_ratio thấp — điểm neo boundary chính): GIVEN
`affinity(đối thủ)=-90`, `death_roll` mock trả `death=false`,
`margin_ratio=0.05` (rõ ràng thuộc dải "mild" nếu tính thường), WHEN
resolve bước d, THEN `forced_severe=true` được set ở bước c, D.2 trả
`severity_tier="severe"` BẤT KỂ margin_ratio thấp — bảng margin
(mild/medium) bị bỏ qua hoàn toàn;
`consequence_type="phế đan điền/võ công"`,
`death_and_consequence_blocked(nhân vật chính)=true`. Test đối chứng:
CÙNG `margin_ratio=0.05` nhưng `affinity(đối thủ) > -80` (`forced_severe`
không được set) → `severity_tier="mild"` — chứng minh kết quả đổi do cờ
`forced_severe`, không phải do input D.2 đổi. *(unit,
boundary/contrast test)*

**AC-08** (Rule #3d — áp D.2 bình thường khi `forced_severe=false`):
GIVEN `affinity(đối thủ) > -80`, `margin_ratio=0.42`, WHEN resolve bước
d, THEN chạy Formula D.2 bình thường theo bảng margin (không ép
severe), `severity_tier="medium"`. *(unit)*

**AC-09** (Rule #4 — Nhánh B Kết liễu: khóa flags NPC + phát
kill_witnessed): GIVEN nhân vật chính thắng, đối thủ `pending_fate`,
người chơi chọn "Kết liễu", `entities_in_scope(scene)={global,
npc_victim, npc_A, npc_B}`, WHEN resolve, THEN khóa
`alive(npc_victim)=false`, `death_flag_npc_victim=true`; phát
`kill_witnessed(victim=npc_victim, witnesses={npc_A, npc_B})` (loại
chính npc_victim khỏi witness set) cho NPC Affinity (mock, spy đếm=1,
đúng payload). *(unit + spy)*

**AC-10** (Rule #4 — Nhánh B Tha mạng tường minh: áp CÙNG bảng D.2,
chủ thể margin_ratio là nhân vật chính): GIVEN nhân vật chính thắng với
`margin_ratio(nhân vật chính)=0.85` (chủ thể đổi so với Nhánh A), người
chơi chọn "Tha mạng" tường minh, WHEN resolve, THEN NPC bại trận nhận
`severity_tier="severe"` (CÙNG bảng D.2, cùng threshold Nhánh A dùng) —
không có bảng riêng cho NPC; `alive(npc)` KHÔNG đổi (vẫn true). *(unit)*

**AC-11** (Rule #4 — Tha mạng mặc định khi hết lượt không chọn, resolve
đúng tại thời điểm Turn Manager XÁC NHẬN lượt đó — điểm neo boundary
chính): GIVEN `pending_fate(npc)` mở đúng 1 lượt kế tiếp sau trận
thắng, WHEN lượt đó được Turn Manager XÁC NHẬN (mock) mà người chơi
KHÔNG chọn "Kết liễu" tường minh (không hành động gì liên quan HOẶC làm
việc khác), THEN hệ tự động resolve theo nhánh "Tha mạng" NGAY TẠI thời
điểm xác nhận đó — CÙNG hành vi AC-10; state `pending_fate` chuyển Idle
đúng lúc lượt đó xác nhận, KHÔNG kéo dài sang lượt thứ 2. Test đối
chứng: nếu người chơi chọn "Kết liễu" ĐÚNG trong lượt đó, timeout KHÔNG
kích hoạt (AC-09 áp dụng thay). *(unit + mock Turn Manager confirm)*

**AC-12** (Rule #4 — ý định mơ hồ hạ về Tha mạng; đóng Edge Case #4):
GIVEN người chơi nhập input tự do mơ hồ trong cửa sổ `pending_fate`
(không phân loại rõ Kết liễu/Tha mạng qua bộ phân loại xác định), WHEN
phân loại ý định, THEN hạ về mặc định **Tha mạng** — không bao giờ tự
suy diễn thành Kết liễu từ input mơ hồ. *(unit, provisional-interface —
pattern `rp_only`)*

**AC-13** (Rule #5 — mặc định `alive=true` khi tạo mới, lazy-init):
GIVEN 1 nhân vật (chính hoặc NPC) CHƯA từng được hệ này ghi field
`alive`, WHEN đọc `alive(char_id)` lần đầu, THEN trả về `true` — không
cần signal "tạo nhân vật" riêng, khớp pattern default init của NPC
Affinity (AC-30 GDD đó). *(unit)*

**AC-14** (Rule #5 — độc quyền ghi `alive=false`/`death_flag=true` CHỈ
kiểm chứng được ở TẦNG INTERFACE của module này — xem Open Questions):
GIVEN interface public của hệ này, WHEN kiểm tra bề mặt API (interface
inspection, pattern AC-09 của `npc-affinity-relationship.md`), THEN
CHỈ tồn tại đúng 2 code path nội bộ có quyền ghi (Nhánh A bước c, Nhánh
B Kết liễu) — không setter public nào khác lộ ra; mọi mock consumer
khác (Setting & Canon, Turn Manager, Character Continuation) CHỈ có
quyền đọc, gọi setter phải bị từ chối/không tồn tại. **Giới hạn**: AC
này KHÔNG (và không thể chỉ bằng unit test của module này) chứng minh
không hệ nào KHÁC trong toàn codebase ghi thẳng vào storage layer, bỏ
qua interface — xem Open Questions. *(unit, interface inspection)*

**AC-15** (Rule #6 — mặc định false, chỉ true khi severe, không tự hết
hạn): GIVEN nhân vật mới chưa từng thua severe, WHEN đọc
`death_and_consequence_blocked`, THEN = `false`; GIVEN severity_tier=
"severe" vừa khóa (từ AC-07 hoặc AC-08 dạng severe thường), WHEN đọc
lại NGAY SAU, THEN = `true`; GIVEN cờ=true, WHEN 100 lượt xác nhận trôi
qua KHÔNG có D.3 nào chạy, THEN cờ VẪN = `true`. *(unit — pattern "no
decay" giống npc-affinity AC-03)*

### Formulas

**AC-16** (D.1 — ca thường, khớp ví dụ GDD): GIVEN
`DEATH_ROLL_BASE=0.10, DEATH_ROLL_SCALE=0.85`, `margin_ratio=0.3`, roll
mock=0.2, WHEN tính `death_roll`, THEN `P_death=0.355` chính xác,
`death=true`. *(unit, regression neo số)*

**AC-17** (D.1 — ca thường 2, chạm trần MAX, khớp ví dụ GDD): GIVEN
cùng knob, `margin_ratio=1.0`, roll mock=0.97, WHEN tính `death_roll`,
THEN `P_death=clamp(0.95,...)=0.95` (không vượt `DEATH_ROLL_MAX` dù
margin=1.0 tối đa), `death=false` → kích hoạt AC-07 (ép severe).
*(unit, regression neo số)*

**AC-18** (D.1 — boundary `margin_ratio=0`, clamp sàn): GIVEN
`DEATH_ROLL_BASE=0` (cực đoan trong safe range), `margin_ratio=0`, WHEN
tính `P_death`, THEN bị clamp LÊN đúng `DEATH_ROLL_MIN=0.05` (không
phải 0) — không bao giờ 0% chết tuyệt đối dù cả base và margin đều 0.
*(unit, boundary)*

**AC-19** (D.1 — boundary `margin_ratio=1`, clamp trần): GIVEN
`DEATH_ROLL_BASE=0.3, DEATH_ROLL_SCALE=1.0` (cực đoan trong safe
range), `margin_ratio=1.0` (thô=1.3), WHEN tính `P_death`, THEN bị
clamp XUỐNG đúng `DEATH_ROLL_MAX=0.95` (không phải 1.3/1.0) — không bao
giờ 100% chết tuyệt đối. *(unit, boundary)*

**AC-20** (D.1 — biên so sánh chặt `<`, không phải `<=`): GIVEN
`roll_uniform` mock trả ĐÚNG BẰNG `P_death` (VD `P_death=0.355`,
roll=0.355), WHEN tính `death_roll`, THEN `death=false` — công thức
dùng `roll < P_death` (chặt), bằng ngưỡng KHÔNG tính là chết. *(unit,
boundary — operator correctness)*

**AC-21** (D.2 — ca thường medium + tag mặc định null, khớp ví dụ
GDD): GIVEN `SEVERITY_MILD_THRESHOLD=0.35, SEVERITY_SEVERE_THRESHOLD=
0.75`, `margin_ratio=0.42`, `npc_tag.medium_override=null`, WHEN tính
`severity_tier`, THEN `tier="medium"`, `consequence_type="sỉ nhục"`.
*(unit, regression neo số)*

**AC-22** (D.2 — ca thường severe, khớp ví dụ GDD): GIVEN cùng knob,
`margin_ratio=0.85`, WHEN tính `severity_tier`, THEN `tier="severe"`,
`consequence_type="phế đan điền/võ công"`,
`death_and_consequence_blocked=true` khóa TRONG CÙNG bước này. *(unit,
regression neo số)*

**AC-23** (D.2 — boundary mild/medium tại đúng threshold): GIVEN
`SEVERITY_MILD_THRESHOLD=0.35`, `margin_ratio` lần lượt = 0.349, 0.35,
0.351, WHEN tính tier, THEN lần lượt = "mild", "medium", "medium" —
đúng bằng ngưỡng đã rơi qua tier kế tiếp (biên `<`). *(unit, boundary)*

**AC-24** (D.2 — boundary medium/severe tại đúng threshold): GIVEN
`SEVERITY_SEVERE_THRESHOLD=0.75`, `margin_ratio` lần lượt = 0.749,
0.75, 0.751, WHEN tính tier, THEN lần lượt = "medium", "severe",
"severe". *(unit, boundary)*

**AC-25** (D.2 — `npc_tag.medium_override` chỉ áp dụng ở tier medium):
GIVEN `npc_tag.medium_override="ep_uong_doc"`, WHEN margin_ratio rơi
vào (a) medium và (b) severe, THEN (a) `consequence_type="ép uống
độc"` (ghi đè "sỉ nhục"), (b) `consequence_type` VẪN "phế đan
điền/võ công" — tag không ảnh hưởng tier severe. *(unit)*

**AC-26** (D.3 — thành công đại cơ duyên, khớp ví dụ GDD + gỡ cờ):
GIVEN `RECOVERY_FORTUNE_RATE=0.70`, roll mock=0.42,
`death_and_consequence_blocked=true` trước đó, WHEN gọi
`recovery_attempt(method=đại_cơ_duyên)`, THEN `recovery_success=true`,
cờ chuyển `false`; sự kiện cơ duyên bị tiêu (mock spy đếm=1). *(unit,
regression neo số)*

**AC-27** (D.3 — thất bại tiên thảo dị bảo, chi phí VẪN bị trừ, khớp ví
dụ GDD — 1/3 method của "cost trừ bất kể kết quả"): GIVEN
`efficacy(item)=0.55, RECOVERY_ITEM_MIN=0.05, RECOVERY_ITEM_MAX=0.90`,
roll mock=0.71, WHEN gọi `recovery_attempt(method=tiên_thảo_dị_bảo)`,
THEN `P=0.55`, `recovery_success=false`, cờ giữ nguyên `true`; NHƯNG
item VẪN bị tiêu thụ (mất charge/instance, mock spy đếm=1). *(unit,
regression neo số, provisional-interface — `efficacy` schema)*

**AC-28** (D.3 — thất bại tự tu, chi phí VẪN bị trừ (reset cooldown) —
2/3 method): GIVEN `RECOVERY_SELF_RATE=0.08`, roll mock=0.5 (thất
bại), `current_turn=100`, WHEN gọi `recovery_attempt(method=tự_tu)`,
THEN `recovery_success=false`, cờ giữ nguyên `true`; NHƯNG
`last_self_attempt_turn(character)` VẪN set = 100. *(unit)*

**AC-29** (D.3 — thất bại đại cơ duyên, chi phí VẪN bị trừ — 3/3
method, hoàn thiện "cost trừ bất kể kết quả"): GIVEN
`RECOVERY_FORTUNE_RATE=0.70`, roll mock=0.85 (thất bại), WHEN gọi
`recovery_attempt(method=đại_cơ_duyên)`, THEN `recovery_success=false`,
cờ giữ nguyên `true`; NHƯNG sự kiện cơ duyên VẪN bị tiêu (mock spy
đếm=1). *(unit — cùng nhóm AC-27/AC-28)*

**AC-30** (D.3 — thành công tự tu, khớp ví dụ GDD, boundary cooldown
chính xác): GIVEN `RECOVERY_SELF_COOLDOWN_TURNS=8`,
`last_self_attempt_turn=92, current_turn=100` (hiệu=8), roll mock=0.03
< 0.08, WHEN kiểm `recovery_self_attempt_allowed` rồi gọi
`recovery_attempt`, THEN `allowed=true`, `recovery_success=true`, cờ gỡ
`false`. *(unit, regression neo số)*

**AC-31** (D.3 — boundary cooldown CHƯA đủ, hành động bị chặn TRƯỚC khi
tốn resource): GIVEN `RECOVERY_SELF_COOLDOWN_TURNS=8`,
`last_self_attempt_turn=93, current_turn=100` (hiệu=7<8), WHEN kiểm
`recovery_self_attempt_allowed`, THEN = `false` — "Tự tu" KHÔNG xuất
hiện trong gợi ý; `roll_uniform` KHÔNG được gọi (spy đếm=0),
`last_self_attempt_turn` KHÔNG đổi. *(unit + spy, boundary)*

### Edge Cases

**AC-32** (Edge Case #2 — blocked flag idempotent khi thua tiếp lúc
đang phế): GIVEN `death_and_consequence_blocked=true` (đang phế), nhân
vật chính thua tiếp trận mới với `severity_tier` tính lại = "severe",
WHEN resolve, THEN cờ VẪN `true` (không "phế 2 lần", không cộng dồn
hiệu ứng cơ học); `consequence_type`/`severity_tier` VẪN tính bình
thường cho tường thuật lượt đó, chỉ KHÔNG có side-effect cơ học bổ sung
nào. *(unit — idempotency test)*

**AC-33** (Edge Case #3 — bị phế KHÔNG miễn trừ death_roll, không "bảo
hiểm kép"): GIVEN `death_and_consequence_blocked=true`, nhân vật chính
rơi vào Nhánh A với `affinity(đối thủ) ≤ -80`, WHEN `death_roll` chạy,
THEN thực thi BÌNH THƯỜNG (không bị skip vì đang phế); GIVEN roll mock
cho `death=true`, THEN chết thật xảy ra dù đang phế đan điền. *(unit)*

**AC-34** (Edge Case #5 — kill_witnessed 0 nhân chứng, "tội ác hoàn
hảo"): GIVEN `entities_in_scope(scene) \ {npc}` rỗng, người chơi chọn
Kết liễu, WHEN resolve, THEN `alive(npc)=false`/`death_flag_npc=true`
VẪN khóa bình thường (không phụ thuộc số nhân chứng); `kill_witnessed`
VẪN phát ra cho NPC Affinity nhưng với witness set RỖNG (không phải
không phát sự kiện). *(unit)*

**AC-35** (Edge Case #7 — recovery_attempt khi KHÔNG bị phế, chặn
TRƯỚC khi tốn resource): GIVEN `death_and_consequence_blocked=false`,
WHEN người chơi cố gọi `recovery_attempt` (bất kỳ method), THEN hành
động bị TỪ CHỐI TRƯỚC khi `roll_uniform` được gọi (spy đếm=0) và TRƯỚC
khi bất kỳ resource nào bị tiêu (item/cơ duyên/lượt tự tu — spy đếm=0
cả 3) — không phải no-op âm thầm mà action không xuất hiện trong gợi ý
hợp lệ. *(unit + spy)*

**AC-36** (Edge Case #8 — nhân vật MỚI sau Chơi lại không kế thừa cờ):
GIVEN nhân vật chính CŨ chết thật trong khi
`death_and_consequence_blocked=true`, Character Continuation phát
`char_id` MỚI (mock), WHEN đọc `alive`/`death_and_consequence_blocked`
của `char_id` MỚI lần đầu, THEN `alive=true`,
`death_and_consequence_blocked=false` (lazy-init, khớp AC-13/AC-15) —
KHÔNG có đường đọc nào trả về giá trị của `char_id` CŨ. *(unit,
provisional-interface — Character Continuation đã Designed)*

**AC-37** (Edge Case #9 — NPC Song Tu active bị Kết liễu, không cần
logic riêng): GIVEN NPC đang có quan hệ Song Tu active (mock trạng thái
NPC Affinity), người chơi chọn Kết liễu NPC đó, WHEN resolve, THEN hành
vi ĐÚNG NHƯ AC-09, KHÔNG có nhánh code riêng rẽ theo trạng thái Song Tu
— hệ này không đọc/không quan tâm trạng thái Song Tu khi Kết liễu.
*(unit — negative-assertion, xác nhận rõ ràng hành vi không-có-nhánh-riêng)*

**AC-38** (Edge Case #10 — Undo lượt vừa resolve, KHÔNG PHẢI lượt chết
thật, rollback toàn bộ cờ): GIVEN snapshot X trước lượt N; lượt N
resolve `severity_tier="severe"` (khóa blocked=true) HOẶC Kết liễu
(khóa alive/death_flag NPC) HOẶC pending_fate còn đang mở, WHEN Turn
Manager Undo đúng lượt N (mock, độ sâu 1, `is_death_turn=false`), THEN
MỌI cờ hệ này vừa khóa trong lượt N rollback về ĐÚNG snapshot X — không
field nào rollback một phần. *(unit + mock Turn Manager)*

**AC-39** (Edge Case #10 — biên: lượt chết thật KHÔNG BAO GIỜ undo
được): GIVEN lượt N là chết thật (Nhánh A bước c,
`turn.is_death_turn=true`), WHEN kiểm `undo_availability_window`
(registry, mock Turn Manager) cho lượt N kể cả khi là lượt gần nhất,
THEN `undo_available=false` TUYỆT ĐỐI — NGOẠI LỆ DUY NHẤT so với mọi
lượt D&C khác (đối chứng AC-38, nơi lượt severe/Kết liễu không có
`is_death_turn=true` và VẪN undo được). *(unit — đóng biên trách nhiệm
giữa Rule #3c và Turn Manager Rule #9)*

## Open Questions

| Question | Owner | Deadline | Resolution |
|----------|-------|----------|-----------|
| Rule #5 ("KHÔNG có đường nào khác được đổi `alive`/`death_flag`") không thể chứng minh trọn vẹn chỉ bằng unit test của module này — AC-14 chỉ kiểm được ở tầng interface. Cần: architecture-contract/lint test cấp dự án (grep toàn codebase tìm write trực tiếp vào field này ngoài module) đưa vào CI, hoặc chấp nhận AC-14 là trần coverage tự động. | technical-director | trước khi hệ này Approved | Chưa quyết |
| `efficacy(item)` (Formula D.3, nhánh tiên thảo dị bảo) chưa tồn tại trên item schema của `equipment-skill-data-system.md` — cũng chưa rõ mô hình tiêu thụ (single-use hay có "charge"). | game-designer + systems-designer | trước khi authoring content tiên thảo dị bảo thật | Chưa quyết — provisional-interface, AC-27 chạy được với giá trị inject |
| Chưa có hệ nào sở hữu việc kích hoạt/tần suất sự kiện "đại cơ duyên" — D.3 chỉ định nghĩa tỷ lệ thành công KHI sự kiện đã xảy ra. | narrative-director + game-designer | trước Vertical Slice (nội dung đại cơ duyên thật) | Chưa quyết — có thể thuộc Situation/Encounter Generation hoặc một hệ story-event riêng |
| `npc_tag.medium_override` (D.2 — chọn "ép uống độc" thay "sỉ nhục") cần 1 trường content-authored trên schema NPC — chưa rõ hệ nào sở hữu schema đó (Character Card & Identity, hệ #14, chưa thiết kế). | game-designer | khi Character Card & Identity được thiết kế | Chưa quyết — mặc định null (→"sỉ nhục") vẫn hoạt động đầy đủ ở MVP nếu thiếu tag |
| ~~Cơ chế `outcome="no_outcome"` của `combat-system.md`~~ — **đã sửa 2026-08-03 cùng phiên**: `MAX_EXCHANGE_COUNT` không còn là trần thiết kế; hòa giờ chỉ qua D.9b (giao hữu, parity + HP thấp) hoặc D.9c-trong-spar (chạm trần kỹ thuật) hoặc tín hiệu khẩn cấp xen ngang (`external_abort_signal`) — ngoài spar luôn bắt buộc win/lose. AC-01 của GDD này ("no_outcome không resolve") vẫn đúng nguyên vẹn (mọi nhánh no_outcome mới vẫn là no_outcome). | game-designer + systems-designer | — | **Còn lại**: điều kiện trigger `external_abort_signal` thuộc `situation-encounter-generation.md`, chưa thiết kế — xem Open Question tương ứng ở đó |
