# Equipment & Skill Data System

> **Status**: **Approved** (`/design-review` 2026-08-02 — 1 blocking + 1 recommended sửa cùng phiên, không cần re-review; xem `reviews/equipment-skill-data-system-review-log.md`). Header trước đó ghi nhầm "In Design" dù review đã đóng từ 2026-08-02 — sửa lại cho khớp review-log, 2026-08-10.
> **Author**: user + agents
> **Last Updated**: 2026-08-02
> **Implements Pillar**: Pillar 3 (Sức Mạnh Có Logic), Pillar 4 (Tường Thuật Sống Động)

## Overview

Equipment & Skill Data System là tầng dữ liệu thuần định nghĩa mọi vũ khí,
kỹ năng (tâm pháp/võ công gốc), và "thức" (chiêu cụ thể có tên riêng thuộc
về một kỹ năng gốc) trong game — không chứa logic tính toán (Lực chiến,
sát thương thuộc về Combat System), chỉ là schema + dữ liệu instance cho
từng vũ khí/kỹ năng/thức cụ thể. Combat System đọc dữ liệu này để tính
toán, Character Card & Identity đọc để hiển thị cho người chơi.

Cấu trúc cốt lõi được kiểm chứng qua prototype
(`prototypes/khe-uoc-ai-concept/`, verdict PROCEED): một kỹ năng gốc (VD
"Lưu Vân Kiếm Pháp") sở hữu nhiều thức — mỗi thức có tên riêng biệt (VD
"Lưu Vân Nhất Thức", "Lưu Vân Nhị Thức"), dùng trong Combat với quy tắc
không lặp THỨC trong cùng 1 trận (nhưng kỹ năng gốc có thể "tái xuất" qua
thức khác). Một số họ kỹ năng dùng chung tên gốc trên nhiều loại vũ khí
khác nhau, khác biệt ở phong cách thực hiện (VD "Lưu Vân Kiếm" uyển
chuyển vs "Lưu Vân Đao" mạnh mẽ) — đã kiểm chứng AI phân biệt đúng khi dữ
liệu đặc tả rõ ràng.

Với người chơi, đây là lớp tạo nên "chất riêng" của từng nhân vật — tên vũ
khí, tên chiêu, phong cách thi triển là những gì thực sự xuất hiện trong
văn tường thuật (Pillar 4) và trên Character Card, khác hẳn những con số
ẩn của Lực chiến. Một hệ thống vũ khí/kỹ năng có tên gọi đặc sắc, nhất
quán, không lặp lại nhàm chán trong một trận đấu chính là thứ khiến mỗi
trận chiến "đọc" khác nhau dù công thức thắng thua giống hệt — đây là chỗ
Pillar 3 (Sức Mạnh Có Logic, đến từ Combat System) và Pillar 4 (Tường
Thuật Sống Động) gặp nhau qua một tầng dữ liệu chung.

## Player Fantasy

Người chơi trực tiếp cảm nhận hệ thống này ở hai điểm chạm: khi mở
Character Card xem vũ khí/kỹ năng đang sở hữu, và khi đọc đoạn văn tường
thuật một trận đấu gọi tên từng thức cụ thể vừa dùng. Cảm giác đúng là
NHẬN DIỆN được — không phải "nhân vật đánh một đòn mạnh" chung chung, mà
là "Lưu Vân Nhất Thức xé gió lao tới", gắn liền với đúng vũ khí, đúng kỹ
năng gốc, đúng phong cách của môn phái/dòng công pháp đó. Một trận đấu
dùng lặp lại thức cũ, hay một chiêu thức không khớp phong cách vũ khí, sẽ
ngay lập tức phá vỡ cảm giác "nhân vật này có bản sắc riêng" — dù Lực
chiến tính đúng 100%.

Đây cũng là nơi người chơi cảm nhận SỰ TRƯỞNG THÀNH của nhân vật một cách
cụ thể: có thêm thức mới, đổi vũ khí bậc cao hơn, không chỉ là con số ATK
tăng lên mà là một cái tên chiêu thức mới xuất hiện trong văn tường thuật
lần đầu — biến tiến triển sức mạnh (Pillar 3) thành một khoảnh khắc kể
chuyện (Pillar 4), không phải một dòng log số liệu.

