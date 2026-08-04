# AI/LLM Integration Layer

> **Status**: Designed — Pending Review
> **Author**: user + agents
> **Last Updated**: 2026-08-02
> **Implements Pillar**: Pillar 3 (Sức Mạnh Có Logic), Pillar 4 (Tường Thuật Sống Động)

## Overview

**AI/LLM Integration Layer** là điểm gọi DUY NHẤT trong toàn bộ game đi ra
ngoài tới dịch vụ AI/LLM (Gemini API) — mọi hệ thống khác (Turn Manager, và
sau này Combat/Situation Generation) không bao giờ tự gọi API AI trực tiếp,
mà luôn đi qua wrapper của tầng này, đúng như Core Rule #5-6 của
Mechanic/Narration Contract Enforcement yêu cầu. Tầng này chịu trách
nhiệm: dựng đúng prompt (khác nhau cho `narration_call` có `locked_result`
và `suggestion_call` không có), gọi API, xử lý lỗi/timeout/retry, và trả
text nguyên văn — không bao giờ tự diễn giải hay chỉnh sửa nội dung.

Với người chơi, tầng này là lý do thế giới "luôn trả lời" — không phải
theo nghĩa AI không bao giờ lỗi (mạng/API vẫn có thể trục trặc), mà theo
nghĩa khi trục trặc xảy ra, người chơi không bao giờ thấy một câu chuyện
gãy giữa chừng hay bị khóa cứng: hệ thống tự thử lại, đổi sang model dự
phòng nếu cần, và chỉ báo lỗi rõ ràng khi thực sự hết cách — chưa từng
mất lượt hay mất dữ liệu vì một lần gọi API thất bại. Đây cũng là nơi
quyết định liệu thế giới có thể kể một cảnh 18+ trực diện (Pillar 5) hay
tự động né tránh/làm mờ nó — một lựa chọn hạ tầng (chọn backend + cấu
hình `safetySettings`) mà người chơi cảm nhận được ngay ở việc nội dung
có "dám" đi tới đâu.

## Player Fantasy

*(`creative-director` không được tham vấn cho section này — Lean mode, đây
không phải section rủi ro cao theo quy tắc của skill (chỉ Formulas và
Acceptance Criteria luôn spawn specialist ở lean mode). Nên xem lại thủ
công nếu cần tinh chỉnh giọng văn trước production.)*

Người chơi không tương tác trực tiếp với tầng này — không có màn hình,
không có nút bấm riêng cho "AI/LLM Integration Layer". Nhưng nó là lý do
một trải nghiệm tiểu thuyết tương tác AI KHÔNG cảm thấy mong manh: người
chơi không bao giờ phải tự hỏi "lỡ API lỗi thì mất lượt này không?", "lỡ
AI từ chối viết cảnh này thì sao?", hay "sao đợi lâu vậy, có bị treo
không?". Sự vắng mặt của những nghi ngờ đó chính là player fantasy của hệ
này — giống Contract Enforcement (đảm bảo AI không nói dối), nhưng ở một
trục khác: đảm bảo AI luôn SẴN SÀNG trả lời, đúng giọng, đúng mức độ nội
dung được phép, và không bao giờ để một trục trặc kỹ thuật (mạng, quota,
model quá tải) làm gãy mạch trải nghiệm hay làm mất dữ liệu lượt chơi.

Đây cũng là nơi Pillar 5 (Tự Do Nhập Vai) được "cấp phép" ở tầng hạ tầng:
người chơi cảm nhận được sự khác biệt giữa một thế giới dám kể thẳng một
cảnh 18+ theo đúng phong cách roleplay họ chọn, và một thế giới né
tránh/làm mờ nó — dù họ không bao giờ thấy dòng code `safetySettings`
đứng sau quyết định đó.

## Detailed Design

### Core Rules

1. **Điểm gọi API AI duy nhất**: Toàn bộ game chỉ có MỘT nơi gọi ra API
   AI/LLM bên ngoài — tầng này. Không hệ thống nào khác (Turn Manager,
   Combat, Situation/Encounter Generation...) được phép tự gọi API trực
   tiếp, đúng theo Core Rule #5-6 của Mechanic/Narration Contract
   Enforcement.
2. **Hai loại lệnh gọi, hai khuôn prompt khác nhau**:
   - `narration_call`: LUÔN đi kèm `locked_result` (dữ kiện cơ học đã
     khóa). Wrapper tự chèn `locked_result` + ngữ cảnh World Memory + chỉ
     thị "chỉ tường thuật, cấm nêu số liệu thô, cấm tự đổi outcome"
     (Checkpoint 1-2 của Contract Enforcement). Output: text tự do
     (narration_text).
   - `suggestion_call`: KHÔNG có `locked_result` (tình huống mở, chưa có
     kết quả cơ học nào). Wrapper chèn tình huống hiện tại + lịch sử liên
     quan + chỉ thị "đề xuất đúng 4 hành động khả thi, không trùng lặp".
     Output: JSON có schema bắt buộc — mảng đúng 4 chuỗi (không phải text
     tự do cần parse) — dùng `response_mime_type: application/json` +
     `response_schema`, đúng pattern đã chạy thật trong `src/reference.md`.
   - Cả hai loại đều bắt buộc đi qua CÙNG MỘT hàm wrapper
     (`request_ai(call_type, payload)`), không phải 2 hàm tách biệt —
     tránh Feature system chọn nhầm luồng.
3. **Retry mạng KHÔNG phải retry nội dung — hai khái niệm tách biệt hoàn
   toàn**:
   - **Retry mạng** (nội bộ tầng này, VÔ HÌNH với caller): khi HTTP
     request lỗi tạm thời (503 quá tải, timeout kết nối), tầng này TỰ
     ĐỘNG thử lại — đổi sang model dự phòng trong danh sách nếu model
     hiện tại liên tục quá tải (đã kiểm chứng pattern này trong
     `src/reference.md`: danh sách model dự phòng có thứ tự, cooldown
     riêng cho model vừa bị đánh dấu quá tải). Toàn bộ quá trình này tính
     là **1 lệnh gọi logic duy nhất** đối với caller (Turn Manager) —
     KHÔNG được tính thêm vào `calls_per_turn`, dù bên trong có thể có
     nhiều HTTP request thực tế.
   - **Retry nội dung** (do CALLER — Turn Manager — chủ động gọi lại): khi
     `suggestion_call` THÀNH CÔNG về mặt mạng nhưng nội dung trả về không
     đạt yêu cầu (< 4 gợi ý duy nhất — Edge Case của `turn-manager.md`),
     Turn Manager gọi lại một `suggestion_retry_call` MỚI — đây LÀ một
     lệnh gọi logic thứ hai, tính vào `calls_per_turn` (đúng theo
     `ai_call_budget_per_turn` đã đăng ký ở registry: tối đa 1 lần retry
     loại này/lượt).
   - Tầng này không tự quyết định khi nào cần retry nội dung — đó là
     quyết định của caller dựa trên việc kiểm tra output (đếm số gợi ý
     duy nhất).
