# Game Concept: Vô Danh Lục

*Created: 2026-08-01*
*Status: Approved (re-review xác nhận 2026-08-11 — verdict treo "NEEDS
REVISION nhẹ" 2026-08-01 đóng: cả 4 blocking + bỏ Cứu Mệnh xác minh có
thật trong văn bản, drift check với 13 GDD Approved không phát hiện mâu
thuẫn thiết kế nào; 5 sửa metadata áp cùng phiên — xem
`reviews/game-concept-review-log.md`)*

---

## Elevator Pitch

> Đây là một tiểu thuyết tương tác kết hợp RPG tu tiên, nơi bạn lựa chọn hành
> động của nhân vật chính trong một thế giới do AI mô phỏng khách quan, để tự
> mình viết nên con đường tu luyện — không có nhân vật chính được ưu ái, chỉ
> có thực lực và hệ quả thật sự.

---

## Core Identity

| Aspect | Detail |
| ---- | ---- |
| **Genre** | Tiểu thuyết tương tác (Interactive Fiction) + RPG tu tiên (Xianxia RPG), chiến đấu theo lượt tường thuật bằng văn bản |
| **Platform** | Web, Mobile Web (Godot 4.6 export HTML5) |
| **Target Audience** | Dự án cá nhân — người chơi duy nhất là nhà phát triển (xem Target Player Profile) |
| **Player Count** | Single-player, dùng riêng tư, không thương mại |
| **Session Length** | 30–120 phút/phiên, linh hoạt theo mạch truyện |
| **Monetization** | Không — dự án cá nhân, phi thương mại |
| **Estimated Scope** | Large (MVP vài ngày–vài tuần, solo; mở rộng liên tục không giới hạn thời gian sau đó) |
| **Comparable Titles** | `reference.md` (dự án AI kể chuyện gốc dùng tham khảo), AI Dungeon, tiểu thuyết tu tiên tương tác dạng văn bản |

---

## Core Fantasy

Bạn là một kẻ vô danh bước vào con đường tu luyện, trong một thế giới không
ban cho bạn bất kỳ đặc quyền nào. Mọi NPC đều có suy nghĩ, mục tiêu, và cảm
xúc riêng — họ đối xử với bạn dựa trên thực lực và hành động thực sự của bạn,
không phải vì bạn là nhân vật chính. Thành tựu ở đây có ý nghĩa thật, vì không
ai "cho không" bạn điều gì.

---

## Unique Hook

Giống AI Dungeon — do AI kể chuyện tự do không giới hạn kịch bản — VÀ CŨNG
có một lớp trạng thái (Lực chiến, EXP, Hảo cảm, sống/chết) mà AI không bao
giờ được phép nói dối hay tự ý thay đổi, dù đang kể chuyện hấp dẫn đến đâu.

---

## Bối Cảnh (Setting Selection)

Người chơi chọn bối cảnh xuất phát từ các danh tác tu tiên/huyền huyễn có sẵn
(ví dụ: Đấu La Đại Lục, Phàm Nhân Tu Tiên, Tiên Nghịch, Kiếm Lai...). Nhân
vật chính LUÔN là một người hoàn toàn mới, được đưa vào thế giới đó — không
phải nhân vật có sẵn trong nguyên tác.

Nhân vật chính là kiểu nhân vật "xuyên không" — mang theo hiểu biết về
nguyên tác (nhân vật lớn, sự kiện quan trọng, diễn biến sắp tới) khi bước
vào thế giới, giúp chuẩn bị/đưa ra quyết định chiến lược. Đây là đặc quyền
của **người chơi** (thông tin meta), không phải đặc quyền trong thế giới —
NPC vẫn đối xử với nhân vật chính hoàn toàn dựa trên hành động/thực lực
thật, không biết và không quan tâm nhân vật chính có "biết trước" hay
không. Đặc quyền xuyên không không mâu thuẫn với Pillar 1 (Thế Giới Khách
Quan) vì nó không làm NPC thiên vị — chỉ cho người chơi thêm thông tin để ra
quyết định.

Các nhân vật/cao thủ gốc của danh tác vẫn tồn tại và vận hành theo đúng logic
riêng của họ, không nhường đường hay xoay quanh nhân vật chính một cách mặc
định — củng cố trực tiếp pillar *Thế Giới Khách Quan*. Các lực đẩy vĩ mô của
nguyên tác (VD: Vũ Hồn Điện muốn gây chiến) là cố định vì có nguyên nhân độc
lập với người chơi. Nhưng các sự kiện cụ thể phụ thuộc vào một tiền đề nhân
quả (thường là một mối quan hệ NPC) có thể bị người chơi phá vỡ hoàn toàn —
khi đó, sự kiện đó không còn diễn ra như nguyên tác mà rẽ sang hướng khác. Ví
dụ: nếu nhân vật chính giành được Tiểu Vũ làm vợ trước khi cô hy sinh vì
Đường Tam, thì sự kiện "Tiểu Vũ hy sinh" sẽ không xảy ra — và mọi hệ quả nhân
quả từ đó (bước ngoặt sức mạnh, động lực trả thù của Đường Tam) rẽ nhánh theo
hướng mới do AI mô phỏng, không còn bị ràng buộc bởi nguyên tác. Đây là cách
pillar *Hệ Quả Thực Sự* thể hiện: thế giới khách quan, nhưng không bất biến
trước một người chơi đủ giỏi.

Lưu ý thiết kế: tiền đề nhân quả có thể phá vỡ không giới hạn ở quan hệ tình
cảm/thân mật — mọi tiền đề nhân quả tương tự (liên minh, cứu mạng, trao đổi
tin tức, thù địch được hóa giải...) cần có khả năng tạo đòn bẩy phân nhánh
tương đương. Điều này tránh để nội dung nhạy cảm (Pillar 5) vô tình trở
thành con đường mạnh nhất về mặt cơ học để thay đổi cốt truyện — người chơi
nên chọn hướng đó vì mạch truyện, không vì lợi ích hệ thống.

