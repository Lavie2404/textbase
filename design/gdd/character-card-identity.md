# Character Card & Identity

> **Status**: **Approved** (2026-08-11 — 4 Open Question liên-hệ-thống #10-13 [điều kiện Approve duy nhất còn lại sau round 2/2] đã đóng qua cascade 4 tài liệu + 3 quyết định user; không phát sinh mâu thuẫn ngược, đúng tiêu chí "không cần vòng 3" của round 2; user xác nhận Approved qua `AskUserQuestion` — xem `reviews/character-card-identity-review-log.md`)
> **Author**: duchx + Claude Code agents (ux-designer, game-designer routing)
> **Last Updated**: 2026-08-11 — đóng OQ #10-13 (storage chốt theo Persistence [đã khóa 2026-08-05, đối chiếu lại]; alias TĨNH MVP theo cam kết Setting & Canon; hint được AI/LLM + Contract Enforcement cam kết tiêu thụ; Rule #2 hạ phạm vi "chỉ nhân vật có char_id"); thêm OQ #14 (durability timing, hẹp)
> **Implements Pillar**: Pillar 4 (Tường Thuật Sống Động — bề mặt số liệu duy nhất), Pillar 1 (Thế Giới Khách Quan — đặc quyền xuyên không chỉ là thông tin)

## Overview

Character Card & Identity là bề mặt hiển thị số liệu **duy nhất** của toàn bộ
trò chơi và là "đặc quyền người chơi" được định nghĩa từ game-concept: mỗi
nhân vật quan trọng (nhân vật chính lẫn NPC) có một thẻ nhân vật xem được bất
cứ lúc nào, cho phép người chơi nhìn thấy sự thật cơ học khách quan (chỉ số,
Hảo cảm, trạng thái sống/chết) thay vì chỉ suy đoán qua văn tường thuật. Về
mặt kiến trúc, hệ này là một **tầng hiển thị đọc-only**: nó không tính toán
hay sở hữu logic gameplay nào, mà tổng hợp dữ liệu đã được 9 hệ khác tính và
khóa — Hồ sơ danh tính (tên/giới tính/thân phận, quy tắc cải trang từ Setting
& Canon), Chỉ số chiến đấu (12 chỉ số + Cấp độ-Bậc từ EXP & Realm, Lực chiến
ước tính từ Combat), trang bị/kỹ năng (từ Equipment & Skill Data), Hảo cảm +
nút Song Tu (từ NPC Affinity), dấu trạng thái vĩnh viễn (chết/phế đan điền +
nút Hồi phục từ Death & Consequence), và vị trí hiện tại (từ Situation Gen).
Hai ngoại lệ có chủ đích so với vai trò đọc-only: hệ này **sở hữu** bộ chỉ số
khởi điểm `base_X0` của mỗi nhân vật (hạt giống mà `stat_growth` của EXP xây
lên) và **schema NPC tag** nội dung (trong đó có `npc_tag.medium_override` mà
Death & Consequence cần). Nếu thiếu hệ này, số thô sẽ không có nơi hiển thị
hợp lệ và tràn vào văn tường thuật — vi phạm trực tiếp Khế Ước Cơ Học/Tường
Thuật (Contract Enforcement Core Rule #4) và Pillar 4; đồng thời người chơi
mất công cụ ra quyết định chiến lược cốt lõi (đánh giá đối thủ trước khi cam
kết giao chiến — nơi agency thật sự của chiến đấu nằm ở khâu chuẩn bị).

## Player Fantasy

Cảm giác nhắm tới: **"thần thức" của riêng người chơi** — trong một thế giới
chỉ nói với bạn bằng văn chương, mở thẻ nhân vật là khoảnh khắc duy nhất bạn
được nhìn xuyên qua lớp mực để thấy xương cốt cơ học của sự thật. NPC có thể
khiêm tốn, khoác lác, hay cải trang; văn tường thuật có thể mơ hồ đầy ẩn ý —
nhưng con số trên thẻ không bao giờ nói dối. Đây là điểm neo cảm xúc của cả
Khế Ước: người chơi *tin* thế giới này công bằng (Pillar 1) chính vì lúc nào
cũng có thể mở thẻ ra đối chiếu.

Ba khoảnh khắc neo (anchor moments):

1. **Soát địch trước khi rút kiếm** — đứng trước một đối thủ lạ, mở thẻ của
   hắn, đọc Cấp độ-Bậc và Lực chiến ước tính, rồi tự quyết: đánh, lùi, hay
   chuẩn bị thêm. Toàn bộ agency chiến đấu nằm ở khoảnh khắc đọc thẻ này
   (game-concept: agency nằm ở CHUẨN BỊ và CAM KẾT, không ở phân định kết
   quả). Cảm giác: một tay cờ bạc đếm bài công khai — biết mình đang cược gì.
2. **Đặc quyền xuyên không** — thấy "Vương Đông" nhưng thẻ ghi rõ danh tính
   thật bên dưới lớp cải trang. Cảm giác thông đồng với định mệnh: *mình biết
   một bí mật cả thế giới không biết* — nhưng chỉ là biết, thế giới không vì
   thế mà nể mình (Pillar 1). Ngược lại, gặp NPC thường "đang che giấu" mà
   thẻ không nói gì thêm — cảm giác tò mò, chờ thời cơ thử sức (sửa
   2026-08-10 — bản cũ hứa "muốn điều tra", nhưng MVP không có cơ chế điều
   tra hoàn thành nào cho concealment [xem Rule #9 + Open Question #1];
   counterplay duy nhất ở MVP là giao chiến, tự lộ thực lực thật qua HP —
   xem Edge Cases. Lời hứa cũ không có gì đỡ, sửa để khớp phạm vi thật).
3. **Cuốn hộ chiếu của đời tu luyện** — thẻ của chính mình dày lên theo thời
   gian: cấp tăng, chỉ số nhích từng dòng, kỹ năng mới xuất hiện, Hảo cảm
   từng NPC đổi dải. Và khi đời tu luyện sang trang xấu: dấu triện đỏ son
   "phế đan điền" nằm lì trên thẻ mỗi lần mở — nỗi đau nhìn thấy được, không
   cần ai kể lại.

Đây là hệ "người chơi yêu thích việc mở ra xem" chứ không phải hạ tầng vô
hình — tần suất mở thẻ cao là tín hiệu thiết kế THÀNH CÔNG (người chơi đang
ra quyết định dựa trên dữ liệu), không phải tín hiệu UI thất bại. Phục vụ
trực tiếp Bartle Achievers (theo dõi tiến độ tối ưu Lực chiến) và Explorers
(điều tra danh tính/dò thực lực che giấu).

## Detailed Design

### Core Rules

1. **Tầng hiển thị đọc-only**: Thẻ không tính toán giá trị gameplay, không
   ghi world-state. Mọi giá trị hiển thị đều đọc từ trạng thái **đã khóa**
   gần nhất của hệ sở hữu — thẻ không bao giờ hiển thị giá trị trung gian
   đang trong quá trình resolve. Mở thẻ là hành động **miễn phí**: không tốn
   lượt, không gọi AI, không làm trôi `world_time`, xem được trong mọi trạng
   thái của Turn Manager.
2. **Luật tồn tại thẻ**: Thẻ được tạo tự động (một lần, không xóa) khi nhân
   vật lần đầu **xuất hiện trong một lượt đã confirm-và-không-undo** (tức có
   entity record — blob Entity Record, storage thuộc Persistence, xem Rule
   #8a). **Phạm vi: chỉ nhân vật có `char_id`** *(hạ phạm vi 2026-08-11,
   đóng Open Question #13, quyết định user: đối thủ ambient VÔ DANH sinh
   thủ tục — Situation Gen D.7/D.4b, "một toán cướp", "yêu thú hoang" —
   KHÔNG có `char_id`, KHÔNG có entity record, KHÔNG có thẻ; Combat tự
   dựng chỉ số cho lớp này từ `level + stat_growth` [combat-system.md
   Dependencies]. Anchor moment 1 "soát địch trước khi rút kiếm" vẫn bảo
   toàn cho lớp này ở TẦNG THIẾT KẾ, không cần thẻ: D.7 cap level ambient
   ≤ `player_level + AMBIENT_HOSTILE_LEVEL_CAP` [trần cứng ≤ +20] nên
   "nguy hiểm đọc được" giữ nguyên — đối thủ vô danh không bao giờ là bẫy
   vượt tầm)*. Với nhân vật CÓ `char_id`, điều kiện tồn tại thẻ tự động
   bao phủ ràng buộc của Combat (mọi bên tham chiến có danh tính đều đã
   xuất hiện trong lượt → luôn có thẻ đầy đủ `level`/`tier` trước khi
   trận đấu bắt đầu). Nhân vật nguyên tác chưa gặp KHÔNG có thẻ (đặc
   quyền xuyên không là kiến thức meta của người chơi, không phải danh bạ
   tra cứu trong game).
3. **Cấu trúc khối cố định** (thứ tự trên thẻ): ① Hồ sơ (Tên, Giới tính,
   Thân phận, Thái độ với nhân vật chính — chỉ thẻ NPC, tóm tắt dạng text
   ngắn (VD "Thù địch", "Thân thiết") lấy từ CÙNG NGUỒN dải thái độ 7 mức
   của khối④ (NPC Affinity) — KHÔNG phải field riêng, không thuộc
   `CONCEALABLE_FIELDS` (giống Hảo cảm số/dải thái độ ở D.2), chỉ hiển thị
   2 lần ở 2 độ chi tiết khác nhau: tóm tắt ở ①, đầy đủ (số + thanh + chấm)
   ở ④ (làm rõ 2026-08-10 — bản cũ để field này không rơi vào bất kỳ tập
   field/nguồn dữ liệu nào, rủi ro 2 chỗ hiển thị "thái độ" mâu thuẫn nhau
   trên cùng 1 thẻ, vi phạm Core Rule #4), Tính cách, Ngoại
   hình, Tiểu sử, Vị trí hiện tại); ② Chỉ số chiến đấu (Cấp độ-Bậc + 12 chỉ
   số: HP, ATK, DEF, SPD, ACC, Né tránh, Crit Rate, Crit Damage, Khuếch đại
   sát thương, Chống chịu, Lifesteal, HP Regen + Lực chiến ước tính; riêng
   thẻ nhân vật chính thêm thanh EXP "còn X EXP tới cấp kế" từ
   `exp_threshold`); ③ Trang bị & Kỹ năng (`equipped_weapon_id` +
   `known_skill_ids`, render tên hiển thị); ④ Hảo cảm & Song Tu (chỉ thẻ
   NPC: số Hảo cảm + dải thái độ 7 mức + nút Song Tu 5 trạng thái); ⑤ Khối
   "Trạng thái giao đấu" (chỉ khi `in_combat=true`: HP 2 bên dạng bước rời,
   số exchange hiện tại, banner kết cục 3 trạng thái); ⑥ Badge trạng thái
   vĩnh viễn (triện `alive=false`; khối đỏ son "phế đan điền" + nút Hồi phục
   khi `death_and_consequence_blocked=true`).
4. **Bề mặt số liệu duy nhất**: Thẻ là nơi hợp lệ DUY NHẤT hiển thị số cơ
   học thô (mặt ngược của Contract Enforcement Core Rule #4). Không khối nào
   của thẻ bị trích dẫn nguyên số vào văn tường thuật.
5. **Danh tính 2 tầng** (từ Setting & Canon): `is_major_canon=true` đang cải
   trang → khối Hồ sơ hiển thị CẢ danh tính cải trang lẫn danh tính thật
   (đặc quyền xuyên không — chỉ thông tin, không đổi world-state; NPC khác
   trong truyện vẫn bị lừa). NPC thường đang che giấu → chỉ hiển thị trạng
   thái "đang che giấu/dịch dung", **cấm lộ** danh tính/giá trị thật. Đặc
   quyền xuyên không chỉ phủ **danh tính** (tên/giới tính/thân phận thật),
   không phủ chỉ số sống.
6. **Hiển thị khi che giấu**: Khi `concealment.active=true`, thẻ render **bộ
   giá trị bề ngoài** (`concealment.displayed_*` — dữ liệu content/AI tạo
   sẵn, không phải giá trị tính) kèm badge "đang che giấu" trên từng field
   bị che; field không có giá trị bề ngoài hiện "???". Lực chiến ước tính
   khi đó tính trên bộ giá trị bề ngoài (rủi ro đánh giá sai đối thủ là chủ
   đích thiết kế) — **con số `displayed_estimate` khi đó LUÔN mang chính
   badge "đang che giấu"**, không chỉ 12 field con (sửa 2026-08-10 — bản cũ
   chỉ badge từng field, con dấu Lực chiến — số lớn nhất, nổi bật nhất thẻ,
   đúng con số anchor moment 1 bảo người chơi đọc để quyết đánh/lùi —
   không có tín hiệu gì báo nó có thể là giả; xem D.4 + Visual/Audio mục 2):
   "con số trên thẻ không bao giờ nói dối" (Player Fantasy) nghĩa là badge —
   dấu hiệu "giá trị này có thể không phải sự thật" — không bao giờ bị giấu,
   dù bản thân con số có thể sai. **Combat luôn dùng giá trị THẬT** khi
   trận đấu thực sự diễn ra — thẻ có thể "bị lừa", công thức thì không.
   **Ràng buộc kích hoạt (mới, 2026-08-10)**: `concealment.active` chỉ được
   set `true` khi content/AI đã điền đủ `concealment.displayed_value` cho
   TOÀN BỘ 12 chỉ số chiến đấu (tất-cả-hoặc-không-gì, cùng triết lý fail-fast
   D.5) — không cho phép bật che giấu với dữ liệu bề ngoài thiếu sót, vì
   khi đó D.4 lan truyền `"???"` ngay lập tức và biến ca kịch tính "bị lừa
   bởi bộ số giả hợp lý" thành "biết ngay mình không biết gì", làm mất tác
   dụng thiết kế của Rule này.
7. **Đường ghi duy nhất qua nút**: Thẻ chỉ thay đổi world-state gián tiếp
   qua các phần tử tương tác, và mọi nút đều gửi **hành động qua Turn
   Manager** như một action bình thường (tốn lượt, khóa input khi Resolving,
   undo được theo luật chung): nút Song Tu (theo máy 5 trạng thái của NPC
   Affinity), nút Hồi phục (theo điều kiện của Death & Consequence, tối đa 2
   lựa chọn). Nút bị vô hiệu khi Turn Manager đang khóa input (Resolving/
   Undoing). Kết liễu/Tha mạng KHÔNG nằm trên thẻ (thuộc danh sách 4 gợi ý
   chuẩn).
8. **Sở hữu dữ liệu**: Hệ này sở hữu (a) **schema Hồ sơ nhân vật** (định
   nghĩa field, không sở hữu storage — instance lưu trong blob **Entity
   Record do Persistence sở hữu storage**, opaque với Persistence; *đã
   khóa 2026-08-05 [cụm E `/design-review` gộp 11 GDD] tại CẢ 2 GDD
   nguồn: `persistence-save-system.md` nhận sở hữu tường minh ở 2 chỗ,
   `world-memory-context-management.md` từ chối sở hữu tường minh — bản
   2026-08-10 của tài liệu này ghi "either/or chưa khóa" là LỖI THỜI so
   với 2 file đó; đối chiếu và đóng Open Question #10 ngày 2026-08-11*), (b)
   **bộ chỉ số khởi điểm `base_X0`** cho
   12 chỉ số mỗi nhân vật (hạt giống của `stat_growth` — EXP đã bàn giao
   tường minh), (c) **schema NPC tag** nội dung (gồm
   `npc_tag.medium_override` cho Death & Consequence, nullable, thiếu →
   default "sỉ nhục"; và **`npc_tag.concealment_narrative_hint`** — text
   ngắn content/AI-authored hướng dẫn AI narration mô tả NPC này thế nào
   khi `concealment.active=true` [VD "hành xử/dáng vẻ như đệ tử yếu, giấu
   khí tức"], nullable, mới bổ sung 2026-08-10 để đóng gap: không field
   nào trong dự án trước đây mang loại dữ liệu này, và không có nó thì AI
   narration có thể vô tình mô tả đúng thực lực thật qua văn xuôi dù số
   liệu đã bị làm giả — xem Dependencies downstream [Mechanic/Narration
   Contract Enforcement, AI/LLM Integration Layer] và Open Question mới),
   (d) **schema `concealment`** (Rule 6). Giá trị
   instance do content author (NPC seed MVP) hoặc AI tạo khi sinh nhân vật.
9. **Điều tra nằm ngoài hệ này**: Hành động điều tra để lộ giá trị thật của
   NPC che giấu là action trong lượt thuộc Situation/Encounter Generation
   (Open Question bàn giao). Thẻ chỉ render kết quả: khi hệ sở hữu lật
   `concealment.active=false` (hoặc lộ từng phần), thẻ cập nhật theo ngay
   lần mở kế.

### States and Transitions

**Trạng thái tồn tại của thẻ** (mỗi nhân vật):

| Trạng thái | Điều kiện vào | Chuyển đi |
|---|---|---|
| Chưa có thẻ | Mặc định | → Có thẻ (Rule 2: xuất hiện trong lượt confirm đầu tiên) |
| Có thẻ | Vĩnh viễn từ khi tạo | Không quay lại (kể cả NPC chết — thẻ còn, mang triện `alive=false`); duy nhất Undo đúng lượt tạo thẻ mới hủy tạo thẻ |

**Trạng thái hiển thị** (khi thẻ đang mở):

| Trạng thái | Điều kiện | Khác biệt |
|---|---|---|
| Xem thường | `in_combat=false` | 4 khối cơ bản + badge; khung "con dấu" Lực chiến ước tính độ nổi bật CAO (hạng 2 toàn thẻ, seal lớn nhất — khớp Visual/Audio §1, nguồn sự thật DUY NHẤT cho độ nổi bật; sửa 2026-08-10, bản cũ ghi nhầm "THẤP NHẤT", mâu thuẫn trực tiếp Visual/Audio §1 — đây là con số quyết định hành động của anchor moment 1, phải nổi bật) |
| Xem giao đấu | `in_combat=true` | Thêm khối Trạng thái giao đấu (khối ⑤, vị trí CỐ ĐỊNH theo Core Rule #3 — KHÔNG dời lên đầu thẻ; accordion khối ⑤ tự mở, KHÔNG cho user thu gọn trong khi `in_combat=true`, khác hành vi ③⑥ — sửa 2026-08-10, xem UI Requirements); ưu tiên thị giác theo Combat: khung triện kết trận > thanh HP > chi tiết pha > ước tính |
| Danh tính kép | major canon + cải trang | Hồ sơ 2 danh tính |
| Che giấu | `concealment.active=true` (NPC thường) | Giá trị bề ngoài + badge/??? |
| Overlay 3 lối | `continuation_choice_eligible=true` | Toàn màn hình, tái dùng khung thẻ (Character Continuation sở hữu nội dung) |

Phần tử con dùng máy trạng thái của hệ sở hữu, thẻ chỉ render: nút Song Tu
(5 trạng thái — NPC Affinity), nút Hồi phục (hiện khi
`death_and_consequence_blocked=true` — Death & Consequence), banner kết cục
(win/lose/no_outcome — Combat).

### Interactions with Other Systems

| Hệ | Chiều | Dữ liệu | Chủ interface |
|---|---|---|---|
| EXP & Realm | vào | `level`, `tier`, 12 chỉ số qua `stat_growth`, `exp_threshold` | EXP |
| EXP & Realm | ra | `base_X0` (12 hằng khởi điểm/nhân vật) | **Hệ này** |
| Combat | vào | `combat_power_estimate`/`estimate_ratio` (sentinel "N/A"/"+∞"), `in_combat`, `exchange_id`, HP 2 bên, `outcome.type` | Combat |
| Equipment & Skill Data | vào | `equipped_weapon_id`, `known_skill_ids` (+ bảng tên hiển thị) | Equipment |
| NPC Affinity | vào | Hảo cảm số, dải thái độ (7), trạng thái nút Song Tu (5) | NPC Affinity |
| Setting & Canon | vào | Hồ sơ nguyên tác: `is_major_canon`, `true_identity`, bí danh/cải trang, tier profile | Setting & Canon |
| Death & Consequence | vào | `alive`, `death_and_consequence_blocked`, `pending_fate`, `efficacy` item, `recovery_self_attempt_allowed` | Death & Consequence |
| Death & Consequence | ra | `npc_tag.medium_override` (schema) | **Hệ này** |
| Situation Gen | vào | `location` hiện tại; (tương lai) kết quả điều tra lật `concealment` | Situation Gen |
| Character Continuation | vào | Trigger + nội dung màn hình 3 lối | Character Continuation |
| Turn Manager | ra | Action từ nút Song Tu/Hồi phục (đi đường action chuẩn); đọc trạng thái khóa input | Turn Manager |
| World Memory / Persistence | hai bên | Instance hồ sơ/`base_X0`/`npc_tag`/`concealment` lưu trong blob **Entity Record — storage do Persistence sở hữu** (opaque với Persistence; World Memory chỉ giữ turn record + fact-delta, KHÔNG giữ hồ sơ thường trực — chốt 2026-08-05, đối chiếu đóng OQ#10 2026-08-11) | Persistence (storage) / **Hệ này** (schema) |

## Formulas

*(Đề xuất từ `systems-designer` 2026-08-04, duyệt nguyên văn cùng 4 giả
định — xem Open Questions cho các điểm bàn giao.)*

Cả 5 công thức dưới đây là **hàm chọn lọc/dẫn xuất tất định, 0 lời gọi AI,
0 ghi world-state** — đúng vai trò tầng hiển thị đọc-only (Core Rule #1).
Không công thức nào ở đây tính giá trị gameplay mới; mọi input đều đọc từ
trạng thái đã khóa của hệ sở hữu (EXP & Realm, Combat, Setting & Canon,
NPC Affinity, Death & Consequence).

### D.1 — Luật tồn tại thẻ (`card_exists`)

Hình thức hóa Core Rule #2: thẻ được tạo đúng một lần, tự động, khi nhân
vật lần đầu xuất hiện trong một lượt đã confirm-và-không-undo (có entity
record — blob Entity Record của Persistence, sửa 2026-08-11 khớp Rule
#8a; phạm vi: chỉ nhân vật có `char_id`, đối thủ ambient vô danh nằm
ngoài miền định nghĩa của hàm này — xem Rule #2). Vì undo chỉ khả dụng cho lượt xác nhận **gần
nhất** (registry `undo_availability_window`), việc "undo đúng lượt tạo
thẻ" chỉ có thể xảy ra khi đó vẫn là lượt cuối cùng — tức chưa có lượt nào
sau đó cũng tham chiếu nhân vật này, nên công thức dưới đây không bao giờ
rơi vào trạng thái mâu thuẫn (thẻ "vừa tồn tại vừa không" do 2 lượt khác
nhau).

The `card_exists` formula is defined as:
`card_exists(char_id) = OR over all turns t of [ (char_id ∈ entities_appearing(t)) AND confirmed(t)=1 AND undone(t)=0 ]`

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Mã nhân vật | `char_id` | string | ID định danh hợp lệ (entity record tồn tại trong blob Entity Record) | Nhân vật cần tra thẻ — đối thủ ambient vô danh KHÔNG có `char_id`, ngoài miền hàm |
| Tập nhân vật xuất hiện trong lượt | `entities_appearing(t)` | set\<string\> | ⊆ `entities_in_scope(t)` ∪ ID trong `locked_result(t)` | Ai xuất hiện trong lượt `t` |
| Lượt đã xác nhận | `confirmed(t)` | bool | {0,1} | Lượt `t` đã qua Turn Manager xác nhận |
| Lượt đã undo | `undone(t)` | bool | {0,1} | Lượt `t` đã bị undo |
| Kết quả | `card_exists(char_id)` | bool | {0,1} | Thẻ nhân vật này có tồn tại hay chưa |

**Output Range:** Boolean `{0,1}`, không có sentinel. Không đơn điệu tăng
tuyệt đối (có 1 ngoại lệ duy nhất — xem Edge Cases): một khi có ≥1 lượt
`t` thỏa điều kiện và không bị undo, kết quả giữ `true` vĩnh viễn kể cả
khi nhân vật chết sau đó (Core Rule #2 — thẻ còn, mang triện `alive=false`).

**Example:** NPC "Lâm Thiên Hạo" lần đầu xuất hiện ở lượt 12 (xác nhận,
chưa undo) → `card_exists("lam_thien_hao")=true` kể từ đó, mở được ở mọi
lượt sau. Người chơi lập tức Undo lượt 12 khi nó vẫn là lượt cuối cùng
(`undo_availability_window`=true) → `confirmed(12)` vẫn `=1` nhưng
`undone(12)` chuyển `=1` → không còn `t` nào thỏa mệnh đề → `card_exists=false`,
thẻ biến mất khỏi UI như chưa từng tồn tại.

### D.2 — Chuỗi ưu tiên hiển thị field (`displayed_field`) — công thức lõi

Hình thức hóa Rule #5 + Rule #6: với **mọi** cặp (nhân vật, field) trên
thẻ, đây là hàm **tổng** (total function) — luôn trả về đúng 1 trong 4
loại kết quả, không bao giờ "không xác định". Trước tiên định nghĩa miền
field:

- `IDENTITY_FIELDS = {name, gender, than_phan}` — 3 field danh tính, nơi
  DUY NHẤT đặc quyền xuyên không áp dụng.
- `STAT_FIELDS = {level, tier, HP, ATK, DEF, SPD, ACC, Né, CritRate, CritDamage, Amp, Mitigation, Lifesteal, HPRegen}` —
  14 field số (2 field cấp/bậc + 12 chỉ số chiến đấu).
- `PROFILE_FIELDS = {personality, appearance, backstory}` — 3 field hồ sơ
  tường thuật còn lại trong khối Hồ sơ.
- `CONCEALABLE_FIELDS = IDENTITY_FIELDS ∪ STAT_FIELDS ∪ PROFILE_FIELDS` —
  các field CÓ THỂ có `concealment.displayed_[field]` (schema Rule #8d).
  Mọi field khác trên thẻ (Hảo cảm số/dải thái độ/nút Song Tu, `location`,
  `equipped_weapon_id`/`known_skill_ids`, badge `alive`/`death_and_consequence_blocked`,
  khối giao đấu) nằm NGOÀI `CONCEALABLE_FIELDS` — luôn hiển thị giá trị
  thật bất kể `concealment.active`, vì các hệ sở hữu tương ứng
  (NPC Affinity, Situation Gen, Equipment, Death & Consequence, Combat)
  không định nghĩa khe cắm giá trị bề ngoài cho chúng.

The `displayed_field` formula is defined as:
```
displayed_field(C, field):
  if field ∈ IDENTITY_FIELDS AND is_major_canon(C):
      // GUARD ưu tiên tuyệt đối (sửa 2026-08-10) — với field danh tính của
      // 1 nhân vật major-canon, KHÔNG BAO GIỜ rơi xuống nhánh concealment
      // bên dưới, kể cả khi concealment.active(C)=true — đặc quyền xuyên
      // không (Rule #5) áp cho DANH TÍNH vô điều kiện, tách biệt hoàn toàn
      // khỏi cơ chế concealment (Rule #6) mà GDD này sở hữu riêng
      if disguise_active(C):
          dv = disguise_value(C, field)
          return dual_identity(true_value(C, field), dv) if dv is not null else true_value(C, field)
          // null-guard (sửa 2026-08-10): nếu Setting & Canon chưa author
          // bí danh cho field này, KHÔNG trả dual_identity(x, undefined)
          // (ngoài 4 loại output đã khai) — fallback về true_value đơn
      else:
          return true_value(C, field)
  elif field ∈ CONCEALABLE_FIELDS AND concealment.active(C):
      v = concealment.displayed_value(C, field)
      return v if v is not null else "???"
  else:
      return true_value(C, field)
```

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Nhân vật | `C` | character | entity hợp lệ (`card_exists(C)=true`) | Nhân vật đang xem thẻ |
| Field đang xét | `field` | enum | mọi field schema Hồ sơ trên thẻ | Field cụ thể cần chọn giá trị hiển thị |
| Cờ nhân vật nguyên tác lớn | `is_major_canon(C)` | bool | {0,1} | Nguồn: Setting & Canon |
| Cờ đang cải trang bằng bí danh | `disguise_active(C)` | bool | {0,1} | **Card tự suy ra** (sửa 2026-08-10, đóng gap: `setting-canon-integration.md` KHÔNG export field runtime này — hệ đó chỉ có `true_identity` + "danh sách bí danh/cải trang" dạng tồn kho, không có cờ "đang dùng bí danh NGAY LÚC NÀY") — định nghĩa: `disguise_active(C) := len(alias_list(C)) > 0`, tức nhân vật major-canon còn ≥1 bí danh active trong danh sách do Setting & Canon sở hữu. Hệ quả/rủi ro: nếu 1 nhân vật NGỪNG cải trang giữa truyện, Setting & Canon phải chủ động XÓA alias khỏi danh sách để cờ này chuyển `false` — không có cơ chế toggle độc lập nào khác. **Đã xác nhận với owner 2026-08-11** (đóng Open Question #11, quyết định user): `setting-canon-integration.md` cam kết tường minh alias list là TĨNH per setting pack ở MVP — không nhân vật nào "ngừng cải trang giữa truyện" trong content MVP, nên suy diễn này an toàn theo hợp đồng; cơ chế ngừng-cải-trang nếu Alpha cần (cờ runtime + serialize) là Open Question CÓ OWNER bên đó |
| Giá trị thật đã khóa | `true_value(C, field)` | any | miền của `field` | Giá trị thật, khóa bởi hệ sở hữu field đó |
| Giá trị bí danh (đặc quyền xuyên không) | `disguise_value(C, field)` | any | miền của `field` | Chỉ tồn tại khi `field ∈ IDENTITY_FIELDS`, nguồn Setting & Canon |
| Cờ đang che giấu | `concealment.active(C)` | bool | {0,1} | Schema sở hữu bởi hệ này (Rule #8d) |
| Giá trị bề ngoài | `concealment.displayed_value(C, field)` | any \| null | miền của `field` hoặc null | Content/AI tạo sẵn; `null` nếu chưa authored cho field đó |
| Kết quả | `displayed_field(C, field)` | union | `{true_value} ∪ {displayed_value} ∪ {"???"} ∪ {dual_identity}` | Giá trị cuối cùng render lên thẻ |

**Output Range:** 4 loại kết quả rời rạc, loại trừ lẫn nhau — không có
chồng lấp: (1) `true_value` — mọi trường hợp bình thường hoặc field ngoài
`CONCEALABLE_FIELDS`; (2) `displayed_value` — che giấu có dữ liệu bề
ngoài; (3) sentinel `"???"` — che giấu nhưng thiếu dữ liệu bề ngoài cho
field đó; (4) `dual_identity` (cấu trúc 2 giá trị) — chỉ khi field danh
tính + major canon + đang cải trang.

**Example 1 (đặc quyền xuyên không — dual_identity):** Đường Vũ Đồng
(`is_major_canon=true`) đang cải trang thành "Vương Đông"
(`disguise_active=true`). `displayed_field(C, name)` →
`dual_identity(true_value="Đường Vũ Đồng", disguise_value="Vương Đông")`
— thẻ hiển thị cả 2 dòng, NPC khác trong truyện vẫn chỉ biết "Vương Đông".

**Example 2 (che giấu chỉ số — hidden-realm elder):** "Thanh Vân Tử" là
NPC thường (`is_major_canon=false`), `concealment.active=true`,
`concealment.displayed_value(C, level)=3`. `displayed_field(C, level)` →
`3` (giá trị bề ngoài, kèm badge "đang che giấu"); `true_value(C, level)=47`
không hiển thị ở đâu trên thẻ.

**Example 3 (sentinel "???"):** Cùng "Thanh Vân Tử", nhưng
`concealment.displayed_value(C, appearance)` chưa được content author
điền (`null`) → `displayed_field(C, appearance) = "???"`.

**Example 4 (bình thường):** NPC "Tiểu Nhị quán trọ", `concealment.active=false`
→ mọi field trả `true_value` trực tiếp, ví dụ `displayed_field(C, name) = "Tiểu Nhị"`.

### D.3 — EXP còn lại tới cấp kế (`exp_to_next`)

Chỉ áp dụng cho thẻ nhân vật chính (Core Rule #3, khối ②). Đọc trực tiếp
`exp_threshold` đã khóa của EXP & Realm Progression (registry) — không
định nghĩa lại. Ca đặc biệt: khi nhân vật đang ở trạng thái **Chờ Đột
Phá** (EXP GDD — `level mod 10 == 0`, EXP đã kẹp đúng 100% ngưỡng,
`breakthrough_requirement_met=false`), phép trừ thô cho ra đúng `0` — con
số này GÂY HIỂU LẦM (ngụ ý "sắp tự lên cấp lượt sau") trong khi thực tế
đang bị chặn cứng chờ điều kiện đột phá. Formula phải phát hiện ca này và
hiển thị nhãn thay vì số.

The `exp_to_next` formula is defined as:
```
is_awaiting_breakthrough(C) = (level(C) mod 10 == 0) AND (current_exp(C) >= exp_threshold(level(C)))

exp_to_next(C) = "chờ đột phá"                                  if is_awaiting_breakthrough(C)
                = exp_threshold(level(C)) - current_exp(C)       otherwise
```

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Nhân vật chính | `C` | character | duy nhất 1 (player) | Formula này KHÔNG áp dụng cho thẻ NPC |
| Cấp hiện tại | `level(C)` | int | ≥1 | Nguồn: EXP & Realm Progression |
| EXP hiện tại | `current_exp(C)` | float | `[0, exp_threshold(level(C))]` | Nguồn: EXP & Realm Progression, đã khóa |
| Ngưỡng EXP lên cấp | `exp_threshold(level)` | float | `[100, ∞)` | Formula khóa (registry `exp_threshold`), KHÔNG định nghĩa lại |
| Cờ đang Chờ Đột Phá | `is_awaiting_breakthrough(C)` | bool | {0,1} | Suy ra từ 2 điều kiện biên trên |
| Kết quả | `exp_to_next(C)` | float \| sentinel | `(0, exp_threshold(level(C)))` hoặc `"chờ đột phá"` | Số hiển thị trên thanh EXP của thẻ |

**Output Range:** Số dương thực trong `(0, exp_threshold(level))` ở ca
thường (không bao giờ `0` hay âm — nếu EXP đã cascade hết mọi mốc không
phải tròn chục thì level đã tăng trước khi Card đọc, theo Core Rule của
EXP GDD), hoặc sentinel chuỗi `"chờ đột phá"` khi bị chặn ở mốc tròn chục.

**Example (thường):** `level=25`, `exp_threshold(25)=340`,
`current_exp=300` → `exp_to_next = 340 - 300 = 40` → hiển thị "còn 40
EXP tới cấp 26".

**Example (Chờ Đột Phá):** `level=20`, `exp_threshold(20)=290`,
`current_exp=290` (đã kẹp trần), `breakthrough_requirement_met(tier=2)=false`
→ `is_awaiting_breakthrough=true` → `exp_to_next = "chờ đột phá"` (không
hiển thị "còn 0 EXP").

### D.4 — Lực chiến hiển thị trên thẻ (`displayed_estimate`)

Tái sử dụng NGUYÊN VĂN `Điểm_Chỉ_Số`/`Lực_chiến` của Combat System
Formula D.13 (registry `combat_power_estimate`) — không fork, chỉ đổi
**nguồn 12 chỉ số đầu vào** theo Rule #6: khi che giấu, tính trên bộ giá
trị bề ngoài (rủi ro đánh giá sai đối thủ là chủ đích thiết kế). Vì
`Điểm_Chỉ_Số` là tổng của cả 12 chỉ số, thiếu DÙ CHỈ 1 chỉ số khiến tổng
không còn ý nghĩa (không thể coi field thiếu = 0, sẽ làm sai lệch —
"đánh giá sai" một cách âm thầm chứ không phải minh bạch "không biết") —
quy tắc lan truyền: 1 chỉ số `"???"` → toàn bộ `Lực_chiến` hiển thị
`"???"`.

The `displayed_estimate` formula is defined as:
```
stat_source(C, X) = displayed_field(C, X)   for X in STAT_FIELDS \ {level, tier}   // 12 chỉ số chiến đấu (D.2)

displayed_estimate(C):
  if concealment.active(C) AND (∃ X ∈ 12 chỉ số : stat_source(C, X) == "???"):
      return "???"
  else:
      X_values = { stat_source(C, X) : X in 12 chỉ số }   // = true_value nếu concealment.active(C)=false
      return Lực_chiến(C) computed via Combat D.13's Điểm_Chỉ_Số(C) formula over X_values
             + Điểm_Kỹ_Năng(C) + Điểm_Trang_Bị(C)          // input mờ, mặc định 0 (D.13, chưa đổi)
```

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Nhân vật | `C` | character | bất kỳ (chính hoặc NPC) | Chủ thẻ đang xem |
| Nguồn từng chỉ số | `stat_source(C, X)` | float \| "???" | domain của D.2 áp cho `X` | Kết quả D.2 cho 12 chỉ số chiến đấu (KHÔNG gồm `level`/`tier`) |
| Điểm chỉ số (D.13, tái dùng) | `Điểm_Chỉ_Số(C)` | float | `[0, ∞)` | Tổng có trọng số 12 chỉ số — công thức NGUYÊN VĂN của Combat D.13 |
| Lực chiến | `Lực_chiến(C)` | float | `[0, ∞)` | `Điểm_Chỉ_Số + Điểm_Kỹ_Năng + Điểm_Trang_Bị` (D.13) |
| Kết quả | `displayed_estimate(C)` | float \| "???" | `[0, ∞)` hoặc `"???"` | Số Lực chiến render trên thẻ |

**Output Range:** Số thực không âm `[0, ∞)` khi tính được đầy đủ, hoặc
sentinel `"???"` khi che giấu và thiếu ≥1 trong 12 chỉ số bề ngoài. Đây
là KHÔNG GIAN SENTINEL RIÊNG của Card, tách biệt với `"N/A"`/`"+∞"` của
`estimate_ratio` (D.13) — xem Edge Cases về cách 2 tầng sentinel này
tương tác khi Card ghép `displayed_estimate(player)` và
`displayed_estimate(target)` thành 1 tỉ lệ so sánh.

**Badge che giấu (bổ sung 2026-08-10)**: khi `concealment.active(C)=true`
VÀ `displayed_estimate(C)` trả về 1 SỐ (không phải `"???"`), con số đó
LUÔN mang badge "đang che giấu" — cùng ký hiệu/vị trí như badge field D.2
case 2 (Visual/Audio mục 2), đặt ngay cạnh seal Lực chiến. Đây là badge
DUY NHẤT áp cho 1 giá trị DẪN XUẤT (không phải field D.2 gốc) — ngoại lệ
tường minh mở rộng phạm vi "per field" ban đầu của Visual/Audio mục 2
(xem Core Rule #6).

**Example (bình thường, không che giấu):** `concealment.active=false` →
dùng 12 `true_value` → `Điểm_Chỉ_Số=310`, `Điểm_Kỹ_Năng=Điểm_Trang_Bị=0`
→ `displayed_estimate(C) = 310`.

**Example (che giấu, đủ dữ liệu bề ngoài — hidden-realm elder):**
"Thanh Vân Tử" `concealment.active=true`, cả 12 chỉ số bề ngoài đều có
giá trị (được author để nhìn giống đệ tử cấp 3 yếu ớt) →
`Điểm_Chỉ_Số` tính trên bộ giả này = `28` → `displayed_estimate(C) = 28`
— trong khi `Lực_chiến` THẬT (không hiển thị ở đâu) có thể là `1850`.

**Example (che giấu, thiếu dữ liệu — propagate "???"):** NPC che giấu
nhưng content chỉ author 10/12 chỉ số bề ngoài (thiếu `Lifesteal`,
`HPRegen`) → `stat_source(C, Lifesteal) = "???"` (theo D.2) →
`displayed_estimate(C) = "???"` — thẻ hiển thị "Lực chiến: ???" thay vì
một con số tính thiếu.

### D.5 — Kiểm tra đầy đủ chỉ số khởi điểm (`base_stat_completeness_check`)

Không phải công thức cân bằng — là ràng buộc toàn vẹn dữ liệu tại thời
điểm tạo nhân vật, cùng triết lý fail-fast đã dùng ở EXP & Realm
Progression (thiếu data thì log "content gap" và chặn cứng, không âm
thầm giả định). `base_X0` do hệ này sở hữu (Core Rule #8b) làm hạt giống
cho `stat_growth` (EXP, đã khóa) — thiếu 1/12 chỉ số làm hỏng TOÀN BỘ
đường tăng trưởng của nhân vật đó ở mọi cấp sau này, nên phải chặn ngay
lúc tạo, không chặn muộn lúc hiển thị. Chạy đúng 1 lần tại thời điểm
entity record được tạo (cùng lượt nhân vật lần đầu xuất hiện), không
chạy lại mỗi lần mở thẻ.

The `base_stat_completeness_check` formula is defined as:
```
base_stat_completeness(char_id) =
    ( defined(base_HP0(char_id)) AND numeric(base_HP0(char_id)) AND base_HP0(char_id) > 0 )   // HP: strict >0, xem rationale dưới
    AND
    AND over X in {11 chỉ số còn lại} of [ defined(base_X0(char_id, X)) AND numeric(base_X0(char_id, X)) AND base_X0(char_id, X) ≥ 0 ]
```

**Ràng buộc riêng cho HP (sửa 2026-08-10)**: HP là chỉ số DUY NHẤT trong
12 chỉ số được dùng làm MẪU SỐ ở hệ downstream (`hp_pct = hp/max_HP` —
`combat-system.md`; `margin_ratio` — `npc-affinity-relationship.md`,
`death-and-consequence.md`). `base_HP0=0` hợp lệ theo ràng buộc `≥0`
chung sẽ lan truyền thành `stat_growth(C,HP)=0` vĩnh viễn
(`exp-realm-progression.md`), làm sai lệch ÂM THẦM (không crash,
`max(max_HP,1)` chặn mọi chia-cho-0, nhưng 3 hệ downstream đều coi
`max_HP=0` là điều kiện LỖI, không phải trạng thái hợp lệ) mọi phép tính
downstream đó. 11 chỉ số còn lại chỉ dùng làm tử số/hệ số nhân nên `=0`
chỉ gây yếu, không gây trạng thái vô nghĩa — giữ nguyên `≥0`.

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Mã nhân vật | `char_id` | string | ID hợp lệ | Nhân vật đang được tạo (content author hoặc AI sinh) |
| Chỉ số khởi điểm HP | `base_HP0(char_id)` | float \| undefined | `(0, ∞)` khi có — **strict, khác 11 chỉ số kia** | Hạt giống `max_HP` — dùng làm mẫu số ở 3 GDD downstream, xem rationale trên |
| Chỉ số khởi điểm (11 chỉ số còn lại) | `base_X0(char_id, X)` | float \| undefined | `[0, ∞)` khi có | 1 trong 11 hằng khởi điểm còn lại, sở hữu bởi hệ này (Core Rule #8b) |
| Kết quả | `base_stat_completeness(char_id)` | bool | {0,1} | `1` = đủ 12/12 (kể cả HP > 0), cho phép tạo entity record; `0` = fail-fast |

**Output Range:** Boolean `{0,1}`, không có giá trị trung gian — đúng
tinh thần "tất-cả-hoặc-không-gì" (cùng dạng với
`bundle_completeness_check` của Persistence).

**Example (pass):** NPC "Đường Vũ Đồng" seed đủ 12/12 chỉ số →
`base_stat_completeness=1` → entity record được tạo bình thường, D.1
(`card_exists`) chuyển `true` ngay lượt đó.

**Example (fail-fast):** NPC "Bạch Tuyết Nghi" seed thiếu `base_X0` cho
`Lifesteal` (11/12 có) → `base_stat_completeness=0` → chặn xác nhận lượt
tạo nhân vật này, log `"content gap: base_X0 thiếu Lifesteal cho char_id=bach_tuyet_nghi"`,
KHÔNG tạo entity record một nửa (tránh trạng thái `stat_growth` tính ra
`NaN`/thiếu ở các cấp sau).

**Example (fail-fast, HP=0 chính xác, bổ sung 2026-08-10):** NPC seed đủ
12/12 field NHƯNG `base_HP0=0` chính xác (không âm, không phi số) →
`base_stat_completeness=0` (fail) — ràng buộc HP là `>0` STRICT, khác
biệt với 11 chỉ số kia (`≥0`); log `"content gap: base_HP0 phải >0 (nhận 0)
cho char_id=..."`.

**Ghi chú interface downstream (bổ sung 2026-08-10)**: `max_HP(C)` mà
`combat-system.md`/`death-and-consequence.md`/`npc-affinity-relationship.md`
dùng làm mẫu số cho `hp_pct`/`margin_ratio` chính là field `HP` ở đây
(`true_value(C, HP)`, sau khi `stat_growth` áp lên `base_HP0`) — KHÔNG
đi qua D.2/`displayed_field`, bất kể `concealment.active(C)`. Giữ tên
`HP` ở GDD này để nhất quán nội bộ; 3 GDD downstream dùng `max_HP` theo
quy ước riêng — 2 tên cùng 1 giá trị. Xem Dependencies (downstream) để
có dòng khai tường minh — trước 2026-08-10, GDD này không có dòng
Dependencies nào cho interface này dù 3 hệ downstream đã dùng trực tiếp
trong phép tính sinh tử (`margin_ratio` → death roll).

## Edge Cases

- **Nếu cần hiển thị tỉ lệ so sánh Lực chiến mà một trong hai vế
  `displayed_estimate` = `"???"`**: short-circuit hiển thị `"???"` cho cả
  tỉ lệ, **trước khi** gọi `estimate_ratio` của Combat D.13 (D.13 giả định
  input là số — không bao giờ gọi nó với sentinel phi số). Nếu cả hai vế
  là số, gọi D.13 bình thường và hiển thị nguyên sentinel của nó
  (`"N/A"`/`"+∞"`) nếu rơi vào ca 0/0.
- **Nếu người chơi Undo đúng lượt tạo thẻ**: `card_exists` lật `false`
  (D.1); mọi cache render của thẻ (kể cả Lực chiến ước tính đã tính) phải
  bị hủy — lần truy cập kế tiếp không được trả dữ liệu từ cache của thẻ đã
  "chưa từng tồn tại".
- **Nếu `concealment.active` hoặc `disguise_active` đổi giá trị trong lúc
  thẻ đang mở** (ví dụ điều tra thành công lật mặt ngay trong lượt): thẻ
  KHÔNG re-render giữa chừng — D.2 là hàm tại-thời-điểm-đọc, giá trị mới
  áp dụng từ lần mở thẻ kế tiếp (khớp Core Rule #9), và khi đó D.2 được
  gọi lại từ đầu cho toàn thẻ, không patch từng field.
- **Nếu `in_combat=true` với đối thủ đang che giấu**: khối "Trạng thái
  giao đấu" (HP 2 bên, exchange, banner) hiển thị dữ liệu **THẬT** của
  Combat — nó nằm ngoài `CONCEALABLE_FIELDS`, không đi qua D.2/D.4. Hệ
  quả thiết kế có chủ đích: giao chiến để lộ thực lực thật (HP thật hiện
  ngay thanh máu), trong khi khối Chỉ số chiến đấu tĩnh vẫn giữ giá trị bề
  ngoài cho tới khi `concealment.active` được hệ sở hữu lật.
- **Nếu NPC che giấu nhưng `Điểm_Kỹ_Năng`/`Điểm_Trang_Bị` có giá trị thật
  khác 0** (hậu MVP, khi 2 công thức mờ này được định nghĩa): D.4 hiện
  KHÔNG có khe che giấu cho 2 thành phần này — chấp nhận as-is ở MVP (cả
  2 mặc định 0 theo D.13 nên chưa lộ gì); ghi Open Questions để quyết mở
  rộng schema `concealment` khi Combat định nghĩa 2 input đó.
- **Nếu AI sinh NPC mới mà thiếu `base_X0`** (D.5 fail): chặn xác nhận
  lượt + log "content gap" (không tạo entity record nửa vời). Phòng ngừa
  gốc: lời gọi AI sinh NPC phải dùng JSON schema ràng buộc đủ 12/12 chỉ
  số (pattern schema-constrained có sẵn của AI/LLM Integration Layer) —
  D.5 là lưới an toàn cuối, không phải cơ chế chính.
- **Nếu nhân vật đã chết (`alive=false`)**: thẻ vẫn mở được vĩnh viễn,
  hiển thị giá trị khóa cuối cùng + triện đỏ son tĩnh; MỌI phần tử tương
  tác ẩn/vô hiệu (nút Song Tu vào trạng thái Ended theo NPC Affinity;
  không nút Hồi phục; không hiển thị khối giao đấu).
- **Nếu NPC (không phải nhân vật chính) mang trạng thái phế/
  `severity=severe`**: thẻ NPC hiển thị badge theo dữ liệu Death &
  Consequence cung cấp, nhưng nút Hồi phục KHÔNG xuất hiện — Death &
  Consequence chỉ định nghĩa 3 phương thức hồi phục cho nhân vật chính;
  thẻ chỉ render nút khi hệ sở hữu cung cấp lựa chọn hợp lệ.
- **Nếu `in_combat=true`**: nút Song Tu và nút Hồi phục vô hiệu (danh
  sách hành động hợp lệ trong trận do Combat cung cấp qua UI 4 gợi ý —
  thẻ không được bơm thêm action ngoài luồng vào giữa trận).
- **Nếu `known_skill_ids` rỗng hoặc chưa trang bị vũ khí**: hai trạng
  thái rỗng ĐỘC LẬP theo từng vế — `equipped_weapon_id=null` → vế vũ khí
  hiện "tay không"; `known_skill_ids=[]` → vế kỹ năng hiện "chưa học kỹ
  năng"; vế còn lại (nếu có dữ liệu) render bình thường. Khối ③ luôn xuất
  hiện — không lỗi, không ẩn khối. "Đánh thường" (auto-known theo
  weapon_type, Equipment GDD) KHÔNG liệt kê trong danh sách kỹ năng — nó
  là ngầm định, tránh nhiễu; danh sách chỉ render `known_skill_ids` (≤6
  theo `max_known_skills_per_character`).
- **Nếu hai nhân vật trùng tên hiển thị** (hai "Tiểu Nhị" ở hai quán
  trọ): thẻ định danh bằng `char_id`, không bằng tên — hai thẻ độc lập,
  cho phép trùng tên hiển thị; phân biệt bằng field Vị trí hiện tại/Thân
  phận.
- **Nếu overlay 3 lối kích hoạt (`continuation_choice_eligible=true`)
  trong lúc thẻ thường đang mở**: overlay toàn màn hình chiếm quyền — thẻ
  thường đóng lại, không có trạng thái "2 thẻ chồng nhau".

## Dependencies

Hệ này là hệ Presentation tổng hợp nhiều nguồn nhất dự án: 11 kết nối.
Phân loại Hard = thẻ mất một khối nội dung bắt buộc (theo game-concept
Core Mechanics #7) nếu thiếu; Soft = suy giảm tiện ích nhưng thẻ vẫn đúng.

**Upstream (hệ này đọc):**

| Hệ | Hard/Soft | Interface | Ghi chú 2 chiều |
|---|---|---|---|
| EXP & Realm Progression | **Hard** | `level`, `tier`, 12 chỉ số (`stat_growth`), `exp_threshold` (D.3) | GDD đó đã liệt kê chiều ngược ✅ |
| NPC Affinity & Relationship | **Hard** | Hảo cảm số, dải thái độ 7 mức, trạng thái nút Song Tu 5 mức | ✅ (kèm 3 UI behavior bắt buộc bên đó) |
| Setting & Canon Integration | **Hard** | `is_major_canon`, `true_identity`, bí danh, `disguise_active`, tier profile (D.2) | ✅ |
| Combat System | **Hard** | `combat_power_estimate` (D.4), `in_combat`, `exchange_id`, HP 2 bên, `outcome.type` | ✅ (soft theo cách Combat ghi — nâng Hard ở phía thẻ vì khối ②⑤ bắt buộc) |
| Equipment & Skill Data | **Hard** | `equipped_weapon_id`, `known_skill_ids` + bảng tên hiển thị | ✅ |
| Death & Consequence | **Hard** | `alive`, `death_and_consequence_blocked`, `pending_fate`, `efficacy`, `recovery_self_attempt_allowed` | ✅ |
| Turn Manager | **Hard** | Nhận action từ nút (Song Tu/Hồi phục) qua đường action chuẩn; đọc trạng thái khóa input + undo (D.1) | Turn Manager giữ "Depends On: —" theo quy ước Foundation — ghi nhận gap tại systems-index như 12 gap trước |
| World Memory | **Hard** | `entities_appearing(t)` từ turn record (input `card_exists` D.1); storage instance hồ sơ KHÔNG ở đây — thuộc blob Entity Record của Persistence (sửa 2026-08-11, khớp Rule #8a/OQ#10 đã đóng: quyền sở hữu storage ĐÃ khóa từ 2026-08-05, dòng này sót trong đợt cascade — bắt bởi `/consistency-check`) | Chưa liệt kê chiều ngược — cần footnote systems-index |
| Situation/Encounter Generation | Soft | `location` hiện tại; (tương lai) kết quả điều tra lật `concealment` | ✅ |
| Character Continuation | **Hard** (chiều ngược) | Trigger `continuation_choice_eligible` + nội dung màn hình 3 lối (thẻ là khung render) | ✅ |
| Mechanic/Narration Contract Enforcement | **Hard** | Core Rule #4 của thẻ ("bề mặt số liệu duy nhất") là mặt ngược Core Rule #4 bên đó; cơ chế thực thi runtime (`numeric_leak_detection`) thuộc hệ đó, thẻ chỉ là bề mặt hiển thị hợp lệ | Bổ sung theo phát hiện qa-lead 2026-08-04 (GDD này viện dẫn nhưng chưa liệt kê) |

**Downstream (hệ khác đọc từ hệ này):**

| Hệ | Hard/Soft | Interface |
|---|---|---|
| EXP & Realm Progression | **Hard** | `base_X0` (12 hằng khởi điểm/nhân vật — hạt giống `stat_growth`; `base_HP0` nay ràng buộc `>0` strict, xem D.5) |
| Death & Consequence | Soft | Schema `npc_tag.medium_override` (nullable, thiếu → "sỉ nhục") |
| Death & Consequence | **Hard** (bổ sung 2026-08-10) | `max_HP(C)` ≡ field `HP` của thẻ (D.5, xem "Ghi chú interface downstream") — dùng làm mẫu số `margin_ratio`, PHẢI `>0`, nay ĐẢM BẢO bởi D.5 `base_HP0>0` strict. Trước 2026-08-10 GDD đó viện dẫn interface này mà GDD này chưa từng khai — đóng gap |
| Combat System | **Hard** | `base_X(C)` đọc từ thẻ làm input D.1 của Combat (giá trị THẬT, không qua D.2); `max_HP(C)` (≡ field `HP`) PHẢI `>0` (precondition chia HP), nay ĐẢM BẢO bởi D.5 `base_HP0>0` strict |
| NPC Affinity & Relationship | **Hard** (bổ sung 2026-08-10) | `max_HP(C)` ≡ field `HP` của thẻ — dùng làm mẫu số `margin_ratio`. Cùng gap/cùng fix như dòng Death & Consequence trên |
| Mechanic/Narration Contract Enforcement | **Hard** (cam kết 2026-08-11 — gỡ provisional, đóng OQ#12; dòng này sót trong đợt cascade, bắt bởi `/consistency-check`) | Schema `npc_tag.concealment_narrative_hint` — hệ đó ĐÃ ghi nhận nghĩa vụ ủy quyền tại Core Rule #4 (wrapper phải chèn hint + chỉ thị "không mô tả thực lực thật"), kèm giới hạn tự khai: leak-check số học không bắt được leak văn xuôi — enforcement cho lớp này nằm ở chỉ thị prompt, cùng lớp ủy quyền "cấm viết số bằng chữ" |
| AI/LLM Integration Layer | **Hard** (cam kết 2026-08-11 — gỡ provisional, đóng OQ#12; dòng này sót trong đợt cascade, bắt bởi `/consistency-check`) | Nguồn tiêu thụ trực tiếp `npc_tag.concealment_narrative_hint`: Core Rule #2 bên đó ĐÃ có gạch đầu dòng context-data tường minh (cùng khuôn `style_descriptor`) — PHẢI chèn hint + chỉ thị cố định khi cảnh chứa NPC `concealment.active=true` |
| Core UI/Screen Navigation (#15) | **Hard** | Điểm vào mở thẻ từ mọi màn hình; thẻ là 1 trong các screen chính (sửa 2026-08-10 — hệ #15 nay đã **Approved**, không còn "chưa thiết kế") |
| Persistence | Hai chiều | Instance `base_X0`/`npc_tag`/`concealment`/hồ sơ nằm trong blob opaque |

**Trạng thái 2 chiều**: 9/9 GDD upstream đã liệt kê hệ này trong
Dependencies của chính họ (xác minh qua quét toàn bộ 2026-08-04) — không
cần cross-file edit. Hai gap một chiều mới cần footnote ở
`systems-index.md` (giữ nguyên bảng Enumeration theo quy ước): Turn
Manager và World Memory không ghi chiều Card→họ.

## Tuning Knobs

| Knob | Giá trị mặc định | Phạm vi an toàn | Ảnh hưởng | Quá cao → | Quá thấp → |
|---|---|---|---|---|---|
| `base_X0` (bộ 12 giá trị/nhân vật, data file) | Theo seed nhân vật (MVP: 4 nhân vật authored) | HP `> 0` strict (sửa 2026-08-10, xem D.5 rationale — khác 11 chỉ số kia); 11 chỉ số còn lại `≥ 0`; % stats ≤ `PERCENT_STAT_CAP` (EXP) | Điểm xuất phát toàn bộ đường tăng trưởng `stat_growth` + cân bằng sớm | NPC seed quá mạnh → phá dynamic "mây tầng nào gió tầng nấy" sớm | Nhân vật chính quá yếu → mọi trận đầu game thành tự sát; HP=0 bị D.5 chặn cứng lúc tạo |
| `profile_text_max_length` | 280 ký tự/field | 120–600 | Độ dài tối đa Tính cách/Ngoại hình/Tiểu sử trên thẻ (mobile) | Thẻ thành trang văn, chìm khối chỉ số | Hồ sơ cụt, mất chất tiểu thuyết |
| `card_transition_ms` | 200 | 0–400 | Thời gian hiệu ứng mực loang khi mở thẻ | Cảm giác ì trên mobile | Mất cảm giác "Mực Chưa Khô", thẻ bật như popup HUD |
| `stat_display_precision` | 0 (số nguyên); % stats: 1 lẻ | 0–2 | Số chữ số thập phân trên khối chỉ số | Nhiễu thị giác, vỡ khung con dấu | % stats tròn 0 lẻ gây hiểu lầm ngưỡng (5.4% ≠ 5%) |

**Không phải knob của hệ này** (trỏ về nguồn sở hữu, không tạo bản sao):
`max_known_skills_per_character=6` (Equipment — registry);
`SONG_TU_THRESHOLD=60`/`SONG_TU_BREAK_THRESHOLD=40`/
`deep_hostility_threshold=-80` (NPC Affinity — hằng khóa, không tune); bộ
trọng số `w_X` của Lực chiến (Combat D.13); 24 hằng `LEVEL_GROWTH_X`/
`BREAKTHROUGH_BONUS_X` (EXP data file); ngưỡng cảnh báo chênh lệch Lực
chiến trước trận (Combat sở hữu — thẻ chỉ đổi font-weight theo tín hiệu).

**Tương tác giữa knob**: `base_X0` × `LEVEL_GROWTH_X` (EXP) quyết định
toàn bộ đường sức mạnh — chỉnh `base_X0` mà không nhìn bộ 24 hằng của EXP
sẽ lệch cân bằng; hai bộ này phải tune cùng nhau ở Vertical Slice (đã có
ghi chú tương ứng phía EXP: 9/12 chỉ số chưa qua balance pass).

## Visual/Audio Requirements

*(Đề xuất bởi `art-director` 2026-08-04, duyệt cùng 4 giả định. Chưa có
Art Bible chính thức — dựa theo Visual Identity Anchor "Mực Chưa Khô"
(`game-concept.md`) và tiền lệ đã khóa ở `combat-system.md` (tín hiệu
trong trận, `in_combat=true`) và `death-and-consequence.md` (badge vĩnh
viễn khối ⑥). Mục này KHÔNG định nghĩa lại 2 phạm vi đó — chỉ đặc tả ngôn
ngữ thị giác nền của thẻ ở view thường và các phần tử chỉ Card & Identity
sở hữu. Khối ⑤ (Trạng thái giao đấu) và khối ⑥ (badge vĩnh viễn) giữ
nguyên như đã khóa; overlay 3 lối tiếp tục giữ nguyên như
`character-continuation.md`.)*

### 1. Ngôn ngữ thị giác nền

- **Khung tổng thể**: viền mực loang hữu cơ (bất quy tắc, mép nhòe) bao
  quanh toàn thẻ và mọi vùng KHÔNG chứa số cứng (khối ① Hồ sơ, khối ③
  Trang bị & Kỹ năng) — đúng "Mực Chưa Khô".
- **Số cứng luôn trong seal**: mọi field thuộc `STAT_FIELDS` (D.2) +
  `displayed_estimate` (D.4) + `exp_to_next`/nhãn thay thế của nó (D.3) +
  Hảo cảm số nằm trong khung con dấu góc cạnh, sắc bén — tái khẳng định
  Visual Identity Anchor cho toàn bộ thẻ (Combat mới chỉ đặc tả phạm vi
  trong trận). Nhãn sentinel dạng chữ thay số (VD `"chờ đột phá"`, `"???"`
  khi ở trong 1 field vốn là số) dùng ĐÚNG khung seal như số thật — sentinel
  vẫn là "1 sự thật cơ học đã khóa", chỉ khác nội dung.
- **Bố cục ①-⑥ giữ nguyên thứ tự đã khóa** (Core Rule #3) — mục này chỉ
  thêm ĐỘ NỔI BẬT thị giác (kích thước/độ đậm), không đổi thứ tự đọc từ
  trên xuống. Thứ tự nổi bật ở **view thường** (`in_combat=false`, khác
  hoàn toàn thứ tự trong trận Combat đã khóa — 2 chế độ không mâu thuẫn
  nhau vì không cùng lúc hiển thị): (1) Tên + Cấp-Bậc → (2) Lực chiến ước
  tính (seal lớn nhất thẻ) → (3) lưới 12 chỉ số → (4) Hảo cảm + dải thái
  độ (thẻ NPC) → (5) phần còn lại của Hồ sơ (tính cách/ngoại hình/tiểu
  sử/vị trí) → (6) Trang bị & Kỹ năng. Lý do: phục vụ trực tiếp anchor
  moment 1 của Player Fantasy ("soát địch trước khi rút kiếm") — Cấp-Bậc/
  Lực chiến là dữ liệu quyết định hành động ngay, cần nổi bật nhất dù
  đứng dưới Hồ sơ về vị trí. *(Bố cục scroll thật trên mobile — phối hợp
  `ux-designer` ở UI Requirements.)*
- **Typography**: 2 family tách biệt, không lẫn — (a) số trong seal: chữ
  đứng, đậm, chân vuông/góc cạnh, dùng 1 weight KHÔNG PHẢI weight nặng
  nhất sẵn có (để chừa chỗ cho "đậm hơn 1 bậc" mà Combat dùng riêng cho
  crit); (b) văn Hồ sơ + nhãn field: chữ kiểu bút lông/nhật ký, trọng
  lượng thường, luôn trong khung mực loang, không seal. Font cụ thể
  **(chốt ở /art-bible)**, bắt buộc kiểm tra glyph tiếng Việt đầy đủ cho
  cả 2 family trước khi chọn.

### 2. Bảng yêu cầu phản hồi thị giác theo phần tử

| Element | Visual treatment | Rationale/pillar |
|---|---|---|
| **Danh tính kép** (`dual_identity`, D.2 case 1) | Tên thật hiển thị TRƯỚC, trong seal đậm nhất family số (đặc quyền = "biết ngay sự thật"). Tên cải trang hiển thị NGAY DƯỚI, trong khung mực loang nhỏ (không seal — đây là "vỏ bọc", không phải sự thật cơ học), nối bằng 1 dấu gạch mực đơn giản, không icon/màu riêng. | Weight-based hierarchy (đậm=thật, thường=vỏ) tách 2 tầng chỉ bằng 1 liếc mắt, không cần màu — đúng anchor moment 2 Player Fantasy, tuân khẩu phần hóa (KHÔNG dùng màu phân biệt 2 danh tính). |
| **Badge "đang che giấu"** (per field D.2 case 2, VÀ trên `displayed_estimate` D.4 khi là số — mở rộng 2026-08-10) | Thẻ ngoặc kép kiểu thư pháp 「che giấu」 đặt sát field bị che (không phải icon vẽ riêng — dùng ký tự Unicode có sẵn, cùng family Hồ sơ, weight nhẹ hơn). Dùng ĐỒNG NHẤT cho mọi loại field (danh tính/stat/hồ sơ) VÀ cho seal Lực chiến ước tính khi nó là số dưới `concealment.active=true`, không đổi hình theo loại. | Giải pháp thuần typography, không phát sinh asset mới — khớp Art Pipeline Complexity "Thấp" (`game-concept.md`); nhất quán 1 mẫu duy nhất giúp quét nhanh nhiều thẻ; đóng vòng lặp "con số không bao giờ nói dối" ngay cả khi số đó do che giấu tạo ra. |
| **Sentinel "???"** (D.2 case 3) | Field trong seal (stat/Lực chiến): chuỗi `"???"` render trong khung seal, cùng weight số thường. Field trong khung mực loang (hồ sơ/danh tính): thay bằng 1 vệt mực loang nhỏ phủ lên vị trí văn bản — tái dùng CHÍNH kỹ thuật/asset tạo viền mực loang của khung thẻ, chỉ ở quy mô nhỏ hơn (không phải asset mới). | Vệt mực "blot" kể chuyện "thông tin chưa được viết ra" bằng chính motif lõi của game, củng cố mood "nhật ký sống" thay vì text placeholder khô khan; không tăng chi phí asset vì tái dùng kỹ thuật đã cần cho khung thẻ. |
| **"chờ đột phá"** trên thanh EXP (D.3) — QUYẾT ĐỊNH MÀU | **GIỮ ĐƠN SẮC, KHÔNG dùng xanh ngọc.** Thanh EXP chuyển từ fill mực đặc sang hoạ văn gạch chéo lấp đầy toàn thanh; nhãn `"chờ đột phá"` đặt trong seal riêng thay vị trí số (như mọi sentinel số khác). Xanh ngọc CHỈ hợp lệ ở khoảnh khắc đột phá THẬT xảy ra (`breakthrough_requirement_met` chuyển true) — phạm vi đó thuộc `exp-realm-progression.md` (Visual/Audio hiện "[To be designed]"), KHÔNG thuộc mục này. | Quyết định có chủ đích, không phải bỏ sót: trạng thái Chờ Đột Phá có thể LẶP LẠI N lượt liên tiếp (EXP kẹp trần, không đổi) — nếu tô xanh ngọc cho 1 trạng thái lặp lại nhiều lượt/nhiều lần mở thẻ, màu sẽ mất tính hiếm, phá vỡ đúng cơ chế "thấy màu = biết ngay thế giới vừa đổi thật" (`game-concept.md`) và vi phạm nguyên tắc "độ bền tín hiệu phản ánh độ bền trạng thái" đã lập ở `death-and-consequence.md` (trạng thái LẶP/CHỜ không nên mang 1 tín hiệu "sự kiện 1 lần"). |
| **Dải thái độ** (7 mức — không thêm màu) | Tên dải hiển thị bằng TEXT (7 tên tiếng Việt — Thù địch sâu sắc/Thù địch/Lạnh nhạt/Trung lập/Thiện cảm/Thân thiết/Tri kỷ — đã tự thân phân biệt hướng, không cần mã màu/icon). Bổ sung PHỤ: 1 thanh ngang mực mảnh lưỡng cực (tâm = Trung lập) + 1 chấm đánh dấu vị trí dải hiện tại, chỉ đổi VỊ TRÍ trái/phải và ĐỘ ĐẬM (tăng theo khoảng cách tới tâm) — không đổi hình chấm, không đổi màu. Hảo cảm số trong seal riêng cạnh thanh. | Ưu tiên typography (đã đủ rõ) thay vì phát minh bộ icon hướng mới — khớp Art Pipeline "Thấp"; thanh+chấm chỉ củng cố phụ, có thể bỏ mà không mất thông tin (graceful degradation nếu asset chưa kịp làm). |
| **Nút Song Tu** (5 trạng thái — chỉ Available/Active render) | Available = khung con dấu HÌNH TRÒN RỖNG (chưa tô) quanh nhãn "Song Tu" — "lời mời chưa đóng dấu". Active = CÙNG khung tròn, TÔ ĐẶC mực đen — "đã đóng dấu quan hệ". Locked/Broken/Ended = ẩn HOÀN TOÀN, không ghost/disabled, không placeholder. Hình TRÒN cố tình khác khung SEAL GÓC CẠNH (dành riêng cho số cứng) — phân biệt "nút hành động" khỏi "dữ liệu". | Outline→fill tái dùng ẩn dụ "đóng dấu = cam kết đã xảy ra" đã có ở Combat (khung kết trận đóng lại), không cần màu mới, đúng Pillar 2 (hệ quả thật). Ẩn tuyệt đối 3/5 state giữ mật độ thông tin thấp khi lướt nhiều thẻ NPC, đúng "không phải HUD game". |
| **Nút Hồi phục** (cùng mẫu Song Tu, theo Death & Consequence) | Xuất hiện = khung con dấu HÌNH VUÔNG RỖNG (khác hình tròn của Song Tu để không nhầm 2 loại hành động) quanh nhãn "Hồi phục", đặt cạnh badge đỏ son "phế đan điền" (khối ⑥) nhưng bản thân nút GIỮ ĐEN-XÁM, không nhuốm đỏ son. Không xuất hiện = ẩn hoàn toàn. | Giữ luật "đỏ son chỉ đại diện sự thật đã khóa, không đại diện hành động còn mở" — tránh đỏ son lan khỏi phạm vi badge đã khóa ở `death-and-consequence.md`, bảo vệ khẩu phần màu. |
| **Empty state** ("tay không"/chưa học kỹ năng, khối ③) | Text trạng thái bằng font Hồ sơ (không seal — không phải số), trọng lượng NHẸ HƠN + độ đậm mực thấp hơn 1 bậc so với danh sách bình thường (vẫn đơn sắc đen-xám, chỉ giảm alpha, không đổi tông màu). | Phân biệt "rỗng có chủ đích" khỏi lỗi tải dữ liệu, tuân đúng Edge Case đã khóa ("không lỗi, không ẩn khối"). |
| **Thanh EXP** (player card, ca thường — D.3) | Thanh ngang trong khung mực loang nhỏ (không seal — bản thân thanh là dải liên tục, không phải 1 số rời rạc), fill mực đặc theo tỉ lệ `current_exp/exp_threshold`. Số "còn X EXP tới cấp Y" — chỉ phần X/Y đặt trong seal riêng, phần chữ bao quanh là text Hồ sơ thường. | Tách phần liên tục (thanh, không cần seal) khỏi phần rời rạc (số EXP còn lại, seal) — nhất quán cách Combat xử lý HP (bước rời rạc mới cần "khẳng định sự thật", còn thanh liên tục chỉ minh họa). |

### 3. Âm thanh

Phạm vi audio dự án "tối thiểu" (`game-concept.md`). Thẻ là UI đọc-only —
mọi hành động cơ học thật đã có tín hiệu audio ở hệ sở hữu. Tối đa 2 cue,
cả 2 ADVISORY, có thể bỏ hoàn toàn ở bản đầu:

- **Mở thẻ**: 1 tiếng sột soạt giấy/mực rất ngắn (<0.3s), chỉ phát khi mở
  thẻ lần đầu trong phiên xem hiện tại (không lặp mỗi lần cuộn/đổi tab
  trong overlay).
- **Xác nhận nút trong thẻ** (Song Tu → Active, Hồi phục thành công): TÁI
  DÙNG nguyên văn cue "đóng dấu" đã định nghĩa ở `combat-system.md` mục 4
  — không tạo âm mới, giữ đúng nguyên tắc "1 âm dùng chung cho hành động
  khóa cơ học" đã lập ở đó.
- Không đề xuất: nhạc nền riêng cho màn hình thẻ, âm cho từng field/badge,
  âm khi cuộn, âm khi hiển thị lại badge tĩnh (đã có sẵn, không phải sự
  kiện mới).

### 4. Khẩu phần màu — phạm vi mục này

Mục này KHÔNG bổ sung cách dùng đỏ son/xanh ngọc mới nào — toàn bộ nội
dung trên đơn sắc đen-xám/giấy kem. Liệt lại (không khai báo mới) nơi đỏ
son ĐƯỢC PHÉP xuất hiện trên thẻ, đã khóa ở hệ khác:

- Viền đỏ son mảnh quanh khung thẻ khi `outcome.type="lose"` (Combat, chỉ
  `in_combat=true`/kết trận).
- Triện đỏ son nhỏ/tĩnh cố định góc thẻ khi `alive=false` (Death &
  Consequence, khối ⑥).
- Khối đỏ son đặc vùng chỉ số/đan điền khi `death_and_consequence_blocked=true`
  (Death & Consequence, khối ⑥).

Xanh ngọc: KHÔNG xuất hiện ở bất kỳ đâu trên Character Card theo mục này
— nơi hợp lệ duy nhất là khoảnh khắc đột phá thật, thuộc phạm vi
`exp-realm-progression.md` (xem mục 2, hàng "chờ đột phá").

### 5. Phụ thuộc vào Art Bible (`/art-bible`) — chốt sau

- Font cụ thể cho 2 family (seal-số vs. hồ sơ-bút lông), xác nhận glyph
  tiếng Việt đầy đủ.
- Hình học chính xác khung con dấu góc cạnh (góc cắt, độ dày nét) như 1
  theme resource Godot dùng lại toàn game.
- Thuật toán/asset viền mực loang hữu cơ (procedural shader vs. asset
  tĩnh) — ảnh hưởng `card_transition_ms` (200ms, Tuning Knobs), cần
  `technical-artist` khi hiện thực.
- Thang độ đậm mực rời rạc cho dải thái độ 7 mức (bao nhiêu bậc, tỉ lệ
  tương phản đủ đọc trên màn hình di động nhỏ).
- Hình học chính xác khung nút Song Tu (tròn)/Hồi phục (vuông) — nguyên
  tắc phân biệt hành động-vs-dữ-liệu đã chốt ở đây, hình học cụ thể chưa.
- Mã màu hex cho đỏ son/xanh ngọc/giấy kem/đen-xám (game-concept mới đặt
  tên, chưa có giá trị).
- Hành vi responsive lưới 12 chỉ số + thứ tự cuộn trên mobile portrait
  (phối hợp `ux-designer`).

## UI Requirements

**Điểm vào mở thẻ** (MVP):

1. **Tap/click tên nhân vật trong văn tường thuật** — mọi tên nhân vật có
   `card_exists=true` xuất hiện trong narration là vùng chạm mở thẻ (kỹ
   thuật: `RichTextLabel` meta tag, Godot 4.4+ có tham số tooltip; chi
   tiết → becomes an ADR). Đây là điểm vào chính, giữ đúng tinh thần "đọc
   truyện, chạm vào nhân vật để soi".
2. **Nút thẻ bản thân** — luôn hiện ở khung điều hướng chính (vị trí cụ
   thể thuộc Core UI #15, provisional).
3. Điểm vào từ danh sách nhân vật/địa điểm khác: hoãn cho Core UI #15.

**Bảng thông tin hiển thị:**

| Thông tin | Vị trí | Tần suất cập nhật | Điều kiện |
|---|---|---|---|
| Toàn bộ khối ①–④ (qua D.2) | Thẻ overlay toàn nội dung, cuộn dọc | Mỗi lần mở thẻ (snapshot tại thời điểm mở) | `card_exists=true` |
| Khối ⑤ Trạng thái giao đấu | Vị trí CỐ ĐỊNH theo thứ tự ①-⑥ (Core Rule #3, KHÔNG dời khối — sửa 2026-08-10, bản cũ "Đầu thẻ khi giao đấu" mâu thuẫn trực tiếp Core Rule #3 + Visual/Audio §1); khi mở thẻ lúc `in_combat=true`, tự động cuộn (auto-scroll) neo vào khối ⑤; accordion khối ⑤ mặc định MỞ và KHÔNG thể user-collapse trong khi `in_combat=true` (khác hành vi accordion ③⑥) | Mỗi exchange (theo Combat) | `in_combat=true` |
| Badge chết/phế + nút Hồi phục | Theo bảng UI của Death & Consequence | Mỗi lần mở thẻ | `alive=false` / `blocked=true` |
| Nút Song Tu | Khối ④ thẻ NPC | Mỗi lần mở thẻ + sau mỗi lượt confirm | Trạng thái Available/Active |
| Thanh EXP + `exp_to_next`/"chờ đột phá" | Khối ② thẻ nhân vật chính | Mỗi lượt confirm | Chỉ thẻ nhân vật chính |

**Quy tắc tương tác:**

- Thẻ là **overlay** phủ trên luồng tường thuật (không phải màn hình điều
  hướng riêng) — đóng bằng nút X/tap ngoài vùng thẻ/phím Esc; mở/đóng
  không ảnh hưởng trạng thái lượt (Core Rule #1: miễn phí).
- Mọi tương tác đạt parity tap = click; **không có hành vi hover-only**
  (technical-preferences); tooltip nếu có phải kèm đường tap tương đương.
- Godot 4.6 dual-focus: phần tử tương tác trên thẻ phải test cả focus
  chuột/cảm ứng lẫn bàn phím riêng biệt (→ ghi chú implementation,
  becomes an ADR khi dựng scene).
- Nút Song Tu/Hồi phục vô hiệu khi Turn Manager khóa input hoặc
  `in_combat=true` (Edge Cases); trạng thái vô hiệu hiển thị mờ mực (giảm
  alpha), không đổi màu.
- Mobile portrait: thẻ cuộn dọc 1 cột theo thứ tự khối ①–⑥; khối ③⑤⑥ có
  thể thu gọn (accordion — `FoldableContainer` Godot 4.5+, ghi chú
  engine); desktop/landscape: tối đa 2 cột (Hồ sơ trái, chỉ số phải),
  không thay đổi thứ tự đọc.
- Danh sách 12 chỉ số dạng lưới seal 2–3 cột tùy bề rộng; không bảng
  ngang tràn màn hình.
- **Vùng chạm tối thiểu (bổ sung 2026-08-10)**: 4 phần tử tương tác độc
  lập trên thẻ — nút Song Tu, nút Hồi phục, nút X đóng thẻ, badge "đang
  che giấu" (nếu về sau có tương tác) — đều phải đạt `TOUCH_TARGET_MIN=44px`
  (registry, hằng khóa theo WCAG 2.5.5/Apple HIG/Material, đã dùng ở
  `core-ui-screen-navigation.md`), kể cả khi Visual/Audio mô tả chúng là
  "con dấu" nhỏ đặt sát nhãn text.

**Scope**: Không tạo màn hình mới ngoài chính thẻ này — overlay 3 lối
(Character Continuation) và khối giao đấu (Combat) lồng vào khung thẻ như
2 GDD đó đã khóa.

> **📌 UX Flag — Character Card & Identity**: Hệ này có UI requirements
> đầy đủ. Ở Phase 4 (Pre-Production), chạy `/ux-design` để tạo
> `design/ux/character-card.md` **trước khi** viết epics — 3 GDD khác
> (Combat, NPC Affinity, Death & Consequence) đã trỏ story của họ về spec
> này. Story tham chiếu UI phải cite `design/ux/character-card.md`, không
> cite GDD trực tiếp.

## Acceptance Criteria

*(Đề xuất bởi `qa-lead` 2026-08-04, duyệt kèm 5 hướng xử lý spec gap —
gap #1 đã sửa ở Dependencies, gap #3 đã sửa ở Edge Cases + AC-37, gap #2
cross-ref tại AC-11, gap #4/#5 ghi Open Questions. Hệ này là hệ
**Presentation/UI đọc-only** — phần render/layout/interaction FEEL (thị
giác/cảm giác, không thể assert bằng spy/equality) nhận
**ADVISORY** gate (bằng chứng: walkthrough thủ công tại
`production/qa/evidence/character-card-identity/`). NGOẠI LỆ BLOCKING
(làm rõ 2026-08-10 — bản cũ chỉ nêu điều kiện (a) khiến các AC test
interaction WIRING ở mục 7-8 có vẻ mâu thuẫn với câu "interaction feel =
ADVISORY" ngay phía trên) áp dụng cho AC thỏa MỘT trong 2 điều kiện, cả
hai đều test được bằng mock/spy thuần logic, không cần render thật: (a) 5
công thức D.1–D.5 là hàm chọn lọc/dẫn xuất **tất định thuần túy** cùng
logic lựa chọn khối/field dẫn xuất từ chúng (mục 1-6); (b) hành vi
**wiring** tương tác — nút gửi đúng action/đúng số lượng, tính khả dụng
nút theo boolean input (mục 7, Edge Cases mục 8) — phân biệt với **feel**
tương tác (alpha, timing, focus thị giác thật) luôn là `[Manual/UI]`/
ADVISORY (mục 9). Mọi AC gắn nhãn **[Unit]** thỏa (a) hoặc (b) là
**BLOCKING** gate, bắt buộc file test tự động tại
`tests/unit/character-card-identity/` (naming:
`character_card_[feature]_test.gd`, hàm `test_[scenario]_[expected]`)
trước khi story tương ứng được đánh dấu Complete. AC gắn nhãn
**[Manual/UI]** là ADVISORY — bằng chứng bắt buộc trước khi QA sign-off
bản build nhưng không chặn merge code.)*

**Ghi chú test setup**: Mọi phụ thuộc ngoài (EXP & Realm, Combat — đặc
biệt `Điểm_Chỉ_Số`/`estimate_ratio` của D.13, Setting & Canon, NPC
Affinity, Death & Consequence, Turn Manager, Situation Gen) phải được
**inject** như tham số/mock/fixture cố định — không gọi hệ thật, không
AI, không mạng, không đồng hồ thật, không random seed. Card GDD chỉ kiểm
tra rằng nó **đọc đúng** và **render đúng** trạng thái đã khóa của hệ sở
hữu — **không** re-test logic nội bộ của hệ khác (VD: máy trạng thái 5
mức Song Tu là của NPC Affinity, AC ở đây chỉ xác nhận Card render đúng
state được cấp). Mọi AC đọc `base_X0`/`npc_tag`/`concealment` là schema
hệ này **sở hữu** (Rule #8) nên được test trực tiếp, không mock.

### 1. Tồn tại & vòng đời thẻ (Rule #1, #2, #8, #9 / D.1)

**AC-01** (Rule #1 — mở thẻ miễn phí, không sinh action Turn Manager):
GIVEN Turn Manager lần lượt ở 3 trạng thái {Awaiting Action, Resolving,
Undoing}, WHEN gọi API mở thẻ cho 1 `char_id` có `card_exists=true`, THEN
không action nào được gửi tới Turn Manager (spy đếm=0), không lời gọi AI
nào phát ra (spy đếm=0), `world_time` không đổi trước/sau. **[Unit]**
*(spy trên Turn Manager mock + AI-call mock)*

**AC-02** (Rule #1 — xem được ở mọi trạng thái Turn Manager): GIVEN 3
trạng thái như AC-01, WHEN gọi API mở thẻ, THEN trả về snapshot dữ liệu
hợp lệ (không lỗi/không rỗng) ở cả 3 — việc MỞ thẻ không bị chặn bởi
input lock (khác nút bấm TRONG thẻ, xem Nhóm 7). **[Unit]**

**AC-03** (Rule #2/D.1 — tạo thẻ đúng 1 lần khi lượt đầu confirm, ví dụ
GDD): GIVEN `char_id="lam_thien_hao"` chưa từng xuất hiện, WHEN lượt 12
xác nhận có `char_id` này trong `entities_appearing(12)`,
`confirmed(12)=1`, `undone(12)=0`, THEN `card_exists("lam_thien_hao")=true`
ngay sau đó, và giữ `true` ở mọi lượt sau kể cả không xuất hiện lại.
**[Unit]** *(regression neo ví dụ GDD)*

**AC-04** (D.1 — undo đúng lượt tạo thẻ hủy tạo thẻ + cache invalidation,
đóng Edge Case "undo lượt tạo thẻ"): GIVEN `card_exists` đã `true` như
AC-03, lượt 12 vẫn là lượt cuối cùng (`undo_availability_window=true`),
và đã có ≥1 lần mở thẻ trước đó khiến cache render (kể cả Lực chiến ước
tính) được lưu, WHEN người chơi Undo lượt 12, THEN `undone(12)` chuyển
`=1`, `card_exists` chuyển `false` NGAY; cache render của thẻ này bị vô
hiệu (spy `cache.invalidate(char_id)` đếm=1 HOẶC lần truy vấn cache kế
tiếp trả miss); nếu `char_id` xuất hiện lại ở lượt sau, lần mở thẻ kế
tiếp không được trả bất kỳ giá trị nào từ cache cũ. **[Unit]** *(spy trên
cache mock)*

**AC-05** (D.1 — không đơn điệu tuyệt đối chỉ 1 ngoại lệ, độc lập
`alive`): GIVEN `card_exists(char_id)=true` từ 1 lượt hợp lệ không undo,
WHEN `alive(char_id)` sau đó chuyển `false`, THEN `card_exists(char_id)`
VẪN `true` (không bao giờ lật lại `false` do chết — duy nhất undo đúng
lượt tạo mới lật). **[Unit]**

**AC-06** (Rule #8c — schema `npc_tag.medium_override`, mặc định "sỉ
nhục" khi thiếu): GIVEN `npc_tag(char_id).medium_override=null` (chưa
author), WHEN Death & Consequence (mock) đọc `medium_override` qua
interface hệ này cung cấp, THEN giá trị trả về = `"sỉ nhục"`. Test đối
chứng: đã author `medium_override="X"` → trả đúng `"X"`, không bị ghi đè
bởi default. **[Unit]**

**AC-07** (Rule #8b — `base_X0` là interface đọc thẳng, không biến đổi):
GIVEN `base_X0(char_id)` đã lưu đủ 12/12 (qua D.5 pass), WHEN EXP & Realm
(mock) gọi `get_base_X0(char_id, X)` cho từng X trong 12 chỉ số, THEN trả
đúng giá trị đã lưu — không làm tròn/biến đổi/tính lại. **[Unit]**

**AC-08** (Rule #9 — điều tra ngoài hệ, chỉ render kết quả ở lần mở kế,
đóng Edge Case tương ứng): GIVEN thẻ NPC đang mở với
`concealment.active=true`, WHEN Situation Gen (mock) lật
`concealment.active=false` GIỮA LÚC thẻ đang mở (không đóng thẻ), THEN
nội dung ĐANG hiển thị không đổi (không re-render giữa chừng); WHEN thẻ
đóng rồi mở lại, THEN D.2 được gọi lại từ đầu cho TOÀN thẻ, mọi field
trước đó bị che nay trả `true_value` — không có hành vi "patch từng field
lẻ". **[Unit]**

### 2. Cấu trúc khối cố định & bề mặt số liệu duy nhất (Rule #3, #4)

**AC-09** (Rule #3 — chọn khối hiển thị theo cờ trạng thái, hàm thuần
túy): GIVEN 4 tổ hợp cờ: (a) `in_combat=false, alive=true, blocked=false`
(NPC); (b) như (a) nhưng `in_combat=true`; (c) `alive=false`; (d)
`death_and_consequence_blocked=true`, WHEN gọi hàm chọn khối hiển thị,
THEN (a) trả {①②③④} (không ⑤⑥ badge phế); (b) thêm ⑤; (c) trả kèm ⑥
(triện `alive=false`) nhưng KHÔNG ⑤ dù `in_combat` giả định `true` (xem
AC-35); (d) trả kèm khối đỏ son ⑥ + nút Hồi phục nếu hợp lệ. Thứ tự phần
tử trả về LUÔN ①②③④⑤⑥ cố định bất kể tổ hợp cờ. **[Unit]**

**AC-10** (Rule #3 — thanh EXP khối ② chỉ ở thẻ nhân vật chính): GIVEN
`char_id` là NPC, WHEN dựng khối ②, THEN không có phần tử "còn X EXP tới
cấp kế" trong output; GIVEN `char_id` là nhân vật chính, THEN CÓ phần tử
đó. **[Unit]**

**AC-48** (Rule #3 — khối ④ Hảo cảm & Song Tu chỉ ở thẻ NPC, bổ sung
2026-08-10, đối xứng AC-10): GIVEN `char_id` là nhân vật chính, WHEN dựng
thẻ, THEN khối ④ (Hảo cảm số, dải thái độ, nút Song Tu) KHÔNG xuất hiện
trong output; GIVEN `char_id` là NPC, THEN khối ④ CÓ xuất hiện. **[Unit]**

**AC-11** (Rule #4 — số cơ học không bị trích dẫn nguyên văn vào văn
tường thuật, phạm vi kiểm chứng của hệ này): GIVEN danh sách field thuộc
`STAT_FIELDS`/`displayed_estimate`/Hảo cảm số, WHEN audit thư mục
prompt/template Narration Engine (khi tồn tại) tìm tham chiếu SỐ trực
tiếp tới các field này, THEN không tìm thấy tham chiếu nào. **[Manual/UI]**
*(audit thủ công tĩnh — cơ chế chặn runtime chính thuộc Contract
Enforcement: formula `numeric_leak_detection` của GDD đó sở hữu AC
blocking tương ứng; AC này chỉ là audit bổ sung phía Card, xem
Dependencies)*

### 3. Chuỗi ưu tiên hiển thị field — `displayed_field` (D.2)

**AC-12** (D.2 case bình thường, ví dụ 4 GDD): GIVEN
`concealment.active(C)=false`, field không thuộc `IDENTITY_FIELDS` đang
cải trang, WHEN `displayed_field(C, field)` chạy, THEN trả đúng
`true_value(C, field)`. **[Unit]** *(regression neo ví dụ GDD — "Tiểu
Nhị")*

**AC-13** (D.2 case `dual_identity`, ví dụ 1 GDD): GIVEN
`is_major_canon(C)=true`, `disguise_active(C)=true`, `field=name`,
`true_value="Đường Vũ Đồng"`, `disguise_value="Vương Đông"`, WHEN
`displayed_field` chạy, THEN trả `dual_identity(true="Đường Vũ Đồng",
disguise="Vương Đông")` — cả 2 giá trị có mặt. **[Unit]** *(regression
neo ví dụ GDD)*

**AC-14** (D.2 case che giấu có dữ liệu bề ngoài, ví dụ 2 GDD): GIVEN
`is_major_canon(C)=false`, `concealment.active(C)=true`, `field=level`,
`concealment.displayed_value(C, level)=3`, `true_value(C, level)=47`,
WHEN `displayed_field` chạy, THEN trả `3`; test đối chứng gọi
`true_value` trực tiếp (không qua D.2) vẫn `47` — D.2 chỉ chọn giá trị
hiển thị, không ghi đè giá trị lưu trữ. **[Unit]** *(regression neo ví
dụ GDD)*

**AC-15** (D.2 case sentinel `"???"`, ví dụ 3 GDD): GIVEN cùng "Thanh Vân
Tử", `concealment.displayed_value(C, appearance)=null`, WHEN
`displayed_field(C, appearance)` chạy, THEN trả `"???"`. **[Unit]**
*(regression neo ví dụ GDD)*

**AC-16** (D.2 — field ngoài `CONCEALABLE_FIELDS` luôn thật bất kể che
giấu): GIVEN `concealment.active(C)=true`, field ∈ {Hảo cảm số,
`location`, `equipped_weapon_id`, `alive`, dữ liệu khối giao đấu}, WHEN
kiểm tra các field này không đi qua D.2 (hoặc D.2-tương-đương trả
`true_value` luôn), THEN luôn trả `true_value` — không badge che giấu/
không `"???"`. **[Unit]**

**AC-17** (D.2 boundary — `is_major_canon` mà `disguise_active=false`
không kích hoạt `dual_identity`): GIVEN `is_major_canon(C)=true`,
`disguise_active(C)=false`, `field=name`, WHEN `displayed_field` chạy,
THEN trả `true_value` đơn (KHÔNG `dual_identity`) — cả 2 cờ phải cùng
`true` mới vào nhánh 1. **[Unit]** *(boundary)*

### 4. EXP còn lại tới cấp kế — `exp_to_next` (D.3)

**AC-18** (D.3 ca thường, ví dụ GDD): GIVEN `level=25`,
`exp_threshold(25)=340` (mock), `current_exp=300`, WHEN `exp_to_next(C)`
chạy, THEN trả `40`. **[Unit]** *(regression neo ví dụ GDD)*

**AC-19** (D.3 Chờ Đột Phá, ví dụ GDD): GIVEN `level=20` (mod 10=0),
`exp_threshold(20)=290`, `current_exp=290`,
`breakthrough_requirement_met(tier)=false`, WHEN `exp_to_next(C)` chạy,
THEN trả sentinel chuỗi `"chờ đột phá"` (KHÔNG trả `0`). **[Unit]**
*(regression neo ví dụ GDD)*

**AC-20** (D.3 boundary — mốc tròn chục nhưng chưa kẹp trần): GIVEN
`level=20` (mod 10=0), `exp_threshold(20)=290`, `current_exp=250` (chưa
đạt ngưỡng), WHEN `exp_to_next(C)` chạy, THEN
`is_awaiting_breakthrough=false` → trả `40` (số bình thường), KHÔNG trả
`"chờ đột phá"` dù level tròn chục. **[Unit]** *(boundary)*

**AC-21** (D.3 — chỉ áp dụng nhân vật chính, spy không gọi cho NPC):
GIVEN `char_id` là NPC, WHEN dựng khối ② cho NPC đó, THEN `exp_to_next`
KHÔNG được gọi (spy đếm=0), không phần tử EXP nào xuất hiện trong output.
**[Unit]** *(spy)*

### 5. Lực chiến hiển thị trên thẻ — `displayed_estimate` (D.4)

**AC-22** (D.4 bình thường, tái dùng `Điểm_Chỉ_Số` D.13 KHÔNG fork, ví
dụ GDD): GIVEN `concealment.active(C)=false`, mock hàm `Điểm_Chỉ_Số` của
Combat D.13 trả `310` khi nhận đúng bộ 12 `true_value`,
`Điểm_Kỹ_Năng=Điểm_Trang_Bị=0`, WHEN `displayed_estimate(C)` chạy, THEN
trả `310`; spy xác nhận hàm mock được gọi đúng 1 lần với input = bộ 12
`true_value` — Card KHÔNG tự tính lại công thức trọng số riêng. **[Unit]**
*(spy, regression neo ví dụ GDD)*

**AC-23** (D.4 che giấu đủ dữ liệu bề ngoài, ví dụ GDD): GIVEN
`concealment.active(C)=true`, đủ 12/12 `displayed_value`, mock
`Điểm_Chỉ_Số` trả `28` khi nhận bộ 12 giá trị BỀ NGOÀI, WHEN
`displayed_estimate(C)` chạy, THEN trả `28`; spy xác nhận input truyền
vào mock = bộ giá trị bề ngoài (KHÔNG phải `true_value`). **[Unit]**
*(spy, regression neo ví dụ GDD)*

**AC-24** (D.4 propagate `"???"`, ví dụ GDD): GIVEN
`concealment.active(C)=true`, 10/12 chỉ số có `displayed_value`, 2 chỉ
số (Lifesteal, HPRegen) trả `"???"` từ D.2, WHEN `displayed_estimate(C)`
chạy, THEN trả `"???"` NGAY; mock `Điểm_Chỉ_Số` KHÔNG được gọi (spy
đếm=0) — không có phép tính từng phần trên 10 chỉ số còn lại. **[Unit]**
*(spy, regression neo ví dụ GDD)*

**AC-25** (D.4 boundary — chỉ 1/12 `"???"` đã đủ lan truyền): GIVEN
`concealment.active(C)=true`, 11/12 có `displayed_value`, đúng 1 chỉ số
bất kỳ trả `"???"`, WHEN `displayed_estimate(C)` chạy, THEN trả `"???"`
— điều kiện là "tồn tại ≥1", không phải "đa số"/"toàn bộ". **[Unit]**
*(boundary)*

### 6. Kiểm tra đầy đủ chỉ số khởi điểm — `base_stat_completeness_check` (D.5)

**AC-26** (D.5 pass đủ 12/12, ví dụ GDD): GIVEN `base_X0(char_id)` đủ
12/12, mỗi giá trị số `≥0`, WHEN `base_stat_completeness_check(char_id)`
chạy tại thời điểm tạo entity record, THEN trả `1`; entity record được
tạo bình thường; `card_exists(char_id)` chuyển `true` ngay lượt đó (liên
kết D.1). **[Unit]** *(regression neo ví dụ GDD)*

**AC-27** (D.5 fail-fast thiếu 1 chỉ số, ví dụ GDD): GIVEN
`base_X0(char_id)` thiếu đúng 1/12 (VD Lifesteal, undefined), WHEN
`base_stat_completeness_check` chạy, THEN trả `0`; xác nhận (a) xác nhận
lượt tạo nhân vật bị chặn (spy `confirm_turn` đếm=0 hoặc trả lỗi), (b)
log "content gap" phát đúng nội dung tham chiếu `char_id` + field thiếu,
(c) entity record KHÔNG được tạo một phần (spy `create_entity_record`
đếm=0). **[Unit]** *(spy, regression neo ví dụ GDD)*

**AC-28** (D.5 boundary — giá trị âm hoặc phi số dù "defined"): GIVEN
`base_X0(char_id)` đủ 12/12 field NHƯNG 1 field `=-5` (âm) hoặc 1 field
là chuỗi phi số, WHEN `base_stat_completeness_check` chạy, THEN trả `0`
cho cả 2 test con (a) giá trị âm, (b) giá trị phi số — `defined` chưa
đủ, còn cần `numeric` VÀ `≥0`. **[Unit]** *(boundary)*

**AC-46** (D.5 boundary MỚI — `base_HP0=0` chính xác, bổ sung 2026-08-10):
GIVEN `base_X0(char_id)` đủ 12/12 field NHƯNG `base_HP0(char_id)=0` chính
xác (không âm, không phi số — khác case AC-28), WHEN
`base_stat_completeness_check` chạy, THEN trả `0` (fail) — ràng buộc HP là
`>0` STRICT, KHÔNG chấp nhận `=0` dù 11 chỉ số khác chấp nhận `≥0`; log
`"content gap: base_HP0 phải >0 (nhận 0) cho char_id=..."`. Test đối
chứng: cùng tổ hợp nhưng `base_HP0=0.01` (dương rất nhỏ) → trả `1` (pass).
**[Unit]** *(boundary)*

**AC-47** (interface Combat-facing bỏ qua concealment, bổ sung 2026-08-10):
GIVEN `concealment.active(C)=true`, đủ 12 `displayed_value` khác
`true_value`, WHEN Combat (mock) gọi `base_X(C, stat)`/`max_HP(C)` (KHÔNG
phải `displayed_field`), THEN trả đúng `true_value` cho mọi stat — spy
xác nhận hàm không gọi qua D.2/`displayed_field`, kể cả khi
`concealment.active=true`. **[Unit]** *(spy)*

### 7. Tương tác qua nút & khóa input (Rule #7)

**AC-29** (Rule #7 — nút Song Tu gửi action qua Turn Manager): GIVEN thẻ
NPC mở, nút Song Tu ở trạng thái Available, WHEN người chơi bấm nút, THEN
1 action chuẩn được gửi tới Turn Manager (mock, spy đếm=1) — KHÔNG kiểm
nội dung máy trạng thái 5 mức (thuộc NPC Affinity GDD), chỉ xác nhận
đường ghi đi qua Turn Manager. **[Unit]** *(spy)*

**AC-30** (Rule #7 — nút Hồi phục chỉ render lựa chọn hệ sở hữu cung
cấp, tối đa 2): GIVEN Death & Consequence (mock) cung cấp đúng 2 lựa
chọn hồi phục, WHEN thẻ dựng nút Hồi phục, THEN hiển thị ĐÚNG 2 lựa chọn
đó (không tự thêm/bớt); WHEN người chơi chọn 1 trong 2, THEN action gửi
qua Turn Manager (spy đếm=1) mang đúng lựa chọn đã chọn — Card không
tính hiệu quả hồi phục. **[Unit]** *(spy)*

**AC-31** (Rule #7 — Kết liễu/Tha mạng KHÔNG có trên thẻ): GIVEN thẻ đang
mở ở bất kỳ trạng thái nào (kể cả `pending_fate=true` trên đối thủ), WHEN
liệt kê toàn bộ nút hành động trên thẻ, THEN danh sách KHÔNG chứa "Kết
liễu" hoặc "Tha mạng". **[Unit]** *(interface inspection)*

**AC-32** (Rule #7 — nút vô hiệu khi Turn Manager khóa input, không phân
biệt lý do): GIVEN `Turn Manager.input_locked` lần lượt =
`{false, true(Resolving), true(Undoing)}`, WHEN kiểm tra khả dụng nút
Song Tu/Hồi phục (giả định đủ điều kiện hiện nút), THEN khả dụng=`true`
chỉ ở `input_locked=false`, còn lại `=false` — Resolving và Undoing cho
cùng kết quả. **[Unit]** *(boundary)*

**AC-33** (in_combat vô hiệu nút — ĐỘC LẬP với Turn Manager lock, đóng
Edge Case riêng): GIVEN `Turn Manager.input_locked=false` NHƯNG
`in_combat=true`, WHEN kiểm tra khả dụng nút Song Tu/Hồi phục, THEN khả
dụng=`false`. Test đối chứng: `in_combat=false` + `input_locked=false` →
khả dụng=`true` (nếu đủ điều kiện khác) — chứng minh 2 nguồn vô hiệu
tách biệt. **[Unit]** *(boundary)*

### 8. Edge cases bổ sung

**AC-34** (Sentinel short-circuit — cấm gọi `estimate_ratio` với sentinel
phi số): GIVEN `displayed_estimate(player)="???"` HOẶC
`displayed_estimate(target)="???"`, WHEN dựng tỉ lệ so sánh Lực chiến,
THEN kết quả hiển thị=`"???"` NGAY, hàm `estimate_ratio` của Combat D.13
(mock) KHÔNG được gọi (spy đếm=0). Test đối chứng: cả 2 vế là số (VD
`310`, `150`), WHEN dựng tỉ lệ, THEN `estimate_ratio` ĐƯỢC gọi (spy
đếm=1, đúng 2 tham số), kết quả hiển thị = NGUYÊN VĂN sentinel D.13 trả
về nếu rơi ca 0/0 (mock trả `"N/A"` → Card hiển thị đúng `"N/A"`, không
đổi chữ). **[Unit]** *(spy)*

**AC-35** (Nhân vật đã chết — mọi tương tác ẩn/vô hiệu, không khối giao
đấu dù `in_combat=true`): GIVEN `alive(char_id)=false`, mock NPC Affinity
trả `song_tu_state="Ended"`, cờ `in_combat=true` (trường hợp giả định),
WHEN dựng thẻ, THEN (a) thẻ mở thành công, hiển thị giá trị khóa cuối +
triện đỏ son tĩnh; (b) nút Song Tu KHÔNG xuất hiện (ẩn hoàn toàn theo
state Ended, không phải disabled); (c) nút Hồi phục KHÔNG xuất hiện; (d)
khối ⑤ Trạng thái giao đấu KHÔNG xuất hiện dù `in_combat=true`. **[Unit]**

**AC-36** (NPC phế severe — không có nút Hồi phục, chỉ nhân vật chính có
3 phương thức): GIVEN NPC (không phải nhân vật chính) `severity=severe`,
badge hiển thị đúng, mock Death & Consequence KHÔNG cung cấp danh sách
lựa chọn hồi phục cho NPC này, WHEN dựng thẻ NPC, THEN badge phế hiển thị
nhưng nút Hồi phục KHÔNG xuất hiện — thẻ chỉ render nút khi hệ sở hữu
cung cấp lựa chọn hợp lệ, không tự suy luận. **[Unit]**

**AC-37** (Empty state độc lập theo vế — không lỗi, không ẩn khối, "Đánh
thường" không liệt kê): GIVEN 3 tổ hợp: (a) `equipped_weapon_id=null` VÀ
`known_skill_ids=[]`; (b) `equipped_weapon_id=null` NHƯNG
`known_skill_ids` có 3 phần tử; (c) có vũ khí NHƯNG `known_skill_ids=[]`,
WHEN dựng khối ③ cho từng tổ hợp, THEN khối ③ LUÔN xuất hiện; vế rỗng
hiện đúng empty-state của vế đó ("tay không" cho vũ khí / "chưa học kỹ
năng" cho kỹ năng), vế có dữ liệu render bình thường (tổ hợp (b): 3 tên
kỹ năng qua bảng tên Equipment mock, không thêm/bớt); danh sách kỹ năng
KHÔNG chứa "Đánh thường" ở mọi tổ hợp. **[Unit]**

**AC-38** (Name-collision by `char_id` — 2 thẻ độc lập cùng tên hiển
thị): GIVEN 2 `char_id` khác nhau ("tieu_nhi_quan_a", "tieu_nhi_quan_b")
cùng `name="Tiểu Nhị"` nhưng `location` khác nhau, WHEN mở thẻ cho từng
`char_id`, THEN mỗi lần trả đúng entity record riêng (định danh theo
`char_id`, không theo `name`) — không xung đột/ghi đè lẫn nhau; field Vị
trí hiện tại/Thân phận đúng theo `char_id` tương ứng. **[Unit]**

**AC-39** (Overlay 3 lối chiếm quyền — đóng "2 thẻ chồng nhau"): GIVEN
thẻ thường đang mở (`card_open=true`) cho `char_id` bất kỳ, WHEN
`continuation_choice_eligible=true` được phát (mock Character
Continuation), THEN `card_open` chuyển `false` NGAY, overlay 3 lối chiếm
toàn màn hình; tại mọi thời điểm sau đó, không tồn tại trạng thái đồng
thời `card_open=true` VÀ `overlay_open=true` (bất biến loại trừ lẫn
nhau). **[Unit]** *(invariant test)*

### 9. UI/Manual walkthrough

**AC-40** (Điểm vào mở thẻ — tap tên trong văn tường thuật, tap=click
parity): GIVEN màn hình tường thuật hiển thị tên 1 nhân vật có
`card_exists=true`, WHEN người chơi tap (mobile) hoặc click (desktop)
vào vùng tên, THEN thẻ mở đúng `char_id` tương ứng — walkthrough xác
nhận cả 2 phương thức input cho cùng kết quả. **[Manual/UI]** *(evidence:
`production/qa/evidence/character-card-identity/entry-points.md`)*

**AC-41** (Đóng thẻ — 3 đường đóng tương đương, không ảnh hưởng lượt):
GIVEN thẻ đang mở, WHEN người chơi lần lượt dùng nút X / tap ngoài vùng
thẻ / phím Esc (3 lần thử độc lập), THEN cả 3 đều đóng thẻ thành công,
`world_time` không đổi trước/sau mỗi lần. **[Manual/UI]**

**AC-42** (Responsive layout — mobile portrait cuộn dọc / desktop 2 cột,
thứ tự đọc không đổi): GIVEN thẻ mở trên viewport mobile portrait VÀ
desktop landscape, WHEN so sánh thứ tự khối ①–⑥, THEN thứ tự logic
①②③④⑤⑥ giữ nguyên ở cả 2 layout (không đảo khối), khối ③⑤⑥ thu gọn
accordion đúng trên mobile. **[Manual/UI]** *(screenshot cả 2 viewport)*

**AC-43** (Trạng thái vô hiệu hiển thị đúng mờ mực, không đổi màu): GIVEN
nút Song Tu/Hồi phục vô hiệu (theo AC-32/AC-33), WHEN quan sát render,
THEN nút hiển thị giảm alpha (mờ mực), KHÔNG đổi sang màu khác.
**[Manual/UI]** *(screenshot, lead sign-off)*

**AC-44** (Visual signature — danh tính kép & 2 dạng sentinel khớp bảng
Visual/Audio mục 2): GIVEN 1 case `dual_identity`, 1 case `"???"` trong
seal (stat field), 1 case `"???"` ngoài seal (field hồ sơ, dạng vệt mực),
WHEN chụp màn hình cả 3 case, THEN: tên thật đậm nhất family số đứng
trước/tên cải trang trong khung mực loang không seal đứng sau (case 1);
`"???"` trong seal cùng weight số thường (case 2); vệt mực nhỏ thay text
tại field hồ sơ bị che (case 3). **[Manual/UI]** *(evidence + lead
sign-off)*

**AC-45** (Focus bàn phím độc lập chuột/cảm ứng — Godot 4.6 dual-focus):
GIVEN thẻ mở có nút Song Tu/Hồi phục khả dụng, WHEN điều hướng bằng bàn
phím (Tab/mũi tên + Enter) MÀ KHÔNG dùng chuột/cảm ứng, THEN mọi phần tử
tương tác nhận focus đúng thứ tự và kích hoạt được — walkthrough riêng
cho chuột/cảm ứng vs bàn phím, cả 2 đạt kết quả tương đương.
**[Manual/UI]**

## Open Questions

| # | Câu hỏi | Chủ sở hữu | Mục tiêu giải quyết |
|---|---|---|---|
| 1 | Cơ chế **điều tra** lộ giá trị thật NPC che giấu (hành động trong lượt, độ khó, rủi ro bị phát hiện) + ngữ nghĩa **lộ từng phần** (lật từng field hay cả `concealment.active`?) — scope out khỏi hệ này theo quyết định 2026-08-04 | Situation/Encounter Generation (nhận bàn giao, cần bổ sung khi revise GDD đó) | Trước Vertical Slice |
| 2 | Khe che giấu cho `Điểm_Kỹ_Năng`/`Điểm_Trang_Bị` trong D.4 — hiện NPC che giấu vẫn "lộ" 2 thành phần này (chưa lộ gì thực tế vì cả 2 mặc định 0 ở MVP) | Combat System (khi định nghĩa 2 input mờ của D.13) + hệ này (mở rộng schema `concealment`) | Khi Combat mở rộng D.13, hậu MVP |
| 3 | Kiến trúc **cache render** của thẻ (thuộc Card hay lớp UI cache chung?) — AC-04 hiện assert black-box | technical-director / ADR | `/create-architecture` |
| 4 | Bất biến `in_combat` × `alive=false` có loại trừ lẫn nhau ở tầng sở hữu không? (AC-35 chỉ test phòng thủ phía Card) | Combat System + Death & Consequence (xác nhận hợp đồng) | `/consistency-check` kế tiếp hoặc `/review-all-gdds` |
| 5 | EXP GDD có nên lộ field boolean "Chờ Đột Phá" tường minh thay vì để Card tự suy `is_awaiting_breakthrough` từ 2 điều kiện biên (D.3)? | EXP & Realm Progression | Khi retrofit/revise EXP GDD |
| 6 | Ai populate instance `concealment.displayed_*` + hồ sơ cho **NPC do AI sinh**? (Đề xuất: lời gọi sinh NPC schema-constrained của AI Layer/Situation Gen; MVP không cần — 3 NPC seed đều content-authored) | Situation Gen + AI/LLM Integration Layer | Khi thiết kế flow sinh NPC động, hậu MVP |
| 7 | Kỹ thuật điểm vào tap-tên (`RichTextLabel` meta tag 4.4+) + cơ chế map tên-trong-văn-bản → `char_id` (chưa có chủ sở hữu, kể cả ở mức khai báo — cắt ngang AI/LLM Integration Layer + Contract Enforcement, bổ sung phạm vi 2026-08-10) + xử lý dual-focus 4.6 cho phần tử tương tác trên thẻ | technical-director / ADR | `/create-architecture` |
| 8 | Danh sách field đầy đủ của **schema `npc_tag`** — hiện có `medium_override` + `concealment_narrative_hint` (mới 2026-08-10); các hệ khác có thể "đặt hàng" thêm tag | Hệ này (mở rộng theo yêu cầu) | Mở, bổ sung khi có yêu cầu mới |
| 9 | Visual khoảnh khắc **đột phá thật** (nơi hợp lệ duy nhất của xanh ngọc) — art-director đã vẽ ranh giới ở GDD này, nội dung chi tiết chưa tồn tại vì EXP GDD bỏ qua Visual/Audio | EXP & Realm Progression (retrofit Visual/Audio, spawn art-director) | Trước `/art-bible` hoặc cùng đợt |
| 10 | ~~**Quyền sở hữu storage** cho entity record~~ — **ĐÃ ĐÓNG 2026-08-11**: đối chiếu lại 2 GDD nguồn cho thấy quyền sở hữu ĐÃ khóa từ 2026-08-05 (cụm E): `persistence-save-system.md` nhận sở hữu blob Entity Record tường minh ở 2 chỗ; `world-memory-context-management.md` từ chối sở hữu tường minh. Tiền đề "chưa khóa" của OQ này (ghi 2026-08-10) là lỗi thời. Rule #8a/D.1/bảng Interactions đã sửa khớp. Phần dư THẬT còn lại → OQ #14 mới (durability timing) | ~~technical-director / ADR~~ — đã đóng | — |
| 14 | **Durability timing của Entity Record mới tạo**: Entity Record thuộc lớp blob "trạng thái hiện tại" (`fixed_blob_bytes`) của Persistence — đi theo chu kỳ full-bundle flush ĐỊNH KỲ, được phép chạy ngoài critical path của lượt. Chưa có tài liệu nào nói rõ: entity record TẠO MỚI ở lượt N có được đảm bảo bền vững ngay tại lượt N không (D.1 `card_exists` phụ thuộc "lượt đã confirm" — nếu crash giữa 2 chu kỳ flush, thẻ có thể "đã tồn tại" trong session nhưng biến mất sau reload)? (bổ sung 2026-08-11, phần dư hẹp tách từ OQ #10) | Persistence + hệ này | `/create-architecture` (cùng đợt 6 hạng mục prototype Persistence) |
| 11 | ~~**`disguise_active(C) := len(alias_list(C))>0`** chưa xác nhận với owner~~ — **ĐÃ ĐÓNG 2026-08-11** (quyết định user): Setting & Canon cam kết tường minh (ghi chú cascade bên đó) alias list là **TĨNH per setting pack ở MVP** — không content MVP nào có nhân vật ngừng cải trang giữa truyện, suy diễn của D.2 an toàn theo hợp đồng. Cơ chế ngừng-cải-trang cho Alpha (cờ runtime do Setting & Canon sở hữu + serialize) → Open Question CÓ OWNER tại `setting-canon-integration.md` | ~~Setting & Canon Integration~~ — đã đóng | — |
| 12 | ~~Cam kết tiêu thụ **`npc_tag.concealment_narrative_hint`**~~ — **ĐÃ ĐÓNG 2026-08-11**: `ai-llm-integration-layer.md` bổ sung gạch đầu dòng context-data tường minh (cùng khuôn `style_descriptor` của Equipment — nơi Core Rule #2 bên đó tự tuyên "mọi nghĩa vụ ủy quyền PHẢI liệt kê ở đây") cam kết chèn hint + chỉ thị "không mô tả thực lực thật NPC che giấu" vào `narration_call`; `mechanic-narration-contract-enforcement.md` ghi nhận nghĩa vụ ủy quyền + giới hạn hậu kiểm (leak-check số học không bắt được leak văn xuôi — cùng lớp với ủy quyền "cấm viết số bằng chữ") | ~~2 hệ đó~~ — đã đóng | — |
| 13 | ~~Tiền đề anchor moment 1 chưa chứng minh cross-system~~ — **ĐÃ ĐÓNG 2026-08-11** (quyết định user, hạ phạm vi): Rule #2 nay giới hạn tường minh "chỉ nhân vật có `char_id`" — đối thủ ambient vô danh (Situation Gen D.7/D.4b) KHÔNG có thẻ, khớp nguyên văn Combat Dependencies (tự dựng chỉ số từ `level + stat_growth`). Anchor moment 1 bảo toàn cho lớp vô danh ở tầng thiết kế: D.7 cap level ≤ player+15 (trần cứng +20) nên "nguy hiểm đọc được" không cần thẻ. Mâu thuẫn 3-GDD giải thể bằng văn bản, không cần cơ chế mới | ~~Combat + Situation Gen~~ — đã đóng | — |
