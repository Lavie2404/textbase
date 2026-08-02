# Concept Prototype Report: Khế Ước AI-Tường Thuật

> **Date**: 2026-08-01
> **Prototype Path**: HTML
> **Concept File**: design/gdd/game-concept.md (if exists)

---

## Hypothesis

Nếu hệ thống tính toán và khóa kết quả cơ học (thắng/thua, HP, vũ khí/kỹ
năng dùng, danh tính thật vs. cải trang, Song Tu mở/khóa) TRƯỚC khi gọi AI,
rồi chỉ đưa kết quả đã khóa vào prompt để AI tường thuật — AI sẽ tường thuật
trung thực 100%, không tự ý ngụ ý một kết quả khác, kể cả khi trạng thái có
nhiều lớp thông tin chồng lên nhau. Biết đúng nếu qua nhiều lượt thử nghiệm,
0 lần AI tự ý đổi kết quả đã khóa.

---

## Riskiest Assumption Tested

Rủi ro lớn nhất được xác định trong `/design-review design/gdd/game-concept.md`
(blocking item B1, do godot-specialist nêu): Khế Ước Cơ Học/Tường Thuật —
nền tảng của toàn bộ Unique Hook trong game — không thể chỉ dựa vào "prompt
engineering" để giữ AI tuân thủ, cần một kiến trúc thực thi một chiều (state
→ khóa kết quả → AI chỉ tường thuật, không bao giờ parse ngược output AI vào
state). Giả định này đã được kiểm chứng TRỰC TIẾP qua prototype — và **đã
được xác nhận đúng**, với điều kiện: kiến trúc một chiều phải đi kèm chỉ thị
prompt đủ cụ thể, dư thừa (không chỉ nói "đừng đổi kết quả" một câu chung
chung).

---

## Approach

Xây một trang HTML độc lập (`prototype.html`) gọi trực tiếp Gemini API
(model `gemini-3-flash-preview`, đúng model text đang chạy thật trong
`src/reference.md`), với 2 bộ test:

- **Test 1 — Chiến đấu**: hệ thống hardcode so sánh Lực chiến, khóa thắng/
  thua + % HP mất + vũ khí + chuỗi "thức" kỹ năng phải dùng (cả nhân vật
  chính lẫn đối thủ, độc lập ngẫu nhiên, có thể trùng họ kỹ năng khác vũ
  khí) trước khi gọi AI. Có nút test riêng ép kịch bản "cùng họ kỹ năng,
  khác vũ khí".
- **Test 2 — Cải trang + Song Tu**: khóa danh tính thật/cải trang của NPC,
  Hảo cảm, ngưỡng Song Tu (mở/chưa mở), bối cảnh (công khai/riêng tư) trước
  khi gọi AI; khi Song Tu mở khóa + riêng tư, dùng nguyên văn phong cách
  prompt NSFW đang chạy thật trong `src/reference.md`.

Toàn bộ đối chiếu Ground Truth vs. đoạn AI viết là thủ công — người dùng tự
đọc và bấm Đúng/Sai, không có logging tự động structured (đây chính là gap
qa-lead đã nêu trong `/design-review`, xem "Lessons Learned").

**Path chosen:** HTML
**Reason for path:** Đây là câu hỏi về logic/tuân thủ của AI qua kiến trúc
prompt, không phải câu hỏi về cảm giác timing/feel — không cần engine thật,
nhưng cần gọi LLM API thật nên Paper không dùng được.

**Shortcuts taken (intentional):**
- Công thức Lực chiến hardcode đơn giản (so sánh 2 số), không phải công
  thức thật của game.
- Không có persistence, không menu, không UI polish — 1 file HTML duy nhất.
- API key nhập trực tiếp vào ô password trên trang, chỉ tồn tại trong biến
  JS runtime của phiên trình duyệt, không lưu.
- Đối chiếu Ground Truth vs. AI output hoàn toàn thủ công (mắt người), không
  có kiểm định tự động.

---

## Result

Quá trình xây và test trải qua nhiều vòng lặp sửa lỗi/tinh chỉnh trước khi
đạt trạng thái ổn định:

- Model ID mặc định ban đầu (`gemini-2.5-flash`) bị lỗi 404 (model đã ngừng
  hỗ trợ user mới) — sửa bằng cách lấy đúng model text thật đang chạy trong
  `src/reference.md` (`gemini-3-flash-preview`).
- Đoạn tường thuật đầu tiên quá ngắn — phải tăng yêu cầu độ dài lên gấp 3
  (450-750 từ) và thêm chỉ thị "nhịp trận đấu" (giao đấu thường xen kẽ chiêu
  thức, không dồn chiêu liên tục) mới đạt cảm giác một trận chiến thật.