Về sức mạnh: "mây tầng nào gặp gió tầng nấy" — cao thủ cực mạnh không chủ
động tìm người yếu để gây sự, giống như người thường không cố ý đi giết
kiến. Trong điều kiện bình thường, chỉ NPC có cấp độ chênh lệch không quá 20
cấp mới có thể mang địch ý chủ động với nhân vật chính. Cao thủ vượt xa mức
đó chỉ xuất hiện gây khó dễ khi bị khiêu khích nghiêm trọng hoặc chịu thiệt
hại nặng từ nhân vật chính. NPC trung lập hoặc có hảo cảm với nhân vật chính
không bị giới hạn chênh lệch 20 cấp này.

---

## Player Experience Analysis (MDA Framework)

### Target Aesthetics (What the player FEELS)

| Aesthetic | Priority | How We Deliver It |
| ---- | ---- | ---- |
| **Sensation** (sensory pleasure) | N/A | Không trọng tâm — giao diện tối giản, tập trung vào văn bản |
| **Fantasy** (make-believe, role-playing) | 2 | Thế giới tu tiên, roleplay tự do, nhân vật do người chơi định hình |
| **Narrative** (drama, story arc) | 1 | Toàn bộ cốt truyện phát sinh từ lựa chọn người chơi, AI tường thuật liên tục |
| **Challenge** (obstacle course, mastery) | 2 | Công thức Lực chiến minh bạch, áp chế cảnh giới, rủi ro thật khi chiến đấu |
| **Fellowship** (social connection) | 3 | Hệ thống Hảo cảm NPC, quan hệ/thù địch có hậu quả lan truyền |
| **Discovery** (exploration, secrets) | 1 | Thế giới AI mô phỏng liên tục, khám phá phản ứng khách quan của NPC/thế giới |
| **Expression** (self-expression, creativity) | 2 | Tự do định hình nhân vật, phong cách roleplay, kể cả chủ đề nhạy cảm |
| **Submission** (relaxation, comfort zone) | N/A | Không phải trọng tâm — chiến đấu và hệ quả tạo áp lực thật, không phải giải trí nhẹ nhàng |

### Key Dynamics (Emergent player behaviors)

- Người chơi sẽ cân nhắc kỹ trước mỗi lựa chọn vì biết hệ quả là vĩnh viễn, không thể quay lại.
- Người chơi sẽ theo dõi Hảo cảm NPC như một nguồn tài nguyên chiến lược, không chỉ là cảm xúc.
- Người chơi sẽ tránh chiến đấu vượt bậc quá xa trừ khi đã chuẩn bị kỹ (trang bị/kỹ năng đủ bậc), vì áp chế cảnh giới có thể quyết định thắng thua ngay cả khi thực lực gần bằng nhau.

### Core Mechanics (Systems we build)

1. Hệ thống lựa chọn theo lượt do AI tạo tình huống (turn-based, mỗi lượt = 1 hành động của người chơi).
2. Công thức Lực chiến (Điểm Chỉ số + Điểm Kỹ năng + Điểm Trang bị, phạt vượt bậc, áp chế cảnh giới) quyết định thắng thua — AI tường thuật lại kết quả bằng văn bản.
3. Hệ thống Kinh nghiệm & Cảnh giới (EXP theo nhiều nguồn hành động, nhân hệ số theo Tâm pháp, 10 cấp = 1 bậc/cảnh giới).
4. Hệ thống Hảo cảm NPC (-100 → 100, lan truyền xã hội khi có xung đột, mở khóa Song Tu ở ngưỡng nhất định).
5. Thế giới ghi nhớ dài hạn toàn cục — lịch sử lựa chọn ảnh hưởng trực tiếp đến nội dung AI tạo ra sau này, áp dụng cho cả người chơi và NPC (NPC cũng là "nhân vật chính" của chính họ). Thời gian thế giới, bao gồm tiến triển EXP của NPC, chỉ trôi theo lượt của người chơi — không theo thời gian thực — nên NPC không thể "vượt mặt" người chơi trong lúc người chơi không chơi.
6. Chọn bối cảnh danh tác có sẵn làm thế giới nền; nhân vật chính luôn là người hoàn toàn mới, không phải nhân vật gốc trong nguyên tác (xem mục Bối Cảnh).
7. Thẻ Nhân Vật (Character Card): mỗi nhân vật quan trọng (nhân vật chính và NPC) có một thẻ nhân vật xem được — đây là một đặc quyền của người chơi, cho phép nhìn thấy chỉ số khách quan thay vì chỉ dựa vào tường thuật. Thẻ gồm:
   - **Hồ sơ**: Tên, Giới tính, Thân phận, Thái độ với nhân vật chính (chỉ có ở thẻ NPC), Tính cách, Ngoại hình, Tiểu sử.
   - **Chỉ số chiến đấu**: Cấp độ - Bậc, HP, ATK, DEF, SPD, ACC, Lifesteal (LSTL), HP Regen, Crit Rate, Crit Damage, Khuếch đại sát thương, Chống chịu, Né tránh.
   - **Hảo cảm** và nút **Song Tu** (chỉ xuất hiện khi Hảo cảm đủ ngưỡng điều kiện).

   Thẻ nhân vật không đảm bảo chính xác 100% cho mọi nhân vật theo cùng một cách:
   - **Nhân vật lớn/quan trọng thuộc nguyên tác** (danh tác được chọn làm bối cảnh): nhờ đặc quyền xuyên không của nhân vật chính, người chơi luôn biết danh tính/giới tính thật sự ngay cả khi nhân vật đó đang cải trang (ví dụ: Đường Vũ Đồng cải trang thành "Vương Đông" — người chơi vẫn biết đây là Đường Vũ Đồng, có thể gọi đúng tên thật khi tương tác). **Đặc quyền này chỉ là thông tin riêng của người chơi — không làm thay đổi trạng thái thế giới**: các NPC khác vẫn bị lừa và tiếp tục gọi/đối xử với nhân vật đó theo danh tính cải trang ("Vương Đông"), trừ khi chính NPC đó chủ động để lộ thân phận, hoặc vô tình bị NPC khác phát hiện qua diễn biến trong truyện.
   - **NPC khác** (không thuộc nhóm nhân vật lớn nguyên tác, kể cả nhân vật do AI mô phỏng mới): nếu dịch dung hoặc dùng kỹ năng che giấu cảnh giới thật (ví dụ: Liễm Tức Quyết), người chơi chỉ được biết NPC ĐANG che giấu/dịch dung — không biết giá trị/danh tính thật bên dưới — phải tự tìm hiểu.

---

## Player Motivation Profile

