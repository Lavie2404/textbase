# Combat Reference Harness — Kết quả (vòng 4 spike)

> Chạy bằng `python harness.py` trong thư mục này. Không dùng `/tmp` — file
> này VÀ script được commit vào repo để có thể tái chạy, khác harness vòng 2
> (`/tmp/combat_harness.py`, đã mất, không thể tái kiểm).

Mục đích: trả lời 5 câu hỏi số học mà `creative-director` đặt ra ở cuối vòng
3 review `design/gdd/combat-system.md`, bằng cách mô phỏng D.1–D.10 hai lần —
một lần đúng ngữ nghĩa `int/int` cắt cụt của GDScript, một lần dùng chia số
thực thông thường — để so sánh trực tiếp.

---

## Q1 — Quét Safe Range BAO GỒM `TECHNICAL_EXCHANGE_CAP`

| Biến thể | Kết quả |
|---|---|
| **INT-DIV (đúng ngữ nghĩa GDScript)** | **0/108 tổ hợp hội tụ** |
| FLOAT-DIV (ngữ nghĩa harness vòng 2) | 96/108 tổ hợp hội tụ (89%) |

**Diễn giải**: Dưới ngữ nghĩa `int/int` thật của GDScript, `exhaustion_progress`
= `(exchange_id - ONSET) / (CAP - ONSET)` cắt cụt về 0 cho GẦN NHƯ TOÀN BỘ
trận — chỉ đạt đúng 1.0 ở CHÍNH pha `exchange_id == CAP` (vì đó là điểm DUY
NHẤT tử số/mẫu số bằng nhau tuyệt đối). Nghĩa là cơ chế chống-bế-tắc **không
hề kích hoạt** cho tới đúng pha cuối cùng — và ngay cả khi kích hoạt trọn vẹn
ở pha đó, 1 lần hao tổn (tối đa `round(max_HP*0.15*1)=30` trên `max_HP=200`)
không đủ hạ HP còn nguyên (do Regen cũng chưa từng bị giảm suốt trận) về 0.
**Kết quả: 0/108 — tệ hơn cả "0-3/36" mà vòng 2 phát hiện cho bản vòng 1.**

Ngay cả dưới ngữ nghĩa chia-số-thực ĐÚNG như harness vòng 2 dùng, con số giờ
là **96/108, không phải 100%** — vì lần này `TECHNICAL_EXCHANGE_CAP` được đưa
vào làm 1 trục quét (vòng 2 giữ cố định ở mặc định 200). 12 tổ hợp thất bại
đều rơi vào cửa sổ kiệt sức hẹp (`cap` gần `onset`, VD `cap=100, onset=80` →
cửa sổ chỉ 20 pha) — đúng dự đoán của `systems-designer` (B1a).

**→ Xác nhận C-1 bằng số, ở mức nghiêm trọng hơn dự đoán.**

---

## Q2 — `final_damage==0` khi đòn TRÚNG, với D.3/D.5/D.6/D.7 trong mô hình

| Kịch bản | Tỉ lệ `final_damage==0` trên các đòn TRÚNG |
|---|---|
| Cân bằng, không Chống chịu | 0.00% |
| Chống chịu vừa phải (0.5), không Phòng thủ | 0.00% |
| **Bị áp chế cảnh giới cực đoan (chip-floor) + Chống chịu 0.5** | **100.00%** |
| Bị áp chế cảnh giới + Chống chịu 0.5 + đối phương Phòng thủ | 100.00% |

**Diễn giải**: Khi kẻ tấn công đã bị D.1 đè xuống sàn `FLOOR_TOTAL` (chênh
lệch cảnh giới/trang bị ~10 bậc — kịch bản HOÀN TOÀN hợp lệ, không phải input
dị thường), MỌI đòn trúng gây đúng 0 sát thương thật — không phải hiếm gặp,
mà là **100% số lần**, vì `raw_damage` là hằng số (`2.5×0.05=0.125`) và
`round(0.125×0.5)=0` không có phương sai nào cứu được nó. AC-21/AC-22 (khẳng
định `final_damage>0` khi `raw_damage>0`) **sai theo đúng nghĩa đen** trong
kịch bản này, không phải biên hiếm.

**→ Xác nhận nửa đầu của C-2 (D.6 làm tròn về 0) bằng số, tỉ lệ 100% chứ
không phải hiếm gặp.**

---

## Q3 / Q3b — Bất đối xứng SPD ở tàn trận kiệt sức

Q3 ban đầu (SPD hai bên bằng nhau) cho kết quả gần 50/50 — nhưng đây là
**thiết kế thí nghiệm sai**: khi SPD bằng nhau tuyệt đối, D.2's `coin_flip`
xáo lại nhãn `first`/`second` NGẪU NHIÊN mỗi pha, pha loãng chính thiên vị hệ
thống đang cần đo. Q3b sửa lại: cho A có SPD cao hơn B (không đổi suốt trận,
`first` = A cố định mọi pha) — đúng kịch bản mà C-2 mô tả:

| Biến thể | A (SPD cao hơn, luôn `first`) thắng | B (SPD thấp hơn, luôn `second`) thắng |
|---|---|---|
| **BUGGED (đúng như D.9 hiện viết)** | **0/300 (0.0%)** | **300/300 (100.0%)** |
| FIXED (tính cả 2 lượng drain trước, rồi mới kiểm) | 157/300 (52.3%) | 143/300 (47.7%) |

