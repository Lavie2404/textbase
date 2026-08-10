---
name: project-gdd-review-process
description: Quy trình /design-review đối kháng nhiều vòng cho GDD trong ai-story-game — nơi lưu log, cách leo thang, và cách tránh lặp lại phán quyết đã chốt
metadata:
  type: project
---

Dự án `ai-story-game` chạy `/design-review [path]` theo nhiều vòng đối kháng (adversarial) cho mỗi GDD lớn — không phải 1 lần duyệt rồi xong.

- Mỗi GDD có 1 review log riêng: `design/gdd/reviews/[slug]-review-log.md` — chứa lịch sử đầy đủ mọi vòng (blocking đã tìm, đã sửa, đã bác bỏ, Recommended còn treo).
- Mỗi vòng thường huy động 7 specialist (game-designer, systems-designer, qa-lead, ux-designer, ui-programmer, godot-specialist, accessibility-specialist) + creative-director làm senior synthesis phân xử bất đồng.
- Quyết định thiết kế không hiển nhiên (đánh đổi UX, thẩm mỹ vs accessibility...) được chốt qua `AskUserQuestion` — thường theo phương án "Recommended" của creative-director — TRƯỚC khi sửa file, không phải do 1 agent tự quyết.
- Lợi tức các vòng giảm dần rõ rệt khi kiến trúc lõi đã đứng vững nhiều vòng liên tiếp (VD core-ui-screen-navigation: 10→7→6 blocking specialist-tìm qua vòng 1-2-3, kiến trúc lõi D.1-D.6 không ai chạm sau vòng 1).

**Cách áp dụng khi được giao review 1 vòng mới**:
1. Luôn đọc review log trước để biết đâu là phán quyết ĐÃ CHỐT (VD creative-director đã bác bỏ 1 finding tương tự ở vòng trước) — không lặp lại finding đã bị bác bỏ trừ khi có bằng chứng mới.
2. Tìm gap THẬT SỰ MỚI hoặc gap sâu hơn (khác bản chất) so với các vòng trước — không re-litigate kiến trúc đã đứng vững ≥2 vòng liên tiếp.
3. Ghi rõ mức độ nghiêm trọng (BLOCKING/RECOMMENDED/GHI NHẬN) VÀ đề xuất giải pháp cụ thể cho mỗi finding quan trọng — không chỉ nêu vấn đề (đúng vai trò "chuyên gia tư vấn" trong Collaboration Protocol).
4. Không tự ghi vào review log hay sửa GDD — trả finding về cho agent điều phối (`/design-review` orchestrator hoặc creative-director), việc ghi log/sửa file cần approval của người dùng.
5. **Khi 1 vòng review trước "đề xuất chuyển phạm vi" 1 gap sang GDD KHÁC thay vì sửa ngay tại chỗ** (VD log ghi "đề xuất chuyển phạm vi sang X.md") — vòng sau PHẢI xác minh gap đó THỰC SỰ xuất hiện ở GDD đích bằng cách đọc/grep file đó, không được giả định việc chuyển đã xảy ra. Case đã xác nhận: `combat-system.md` review vòng 2 (2026-08-06) đề xuất chuyển "touch target/contrast/AI-wait indicator" sang `turn-manager.md`, nhưng khi kiểm tra ở vòng 3, `turn-manager.md` KHÔNG hề chứa các từ khóa này — gap rơi vào khoảng trống giữa 2 tài liệu, không ai nhận sở hữu. Coi "đề xuất chuyển phạm vi" trong review log là CHƯA ĐÓNG cho tới khi xác minh được bằng chứng ở file đích, không phải khi log ghi "đề xuất".

Liên quan: [[project-game-identity-context]], [[project-combat-ux-open-items]]
