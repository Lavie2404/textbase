# World Memory & Context Management

> **Status**: Designed — Pending Review
> **Author**: user + agents
> **Last Updated**: 2026-08-02
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

Với người chơi, hệ này là lý do thế giới không bị "chứng mất trí": một lời
hứa NPC đưa ra 50 lượt trước vẫn được nhắc đúng, một hành động tàn nhẫn
với một NPC vẫn ảnh hưởng đến cách NPC đó (và những người quen biết họ)
đối xử về sau — không có gì bị AI "quên" chỉ vì đã trôi qua nhiều lượt.
Nhưng vì bộ nhớ này về nguyên tắc tăng vô hạn trong khi mọi mô hình AI chỉ
đọc được một cửa sổ ngữ cảnh giới hạn, hệ này còn phải giải quyết bài toán
kỹ thuật cốt lõi: NÉN/TÓM TẮT lịch sử cũ mà KHÔNG làm mất những sự kiện
thực sự quan trọng — người chơi phải cảm nhận thế giới "nhớ đúng cái đáng
nhớ", không phải nhớ tuyệt đối từng câu chữ hay quên sạch quá khứ xa.

## Player Fantasy

*(`creative-director` không được tham vấn — Lean mode, không phải section
rủi ro cao theo quy tắc skill.)*

Người chơi trải nghiệm hệ này ở CẢ HAI tầng. **Trực tiếp**: đây là một
tiểu thuyết tương tác — người chơi phải đọc lại được toàn bộ câu chuyện
của mình từ đầu đến cuối, y như lật lại một cuốn nhật ký đã viết. Không có
"lượt nào bị mất" khỏi nhật ký này (trừ những lượt đã bị Undo — vốn coi
như chưa từng xảy ra). Đây là nơi hiện thực hóa Visual Identity Anchor của
`game-concept.md` ("Mực Chưa Khô" — như một cuốn nhật ký sống đang được
viết ra): người chơi có thể lật lại và thấy đúng những gì đã "viết" trước
đó, không bao giờ bị sửa hay tóm tắt lại.

**Gián tiếp**: song song đó, thế giới "nhớ đúng" theo một cách người chơi
không trực tiếp thấy cơ chế — một NPC nhắc lại đúng một lời hứa cũ, một
hành động tàn nhẫn 30 lượt trước vẫn ảnh hưởng đến thái độ NPC hôm nay, dù
bản thân đoạn đó có thể đã được tóm tắt/nén ở tầng ngữ cảnh AI (không phải
tầng nhật ký người chơi đọc). Cảm giác đúng: người chơi tin thế giới có
trí nhớ thật, không phải một AI "diễn" như đang nhớ trong khi thực ra ngữ
cảnh đã rơi khỏi cửa sổ token từ lâu.

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
   #6, chưa thiết kế), KHÔNG thuộc phạm vi GDD này. GDD này chỉ đảm bảo
   NỘI DUNG logic không bao giờ bị tóm tắt/mất mát ở tầng Nhật ký đầy đủ.
7. **Không có state machine riêng**: giống Contract Enforcement/Equipment
   Data System, đây là một kho dữ liệu + tập quy tắc trích xuất, không
   phải luồng xử lý tuần tự.

### States and Transitions

Không có state machine — thay vào đó là bảng các thao tác (operations)
được kích hoạt bởi sự kiện từ hệ khác:

| Thao tác | Kích hoạt bởi | Hành vi |
|---|---|---|
| Ghi turn record | Turn Manager: lượt xác nhận VÀ không undo | Append vào Nhật ký đầy đủ; nếu lượt vượt ra khỏi `recency_window_turns` (lượt mới xác nhận đẩy lượt cũ nhất trong cửa sổ ra ngoài), trích xuất sự kiện từ `locked_result` của lượt bị đẩy ra và lưu vào Sự kiện đã trích xuất theo entity_id liên quan |
| Xóa turn record | Turn Manager: lượt bị Undo | Xóa record khỏi Nhật ký đầy đủ VÀ khỏi Cửa sổ gần đây nếu còn ở đó (lượt vừa undo luôn là lượt mới nhất, luôn còn trong cửa sổ — xem Core Rule #5) |
| Dựng Khung ngữ cảnh AI | AI/LLM Integration Layer: chuẩn bị prompt cho `narration_call`/`suggestion_call` | Trả về: Cửa sổ gần đây (nguyên văn) + Sự kiện đã trích xuất liên quan đến entity đang tham gia tình huống hiện tại (không trả TOÀN BỘ sự kiện đã trích xuất của cả game — chỉ phần liên quan) |
| Truy vấn Nhật ký đầy đủ | UI người chơi: mở màn hình đọc lại lịch sử | Trả về toàn bộ Nhật ký đầy đủ theo thứ tự `world_time`, dạng văn bản gốc |
| Truy vấn sự kiện theo entity | NPC Affinity & Relationship, Setting & Canon Integration (khi được thiết kế) | Trả về danh sách sự kiện đã trích xuất khớp `entity_id` yêu cầu |

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
  2026-08-03) và **Situation/Encounter Generation** (chưa thiết kế):
  truy vấn Sự kiện đã trích xuất theo entity_id — giao diện truy vấn đã
  cố định ở GDD này và 2 hệ đầu đã tiêu thụ đúng như khai (field
  `affinity_delta_[npc_id]`, `canon_*`); Setting & Canon còn cung cấp
  `canon_importance_tier` cho khe cắm key của Công thức #3 (xem ghi chú
  registry `entity_fact_selection`).
