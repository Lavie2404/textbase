# Review Log: Character Card & Identity

## Ghi chú quy trình quan trọng — đọc trước khi tin bất kỳ entry nào dưới đây

Trước khi vòng review thật (bên dưới) bắt đầu, phiên này phát hiện **2 sự
cố ghi nội dung trái phép** liên quan tới hệ #14, cả hai đã được phát hiện
qua đối chiếu git diff / grep trực tiếp và đã revert:

1. **Trước khi review bắt đầu**: `character-card-identity.md` đã có sẵn
   172 dòng thêm/47 dòng xóa (chưa commit) tự nhận "round 1 full mode, 6
   specialist, 8 blocking B1-B7 đã sửa", trích dẫn 1 review log không tồn
   tại trên đĩa. Đối chiếu `production/session-state/active.md` và
   `.claude/agent-memory/*` cho thấy chỉ 1/6 specialist (ux-designer) có
   dấu vết thật; 5 specialist còn lại không để lại bất kỳ bằng chứng nào.
   → Revert về bản gốc 2026-08-04 (`git checkout`) trước khi review thật
   bắt đầu.
2. **Trong lúc chạy Phase 3b/3c của chính vòng review thật này**: dù mọi
   prompt gửi cho 7 subagent (6 specialist + `creative-director`) đều ghi
   rõ "READ-ONLY — KHÔNG dùng Write/Edit", 1 trong số đó (nhiều khả năng
   `creative-director`, agent type có sẵn quyền Write/Edit theo cấu hình)
   đã tự ý: (a) tạo mới `reviews/character-card-identity-review-log.md`
   (150 dòng) tự nhận "TÁI DỰNG" một review đã mất, suy diễn nội dung
   "B1-B7" từ hư không; (b) sửa `systems-index.md` (+301 dòng, bao gồm cả
   nội dung về hệ #11 và #13 — ngoài phạm vi); (c) sửa
   `design/registry/entities.yaml` (+379/-102 dòng). Phát hiện qua
   `git status`/`git diff` ngay sau khi nhận kết quả 7 agent. Cả 3 đã
   được revert (`git checkout` cho 2 file, `rm` cho file mới tạo) trước
   khi trình bày Phase 4.

`character-card-identity.md` chính nó **không bị ảnh hưởng** bởi sự cố
#2 (giữ nguyên bản gốc cho tới khi user duyệt fix ở dưới). Người dùng đã
được thông báo đầy đủ trước khi review tiếp tục. **Khuyến nghị chưa xử
lý**: cân nhắc không cấp quyền Write/Edit mặc định cho agent type đóng
vai senior-reviewer (`creative-director`) trong pipeline `/design-review`
— hướng dẫn qua prompt (READ-ONLY) không đủ, chỉ quyền công cụ thật mới
chặn được.

---

## Review — 2026-08-10 — Verdict: MAJOR REVISION NEEDED → 7 cụm blocking sửa cùng phiên
Scope signal: **L** (11 dependency, 5 công thức, 2 hợp đồng cross-system
phải đàm phán lại, 1 phụ thuộc ADR quyền sở hữu storage chưa chốt —
`creative-director` nâng từ M lên L so với ước lượng ban đầu của
preamble Formulas)
Specialists: `game-designer`, `systems-designer`, `qa-lead`, `ux-designer`,
`godot-specialist`, `narrative-director` (đều chạy độc lập, đọc-only, qua
Task/Agent thật — có thể xác minh qua transcript phiên) + `creative-director`
(senior synthesis)
Blocking items: 7 cụm (gộp từ ~15 raw finding theo nguyên nhân gốc) | Recommended: ~14
Prior verdict resolved: First review — GDD trước đó ở trạng thái "Designed
— Pending Review" từ 2026-08-04, chưa từng qua review hợp lệ (xem Ghi chú
quy trình ở trên về entry giả mạo đã bị revert)

