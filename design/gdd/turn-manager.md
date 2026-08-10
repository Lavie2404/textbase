# Turn Manager / Core Game Loop

> **Status**: **Approved** (`/design-review` 2026-08-02 — 2 blocking sửa cùng phiên, không cần re-review; xem `reviews/turn-manager-review-log.md`). Header trước đó ghi nhầm "Pending Review" dù review đã đóng từ 2026-08-02 — sửa lại cho khớp review-log, 2026-08-10.
> **Author**: user + agents
> **Last Updated**: 2026-08-06 (mô hình write-ahead cho checkpoint ghi, `/design-review persistence-save-system.md`)
> **Implements Pillar**: Foundation for all pillars (esp. Pillar 2: Hệ Quả Thực Sự)

## Overview

Turn Manager điều phối nhịp thời gian của toàn bộ trò chơi: mỗi lượt chơi
tương ứng với đúng một hành động của người chơi. Ở mỗi lượt, hệ thống luôn
đưa ra 4 lựa chọn hành động gợi ý (do AI sinh ra dựa trên tình huống hiện
tại), đồng thời cho phép người chơi bỏ qua toàn bộ gợi ý và tự mô tả hành
động của mình qua ô nhập tự do.

Sau khi người chơi xác nhận một hành động (chọn gợi ý hoặc gõ tự do), hệ
thống tính toán và khóa kết quả cơ học, AI tường thuật lại, và lượt đó được
ghi nhận vào lịch sử thế giới. Người chơi có đúng một cơ hội sửa sai: lượt
VỪA xác nhận có thể bị xóa (hoàn tác cả kết quả cơ học lẫn trí nhớ AI của
lượt đó) — nhưng chỉ trước khi lượt kế tiếp bắt đầu. Một khi đã sang lượt
mới, lượt trước đó khóa vĩnh viễn, không ai — kể cả AI — được phép thay đổi.

Không có Turn Manager, không có gì trong game này có ý nghĩa: đây là hệ
thống duy nhất đảm bảo tính chất "hệ quả gần như vĩnh viễn, trừ một khoảng
sửa sai rất hẹp" (Pillar 2: Hệ Quả Thực Sự) và "thế giới chỉ trôi khi người
chơi hành động" (Core Mechanics #5) — hai nguyên tắc nền tảng phân biệt Vô
Danh Lục với một tiểu thuyết AI tự do không giới hạn kịch bản thông thường.

## Player Fantasy

Người chơi cảm nhận sức nặng của từng quyết định — không phải vì giao diện
nhắc nhở, mà vì chính nhịp điệu thao tác: chọn hành động, xác nhận, xem kết
quả — và nếu không ưng, có đúng MỘT cơ hội thử lại (undo hành động vừa xác
nhận) trước khi lượt kế tiếp bắt đầu. Đây là một khoảng thở duy nhất giữa
dự định và hệ quả, không phải một cánh cửa mở mãi mãi: cơ hội đó không dồn
lại được — undo xong, muốn undo tiếp phải hành động mới trước, và khi đó
chỉ hành động MỚI NHẤT mới còn undo được, không thể lùi xa hơn.

Cảm giác đúng: không phải nỗi sợ mất mát tuyệt đối ở mọi thao tác (vì luôn
có 1 lần thử lại cho hành động vừa rồi), mà là ý thức rõ ràng về ranh giới
hẹp của cơ hội đó — chỉ một bước, không chuỗi, không thương lượng xa hơn.
Vẫn khác hẳn một cuốn sách chọn-lối-đi có thể tua đi tua lại vô hạn.

Một điều cần nói rõ: Undo là một cơ hội THỬ LẠI, không phải một nút "sửa
cho chắc đúng". Nếu hành động ban đầu có yếu tố ngẫu nhiên (VD: một trận
đấu), xác nhận lại sau khi undo có thể ra kết quả khác — kể cả tệ hơn lần
trước. Đây là một canh bạc thật, đúng tinh thần "hệ quả thực sự": undo cho
phép người chơi được thử vận may lần nữa, không đảm bảo họ sẽ thắng.

## Detailed Rules

### Core Rules

1. Mỗi lượt = đúng 1 hành động của nhân vật chính.
2. Ở đầu mỗi lượt, hệ thống hiển thị 4 lựa chọn hành động gợi ý (AI sinh ra
   dựa trên tình huống hiện tại + lịch sử World Memory).
3. Người chơi có thể: (a) chọn 1 trong 4 gợi ý, hoặc (b) nhập hành động tự
   do vào ô chat (không giới hạn độ dài, không khóa theo độ khó) — cả hai
   đều xác nhận NGAY khi gửi, không có bước "xác nhận lại" riêng.
