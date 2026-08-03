# NPC Affinity & Relationship

> **Status**: Designed — Pending Review
> **Author**: user + agents
> **Last Updated**: 2026-08-03
> **Implements Pillar**: Pillar 1 (Thế Giới Khách Quan), Pillar 2 (Hệ Quả Thực Sự); phục vụ trực tiếp aesthetic Fellowship & nhu cầu Relatedness

## Overview

**NPC Affinity & Relationship** là hệ thống sở hữu và quản lý **Hảo cảm** —
thước đo thái độ của từng NPC quan trọng đối với nhân vật chính, trên thang
**-100 → +100** — cùng các quan hệ phái sinh từ nó (quan hệ Song Tu, thù
địch sâu sắc, lan truyền xã hội). Với người chơi, đây là một **tài nguyên
chiến lược có hậu quả thật**, không chỉ là cảm xúc trang trí: Hảo cảm cao
mở khóa quan hệ Song Tu (nguồn EXP bonus và mạch truyện thân mật), Hảo cảm
chạm ngưỡng thù địch sâu sắc (-100 đến -80) biến một trận thua thành nguy
cơ chết thật sự — vĩnh viễn, không cứu vãn. Mỗi hành động của người chơi
với một NPC không chỉ thay đổi thái độ của riêng NPC đó: khi có xung đột
nghiêm trọng, hệ quả **lan truyền qua mạng quan hệ xã hội** — những NPC
quen biết nạn nhân cũng thay đổi thái độ, đúng tinh thần Pillar 1 (Thế Giới
Khách Quan: NPC phản ứng theo logic và lợi ích riêng của họ, không xoay
quanh nhân vật chính).

Về mặt kiến trúc, hệ này là **nguồn dữ liệu Hảo cảm duy nhất** (single
source of truth) cho toàn bộ các hệ tiêu thụ: Death & Consequence đọc
ngưỡng thù địch sâu sắc để quyết định mức hậu quả khi thua trận; EXP &
Realm Progression đọc trạng thái "quan hệ Song Tu active" cho nguồn EXP #4;
Character Card hiển thị Hảo cảm và nút Song Tu; Situation/Encounter
Generation dùng thái độ NPC để tạo tình huống. Mọi thay đổi Hảo cảm tuân
thủ Khế Ước Cơ Học/Tường Thuật: hệ thống tính và khóa delta trước, AI chỉ
tường thuật lại — và tuân thủ vòng đời lượt của Turn Manager (delta chỉ
"final" khi lượt được xác nhận và không bị undo).

## Player Fantasy

*(`creative-director` không được tham vấn — Lean mode, không phải section
rủi ro cao theo quy tắc skill. Review thủ công trước production nếu cần.)*

Người chơi trải nghiệm hệ này ở **cả hai tầng**. **Trực tiếp**: Hảo cảm là
con số thật trên Character Card — người chơi theo dõi nó như một tài nguyên
chiến lược, cân nhắc từng ngưỡng (còn bao xa đến Song Tu? NPC này đã gần
thù địch sâu sắc chưa?), và chủ động quyết định đầu tư vào ai, làm mất lòng
ai. **Gián tiếp**: NPC đối xử khác đi trong tường thuật mà không cần con số
nào được nhắc đến — một NPC quý mến chủ động chia sẻ tin tức, một NPC ghét
cay đắng nói kháy giữa đám đông, một NPC nghe tin đồn về việc người chơi đã
làm với bạn của họ và lạnh nhạt hẳn đi dù chưa từng bị đối xử tệ trực tiếp.

Cảm xúc mỏ neo là **sự công nhận xứng đáng**: trong một thế giới không
thiên vị nhân vật chính (Pillar 1), thiện cảm của một NPC là thứ KIẾM ĐƯỢC
bằng hành động thật — không NPC nào bị kịch bản ép phải thích người chơi,
nên khi họ thích, tình cảm đó có ý nghĩa thật. Khoảnh khắc neo: *NPC từng
lạnh nhạt nay chủ động đứng về phía người chơi trong một xung đột — và
người chơi biết chính xác mình đã làm gì để xứng đáng với điều đó.*

Mặt tối cùng sức nặng: **thù hận là chuyện nghiêm túc**. Gây thù không
phải một thanh đo tụt xuống rồi thôi — thù địch sâu sắc (-100 đến -80)
nghĩa là NPC đó thật sự muốn người chơi chết, và một trận thua trước họ có
thể là kết thúc vĩnh viễn. Thù hận còn lan: hại một người là mang tiếng
với cả vòng quan hệ của họ — không có "free kill" nào sạch sẽ.

Cuối cùng, quan hệ là **khoản đầu tư dài hạn**: Hảo cảm tích lũy qua nhiều
phiên chơi, không thể cày nhanh, mất đi không dễ lấy lại (Pillar 2: Hệ Quả
Thực Sự — Retention Hook "Investment" của game-concept). Đây là "hệ thống
người chơi yêu thích tương tác" chứ không phải hạ tầng vô hình — nhưng nó
chỉ giữ được sức nặng chừng nào con số không bao giờ nói dối: mọi thay đổi
đều do hệ thống tính và khóa, AI chỉ kể lại.

## Detailed Design

### Core Rules

1. **Chủ quyền dữ liệu**: Hệ này là nguồn duy nhất (single source of
   truth) của **Hảo cảm NPC → nhân vật chính**: số nguyên trên thang
   **[-100, +100]**, mỗi NPC quan trọng có đúng 1 giá trị. Giá trị khởi
   đầu định nghĩa trong data NPC (MVP: 3 NPC — 1 thù địch, 1 hảo cảm
   preset ≥ +60 làm dev seed Song Tu, 1 trung lập, theo `game-concept.md`
   Required for MVP #3).
2. **Delta chỉ đến từ sự kiện đã phân loại** — hệ này KHÔNG diễn giải
   hành động tự do. Hai nguồn sự kiện: (a) **sự kiện cơ học cứng** tự
   phát từ hệ khác (kết quả trận đấu qua hand-off của Combat, cái chết
   qua Death & Consequence, hành động Song Tu); (b) **sự kiện xã hội đã
   phân loại** (tặng quà, giúp đỡ, cứu mạng, xúc phạm, phản bội, đe
   dọa...) do Situation/Encounter Generation phân loại từ hành động
   người chơi (**interface provisional** — hệ đó chưa thiết kế). Hệ này
   chỉ sở hữu bảng ánh xạ **loại sự kiện → delta cơ bản** (Formulas D.1)
   — không tốn AI call, không vi phạm Khế Ước.
3. **Hiệu suất giảm dần, không decay**: delta dương giảm hiệu lực khi
   Hảo cảm càng gần +100 (diminishing returns, D.2); lặp CÙNG loại sự
   kiện tích cực với cùng NPC trong các lượt liên tiếp bị giảm hiệu lực
   thêm (repetition fatigue, D.3); tổng delta dương cho 1 NPC trong 1
   lượt bị cap (D.4). KHÔNG có decay theo thời gian — Hảo cảm không tự
   tụt khi không tương tác (thế giới chỉ trôi theo lượt; decay theo lượt
   sẽ phạt chính người đang chơi). Delta âm KHÔNG bị diminishing returns
   — làm mất lòng luôn dễ hơn lấy lòng.
4. **Lan truyền xã hội — chỉ khi có nhân chứng hoặc thủ phạm bị biết**:
   mỗi cặp NPC có `link_strength ∈ [-1.0, +1.0]` tĩnh (định nghĩa trong
   data NPC). Khi một sự kiện đạt ngưỡng nghiêm trọng (severity ≥
   `PROPAGATION_SEVERITY_MIN`) VÀ **thủ phạm được biết** (có nhân chứng
   trong cảnh, hoặc chính nạn nhân còn sống kể lại), delta lan sang các
   NPC có link với nạn nhân theo D.5, cộng thêm một thành phần "tiếng
   tăm tàn nhẫn" nhỏ áp cho mọi NPC biết tin. Sự kiện nghiêm trọng
   **không nhân chứng** (nạn nhân chết, không NPC nào khác trong cảnh):
   KHÔNG có lan truyền Hảo cảm — thế giới vẫn ghi nhận sự kiện "nạn
   nhân đã chết" vào World Memory (NPC biết TIN nhưng không biết THỦ
   PHẠM, tường thuật có thể nhắc đến cái chết bí ẩn), thủ phạm ẩn danh
   là một chiến lược hợp lệ của thế giới khách quan. Danh sách nhân
   chứng = các NPC trong `entities_in_scope` của cảnh (nguồn: Situation
   Gen, provisional).
5. **Ngưỡng thù địch sâu sắc — bao gồm cận biên**: trạng thái "thù địch
   sâu sắc" ⇔ `affinity ≤ -80` (BAO GỒM -80; đóng câu hỏi tính bao
   gồm/loại trừ từ review log của game-concept). Đây là cờ mà Death &
   Consequence đọc để quyết định nguy cơ chết thật khi thua trận.
6. **Song Tu — hành động lặp lại được (đa NPC)**: nút Song Tu hiển thị
   trên Character Card của NPC khi `affinity ≥ +60` (`SONG_TU_THRESHOLD`,
   BAO GỒM +60) và bấm được **bất cứ lúc nào** còn đủ điều kiện — mỗi
   lần bấm là MỘT hành động Song Tu, tốn 1 lượt qua Turn Manager như mọi
   hành động khác. Hiệu ứng mỗi lần: Hảo cảm NPC đó **+ngẫu nhiên 1–10
   điểm** (số nguyên, phân phối đều, clamp +100; là RNG source nên undo
   rồi làm lại có thể ra kết quả khác — đúng tiền lệ Turn Manager
   AC-12). Delta Song Tu được **miễn trừ** diminishing
   returns/repetition fatigue/cap lượt (D.2–D.4) vì đã có chi phí cố
   định 1 lượt + điều kiện ngưỡng cao. Lần Song Tu ĐẦU TIÊN với một NPC
   thiết lập **"quan hệ Song Tu active"** (trạng thái bền — nguồn EXP #4
   của `exp-realm-progression.md`); quan hệ tự hủy khi Hảo cảm NPC đó
   tụt dưới +40 (`SONG_TU_BREAK_THRESHOLD`); tái lập bằng cách thực hiện
   Song Tu lần nữa (đòi hỏi leo lại ≥ +60). **Nhiều NPC có thể có quan
   hệ Song Tu active đồng thời.**