**Diễn giải**: Đây là bằng chứng số rõ ràng nhất trong toàn bộ vòng 4.
Trong 300 trận đối kháng gương (2 nhân vật thống kê giống hệt nhau, chỉ khác
SPD), dưới đúng pseudocode D.9 hiện tại, **nhân vật SPD cao hơn thua 100%**
số trận tiêu hao kiệt sức — không phải xu hướng, không phải thiên vị nhẹ, mà
là **tất định tuyệt đối**. Sau khi áp fix đề xuất (tính cả 2 lượng drain
không điều kiện trước khi kiểm `==0`), kết quả trở về gần 50/50 (52.3/47.7,
chênh lệch nằm trong nhiễu thống kê của 300 mẫu).

**→ Xác nhận C-2 (phần "SPD cao thua tất định") bằng số — không phải suy
luận, là 0/300 thực đo. Xác nhận fix đề xuất (tính cả 2 drain trước khi
kiểm) khôi phục công bằng.**

---

## Q4 — Tỉ lệ kết thúc qua D.9c (cap) vs HP=0 thật

| Biến thể | HP=0 thật | Chạm cap (D.9c) |
|---|---|---|
| INT-DIV | 0/100 | **100/100** |
| FLOAT-DIV (mặc định: onset=40, cap=200) | 100/100 | 0/100 |

Nhất quán với Q1: dưới ngữ nghĩa GDScript thật, KHÔNG trận nào trong mẫu này
hội tụ tự nhiên — toàn bộ đều rơi vào van an toàn D.9c, đúng thứ D.9c được
thiết kế để CHỈ xử lý "phần đuôi lý thuyết cực hiếm" (theo văn bản GDD), chứ
không phải là con đường chính.

---

## Q5 — Determinism RNG khi cùng seed

Chạy 2 lần độc lập, cùng seed, cùng cách luồn 1 object RNG duy nhất qua toàn
bộ chuỗi gọi D.2→D.8→D.9 → **kết quả giống hệt tuyệt đối** (`Run 1 == Run 2`).

**Diễn giải**: Điều này CHỨNG MINH khả thi của fix C-3 mục 4 (RNG injection)
— nhưng chỉ khi kiến trúc thật sự luồn 1 instance RNG duy nhất qua mọi lời
gọi, đúng như harness này làm tường minh. Bản thân pseudocode của GDD hiện
KHÔNG thể hiện việc luồn tham số này ở bất kỳ chữ ký D.x nào (đúng phát hiện
C-3 mục 4 của `godot-specialist`) — đây là việc còn phải làm khi viết lại
chữ ký các công thức, không phải thứ đã tự động đúng.

---

## Kết luận tổng hợp cho quyết định sửa GDD

1. **C-1 (chia số nguyên)**: xác nhận ở mức nghiêm trọng NHẤT có thể — 0/108,
   không phải suy luận. Bắt buộc: mọi phép chia `int/int` trong D.4b/D.9b/D.9c
   phải ép kiểu `float()` tường minh, viết thành ghi chú implementation áp
   dụng CHUNG (không phải vá từng công thức như D.12 đã làm).
2. **C-1 (chưa quét TECHNICAL_EXCHANGE_CAP)**: xác nhận — 96/108 dưới float
   div đúng, không phải 100%. Cần bổ sung ràng buộc chéo về ĐỘ RỘNG CỬA SỔ
   kiệt sức tối thiểu (`CAP - ONSET ≥ ngưỡng nào đó`), không chỉ thứ tự
   `ONSET > CONTENT_EXCHANGE_ESTIMATE`.
3. **C-2a (D.6 làm tròn về 0)**: xác nhận 100% tỉ lệ trong kịch bản áp chế
   cảnh giới cực đoan + Chống chịu vừa phải — không hiếm. Cần 1 sàn tuyệt đối
   cho `final_damage` khi `raw_damage>0 AND hit=true`, đối xứng với cách D.3/
   D.4/D.11 đã xử lý "không có tuyệt đối" ở chỗ khác.
4. **C-2b (SPD cao thua tất định)**: xác nhận ở mức TUYỆT ĐỐI — 0/300, không
   phải xu hướng. Fix đề xuất (tính cả 2 lượng `exhaustion_drain` không điều
   kiện trước khi kiểm `==0`, đúng lời hứa "đối xứng" của D.4b) khôi phục
   50/50 (52.3/47.7, trong nhiễu thống kê). Đây là fix RẺ — không cần công
   thức mới, chỉ cần đổi thứ tự 2 dòng trong D.9.
5. **C-3 mục 4 (RNG injection)**: khả thi và đúng nếu luồn tường minh — cần
   viết lại chữ ký D.2/D.3/D.5/D.8/D.9/D.11/D.14 để thể hiện tham số RNG
   explicit, không chỉ ghi chú văn xuôi.

**2 quyết định thiết kế cần chốt trước khi sửa văn bản GDD** (đúng như
creative-director đã nêu ở vòng 3):
- Sàn tối thiểu cho `final_damage` là bao nhiêu? (đề xuất: `max(1, round(...))`
  khi `hit=true AND raw_damage>0`, đối xứng D.4's `MIN_RAW_RATIO`)
- Thứ tự tính `exhaustion_drain` trong D.9: đổi từ "tính first → kiểm → tính
  second → kiểm" sang "tính cả 2 → kiểm cả 2 → tiebreak nếu cả 2 cùng chết"
  (đã có sẵn `hp_pct_pre_drain` chờ dùng cho đúng việc này).
