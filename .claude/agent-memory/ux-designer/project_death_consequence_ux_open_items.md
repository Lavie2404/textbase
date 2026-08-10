---
name: project-death-consequence-ux-open-items
description: Khoảng trống UX của Death & Consequence (design/gdd/death-and-consequence.md) tìm thấy 2026-08-08 — tất cả hiển thị lồng vào Character Card, chưa có UX spec riêng (character-card.md chưa tồn tại)
metadata:
  type: project
---

Review tập trung Visual/Audio Requirements + UI Requirements của
`design/gdd/death-and-consequence.md` (hệ #12/15), yêu cầu adversarial (không
xác nhận ổn, tìm vấn đề). Bối cảnh: UX Flag của chính GDD này đã ghi nhận
`design/ux/character-card.md` CHƯA tồn tại — mọi hiển thị của hệ này (badge
chết/phế, nút Hồi phục, Pending Fate) đang lồng vào Character Card
(`character-card-identity.md`, hệ #14) mà chưa có UX spec riêng. Findings dưới
đây nên là input bắt buộc khi `/ux-design` chạy cho character-card.md ở
Pre-Production, không chỉ là góp ý rời rạc.

1. **[BLOCKING-candidate] Cửa sổ "Pending Fate" (1 lượt) không có tín hiệu
   thời hạn nào** — 2 gợi ý "Kết liễu"/"Tha mạng" chỉ khác gợi ý thường ở độ
   đậm chữ, không đồng hồ đếm/icon cấp bách. Làm việc khác trong lượt đó =
   tự động mặc định "Tha mạng" ngay khi lượt xác nhận, có thể xảy ra mà người
   chơi không nhận ra mình vừa quyết định gì (vi phạm visibility-of-system-
   status).
2. **[BLOCKING accessibility, touch] "Kết liễu" là hành động hệ trọng nhất
   (giết NPC vĩnh viễn, phát `kill_witnessed` lan truyền toàn Affinity) nhưng
   chỉ cần 1 lần chạm, bình đẳng trong danh sách 4 gợi ý** — không có bước
   xác nhận thứ 2. Lưới an toàn duy nhất (nút Undo chung của Turn Manager)
   không được GDD này dẫn chiếu như mitigation tường minh.
3. **[Không phải colorblind-hue, nhưng có vấn đề differentiation thật]** Bảng
   Visual/Audio tự mâu thuẫn: tuyên bố "khác biệt 3 tầng nằm ở diện
   tích+độ đặc+độ bền" nhưng thực tế mild và medium DÙNG CHUNG 1 tín hiệu thị
   giác (event 3, "gạch chân mảnh thoáng qua") — chỉ severe có visual riêng.
   Phân biệt mild/medium chỉ qua câu chữ tường thuật.
4. **[BLOCKING] Badge "phế đan điền" thiếu text label/tooltip** — hoàn toàn
   phụ thuộc người chơi nhớ/suy luận ý nghĩa hình khối. Vi phạm "Functional
   without reliance on color alone" ở nghĩa rộng, và không expose được cho
   accessibility tooling (Godot Web export không có AccessKit — mọi ARIA
   phải tự chế, cần có text nguồn để chế).
5. **[BLOCKING, xác minh chéo `exp-realm-progression.md`] Không có feedback
   loop nào giải thích "vì sao 0 EXP"** — `resolve_turn_exp` short-circuit về
   0 khi `death_and_consequence_blocked=true` (Core Rule #9/D.6/D.7 bên EXP
   GDD) nhưng KHÔNG GDD nào (D&C, EXP, Character Card) yêu cầu hiển thị lý do
   tại đúng thời điểm nó xảy ra. Người chơi thắng trận nhận 0 EXP, phải tự
   suy luận ngược từ 1 badge đã thấy ở lượt khác.
6. **[BLOCKING] Nút "Hồi phục" không đặc tả trạng thái 0-lựa-chọn-khả-dụng**
   (không item + đang cooldown tự tu) — literal reading: hàng biến mất hoàn
   toàn, người chơi thấy badge phế nhưng không thấy lối thoát nào, không biết
   còn bao nhiêu lượt cooldown. Cùng lớp lỗi đã flag ở Combat (finding #3,
   [[project-combat-ux-open-items]] — trạng thái "0 thức còn lại").
7. **[BLOCKING accessibility, hệ quả mở rộng của Combat finding #8] Combat's
   "viền mỏng thoáng qua khi lose" và D&C's "hậu quả nhẹ/vừa — gạch chân mảnh
   thoáng qua" đều mỏng+đỏ son+thoáng qua, không định lượng (px/ms) ở CẢ HAI
   tài liệu**, và luôn xảy ra CÙNG LƯỢT (mọi lose không-giao-hữu kích hoạt
   D&C) — nguy cơ 2 tín hiệu merge thành "một chớp đỏ" trong nhận thức nhanh.
   Cần bảng đối chiếu liên-GDD định lượng (Combat lose-border / D&C
   mild-medium-underline / D&C severe-stamp / D&C death-strike) — nên là
   input bắt buộc cho `/ux-design character-card.md`.
8. **[Recommended, ưu tiên cao] Khoảnh khắc "chết thật" thiếu yêu cầu
   pacing/gating** — GDD chỉ đặc tả trang trí (đổi màu, con dấu), không có
   "điểm dừng" bắt buộc nào trước khi luồng/overlay Character Continuation
   tiếp tục. Rủi ro đọc lướt bỏ lỡ khoảnh khắc quan trọng nhất game (liên hệ
   hành vi đọc lướt đã ghi ở [[project_story_log_ux_open_items]]). Audio hoàn
   toàn optional (không chỉ ADVISORY) cho sự kiện hệ trọng nhất — lập luận
   "im lặng củng cố chung cuộc" có lỗ hổng logic nếu audio toàn game vốn đã
   tối thiểu/optional khắp nơi (không có baseline để tương phản).
9. **[Recommended] Không có phát biểu keyboard-only tương đương cho độ đậm
   chữ (bold) phân biệt mức độ quan trọng của Pending Fate** — cùng pattern
   thiếu sót đã ghi ở Combat finding #2.
10. **[Ghi nhận tích cực, không sửa]** Phân biệt "chết" (badge góc thẻ + chân
    dung xám hóa toàn phần) vs "phế" (badge cục bộ vùng chỉ số, chân dung giữ
    màu) dùng VỊ TRÍ + PHẠM VI ảnh hưởng chân dung làm non-color
    differentiator hợp lệ — giữ nguyên hướng này khi viết UX spec.

Liên quan: [[project-gdd-review-process]], [[project-combat-ux-open-items]],
[[project-game-identity-context]], [[project_story_log_ux_open_items]]
