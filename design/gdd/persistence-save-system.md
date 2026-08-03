# Persistence / Save System

> **Status**: Designed — Pending Review
> **Author**: user + agents
> **Last Updated**: 2026-08-02
> **Implements Pillar**: Pillar 2 (Hệ Quả Thực Sự)
> **Creative Director Review (CD-GDD-ALIGN)**: Skipped — Lean mode (not a PHASE-GATE)

## Overview

Persistence / Save System là cơ chế lưu và khôi phục toàn bộ trạng thái
trò chơi — nhân vật chính (chỉ số, EXP/cảnh giới, trang bị/kỹ năng), Hảo
cảm từng NPC, và Nhật ký tường thuật đầy đủ của World Memory — qua mỗi
lần đóng/mở lại trình duyệt. Người chơi không thao tác trực tiếp với hệ
thống này (không có nút "Lưu" thủ công) — nó tự động ghi lại ngay sau mỗi
lượt được xác nhận, để mỗi lần quay lại, người chơi thấy đúng thế giới
mình đã để lại: cùng cảnh giới, cùng mối quan hệ, cùng câu chuyện đã viết
— không thiếu một lượt nào, không phải chơi lại từ đầu. Không có hệ thống
này, Pillar 2 (Hệ Quả Thực Sự) chỉ có ý nghĩa trong phạm vi một phiên
chơi — mọi tiến triển, mọi lời hứa với NPC, mọi hệ quả sẽ biến mất ngay
khi tắt trình duyệt, phá vỡ chính tinh thần "cuốn nhật ký sống" (Visual
Identity Anchor, `game-concept.md`) mà toàn bộ dự án được xây dựng xung
quanh.

## Player Fantasy

*(`creative-director` không được tham vấn — Lean mode, không phải section
rủi ro cao theo quy tắc skill.)*

Người chơi cảm nhận hệ thống này qua một màn hình chọn slot lưu — nơi mỗi
playthrough là một "quyển nhật ký" riêng biệt, độc lập. Khi nhân vật
chính chết thật và người chơi chọn "Chơi lại" (một trong 3 lối tiếp tục ở
`game-concept.md` mục Cái Chết), playthrough cũ **không biến mất** — nó
khép lại như một cuốn nhật ký đã viết xong, vẫn còn đó để mở lại xem,
trong khi một quyển mới bắt đầu từ trang trắng ở một slot riêng. Cảm giác
đúng: không phải "xóa và làm lại", mà là "khép một chương, mở một chương
khác" — đúng tinh thần Pillar 2 (Hệ Quả Thực Sự): ngay cả cái chết thật
sự, hệ quả nặng nề nhất trong game, cũng không xóa sạch những gì đã xảy
ra, chỉ đóng nó lại vĩnh viễn.

Người chơi không thao tác với hệ thống này ở mỗi lượt chơi — auto-save
chạy nền sau mỗi lượt xác nhận, không có nút "Lưu" thủ công giữa chừng
(giữ đúng nhịp điệu Turn Manager, không làm gián đoạn tường thuật). Người
chơi chỉ chạm trực tiếp vào hệ thống này ở những khoảnh khắc có trọng
lượng thật: mở màn hình chọn slot để bắt đầu một quyển mới, tiếp tục một
quyển đang dang dở, hoặc mở lại một quyển đã khép để hoài niệm — không
phải một thao tác vặt vãnh mỗi lượt, mà một cử chỉ có ý nghĩa, khớp tinh
thần "cuốn nhật ký sống" (Visual Identity Anchor "Mực Chưa Khô",
`game-concept.md`).

## Detailed Design

### Core Rules

1. **Auto-save duy nhất tại 2 checkpoint mỗi lượt**: hệ thống tự động ghi
   trạng thái ngay sau khi Turn Manager chuyển sang **Turn Confirmed**
   (lượt xác nhận và không undo) VÀ ngay sau khi **Undoing** hoàn tất quay
   về **Awaiting Action**. Không ghi ở giữa trạng thái Resolving/Undoing —
   đây chính là điều loại bỏ rủi ro "trạng thái mồ côi" mà
   `turn-manager.md` Open Questions đã flag (trình duyệt đóng giữa lúc
   ghi).

2. **Save bundle gồm nhiều blob độc lập, do hệ gốc sở hữu**: mỗi lần ghi,
   Persistence gom trạng thái từ từng hệ đã đăng ký (Turn Manager, World
   Memory, và các hệ Feature khi được thiết kế — Equipment & Skill Data,
   NPC Affinity, Combat...) dưới dạng blob dữ liệu riêng biệt. Persistence
   **không diễn giải nội dung bên trong** từng blob — chỉ đảm bảo toàn bộ
   các blob được ghi/khôi phục nhất quán với nhau. Đúng-sai nội dung 1
   blob thuộc trách nhiệm của GDD sở hữu nó.

3. **Ghi atomic, tất cả-hoặc-không-gì**: toàn bộ save bundle của 1 lượt
   được ghi như MỘT giao dịch — hoặc ghi đủ toàn bộ, hoặc không ghi gì.
   Không bao giờ tồn tại trạng thái "ghi một nửa" trên đĩa.

