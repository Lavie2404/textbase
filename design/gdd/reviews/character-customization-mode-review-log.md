# Review Log — Character Customization Mode (hệ #16)

## Review — 2026-08-13 — Verdict: MAJOR REVISION NEEDED
Scope signal: L
Specialists: game-designer, systems-designer, economy-designer, ux-designer, qa-lead + creative-director (senior synthesis)
Blocking items: 10 | Recommended: 9
Summary: Phát hiện trung tâm (senior, không specialist nào tìm ra): write path
mới vừa KHÔNG bền vững (Persistence chỉ auto-save ở 2 checkpoint gate trên
Turn Manager mà hệ này bypass — hack-write in-memory mất trắng khi đóng tab),
vừa BỊ UNDO XÓA (ADR-0004 snapshot-restore giữ snapshot treo suốt cửa sổ
Undo, panel mở được đúng trong cửa sổ đó → Undo lượt trước rollback toàn bộ
hack-write, kể cả cờ `hack_mode_used_this_slot`) — Rule #7/#8, Edge Case
"Undo không tương tác" và AC-18 sai sự thật kỹ thuật. Ngoài ra: D.3 nhận
Infinity (poisoning 3 hệ downstream), rationale "Combat đã tự bảo vệ bằng
FLOOR_TOTAL" sai kỹ thuật (2 chỗ), mô hình submit "1 nút Lưu/3 khu" chưa có
dirty-tracking (4 specialist hội tụ độc lập), Rule #10 thiếu ghi kèm `state`
D.7 (nhân vật "Chờ Đột Phá" hack level → treo vĩnh viễn), D.4 thiếu
cardinality N≥1 thức/kỹ năng, custom content create-only mâu thuẫn fantasy
"thử nghiệm rẻ", hack-write giữa 2 snapshot lượt nhiễm log đo Core Hypothesis
MVP. Không finding nào đề nghị cắt tính năng — mọi item là bổ sung đặc tả.
Prior verdict resolved: First review

Ghi chú phân xử (creative-director):
- Bác bỏ Q1 của qa-lead (`tier_from_level` CÓ tồn tại trong
  `design/registry/entities.yaml`, status active — qa-lead đọc ngược tiền lệ
  situation-gen).
- Không lật quyết định user "chung namespace" — thuốc đúng là cơ chế xóa
  entry custom chưa-tham-chiếu, không phải đổi namespace.
- Không thêm dialog xác nhận (triết lý "không chặn bằng thủ tục" thắng
  tiền lệ O-ConfirmDelete — "tai nạn chính là tính năng").
- Rule #10: làm cả hai (gate no-op + cho ghi `current_exp`) + bắt buộc ghi
  nguyên tử bộ ba `(level, current_exp, state)` kèm bất biến chéo.
- Nhiễm MVP validation: BLOCKING (game-designer thắng economy-designer về
  mức, giải pháp rẻ: nhãn `hack_write` trong log HOẶC quy tắc quy trình).
- Xác minh 2 nghi vấn main review KHÔNG phải lỗi: ma trận 60/59 đúng; enum
  screen không có S3 khớp core-ui D.2 gốc.

Phân loại round-cap: hệ này KHÔNG phải mechanically-heavy (4 predicate
boolean thuần, 0 RNG, 0 economy curve; defect profile = interface/lifecycle
surgery, gần core-ui-screen-navigation hơn combat-system) → full
`/design-review` cycle, không áp round-cap 2 vòng. Không kích hoạt amendment
economy-derivation-gated (không có ≥2 hằng số tuning cần re-derive chung —
theo tiền lệ ngược setting-canon-integration).

### Revision cùng phiên (2026-08-13) — 10/10 blocking đã xử lý

4 quyết định user: B1 = hack-write hủy snapshot treo (khóa Undo lượt
trước, thay cho chặn-panel/merge-snapshot); B3 = 3 nút Lưu riêng theo
khu (thay cho 1 nút + dirty-tracking); B7 = cơ chế xóa entry custom
có điều kiện chưa-tham-chiếu (giữ chung namespace); B8 = nhãn nguồn
`hack_write` trong log trạng thái cơ học (thay cho quy tắc quy trình).