## Detailed Rules

### Core Rules

1. **Ba tầng dữ liệu, phân cấp**: Vũ khí (loại vũ khí + instance cụ thể)
   → Kỹ năng (mỗi kỹ năng gắn với đúng 1 LOẠI vũ khí) → Thức (mỗi thức
   thuộc đúng 1 kỹ năng, tối thiểu 1 thức/kỹ năng).
2. **Họ kỹ năng (optional, cosmetic grouping)**: liên kết các kỹ năng
   cùng tên gốc trên nhiều loại vũ khí khác nhau (VD "Lưu Vân" → "Lưu Vân
   Kiếm Pháp" + "Lưu Vân Đao Pháp") qua field `family_id` (string, optional
   — rỗng/null nếu kỹ năng không thuộc họ nào) — mỗi kỹ năng trong cùng họ
   vẫn là entry riêng, có `style_descriptor` riêng (đã kiểm chứng ở
   prototype: AI phân biệt đúng phong cách khi có mô tả rõ).
3. **ID thức duy nhất TOÀN CỤC** (không chỉ trong phạm vi 1 kỹ năng) —
   bắt buộc để Combat System triển khai quy tắc "không lặp thức trong 1
   trận" (runtime rule thuộc Combat GDD; hệ này chỉ đảm bảo ID ổn định,
   duy nhất làm nền tảng).
