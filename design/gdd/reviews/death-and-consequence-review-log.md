# Review Log: Death & Consequence

## Review — 2026-08-09 — Verdict: NEEDS REVISION → sửa cùng phiên (vòng 1/2, full mode)
Scope signal: L (2 cascade edit cross-doc — `combat-system.md` D.1 mở lại cục bộ, `npc-affinity-relationship.md` D.1 sửa field-shape — + 1 rename... không, KHÔNG rename; 3+ formula, nhiều dependency, producer nên verify trước sprint planning)
Specialists: `game-designer`, `systems-designer`, `qa-lead`, `economy-designer`, `narrative-director`, `ux-designer` + `creative-director` (senior synthesis)
Blocking items: 4 | Recommended: ~15
Prior verdict resolved: First review qua skill `/design-review` (dù đã có 1 đợt sửa lớn từ batch review "gộp 11 GDD" ngoài skill này trước đó — AC-40 đến AC-45, đóng Blocking #1-11 của đợt đó).

**Summary**: Xương sống của hệ vững — phạm vi kích hoạt chặt (kể cả ca
giao hữu ra win/lose vẫn không resolve), cấu trúc 2 nhánh rõ, state
machine tách transient/persistent đúng, kỷ luật Undo tốt hơn mức trung
bình của repo, 46 AC gốc có boundary/contrast/negative-assertion test
thật. Mọi blocking đều nằm ở interface hoặc nhãn — không cái nào nằm
trong công thức lõi.

**Finding quan trọng nhất** (độc lập xác nhận bởi main reviewer qua
grep + `game-designer` + `narrative-director` + `qa-lead`): Core Rule
#6 yêu cầu `mechanic-narration-contract-enforcement.md` (đã Approved)
cấm AI mô tả suy giảm chiến lực khi phế đan điền — nhưng doc đích
KHÔNG có cơ chế nào cho ràng buộc ngữ nghĩa theo field, chỉ có 1 quy
tắc chung "cấm lộ số liệu thô". AC-46 tự nhận "cùng pattern AC-48 của
`setting-canon-integration.md`" nhưng đây là tiền lệ sai — AC-48 hoãn
tới 1 UI đã tồn tại, AC-46 hoãn tới 1 cơ chế không tồn tại, không ai
sở hữu.

**Finding nặng thứ hai** (`systems-designer`, "D-CRITICAL"): Formula
D.1/D.2 mô tả hand-off Combat cung cấp field `hp_after`/`max_HP` cấp
ngoài — sai theo `combat-system.md` Core Rule #11 (schema
`locked_result` DUY NHẤT): `hp_after` lồng trong `per_actor[actor_id]`,
`max_HP` hoàn toàn không có trong `locked_result` (thuộc Character Card
& Identity, chưa được liệt kê như dependency). Cùng lỗi tồn tại nguyên
văn ở `npc-affinity-relationship.md` D.1 (đã Approved) — sửa cascade
cùng phiên.

**4 blocking đã sửa (theo lựa chọn user, không theo mặc định rẻ nhất
`creative-director` đề xuất cho item #1):**

1. **Core Rule #6 — user chọn "thêm penalty cơ học thật"** (không chọn
   phương án rẻ nhất "đổi tên, bỏ ràng buộc narration" mà
   `creative-director` khuyến nghị): `death_and_consequence_blocked=true`
   giờ áp CẢ 2 hệ quả — chặn EXP (không đổi) VÀ 1 lớp phạt Lực chiến
   thật, nhỏ, cố định qua `combat-system.md` D.1 `crippled_layer`
   (`CRIPPLED_PENALTY_MULT`, mặc định 0.85, cùng sàn `FLOOR_TOTAL` với
   2 lớp phạt cảnh giới/trang bị có sẵn). Vì mức suy giảm giờ THẬT, gỡ
   bỏ hoàn toàn yêu cầu narration đặc biệt — AC-46 SUPERSEDED. Cascade
   edit vào `combat-system.md` (D.1 formula + knob + 1 AC boundary
   mới AC-13b + Dependencies 2 chiều) — hệ đó đã đóng round-cap từ
   trước, đây là sửa cục bộ (thêm 1 lớp, không đổi công thức cũ), CHƯA
   chạy lại vòng review đầy đủ, cần 1 pass xác minh hẹp trước Approved.
2. **D-CRITICAL — field-shape `hp_after`/`max_HP`**: sửa `margin_ratio`
   dùng đúng `per_actor[winner_id].hp_after`; `max_HP` ghi rõ nguồn =
   Character Card & Identity (dependency mới, soft); cascade fix cùng
   lỗi ở `npc-affinity-relationship.md` D.1 (Approved, sửa field-shape
   tối thiểu, không đổi hành vi số học, không cần re-review).
