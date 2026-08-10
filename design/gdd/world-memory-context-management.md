# World Memory & Context Management

> **Status**: Approved
> **Author**: user + agents
> **Last Updated**: 2026-08-06 (`/design-review` full mode, vòng 2 —
> NEEDS REVISION → đã sửa 10 mục blocking: thêm interface `total_turns()`
> (Public Interface + AC-29, đóng gap dependency "Cứng" của
> `core-ui-screen-navigation.md` chưa từng đặc tả); nâng "Runtime Clamp"
> thành Formula #5 đầy đủ (bảng biến, mệnh đề dừng, cơ chế trả về
> `{context, over_budget}` không throw cho kịch bản đáy-đáy, AC-28/AC-28b);
> thêm fallback cho `has_signal` với field type ngoài 5 kiểu (AC-31); làm
> rõ `in_window` là trigger một chiều, không phải live predicate sau Undo,
> siết GIVEN của AC-17 (AC-32); thêm AC-30 chứng minh `get_facts_by_entity`
> không cắt (khác `selected_facts`); thêm AC-33/AC-34 mirror INVARIANT
> `max_entities_per_prompt`; sửa AC-12 khớp key 3 cấp của Formula #3 (hết
> mâu thuẫn AC-17); thêm AC-10b (nhánh dương string/array của `has_signal`);
> đồng bộ registry `entities.yaml` + `situation-encounter-generation.md` +
> `setting-canon-integration.md` D.5/AC-24/AC-25 (đồng bộ với sửa vòng 1).
> RAM residency + sync/async `get_turn_page` được xác nhận NGHIÊM TRỌNG
> HƠN mô tả vòng 1 nhưng route sang ADR bắt buộc ở `/create-architecture`
> (technical-director), không sửa trong văn bản này — xem Open Questions.
> Kế thừa vòng 1 (2026-08-06 — 7 blocking A1-A3/B1-B3/C1 + 7 recommended:
> mở rộng `has_signal` string/array; tie-break `entity_fact_selection`;
> safe range `max_entities_per_prompt` 4-8; mục Public Interface; Core
> Rule #8 (Persistence bắt buộc lưu Context View); Runtime Clamp gốc; sửa
> ví dụ "lời hứa NPC"; nâng `recency_window_turns` 5→8). Xem
> `reviews/world-memory-context-management-review-log.md`.)
> **Implements Pillar**: Pillar 2 (Hệ Quả Thực Sự), Pillar 1 (Thế Giới Khách Quan)

## Overview

