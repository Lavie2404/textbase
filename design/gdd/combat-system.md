# Combat System

> **Status**: Designed — Pending Review
> **Author**: user + agents
> **Last Updated**: 2026-08-02
> **Implements Pillar**: Pillar 3 (Sức Mạnh Có Logic), Pillar 4 (Tường Thuật Sống Động)
> **Creative Director Review (CD-GDD-ALIGN)**: Skipped — Lean mode (not a PHASE-GATE)

## Overview

Combat System vừa là tầng tính toán (Lực chiến, thắng/thua, hệ quả
HP/trang bị/thức đã dùng) vừa là nơi người chơi cảm nhận rõ nhất công
thức của game: mỗi khi một hành động dẫn đến giao chiến, hệ thống này so
sánh Lực chiến hai bên (Chỉ số + Kỹ năng + Trang bị, có phạt vượt bậc và
áp chế cảnh giới), khóa kết quả trước khi AI được phép tường thuật, rồi
trả tín hiệu kết quả trận (thắng/thua, mức chênh lệch, thức đã dùng) cho
các hệ khác (EXP & Realm Progression, Death & Consequence) tự xử lý hệ
quả riêng của họ — Combat System không tự tính EXP hay hậu quả cái chết.
Với người chơi, đây là nơi Pillar 3 (Sức Mạnh Có Logic) trở thành thứ họ
TRẢI NGHIỆM trực tiếp: không có hào quang nhân vật chính, chỉ số/kỹ
năng/trang bị chuẩn bị trước quyết định thắng thua, và văn tường thuật
gọi đúng tên thức vừa dùng (Pillar 4) khiến mỗi trận đấu có bản sắc riêng
dù công thức tính giống hệt. Không có hệ thống này, "chiến đấu theo lượt
tường thuật bằng văn bản" (Core Identity, `game-concept.md`) chỉ còn là
tường thuật tự do không rủi ro thật — phá vỡ chính premise cốt lõi của
game.

## Player Fantasy

*(`creative-director` không được tham vấn — Lean mode, không phải section
rủi ro cao theo quy tắc skill. Sections D và H mới bắt buộc spawn.)*

