# Prototype: Khế Ước AI-Tường Thuật

## Hypothesis

Nếu hệ thống tính Lực chiến (hoặc bất kỳ trạng thái cơ học nào) và khóa kết
quả TRƯỚC khi gọi AI, rồi chỉ đưa kết quả đã khóa vào prompt để AI tường
thuật — AI sẽ tường thuật trung thực 100%, không tự ý ngụ ý một kết quả
khác, kể cả khi trạng thái có nhiều lớp thông tin chồng lên nhau (VD: danh
tính thật vs. cải trang, Song Tu mở/khóa).

Test 1 kiểm chứng lớp cơ bản nhất: thắng/thua chiến đấu.
Test 2 kiểm chứng lớp phức tạp hơn: hai tầng thông tin (người chơi biết thân
phận thật qua đặc quyền xuyên không, NPC khác trong cảnh không biết) + một
cổng khóa nhị phân (Song Tu mở/chưa mở) + nội dung nhạy cảm (Pillar 5).

## Cách chạy

1. Mở `prototype.html` trực tiếp bằng trình duyệt (không cần server).
2. Dán Gemini API key cá nhân vào ô "Gemini API Key" (lấy free tại
   https://aistudio.google.com/apikey — không lưu lại, chỉ tồn tại trong
   biến JS runtime của phiên trình duyệt đó).
3. Model ID mặc định: `gemini-3-flash-preview` (model text đang dùng thật
   trong `src/reference.md`, khác model ảnh `gemini-3.1-flash-image-preview`).
4. **Test 1 — Chiến đấu**: chọn kịch bản + vũ khí của nhân vật chính, bấm
   "Chạy thử lượt mới", đối chiếu Ground Truth với đoạn AI viết, bấm Đúng/Sai.
   - Đối thủ cũng có vũ khí + chiêu thức riêng, random độc lập (có thể trùng
     hoặc khác loại vũ khí với nhân vật chính).
   - Mỗi kỹ năng có nhiều "thức" đặt tên riêng biệt — trong 1 trận không thức
     nào lặp lại y hệt, nhưng cùng 1 kỹ năng gốc (khác thức) có thể xuất hiện
     nhiều lần.
   - Một số họ kỹ năng dùng chung tên gốc trên nhiều vũ khí (VD: "Lưu Vân
     Kiếm Pháp" vs "Lưu Vân Đao Pháp") — khác nhau ở phong cách thực hiện
     (Kiếm: uyển chuyển/linh hoạt/hiểm độc/chuẩn; Đao: mạnh mẽ/bá đạo/lực phá
     xảo) — kiểm tra xem AI có phân biệt đúng phong cách hay viết y hệt nhau.
   - Số chiêu mỗi trận random 1-5 tùy mức chênh lệch, độ dài yêu cầu 450-750
     từ, có giao đấu thường xen kẽ chứ không dồn chiêu liên tục.
5. **Test 2 — Cải trang + Song Tu**: cấu hình tên thật/tên cải trang, Hảo
   cảm, ngưỡng Song Tu, bối cảnh (công khai/riêng tư), bấm "Chạy thử lượt
   mới", đối chiếu và bấm Đúng/Sai.
   - Khi Song Tu mở khóa + bối cảnh **riêng tư**: dùng nguyên văn prompt NSFW
     đang chạy thật trong `src/reference.md` (xử lý Song Tu, dòng ~29047) —
     văn phong sắc hiệp/tu tiên, 2000-5000 từ, từ vựng trực diện. An toàn
     filter của Gemini API được nới (`safetySettings: BLOCK_NONE`) để kiểm
     tra backend có cho phép nội dung người lớn hay không (rủi ro kỹ thuật
     đã ghi trong Open Questions của `design/gdd/game-concept.md`).
   - Khi Song Tu mở khóa + bối cảnh **công khai**: chỉ một khoảnh khắc riêng
     tư kín đáo, không NSFW (có NPC khác chứng kiến).

## Trạng thái

Concluded — verdict PROCEED. Xem chi tiết đầy đủ tại [REPORT.md](REPORT.md).

## Findings

- Hypothesis CONFIRMED: kiến trúc một chiều (state → khóa kết quả → AI chỉ
  tường thuật) đủ để giữ AI tuân thủ Khế Ước Cơ Học/Tường Thuật, kể cả với
  nhiều lớp trạng thái chồng lên nhau (thắng/thua, vũ khí/kỹ năng, danh tính
  cải trang hai tầng thông tin, Song Tu mở/khóa, NSFW).
- Điều kiện để đạt được điều đó: chỉ thị prompt phải cụ thể, tường minh, dư
  thừa — không chỉ nói chung chung "đừng đổi kết quả". Xem REPORT.md mục "If
  Proceeding" để có danh sách đầy đủ tuning values/emergent mechanics cần
  đưa vào GDD hệ thống Chiến đấu và Quan hệ NPC.
