# Mechanic/Narration Contract Enforcement

> **Status**: **Approved** (`/design-review` 2026-08-02 — 1 blocking + 2 recommended sửa cùng phiên, không cần re-review; xem `reviews/mechanic-narration-contract-enforcement-review-log.md`). Header trước đó ghi nhầm "In Design" dù review đã đóng từ 2026-08-02 — sửa lại cho khớp review-log, 2026-08-10.
> **Author**: user + agents
> **Last Updated**: 2026-08-02
> **Implements Pillar**: Pillar 3 (Sức Mạnh Có Logic), Pillar 4 (Tường Thuật Sống Động), Pillar 1 (Thế Giới Khách Quan)

## Overview

Mechanic/Narration Contract Enforcement là nguyên tắc kiến trúc bắt buộc
kiểm soát MỌI ranh giới nơi một hệ thống cơ học (Combat, EXP, Hảo cảm,
Death & Consequence...) giao tiếp với AI: kết quả cơ học phải được hệ
thống sở hữu tính toán và khóa TRƯỚC, AI chỉ nhận kết quả đã khóa đó như
một dữ kiện bất khả kháng để viết thành văn xuôi — không bao giờ được
tính toán thay, đoán thay, hay "cứu" nhân vật chính bằng cách tường thuật
khác đi. Ngược chiều còn nghiêm ngặt hơn: đầu ra của AI (văn bản tường
thuật) không bao giờ được parse ngược lại thành trạng thái thế giới, dưới
bất kỳ tính năng nào, ở bất kỳ thời điểm nào trong tương lai.

