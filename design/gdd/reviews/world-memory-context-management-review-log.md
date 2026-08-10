# Review Log — World Memory & Context Management

## Review — 2026-08-06 — Verdict: NEEDS REVISION
Scope signal: M (sửa tài liệu) — L (triển khai hệ này, không đổi bởi vòng review)
Specialists: game-designer, systems-designer, qa-lead, godot-specialist, ux-designer, creative-director (senior synthesis)
Blocking items: 7 | Recommended: 7
Summary: Kiến trúc lõi được xác nhận đúng (tách 2 tầng Nhật ký đầy đủ/AI
Context View, kỷ luật chỉ đọc `locked_result`, chứng minh O(1) theo
`world_time` vẫn vững) — không cần thiết kế lại. 7 mục blocking đều là
hoàn thiện đặc tả: (1) `has_signal` không phủ string/enum/array — đã tạo
mâu thuẫn đang tồn tại với `setting-canon-integration.md` tier 1; (2)
`top_K` thiếu tie-break + mô tả sai key hiện hành (đã lệch so với
`importance_tier` đã chốt ở hệ khác); (3) safe range `max_entities_per_
prompt` vi phạm invariant đã LOCKED ở `situation-encounter-generation.md`;
(4) `get_turn_page` — dependency "Cứng" của `core-ui-screen-navigation.md`
— không có AC nào; (5) reload sau đổi tuning knob gây hồi tố, vi phạm
AC-17/AC-21; (6) "chứng minh chặn trên" Formula #4 dùng giá trị trung
bình, không phải chặn cứng pointwise; (7) ví dụ "lời hứa NPC" ở Overview/
Player Fantasy hứa hẹn điều kiến trúc không giao được (đúng chủ đích,
theo anti-pillar "AI output không parse ngược thành world state"). Tất cả
7 mục đã được sửa trong cùng phiên theo quyết định người dùng (đặc biệt:
Persistence nay BẮT BUỘC lưu Khung ngữ cảnh AI — Core Rule #8 mới; thêm
Runtime Clamp cứng cho Formula #4; thêm mục Public Interface đầy đủ).
Prior verdict resolved: First review

## Review — 2026-08-06 — Verdict: NEEDS REVISION → Chấp nhận sau khi sửa (Approved)
Scope signal: L (sửa tài liệu, tương đương vòng 1) — XL cho triển khai thật (không đổi, hệ High-Risk cốt lõi)
Specialists: game-designer, systems-designer, qa-lead, godot-specialist, ux-designer, creative-director (senior synthesis)
Blocking items: 10 | Recommended: 6
Summary: Vòng re-review 2 (full mode). Kiến trúc lõi (tách 2 tầng dữ liệu,
kỷ luật chỉ đọc `locked_result`, chứng minh O(1) theo `world_time`, sàn
Undo Core Rule #5) được xác nhận VẪN VỮNG — không lung lay. Dân số lỗi đã
chuyển pha so với vòng 1: phần lớn là lỗi lớp sổ sách (hằng số/công thức
chép lạc hậu ở nhiều nơi — registry `entities.yaml` + 2 GDD khác — AC
không theo kịp bản sửa công thức vòng 1, 1 trích dẫn AC trỏ nhầm hàm),
ngoại trừ 2 mục lớp thiết kế thật: (1) `total_turns(slot)` — dependency
"Cứng" của `core-ui-screen-navigation.md` tồn tại từ trước vòng 1 (cùng ô
bảng với `get_turn_page`, vốn đã đóng) nhưng bị bỏ sót, nay đóng bằng
interface `total_turns()` mới; (2) Runtime Clamp đứng trên biến phantom
`ai_context_hard_token_budget` (không tồn tại ở `ai-llm-integration-
layer.md`/registry) — nâng thành Formula #5 đầy đủ (mệnh đề dừng, cơ chế
trả `{context, over_budget}` không throw), nhưng biến phantom vẫn TREO
(thuộc phạm vi GDD khác, ghi rõ ở Open Questions). RAM residency + sync/
async `get_turn_page` — mục nghiêm trọng nhất về kỹ thuật — KHÔNG sửa
trong văn bản GDD (vượt phạm vi 1 GDD, ràng buộc chữ ký của
`core-ui-screen-navigation.md`); route thành ADR bắt buộc ở
`technical-director`/`/create-architecture`, giả định MVP tạm thời (RAM-
resident, đồng bộ) đã ghi lại tường minh để có thể bị ADR bác bỏ. Toàn bộ
10 mục blocking đã sửa trong cùng phiên theo quyết định người dùng
(`total_turns()` không tham số; Runtime Clamp trả cờ `over_budget` không
throw; đồng bộ luôn registry + `situation-encounter-generation.md` +
`setting-canon-integration.md` D.5/AC-24/25). Creative-director khuyến
nghị đây là vòng adversarial đầy đủ CUỐI CÙNG cho GDD này — vòng sau nên
chuyển sang kiểm tra tĩnh (script chống doc-drift) + prototype riêng cho
bài toán RAM/paging thay vì lặp lại 5-agent review. 6 mục Recommended còn
mở (cửa sổ theo cảnh vs lượt thô, anchor fact, quản lý ranh giới nén ở
tầng nội dung, tuning `max_facts_per_entity` Full Vision, race condition
D.3 của #15, AC `get_processing_state` nhánh `fact_count>0`) — không
blocking, người dùng chấp nhận bản sửa và đánh dấu Approved mà không chạy
lại vòng adversarial đầy đủ.
Prior verdict resolved: Yes (vòng 1 — 7 blocking + 7 recommended đã sửa)
