# EXP & Realm Progression

> **Status**: In Design
> **Author**: user + agents
> **Last Updated**: 2026-08-02
> **Implements Pillar**: Pillar 3 (Sức Mạnh Có Logic)

## Overview

EXP & Realm Progression là hệ thống dữ liệu sở hữu toàn bộ khái niệm "cấp" và
"bậc/cảnh giới" của nhân vật trong Vô Danh Lục: tích lũy điểm kinh nghiệm
(EXP) từ nhiều nguồn hành động, quy đổi qua hệ số Tâm pháp, và quản lý việc
lên cấp theo quy tắc 10 cấp = 1 bậc/cảnh giới. Với người chơi, đây chính là
cảm giác "tu luyện" cụ thể nhất của thể loại tu tiên — mỗi lần đủ EXP để lên
cấp là một xác nhận tiến bộ nhỏ, và mỗi lần vượt qua một mốc tròn chục (cấp
10, 20, 30...) để đột phá sang bậc/cảnh giới mới là một khoảnh khắc lớn, có
điều kiện riêng chứ không chỉ đơn thuần đủ EXP (ví dụ: cần thêm Hồn Hoàn ở
các mốc đó, theo motif nguyên tác Đấu La Đại Lục). Giá trị `tier(C)` mà hệ
này tính ra được Combat System đọc trực tiếp để tính áp chế cảnh giới
(Formula D.1) — không có hệ này, Combat không có cách nào biết ai đang ở bậc
nào để áp dụng phạt vượt bậc, và Character Card không có gì để hiển thị ở
mục Cấp độ - Bậc.

## Player Fantasy

Người chơi cảm nhận sự tu luyện dày công gây dựng: mỗi trận thắng, mỗi tình
huống vượt qua đều cộng dồn vào EXP, và ranh giới rõ ràng nhất của tiến bộ
không phải là một bảng số liệu tăng đều mà là những **MỐC ĐỘT PHÁ**
(breakthrough) — vượt cấp tròn chục để bước sang bậc/cảnh giới mới. Cảm giác
đúng là hồi hộp-thỏa mãn kiểu "đủ điều kiện đột phá chưa?" thay vì chỉ "đủ
EXP chưa?" — vì đến ngưỡng tròn chục, đủ EXP thôi CHƯA đủ, cần thêm một điều
kiện đặc thù (ví dụ Hồn Hoàn ở Đấu La Đại Lục), khiến mỗi lần đột phá thành
công giống một cột mốc thật trong hành trình tu luyện, chứ không đơn thuần
"cày đủ số" — đúng tinh thần "không ai cho không bạn điều gì" của Core
Fantasy. Đây trực tiếp phục vụ Pillar 3 (Sức Mạnh Có Logic) — sức mạnh tăng
theo công thức minh bạch, không có hào quang nhân vật chính; và phần thưởng
cảm xúc của breakthrough được xác nhận khách quan qua Thẻ Nhân Vật (mục Cấp
độ - Bậc), không chỉ qua lời AI tường thuật (Pillar 4 chỉ diễn dịch, không
quyết định).

*(`creative-director` không được tham vấn cho section này — Lean mode, chỉ
Formulas/Acceptance Criteria bắt buộc spawn specialist ở lean mode.)*

## Detailed Design

### Core Rules