- **Persistence/Save System** (chưa thiết kế): sẽ đọc/ghi cả Nhật ký đầy
  đủ lẫn Khung ngữ cảnh AI khi save/load; quyết định nén-lưu-trữ vật lý
  (Core Rule #6) thuộc phạm vi GDD đó.

## Formulas

*(Đây là công thức quản lý dữ liệu/kỹ thuật — không phải công thức cân bằng
gameplay. 4 công thức dưới đây giải quyết trực tiếp cờ HIGH-RISK: chứng minh
Khung ngữ cảnh AI luôn bị chặn kích thước bất kể `world_time` tăng vô hạn.
Đề xuất bởi `systems-designer`.)*

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

---

**2. Số Lượng Sự Kiện Trích Xuất Mỗi Lượt (Fact Extraction Count)**

Công thức `fact_extraction_count` được định nghĩa là:

`facts_extracted(turn) = Σ f∈fields(locked_result) signal(f)`

với `signal(f) = 1` nếu `has_signal(f)`, ngược lại `0`; và:

`has_signal(f) = (numeric(f) ∧ f.value ≠ 0) ∨ (boolean(f) ∧ f.value = true) ∨ (event(f) ∧ f.value ≠ null)`

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Trường dữ liệu của kết quả khóa | f | field | ∈ fields(locked_result) | Một field có cấu trúc trong `locked_result` (VD: `hp_delta`, `affinity_delta_[npc_id]`, `canon_break_flag`) |
| Có tín hiệu đáng ghi | has_signal(f) | bool | {0,1} | 1 nếu field này mang thay đổi thực sự (khác 0/null/false) |
| Tổng field có cấu trúc | F | int | cố định, do schema `locked_result` quyết định | Tổng số field khả dĩ trong 1 turn record (schema hữu hạn) |
| Số sự kiện trích xuất | facts_extracted(turn) | int | 0 → F | Số fact record được tạo ra từ 1 lượt khi nó rời cửa sổ gần đây |

**Phạm vi kết quả**: số nguyên trong `[0, F]`, F hữu hạn (schema
`locked_result` do Turn Manager/Contract Enforcement quyết định, không đổi
theo thời gian) — do đó **mỗi lượt đóng góp một lượng fact bị chặn trên**,
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

`selected_facts(entity_id) = top_K(facts(entity_id), key = world_time, order = desc, K = max_facts_per_entity)`

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Thực thể cần lấy sự kiện | entity_id | string | NPC id cụ thể, hoặc "global" | Đối tượng đang tham gia tình huống hiện tại của prompt |
| Toàn bộ sự kiện đã lưu của thực thể | facts(entity_id) | set | 0 → ∞ (lý thuyết, tăng theo world_time) | Tất cả fact record có entity_id khớp, tính đến thời điểm hiện tại |
| Trần số fact mỗi thực thể mỗi prompt | max_facts_per_entity | int | ≥ 0 (tuning knob) | Số fact GẦN NHẤT (theo world_time) tối đa được đưa vào 1 prompt cho 1 entity |
| Sự kiện được chọn | selected_facts(entity_id) | set | 0 → max_facts_per_entity | Tập con thực sự được nhét vào prompt |

**Phạm vi kết quả**: `|selected_facts(entity_id)| ≤ max_facts_per_entity`
luôn đúng — **bất kể** `|facts(entity_id)|` đã tăng lớn đến đâu qua một
playthrough dài. Đây là công thức tách biệt với `recency_window_turns`
(Công thức #1): #1 chặn số LƯỢT nguyên văn, #3 chặn số FACT đã trích xuất
đưa vào 1 prompt — hai cơ chế nén độc lập, cộng dồn tác dụng ở Công thức
#4. Chiến lược sắp xếp mặc định là **theo độ mới (recency)**, không theo
độ lớn ảnh hưởng — vì Setting & Canon Integration (hệ chấm điểm "tầm quan
trọng" của 1 sự kiện) chưa được thiết kế; đây là lựa chọn MVP có chủ đích,
để ngỏ khả năng thay bằng `key = importance_score` sau này mà không đổi
cấu trúc công thức.

**Ví dụ minh họa**: `max_facts_per_entity = 8`. NPC "Bùi Lan" đã tích lũy
23 fact qua 3 phiên chơi → `selected_facts("bui_lan")` = 8 fact có
`world_time` lớn nhất (mới nhất) trong số 23 — 15 fact cũ hơn bị loại khỏi
prompt NÀY (nhưng vẫn còn nguyên trong kho fact, vẫn truy vấn được đầy đủ
qua giao diện "lấy toàn bộ sự kiện theo entity_id" ở Core Rule #4, chỉ
riêng bước DỰNG PROMPT mới cắt).

**Trường hợp biên**:
- `|facts(entity_id)| ≤ max_facts_per_entity` (VD: NPC mới xuất hiện, mới có 3 fact, trần là 8): `selected_facts` = toàn bộ 3 fact, không cần cắt — `top_K` với K > |tập hợp| trả về nguyên tập hợp, không lỗi, không cần fact giả để lấp đầy.
- **Entity chưa từng xuất hiện** (entity_id hợp lệ nhưng `facts(entity_id) = ∅`, VD: NPC vừa được giới thiệu lần đầu trong lượt hiện tại, chưa có lượt nào của họ từng rời cửa sổ gần đây): `selected_facts(entity_id) = ∅` — hợp lệ, không phải lỗi. Giao diện truy vấn (dùng chung bởi NPC Affinity, Setting & Canon sau này) phải trả về tập rỗng cho entity_id chưa tồn tại, KHÔNG throw exception — vì "NPC chưa có lịch sử" là trạng thái hợp lệ, không phải trạng thái lỗi.
- `max_facts_per_entity = 0`: hợp lệ về mặt công thức (loại bỏ hoàn toàn tầng "sự kiện đã trích xuất" khỏi mọi prompt, chỉ còn cửa sổ gần đây) — nhưng đây là cực hạn cần cảnh báo ở Tuning Knobs vì sẽ tái tạo lại đúng vấn đề "thế giới mất trí nhớ" mà GDD này được sinh ra để giải quyết.

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

**Phạm vi kết quả — CHỨNG MINH CHẶN TRÊN (giải quyết trực tiếp cờ
HIGH-RISK)**:

```
context_size(prompt) ≤ recency_window_turns × avg_turn_tokens
                       + max_entities_per_prompt × max_facts_per_entity × avg_fact_tokens
                     = C   (hằng số, KHÔNG phụ thuộc world_time)
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
= 15` → `C = 5×350 + 4×8×15 = 1750 + 480 = 2230` token. Dù người chơi đã
chơi 500 lượt hay 50.000 lượt (`world_time` bất kỳ), `context_size(prompt)`
không bao giờ vượt quá **~2230 token** — hằng số này không đổi.

**Trường hợp biên**:
- **Zero cost AI**: bước dựng Công thức #1–#4 là 100% rule-based,
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
  trong cảnh" là trách nhiệm của Situation/Encounter Generation (chưa
  thiết kế), GDD này chỉ tiêu thụ danh sách đó, không tự quyết định.

## Edge Cases

- **Nếu 1 lượt đã rời cửa sổ gần đây (đã bị trích xuất thành fact) — nó
  KHÔNG BAO GIỜ có thể quay lại trạng thái "có thể undo"**: đây là bất
  biến do cấu trúc, không phải luật cần enforce riêng — `recency_window_turns
  ≥ 1` (Core Rule #5) đảm bảo lượt DUY NHẤT có thể undo luôn nằm trong cửa
  sổ; một lượt chỉ rời khỏi cửa sổ khi có lượt MỚI HƠN được xác nhận, mà
  theo `undo_availability_window` (registry), có lượt mới hơn được xác
  nhận đồng nghĩa lượt cũ đã vĩnh viễn mất quyền undo. Hai điều kiện luôn
  đồng bộ, không cần đồng bộ hóa thủ công.
- **Khung ngữ cảnh AI hoàn toàn có thể tái tạo lại từ Nhật ký đầy đủ**: vì
  Công thức #1-#2 là hàm xác định (deterministic) trên dữ liệu của Nhật
  ký đầy đủ, Persistence/Save System (chưa thiết kế) có thể chọn KHÔNG
  serialize riêng Khung ngữ cảnh AI — chỉ cần lưu Nhật ký đầy đủ và tái
  tạo lại Khung ngữ cảnh khi load, hoặc lưu như một cache tùy chọn để
  tăng tốc — quyết định thuộc GDD đó, không phải ràng buộc bắt buộc của
  GDD này.
- **Lượt ảnh hưởng NHIỀU entity cùng lúc** (VD: lan truyền Hảo cảm xã hội
  — hành động với NPC A ảnh hưởng cả Hảo cảm của NPC B): xử lý TỰ NHIÊN
  qua Công thức #2 — mỗi field có tín hiệu trong `locked_result` sinh
  đúng 1 fact với entity_id riêng của field đó, không cần logic đặc biệt
  cho trường hợp đa-entity.
- **Field trong `locked_result` không khớp quy ước đặt tên entity_id nào
  đã biết** (lỗi schema từ 1 hệ Feature tương lai): mặc định gán
  `entity_id = "global"` làm fallback an toàn, đồng thời ghi log cảnh báo
  schema để QA rà soát khi author nội dung hệ Feature đó — không phải lỗi
  chặn cứng.
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
  Encounter Generation** (Narrative, chưa thiết kế) — sẽ truy vấn khi
  được thiết kế.
- **Persistence/Save System** (Core, chưa thiết kế) — đọc/ghi Nhật ký đầy
  đủ (bắt buộc) và có thể tùy chọn cache Khung ngữ cảnh AI (không bắt
  buộc, xem Edge Cases) khi save/load.

*(Cùng dạng phụ thuộc một chiều đã gặp 3 lần trước trong phiên này: Turn
Manager đọc trực tiếp từ World Memory nhưng bảng Systems Enumeration của
`systems-index.md` chỉ ghi chiều "World Memory depends on Turn Manager",
không ghi chiều ngược lại. Sẽ xử lý bằng footnote ở Dependency Map, giống
tiền lệ — xem Open Questions.)*

## Tuning Knobs

| Knob | Default | Safe Range | Ảnh hưởng nếu chỉnh |
|---|---|---|---|
| `recency_window_turns` | 5 | 1–15 (tối thiểu tuyệt đối = 1, Core Rule #5) | Số lượt gần nhất giữ nguyên văn trong Khung ngữ cảnh AI. Quá thấp (1-2) → AI dễ mất mạch văn liền lạc giữa các lượt liên tiếp, dù vẫn đúng kỹ thuật; quá cao (>15) → tốn token/lượt gọi AI không cần thiết, tiệm cận lại vấn đề context window mà GDD này giải quyết. |
| `max_facts_per_entity` | 8 | 3–20 (0 = vô hiệu hóa tầng fact, KHÔNG khuyến nghị — xem Formula 3 cực hạn) | Số fact gần nhất/entity đưa vào 1 prompt. Quá thấp (<3) → NPC "quên" quá nhanh những sự kiện cũ liên quan đến họ; quá cao (>20) → tốn token, giảm hiệu quả nén dù dữ liệu vẫn đúng. |
| `max_entities_per_prompt` | 4 | 2–8 | Số entity_id (NPC + global) được xét trong 1 prompt. Quá thấp (<2) → cảnh có nhiều NPC cùng lúc bị bỏ sót ngữ cảnh của một số NPC; quá cao (>8) → tốn token cho những NPC ít liên quan đến tình huống hiện tại. |

*(`avg_turn_tokens`, `avg_fact_tokens` trong Formula 4 KHÔNG phải tuning
knob — là giá trị ĐO THỰC NGHIỆM từ dữ liệu thật, không phải giá trị
designer chỉnh tay.)*

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
  và lượt đó KHÔNG bị undo, WHEN truy vấn Nhật ký đầy đủ theo đúng
  `turn_id` đó tại BẤT KỲ thời điểm nào sau đó — kể cả sau khi lượt này
  đã rời khỏi `recency_window_turns` và có bản ghi "sự kiện đã trích
  xuất" tương ứng trong Khung ngữ cảnh AI — THEN `narration_text` và
  `locked_result` trả về giống hệt (byte-for-byte) với lúc ghi ban đầu;
  việc AI Context View bị nén/trích xuất (Core Rule #3) không được phép
  làm thay đổi hay xóa bất kỳ phần nào của Nhật ký đầy đủ.
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
  chỉ xuất hiện dưới dạng fact trích xuất từ `locked_result`; (c) đếm
  bằng mock/spy số lệnh gọi AI trước và sau bước dựng Khung ngữ cảnh AI
  cho thấy `calls_per_turn` không đổi (0 lệnh gọi AI phát sinh); (d) thay
  đổi `narration_text` của 1 lượt đã nằm ngoài `recency_window_turns`
  (giữ nguyên `locked_result`) và xác nhận fact trích xuất của lượt đó
  KHÔNG đổi — chứng minh trích xuất chỉ đọc `locked_result`, không bao
  giờ đọc `narration_text`.
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
- **AC-06** (R6): GIVEN nội dung logic của 1 turn record trong Nhật ký
  đầy đủ (trước khi mã hóa/nén ở tầng lưu trữ vật lý), WHEN nội dung đó
  được giải mã lại sau khi đi qua 1 bước nén lossless giả lập (VD: gzip
  round-trip), THEN nội dung logic (`turn_id`, `action`, `locked_result`,
  `narration_text`, `world_time`) giống hệt trước và sau — chứng minh
  "không mất nội dung" của GDD này chỉ ràng buộc ở tầng logic, độc lập
  với lựa chọn nén vật lý nào Persistence/Save System áp dụng.
- **AC-07** (R7): GIVEN chưa có bất kỳ turn record nào từng được ghi
  (`world_time=0`, hệ thống vừa khởi tạo), WHEN gọi bất kỳ operation nào
  trong bảng Thao tác (truy vấn Nhật ký đầy đủ, truy vấn Khung ngữ cảnh
  AI, truy vấn fact theo `entity_id`) mà KHÔNG theo thứ tự "ghi trước,
  đọc sau", THEN mỗi operation vẫn trả về kết quả hợp lệ (tập rỗng),
  không throw lỗi "sai trạng thái" — chứng minh không có state machine
  nào chặn operation theo "chế độ" hiện tại, chỉ có tiền điều kiện dữ
  liệu (rỗng hay không).

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
- **AC-11** (F2): GIVEN 1 lượt thuần hội thoại (mọi field numeric=0,
  boolean=false, event=null), WHEN lượt đó rời `recency_window_turns`,
  THEN `facts_extracted(turn)=0` VÀ `turn_id` đó được đánh dấu rõ ràng là
  "đã xử lý — 0 fact" (một trạng thái/flag riêng biệt với "chưa xử lý")
  — truy vấn trạng thái xử lý của `turn_id` đó phải phân biệt được 2 khả
  năng này. GIVEN lượt 0-fact đó tiếp tục nằm ngoài `recency_window_turns`,
  WHEN dựng Khung ngữ cảnh AI, THEN không còn dấu vết nào của lượt đó
  (không `narration_text`, không fact) — trong khi Nhật ký đầy đủ (theo
  AC-01) vẫn giữ nguyên văn đầy đủ của lượt đó.
- **AC-12** (F3): GIVEN `entity_id="bui_lan"` đã tích lũy 23 fact qua
  nhiều phiên chơi và `max_facts_per_entity=8`, WHEN gọi
  `selected_facts("bui_lan")`, THEN trả về đúng 8 fact — là 8 fact có
  `world_time` lớn nhất trong số 23 (không phải 8 fact ngẫu nhiên hay 8
  fact cũ nhất); `|selected_facts(entity_id)| ≤ 8` luôn đúng bất kể tổng
  fact tăng lên 50, 100, hay nhiều hơn qua các phiên chơi sau.
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
  xuất tương ứng), WHEN kiểm tra `undo_available(15)` tại BẤT KỲ thời
  điểm nào sau đó, THEN luôn = false — không có tình huống nào khiến
  `turn_id=15` vừa "đã trích xuất thành fact" vừa "còn undo-eligible"
  cùng lúc (bất biến cấu trúc, kiểm chứng bằng cách thử mọi thứ tự sự
  kiện xác nhận/undo có thể xảy ra sau đó).
- **AC-17** (Khung ngữ cảnh AI tái tạo lại được): GIVEN 1 Nhật ký đầy đủ
  cố định (không có Khung ngữ cảnh AI được lưu riêng kèm theo), WHEN
  chạy Công thức #1 và #2 để dựng lại Khung ngữ cảnh AI từ đầu, THEN kết
  quả (recency window + fact theo `entity_id`) giống hệt Khung ngữ cảnh
  AI đã được duy trì tăng dần từng lượt một trong suốt playthrough —
  chứng minh tính xác định (deterministic) của quá trình dựng lại.
- **AC-18** (lượt ảnh hưởng nhiều entity cùng lúc): GIVEN `locked_result`
  của 1 lượt có ≥2 field mang tín hiệu với `entity_id` khác nhau (VD:
  `affinity_delta_bui_lan` và `affinity_delta_ai_khac` cùng ≠0, mô phỏng
  lan truyền Hảo cảm xã hội), WHEN chạy hàm trích xuất fact (CÙNG 1 hàm
  dùng cho lượt chỉ ảnh hưởng 1 entity, không code riêng), THEN sinh ra
  đúng 2 fact record riêng biệt với `entity_id` tương ứng của từng field
  — không có field nào bị gộp sai entity hay bị bỏ sót.
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
- **AC-21** (thay đổi tuning knob giữa chừng): GIVEN
  `recency_window_turns` đổi từ 5 → 10 (hoặc `max_facts_per_entity`/
  `max_entities_per_prompt` đổi) tại `world_time=100`, WHEN kiểm tra các
  lượt `turn_id` 90–95 đã bị trích xuất thành fact TRƯỚC thời điểm đổi
  (dưới giá trị `recency_window_turns=5` cũ), THEN chúng KHÔNG được tự
  động đưa trở lại dạng nguyên văn trong recency window dù giá trị mới
  (10) đáng lẽ còn giữ chúng trong cửa sổ nếu áp dụng từ đầu — giá trị
  mới chỉ áp dụng cho các lượt xác nhận SAU thời điểm đổi.
- **AC-22** (NPC đã chết/rời câu chuyện): GIVEN NPC `"bui_lan"` đã chết
  qua Death & Consequence tại 1 lượt trước đó, WHEN truy vấn fact theo
  `entity_id="bui_lan"` ở bất kỳ thời điểm nào sau đó, THEN vẫn trả về
  đầy đủ toàn bộ fact đã tích lũy của NPC đó trước khi chết (không bị
  purge/xóa). GIVEN 1 prompt hiện tại không có `"bui_lan"` trong
  `entities_in_scope`, WHEN dựng Khung ngữ cảnh AI, THEN Công thức #3
  chỉ đơn giản không chọn fact của `"bui_lan"` cho prompt NÀY — không
  phải một hành động xóa dữ liệu vĩnh viễn.

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
  đầu thay vì cần sửa lại khi từng hệ đó được thiết kế. *(Owner:
  systems-designer, target: trước `/design-system combat-system`, nên
  chốt thành 1 mục trong `coding-standards.md` hoặc tài liệu schema
  riêng)*
- **Giá trị thực nghiệm của `avg_turn_tokens`/`avg_fact_tokens`** (Formula
  4) chưa đo được — cần đo thật sau khi AI/LLM Integration Layer được
  triển khai, để xác nhận hằng số C (chặn trên kích thước Khung ngữ cảnh
  AI) thực sự nằm trong giới hạn context window của model đang dùng.
  *(Owner: technical-director, target: sau khi có bản build đầu tiên gọi
  AI thật)*
- **Chiến lược sắp xếp fact theo độ mới (recency) ở Formula 3 là lựa chọn
  MVP tạm thời** — khi Setting & Canon Integration được thiết kế (rubric
  "tầm quan trọng" của 1 sự kiện canon), có thể cần thay `key=world_time`
  bằng `key=importance_score` mà không đổi cấu trúc công thức. *(Owner:
  narrative-director + systems-designer, target: `/design-system Setting
  & Canon Integration`)*
- **Chiến lược lưu trữ vật lý cho Nhật ký đầy đủ trên mobile quota thấp**
  (đã flag ở `game-concept.md` Technical Risks) — GDD này chỉ đảm bảo
  không mất nội dung ở tầng logic; cơ chế nén/lưu trữ vật lý cụ thể là
  quyết định của Persistence/Save System. *(Owner: technical-director,
  target: `/design-system Persistence/Save System`, `/create-architecture`)*
