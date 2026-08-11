# Review Log — Combat System (#7)

## Review — 2026-08-06 — Verdict: NEEDS REVISION
Scope signal: L (5 dependency hard, 14+ formula sau khi tách D.14, chạm 6 hệ downstream, cơ chế kiệt sức mới có thể cần ADR riêng nếu ảnh hưởng ngân sách `narration_call`)
Specialists: game-designer, systems-designer, qa-lead, ux-designer, ui-programmer, godot-specialist, ai-programmer, creative-director (senior synthesis)
Blocking items: 7 (5 cụm gộp từ hội tụ đa specialist) | Recommended: 19
Summary: Kiến trúc lõi (vòng lặp pha giao đấu, hợp đồng khóa-trước-tường-thuật, cấu trúc D.9/D.9b/D.9c) đứng vững — cả 5 blocker chính đều là lỗ hổng cục bộ sửa được bằng nguyên tắc chính tài liệu đã thiết lập ở chỗ khác (không phải MAJOR). 3 điểm hội tụ đa specialist độc lập ở mức cao nhất: (A) D.4 không có sàn sát thương → bế tắc "đấm vào tường" 2 chiều, cộng hưởng D.10 HP Regen khiến trận không hội tụ, buộc chạy tới `TECHNICAL_EXCHANGE_CAP=200` rồi coin_flip ẩn quyết định — vi phạm tường minh Anti-Pillar "không luật phi-diegetic ghi đè kết quả công thức" (`game-concept.md` dòng 225/319); (B) `coin_flip(seed=exchange_id)` (D.2, D.9c) tự-seed theo bộ đếm reset mỗi trận → thiên vị hệ thống cố định giữa các trận + tương quan 2 lời gọi cùng exchange_id + phá vỡ re-roll thật khi Undo (AC-37/Turn Manager AC-12); (C) thuật toán chọn thức NPC chia-cho-0 khi mọi thức còn lại tier=0, VÀ có logic nghịch đảo — NPC bị thiết kế để tự tối đa hóa phạt gear-gap của chính mình (lợi thế hệ thống ẩn cho người chơi, chạm Pillar 1/3). 2 blocker bổ sung do creative-director nâng từ phát hiện đơn lẻ: (D) schema `locked_result` mô tả không khớp ở 3 nơi, AC-09 không thể thỏa mãn bởi chính D.8; (E) hành động "Phòng thủ" không có tác dụng cơ học nào được định nghĩa cho cả người chơi lẫn NPC. 2 blocker UX (cảnh báo áp chế cảnh giới bị chôn ở độ nổi bật thấp nhất; 2/6 thức bị ẩn khi >4 lựa chọn, lối thoát duy nhất là gõ tay) được creative-director phân xử giữ trong phạm vi GDD này (quyết định), thi công chi tiết hoãn `/ux-design`. 1 bất đồng specialist (NPC state-awareness) được phân xử: vấn đề thật không phải "NPC không đọc HP để chọn thức" mà là "NPC không bao giờ bỏ chạy" — đóng bằng 1 quy tắc mới tái dùng D.11.
Prior verdict resolved: First review (dù file đã qua nhiều lần sửa "2026-08-03/05" xuất phát từ review của các GDD khác)

## Revision — 2026-08-06 — Sửa ngay trong cùng phiên (theo lựa chọn người dùng: "Sửa GDD ngay")

4 quyết định thiết kế được chốt qua `AskUserQuestion` (đều theo phương án Recommended của creative-director) trước khi sửa:
1. Cơ chế giải quyết bế tắc D.4 → **sàn chip `MIN_RAW_RATIO` + kiệt sức lũy tiến `EXHAUSTION_ONSET_EXCHANGE`** (D.4b mới, giảm dần HP Regen về 0 tới `TECHNICAL_EXCHANGE_CAP`).
2. Tác dụng "Phòng thủ" → **cả DEF và Né tránh** cùng tăng (hệ số nhẹ hơn mỗi loại: `DEFEND_DEF_MULT`/`DEFEND_NE_MULT`, mặc định 1.2/1.2).
3. NPC bỏ chạy khi HP thấp → **Có**, ngưỡng `NPC_FLEE_HP_THRESHOLD` mặc định 0.20, tái dùng D.11.
4. Danh sách hành động khi >4 lựa chọn → **ưu tiên tier cao nhất + nút "Xem thêm"**, giữ 100% thao tác trong phạm vi chạm.