- AI ban đầu nhắc thẳng số liệu Lực chiến/% HP trong đoạn văn — phải thêm
  chỉ thị cấm rõ ràng ("số liệu chỉ là dữ kiện nội bộ, người đọc không bao
  giờ được thấy con số") mới hết.
- Bản NSFW đầu tiên (viết chung chung "hãy mô tả cảnh 18+ rõ ràng") không
  đạt được văn phong/mức độ chi tiết như `reference.md` thật — phải lấy
  nguyên văn prompt NSFW đang chạy thật (từ vựng cụ thể, độ dài 2000-5000
  từ, phong cách sắc hiệp) thay cho bản mô tả chung chung mới đúng yêu cầu.
- Ban đầu 1 kỹ năng có thể bị chọn lặp lại y hệt trong cùng 1 trận — phải
  tách kỹ năng thành nhiều "thức" có tên riêng biệt, chọn không lặp lại
  thức (nhưng cùng kỹ năng gốc khác thức thì được phép lặp) mới đúng yêu
  cầu game thiết kế (1 kỹ năng có nhiều thức, tên riêng để tránh nhầm lẫn).
- Sau khi thêm đối thủ cũng có vũ khí/kỹ năng riêng (random độc lập, có thể
  trùng họ kỹ năng khác vũ khí, VD "Lưu Vân Kiếm" vs "Lưu Vân Đao") và thêm
  chỉ thị rõ về phong cách khác biệt theo từng vũ khí — AI phân biệt đúng.

**Kết quả cuối (theo xác nhận của người test)**: sau các vòng sửa trên,
không còn phát hiện lần nào AI tự ý đổi kết quả, bịa chiêu thức, để lộ thân
phận thật cho NPC không nên biết, hay sai trạng thái Song Tu.

> "Không có [sai lệch]. Sau nhiều lần sửa đổi yêu cầu thì bản prototype đã
> ổn." — người test (buổi playtest 2026-08-01)

---

## Metrics

| Metric | Value |
|--------|-------|
| Path used | HTML |
| Iterations to playable | N/A (HTML path — nhưng trải qua ~7 vòng tinh chỉnh prompt/kiến trúc trước khi ổn định, xem Result) |
| Prototype duration | Một phiên làm việc kéo dài liên tục (thời lượng chính xác không được theo dõi) |
| Playtesters | 1 nội bộ (solo dev — người chơi duy nhất dự kiến của game, đúng theo Target Player Profile trong GDD) |
| Feel assessment | N/A — đây là test logic/tuân thủ AI, không phải test cảm giác moment-to-moment |
| Hypothesis verdict | CONFIRMED |

---

## Recommendation: PROCEED

Giả thuyết cốt lõi được xác nhận: một kiến trúc một chiều (hệ thống tính và
khóa kết quả trước, AI chỉ nhận kết quả đã khóa để tường thuật, không bao
giờ được phép ghi ngược vào state) đủ để giữ AI tuân thủ Khế Ước Cơ Học/
Tường Thuật — kể cả ở các lớp phức tạp nhất đã test (danh tính hai tầng
thông tin, cổng khóa nhị phân Song Tu, nội dung NSFW, chuỗi kỹ năng nhiều
vũ khí). Toàn bộ các vấn đề gặp phải trong quá trình test đều là vấn đề
**hiệu chỉnh prompt/kỹ thuật có thể sửa** (model deprecated, thiếu chỉ thị
cụ thể), không phải dấu hiệu cho thấy kiến trúc nền tảng sai — không có bất
ngờ tiêu cực nào được ghi nhận sau khi ổn định.

---

## If Proceeding

- **Core tuning values discovered:**
  - Độ dài tường thuật cần chỉ thị tường minh bằng số từ cụ thể (450-750 từ)
    — chỉ nói "viết dài" không đủ.
  - Cấm số liệu thô trong văn bản cần chỉ thị rõ ràng, tường minh — mặc định
    AI có xu hướng lộ số nếu không cấm.
  - `safetySettings` của Gemini API cần được nới tường minh (`BLOCK_NONE`
    cho các category liên quan) mới cho phép nội dung NSFW — mặc định bị
    chặn.
  - Nội dung NSFW cần prompt cụ thể, chi tiết, dùng từ vựng trực diện (theo
    đúng mẫu đã chạy thật trong `src/reference.md`) — một chỉ thị chung
    chung ("hãy viết cảnh 18+") KHÔNG đủ để đạt chất lượng/mức độ mong muốn.

- **Assumptions confirmed:**
  - Kiến trúc một chiều (state → khóa → AI chỉ tường thuật) đủ để ngăn AI tự
    ý đổi kết quả — đúng như giả định B1 trong `/design-review`.
  - AI có thể giữ đồng thời nhiều lớp trạng thái khóa cùng lúc (thắng/thua +
    vũ khí/kỹ năng + danh tính hai tầng + Song Tu) mà không lẫn lộn, miễn là
    mỗi lớp được đặc tả tường minh trong prompt.
  - AI có thể phân biệt đúng phong cách hai vũ khí khác nhau dùng chung một
    họ kỹ năng (VD "Lưu Vân Kiếm" uyển chuyển vs "Lưu Vân Đao" mạnh mẽ) khi
    được chỉ dẫn rõ.

- **Assumptions disproved / refined:**
  - Giả định ngầm ban đầu rằng một chỉ thị prompt đơn giản, chung chung là
    đủ ("đừng đổi kết quả") — SAI. Cần chỉ thị cụ thể, dư thừa, có ví dụ cấm
    rõ ràng (đặc biệt với số liệu và nội dung NSFW) mới đạt độ tuân thủ ổn
    định.

- **Emergent mechanics (nên đưa vào GDD hệ thống Chiến đấu chính thức):**
  - Cấu trúc "kỹ năng có nhiều thức, mỗi thức tên riêng biệt" — tránh lặp
    tên chiêu trong cùng 1 trận, đồng thời cho phép 1 kỹ năng gốc "dùng
    nhiều lần" hợp lý qua các thức khác nhau.
  - Số lần xuất chiêu trong 1 trận nên scale theo mức chênh lệch Lực chiến
    (trận sát nút = nhiều chiêu hơn/giằng co; trận áp đảo = ít chiêu hơn/kết
    thúc nhanh) — nhịp trận đấu nên bắt buộc có giao đấu thường xen kẽ,
    không dồn chiêu liên tục.
  - Một số họ kỹ năng nên dùng chung tên gốc trên nhiều loại vũ khí, khác
    nhau ở phong cách thực hiện (đã test với "Lưu Vân") — đáng cân nhắc làm
    thành một quy tắc thiết kế chính thức cho hệ thống kỹ năng.
  - Xưng hô (cổ đại vs hiện đại) cần một chỉ thị hệ thống nhất quán xuyên
    suốt, không thể để mặc định — nên là một tham số cấu hình per-setting
    trong architecture thật, không chỉ per-prompt.

**Next steps:**
1. `/gate-check` — xác nhận sẵn sàng chuyển sang Systems Design (concept đã
   qua `/design-review`, revisions đã áp dụng, giờ có thêm bằng chứng
   prototype).
2. `/map-systems` — phân rã concept thành các hệ thống.
3. `/design-system combat` — đưa các phát hiện về kỹ năng/thức, nhịp trận
   đấu, họ kỹ năng chung vũ khí vào Tuning Knobs/Formulas.
4. `/design-system npc-relationship` (Hảo cảm/Song Tu/cải trang) — đưa phát
   hiện về hai tầng thông tin (xuyên không) và cổng khóa Song Tu vào Detailed
   Rules/Edge Cases.

---

## Lessons Learned

- **What assumptions were broken by actually building this?**
  Giả định rằng "chỉ cần nói AI đừng tự đổi kết quả" là đủ — thực tế cần
  nhiều vòng lặp cụ thể hóa chỉ thị (số từ, cấm số liệu, safety settings,
  từ vựng NSFW cụ thể) mới đạt độ tuân thủ ổn định. Kiến trúc đúng (khóa
  kết quả trước) là điều kiện CẦN nhưng không ĐỦ — chất lượng/độ cụ thể của
  prompt quyết định phần còn lại.

- **What surprised us that didn't show up in the brainstorm?**
  Không có — người test xác nhận không có bất ngờ nào ngoài dự đoán trong
  suốt quá trình test.

- **What would we test differently next time?**
  Cần logging tự động (snapshot trạng thái cơ học trước/sau mỗi lượt) thay
  vì đối chiếu thủ công bằng mắt — đúng như gap qa-lead đã nêu trong
  `/design-review` (Required for MVP #6). Ở quy mô lớn hơn (MVP thật, ≥90
  lượt/3 phiên), đối chiếu thủ công sẽ không còn đáng tin cậy.

---

> *Prototype code location: `prototypes/khe-uoc-ai-concept/`*
> *This code is throwaway. Never refactor into production.*