Khác với Turn Manager (sở hữu một state machine cụ thể, single-instance),
hệ thống này không phải một state machine riêng — nó là một RÀNG BUỘC
cross-cutting áp dụng tại mọi điểm gọi AI trong toàn bộ game: sinh gợi ý
hành động, tường thuật kết quả, mô tả tình huống, hay bất kỳ tính năng
tương lai nào có AI tham gia. Turn Manager đã cài sẵn khung cho nguyên tắc
này (Core Rule #4, #8) — hệ thống này định nghĩa đầy đủ CÁCH thực thi ràng
buộc đó: kiểm tra ở đâu, chặn thế nào khi AI cố "nói dối", và ai chịu
trách nhiệm validate.

Với người chơi, đây là nền tảng vô hình cho niềm tin: họ không bao giờ cần
lo AI "thiên vị" nhân vật chính khi kể chuyện hấp dẫn, hay bí mật giảm nhẹ
hậu quả để câu chuyện "đẹp" hơn — vì AI về mặt kỹ thuật không có khả năng
làm vậy. Đây chính là cơ chế biến Pillar 1 (Thế Giới Khách Quan) và Pillar
3 (Sức Mạnh Có Logic) từ lời hứa thiết kế thành một đảm bảo kỹ thuật thật
sự.

*(Lưu ý phạm vi: các công cụ giám sát tự động trong GDD này (xem Formulas)
chỉ bắt được MỘT lớp vi phạm — số liệu thô bị lộ nguyên văn trong văn tường
thuật. Vi phạm ngữ nghĩa tinh vi hơn — AI kể một kết cục khác locked_result
mà không hề nhắc số — nằm ngoài khả năng phát hiện tự động ở tầng kiến
trúc này; xem Edge Cases để biết cơ chế bù đắp bằng QA thủ công.)*

## Player Fantasy

Người chơi không tương tác trực tiếp với nguyên tắc này — không có nút
bấm, không có màn hình riêng cho nó. Cảm giác nó tạo ra là GIÁN TIẾP nhưng
liên tục: mỗi khi một trận đấu kết thúc, một mối quan hệ NPC thay đổi, hay
một cái chết xảy ra, người chơi ngầm tin rằng con số đã "chốt" trước khi
AI viết ra — không phải AI đang tự do sáng tác một kết cục kịch tính. Đây
là loại tin tưởng chỉ lộ ra khi bị VI PHẠM: nếu người chơi từng bắt gặp
một lần tường thuật mâu thuẫn với chỉ số thật (VD: thua trận nhưng AI kể
thắng), toàn bộ niềm tin vào "hệ quả thực sự" (Pillar 2) sụp đổ ngay lập
tức, bất kể mọi cơ chế khác có đúng đến đâu. Vì vậy player fantasy của hệ
này không phải một cảm giác chủ động, mà là sự VẮNG MẶT của nghi ngờ —
game càng "vô hình" ở khoản này càng đúng chức năng.

## Detailed Rules

### Core Rules

1. **Chiều bắt buộc — Khóa trước, kể sau**: Bất kỳ hệ thống nào tạo ra một
   kết quả cơ học (Combat, EXP, Hảo cảm, Death & Consequence, hoặc bất kỳ
   hệ Feature tương lai nào) PHẢI tính toán và khóa kết quả đó TRƯỚC khi
   gọi AI để tường thuật nó. Không có ngoại lệ — không hệ thống nào được
   gọi AI trước rồi dùng phản hồi của AI để quyết định kết quả.
2. **AI chỉ có quyền viết văn, không có quyền quyết định số**: Prompt gửi
   cho AI luôn chứa kết quả đã khóa như một dữ kiện bất khả kháng. AI được
   toàn quyền chọn cách kể (giọng văn, nhịp điệu, chi tiết kịch tính, góc
   nhìn) nhưng không được thay đổi kết quả, con số, hay outcome đã khóa
   dưới bất kỳ hình thức nào — kể cả khi AI "nghĩ" một kết cục khác hay
   hơn.
3. **Cấm tuyệt đối việc parse ngược**: Văn bản do AI trả về KHÔNG BAO GIỜ
   được đọc/parse ngược lại thành trạng thái thế giới (không extract số,
   không suy luận outcome từ câu chữ, không dùng AI response để set
   flag/biến cờ nào). Luật vĩnh viễn, áp dụng cho MỌI tính năng hiện tại
   và tương lai.
4. **Không lộ số liệu trần trụi trong văn tường thuật**: Theo kinh nghiệm
   đã kiểm chứng ở prototype (`prototypes/khe-uoc-ai-concept/REPORT.md`),
   prompt tường thuật phải cấm rõ AI nêu số liệu thô (HP, sát thương,
   EXP...) trong văn xuôi — số liệu chỉ hiển thị qua UI riêng (Character
   Card, theo Visual Identity Anchor của `game-concept.md`). Loại bỏ khả
   năng AI vô tình "nói khác" con số thật, vì con số thật không bao giờ
   xuất hiện trong câu chữ để mâu thuẫn. *(Ghi nhận nghĩa vụ ủy quyền,
   thêm 2026-08-11 — cascade đóng Open Question #12 của
   `character-card-identity.md`: với NPC đang che giấu thực lực
   [`concealment.active=true`], wrapper của AI/LLM Integration Layer
   PHẢI chèn `npc_tag.concealment_narrative_hint` + chỉ thị "không mô tả
   thực lực thật qua văn xuôi" vào `narration_call` — xem Core Rule #2
   bên đó. Giới hạn tự khai: hậu kiểm leak của hệ NÀY thuần số học
   [`extract_numerals`] nên KHÔNG bắt được leak dạng văn xuôi mô tả thực
   lực — enforcement cho lớp leak này nằm ở chỉ thị prompt do wrapper
   chèn, cùng lớp với ủy quyền "cấm viết số bằng chữ" đã có.)*
5. **Enforcement qua kiến trúc, không qua prompt engineering đơn thuần**:
   Nguyên tắc này không được coi là "đã đủ" chỉ vì đã viết rõ trong system
   prompt — prompt là gợi ý, AI vẫn có thể lệch. Enforcement thật sự nằm ở
   tầng code: MỌI lời gọi AI cho mục đích tường thuật/sinh gợi ý PHẢI đi
   qua một điểm gọi chung (wrapper/interface) do AI/LLM Integration Layer
   cung cấp — không hệ Feature nào được gọi API AI trực tiếp, bỏ qua
   wrapper này.
6. **Wrapper chịu trách nhiệm gắn kết quả khóa vào prompt, không phải
   caller**: Hệ Feature (Combat, EXP...) chỉ truyền `locked_result` cho
   wrapper; wrapper (thuộc AI/LLM Integration Layer, tuân theo hợp đồng
   của hệ thống này) chịu trách nhiệm dựng prompt đúng chuẩn — tránh mỗi
   Feature system tự viết prompt theo cách riêng, dễ quên rule.
7. **Không có "chế độ thử nghiệm" ngoại lệ**: Không tồn tại flag/config
   nào cho phép tạm thời tắt enforcement, kể cả trong prototype/dev build.
   Cần test nhanh thì dùng mock kết quả khóa sẵn, không bỏ qua bước khóa.
8. **Khoanh vùng tường thuật theo đúng phạm vi người chơi tự mô tả — cấm tự ý
   phát triển thêm tình tiết** (bổ sung 2026-09-01, theo quyết định chủ dự án):
   Khi lượt chơi là một hành động TỰ DO do người chơi tự viết ra (tường thuật
   và/hoặc lời thoại do chính người chơi soạn — kể cả lời thoại người chơi tự
   đặt vào miệng một NPC cụ thể, qua bộ soạn thảo phân đoạn nơi mỗi đoạn được
   gắn nhãn rõ là tường thuật, lời Nhân vật chính, hay lời của một NPC cụ thể),
   AI khi thực hiện `narration_call` cho lượt đó CHỈ được LÀM GIÀU văn
   phong/hình ảnh/cảm giác cho ĐÚNG tập hợp các đoạn người chơi đã cung cấp —
   giữ nguyên chủ thể, thứ tự và ranh giới của từng đoạn. Cụ thể, AI KHÔNG
   được:
   - Viết tiếp bất kỳ diễn biến, tình tiết, hay hành động nào SAU điểm nội
     dung người chơi mô tả kết thúc.
   - Tự thêm phản ứng, lời thoại, hay cử động mới của bất kỳ NPC nào mà người
     chơi KHÔNG hề đưa vào danh sách đoạn của lượt đó — kể cả một NPC đang có
     mặt ngay trong cảnh.
   - Tự thêm một đoạn tường thuật "chốt lượt" mang tính tổng kết hoặc dẫn dắt
     sang tình huống mới, nếu người chơi không hề viết đoạn đó.

   **Ngoại lệ duy nhất — đoạn thoại NPC không kèm mô tả**: nếu một đoạn người
   chơi cung cấp chỉ là nguyên văn câu thoại của một NPC (không mô tả gì
   thêm), AI ĐƯỢC PHÉP thêm tối thiểu một khung cử chỉ/giọng điệu/nét mặt
   TRỰC TIẾP đi kèm ĐÚNG lúc câu đó được nói ra (VD: giọng run rẩy, cúi đầu,
   siết chặt tay) — đây là phần "trình bày" (delivery framing) tất yếu khi
   văn xuôi hoá một câu thoại, không phải một tình tiết mới. AI KHÔNG được
   thêm bất kỳ hành động/phản ứng nào XẢY RA SAU câu thoại đó (VD: NPC quay
   đi, rơi nước mắt, bước ra khỏi phòng) nếu người chơi không viết tiếp đoạn
   nào khác.

   Rule này CHỈ áp dụng cho phần văn xuôi tường thuật của `narration_call`;
   KHÔNG áp dụng cho `suggestion_call` (không đổi — xem Edge Case "Phạm vi áp
   dụng"), và KHÔNG cấm việc phát các thẻ lệnh hệ thống bắt buộc đi kèm
   `locked_result` (VD `[WORLD_ITEM]`, `[TIME_PASSED]`) — đó là lớp
   bookkeeping cơ học, không phải "tình tiết truyện" theo nghĩa của rule này.

   * VÍ DỤ SAI: Người chơi chỉ viết 1 đoạn tường thuật "Ta bước tới, đặt tay
   lên vai nàng." AI viết: "Ngươi bước tới, đặt tay lên vai nàng. Nàng giật
   mình quay lại, đôi mắt đỏ hoe: <dialogue speaker="NPC">Sao ngươi lại...?
   </dialogue> Ngươi khẽ mỉm cười, kéo nàng vào lòng." — hai câu sau là phản
   ứng/tình tiết hoàn toàn do AI tự bịa, người chơi không hề viết.
   * VÍ DỤ ĐÚNG: AI chỉ được viết: "Ngươi bước tới, những bước chân khẽ khàng
   như sợ làm vỡ khoảnh khắc tĩnh lặng, rồi đặt tay lên bờ vai gầy guộc của
   nàng." — làm giàu hình ảnh/cảm giác cho ĐÚNG 1 hành động đó, dừng lại
   đúng ở đó.

   **Phối hợp với Core Rule #1/#2 (không đổi)**: nếu lượt tự do này ĐỒNG THỜI
   kích hoạt một hệ Feature cơ học (VD Combat resolve ngay trong lượt đó) và
   do đó có `locked_result`, việc AI phải phản ánh trung thực `locked_result`
   (Core Rule #1/#2) KHÔNG bị Rule #8 hạn chế — đó không phải "AI tự bịa
   thêm", mà là nghĩa vụ đã có sẵn từ trước. Nói cách khác, phạm vi hợp lệ
   của `narration_text` cho một lượt tự do = (các đoạn người chơi mô tả, đã
   làm giàu văn phong) HỢP VỚI (`locked_result` bắt buộc phải phản ánh, nếu
   có) — AI không được viết bất kỳ nội dung nào NGOÀI hợp của hai tập này.
   Core Rule #4 (cấm lộ số liệu thô) áp dụng không đổi cho toàn bộ
   `narration_text`, bất kể câu chữ đó bắt nguồn từ đoạn của người chơi hay
   từ việc phản ánh `locked_result`.

### States and Transitions

Hệ thống này KHÔNG sở hữu một state machine riêng (khác Turn Manager).
Thay vào đó, nó định nghĩa một pipeline kiểm tra bắt buộc tại MỌI điểm gọi
AI cho mục đích tường thuật/sinh gợi ý — nhưng KHÔNG phải mọi checkpoint áp
dụng như nhau cho 2 loại lệnh gọi đó (xem cột "Áp dụng cho" bên dưới):

| Checkpoint | Áp dụng cho | Điều kiện | Nếu vi phạm |
|---|---|---|---|
| 1. Pre-call: Locked result tồn tại | CHỈ `narration_call` | `locked_result` đã được hệ Feature ghi vào bộ nhớ TRƯỚC khi wrapper được gọi | Từ chối gọi AI — lỗi kiến trúc (bug), không phải runtime error cho người chơi |
| 2. Prompt construction | Cả hai (nội dung prompt khác nhau: `narration_call` chèn `locked_result`; `suggestion_call` chèn tình huống mở, không có `locked_result`) | Prompt chỉ chứa: `locked_result` (dữ kiện, nếu là narration_call), ngữ cảnh World Memory liên quan, hướng dẫn phù hợp loại lệnh gọi (narration: "chỉ tường thuật, cấm nêu số liệu thô, cấm tự đổi outcome"; suggestion: "chỉ đề xuất hành động khả thi cho tình huống hiện tại") | Wrapper tự chèn hướng dẫn này — Feature system không tự viết đoạn tương đương |
| 3. AI call | Cả hai | Gọi AI/LLM Integration Layer qua interface chung | — |
| 4. Post-response | Cả hai | Nhận text từ AI, KHÔNG parse/extract bất kỳ giá trị nào từ nó | Nếu code nào cố parse → vi phạm Core Rule #3, phải sửa ở code review |
| 5. Return | Cả hai | Trả text nguyên văn cho Feature system để hiển thị | Feature system không sửa nội dung AI trả về (trừ lọc an toàn cơ bản nếu cần) |

`suggestion_call` vẫn BẮT BUỘC đi qua wrapper chung này (Core Rule #5-6 —
không hệ nào được gọi AI trực tiếp), nhưng không có `locked_result` nào để
gate ở Checkpoint 1 vì nó mô tả một tình huống MỞ, chưa có kết quả cơ học
nào cần khóa trước — khớp với Edge Case "Phạm vi áp dụng" bên dưới, vốn đã
loại `suggestion_call` khỏi Core Rules #1-4 và cả 3 Formula.

Pipeline này được kích hoạt lặp lại — theo `ai_call_budget_per_turn` của
Turn Manager (2 lần/lượt bình thường, tối đa 3 nếu có retry gợi ý).

### Interactions with Other Systems

- **Turn Manager**: Core Rule #4/#8 của Turn Manager định nghĩa THỜI ĐIỂM
  khóa — hệ thống này định nghĩa CƠ CHẾ enforcement. Turn Manager gọi vào
  pipeline này ở mọi lời gọi AI của nó.
- **AI/LLM Integration Layer** (đã Designed): phải triển khai interface
  wrapper mà Core Rule #5-6 yêu cầu — ràng buộc BẮT BUỘC cho GDD đó, không
  phải gợi ý.
- **Combat, EXP & Realm Progression, NPC Affinity & Relationship, Death &
  Consequence, Situation/Encounter Generation** (Feature layer, đã
  Designed): mỗi hệ phải (a) tự tính và khóa kết quả trước, (b) gọi wrapper
  chung thay vì gọi AI trực tiếp, (c) không bao giờ đọc lại text AI trả về
  để suy ra trạng thái.
- **World Memory & Context Management**: cung cấp ngữ cảnh lịch sử cho
  prompt (Checkpoint 2) — chỉ lưu `locked_result` + `narration_text` như
  dữ liệu đã chốt, không lưu suy luận rút ra từ `narration_text`.

## Formulas

*(Đây không phải công thức cân bằng gameplay — là các hàm kiểm tra/giám
sát việc tuân thủ Contract, phục vụ QA và MVP hypothesis của
`game-concept.md`. Không formula nào tốn thêm lệnh gọi AI — tất cả tính
toán post-hoc trên `locked_result` và `narration_text` đã có sẵn, giữ
đúng invariant `calls_per_turn ≤ 3` của Turn Manager.)*

**1. Numeric Leak Detection** (phát hiện số liệu thô rò rỉ vào văn tường
thuật)

`leak_matches(turn) = { f ∈ fields(locked_result) : is_numeric(f.value) AND f.value ≠ 0 AND digits(f.value) ∈ extract_numerals(narration_text) }`
`leak_count = |leak_matches(turn)|`, `leak_flag = 1 nếu leak_count > 0, ngược lại 0`

| Variable | Type | Range | Description |
|---|---|---|---|
| locked_result | dict | n field | kết quả cơ học đã khóa trước khi tường thuật |
| fields(locked_result) | set | 0–n | các field mang giá trị số (damage, hp_delta, exp_gain, affinity_delta...) |
| narration_text | string | độ dài bất kỳ | văn bản AI trả về cho lượt đó |
| extract_numerals(text) | set\<string\> | 0–∞ | các chuỗi số trích từ text bằng regex `\d+(\.\d+)?` (chỉ bắt số viết bằng chữ số, KHÔNG bắt số viết bằng chữ — nằm ngoài phạm vi) |
| digits(f.value) | string | — | chuỗi số của **giá trị tuyệt đối** `f.value` (VD: `digits(-15) = "15"`) — dấu âm/dương không tính vào so khớp, vì narration không bao giờ viết dấu trừ kèm số liệu (số liệu bị cấm nêu hoàn toàn theo Core Rule #4) |
| leak_count | int | 0–n | số field bị lộ đúng giá trị (byte-for-byte) trong narration |
| leak_flag | bool | {0,1} | 1 nếu có ít nhất 1 field bị lộ |

**Output Range**: `leak_count ∈ [0, n]`, không thể vượt quá số field số
của `locked_result` đó.
**Example**: `locked_result = {damage: 47, target_hp_after: 12}`,
narration = "Kiếm khí xé toạc lớp phòng ngự, để lại vết thương 47 điểm." →
`extract_numerals = {"47"}` → `leak_matches = {damage}` →
`leak_count=1, leak_flag=1` (vi phạm Core Rule #4).
**Edge case đã kiểm biên**: `locked_result` không có field số nào (VD:
lượt hội thoại thuần/`rp_only`) → `leak_matches` (Formula 1 gốc) luôn
rỗng bất kể narration nói gì → phải LOG kèm `n=0` để QA không nhầm "0
leak" ở đây với "0 leak vì hệ thống hoạt động đúng". Field có giá trị 0
(VD: `damage=0` khi trượt đòn) bị loại trừ khỏi kiểm tra có chủ đích —
tránh false-positive vì chữ số "0" trùng với các token không phải số
trong văn Việt.

**Backstop generic cho trường hợp `n=0`** (bổ sung 2026-08-05, đóng gap
`/design-review` gộp 11 GDD — Formula 1 gốc là no-op khi `n=0`, vi phạm
nguyên tắc "không dựa vào prompt engineering" cho loại lượt phổ biến
nhất `rp_only`): khi `fields(locked_result) = ∅`, chạy thêm
`generic_stat_leak(turn) = extract_numerals(narration_text) ≠ ∅ AND
matches_stat_pattern(narration_text)`, trong đó `matches_stat_pattern`
là regex TỐI THIỂU khớp các mẫu số-liền-đơn-vị-thống-kê phổ biến (VD
`\d+\s?(HP|EXP|điểm|%)`, `[+-]\d+`) — KHÔNG chính xác 100% (không thay
thế Formula 1 khi có `locked_result` thật, chỉ là lưới an toàn cho
`n=0`), nhưng là enforcement THẬT thay vì chỉ dựa prompt.
`generic_stat_leak=true` → cùng hành vi log/flag như `leak_flag=1`
(không tự động chặn hiển thị, chỉ log cho QA — giữ đúng tinh thần MVP
hypothesis, không auto-reject narration).

**2. Session Violation Count** (gate cho MVP hypothesis của
`game-concept.md`)

`V = Σ leak_flag(turn)` cho mọi turn trong phiên, `T = số lượt đã tường thuật trong phiên`
`violation_rate = V / T` (chỉ tính khi T ≥ 1)

| Variable | Type | Range | Description |
|---|---|---|---|
| V | int | 0–T | tổng số lượt có ít nhất 1 leak |
| T | int | ≥1 | số lượt đã tường thuật trong phiên |
| violation_rate | float | [0,1] hoặc N/A | tín hiệu QA bổ sung — KHÔNG phải điều kiện gate chính |

**Output/Gate condition**: khớp đúng MVP hypothesis — PASS khi và chỉ khi
`V = 0` qua `T ≥ 90` lượt trên ≥3 phiên (đếm tuyệt đối, không dung sai
theo tỷ lệ).
**Example**: T=90, V=0 → PASS. T=90, V=1 → FAIL, bất kể `violation_rate`
chỉ ~1.1% — vì hypothesis yêu cầu zero tolerance, không phải "hiếm khi
xảy ra".
**Edge case đã kiểm biên**: T=0 (chưa có lượt nào) → `violation_rate`
không xác định, báo "N/A", không chia cho 0. Phiên dài (T=500) →
`violation_rate` pha loãng nhưng `V` (gate thật) không đổi — tránh cảm
giác an toàn giả khi rate thấp nhưng V vẫn > 0.

**3. Per-Field Leak Attribution** (diagnostic — quy trách nhiệm theo hệ
Feature)

`leak_count_field(f) = Σ_turn 1[f ∈ leak_matches(turn)]` tính theo từng
tên field (damage, hp_delta, exp_gain, affinity_delta...) qua toàn phiên.

Mục đích: xác định hệ Feature nào (Combat, EXP, Hảo cảm...) đang rò rỉ
nhiều nhất — không tốn thêm chi phí gì, chỉ aggregate lại log của Formula
1.
**Output Range**: mỗi field một count riêng, 0 → T.
**Example**: Sau 90 lượt, `leak_count_field(damage)=3,
leak_count_field(affinity_delta)=0` → prompt của Combat System cần siết
lại hướng dẫn "cấm số liệu thô" hơn prompt của NPC Affinity.

## Edge Cases

- **Nếu AI trả về rỗng/từ chối tường thuật** (bị chặn bởi content filter,
  hoặc phản hồi không phải văn tường thuật): đây được coi là lỗi lệnh gọi
  AI (cùng loại với Edge Case "lệnh gọi AI thất bại" của Turn Manager) —
  KHÔNG phải một dạng "leak"/vi phạm Contract. Xử lý theo quy trình lỗi
  mạng/API đã định nghĩa ở `turn-manager.md`, không thuộc phạm vi formula
  ở đây.
- **Nếu AI mâu thuẫn NGỮ NGHĨA với locked_result mà không lộ số liệu thô**
  (VD: locked_result là "thua trận" nhưng văn tường thuật viết "và ta đã
  chiến thắng!"): Formula 1 (regex số liệu) KHÔNG bắt được loại vi phạm
  này — đây là giới hạn đã biết, không phải lỗ hổng thiết kế. Loại vi
  phạm này chỉ có thể phát hiện qua QA thủ công đối chiếu log trạng thái
  cơ học trước/sau mỗi lượt (yêu cầu MVP #6 của `game-concept.md`), không
  có cơ chế tự động ở tầng GDD này (mọi cách tự động hóa đều cần thêm 1
  lệnh gọi AI để "chấm điểm", vi phạm invariant `calls_per_turn ≤ 3`).
- **Nếu một con số "flavor" (không thuộc locked_result) trùng ngẫu nhiên
  với giá trị 1 field** (VD: văn tường thuật nhắc "chiêu thứ 3" trùng với
  `combo_count=3` trong locked_result mà không thật sự lộ giá trị đó):
  Formula 1 sẽ báo `leak_flag=1` (false positive). Không tự động
  chặn/block hiển thị — chỉ log để QA xem lại thủ công; false positive
  hiếm và chấp nhận được vì đây là công cụ giám sát, không phải gate chặn
  runtime.
- **Nếu nhiều hệ Feature cùng kích hoạt trong 1 lượt** (VD: Combat thắng →
  vừa có `damage`, vừa có `exp_gain`, vừa có `affinity_delta` cùng lúc):
  TẤT CẢ `locked_result` của lượt đó được gộp vào MỘT prompt duy nhất cho
  MỘT lệnh gọi narration_call — không được tách thành nhiều lệnh gọi AI
  riêng (sẽ vi phạm `calls_per_turn ≤ 3` của Turn Manager). Formula 1
  kiểm tra `leak_matches` trên toàn bộ tập field gộp đó.
- **Nếu lượt bị Undo sau khi đã tường thuật**: turn đó được loại khỏi `T`
  (tổng số lượt) ở Formula 2 — nhất quán với Turn Manager Core Rule #7
  ("lượt bị undo coi như chưa từng xảy ra"). Dữ liệu `leak_flag` đã log
  của lượt đó vẫn giữ lại cho mục đích debug kỹ thuật, nhưng không tính
  vào gate MVP hypothesis.
- **Phạm vi áp dụng — chỉ narration, không áp dụng cho sinh gợi ý**: Core
  Rules #1-4 và cả 3 formula ở trên chỉ áp dụng cho `narration_call`
  (tường thuật kết quả ĐÃ khóa). Lệnh gọi sinh 4 gợi ý hành động
  (`suggestion_call`) không tường thuật một kết quả đã khóa nào — nó mô
  tả tình huống MỞ, chưa có kết quả — nên không thuộc phạm vi kiểm tra
  leak-detection này.
- **Hành động rất ngắn của người chơi** (VD: "Ta gật đầu"): AI vẫn phải văn
  xuôi hoá đủ đoạn đó, nhưng KHÔNG được lấy lý do "ngắn quá" để bổ sung thêm
  một sự kiện/nhân vật mới cho "đủ dài". Được phép thêm tính từ, nhịp điệu,
  cảm giác cho đúng 1 hành động đã cho (enrich hình ảnh) — không được thêm
  SỰ KIỆN mới. Một narration_text dài hơn nhiều so với input người chơi vẫn
  HỢP LỆ, miễn là không có sự kiện hay nhân vật nào mới xuất hiện trong đó.
- **Nhiều đoạn xen kẽ (tường thuật + lời thoại nhiều NPC trong cùng 1
  lượt)**: AI PHẢI tường thuật hoá ĐỦ tất cả các đoạn người chơi cung cấp,
  đúng thứ tự, không được bỏ sót hay gộp tắt bất kỳ đoạn nào — kể cả đoạn
  ngắn hoặc có vẻ ít quan trọng. Bỏ sót một đoạn bị coi là vi phạm Rule #8 ở
  mức tương đương với việc thêm một đoạn thừa, vì cả hai đều làm sai lệch
  ĐÚNG NHỮNG GÌ người chơi đã chủ động viết ra cho lượt đó.
- **Vi phạm Rule #8 mà không lộ số liệu thô** (AI thêm tình tiết/phản ứng
  NPC mới nhưng không hề nêu con số nào): Formula 1 (regex số liệu) KHÔNG
  bắt được loại vi phạm này — cùng lớp giới hạn đã ghi nhận ở Edge Case "Nếu
  AI mâu thuẫn NGỮ NGHĨA với locked_result" phía trên (không có cơ chế tự
  động ở tầng GDD này vì mọi cách tự động hóa đều cần thêm 1 lệnh gọi AI
  "chấm điểm", vi phạm invariant `calls_per_turn ≤ 3`). Phát hiện chỉ qua QA
  thủ công đối chiếu `player_authored_segments` của lượt đó với
  `narration_text` trả về — xem AC-17.

## Dependencies

**Phụ thuộc vào** (upstream): Không có — Mechanic/Narration Contract
Enforcement là hệ thống Foundation, tồn tại như một luật kiến trúc độc
lập.

**Các hệ thống phụ thuộc vào Mechanic/Narration Contract Enforcement**
(downstream):

- **Turn Manager** (Foundation, đã Designed) — Core Rule #4/#8 của
  `turn-manager.md` giả định enforcement pipeline này tồn tại (lock
  trước, AI chỉ kể). `systems-index.md` hiện CHƯA liệt kê cạnh phụ thuộc
  này tường minh trong Dependency Map — đây là phụ thuộc một chiều cần
  sửa (xem Open Questions).
- **AI/LLM Integration Layer** (Core, đã Designed) — phải triển khai
  interface wrapper theo Core Rule #5-6; đây là ràng buộc bắt buộc, không
  phải gợi ý.
- **Combat System, EXP & Realm Progression, NPC Affinity & Relationship,
  Death & Consequence, Situation/Encounter Generation** (Feature, đã
  Designed) — mỗi hệ phải: tự khóa kết quả trước, gọi qua wrapper thay vì
  gọi AI trực tiếp, không đọc lại narration_text để suy ra trạng thái.
- **World Memory & Context Management** (Core, đã Designed) — lưu
  `locked_result` + `narration_text` đã qua enforcement pipeline; không
  lưu bất kỳ suy luận nào rút ra từ `narration_text`.

*(Khi các GDD trên được viết, cần đối chiếu ngược lại — mỗi hệ phải liệt
kê "phụ thuộc Mechanic/Narration Contract Enforcement" trong Dependencies
của chính nó, nếu không sẽ là phụ thuộc một chiều.)*

## Tuning Knobs

| Knob | Default | Safe Range | Ảnh hưởng nếu chỉnh |
|---|---|---|---|
| `leak_detection_enabled` | true | {true, false} | Bật/tắt việc chạy Formula 1-3 (giám sát rò rỉ số liệu). Tắt chỉ nên dùng khi cần giảm tải debug tạm thời — KHÔNG NÊN tắt trong giai đoạn kiểm chứng MVP hypothesis (cần dữ liệu `V`/`T` liên tục). |

*(Phần lớn hệ thống này là hard invariant kiến trúc, không phải giá trị
tunable — Core Rules #1-7 không có "phiên bản nhẹ hơn". Đây là điểm khác
biệt so với các GDD gameplay: một GDD kiến trúc thuần có bề mặt tuning
rất hẹp, đúng như kỳ vọng.)*

## Visual/Audio Requirements

[To be designed]

## UI Requirements

[To be designed]

## Acceptance Criteria

**Core Rules**
- **AC-01** (R1): GIVEN 1 hệ Feature kích hoạt, WHEN Resolving chạy, THEN
  `locked_result` tồn tại trong bộ nhớ trước timestamp của lệnh gọi AI
  tường thuật — assert qua spy/mock timestamp thứ tự gọi.
- **AC-02** (R2): GIVEN `locked_result` đã khóa, WHEN prompt gửi AI, THEN
  AI response không thay đổi bất kỳ giá trị nào trong `locked_result` đã
  lưu (so sánh object trước/sau bằng equality check).
- **AC-03** (R3): GIVEN có `narration_text` trả về, WHEN pipeline xử lý,
  THEN không có lệnh gọi nào ghi giá trị extract từ nó vào world state —
  kiểm bằng lint rule cấm gọi parser trên `narration_text` ngoài whitelist
  Formula 1 + automated test. (Không hoàn toàn testable bằng test tự động
  vì đây là chứng minh "không có hành vi" — cần kết hợp static-analysis.)
- **AC-04** (R4): dùng Formula 1 — GIVEN field số ≠0, WHEN narration chứa
  digit trùng, THEN `leak_flag=1`.
- **AC-05** (R5): GIVEN code 1 hệ Feature, WHEN static-scan lệnh gọi AI,
  THEN 100% đi qua wrapper chung — grep/lint CI check.
- **AC-06** (R6): GIVEN wrapper nhận `locked_result`, WHEN dựng prompt,
  THEN wrapper tự sinh prompt template (unit test snapshot), Feature
  system không truyền prompt string riêng.
- **AC-07** (R7): GIVEN codebase bất kỳ build nào, WHEN grep config/flag,
  THEN không tồn tại flag bypass enforcement — CI check.

**Formulas**
- **AC-08** (F1): `damage:47` leak → `leak_count=1` (ví dụ trong Formulas).
- **AC-09** (F1, n=0): GIVEN không field số nào, THEN `leak_matches` rỗng
  VÀ log ghi rõ `n=0`, phân biệt với "0 leak vì đúng".
- **AC-10** (F1, field=0): GIVEN `damage=0`, WHEN narration chứa "0" bất
  kỳ lý do, THEN field đó bị loại khỏi kiểm tra — không false positive.
- **AC-11** (F2 gate): T=90,V=0→PASS; T=90,V=1→FAIL bất kể
  `violation_rate`.
- **AC-12** (F2, T=0): THEN trả "N/A", không chia-cho-0.
- **AC-13** (F3): THEN mỗi field count cộng dồn đúng bằng tổng leak của
  field đó qua Formula 1.

**Edge Cases**
- **AC-14** (giới hạn semantic-mismatch): assert `leak_flag=0` cho trường
  hợp mâu thuẫn không lộ số — xác nhận GIỚI HẠN, không phải bug; kèm 1 AC
  thủ công: QA đối chiếu ≥1 lượt/phiên, ghi PASS/FAIL vào evidence doc.
- **AC-15** (multi-system gộp 1 lượt): THEN `narration_call` đếm = 1
  (không phải 3), `leak_matches` chạy trên hợp cả 3 field set.
- **AC-16** (undo loại khỏi T): THEN lượt undo không tính vào T, nhưng
  `leak_flag` log vẫn giữ cho debug.

**Core Rule 8 — Giới hạn tường thuật theo phạm vi tự mô tả (bổ sung
2026-09-01)**
- **AC-17** (R8, không thêm tình tiết/thoại NPC lạ): GIVEN người chơi cung
  cấp N đoạn (`player_authored_segments`) cho 1 lượt tự do, WHEN
  `narration_call` trả về `narration_text`, THEN không có thẻ
  `<dialogue speaker="X">` nào xuất hiện với X là một NPC không nằm trong
  danh sách N đoạn đó, VÀ không có đoạn tường thuật nào mô tả một sự
  kiện/hành động không tương ứng với bất kỳ đoạn nào trong N — kiểm bằng QA
  đối chiếu thủ công (không tự động hoá đầy đủ được, cùng giới hạn đã ghi ở
  AC-14).
- **AC-18** (R8, phủ đủ đoạn): GIVEN N đoạn người chơi cung cấp, WHEN
  `narration_text` trả về, THEN cả N đoạn đều được phản ánh trong đó —
  không đoạn nào bị bỏ sót hoàn toàn — QA đối chiếu thủ công.
- **AC-19** (R8, ranh giới enrichment cho thoại-không-mô-tả): GIVEN 1 đoạn
  chỉ gồm nguyên văn thoại của 1 NPC không kèm mô tả, WHEN AI tường thuật,
  THEN chỉ được thêm khung cử chỉ/giọng điệu ĐI KÈM lúc câu đó được nói,
  KHÔNG có hành động/phản ứng nào của NPC đó XẢY RA SAU câu thoại trong
  cùng đoạn — QA đối chiếu thủ công theo tiêu chí "đi kèm lúc nói" vs "sau
  khi nói".
- **AC-20** (R8, không cắt/không độn cho input ngắn): GIVEN input ngắn (VD:
  "Ta gật đầu"), WHEN AI tường thuật, THEN `narration_text` không chứa bất
  kỳ sự kiện hay nhân vật mới nào ngoài hành động đã cho, dù được phép mô
  tả giàu hình ảnh hơn — QA đối chiếu thủ công.
- **AC-21** (R8 ∩ R1/R2, hợp với locked_result): GIVEN lượt tự do có kèm
  `locked_result` từ 1 hệ Feature kích hoạt cùng lượt, WHEN AI tường thuật,
  THEN `narration_text` = (đủ N đoạn người chơi, đã làm giàu văn phong) HỢP
  VỚI (phản ánh đúng `locked_result`, theo AC-02/AC-04 hiện có) — không có
  nội dung nào ngoài hợp của hai tập này — QA đối chiếu thủ công.

## Open Questions

- ~~`systems-index.md` chưa liệt kê cạnh phụ thuộc Turn Manager →
  Mechanic/Narration Contract Enforcement` trong Dependency Map~~ — **đã
  giải quyết**: `systems-index.md` mục Dependency Map (ghi chú 2026-08-02)
  đã ghi nhận tường minh cạnh phụ thuộc trong-tier này làm nguồn tham
  chiếu chính thức. *(Đóng tại `/design-review` 2026-08-02)*
- **Interface/chữ ký hàm cụ thể của wrapper** (Core Rule #5-6) — module
  nào sở hữu, đặt ở đâu trong codebase, tên hàm — là quyết định của GDD
  `AI/LLM Integration Layer` khi được viết, không chốt ở đây. *(Owner:
  godot-specialist + systems-designer, target: `/design-system AI/LLM
  Integration Layer`)*
- ~~Formula 1 chỉ bắt số viết bằng chữ số (regex `\d+`), không bắt số viết
  bằng chữ~~ — **ĐÃ ĐÓNG 2026-08-07** (`/design-review ai-llm-integration-layer.md`
  vòng 1): chọn phương án đơn giản hơn — Core Rule #2 của GDD đó nay cấm
  thẳng việc AI viết số bằng chữ ngay trong chỉ thị prompt của
  `narration_call`, thay vì mở rộng detection hậu-kiểm. *(Owner:
  systems-designer — Đã đóng)*
- **Vi phạm ngữ nghĩa (semantic-mismatch) hiện chỉ dựa vào QA thủ công**
  (xem Edge Cases, AC-14) — có đáng đầu tư một cơ chế kiểm tra bán tự
  động NGOÀI vòng lặp lượt chơi (VD: batch review sau khi phiên kết
  thúc, dùng 1 lệnh gọi AI "giám khảo" riêng, không tính vào
  `calls_per_turn` vì chạy off-hot-path) hay chấp nhận thủ công hoàn
  toàn ở MVP? **Cập nhật 2026-08-07** (`/design-review ai-llm-integration-layer.md`
  vòng 1, `security-engineer` + `creative-director`): LỚP RỦI RO của giới
  hạn này đã ĐỔI, không chỉ là 1 instance khác — prompt injection qua ô
  nhập tự do của người chơi (xác nhận tồn tại ở
  `situation-encounter-generation.md` Core Rule #4) biến "AI thỉnh thoảng
  tự trôi ngẫu nhiên" (giới hạn đã chấp nhận, QA đối chiếu ≥1 lượt/phiên
  đủ dùng) thành "người chơi có thể tái lập/điều khiển được theo ý muốn"
  — một exploit LẶP LẠI được, không phải drift ngẫu nhiên. `ai-llm-integration-layer.md`
  Core Rule #2 đã bổ sung cơ chế phân tách delimiter (giảm thiểu tần suất
  injection thành công) nhưng KHÔNG loại bỏ hoàn toàn khả năng model bỏ
  qua chỉ thị — QA đối chiếu thủ công ≥1 lượt/phiên (AC-14) có thể KHÔNG
  còn đủ nếu injection trở thành vector lặp lại phổ biến; câu hỏi "có đáng
  đầu tư cơ chế bán tự động" giờ cấp thiết hơn trước. *(Owner: qa-lead +
  technical-director, target: sau khi MVP hypothesis chạy thử ≥1 phiên
  thật — VẪN CHƯA GIẢI QUYẾT, chỉ nâng mức độ ưu tiên)*
- **`leak_detection_enabled` nên là code flag hay có debug UI riêng?**
  Liên quan đến Open Question tương tự về debug panel đã nêu ở
  `turn-manager.md`. *(Owner: technical-director, target: trước
  `/create-architecture`)*