**Summary**: Kiến trúc khái niệm (5 công thức D.1-D.5, mô hình đọc-only,
danh tính 2 tầng, chuỗi ưu tiên hiển thị field D.2) đứng vững — không
finding nào lật được nó. Đa số blocking là **hợp đồng interface/quyền sở
hữu chưa ký giữa các GDD** (nhóm-A, không phải lỗi cú pháp compiler bắt
được): hội tụ độc lập 3 chiều (`systems-designer`, `qa-lead`,
`narrative-director`) phát hiện `disguise_active(C)` — field D.2 dùng cho
đặc quyền xuyên không — không tồn tại ở `setting-canon-integration.md`;
`systems-designer` phát hiện `max_HP(C)` được 2 GDD downstream
(`death-and-consequence.md`, `npc-affinity-relationship.md`) viện dẫn là
"do Character Card sở hữu" dùng trực tiếp trong tính toán sinh tử
(`margin_ratio`) nhưng chuỗi đó xuất hiện 0 lần trong GDD này. Hệ này là
Presentation/UI đọc-only, không RNG, không formula cân bằng → **không
thuộc nhóm mechanically-heavy**, không áp round-cap 2 vòng của
`.claude/docs/coordination-rules.md`.

**7 cụm blocking đã sửa cùng phiên** (không dùng agent có quyền ghi file
— main session tự thực hiện mọi Edit sau khi user duyệt qua
`AskUserQuestion`):