**World Memory & Context Management** là bộ nhớ lịch sử toàn cục của thế
giới — mọi lượt đã xác nhận và không bị undo (turn record: `turn_id`,
`action`, `locked_result`, `narration_text`, `world_time`) được ghi vào
đây, áp dụng cho cả nhân vật chính LẪN mọi NPC quan trọng (mỗi NPC cũng có
"lịch sử của chính họ", đúng tinh thần "NPC là nhân vật chính của chính
họ"). Đây là nguồn dữ liệu DUY NHẤT mà Turn Manager và AI/LLM Integration
Layer dùng để cung cấp ngữ cảnh cho AI khi sinh gợi ý hành động và tường
thuật kết quả.

**Không sở hữu hồ sơ nhân vật thường trực**: hệ này CHỈ có 2 cấu trúc dữ
liệu — nhật ký lượt (turn record) và fact-delta trích xuất theo
`entity_id` (VD `affinity_delta_[npc_id]`). Hồ sơ nhân vật mutable/
thường trực (`base_X0`, `npc_tag`, `concealment` instance mà Character
Card cần cho `card_exists`) **KHÔNG** nằm ở đây — thuộc blob **Entity
Record** do `persistence-save-system.md` sở hữu (chốt 2026-08-05, cụm E
`/design-review` gộp 11 GDD, đóng khoảng trống kiến trúc từng để
either/or giữa 2 hệ).

Với người chơi, hệ này là lý do thế giới không bị "chứng mất trí": một
hành động tàn nhẫn với một NPC 50 lượt trước vẫn để lại dấu vết cơ học
(`affinity_delta`, cờ sự kiện canon...) và vẫn ảnh hưởng đến cách NPC đó
(và những người quen biết họ) đối xử về sau — không có gì bị AI "quên" chỉ
vì đã trôi qua nhiều lượt. *(Sửa ví dụ 2026-08-06, `/design-review` —
`game-designer` + `creative-director`: bản gốc dùng "một lời hứa NPC đưa
ra 50 lượt trước vẫn được nhắc đúng" làm ví dụ minh họa — nhưng kiến trúc
trích xuất fact (Core Rule #3, Formula #2) CHỈ đọc field có cấu trúc của
`locked_result`, không bao giờ đọc `narration_text`; một lời hứa bằng lời
thuần túy roleplay không có field nào đại diện, nên ví dụ đó hứa hẹn điều
hệ thống không giao được — đây là lỗi câu chữ, không phải lỗi kiến trúc:
kiến trúc không được sửa theo hướng đọc ngược `narration_text`, đúng
anti-pillar "AI output không bao giờ được parse ngược thành world state"
của `game-concept.md`. Nếu về sau một hệ nào đó (VD NPC Affinity, hoặc 1
micro-system riêng) định nghĩa field cấu trúc kiểu `promise_id_[npc]`
trong `locked_result` của mình, "lời hứa" khi đó sẽ TỰ NHIÊN được nhớ qua
đúng cơ chế delta hiện có — không cần sửa gì ở World Memory. Xem Open
Questions.)*
Nhưng vì bộ nhớ này về nguyên tắc tăng vô hạn trong khi mọi mô hình AI chỉ
đọc được một cửa sổ ngữ cảnh giới hạn, hệ này còn phải giải quyết bài toán
kỹ thuật cốt lõi: NÉN/TÓM TẮT lịch sử cũ mà KHÔNG làm mất những sự kiện
thực sự quan trọng — người chơi phải cảm nhận thế giới "nhớ đúng cái đáng
nhớ", không phải nhớ tuyệt đối từng câu chữ hay quên sạch quá khứ xa.

## Player Fantasy

*(`creative-director` không được tham vấn lúc soạn thảo ban đầu — Lean
mode, không phải section rủi ro cao theo quy tắc skill. ĐÃ được
`creative-director` review lại trong `/design-review` 2026-08-06 (senior
synthesis, full mode) — xem sửa ví dụ "lời hứa" ở Overview và bên dưới.)*

Người chơi trải nghiệm hệ này ở CẢ HAI tầng. **Trực tiếp**: đây là một
tiểu thuyết tương tác — người chơi phải đọc lại được toàn bộ câu chuyện
của mình từ đầu đến cuối, y như lật lại một cuốn nhật ký đã viết. Không có
"lượt nào bị mất" khỏi nhật ký này (trừ những lượt đã bị Undo — vốn coi
như chưa từng xảy ra). Đây là nơi hiện thực hóa Visual Identity Anchor của
`game-concept.md` ("Mực Chưa Khô" — như một cuốn nhật ký sống đang được
viết ra): người chơi có thể lật lại và thấy đúng những gì đã "viết" trước
đó, không bao giờ bị sửa hay tóm tắt lại.

**Gián tiếp**: song song đó, thế giới "nhớ đúng" theo một cách người chơi
không trực tiếp thấy cơ chế — một NPC vẫn cư xử đúng với dấu vết cơ học
của một hành động tàn nhẫn 30 lượt trước (Hảo cảm, cờ sự kiện canon...),
dù bản thân đoạn văn tường thuật gốc có thể đã bị nén ở tầng ngữ cảnh AI
(không phải tầng nhật ký người chơi đọc). Cảm giác đúng: người chơi tin
thế giới có trí nhớ thật ở đúng phạm vi những gì có ý nghĩa cơ học, không
phải một AI "diễn" như đang nhớ trong khi thực ra ngữ cảnh đã rơi khỏi
cửa sổ token từ lâu. **Ranh giới có chủ đích**: sắc thái định tính thuần
túy roleplay (một câu nói, một chi tiết mô tả không đi kèm delta cơ học)
phai dần ngoài `recency_window_turns` — đây KHÔNG phải lỗi, mà là hệ quả
trực tiếp của việc World Memory tuyệt đối không đọc `narration_text` để
suy luận (Core Rule #3), giữ đúng Khế Ước Cơ Học/Tường Thuật một chiều.

## Detailed Design

### Core Rules

1. **Hai tầng dữ liệu tách biệt**:
   - **Nhật ký tường thuật đầy đủ** (Full Narrative Log): danh sách có thứ
     tự mọi turn record (`turn_id`, `action`, `locked_result`,
     `narration_text`, `world_time`) của mọi lượt ĐANG được coi là đã xác
     nhận và không bị undo TẠI THỜI ĐIỂM HIỆN TẠI. Với các lượt còn nằm
     trong tập hợp này, nội dung KHÔNG BAO GIỜ bị nén/tóm tắt/mất mát —
     đây là nguồn cho tính năng "đọc lại toàn bộ câu chuyện" của người
     chơi. **Phân biệt rõ với việc xóa do Undo (Core Rule #2)**: khi một
     lượt bị Undo, record của nó bị XÓA HOÀN TOÀN khỏi Nhật ký đầy đủ —
     đây KHÔNG phải một ngoại lệ của "không mất nội dung", mà là hệ quả
     tất yếu của việc lượt đó "chưa từng xảy ra" (Turn Manager Core Rule
     #7); nếu không xóa, người chơi đọc lại sẽ thấy một nhánh câu chuyện
     đã bị ghi đè, gây rối loạn mạch truyện. "Không mất nội dung" chỉ áp
     dụng cho các lượt VẪN CÒN được công nhận là đã xảy ra.
   - **Khung ngữ cảnh AI** (AI Context View): một view PHÁI SINH từ Nhật
     ký đầy đủ, kích thước bị chặn (bounded), dùng để dựng prompt cho
     `narration_call`/`suggestion_call`. Đây là nơi áp dụng nén.
2. **Ghi/xóa Nhật ký đầy đủ khớp đúng hợp đồng đã có với Turn Manager**:
   ghi 1 turn record khi lượt được xác nhận VÀ không bị undo; XÓA record
   tương ứng ngay khi lượt đó sau đó bị undo (đúng interface đã khai
   trong Dependencies của `turn-manager.md`).
3. **Khung ngữ cảnh AI = Cửa sổ gần đây + Sự kiện đã trích xuất**:
   - **Cửa sổ gần đây** (`recency_window_turns` lượt gần nhất): giữ
     NGUYÊN VĂN `narration_text` + `locked_result` — cung cấp mạch văn
     liền lạc cho AI tường thuật/sinh gợi ý.
   - **Sự kiện đã trích xuất** (cho mọi lượt CŨ HƠN cửa sổ gần đây):
     KHÔNG giữ `narration_text` — chỉ giữ các "sự kiện" (fact) trích xuất
     trực tiếp từ field có cấu trúc của `locked_result` (VD:
     `affinity_delta`, `hp_delta`, sự kiện phá vỡ tiền đề canon...), tổ
     chức theo TỪNG THỰC THỂ (mỗi NPC quan trọng có sự kiện riêng, cộng
     thêm nhóm "sự kiện toàn cục" không gắn NPC cụ thể).
   - Việc trích xuất này là **rule-based thuần túy trên dữ liệu đã có
     sẵn** (`locked_result` vốn đã là dữ liệu có cấu trúc) — KHÔNG BAO
     GIỜ dùng AI để tóm tắt `narration_text` thành sự kiện, vừa đúng Core
     Rule #3 của Contract Enforcement (cấm suy luận từ narration_text)
     vừa không phát sinh thêm bất kỳ lệnh gọi AI nào (giữ nguyên
     `calls_per_turn ≤ 3`).
4. **Truy vấn theo thực thể**: Sự kiện đã trích xuất phải truy vấn được
   theo `entity_id` (NPC cụ thể, hoặc "global" cho sự kiện không gắn
   NPC) — để NPC Affinity & Relationship, Setting & Canon Integration chỉ
   cần lấy đúng phần liên quan, không phải quét toàn bộ lịch sử.
5. **Cửa sổ gần đây luôn bao gồm lượt đang trong cửa sổ Undo**:
   `recency_window_turns` có giá trị tối thiểu tuyệt đối = 1 — đảm bảo
   lượt gần nhất (lượt DUY NHẤT có thể bị undo, theo
   `undo_availability_window`) LUÔN nằm trong cửa sổ gần đây dạng nguyên
   văn, KHÔNG BAO GIỜ bị hạ xuống dạng "sự kiện đã trích xuất" chỉ vì
   chưa kịp xử lý. Điều này giải quyết dứt điểm Open Question của
   `turn-manager.md` ("Undo × nén/rotate — nếu World Memory nén 1 lượt
   cũ, Undo còn đúng không?"): lượt trong cửa sổ Undo không bao giờ được
   coi là "cũ".
6. **"Không nén" ở đây là KHÔNG MẤT NỘI DUNG, không phải "không nén ở
   tầng lưu trữ vật lý"**: Nhật ký đầy đủ có thể được nén ở tầng lưu trữ
   (gzip-style, không mất thông tin) để tiết kiệm dung lượng trình
   duyệt/mobile quota — đây là quyết định của Persistence/Save System (hệ
   #6, đã Designed), KHÔNG thuộc phạm vi GDD này. GDD này chỉ đảm bảo
   NỘI DUNG logic không bao giờ bị tóm tắt/mất mát ở tầng Nhật ký đầy đủ.
7. **Không có state machine riêng**: giống Contract Enforcement/Equipment
   Data System, đây là một kho dữ liệu + tập quy tắc trích xuất, không
   phải luồng xử lý tuần tự.
8. **Persistence BẮT BUỘC lưu Khung ngữ cảnh AI kèm save, không còn là
   tùy chọn** *(mới, sửa 2026-08-06, `/design-review` — quyết định người
   dùng)*: bản gốc của GDD này cho phép Persistence/Save System CHỌN
   không serialize riêng Khung ngữ cảnh AI (tái tạo lại từ Nhật ký đầy đủ
   khi load, vì Công thức #1-#2 là deterministic). Điều đó ĐÚNG khi tuning
   knob (`recency_window_turns`, `max_facts_per_entity`,
   `max_entities_per_prompt`) không đổi giữa các lần save/load — nhưng SAI
   khi knob đã đổi giữa chừng: tái tạo dùng giá trị knob HIỆN HÀNH áp lên
   TOÀN BỘ lịch sử, gây hồi tố (một lượt vốn còn nguyên văn dưới knob cũ
   bị nén ngay khi load dưới knob mới) — vi phạm trực tiếp cả AC-17 (tái
   tạo phải giống bản sống) và AC-21 (đổi knob chỉ áp dụng tương lai).
   Để đóng lỗ hổng này dứt điểm: Persistence/Save System PHẢI serialize
   Khung ngữ cảnh AI (Cửa sổ gần đây + kho fact đã trích xuất) như một
   phần bắt buộc của save bundle — không còn là cache tùy chọn. Khi load,
   Khung ngữ cảnh AI được ĐỌC TRỰC TIẾP từ save (mang theo đúng trạng thái
   knob tại thời điểm save), KHÔNG tái tạo lại từ đầu bằng knob hiện hành.
   Công thức #1-#2 (tái tạo deterministic) vẫn giữ vai trò **recovery path**
   cho trường hợp save file cũ/hỏng thiếu Context View (VD dữ liệu di trú
   từ bản build trước bản sửa này) — AC-17 khi đó chỉ còn đúng nếu tuning
   knob KHÔNG đổi trong suốt khoảng đang tái tạo (xem Edge Cases). Thay
   đổi này cần cập nhật tương ứng ở `persistence-save-system.md` (xem
   Dependencies) — GDD này chỉ khai yêu cầu, không tự sửa GDD kia.

### States and Transitions

Không có state machine — thay vào đó là bảng các thao tác (operations)
được kích hoạt bởi sự kiện từ hệ khác:

| Thao tác | Kích hoạt bởi | Hành vi |
|---|---|---|
| Ghi turn record | Turn Manager: lượt xác nhận VÀ không undo | Append vào Nhật ký đầy đủ; nếu lượt vượt ra khỏi `recency_window_turns` (lượt mới xác nhận đẩy lượt cũ nhất trong cửa sổ ra ngoài), trích xuất sự kiện từ `locked_result` của lượt bị đẩy ra và lưu vào Sự kiện đã trích xuất theo entity_id liên quan. **Đây là MỘT thao tác nguyên tử** — ghi + (nếu áp dụng) trích xuất luôn xảy ra cùng nhau, không phải 2 bước rời rạc caller phải tự gọi (xem AC-27) |
| Xóa turn record | Turn Manager: lượt bị Undo | Xóa record khỏi Nhật ký đầy đủ VÀ khỏi Cửa sổ gần đây nếu còn ở đó (lượt vừa undo luôn là lượt mới nhất, luôn còn trong cửa sổ — xem Core Rule #5). Undo 1 `turn_id` không tồn tại (chưa từng ghi, hoặc đã bị undo trước đó) → no-op, KHÔNG throw |
| Dựng Khung ngữ cảnh AI | AI/LLM Integration Layer: chuẩn bị prompt cho `narration_call`/`suggestion_call` | Trả về: Cửa sổ gần đây (nguyên văn) + Sự kiện đã trích xuất liên quan đến entity đang tham gia tình huống hiện tại (không trả TOÀN BỘ sự kiện đã trích xuất của cả game — chỉ phần liên quan), đã áp Runtime Clamp (Formula #4) nếu vượt ngân sách token cứng |
| `get_turn_page(anchor_turn_id, count, direction)` | UI người chơi: mở màn hình đọc lại lịch sử (`Core UI/Screen Navigation`, #15) | Xem hợp đồng đầy đủ ở mục **Public Interface** ngay dưới đây |
| `get_turn(turn_id)` *(interface mới, sửa 2026-08-06)* | Bất kỳ hệ nào cần tra 1 turn record cụ thể theo `turn_id` (VD: chính GDD này dùng cho AC-01) | Xem Public Interface |
| `get_processing_state(turn_id)` *(interface mới, sửa 2026-08-06)* | Bất kỳ hệ nào cần biết 1 turn_id đã được xử lý trích xuất fact chưa (phân biệt "0 fact vì đã xử lý" ↔ "chưa xử lý") | Xem Public Interface |
| `total_turns()` *(interface mới, sửa 2026-08-06 vòng re-review 2)* | `core-ui-screen-navigation.md` (#15): D.3 pagination, D.3b live window — đóng gap dependency "Cứng" chưa có đặc tả | Xem Public Interface |
| Truy vấn sự kiện theo entity | NPC Affinity & Relationship, Setting & Canon Integration | Trả về danh sách sự kiện đã trích xuất khớp `entity_id` yêu cầu |

### Public Interface

*(Mục mới, sửa 2026-08-06 — `/design-review`, `qa-lead`: bảng Thao tác ở
trên mô tả HÀNH VI theo sự kiện kích hoạt, nhưng thiếu hợp đồng đầy đủ
(chữ ký, input không hợp lệ, giá trị trả về) cho các interface được hệ
khác GỌI TRỰC TIẾP — đặc biệt `get_turn_page` đã bị `core-ui-screen-
navigation.md` tiêu thụ ở mức phụ thuộc "Cứng" mà trước bản sửa này
không có đặc tả input không hợp lệ nào. Mục này là nguồn duy nhất cho
chữ ký các interface công khai của World Memory.)*

**`get_turn_page(anchor_turn_id, count, direction) → {records, has_more}`**
- `direction ∈ {older, newer}`.
- Trả về tối đa `count` turn record liên tiếp tính từ `anchor_turn_id`
  theo hướng đó, **KHÔNG BAO GIỜ bao gồm chính `anchor_turn_id`** (vô
  điều kiện — không phụ thuộc UI đã tải nó trước đó hay chưa; quyết định
  2026-08-06, thay cho câu mô tả cũ "nếu nó đã được tải trước đó" vốn phụ
  thuộc trạng thái phía caller mà World Memory không thể biết).
- `has_more` (bool): còn turn record xa hơn theo hướng đó hay không.
- `anchor_turn_id` **BẮT BUỘC** phải truyền — KHÔNG có giá trị null/mặc
  định cho "trang mới nhất" (quyết định 2026-08-06: khớp đúng cách
  `core-ui-screen-navigation.md` đang dùng thực tế — luôn truyền
  `last_confirmed_turn_id` hoặc `s2_last_synced_turn_id` tường minh; giữ
  interface đơn giản, không thêm nhánh chưa ai cần ở MVP).
- **`anchor_turn_id` không tồn tại trong Nhật ký đầy đủ** (VD lượt đó đã
  bị Undo sau khi UI lưu lại làm anchor): coi `anchor_turn_id` như **một
  mốc thời gian ảo** (không cần bản thân nó tồn tại) — trả về `count`
  turn record gần `anchor_turn_id` nhất theo `direction` yêu cầu (dựa
  trên turn_id còn tồn tại nhỏ hơn/lớn hơn anchor tùy hướng). KHÔNG throw,
  KHÔNG trả rỗng giả tạo. Quyết định 2026-08-06 — khớp tinh thần Pillar 2
  "lượt đã Undo coi như chưa từng xảy ra": một mốc thời gian không cần
  bản thân nó là 1 sự kiện có thật để vẫn đo được "trước/sau" nó.
- `count > (số record còn lại theo hướng đó)`: trả về ĐÚNG số record còn
  lại (không đủ `count`), KHÔNG throw vì thiếu, `has_more=false`.

**`get_turn(turn_id) → turn record | not_found`**
- Point-lookup 1 turn record duy nhất theo `turn_id` chính xác.
- `turn_id` không tồn tại (chưa từng ghi, hoặc đã bị Undo): trả
  `not_found` tường minh (không phải turn record rỗng giả) — phân biệt
  rõ với AC-01 (turn_id tồn tại và chưa undo → luôn trả đúng record).

**`get_processing_state(turn_id) → {processed: bool, fact_count: int} | not_found`**
- `turn_id` chưa tồn tại: `not_found`.
- `turn_id` tồn tại nhưng CHƯA rời `recency_window_turns` (còn nguyên văn
  trong cửa sổ gần đây, chưa qua bước trích xuất): `processed=false`.
- `turn_id` đã rời cửa sổ VÀ đã qua bước trích xuất, kể cả khi
  `fact_count=0` (lượt thuần thoại, Formula #2 edge case): `processed=true,
  fact_count=0` — đây là trạng thái hợp lệ, phân biệt rõ với
  `processed=false` (Formula #2, AC-11).

**`get_facts_by_entity(entity_id) → set<fact>`**
- Trả về TOÀN BỘ fact (không cắt theo `max_facts_per_entity`) khớp
  `entity_id` — khác với `selected_facts` (Công thức #3, chỉ dùng nội bộ
  khi Dựng Khung ngữ cảnh AI). Đây là interface mà NPC Affinity, Setting
  & Canon Integration dùng khi cần TOÀN BỘ lịch sử, không chỉ phần vào
  1 prompt.
- `entity_id` chưa từng có fact nào: trả tập rỗng, KHÔNG throw (AC-30).
  *(Sửa 2026-08-06, vòng re-review 2 — `qa-lead`/`creative-director` phát
  hiện: bản trước trích dẫn "(AC-13)" ở đây, nhưng AC-13 kiểm `selected_facts`
  — một hàm KHÁC, vốn CÓ cắt theo `max_facts_per_entity` — không chứng
  minh được gì về `get_facts_by_entity`. AC-30 (mới, xem Acceptance
  Criteria) mới là AC đúng phạm vi, kiểm cả tập rỗng lẫn tính chất
  "KHÔNG cắt" — tính chất phân biệt cốt lõi của interface này.)*

**`total_turns() → int`** *(interface mới, thêm 2026-08-06 vòng re-review 2 —
`qa-lead` phát hiện: `core-ui-screen-navigation.md` dòng 443 đã khai
`total_turns(slot)` là dependency "Cứng" đọc từ World Memory, dùng làm
input cho ≥8 AC của hệ đó (D.3 pagination, D.3b live window, property-test
O(1) AC-15/AC-48) — nhưng GDD này chưa từng đặc tả interface đó ở đâu.
Mục này đóng gap.)*
- Trả về tổng số turn record hiện có trong Nhật ký đầy đủ của slot ĐANG MỞ
  (confirmed và KHÔNG bị undo) — **KHÔNG tham số**: World Memory chỉ theo
  dõi đúng 1 slot đang mở tại một thời điểm (không có khái niệm "slot" nào
  khác xuất hiện ở bất kỳ đâu trong GDD này); ký hiệu `total_turns(slot)`
  bên `core-ui-screen-navigation.md` là quy ước ngữ cảnh phía đó, không
  phải một tham số thật World Memory nhận.
- **`total_turns() ≠ last_confirmed_turn_id`**: vì `turn_id` KHÔNG BAO GIỜ
  được tái sử dụng sau khi bị Undo (bất biến đã có của `turn-manager.md`,
  ghi chú tại AC-07), 2 giá trị này lệch nhau đúng bằng số lần Undo đã xảy
  ra trong suốt slot đó (VD: 100 lượt xác nhận, 3 lần Undo trong đó →
  `last_confirmed_turn_id=100`, `total_turns()=97`). Không được suy ra cái
  này từ cái kia.
- **Là 1 counter duy trì O(1)**, tăng/giảm ĐÚNG CÙNG lúc với thao tác
  "Ghi turn record"/"Xóa turn record" (bảng Thao tác) — KHÔNG phải phép
  đếm/quét lại toàn bộ Nhật ký đầy đủ mỗi lần gọi. Đây là điều kiện để
  `total_pages`/`ui_memory_bound` phía `core-ui-screen-navigation.md`
  thực sự giữ được tính chất O(1) mà AC-15/AC-48 của hệ đó kiểm chứng —
  nếu implement bằng phép quét, tính đúng vẫn giữ nhưng độ phức tạp thực
  tế trở thành O(n), phá vỡ tiền đề "trần bộ nhớ UI độc lập world_time"
  của hệ đó dù không AC nào của họ tự phát hiện ra (vì AC-15/AC-48 chỉ
  test kết quả, không test độ phức tạp runtime).
- Chưa có turn record nào (`world_time=0`, slot vừa "Bắt đầu mới"): trả về
  `0`, KHÔNG throw (nhất quán AC-07a).

### Interactions with Other Systems

- **Turn Manager**: nguồn ghi/xóa turn record duy nhất (Core Rule #2);
  World Memory không tự quyết định khi nào ghi/xóa, chỉ phản ứng theo sự
  kiện Turn Manager phát ra.
- **Mechanic/Narration Contract Enforcement**: World Memory tuân thủ Core
  Rule #3 của hệ đó (không lưu suy luận từ `narration_text`) một cách
  triệt để hơn — không chỉ "không lưu", mà toàn bộ Sự kiện đã trích xuất
  bắt buộc lấy từ `locked_result`, không bao giờ từ `narration_text`.
- **AI/LLM Integration Layer**: cung cấp Khung ngữ cảnh AI cho Checkpoint
  2 (dựng prompt) của cả `narration_call` và `suggestion_call` — đây
  chính là "ngữ cảnh World Memory" mà GDD đó đã tham chiếu.
- **NPC Affinity & Relationship, Setting & Canon Integration** (Designed
  2026-08-03) và **Situation/Encounter Generation** (đã Designed):
  truy vấn Sự kiện đã trích xuất theo entity_id — giao diện truy vấn đã
  cố định ở GDD này và 2 hệ đầu đã tiêu thụ đúng như khai (field
  `affinity_delta_[npc_id]`, `canon_*`); Setting & Canon còn cung cấp
  `importance_tier` (D.5, đã CHỐT vào Công thức #3 — sửa 2026-08-06, tên
  đúng theo `setting-canon-integration.md`, không phải `canon_importance_
  tier` như bản trước từng ghi nhầm) cho khe cắm key của
  `entity_fact_selection`.
- **Persistence/Save System** (đã Designed): sẽ đọc/ghi cả Nhật ký đầy
  đủ lẫn Khung ngữ cảnh AI khi save/load; quyết định nén-lưu-trữ vật lý
  (Core Rule #6) thuộc phạm vi GDD đó.

## Formulas

*(Đây là công thức quản lý dữ liệu/kỹ thuật — không phải công thức cân bằng
gameplay. 5 công thức dưới đây giải quyết trực tiếp cờ HIGH-RISK: chứng minh
Khung ngữ cảnh AI luôn bị chặn kích thước bất kể `world_time` tăng vô hạn.
Đề xuất bởi `systems-designer`. *(Cập nhật 2026-08-06, vòng re-review 2:
"Runtime Clamp" trước đây là văn xuôi không có bảng biến/mệnh đề dừng —
nay nâng thành Formula #5 đầy đủ, cùng kỷ luật đặc tả với 4 công thức còn
lại, sau khi review phát hiện đây chính là lý do lỗ hổng "đáy-đáy" từng lọt
lưới.)*)*

**1. Ranh Giới Cửa Sổ Gần Đây (Recency Window Membership)**

Công thức `recency_window_membership` được định nghĩa là:

`in_window(turn_id) = (last_confirmed_turn_id − turn_id) < recency_window_turns`

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| ID lượt đang xét | turn_id | int | 1 → ∞ | Lượt cần kiểm tra còn nguyên văn hay đã bị trích xuất |
| ID lượt xác nhận gần nhất | last_confirmed_turn_id | int | 1 → ∞ | Lượt mới nhất đã xác nhận VÀ không bị undo tại thời điểm xét |
| Kích thước cửa sổ gần đây | recency_window_turns | int | 1 → ∞ (tối thiểu tuyệt đối = 1, Core Rule #5) | Số lượt gần nhất giữ nguyên văn |
| Còn trong cửa sổ | in_window(turn_id) | bool | {0,1} | 1 = còn nguyên văn; 0 = đã (hoặc sắp) bị trích xuất thành sự kiện |

**Phạm vi kết quả**: boolean. Lượt RỜI khỏi cửa sổ đúng vào thời điểm một
lượt mới được xác nhận khiến điều kiện chuyển từ true → false — tức là:

`turn_id_falls_out = last_confirmed_turn_id' − recency_window_turns`

(trong đó `last_confirmed_turn_id'` là giá trị SAU khi lượt mới vừa xác
nhận). Vì `turn_id` tăng đúng 1 mỗi lần xác nhận, đúng **1 lượt duy nhất**
rơi ra khỏi cửa sổ mỗi lần có 1 lượt mới xác nhận — không có xử lý hàng
loạt (batch), không cần quét lại toàn bộ cửa sổ mỗi turn.

**Ví dụ minh họa**: `recency_window_turns = 5`. Lượt 20 vừa xác nhận
(`last_confirmed_turn_id' = 20`) → `turn_id_falls_out = 20 − 5 = 15` → lượt
15 bị trích xuất thành sự kiện ngay tại thời điểm này (xem Công thức #2);
lượt 16–20 vẫn nguyên văn trong cửa sổ.

**Trường hợp biên**:
- `world_time = 0` / lượt đầu tiên (`last_confirmed_turn_id = 1`): `turn_id_falls_out = 1 − 5 = −4` (turn_id không tồn tại) → **không trích xuất gì** cho đến khi tổng số lượt đã xác nhận vượt quá `recency_window_turns`. Guard bắt buộc: chỉ trích xuất nếu `turn_id_falls_out ≥ 1`.
- `recency_window_turns = 1` (mức tối thiểu tuyệt đối theo Core Rule #5): mỗi lượt mới xác nhận lập tức trích xuất lượt NGAY TRƯỚC nó — không có vùng đệm nguyên văn nào ngoài lượt mới nhất. Hợp lệ nhưng là cực hạn nén tối đa (ghi chú cho Tuning Knobs).
- Lượt vừa bị Undo: không áp dụng công thức này — Core Rule #2 xóa thẳng record khỏi cả hai tầng, không đi qua đường "rời khỏi cửa sổ" (lượt vừa undo luôn là lượt mới nhất, `undo_availability_window` đảm bảo nó luôn nằm trong cửa sổ tại mọi thời điểm nó có thể bị undo).
- **`in_window(turn_id)` chỉ đúng vai trò TRIGGER tại thời điểm 1 lượt MỚI
  xác nhận — KHÔNG phải một live predicate re-queryable bất kỳ lúc nào**
  *(làm rõ 2026-08-06, vòng re-review 2 — `systems-designer` phát hiện:
  áp công thức theo nghĩa đen SAU KHI 1 lượt MỚI HƠN bị Undo — khiến
  `last_confirmed_turn_id` GIẢM — có thể cho `in_window(turn_id)=true` với
  1 `turn_id` đã bị evict vĩnh viễn từ trước; VD `recency=8`,
  `last_confirmed=20` → lượt 12 đã evict; Undo lượt 20 →
  `last_confirmed=19` → `in_window(12)=(19−12)=7<8=true` theo nghĩa đen).
  Việc evict khỏi cửa sổ là hành động MỘT CHIỀU, cùng bản chất với chính
  Undo (Core Rule #2 — lượt bị undo không "sống lại"): 1 lượt KHÔNG BAO
  GIỜ quay lại dạng nguyên văn chỉ vì `last_confirmed_turn_id` giảm. Xem
  AC-32 (siết lại điều kiện của AC-17 theo đúng làm rõ này).*

---

**2. Số Lượng Sự Kiện Trích Xuất Mỗi Lượt (Fact Extraction Count)**

Công thức `fact_extraction_count` được định nghĩa là:

`facts_extracted(turn) = Σ f∈fields(locked_result) signal(f)`

với `signal(f) = 1` nếu `has_signal(f)`, ngược lại `0`; và:

`has_signal(f) = (numeric(f) ∧ f.value ≠ 0) ∨ (boolean(f) ∧ f.value = true) ∨ (event(f) ∧ f.value ≠ null) ∨ (string(f) ∧ f.value ≠ null ∧ f.value ≠ "") ∨ (array(f) ∧ |f.value| > 0)`

*(Sửa 2026-08-06, `/design-review` — `systems-designer`: 2 nhánh cuối bổ sung so với bản gốc chỉ có 3 kiểu numeric/boolean/event. Không có nhánh này, mọi field kiểu string/enum hoặc array KHÔNG BAO GIỜ sinh fact — đây không phải rủi ro giả định, mà là mâu thuẫn ĐANG tồn tại: `setting-canon-integration.md` D.5 đã định nghĩa tier 1 của `importance_tier` dựa trên field enum `battle_result_[char]` — field đó sẽ không bao giờ vào được kho fact nếu thiếu nhánh `string(f)`. Quy ước: string rỗng `""` và array rỗng `[]` được coi là "không tín hiệu", giống cách `numeric=0`/`boolean=false`/`event=null` đã được coi là baseline không đổi.)*

**Fallback cho field type ngoài 5 kiểu đã định nghĩa** *(bổ sung 2026-08-06,
vòng re-review 2 — `systems-designer` phát hiện: 5 nhánh trên không có
nhánh phủ (catch-all) cho 1 field có kiểu KHÔNG khớp cả 5 loại (VD object/
dict lồng nhau nếu 1 hệ Feature tương lai định nghĩa sai schema) — khác
hẳn cách `entity_id` không khớp quy ước đã có fallback tường minh (Edge
Cases). Không có nhánh này, hành vi là UNDEFINED: có thể luôn âm thầm trả
`has_signal=false` (field vĩnh viễn không sinh fact mà không ai biết) mà
không có log cảnh báo nào — nguy hiểm hơn hẳn trường hợp entity_id lệch
quy ước)*: field có kiểu không khớp cả 5 nhánh trên mặc định
`has_signal(f) = true` (fail-safe: fact vẫn được sinh ra, KHÔNG âm thầm
mất) VÀ tạo 1 bản ghi log cảnh báo schema để QA rà soát — đối xứng đúng
với cách `entity_id` không khớp quy ước được xử lý (xem Edge Cases). Xem
AC-31.

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Trường dữ liệu của kết quả khóa | f | field | ∈ fields(locked_result) | Một field có cấu trúc trong `locked_result` — 5 kiểu hỗ trợ: numeric, boolean, event, string/enum, array (VD: `hp_delta`, `affinity_delta_[npc_id]`, `canon_break_flag`, `battle_result_[char]`) |
| Có tín hiệu đáng ghi | has_signal(f) | bool | {0,1} | 1 nếu field này mang thay đổi thực sự (khác 0/null/false/""/[]) |
| Tổng field có cấu trúc | F | int | cố định TẠI MỘT PHIÊN BẢN SCHEMA đã chốt, không phải hằng số toán học vĩnh viễn | Tổng số field khả dĩ trong 1 turn record — F tăng khi hệ Feature mới (Combat, EXP, Death & Consequence...) thêm field vào schema `locked_result` của họ; `avg_fact_tokens` (Formula #4) cần đo lại mỗi khi F tăng đáng kể (xem Open Questions) |
| Số sự kiện trích xuất | facts_extracted(turn) | int | 0 → F | Số fact record được tạo ra từ 1 lượt khi nó rời cửa sổ gần đây |

**Phạm vi kết quả**: số nguyên trong `[0, F]`, F hữu hạn tại bất kỳ thời
điểm nào (schema `locked_result` do Turn Manager/Contract Enforcement +
từng hệ Feature quyết định, có thể TĂNG khi hệ Feature mới thêm field —
xem cột F ở bảng trên) — do đó **mỗi lượt đóng góp một lượng fact bị chặn
trên tại thời điểm đó**,
không phải một khối văn bản tùy ý. Mỗi field có tín hiệu → đúng 1 fact
record: `fact = (fact_id, entity_id(f), turn_id, world_time, field_name(f),
field_value(f))`, với `entity_id(f)` xác định bởi chính schema của field đó
(VD: `affinity_delta_bui_lan` → `entity_id = "bui_lan"`; field không gắn
NPC cụ thể → `entity_id = "global"`). **1 fact/field có tín hiệu, KHÔNG
PHẢI 1 fact/turn** — giữ đúng độ chi tiết để truy vấn theo entity_id
(Core Rule #4) không bị trộn lẫn các loại thay đổi khác nhau vào 1 blob.

**Ví dụ minh họa**: `locked_result` của lượt 15 = `{hp_delta: −15 (entity=player), affinity_delta_bui_lan: +2 (entity=bui_lan), mana_delta: 0 (entity=player), canon_break_flag: null}` → `has_signal` đúng cho `hp_delta` và `affinity_delta_bui_lan`, sai cho `mana_delta` (=0) và `canon_break_flag` (=null) → `facts_extracted(15) = 2`, sinh 2 fact record cho 2 entity_id khác nhau (`player`, `bui_lan`).

**Trường hợp biên**:
- **Lượt thuần thoại/không có delta nào khác 0** (VD: hội thoại không ảnh hưởng chỉ số): `facts_extracted(turn) = 0` — hợp lệ, KHÔNG phải lỗi. Cần log rõ ràng là "0 fact — đã xử lý, không có tín hiệu" (phân biệt với "chưa xử lý"), vì hệ thống truy vấn sau này (NPC Affinity, Setting & Canon) cần biết chắc turn_id này đã được xét qua chứ không phải bị bỏ sót.
- `narration_text` của lượt đó **không có bất kỳ dấu vết nào** còn lại trong Khung ngữ cảnh AI sau khi rời cửa sổ (đúng Core Rule #3) — nếu lượt có 0 fact, sau khi rời cửa sổ nó hoàn toàn "biến mất" khỏi AI Context View (vẫn còn nguyên trong Nhật ký đầy đủ, người chơi vẫn đọc lại được).

---

**3. Chọn Sự Kiện Liên Quan Cho 1 Prompt (Entity-Scoped Fact Selection)**

Công thức `entity_fact_selection` được định nghĩa là:

`selected_facts(entity_id) = top_K(facts(entity_id), key = (importance_tier DESC, world_time DESC, fact_id ASC), K = max_facts_per_entity)`

*(Sửa 2026-08-06, `/design-review` — `systems-designer`: bản gốc dùng
`key = world_time` thuần và mô tả `importance_score` là "để ngỏ cho sau
này". Đó là mô tả LỖI THỜI ngay tại thời điểm review — `setting-canon-
integration.md` D.5 (Designed 2026-08-03) và registry `entities.yaml` đã
CHỐT khe cắm này rồi: `importance_tier` (0-3, pure function trên
`field_name`/`field_value` của chính fact, không đọc world-state ngoài)
là primary sort key, `world_time` chỉ còn là fallback cho các fact cùng
tier. Việc GDD sở hữu công thức lại mô tả sai chính công thức mình sở
hữu là một dạng doc drift — sửa ở đây để khớp thực tế đã triển khai bên
`setting-canon-integration.md`. Thêm `fact_id ASC` làm tie-break thứ 3:
Công thức #2 CHỦ ĐÍCH sinh nhiều fact/lượt (VD 2 fact cùng turn cho 2
entity khác nhau — nhưng cũng có thể trùng entity nếu 1 turn có ≥2 field
cùng ảnh hưởng 1 NPC), nên tie ở `(importance_tier, world_time)` là
trạng thái THƯỜNG XUYÊN chứ không phải biên hiếm; không có tie-break thứ
3, `top_K` không có total order → vi phạm trực tiếp AC-17 (tái tạo phải
deterministic). `fact_id` giả định là 1 số tăng đơn điệu gán lúc tạo fact
— interface tạo fact phải đảm bảo tính chất này.)*

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Thực thể cần lấy sự kiện | entity_id | string | NPC id cụ thể, hoặc "global" | Đối tượng đang tham gia tình huống hiện tại của prompt |
| Toàn bộ sự kiện đã lưu của thực thể | facts(entity_id) | set | 0 → ∞ (lý thuyết, tăng theo world_time) | Tất cả fact record có entity_id khớp, tính đến thời điểm hiện tại |
| Trần số fact mỗi thực thể mỗi prompt | max_facts_per_entity | int | ≥ 0 (tuning knob) | Số fact tối đa được đưa vào 1 prompt cho 1 entity, chọn theo `key` ở trên |
| Tầm quan trọng của fact | importance_tier | int | 0-3 | Cung cấp bởi Setting & Canon Integration D.5 — pure function trên `field_name`/`field_value` của fact, KHÔNG đọc world-state ngoài (giữ đúng tinh thần rule-based 0-AI-call của World Memory); mọi fact chưa khớp rule nào của D.5 mặc định `importance_tier = 0` |
| Định danh fact tăng đơn điệu | fact_id | int | 1 → ∞, tăng đơn điệu theo thứ tự tạo fact | Tie-break cuối cùng khi 2+ fact cùng `(importance_tier, world_time)` — đảm bảo `top_K` có total order, kết quả deterministic |
| Sự kiện được chọn | selected_facts(entity_id) | set | 0 → max_facts_per_entity | Tập con thực sự được nhét vào prompt |

**Phạm vi kết quả**: `|selected_facts(entity_id)| ≤ max_facts_per_entity`
luôn đúng — **bất kể** `|facts(entity_id)|` đã tăng lớn đến đâu qua một
playthrough dài. Đây là công thức tách biệt với `recency_window_turns`
(Công thức #1): #1 chặn số LƯỢT nguyên văn, #3 chặn số FACT đã trích xuất
đưa vào 1 prompt — hai cơ chế nén độc lập, cộng dồn tác dụng ở Công thức
#4. **Tương thích ngược**: nếu `importance_tier` luôn bằng nhau (VD hệ
Setting & Canon tắt/chưa chạy), key suy biến thành `(world_time DESC,
fact_id ASC)` — đúng hành vi "recency thuần" của bản MVP trước sửa này,
không đổi cấu trúc `top_K`.

**Ví dụ minh họa**: `max_facts_per_entity = 8`. NPC "Bùi Lan" đã tích lũy
23 fact qua 3 phiên chơi, trong đó có 1 fact `importance_tier=3` (NPC
từng chứng kiến 1 sự kiện phá canon) nằm ở `world_time` cũ (thứ 20/23
theo recency thuần) → `selected_facts("bui_lan")` LUÔN bao gồm fact
`tier=3` đó (đứng đầu do tier cao nhất), sau đó lấp đầy 7 suất còn lại
bằng các fact `world_time` mới nhất trong số các fact `tier` thấp hơn —
khác với hành vi recency-thuần cũ (fact `tier=3` cũ có thể đã bị đẩy
khỏi top-8 bởi các fact vặt gần đây hơn).

**Trường hợp biên**:
- `|facts(entity_id)| ≤ max_facts_per_entity` (VD: NPC mới xuất hiện, mới có 3 fact, trần là 8): `selected_facts` = toàn bộ 3 fact, không cần cắt — `top_K` với K > |tập hợp| trả về nguyên tập hợp, không lỗi, không cần fact giả để lấp đầy.
- **Entity chưa từng xuất hiện** (entity_id hợp lệ nhưng `facts(entity_id) = ∅`, VD: NPC vừa được giới thiệu lần đầu trong lượt hiện tại, chưa có lượt nào của họ từng rời cửa sổ gần đây): `selected_facts(entity_id) = ∅` — hợp lệ, không phải lỗi. Giao diện truy vấn (dùng chung bởi NPC Affinity, Setting & Canon sau này) phải trả về tập rỗng cho entity_id chưa tồn tại, KHÔNG throw exception — vì "NPC chưa có lịch sử" là trạng thái hợp lệ, không phải trạng thái lỗi.
- `max_facts_per_entity = 0`: hợp lệ về mặt công thức (loại bỏ hoàn toàn tầng "sự kiện đã trích xuất" khỏi mọi prompt, chỉ còn cửa sổ gần đây) — nhưng đây là cực hạn cần cảnh báo ở Tuning Knobs vì sẽ tái tạo lại đúng vấn đề "thế giới mất trí nhớ" mà GDD này được sinh ra để giải quyết.
- **2+ fact cùng `(importance_tier, world_time)`** (VD 1 turn có `affinity_delta_bui_lan` và 1 field khác cũng map về entity `bui_lan`, cùng tier suy ra từ D.5): `fact_id ASC` phân định thứ tự — kết quả `top_K` xác định (deterministic) bất kể implementation dùng cấu trúc dữ liệu nào để lưu `facts(entity_id)`.

---

**4. Chặn Trên Kích Thước Khung Ngữ Cảnh AI (AI Context View Size Bound)**

Công thức `ai_context_view_size_bound` được định nghĩa là:

`context_size(prompt) = (recency_window_turns × avg_turn_tokens) + Σ e∈entities_in_scope min(|facts(e)|, max_facts_per_entity) × avg_fact_tokens`

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Token trung bình/1 lượt nguyên văn | avg_turn_tokens | float | > 0 (đo thực nghiệm) | Kích thước ước tính của 1 turn record đầy đủ (`narration_text` + `locked_result`) khi đưa vào prompt |
| Token trung bình/1 fact | avg_fact_tokens | float | > 0 (đo thực nghiệm) | Kích thước ước tính của 1 fact record khi serialize vào prompt |
| Thực thể nằm trong phạm vi tình huống | entities_in_scope | set | 1 → max_entities_per_prompt | Các entity_id thực sự liên quan đến tình huống hiện tại (NPC có mặt trong cảnh + "global") |
| Trần số thực thể mỗi prompt | max_entities_per_prompt | int | ≥ 1 (tuning knob) | Chặn trên số entity_id được xét trong 1 prompt, bất kể tổng số NPC đã từng xuất hiện trong game |
| Kích thước prompt (ước tính) | context_size(prompt) | float | > 0, bị chặn trên | Tổng token ước tính của Khung ngữ cảnh AI cho 1 prompt cụ thể |

**Phạm vi kết quả — CHẶN TRÊN TIỆM CẬN (KỲ VỌNG), KHÔNG PHẢI CHẶN CỨNG
POINTWISE (giải quyết PHẦN CẤU TRÚC của cờ HIGH-RISK; xem cơ chế Runtime
Clamp bên dưới để giải quyết PHẦN ĐẢM BẢO TUYỆT ĐỐI)**:

*(Sửa tiêu đề 2026-08-06, `/design-review` — `systems-designer` +
`creative-director`: bản gốc ghi "CHỨNG MINH CHẶN TRÊN" — điều ĐÚNG và
vẫn giữ nguyên trong phép chứng minh dưới đây là kết luận **O(1) theo
`world_time`** (không phụ thuộc số lượt/số fact đã tích lũy qua một
playthrough dài). Điều KHÔNG đúng là diễn giải `C` như một trần cứng mọi
prompt cụ thể không bao giờ vượt qua — vì `avg_turn_tokens`/
`avg_fact_tokens` là giá trị TRUNG BÌNH đo thực nghiệm, không phải giá
trị LỚN NHẤT. Một `narration_text` dài bất thường hoặc một cụm fact
`importance_tier` cao với mô tả dài (VD nhiều `canon_break_flag` cùng lúc
ở 1 cảnh climax nhiều NPC) hoàn toàn có thể khiến `context_size` thực tế
vượt `C`. Kết luận O(1) — thứ thực sự giải quyết cờ HIGH-RISK gốc ("nhật
ký vô hạn xung đột context window hữu hạn") — KHÔNG bị ảnh hưởng bởi sửa
này; chỉ có mức độ đảm bảo của con số `C` cụ thể được làm rõ lại, và một
lưới an toàn runtime được thêm vào để bù đắp phần kỳ vọng không phủ hết.)*

```
context_size(prompt) ≤ recency_window_turns × avg_turn_tokens
                       + max_entities_per_prompt × max_facts_per_entity × avg_fact_tokens
                     = C   (hằng số, KHÔNG phụ thuộc world_time — đúng KỲ VỌNG,
                            không đảm bảo cho MỌI prompt cụ thể — xem Runtime Clamp)
```

Vế phải hoàn toàn không chứa `world_time` — mọi số hạng phụ thuộc
`world_time` (`|facts(e)|` tăng theo thời gian chơi, tổng số NPC từng gặp
tăng theo thời gian chơi) đều bị **chặn (clamp)** bởi `min()` (Công thức
#3) hoặc bởi `max_entities_per_prompt` trước khi cộng vào tổng. Do đó
`context_size(prompt)` là **O(1)** theo `world_time`, dù dữ liệu THÔ (toàn
bộ Nhật ký đầy đủ + toàn bộ kho fact của mọi entity) vẫn tăng **O(world_time)**
không giới hạn — đúng như thiết kế: dữ liệu thô không cần bị chặn (đó là
việc lưu trữ, thuộc Persistence/Save System, Core Rule #6), chỉ phần thực
sự đưa vào lệnh gọi AI mới cần bị chặn.

**Ví dụ minh họa**: `recency_window_turns = 5`, `avg_turn_tokens = 350`,
`max_entities_per_prompt = 4`, `max_facts_per_entity = 8`, `avg_fact_tokens
= 15` → `C = 5×350 + 4×8×15 = 1750 + 480 = 2230` token (kỳ vọng). Dù người
chơi đã chơi 500 lượt hay 50.000 lượt (`world_time` bất kỳ), `context_size
(prompt)` **kỳ vọng** không vượt quá ~2230 token; đảm bảo TUYỆT ĐỐI (mọi
prompt, mọi lúc) do Runtime Clamp bên dưới cung cấp, không phải bởi bất
đẳng thức này.

---

**5. Lưới An Toàn Cứng Khi Vượt Ngân Sách Token (Runtime Hard Clamp)**
*(nâng từ "Runtime Clamp" — văn xuôi không có bảng biến/mệnh đề dừng —
thành công thức đầy đủ, sửa 2026-08-06 vòng re-review 2, `systems-designer`
+ `qa-lead`: bản trước vi phạm `.claude/rules/design-docs.md` "Edge cases
must explicitly state what happens, not just 'handle gracefully'" ở đúng
kịch bản đáy-đáy bên dưới — nay đã đặc tả tường minh cơ chế trả về, theo
quyết định người dùng tại `/design-review`.)*

Vì `C` (Công thức #4) chỉ là chặn kỳ vọng (dùng giá trị TRUNG BÌNH
`avg_turn_tokens`/`avg_fact_tokens`), World Memory PHẢI đo token THỰC TẾ
của Khung ngữ cảnh AI ngay tại thời điểm dựng prompt (không phải ước tính
qua `avg_*`). Nếu `context_size` thực đo vượt một ngân sách cứng
`ai_context_hard_token_budget`, áp dụng thứ tự cắt bớt sau cho tới khi
dưới ngân sách hoặc hết nước đi (xem "Mệnh đề dừng" bên dưới):

1. Cắt lượt CŨ NHẤT trong recency window trước (giữ nguyên văn các lượt
   mới hơn) — **KHÔNG BAO GIỜ cắt xuống dưới `recency_window_turns = 1`**
   (sàn tuyệt đối, Core Rule #5 — lượt duy nhất có thể undo luôn phải giữ
   nguyên văn, bất kể ngân sách token).
2. Nếu vẫn vượt ngân sách sau khi recency window đã ở sàn 1 lượt: cắt fact
   có `importance_tier` THẤP NHẤT trước (tier 0 trước, tier 3 sau cùng),
   trong cùng tier thì cắt fact `world_time` CŨ NHẤT trước — nhất quán với
   thứ tự ưu tiên của chính `top_K` (Công thức #3), chỉ đảo ngược hướng
   chọn (từ "chọn K tốt nhất" thành "cắt bớt từ tệ nhất").

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Ngân sách token cứng | `ai_context_hard_token_budget` | int | > 0 (registry) | Trần token tuyệt đối cho 1 prompt, do `ai-llm-integration-layer.md` cấp (giá trị phụ thuộc model AI đang dùng) — KHÔNG phải tuning knob riêng của GDD này |
| Kích thước đo THẬT | `context_size_measured` | int | ≥ 0 | Token thực đo (khác `context_size(prompt)` kỳ vọng của Công thức #4 — số đo thật, không phải ước tính qua `avg_*`) |
| Cờ vượt ngân sách | `over_budget` | bool | {0,1} | 1 = đã cắt hết nước đi (sàn recency=1 + fact=0) mà vẫn vượt `ai_context_hard_token_budget`; 0 = đã đưa `context_size_measured` xuống dưới ngân sách (có thể phải cắt 0 bước nếu vốn đã dưới) |

**Mệnh đề dừng (termination)**: thuật toán 2 bước trên LUÔN kết thúc sau
hữu hạn bước, vì mỗi bước cắt giảm nghiêm ngặt 1 trong 2 đại lượng hữu hạn
(số lượt trong recency window, số fact còn lại trong `entities_in_scope`)
và không bao giờ tăng lại — không có vòng lặp vô hạn. Nhưng **kết thúc
không đồng nghĩa với "dưới ngân sách"**: điểm dừng thật sự là khi CẢ HAI
đại lượng đã chạm sàn cứng của chúng (recency = 1 lượt, fact = 0) — tại đó
thuật toán DỪNG bất kể `context_size_measured` khi đó có còn vượt ngân
sách hay không, vì không còn bước cắt nào hợp lệ để thử tiếp (Core Rule #5
cấm cắt recency xuống dưới 1; cắt fact xuống dưới 0 là vô nghĩa).

**Cơ chế trả về khi `over_budget=1` (kịch bản "đáy-đáy" — quyết định người
dùng 2026-08-06)**: World Memory KHÔNG throw lỗi. Thao tác "Dựng Khung ngữ
cảnh AI" luôn trả về `{context, over_budget}` — nhất quán với tinh thần
"operation đọc không throw dạng sai trạng thái" đã xuyên suốt GDD này
(AC-07). Khi `over_budget=1`, `context` là kết quả ĐÃ CẮT TỐI ĐA có thể
(sàn recency=1 lượt, fact=0) — vẫn là dữ liệu hợp lệ, chỉ là vượt ngân
sách đã biết trước; `ai-llm-integration-layer.md` (owner thật của
`ai_context_hard_token_budget`) tự quyết định làm gì với cờ đó (chấp nhận
gửi vượt ngân sách, cảnh báo, hay có model fallback riêng) — World Memory
không áp đặt hành vi đó, chỉ đảm bảo caller LUÔN biết được tình trạng qua
`over_budget` thay vì âm thầm gửi 1 prompt vượt ngân sách mà không ai hay.

Lượt/fact bị cắt bởi Runtime Hard Clamp KHÔNG bị xóa khỏi Nhật ký đầy đủ/
kho fact (khác hẳn Undo) — chỉ đơn giản không được đưa vào ĐÚNG prompt đó,
y hệt cách `top_K` đã hoạt động. `ai-llm-integration-layer.md` là nơi
thực sự sở hữu `ai_context_hard_token_budget` — World Memory chỉ tiêu thụ
ngân sách đó và biết cách cắt theo đúng thứ tự ưu tiên trên; đây là
dependency đã khai ở Dependencies bên dưới. *(Lưu ý còn TREO, chưa đóng
được ở vòng review này — xem Open Questions: `ai_context_hard_token_budget`
hiện KHÔNG tồn tại ở bất kỳ đâu trong `ai-llm-integration-layer.md` hay
registry `entities.yaml`; GDD này chỉ khai yêu cầu, việc định nghĩa giá trị
thật thuộc phạm vi GDD kia, cần xin phép riêng để sửa.)*

**Trường hợp biên** *(gộp chung cho Công thức #4 và #5 — 2 công thức này
tách biệt về định nghĩa nhưng cùng giải quyết 1 cờ HIGH-RISK, nên chia sẻ
1 danh sách biên duy nhất thay vì tách đôi)*:
- **Kịch bản "đáy-đáy" (`over_budget=1`)**: `recency_window_turns` đã ở
  sàn 1 lượt (bước 1 hết nước đi) VÀ mọi fact trong `entities_in_scope`
  đã bị cắt về 0 (bước 2 hết nước đi), NHƯNG chính 1 lượt bắt buộc-giữ đó
  (VD `narration_text` dài bất thường) tự nó đã vượt
  `ai_context_hard_token_budget` — đây là điểm DỪNG thật của mệnh đề dừng
  ở trên, không phải một trường hợp "quên xử lý". THEN: trả về
  `{context: <đúng 1 lượt đó, 0 fact>, over_budget: true}` theo cơ chế ở
  trên — không throw, không cắt tiếp (không còn gì để cắt).
- **Zero cost AI**: bước dựng Công thức #1–#5 là 100% rule-based,
  `calls_per_turn` (registry: `ai_call_budget_per_turn`, trần
  `calls_per_turn_max = 3`) KHÔNG bị ảnh hưởng — các công thức này chạy
  TRƯỚC khi có bất kỳ lệnh gọi AI nào trong lượt, đóng góp 0 vào
  `calls_per_turn`. Ranh giới với `ai_call_timeout_seconds = 30`: vì
  không có network I/O, bước nén/chọn fact không có rủi ro timeout — nếu
  triển khai thực tế cho thấy bước này chậm (VD: kho fact quá lớn khiến
  truy vấn `top_K` chậm), đó là vấn đề hiệu năng cục bộ của World Memory,
  không tính vào ngân sách 30s của lệnh gọi AI.
- `world_time = 0`: `entities_in_scope` chỉ có nhân vật chính (chưa gặp
  NPC nào) → `context_size` = `1 × avg_turn_tokens` (chỉ 1 lượt duy nhất
  tồn tại), thấp hơn cả hằng số C — chặn trên vẫn đúng (bất đẳng thức,
  không phải đẳng thức).
- Số NPC THỰC TẾ trong game vượt xa `max_entities_per_prompt` (VD: 50 NPC
  đã từng xuất hiện, nhưng 1 cảnh chỉ có 3 NPC): `entities_in_scope` chỉ
  lấy 3 NPC có mặt + "global" = 4, KHÔNG lấy cả 50 — việc "NPC nào có mặt
  trong cảnh" là trách nhiệm của Situation/Encounter Generation (đã
  Designed), GDD này chỉ tiêu thụ danh sách đó, không tự quyết định.
- **`|entities_in_scope| > max_entities_per_prompt` xảy ra** (VD lỗi cấu
  hình tương lai: `max_entities_per_prompt` bị hạ xuống dưới INVARIANT
  `≥ MAX_NPC_PER_SCENE + 1` — xem Tuning Knobs — mà không đồng bộ với
  `situation-encounter-generation.md`): World Memory KHÔNG tin tưởng mù
  quáng đầu vào — tự áp `top_K(entities_in_scope, key=priority_key_của_
  Situation_Gen, K=max_entities_per_prompt)` làm clamp phòng thủ trước khi
  tính `context_size`, thay vì để bất đẳng thức Công thức #4 vỡ âm thầm.
  Đây là lớp phòng thủ bổ sung — không thay thế INVARIANT cấu hình đã
  khai, chỉ đảm bảo hệ này không sụp đổ nếu invariant đó bị vi phạm.

## Edge Cases

- **Nếu 1 lượt đã rời cửa sổ gần đây (đã bị trích xuất thành fact) — nó
  KHÔNG BAO GIỜ có thể quay lại trạng thái "có thể undo"**: đây là bất
  biến do cấu trúc, không phải luật cần enforce riêng — `recency_window_turns
  ≥ 1` (Core Rule #5) đảm bảo lượt DUY NHẤT có thể undo luôn nằm trong cửa
  sổ; một lượt chỉ rời khỏi cửa sổ khi có lượt MỚI HƠN được xác nhận, mà
  theo `undo_availability_window` (registry), có lượt mới hơn được xác
  nhận đồng nghĩa lượt cũ đã vĩnh viễn mất quyền undo. Hai điều kiện luôn
  đồng bộ, không cần đồng bộ hóa thủ công.
- **Khung ngữ cảnh AI là hàm xác định (deterministic) trên Nhật ký đầy đủ
  — NHƯNG việc tái tạo không còn là đường đi mặc định** *(sửa 2026-08-06,
  xem Core Rule #8)*: Persistence/Save System **BẮT BUỘC** serialize Khung
  ngữ cảnh AI kèm save (không còn tùy chọn) — khi load, đọc trực tiếp từ
  save, không tái tạo. Tính deterministic của Công thức #1-#2 vẫn có giá
  trị làm **recovery path** (VD save file cũ thiếu Context View do di trú
  từ trước bản sửa này, hoặc file save bị hỏng phần Context View) — nhưng
  CHỈ đúng (giống hệt bản đã duy trì tăng dần, AC-17) nếu tuning knob
  KHÔNG đổi trong suốt khoảng `world_time` đang tái tạo. Nếu knob đã đổi
  giữa chừng trong khoảng đó, tái tạo bằng recovery path sẽ hồi tố — đây
  là giới hạn ĐÃ BIẾT của riêng đường recovery, không phải của đường vận
  hành bình thường (đọc trực tiếp từ save).
- **Lượt ảnh hưởng NHIỀU entity cùng lúc** (VD: lan truyền Hảo cảm xã hội
  — hành động với NPC A ảnh hưởng cả Hảo cảm của NPC B): xử lý TỰ NHIÊN
  qua Công thức #2 — mỗi field có tín hiệu trong `locked_result` sinh
  đúng 1 fact với entity_id riêng của field đó, không cần logic đặc biệt
  cho trường hợp đa-entity.
- **Field trong `locked_result` không khớp quy ước đặt tên entity_id nào
  đã biết** (lỗi schema từ 1 hệ Feature tương lai): mặc định gán
  `entity_id = "global"` làm fallback an toàn, đồng thời ghi log cảnh báo
  schema để QA rà soát khi author nội dung hệ Feature đó — không phải lỗi
  chặn cứng. *(Đối xứng — bổ sung 2026-08-06: field có KIỂU không khớp 5
  loại `has_signal` hỗ trợ được xử lý cùng triết lý fallback-an-toàn-kèm-
  log-cảnh-báo, xem Formula #2.)*
- **Tải lại game với `world_time` đã rất lớn** (VD: resume phiên chơi cũ,
  world_time=200, `recency_window_turns=5`): không đi qua đường trích
  xuất "1 lượt/lần xác nhận" như vận hành bình thường — cần một bước
  trích xuất HÀNG LOẠT (batch) cho toàn bộ 195 lượt đã nằm ngoài cửa sổ
  tại thời điểm load, chạy 1 lần khi khởi tạo lại Khung ngữ cảnh AI từ
  Nhật ký đầy đủ.
- **Thay đổi tuning knob (`recency_window_turns`, `max_facts_per_entity`,
  `max_entities_per_prompt`) giữa chừng playthrough**: áp dụng CHỈ CHO
  TƯƠNG LAI — không hồi tố trích xuất lại các lượt đã rời cửa sổ theo giá
  trị cũ, không đưa lại vào cửa sổ các lượt đã bị đẩy ra. Tránh hiệu ứng
  "thrashing" dữ liệu khi designer chỉnh tuning knob.
- **NPC đã chết/rời khỏi câu chuyện** (VD: qua Death & Consequence): fact
  của họ KHÔNG bị xóa/purge — vẫn truy vấn được đầy đủ qua entity_id (VD:
  NPC khác nhắc lại chuyện người đã khuất); chỉ Công thức #3 (chọn fact
  cho 1 prompt cụ thể) quyết định có đưa vào ngữ cảnh hiện tại hay không,
  không phải một hành động xóa dữ liệu vĩnh viễn.

## Dependencies

**Phụ thuộc vào (upstream)**:
- **Turn Manager** (Foundation, Approved) — nguồn kích hoạt ghi/xóa turn
  record duy nhất (Core Rule #2); World Memory không tự quyết định khi
  nào có 1 lượt mới.

**Các hệ thống phụ thuộc vào (downstream)**, kèm giao diện dữ liệu cụ thể:
- **Turn Manager** (Foundation, Approved) — đồng thời cũng là CONSUMER:
  đọc Khung ngữ cảnh AI để cung cấp cho lệnh gọi sinh gợi ý/tường thuật
  (quan hệ 2 chiều, cùng dạng đã gặp với Contract Enforcement và AI/LLM
  Integration Layer — xem Open Questions).
- **Mechanic/Narration Contract Enforcement** (Foundation, Approved) —
  World Memory tuân thủ hợp đồng "chỉ lưu `locked_result` +
  `narration_text` đã chốt, không lưu suy luận" mà GDD đó đã khai ở
  Dependencies của chính nó.
- **AI/LLM Integration Layer** (Core, Designed — Pending Review) — tiêu
  thụ Khung ngữ cảnh AI (Cửa sổ gần đây + fact theo entity) để dựng
  prompt cho `narration_call`/`suggestion_call`.
- **NPC Affinity & Relationship, Setting & Canon Integration**
  (Feature/Narrative, Designed 2026-08-03) — đã tiêu thụ giao diện truy
  vấn fact theo `entity_id` (Core Rule #4) đúng như khai; **Situation/
  Encounter Generation** (Narrative, đã Designed) — sẽ truy vấn khi
  được thiết kế.
- **Persistence/Save System** (Core, đã Designed) — đọc/ghi Nhật ký đầy
  đủ VÀ Khung ngữ cảnh AI, **cả hai đều bắt buộc** trong save bundle
  *(sửa 2026-08-06, Core Rule #8 — trước đây Khung ngữ cảnh AI chỉ là
  cache tùy chọn; nay bắt buộc để đóng lỗ hổng hồi tố khi đổi tuning knob
  giữa chừng rồi reload, xem Edge Cases)*. **Cần cập nhật tương ứng ở
  `persistence-save-system.md`** (thêm Khung ngữ cảnh AI vào danh sách
  blob bắt buộc của save bundle) — GDD này chỉ khai yêu cầu, việc sửa file
  đó cần xin phép riêng.
- **AI/LLM Integration Layer** (Core, Designed — Pending Review) —
  chiều ngược MỚI *(sửa 2026-08-06, Formula #4 Runtime Clamp)*: cung cấp
  `ai_context_hard_token_budget` (registry) mà World Memory tiêu thụ để
  biết ngân sách token cứng khi cắt bớt Khung ngữ cảnh AI vượt ước tính
  kỳ vọng — bổ sung cho quan hệ đã khai ở trên (World Memory → AI/LLM
  Integration Layer, cung cấp Context View cho prompt).
- **Core UI/Screen Navigation** (Presentation, Designed) — chiều ngược,
  Mềm (World Memory chạy được không cần UI): tiêu thụ interface phân
  trang `get_turn_page(anchor_turn_id, count, direction)` (mục UI
  Requirements bên dưới) để dựng màn hình Story Log; #15 sở hữu
  `log_page_size`/`log_max_loaded_pages`/`log_prefetch_threshold`, GDD
  này chỉ đảm bảo trả đúng trang được yêu cầu. **Cũng tiêu thụ
  `total_turns()`** *(chốt 2026-08-06, vòng re-review 2 — đóng gap dependency
  "Cứng" đã tồn tại ở `core-ui-screen-navigation.md` dòng 443 từ trước
  nhưng chưa từng được đặc tả ở GDD này: D.3 dùng cho `total_pages`/
  `default_page_index`, D.3b dùng cho `s2_resident_turns`, và làm input cho
  property-test O(1) AC-15/AC-48 của hệ đó)* — xem Public Interface cho
  hợp đồng đầy đủ (đặc biệt: `total_turns() ≠ last_confirmed_turn_id`,
  lệch nhau theo số lần Undo).

*(Cùng dạng phụ thuộc một chiều đã gặp 3 lần trước trong phiên này: Turn
Manager đọc trực tiếp từ World Memory nhưng bảng Systems Enumeration của
`systems-index.md` chỉ ghi chiều "World Memory depends on Turn Manager",
không ghi chiều ngược lại. Sẽ xử lý bằng footnote ở Dependency Map, giống
tiền lệ — xem Open Questions.)*

## Tuning Knobs

| Knob | Default | Safe Range | Ảnh hưởng nếu chỉnh |
|---|---|---|---|
| `recency_window_turns` | 8 *(nâng từ 5, sửa 2026-08-06)* | 1–15 (tối thiểu tuyệt đối = 1, Core Rule #5) | Số lượt gần nhất giữ nguyên văn trong Khung ngữ cảnh AI. Quá thấp (1-2) → AI dễ mất mạch văn liền lạc giữa các lượt liên tiếp, dù vẫn đúng kỹ thuật; quá cao (>15) → tốn token/lượt gọi AI không cần thiết, tiệm cận lại vấn đề context window mà GDD này giải quyết. |
| `max_facts_per_entity` | 8 | 3–20 (0 = vô hiệu hóa tầng fact, KHÔNG khuyến nghị — xem Formula 3 cực hạn) | Số fact gần nhất/entity đưa vào 1 prompt. Quá thấp (<3) → NPC "quên" quá nhanh những sự kiện cũ liên quan đến họ; quá cao (>20) → tốn token, giảm hiệu quả nén dù dữ liệu vẫn đúng. |
| `max_entities_per_prompt` | 4 | **4–8** *(sửa từ 2–8, 2026-08-06)* | Số entity_id (NPC + global) được xét trong 1 prompt. **Sàn cứng = 4, KHÔNG PHẢI sở thích**: `situation-encounter-generation.md` đã LOCK `MAX_NPC_PER_SCENE=3` với lý do tường minh "để đảm bảo `max_entities_per_prompt ≥ 4`" (3 NPC + "global"). Hạ xuống dưới 4 phá vỡ trực tiếp bất đẳng thức chặn trên của Công thức #4 mà KHÔNG hệ nào tự clamp phòng thủ — xem Formula #4 mục "Trường hợp biên". Quá cao (>8) → tốn token cho những NPC ít liên quan đến tình huống hiện tại. |

*(`avg_turn_tokens`, `avg_fact_tokens` trong Formula 4 KHÔNG phải tuning
knob — là giá trị ĐO THỰC NGHIỆM từ dữ liệu thật, không phải giá trị
designer chỉnh tay.)*

**INVARIANT liên-GDD** (sửa 2026-08-06, `/design-review` — `systems-designer`
+ `creative-director`): `max_entities_per_prompt ≥ MAX_NPC_PER_SCENE + 1`
(hằng số `MAX_NPC_PER_SCENE` thuộc `situation-encounter-generation.md`,
"+1" là suất dành cho entity `"global"`). Hai giá trị này PHẢI được đăng
ký cùng lúc vào registry khi `/create-architecture` chạy, giống cảnh báo
đã có cho `card_transition_ms` (#14) và `live_window_turns`/
`CONTENT_EXCHANGE_ESTIMATE` (#15, xem `systems-index.md`). **AC mirror:
AC-33** *(thêm 2026-08-06, vòng re-review 2 — cùng dạng AC-67 của
`core-ui-screen-navigation.md` cho đúng loại invariant liên-GDD này; clamp
phòng thủ khi invariant bị vi phạm: AC-34)*.

## Visual/Audio Requirements

Màn hình Nhật ký câu chuyện áp dụng đúng Visual Identity Anchor "Mực Chưa
Khô" của `game-concept.md`: nền giấy dó kem/trắng ngà, chữ tường thuật
đen-xám đơn sắc, không có khung UI game thông thường — cảm giác như đang
lật một cuốn nhật ký giấy thật. Không cần VFX hay âm thanh riêng cho màn
hình này (thuần đọc văn bản); có thể dùng hiệu ứng lật trang nhẹ khi
chuyển lượt nếu ngân sách polish cho phép, nhưng không bắt buộc ở MVP.

## UI Requirements

**Màn hình Nhật ký câu chuyện (Story Log)**: một màn hình riêng, truy cập
được từ UI chính, hiển thị Nhật ký tường thuật đầy đủ theo đúng thứ tự
`world_time` — người chơi cuộn/lật qua để đọc lại toàn bộ câu chuyện từ
đầu đến lượt hiện tại. Mỗi mục hiển thị đúng `narration_text` (văn xuôi,
không phải log số liệu) kèm một mốc lượt nhỏ (VD: "Lượt 42"); KHÔNG hiển
thị `locked_result` thô hay fact đã trích xuất — những số liệu đó đã có
nơi riêng (Character Card, theo Visual Identity Anchor của
`game-concept.md`), đúng tinh thần Pillar 4 (Tường Thuật Sống Động).

Vì Nhật ký đầy đủ tăng không giới hạn theo thời gian chơi (có thể hàng
trăm/nghìn lượt ở Full Vision), màn hình này bắt buộc phải **tải theo
trang/lazy-load** (không load toàn bộ vào bộ nhớ UI cùng lúc) — đây là yêu
cầu hiệu năng bắt buộc trên di động, không phải tùy chọn polish. Mặc định
mở ra ở lượt gần nhất, có nút "về đầu câu chuyện".

**Interface phân trang (chốt 2026-08-04, đóng Open Question tương ứng của
`core-ui-screen-navigation.md` #15)**: `get_turn_page(anchor_turn_id, count,
direction)` — `direction ∈ {older, newer}`, trả về tối đa `count` turn
record liên tiếp tính từ `anchor_turn_id` theo hướng đó (không bao gồm
chính `anchor_turn_id` nếu nó đã được tải trước đó), cộng cờ `has_more`
(bool) báo còn trang xa hơn theo hướng đó hay không. `count` và ngưỡng tải
trước cụ thể (`log_page_size`, `log_prefetch_threshold`) do #15 sở hữu —
World Memory chỉ đảm bảo trả đúng số lượng yêu cầu, không áp đặt page
size của riêng mình. Dòng "Truy vấn Nhật ký đầy đủ" ở bảng Thao tác phía
trên phản ánh đúng interface này — KHÔNG có đường trả toàn bộ Nhật ký
trong 1 lệnh gọi ở GDD này.

Lượt đã bị Undo (đã xóa khỏi Nhật ký đầy đủ, Core Rule #2) hiển nhiên
không xuất hiện trong màn hình này — không cần xử lý đặc biệt.

📌 **UX Flag — World Memory & Context Management**: Hệ này có yêu cầu UI
thật (màn hình Story Log). Ở Phase 4 (Pre-Production), chạy `/ux-design`
để tạo UX spec cho màn hình này **trước khi** viết epic — story tham
chiếu UI nên trích `design/ux/story-log.md`, không trích thẳng GDD này.

## Acceptance Criteria

*(Đề xuất bởi `qa-lead`. Phần lớn kiểm chứng bằng unit test thuần trên cấu
trúc dữ liệu — hệ này không gọi network, khác với AI/LLM Integration
Layer.)*

**Core Rules**
- **AC-01** (R1): GIVEN một turn record đã ghi vào Nhật ký đầy đủ
  (`turn_id`, `action`, `locked_result`, `narration_text`, `world_time`)
  và lượt đó KHÔNG bị undo, WHEN gọi `get_turn(turn_id)` (Public
  Interface) tại BẤT KỲ thời điểm nào sau đó — kể cả sau khi lượt này
  đã rời khỏi `recency_window_turns` và có bản ghi "sự kiện đã trích
  xuất" tương ứng trong Khung ngữ cảnh AI — THEN `narration_text` và
  `locked_result` trả về giống hệt (byte-for-byte) với lúc ghi ban đầu;
  việc AI Context View bị nén/trích xuất (Core Rule #3) không được phép
  làm thay đổi hay xóa bất kỳ phần nào của Nhật ký đầy đủ. *(Sửa
  2026-08-06: bản gốc dùng cụm "truy vấn Nhật ký đầy đủ theo đúng
  `turn_id`" nhưng chưa từng định nghĩa interface nào cho việc đó —
  `qa-lead` phát hiện gap. Nay đã chốt qua `get_turn(turn_id)`, xem Public
  Interface.)*
- **AC-02** (R2): GIVEN Turn Manager phát sự kiện "lượt N xác nhận và
  không undo", WHEN World Memory nhận sự kiện, THEN đúng 1 turn record
  mới được append vào Nhật ký đầy đủ với đủ 5 field, không ghi trùng cho
  cùng `turn_id`. GIVEN sau đó Turn Manager phát sự kiện "lượt N bị
  undo", WHEN World Memory nhận sự kiện, THEN record của `turn_id=N` bị
  XÓA HOÀN TOÀN khỏi Nhật ký đầy đủ (không phải soft-delete/flag) — truy
  vấn lại `turn_id=N` ngay sau đó trả về "không tồn tại", không trả về
  một bản ghi đã đánh dấu ẩn.
- **AC-03** (R3): GIVEN Khung ngữ cảnh AI được dựng cho 1 prompt, WHEN so
  sánh với Nhật ký đầy đủ tại cùng thời điểm, THEN: (a) mọi lượt trong
  `recency_window_turns` gần nhất xuất hiện NGUYÊN VĂN (đủ `narration_text`
  + `locked_result`); (b) mọi lượt cũ hơn KHÔNG xuất hiện `narration_text`,
  chỉ xuất hiện dưới dạng fact trích xuất từ `locked_result`; (c) GIVEN 2
  lượt A và B có `locked_result` GIỐNG HỆT nhau nhưng `narration_text`
  KHÁC nhau, WHEN cả 2 lượt cùng rời `recency_window_turns` (kích hoạt
  trích xuất), THEN fact trích xuất ra của A và B giống hệt nhau (bỏ qua
  `turn_id`/`world_time`) — chứng minh hàm trích xuất không phụ thuộc
  `narration_text`. *(Sửa 2026-08-06, `qa-lead`: ý (d) bản gốc — "sửa
  `narration_text` SAU KHI đã trích xuất, xác nhận fact không đổi" — test
  sai thứ nó tuyên bố, vì trích xuất chỉ chạy 1 lần tại thời điểm rời cửa
  sổ nên dĩ nhiên không đổi dù code có đọc `narration_text` hay không.
  Thay bằng phép so sánh 2 lượt A/B ở trên, thực sự cô lập được biến
  `narration_text`.)*
- **AC-04** (R4): GIVEN kho fact có ≥2 `entity_id` khác nhau (VD:
  `"bui_lan"` và `"global"`) với số fact khác nhau, WHEN gọi truy vấn
  fact theo 1 `entity_id` cụ thể (VD: `"bui_lan"`), THEN tập kết quả trả
  về CHỈ chứa fact có `entity_id="bui_lan"`, không lẫn fact của entity
  khác — interface truy vấn không yêu cầu bên gọi tự lọc lại từ toàn bộ
  kho fact.
- **AC-05** (R5): GIVEN `recency_window_turns=1` (giá trị sàn tuyệt đối)
  và lượt N vừa xác nhận, WHEN kiểm tra recency window, THEN lượt N (lượt
  DUY NHẤT còn trong cửa sổ Undo theo `undo_availability_window`) vẫn ở
  dạng nguyên văn trong recency window — không có đường xử lý nào hạ nó
  xuống dạng fact chỉ vì "chưa kịp trích xuất" hay vì lý do timing khác.
- **AC-06** (R6): GIVEN cùng 1 turn record, WHEN đọc lại qua
  `get_turn(turn_id)` một lần với backend lưu trữ giả lập KHÔNG nén và
  một lần với backend giả lập CÓ nén vật lý (gzip) ở tầng dưới, THEN 2
  kết quả trả về từ World Memory giống hệt nhau ở nội dung logic
  (`turn_id`, `action`, `locked_result`, `narration_text`, `world_time`)
  — chứng minh việc World Memory trả gì cho caller KHÔNG phụ thuộc lựa
  chọn nén vật lý của Persistence, tức 2 tầng thực sự tách biệt. *(Sửa
  2026-08-06, `qa-lead`: bản gốc chỉ test "gzip round-trip giữ nguyên nội
  dung" — đây là tính chất toán học của gzip, không chạm pipeline thật
  của World Memory, PASS ngay cả khi World Memory có bug nghiêm trọng.
  Bản sửa test đúng ranh giới trách nhiệm mà Core Rule #6 thực sự tuyên
  bố, qua interface công khai `get_turn`.)*
- **AC-07** (R7): Với từng trường hợp sau, operation tương ứng PHẢI trả
  kết quả hợp lệ dựa THUẦN TÚY trên dữ liệu hiện có, KHÔNG throw lỗi dạng
  "sai trạng thái/sai thứ tự": (a) GIVEN chưa có bất kỳ turn record nào
  từng được ghi (`world_time=0`), WHEN gọi bất kỳ operation đọc nào
  (`get_turn_page`, `get_turn`, `get_processing_state`,
  `get_facts_by_entity`, Dựng Khung ngữ cảnh AI), THEN trả tập rỗng/
  `not_found` tùy interface, không throw; (b) GIVEN Undo 1 `turn_id`
  CHƯA TỪNG tồn tại (chưa ghi, hoặc đã bị undo trước đó), WHEN xử lý sự
  kiện Undo đó, THEN no-op, không throw "not found"; (c) GIVEN `turn_id=N`
  bị Undo 2 LẦN LIÊN TIẾP (double-undo, mô phỏng lỗi delivery sự kiện từ
  Turn Manager), WHEN xử lý lần Undo thứ 2, THEN no-op, không throw "đã
  undo rồi"; (d) GIVEN `anchor_turn_id` của `get_turn_page` không còn tồn
  tại (đã bị Undo), WHEN gọi, THEN áp dụng hành vi "mốc ảo" đã chốt ở
  Public Interface — không throw; (e) GIVEN gọi "Dựng Khung ngữ cảnh AI"
  NGAY SAU 1 lần Undo (không có lượt Ghi nào xen giữa), WHEN dựng, THEN
  không throw, kết quả nhất quán với Nhật ký đầy đủ SAU Undo. *(Sửa
  2026-08-06, `qa-lead`: bản gốc chỉ test case (a) — không đủ mạnh để hỗ
  trợ tuyên bố phủ định phổ quát "không có state machine". Đây là phát
  biểu không thể "chứng minh" bằng hữu hạn test case, chỉ có thể làm suy
  yếu bằng cách không tìm ra phản chứng qua 1 tập trường hợp cụ thể — 5
  case trên là tập đó. Lưu ý: `turn_id` KHÔNG bao giờ được tái sử dụng
  sau khi bị Undo — mỗi `turn_id` do Turn Manager cấp phát tăng đơn điệu,
  không lặp lại, đây là bất biến của chính `turn-manager.md`, không phải
  điều GDD này cần enforce riêng.)*

**Formulas**
- **AC-08** (F1): GIVEN `last_confirmed_turn_id=20` và
  `recency_window_turns=5`, WHEN tính `in_window(turn_id)` cho
  `turn_id∈{15,16,17,18,19,20}`, THEN `in_window(15)=false` và
  `in_window(16..20)=true` đúng theo công thức; và `turn_id_falls_out =
  20−5 = 15` khớp ví dụ minh họa trong Formulas. GIVEN lượt 21 xác nhận
  tiếp theo (`last_confirmed_turn_id'=21`), WHEN so sánh trạng thái
  `in_window` trước/sau, THEN đúng 1 `turn_id` (=16) chuyển từ
  true→false — không có `turn_id` thứ 2 nào đổi trạng thái trong cùng
  lượt xác nhận (không xử lý hàng loạt ở steady-state).
- **AC-09** (F1): GIVEN `last_confirmed_turn_id=1` (lượt đầu tiên của
  game) và `recency_window_turns=5`, WHEN tính `turn_id_falls_out`, THEN
  kết quả = 1−5 = −4 <1, guard `turn_id_falls_out ≥ 1` ngăn mọi trích
  xuất — không có fact nào được tạo, không lỗi. GIVEN
  `recency_window_turns=1` và lượt N bất kỳ (N≥2) vừa xác nhận, WHEN
  tính `turn_id_falls_out`, THEN = N−1 (lượt ngay trước) bị trích xuất
  ngay lập tức — không có vùng đệm nguyên văn nào khác ngoài lượt N.
  GIVEN lượt N bị undo (không phải rời cửa sổ tự nhiên), WHEN kiểm tra,
  THEN việc xóa record của lượt N đi qua đường Core Rule #2 (AC-02),
  KHÔNG kích hoạt trích xuất fact cho lượt N qua Công thức #1.
- **AC-10** (F2): GIVEN `locked_result = {hp_delta: −15,
  affinity_delta_bui_lan: +2, mana_delta: 0, canon_break_flag: null}` của
  lượt 15, WHEN tính `has_signal` cho từng field, THEN
  `has_signal(hp_delta)=true`, `has_signal(affinity_delta_bui_lan)=true`,
  `has_signal(mana_delta)=false` (numeric=0),
  `has_signal(canon_break_flag)=false` (event=null) —
  `facts_extracted(15) = 2`, đúng khớp ví dụ minh họa; 2 fact record sinh
  ra có `entity_id`, `field_name`, `field_value`, `turn_id=15`,
  `world_time` đúng tương ứng, với `entity_id` của
  `affinity_delta_bui_lan` suy ra là `"bui_lan"`. GIVEN F = tổng số field
  cố định trong schema `locked_result`, WHEN kiểm tra bất kỳ turn nào,
  THEN `facts_extracted(turn)` luôn nằm trong `[0, F]`, không bao giờ
  vượt F.
- **AC-10b** (F2 — nhánh DƯƠNG string/array, mới thêm 2026-08-06 vòng
  re-review 2): GIVEN `locked_result = {battle_result_bui_lan: "victory",
  witnesses_bui_lan: ["npc_a", "npc_b"], canon_break_flag: null}` của 1
  lượt (mô phỏng đúng field enum `battle_result_[char]` mà
  `setting-canon-integration.md` D.5 tier 1 dùng làm rule khớp — lý do
  chính đã dùng để biện minh việc thêm 2 nhánh `string(f)`/`array(f)` vào
  `has_signal` ở vòng review 1), WHEN tính `has_signal` cho từng field,
  THEN `has_signal(battle_result_bui_lan)=true` (string non-empty),
  `has_signal(witnesses_bui_lan)=true` (array non-empty, `|value|=2>0`),
  `has_signal(canon_break_flag)=false` — `facts_extracted=2`, sinh đúng 2
  fact record. *(Sửa 2026-08-06 — `qa-lead` phát hiện: AC-10 gốc và AC-11
  chỉ test numeric/event và nhánh ÂM của string/array (rỗng) — nhánh
  DƯƠNG, chính kịch bản dùng để biện minh sửa công thức, chưa từng được
  chứng minh bằng AC nào trước bản sửa này.)*
- **AC-11** (F2): GIVEN 1 lượt thuần hội thoại (mọi field numeric=0,
  boolean=false, event=null, string="" hoặc null, array rỗng), WHEN lượt
  đó rời `recency_window_turns`, THEN `facts_extracted(turn)=0` VÀ
  `get_processing_state(turn_id)` (Public Interface) trả về
  `{processed=true, fact_count=0}` — phân biệt rõ với `{processed=false}`
  của 1 `turn_id` chưa rời cửa sổ. GIVEN lượt 0-fact đó tiếp tục nằm
  ngoài `recency_window_turns`, WHEN dựng Khung ngữ cảnh AI, THEN không
  còn dấu vết nào của lượt đó (không `narration_text`, không fact) —
  trong khi Nhật ký đầy đủ (theo AC-01) vẫn giữ nguyên văn đầy đủ của
  lượt đó. *(Sửa 2026-08-06: bản gốc giả định 1 interface truy vấn trạng
  thái xử lý chưa từng được định nghĩa — `qa-lead` phát hiện gap, nay đã
  chốt qua `get_processing_state`, xem Public Interface.)*
- **AC-12** (F3): GIVEN `entity_id="bui_lan"` đã tích lũy 23 fact qua
  nhiều phiên chơi (trong đó có 1 fact `importance_tier=3` ở `world_time`
  cũ, còn lại đều `importance_tier` thấp hơn) và `max_facts_per_entity=8`,
  WHEN gọi `selected_facts("bui_lan")`, THEN trả về đúng 8 fact theo key
  `(importance_tier DESC, world_time DESC, fact_id ASC)` — LUÔN bao gồm
  fact `tier=3` (đứng đầu do tier cao nhất, bất kể `world_time` của nó cũ
  đến đâu), 7 suất còn lại lấp bằng fact `world_time` mới nhất trong số
  các fact tier thấp hơn; `|selected_facts(entity_id)| ≤ 8` luôn đúng bất
  kể tổng fact tăng lên 50, 100, hay nhiều hơn qua các phiên chơi sau.
  *(Sửa 2026-08-06, vòng re-review 2 — `qa-lead` phát hiện: bản trước chỉ
  nói "8 fact có `world_time` lớn nhất", đúng với công thức CŨ (trước sửa
  vòng 1) nhưng mâu thuẫn với AC-17 — vốn đã dùng đúng key 3 cấp hiện
  hành. Nay đồng bộ 2 AC.)*
- **AC-13** (F3): GIVEN `entity_id` mới xuất hiện chỉ có 3 fact và
  `max_facts_per_entity=8`, WHEN gọi `selected_facts`, THEN trả về đúng
  cả 3 fact, không có fact giả/padding, không lỗi. GIVEN `entity_id` hợp
  lệ nhưng chưa từng xuất hiện trong bất kỳ lượt nào
  (`facts(entity_id)=∅`), WHEN gọi `selected_facts(entity_id)`, THEN trả
  về tập rỗng, KHÔNG throw exception. GIVEN `max_facts_per_entity=0`
  (cực hạn hợp lệ), WHEN gọi `selected_facts` cho bất kỳ `entity_id`
  nào, THEN luôn trả về tập rỗng — hợp lệ về công thức (dù là cấu hình
  không khuyến nghị, xem Tuning Knobs).
- **AC-14** (F4): GIVEN `recency_window_turns=5`, `avg_turn_tokens=350`,
  `max_entities_per_prompt=4`, `max_facts_per_entity=8`,
  `avg_fact_tokens=15`, WHEN tính C theo công thức chặn trên, THEN `C =
  5×350 + 4×8×15 = 2230`, khớp ví dụ minh họa. GIVEN 2 kho dữ liệu giả
  lập đại diện `world_time=500` và `world_time=50000` (cùng bộ tuning
  knob trên, chỉ khác số lượt/fact đã tích lũy), WHEN tính
  `context_size(prompt)` tại cả 2 thời điểm, THEN cả 2 giá trị đều ≤
  C=2230 — chứng minh `context_size` không tăng theo `world_time` (O(1)),
  dù dữ liệu thô (Nhật ký đầy đủ + kho fact) tại `world_time=50000` lớn
  hơn hẳn `world_time=500`.
- **AC-15** (F4): GIVEN việc dựng Khung ngữ cảnh AI qua Công thức #1–#4,
  WHEN đếm `calls_per_turn` bằng mock/spy trước và sau bước dựng, THEN
  không đổi (0 lệnh gọi AI phát sinh) — độc lập với `ai_call_budget_per_turn`
  (trần `calls_per_turn_max=3`) và không có rủi ro chạm
  `ai_call_timeout_seconds=30` vì không có network I/O trong bước này.
  GIVEN `world_time=0` (chỉ 1 lượt duy nhất từng xác nhận, chưa gặp NPC
  nào), WHEN tính `context_size`, THEN = `1×avg_turn_tokens` — nhỏ hơn C,
  bất đẳng thức `context_size≤C` vẫn đúng (không phải đẳng thức bắt
  buộc). GIVEN 50 NPC đã từng xuất hiện trong game nhưng cảnh hiện tại
  chỉ có 3 NPC + `"global"` và `max_entities_per_prompt=4`, WHEN tính
  `entities_in_scope`, THEN `|entities_in_scope|=4` (3 NPC có mặt +
  global), KHÔNG lấy cả 50 NPC.

**Edge Cases**
- **AC-16** (lượt đã rời cửa sổ không bao giờ undo-eligible trở lại):
  GIVEN `turn_id=15` đã rời `recency_window_turns` (đã có fact trích
  xuất tương ứng), WHEN kiểm tra `undo_available(15)` qua các thứ tự sự
  kiện đại diện sau xảy ra SAU thời điểm đó — (1) undo được gọi ngay lập
  tức cho `turn_id=15`; (2) có thêm 10 lượt mới xác nhận rồi mới thử undo
  `turn_id=15`; (3) undo được gọi 2 lần liên tiếp cho `turn_id=15` (double-
  undo, xem AC-07c) — THEN cả 3 trường hợp đều trả `undo_available(15)
  =false` — không có tình huống nào khiến `turn_id=15` vừa "đã trích xuất
  thành fact" vừa "còn undo-eligible" cùng lúc (bất biến cấu trúc). *(Sửa
  2026-08-06, `qa-lead`: bản gốc nói "thử mọi thứ tự sự kiện có thể xảy
  ra" — không thể test hết theo nghĩa đen; thay bằng tập hữu hạn đại diện
  ở trên.)*
- **AC-17** (Khung ngữ cảnh AI tái tạo lại được — recovery path): GIVEN 1
  Nhật ký đầy đủ cố định VÀ tuning knob (`recency_window_turns`,
  `max_facts_per_entity`, `max_entities_per_prompt`) KHÔNG đổi trong suốt
  khoảng `world_time` đang xét, **VÀ không có bất kỳ Undo nào xảy ra SAU
  thời điểm 1 lượt đã rời cửa sổ trong khoảng đó** *(điều kiện loại trừ
  thêm 2026-08-06, vòng re-review 2 — xem AC-32 và Formula #1 "Trường hợp
  biên": nếu có Undo tác động đến `last_confirmed_turn_id` SAU KHI 1 lượt
  cũ hơn đã evict, đường tái tạo bằng công thức thuần túy có thể cho kết
  quả SAI khác với bản sống — AC-17 KHÔNG bao phủ trường hợp đó)* (không
  có Khung ngữ cảnh AI được lưu riêng kèm theo — VD save file di trú từ
  trước Core Rule #8), WHEN chạy Công
  thức #1, #2, #3 để dựng lại Khung ngữ cảnh AI từ đầu, THEN kết quả
  (recency window + fact theo `entity_id`, đã sắp theo `(importance_tier
  DESC, world_time DESC, fact_id ASC)`) giống hệt Khung ngữ cảnh AI đã
  được duy trì tăng dần từng lượt một trong suốt playthrough — chứng minh
  tính xác định (deterministic) của quá trình dựng lại. *(Sửa 2026-08-06:
  đường vận hành bình thường KHÔNG còn đi qua tái tạo — Core Rule #8 bắt
  buộc Persistence lưu trực tiếp Khung ngữ cảnh AI; AC này giờ chỉ kiểm
  chứng recovery path, với điều kiện "knob không đổi giữa chừng" ghi rõ ở
  GIVEN — xem AC-21b cho case knob CÓ đổi.)*
- **AC-18** (lượt ảnh hưởng nhiều entity cùng lúc): GIVEN `locked_result`
  của 1 lượt có ≥2 field mang tín hiệu với `entity_id` khác nhau (VD:
  `affinity_delta_bui_lan` và `affinity_delta_ai_khac` cùng ≠0, mô phỏng
  lan truyền Hảo cảm xã hội), WHEN chạy hàm trích xuất fact, THEN sinh ra
  đúng 2 fact record riêng biệt với `entity_id` tương ứng của từng field
  — không có field nào bị gộp sai entity hay bị bỏ sót. GIVEN thêm 1 turn
  khác chỉ ảnh hưởng 1 entity duy nhất, WHEN so sánh 2 lần chạy, THEN kết
  quả nhất quán về cấu trúc (1 fact/field có tín hiệu, bất kể số entity
  bị ảnh hưởng trong 1 turn) — kiểm chứng qua OUTPUT quan sát được, không
  qua việc đọc code. *(Sửa 2026-08-06, `qa-lead`: bỏ cụm "CÙNG 1 hàm...
  không code riêng" của bản gốc — đây là ràng buộc về cấu trúc
  implementation, một test hộp đen không thể xác nhận "có phải cùng 1
  hàm hay không" chỉ từ input/output; thuộc phạm vi code review lúc
  implement, không phải AC.)*
- **AC-19** (field không khớp quy ước `entity_id`): GIVEN `locked_result`
  chứa 1 field có tên không khớp bất kỳ quy ước đặt tên `entity_id` nào
  đã biết (mô phỏng lỗi schema từ 1 hệ Feature tương lai), WHEN chạy
  trích xuất fact, THEN field đó được gán `entity_id="global"` làm
  fallback, HỆ THỐNG KHÔNG throw lỗi cứng/không dừng xử lý lượt, và có 1
  bản ghi log cảnh báo schema được tạo ra để QA rà soát sau.
- **AC-20** (tải save với `world_time` đã rất lớn): GIVEN 1 save file có
  `world_time=200` và `recency_window_turns=5`, được tải lần đầu (chỉ có
  Nhật ký đầy đủ, không có Khung ngữ cảnh AI tăng dần từ trước), WHEN
  khởi tạo lại Khung ngữ cảnh AI sau khi load, THEN hệ thống chạy 1 lượt
  trích xuất HÀNG LOẠT cho toàn bộ 195 lượt (`turn_id` 1–195) đang nằm
  ngoài cửa sổ tại thời điểm này (thay vì "1 lượt/lần xác nhận" như vận
  hành bình thường), và kết quả fact tổng hợp giống hệt như khi trích
  xuất tuần tự từng lượt một; `turn_id` 196–200 vẫn ở dạng nguyên văn
  trong recency window sau khi load xong.
- **AC-21a** (thay đổi tuning knob giữa chừng, KHÔNG reload — đường vận
  hành bình thường): GIVEN `recency_window_turns` đổi từ 5 → 10 (hoặc
  `max_facts_per_entity`/`max_entities_per_prompt` đổi) tại
  `world_time=100` TRONG CÙNG PHIÊN CHƠI đang chạy (không save/reload
  giữa chừng), WHEN kiểm tra các lượt `turn_id` 90–95 đã bị trích xuất
  thành fact TRƯỚC thời điểm đổi (dưới giá trị `recency_window_turns=5`
  cũ), THEN chúng KHÔNG được tự động đưa trở lại dạng nguyên văn trong
  recency window dù giá trị mới (10) đáng lẽ còn giữ chúng trong cửa sổ
  nếu áp dụng từ đầu — giá trị mới chỉ áp dụng cho các lượt xác nhận SAU
  thời điểm đổi.
- **AC-21b** (thay đổi tuning knob giữa chừng RỒI save/reload — Core Rule
  #8, thêm 2026-08-06): GIVEN cùng kịch bản AC-21a, nhưng NGAY SAU khi
  đổi knob (trước khi có lượt mới nào xác nhận tiếp), người chơi save và
  reload, WHEN Persistence load lại save (đọc trực tiếp Khung ngữ cảnh AI
  đã serialize theo Core Rule #8, KHÔNG tái tạo từ Nhật ký đầy đủ), THEN
  trạng thái Khung ngữ cảnh AI sau khi load giống hệt trạng thái ngay
  trước khi save (turn_id 90-95 vẫn là fact, KHÔNG quay lại nguyên văn) —
  chứng minh save/reload không tạo ra hồi tố mà đường tái tạo cũ (AC-17,
  nay chỉ còn là recovery path) sẽ mắc phải nếu áp dụng sai ngữ cảnh này.
- **AC-22** (NPC đã chết/rời câu chuyện): GIVEN NPC `"bui_lan"` đã chết
  qua Death & Consequence tại 1 lượt trước đó, WHEN truy vấn fact theo
  `entity_id="bui_lan"` ở bất kỳ thời điểm nào sau đó, THEN vẫn trả về
  đầy đủ toàn bộ fact đã tích lũy của NPC đó trước khi chết (không bị
  purge/xóa). GIVEN 1 prompt hiện tại không có `"bui_lan"` trong
  `entities_in_scope`, WHEN dựng Khung ngữ cảnh AI, THEN Công thức #3
  chỉ đơn giản không chọn fact của `"bui_lan"` cho prompt NÀY — không
  phải một hành động xóa dữ liệu vĩnh viễn.

**Public Interface** *(nhóm AC mới, thêm 2026-08-06 — `qa-lead` phát hiện
`get_turn_page` là dependency "Cứng" của `core-ui-screen-navigation.md`
nhưng không có AC nào kiểm chứng, dù interface này đã "chốt" từ trước)*

- **AC-23** (get_turn_page — direction=older, trường hợp thường): GIVEN
  Nhật ký đầy đủ có `turn_id` liên tục 1..50 (không lượt nào bị Undo),
  WHEN gọi `get_turn_page(anchor_turn_id=30, count=5, direction=older)`,
  THEN trả về đúng 5 record `turn_id ∈ {25,26,27,28,29}`, KHÔNG bao gồm
  `turn_id=30`, `has_more=true` (còn 1-24).
- **AC-24** (get_turn_page — direction=newer, chạm đáy lịch sử): GIVEN
  cùng dữ liệu AC-23, WHEN gọi `get_turn_page(anchor_turn_id=47, count=10,
  direction=newer)`, THEN trả về đúng 3 record `turn_id ∈ {48,49,50}`
  (không đủ 10, KHÔNG throw lỗi vì thiếu), `has_more=false`.
- **AC-25** (get_turn_page — anchor không tồn tại, mốc ảo): GIVEN Nhật ký
  đầy đủ có `turn_id` 1..50, và `turn_id=30` đã bị Undo TRƯỚC ĐÓ (không
  còn tồn tại), WHEN gọi `get_turn_page(anchor_turn_id=30, count=5,
  direction=older)`, THEN KHÔNG throw — coi `anchor_turn_id=30` như mốc
  thời gian ảo, trả về 5 record gần mốc đó nhất theo hướng `older` trong
  số các `turn_id` CÒN TỒN TẠI (VD nếu 29 và 28 vẫn còn, bắt đầu từ đó) —
  khớp quyết định 2026-08-06 ở Public Interface.
- **AC-26** (get_turn_page — count vượt quá toàn bộ log): GIVEN Nhật ký
  đầy đủ chỉ có 3 record (`turn_id` 1,2,3), WHEN gọi
  `get_turn_page(anchor_turn_id=3, count=100, direction=older)`, THEN trả
  về đúng 2 record (`turn_id` 1,2 — không đủ 100), `has_more=false`,
  KHÔNG throw vì thiếu.

**Tích hợp & Runtime Clamp** *(nhóm AC mới, thêm 2026-08-06)*

- **AC-27** (tích hợp — thao tác "Ghi turn record" là nguyên tử): GIVEN
  Nhật ký đầy đủ rỗng, `recency_window_turns=5`, WHEN xác nhận tuần tự 20
  lượt qua ĐÚNG operation công khai "Ghi turn record" (không gọi thẳng
  Công thức #1/#2 riêng lẻ), THEN sau lượt thứ 20: Nhật ký đầy đủ có đủ
  20 record; recency window chứa nguyên văn đúng `turn_id` 16-20; kho
  fact chứa fact trích xuất cho `turn_id` 1-15, nội dung khớp Công thức
  #2 áp cho từng lượt tương ứng — xác nhận trích xuất được kích hoạt TỰ
  ĐỘNG như một phần của thao tác ghi, không phải bước rời rạc caller phải
  tự gọi thêm.
- **AC-28** (Formula #5 — vượt ngân sách token cứng, cắt được đủ): GIVEN
  `ai_context_hard_token_budget=2000`, `recency_window_turns=5`
  (`avg_turn_tokens=350` → 1750 token cho recency window), kho fact của
  `entities_in_scope` có tổng 5 fact ước ~15 token/fact (3 tier 0, 1 tier
  1, 1 tier 2) khiến `context_size_measured=2050` (vượt 50 token), WHEN
  dựng Khung ngữ cảnh AI, THEN hệ thống cắt ĐÚNG 4 fact tier THẤP NHẤT
  trước (3 tier 0 rồi tới tier 1, giữ lại đúng 1 fact tier 2 — fact cao
  nhất) theo thứ tự ưu tiên Formula #5, dừng cắt ngay khi
  `context_size_measured ≤ 2000`, trả về `{context, over_budget: false}`;
  recency window KHÔNG bị chạm tới (vẫn nguyên 5 lượt) vì bước 2 (cắt
  fact) đã đủ để xuống dưới ngân sách. *(Sửa 2026-08-06, vòng re-review 2
  — `qa-lead` phát hiện: bản trước dùng câu trừu tượng "cắt bớt theo ĐÚNG
  thứ tự ưu tiên" không kèm số liệu cụ thể để dựng test case, khác hẳn
  phong cách số liệu cụ thể của các AC còn lại trong tài liệu này — nay
  bổ sung ví dụ số.)*
- **AC-28b** (Formula #5 — kịch bản "đáy-đáy", mới thêm 2026-08-06 vòng
  re-review 2): GIVEN `recency_window_turns` đã ở sàn 1 lượt (Core Rule
  #5) VÀ mọi fact của `entities_in_scope` đã bị cắt về 0 (cả 2 bước của
  Formula #5 đã hết nước đi), NHƯNG chính 1 lượt bắt buộc-giữ đó có
  `narration_text` giả lập dài bất thường khiến
  `context_size_measured=5000 > ai_context_hard_token_budget=2000`, WHEN
  dựng Khung ngữ cảnh AI, THEN hệ thống KHÔNG throw, KHÔNG cắt tiếp (Core
  Rule #5 cấm cắt recency dưới 1, không còn fact nào để cắt), trả về
  `{context: <đúng 1 lượt đó, 0 fact>, over_budget: true}` — caller
  (`ai-llm-integration-layer.md`) nhận được cờ `over_budget=true` tường
  minh thay vì âm thầm gửi 1 prompt vượt ngân sách hoặc nhận lỗi không rõ
  nguồn gốc. GIVEN lượt/fact bị cắt bởi Formula #5 (cả AC-28 lẫn AC-28b),
  WHEN truy vấn lại Nhật ký đầy đủ/kho fact qua Public Interface, THEN
  chúng VẪN CÒN NGUYÊN (Formula #5 chỉ ảnh hưởng 1 prompt cụ thể, không
  xóa dữ liệu gốc — khác hẳn Undo).

**Bổ sung — vòng re-review 2 (2026-08-06)** *(nhóm AC mới, đóng các gap
`total_turns`, `get_facts_by_entity`, `has_signal` fallback, `in_window`
one-way, INVARIANT mirror — phát hiện bởi `qa-lead`/`systems-designer`)*

- **AC-29** (Public Interface — `total_turns()` không cắt/không đảo với
  `last_confirmed_turn_id`): GIVEN 1 slot đã xác nhận 100 lượt trong đó có
  đúng 3 lượt bị Undo (`turn_id` không tái sử dụng), WHEN gọi
  `total_turns()`, THEN trả về `97` (KHÔNG PHẢI `100` — chứng minh
  `total_turns() ≠ last_confirmed_turn_id=100`). GIVEN slot vừa "Bắt đầu
  mới" (`world_time=0`), WHEN gọi `total_turns()`, THEN trả về `0`, KHÔNG
  throw. GIVEN 20 lượt xác nhận tuần tự không Undo, WHEN đo số lần truy
  cập/duyệt Nhật ký đầy đủ nội bộ mỗi lần `total_turns()` được gọi (spy),
  THEN không tăng theo số lượt đã có (O(1) — counter duy trì, không phải
  phép quét lại toàn bộ).
- **AC-30** (Public Interface — `get_facts_by_entity` KHÔNG cắt theo
  `max_facts_per_entity`, đối chứng với `selected_facts`): GIVEN
  `entity_id="bui_lan"` đã tích lũy 23 fact (cùng dữ liệu ví dụ AC-12) và
  `max_facts_per_entity=8`, WHEN gọi CẢ HAI `get_facts_by_entity("bui_lan")`
  và `selected_facts("bui_lan")` trên CÙNG 1 trạng thái, THEN
  `get_facts_by_entity` trả về đúng 23 fact (toàn bộ, không cắt) trong khi
  `selected_facts` trả về đúng 8 fact (theo AC-12) — 2 kết quả THỰC SỰ
  khác nhau về số lượng, chứng minh 2 interface tách biệt đúng như Public
  Interface tuyên bố (không phải cùng 1 hàm với tên khác nhau). GIVEN
  `entity_id` hợp lệ nhưng chưa từng có fact nào (`facts(entity_id)=∅`),
  WHEN gọi `get_facts_by_entity(entity_id)`, THEN trả về tập rỗng, KHÔNG
  throw.
- **AC-31** (Formula #2 — `has_signal` fallback cho field type ngoài 5
  kiểu đã định nghĩa): GIVEN `locked_result` chứa 1 field có giá trị kiểu
  KHÔNG khớp cả 5 nhánh của `has_signal` (numeric/boolean/event/string/
  array — VD 1 object/dict lồng nhau do 1 hệ Feature tương lai định nghĩa
  sai schema), WHEN tính `has_signal` cho field đó, THEN mặc định
  `has_signal=true` (fail-safe: field được ghi nhận CÓ tín hiệu, sinh 1
  fact, KHÔNG âm thầm mất — đối xứng với cách `entity_id` không khớp quy
  ước vẫn được gán fallback `"global"` thay vì bị bỏ qua, Edge Case dòng
  ~556), VÀ có 1 bản ghi log cảnh báo schema được tạo ra để QA rà soát —
  không phải lỗi chặn cứng, không dừng xử lý lượt.
- **AC-32** (Formula #1 — `in_window` KHÔNG đảo ngược khi Undo 1 lượt MỚI
  HƠN, siết lại AC-17): GIVEN `recency_window_turns=8`,
  `last_confirmed_turn_id=20` (lượt 12 đã rời cửa sổ, có fact trích xuất
  tương ứng), WHEN Undo lượt 20 (`last_confirmed_turn_id` giảm còn 19),
  THEN lượt 12 VẪN ở trạng thái "đã trích xuất thành fact, không còn
  `narration_text` trong Khung ngữ cảnh AI" — KHÔNG được tự động "kéo lại"
  vào dạng nguyên văn dù áp công thức `in_window(12) = (19−12)=7 < 8`
  theo nghĩa đen sẽ ra `true`. Làm rõ: Công thức #1 (`in_window`) chỉ
  đúng vai trò TRIGGER trích xuất tại đúng thời điểm 1 lượt MỚI được xác
  nhận — không phải một live predicate để tái xác nhận trạng thái sau khi
  `last_confirmed_turn_id` GIẢM do Undo; việc evict khỏi cửa sổ là hành
  động MỘT CHIỀU, cùng bản chất "một chiều" với chính Undo (Core Rule #2 —
  lượt bị undo không "sống lại"). *(Siết AC-17: GIVEN của AC-17 — vốn chỉ
  loại trừ trường hợp ĐỔI TUNING KNOB giữa chừng — nay loại trừ THÊM
  trường hợp có Undo xảy ra SAU KHI 1 lượt đã rời cửa sổ; AC-17 chỉ đúng
  cho khoảng `world_time` không có Undo nào tác động đến các lượt đã
  evict, nếu không đường "tái tạo" (recovery path) có thể cho kết quả 8
  lượt nguyên văn trong khi bản sống có 7 — 2 kết quả khác nhau dù cùng
  Nhật ký đầy đủ tại thời điểm đó.)*
- **AC-33** (Tuning Knobs — AC mirror cho INVARIANT liên-GDD
  `max_entities_per_prompt ≥ MAX_NPC_PER_SCENE + 1`, cùng dạng AC-67 của
  `core-ui-screen-navigation.md`): GIVEN registry hiện hành
  (`max_entities_per_prompt`, `MAX_NPC_PER_SCENE` từ
  `situation-encounter-generation.md`), WHEN đọc từ config/registry, THEN
  `max_entities_per_prompt ≥ MAX_NPC_PER_SCENE + 1` — so sánh 2 số tĩnh,
  chạy lại mỗi lần tune, cùng cấp BLOCKING với AC-27.
- **AC-34** (Formula #4 — clamp phòng thủ khi `|entities_in_scope| >
  max_entities_per_prompt` xảy ra dù INVARIANT bị vi phạm): GIVEN
  `max_entities_per_prompt` bị hạ cấu hình sai xuống dưới INVARIANT (VD =
  3, trong khi `MAX_NPC_PER_SCENE + 1 = 4`), và 1 cảnh có
  `entities_in_scope` thực nhận vào = 4 phần tử (vi phạm invariant ở phía
  input), WHEN tính `context_size(prompt)`, THEN World Memory tự áp
  `top_K(entities_in_scope, key=priority_key_của_Situation_Gen,
  K=max_entities_per_prompt=3)` làm clamp phòng thủ TRƯỚC khi tính tổng —
  kết quả `context_size` vẫn tôn trọng bất đẳng thức Công thức #4 (không
  vỡ âm thầm), và entity bị loại là entity có `priority_key` thấp nhất
  theo đúng thứ tự Situation/Encounter Generation đã định nghĩa.

## Open Questions

- **`systems-index.md` chưa liệt kê cạnh phụ thuộc Turn Manager → World
  Memory & Context Management** trong Dependency Map (Turn Manager đọc
  Khung ngữ cảnh AI trực tiếp) — cùng dạng phụ thuộc một chiều đã gặp 3
  lần trước. *(Owner: producer/systems-designer, target: trước khi chạy
  `/consistency-check`)*
- **Quy ước đặt tên `entity_id` trong field của `locked_result`** (VD:
  `affinity_delta_[npc_id]`) hiện chỉ là giả định làm việc của GDD này —
  cần trở thành 1 chuẩn chính thức mà MỌI hệ Feature (Combat, EXP, NPC
  Affinity, Death & Consequence...) tuân theo khi định nghĩa schema
  `locked_result` của chính họ, để trích xuất fact hoạt động đúng ngay từ
  đầu thay vì cần sửa lại khi từng hệ đó được thiết kế. **Bổ sung
  2026-08-06** (`systems-designer`): gộp thêm quy ước cho field boolean —
  luôn đặt tên sao cho trạng thái ĐÁNG NHỚ ứng với `value=true` (VD
  `death_flag=true`, không phải `is_alive=false`), vì `has_signal(f)`
  nhánh boolean chỉ bắt `value=true` (Formula #2) — convention hiện hành
  của các GDD đã Designed đều tuân theo cực dương này, nhưng chưa được
  CHUẨN HÓA bắt buộc ở đâu. *(Owner: systems-designer, target: trước
  `/design-system combat-system`, nên chốt thành 1 mục trong
  `coding-standards.md` hoặc tài liệu schema riêng)*
- **Giá trị thực nghiệm của `avg_turn_tokens`/`avg_fact_tokens`** (Formula
  4) chưa đo được — cần đo thật sau khi AI/LLM Integration Layer được
  triển khai, để xác nhận hằng số C (chặn kỳ vọng kích thước Khung ngữ
  cảnh AI) thực sự gần đúng trong điều kiện thường; **và** để cấp giá trị
  thật cho `ai_context_hard_token_budget` mà Runtime Clamp (Formula #4,
  bổ sung 2026-08-06) tiêu thụ làm lưới an toàn cứng. **Cần đo LẶP LẠI**
  mỗi khi F (tổng field schema `locked_result`) tăng đáng kể do hệ Feature
  mới thêm field — không phải đo 1 lần duy nhất. *(Owner: technical-
  director, target: sau khi có bản build đầu tiên gọi AI thật; `ai-llm-
  integration-layer.md` là nơi sở hữu `ai_context_hard_token_budget`)*
- ~~**Chiến lược sắp xếp fact theo độ mới (recency) ở Formula 3 là lựa
  chọn MVP tạm thời**~~ — **ĐÃ ĐÓNG 2026-08-06** (`/design-review`):
  `setting-canon-integration.md` D.5 đã chốt `importance_tier` (Designed
  2026-08-03) từ trước; Formula #3 của GDD này đang mô tả LỖI THỜI (vẫn
  ghi `key=world_time` thuần) đã được sửa khớp thực tế — key hiện hành là
  `(importance_tier DESC, world_time DESC, fact_id ASC)`. Xem Formula #3.
- **Chiến lược lưu trữ vật lý cho Nhật ký đầy đủ trên mobile quota thấp**
  (đã flag ở `game-concept.md` Technical Risks) — GDD này chỉ đảm bảo
  không mất nội dung ở tầng logic; cơ chế nén/lưu trữ vật lý cụ thể là
  quyết định của Persistence/Save System. *(Owner: technical-director,
  target: `/design-system Persistence/Save System`, `/create-architecture`)*
- **[REQUIRED ADR — chặn `/create-architecture`] RAM residency lúc runtime
  + chữ ký sync/async của `get_turn_page`** *(nêu 2026-08-06 vòng 1,
  `godot-specialist`; XÁC NHẬN CÒN TREO + làm rõ mức độ nghiêm trọng ở
  vòng re-review 2, `godot-specialist` + `creative-director`)*: GDD này
  phân biệt rõ "lưu trữ vật lý" (Persistence, Core Rule #6) khỏi "dữ liệu
  cần cư trú RAM lúc đang chơi" (Nhật ký đầy đủ + kho fact, cả hai đều
  never-purge theo thiết kế) — nhưng CHƯA kiến trúc hóa ai chịu trách
  nhiệm giới hạn RAM runtime trên target Mobile Web (WASM32 heap hạn chế).
  **Vòng 2 xác nhận đây KHÔNG phải câu hỏi lý thuyết**: Godot Web export
  mount `user://` qua Emscripten IDBFS — đây KHÔNG phải lazy-load thật, mà
  mirror TOÀN BỘ file trong RAM (MEMFS), chỉ sync hàng loạt ra IndexedDB
  khi gọi `syncfs()`. Vậy hướng "chia file theo trang" (paged-from-storage
  qua `FileAccess` mặc định) KHÔNG giải quyết được RAM — chỉ cách RAM-
  bounded thật là gọi thẳng IndexedDB qua `JavaScriptBridge`, và
  IndexedDB vốn dĩ BẮT BUỘC async. Trong khi đó `core-ui-screen-
  navigation.md` (#15) đã thiết kế nhiều hành vi (cold-start S2 "hiện
  ngay, KHÔNG chờ" AC-50, double-tap-swallow) dựa trên giả định `get_turn_page`
  ĐỒNG BỘ trong-frame — **2 giả định ngầm loại trừ lẫn nhau đã cắm vào 2
  GDD khác nhau, cả hai đều chưa viết ra như một giả định tường minh**.
  Thêm: WASM linear memory chỉ TĂNG không bao giờ tự co lại trong 1 phiên
  — một đỉnh RAM tạm thời (VD AC-20, batch-extract khi load save cũ) để
  lại sàn bộ nhớ vĩnh viễn cho cả phiên, rủi ro OOM thật trên mobile/iOS
  Safari với playthrough dài. **Phạm vi ADR IDBFS đã có ở
  `persistence-save-system.md` (Open Question, HIGH risk) PHẢI được mở
  rộng để bao gồm quyết định này** — không chỉ hành vi ghi (write) như
  hiện đang mô tả.
  **Quyết định này VƯỢT PHẠM VI 1 GDD — không được chốt trong văn bản
  World Memory hay #15**, vì nó ràng buộc chữ ký interface của 1 GDD khác
  đã Designed. Route bắt buộc: `technical-director` chạy 1 ADR (kèm
  spike/đo thực tế hành vi IDBFS trên Godot 4.6 Web export) tại
  `/create-architecture`, TRƯỚC khi bắt đầu code World Memory hoặc #15 —
  đây là điều kiện chặn cứng, không phải khuyến nghị. **Giả định MVP tạm
  thời được ghi lại ở đây để có thể bị ADR bác bỏ, không phải để tự phê
  duyệt**: chấp nhận Nhật ký đầy đủ RAM-resident toàn bộ cho MVP (giữ
  `get_turn_page`/`total_turns()` đồng bộ, không đổi #15), vì phạm vi MVP
  hiện tại (3 NPC, xem `systems-index.md`) chưa chắc chạm quy mô world_time
  đủ lớn để RAM là rủi ro thật — hoãn giải pháp RAM-bounded thật (IndexedDB
  async) sang 1 ADR follow-up riêng khi lập kế hoạch Full Vision. *(Owner:
  technical-director, target: `/create-architecture`, TRƯỚC khi bắt đầu
  code World Memory hoặc #15 — điều kiện tiên quyết đã tự đặt ra ở
  `systems-index.md` risk register.)*
- **`ai_context_hard_token_budget` — biến nền tảng của Formula #5 chưa
  tồn tại ở nơi được tuyên bố sở hữu nó** *(mới, thêm 2026-08-06 vòng
  re-review 2, `systems-designer`)*: World Memory GDD (Dependencies +
  Formula #5) khẳng định biến này "registry, do `ai-llm-integration-
  layer.md` cấp" — nhưng grep toàn bộ `ai-llm-integration-layer.md` VÀ
  registry `entities.yaml`: **không có bất kỳ dòng nào định nghĩa nó**.
  Đây là dependency đã khai từ vòng 1 (khi thêm Runtime Clamp) nhưng chưa
  từng được lan truyền sang GDD sở hữu. GDD này CHỈ khai yêu cầu — việc
  định nghĩa giá trị thật (phụ thuộc model AI đang dùng) thuộc phạm vi
  `ai-llm-integration-layer.md`, cần xin phép riêng để sửa file đó. *(Owner:
  người dùng quyết định thời điểm / `ai-llm-integration-layer.md` re-review,
  target: trước khi Formula #5 (Runtime Hard Clamp) có thể vận hành thật —
  hiện tại công thức vẫn ĐÚNG về mặt đặc tả, chỉ thiếu giá trị đầu vào.)*
- **Chủ sở hữu field cấu trúc cho "cam kết/lời hứa" định tính** *(mới,
  thêm 2026-08-06, `game-designer` + `creative-director`)*: World Memory
  CHỦ ĐÍCH không lưu nội dung định tính thuần túy (chỉ lưu delta cơ học
  qua `locked_result`) — đúng anti-pillar "AI output không parse ngược
  thành world state". Nếu về sau có nhu cầu thật (playtest cho thấy thiếu
  nó gây hụt hẫng), giải pháp ĐÚNG không phải sửa World Memory mà là một
  hệ khác (NPC Affinity, hoặc 1 micro-system mới) định nghĩa field cấu
  trúc kiểu `promise_id_[npc]`/`commitment_status_[npc]` trong
  `locked_result` của chính họ — khi đó Formula #2 (đã mở rộng hỗ trợ
  string/enum, sửa 2026-08-06) tự động trích xuất được, không cần sửa gì
  ở đây. *(Owner: game-designer/narrative-director, target: `/map-systems`
  nếu playtest xác nhận nhu cầu — KHÔNG làm trước, tránh scope creep ở
  MVP 3 NPC)*
- **`recency_window_turns` đo theo lượt thô, không nhận biết ranh giới
  cảnh/hội thoại** *(mới, thêm 2026-08-06, `game-designer`)*: một cuộc
  hội thoại dài hơn `recency_window_turns` (mặc định đã nâng 5→8, xem
  Tuning Knobs) có thể mất `narration_text` của phần mở đầu TRƯỚC KHI
  cảnh đó kết thúc — người chơi cảm nhận được ngay (khác "quên chuyện xa
  xưa"). Cân nhắc cửa sổ theo cảnh (scene-relative, chặn trên bởi 1 hằng
  số an toàn) thay vì đếm lượt tuyệt đối. *(Owner: game-designer, target:
  playtest sớm ở Vertical Slice để đo "số lượt trung bình/1 cảnh hội
  thoại" trước khi cân nhắc đổi cơ chế)*
- **`persistence-save-system.md` cần cập nhật để phản ánh Core Rule #8**
  *(mới, thêm 2026-08-06)*: Khung ngữ cảnh AI nay là blob BẮT BUỘC trong
  save bundle (không còn tùy chọn) — GDD kia cần thêm blob này vào danh
  sách bắt buộc + cập nhật mô tả tương ứng. GDD này CHỈ khai yêu cầu, chưa
  tự sửa file đó (cần xin phép riêng theo Collaboration Protocol). *(Owner:
  người dùng quyết định thời điểm, target: trước `/create-architecture`)*
