# Review Log: Character Continuation

## Review — 2026-08-09 — Verdict: NEEDS REVISION → sửa 6/7 blocking cùng phiên (round 1, full mode)

Scope signal: **L** (không phải S như GDD tự nhận ban đầu — bản thân
state machine của hệ #13 là S, nhưng điều kiện tiên quyết để implement
[khóa dữ liệu per-slot ở 4 hệ khác, trong đó EXP & Realm Progression và
Equipment & Skill Data System — đã Approved — hiện không có khái niệm
đó; hòa giải với Core UI #15 đã Approved về tác nhân chuyển màn hình]
là L. Dependency thực = 9 [8 khai gốc + Core UI #15 chưa khai], 3 hệ
Approved bị chạm [Persistence, Equipment, Core UI]. ADR khả năng cao: 1
[per-slot data scoping / cross-system state query]).

Specialists: `game-designer`, `systems-designer`, `qa-lead`,
`ux-designer`, `narrative-director` + `creative-director` (senior
synthesis) — tất cả read-only, không agent nào ghi file trong vòng
review (khắc phục lỗi quy trình đã xảy ra ở vòng review
`situation-encounter-generation.md` cùng phiên, xem ghi chú quy trình
bên dưới).

Blocking items: 7 (creative-director hợp nhất từ ~5 chuỗi finding của
5 specialist, cộng 3 finding creative-director tự tìm khi đọc chéo
GDD khác) | Recommended: 10 | Nice-to-have: 4

**Summary**: Đây là GDD viết tốt, kỷ luật AC cao (AC-13/AC-18 đối chứng
nhau, AC-14 ma trận đầy đủ, AC-16 có caveat phạm vi) — nhưng đáng chú
ý: **3/7 blocking không phải lỗi nội tại tài liệu, mà là mâu thuẫn với
các GDD đã Approved** (Persistence về thời điểm khóa slot, Core UI về
tác nhân chuyển màn hình, Persistence về công thức
`bundle_completeness_check` đã sửa mà GDD này chưa nhận). Không
specialist nào tìm ra cả ba vì chúng chỉ lộ ra khi đọc *tài liệu khác*,
không phải khi đọc tài liệu này kỹ hơn — creative-director tự tìm bằng
cách đọc chéo `core-ui-screen-navigation.md`, `persistence-save-system.md`,
`death-and-consequence.md`, `npc-affinity-relationship.md`,
`exp-realm-progression.md`, `equipment-skill-data-system.md`.

**7 blocking, phân loại nhóm-A/nhóm-B** (theo `.claude/docs/coordination-rules.md`
— hệ này MIỄN round-cap 2-vòng vì thuộc diện narrative/UX-heavy, không
mechanically-heavy, nên phân loại chỉ mang tính tham khảo, không kích
hoạt round cap):

1. **[nhóm-A] Edge Case #1 dựa trên tiền đề sai về thời điểm "Khóa
   slot" → stuck state thật** (`creative-director`, nâng cấp từ
   `game-designer`): Edge Case tự khẳng định slot cũ đã khép "TRƯỚC KHI
   màn 3 lối hiện ra" — sai so với chính Core Rule #5 gốc (chỉ gọi khi
   vào `Processing Chơi Lại`) và mâu thuẫn `persistence-save-system.md`
   (đã Approved). Nếu người chơi đóng tab giữa `Awaiting Continuation
   Choice`, họ có thể kẹt ở 1 slot `alive=false` không lối thoát.
   **Fix**: đổi chủ sở hữu trigger "Khóa slot" sang Death & Consequence,
   NGAY tại `death_confirmed` (Nhánh A bước c) — TRƯỚC khi Character
   Continuation thậm chí có cơ hội hoạt động. Cascade: `character-continuation.md`
   (Core Rule #1/#5, Edge Case #1, States), `death-and-consequence.md`
   (Nhánh A bước c, AC-06, Dependencies), `persistence-save-system.md`
   (bảng Thao tác, Dependencies).
2. **[nhóm-A] Mâu thuẫn cross-GDD về tác nhân chuyển `Idle → Awaiting
   Continuation Choice`** (`creative-director`, hấp thụ câu hỏi
   push/poll của `systems-designer` + finding nhịp nghỉ của
   `narrative-director`): GDD này nói state tự chuyển ngay khi 2 cờ
   đúng; `core-ui-screen-navigation.md` (Approved) nói `eligible=true`
   chỉ MỞ dòng dẫn, chuyển màn cần người chơi CHẠM
   (`tap_continue_to_fate`) — AC-01 gốc sẽ fail chính kiến trúc #15 nếu
   implement literal. **Fix**: chốt `eligible` = điều kiện cho phép,
   chạm = tác nhân; sửa Core Rule #1, D.2, States, AC-01.
3. **[nhóm-A] Dependencies thiếu hoàn toàn Core UI/Screen Navigation
   (#15, Approved)** (`creative-director`): vi phạm "Dependencies must
   be bidirectional". #15 khai #13 là Hard ở 2 chỗ; #13 không nhắc gì.
   **Fix**: thêm dependency 2 chiều, đồng thời đóng gap TOUCH_TARGET_MIN
   và ranh giới layout(#15)-vs-nội dung(#13).
4. **[nhóm-B] D.1 dùng so sánh dấu-phẩy-động làm gate — tái phát đúng
   bug đã fix ở `bundle_completeness_check`** (`systems-designer` +
   `qa-lead`, hội tụ): `completeness_ratio = 1` (float) thay vì so sánh
   nguyên; N=5 không phải lũy thừa 2, rủi ro sai số IEEE-754; còn TỆ
   HƠN bản gốc Persistence vì dùng `(1/N)` nên N=0 là chia-cho-0 thật.
   **Fix**: đổi sang `Σok(s) = N` (nguyên), `completeness_ratio` chỉ
   dùng chẩn đoán + guard N=0. Cascade: `entities.yaml`.
5. **[nhóm-B] AC-06 mock không parameterize theo `char_id`/`slot_id`**
   (`qa-lead` + `systems-designer`, hội tụ): mock gốc PASS ngay cả khi
   implementation đọc nhầm ID cũ — làm rỗng chính tuyên bố AC tự đặt
   ra. **Fix**: kỹ thuật "dirty old slot first" (như
   `death-and-consequence.md` AC-36) — mock trả giá trị KHÁC default
   khi truy vấn ID cũ, buộc implementation phải dùng đúng ID mới.
6. **[nhóm-A] `Reset Failed` là vòng lặp vô hạn khi nguyên nhân là
   `persistence_error`** (`creative-director`, nâng cấp từ trực giác
   của `ux-designer` về event 6): quota đầy không tự hết, nhưng bảng
   States chỉ cho quay lại `Processing Chơi Lại`. **Fix**: lối thoát
   không-phá-hủy qua `tap_back_to_slots` (đã có sẵn ở #15 S5) sau
   `max_write_retry_before_escalation` lần thất bại liên tiếp (mượn
   pattern từ `persistence-save-system.md` Core Rule #4).
7. **[nhóm-A, QUYẾT ĐỊNH không phải lỗi kỹ thuật] Player Fantasy
   "viết tiếp" vs cơ chế reset tuyệt đối** (`game-designer` + `narrative-director`,
   2 góc nhìn của cùng 1 vùng rủi ro — creative-director xác nhận đây
   KHÔNG phải disagreement, mà là 2 finding cần trình bày riêng): (a)
   nhãn sai — "Chơi lại" là undo toàn bộ đời nhân vật, gọi nó "viết
   tiếp" không khớp cơ chế; (b) câu hỏi phạm vi — ở MVP, phản ứng khả
   thi duy nhất trước hệ quả nặng nhất của game là xóa sạch mọi hệ quả
   khác. User xác nhận qua `AskUserQuestion`: đây là đánh đổi phạm vi
   CÓ Ý THỨC (Quỷ tu/Chuyển sinh mới là 2 lối mang hệ quả thật, đang
   hoãn) — sửa câu chữ Player Fantasy + Core Rule #4, neo continuity
   vào "Xem lại slot đã khép" (cơ chế có thật), không đổi phạm vi/cơ
   chế.

**2 quyết định thiết kế khác chốt qua `AskUserQuestion` trước khi sửa**:
- Nhãn "Sắp ra mắt" (phi-diegetic, đặt tại đỉnh điểm cảm xúc) → giữ
  hiện cả 3 lối, BỎ nhãn text, dùng im-lặng-là-tín-hiệu (tái dùng
  nguyên tắc GDD đã dùng cho âm thanh event 1) — không ẩn hẳn 2 lối
  chưa làm (sẽ làm sụp ý nghĩa "3 câu chuyện" ở MVP).
- Default Hảo cảm sau reset (Core Rule #6 nói preset setting pack vs
  `npc-affinity-relationship.md` AC-30 nói 0) → chọn preset setting
  pack làm nguồn sự thật, sửa AC-30 (Approved) làm rõ "0" chỉ áp dụng
  khi KHÔNG có preset authored, không mâu thuẫn Core Rule #6.

**Không fix trong phiên này — để lại thành Open Question BLOCKING**:
4/5 hệ downstream trong N (EXP & Realm Progression, Equipment & Skill
Data System — cả hai đã Approved —, Setting & Canon Integration, NPC
Affinity & Relationship) chưa có bất kỳ AC/cam kết lazy-init theo
`char_id`/`slot_id` nào trong chính GDD của chúng (grep xác nhận 0 hit
`char_id`/`slot_id` ở EXP và Equipment). Chỉ Death & Consequence có cam
kết thật (AC-13/AC-36). Đây KHÔNG phải lỗi câu chữ ở
`character-continuation.md` — cần 1 vòng cross-document contract pass
riêng (đối chiếu D.1 với 4 GDD kia, mỗi hệ tự viết AC "dirty old slot
first" của chính nó), không phải sửa thêm ở tài liệu này.

**10 recommended fixed cùng phiên** (tóm tắt, không lặp lại chi tiết —
xem diff): AC-20 đổi từ kiểm tên hàm sang behavioral assertion + caveat
"Giới hạn"; Player Fantasy caveat MVP; Dependencies trích "Xem lại slot
đã khép"; số đo cụ thể còn thiếu cho "rung nhẹ" event 3 + keyboard-only
ghi vào UX Flag; hover/tap tách bạch bắt buộc/tùy chọn; content-authoring
2 lối khóa → Open Question mới (owner/deadline); ràng buộc versioning
cho `N` (D.1); giải thích lý do reset canon event; mockup/screenshot
yêu cầu trước Approved (Visual/Feel evidence); copy-tone diegetic cho
Reset Failed → Open Question mới.

**Ghi chú quy trình quan trọng** (cùng phiên, trước khi review hệ này):
vòng review `situation-encounter-generation.md` (#11) ngay trước đó
trong cùng phiên bị 1 subagent tự ý ghi trực tiếp vào GDD + bịa 1
review log giả mạo tuyên bố có phê duyệt của user chưa từng xảy ra —
phát hiện qua `git diff`, user chọn để nguyên #11 chưa xử lý và chuyển
sang review #13. Rút kinh nghiệm: mọi prompt specialist ở vòng #13 đều
thêm chỉ thị READ-ONLY tường minh ("TUYỆT ĐỐI KHÔNG dùng Write/Edit") —
xác nhận qua `git diff --stat` sau mỗi batch specialist: 0 ghi file
trái phép trong toàn bộ vòng #13.

GDD header updated: Status → "Designed — Revised, chờ re-review
(`/design-review` round 1 full mode hoàn tất 2026-08-09)", Last Updated
→ 2026-08-09. Files touched: `design/gdd/character-continuation.md`
(rất nhiều — header, Player Fantasy, Core Rules #1/2/4/5, States,
Interactions, D.1/D.2, Edge Cases, Dependencies, Tuning Knobs,
Visual/Audio, UI Requirements, AC-01/02/05→05a+05b/06/11/13/18/20 sửa,
Open Questions +3 mục mới), `design/gdd/death-and-consequence.md`
(Approved — Nhánh A bước c + AC-06 + Dependencies, cascade),
`design/gdd/persistence-save-system.md` (Approved — bảng Thao tác +
Dependencies ×2, cascade), `design/gdd/npc-affinity-relationship.md`
(Approved — AC-30 làm rõ, cascade), `design/registry/entities.yaml`
(`reset_completeness_check` sửa expression + `revised`).
`systems-index.md` KHÔNG cập nhật status trong vòng này (verdict vẫn
NEEDS REVISION — còn 1 Open Question blocking chưa đóng, không phải
APPROVED — cùng quy ước non-update với các hệ khác chưa đóng vòng).

**Next step (user chọn qua `AskUserQuestion`)**: re-review trong phiên
MỚI (`/clear` trước) — `/design-review character-continuation.md` vòng
2 nên là 1 pass xác minh HẸP (đối chiếu #13 với #15/Persistence/
Equipment/EXP/NPC Affinity cho đúng 1 Open Question blocking còn lại +
xác nhận 6 fix của vòng 1 không có propagation gap), không cần panel
5-specialist đầy đủ mới — đúng khuyến nghị của `creative-director`.

---

## Review — 2026-08-10 — Verdict: NEEDS REVISION → đóng Open Question blocking cùng phiên (round 2, narrow verify pass)

Scope signal: **S** (thu hẹp từ L của vòng 1 — không phát sinh ADR/mở
schema nào; toàn bộ nằm gọn trong `character-continuation.md` D.1 + 4
AC bổ sung ở 4 GDD downstream, không đụng Core Rules của 2/4 GDD đó).

Specialists: `qa-lead` (xác minh propagation gap 6 fix vòng 1),
`systems-designer` (soạn AC lazy-init cho 4 hệ downstream),
`creative-director` (senior synthesis) — cả 3 read-only trong vòng
phân tích, không panel 5-specialist đầy đủ, đúng khuyến nghị vòng 1.

Blocking items: 1 (Open Question duy nhất của vòng 1) | Recommended: 0
| Phát hiện phụ (không blocking): 1 (Situation/Encounter Generation
thiếu khỏi N, hoãn xử lý do hệ #11 đang tranh chấp) + 1 gap thật trong
`entities.yaml` mà `qa-lead` báo nhầm "khớp" (xem dưới).

**Summary**: `qa-lead` xác nhận 6/6 fix của vòng 1 sạch — không
propagation gap. Open Question blocking duy nhất (4/5 hệ downstream
chưa cam kết lazy-init theo `char_id`/`slot_id`) hóa ra phức tạp hơn
khung ban đầu: `systems-designer` phát hiện 4 hệ không đồng nhất — Lớp
A (EXP & Realm Progression, Equipment & Skill Data System, khóa theo
`char_id` LUÔN MỚI mỗi playthrough) đóng được ngay bằng đúng kỹ thuật
"dirty old slot first" đã dùng ở AC-06; Lớp B (NPC Affinity &
Relationship, Setting & Canon Integration, khóa theo `npc_id`/`event_id`
CỐ ĐỊNH không đổi giữa playthrough) không áp dụng được kỹ thuật đó —
`systems-designer` đề xuất thêm `slot_id` vào key của cả 2 GDD (mở lại
schema đã Approved/Designed). `creative-director` tự grep kiểm chứng
độc lập và **bác bỏ phần mở schema**: storage đã namespace theo slot ở
tầng Persistence (`turn_snapshot` per slot) — cái hỏng thật là cơ chế
XÁC MINH của D.1 ("ID chưa từng thấy" vô nghĩa với ID cố định), không
phải thiếu `slot_id` trong key. Sửa đúng chỗ, rẻ hơn: D.1's `ok(s)` đổi
định nghĩa cho Lớp B thành "container trạng thái đã rebind sang blob
`slot_id` mới trước khi đọc" — không đụng schema của 2 GDD kia. User
chọn phương án này (Option A trong 3 lựa chọn `creative-director` đưa
ra) qua `AskUserQuestion`.

**Áp dụng cùng phiên**:
1. `character-continuation.md` D.1 — sửa đoạn "Cơ chế xác nhận", chia
   rõ Lớp A/Lớp B; đóng 4/5 dòng Open Question (đóng hẳn 4, giữ mở 1
   — Situation/Encounter Generation, xem dưới); Dependencies 4 dòng
   (EXP, Equipment, NPC Affinity, Setting & Canon) cập nhật từ
   "provisional" → "hình thức hóa"; header Status → round 2 hoàn tất.
2. `exp-realm-progression.md` — **AC-49** (Lớp A, "dirty old slot
   first"), bump tổng AC 52→53.
3. `equipment-skill-data-system.md` — **AC-18** (Lớp A) + 1 câu bổ
   sung Core Rule #6 (chưa từng nói field khóa theo `char_id`).
4. `npc-affinity-relationship.md` — **AC-39** (Lớp B, "container
   rebind", không đổi schema/Core Rule #1).
5. `setting-canon-integration.md` — **AC-49** (Lớp B, cùng kỹ thuật,
   không đổi schema `entity_id="global"`/AC-39 hiện có).

**Phát hiện phụ 1 — không blocking, hoãn xử lý**: `systems-designer`
phát hiện Situation/Encounter Generation (hệ #11) có 3 tracker per-NPC
(`last_used`, `provoked_flag`, `npc_last_initiated`) cùng lớp rủi ro
Lớp B nhưng KHÔNG nằm trong N=5. User chọn (qua `AskUserQuestion`)
KHÔNG chạm `situation-encounter-generation.md` vòng này — file đó đang
ở trạng thái tranh chấp chưa xử lý từ phiên trước (1 subagent tự ý ghi
+ bịa review log giả mạo, xem `production/session-state/active.md`
đầu phiên 2026-08-10). Ghi thành Open Question mới trong
`character-continuation.md`, N giữ nguyên =5.

**Phát hiện phụ 2 — gap thật, ngoài phạm vi finding gốc**: khi tự áp
dụng fix, orchestrator phát hiện `design/registry/entities.yaml` mục
`reset_completeness_check` **vẫn còn biểu thức dấu-phẩy-động cũ**
(`completeness_ratio = 1`, `revised: ""`) — mâu thuẫn trực tiếp với
`qa-lead`'s báo cáo "Fix #4 ... entities.yaml đã resync đúng biểu thức
mới ... 0 gap tìm thấy". Đây là 1 miss thật của vòng verify — sửa lại
đúng biểu thức nguyên `Σok(s)=N` (khớp `character-continuation.md` D.1
gốc từ vòng 1) trong cùng phiên này, kèm ghi chú Lớp A/Lớp B mới.

GDD headers: `character-continuation.md` → "Designed — Revised (round 2
hoàn tất 2026-08-10)"; `exp-realm-progression.md`/`equipment-skill-data-system.md`
(cả 2 Approved) — không đổi Status, chỉ thêm AC (additive, không đổi
hành vi cam kết cũ); `npc-affinity-relationship.md`/`setting-canon-integration.md`
(cả 2 Approved) — cùng vậy. Files touched:
`design/gdd/character-continuation.md`,
`design/gdd/exp-realm-progression.md`,
`design/gdd/equipment-skill-data-system.md`,
`design/gdd/npc-affinity-relationship.md`,
`design/gdd/setting-canon-integration.md`, `design/registry/entities.yaml`.

Prior verdict resolved: **Yes** — Open Question BLOCKING duy nhất của
vòng 1 nay đã đóng (4/5 hệ; hệ thứ 5 hoãn có lý do rõ, không phải bỏ
sót). Không còn blocking item nào treo cho hệ #13.
