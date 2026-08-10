# Persistence / Save System

> **Status**: Designed — Revised (vòng 3, `/design-review` full mode 2026-08-07) — chu trình `/design-review` VĂN BẢN CHÍNH THỨC ĐÓNG tại vòng 3 (quyết định user + `creative-director`, cùng tiền lệ Combat System). Spike kỹ thuật **ĐÃ HOÀN TẤT 2026-08-08** (`docs/engine-reference/godot/modules/web-export.md` §Group B) — Core Rule #3 CHỐT phương án (b) (IndexedDB transaction thật qua JavaScriptBridge, thắng vì controllability chứ không phải atomicity) + phát hiện và sửa 1 lỗ hổng chi phí thật (append-only phải là 1-file/turn-record, không phải 1 file lớn dần). Còn 6 hạng mục prototype thật (xem Open Questions) trước khi `/architecture-decision` chốt — spike KHÔNG thay thế prototype, chỉ thu hẹp phạm vi cần prototype.
> **Author**: user + agents
> **Last Updated**: 2026-08-08
> **Implements Pillar**: Pillar 2 (Hệ Quả Thực Sự)
> **Creative Director Review (CD-GDD-ALIGN)**: Đã review làm senior synthesis 3 lần — 2026-08-06 (vòng 1+2, verdict gốc NEEDS REVISION, 12 mục Required, Scope Signal XL, sửa toàn bộ cùng phiên) và 2026-08-07 (vòng 3, 5 specialist: `game-designer`, `systems-designer`, `godot-specialist`, `qa-lead`, `ux-designer` + `creative-director` — verdict NEEDS REVISION, 9 cụm nhóm-A + 8 mục batch nhóm-B, Scope Signal M cho khối lượng sửa/XL cho implementation tổng thể — sửa toàn bộ cùng phiên, creative-director khuyến nghị KHÔNG chạy vòng 4). Không phải CD-GDD-ALIGN PHASE-GATE chính thức. Xem `design/gdd/reviews/persistence-save-system-review-log.md` cho lịch sử đầy đủ.

## Overview

Persistence / Save System là cơ chế lưu và khôi phục toàn bộ trạng thái
trò chơi — nhân vật chính (chỉ số, EXP/cảnh giới, trang bị/kỹ năng), Hảo
cảm từng NPC, và Nhật ký tường thuật đầy đủ của World Memory — qua mỗi
lần đóng/mở lại trình duyệt. Người chơi không thao tác trực tiếp với hệ
thống này (không có nút "Lưu" thủ công) — nó tự động ghi lại ngay sau mỗi
lượt được xác nhận, để mỗi lần quay lại, người chơi thấy đúng thế giới
mình đã để lại: cùng cảnh giới, cùng mối quan hệ, cùng câu chuyện đã viết
— không thiếu một lượt nào, không phải chơi lại từ đầu. Không có hệ thống
này, Pillar 2 (Hệ Quả Thực Sự) chỉ có ý nghĩa trong phạm vi một phiên
chơi — mọi tiến triển, mọi lời hứa với NPC, mọi hệ quả sẽ biến mất ngay
khi tắt trình duyệt, phá vỡ chính tinh thần "cuốn nhật ký sống" (Visual
Identity Anchor, `game-concept.md`) mà toàn bộ dự án được xây dựng xung
quanh.

## Player Fantasy

*(`creative-director` không được tham vấn — Lean mode, không phải section
rủi ro cao theo quy tắc skill.)*

Người chơi cảm nhận hệ thống này qua một màn hình chọn slot lưu — nơi mỗi
playthrough là một "quyển nhật ký" riêng biệt, độc lập. Khi nhân vật
chính chết thật và người chơi chọn "Chơi lại" (một trong 3 lối tiếp tục ở
`game-concept.md` mục Cái Chết), playthrough cũ **không biến mất** — nó
khép lại như một cuốn nhật ký đã viết xong, vẫn còn đó để mở lại xem,
trong khi một quyển mới bắt đầu từ trang trắng ở một slot riêng. Cảm giác
đúng: không phải "xóa và làm lại", mà là "khép một chương, mở một chương
khác" — đúng tinh thần Pillar 2 (Hệ Quả Thực Sự): ngay cả cái chết thật
sự, hệ quả nặng nề nhất trong game, cũng không xóa sạch những gì đã xảy
ra, chỉ đóng nó lại vĩnh viễn.

*(Lưu ý phạm vi MVP, bổ sung 2026-08-06, `/design-review` —
`game-designer`: lời hứa "hệ quả không biến mất" ở đây được Persistence
đảm bảo Ở TẦNG LƯU TRỮ — playthrough cũ luôn đọc lại được nguyên vẹn.
Việc lối "Chơi lại" có mang theo hệ quả cơ học/tường thuật nào sang
playthrough MỚI hay không (echo, hồi ức NPC...) là phạm vi của
`character-continuation.md`, hệ đó đã CHỦ Ý chỉ kích hoạt đầy đủ 1/3 lối
tiếp tục ở MVP — xem `systems-index.md` mục Priority Tiers. Đây không
phải khoảng trống của GDD này.)*

Người chơi không thao tác với hệ thống này ở mỗi lượt chơi — auto-save
chạy nền sau mỗi lượt xác nhận, không có nút "Lưu" thủ công giữa chừng
(giữ đúng nhịp điệu Turn Manager, không làm gián đoạn tường thuật). Người
chơi chỉ chạm trực tiếp vào hệ thống này ở những khoảnh khắc có trọng
lượng thật: mở màn hình chọn slot để bắt đầu một quyển mới, tiếp tục một
quyển đang dang dở, hoặc mở lại một quyển đã khép để hoài niệm — không
phải một thao tác vặt vãnh mỗi lượt, mà một cử chỉ có ý nghĩa, khớp tinh
thần "cuốn nhật ký sống" (Visual Identity Anchor "Mực Chưa Khô",
`game-concept.md`).

## Detailed Design

### Core Rules

1. **Auto-save duy nhất tại 2 checkpoint mỗi lượt, ghi GATE việc chuyển
   trạng thái (write-ahead), gate = `durability_confirmed` chứ không phải
   "lời gọi ghi trả về"**: hệ thống tự động ghi atomic **NGAY TRƯỚC KHI**
   Turn Manager chuyển sang **Turn Confirmed** (sau khi AI tường thuật
   xong, còn đang ở Resolving) VÀ **NGAY TRƯỚC KHI** Undoing hoàn tất
   chuyển về **Awaiting Action** (còn đang ở Undoing). Điều kiện để
   transition đó xảy ra là `durability_confirmed = true` — thuật ngữ được
   ĐỊNH NGHĨA CHÍNH XÁC ở Core Rule #3 — không phải hệ quả xảy ra sau đó.
   **Sửa 2026-08-06** (`/design-review`, đóng mâu thuẫn: bản cũ để Turn
   Confirmed render đầy đủ (narration, nút Undo, 4 gợi ý mới —
   `turn-manager.md` States and Transitions) TRƯỚC KHI biết ghi có thành
   công hay không, khiến Core Rule #4 cũ phải "phủ nhận retroactive" một
   trạng thái UI đã hiển thị xong — không có transition nào cho việc đó
   trong state machine thật. Mô hình write-ahead loại bỏ khoảng xám này:
   "Turn Confirmed" giờ tương đương ĐÚNG với "đã ghi bền vững", không còn
   khoảng thời gian nào UI đã render "xong" nhưng dữ liệu chưa chắc đã lưu
   — xem `turn-manager.md` Core Rule #4/States and Transitions đã sửa
   tương ứng). **Sửa lại 2026-08-06 vòng re-review tiếp theo** (`/design-review`,
   đóng mâu thuẫn MỚI phát hiện — 3 specialist độc lập [`game-designer`,
   `ux-designer`, `godot-specialist`] hội tụ về cùng 1 lỗ hổng: câu chữ cũ
   dùng "ghi atomic THÀNH CÔNG" mà không đặt tên ranh giới bền vững, khiến
   Visual/Audio Requirements tự mâu thuẫn với chính câu này — bản trước
   tuyên bố khoảng lệch "Turn Confirmed hiển thị vs dữ liệu bền vững thật"
   đã bị xóa sổ, trong khi Visual/Audio Requirements biện minh cho 1 tín
   hiệu MVP bắt buộc bằng chính khoảng lệch đó. Xem Core Rule #3 để có
   định nghĩa `durability_confirmed` + posture cam kết, và AC-01 đã sửa
   tương ứng để assert đúng ranh giới này, không chỉ đếm invocation).
   Không ghi ở giữa các bước tính toán/tường thuật của Resolving hay các
   bước hoàn tác của Undoing — đây chính là điều loại bỏ rủi ro "trạng
   thái mồ côi" mà `turn-manager.md` Open Questions đã flag (trình duyệt
   đóng giữa lúc ghi).

2. **Save bundle gồm nhiều blob độc lập, do hệ gốc sở hữu**: mỗi lần ghi,
   Persistence gom trạng thái từ từng hệ đã đăng ký (Turn Manager, World
   Memory, và các hệ Feature khi được thiết kế — Equipment & Skill Data,
   NPC Affinity, Combat...) dưới dạng blob dữ liệu riêng biệt. Persistence
   **không diễn giải nội dung bên trong** từng blob — chỉ đảm bảo toàn bộ
   các blob được ghi/khôi phục nhất quán với nhau. Đúng-sai nội dung 1
   blob thuộc trách nhiệm của GDD sở hữu nó.