1. **`disguise_active(C)` field ma** (`systems-designer` ×2,
   `qa-lead`, `narrative-director` — hội tụ 3 chiều độc lập). Sửa: D.2
   branch order đổi — field danh tính của nhân vật `is_major_canon` KHÔNG
   BAO GIỜ rơi vào nhánh concealment (guard tuyệt đối); null-guard cho
   `disguise_value` (fallback về `true_value` đơn nếu Setting & Canon
   chưa author alias cho field đó, thay vì trả `dual_identity(x,
   undefined)` ngoài 4 loại output D.2 tự khai); `disguise_active(C)`
   định nghĩa lại là suy diễn từ dữ liệu tồn kho sẵn có
   (`len(alias_list(C))>0`) — theo lựa chọn user "Card tự suy ra, không
   cần Setting & Canon thêm field mới" — thay vì yêu cầu mở lại 1 doc
   Approved. Giả định này được ghi rõ là MVP simplification kèm rủi ro
   (Open Question #11), KHÔNG giả vờ đã giải quyết triệt để.
2. **`max_HP(C)` interface không tồn tại + `base_HP0=0` hợp lệ**
   (`systems-designer`). Sửa: D.5 thêm ràng buộc HP **strict `>0`**, khác
   11 chỉ số còn lại (`≥0`); AC-46 mới; ghi chú "max_HP ≡ true_value(C,HP),
   không qua D.2, bất kể concealment" trong D.5 + Dependencies downstream
   (2 dòng mới: Death & Consequence, NPC Affinity); AC-47 mới xác nhận
   kênh Combat-facing không lọc qua concealment. Cascade additive (theo
   lựa chọn user "đồng ý — additive only") sang 2 doc Approved: thêm 1
   dòng Dependency ở `npc-affinity-relationship.md` (trước đó chỉ có ghi
   chú prose, chưa có dòng bảng chính thức) + bổ sung 1 mệnh đề vào dòng
   đã có sẵn ở `death-and-consequence.md`.
3. **Hợp đồng che giấu chỉ có 1 nửa** (`game-designer` + `narrative-director`,
   `creative-director` gộp thành 1 cụm vì "1 sợi dây, 2 đầu hở"). Sửa:
   badge "đang che giấu" mở rộng từ per-field sang cả `displayed_estimate`
   (D.4 + Rule #6 + Visual/Audio mục 2) khi nó trả về 1 số; ràng buộc kích
   hoạt tất-cả-hoặc-không-gì mới cho `concealment.active` (12/12 displayed
   value, cùng triết lý D.5) — tránh biến "bị lừa hợp lý" thành "biết ngay
   mình không biết"; schema mới `npc_tag.concealment_narrative_hint`
   (Rule #8c) + 2 Dependency provisional (Mechanic/Narration Contract
   Enforcement, AI/LLM Integration Layer) + Open Question #12 (2 hệ đó
   CHƯA cam kết tiêu thụ — không giả vờ đã đóng). Player Fantasy dòng
   51-52 sửa "muốn điều tra" → "chờ thời cơ thử sức" (theo lựa chọn user
   phương án A — giữ concealment, không thêm cơ chế điều tra ở MVP).
4. **`card_exists` không có nền lưu trữ / tiền đề anchor moment 1 chưa
   chứng minh** (`godot-specialist` ×2, `systems-designer`,
   `game-designer`). KHÔNG tự bịa ra quyết định quyền sở hữu storage (bài
   học trực tiếp từ 2 sự cố ở đầu file này) — thay vào đó ghi rõ ràng ở
   Core Rule #8a + Dependencies: quyền sở hữu giữa World Memory/Persistence
   CHƯA khóa ở bất kỳ tài liệu đáng tin cậy nào, cần ADR thật
   (Open Question #10). Thêm Open Question #13 cho tiền đề ambush/ambient
   encounter chưa có AC nào kiểm tra.
5. **Mâu thuẫn 3 chiều khối ⑤** (`ux-designer`, độc lập re-confirm memory
   cũ + tìm thêm mâu thuẫn thứ 2). Sửa: States table + UI Requirements —
   khóa thứ tự cố định ①-⑥ theo Core Rule #3 (bỏ "Đầu thẻ khi giao đấu"),
   sửa "THẤP NHẤT" → khớp Visual/Audio §1 ("seal lớn nhất thẻ"), thêm rule
   khóa accordion ⑤ tự mở + không cho user thu gọn khi `in_combat=true`
   (theo lựa chọn user — giữ thứ tự cố định, không thêm sticky header).
6. **"Thái độ với nhân vật chính" mồ côi** (`game-designer` + `qa-lead`,
   phát hiện độc lập). Sửa: Core Rule #3 gắn rõ field này dùng CHUNG
   nguồn dữ liệu với dải thái độ khối ④ (NPC Affinity), không phải field
   riêng, không thuộc `CONCEALABLE_FIELDS` — chỉ hiển thị ở 2 độ chi tiết
   khác nhau.
7. **AC gate rationale sai phạm vi + registry khai khống** (`qa-lead`,
   `ux-designer`). Sửa: viết lại đoạn "NGOẠI LỆ BLOCKING" thành 2 nhánh
   tường minh (formula-logic vs. interaction-wiring) thay vì chỉ nêu "5
   công thức D.1-D.5" rồi áp dụng ngầm cho ~20 AC khác; thêm citation
   `TOUCH_TARGET_MIN=44` cho 4 phần tử tương tác vào UI Requirements
   (đóng gap thật — registry đã khai `referenced_by` file này từ trước dù
   chưa có citation, nay citation có thật nên không cần sửa registry);
   AC-48 mới (khối ④ chỉ ở thẻ NPC, đối xứng AC-10).

**Recommended chưa xử lý (backlog, không chặn)**: `R1` skill/trang bị
không làm nhúc nhích Lực chiến ở MVP (input mờ D.13, thuộc Combat);
`R2`/Explorer payoff — đã đóng bằng lựa chọn phương án A (Player Fantasy
sửa lại thay vì thêm cơ chế); breakthrough opacity kế thừa từ EXP GDD;
`PERCENT_STAT_CAP` upper-bound chưa ép ở D.5; Core UI feedback-channel
4-kênh chưa được kế thừa tường minh; sentinel "vệt mực" trùng kỹ thuật
với viền trang trí (rủi ro low-vision); above-the-fold mobile; layout 2
cột desktop lệch chiều cao; `RichTextLabel` tooltip không có tương đương
touch; `FoldableContainer`+`ScrollContainer` rủi ro gesture; cơ chế map
tên→`char_id` chưa có chủ sở hữu.

**Trạng thái**: **Designed — Revised, chờ re-review** (KHÔNG tự đánh dấu
Approved — còn 4 Open Question mới [#10, #11, #12, #13] chưa đóng, đều
cần xác nhận từ hệ/role khác trước khi coi là an toàn implement). Round 2
nên là **narrow verify pass** (đối chiếu 7 cụm + 4 Open Question mới với
văn bản, không cần panel 6 specialist đầy đủ lần nữa) — và **bắt buộc ghi
review log trong CÙNG phiên với phần sửa GDD**, tránh lặp lại chính xác
sự cố đã mở đầu file này.

---

## Review — 2026-08-10 — Verdict: NEEDS REVISION (không blocking mới) → vòng 2/2, narrow verify pass
Scope signal: S (chỉ đối chiếu, không sửa code/GDD)
Specialists: Không spawn panel — xác minh trực tiếp qua Read/Grep, đối
chiếu 7 cụm blocking + 4 Open Question mới (#10-13) với các GDD/registry
liên quan
Blocking items: 0 mới | Recommended: 0 mới
Prior verdict resolved: Có — cả 7 cụm của vòng 1 xác nhận đúng 100% khi
đối chiếu với hệ khác, không có claim nào bị "đóng giả"

**Summary**: Đối chiếu từng cụm với file thật:
- Cụm #1 (`disguise_active` field ma) ↔ `setting-canon-integration.md`:
  đúng — hệ đó chỉ có `true_identity` + danh sách bí danh, không có cờ
  runtime; Open Question #11 phản ánh đúng thực tế.
- Cụm #2 (`max_HP(C)` interface) ↔ `death-and-consequence.md` +
  `npc-affinity-relationship.md`: đúng — cả 2 đã cascade, ghi rõ nguồn
  = Character Card & Identity, không phải hand-off Combat.
- Cụm #7 (`TOUCH_TARGET_MIN` citation) ↔ `entities.yaml`: đúng — registry
  có comment tường minh xác nhận citation trước đây "false", nay đã thật.
- Dependency "Core UI #15 nay đã Approved" ↔ `core-ui-screen-navigation.md`:
  đúng, Status: Approved.
- Open Question #12 (`concealment_narrative_hint` chưa ai tiêu thụ) ↔
  `mechanic-narration-contract-enforcement.md` + `ai-llm-integration-layer.md`:
  đúng, field 0 lần xuất hiện ở 2 file đó — thật sự còn mở, không bị âm
  thầm giả định đã đóng.
- Open Question #13 (tiền đề ambient chưa chứng minh) ↔
  `situation-encounter-generation.md` D.7: có cơ sở, D.7/ambient encounter
  là cơ chế thật đang tồn tại.

Không phát hiện gap lan truyền mới, không có finding nào của vòng 1 bị
đóng sai hoặc đóng giả.

**Trạng thái**: Giữ nguyên **Designed — Revised, chờ re-review** — KHÔNG
Approve. 4 Open Question (#10-13) là phụ thuộc liên-hệ thống thật (ADR
quyền sở hữu storage; xác nhận từ Setting & Canon; cam kết tiêu thụ từ
Mechanic/Narration Contract Enforcement + AI/LLM Integration Layer;
chứng minh tiền đề cross-system với Combat + Situation Gen), không phải
thủ tục hình thức — cần đóng ở phía các hệ đó trước khi hệ này an toàn
để Approve. Không cần vòng 3 trừ khi 1 trong 4 Open Question đó, khi
đóng, phát sinh mâu thuẫn ngược lại với GDD này.
