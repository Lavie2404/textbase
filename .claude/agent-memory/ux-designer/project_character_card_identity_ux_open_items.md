---
name: project-character-card-identity-ux-open-items
description: Khoảng trống UX của Character Card & Identity (design/gdd/character-card-identity.md, hệ #14/15) tìm thấy vòng 1 (2026-08-10) — GDD này là base cho design/ux/character-card.md (chưa tồn tại, UX Flag ở cuối GDD)
metadata:
  type: project
---

Review adversarial vòng 1 cho `design/gdd/character-card-identity.md` (hệ #14/15,
Presentation, UI-heavy). GDD có UX Flag tường minh: `/ux-design` sẽ chạy ở Pre-
Production để tạo `design/ux/character-card.md` — Combat, NPC Affinity, Death &
Consequence đã trỏ story về spec đó. Findings dưới đây nên là input bắt buộc cho
`/ux-design` đó, không chỉ góp ý rời rạc.

1. **[Blocking-candidate] Mâu thuẫn 3 chiều vị trí khối ⑤ "Trạng thái giao
   đấu" khi `in_combat=true`**: Core Rule #3 khóa thứ tự cố định ①②③④⑤⑥;
   Visual/Audio §1 khẳng định thứ tự đọc KHÔNG đổi (chỉ đổi độ nổi bật); nhưng
   bảng UI Requirements ("Bảng thông tin hiển thị") ghi vị trí khối ⑤ =
   "Đầu thẻ khi giao đấu" — literal nghĩa dời lên ĐẦU thẻ. 3 phát biểu không
   thể cùng đúng, và trực tiếp quyết định khối ⑤ có nằm trong accordion
   ③⑤⑥ hay không (nếu pin đầu thẻ thì không thể vừa "thu gọn tại chỗ" như
   accordion mô tả). Cần 1 quyết định duy nhất từ game-designer/art-director
   trước khi `/ux-design` dựng layout — không tự suy luận được từ text hiện tại.
2. **[Recommended] Above-the-fold cho anchor moment 1 chưa được bảo đảm trên
   mobile scroll** — Core Rule #3 khóa khối ① (Hồ sơ, 8 field kể cả Tiểu sử
   280 ký tự) đứng TRƯỚC khối ② (Cấp-Bậc + Lực chiến, chính là dữ liệu
   "quyết định hành động ngay" theo Visual/Audio §1). Trên viewport điện
   thoại nhỏ, người chơi phải cuộn qua toàn bộ Hồ sơ trước khi chạm info
   quyết định nhanh — không có cơ chế bù (pin/ghim) nào được đặc tả.
3. **[Recommended, ưu tiên cao — gắn liền finding #1] Accordion ③⑤⑥ không
   đặc tả trạng thái mặc định đóng/mở** — nếu khối ⑤ (HP 2 bên/banner kết
   cục, cập nhật MỖI exchange) mặc định đóng như accordion thông thường,
   người chơi có thể bỏ lỡ thông tin combat sống còn. Khuyến nghị: khối ⑤
   auto-expand + không thể user-collapse khi `in_combat=true`, khác hành vi
   ③⑥.
4. **[Recommended] Tab-order (Godot 4.6 dual-focus, AC-45) để ngỏ hoàn toàn**
   — GDD chỉ nói "phải test focus chuột/cảm ứng lẫn bàn phím riêng biệt" mà
   không liệt kê thứ tự cụ thể (X đóng, toggle accordion, Song Tu, Hồi phục).
   Vấn đề tăng khi accordion mở/đóng làm scene-tree động, ảnh hưởng tab-order
   phía sau — chưa được nói tới.
5. **[Recommended] Không có chỉ báo "AI vẫn đang Resolving" khi thẻ mở như
   overlay toàn màn hình** — Core Rule #1 cho phép mở thẻ ở mọi trạng thái
   Turn Manager (kể cả Resolving), nhưng overlay thẻ che mất bất kỳ spinner
   nào của luồng tường thuật bên dưới; nút vô hiệu (mờ mực) không phân biệt
   lý do Resolving vs in_combat vs điều kiện khác (AC-32/AC-33 gộp chung).
6. **[Recommended] Layout 2 cột desktop chưa xử lý lệch chiều cao** — cột trái
   (Hồ sơ, tới 3 field × 280 ký tự) vs cột phải (lưới 12 chỉ số cố định) —
   không có spec cuộn độc lập/max-height/giãn theo cột cao nhất.
7. **[Recommended] Contrast vệt mực "???" (sentinel field hồ sơ bị che) chưa
   được treo ở Visual/Audio §5 Art Bible** — §5 chỉ yêu cầu tường minh
   contrast cho dải thái độ 7 mức, bỏ sót vệt mực vốn dùng tông mực tương tự
   chính text hồ sơ bình thường nó thay thế (rủi ro low-vision khó phân biệt
   "text mờ" vs "field bị che cố ý").
8. **[Recommended, xác nhận scope hơn là lỗi] So sánh nhanh nhiều NPC (đối
   đầu nhóm) không được hỗ trợ** — Scope dòng "Không tạo màn hình mới" +
   Edge Case "thẻ không re-render giữa chừng" buộc người chơi đóng/mở tuần
   tự từng thẻ để so sánh, ma sát với chính mục tiêu "quyết định NHANH" của
   anchor moment 1. Nhiều khả năng là đánh đổi MVP-scope có chủ đích — nên
   xác nhận với game-designer/creative-director, không tự sửa.
9. **[Nice-to-have] Badge "đang che giấu" chưa đặc tả kích thước vùng chạm
   tối thiểu** — hiện thuần túy tĩnh (không tooltip) nên chưa vi phạm gì,
   nhưng nếu `/ux-design` thêm tương tác sau này, cần nhớ target touch-only.
10. **[Ghi nhận tích cực]** Dải thái độ 7 mức dùng TEXT làm nguồn chính (thanh
    +chấm độ đậm chỉ PHỤ, "có thể bỏ mà không mất thông tin") — graceful
    degradation đúng chuẩn, giữ nguyên hướng này.

Liên quan: [[project-gdd-review-process]], [[project-death-consequence-ux-open-items]],
[[project-combat-ux-open-items]], [[project-game-identity-context]]