7. **EXP bonus Song Tu KHÔNG cộng dồn theo số NPC**: `SONG_TU_ACTIVE`
   (mà EXP & Realm Progression D.4 tiêu thụ) = 1 khi **tập quan hệ
   active khác rỗng**, bất kể 1 hay nhiều NPC. Lý do: (a) giữ nguyên
   công thức D.4 của `exp-realm-progression.md` (đã Designed) — boolean
   derived, không phải sửa GDD; (b) chặn dominant strategy "cày harem để
   nhân EXP" — nhiều quan hệ Song Tu là lựa chọn tường thuật/mạch
   truyện, không phải máy nhân EXP. Interface trả về **danh sách NPC ID
   active** (không phải boolean trần) — EXP đọc "khác rỗng", các hệ
   tường thuật đọc danh sách cụ thể.
8. **Tuân thủ vòng đời lượt**: mọi delta (kể cả lan truyền) được tính và
   khóa trong Resolving, ghi vào `locked_result` dưới dạng field
   `affinity_delta_[npc_id]` (số nguyên, đúng quy ước đặt tên entity_id
   của World Memory) — một sự kiện lan truyền sinh NHIỀU field trong
   cùng 1 `locked_result`, 1 field/NPC bị ảnh hưởng. Delta chỉ "final"
   khi lượt xác nhận và không undo (Turn Manager Core Rule #8); undo
   hoàn tác TOÀN BỘ delta của lượt, gồm cả delta lan truyền và thay đổi
   trạng thái Song Tu.
9. **Clamp trước khóa**: mọi giá trị sau cộng delta được clamp về
   [-100, +100] TRƯỚC khi khóa — `locked_result` không bao giờ chứa giá
   trị ngoài thang, kể cả qua chuỗi lan truyền nhiều NPC (đóng rủi ro
   clamp từ `systems-index.md` High-Risk Systems).

### States and Transitions

Trạng thái quan hệ mỗi NPC gồm 2 tầng độc lập:

**Tầng 1 — Dải thái độ** (suy ra từ Hảo cảm, hiển thị trên Character
Card mục "Thái độ với nhân vật chính"):

| Dải | Khoảng | Ý nghĩa tường thuật |
|---|---|---|
| Thù địch sâu sắc | [-100, -80] | Muốn nhân vật chính chết; thua trận trước họ có nguy cơ chết thật |
| Thù địch | (-80, -40] | Chủ động gây khó dễ, từ chối hợp tác |
| Lạnh nhạt | (-40, -10] | Tránh né, dè chừng |
| Trung lập | (-10, +10) | Không có thái độ đặc biệt |
| Thiện cảm | [+10, +40) | Sẵn lòng giúp việc nhỏ, chia sẻ tin tức |
| Thân thiết | [+40, +80) | Chủ động hỗ trợ, đứng về phía nhân vật chính (nút Song Tu mở từ +60) |
| Tri kỷ | [+80, +100] | Tin tưởng tuyệt đối, có thể hy sinh vì nhân vật chính |

Chuyển dải là hệ quả tự động của giá trị Hảo cảm — không có transition
riêng cần quản lý; dải chỉ là view. (AI nhận DẢI + hướng thay đổi trong
prompt để tường thuật thái độ, không nhận số thô — đúng Contract
Enforcement Core Rule #4.)

**Tầng 2 — Trạng thái Song Tu** (state machine thật, mỗi NPC một
instance):

| State | Điều kiện | Nút Song Tu | Chuyển sang |
|---|---|---|---|
| Locked | `affinity < +60`, chưa có quan hệ active | Ẩn | → Available (khi `affinity ≥ +60`) |
| Available | `affinity ≥ +60`, chưa từng/không còn quan hệ active | Hiện, bấm được | → Active (khi thực hiện Song Tu lần đầu — lượt xác nhận) HOẶC → Locked (nếu tụt `< +60`) |
| Active | Đã có quan hệ Song Tu (nguồn EXP #4 nếu Tâm Pháp phù hợp); vẫn song tu tiếp được khi `affinity ≥ +60` | Hiện khi `affinity ≥ +60`, ẩn khi +40 ≤ affinity < +60 | → Broken (khi `affinity < +40`) HOẶC → Ended (NPC chết) |
| Broken | Từng Active, Hảo cảm tụt dưới +40 | Ẩn cho đến khi `affinity ≥ +60` | → Available (khi leo lại `≥ +60`) |
| Ended | NPC đã chết (Death & Consequence) | Ẩn | (terminal) |

### Interactions with Other Systems

- **Turn Manager** (upstream, hard): trigger tính delta khi hành động
  xác nhận thuộc phạm vi; Core Rule #8 — deferred-commit mọi delta; undo
  hoàn tác toàn bộ.
- **Combat System** (upstream, hard): nhận tín hiệu hand-off
  (`outcome`, margin, đối thủ) khi `battle_active=false` → ánh xạ thành
  sự kiện Hảo cảm (thua/thắng trước NPC, mức độ theo margin). Combat
  không đọc/ghi Hảo cảm (ranh giới đã vẽ ở `combat-system.md` Section D
  đầu mục).
- **Death & Consequence** (downstream+upstream, chưa thiết kế,
  provisional): ĐỌC cờ thù địch sâu sắc (`affinity ≤ -80`) để quyết
  định nguy cơ chết thật; PHÁT sự kiện "NPC bị giết bởi nhân vật chính"
  (kèm cờ có nhân chứng) để hệ này xử lý lan truyền.
- **EXP & Realm Progression** (downstream, Designed): đọc
  `SONG_TU_ACTIVE` = (tập Song Tu active ≠ rỗng) — đóng Open Question
  của GDD đó: interface là **danh sách NPC ID**, EXP tiêu thụ dạng
  boolean derived, bonus không cộng dồn theo số NPC.
- **World Memory** (upstream, hard): schema field
  `affinity_delta_[npc_id]` khớp quy ước entity_id; hệ này truy vấn
  fact theo `entity_id` khi cần lịch sử tương tác của 1 NPC.
- **Situation/Encounter Generation** (upstream, chưa thiết kế,
  **provisional**): cung cấp (a) phân loại sự kiện xã hội từ hành động
  người chơi, (b) danh sách NPC trong cảnh (`entities_in_scope`) làm
  danh sách nhân chứng. Cho đến khi hệ đó được thiết kế, MVP có thể
  chạy bằng bảng sự kiện cơ học cứng (nguồn a của Core Rule #2).
- **Character Card & Identity** (downstream, chưa thiết kế): đọc Hảo
  cảm (số), dải thái độ, trạng thái nút Song Tu.
- **Mechanic/Narration Contract Enforcement** (upstream, hard): mọi
  delta khóa trước khi AI tường thuật; AI nhận dải thái độ + hướng thay
  đổi, không bao giờ nhận quyền quyết định delta.

## Formulas

*(Đề xuất bởi `systems-designer`, thẩm định kinh tế bởi `economy-designer`;
người dùng chốt các điểm bất đồng 2026-08-03: `LOSS_VS_NPC_DELTA=-3` — sửa
lỗi ngược chiều "tâm phục khẩu phục" của đề xuất gốc +3; `PROPAGATION_RATE
=0.5` dung hòa; fatigue cửa sổ trượt 3 lượt; giữ cơ chế thắng-áp-đảo. Mọi
field số trong `locked_result` là SỐ NGUYÊN sau round — đúng Numeric Leak
Detection của Contract Enforcement.)*

**Quy ước chung:**
- **Thang severity**: số nguyên `severity ∈ {0..5}`. `0` = sự kiện dương
  (không có "nạn nhân", không bao giờ đủ điều kiện lan truyền). `1–5` cho
  sự kiện âm nhắm vào một NPC cụ thể, tăng dần theo mức nghiêm trọng.
- **Cờ thủ phạm bị biết**: `perpetrator_known = (|witnesses(scene)| ≥ 1)
  OR (victim_alive == true)`, với `witnesses(scene) = entities_in_scope \
  {target}`. Mọi sự kiện KHÔNG phải giết → nạn nhân còn sống tự biết thủ
  phạm, luôn true; sự kiện giết → chỉ nhân chứng tại cảnh quyết định
  (Core Rule #4).
- **Làm tròn**: tính trung gian bằng float; round về số nguyên ĐÚNG 1 LẦN
  ở bước cuối D.6 (per-NPC, sau cộng dồn, trước clamp), quy ước
  *round-half-away-from-zero* (VD `-10.5 → -11`).

### D.1 — Bảng sự kiện → base_delta

`base_delta(event_type, context) = LOOKUP(event_type) [+ margin
adjustment nếu event_type = combat_win_vs_npc]`

| event_type | Nguồn | `base_delta` | `severity` | Chịu D.2/D.3/D.4? |
|---|---|---|---|---|
| `gift` (tặng quà) | Situation Gen (provisional) | `+GIFT_DELTA` = +5 | 0 | Có (dương) |
| `small_help` (giúp đỡ nhỏ) | Situation Gen | `+SMALL_HELP_DELTA` = +3 | 0 | Có |
| `save_life` (cứu mạng) | Situation Gen / Combat | `+SAVE_LIFE_DELTA` = +15 | 0 | Có |
| `combat_win_vs_npc` (thắng trận trước NPC theo dõi) | Combat hand-off (`outcome=win`) | `-(COMBAT_WIN_BASE + COMBAT_WIN_MARGIN_SCALE × margin_ratio)` = -5 → -15 | 2; nâng lên 3 nếu `margin_ratio ≥ SEVERE_WIN_MARGIN_THRESHOLD` (thắng áp đảo = làm nhục công khai) | Không (âm) |
| `combat_loss_vs_npc` (thua trận trước NPC theo dõi) | Combat hand-off (`outcome=lose`) | `LOSS_VS_NPC_DELTA` = **-3** (NPC thắng nảy sinh khinh thường/xem nhẹ kẻ thua — chiều NPC→người chơi; trope "tâm phục khẩu phục" là chiều ngược lại, không áp dụng) | 1 | Không (âm) |
| `insult` (xúc phạm) | Situation Gen | `-INSULT_DELTA` = -8 | 2 | Không |
| `threaten` (đe dọa) | Situation Gen | `-THREATEN_DELTA` = -12 | 3 | Không |
| `betray` (phản bội) | Situation Gen | `-BETRAY_DELTA` = -30 | 4 | Không |
| `kill_witnessed` (giết NPC — delta áp cho TỪNG nhân chứng còn sống trong `entities_in_scope`; nạn nhân đã chết, không còn affinity để chỉnh) | Death & Consequence hand-off | `-KILL_WITNESS_DELTA` = -25/nhân chứng | 5 | Không |
| `song_tu_action` (Song Tu) | Hệ này tự phát (Core Rule #6) | `+random_int(1,10)` uniform | n/a | **MIỄN TRỪ TOÀN BỘ** (đã khóa Section C — nêu lại để đối chiếu) |

**Combat win margin sub-formula:**
```
margin_ratio = hp_remaining_pct(người thắng) tại battle_active=false   // nguồn: combat-system.md hand-off
combat_win_vs_npc_delta = -(COMBAT_WIN_BASE + COMBAT_WIN_MARGIN_SCALE × margin_ratio)
severity = 3 nếu margin_ratio ≥ SEVERE_WIN_MARGIN_THRESHOLD, ngược lại 2
```

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Loại sự kiện | `event_type` | enum | bảng trên | Từ Combat/Death & Consequence (hard) hoặc Situation Gen (social, provisional) |
| Tỷ lệ HP còn lại người thắng | `margin_ratio` | float | [0,1] | `hp_after`/`max_HP` từ `locked_result` hand-off của Combat |
| Delta nền thắng trận | `COMBAT_WIN_BASE` | float (knob) | 2–10 | Delta âm tối thiểu khi thắng sát nút |
| Hệ số margin | `COMBAT_WIN_MARGIN_SCALE` | float (knob) | 0–15 | Delta âm thêm khi thắng áp đảo |
| Ngưỡng thắng "làm nhục" | `SEVERE_WIN_MARGIN_THRESHOLD` | float (knob) | 0.6–0.85 | Từ đây severity nâng lên 3, đủ điều kiện D.5 |
| Kết quả | `base_delta` | float (round ở D.6) | [-30, +15] | Delta thô trước mọi modifier |

**Output Range:** `[-30, +15]`. Không đối xứng có chủ đích — làm mất lòng
luôn "rẻ" hơn lấy lòng (Core Rule #3, Player Fantasy "mất đi không dễ lấy
lại").

**Pacing đã kiểm chứng** (economy-designer): 0 → +60 cần ~8–12 hành động
tích cực ĐA DẠNG ≈ 2.5–3 phiên chơi tập trung (một phiên điển hình dồn 1
NPC: `help+help+gift+save_life+help ≈ +28 thô`); 0 → -80 chỉ cần 2–3 hành
vi nghiêm trọng (VD 2× `betray` ≈ -70... cộng lan truyền) — bất đối xứng
có chủ đích, và một hành vi cực đoan có nhân chứng CÓ THỂ đẩy trung lập
xuống -80 trong 1 lượt (hợp lệ theo thể loại, không phải bug).

**Scope-cut MVP**: chưa phân biệt "đấu thân thiện" vs "đấu địch ý" — cờ
`spar_friendly` để dành Situation/Encounter Generation (xem Open
Questions).

### D.2 — Diminishing returns (chỉ áp delta dương)

`diminish_factor(A) = clamp(1 − (max(0, A)/100)^DIMINISH_EXPONENT × (1 −
DIMINISH_FLOOR), DIMINISH_FLOOR, 1)`
`effective_delta = base_delta × diminish_factor(A_before)` — **chỉ khi
`base_delta > 0`**

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Hảo cảm đầu lượt | `A_before` | int | [-100,100] | Affinity NPC TRƯỚC khi cộng delta lượt này |
| Số mũ diminish | `DIMINISH_EXPONENT` | float (knob) | 2–5 | Càng cao diminish càng "trễ" — giữ hiệu lực cao ở vùng thấp/trung, rơi dốc gần +100 |
| Sàn hiệu lực | `DIMINISH_FLOOR` | float (knob) | 0.05–0.3 | KHÔNG được = 0 — luôn còn cửa tiến bộ dù ở +99 |
| Kết quả | `effective_delta` | float | `(0, base_delta]` | Delta sau diminish, trước D.3 |

**Output Range:** `(0, base_delta]`, luôn dương khi input dương. Với
`A_before ≤ 0` → `factor = 1` (diminish chỉ đo khoảng cách tới +100,
không phạt việc hồi phục từ âm).

**Example** (`DIMINISH_EXPONENT=3, DIMINISH_FLOOR=0.1`): `A=0` → gift +5
giữ nguyên; `A=60` → save_life `+15×0.806=12.09`; `A=95` → gift
`+5×0.228=1.14`; `A=-50` → factor=1, help +3 giữ nguyên.

### D.3 — Repetition fatigue (cửa sổ trượt)

`fatigue_factor(streak_before) = clamp(1 − FATIGUE_RATE × streak_before,
FATIGUE_FLOOR, 1)`
`effective_delta' = effective_delta × fatigue_factor` — chỉ khi
`base_delta > 0`.

**Định nghĩa streak (cửa sổ trượt — quyết định người dùng 2026-08-03, vá
lỗ hổng ratchet "chèn 1 lượt đệm xóa fatigue")**: theo dõi `(npc_id,
event_type) → {last_event_turn, streak}`. Khi sự kiện cùng cặp xảy ra tại
lượt `T`:
- Nếu `T − last_event_turn ≤ FATIGUE_WINDOW_TURNS` → `streak_before =
  streak`, rồi `streak += 1`.
- Ngược lại → `streak_before = 0`, `streak = 1` (reset hoàn toàn).
- Xen kẽ NPC/loại sự kiện khác là đa dạng hóa CHỦ ĐÍCH được chấp nhận,
  không bị phạt. Không áp cho delta lan truyền (D.5) và `song_tu_action`
  (miễn trừ đã khóa).

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Số lần lặp trước lần này | `streak_before` | int | [0, ∞) | 0 = lần đầu/mới reset, không fatigue |
| Tốc độ suy giảm | `FATIGUE_RATE` | float (knob) | 0.05–0.3 | Hiệu lực giảm bấy nhiêu mỗi lần lặp thêm |
| Sàn hiệu lực | `FATIGUE_FLOOR` | float (knob) | 0.1–0.5 | Hiệu lực tối thiểu dù lặp bao nhiêu |
| Cửa sổ trượt | `FATIGUE_WINDOW_TURNS` | int (knob) | 2–5 | Khoảng cách lượt tối đa để vẫn tính là "lặp" |
| Kết quả | `effective_delta'` | float | `(0, effective_delta]` | Delta sau cả D.2 + D.3 |

**Example** (`FATIGUE_RATE=0.15, FATIGUE_FLOOR=0.25, WINDOW=3`):
`small_help` NPC X các lượt 10,11,12,13,14 → +3, +2.55, +2.10, +1.65,
+1.20; lượt 15 tiếp → chạm dần sàn 0.25 (+0.75). Nếu nghỉ tới lượt 18
(cách 4 > 3) mới help lại → reset, +3 đầy đủ.

### D.4 — Per-turn positive cap

`capped_positive_total(npc_id) = min(Σ đóng góp dương cho npc_id trong
lượt (sau D.2/D.3), CAP_POSITIVE_PER_TURN)`

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Tổng dương thô/NPC/lượt | `sum_positive` | float | [0, ∞) | Cộng mọi nguồn dương chạm cùng NPC trong lượt |
| Trần dương/lượt | `CAP_POSITIVE_PER_TURN` | float (knob) | 15–25 | Mặc định 20 — đủ cao để 1 sự kiện `save_life` không bị cắt trong chính lượt cao trào của nó; đủ thấp chặn dồn nguồn |
| Kết quả | `capped_positive_total` | float | `[0, CAP]` | Input bước round/clamp cuối D.6 |

**Output Range:** `[0, CAP_POSITIVE_PER_TURN]`. **KHÔNG áp cho tổng âm**
(Core Rule #3 chỉ cap delta dương — hành vi tàn ác không có sàn an toàn).
Luồng thường (1 sự kiện/lượt, max +15) gần như không chạm cap — đây là
lưới an toàn cho ca propagation dương chồng nguồn dương trực tiếp.
**Example**: save_life (đã diminish còn 12) + propagation dương +9 cùng
lượt cùng NPC → `min(21, 20) = 20`.

### D.5 — Propagation (one-hop, điều kiện nhân chứng)

```
IF severity(event) ≥ PROPAGATION_SEVERITY_MIN AND perpetrator_known(event):
  FOR npc IN linked_npcs(victim) \ witnesses \ {victim}:
    raw_prop = base_delta(event) × PROPAGATION_RATE × link_strength(victim, npc)
    prop_effective = raw_prop × (diminish_factor(A_before(npc)) nếu raw_prop > 0, ngược lại 1)
                     // KHÔNG áp D.3 — propagation không phải hành động trực tiếp lặp lại
    total_from_event(npc) = prop_effective + CRUELTY_REP_DELTA
  FOR npc IN witnesses:            // hiện chỉ kill_witnessed dùng multi-witness
    total_from_event(npc) = base_delta(event) + CRUELTY_REP_DELTA   // âm, không D.2/D.3
ELSE:
  không delta nào ngoài delta trực tiếp (D.1). Thủ phạm ẩn danh là chiến
  lược hợp lệ — NPC biết TIN (qua World Memory/tường thuật) nhưng không
  biết THỦ PHẠM, không đổi thái độ với người chơi.
```

**KHÔNG lan bậc 2** (chốt cứng): chỉ đọc `link_strength(victim, npc)` —
không bao giờ lan tiếp từ NPC vừa nhận propagation. Lý do: (a) chống
fan-out lũy thừa khi số NPC tăng ở Alpha/Full Vision; (b) mỗi NPC clamp
độc lập theo `A_before` CỦA CHÍNH HỌ, không NPC nào đọc kết quả đã clamp
của NPC khác trong cùng lượt → **không tồn tại rủi ro clamp dây chuyền**
(đóng cờ HIGH-RISK của `systems-index.md`).

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Cờ thủ phạm bị biết | `perpetrator_known` | bool | {0,1} | Xem Quy ước chung — khóa theo Core Rule #4 |
| Độ liên kết tĩnh | `link_strength(victim, npc)` | float | [-1.0, +1.0] | Data NPC (Core Rule #4); ÂM = npc là địch/ghét victim |
| Tỷ lệ lan truyền | `PROPAGATION_RATE` | float (knob) | 0.3–0.7 | Mặc định **0.5** (dung hòa systems 0.6/economy 0.3, người dùng chốt); luôn < 1 — "nghe kể" nhẹ hơn "chứng kiến" |
| Tiếng tăm tàn nhẫn | `CRUELTY_REP_DELTA` | float (knob) | -1 đến -5 | Mặc định -2; flat, KHÔNG scale theo link — danh tiếng chung của thủ phạm |
| Ngưỡng lan truyền | `PROPAGATION_SEVERITY_MIN` | int (knob) | 2–4 | Mặc định 3 — `insult` (sev 2) không lan; `threaten` trở lên mới lan |
| Kết quả mỗi NPC | `total_from_event(npc)` | float | không tự chặn | Input cộng dồn vào D.6 (nơi cap/round/clamp) |

**Output Range:** không tự thân bị chặn — D.6 mới cap/round/clamp. Dấu
`raw_prop` CÓ THỂ ĐẢO khi `link_strength < 0` — địch của nạn nhân hài
lòng khi nạn nhân bị hại (chủ đích, đúng Pillar 1, không phải lỗi).

**Example** (giết NPC_B, nhân chứng A; C bạn thân B `link=+0.7` vắng mặt;
D địch B `link=-0.6`; `RATE=0.5, CRUELTY=-2`):
- A (nhân chứng): `-25 + (-2) = -27`.
- C: `raw = -25×0.5×0.7 = -8.75` (âm, không diminish) `− 2 = -10.75` →
  round **-11**.
- D: `raw = -25×0.5×(-0.6) = +7.5` (dương → diminish tại `A_before=20`:
  ×0.993 ≈ 7.45) `− 2 = 5.45` → round **+5** — D vẫn vui dù chứng kiến
  tội ác, vì vốn ghét B.

### D.6 — Pipeline tổng hợp 1 lượt

Theo pattern `resolve_turn_exp` của `exp-realm-progression.md`.

```
resolve_turn_affinity(turn):
  event = classified_event(turn)          // 0 hoặc 1 sự kiện/lượt (1 lượt = 1 hành động)
  IF event == null: RETURN {}             // không field nào được ghi

  contributions = {}                       // npc_id → list[float]

  // --- B1: delta trực tiếp (D.1) ---
  IF event.type == kill_witnessed:
    IF |witnesses(scene)| == 0: RETURN {}  // Core Rule #4 — không nhân chứng, không gì cả
    FOR w IN witnesses(scene): contributions[w] += base_delta(event)   // âm, không D.2/D.3
  ELSE:
    raw = base_delta(event, context)
    IF raw > 0: raw ×= diminish_factor(A_before(target)) × fatigue_factor(streak_before(target, event.type))
    contributions[target] += raw

  // --- B2: lan truyền (D.5) ---
  IF base_delta(event) < 0 AND severity ≥ PROPAGATION_SEVERITY_MIN AND perpetrator_known:
    victim = (event.type == kill_witnessed) ? event.victim_id : target
    FOR npc IN linked_npcs(victim) \ witnesses(scene) \ {victim}:
      contributions[npc] += D5_total(event, victim, npc)   // đã gồm cruelty component

  // --- B3: per-NPC cap/round/clamp ---
  result = {}
  FOR npc_id, deltas IN contributions:
    total = sum(deltas)
    final_raw = min(max(0, total), CAP_POSITIVE_PER_TURN) + min(0, total)   // D.4 chỉ cap phần dương
    final_rounded = round_half_away_from_zero(final_raw)
    A_after = clamp(A_before(npc_id) + final_rounded, -100, 100)            // Core Rule #9
    locked_delta = A_after − A_before(npc_id)                               // giá trị THỰC ghi khóa
    IF locked_delta != 0: result["affinity_delta_" + npc_id] = locked_delta

  update_streak_trackers(event)            // D.3 state, chạy dù locked_delta = 0
  RETURN result   // → locked_result; Song Tu state machine + cờ thù địch sâu sắc
                  // đọc A_after SAU bước này, trong CÙNG lượt
```

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Sự kiện đã phân loại | `event` | struct \| null | — | Tối đa 1/lượt (1 lượt = 1 hành động, Turn Manager) |
| Hảo cảm trước/sau | `A_before`, `A_after` | int | [-100,100] | Per-NPC; `A_after` đã clamp |
| Delta thực khóa | `locked_delta` | int | khoảng còn lại tới biên | `= A_after − A_before`; field `affinity_delta_[npc_id]`; = 0 thì KHÔNG ghi field (nhất quán `has_signal` của World Memory) |

**Output Range:** mỗi field `affinity_delta_[npc_id]` là số nguyên, bó
hẹp bởi clamp per-NPC — không bao giờ đẩy `A_after` ra ngoài [-100,100].

**Example tổng hợp** (ví dụ D.5; `A_before`: A=10, C=40, D=20):
`locked_result = {affinity_delta_A: -27, affinity_delta_C: -11,
affinity_delta_D: +5}` → `A_after`: A=-17, C=29, D=25 — 3 field trong
đúng 1 `locked_result`, khớp Core Rule #8. Dùng làm regression test cố
định.

**Ca biên đã kiểm** (nguồn cho Acceptance Criteria):
1. Lan truyền đẩy vượt biên: `A_before=95`, prop dương +8 → clamp 100 →
   `locked_delta=+5`, không phải +8; không có hiệu ứng dây chuyền
   (one-hop + clamp độc lập).
2. NPC vừa là witness vừa có link: loại trừ tường minh `linked \
   witnesses` — không double-count.
3. NPC ở ±100: sự kiện cùng chiều → `locked_delta=0`, không ghi field.
4. Ngưỡng 60/40/-80: D.6 resolve affinity TRƯỚC, state machine (Song Tu,
   thù địch sâu sắc) check ngưỡng SAU, trong cùng lượt — VD `A_before=58`,
   `+2` → `A_after=60` → Song Tu chuyển Locked→Available ngay lượt đó.

## Edge Cases

- **Nếu lượt có delta Hảo cảm (kể cả lan truyền) bị Undo**: TOÀN BỘ delta
  hoàn tác, VÀ trạng thái phụ cũng hoàn tác theo — streak tracker của D.3
  quay về giá trị trước lượt, quan hệ Song Tu vừa thiết lập trong lượt đó
  coi như chưa từng thiết lập (Turn Manager Core Rule #8 áp cho MỌI trạng
  thái của hệ này, không chỉ giá trị Hảo cảm).
- **Nếu giết NPC không có nhân chứng**: không field `affinity_delta` nào
  được ghi cho bất kỳ NPC nào — không lan truyền, không tiếng tăm. Sự
  kiện "NPC chết" vẫn vào World Memory qua các field khác (của Death &
  Consequence); NPC khác biết TIN nhưng không biết THỦ PHẠM — tường thuật
  có thể nhắc cái chết bí ẩn. Đây là quyết định thiết kế CÓ CHỦ ĐÍCH (thế
  giới khách quan cho phép tội ác hoàn hảo — người chơi chọn thời điểm/
  địa điểm không nhân chứng là chiến lược hợp lệ), không phải lỗ hổng.
- **Nếu NPC chết khi đang có quan hệ Song Tu active**: state → Ended
  (terminal); tập active co lại; nếu là NPC cuối cùng trong tập,
  `SONG_TU_ACTIVE` = 0 từ lượt kế tiếp — nguồn EXP #4 tắt.
- **Nếu NPC trong `linked_npcs(victim)` đã chết trước đó**: bỏ qua — NPC
  chết không nhận delta (fact lịch sử của họ vẫn giữ nguyên trong World
  Memory, theo edge case "NPC đã chết" của GDD đó).
- **Nếu Hảo cảm đúng tại ngưỡng**: `= +60` → nút Song Tu HIỆN (bao gồm);
  `= +40` → quan hệ CHƯA hủy (hủy khi `< +40`, tức ≤ +39); `= -80` → ĐÃ
  thù địch sâu sắc (bao gồm).
- **Nếu Song Tu đẩy Hảo cảm vượt +100**: clamp — `locked_delta` có thể
  nhỏ hơn giá trị random đã đổ (VD ở 97, đổ được 8 → `locked_delta = +3`).
  RNG vẫn được gọi lại đầy đủ khi undo-rồi-làm-lại (Turn Manager AC-12).
- **Nếu lượt Song Tu ĐẦU TIÊN thiết lập quan hệ — EXP bonus tính từ khi
  nào**: nguồn EXP #4 đánh giá `SONG_TU_ACTIVE` theo trạng thái ĐẦU LƯỢT
  → bonus bắt đầu từ lượt KẾ TIẾP, không phải chính lượt thiết lập.
  Tránh phụ thuộc thứ tự resolve giữa 2 hệ trong cùng lượt — không có
  "vừa song tu vừa nhận bonus của chính hành động đó".
- **Nếu 1 lượt vừa qua ngưỡng break** (VD từ +65 nhận delta âm lớn xuống
  +30): Active → Broken ngay lượt đó (check ngưỡng sau khi `A_after`
  chốt); nếu xuống tiếp ≤ -80 ở các lượt sau, cờ thù địch sâu sắc và
  trạng thái Song Tu Broken tồn tại song song — hai tầng độc lập
  (Section C States).
- **Nếu sự kiện nhắm vào NPC chưa từng được theo dõi** (NPC mới xuất hiện
  giữa truyện): khởi tạo Hảo cảm theo giá trị mặc định trong data NPC
  (không có → 0, trung lập), rồi áp delta bình thường — "NPC chưa có
  lịch sử" là trạng thái hợp lệ (nhất quán AC-13 của World Memory).
- **Nếu đối thủ combat không phải NPC được theo dõi** (quái vật/thú
  hoang): Combat vẫn phát hand-off bình thường (AC-44 của Combat) — hệ
  này đơn giản KHÔNG sinh sự kiện Hảo cảm, không field nào được ghi.
  Không phải lỗi.
- **Nếu người chơi ở thù địch sâu sắc và làm hành động tích cực**: hợp lệ
  — delta dương áp bình thường, thậm chí KHÔNG bị diminish (D.2 factor =
  1 khi A ≤ 0); leo từ -80 về là con đường chuộc lỗi dài nhưng mở. Rời
  ngưỡng thù địch sâu sắc ngay khi `A_after ≥ -79`.
- **Nếu Situation Gen chưa tồn tại** (MVP giai đoạn đầu): chỉ nguồn sự
  kiện cơ học cứng hoạt động (combat/giết/Song Tu) — hệ vẫn chạy đầy đủ
  với tập sự kiện hẹp; sự kiện xã hội bật lên khi Situation Gen được
  thiết kế (đã khai provisional ở Section C).
- **Nếu cùng lượt có nhiều đóng góp cho cùng NPC** (VD witness delta +
  cruelty rep): cộng dồn trong `contributions[npc_id]` trước
  cap/round/clamp — 1 field duy nhất/NPC/lượt, không bao giờ ghi 2 field
  cho cùng NPC.

## Dependencies

| System | Chiều | Bản chất giao diện | Hard/Soft |
|---|---|---|---|
| Turn Manager | Hệ này phụ thuộc TM | Trigger tính delta khi hành động xác nhận; Core Rule #8 deferred-commit (delta + streak + trạng thái Song Tu); undo hoàn tác toàn bộ | Hard |
| Mechanic/Narration Contract Enforcement | Hệ này phụ thuộc | Khóa `affinity_delta_[npc_id]` trước narration_call; AI nhận dải thái độ + hướng thay đổi, không nhận số thô | Hard |
| World Memory & Context Management | Hệ này phụ thuộc | Schema field `affinity_delta_[npc_id]` khớp quy ước entity_id (đóng Open Question "quy ước đặt tên entity_id" của GDD đó cho hệ này); truy vấn fact theo `entity_id` | Hard |
| Combat System | Hệ này phụ thuộc Combat | Nhận hand-off (`outcome`, `hp_after`/`max_HP` cho `margin_ratio`) khi `battle_active=false` → sự kiện `combat_win/loss_vs_npc` | Hard |
| Death & Consequence (chưa thiết kế) | 2 chiều | ĐỌC cờ thù địch sâu sắc (`affinity ≤ -80`); PHÁT sự kiện `kill_witnessed` kèm danh sách nhân chứng | Hard (chiều đọc cờ) / Soft (chiều phát kill — thiếu thì mất 1 loại sự kiện) |
| EXP & Realm Progression | EXP phụ thuộc hệ này | `SONG_TU_ACTIVE` = (tập quan hệ active ≠ rỗng); interface trả danh sách NPC ID — đóng Open Question của GDD đó; bonus không cộng dồn; đánh giá theo trạng thái đầu lượt | Soft (chiều ngược — thiếu thì EXP mất nguồn #4, đã khai sẵn bên đó) |
| Situation/Encounter Generation (chưa thiết kế) | Hệ này phụ thuộc | (a) Phân loại sự kiện xã hội từ hành động tự do; (b) `entities_in_scope` làm danh sách nhân chứng. **Ràng buộc bắt buộc từ thẩm định kinh tế (economy-designer 2026-08-03)**: hệ đó KHÔNG được cung cấp lựa chọn sự kiện tích cực (tặng quà/giúp đỡ) on-demand mọi lượt, và hành động Song Tu nên gate qua bối cảnh tường thuật (địa điểm riêng tư, NPC sẵn lòng) — nếu không, ratchet Hảo cảm chắc chắn xảy ra bất kể fatigue/cap | Soft (MVP chạy được bằng sự kiện cơ học cứng) |
| Character Card & Identity (chưa thiết kế) | Character Card phụ thuộc hệ này | Đọc Hảo cảm (số), dải thái độ, trạng thái nút Song Tu (5 state) | Hard (chiều ngược) |
| Persistence/Save System | Persistence phụ thuộc hệ này | Serialize: bảng affinity per NPC, tập quan hệ Song Tu active, streak trackers (D.3), `link_strength` graph — nằm trong `turn_snapshot` theo Core Rule #8 của Turn Manager | Hard (chiều ngược) |

*(Ghi chú đối chiếu ngược: `systems-index.md` hiện ghi "Depends On: Turn
Manager, World Memory" cho hệ #9 — bảng trên bổ sung Combat, Contract
Enforcement (upstream) và các cạnh chiều ngược chưa liệt kê, cùng dạng
gap đã ghi nhận 5 lần trước ở Dependency Map của systems-index. Ghi nhận
tại đây làm nguồn tham chiếu; cập nhật footnote systems-index ở bước
update index.)*

## Tuning Knobs

| Knob | Default | Safe Range | Ảnh hưởng nếu chỉnh |
|---|---|---|---|
| `GIFT_DELTA` | +5 | 2–10 | Tăng: quà giá trị hơn, rút ngắn đường tới +60. Giảm: quà gần như không đáng làm |
| `SMALL_HELP_DELTA` | +3 | 1–6 | Tương tự trên, cho hành động phổ biến nhất |
| `SAVE_LIFE_DELTA` | +15 | 8–25 | Tăng: cứu mạng thành "cheat code" tới Song Tu. Giảm: mất cảm giác hành động lớn |
| `LOSS_VS_NPC_DELTA` | -3 | -6–0 | Tăng độ âm: thua trận phá quan hệ đáng kể. 0: thua trận không ảnh hưởng thái độ NPC thắng |
| `COMBAT_WIN_BASE` | 5 | 2–10 | Delta âm tối thiểu khi thắng NPC — tăng: thắng trận thành nguồn phá quan hệ chính |
| `COMBAT_WIN_MARGIN_SCALE` | 10 | 0–15 | Biên độ âm thêm theo mức áp đảo |
| `SEVERE_WIN_MARGIN_THRESHOLD` | 0.7 | 0.6–0.85 | Giảm: thắng áp đảo dễ leo thang thành lan truyền hơn |
| `INSULT_DELTA` / `THREATEN_DELTA` / `BETRAY_DELTA` / `KILL_WITNESS_DELTA` | -8 / -12 / -30 / -25 | -15…-3 / -20…-6 / -45…-15 / -40…-15 | Tăng độ âm: chơi "ác" rủi ro xã hội cao hơn. Giảm: nhẹ tay với hành vi tiêu cực |
| `DIMINISH_EXPONENT` | 3 | 2–5 | Tăng: diminish "trễ" hơn (rơi mạnh chỉ gần +100). Giảm: diminish đến sớm |
| `DIMINISH_FLOOR` | 0.1 | 0.05–0.3 | **Không được = 0** (mất bất biến "luôn còn cửa tiến bộ"). Tăng: dư địa tiến bộ ở +99 nhiều hơn |
| `FATIGUE_RATE` | 0.15 | 0.05–0.3 | Tăng: spam cùng loại bị phạt nhanh hơn |
| `FATIGUE_FLOOR` | 0.25 | 0.1–0.5 | Giảm: spam kéo dài gần như vô nghĩa |
| `FATIGUE_WINDOW_TURNS` | 3 | 2–5 | Tăng: khó "rải cách lượt" né fatigue hơn. Giảm về 1 = quay lại định nghĩa lượt-liền-kề |
| `CAP_POSITIVE_PER_TURN` | 20 | 15–25 | Giảm < 15: bắt đầu cắt cả sự kiện `save_life` đơn lẻ — không khuyến nghị |
| `PROPAGATION_RATE` | 0.5 | 0.3–0.7 | Trần 0.7 để lan truyền luôn < trải nghiệm trực tiếp. Tăng: mạng quan hệ đáng sợ hơn |
| `CRUELTY_REP_DELTA` | -2 | -5…-1 | Tăng độ âm: danh tiếng tàn nhẫn lan rộng mạnh dù không quen nạn nhân |
| `PROPAGATION_SEVERITY_MIN` | 3 | 2–4 | Giảm xuống 2: `insult` cũng lan — có thể quá nhạy |

*(KHÔNG phải tuning knob: `SONG_TU_THRESHOLD=60`,
`SONG_TU_BREAK_THRESHOLD=40`, ngưỡng thù địch sâu sắc `-80`, thang
`[-100,+100]`, khoảng random Song Tu `1–10` — đây là hằng số thiết kế đã
khóa ở Section C, các hệ khác (Death & Consequence, EXP, Character Card)
phụ thuộc giá trị cụ thể; đổi chúng là thay đổi thiết kế cần re-review,
không phải tinh chỉnh. `link_strength` là DATA per-NPC (authoring
content), không phải knob toàn cục.)*

## Visual/Audio Requirements

Không có yêu cầu Visual/Audio riêng — hệ thuần data/logic thuộc category
Progression (người dùng chốt skip 2026-08-03, theo tiền lệ EXP & Realm
Progression). Toàn bộ hiển thị Hảo cảm thuộc Character Card & Identity
(Visual Identity Anchor "Mực Chưa Khô": số Hảo cảm nằm trong con dấu góc
cạnh; thay đổi vĩnh viễn nghiêm trọng — rơi vào thù địch sâu sắc, NPC
chết — thuộc khẩu phần màu đỏ son, quyết định cụ thể ở `/art-bible`).

## UI Requirements

Hệ này không sở hữu màn hình riêng, nhưng định nghĩa 3 hành vi UI mà
Character Card & Identity (chưa thiết kế) BẮT BUỘC tôn trọng:

1. **Nút Song Tu** trên thẻ NPC: hiển thị/ẩn đúng theo bảng 5 trạng thái
   ở Section C (Locked/Available/Active/Broken/Ended — cột "Nút Song
   Tu"). Bấm nút = gửi một hành động Song Tu qua Turn Manager (đi vào
   Resolving như mọi hành động, khóa input khi đang Resolving, tốn 1
   lượt, có thể Undo như lượt thường).
2. **Mục "Thái độ với nhân vật chính"** trên thẻ NPC: hiển thị theo 7
   dải thái độ (Section C Tầng 1), kèm giá trị Hảo cảm số.
3. **Số Hảo cảm và delta không bao giờ xuất hiện trong văn tường thuật**
   (Contract Enforcement Core Rule #4) — Character Card là nơi DUY NHẤT
   xem số; tường thuật chỉ thể hiện thái độ qua hành vi/lời nói NPC.

📌 **UX Flag — NPC Affinity & Relationship**: hành vi UI trên là input
bắt buộc cho UX spec của Character Card. Ở Phase 4 (Pre-Production),
chạy `/ux-design` cho màn hình Character Card **trước khi** viết epic —
story tham chiếu UI trích `design/ux/character-card.md`, không trích
thẳng GDD này.

## Acceptance Criteria

*(Đề xuất bởi `qa-lead`. Hệ này thuần data/logic, không network — phần
lớn kiểm chứng bằng unit test thuần; mọi phụ thuộc ngoài (Combat
hand-off, Death & Consequence, Situation Gen, RNG, Turn Manager) phải
được **inject** như tham số/mock, không gọi hệ thật.)*

**Story Type**: Logic (bảng sự kiện + pipeline formula + state machine)
→ **BLOCKING** gate, test tự động bắt buộc tại
`tests/unit/npc-affinity-relationship/` (naming:
`npc_affinity_[feature]_test.gd`, `test_[scenario]_[expected]`).

**Ghi chú test setup**: Trừ khi ghi chú khác, mọi AC dùng cố định giá
trị default ở Tuning Knobs làm fixture, cùng hằng số khóa
(`SONG_TU_THRESHOLD=60, SONG_TU_BREAK_THRESHOLD=40`, thù địch sâu sắc
`-80`, thang `[-100,+100]`, Song Tu random `1–10`). RNG phải inject
được (seeded stub) để test deterministic. Các AC dùng interface
provisional (Situation Gen — `entities_in_scope`, phân loại sự kiện)
đánh dấu "provisional-interface" trong file test, rà lại khi hệ đó được
thiết kế.

### Core Rules

**AC-01** (Rule #1 — chủ quyền dữ liệu & khởi tạo): GIVEN data NPC theo
MVP seed (`npc_thu_dich` initial=-85, `npc_hao_cam` initial=+60,
`npc_trung_lap` initial=0), WHEN khởi tạo hệ, THEN mỗi NPC có ĐÚNG 1
giá trị Hảo cảm kiểu số nguyên, đúng bằng giá trị data, và mọi API đọc
Hảo cảm của cùng NPC trả về cùng 1 nguồn giá trị (không tồn tại bản sao
thứ hai để so lệch). *(unit)*

**AC-02** (Rule #2 — chỉ nhận sự kiện đã phân loại, không AI call):
GIVEN 1 lượt có `classified_event=null` (hành động tự do chưa được phân
loại), WHEN `resolve_turn_affinity` chạy, THEN trả về `{}` — không NPC
nào đổi Hảo cảm; VÀ đếm bằng mock-spy số lệnh gọi AI trước/sau toàn bộ
pipeline (D.1→D.6) = 0 lệnh gọi phát sinh — hệ này không bao giờ tự
diễn giải hành động. *(unit + mock-spy)*

**AC-03** (Rule #3 — không decay theo thời gian): GIVEN NPC có
`affinity=+50`, WHEN chạy 100 lượt xác nhận liên tiếp không có sự kiện
nào chạm NPC đó, THEN `affinity` VẪN = +50 chính xác — không tồn tại
code path nào giảm Hảo cảm theo số lượt trôi qua. *(unit)*

**AC-04** (Rule #3 — delta âm KHÔNG diminishing): GIVEN NPC có
`A_before=+90` (vùng diminish mạnh nhất), WHEN áp sự kiện `insult`,
THEN delta = -8 ĐẦY ĐỦ (không nhân `diminish_factor`, không fatigue dù
lặp `insult` nhiều lượt liên tiếp — mỗi lần vẫn -8 tròn). *(unit)*

**AC-05** (Rule #4 — điều kiện lan truyền kép): GIVEN victim có 2 NPC
link (`link_strength≠0`) và có nhân chứng trong cảnh, WHEN áp lần lượt
(a) `insult` (severity 2 < `PROPAGATION_SEVERITY_MIN=3`) và (b)
`threaten` (severity 3), THEN (a) KHÔNG sinh field lan truyền nào (chỉ
delta trực tiếp cho target), (b) sinh field lan truyền cho các NPC link
theo D.5 — cả hai điều kiện `severity ≥ min` VÀ `perpetrator_known`
phải đồng thời true. *(unit, provisional-interface)*

**AC-06** (Rule #5 — ngưỡng thù địch sâu sắc bao gồm -80): GIVEN NPC có
affinity lần lượt = -79, -80, -81, -100, WHEN đọc cờ thù địch sâu sắc,
THEN kết quả lần lượt = `false, true, true, true` — ngưỡng BAO GỒM -80.
*(unit)*

**AC-07** (Rule #6 — hành động Song Tu: hiệu ứng + miễn trừ): GIVEN NPC
`affinity=+70`, RNG stub inject trả 7, streak tracker của NPC đó đang ở
streak cao và `A_before=+70` (vùng diminish), WHEN thực hiện
`song_tu_action`, THEN `locked_delta=+7` CHÍNH XÁC — không nhân diminish
(D.2), không nhân fatigue (D.3), không bị trừ bởi cap khi là nguồn duy
nhất (D.4); hành động tiêu tốn đúng 1 lượt qua Turn Manager (mock TM
ghi nhận 1 lượt). Kiểm bổ sung: stub trả 1 và 10 đều hợp lệ; giá trị 0
hoặc 11 không bao giờ xảy ra với RNG thật (assert biên trong code).
*Ghi chú: tính ĐỀU của phân phối uniform 1–10 kiểm bằng seeded
statistical test riêng (10.000 mẫu, chi-square) — chạy non-blocking vì
mang tính thống kê, không đưa vào gate.* *(unit, injected RNG)*

**AC-08** (Rule #6 + Section C — state machine Song Tu đủ 5 state):
GIVEN 1 NPC đi qua chuỗi: affinity 55 (Locked) → 62 (Available, nút
hiện) → thực hiện Song Tu lần đầu, lượt xác nhận (Active) → affinity
tụt 45 (Active, nút ẨN vì 40≤A<60 nhưng quan hệ CÒN) → tụt 39 (Broken)
→ leo lại 61 (Available) → Song Tu lần nữa (Active — tái lập), WHEN
kiểm tra state + visibility nút sau mỗi bước, THEN đúng như chuỗi trên;
VÀ GIVEN 2 NPC cùng đạt Active đồng thời, THEN cả 2 quan hệ cùng tồn
tại độc lập (đa NPC hợp lệ). *(unit)*

**AC-09** (Rule #7 — SONG_TU_ACTIVE không cộng dồn, interface danh
sách): GIVEN tập quan hệ active lần lượt = `{}`, `{npc_A}`, `{npc_A,
npc_B, npc_C}`, WHEN đọc interface, THEN interface trả về DANH SÁCH NPC
ID đúng nội dung tập; và boolean derived `SONG_TU_ACTIVE` lần lượt =
`0, 1, 1` — 3 NPC không cho giá trị nào khác 1 NPC. *(unit)*

**AC-10** (Rule #8 — mọi delta khóa trong `locked_result`, nhiều
field/1 sự kiện): GIVEN sự kiện lan truyền chạm 3 NPC trong 1 lượt,
WHEN Resolving hoàn tất, THEN cả 3 field `affinity_delta_[npc_id]` nằm
trong CÙNG 1 `locked_result` của đúng lượt đó (không tách nhiều lượt,
không ghi ngoài `locked_result`), mỗi field là số nguyên. *(unit)*

**AC-11** (Rule #9 — clamp trước khóa, bất biến toàn cục): GIVEN bộ
sinh ngẫu nhiên seeded tạo 1.000 tổ hợp (A_before ∈ [-100,100], chuỗi
sự kiện + lan truyền bất kỳ), WHEN chạy `resolve_turn_affinity` cho
từng tổ hợp, THEN với MỌI NPC: `A_before + locked_delta ∈ [-100, +100]`
— không tồn tại `locked_result` nào hàm chứa giá trị đẩy affinity ra
ngoài thang (property-based test, đóng rủi ro clamp của systems-index
High-Risk). *(unit, property-based seeded)*

### Formulas

**AC-12** (D.1 — bảng lookup event → base_delta/severity): GIVEN từng
`event_type` trong bảng D.1, WHEN tra `base_delta` và `severity`, THEN:
`gift=+5/0`, `small_help=+3/0`, `save_life=+15/0`,
`combat_loss_vs_npc=-3/1` (delta ÂM — chiều "NPC thắng khinh thường kẻ
thua", không phải +3), `insult=-8/2`, `threaten=-12/3`, `betray=-30/4`,
`kill_witnessed=-25 mỗi nhân chứng/5`. *(unit)*

**AC-13** (D.1 sub-formula margin — combat win): GIVEN Combat hand-off
inject với `margin_ratio` lần lượt = 0, 0.3, 0.69, 0.7, 1.0, WHEN tính
`combat_win_vs_npc`, THEN `base_delta` = -(5+10×m) lần lượt = -5, -8,
-11.9, -12, -15; VÀ `severity` = 2, 2, 2, **3**, **3** — ranh giới nâng
severity tại ĐÚNG `margin_ratio ≥ 0.7` (0.69 chưa nâng), tức chỉ từ 0.7
trở lên thắng mới đủ điều kiện lan truyền D.5. *(unit)*

**AC-14** (Quy ước chung — sub-formula `perpetrator_known`): GIVEN 3
kịch bản: (a) `betray` nhắm NPC còn sống, `entities_in_scope={target}`
(không ai khác), (b) `kill_witnessed` với `entities_in_scope={victim,
npc_X}`, (c) kill với `entities_in_scope={victim}` (0 nhân chứng sau
khi loại target), WHEN tính `perpetrator_known = (|witnesses| ≥ 1) OR
(victim_alive)`, THEN (a) `true` (nạn nhân sống tự biết thủ phạm dù
không nhân chứng), (b) `true` (1 nhân chứng), (c) `false`. *(unit,
provisional-interface)*

**AC-15** (D.2 — diminishing returns, khớp ví dụ GDD): GIVEN
`DIMINISH_EXPONENT=3, DIMINISH_FLOOR=0.1`, WHEN tính `effective_delta`
cho: `A=0` + gift; `A=60` + save_life; `A=95` + gift; `A=-50` +
small_help, THEN kết quả lần lượt = +5.0 (factor 1); +12.09 (15×0.806);
+1.14 (5×0.228); +3.0 (factor=1 vì A≤0 — hồi phục từ âm không bị phạt);
VÀ property: `diminish_factor(A) ≥ 0.1 > 0` với MỌI A kể cả +100 (floor
không bao giờ = 0 — luôn còn cửa tiến bộ). *(unit, regression neo số)*

**AC-16** (D.3 — repetition fatigue cửa sổ trượt, khớp ví dụ GDD):
GIVEN `FATIGUE_RATE=0.15, FATIGUE_FLOOR=0.25, WINDOW=3`, diminish mock
=1, chuỗi `small_help` NPC X tại các lượt 10,11,12,13,14,15, WHEN tính
`effective_delta'` mỗi lần, THEN = +3, +2.55, +2.10, +1.65, +1.20,
+0.75 (chạm sàn 0.25); GIVEN sau lượt 14 nghỉ tới lượt 18 (cách 4 > 3)
mới help lại, THEN reset hoàn toàn → +3 đầy đủ; GIVEN xen kẽ `gift` NPC
X hoặc `small_help` NPC Y, THEN mỗi cặp `(npc_id, event_type)` khác
nhau có streak ĐỘC LẬP, `streak_before=0` cho cặp mới — đa dạng hóa
không bị phạt. *(unit, regression neo số)*

**AC-17** (D.4 — per-turn positive cap, chỉ cap dương): GIVEN cùng lượt
cùng NPC nhận save_life đã diminish còn +12 VÀ propagation dương +9
(tổng thô 21), WHEN áp D.4, THEN tổng dương = `min(21, 20) = 20`; GIVEN
cùng lượt 1 NPC nhận tổng ÂM -27 (witness -25 + cruelty -2), THEN KHÔNG
bị cap — tổng âm giữ nguyên -27 (không có sàn an toàn cho hành vi tàn
ác). *(unit)*

**AC-18** (D.5 — propagation, khớp ví dụ GDD + đảo dấu link âm): GIVEN
giết NPC_B với nhân chứng A; C là bạn thân B (`link=+0.7`, vắng mặt,
`A_before` ≤ 0 cho nhánh âm không diminish); D là địch B (`link=-0.6`,
`A_before=20`); `RATE=0.5, CRUELTY=-2`, WHEN tính `total_from_event`
từng NPC, THEN: A (nhân chứng) = `-25 + (-2) = -27` (không D.2/D.3); C
= `-8.75 - 2 = -10.75` (raw âm → không diminish); D = `+7.5 × 0.9928 -
2 ≈ +5.45` (raw DƯƠNG do link âm đảo dấu → CÓ diminish theo A_before
của D, KHÔNG fatigue) — địch của nạn nhân hài lòng là chủ đích, không
phải bug. *(unit, regression neo số)*

**AC-19** (D.5 — one-hop cứng, không double-count, clamp độc lập):
GIVEN NPC_E vừa là nhân chứng vừa có `link_strength=+0.9` với victim,
VÀ NPC_F chỉ link với NPC_E (không link victim), WHEN sự kiện
`kill_witnessed` lan truyền, THEN NPC_E chỉ nhận ĐÚNG 1 đóng góp theo
nhánh witness (bị loại khỏi vòng `linked \ witnesses` — không cộng 2
lần); NPC_F nhận 0 delta (không lan bậc 2 từ E); VÀ mỗi NPC clamp theo
`A_before` của CHÍNH họ — không NPC nào đọc kết quả đã clamp của NPC
khác trong cùng lượt. *(unit)*

**AC-20** (D.6 — regression test tổng hợp CỐ ĐỊNH, khớp ví dụ GDD):
GIVEN kịch bản AC-18 với `A_before`: A=10, C=40, D=20, WHEN
`resolve_turn_affinity` chạy trọn pipeline, THEN `locked_result =
{affinity_delta_A: -27, affinity_delta_C: -11, affinity_delta_D: +5}` —
ĐÚNG 3 field trong ĐÚNG 1 `locked_result`, mỗi NPC đúng 1 field (đóng
góp cộng dồn trước cap/round/clamp, không bao giờ 2 field/NPC);
`A_after`: A=-17, C=29, D=25. Đây là regression test cố định — mọi thay
đổi knob phải cập nhật fixture có chủ đích, không được "sửa test cho
qua". *(unit — regression cố định)*

**AC-21** (D.6 — quy ước làm tròn, round đúng 1 lần): GIVEN tổng
per-NPC sau cap lần lượt = -10.75, -10.5, +5.45, +0.5, WHEN round tại
B3, THEN = -11, **-11** (half-away-from-zero, không phải -10), +5,
**+1**; VÀ verify các bước trung gian (D.2/D.3/D.5) giữ float — chỉ
round ĐÚNG 1 LẦN ở B3, per-NPC, sau cộng dồn, trước clamp (không round
từng thành phần rồi cộng); mọi field ghi khóa là số nguyên (Numeric
Leak Detection của Contract Enforcement). *(unit)*

**AC-22** (D.6 — null event, zero-delta không ghi field, streak vẫn cập
nhật): GIVEN (a) lượt có `event=null`, (b) lượt có sự kiện nhưng
`locked_delta=0` cho target (VD NPC ở +100 nhận gift), WHEN
`resolve_turn_affinity` chạy, THEN (a) trả `{}`, không side-effect; (b)
KHÔNG ghi field `affinity_delta_[npc_id]` nào (nhất quán `has_signal`
của World Memory) NHƯNG streak tracker của `(target, gift)` VẪN tăng —
spam ở trần vẫn tích fatigue. *(unit)*

### Edge Cases

**AC-23** (Undo — hoàn tác TOÀN BỘ delta + streak + Song Tu state):
GIVEN snapshot X gồm `{affinity các NPC, streak trackers, tập Song Tu
active}`; lượt N là Song Tu ĐẦU TIÊN với npc_A (thiết lập Active, delta
+7); lượt M (test riêng) là `threaten` có lan truyền chạm 3 NPC và tăng
streak, WHEN Turn Manager Undo đúng lượt đó (mock TM, độ sâu 1), THEN
TOÀN BỘ trạng thái trở về ĐÚNG snapshot X: mọi affinity (kể cả delta
lan truyền), streak tracker quay về giá trị trước lượt, và quan hệ Song
Tu vừa thiết lập coi như CHƯA TỪNG tồn tại (tập active rỗng trở lại) —
không field nào rollback một phần. *(unit + mock Turn Manager)*

**AC-24** (giết không nhân chứng — 0 field): GIVEN `kill` với
`entities_in_scope={victim}` (0 nhân chứng), victim có 4 NPC link mạnh,
WHEN `resolve_turn_affinity` chạy, THEN trả `{}` — KHÔNG field
`affinity_delta` nào cho BẤT KỲ NPC nào (không delta trực tiếp — nạn
nhân đã chết; không lan truyền; không cruelty rep). Tội ác hoàn hảo là
thiết kế có chủ đích, test xác nhận 0 field, không xác nhận "lỗi".
*(unit, provisional-interface)*

**AC-25** (NPC chết khi Song Tu active): GIVEN npc_A và npc_B đều
Active, WHEN Death & Consequence phát sự kiện npc_A chết (mock), THEN
state npc_A → **Ended** (terminal — leo affinity lại cũng không bao giờ
rời Ended), tập active co lại `{npc_B}`, `SONG_TU_ACTIVE` vẫn = 1; WHEN
npc_B chết tiếp, THEN tập rỗng và `SONG_TU_ACTIVE=0` **từ lượt kế
tiếp** (đánh giá đầu lượt) — nguồn EXP #4 tắt. *(unit + mock D&C)*

**AC-26** (ngưỡng đúng biên 60/40/-80 + thứ tự resolve trong lượt):
GIVEN các cặp giá trị biên, WHEN kiểm tra, THEN: `affinity=+60` → nút
Song Tu HIỆN (bao gồm), `+59` → ẩn; `+40` → quan hệ Active CHƯA hủy,
`+39` → Broken (hủy khi `< +40`); `-80` → cờ thù địch sâu sắc BẬT,
`-79` → tắt. VÀ GIVEN `A_before=58`, delta +2, WHEN lượt resolve, THEN
`A_after=60` và Song Tu chuyển Locked→Available NGAY TRONG lượt đó —
D.6 resolve affinity TRƯỚC, state machine check ngưỡng SAU trên
`A_after`, cùng lượt. *(unit)*

**AC-27** (clamp tại ±100): GIVEN (a) NPC ở +100 nhận gift →
`locked_delta=0`, KHÔNG ghi field; (b) NPC ở -100 nhận insult → tương
tự 0/không field; (c) `A_before=95`, propagation dương +8 → clamp 100,
`locked_delta=+5` (không phải +8), không hiệu ứng dây chuyền sang NPC
khác; (d) Song Tu tại 97, RNG stub đổ 8 → `locked_delta=+3`. *(unit)*

**AC-28** (Song Tu RNG re-roll khi undo-làm-lại): GIVEN RNG stub inject
trả chuỗi [7, 3], NPC ở +70, WHEN Song Tu (delta +7) → Undo → Song Tu
lại, THEN RNG được GỌI LẠI đầy đủ (spy đếm 2 lần gọi), lần hai
`locked_delta=+3` — kết quả khác lần đầu là hợp lệ (tiền lệ Turn
Manager AC-12), không cache/replay roll cũ. *(unit + spy trên RNG
inject)*

**AC-29** (EXP bonus tính từ lượt KẾ TIẾP): GIVEN lượt N là Song Tu đầu
tiên thiết lập quan hệ, WHEN đọc `SONG_TU_ACTIVE` theo trạng thái ĐẦU
LƯỢT cho lượt N và lượt N+1, THEN lượt N = `0` (không có "vừa song tu
vừa nhận bonus của chính hành động đó"), lượt N+1 = `1` — loại bỏ phụ
thuộc thứ tự resolve giữa 2 hệ trong cùng lượt. *(unit)*

**AC-30** (NPC mới — khởi tạo mặc định 0): GIVEN sự kiện `gift` nhắm
NPC chưa từng được theo dõi và data NPC KHÔNG có giá trị khởi đầu, WHEN
resolve, THEN NPC được khởi tạo `affinity=0` (trung lập) TRƯỚC, rồi áp
delta bình thường → `A_after=+5`, không throw lỗi — "chưa có lịch sử"
là trạng thái hợp lệ (nhất quán World Memory AC-13). *(unit)*

**AC-31** (đối thủ combat không phải NPC theo dõi): GIVEN Combat
hand-off (`outcome=win`, `margin_ratio=0.9`) với đối thủ là quái vật
không có trong danh sách NPC theo dõi, WHEN `resolve_turn_affinity`
chạy, THEN trả `{}` — không sự kiện Hảo cảm nào sinh ra, không field
nào ghi, không lỗi (hand-off vẫn được nhận bình thường theo Combat
AC-44). *(unit)*

**AC-32** (NPC trong `linked_npcs` đã chết): GIVEN victim có link tới
npc_X (`link=+0.8`) nhưng npc_X đã chết trước đó, WHEN sự kiện đủ điều
kiện lan truyền, THEN npc_X bị BỎ QUA — không field
`affinity_delta_npc_X`, fact lịch sử của npc_X trong World Memory không
bị chạm. *(unit)*

**AC-33** (chuộc lỗi từ thù địch sâu sắc): GIVEN NPC ở `affinity=-80`
(cờ bật), WHEN áp `save_life`, THEN delta +15 ĐẦY ĐỦ (diminish factor=1
vì A≤0) → `A_after=-65`, cờ thù địch sâu sắc TẮT ngay khi `A_after ≥
-79` — đường chuộc lỗi mở, không có trạng thái khóa vĩnh viễn. *(unit)*

### Cross-System

**AC-34** (EXP & Realm Progression — boolean derived, không cộng dồn):
GIVEN hệ EXP (theo `exp-realm-progression.md` D.4, mock/inject) tiêu
thụ interface của hệ này, WHEN tập active lần lượt = `{npc_A}` và
`{npc_A, npc_B, npc_C}` với cùng `exp_threshold=340`, THEN
`song_tu_exp_bonus = 0.02×340 = 6.8` GIỐNG HỆT NHAU ở cả 2 trường hợp —
bonus không nhân theo số NPC; VÀ interface hệ này trả DANH SÁCH ID (EXP
tự derive "khác rỗng"), public API KHÔNG có method nào trả "số bonus
theo số NPC" (interface inspection — chặn dominant strategy harem từ
tầng API). *(integration test với logic EXP, mock 2 chiều)*

**AC-35** (Death & Consequence — đọc cờ ≤ -80): GIVEN mock consumer
đóng vai Death & Consequence, WHEN đọc cờ thù địch sâu sắc qua
interface public tại affinity = -79/-80/-100, THEN nhận
`false/true/true`; VÀ cờ là GIÁ TRỊ DERIVED từ affinity hiện hành (đổi
affinity → cờ đổi ngay trong cùng lượt sau B3), consumer không cần đọc
số thô để tự so ngưỡng — ngưỡng -80 sở hữu bởi hệ này, không bị
duplicate sang D&C. *(unit + mock consumer)*

**AC-36** (World Memory — schema field khớp entity_id, fact extraction
đúng per NPC): GIVEN `locked_result` từ regression AC-20
(`{affinity_delta_A: -27, affinity_delta_C: -11, affinity_delta_D:
+5}`) đưa qua logic trích xuất fact của World Memory (Công thức #2,
tham chiếu WM AC-10), WHEN lượt rời recency window, THEN
`facts_extracted` tăng ĐÚNG 3 (mỗi field ≠0 → 1 fact), mỗi fact có
`entity_id` suy ra đúng từ tên field (`affinity_delta_bui_lan` →
`"bui_lan"`); VÀ mọi `npc_id` trong data NPC của hệ này pass validator
quy ước đặt tên entity_id của World Memory — không tồn tại NPC nào sinh
field không parse được. *(integration test với logic World Memory)*

**AC-37** (Contract Enforcement — khóa trước narration, không parse
ngược): GIVEN pipeline 1 lượt đầy đủ với narration_call mock, WHEN kiểm
tra bằng spy thứ tự gọi + nội dung prompt, THEN: (a) mọi field
`affinity_delta_*` đã nằm trong `locked_result` TRƯỚC thời điểm
narration_call (spy call-order); (b) payload prompt chứa DẢI thái độ +
hướng thay đổi (VD "Lạnh nhạt, xấu đi") — KHÔNG chứa số affinity thô
hay giá trị delta (assert trên nội dung prompt); (c) sửa
`narration_text` trả về thành nội dung mâu thuẫn hoàn toàn (VD "NPC vui
mừng tha thứ") rồi so sánh affinity trước/sau → KHÔNG đổi — hệ không
bao giờ parse ngược narration để chỉnh số. *(unit + mock-spy)*

**AC-38** (Tường thuật phản ánh dải thái độ — **KHÔNG test tự động
được**): GIVEN NPC ở các dải khác nhau (Thù địch sâu sắc / Trung lập /
Tri kỷ) trong build chơi thật, WHEN người chơi tương tác và đọc
narration, THEN thái độ NPC trong văn bản nhất quán với dải (NPC -85
không "niềm nở giúp đỡ", NPC +85 không "lạnh lùng đuổi đi"). **FLAG:
non-automatable** — đầu ra AI non-deterministic. Kiểm thủ công theo mô
hình 2 tầng (finding `ai-narrative-test-evidence-gap` của qa-lead):
tầng cơ học (AC-01→AC-37) = Logic/BLOCKING; tầng narrative này =
ADVISORY, kiểm bằng checklist playtest có cấu trúc (mỗi dải ≥ 3 mẫu
narration, 2 lượt đánh giá độc lập chấm consistent/inconsistent, đạt
khi ≥ 90% consistent), evidence lưu `production/qa/evidence/`. *(manual
— ADVISORY)*

## Open Questions

- **Taxonomy sự kiện xã hội chính thức** (`gift`/`small_help`/`insult`...
  hiện là danh mục đề xuất của GDD này) + cờ `spar_friendly` phân biệt
  đấu thân thiện/địch ý — cần Situation/Encounter Generation chuẩn hóa
  khi thiết kế. *(Owner: narrative-director + systems-designer, target:
  `/design-system situation-encounter-generation`)*
- **Ràng buộc content-gating chống ratchet** (không positive event
  on-demand mọi lượt; Song Tu gate qua bối cảnh) đã ghi ở Dependencies —
  cần kiểm chứng được tôn trọng khi GDD Situation Gen viết xong.
  *(Owner: economy-designer review, target: `/design-review` của GDD đó)*
- **Quy ước làm tròn `round-half-away-from-zero`** — quyết định kỹ thuật
  chưa có tiền lệ registry/coding-standards; cần chuẩn hóa toàn dự án
  (EXP hiện cũng round). *(Owner: technical-director, target: trước
  `/create-architecture`, nên vào `coding-standards.md`)*
- **Data `link_strength` + Hảo cảm khởi đầu cụ thể cho 3 NPC MVP** (1
  thù địch, 1 preset ≥ +60, 1 trung lập) — authoring content. *(Owner:
  narrative-director + world-builder, target: trước khi viết NPC data
  cho vertical slice)*
- **Free-kill không nhân chứng**: đã chốt chấp nhận nguyên trạng
  (2026-08-03) như quyết định thiết kế thế-giới-khách-quan; phương án
  "NPC điều tra ra sau N lượt" bị loại vì mâu thuẫn tinh thần
  không-decay. Ghi lại để không tranh luận lại. *(Closed — quyết định
  người dùng)*
- **Nếu tương lai muốn EXP bonus cộng dồn theo số NPC Song Tu**: phải
  revise `exp-realm-progression.md` D.4 (hiện boolean) + đánh giá lại
  dominant strategy — không phải chỉnh knob. *(Owner: game-designer,
  target: khi có yêu cầu thật)*