### Primary Psychological Needs Served

| Need | How This Game Satisfies It | Strength |
| ---- | ---- | ---- |
| **Autonomy** (freedom, meaningful choice) | Mọi tình huống đều mở, không có đường thẳng cố định, thế giới không dẫn dắt | Core |
| **Competence** (mastery, skill growth) | Lực chiến/cảnh giới tăng dần, thể hiện rõ qua từng đoạn tường thuật chiến đấu | Core |
| **Relatedness** (connection, belonging) | Hảo cảm NPC có thật, có hậu quả lâu dài, NPC có đời sống/mục tiêu riêng | Core |

### Player Type Appeal (Bartle Taxonomy)

- [x] **Achievers** (goal completion, collection, progression) — How: Leo cảnh giới, tối ưu Lực chiến, sưu tầm kỹ năng/trang bị đúng bậc
- [x] **Explorers** (discovery, understanding systems, finding secrets) — How: Khám phá cách thế giới/NPC phản ứng khách quan với từng lựa chọn
- [ ] **Socializers** (relationships, cooperation, community) — Không áp dụng theo nghĩa multiplayer; nhu cầu kết nối được phục vụ qua hệ thống Hảo cảm NPC (xem Relatedness ở trên)
- [ ] **Killers/Competitors** (domination, PvP, leaderboards) — Không áp dụng, không có PvP/bảng xếp hạng

*(Bổ sung: Creator — tự do định hình nhân vật/câu chuyện theo phong cách riêng, kể cả roleplay chủ đề nhạy cảm.)*

### Flow State Design

- **Onboarding curve**: Tình huống mở đầu đơn giản, giới thiệu dần từng hệ thống (lựa chọn hành động cơ bản trước, chiến đấu/tu luyện sau).
- **Difficulty scaling**: Cảnh giới của đối thủ/tình huống do AI tạo ra tăng dần theo cảnh giới nhân vật; áp chế cảnh giới tạo rủi ro rõ ràng khi người chơi chủ động vượt bậc.
- **Feedback clarity**: Đoạn văn tường thuật chiến đấu + điểm Lực chiến hiển thị rõ nguyên nhân thắng/thua.
- **Recovery from failure**: Thua trận trước đối thủ chưa đến ngưỡng thù địch sâu sắc (Hảo cảm > -80) vẫn nhận EXP nhỏ (4%) nhưng chịu hậu quả thật — trọng thương, bị ép uống thuốc độc, sỉ nhục trước đám đông, phế bỏ đan điền/võ công (có thể khôi phục qua đại cơ duyên/tiên thảo). Chỉ khi đối thủ ở ngưỡng thù địch sâu sắc (Hảo cảm -100 đến -80), thua trận mới có nguy cơ dẫn đến cái chết thật sự.

---

## Core Loop

### Moment-to-Moment (30 seconds)

AI mô tả một tình huống → người chơi cân nhắc chiến lược và chọn hành động
(mỗi lượt = 1 hành động) → nếu dẫn đến chiến đấu, hệ thống tính Lực chiến để
phân thắng thua → AI bắt buộc viết đoạn văn tường thuật trận đấu (dùng chiêu
gì, trang bị gì, vật phẩm tiêu hao gì, diễn biến qua lại) → hệ quả được ghi
nhận vào thế giới.

### Short-Term (5-15 minutes)

Một chuỗi tình huống liên tiếp (khám phá → tương tác NPC → có thể dẫn đến
chiến đấu) → nhận thưởng (EXP/vật phẩm) → thế giới cập nhật trạng thái (Hảo
cảm, danh tiếng, lịch sử) → AI dùng đúng lịch sử đó để tạo tình huống kế
tiếp.

### Session-Level (30-120 minutes)

Một đoạn cốt truyện/chương hoàn chỉnh — nhiều tình huống nối tiếp, có thể lên
cấp/đổi bậc, mở khóa kỹ năng/trang bị bậc cao hơn, kết thúc ở một nút thắt
tường thuật tự nhiên (cuối chương, sau một trận chiến lớn, hoặc một bước
ngoặt quan hệ).

### Long-Term Progression

Leo cảnh giới (10 cấp/bậc), tích lũy kỹ năng/trang bị phù hợp bậc (không có
shortcut "đè bậc" vì bị phạt điểm), và tích lũy Hảo cảm với các NPC quan
trọng. Vì là dự án cá nhân, không có "kết thúc" cố định — giống một cuốn
nhật ký sống, mở rộng khi cần.

### Retention Hooks

- **Curiosity**: Thế giới phản ứng thế nào với lựa chọn vừa rồi? NPC nào sẽ nhớ chuyện này?
- **Investment**: Lực chiến, cảnh giới, và các mối quan hệ Hảo cảm đã dày công xây dựng — không thể quay lại nếu mất.
- **Social**: Không áp dụng (single-player).
- **Mastery**: Tối ưu công thức Lực chiến, tránh áp chế cảnh giới bất lợi, leo cảnh giới hiệu quả.

---

## Cái Chết

Không phải mọi thất bại trong chiến đấu đều dẫn đến cái chết. Mức độ hậu quả
khi thua phụ thuộc vào Hảo cảm của đối thủ đối với nhân vật chính:

- **Hảo cảm từ -100 đến -80 (thù địch sâu sắc)**: thua trận có nguy cơ THẬT
  SỰ dẫn đến cái chết, theo kết quả công thức Lực chiến.
