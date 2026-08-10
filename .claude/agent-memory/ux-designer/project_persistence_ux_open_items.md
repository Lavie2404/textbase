---
name: project-persistence-ux-open-items
description: Khoảng trống UX chưa giải quyết trong persistence-save-system.md / core-ui-screen-navigation.md (Save Slot Screen) — cập nhật sau vòng adversarial review 2026-08-06 re-review kế tiếp
metadata:
  type: project
---

Phát hiện khi làm adversarial `/design-review` cho `design/gdd/persistence-save-system.md`
đối chiếu `design/gdd/core-ui-screen-navigation.md` §4/§5/§8/D.4. Bản đầu (2026-08-06) có 5
mục; bản này (cùng ngày, vòng re-review kế tiếp) đóng 4/5 mục cũ và phát hiện các mục MỚI —
chủ yếu lệch giữa 2 file do sửa độc lập không đối chiếu chéo.

**Đã đóng từ bản trước:**
- Mục 1 cũ (race Turn Confirmed vs write-failure) — đóng bởi mô hình write-ahead (Core Rule
  #1 sửa 2026-08-06): ghi atomic giờ là GATE trước transition, không phải phản ứng sau. Xem
  F4 mới bên dưới — mô hình này có 1 kẽ hở SÂU HƠN chưa đóng hẳn (định nghĩa "ghi atomic
  thành công" có pin đúng cùng 1 ngưỡng durable với tín hiệu "đang ghi" hay không).
- Mục 3 cũ (thời điểm phát hiện đa-tab mơ hồ) — đóng: Error Taxonomy + UI Requirements nay
  nói rõ phát hiện tại thời điểm MỞ slot (Load), không phải lúc gõ hành động.
- Mục 4 cũ (2/5 mã lỗi thiếu bề mặt) — đóng: `LOAD_FAILED_UNREADABLE` (nhãn cố định trên
  hàng slot, core-ui §4) và `MULTI_TAB_CONFLICT` (banner tại S1/màn chơi) đều đã có bề mặt.
- Mục 5 cũ (LOAD_FAILED_UNREADABLE cùng cấp thị giác banner quota) — đóng: giờ KHÔNG dùng
  banner nữa, là nhãn thường trực trên hàng slot — mạnh hơn đề xuất ban đầu.

**Vẫn mở — Mục 2 cũ**: điều kiện GIẢI PHÓNG khóa đa-tab (Web Locks API tự release vs
tự cài heartbeat/timeout) chưa chốt — Open Question, owner technical-director/ADR.

**MỚI phát hiện (vòng re-review 2026-08-06 kế tiếp):**

**F1 (blocking) — Mâu thuẫn hình học Save Slot Screen giữa 2 file**: persistence-save-system.md
Visual/Audio Requirements (dòng ~718) vẫn mô tả "gáy sách phác họa bằng nét mực loang" (hữu
cơ) dù đã có note "RÚT GỌN, nguồn sự thật ở core-ui §4/§10" — nhưng core-ui-screen-navigation.md
§4 lại nói NGƯỢC LẠI tường minh: "Cố tình HÌNH HỌC/thẳng nét — đối lập khung mực loang hữu cơ
của Card". Câu mô tả cũ sống sót qua đợt "rút gọn" mà không bị xóa dù mâu thuẫn trực tiếp bản
mới hơn. **Why:** đúng kiểu lỗi Q1 hay gặp — 1 GDD tự nhận "không lặp lại chrome" nhưng câu
văn cụ thể còn sót lại vẫn mô tả sai chrome thật. **How to apply:** khi review lại Visual/Audio
Requirements của persistence-save-system.md, xóa hẳn mọi mô tả hình khối cụ thể (mực loang/
hình học/...), chỉ giữ mô tả CHỨC NĂNG (phân biệt đang chơi/đã khép), trỏ 100% hình khối sang
core-ui §4.

**F2 (blocking) — core-ui-screen-navigation.md UI Requirements "Save Slot Screen (S1)" (dòng
~671) tự mâu thuẫn với chính Visual/Audio §4 của nó VÀ với persistence-save-system.md**: chỉ
liệt 2 trạng thái (đang chơi/đã khép) trong khi Visual/Audio §4 đã có 3 (thêm "không đọc
được"); KHÔNG hề nhắc hành động "Chép lại quyển sổ" (export, Core Rule #9 của persistence —
bắt buộc player-facing) — grep toàn file core-ui-screen-navigation.md không thấy "Chép lại"/
"export" ở đâu ngoài 1 dòng liên quan browser back; không phân biệt xác nhận ESCALATED (gõ
tên) vs xác nhận thường. **Why:** đây là bằng chứng CỤ THỂ cho việc ranh giới data-contract
(Persistence) vs chrome (Core UI) đang RÒ RỈ hai chiều — không chỉ Persistence lấn core-ui,
mà core-ui cũng có 1 dòng tóm tắt hành động bị lỗi thời không theo kịp các lần sửa Core
Rule #9/Edge Cases mới của Persistence. **How to apply:** trước khi chạy `/ux-design
save-slot-screen.md`, phải sửa dòng UI Requirements này của core-ui để khớp đủ 3 trạng thái
+ hành động export + phân biệt 2 tier xác nhận xóa.

**F4 (blocking, Pillar 2) — Tín hiệu "đang ghi" và Core Rule #1 write-ahead có thể KHÔNG
cùng định nghĩa "ghi atomic thành công"**: Visual/Audio Requirements của persistence
(dòng ~741-744) vẫn mô tả cue này là "lưới an toàn UX duy nhất cho khoảng thời gian giữa
'Turn Confirmed hiển thị' và 'dữ liệu đã thật sự bền vững'" — đúng thứ khoảng-xám mà Core
Rule #1 write-ahead tuyên bố đã ĐÓNG HẲN. Đọc kỹ: cue "khô lại" chỉ khi write thành công VÀ
(nếu cần) `syncfs()` xác nhận xong — một ngưỡng CHẶT hơn "write() call trả về thành công".
Nếu cổng chuyển Turn Confirmed ở Core Rule #1 chỉ chờ write() trả về (không chờ syncfs), race
cũ bị mở lại qua backdoor tầng lưu trữ — đúng câu hỏi ưu tiên cao nhất đang treo ở Open
Question IDBFS. **How to apply:** khi ADR/Core Rule #1 được làm rõ, đảm bảo CÙNG MỘT định
nghĩa "ghi atomic thành công" (bao gồm cả bước đồng bộ nếu cần) được dùng cho CẢ cổng
transition LẪN điều kiện "khô lại" của cue — không phải 2 mô tả rời rạc có thể lệch nhau.

**F6 (blocking, Mobile Web + tiếng Việt) — Xác nhận xóa "gõ lại tên nhân vật" thiếu spec
chuẩn hóa chuỗi**: không có nơi nào định nghĩa case-sensitivity, trim khoảng trắng, hay
chuẩn hóa Unicode (NFC/NFD) cho phép so khớp. Rủi ro cụ thể: bàn phím ảo/IME tiếng Việt trên
Mobile Web (đặc biệt iOS Safari) có thể sinh chuỗi tổ hợp dấu (NFD) khác byte dù nhìn giống
hệt bản NFC — người chơi gõ ĐÚNG tên nhìn thấy vẫn có thể bị từ chối. Đây là bug thật, không
phải lý thuyết, với 1 luồng "xóa vĩnh viễn" vốn đã cố ý friction cao. **How to apply:** khi
route sang `/ux-design save-slot-screen.md` hoặc ADR, phải chốt: chuẩn hóa NFC + trim 2 đầu
trước so sánh; khuyến nghị case-insensitive (case không mang thêm tín hiệu "cố ý" nào, chỉ
gây friction ngẫu nhiên do auto-capitalize).

**F8 (recommended) — Banner PREEMPT quota/WRITE_FAILED có đường quay lại (core-ui §5: "hiện
lại sau khi banner lỗi ghi được dismiss") nhưng KHÔNG có AC/test nào phủ hành vi ngoại lệ
này** (chỉ có AC-02 FIFO chung chung), và chưa rõ khi "hiện lại" có RE-EVALUATE
`warn_triggered` tại thời điểm đó hay cứ khôi phục banner cũ vô điều kiện (có thể đã stale
nếu quota vừa được giải phóng). Cũng chưa nói rõ hành vi nếu 1 banner thứ 3 tới trong lúc
banner PREEMPT đang hiện. **How to apply:** thêm 1 AC riêng cho hành vi preempt-and-restore
trước khi coi UI Requirements của Persistence là đầy đủ.

Liên quan [[project_story_log_ux_open_items]] (cùng dạng: ranh giới ẩn giữa "UI đã hiển
thị" và "dữ liệu/AI đã thật sự bền vững/nhớ").