3. **Ghi atomic, tất cả-hoặc-không-gì**: toàn bộ save bundle của 1 lượt
   được ghi như MỘT giao dịch — hoặc ghi đủ toàn bộ, hoặc không ghi gì.
   Không bao giờ tồn tại trạng thái "ghi một nửa" trên đĩa.

   **Định nghĩa `durability_confirmed` + Posture cam kết** (bổ sung
   2026-08-06 vòng re-review tiếp theo, `/design-review` — hợp nhất
   finding 3 specialist độc lập [`game-designer`, `ux-designer`,
   `godot-specialist`] + quyết định user): `durability_confirmed(write)`
   là điều kiện boolean = `true` CHỈ KHI toàn bộ chuỗi xác nhận bền vững
   của backend lưu trữ đã chọn (ADR) đã hoàn tất — không chỉ lời gọi API
   tầng cao (VD `FileAccess.store_*()`) trả về, mà CẢ bước đồng bộ/flush
   cấp thấp hơn nếu backend đó cần (VD `syncfs()` bất đồng bộ của
   Emscripten IDBFS, hoặc `oncomplete` của IndexedDB transaction). GDD
   này cam kết **posture CHẶT ở tầng HỢP ĐỒNG**: Core Rule #1 (gate Turn
   Confirmed/Awaiting Action) và tín hiệu "đang ghi" (Visual/Audio
   Requirements) đều PHẢI bind vào đúng 1 định nghĩa `durability_confirmed`
   này, không phải 2 ngưỡng khác nhau — đóng đúng mâu thuẫn mà 3
   specialist độc lập phát hiện. Để giữ chi phí thấp mà VẪN giữ posture
   chặt (không đánh đổi Pillar 2 lấy nhịp điệu), GDD này chọn HIỆN THỰC
   bằng chiến lược **append-only cho turn record**: mỗi lượt xác nhận chỉ
   ghi bền vững phần TĂNG THÊM (1 turn record mới + trạng thái "hiện tại"
   đã đổi của các blob khác — KHÔNG ghi lại toàn bộ Nhật ký đầy đủ mỗi
   lượt), cộng 1 full-bundle flush ĐỊNH KỲ (chu kỳ cụ thể là quyết định
   ADR, được phép chạy ngoài critical path của 1 lượt — VD ở khoảng
   Awaiting Action rảnh rỗi — miễn không chặn transition của lượt đang xử
   lý). Đây chính là chiến lược Core Rule #3 đã bóng gió ở khuyến nghị
   kiến trúc bên dưới ("VD ghi turn record mới dạng append-only tách khỏi
   việc ghi lại toàn bộ blob cố định mỗi lượt") — nay được NÂNG THÀNH CAM
   KẾT chính thức, không còn là 1 lựa chọn dự phòng nếu vượt ngân sách
   latency. `durability_confirmed` của 1 lượt = bền vững của ĐÚNG phần
   append-only đó, không phải toàn bộ bundle — giữ chi phí ghi mỗi lượt
   ~hằng số thay vì tăng theo `world_time` (đối lập trực tiếp với việc
   Formula #1 tự chứng minh bundle TỔNG tăng không giới hạn).

   **Ràng buộc hiện thực BẮT BUỘC — mỗi turn record PHẢI là 1 FILE riêng
   biệt** (bổ sung 2026-08-08, spike kỹ thuật `docs/engine-reference/godot/modules/web-export.md`
   §Q5, đóng gap tự phát hiện qua đọc source code IDBFS/Emscripten thật —
   ĐÂY LÀ SỬA CORE RULE, không chỉ Open Question, vì cam kết "chi phí
   hằng số" ở trên đã SAI nếu hiện thực theo cách hiển nhiên nhất): IDBFS
   (tầng lưu trữ `user://` trên Web export) ghi lại **TOÀN BỘ nội dung
   file** mỗi lần file đó "dirty" trong 1 lần sync — KHÔNG hỗ trợ append
   một phần vào 1 file đang tồn tại. Nếu append-only được hiện thực như
   "1 file nhật ký duy nhất, ngày càng lớn" (VD `journal.dat`), MỖI lượt
   xác nhận buộc phải re-serialize + ghi lại TOÀN BỘ nhật ký đã tích lũy
   — đúng chi phí O(world_time) mà chiến lược này tồn tại để LOẠI BỎ. Để
   đạt đúng chi phí ~hằng số đã cam kết, **mỗi turn record PHẢI là 1 file
   vật lý riêng** (VD `user://slot_[id]/turns/[turn_id].dat`) — chỉ file
   MỚI đó "dirty" ở mỗi lượt, không đụng tới các file turn record cũ. Hệ
   quả kèm theo (cũng phải vào ADR): số lượng file tăng theo `world_time`
   khiến chi phí LIỆT KÊ file khi sync (quét toàn bộ MEMFS tree) tăng theo
   O(số file) — đây là lý do full-bundle flush ĐỊNH KỲ (đã cam kết ở trên)
   PHẢI gộp các file turn record cũ thành 1 snapshot rồi XÓA các file đã
   gộp, không chỉ đơn thuần "ghi thêm 1 bản sao đầy đủ" — nếu không, số
   file tích lũy vô hạn sẽ âm thầm làm chi phí sync tăng trở lại theo thời
   gian dù mỗi lần ghi turn record riêng lẻ vẫn rẻ. ADR PHẢI đặc tả chi
   tiết: định dạng turn record (1 file/turn), chu kỳ + cơ chế gộp
   full-flush (bao gồm dọn file cũ), và cách khôi phục đúng trạng thái khi
   load (hợp nhất mọi turn-record-file còn lại + snapshot gần nhất theo
   đúng thứ tự `world_time`).

   **Seam nội bộ `stage()`/`commit()`** (bổ sung 2026-08-07, `/design-review`
   vòng 3, đóng gap `qa-lead`): độc lập với công nghệ lưu trữ vật lý bên
   dưới (ADR chọn sau), Persistence tự sở hữu 1 giao diện nội bộ 2 pha —
   `stage(blobs[])` (chuẩn bị/gom dữ liệu ghi, chưa commit) rồi
   `commit()`/`abort()` (hoàn tất hoặc hủy) — dùng CHUNG cho mọi kịch bản
   test cần mô phỏng "đã ghi một phần, chưa commit xong" (AC-03, AC-17,
   AC-22). Đây là quyết định GIAO DIỆN của chính GDD này (test được ngay
   bằng mock, không phụ thuộc backend thật), khác với việc chọn CÔNG NGHỆ
   lưu trữ vật lý thật (vẫn là ADR).

   **Ràng buộc kiến trúc — CHỐT (b), ĐÓNG lựa chọn (a)/(b)** (bổ sung
   2026-08-06, `/design-review` — `godot-specialist`; **CHỐT 2026-08-08**
   bằng spike kỹ thuật `docs/engine-reference/godot/modules/web-export.md`
   §Q5/Q6, đóng câu hỏi đã treo từ đầu GDD này): tính chất atomic-nhiều-blob
   là một GUARANTEE Ở MỨC THIẾT KẾ, không tự động có được từ mọi công
   nghệ lưu trữ trình duyệt. **Phương án (b) — dùng trực tiếp IndexedDB
   `readwrite` transaction thật qua `JavaScriptBridge` — THẮNG, đã CHỐT**:
   KHÔNG dùng `FileAccess`/`user://` mặc định của Godot HTML5 export làm
   cơ chế gate cho `durability_confirmed`. Lý do chốt (xác nhận bằng đọc
   trực tiếp source code engine, không phải suy luận): spike xác nhận
   GDScript **HOÀN TOÀN KHÔNG THỂ quan sát/await thời điểm `syncfs()` của
   IDBFS thực sự hoàn tất** — `JavaScriptBridge.force_fs_sync()` chỉ dựng
   1 cờ dirty, sync thật chạy ở đầu frame kế tiếp qua 1 callback nội bộ
   engine không phát tín hiệu ra ngoài, không polling được. Nghĩa là
   Core Rule #1 (gate Turn Confirmed/Awaiting Action trên
   `durability_confirmed`) **không thể hiện thực được qua (a)** — không
   phải vì (a) yếu về atomicity (spike xác nhận NGƯỢC LẠI: IndexedDB
   KHÔNG chunk payload, và 1 sync pass CÓ atomicity đa-file thật qua 1
   transaction `readwrite` duy nhất) — mà vì (a) không có ĐƯỜNG QUAN SÁT
   nào để biết khi nào bền vững đã xảy ra. Phương án (b) — driving
   IndexedDB transaction trực tiếp qua `JavaScriptBridge.create_callback()`
   nhận `transaction.oncomplete` — là đường DUY NHẤT expose đúng điểm
   commit mà `durability_confirmed` cần. **Chốt thắng trên trục
   CONTROLLABILITY, không phải trục ATOMICITY** — 2 trục này độc lập
   (đã phân tích ở bản trước), và trục atomicity hóa ra không phải vấn đề
   thật.

   *(Ghi chú trung thực — nếu sau này chi phí hiện thực (b) tỏ ra quá đắt:
   nước đi đúng là NỚI tường minh posture Core Rule #1 [VD chấp nhận
   `durability_confirmed` = "ghi tới MEMFS thành công", một guarantee yếu
   hơn nhưng CÓ THẬT và quan sát được], không phải âm thầm chọn lại (a)
   rồi giả vờ gate vẫn tồn tại như cũ.)*

   **Chi phí thực hiện (b)** (cập nhật 2026-08-08 theo spike): (b) đòi hỏi
   bỏ qua hoàn toàn `FileAccess` cho đường ghi turn record, viết 1 lớp JS
   glue qua `JavaScriptBridge` (dùng `get_interface()`/`create_object()`/
   `create_callback()` — KHÔNG dùng `JavaScriptBridge.eval()`, xem Open
   Questions §CSP) để chạm trực tiếp API IndexedDB. Xem Tuning Knob
   `max_perceived_autosave_latency_ms` — ADR PHẢI đo END-TO-END chi phí
   thật của đường (b) này (gồm cả serialize CPU trên main thread duy nhất
   của Web export) trước khi khóa; đây vẫn là hạng mục PROTOTYPE THẬT
   (spike chỉ xác nhận đường (b) khả thi về mặt API, chưa đo latency
   thật) — xem Open Questions.

4. **Ghi thất bại chặn transition, không còn cần "phủ nhận ngược" 1 trạng
   thái đã hiển thị**: nếu atomic write thất bại (VD: hết quota trình
   duyệt) TRƯỚC khi vào Turn Confirmed, lượt đó KHÔNG được coi là đã xác
   nhận — `world_time` không tăng (đồng bộ với Turn Manager Edge Case
   "lệnh gọi AI thất bại", nay cùng nhóm xử lý với Edge Case "ghi atomic
   thất bại" — xem `turn-manager.md`), hệ thống báo lỗi rõ ràng cho người
   chơi (theo đúng 1 mã lỗi ở **Error Taxonomy** bên dưới), quay về
   Awaiting Action để nhập lại hành động, và giữ nguyên trạng thái hợp lệ
   gần nhất đã lưu trên đĩa. **Sửa 2026-08-06** (`/design-review`): nhờ
   Core Rule #1 nay là write-ahead (gate trước khi transition, không phải
   sau), tình huống "lượt đã Turn Confirmed hiển thị xong nhưng ghi lại
   thất bại" KHÔNG CÒN TỒN TẠI — Turn Confirmed chỉ xảy ra sau khi ghi
   atomic đã thành công. Tương tự, nếu ghi atomic thất bại TRƯỚC khi
   Undoing hoàn tất chuyển về Awaiting Action, Undo đó bị coi là CHƯA xảy
   ra — trạng thái Turn Confirmed trước đó giữ nguyên, nút Undo vẫn khả
   dụng để thử lại (xem `turn-manager.md` Edge Cases).

5. **Mỗi slot = 1 playthrough độc lập, thuộc về 1 trình duyệt trên 1
   thiết bị — KHÔNG đồng bộ đa-thiết bị ở MVP** (bổ sung 2026-08-07,
   `/design-review` vòng 3 — đóng gap `game-designer`/`godot-specialist`:
   `game-concept.md` xác nhận "Trình duyệt web trên PC và điện thoại" là
   cách chơi mặc định của chính người chơi mục tiêu, nhưng lưu trữ trình
   duyệt là per-origin PER-THIẾT-BỊ — `MULTI_TAB_CONFLICT` không bao giờ
   kích hoạt giữa 2 thiết bị khác nhau vì không có khóa chung nào tồn
   tại; mở game trên 1 thiết bị KHÁC sẽ thấy Save Slot Screen TRỐNG,
   không lỗi, không giải thích — đúng khoảnh khắc Pillar 2 hứa "thấy
   đúng thế giới mình đã để lại". GDD này PHẢI nói ra điều đó tường
   minh): mỗi slot chỉ tồn tại trên đúng trình duyệt/thiết bị nơi nó được
   tạo. Đồng bộ/cloud save KHÔNG nằm trong scope MVP — xem Open
   Questions. Save Slot Screen (`core-ui-screen-navigation.md` §4, §8)
   cần 1 empty-state phân biệt "chưa từng chơi trên thiết bị này" khỏi
   "đã xóa hết slot" nếu có tín hiệu để phân biệt (chi tiết UX thuộc
   `core-ui-screen-navigation.md`). Không giới hạn cứng số slot, chỉ
   giới hạn bởi quota trình duyệt. Slot mới được tạo ở 2 thời điểm: (a)
   người chơi chủ động chọn "Bắt đầu mới" từ màn hình chọn slot, (b) tự
   động khi người chơi chọn lối "Chơi lại" sau cái chết thật (Death &
   Consequence) — playthrough vừa kết thúc (chứa lượt `is_death_turn=true`)
   được khóa vĩnh viễn ở slot cũ. **Sửa câu chữ 2026-08-06**
   (`/design-review` — mâu thuẫn nội bộ với Edge Cases đã phát hiện):
   HỆ THỐNG không bao giờ TỰ ĐỘNG xóa hay ghi đè một slot đã khép — chỉ
   NGƯỜI CHƠI mới có thể xóa nó, chủ động, qua một cử chỉ xác nhận riêng
   có trọng lượng (xem Edge Cases). "Không bị xóa hay ghi đè" ở đây luôn
   có nghĩa "không bị hệ thống tự ý xóa", không phải "không thể xóa được
   bằng bất kỳ cách nào".

6. **Slot đã khép là read-only**: một slot mang `slot_closure_reason` đã
   set (Core Rule #10 — hoặc `death`: chứa lượt `is_death_turn=true`,
   Turn Manager đã dừng sinh gợi ý cho slot đó; hoặc `quota_exhausted`:
   người chơi chủ động chọn "Khép quyển sổ này lại" ở Core Rule #10)
   không thể tiếp tục chơi, nhưng vẫn mở được để xem lại Nhật ký đầy đủ
   (đúng UI Requirements của `world-memory-context-management.md`). **Bổ
   sung 2026-08-07** (`/design-review` vòng 3, đóng gap `game-designer`):
   trước bản sửa này, "đã khép" chỉ có 1 nguyên nhân (cái chết thật) —
   nay có 2, và chỉ nguyên nhân `death` mới đủ điều kiện kích hoạt "Chơi
   lại" của `character-continuation.md` (`continuation_choice_eligible`
   gate qua `is_death_turn`, không qua `slot_closure_reason` nói chung).

7. **Không mất nội dung ở tầng logic — đơn vị nén PHẢI khớp đơn vị ghi
   của Core Rule #3, không phải toàn khối Nhật ký**: theo đúng World
   Memory Core Rule #6, Persistence có thể áp dụng nén vật lý lossless
   khi ghi xuống đĩa (thuật toán cụ thể — xem Open Questions), nhưng nội
   dung logic đọc lại PHẢI giống hệt byte-for-byte sau giải nén. **Ràng
   buộc bổ sung 2026-08-07** (`/design-review` vòng 3, đóng mâu thuẫn
   ngầm hội tụ `godot-specialist` + `qa-lead`: câu chữ cũ "nén… lên Nhật
   ký đầy đủ" đọc như nén CẢ KHỐI mỗi lần ghi — nếu hiểu vậy, Core Rule
   #3 (append-only, cam kết chi phí HẰNG SỐ mỗi lượt) và rule này loại
   trừ nhau, vì nén 1 khối lossless kiểu gzip đòi giải nén + append + nén
   lại TOÀN BỘ mỗi lượt, quay lại đúng chi phí O(world_time) mà append-
   only tồn tại để loại bỏ): nếu ADR chọn nén, đơn vị nén PHẢI ở 1 trong
   2 dạng — (a) nén ĐỘC LẬP theo từng turn record (khớp đơn vị ghi
   append-only của Core Rule #3), hoặc (b) chỉ nén ở đúng thời điểm
   full-flush định kỳ (Core Rule #3's cam kết append-only) — KHÔNG BAO
   GIỜ nén lại toàn bộ Nhật ký ở MỖI lượt xác nhận thông thường. ADR PHẢI
   chọn tường minh (a) hay (b), không được để ngỏ theo kiểu đọc lại được
   cả 2 cách như trước.

8. **Save bundle có version**: mỗi bundle mang field `schema_version`.
   Khi load, nếu `schema_version` không khớp phiên bản hiện tại của game,
   hệ thống từ chối load tự động và báo cho người chơi đây là save từ
   phiên bản cũ hơn — không cố gắng đoán/migrate ngầm ở tầng GDD này (cơ
   chế migrate cụ thể là quyết định ADR, vì dự án đang ở Systems Design,
   nhiều schema hệ Feature còn sẽ đổi). **Ràng buộc quy trình bổ sung**
   (bổ sung 2026-08-06, `/design-review` — `systems-designer`): bất kỳ
   thay đổi nào làm thay đổi `N` của Formula #2 (thêm/bớt 1 hệ đăng ký
   blob) PHẢI đi kèm tăng `schema_version` — nếu không, 2 build khác
   nhau có thể cùng `schema_version` nhưng khác `N` thật sự, khiến cơ
   chế từ chối load ở trên không còn bảo vệ đúng ngữ nghĩa "bundle này
   khớp cấu trúc hiện tại của game". Quy ước cụ thể (checklist release,
   CI check...) là quyết định ADR/systems-index, không phải rule chi
   tiết ở GDD này. **Mở rộng 2026-08-07 vòng re-review vòng 3** (đóng gap
   `godot-specialist`: quy tắc trên chỉ bắt khi `N` đổi, bỏ sót trường
   hợp PHỔ BIẾN HƠN — 1 hệ ĐÃ đăng ký tự đổi format nội bộ blob của
   chính nó, `N` không đổi; 2 build cùng `N`/cùng `schema_version` nhưng
   blob khác nhau vẫn "hợp lệ" theo cổng kiểm tra hiện tại, vô hiệu hóa
   chính guarantee mà Core Rule #8 tồn tại để bảo vệ): **MỌI thay đổi
   format nội bộ của BẤT KỲ blob nào (không chỉ khi `N` đổi) đều PHẢI đi
   kèm tăng `schema_version`.** Vì Core Rule #2 quy định Persistence
   **opaque** với nội dung blob, Persistence KHÔNG THỂ tự phát hiện thay
   đổi này ở runtime — đây BẮT BUỘC là 1 quy tắc QUY TRÌNH do chính hệ sở
   hữu blob thực thi (checklist khi hệ đó đổi schema nội bộ), không phải
   1 cổng kiểm tra tự động của Persistence. Nghĩa vụ này áp dụng cho MỌI
   hệ đã/sẽ đăng ký blob (Equipment & Skill Data, Combat, EXP, NPC
   Affinity, Setting & Canon, Situation/Encounter Gen, Character Card) —
   cần được các GDD đó tham chiếu khi chỉnh sửa schema của chính chúng
   sau này.

9. **Xuất Nhật ký đầy đủ — TÁCH 2 ARTIFACT riêng biệt** (bổ sung
   2026-08-07, `/design-review` vòng 3 — đóng gap hội tụ `game-designer` +
   `qa-lead`: bản trước dùng "CÙNG MỘT thao tác" cho cả QA export lẫn
   "Chép lại quyển sổ" player-facing, nhưng sau khi vòng trước đổi Ý
   NGHĨA của hành động player-facing thành nghi thức lưu niệm, ĐỊNH DẠNG
   của nó chưa từng được xem lại — vẫn là JSON thô với field cơ học
   `turn_id`/`locked_result`, không khớp khung ý nghĩa mới, và cũng khiến
   không thể assert "chỉ chứa nội dung câu chuyện" một cách có ý nghĩa vì
   JSON tự nó lộ cấu trúc kỹ thuật):

   **9a. Xuất QA log (JSON, kỹ thuật/nội bộ)**: cung cấp một thao tác xuất
   Nhật ký đầy đủ ra JSON — mỗi object CHÍNH XÁC 5 field (`turn_id`,
   `action`, `locked_result`, `narration_text`, `world_time`) của MỌI lượt
   trong 1 playthrough, không cần đọc source code hay debug UI riêng —
   phục vụ trực tiếp MVP Required #6 và câu hỏi mở "world_time và lịch sử
   lượt cần inspect được" của `turn-manager.md`. Đây là công cụ KỸ THUẬT
   (QA/debug) — KHÔNG bắt buộc có mặt trên Save Slot Screen bình thường,
   có thể chỉ khả dụng qua kênh QA/debug riêng (chi tiết bề mặt truy cập
   là quyết định `/ux-design`, không phải GDD này).

   **9b. "Chép lại quyển sổ" (player-facing, nghi thức lưu niệm)**: một
   hành động RIÊNG, BẮT BUỘC hiện diện trên Save Slot Screen (**bổ sung
   2026-08-06**, đóng gap `game-designer`: rủi ro `LOAD_FAILED_UNREADABLE`
   đã biết là HIGH nhưng đối sách duy nhất trước đây là 1 thông báo
   diegetic SAU KHI mất — không có phòng ngừa chủ động, mâu thuẫn trực
   tiếp Pillar 2), sinh ra một **bản đọc được bằng tiếng Việt** (không
   phải JSON, không có tên field kỹ thuật nào lộ ra) — ghép `narration_text`
   của mọi lượt theo thứ tự `world_time` tăng dần thành văn bản liên tục,
   đọc như một quyển nhật ký thật. **Viết lại khung ý nghĩa 2026-08-06
   vòng re-review tiếp theo** (`/design-review`, đóng gap `game-designer` +
   quyết định user: reframe thành nghi thức lưu niệm — giữ nguyên áp dụng
   cho artifact 9b này): export này KHÔNG PHẢI và KHÔNG ĐƯỢC gọi là
   "backup"/"công cụ tự sao lưu" ở bất kỳ đâu (Core Rule, UI copy, Error
   Taxonomy) — nó chỉ chứa nội dung câu chuyện (`narration_text`), KHÔNG
   chứa blob cơ học (chỉ số, EXP/cảnh giới, trang bị/kỹ năng, Hảo cảm) và
   KHÔNG có cơ chế import nào để tiếp tục chơi từ file đó. Ý nghĩa thật
   của thao tác này là **nghi thức lưu niệm**: cho phép người chơi "chép
   lại câu chuyện đã viết" để đọc lại/lưu giữ CẢM XÚC, đúng tinh thần
   "cuốn nhật ký sống" — không phải một lưới an toàn kỹ thuật. Văn bản
   diegetic ở UI Requirements và Error Taxonomy PHẢI phản ánh đúng khung ý
   nghĩa này, không gợi ý "có thể khôi phục chơi tiếp được" dưới bất kỳ
   hình thức nào.

   Cả 2 artifact đọc từ CÙNG nguồn (Nhật ký đầy đủ, bản đã commit gần
   nhất) và KHÔNG sửa đổi save gốc — chỉ khác định dạng/đối tượng phục
   vụ. Việc "không có API import" là một bất biến kiến trúc (code review/
   lint, không phải điều kiện kiểm chứng được bằng 1 Acceptance Criterion
   có ý nghĩa — không thể chứng minh sự VẮNG MẶT của 1 API bằng unit
   test).

10. **Khép lại có phẩm giá khi quota cạn hoàn toàn — một lối thoát CÓ CHỦ
    Ý, không phải mất dữ liệu** (bổ sung 2026-08-07, `/design-review` vòng
    3 — đóng gap `game-designer`: Formula #1 tự chứng minh
    `quota_exhaustion_turn` hữu hạn với MỌI playthrough đủ dài — trước bản
    sửa này, khi slot ĐANG CHƠI đơn độc chiếm hết quota và không có slot
    nào khác để xóa/dọn, lối thoát DUY NHẤT còn lại là tự xóa chính
    playthrough đang chơi — mâu thuẫn trực tiếp Pillar 2 "Hệ Quả Thực
    Sự", đúng lúc hệ quả nặng nề nhất): sau `max_write_retry_before_escalation`
    lần retry-chỉ-ghi liên tiếp thất bại cùng `error_code ∈
    {WRITE_FAILED_QUOTA, WRITE_FAILED_UNSUPPORTED}` (Edge Cases, cùng
    điều kiện đã kích hoạt banner escalation), hệ thống cung cấp THÊM 1
    lựa chọn bên cạnh nút điều hướng Save Slot Screen đã có: **"Khép
    quyển sổ này lại"** — một hành động NGƯỜI CHƠI xác nhận tường minh
    (không tự động, không âm thầm), chuyển slot hiện tại sang trạng thái
    **đã khép** (read-only, Core Rule #6) NGAY TẠI bản commit gần nhất
    hợp lệ đã có. Đây KHÔNG PHẢI xóa — không mất bất kỳ lượt nào đã ghi
    thành công trước đó (chỉ lượt VỪA bị chặn ghi là không được xác nhận,
    đúng Core Rule #4 bình thường) — là một KẾT THÚC có chủ đích, tái
    dùng đúng ngữ pháp cảm xúc đã có cho cái chết thật (Player Fantasy:
    "khép một chương, mở một chương khác") cho một giới hạn kỹ thuật,
    biến quota-cạn từ một vòng lặp lỗi bất tận thành một lựa chọn có
    phẩm giá. **Trung thực về giới hạn của giải pháp này**: hành động
    này KHÔNG khôi phục khả năng chơi tiếp CHÍNH playthrough đó (slot mới
    vẫn cần quota riêng, có thể vẫn thất bại nếu origin đã cạn hoàn toàn
    — xem Open Questions) — nó chỉ đảm bảo người chơi luôn có 1 lối thoát
    TRUNG THỰC và KHÔNG MẤT DỮ LIỆU, thay vì bị kẹt vô thời hạn trong vòng
    lặp lỗi hoặc bị dồn tới chỗ tự xóa chính hệ quả của mình.
    - **`slot_closure_reason ∈ {death, quota_exhausted}`**: mỗi slot đã
      khép (Core Rule #6) nay mang 1 trong 2 nguyên nhân — trường này là
      metadata CỦA CHÍNH Persistence (không opaque, khác blob đối của
      hệ khác — Core Rule #2 không áp dụng cho trường này), dùng để Save
      Slot Screen phân biệt hiển thị (route chrome cụ thể sang
      `core-ui-screen-navigation.md` §4).
    - **KHÔNG kích hoạt Character Continuation**: `continuation_choice_eligible`
      (registry, `character-continuation.md`) chỉ gate qua
      `is_death_turn AND death_confirmed` (Turn Manager/Death & Consequence) —
      quota-closure KHÔNG set `is_death_turn=true`, nên hoàn toàn không
      chạm luồng "3 lối tiếp tục". Sau khi khép do quota, đường duy nhất
      là quay lại Save Slot Screen và "Bắt đầu mới" (slot mới, quota
      riêng) — khác hẳn "Chơi lại" (dành riêng cho cái chết thật).
    - **Không thay thế** banner escalation + nút điều hướng Save Slot
      Screen đã có ở Edge Cases/AC-31 — là 1 lựa chọn BỔ SUNG, không bắt
      buộc chọn ngay.

### Error Taxonomy

*(Bổ sung 2026-08-06, `/design-review` — đóng 1 finding hội tụ từ 3
specialist (`qa-lead`, `ux-designer`, `game-designer`): trước bản sửa
này, AC-04/AC-13/AC-21 đều assert "log category/thông báo khác nhau"
mà không có gì định nghĩa "khác nhau" nghĩa là gì — bảng dưới đây là
nguồn sự thật duy nhất cho mọi mã lỗi/thông báo mà Persistence phát ra.
Văn bản diegetic PHẢI dùng khi hiển thị cho người chơi (đúng tinh thần
"cuốn nhật ký sống", Visual Identity Anchor "Mực Chưa Khô") — mã lỗi kỹ
thuật (`error_code`) chỉ dùng nội bộ/log/QA export, KHÔNG BAO GIỜ hiển
thị trực tiếp cho người chơi.)*

| `error_code` | Kích hoạt bởi | Hiển thị người chơi? | Văn bản diegetic (nếu có) |
|---|---|---|---|
| `WRITE_FAILED_QUOTA` | Core Rule #4 — atomic write thất bại do hết quota trình duyệt | Có | "Trang giấy đã đầy — không còn chỗ ghi thêm. Hãy **chép lại** một quyển sổ cũ để giữ làm kỷ niệm trước khi cân nhắc xóa nó, giải phóng chỗ cho quyển đang viết." *(sửa 2026-08-06 vòng re-review tiếp theo — đóng gap `creative-director`: bản trước chỉ dẫn "khép hoặc xóa" mà không nhắc chép lại trước, vô tình khiến chính hệ thống tồn tại để bảo vệ Pillar 2 lại chỉ dẫn người chơi phá hủy nó đúng lúc thất bại)* |
| `WRITE_FAILED_UNSUPPORTED` | Core Rule #4 — trình duyệt/chế độ duyệt không hỗ trợ lưu trữ bền vững (VD Safari private mode), Edge Case tương ứng | Có | "Mực ở đây không bám được vào giấy — chế độ duyệt web hiện tại không giữ lại được nhật ký. Hãy thử một trình duyệt hoặc chế độ khác." |
| `LOAD_REJECTED_VERSION_MISMATCH` | Core Rule #8 — `schema_version` không khớp (cả 2 chiều cũ hơn/mới hơn) | Có | "Quyển sổ này được viết bằng một loại mực khác — phiên bản game hiện tại không đọc được. Không thể mở." |
| `MULTI_TAB_CONFLICT` | Edge Case đa-tab — tab thứ 2 bị chặn ghi | Có | "Quyển sổ này đang được viết ở một nơi khác — chỉ đọc được, chưa thể viết tiếp ở đây lúc này. Đóng tab/cửa sổ khác đang mở quyển này để tiếp tục viết ở đây." |
| `LOAD_FAILED_UNREADABLE` | **(bổ sung 2026-08-06, `/design-review` — `godot-specialist`, đóng gap: mất slot ngoài kiểm soát ghi chủ động, VD Safari ITP xóa IndexedDB sau ~7 ngày không tương tác, rủi ro đã biết ở `game-concept.md`)** — slot từng ghi thành công trước đó nay không đọc được khi Load, KHÔNG có lần ghi chủ động nào đang chạy tại thời điểm phát hiện | Có | "Trang này đã phai mực — không đọc lại được nữa. Quyển sổ vẫn còn trong danh sách nhưng nội dung đã mất." |
| `BLOB_MISSING` | Formula #2 — 1 hệ đã đăng ký nhưng trả `blob_status = MISSING` | Không (gộp vào `WRITE_FAILED_QUOTA`-style thông báo chung nếu chặn lượt; chi tiết field chỉ vào log/QA export) | — |
| `BLOB_ERROR` | **(bổ sung 2026-08-07, `/design-review` vòng 3 — `systems-designer`, đóng gap: worked example CHÍNH của Formula #2 dùng `blob_status = ERROR` [Equipment → lỗi serialize do 1 item trùng ID] nhưng trước bản sửa này KHÔNG có `error_code` riêng nào cho nhánh này — implementer không biết phải log gì)** — Formula #2, 1 hệ đã đăng ký nhưng trả `blob_status = ERROR` (lỗi serialize thật, KHÁC `MISSING`) | Không (cùng nhóm `BLOB_MISSING` — gộp vào thông báo chung nếu chặn lượt; chi tiết `system_id` chỉ vào log/QA export) | — |
| `CONFIG_ERROR_NO_SYSTEMS_REGISTERED` | Formula #2 biên — `N = 0` | Không (lỗi cấu hình, không nên xảy ra ở production; log riêng biệt, không phải trạng thái người chơi gặp trong vận hành bình thường) | — |

**Phân biệt bằng VĂN BẢN, không bằng icon/màu**: đúng rule banner-tier
của `core-ui-screen-navigation.md` §5 ("KHÔNG icon cảnh báo màu — dùng
TỪ tiếng Việt rõ nghĩa"), 5 mã lỗi hiển thị người chơi ở trên (**sửa
2026-08-06** — trước đây ghi nhầm "3", đã luôn là 4 kể từ khi
`MULTI_TAB_CONFLICT` được thêm, nay 5 với `LOAD_FAILED_UNREADABLE`)
phân biệt với nhau HOÀN TOÀN bằng nội dung văn bản diegetic, không có
icon hay mã màu riêng cho từng loại.

### States and Transitions

Không có state machine riêng (giống Contract Enforcement/World Memory) —
thay vào đó là bảng thao tác kích hoạt bởi sự kiện từ hệ khác:

| Thao tác | Kích hoạt bởi | Hành vi |
|---|---|---|
| Auto-save (xác nhận lượt) | Turn Manager: Resolving, ngay sau khi AI tường thuật xong, TRƯỚC khi chuyển Turn Confirmed (**sửa 2026-08-06** — write-ahead, xem Core Rule #1) | Gom blob từ mọi hệ đã đăng ký, ghi atomic vào slot hiện tại; THÀNH CÔNG mới cho phép Turn Manager chuyển Turn Confirmed; thất bại → Core Rule #4, Turn Manager quay về Awaiting Action |
| Auto-save (sau Undo) | Turn Manager: Undoing, ngay sau khi hoàn tất tính rollback, TRƯỚC khi chuyển về Awaiting Action (**sửa 2026-08-06** — write-ahead) | Ghi lại bundle đã hoàn tác (state đã rollback), atomic giống hệt; THÀNH CÔNG mới cho phép Turn Manager chuyển Awaiting Action; thất bại → Core Rule #4, Undo coi như chưa xảy ra, Turn Confirmed trước đó giữ nguyên |
| Tạo slot mới | Người chơi: "Bắt đầu mới" HOẶC Character Continuation: "Chơi lại" (sửa 2026-08-03, trước ghi nhầm Death & Consequence) | Khởi tạo slot rỗng mới với `slot_id` riêng, không đụng đến slot cũ |
| Khóa slot | Death & Consequence: Nhánh A bước c, NGAY khi chết thật xác nhận (`death_confirmed`) (**sửa lại 2026-08-09** — trước đó gán cho "Character Continuation: 'Chơi lại' đã kích hoạt" [2026-08-05], nhưng điều đó khiến slot vẫn "đang chơi dở" trong toàn bộ thời gian `Awaiting Continuation Choice`: nếu người chơi đóng tab đúng lúc đó và mở lại, họ rơi vào 1 slot có `alive=false` không có lối thoát nào — `/design-review character-continuation.md` round 1 tìm ra; xem `death-and-consequence.md` Nhánh A bước c) | Đánh dấu slot hiện tại là "đã khép" (read-only) — không còn auto-save lượt mới vào slot này |
| Load slot | Người chơi: chọn slot từ màn hình chọn slot | Đọc bundle mới nhất của slot, khôi phục trạng thái mọi hệ theo `schema_version`; không khớp version → từ chối, báo lỗi (Core Rule #8) |
| Xuất QA log | QA/người chơi: yêu cầu export | Trả về Nhật ký đầy đủ của slot hiện tại dạng JSON, không sửa đổi save gốc |

### Interactions with Other Systems

- **Turn Manager** (Foundation, Approved) — 2 chiều: Turn Manager kích
  hoạt 2 checkpoint auto-save (Core Rule #1), và **sửa 2026-08-06**
  (write-ahead; **sửa lại 2026-08-06 vòng re-review tiếp theo** — gate
  chính xác là `durability_confirmed`, xem Core Rule #3) —
  `durability_confirmed = true` giờ là GATE bắt buộc trước khi Turn
  Manager được phép hoàn tất transition sang Turn Confirmed/Awaiting
  Action (xem `turn-manager.md` Core Rule #4, States and Transitions);
  Persistence đọc/ghi `state`, `last_confirmed_turn_id`,
  `undo_available`, và `turn_snapshot` như 1 blob đối (Core Rule #2) —
  schema chi tiết của `turn_snapshot` KHÔNG do GDD này định nghĩa, vẫn là
  Open Question của `turn-manager.md`.
- **World Memory & Context Management** (Core, Designed) — ghi/đọc Nhật
  ký tường thuật đầy đủ (bắt buộc); Khung ngữ cảnh AI có thể cache tùy
  chọn (không bắt buộc, tái tạo được 100% theo AC-17 của GDD đó).
- **Equipment & Skill Data System** (Foundation, Approved) — blob đối
  chứa `known_skill_ids`, trang bị đã sở hữu/đang mặc của nhân vật
  chính.
- **Character Card & Identity** (Presentation, đã Designed) — blob đối
  **Entity Record** (bổ sung 2026-08-05, cụm E `/design-review` gộp 11
  GDD): hồ sơ nhân vật thường trực (`base_X0`, `npc_tag`, `concealment`
  instance) — Persistence sở hữu storage, opaque với nội dung; đóng
  khoảng trống kiến trúc "entity record ở đâu" từng để either/or giữa
  World Memory và Persistence.
- **NPC Affinity & Relationship, Combat System, EXP & Realm Progression,
  Death & Consequence, Setting & Canon Integration, Situation/Encounter
  Generation** (nay đã Designed — bổ sung Situation/Encounter Generation
  2026-08-06, `/design-review`: hệ đó đã tự khai serialize scene/tracker
  trong `turn_snapshot` qua Persistence, chiều ngược trước đây chưa được
  liệt kê ở đây) — sẽ đăng ký blob riêng khi được thiết kế; danh sách hệ
  đăng ký KHÔNG cố định trước (interface mở, đúng vai trò
  Foundation/Infrastructure).
- **Character Continuation** (Designed 2026-08-03) — **sửa 2026-08-09**:
  kích hoạt thao tác "Tạo slot mới" khi người chơi chọn "Chơi lại" —
  "Khóa slot" KHÔNG còn thuộc hệ này (đổi lại 2026-08-09, xem dòng
  "Khóa slot" ở bảng Thao tác trên và `character-continuation.md` Core
  Rule #1/#5).
- **Death & Consequence** (Approved) — **sửa 2026-08-09**: kích hoạt
  trực tiếp thao tác "Khóa slot" tại Nhánh A bước c, NGAY khi chết thật
  xác nhận — không còn chỉ phát tín hiệu `death_confirmed` thụ động (xem
  `death-and-consequence.md` Nhánh A bước c).
- **Core UI/Screen Navigation** (sửa 2026-08-06, `/design-review` —
  trước đây ghi nhầm "chưa thiết kế", hệ này đã **Approved**) — cung cấp
  màn hình chọn slot (Bắt đầu mới / Tiếp tục / Xem lại slot đã khép);
  chrome/layout chi tiết của Save Slot Screen do `core-ui-screen-navigation.md`
  §4/§5/§8/D.4 sở hữu — UI Requirements của GDD này chỉ đặc tả nội
  dung/data contract, không lặp lại layout.

## Formulas

*(Đây là công thức quản lý dữ liệu/kỹ thuật — không phải công thức cân bằng
gameplay, cùng dạng với `world-memory-context-management.md`. Công thức #1
giải quyết trực tiếp đối trọng với `ai_context_view_size_bound` đã chứng
minh (registry): phía PROMPT là O(1), phía LƯU TRỮ ở đây là O(world_time)
không giới hạn — công thức #1 định lượng "sẽ chạm quota ở world_time nào".
Đề xuất bởi `systems-designer`.)*

**1. Ước Tính Tăng Trưởng Kích Thước Save Bundle & Dự Báo Chạm Quota (Save Bundle Size Growth & Quota Exhaustion Projection)**

Công thức `save_bundle_size_growth` được định nghĩa là:

`bundle_size_bytes(world_time) = fixed_blob_bytes + world_time × avg_turn_record_bytes × compression_ratio`

`quota_exhaustion_turn(quota_bytes) = 0 nếu quota_bytes ≤ fixed_blob_bytes (bổ sung 2026-08-05 — đã hết quota TRƯỚC lượt đầu tiên), ngược lại floor((quota_bytes − fixed_blob_bytes) / (avg_turn_record_bytes × compression_ratio))`

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Lượt đã xác nhận (thời gian chơi) | world_time | int | 0 → ∞ | Cùng biến `world_time_advancement` (registry, `turn-manager.md`) |
| Kích thước blob KHÔNG scale theo world_time | fixed_blob_bytes | float | ≥ 0 (đo thực nghiệm) | Tổng byte của các blob "trạng thái hiện tại" (Turn Manager state, Equipment & Skill Data...) — mỗi hệ chỉ giữ trạng thái HIỆN TẠI, không giữ lịch sử, nên gần như hằng số theo thời gian |
| Kích thước trung bình 1 turn record | avg_turn_record_bytes | float | > 0 (đo thực nghiệm) | Byte trung bình của 1 turn record (`turn_id`, `action`, `locked_result`, `narration_text`, `world_time`) trong Nhật ký đầy đủ, TRƯỚC nén |
| Tỉ lệ nén | compression_ratio | float | (0, 1] | Kích thước SAU nén / TRƯỚC nén; = 1 nghĩa là không nén (mặc định MVP an toàn — thuật toán cụ thể là Open Question theo Core Rule #7) |
| Kích thước bundle ước tính | bundle_size_bytes(world_time) | float | [fixed_blob_bytes, ∞) | Kích thước ước tính TOÀN BỘ save bundle của 1 slot tại `world_time` |
| Quota giả định/đo được | quota_bytes | float | > 0 | Dung lượng khả dụng cho 1 slot cần kiểm tra |
| world_time dự báo chạm quota | quota_exhaustion_turn(quota_bytes) | int | [0, ∞) | `world_time` CUỐI CÙNG mà `bundle_size_bytes` CÒN VỪA `quota_bytes` (lượt kế tiếp, `+1`, mới thực sự vượt — **sửa mô tả 2026-08-07 vòng re-review vòng 3**, đóng gap `systems-designer`: mô tả cũ "tại đó... vượt" bị lệch 1 so với chính công thức `floor(...)` — ví dụ: worked example `quota_exhaustion_turn=13.044` cho `bundle_size_bytes(13.044)=10.485.200 ≤ 10.485.760` [VẪN vừa quota], còn `bundle_size_bytes(13.045)=10.486.000` mới thực sự vượt. KHÔNG dùng công thức này để gate cứng — Core Rule #4 mới là cơ chế enforce thật, độc lập với công thức lập kế hoạch này) |

**Phạm vi kết quả**: `bundle_size_bytes` **KHÔNG BỊ CHẶN** — tăng tuyến tính
O(world_time), đối lập trực tiếp với `ai_context_view_size_bound` (registry)
đã chứng minh phía prompt là O(1). Đây là điều **đúng theo thiết kế**: dữ
liệu thô không cần bị chặn (đó là việc của tầng lưu trữ), chỉ phần đưa vào
prompt AI mới cần bị chặn — công thức này định lượng chính xác "không bị
chặn" đó lớn tới đâu và khi nào thành vấn đề thực tế.
`quota_exhaustion_turn` hữu hạn với mọi `avg_turn_record_bytes > 0`.

**Ví dụ minh họa**: `fixed_blob_bytes = 50.000` byte (50 KB),
`avg_turn_record_bytes = 800` byte (narration_text ~300 ký tự tiếng Việt
UTF-8 ~600 byte + `locked_result` JSON ~150 byte + overhead ~50 byte),
`compression_ratio = 1` (chưa nén, MVP).

- `bundle_size_bytes(1.000) = 50.000 + 1.000×800×1 = 850.000` byte (~830 KB)
- `bundle_size_bytes(50.000) = 50.000 + 50.000×800 = 40.050.000` byte (~38,2 MB)

Với `quota_bytes = 10 MB = 10.485.760` byte (giả định minh họa mức thấp cho
mobile — **giá trị CHƯA xác minh**, `game-concept.md` Technical Risks chỉ
flag định tính "quota mobile thấp hơn desktop", chờ ADR đo thật):

`quota_exhaustion_turn = floor((10.485.760 − 50.000) / 800) = floor(13.044,7) = 13.044` lượt

Nếu sau này ADR chọn nén với `compression_ratio = 0,3` (ước tính điển hình
cho văn bản lossless, minh họa):

`quota_exhaustion_turn = floor(10.435.760 / (800×0,3)) = floor(43.482,3) = 43.482` lượt
(~3,3 lần dư địa so với không nén).

**Trường hợp biên**:
- **`avg_turn_record_bytes ≤ 0` HOẶC `compression_ratio ≤ 0`** (bổ sung
  2026-08-06, `/design-review` — `systems-designer`; giá trị đo thực
  nghiệm bị lỗi đo lường, VD mẫu đo rỗng hoặc khởi tạo sai — range đã
  khai `> 0`/`(0,1]` ở bảng biến KHÔNG tự động được thực thi bởi chính
  công thức): `quota_exhaustion_turn` KHÔNG ĐƯỢC tính bằng phép chia trực
  tiếp (tránh chia-cho-0 → `Infinity`/`NaN`) — coi là lỗi đo lường, trả
  về sentinel "chưa đo được" (cùng xử lý như trường hợp `quota_bytes`
  không đo được bên dưới), KHÔNG BAO GIỜ trả `Infinity` hay `NaN` ra
  UI/log.
- `compression_ratio` chưa chốt thuật toán (Core Rule #7, Open Question):
  mọi tính toán LẬP KẾ HOẠCH bắt buộc dùng `compression_ratio = 1` (kịch
  bản xấu nhất) làm mặc định an toàn — không được giả định
  `compression_ratio < 1` trước khi thuật toán nén thực sự được chọn và đo
  (tránh lập kế hoạch quota lạc quan sai).
- **`compression_ratio > 1` đo được** (bổ sung 2026-08-07, `/design-review`
  vòng 3, đóng gap `systems-designer`: cùng LỚP lỗ hổng biên đã vá cho
  `≤ 0` phía trên — GDD đã tự lập luận range khai `(0,1]` KHÔNG tự động
  được thực thi bởi chính công thức, nhưng biên TRÊN chưa được xử lý
  tương tự; hiện tượng có thật với payload nhỏ do overhead header của
  gzip/brotli, chưa thể loại trừ vì thuật toán nén còn là Open Question
  chưa chốt): nếu đo được `compression_ratio > 1`, dùng `1` thay cho giá
  trị đo được trong tính toán LẬP KẾ HOẠCH (đối xứng nguyên tắc "mặc định
  an toàn = 1" — nén không bao giờ được coi là làm TỆ HƠN trong ước tính,
  dù đo thực tế có phình payload nhỏ).
- **`quota_bytes ≤ fixed_blob_bytes` HOẶC `quota_bytes` không đo được/
  không đáng tin** (bổ sung 2026-08-05, đóng Open Question ban đầu;
  **hợp nhất 2026-08-06 vòng re-review tiếp theo**, `/design-review` —
  `systems-designer`, đóng mâu thuẫn nội bộ: bản trước có 2 bullet riêng
  biệt xử lý ĐỐI LẬP nhau cho cùng giá trị `quota_bytes=0` — 1 bullet coi
  là "cảnh báo nghiêm trọng, đáng tin"; 1 bullet liệt kê tường minh
  "Safari private mode trả về 0/lỗi" rồi coi là "không tính được", không
  có quy tắc phân định khi nào dùng bullet nào): CẢ 2 tình huống (quota
  đo được thật sự nhỏ hơn/bằng `fixed_blob_bytes`, LẪN quota không đo
  được/API trả sentinel lỗi/`undefined`/`NaN`) đều xử lý THỐNG NHẤT theo
  kịch bản XẤU NHẤT — `quota_exhaustion_turn = 0`, không âm, không throw
  (khớp range đã khai `[0, ∞)`; cùng nguyên tắc fail-safe đã áp dụng ở
  Formula #3 cho `quota_bytes_available ≤ 0`/không đo được →
  `warn_triggered=1` mặc định). Đây LUÔN là tín hiệu CẢNH BÁO nghiêm
  trọng cho người chơi/QA (dù nguyên nhân là quota thật sự cạn hay chỉ là
  không đo được đáng tin), không phải lỗi tính toán — công thức này chỉ
  là công cụ LẬP KẾ HOẠCH/giám sát, KHÔNG thay thế việc phát hiện
  thành-công/thất-bại thật của chính lần ghi atomic (Core Rule #4 vẫn là
  cơ chế enforce thực tế, độc lập với công thức này).
- `world_time = 0` (slot vừa tạo): `bundle_size_bytes(0) = fixed_blob_bytes`
  — Nhật ký đầy đủ rỗng, đúng ngay sau khi tạo slot, trước auto-save đầu
  tiên.
- Nhiều slot dùng CHUNG quota trình duyệt (không phải quota riêng từng
  slot): công thức này tính kích thước cho 1 SLOT; tổng thực tế cạnh tranh
  quota là `Σ bundle_size_bytes(slot_i)` qua mọi slot — hành vi chia sẻ
  quota đa-slot cụ thể vẫn là Open Question thuộc cùng ADR HTML5/IDBFS đã
  flag ở `game-concept.md`.
- Lượt bị Undo: KHÔNG được tính vào `world_time` (đúng
  `world_time_advancement`, registry) và record của nó chưa từng được ghi
  xuống ở checkpoint sau-Undo (bundle ghi sau Undoing phản ánh trạng thái
  ĐÃ ROLLBACK) — công thức đơn điệu không giảm, chỉ tăng theo `world_time`
  đã xác nhận thật sự.

---

**2. Điều Kiện Bundle Hoàn Chỉnh Trước Khi Ghi Atomic (Bundle Completeness Check)**

Công thức `bundle_completeness_check` được định nghĩa là:

`completeness_ratio(bundle) = (1/N) × Σ(s=1→N) ok(s)`

`is_complete(bundle) = 1 nếu (N ≥ 1) VÀ (Σ(s=1→N) ok(s) = N), ngược lại 0`
**(sửa 2026-08-06 vòng re-review tiếp theo, `/design-review` —
`systems-designer`: so sánh SỐ NGUYÊN trên tổng `ok(s)`, KHÔNG so sánh
`completeness_ratio(bundle) = 1` bằng dấu phẩy động — với `N` không phải
lũy thừa của 2 (VD `N=3`), `(1/N)×N` không đảm bảo ra đúng `1.0` tuyệt
đối do sai số làm tròn IEEE-754, có thể tạo false negative âm thầm chặn
nhầm 1 lượt hợp lệ dù mọi hệ đều OK. `completeness_ratio` VẪN giữ nguyên
vai trò số liệu CHẨN ĐOÁN/log (xem "Phạm vi kết quả" bên dưới), KHÔNG BAO
GIỜ dùng trực tiếp làm điều kiện gate. **Bổ sung guard `N ≥ 1` 2026-08-07
vòng re-review vòng 3**, đóng gap `systems-designer`: thiếu guard này,
tại `N=0` tổng RỖNG `Σ(s=1→0) ok(s) = 0` và `0 = N (=0)` là ĐÚNG theo
đúng công thức như viết trước đây → `is_complete` trả `1` — "bundle hoàn
chỉnh" = true khi KHÔNG hệ nào đăng ký cả, đúng loại vacuous-truth ở cực
trị. `commit_allowed` không bị ảnh hưởng nhờ có `AND (N ≥ 1)` riêng, NHƯNG
nếu bất kỳ log/diagnostic nào đọc trực tiếp `is_complete` thay vì
`commit_allowed`, sẽ thấy giá trị tự mâu thuẫn với `completeness_ratio`
= sentinel "không áp dụng" cho cùng 1 bundle rỗng — guard `N ≥ 1` ngay
trong định nghĩa `is_complete` đóng đúng lỗ hổng này, xem AC-36.)**

`commit_allowed(bundle) = is_complete(bundle) AND (N ≥ 1)`

với `ok(s) = 1` nếu `blob_status(s) = OK`, ngược lại `0`; `blob_status(s) ∈ {OK, MISSING, ERROR}`.

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Số hệ đã đăng ký cung cấp blob | N | int | ≥ 1 (0 = lỗi cấu hình) | Số hệ gốc đã đăng ký blob cho save bundle TẠI thời điểm ghi (Turn Manager, World Memory, Equipment & Skill Data hiện tại + hệ Feature khi được thiết kế — danh sách mở, Core Rule #2) |
| Một hệ đã đăng ký | s | system_id | ∈ {1..N} | 1 hệ gốc cụ thể trong tập hệ đã đăng ký |
| Trạng thái blob của hệ s | blob_status(s) | enum | {OK, MISSING, ERROR} | Kết quả hệ s trả về khi Persistence yêu cầu blob của nó |
| Hệ s có blob hợp lệ | ok(s) | bool | {0,1} | 1 nếu `blob_status(s) = OK` |
| Tỉ lệ hoàn chỉnh | completeness_ratio(bundle) | float | [0,1] | Tỉ lệ số hệ đã cung cấp blob hợp lệ trên tổng N |
| Bundle hoàn chỉnh | is_complete(bundle) | bool | {0,1} | 1 chỉ khi TẤT CẢ N hệ đều OK |
| Được phép ghi | commit_allowed(bundle) | bool | {0,1} | Điều kiện BẮT BUỘC trước khi Core Rule #3 (ghi atomic) được phép chạy |

**Phạm vi kết quả**: boolean, tất-cả-hoặc-không-gì — khớp trực tiếp Core
Rule #3. `completeness_ratio` là số liên tục [0,1] chỉ để CHẨN ĐOÁN
(log/debug khi ghi thất bại, biết chính xác bao nhiêu % hệ đã sẵn sàng),
bản thân nó KHÔNG phải điều kiện ghi — chỉ `is_complete = 1` (tức 100%)
mới cho phép ghi, không có "ghi một phần" theo tỉ lệ.

**Ví dụ minh họa**: `N = 3` (trạng thái thiết kế hiện tại: Turn Manager,
World Memory, Equipment & Skill Data — các hệ Feature khác chưa được thiết
kế nên chưa đăng ký). Lượt xác nhận, Persistence gọi blob của cả 3: Turn
Manager → OK, World Memory → OK, Equipment & Skill Data → ERROR (lỗi
serialize do 1 item trùng ID). `completeness_ratio = 2/3 ≈ 0,667` →
`is_complete = 0` → `commit_allowed = 0` → theo Core Rule #4: lượt bị
chặn, `world_time` không tăng, người chơi thấy báo lỗi rõ ràng, slot giữ
nguyên trạng thái hợp lệ gần nhất đã lưu.

**Trường hợp biên**:
- `N = 0` (chưa hệ nào đăng ký — không nên xảy ra sau khi tối thiểu Turn
  Manager đăng ký): `commit_allowed = 0` theo định nghĩa (`N ≥ 1` là điều
  kiện cứng) — đây là LỖI CẤU HÌNH, phải log riêng biệt với "1 hệ cụ thể
  MISSING blob", không phải "bundle hợp lệ nhưng rỗng". **Ràng buộc kiến
  trúc bổ sung** (bổ sung 2026-08-06, `/design-review` — `systems-designer`;
  đóng cùng dạng lỗ hổng chia-cho-0 mà Formula #1 đã đóng cho
  `avg_turn_record_bytes ≤ 0`/`compression_ratio ≤ 0`, KHÔNG được để sót
  ở đây): `completeness_ratio(bundle) = (1/N) × Σ ok(s)` KHÔNG ĐƯỢC tính
  bằng phép chia trực tiếp khi `N = 0` — implementation PHẢI kiểm tra
  `N ≥ 1` TRƯỚC KHI tính `completeness_ratio` (kể cả khi giá trị này chỉ
  dùng để log/chẩn đoán, không phải điều kiện ghi); nếu `N = 0`, BỎ QUA
  phép chia, gán `completeness_ratio` = sentinel "không áp dụng" (không
  phải `0` hay `NaN`/`Infinity`), và `commit_allowed = 0` được gán trực
  tiếp theo điều kiện cứng `N ≥ 1`, không suy ra từ `is_complete`.
- **Đăng ký blob TRÙNG hoặc hệ tự HỦY ĐĂNG KÝ giữa lúc đang gom bundle**
  (bổ sung 2026-08-06, `/design-review` — `systems-designer`): đăng ký
  PHẢI idempotent theo `system_id` — đăng ký trùng cùng `system_id`
  (VD bug double-init) KHÔNG được làm tăng `N`. `N` PHẢI được snapshot
  tại thời điểm BẮT ĐẦU gom bundle của 1 lượt và giữ NGUYÊN trong suốt
  quy trình đó — 1 hệ tự hủy đăng ký giữa chừng (crash, vô hiệu hóa) PHẢI
  được tính là `blob_status(s) = ERROR` cho lượt hiện tại, KHÔNG được
  loại khỏi `N` (tránh `completeness_ratio` bị tính sai bằng cách thu
  hẹp mẫu số thay vì phản ánh đúng lỗi thu thập — nếu không, `N` giảm
  cùng lúc với việc mất 1 blob khiến `completeness_ratio` vẫn ra 1 dù dữ
  liệu đã mất).
- Hệ đã đăng ký nhưng CHƯA CÓ nội dung áp dụng cho playthrough hiện tại
  (VD: Combat System đã đăng ký nhưng nhân vật chưa từng vào trận): hệ đó
  BẮT BUỘC trả về 1 blob rỗng/mặc định hợp lệ (`blob_status = OK`, nội
  dung "trạng thái khởi tạo"), KHÔNG được trả `MISSING` — "chưa có nội
  dung" và "không cung cấp được blob" là 2 trạng thái khác nhau; quyết
  định thế nào là "trạng thái khởi tạo hợp lệ" thuộc hệ sở hữu blob đó
  (Core Rule #2), không phải Persistence.
- Một hệ trả blob chậm/không phản hồi: công thức này giả định
  `blob_status(s)` đã có kết quả CUỐI CÙNG tại thời điểm tính — cơ chế
  timeout cụ thể cho bước thu thập blob (có cần một hằng số tương tự
  `ai_call_timeout_seconds` không) chưa được định nghĩa ở đây, cần đưa vào
  Open Questions.
- `N` tăng dần theo TIẾN ĐỘ PHÁT TRIỂN game (thêm hệ Feature mới được
  thiết kế), KHÔNG tăng theo `world_time` của 1 playthrough cụ thể — `N`
  cố định trong 1 phiên bản game đã release; thêm hệ mới chỉ ảnh hưởng
  bundle của các lượt xác nhận SAU khi hệ đó được tích hợp, không hồi tố
  bundle cũ (khớp Core Rule #8 — bundle cũ với `N` nhỏ hơn vẫn hợp lệ đúng
  `schema_version` của nó).

---

**3. Tỉ Lệ Sử Dụng Quota Thực Tế & Ngưỡng Cảnh Báo (Quota Utilization & Warning Trigger)**

**Định nghĩa lại phạm vi 2026-08-07** (`/design-review` vòng 3, đóng gap
`systems-designer`, đã xác nhận bằng `creative-director`: bản trước để
`measured_bundle_bytes(slot)` — phạm vi 1 SLOT — chia cho
`quota_bytes_available` — mô tả "CÒN khả dụng", đọc tự nhiên là "quota
TRỪ usage". Đây KHÔNG chỉ là chuyện đặt tên: pseudocode chạy trơn tru và
trả kết quả SAI theo hướng nguy hiểm — ví dụ số cụ thể: origin gần cạn
quota thật (tổng usage mọi slot = 9.900.000/10.485.760 byte), 1 slot nhỏ
`measured_bundle_bytes = 500.000` byte → nếu `quota_bytes_available` đọc
là "tổng origin" (10.485.760), `utilization_ratio ≈ 0,048` → KHÔNG cảnh
báo, đúng lúc origin chỉ còn <6% chỗ trống. Formula #1 đã tự xác nhận ở
Trường hợp biên của nó rằng nhiều slot dùng CHUNG 1 quota trình duyệt
(`Σ bundle_size_bytes(slot_i)`) — để cảnh báo có Ý NGHĨA THẬT, công thức
#3 PHẢI đo áp lực trên TOÀN BỘ origin, không phải trên 1 slot đơn lẻ.)*

Công thức `quota_utilization_warning` được định nghĩa lại ở phạm vi
**origin** (không còn phạm vi 1 slot):

`utilization_ratio(origin) = measured_total_bytes(origin) / quota_bytes_total(origin)`

`warn_triggered(origin) = 1 nếu utilization_ratio(origin) ≥ quota_warn_threshold, ngược lại 0`

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Tổng byte đo THẬT của TOÀN BỘ slot | measured_total_bytes(origin) | float | ≥ 0 | Tổng byte thực đo được của MỌI slot thuộc origin này CỘNG LẠI, đo NGAY SAU 1 lần ghi atomic THÀNH CÔNG bất kỳ (của bất kỳ slot nào) — cùng phạm vi Σ mà Formula #1's edge case "nhiều slot dùng chung quota" đã mô tả; khác Công thức #1 (đây là số đo thật, không phải ước tính lập kế hoạch) |
| Tổng quota khả dụng của origin | quota_bytes_total(origin) | float | ≥ 0 | TỔNG dung lượng khả dụng cho TOÀN BỘ origin (trình duyệt/site), đo qua API trình duyệt — CÙNG NGỮ NGHĨA với `quota_bytes` của Formula #1 (tổng, KHÔNG PHẢI "còn lại sau khi trừ usage") — API cụ thể là Open Question/ADR |
| Ngưỡng cảnh báo | quota_warn_threshold | float | (0,1) (tuning knob) | Tỉ lệ sử dụng quota tại đó hệ thống cảnh báo sớm người chơi, TRƯỚC khi thực sự ghi thất bại (Core Rule #4) |
| Tỉ lệ sử dụng | utilization_ratio(origin) | float | [0, ∞) lý thuyết, thực tế thường [0,1] | `measured_total_bytes` chia `quota_bytes_total` |
| Cảnh báo được kích hoạt | warn_triggered(origin) | bool | {0,1} | 1 nếu đã tới/vượt ngưỡng cảnh báo — áp dụng cho TOÀN BỘ origin, không riêng slot đang mở |

**Phạm vi kết quả**: `utilization_ratio` không bị chặn trên về mặt lý
thuyết (xem trường hợp biên `>1`), bị chặn dưới ở 0; `warn_triggered` là
boolean. Công thức này là cặp GIÁM SÁT THỰC TẾ bổ sung cho Công thức #1
(ước tính LẬP KẾ HOẠCH trước khi có dữ liệu) — #1 trả lời "dự kiến sẽ chạm
quota ở world_time nào" (cho 1 slot cụ thể, dùng `compression_ratio=1`
mặc định an toàn), #3 trả lời "NGAY BÂY GIỜ origin đã gần chạm quota
chưa" (đo thật, có thể đã nén). **Ghi chú tránh hiểu nhầm** (bổ sung
2026-08-07, đóng gap `systems-designer`): #1 và #3 SẼ LUÔN chênh nhau
đáng kể theo thời gian — đây là CHỦ Ý, không phải mâu thuẫn cần điều tra:
#1 bắt buộc dùng `compression_ratio=1` kể cả sau khi thuật toán nén thật
đã chọn, còn #3 luôn dùng số đo thật (có thể đã nén). Không viết test
"diff F1 vs F3 phải khớp" — không hợp lệ.

**Ví dụ minh họa** (đọc lại theo phạm vi origin): `quota_warn_threshold =
0,85` (cảnh báo khi đã dùng 85% quota). Origin có `measured_total_bytes =
9.000.000` byte (tổng mọi slot cộng lại), `quota_bytes_total =
10.485.760` byte (10 MB) → `utilization_ratio = 9.000.000 / 10.485.760 ≈
0,858 ≥ 0,85` → `warn_triggered = 1` → UI hiển thị cảnh báo mức ĐỘ ORIGIN
("Trình duyệt sắp hết chỗ chứa") TRƯỚC khi lần ghi tiếp theo (của BẤT KỲ
slot nào chia sẻ origin này) có nguy cơ thất bại thật.

**Trường hợp biên**:
- **`quota_bytes_total(origin) ≤ 0`** (sửa 2026-08-06, `/design-review` —
  `systems-designer`; trước đây chỉ bắt `= 0`, BỎ SÓT giá trị ÂM — một số
  API trình duyệt dùng số âm làm sentinel lỗi, không chỉ riêng `0`) HOẶC
  không đo được / không phải số hữu hạn (API không hỗ trợ, Safari private
  mode, `NaN`/`undefined`): `utilization_ratio` KHÔNG được tính bằng phép
  chia trực tiếp — fallback: `warn_triggered = 1` MẶC ĐỊNH (giả định xấu
  nhất khi không chắc chắn dung lượng còn lại), không chia cho số ≤ 0,
  và quan trọng nhất: KHÔNG để một giá trị âm bị hiểu ngầm thành "tỉ lệ
  sử dụng âm → an toàn, không cần cảnh báo" — trước bản sửa này đây chính
  là lỗ hổng đảo ngược hoàn toàn ý định "giả định xấu nhất" của công
  thức.
- `utilization_ratio > 1` (lần ghi gần nhất đã vượt quota nhưng trình
  duyệt tạm thời cho ghi trước khi đồng bộ thất bại — theo rủi ro
  Emscripten IDBFS đã flag ở `game-concept.md`): đây là dấu hiệu Core Rule
  #4 sắp/đã kích hoạt ở lần ghi tiếp theo; `warn_triggered` vẫn = 1 bình
  thường, không cần xử lý đặc biệt cho trường hợp `>1`.
- `quota_warn_threshold` không nên đặt quá sát 1,0: nếu quá sát, cảnh báo
  có thể đến CÙNG LƯỢT với lần ghi thất bại thực sự, không cho người chơi
  thời gian phản ứng (VD: "Chép lại quyển sổ" — Core Rule #9b — hoặc dọn
  slot khác trước khi mất dữ liệu) — khuyến nghị safe range ở Tuning
  Knobs, VD 0,7–0,9.
- Formula này chỉ dùng số đo của LẦN GHI GẦN NHẤT (không tự dự đoán tương
  lai) — nếu người chơi không chơi tiếp (đóng trình duyệt), `warn_triggered`
  không tự cập nhật cho tới lần ghi kế tiếp (của BẤT KỲ slot nào thuộc
  origin); đây không phải giám sát nền liên tục, chỉ đánh giá lại mỗi
  checkpoint auto-save (Core Rule #1).

## Edge Cases

*(Lean mode: không bắt buộc spawn specialist cho section này — chỉ D và H.
Đối chiếu Edge Cases của `turn-manager.md` và
`world-memory-context-management.md` để đảm bảo nhất quán 2 chiều.)*

- **Nếu trình duyệt bị đóng/OS kill giữa lúc 1 lần ghi atomic đang chạy
  (chưa commit xong)**: lần load kế tiếp phải thấy đúng trạng thái TRƯỚC
  lần ghi đó — write chưa commit không được coi là đã xảy ra (Core Rule
  #3 đảm bảo tính chất này ở mức thiết kế; cơ chế kỹ thuật cụ thể để
  enforce là ADR).
- **Nếu người chơi mở CÙNG 1 slot ở 2 tab trình duyệt đồng thời**: chỉ
  tab mở slot đó ĐẦU TIÊN được phép ghi; tab thứ 2 phát hiện xung đột
  (slot đã bị khóa bởi phiên khác) và bị chặn thao tác (read-only tạm
  thời) kèm thông báo rõ ràng — tránh 2 lần ghi atomic race nhau ghi đè
  lẫn nhau trên cùng 1 slot.
- **Nếu người chơi xóa thủ công 1 slot đã khép (read-only) từ màn hình
  chọn slot**: cho phép xóa để giải phóng quota, nhưng bắt buộc 1 bước
  xác nhận ESCALATED riêng — **sửa 2026-08-06** (`/design-review`, đóng
  gap `qa-lead`/`game-designer`: friction cũ "1 bước xác nhận" không
  tương xứng việc xóa TOÀN BỘ 1 playthrough hoàn chỉnh, đại diện chính
  khái niệm "Hệ Quả Thực Sự" mà GDD này tồn tại để bảo vệ): người chơi
  phải GÕ LẠI đúng tên nhân vật của slot đó (không phải chỉ bấm 1 nút xác
  nhận) — nêu rõ "không thể khôi phục". Khác hẳn Undo (giới hạn 1 lượt
  gần nhất), đây là xóa vĩnh viễn toàn bộ playthrough. **Chuẩn hóa chuỗi
  bắt buộc** (bổ sung 2026-08-06 vòng re-review tiếp theo, `/design-review`
  — đóng gap `ux-designer`: rủi ro cụ thể với IME tiếng Việt trên Mobile
  Web, bàn phím ảo có thể sinh tổ hợp Unicode dấu-rời (NFD) khác byte-for-
  byte so với tên lưu trong hệ thống dù hiển thị giống hệt bằng mắt):
  chuỗi gõ vào và tên nhân vật lưu trữ PHẢI được chuẩn hóa về **Unicode
  NFC**, **trim khoảng trắng 2 đầu**, và so khớp **KHÔNG phân biệt hoa/
  thường** trước khi so sánh — case không mang thêm tín hiệu "cố ý/chú
  tâm" nào (mục đích của việc gõ lại là buộc đọc và xác nhận đúng tên,
  không phải kiểm tra trí nhớ hoa/thường); case-sensitive chỉ tạo friction
  ngẫu nhiên từ auto-capitalize của bàn phím ảo.
  - **Nếu tên nhân vật SAU chuẩn hóa (NFC + trim) là chuỗi RỖNG** (bổ
    sung 2026-08-07, `/design-review` vòng 3, đóng gap `ux-designer`:
    trước bản sửa này, "gõ lại tên để xác nhận" với 1 tên rỗng/toàn
    khoảng trắng suy biến thành "bấm Enter với ô trống" — toàn bộ
    friction bảo vệ Pillar 2 biến mất ÂM THẦM, không có cách nào phát
    hiện): dùng 1 chuỗi xác nhận THAY THẾ cố định, KHÔNG phụ thuộc tên —
    người chơi phải gõ đúng literal **"XÁC NHẬN"** (không dấu, chuẩn hóa
    NFC/trim/case-insensitive như bình thường) thay cho tên trống. Điều
    kiện kích hoạt nhánh này: tên nhân vật lưu trữ, sau khi tự nó qua
    NFC+trim, là chuỗi độ dài 0.
- **Nếu người chơi xóa thủ công 1 slot ĐANG CHƠI DỞ (chưa có lượt
  `is_death_turn=true`) từ màn hình chọn slot** (bổ sung 2026-08-06,
  `/design-review` — đóng gap `qa-lead`: UI Requirements đã cho phép hành
  động này nhưng trước đây không Edge Case/AC nào bao phủ): cho phép xóa,
  dùng quy trình xác nhận 1-bước THƯỜNG (KHÔNG escalate gõ tên nhân vật
  như slot đã khép — playthrough đang dang dở chưa "khép lại" một hệ quả
  hoàn chỉnh theo đúng nghĩa Player Fantasy của GDD này, nên mức trọng
  lượng thấp hơn). Không cần "khóa" slot trước khi xóa — xóa thẳng, đọc
  lại `slot_id` đó ngay sau đó trả về "không tồn tại", giống hệt kết quả
  cuối của việc xóa slot đã khép.
- **Nếu load 1 slot có `schema_version` KHÁC bản hiện tại của game** (cũ
  hơn HOẶC mới hơn — VD: chơi trên máy khác có bản mới rồi quay lại máy
  cũ): từ chối load theo Core Rule #8 trong cả 2 chiều, thông báo rõ
  "save này không tương thích với phiên bản game hiện tại" — không cố
  đoán/migrate ngầm dù là cũ hơn hay mới hơn.
- **Nếu `bundle_completeness_check` (Công thức #2) thất bại NHIỀU lượt
  liên tiếp** (1 hệ bị lỗi dai dẳng, VD: bug serialize ở 1 hệ Feature):
  người chơi không được kẹt vĩnh viễn ở slot đó — hệ thống vẫn cho phép
  thoát ra màn hình chọn slot (không thao tác gì thêm trong slot lỗi) và
  tạo slot mới hoặc mở slot khác; QA export (Core Rule #9) vẫn hoạt động
  trên dữ liệu ĐÃ commit gần nhất của slot lỗi để phục vụ báo lỗi.
- **Nếu ghi thất bại ngay từ LƯỢT ĐẦU TIÊN của 1 slot mới** (VD: Safari
  private mode không hỗ trợ lưu trữ bền vững — rủi ro đã biết ở
  `game-concept.md`): thông báo cho người chơi phân biệt rõ đây là
  **hạn chế của trình duyệt/chế độ duyệt web**, không phải lỗi game —
  khác nội dung thông báo với trường hợp hết quota thông thường (Core
  Rule #4).
- **Nếu 1 slot từng ghi thành công trước đó nay đọc lại KHÔNG thành
  công, KHÔNG do bất kỳ lần ghi chủ động nào đang chạy** (bổ sung
  2026-08-06, `/design-review` — `godot-specialist`; VD trình duyệt tự
  xóa lưu trữ ngoài kiểm soát app — Safari ITP xóa IndexedDB sau ~7
  ngày không tương tác, rủi ro HIGH đã biết ở `game-concept.md`): đây
  KHÔNG phải `WRITE_FAILED_*` (không có lần ghi nào đang chạy) và KHÔNG
  phải `LOAD_REJECTED_VERSION_MISMATCH` (không đọc được nội dung nào cả
  để so `schema_version`) — trả `error_code = LOAD_FAILED_UNREADABLE`
  (xem Error Taxonomy); slot vẫn hiển thị trong danh sách Save Slot
  Screen (KHÔNG tự động biến mất khỏi danh sách), được đánh dấu rõ
  "không đọc được" thay vì hiển thị dữ liệu cũ/giả hoặc bị ẩn đi; người
  chơi có thể xóa slot này qua đúng quy trình xóa 2 bước đã định nghĩa
  ở trên để dọn khỏi danh sách, nhưng hệ thống không tự ý xóa.
- **Nếu ghi atomic thất bại do nguyên nhân PERSISTENT (`WRITE_FAILED_QUOTA`/
  `WRITE_FAILED_UNSUPPORTED`) và người chơi gửi lại ĐÚNG hành động vừa bị
  chặn** (bổ sung 2026-08-06 vòng re-review tiếp theo, `/design-review` —
  đóng gap `game-designer`: nguyên nhân gốc của 2 mã lỗi này KHÔNG tự
  biến mất giữa các lần thử — Formula #1 tự chứng minh
  `quota_exhaustion_turn` hữu hạn với MỌI playthrough đủ dài, đây là số
  phận tất định, không phải edge case hiếm): Persistence giữ lại
  (`pending_write_cache`) `locked_result`/`narration_text` ĐÃ TÍNH của
  lần Resolving/Undoing vừa thất bại; nếu Turn Manager gửi lại ĐÚNG cùng
  bundle nội dung ngay lần retry kế tiếp (không phải hành động mới),
  Persistence CHỈ retry bước GHI, KHÔNG yêu cầu Turn Manager gọi lại AI
  tường thuật — tránh đốt thêm 1 AI call thật (tốn tiền) cho MỖI lần thử
  khi nguyên nhân gốc không đổi. `pending_write_cache` bị xóa ngay khi:
  (a) ghi retry thành công, (b) người chơi gửi 1 hành động KHÁC (không
  phải retry đúng bundle cũ), hoặc (c) người chơi rời khỏi slot (về Save
  Slot Screen). Sau `max_write_retry_before_escalation` (Tuning Knob)
  lần retry-chỉ-ghi liên tiếp thất bại vẫn cùng `error_code`, banner lỗi
  (UI Requirements) PHẢI thêm 1 nút điều hướng TRỰC TIẾP sang Save Slot
  Screen (không chỉ gợi ý bằng văn bản) — chặn cứng việc gửi thêm hành
  động mới cho tới khi người chơi rời slot hoặc dọn quota.
- **Nếu QA export (Core Rule #9) được gọi trong khi 1 lần ghi atomic
  khác đang chạy**: export luôn đọc từ bản đã **commit gần nhất**, không
  bao giờ đọc trạng thái ghi dở — nhất quán với tính atomic của Core Rule
  #3, không cần cơ chế khóa riêng vì đọc chỉ xảy ra sau khi ghi atomic
  hoàn tất hoặc thất bại rõ ràng.
- **Nếu người chơi chọn "Chơi lại" trong khi đang XEM một slot đã khép
  khác (không phải slot vừa chết)**: tạo slot mới hoàn toàn độc lập,
  không liên quan đến slot đang xem — thao tác "Chơi lại" luôn gắn với
  playthrough VỪA kết thúc bằng cái chết thật, không phải slot đang được
  duyệt xem trên UI.
- **Nếu Nhật ký đầy đủ của World Memory rỗng ở lần ghi đầu tiên**
  (`world_time=0`, chưa có turn record nào): Công thức #1
  (`bundle_size_bytes(0) = fixed_blob_bytes`) vẫn áp dụng bình thường,
  atomic write vẫn chạy đúng quy trình — không có "bỏ qua ghi lần đầu vì
  chưa có gì".
- **Nếu `avg_turn_record_bytes` (Công thức #1) và
  `quota_bytes_available` (Công thức #3) chưa từng đo được** (bản build
  đầu tiên, chưa qua playtest thật): các công thức này KHÔNG chặn việc
  ghi/load hoạt động — chúng chỉ phục vụ lập kế hoạch/cảnh báo (Open
  Questions sẽ nêu rõ cần đo thực nghiệm sau khi có bản build đầu tiên,
  giống Open Question tương tự của `world-memory-context-management.md`
  về `avg_turn_tokens`).

## Dependencies

*(Đối chiếu 2 chiều với các GDD đã tồn tại — phát hiện 1 khoảng trống
giống 4 lần trước trong phiên này, xem ghi chú cuối.)*

**Phụ thuộc vào (upstream)**:
- **Turn Manager** (Foundation, Approved) — **hard dependency**: toàn bộ
  mô hình trigger của Persistence (2 checkpoint auto-save, Core Rule #1)
  không tồn tại nếu không có Turn Manager gọi ghi atomic ở đúng 2 điểm
  (cuối Resolving, cuối Undoing — **sửa 2026-08-06**: write-ahead, GATE
  trước khi vào Turn Confirmed/Awaiting Action, không phải phản ứng sau
  đó).

**Các hệ thống phụ thuộc vào Persistence** (downstream), kèm giao diện dữ
liệu cụ thể:
- **Turn Manager** (Foundation, Approved) — **hard, 2 chiều** (cũng là
  upstream ở trên): đọc/ghi `state`, `last_confirmed_turn_id`,
  `undo_available`, `turn_snapshot` (blob đối) mỗi lần save/load.
- **World Memory & Context Management** (Core, Designed) — **hard**:
  đọc/ghi Nhật ký tường thuật đầy đủ (bắt buộc theo MVP Required #5 của
  `game-concept.md`); Khung ngữ cảnh AI có thể cache tùy chọn (soft, tái
  tạo được).
- **Equipment & Skill Data System** (Foundation, Approved) — **hard**:
  blob đối chứa `known_skill_ids`, trang bị sở hữu/đang mặc.
- **NPC Affinity & Relationship, Combat System, EXP & Realm Progression,
  Death & Consequence, Setting & Canon Integration, Situation/Encounter
  Generation** (đã Designed — bổ sung Situation/Encounter Generation
  2026-08-06, `/design-review`, xem Interactions) — **hard (hệ đó đã
  Designed)**: mỗi hệ sẽ đăng ký blob riêng qua interface mở của
  Persistence (Core Rule #2); tới khi đó Công thức #2 (`N` = số hệ đã
  đăng ký) không tính các hệ này.
- **Death & Consequence** (Approved) — **hard**: kích hoạt trực tiếp
  thao tác "Khóa slot" tại Nhánh A bước c, NGAY khi chết thật xác nhận
  (**sửa lại 2026-08-09**, `/design-review character-continuation.md`
  round 1 — đảo ngược sửa 2026-08-05: chờ tới lúc người chơi chọn "Chơi
  lại" mới khóa slot khiến slot "đang chơi dở" suốt thời gian
  `Awaiting Continuation Choice`, không có lối thoát nếu đóng tab giữa
  chừng; xem `death-and-consequence.md` Nhánh A bước c).
- **Character Continuation** (đã Designed) — **hard**: kích hoạt trực
  tiếp thao tác "Tạo slot mới" (CHỈ thao tác này, KHÔNG còn "Khóa slot")
  khi người chơi chọn "Chơi lại" (Core Rule #1/#5 của
  `character-continuation.md`) — đóng gap một chiều đã ghi nhận ở
  `systems-index.md`.
- **Character Card & Identity** (Presentation, đã Designed) — **hard**
  (bổ sung 2026-08-05, cụm E `/design-review` gộp 11 GDD): Persistence
  sở hữu blob **Entity Record** — hồ sơ nhân vật thường trực (`base_X0`,
  `npc_tag`, `concealment` instance, hồ sơ Character Card) — Character
  Card đọc/ghi qua blob này, opaque với Persistence (không parse nội
  dung, giống mọi blob đối khác ở Core Rule #2). Đóng khoảng trống kiến
  trúc "entity record ở đâu" mà `world-memory-context-management.md` và
  `character-card-identity.md` từng để either/or.
- **Core UI/Screen Navigation** (sửa 2026-08-06, `/design-review` —
  trước đây ghi nhầm "chưa thiết kế", hệ này đã **Approved**) — **soft**:
  cung cấp màn hình chọn slot; logic save/load cốt lõi của Persistence
  hoạt động độc lập, test được mà không cần UI này tồn tại. Xem cũng
  UI Requirements — chrome/layout chi tiết do `core-ui-screen-navigation.md`
  sở hữu.

*(Khoảng trống phụ thuộc một chiều phát hiện: `equipment-skill-data-system.md`
— đã Approved — không hề nhắc đến Persistence/Save System trong
Dependencies của chính nó, dù Persistence GDD này liệt kê nó là 1
downstream hard dependency. Cùng dạng với 4 khoảng trống đã gặp trước
trong phiên này (Turn Manager ↔ Contract Enforcement/AI Integration/World
Memory) — sẽ xử lý bằng footnote ở `systems-index.md` thay vì sửa lại GDD
đã Approved, xem Open Questions.)*

## Tuning Knobs

| Knob | Default | Safe Range | Ảnh hưởng nếu chỉnh |
|---|---|---|---|
| `quota_warn_threshold` | 0,85 | 0,7–0,9 | Tỉ lệ sử dụng quota (Công thức #3) tại đó hệ thống cảnh báo sớm người chơi trước khi ghi thật sự thất bại. Quá thấp (<0,7) → cảnh báo giả quá sớm, gây phiền; quá cao (>0,9) → cảnh báo có thể đến cùng lượt với lần ghi thất bại thật, không cho người chơi đủ thời gian phản ứng (VD: export QA log hoặc dọn slot khác). |
| `max_perceived_autosave_latency_ms` | 150 | 100–300 | **(bổ sung 2026-08-06, `/design-review`; sửa 2026-08-06 vòng re-review tiếp theo)** Ngân sách độ trễ CẢM NHẬN ĐƯỢC tối đa cho 1 lần ghi atomic THÔNG THƯỜNG (Core Rule #1, chi phí `durability_confirmed` của phần append-only turn record — không còn đo trên TOÀN BỘ bundle mỗi lượt, vì Core Rule #3 nay cam kết chiến lược append-only làm mặc định, không phải phương án dự phòng) trước khi người chơi có thể nhận ra lượt bị "khựng" — bảo vệ trực tiếp Player Fantasy "không làm gián đoạn tường thuật". ADR PHẢI đo `durability_confirmed` thực tế END-TO-END (gồm cả bước gom N blob liên quan + serialize + mọi bước đồng bộ bền vững của backend đã chọn) cho ĐÚNG phần append-only, và đo RIÊNG chi phí full-bundle flush định kỳ (không bị ràng buộc bởi ngân sách này — flush định kỳ chạy ngoài critical path của 1 lượt). Quá thấp (<100ms) → ép ADR vào giải pháp phức tạp không cần thiết; quá cao (>300ms) → phá vỡ chính nhịp điệu mà hệ này cam kết bảo vệ. |

| `max_write_retry_before_escalation` | 3 | 1–5 | **(bổ sung 2026-08-06 vòng re-review tiếp theo)** Số lần retry-chỉ-ghi liên tiếp thất bại cùng `error_code` PERSISTENT (`WRITE_FAILED_QUOTA`/`WRITE_FAILED_UNSUPPORTED`, xem Edge Cases) trước khi banner lỗi thêm nút điều hướng trực tiếp sang Save Slot Screen và chặn gửi hành động mới. Quá thấp (<1) → escalate ngay từ lần đầu, không cho người chơi cơ hội thử tự nhiên (VD lag thoáng qua bị nhầm là quota); quá cao (>5) → người chơi có thể bị kẹt nhiều vòng thử vô ích trước khi được hướng dẫn rõ ràng. |

*(`fixed_blob_bytes`, `avg_turn_record_bytes`, `compression_ratio`,
`quota_bytes`/`quota_bytes_available` trong Formulas #1 và #3 KHÔNG phải
tuning knob — là giá trị ĐO THỰC NGHIỆM hoặc do trình duyệt báo về, không
phải giá trị designer chỉnh tay, cùng cách xử lý
`avg_turn_tokens`/`avg_fact_tokens` đã áp dụng ở
`world-memory-context-management.md`.)*

*(`schema_version` cũng không phải tuning knob — là giá trị kỹ thuật gắn
với từng bản release của game, không phải tham số cân bằng.)*

## Visual/Audio Requirements

Màn hình chọn slot áp dụng đúng Visual Identity Anchor "Mực Chưa Khô"
(`game-concept.md`) — nhưng chrome/hình khối cụ thể của từng slot (gáy
sách, bìa, dấu ấn phân biệt trạng thái) **hoàn toàn thuộc sở hữu**
`core-ui-screen-navigation.md` §4/§10, GDD này chỉ đặc tả nội dung/data
contract theo trạng thái: **sửa 2026-08-06 vòng re-review tiếp theo**
(`/design-review` — `ux-designer`, đóng MÂU THUẪN TRỰC TIẾP: bản trước
viết "gáy sách phác họa bằng nét mực loang" — SAI, `core-ui-screen-navigation.md`
§4 quy định tường minh NGƯỢC LẠI: "Cố tình HÌNH HỌC/thẳng nét — đối lập
khung mực loang hữu cơ của Card, tránh nhầm lẫn bề mặt". **Phán quyết
`creative-director`**: core-ui thắng — một chữ ký thị giác chỉ là chữ ký
khi nó độc quyền 1 bề mặt; mực loang thuộc về Character Card. Player
Fantasy "quyển nhật ký" của hệ này được mang bởi NGÔN NGỮ/TRẠNG THÁI —
"trang đang mở"/"bìa đóng kín"/"Chép lại quyển sổ" — không bởi đường
viền):
- Slot đang chơi dở: trạng thái "đang mở" (còn ghi tiếp được).
- Slot đã khép (kết thúc bằng cái chết thật): trạng thái "đã khép"
  (read-only) — phải phân biệt được bằng cả tương phản/hình khối (không
  chỉ 1 chi tiết nhỏ), đúng accessibility requirement đã có ở
  `core-ui-screen-navigation.md` §4/§10 (desaturation toàn bộ gáy sách +
  bìa phẳng).
- Slot không đọc được (`LOAD_FAILED_UNREADABLE`): trạng thái riêng biệt
  thứ 3 — xem UI Requirements.

**Tín hiệu "đang ghi"** (bổ sung 2026-08-06, `/design-review` — quyết
định user sau khi `game-designer`/`ux-designer` độc lập chỉ ra thiếu tín
hiệu xác nhận "đã lưu an toàn" đe dọa Pillar 2; **viết lại 2026-08-06
vòng re-review tiếp theo**, đóng mâu thuẫn hội tụ 3 specialist: bản trước
biện minh cho tín hiệu này bằng "khoảng lệch giữa Turn Confirmed hiển thị
và dữ liệu bền vững thật" — cùng lúc Core Rule #1 tuyên bố khoảng lệch đó
KHÔNG CÒN TỒN TẠI. Dưới posture CHẶT đã cam kết ở Core Rule #3,
`durability_confirmed` LÀ điều kiện gate — không có khoảng lệch nào ở
tầng HỢP ĐỒNG. Vai trò thật của tín hiệu này: hiển thị TRUNG THỰC trạng
thái "đang trong quá trình xác nhận bền vững" — 1 khoảng thời gian THI
HÀNH bình thường (vài chục–vài trăm ms) luôn tồn tại giữa lúc bắt đầu ghi
và lúc `durability_confirmed` fire, không phải 1 lỗ hổng thiết kế cần
vá): auto-save (Core Rule #1) có 1 dấu hiệu THỤ ĐỘNG rất nhẹ, diegetic,
KHÔNG phải thông báo/sự kiện — 1 nét mực nhỏ (VD cạnh khung nhập hành
động) giữ trạng thái "còn ướt" trong khi lần ghi atomic đang chạy, và
"khô lại" (trở về trạng thái tĩnh bình thường) ĐÚNG khi
`durability_confirmed = true` (Core Rule #3) — cùng chính xác 1 thời
điểm với gate Turn Confirmed/Awaiting Action, không phải 2 ngưỡng khác
nhau. Đây KHÔNG phải VFX/animation gây chú ý, không cần dismiss, không
phá nhịp lượt — chỉ là 1 trạng thái hình ảnh tĩnh chuyển đổi. Bắt buộc ở
MVP (khác hiệu ứng gợn mực ở dưới, vẫn optional) vì đây là tín hiệu phản
hồi tức thời duy nhất cho khoảng thời gian thi hành hoàn toàn bình thường
giữa "bắt đầu ghi" và "bền vững xác nhận" — không phải lưới an toàn cho 1
lỗ hổng, mà là phản hồi trung thực cho 1 độ trễ thi hành có thật (đặc
biệt quan trọng nếu ADR chọn phương án cần `syncfs()` bất đồng bộ).

Có thể dùng 1 hiệu ứng rất nhẹ (gợn mực lan nhẹ) khi 1 slot chuyển từ
"đang chơi" sang "đã khép" ngay sau cái chết thật, nếu ngân sách polish
cho phép — không bắt buộc ở MVP, cùng mức độ ưu tiên với hiệu ứng lật
trang tùy chọn đã nêu ở `world-memory-context-management.md`.

## UI Requirements

**Màn hình chọn slot lưu (Save Slot Screen)**: màn hình đầu tiên người
chơi thấy khi mở game, liệt kê mọi slot đã tồn tại — không giới hạn số
lượng hiển thị (Core Rule #5: không giới hạn cứng số slot). **Sửa
2026-08-06** (`/design-review` — `ux-designer`: dòng cũ "cần cuộn/
lazy-load nếu số slot lớn, cùng yêu cầu hiệu năng như màn hình Story
Log" đã bị xóa — tự mâu thuẫn với disclaimer ngay bên dưới rằng GDD này
không lặp lại layout, và phép so sánh với Story Log D.3 không thực sự
tương đương ở mức chi tiết: Story Log có công thức/tuning knob/eviction
rule riêng, còn Save Slot Screen ở `core-ui-screen-navigation.md` hiện
chỉ có 1 dòng ẩn dụ "cùng tinh thần D.3", không có window size/eviction
rule riêng — xem Open Questions): cơ chế hiển thị danh sách dài (cuộn/
virtualize/phân trang) HOÀN TOÀN thuộc `core-ui-screen-navigation.md`,
GDD này chỉ khai số lượng có thể không giới hạn, không đặc tả cách hiển
thị. Mỗi slot hiển thị tối thiểu: tên nhân vật, cảnh giới hiện tại,
`world_time` (số lượt đã chơi), trạng thái (đang chơi dở / đã khép /
không đọc được — bổ sung 2026-08-06), và thời điểm lưu gần nhất (trừ
trạng thái "không đọc được", không có gì để hiển thị). Hành động khả
dụng theo trạng thái slot:
- Slot đang chơi dở: "Tiếp tục" (load), "Chép lại quyển sổ" (**sửa
  2026-08-07 vòng re-review vòng 3** — nay là artifact 9b: bản văn bản
  đọc được bằng tiếng Việt, KHÔNG PHẢI JSON — Core Rule #9b; artifact 9a
  JSON kỹ thuật là công cụ QA riêng, không nhất thiết hiện trên màn hình
  này), "Xóa" (yêu cầu xác nhận riêng — Edge Case tương ứng; **bổ sung
  2026-08-06**: dùng đúng quy trình xác nhận 1-bước hiện có, KHÔNG
  escalate như slot đã khép — xem Edge Case mới); **thêm 2026-08-07**:
  nếu đang trong trạng thái escalation do ghi thất bại persistent (Core
  Rule #10), có thêm hành động "Khép quyển sổ này lại" (xem Core Rule
  #10 + Edge Cases).
- Slot đã khép (`slot_closure_reason ∈ {death, quota_exhausted}` —
  **bổ sung 2026-08-07**, xem Core Rule #10): "Xem lại" (mở read-only,
  dẫn thẳng vào màn hình Story Log của World Memory ở chế độ chỉ đọc),
  "Chép lại quyển sổ" (như trên, artifact 9b), "Xóa" (yêu cầu xác nhận
  riêng; **escalate 2026-08-06**: KHÁC quy trình xác nhận thường — yêu
  cầu người chơi gõ lại ĐÚNG tên nhân vật của slot đó để xác nhận, thay
  vì chỉ 1 nút bấm xác nhận đơn — tương xứng trọng lượng của việc xóa
  vĩnh viễn 1 playthrough hoàn chỉnh, đúng tinh thần "Hệ Quả Thực Sự";
  xem Edge Case đã sửa tương ứng). Chrome/hiển thị PHÂN BIỆT 2 nguyên
  nhân khép (`death` vs `quota_exhausted`) do `core-ui-screen-navigation.md`
  §4 sở hữu.
- Slot không đọc được (`LOAD_FAILED_UNREADABLE`, bổ sung 2026-08-06): CHỈ
  có "Xóa" (cùng quy trình xác nhận đơn như slot đang chơi dở — không có
  gì để "Chép lại" hay "Xem lại" vì nội dung đã mất).
- Luôn có nút "Bắt đầu mới" tạo slot trống.

**Gợi ý mềm chủ động cho rủi ro mất dữ liệu ngoài kiểm soát** (bổ sung
2026-08-07 vòng re-review vòng 3, Recommended — đóng gap `game-designer`:
rủi ro `LOAD_FAILED_UNREADABLE` do trình duyệt tự xóa [VD Safari ITP
~7 ngày không tương tác] là HIGH đã biết, nhưng đối sách duy nhất trước
Core Rule #9b là phòng ngừa chủ động qua export — chỉ có nghĩa SAU khi
export đã là artifact đọc được thật sự): "thời điểm lưu gần nhất" đã
hiển thị sẵn trên mỗi hàng slot (trên) — nếu khoảng cách tới hiện tại
vượt 1 ngưỡng mềm (VD 5-6 ngày, dưới ngưỡng ITP ~7 ngày để còn thời gian
phản ứng — giá trị cụ thể là quyết định `/ux-design`, không phải GDD
này), hàng slot đó gợi ý thêm 1 dòng diegetic mời "Chép lại quyển sổ"
(9b) — không phải banner/dialog chặn, chỉ 1 dòng chữ nhạt cạnh metadata,
cùng tinh thần "Rỗng có chủ đích" của `core-ui-screen-navigation.md` §8.

**Thông báo lỗi ghi/tải** (Core Rule #4, Edge Cases — **tách 2 nhánh riêng
2026-08-06, `/design-review`, đóng mâu thuẫn nội bộ `ux-designer` phát
hiện; mở rộng thêm 2 nhánh 2026-08-06 vòng re-review kế tiếp, đóng gap
`ux-designer`/`creative-director`: 2/5 mã lỗi hiển thị người chơi trước
đây thiếu bề mặt hiển thị cụ thể**): dùng đúng banner-tier của
`core-ui-screen-navigation.md` §5 (1 style, tối đa 1 banner, text-only —
xem Error Taxonomy) cho 3/5 mã lỗi dưới đây; `LOAD_FAILED_UNREADABLE` là
NGOẠI LỆ, KHÔNG dùng banner (xem nhánh cuối). 4 kịch bản kích hoạt khác
nhau, mỗi kịch bản có bề mặt hiển thị riêng:
- **Ghi thất bại** (`WRITE_FAILED_QUOTA`/`WRITE_FAILED_UNSUPPORTED`, Core
  Rule #4): banner hiện NGAY TẠI màn hình đang chơi lúc lượt bị chặn
  (không phải quay về Save Slot Screen) — người chơi cần biết ngay hành
  động vừa rồi có được ghi nhận hay không. Banner này được phép PREEMPT
  1 banner cảnh báo quota đang mở (ngoại lệ đã bổ sung ở
  `core-ui-screen-navigation.md` §5) — không chờ xếp hàng FIFO thông
  thường, vì đây là tín hiệu cấp thiết hơn.
- **Load bị từ chối** (`LOAD_REJECTED_VERSION_MISMATCH`, Core Rule #8):
  xảy ra ngay tại Save Slot Screen (S1) khi người chơi chọn load 1 slot —
  không có "màn hình đang chơi" nào để hiển thị lên (người chơi chưa vào
  slot đó), nên banner hiện TẠI S1, cùng banner-tier surface (xem bổ
  sung ở `core-ui-screen-navigation.md` Core Rule #1 danh sách trigger).
- **Xung đột đa-tab** (`MULTI_TAB_CONFLICT`, Edge Case tương ứng — bổ
  sung 2026-08-06 vòng re-review kế tiếp, đóng gap `ux-designer`: thời
  điểm phát hiện trước đây mơ hồ giữa Write và Load): phát hiện xảy ra
  tại thời điểm MỞ slot (Load), không phải lúc gõ hành động — tab thứ 2
  bị chặn NGAY khi cố mở 1 slot đang được tab khác giữ quyền ghi, trước
  khi có cơ hội gõ bất kỳ hành động tự do nào. Vì vậy KHÔNG phát sinh câu
  hỏi "input tự do có bị mất không" — chưa từng có input nào được nhập ở
  phiên bị chặn. Banner hiện TẠI S1 (trường hợp thường gặp: phát hiện lúc
  mở slot từ danh sách) hoặc tại màn hình đang chơi nếu tab khác giành
  quyền SAU khi tab hiện tại đã mở sẵn slot (trường hợp hiếm hơn, cùng
  surface với nhánh "Ghi thất bại" ở trên).
- **Slot không đọc được** (`LOAD_FAILED_UNREADABLE`, Edge Case tương ứng
  — bổ sung 2026-08-06 vòng re-review kế tiếp, đóng gap `ux-designer`):
  KHÔNG dùng banner (tạm thời/dismissible theo bản chất) — đây là trạng
  thái THƯỜNG TRỰC của chính slot đó, hiển thị bằng 1 nhãn cố định ngay
  trên hàng slot ở Save Slot Screen (chrome/layout cụ thể do
  `core-ui-screen-navigation.md` §4 sở hữu), không phải 1 thông báo
  thoáng qua rồi biến mất.

Cả 4 nhánh dùng đúng văn bản diegetic ở Error Taxonomy, phân biệt HOÀN
TOÀN bằng nội dung chữ, không icon/màu (khớp rule banner-tier).

**Cảnh báo quota sớm** (Công thức #3, Tuning Knob `quota_warn_threshold`
— **sửa 2026-08-07 vòng re-review vòng 3**, đóng gap `systems-designer`
[phạm vi origin] + `ux-designer` [copy]): khi `warn_triggered(origin)=1`,
hiển thị 1 banner không chặn luồng chơi ("Trình duyệt sắp hết chỗ chứa —
cân nhắc **chép lại** một quyển sổ cũ trước khi xóa để giải phóng chỗ")
— cảnh báo ở mức ĐỘ ORIGIN (không riêng slot đang mở, khớp Formula #3 đã
sửa phạm vi), và đồng bộ nguyên tắc "chép lại trước khi xóa" đã áp dụng
cho `WRITE_FAILED_QUOTA` (Error Taxonomy) — đây là khoảnh khắc người
chơi có NHIỀU thời gian phản ứng nhất, nên còn cần nguyên tắc này hơn cả
thông báo lỗi khẩn cấp. Không phải dialog bắt buộc đóng, để không phá vỡ
nhịp tường thuật.

📌 **UX Flag — Persistence / Save System**: Hệ này có yêu cầu UI thật
(Save Slot Screen + các thông báo lỗi). Ở Phase 4 (Pre-Production), chạy
`/ux-design` để tạo UX spec cho màn hình này **trước khi** viết epic —
story tham chiếu UI nên trích `design/ux/save-slot-screen.md`, không
trích thẳng GDD này.

## Acceptance Criteria

*(Đề xuất bởi `qa-lead`. Phần lớn kiểm chứng bằng unit test thuần trên cấu
trúc dữ liệu + mock/spy cho storage backend — hệ này không gọi AI/network,
giống `world-memory-context-management.md`, khác
`ai-llm-integration-layer.md`. Một số AC (đa-tab, ngắt giữa transaction,
mô phỏng quota trình duyệt) cần thêm cơ chế giả lập ngoài unit test
đơn-luồng thông thường — đánh dấu riêng ở cuối mỗi AC đó.)*

**Core Rules**
- **AC-01** (R1, 2 checkpoint duy nhất, write-ahead — **sửa 2026-08-06**
  khớp mô hình gate mới của Core Rule #1/`turn-manager.md`): GIVEN Turn
  Manager đang ở Resolving TRƯỚC bước ghi atomic (đã tính+khóa kết quả +
  AI tường thuật xong, nhưng CHƯA gọi Persistence) HOẶC đang Undoing
  TRƯỚC bước ghi atomic tương ứng, WHEN đếm số lần Persistence kích hoạt
  ghi atomic bằng mock/spy trong toàn bộ khoảng thời gian đó, THEN số
  lần = 0. GIVEN AI tường thuật xong (Resolving) HOẶC Undoing hoàn tất
  tính rollback, THEN đúng 1 lần ghi atomic được kích hoạt cho MỖI sự
  kiện đó, VÀ transition sang Turn Confirmed/Awaiting Action tương ứng
  CHỈ xảy ra SAU KHI lần ghi đó trả về thành công (không 0, không 2+, và
  không transition trước khi ghi xong). GIVEN 1 lượt xác nhận rồi undo
  trong cùng chu kỳ, THEN tổng số lần ghi trong chu kỳ = đúng 2 (không
  nhiều/ít hơn).
  **Bổ sung 2026-08-06** (`/design-review`, đóng gap `qa-lead`: AC gốc
  chỉ đếm SỐ LẦN ghi, không assert NỘI DUNG — có thể pass dù lượt bị Undo
  vẫn còn sót trong Nhật ký đầy đủ): GIVEN 1 lượt xác nhận (world_time
  tăng lên W) rồi Undo hoàn tất VÀ lần ghi atomic thứ 2 (sau-Undo) đã
  thành công, WHEN đọc lại Nhật ký đầy đủ VÀ `world_time` ngay sau đó,
  THEN turn record của lượt VỪA bị Undo KHÔNG xuất hiện trong Nhật ký đầy
  đủ, VÀ `world_time = W-1` (giá trị trước khi lượt đó được xác nhận) —
  không chỉ đếm invocation, phải đọc lại nội dung round-trip.
  **Bổ sung 2026-08-06 vòng re-review tiếp theo** (`/design-review`, đóng
  gap hội tụ 3 specialist [`game-designer`,`ux-designer`,`godot-specialist`]:
  bản gốc chỉ đếm INVOCATION của "kích hoạt ghi atomic" — không đủ để
  phát hiện implementation sai lệch bind gate vào đúng thời điểm nào):
  mock/spy BẮT BUỘC mô phỏng `durability_confirmed` (Core Rule #3) như 1
  SỰ KIỆN TÁCH BIỆT xảy ra SAU thời điểm lời gọi ghi tầng cao trả về (VD
  mock trả về "write call resolved" ngay lập tức nhưng chỉ emit
  `durability_confirmed=true` khi TEST CHỦ ĐỘNG kích hoạt 1 Promise/
  callback tách biệt đang chờ sẵn — **làm rõ 2026-08-07 vòng re-review
  vòng 3**, đóng gap `qa-lead`: "độ trễ giả lập" ở bản trước có thể bị
  hiểu nhầm thành timer thực [`sleep`/`create_timer`], vi phạm "no
  time-dependent assertions" của `coding-standards.md` — mô phỏng PHẢI
  là 1 sự kiện do test chủ động fire, KHÔNG dùng đồng hồ thực, để test
  xác định và nhanh; đại diện cho bước đồng bộ cấp thấp hơn như
  `syncfs()`). WHEN "write call resolved" đã xảy
  ra nhưng `durability_confirmed` CHƯA fire, THEN Turn Manager PHẢI CHƯA
  chuyển Turn Confirmed/Awaiting Action — kiểm tra bằng spy trên chính
  transition đó tại đúng thời điểm giữa 2 sự kiện mock. WHEN
  `durability_confirmed` fire, THEN transition xảy ra NGAY SAU ĐÓ, không
  sớm hơn. Test này thất bại nếu implementation bind gate vào "write call
  resolved" thay vì `durability_confirmed` — đúng lỗ hổng mà bản AC gốc
  không phát hiện được.
- **AC-02** (R2, blob độc lập không diễn giải): GIVEN N hệ mock đã đăng
  ký, mỗi hệ trả về 1 blob mang 1 sentinel value riêng biệt (kể cả nội
  dung vô nghĩa về mặt domain logic của hệ đó), WHEN Persistence gom
  bundle và ghi, THEN Persistence KHÔNG throw lỗi/từ chối ghi dựa trên
  NỘI DUNG bên trong blob — chỉ dựa vào `blob_status` (Formula #2). WHEN
  đọc lại (round-trip), THEN mỗi blob trả về đúng cho hệ sở hữu nó (đúng
  sentinel tương ứng), không lẫn giữa các hệ.
- **AC-03** (R3, ghi atomic tất-cả-hoặc-không-gì): GIVEN mock storage
  backend giả lập lỗi XẢY RA GIỮA CHỪNG (throw exception sau khi "ghi"
  blob thứ 2/N nhưng trước blob thứ 3), WHEN atomic write thất bại, THEN
  đọc lại slot ngay sau đó trả về ĐÚNG bundle TRƯỚC lần ghi thất bại —
  không blob nào của lần ghi mới (kể cả 2 blob đã xử lý trước khi lỗi xảy
  ra) xuất hiện; không có trạng thái "ghi một nửa" quan sát được từ bên
  ngoài.
- **AC-04** (R4, ghi thất bại chặn lượt): GIVEN atomic write thất bại
  (mock storage trả lỗi kiểu `QuotaExceededError`), WHEN kiểm tra
  `world_time` sau đó, THEN KHÔNG tăng; WHEN kiểm tra trạng thái Turn
  Manager, THEN lượt đó KHÔNG được coi là Turn Confirmed; THEN hệ thống
  trả về `error_code = WRITE_FAILED_QUOTA` (bổ sung 2026-08-06 — khớp
  Error Taxonomy, không phải chuỗi tùy ý) và slot vẫn đọc được nguyên
  trạng thái hợp lệ gần nhất đã lưu trước đó.
- **AC-05** (R5, tạo slot mới không đụng slot cũ): GIVEN người chơi chọn
  "Bắt đầu mới", WHEN slot mới được tạo, THEN `slot_id` mới không trùng
  bất kỳ `slot_id` nào đã tồn tại và không đọc/ghi dữ liệu của slot khác.
  GIVEN 1 slot đã có lượt `is_death_turn=true`, WHEN người chơi chọn
  "Chơi lại", THEN 1 `slot_id` MỚI hoàn toàn được tạo; đọc lại slot cũ
  ngay sau đó phải cho nội dung giống hệt byte-for-byte trước khi "Chơi
  lại" được gọi.
- **AC-06** (R6, slot đã khép read-only): GIVEN 1 slot đã có lượt
  `is_death_turn=true`, WHEN mô phỏng gọi thao tác auto-save cho slot này
  (kịch bản phòng thủ, không nên xảy ra qua UI bình thường), THEN
  Persistence từ chối ghi, nội dung slot không đổi. WHEN gọi đọc Nhật ký
  đầy đủ của slot đó, THEN trả về đầy đủ, không lỗi, không hạn chế đọc.
- **AC-07** (R7, không mất nội dung logic qua nén — áp dụng TOÀN BỘ
  bundle): GIVEN nội dung logic của bất kỳ blob nào trong save bundle
  (không chỉ Nhật ký đầy đủ — khác phạm vi AC tương ứng của
  `world-memory-context-management.md`), WHEN đi qua 1 bước nén lossless
  giả lập (VD gzip round-trip) rồi giải nén lại, THEN nội dung logic
  giống hệt byte-for-byte trước và sau, với mọi blob trong bundle, không
  riêng Nhật ký đầy đủ.
- **AC-08** (R8, version mismatch từ chối cả 2 chiều): GIVEN 1 bundle có
  `schema_version` KHÁC (thử cả trường hợp CŨ HƠN và MỚI HƠN)
  `schema_version` hiện tại của game, WHEN gọi Load slot, THEN load bị
  từ chối trong CẢ 2 trường hợp, trả về `error_code =
  LOAD_REJECTED_VERSION_MISMATCH` (bổ sung 2026-08-06 — khớp Error
  Taxonomy, assert đúng hằng số; đóng cùng lỗ hổng đã sửa cho
  AC-04/13/21 nhưng trước đây bỏ sót ở AC này), và KHÔNG có field nào
  của bundle được áp dụng một phần vào trạng thái game hiện tại (không
  migrate ngầm). GIVEN `schema_version` khớp chính xác, WHEN load, THEN
  thành công bình thường.
- **AC-09** (R9a, QA export đầy đủ và không sửa gốc — **mở rộng
  2026-08-07 vòng re-review vòng 3**, đóng gap `qa-lead`: bản gốc chỉ
  assert mỗi object "đủ" 5 field, không assert "CHỈ" 5 field — một
  implementer vô tình serialize thêm `equipment`/`affinity`/EXP vào cùng
  object vẫn pass bản AC cũ): GIVEN 1 playthrough có M lượt đã xác nhận
  (không undo) trong Nhật ký đầy đủ, WHEN gọi thao tác Xuất QA log (9a),
  THEN JSON trả về chứa đúng M object, sắp theo `world_time` tăng dần,
  không thiếu/thừa lượt so với Nhật ký đầy đủ tại thời điểm export; VÀ
  key-set của MỖI object CHÍNH XÁC = {`turn_id`,`action`,`locked_result`,
  `narration_text`,`world_time`} — không có key nào khác ở object hay
  top-level JSON (không `equipment`, không `known_skill_ids`, không
  affinity, không EXP/cảnh giới). WHEN export xong, THEN đọc lại save gốc
  cho kết quả y hệt trước export (export không sửa đổi dữ liệu gốc).
- **AC-09b** (R9b, "Chép lại quyển sổ" — bản đọc được, khác artifact
  JSON của AC-09 — bổ sung 2026-08-07 vòng re-review vòng 3, đóng gap
  `game-designer`): GIVEN cùng playthrough M lượt, WHEN gọi thao tác
  "Chép lại quyển sổ" (9b), THEN kết quả trả về là 1 chuỗi văn bản liên
  tục (KHÔNG phải cấu trúc JSON/object nào lộ ra), chứa đúng `narration_text`
  của cả M lượt nối theo thứ tự `world_time` tăng dần, KHÔNG chứa bất kỳ
  tên field kỹ thuật nào (`turn_id`, `action`, `locked_result`,
  `world_time`) hay số liệu cơ học nào (chỉ số, EXP, cảnh giới, trang bị,
  Hảo cảm) xuất hiện dưới dạng nhãn/số thô. WHEN export xong, THEN đọc
  lại save gốc cho kết quả y hệt trước export (không sửa đổi dữ liệu
  gốc).

**Formulas**
- **AC-10** (F1, worked example): GIVEN `fixed_blob_bytes=50.000`,
  `avg_turn_record_bytes=800`, `compression_ratio=1`, WHEN tính
  `bundle_size_bytes(1.000)`, THEN = 850.000, khớp ví dụ minh họa; WHEN
  tính `bundle_size_bytes(50.000)`, THEN = 40.050.000, khớp ví dụ. GIVEN
  `quota_bytes=10.485.760`, WHEN tính `quota_exhaustion_turn`, THEN =
  13.044, khớp ví dụ; GIVEN `compression_ratio=0,3` (mọi biến số khác
  giữ nguyên), THEN = 43.482, khớp ví dụ thứ 2.
- **AC-11** (F1, biên `world_time=0` + mặc định `compression_ratio` an
  toàn): GIVEN `world_time=0`, WHEN tính `bundle_size_bytes(0)`, THEN =
  đúng `fixed_blob_bytes`, không cộng thêm gì. GIVEN `compression_ratio`
  chưa được đo thực nghiệm/chưa truyền tường minh, WHEN gọi hàm tính
  toán lập kế hoạch của công thức #1 mà không truyền `compression_ratio`,
  THEN giá trị mặc định dùng trong tính toán PHẢI = 1 (kịch bản xấu
  nhất) — kiểm chứng bằng unit test gọi hàm không truyền tham số và
  assert kết quả khớp `compression_ratio=1`, không được ngầm dùng giá
  trị < 1.
- **AC-12** (F2, `commit_allowed` — worked example; **mở rộng 2026-08-07
  vòng re-review vòng 3**, đóng gap `systems-designer`: worked example
  gốc dùng ERROR nhưng không AC nào assert `error_code`): GIVEN `N=3`,
  mock trả `blob_status`: OK, OK, ERROR, WHEN tính `completeness_ratio`,
  THEN ≈ 0,667; `is_complete=0`; `commit_allowed=0`, khớp ví dụ minh họa,
  VÀ log ghi `error_code=BLOB_ERROR` kèm `system_id` của hệ trả ERROR
  (Error Taxonomy — PHẢI khác `BLOB_MISSING`). GIVEN cả 3 hệ đều OK, THEN
  `completeness_ratio=1`, `is_complete=1`, `commit_allowed=1`.
- **AC-13** (F2, `N=0` là lỗi cấu hình, phân biệt với 1 hệ MISSING):
  GIVEN `N=0` (chưa hệ nào đăng ký), WHEN tính `commit_allowed`, THEN =
  0 theo điều kiện cứng `N≥1`, VÀ hệ thống ghi log với
  `error_code = CONFIG_ERROR_NO_SYSTEMS_REGISTERED`, VÀ implementation
  KHÔNG thực hiện phép chia `(1/N) × Σok(s)` (kiểm chứng bằng spy trên
  hàm chia hoặc assert `completeness_ratio` trả sentinel "không áp dụng",
  không phải `NaN`/`Infinity`/`0` — bổ sung 2026-08-06, đóng gap chia-
  cho-0 tương ứng Formula #2 Trường hợp biên); GIVEN `N=3` với 1 hệ
  trả `MISSING`, THEN log `error_code = BLOB_MISSING` kèm `system_id`
  tương ứng (bổ sung 2026-08-06 — 2 hằng số cụ thể ở Error Taxonomy, kiểm
  chứng bằng assert đúng hằng số, không chỉ "khác nhau" một cách tương
  đối).
- **AC-14** (F2, blob rỗng hợp lệ ≠ MISSING): GIVEN 1 hệ đã đăng ký
  nhưng chưa có nội dung áp dụng cho playthrough hiện tại (mock trả về
  blob "trạng thái khởi tạo" rỗng/mặc định với `blob_status=OK`), WHEN
  tính `completeness_ratio` cùng các hệ khác đều OK, THEN
  `completeness_ratio=1`, `commit_allowed=1` — hệ đó KHÔNG được phép trả
  `MISSING` chỉ vì chưa có nội dung áp dụng.
- **AC-15** (F3, `warn_triggered` — worked example, **cập nhật 2026-08-07
  vòng re-review vòng 3** khớp biến origin-level, đóng gap `systems-designer`):
  GIVEN `quota_warn_threshold=0,85`, `measured_total_bytes(origin)=9.000.000`
  (tổng byte của MỌI slot thuộc origin cộng lại, không riêng 1 slot),
  `quota_bytes_total(origin)=10.485.760`, WHEN tính `utilization_ratio`,
  THEN ≈ 0,858, `warn_triggered=1`, khớp ví dụ minh họa. GIVEN
  `measured_total_bytes(origin)=8.000.000` (cùng quota), THEN
  `utilization_ratio` < 0,85, `warn_triggered=0`. GIVEN 2 slot A (bundle
  nhỏ, 500.000 byte) và B (bundle lớn, 8.500.000 byte) cùng thuộc 1
  origin có `quota_bytes_total=10.485.760`, WHEN slot A vừa ghi xong VÀ
  `measured_total_bytes(origin)` được tính bằng TỔNG cả A lẫn B (=
  9.000.000), THEN `warn_triggered=1` — đúng ngay cả khi slot A tự nó
  chỉ chiếm ~0,048 tỉ lệ quota (kiểm chứng công thức KHÔNG dùng
  `measured_bundle_bytes` của riêng slot đang ghi làm tử số).
- **AC-16** (F3, fallback khi không đo được — không chia cho 0, cập nhật
  tên biến 2026-08-07): GIVEN `quota_bytes_total(origin)=0` HOẶC không đo
  được (mock API trả lỗi/undefined, mô phỏng Safari private mode), WHEN
  tính `warn_triggered`, THEN = 1 mặc định, KHÔNG throw lỗi chia-cho-0,
  KHÔNG trả `NaN`/`undefined` — kiểm chứng bằng unit test gọi hàm với
  `quota_bytes_total(origin)=0`, với `null`/`undefined`, VÀ với giá trị
  ÂM cụ thể (VD `-1`, bổ sung 2026-08-06 — `qa-lead`: bản sửa 2026-08-06
  của Formula #3 mở rộng guard từ chỉ bắt `=0` sang mọi giá trị `≤0`,
  nhưng AC trước đây chưa test đúng giá trị âm mà bản sửa đó nhắm tới),
  assert CẢ 3 trường hợp đều trả `warn_triggered=1` mà không exception.

**Edge Cases**
- **AC-17** (đóng trình duyệt/OS kill giữa lúc ghi — **tách 2 tầng
  2026-08-07 vòng re-review vòng 3**, đóng gap `qa-lead`: bản gốc gán
  nhãn "cần công nghệ lưu trữ thật" cho TOÀN BỘ AC này, nhưng AC-03
  [không bị đánh dấu ADR-blocked] đã dùng đúng năng lực mock tương đương
  — nghĩa là seam `stage()`/`commit()` [Core Rule #3] đủ để viết tầng
  logic ngay hôm nay, không cần chờ ADR):
  - **Tầng logic (unit test, viết được ngay)**: GIVEN mock storage triển
    khai seam `stage(blobs[])`/`commit()`/`abort()` (Core Rule #3, không
    phụ thuộc backend thật), WHEN giả lập crash NGAY SAU `stage()` nhưng
    TRƯỚC `commit()` (không gọi `commit()` lẫn `abort()` — mô phỏng ngắt
    đột ngột, không có cơ hội chạy code xử lý lỗi nào của Persistence,
    khác AC-03/AC-04 vốn giả lập lỗi CÓ TRẢ VỀ qua exception bắt được),
    WHEN mô phỏng "khởi động lại" (tạo 1 instance Persistence mới trỏ
    tới cùng mock storage) rồi load lại slot đó, THEN trạng thái đọc
    được đúng bằng trạng thái TRƯỚC `stage()`, không có blob một phần
    nào xuất hiện.
  - **Tầng công nghệ thật (integration/spike, ADR-blocked)**: xác nhận
    công nghệ lưu trữ THẬT đã chọn ở ADR (VD IndexedDB) thực sự cung cấp
    đúng ngữ nghĩa "ngắt giữa transaction = rollback sạch" mà seam
    `stage()`/`commit()` giả định — tầng logic ở trên KHÔNG chứng minh
    được điều này, chỉ chứng minh Persistence xử lý ĐÚNG nếu backend giữ
    đúng cam kết. *(ADR-blocked — cùng nhóm AC-22/AC-29/AC-33.)*
- **AC-18** (2 tab cùng mở 1 slot — race, phần đã đặc tả rõ): GIVEN mock
  2 "phiên" (tab) cùng cố mở 1 `slot_id`, tab A mở/ghi trước, WHEN tab B
  cố ghi vào cùng `slot_id` trong khi tab A đang giữ quyền ghi, THEN tab
  B bị từ chối thao tác ghi (trạng thái xung đột, read-only tạm thời) VÀ
  trả về `error_code = MULTI_TAB_CONFLICT` (bổ sung 2026-08-06 — khớp
  Error Taxonomy, assert đúng hằng số, PHẢI khác `error_code =
  WRITE_FAILED_QUOTA` của AC-04 — đóng cùng lỗ hổng đã sửa cho
  AC-04/13/21 nhưng trước đây bỏ sót ở AC này, trước đó chỉ nói "phân
  biệt được... một cách tương đối"); tab A ghi thành công bình thường,
  không bị ảnh hưởng bởi tab B. *(AC-18 chỉ cần mô phỏng TRẠNG THÁI khóa
  đã được tab A giữ — 2 object mock/session trong CÙNG 1 tiến trình đơn
  luồng, gọi TUẦN TỰ, không cần thread/tab/I/O thật; đây LÀ 1 unit test
  hợp lệ theo Independence/Determinism của `coding-standards.md` — **sửa
  2026-08-06 vòng re-review tiếp theo**, đóng gap `qa-lead`: chú thích gốc
  "cần đa-luồng" gây hiểu lầm. Kịch bản THỜI ĐIỂM 2 lệnh ghi đến thật sự
  đồng thời, hay tab crash không giải phóng khóa sạch, KHÔNG thuộc phạm
  vi AC-18 — xem AC-33 riêng cho crash-release, và storage API guarantee
  thật (VD Web Locks) cho race timing thật.)*
- **AC-19** (xóa slot đã khép cần xác nhận ESCALATED — gõ lại tên nhân
  vật): GIVEN 1 slot đã khép (read-only), WHEN gọi thao tác xóa mà KHÔNG
  đi qua bước xác nhận (mô phỏng gọi trực tiếp API xóa chính, bỏ qua xác
  nhận), THEN thao tác xóa bị từ chối/không thực thi. **Sửa 2026-08-06**
  (`/design-review`, escalate friction): WHEN gọi xóa kèm bước "xác nhận"
  nhưng chuỗi gõ lại KHÔNG khớp đúng tên nhân vật của slot đó, THEN thao
  tác xóa VẪN bị từ chối, slot không đổi. WHEN gõ ĐÚNG tên nhân vật để
  xác nhận, THEN slot bị xóa vĩnh viễn — đọc lại `slot_id` đó ngay sau đó
  trả về "không tồn tại". **Bổ sung 2026-08-06 vòng re-review tiếp theo**
  (đóng gap `ux-designer`, chuẩn hóa chuỗi): GIVEN tên nhân vật lưu trữ là
  "Lý An" (có dấu tiếng Việt), WHEN người chơi gõ "lý an" (khác hoa/
  thường) HOẶC " Lý An " (thừa khoảng trắng 2 đầu) HOẶC chuỗi tương đương
  về mặt hiển thị nhưng khác biểu diễn Unicode (NFD thay vì NFC), THEN
  xác nhận VẪN được chấp nhận (match sau chuẩn hóa NFC + trim +
  case-insensitive). GIVEN gõ "Lý Ân" (khác hẳn, không phải biến thể
  chuẩn hóa của tên thật), THEN vẫn bị từ chối như bình thường. **Bổ
  sung 2026-08-07 vòng re-review vòng 3** (đóng gap `ux-designer`, tên
  rỗng): GIVEN tên nhân vật lưu trữ, sau NFC+trim, là chuỗi độ dài 0,
  WHEN người chơi gõ chuỗi RỖNG hoặc chỉ khoảng trắng để xác nhận, THEN
  thao tác xóa VẪN bị từ chối (chuỗi thay thế "XÁC NHẬN" chưa được gõ).
  WHEN gõ đúng literal "xác nhận" (không dấu, bất kỳ hoa/thường, chuẩn
  hóa như bình thường), THEN xác nhận được chấp nhận, slot bị xóa vĩnh
  viễn.
- **AC-30** (bổ sung 2026-08-06, đóng gap `qa-lead`: xóa slot ĐANG CHƠI
  DỞ, dangling reference giữa UI Requirements và Edge Cases/AC trước đây):
  GIVEN 1 slot ĐANG CHƠI DỞ (chưa có lượt `is_death_turn=true`), WHEN gọi
  thao tác xóa mà KHÔNG đi qua bước xác nhận (bỏ qua xác nhận), THEN bị
  từ chối/không thực thi — chứng minh vẫn có 1 bước xác nhận bắt buộc
  (thường, KHÔNG cần gõ tên nhân vật — khác AC-19). WHEN đi đúng quy
  trình xác nhận thường, THEN slot bị xóa vĩnh viễn — đọc lại `slot_id`
  đó ngay sau đó trả về "không tồn tại", không cần bước "khóa" slot
  trước.
- **AC-32** (Core Rule #5, property "hệ thống không bao giờ tự động xóa/
  ghi đè slot đã khép" — bổ sung 2026-08-06 vòng re-review tiếp theo,
  đóng gap `qa-lead`: guarantee lõi bảo vệ Pillar 2 trước đây KHÔNG có AC
  nào test đúng property này): GIVEN slot đã khép X tồn tại VÀ slot Y
  đang hoạt động, WHEN atomic write của Y thất bại vì `WRITE_FAILED_QUOTA`
  (mock storage hết quota) VÀ hệ thống chạy qua toàn bộ luồng xử lý lỗi
  (Core Rule #4, Edge Cases, retry theo AC-31), THEN slot X KHÔNG bị đọc/
  ghi/xóa bởi bất kỳ đường xử lý lỗi TỰ ĐỘNG nào — đọc lại X ngay sau
  chuỗi sự kiện đó cho nội dung giống hệt byte-for-byte trước đó. WHEN mô
  phỏng lặp lại kịch bản hết quota nhiều lần liên tiếp (đủ
  `max_write_retry_before_escalation` lần), THEN không có slot nào (đã
  khép hay đang chơi KHÁC slot Y) bị hệ thống tự động xóa để giải phóng
  chỗ — chỉ trả lỗi cho người chơi, không tự ý dọn dẹp.
- **AC-20** (`bundle_completeness_check` thất bại liên tiếp — không kẹt
  người chơi): GIVEN completeness check thất bại liên tiếp ≥3 lượt (mock
  1 hệ trả `ERROR` mọi lần) cho 1 slot, WHEN người chơi thoát ra màn
  hình chọn slot (không thao tác gì thêm trong slot lỗi), THEN thao tác
  thoát PHẢI thành công, không bị chặn bởi trạng thái lỗi của slot đó.
  WHEN sau đó chọn "Bắt đầu mới" hoặc mở 1 slot KHÁC, THEN thao tác đó
  không bị ảnh hưởng bởi lỗi của slot cũ. WHEN gọi Xuất QA log cho slot
  lỗi đó, THEN vẫn trả về đầy đủ dữ liệu từ bản commit gần nhất TRƯỚC
  chuỗi lỗi (không rỗng, không lỗi thêm).
- **AC-21** (Safari private mode fail ngay lượt đầu — thông báo khác
  biệt): GIVEN mock storage backend giả lập trả lỗi NGAY LẬP TỨC cho
  lượt ghi ĐẦU TIÊN của 1 slot MỚI (mô phỏng Safari private mode không
  hỗ trợ lưu trữ bền vững), WHEN Persistence bắt lỗi này, THEN
  `error_code = WRITE_FAILED_UNSUPPORTED` — PHẢI khác hằng số
  `WRITE_FAILED_QUOTA` của AC-04 (bổ sung 2026-08-06 — 2 hằng số cụ thể
  ở Error Taxonomy, kiểm chứng bằng assert đúng hằng số tương ứng mỗi
  kịch bản, không chỉ "khác nhau" một cách tương đối).
- **AC-22** (QA export đọc bản commit gần nhất, không đọc dở dang —
  **tách 2 tầng 2026-08-07 vòng re-review vòng 3**, đóng gap `qa-lead`,
  cùng lý do AC-17): 
  - **Tầng logic (unit test, viết được ngay)**: GIVEN mock storage dùng
    seam `stage()`/`commit()` (Core Rule #3), với `commit()` bị giữ lại
    có chủ đích qua 1 Promise/callback tự kiểm soát bởi test (chưa
    resolve — KHÔNG dùng timer/sleep thực, tránh vi phạm Determinism của
    `coding-standards.md`), mô phỏng "đang ghi dở, chưa commit xong",
    WHEN gọi Xuất QA log (9a) TRONG LÚC `commit()` chưa resolve, THEN kết
    quả export khớp ĐÚNG bản đã `commit()` GẦN NHẤT trước đó, không chứa
    bất kỳ phần nào của lượt đang `stage()` dở. WHEN test chủ động
    resolve `commit()` (commit thành công) và gọi export lại, THEN kết
    quả mới bao gồm lượt vừa commit.
  - **Tầng công nghệ thật (integration/spike, ADR-blocked)**: xác nhận
    backend thật đã chọn ở ADR cho phép đọc (export) đồng thời với 1
    giao dịch ghi khác đang mở mà không đọc phải trạng thái trung gian —
    tầng logic ở trên không chứng minh điều này ở mức vật lý thật. *(ADR-
    blocked — cùng nhóm AC-17/AC-29/AC-33.)*
- **AC-31** (Edge Case bổ sung, retry-chỉ-ghi không đốt thêm AI call —
  bổ sung 2026-08-06 vòng re-review tiếp theo, đóng gap `game-designer`):
  GIVEN ghi atomic thất bại với `error_code ∈ {WRITE_FAILED_QUOTA,
  WRITE_FAILED_UNSUPPORTED}` (mock storage giả lập lỗi persistent), WHEN
  người chơi gửi lại ĐÚNG cùng hành động (mock: cùng `locked_result`/
  `narration_text` đã cache trong `pending_write_cache`), THEN Persistence
  retry CHỈ bước ghi — đếm số lần gọi AI narration (mock/spy) trong TOÀN
  BỘ chuỗi N lần retry liên tiếp = đúng 1 (không phải N). GIVEN retry vẫn
  thất bại đủ `max_write_retry_before_escalation` lần liên tiếp cùng
  `error_code`, THEN banner hiển thị thêm 1 điều hướng trực tiếp sang
  Save Slot Screen VÀ hệ thống chặn gửi hành động mới cho tới khi người
  chơi rời slot hoặc quota được giải phóng. GIVEN người chơi gửi 1 hành
  động KHÁC (không phải retry cùng bundle), THEN `pending_write_cache` bị
  xóa, Resolving chạy lại đầy đủ (gồm 1 AI call narration mới) như bình
  thường. **Bổ sung 2026-08-07 vòng re-review vòng 3** (đóng gap
  `qa-lead` B8: 2/3 điều kiện xóa `pending_write_cache` [(a) retry thành
  công, (b) hành động khác] đã có AC ở trên, điều kiện (c) chưa từng
  được test dù được liệt kê tường minh ở Edge Cases): GIVEN
  `pending_write_cache` đang giữ 1 bundle chờ retry (sau ≥1 lần
  `WRITE_FAILED_QUOTA`), WHEN người chơi rời slot (điều hướng về Save
  Slot Screen, không gửi hành động mới VÀ không retry thành công), THEN
  `pending_write_cache` bị xóa; WHEN người chơi mở LẠI đúng slot đó sau
  đó và gửi 1 hành động, THEN Resolving chạy lại đầy đủ (gồm 1 AI call
  narration mới) — không dùng lại `locked_result`/`narration_text` đã
  cache trước khi rời slot.

**Bổ sung 2026-08-06** (`/design-review` — đóng gap coverage do
`qa-lead`/`systems-designer`/`godot-specialist` phát hiện: các Core
Rule/Formula/Edge Case dưới đây đã được sửa hoặc thêm mới nhưng chưa có
AC tương ứng)

- **AC-23** (Edge Case bổ sung, mất slot âm thầm — `error_code` phân
  biệt): GIVEN mock storage backend giả lập 1 slot từng ghi thành công
  trước đó nay trả lỗi/rỗng khi Load, KHÔNG có bất kỳ lần ghi chủ động
  nào đang chạy tại thời điểm đó (mô phỏng dữ liệu bị trình duyệt xóa
  ngoài kiểm soát app), WHEN gọi Load slot đó, THEN trả
  `error_code = LOAD_FAILED_UNREADABLE` — PHẢI khác
  `WRITE_FAILED_QUOTA`/`WRITE_FAILED_UNSUPPORTED` (không có lần ghi nào
  đang chạy) và khác `LOAD_REJECTED_VERSION_MISMATCH` (không đọc được
  `schema_version` để so sánh); WHEN kiểm tra danh sách Save Slot Screen
  ngay sau đó, THEN slot vẫn xuất hiện trong danh sách, đánh dấu trạng
  thái "không đọc được", không tự động bị xóa khỏi danh sách.
- **AC-24** (F2, đăng ký trùng/hủy đăng ký giữa chừng — `N` snapshot
  đúng): GIVEN 2 lần đăng ký cùng `system_id` (mô phỏng bug
  double-init), WHEN tính `N` tại thời điểm bắt đầu gom bundle, THEN
  `N` không tăng gấp đôi — đếm đúng 1 lần cho `system_id` đó. GIVEN 1 hệ
  đã đăng ký (tính vào `N` đã snapshot lúc bắt đầu gom) nhưng tự hủy
  đăng ký/crash NGAY SAU KHI bundle bắt đầu gom, WHEN hệ đó không trả
  blob, THEN `blob_status(s) = ERROR` cho hệ đó VÀ `N` giữ NGUYÊN giá
  trị đã snapshot (không giảm theo số hệ còn phản hồi) — dẫn tới
  `completeness_ratio < 1`, `commit_allowed = 0`, không phải
  `completeness_ratio = 1` do mẫu số bị thu hẹp sai.
- **AC-25** (F1, sentinel fallback khi đo lường lỗi — không chia cho
  0): GIVEN `avg_turn_record_bytes ≤ 0` HOẶC `compression_ratio ≤ 0`
  (mô phỏng lỗi đo lường), WHEN tính `quota_exhaustion_turn`, THEN
  KHÔNG thực hiện phép chia trực tiếp, trả về sentinel "chưa đo được"
  (không phải `Infinity`/`NaN`), KHÔNG throw exception — kiểm chứng
  bằng unit test gọi hàm với cả 2 biến lần lượt = `0` và giá trị âm cụ
  thể.
- **AC-26** (F1, boundary `quota_bytes ≤ fixed_blob_bytes` HOẶC không đo
  được — hồi quy Open Question đã đóng 2026-08-05; **mở rộng 2026-08-06
  vòng re-review tiếp theo** để khớp bullet đã hợp nhất, đóng gap
  `systems-designer`): GIVEN `quota_bytes ≤ fixed_blob_bytes` (quota nhỏ
  hơn cả kích thước blob "trạng thái hiện tại"), WHEN tính
  `quota_exhaustion_turn`, THEN = 0, không âm, không throw. GIVEN
  `quota_bytes` không đo được (mock API trả lỗi/`undefined`/`NaN`), WHEN
  tính `quota_exhaustion_turn`, THEN CŨNG = 0 (cùng xử lý fail-safe như
  nhánh trên, KHÔNG phải sentinel "không tính được" riêng biệt), không
  âm, không throw.
- **AC-27** (Edge Case, "Chơi lại" trong khi đang xem slot đã khép
  KHÁC): GIVEN người chơi đang xem (read-only) slot đã khép X, và slot
  Y (khác X) vừa kết thúc bằng lượt `is_death_turn=true`, WHEN người
  chơi chọn "Chơi lại", THEN slot mới được tạo scoped tới Y (khóa Y,
  tạo slot mới liên kết Y), KHÔNG liên quan gì tới X; đọc lại X ngay
  sau đó cho nội dung giống hệt byte-for-byte trước khi "Chơi lại" được
  gọi.
- **AC-28** (F3, `utilization_ratio > 1` — không cần xử lý đặc biệt,
  hồi quy nhẹ, cập nhật tên biến 2026-08-07): GIVEN
  `measured_total_bytes(origin) > quota_bytes_total(origin)` (lần ghi
  gần nhất đã vượt quota theo số đo), WHEN tính `utilization_ratio` và
  `warn_triggered`, THEN `utilization_ratio > 1` tính bình thường (không
  chặn/không lỗi ở bước tính), `warn_triggered = 1` như mọi trường hợp
  vượt ngưỡng khác, không có nhánh xử lý riêng.
- **AC-29** (Tuning Knob mới, ngân sách write-latency — **tách 2 tầng
  2026-08-06 vòng re-review tiếp theo**, đóng gap `qa-lead`: bản gốc dùng
  "mock storage backend" để đo latency thật, nhưng Core Rule #3 vừa cảnh
  báo đo qua mock/`FileAccess.store_*()` đồng bộ "luôn pass giả" — tự
  mâu thuẫn với chính điều kiện tiên quyết mà nó cần):
  - **Tầng logic (unit test, viết được ngay)**: GIVEN `write_duration_ms`
    là input trực tiếp (KHÔNG đo qua mock storage — truyền thẳng giá trị
    giả lập, VD 200ms), WHEN so với `max_perceived_autosave_latency_ms`
    (Tuning Knob, mặc định 150ms), THEN nếu vượt ngưỡng, hệ thống log/flag
    đúng 1 tín hiệu vi phạm ngân sách (không phải lỗi chặn lượt — Core
    Rule #1 vẫn hoạt động bình thường); nếu không vượt, không log gì.
    Test thuần logic ngưỡng, không phụ thuộc storage backend thật.
  - **Tầng đo thật (integration/spike, ADR-blocked)**: đo
    `durability_confirmed` thực tế END-TO-END (gồm cả `syncfs()`/tương
    đương bất đồng bộ VÀ chi phí CPU serialize của phần append-only theo
    Core Rule #3) trên storage backend THẬT đã chọn ở ADR, ở các mốc
    `world_time` cao — đây mới là cái thực sự xác nhận ngân sách
    `max_perceived_autosave_latency_ms` có đạt được hay không. *(ADR-
    blocked — cùng nhóm AC-17/AC-22/AC-33, xem Open Questions.)*
- **AC-33** (Edge Case đa-tab, giải phóng khóa sau crash — bổ sung
  2026-08-06 vòng re-review tiếp theo, đóng gap `godot-specialist`: AC-18
  gốc chỉ test 2 tab đang chạy đồng thời, không test kịch bản khó hơn —
  tab trước đã crash không giải phóng khóa sạch): GIVEN tab A đã mở/ghi
  slot rồi biến mất ĐỘT NGỘT (mock: không gọi bất kỳ cleanup/release nào,
  mô phỏng crash/kill process) mà KHÔNG phải đóng sạch bình thường, WHEN
  tab B mở lại ĐÚNG slot đó SAU khoảng thời gian giải phóng khóa đã định
  nghĩa ở ADR (timeout hoặc cơ chế release tự động của storage API đã
  chọn), THEN tab B KHÔNG bị trả `MULTI_TAB_CONFLICT` — được phép ghi
  bình thường (không có tab nào khác thực sự đang giữ khóa). *(ADR-
  blocked — cùng nhóm AC-17/AC-22/AC-29, phụ thuộc cơ chế giải phóng khóa
  cụ thể đã chọn ở ADR; xem Open Questions "Điều kiện GIẢI PHÓNG khóa".)*

**Bổ sung 2026-08-07 vòng re-review vòng 3** (đóng gap Core Rule #3/#4/#10
mới + Formula #2/#3 đã sửa, chưa có AC tương ứng)

- **AC-34** (Core Rule #3, append-only — chi phí ghi mỗi lượt độc lập
  `world_time`, đóng gap hội tụ `godot-specialist`/`qa-lead`: AC-01 gốc
  chỉ đếm SỐ LẦN ghi, không kiểm tra KÍCH THƯỚC/PHẠM VI dữ liệu ghi — 1
  implementation SAI [ghi lại toàn bộ bundle mỗi lượt, vi phạm append-only]
  vẫn pass mọi AC trước đây): GIVEN 1 slot đã có K turn record đã ghi (2
  giá trị K khác biệt lớn, VD K=10 và K=10.000, KHÔNG rơi vào chu kỳ
  full-flush định kỳ), WHEN xác nhận lượt K+1 ở cả 2 trường hợp, THEN đo
  qua spy trên mock storage: số BYTE của payload ghi trong lần atomic
  write đó KHÔNG phụ thuộc K — chỉ gồm 1 turn record mới + phần blob
  "trạng thái hiện tại" đã đổi (`fixed_blob_bytes`-scope, Formula #1),
  KHÔNG chứa K turn record cũ; sai lệch giữa 2 trường hợp phải nằm trong
  ngưỡng noise nhỏ (không tỉ lệ thuận với K). GIVEN 1 lượt trùng đúng chu
  kỳ full-flush định kỳ, WHEN full-flush chạy, THEN transition Turn
  Confirmed/Awaiting Action của lượt đó KHÔNG bị trễ bởi full-flush (spy
  xác nhận thứ tự: transition xảy ra ngay sau `durability_confirmed` của
  PHẦN APPEND-ONLY, full-flush chạy độc lập/ngoài đường găng).
- **AC-35** (Core Rule #10, khép slot khi quota cạn hoàn toàn — bổ sung
  2026-08-07, đóng gap `game-designer`): GIVEN slot đang chơi đã thất bại
  `max_write_retry_before_escalation` lần liên tiếp cùng `error_code ∈
  {WRITE_FAILED_QUOTA, WRITE_FAILED_UNSUPPORTED}` (mock storage giả lập
  lỗi persistent), WHEN người chơi chọn hành động "Khép quyển sổ này
  lại" (KHÔNG phải xóa), THEN slot chuyển `slot_closure_reason=quota_exhausted`,
  trở thành read-only (Core Rule #6) NGAY TẠI bản commit gần nhất hợp lệ
  — đọc lại Nhật ký đầy đủ ngay sau đó cho kết quả GIỐNG HỆT trước khi
  khép (không mất lượt nào đã ghi thành công trước đó). WHEN kiểm tra
  `continuation_choice_eligible` (registry, `character-continuation.md`)
  ngay sau khi khép, THEN vẫn = 0 (quota-closure KHÔNG set
  `is_death_turn=true`, không kích hoạt "3 lối tiếp tục"). GIVEN slot đã
  khép do quota_exhausted, WHEN mở lại (Save Slot Screen → "Xem lại"),
  THEN hành vi giống hệt slot khép do `death` (Core Rule #6) — chỉ khác
  `slot_closure_reason` hiển thị.
- **AC-36** (Formula #2, `is_complete` tại `N=0` — bổ sung 2026-08-07,
  đóng gap `systems-designer` B1): GIVEN `N=0` (chưa hệ nào đăng ký), WHEN
  tính `is_complete(bundle)`, THEN = 0 (hoặc sentinel "không áp dụng",
  KHÔNG BAO GIỜ = 1) — mở rộng trực tiếp AC-13 (vốn chỉ assert
  `commit_allowed=0`, không assert `is_complete` tại cùng điều kiện này).
- **AC-37** (Formula #2, `blob_status=ERROR` có `error_code` riêng — bổ
  sung 2026-08-07, đóng gap `systems-designer` B2): GIVEN `N=3`, mock 1 hệ
  trả `blob_status=ERROR` (lỗi serialize, khác `MISSING`), WHEN
  Persistence xử lý, THEN log với `error_code=BLOB_ERROR` (Error
  Taxonomy) kèm `system_id` tương ứng — PHẢI khác `BLOB_MISSING` (đúng
  worked example của Formula #2, Equipment→ERROR do lỗi serialize —
  trước bản sửa này worked example dùng chính kịch bản này nhưng không
  AC nào assert `error_code` phát sinh).
- **AC-38** (Edge Case "Nhật ký rỗng ở lần ghi đầu tiên" — lượt đầu THỰC
  SỰ kích hoạt 1 lần ghi, không bị optimize-away — bổ sung 2026-08-07,
  đóng gap `qa-lead` B6): GIVEN slot vừa tạo (`world_time=0`, Nhật ký
  đầy đủ rỗng), WHEN lượt đầu tiên được xác nhận, THEN đúng 1 lần ghi
  atomic được kích hoạt (spy đếm = 1, KHÔNG phải 0 do implementation tối
  ưu hóa nhầm "chưa có gì để ghi thêm") VÀ sau khi ghi, `world_time=1` và
  Nhật ký đầy đủ chứa đúng 1 turn record.

## Open Questions

- ~~`quota_exhaustion_turn` chưa định nghĩa hành vi khi
  `quota_bytes ≤ fixed_blob_bytes`~~ — **đã chốt 2026-08-05**
  (`/design-review` gộp 11 GDD): `quota_exhaustion_turn = 0` (đã hết
  quota trước lượt đầu), xem Formula #1 + Trường hợp biên. *(Owner:
  systems-designer — Đã đóng)*
- **Điều kiện GIẢI PHÓNG khóa khi 2 tab cùng mở 1 slot chưa định nghĩa**
  (gap từ `qa-lead`, Edge Cases) — Edge Case hiện chỉ nói tab đầu tiên
  được ghi, tab thứ 2 bị chặn, nhưng chưa nói khi nào/làm sao tab thứ 2
  hết bị chặn (tab A đóng sạch? crash không đóng sạch? timeout?). **Bổ
  sung 2026-08-06** (`godot-specialist`, `/design-review`): KHÔNG có
  primitive built-in trong GDScript cho cross-tab locking — bất kỳ lựa
  chọn nào đều là JS glue code tùy biến qua `JavaScriptBridge`, không
  phải "chỉ cần 1 cờ boolean" như câu chữ Edge Case hiện đọc: (a) Web
  Locks API (`navigator.locks.request()`, tự động release khi tab đóng/
  crash), hoặc (b) tự cài lock record trong storage + heartbeat/timeout
  thủ công (yếu hơn — crash không đóng sạch tab sẽ kẹt khóa tới khi hết
  timeout). ADR cần ước lượng effort riêng cho việc này. **Bổ sung
  2026-08-06 vòng re-review tiếp theo** (`godot-specialist`,
  `/design-review`, ràng buộc hành vi cụ thể — không chỉ "chưa chốt cơ
  chế"): nếu chọn (a) Web Locks API, hành vi MẶC ĐỊNH của
  `navigator.locks.request()` là XẾP HÀNG CHỜ (callback tab B chỉ chạy
  khi tab A giải phóng, có thể là mãi mãi), KHÔNG từ chối tức thời —
  mâu thuẫn trực tiếp với AC-18/UI Requirements ("phát hiện NGAY khi mở
  slot"). ADR PHẢI dùng tùy chọn `{ifAvailable: true}` (trả `null` ngay
  lập tức nếu khóa đang bị giữ) — đây là ràng buộc hành vi bắt buộc, không
  phải chi tiết implementation tùy ý. Đồng thời: Web Locks là **Web
  Platform API**, không phải Godot API — hỗ trợ trên iOS Safari/in-app
  WebView (kênh phổ biến cho Mobile Web, target chính thức của dự án)
  chưa chắc đủ ổn định; spike PHẢI test trên đúng target thấp nhất trong
  ma trận Mobile Web dự án nhắm tới, không chỉ desktop Chrome/Firefox —
  nếu không khả dụng, coi (b) là baseline mặc định thay vì phương án dự
  phòng. Ngoài ra: toàn bộ chiến lược JS-glue (cả (a) lẫn (b), cả
  `StorageManager.estimate()`) phụ thuộc header CSP `unsafe-eval` của
  host — nếu host/CDN set CSP không có `unsafe-eval` (khá phổ biến ở
  host chú trọng bảo mật), `JavaScriptBridge.eval()` sẽ throw ngay khi
  gọi, chặn TOÀN BỘ nền móng kỹ thuật này, không chỉ 1 tính năng phụ —
  cần phối hợp `devops-engineer` xác minh ràng buộc CSP của host mục
  tiêu. Cuối cùng: nếu export Web bật Threaded/SharedArrayBuffer (cần
  header COOP/COEP), bước đồng bộ bền vững (`syncfs()`/tương đương) có
  thể THỰC SỰ CHẶN main thread (`Atomics.wait()`) thay vì non-blocking
  như giả định — ngược hẳn kỳ vọng UX "không gián đoạn tường thuật"; spike
  PHẢI test cả 2 trường hợp export threaded/non-threaded. *(Owner:
  technical-director, target: ADR Persistence, `/create-architecture` —
  toàn bộ đoạn bổ sung này PHẢI được gộp vào chính spike ưu tiên cao nhất
  đã có bên dưới ["Hành vi IDBFS/localStorage thật..."], vì đều là điều
  kiện tiên quyết để ADR chọn đúng phương án (a)/(b) ở Core Rule #3.)*
- **Timeout khi 1 hệ trả blob chậm/không phản hồi trong bước gom bundle
  chưa định nghĩa** (Công thức #2 tự flag, `qa-lead` xác nhận lại) — cần
  1 hằng số tương tự `ai_call_timeout_seconds`. **Gộp thêm** (bổ sung
  2026-08-06, `/design-review` — `systems-designer`): cùng ADR này cũng
  cần quyết định `blob_status(s)` và nội dung byte thật của blob có
  được đọc như MỘT lần gọi nguyên tử trên mỗi hệ hay không (tránh
  TOCTOU — trạng thái hệ thay đổi giữa lúc check status và lúc lấy nội
  dung byte thật). *(Owner: technical-director, target: ADR Persistence)*
- **AC-17, AC-22, AC-29 (tầng đo thật), và AC-33 phụ thuộc ADR trước khi
  có thể viết được** (bổ sung 2026-08-06, `/design-review` — `qa-lead`;
  **mở rộng 2026-08-06 vòng re-review tiếp theo** để gộp AC-29/AC-33 mới):
  không giống các AC khác, AC-17 (ngắt đột ngột giữa transaction, không
  kịp chạy code xử lý lỗi) không thể được biểu diễn bằng 1 mock đơn-luồng
  xác định trừ khi GDD/ADR trước tiên định nghĩa mô hình dữ liệu "đã ghi
  một phần, chưa commit" ở tầng mock (VD giao thức 2 pha: `stage(blobs[])`
  rồi `commit()`, có thể chèn điểm lỗi giữa 2 bước). AC-22 cần khả năng
  tương tự (hook vào 1 lần ghi đang chạy dở) nhưng ít nghiêm trọng hơn
  (chỉ cần 1 điểm chặn DI tiêu chuẩn, không cần mô phỏng process chết
  thật). AC-29 (tầng đo thật) cần storage backend THẬT đã chọn ở ADR để
  đo `durability_confirmed` end-to-end. AC-33 cần cơ chế giải phóng khóa
  cross-tab cụ thể đã chọn ở ADR. Khuyến nghị: ADR chọn storage backend
  nên đồng thời đặc tả giao thức mock 2 pha này ngay trong Core Rule #3,
  để AC-03/17/22 dùng chung 1 hợp đồng test được. *(Owner:
  technical-director, target: ADR Persistence)*
- **Schema `turn_snapshot` vẫn CHƯA được giải quyết bởi GDD này** —
  Persistence chủ động coi nó là 1 blob đối (Core Rule #2), nên open
  question gốc của `turn-manager.md` (field nào, ai sở hữu) vẫn còn treo
  nguyên. *(Owner: technical-director + systems-designer, target: trước
  `/design-system combat-system`, theo đúng target đã ghi ở
  `turn-manager.md`)*
- **Thuật toán nén vật lý cụ thể cho Nhật ký đầy đủ chưa chọn** (Core
  Rule #7, biến `compression_ratio` của Công thức #1) — GDD này chỉ đảm
  bảo tính chất "không mất nội dung logic" (AC-07), không chọn thuật
  toán. *(Owner: technical-director, target: `/create-architecture`)*
- ~~Hành vi IDBFS/localStorage thật trên Godot 4.6 HTML5 export chưa xác
  minh~~ — **SPIKE HOÀN TẤT 2026-08-08**, kết quả tại
  `docs/engine-reference/godot/modules/web-export.md` (đọc trực tiếp
  source code engine Godot `4.6-stable` + Emscripten `4.0.11`, không suy
  luận). **Kết quả từng câu hỏi con**:
  - ~~Chunking/atomicity: 1 write call GDScript = 1 đơn vị atomic
    IndexedDB thật?~~ — **ĐÃ TRẢ LỜI (VERIFIED)**: IDBFS KHÔNG chunk
    payload (1 file = 1 record); 1 sync pass = 1 transaction
    `readwrite` bao trọn mọi file dirty, có `oncomplete`/`onabort` thật
    — atomicity đa-blob CÓ THẬT qua cả (a) lẫn (b). Lo ngại ban đầu
    ("IDBFS có thể chunk") đã SAI.
  - ~~Controllability: GDScript await được `syncfs()` hoàn tất không?~~
    — **ĐÃ TRẢ LỜI (VERIFIED) — câu quyết định**: KHÔNG, qua `FileAccess`.
    `force_fs_sync()` chỉ dựng cờ dirty, sync thật chạy ở frame kế qua
    callback nội bộ không phát tín hiệu ra GDScript. Đây là lý do THẬT
    khiến (a) bị loại — không phải vì atomicity yếu (nó không yếu), mà vì
    KHÔNG QUAN SÁT ĐƯỢC. Xem Core Rule #3 đã chốt (b).
  - **Ma trận WebView đích danh (iOS Safari WKWebView, Android Chrome
    WebView, in-app browser Zalo/Facebook/Messenger)** — **VẪN MỞ,
    UNVERIFIED**, xếp hạng #4 trong 6 hạng mục prototype bắt buộc của
    spike: quota/`persist()` thật bên trong các WebView này chưa đo được
    qua tài liệu/source, cần thiết bị thật. *(Owner: technical-director,
    target: prototype trước ADR Persistence)*
  - **1 hạng mục MỚI phát sinh từ chính spike, xếp hạng #2 (ưu tiên cao
    thứ nhì)**: chứng minh `transaction.oncomplete` của (b) thực sự
    reach được GDScript qua `JavaScriptBridge.create_callback()` trong
    thực tế (không chỉ khả thi về mặt API), VÀ đo latency END-TO-END của
    đường (b) so với `max_perceived_autosave_latency_ms`. *(Owner:
    technical-director, target: prototype trước ADR Persistence)*
- **Rủi ro chiến lược: bump `schema_version` hậu-launch = mất vĩnh viễn
  TOÀN BỘ save của MỌI người chơi, không có đường lùi** (bổ sung
  2026-08-07, `/design-review` vòng 3 — `godot-specialist`, chưa từng
  được đặt tên trước đây): Core Rule #8 (từ chối load khi mismatch,
  không migrate ngầm) + Core Rule #9 (export 9b không phải backup,
  không import được) ghép lại nghĩa là: một bản patch thêm 1 hệ Feature
  mới (rất có thể xảy ra thường xuyên hậu-launch theo đúng tinh thần dự
  án đang mở rộng liên tục) sẽ khóa VĨNH VIỄN "cuốn nhật ký sống" của
  mọi người chơi đang có — đối lập trực tiếp Pillar 2. KHÔNG cần giải
  quyết ở vòng này — chỉ cần ghi nhận tường minh để tránh "quên âm thầm"
  thay vì "hoãn có ý thức". Posture khuyến nghị (creative-director):
  tiền-1.0/save-breaking là chấp nhận được (dự án cá nhân, người chơi là
  chính developer); từ thời điểm có người chơi ngoài, cần chiến lược
  migrate thật. *(Owner: technical-director + producer, target: ADR
  Persistence, quyết định TRƯỚC khi có người chơi ngoài đầu tiên)*
- **Đồng bộ/cloud save đa-thiết bị không nằm trong scope MVP** (bổ sung
  2026-08-07, `/design-review` vòng 3, cross-ref Core Rule #5) — có nên
  đưa vào scope Vertical Slice/Full Vision hay không là quyết định
  product, không phải kỹ thuật thuần. *(Owner: producer, target:
  `systems-index.md` Priority Tiers khi cần)*
- **API trình duyệt cụ thể để đo `quota_bytes_available` (Công thức #3):
  `StorageManager.estimate()` qua `JavaScriptBridge`** — **XÁC NHẬN KHẢ
  DỤNG bởi spike 2026-08-08** (`get_interface("navigator").storage.estimate()`,
  hỗ trợ đầy đủ từ Safari 17/iOS 17). Ghi chú độ chính xác (2026-08-06,
  `godot-specialist`) được spike XÁC NHẬN THÊM: Chrome/Firefox/Safari đều
  cố tình làm tròn/nhiễu (fuzz) kết quả để chống fingerprint — xấp xỉ CÓ
  CHỦ ĐÍCH, không phải thiếu công cụ đo; củng cố lý do `quota_warn_threshold`
  cần biên độ an toàn (Tuning Knobs). Utility "await 1 JS Promise từ
  GDScript" dùng chung cho `estimate()`/Web Locks: mẫu code tham khảo đã
  có sẵn tại `docs/engine-reference/godot/modules/web-export.md`
  ("Awaiting a JS Promise from GDScript without eval"). **VẪN MỞ**: quota
  thật đo được bên trong in-app WebView (Zalo/Facebook/Messenger) — cùng
  hạng mục prototype #4 ở Open Question trên; **MỚI phát hiện**:
  `navigator.storage.persist()` (yêu cầu lưu trữ bền vững, giảm rủi ro
  Safari ITP ~7 ngày) khả dụng qua cùng cầu nối nhưng KHÔNG chắc được
  cấp quyền cho kênh phân phối của dự án — thêm vào prototype #4. *(Owner:
  technical-director, target: ADR Persistence)*
- **Web Locks API (`navigator.locks.request()`) cho khóa đa-tab — xác
  nhận HỖ TRỢ TRÌNH DUYỆT tốt hơn lo ngại ban đầu bởi spike 2026-08-08**:
  `navigator.locks` có từ Safari 15.4 — iOS Safari VÀ in-app WebView
  (Zalo/Facebook/Messenger) đều thừa hưởng trên iOS 15.4+, giảm mạnh rủi
  ro "không có primitive built-in, phải dùng heartbeat/timeout yếu hơn"
  đã nêu trước đây — phương án (b) (lock record thủ công) KHÔNG CÒN cần
  là baseline mặc định chỉ vì lý do hỗ trợ. Reach từ GDScript qua
  `get_interface`/`create_object`/`create_callback` khả thi, KHÔNG cần
  `eval()`. **VẪN MỞ (UNVERIFIED), xếp hạng #3 trong prototype bắt buộc**:
  giữ 1 khóa `{ifAvailable: true}` MỞ xuyên suốt cả session (không chỉ
  1 lần request-rồi-nhả) đòi hỏi trả về 1 Promise JS còn treo rồi resolve
  sau từ GDScript — kỹ thuật khả thi về lý thuyết nhưng CHƯA từng test
  trong dự án này. Nếu thất bại, fallback đã có: lock record + heartbeat/
  timeout. *(Owner: technical-director, target: prototype trước ADR
  Persistence)*
- ~~CSP `unsafe-eval` có bắt buộc cho MỌI cách dùng `JavaScriptBridge`
  (chặn toàn bộ nền móng JS-glue: Web Locks, `estimate()`, IndexedDB)?~~
  — **ĐÃ TRẢ LỜI (VERIFIED) bởi spike 2026-08-08, SAI hoàn toàn**: chỉ
  `JavaScriptBridge.eval()` cần `unsafe-eval` — `get_interface()`,
  `create_object()`, `create_callback()` (đủ dùng cho MỌI nhu cầu của
  Web Locks/`estimate()`/IndexedDB ở trên) đều KHÔNG dùng `eval` nội bộ.
  **Khuyến nghị mới đã áp dụng**: thêm `JavaScriptBridge.eval()` vào
  Forbidden Patterns của `.claude/docs/technical-preferences.md` (biến
  rủi ro môi trường host thành 1 quy tắc code review, xem file đó).
  **CSP thật cần xác minh với host** (khác hẳn lo ngại ban đầu, phạm vi
  hẹp hơn nhiều): mọi Godot Web export là WASM, cần host cho phép
  `'wasm-unsafe-eval'` (Chrome 97+/Firefox 102+) hoặc `'unsafe-eval'` cũ
  ở CSP `script-src`/`default-src`, nếu không game không boot được — đây
  là yêu cầu hosting độc lập với `JavaScriptBridge`, `devops-engineer`
  cần xác minh với host mục tiêu. *(Owner: devops-engineer, target: trước
  deploy đầu tiên — Đã đóng phần kỹ thuật engine)*
- **Hành vi chia sẻ quota giữa nhiều slot chưa rõ** (Công thức #1 edge
  case: mỗi slot tính riêng nhưng cạnh tranh chung 1 quota trình duyệt)
  — thuộc cùng phạm vi ADR HTML5/IDBFS ở trên. *(Owner:
  technical-director, cùng target ADR HTML5/IDBFS)*
- **Khoảng trống phụ thuộc một chiều** (mở rộng 2026-08-06,
  `/design-review`): 4 gap cùng dạng, cần xử lý bằng footnote ở
  `systems-index.md`: (a) `equipment-skill-data-system.md` (Approved)
  chưa liệt kê Persistence/Save System trong Dependencies của chính nó
  (đã biết từ trước); (b) `combat-system.md` (Designed) — KHÔNG hề nhắc
  Persistence dù GDD này liệt kê Combat System là downstream hard
  dependency; (c) `exp-realm-progression.md` (Designed) — cùng dạng,
  không nhắc Persistence; (d) `death-and-consequence.md` (Designed) —
  cùng dạng, không nhắc Persistence. Xử lý theo đúng tiền lệ dự án
  (footnote, không sửa GDD đã Designed/Approved của hệ khác). *(Owner:
  producer/systems-designer)*

- **Save Slot Screen chưa có công thức virtualize riêng** (bổ sung
  2026-08-06, `/design-review` — `ux-designer`): Core Rule #5 xác nhận
  không giới hạn cứng số slot; `core-ui-screen-navigation.md` hiện chỉ
  ẩn dụ "cùng tinh thần D.3" (Story Log) cho danh sách slot, không có
  window size/prefetch threshold/eviction rule riêng cho `slot_id` như
  Story Log đã có. Không phải gap của Persistence (chrome/layout thuộc
  `core-ui-screen-navigation.md`) nhưng cần route sang đó trước
  `/ux-design save-slot-screen.md`. *(Owner: ux-designer, target:
  `core-ui-screen-navigation.md` hoặc `/ux-design save-slot-screen.md`)*

**Đóng 1 Open Question của `turn-manager.md`**: câu hỏi "world_time và
lịch sử lượt cần 'inspect được' (qua save file hoặc debug UI) để kiểm
chứng AC-07/AC-08/AC-10 mà không cần đọc source code" (owner đề xuất:
qa-lead, target: GDD này) — **đã giải quyết** bởi Core Rule #9 (QA
export) + AC-09 của GDD này: thao tác xuất Nhật ký đầy đủ ra JSON cho
phép kiểm chứng trực tiếp mà không cần đọc source code. Đã đóng chéo tại
`turn-manager.md`.