1. Mỗi nhân vật có `level` (cấp, 1 → ∞) và `tier` (bậc/cảnh giới) =
   `floor((level - 1) / 10) + 1`. Quy tắc 10 cấp = 1 bậc (`game-concept.md`
   Core Mechanics #3).
2. 4 nguồn EXP cộng dồn mỗi lượt xác nhận VÀ không bị undo (Turn Manager Core
   Rule #7/#8) — TRỪ KHI lượt đó là `is_death_turn=true` (nhân vật chính
   chết thật): khi đó TOÀN BỘ 4 nguồn bị chặn, không chỉ combat (xem D.6,
   short-circuit toàn cục giống Rule #9 bên dưới):
   - **Combat thắng**: EXP theo công thức riêng dựa trên chênh lệch tier với
     đối thủ (chi tiết ở Formulas).
   - **Combat thua**: EXP cố định = 4% (theo `game-concept.md` mục Cái
     Chết) — KHÔNG áp dụng nếu lượt đó là `is_death_turn=true` (chết thật
     thì hand-off Character Continuation, không "tiếp tục tu luyện" ở lượt
     đó).
   - **Thụ động**: mỗi lượt xác nhận (không undo) tự động +1% của ngưỡng
     EXP cấp hiện tại→kế tiếp, vô điều kiện, không cần hành động cụ thể.
   - **Song Tu**: bonus EXP mỗi lượt khi (a) nhân vật sở hữu Tâm Pháp loại
     song-tu VÀ (b) đang trong quan hệ Song Tu active với 1 NPC (nguồn: NPC
     Affinity & Relationship — **đã Designed, interface provisional**).
3. **Tâm Pháp** (sở hữu tối thiểu ở GDD này, không thiết kế đầy đủ 1 hệ Tâm
   Pháp riêng): mỗi nhân vật có đúng 1 Tâm Pháp active tại một thời điểm —
   field tối thiểu `tam_phap_id`, `exp_multiplier` (float ≥ 1, mặc định 1.0
   nếu chưa có Tâm Pháp), `type` (đơn tu | song tu). `exp_multiplier` nhân
   vào TOÀN BỘ EXP nhận được ở lượt đó, áp dụng đều cho cả 4 nguồn ở Rule 2,
   trước khi cộng vào tổng.
4. **Lên cấp thường**: khi EXP tích lũy ≥ ngưỡng cấp hiện tại→kế tiếp VÀ
   `level mod 10 != 0` (không phải mốc đột phá), lên cấp ngay lập tức; EXP
   dư carry-over, có thể lên nhiều cấp trong 1 lượt nếu nguồn EXP đủ lớn
   (dừng lại ngay trước mốc đột phá kế tiếp nếu chạm tới).
5. **Đột phá bậc** (mốc tròn chục, `level mod 10 == 0` muốn lên `level+1`):
   khi EXP đạt ngưỡng nhưng đang ở mốc tròn chục, nhân vật vào trạng thái
   **Chờ Đột Phá** — EXP bị CHẶN Ở TRẦN (100% ngưỡng, không tích thêm; mọi
   EXP nhận thêm trong lúc chờ bị lãng phí, không bank) cho đến khi
   `breakthrough_requirement_met(tier)` = true.
6. Điều kiện đột phá cụ thể (VD: Hồn Hoàn ở Đấu La Đại Lục) là dữ liệu NGOÀI
   do bối cảnh/Setting cung cấp — hệ này chỉ định nghĩa cơ chế kiểm tra
   boolean `breakthrough_requirement_met(tier)`, không sở hữu nội dung điều
   kiện (tương tự cách `persistence-save-system.md` coi `turn_snapshot` là
   opaque blob). Nguồn cụ thể: Setting & Canon Integration — **đã
   Designed, interface provisional**.
7. Khi `breakthrough_requirement_met=true` (kiểm tra lại mỗi lượt trong khi
   ở trạng thái Chờ Đột Phá): đột phá xảy ra ngay lập tức trong lượt đó —
   `level +1`, `tier +1`, EXP reset về 0 cho cấp mới (phần "trần" trước đó
   không carry-over, vì đã bị chặn ở Rule 5), chỉ số chiến đấu nhận cú nhảy
   vọt riêng ngoài mức tăng đều mỗi cấp (xem Formulas).
8. **Rollback** (Turn Manager Core Rule #8): mọi thay đổi `level`/`tier`/EXP/
   trạng thái Chờ Đột Phá do 1 lượt gây ra — kể cả một lần đột phá vừa xảy
   ra trong chính lượt đó — phải hoàn tác được TOÀN BỘ nếu lượt đó bị Undo.
9. Nếu Death & Consequence (**đã Designed**) đánh dấu nhân vật ở trạng
   thái "phế đan điền/võ công": hệ này DỪNG toàn bộ tích lũy EXP (cả 4
   nguồn ở Rule 2) cho đến khi trạng thái đó được gỡ. Cơ chế gỡ bỏ (đại cơ
   duyên, tiên thảo dị bảo...) do Death & Consequence sở hữu — hệ này chỉ
   đọc 1 cờ boolean.
10. `level` là data thô hệ này cung cấp cho ngưỡng "chênh lệch không quá 20
    cấp" (`game-concept.md`, điều kiện NPC chủ động địch ý) — hệ này KHÔNG
    tự tính ngưỡng đó, thuộc logic của hệ khác (Situation/Encounter
    Generation).

### States and Transitions

| State | Mô tả | Chuyển sang |
|---|---|---|
| Tu Luyện Thường | `level mod 10 != 0`, hoặc `level mod 10 == 0` nhưng EXP chưa đạt ngưỡng — EXP tích lũy bình thường qua 4 nguồn | → Tu Luyện Thường (level+1) khi đủ EXP và level+1 không phải mốc đột phá; → Chờ Đột Phá khi đủ EXP đúng lúc `level mod 10 == 0` |
| Chờ Đột Phá | `level mod 10 == 0`, EXP đã chạm trần 100% ngưỡng, `breakthrough_requirement_met=false` — EXP không tích thêm | → Tu Luyện Thường (level+1, tier+1, EXP=0) ngay khi `breakthrough_requirement_met=true` |

### Interactions with Other Systems

- **Combat System** (upstream, hard) — nhận EXP source events (thắng/thua)
  qua hand-off Core Rule #12 khi `battle_active=false`; Combat đọc ngược
  `tier(C)` từ hệ này (Formula D.1) để tính áp chế cảnh giới — quan hệ 2
  chiều.
- **Turn Manager** (upstream, hard) — mọi thay đổi EXP/level/tier chỉ
  "final" khi lượt xác nhận và không undo (Core Rule #8); passive EXP
  trigger mỗi lượt xác nhận.
- **NPC Affinity & Relationship** (đã Designed, soft/provisional) — cung
  cấp trạng thái "quan hệ Song Tu active" cho nguồn EXP #4.
- **Death & Consequence** (đã Designed, soft/provisional) — cung cấp cờ
  "phế đan điền/võ công" chặn tích lũy EXP.
- **Setting & Canon Integration** (đã Designed, soft/provisional) — cung
  cấp dữ liệu `breakthrough_requirement` cụ thể theo bối cảnh.
- **Character Card & Identity** (đã Designed, downstream) — đọc `level`,
  `tier` để hiển thị mục "Cấp độ - Bậc".
- **Situation/Encounter Generation** (Designed 2026-08-03, downstream) —
  đọc `level` để áp dụng ngưỡng chênh lệch 20 cấp (registry
  `hostile_initiative_allowed`/`HOSTILE_INITIATIVE_LEVEL_GAP_MAX=20`) và
  để sinh `level` đối thủ ambient trong khoảng `encounter_level_range`.

*(Nhiều interaction ở trên là provisional vì hệ phụ thuộc lúc viết chưa
thiết kế — nay các hệ đó đã Designed —
cùng pattern các GDD trước đã dùng, sẽ đối chiếu lại khi các hệ đó được
thiết kế.)*

## Formulas

*(Đề xuất từ `systems-designer`, duyệt nguyên văn.)*

### D.1 — Đường cong ngưỡng EXP lên cấp (`exp_threshold`)

**Quyết định hình dạng đường cong**: chọn **TUYẾN TÍNH** (không phải
exponential/stepped). Lý do: đây là dự án solo, MVP nhỏ hand-tuned (1 vùng
bối cảnh, 3 NPC), không có kỳ vọng grind vô hạn kiểu live-service; Pillar 4
("numbers are always grounded, never opaque") đòi hỏi người chơi tự nhẩm
được "còn bao xa nữa". Một hàm tuyến tính đơn giản là hình dạng DUY NHẤT
người chơi có thể tính nhẩm chính xác từ Thẻ Nhân Vật mà không cần công cụ
ngoài. Cảm giác "đột phá là cột mốc lớn" (Player Fantasy) đến từ ĐIỀU KIỆN
GATE bên ngoài (Rule 5/6), không cần đường cong EXP tự nó dốc lên ở mốc
tròn chục — tách 2 nguồn "khó" này ra cho rõ ràng, tránh chồng 2 lớp độ khó
lên cùng 1 chỗ.

The `exp_threshold` formula is defined as:
`exp_threshold(level) = BASE_EXP_THRESHOLD + EXP_THRESHOLD_INCREMENT * (level - 1)`

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Cấp hiện tại | `level` | int | 1–∞ | Cấp của nhân vật tại thời điểm tính |
| Ngưỡng cơ sở | `BASE_EXP_THRESHOLD` | float (knob) | >0 | EXP cần để lên cấp 1→2 |
| Mức tăng mỗi cấp | `EXP_THRESHOLD_INCREMENT` | float (knob) | ≥0 | EXP tăng thêm cho mỗi cấp kế tiếp so với cấp trước |
| Kết quả | `exp_threshold(level)` | float | `[BASE_EXP_THRESHOLD, ∞)` | Tổng EXP cần để đi từ `level` lên `level+1` |

**Output Range:** `[BASE_EXP_THRESHOLD, ∞)`, tăng đều tuyến tính, không âm,
không bị chặn trần (vì `level` không bị chặn trần). Đây cũng là ngưỡng dùng
làm mẫu số cho D.3/D.4/D.6 (nguồn thua/song-tu/thụ động) — MỘT công thức
duy nhất, không có công thức ngưỡng thứ hai nào khác trong hệ này.

**Example:** `BASE_EXP_THRESHOLD=100`, `EXP_THRESHOLD_INCREMENT=10`.
`exp_threshold(1)=100`, `exp_threshold(10)=190` (đây chính là ngưỡng của
mốc Chờ Đột Phá đầu tiên, level 10→11), `exp_threshold(25)=340`,
`exp_threshold(20)=290` (mốc đột phá thứ 2, level 20→21).

### D.2 — EXP từ Combat thắng

The `combat_win_exp` formula is defined as:
```
combat_win_exp(self, opponent) = WIN_EXP_BASE_FRACTION * exp_threshold(level(self)) * tier_multiplier(tier_diff)
tier_diff = tier(opponent) - tier(self)
tier_multiplier(tier_diff) = clamp(1 + WIN_EXP_TIER_BONUS * tier_diff, WIN_EXP_FLOOR_MULT, WIN_EXP_CEIL_MULT)
```

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Bậc người thắng | `tier(self)` | int | 0–∞ | Tier của nhân vật vừa thắng (nguồn: Rule 1) |
| Bậc đối thủ | `tier(opponent)` | int | 0–∞ | Tier của đối thủ vừa thua |
| Chênh lệch bậc | `tier_diff` | int | −∞ đến +∞ | Dương = đối thủ mạnh hơn (đánh lên); âm = đối thủ yếu hơn (đánh xuống) |
| Tỷ lệ nền | `WIN_EXP_BASE_FRACTION` | float (knob) | 0–1 | % của `exp_threshold(level)` nhận được khi thắng đối thủ CÙNG bậc (`tier_diff=0`) |
| Hệ số thưởng/bậc | `WIN_EXP_TIER_BONUS` | float (knob) | ≥0 | % thay đổi multiplier mỗi bậc chênh lệch |
| Sàn multiplier | `WIN_EXP_FLOOR_MULT` | float (knob) | 0–1 | Trần dưới, tránh về đúng 0 khi đánh xuống rất sâu |
| Trần multiplier | `WIN_EXP_CEIL_MULT` | float (knob) | ≥1 | Trần trên, tránh 1 trận đánh lên cực đoan cho EXP phi mã |
| Kết quả | `combat_win_exp` | float | `[WIN_EXP_BASE_FRACTION * WIN_EXP_FLOOR_MULT * exp_threshold, WIN_EXP_BASE_FRACTION * WIN_EXP_CEIL_MULT * exp_threshold]` | EXP thô từ 1 trận thắng, TRƯỚC khi nhân `exp_multiplier` (xem D.6) |

**Output Range:** luôn dương (không bao giờ về đúng 0, vì
`WIN_EXP_FLOOR_MULT > 0`), tỷ lệ thuận với `exp_threshold(level(self))` nên
tự động scale theo cấp độ hiện tại. Với default đề xuất (`BASE=0.15,
TIER_BONUS=0.25, FLOOR=0.05, CEIL=3.0`): đánh xuống ≥4 bậc → chạm sàn
(~0.75% ngưỡng, gần như không đáng "cày"); đánh lên ≥8 bậc → chạm trần
(~45% ngưỡng, một trận đủ để tiến bộ đáng kể nhưng không auto-lên-nhiều-cấp
trừ khi chồng thêm nguồn khác).

*Ghi chú thiết kế*: `WIN_EXP_TIER_BONUS` KHÔNG tái sử dụng
`PENALTY_PER_TIER=0.15` của Combat System dù cùng "họ" công thức
(`clamp(1 + rate*gap, floor, ceil)`) — cố ý tách riêng để việc tune độ khó
combat không vô tình kéo theo thay đổi nền kinh tế EXP.

**Example:** `self` level 25 (tier 3), đối thủ tier 5 → `tier_diff=+2`.
`exp_threshold(25)=340`. `tier_multiplier = clamp(1+0.25*2, 0.05, 3.0) =
1.5`. `combat_win_exp = 0.15 * 340 * 1.5 = 76.5`.

Ca biên (đánh xuống sâu): `self` tier 3, đối thủ tier 0 → `tier_diff=-3` →
`multiplier=clamp(1-0.75,...)=0.25` → `combat_win_exp=0.15*340*0.25=12.75`.
Nếu `tier_diff=-4` → `multiplier=clamp(1-1.0,...)=0` bị kẹp lên sàn `0.05`
→ `combat_win_exp=0.15*340*0.05=2.55` (~0.75% ngưỡng — đúng tinh thần
"trend toward zero", không đáng để cày farm đối thủ yếu).

Ca biên (cả 2 tier=0): `tier_diff=0` → `multiplier=1` → công thức hoạt
động bình thường, không cần case đặc biệt.

### D.3 — EXP từ Combat thua (formalize 4%)

**Quyết định mẫu số**: dùng `exp_threshold(level(self))` — CÙNG mẫu số với
thụ động (D.6) và Song Tu (D.4), vì cả 3 đều là "nguồn EXP theo % ngưỡng
cấp hiện tại, không phụ thuộc đối thủ". Việc đồng bộ mẫu số giúp 1 tuning
knob duy nhất (`exp_threshold`) chi phối scale của MỌI nguồn
không-phải-combat-thắng, giảm bề mặt lỗi khi cân bằng.

The `combat_loss_exp` formula is defined as:
`combat_loss_exp(self) = LOSS_EXP_RATE * exp_threshold(level(self))`

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Tỷ lệ EXP khi thua | `LOSS_EXP_RATE` | float (knob, giá trị đã chốt ở game-concept.md) | 0–1 | Cố định 4% theo thiết kế gốc |
| Kết quả | `combat_loss_exp` | float | `[0, ∞)` | EXP thô nhận khi thua 1 trận, TRƯỚC `exp_multiplier` |

**Output Range:** `[0, ∞)` tỷ lệ tuyến tính với `exp_threshold(level)`, luôn
dương, không phụ thuộc bậc đối thủ (đã chốt trong game-concept.md là "cố
định 4%", không theo tier gap — khác với D.2). **Edge case bắt buộc**: nếu
lượt thua đó đồng thời là `is_death_turn=true` (chết thật),
`combat_loss_exp = 0` — Rule 2 của Core Rules đã loại trừ case này (chết
thật hand-off sang Character Continuation, không "tiếp tục tu luyện" ở
chính lượt chết).

**Example:** level 25, `exp_threshold(25)=340` → `combat_loss_exp = 0.04 *
340 = 13.6`.

### D.4 — EXP bonus Song Tu

**Quyết định tỷ lệ**: đề xuất **2%/lượt** — gấp đôi tỷ lệ thụ động
(1%/lượt). Lý do chọn 2x thay vì 1x (bằng passive, cảm giác nhạt) hay 3x
(có nguy cơ lấn át D.2 nếu người chơi né combat, chỉ dựa Song Tu để cày):
2x tạo một cú hích RÕ RÀNG có thể cảm nhận được ("tốc độ tu luyện thụ động
của mình tăng gấp 3 lần tổng cộng khi có Song Tu active" — 1% passive + 2%
song tu = 3% tổng) nhưng vẫn nhỏ hơn nhiều so với 1 trận thắng cùng bậc
(~15%, D.2) — đúng khung "bonus quan hệ chiến lược có giá trị, không thay
thế nguồn EXP chính".

The `song_tu_exp_bonus` formula is defined as:
```
song_tu_exp_bonus(self) = SONG_TU_ACTIVE(self) * SONG_TU_EXP_RATE * exp_threshold(level(self))
SONG_TU_ACTIVE(self) = 1 if (Tâm Pháp hiện tại có type=song-tu AND đang trong quan hệ Song Tu active với 1 NPC) else 0
```

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Cờ điều kiện Song Tu | `SONG_TU_ACTIVE(self)` | bool (0/1) | {0,1} | Cả 2 điều kiện Rule 2 (Tâm Pháp song-tu + quan hệ Song Tu active, nguồn: NPC Affinity — provisional) |
| Tỷ lệ Song Tu | `SONG_TU_EXP_RATE` | float (knob) | 0–1 | % của `exp_threshold(level)` mỗi lượt khi điều kiện đủ |
| Kết quả | `song_tu_exp_bonus` | float | `{0} ∪ [SONG_TU_EXP_RATE * exp_threshold, SONG_TU_EXP_RATE * exp_threshold]` | 0 nếu không active; giá trị cố định (theo level) nếu active |

**Output Range:** nhị phân về mặt điều kiện (0 hoặc giá trị đầy đủ, không có
trạng thái trung gian), giá trị khi active tỷ lệ tuyến tính theo
`exp_threshold(level)`.

**Example:** level 25, `exp_threshold(25)=340`, Song Tu active →
`song_tu_exp_bonus = 0.02 * 340 = 6.8`. Không active → `0`.

### D.5 — Đường cong tăng trưởng chỉ số (stat growth)

The `stat_growth` formula is defined as (áp dụng cho mỗi chỉ số `X` trong
12 chỉ số Character Card):
`stat_value(C, X) = base_X0 + LEVEL_GROWTH_X * (level(C) - 1) + BREAKTHROUGH_BONUS_X * (tier(C) - 1)`

Với các chỉ số dạng % (Crit Rate, Crit Damage, ACC, Né tránh, Lifesteal, HP
Regen, Khuếch đại, Chống chịu) áp thêm 1 lớp clamp:
`percentage_stat_value(C, X) = clamp(stat_value(C, X), 0, PERCENT_STAT_CAP)`

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Giá trị gốc cấp 1 | `base_X0` | float | ≥0 | Chỉ số khởi điểm của nhân vật (sở hữu bởi Character Card, không phải hệ này) |
| Cấp hiện tại | `level(C)` | int | 1–∞ | (nguồn: Rule 1) |
| Bậc hiện tại | `tier(C)` | int | 1–∞ | `tier(C)-1` = số lần đã đột phá thành công |
| Mức tăng/cấp | `LEVEL_GROWTH_X` | float (knob, mỗi chỉ số riêng) | ≥0 | Tăng đều mỗi cấp, kể cả cấp đột phá |
| Bonus đột phá | `BREAKTHROUGH_BONUS_X` | float (knob, mỗi chỉ số riêng) | ≥0 | Cộng thêm CHỈ khi đã hoàn tất 1 lần đột phá, cộng dồn theo số lần |
| Trần % (chỉ áp cho chỉ số dạng %) | `PERCENT_STAT_CAP` | float (knob) | 0–1 | Ngăn chỉ số dạng xác suất/% vượt quá mức hợp lý ở level rất cao |
| Kết quả | `stat_value(C,X)` | float | `[base_X0, ∞)` (chỉ số thô) hoặc `[0, PERCENT_STAT_CAP]` (chỉ số %) | Giá trị `base_X` dùng làm input cho `effective_stat` (combat-system.md D.1) |

**Output Range:** chỉ số thô (HP/ATK/DEF/SPD) không chặn trần, tăng tuyến
tính vô hạn theo `level`; chỉ số % bị `clamp` ở `PERCENT_STAT_CAP` (đề xuất
0.95, đồng nhất triết lý "không có gì tuyệt đối" đã dùng ở `P_MAX=0.95` của
combat-system.md D.3) để tránh ví dụ Crit Rate 300% ở level cực cao.

**Example (HP)**: `base_HP0=100`, `LEVEL_GROWTH_HP=8`,
`BREAKTHROUGH_BONUS_HP=50`. Level 25 (tier 3): `HP = 100 + 8*24 + 50*2 =
392`.

**Example (ATK)**: `base_ATK0=10`, `LEVEL_GROWTH_ATK=1.5`,
`BREAKTHROUGH_BONUS_ATK=8`. Level 25 (tier 3): `ATK = 10 + 1.5*24 + 8*2 =
62`.

**Example (Crit Rate, dạng %)**: `base_CR0=0.05`, `LEVEL_GROWTH_CR=0.008`,
`BREAKTHROUGH_BONUS_CR=0.02`. Level 25 (tier 3): `raw = 0.05 + 0.008*24 +
0.02*2 = 0.282` → dưới trần `0.95`, không bị clamp, `Crit Rate = 28.2%`.

10 chỉ số còn lại (DEF, SPD, ACC, Né tránh, Crit Damage, Amp, Mitigation,
Lifesteal, HP Regen) theo ĐÚNG hình dạng công thức trên, mỗi chỉ số có bộ
`(base_X0, LEVEL_GROWTH_X, BREAKTHROUGH_BONUS_X)` riêng — không hand-tune
đủ 12 chỉ số trong GDD này, để lại cho pass cân bằng số liệu cụ thể (Tuning
Knobs).

*Ghi chú liên hệ registry*: scale tuyệt đối của công thức này (VD HP
~100–400 ở level 1–25) là input mà `combat_power_estimate`
(combat-system.md D.13, `w_HP=0.25` placeholder) cần đối chiếu lại — GDD
này chỉ định nghĩa hình dạng/scale chỉ số, KHÔNG tự sửa trọng số `w_*`
(thuộc quyền sở hữu của combat-system.md).

### D.6 — Thứ tự xử lý khi nhiều nguồn EXP trùng lượt

**Quyết định**: (1) tính riêng từng nguồn thô, (2) CỘNG DỒN tất cả nguồn
thô thành 1 tổng, (3) nhân `exp_multiplier` của Tâm Pháp active ĐÚNG 1 LẦN
vào tổng đó (không nhân riêng từng nguồn), (4) áp dụng logic lên cấp/chặn
trần đột phá (Core Rules #4/#5) ĐÚNG 1 LẦN vào kết quả đã nhân. Đây là quy
trình MỘT CHIỀU, không lặp lại bước nào.

The `resolve_turn_exp` formula is defined as:
```
resolve_turn_exp(self, turn):
  IF death_and_consequence_blocked(self):           // Core Rule #9 — short-circuit TRƯỚC cả 4 nguồn
    RETURN 0                                          // không tích lũy gì cả lượt này
  IF turn.is_death_turn:                             // short-circuit TOÀN CỤC, giống dòng trên —
    RETURN 0                                          // chết thật thì KHÔNG "tiếp tục tu luyện" dưới bất kỳ hình thức nào

  raw_combat = 0
  IF turn.battle_concluded:
    IF turn.battle_result == WIN:
      raw_combat = combat_win_exp(self, opponent)              // D.2
    ELIF turn.battle_result == LOSS:
      raw_combat = combat_loss_exp(self)                       // D.3 — is_death_turn đã bị chặn ở trên, không cần loại trừ lại ở đây

  raw_passive  = PASSIVE_EXP_RATE * exp_threshold(level(self)) // luôn cộng, mọi lượt xác nhận (trừ 2 short-circuit ở trên)
  raw_song_tu  = song_tu_exp_bonus(self)                       // D.4, 0 nếu không active

  raw_total    = raw_combat + raw_passive + raw_song_tu
  final_gain   = raw_total * exp_multiplier(active_tam_phap(self))   // nhân 1 LẦN DUY NHẤT

  apply_exp_gain(self, final_gain)   // Core Rules #4/#5/#7, chạy 1 LẦN trên final_gain đã gộp
```

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Cờ chặn tích lũy | `death_and_consequence_blocked(self)` | bool | {0,1} | Nguồn: Death & Consequence (đã Designed, Core Rule #9) |
| Cờ chết thật | `turn.is_death_turn` | bool | {0,1} | Nguồn: Turn Manager (Core Rule #9 của `turn-manager.md`) — short-circuit TOÀN CỤC thứ 2, độc lập với `death_and_consequence_blocked` |
| EXP thô combat | `raw_combat` | float | `[0, ∞)` | Từ D.2 (thắng) hoặc D.3 (thua, trừ death turn) hoặc 0 (không có trận nào kết thúc lượt này) |
| EXP thô thụ động | `raw_passive` | float | `[PASSIVE_EXP_RATE * BASE_EXP_THRESHOLD, ∞)` | `PASSIVE_EXP_RATE=0.01` theo Core Rule #2, luôn > 0 mọi lượt xác nhận |
| EXP thô Song Tu | `raw_song_tu` | float | `[0, ∞)` | Từ D.4 |
| Tổng thô | `raw_total` | float | `[0, ∞)` | Tổng CHƯA nhân hệ số Tâm Pháp |
| Hệ số Tâm Pháp | `exp_multiplier(active_tam_phap)` | float | `[1, ∞)` | Rule 3, mặc định 1.0 |
| EXP cuối cùng | `final_gain` | float | `[0, ∞)` | Input DUY NHẤT cho state machine lên cấp/đột phá |

**Output Range:** `final_gain ∈ [0, ∞)`, luôn không âm. `apply_exp_gain`
sau đó là 1 state machine thuần (đã đặc tả ở Core Rules #4/#5/#7): cộng
dồn `final_gain` vào EXP hiện tại, rồi lặp: nếu `level mod 10 != 0` và EXP
≥ ngưỡng → lên cấp, trừ ngưỡng, lặp lại (có thể cascade nhiều cấp trong 1
lượt nếu `final_gain` đủ lớn); nếu chạm đúng mốc `level mod 10 == 0` và EXP
≥ ngưỡng → dừng, kẹp EXP ở đúng 100% ngưỡng (Chờ Đột Phá), phần dư bị lãng
phí — KHÔNG cascade tiếp kể cả khi `final_gain` dư ra rất nhiều.

**Về mặt đại số**: nhân `exp_multiplier` 1 lần vào tổng cho kết quả TOÁN
HỌC giống hệt nhân riêng từng nguồn rồi cộng (phép nhân phân phối qua phép
cộng) — điểm mấu chốt thực sự KHÔNG PHẢI ở thứ tự cộng/nhân (không đổi kết
quả cuối), mà là: (a) `exp_multiplier` phải áp dụng TRƯỚC bước cap/cascade,
không phải sau (nhân sau khi đã bị kẹp trần sẽ làm mất phần EXP đáng lẽ
được nhân hệ số); và (b) cap/cascade chỉ chạy ĐÚNG 1 LẦN trên `final_gain`
đã gộp, không chạy riêng lẻ 3 lần cho 3 nguồn (chạy riêng lẻ dễ dẫn tới lỗi
implementation như quên tái tính `exp_threshold(level)` mới sau khi 1
nguồn đã gây lên cấp giữa chừng).

**Example**: level 25 (`exp_threshold(25)=340`), lượt này vừa thắng 1 trận
`tier_diff=+1` (`combat_win_exp = 0.15*340*clamp(1.25,...)=63.75`), cộng
passive `0.01*340=3.4`, Song Tu active `6.8`. `raw_total =
63.75+3.4+6.8 = 73.95`. Tâm Pháp `exp_multiplier=1.2` → `final_gain =
73.95*1.2 = 88.74`. Giả sử EXP hiện tại trước lượt là 300/340 →
`300+88.74=388.74 ≥ 340`, và `level=25` (`25 mod 10 != 0`) → lên cấp:
`level=26`, EXP dư `=388.74-340=48.74`, kiểm tra tiếp `exp_threshold(26)=
350` → `48.74 < 350` → dừng, không cascade thêm.

**Example (chạm trần đột phá)**: level 20 (mốc tròn chục),
`exp_threshold(20)=290`, EXP hiện tại 280, `final_gain=50` →
`280+50=330 ≥ 290` VÀ `level mod 10==0` → vào Chờ Đột Phá, EXP bị kẹp đúng
`290` (100% ngưỡng), 40 EXP dư bị lãng phí, KHÔNG cascade sang cấp 21 dù đủ
số — chờ `breakthrough_requirement_met(tier=2)=true` ở 1 lượt sau đó mới
đột phá thật (Rule 7).

## Edge Cases

*(Lean mode — không spawn specialist cho section này.)*

- **Nếu đối thủ Combat chưa có `tier` xác định**: không phải edge case hợp
  lệ, coi là bug — mọi NPC tham gia Combat phải có Character Card đầy đủ
  (`level`/`tier`) theo `game-concept.md`; Combat System đã giả định input
  đủ dữ liệu này ở phía nó.
- **Nếu character đang ở trạng thái Chờ Đột Phá VÀ `breakthrough_requirement_met`
  chuyển thành true VÀ cùng lượt đó cũng có Combat/Song Tu/passive sinh EXP
  mới**: thứ tự xử lý là (1) kiểm tra và thực hiện đột phá TRƯỚC (dùng
  trạng thái đầu lượt) — `level+1`, `tier+1`, EXP=0 — RỒI (2) mới tính
  `resolve_turn_exp` (D.6) của lượt đó áp vào NGƯỠNG MỚI
  (`exp_threshold(level+1)`). Không tính EXP lượt đó vào ngưỡng cũ trước
  khi đột phá.
- **Nếu lượt đó vừa gây đột phá vừa bị Undo ngay sau (Turn Manager Core
  Rule #8)**: phải rollback TOÀN BỘ — `level`, `tier`, EXP VÀ trạng thái
  Chờ Đột Phá (không phải quay về trạng thái Tu Luyện Thường trước đó) —
  về đúng snapshot trước lượt. Nếu điều kiện đột phá đó tiêu tốn 1 tài
  nguyên ngoài (VD: Hồn Hoàn, sở hữu bởi hệ khác), việc rollback tài
  nguyên đó KHÔNG thuộc phạm vi GDD này — xem Open Questions.
- **Nếu lượt là `is_death_turn=true`**: `combat_loss_exp=0` (đã chốt ở Core
  Rule #2/D.3); nhưng `raw_passive` và `raw_song_tu` của D.6 KHÔNG áp dụng
  ở lượt đó nữa vì nhân vật chính đã chết thật — toàn bộ `resolve_turn_exp`
  trả về 0 cho lượt đó, không chỉ riêng phần combat.
- **Nếu `death_and_consequence_blocked=true` (phế đan điền/võ công, Core
  Rule #9) xảy ra ĐÚNG lượt đang ở trạng thái Chờ Đột Phá**: trạng thái Chờ
  Đột Phá vẫn giữ nguyên (không mất), chỉ có việc tích EXP mới bị dừng —
  khi trạng thái phế được gỡ sau này, nhân vật vẫn ở Chờ Đột Phá, chỉ cần
  `breakthrough_requirement_met` mới tiếp tục hoạt động bình thường.
- **Nếu 2 bên Combat đồng thời ở mốc tier=0 (`tier_diff=0`, cả 2 chưa từng
  đột phá lần nào)**: D.2 hoạt động bình thường (`multiplier=1`), không có
  sentinel đặc biệt cần thiết — khác với Combat System's
  `combat_power_estimate` (D.13) vốn cần sentinel "N/A"/"+∞" khi Lực
  chiến=0, vì `combat_win_exp` không chia cho Lực chiến của ai cả.
- **Nếu người chơi chưa từng gán Tâm Pháp nào**: `exp_multiplier=1.0` mặc
  định (Core Rule #3), `SONG_TU_ACTIVE=0` vô điều kiện (không có Tâm Pháp
  thì không thể có `type=song-tu`) — không cần xử lý null riêng, các công
  thức D.1–D.6 hoạt động bình thường với giá trị mặc định.

## Dependencies

| System | Direction | Nature | Hard/Soft |
|---|---|---|---|
| Combat System | This depends on Combat | Nhận EXP source events (thắng/thua) qua hand-off Core Rule #12; Combat đọc ngược `tier(C)` (2 chiều) | Hard |
| Turn Manager | This depends on Turn Manager | Vòng đời xác nhận/undo (Core Rule #7/#8); trigger EXP thụ động mỗi lượt | Hard |
| NPC Affinity & Relationship (Designed 2026-08-03) | This depends on NPC Affinity | Trạng thái "quan hệ Song Tu active" cho nguồn EXP #4 — interface đã chốt: danh sách NPC ID, EXP đọc boolean derived "khác rỗng", bonus KHÔNG cộng dồn theo số NPC (registry `song_tu_active`) | Soft — thiếu thì mất 1 nguồn EXP phụ, hệ vẫn hoạt động |
| Death & Consequence (đã Designed) | This depends on Death & Consequence | Cờ "phế đan điền/võ công" chặn tích lũy EXP | Soft — edge interaction, không chặn core loop |
| Setting & Canon Integration (Designed 2026-08-03) | This depends on Setting & Canon | Dữ liệu `breakthrough_requirement` cụ thể theo bối cảnh — interface đã chốt: `breakthrough_requirement_met(tier)` (registry), predicate data thuần theo setting pack, thiếu data tier → false cứng + warning "content gap"; thứ tự trong lượt: canon resolve TRƯỚC resolve_turn_exp | **Hard** — thiếu data authoring thì KHÔNG bao giờ đột phá bậc được (dù cấp trong 1 bậc vẫn lên bình thường) |
| Character Card & Identity (đã Designed) | Character Card depends on this | Đọc `level`, `tier` để hiển thị "Cấp độ - Bậc" | Hard (chiều ngược) |
| Situation/Encounter Generation (Designed 2026-08-03) | Situation Gen depends on this | Đọc `level` cho ngưỡng chênh lệch 20 cấp (registry `hostile_initiative_allowed`) và cho sinh `level` đối thủ ambient (`encounter_level_range`) | Soft (chiều ngược) — Situation Gen còn hoạt động được mà không cần ngưỡng này ở MVP tối giản |

*(`systems-index.md` hiện chỉ liệt kê Combat System + Turn Manager là
dependency của hệ #8 — 5 dependency còn lại ở trên (đều với hệ chưa thiết
kế) tạo ra dependency gap một chiều, cùng pattern 4 gap đã ghi nhận trước
đó trong phiên này — sẽ footnote ở `systems-index.md`, không sửa cấu trúc
bảng chính.)*

## Tuning Knobs

| Parameter | Current Value | Safe Range | Effect of Increase | Effect of Decrease |
|---|---|---|---|---|
| `BASE_EXP_THRESHOLD` | 100 | 50–300 | Cấp 1→2 tốn nhiều EXP hơn, làm chậm cảm giác tiến bộ sớm game | Cấp 1→2 gần như tức thì, mất cảm giác "khởi đầu" |
| `EXP_THRESHOLD_INCREMENT` | 10 | 5–50 | Cấp sau khó hơn cấp trước rõ rệt hơn — chậm dần đều mạnh | Gần như phẳng, mọi cấp tốn EXP xấp xỉ nhau — mất cảm giác "càng cao càng khó" |
| `PASSIVE_EXP_RATE` | 0.01 (1%) | 0.005–0.03 | Tự lên cấp nhanh hơn kể cả không chiến đấu — có nguy cơ làm Combat EXP (D.2) trở nên thừa | Gần như phải chiến đấu mới tiến bộ — có thể cảm thấy passive vô nghĩa |
| `LOSS_EXP_RATE` | 0.04 (4%) | 0.02–0.06 | Thua trận vẫn tiến bộ đáng kể — giảm rủi ro thật của combat | Thua gần như vô ích — tăng áp lực né combat rủi ro cao |
| `WIN_EXP_BASE_FRACTION` | 0.15 | 0.05–0.30 | 1 trận thắng cùng bậc đóng góp lớn — lên cấp nhanh qua combat | Combat trở thành nguồn EXP yếu, passive/Song Tu lấn át |
| `WIN_EXP_TIER_BONUS` | 0.25 | 0.10–0.40 | Đánh lên thưởng rất đậm, đánh xuống phạt rất nặng — khuyến khích mạo hiểm | Chênh lệch bậc ít ảnh hưởng tới EXP — làm nhạt tinh thần "mạo hiểm đánh lên có thưởng" |
| `WIN_EXP_FLOOR_MULT` | 0.05 | 0.02–0.15 | Farm đối thủ yếu vẫn còn chút lợi ích | Đánh xuống quá sâu gần như vô nghĩa (tốt cho chống farm) |
| `WIN_EXP_CEIL_MULT` | 3.0 | 2.0–5.0 | 1 trận đánh lên cực đoan có thể cho EXP khổng lồ — rủi ro phá cân bằng nếu người chơi liều ăn may | Giới hạn phần thưởng mạo hiểm, giảm động lực đánh lên quá xa |
| `SONG_TU_EXP_RATE` | 0.02 (2%) | 0.01–0.05 | Song Tu trở thành nguồn EXP chính đáng kể, có thể cạnh tranh với Combat | Song Tu chỉ là bonus rất nhỏ, gần như chỉ mang ý nghĩa tường thuật |
| `LEVEL_GROWTH_X` / `BREAKTHROUGH_BONUS_X` (riêng từng chỉ số) | VD: HP: 8 / 50; ATK: 1.5 / 8 | Tùy chỉ số, cần pass cân bằng riêng | Chỉ số tăng nhanh — Lực chiến vọt cao, cần đối chiếu lại `w_*` của `combat_power_estimate` | Chỉ số tăng chậm — cảm giác "tu luyện không mạnh lên" |
| `PERCENT_STAT_CAP` | 0.95 | 0.85–0.99 | Chỉ số % tối đa cao hơn — game trở nên biến động/RNG cực đoan hơn ở cấp cao | Chỉ số % bị nén sớm — mất cảm giác tiến bộ ở các chỉ số dạng % khi lên cấp cao |

*(`LEVEL_GROWTH_X`/`BREAKTHROUGH_BONUS_X` là một BỘ 24 hằng số — 2 hằng/chỉ
số × 12 chỉ số Character Card — không liệt kê hết ở đây, chỉ 2 ví dụ đại
diện; toàn bộ nằm trong data file cấu hình theo `coding-standards.md`.)*

## Visual/Audio Requirements

[To be designed]

## UI Requirements

[To be designed]

## Acceptance Criteria

*(Từ `qa-lead`, sau khi giải quyết 1 gap phát hiện — xem ghi chú cuối
section này.)*

**Story Type**: Logic (formulas + state machine) → **BLOCKING** gate, test
tự động bắt buộc tại `tests/unit/exp-realm-progression/` (naming:
`exp_realm_progression_[feature]_test.gd`, `test_[scenario]_[expected]`).

**Ghi chú test setup**: Trừ khi ghi chú khác, mọi AC dùng cố định giá trị
default ở Tuning Knobs (`BASE_EXP_THRESHOLD=100, EXP_THRESHOLD_INCREMENT=10,
PASSIVE_EXP_RATE=0.01, LOSS_EXP_RATE=0.04, WIN_EXP_BASE_FRACTION=0.15,
WIN_EXP_TIER_BONUS=0.25, WIN_EXP_FLOOR_MULT=0.05, WIN_EXP_CEIL_MULT=3.0,
SONG_TU_EXP_RATE=0.02, PERCENT_STAT_CAP=0.95`) làm fixture — không random.
`battle_result`, `is_death_turn`, `SONG_TU_ACTIVE`, `breakthrough_requirement_met`
phải được **inject** như tham số/mock (dependency injection over
singleton, theo `coding-standards.md`), KHÔNG gọi Combat/NPC Affinity/
Setting thật — giữ toàn bộ test suite deterministic dù các hệ phụ thuộc đó
nay đã Designed (lúc viết chưa thiết kế).

### Core Rules

**AC-01** (Rule #1 — level/tier): GIVEN `level` lần lượt = 1, 10, 11, 20,
21, 30, WHEN tính `tier(C) = floor((level-1)/10)+1`, THEN kết quả lần lượt
= 1, 1, 2, 2, 3, 3.

**AC-02** (Rule #2a — nguồn Combat thắng): GIVEN 1 lượt có
`battle_concluded=true, battle_result=WIN`, WHEN `resolve_turn_exp` chạy,
THEN `raw_combat` bằng chính xác giá trị `combat_win_exp` (D.2) và không
nguồn nào khác được dùng thay thế.

**AC-03** (Rule #2b — nguồn Combat thua): GIVEN 1 lượt có
`battle_result=LOSS, is_death_turn=false`, WHEN `resolve_turn_exp` chạy,
THEN `raw_combat` bằng chính xác `combat_loss_exp` (D.3).

**AC-04** (Rule #2c — nguồn Thụ động): GIVEN bất kỳ lượt xác nhận nào (có
hoặc không có Combat, có hoặc không Song Tu, `is_death_turn=false`), WHEN
`resolve_turn_exp` chạy, THEN `raw_passive = PASSIVE_EXP_RATE *
exp_threshold(level)` luôn được cộng — không có điều kiện bổ sung nào chặn
nó ngoài 2 short-circuit toàn cục (`death_and_consequence_blocked`,
`is_death_turn` — xem AC-16/AC-35).

**AC-05** (Rule #2d — nguồn Song Tu, AND logic): GIVEN 3 tổ hợp: (a) Tâm
Pháp type=song-tu NHƯNG không có quan hệ Song Tu active, (b) có quan hệ
Song Tu active NHƯNG Tâm Pháp không phải type song-tu, (c) không có Tâm
Pháp nào, WHEN tính `SONG_TU_ACTIVE(self)`, THEN cả 3 trường hợp đều trả
`0` (`raw_song_tu=0`) — chỉ khi CẢ HAI điều kiện đồng thời true mới trả
`1`.

**AC-06** (Rule #3 — Tâm Pháp exp_multiplier): GIVEN Tâm Pháp active có
`exp_multiplier=1.2`, `raw_total` (tổng 3 nguồn) đã biết = 73.95, WHEN áp
`exp_multiplier`, THEN `final_gain = 73.95 * 1.2 = 88.74` — nhân đúng 1 lần
vào TỔNG, không nhân riêng từng nguồn rồi cộng lại (dù kết quả đại số
giống nhau, implementation phải nhân sau bước cộng).

**AC-07** (Rule #4 — Lên cấp thường, đơn giản): GIVEN `level=25`
(`exp_threshold=340`), EXP hiện tại=300, WHEN `final_gain=88.74` áp vào,
THEN `level=26`, EXP dư = `300+88.74-340=48.74` (khớp ví dụ D.6 gốc trong
GDD).

**AC-08** (Rule #4 — cascade nhiều cấp không chạm mốc đột phá): GIVEN
`level=5` (`exp_threshold(5)=140`), EXP hiện tại=50, `final_gain=300`, WHEN
áp dụng, THEN cascade qua `level=6` (`exp_threshold(6)=150`), dừng ở
`level=7` với EXP dư=60 (không đủ 160 để lên cấp 8) — 2 lần lên cấp trong 1
lượt.

**AC-09** (Rule #5 — vào trạng thái Chờ Đột Phá, chặn trần): GIVEN
`level=20` (`exp_threshold(20)=290`), EXP hiện tại=280, `final_gain=50`,
WHEN áp dụng, THEN state chuyển sang **Chờ Đột Phá**, EXP bị kẹp CHÍNH XÁC
ở `290` (không phải `330`), 40 EXP dư bị lãng phí, level VẪN = 20 (không
lên 21).

**AC-10** (Rule #5 — lãng phí EXP lặp lại khi đang chờ): GIVEN character
đang ở Chờ Đột Phá tại `level=20`, EXP=290 (đã kẹp trần),
`breakthrough_requirement_met=false`, WHEN thêm 1 lượt nữa chỉ có passive
(`final_gain=2.9`, không Combat/Song Tu), THEN EXP SAU lượt đó VẪN = 290
(không phải 292.9), level/tier/state không đổi — lặp lại được N lượt liên
tiếp mà không lỗi/overflow.

**AC-11** (Rule #6 — ranh giới sở hữu `breakthrough_requirement_met`):
GIVEN 2 mock predicate khác nhau cho `breakthrough_requirement_met(tier)`
(mock A luôn trả `false`, mock B luôn trả `true`) được inject vào cùng 1
state Chờ Đột Phá giống hệt nhau, WHEN chạy state check, THEN hành vi hệ
thống CHỈ phụ thuộc vào giá trị mock trả về (mock A → không đột phá, mock
B → đột phá ngay) — hệ EXP không chứa logic cứng nào về nội dung điều kiện
(VD không có string "Hồn Hoàn" hay logic setting-specific nào trong code
path này).

**AC-12** (Rule #7 — thực thi đột phá, state transition): GIVEN character
ở Chờ Đột Phá tại `level=20, tier=2, EXP=290`,
`breakthrough_requirement_met(2)` chuyển thành `true` trong lượt này, WHEN
xử lý lượt, THEN NGAY LẬP TỨC: `level=21`, `tier=3`, `EXP=0` (không
carry-over phần 290 đã kẹp), state chuyển về Tu Luyện Thường.

**AC-13** (Rule #7 — cú nhảy chỉ số sau đột phá, qua D.5): GIVEN đột phá
xảy ra `level10(tier1)→level11(tier2)`, dùng fixture HP (`base_HP0=100,
LEVEL_GROWTH_HP=8, BREAKTHROUGH_BONUS_HP=50`), WHEN tính `stat_value(HP)`
TRƯỚC (level10,tier1: `100+8*9+50*0=172`) và SAU (level11,tier2:
`100+8*10+50*1=230`), THEN chênh lệch = 58, trong đó 8 là tăng đều mỗi cấp
và 50 là cú nhảy đột phá riêng — xác nhận D.5 tự động phản ánh cú nhảy mà
không cần một cơ chế "apply bonus" tách biệt.

**AC-14** (Rule #8 — Rollback lượt thường): GIVEN lượt gây thay đổi
`level/tier/EXP` (không đột phá) từ snapshot X sang Y, WHEN Turn Manager
Undo đúng lượt đó (độ sâu 1, non-chainable), THEN `level/tier/EXP` trở về
ĐÚNG snapshot X — không có field nào bị rollback một phần.

**AC-15** (Rule #8 — Rollback lượt có đột phá): GIVEN lượt vừa gây đột phá
(`level20,tier2→level21,tier3,EXP=0`), WHEN Undo đúng lượt đó, THEN
`level=20, tier=2`, EXP VÀ **trạng thái Chờ Đột Phá** đều được khôi phục
nguyên trạng (không chỉ level/tier/EXP mà cả state machine).

**AC-16** (Rule #9 — Death & Consequence chặn toàn bộ 4 nguồn): GIVEN
`death_and_consequence_blocked(self)=true` VÀ cùng lượt có
`battle_result=WIN` (đáng lẽ sinh combat_win_exp lớn), WHEN
`resolve_turn_exp` chạy, THEN trả về `0` ngay từ đầu (short-circuit) —
`raw_combat/raw_passive/raw_song_tu` đều KHÔNG được tính, EXP/level/tier
không đổi.

**AC-17** (Rule #10 — `level` là raw data, không tự tính ngưỡng NPC): GIVEN
`level=37`, WHEN 1 hệ ngoài (giả lập Situation/Encounter Generation) đọc
`level(C)`, THEN trả về đúng `37`; VÀ public API của hệ EXP KHÔNG có method
nào tính "chênh lệch 20 cấp" hay tương tự (kiểm tra bằng interface
inspection — không có hàm dạng `is_hostile_by_level_gap()`).

### Formulas

**AC-18** (D.1 — exp_threshold): GIVEN `level` = 1, 10, 20, 25, WHEN tính
`exp_threshold(level) = 100 + 10*(level-1)`, THEN kết quả lần lượt = 100,
190, 290, 340.

**AC-19** (D.2 — combat_win_exp, trường hợp thường): GIVEN self `level=25`
(`tier=3`, `exp_threshold=340`), opponent `tier=5` (`tier_diff=+2`), WHEN
tính `combat_win_exp`, THEN `tier_multiplier = clamp(1+0.25*2, 0.05, 3.0) =
1.5` VÀ `combat_win_exp = 0.15*340*1.5 = 76.5`.

**AC-20** (D.2 — floor clamp): GIVEN `tier_diff=-4` (đầu vào trực tiếp cho
`tier_multiplier`), self threshold=340, WHEN tính, THEN `multiplier =
clamp(1-1.0, 0.05, 3.0) = 0.05` (bị kẹp lên sàn, không phải `0`),
`combat_win_exp = 0.15*340*0.05 = 2.55`.

**AC-21** (D.2 — ceil clamp): GIVEN `tier_diff=8` VÀ `tier_diff=10` (self
threshold=340), WHEN tính `multiplier`, THEN cả 2 trường hợp đều trả đúng
`3.0` (không vượt), `combat_win_exp = 0.15*340*3.0 = 153.0` cho cả 2 —
xác nhận trần không bị vượt dù tier_diff tăng thêm.

**AC-22** (D.3 — combat_loss_exp): GIVEN self `level=25`
(`exp_threshold=340`), `is_death_turn=false`, WHEN tính `combat_loss_exp`,
THEN kết quả = `0.04*340 = 13.6`.

**AC-23** (D.4 — song_tu_exp_bonus active): GIVEN self `level=25`
(`exp_threshold=340`), `SONG_TU_ACTIVE=1`, WHEN tính, THEN
`song_tu_exp_bonus = 0.02*340 = 6.8`.

**AC-24** (D.4 — song_tu_exp_bonus inactive): GIVEN `SONG_TU_ACTIVE=0`,
WHEN tính (bất kỳ level nào), THEN kết quả = `0` chính xác.

**AC-25** (D.5 — stat thô không trần): GIVEN `level=25, tier=3`, fixture
ATK (`base=10, growth=1.5, breakthrough_bonus=8`), WHEN tính `stat_value`,
THEN `ATK = 10+1.5*24+8*2 = 62`, không bị clamp.

**AC-26** (D.5 — stat % dưới trần): GIVEN `level=25, tier=3`, fixture Crit
Rate (`base=0.05, growth=0.008, breakthrough_bonus=0.02`), WHEN tính
`percentage_stat_value`, THEN raw=`0.282`, dưới `PERCENT_STAT_CAP=0.95` nên
KHÔNG bị clamp, kết quả = `0.282` (28.2%).

**AC-27** (D.5 — clamp trần % đúng biên): GIVEN fixture chỉ số % được
thiết kế để vượt trần ở level cao (`base=0.05, growth=0.05,
breakthrough_bonus=0.1`, `level=100, tier=10` → raw=`5.9`), WHEN tính
`percentage_stat_value`, THEN kết quả bị clamp CHÍNH XÁC ở `0.95` — không
phải `5.9`, không phải `1.0`.

**AC-28** (D.6 — order of operations, nhân trước khi so ngưỡng): GIVEN
`level=5` (`exp_threshold=140`), EXP hiện tại=50, `raw_total=40`,
`exp_multiplier=2.0`, WHEN `resolve_turn_exp` áp dụng, THEN `final_gain =
40*2.0 = 80` (KHÔNG phải 40), EXP mới = `130`, level VẪN = 5 (chưa đủ
140) — xác nhận nhân xảy ra TRƯỚC bước so sánh ngưỡng, không phải sau hay
bị bỏ qua.

**AC-29** (D.6 — cascade nhiều cấp rồi chạm đúng trần đột phá cùng lượt):
GIVEN `level=11` (Tu Luyện Thường, `exp_threshold(11)=200`), EXP hiện
tại=0, `final_gain=2500` (đã gộp+nhân xong), WHEN áp dụng, THEN cascade
qua các cấp 12→19 (9 lần lên cấp liên tiếp, tổng tiêu thụ 2160 EXP:
`200+210+...+280`), dừng lại chính xác ở `level=20`, chuyển sang Chờ Đột
Phá với EXP kẹp = `290`, phần dư `2500-2160-290=50` bị lãng phí — level
KHÔNG được vượt quá 20 trong cùng lượt này dù `final_gain` vẫn còn dư sau
khi capped.

**AC-30** (D.6 — hand-off short-circuit trước cả 4 nguồn, cả 2 cờ):
GIVEN lần lượt `death_and_consequence_blocked=true` VÀ (riêng biệt)
`turn.is_death_turn=true`, dù input `raw_combat/raw_passive/raw_song_tu`
đáng lẽ đều >0, WHEN `resolve_turn_exp` chạy, THEN cả 2 trường hợp hàm
return `0` ngay ở bước đầu tiên — verify các sub-formula D.2/D.3/D.4
KHÔNG được gọi (không chỉ output=0, mà không có side-effect/tính toán
thừa).

**AC-31** (D.6 — ví dụ tổng hợp đầy đủ, đối chiếu với ví dụ gốc trong
GDD): GIVEN `level=25` (`exp_threshold=340`), thắng trận `tier_diff=+1` →
`combat_win_exp=63.75`, `raw_passive=3.4`, Song Tu active →
`raw_song_tu=6.8`, `exp_multiplier=1.2`, EXP hiện tại=300, WHEN
`resolve_turn_exp` chạy, THEN `raw_total=73.95`, `final_gain=88.74`,
`level→26`, EXP dư=`48.74` — kết quả trùng khớp CHÍNH XÁC với ví dụ minh
họa trong phần Formulas của GDD (dùng làm regression test cố định).

### Edge Cases

**AC-32** (EC-1 — opponent thiếu tier là bug, không phải case hợp lệ):
GIVEN opponent Character Card KHÔNG có `tier` xác định (null/undefined),
WHEN `combat_win_exp` được gọi, THEN hệ thống PHẢI throw lỗi/assertion rõ
ràng (VD `assert` hoặc exception có message chỉ rõ "opponent tier
undefined") — KHÔNG được âm thầm dùng giá trị mặc định (0, null-coalesce,
v.v.) để tính tiếp; test xác nhận hành vi fail-fast, không xác nhận một
giá trị EXP cụ thể nào.

**AC-33** (EC-2 — đột phá xử lý trước, EXP lượt đó tính trên ngưỡng mới):
GIVEN character ở Chờ Đột Phá tại `level=20,tier=2,EXP=290`,
`breakthrough_requirement_met(2)` chuyển true ĐÚNG lượt này, VÀ cùng lượt
có thêm `final_gain` mới (VD combat_win_exp) — nếu tính TRƯỚC breakthrough
sẽ dùng `exp_threshold(20)=290` nhưng SAU breakthrough phải dùng
`exp_threshold(21)=300`, WHEN xử lý lượt, THEN thứ tự bắt buộc là: (1) đột
phá trước (`level=21,tier=3,EXP=0`), (2) rồi mới cộng `final_gain` của
lượt đó vào EXP=0 tại ngưỡng MỚI `exp_threshold(21)=300` — verify
implementation KHÔNG tính EXP lượt đó dựa trên ngưỡng cũ
`exp_threshold(20)`.

**AC-34** (EC-3 — rollback đột phá+undo, không rollback tài nguyên ngoài):
GIVEN lượt vừa gây đột phá (`level20,tier2→level21,tier3,EXP=0`) VÀ giả
lập lượt đó tiêu tốn 1 "Hồn Hoàn" (tài nguyên hệ khác), WHEN Undo lượt đó,
THEN `level/tier/EXP/Chờ-Đột-Phá-state` khôi phục về snapshot trước lượt
(giống AC-15); NHƯNG test PHẢI xác nhận rõ ràng rằng việc hoàn trả Hồn
Hoàn KHÔNG nằm trong phạm vi assertion của hệ EXP (out of scope theo
GDD) — không viết assertion nào kiểm tra Hồn Hoàn ở đây, tránh false
negative khi hệ ngoài đó chưa tồn tại.

**AC-35** (EC-4 — is_death_turn, short-circuit toàn cục): GIVEN
`turn.is_death_turn=true`, `battle_result=LOSS`, VÀ passive/Song Tu đáng lẽ
đều >0, WHEN `resolve_turn_exp` chạy, THEN kết quả = `0` cho TOÀN BỘ lượt
(không chỉ `raw_combat`) — khớp với quyết định short-circuit toàn cục đã
chốt (xem sửa đổi D.6/Core Rule #2 sau khi gap này được giải quyết).

**AC-36** (EC-5 — crippled trong lúc Chờ Đột Phá, state được giữ nguyên):
GIVEN character đang Chờ Đột Phá (`level=20,EXP=290`),
`death_and_consequence_blocked` chuyển `true` giữa chừng, WHEN thêm N lượt
trong lúc bị block, THEN state VẪN là Chờ Đột Phá (`level=20,EXP=290`
không đổi, không bị "mất" trạng thái); WHEN `death_and_consequence_blocked`
chuyển lại `false` VÀ `breakthrough_requirement_met(2)=true` xảy ra sau
đó, THEN đột phá xảy ra bình thường như AC-12, không cần bất kỳ bước khôi
phục state đặc biệt nào.

**AC-37** (EC-6 — tier_diff=0 giữa 2 bên tier=0, không cần sentinel):
GIVEN self tier=0 giả lập, opponent tier=0 (`tier_diff=0`), WHEN tính
`combat_win_exp`, THEN `multiplier=clamp(1+0,0.05,3.0)=1` — hoạt động bình
thường, KHÔNG throw lỗi/trả sentinel "N/A" (khác với `combat_power_estimate`
của combat-system.md).

**AC-38** (EC-7 — không có Tâm Pháp, default hoạt động bình thường): GIVEN
character chưa từng gán Tâm Pháp (`tam_phap_id=null`), WHEN tính
`exp_multiplier` VÀ `SONG_TU_ACTIVE`, THEN `exp_multiplier=1.0` (mặc định)
VÀ `SONG_TU_ACTIVE=0` vô điều kiện — toàn bộ `resolve_turn_exp` vẫn chạy
được không lỗi, không cần null-check đặc biệt nào trong test.

*(Ghi chú: `qa-lead` ban đầu phát hiện mâu thuẫn thật giữa pseudocode D.6 và
Edge Cases prose về `is_death_turn` — đã giải quyết TRƯỚC khi ghi section
này bằng quyết định "short-circuit toàn cục" (cùng dạng
`death_and_consequence_blocked`), áp dụng ngược lại vào D.6/Core Rule #2.
AC-35 phản ánh quyết định đã chốt, không phải mô tả gap.)*

## Open Questions

- ~~**Interface cụ thể "quan hệ Song Tu active" từ NPC Affinity &
  Relationship** (boolean đơn giản, hay cần NPC ID cụ thể để hỗ trợ
  multi-NPC Song Tu sau này?) chưa được định nghĩa — chỉ mới giả định 1
  boolean `SONG_TU_ACTIVE`.~~ — **đã giải quyết**:
  `npc-affinity-relationship.md` Core Rule #7 định nghĩa interface trả
  DANH SÁCH NPC ID đang có quan hệ Song Tu active (hỗ trợ đa NPC đồng
  thời); hệ này tiêu thụ boolean derived `SONG_TU_ACTIVE = (tập ≠ rỗng)`
  — giả định boolean của D.4 vẫn đúng nguyên trạng, bonus KHÔNG cộng
  dồn theo số NPC (registry `song_tu_active`). *(Đóng tại
  `/design-system npc-affinity-relationship` 2026-08-03)*
- **Cơ chế cụ thể của "phế đan điền/võ công" và điều kiện khôi phục** (đại
  cơ duyên, tiên thảo dị bảo...) — hệ này chỉ đọc 1 cờ boolean
  `death_and_consequence_blocked`, toàn bộ trigger/khôi phục do Death &
  Consequence sở hữu. *(Owner: game-designer, target: `/design-system
  death-and-consequence`)*
- **Dữ liệu `breakthrough_requirement` cụ thể theo từng bối cảnh** (VD: Hồn
  Hoàn ở Đấu La Đại Lục) và cơ chế tiêu thụ/hoàn trả tài nguyên đó khi
  Undo — hệ này chỉ định nghĩa cơ chế kiểm tra boolean, không sở hữu nội
  dung hay việc rollback tài nguyên ngoài (đã flag rõ ở AC-34). **Cập
  nhật 2026-08-03**: CƠ CHẾ đã chốt tại `setting-canon-integration.md`
  (registry `breakthrough_requirement_met` — predicate data thuần theo
  setting pack, thiếu data → false cứng + warning content-gap); phần còn
  mở chỉ là DATA authoring cụ thể cho từng tier (Open Question của GDD
  đó, target trước vertical slice). *(Owner còn lại:
  narrative-director + world-builder — authoring content)*
- **Đối chiếu lại `w_HP=0.25` (và các `w_*` khác) của `combat_power_estimate`**
  (combat-system.md D.13) với scale thật của D.5 (VD HP~100-400 ở level
  1-25 theo default hiện tại) — D.5 chỉ định nghĩa hình dạng/scale, việc
  sửa trọng số `w_*` thuộc quyền sở hữu combat-system.md. *(Owner:
  systems-designer, target: lần `/consistency-check` hoặc `/design-review`
  kế tiếp chạm tới combat-system.md)*
- **Bộ hệ số đầy đủ `LEVEL_GROWTH_X`/`BREAKTHROUGH_BONUS_X` cho toàn bộ 12
  chỉ số** — GDD mới hand-tune ví dụ HP/ATK/Crit Rate, 9 chỉ số còn lại
  (DEF, SPD, ACC, Né tránh, Crit Damage, Amp, Mitigation, Lifesteal, HP
  Regen) cần 1 pass cân bằng số liệu riêng trước khi implement. *(Owner:
  economy-designer/systems-designer, target: trước `/create-architecture`
  hoặc đầu Production)*