4. **Model dự phòng, không hard-code 1 model duy nhất**: Cấu hình phải hỗ
   trợ một DANH SÁCH model theo thứ tự ưu tiên (không phải 1 model cứng)
   — model nào bị đánh dấu quá tải (503 liên tục) sẽ tạm bị bỏ qua trong
   một khoảng cooldown, tự động rơi xuống model kế tiếp trong danh sách.
   Danh sách model cụ thể (tên/version) là giá trị cấu hình (config),
   KHÔNG hard-code trong code hay trong GDD này — theo đúng nguyên tắc
   data-driven của `coding-standards.md`. *(Tham khảo: `src/reference.md`
   đã validate pattern này với `GEMINI_TEXT_MODEL_FALLBACKS`.)*
5. **Phân loại lỗi rõ ràng, không gộp chung**: Lỗi API phải phân biệt tối
   thiểu 3 loại, mỗi loại xử lý khác nhau:
   - **Quá tải tạm thời** (HTTP 503): retry mạng tự động + đổi model dự
     phòng (Core Rule #3).
   - **Hết quota** (HTTP 429): KHÔNG retry mạng vô hạn — báo lỗi ngay cho
     caller kèm thông tin thời gian chờ đề xuất (nếu API trả về), để Turn
     Manager kích hoạt Edge Case "lệnh gọi AI thất bại".
   - **Key không hợp lệ/bị từ chối quyền** (403/permission denied): KHÔNG
     retry — báo lỗi cấu hình ngay, đây là lỗi setup không tự phục hồi
     được.
   - Sau khi đã thử hết các model dự phòng (Core Rule #4) mà vẫn lỗi 503,
     hoặc gặp lỗi 429/403: tầng này trả về **Failed** cho caller — không
     bao giờ tự "giả lập" một kết quả để che lỗi.
6. **API key phía client, không qua backend server**: Đúng theo quyết định
   đã chốt ở `game-concept.md` (dự án cá nhân phi thương mại, chấp nhận lộ
   key client-side) — tầng này gọi thẳng API AI từ client, hỗ trợ 2 chế độ:
   key mặc định của dự án (giới hạn quota) hoặc key người dùng tự nhập
   (lưu cục bộ, không gửi lên server nào khác). Không có phương án backend
   proxy ở MVP.
7. **`safetySettings` nới lỏng có chủ đích, cấu hình cố định**: Cấu hình an
   toàn nội dung của API phải được nới (`BLOCK_NONE` cho các category liên
   quan đến nội dung người lớn) để phục vụ Pillar 5 — đây là 1 cấu hình HỆ
   THỐNG cố định áp dụng cho mọi lệnh gọi, không phải một tham số bật/tắt
   theo từng lượt hay theo lựa chọn UI. *(Đã kiểm chứng cần thiết qua
   `prototypes/khe-uoc-ai-concept/REPORT.md`.)*
8. **Timeout khớp `ai_call_timeout_seconds` của Turn Manager**: Mỗi lệnh
   gọi (kể cả các lần retry mạng nội bộ, tính tổng) phải hoàn tất hoặc
   thất bại trong vòng 30 giây (giá trị đã đăng ký ở registry, nguồn
   `turn-manager.md`) — vượt ngưỡng này tầng này phải trả Failed do
   timeout, kể cả khi vẫn đang trong chuỗi retry mạng nội bộ.

### States and Transitions

Tầng này không phải state machine toàn cục (không có "phiên" hay "lượt"
riêng) — mỗi lệnh gọi có một vòng đời độc lập:

| State | Mô tả | Chuyển sang |
|---|---|---|
| Idle | Chưa có lệnh gọi nào đang chạy | → Requesting (khi caller gọi `request_ai`) |
| Requesting | Đã gửi HTTP request tới model hiện tại (ưu tiên cao nhất còn khả dụng trong danh sách dự phòng) | → Success (phản hồi hợp lệ) HOẶC → Retrying-Network (lỗi 503/timeout, còn model/thời gian) HOẶC → Failed (429/403, hoặc hết model/hết thời gian) |
| Retrying-Network | Đang chờ backoff hoặc đang chuyển sang model dự phòng kế tiếp (vô hình với caller) | → Requesting (thử lại) |
| Success | Nhận được text (narration) hoặc JSON hợp lệ đúng schema (suggestion) | → Idle (trả kết quả cho caller) |
| Failed | Đã hết cách (hết model dự phòng, hết thời gian, hoặc lỗi không retry-được) | → Idle (trả lỗi cho caller — Turn Manager xử lý theo Edge Case "lệnh gọi AI thất bại") |

### Interactions with Other Systems

- **Turn Manager**: gọi `request_ai(narration_call | suggestion_call |
  suggestion_retry_call, payload)` tối đa 3 lần/lượt
  (`ai_call_budget_per_turn`, đã khóa ở registry). Khi tầng này trả
  **Failed**, Turn Manager coi lượt đó CHƯA xác nhận (Edge Case đã định
  nghĩa ở `turn-manager.md`) — world_time không tăng, không tính vào lượt
  undo.
- **Mechanic/Narration Contract Enforcement**: tầng này CHÍNH LÀ nơi
  triển khai wrapper mà Core Rule #5-6 của hệ đó yêu cầu — Checkpoint 1
  (yêu cầu `locked_result`) chỉ áp dụng khi `call_type = narration_call`
  (Core Rule #2 ở trên); Checkpoint 2 (dựng prompt) do tầng này sở hữu
  hoàn toàn, Feature system không tự viết prompt string.
- **Equipment & Skill Data System**: `style_descriptor` (dữ liệu ngữ cảnh
  phong cách thi triển thức) được tầng này chèn vào prompt của
  `narration_call` khi trận đấu liên quan — đây là context data, không
  phải `locked_result`, không chịu Checkpoint 1.
- **Combat System, Situation/Encounter Generation** (đã Designed): sẽ
  gọi qua cùng wrapper này khi được thiết kế — hợp đồng giao diện (2 loại
  call_type, format input/output) đã cố định ở GDD này, các hệ đó chỉ cần
  cung cấp đúng `locked_result`/tình huống theo đúng call_type phù hợp.

## Formulas

*(Các công thức dưới đây là công thức hạ tầng/độ tin cậy (reliability), KHÔNG
phải công thức cân bằng gameplay — không có RNG, không có damage/EXP. Mục
tiêu: đảm bảo 1 lệnh gọi logic luôn resolve (Success hoặc Failed) trong đúng
`ai_call_timeout_seconds` đã khóa ở registry, và không bao giờ làm rò rỉ số
lần thử mạng nội bộ vào `calls_per_turn`. Đề xuất bởi `systems-designer`.)*

**1. Network Retry Backoff Delay**

`w(attempt_index, error_class) = overload_retry_wait_seconds` nếu `error_class = OVERLOADED`; `= transient_retry_base_seconds × (attempt_index + 1)` nếu `error_class = TRANSIENT_OTHER`

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Thời gian chờ trước lần thử lại | w | float (giây) | > 0 | Thời gian chờ trước khi thử lại — CÙNG một model — sau 1 lỗi mạng tạm thời |
| Số lần đã thử trên cùng 1 model | attempt_index | int | 0 → (max_same_model_attempts−1) | Đếm số lần thử liên tiếp trên CÙNG model hiện tại; reset về 0 ngay khi chuyển sang model dự phòng khác |
| Loại lỗi tạm thời | error_class | enum | {OVERLOADED, TRANSIENT_OTHER} | OVERLOADED = HTTP 503 quá tải; TRANSIENT_OTHER = timeout kết nối/lỗi mạng khác. KHÔNG áp dụng cho 429/403 (2 loại này không bao giờ gọi hàm này — xem Core Rule #5, không retry) |
| Thời gian chờ cố định cho 503 | overload_retry_wait_seconds | float (giây) | tuning knob, đề xuất 2 | Khớp `src/reference.md` (hardcode 2000ms cho lỗi 503) |
| Hệ số nền backoff | transient_retry_base_seconds | float (giây) | tuning knob, đề xuất 1 | Khớp `src/reference.md` (`retryDelay` mặc định 1000ms), nhân tuyến tính theo attempt_index+1 |

**Output Range**: w luôn dương, không bao giờ 0 — tránh spam request tức
thời. w KHÔNG được tính/gọi ở lần thử CUỐI CÙNG được phép trên 1 model (khi
`attempt_index = max_same_model_attempts_overloaded − 1` và vẫn 503): thay vì
chờ rồi thử lại, hệ thống đánh dấu model quá tải ngay và chuyển sang model
dự phòng kế tiếp (không có khoảng chờ ở bước chuyển tiếp này — xem Formula 3).
**Example**: `overload_retry_wait_seconds=2`, `transient_retry_base_seconds=1`.
`w(0, OVERLOADED) = 2 giây`. `w(1, TRANSIENT_OTHER) = 1 × (1+1) = 2 giây`.
`w(2, TRANSIENT_OTHER) = 1 × (2+1) = 3 giây`.

**2. AI Call Time Budget**

`t_elapsed(n) = Σ(i=1→n) [d_i + w_i]`; `t_remaining(n) = ai_call_timeout_seconds − t_elapsed(n)`; cho phép thử lần n+1 khi và chỉ khi `t_remaining(n) > w_(n+1)`

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Thời gian thực tế của lần thử i | d_i | float (giây) | ≥ 0 | Thời gian round-trip HTTP thực đo được của lần thử thứ i (không phải hằng số cấu hình) |
| Thời gian chờ trước lần thử i | w_i | float (giây) | ≥ 0 | Tính theo Formula 1; = 0 nếu i=1 hoặc nếu đây là lần thử đầu tiên ngay sau khi vừa chuyển sang model dự phòng mới |
| Số thứ tự lần thử HTTP | n | int | 1 → ∞ (bị chặn thực tế bởi ngân sách) | Đếm xuyên suốt TOÀN BỘ lệnh gọi logic — không reset khi đổi model (khác `attempt_index` ở Formula 1) |
| Ngân sách thời gian tối đa | ai_call_timeout_seconds | float (giây) | 10–60 (hằng số đã khóa registry, giá trị hiện tại = 30, nguồn `turn-manager.md`) | Tổng thời gian tối đa cho TOÀN BỘ 1 lệnh gọi logic — mọi network-retry + model fallback cộng dồn phải nằm trong ngưỡng này |
| Thời gian đã trôi qua | t_elapsed(n) | float (giây) | 0 → ai_call_timeout_seconds | Tổng thời gian tính đến sau lần thử thứ n |
| Thời gian còn lại | t_remaining(n) | float (giây) | 0 → ai_call_timeout_seconds | Ngân sách còn lại; quyết định có được phép thử tiếp hay không |

**Output Range**: `t_elapsed(n)` bị chặn cứng ở `ai_call_timeout_seconds` —
hệ thống chủ động dừng TRƯỚC khi bắt đầu một lần thử mới nếu điều kiện gate
không thỏa (`t_remaining(n) ≤ w_(n+1)`), và mọi HTTP request đơn lẻ phải
được gọi với timeout cứng = `min(request_timeout_default, t_remaining(n))`
để không tự kéo dài vượt ngân sách còn lại. Khi gate chặn, lệnh gọi trả
**Failed** (lý do: timeout) ngay lập tức, bất kể còn model dự phòng hay
lượt retry nào chưa dùng. Giá trị `ai_call_timeout_seconds` càng nhỏ (biên
dưới 10s) thì số lần fallback+retry khả thi trong thực tế càng ít — đây là
đánh đổi tất yếu, không phải bug; ở biên trên 60s, toàn bộ danh sách model
dự phòng có khả năng được thử đầy đủ kể cả khi model nào cũng 503.
**Example (đường thường)**: model đầu tiên thành công ngay, `d_1 = 0.8s`
→ `t_elapsed(1) = 0.8s`, `t_remaining(1) = 29.2s` — Success, gần như không
chạm tới ngân sách.
**Example (fallback nhẹ)**: `ai_call_timeout_seconds=30`. Model A: `d_1=1s`
(503) → `w_1=2s` → `d_2=1s` (503, hết lượt retry cùng model) → đánh dấu quá
tải, chuyển Model B ngay (`w=0`) → Model B: `d_3=1s` (thành công).
`t_elapsed(3) = (1+2)+(1+0)+1 = 5s`, `t_remaining(3) = 25s` — Success ở
giây thứ 5, còn dư 25s không dùng tới.
**Example (biên — timeout do hết ngân sách)**: mỗi lần thử mất `5s` (mạng
quá tải diện rộng). Model A: 2 lần thử 503 (`5+2+5=12s`) → quá tải → Model
B: 2 lần thử 503 (`+5+2+5=24s`) → quá tải → Model C: lần thử thứ nhất bắt
đầu ở `t=24s` (`t_remaining=6s`), thất bại 503 sau `5s` → `t_elapsed=29s`,
`t_remaining=1s`. Lần thử kế tiếp cần `w_next=2s` (Formula 1) nhưng
`t_remaining(1s) ≤ w_next(2s)` → gate CHẶN → lệnh gọi trả **Failed** (timeout)
ngay tại `t=29s`, không chờ thêm, dù về lý thuyết Model C vẫn còn "sống".

**3. Model Fallback Selection**

`ladder(M, cooldown_until, t_now) = healthy(M, cooldown_until, t_now)` nếu khác rỗng, ngược lại `= M`; với `healthy(M, cooldown_until, t_now) = [m ∈ M : cooldown_until(m) ≤ t_now]` (giữ nguyên thứ tự M); `next_model(ladder, tried) = ` phần tử đầu tiên của `ladder` chưa thuộc `tried`, hoặc `NONE` nếu không còn

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Danh sách model dự phòng | M | list\<string\> | 1..N phần tử, thứ tự ưu tiên cố định | Config data-driven (`GEMINI_TEXT_MODEL_FALLBACKS` pattern, đã validate ở `src/reference.md`) — KHÔNG hard-code tên model trong GDD/code logic |
| Thời điểm hết cooldown của model m | cooldown_until(m) | timestamp | 0 hoặc thời điểm tương lai | 0 = model m hiện không bị đánh dấu quá tải |
| Thời điểm hiện tại | t_now | timestamp | — | Thời điểm cần chọn model kế tiếp |
| Các model đã thử trong lệnh gọi này | tried | set\<string\> | ⊆ M | Reset về rỗng mỗi khi bắt đầu 1 lệnh gọi logic mới |
| Thời lượng cooldown khi đánh dấu quá tải | model_cooldown_seconds | float (giây) | tuning knob, đề xuất 90 | Khớp `src/reference.md` (`OVERLOADED_MODEL_COOLDOWN_MS` = 90000ms) |
| Model được chọn để thử tiếp | next_model | string \| NONE | ∈ M ∪ {NONE} | Kết quả của formula — model dự phòng kế tiếp cần gọi |

**Output Range**: `next_model ∈ M` khi vẫn còn phần tử của `ladder` chưa thử;
`= NONE` khi đã thử hết mọi phần tử của `ladder` → lệnh gọi kết thúc
**Failed** với lý do "hết model dự phòng" (phân biệt rõ với lý do timeout ở
Formula 2 — 2 lý do Failed khác nhau, phải log riêng). **Trường hợp suy
biến `|M| = 0`** (danh sách rỗng do lỗi cấu hình): `next_model` luôn = NONE
ngay từ đầu, chưa từng gửi request nào — đây là **lỗi cấu hình** (cùng nhóm
với 403/permission denied), phải log riêng biệt, không được gộp chung với
"hết model do quá tải" hay "hết giờ do timeout". **Trường hợp tất cả model
đang cooldown đồng thời**: `healthy(...)` rỗng → `ladder` rơi về TOÀN BỘ `M`
gốc (chấp nhận thử lại model có thể vẫn đang quá tải) — vì cooldown chỉ là
ước đoán, không phải đảm bảo, và thà thử còn hơn Failed ngay trong khi
Formula 2 vẫn còn ngân sách thời gian.
**Example**: `M=[A,B,C]`, `t_now=100`, `cooldown_until: A=150, B=0, C=0` →
`healthy=[B,C]` → `ladder=[B,C]`. `next_model(ladder,{})=B`. B thất bại →
`tried={B}` → `next_model(ladder,{B})=C`. C cũng thất bại → `tried={B,C}=ladder`
→ `next_model=NONE` → Failed ("hết model dự phòng").
**Example (suy biến — tất cả cooldown)**: `cooldown_until: A=150,B=140,C=160`,
`t_now=100` → `healthy=[]` → `ladder` rơi về `[A,B,C]` (full) →
`next_model(ladder,{})=A` — thử lại từ đầu danh sách gốc dù A vẫn "trên lý
thuyết" đang cooldown.

**4. Logical Call Accounting** (invariant, không phải công thức cần tính runtime)

`calls_per_turn = Σ(c ∈ calls_this_turn) 1` — **KHÔNG PHẢI** `Σ(c ∈ calls_this_turn) http_attempt_count(c)`

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Tập lệnh gọi logic trong lượt | calls_this_turn | set\<call\> | ⊆ {narration_call, suggestion_call, suggestion_retry_call} | Khớp `ai_call_budget_per_turn` đã khóa registry (nguồn `turn-manager.md`) |
| Một lệnh gọi logic cụ thể | c | call instance | 1 phần tử của calls_this_turn | 1 lần Turn Manager gọi `request_ai(call_type, payload)` — bất kể bên trong tốn bao nhiêu HTTP request thực tế |
| Số HTTP attempt thực tế bên trong 1 lệnh gọi logic | http_attempt_count(c) | int | ≥ 1 | Biến NỘI BỘ của tầng này — tính cả mọi network-retry (Formula 1) + model fallback (Formula 3); KHÔNG BAO GIỜ được truyền ra ngoài hay cộng vào calls_per_turn |
| Số lệnh gọi logic trong lượt | calls_per_turn | int | [0, 3] (đã khóa registry `calls_per_turn_max`) | Biến DUY NHẤT mà Turn Manager theo dõi để enforce giới hạn 3 lệnh/lượt |

**Output Range**: `calls_per_turn ∈ [0,3]` — mỗi số hạng trong tổng luôn = 1
bất kể `http_attempt_count(c)` là bao nhiêu (có thể từ 1 đến hàng chục nếu
nhiều model fallback + nhiều network-retry cộng dồn), vì đây là **invariant
cứng**: một implementation cộng `http_attempt_count(c)` vào `calls_per_turn`
là BUG, không phải một giá trị hợp lệ khác của hệ thống.
**Example**: 1 lượt có `suggestion_call` (nội bộ: model A 503 → model B 503
→ model C thành công, `http_attempt_count=3`) rồi `narration_call` (nội bộ:
thành công ngay lần đầu, `http_attempt_count=1`). `calls_per_turn = 1 + 1 = 2`
(KHÔNG PHẢI `3+1=4`). Tổng HTTP request thực tế gửi ra ngoài trong lượt này
= `3+1=4`, nhưng con số này không xuất hiện trong bất kỳ biến đếm nào mà
Turn Manager dùng để enforce giới hạn.
**Example (biên — full 3 lệnh/lượt)**: nếu `suggestion_retry_call` cũng xảy
ra (AI trả về <4 gợi ý ở lần gọi đầu), `calls_per_turn = 3` — đúng bằng
`calls_per_turn_max` — bất kể tổng `http_attempt_count` của cả 3 lệnh gọi
đó là 3 hay 15.

## Edge Cases

- **Nếu `narration_call` thất bại SAU KHI Feature system đã khóa
  `locked_result` vào bộ nhớ**: tầng này CHỈ retry lại chính lệnh gọi AI
  (dùng NGUYÊN `locked_result` đã khóa, không tính toán lại — vì recompute
  có thể ra kết quả khác nếu có RNG, vi phạm nguyên tắc "kết quả đã khóa là
  bất khả kháng"). Nếu retry nội bộ (Formula 1-3) cũng hết cách → trả
  **Failed** cho Turn Manager; việc `locked_result` đang treo trong bộ nhớ
  có bị giữ lại chờ thử lại lượt sau hay bị hủy hoàn toàn là trách nhiệm
  của Turn Manager/Feature system (Core Rule #8 của `turn-manager.md` —
  chưa "final" cho đến khi lượt xác nhận), KHÔNG phải việc của tầng này.
- **Nếu `suggestion_call` trả về JSON không hợp lệ so với schema** (bị cắt
  cụt do giới hạn token, JSON malformed) dù HTTP status 200 OK: đây là lỗi
  **parse response**, KHÔNG phải lỗi mạng (Formula 1) và KHÔNG phải "retry
  nội dung" của Turn Manager (Core Rule #3 — vốn dành cho trường hợp JSON
  hợp lệ nhưng <4 gợi ý duy nhất). Tầng này tự động retry nội bộ (tối đa 1
  lần, tính vào cùng ngân sách thời gian ở Formula 2, KHÔNG tính thêm vào
  `calls_per_turn`) trước khi coi là Failed — Turn Manager không bao giờ
  thấy một JSON hỏng, chỉ thấy Success (JSON hợp lệ) hoặc Failed.
- **Nếu lệnh gọi Success nhưng `narration_text` chứa số liệu rò rỉ
  (leak)**: KHÔNG phải trách nhiệm của tầng này phát hiện hay chặn — đó là
  việc của Formula 1 (Numeric Leak Detection) thuộc Mechanic/Narration
  Contract Enforcement, chạy hậu-kiểm (post-hoc) trên kết quả tầng này đã
  trả về. Tầng này chỉ có nhiệm vụ trả text nguyên văn.
- **Nếu tất cả model trong danh sách dự phòng đều đang cooldown cùng
  lúc**: xem Formula 3 — `ladder` rơi về toàn bộ danh sách gốc, hệ thống
  chấp nhận thử lại model có thể vẫn đang quá tải (thà thử còn hơn Failed
  ngay), miễn còn ngân sách thời gian (Formula 2).
- **Nếu danh sách model dự phòng rỗng** (`|M|=0`, lỗi cấu hình): Failed
  ngay lập tức, lý do "lỗi cấu hình" — log riêng biệt, KHÔNG gộp chung với
  "hết model do quá tải" (Formula 3) hay "hết giờ do timeout" (Formula 2),
  vì đây là lỗi setup cần sửa code/config, không phải tình huống runtime
  bình thường.
- **Nếu 2 lệnh gọi được yêu cầu "đồng thời"** (về mặt lý thuyết — VD
  prefetch gợi ý cho lượt kế trong khi lượt hiện tại còn đang tường
  thuật): tầng này xử lý TUẦN TỰ, không hỗ trợ song song — đây là game
  single-player, turn-based, không có nhu cầu concurrency; lệnh gọi thứ 2
  phải đợi lệnh gọi thứ nhất kết thúc (Success hoặc Failed) mới bắt đầu.
- **Nếu `suggestion_retry_call` (retry nội dung do Turn Manager chủ động
  gọi) cũng gặp lỗi mạng/timeout**: xử lý HỆT như mọi lệnh gọi logic khác
  (Formula 1-3 đầy đủ) — không có luồng đặc biệt nào cho lệnh gọi retry.
  Nếu Failed, Turn Manager áp dụng đúng Edge Case "lệnh gọi AI thất bại"
  của `turn-manager.md` — lượt chưa xác nhận, dù đây đã là lệnh gọi thứ 3
  trong lượt.
- **Nếu người dùng đang ở chế độ `apiMode='userKey'` nhưng chưa nhập key**
  (hoặc key rỗng): Failed ngay lập tức, lý do "chưa cấu hình" — KHÔNG gửi
  request nào ra ngoài (tránh lãng phí thời gian ngân sách 30s cho một lỗi
  đã biết trước).

## Dependencies

**Phụ thuộc vào (upstream)**:
- **Mechanic/Narration Contract Enforcement** (Foundation, Approved) — GDD
  này triển khai wrapper interface mà Core Rule #5-6 của hệ đó yêu cầu;
  Checkpoint pipeline (Checkpoint 1 chỉ áp dụng `narration_call`) là ràng
  buộc bắt buộc cho thiết kế Section C ở trên.

**Các hệ thống phụ thuộc vào (downstream)**, kèm giao diện dữ liệu cụ thể:
- **Turn Manager** (Foundation, Approved) — gọi `request_ai(call_type,
  payload)` tối đa 3 lần/lượt; nhận về text (narration) hoặc JSON 4 gợi ý
  (suggestion), hoặc tín hiệu Failed để kích hoạt Edge Case "lệnh gọi AI
  thất bại" của chính nó.
- **Combat System** (Feature, đã Designed) — sẽ gọi `narration_call` với
  `locked_result` chiến đấu + `style_descriptor` (từ Equipment & Skill
  Data System) khi được thiết kế.
- **Situation/Encounter Generation** (Feature, đã Designed) — sẽ gọi
  `suggestion_call`/tạo tình huống mở qua cùng wrapper khi được thiết kế.

*(Phát hiện tương tự đã gặp 2 lần trước, cùng dạng với cạnh Turn Manager ↔
Contract Enforcement: `systems-index.md` hiện liệt kê Turn Manager là
Foundation/zero-deps và KHÔNG ghi nhận cạnh "Turn Manager phụ thuộc AI/LLM
Integration Layer" — dù Turn Manager gọi thẳng vào tầng này. Xem Open
Questions; sẽ xử lý bằng footnote ở `systems-index.md`, không cấu trúc lại
bảng Systems Enumeration, giống tiền lệ trước.)*

## Tuning Knobs

| Knob | Default | Safe Range | Ảnh hưởng nếu chỉnh |
|---|---|---|---|
| `overload_retry_wait_seconds` | 2 | 1–5 | Thời gian chờ cố định trước khi thử lại cùng model sau lỗi 503 (Formula 1). Quá thấp → spam request vào model đang quá tải, dễ bị rate-limit thêm; quá cao → tốn ngân sách 30s nhanh hơn, giảm số lần fallback khả thi. |
| `transient_retry_base_seconds` | 1 | 0.5–3 | Hệ số nền backoff tuyến tính cho lỗi mạng khác 503 (Formula 1). Quá thấp → không đủ thời gian để lỗi mạng thoáng qua tự phục hồi; quá cao → tốn ngân sách nhanh. |
| `max_same_model_attempts_overloaded` | 1 | 1–2 | Số lần thử lại TỐI ĐA trên CÙNG 1 model khi gặp 503 trước khi chuyển sang model dự phòng (Formula 1/3). Quá cao → lãng phí ngân sách thời gian trên một model đã biết đang quá tải thay vì chuyển sớm. |
| `max_same_model_attempts_transient` | 2 | 1–3 | Số lần thử lại tối đa trên cùng 1 model cho lỗi mạng khác 503 (timeout, mất kết nối thoáng qua). Khớp `src/reference.md` (`maxRetries=2` mặc định). |
| `model_cooldown_seconds` | 90 | 30–300 | Thời lượng 1 model bị đánh dấu quá tải, tạm bỏ qua khỏi danh sách ưu tiên (Formula 3). Quá ngắn → quay lại thử model vẫn còn quá tải; quá dài → bỏ lỡ cơ hội dùng lại model tốt nhất sớm hơn khi nó đã hồi phục. |
| `request_timeout_default` | 15 | 10–20 | Trần thời gian tối đa cho MỘT HTTP request đơn lẻ (Formula 2 dùng `min(request_timeout_default, t_remaining(n))`). Đặt thấp hơn `ai_call_timeout_seconds` (30) có chủ đích — đảm bảo luôn còn ngân sách cho ít nhất 1 lần fallback dù request đầu tiên treo tối đa; đặt bằng hoặc cao hơn 30 sẽ vô hiệu hóa khả năng fallback hoàn toàn. |

*(`ai_call_timeout_seconds=30` và `calls_per_turn_max=3` KHÔNG lặp lại ở
đây — đã là hằng số khóa ở registry, nguồn `turn-manager.md`, xem
Formulas #2 và #4 ở trên.)*

## Visual/Audio Requirements

[To be designed]

## UI Requirements

[To be designed]

## Acceptance Criteria

*(Đề xuất bởi `qa-lead`. Toàn bộ AC dùng phương pháp kiểm chứng thống nhất:
mock/spy trên tầng HTTP client (không gọi API thật) + fake clock cho mọi
khẳng định về thời gian/timeout, đúng nguyên tắc Determinism của
`coding-standards.md` — vì điều kiện mạng thật không thể test tất định
được. AC-01 là ngoại lệ duy nhất về phương pháp (static check trên codebase
thay vì runtime mock) vì bản chất Core Rule #1 là ràng buộc kiến trúc,
không phải hành vi runtime riêng của tầng này.)*

**Core Rules**

- **AC-01** (R1, điểm gọi API duy nhất): GIVEN toàn bộ codebase, WHEN quét
  tất cả nơi gọi HTTP ra ngoài tới endpoint AI (Gemini API), THEN chỉ có
  module của tầng này chứa lệnh gọi đó — mọi module khác (Turn Manager,
  Combat, Situation/Encounter Generation...) không có bất kỳ lệnh gọi HTTP
  trực tiếp nào tới endpoint AI. *(Kiểm chứng bằng static check/scan trên
  source, KHÔNG phải mock HTTP runtime.)*
- **AC-02** (R2a, `narration_call` bắt buộc `locked_result`): GIVEN gọi
  `request_ai(narration_call, payload)` với payload KHÔNG có
  `locked_result`, WHEN xử lý, THEN bị từ chối/raise lỗi validation TRƯỚC
  khi gửi request ra ngoài (0 HTTP request phát sinh — kiểm chứng qua spy
  đếm số lần HTTP mock được gọi = 0). GIVEN payload có `locked_result` hợp
  lệ, WHEN request được dựng, THEN request gửi tới HTTP mock chứa đúng
  `locked_result` + ngữ cảnh World Memory được truyền vào.
- **AC-03** (R2b, schema bắt buộc của `suggestion_call`): GIVEN gọi
  `request_ai(suggestion_call, payload)` với HTTP mock trả về đúng schema
  (`response_mime_type: application/json` + mảng 4 chuỗi), WHEN parse kết
  quả, THEN trả về đúng mảng 4 phần tử string duy nhất; đồng thời spy xác
  nhận request GỬI ĐI có kèm `response_mime_type` và `response_schema`
  đúng như pattern đã validate ở `src/reference.md`.
- **AC-04** (R2c, một hàm wrapper duy nhất): GIVEN cả hai loại
  `narration_call` và `suggestion_call` được gọi trong cùng 1 test session,
  WHEN kiểm tra code path, THEN cả hai đều đi qua đúng MỘT điểm vào
  `request_ai(call_type, payload)` — không có hàm/entry point thứ hai nào
  phát sinh HTTP request (kiểm chứng bằng spy gắn ở tầng HTTP thấp nhất:
  chỉ 1 call site gọi tới nó).
- **AC-05** (R3a, retry mạng vô hình + tính là 1 lệnh gọi logic): GIVEN
  HTTP mock trả 503 hai lần liên tiếp rồi thành công ở lần thử thứ 3 (cùng
  model), WHEN `request_ai` resolve, THEN caller nhận đúng 1 kết quả
  Success duy nhất, và `http_attempt_count=3` nội bộ KHÔNG BAO GIỜ được
  cộng vào `calls_per_turn` (spy assert `calls_per_turn` tăng đúng +1 cho
  lệnh gọi này).
- **AC-06** (R3b, retry nội dung do caller quyết định): GIVEN
  `suggestion_call` thành công về mặt mạng nhưng trả về <4 gợi ý duy nhất,
  WHEN tầng này trả kết quả, THEN nó trả Success với nguyên dữ liệu <4 gợi
  ý đó — KHÔNG tự động gọi lại. GIVEN sau đó caller (Turn Manager, giả lập
  bằng test double) chủ động gọi `request_ai(suggestion_retry_call,
  payload)`, THEN đây được tính là lệnh gọi logic THỨ HAI, `calls_per_turn`
  tăng thêm +1 (tối đa 3/lượt theo registry).
- **AC-07** (R4, danh sách model dự phòng config-driven + cooldown): GIVEN
  cấu hình `M=[A,B,C]` và HTTP mock trả 503 cho model A đủ
  `max_same_model_attempts_overloaded` lần, WHEN retry, THEN request kế
  tiếp chuyển sang model B (không phải A). GIVEN thay đổi cấu hình `M`
  sang thứ tự/tập model khác trong cùng bộ test, THEN thứ tự fallback thực
  tế thay đổi tương ứng — chứng minh danh sách là dữ liệu cấu hình, không
  hard-code.
- **AC-08** (R5, phân loại lỗi 503/429/403 + không bao giờ fabricate kết
  quả): GIVEN HTTP mock trả 429, WHEN `request_ai` xử lý, THEN KHÔNG có
  lần thử lại nào (`http_attempt_count=1`) và trả Failed ngay lập tức.
  GIVEN HTTP mock trả 403, WHEN xử lý, THEN tương tự — không retry, trả
  Failed với lý do lỗi cấu hình/quyền truy cập. GIVEN đã thử hết toàn bộ
  model dự phòng với 503 (AC-07 kéo dài đến hết ladder), THEN trả Failed.
  Ở CẢ BA trường hợp trên, THEN giá trị trả về LUÔN có status Failed tường
  minh — không có test case nào quan sát được một kết quả Success "giả"
  (fabricated) khi mock trả lỗi.
- **AC-09** (R6, 2 chế độ API key): GIVEN `apiMode='default'`, WHEN request
  được dựng, THEN request dùng key mặc định của dự án (spy kiểm tra field
  key trong request mock). GIVEN `apiMode='userKey'` với key đã lưu cục
  bộ, WHEN request được dựng, THEN request dùng đúng key đó thay vì key
  mặc định. GIVEN toàn bộ HTTP call được ghi lại bởi spy trong 1 test
  session, THEN không có lệnh gọi nào khác ngoài lệnh gọi tới endpoint AI
  mang giá trị key này (không rò rỉ ra một endpoint thứ hai nào).
- **AC-10** (R7, `safetySettings` cố định toàn hệ thống): GIVEN bất kỳ
  lệnh gọi nào (`narration_call` hoặc `suggestion_call`), WHEN request
  được dựng, THEN field `safetySettings` luôn = `BLOCK_NONE` cho các
  category liên quan, kể cả khi payload đầu vào cố tình truyền một giá
  trị `safetySettings` khác — giá trị đó bị bỏ qua/ghi đè (spy kiểm tra
  request thực tế gửi đi qua nhiều lệnh gọi liên tiếp, tất cả đều giống
  nhau, không có tham số bật/tắt theo lượt/UI).
- **AC-11** (R8, timeout toàn bộ lệnh gọi khớp 30s): GIVEN fake clock +
  HTTP mock được cấu hình trễ đúng như kịch bản biên ở Formula 2 (mỗi lần
  thử mất 5s, quá tải liên tục qua nhiều model), WHEN tổng thời gian trôi
  qua chạm `ai_call_timeout_seconds=30`, THEN `request_ai` trả Failed (lý
  do timeout) NGAY tại thời điểm gate chặn — kể cả khi vẫn đang giữa một
  chuỗi retry mạng nội bộ, không có lần thử HTTP nào phát sinh sau mốc đó
  (spy đếm số HTTP call dừng lại đúng thời điểm).

**Formulas**

- **AC-12** (F1, Network Retry Backoff Delay): GIVEN
  `overload_retry_wait_seconds=2`, `attempt_index=0`,
  `error_class=OVERLOADED`, WHEN tính `w`, THEN `w=2s` (verify bằng fake
  clock đo đúng khoảng chờ trước lần thử kế). GIVEN
  `transient_retry_base_seconds=1`, `attempt_index=1`,
  `error_class=TRANSIENT_OTHER`, THEN `w=1×(1+1)=2s`. GIVEN đây là lần thử
  CUỐI CÙNG được phép trên model hiện tại và vẫn 503, THEN `w=0` và hệ
  thống chuyển sang model dự phòng kế tiếp NGAY (không có khoảng chờ — spy
  xác nhận request kế tiếp bắn ra tức thời sau khi đánh dấu model quá
  tải).
- **AC-13** (F2, AI Call Time Budget): GIVEN fake clock + HTTP mock trễ
  đúng kịch bản biên trong GDD (mỗi lần thử 5s, quá tải qua Model A →
  Model B → Model C), WHEN mô phỏng đến `t=29s` với `t_remaining=1s` và
  `w_next=2s` (điều kiện `t_remaining ≤ w_next`), THEN `request_ai` trả
  Failed (lý do timeout) ngay tại `t=29s`, không có HTTP request nào được
  gửi thêm sau mốc đó — dù về lý thuyết Model C "còn sống". GIVEN bất kỳ
  HTTP request đơn lẻ nào trong chuỗi trên, THEN timeout của riêng nó luôn
  = `min(request_timeout_default, t_remaining(n))` tại thời điểm gửi (spy
  kiểm tra tham số timeout truyền vào mock HTTP client ở từng lần gọi).
- **AC-14** (F3, Model Fallback Selection — ladder thường + ladder cạn):
  GIVEN `M=[A,B,C]`, `cooldown_until: A=150, B=0, C=0`, `t_now=100`, WHEN
  chọn model kế tiếp, THEN `ladder=[B,C]` và `next_model=B` (A bị loại).
  GIVEN B và C sau đó đều thất bại (`tried={B,C}=ladder`), WHEN chọn tiếp,
  THEN `next_model=NONE` và lệnh gọi trả Failed với lý do "hết model dự
  phòng" — lý do này phải được log dưới một nhãn KHÁC với lý do "timeout"
  của AC-13 (kiểm chứng bằng assert trên chuỗi lý do lỗi trả về/log, không
  chỉ trên status Failed chung chung).
- **AC-15** (F4, Logical Call Accounting — invariant): GIVEN 1 lượt có
  `suggestion_call` với `http_attempt_count=3` nội bộ (do fallback qua 2
  model quá tải rồi thành công ở model thứ 3) theo sau bởi `narration_call`
  với `http_attempt_count=1`, WHEN kiểm tra `calls_per_turn`, THEN
  `calls_per_turn=2` (KHÔNG PHẢI `3+1=4`) — kiểm chứng bằng spy gắn tại
  đúng điểm Turn Manager tăng biến đếm này, khẳng định nó tăng đúng +1 mỗi
  lần `request_ai()` được gọi, bất kể `http_attempt_count` bên trong là
  bao nhiêu.

**Edge Cases**

- **AC-16** (EC1, retry `narration_call` giữ nguyên `locked_result`, không
  recompute): GIVEN `locked_result=X` đã được caller khóa và truyền vào,
  HTTP mock thất bại lần 1 rồi thành công lần 2 (retry mạng nội bộ), WHEN
  so sánh payload gửi đi ở 2 lần thử, THEN cả hai request đều chứa
  `locked_result` GIỐNG HỆT byte-for-byte giá trị X ban đầu (spy so khớp
  payload qua các lần gọi). GIVEN retry nội bộ (Formula 1-3) cũng cạn hết,
  WHEN trả Failed, THEN tầng này KHÔNG thực hiện bất kỳ thao tác ghi/xóa
  nào lên trạng thái `locked_result` phía caller (kiểm chứng bằng việc
  test double của caller giữ nguyên state, không bị tầng này gọi tới).
- **AC-17** (EC2, JSON hỏng dù HTTP 200 → tự retry nội bộ, không lộ ra
  caller): GIVEN `suggestion_call` mock trả HTTP 200 với JSON malformed ở
  lần thử đầu và JSON hợp lệ ở lần thử thứ hai, WHEN `request_ai` resolve,
  THEN caller nhận Success với mảng 4 gợi ý hợp lệ đã parse, và
  `calls_per_turn` KHÔNG tăng thêm cho lần retry parse này (chỉ tính là 1
  lệnh gọi logic). GIVEN cả 2 lần thử đều trả JSON malformed, WHEN hết
  ngân sách retry (tối đa 1 lần retry parse), THEN trả Failed cho caller —
  caller không bao giờ nhận được chuỗi JSON hỏng nguyên văn (spy xác nhận
  giá trị trả về cho caller chỉ là Success-hợp-lệ hoặc Failed, không có
  case thứ 3).
- **AC-18** (EC3, không kiểm tra numeric leak): GIVEN HTTP mock trả về
  `narration_text` chứa một chuỗi số liệu thô (giả lập leak), WHEN
  `request_ai` trả Success, THEN text trả về cho caller GIỐNG HỆT nguyên
  văn từ mock — không bị lọc/chỉnh sửa (spy so sánh input mock và output
  trả về, phải bằng nhau tuyệt đối); đồng thời không có lời gọi nào tới
  logic kiểm tra leak (Contract Enforcement Formula 1) được phát sinh từ
  bên trong code path của tầng này trong test này.
- **AC-19** (EC4, tất cả model cooldown đồng thời): GIVEN `M=[A,B,C]` với
  `cooldown_until` của cả 3 đều > `t_now` (tất cả đang cooldown), WHEN
  chọn model kế tiếp, THEN `ladder` rơi về TOÀN BỘ `[A,B,C]` gốc (không
  phải danh sách rỗng, không Failed ngay) và `next_model` = phần tử đầu
  tiên của `M` gốc — request vẫn được gửi thử tới model đó.
- **AC-20** (EC5, danh sách model rỗng — lỗi cấu hình): GIVEN cấu hình
  `M=[]`, WHEN `request_ai` được gọi (bất kỳ `call_type` nào), THEN trả
  Failed NGAY LẬP TỨC với lý do "lỗi cấu hình", và spy xác nhận 0 HTTP
  request được gửi ra; lý do lỗi này phải được log dưới nhãn KHÁC biệt
  với "hết model dự phòng" (AC-14) và "timeout" (AC-13) — assert trên 3
  nhãn lý do lỗi riêng biệt trong bộ test tổng hợp cả 3 case.
- **AC-21** (EC6, xử lý tuần tự, không concurrency): GIVEN 2 lệnh
  `request_ai` được kích hoạt gần như đồng thời trong test (lệnh B được
  gọi trong khi HTTP mock của lệnh A còn chưa resolve), WHEN quan sát thứ
  tự HTTP mock được gọi (spy ghi timestamp/thứ tự), THEN request đầu tiên
  của lệnh B chỉ được gửi SAU KHI lệnh A đã resolve (Success hoặc Failed)
  — không có bất kỳ khoảng chồng lấn (interleaving) nào giữa 2 lệnh.
- **AC-22** (EC7, `suggestion_retry_call` gặp lỗi mạng xử lý như mọi lệnh
  gọi khác): GIVEN `suggestion_retry_call` là lệnh gọi logic thứ 3 trong
  lượt, HTTP mock trả 503 rồi thành công qua model dự phòng (giống AC-07),
  WHEN resolve, THEN hành vi retry mạng + fallback diễn ra ĐÚNG như
  Formula 1-3 cho bất kỳ `call_type` nào khác — không có nhánh xử lý đặc
  biệt (assert code path giống hệt case AC-05/AC-07); và `calls_per_turn`
  sau đó = 3 chính xác, không có ngoại lệ nào làm nó vượt hay giữ nguyên
  do đây là lần thứ 3.
- **AC-23** (EC8, `apiMode='userKey'` chưa nhập key → fail ngay, 0
  request): GIVEN `apiMode='userKey'` và giá trị key đã lưu là rỗng/null,
  WHEN `request_ai` được gọi, THEN trả Failed NGAY LẬP TỨC với lý do "chưa
  cấu hình", và spy xác nhận 0 HTTP request nào được gửi ra (không tốn
  bất kỳ phần nào của ngân sách `ai_call_timeout_seconds`).

## Open Questions

- **Hành vi `HTTPRequest` trên Godot 4.6 HTML5 export + header COOP/COEP**
  chưa được xác minh — cần 1 technical spike trước khi implement (đã flag
  từ `turn-manager.md`, mang sang đây vì đây là hệ trực tiếp dùng
  `HTTPRequest`). *(Owner: technical-director, target: trước
  `/create-architecture`)*
- **`systems-index.md` chưa liệt kê cạnh phụ thuộc Turn Manager → AI/LLM
  Integration Layer** trong Dependency Map (xem Section Dependencies ở
  trên) — cùng dạng phụ thuộc một chiều đã gặp 2 lần trước. *(Owner:
  producer/systems-designer, target: trước khi chạy `/consistency-check`)*
- **Dịch vụ AI/LLM backend cụ thể chưa chốt** (đã flag từ
  `game-concept.md`) — bao gồm xác minh ToS cho nội dung NSFW. GDD này giả
  định Gemini API (theo `src/reference.md` + prototype) nhưng quyết định
  chính thức + danh sách model dự phòng cụ thể là quyết định ADR. *(Owner:
  technical-director, target: `/create-architecture`)*
- **Giá trị cụ thể của danh sách model dự phòng** (tên/version model) cố
  tình KHÔNG chốt trong GDD này (data-driven config, xem Core Rule #4) —
  cần định nghĩa khi viết ADR/config thật.
- **Công cụ quan sát lý do Failed** (timeout vs hết model dự phòng vs lỗi
  cấu hình vs 429/403) cho QA thủ công — liên quan Open Question tương tự
  đã nêu ở `turn-manager.md` về debug panel/log file. *(Owner: qa-lead +
  technical-director, target: trước khi viết ADR cho hệ thống này)*