- **Các mức Hảo cảm khác (chưa đến ngưỡng thù địch sâu sắc)**: thua trận dẫn
  đến hậu quả nghiêm trọng nhưng không gây chết — trọng thương, bị ép uống
  thuốc độc, sỉ nhục trước đám đông, phế bỏ đan điền/võ công... Loại hậu quả
  cụ thể do hệ thống xác định trước (dựa trên bối cảnh/mức chênh lệch Lực
  chiến — **hoặc, ở đúng ngưỡng thù địch sâu sắc, việc VỪA THOÁT CHẾT tự nó
  cũng là một "bối cảnh" ép mức hậu quả nặng nhất, bất kể mức chênh lệch Lực
  chiến của trận đó — sửa 2026-08-09, khớp `death-and-consequence.md` Core
  Rule 3c/3d**), AI chỉ tường thuật lại, không tự chọn. Phế bỏ đan điền/võ
  công không phải hậu quả vĩnh viễn — có thể khôi phục qua đại cơ duyên, tiên
  thảo dị bảo, hoặc sự kiện cốt truyện đặc biệt do AI mô phỏng, nhưng không
  dễ dàng và không đảm bảo. **Phế bỏ đan điền/võ công đi kèm 1 penalty Lực
  chiến thật (nhỏ, có chủ đích — xem `death-and-consequence.md` Core Rule
  #6), không chỉ chặn tích lũy EXP** (sửa 2026-08-09).

Khi kết quả "phải chết" thực sự xảy ra (chỉ có thể ở ngưỡng thù địch sâu
sắc), nhân vật chính THẬT SỰ chết — không có cơ chế cứu mạng nào can thiệp,
kể cả AI. Đây là hệ quả trực tiếp của Pillar 3 (Sức Mạnh Có Logic): không có
luật phi-diegetic nào (như bộ đếm lượt) được phép ghi đè kết quả công thức.

Người chơi khi đó chọn: Quỷ tu (tiếp tục bằng con đường tu luyện tà đạo/quỷ
đạo), Chuyển sinh (đầu thai thành nhân vật mới), hoặc Chơi lại (bắt đầu lại
từ đầu). Ba lối đi này là toàn bộ "lưới an toàn" của game — không phải dưới
dạng tránh chết, mà dưới dạng tiếp tục có ý nghĩa sau khi chết.

---

## Game Pillars

### Pillar 1: Thế Giới Khách Quan

Thế giới và NPC phản ứng công bằng, không thiên vị nhân vật chính; NPC có
suy nghĩ, chính kiến, mục tiêu và tiến triển riêng — kể cả NPC yêu thích nhân
vật chính vẫn có thể thể hiện tình cảm cá nhân (khen, lo lắng, tình tứ...)
nhưng tuyệt đối không để lời tường thuật khẳng định nhân vật chính vượt trội
như một sự thật khách quan của thế giới.

*Design test*: Phân vân giữa để NPC nhượng bộ cho "đẹp" cốt truyện hay hành
xử đúng logic/lợi ích của họ → chọn logic khách quan.

### Pillar 2: Hệ Quả Thực Sự

Mọi lựa chọn để lại dấu vết lâu dài trong lịch sử thế giới, ảnh hưởng nội
dung AI tạo ra sau này. Ngoại lệ duy nhất: người chơi có thể xóa/undo đúng
lượt VỪA xác nhận (sửa lỗi thao tác) trước khi lượt kế tiếp diễn ra — một
khi đã sang lượt mới, lượt trước đó khóa vĩnh viễn, không thể sửa nữa.
**Trừ lượt dẫn đến chết thật — không thể undo** (bổ sung chữ nghĩa
2026-08-11 cho khớp `turn-manager.md` Core Rule #9, vốn suy diễn hợp lệ
từ chính Anti-Pillar "không cơ chế cứu chết" bên dưới: Undo không được
phép trở thành cơ chế cứu mạng phi-diegetic).

*Design test*: Phân vân giữa tính năng tiện lợi (undo/reset) và tính nhất
quán lịch sử → giữ hệ quả, không có làm lại dễ dàng — ngoại lệ duy nhất:
undo đúng 1 lượt gần nhất để sửa lỗi thao tác, khóa vĩnh viễn ngay khi lượt
kế tiếp được xác nhận.

### Pillar 3: Sức Mạnh Có Logic

Lực chiến dựa trên công thức minh bạch (Chỉ số + Kỹ năng + Trang bị, phạt
vượt bậc, áp chế cảnh giới) — không có hào quang nhân vật chính bẻ cong luật
chơi.

*Design test*: Phân vân giữa cho nhân vật chính thắng kịch tính phi logic
hay để công thức quyết định → để Lực chiến quyết định, AI chỉ tường thuật
lại kết quả đã tính.

### Pillar 4: Tường Thuật Sống Động

Mỗi kết quả cơ học (đặc biệt là chiến đấu) phải được AI kể lại thành một
đoạn văn cụ thể, phản ánh đúng kỹ năng/trang bị đã dùng.

*Design test*: Phân vân giữa hiển thị số liệu thô (dạng bảng combat log) và
một đoạn văn tường thuật → luôn ưu tiên tường thuật, số liệu chỉ là hậu
trường.

### Pillar 5: Tự Do Nhập Vai

Người chơi định hình nhân vật/câu chuyện theo phong cách riêng, kể cả chủ đề
nhạy cảm.

*Design test*: Phân vân giữa giới hạn lựa chọn để "sạch sẽ" hay mở rộng cho
người chơi tự quyết → mở rộng, luôn bật nhưng chỉ gọi đến khi người chơi
lựa chọn hành động đó (không phải một công tắc cấu hình riêng).

*Design test (kiến trúc)*: Phân vân giữa một backend AI rẻ/mạnh nhưng cấm
nội dung nhạy cảm, và một backend yếu hơn nhưng cho phép → chọn backend cho
phép; Pillar 5 thắng ở tầng chọn hạ tầng kỹ thuật.

### Nguyên tắc: Khế Ước Cơ Học/Tường Thuật

Trạng thái thế giới (Lực chiến, thắng/thua, EXP, Hảo cảm, sống/chết, sở hữu
vật phẩm) luôn do hệ thống/công thức quyết định trước — AI nhận kết quả đã
tính như một dữ kiện bất khả kháng và chỉ có quyền quyết định cách kể lại
bằng văn bản. AI không bao giờ tự ý thay đổi kết quả cơ học, kể cả để "cứu"
nhân vật chính — không có ngoại lệ nào. Khi công thức Lực chiến xác định
"phải chết" (xem mục Cái Chết), nhân vật chính chết thật.

Agency của người chơi trong chiến đấu nằm ở khâu CHUẨN BỊ và CAM KẾT (chọn
đánh hay không, mang gì, dùng kỹ năng nào, có tìm cách thay đổi điều kiện
trước không), không nằm ở khâu PHÂN ĐỊNH kết quả — khi đã giao chiến, công
thức Lực chiến quyết định, AI tường thuật trung thực.

Về mặt kỹ thuật, Khế Ước này không thể chỉ dựa vào prompt engineering để giữ
AI tuân thủ — prompt là gợi ý, không phải ràng buộc. Kiến trúc phải thực thi
một chiều: hệ thống tính toán và khóa kết quả trước → kết quả đã khóa được
đưa vào prompt chỉ để AI tường thuật → đầu ra của AI không bao giờ được
parse ngược lại thành trạng thái thế giới, dưới bất kỳ tính năng nào trong
tương lai. Nguyên tắc này cần được đặc tả đầy đủ thành ADR khi vào
`/create-architecture`.

### Anti-Pillars (What This Game Is NOT)

- **KHÔNG để NPC tâng bốc/nhượng bộ nhân vật chính vô lý**: phá vỡ pillar *Thế Giới Khách Quan* — NPC có thể yêu quý/khen ngợi như cảm xúc cá nhân, nhưng không phải lời phán xét của thế giới.
- **KHÔNG làm chiến đấu real-time/hoạt ảnh phức tạp**: phá vỡ trọng tâm *Tường Thuật Sống Động* bằng văn bản, không phải phản xạ tay.
- **KHÔNG cho phép quay lại/undo quá 1 lượt gần nhất**: người chơi chỉ có thể xóa lượt VỪA xác nhận (sửa lỗi bấm nhầm/mô tả nhầm), không thể quay ngược nhiều lượt hay viết lại lịch sử xa hơn — đây là ngoại lệ DUY NHẤT với pillar *Hệ Quả Thực Sự*; và ngay cả ngoại lệ này cũng KHÔNG áp dụng cho lượt dẫn đến chết thật (xem Pillar 2 + `turn-manager.md` Core Rule #9 — bổ sung 2026-08-11).
- **KHÔNG có hệ thống multiplayer/xã hội thật**: đây là game một người chơi, phát triển riêng cho cá nhân, không phải sản phẩm thương mại.
- **KHÔNG có bất kỳ cơ chế nào để AI hoặc hệ thống "cứu" nhân vật chính khỏi cái chết đã được công thức Lực chiến xác định**: phải chết là chết thật, không ngoại lệ — đây từng là ngoại lệ phi-diegetic duy nhất trong thiết kế và đã bị loại bỏ để giữ đúng pillar *Sức Mạnh Có Logic*.

---

## Visual Identity Anchor

**Quy tắc thị giác**: Mọi con số phải được minh họa bằng nét mực trước khi được đọc như dữ liệu — số liệu không bao giờ đứng trần trụi, luôn nằm trong một khung/hiệu ứng gợi cảm giác đang được viết ra.

**Tên hướng**: Mực Chưa Khô (Wet Ink)

- **Mood & bầu không khí**: Chiêm nghiệm, nặng ký, như một cuốn nhật ký riêng đang ghi lại chuyện có thật — không phải HUD game.
- **Ngôn ngữ hình khối**: Khung/viền theo mép mực loang, bất quy tắc, hữu cơ; riêng các con số cứng (HP/ATK/Lực chiến) đặt trong hình con dấu góc cạnh — sắc bén CHỈ xuất hiện ở nơi đang khẳng định một sự thật cơ học.
- **Triết lý màu sắc**: Nền giấy dó kem/trắng ngà, chữ tường thuật đen-xám đơn sắc. Một màu accent DUY NHẤT dành riêng cho thay đổi vĩnh viễn: đỏ son (trọng thương/chết/hậu quả), xanh ngọc (đột phá cảnh giới). Màu bị "khẩu phần hóa" nghiêm ngặt — chính vì hiếm nên xuất hiện là biết ngay thế giới vừa đổi thật.

**Vì sao chọn hướng này**: Giải quyết trực tiếp mâu thuẫn giữa Pillar 4 (Tường Thuật Sống Động — minh thị bác bỏ "bảng số liệu thô") và Thẻ Nhân Vật (bắt buộc hiển thị số liệu chiến đấu chi tiết). Đây là hướng duy nhất biến chính mâu thuẫn đó thành quy tắc thị giác trung tâm thay vì né tránh. Cũng rẻ nhất để build (chủ yếu typography + Control theming trong Godot, khớp Art Pipeline Complexity: Thấp), và "khẩu phần hóa màu sắc" là công cụ visual hierarchy mạnh cho UI chữ-nặng trên di động.

*(Ghi chú AD: hai hướng còn lại — Sổ Sách Khách Quan, Sương Che Nửa Mặt — vẫn có giá trị làm accent cục bộ, có thể cân nhắc hợp nhất một phần khi viết Art Bible đầy đủ ở `/art-bible`.)*

---

## Inspiration and References

| Reference | What We Take From It | What We Do Differently | Why It Matters |
| ---- | ---- | ---- | ---- |
| `reference.md` (dự án AI kể chuyện gốc) | Cấu trúc chỉ số/kỹ năng/trang bị, hệ thống tag nội dung, khái niệm nội dung nhạy cảm tùy ngữ cảnh | Chuyển sang nền tảng Godot; bỏ toggle bật/tắt cố định — thay bằng "luôn sẵn có, chỉ xuất hiện khi lựa chọn dẫn tới"; thêm công thức áp chế cảnh giới và Hảo cảm NPC có lan truyền xã hội | Xác nhận mô hình AI-narrative RPG với chỉ số thật có thể hoạt động tốt |
| AI Dungeon | Tường thuật hoàn toàn do AI tạo dựa trên lựa chọn tự do | Thêm khung RPG có công thức rõ ràng (Lực chiến, cảnh giới) thay vì hoàn toàn tự do vô định hình | Xác nhận nhu cầu cho tường thuật AI mở, không giới hạn kịch bản |
| Tiểu thuyết tu tiên tương tác (choose-your-own-adventure xianxia) | Hệ thống cảnh giới, tâm pháp, song tu, thuật ngữ thể loại | Số hóa thành công thức game tính toán được (Lực chiến, EXP, Hảo cảm) | Xác nhận đúng gu thể loại người chơi yêu thích |

**Non-game inspirations**: Tiểu thuyết tu tiên/huyền huyễn — nguồn gốc của các
thuật ngữ và trope: cảnh giới, tâm pháp, bế quan, song tu, áp chế cảnh giới.

---

## Target Player Profile

| Attribute | Detail |
| ---- | ---- |
| **Age range** | Không áp dụng — dự án cá nhân, người chơi duy nhất là nhà phát triển |
| **Gaming experience** | Mid-core (quen thuộc RPG chỉ số + tiểu thuyết tương tác) |
| **Time availability** | Linh hoạt, phiên chơi 30–120 phút |
| **Platform preference** | Trình duyệt web trên PC và điện thoại |
| **Current games they play** | `reference.md` (bản gốc), AI Dungeon, tiểu thuyết tu tiên tương tác dạng văn bản |
| **What they're looking for** | Một thế giới tu tiên phản hồi khách quan, không nịnh bợ, có chiều sâu cơ chế thật |
| **What would turn them away** | Thế giới thiên vị nhân vật chính phi logic, chiến đấu không có rủi ro thật, giao diện phức tạp không cần thiết trên di động |

---

## Technical Considerations

| Consideration | Assessment |
| ---- | ---- |
| **Recommended Engine** | Godot 4.6, GDScript — đã chốt qua `/setup-engine`, phù hợp export Web/Mobile Web miễn phí |
| **Key Technical Challenges** | Tích hợp backend AI/LLM cho tường thuật + tạo tình huống (cần dịch vụ hỗ trợ nội dung người lớn); cân bằng công thức Lực chiến/EXP/Hảo cảm; giữ AI tuân thủ Khế Ước Cơ Học/Tường Thuật qua kiến trúc một chiều (state → khóa kết quả → AI chỉ tường thuật), không chỉ dựa vào prompt engineering; UI responsive PC + mobile |
| **Art Style** | Tối giản, tập trung văn bản/UI — chưa định hình (sẽ chốt ở `/art-bible`) |
| **Art Pipeline Complexity** | Thấp — chủ yếu UI, không cần asset 3D/hoạt ảnh phức tạp |
| **Audio Needs** | Tối thiểu — có thể bổ sung nhạc nền/SFX nhẹ sau |
| **Networking** | Không multiplayer — nhưng cần gọi API dịch vụ AI/LLM qua internet cho tường thuật |
| **Content Volume** | MVP: 1 vùng bối cảnh (~5–8 địa điểm — khớp `situation-encounter-generation.md`), 3 NPC, 2–3 sự kiện canon (khớp `setting-canon-integration.md` Rule #1; bổ sung 2026-08-11 — 2 hạng mục content này là điều kiện tối thiểu theo các GDD Approved, concept trước đây chưa liệt kê). Full vision: mở rộng liên tục, không giới hạn |
| **Procedural Systems** | Có — nội dung tường thuật/tình huống do AI/LLM tạo động, không phải procedural generation truyền thống |

---

## Risks and Open Questions

### Design Risks

- Công thức Lực chiến/EXP/Hảo cảm có nhiều tham số chồng lên nhau (áp chế cảnh giới, phạt vượt bậc, hệ số Tâm pháp...) — dễ mất cân bằng nếu không kiểm thử kỹ bằng ví dụ cụ thể.
- Giữ AI tường thuật nhất quán với pillar *Thế Giới Khách Quan* (không tâng bốc) qua thời gian chơi dài là thách thức thiết kế lớn nhất của dự án.

### Technical Risks

- Chưa chốt dịch vụ AI/LLM backend hỗ trợ nội dung người lớn — quyết định kiến trúc quan trọng, cần một ADR riêng ở `/create-architecture`.
- Godot 4.6 vượt quá thời điểm huấn luyện của model — cần tra cứu `docs/engine-reference/godot/` liên tục thay vì đoán API.
- Persistence HTML5 (Emscripten IDBFS cần sync JS tường minh; Safari ITP xóa dữ liệu sau ~7 ngày không tương tác; private mode không lưu; quota mobile thấp hơn desktop; nhật ký thế giới tăng vô hạn theo thiết kế chưa có chiến lược nén/rotate; **bổ sung 2026-08-06, `/design-review persistence-save-system.md` — `godot-specialist`**: toàn bộ chiến lược JS-glue [`JavaScriptBridge.eval()`, cần cho Web Locks API/`StorageManager.estimate()`/IndexedDB transaction thật] phụ thuộc header CSP `unsafe-eval` của host — chưa xác minh; nếu export Web bật Threaded/SharedArrayBuffer [cần header COOP/COEP], bước đồng bộ bền vững có thể THỰC SỰ CHẶN main thread thay vì non-blocking như giả định) cần một ADR riêng ở `/create-architecture`.
- API key AI/LLM sẽ lộ ở client-side do không có backend server — chấp nhận có chủ đích cho dự án cá nhân phi thương mại, cần ghi nhận tường minh trong ADR đó.

### Market Risks

- Không áp dụng — dự án cá nhân, phi thương mại.

### Scope Risks

- Hệ thống Hảo cảm/lan truyền xã hội + trí nhớ thế giới toàn cục có thể phình to nhanh nếu không giới hạn số NPC/vùng bối cảnh chặt chẽ ở MVP.
- Pillar "NPC là nhân vật chính của chính họ" hiện chưa có cơ chế/data structure đứng sau — cần trở thành 1 system riêng khi chạy `/map-systems`.

### Open Questions

*(Cập nhật 2026-08-11, re-review xác nhận: các mục đánh dấu ✅ ĐÃ ĐÓNG
bởi GDD Approved sở hữu câu trả lời — giữ nguyên văn làm vết lịch sử,
con trỏ trỏ tới nơi chốt. Các mục không đánh dấu vẫn mở.)*

- Dịch vụ AI/LLM nào sẽ dùng làm backend tường thuật? (quyết định ở `/create-architecture` qua ADR). Tiền lệ tham khảo: `reference.md` dùng Google Gemini API (key người dùng tự nhập hoặc key mặc định) và đã sinh được nội dung nhạy cảm thành công — điểm khởi đầu hợp lý để đánh giá cho ADR, cần xác minh lại điều khoản sử dụng (ToS) hiện hành trước khi chốt.
- Công thức chính xác khi nhiều nguồn EXP trùng nhau trong cùng 1 lượt (ví dụ vừa chiến đấu vừa vượt cấp thắng) cần đặc tả đầy đủ ở `/design-system` cho hệ thống Tu luyện/Chiến đấu.
- ✅ **ĐÃ ĐÓNG** — Bộ test case biên bắt buộc cho `/design-system` Chiến đấu: Lực chiến ở 0/0, floor khi chồng phạt vượt bậc + áp chế cảnh giới, cap khi EXP multi-source cùng lượt, tính bao gồm/loại trừ của ngưỡng 20 cấp và ngưỡng Song Tu, tính bao gồm/loại trừ của ngưỡng Hảo cảm -80 (thù địch sâu sắc), clamp Hảo cảm qua chuỗi lan truyền nhiều NPC. *(Chốt tại các GDD Approved: 20 cấp dùng `≤` — situation-gen D.2; -80 BAO GỒM biên — npc-affinity Rule 5 + death-and-consequence 3c; Song Tu =60 — npc-affinity; các test biên là AC chính thức của từng hệ.)*
- ✅ **ĐÃ ĐÓNG** — Hình dạng đường cong EXP (linear/exponential/stepped) và tốc độ tăng/giảm/suy giảm Hảo cảm theo thời gian cần được xác định ở `/design-system`. *(Chốt: đường cong EXP — exp-realm-progression Formulas [Approved]; Hảo cảm KHÔNG suy giảm theo thời gian — npc-affinity Core Rule #3 "không decay", chính sách khóa.)*
- ✅ **ĐÃ ĐÓNG** — Cân nhắc đổi 4% EXP-khi-thua thành phần thưởng thông tin (lộ điểm yếu/kỹ năng đối thủ) thay vì EXP vô điều kiện — quyết định cuối để `/design-system`. *(Chốt: GIỮ 4% — exp-realm-progression D.3 `LOSS_EXP_RATE=0.04` [Approved], formalize kèm invariant.)*
- Điều kiện/tỷ lệ khôi phục đan điền/võ công sau khi bị phế (qua đại cơ duyên, tiên thảo dị bảo...) cần được đặc tả ở `/design-system` hệ thống Chiến đấu/Tu luyện.
- Cần đặc tả rõ ở `/design-system`: giao diện/tường thuật thể hiện dấu hiệu "NPC đang che giấu/dịch dung" như thế nào, và cơ chế "tìm hiểu" để lộ dữ liệu thật (hành động điều tra, độ khó, rủi ro nếu bị phát hiện đang điều tra) hoạt động ra sao.
- ✅ **ĐÃ ĐÓNG** — Danh sách chỉ số chiến đấu đầy đủ (ACC, Lifesteal, HP Regen, Crit Rate/Damage, Khuếch đại sát thương, Chống chịu, Né tránh) chi tiết hơn nhiều so với "Điểm Chỉ số" tóm gọn trong công thức Lực chiến ở Core Mechanics #2 — cần đối chiếu/thống nhất ở `/design-system` hệ thống Chiến đấu. *(Chốt: 12 chỉ số thống nhất toàn dự án — combat-system Formulas + character-card-identity D.5 `base_stat_completeness` 12/12 [cả 2 đã qua review].)*

---

## MVP Definition

**Core hypothesis**: Qua ít nhất 3 phiên chơi (cách nhau ≥ 1 ngày, mỗi phiên
≥ 30 lượt), AI giữ đúng Khế Ước Cơ Học/Tường Thuật — không có lần nào AI tự ý
thay đổi kết quả cơ học, không có ngoại lệ — và mọi kết quả chiến đấu khớp
100% với Lực chiến đã tính.

Phạm vi kiểm chứng MVP tách làm 3 tầng AC riêng biệt (mục thứ 3 thêm
2026-08-08, `/design-review` vòng 2 của `exp-realm-progression.md`, cụm
A2-3/A2-6): (a) Khế Ước Cơ Học/Tường Thuật — kiểm chứng bằng hypothesis
trên, dùng được ngay ở MVP; (b) tốc độ/cảm giác tăng trưởng Hảo cảm tự
nhiên (từ 0 đến ngưỡng Song Tu) — KHÔNG được validate ở MVP vì NPC hảo cảm
khởi đầu đã preset sẵn (xem mục Required for MVP #3); hoãn sang Vertical
Slice với ít nhất 1 NPC bắt đầu từ Hảo cảm = 0; (c) tốc độ/cảm giác đột
phá cảnh giới thật (từ level 1 tăng dần) — KHÔNG được validate ở MVP vì
nhân vật chính khởi đầu đã dev-seed sẵn ở level 9 (xem mục Required for
MVP #1) — theo tính toán tại review đó, đường tới lần đột phá ĐẦU TIÊN từ
level 1 (900-3.000 lượt qua đường combat thuần, hoặc ~300 lượt qua đường
tu luyện thụ động tối ưu) đều vượt xa cửa sổ kiểm chứng MVP (≥90 lượt/3
phiên) dù chơi theo chiến lược nào; hoãn validate tốc độ đột phá THẬT
sang Vertical Slice với nhân vật bắt đầu từ level 1.

**Tiêu chí FAIL**: Hypothesis thất bại nếu (1) **[BLOCKING — kiểm chứng bằng
log trạng thái cơ học, xem mục Required for MVP #6]** phát hiện ≥ 1 lần AI
tự ý đổi kết quả cơ học, hoặc (2) **[ADVISORY — tín hiệu chủ quan nhưng vẫn
là tiêu chí thật cho dự án một người chơi]** sau 3 phiên, không còn muốn
chơi tiếp phiên thứ 4. Dùng `src/reference.md` (bản gốc đã quen) làm mốc so
sánh chủ quan: bản mới có ít lần "cảm thấy được ưu ái phi lý" hơn bản gốc
không?

**Required for MVP**:
1. 1 nhân vật chính đầy đủ chỉ số/kỹ năng/trang bị. **Sửa 2026-08-08**
   (`/design-review` vòng 2 của `exp-realm-progression.md`, cụm A2-3 —
   cùng dạng dev-seed đã áp cho Hảo cảm ở mục #3 và Tâm Pháp ở mục #4):
   nhân vật chính khởi đầu ở **level 9** (dev-seed), KHÔNG phải level 1 —
   đây là dev-seed để đảm bảo người chơi chạm được mốc Chờ Đột Phá VÀ ít
   nhất 1 lần đột phá thật trong phạm vi cửa sổ kiểm chứng MVP (≥90
   lượt/3 phiên, xem MVP Definition), KHÔNG dùng để validate tốc độ/cảm
   giác đột phá tự nhiên từ level 1 (việc đó hoãn sang Vertical Slice,
   cần nhân vật bắt đầu từ level 1 — xem MVP Definition, tầng kiểm chứng
   (c)).
2. 1 vùng bối cảnh nhỏ trong 1 danh tác cụ thể (ví dụ: Đấu La Đại Lục) với AI tạo tình huống động, nhân vật chính là người hoàn toàn mới. Vùng MVP gồm **~5–8 địa điểm** (đồ thị location — `situation-encounter-generation.md`) và setting pack tối thiểu có **2–3 sự kiện canon** (`setting-canon-integration.md` Rule #1) — bổ sung 2026-08-11 cho khớp điều kiện tối thiểu của 2 GDD Approved.
3. 3 NPC (1 thù địch, 1 hảo cảm, 1 trung lập) với hệ thống Hảo cảm hoạt động đầy đủ. NPC hảo cảm khởi đầu đã đạt ngưỡng Hảo cảm đủ điều kiện Song Tu — đây là dev seed để kiểm thử code path Song Tu trong phạm vi phiên chơi ngắn, KHÔNG dùng để validate tốc độ/cảm giác tăng trưởng Hảo cảm tự nhiên (việc đó hoãn sang Vertical Slice, cần NPC bắt đầu từ Hảo cảm = 0).
4. Hệ thống Chiến đấu (Lực chiến, áp chế cảnh giới) + EXP + Song Tu hoạt động đầy đủ. Cơ chế Cái Chết (ngưỡng thù địch sâu sắc) hoạt động đầy đủ — trong 3 lối tiếp tục (Quỷ tu/Chuyển sinh/Chơi lại), CHỈ Chơi lại cần hoạt động đầy đủ ở MVP (Quỷ tu/Chuyển sinh hoãn sang Vertical Slice — quyết định `/gate-check` 2026-08-01, sửa 2026-08-05 khớp `systems-index.md` Priority Tiers). **Sửa 2026-08-08** (`/design-review` vòng 1 của `exp-realm-progression.md`, cụm A6 — đóng mâu thuẫn với Scope Tiers bên dưới): "Song Tu hoạt động đầy đủ" ở MVP BAO GỒM 1 Tâm Pháp dev-seed tối giản (`type=song-tu`, `exp_multiplier=1.0`, mirror tiền lệ dev-seed Hảo cảm ở mục #3) gán sẵn cho nhân vật chính — nếu không, nguồn EXP Song Tu (`exp-realm-progression.md` D.4) là dead code ở MVP thật vì cần Tâm Pháp `type=song-tu` mà "Tâm pháp cơ bản" (đa dạng/lựa chọn) chỉ xuất hiện ở Vertical Slice (xem Scope Tiers). Dev-seed này CHỈ để exercise code path D.4 trong phạm vi phiên chơi ngắn, KHÔNG dùng để validate cảm giác "chọn Tâm Pháp" thật (việc đó hoãn sang Vertical Slice cùng hệ Tâm Pháp đầy đủ).
5. Trạng thái thế giới (Hảo cảm, EXP, lịch sử) được lưu (persist) qua việc đóng/mở lại trình duyệt — điều kiện tiên quyết để kiểm chứng "chơi được nhiều phiên liên tục".
6. Log trạng thái cơ học trước/sau mỗi lượt (HP, EXP, Lực chiến, Hảo cảm) — cần để kiểm chứng khách quan Core hypothesis (zero instances AI tự sửa kết quả cơ học) qua ≥90 lượt/3 phiên; không thể dò bằng mắt đáng tin cậy ở quy mô này. Tận dụng cùng cơ chế snapshot mà yêu cầu persist trạng thái (mục 5) đã cần có.

**Explicitly NOT in MVP** (defer to later):
- Nhiều vùng bối cảnh/phe phái.
- Đa dạng Tâm pháp/kỹ năng/trang bị mở rộng.
- Lịch sử thế giới toàn cục sâu (chỉ cần đủ cho 1 vùng bối cảnh MVP).

### Scope Tiers (if budget/time shrinks)

| Tier | Content | Features | Timeline |
| ---- | ---- | ---- | ---- |
| **MVP** | 1 bối cảnh danh tác (VD: Đấu La Đại Lục), 3 NPC | Chiến đấu + EXP + Hảo cảm + Song Tu đầy đủ (1 Tâm Pháp dev-seed tối giản, KHÔNG phải hệ thống Tâm Pháp đầy đủ — sửa 2026-08-08, xem Required for MVP #4) | Vài ngày – vài tuần |
| **Vertical Slice** | MVP hoàn thiện hơn | + Tâm pháp cơ bản (hệ thống ĐẦY ĐỦ — nhiều Tâm Pháp, lựa chọn thật, không chỉ 1 dev-seed) | Vài tuần |
| **Alpha** | Vài bối cảnh danh tác, nhiều NPC hơn | Tất cả hệ thống, còn thô | 1–2 tháng |
| **Full Vision** | Nhiều bối cảnh danh tác để chọn, mở rộng liên tục | Tất cả hệ thống hoàn thiện | Không giới hạn — cập nhật khi cần (dự án cá nhân) |

---

## Next Steps

- [x] Cấu hình engine (`/setup-engine`) — Godot 4.6, GDScript
- [ ] Tạo Art Bible xác định bản sắc thị giác (`/art-bible`) — trước khi viết GDD chi tiết
- [x] Validate concept với `/design-review design/gdd/game-concept.md` — chạy 2026-08-01 (NEEDS REVISION nhẹ, sửa cùng phiên) + re-review xác nhận 2026-08-11 → Approved
- [x] Prototype cơ chế cốt lõi trước khi viết GDD đầy đủ (`/prototype`) — `prototypes/khe-uoc-ai-concept/` (REPORT.md được `mechanic-narration-contract-enforcement.md` trích dẫn làm bằng chứng)
- [x] Nếu prototype PROCEED: phân rã concept thành các hệ thống (`/map-systems`) — `systems-index.md`, 16 hệ
- [x] Viết GDD từng hệ thống (`/design-system [system-name]`) — 16 GDD đã viết, 13 Approved tính đến 2026-08-11 (Combat/Persistence/AI-LLM chờ cổng implementation/prototype)
- [ ] Xây vertical slice trước khi cam kết Production (`/vertical-slice`)
- [ ] Kiểm chứng core loop bằng playtest cá nhân (`/playtest-report`)
- [ ] Lên kế hoạch milestone đầu tiên (`/sprint-plan new`)