Thay đổi chính trong GDD: Rule #6 viết lại 4 phần (write-through
checkpoint thứ 3 / invalidate snapshot / nhãn log / ngữ nghĩa gốc);
Rule #1b bảng ánh xạ ẩn vs mờ-mực + live re-evaluate; Rule #4 pre-fill
+ rỗng→undefined; Rule #10 → giao dịch nguyên tử `(level, current_exp,
state)` + formula mới D.2b; Rule #11 + D.5 xóa có điều kiện; D.3 thêm
`is_finite` + knob mới `STAT_WRITE_MAX` (đóng Open Q#3); D.4 thêm
cardinality N≥1; gỡ 2 chỗ rationale FLOOR_TOTAL sai; Player Fantasy
viết lại trung thực; AC-08/18/21/23/27/28/30 rewrite + AC-33→AC-43
mới; danh sách propagate mở rộng (amendment persistence Core Rule #1,
amendment ADR-0004, schema log, World Memory, registry).

Trạng thái: "Designed — Revised, chờ re-review vòng 2 ở session mới"
(quyết định user). Sau khi Approved: chạy `/propagate-design-change`
(Open Q#1) rồi `/ux-design` O-Customize (Open Q#6).

## Review — 2026-08-13 — VÒNG 2 (re-review, session mới) — Verdict: NEEDS REVISION
Scope signal: L
Specialists: game-designer, systems-designer, economy-designer, ux-designer, qa-lead (cùng panel vòng 1, 5 session độc lập) + creative-director (senior synthesis)
Blocking items: 12 cụm (gộp root-cause từ 24 finding thô) | Recommended: 11 advisory + 7 nice-to-have
Summary: 10/10 fix vòng 1 xác nhận đúng hướng, 4 quyết định user đều
sống sót vòng adversarial thứ 2 — không lỗ hổng cấu trúc mới, defect
nông hơn một tầng. Pattern defect: "cơ chế đúng nhưng chưa quét hợp
đồng xung quanh" (B1 async/keying ADR-0002, B3 xóa thoát vòng đời #6,
B5 pattern undo-button + registry thiếu term, B6 minh bạch không có bề
mặt hiển thị) và "AC/claim viết từ mental model thay vì file nguồn"
(B2 fixture bất khả tồn tại + tier trong payload, B7 hostile-initiative
sai chiều 180°, B8 lệch 3 key STAT_FIELDS, B11 registry còn claim
FLOOR_TOTAL đã bác). B9 nhập liệu/thoát + B10 thiếu điều kiện S2-D
(hack lên slot đã chết — reachable thật) + B12 min_thuc chưa mirror.
Prior verdict resolved: Yes — MAJOR REVISION NEEDED vòng 1 → 10/10 blocking đóng.

Phân xử senior (creative-director):
- E1/Q11 hostile-initiative: economy thắng → BLOCKING (cùng lớp
  FLOOR_TOTAL, không hạ chuẩn vì fix rẻ).
- D.2b chiều ngược: game+systems thắng economy → BLOCKING ("tự-lành"
  chính là defect — level-up ma; fixture AC sẽ đóng đinh trạng thái
  bất hợp lệ thành hành vi được bảo vệ).
- Ngữ nghĩa xóa 3 hướng: chọn E8 (item giữ chặt "chưa TỪNG", đổi tên
  was_ever_equipped) + S6 (skill định nghĩa riêng "chưa từng resolve
  trong combat" + gỡ known_skill_ids); bác G6 nới lỏng — ghi Advisory
  A1, quyền quyết user.
- G5 no-op-vẫn-commit: lớp KHÁC phán quyết vòng 1 (đổi ngữ nghĩa ghi,
  không phải thủ tục) nhưng giữ ADVISORY — B6 chữa phần đau nhất trước.
- S1×Q8: bỏ "current_exp là số nguyên" → is_finite (kinh tế EXP float
  từ gốc); case test Q8 viết lại theo miền mới.

### Revision cùng phiên (2026-08-13) — 12/12 cụm blocking đã xử lý

User chọn sửa ngay theo fix creative-director phân xử (không còn câu
hỏi thiết kế mở). Thay đổi chính: D.1 +conjunct `is_death_turn` (ma
trận 60→120, AC-01); D.2b miền float + biên strict theo nhánh + bất
biến chéo HAI CHIỀU (fixture AC-08/35/36 sửa, bỏ `tier` khỏi payload
AC-08); D.3 sửa 3 key `Né/CritRate/CritDamage`; Rule #6a +a1 (trình tự
async committed()/failed(), khóa nút in-flight) +a2 (ràng buộc danh
tính khóa cho amendment persistence); Rule #6b nút Undo BIẾN MẤT theo
pattern + amendment phạm vi 3 nơi (AC-34 rewrite + precondition);
Rule #11/D.5 "xóa = hack-write commit đầy đủ" + điều kiện per-loại
(was_ever_equipped / was_ever_resolved_in_combat / gỡ known_skill_ids,
cascade all-or-nothing — AC-39 +d/+e, AC-40 "N thao tác commit");
Tuning Knobs + AC-24 sửa chiều hostile-initiative; UI Requirements
+feedback thành công +cảnh báo khóa-Undo tại chỗ +badge cờ +tap-ngoài/
Esc 2 bậc +Enter-submit-khu (AC-44→46 mới); Edge Case min_thuc cảnh-
báo-không-chặn (AC-47); ghi chú test setup tách 2 nhóm registry/import;
registry: sửa comment FLOOR_TOTAL của LEVEL_WRITE_MAX + đăng ký
STAT_WRITE_MAX; danh sách propagate Open Q#1 mở rộng thành 8 mục
(gồm World Memory structural entity-ref — A3 nâng vào propagate).

Advisory treo (A1-A11 + 7 nice): xem Gap Analysis GDD + phán quyết
senior. Round-cap: XÁC NHẬN LẠI không mechanically-heavy → full cycle;
không kích hoạt amendment economy-derivation (0 hằng số cần re-derive).

**Vòng 3 = verify hẹp, KHÔNG cần panel đầy đủ** (khuyến nghị senior):
systems-designer (B1-B4), ux-designer (B5/B6/B9/B10), qa-lead
(B7/B8/B11/B12 + toàn bộ fixture AC) — chỉ xác nhận fix khớp file
nguồn, không mở pass adversarial mới. Sau Approved:
`/propagate-design-change` (8 mục) → `/ux-design` O-Customize (AC-48+).

## Review — 2026-08-13 — VÒNG 3 (verify hẹp, session mới) — Verdict: NEEDS REVISION (hẹp)
Scope signal: L
Specialists: systems-designer (B1-B4), ux-designer (B5/B6/B9/B10),
qa-lead (B7/B8/B11/B12 + quét toàn bộ AC-01→AC-47) + creative-director
(senior synthesis, tự kiểm độc lập cả 2 finding trước khi phán)
Blocking items: 2 | Recommended: 3
Summary: Verify hẹp đúng phạm vi senior vòng 2 giao — 10/12 cụm fix
vòng 2 XÁC NHẬN khớp nguyên văn file nguồn (B1/B3-B12: signal ADR-0002,
keying turn_records, undo-button pattern, tiền lệ API key, chiều
hostile-initiative khớp cả con số gap=−30, 12/12 key STAT_FIELDS
ký-tự-cho-ký-tự, 7/7 entry registry tồn tại đúng giá trị, min_thuc
đúng knob authoring). Quét AC không lỗi số học, AC-08 sạch tier. Còn
2 blocking: (1) D.2b thiếu 2 conjunct — formula tụt sau prose Rule #10:
nhận `state="Chờ Đột Phá"` ở level không-mốc (phản ví dụ
`(25,200,"Chờ Đột Phá",25)=true` → "đột phá ma" vì
try_execute_breakthrough bên EXP không kiểm `level mod 10`), và nhận
exp vượt ngưỡng tại mốc với state thường (iff hai-vế-cùng-sai = true,
mâu thuẫn fixture AC-35 ký hiệu `·`); (2) AC-20 claim nhánh
`in_combat=true` "đã phủ bởi trạng thái mờ mực" nhưng không AC nào
test render mờ-mực cho điều kiện đó. Không lỗ hổng cấu trúc mới, 0
finding đụng 4 quyết định user — cả 2 defect thuộc dạng "văn bản chưa
đuổi kịp chính nó", mental model tài liệu đã ổn định.
Prior verdict resolved: Yes — NEEDS REVISION vòng 2 → 12/12 cụm đóng,
10/12 verify sạch, 2/12 phát sinh defect tầng nông hơn (B2 formula).

### Revision cùng phiên (2026-08-13) — 2/2 blocking đã xử lý

User chọn sửa ngay theo patch creative-director đã thẩm định 2 lớp
(specialist đề xuất + senior tự chạy phản ví dụ). Thay đổi: D.2b +2
conjunct (`level mod 10 ≠ 0 ⟹ state == "Tu Luyện Thường"`;
`level mod 10 == 0 ⟹ current_exp ≤ exp_threshold(level)`) + ghi chú
"Sửa vòng 3" + Example fail +case mới; AC-35 +2 fixture chặn đúng 2
phản ví dụ (mỗi fixture fail qua đúng conjunct mới thêm); AC-41 +case
(d) `in_combat=true` → mờ mực render-level (AC-20 giữ nguyên câu chữ,
claim nay thành đúng); header GDD cập nhật vòng 3. Cả 4 pass-fixture
và 7 fail-fixture cũ của AC-35 giữ nguyên kết quả sau patch (senior
đã kiểm).

Recommended treo (không chặn): R1 câu tường minh badge full-opacity
(hoặc defer /ux-design); R2 neo câu trích cho 2 suy-luận-loại-trừ ở
B10 (`tm_state` tại S2-D, `in_combat=false`) khi propagate chạy; R3
`referenced_by` 6/7 entry registry chưa liệt kê hệ #16 (đã tự khai,
backlog propagate).

**Vòng 4 = verify hẹp qa-lead DUY NHẤT** (khuyến nghị senior — cả 2
fix kết tinh thành fixture/AC, logic formula đã được senior kiểm độc
lập vòng này): phạm vi CHỈ D.2b + AC-35 + AC-41, không mở rộng, không
adversarial. Sạch → APPROVED không cần vòng 5 →
`/propagate-design-change` (8 mục, Open Q#1) → `/ux-design`
O-Customize (AC-48+). Chạy ở session mới (quyết định user).

## Review — 2026-08-13 — VÒNG 4 (verify hẹp qa-lead DUY NHẤT) — Verdict: APPROVED
Scope signal: L
Specialists: qa-lead (phạm vi CHỈ D.2b + AC-35 + AC-41, đúng khuyến nghị senior vòng 3 — không panel, không pass adversarial mới)
Blocking items: 0 | Recommended: 0 mới (R1-R3 + A1-A11 + 7 nice-to-have từ vòng 2/3 vẫn treo, không chặn)
Summary: Đúng dự đoán senior vòng 3 — sạch, không lỗ hổng mới. qa-lead tính tay
cả 7 conjunct của D.2b qua các giá trị biên (level=1, level=10 mốc dưới,
current_exp=0 tại mốc + "Chờ Đột Phá", current_exp lớn-hữu-hạn ở level
không-mốc) và cả 11 fixture AC-35 (4 pass + 7 fail) — không tổ hợp nào PASS
sai hoặc FAIL sai trong toàn miền hợp lệ. AC-41 case (d) khớp đúng hàng
`in_combat=true` của bảng ánh xạ ẩn/mờ Rule #1b (mờ mực, không phải ẩn) —
đóng đúng lỗ AC-20 nêu ở vòng 3. Không lỗ hổng cấu trúc mới, không bất đồng
specialist (chỉ 1 specialist tham gia vòng này).
Prior verdict resolved: Yes — NEEDS REVISION (hẹp) vòng 3 → 2/2 blocking đóng,
verify vòng 4 xác nhận cả 2 fix khớp nguyên văn, không phát sinh gì mới.

APPROVED — không cần vòng 5. Còn treo (không chặn implementation, theo dõi ở
Gap Analysis + Open Questions của chính GDD): R1-R3 (badge copy, trích dẫn
suy-luận-loại-trừ B10, registry `referenced_by` 6/7 entry), A1-A11 advisory
+ 7 nice-to-have (creative-director vòng 2), Open Q#1/#4/#5/#6. Bước kế tiếp:
`/propagate-design-change` (8 mục, Open Q#1) → `/ux-design` O-Customize
(AC-48+).