Người chơi cảm nhận Combat System trực tiếp nhưng KHÔNG qua thao tác thời
gian thực — agency nằm ở khâu CHUẨN BỊ và CAM KẾT (chọn trang bị/kỹ năng
phù hợp trước khi giao đấu, quyết định có đánh hay tránh, có tìm cách
thay đổi điều kiện trận đấu trước không), đúng nguyên tắc Khế Ước Cơ
Học/Tường Thuật của `game-concept.md`: một khi đã giao chiến, công thức
Lực chiến quyết định, AI chỉ tường thuật trung thực — không phải phản xạ
tay hay chọn chiêu theo thời gian thực (Anti-Pillar cấm rõ "chiến đấu
real-time/hoạt ảnh phức tạp"). Cảm giác đúng là MASTERY qua chuẩn bị: một
nhân vật được trang bị/luyện tập đúng bậc thắng vì đã chuẩn bị kỹ, không
phải vì may mắn hay hào quang nhân vật chính. Đọc đoạn văn tường thuật
một trận đấu — nhịp giao đấu xen kẽ chiêu thức, không dồn chiêu liên tục
(đã kiểm chứng qua prototype) — là khoảnh khắc người chơi THẤY thành quả
chuẩn bị của mình biến thành hành động cụ thể, gọi đúng tên thức, đúng
phong cách vũ khí.

Rủi ro thật là một phần cốt lõi của cảm giác: một trận thua có thể dẫn
tới hậu quả nặng (trọng thương, phế đan điền) hoặc tệ nhất là cái chết
thật (ngưỡng Hảo cảm thù địch sâu sắc) — không có "thử lại vô hạn", đúng
Pillar 2 (Hệ Quả Thực Sự). Áp chế cảnh giới tạo áp lực chiến lược thật:
vượt bậc quá xa mà chưa chuẩn bị đủ có thể quyết định thua ngay cả khi
thực lực gần bằng nhau — người chơi học cách tôn trọng con số, không
đánh liều mù quáng.

## Detailed Design

*(Lean mode: Section C không bắt buộc spawn specialist — chỉ D và H. Đã
thu thập đủ quyết định kiến trúc qua 3 vòng câu hỏi trước khi draft. Hệ
số/công thức chính xác của các phép so sánh chỉ số được ĐẶT TÊN ở đây
nhưng định nghĩa đầy đủ ở Section D với `systems-designer`.)*

### Core Rules

1. **1 trận đấu = một chuỗi nhiều lượt Turn Manager liên tiếp**: khi 1
   hành động kích hoạt giao chiến, nhân vật chuyển sang trạng thái
   `in_combat=true`, duy trì xuyên suốt nhiều lượt Turn Manager cho đến
   khi trận kết thúc (Core Rule #8). Mỗi lượt Turn Manager trong lúc
   `in_combat=true` = đúng 1 **pha giao đấu** (exchange), đánh số bằng
   `exchange_id` — bộ đếm nguyên bắt đầu từ 1, tăng dần theo TỪNG TRẬN
   (KHÔNG xuyên suốt phiên chơi), reset về 1 khi 1 trận mới bắt đầu.
   `exchange_id` dùng làm seed cho `coin_flip` khi SPD hòa (D.2) và làm
   đơn vị đếm cho trần an toàn `MAX_EXCHANGE_COUNT` (D.12).

2. **Mỗi pha giao đấu: cả hai bên ra đòn theo thứ tự SPD, có thể ngắt sớm**:
   người chơi chọn hành động (dùng 1 thức từ `known_skill_ids` chưa dùng
   trong trận, phòng thủ, dùng vật phẩm chiến đấu — Core Rule #6, hoặc bỏ
   chạy — Core Rule #9); đối thủ (NPC) cũng chọn 1 hành động tương ứng
   theo LOGIC HỆ THỐNG (thuật toán chọn thức của đối thủ — chi tiết ở
   Tuning Knobs, KHÔNG phải AI/LLM tự quyết định, đúng Contract
   Enforcement). `SPD` của hai bên quyết định ai ra đòn TRƯỚC trong pha.
   **Nếu đòn đi trước làm HP bên kia về 0, đòn đi sau trong CÙNG pha đó
   KHÔNG được thực thi** — trận kết thúc ngay tại đó, pha coi như đã giải
   quyết xong (không phải pha "dở dang"). Chỉ khi đòn đi trước KHÔNG hạ
   HP đối phương về 0, đòn đi sau mới thực thi bình thường.

3. **Giải quyết pha giao đấu bằng mô phỏng cặp chỉ số đầy đủ**: mỗi đòn
   đánh trong pha tính qua chuỗi: `ACC` (người đánh) vs `Né tránh` (người
   đỡ) → trúng/hụt; nếu trúng: `ATK` vs `DEF` → sát thương cơ bản; `Crit
   Rate`/`Crit Damage` → có chí mạng hay không; `Khuếch đại sát thương`
   (người đánh) và `Chống chịu` (người đỡ) → nhân/giảm sát thương cuối;
   `Lifesteal` → hồi máu người đánh theo % sát thương gây ra. Đòn đi
   trước (theo SPD, Core Rule #2) giải quyết xong hoàn toàn (bao gồm cả
   kiểm tra HP=0) TRƯỚC KHI đòn đi sau bắt đầu tính — không tính đồng
   thời. `HP Regen` áp dụng thụ động vào cuối pha CHỈ KHI pha kết thúc mà
   không bên nào về 0 HP (trận còn tiếp tục) — không áp dụng nếu pha đã
   kết thúc trận (Core Rule #2 vừa ngắt sớm). Công thức chính xác từng
   bước — Section D.

4. **Áp chế cảnh giới & phạt vượt bậc áp dụng MỖI PHA, không phải 1 lần
   duy nhất đầu trận**: chênh lệch cảnh giới giữa 2 bên làm giảm chỉ số
   hiệu dụng (ATK/DEF/ACC...) của bên thấp cảnh giới hơn — áp dụng lại ở
   từng bước tính của Core Rule #3, không phải một hệ số tính 1 lần rồi
   khóa cứng cho cả trận (vì HP/trạng thái thay đổi từng pha nhưng tương
   quan cảnh giới không đổi trong 1 trận).

5. **Không lặp thức trong 1 trận — áp dụng CẢ HAI bên, xuyên suốt toàn bộ
   chuỗi lượt**: đúng Core Rule #3 của `equipment-skill-data-system.md`
   (ID thức duy nhất toàn cục), ràng buộc "không lặp" tính trên PHẠM VI
   TOÀN TRẬN (nhiều lượt), không phải từng lượt riêng lẻ. Hết thức khả
   dụng → dùng "Đánh thường" (basic attack, luôn khả dụng theo Edge Case
   của Equipment GDD) làm phương án dự phòng, không chặn hành động.

6. **Vật phẩm chiến đấu — tối giản, KHÔNG phải inventory**: mỗi nhân vật
   có tối đa 1 "vật phẩm chiến đấu" khả dụng/trận (field `combat_item_id`,
   optional — rỗng nếu không mang gì), dùng được đúng 1 lần/trận qua hành
   động "Dùng vật phẩm". Đây là khái niệm RIÊNG của Combat System, KHÔNG
   mở rộng phạm vi đã khóa của `equipment-skill-data-system.md` (không có
   kho đồ nhiều vật phẩm, không stack, không tồn tại ngoài phạm vi 1 trận
   đấu — hết trận, `combat_item_id` không tự động mất, chỉ trạng thái "đã
   dùng trong trận này" reset).

7. **Điểm Chỉ số (Core Mechanics #2, `game-concept.md`) = điểm tổng hợp
   cho mục đích khác, KHÔNG phải cơ chế thắng/thua trực tiếp**: thắng/thua
   của TOÀN TRẬN được xác định bởi HP về 0 (Core Rule #8), KHÔNG bởi 1
   phép so sánh "Lực chiến" tổng duy nhất. "Lực chiến" (Điểm Chỉ số +
   Điểm Kỹ năng + Điểm Trang bị) vẫn tồn tại như MỘT con số tổng hợp hiển
   thị trên Character Card và dùng để: (a) ước tính trước trận (người
   chơi cân nhắc có nên giao chiến), (b) làm biến đầu vào cho các hệ khác
   (EXP scaling theo chênh lệch, ngưỡng 20 cấp) — nhưng KHÔNG tự nó quyết
   định kết quả từng pha hay toàn trận. Đây là điểm làm rõ (và thu hẹp
   phạm vi nghĩa) so với cách `game-concept.md` mô tả ở tầng concept.

8. **Điều kiện kết thúc trận**: (a) HP của 1 bên chạm 0 → bên đó thua;
   (b) hành động "Bỏ chạy" thành công (Core Rule #9) → trận kết thúc
   không phân thắng bại; không có điều kiện hòa (draw) — luôn có 1 kết
   quả rõ ràng trừ trường hợp (b).

9. **Bỏ chạy — có tỉ lệ thành công, không phải luôn khả dụng**: hành động
   "Bỏ chạy" xác suất thành công dựa trên chênh lệch `SPD` hai bên (công
   thức — Section D); thất bại → tính là 1 pha giao đấu bình thường (đối
   thủ vẫn ra đòn, người chơi không ra đòn ở pha đó).

10. **`max_invocations_per_battle` — hằng số này thuộc sở hữu Combat
    GDD**: giới hạn số lần TỐI ĐA 1 kỹ năng có thể được gọi (qua các thức
    khác nhau của nó) trong 1 trận — đóng Open Question đang BLOCKED của
    `equipment-skill-data-system.md` AC-11. Giá trị cụ thể — Tuning
    Knobs.

11. **`locked_result` mỗi pha giao đấu**: chứa `attacker_id`,
    `defender_id`, `thuc_id` mỗi bên dùng, `hit`/`crit`/`dodge` flags,
    `damage_dealt` mỗi bên, `hp_after` mỗi bên, `battle_active` (bool —
    trận còn tiếp tục sau pha này hay đã kết thúc). Tất cả field số tuân
    thủ Contract Enforcement — không xuất hiện trần trụi trong
    `narration_text`. Khi `battle_active=false`, kèm thêm field
    `outcome` với schema THỐNG NHẤT cố định:
    `{ type: "win" | "lose" | "no_outcome", winner_id: string | null,
    loser_id: string | null }` — `winner_id`/`loser_id` đều `null` khi
    `type="no_outcome"` (bỏ chạy thành công hoặc chạm trần
    `MAX_EXCHANGE_COUNT`); không có hình dạng dữ liệu nào khác cho field
    này ở bất kỳ nhánh kết thúc trận nào.

12. **Chỉ pha KẾT THÚC trận mới phát tín hiệu hand-off**: `battle_active=false`
    kèm `outcome` (win/lose), margin liên quan (chênh lệch HP còn lại, số
    pha đã đấu...) — EXP & Realm Progression, Death & Consequence, NPC
    Affinity & Relationship (chưa thiết kế) tự đọc tín hiệu này để tính
    hệ quả riêng; Combat System không tự tính EXP/hậu quả cái chết/thay
    đổi Hảo cảm.

### States and Transitions

| State | Mô tả | Chuyển sang |
|---|---|---|
| Not In Combat | Trạng thái mặc định, hành động thường không kích hoạt cơ chế chiến đấu | → In Combat (khi 1 hành động kích hoạt giao chiến, ở lượt Turn Manager đó) |
| In Combat — Awaiting Exchange | Đang trong trận, chờ Turn Manager đưa gợi ý hành động (thức khả dụng + phòng thủ + vật phẩm + bỏ chạy) | → Resolving Exchange (khi người chơi xác nhận hành động) |
| Resolving Exchange | Tính pha giao đấu: chọn hành động đối thủ (Core Rule #2), giải quyết theo Core Rule #3-4, cập nhật HP | → In Combat — Awaiting Exchange (nếu `battle_active=true`, lượt kế tiếp) HOẶC → Battle Concluded (nếu `battle_active=false`) |
| Battle Concluded | Trận đã kết thúc (thắng/thua/bỏ chạy thành công), phát tín hiệu hand-off (Core Rule #12) | → Not In Combat (lượt kế tiếp trở lại bình thường) |

*(Không có quay lại "In Combat" từ "Not In Combat" trong cùng 1 trận đã
Concluded — muốn giao chiến lại là một trận HOÀN TOÀN MỚI, reset danh
sách thức đã dùng theo Core Rule #5.)*

### Interactions with Other Systems

- **Turn Manager** (Foundation, Approved) — mỗi pha giao đấu là 1 lượt
  Turn Manager bình thường (đúng Core Rule #1 của Turn Manager: 1 lượt =
  1 hành động); Combat cung cấp danh sách hành động khả dụng (thức +
  phòng thủ + vật phẩm + bỏ chạy, cắt còn tối đa `suggested_action_count=4`
  theo registry) cho Turn Manager hiển thị làm gợi ý.
- **Equipment & Skill Data System** (Foundation, Approved) — đọc
  `known_skill_ids`, `equipped_weapon_id`, danh sách thức + `thuc_id`
  (unique) + `style_descriptor` + `tier`; đóng Open Question BLOCKED của
  GDD đó bằng cách định nghĩa `max_invocations_per_battle` (Core Rule
  #10).
- **AI/LLM Integration Layer** (Core, Designed) — gọi `narration_call`
  với `locked_result` của MỖI pha giao đấu (1 lệnh gọi/lượt, đúng
  `calls_per_turn_max=3`); `style_descriptor` của thức được chèn vào
  prompt như ngữ cảnh phong cách.
- **Mechanic/Narration Contract Enforcement** (Foundation, Approved) —
  mọi field số trong `locked_result` mỗi pha (damage, HP...) chịu Numeric
  Leak Detection; Combat không bao giờ đọc lại `narration_text` để suy ra
  kết quả.
- **EXP & Realm Progression** (Feature, chưa thiết kế) — đọc tín hiệu
  hand-off (Core Rule #12) khi `battle_active=false`, tự tính EXP; Combat
  không sở hữu công thức EXP.
- **Death & Consequence** (Feature, chưa thiết kế) — đọc tín hiệu thua
  trận + ngưỡng Hảo cảm đối thủ (từ NPC Affinity, chưa thiết kế) để
  quyết định hậu quả (chết thật hay không); Combat chỉ báo "đã thua",
  không tự quyết định mức độ hậu quả.
- **NPC Affinity & Relationship** (Feature, chưa thiết kế) — Combat
  không trực tiếp đọc/ghi Hảo cảm; ngưỡng 20 cấp chênh lệch (điều kiện
  NPC chủ động địch ý) thuộc phạm vi Situation/Encounter Generation
  quyết định KHI NÀO kích hoạt Combat, không phải Combat tự kiểm tra.

## Formulas

*(Quy ước ký hiệu dùng xuyên suốt: `clamp(v, lo, hi) = max(lo, min(hi, v))`;
`round()` làm tròn thông thường, 0.5 làm tròn lên; `roll_uniform[0,1)` là
số ngẫu nhiên đều lấy tại đúng thời điểm formula chạy, không tái sử dụng
giữa các bước. Mọi field số trong `locked_result` là số nguyên sau
`round()`, đúng Numeric Leak Detection của Mechanic/Narration Contract
Enforcement. Đề xuất bởi `systems-designer`.)*

*(**Ranh giới phạm vi bắt buộc nêu rõ**: KHÔNG có formula nào dưới đây
nhận Hảo cảm làm input — ngưỡng -80 (thù địch sâu sắc) thuộc Death &
Consequence + NPC Affinity (chưa thiết kế). Combat chỉ xuất tín hiệu
thắng/thua + `hp_after` qua `locked_result`/hand-off (Core Rule #12);
việc ngưỡng -80 có tính bao gồm hay không là quyết định của hệ đó, không
phải hệ này.)*

**D.1 — Chỉ số hiệu dụng (Áp chế cảnh giới & Phạt vượt bậc)**

```
effective_stat(C, X) = base_X(C) * total_penalty_multiplier(C)

total_penalty_multiplier(C) = clamp(
    layer_mult(gap_realm(C)) * layer_mult(gap_gear(C)),
    FLOOR_TOTAL, 1.0
)

layer_mult(gap) = clamp(1 - PENALTY_PER_TIER * gap, FLOOR_LAYER, 1.0)

gap_realm(C)  = max(0, tier(opponent(C)) - tier(C))
gap_gear(C)   = max(0, weapon_tier(C) - tier(C), skill_tier_used(C) - tier(C))
```

Áp dụng cho X ∈ {ATK, DEF, ACC, Né tránh, SPD, Crit Rate, Crit Damage,
Khuếch đại sát thương, Chống chịu, Lifesteal, HP Regen}. **KHÔNG áp dụng
cho max HP** — HP là "vốn sinh mệnh" thô, không phải hiệu năng giao đấu;
bị áp chế nghĩa là đánh/đỡ kém hơn, không phải "mất máu sẵn" trước khi
đánh.

`skill_tier_used(C)` chỉ tồn tại khi hành động của C trong pha là "dùng
thức"; với phòng thủ/dùng vật phẩm/bỏ chạy, `gap_gear(C) = max(0,
weapon_tier(C) - tier(C))` (bỏ số hạng kỹ năng).

| Symbol | Type | Range | Description |
|---|---|---|---|
| `tier(C)` | int | 0–∞ | Bậc/cảnh giới hiện tại của C (nguồn: EXP & Realm Progression, chưa thiết kế — Combat chỉ đọc) |
| `weapon_tier(C)` | int | 0–∞ | `tier` vũ khí đang trang bị (nguồn: Equipment & Skill Data System) |
| `skill_tier_used(C)` | int | 0–∞ (optional) | `tier` kỹ năng gốc của thức vừa dùng trong pha |
| `gap_realm`, `gap_gear` | int | 0–∞ | Số bậc chênh lệch bất lợi (0 nếu C không thua kém) |
| `PENALTY_PER_TIER` | float (knob) | 0–1 | % giảm mỗi bậc chênh lệch — đề xuất mặc định **0.15** |
| `FLOOR_LAYER` | float (knob) | 0–1 | Sàn multiplier mỗi lớp phạt riêng — đề xuất mặc định **0.1** |
| `FLOOR_TOTAL` | float (knob) | 0–1 | Sàn multiplier TỔNG sau khi nhân 2 lớp — đề xuất mặc định **0.05** |
| `base_X(C)` | float | 0–∞ | Giá trị gốc chưa bị phạt (từ Character Card) |
| `effective_stat(C,X)` | float | `[FLOOR_TOTAL·base_X, base_X]` | Giá trị dùng thực tế trong pha, input cho mọi formula D.2–D.10 |

**Output range**: `[FLOOR_TOTAL * base_X, base_X]` — luôn ≥0 vì `base_X ≥
0` và multiplier ∈ `[FLOOR_TOTAL, 1]`. **Đóng trực tiếp test case "floor
khi chồng phạt"**: dù 2 lớp phạt cộng dồn cực đoan, `effective_stat`
không bao giờ âm và không bao giờ về đúng 0 nếu `base_X > 0`.

**Ví dụ thường**: C tier=3, đối thủ tier=6 → `gap_realm=3`; C trang bị vũ
khí tier=5, dùng thức thuộc kỹ năng tier=4 → `gap_gear = max(0,2,1) = 2`.
`layer_mult(3) = clamp(1-0.45, 0.1, 1) = 0.55`; `layer_mult(2) =
clamp(1-0.3, 0.1, 1) = 0.7`.
`total = clamp(0.55*0.7, 0.05, 1) = 0.385`. `base_ATK=50` →
`effective_ATK = 19.25`.

**Ví dụ biên (floor kích hoạt)**: `gap_realm=10, gap_gear=10` → mỗi lớp
floor tại 0.1 → tích `0.01` → `clamp(0.01, 0.05, 1) = 0.05` (FLOOR_TOTAL
thắng, không phải 0.01) → `effective_ATK = 50*0.05 = 2.5`. Không bao giờ
về 0.

**Ghi chú ngưỡng 20 cấp**: vì đây là hàm suy giảm TUYẾN TÍNH LIÊN TỤC
theo từng bậc (không phải ngưỡng cắt cứng), câu hỏi "`>=20` hay `>20`"
không áp dụng được cho công thức này. Ngưỡng 20 CẤP của `game-concept.md`
đo bằng "cấp" (10 cấp = 1 bậc), khác thang đo với "bậc/cảnh giới" ở đây,
và thuộc quyết định của Situation/Encounter Generation (đã chốt ở
Interactions with Other Systems) — Combat không dùng nó trong formula
này.

---

**D.2 — Xác định thứ tự ra đòn (SPD Priority)**

```
first(A,B)  = A  nếu effective_SPD(A) > effective_SPD(B)
            = B  nếu effective_SPD(B) > effective_SPD(A)
            = coin_flip(seed=exchange_id)  nếu bằng nhau tuyệt đối
second(A,B) = bên còn lại
```

| Symbol | Type | Range | Description |
|---|---|---|---|
| `effective_SPD(A)`, `effective_SPD(B)` | float | 0–∞ | Từ D.1 |
| `coin_flip` | bool | {A,B}, 50/50 | Random đều, KHÔNG thiên vị người chơi (Pillar 1) |
| `first`, `second` | enum | {A,B} | Thứ tự ra đòn trong pha, dùng bởi D.9 |

**Output**: luôn xác định 1 cặp (first, second), không có "hòa treo".

**Ví dụ**: `effective_SPD(player)=32.5`, `effective_SPD(npc)=40` →
`first=npc, second=player`.
**Ví dụ hòa**: cả 2 = 40.0 chính xác → `coin_flip` quyết định, mỗi bên
50%.

---

**D.3 — Xác định trúng/hụt (ACC vs Né tránh)**

```
P_hit(attacker, defender) = clamp(0.5 + K_HIT * (effective_ACC(attacker) - effective_Né(defender)), P_MIN, P_MAX)
hit = roll_uniform[0,1) < P_hit
```

| Symbol | Type | Range | Description |
|---|---|---|---|
| `effective_ACC`, `effective_Né` | float | 0–∞ | Từ D.1 |
| `K_HIT` | float (knob) | >0 | Độ dốc — đề xuất mặc định **0.01** |
| `P_MIN`, `P_MAX` | float (knob) | 0–1 | Sàn/trần xác suất — đề xuất mặc định **0.05 / 0.95** |
| `P_hit` | float | `[P_MIN, P_MAX]` | Xác suất trúng đòn |
| `hit` | bool | {true,false} | Kết quả |

**Output range**: `P_hit ∈ [P_MIN, P_MAX]` — không bao giờ 100% trúng hay
100% hụt tuyệt đối (đúng nguyên tắc "thế giới khách quan không có tuyệt
đối"). **Đóng test case 0/0**: vì là hàm HIỆU SỐ (trừ, không chia),
`effective_ACC = effective_Né = 0` → hiệu số = 0 → `P_hit = 0.5`, không
có phép chia nào xảy ra, không cần xử lý ngoại lệ riêng.

**Ví dụ**: `effective_ACC=45.2, effective_Né=38.0` → diff=7.2 → `P_hit =
0.572` → roll 0.4 < 0.572 → `hit=true`.

---

**D.4 — Sát thương cơ bản**

```
raw_damage = max(0, effective_ATK(attacker) - effective_DEF(defender))
```

| Symbol | Type | Range | Description |
|---|---|---|---|
| `effective_ATK`, `effective_DEF` | float | 0–∞ | Từ D.1 |
| `raw_damage` | float | `[0, ∞)` | Sát thương trước crit/khuếch đại/chống chịu |

**Output range**: `[0, ∞)`, floor tại 0 bằng `max()`. Đúng phát hiện từ
prototype: chênh lệch nhỏ → `raw_damage` nhỏ (nhiều pha giằng co); chênh
lệch lớn → `raw_damage` lớn (kết thúc nhanh) — đây CHÍNH LÀ cơ chế tạo
nhịp trận tự nhiên, không cần formula "số pha" riêng.

**Ví dụ**: `effective_ATK=19.25, effective_DEF=22` → `raw = max(0, -2.75)
= 0` — đòn trúng (D.3 pass) nhưng không gây sát thương, hợp lệ ("đấm vào
tường").

---

**D.5 — Chí mạng (Crit Rate → Crit Damage)**

```
is_crit = roll_uniform[0,1) < clamp(effective_CritRate(attacker), 0, 1)
crit_multiplier = is_crit ? max(1.0, effective_CritDamage(attacker)) : 1.0
```

| Symbol | Type | Range | Description |
|---|---|---|---|
| `effective_CritRate` | float | `[0,1]` | Xác suất chí mạng |
| `effective_CritDamage` | float | ≥1.0 (stat) | Hệ số nhân TỔNG khi chí mạng (VD 1.5 = 150%) |
| `crit_multiplier` | float | `[1.0, ∞)` | Floor tại 1.0 — chí mạng không bao giờ làm YẾU đòn |

**Output range**: `[1.0, ∞)`. Chỉ chạy khi `hit=true` (D.3) — miss thì bỏ
qua toàn bộ D.5-D.7.

**Ví dụ**: `effective_CritRate=0.18`, roll=0.05 → `is_crit=true`;
`effective_CritDamage=1.6` → `crit_multiplier=1.6`.

---

**D.6 — Sát thương cuối (Khuếch đại × Chống chịu)**

```
pre_mitigation   = raw_damage * crit_multiplier
final_multiplier = clamp((1 + effective_Amp(attacker)) * (1 - effective_Mitigation(defender)), MIN_DMG_MULT, ∞)
final_damage     = round(pre_mitigation * final_multiplier)
```

| Symbol | Type | Range | Description |
|---|---|---|---|
| `effective_Amp` | float | ≥0 | Khuếch đại sát thương (người đánh) |
| `effective_Mitigation` | float | ≥0 (có thể >1) | Chống chịu (người đỡ) |
| `MIN_DMG_MULT` | float (knob) | 0–1 | Sàn multiplier cuối — đề xuất mặc định **0.1** |
| `final_damage` | int | `[0, ∞)` | Sát thương thực nhận, ghi vào `locked_result.damage_dealt` |

**Output range**: `[0, ∞)`. `MIN_DMG_MULT` đảm bảo **Chống chịu dù vượt
100% cũng không bao giờ làm sát thương âm hay bằng 0 tuyệt đối** — luôn
≥10% `pre_mitigation` lọt qua, không có bất tử tuyệt đối (nhất quán
"không có tuyệt đối" như D.3). Nếu `raw_damage=0` (từ D.4),
`final_damage=0` bất kể multiplier.

**Ví dụ**: `raw=30`, `crit_multiplier=1.6` → `pre_mit=48`;
`effective_Amp=0.1, effective_Mitigation=0.15` →
`final_mult=clamp(1.1*0.85,0.1,∞)=0.935` → `final_damage=round(44.88)=45`.

---

**D.7 — Lifesteal**

```
heal_attacker = round(final_damage * effective_Lifesteal(attacker))
hp'(attacker) = min(max_HP(attacker), hp(attacker) + heal_attacker)
```

| Symbol | Type | Range | Description |
|---|---|---|---|
| `effective_Lifesteal` | float | ≥0 | % sát thương gây ra hồi lại thành HP |
| `heal_attacker` | int | `[0, ∞)` | Lượng hồi — 0 tự động nếu `final_damage=0` (miss hoặc đấm vào tường) |
| `hp'(attacker)` | int | `[hp, max_HP]` | Clamp không overheal quá max HP |

**Output range**: `[hp(attacker), max_HP(attacker)]`. Tính TRÊN
`final_damage` (sát thương thực nhận sau D.6), không phải `raw_damage` —
đúng câu chữ Core Rule #3 "hồi máu theo % sát thương gây ra".

**Ví dụ**: `final_damage=45`, `effective_Lifesteal=0.1` →
`heal=round(4.5)=5`.

---

**D.8 — Chuỗi giải quyết 1 đòn đánh (kết hợp D.3–D.7)**

```
resolve_attack(attacker, defender, hp_defender):
  hit = D.3(attacker, defender)
  if not hit:
    return { hit:false, crit:false, damage:0, heal:0, hp_defender_after: hp_defender }
  raw          = D.4(attacker, defender)
  crit, cmult  = D.5(attacker)
  final_damage = D.6(raw, cmult, attacker, defender)
  hp_defender_after = max(0, hp_defender - final_damage)
  heal = D.7(final_damage, attacker)
  return { hit:true, crit, damage:final_damage, heal, hp_defender_after }
```

**Output**: struct 5 field, tất cả field số đã clamp/round ở D.3–D.7.
`hp_defender_after ∈ [0, hp_defender]` — floor tại 0 (không HP âm).

---

**D.9 — Giải quyết pha giao đấu & Quy tắc ngắt sớm** (formula trung tâm —
đúng Core Rule #2/#3 đã sửa)

```
resolve_exchange(A, B):
  first, second = D.2(A, B)
  r1 = D.8(first, second, hp[second])
  hp[second] = r1.hp_defender_after

  if hp[second] == 0:
    # NGẮT SỚM — đòn đi sau KHÔNG thực thi (Core Rule #2)
    r2 = { hit:null, crit:null, damage:0, heal:0, executed:false }
    battle_active = false
    outcome = { winner: first, loser: second }
    # KHÔNG áp dụng D.10 (Core Rule #3)
  else:
    r2 = D.8(second, first, hp[first])
    r2.executed = true
    hp[first] = r2.hp_defender_after
    if hp[first] == 0:
      battle_active = false
      outcome = { winner: second, loser: first }
      # vẫn KHÔNG áp dụng D.10 — pha này đã kết thúc trận
    else:
      battle_active = true
      hp[first]  = D.10(first,  hp[first])
      hp[second] = D.10(second, hp[second])

  return locked_result{ first, second, r1, r2, hp, battle_active, outcome }
```

| Symbol | Type | Range | Description |
|---|---|---|---|
| `r1`, `r2` | struct | — | Kết quả D.8 của đòn đi trước/đi sau |
| `r2.executed` | bool | {true,false} | `false` khi bị ngắt sớm — phân biệt với miss (r2.hit=null, không phải false) |
| `r2.hit = null` | sentinel | {null,true,false} | Trạng thái thứ 3: "chưa từng ra đòn", KHÔNG phải "ra đòn nhưng trượt" — tương tự tiền lệ sentinel `"N/A"` đã dùng ở `session_violation_count` trong registry |
| `battle_active` | bool | {true,false} | Khớp field `locked_result.battle_active` (Core Rule #11) |
| `outcome` | struct | {winner, loser} hoặc null | null nếu `battle_active=true` (trận tiếp tục) |

**Output**: `hp[A], hp[B] ∈ [0, max_HP]` luôn; `battle_active` xác định rõ
ràng mọi trường hợp, không có pha "dở dang".

**Ví dụ 1 (không ngắt)**: NPC đi trước (D.2), đánh trúng,
`final_damage=45`, player hp 50→`max(0,5)=5` (≠0) → player's đòn THỰC
THI → trúng, `final_damage=30`, npc hp 40→10 (≠0) → `battle_active=true`
→ D.10 áp dụng cho cả 2.

**Ví dụ 2 (ngắt sớm — đóng đúng quyết định 3B)**: NPC đi trước,
`final_damage=60`, player hp 50→`max(0,-10)=0` → **player's đòn KHÔNG
thực thi** (`r2={hit:null, executed:false}`) → `battle_active=false`,
`outcome={winner:npc, loser:player}` → không có D.10 pha này.

---

**D.10 — HP Regen (thụ động, cuối pha, có điều kiện)**

```
hp'(C) = min(max_HP(C), hp(C) + round(max_HP(C) * effective_HPRegen(C)))
```

Chỉ được gọi từ nhánh `battle_active=true` của D.9 — **không chạy nếu
pha vừa kết thúc trận** (đúng Core Rule #3 đã sửa).

| Symbol | Type | Range | Description |
|---|---|---|---|
| `effective_HPRegen` | float | `[0,1]` | % max HP hồi mỗi pha (từ D.1) |
| `max_HP(C)` | int | >0 | KHÔNG bị D.1 phạt (xem D.1) |
| `hp'(C)` | int | `[hp(C), max_HP(C)]` | Không overheal |

**Ví dụ**: `max_HP=200`, `effective_HPRegen=0.05` → regen=10; `hp=150` →
`hp'=160`. Ví dụ overheal-cap: `hp=195` → `hp'=min(200,205)=200`.

---

**D.11 — Xác suất bỏ chạy thành công**

```
P_flee(fleeing, opponent) = clamp(0.5 + K_FLEE * (effective_SPD(fleeing) - effective_SPD(opponent)), P_MIN_FLEE, P_MAX_FLEE)
flee_success = roll_uniform[0,1) < P_flee
```

| Symbol | Type | Range | Description |
|---|---|---|---|
| `K_FLEE` | float (knob) | >0 | Đề xuất mặc định **0.01** (cùng dạng D.3, tune độc lập) |
| `P_MIN_FLEE`, `P_MAX_FLEE` | float (knob) | 0–1 | Đề xuất mặc định **0.05 / 0.95** |
| `flee_success` | bool | {true,false} | — |

**Output range**: `[P_MIN_FLEE, P_MAX_FLEE]` — cùng lý do D.3, không có
bỏ chạy chắc chắn thành công/thất bại. `effective_SPD` bằng nhau (kể cả
cả 2 = 0) → diff=0 → `P_flee=0.5`, không lỗi (cùng cơ chế hiệu số, không
chia).

**Tương tác với D.9 (Core Rule #9)**: nếu `flee_success=false`, pha đó
chỉ có ĐỐI THỦ ra đòn — bên bỏ chạy không tấn công (không phải hoán đổi
thứ tự D.2, đơn giản là hành động của họ trong pha này là "bỏ chạy thất
bại", không phải "tấn công"), D.9 chạy với `first=opponent`, và vế
"second" là bên vừa bỏ chạy nhưng KHÔNG thực hiện đòn tấn công (tương tự
nhánh `executed:false` nhưng vì lý do khác — chọn hành động khác, không
phải bị ngắt sớm). Nếu `flee_success=true`, trận kết thúc ngay, không
tính là 1 pha giao đấu bình thường (đúng Core Rule #8b).

**Ví dụ**: `effective_SPD(player)=32.5, effective_SPD(npc)=40` →
diff=-7.5 → `P_flee=0.425` → roll 0.5 → 0.5 ≥ 0.425 → thất bại.

---

**D.12 — `max_invocations_per_battle`** (đóng AC-11 BLOCKED của
`equipment-skill-data-system.md`)

```
max_invocations_per_battle = ceil(MAX_EXCHANGE_COUNT / max_known_skills_per_character)
```

| Symbol | Type | Range | Description |
|---|---|---|---|
| `MAX_EXCHANGE_COUNT` | int (knob, MỚI — Combat sở hữu) | >0 | Trần an toàn cứng: số pha tối đa/trận (chặn giằng co vô hạn lý thuyết) — đề xuất mặc định **30** |
| `max_known_skills_per_character` | int (registry, LOCKED) | =6 | Từ `equipment-skill-data-system.md`, không đổi |
| `max_invocations_per_battle` | int | ≥1 | Hằng số THIẾT KẾ, tính 1 lần, không tính lại theo trận cụ thể |

`= ceil(30/6) = 5`.

**Output**: hằng số nguyên duy nhất áp dụng cho MỌI kỹ năng, không phải
per-battle runtime value — đây là mục tiêu content-authoring ("mỗi kỹ
năng nên có đủ thức để chịu được worst-case luân phiên đều 6 kỹ năng
trong 1 trận dài tới trần an toàn"), KHÔNG phải giới hạn runtime chặn
hành động (giới hạn thật là "không lặp thức" của Combat Core Rule #5, đã
tự nhiên bị chặn bởi `thuc_count` của mỗi kỹ năng).

**Đóng AC-11**: `is_pool_sufficient(skill) = thuc_count(skill) >= 5`.

**Ghi chú quan trọng — không phải mâu thuẫn**: registry
`min_thuc_per_skill=3` (LOCKED) nghĩa là kỹ năng author ở MỨC TỐI THIỂU
sẽ cho `is_pool_sufficient=false` (3<5). Đây KHÔNG phải lỗi cần sửa
`min_thuc_per_skill` — theo đúng Edge Cases của Equipment GDD,
`is_pool_sufficient=false` chỉ là CẢNH BÁO AUTHORING, không chặn runtime;
khi 1 kỹ năng hết thức khả dụng giữa trận, Combat Core Rule #5 đã định
nghĩa fallback: dùng "Đánh thường" (bậc riêng, tự động "đã học" theo mọi
`weapon_type`) — và tại đây làm rõ dứt điểm: **"Đánh thường" được MIỄN
TRỪ hoàn toàn khỏi `max_invocations_per_battle` và khỏi quy tắc
không-lặp-thức** (số lần dùng không giới hạn), đúng nguyên văn "không
chặn hành động" của Equipment GDD.

---

**D.13 — Điểm Chỉ số & Tỉ lệ ước tính Lực chiến trước trận**

```
Điểm_Chỉ_Số(C) = w_HP·HP + w_ATK·ATK + w_DEF·DEF + w_SPD·SPD + w_ACC·ACC + w_Né·Né
                + w_CR·(CritRate·100) + w_CD·((CritDamage-1)·100)
                + w_AMP·(Amp·100) + w_MIT·(Mitigation·100)
                + w_LSTL·(Lifesteal·100) + w_REGEN·(HPRegen·100)

Lực_chiến(C) = Điểm_Chỉ_Số(C) + Điểm_Kỹ_Năng(C) + Điểm_Trang_Bị(C)

estimate_ratio(self, opponent):
  if Lực_chiến(self) == 0 AND Lực_chiến(opponent) == 0:  return "N/A"
  if Lực_chiến(opponent) == 0:                            return "+∞"
  else:                                                    return Lực_chiến(self) / Lực_chiến(opponent)
```

| Symbol | Type | Range | Description |
|---|---|---|---|
| `HP, ATK, DEF, SPD, ACC, Né` | float | 0–∞ | Chỉ số GỐC (base), không phải effective — Điểm Chỉ số hiển thị năng lực TIỀM NĂNG, không phải sau áp chế 1 trận cụ thể |
| `CritRate, CritDamage, Amp, Mitigation, Lifesteal, HPRegen` | float | như D.1–D.10 | Nhân ×100 để quy về cùng thang "điểm" với chỉ số phẳng |
| `w_*` | float (knob) | ≥0 | Trọng số từng chỉ số — đề xuất mặc định **1** cho mọi chỉ số TRỪ `w_HP = 0.25`* |
| `Điểm_Kỹ_Năng(C)`, `Điểm_Trang_Bị(C)` | float | 0–∞ (external) | Sở hữu bởi hệ khác (chưa thiết kế) — Combat coi là input mờ, mặc định 0 nếu chưa có |
| `estimate_ratio` | float \| sentinel | `(0,∞)` hoặc `{"N/A","+∞"}` | CHỈ dùng hiển thị ước tính trước trận — **KHÔNG BAO GIỜ dùng để quyết định thắng/thua** (Core Rule #7) |

*`w_HP=0.25` là **placeholder tạm** vì HP thường có thang giá trị lớn
hơn nhiều lần các chỉ số khác trong ví dụ minh họa — trọng số thật cần
đối chiếu lại khi EXP & Realm Progression (chưa thiết kế) định nghĩa
đường cong tăng trưởng chỉ số thật. Cần ghi vào Open Questions.

**Output range**: `estimate_ratio ∈ (0,∞)` bình thường, hoặc sentinel
`"N/A"`/`"+∞"` ở biên. **Đóng trực tiếp test case "Lực chiến 0/0"**: khi
cả 2 bên Lực chiến = 0 (VD 2 NPC/nhân vật chưa gán chỉ số nào), trả về
`"N/A"` — không hiển thị `1.0` giả tạo (tránh ngộ nhận "ngang sức" khi
thực chất chưa đủ dữ liệu so sánh), theo đúng tiền lệ sentinel `"N/A"`
đã dùng ở `session_violation_count` (registry).

**Ví dụ thường**: `Điểm_Chỉ_Số(self)=310`,
`Điểm_Kỹ_Năng=Điểm_Trang_Bị=0` (chưa thiết kế) → `Lực_chiến(self)=310`;
đối thủ `Lực_chiến=250` → `estimate_ratio=1.24` → hiển thị "nhỉnh hơn
~24%".

**Ví dụ 0/0**: NPC vừa khởi tạo (toàn bộ 12 chỉ số = 0, chưa học kỹ
năng/trang bị) đối đầu 1 NPC khác cùng trạng thái → cả 2 `Lực_chiến=0` →
`estimate_ratio="N/A"`.

**Ví dụ 1 bên = 0**: đối thủ `Lực_chiến=0`, self=310 →
`estimate_ratio="+∞"` (không chia 310/0).

---

### Ánh xạ test case biên bắt buộc → Formula

| Test case biên bắt buộc | Formula xử lý | Hành vi cụ thể |
|---|---|---|
| Lực chiến 0/0 | D.13 | `estimate_ratio` trả `"N/A"`, không chia 0/0, không giả định `1.0` |
| Floor khi chồng phạt vượt bậc + áp chế cảnh giới | D.1 | `FLOOR_TOTAL=0.05` chặn tích 2 lớp không về dưới 5%, không bao giờ âm |
| Ngưỡng 20 cấp — bao gồm/loại trừ | D.1 (ghi chú) | Không áp dụng — khác thang đo (cấp≠bậc), thuộc hệ khác; D.1 dùng hàm liên tục nên không có ngưỡng cắt |
| Ngưỡng Hảo cảm -80 — ranh giới phạm vi | Toàn bộ Section D (ghi chú đầu mục) | Không formula nào nhận input Hảo cảm; chỉ xuất `outcome`/`hp_after` cho hệ khác tự quyết |
| ACC/Né 0/0 | D.3 | Hiệu số, không chia → `P_hit=0.5` |
| SPD 0/0 (bỏ chạy) | D.11 | Hiệu số, không chia → `P_flee=0.5` |
| Ngắt sớm giữa pha (quyết định 3B) | D.9 | Nhúng trực tiếp trong nhánh `if hp[second]==0` |

*(Hằng số/knob MỚI do GDD này giới thiệu, chính thức hóa với safe range
đầy đủ ở Tuning Knobs: `PENALTY_PER_TIER`, `FLOOR_LAYER`, `FLOOR_TOTAL`,
`K_HIT`, `P_MIN`, `P_MAX`, `MIN_DMG_MULT`, `K_FLEE`, `P_MIN_FLEE`,
`P_MAX_FLEE`, `MAX_EXCHANGE_COUNT`, `max_invocations_per_battle` (dẫn
xuất, không phải knob độc lập), `w_HP` và các `w_*` khác của D.13.)*

## Edge Cases

*(Lean mode: không bắt buộc spawn specialist — chỉ D và H. Đối chiếu Core
Rules/Formulas vừa viết + Turn Manager's Undo model để đảm bảo nhất
quán.)*

- **Nếu 2 bên "cùng chết" trong 1 pha**: KHÔNG THỂ xảy ra theo thiết kế —
  D.9 giải quyết đòn đi trước HOÀN TOÀN (kể cả kiểm tra HP=0) trước khi
  đòn đi sau bắt đầu tính; nếu đòn đi trước đã hạ đối phương về 0, đòn đi
  sau không thực thi. Nếu implementation cho ra kết quả "song sát", đó là
  bug vi phạm D.9, không phải trường hợp hợp lệ.
- **Nếu đối thủ (NPC) hết thức khả dụng giữa trận** (đã dùng hết
  `known_skill_ids` theo quy tắc không lặp): dùng "Đánh thường" khớp
  `weapon_type` của đối thủ làm phương án dự phòng — đúng Core Rule #5,
  áp dụng đối xứng cho cả người chơi lẫn NPC, không có ngoại lệ nào cho
  đối thủ.
- **Nếu người chơi Undo 1 pha giao đấu đã dùng 1 thức**: thức đó quay
  lại trạng thái "chưa dùng trong trận" (rollback đầy đủ, đúng Turn
  Manager Core Rule #8) — không chỉ hoàn tác HP/kết quả mà cả trạng thái
  "đã dùng thức nào" của Core Rule #5. Xác nhận lại pha đó (RNG re-roll
  thật, đúng Turn Manager AC-12) có thể chọn thức khác hoặc thức cũ, và
  có thể ra kết quả khác hoàn toàn (trúng/hụt/crit khác lần trước).
- **Nếu người chơi Undo pha dùng vật phẩm chiến đấu**: `combat_item_id`
  quay lại trạng thái "chưa dùng trong trận này" — cùng cơ chế rollback
  như thức.
- **Nếu người chơi Undo đúng pha KẾT THÚC trận** (pha có `battle_active`
  chuyển từ true→false): `in_combat` quay lại `true`, `battle_active`
  quay lại `true`, HP hai bên quay về giá trị trước pha đó — trận "sống
  lại", danh sách thức đã dùng KHÔNG bao gồm pha vừa undo. Việc các hệ
  downstream (EXP, Death & Consequence, NPC Affinity) đã tiêu thụ tín
  hiệu hand-off của pha đó trước khi bị undo hay chưa là trách nhiệm của
  CHÍNH các hệ đó tuân thủ Turn Manager Core Rule #8 ("chưa final tới khi
  xác nhận và không undo") — Combat System chỉ đảm bảo trạng thái CỦA
  CHÍNH NÓ (`in_combat`, `battle_active`, HP, thức đã dùng) rollback
  đúng.
- **Nếu Bỏ chạy thành công**: trận kết thúc với tín hiệu hand-off riêng
  biệt `outcome="no_outcome"` (KHÁC `"win"`/`"lose"`) — EXP & Realm
  Progression và Death & Consequence (chưa thiết kế) không được phép
  diễn giải bỏ chạy thành thắng hoặc thua khi tự xử lý hệ quả riêng.
- **Nếu trận chạm trần an toàn `MAX_EXCHANGE_COUNT` (30 pha) mà chưa bên
  nào về 0 HP** (bế tắc do 2 bên quá tanky): trận buộc kết thúc ngay tại
  pha thứ 30 với `outcome="no_outcome"` — xử lý giống hệt Bỏ chạy thành
  công cho cả 2 bên (không phân thắng bại), bất kể %HP còn lại của mỗi
  bên. Đây là van an toàn kỹ thuật (tránh giằng co vô hạn lý thuyết),
  không phải một cơ chế gameplay được thiết kế để người chơi khai thác.
- **Nếu người chơi cố dùng lại 1 thức đã dùng trong trận** (qua input tự
  do, bỏ qua danh sách gợi ý): hệ thống từ chối, không cho hành động đó
  tính là 1 pha hợp lệ — yêu cầu chọn lại (không tính vào lượt đã dùng,
  tương tự Turn Manager Edge Case "lệnh gọi AI thất bại" về mặt không
  tốn 1 lượt).
- **Nếu `combat_item_id` rỗng (không mang vật phẩm)**: hành động "Dùng
  vật phẩm" không xuất hiện trong danh sách gợi ý của pha đó — không
  phải lỗi, chỉ là 1 lựa chọn ít hơn.
- **Nếu người chơi thắng trận nhưng đối thủ không có tên/không phải NPC
  có Hảo cảm theo dõi** (VD quái vật/thú hoang trong tình huống tương
  lai): Combat vẫn phát tín hiệu hand-off `outcome="win"` bình thường —
  việc EXP & Realm Progression có tính EXP khác nhau cho "đối thủ không
  phải NPC" hay không là quyết định của hệ đó, Combat không phân biệt
  loại đối thủ trong formula của mình.

## Dependencies

*(Đối chiếu 2 chiều: cả 4 GDD phụ thuộc đã tồn tại đều liệt kê sẵn Combat
System trong Dependencies của chính họ — KHÔNG có khoảng trống một chiều
nào lần này, khác 5 lần trước trong phiên.)*

**Phụ thuộc vào (upstream)**:
- **Turn Manager** (Foundation, Approved) — **hard**: mỗi pha giao đấu
  là 1 lượt Turn Manager; toàn bộ mô hình Undo/RNG re-roll của Combat kế
  thừa trực tiếp từ Turn Manager Core Rule #8 + AC-12.
- **Equipment & Skill Data System** (Foundation, Approved) — **hard**:
  đọc `known_skill_ids`, `equipped_weapon_id`, thức + `tier` +
  `style_descriptor`; Combat định nghĩa `max_invocations_per_battle` cho
  hệ này (đã đóng AC-11 BLOCKED của GDD đó).
- **AI/LLM Integration Layer** (Core, Designed) — **hard**: mọi
  `narration_call` của Combat đi qua wrapper này, đúng
  `calls_per_turn_max=3`.
- **Mechanic/Narration Contract Enforcement** (Foundation, Approved) —
  **hard**: mọi `locked_result` mỗi pha chịu Numeric Leak Detection;
  Combat không bao giờ đọc lại `narration_text`.

**Các hệ thống phụ thuộc vào Combat** (downstream), kèm giao diện dữ
liệu cụ thể:
- **EXP & Realm Progression** (Feature, chưa thiết kế) — **hard khi
  được thiết kế**: đọc tín hiệu hand-off (`outcome` ∈ {win, lose,
  no_outcome}, HP còn lại, margin) khi `battle_active=false`; tự tính
  EXP — Combat không sở hữu công thức EXP (đã xác nhận phạm vi đầu
  phiên).
- **Death & Consequence** (Feature, chưa thiết kế) — **hard khi được
  thiết kế**: đọc tín hiệu `outcome="lose"` để quyết định mức độ hậu quả
  (kết hợp với ngưỡng Hảo cảm từ NPC Affinity, chưa thiết kế) — Combat
  chỉ báo "đã thua", không tự quyết định mức độ.
- **NPC Affinity & Relationship** (Feature, chưa thiết kế) — **soft**:
  không đọc/ghi trực tiếp qua Combat, nhưng kết quả trận (thắng/thua/
  margin) là input tự nhiên cho các hệ thay đổi Hảo cảm sau trận — giao
  diện cụ thể chưa cố định, để ngỏ khi GDD đó được thiết kế.
- **Situation/Encounter Generation** (Narrative, chưa thiết kế) —
  **soft**: quyết định KHI NÀO 1 tình huống dẫn đến giao chiến (bao gồm
  kiểm tra ngưỡng 20 cấp chênh lệch của `game-concept.md`) — Combat chỉ
  tiêu thụ quyết định "đã vào trận", không tự kiểm tra điều kiện kích
  hoạt.
- **Character Card & Identity** (Presentation, chưa thiết kế) —
  **soft**: sẽ hiển thị "Điểm Chỉ số"/Lực chiến ước tính (Formula D.13)
  trên thẻ nhân vật.

## Tuning Knobs

| Knob | Default | Safe Range | Ảnh hưởng nếu chỉnh |
|---|---|---|---|
| `PENALTY_PER_TIER` | 0.15 | 0.05–0.30 | % giảm chỉ số hiệu dụng mỗi bậc chênh lệch cảnh giới/trang bị (D.1). Quá thấp → áp chế cảnh giới vô nghĩa, phá vỡ premise "mây tầng nào gặp gió tầng nấy"; quá cao → chỉ cần chênh 3-4 bậc là gần như bất khả chiến thắng, giảm động lực thử liều lĩnh có tính toán. |
| `FLOOR_LAYER` | 0.1 | 0.05–0.3 | Sàn multiplier của MỖI lớp phạt riêng (D.1). Quá thấp → 1 lớp phạt đơn lẻ đã gần như vô hiệu hóa chỉ số; quá cao → giảm hiệu quả trần an toàn khi 2 lớp cộng dồn. |
| `FLOOR_TOTAL` | 0.05 | 0.02–0.15 | Sàn multiplier TỔNG sau khi nhân 2 lớp phạt (D.1) — đây là con số trực tiếp giải quyết test case biên "floor khi chồng phạt". Quá thấp → chỉ số hiệu dụng gần như 0 ở chênh lệch cực đoan (mất cảm giác "vẫn có cơ hội dù nhỏ"); quá cao → làm yếu tác dụng răn đe của áp chế cảnh giới. |
| `K_HIT` | 0.01 | 0.005–0.02 | Độ dốc ảnh hưởng của chênh lệch ACC/Né tránh lên xác suất trúng (D.3). Quá thấp → ACC/Né tránh gần như không có tác dụng; quá cao → chênh lệch nhỏ cũng tạo trúng/hụt gần tuyệt đối, mâu thuẫn "không có tuyệt đối". |
| `P_MIN` / `P_MAX` | 0.05 / 0.95 | 0.01–0.10 / 0.90–0.99 | Sàn/trần xác suất trúng đòn (D.3). Nới rộng khoảng này (P_MIN thấp hơn, P_MAX cao hơn) làm tăng tính "chắc chắn" ở 2 cực — cân nhắc kỹ vì đây là nơi trực tiếp thể hiện triết lý "không có gì tuyệt đối" của game. |
| `MIN_DMG_MULT` | 0.1 | 0.05–0.2 | Sàn multiplier sát thương cuối sau Khuếch đại/Chống chịu (D.6). Quá thấp → gần như miễn nhiễm sát thương khả thi với Chống chịu cực cao; quá cao → Chống chịu mất tác dụng phòng thủ thực chất. |
| `K_FLEE` / `P_MIN_FLEE` / `P_MAX_FLEE` | 0.01 / 0.05 / 0.95 | (cùng logic K_HIT/P_MIN/P_MAX) | Xác suất bỏ chạy thành công (D.11) — tune độc lập với trúng/hụt đòn đánh dù cùng công thức hiệu số, vì "né đòn" và "thoát khỏi trận" là 2 quyết định khác bản chất. |
| `MAX_EXCHANGE_COUNT` | 30 | 15–50 | Trần an toàn số pha/trận (D.12, Edge Case bế tắc). Quá thấp → cắt ngang những trận đấu cân sức hợp lý thành "hòa" sớm, mất cảm giác giằng co thật; quá cao → trận đấu giữa 2 bên quá tanky có thể kéo rất dài trước khi hòa, tốn nhiều lệnh gọi AI (mỗi pha = 1 `narration_call`). |
| `w_HP`, `w_ATK`, `w_DEF`, `w_SPD`, `w_ACC`, `w_Né`, `w_CR`, `w_CD`, `w_AMP`, `w_MIT`, `w_LSTL`, `w_REGEN` | `w_HP=0.25`, còn lại =1 | ≥0 | Trọng số "Điểm Chỉ số" (D.13) — CHỈ ảnh hưởng con số ước tính hiển thị trước trận, KHÔNG ảnh hưởng thắng/thua thật (Core Rule #7). `w_HP` thấp hơn hẳn vì thang giá trị HP thường lớn hơn nhiều lần các chỉ số khác — placeholder tạm, cần đối chiếu lại khi EXP & Realm Progression định nghĩa đường cong tăng trưởng chỉ số thật (xem Open Questions). |

*(`max_invocations_per_battle=5` KHÔNG phải tuning knob độc lập — là giá
trị DẪN XUẤT từ `MAX_EXCHANGE_COUNT` và `max_known_skills_per_character`
đã khóa registry, xem Formula D.12.)*

## Visual/Audio Requirements

*(Đề xuất bởi `art-director` — REQUIRED cho category Combat, không được
bỏ qua theo quy tắc skill.)*

### 1. Tín hiệu thị giác cho các sự kiện Combat

Character Card của cả 2 bên là bề mặt hiển thị DUY NHẤT cho kết quả từng
pha (Core Rule #11) — không có hiệu ứng bay số/particle giữa hai nhân
vật kiểu game hành động.

- **Trúng/hụt**: khung "con dấu" quanh ô ATK/DEF liên quan đổi trạng
  thái — trúng: viền đóng dấu rõ nét, mực đậm; hụt: viền mờ/nhạt hơn
  (gợi "đòn trượt" thuần bằng độ đậm nhạt của nét vẽ, không cần icon
  riêng).
- **Chí mạng (crit)**: ô sát thương của pha đó đổi sang khung "con dấu"
  SẮC CẠNH HƠN mức thường + số đậm hơn 1 bậc trọng lượng chữ — vẫn trong
  dải đen-xám, KHÔNG dùng màu accent (crit là biến thiên trong 1 pha,
  không phải hệ quả vĩnh viễn).
- **HP thay đổi**: thanh HP nhảy theo BƯỚC RỜI RẠC đúng giá trị
  `hp_after` (hard cut, không tween mượt) — khớp triết lý "kết quả đã
  khóa trước khi hiển thị".
- **Lifesteal**: số hồi máu "+N" nhỏ cạnh thanh HP người đánh, cập nhật
  cùng nhịp với đòn gây ra nó.
- **Kết thúc trận — 3 outcome, 3 tín hiệu khác nhau rõ rệt**:
  - `win`: khung "con dấu" quanh Character Card bên thắng đóng lại hoàn
    chỉnh, biên rõ — giữ đen-xám (thắng là kết quả cơ học bình thường,
    không "tiêu" khẩu phần màu).
  - `lose` (gồm cả nhánh ngắt sớm D.9): khung "con dấu" chuyển sang viền
    đỏ son mảnh — đây là ranh giới bàn giao cho Death & Consequence:
    Combat chỉ đóng dấu "đã thua", không tự vẽ thêm hệ quả nặng hơn.
  - `no_outcome` (bỏ chạy thành công HOẶC chạm `MAX_EXCHANGE_COUNT`):
    khung "con dấu" của CẢ HAI bên mờ dần rồi biến mất, không đóng hoàn
    chỉnh — tránh người chơi hiểu nhầm 2 trường hợp rất khác nhau này
    thành "thắng nhẹ".
- **Ngắt sớm (kết liễu giữa pha)**: dùng đúng khung `lose` ở trên nhưng
  đóng dấu NGAY LẬP TỨC, tốc độ nhanh hơn hẳn so với kết thúc trận ở
  cuối pha đủ 2 đòn — khác biệt duy nhất là tốc độ, không phải hiệu ứng
  mới.
- **Cảnh báo áp chế cảnh giới trước trận**: khi `estimate_ratio` (D.13)
  bất lợi rõ rệt, số ước tính trên Character Card đổi trọng lượng chữ
  (đậm hơn) — không đổi màu, giữ đúng ranh giới "chỉ tham khảo" (Core
  Rule #7).

### 2. Ràng buộc phong cách hoạt ảnh

- Không có hoạt ảnh nhân vật/combat dưới bất kỳ hình thức nào (đúng
  Anti-Pillar `game-concept.md`) — không sprite tấn công, không particle
  bay giữa 2 nhân vật, không camera shake, không hit-stop.
- Chuyển động cho phép giới hạn ở: (a) đổi trạng thái tĩnh của khung
  "con dấu" (đóng/mờ dần/đổi viền), (b) bước nhảy rời rạc của số liệu,
  (c) hiệu ứng chữ xuất hiện của đoạn văn tường thuật (thuộc UI text
  chung, không riêng Combat).
- Không easing phức tạp (spring, bounce) cho số liệu — mọi thay đổi số
  là hard cut hoặc fade tối đa 150–200ms.
- Ngoại lệ tốc độ duy nhất: đóng dấu nhanh hơn khi ngắt sớm (mục 1) —
  vẫn là hiệu ứng tĩnh sẵn có, chỉ khác tốc độ.

### 3. Nguyên tắc Art Bible áp dụng (theo Visual Identity Anchor "Mực
Chưa Khô")

- Nền giấy dó kem/trắng ngà + chữ đen-xám đơn sắc là mặc định cho MỌI
  thành phần Combat UI — không có bảng màu riêng cho "chế độ combat".
- Khung "con dấu" góc cạnh, sắc bén áp dụng cho MỌI số liệu cứng của
  Combat (HP, ATK/DEF hiệu dụng, sát thương, Lực chiến ước tính) — phân
  biệt rõ với khung mực loang hữu cơ dùng cho vùng văn bản tường thuật.
- Đỏ son bị khẩu phần hóa nghiêm ngặt trong phạm vi Combat: CHỈ dùng ở
  khung Character Card bên thua khi `outcome.type="lose"` — không nơi
  nào khác trong Combat UI được dùng đỏ son. Xanh ngọc KHÔNG xuất hiện
  trong Combat System (dành riêng cho đột phá cảnh giới, thuộc EXP &
  Realm Progression).
- Visual hierarchy trên Character Card (mắt nhìn ưu tiên từ cao xuống
  thấp): (1) khung "con dấu" kết thúc trận (khi có) → (2) thanh HP → (3)
  chi tiết trúng/hụt/crit từng pha → (4) Lực chiến ước tính (độ nổi bật
  thấp nhất, đúng Core Rule #7). `ux-designer` nên đối chiếu thứ tự này
  khi thiết kế mục UI Requirements kế tiếp.

### 4. Âm thanh

Đúng phạm vi "tối thiểu" của `game-concept.md` — không có yêu cầu audio
nào BLOCKING cho MVP; toàn mục này ở mức ADVISORY, có thể bỏ qua hoàn
toàn ở bản đầu.

- Nếu bổ sung sau, giới hạn tối đa 2 SFX ngắn (<0.5s, dạng "tick"/"đóng
  dấu"):
  - 1 âm "đóng dấu" dùng chung cho cả 3 outcome kết thúc trận (không
    phân biệt bằng âm thanh — thị giác đã đủ phân biệt, tránh nhân đôi
    kênh tín hiệu).
  - (Tùy chọn, có thể bỏ) 1 âm nhẹ riêng cho chí mạng — chỉ cân nhắc nếu
    playtest cho thấy tín hiệu thị giác bị bỏ lỡ.
- Không đề xuất: nhạc nền combat riêng, SFX cho từng đòn, voice-over,
  ambient loop — vượt quá scope "tối thiểu" và không tương xứng effort
  cho dự án cá nhân.

📌 **Asset Spec** — Visual/Audio requirements đã được định nghĩa. Sau khi
art bible được duyệt, chạy `/asset-spec system:combat-system` để tạo mô
tả hình ảnh chi tiết theo từng asset, kích thước, và prompt sinh ảnh từ
section này.

## UI Requirements

**Không có màn hình chiến đấu riêng biệt**: Combat diễn ra ngay trong
luồng tường thuật chính (cùng màn hình Turn Manager dùng cho mọi lượt
khác) — không chuyển cảnh/màn hình phụ, giữ đúng tinh thần "tiểu thuyết
tương tác liên tục", không phải chuyển sang 1 "chế độ combat" tách biệt.

**Character Card mở rộng khi `in_combat=true`**: thêm 1 khối "Trạng thái
giao đấu" hiển thị: HP hiện tại/HP tối đa của cả 2 bên (thanh HP theo
bước rời rạc — Visual/Audio Requirements), số thứ tự pha hiện tại
(`exchange_id`), và banner kết quả khi trận kết thúc (khung "con dấu" 3
màu theo `outcome.type`, đã đặc tả ở Visual/Audio Requirements). Khối
này biến mất khi `in_combat=false`.

**Danh sách hành động mỗi pha tái sử dụng UI gợi ý sẵn có của Turn
Manager**: tối đa 4 lựa chọn (thức khả dụng ưu tiên trước, sau đó phòng
thủ/vật phẩm/bỏ chạy nếu còn chỗ) + ô nhập tự do — không cần UI riêng,
chỉ cần Combat cung cấp đúng danh sách hành động hợp lệ cho UI đã có của
Turn Manager render.

**Ước tính Lực chiến trước trận (Formula D.13)** hiển thị trên Character
Card ở trạng thái `in_combat=false` (trước khi giao chiến) — độ nổi bật
thấp nhất trong visual hierarchy (theo `art-director` đã chốt), rõ ràng
đây là thông tin tham khảo, không phải kết quả đã khóa.

📌 **UX Flag — Combat System**: Hệ này có yêu cầu UI thật (mở rộng
Character Card + tái sử dụng UI gợi ý hành động của Turn Manager). Ở
Phase 4 (Pre-Production), chạy `/ux-design` để tạo UX spec cho khối
"Trạng thái giao đấu" trên Character Card **trước khi** viết epic —
story tham chiếu UI nên trích `design/ux/character-card.md` (khi được
tạo), không trích thẳng GDD này.

## Acceptance Criteria

*(Đề xuất bởi `qa-lead`. Mọi AC đánh dấu **Logic** hoặc **Integration**
là BLOCKING theo `coding-standards.md` — phải có test tự động pass
trước khi story liên quan được Done. Test dùng RNG/roll đã mock ở giá
trị cố định (Determinism) — không dựa vào xác suất thật không seed.)*

### Core Rules

**AC-01** (Rule #1 — `in_combat` duy trì xuyên suốt nhiều lượt): GIVEN 1
hành động kích hoạt giao chiến ở lượt Turn Manager T, WHEN trận chưa kết
thúc (`battle_active=true`) qua các lượt T, T+1, T+2, THEN `in_combat=true`
giữ nguyên liên tục ở cả 3 lượt, chỉ chuyển `false` ở lượt mà
`battle_active` chuyển `false`. *(Integration test.)*

**AC-02** (Rule #2 — hành động NPC là logic hệ thống, không phải LLM):
GIVEN đến bước chọn hành động của NPC trong 1 pha, WHEN hệ thống chạy
thuật toán chọn thức đối thủ, THEN `narration_call` KHÔNG được gọi ở
bước này (spy đếm = 0); chỉ đúng 1 `narration_call` xảy ra SAU KHI pha
đã resolve xong. *(Integration test, spy trên `narration_call`.)*

**AC-03** (Rule #4 — phạt vượt bậc tính lại MỖI pha, không cache): GIVEN
cùng 1 nhân vật dùng thức tier=2 ở pha 1 và thức tier=4 ở pha 3 trong
CÙNG 1 trận, WHEN `effective_stat` được tính ở mỗi pha, THEN `gap_gear`
(và do đó `effective_ATK`) khác nhau đúng theo `skill_tier_used` của pha
đó — giá trị pha 3 KHÔNG bằng giá trị đã cache từ pha 1. *(Logic test.)*

**AC-04** (Rule #5 — không lặp thức tính trên TOÀN TRẬN): GIVEN thức X
đã dùng ở pha 1 của trận hiện tại, WHEN nhân vật cố dùng thức X lại ở
pha 5 CÙNG trận, THEN thức X không nằm trong danh sách hành động khả
dụng của pha 5. *(Logic test.)*

**AC-05** (Rule #5 — fallback "Đánh thường" khi hết thức): GIVEN toàn bộ
`known_skill_ids` khả dụng đã dùng hết trong trận, WHEN nhân vật (người
chơi HOẶC NPC) cần chọn hành động, THEN "Đánh thường" xuất hiện trong
danh sách gợi ý và có thể chọn được, hành động KHÔNG bị chặn. *(Logic
test.)*

**AC-06** (Rule #6 — vật phẩm chiến đấu dùng đúng 1 lần/trận): GIVEN
`combat_item_id` đã dùng ở pha 2, WHEN nhân vật cố dùng lại "Dùng vật
phẩm" ở pha 4 cùng trận, THEN hành động đó không khả dụng; reset về
"chưa dùng" chỉ xảy ra khi bắt đầu TRẬN MỚI, không tự động hết trận cũ.
*(Logic test.)*

**AC-07** (Rule #7 — Lực chiến/`estimate_ratio` KHÔNG quyết định
thắng/thua): GIVEN 2 lần gọi `resolve_exchange` với `effective_stat`
giống hệt nhau nhưng `w_*` (D.13) hoặc `Điểm_Kỹ_Năng`/`Điểm_Trang_Bị`
khác nhau, WHEN so sánh outcome/HP trả về, THEN kết quả `resolve_exchange`
giống hệt nhau tuyệt đối — thay đổi trọng số D.13 không làm thay đổi bất
kỳ output nào của D.2–D.10. *(Logic test, architecture-contract.)*

**AC-08** (Rule #8 — không có kết quả hòa/null): GIVEN các nhánh kết
thúc trận có thể xảy ra: HP=0, bỏ chạy thành công, chạm trần
`MAX_EXCHANGE_COUNT`, WHEN duyệt hết cả 3 nhánh bằng test riêng, THEN
`outcome` luôn nhận đúng 1 trong 3 giá trị `{"win","lose","no_outcome"}`
— không bao giờ `null`/`undefined`/hòa. *(Logic test tổng hợp 3 kịch
bản.)*

**AC-09** (Rule #11 — `locked_result` đủ field + không rò số ra
`narration_text`): GIVEN 1 pha đã resolve xong, WHEN kiểm tra
`locked_result`, THEN chứa đủ `attacker_id`, `defender_id`, `thuc_id`
mỗi bên, `hit`/`crit`/`dodge` flags, `damage_dealt` mỗi bên, `hp_after`
mỗi bên, `battle_active`; VÀ `narration_text` tương ứng không chứa số
nguyên/số thập phân trần trụi nào của các field trên. *(Integration test
với Contract Enforcement.)*

**AC-10** (Rule #12 — tín hiệu hand-off phát ĐÚNG 1 LẦN, chỉ ở pha kết
thúc): GIVEN 1 trận kéo dài 4 pha, kết thúc ở pha 4, WHEN theo dõi sự
kiện hand-off qua cả 4 pha, THEN sự kiện chỉ phát sinh đúng 1 lần, tại
pha 4; các pha 1–3 không phát tín hiệu này. *(Integration test.)*

**AC-11** (Interactions — giới hạn gợi ý hành động cho Turn Manager):
GIVEN nhân vật còn ≥5 lựa chọn hợp lệ, WHEN Combat build danh sách gợi ý
cho Turn Manager, THEN danh sách bị cắt còn tối đa 4 mục
(`suggested_action_count=4`). *(Integration test.)*

### Formulas (D.1–D.13)

**AC-12** (D.1 — chỉ số hiệu dụng, ca thường): GIVEN `tier(C)=3`,
`tier(đối thủ)=6`, `weapon_tier(C)=5`, `skill_tier_used(C)=4`,
`base_ATK=50`, WHEN tính `effective_stat`, THEN `gap_realm=3`,
`gap_gear=2`, `layer_mult` lần lượt `0.55`/`0.7`, `total=0.385`,
`effective_ATK=19.25` (đúng ví dụ trong GDD). *(Logic test.)*

**AC-13** (D.1 — boundary "floor khi chồng phạt"): GIVEN `gap_realm=10`,
`gap_gear=10`, WHEN tính `total_penalty_multiplier`, THEN mỗi lớp floor
ở `0.1`, tích `0.01` bị `clamp` lên đúng `FLOOR_TOTAL=0.05` (không phải
`0.01`), `effective_ATK=2.5`; VÀ chạy thêm test tham số hóa (nhiều tổ
hợp `gap` cực đoan khác nhau, `base_X>0`) khẳng định `effective_stat`
không bao giờ âm và không bao giờ về đúng 0. *(Logic test tham số hóa.)*

**AC-14** (D.2 — thứ tự ra đòn, ca thường): GIVEN
`effective_SPD(player)=32.5`, `effective_SPD(npc)=40`, WHEN gọi
`first(A,B)`, THEN `first=npc, second=player`. *(Logic test.)*

**AC-15** (D.2 — boundary hòa SPD tuyệt đối): GIVEN `effective_SPD(A) =
effective_SPD(B) = 40.0` chính xác, cùng `exchange_id` cố định, WHEN gọi
`coin_flip(seed=exchange_id)` nhiều lần với cùng seed, THEN kết quả
`first/second` GIỐNG NHAU mọi lần gọi (deterministic theo seed). *(Logic
test — xem Open Questions về định nghĩa `exchange_id`.)*

**AC-16** (D.3 — trúng/hụt, ca thường): GIVEN `effective_ACC=45.2`,
`effective_Né=38.0`, roll mock `=0.4`, WHEN tính `P_hit` và `hit`, THEN
`P_hit=0.572`, `hit=true`. *(Logic test.)*

**AC-17** (D.3 — boundary ACC/Né 0/0): GIVEN `effective_ACC =
effective_Né = 0`, WHEN tính `P_hit`, THEN `P_hit=0.5` chính xác, không
có exception/phép chia nào xảy ra. *(Logic test.)*

**AC-18** (D.4 — sát thương cơ bản, boundary "đấm vào tường"): GIVEN
`effective_ATK=19.25`, `effective_DEF=22`, `hit=true`, WHEN tính
`raw_damage`, THEN `raw_damage=0` (floor tại 0), pha vẫn ghi nhận
`hit=true` nhưng `damage=0`. *(Logic test.)*

**AC-19** (D.5 — chí mạng): GIVEN `effective_CritRate=0.18`, roll mock
`=0.05`, `effective_CritDamage=1.6`, WHEN tính `is_crit`/`crit_multiplier`,
THEN `is_crit=true`, `crit_multiplier=1.6`; VÀ với `effective_CritDamage`
giả định <1.0, `crit_multiplier` vẫn floor ở `1.0`. *(Logic test.)*

**AC-20** (D.6 — sát thương cuối, ca thường): GIVEN `raw_damage=30`,
`crit_multiplier=1.6`, `effective_Amp=0.1`, `effective_Mitigation=0.15`,
WHEN tính `final_damage`, THEN `final_multiplier=0.935`,
`final_damage=45`. *(Logic test.)*

**AC-21** (D.6 — boundary `MIN_DMG_MULT`): GIVEN `effective_Mitigation`
cực đoan (VD 5.0), `raw_damage>0`, WHEN tính `final_multiplier`, THEN bị
`clamp` ở đúng `MIN_DMG_MULT=0.1`, `final_damage` luôn >0 khi
`raw_damage>0`. *(Logic test.)*

**AC-22** (D.6 — boundary `raw_damage=0` → `final_damage=0` bất kể
multiplier): GIVEN `raw_damage=0`, `crit_multiplier` và
`final_multiplier` bất kỳ giá trị hợp lệ nào, WHEN tính `final_damage`,
THEN `final_damage=0` tuyệt đối. *(Logic test.)*

**AC-23** (D.7 — lifesteal, ca thường + boundary overheal): GIVEN
`final_damage=45`, `effective_Lifesteal=0.1`, `hp(attacker)=195`,
`max_HP(attacker)=200`, WHEN tính `heal_attacker`/`hp'(attacker)`, THEN
`heal=5`, `hp'=200` (clamp đúng `max_HP`); VÀ với `final_damage=0`,
`heal_attacker=0` tự động. *(Logic test.)*

**AC-24** (D.8 — miss short-circuit): GIVEN `hit=false`, WHEN gọi
`resolve_attack`, THEN trả về đúng `{hit:false, crit:false, damage:0,
heal:0, hp_defender_after: hp_defender KHÔNG ĐỔI}` — D.4 đến D.7 không
được gọi (spy đếm = 0). *(Logic test, spy trên D.4–D.7.)*

**AC-25** (D.9 — ca thường, không ngắt sớm): GIVEN các giá trị đúng Ví
dụ 1 của GDD (NPC đi trước, `final_damage=45`, HP player 50→5; player
đòn 2 trúng `final_damage=30`, HP npc 40→10), WHEN gọi `resolve_exchange`,
THEN cả `r1` và `r2` đều `executed`, `battle_active=true`, D.10 được áp
dụng cho CẢ HAI bên sau đó. *(Logic test.)*

**AC-26** (D.9 — boundary ngắt sớm, quyết định kiến trúc trung tâm):
GIVEN NPC đi trước, `final_damage=60` làm HP player 50→0, WHEN gọi
`resolve_exchange`, THEN `r2.executed=false`, `r2.hit=null` (không phải
`false`), `battle_active=false`, `outcome` xác định đúng người thắng/thua;
D.10 KHÔNG được gọi ở pha này (spy = 0). *(Logic test, spy trên D.10.)*

**AC-27** (D.9 — chứng minh "cùng chết trong 1 pha" KHÔNG THỂ xảy ra):
GIVEN một ma trận ≥10 tổ hợp stat/roll khác nhau (deterministic, mock
đầy đủ) mà đòn đi trước hạ `hp[second]` về đúng 0, WHEN chạy
`resolve_exchange` trên TOÀN BỘ ma trận, THEN với MỌI tổ hợp,
`r2.executed` luôn là `false` — không tồn tại trường hợp nào mà
`hp[A]==0 AND hp[B]==0` cùng lúc. *(Logic test tham số hóa — đóng Edge
Case "cùng chết", không cần AC riêng ở mục Edge Cases.)*

**AC-28** (D.10 — HP Regen, ca thường + boundary overheal): GIVEN
`max_HP=200`, `effective_HPRegen=0.05`, `hp=150`, WHEN D.10 chạy (chỉ
khi `battle_active=true`), THEN `hp'=160`; VÀ với `hp=195`,
`hp'=min(200,205)=200`. *(Logic test.)*

**AC-29** (D.11 — boundary SPD 0/0): GIVEN `effective_SPD(fleeing) =
effective_SPD(opponent) = 0`, WHEN tính `P_flee`, THEN `P_flee=0.5`
chính xác, không exception. *(Logic test.)*

**AC-30** (D.11 — bỏ chạy thất bại, tương tác với D.9): GIVEN
`flee_success=false`, WHEN pha giao đấu được giải quyết, THEN
`first=opponent` (chỉ đối thủ ra đòn), bên bỏ chạy KHÔNG thực hiện đòn
tấn công ở pha đó. *(Logic test.)*

**AC-31** (D.12 — dẫn xuất `max_invocations_per_battle` +
`is_pool_sufficient`): GIVEN `MAX_EXCHANGE_COUNT=30`,
`max_known_skills_per_character=6`, WHEN tính
`max_invocations_per_battle`, THEN kết quả = `ceil(30/6) = 5` chính xác;
VÀ với 1 kỹ năng author ở `min_thuc_per_skill=3` (LOCKED),
`is_pool_sufficient(skill) = (3>=5) = false` — coi là CẢNH BÁO
AUTHORING, không phải lỗi chặn build. *(Logic test, arithmetic thuần.)*

**AC-32** (D.12 — "Đánh thường" miễn trừ quy tắc không lặp thức,
RUNTIME): GIVEN nhân vật đã dùng "Đánh thường" ở pha 1 CÙNG trận, WHEN
nhân vật chọn "Đánh thường" lại ở pha 3, THEN hành động được CHẤP NHẬN
bình thường (khác AC-42 dành cho thức thường bị từ chối khi lặp).
*(Logic test.)*

**AC-33** (D.13 — ước tính Lực chiến, ca thường): GIVEN
`Điểm_Chỉ_Số(self)=310`, `Điểm_Kỹ_Năng=Điểm_Trang_Bị=0`, đối thủ
`Lực_chiến=250`, WHEN gọi `estimate_ratio`, THEN kết quả `=1.24`.
*(Logic test.)*

**AC-34** (D.13 — boundary 0/0): GIVEN `Lực_chiến(self) =
Lực_chiến(opponent) = 0`, WHEN gọi `estimate_ratio`, THEN trả về đúng
sentinel chuỗi `"N/A"` (KHÔNG phải `1.0`, KHÔNG phải `NaN`). *(Logic
test.)*

**AC-35** (D.13 — boundary 1 bên = 0): GIVEN `Lực_chiến(opponent)=0`,
`Lực_chiến(self)=310`, WHEN gọi `estimate_ratio`, THEN trả về đúng
sentinel chuỗi `"+∞"`, không có exception chia-cho-0. *(Logic test.)*

### Edge Cases

**AC-36** (NPC hết thức, fallback đối xứng): GIVEN NPC đã dùng hết
`known_skill_ids` hợp lệ giữa trận, WHEN đến lượt NPC chọn hành động,
THEN "Đánh thường" khớp `weapon_type` của NPC được tự động chọn làm dự
phòng — hành vi giống hệt đường dẫn code dùng cho người chơi. *(Integration
test.)*

**AC-37** (Undo pha dùng thức): GIVEN pha đã dùng thức X, sau đó bị
Undo, WHEN kiểm tra danh sách thức "đã dùng trong trận", THEN thức X
quay lại "chưa dùng"; VÀ khi xác nhận lại pha đó, roll là RNG re-roll
THẬT (giá trị mock lần 2 khác lần 1 → kết quả có thể khác). *(Integration
test, Turn Manager Undo + Combat.)*

**AC-38** (Undo pha dùng vật phẩm): GIVEN pha đã dùng `combat_item_id`,
sau đó bị Undo, WHEN kiểm tra trạng thái vật phẩm, THEN `combat_item_id`
quay lại "chưa dùng trong trận này". *(Integration test.)*

**AC-39** (Undo đúng pha KẾT THÚC trận): GIVEN pha N có `battle_active`
chuyển `true→false`, sau đó bị Undo, WHEN Undo thực thi, THEN
`in_combat=true`, `battle_active=true`, HP hai bên quay về giá trị TRƯỚC
pha N, pha N không còn nằm trong danh sách thức đã dùng. *(Integration
test.)*

**AC-40** (bỏ chạy thành công → `no_outcome`): GIVEN `flee_success=true`,
WHEN trận kết thúc, THEN `outcome="no_outcome"` (KHÁC `"win"`/`"lose"`),
`battle_active=false`. *(Logic test.)*

**AC-41** (chạm trần `MAX_EXCHANGE_COUNT`): GIVEN 30 pha đã diễn ra liên
tiếp mà chưa bên nào HP=0, WHEN pha thứ 30 kết thúc, THEN trận buộc kết
thúc ngay với `outcome="no_outcome"` cho CẢ HAI bên, bất kể %HP còn lại.
*(Logic test — xem Open Questions về định nghĩa bộ đếm pha.)*

**AC-42** (dùng lại thức đã dùng qua input tự do): GIVEN thức X đã nằm
trong danh sách "đã dùng trong trận", WHEN người chơi cố chọn thức X qua
input tự do (bỏ qua gợi ý UI), THEN hành động bị từ chối, KHÔNG tính là
1 pha hợp lệ. *(Logic test.)*

**AC-43** (`combat_item_id` rỗng): GIVEN `combat_item_id` rỗng/null,
WHEN Combat build danh sách hành động gợi ý cho pha đó, THEN "Dùng vật
phẩm" KHÔNG xuất hiện trong danh sách. *(Logic test.)*

**AC-44** (thắng đối thủ không có Hảo cảm theo dõi): GIVEN đối thủ chiến
thắng không phải NPC có Hảo cảm theo dõi, WHEN trận kết thúc với
`outcome="win"`, THEN Combat vẫn phát tín hiệu hand-off đầy đủ giống mọi
trường hợp khác — không có nhánh rẽ logic riêng theo loại đối thủ.
*(Logic test.)*

**AC-45** (Ranh giới phạm vi — Hảo cảm & ngưỡng 20 cấp KHÔNG phải input
của Combat): GIVEN toàn bộ formula D.1–D.13, WHEN rà soát chữ ký hàm /
chạy test tích hợp thay đổi giá trị Hảo cảm giả lập, THEN không formula
nào nhận Hảo cảm hoặc "ngưỡng 20 cấp" làm input trực tiếp; thay đổi Hảo
cảm không làm thay đổi bất kỳ output nào của `resolve_exchange` khi
`effective_stat` giữ nguyên. *(Logic test, architecture-contract.)*

## Open Questions

- **Thuật toán chọn thức của đối thủ (NPC) chưa được định nghĩa cụ thể**
  — Core Rule #2 hứa hẹn chi tiết ở Tuning Knobs nhưng Section G hiện
  KHÔNG có knob nào cho việc này. Cần một quyết định: random có trọng số
  theo mức nguy hiểm của thức, ưu tiên thức mạnh khi HP thấp, hay đơn
  giản là random đều trong các thức khả dụng? *(Owner: game-designer +
  systems-designer, target: trước khi GDD này qua `/design-review`)*
- **Schema đầy đủ của vật phẩm chiến đấu** (`combat_item_id` trỏ tới gì,
  hiệu ứng cụ thể — hồi máu bao nhiêu? buff gì?) chưa định nghĩa — Core
  Rule #6 chỉ chốt đây là khái niệm tối giản (1 slot/trận), không phải
  toàn bộ schema nội dung. *(Owner: game-designer, target: trước khi
  author content thật, có thể gộp vào ADR/Vertical Slice)*
- **`Điểm_Kỹ_Năng(C)` và `Điểm_Trang_Bị(C)` (Formula D.13) chưa có công
  thức, chỉ là input mờ mặc định 0** — hệ nào sở hữu công thức này
  (Combat tự định nghĩa, hay Equipment & Skill Data System mở rộng phạm
  vi) chưa chốt. *(Owner: systems-designer, target: khi `estimate_ratio`
  cần chính xác hơn placeholder, không chặn MVP vì không ảnh hưởng
  thắng/thua thật)*
- **Trọng số `w_*` của Điểm Chỉ số (D.13, đặc biệt `w_HP=0.25`) là
  placeholder tạm** — cần đối chiếu lại khi EXP & Realm Progression (chưa
  thiết kế) định nghĩa đường cong tăng trưởng chỉ số thật. *(Owner:
  systems-designer, target: `/design-system exp-realm-progression`)*
- **`exchange_id` — đã chốt trong Core Rule #1** (bộ đếm per-battle,
  reset mỗi trận mới) — không còn là open question, ghi nhận ở đây để
  xác nhận đã đóng gap do `qa-lead` phát hiện.
- **Schema `outcome` — đã chốt trong Core Rule #11** (`{type, winner_id,
  loser_id}` thống nhất cho mọi nhánh kết thúc trận) — không còn là open
  question, đóng gap thứ 2 do `qa-lead` phát hiện.
- **`max_invocations_per_battle` không có cơ chế enforcement runtime —
  xác nhận đây là ĐÚNG THIẾT KẾ, không phải gap**: hằng số này chỉ phục
  vụ content-authoring (`is_pool_sufficient`), giới hạn thật chặn runtime
  là quy tắc không-lặp-thức (Core Rule #5) đã tự nhiên giới hạn qua
  `thuc_count` của từng kỹ năng. Ghi nhận theo `qa-lead` để tránh nhầm
  lẫn sau này.
