# Core UI / Screen Navigation

> **Status**: Approved
> **Author**: duchx + Claude Code agents (systems-designer: Formulas; art-director: Visual/Audio; qa-lead: Acceptance Criteria)
> **Last Updated**: 2026-09-01 — additive amendment (Core Rule #3c, Formula D.7, AC-71–82, nhóm F) thay ô tự do bằng composer hành động có cấu trúc (Tường thuật/Đối thoại NV chính/Đối thoại NPC, xen kẽ tự do, tìm kiếm NPC đã biết + gõ tên NPC mới) theo quyết định chủ dự án — no re-review of THIS GDD's own approval was triggered; xem thêm 2026-08-07 additive edits từ `/design-review persistence-save-system.md` round 3 (new `O-ConfirmDelete` overlay + AC-64/AC-70/D.2 graph entries, `slot_closure_reason` display split, new-device empty-state note, export description sync) bên dưới; see `design/gdd/reviews/core-ui-screen-navigation-review-log.md` for the 6-round history this builds on.
> **Implements Pillar**: Pillar 4 (Tường Thuật Sống Động), Pillar 2 (Hệ Quả Thực Sự)
> **Creative Director Review (CD-GDD-ALIGN)**: APPROVED (2026-08-04, 6 rounds of `/design-review` — round 6 used a 2-agent pass [`ux-designer` + `qa-lead`] + senior synthesis, per the round-5 staffing recommendation). Core architecture (D.1/D.2/D.3/D.5/D.6, 3-tier display model) held stable across all 6 adversarial rounds — 0 architecture-level findings in round 6; the 5 blocking + 8 recommended items found were bookkeeping-class (stale duplicated constant, wrong AC cross-reference, a missing invariant AC mirror, a missing effectiveness-test parity) and were fixed same session. **Gate**: a throwaway prototype for D.3b (promised since round 4) is required as an implementation entry criterion before cutting the D.3b story — not a blocker for this GDD's approval (see Open Question #13 and D.3b). See `design/gdd/reviews/core-ui-screen-navigation-review-log.md` for full history.

## Overview

**Core UI / Screen Navigation** là khung trình bày và điều hướng toàn cục của Vô Danh Lục — hệ thống sở hữu **màn hình chơi chính** (khung tường thuật + khu nhập hành động với 4 gợi ý, chip intent, composer hành động có cấu trúc) và điều phối việc di chuyển giữa số ít bề mặt còn lại: Save Slot Screen (điểm vào khi mở game), Nhật ký câu chuyện (Story Log), overlay Thẻ Nhân Vật, và màn hình 3 lối tiếp tục sau cái chết. Hệ này **không sở hữu nội dung** bên trong các bề mặt đó — nội dung thuộc về các GDD tương ứng (Persistence, World Memory, Character Card, Character Continuation) — nó sở hữu **cấu trúc điều hướng, luật ưu tiên hiển thị giữa các bề mặt, các điểm vào (nút, tap-tên nhân vật qua `card_exists`), và việc thực thi trạng thái khóa input của Turn Manager ở tầng hiển thị** (Resolving/Undoing → từ chối thao tác thứ hai). Với người chơi, đây là hệ quyết định cảm giác toàn cục của game: không phải một "app có nhiều màn hình" mà là **một cuốn nhật ký đang mở** — xem thẻ, đọc lại chuyện cũ, hay chọn slot chỉ là lật sang trang khác của cùng cuốn sổ (Visual Identity Anchor "Mực Chưa Khô"). Nếu thiếu hệ này, 14 hệ thống còn lại có đầy đủ nội dung nhưng không có cửa vào — không tồn tại đường đi nào từ lúc mở game đến lượt chơi đầu tiên.

## Player Fantasy

**Cảm giác đích: "Tôi đang cầm cuốn nhật ký tu luyện của chính mình — không phải đang dùng một app."**

Người chơi không bao giờ có cảm giác "chuyển màn hình". Mở Thẻ Nhân Vật là **lật nghiêng một trang để xem mặt sau**; đọc Story Log là **giở ngược về các trang đã viết**; chọn slot là **rút một cuốn sổ từ ngăn kéo**. Điều hướng tốt nhất trong game này là điều hướng người chơi không nhận ra — mạch đọc tiểu thuyết không bao giờ bị cắt bởi loading screen, menu dạng lưới, hay bất kỳ chrome nào gợi nhắc "đây là phần mềm" (phản-HUD, theo "Mực Chưa Khô").

**Khoảnh khắc neo** (player moment): giữa một tình huống căng — người chơi tap tên đối thủ ngay trong câu văn đang đọc, thẻ nhân vật loang mực mở ra *đè lên* trang truyện, xem chỉ số, đóng lại — và câu văn vẫn nằm nguyên chỗ cũ, chưa mất một nhịp đọc nào. Cảm giác cần đạt: *"tôi vừa liếc tài liệu, chưa hề rời bàn."*

**Trọng lượng của thao tác**: vì Pillar 2 (Hệ Quả Thực Sự), khu nhập hành động phải mang cảm giác **chấp bút** — viết dòng tiếp theo vào nhật ký — chứ không phải bấm nút lệnh. Nút Undo hiếm hoi (chỉ 1 lượt) xuất hiện như quyền *gạch dòng vừa viết khi mực còn ướt*; khi nó biến mất, người chơi hiểu ngay: mực đã khô, chuyện đã thành sử.

**Phản-fantasy** (những cảm giác phải tránh): cảm giác "app nhiều tab" (bottom nav bar kiểu mobile app), cảm giác "game menu" (pause screen, settings chiếm chỗ trang trọng), và cảm giác "bị giam" khi input khóa lúc Resolving — chờ AI phải đọc ra thành *"thế giới đang viết nốt trang này"*, không phải spinner của phần mềm.

**Pillar phục vụ**: Pillar 4 — *"luôn ưu tiên tường thuật, số liệu chỉ là hậu trường"* (mọi bề mặt số liệu đều là overlay tạm, văn xuôi là mặc định); Pillar 2 — Undo 1-lượt hiển thị đúng như thiết kế test của pillar: *"undo đúng 1 lượt gần nhất để sửa lỗi thao tác, khóa vĩnh viễn ngay khi lượt kế tiếp được xác nhận."*

## Detailed Design

### Core Rules

**#1 — Mô hình 3 tầng hiển thị.** Toàn bộ UI xếp vào đúng 3 tầng, ưu tiên từ thấp đến cao:

- **Tầng màn hình** (1 màn hình active tại mọi thời điểm): Save Slot Screen, Màn chơi chính, Story Log, Màn hình 3 lối. Chuyển màn hình = lật trang, không có loading screen (mọi dữ liệu đều local, trừ AI call).
- **Tầng overlay** (đè lên màn hình, tối đa 1 overlay mở tại một thời điểm): Thẻ Nhân Vật, Bảng Settings, **Dialog xác nhận xóa slot** (bổ sung 2026-08-07, `/design-review persistence-save-system.md` vòng 3 — đóng gap `ux-designer`: cơ chế "gõ lại tên xác nhận xóa" của Persistence [vòng 2] tạo ra 1 bề mặt tương tác thứ 3 — dialog có Ô NHẬP VĂN BẢN, khác hẳn banner [dismiss-only] và O-Card/O-Set [không có input field] — chưa từng được đưa vào mô hình 3 tầng này). Mở/đóng overlay không tiêu tốn lượt, không làm mất vị trí cuộn của màn hình bên dưới.
- **Tầng banner** (thông báo không chặn): cảnh báo quota, lỗi ghi save, lỗi load/schema mismatch, xung đột đa-tab tại Save Slot Screen (Persistence — mở rộng 2026-08-06, `/design-review` `persistence-save-system.md`; bổ sung xung đột đa-tab cùng đợt re-review, đóng gap trước đây chỉ liệt 3/5 mã lỗi hiển thị người chơi của Persistence — mã lỗi thứ 5, `LOAD_FAILED_UNREADABLE`, KHÔNG dùng banner, xem mục 4). Banner hiện tại chỗ trên màn hình hiện hành, không bao giờ là modal, không bao giờ tự điều hướng.

**#2 — Save Slot Screen là gốc.** Mở game → luôn vào Save Slot Screen (hệ #6 sở hữu nội dung). Từ đây: "Tiếp tục"/"Bắt đầu mới" → Màn chơi chính; "Xem lại" (slot đã khép) → Story Log ở **chế độ read-only**.

**#3 — Màn chơi chính là mặc định trong phiên.** Gồm: khung tường thuật (cuộn dọc, cửa sổ trượt tối đa `LIVE_WINDOW_TURNS` lượt resident — D.3b), header cảnh (nội dung thuộc Situation Gen — tên địa điểm + triện nguy hiểm, không sticky), và khu nhập hành động (4 thẻ gợi ý + hàng chip intent + composer hành động có cấu trúc, xem Core Rule #3c — nội dung thuộc Situation Gen/Turn Manager). **Điểm vào điều hướng lặp lại ở CẢ HAI đầu luồng cuộn**: 3 bút tích nhỏ 「Thẻ」 (thẻ bản thân — vị trí mà hệ #14 ủy quyền cho hệ này), 「Lục」 (Story Log), 「Mục」 (menu: Về danh sách sổ / Settings) — xuất hiện ở lề header cảnh (đỉnh, không sticky) VÀ nhân bản cạnh khu nhập hành động (đáy luồng cuộn, cùng ngôn ngữ marginalia, không sticky) — không cần cuộn ngược lên đỉnh để mở Thẻ/Log/Menu khi đang ở trạng thái đọc-hành động ổn định (đáy trang). Không thêm bất kỳ thanh chrome thường trực nào khác ngoài 2 vị trí lặp này.

**#3b — Pending Fate (Kết liễu/Tha mạng) mang trọng lượng thị giác riêng.** Gợi ý Kết liễu/Tha mạng (#12 Death & Consequence) đi qua đúng khung 4-gợi-ý chuẩn — KHÔNG UI riêng, KHÔNG xác nhận 2 bước — nhưng thẻ đó render **đậm mực hơn 1 bậc** so với 3 thẻ còn lại, VÀ **KHÔNG có chip intent đi kèm** (không có đường vòng qua chip cho đúng lượt đó — buộc tap trực tiếp thẻ hoặc dùng composer hành động có cấu trúc, Core Rule #3c). Đây là ứng dụng đầu tiên và duy nhất của triết lý "màu khẩu phần — hiếm mới có nghĩa" (mục 10 Visual/Audio) vào chính khung 4-gợi-ý, đúng đúng chỗ Player Fantasy gọi là "trọng lượng của thao tác — chấp bút" (không phải danh sách chọn nhanh đồng dạng). Ai sở hữu: #12 sở hữu nội dung/điều kiện kích hoạt; #15 sở hữu luật hiển thị trọng lượng này.

**#3c — Composer hành động có cấu trúc, thay ô tự do** (bổ sung 2026-09-01, theo quyết định chủ dự án). Ô tự do đơn dòng trong khu nhập hành động (Core Rule #3) bị **THAY THẾ HOÀN TOÀN** bằng một bộ soạn thảo có cấu trúc ("composer") — không tồn tại song song 2 chế độ (freeform cũ đã bị gỡ, không phải tùy chọn nâng cao).

- Người chơi dựng lượt hành động của mình từ **nhiều đoạn có thứ tự**, mỗi đoạn thuộc đúng 1 trong 2 loại: **Tường thuật** (văn xuôi tự do) hoặc **Đối thoại** (1 câu thoại gắn 1 người nói). Hai loại **xen kẽ tự do** theo đúng thứ tự người chơi sắp xếp (VD: tường thuật → thoại NV chính → thoại NPC X → tường thuật → thoại NPC Y).
- Người nói của 1 đoạn Đối thoại là (a) **Nhân vật chính**, hoặc (b) **1 NPC** — chọn qua ô tìm kiếm gợi ý NPC **đã biết** (nguồn: `card_exists=true ∧ alive=true`, tái dùng đúng predicate Core Rule #8 đã dùng cho tap-tên/「Thẻ」 — không phát sinh nguồn dữ liệu song song, xem Formula D.7 + Dependencies), **HOẶC** gõ tự do 1 tên **hoàn toàn mới** (NPC chưa từng xuất hiện) — AI có trách nhiệm để nhân vật đó "xuất hiện" hợp lý ở lượt kể tiếp theo (nội dung đó ngoài scope hệ này — thuộc Situation Gen/AI Layer).
- Khi submit, **toàn bộ payload** (đúng thứ tự + loại + người nói từng đoạn, xem Formula D.7 cho data schema đầy đủ) được gửi thay cho chuỗi tự do cũ — vẫn cùng 1 `action = submit_action` trong bảng phân loại D.1 (**KHÔNG** phát sinh action mới). Composer chỉ đổi **hình dạng dữ liệu** đi kèm `submit_action`, không đổi điều kiện được phép gửi — D.1 nguyên vẹn (D.7 mở rộng bằng AND, không sửa chữ ký).
- Composer sống trong **đúng subtree bị khóa đệ quy** khi Resolving/Undoing (Godot notes, mở rộng nguyên trạng từ "ô tự do" cũ) — mọi thao tác soạn thảo bên trong (thêm/xóa đoạn, đổi loại, gõ ô tìm NPC) bị khóa **cùng lúc** với nút Gửi, không tách riêng thành 1 lớp gate mới.
- **Mở rộng tường minh Core Rule #9**: cam kết "giữ nguyên nội dung người chơi đã gõ qua AI timeout" nay áp dụng cho **toàn bộ payload composer** (mọi đoạn, đúng thứ tự/loại/speaker) — không chỉ 1 chuỗi văn bản.
- Ai sở hữu: hệ #15 sở hữu composer + payload shape; #14 sở hữu predicate `card_exists`/`alive` làm nguồn "đã biết"; Turn Manager (#1) sở hữu việc tiêu thụ payload (xem cross-system note ở Dependencies).

**#4 — Khóa input có một nguồn sự thật duy nhất.** UI đọc trạng thái Turn Manager (Awaiting Action / Resolving / Undoing) và áp dụng luật:

- **Resolving/Undoing khóa mọi thao tác ghi-trạng-thái**: submit hành động, chip, thẻ gợi ý, Undo, nút Song Tu/Hồi phục trên Card (đúng luật hệ #14), "Về danh sách sổ", "Xóa slot". Trạng thái disabled = mờ mực (giảm alpha), không đổi màu.
- **Thao tác chỉ-đọc luôn tự do**: mở/đóng Thẻ, đọc Story Log, cuộn, mở Settings. Người chơi không bao giờ bị "giam" hoàn toàn trong lúc chờ AI.
- Submit lần 2 trong lúc Resolving bị **từ chối ở tầng UI** (không đến được Turn Manager) — thực thi bằng khóa đệ quy cả cây node khu nhập.

**#5 — Nút Undo hiện/ẩn theo đúng `undo_availability_window`.** Khi `undo_available=false` nút **biến mất hoàn toàn** (không phải disabled) — kể cả ngay sau lượt `is_death_turn=true`. Đây là biểu hiện UI của Pillar 2: nút tồn tại = mực còn ướt.

**#6 — Takeover 3 lối.** Khi `continuation_choice_eligible=true`: khu nhập hành động + chip + gợi ý bị gỡ hoàn toàn ngay (Turn Manager không hoạt động, đúng hệ #13), NHƯNG Màn hình 3 lối KHÔNG thay thế Màn chơi chính ngay lập tức — S2 hiện tiếp đoạn văn lượt chết vừa resolve, kèm 1 dòng dẫn cuối đoạn chờ người chơi **CHẠM** để tiếp tục. Dòng dẫn thuộc **Họ B** của ngôn ngữ marginalia (mục 1, Visual/Audio — đậm hơn thân văn 1 bậc, không phải nhạt hơn như 3 bút tích thường trực), nội dung **"… (chạm để tiếp tục)"** kèm 1 nhịp "thở" alpha chậm (xem Visual/Audio mục 2). **Auto-scroll bắt buộc tới dòng dẫn**: NGAY khi `continuation_choice_eligible=true` được set (đoạn văn lượt chết vừa render xong), S2 tự cuộn xuống đúng vị trí dòng dẫn — không chờ người chơi tự cuộn (S2 vốn "không sticky footer, cuộn xuống để hành động", nhưng đây là hành động BẮT BUỘC DUY NHẤT không auto-timeout, nên là 1 ngoại lệ tường minh cho đúng khoảnh khắc cao-stakes nhất game; khác mọi trường hợp khác của S2 nơi cuộn luôn do người chơi chủ động). Đây là exception DUY NHẤT của luật "không sticky/không auto-scroll" toàn game. **Nếu người chơi thoát về S1 qua 「Mục」 trước khi chạm dòng dẫn**: slot GIỮ NGUYÊN trạng thái "đang chơi" (đúng bảng States S1: mọi slot không đang Resolving đều khả dụng "Tiếp tục") — `continuation_choice_eligible` vẫn `true` trong dữ liệu slot; mở lại qua "Tiếp tục" → về đúng S2, đoạn văn lượt chết + dòng dẫn (kèm auto-scroll + nhịp thở) render lại y hệt, KHÔNG coi slot là "đã khép" (đó chỉ xảy ra sau khi thật sự vào S5 và chọn xong 1 trong 3 lối). Chạm dòng dẫn đó mới kích hoạt takeover thật: Màn hình 3 lối thay thế Màn chơi chính. Điểm vào 「Lục」 và 「Thẻ」 **vẫn còn** (read-only — xem lại đời vừa kết thúc, thẻ mang triện `alive=false`); 「Mục」 chỉ còn "Về danh sách sổ". Chọn "Chơi lại" thành công → về Màn chơi chính trên slot mới. **Rationale nhịp chạm**: bảo toàn "trọng lượng của thao tác" (Player Fantasy, Pillar 2) — chuyển sang màn 3 lối là cú chấp bút cuối cùng của một đời, không phải side-effect tự động của 1 cờ hệ thống; đối xứng với luật hoãn takeover đã có sẵn khi người chơi đang đọc Story Log (xem Edge Cases).

**#7 — Chế độ read-only (slot đã khép).** Vào từ "Xem lại": chỉ có Story Log + overlay Thẻ (tap-tên hoạt động bình thường); không có khu nhập, không có đường vào Màn chơi chính; mọi nút ghi-trạng-thái không render. Thoát duy nhất → Save Slot Screen.

**#8 — Điểm vào Thẻ Nhân Vật.** Hai điểm vào MVP: (a) **tap-tên trong văn tường thuật** — mọi tên có `card_exists=true` là tap target, hoạt động ở cả Màn chơi chính, Story Log (kể cả read-only), và Màn hình 3 lối; (b) **bút tích 「Thẻ」** (thẻ bản thân) — ở lề header cảnh (S2, S5) VÀ trên thanh chrome Story Log (S4/S4-RO — mở thẻ nhân vật chính của đời đang xem; GAP-3: nếu thiếu, người đang đọc Log không có đường mở thẻ bản thân). Danh sách nhân vật/địa điểm làm điểm vào thứ 3 — **ngoài scope MVP** (đúng ủy quyền hệ #14 đã hoãn).

**#9 — Trạng thái chờ AI.** Trong Resolving, khung tường thuật hiển thị chỉ báo "thế giới đang viết" (nét mực đang kéo dài — không phải spinner). Quá `ai_call_timeout_seconds=30` → AI layer báo lỗi → UI trả người chơi về Awaiting Action với thông báo trong khung tường thuật (không banner, không mất world_time — đúng AC-13 Turn Manager). **Ô tự do GIỮ NGUYÊN nội dung người chơi đã gõ qua timeout** — không xóa, không reset; nguyên tắc UX cơ bản là không hủy input người dùng khi hệ thống lỗi, đặc biệt khi hành động tự do đã được Player Fantasy gán ý nghĩa "chấp bút" (mất công gõ lại là frustration không cần thiết). *(mở rộng 2026-09-01: cam kết này nay áp dụng cho toàn bộ payload composer, xem Core Rule #3c.)*

**#10 — Settings tối thiểu (MVP).** Overlay mở từ 「Mục」 (có mặt ở cả Save Slot Screen và Màn chơi chính), gồm đúng 2 nhóm: (a) **Cỡ chữ** — 3 nấc S/M/L, áp dụng toàn cục qua Theme scale, lưu ở cấu hình cấp-thiết-bị (ngoài slot bundle — không thuộc Persistence, xem Dependencies); (b) **Cấu hình AI** — ô nhập API key; danh sách field chính xác **do ADR backend AI quyết định**, GDD này chỉ giữ chỗ nhóm mục.

### States and Transitions

| # | Trạng thái | Vào từ | Thoát đến | Điều kiện |
|---|---|---|---|---|
| S1 | Save Slot Screen | Mở game; S2/S4/S5 qua "Về danh sách sổ"; S4-RO thoát | S2 (Tiếp tục/Bắt đầu mới), S4-RO (Xem lại) | luôn khả dụng khi không Resolving |
| S2 | Màn chơi chính — Awaiting Action | S1; S2-R xong; S2-U xong; S5 (Chơi lại OK); S4 (lật về) | S2-R (submit), S4 (「Lục」), S1 (menu), S2-U (Undo) | theo Turn Manager |
| S2-R | Màn chơi chính — Resolving | S2 submit | S2 (thành công/lỗi AI), S2-D | khóa ghi-trạng-thái (#4) |
| S2-U | Màn chơi chính — Undoing | S2 bấm Undo | S2 | khóa như S2-R |
| S2-D | Turn Confirmed, `is_death_turn=true` | S2-R | S5 | Undo ẩn vĩnh viễn (#5); khi `continuation_choice_eligible=true` hiện dòng dẫn cuối đoạn văn, chuyển sang S5 khi người chơi CHẠM dòng dẫn đó — không tự động |
| S4 | Story Log (live) | S2 「Lục」 (cả ở Awaiting Action lẫn trong Resolving — đọc trong lúc chờ được phép, #4) | S2 (lật về) | chỉ-đọc |
| S4-RO | Story Log (read-only) | S1 "Xem lại"; S5 「Lục」 | S1 (hoặc S5 nếu vào từ S5) | không nút ghi-trạng-thái (#7) |
| S5 | Màn hình 3 lối | S2-D | S2 (slot mới), S1 (menu), S4-RO (「Lục」) | takeover (#6); Reset Failed hiện inline + Thử lại |
| O-Card | Overlay Thẻ | tap-tên / 「Thẻ」 từ S2, S4, S4-RO, S5 | đóng (X / tap ngoài / Esc) | không tiêu lượt; nút ghi-trạng-thái tuân #4 |
| O-Set | Overlay Settings | 「Mục」 từ S1, S2 | đóng | không tiêu lượt |
| O-ConfirmDelete | Dialog xác nhận xóa slot | "Xóa" từ S1 (mọi trạng thái slot — đang chơi/đã khép/không đọc được, `persistence-save-system.md` UI Requirements) | đóng (xác nhận thành công → slot xóa, tự đóng) / Hủy / Esc / tap ngoài | **bổ sung 2026-08-07** — chỉ mở được từ S1 (khác O-Card/O-Set); chứa ô nhập text ở nhánh escalated (gõ lại tên nhân vật, `persistence-save-system.md` Edge Cases) — layout PHẢI tránh vùng bàn phím ảo che khuất (xem UI Requirements, Settings §O-Set đã có tiền lệ) |

### Interactions with Other Systems

| Hệ | Chiều | Dữ liệu qua interface | Ai sở hữu |
|---|---|---|---|
| Turn Manager | đọc + gửi | Đọc state machine (Awaiting/Resolving/Undoing/`is_death_turn`) + `undo_available`; gửi action submit + lệnh Undo qua đường chuẩn. **Mở rộng 2026-09-01**: payload gửi lên nay là `ActionPayload` có cấu trúc (D.7), không còn chuỗi tự do phẳng — cần Turn Manager (#1) xác nhận tiếp nhận | Turn Manager sở hữu state; hệ này sở hữu cách thể hiện |
| Contract Enforcement | ràng buộc | Hệ này là **mặt thực thi hiển thị** của Core Rule #4 bên đó: số liệu chỉ render trong khung con dấu ở các bề mặt UI, không bao giờ trong văn tường thuật | Contract Enforcement sở hữu luật |
| Situation Gen | đọc | Menu chip intent + nhóm theo NPC, header cảnh (location + triện), nudge heuristic (1 dòng gợi ý, không auto-activate) | Situation Gen sở hữu nội dung; hệ này sở hữu khung render |
| Combat | ràng buộc | Ràng buộc áp cho HỆ THỐNG: Combat không bao giờ tự kích hoạt chuyển màn hình (không màn combat riêng/mode-switch); điều hướng do người chơi trong trận vẫn theo D.1/D.2 chuẩn (an toàn nhờ auto-save + `turn_snapshot` serialize trạng thái trận — GAP-2); danh sách hành động trận đấu đi qua đúng khung 4-gợi-ý chuẩn | Combat sở hữu nội dung |
| Character Card (#14) | cung cấp | Điểm vào tap-tên (query `card_exists`) + bút tích 「Thẻ」 + tầng overlay; timing mở thẻ theo knob `card_transition_ms` bên đó. **Mở rộng 2026-09-01**: + liệt kê known-NPC (`card_exists ∧ alive`) cho ô tìm kiếm composer (D.7) — MỞ RỘNG interface Hard đã có, cần `list_known_npc_names` mới | Hệ này sở hữu điểm vào; #14 sở hữu nội dung thẻ |
| World Memory | đọc | Nội dung Story Log qua API phân trang (lazy-load bắt buộc); marker "Lượt N" | World Memory sở hữu dữ liệu |
| Persistence | đọc + hiển thị | Danh sách slot + metadata; banner quota/lỗi ghi (tầng banner, #1); auto-save vô hình với UI | Persistence sở hữu logic; hệ này sở hữu chỗ đặt banner |
| Character Continuation | đọc | Cờ `continuation_choice_eligible` kích takeover S5; trạng thái Reset Failed + retry | #13 sở hữu nội dung màn 3 lối |
| Death & Consequence | pass-through | Gợi ý Kết liễu/Tha mạng (Pending Fate) đi qua khung 4-gợi-ý chuẩn — **KHÔNG UI riêng, nhưng thẻ mang trọng lượng thị giác riêng** (đậm mực hơn 1 bậc, KHÔNG chip intent đi kèm, xem Core Rule #3b) | #12 sở hữu nội dung; #15 sở hữu luật hiển thị trọng lượng |
| AI/LLM Layer | gián tiếp | Chỉ báo "đang viết" trong Resolving; ngưỡng `ai_call_timeout_seconds=30` | AI layer sở hữu timeout |
| Setting & Canon / NPC Affinity / EXP | gián tiếp | Mọi hiển thị đi qua Card hoặc khung tường thuật — không interface trực tiếp | các hệ tương ứng |

## Formulas

*(Đề xuất bởi `systems-designer`, duyệt 2026-08-04. D.6 giữ dạng formula theo quyết định người dùng; `TOUCH_TARGET_MIN` + `card_transition_ms` sẽ đăng ký registry.)*

### D.1 — `write_action_allowed(action, tm_state, screen)`

```
class(action) ∈ {mutating, readonly}   // bảng phân loại cố định bên dưới — KHÔNG đổi theo screen
write_action_allowed(action, tm_state, screen) =
    1                                          if class(action) = readonly
    1                                          if action = tap_back_to_slots ∧ screen = S5
    (tm_state = awaiting_action)               otherwise  // mọi action mutating khác, VÀ tap_back_to_slots khi screen ≠ S5
```

**Bảng phân loại action** (dữ liệu hỗ trợ, để QA lặp hết mọi cặp) — `class` không đổi theo `screen`; carve-out `screen=S5` cho riêng `tap_back_to_slots` nằm ở nhánh thứ 2 của formula trên, không phải ngoại lệ nằm ngoài bảng:

| `class = mutating` (khóa khi Resolving/Undoing, TRỪ carve-out `screen=S5` ở trên) | `class = readonly` (luôn tự do) |
|---|---|
| `submit_action`, `tap_suggestion_card`, `tap_intent_chip` | `open_card`, `close_card`, `tap_name_link` (mở Card) |
| `tap_undo` | `open_story_log`, `scroll_story_log` |
| `tap_song_tu_button`, `tap_recovery_button` (trên Card, luật hệ #14) | `open_settings`, `close_settings` |
| `tap_back_to_slots`, `tap_delete_slot` | — |

*Ghi chú (GAP-4): 3 hành động KHÔNG được D.1 gate thuần theo `tm_state`:*

- *`tap_retry_reset` (nút "Thử lại" ở S5) — khóa theo `state` của Character Continuation (#13): mờ mực khi `state = "Processing Chơi Lại"`, mở khóa khi `state = "Reset Failed"` — KHÔNG phải cờ boolean riêng (`reset_in_progress` là tên gọi tắt/derived, không phải field mới do #13 phải định nghĩa thêm; xem Edge Cases).*
- *`tap_back_to_slots` — gate hình thức hóa trực tiếp trong chữ ký hàm (nhánh 2): `screen=S5` → luôn `1` (khớp cạnh D.2 `S5→S1` guard `true`); mọi `screen` khác kể cả S2 → theo `tm_state` như mọi action `mutating` khác (khớp cạnh D.2 `S2→S1` guard `tm_state=awaiting_action`). KHÔNG phải 2 action khác nhau — 1 action, gating phụ thuộc `screen` được khai tường minh trong domain của hàm.*
- *`tap_continue_to_fate` (dòng dẫn tap-to-continue trước S5 takeover — xem Core Rule #6): xuất hiện SAU khi lượt chết đã confirm, Turn Manager đã kết thúc vòng lượt đó — không có `tm_state` nào đang chờ ghi. Luôn khả dụng khi dòng dẫn hiện (không khóa, không mờ mực); test riêng ở AC-57.*

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Hành động đang xét | `action` | enum | 15 giá trị bảng trên (8 mutating + 7 readonly) | Sự kiện input người chơi gửi tới UI |
| Lớp hành động | `class(action)` | enum | `{mutating, readonly}` | Tra bảng tĩnh, không đổi runtime, KHÔNG phụ thuộc `screen` |
| Trạng thái Turn Manager | `tm_state` | enum | `{awaiting_action, resolving, undoing}` | Nguồn sự thật duy nhất (Core Rule #4); vô nghĩa khi `screen=S5` (Turn Manager không hoạt động, Core Rule #6) nhưng formula không cần đọc nó trong nhánh đó |
| Màn hình nguồn | `screen` | enum | `{S1,S2,S4,S4-RO,S5}` | Chỉ ảnh hưởng kết quả khi `action=tap_back_to_slots`; bị bỏ qua cho 14 action còn lại |
| Kết quả | `write_action_allowed` | bool | `{0,1}` | `1` = UI cho phép gửi hành động này ngay bây giờ |

**Output Range:** Boolean thuần, hàm tổng (total function) — mọi bộ ba `(action, tm_state, screen)` hợp lệ luôn có đúng 1 kết quả. Ma trận test đầy đủ: 15 action × 3 `tm_state` = 45 tổ hợp cơ bản (đúng cho 14/15 action bất kể `screen`, và đúng cho `tap_back_to_slots` khi `screen≠S5`) **CỘNG** 1 tổ hợp bổ sung `tap_back_to_slots @ screen=S5` (kết quả `1` bất kể `tm_state`, vì `tm_state` không được đọc trong nhánh đó) = **46 tổ hợp có kết quả riêng biệt**.

**Example:** `write_action_allowed(tap_undo, resolving, S2) = 0`; `write_action_allowed(open_card, resolving, S2) = 1` (mở Card lúc AI đang viết vẫn được); `write_action_allowed(tap_back_to_slots, awaiting_action, S2) = 1`; `write_action_allowed(tap_back_to_slots, resolving, S5) = 1` (carve-out — `tm_state` bị bỏ qua vì Turn Manager không hoạt động tại S5, khác kết quả nếu cùng `tm_state=resolving` mà `screen=S2` thì phải là `0`).

**Edge cases:**
- Formula này **không** kiêm việc ẩn/hiện nút Undo — đó là `undo_availability_window` (registry, Turn Manager). Nút Undo phải thỏa **CẢ HAI**: `undo_available=true` (output của formula `undo_availability_window` — mới render nút) AND `write_action_allowed(tap_undo, tm_state, S2)=1` (mới bấm được — `tap_undo` chỉ xuất hiện tại S2, `screen` luôn `=S2`) — khi `is_death_turn=true`, vế đầu đã false nên không bao giờ có trạng thái "nút hiện nhưng bấm không phản hồi".
- Submit lần 2 trong lúc Resolving: `write_action_allowed(submit_action, resolving, S2)=0` — đúng Core Rule #4 "từ chối ở tầng UI" (`submit_action` chỉ xuất hiện tại S2). Khóa đệ quy cây node khu nhập chỉ là **cách hiện thực hóa**; formula là nguồn sự thật. QA test cả hai (formula đúng + UI thật sự chặn) như 2 AC tách biệt.

**Rationale:** Hình thức hóa Core Rule #4 thành 1 predicate thuần túy, unit-test được không cần dựng scene Godot. Không phải tuning knob — invariant logic.

### D.2 — `screen_transition_valid(from, to, ctx)`

Chỉ xét **tầng màn hình** (5 node: `S1, S2, S4, S4-RO, S5`) — `S2-R/S2-U/S2-D` là sub-state Turn Manager bên trong `S2` (D.1 xử lý). Overlay tier không vào đồ thị (luật 1 dòng, xem Edge cases).

```
screen_transition_valid(from, to, ctx) = 1  iff  ∃ (from, to, guard) ∈ EDGES  such that  guard(ctx) = true
else 0
```

**EDGES** (rút thẳng từ bảng States and Transitions):

| from | to | guard(ctx) | Nguồn |
|---|---|---|---|
| S1 | S2 | `true` | "Tiếp tục/Bắt đầu mới" |
| S1 | S4-RO | `true` | "Xem lại" |
| S2 | S4 | `true` | 「Lục」— luôn được kể cả Resolving (đọc-only, D.1) |
| S4 | S2 | `true` | lật về |
| S2 | S1 | `tm_state = awaiting_action` | menu, gated bởi D.1 (`tap_back_to_slots`) |
| S2 | S5 | `continuation_choice_eligible = true` | tap dòng dẫn cuối đoạn văn lượt chết (Core Rule #6) |
| S5 | S2 | `new_slot_created = true` | "Chơi lại" thành công |
| S5 | S1 | `true` | menu |
| S5 | S4-RO | `true` | 「Lục」 từ S5 |
| S4-RO | S1 | `origin_screen = S1` | thoát về nơi vào |
| S4-RO | S5 | `origin_screen = S5` | thoát về nơi vào |

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Màn hình nguồn | `from` | enum | `{S1,S2,S4,S4-RO,S5}` | Màn hình hiện tại |
| Màn hình đích | `to` | enum | `{S1,S2,S4,S4-RO,S5}` | Màn hình muốn chuyển tới |
| Trạng thái Turn Manager | `ctx.tm_state` | enum | `{awaiting_action, resolving, undoing}` | Chỉ có ý nghĩa khi `from=S2` |
| Cờ takeover 3 lối | `ctx.continuation_choice_eligible` | bool | `{0,1}` | registry, chỉ có ý nghĩa khi `from=S2, to=S5` |
| Nơi vào Story Log read-only | `ctx.origin_screen` | enum | `{S1,S5}` | Chỉ có ý nghĩa khi `from=S4-RO` |
| Cờ tạo slot mới thành công | `ctx.new_slot_created` | bool | `{0,1}` | Chỉ có ý nghĩa khi `from=S5, to=S2` |
| Kết quả | `screen_transition_valid` | bool | `{0,1}` | `1` = điều hướng hợp lệ |

**Output Range:** Boolean, **hàm đóng (total)** — mọi cặp `(from,to)` không nằm trong `EDGES` trả `0` mặc định, không ném lỗi. `0` nghĩa là "không render điều khiển điều hướng này", không phải trạng thái lỗi.

**Example 1:** `screen_transition_valid(S2, S1, {tm_state: resolving}) = 0` → nút "Về danh sách sổ" mờ mực lúc AI đang viết (khớp D.1).

**Example 2 (bắt lỗi bằng cấu trúc):** `screen_transition_valid(S4-RO, S1, {origin_screen: S5}) = 0` nhưng `screen_transition_valid(S4-RO, S5, {origin_screen: S5}) = 1` — mở 「Lục」 từ Màn hình 3 lối rồi thoát → **phải** quay lại S5, không rơi về Save Slot Screen.

**Edge cases:**
- Cạnh `(S2, S5)`: KHÔNG do hệ thống tự kích hoạt — do người chơi CHẠM dòng dẫn cuối đoạn văn lượt chết (Core Rule #6). Formula vẫn dùng được làm assertion y hệt: nếu code cố route sang S5 mà `continuation_choice_eligible=false` (VD chạm nhầm trước khi cờ set) → trả `0` → integrity check trong state machine; dòng dẫn không được phép hiện/hoạt động khi cờ chưa `true`.
- `(S1, S2)` luôn `true` ở tầng màn hình — slot có tồn tại/hợp lệ để mở hay không là trách nhiệm Persistence, **ngoài phạm vi** formula này.
- Tầng overlay: `O-Card` mở được từ mọi `from ∈ {S2,S4,S4-RO,S5}` khi `card_exists(char_id)=true`; `O-Set` mở được từ `{S1,S2}`; **`O-ConfirmDelete` mở được CHỈ từ `{S1}`** (bổ sung 2026-08-07 — nguồn mở hẹp nhất trong 3 overlay, khớp việc "Xóa" chỉ khả dụng trên Save Slot Screen) — overlay là tầng độc lập (Core Rule #1), không gộp vào đồ thị màn hình. Cạnh `(S1,S1)` (ở lại S1 trong khi `O-ConfirmDelete` mở) không cần thêm vào bảng EDGES — cùng lý do overlay không vào đồ thị màn hình.

**Rationale:** Biến bảng States and Transitions thành predicate máy kiểm được — điều hướng bất hợp pháp **bất khả thi theo cấu trúc** thay vì phụ thuộc rải đúng `if` trong code. Không phải tuning knob — invariant kiến trúc.

### D.3 — Cửa sổ phân trang Story Log

Đóng gap tường minh của `world-memory-context-management.md` ("page size chưa được định nghĩa ở đâu"). Kèm **luật eviction** — không có eviction thì cuộn ngược từ lượt 900 về lượt 1 vẫn chất đầy bộ nhớ UI, phá chứng minh O(1).

```
total_pages(slot)        = ceil(total_turns(slot) / PAGE_SIZE)
default_page_index(slot) = total_pages(slot) − 1                      // trang chứa lượt gần nhất
ui_memory_bound          = MAX_LOADED_PAGES × PAGE_SIZE                // hằng số, ĐỘC LẬP total_turns
distance_to_window_edge(scroll_position, direction) =
    turns_between(scroll_position, edge_turn_id(direction))            // số lượt còn lại tới biên cửa sổ đã tải, theo hướng cuộn
should_prefetch(scroll_position, direction) =
    1  if distance_to_window_edge(scroll_position, direction) ≤ PREFETCH_THRESHOLD
    0  otherwise
INVARIANT: PREFETCH_THRESHOLD < PAGE_SIZE                              // = hoặc > → luôn prefetch, xem Tuning Knobs
```

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Slot đang xem (live hoặc closed) | `slot` | id | hợp lệ | Nguồn `total_turns` |
| Tổng lượt confirmed-không-undone | `total_turns(slot)` | int | `[0, ∞)` | Nguồn World Memory (lượt undo không tính) |
| Số lượt/trang | `PAGE_SIZE` | int const | ≥1 | Tuning knob `log_page_size`, mặc định **20** |
| Số trang tối đa resident | `MAX_LOADED_PAGES` | int const | ≥1 | Tuning knob `log_max_loaded_pages`, mặc định **3** |
| Ngưỡng tải trước | `PREFETCH_THRESHOLD` | int const | ≥0, `< PAGE_SIZE` | Tuning knob `log_prefetch_threshold`, mặc định **5** (lượt) |
| Tổng số trang | `total_pages(slot)` | int | `[0, ∞)` | |
| Trang mặc định khi mở | `default_page_index(slot)` | int | `[0, total_pages−1]` | |
| Trần bộ nhớ UI | `ui_memory_bound` | int const | = `MAX_LOADED_PAGES × PAGE_SIZE` | **Chứng minh O(1)** — không phụ thuộc `total_turns` |
| Vị trí cuộn hiện tại | `scroll_position` | turn_id | trong cửa sổ đã tải | Lượt đang ở giữa viewport tại thời điểm xét |
| Hướng cuộn | `direction` | enum | `{older, newer}` | Cuộn về lượt cũ hơn hay mới hơn |
| Lượt biên của cửa sổ đã tải | `edge_turn_id(direction)` | turn_id | trong cửa sổ đã tải | Lượt cũ nhất (nếu `direction=older`) hoặc mới nhất (nếu `direction=newer`) hiện đang resident |
| Khoảng cách tới biên | `distance_to_window_edge` | int | `≥0` (lượt) | Số lượt còn lại trước khi chạm biên cửa sổ đã tải theo `direction` |
| Cờ tải thêm | `should_prefetch` | bool | `{0,1}` | |

**Output Range:** `ui_memory_bound` là **hằng số cố định** (mặc định 60 lượt resident) bất kể `total_turns` lớn tới đâu — mảnh ghép cuối cho "UI memory O(1) độc lập world_time", cùng cấu trúc chứng minh World Memory đã dùng cho AI context.

**Example:** Slot `total_turns=842`, `PAGE_SIZE=20` → `total_pages=43`, `default_page_index=42` (lượt 821–842). `ui_memory_bound = 3×20 = 60` — dù slot 842 hay 8.420 lượt, số vẫn là 60. Cuộn lên tới lượt 825 (cách biên trên cửa sổ đã tải 4 lượt `< 5`) → `should_prefetch=1` → tải trang 41 (lượt 801–820), evict trang xa nhất.

**Edge cases:**
- `total_turns=0` (vừa "Bắt đầu mới") → `total_pages=ceil(0/20)=0` — Story Log hiện trạng thái rỗng, không cần nhánh chống chia-0. **`default_page_index` KHÔNG được gọi khi `total_pages=0`** — UI rẽ nhánh empty-state trước khi truy vấn trang (tránh giá trị −1 ngoài range khai báo; GAP-5).
- `total_turns < PAGE_SIZE` → `total_pages=1`; `ui_memory_bound` là **trần**, không phải giá trị luôn-đầy.
- Undo xảy ra khi lượt bị undo nằm trong trang đang tải (mở 「Lục」 lúc Resolving rồi Undo) → trang đó **invalidate và tải lại**, không patch tại chỗ; `total_turns` giảm 1, có thể kéo `total_pages` giảm.
- Chế độ S4-RO (slot đã khép): `total_turns` là giá trị tĩnh đóng băng — công thức không đổi, không bao giờ cần invalidate do ghi mới.

**Rationale:** Đóng gap World Memory + chứng minh trực tiếp yêu cầu hiệu năng mobile (memory-constrained, 60 FPS). **Interface World Memory expose (đã chốt)**: `get_turn_page(anchor_turn_id, count, direction) → {records, has_more}`, không trả nguyên Nhật ký đầy đủ (ghi ở Dependencies).

### D.3b — Cửa sổ hiển thị Màn chơi chính (S2)

*D.3 chặn bộ nhớ cho Story Log (S4) nhưng không chặn Màn chơi chính (S2), màn hình dùng nhiều nhất trong game. Rủi ro thật: `RichTextLabel` phình vô hạn theo `world_time` trên mobile, trầm trọng hơn mỗi khi đổi cỡ chữ (D.5) trigger relayout toàn buffer. Công thức dưới đây neo theo `total_turns(slot)` — cùng nguồn dữ liệu D.3 dùng — chứ KHÔNG neo theo đại lượng phụ thuộc phiên chơi (số lượt đã trôi kể từ khi mở màn hình): nếu neo theo phiên, mở lại 1 slot có lịch sử dài (VD 400 lượt) qua "Tiếp tục" sẽ cho `s2_resident_turns=0` ngay khi vừa vào màn hình — khung tường thuật S2 trắng trơn, phản đúng lời hứa "không tồn tại đường đi nào từ lúc mở game đến lượt chơi đầu tiên" ở Overview.*

```
s2_resident_turns(slot)          = min(total_turns(slot), LIVE_WINDOW_TURNS)
INVARIANT: LIVE_WINDOW_TURNS ≥ CONTENT_EXCHANGE_ESTIMATE                  // liên-GDD với #7 Combat, mirror D.3/D.6
s2_oldest_resident_turn_id(slot) = turn_id của bản ghi CŨ NHẤT hiện đang resident trong buffer hiển thị S2
                                    (state DUY TRÌ BỞI buffer qua cold-start/append/evict — KHÔNG suy ra
                                    bằng số học từ last_confirmed_turn_id)
```

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Slot đang xem (live) | `slot` | id | hợp lệ | Cùng nguồn `total_turns`/`last_confirmed_turn_id` với D.3 — không phải đại lượng mới |
| Tổng lượt confirmed-không-undone | `total_turns(slot)` | int | `[0, ∞)` | Nguồn World Memory, định nghĩa giống hệt D.3 |
| Lượt confirmed gần nhất | `last_confirmed_turn_id(slot)` | turn_id | `[1, ∞)`; undefined khi `total_turns=0` | ID lượt mới nhất đã khóa |
| Số lượt còn resident trong S2 | `s2_resident_turns(slot)` | int | `[0, LIVE_WINDOW_TURNS]` | Số lượt văn bản còn giữ trong khung tường thuật S2 tại thời điểm xét — tính từ DỮ LIỆU slot, không từ thời lượng phiên chơi |
| Trần cửa sổ sống | `LIVE_WINDOW_TURNS` | int const | ≥1, **PHẢI ≥ `CONTENT_EXCHANGE_ESTIMATE` (#7 Combat)** | Tuning knob `live_window_turns`, mặc định **30** (xem Rationale) |
| Lượt resident cũ nhất | `s2_oldest_resident_turn_id(slot)` | turn_id | tồn tại trong tập turn_id thật của slot, khi `s2_resident_turns≥1` | State do buffer tự duy trì (KHÔNG phải giá trị suy ra bằng công thức số học) — KHÔNG được gọi khi `s2_resident_turns=0` (cùng nguyên tắc `default_page_index` ở D.3). Định nghĩa state-based (thay vì công thức `last_confirmed_turn_id − s2_resident_turns + 1`) giữ D.3b tự-đủ (self-contained), không phụ thuộc chi tiết implementation của World Memory. `turn-manager.md` và `world-memory-context-management.md` xác nhận `turn_id` liền mạch và được tái sử dụng sau Undo — sự thật này cho phép AC-66 dùng công thức số học trên làm tripwire invariant để bắt buffer drift, dù định nghĩa chính thức vẫn là state-based. |
| Lượt gần nhất đã đồng bộ vào buffer S2 | `s2_last_synced_turn_id(slot)` | turn_id | `[0, last_confirmed_turn_id]`; `0` = chưa cold-start | Turn_id gần nhất đã thực sự phản ánh trong buffer hiển thị S2 — có thể khác `last_confirmed_turn_id` khi S2 đang ẩn (`visible=false`), xem "Vòng đời nội dung S2" bên dưới |

**Output Range:** `s2_resident_turns` là hằng số trần — bất kể slot có bao nhiêu lượt (`total_turns` lớn tới đâu), S2 tại mọi thời điểm chỉ giữ tối đa `LIVE_WINDOW_TURNS` lượt gần nhất trong cấu trúc hiển thị. Cùng cấu trúc chứng minh O(1) với `ui_memory_bound` (D.3). Vì công thức neo theo `total_turns(slot)` (không đổi theo số lần vào/ra màn hình), giá trị `s2_resident_turns` giống nhau dù người chơi vừa mở slot lần đầu trong phiên hay đã lật S4↔S2 mười lần — tránh rebuild buffer không cần thiết mỗi lần lật trang.

**Vòng đời nội dung S2** — S2 dùng LẠI đúng interface `get_turn_page` đã chốt ở D.3 (Dependencies World Memory), không phải interface riêng.

| Sự kiện | S2 đang hiển thị? | Hành động | Nguồn dữ liệu |
|---|---|---|---|
| Cold-start (mở slot / lật vào S2 lần đầu trong phiên) | — (luôn hiển thị khi cold-start chạy) | Gọi 1 lần `get_turn_page(last_confirmed_turn_id, LIVE_WINDOW_TURNS, older)`, dựng đủ `s2_resident_turns` lượt; `s2_last_synced_turn_id ← last_confirmed_turn_id` | `get_turn_page` |
| Lượt mới confirm | Có (`visible=true`) | Append trực tiếp qua tín hiệu Turn Manager (không gọi lại `get_turn_page`), evict lượt cũ nhất nếu chạm trần; `s2_last_synced_turn_id` cập nhật theo | Turn Manager confirm signal |
| Lượt mới confirm | Không (`visible=false` — người chơi đang ở S4/S5/overlay) | KHÔNG render (tiết kiệm chi phí node/relayout cho màn hình không nhìn thấy) — buffer hiển thị giữ nguyên; `s2_last_synced_turn_id` KHÔNG cập nhật cho tới khi render | Turn Manager confirm signal (ghi nhận, không render) |
| Quay lại S2, **CÙNG slot**, `last_confirmed_turn_id = s2_last_synced_turn_id` (không có gì mới trong lúc ẩn) | — | Dùng nguyên buffer cache, KHÔNG rebuild (đúng luật hiện có "lật S4↔S2 nhiều lần không rebuild") | Không gọi API |
| Quay lại S2, **CÙNG slot**, `last_confirmed_turn_id ≠ s2_last_synced_turn_id` (có lượt confirm trong lúc ẩn) | — | Hòa giải bằng DELTA: `get_turn_page(anchor=s2_last_synced_turn_id, count=(last_confirmed_turn_id − s2_last_synced_turn_id), newer)`, append đúng phần còn thiếu vào buffer hiện có, evict nếu chạm trần; `s2_last_synced_turn_id ← last_confirmed_turn_id`. KHÔNG cold-start lại toàn bộ. | `get_turn_page` (delta) |
| **Chuyển sang SLOT KHÁC** (bao gồm S5→S2 qua "Chơi lại" tạo slot mới, `new_slot_created=true`) | — | LUÔN force cold-start (hàng 1 của bảng này), BẤT KỂ giá trị `s2_last_synced_turn_id` cũ còn lại từ slot trước và bất kể Control S2 không bị free (Open Question #5a — cache Control ≠ cache dữ liệu lượt). `s2_last_synced_turn_id` reset về `last_confirmed_turn_id` của slot MỚI trước khi tính bất kỳ delta nào | `get_turn_page` (cold-start, không phải delta) |
| **Undo khi window đã đầy** (`s2_resident_turns = LIVE_WINDOW_TURNS` ngay trước Undo) | Có (`visible=true`, Undo chỉ khả dụng ở S2 — Core Rule #5) | Gỡ lượt bị Undo (như bình thường) **CỘNG** backfill 1 lượt cũ hơn qua `get_turn_page(anchor=s2_oldest_resident_turn_id_cũ, count=1, older)` nếu `total_turns` sau Undo vẫn `≥ LIVE_WINDOW_TURNS` — giữ buffer luôn đủ `LIVE_WINDOW_TURNS` khi dữ liệu cho phép, khớp đúng công thức `s2_resident_turns=min(total_turns, LIVE_WINDOW_TURNS)` ở MỌI thời điểm, không chỉ giữa 2 lần Undo. Nếu `total_turns` sau Undo `< LIVE_WINDOW_TURNS`, không cần backfill (công thức tự đúng) | `get_turn_page` (backfill 1 lượt, O(1) — không phá chứng minh D.3b) |

**Chặn delta phình to:** delta ở dòng cuối LUÔN `≤ 1` (chỉ áp dụng khi CÙNG slot — xem guard đổi-slot ngay dưới) — hành động submit tiếp theo chỉ có thể xảy ra từ khu nhập của chính S2 (Core Rule #3), nên không tồn tại đường nào khiến >1 lượt confirm trong khi S2 đang ẩn (Turn Manager cần 1 action mới từ đúng màn hình đó để tiến lượt tiếp theo). Vì vậy hòa giải delta không bao giờ cần tải nhiều hơn 1 lượt, giữ nguyên chi phí O(1) của toàn D.3b.

**Guard bắt buộc — kiểm slot identity TRƯỚC khi chọn nhánh delta vs cold-start**: điều kiện `last_confirmed_turn_id ≠ s2_last_synced_turn_id` (dùng để chọn nhánh "delta" ở bảng trên) **ĐÚNG trong cả 2 trường hợp** — (a) có lượt mới confirm trong lúc ẩn CÙNG slot, VÀ (b) vừa chuyển sang MỘT SLOT KHÁC hoàn toàn (VD "Chơi lại" tạo slot mới) — vì `s2_last_synced_turn_id` không tự reset khi đổi slot (Control S2 được cache xuyên phiên, không free). Nếu code chỉ kiểm điều kiện bất-đẳng-thức mà không kiểm slot identity trước, case (b) sẽ rơi nhầm vào nhánh delta: **phản chứng cụ thể** — slot cũ chết ở `total_turns=400` (`s2_last_synced_turn_id=400`), "Chơi lại" tạo slot mới `total_turns=1` → nhánh delta sai sẽ gọi `get_turn_page(anchor=400, count=(1−400)=−399, newer)` — `count` ÂM, vô nghĩa. **Luật bắt buộc**: PHẢI kiểm `slot_id hiện tại = slot_id lúc `s2_last_synced_turn_id` được ghi` TRƯỚC KHI so sánh `turn_id` — nếu khác, luôn đi nhánh cold-start (hàng "Chuyển sang SLOT KHÁC" ở trên), không bao giờ tính delta bằng phép trừ `turn_id` giữa 2 slot khác nhau.

**Cơ chế eviction (phạm vi node tách bạch khỏi tầng-màn-hình):** khi lượt mới được confirm và `s2_resident_turns` đã đạt trần, lượt cũ nhất (`s2_oldest_resident_turn_id`) bị **gỡ THẬT khỏi cấu trúc hiển thị S2** — không chỉ ẩn (`visible=false`). Ranh giới này PHẢI tách bạch khỏi luật tầng-màn-hình ở Open Question #5(a) ("Autoload cache/ẩn-hiện 5 Control màn hình, không free node"): luật đó chỉ áp cho 5 Control gốc của TẦNG MÀN HÌNH (S1/S2/S4/S4-RO/S5) — KHÔNG áp cho nội dung lượt bên trong S2. Nội dung lượt phải được gỡ thật (node `queue_free()`, hoặc đoạn text cắt khỏi buffer nếu dùng 1 RichTextLabel buffer chung — kiến trúc cụ thể quyết ở ADR, nhưng "gỡ" luôn phải giải phóng bộ nhớ thật, không chỉ ẩn). Nếu lẫn 2 luật, toàn bộ chứng minh O(1) của D.3b vô hiệu mà việc chỉ đếm biến số logic không bắt được (xem AC-48/49 đã siết lại). KHÔNG xóa dữ liệu gốc — lượt đó vẫn nguyên vẹn ở World Memory/Story Log (D.3).

**Neo vị trí cuộn khi eviction:** cùng nguyên tắc đã dùng cho resize ở Edge Cases toàn cục ("vị trí cuộn neo theo block đang đọc") — nếu lượt sắp bị evict đang nằm trong viewport (người chơi đang đọc gần biên cửa sổ resident), eviction bù trừ vị trí cuộn để nội dung đang xem KHÔNG nhảy dưới mắt người chơi. Áp dụng tương tự cho **backfill** (hàng "Undo khi window đã đầy"): lượt cũ hơn được chèn vào ĐẦU buffer không làm dịch chuyển vị trí cuộn hiện tại của người chơi — chèn vào vùng ngoài viewport theo hướng cũ hơn, không đẩy nội dung đang xem.

Nếu người chơi cuộn lên chạm biên cửa sổ, hiện 1 dòng dẫn "— đọc tiếp về trước, mở 「Lục」 —" dẫn sang Story Log thay vì cố tải thêm vào S2 — củng cố đúng phân vai Core Rule #2/#3: **S2 = đang viết (cửa sổ trượt), S4 = đã viết (toàn bộ, phân trang)**. Đây là tap-target thật (AC-49 yêu cầu chạm được), không phải trạng thái thụ động — styling dùng cùng ngôn ngữ thị giác bút tích marginalia (Visual/Audio mục 1 — đậm hơn thân văn 1 bậc, không khung), KHÔNG dùng -1 bậc alpha thụ động của empty-state; vùng chạm thật ≥44px theo D.4 nhóm (b) — đây là 1 dòng độc lập, không nhúng trong prose đang chảy nên KHÔNG compliant-by-exception, phải đạt tuyệt đối.

**Edge cases:**
- `total_turns(slot)=0` (slot thực sự mới, "Bắt đầu mới" chưa có lượt nào): `s2_resident_turns=0`, khung tường thuật rỗng (công thức empty-state chung, mục 8 Visual/Audio) — KHÔNG hiện dòng "đọc tiếp về trước" (chưa có gì để dẫn tới); `s2_oldest_resident_turn_id` KHÔNG được gọi.
- Mở lại 1 slot có lịch sử (`total_turns(slot)>0`, VD 400): `s2_resident_turns=min(400,30)=30` NGAY LẬP TỨC — khung tường thuật hiện đủ 30 lượt gần nhất qua cold-start `get_turn_page`, KHÔNG rỗng, KHÔNG chờ có lượt mới confirm (xem Rationale).
- Lật S4↔S2 nhiều lần trong cùng phiên: `s2_resident_turns` không đổi giữa các lần lật (neo theo `total_turns`, không theo "đã ở S2 bao lâu") — không rebuild buffer không cần thiết, nhất quán với Open Question #5(a) (Control màn hình được cache, không free).
- Undo xóa đúng lượt đang resident trong S2: gỡ khỏi cấu trúc hiển thị S2 cùng lúc gỡ khỏi World Memory (Turn Manager Core Rule #7) — không patch tại chỗ, cùng nguyên tắc AC-18 (D.3); `total_turns(slot)` giảm 1 nên `s2_resident_turns` tự tính lại đúng qua công thức. **Backfill bắt buộc khi window đã đầy trước Undo** (xem hàng 7 "Undo khi window đầy" trong bảng "Vòng đời nội dung S2"): nếu `s2_resident_turns = LIVE_WINDOW_TURNS` NGAY TRƯỚC Undo (window đã đầy), chỉ gỡ lượt bị Undo là KHÔNG ĐỦ — phải bù thêm đúng 1 lượt cũ hơn từ World Memory để buffer trở lại đủ `LIVE_WINDOW_TURNS` (nếu `total_turns` sau Undo vẫn `≥ LIVE_WINDOW_TURNS`), mirror đúng cơ chế "hòa giải delta" đã có (dòng 268). **Phản chứng nếu bỏ qua bước này**: slot `total_turns=400`, window đầy `[371,400]`, Undo lượt 400 → `total_turns=399` → công thức `s2_resident_turns=min(399,30)=30` nhưng buffer THẬT chỉ còn 29 lượt `[371,399]` nếu không backfill — `s2_oldest_resident_turn_id` thực tế vẫn `371` trong khi tripwire AC-66 đòi `399−30+1=370` → **AC-66 fail ngay ở luồng chơi bình thường** (Undo là core mechanic, không phải edge case hiếm). Backfill 1 lượt (370) qua `get_turn_page(anchor=371, count=1, older)` khôi phục đúng `[370,399]`, công thức và buffer khớp lại.
- Đổi cỡ chữ (D.5) khi S2 đang ở trần `LIVE_WINDOW_TURNS`: relayout chỉ áp dụng cho tối đa `LIVE_WINDOW_TURNS` lượt resident, KHÔNG BAO GIỜ toàn bộ Nhật ký — đây chính là cơ chế chặn rủi ro relayout vô hạn mà `godot-specialist` đã cảnh báo.
- `LIVE_WINDOW_TURNS` là trần hiển thị, không phải trần world-state — không ảnh hưởng `undo_availability_window` (Turn Manager) hay `recency_window_turns` (World Memory), 2 khái niệm độc lập dù cùng là "cửa sổ".

**Rationale:** Mirror tinh thần O(1) của D.3/World Memory cho chính màn hình có tần suất dùng cao nhất — trước bản sửa này, hệ chứng minh chặt bộ nhớ ở Story Log (dùng ít hơn) nhưng bỏ ngỏ ở S2 (dùng nhiều nhất). Không phải tuning knob giá trị nghệ thuật — là invariant hiệu năng.

**Ràng buộc liên-hệ với Combat System — `live_window_turns ≥ CONTENT_EXCHANGE_ESTIMATE`:** đối chiếu trực tiếp `combat-system.md`: mỗi pha giao đấu = 1 lượt Turn Manager, và `CONTENT_EXCHANGE_ESTIMATE=30` là ước tính THIẾT KẾ (không phải worst-case) cho số pha điển hình/trận. Nếu `LIVE_WINDOW_TURNS < CONTENT_EXCHANGE_ESTIMATE`, MỘT TRẬN ĐIỂN HÌNH (không phải trận dài bất thường) sẽ chắc chắn evict hết bối cảnh trước trận trước khi trận kết thúc — tiêu chí nghiệm thu tự đặt ("không lần nào người chơi cuộn tìm bối cảnh giữa 1 trận mà chạm biên cửa sổ") bị bảo đảm thất bại bằng chính số của Combat.

**Xử lý**: mặc định `live_window_turns` = **30** (khớp đúng `CONTENT_EXCHANGE_ESTIMATE`), dải an toàn Tuning Knobs **`CONTENT_EXCHANGE_ESTIMATE` (#7) hiện hành – 50** (sàn neo theo GIÁ TRỊ hiện hành của #7, KHÔNG phải sàn dải của #7 — khớp đúng bảng Tuning Knobs bên dưới), kèm **INVARIANT liên-hệ tường minh**: `LIVE_WINDOW_TURNS ≥ CONTENT_EXCHANGE_ESTIMATE (#7)` — nếu Combat tune ước tính lên cao hơn cửa sổ S2 đang hiệu lực, đây là vi phạm invariant cần CI chặn (mirror đúng khuôn D.6). Đánh đổi chấp nhận: buffer S2 tăng gấp đôi (30 lượt thay vì 15) — route sang `technical-director` để đối chiếu với mục "trần bộ nhớ TỔNG khi D.3+D.3b+O-Card cùng active" đang treo ở Open Questions. Playtest thật vẫn cần thiết để XÁC NHẬN 30 là đủ cho trận trên-trung-bình (Combat dải tới 50).

### D.4 — Kích thước vùng chạm tối thiểu (tap-name & chip)

Hai nhóm vì bản chất vật lý khác nhau: **(a)** tap-target nhúng trong văn xuôi — bị giới hạn bởi văn bản xung quanh; **(b)** phần tử độc lập — phải đạt chuẩn không điều kiện.

```
// (a) Tap-target nhúng trong prose — best-effort, có trần bởi mật độ chữ xung quanh
pad_v(fragment) = min( max(0, TOUCH_TARGET_MIN − h(fragment)) / 2,  line_gap(fragment) / 2 )
pad_h(fragment) = min( max(0, TOUCH_TARGET_MIN − w(fragment)) / 2,  max(0, gap_to_neighbor(fragment) − MIN_ADJACENT_GAP_PX) / 2 )
hit_height(fragment) = h(fragment) + 2 × pad_v(fragment)
hit_width(fragment)  = w(fragment) + 2 × pad_h(fragment)

// (b) Phần tử độc lập (chip/card/bút tích/nút) — bắt buộc tuyệt đối
hit_height ≥ TOUCH_TARGET_MIN  AND  hit_width ≥ TOUCH_TARGET_MIN
```

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Ngưỡng chạm tối thiểu | `TOUCH_TARGET_MIN` | int px const | = **44** | Chuẩn CSS-equivalent (WCAG 2.5.5/Apple HIG/Material — hằng khóa, sẽ đăng ký registry) |
| Khoảng đệm liền kề tối thiểu | `MIN_ADJACENT_GAP_PX` | int px const | = **4** | Vùng trắng KHÔNG được lấn giữa 2 tap-target độc lập |
| Đoạn tên trên 1 dòng | `fragment` | entity | — | 1 lần wrap = 1 fragment riêng |
| Kích thước glyph thật | `w`, `h` | float px | >0 | Từ font metrics tại `theme_scale` hiện hành (liên kết D.5) |
| Khoảng trắng dọc khả dụng | `line_gap` | float px | ≥0 | Giữa dòng chứa tên và dòng liền kề |
| Khoảng trắng ngang tới ký tự gần nhất | `gap_to_neighbor` | float px | ≥0 hoặc ∞ (cuối dòng) | |
| Đệm tính được | `pad_v`, `pad_h` | float px | ≥0 | |
| Vùng chạm cuối | `hit_height` | float px | `[h, max(h, TOUCH_TARGET_MIN)]` | Cận dưới tách riêng theo từng biến (không dùng chung 1 cận cho cả `hit_height`/`hit_width`) — phản chứng: nếu dùng chung cận `max(w,h)`, case `w=18,h=24,gap_to_neighbor=2` → `pad_h=0` → `hit_width=18 < max(w,h)=24`, vi phạm chính range đó. `hit_height` không bao giờ nhỏ hơn `h`, `hit_width` không bao giờ nhỏ hơn `w`. |
| Vùng chạm cuối | `hit_width` | float px | `[w, max(w, TOUCH_TARGET_MIN)]` | VD tên dài `w=120` → `pad_h=0` → `hit_width=120`, đúng và mong muốn (44 chỉ là trần khi glyph nhỏ hơn nó, không phải trần tuyệt đối), không phải lỗi |

**Output Range:** Nhóm (a) **KHÔNG đảm bảo tối thiểu 44px** khi glyph + khoảng trắng xung quanh không đủ chỗ — nhưng đây là **compliant-by-exception** theo miễn trừ "Inline" cho tap-target nhúng trong câu/khối văn bản, tồn tại ở CẢ HAI: **SC 2.5.5 Target Size (Enhanced)** — Level **AAA**, WCAG **2.1** — và **SC 2.5.8 Target Size (Minimum)** — Level **AA**, nhưng chỉ tồn tại từ WCAG **2.2** (không có trong 2.1). 44px vẫn vượt xa cả 2 ngưỡng (2.5.8 chỉ yêu cầu 24×24px) nên kết luận không đổi theo version nào, nhưng nếu dự án chỉ target baseline WCAG 2.1 AA, chỉ 2.5.5 (AAA, tự nguyện vượt chuẩn) là căn cứ hợp lệ — viện dẫn 2.5.8 đòi hỏi xác nhận dự án mở rộng baseline sang WCAG 2.2. Nhóm (b) đảm bảo tuyệt đối `≥44px`, không có ngoại lệ.

**Example:** Tên 1 ký tự "Vệ" tại M scale: `w=18, h=24`; `line_gap=12`, `gap_to_neighbor=10` hai bên. `pad_v = min((44−24)/2, 12/2) = 6` → `hit_height=36`. `pad_h = min((44−18)/2, (10−4)/2) = 3` → `hit_width=24`. Vùng chạm `24×36` — nhỏ hơn lý tưởng nhưng đã tối đa trong ràng buộc typography, **không bao giờ lấn** sang từ liền kề.

**Edge cases:**
- Hai tên sát nhau → `gap_to_neighbor` nhỏ → `pad_h≈0` → chấp nhận "chật" để 2 tap-target không bao giờ chồng lấn (đánh đổi có chủ đích: chính xác > thoải mái).
- Tên cuối dòng trước wrap → cạnh không giáp chữ có `gap_to_neighbor = ∞` → công thức áp dụng **theo từng cạnh riêng**, cạnh trống dùng đủ đệm mong muốn.
- Font scale L (×1.25) làm glyph lớn hơn → đệm mong muốn tự giảm — công thức tự điều chỉnh, không cần nhánh theo font scale.
- **Đường lui nếu engine không đệm được vùng chạm ảo — TÁCH 2 NHÁNH**: `RichTextLabel` meta tag native không có cơ chế padding built-in cho từng đoạn text — hiện thực `pad_v`/`pad_h` nhóm (a) có thể cần 1 Control overlay riêng định vị theo tọa độ glyph (quyết ở ADR).
  - **Nhánh (i) — miễn trừ HỢP LỆ**: với các fragment mà công thức D.4(a) *đằng nào cũng* cho `pad≈0` do ràng buộc VẬT LÝ thật (hàng xóm sát cạnh, `gap_to_neighbor` nhỏ — xem case "2 tên sát nhau" ở trên), route pad=0 chỉ xác nhận lại kết quả công thức đã tính — đây đúng tinh thần miễn trừ "Inline" của WCAG 2.5.5/2.5.8 (xem Output Range).
  - **Nhánh (ii) — KHÔNG được dán nhãn "compliant-by-exception"**: nếu ADR chọn `pad_v=pad_h=0` áp dụng TOÀN CỤC (mọi fragment, kể cả fragment có `gap_to_neighbor` dư dả mà công thức lẽ ra tính được `pad>0`) chỉ vì lý do RÀNG BUỘC KỸ THUẬT (engine không đệm được, không phải thiếu chỗ vật lý) — đây là **regression tự chọn vì lý do kỹ thuật**, không phải áp dụng đúng tinh thần miễn trừ WCAG. Phải gọi đúng tên trong ADR, không dán nhãn "hợp chuẩn" cho trường hợp này.
  - **Rủi ro kỹ thuật bổ sung nếu chọn route Control-overlay trên nền single-buffer D.3b**: mỗi lần eviction (D.3b) trigger `remove_paragraph()` reflow TOÀN BỘ đoạn phía sau — không chỉ TỐN chi phí (đã ghi ở Godot notes) mà overlay hit-box đã định vị theo tọa độ glyph CŨ có thể **TRÔI khỏi glyph thật** sau mỗi lần evict, trừ khi kiến trúc chủ động recompute vị trí cho MỌI turn còn resident (không chỉ turn mới). ADR phải coi đây là hạng mục bắt buộc nếu chọn route này, kèm 1 test riêng xác nhận overlay không trôi sau N lần evict liên tiếp (mở rộng AC-49).
  - **Ngưỡng chấp nhận UX còn thiếu**: dù nhánh (i) hợp chuẩn WCAG, GDD hiện chưa có tiêu chí đo tỷ lệ chạm-hụt thực tế cho tap-tên ngắn (1–2 ký tự) trên thiết bị cảm ứng thật — cần 1 tripwire playtest riêng trước khi chấp nhận production, không chỉ dừng ở "đã hợp chuẩn WCAG nên không cần re-review".
  - Đường lui này không cần re-review D.4 mỗi lần chọn, chỉ cần ghi rõ NHÁNH nào được chọn vào ADR — NHƯNG nếu route này được chọn, AC-21 (regression "Vệ") phải cập nhật kỳ vọng theo route pad=0 (xem AC-21) — không tự động re-review GDD, nhưng AC phải theo route thật, không giữ số cũ.

**Rationale:** Mobile Web là platform chính (touch, không hover) và tap-tên là điểm vào MVP xuyên 4 bề mặt (Core Rule #8) — phải chạm chính xác được. Không phải tuning knob — hằng khóa theo chuẩn accessibility, đổi cần re-review chuẩn ngoài.

### D.5 — Ánh xạ cỡ chữ S/M/L và ngưỡng layout 2 cột

```
theme_scale(setting) = FONT_SCALE_STEP[setting],  setting ∈ {S, M, L}
two_column_layout(viewport_width_px, setting, is_touch_primary) =
    0  if is_touch_primary = true
    1  if is_touch_primary = false ∧ viewport_width_px ≥ 2 × BASE_COLUMN_WIDTH_PX × theme_scale(setting) + COLUMN_GUTTER_PX
    0  otherwise
INVARIANT: FONT_SCALE_STEP[S] < FONT_SCALE_STEP[M] < FONT_SCALE_STEP[L]        // tên nấc phải khớp thứ tự hiển thị thật
```

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Nấc cỡ chữ | `setting` | enum | `{S,M,L}` | Người chơi chọn ở Settings (Core Rule #10) |
| Hệ số nhân | `FONT_SCALE_STEP` | float const | `{0.875, 1.0, 1.25}` | Tuning knob `font_scale_steps` — đúng 3 giá trị |
| Bề rộng cột cơ sở | `BASE_COLUMN_WIDTH_PX` | int const | ≥0 | Tuning knob `base_column_width_px`, mặc định **360** |
| Khoảng cách 2 cột | `COLUMN_GUTTER_PX` | int const | ≥0 | Tuning knob `column_gutter_px`, mặc định **24** |
| Bề rộng viewport | `viewport_width_px` | float px | `(0, ∞)` | Runtime, từ device; bị bỏ qua khi `is_touch_primary=true` |
| Input chính là cảm ứng | `is_touch_primary` | bool | `{0,1}` | Runtime, từ device — `true` cho mọi thiết bị cảm ứng cầm tay bất kể bề rộng (điện thoại, tablet), `false` cho desktop/mouse-primary |
| Kết quả | `two_column_layout` | bool | `{0,1}` | `1` = đủ chỗ 2 cột (VD Character Card desktop) |

**Output Range:** Boolean. `theme_scale` chỉ nhận đúng 3 giá trị rời rạc (không phải slider).

**Example:** Viewport `1280px`, M → ngưỡng `2×360×1.0+24=744` → `two_column=1`. Cùng viewport, L → ngưỡng `924` → vẫn `1`. Viewport `820px`, L → `820<924` → `0` — người chọn cỡ chữ L mất 2-cột **sớm hơn** người chọn S/M ở cùng thiết bị.

**Chứng minh bất biến** (mirror phong cách O(1) của World Memory): với Mobile Web (`viewport ≤ 480px`), ngay cả ở S (ngưỡng thấp nhất): `2×360×0.875+24 = 654 > 480` — **luôn đúng với mọi setting** → `two_column_layout` **luôn = 0 trên mobile**, suy ra từ công thức, không cần `if is_mobile` viết tay.

**Edge cases:**
- Đổi cỡ chữ giữa lúc màn hình 2-cột đang mở: đây là **tham số hiển thị, không phải world-state** → reflow cập nhật **ngay lập tức** (Core Rule #10 "áp dụng toàn cục") — NGƯỢC với luật "không re-render Card giữa chừng khi `concealment` đổi" của hệ #14 (world-state). Hai luật trông giống nhau nhưng áp dụng ngược nhau — ghi rõ để tránh nhầm.
- Cửa sổ desktop kéo hẹp xuống 500px: xử lý y hệt mobile qua cùng công thức — không có nhánh "desktop vs mobile" riêng.

**Rationale:** Vận hành hóa Core Rule #10 + yêu cầu responsive (technical-preferences.md) thành predicate kiểm được, thay vì media-query rải rác không giải thích được ngưỡng.

**Quyết định UX cho Open Question #1:** thay vì chờ chốt "dải viewport Mobile Web chính thức" (câu hỏi phân loại thiết bị, vẫn hoãn hợp lý tới `/create-architecture`), phần quyết định UX được tách ra và đóng ngay: **mọi thiết bị cảm ứng cầm tay (`is_touch_primary=true`) mặc định 1-cột bất kể bề rộng** — 2-cột trên touch (kể cả tablet rộng) chưa từng được kiểm chứng tốt về Fitts's Law (ngón tay khó với hết bề ngang 2 cột khi cầm 1 tay), trong khi 1-cột luôn hoạt động an toàn trên mọi thiết bị. Câu hỏi phân loại "tablet 768px là Mobile hay không" trở thành vô nghĩa cho riêng quyết định 2-cột này — chỉ còn liên quan tới các quyết định responsive khác chưa nêu ở đây.

### D.6 — Họ thời lượng chuyển cảnh

```
rank(banner)=1 < rank(overlay_settings)=2 < rank(overlay_card)=3 < rank(screen)=4
transition_duration(tier) = DURATION_MS[tier]
DURATION_MS[overlay_card] = card_transition_ms                     // registry, sở hữu #14 — không tune độc lập ở đây
INVARIANT: DURATION_MS[banner] ≤ DURATION_MS[overlay_settings] ≤ DURATION_MS[overlay_card] ≤ DURATION_MS[screen]
```

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Tầng chuyển cảnh | `tier` | enum | `{banner, overlay_settings, overlay_card, screen}` | 4 loại chuyển động UI |
| Hạng trọng lượng thị giác | `rank(tier)` | int | `1–4` | Cố định, banner nhẹ nhất → screen nặng nhất |
| Thời lượng | `DURATION_MS[tier]` | int ms | `[80, 400]` | Tuning knob (banner/settings/screen); `overlay_card` KHÔNG tự do trong dải này — luôn khóa bằng `card_transition_ms` (hệ #14) |
| Kết quả | `transition_duration` | int ms | tra bảng | Thời lượng animation |

**Output Range:** Giá trị rời rạc theo `tier`; ràng buộc là **bất biến thứ tự** (monotonic theo `rank`) — đây là ràng buộc LIÊN-KNOB, không phải 4 khoảng độc lập (xem Tuning Knobs bên dưới: tune trong đúng "dải an toàn" đã khai của từng knob riêng lẻ vẫn có thể phá invariant này nếu không đối chiếu với các knob khác).

**Example:** `DURATION_MS = {banner: 120, overlay_settings: 150, overlay_card: 200, screen: 260}` — mở Story Log (screen) lật trang 260ms; mở Card 200ms (khóa theo #14); banner quota fade 120ms — nhanh nhất, không giành chú ý với page-flip bên dưới.

**Edge case:** Nếu tune sau này đẩy `overlay_settings` cao hơn `overlay_card` → phá bất biến → design smell (Settings có chủ đích "tức thời" hơn "mực loang" của Card — thứ tự có chủ đích).

**Rationale:** Mở rộng tiền lệ `card_transition_ms` (#14) thành họ nhất quán. Vì bất biến phụ thuộc giá trị chính xác của `card_transition_ms`, hằng số đó sẽ được **đăng ký registry** (`source: #14`, `referenced_by: #14, #15`) để thay đổi bên #14 có dấu vết.

### D.7 — `composer_payload_submit_allowed(payload, tm_state, screen)` và giải quyết người nói

*(Bổ sung 2026-09-01, theo quyết định chủ dự án — Core Rule #3c.)* Mở rộng D.1 bằng **AND** (không sửa đổi D.1) cho composer: định nghĩa khi nào 1 `ActionPayload` được phép gửi, và cách 1 chuỗi tên gõ tay được ánh xạ thành `speaker`.

**Data Schema — `ActionPayload`:**

```
ActionPayload = {
  segments: OrderedList<Segment>          // thứ tự = thứ tự người chơi sắp xếp; độ dài ≥1 khi SUBMIT
}

Segment =
  | NarrationSegment
  | DialogueSegment

NarrationSegment = {
  type: "narration",
  text: string                            // văn xuôi tự do; non-empty sau trim khi submit
}

DialogueSegment = {
  type: "dialogue",
  text: string,                           // câu thoại; non-empty sau trim khi submit
  speaker: Speaker
}

Speaker =
  | { kind: "player" }                                              // Nhân vật chính
  | { kind: "known_npc", char_id: string, display_name: string }    // card_exists=true ∧ alive=true tại thời điểm chọn
  | { kind: "new_npc",   proposed_name: string }                    // gõ tự do, KHÔNG có char_id — registry chưa có
```

`char_id` của `known_npc` là snapshot tại thời điểm CHỌN (không re-resolve lúc submit) — nếu NPC đó chết giữa lúc chọn và lúc submit (hiếm, composer chỉ tồn tại ở `awaiting_action` nên không có lượt nào xen giữa), payload vẫn giữ nguyên `char_id` đã chọn — xử lý hệ quả (nếu có) là việc của AI/Combat/NPC Affinity, không phải của composer.

**Nguồn "NPC đã biết"**: tập `{ e | card_exists(e, slot)=true ∧ alive(e)=true }` — sở hữu bởi Character Card & Identity (#14), dữ liệu gốc từ World Memory. Loại `alive=false` khỏi pool speaker: NPC đã chết không gán được vai người nói (nhưng tên đó vẫn gõ được trong đoạn Tường thuật như văn xuôi thường, không kích hoạt tra cứu speaker). Ô tìm kiếm cần một interface LIỆT KÊ (không chỉ predicate 1-entity như `card_exists` hiện có) — đề xuất `list_known_npc_names(slot) → [{char_id, display_name}]`, sở hữu bởi #14 (xem Dependencies + Open Questions, cần #14 xác nhận). Gõ tự do KHÔNG bị giới hạn chỉ trong NPC đã biết — người chơi luôn được xác nhận 1 tên hoàn toàn mới, kể cả khi có gợi ý gần giống.

```
composer_segment_valid(segment) =
    trim(segment.text) ≠ ""                                            AND
    (segment.type = narration
        OR (segment.type = dialogue AND speaker_valid(segment.speaker)))

speaker_valid(speaker) =
    (speaker.kind = player)
    OR (speaker.kind = known_npc AND speaker.char_id ≠ null)
    OR (speaker.kind = new_npc   AND trim(speaker.proposed_name) ≠ "")

composer_payload_submit_allowed(payload, tm_state, screen) =
    write_action_allowed(submit_action, tm_state, screen)              AND   // D.1, KHÔNG sửa
    |payload.segments| ≥ 1                                             AND
    ∀ s ∈ payload.segments : composer_segment_valid(s)
```

```
// Giải quyết người nói — chạy NGAY khi người chơi rời ô tìm kiếm/chọn 1 gợi ý, KHÔNG hoãn tới lúc submit
known_npc_pool(slot) = { e | card_exists(e, slot)=true AND alive(e)=true }          // loại NPC chết — #14
normalize(x) = casefold(trim(NFC(x)))                                               // tái dùng chuẩn hóa đã khóa ở O-ConfirmDelete

resolve_speaker(raw_input, slot) =
    { kind: known_npc, char_id: e, display_name: name(e) }
        if ∃! e ∈ known_npc_pool(slot) : normalize(name(e)) = normalize(raw_input)
    { kind: ambiguous, candidates: {e ∈ known_npc_pool(slot) | fuzzy_score(name(e), raw_input) ≥ NPC_FUZZY_MATCH_THRESHOLD} }
        if |candidates| ≥ 2                                            // không tự resolve
    { kind: known_npc, char_id: e, display_name: name(e) }
        if |candidates| = 1                                            // 1 khớp mờ — vẫn hiện làm gợi ý 1-tap, KHÔNG auto-submit hộ
    { kind: new_npc, proposed_name: trim(raw_input) }
        otherwise
```

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Payload hành động | `payload` | struct | xem Data Schema | Toàn bộ chuỗi đoạn người chơi đã dựng |
| Danh sách đoạn | `payload.segments` | ordered list | ≥0 ở trạng thái soạn, phải ≥1 khi submit | |
| Loại đoạn | `segment.type` | enum | `{narration, dialogue}` | |
| Người nói | `segment.speaker` | struct | chỉ tồn tại khi `type=dialogue` | |
| Trạng thái Turn Manager | `tm_state` | enum | như D.1 | tái dùng, không định nghĩa lại |
| Màn hình nguồn | `screen` | enum | như D.1 | luôn `S2` — composer chỉ tồn tại ở S2 |
| Chuỗi gõ tay | `raw_input` | string | bất kỳ | Nội dung ô tìm NPC khi rời focus/chọn |
| Pool NPC hợp lệ làm speaker | `known_npc_pool(slot)` | set | ⊆ `card_exists=true` | Loại `alive=false` |
| Ngưỡng khớp mờ | `NPC_FUZZY_MATCH_THRESHOLD` | float const | `[0,1]`, mặc định **0.72** | Tuning knob `npc_fuzzy_match_threshold` — thuật toán cụ thể (Jaro-Winkler/trigram...) chọn ở ADR, ngưỡng là hợp đồng UX |
| Kết quả gửi được | `composer_payload_submit_allowed` | bool | `{0,1}` | |
| Kết quả giải quyết người nói | `resolve_speaker` | tagged union | `{known_npc, ambiguous, new_npc}` | `ambiguous` KHÔNG BAO GIỜ ghi thẳng vào `segment.speaker` — chỉ là tín hiệu buộc UI hiện picker |

**Output Range:** `composer_payload_submit_allowed` là AND thuần của 1 điều kiện D.1 sẵn có + 2 điều kiện mới — luôn `{0,1}`, không nhánh lỗi. `resolve_speaker` có đúng 3 kết quả tận cùng khả dụng cho UI (`known_npc`, `new_npc` dùng thẳng; `ambiguous` là trung gian bắt buộc người chơi chọn tay hoặc dùng tùy chọn "Dùng tên mới").

**Example:** payload 3 đoạn `[narration:"Nàng bước vào sảnh."], [dialogue,player:"Ngươi là ai?"], [dialogue,{known_npc,char_id:"bui_lan"}:"Ta là Bùi Lan."]` → `composer_payload_submit_allowed(payload, awaiting_action, S2)=1`. `resolve_speaker("lam", slot)` khi pool có cả "Lam Thiên Hạo" và "Lam Nhi" cùng vượt `0.72` → `{kind: ambiguous, candidates:{Lam Thiên Hạo, Lam Nhi}}`.

**Edge cases (chi tiết đầy đủ ở `## Edge Cases` toàn cục — chỉ tóm 2 case thuần công thức ở đây):**
- `known_npc_pool(slot)` rỗng (lượt đầu 1 playthrough mới): mọi `raw_input` rơi thẳng `new_npc` — không lỗi.
- `fuzzy_score = NPC_FUZZY_MATCH_THRESHOLD` (đúng biên): tính là khớp — dùng `≥`, cùng quy ước biên "closed" D.3 đã dùng cho `should_prefetch`.

**Rationale:** Hình thức hóa TỐI THIỂU cần thiết để (a) không phá D.1 (compose bằng AND, không sửa chữ ký), (b) đảm bảo gán nhầm người nói — rủi ro hệ quả cao nhất (NPC Affinity) — không bao giờ xảy ra âm thầm.

**Lưu ý liên-knob:** 3 knob `transition_banner/settings/screen_ms` (Tuning Knobs bên dưới) có dải an toàn RIÊNG nhưng INVARIANT ở trên là LIÊN-KNOB — tune đúng trong dải riêng của từng knob (VD `banner=200`, `settings=80`, cả hai đều "trong dải an toàn" riêng) vẫn có thể phá bất biến (`200 > 80`). Luôn đối chiếu cả 4 giá trị cùng lúc khi tune, không chỉ kiểm từng knob độc lập với dải của chính nó.

## Edge Cases

- **Nếu lượt resolve thành cái chết trong lúc người chơi đang đọc Story Log (S4, vào lúc Resolving)**: KHÔNG giật người chơi về giữa chừng — hành động "lật về" route đúng luật chuẩn D.2 (S4→S2), KHÔNG tự chain sang S5 nữa (S5 chỉ kích hoạt khi người chơi chạm dòng dẫn tap-to-continue, giống hệt luồng đọc trực tiếp ở S2 — xem Core Rule #6). Người chơi lật về thấy đúng đoạn văn lượt chết tại S2 (đã hiện trong Log họ đang đọc — đúng, vì lượt đã confirmed), kèm dòng dẫn chờ chạm.
- **Nếu một chuyển màn hình xảy ra khi overlay đang mở** (VD: takeover S5 kích hoạt khi Thẻ đang mở): mọi chuyển tầng-màn-hình **tự đóng overlay đang mở** trước khi lật. Overlay thuộc về màn hình bên dưới, không sống sót qua lật trang.
- **Nếu người chơi mở overlay thứ hai khi overlay thứ nhất đang mở** (VD: đang xem Thẻ, bấm 「Mục」→Settings): overlay mới **tự đóng overlay cũ** (không xếp chồng — Core Rule #1: tối đa 1 overlay). Không thông báo, hành vi như "lật sang tờ ghi chú khác".
- **Nếu người chơi tap 2 lần liên tiếp cực nhanh vào thẻ gợi ý** (double-fire trên touch): tap thứ nhất chuyển `tm_state=resolving` **đồng bộ ngay trong frame đó**; tap thứ hai rơi vào `write_action_allowed(submit_action, resolving, S2)=0` → bị nuốt. Không cần debounce timer riêng — D.1 là đủ nếu chuyển trạng thái đồng bộ.
- **Nếu tên nhân vật xuất hiện trong văn tường thuật nhưng `card_exists=false`** (nhân vật được AI nhắc đến nhưng chưa từng xuất hiện trong lượt confirm): tên đó render như chữ thường — **không phải tap target, không gạch chân, không styling link**. Không có trạng thái "link chết".
- **Nếu Undo xóa đúng lượt đầu tiên làm một nhân vật tồn tại** (`card_exists` chuyển true→false): văn tường thuật của lượt đó biến mất theo Undo (Turn Manager), tap-target biến mất cùng văn bản — không cần xử lý riêng. Nếu Thẻ của nhân vật đó **đang mở** khi Undo hoàn tất: Thẻ tự đóng (không còn nguồn tồn tại), người chơi về S2 bình thường.
- **Nếu AI timeout (30s) trong lúc người chơi không ở S2** (đang đọc S4): xử lý lỗi theo Core Rule #9 diễn ra ở S2 (thông báo trong khung tường thuật); người chơi lật về thấy thông báo + khu nhập đã mở khóa. Không banner, không kéo người chơi về.
- **Nếu người chơi bấm nút back của trình duyệt** (HTML5 export): **ngoài phạm vi kiểm soát MVP** — browser back rời khỏi trang game; auto-save 2-checkpoint của Persistence đảm bảo không mất gì ngoài lượt đang Resolving dở (lượt chưa khóa → không tồn tại, đúng ngữ nghĩa). KHÔNG bind lịch sử điều hướng in-app vào browser history ở MVP — ghi thành Open Question cho ADR web export.
- **Nếu xoay màn hình / resize viewport khi overlay 2-cột đang mở**: D.5 tính lại ngay → Thẻ reflow 1↔2 cột live, vị trí cuộn neo theo block đang đọc (block đầu tiên visible giữ nguyên).
- **Nếu bấm "Thử lại" (Reset Failed) liên tục**: nút disabled (mờ mực) khi `state = "Processing Chơi Lại"` (Character Continuation #13 — không phải cờ `reset_in_progress` riêng, ánh xạ thẳng vào state đã tồn tại của #13, xem D.1), mở khóa lại khi `state = "Reset Failed"` — KHÔNG qua D.1/`tm_state` vì Turn Manager không hoạt động tại S5 (GAP-4).
- **Nếu S2 đang ở trần `LIVE_WINDOW_TURNS` (D.3b) và người chơi cuộn lên hết cỡ**: hiện dòng "đọc tiếp về trước, mở 「Lục」" thay vì cố tải thêm lượt vào S2 — không có trạng thái loading/spinner nào ở biên này (khác Resolving, đây là biên hiển thị thuần, không chờ AI).
- **Nếu banner quota xuất hiện khi đang ở Màn hình 3 lối (S5)**: tầng banner render trên **mọi** màn hình kể cả S5 — cảnh báo dung lượng vẫn hợp lệ lúc đang chọn lối tiếp tục (slot mới sắp được tạo cần chỗ).
- **Nếu mở Story Log khi `total_turns=0`** (vừa Bắt đầu mới, chưa confirm lượt nào): `total_pages=0` (D.3) → trạng thái rỗng: trang giấy trắng + một dòng "Chưa có trang nào được viết" — không lỗi, không placeholder khung xám.
- **Submit khi composer hoàn toàn rỗng** (Core Rule #3c/D.7): nút Gửi disabled (`composer_payload_submit_allowed=0`) — không request nào rời UI, không banner, không lỗi giả.
- **Chỉ có 1 đoạn Tường thuật (không đối thoại)**: hợp lệ, tương thích ngược hoàn toàn với "ô tự do" cũ.
- **Tên NPC gõ trùng gần đúng nhiều NPC đã biết**: không tự resolve — luôn hiện picker xếp hạng (D.7), vì gán nhầm speaker ảnh hưởng trực tiếp tính toán bên NPC Affinity & Relationship.
- **Danh sách đoạn quá dài**: không có trần cứng số đoạn (giữ đúng "trọng lượng chấp bút", không chặn cảm hứng giữa chừng); container tự chuyển sang cuộn nội bộ khi vượt chiều cao khu nhập — ngưỡng cuộn là chi tiết UI thuần, không phải giới hạn gameplay.
- **Đổi loại đoạn giữa chừng khi đang gõ dở**: text đã gõ được giữ nguyên (không hủy input — cùng nguyên tắc Core Rule #9); nếu đổi sang Đối thoại, người nói reset về "Nhân vật chính" (không suy đoán từ văn xuôi cũ).
- **NPC đã chết (`card_exists=true, alive=false`)**: bị loại khỏi gợi ý người nói, nhưng tên vẫn gõ tự do được trong 1 đoạn Tường thuật (chỉ là văn xuôi, không kích hoạt tra cứu speaker).
- **Xóa 1 đoạn giữa danh sách**: các đoạn còn lại giữ nguyên thứ tự tương đối, không dồn/đổi định danh loại-speaker của đoạn khác.
- **AI timeout sau submit**: composer khôi phục nguyên vẹn toàn bộ payload đã gửi (mở rộng Core Rule #9) — không lùi về đoạn nháp rỗng.
- **Chuyển màn hình khỏi S2 khi composer đang dở dang, chưa submit** (VD mở 「Lục」): đoạn dở dang giữ nguyên khi quay lại — composer là state cấp screen-Control S2 (không free, Open Question #5a), không thuộc tầng nội dung lượt (D.3b) nên không bị eviction chi phối.
- **Nếu Esc được bấm trên desktop**: tầng cao nhất đang mở tiêu thụ sự kiện — overlay mở → đóng overlay; không overlay → **không làm gì** (không có pause menu — game turn-based không cần pause). Esc không bao giờ thoát màn hình tầng-screen. **Tripwire cho tương lai** (thêm 2026-08-08, `/design-review ai-llm-integration-layer.md` vòng 2, đóng gap `godot-specialist`): nếu BẤT KỲ cơ chế pause `SceneTree` nào (`get_tree().paused = true`) được thêm sau MVP, PHẢI re-verify `process_mode` của node `HTTPRequest` sở hữu bởi `ai-llm-integration-layer.md` (Core Rule #8) — nếu không set `PROCESS_MODE_ALWAYS`, pause sẽ âm thầm dừng ngân sách timeout 30s của tầng đó (`docs/engine-reference/godot/modules/web-export.md` §Q2). Hiện tại đây KHÔNG phải rủi ro sống (không có pause path nào tồn tại) — ghi lại để không bị quên nếu điều kiện tiên quyết này thay đổi.

## Dependencies

### Phụ thuộc chính (theo systems-index)

| Hệ | Chiều | Interface cụ thể | Cứng/Mềm |
|---|---|---|---|
| **Character Card & Identity (#14)** | 2 chiều | #15 cung cấp: điểm vào tap-tên (query `card_exists`) + bút tích 「Thẻ」 + tầng overlay + `two_column_layout` (D.5). #14 cung cấp: toàn bộ nội dung thẻ + `card_transition_ms`. **Mở rộng 2026-09-01 (D.7)**: #14 cần cung cấp thêm `list_known_npc_names(slot) → [{char_id, display_name}]` (đề xuất, cần #14 xác nhận — xem Open Questions) | **Cứng** — đóng dependency "Hard (provisional)" mà #14 đã khai về hệ này |
| **Situation/Encounter Generation (#11)** | đọc | Menu chip intent (nhóm theo NPC) + header cảnh (location + triện) + nudge heuristic — #15 chỉ render, không sở hữu nội dung | **Cứng** — đóng row downstream "Core UI (#15)" bên đó |
| **Combat System (#7)** | ràng buộc | Combat không bao giờ tự kích hoạt chuyển màn hình (ràng buộc HỆ THỐNG — điều hướng người chơi trong trận vẫn theo D.1/D.2 chuẩn); danh sách hành động trận đi qua khung 4-gợi-ý chuẩn | **Cứng** (ràng buộc kiến trúc, không phải data flow) |

### Phụ thuộc bổ sung (chưa có trong bảng index — cùng pattern gap các hệ trước)

| Hệ | Chiều | Interface cụ thể | Cứng/Mềm |
|---|---|---|---|
| **Turn Manager (#1)** | 2 chiều | Đọc `tm_state` + `undo_available` (input cho D.1/D.2); gửi action submit + Undo qua đường chuẩn. **Mở rộng 2026-09-01**: format payload đổi từ chuỗi tự do sang `ActionPayload` có cấu trúc (D.7) | **Cứng** |
| **Contract Enforcement (#2)** | ràng buộc | #15 là mặt thực thi hiển thị của Core Rule #4 bên đó (số liệu chỉ trong khung con dấu) | **Cứng** |
| **World Memory (#5)** | đọc | **Interface đã chốt (2026-08-04)**: `get_turn_page(anchor_turn_id, count, direction) → {records, has_more}` — KHÔNG trả nguyên Nhật ký (điều kiện để D.3 giữ trần bộ nhớ O(1)); `total_turns(slot)` | **Cứng** |
| **Persistence (#6)** | đọc + hiển thị | Danh sách slot + metadata (tên, cảnh giới, world_time, trạng thái, timestamp); banner quota/lỗi ghi | **Cứng** (chiều #15→#6; bên đó đã khai chiều ngược là Mềm — nhất quán: #6 chạy được không cần UI, #15 không chạy được thiếu #6) |
| **Character Continuation (#13)** | đọc | Cờ `continuation_choice_eligible` (kích takeover S5) + trạng thái Reset Failed/retry | **Cứng** |
| **Death & Consequence (#12)** | pass-through | Gợi ý Pending Fate đi qua khung 4-gợi-ý chuẩn, mang trọng lượng thị giác riêng do #15 sở hữu (Core Rule #3b) | Mềm |
| **AI/LLM Layer (#4)** | gián tiếp | Chỉ báo "đang viết" + `ai_call_timeout_seconds=30` | Mềm |
| EXP (#8) / NPC Affinity (#9) / Setting & Canon (#10) | gián tiếp | Mọi hiển thị đi qua Thẻ hoặc khung tường thuật — không interface trực tiếp | — |

### Sở hữu mới phát sinh

- **Cấu hình cấp thiết bị (`app_config`)**: cỡ chữ S/M/L lưu **ngoài** slot bundle (không thuộc Persistence — bên đó chỉ sở hữu dữ liệu playthrough). #15 sở hữu key config nhỏ này; cơ chế lưu web (localStorage) → chung ADR persistence HTML5 đã dự kiến. Xem Open Questions.

### Kiểm tra 2 chiều — gap phát hiện

Đã liệt kê #15 ở chiều ngược: **#6 Persistence** (Mềm), **#11 Situation Gen** (row downstream), **#14 Character Card** (Hard provisional — nay đóng). **Chưa liệt kê** (gap một chiều, cùng pattern 13 gap trước, footnote vào systems-index — không sửa bảng của các GDD đã Approved/Designed): **#1 Turn Manager**, **#2 Contract Enforcement**, **#5 World Memory** (chỉ có UX Flag ngầm), **#7 Combat** (chỉ có văn UI Requirements), **#13 Character Continuation** (khai qua #14, không trực tiếp).

## Tuning Knobs

| Knob | Mặc định | Dải an toàn | Quá cao thì sao | Quá thấp thì sao | Tương tác |
|---|---|---|---|---|---|
| `log_page_size` (D.3) | 20 lượt | 10–50 | Mỗi lần tải trang khựng thấy rõ trên mobile (nhiều node RichText/lần) | Prefetch xoay vòng liên tục, nhiều lần gọi World Memory | Trần bộ nhớ UI = tích với `log_max_loaded_pages` — chỉnh 1 trong 2 phải nhìn tích. **PHẢI** giữ `> log_prefetch_threshold` (INVARIANT D.3) |
| `log_max_loaded_pages` (D.3) | 3 trang | 2–5 | Trần bộ nhớ phình (5×50=250 lượt resident ở biên trên cả hai knob) | <2 thì cửa sổ không giữ nổi trang-hiện-tại + trang-kề → thrash tải/evict | Như trên; 2 là sàn cứng logic |
| `log_prefetch_threshold` (D.3) | 5 lượt | 0–`log_page_size`/2 | Prefetch tham lam — tải trang mới khi vừa cuộn nhẹ | 0 = khựng thấy được đúng lúc chạm biên trang | **PHẢI** `< log_page_size` (INVARIANT hình thức trong D.3) — vi phạm = luôn prefetch, mất hết lợi ích lazy-load |
| `live_window_turns` (D.3b) | **30 lượt** | **`CONTENT_EXCHANGE_ESTIMATE` (#7) hiện hành – 50** (sàn TƯƠNG ĐỐI, không phải số cố định — phải neo theo giá trị #7 đang hiệu lực để không vô tình cho phép giá trị vi phạm invariant liên-hệ `≥ CONTENT_EXCHANGE_ESTIMATE`, mirror cách D.6 xử lý `transition_screen_ms`) | Buffer S2 phình, gần lại đúng rủi ro relayout vô hạn mà knob này tồn tại để chặn — trần bộ nhớ TỔNG cần đối chiếu `technical-director` | Cuộn lên chạm biên "đọc tiếp về trước" quá sớm, cảm giác S2 "quên" ngay cả những gì vừa đọc — VÀ nếu thấp hơn `CONTENT_EXCHANGE_ESTIMATE` (#7), vi phạm invariant liên-hệ mới | Độc lập với `log_*` (D.3 — Story Log) và `undo_availability_window`/`recency_window_turns` — 3 khái niệm "cửa sổ" khác nhau, không dùng chung hằng số. **PHẢI `≥ CONTENT_EXCHANGE_ESTIMATE` (#7 Combat)** — invariant liên-GDD hình thức hóa trong code block D.3b + CI-check ở AC-67 (mirror AC-27/AC-52) |
| `font_scale_steps` (D.5) | {0.875, 1.0, 1.25} | mỗi nấc dao động ±0.125 quanh mặc định, NHƯNG **PHẢI đối chiếu cả 3 giá trị cùng lúc sau khi tune** — dải riêng từng nấc không tự đảm bảo `S < M < L` (liên-knob, cùng nguyên tắc D.6); **đúng 3 nấc** (Core Rule #10) | Nấc L quá lớn → hàng chip wrap gãy, tên dài tràn khung con dấu | Nấc S quá nhỏ → vi phạm mục đích accessibility của chính knob này | Đầu vào của D.4 (glyph size) và D.5 (ngưỡng 2 cột). **PHẢI** giữ `S < M < L` (INVARIANT D.5, CI-check ở AC-69, mirror AC-27/52/67) |
| `base_column_width_px` (D.5) | 360 | 320–420 | 2-cột hiếm khi kích hoạt kể cả desktop rộng | 2 cột bị bóp hẹp, dòng chữ gãy vụn | Cặp với `column_gutter_px`; hệ #14 cần đối chiếu khi khóa layout thẻ thật (note chéo) |
| `column_gutter_px` (D.5) | 24 | 12–48 | Lãng phí bề ngang, đẩy ngưỡng 2-cột lên cao | 2 cột dính nhau, mất ranh giới thị giác | Như trên |
| `transition_banner_ms` (D.6) | 120 | 80 – `transition_settings_ms` hiện hành | Banner giành chú ý với nội dung chính; > `transition_settings_ms` → phá INVARIANT D.6 | Xuất hiện đột ngột như glitch | **LIÊN-KNOB**, không phải khoảng cố định — VD `banner=200 ∧ settings=80` có thể mỗi giá trị "trong dải" riêng nhưng vẫn phá bất biến `banner ≤ settings`. Bất biến D.6: banner ≤ settings ≤ card ≤ screen |
| `transition_settings_ms` (D.6) | 150 | `transition_banner_ms` hiện hành – `card_transition_ms` (#14, mặc định 200) | Settings "sang trọng" quá mức tiện ích; > `card_transition_ms` → phá INVARIANT | < `transition_banner_ms` → phá INVARIANT | Như trên |
| `transition_screen_ms` (D.6) | 260 | ≥ `card_transition_ms` (#14, mặc định 200) – 400 | Lật trang chậm gây ức chế khi qua lại Log↔Chơi nhiều lần | Mất cảm giác "lật trang", thành cắt cảnh khô; < `card_transition_ms` → phá INVARIANT | Đáy dải phải neo theo giá trị `card_transition_ms` (#14) đang hiệu lực, không phải hằng số cố định — nếu #14 tune giá trị đó lên, đáy dải ở đây phải tune theo |

| `npc_fuzzy_match_threshold` (D.7) | 0.72 | 0.5–0.9 | Bỏ lỡ khớp thật, ép người chơi chọn tay dư thừa (hiện picker dù chỉ có 1 NPC gần đúng thật sự) | Auto-resolve sai người — gán nhầm speaker, ảnh hưởng trực tiếp NPC Affinity & Relationship | Độc lập với các knob khác; thuật toán fuzzy-match cụ thể (Jaro-Winkler/trigram...) chọn ở ADR, ngưỡng này là hợp đồng UX không đổi theo thuật toán |

**Không phải knob** (hằng khóa, đổi = re-review chuẩn ngoài): `TOUCH_TARGET_MIN=44`, `MIN_ADJACENT_GAP_PX=4` (D.4).

**Knob thuộc hệ khác, không nhân bản** (trỏ nguồn): `card_transition_ms=200` (#14 — tầng `overlay_card` của D.6), `quota_warn_threshold` (#6 — ngưỡng kích banner), `suggested_action_count=4` (hằng registry #1, không phải knob).

### Registry hằng số dùng chung — Visual/Audio + hằng khóa khác

*Bảng này là NGUỒN DUY NHẤT cho mọi giá trị placeholder/hằng khóa dùng lặp lại trong Visual/Audio + Formulas — mọi nơi khác trong GDD PHẢI tham chiếu tên biến, KHÔNG lặp lại số. Khi sửa 1 giá trị, sửa Ở ĐÂY trước, rồi grep toàn văn tên biến để xác nhận không còn số cũ nào sót lại.*

| Hằng số | Giá trị hiện hành | Định nghĩa gốc | Dùng bởi | Trạng thái |
|---|---|---|---|---|
| Alpha — mực đầy | `1.0` | Mục 9 (bảng feedback) | Văn tường thuật mặc định, dòng mời cỡ chữ (AC-63b) | Khóa |
| Alpha — "-1 bậc" (nhạt) | `0.68` | Mục 9 | Chỉ báo "đang viết" (mục 3), empty-state (mục 8) | Placeholder — `art-director` xác nhận khi khóa bảng màu |
| Alpha — mờ mực (disabled) | `0.38` | Mục 9 | Trạng thái Disabled (D.1 mutating khi resolving/undoing), nút "Thử lại" khi `state="Processing Chơi Lại"` | Placeholder, dựa miễn trừ WCAG 1.4.3 |
| Alpha — nhịp thở tap-to-continue | `[0.85, 1.0]` | Mục 2 (S5 takeover) | AC-61a | Placeholder — khóa đáy trên ngưỡng 0.68 có chủ đích |
| Focus indicator — độ dày | `2px` | Mục 9 | Mọi phần tử focusable qua bàn phím | Khóa, không co theo `theme_scale` |
| Font-weight — thân văn | `400` | Mục 11 | Baseline so sánh cho tap-tên | Placeholder |
| Font-weight — tap-tên (Họ B đậm hơn) | `600` | Mục 11 | AC-53 `[Unit]` | Placeholder |
| Font-weight — bút tích Họ A (thường trực, nhạt hơn) | `300` | Mục 1 | AC-53 `[Unit]` (nhánh Họ A) | Placeholder |
| Desaturation — S4-RO vs S4 live | `-40%` (giữ nguyên lightness) | Mục 7 | Phân biệt S4/S4-RO khi cả 2 cùng có nút "«..." | Placeholder |
| `TOUCH_TARGET_MIN` | `44px` | D.4 | Mọi phần tử độc lập nhóm (b), AC-20/22 | Hằng khóa (không phải knob) |
| `MIN_ADJACENT_GAP_PX` | `4px` | D.4 | AC-22 | Hằng khóa |
| `undo_depth` | `1` | Turn Manager #1 (registry) | Core Rule #5, mục 12 | Trỏ nguồn #1 |
| `ai_call_timeout_seconds` | `30` | AI/LLM Layer #4 (registry) | Core Rule #9, AC-33/34 | Trỏ nguồn #4 |
| `live_window_turns` | `30` | D.3b (Tuning Knobs ở trên) | AC-48/49/50/58/66/67 | Tuning knob #15, PHẢI `≥ CONTENT_EXCHANGE_ESTIMATE` |
| `CONTENT_EXCHANGE_ESTIMATE` | `30` (mặc định), dải `15–50` | Combat #7 (registry) | Invariant D.3b (AC-67) | Trỏ nguồn #7, không nhân bản |

⚠️ **Rủi ro liên-GDD đã xác nhận — CẢ 2 CHIỀU**: dải an toàn của `card_transition_ms` khai ở #14 (0–400ms) là **độc lập**, không hề tham chiếu invariant liên-knob D.6 (`banner ≤ settings ≤ card ≤ screen`) của #15 — invariant có thể vỡ theo **2 hướng độc lập**, không chỉ 1: (a) nếu #14 tune `card_transition_ms` XUỐNG dưới `transition_banner_ms` hiện hành, phá `banner ≤ card`; (b) nếu #14 tune `card_transition_ms` LÊN cao — VD 300, vẫn hoàn toàn hợp lệ trong dải riêng 0–400 của #14 — trong khi `transition_screen_ms` mặc định của #15 chỉ là 260, phá `card ≤ screen` ngay cả khi #15 KHÔNG tune gì cả. Cả 2 chiều đều là rủi ro độc lập, không trùng nhau. AC-27 (registry-based, BLOCKING) là lưới an toàn CI đủ mạnh để chặn CẢ 2 chiều khi merge — không blocking cho approve GDD này — nhưng khi `/create-architecture` đăng ký `card_transition_ms` vào registry (đã cam kết ở D.6 Rationale), cần thêm dòng ghi chú chéo trong chính `character-card-identity.md` nêu rõ CẢ 2 chiều rủi ro để người tune biết ràng buộc tồn tại trước khi CI báo đỏ.

## Visual/Audio Requirements

*(Đặc tả bởi `art-director`, duyệt 2026-08-04 — toàn bộ 10 giả định (a)–(j) được chấp nhận. Audio: tối thiểu theo game-concept, không có yêu cầu riêng ở MVP.)*

### 1. Ba bút tích lề 「Thẻ」「Lục」「Mục」

- **Thuần typography** — chính 3 chữ LÀ icon, không asset icon riêng (tái dùng nguyên tắc badge 「che giấu」 hệ #14). Font họ "văn Hồ sơ" (bút lông, cùng family chữ tường thuật) — KHÔNG dùng family "số trong seal". Trọng lượng NHẸ HƠN thân văn 1 bậc — bút tích lùi vào hậu cảnh nhưng đọc được ngay.
- **Không khung bao** ở trạng thái mặc định — không viền tròn/vuông/pill (khác hẳn ngôn ngữ "nav bar icon"). Vùng chạm thật (D.4 nhóm (b), ≥44px) vô hình, mở rộng ngoài glyph.
- **Bố trí — 2 vị trí lặp lại tại S2**: (a) bản trên — xếp dọc lề phải header cảnh, mỗi bút tích 1 dòng riêng, tôn trọng `MIN_ADJACENT_GAP_PX`; (b) bản dưới — cùng 3 chữ, cùng ngôn ngữ thị giác (không khung, trọng lượng nhẹ hơn thân văn), xếp NGANG cạnh khu nhập hành động, cùng hàng với nút Undo. Hai bản là cùng 1 điểm vào chức năng (không phải 2 hệ thống riêng) — chỉ lặp vị trí để luôn có 1 bản trong tầm tay bất kể người chơi đang cuộn ở đâu. S4/S4-RO/S5 giữ nguyên 1 vị trí (thanh chrome đầu màn hình) vì các màn hình đó không có khu nhập hành động ở đáy.
- **Trạng thái "không có"** phân biệt 2 loại: khóa tạm bởi Turn Manager → chỉ áp cho hành động MUTATING bên trong overlay (mờ mực alpha); không áp dụng về cấu trúc cho màn hình hiện tại (VD 「Mục」 ở S4-RO) → **ẩn hoàn toàn**, không ghost (cùng logic nút Undo biến mất). Bút tích tự nó không bao giờ mờ mực — cả 3 đều readonly, luôn tự do.
- Ở S5, 「Mục」 chỉ còn "Về danh sách sổ" — bút tích không đổi hình, chỉ nội dung menu đổi.
**Hai họ con của "ngôn ngữ marginalia" — KHÔNG cùng hướng đậm/nhạt**:

- **Họ A — bút tích thường trực** (「Thẻ」「Lục」「Mục」, mục này): **NHẸ HƠN** thân văn 1 bậc (font-weight **300**, xem Registry hằng số dùng chung) — xuất hiện lặp lại hàng trăm lần mỗi phiên chơi, người chơi HỌC vị trí cố định của chúng qua lặp lại, nên được phép "lùi vào hậu cảnh" mà không mất khả năng tìm thấy.
- **Họ B — tap-target chủ động hiếm gặp** (tap-tên trong văn tường thuật — mục 11; dòng dẫn biên cửa sổ S2 "đọc tiếp về trước" — D.3b; dòng tap-to-continue trước S5 takeover — Core Rule #6): **ĐẬM HƠN** thân văn 1 bậc, cùng chiều với mục 11 — các phần tử này KHÔNG có vị trí cố định để học qua lặp lại (trôi nổi trong dòng chảy văn bản, hoặc chỉ xuất hiện 1 lần/hiếm), nên cần tự nổi bật ngay lần đầu thay vì dựa vào trí nhớ vị trí của người chơi.

Cả 2 họ đều dùng chung: font "văn Hồ sơ", không khung bao, không màu, vùng chạm thật ≥44px vô hình mở rộng ngoài glyph — khác nhau DUY NHẤT ở hướng đậm/nhạt, vì lý do phát hiện (discoverability) khác nhau đã nêu trên. Dòng dẫn biên cửa sổ S2 (D.3b) và dòng tap-to-continue trước S5 (Core Rule #6) đều thuộc **Họ B** — không phải hằng số riêng, không phải empty-state (mục 8), và không cùng hướng với 3 bút tích của chính mục này.

**Onboarding lần đầu**: quy ước "chữ đậm/nhạt hơn 1 bậc = tap target" (Họ A/B ở trên) là 1 quy ước thị giác hoàn toàn riêng của game này — không giống bất kỳ mental model "nav = icon/nút/khung" nào người chơi mang sẵn. Để tránh người chơi lần đầu bỏ lỡ hoàn toàn cả 3 bút tích lẫn tap-tên: lần ĐẦU TIÊN S2 render **trên toàn bộ thiết bị** (per-device, đọc field `has_seen_marginalia_onboarding` trong `app_config` — CÙNG cơ chế lưu trữ đã dùng cho cỡ chữ, xem mục 4), 3 bút tích Họ A chạy 1 nhịp **"vừa được viết ra"** (ink-reveal — nét mực hiện dần từ trong suốt tới trọng lượng bình thường, ~1 lần duy nhất, không lặp) để mắt tự nhiên chú ý mà không cần tooltip/bong bóng chỉ dẫn kiểu app — giữ đúng tinh thần diegetic. *(Trigger per-device, không theo slot — nếu neo theo slot, mỗi lần chết+"Chơi lại"/"Bắt đầu mới" tạo slot MỚI [D.3b, hàng "Chuyển sang SLOT KHÁC"] sẽ khiến ink-reveal replay ở MỌI slot mới, người chơi chết 20 lần thấy animation 20 lần — ngược nguyên tắc "không lặp lại điều đã học" mà GDD áp dụng nhất quán ở mọi nơi khác. Set `has_seen_marginalia_onboarding=true` ngay sau lần chạy đầu tiên, không phụ thuộc slot.)* Xem thêm mục 4 (Save Slot Screen) cho phần hỏi cỡ chữ chủ động — vì 「Mục」→Settings là nơi DUY NHẤT chứa tính năng cỡ chữ (accessibility), không thể chỉ dựa vào việc người chơi tự phát hiện quy ước ẩn này.

→ **Art Bible**: "Marginalia, not chrome" — điểm vào điều hướng toàn cục đọc như ghi chú tay, không bao giờ dùng ngôn ngữ button/icon-badge kiểu app. Trong họ ghi chú tay đó, đậm/nhạt mã hóa tần suất-học-được: cái gì người chơi gặp lại thường xuyên được phép nhạt; cái gì hiếm/trôi nổi phải tự đậm.

### 2. Họ chuyển cảnh lật trang (D.6)

- **Tầng `screen` (260ms)**: màn hình ĐI skew nhẹ + scale_x co (1.0→~0.85) pivot tại cạnh "gáy" trong 60% đầu, fade 40% cuối; màn hình ĐẾN nằm sẵn layer dưới, KHÔNG tự animate — chỉ 1 Control cần animate, rẻ.
- **Hướng lật mã hóa chiều điều hướng**: tiến (vào sâu) lật từ phải; lùi/đóng lật từ trái — wayfinding tự nhiên không cần breadcrumb/nút back.
- **Takeover S5 (Core Rule #6) KHÔNG dùng page-flip**: đây là chuyển cảnh DUY NHẤT trong game không do người chơi tap — luật "tiến lật phải/lùi lật trái" không có ý nghĩa ở đây (không có "chiều điều hướng" do người chơi chọn). Chữ ký riêng: trang S2 hiện hành **mực nhòe/lặng đi tại chỗ** (không skew/scale_x, không dịch chuyển ngang) rồi S5 hiện ra — tách biệt rõ ràng "đây không phải một lần điều hướng nữa" cho đúng khoảnh khắc cao-stakes nhất của game. Chi tiết animate (tween alpha + nhòe nhẹ, ~`transition_screen_ms`) giao `technical-artist`, không blocking.
- **Nhịp "thở" cho dòng dẫn tap-to-continue TRƯỚC takeover** — khác với chính animation takeover ở trên (xảy ra SAU khi tap): dòng dẫn "… (chạm để tiếp tục)" (Core Rule #6, Họ B mục 1) tự mang 1 nhịp alpha dao động chậm và đều (chu kỳ ~2s, KHÔNG nhấp nháy nhanh — không kích hoạt vestibular/seizure trigger), lặp liên tục cho tới khi được chạm — mục đích DUY NHẤT là kéo mắt người chơi về đúng chỗ cần tap ngay sau khi đọc xong đoạn văn cảm xúc cao, không phải trang trí. **Biên độ neo số**: dao động alpha trong khoảng **`[0.85, 1.0]`** (KHÔNG xuống tới bậc "-1" 0.68 đã khóa ở mục 9 cho text thụ động) — đáy chu kỳ (0.85) vẫn giữ contrast rõ ràng trên nền `#F5EFE0` (ước tính ~11:1, xa trên ngưỡng AA 4.5:1), đảm bảo dòng dẫn KHÔNG BAO GIỜ mất khả năng đọc/phát hiện tại bất kỳ điểm nào trong chu kỳ thở. Không map theo `%` thời gian thật (khác chỉ báo "đang viết" mục 3 — dòng này không có deadline). Dừng nhịp thở ngay khi chạm, chuyển thẳng sang animation takeover ở bullet trên.
- **Không fade-to-black** — nền giấy kem là base xuyên suốt; degradation xấu nhất là cắt cứng giấy-sang-giấy.
- Highlight mép giấy đang lật (gradient chéo alpha thấp) = polish tùy chọn, giao `technical-artist`, không blocking.
- **Mỗi tầng có 1 chữ ký chuyển động riêng** (không tái dùng chéo): `screen` = lật trang; `overlay_card` = mực loang (#14 sở hữu, không định nghĩa lại); `overlay_settings` = trượt dọc từ mép trên + fade, KHÔNG mực loang (Settings là hành chính, không "sống"); `banner` = fade + rơi nhẹ 1 nấc.

→ **Art Bible**: "Mỗi tầng UI có đúng 1 chữ ký chuyển động — trọng lượng thị giác mã hóa bằng CẢ thời lượng LẪN loại chuyển động."

### 3. Chỉ báo "Thế giới đang viết" (Resolving, Core Rule #9)

- Vị trí: **inline trong khung tường thuật**, tại chỗ đoạn văn kế tiếp sẽ xuất hiện — không overlay/toast riêng.
- Hình thức: 1 nét mực ngang ngắn (~60–80px ở scale M) quét trái→phải lặp, đuôi mờ dần — **vòng lặp bất định**, KHÔNG map % thời gian thật. Tuyệt đối không spinner — chỉ chuyển động NGANG.
- Kèm dòng chữ tĩnh "Thế giới đang viết…" font Hồ sơ (không seal — không phải sự thật cơ học), -1 bậc alpha.
- Timeout: nét mực bị **thay thế** mượt bởi thông báo lỗi đen-xám — không đỏ son (lỗi kỹ thuật ≠ hệ quả cơ học).
- Chi phí: 1 Control clip-rect width tween hoặc Line2D — không shader.

→ **Art Bible**: "Trạng thái chờ không bao giờ dùng ẩn dụ máy móc (spinner/progress/loading) — luôn dùng ẩn dụ mực/bút."

### 4. Save Slot Screen

- **Bố cục**: list dọc, mỗi slot = 1 hình "gáy sách" — thanh gáy đậm mực trái (~8–12px) + "bìa" giấy kem chứa metadata (tên, cảnh giới, world_time, lần lưu cuối). Cố tình HÌNH HỌC/thẳng nét — đối lập khung mực loang hữu cơ của Card, tránh nhầm lẫn bề mặt.
- **Slot đang chơi**: mép phải có cue trang hé mở hoặc góc gấp nhẹ (dog-ear); mực đậm bình thường.
- **Slot đã khép**: bìa phẳng đóng kín; góc trên-phải mang con dấu Persistence đã đặc tả (chỉ định vị trí, không thiết kế lại); **toàn bộ gáy+bìa+chữ khử bão hòa xám-đen** (không alpha, KHÔNG đỏ son — xem mục 10). **Bổ sung 2026-08-07** (`/design-review persistence-save-system.md` vòng 3, đóng gap `game-designer`: "đã khép" nay có 2 nguyên nhân — `slot_closure_reason ∈ {death, quota_exhausted}`, Core Rule #10 hệ đó): con dấu góc trên-phải PHẢI phân biệt 2 nguyên nhân bằng NỘI DUNG con dấu (VD ký hiệu/chữ khác nhau, không phải màu — khớp nguyên tắc "chữ thay icon" toàn hệ), chrome nền (gáy phẳng, khử bão hòa) giữ NGUYÊN chung cho cả 2 — chỉ con dấu khác nhau, không phát sinh 1 hình khối hoàn toàn mới cho `quota_exhausted`.
- **Slot không đọc được** (`error_code=LOAD_FAILED_UNREADABLE`, Persistence — bổ sung 2026-08-06 `/design-review`, đóng gap: mã lỗi này trước đây không có bề mặt hiển thị cụ thể ở tài liệu nào): đây là trạng thái THƯỜNG TRỰC của chính slot đó, KHÔNG phải banner tạm thời (mục 5) — hiển thị 1 nhãn cố định ngay trên hàng slot thay cho metadata bình thường (cảnh giới/world_time), VD 1 con dấu mực nhòe "?" + dòng chữ ngắn "Trang này đã phai mực". Hành động khả dụng CHỈ có "Xóa" (qua đúng quy trình xác nhận đã đặc tả ở `persistence-save-system.md`) — không có "Tiếp tục"/"Xem lại"/"Chép lại quyển sổ", vì không còn nội dung nào đọc được. Slot KHÔNG tự động biến mất khỏi danh sách.
- **"Bắt đầu mới"**: đầu danh sách, gáy nét đứt rất nhạt, không cue mở/dấu khép — "cuốn sổ trắng chưa viết".
- **Xóa slot**: xác nhận giữ style con dấu đen-xám, KHÔNG nút đỏ/danger — thao tác menu ≠ hệ quả cơ học.
- **Nhiều slot**: virtualize danh sách (cùng tinh thần trần bộ nhớ D.3).
- **Hỏi cỡ chữ chủ động lần đầu mở app**: lần Save Slot Screen render mà `app_config` CHƯA có field cỡ chữ đã-chọn (`font_size_setting` chưa tồn tại — tách biệt tường minh khỏi field `has_seen_marginalia_onboarding` ở mục 1, xem dưới), hiện 1 dòng diegetic đơn giản mời chọn cỡ chữ (3 tap target S/M/L, cùng style đã đặc tả ở mục 6 Settings) **ghim cố định phía trên list slot, trước cả "Bắt đầu mới"** (không cuộn lẫn trong danh sách virtualized) — KHÔNG phải modal ép buộc, không chặn "Bắt đầu mới"/"Tiếp tục".
  - **Ngữ nghĩa trigger — CHỦ ĐÍCH lặp lại tới khi CHỌN, không phải tới khi THẤY**: nếu người chơi bỏ qua dòng mời (không tap S/M/L nào) rồi thoát app, `font_size_setting` không được ghi → dòng mời hiện LẠI ở lần mở Save Slot Screen kế tiếp, lặp lại cho tới khi người chơi thực sự CHỌN 1 nấc. Đây là quyết định có chủ đích (không phải bug): tính năng accessibility không nên bị "đã xem 1 lần rồi thôi" — người chơi có thể bỏ qua nhiều lần vì đang vội, nhưng cơ hội chọn cỡ chữ phù hợp không nên biến mất vĩnh viễn sau đúng 1 lần lướt qua.
  - **Contrast/size tối thiểu ở cấu hình MẶC ĐỊNH — bắt buộc, không phụ thuộc `theme_scale`**: dòng mời PHẢI tự đạt **alpha bậc 1.0 (mực đầy, KHÔNG dùng ngôn ngữ marginalia Họ A nhạt hơn)**, cỡ glyph **≥ cỡ thân văn tại nấc M** (không phụ thuộc `theme_scale` hiện hành — luôn render ở nấc M bất kể setting đã lưu trước đó, vì đây là bước THIẾT LẬP cỡ chữ, chưa có setting nào đáng tin để dựa vào), và 3 tap-target S/M/L mỗi cái `≥ TOUCH_TARGET_MIN` theo D.4 nhóm (b). Lý do: đây là đường dẫn DUY NHẤT giúp người thị lực kém tìm ra tính năng khắc phục cho chính họ — nếu dòng mời tự nó khó đọc, tạo đúng vòng lặp thất bại accessibility mà onboarding được sinh ra để tránh (nguyên tắc bootstrapping: affordance dẫn tới 1 tính năng accessibility phải tự đạt ngưỡng accessibility ở cấu hình mặc định).

→ **Art Bible**: "Mỗi 'kho chứa' trong ẩn dụ nhật ký có 1 hình khối riêng — organic-blot = dữ liệu sống; geometric-spine = vật thể chứa; seal góc cạnh = sự thật đã khóa."

### 5. Banner tier

- **1 style duy nhất mọi nguồn**: dải giấy mỏng ngang, nền giấy kem đậm hơn nền chính 1 bậc, viền mực mảnh CHỈ cạnh dưới, chữ đen-xám.
- **Luật chung cả tầng** (nâng tiền lệ Reset Failed #13): KHÔNG BAO GIỜ đỏ son/xanh ngọc cho banner, mọi nguồn — lỗi kỹ thuật không phải hệ quả cơ học vĩnh viễn.
- KHÔNG icon cảnh báo màu — dùng TỪ tiếng Việt rõ nghĩa (nguyên tắc "chữ thay icon" của #14).
- **Tối đa 1 banner** cùng lúc (mirror Core Rule #1) — banner mới xếp hàng chờ, **NGOẠI TRỪ** (bổ sung 2026-08-06, `/design-review` `persistence-save-system.md`): banner lỗi ghi save (Persistence, `WRITE_FAILED_*`) được phép PREEMPT/thay thế 1 banner cảnh báo quota đang mở — người chơi cần biết NGAY lượt vừa rồi có được ghi nhận hay không; banner quota-warning bị đẩy lùi lại hàng chờ, hiện lại sau khi banner lỗi ghi được dismiss. Mọi cặp banner khác vẫn theo FIFO thuần túy, không có ngoại lệ nào khác.
- Dismiss: tap X (readonly) hoặc tự biến mất khi điều kiện gốc hết — **không auto-timeout** (cảnh báo cần hành động).
- Render trên MỌI màn hình kể cả S5.
- **Ràng buộc vị trí**: banner KHÔNG BAO GIỜ được che khuất dòng dẫn tap-to-continue (S5 takeover, Core Rule #6) hay bất kỳ tap-target Họ B nào đang hiện — vị trí cụ thể (top/bottom) quyết ở `/ux-design`.

→ **Art Bible**: "Đỏ son = hệ quả thế giới đã khóa. Không bao giờ dùng cho lỗi hạ tầng/kỹ thuật."

### 6. Settings overlay

- Nền giấy kem + typography chuẩn — KHÔNG bảng điều khiển xám/xanh kiểu app.
- **Ngoại lệ hình học PHI-DIEGETIC duy nhất toàn game**: game có 2 trục hình khối khác nhau — trục 1 (diegetic, đã dùng ở nơi khác): gáy sách Save Slot (mục 4), seal góc cạnh (Persistence) — đều hình học NHƯNG vẫn là vật thể/con dấu có thật trong ẩn dụ nhật ký; trục 2 (phi-diegetic): Settings là **ngoại lệ DUY NHẤT ở trục này** — 1 tấm giấy chữ nhật phẳng, list dọc nhãn+control — không khung mực loang (dành riêng Card), không drop-shadow, không bo góc app hiện đại, và KHÔNG giả vờ là một vật thể trong thế giới (khác gáy sách/seal, vốn giả vờ là vật thật).
- **Cỡ chữ S/M/L**: 3 tap target ngang hàng, mỗi ô hiển thị CHÍNH glyph mẫu ở kích thước thật sẽ áp dụng (xem trước bằng mắt); ô đang chọn = 1 chấm mực đặc nhỏ bên dưới (KHÔNG gạch chân — đã mang nghĩa "hậu quả thoáng qua" ở hệ #12).
- **Cấu hình AI**: hàng nhãn+input đơn dòng cùng style — field cụ thể do ADR backend quyết.

→ **Art Bible**: "Đúng 1 ngoại lệ hình học phẳng được phép: Settings — phi-diegetic có chủ đích, không phải sơ suất."

### 7. Story Log screen chrome (nội dung do World Memory sở hữu)

- Chuyển cảnh vào/ra: page-flip tầng `screen`, tiến khi vào từ S2, lùi khi lật về.
- **"về đầu câu chuyện"**: bút tích nhỏ cùng family mục 1, ở thanh chrome mỏng đầu màn hình; ký hiệu mũi tên = 1 nét mực hất chéo tay vẽ, KHÔNG chevron UI chuẩn. Tap → `default_page_index → 0`, reload theo D.3.
- **S4 vs S4-RO**: S4-RO mang 1 con dấu tĩnh góc trên-trái (TÁI DÙNG con dấu "đã khép" mục 4); toàn chrome + văn bản S4-RO **khử bão hòa xuyên suốt** — "cuốn sách đã đóng đọc xám hơn", không chỉ 1 badge. **Số neo (khử bão hòa là tín hiệu CHÍNH phân biệt S4/S4-RO khi cả 2 đều có nút "«...")**: giảm saturation **-40%** so với màu gốc (placeholder kỹ thuật, `art-director` xác nhận khi khóa bảng màu — cùng tinh thần placeholder alpha ở mục 9), giữ nguyên độ sáng (lightness không đổi, chỉ giảm bão hòa) để không đụng ngưỡng contrast đã khóa. S4 live giữ full-contrast (saturation gốc, 0% khử).
- S4 mở trong Resolving: cuộn tới cuối thấy đúng chỉ báo "thế giới đang viết" (mục 3) — nhất quán với S2.
- **Exit ở S4 (live)**: bút tích văn bản tĩnh "« Chơi tiếp" cùng thanh chrome, cùng family mục 1 (Họ A — nhẹ hơn, vì đây là vị trí cố định người chơi học được qua lặp lại). KHÔNG cần adaptive theo `origin_screen` như S4-RO — S4 (live) chỉ có đúng 1 nguồn mở (S2 qua 「Lục」, Core Rule #3), nên đích quay về luôn là S2.
- **Exit ở S4-RO**: bút tích văn bản thích ứng theo `origin_screen` (D.2): "« về danh sách sổ" (từ S1) / "« về [tên nhân vật]" (từ S5).

→ **Art Bible**: "Sách đã đóng đọc xám hơn sách đang mở — bằng tông màu xuyên suốt bề mặt, không phải badge phụ."

### 8. Empty states

- **Story Log 0 lượt**: dòng "Chưa có trang nào được viết" (đã khóa ở Edge Cases), căn giữa, font Hồ sơ, -1 bậc alpha, KHÔNG icon/khung xám.
- **Save Slot 0 slot**: dòng "Chưa có sổ nào — hãy bắt đầu cuốn đầu tiên"; mục "Bắt đầu mới" VẪN hiển thị phía trên — empty state giải thích danh sách trống, không thay CTA. **Bổ sung 2026-08-07** (`/design-review persistence-save-system.md` vòng 3, đóng gap `game-designer`/`godot-specialist`: Persistence lưu trữ per-thiết-bị, không đồng bộ đa-thiết-bị ở MVU — mở game lần đầu trên 1 thiết bị KHÁC sẽ cho ĐÚNG cùng trạng thái "0 slot" như "đã xóa hết", không phân biệt được về mặt DỮ LIỆU vì không có tín hiệu nào để phân biệt): dùng CHUNG 1 dòng empty-state này cho cả 2 tình huống — không cố tạo phân biệt giả (không có cách nào biết chắc "đây là thiết bị mới" so với "đã xóa hết trên chính thiết bị này"); nếu cần giảm nhầm lẫn "tưởng mất save", cân nhắc bổ sung 1 dòng phụ diegetic ở `/ux-design save-slot-screen.md` kiểu "mỗi cuốn sổ chỉ thuộc về nơi nó được viết" — quyết định copy cụ thể để ngoài scope GDD này.
- Công thức chung toàn game: **1 dòng chữ lặng lẽ, font prose, -1 bậc alpha, không khung, không icon, căn giữa.**

→ **Art Bible**: "Rỗng có chủ đích ≠ lỗi tải — luôn 1 dòng chữ mực nhạt, không bao giờ khung xám/spinner/icon cảnh báo."

### 9. Focus/hover/touch feedback (Godot 4.6 dual-focus)

| Kênh | Khi nào | Hình thức | Bắt buộc? |
|---|---|---|---|
| **Pressed** | Mọi input (touch + mouse) | Tăng 1 bậc độ đậm mực tức thời (không fill nền, không scale-bounce) | BẮT BUỘC — kênh duy nhất touch nhận |
| **Hover** | Chỉ mouse (desktop) | Y hệt pressed nhưng khi chưa nhấn | Bonus — không load-bearing |
| **Focus** | Tab/bàn phím | Viền mực mảnh 1–2px đen thuần (không glow/blur) bao đúng **vùng chạm thật D.4** | BẮT BUỘC — kênh duy nhất người dùng bàn phím nhận |
| **Disabled** | Resolving/Undoing, action mutating | Alpha giảm (mờ mực), không nhận kênh nào khác | Đã khóa Core Rule #4 |

- Không ripple Material, không scale-bounce — mọi thay đổi là hard cut hoặc fade ≤150ms (chung quy tắc chuyển động toàn UI với Combat System).

→ **Art Bible**: "3 kênh phản hồi input tách biệt: pressed (bắt buộc, mọi input), hover (bonus, mouse), focus (bắt buộc, bàn phím) — không kênh nào thay thế kênh kia."

**Giá trị alpha/contrast (placeholder)** — mô tả nghệ thuật ("mờ mực", "-1 bậc alpha") dùng lặp lại ≥4 nơi (Disabled ở đây; chỉ báo "đang viết" mục 3; empty state mục 8; banner mục 5); số dưới đây tính bằng công thức WCAG relative luminance + alpha-composite (sRGB space) trên 2 mã màu đã khai `#F5EFE0`/`#2B2620` — làm **placeholder kỹ thuật**, `art-director` xác nhận/điều chỉnh khi khóa bảng màu chính thức (art bible):

| Bậc | Alpha (trên nền giấy kem #F5EFE0-tương đương) | Mực gốc (thân văn) | Contrast ratio đạt được | Dùng cho |
|---|---|---|---|---|
| Mực đầy (100%) | 1.0 | Mực đen-xám thân văn (~#2B2620) | ≈13.1:1 | Văn tường thuật mặc định |
| -1 bậc (nhạt) | **0.68** | Cùng mực gốc, alpha 0.68 | **≈4.9:1** | Chỉ báo "đang viết" (mục 3), empty-state (mục 8) — TEXT ĐANG HOẠT ĐỘNG, không có miễn trừ, phải đạt AA thật. (Dòng "đọc tiếp về trước" D.3b KHÔNG ở bậc này — nó là tap-target, dùng styling bút tích marginalia mục 1, không phải bậc alpha thụ động này.) |
| Mờ mực (disabled) | 0.38 | Cùng mực gốc, alpha 0.38 | **≈2.2:1** | Trạng thái Disabled (bảng trên), nút "Thử lại" khi `state="Processing Chơi Lại"` — dựa vào miễn trừ WCAG 1.4.3 (text của inactive UI component), KHÔNG tự nhận đạt AA |

Bậc 100% và bậc "-1" (0.68) đạt **≥4.5:1** (WCAG AA cho text thường) trên nền giấy kem đã mô tả. Bậc "mờ mực" (0.38) hụt AA về số nhưng hợp lệ nhờ miễn trừ 1.4.3 cho thành phần vô hiệu hóa — không hạ alpha thấp hơn 0.38 nếu nền giữ nguyên độ sáng hiện tại (đã là sàn thực nghiệm, không phải sàn lý thuyết). Toàn bộ 3 số vẫn là **placeholder kỹ thuật** — `art-director` xác nhận/điều chỉnh khi khóa bảng màu chính thức; số đã sửa chỉ đảm bảo placeholder không tự mâu thuẫn với chuẩn nó tuyên bố đạt. Viền focus (dòng "Focus" ở bảng trên) chốt cố định **2px** (không còn dải "1–2px" mơ hồ), không co theo `theme_scale` (D.5) — độ dày viền là hằng số độc lập cỡ chữ.

### 10. Khẩu phần màu — #15 hoàn toàn MONO

Mọi bề mặt #15 **tự sở hữu** (bút tích, page-flip, chỉ báo đang-viết, chrome Save Slot, banner, Settings, chrome Story Log) đều MONO — giống hệ #13, không phát sinh cách dùng đỏ son/xanh ngọc mới. Hai màu accent chỉ xuất hiện khi #15 làm **sân khấu** cho nội dung hệ khác (Card mở từ 「Thẻ」 mang nguyên badge đỏ son của #14/#12; văn tường thuật trong khung #15 mang nét đỏ thoáng qua của #12) — #15 không restyle, không nhân bản.

**Mở rộng precedent log màu** (được duyệt): con dấu "đã khép" trên Save Slot/Story Log read-only dùng **khử bão hòa, KHÔNG đỏ son** — dù slot khép tương ứng `alive=false` và Card nhân vật đó hợp lệ mang triện đỏ. Không mâu thuẫn: Card = "soi 1 đời cụ thể" (màu khẩu phần hợp lệ, hiếm); Save Slot = "mục lục nhiều đời cùng lúc" — tô đỏ ở đây nhân bản tần suất màu, phá cơ chế hiếm-mới-có-nghĩa.

→ **Art Bible**: "Cùng 1 sự thật cơ học có thể có 2 biểu đạt thị giác tùy MẬT ĐỘ bề mặt — bề mặt 'soi 1 mục tiêu' dùng màu khẩu phần; bề mặt 'liệt kê nhiều mục tiêu' dùng khử bão hòa."

### 11. Tap-tên trong văn tường thuật — styling dương tính (D.4a)

Edge Cases đã đặc tả kỹ trường hợp PHỦ ĐỊNH (`card_exists=false` → chữ thường, không gạch chân/styling — "không có link chết"), nhưng chưa từng nói tên tap-được (`card_exists=true`) trông ra sao — dù đây là tương tác lặp lại nhiều nhất trong toàn game (Core Rule #8, xuyên 4 bề mặt). Không phải chỗ trống dễ điền: gạch chân đã bị hệ #12 chiếm nghĩa ("hậu quả thoáng qua", xem mục 6), đỏ son bị cấm ở #15 (mục 10 — MONO hoàn toàn), khung bao bị cấm (ngôn ngữ nav-bar, xem mục 1). Trục còn khả dụng duy nhất: **độ đậm mực**.

- **Tên `card_exists=true` render đậm mực hơn thân văn xung quanh đúng 1 bậc** (font-weight nặng hơn 1 nấc so với văn tường thuật mặc định) — không gạch chân, không khung, không màu. Đủ phân biệt ở trạng thái mặc định (không cần hover để phát hiện — hover là kênh "Bonus", theo mục 9), nhất quán ngôn ngữ "mực" toàn game thay vì mượn ngôn ngữ "link" web chuẩn.
- **Giá trị font-weight placeholder**: thân văn mặc định = **400** (Regular); tên `card_exists=true` (Họ B, đậm hơn 1 bậc) = **600** (SemiBold) — cùng tinh thần placeholder kỹ thuật đã dùng cho bảng alpha/contrast (mục 9): `art-director` xác nhận/điều chỉnh khi khóa bảng font chính thức, nhưng đặt số ngay để AC-53 có ngưỡng đo được thay vì "1 bậc" định tính (2 bản dựng khác nhau có thể tự nhận "đậm hơn 1 bậc" dù chênh lệch hoàn toàn nếu không có số neo).
- Trạng thái Pressed/Hover/Focus (mục 9) áp dụng CHỒNG lên độ đậm nền này (tăng thêm 1 bậc đậm tạm thời khi pressed/hover; viền focus 2px khi Tab) — không thay thế nó.
- Ranh giới rõ với gạch chân của hệ #12: 2 hệ ngôn ngữ thị giác không chồng lấn (đậm mực = "đây là cửa vào Thẻ"; gạch chân = "đây là hệ quả narrative đã xảy ra") — không có văn bản nào cần cả 2 cùng lúc trong scope MVP.

→ **Art Bible**: "Trục thị giác duy nhất còn trống cho tap-target nhúng-trong-văn sau khi gạch chân/màu/khung đã bị các hệ khác chiếm nghĩa: độ đậm mực — nặng nét hơn 1 bậc, không mượn ngôn ngữ 'link' web chuẩn."

### 12. Nút Undo — chữ ký lúc biến mất

Player Fantasy hứa tường minh: "khi nó biến mất, người chơi hiểu ngay: mực đã khô". GDD đặc tả cả ĐIỀU KIỆN biến mất (`undo_available=false`, Core Rule #5) VÀ CÁCH biến mất — mọi tầng UI khác trong game đều có 1 chữ ký chuyển động riêng (D.6 cho tầng screen/overlay/banner; mục 2 cho page-flip; mục 3 cho "đang viết") nhưng Undo — biểu tượng trung tâm nhất của Pillar 2 — lại không có.

- **Chữ ký**: khi `undo_available` chuyển `true→false`, nút KHÔNG snap biến mất giữa 2 frame — mực nhạt dần (fade alpha 1.0→0) trong ≤150ms (cùng ngân sách "hard cut hoặc fade ≤150ms" đã khóa ở mục 9), sau đó gỡ khỏi layout (không để lại khoảng trống — khu nhập co lại mượt theo).
- **Không phải 1 tier mới của D.6** (Undo không phải tầng điều hướng screen/overlay/banner) — đây là 1 tín hiệu trạng thái cục bộ, ngân sách thời lượng mượn từ mục 9, không đăng ký thêm tier vào D.6.
- Khi biến mất do `is_death_turn=true` (không phải do lượt kế tiếp confirm bình thường): CÙNG fade, không có biến thể riêng — sự kiện cái chết đã có trọng lượng riêng qua chính đoạn văn + nhịp chạm tap-to-continue (mục "S5 takeover", Core Rule #6), không cần Undo "diễn" thêm.

→ **Art Bible**: "Mọi trạng thái biến mất trong ẩn dụ nhật ký đều có 1 khoảnh khắc mờ dần — không có gì snap ra khỏi tồn tại; ngay cả sự vắng mặt cũng được viết ra, không bị xóa."

> 📌 **Asset Spec** — Visual/Audio requirements đã định nghĩa. Sau khi art bible được duyệt, chạy `/asset-spec system:core-ui-screen-navigation` để sinh mô tả per-asset, kích thước, và generation prompt từ section này.

## UI Requirements

### Màn chơi chính (S2) — phân vùng layout

| Vùng | Mobile portrait (1 cột) | Desktop/landscape |
|---|---|---|
| Header cảnh + 3 bút tích lề (bản trên) | Đầu trang, cuộn theo nội dung (không sticky — hệ #11 đã khóa) | Như mobile, bút tích lề phải |
| Khung tường thuật | Chiếm toàn bề ngang, cuộn dọc, tối đa ~70ch/dòng để dễ đọc, cửa sổ trượt tối đa `LIVE_WINDOW_TURNS=30` lượt resident (D.3b) — cuộn lên chạm biên hiện dòng dẫn "đọc tiếp về trước → 「Lục」" | Cột giữa tối đa `readable_width` (~65–75ch), căn giữa, 2 lề giấy trống |
| Khu nhập hành động + 3 bút tích lề (bản dưới) | Dưới cùng luồng cuộn (KHÔNG sticky footer — người chơi cuộn xuống để hành động, như viết tiếp trang giấy); 3 bút tích 「Thẻ」「Lục」「Mục」 nhân bản ngay cạnh khu nhập (xem Core Rule #3) | Như mobile, cùng cột với khung tường thuật |
| Nút Undo | Cạnh khu nhập, chỉ render khi `undo_available=true` | Như mobile |

- Thứ tự trong khu nhập (trên→xuống): 4 thẻ gợi ý → hàng chip intent (wrap theo nội dung, nhóm theo NPC) → composer hành động có cấu trúc + nút gửi (+ dòng nudge heuristic khi có).
- Tap + click parity toàn bộ; không hover-only; mọi phần tử độc lập ≥ `TOUCH_TARGET_MIN=44px` (D.4).

### Composer hành động có cấu trúc (S2 — thay ô tự do)

*(Bổ sung 2026-09-01, thay thế hoàn toàn ô tự do đơn dòng cũ — xem Core Rule #3c, D.7.)*

- **Vị trí**: đúng chỗ "ô tự do + nút gửi" cũ trong thứ tự khu nhập (4 thẻ gợi ý → chip intent → **composer** → nút gửi + dòng nudge).
- **Danh sách đoạn đã chốt**: render dọc, mỗi đoạn = 1 khối gồm (i) nhãn loại nhỏ ("Tường thuật" hoặc "[Người nói] nói:") kiểu Họ A nhạt (font-weight 300, không phải tap-target); (ii) nội dung đoạn (đọc lại, không phải input đang gõ); (iii) nút xóa riêng cho từng đoạn (≥`TOUCH_TARGET_MIN`, D.4a) — xóa được BẤT KỲ đoạn nào, không chỉ đoạn cuối.
- **Đoạn nháp đang soạn** (luôn ở cuối danh sách, nơi duy nhất nhận input trực tiếp): toggle loại 2 lựa chọn ngang hàng "Tường thuật"/"Đối thoại" (≥44px mỗi ô); nếu Đối thoại → hiện thêm hàng chọn người nói (mặc định "Nhân vật chính" + ô tìm/gõ tên NPC); ô nội dung textarea auto-grow; nút "+ Thêm đoạn" (chốt đoạn nháp vào danh sách, mở đoạn nháp mới rỗng).
- **Ô tìm NPC**: chỉ hiện khi loại=Đối thoại ∧ người nói≠Nhân vật chính; gợi ý realtime cục bộ (không gọi mạng, không tốn lượt); mỗi gợi ý = `display_name`; luôn có dòng cuối tường minh "Dùng tên mới: '…'".
- **Nút Gửi**: cuối composer; disabled khi `composer_payload_submit_allowed=0` (D.7).
- **Ngoại lệ tiện dụng**: nếu người chơi gõ dở đoạn nháp cuối rồi bấm Gửi trực tiếp (quên "+ Thêm đoạn"), hệ tự coi đoạn nháp đó là đoạn cuối payload — không bắt thao tác thừa. Chỉ áp dụng cho đúng đoạn nháp cuối.
- **Cuộn nội bộ**: danh sách đoạn đã chốt tự cuộn khi vượt chiều cao khả dụng của khu nhập — không đẩy khung tường thuật cuộn theo.
- Tap + click parity toàn bộ; mọi phần tử độc lập (toggle loại, nút xóa đoạn, gợi ý NPC, "+ Thêm đoạn", Gửi) ≥ `TOUCH_TARGET_MIN` (D.4b).

### Save Slot Screen (S1)

- List dọc virtualized; mỗi hàng gáy-sách ≥ 44px cao (thực tế ~72–88px để chứa 2 dòng metadata); "Bắt đầu mới" ghim đầu danh sách.
- Hành động theo trạng thái slot đúng hệ #6 (**sửa 2026-08-06**, `/design-review persistence-save-system.md` — đóng gap lỗi thời: bản trước chỉ liệt 2 trạng thái, thiếu 1 trạng thái + 1 hành động + phân biệt tier xác nhận; **sửa lại 2026-08-07 vòng re-review vòng 3**, đóng gap `game-designer`/`qa-lead`: export nay là artifact 9b [bản đọc được tiếng Việt, KHÔNG PHẢI JSON — 9a JSON là công cụ QA riêng]; thêm hành động escalation-only "Khép quyển sổ này lại" cho Core Rule #10 mới; "đã khép" nay có 2 nguyên nhân `slot_closure_reason ∈ {death, quota_exhausted}`, xem mục 4): 3 trạng thái slot — (a) **đang chơi dở**: "Tiếp tục" / "Chép lại quyển sổ" (bản đọc được, artifact 9b) / "Xóa" (xác nhận 1-bước thường, con dấu đen-xám không danger-red) / **"Khép quyển sổ này lại"** (CHỈ hiện khi đang ở trạng thái escalation do ghi thất bại persistent, Core Rule #10 — mở O-ConfirmDelete biến thể riêng, không phải "Xóa"); (b) **đã khép** (`death` hoặc `quota_exhausted`): "Xem lại" / "Chép lại quyển sổ" / "Xóa" (xác nhận ESCALATED — gõ lại đúng tên nhân vật của slot qua O-ConfirmDelete, chuẩn hóa NFC/trim/case-insensitive hoặc literal "XÁC NHẬN" nếu tên rỗng, KHÁC hẳn xác nhận 1-bước của slot đang chơi, tương xứng trọng lượng xóa vĩnh viễn 1 playthrough hoàn chỉnh); (c) **không đọc được** (`LOAD_FAILED_UNREADABLE`): CHỈ "Xóa" (xác nhận 1-bước thường, không có gì để "Chép lại"/"Xem lại"). Chi tiết hành vi/data contract đầy đủ ở `persistence-save-system.md` UI Requirements — dòng này chỉ tóm tắt chrome, không định nghĩa lại.

### Story Log (S4/S4-RO)

- Thanh chrome mỏng đầu màn hình: bút tích "về đầu câu chuyện" + bút tích 「Thẻ」 (thẻ bản thân — GAP-3) + **(S4 live) bút tích "« Chơi tiếp"** + (S4-RO) con dấu đã-khép + nút thoát thích ứng `origin_screen`.
- Nội dung phân trang theo D.3; scroll container duy nhất; marker "Lượt N" thuộc World Memory.

### Settings (O-Set)

- Tấm giấy phẳng, 2 nhóm (Cỡ chữ / Cấu hình AI); đóng bằng X / tap ngoài / Esc như mọi overlay — NGOẠI LỆ: khi ô nhập API key đang focus với nội dung chưa lưu, tap ngoài lần đầu chỉ unfocus/ẩn bàn phím ảo (không đóng overlay); tap ngoài lần 2 (ô đã unfocus) mới đóng overlay như bình thường (chặn mất input do thao tác ẩn-bàn-phím thường gặp trên Mobile Web).

### Dialog xác nhận xóa (O-ConfirmDelete)

*(Bổ sung 2026-08-07, `/design-review persistence-save-system.md` vòng
3, đóng gap `ux-designer` — cơ chế "gõ lại tên xác nhận xóa" đã tồn tại
ở `persistence-save-system.md` từ vòng 2 nhưng chưa từng propagate tới
tầng overlay/layout của hệ này.)*

- **2 biến thể theo tier xác nhận** (`persistence-save-system.md` Edge
  Cases/UI Requirements): (a) **thường** (slot đang chơi dở/không đọc
  được) — 1 dòng xác nhận + 2 nút (Hủy/Xóa), không có ô nhập; (b)
  **escalated** (slot đã khép) — thêm 1 ô nhập text, hiển thị tên nhân
  vật cần gõ lại làm tham chiếu, nút "Xóa" chỉ active khi chuỗi đã nhập
  khớp (sau chuẩn hóa NFC/trim/case-insensitive, hoặc literal "XÁC NHẬN"
  nếu tên rỗng — xem GDD đó).
- **Ràng buộc bàn phím ảo Mobile Web (BẮT BUỘC)**: tên tham chiếu, ô
  nhập, VÀ nút xác nhận PHẢI cùng nằm trong vùng viewport KHÔNG bị bàn
  phím ảo che (test trên viewport đã trừ khoảng bàn phím thực tế —
  ~40-50% chiều cao màn hình trên nhiều thiết bị Mobile Web, không phải
  viewport đầy đủ) — nếu không, người chơi phải ẩn bàn phím để đọc lại
  tên hoặc để bấm nút, ngược mục đích thiết kế "buộc đọc và xác nhận
  đúng tên" của chính cơ chế này. Cùng tinh thần xử lý bàn phím ảo đã có
  ở Settings (O-Set) phía trên, áp dụng NGHIÊM NGẶT hơn vì đây là 1 hành
  động escalated-friction có chủ đích, không phải form nhập liệu thường.
- **Bàn phím-only**: focus tự động rơi vào ô nhập ngay khi dialog mở
  (nhánh escalated) — giảm số lần Tab cần thiết cho 1 hành động có
  trọng lượng cao; Tab tới được ô nhập/nút Hủy/nút Xóa theo thứ tự đọc;
  Enter submit (tương đương bấm "Xóa" khi hợp lệ); Esc hủy (đóng dialog,
  không xóa) — đúng luật Esc-layering chung (mục 9/AC-45).
- Style giữ nguyên "con dấu đen-xám, KHÔNG nút đỏ/danger" đã khóa ở mục
  4 (Save Slot Screen) — thao tác menu ≠ hệ quả cơ học, kể cả khi trọng
  lượng cảm xúc cao.

### Trách nhiệm responsive (toàn cục)

- Breakpoint duy nhất được phép: ngưỡng `two_column_layout` (D.5) — không media-query rải rác: 1-cột **đã chứng minh bất biến ở D.5 chỉ trong dải `viewport ≤ 480px`** — hành vi ở dải 481–1024px (tablet) chưa có quyết định UX tường minh, phụ thuộc Open Question #1 (dải viewport target chính thức cho "Mobile Web").
- Xoay màn hình/resize: reflow live, neo cuộn theo block đầu tiên đang thấy (Edge Cases).
- Safe-area insets (notch/home bar trên mobile web): padding **tính tay** từ safe-area insets — KHÔNG có sẵn tự động từ engine trên Web export (không phải `DisplayServer.get_display_safe_area()`, chỉ dùng được cho native; trên Web cần CSS `viewport-fit=cover` + đọc qua `JavaScriptBridge`, xem Open Question #5) — không phần tử tương tác nào nằm dưới home indicator. **Cơ chế chốt (ADR-0007, 2026-08-12)**: `get_interface("window")` → `getComputedStyle()`, KHÔNG `eval()`.

### Godot notes (→ ADR khi vào architecture)

- Tap-tên qua `RichTextLabel` meta tag (đã flag ADR từ hệ #14 — dùng chung).
- Khóa đệ quy cây node khu nhập (Godot 4.5+ recursive disable) cho D.1. **Ràng buộc kiến trúc bắt buộc**: 3 bút tích 「Thẻ」「Lục」「Mục」 (bản dưới, đặc tả "cùng hàng với Undo" ở Visual/Audio mục 1 và UI Requirements) PHẢI nằm NGOÀI subtree bị recursive-disable, dù đặt cạnh nhau về mặt layout — chúng thuộc `class=readonly` (D.1), không bao giờ được khóa. Cây node khu nhập bị khóa đệ quy chỉ được bao đúng: 4 thẻ gợi ý, hàng chip intent, composer hành động có cấu trúc (Core Rule #3c — mọi control bên trong: thêm/xóa đoạn, toggle loại, ô tìm NPC, nút gửi) + nút gửi, nút Undo — không bao gồm 3 bút tích dù chúng đứng cùng hàng thị giác. **API — CHƯA XÁC MINH BỀN**: một nguồn (WebSearch, không tái lập được trong phiên hiện tại) khẳng định recursive-disable là **2 property độc lập** trên `Control` (Godot 4.5+, PR #97495): `mouse_behavior_recursive` VÀ `focus_behavior_recursive`. Đối chiếu trực tiếp `docs/engine-reference/godot/modules/ui.md` + `current-best-practices.md` (tài liệu curated CHÍNH THỨC của dự án) cho kết quả **NGƯỢC LẠI** — cả hai mô tả recursive-disable là "a single property" kèm code mẫu dùng `mouse_filter` CŨ, không hề nêu 2 tên property trên. Hai nguồn NỘI BỘ của chính dự án đang tự mâu thuẫn — GDD này không đóng vai trò phân xử đúng/sai. **Hành động bắt buộc trước khi ADR khóa pattern**: verify trực tiếp trong Godot 4.6 Editor đang pin (`Help → Search Help → Control`, tìm property có chữ `recursive`). Nếu xác nhận đúng là 2 property: **Rủi ro thật** nếu ADR/implementation chỉ set 1 trong 2 (thường là `mouse_behavior_recursive`, "cái rõ ràng hơn"), Tab+Enter có thể XUYÊN QUA khóa D.1 hoàn toàn trong lúc Resolving → double-submit action — ADR PHẢI set CẢ HAI, và smoke-test cả 2 kênh dual-focus (mouse/touch focus lẫn keyboard focus, xem dòng dual-focus bên dưới). Báo cáo lỗi #105221 cũng CHƯA thể tái xác minh — không giả định "đọc docs [curated hay GDD] là đủ", chỉ Editor + WebSearch trực tiếp mới đóng được câu hỏi này. **Riêng cho `docs/engine-reference/godot/`**: mâu thuẫn nội bộ này là 1 task sửa tài liệu curated, route sang `technical-director`, ngoài phạm vi GDD #15. **ĐÃ ĐÓNG 2026-08-12, ADR-0007**: verify trực tiếp qua `ClassDB.class_get_property_list("Control")` + runtime test trên bản 4.6.stable đang pin xác nhận claim "2 property" ĐÚNG (`mouse_behavior_recursive` + `focus_behavior_recursive`, 2 enum độc lập) — `docs/engine-reference/godot/modules/ui.md` là nguồn SAI, đã sửa. ADR bắt buộc set CẢ HAI cùng lúc qua 1 hàm duy nhất, test bằng `get_mouse_filter_with_override()`/`get_focus_mode_with_override()`.
- **Phạm vi vòng đời node — 2 tầng KHÔNG được lẫn** (xem D.3b "Cơ chế eviction"): (1) 5 Control tầng-màn-hình (S1/S2/S4/S4-RO/S5) — cache/ẩn-hiện suốt phiên, KHÔNG free (Open Question #5a); (2) node/text nội dung lượt bên trong S2 (D.3b) và trang bên trong S4 (D.3) — PHẢI gỡ thật khi evict, KHÔNG chỉ `visible=false`, nếu không phá chứng minh O(1) của cả 2 formula. **Xác nhận kỹ thuật**: API `RichTextLabel.remove_paragraph(paragraph, no_invalidate=false)` tồn tại và hoạt động đúng — gỡ THẬT 1 đoạn giữa buffer (không phải rebuild toàn bộ), làm kiến trúc single-shared-buffer cho D.3b khả thi kỹ thuật thật (không chỉ giả thuyết). Lưu ý kèm theo: mặc định `remove_paragraph` invalidate/reflow cache của MỌI đoạn phía sau — chi phí này bị chặn trần bởi `LIVE_WINDOW_TURNS` (không phụ thuộc `total_turns`, không phá O(1) của D.3b) nhưng vẫn là chi phí hằng số thật mỗi lần evict, cần đưa vào cùng đợt profile Web export đã yêu cầu bên dưới. **Rủi ro mới nếu chọn route buffer chung**: `RichTextLabel` không có API chính thức để lấy bounding rect của 1 meta span riêng lẻ — D.4(a) (tính `pad_v`/`pad_h` theo bounding box từng fragment tên) có thể cần hit-testing tự viết hoặc Control overlay riêng nếu route này được chọn; thêm vào danh mục rủi ro khi viết ADR.
- **Ownership bắt buộc cho signal Turn Manager confirm trong D.3b**: kết nối signal `on_turn_confirmed` (nguồn cập nhật `s2_last_synced_turn_id`) PHẢI thuộc về **S2 root controller** (tầng không-free, Open Question #5a) — TUYỆT ĐỐI không gắn vào bất kỳ node nội dung lượt nào (tầng evictable, "Cơ chế eviction" ở trên). Rủi ro nếu vi phạm: `visible=false` không tự ngắt signal connection (đúng), nhưng nếu listener vô tình gắn vào 1 node nội dung lượt bị `queue_free()`/`remove_paragraph()` ở lần evict đầu tiên, kết nối bị ngắt VĨNH VIỄN, S2 ngừng nhận lượt mới, và không có tín hiệu lỗi nào phát ra (fail-silent, cùng loại rủi ro với safe-area bên dưới) — do AC-58 giả định delta luôn `≤1`, không có cơ chế tự phát hiện desync này.
- Screen stack: cấu trúc scene/Autoload cho tầng màn hình + overlay → **ADR riêng khi `/create-architecture`** (không quyết trong GDD).
- Dual-focus 4.6: test cả mouse/touch focus lẫn keyboard focus cho mọi phần tử (bảng kênh feedback ở Visual/Audio mục 9).
- **Cảnh báo phương pháp luận profiling**: đo hiệu năng `RichTextLabel`/relayout trong Godot Editor trên Windows (chạy D3D12 mặc định từ 4.6) KHÔNG đại diện cho hiệu năng thật trên Web export (Compatibility/WebGL2) — luôn profile D.3b/D.5 trên bản export Web thật hoặc ép Editor chạy Compatibility renderer khi đo, trước khi kết luận `LIVE_WINDOW_TURNS`/relayout đã đủ mượt. Phạm vi profile PHẢI bao gồm cả chi phí per-append/per-evict của D.3b (không chỉ relayout do đổi cỡ chữ D.5) — 2 kiến trúc hợp lệ (multi-node vs single-buffer `remove_paragraph`) có chi phí khác nhau, đo cả 2 nếu ADR còn phân vân giữa chúng.
- **Safe-area insets — xác nhận cơ chế + hạng mục còn thiếu**: `JavaScriptBridge.eval()` là cách đúng (và duy nhất) để đọc `env(safe-area-inset-*)` qua JS trên Web export — không có API Godot built-in nào khác cho việc này (đúng như Open Question #5b đã ghi). Hạng mục còn thiếu trước đó: Godot stock Web export template KHÔNG có sẵn `<meta name="viewport" content="viewport-fit=cover">` trong HTML shell — thiếu dòng này, mọi giá trị `env(safe-area-inset-*)` **fail-silent** (lặng lẽ trả về `0px`, không báo lỗi) bất kể thiết bị có notch/home-bar thật hay không. ADR web export PHẢI liệt "custom HTML export shell + `viewport-fit=cover`" như 1 hạng mục công việc tường minh, không phải "có sẵn miễn phí".

> **📌 UX Flag — Core UI / Screen Navigation**: Hệ này sở hữu nhiều màn hình. Ở Phase 4 (Pre-Production), chạy `/ux-design` cho **từng màn hình** trước khi viết epic: `design/ux/main-play-screen.md` (màn chơi chính — gộp yêu cầu hệ #11 + #1), `design/ux/save-slot-screen.md` (đã được hệ #6 flag), `design/ux/story-log.md` (đã được hệ #5 flag), `design/ux/settings.md`. Story tham chiếu UI phải trích file `design/ux/*.md`, không trích GDD trực tiếp.

## Acceptance Criteria

*(Đề xuất bởi `qa-lead`, duyệt sau khi khép GAP-1..5, GAP-8 — xem review log cho lịch sử sửa đổi. Hệ Presentation/Navigation đọc phần lớn trạng thái từ nơi khác — mặc định **ADVISORY** (bằng chứng: walkthrough/screenshot tại `production/qa/evidence/core-ui-screen-navigation/`). NGOẠI LỆ BLOCKING: mọi AC gắn **[Unit]** (D.1–D.3b, D.6 là hàm/invariant tất định; D.4/D.5 cũng thuần hàm) — bắt buộc file test tại `tests/unit/core-ui-screen-navigation/` (naming `core_ui_[feature]_test.gd`, hàm `test_[scenario]_[expected]`) trước khi story tương ứng Complete. **[Integration]** = ADVISORY, bắt buộc trước QA sign-off build. **[Manual]** = walkthrough/screenshot. **[Config]** = smoke-check.)*

**Ghi chú test setup**: Mọi phụ thuộc ngoài (Turn Manager `tm_state`/`undo_available`/`is_death_turn` — dùng bởi AC-59a/59b, World Memory `total_turns`/`last_confirmed_turn_id`/API phân trang `get_turn_page`, Character Continuation `continuation_choice_eligible`/`state`, Combat `in_combat`, Character Card `card_exists(char_id)` — dùng bởi AC-28/29/30/31/53; `known_npc_pool(slot)`/`list_known_npc_names` — dùng bởi AC-75..78; `new_slot_created` — dùng bởi AC-11/47, nguồn hệ sở hữu (Persistence #6 hay Character Continuation #13) chưa chốt, cần làm rõ ở `/create-architecture`, không chặn việc mock; `screen` (màn hình nguồn) — dùng bởi AC-04; `is_touch_primary` (device capability) — dùng bởi AC-24/25 `[Unit]` BLOCKING) phải **inject** qua mock/fixture — không gọi hệ thật, không AI, không mạng, không đồng hồ thật, không random không-seed (property test dùng seed cố định). Hằng số tham chiếu registry (`TOUCH_TARGET_MIN=44`, `card_transition_ms=200`, `suggested_action_count=4`, `undo_depth=1`, `ai_call_timeout_seconds=30`, `live_window_turns=30`, `CONTENT_EXCHANGE_ESTIMATE` (#7, dùng bởi AC-67), font-weight `400`/`600` (mục 11, dùng bởi AC-53 `[Unit]` BLOCKING)) — import từ nguồn, không định nghĩa lại. Đường dẫn evidence theo mức: `[Unit]` → `tests/unit/core-ui-screen-navigation/`; `[Integration]` → `tests/integration/core-ui-screen-navigation/`; `[Manual]` → `production/qa/evidence/core-ui-screen-navigation/`; `[Config]` → `production/qa/smoke-[date].md` (theo `coding-standards.md`).

### 1. Tầng hiển thị & bất biến toàn cục (Core Rule #1)

- **AC-01** [Unit] (max 1 overlay): GIVEN O-Card đang mở, WHEN người chơi mở O-Set (「Mục」→Settings), THEN O-Card đóng ngay trước khi O-Set mở; tại mọi thời điểm ≤1 overlay `open=true`.
- **AC-02** [Unit] (max 1 banner, hàng chờ): GIVEN banner A đang hiển thị, WHEN điều kiện banner B kích hoạt, THEN B không hiện đè lên A — B vào hàng chờ, hiện sau khi A dismiss; tại mọi thời điểm ≤1 banner visible.
- **AC-03** [Unit] (overlay miễn phí): GIVEN cả 3 trạng thái Turn Manager, WHEN mở/đóng O-Card hoặc O-Set, THEN không action nào gửi Turn Manager (spy=0), `world_time` không đổi.

### 2. Khóa input — `write_action_allowed` (D.1)

- **AC-04** [Unit] (ma trận đầy đủ 46, chữ ký hàm 3 biến `(action, tm_state, screen)`): GIVEN 15 action × 3 `tm_state` tại `screen≠S5` (45 tổ hợp, khớp bảng phân loại: 8 action `mutating` → `0` khi `resolving`/`undoing`, `1` khi `awaiting_action`; 7 action `readonly` → luôn `1`) CỘNG GIVEN `action=tap_back_to_slots, screen=S5` qua cả 3 `tm_state` (1 tổ hợp kết quả riêng biệt — luôn `1`, chứng minh `tm_state` bị bỏ qua đúng như formula khai), WHEN chạy `write_action_allowed`, THEN toàn bộ 46 tổ hợp khớp đúng. *(parametrized — regression anchor GAP-1)*
- **AC-05** [Integration] (UI thật sự chặn submit lần 2): GIVEN `tm_state=resolving`, WHEN cố submit lần 2 (thẻ gợi ý/chip/nút Gửi composer), THEN request KHÔNG đến Turn Manager (spy=0) — verify cây node khu nhập bị khóa đệ quy thật, không chỉ formula.
- **AC-06** [Integration] (double-tap swallow): GIVEN tap 2 lần cực nhanh cùng 1 thẻ gợi ý, WHEN tap 1 chuyển `tm_state→resolving` đồng bộ trong frame, THEN tap 2 bị nuốt — Turn Manager nhận đúng 1 action (spy=1).
- **AC-07** [Unit + Manual] (Undo dual-condition — ẩn vs mờ là 2 cơ chế): GIVEN 4 tổ hợp `(undo_available, tm_state)`: (a) `false, awaiting`; (b) `true, awaiting`; (c) `true, resolving`; (d) `false, resolving`, WHEN dựng UI nút Undo, THEN (a)(d) **không render**; (b) render + bấm được; (c) render + mờ mực + không bấm được — không bao giờ có "nút hiện, bấm không phản hồi, không mờ". *(logic [Unit]; render mờ mực [Manual] screenshot)*

### 3. Đồ thị chuyển màn hình — `screen_transition_valid` (D.2)

- **AC-08** [Unit] (11 cạnh hợp lệ + cạnh cấm): GIVEN 11 cạnh EDGES với `ctx` thỏa guard, WHEN chạy formula, THEN tất cả trả `1`; GIVEN ≥5 cặp ngoài EDGES (S1→S5, S4→S1, S4-RO→S2...), THEN tất cả trả `0`, không ném lỗi.
- **AC-09** [Unit] (guard `tm_state` cạnh S2→S1): GIVEN `from=S2, to=S1, tm_state=resolving`, THEN `0`; đối chứng `awaiting_action` → `1`.
- **AC-10** [Unit] (S4-RO thoát đúng `origin_screen`): GIVEN `from=S4-RO, origin_screen=S5`, THEN `to=S1→0`, `to=S5→1` — Log read-only mở từ S5 PHẢI thoát về S5, không rơi về Save Slot; đối chứng GIVEN `from=S4-RO, origin_screen=S1`, THEN `to=S1→1`, `to=S5→0` — mở từ S1 PHẢI thoát về S1, không rơi vào màn 3 lối.
- **AC-11** [Unit] (S2→S5 là integrity check): GIVEN `continuation_choice_eligible=false`, WHEN thử `screen_transition_valid(S2, S5, ctx)`, THEN `0` — assertion chặn code route sai. *(guard `new_slot_created` của cạnh S5→S2 kiểm ở AC-47, mục 15 — 3 guard trên đều có case âm-tính riêng)*
- **AC-12** [Integration] (S4→S2 khi chết confirm lúc đọc Log, KHÔNG tự chain sang S5): GIVEN người chơi ở S4 khi lượt resolve thành `is_death_turn=true` + `continuation_choice_eligible=true`, WHEN bấm "lật về", THEN engine chạy đúng cạnh chuẩn S4→S2 (KHÔNG tự động sang S5); người chơi thấy đoạn văn lượt chết + dòng dẫn tap-to-continue tại S2, giống hệt trường hợp đang đọc trực tiếp ở S2 khi lượt chết confirm; S2→S5 chỉ xảy ra khi người chơi chạm dòng dẫn đó (test riêng ở AC-57).
- **AC-13** [Integration] (chuyển màn hình tự đóng overlay): GIVEN O-Card mở trên S2, WHEN takeover S5 kích hoạt, THEN O-Card đóng TRƯỚC khi S5 hiện.

### 4. Story Log — pagination D.3

- **AC-14** [Unit] (regression ví dụ 842 lượt): GIVEN `total_turns=842, PAGE_SIZE=20`, THEN `total_pages=43`, `default_page_index=42`.
- **AC-15** [Unit] (O(1) property test): GIVEN `total_turns ∈ {0,1,19,20,500,8420,999999}` (seed cố định), `MAX_LOADED_PAGES=3, PAGE_SIZE=20`, THEN `ui_memory_bound` LUÔN `=60` — không nhánh code nào đọc `total_turns` để tính trần.
- **AC-16** [Unit] (biên prefetch): GIVEN `distance ∈ {4,5,6}`, `PREFETCH_THRESHOLD=5`, THEN `4→1, 5→1, 6→0` (boundary `≤`).
- **AC-17** [Unit] (empty — đóng GAP-5): GIVEN `total_turns=0`, WHEN mở Story Log, THEN `total_pages=0`, UI render empty-state, `default_page_index` KHÔNG được gọi (spy=0) — không có `-1`/crash.
- **AC-18** [Unit] (undo invalidate, không patch): GIVEN trang chứa lượt N đang resident, WHEN Undo lượt N, THEN trang invalidate + tải lại (spy `reload`=1, không `patch`), `total_turns` giảm 1, `total_pages` tính lại đúng.
- **AC-19** [Unit] (S4-RO đóng băng): GIVEN slot đã khép, WHEN mở Story Log nhiều lần, THEN `total_turns` không đổi, không invalidate/eviction nào phát sinh do ghi mới.

### 5. Vùng chạm — D.4

- **AC-20** [Unit] (nhóm (b) ≥44px tuyệt đối): GIVEN 5 loại phần tử độc lập (chip, card gợi ý, bút tích, Undo, Song Tu) với glyph gốc <44px, THEN `hit_height`/`hit_width` LUÔN `≥ TOUCH_TARGET_MIN` (đọc registry, không hardcode). **Phạm vi cho "Song Tu"**: test chỉ cần mock kích thước glyph theo D.4 nhóm (b) — nút Song Tu thuộc scene sở hữu bởi Character Card (#14), #15 chỉ định nghĩa LUẬT `≥44px` áp dụng cho nó; test này KHÔNG cần dựng UI thật của #14, không kiểm hành vi Song Tu (đó thuộc test của #14).
- **AC-21** [Unit] (regression ví dụ "Vệ", CHỈ áp dụng nếu ADR chọn route đệm thật): GIVEN `w=18, h=24, line_gap=12, gap_to_neighbor=10`, THEN `pad_v=6, hit_height=36; pad_h=3, hit_width=24`. **Điều kiện tiên quyết**: test này kiểm CÔNG THỨC D.4(a), không phải hit-box thật — nếu ADR chọn "đường lui" `pad_v=pad_h=0` (D.4 Edge Cases — RichTextLabel không đệm được vùng chạm ảo), test phải đổi kỳ vọng thành `hit_height=24, hit_width=18` (glyph box thuần, vẫn compliant-by-exception hợp lệ) — KHÔNG được giữ nguyên số cũ và coi route pad=0 là FAIL.
- **AC-22** [Unit] (never-overlap property test): GIVEN `gap_to_neighbor` ngẫu nhiên `[0,20]` (seed cố định, 50 case) cho 2 tap-target liền kề, THEN tổng vùng chạm 2 bên KHÔNG BAO GIỜ lấn vào khoảng `MIN_ADJACENT_GAP_PX`, kể cả gap→0.

### 6. Cỡ chữ & 2 cột — D.5

- **AC-23** [Unit] (3 nấc chính xác): GIVEN `setting ∈ {S,M,L}`, THEN `theme_scale` trả đúng `{0.875, 1.0, 1.25}` — không nấc thứ 4.
- **AC-24** [Unit] (regression ngưỡng 2-cột, `is_touch_primary=false`): GIVEN `(1280,M,false)`, `(1280,L,false)`, `(820,L,false)`, THEN lần lượt `1, 1, 0`; đối chứng GIVEN `(1280,M,true)`, THEN `0` — cùng viewport/setting nhưng `is_touch_primary=true` luôn ép về 1-cột.
- **AC-25** [Unit] (bất biến 1-cột, scope ≤480px theo GAP-6, `is_touch_primary=false`): GIVEN `viewport=480, is_touch_primary=false` × cả 3 `setting`, THEN `two_column_layout` LUÔN `=0`. *(KHÔNG khẳng định cho viewport >480px khi is_touch_primary=false — chờ dải viewport target chính thức cho input KHÔNG cảm ứng, xem Open Questions; khi is_touch_primary=true, luôn =0 bất kể viewport — đã đóng ở OQ#1)*
- **AC-26** [Integration] (reflow tức thời): GIVEN màn hình 2-cột đang mở, WHEN đổi `setting`, THEN reflow NGAY — đối lập có chủ đích với luật "không re-render giữa chừng" của Card (world-state).
- **AC-69** [Unit] (D.5 — invariant liên-knob `FONT_SCALE_STEP[S] < FONT_SCALE_STEP[M] < FONT_SCALE_STEP[L]`, mirror AC-27/52/67): GIVEN bộ `FONT_SCALE_STEP` hiện hành (registry `font_scale_steps`), WHEN đọc từ config/registry, THEN `FONT_SCALE_STEP[S] < FONT_SCALE_STEP[M] < FONT_SCALE_STEP[L]` — so sánh 3 số tĩnh, chạy lại mỗi lần tune, cùng cấp BLOCKING với AC-27/AC-52/AC-67.

### 7. Chuyển cảnh — D.6

- **AC-27** [Unit] (bất biến thứ tự — so sánh 4 số nguyên tĩnh, không cần mock/scene): GIVEN bộ `DURATION_MS` hiện hành, WHEN chạy test đọc từ data file/registry, THEN `banner ≤ overlay_settings ≤ overlay_card ≤ screen`; `overlay_card` PHẢI khớp `card_transition_ms` registry (không bản sao). *(chạy lại mỗi lần tune — vẫn giữ song song 1 smoke-check `[Config]` cho môi trường CI nhẹ)*

### 8. Điểm vào Character Card (Core Rule #8)

- **AC-28** [Integration] (tap-name 4 màn hình, tap=click parity): GIVEN tên `card_exists=true` ở S2/S4/S4-RO/S5, WHEN tap (mobile) hoặc click (desktop), THEN O-Card mở đúng `char_id` ở cả 4 nơi, cả 2 phương thức.
- **AC-29** [Unit] (tên không tap được): GIVEN `card_exists(char_id)=false`, WHEN dựng style đoạn text chứa tên, THEN không meta tag/link styling/gạch chân — chữ thường, không "link chết".
- **AC-30** [Integration] (Card tự đóng khi Undo xóa nguồn tồn tại): GIVEN O-Card mở cho X, WHEN Undo xóa lượt làm `card_exists(X)→false`, THEN O-Card tự đóng, về S2 bình thường — không crash.
- **AC-31** [Integration] (「Thẻ」 4 màn hình / 5 vị trí render — GAP-3): GIVEN S2 (2 vị trí: header + cạnh khu nhập), S5 (lề header), và S4, S4-RO (chrome Story Log), WHEN kiểm tra bút tích 「Thẻ」, THEN có mặt và mở đúng thẻ ở cả 5 vị trí trên 4 màn hình — đặc biệt xác nhận 2 render ở S2 luôn đồng bộ trạng thái (không có TH nào 1 bản khóa/1 bản mở khi Resolving).

### 9. Chờ AI & timeout (Core Rule #9)

- **AC-32** [Manual] (chỉ báo "đang viết"): GIVEN `tm_state=resolving`, THEN chỉ báo inline tại vị trí đoạn kế tiếp, chuyển động NGANG duy nhất, không spinner. *(screenshot + lead sign-off — visual fidelity không tự động hóa)*
- **AC-33** [Integration] (timeout → Awaiting Action, world_time bất biến): GIVEN AI mock treo quá `ai_call_timeout_seconds` (đọc registry), WHEN timeout, THEN `tm_state→awaiting_action`, lỗi hiện TRONG khung tường thuật (không banner), `world_time` không đổi.
- **AC-34** [Integration] (timeout khi ở S4): GIVEN người chơi ở S4 khi timeout xảy ra, WHEN lật về S2, THEN thấy thông báo + khu nhập mở khóa — không banner, không bị kéo cưỡng chế.

### 10. Settings (Core Rule #10)

- **AC-35** [Integration] (persist cấp thiết bị): GIVEN đổi cỡ chữ, WHEN reload app và mở SLOT KHÁC, THEN giá trị giữ nguyên — xác nhận `app_config` ngoài slot blob.
- **AC-36** [Integration] (nguồn mở giới hạn): GIVEN S4, S4-RO, S5, THEN không tồn tại đường vào Settings ở 3 màn hình này.

### 11. Chế độ read-only S4-RO (Core Rule #7)

- **AC-37** [Unit] (không render nút mutating): GIVEN màn hình = S4-RO, WHEN liệt kê mọi phần tử tương tác được dựng, THEN không phần tử nào thuộc `class=mutating` (bảng D.1) xuất hiện — kể cả dạng disabled; phải là KHÔNG RENDER.
- **AC-38** (thoát đúng `origin_screen`): cross-reference AC-10 — không test lặp.

### 12. Takeover 3 lối S5 (Core Rule #6)

- **AC-39** [Unit] (khu nhập không tồn tại): GIVEN màn hình = S5, WHEN dựng layout, THEN không node nào của khu nhập (4 thẻ/chip/composer) được TẠO trong scene tree — không phải ẩn.
- **AC-40** [Integration] (bút tích ở S5): GIVEN màn hình = S5, WHEN tap 「Lục」, THEN mở Story Log ở S4-RO đúng slot hiện hành, không tiêu lượt; WHEN tap 「Thẻ」, THEN mở O-Card đúng `char_id` bản thân, không tiêu lượt; cả hai KHÔNG render bất kỳ phần tử `class=mutating` nào bên trong (đúng #7); 「Mục」 chỉ còn "Về danh sách sổ".
- **AC-41** [Integration] (retry-lock theo `state` #13 — GAP-4): GIVEN `state = "Processing Chơi Lại"` (Character Continuation #13, KHÔNG dùng `tm_state`), WHEN bấm "Thử lại" liên tục, THEN nút mờ mực + không phản hồi; GIVEN `state = "Reset Failed"`, THEN nút mở khóa trở lại.

### 13. Banner tier & empty states

- **AC-42** [Manual] (banner mọi màn hình): GIVEN banner quota kích hoạt khi ở S5, THEN banner hiện đúng vị trí tầng banner.
- **AC-43** [Unit] (không auto-timeout): GIVEN banner đang hiển thị, WHEN mock clock trôi dài, THEN banner KHÔNG tự biến mất nếu điều kiện gốc chưa hết và chưa tap X.
- **AC-44** [Integration] (2 empty state): GIVEN `total_turns=0` và GIVEN 0 slot, THEN mỗi nơi hiện đúng 1 dòng đã khóa ("Chưa có trang nào được viết" / "Chưa có sổ nào — hãy bắt đầu cuốn đầu tiên"), Save Slot VẪN giữ CTA "Bắt đầu mới" phía trên.
- **AC-45** [Integration] (Esc layering): GIVEN overlay mở, WHEN Esc, THEN overlay đóng; GIVEN không overlay, WHEN Esc, THEN không hành động nào (không pause menu, không thoát tầng screen).

### 14. Cross-system — Combat inline

- **AC-46** [Integration] (hệ thống không tự đổi màn hình khi in_combat — GAP-2 đã khép theo ngữ nghĩa hệ-thống): GIVEN `in_combat` chuyển `false→true→false` (mock Combat), WHEN quan sát tầng màn hình, THEN không chuyển màn hình nào do HỆ THỐNG tự kích hoạt (mọi chuyển màn hình trong trận đều truy về được 1 thao tác người chơi hợp lệ theo D.1/D.2); danh sách hành động trận render đúng trong 4 slot gợi ý chuẩn, không UI riêng.

### 15. AC bổ sung — nhóm A (AC-47–56b)

- **AC-47** [Unit] (guard `new_slot_created` — case âm-tính còn thiếu ở D.2): GIVEN `from=S5, to=S2, new_slot_created=false`, WHEN chạy `screen_transition_valid`, THEN `0` — đối chứng `new_slot_created=true` → `1`. Đóng gap: 3 guard khác của D.2 (`tm_state`, `continuation_choice_eligible`, `origin_screen`) đều có AC test cả 2 nhánh (AC-09, AC-11, AC-10); guard này trước đó chỉ được gộp chung trong AC-08, không có case âm-tính riêng.
- **AC-48** [Unit] (D.3b — O(1) property test, mirror AC-15): GIVEN `total_turns(slot) ∈ {0,1,29,30,500,8420,999999}` (seed cố định), `LIVE_WINDOW_TURNS=30`, THEN `s2_resident_turns` LUÔN `≤30` — hằng số trần, không phụ thuộc `total_turns` lớn tới đâu; GIVEN `total_turns=0`, THEN `s2_oldest_resident_turn_id` KHÔNG được gọi (spy=0), mirror AC-17.
- **AC-49** [Integration] (D.3b — eviction THẬT + neo cuộn + lối dẫn Story Log): GIVEN S2 đã ở trần `LIVE_WINDOW_TURNS`, WHEN 1 lượt mới confirm, THEN lượt cũ nhất bị gỡ THẬT khỏi cấu trúc hiển thị — đo bằng đơn vị KHỚP kiến trúc ADR đã chọn (đếm node hiển thị nếu route multi-node-per-turn, HOẶC độ dài buffer/số paragraph nếu route single-`RichTextLabel` — không cứng đơn vị "node" nếu ADR chọn route kia; ghi rõ route đã chọn khi viết test) PHẢI giảm đúng 1 lượt (không chỉ spy `evict=1` — chặn regression "chỉ set `visible=false`") — NHƯNG vẫn truy vấn được nguyên vẹn qua Story Log (D.3); GIVEN lượt sắp evict đang nằm trong viewport khi eviction xảy ra, THEN vị trí cuộn được bù trừ, nội dung đang đọc không nhảy; WHEN người chơi cuộn lên chạm biên cửa sổ resident, THEN hiện dòng "đọc tiếp về trước → 「Lục」" — render đúng ngôn ngữ bút tích marginalia (Visual/Audio mục 1), KHÔNG dùng style empty-state (mục 8), vùng chạm thật ≥44px theo D.4 nhóm (b) — tap dòng đó mở đúng **S4** tại lượt kế tiếp phía trước biên (S2 chỉ tồn tại cho slot đang mở/live, nên đích luôn là S4, không phải S4-RO).
- **AC-50** [Integration] (D.3b — cold-start resume không rỗng): GIVEN slot có `total_turns=400`, WHEN mở slot qua "Tiếp tục" (S1→S2), THEN S2 hiện ngay 30 lượt gần nhất (371–400) qua cold-start `get_turn_page(last_confirmed_turn_id, LIVE_WINDOW_TURNS, older)` — KHÔNG rỗng, KHÔNG chờ lượt mới confirm; đối chứng GIVEN `total_turns=0` ("Bắt đầu mới"), THEN S2 hiện đúng empty-state (mục 8), không gọi `get_turn_page`.
- **AC-51** [Unit] (boot luôn vào S1): GIVEN ứng dụng khởi động (không có phiên Turn Manager nào active), WHEN màn hình đầu tiên render, THEN màn hình luôn là S1 — không phụ thuộc slot cuối cùng đã chơi, không phụ thuộc bất kỳ trạng thái nào khác.
- **AC-52** [Unit] (D.3 — invariant liên-knob `PREFETCH_THRESHOLD < PAGE_SIZE`, mirror AC-27): GIVEN registry hiện hành (`log_prefetch_threshold`, `log_page_size`), WHEN đọc từ config/registry, THEN `log_prefetch_threshold < log_page_size` — so sánh 2 số tĩnh, chạy lại mỗi lần tune, cùng cấp BLOCKING với AC-27.
- **AC-53** [Unit + Manual] (tap-tên & bút tích Họ A — styling dương/nhạt tính): GIVEN tên `card_exists=true` trong văn tường thuật ở trạng thái mặc định (không hover/focus/pressed), THEN font-weight = **600** (registry, không phải "1 bậc" định tính — kiểm bằng code, `[Unit]`), không gạch chân/khung/màu; GIVEN bút tích Họ A (「Thẻ」「Lục」「Mục」, mục 1) ở trạng thái mặc định, THEN font-weight = **300** (registry, nhạt hơn thân văn 400 — kiểm bằng code, `[Unit]`); VÀ cả hai đều phân biệt được bằng mắt so với thân văn (font-weight 400) mà không cần tương tác thử (`[Manual]` — screenshot + lead sign-off, visual fidelity không tự động hóa hoàn toàn).
- **AC-54** [Integration + Manual] (Pending Fate — trọng lượng thị giác): GIVEN gợi ý Kết liễu/Tha mạng (#12) xuất hiện trong khung 4-gợi-ý, THEN KHÔNG có chip intent nào đi kèm thẻ đó (kiểm cấu trúc — `[Integration]`); VÀ thẻ đó render đậm mực hơn 1 bậc so với 3 thẻ còn lại (kiểm thị giác — `[Manual]` screenshot).
- **AC-55** [Integration + Manual] (S5 takeover — chữ ký chuyển động riêng, cùng khuôn AC-54): GIVEN `continuation_choice_eligible=true` VÀ người chơi vừa chạm dòng dẫn tap-to-continue, WHEN chuyển cảnh S2→S5 diễn ra, THEN engine gọi ĐÚNG transition path/tween riêng cho takeover (KHÔNG dùng chung tween `screen`-tier có skew/scale_x/dịch ngang — kiểm cấu trúc, `[Integration]`); VÀ chuyển cảnh render bằng chữ ký riêng (mực nhòe/trang lặng đi tại chỗ), phân biệt được bằng mắt với mọi lần lật trang khác trong game (kiểm thị giác, `[Manual]` screenshot).
- **AC-56a** [Integration] (keyboard-only traversal — TRỪ tap-tên): GIVEN chỉ dùng Tab/Shift+Tab/Enter/Esc (không chuột, không touch), WHEN đi từ S1 qua toàn bộ luồng chơi chuẩn (mở slot → S2 → submit action → mở Card **qua bút tích 「Thẻ」**, KHÔNG qua tap-tên → đóng → mở Log → mở Settings → đổi cỡ chữ → thoát), THEN mọi bước tới được và mọi overlay mở bằng Tab đều đóng lại được bằng bàn phím thuần (no keyboard trap) — không cần chạm chuột/touch lần nào. AC này có PASS/FAIL ổn định ngay bây giờ, không phụ thuộc OQ#11.
- **AC-56b** [Integration, **BLOCKED — không tính vào tổng pass/fail cho tới khi OQ#11 đóng**] (mở Card qua tap-tên bằng bàn phím): GIVEN chỉ dùng bàn phím, WHEN cố mở Card của 1 nhân vật `card_exists=true` xuất hiện trong văn tường thuật (không qua bút tích 「Thẻ」), THEN [chưa định nghĩa được — phụ thuộc giải pháp OQ#11 cho việc `RichTextLabel` meta tag tham gia Tab-focus chain]. Đánh dấu tường minh trạng thái BLOCKED thay vì lẫn vào AC-56a — không được đóng story cho tới khi OQ#11 có ít nhất 1 hướng giải pháp thiết kế (xem OQ#11, đã bổ sung fallback tạm qua 「Thẻ」 ở AC-56a).

### 16. AC bổ sung — nhóm B (AC-57–59b)

- **AC-57** [Integration] (S5 takeover chờ nhịp chạm, không tự động — xem AC-61 cho phần discoverability/nhịp thở): GIVEN `continuation_choice_eligible=true` vừa được set (lượt chết vừa confirm), WHEN quan sát màn hình NGAY sau đó (chưa có tap nào), THEN màn hình vẫn là S2 (không tự chuyển sang S5), dòng dẫn "… (chạm để tiếp tục)" hiện ở cuối đoạn văn; WHEN người chơi chạm dòng dẫn đó, THEN màn hình chuyển sang S5 (`screen_transition_valid(S2,S5,ctx)` chỉ được gọi đúng lúc chạm, không lúc cờ set); GIVEN mock clock trôi dài (≥30s) mà không có tap nào, THEN màn hình VẪN là S2 — không có auto-timeout nào tự kích hoạt takeover; GIVEN chạm 1 điểm NGOÀI vùng chạm thật của dòng dẫn (VD vào đoạn văn phía trên), THEN màn hình vẫn S2, `screen_transition_valid` không được gọi.
- **AC-58** [Integration] (D.3b — hòa giải buffer S2 khi lượt confirm lúc S2 đang ẩn): GIVEN người chơi ở S4 khi 1 lượt confirm (không phải lượt chết), S2 KHÔNG render lượt đó trong lúc `visible=false` (spy `append`=0), WHEN người chơi lật về S2, THEN buffer hòa giải đúng đủ delta 1 lượt qua `get_turn_page(anchor=s2_last_synced_turn_id, count=1, newer)` (spy=1, KHÔNG gọi cold-start lại toàn bộ `LIVE_WINDOW_TURNS`), S2 hiển thị đúng lượt mới nhất — không stale.
- **AC-59a** [Integration] *(sửa 2026-08-13 — thêm nguyên nhân thứ 3, propagate từ `character-customization-mode.md` Rule #6b)*: GIVEN nút Undo đang render (`undo_available=true`), WHEN `undo_available` chuyển `false` (lượt kế tiếp confirm HOẶC `is_death_turn=true` HOẶC "hack-invalidate" — hệ #16 gọi `invalidate_pending_snapshot()` [ADR-0004] tại lần hack-write/xóa đầu tiên trong 1 cửa sổ Undo, registry `undo_availability_window` conjunct `pending_snapshot_valid`), THEN tween alpha 1.0→0 chạy đúng thứ tự VÀ đúng thời lượng `≤150ms` (đọc property tween, spy timing) TRƯỚC KHI node bị gỡ khỏi layout (spy thứ tự: tween hoàn tất → remove, không phải remove trước) — không snap biến mất giữa 2 frame.
- **AC-59b** [Manual] *(sửa 2026-08-13, đồng bộ AC-59a)*: xác nhận bằng mắt cảm giác mờ dần mượt mà (không giật, không snap) khi Undo biến mất, cả 3 nguyên nhân (lượt kế tiếp confirm / `is_death_turn=true` / hack-invalidate) đều render CÙNG hiệu ứng, không có biến thể riêng. *(screenshot/video + lead sign-off — chất lượng cảm giác chuyển động không tự động hóa được, khác AC-59a chỉ đo timing/thứ tự)*

### 17. AC bổ sung — nhóm C (AC-60–66)

- **AC-60** [Integration] (D.3b — đổi slot buộc cold-start, không tính delta sai): GIVEN S2 đang hiển thị slot A (`s2_last_synced_turn_id=400`), WHEN người chơi chuyển sang slot B qua "Chơi lại" (`new_slot_created=true`, `total_turns(slot B)=1`), THEN buffer S2 force cold-start (spy `get_turn_page` gọi với `anchor=last_confirmed_turn_id(slot B)`, KHÔNG gọi delta với `count` âm), `s2_last_synced_turn_id` reset đúng theo slot B trước khi bất kỳ so sánh `turn_id` nào diễn ra — chặn regression `get_turn_page(count=-399,...)`.
- **AC-61a** [Integration] (S5 tap-to-continue — cơ chế auto-scroll + biên độ thở): GIVEN `continuation_choice_eligible=true` vừa được set, THEN S2 tự cuộn tới đúng vị trí dòng dẫn trong cùng frame/tween ngắn (spy vị trí cuộn = vị trí dòng dẫn, không cần người chơi tự cuộn — Core Rule #6); VÀ alpha dòng dẫn dao động đúng khoảng `[0.85, 1.0]` (đọc property tween, không đo thời gian thực), chu kỳ ~2s, không vượt ra ngoài khoảng đã khóa.
- **AC-61b** [Manual — playtest thật, KHÔNG phải lead sign-off qua video] ("curse of knowledge": lead đã biết quy ước marginalia nên xem video không kiểm chứng được discoverability thật) (S5 tap-to-continue + onboarding marginalia — discoverability với người chơi MỚI): GIVEN ≥3 người chơi CHƯA từng thấy build/quy ước marginalia của game này trước đó, WHEN mỗi người chơi phiên đầu tiên từ S2 (ink-reveal 3 bút tích Họ A chạy ngay từ lượt đầu, mục 1) tới đúng khoảnh khắc lượt chết lần đầu tiên (không có hướng dẫn/gợi ý thêm từ người quan sát), THEN đo (a) tỷ lệ tự nhận ra cần chạm dòng dẫn tap-to-continue trong ≤10 giây kể từ khi đoạn văn render xong, (b) không ai tự thoát ra ngoài (「Mục」/back) vì tưởng màn hình bị treo, (c) tỷ lệ tự dùng thử được ít nhất 1 trong 3 bút tích 「Thẻ」「Lục」「Mục」 trong phiên chơi đầu tiên mà không được nhắc (không cần thao tác thành công, chỉ cần tự nhận ra đó là tap-target). Ngưỡng PASS: ≥2/3 người đạt (a), 0/3 người xảy ra (b), VÀ ≥2/3 người đạt (c). *(protocol thay thế cho "screenshot + lead sign-off" — ghi vào `production/qa/evidence/core-ui-screen-navigation/`)*
- **AC-62** [Integration] (S4 live — control lật về S2): GIVEN màn hình = S4 (mở từ S2 qua 「Lục」, KHÔNG phải S4-RO), WHEN tap bút tích "« Chơi tiếp", THEN màn hình chuyển đúng về S2 (`screen_transition_valid(S4,S2,ctx)=1`), không tiêu lượt, không mất vị trí cuộn của S2 trước đó.
- **AC-63a** [Integration] (onboarding marginalia — trigger per-device): GIVEN `app_config.has_seen_marginalia_onboarding` chưa tồn tại, WHEN S2 render lần đầu (bất kỳ slot nào), THEN 3 bút tích Họ A chạy nhịp ink-reveal VÀ `has_seen_marginalia_onboarding` được set `true`; GIVEN field đã `true` (kể cả sau khi chết + "Chơi lại" tạo slot mới nhiều lần), THEN KHÔNG chạy lại ink-reveal — chặn regression "replay mỗi slot". GIVEN `app_config.font_size_setting` chưa tồn tại, WHEN Save Slot Screen render, THEN hiện dòng mời chọn cỡ chữ; GIVEN người chơi BỎ QUA (không tap S/M/L) rồi thoát app, WHEN mở lại Save Slot Screen, THEN dòng mời HIỆN LẠI (chủ đích — lặp tới khi CHỌN, không phải tới khi THẤY); GIVEN `font_size_setting` đã được set (đã chọn ít nhất 1 lần), THEN dòng mời KHÔNG hiện lại.
- **AC-63b** [Unit] (dòng mời cỡ chữ — contrast/size tối thiểu ở cấu hình mặc định): GIVEN dòng mời đang render (bất kể `theme_scale` đã lưu trước đó, nếu có), THEN alpha = **1.0** (không phải bậc "-1" 0.68 của Họ A/empty-state), cỡ glyph = cỡ thân văn tại **nấc M** (không đọc `theme_scale` runtime cho riêng dòng này), VÀ mỗi tap-target S/M/L có `hit_height`/`hit_width ≥ TOUCH_TARGET_MIN` — đọc registry, kiểm bằng code, không cần screenshot.
- **AC-63c** [Manual] (dòng mời cỡ chữ — xác nhận thị giác): screenshot xác nhận dòng mời không dùng ngôn ngữ marginalia (không nhạt hơn thân văn), đủ nổi bật so với text nền tại Save Slot Screen. *(screenshot + lead sign-off — bổ sung cho AC-63b, không thay thế)*
- **AC-64** [Integration] (overlay tự đóng — ma trận đầy đủ, TÁCH theo overlay vì O-Card/O-Set không cùng tập nguồn mở): 
  - **O-Card** (mở được từ `{S2,S4,S4-RO,S5}`, KHÔNG từ S1 — Core Rule #8): GIVEN O-Card đang mở, WHEN thực hiện LẦN LƯỢT 9 cạnh có `from ∈ {S2,S4,S4-RO,S5}` trong bảng EDGES (D.2) — tức toàn bộ 11 cạnh TRỪ 2 cạnh xuất phát từ S1 (S1→S2, S1→S4-RO), THEN O-Card đóng TRƯỚC khi màn đích hiện, ở TẤT CẢ 9 cạnh.
  - **O-Set** (mở được từ `{S1,S2}` — Core Rule #10): GIVEN O-Set đang mở, WHEN thực hiện LẦN LƯỢT 5 cạnh có `from ∈ {S1,S2}` trong bảng EDGES (S1→S2, S1→S4-RO, S2→S4, S2→S1, S2→S5), THEN O-Set đóng TRƯỚC khi màn đích hiện, ở TẤT CẢ 5 cạnh.
  - **O-ConfirmDelete** (mở được CHỈ từ `{S1}` — bổ sung 2026-08-07, `/design-review persistence-save-system.md` vòng 3): GIVEN O-ConfirmDelete đang mở (kể cả đang có nội dung gõ dở ở ô nhập nhánh escalated), WHEN thực hiện 2 cạnh xuất phát từ S1 trong bảng EDGES (S1→S2, S1→S4-RO), THEN O-ConfirmDelete đóng TRƯỚC khi màn đích hiện, mất nội dung đã gõ dở (không khôi phục) — cùng quy tắc "overlay thuộc về màn hình bên dưới, không sống sót qua lật trang" (Edge Cases mục "Nếu một chuyển màn hình xảy ra khi overlay đang mở"). GIVEN người chơi mở O-Card hoặc O-Set trong khi O-ConfirmDelete đang mở (nếu UI cho phép truy cập), THEN O-ConfirmDelete tự đóng trước — tối đa 1 overlay (Core Rule #1), cùng luật "overlay mới tự đóng overlay cũ".
  - (AC-13 — S2→S5 với O-Card — là 1 case con của danh sách O-Card ở trên, không test lặp.)
- **AC-65** [Integration] (resize/rotate — neo cuộn, TRIGGER KHÁC eviction D.3b): GIVEN màn hình 2-cột (D.5) hoặc S2/S4 đang cuộn giữa chừng, WHEN viewport resize/rotate (KHÔNG phải lượt mới confirm — khác trigger của AC-49), THEN vị trí cuộn neo theo block đầu tiên đang thấy (Edge Cases), reflow không làm nội dung đang đọc nhảy khỏi tầm nhìn.
- **AC-66** [Unit] (D.3b — tripwire invariant `s2_oldest_resident_turn_id`, xem D.3b Variables): GIVEN buffer S2 NGAY SAU KHI bất kỳ thao tác nào trong bảng "Vòng đời nội dung S2" (cold-start/append/quay lại/đổi slot/Undo — bao gồm backfill ở hàng 7) đã trả quyền điều khiển lại (không kiểm giữa thân hàm xử lý), THEN `s2_oldest_resident_turn_id(slot) == last_confirmed_turn_id(slot) − s2_resident_turns(slot) + 1` LUÔN đúng — invariant hợp lệ nhờ World Memory (#5) bảo đảm `turn_id` liền mạch/tái sử dụng sau Undo (xác nhận qua `turn-manager.md` + `world-memory-context-management.md`) VÀ nhờ backfill bắt buộc ở hàng 7 (nếu thiếu backfill, AC này fail ngay sau Undo đầu tiên trên slot đã đầy window); vi phạm invariant này (buffer drift) phải fail loud, không im lặng.
### 18. AC bổ sung — nhóm D (AC-67–68)

- **AC-67** [Unit] (D.3b — invariant liên-GDD `LIVE_WINDOW_TURNS ≥ CONTENT_EXCHANGE_ESTIMATE`): GIVEN registry hiện hành (`live_window_turns` #15, `CONTENT_EXCHANGE_ESTIMATE` #7), THEN `live_window_turns ≥ CONTENT_EXCHANGE_ESTIMATE` — so sánh 2 số tĩnh liên-GDD, cùng cấp BLOCKING với AC-27/AC-52.
- **AC-68** [Integration] (D.3b — guard đổi-slot áp dụng mọi đường, không chỉ "Chơi lại"): GIVEN S2 cache slot A, WHEN mở thẳng slot C khác từ S1 (không qua "Chơi lại"), THEN force cold-start theo guard slot-identity, không tính delta âm.

### 19. AC bổ sung — nhóm E, O-ConfirmDelete (AC-70), bổ sung 2026-08-07 vòng re-review `persistence-save-system.md` vòng 3

- **AC-70** [Integration] (O-ConfirmDelete — bàn phím-only + tránh che bàn phím ảo, đóng gap `ux-designer`): GIVEN nhánh escalated (slot đã khép) của O-ConfirmDelete đang mở trên viewport Mobile Web mô phỏng với bàn phím ảo chiếm 45% chiều cao màn hình, WHEN ô nhập nhận focus, THEN tên tham chiếu + ô nhập + nút "Xóa" đều nằm trong phần viewport CÒN LẠI (không bị bàn phím ảo che) — kiểm chứng bằng bounding box của 3 phần tử nằm trọn trong `viewport_height × 0.55` tính từ đỉnh. GIVEN dialog vừa mở (nhánh escalated), THEN focus tự động ở ô nhập (không cần Tab đầu tiên). WHEN Tab liên tục, THEN thứ tự focus = ô nhập → Hủy → Xóa (hoặc thứ tự đọc tương đương) — không bỏ sót phần tử nào; WHEN Enter với nội dung hợp lệ, THEN tương đương bấm "Xóa"; WHEN Esc, THEN dialog đóng, KHÔNG xóa slot (đúng AC-45 layering).

### 20. AC bổ sung — nhóm F, Composer hành động có cấu trúc (AC-71–82)

*(Bổ sung 2026-09-01, theo quyết định chủ dự án — Core Rule #3c, D.7.)*

- **AC-71** [Unit] (composer rỗng bị chặn): GIVEN `payload.segments=[]`, `tm_state=awaiting_action, screen=S2`, THEN `composer_payload_submit_allowed=0` dù `write_action_allowed(submit_action,...)=1` riêng lẻ — nút Gửi disabled, không tới Turn Manager.
- **AC-72** [Unit] (tương thích ngược — 1 đoạn tường thuật thuần): GIVEN payload đúng 1 đoạn `narration` (không đối thoại nào), THEN `composer_payload_submit_allowed=1` khi `awaiting_action` — không bắt buộc phải có đối thoại.
- **AC-73** [Unit] (1 đoạn rỗng chặn cả payload): GIVEN payload nhiều đoạn hợp lệ + đúng 1 đoạn `text` chỉ khoảng trắng, THEN `composer_segment_valid` của đoạn đó `=0` → toàn payload `=0`.
- **AC-74** [Unit] (dialogue thiếu speaker): GIVEN đoạn `type=dialogue, speaker=undefined`, THEN `composer_segment_valid=0`.
- **AC-75** [Integration] (khớp chính xác chuẩn hóa auto-resolve — SỬA 2026-09-01, đóng gap `ui-programmer` phát hiện lúc implement): GIVEN NPC "Bùi Lan" (`card_exists=alive=true`), WHEN gõ `"Bùi lan "` (khác hoa/thường, thừa khoảng trắng, GIỮ NGUYÊN dấu), THEN `resolve_speaker` trả `known_npc` ngay, không picker. **Quyết định chốt**: `normalize()` KHÔNG bỏ dấu tiếng Việt — chủ dự án chọn giữ so khớp CÓ PHÂN BIỆT DẤU (an toàn hơn, tránh trộn lẫn các tên chỉ khác nhau ở dấu như "Hoa"/"Hòa"/"Họa") thay vì nới lỏng cho tiện gõ nhanh; gõ thiếu dấu KHÔNG tự động khớp — rơi vào `new_npc` hoặc picker mờ tùy trường hợp, không phải lỗi.
- **AC-76** [Integration] (≥2 khớp mờ — không tự resolve): GIVEN pool có "Lam Thiên Hạo" và "Lam Nhi" cùng vượt `NPC_FUZZY_MATCH_THRESHOLD` với `"lam"`, WHEN gõ `"lam"`, THEN UI hiện ≥2 gợi ý xếp hạng, không tự chọn ai — chặn regression gán nhầm speaker.
- **AC-77** [Integration] (NPC mới — free text không khớp ai): GIVEN chuỗi không normalized-match và không đủ fuzzy-score với NPC nào, WHEN xác nhận, THEN `speaker={new_npc, proposed_name}` — không bị chặn.
- **AC-78** [Integration] (NPC chết bị loại khỏi pool speaker, vẫn narrate được): GIVEN NPC X có `card_exists=true, alive=false`, WHEN tìm "X" ở ô chọn người nói, THEN X không xuất hiện trong gợi ý; đối chứng gõ "X" trong 1 đoạn Tường thuật không bị chặn.
- **AC-79** [Integration] (khóa composer khi Resolving/Undoing — mở rộng AC-05): GIVEN `tm_state=resolving`, WHEN thử thêm/xóa/đổi loại đoạn hoặc gõ ô tìm NPC, THEN mọi thao tác bị nuốt ở tầng UI — verify cây node composer nằm trong đúng subtree khóa đệ quy như "ô tự do" cũ.
- **AC-80** [Integration] (giữ nguyên payload qua timeout — mở rộng Core Rule #9): GIVEN payload N đoạn (có cả `known_npc` và `new_npc`) đã submit, WHEN AI timeout, THEN `tm_state→awaiting_action` VÀ composer hiện lại đúng N đoạn, đúng thứ tự/loại/speaker.
- **AC-81** [Unit] (đổi loại đoạn giữa chừng — giữ text, reset speaker): GIVEN đoạn nháp `type=narration, text="Nàng bước tới"`, WHEN đổi sang `dialogue`, THEN `text` giữ nguyên, `speaker` mặc định reset về `{player}`.
- **AC-82** [Integration] (đoạn dở dang sống sót khi rời S2): GIVEN composer đang có đoạn chưa submit, WHEN mở 「Lục」 (S2→S4) rồi lật về, THEN payload dở dang còn nguyên — composer là state cấp screen-Control (không free), không phải nội dung lượt bị D.3b eviction chi phối.

**Tổng**: 87 nhãn AC vật lý trong file (AC-01–AC-82, cộng nhãn tách 56a/56b/59a/59b/61a/61b/63a/63b/63c); gộp theo quy tắc (loại AC-38 cross-ref, gộp mỗi cặp tách nhãn về 1 AC gốc — 56a+56b, 59a+59b, 61a+61b, 63a+63c — trừ AC-63b tính riêng vì là AC mới) còn **82 AC — 40 [Unit] BLOCKING** (AC-71/72/73/74/81 là `[Unit]` mới); [Integration]/[Manual]/[Config] ADVISORY. (Lịch sử sửa đổi đầy đủ: `design/gdd/reviews/core-ui-screen-navigation-review-log.md`.)

## Open Questions

| # | Câu hỏi | Chủ sở hữu | Mục tiêu giải quyết |
|---|---|---|---|
| 1 | ~~**Dải viewport target cho "Mobile Web"** — phần UX~~ **ĐÃ ĐÓNG PHẦN UX**: D.5 nay nhận thêm `is_touch_primary` — mọi thiết bị cảm ứng cầm tay mặc định 1-cột bất kể bề rộng, không cần biết tablet 768px "là Mobile hay không" để quyết định 2-cột. **CÒN MỞ — phần phân loại thiết bị/kỹ thuật khác** (GAP-6, qa-lead): dải viewport chính thức cho các quyết định responsive KHÁC (không phải 2-cột) vẫn cần chốt trong `technical-preferences.md` (cùng chỗ Memory Ceiling đang TBD). | technical-director | Trước `/create-architecture` |
| 2 | **Browser back / history binding** (HTML5 export): MVP không bind — có cần intercept `beforeunload` cảnh báo khi đang Resolving không? | technical-director | ADR web export tại `/create-architecture` |
| 3 | **Danh sách field nhóm "Cấu hình AI"** trong Settings (API key, chọn model?): phụ thuộc ADR backend AI | technical-director | ADR backend AI tại `/create-architecture` |
| 4 | **Cơ chế lưu `app_config`** (cỡ chữ, cấp thiết bị): localStorage riêng hay góc nhỏ trong hệ lưu trữ Persistence? Không nằm trong slot bundle — cần ghi vào ADR persistence HTML5 đã dự kiến | technical-director | ADR persistence tại `/create-architecture` |
| 5 | ~~**Kiến trúc screen stack** (scene tree/Autoload cho 3 tầng màn hình-overlay-banner)... **2 cảnh báo bắt buộc đưa vào ADR**: (a) KHÔNG dùng `SceneTree.change_scene_to_file/packed()`... (b) Safe-area insets... PHẢI custom HTML export shell...~~ — **ĐÃ ĐÓNG 2026-08-12, ADR-0007**: (a) 3 Autoload `CanvasLayer` riêng (screen/overlay/banner, layer 0/1/2), 5 screen cache `visible` toggle, không bao giờ free/change_scene. (b) Custom HTML shell (`viewport-fit=cover`) + đọc `env(safe-area-inset-*)` qua `get_interface("window")` → `getComputedStyle()` — **KHÔNG dùng `eval()`** (TR-cusn-014 sửa lại theo đúng cơ chế này, xem dòng đó). Xem `docs/architecture/adr-0007-core-ui-input-lock-screen-stack-safe-area.md` đầy đủ. | godot-specialist | ~~ADR tại `/create-architecture`~~ — đã đóng |
| 6 | **Duyệt câu chữ empty-state mới** "Chưa có sổ nào — hãy bắt đầu cuốn đầu tiên" (giả định (j) của art-director — chữ mới, chưa qua narrative) | writer / narrative-director | Trước `/ux-design save-slot-screen` |
| 7 | ~~**Interface phân trang World Memory** `(anchor_turn_id, count, direction)`~~ — **ĐÃ ĐÓNG 2026-08-04** (`/design-review`): World Memory GDD (#5) đã chốt `get_turn_page(anchor_turn_id, count, direction)` + cờ `has_more`, xóa mâu thuẫn nội bộ đã phát hiện (bảng Thao tác cũ ghi "trả toàn bộ", UI Requirements lại bắt buộc lazy-load). | game-designer | ~~`/review-all-gdds`~~ đã đóng |
| 8 | ~~**Cờ `reset_in_progress`**~~ — **ĐÃ ĐÓNG 2026-08-04** (`/design-review`): không phải cờ mới — ánh xạ trực tiếp vào state đã tồn tại ở #13: `reset_in_progress ≡ (state = "Processing Chơi Lại")`; `state = "Reset Failed"` → `reset_in_progress=false` (nút "Thử lại" mở khóa). Đã sửa mọi tham chiếu trong D.1/Edge Cases/AC-41 sang state thật của #13, không định nghĩa cờ song song. | game-designer | ~~`/review-all-gdds`~~ đã đóng |
| 9 | **Cơ chế truy vấn trạng thái chéo hệ** (signal vs poll vs Autoload) cho `tm_state`/`undo_available`/`card_exists`/`continuation_choice_eligible`/`state` (#13) — chưa GDD nào trả lời, ảnh hưởng trực tiếp cách viết D.1/D.2 thành code thật | technical-director / godot-specialist | ADR tại `/create-architecture` |
| 10 | ~~**Số phận nội dung ô tự do khi AI timeout**~~ — **ĐÃ ĐÓNG**: Core Rule #9 nay chốt tường minh — giữ nguyên text người chơi đã gõ qua timeout, không xóa, không reset. *(mở rộng 2026-09-01: guarantee nay áp dụng cho toàn bộ payload composer, xem Core Rule #3c/AC-80.)* | ux-designer | ~~Trước `/ux-design main-play-screen`~~ đã đóng |
| 11 | ~~**Giải pháp accessibility KHÔNG-AccessKit cho tap-name + 3 bút tích marginalia trên Web export**: AccessKit (Godot 4.5+) đã xác nhận là **native-desktop-only**, KHÔNG hoạt động trên HTML5/Web export (target platform duy nhất của game) — câu hỏi cũ "in/out scope AccessKit" hỏi sai, vì không có nhánh "in scope" nào khả thi qua cơ chế này. Câu hỏi đúng: ARIA injection qua DOM overlay, lớp TTS riêng, hay tuyên bố tường minh ngoài-scope-MVP?~~ — **ĐÃ ĐÓNG 2026-08-12, ADR-0006**: sau khi `accessibility-specialist` + `godot-specialist` điều tra độc lập (ARIA overlay = HIGH risk, không có API bounding-rect per-meta-span, rủi ro trôi vị trí qua mỗi lần D.3b reflow; TTS riêng = MEDIUM risk, không đạt đúng định nghĩa SC 4.1.2, chưa verify trên in-app WebView Zalo/FB), quyết định **Nhánh C — tuyên bố tường minh ngoài-scope-MVP cho tap-name và 3 bút tích marginalia**, kèm 4 điều kiện bắt buộc: (1) ghi tường minh + backlog có chủ sở hữu (`producer`), (2) fallback 「Thẻ」 qua bàn phím phải PASS AC-56a thật trước release, (3) KHÔNG BAO GIỜ tuyên bố "WCAG 2.1 AA compliant" trong khi gap còn mở (đăng ký `forbidden_patterns` trong `architecture.yaml`), (4) nếu D.4 chọn route Control-overlay cho lý do touch-target, giữ tách layer định vị để tái dùng cho accessibility retrofit tương lai. Xem `docs/architecture/adr-0006-tap-name-to-card-entry-point.md` Part 2 để có đầy đủ rationale. | accessibility-specialist / ux-designer / godot-specialist | ~~**Trước khi khóa pattern RichTextLabel-meta-tag dùng chung #14/#15**~~ — đã đóng |
| 12 | **SC 1.4.4 Resize Text (200%) có thể không bao giờ đạt được**: D.5 chỉ cung cấp 3 nấc cỡ chữ rời rạc, trần `FONT_SCALE_STEP[L]=1.25` (125%). Nếu Godot Web export template khóa `user-scalable=no` ở HTML shell (phổ biến ở export mặc định) VÀ trần in-game chỉ 125%, sản phẩm không có cách nào đạt ngưỡng 200% mà SC 1.4.4 (Level AA) yêu cầu. Cần xác nhận: HTML wrapper export có cho phép browser-native zoom hay không? Nếu KHÔNG, D.5 phải nâng trần lên 200% HOẶC GDD phải ghi tường minh đây là 1 deviation có chủ đích khỏi SC 1.4.4 kèm rationale — hiện đang là khoảng trống im lặng, chưa từng được đặt câu hỏi trước vòng 3. Liên quan: viền focus 2px cố định (mục 9) không co theo `theme_scale` — nếu `theme_scale` là phương tiện phóng to DUY NHẤT (không có browser zoom thật), viền có thể co lại tương đối so với ngữ cảnh đã phóng to ở nấc L. **Nhánh quyết định** (phần kỹ thuật vẫn hoãn prototype, phần "chọn nhánh nào" đã chốt): NẾU prototype xác nhận browser zoom bị khóa → D.5 PHẢI thêm 1 nấc scale cao hơn (VD XL, `theme_scale≈2.0`) để đạt 200%; NẾU browser zoom khả dụng → giữ nguyên 3 nấc hiện tại, ghi nhận tường minh "SC 1.4.4 đạt được qua browser-native zoom, không qua `theme_scale` riêng" (không phải deviation, chỉ cần nói rõ cơ chế). Đồng thời bổ sung 1 dòng kiểm chứng cụ thể cho focus 2px ở nấc L: verify contrast viền/nền liền kề ≥3:1 (SC 1.4.11, AA) tại đúng độ dày tuyệt đối 2px — không giả định "phần tử lớn hơn thì viền tự ổn". | accessibility-specialist / godot-specialist | Trước `/create-architecture` — có thể cần prototype để verify trần font trên canvas Web thật |
| 13 | *(Mới vòng 6, ux-designer)* **Eviction D.3b có thể làm nội dung ĐANG ĐỌC biến mất** (không chỉ nhảy vị trí cuộn): nếu người chơi cuộn lên sát biên trên (đọc đúng `s2_oldest_resident_turn_id`) đúng lúc window đầy + lượt mới confirm, đoạn văn đang xem bị gỡ thật khỏi buffer — "Neo vị trí cuộn khi eviction" chỉ cam kết vị trí cuộn không nhảy, không cam kết nội dung đang nhìn không biến mất. Đề xuất kỹ thuật (chưa chốt): hoãn evict 1 nhịp khi lượt cũ nhất đang active-trong-viewport, nới trần tạm thời `LIVE_WINDOW_TURNS + 1` — không phá chứng minh O(1) (vẫn là hằng số, không phụ thuộc `total_turns`). Corner case hiếm (cần submit rồi cuộn ngược đúng lúc AI trả lời) nhưng khó chịu khi xảy ra. | game-designer | Trước khi khóa implementation D.3b |
| 14 | *(Mới 2026-08-07, cascade từ `/design-review ai-llm-integration-layer.md` vòng 1)* **Có nên leo thang chỉ báo "đang viết" (mục 3 Visual/Audio) khi 1 lệnh gọi AI kéo dài bất thường không?** Tầng AI/LLM Integration Layer nay phát 1 sự kiện quan sát được (không bắt buộc tiêu thụ) kèm `elapsed`/`error_class` mỗi khi vào state Retrying-Network (network-retry/model-fallback nội bộ) — chỉ báo "đang viết" hiện tại CỐ Ý bất định (không map % thời gian thật, không spinner, theo Art Bible đã khóa) nên giây thứ 1 và giây thứ 27 trông giống hệt nhau; 1 lượt có thể "chết" tới ~29s (gần bằng trần Core Loop 30s của `game-concept.md`) trước khi Failed. Quyết định (KHÔNG được đổi ngôn ngữ thị giác đã chốt — không spinner/không %): CÓ nên thêm 1 tín hiệu phụ rất nhẹ (VD đổi văn bản diegetic sau ngưỡng thời gian nào đó, không phải progress bar) khi lệnh gọi vượt quá X giây, hay giữ nguyên hoàn toàn bất định? — **ĐÃ ĐÓNG 2026-08-13** (fix sau `/ux-review design/ux/main-screen.md`): **CÓ — leo thang diegetic nhẹ đúng 1 lần.** Sau `ai_writing_escalation_seconds` (provisional 15s, tuning knob dải an toàn 10–25s, PHẢI `< ai_call_timeout_seconds=30`), văn bản chỉ báo đổi sang biến thể thứ hai (copy chính thức chốt với `narrative-director` khi implement), đổi đúng 1 lần, không leo thang tiếp; giữ nguyên ink-sweep, KHÔNG spinner/%/progress — không đổi ngôn ngữ thị giác đã khóa. Chi tiết + AC: `design/ux/main-screen.md` §Transitions & Animations, §Acceptance Criteria. | ux-designer | ~~Trước `/ux-design main-play-screen.md`~~ — đã đóng |
| 15 | *(Mới 2026-09-01, Core Rule #3c/D.7)* **Xác nhận interface `list_known_npc_names(slot) → [{char_id, display_name}]`** với Character Card & Identity (#14): #14 hiện chỉ có `card_exists(char_id)` (predicate 1-entity), chưa có hàm liệt kê toàn bộ NPC hợp lệ — composer cần enumeration này cho ô tìm kiếm (D.7). Ai sở hữu implementation, có tái dùng được cấu trúc dữ liệu đã có sẵn cho nội dung Thẻ hay cần index riêng? | ux-designer / #14 owner | Trước khi implement composer |
| 16 | *(Mới 2026-09-01, Core Rule #3c/D.7)* **Ai sở hữu bước serialize `ActionPayload` → prompt AI?** Turn Manager (#1) và AI/LLM Integration Layer (#4) cần xác nhận tiếp nhận payload có cấu trúc thay cho chuỗi tự do phẳng — mỗi đoạn (kèm loại + speaker) cần được đưa vào đúng khối `wrapPlayerInput` hiện có, theo thứ tự, với nhãn rõ ràng cho AI. | technical-director | Trước `/create-architecture` |
