# Review Log — game-concept.md (Vô Danh Lục)

## Review — 2026-08-01 — Verdict: NEEDS REVISION (nhẹ)
Scope signal: XL
Specialists: game-designer, systems-designer, economy-designer, narrative-director, qa-lead, godot-specialist, creative-director (tổng hợp)
Blocking items: 4 | Recommended: 7

Summary: Concept-stage document, không bị phạt vì thiếu công thức/tuning (đúng kế hoạch, hoãn sang `/design-system`). Bốn vấn đề cấu trúc cần sửa trước khi vào `/map-systems`: (1) Khế Ước Cơ Học/Tường Thuật không thể chỉ dựa "prompt engineering", cần nguyên tắc kiến trúc một chiều; (2) đòn bẩy phá tiền đề nhân quả canon không nên độc quyền bởi tình cảm/thân mật; (3) MVP có NPC hảo cảm preset sẵn tự phủ định chính hệ thống nó cần validate; (4) tiêu chí FAIL không kiểm toán được ở quy mô ≥90 lượt. Ba specialist độc lập (game-designer, narrative-director, systems-designer) hội tụ về vấn đề (3). Có bất đồng chưa giải quyết giữa specialist về hướng xử lý cơ chế Cứu Mệnh (bỏ hẳn vs. hiệu chỉnh vs. đổi thành vật phẩm) — người dùng chọn phương án bỏ hẳn (game-designer).

Revisions resolved trong cùng phiên (không chạy re-review riêng): cả 4 blocking + toàn bộ 7 recommended đã áp dụng, bao gồm bỏ hẳn cơ chế Cứu Mệnh (thay bằng ngưỡng Hảo cảm thù địch sâu sắc -100→-80 quyết định nguy cơ chết thật, các mức khác chịu hậu quả phi-tử có thể khôi phục). Người dùng bổ sung thêm nội dung mới ngoài phạm vi review gốc: hệ thống Thẻ Nhân Vật (Character Card) và cơ chế "xuyên không" (nhân vật chính biết trước thông tin nguyên tác như một đặc quyền thông tin của người chơi, không rò rỉ vào world-state).

Prior verdict resolved: First review — chưa có re-review xác nhận sau sửa (người dùng chọn "Chấp nhận, không re-review").

## Review — 2026-08-11 — Verdict: APPROVED (re-review xác nhận, narrow verify pass)
Scope signal: M (verify + 5 sửa metadata, không đổi thiết kế)
Specialists: 1 agent verify (read-only, adversarial) — kiểm 4 blocking cũ
+ bỏ Cứu Mệnh trong văn bản hiện tại, drift check 7 nhóm cơ chế với 13
GDD Approved, rà trạng thái header/checklist/Open Questions.
Blocking items: 0 | Recommended: 5 (toàn metadata, áp cùng phiên)
Prior verdict resolved: **Có** — cả 4 blocking 2026-08-01 + quyết định
bỏ Cứu Mệnh xác minh CÓ THẬT trong văn bản (kiến trúc một chiều Khế Ước
[cấm parse ngược]; đòn bẩy phá tiền đề mở rộng phi-tình-cảm; NPC preset
có lý giải 3 tầng AC [tầng preset không dùng validate]; tiêu chí FAIL
kiểm toán bằng log cơ học ≥90 lượt; "Cứu Mệnh" 0 match toàn file, thay
bằng ngưỡng −80).

**Drift check**: 0 mâu thuẫn thiết kế. [KHỚP] 5/7 nhóm nguyên văn
(−80/chết thật ↔ D&C 3c + NPC Affinity R5; Khế Ước ↔ Contract
Enforcement CR#3; 20 cấp LOCKED ↔ situation-gen D.2; Card + xuyên không
↔ card GDD + setting-canon CR#2 [chữ "nhân vật quan trọng" của concept
tương thích với hạ phạm vi char_id 2026-08-11]; Song Tu/EXP không cộng
dồn + 4% + 10 cấp/bậc ↔ exp-realm). 2 drift NHẸ chữ nghĩa đã sửa: (1)
Pillar 2/Anti-Pillar thêm mệnh đề "trừ lượt dẫn đến chết thật không
undo" (khớp turn-manager CR#9 — vốn suy diễn hợp lệ từ chính Anti-Pillar
concept); (2) MVP scope bổ sung "2–3 sự kiện canon" + "~5–8 địa điểm"
(điều kiện tối thiểu của setting-canon R1 + situation-gen mà concept
chưa liệt kê — Content Volume + Required #2).

**Metadata đồng bộ**: header Draft → Approved (một tài liệu Draft đang
là điểm neo LOCKED của ≥13 GDD Approved là bất nhất quy trình — chính là
lý do vòng này cần chạy); 4 Open Question đánh dấu ✅ ĐÃ ĐÓNG kèm con trỏ
tới GDD sở hữu (bộ test biên/inclusivity; đường cong EXP + Hảo cảm
không-decay; giữ 4%; 12 chỉ số thống nhất); Next Steps tick 4 mục đã
hoàn thành (design-review, prototype khe-uoc-ai-concept, map-systems,
GDD 16 hệ). Các OQ còn mở giữ nguyên: AI service ADR, EXP multi-source
đặc tả chi tiết, khôi phục đan điền, cơ chế điều tra concealment.

**GDD status → Approved** (user xác nhận qua `AskUserQuestion`
2026-08-11). Files touched: `design/gdd/game-concept.md` (header, Pillar
2, Anti-Pillar, Content Volume, Required #2, Open Questions ×4, Next
Steps), file log này.
