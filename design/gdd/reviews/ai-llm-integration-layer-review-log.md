# Review Log: AI/LLM Integration Layer

## Review — 2026-08-07 — Verdict: NEEDS REVISION → sửa cùng phiên (vòng 1)
Scope signal: L (producer nên verify trước sprint planning; có thể leo XL nếu spike `cancel_request()` thất bại)
Specialists: `game-designer`, `systems-designer`, `qa-lead`, `godot-specialist`, `security-engineer` + `creative-director` (senior synthesis)
Blocking items: 10 cụm (gộp từ 22 finding thô, khử trùng lặp) | Recommended: ~10 (phần lớn deferred tới sau spike hoặc route sang GDD khác)

Summary: Full-mode `/design-review` lần đầu. Phát hiện nền tảng quan
trọng nhất: `src/reference.md` (nguồn "đã kiểm chứng" trích dẫn 6 lần
trong GDD) là code JS `fetch()` chạy trong trình duyệt, KHÔNG PHẢI Godot
`HTTPRequest` — mọi tuyên bố "đã kiểm chứng" chỉ đúng ở tầng giao thức
Gemini API, chưa từng chạm engine Godot thật (`godot-specialist`).
Finding nặng nhất về Pillar: Core Rule #2 (prompt của `suggestion_call`)
thiếu `allowed_envelope_menu` (hard dependency đã khai ở
`situation-encounter-generation.md`) và chỉ thị ràng buộc mức độ nội
dung của nhãn hiển thị — gốc thật của rủi ro "AI tự đề xuất nội dung 18+
không mời", đảo ngược design test của Pillar 5 (`game-designer` +
`qa-lead`, creative-director bổ sung 3 chi tiết qua đọc chéo trực tiếp
`situation-encounter-generation.md`). Prompt injection qua ô nhập tự do
(`security-engineer`) đổi LỚP RỦI RO của 1 giới hạn đã chấp nhận ở
`mechanic-narration-contract-enforcement.md` (AI "trôi" ngẫu nhiên → có
thể tái lập theo ý muốn). Lô lỗi ký hiệu trong 3/4 formula (so sánh `=`
có thể bị "nhảy qua" khi error_class xen kẽ; bất biến `tried` đơn điệu
tăng chưa viết ra dù là thứ DUY NHẤT chứng minh Formula 3 không phải
vòng lặp vô hạn; `http_attempt_count≥1` mâu thuẫn 2 Edge Case của chính
GDD — `systems-designer`). AC-01 pass giả tạo (vacuous) vì Combat/
Situation Generation chưa tồn tại trong code (`qa-lead`).

8/10 cụm Required là **nhóm-A** (đánh đổi thiết kế thật/mâu thuẫn
cross-doc/hợp đồng liên-hệ-thống, không compiler-catchable) — tỷ lệ tốt
cho vòng 1. Đáng chú ý: 4/8 cụm nhóm-A (chỉ thị prompt thiếu, resubmit
sau Failed, im lặng 29s, cơ chế tuần tự) chỉ tồn tại ở RANH GIỚI giữa
các tài liệu — mỗi bên tưởng bên kia lo phần còn lại, loại lỗi mà review
từng-tài-liệu không bao giờ bắt được.

**10 cụm Required đã sửa** (đặt tên R1-R10 theo creative-director):
1. **R1** (`godot-specialist`): gắn lại nhãn "đã kiểm chứng" ở 6 chỗ
   (phân biệt tầng giao thức JS vs tầng engine Godot); mở rộng Open
   Question spike từ chỉ COOP/COEP thành 3 câu hỏi (COOP/COEP,
   `HTTPRequest.timeout` per-instance, `cancel_request()` reliability —
   câu hỏi thứ 3 load-bearing cho Formula 1/3); sửa AC-03/AC-13 khớp
   đúng hình dạng API Godot (`timeout` là property, không phải tham số).
2. **R2** (`game-designer` + `qa-lead` + creative-director bổ sung):
   Core Rule #2 thêm `allowed_envelope_menu` (đóng hard dependency đã
   khai ở `situation-encounter-generation.md`), chỉ thị "cấm viết số
   bằng chữ" (đóng nghĩa vụ ủy quyền từ `mechanic-narration-contract-enforcement.md`),
   chỉ thị "nhãn text phải trung tính, mô tả ý định không mô tả diễn
   tiến" (đóng gốc rủi ro nội dung không mời — KHÔNG đụng Core Rule #7/
   `safetySettings`, giữ nguyên kiến trúc Pillar 5 đã chốt). AC-24/25
   mới assert các chỉ thị có mặt trong request.
3. **R3** (`security-engineer`, sửa tiền đề): cơ chế phân tách prompt
   injection (delimiter + chỉ thị hệ thống cố định) cho ô nhập tự do
   người chơi. AC-26 mới.