4. **`style_descriptor`** — đoạn mô tả ngắn (phong cách thi triển, VD
   "uyển chuyển, nhẹ nhàng như mây trôi" vs "mạnh mẽ, dứt khoát như núi
   lở") gắn ở cấp Kỹ năng — dùng để feed vào prompt AI tường thuật qua
   wrapper của Mechanic/Narration Contract Enforcement. Đây là văn bản
   định hướng phong cách, KHÔNG phải số liệu/kết quả khóa.
5. **Trường `tier` (bậc)** trên cả Vũ khí lẫn Kỹ năng — số nguyên đơn
   giản, khớp hệ thống Cảnh giới (10 cấp/bậc) sẽ được định nghĩa đầy đủ ở
   EXP & Realm Progression. Hệ này CHỈ lưu trường số nguyên này — không
   tính phạt vượt bậc (thuộc Combat System).
6. **Sở hữu ở cấp Character**: mỗi nhân vật (chính hoặc NPC) có đúng 1 vũ
   khí đang trang bị (`equipped_weapon_id`) + danh sách kỹ năng đã học
   (`known_skill_ids`, có thể rỗng). KHÔNG có inventory đầy đủ (kho đồ,
   mang nhiều vũ khí) ở MVP — ngoài phạm vi hệ này. **Làm rõ 2026-08-10**
   (`/design-review character-continuation.md` round 2): mỗi bản ghi sở
   hữu này khóa theo `char_id` (cùng định danh Character Card & Identity
   dùng) — không phải 1 slot dữ liệu "nhân vật chính" toàn cục duy nhất;
   khi Character Continuation phát `char_id` MỚI (playthrough "Chơi
   lại"), hệ này khởi tạo bản ghi độc lập, không ghi đè bản ghi của
   `char_id` CŨ (xem AC-18).
7. **Dữ liệu là template tĩnh, không phải trạng thái runtime**: HP/EXP
   hiện tại của nhân vật KHÔNG lưu ở đây (thuộc Character Card/EXP
   system). Hệ này chỉ trả lời "vũ khí/kỹ năng/thức NÀY có thuộc tính
   gì" — không trả lời "nhân vật NÀO đang có bao nhiêu HP".

8. **Vật phẩm hồi phục (recovery item)** — bổ sung 2026-08-05, đóng gap
   cụm D `/design-review` gộp 11 GDD: một danh mục dữ liệu TÁCH BIỆT với
   Vũ khí/Kỹ năng/Thức (không đi qua 3 tầng phân cấp ở Rule #1) — chỉ
   phục vụ nhánh "tiên thảo dị bảo" của `death-and-consequence.md`
   Formula D.3. Schema tối thiểu: `{item_id, efficacy}`.
   `efficacy: float`, range `[0,1]` — hệ số hiệu lực hồi phục, BẮT BUỘC
   do tác giả item tự khai khi authoring, KHÔNG có giá trị default của
   engine (item không khai `efficacy` không hợp lệ để dùng ở nhánh này).
   Mô hình tiêu thụ (single-use hay có "charge") CHƯA quyết — xem Open
   Questions của `death-and-consequence.md`.

### States and Transitions

Hệ thống này không có state machine (dữ liệu tĩnh, không phải luồng xử
lý). Thay vào đó là các quan hệ cấu trúc dữ liệu bắt buộc:

| Quan hệ | Bản chất | Ràng buộc |
|---|---|---|
| Vũ khí (loại) → Kỹ năng | 1–nhiều | Mỗi kỹ năng thuộc đúng 1 `weapon_type` |
| Kỹ năng → Thức | 1–nhiều | Mỗi thức thuộc đúng 1 kỹ năng; N≥1 thức/kỹ năng |
| Họ kỹ năng → Kỹ năng | 1–nhiều, optional | 1 họ có thể chỉ có 1 kỹ năng (chưa mở rộng sang vũ khí khác) |
| Character → Vũ khí | 1–1 (equipped) | `equipped_weapon_id`, chỉ 1 vũ khí trang bị/thời điểm ở MVP |
| Character → Kỹ năng | 1–nhiều | `known_skill_ids` |

Ràng buộc toàn vẹn: không được tồn tại 1 Thức không có Kỹ năng cha; không
được tồn tại 1 Kỹ năng không có `weapon_type` hợp lệ.

### Interactions with Other Systems

- **Combat System** (Feature, đã Designed): đọc dữ liệu vũ khí/kỹ
  năng/thức để tính Lực chiến (Điểm Trang bị + Điểm Kỹ năng, theo Core
  Mechanics #2 của `game-concept.md`) và chọn thức khi tường thuật;
  triển khai runtime rule "không lặp thức trong 1 trận" dựa trên ID ổn
  định hệ này cung cấp.
- **Character Card & Identity** (Presentation, đã Designed): đọc
  `equipped_weapon` + `known_skill_ids` để hiển thị trên thẻ nhân vật.
- **Mechanic/Narration Contract Enforcement** (Foundation, đã Designed):
  `style_descriptor` là dữ liệu ngữ cảnh (context) được đưa vào prompt
  qua wrapper — KHÔNG phải `locked_result` cơ học, nên nằm NGOÀI phạm vi
  leak-detection (Formula 1 của hệ đó chỉ áp dụng cho số liệu cơ học đã
  khóa, không áp dụng cho text mô tả phong cách).
- **Death & Consequence** (Feature, đã Designed) — bổ sung 2026-08-05:
  đọc field `efficacy` trên schema "Vật phẩm hồi phục" (Rule #8) cho
  `recovery_attempt` Formula D.3 nhánh tiên thảo dị bảo — phụ thuộc mềm,
  KHÔNG đi qua 3 tầng Vũ khí/Kỹ năng/Thức.
- **EXP & Realm Progression** (Feature, đã Designed): ý nghĩa đầy đủ
  của trường `tier` (bậc) — hệ này chỉ lưu số nguyên, không định nghĩa ý
  nghĩa/công thức. Không phải phụ thuộc bắt buộc (hệ này hoạt động độc
  lập với 1 số nguyên đơn giản), nhưng cần đối chiếu khi EXP GDD được
  viết để đảm bảo cùng thang đo (10 cấp/bậc).

## Formulas

*(Hệ này KHÔNG sở hữu công thức cân bằng gameplay — Lực chiến/sát thương
thuộc Combat System, phạt vượt bậc thuộc Combat System, tốc độ EXP thuộc
EXP & Realm Progression. Cả 2 formula dưới đây là validation/data-integrity
— cùng loại với `numeric_leak_detection` của Mechanic/Narration Contract
Enforcement, không phải balance math.)*

**1. Thức Pool Sufficiency Check** (phát hiện sớm thiếu dữ liệu thức)

`is_pool_sufficient(skill) = thuc_count(skill) ≥ max_invocations_per_battle`

| Variable | Type | Range | Description |
|---|---|---|---|
| thuc_count(skill) | int | 1–∞ | Số thức thuộc 1 kỹ năng (dữ liệu của hệ này) |
| max_invocations_per_battle | int | 1–∞ (external) | Số lần tối đa Combat System cho phép gọi 1 kỹ năng trong 1 trận — placeholder, thuộc Combat GDD, CHƯA được định nghĩa (xem Open Questions) |
| is_pool_sufficient | bool | {true, false} | Pool thức có đủ để thỏa quy tắc không-lặp-thức-trong-trận của Combat hay không |

**Output**: boolean, không clamp.
**Example**: Kỹ năng "Lưu Vân Kiếm Pháp" có 3 thức; giả sử Combat sau này
định nghĩa `max_invocations_per_battle=5` cho trận giằng co dài →
`is_pool_sufficient = false` — cảnh báo thiếu dữ liệu (cần ≥5 thức) TRƯỚC
khi kỹ năng đó được đưa vào game, không phải phát hiện lúc runtime.

**2. Global Thức ID Uniqueness Validation** (toàn vẹn dữ liệu)

`is_valid_dataset = (|all_thuc_ids| == |unique(all_thuc_ids)|) AND (∀ thức, thức.skill_id ∈ valid_skill_ids) AND (∀ skill, skill.weapon_type ∈ valid_weapon_types)`

| Variable | Type | Range | Description |
|---|---|---|---|
| all_thuc_ids | set | — | Toàn bộ ID thức trên mọi kỹ năng/vũ khí |
| valid_skill_ids | set | — | Toàn bộ ID kỹ năng hợp lệ đã định nghĩa |
| valid_weapon_types | set | — | Toàn bộ loại vũ khí hợp lệ đã định nghĩa |
| is_valid_dataset | bool | {true, false} | Gate toàn vẹn tham chiếu cho việc authoring/import dữ liệu |

**Output**: boolean.
**Example**: 500 entry thức, 1 ID trùng lặp giữa 2 kỹ năng không liên quan
→ `is_valid_dataset = false`, chặn commit dữ liệu (chạy như 1 lint/test
tự động khi thêm dữ liệu mới, không phải kiểm tra thủ công).

## Edge Cases

- **Nếu `is_pool_sufficient(skill) = false`** (không đủ thức cho 1 kỹ
  năng): đây là cảnh báo ở giai đoạn AUTHORING dữ liệu (content warning),
  không phải lỗi runtime chặn game chạy. Cách Combat System xử lý khi
  thực sự hết thức để chọn (lặp lại, hay dùng thức "dự phòng") là quyết
  định của Combat GDD — hệ này chỉ cung cấp tín hiệu cảnh báo sớm.
- **Nếu nhân vật có `known_skill_ids` rỗng** (chưa học kỹ năng nào, VD
  NPC mới tạo hoặc nhân vật chính giai đoạn đầu): vẫn hợp lệ — mọi nhân
  vật LUÔN có quyền truy cập kỹ năng "Đánh thường" (basic attack) ngầm
  định KHỚP với `weapon_type` của `equipped_weapon_id` hiện tại, không cần
  khai báo trong `known_skill_ids`. Combat System không bao giờ gặp tình
  huống "0 thức khả dụng".
  **Cấu trúc dữ liệu**: "Đánh thường" KHÔNG phải 1 entry kỹ năng duy nhất
  dùng chung cho mọi vũ khí (sẽ vi phạm Core Rule #1 — mỗi kỹ năng gắn
  đúng 1 `weapon_type`) — mà là MỘT entry "Đánh thường" riêng cho MỖI
  `weapon_type` hợp lệ trong game (VD "Đánh thường - Kiếm", "Đánh thường -
  Đao"...). Mỗi entry này tuân thủ Core Rule #1 bình thường (đúng 1
  `weapon_type`) và được TỰ ĐỘNG coi là "đã học" đối với MỌI Character có
  `equipped_weapon_id` khớp `weapon_type` đó, bất kể có mặt trong
  `known_skill_ids` hay không — không cần ngoại lệ nào cho Core Rule #1.
- **Nếu `equipped_weapon_id` không khớp `weapon_type` của bất kỳ kỹ năng
  nào trong `known_skill_ids`** (VD nhân vật đổi vũ khí mới nhưng chưa
  học kỹ năng tương ứng): vẫn là trạng thái dữ liệu HỢP LỆ — không phải
  lỗi. Nhân vật chỉ dùng được entry "Đánh thường" khớp `weapon_type` của
  vũ khí hiện tại (xem cấu trúc dữ liệu ở trên) cho đến khi học kỹ năng
  khớp vũ khí mới; đây là tiến trình unlock bình thường, không cần
  validation chặn.
- **Nếu 2 kỹ năng khác nhau (khác ID) có cùng tên hiển thị cho 1 thức**
  (VD 2 môn phái khác nhau cùng đặt tên chiêu "Nhất Thức"): CHO PHÉP —
  tên hiển thị không cần duy nhất toàn cục (hợp lý với thể loại tu tiên,
  nhiều môn phái có thể trùng tên chiêu). Chỉ ID (Formula 2) mới bắt buộc
  duy nhất, không phải display name.
- **Nếu `tier` của vũ khí và `tier` của kỹ năng đang dùng không khớp
  nhau** (VD vũ khí bậc 2 nhưng kỹ năng bậc 4): CHO PHÉP ở tầng dữ liệu —
  đây là input hợp lệ cho công thức phạt vượt bậc của Combat System (hệ
  đó xử lý hậu quả), không phải lỗi cần chặn ở tầng data.
- **Nếu dữ liệu vi phạm Formula 2 (`is_valid_dataset = false`)** (ID
  trùng, hoặc tham chiếu `skill_id`/`weapon_type` không tồn tại): đây LÀ
  lỗi chặn — không được phép đưa dữ liệu này vào game (chặn ở bước
  authoring/CI, không phải một trạng thái gameplay hợp lệ như 5 mục
  trên).

## Dependencies

**Phụ thuộc vào** (upstream): Không có — Equipment & Skill Data System là
hệ thống Foundation, zero dependencies (khớp `systems-index.md`).

**Các hệ thống phụ thuộc vào Equipment & Skill Data System** (downstream),
kèm giao diện dữ liệu cụ thể:

- **Combat System** (Feature, đã Designed) — đọc `weapon.tier`,
  `skill.tier`, `skill.style_descriptor`, danh sách `thức` (kèm
  `thuc_id` duy nhất) để tính Lực chiến và chọn thức khi tường thuật; đọc
  `is_pool_sufficient` làm tín hiệu QA khi author nội dung kỹ năng mới.
- **Character Card & Identity** (Presentation, đã Designed) — đọc
  `equipped_weapon_id` + `known_skill_ids` của 1 Character để hiển thị
  trên thẻ nhân vật.

*(Không có phụ thuộc bắt buộc tới EXP & Realm Progression hay
Mechanic/Narration Contract Enforcement — xem ghi chú "tier" và
"style_descriptor" ở Interactions with Other Systems; đó là các điểm đối
chiếu ngữ nghĩa khi các hệ đó được viết, không phải cạnh phụ thuộc cứng.)*

*(Khi các GDD của Combat System và Character Card & Identity được viết,
cần đối chiếu ngược lại: mỗi hệ phải liệt kê "phụ thuộc Equipment & Skill
Data System" trong Dependencies của chính nó — nếu không sẽ là phụ thuộc
một chiều, cần sửa.)*

## Tuning Knobs

| Knob | Default | Safe Range | Ảnh hưởng nếu chỉnh |
|---|---|---|---|
| `min_thuc_per_skill` | 3 | 1–10 | Số thức tối thiểu bắt buộc khi author 1 kỹ năng mới. Quá thấp (1-2) → dễ vi phạm `is_pool_sufficient` với trận đấu dài (Combat lặp kỹ năng nhiều lần); quá cao (>6) → tốn công author tên/style cho mỗi kỹ năng mới, làm chậm tiến độ content. |
| `max_known_skills_per_character` | 6 | 3–12 | Giới hạn số kỹ năng 1 nhân vật có thể biết cùng lúc. Quá thấp → nhân vật cảm giác đơn điệu, thiếu lựa chọn; quá cao (>12) → khó hiển thị gọn trên Character Card (di động), và AI khó chọn đúng kỹ năng phù hợp ngữ cảnh khi danh sách quá dài. |

## Visual/Audio Requirements

[To be designed]

## UI Requirements

[To be designed]

## Acceptance Criteria

**Core Rules**
- **AC-01** (R1): GIVEN 1 thức bất kỳ trong dataset, WHEN kiểm tra
  `skill_id` của nó, THEN thức đó thuộc đúng 1 kỹ năng tồn tại (không 0,
  không nhiều hơn 1).
- **AC-02** (R2): GIVEN 1 họ kỹ năng (skill family) có ≥2 kỹ năng, WHEN
  so sánh `weapon_type` của các kỹ năng trong họ, THEN mỗi kỹ năng vẫn
  giữ `style_descriptor` riêng dù cùng tên gốc.
- **AC-03** (R3): GIVEN toàn bộ `thuc_id` trong dataset, WHEN so sánh
  trên phạm vi TOÀN CỤC (không giới hạn 1 kỹ năng), THEN không có 2 thức
  trùng ID.
- **AC-04** (R4): GIVEN 1 kỹ năng bất kỳ, WHEN đọc field
  `style_descriptor`, THEN giá trị là text mô tả phong cách (không phải
  số liệu khóa).
- **AC-05** (R5): GIVEN 1 vũ khí và 1 kỹ năng bất kỳ, WHEN đọc field
  `tier`, THEN cả hai đều có giá trị số nguyên hợp lệ (không null, không
  âm).
- **AC-06** (R6): GIVEN 1 Character, WHEN đọc dữ liệu sở hữu, THEN có
  đúng 1 `equipped_weapon_id` và 1 danh sách `known_skill_ids` (có thể
  rỗng).
- **AC-07** (R7): GIVEN schema Weapon/Skill/Thức, WHEN kiểm tra các
  field, THEN không tồn tại field HP/EXP runtime nào trong dataset này.

**Toàn vẹn quan hệ dữ liệu**
- **AC-08** (no orphan thức): GIVEN mọi thức trong dataset, WHEN
  `skill_id` được đối chiếu với `valid_skill_ids`, THEN mọi thức có kỹ
  năng cha hợp lệ — 0 thức mồ côi.
- **AC-09** (weapon_type hợp lệ): GIVEN mọi kỹ năng, WHEN `weapon_type`
  được đối chiếu với `valid_weapon_types`, THEN mọi kỹ năng tham chiếu 1
  loại vũ khí đã định nghĩa.

**Formulas**
- **AC-10** (F1, false case): GIVEN 1 kỹ năng có `thuc_count = 3` và
  `max_invocations_per_battle = 5` (giá trị Combat GDD cung cấp), WHEN
  chạy `is_pool_sufficient`, THEN kết quả = false (cảnh báo authoring,
  không chặn build).
- **AC-11** (F1, boundary) — **đã gỡ BLOCKED**: `combat-system.md` Formula
  D.12 đã định nghĩa `max_invocations_per_battle = 5`. GIVEN
  `thuc_count == 5` (bằng nhau chính xác), WHEN chạy `is_pool_sufficient`,
  THEN kết quả = true (dùng `≥`, không phải `>`). *(Gỡ BLOCKED tại
  `/design-system combat-system` 2026-08-02.)*
- **AC-12** (F2): GIVEN dataset có 1 `thuc_id` trùng lặp giữa 2 kỹ năng,
  WHEN chạy `is_valid_dataset`, THEN kết quả = false và pipeline
  authoring/CI chặn commit.

**Edge Cases — trạng thái HỢP LỆ (không phải lỗi)**
- **AC-13**: GIVEN `known_skill_ids` rỗng, WHEN Character được đọc, THEN
  vẫn có ≥1 kỹ năng khả dụng (basic attack ngầm định), không lỗi.
- **AC-14**: GIVEN `equipped_weapon_id` không khớp `weapon_type` của bất
  kỳ kỹ năng nào trong `known_skill_ids`, WHEN validate Character, THEN
  trạng thái vẫn hợp lệ (chỉ giới hạn dùng basic attack).
- **AC-15**: GIVEN 2 thức khác ID nhưng cùng display name, WHEN validate
  dataset, THEN không bị flag lỗi.
- **AC-16**: GIVEN `tier` vũ khí ≠ `tier` kỹ năng đang dùng, WHEN
  validate Character, THEN không bị chặn ở tầng data.

**Edge Case — trạng thái CHẶN CỨNG**
- **AC-17** (= AC-12): GIVEN vi phạm Formula 2, WHEN chạy CI/authoring
  lint, THEN dữ liệu bị chặn, không được merge.

**Cross-system: Character Continuation lazy-init contract**
- **AC-18** (Rule #6 mở rộng — lazy-init theo `char_id` cho nhân vật
  chính khi "Chơi lại"; đóng Open Question BLOCKING của
  `character-continuation.md` D.1, thêm 2026-08-10, `/design-review
  character-continuation.md` round 2, narrow verify pass — Lớp A, kỹ
  thuật "dirty old slot first", mirror `death-and-consequence.md`
  AC-13/AC-36): GIVEN `char_id` CŨ đã bị làm bẩn (mock trả
  `equipped_weapon_id="thiet_kiem_hoen_ri",
  known_skill_ids=["luu_van_kiem_phap_tam"]` — khác loadout khởi điểm
  mẫu chuẩn MVP), WHEN Character Continuation phát `char_id` MỚI cho
  nhân vật chính (mock, chưa từng xuất hiện) và hệ này được truy vấn
  `equipped_weapon_id`/`known_skill_ids` của `char_id` đó lần đầu, THEN
  trả về ĐÚNG loadout khởi điểm mẫu chuẩn MVP — KHÔNG PHẢI giá trị đã
  làm bẩn ở `char_id` CŨ (chứng minh dữ liệu sở hữu ở Rule #6 lưu
  keyed-by-`char_id`, không phải 1 record "nhân vật chính" toàn cục duy
  nhất bị ghi đè tại chỗ). GIVEN cùng fixture, WHEN đọc lại `char_id` CŨ
  sau đó, THEN vẫn trả giá trị đã làm bẩn — không bị ảnh hưởng bởi việc
  tạo `char_id` MỚI. *(unit, provisional-interface)*

## Open Questions

- ~~`max_invocations_per_battle` chưa tồn tại (thuộc Combat GDD) — chặn
  AC-11 (boundary test của Formula 1) cho đến khi được định nghĩa.~~ —
  **đã giải quyết**: `combat-system.md` Formula D.12 định nghĩa
  `max_invocations_per_battle = ceil(MAX_EXCHANGE_COUNT /
  max_known_skills_per_character) = 5`, kèm giải thích rõ "Đánh thường"
  được miễn trừ hoàn toàn khỏi giới hạn này và khỏi quy tắc không-lặp-thức.
  *(Đóng tại `/design-system combat-system` 2026-08-02.)*
- **Danh sách loại vũ khí (`weapon_type`) cho MVP chưa chốt** (VD: Kiếm,
  Đao, Quyền...) — cần liệt kê cụ thể trước khi author dữ liệu thật cho 1
  nhân vật chính + 3 NPC theo `game-concept.md` MVP Definition #1/#3.
  *(Owner: game-designer, target: trước khi author content thật)*
- **Định nghĩa canonical cho từng entry "Đánh thường" theo `weapon_type`
  (basic attack fallback)** — cấu trúc dữ liệu đã chốt tại `/design-review`
  2026-08-02 (N entry riêng theo `weapon_type`, tự động "đã học", xem Edge
  Cases): mỗi entry tuân thủ Core Rule #1 bình thường. Còn lại: tên hiển
  thị, `style_descriptor`, và số thức cụ thể cho từng entry chưa chốt.
  *(Owner: game-designer, target: trước khi author content thật)*
- **Thang đo `tier` chưa đối chiếu với hệ Cảnh giới (10 cấp/bậc)** của
  EXP & Realm Progression — cần xác nhận cùng đơn vị đo khi GDD đó được
  viết (xem Interactions with Other Systems). *(Owner: systems-designer,
  target: `/design-system exp-realm-progression`)*
- **Có cần thêm metadata khác cho thức (VD: hệ/element, animation tag)
  hay không** — hiện tại schema chỉ có tên + style_descriptor + tier; đủ
  cho MVP nhưng có thể cần mở rộng ở Vertical Slice nếu Combat System cần
  thêm dữ liệu phân loại. *(Owner: systems-designer, target: sau khi
  Combat GDD hoàn tất, xem có thiếu field không)*
