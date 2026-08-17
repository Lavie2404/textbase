# Session State — Checkpoint 2026-08-17

## ĐANG LÀM (mở phiên mới → đọc mục này trước)

**TÁC VỤ LỚN (17-08): Tích hợp GDD vào game (`App.tsx`).** User yêu cầu
"Đưa các GDD đã thiết lập vào game", **trừ Combat GDD và Song Tu** (giữ
nguyên code hiện tại, chỉ đọc qua adapter). Toàn bộ kế hoạch + 14 quyết
định xung đột đã chốt: `production/gdd-integration/plan.md` (đọc mục
"Quyết định đã chốt" đầu file). Hợp đồng triển khai từng GDD (bản chắt
lọc, tiếng Anh): `production/gdd-integration/gdd-0{1..6}-*.md`; bản đồ
kiến trúc App.tsx kèm số dòng: `production/gdd-integration/app-map.md`.
Lộ trình rút gọn: P0 → P1 → P2 → P3(rút gọn) → P4 → P6(rút gọn); bỏ P5.
Commit 1 lần mỗi giai đoạn khi test + build xanh, không push.

**Tiến độ giai đoạn:**
- [x] P0 — Vitest scaffold, `src-web/systems/{types,registry,math,configValidation}.ts`, adapters combat/songTu
- [x] P1 — EXP & Realm (cổng Chờ Đột Phá, 4 nguồn tất định) + Equipment data
- [x] P2 — Affinity D.1–D.6 (7 dải, deep_hostile −80) + Death (death_roll/severity/recovery, crippled = longTermStatus)
- [x] P3 — World Memory fact store + Persistence v2 (IndexedDB nguồn chân lý, durability gate, schema_version)
- [x] P4 — Turn Manager (Undo) + Contract (chặn tag cơ học, leak detector) + AI wrapper (timeout 60/45s)
- [ ] P6 — Character Card, Settings gom nhóm, Customization validators
- [ ] P7 — CI vitest

---

## (Cũ, 14-08) ĐANG LÀM trước đó