4. **R4** (`game-designer`, thu hẹp phạm vi sau khi xác nhận Edge Case
   #1 + AC-16 đã đóng phần retry NỘI BỘ): hợp đồng resubmit sau Failed —
   caller BẮT BUỘC dùng lại `locked_result` cũ, cấm recompute. AC-27
   mới (phạm vi tầng này) + cascade blocking sang `turn-manager.md` +
   `combat-system.md` (đặc tả đầy đủ vòng đời `locked_result` treo).
5. **R5** (`security-engineer`): Core Rule #6 thêm namespace tách biệt
   cho `userKey`, KHÔNG BAO GIỜ qua export của Persistence. AC-28 mới.
6. **R6** (`game-designer`, bác tiền đề "29s im lặng" — core-ui đã có
   chỉ báo "đang viết"; bác cách sửa "progress event" — vi phạm Art
   Bible đã chốt): States table thêm dòng Retrying-Network phát tín
   hiệu quan sát được (không bắt buộc tiêu thụ). Quyết định leo thang
   chỉ báo → Open Question cascade sang `core-ui-screen-navigation.md`
   (không quyết ở đây).
7. **R7** (`qa-lead`, nâng mức từ "test isolation" lên thiết kế):
   `cooldown_until` — biến DUY NHẤT sống lâu hơn 1 lệnh gọi — nay có đặc
   tả vòng đời đầy đủ (wall-clock, không bền vững qua reload, DI được).
   AC-29 mới.
8. **R8** (`systems-designer` + `qa-lead`): chốt cơ chế tuần tự = reject
   `error_code=BUSY` tường minh (không phải queue). AC-21 viết lại +
   AC-30 mới; State table thêm "Busy".
9. **R9** (`qa-lead`): AC-01 viết lại thành CI check chạy mọi PR (không
   phải check 1 lần ở Done gate) — đóng vấn đề pass-giả-tạo vì Combat/
   Situation chưa tồn tại trong code.
10. **R10** (`systems-designer`, patch gộp nhóm-B): `max_same_model_attempts_*`
    chốt ngữ nghĩa "TỔNG số lần thử" (không phải retry, xóa lệch 1 giữa
    Tuning Knobs và Formula 1); so sánh `=` → `≥` cho điều kiện "lần thử
    cuối" (đóng kẽ hở "nhảy qua" khi error_class xen kẽ); invariant
    `tried` đơn điệu tăng viết tường minh + AC-31 mirror; `http_attempt_count`
    range `≥1` → `≥0` (khớp 2 Edge Case Failed-0-request). Ví dụ Formula
    2 "fallback nhẹ" viết lại khớp default=1; ví dụ "biên" + AC-13 giữ
    nguyên nhưng ghi rõ dùng giá trị non-default=2 để minh họa.

**Specialist disagreements creative-director đã phân xử** (verify chéo
bằng đọc trực tiếp `src/reference.md`, `situation-encounter-generation.md`,
`mechanic-narration-contract-enforcement.md`, `core-ui-screen-navigation.md`,
`persistence-save-system.md`, `turn-manager.md`): bác đề xuất "progress
event" + tiền đề "29s im lặng" của `game-designer` (R6); bác cách sửa
"đổi `safetySettings`" của `game-designer` (R2 gốc — sẽ phá Pillar 5);
sửa tiền đề "chưa đặt tên ở đâu cả" của `security-engineer` (R3 — đã có
AC-14 + Open Question, giá trị thật là injection đổi LỚP rủi ro); nâng
mức đánh giá của `qa-lead` cho vấn đề `cooldown_until` (R7, từ test
isolation lên thiết kế); chẩn đoán lại root cause của `systems-designer`
cho ví dụ Formula 2 (R10 — không phải "ví dụ sai" mà là "knob mập mờ
attempts/retries").

**Nhận định Round Cap** (creative-director): xếp hệ này vào diện
mechanically-heavy (multi-step state × error-class × counter độc lập —
đúng lớp compiler/unit-test giỏi nhất, R10 là bằng chứng thực nghiệm
ngay trong vòng này), nhưng với **điều khoản mới**: đồng hồ cap tính từ
SAU spike Godot, không phải từ vòng 1 — vì R1 chứng minh nền tảng bằng
chứng hiện tại (`src/reference.md`) không hợp lệ cho engine đích, review
vòng 2 trên văn bản chưa qua spike sẽ review những claim sắp bị vô hiệu
hóa. User đã đồng ý thêm điều khoản này vào `.claude/docs/coordination-rules.md`.

File đã sửa: `ai-llm-integration-layer.md` (chính — Core Rule #2/#6 mở
rộng, States table +2 dòng, Formula #1 sửa so sánh + tên biến, Formula
#3 thêm invariant + đặc tả vòng đời, Formula #4 sửa range, AC-01/03/13/21
sửa + AC-24..AC-31 mới, Edge Cases EC6 chốt cơ chế, Open Question spike
mở rộng, header, preamble AC 2 ngoại lệ phương pháp), `turn-manager.md`
(Approved — 1 Edge Case mở rộng, `locked_result` resubmit contract),
`combat-system.md` (1 Edge Case mới + AC-54), `situation-encounter-generation.md`
(2 bảng dependency + 1 Open Question đóng — stale reference tới schema
đã đóng từ phía kia), `mechanic-narration-contract-enforcement.md`
(Approved — 2 Open Question: 1 đóng, 1 cập nhật mức ưu tiên do đổi lớp
rủi ro), `core-ui-screen-navigation.md` (Approved — 1 Open Question mới,
route quyết định UX sang đó).

Prior verdict resolved: First review.

Trạng thái sau vòng này: **Designed — Revised**, KHÔNG chuyển Approved —
10 mục Required đã đóng ở tầng văn bản, nhưng phần lớn vẫn cần spike kỹ
thuật Godot Web export xác nhận trước khi ADR chốt (`docs/engine-reference/godot/modules/web-export.md`,
CHƯA tồn tại). **Round tiếp theo (round 2) là round CUỐI theo Design
Review Round Cap policy — chỉ chạy SAU KHI spike hoàn tất**, review văn
bản đã sửa + kết quả spike, không phải văn bản hiện tại.

**Recommended chưa xử lý vòng này** (deferred, route theo owner):
content-warning/age-gate cho UI Requirements (`security-engineer`, hạ ưu
tiên — chỉ 1 người chơi là chính developer); mở rộng Open Question ToS
sang chính sách retention/human-review của nhà cung cấp (`security-engineer`);
HTTP referrer restriction ở Google Cloud Console cho key mặc định
(`godot-specialist`, chi phí ~0, nên vào ADR sớm); Failed xác định trước
(config lỗi) vẫn tiêu `calls_per_turn` — có thể cháy 3 slot/lượt vô ích
(`systems-designer`, đáng làm sớm nhưng không blocking); model "treo
chậm" có thể nuốt hết 30s mà không chạm model dự phòng (`game-designer`);
không có cơ chế người chơi tự hủy khi đang chờ (`game-designer`, phụ
thuộc kết quả spike `cancel_request()`); SLO/cảnh báo khi quota cạn giữa
phiên (`game-designer`).

## Review — 2026-08-08 — Verdict: NEEDS REVISION → sửa cùng phiên (vòng 2, VÒNG CUỐI)
Scope signal: L (không đổi — có thể leo XL chỉ nếu prototype CORS thất bại)
Specialists: `game-designer`, `systems-designer`, `godot-specialist`, `security-engineer`, `qa-lead` + `creative-director` (senior synthesis)
Blocking items: 6 | Recommended: ~12 (đưa vào backlog có owner)
Summary: Vòng cuối theo điều khoản spike-gated (đồng hồ round cap tính
từ SAU spike Godot, đã hoàn tất 2026-08-08). Toàn bộ 6 blocking là bổ
sung/đóng gap văn bản (không đòi thiết kế lại công thức/kiến trúc):
`error_code=BUSY` là hợp đồng "phía caller" nhưng không GDD nào
(`turn-manager.md`, `combat-system.md`) định nghĩa phản ứng khi nhận nó
— cascade AC-13c mới (turn-manager.md) + ghi chú (combat-system.md),
CẤM nuốt chung vào nhánh "lỗi mạng" (sẽ giấu đúng loại bug mà cơ chế
reject tồn tại để lộ ra) (`game-designer`). Formula 2's lời hứa "còn
ngân sách cho ≥1 fallback" SAI với default hiện hành trên nhánh
TRANSIENT_OTHER (`15+1+14=30s` tiêu hết ngân sách trên Model A, Model
B/C chưa từng được gọi) — thu hẹp lời hứa đúng phạm vi (chỉ đúng cho
OVERLOADED, nơi fallback có giá trị thật; TRANSIENT_OTHER dùng chung
host nên fallback giá trị kỳ vọng thấp — quyết định người dùng: giữ
default, sửa lời hứa) + worked example mới (`systems-designer`). Formula
4's variable table tự mâu thuẫn multiset/type-set khi
`narration_call` Failed-rồi-resubmit có tăng `calls_per_turn` không —
`creative-director` tự chốt TYPE-SET (căn cứ: `entities.yaml` xác nhận
`turn-manager.md` sở hữu registry, multiset mâu thuẫn trực tiếp Edge
Case + Player Fantasy của cả 2 GDD) — cascade nhẹ sang `turn-manager.md`
Formula 2 (làm rõ "lần thứ 4" = loại call_type) (`systems-designer`).
Stored/indirect prompt injection: `narration_text` có thể bị bẻ lái qua
input trực tiếp (đã có AC-26 từ vòng 1) rồi được World Memory lưu
NGUYÊN VĂN, tái sử dụng làm "lịch sử liên quan" cho lệnh gọi SAU mà
không có khung tin-cậy nào — phá đúng AC-25 (nhãn `suggestion_call`
phải trung tính) qua 1 kênh AC-25/AC-26 không cover; `creative-director`
verify chéo World Memory Core Rule #3 (trích xuất rule-based, không bao
giờ đọc `narration_text`) → phạm vi thiệt hại có TRẦN
(`recency_window_turns`=8 lượt), không bền vững — vẫn blocking vì chi
phí sửa thấp và phá đúng bảo đảm Pillar 5 quan trọng nhất (`security-engineer`).
Caveat phương pháp "không kiểm chứng model tuân thủ" chỉ ghi ở AC-26
nhưng áp dụng chung cho AC-10/24/25/26 — dời lên preamble
(`qa-lead`+`security-engineer`, bundle). 2 ràng buộc vận hành từ spike
(`use_threads=false`, `process_mode=PROCESS_MODE_ALWAYS`) chỉ nằm trong
1 Open Question ĐÃ ĐÓNG (sắp mất khi dọn tài liệu), fake-clock test hiện
tại pass giả tạo dù thiếu config này — `creative-director` bác đề xuất
AC runtime riêng (ngoại lệ phương pháp thứ 3, canh 1 "rủi ro ma" vì game
không có pause menu ở đâu), thay bằng mở rộng đúng AC-01 (static check)
+ 1 tripwire ở `core-ui-screen-navigation.md` (`godot-specialist`).

**Specialist disagreements creative-director đã phân xử**: bác cách sửa
BUSY của `game-designer` (nuốt chung vào "lỗi mạng" sẽ giấu bug, không
đóng gap); hạ AC-01/CI-workflow của `qa-lead` từ blocking xuống
Recommended (nhầm lẫn tầng — GDD đặc tả yêu cầu, không đặc tả trạng thái
repo) nhưng giữ ý fixture-test vào backlog; bác AC-32 runtime (SceneTree
thật) của `godot-specialist`, thay bằng static check rẻ hơn không cần
ngoại lệ phương pháp mới; thu hẹp phạm vi finding stored-injection của
`security-engineer` qua verify chéo World Memory (có trần, không phải
poisoning vĩnh viễn) — vẫn giữ blocking nhưng đúng mức độ.

**2 quyết định người dùng chốt qua `AskUserQuestion`**: (1) Formula 2 —
sửa lời hứa cho đúng phạm vi, GIỮ NGUYÊN default (không đổi
`max_same_model_attempts_transient`/`request_timeout_default`); (2)
Trạng thái sau sửa — **KHÔNG chuyển Approved**, giữ "Designed — Review
Closed, chờ cổng CORS prototype" (khác NPC Affinity: hệ này còn phụ
thuộc 1 phép đo có thể VÔ HIỆU HÓA kiến trúc — Core Rule #6 sụp hoàn
toàn nếu CORS thất bại, không phải rủi ro tuning value như NPC Affinity).