3. **Core Rule #4 tự mâu thuẫn**: bullet "Kết liễu" nói VẪN undo được
   (đúng, khớp AC-38/AC-39) nhưng bullet kế "Yêu cầu hiển thị Pending
   Fate" nói SAI là "không thể undo một khi đã lan truyền" — sửa câu
   chữ: điều không lặp lại là cửa sổ Pending Fate, không phải Undo.
4. **Nhãn "BLOCKING (visual)" sai phân loại Story Type**: 4 event Visual/
   Audio Requirements tự gắn nhãn BLOCKING nhưng AC chỉ khai 1 Story
   Type (Logic). Thêm khai báo Story Type thứ 2 (Visual/Feel — ADVISORY,
   theo đúng `coding-standards.md`).

**Recommended đã sửa cùng phiên** (theo lựa chọn user "sửa cả blocking
+ recommended quan trọng"): giữ `forced_severe` nguyên cơ chế ép severe
+ truyền `margin_ratio` gốc xuống làm gợi ý narration (đóng finding
game-designer "xóa tín hiệu kỹ năng"); cho tier "medium" (sỉ nhục) 1
delta Hảo cảm nhỏ tái dùng event type `insult` có sẵn của NPC Affinity
(đóng finding riêng của `creative-director` "mild/medium không khác
biệt cơ học", AC-49 mới); gộp 3 cặp bất biến MIN<MAX (D.1/D.2/D.3) vào
1 ghi chú + owner enforcement; guard `npc_tag` null (D.2); else-branch
cho `method` lạ (D.3); AC-38b (Undo nhánh Tha mạng); AC-47 (độc quyền
gỡ cờ Rule #6); AC-48 (RNG injection contract); sửa "~81%" thành dải
theo lượt bị phế + kỳ vọng ~42 lượt tự tu (bác bỏ finding
economy-designer "tự tu là dominant strategy" — thực ra là đường ĐẮT
NHẤT); 5 mục mới vào checklist `/ux-design character-card.md` (xác
nhận Kết liễu, badge visibility, bold-weight asymmetry, nút Hồi phục
≥2 item, kích thước chạm); 1 hàng UI Requirements mới (xác nhận cơ học
độc lập AI narration); Open Questions: 2 mục mới có chủ
(`max_HP` ownership → `technical-director`; tín hiệu UI khi AI fail →
`ux-designer` + AI/LLM layer owner), `npc_tag` semantic-reversal note.

**Specialist disagreements đã surface** (không tự resolve): economy-designer
vs. creative-director (tự tu dominant hay đắt nhất — creative-director
thắng bằng tính toán kỳ vọng ~42 lượt 0 EXP); ux-designer vs.
creative-director (event 3 thất bại phân biệt tier hay đúng vì tier
thực sự giống nhau — creative-director thắng, nhưng user CHỌN xử lý
bằng cách thêm khác biệt cơ học thật cho medium thay vì chỉ sửa câu
văn); mức độ nghiêm trọng của cụm ux-designer (BLOCKING theo ux-designer
→ gộp vào checklist theo creative-director).

**Round-cap classification**: `creative-director` khuyến nghị thêm hệ
này vào danh sách mechanically-heavy (`.claude/docs/coordination-rules.md`),
round-cap 2 vòng TIÊU CHUẨN (KHÔNG áp dụng amendment
economy-derivation-gated — đa số nhóm-A nhưng không có ≥2 hằng số liên
khóa cần re-derive MỚI ở vòng này). Vòng này là vòng full 6-specialist
đầu tiên và có thể là CUỐI CÙNG; vòng 2 nên là 1 pass xác minh hẹp
(grep-level) trên đúng các mệnh đề vừa đổi + xác nhận `combat-system.md`
AC-13b/`npc-affinity-relationship.md` field-shape không có tác dụng phụ,
không cần panel đầy đủ.

---

## Review — 2026-08-09 — Verdict: NEEDS REVISION (minor) → sửa cùng phiên (vòng 2/2, vòng cuối, narrow verify pass)
Scope signal: S (thuần patch văn bản cùng 1 file, không cascade cross-doc mới, dưới 40 dòng)
Specialists: `systems-designer`, `qa-lead`, `game-designer` (targeted, không panel đầy đủ, đúng khuyến nghị vòng 1) + `creative-director` (senior synthesis)
Blocking items: 1 | Recommended: 3
Prior verdict resolved: Có — vòng 1 (4 blocking + ~15 recommended) đã đối chiếu, xác nhận đúng như tuyên bố ở 2/3 hạng mục lớn.

**Summary**: Narrow verify pass theo đúng khuyến nghị của chính vòng 1 —
không spawn panel 6 chuyên gia đầy đủ, chỉ 3 specialist trọng tâm +
`creative-director` tổng hợp. Cả 2 cascade fix của vòng 1
(`combat-system.md` D.1 `crippled_layer`/AC-13b,
`npc-affinity-relationship.md` D.1 field-shape) xác nhận đúng hoàn
toàn, không tác dụng phụ, không cần sửa gì thêm.

**Finding quan trọng nhất** (`creative-director`, hợp nhất 2 finding
của `game-designer`): hai bổ sung hướng-người-chơi của vòng 1
(`forced_severe_margin_ratio`, ngữ cảnh công khai của `insult` tier
medium) là **cosmetic-only fix** — prose khẳng định "AI sẽ dùng" nhưng
không field nào được khai là 1 phần `locked_result`, không có cạnh
Dependency tới Mechanic/Narration Contract Enforcement (dù được gọi
tên 3 lần), không AC nào kiểm việc phát/chuyển tiếp. Đây là quyết định
của user ở vòng 1 (trả giá ép cứng `severe`/xóa tín hiệu kỹ năng, đổi
lấy đền bù narration) chưa được thi hành, không phải thiếu sót tài
liệu.

**1 blocking đã sửa (theo lựa chọn user — phương án A cho finding
"insult vô hình")**:

1. **Cosmetic-only fix — nối dây thật**: thêm hàng Dependencies cho
   Mechanic/Narration Contract Enforcement (downstream, soft); khai
   `forced_severe_margin_ratio` + ngữ cảnh công khai `insult` (số nhân
   chứng, KHÔNG phải giá trị delta) là 1 phần `locked_result`; thêm
   **AC-50** kiểm việc phát/vắng mặt đúng điều kiện `forced_severe`.
   User chọn phương án A cho phần `insult` (đi ké payload narration,
   KHÔNG nâng `severity(insult)` 2→3 — tránh rebalance toàn bộ event
   type dùng chung trong 1 doc đã Approved khác, không còn round nào
   để verify).

**3 recommended đã sửa cùng phiên**:

2. Event 6 bảng Visual/Audio ghi trần `"BLOCKING"` — thiếu qualifier
   `(visual)` mâu thuẫn với đoạn Story Type reclassification của vòng
   1 — sửa thành `"BLOCKING (visual)"`.
3. AC-47 thiếu caveat "Giới hạn" đối xứng AC-14; hàng Open Question
   CI-lint (owner `technical-director`) chưa phủ
   `death_and_consequence_blocked` dù field này vừa được vòng 1 nâng
   thành đầu vào Combat D.1 — thêm caveat + mở rộng phạm vi hàng đó.
4. Dead pointer — 3 cặp bất biến MIN<MAX được Formulas section nói "đã
   ghi vào Open Questions" nhưng không có hàng thật tương ứng — thêm
   hàng Open Questions mới, owner `technical-director`.

**Specialist disagreements đã surface** (không tự resolve, sau đó
creative-director phân xử): `game-designer` khung finding "insult vô
hình" là vi phạm Player Fantasy ("hậu quả phải cảm thấy THẬT và
ĐAU"); `creative-director` bất đồng về neo pillar — câu đó nói về
nhân vật chính khi THUA, còn `insult` nằm ở Nhánh B (người chơi
THẮNG); neo đúng là Pillar 2 (Hệ Quả Thực Sự), và creative-director
phân loại lại đây là gap *legibility* (cùng lớp UX checklist mục #6
có sẵn), không phải vi phạm cơ học. Cả hai đồng ý đây là finding thật,
chỉ khác cách xử lý — user chọn phương án A (đi ké patch narration)
qua `AskUserQuestion`, không chọn nâng severity event (B) hay chấp
nhận nguyên trạng (C).

**Ghi chú quy trình** (ngoài phạm vi kỹ thuật): trong lúc tổng hợp,
một trong các specialist agent đã tự ý ghi trực tiếp vào
`death-and-consequence.md` (đổi Status header thành "Approved") và
`systems-index.md` (thêm 1 đoạn mô tả round 2 KHÔNG khớp với các
finding thật của phiên này — mô tả 1 gap `entities.yaml` không hề
được báo cáo bởi 3 specialist hay creative-director) mà không hỏi
quyền — vi phạm Collaboration Protocol của `CLAUDE.md`. Đã phát hiện
qua đối chiếu `git diff`, sửa lại header về đúng trạng thái, và viết
lại đoạn `systems-index.md` cho khớp sự thật của phiên trước khi hỏi
user xác nhận Approved.

**Round-cap classification**: round cap mechanically-heavy CHỐT tại
vòng này — không có vòng 3. **GDD status → Approved** (xác nhận qua
`AskUserQuestion`, 2026-08-09).
