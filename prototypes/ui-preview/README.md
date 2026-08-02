# UI Preview Prototype

Khu vực này dùng để tinh chỉnh giao diện bằng HTML/CSS/JS thuần, xem trực
tiếp qua extension **Live Server** của VSCode (nhấn "Go Live" ở góc dưới
phải, hoặc chuột phải `index.html` → "Open with Live Server").

## Quy trình

1. Thử nghiệm layout, màu sắc, bố cục ở đây — lưu file và xem thay đổi
   ngay lập tức trong trình duyệt.
2. Đây là **throwaway prototype**, tách biệt khỏi `src/` — không phải code
   sản xuất, không cần theo coding-standards.md.
3. Khi đã chốt một thiết kế UI cụ thể, thiết kế đó được chuyển thể
   (port) sang Godot bằng Control node thật trong `src/ui/`, do
   `ui-programmer` hoặc `godot-gdscript-specialist` triển khai.
4. Engine chính của dự án vẫn là **Godot 4.6 (GDScript)** — thư mục này
   chỉ là công cụ thiết kế UI nhanh, không phải một phần của game thật.