File đã sửa: `ai-llm-integration-layer.md` (header, Core Rule #2 mở
rộng ×2, Core Rule #8 mở rộng, Formula 2 Tuning Knob + worked example
mới, Formula 4 variable table viết lại + 2 đoạn giải thích mới, preamble
AC, AC-01 mở rộng, AC-31 thêm điểm neo, AC-32/33/34 mới, 2 Edge Case
mới, Interactions Turn Manager mở rộng, Open Questions ×3), `turn-manager.md`
(Formula 2 làm rõ ngữ nghĩa "lần thứ 4", Edge Case BUSY mới, AC-13b/AC-13c
mới), `combat-system.md` (ghi chú cascade BUSY cạnh AC-54),
`core-ui-screen-navigation.md` (1 tripwire pause/process_mode),
`systems-index.md` (header, High-Risk row, Progress Tracker reviewed
8→9, approved giữ 7).

Prior verdict resolved: Yes — toàn bộ 10 cụm R1-R10 của vòng 1 xác nhận
đứng vững (không phát hiện lỗi nào sống sót qua vòng 2); 6 blocking mới
đều là gap đồng bộ/hoàn thiện văn bản (bao gồm 2 gap phát sinh từ chính
nội dung spike vừa thêm), không phải regression thiết kế.

**Trạng thái sau vòng này: `Designed — Review Closed (round 2 final),
pending CORS prototype gate`.** Round cap CHỐT — không có round 3, dù
tìm thấy gì thêm. Cổng Approved DUY NHẤT còn lại = prototype CORS PASS
(không cần thêm vòng `/design-review`); nếu FAIL, route sang
`/design-system` để soạn lại Core Rule #6, không phải `/design-review`.