4. Khi xác nhận: hệ thống xác định hành động có kích hoạt hệ thống cơ học
   nào không (Combat, EXP, Hảo cảm...) → nếu có, hệ thống đó tính & khóa
   kết quả trước → AI tường thuật lại kết quả đã khóa → lượt được ghi vào
   World Memory → **Persistence ghi atomic toàn bộ save bundle của lượt
   (`persistence-save-system.md` Core Rule #1/#3)** → CHỈ SAU KHI
   `durability_confirmed = true` (Core Rule #3 của `persistence-save-system.md`
   — không phải chỉ lời gọi ghi trả về), lượt chuyển sang Turn Confirmed,
   nút Undo xuất hiện cho lượt vừa xác nhận. **Sửa 2026-08-06** (`/design-review`
   `persistence-save-system.md`, đóng mâu thuẫn: bản cũ để Turn Confirmed
   xảy ra TRƯỚC khi biết ghi có thành công hay không, khiến UI phải "rút
   lại" 1 trạng thái đã hiển thị đầy đủ (narration, nút Undo, 4 gợi ý mới)
   nếu ghi thất bại — không có transition nào cho việc đó trong state
   machine cũ. Ghi atomic giờ là điều kiện GATE của việc vào Turn
   Confirmed, không phải hệ quả xảy ra sau đó): nếu ghi atomic thất bại,
   xử lý giống hệt Edge Case "lệnh gọi AI thất bại" — xem Edge Cases.
5. Bấm Undo: hoàn tác TOÀN BỘ (kết quả cơ học + trí nhớ AI) của lượt vừa
   xác nhận, quay lại đúng tình huống trước đó — hệ thống sinh lại 4 gợi ý
   mới cho tình huống đó (không tái sử dụng gợi ý cũ, để tránh cảm giác
   lặp).
6. Undo không dồn được: sau khi undo, phải xác nhận một hành động mới
   trước khi nút Undo khả dụng trở lại — và khi đó chỉ hành động MỚI NHẤT
   undo được.
7. World time (tiến triển EXP của NPC, sự kiện thế giới) chỉ tiến lên khi
   một lượt được xác nhận và không bị undo — về bản chất, lượt bị undo coi
   như "chưa từng xảy ra".
8. **Nguyên tắc bắt buộc cho mọi hệ downstream**: kết quả cơ học do Combat,
   EXP & Realm Progression, NPC Affinity, Death & Consequence (và mọi hệ
   Feature tương lai) tính ra KHÔNG được coi là "final" — nghĩa là chưa được
   merge vào lưu trữ vĩnh viễn của hệ đó — cho đến khi lượt chứa nó được xác
   nhận VÀ không bị undo. Undo (Rule 5) phải hoàn tác được TOÀN BỘ, bao gồm
   mọi giá trị cộng dồn (EXP, Hảo cảm, vật phẩm...), không chỉ lịch sử/tường
   thuật. Cơ chế kỹ thuật cụ thể để đảm bảo nguyên tắc này (deferred-commit
   hay cơ chế khác) là quyết định ADR, chưa chốt trong GDD này — xem Open
   Questions.
9. **Ngoại lệ duy nhất của Undo — cái chết thật sự không thể undo**: nếu kết
   quả của lượt là "phải chết" (Death & Consequence kích hoạt ở ngưỡng thù
   địch sâu sắc, xem `game-concept.md` mục Cái Chết), lượt đó KHÔNG thể
   undo — `undo_available` bị khóa cứng về `false` ngay khi kết quả "phải
   chết" được khóa, trước cả khi AI tường thuật. Điều này nhất quán với
   Anti-Pillar "phải chết là chết thật, không ngoại lệ" của `game-concept.md`
   — Undo không được phép trở thành một cơ chế cứu mạng phi-diegetic. Các
   kết quả Death & Consequence KHÔNG dẫn đến chết thật (trọng thương, phế
   đan điền, sỉ nhục...) vẫn undo được bình thường như mọi lượt khác — ngoại
   lệ chỉ áp dụng cho kết quả chết thật sự.

### States and Transitions

| State | Mô tả | Chuyển sang |
|---|---|---|
| Awaiting Action | Hiển thị 4 gợi ý + ô nhập tự do, chờ người chơi | → Resolving (khi gửi hành động) |
| Resolving | Xác định + gọi hệ thống cơ học liên quan để tính & khóa kết quả, gọi AI tường thuật, rồi Persistence ghi atomic toàn bộ bundle của lượt (**sửa 2026-08-06** — ghi atomic nay là gate của transition, xem Core Rule #4; **sửa lại 2026-08-06 vòng re-review tiếp theo** — gate chính xác là `durability_confirmed`, không phải "ghi atomic thành công" chung chung, xem `persistence-save-system.md` Core Rule #3) | → Turn Confirmed (khi AI trả lời xong VÀ `durability_confirmed = true`) HOẶC → Awaiting Action (nếu ghi atomic thất bại — xem Edge Cases) |
| Turn Confirmed (is_death_turn=false) | Lượt đã ghi vào World Memory VÀ `durability_confirmed = true` (Persistence), nút Undo khả dụng, hệ thống sinh 4 gợi ý mới cho lượt kế | → Awaiting Action (lượt mới — Undo lượt cũ khóa vĩnh viễn) HOẶC → Undoing (nếu bấm Undo) |
| Turn Confirmed (is_death_turn=true) | Lượt đã ghi vào World Memory VÀ `durability_confirmed = true`, `undo_available` khóa cứng `false` (Core Rule #9), KHÔNG sinh 4 gợi ý lượt kế — nhân vật chính đã chết thật | → [Ngoài phạm vi Turn Manager] bàn giao cho Character Continuation để người chơi chọn Quỷ tu/Chuyển sinh/Chơi lại |
| Undoing | Hoàn tác kết quả cơ học + xóa trí nhớ AI của lượt đó, rồi Persistence ghi atomic phản ánh trạng thái đã rollback (**sửa 2026-08-06** — cùng nguyên tắc gate; **sửa lại 2026-08-06 vòng re-review tiếp theo** — gate = `durability_confirmed`) | → Awaiting Action (quay lại tình huống trước lượt đó, khi `durability_confirmed = true`) HOẶC → Turn Confirmed KHÔNG đổi (nếu ghi atomic thất bại — Undo coi như chưa xảy ra, xem Edge Cases) |

### Interactions with Other Systems

- **AI/LLM Integration Layer**: Turn Manager gọi AI 2 lần/lượt trong trường
  hợp bình thường — (1) sinh 4 gợi ý dựa trên tình huống, (2) tường thuật
  kết quả đã khóa — và tối đa 3 lần nếu Edge Case "AI trả về <4 gợi ý hoặc
  trùng lặp" kích hoạt đúng 1 lần retry (xem Formula 2). Không bao giờ vượt
  quá 3. Phụ thuộc Contract Enforcement để đảm bảo lần gọi tường thuật
  không tự ý đổi kết quả.
- **World Memory & Context Management**: Turn Manager ghi mỗi lượt đã xác
  nhận và không bị undo vào lịch sử; đọc lịch sử để cung cấp ngữ cảnh cho
  AI sinh gợi ý + tường thuật.
- **Combat/EXP/NPC Affinity/Death & Consequence** (Feature layer): Turn
  Manager KHÔNG tự tính các kết quả này — nó chỉ điều phối thứ tự: nhận
  diện loại hành động → gọi hệ thống tương ứng để tính+khóa → gọi AI tường
  thuật kết quả đã khóa → ghi vào World Memory. Các hệ thống này phải tuân
  thủ Core Rules #8: kết quả tính ra chưa "final" cho đến khi lượt được xác
  nhận và không bị undo — cơ chế cụ thể chốt qua ADR (xem Open Questions).
- **Persistence/Save System** — **sửa 2026-08-06** (`/design-review`
  `persistence-save-system.md`, đóng mâu thuẫn Turn Confirmed/write-
  failure): không chỉ đọc/ghi trạng thái để khôi phục khi tải lại — giờ
  còn là 1 GATE bắt buộc trên chính transition Resolving→Turn Confirmed
  và Undoing→Awaiting Action (Core Rule #4, States and Transitions). Đây
  là 1 phụ thuộc thật của Turn Manager vào Persistence, cùng dạng với 3
  phụ thuộc ẩn khác của Turn Manager đã ghi nhận ở `systems-index.md`
  (Contract Enforcement, AI Integration Layer, World Memory) — xem ghi
  chú tương ứng ở đó.
- **Death & Consequence** (Feature, đã Designed) — bổ sung 2026-08-05,
  đóng gap `/design-review` gộp 11 GDD: khi `pending_fate=true` (cửa sổ
  quyết định Kết liễu/Tha mạng), 2 trong 4 ô gợi ý ĐÓNG CỨNG cho "Kết
  liễu [NPC]"/"Tha mạng [NPC]" — sinh trực tiếp từ Death & Consequence,
  KHÔNG qua AI. 2 ô còn lại vẫn gọi AI sinh bình thường (không đổi ngân
  sách `calls_per_turn`); Turn Manager ghi đè đúng 2/4 vị trí trước khi
  hiển thị.
- **Character Continuation** (Feature, đã Designed) — bổ sung
  2026-08-05, đóng gap `/design-review` gộp 11 GDD (hard, 2 chiều): sau
  `is_death_turn=true` đã ghi, Turn Manager bàn giao quyền điều khiển
  cho Character Continuation (Idle → Awaiting Continuation Choice); SAU
  KHI `handoff_allowed=1` (D.1 của hệ đó), Character Continuation trả
  quyền điều khiển lại Turn Manager ở `slot_id` MỚI, state `Awaiting
  Action`.

## Formulas

*(Công thức Chiến đấu/EXP/Hảo cảm thuộc về GDD riêng của từng hệ thống,
không lặp lại ở đây — Turn Manager chỉ sở hữu 3 quy tắc số học điều phối
bên dưới.)*

**1. World Time Advancement**

`world_time' = world_time + confirmed(turn) × (1 − undone(turn))`

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Thời gian thế giới | world_time | int | 0 → ∞ | Tổng số lượt đã thực sự trôi qua (không tính lượt bị undo) |
| Lượt đã xác nhận | confirmed(turn) | bool | {0,1} | 1 nếu lượt đã được xác nhận |
| Lượt đã bị undo | undone(turn) | bool | {0,1} | 1 nếu lượt đó sau đó bị undo |

**Output Range**: số nguyên không âm, tăng đúng 1 khi có lượt xác nhận VÀ
không bị undo; giữ nguyên nếu lượt đó bị undo.
**Example**: world_time=10 → xác nhận lượt 11 → world_time=11 → bấm Undo
lượt 11 → world_time quay về 10 → xác nhận hành động mới cho lượt 11 →
world_time=11 lại.

**2. AI Call Budget per Turn**

`calls_per_turn = suggestion_call + suggestion_retry_call + narration_call`

| Variable | Type | Range | Description |
|---|---|---|---|
| suggestion_call | bool | {0,1} | Đã gọi AI sinh 4 gợi ý cho lượt hiện tại chưa |
| suggestion_retry_call | bool | {0,1} | Đã gọi lại AI tối đa 1 lần để bù gợi ý thiếu/trùng (xem Edge Cases) chưa |
| narration_call | bool | {0,1} | Đã gọi AI tường thuật kết quả đã khóa chưa |

**Output Range**: {0, 1, 2, 3} — 2 là số lần gọi bình thường (sinh gợi ý +
tường thuật); 3 chỉ xảy ra khi Edge Case "AI trả về <4 gợi ý hoặc trùng
lặp" kích hoạt đúng 1 lần retry. KHÔNG BAO GIỜ vượt quá 3. **Đếm theo
LOẠI call_type đã dùng trong lượt (mỗi biến trên là 1 bool, không phải bộ
đếm số lần thử)** — "Gọi AI lần thứ 4" nghĩa là dùng tới **LOẠI** call_type
thứ 4 không tồn tại (chỉ có đúng 3 loại), KHÔNG PHẢI lần gọi `request_ai`
thứ 4 về mặt số lượng instance (chốt 2026-08-08
`/design-review ai-llm-integration-layer.md` vòng 2, đóng gap
`systems-designer`: resubmit `narration_call` sau khi tầng AI/LLM trả
Failed — VD 2 lần lỗi mạng liên tiếp, hoàn toàn khả dĩ trên Mobile Web —
KHÔNG làm tăng biến `narration_call` thêm lần nữa, vì nó đã là bool=1 từ
lần gọi đầu; xem `ai-llm-integration-layer.md` Formula 4 cho lý do đầy
đủ. Nếu đọc "lần thứ 4" theo nghĩa đếm-instance sẽ mâu thuẫn trực tiếp
Edge Case "lệnh gọi AI thất bại" bên dưới, vốn tuyên bố Failed KHÔNG tính
là 1 lượt đã dùng — và mâu thuẫn Player Fantasy của `ai-llm-integration-layer.md`
[chưa từng mất lượt vì 1 lần gọi API thất bại], vì 2 lỗi mạng liên tiếp
là chuyện bình thường, không phải trường hợp biên hiếm gặp).
**Example**: Lượt bình thường = 1 (đầu lượt, sinh gợi ý) + 1 (sau xác nhận,
tường thuật) = 2. Lượt có gợi ý lỗi ở lần gọi đầu = 1 (sinh gợi ý) + 1
(retry bù gợi ý) + 1 (tường thuật) = 3.

**3. Undo Availability Window** (điều kiện boolean)

`undo_available = (turn_id == last_confirmed_turn_id) AND (no_newer_turn_confirmed) AND (has_confirmed_turn) AND (NOT is_death_turn)`

| Variable | Type | Description |
|---|---|---|
| turn_id | int | ID lượt đang xét |
| last_confirmed_turn_id | int \| null | ID lượt gần nhất đã xác nhận; `null` nếu chưa có lượt nào (xem Output) |
| no_newer_turn_confirmed | bool | true nếu chưa có lượt mới hơn được xác nhận |
| has_confirmed_turn | bool | true nếu ít nhất 1 lượt đã từng được xác nhận trong phiên chơi |
| is_death_turn | bool | true nếu kết quả lượt này là "phải chết" (Death & Consequence, ngưỡng thù địch sâu sắc — xem Core Rules #9) |

**Output**: boolean — tại một thời điểm, chỉ đúng 1 turn_id có
`undo_available = true`, và không bao giờ true nếu `is_death_turn=true` hoặc
`has_confirmed_turn=false` (tránh việc sentinel mặc định của
`last_confirmed_turn_id` trùng với turn_id thật đầu tiên và làm boolean sai
thành true trước khi có lượt nào).
**Example**: Trước lượt đầu tiên: `has_confirmed_turn=false` →
undo_available luôn false, kể cả cho turn_id=0. Lượt 15 vừa xác nhận (không
phải death) → undo_available(15)=true. Xác nhận lượt 16 →
undo_available(15)=false, undo_available(16)=true. Lượt 20 có kết quả "phải
chết" → undo_available(20)=false ngay cả khi nó là lượt gần nhất.

## Edge Cases

- **Nếu người chơi cố Undo khi `undo_available = false`**: không có tác
  dụng — hệ thống bỏ qua, không có gì thay đổi (nút Undo cũng không hiển
  thị trong trường hợp này).
- **Nếu lượt dẫn đến cái chết thật sự** (Death & Consequence xác định "phải
  chết" ở ngưỡng thù địch sâu sắc): lượt đó KHÔNG thể undo —
  `undo_available` bị khóa về `false` ngay khi kết quả được khóa (xem Core
  Rules #9). Nút Undo không hiển thị sau lượt này, kể cả trước khi người
  chơi chọn lối tiếp tục (Quỷ tu/Chuyển sinh/Chơi lại). Nhất quán với
  Anti-Pillar "phải chết là chết thật, không ngoại lệ" của
  `game-concept.md` — Undo không được là một lối thoát phi-diegetic khỏi
  cái chết đã được công thức xác định. Các hậu quả Death & Consequence
  KHÔNG gây chết thật (trọng thương, phế đan điền, sỉ nhục...) vẫn undo
  được bình thường như mọi lượt khác — ngoại lệ chỉ áp dụng cho kết quả
  chết thật sự.
- **Nếu người chơi xác nhận lại ĐÚNG hành động vừa bị undo**: hệ thống
  tính toán lại từ đầu; nếu công thức có yếu tố ngẫu nhiên (VD: RNG trong
  Combat), kết quả CÓ THỂ khác lần trước — đây là chủ đích, undo cho phép
  "thử lại" chứ không đảm bảo kết quả giống hệt.
- **Nếu lệnh gọi AI (sinh gợi ý hoặc tường thuật) thất bại** (lỗi mạng/
  API): lượt KHÔNG được coi là đã xác nhận — world_time không tăng, hệ
  thống báo lỗi và cho phép nhập lại hành động (không tính là 1 lượt đã
  dùng, không tính là 1 lần undo). **Ràng buộc bổ sung 2026-08-07**
  (`/design-review ai-llm-integration-layer.md`, đóng gap `game-designer`
  — PHÂN BIỆT RÕ với Edge Case "xác nhận lại đúng hành động vừa bị undo"
  ở trên, vốn CHO PHÉP kết quả khác vì đó là lựa chọn CHỦ ĐỘNG của người
  chơi [Undo]): nếu `narration_call` Failed SAU KHI kết quả cơ học của
  hành động đó ĐÃ được tính và khóa (`locked_result` tồn tại — VD Combat
  đã resolve xong 1 lượt trao đổi trước khi AI tường thuật thất bại), và
  người chơi sau đó thao tác lại (gõ lại/gửi lại đúng hành động vừa bị
  chặn), Turn Manager **BẮT BUỘC truyền lại ĐÚNG `locked_result` đã tính
  trước đó cho lệnh `narration_call` mới — KHÔNG được tính toán lại (không
  reroll RNG)**. Một lần lỗi mạng/API thuần hạ tầng — hoàn toàn không liên
  quan tới quyết định của người chơi — KHÔNG được phép đổi kết quả cơ học
  đã tính, nếu không sẽ mở exploit "ngắt mạng khi sắp thua để câu reroll"
  và vi phạm Pillar 3 (Sức Mạnh Có Logic)/Khế Ước Cơ Học-Tường Thuật.
  `locked_result` treo này được giữ trong bộ nhớ tạm (không phải
  Persistence — chưa "final" cho tới khi lượt xác nhận, Core Rule #8) cho
  tới khi: (a) retry thành công (lượt xác nhận, giải phóng), (b) người
  chơi gửi 1 hành động KHÁC (không phải đúng hành động vừa bị chặn —
  `locked_result` treo bị hủy, tính lại từ đầu cho hành động mới), hoặc
  (c) người chơi rời màn hình/slot hiện tại. *(Cascade từ `/design-review`
  `ai-llm-integration-layer.md` vòng 1 — xem GDD đó Interactions với Turn
  Manager để biết phần tầng AI/LLM tự đảm bảo.)*
- **Nếu `request_ai` trả `error_code=BUSY`** (thêm 2026-08-08
  `/design-review ai-llm-integration-layer.md` vòng 2, đóng gap
  `game-designer` — hợp đồng "phía caller" của tầng AI/LLM, chỉ có thể
  xảy ra do bug caller vì input đã khóa suốt Resolving/Undoing): xử lý
  HỆT như Edge Case "lệnh gọi AI thất bại" ở trên về phía người chơi
  (world_time không đổi, cho nhập lại) NHƯNG log dưới nhãn lý do RIÊNG
  BIỆT với lỗi mạng — KHÔNG gộp chung nhánh xử lý, vì `BUSY` là tín hiệu
  bug caller cần lộ ra để sửa, không phải sự cố hạ tầng bình thường. Xem
  AC-13c.
- **Nếu Persistence ghi atomic thất bại ngay sau khi AI tường thuật xong
  (Resolving) hoặc ngay sau khi Undoing hoàn tất tính toán rollback**
  (bổ sung 2026-08-06, `/design-review` `persistence-save-system.md` —
  đóng mâu thuẫn giữa Core Rule #4 cũ và States and Transitions, nơi Turn
  Confirmed từng render đầy đủ trước khi biết ghi có thành công hay
  không): xử lý theo đúng nguyên tắc "lệnh gọi AI thất bại" ở trên — lượt/
  Undo đó KHÔNG được coi là đã xảy ra. Cụ thể: (a) ghi thất bại sau
  Resolving → world_time KHÔNG tăng, hệ thống báo lỗi (theo đúng Error
  Taxonomy của `persistence-save-system.md`), quay về Awaiting Action,
  người chơi nhập lại hành động — kết quả cơ học vừa tính (Combat/EXP/
  Hảo cảm...) KHÔNG được merge (đúng Core Rule #8); (b) ghi thất bại sau
  khi Undoing hoàn tất rollback → Undo đó bị coi là CHƯA xảy ra, trạng
  thái Turn Confirmed trước đó (lượt sắp bị undo) giữ nguyên KHÔNG đổi,
  nút Undo vẫn khả dụng để người chơi thử lại thao tác Undo. **Bổ sung
  2026-08-06 vòng re-review tiếp theo** (`/design-review persistence-save-system.md`
  — đóng gap `game-designer`: nguyên nhân gốc của `WRITE_FAILED_QUOTA`/
  `WRITE_FAILED_UNSUPPORTED` KHÔNG tự biến mất giữa các lần thử, khác hẳn
  lỗi mạng thoáng qua): "người chơi nhập lại hành động" ở nhánh (a) KHÔNG
  luôn kéo theo 1 lệnh gọi AI narration MỚI — nếu người chơi gửi lại ĐÚNG
  cùng hành động ngay lập tức, Turn Manager PHẢI gọi Persistence theo cơ
  chế retry-chỉ-ghi (`pending_write_cache`, xem `persistence-save-system.md`
  Edge Cases/Tuning Knob `max_write_retry_before_escalation`) thay vì
  chạy lại toàn bộ Resolving — tránh đốt thêm AI call thật cho mỗi lần
  thử khi nguyên nhân gốc (quota) không đổi. Chỉ khi người chơi gửi 1
  hành động KHÁC, Resolving mới chạy lại đầy đủ từ đầu (gồm 1 AI call
  narration mới) như bình thường.
- **Nếu người chơi gửi hành động mới trong khi lượt trước còn ở trạng thái
  Resolving**: hệ thống khóa ô nhập/nút chọn trong suốt Resolving — không
  nhận hành động thứ 2 song song.
- **Nếu người chơi bấm Undo nhiều lần liên tiếp trong khi đang ở trạng thái
  Undoing**: hệ thống khóa nút Undo/input tương tự như khi Resolving —
  không nhận lệnh Undo thứ 2 cho đến khi Undoing hoàn tất và quay về
  Awaiting Action.
- **Nếu mất kết nối/đóng trình duyệt ngay sau khi lượt vừa xác nhận** (Turn
  Confirmed, Undo còn khả dụng): khi tải lại, Persistence khôi phục đúng
  trạng thái đó — Undo vẫn khả dụng cho lượt gần nhất, không mất qua phiên.
- **Nếu mất kết nối/đóng trình duyệt giữa trạng thái Resolving**: khi tải
  lại, hệ thống coi lượt đó CHƯA xác nhận (an toàn hơn giả định đã xong) —
  quay về Awaiting Action, người chơi nhập lại hành động.
- **Nếu AI trả về ít hơn 4 gợi ý hoặc có gợi ý trùng lặp**: hệ thống tự
  động gọi lại AI tối đa 1 lần để bù đủ 4 gợi ý duy nhất; nếu vẫn thất bại,
  dùng gợi ý dự phòng chung chung (VD: `{text: "Quan sát xung quanh",
  envelope: "observe"}`, `{text: "Chờ đợi", envelope: "wait"}`, `{text:
  "Rời đi", envelope: "leave"}` — cập nhật 2026-08-05 sang shape
  `{text, envelope}` khớp schema `suggestion_call` mới, xem
  `ai-llm-integration-layer.md` Core Rule #2) để lấp chỗ trống — không
  được hiển thị ít hơn 4 ô.

## Dependencies

**Phụ thuộc vào** (upstream): Không có — Turn Manager là hệ thống
Foundation, zero dependencies.

**Các hệ thống phụ thuộc vào Turn Manager** (downstream), kèm giao diện dữ
liệu cụ thể:

- **AI/LLM Integration Layer** (Core) — nhận lệnh gọi từ Turn Manager (loại:
  sinh gợi ý | tường thuật), trả về text.
- **World Memory & Context Management** (Core) — nhận turn record
  (`turn_id`, `action`, `locked_result`, `narration_text`, `world_time`) mỗi
  khi 1 lượt được xác nhận VÀ không bị undo; xóa record tương ứng khi 1
  lượt bị undo.
- **Persistence/Save System** (Core) — đọc/ghi trạng thái hiện tại của Turn
  Manager (`state`, `last_confirmed_turn_id`, `undo_available`) VÀ một
  `turn_snapshot` đầy đủ (trạng thái cơ học trước lượt đang chờ undo — HP,
  EXP, Hảo cảm, v.v. của mọi entity bị ảnh hưởng, theo Core Rules #8) mỗi
  khi save/load. Schema chính xác của `turn_snapshot` và việc ai sở hữu nó
  (Turn Manager giữ bản sao đầy đủ, hay từng hệ Feature tự cung cấp phần
  của mình) là quyết định ADR — xem Open Questions.
- **Combat System, EXP & Realm Progression, NPC Affinity & Relationship,
  Death & Consequence, Situation/Encounter Generation** (Feature) — được
  Turn Manager GỌI (trigger) khi hành động xác nhận thuộc phạm vi tương
  ứng; các hệ thống này trả `locked_result` cho Turn Manager để đưa vào
  lời gọi tường thuật AI.

*(Khi các GDD của những hệ thống trên được viết, cần đối chiếu ngược lại:
mỗi hệ thống phải liệt kê "phụ thuộc Turn Manager" trong Dependencies của
chính nó — nếu không sẽ là phụ thuộc một chiều, cần sửa.)*

## Tuning Knobs

| Knob | Default | Safe Range | Ảnh hưởng nếu chỉnh |
|---|---|---|---|
| `suggested_action_count` | 4 | 2–6 | Số lựa chọn gợi ý mỗi lượt. Quá ít (< 2) làm mất cảm giác chủ động; quá nhiều (> 6) gây rối UI trên di động và tăng token/lượt gọi AI sinh gợi ý. |
| `undo_depth` | 1 | 0–1 | Số lượt tối đa có thể undo. 0 = tắt hẳn undo (quay lại tinh thần "không undo" gốc); KHÔNG NÊN vượt quá 1 — phá vỡ trực tiếp Pillar 2 (Hệ Quả Thực Sự) nếu cho phép undo chuỗi nhiều lượt. |
| `ai_call_timeout_seconds` | 30 | 10–60 | Thời gian chờ tối đa cho 1 lệnh gọi AI trước khi coi là lỗi (kích hoạt Edge Case "lệnh gọi AI thất bại"). Quá ngắn → fail giả khi mạng chậm; quá dài → người chơi chờ lâu không phản hồi. |

*(`calls_per_turn ≤ 3` (2 lần cơ bản + tối đa 1 lần retry gợi ý) KHÔNG phải
tuning knob — đây là hard invariant kiến trúc (xem Formulas #2), không nên
để designer chỉnh được.)*

## Visual/Audio Requirements

[To be designed]

## UI Requirements

[To be designed]

## Acceptance Criteria

**Core Rules**
- **AC-01** (R1): GIVEN 1 lượt được xác nhận, WHEN nó resolve xong, THEN
  đúng 1 hành động được xử lý và turn count tăng đúng 1 — không bao giờ 0
  hoặc 2+.
- **AC-02** (R2): GIVEN Awaiting Action bắt đầu, WHEN màn hình render, THEN
  hiển thị đúng 4 gợi ý AI + 1 ô nhập tự do.
- **AC-03** (R3): GIVEN người chơi bấm gợi ý HOẶC gửi text tự do, WHEN
  submit, THEN chuyển thẳng sang Resolving — không có dialog xác nhận
  riêng.
- **AC-04** (R4, thứ tự xử lý): GIVEN hành động khớp 1 hệ thống cơ học,
  WHEN Resolving chạy, THEN thứ tự gọi phải là: khóa kết quả → gọi AI tường
  thuật → ghi World Memory → mở khóa Undo — kiểm chứng bằng unit test dùng
  mock/spy cho từng lệnh gọi (hệ thống cơ học, AI call, World Memory write)
  và assert thứ tự gọi qua spy, không cần debug UI/log file thủ công.
- **AC-05** (R5): GIVEN bấm Undo, WHEN hoàn tất, THEN trạng thái cơ học
  (bao gồm EXP, Hảo cảm, và mọi giá trị cộng dồn khác — xem Core Rules #8)
  quay về snapshot trước lượt, record trí nhớ AI của lượt đó bị xóa, và 4
  gợi ý mới được sinh. GIVEN 4 gợi ý mới đó, THEN tối đa 1/4 được phép trùng
  byte-for-byte với set gợi ý bị undo trước đó — nếu ≥2/4 trùng, coi là fail
  (advisory smoke check, không phải hard gate vì AI non-deterministic).
- **AC-06** (R6): GIVEN lượt N đã undo và xác nhận lại, WHEN lượt N+1 được
  xác nhận, THEN `undo_available(N)=false`, chỉ `undo_available(N+1)=true`.
- **AC-07** (R7): GIVEN lượt xác nhận rồi undo, WHEN kiểm tra world_time,
  THEN bằng giá trị trước lượt đó; GIVEN xác nhận và không undo, THEN tăng
  đúng 1.

**Formulas**
- **AC-08** (F1): world_time=10 → xác nhận →11 → undo →10 → xác nhận lại
  →11 (đúng chuỗi ví dụ trong Formulas).
- **AC-09** (F2): GIVEN 1 chu kỳ lượt đầy đủ KHÔNG kích hoạt retry gợi ý,
  WHEN đếm số lần gọi AI, THEN = 2. GIVEN Edge Case gợi ý <4/trùng lặp kích
  hoạt đúng 1 lần retry, THEN = 3. Không bao giờ ≥4.
- **AC-10** (F3): GIVEN lượt 15 xác nhận, THEN `undo_available(15)=true`
  và false ở mọi nơi khác; GIVEN lượt 16 xác nhận, THEN đảo ngược đúng như
  định nghĩa.

**Edge Cases**
- **AC-11** (cái chết không thể undo): GIVEN 1 lượt có kết quả "phải chết"
  (Death & Consequence, ngưỡng thù địch sâu sắc), WHEN kết quả được khóa,
  THEN `undo_available` = false ngay lập tức và nút Undo không hiển thị —
  kể cả trước khi người chơi chọn lối tiếp tục (Quỷ tu/Chuyển sinh/Chơi
  lại). GIVEN người chơi cố gọi Undo bằng cách khác (VD: qua API/debug trực
  tiếp, bỏ qua UI), THEN hệ thống từ chối, không có tác dụng.
- **AC-12** (RNG re-roll, không cache): GIVEN 1 hành động Combat bị undo và
  xác nhận lại với RNG source được mock/seed để trả về 2 giá trị khác nhau
  ở 2 lần gọi liên tiếp, WHEN so sánh kết quả, THEN kết quả Combat PHẢI khác
  nhau tương ứng — chứng minh hệ thống không cache/tái sử dụng kết quả cũ mà
  thực sự gọi lại RNG source mỗi lần xác nhận. (Test kiểm soát được bằng
  mock, không dựa vào xác suất của RNG thật không seed — tránh flaky test,
  xem `coding-standards.md` mục Determinism.)
- **AC-13** (lỗi mạng): GIVEN gọi AI lỗi (giả lập timeout), THEN world_time
  không đổi, không tốn turn_id, không tính vào lượt undo, người chơi quay
  lại màn nhập.
- **AC-13b** (vòng đời `locked_result` treo — 3 trigger a/b/c, đối xứng
  trực tiếp với AC-12; thêm 2026-08-08 `/design-review
  ai-llm-integration-layer.md` vòng 2, đóng gap `qa-lead`: `combat-system.md`
  đã có AC-54 test hành vi phía Combat, nhưng `turn-manager.md` — nơi
  thực sự giữ `locked_result` treo — trước bản này chỉ có văn xuôi dòng
  256-263, không AC-numbered test nào; AC-12 [PHẢI reroll khi undo-rồi-
  xác-nhận-lại] và Edge Case "lệnh gọi AI thất bại" [CẤM reroll khi
  Failed-rồi-resubmit] là 2 hành vi ĐỐI NGHỊCH kích hoạt bởi 2 đường gần
  như không phân biệt được ở code — chỉ 1 trong 2 có test trước khi sửa
  này là cấu hình dễ sinh bug): GIVEN 1 hành động Combat có `locked_result
  =X` treo sau `narration_call` Failed, RNG source mock/seed để trả giá
  trị khác nhau ở mỗi lần gọi, WHEN test lần lượt 3 nhánh: (a) retry NỘI
  BỘ (tầng AI/LLM) thành công → `locked_result` treo được giải phóng,
  KHÔNG còn tồn tại để tái dùng cho lượt sau (kiểm bằng cách thử đọc lại
  sau khi lượt đã xác nhận — không tìm thấy state treo); (b) người chơi
  gửi 1 HÀNH ĐỘNG KHÁC (không phải hành động vừa bị chặn) → `locked_result
  =X` bị hủy, Resolving chạy lại từ đầu cho hành động mới, RNG source
  ĐƯỢC GỌI LẠI (spy đếm ≥1 lệnh gọi mới — đối xứng trực tiếp AC-12); (c)
  người chơi gửi lại ĐÚNG hành động vừa bị chặn (resubmit) → `locked_result`
  truyền lại **byte-for-byte = X**, RNG source KHÔNG được gọi (spy đếm =
  0 lệnh gọi mới) — ĐỐI NGHỊCH TRỰC TIẾP với AC-12, chủ đích: (b)/(c) chỉ
  khác nhau ở việc hành động gửi lại có ĐÚNG hành động vừa bị chặn hay
  không, THEN hành vi RNG phải khác nhau tương ứng như trên. *(unit +
  mock RNG source, cross-ref AC-12)*
- **AC-13c** (`error_code=BUSY` — thêm 2026-08-08
  `/design-review ai-llm-integration-layer.md` vòng 2, đóng gap
  `game-designer`: hợp đồng "phía caller" của tầng AI/LLM chưa có ai
  nhận trước bản này): GIVEN `request_ai` trả `error_code=BUSY` (chỉ có
  thể do bug caller — input đã khóa suốt Resolving/Undoing nên đường này
  về lý thuyết không đạt được ở luồng chuẩn), WHEN Turn Manager xử lý,
  THEN hành vi phía người chơi GIỐNG HỆT Edge Case "lệnh gọi AI thất bại"
  (world_time không đổi, không tốn turn_id, cho nhập lại) NHƯNG log/
  telemetry ghi nhãn lý do `BUSY` DƯỚI NHÃN RIÊNG BIỆT, KHÔNG gộp chung
  với nhãn "lỗi mạng"/timeout — vì `BUSY` là tín hiệu bug caller cần lộ
  ra để sửa (implementer gọi `request_ai` lần 2 khi lần 1 chưa xong),
  không phải sự cố hạ tầng bình thường; gộp nhãn sẽ giấu đúng loại bug mà
  cơ chế reject-ngay của tầng AI/LLM tồn tại để lộ ra. *(unit, spy trên
  nhãn log)*
- **AC-14** (save/load giữa Resolving): GIVEN tải lại giữa Resolving, THEN
  state = Awaiting Action, không còn locked_result dở dang.
- **AC-15** (save/load giữa Turn Confirmed): GIVEN tải lại giữa Turn
  Confirmed, THEN state = Turn Confirmed, `undo_available=true` cho đúng
  turn_id, Undo hoạt động y hệt trước khi tải lại.
- **AC-16** (gợi ý lỗi → retry → fallback): GIVEN AI trả về <4 gợi ý hoặc có
  gợi ý trùng lặp ở lần gọi đầu, WHEN hệ thống xử lý, THEN gọi lại AI đúng 1
  lần để bù; GIVEN lần gọi lại vẫn thất bại (vẫn <4 hoặc trùng), THEN hệ
  thống dùng gợi ý dự phòng chung chung để lấp đủ 4 ô duy nhất — không bao
  giờ hiển thị ít hơn 4 gợi ý; và tổng số lần gọi AI cho việc sinh gợi ý
  trong lượt đó không bao giờ vượt quá 2 (1 gốc + 1 retry).
- **AC-17** (Undo no-op): GIVEN `undo_available = false` (không có lượt nào
  đang trong cửa sổ undo), WHEN người chơi cố gọi Undo (VD: qua API/debug
  trực tiếp, bỏ qua UI), THEN không có gì thay đổi — world_time, World
  Memory, và mọi giá trị cơ học giữ nguyên; và nút Undo không được render
  trong UI cho trường hợp này.
- **AC-18** (khóa input khi Resolving): GIVEN trạng thái đang là Resolving,
  WHEN người chơi cố gửi hành động thứ 2 (chọn gợi ý hoặc gõ tự do), THEN hệ
  thống từ chối/không nhận input đó — chỉ đúng 1 hành động được xử lý cho
  đến khi Resolving hoàn tất.

## Open Questions

- **Cơ chế rollback/snapshot cho Undo trên các hệ downstream** (Combat, EXP,
  Hảo cảm, Death & Consequence) chưa được chọn — cần một ADR xác định:
  deferred-commit (kết quả khóa nằm ở staging, chỉ merge vào lưu trữ vĩnh
  viễn khi hết cửa sổ undo — khuyến nghị từ `/design-review`) hay từng hệ tự
  cung cấp inverse operation. Nguyên tắc bắt buộc (Core Rules #8) đã chốt —
  chỉ còn cơ chế kỹ thuật cụ thể. *(Owner: technical-director +
  systems-designer, target: trước khi bắt đầu `/design-system
  combat-system`)*
- **Schema `turn_snapshot` cho Persistence** (những field nào, ai sở hữu)
  chưa được định nghĩa — cần cho AC-15. *(Owner: technical-director, target:
  `/design-system persistence-save-system`, có thể gộp chung ADR với mục
  trên)*
- **Transaction boundary giữa khóa kết quả downstream và ghi turn record**:
  nếu trình duyệt bị đóng/OS kill ngay sau khi 1 hệ downstream khóa kết quả
  nhưng trước khi Turn Manager ghi nhận lượt, có nguy cơ để lại trạng thái
  cơ học "mồ côi". Cần đảm bảo atomic hoặc rollback được. *(Owner:
  technical-director, target: ADR Persistence, `/create-architecture`)*
- **HTTPRequest trên HTML5 export + COOP/COEP headers**: hành vi threading
  thực tế trên Godot 4.6 Web export chưa được xác minh — cần 1 technical
  spike trước khi implement. *(Owner: technical-director, target: trước
  `/create-architecture`)*
- **Debug panel/log file cho QA thủ công quan sát thứ tự xử lý** (AC-04 đã
  testable qua unit test spy — xem Acceptance Criteria; câu hỏi còn lại chỉ
  là có cần thêm công cụ quan sát trực quan cho QA thủ công hay không).
  *(Owner: technical-director, target: trước khi viết ADR cho hệ thống
  này)*
- ~~world_time và lịch sử lượt cần "inspect được" (qua save file hoặc
  debug UI) để kiểm chứng AC-07/AC-08/AC-10 mà không cần đọc source
  code.~~ — **đã giải quyết**: `persistence-save-system.md` Core Rule #9
  + AC-09 cung cấp thao tác xuất Nhật ký đầy đủ ra JSON, cho phép kiểm
  chứng trực tiếp mà không cần đọc source code hay debug UI riêng.
  *(Đóng tại `/design-system persistence-save-system` 2026-08-02)*
- ~~Tương tác giữa Undo và chiến lược nén/rotate của World Memory (đã bị
  flag high-risk trong `systems-index.md`) chưa rõ: nếu World Memory nén
  một lượt cũ để tiết kiệm context, Undo có còn hoàn tác đúng không?~~ —
  **đã giải quyết**: `world-memory-context-management.md` Core Rule #5
  quy định `recency_window_turns` có sàn tuyệt đối = 1, đảm bảo lượt DUY
  NHẤT có thể undo luôn nằm trong cửa sổ nguyên văn, không bao giờ bị hạ
  xuống dạng fact đã nén. *(Đóng tại `/design-system
  world-memory-context-management` 2026-08-02)*