4. **Ghi thất bại chặn lượt**: nếu atomic write thất bại (VD: hết quota
   trình duyệt), lượt đó KHÔNG được coi là đã xác nhận — `world_time`
   không tăng (đồng bộ với Turn Manager Edge Case "lệnh gọi AI thất
   bại"), hệ thống báo lỗi rõ ràng cho người chơi và giữ nguyên trạng
   thái hợp lệ gần nhất đã lưu trên đĩa.

5. **Mỗi slot = 1 playthrough độc lập**: không giới hạn cứng số slot, chỉ
   giới hạn bởi quota trình duyệt. Slot mới được tạo ở 2 thời điểm: (a)
   người chơi chủ động chọn "Bắt đầu mới" từ màn hình chọn slot, (b) tự
   động khi người chơi chọn lối "Chơi lại" sau cái chết thật (Death &
   Consequence) — playthrough vừa kết thúc (chứa lượt `is_death_turn=true`)
   được khóa vĩnh viễn ở slot cũ, KHÔNG bị xóa hay ghi đè.

6. **Slot đã khép là read-only**: một slot chứa lượt `is_death_turn=true`
   không thể tiếp tục chơi (Turn Manager đã dừng sinh gợi ý cho slot đó —
   xem States and Transitions của `turn-manager.md`), nhưng vẫn mở được
   để xem lại Nhật ký đầy đủ (đúng UI Requirements của
   `world-memory-context-management.md`).

7. **Không mất nội dung ở tầng logic**: theo đúng World Memory Core Rule
   #6, Persistence có thể áp dụng nén vật lý lossless lên Nhật ký đầy đủ
   khi ghi xuống đĩa (thuật toán cụ thể — xem Open Questions), nhưng nội
   dung logic đọc lại PHẢI giống hệt byte-for-byte sau giải nén.

8. **Save bundle có version**: mỗi bundle mang field `schema_version`.
   Khi load, nếu `schema_version` không khớp phiên bản hiện tại của game,
   hệ thống từ chối load tự động và báo cho người chơi đây là save từ
   phiên bản cũ hơn — không cố gắng đoán/migrate ngầm ở tầng GDD này (cơ
   chế migrate cụ thể là quyết định ADR, vì dự án đang ở Systems Design,
   nhiều schema hệ Feature còn sẽ đổi).

9. **QA export**: cung cấp một thao tác xuất Nhật ký đầy đủ (`turn_id`,
   `action`, `locked_result`, `narration_text`, `world_time` của MỌI lượt
   trong 1 playthrough) ra định dạng đọc được (JSON), không cần đọc
   source code hay debug UI riêng — phục vụ trực tiếp MVP Required #6 và
   câu hỏi mở "world_time và lịch sử lượt cần inspect được" của
   `turn-manager.md`.

### States and Transitions

Không có state machine riêng (giống Contract Enforcement/World Memory) —
thay vào đó là bảng thao tác kích hoạt bởi sự kiện từ hệ khác:

| Thao tác | Kích hoạt bởi | Hành vi |
|---|---|---|
| Auto-save (xác nhận lượt) | Turn Manager: chuyển sang Turn Confirmed | Gom blob từ mọi hệ đã đăng ký, ghi atomic vào slot hiện tại; thất bại → Core Rule #4 |
| Auto-save (sau Undo) | Turn Manager: Undoing hoàn tất, về Awaiting Action | Ghi lại bundle đã hoàn tác (state đã rollback), atomic giống hệt |
| Tạo slot mới | Người chơi: "Bắt đầu mới" HOẶC Character Continuation: "Chơi lại" (sửa 2026-08-03, trước ghi nhầm Death & Consequence) | Khởi tạo slot rỗng mới với `slot_id` riêng, không đụng đến slot cũ |
| Khóa slot | Death & Consequence: lượt `is_death_turn=true` đã ghi | Đánh dấu slot hiện tại là "đã khép" (read-only) — không còn auto-save lượt mới vào slot này |
| Load slot | Người chơi: chọn slot từ màn hình chọn slot | Đọc bundle mới nhất của slot, khôi phục trạng thái mọi hệ theo `schema_version`; không khớp version → từ chối, báo lỗi (Core Rule #8) |
| Xuất QA log | QA/người chơi: yêu cầu export | Trả về Nhật ký đầy đủ của slot hiện tại dạng JSON, không sửa đổi save gốc |

### Interactions with Other Systems

- **Turn Manager** (Foundation, Approved) — 2 chiều: Turn Manager kích
  hoạt 2 checkpoint auto-save (Core Rule #1); Persistence đọc/ghi
  `state`, `last_confirmed_turn_id`, `undo_available`, và `turn_snapshot`
  như 1 blob đối (Core Rule #2) — schema chi tiết của `turn_snapshot`
  KHÔNG do GDD này định nghĩa, vẫn là Open Question của
  `turn-manager.md`.
- **World Memory & Context Management** (Core, Designed) — ghi/đọc Nhật
  ký tường thuật đầy đủ (bắt buộc); Khung ngữ cảnh AI có thể cache tùy
  chọn (không bắt buộc, tái tạo được 100% theo AC-17 của GDD đó).
- **Equipment & Skill Data System** (Foundation, Approved) — blob đối
  chứa `known_skill_ids`, trang bị đã sở hữu/đang mặc của nhân vật
  chính.
- **NPC Affinity & Relationship, Combat System, EXP & Realm Progression,
  Death & Consequence, Setting & Canon Integration** (nay đã Designed) —
  sẽ đăng ký blob riêng khi được thiết kế; danh sách hệ đăng ký KHÔNG cố
  định trước (interface mở, đúng vai trò Foundation/Infrastructure).
- **Character Continuation** (Designed 2026-08-03) — **sửa 2026-08-03**:
  kích hoạt thao tác "Khóa slot" + "Tạo slot mới" khi người chơi chọn
  "Chơi lại" — trước đây ghi nhầm là Death & Consequence (hệ đó chỉ phát
  tín hiệu `death_confirmed`, không tự xử lý lựa chọn tiếp tục, xem
  `character-continuation.md` Core Rule #5).
- **Core UI/Screen Navigation** (chưa thiết kế) — cung cấp màn hình chọn
  slot (Bắt đầu mới / Tiếp tục / Xem lại slot đã khép).

## Formulas

*(Đây là công thức quản lý dữ liệu/kỹ thuật — không phải công thức cân bằng
gameplay, cùng dạng với `world-memory-context-management.md`. Công thức #1
giải quyết trực tiếp đối trọng với `ai_context_view_size_bound` đã chứng
minh (registry): phía PROMPT là O(1), phía LƯU TRỮ ở đây là O(world_time)
không giới hạn — công thức #1 định lượng "sẽ chạm quota ở world_time nào".
Đề xuất bởi `systems-designer`.)*

**1. Ước Tính Tăng Trưởng Kích Thước Save Bundle & Dự Báo Chạm Quota (Save Bundle Size Growth & Quota Exhaustion Projection)**

Công thức `save_bundle_size_growth` được định nghĩa là:

`bundle_size_bytes(world_time) = fixed_blob_bytes + world_time × avg_turn_record_bytes × compression_ratio`

`quota_exhaustion_turn(quota_bytes) = floor((quota_bytes − fixed_blob_bytes) / (avg_turn_record_bytes × compression_ratio))`, hợp lệ khi `quota_bytes > fixed_blob_bytes`

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Lượt đã xác nhận (thời gian chơi) | world_time | int | 0 → ∞ | Cùng biến `world_time_advancement` (registry, `turn-manager.md`) |
| Kích thước blob KHÔNG scale theo world_time | fixed_blob_bytes | float | ≥ 0 (đo thực nghiệm) | Tổng byte của các blob "trạng thái hiện tại" (Turn Manager state, Equipment & Skill Data...) — mỗi hệ chỉ giữ trạng thái HIỆN TẠI, không giữ lịch sử, nên gần như hằng số theo thời gian |
| Kích thước trung bình 1 turn record | avg_turn_record_bytes | float | > 0 (đo thực nghiệm) | Byte trung bình của 1 turn record (`turn_id`, `action`, `locked_result`, `narration_text`, `world_time`) trong Nhật ký đầy đủ, TRƯỚC nén |
| Tỉ lệ nén | compression_ratio | float | (0, 1] | Kích thước SAU nén / TRƯỚC nén; = 1 nghĩa là không nén (mặc định MVP an toàn — thuật toán cụ thể là Open Question theo Core Rule #7) |
| Kích thước bundle ước tính | bundle_size_bytes(world_time) | float | [fixed_blob_bytes, ∞) | Kích thước ước tính TOÀN BỘ save bundle của 1 slot tại `world_time` |
| Quota giả định/đo được | quota_bytes | float | > 0 | Dung lượng khả dụng cho 1 slot cần kiểm tra |
| world_time dự báo chạm quota | quota_exhaustion_turn(quota_bytes) | int | [0, ∞) | `world_time` ước tính tại đó `bundle_size_bytes` vượt `quota_bytes` |

**Phạm vi kết quả**: `bundle_size_bytes` **KHÔNG BỊ CHẶN** — tăng tuyến tính
O(world_time), đối lập trực tiếp với `ai_context_view_size_bound` (registry)
đã chứng minh phía prompt là O(1). Đây là điều **đúng theo thiết kế**: dữ
liệu thô không cần bị chặn (đó là việc của tầng lưu trữ), chỉ phần đưa vào
prompt AI mới cần bị chặn — công thức này định lượng chính xác "không bị
chặn" đó lớn tới đâu và khi nào thành vấn đề thực tế.
`quota_exhaustion_turn` hữu hạn với mọi `avg_turn_record_bytes > 0`.

**Ví dụ minh họa**: `fixed_blob_bytes = 50.000` byte (50 KB),
`avg_turn_record_bytes = 800` byte (narration_text ~300 ký tự tiếng Việt
UTF-8 ~600 byte + `locked_result` JSON ~150 byte + overhead ~50 byte),
`compression_ratio = 1` (chưa nén, MVP).

- `bundle_size_bytes(1.000) = 50.000 + 1.000×800×1 = 850.000` byte (~830 KB)
- `bundle_size_bytes(50.000) = 50.000 + 50.000×800 = 40.050.000` byte (~38,2 MB)

Với `quota_bytes = 10 MB = 10.485.760` byte (giả định minh họa mức thấp cho
mobile — **giá trị CHƯA xác minh**, `game-concept.md` Technical Risks chỉ
flag định tính "quota mobile thấp hơn desktop", chờ ADR đo thật):

`quota_exhaustion_turn = floor((10.485.760 − 50.000) / 800) = floor(13.044,7) = 13.044` lượt

Nếu sau này ADR chọn nén với `compression_ratio = 0,3` (ước tính điển hình
cho văn bản lossless, minh họa):

`quota_exhaustion_turn = floor(10.435.760 / (800×0,3)) = floor(43.482,3) = 43.482` lượt
(~3,3 lần dư địa so với không nén).

**Trường hợp biên**:
- `compression_ratio` chưa chốt thuật toán (Core Rule #7, Open Question):
  mọi tính toán LẬP KẾ HOẠCH bắt buộc dùng `compression_ratio = 1` (kịch
  bản xấu nhất) làm mặc định an toàn — không được giả định
  `compression_ratio < 1` trước khi thuật toán nén thực sự được chọn và đo
  (tránh lập kế hoạch quota lạc quan sai).
- `quota_bytes` không đo được (trình duyệt không hỗ trợ API quota đáng tin,
  hoặc Safari private mode trả về 0/lỗi): `quota_exhaustion_turn` không
  tính được — công thức này chỉ là công cụ LẬP KẾ HOẠCH/giám sát, KHÔNG
  thay thế việc phát hiện thành-công/thất-bại thật của chính lần ghi
  atomic (Core Rule #4 vẫn là cơ chế enforce thực tế, độc lập với công
  thức này).
- `world_time = 0` (slot vừa tạo): `bundle_size_bytes(0) = fixed_blob_bytes`
  — Nhật ký đầy đủ rỗng, đúng ngay sau khi tạo slot, trước auto-save đầu
  tiên.
- Nhiều slot dùng CHUNG quota trình duyệt (không phải quota riêng từng
  slot): công thức này tính kích thước cho 1 SLOT; tổng thực tế cạnh tranh
  quota là `Σ bundle_size_bytes(slot_i)` qua mọi slot — hành vi chia sẻ
  quota đa-slot cụ thể vẫn là Open Question thuộc cùng ADR HTML5/IDBFS đã
  flag ở `game-concept.md`.
- Lượt bị Undo: KHÔNG được tính vào `world_time` (đúng
  `world_time_advancement`, registry) và record của nó chưa từng được ghi
  xuống ở checkpoint sau-Undo (bundle ghi sau Undoing phản ánh trạng thái
  ĐÃ ROLLBACK) — công thức đơn điệu không giảm, chỉ tăng theo `world_time`
  đã xác nhận thật sự.

---

**2. Điều Kiện Bundle Hoàn Chỉnh Trước Khi Ghi Atomic (Bundle Completeness Check)**

Công thức `bundle_completeness_check` được định nghĩa là:

`completeness_ratio(bundle) = (1/N) × Σ(s=1→N) ok(s)`

`is_complete(bundle) = 1 nếu completeness_ratio(bundle) = 1, ngược lại 0`

`commit_allowed(bundle) = is_complete(bundle) AND (N ≥ 1)`

với `ok(s) = 1` nếu `blob_status(s) = OK`, ngược lại `0`; `blob_status(s) ∈ {OK, MISSING, ERROR}`.

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Số hệ đã đăng ký cung cấp blob | N | int | ≥ 1 (0 = lỗi cấu hình) | Số hệ gốc đã đăng ký blob cho save bundle TẠI thời điểm ghi (Turn Manager, World Memory, Equipment & Skill Data hiện tại + hệ Feature khi được thiết kế — danh sách mở, Core Rule #2) |
| Một hệ đã đăng ký | s | system_id | ∈ {1..N} | 1 hệ gốc cụ thể trong tập hệ đã đăng ký |
| Trạng thái blob của hệ s | blob_status(s) | enum | {OK, MISSING, ERROR} | Kết quả hệ s trả về khi Persistence yêu cầu blob của nó |
| Hệ s có blob hợp lệ | ok(s) | bool | {0,1} | 1 nếu `blob_status(s) = OK` |
| Tỉ lệ hoàn chỉnh | completeness_ratio(bundle) | float | [0,1] | Tỉ lệ số hệ đã cung cấp blob hợp lệ trên tổng N |
| Bundle hoàn chỉnh | is_complete(bundle) | bool | {0,1} | 1 chỉ khi TẤT CẢ N hệ đều OK |
| Được phép ghi | commit_allowed(bundle) | bool | {0,1} | Điều kiện BẮT BUỘC trước khi Core Rule #3 (ghi atomic) được phép chạy |

**Phạm vi kết quả**: boolean, tất-cả-hoặc-không-gì — khớp trực tiếp Core
Rule #3. `completeness_ratio` là số liên tục [0,1] chỉ để CHẨN ĐOÁN
(log/debug khi ghi thất bại, biết chính xác bao nhiêu % hệ đã sẵn sàng),
bản thân nó KHÔNG phải điều kiện ghi — chỉ `is_complete = 1` (tức 100%)
mới cho phép ghi, không có "ghi một phần" theo tỉ lệ.

**Ví dụ minh họa**: `N = 3` (trạng thái thiết kế hiện tại: Turn Manager,
World Memory, Equipment & Skill Data — các hệ Feature khác chưa được thiết
kế nên chưa đăng ký). Lượt xác nhận, Persistence gọi blob của cả 3: Turn
Manager → OK, World Memory → OK, Equipment & Skill Data → ERROR (lỗi
serialize do 1 item trùng ID). `completeness_ratio = 2/3 ≈ 0,667` →
`is_complete = 0` → `commit_allowed = 0` → theo Core Rule #4: lượt bị
chặn, `world_time` không tăng, người chơi thấy báo lỗi rõ ràng, slot giữ
nguyên trạng thái hợp lệ gần nhất đã lưu.

**Trường hợp biên**:
- `N = 0` (chưa hệ nào đăng ký — không nên xảy ra sau khi tối thiểu Turn
  Manager đăng ký): `commit_allowed = 0` theo định nghĩa (`N ≥ 1` là điều
  kiện cứng) — đây là LỖI CẤU HÌNH, phải log riêng biệt với "1 hệ cụ thể
  MISSING blob", không phải "bundle hợp lệ nhưng rỗng".
- Hệ đã đăng ký nhưng CHƯA CÓ nội dung áp dụng cho playthrough hiện tại
  (VD: Combat System đã đăng ký nhưng nhân vật chưa từng vào trận): hệ đó
  BẮT BUỘC trả về 1 blob rỗng/mặc định hợp lệ (`blob_status = OK`, nội
  dung "trạng thái khởi tạo"), KHÔNG được trả `MISSING` — "chưa có nội
  dung" và "không cung cấp được blob" là 2 trạng thái khác nhau; quyết
  định thế nào là "trạng thái khởi tạo hợp lệ" thuộc hệ sở hữu blob đó
  (Core Rule #2), không phải Persistence.
- Một hệ trả blob chậm/không phản hồi: công thức này giả định
  `blob_status(s)` đã có kết quả CUỐI CÙNG tại thời điểm tính — cơ chế
  timeout cụ thể cho bước thu thập blob (có cần một hằng số tương tự
  `ai_call_timeout_seconds` không) chưa được định nghĩa ở đây, cần đưa vào
  Open Questions.
- `N` tăng dần theo TIẾN ĐỘ PHÁT TRIỂN game (thêm hệ Feature mới được
  thiết kế), KHÔNG tăng theo `world_time` của 1 playthrough cụ thể — `N`
  cố định trong 1 phiên bản game đã release; thêm hệ mới chỉ ảnh hưởng
  bundle của các lượt xác nhận SAU khi hệ đó được tích hợp, không hồi tố
  bundle cũ (khớp Core Rule #8 — bundle cũ với `N` nhỏ hơn vẫn hợp lệ đúng
  `schema_version` của nó).

---

**3. Tỉ Lệ Sử Dụng Quota Thực Tế & Ngưỡng Cảnh Báo (Quota Utilization & Warning Trigger)**

Công thức `quota_utilization_warning` được định nghĩa là:

`utilization_ratio(slot) = measured_bundle_bytes(slot) / quota_bytes_available`

`warn_triggered(slot) = 1 nếu utilization_ratio(slot) ≥ quota_warn_threshold, ngược lại 0`

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Kích thước bundle đo THẬT | measured_bundle_bytes(slot) | float | ≥ 0 | Byte thực đo được của save bundle NGAY SAU 1 lần ghi atomic THÀNH CÔNG (khác Công thức #1: đây là số đo thật, không phải ước tính lập kế hoạch) |
| Quota khả dụng đo được | quota_bytes_available | float | ≥ 0 | Dung lượng còn khả dụng cho slot/trình duyệt, đo qua API trình duyệt tại thời điểm ghi (API cụ thể — Open Question/ADR) |
| Ngưỡng cảnh báo | quota_warn_threshold | float | (0,1) (tuning knob) | Tỉ lệ sử dụng quota tại đó hệ thống cảnh báo sớm người chơi, TRƯỚC khi thực sự ghi thất bại (Core Rule #4) |
| Tỉ lệ sử dụng | utilization_ratio(slot) | float | [0, ∞) lý thuyết, thực tế thường [0,1] | `measured_bundle_bytes` chia `quota_bytes_available` |
| Cảnh báo được kích hoạt | warn_triggered(slot) | bool | {0,1} | 1 nếu đã tới/vượt ngưỡng cảnh báo |

**Phạm vi kết quả**: `utilization_ratio` không bị chặn trên về mặt lý
thuyết (xem trường hợp biên `>1`), bị chặn dưới ở 0; `warn_triggered` là
boolean. Công thức này là cặp GIÁM SÁT THỰC TẾ bổ sung cho Công thức #1
(ước tính LẬP KẾ HOẠCH trước khi có dữ liệu) — #1 trả lời "dự kiến sẽ chạm
quota ở world_time nào", #3 trả lời "NGAY BÂY GIỜ đã gần chạm quota chưa",
dùng số đo thật sau mỗi lần ghi thay vì ước tính.

**Ví dụ minh họa**: `quota_warn_threshold = 0,85` (cảnh báo khi đã dùng 85%
quota). Slot có `measured_bundle_bytes = 9.000.000` byte,
`quota_bytes_available = 10.485.760` byte (10 MB) → `utilization_ratio =
9.000.000 / 10.485.760 ≈ 0,858 ≥ 0,85` → `warn_triggered = 1` → UI hiển
thị cảnh báo "Slot sắp đầy dung lượng" TRƯỚC khi lần ghi tiếp theo có nguy
cơ thất bại thật.

**Trường hợp biên**:
- `quota_bytes_available = 0` hoặc không đo được (API không hỗ trợ, Safari
  private mode): `utilization_ratio` không tính được bằng chia — fallback:
  `warn_triggered = 1` MẶC ĐỊNH (giả định xấu nhất khi không chắc chắn
  dung lượng còn lại), không chia cho 0, không bỏ qua cảnh báo.
- `utilization_ratio > 1` (lần ghi gần nhất đã vượt quota nhưng trình
  duyệt tạm thời cho ghi trước khi đồng bộ thất bại — theo rủi ro
  Emscripten IDBFS đã flag ở `game-concept.md`): đây là dấu hiệu Core Rule
  #4 sắp/đã kích hoạt ở lần ghi tiếp theo; `warn_triggered` vẫn = 1 bình
  thường, không cần xử lý đặc biệt cho trường hợp `>1`.
- `quota_warn_threshold` không nên đặt quá sát 1,0: nếu quá sát, cảnh báo
  có thể đến CÙNG LƯỢT với lần ghi thất bại thực sự, không cho người chơi
  thời gian phản ứng (VD: xuất Nhật ký QA — Core Rule #9 — hoặc dọn slot
  khác trước khi mất dữ liệu) — khuyến nghị safe range ở Tuning Knobs, VD
  0,7–0,9.
- Formula này chỉ dùng số đo của LẦN GHI GẦN NHẤT (không tự dự đoán tương
  lai) — nếu người chơi không chơi tiếp (đóng trình duyệt), `warn_triggered`
  không tự cập nhật cho tới lần ghi kế tiếp; đây không phải giám sát nền
  liên tục, chỉ đánh giá lại mỗi checkpoint auto-save (Core Rule #1).

## Edge Cases

*(Lean mode: không bắt buộc spawn specialist cho section này — chỉ D và H.
Đối chiếu Edge Cases của `turn-manager.md` và
`world-memory-context-management.md` để đảm bảo nhất quán 2 chiều.)*

- **Nếu trình duyệt bị đóng/OS kill giữa lúc 1 lần ghi atomic đang chạy
  (chưa commit xong)**: lần load kế tiếp phải thấy đúng trạng thái TRƯỚC
  lần ghi đó — write chưa commit không được coi là đã xảy ra (Core Rule
  #3 đảm bảo tính chất này ở mức thiết kế; cơ chế kỹ thuật cụ thể để
  enforce là ADR).
- **Nếu người chơi mở CÙNG 1 slot ở 2 tab trình duyệt đồng thời**: chỉ
  tab mở slot đó ĐẦU TIÊN được phép ghi; tab thứ 2 phát hiện xung đột
  (slot đã bị khóa bởi phiên khác) và bị chặn thao tác (read-only tạm
  thời) kèm thông báo rõ ràng — tránh 2 lần ghi atomic race nhau ghi đè
  lẫn nhau trên cùng 1 slot.
- **Nếu người chơi xóa thủ công 1 slot đã khép (read-only) từ màn hình
  chọn slot**: cho phép xóa để giải phóng quota, nhưng bắt buộc 1 bước
  xác nhận riêng nêu rõ "không thể khôi phục" — khác hẳn Undo (giới hạn 1
  lượt gần nhất), đây là xóa vĩnh viễn toàn bộ playthrough.
- **Nếu load 1 slot có `schema_version` KHÁC bản hiện tại của game** (cũ
  hơn HOẶC mới hơn — VD: chơi trên máy khác có bản mới rồi quay lại máy
  cũ): từ chối load theo Core Rule #8 trong cả 2 chiều, thông báo rõ
  "save này không tương thích với phiên bản game hiện tại" — không cố
  đoán/migrate ngầm dù là cũ hơn hay mới hơn.
- **Nếu `bundle_completeness_check` (Công thức #2) thất bại NHIỀU lượt
  liên tiếp** (1 hệ bị lỗi dai dẳng, VD: bug serialize ở 1 hệ Feature):
  người chơi không được kẹt vĩnh viễn ở slot đó — hệ thống vẫn cho phép
  thoát ra màn hình chọn slot (không thao tác gì thêm trong slot lỗi) và
  tạo slot mới hoặc mở slot khác; QA export (Core Rule #9) vẫn hoạt động
  trên dữ liệu ĐÃ commit gần nhất của slot lỗi để phục vụ báo lỗi.
- **Nếu ghi thất bại ngay từ LƯỢT ĐẦU TIÊN của 1 slot mới** (VD: Safari
  private mode không hỗ trợ lưu trữ bền vững — rủi ro đã biết ở
  `game-concept.md`): thông báo cho người chơi phân biệt rõ đây là
  **hạn chế của trình duyệt/chế độ duyệt web**, không phải lỗi game —
  khác nội dung thông báo với trường hợp hết quota thông thường (Core
  Rule #4).
- **Nếu QA export (Core Rule #9) được gọi trong khi 1 lần ghi atomic
  khác đang chạy**: export luôn đọc từ bản đã **commit gần nhất**, không
  bao giờ đọc trạng thái ghi dở — nhất quán với tính atomic của Core Rule
  #3, không cần cơ chế khóa riêng vì đọc chỉ xảy ra sau khi ghi atomic
  hoàn tất hoặc thất bại rõ ràng.
- **Nếu người chơi chọn "Chơi lại" trong khi đang XEM một slot đã khép
  khác (không phải slot vừa chết)**: tạo slot mới hoàn toàn độc lập,
  không liên quan đến slot đang xem — thao tác "Chơi lại" luôn gắn với
  playthrough VỪA kết thúc bằng cái chết thật, không phải slot đang được
  duyệt xem trên UI.
- **Nếu Nhật ký đầy đủ của World Memory rỗng ở lần ghi đầu tiên**
  (`world_time=0`, chưa có turn record nào): Công thức #1
  (`bundle_size_bytes(0) = fixed_blob_bytes`) vẫn áp dụng bình thường,
  atomic write vẫn chạy đúng quy trình — không có "bỏ qua ghi lần đầu vì
  chưa có gì".
- **Nếu `avg_turn_record_bytes` (Công thức #1) và
  `quota_bytes_available` (Công thức #3) chưa từng đo được** (bản build
  đầu tiên, chưa qua playtest thật): các công thức này KHÔNG chặn việc
  ghi/load hoạt động — chúng chỉ phục vụ lập kế hoạch/cảnh báo (Open
  Questions sẽ nêu rõ cần đo thực nghiệm sau khi có bản build đầu tiên,
  giống Open Question tương tự của `world-memory-context-management.md`
  về `avg_turn_tokens`).

## Dependencies

*(Đối chiếu 2 chiều với các GDD đã tồn tại — phát hiện 1 khoảng trống
giống 4 lần trước trong phiên này, xem ghi chú cuối.)*

**Phụ thuộc vào (upstream)**:
- **Turn Manager** (Foundation, Approved) — **hard dependency**: toàn bộ
  mô hình trigger của Persistence (2 checkpoint auto-save, Core Rule #1)
  không tồn tại nếu không có Turn Manager phát sự kiện Turn Confirmed /
  Undoing hoàn tất.

**Các hệ thống phụ thuộc vào Persistence** (downstream), kèm giao diện dữ
liệu cụ thể:
- **Turn Manager** (Foundation, Approved) — **hard, 2 chiều** (cũng là
  upstream ở trên): đọc/ghi `state`, `last_confirmed_turn_id`,
  `undo_available`, `turn_snapshot` (blob đối) mỗi lần save/load.
- **World Memory & Context Management** (Core, Designed) — **hard**:
  đọc/ghi Nhật ký tường thuật đầy đủ (bắt buộc theo MVP Required #5 của
  `game-concept.md`); Khung ngữ cảnh AI có thể cache tùy chọn (soft, tái
  tạo được).
- **Equipment & Skill Data System** (Foundation, Approved) — **hard**:
  blob đối chứa `known_skill_ids`, trang bị sở hữu/đang mặc.
- **NPC Affinity & Relationship, Combat System, EXP & Realm Progression,
  Death & Consequence, Setting & Canon Integration** (chưa thiết kế) —
  **hard khi được thiết kế**: mỗi hệ sẽ đăng ký blob riêng qua interface
  mở của Persistence (Core Rule #2); tới khi đó Công thức #2 (`N` = số hệ
  đã đăng ký) không tính các hệ này.
- **Death & Consequence** (chưa thiết kế) — **hard khi được thiết kế**:
  kích hoạt trực tiếp thao tác "Khóa slot" + "Tạo slot mới" (Core Rule
  #5-6).
- **Core UI/Screen Navigation** (chưa thiết kế) — **soft**: cung cấp màn
  hình chọn slot; logic save/load cốt lõi của Persistence hoạt động độc
  lập, test được mà không cần UI này tồn tại.

*(Khoảng trống phụ thuộc một chiều phát hiện: `equipment-skill-data-system.md`
— đã Approved — không hề nhắc đến Persistence/Save System trong
Dependencies của chính nó, dù Persistence GDD này liệt kê nó là 1
downstream hard dependency. Cùng dạng với 4 khoảng trống đã gặp trước
trong phiên này (Turn Manager ↔ Contract Enforcement/AI Integration/World
Memory) — sẽ xử lý bằng footnote ở `systems-index.md` thay vì sửa lại GDD
đã Approved, xem Open Questions.)*

## Tuning Knobs

| Knob | Default | Safe Range | Ảnh hưởng nếu chỉnh |
|---|---|---|---|
| `quota_warn_threshold` | 0,85 | 0,7–0,9 | Tỉ lệ sử dụng quota (Công thức #3) tại đó hệ thống cảnh báo sớm người chơi trước khi ghi thật sự thất bại. Quá thấp (<0,7) → cảnh báo giả quá sớm, gây phiền; quá cao (>0,9) → cảnh báo có thể đến cùng lượt với lần ghi thất bại thật, không cho người chơi đủ thời gian phản ứng (VD: export QA log hoặc dọn slot khác). |

*(`fixed_blob_bytes`, `avg_turn_record_bytes`, `compression_ratio`,
`quota_bytes`/`quota_bytes_available` trong Formulas #1 và #3 KHÔNG phải
tuning knob — là giá trị ĐO THỰC NGHIỆM hoặc do trình duyệt báo về, không
phải giá trị designer chỉnh tay, cùng cách xử lý
`avg_turn_tokens`/`avg_fact_tokens` đã áp dụng ở
`world-memory-context-management.md`.)*

*(`schema_version` cũng không phải tuning knob — là giá trị kỹ thuật gắn
với từng bản release của game, không phải tham số cân bằng.)*

## Visual/Audio Requirements

Màn hình chọn slot áp dụng đúng Visual Identity Anchor "Mực Chưa Khô"
(`game-concept.md`): mỗi slot hiển thị như một cuốn sổ tay/nhật ký riêng
— gáy sách phác họa bằng nét mực loang, không phải thẻ UI vuông vức thông
thường. Slot đang chơi dở có "trang đang mở" (bìa hé mở); slot đã khép
(kết thúc bằng cái chết thật) có "bìa đóng kín" kèm 1 dấu ấn góc cạnh nhỏ
(theo ngôn ngữ hình khối của "con dấu" dành cho sự thật cơ học đã chốt —
ở đây là "đã kết thúc") để phân biệt trực quan ngay từ màn hình chọn
slot, không cần đọc chữ mới biết slot nào còn chơi được.

Không cần VFX hay âm thanh riêng cho thao tác save/load (auto-save chạy
nền, không có sự kiện người chơi cần phản hồi tức thời). Có thể dùng 1
hiệu ứng rất nhẹ (gợn mực lan nhẹ) khi 1 slot chuyển từ "đang chơi" sang
"đã khép" ngay sau cái chết thật, nếu ngân sách polish cho phép — không
bắt buộc ở MVP, cùng mức độ ưu tiên với hiệu ứng lật trang tùy chọn đã
nêu ở `world-memory-context-management.md`.

## UI Requirements

**Màn hình chọn slot lưu (Save Slot Screen)**: màn hình đầu tiên người
chơi thấy khi mở game, liệt kê mọi slot đã tồn tại (không giới hạn số
lượng hiển thị — cần cuộn/lazy-load nếu số slot lớn, cùng yêu cầu hiệu
năng như màn hình Story Log của `world-memory-context-management.md`).
Mỗi slot hiển thị tối thiểu: tên nhân vật, cảnh giới hiện tại,
`world_time` (số lượt đã chơi), trạng thái (đang chơi dở / đã khép), và
thời điểm lưu gần nhất. Hành động khả dụng theo trạng thái slot:
- Slot đang chơi dở: "Tiếp tục" (load), "Xóa" (yêu cầu xác nhận riêng —
  Edge Case tương ứng).
- Slot đã khép: "Xem lại" (mở read-only, dẫn thẳng vào màn hình Story
  Log của World Memory ở chế độ chỉ đọc), "Xóa" (yêu cầu xác nhận
  riêng).
- Luôn có nút "Bắt đầu mới" tạo slot trống.

**Thông báo lỗi ghi/tải** (Core Rule #4, Edge Cases): khi 1 lượt bị chặn
do ghi thất bại, hoặc khi load bị từ chối do `schema_version` không
khớp, thông báo hiển thị NGAY TẠI màn hình đang chơi (không phải quay về
Save Slot Screen) — người chơi cần biết ngay hành động vừa rồi có được
ghi nhận hay không, tránh hiểu lầm "đã lưu" trong khi thực ra chưa.
Thông báo phân biệt rõ 3 loại nguyên nhân (Core Rule #4 / Edge Cases):
hết quota, trình duyệt/chế độ duyệt web không hỗ trợ (Safari private
mode), và version không tương thích.

**Cảnh báo quota sớm** (Công thức #3, Tuning Knob `quota_warn_threshold`):
khi `warn_triggered=1`, hiển thị 1 banner không chặn luồng chơi ("Slot
sắp đầy dung lượng — cân nhắc xóa slot cũ") — không phải dialog bắt buộc
đóng, để không phá vỡ nhịp tường thuật.

📌 **UX Flag — Persistence / Save System**: Hệ này có yêu cầu UI thật
(Save Slot Screen + các thông báo lỗi). Ở Phase 4 (Pre-Production), chạy
`/ux-design` để tạo UX spec cho màn hình này **trước khi** viết epic —
story tham chiếu UI nên trích `design/ux/save-slot-screen.md`, không
trích thẳng GDD này.

## Acceptance Criteria

*(Đề xuất bởi `qa-lead`. Phần lớn kiểm chứng bằng unit test thuần trên cấu
trúc dữ liệu + mock/spy cho storage backend — hệ này không gọi AI/network,
giống `world-memory-context-management.md`, khác
`ai-llm-integration-layer.md`. Một số AC (đa-tab, ngắt giữa transaction,
mô phỏng quota trình duyệt) cần thêm cơ chế giả lập ngoài unit test
đơn-luồng thông thường — đánh dấu riêng ở cuối mỗi AC đó.)*

**Core Rules**
- **AC-01** (R1, 2 checkpoint duy nhất): GIVEN Turn Manager đang ở
  Resolving HOẶC đang trong quá trình Undoing (chưa hoàn tất về Awaiting
  Action), WHEN đếm số lần Persistence kích hoạt ghi atomic bằng mock/spy
  trong toàn bộ khoảng thời gian đó, THEN số lần = 0. GIVEN Turn Manager
  chuyển sang Turn Confirmed HOẶC Undoing hoàn tất về Awaiting Action,
  THEN đúng 1 lần ghi atomic được kích hoạt cho MỖI sự kiện đó — không 0,
  không 2+. GIVEN 1 lượt xác nhận rồi undo trong cùng chu kỳ, THEN tổng
  số lần ghi trong chu kỳ = đúng 2 (không nhiều/ít hơn).
- **AC-02** (R2, blob độc lập không diễn giải): GIVEN N hệ mock đã đăng
  ký, mỗi hệ trả về 1 blob mang 1 sentinel value riêng biệt (kể cả nội
  dung vô nghĩa về mặt domain logic của hệ đó), WHEN Persistence gom
  bundle và ghi, THEN Persistence KHÔNG throw lỗi/từ chối ghi dựa trên
  NỘI DUNG bên trong blob — chỉ dựa vào `blob_status` (Formula #2). WHEN
  đọc lại (round-trip), THEN mỗi blob trả về đúng cho hệ sở hữu nó (đúng
  sentinel tương ứng), không lẫn giữa các hệ.
- **AC-03** (R3, ghi atomic tất-cả-hoặc-không-gì): GIVEN mock storage
  backend giả lập lỗi XẢY RA GIỮA CHỪNG (throw exception sau khi "ghi"
  blob thứ 2/N nhưng trước blob thứ 3), WHEN atomic write thất bại, THEN
  đọc lại slot ngay sau đó trả về ĐÚNG bundle TRƯỚC lần ghi thất bại —
  không blob nào của lần ghi mới (kể cả 2 blob đã xử lý trước khi lỗi xảy
  ra) xuất hiện; không có trạng thái "ghi một nửa" quan sát được từ bên
  ngoài.
- **AC-04** (R4, ghi thất bại chặn lượt): GIVEN atomic write thất bại
  (mock storage trả lỗi kiểu `QuotaExceededError`), WHEN kiểm tra
  `world_time` sau đó, THEN KHÔNG tăng; WHEN kiểm tra trạng thái Turn
  Manager, THEN lượt đó KHÔNG được coi là Turn Confirmed; THEN hệ thống
  trả về thông báo lỗi rõ ràng và slot vẫn đọc được nguyên trạng thái
  hợp lệ gần nhất đã lưu trước đó.
- **AC-05** (R5, tạo slot mới không đụng slot cũ): GIVEN người chơi chọn
  "Bắt đầu mới", WHEN slot mới được tạo, THEN `slot_id` mới không trùng
  bất kỳ `slot_id` nào đã tồn tại và không đọc/ghi dữ liệu của slot khác.
  GIVEN 1 slot đã có lượt `is_death_turn=true`, WHEN người chơi chọn
  "Chơi lại", THEN 1 `slot_id` MỚI hoàn toàn được tạo; đọc lại slot cũ
  ngay sau đó phải cho nội dung giống hệt byte-for-byte trước khi "Chơi
  lại" được gọi.
- **AC-06** (R6, slot đã khép read-only): GIVEN 1 slot đã có lượt
  `is_death_turn=true`, WHEN mô phỏng gọi thao tác auto-save cho slot này
  (kịch bản phòng thủ, không nên xảy ra qua UI bình thường), THEN
  Persistence từ chối ghi, nội dung slot không đổi. WHEN gọi đọc Nhật ký
  đầy đủ của slot đó, THEN trả về đầy đủ, không lỗi, không hạn chế đọc.
- **AC-07** (R7, không mất nội dung logic qua nén — áp dụng TOÀN BỘ
  bundle): GIVEN nội dung logic của bất kỳ blob nào trong save bundle
  (không chỉ Nhật ký đầy đủ — khác phạm vi AC tương ứng của
  `world-memory-context-management.md`), WHEN đi qua 1 bước nén lossless
  giả lập (VD gzip round-trip) rồi giải nén lại, THEN nội dung logic
  giống hệt byte-for-byte trước và sau, với mọi blob trong bundle, không
  riêng Nhật ký đầy đủ.
- **AC-08** (R8, version mismatch từ chối cả 2 chiều): GIVEN 1 bundle có
  `schema_version` KHÁC (thử cả trường hợp CŨ HƠN và MỚI HƠN)
  `schema_version` hiện tại của game, WHEN gọi Load slot, THEN load bị
  từ chối trong CẢ 2 trường hợp, trả thông báo lỗi rõ ràng, và KHÔNG có
  field nào của bundle được áp dụng một phần vào trạng thái game hiện
  tại (không migrate ngầm). GIVEN `schema_version` khớp chính xác, WHEN
  load, THEN thành công bình thường.
- **AC-09** (R9, QA export đầy đủ và không sửa gốc): GIVEN 1 playthrough
  có M lượt đã xác nhận (không undo) trong Nhật ký đầy đủ, WHEN gọi thao
  tác Xuất QA log, THEN JSON trả về chứa đúng M object, mỗi object đủ 5
  field (`turn_id`, `action`, `locked_result`, `narration_text`,
  `world_time`), sắp theo `world_time` tăng dần, không thiếu/thừa lượt
  so với Nhật ký đầy đủ tại thời điểm export. WHEN export xong, THEN đọc
  lại save gốc cho kết quả y hệt trước export (export không sửa đổi dữ
  liệu gốc).

**Formulas**
- **AC-10** (F1, worked example): GIVEN `fixed_blob_bytes=50.000`,
  `avg_turn_record_bytes=800`, `compression_ratio=1`, WHEN tính
  `bundle_size_bytes(1.000)`, THEN = 850.000, khớp ví dụ minh họa; WHEN
  tính `bundle_size_bytes(50.000)`, THEN = 40.050.000, khớp ví dụ. GIVEN
  `quota_bytes=10.485.760`, WHEN tính `quota_exhaustion_turn`, THEN =
  13.044, khớp ví dụ; GIVEN `compression_ratio=0,3` (mọi biến số khác
  giữ nguyên), THEN = 43.482, khớp ví dụ thứ 2.
- **AC-11** (F1, biên `world_time=0` + mặc định `compression_ratio` an
  toàn): GIVEN `world_time=0`, WHEN tính `bundle_size_bytes(0)`, THEN =
  đúng `fixed_blob_bytes`, không cộng thêm gì. GIVEN `compression_ratio`
  chưa được đo thực nghiệm/chưa truyền tường minh, WHEN gọi hàm tính
  toán lập kế hoạch của công thức #1 mà không truyền `compression_ratio`,
  THEN giá trị mặc định dùng trong tính toán PHẢI = 1 (kịch bản xấu
  nhất) — kiểm chứng bằng unit test gọi hàm không truyền tham số và
  assert kết quả khớp `compression_ratio=1`, không được ngầm dùng giá
  trị < 1.
- **AC-12** (F2, `commit_allowed` — worked example): GIVEN `N=3`, mock
  trả `blob_status`: OK, OK, ERROR, WHEN tính `completeness_ratio`, THEN
  ≈ 0,667; `is_complete=0`; `commit_allowed=0`, khớp ví dụ minh họa.
  GIVEN cả 3 hệ đều OK, THEN `completeness_ratio=1`, `is_complete=1`,
  `commit_allowed=1`.
- **AC-13** (F2, `N=0` là lỗi cấu hình, phân biệt với 1 hệ MISSING):
  GIVEN `N=0` (chưa hệ nào đăng ký), WHEN tính `commit_allowed`, THEN =
  0 theo điều kiện cứng `N≥1`, VÀ hệ thống ghi log với category/error
  code RIÊNG BIỆT với trường hợp "1 hệ cụ thể trả MISSING" (kiểm chứng
  bằng cách mock 2 kịch bản — `N=0` và `N=3` với 1 hệ MISSING — rồi
  assert log category/code khác nhau giữa 2 kịch bản).
- **AC-14** (F2, blob rỗng hợp lệ ≠ MISSING): GIVEN 1 hệ đã đăng ký
  nhưng chưa có nội dung áp dụng cho playthrough hiện tại (mock trả về
  blob "trạng thái khởi tạo" rỗng/mặc định với `blob_status=OK`), WHEN
  tính `completeness_ratio` cùng các hệ khác đều OK, THEN
  `completeness_ratio=1`, `commit_allowed=1` — hệ đó KHÔNG được phép trả
  `MISSING` chỉ vì chưa có nội dung áp dụng.
- **AC-15** (F3, `warn_triggered` — worked example): GIVEN
  `quota_warn_threshold=0,85`, `measured_bundle_bytes=9.000.000`,
  `quota_bytes_available=10.485.760`, WHEN tính `utilization_ratio`,
  THEN ≈ 0,858, `warn_triggered=1`, khớp ví dụ minh họa. GIVEN
  `measured_bundle_bytes=8.000.000` (cùng quota), THEN
  `utilization_ratio` < 0,85, `warn_triggered=0`.
- **AC-16** (F3, fallback khi không đo được — không chia cho 0): GIVEN
  `quota_bytes_available=0` HOẶC không đo được (mock API trả
  lỗi/undefined, mô phỏng Safari private mode), WHEN tính
  `warn_triggered`, THEN = 1 mặc định, KHÔNG throw lỗi chia-cho-0,
  KHÔNG trả `NaN`/`undefined` — kiểm chứng bằng unit test gọi hàm với
  `quota_bytes_available=0` VÀ với `null`/`undefined`, assert cả 2
  trường hợp đều trả `warn_triggered=1` mà không exception.

**Edge Cases**
- **AC-17** (đóng trình duyệt/OS kill giữa lúc ghi): GIVEN mock storage
  backend giả lập bị NGẮT ĐỘT NGỘT giữa transaction ghi atomic (không có
  cơ hội chạy bất kỳ code xử lý lỗi nào của Persistence — khác
  AC-03/AC-04 vốn giả lập lỗi CÓ TRẢ VỀ được qua exception bắt được),
  WHEN mô phỏng "khởi động lại" (tạo 1 instance Persistence mới trỏ tới
  cùng storage đã bị ngắt giữa chừng) rồi load lại slot đó, THEN trạng
  thái đọc được đúng bằng trạng thái TRƯỚC lần ghi bị ngắt, không có
  blob một phần nào xuất hiện. *(Cần mock storage backend hỗ trợ mô
  phỏng "ngắt giữa transaction" — nếu công nghệ lưu trữ thật, VD
  IndexedDB, không hỗ trợ mô phỏng cấp độ này trong unit test thuần, cần
  bổ sung 1 integration test riêng khi ADR chọn công nghệ lưu trữ cụ
  thể.)*
- **AC-18** (2 tab cùng mở 1 slot — race, phần đã đặc tả rõ): GIVEN mock
  2 "phiên" (tab) cùng cố mở 1 `slot_id`, tab A mở/ghi trước, WHEN tab B
  cố ghi vào cùng `slot_id` trong khi tab A đang giữ quyền ghi, THEN tab
  B bị từ chối thao tác ghi (trạng thái xung đột, read-only tạm thời),
  có thông báo phân biệt được với lỗi ghi thông thường (AC-04); tab A
  ghi thành công bình thường, không bị ảnh hưởng bởi tab B. *(Cần cơ chế
  giả lập đa-phiên/đa-luồng, không phải unit test đơn-luồng thông
  thường — xem Open Questions về điều kiện GIẢI PHÓNG khóa.)*
- **AC-19** (xóa slot đã khép cần xác nhận riêng): GIVEN 1 slot đã khép
  (read-only), WHEN gọi thao tác xóa mà KHÔNG đi qua bước xác nhận riêng
  (mô phỏng gọi trực tiếp API xóa chính, bỏ qua bước xác nhận), THEN
  thao tác xóa bị từ chối/không thực thi — chứng minh có 1 bước xác nhận
  bắt buộc, tách biệt khỏi lệnh xóa chính (không thể xóa bằng 1 lệnh gọi
  duy nhất). WHEN đi đúng quy trình 2 bước (yêu cầu xóa + xác nhận
  riêng), THEN slot bị xóa vĩnh viễn — đọc lại `slot_id` đó ngay sau đó
  trả về "không tồn tại".
- **AC-20** (`bundle_completeness_check` thất bại liên tiếp — không kẹt
  người chơi): GIVEN completeness check thất bại liên tiếp ≥3 lượt (mock
  1 hệ trả `ERROR` mọi lần) cho 1 slot, WHEN người chơi thoát ra màn
  hình chọn slot (không thao tác gì thêm trong slot lỗi), THEN thao tác
  thoát PHẢI thành công, không bị chặn bởi trạng thái lỗi của slot đó.
  WHEN sau đó chọn "Bắt đầu mới" hoặc mở 1 slot KHÁC, THEN thao tác đó
  không bị ảnh hưởng bởi lỗi của slot cũ. WHEN gọi Xuất QA log cho slot
  lỗi đó, THEN vẫn trả về đầy đủ dữ liệu từ bản commit gần nhất TRƯỚC
  chuỗi lỗi (không rỗng, không lỗi thêm).
- **AC-21** (Safari private mode fail ngay lượt đầu — thông báo khác
  biệt): GIVEN mock storage backend giả lập trả lỗi NGAY LẬP TỨC cho
  lượt ghi ĐẦU TIÊN của 1 slot MỚI (mô phỏng Safari private mode không
  hỗ trợ lưu trữ bền vững), WHEN Persistence bắt lỗi này, THEN nội
  dung/error code của thông báo trả về PHẢI khác với thông báo hết quota
  thông thường (AC-04) — kiểm chứng bằng assert 2 message/error_code
  khác nhau giữa 2 kịch bản mock (lỗi ngay lượt đầu của slot mới vs. lỗi
  giữa playthrough đã có nhiều lượt xác nhận trước đó).
- **AC-22** (QA export đọc bản commit gần nhất, không đọc dở dang):
  GIVEN mock 1 lần ghi atomic đang "chạy" (chèn 1 điểm chặn/blocking
  giữa quá trình ghi mock, mô phỏng ghi chưa commit xong), WHEN gọi Xuất
  QA log TRONG LÚC ghi đó chưa hoàn tất, THEN kết quả export khớp ĐÚNG
  bản đã commit GẦN NHẤT trước đó, không chứa bất kỳ phần nào của lượt
  đang ghi dở. WHEN lần ghi đó hoàn tất (commit thành công) và gọi
  export lại, THEN kết quả mới bao gồm lượt vừa commit.

## Open Questions

- **`quota_exhaustion_turn` chưa định nghĩa hành vi khi
  `quota_bytes ≤ fixed_blob_bytes`** (gap từ `qa-lead`, Công thức #1) —
  cần đặc tả rõ (lỗi? 0? âm?) trước khi implement đầy đủ. *(Owner:
  systems-designer, target: trước khi GDD này qua `/design-review`)*
- **Điều kiện GIẢI PHÓNG khóa khi 2 tab cùng mở 1 slot chưa định nghĩa**
  (gap từ `qa-lead`, Edge Cases) — Edge Case hiện chỉ nói tab đầu tiên
  được ghi, tab thứ 2 bị chặn, nhưng chưa nói khi nào/làm sao tab thứ 2
  hết bị chặn (tab A đóng sạch? crash không đóng sạch? timeout?).
  *(Owner: technical-director, target: ADR Persistence,
  `/create-architecture`)*
- **Timeout khi 1 hệ trả blob chậm/không phản hồi trong bước gom bundle
  chưa định nghĩa** (Công thức #2 tự flag, `qa-lead` xác nhận lại) — cần
  1 hằng số tương tự `ai_call_timeout_seconds`. *(Owner:
  technical-director, target: ADR Persistence)*
- **Schema `turn_snapshot` vẫn CHƯA được giải quyết bởi GDD này** —
  Persistence chủ động coi nó là 1 blob đối (Core Rule #2), nên open
  question gốc của `turn-manager.md` (field nào, ai sở hữu) vẫn còn treo
  nguyên. *(Owner: technical-director + systems-designer, target: trước
  `/design-system combat-system`, theo đúng target đã ghi ở
  `turn-manager.md`)*
- **Thuật toán nén vật lý cụ thể cho Nhật ký đầy đủ chưa chọn** (Core
  Rule #7, biến `compression_ratio` của Công thức #1) — GDD này chỉ đảm
  bảo tính chất "không mất nội dung logic" (AC-07), không chọn thuật
  toán. *(Owner: technical-director, target: `/create-architecture`)*
- **Hành vi IDBFS/localStorage thật trên Godot 4.6 HTML5 export chưa xác
  minh** — rủi ro HIGH đã flag ở Feasibility Brief đầu phiên thiết kế
  này (Emscripten sync tường minh, Safari ITP xóa dữ liệu sau ~7 ngày,
  private mode, mobile quota thấp) — không có tài liệu nào trong
  `docs/engine-reference/godot/` xác nhận hành vi này cho 4.6. *(Owner:
  technical-director, target: 1 technical spike trước
  `/create-architecture`)*
- **API trình duyệt cụ thể để đo `quota_bytes_available` (Công thức #3)
  chưa chọn** (VD: `StorageManager.estimate()` hay cơ chế khác qua
  JavaScriptBridge của Godot Web export). *(Owner: technical-director,
  target: ADR Persistence)*
- **Hành vi chia sẻ quota giữa nhiều slot chưa rõ** (Công thức #1 edge
  case: mỗi slot tính riêng nhưng cạnh tranh chung 1 quota trình duyệt)
  — thuộc cùng phạm vi ADR HTML5/IDBFS ở trên. *(Owner:
  technical-director, cùng target ADR HTML5/IDBFS)*
- **Khoảng trống phụ thuộc một chiều**: `equipment-skill-data-system.md`
  (Approved) chưa liệt kê Persistence/Save System trong Dependencies của
  chính nó — cần xử lý bằng footnote ở `systems-index.md` trước lần
  `/consistency-check` kế tiếp, theo đúng tiền lệ 4 lần trước trong dự
  án này. *(Owner: producer/systems-designer)*

**Đóng 1 Open Question của `turn-manager.md`**: câu hỏi "world_time và
lịch sử lượt cần 'inspect được' (qua save file hoặc debug UI) để kiểm
chứng AC-07/AC-08/AC-10 mà không cần đọc source code" (owner đề xuất:
qa-lead, target: GDD này) — **đã giải quyết** bởi Core Rule #9 (QA
export) + AC-09 của GDD này: thao tác xuất Nhật ký đầy đủ ra JSON cho
phép kiểm chứng trực tiếp mà không cần đọc source code. Đã đóng chéo tại
`turn-manager.md`.
