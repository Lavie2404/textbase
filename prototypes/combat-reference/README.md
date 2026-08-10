# Combat Reference Harness

**Trạng thái**: Đóng băng (archival). Không mở rộng thêm.

## Đây là gì

Một reference harness Python, viết trong vòng 3 review của
`design/gdd/combat-system.md`, mô phỏng D.1–D.10 (10/17 công thức) để
xác minh bằng số 2 tuyên bố hội tụ/công bằng quan trọng nhất của GDD —
thay cho lập luận định tính hoặc harness đã mất từ vòng 2
(`/tmp/combat_harness.py`, không commit, không tái kiểm được).

## Vì sao đóng băng, không phong làm spec

Xem `docs/architecture/adr-0001-combat-spec-authority.md` (mục "Alternative 1").
Tóm tắt: ngữ nghĩa chia số của Python (`/` = chia thực mặc định) đảo
ngược với GDScript (`int/int` = cắt cụt mặc định) — mọi chỗ spec *quên*
`float()` thì mô hình Python chạy ĐÚNG một cách giả, che giấu đúng lớp
lỗi nó được dựng ra để bắt. Harness cũng chỉ phủ 10/17 công thức (D.9b,
D.9c, D.11, D.12, D.13, D.14 vắng mặt). Thẩm quyền cơ học Combat đã
chuyển sang `src/gameplay/combat/*.gd` (chưa tồn tại — xem ADR-0001
Migration Plan).

## Vì sao vẫn giữ trong repo

Đây là bằng chứng số DUY NHẤT cho các con số đã ghi vào
`design/gdd/combat-system.md` (96/108 tổ hợp hội tụ, 0/300 → 52.3/47.7
sau fix thứ tự drain, 100% tỉ lệ `final_damage==0` ở kịch bản áp chế
cực đoan trước fix D.6) và vào ràng buộc chéo `TECHNICAL_EXCHANGE_CAP -
EXHAUSTION_ONSET_EXCHANGE ≥ 120` ở Tuning Knobs. Xóa file này sẽ biến
các con số đó thành lời kể không thể tái kiểm — đúng vấn đề mà việc
viết harness này ban đầu được dựng lên để giải quyết cho vòng 2.

## Chạy lại

```
python harness.py
```

Xem `results.md` cho kết quả đã diễn giải (5 câu hỏi Q1–Q5 + Q1-FIXED,
Q3b) và ý nghĩa với các quyết định sửa GDD tương ứng.

## Không dùng harness này để

- Xác minh bất kỳ công thức nào KHÔNG có trong danh sách "phủ đủ" ở
  `docs/architecture/adr-0001-combat-spec-authority.md` (mục Context).
- Thay thế test GUT khi implementation GDScript bắt đầu — AC-47a/47b sẽ
  chuyển sang `godot --headless --script` (ADR-0001, Migration Plan bước 6).
