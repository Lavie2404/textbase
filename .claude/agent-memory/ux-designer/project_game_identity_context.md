---
name: project-game-identity-context
description: Bối cảnh sản phẩm cốt lõi của Vô Danh Lục — ẩn dụ "cuốn nhật ký", nguyên tắc "marginalia not chrome", nền tảng touch-primary Web/Mobile Web — định hình mọi quyết định UX
metadata:
  type: project
---

Game "Vô Danh Lục" (ai-story-game) có Visual Identity Anchor xuyên suốt: **"Mực Chưa Khô"** — toàn bộ trải nghiệm là ẩn dụ một cuốn nhật ký đang mở, không phải "app nhiều màn hình".

**Nguyên tắc UX cốt lõi cần tuân thủ khi thiết kế bất kỳ hệ nào chạm UI**:
- "Marginalia, not chrome": điểm vào điều hướng toàn cục (Thẻ Nhân Vật, Story Log, Menu) là chữ nhạt hơn thân văn, KHÔNG icon, KHÔNG khung/nav-bar — bút tích ở lề trang, không phải button app.
- Không loading screen (trừ AI call), không pause menu (turn-based), không fade-to-black.
- Trục màu: đỏ son/xanh ngọc = "màu khẩu phần, hiếm mới có nghĩa" — chỉ dùng cho hệ quả cơ học đã khóa (Death & Consequence, Character Card). Phần lớn UI (#15 Core UI) hoàn toàn MONO.
- Undo 1-lượt = phép ẩn dụ "mực còn ướt" — biến mất = "mực đã khô, chuyện đã thành sử".

**Ràng buộc nền tảng kỹ thuật ảnh hưởng mọi đề xuất UX**:
- Platform: Web + Mobile Web ONLY — không gamepad, input chính là Touch/Mouse (mixed, responsive).
- Không hover-only interaction bao giờ được phép (nhiều thiết bị đích không có hover).
- Engine Godot 4.6, GDScript — accessibility built-in AccessKit của Godot 4.5+ là NATIVE-DESKTOP-ONLY, không chạy trên Web export → mọi giải pháp accessibility cho web phải tự chế (ARIA injection qua DOM, TTS riêng...), không dựa vào AccessKit.

**Rủi ro lặp lại đáng chú ý qua nhiều GDD**: triết lý "marginalia không phải chrome" tối ưu cho tính thẩm mỹ/immersion nhưng có xu hướng hy sinh discoverability lần chơi đầu (không icon, không tutorial rõ ràng) — đây là điểm căng thẳng cố hữu giữa Player Fantasy và Accessibility/Onboarding cần luôn cân nhắc khi review bất kỳ hệ UI nào của dự án này, không riêng gì #15 Core UI.

Liên quan: [[project-gdd-review-process]]