**MỚI NHẤT (14-08, phiên sau)**: `prototypes/ui-mockup/index.html` — mockup
HTML tương tác 1 file cho 3 màn đã APPROVED (S1 + S2 + O-Set), kèm
O-ConfirmDelete 2 biến thể + escalation-close, menu 「Mục」, tầng banner,
dòng mời cỡ chữ bootstrapping, resolving/leo-thang-15s/timeout-30s,
Pending Fate, Undo fade ≤150ms. User chốt scope qua 2 câu hỏi: cả 3 màn +
tương tác được. S4/S4-RO & O-Card = placeholder trung thực (chưa có spec).
Bảng demo ⚙ (góc phải dưới) kích các trạng thái điều kiện. Throwaway —
không phải code ship; copy con dấu/nhắc vẫn là nháp chờ writer/art-director.
**Cập nhật 2 (cùng ngày)**: user chưa ưng "cách vận hành AI" → port cơ chế
AI THẬT từ `src/reference.md` (app React cũ của user, ~2.2MB): Gemini
generateContent + thang fallback 5 model + sticky model + cầu dao 503
(cooldown 90s) + dịch lỗi 429/401/503; prompt lượt chơi giữ các luật
then chốt của app cũ (khắc họa hành động ĐANG diễn ra — cấm dư âm/hồi
tưởng; viết lại free-text dài thành văn xuôi đầy đủ; 4 lựa chọn đánh số
kèm {Tỷ lệ thành công/Hậu quả} văn học; lựa chọn chỉ phản ánh đúng đoạn
văn vừa viết; cấm số chỉ số/thẻ lệnh); parser port y hệt (tìm dòng "1. "
cuối, merge dòng gãy, pad đủ 4, strip {…} khỏi thân truyện). apiMode
"Mặc định" = ngoại tuyến văn bản mẫu (mockup không có key dự án); "Của
tôi" + key Gemini (lưu localStorage `vdl.userKey`) = AI thật. Leo thang
15s + timeout 30s áp cho cả 2 chế độ. Cũng sửa font: Georgia → Palatino
Linotype (Georgia thiếu glyph tiếng Việt dựng sẵn, dấu bị tách rời).
**Cập nhật 3 (cùng ngày)**: user chỉnh hướng — cái cần port là CÁCH DỰNG
PROMPT (không phải cách gọi API), bản 1 trả quá ít chữ + thiếu dialogue.
Đã port trọn pipeline 2 tầng của app cũ: API 1 "EXPERT LOGIC ENGINE"
(JSON schema ép qua generationConfig: ≥6 kịch bản {probability, summary,
classification_tags}, luật tôn-trọng-người-chơi + giữ-nguyên-chuỗi-diễn-
biến-free-text-dài) → `rollDiceAndChooseScenario` (port nguyên văn) →
API 2 "NARRATIVE ENGINE" (tiểu thuyết gia, KẾT QUẢ ĐÃ ĐỊNH = summary
kịch bản trúng xúc xắc, tagInstructions port đủ 9 tag — 'dai' = trên
3000 từ, ràng buộc mở-đầu-đang-diễn-ra nguyên văn, 4 lựa chọn {Tỷ lệ
thành công…}). Thẻ `<dialogue speaker="…">`: luật prompt + placeholder
[NC] + `parseStoryWithDialogue` port nguyên văn, render block lời thoại
riêng (viền mực trái + tên người nói). Bỏ qua có chủ đích: hệ thẻ lệnh
[TAG]/registry thực thể/relationship (mockup không có các hệ đó); nhánh
NSFW tường minh KHÔNG port (chỉ giữ nhánh kiểm duyệt fade-to-black).
**PHÁT HIỆN THIẾT KẾ cần GDD owner xử lý**: `ai_call_timeout_seconds=30`
(GDD AI/LLM layer) XUNG ĐỘT với chỉ thị 'dai' 3000+ từ của app cũ —
văn dài không thể xong trong 30s. Mockup tạm: 30s cho call logic, 120s
cho call viết văn (`AI_NARRATIVE_TIMEOUT_S`, có comment). Cần đưa vào
agenda review GDD trước khi implement thật.
**Cập nhật 4 (cùng ngày)**: user yêu cầu "Bắt đầu mới" phải sinh bối
cảnh, xuất thân, ngoại hình, kỹ năng... + vài quan hệ cơ bản — user
interrupt nhấn mạnh PHẢI tham khảo reference.md, không tự chế. Đã port
chuỗi khởi tạo thật của app cũ: ① `handleGenerateImpromptuCharacter`
("Đấng nặn người", dòng ~20963): JSON schema {name, gender, personality
(enum PLAYER_PERSONALITIES ~30 mục port nguyên), role, appearance,
backstory, goal, initialMartialSouls[1-3], initialTraits[2]} — mở rộng
thêm `setting` + `initialRelationships[2-3]{name, relationship,
standing, description}` (mô hình theo hệ RELATIONSHIP_CHANGED của app
cũ); ② `initialPrompt` "Đấng kể chuyện" (dòng ~28503): checklist port —
[REALM_LIST] 10-20 cảnh giới (mảng JSON, mỗi cảnh giới 10 cấp),
[WORLD_LOCATION] loc_me/loc_con, [SET_STARTING_LOCATION],
[SET_STARTING_TIME] theo bối cảnh, phân cảnh mở đầu khớp giờ đã chọn,
4 lựa chọn. Mockup có mini-parser cho đúng 4 thẻ đó (REALM_LIST strip
greedy trước vì chứa ']' — generic regex sẽ ăn dở). Hồ sơ bơm vào
buildContextBlock MỌI lượt sau (bối cảnh + cảnh giới hệ + xuất thân/
ngoại hình/võ hồn/thiên phú/quan hệ + địa điểm/giờ); 「Thẻ」 giờ render
hồ sơ thật thay vì placeholder; scene header S2 lấy từ startingLocation;
chip đầu tiên lấy theo quan hệ #1. Slot name/realm cập nhật từ hồ sơ
(realm = realms[0] + " tầng 1", đúng luật level 1 của engine cũ).
**Cập nhật 5 (cùng ngày)**: user đính chính — "không phải AI nặn mà là
NGƯỜI CHƠI tự nặn nhân vật". Đã sửa đúng vai trò như app cũ: "Bắt đầu
mới" giờ mở MÀN FORM tạo nhân vật (kiểu GameSetupScreen): tên/giới
tính/tính cách (select ~30 mục)/vai trò/ngoại hình/xuất thân/mục tiêu/
bối cảnh + danh sách võ hồn (≤3)/thiên phú (≤3)/quan hệ (≤3) thêm-bớt
dòng được. "Đấng nặn người" trở về đúng vai trò gốc = nút "✨ Nặn toàn
bộ" điền hộ form từ 1 ý tưởng (như handleGenerateImpromptuCharacter điền
gameSettings); mỗi ô text có nút ✨ gợi ý riêng (port SuggestButton,
prompt "Chỉ trả về..." từ các dòng ~21307/24522); ô bỏ trống → AI tự
quyết trong initialPrompt (port câu "Không có mục tiêu cụ thể, hãy để
câu chuyện tự phát triển" + "(Chưa rõ — ngươi tự quyết định...)").
Nút bắt đầu label "Bắt Đầu Cuộc Phiêu Lưu" (port dòng 4999). Cold start
giờ chỉ còn 1 call "Đấng kể chuyện". Offline: form vẫn dùng được, ô
trống lấy giá trị hồ sơ mẫu.
**Cập nhật 6 (cùng ngày)**: user — "Dùng API thật ngay từ bản demo".
Đã GỠ toàn bộ chế độ văn bản mẫu ngoại tuyến (offlineResolve,
OFFLINE_RESPONSES, OPENING canned — xóa; OFFLINE_CARD_SETS chỉ còn làm
resume-state cho slot demo có sẵn). Mọi lượt = Gemini thật. Mô hình key
theo app cũ: "Mặc định" = hằng `DEFAULT_API_KEY` đầu file (user dán key
dự án vào 1 lần — demo local không có backend); "Của tôi" = key nhập
O-Set (localStorage). `effectiveApiKey()` chọn theo apiMode. Thiếu key
→ báo lỗi lớn trong khung tường thuật/form + mở O-Set, KHÔNG giả vờ
chạy. Demo toggle "AI chậm" đã xóa (latency thật tự có); "Pending Fate"
giữ lại, giờ đè 4 thẻ AI trả về ở lượt kế (chỉ để duyệt UI biến thể).
**Cập nhật 7 (cùng ngày)**: user — dialogue phải theo reference.md. Bản
trước render thoại thành khối trích dẫn viền trái; app cũ dùng
`DialogueBubble` (dòng ~2246): BỌT THOẠI CHAT — "Ngươi" (hoặc trùng tên
NVC) căn PHẢI viền đậm + nền sẫm hơn, NPC căn TRÁI viền nhạt, avatar
tròn chữ cái đầu, tên người nói phía trên, bo góc lệch 1 góc nhọn
(player: nhọn dưới-phải; NPC: nhọn dưới-trái). Đã port đúng layout đó
sang tông giấy/mực (`dialogueHtml` + .dlg-wrap/.dlg-bubble CSS; nhận
diện player = speaker 'Ngươi' hoặc trùng playerName, y logic gốc).
Cũng siết DIALOGUE_RULES trong prompt: cấm lời thoại trần/ngoặc kép
thường ngoài thẻ, yêu cầu đối thoại qua lại nhiều lượt ngắn khi có NPC
(theo tinh thần BỘ LUẬT dòng ~27490/27661 của app cũ).
**Cập nhật 8 (cùng ngày)**: user — 4 lựa chọn + ô nhập tự do phải theo
reference.md. Đã port đủ 4 mảnh của app cũ (dòng ~9487/11102-11165/
11483-11527): (a) bảng "✦ Gợi ý hành động" ở CUỐI khung truyện — list
01.-04. đầy đủ, label đậm + chú thích {…} nghiêng có kẻ trái; (b) input
bar chỉ còn 4 NÚT GỌN "Hành Động 1-4" (grid 2→4 cột) + nút ⓘ mỗi nút;
(c) ⓘ mở ChoiceDetailModal port: parse "Tỷ lệ thành công:…." +
"Hậu quả/Phần thưởng:…" từ chú thích, nút "Đã hiểu"; (d) ô tự do thành
TEXTAREA 2 dòng "Miêu tả hành động tùy ý…" + nút "Thực Hiện" +
Ctrl/Cmd+Enter; (e) checkbox "Chèn sự kiện/tình tiết bất ngờ..."
(`state.allowUnexpected`, mặc định true) nối thẳng vào buildLogicPrompt
— port CẢ HAI biến thể văn bản bật/tắt của app cũ (dòng 26790-26792);
(f) submitCard gửi nguyên văn lựa chọn KÈM {chú thích} như handleChoice
gốc. Lưu ý phân kỳ spec: suggestion-card 2×2 của main-screen.md (UX
Approved) đã bị thay bằng layout app cũ theo yêu cầu user — nếu chốt
hướng này cần propagate ngược vào spec S2 sau.

**Task**: `/ux-design save-slot-screen` — UX spec cho S1 (màn gốc).
**File**: `design/ux/save-slot-screen.md` — **HOÀN TẤT, verdict cuối
`/ux-review`: APPROVED** (vòng 1 NEEDS REVISION: 1 blocking [thiếu AC
bàn phím ảo O-ConfirmDelete] + 4 advisory; blocking + 2 advisory cục bộ
[keyboard-nav marginalia-menu, AC đường 「Mục」→Cài đặt] vá cùng phiên).
3 pattern mới đã đăng ký: `paper-strip-banner`, `marginalia-menu` (kèm
spec bàn phím), `slot-spine-row`; "Used In" cập nhật cho
`tool-segmented-choice` + `tool-field-input`.
**Quyết định trong lúc thiết kế**: tap hàng slot = hành động chính, phụ
= text links nhỏ; đính chính ink-reveal thuộc S2 (không phải S1);
O-ConfirmDelete đề xuất dùng chung chữ ký `overlay_settings` 150ms (chờ
technical-director xác nhận tier D.6 — gộp câu hỏi O-Customize).
**Quyết định đã chốt cho S1**: (1) banner ĐỈNH màn hình (toàn cục);
(2) sort slot theo lưu-gần-nhất trước, không phân nhóm; (3) ngưỡng nhắc
"Chép lại" = 5 ngày (tunable 3-6, dưới ITP ~7); (4) empty state 2 dòng
(thêm dòng phụ "mỗi cuốn sổ chỉ thuộc về nơi nó được viết"); (5) menu
「Mục」 tại S1 chỉ còn 1 mục "Cài đặt".

**QUYẾT ĐỊNH LỚN MỚI (user, 2026-08-14) — lớp sao lưu GitHub (hybrid)**:
user đề xuất lưu save trên GitHub; sau khi surface xung đột với
persistence-save-system.md (Approved) + ADR-0002 + game-concept.md,
user chốt: **hybrid — local IndexedDB vẫn là chính (mọi thứ Approved giữ
nguyên), GitHub là lớp BACKUP/đồng bộ, đánh giá + ADR riêng, có thể sau
MVP**. Dữ kiện then chốt user đính chính: game chỉ có ĐÚNG 1 người dùng
là chính user, vĩnh viễn (MVP lẫn sau MVP) → lớp backup KHÔNG cần hệ
"account" (chỉ cần repo private + personal token cố định; ý tưởng "nhập
tên account để lấy save" là thừa với 1 người dùng). VIỆC MỚI cho hàng
đợi: giao `technical-director` đánh giá khả thi + viết ADR lớp backup
GitHub (token client-side ghi repo private, nội dung nhạy cảm Pillar 5
→ bắt buộc private, xung đột ghi SHA-based, tần suất push). S1 spec
thiết kế theo local, để chỗ mở: "Chép lại quyển sổ" có thể thêm đích
GitHub sau này.
**Nguồn ngữ cảnh chính**: `persistence-save-system.md` §UI Requirements
(dòng 1089-1207); `core-ui-screen-navigation.md` Visual/Audio mục 4
(gáy sách/dog-ear/khử bão hòa/dòng mời cỡ chữ), mục 8 (empty state copy
khóa), O-ConfirmDelete (dòng 683-713), mục 1 (ink-reveal onboarding).

## Hoàn tất phiên này

**1. `design/accessibility-requirements.md` — TẠO MỚI, Status: Committed.**
Tier Basic + 6 mục Standard đã đạt by-design; ngoại lệ ADR-0006 chép đủ 4
điều kiện; test plan 4 bài (keyboard-only walkthrough đánh dấu BLOCKING
trước MVP release). Sửa `design/CLAUDE.md` 1 dòng đường dẫn sai.

**2. `/ux-design settings` → `design/ux/settings.md` — HOÀN TẤT, verdict
`/ux-review`: APPROVED (0 blocking, 3 advisory nhỏ — 1 đã dọn cùng
phiên).** UX spec đầy đủ 15 section cho overlay Settings (O-Set, hệ #15).

### Quyết định quan trọng phiên này (không lặp lại nếu đọc lại GDD)

- **Xung đột phát hiện + sửa**: `accessibility-requirements.md` bản đầu
  đặt 2 yêu cầu chuyển tiếp cho Settings (volume sliders, reduced-motion
  toggle) — MÂU THUẪN với Core Rule #10 (`core-ui-screen-navigation.md`,
  GDD Approved) khóa cứng Settings MVP ở ĐÚNG 2 nhóm. Đã sửa lại: cả 2
  đánh dấu N/A có lý do (chưa có audio system; Core Rule #10 không có
  chỗ cho nhóm thứ 3). Không mở lại trừ khi GDD được re-review chính
  thức.
- **Cấu trúc 「Mục」**: xác nhận là 1 menu nhỏ 2 mục ("Về danh sách sổ" /
  "Cài đặt"), không mở thẳng O-Set — đã sửa 1 dòng Interaction Map của
  `main-screen.md` (spec Approved) vốn chỉ mô tả nhánh Settings.
- **Cấu hình AI**: 2 field — `tool-segmented-choice` (Mặc định/Của tôi) +
  `tool-field-input` biến thể mask (API key, che mặc định + nút "Hiện").
  KHÔNG có UI chọn model (ADR-0003 fallback tự động). Coi như đóng Open
  Question #3 của `core-ui-screen-navigation.md` BẰNG THIẾT KẾ — GDD gốc
  vẫn ghi "chưa đóng", chưa propagate ngược (xem Open Questions của
  `settings.md`).
- Pattern mới `tool-field-mask-toggle` đã đăng ký vào
  `design/ux/interaction-patterns.md`; 6 pattern khác cập nhật "Used In".

### Files đã ghi/sửa phiên này

1. `design/accessibility-requirements.md` — mới (~230 dòng) + 3 chỗ sửa
   sau khi phát hiện xung đột Core Rule #10.
2. `design/CLAUDE.md` — sửa đường dẫn accessibility-requirements.md.
3. `design/ux/settings.md` — mới, 15 section, Status: Approved.
4. `design/ux/main-screen.md` — sửa 1 dòng Interaction Map (menu 「Mục」).
5. `design/ux/interaction-patterns.md` — thêm `tool-field-mask-toggle` +
   cập nhật "Used In" của 6 pattern khác (bỏ "dự kiến").

## Hàng đợi — việc tiếp theo khi mở phiên mới

`settings.md` + `save-slot-screen.md` đều đã APPROVED — sẵn sàng
`/team-ui` khi cần. UX hệ #15 chỉ còn thiếu `story-log.md`.

0. **VIỆC MỚI — lớp backup GitHub (hybrid)**: giao `technical-director`
   đánh giá khả thi + ADR (chi tiết ở mục ĐANG LÀM phía trên — 1 người
   dùng duy nhất, không cần account, repo private + token cá nhân).
   Không chặn MVP.
1. **`/ux-design story-log`** — màn cuối cùng của hệ #15 chưa có spec
   (S4/S4-RO, phân trang D.3, read-only mode).
2. **Open Questions treo cần stakeholder ngoài phiên**:
   - Token màu accent kỹ thuật O-Customize + contrast thật —
     `art-director`.
   - Tier D.6 riêng hay dùng chung `overlay_settings` cho O-Customize —
     `technical-director`.
   - `valid_weapon_types` chưa có danh sách — `game-designer`.
   - Cơ chế lưu `app_config` (Open Question #4 GDD, ảnh hưởng cả cỡ chữ
     lẫn `userKey`) — `technical-director`, ADR persistence tại
     `/create-architecture`.
   - Namespace kỹ thuật cụ thể lưu `userKey` tách biệt save-data bundle
     — `technical-director`, ADR persistence/backend AI.
3. **Kiểm backlog item AT-retrofit** (điều kiện #1 ADR-0006, `producer`
   sở hữu) đã tồn tại trong `production/` chưa — nếu chưa, tạo khi
   sprint-plan kế tiếp.
4. `/gate-check pre-production` — pre-gate item accessibility đã gỡ; các
   item khác (vertical slice, epics/stories...) chưa kiểm tra phiên này.

## Ghi chú treo (không chặn)

- 2 advisory HỆ THỐNG lặp lại ở cả `/ux-review settings.md` lẫn
  `save-slot-screen.md`: (a) header spec thiếu field "Platform Target",
  (b) Localization thiếu character-count cụ thể — cả 4 spec hiện có đều
  vậy. Cân nhắc sửa 1 lần vào skeleton của skill `/ux-design` (file
  `.claude/skills/ux-design/SKILL.md`) để dứt điểm cho mọi spec sau.
- Test "Keyboard-only walkthrough" (AC-56a, `core-ui-screen-navigation.md`)
  là BLOCKING trước MVP release — đã vào test plan của
  `accessibility-requirements.md`.
- Recommended R1-R3 vòng 3 + Advisory A1-A11 hệ #16: xem Gap Analysis +
  review log của hệ #16 (chưa xử lý, không chặn).