| # | Blocking item | Fix applied |
|---|---|---|
| A | D.4 không có sàn sát thương → bế tắc 2 chiều → không hội tụ | Thêm `MIN_RAW_RATIO` vào D.4 (sàn chip ≥5% ATK khi trúng) + D.4b mới (kiệt sức lũy tiến giảm HP Regen D.10 về 0 tới cap) + AC-46/47 (AC-47 flag cần prototype số xác nhận hội tụ trước khi coi PASS hoàn toàn) |
| B | `coin_flip(seed=exchange_id)` thiên vị cố định + phá Undo re-roll | Bỏ hoàn toàn self-seed ở D.2 và D.9c, `coin_flip()` dùng `roll_uniform` injected; viết lại AC-15/AC-41c theo phân phối roll mock |
| C | Chọn thức NPC: chia-cho-0 + logic nghịch đảo | Thay thế hoàn toàn bằng D.14 mới (phân phối đều trên `eligible_low` = thức không bị D.1 phạt, fallback `eligible_all` rồi `basic_attack`) — không còn chia cho `Σtier`; AC-48/49/50 |
| D | Schema `locked_result` không khớp ở 3 nơi, AC-09 bất khả thi | Core Rule #11 giờ là nguồn sự thật duy nhất (`per_actor` lồng theo actor_id), bỏ `dodge`, thêm `heal` bắt buộc; D.8/D.9 tham chiếu ngược; AC-09/24 cập nhật |
| E | "Phòng thủ" không có tác dụng cơ học | Core Rule #2b mới: tăng `effective_DEF`/`effective_Né` theo `DEFEND_DEF_MULT`/`DEFEND_NE_MULT`; NPC Tầng 1 bỏ chạy dưới `NPC_FLEE_HP_THRESHOLD` (Core Rule #2); NPC KHÔNG BAO GIỜ tự chọn Phòng thủ/Vật phẩm (ranh giới phạm vi có chủ đích, AC-53 negative test); AC-51/52 |
| F | Cảnh báo áp chế cảnh giới bị chôn ở độ nổi bật thấp nhất | Tách 2 tín hiệu trong Visual/Audio Requirements: `estimate_ratio` (xác suất, giữ thấp, Core Rule #7) vs chênh lệch cảnh giới thô (sự thật đã khóa, độ nổi bật cao, khung "con dấu" riêng) |
| G | 2/6 thức bị ẩn khi >4 lựa chọn, chỉ gõ tay | UI Requirements: ưu tiên tier cao nhất + 1 ô "Xem thêm" mở danh sách đầy đủ dạng nút chạm; thi công chi tiết hoãn `/ux-design` |

Recommended đã tiện thể đóng (chi phí thấp, nằm cùng vùng sửa blocking): D.12 thêm ghi chú implementation (ép kiểu số thực trước `ceil()`, tránh integer-division truncation trong GDScript); `systems-index.md` — thêm ghi chú gap dependency Character Card & Identity → Combat (đối xứng với ghi chú đã có ở hệ #14) + viết lại mục High-Risk Systems của Combat theo 3 LỚP rủi ro (biên giá trị / liveness-termination / determinism-vs-undo) thay vì theo thực thể.

Recommended CHƯA đóng trong lần sửa này (còn nguyên trong Recommended Revisions của báo cáo review, để lại cho vòng sau hoặc sprint riêng): grind "Đánh thường" cần đo lại bằng playtest sau khi D.4/D.4b có prototype số; ambiguity "Đánh thường" có tính `skill_tier_used` hay không; thiếu phản hồi hậu-trận (margin/số pha) cho người chơi; phạt gear-gap theo thức vô hình với UI; `is_spar_friendly` chưa truyền xuống Death & Consequence; D.6 `effective_Amp` không trần; D.1×D.5 CritDamage bị cứu sớm; K_HIT bão hòa ở ~45 điểm chênh ACC/Né; D.9c chưa nối tường minh vào D.9 pseudocode; nhiều AC coverage gap (D.1 non-skill action, D.11 roll-mock, D.9b cache test, non-spar negative test, AC-41h/i nhãn Integration, AC-45 testability, AC-27 tiêu chí cấu trúc); flag kiến trúc static-function-vs-spy-test; race condition Undo đa hệ (Turn Manager UI Requirements "[To be designed]"); free-text input số liệu bịa; ghi chú cấm `is_equal_approx()` cho so sánh SPD/HP tie; `no_outcome` tín hiệu tạm thời dễ bỏ lỡ; hard-cut HP thiếu tín hiệu độ lớn; D.13 `Lực_chiến` có thể âm; D.9b dùng Lực chiến base; nguồn cung `combat_item_id`; touch target/contrast/AI-wait indicator; ADVISORY AC cho 3 tín hiệu outcome.

Trạng thái sau sửa: **Designed — Revised, chờ re-review (vòng 2)**. Khuyến nghị mạnh nhất của `creative-director`: chạy 1 prototype số nhỏ (~30 dòng, harness mô phỏng quét Safe Range) xác nhận D.4/D.4b thực sự đảm bảo hội tụ TRƯỚC vòng re-review — đây là câu hỏi số học, không phải ý kiến. Vòng 2 KHÔNG nên chạy lean (delta vòng 1 đưa vào cơ chế MỚI — kiệt sức, thuật toán NPC viết lại, "phòng thủ" định nghĩa lần đầu, NPC bỏ chạy, schema hợp nhất — cần đối kháng đầy đủ, không chỉ vệ sinh câu chữ).

---

## Review — 2026-08-06 — Vòng 2 — Verdict: NEEDS REVISION
Scope signal: L (6 dependency hard, 14 formula, harness số ngoài phạm vi tài liệu, chạm 5 hệ downstream, D.4b đổi hình dạng cơ chế)
Specialists: game-designer, systems-designer, qa-lead, ux-designer, ui-programmer, godot-specialist, ai-programmer, creative-director (senior synthesis)
Blocking items: 6 cụm gộp (R2-1 → R2-6) | Recommended: ~20
Summary: Kiến trúc lõi (vòng lặp pha giao đấu, hợp đồng khóa-trước-tường-thuật, cấu trúc D.9/D.9b/D.9c) vẫn đứng vững — không nâng MAJOR. Phát hiện quan trọng nhất KHÔNG phải 1 bug đơn lẻ mà là 1 MÔ HÌNH LỖI LẶP LẠI: 4/7 fix của vòng 1 (A, B, D, G) được kiểm chứng theo *instance* thay vì theo *invariant* — sửa đúng ví dụ nêu ra, không sửa lớp vấn đề ví dụ đó đại diện, và bị phát hiện lại ở vòng 2. Cụ thể: (R2-1, quan trọng nhất) `systems-designer` CHỨNG MINH BẰNG SỐ (không chỉ suy luận) rằng D.4b vòng 1 (chỉ giảm HP Regen) KHÔNG đảm bảo hội tụ — chỉ 0-3/36 tổ hợp Safe Range hội tụ trước `TECHNICAL_EXCHANGE_CAP`, kể cả khi Regen về đúng 0; nguyên nhân gốc: sàn chip D.4 neo theo `effective_ATK`, chính đại lượng bị D.1 đè bẹp trong kịch bản bế tắc. (R2-2) `game-designer` + `ux-designer` hội tụ độc lập: bố cục UI "Xem thêm" vòng 1 chỉ liệt kê thức, khiến Phòng thủ/Bỏ chạy có thể bị đẩy hoàn toàn ra khỏi lối chạm khi ≥4 thức chưa dùng — tái lập chính xác lỗi Fix G vừa đóng, lần này trên "Bỏ chạy" (hành động cứu mạng thật). (R2-3) `ui-programmer`/`qa-lead`: D.9 (formula trung tâm) chỉ mô hình hóa `action_type="skill"`, không dispatch cho defend/flee; `action_type="item"` thiếu HOÀN TOÀN cơ chế resolution (không chỉ thiếu nội dung như Open Questions vòng 1 ghi). (R2-4) `qa-lead`: bug tráo `hp_after` giữa 2 actor khi D.9 ghép `per_actor` theo nghĩa đen; field `hp` thừa không khớp schema; tàn dư "coin_flip theo `exchange_id`" ở Edge Cases mâu thuẫn trực tiếp D.9c đã sửa (quay lại đúng bug B "đã đóng"); AC-01 mâu thuẫn bảng States. (R2-5) `ai-programmer`: D.14 định nghĩa PHÂN PHỐI nhưng không định nghĩa PHÉP CHỌN (không có dòng `roll_uniform` nối vào việc chọn phần tử, `chosen_pool` không thứ tự tất định) — phá cam kết determinism. (R2-6) `systems-designer`: D.9b/D.9c chia `hp/max_HP` không tự khai `max_HP>0`; `Lực_chiến` (D.13) có thể âm, đẩy `parity_diff` vượt chính output range D.9b tự khai.
Prior verdict resolved: Một phần — 4/7 fix vòng 1 (A, B, D, G) bị phát hiện chưa đóng đúng, 3/7 (C, E, F) đứng vững qua vòng 2.

## Revision — 2026-08-06 — Sửa ngay trong cùng phiên (theo lựa chọn người dùng: 4 quyết định QĐ-1→QĐ-4, tất cả theo khuyến nghị)

**QĐ-1 (Recommended)**: chạy harness số TRƯỚC khi sửa R2-1 — viết harness Python độc lập (`/tmp/combat_harness.py`), mô phỏng expected-value quét Safe Range. Xác nhận: cơ chế vòng 1 (chỉ giảm Regen) hội tụ 0-3/36 tổ hợp; cơ chế mới (drain cộng dồn `EXHAUSTION_DRAIN_PCT≥0.05` + trần `HP_REGEN_CAP≤0.05`) hội tụ **72/72 tổ hợp**, kể cả biên `P_MIN=0.05`.
**QĐ-2 (Recommended)**: cắt "Vật phẩm chiến đấu" (`action_type="item"`) khỏi phạm vi MVP — không phục vụ pillar nào, thiếu cả cơ chế resolution chứ không chỉ nội dung. `combat_item_id` giữ lại dành sẵn cho tương lai.
**QĐ-3 (Recommended)**: đổi "Phòng thủ" từ nhân hệ số DEF/Né sang giảm trừ sát thương tất định `DEFEND_DMG_REDUCTION_PCT` (tích hợp vào D.6) — không còn bị chip-floor D.4 vô hiệu hóa, có affordance rõ ràng hơn.
**QĐ-4 (Recommended)**: staffing vòng 3 (nếu cần) — đầy đủ 7 specialist, không cắt domain.

| # | Blocking item | Fix applied |
|---|---|---|
| R2-1 | D.4b (kiệt sức) không đảm bảo hội tụ — chứng minh bằng harness (0-3/36 tổ hợp) | Thêm `exhaustion_drain` (hao tổn cộng dồn ĐỘC LẬP với ATK/DEF, D.4b) + `HP_REGEN_CAP` (trần cứng Regen, D.10) — xác nhận 72/72 tổ hợp Safe Range bằng harness; AC-47 tách AC-47a (tất định, BLOCKING) / AC-47b (Monte Carlo, ADVISORY); thêm ràng buộc chéo `EXHAUSTION_ONSET_EXCHANGE > CONTENT_EXCHANGE_ESTIMATE` đang dùng |
| R2-2 | UI "Xem thêm" loại trọn category Phòng thủ/Bỏ chạy khỏi lối chạm khi ≥4 thức | Bố cục 4 ô CỐ ĐỊNH VỊ TRÍ: Ô 3="Phòng thủ", Ô 4="Bỏ chạy" (không bao giờ bị thay thế), Ô 1-2=thức (tier cao nhất, tie-break `thuc_id`) hoặc "Xem thêm" khi >2 thức; viết invariant tường minh "không category nào bị loại trọn"; AC-11 viết lại |
| R2-3 | D.9 chỉ mô hình hóa action_type="skill"; item thiếu cơ chế resolution | D.9 viết lại: dispatch tường minh theo action_type (skill/defend/flee), nối D.11 (flee ưu tiên trước SPD) + D.9c (gọi tường minh cuối resolve_exchange); item CẮT khỏi MVP (QĐ-2) |
| R2-4 | Bug tráo hp_after giữa actor; field hp thừa; tàn dư coin_flip(exchange_id); AC-01 mâu thuẫn States | D.9 ghép per_actor TƯỜNG MINH theo actor_id (không spread r1/r2); bỏ field hp cấp ngoài; sửa Edge Case dòng tàn dư; AC-01 viết lại khớp bảng States (in_combat tắt ở lượt SAU battle_active); AC-25/26 thêm assert theo actor_id |
| R2-5 | D.14 không định nghĩa phép chọn, phá determinism | Thêm `chosen_pool` thứ tự tất định (sort theo thuc_id) + dòng `chosen_index = floor(roll_uniform × |pool|)`; AC-48 bổ sung assert determinism |
| R2-6 | D.9b/D.9c thiếu tiền điều kiện max_HP>0; Lực_chiến có thể âm | Thêm ghi chú tiền điều kiện + `max(max_HP,1)` phòng vệ ở D.9b/D.9c; D.13 chặn `max(0, CritDamage-1)` tại nguồn + `max(0, ...)` ở tổng — `Lực_chiến` LUÔN ≥0 |

Recommended đã tiện thể đóng cùng phiên (chi phí thấp): cấm `is_equal_approx()` cho so sánh bằng-tuyệt-đối (ghi vào notation conventions chung); ghi chú kiến trúc RNG injection (tham số hóa, không global/autoload); ghi nhận có chủ đích "D.1×D.5 CritDamage bị cứu sớm" (không sửa cơ chế, chỉ tường minh hóa quyết định).

Recommended CHƯA đóng (còn nguyên, để lại vòng sau/sprint riêng): grind "Đánh thường" cần playtest sau AC-47b; ambiguity "Đánh thường" có tính `skill_tier_used`; thiếu phản hồi hậu-trận (margin/số pha); phạt gear-gap vô hình với UI; `is_spar_friendly` chưa truyền xuống Death & Consequence; D.6 `effective_Amp` không trần; K_HIT bão hòa ~45 điểm chênh; AC coverage gap còn lại (D.1 non-skill action, D.11 roll-mock ca thường, D.9b cache test, non-spar negative test, AC-41h/i nhãn Integration + spy D.11/D.14, AC-45 testability, AC-27 tiêu chí cấu trúc); race condition Undo đa hệ; free-text input số liệu bịa; `no_outcome` tín hiệu tạm thời dễ bỏ lỡ (đề xuất thời lượng hiển thị tối thiểu); D.9b dùng Lực chiến base không effective; touch target/contrast/AI-wait indicator (đề xuất chuyển phạm vi sang Turn Manager/AI-LLM Integration Layer); ADVISORY AC cho 3 tín hiệu outcome Visual/UI; copy text phân biệt 2 tín hiệu cảnh giới (Fix F); thứ tự popover "Xem thêm" — đã có tie-break tất định nhưng chưa kiểm tra UX thực tế; chuỗi flee thất bại nhiều pha liên tiếp thiếu AC boundary; D.14 phân phối đều (ghi nhận có chủ đích, không sửa).

Trạng thái sau sửa: **Designed — Revised, chờ re-review (vòng 3)**. Khác biệt so với vòng 1: `creative-director` đặt điều kiện — R2-1 KHÔNG được coi là đóng chỉ vì sửa văn bản; đã đáp ứng bằng harness số thật (72/72 tổ hợp), không phải lập luận định tính. Vòng 3 nên chạy full panel (không cắt domain, đúng QĐ-4) vì `ux-designer`/`ai-programmer` mỗi bên từng tìm blocking mà không agent nào khác chạm tới ở vòng 2.

---

## Review — 2026-08-06 — Vòng 3 — Verdict: NEEDS REVISION
Scope signal: L cho phần sửa GDD + 1 spike S-M riêng (reference harness, chạy TRƯỚC)
Specialists: game-designer, systems-designer, qa-lead, ux-designer, ui-programmer, godot-specialist, ai-programmer, creative-director (senior synthesis)
Blocking items: 6 cụm (C-1 → C-6) | Recommended: ~15
Summary: Kiến trúc lõi (vòng lặp pha giao đấu, hợp đồng khóa-trước-tường-thuật, cấu trúc D.9/D.9b/D.9c) vẫn đứng vững qua 3 vòng đối kháng đầy đủ — không phát hiện nào nói sai kiến trúc, mọi blocking đều cục bộ (ký hiệu không khai, tham số không luồn, biến chết, thiếu clamp, thứ tự sai). Nhưng đây là vòng THỨ BA liên tiếp tìm ra bug blocking MỚI trong ĐÚNG các công thức trung tâm (D.9/D.9b/D.9c/D.6/D.4b) từng được tuyên bố "đã đóng" ở vòng trước — creative-director chẩn đoán đây KHÔNG phải "tài liệu quá phức tạp, cần thêm vòng" mà là bằng chứng review-văn-bản-thuần đã chạm đáy: phân loại 12 phát hiện cho thấy 7/12 sẽ bị bắt trong ~10 phút bởi việc chép công thức thành code chạy được, không cần specialist. **C-1 (nghiêm trọng nhất)**: "72/72 hội tụ" của vòng 2 (harness `/tmp/combat_harness.py`, đã mất, không tái kiểm được) hóa ra dùng ngữ nghĩa chia số thực của Python, không phải `int/int` cắt cụt thật của GDScript — dưới ngữ nghĩa đúng, cơ chế kiệt sức KHÔNG hề kích hoạt cho tới sát pha cuối. **C-2**: D.6's `final_damage` có thể làm tròn về đúng 0 (mâu thuẫn AC-21/22, hội tụ độc lập 2 specialist); D.9's thứ tự tính `exhaustion_drain` tuần tự-với-early-return khiến nhân vật SPD cao hơn thua TẤT ĐỊNH ở tàn trận kiệt sức (hội tụ độc lập 2 specialist, "cùng kiệt sức" mà D.4b hứa hẹn thực ra bất khả đạt trong D.9). **C-3**: `self`/`other` dùng trong D.9b/D.9c nhưng không bao giờ khai báo tham số; `outcome` không được gán ở nhánh "trận tiếp diễn" (nhánh phổ biến nhất) — biến chưa khởi tạo bị return; `thuc_id`/`rng` không có tham số nào mang xuống các formula cần chúng dù văn xuôi tuyên bố có; `chosen_index` (D.14) thiếu clamp biên. **C-4**: 7/7 mục "AC coverage gap" từ backlog vòng 2 còn nguyên; AC-45 vi phạm chính quy tắc BLOCKING của tài liệu; căng thẳng kiến trúc static-function-vs-spy-test (mở từ vòng 1) đe dọa khả năng thực thi của chính các AC BLOCKING dựa trên spy. **C-5 (UX)**: win/lose phân biệt gần như chỉ bằng màu (vi phạm accessibility, hậu quả permadeath thật); bất biến "1 chạm" tái phát lần THỨ BA (vòng 1 ẩn thức → vòng 2 ẩn Bỏ chạy → vòng 3 nguy cơ ẩn Bỏ chạy trong popover đang mở). **C-6**: thứ tự lặp khi cả 2 cùng bỏ chạy không xác định (hội tụ độc lập 4 specialist); NPC vẫn tự bỏ chạy trong trận giao hữu, có thể phá cơ chế hòa D.9b.
Prior verdict resolved: Một phần lớn — kiến trúc đứng vững, nhưng 4/6 "đã đóng" claims của vòng 2 (schema thống nhất, RNG injection, `is_equal_approx()` ban, và đặc biệt "72/72 hội tụ") có gap ở tầng thực thi/xác minh chưa từng bị vòng 2 chạm tới.

## Revision — 2026-08-06 — Sửa ngay trong cùng phiên, theo hướng **Spike-first** (lựa chọn người dùng)

**Khác biệt quy trình so với vòng 1/2**: creative-director khuyến nghị KHÔNG sửa GDD ngay bằng lập luận văn bản — thay vào đó viết 1 **reference harness SỐNG TRONG REPO** trước (`prototypes/combat-reference/harness.py` + `results.md`), mô phỏng đúng ngữ nghĩa số nguyên GDScript, dùng nó trả lời 5 câu hỏi số học TRƯỚC khi sửa bất kỳ dòng GDD nào. Người dùng chọn phương án này (thay vì sửa-ngay-panel-đầy-đủ hoặc hoãn-sang-implementation).

**Kết quả harness** (đầy đủ ở `prototypes/combat-reference/results.md`):
- Q1: dưới `int/int` GDScript thật, **0/108** tổ hợp Safe Range hội tụ (tệ hơn cả "0-3/36" vòng 1 phát hiện cho bản vòng 1); dưới chia-số-thực đúng + quét thêm `TECHNICAL_EXCHANGE_CAP` (chưa từng được quét ở vòng 2), **96/108 (89%)**, không phải 100%.
- Q2: `final_damage==0` trên đòn TRÚNG xảy ra **100%** số lần ở kịch bản áp chế cực đoan + Chống chịu vừa phải — không hiếm.
- Q3b: nhân vật SPD cao hơn (luôn `first`) thua **0/300 (0%)** dưới đúng pseudocode D.9 cũ; sau fix (tính cả 2 lượng drain không điều kiện): 52.3%/47.7% (công bằng trong nhiễu thống kê).
- Q5: RNG determinism xác nhận khả thi khi luồn đúng 1 instance qua toàn chuỗi gọi.

3 quyết định thiết kế được chốt qua `AskUserQuestion` (tất cả theo khuyến nghị):
1. **C-2a**: thêm sàn `max(1, final_damage_raw)` khi `hit=true AND raw_damage>0` (D.6).
2. **C-2b**: tính CẢ HAI lượng `exhaustion_drain` không điều kiện trước khi kiểm `==0` (D.9), dùng `hp_pct_pre_drain` (trước đây dead code) làm tiebreak khi cả 2 cùng về 0.
3. **C-6b**: tắt Core Rule #2 Tầng 1 (NPC tự bỏ chạy) khi `is_spar_friendly=true`.

| # | Cụm blocking | Fix applied |
|---|---|---|
| C-1 | "72/72" không xác minh được + không đúng ngữ nghĩa GDScript + chưa quét `TECHNICAL_EXCHANGE_CAP` | Ép kiểu `float()` tường minh BẮT BUỘC, tổng quát hóa cho D.4b/D.9b/D.9c (không chỉ D.12 như trước); ràng buộc chéo mới `CAP-ONSET≥120`; AC-47a viết lại trích dẫn `prototypes/combat-reference/harness.py` (96/108) thay "72/72" đã mất |
| C-2 | D.6 làm tròn `final_damage` về 0 (100% đo được); D.9 thứ tự drain khiến SPD cao thua tất định (0/300 đo được) | Sàn `max(1,...)` (D.6) + AC-21/22 viết lại; tính cả 2 drain không điều kiện + tiebreak `hp_pct_pre_drain` thật (D.9) — cả 2 xác nhận bằng harness TRƯỚC/SAU fix |
| C-3 | `self`/`other` không khai báo; `outcome` không gán ở nhánh phổ biến nhất; `thuc_id`/`rng` không có tham số mang; `chosen_index` thiếu clamp; `parity_diff` range sai | Thêm tham số `player_id`/`thuc_id_of`/`rng` tường minh vào `resolve_exchange`/D.9b/D.9c + toàn chuỗi D.2/D.3/D.5/D.8/D.11/D.14; `outcome=null` khởi tạo đầu hàm; `chosen_index=min(floor(...),|pool|-1)`; `parity_diff` range sửa `[0,1)`→`[0,1]` |
| C-4 | AC-45 vi phạm quy tắc BLOCKING; 7 mục AC coverage gap vòng 2 còn nguyên; static-vs-spy tension chưa đóng | AC-45 viết lại (bỏ nhánh review thủ công); thêm AC-09b/AC-28b/AC-41j/AC-41k/AC-52b; AC-41h/i mở rộng spy scope (D.11/D.14) + đổi nhãn Integration; AC-21/22/25/30 cập nhật; static-vs-spy tension ghi nhận cần 1 ADR ở `/create-architecture`, KHÔNG tự quyết ở GDD (không chặn Approve) |
| C-5 | UX: win/lose gần chỉ khác màu; bất biến 1-chạm tái phát lần 3 (popover); khung cảnh giới có thể bị gate nhầm chỉ-trong-trận; không tín hiệu UI bắt buộc cho kiệt sức; registry thiếu combat-system.md | Thêm glyph phân biệt phi-màu + AC-09b (narration bắt buộc nêu outcome); ràng buộc bắt buộc "popover không được che Ô 3/4" + bất biến keyboard; xác nhận tường minh khung cảnh giới hiển thị cả trước trận; thêm tín hiệu UI bắt buộc (trọng lượng chữ `exchange_id`) khi kiệt sức kích hoạt; đăng ký `combat-system.md` vào registry `TOUCH_TARGET_MIN` |
| C-6 | Thứ tự lặp khi cả 2 cùng flee không xác định; NPC tự flee trong spar phá D.9b | `order_first`/`order_second` (D.2) tính TRƯỚC vòng lặp flee-check, dùng làm thứ tự tất định; AC-41k; Tầng 1 tắt khi `is_spar_friendly=true` + AC-52b |

Recommended CHƯA đóng (để lại cho playtest Vertical Slice hoặc sprint riêng, đã ghi tường minh vào Open Questions của GDD — không còn trôi nổi chỉ trong review log): "Đánh thường" có tính `skill_tier_used` hay không (mở 3 vòng, nâng ưu tiên — BẮT BUỘC chốt trước Vertical Slice); D.14 phân phối đều là cosmetic-only do schema thức không có modifier riêng (ghi nhận có chủ đích, phân xử đồng thuận ai-programmer/game-designer); `EXHAUSTION_ONSET_EXCHANGE=40` đánh thuế bất cân xứng build phòng thủ + nằm trong dải "trận điển hình" (cần playtest, không blocking vì đã hội tụ số học); thiếu phản hồi hậu-trận (margin/số pha); K_HIT bão hòa ~45 điểm chênh; race condition Undo đa hệ; free-text input số liệu bịa; `no_outcome` tín hiệu tạm thời dễ bỏ lỡ; D.9b dùng Lực chiến base không effective; ADVISORY AC cho 3 tín hiệu outcome Visual/UI.

Trạng thái sau sửa: **Designed — Revised, chờ re-review (vòng 4)**. Khác biệt so với vòng 2: creative-director khuyến nghị vòng 4 KHÔNG cần panel 7 specialist đầy đủ — chỉ 3 domain hẹp (`systems-designer` đọc lại output harness sau các fix; `qa-lead` xác nhận bộ AC sau khi ADR static-vs-instance chốt; `ux-designer` cho 3 mục UX chưa từng chạm harness), VÌ hầu hết lớp lỗi ký pháp (nhóm B) giờ đã được reference harness hấp thụ. Tiêu chí xác nhận chẩn đoán này đúng (do creative-director đặt ra): vòng 4 phải ra **0 lỗi thuộc nhóm B** (ký pháp/pseudocode không chạy được) và **≤4 blocking**, tất cả thuộc nhóm thiết kế/UX — nếu không, cần leo thang lên `technical-director` xét lại việc đặc tả Combat bằng code tham chiếu thay vì pseudocode ngay từ đầu.

---

## Review — 2026-08-06/07 — Vòng 4 (hẹp, 3 domain) — Verdict: KHÔNG đạt tiêu chí thoát → leo thang `technical-director`
Specialists: systems-designer, qa-lead, ux-designer (đúng phạm vi creative-director chỉ định ở vòng 3)
Summary: Cả 3 specialist độc lập tìm ra tổng cộng **9-11 phát hiện blocking**, trong đó **≥5 thuộc nhóm B** (ký pháp/pseudocode không chạy được) — bác bỏ cả 2 tiêu chí thoát (0 nhóm B, ≤4 blocking) mà creative-director đặt ra ở cuối vòng 3. Phát hiện đáng chú ý nhất: `systems-designer` xác nhận chữ ký `resolve_exchange` (viết lại chính ở vòng 3) vẫn thiếu tham số `hp`/`exchange_id` — bằng chứng khách quan: harness Python (`prototypes/combat-reference/harness.py`) phải TỰ THÊM 2 tham số đó để chạy được, nhưng phát hiện đó chưa bao giờ được chép ngược về GDD. `qa-lead` và `ux-designer` hội tụ độc lập trên cùng 1 gap (AC-09b tham chiếu "danh sách từ khóa cho phép" chưa từng được định nghĩa ở bất kỳ đâu). `ux-designer` xác nhận vi phạm thật ("Dependencies must be bidirectional") giữa `combat-system.md` và `character-card-identity.md` liên quan khung cảnh giới.
Prior verdict resolved: Không — đúng điều kiện leo thang creative-director đã tự đặt ra ở vòng 3 đã kích hoạt.

## Escalation — 2026-08-07 — `technical-director`
Theo đúng cam kết cuối vòng 3, leo thang lên `technical-director` với câu hỏi kiến trúc: có nên chuyển thẩm quyền đặc tả cơ học Combat sang GDScript chạy được thay vì pseudocode văn xuôi hay không.

**Phát hiện bổ sung của `technical-director` (nghiêm trọng hơn mọi thứ vòng 4 báo cáo)**: `hp_pct_pre_drain` (D.9, thêm ở vòng 3 để sửa bug SPD-thua-tất-định) thiếu CẢ `float()` LẪN `max(max_HP,1)` — 2 biện pháp mà D.9b/D.9c bên cạnh, sửa CÙNG vòng 3, đã có đủ. Dưới ngữ nghĩa GDScript thật, tiebreak "so HP% ai cao hơn thắng" (chính là fix C-2b vừa làm ở vòng 3) suy biến thành **coin_flip 100% số lần trong kịch bản đối xứng** — tái lập ngầm đúng vi phạm Anti-Pillar mà vòng 1 đã đóng ("không luật phi-diegetic ghi đè công thức"). Harness Python không phát hiện được vì nó đo TÍNH CÔNG BẰNG (52/48), không đo TÍNH DIEGETIC — 2 cơ chế khác nhau hoàn toàn (so HP% thật vs. tung đồng xu ẩn) đều cho ra phân phối ~50/50 trên 300 mẫu.

**Chẩn đoán gốc rễ**: 2 artifact có thẩm quyền (GDD prose + harness Python) không có kiểm tra tương đương bằng máy. Harness bị "sai cực ngữ nghĩa" — GDScript mặc định `int/int` CẮT CỤT (phải chủ động `float()` để đúng); Python mặc định CHIA THỰC (phải chủ động cắt cụt mới sai theo GDScript). Mọi chỗ GDD *quên* `float()` thì mô hình Python chạy ĐÚNG một cách giả — che giấu đúng lớp lỗi nó được dựng ra để bắt. Harness cũng chỉ phủ 10/17 công thức (D.9b, D.9c, D.11, D.12, D.13, D.14 hoàn toàn vắng mặt).

**Quyết định** (người dùng chọn theo khuyến nghị của `technical-director`, xem `docs/architecture/adr-0001-combat-spec-authority.md`):
1. **Dừng chu trình `/design-review` cho Combat System** — không vòng 5. Kiến trúc lõi đứng vững qua 4 vòng đối kháng đầy đủ; các lỗi còn lại đều thuộc lớp compiler-catchable mà trình biên dịch GDScript bắt miễn phí, thứ mà 4 vòng review văn bản đã chứng minh không bắt được đáng tin cậy.
2. **ADR-0001**: `src/gameplay/combat/*.gd` (static-typed, test bằng GUT) trở thành nguồn sự thật cho cơ học Combat (chữ ký, kiểu, thứ tự thực thi, ngữ nghĩa chia, biên mảng). GDD Section D hạ xuống vai trò MÔ TẢ cho phần cơ học — vẫn NORMATIVE cho ý định thiết kế, tuning knob + lý do, và hợp đồng liên hệ chéo hệ.
3. **5 mục đã vá trực tiếp trong GDD** (không trình biên dịch nào bắt được — xem bảng bên dưới); phần còn lại (~9-11 mục, gồm cả `hp_pct_pre_drain`) chuyển thành backlog, chốt một lần đúng khi viết `.gd`, không vá thêm vào 2790 dòng văn xuôi.
4. `prototypes/combat-reference/harness.py` đóng băng làm chứng cứ lịch sử (không xóa — là bằng chứng duy nhất cho các số liệu 0/108, 0/300, 100% đã ghi vào GDD).

| # | Mục vá trực tiếp trong GDD (không compiler-catchable) | Vị trí |
|---|---|---|
| 1 | AC-09b: định nghĩa bảng từ khóa cho phép theo từng `outcome.type` (win/lose/no_outcome × 3 ngữ cảnh) | AC-09b |
| 2 | Đồng bộ `character-card-identity.md` — thêm khung cảnh giới vào bảng phân cấp thị giác cả 2 trạng thái `in_combat` | `character-card-identity.md` dòng 149-150 |
| 3 | AC-26b mới: assert literal `outcome.type=="lose"` qua `player_id`, đối chứng cả 2 chiều | AC-26b |
| 4 | Bất biến popover viết lại theo THUỘC TÍNH quan sát được (1 chạm, không cần cuộn) thay vì liệt kê cơ chế bị cấm | UI Requirements |
| 5 | AC-47a: tách GIVEN (quét 108) và THEN (96 phải hội tụ, 12 phải flag vi phạm ràng buộc, không bỏ qua im lặng) | AC-47a |

Trạng thái sau quyết định: **Designed — chờ implementation** (không còn "chờ re-review vòng N"). `combat-system.md` Section D chính thức chuyển vai trò descriptive-cho-cơ-học kể từ `docs/architecture/adr-0001-combat-spec-authority.md`. Chu trình review văn bản cho Combat System **kết thúc tại đây** — bước tiếp theo là implementation GDScript + GUT test, theo Migration Plan của ADR-0001, không phải `/design-review` vòng 5.

---

## 2026-08-11 — Implementation gate ĐÓNG: ADR-0001 thi hành xong, GUT xanh toàn bộ

Đây KHÔNG phải vòng `/design-review` (chu trình văn bản đã kết thúc ở vòng
4 + escalation). Đây là biên bản đóng cổng implementation theo đúng
Migration Plan của `docs/architecture/adr-0001-combat-spec-authority.md`
(nay đã **Accepted** kèm phụ lục Validation Results).

**Kết quả**: `src/gameplay/combat/` (7 file GDScript static-typed, pure
function, RNG inject — nguồn chuẩn NORMATIVE cho cơ chế Combat từ nay) +
`tests/unit/combat/` (13 file test + factory) — **GUT: 14 scripts, 91
tests, 91 pass, 829 asserts**. Sweep hội tụ AC-47a/47b đã migrate sang
`tools/combat/convergence_sweep.gd`: AC-47a 96/108 hội tụ — KHỚP CHÍNH
XÁC số liệu harness.py đóng băng (12 combo không hội tụ đều là vi phạm
cross-constraint #2 được flag tường minh); Q3b fairness 155/300–145/300
(51,7%/48,3%), nhất quán với 52,3%/47,7% của harness. Lint D2
(`tools/lint/combat_lint.py`): 0 finding trên code thật, bắt được cả 2
lớp defect trên file mồi.

**3 tiêu chí validation của ADR-0001 — ĐẠT CẢ 3**: (1) 9 hạng mục backlog
vòng 4 bị compiler/typing/lint bắt (mục tiêu ≥5), gồm đúng con bug
`hp_pct_pre_drain` coin-flip trá hình đã kích hoạt ADR; (2) KHÔNG có
defect kiến trúc — cấu trúc exchange-loop / lock-before-narrate /
D.9-D.9b-D.9c dịch sang GDScript nguyên vẹn, trigger đảo ngược ADR không
kích hoạt; (3) ~35 phút từ file source đầu tiên tới GUT xanh toàn bộ —
nhanh hơn hẳn 1 vòng review.

**1 bug prose mới ngoài backlog đã biết** (lớp cục bộ/cơ học, không phải
kiến trúc): D.9 pseudocode ghi nhận `heal` (D.7 lifesteal) vào `per_actor`
nhưng KHÔNG BAO GIỜ cộng vào HP người đánh — code áp dụng đúng công thức
D.7 tại thời điểm resolve strike. Đã ghi vào banner Section D của GDD
cùng các judgment call (basic attack `skill_tier_used=0`, mutual-drain
bypass D.9b theo nhánh pseudocode tường minh, slot 2 empty khi hết thức,
AC-49 tier=0 mâu thuẫn dải tier 1–∞ — test cả 2).

**Trạng thái**: `combat-system.md` header → `Implemented — GUT green
(ADR-0001 executed, 2026-08-11)`; Section D mang banner "THI HÀNH XONG"
+ danh sách delta code↔prose; quyền chuẩn cơ chế từ nay là một chiều
code → prose theo đúng ADR-0001.
