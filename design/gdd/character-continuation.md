# Character Continuation

> **Status**: **Approved** (`/design-review` round 2, narrow verify pass,
> hoàn tất 2026-08-10 — Open Question BLOCKING duy nhất còn lại của vòng 1
> đã đóng; xem `reviews/character-continuation-review-log.md`. Open
> Question #11-tracker còn mở nhưng user xác nhận 2026-08-11 là không
> chặn Approved — xem ghi chú re-scope trong bảng Open Questions.)
> **Author**: user + agents
> **Last Updated**: 2026-08-10
> **Implements Pillar**: Pillar 2 (Hệ Quả Thực Sự), Pillar 3 (Sức Mạnh Có Logic)
> **Creative Director Review (CD-GDD-ALIGN)**: Hoàn tất qua `/design-review` round 1 full mode (senior synthesis), 2026-08-09

## Overview

Character Continuation là hệ nhận bàn giao từ Death & Consequence (tín
hiệu `death_confirmed`) và Turn Manager (trạng thái `is_death_turn=true`,
Undo đã khóa vĩnh viễn) ngay khi nhân vật chính chết thật, rồi trình bày
cho người chơi đúng 3 lối tiếp tục: Quỷ tu, Chuyển sinh, hoặc Chơi lại —
mỗi lối là một cách để câu chuyện tiếp tục có ý nghĩa, không phải một cơ
chế né tránh hậu quả. Ở phạm vi MVP, chỉ "Chơi lại" hoạt động đầy đủ
(kích hoạt trực tiếp cơ chế tạo slot mới + khóa slot cũ đã có sẵn ở
Persistence/Save System); Quỷ tu và Chuyển sinh hoãn sang Vertical Slice
theo quyết định phạm vi đã khóa. Về mặt người chơi, đây là khoảnh khắc
duy nhất trong toàn game mà "lưới an toàn" xuất hiện — không phải để
tránh cái chết (đã xảy ra thật, không thể đảo ngược), mà để xác nhận
rằng cái chết không phải điểm kết của trải nghiệm.

## Player Fantasy

*(Ghi chú: `creative-director` không được tham vấn ở bản gốc — chế độ
review `lean` chỉ bắt buộc spawn cho Section D và H. Đoạn dưới đã sửa
2026-08-09 sau `/design-review` round 1 full mode.)*

Đây là khoảnh khắc người chơi cảm nhận trực tiếp và mạnh nhất trong
toàn bộ game — không phải nỗi sợ (cái chết đã xảy ra, không thể thương
lượng), mà là một câu hỏi thật: "câu chuyện này còn ý nghĩa gì để kể
tiếp?" Ba lối đi không phải ba mức độ "hình phạt nhẹ hơn" — chúng là ba
CÂU CHUYỆN khác nhau về cùng một mất mát: Quỷ tu là chọn để cái chết
biến thành động lực đen tối; Chuyển sinh là chọn để bắt đầu một danh
tính mới nhưng mang theo dư âm — CẢ HAI là những lối THẬT SỰ viết tiếp
(mang một dạng hệ quả/dư âm nào đó sang phía bên kia cái chết). Chơi
lại là câu chuyện thứ ba, khác bản chất: **đóng hẳn một chương lại và
mở một hành trình hoàn toàn độc lập** trong cùng bối cảnh danh tác —
không giả vờ chương cũ chưa từng xảy ra (Persistence giữ nguyên
playthrough cũ như một "quyển nhật ký đã khép", đọc lại được bất cứ lúc
nào qua "Xem lại slot đã khép" — `persistence-save-system.md`), nhưng
KHÔNG mang bất kỳ trạng thái cơ học nào từ chương cũ sang chương mới
(Core Rule #6) — nó là sự đối lập của "viết tiếp", không phải một hình
thức khác của nó.

**Xác nhận đây là đánh đổi phạm vi CÓ Ý THỨC** (2026-08-09,
`/design-review` round 1, nhóm-A finding 4a/4b — không phải khoảng
trống bị bỏ sót): ở MVP, Quỷ tu/Chuyển sinh — hai lối THẬT SỰ mang hệ
quả tiếp nối — đều hoãn sang Vertical Slice; Chơi lại là lối DUY NHẤT
khả dụng, và bản chất của nó là khép lại chứ không phải nối tiếp. Nghĩa
là ở MVP, phản ứng khả thi duy nhất trước hệ quả nặng nhất của game
(cái chết) là bắt đầu một hành trình sạch, không phải nối dài hệ quả đó
— đây là giới hạn nội dung MVP đã biết và chấp nhận, không phải mâu
thuẫn thiết kế cần vá. Đúng tinh thần Pillar 2 (Hệ Quả Thực Sự): hệ quả
nặng nhất (cái chết, playthrough cũ) không hề bị xóa hay đảo ngược —
chỉ có CÁCH PHẢN ỨNG với nó (chọn lối nào) là nơi người chơi có quyền
viết tiếp câu chuyện của chính mình.

## Detailed Design

*(Lean mode: Section C không bắt buộc spawn specialist — chỉ D và H.)*

### Core Rules

1. **Điều kiện kích hoạt = 2 lớp, không phải 1**: `continuation_choice_eligible`
   (Formula D.2) đúng CHỈ KHI CẢ HAI điều kiện cùng đúng trong 1 lượt:
   Turn Manager đã khóa `undo_available=false` vĩnh viễn qua
   `is_death_turn=true` (Core Rule #9), VÀ Death & Consequence đã phát
   tín hiệu `death_confirmed`. Nhưng `eligible=true` CHỈ MỞ ĐIỀU KIỆN —
   nó KHÔNG tự động chuyển state (**sửa 2026-08-09**, `/design-review`
   round 1, đóng mâu thuẫn cross-GDD với `core-ui-screen-navigation.md`
   D.2/Core Rule #6, hệ #15 đã Approved: cạnh `S2→S5` của #15 chỉ mở khi
   người chơi CHẠM dòng dẫn cuối đoạn văn lượt chết, `tap_continue_to_fate`
   — bản trước của rule này ngụ ý tự động chuyển ngay khi 2 cờ đúng,
   điều này sẽ khiến AC-01 fail chính kiến trúc #15 nếu implement
   literal). Vậy: `eligible=true` là điều kiện CHO PHÉP entrypoint hoạt
   động; hành động CHẠM của người chơi (do #15 sở hữu affordance) là tác
   nhân thật sự chuyển `Idle → Awaiting Continuation Choice`. Không có
   đường kích hoạt nào khác (không timer, không hệ nào khác ngoài Turn
   Manager + Death & Consequence được đọc để tính `eligible`).

   **Đồng thời (sửa 2026-08-09, cùng round)**: `is_death_turn=true` +
   `death_confirmed` KHÔNG chỉ mở điều kiện ở đây — tại chính thời điểm
   đó, Death & Consequence (Nhánh A bước c) đã TRIGGER trực tiếp thao
   tác Persistence "Khóa slot" (đảo ngược điểm quy thuộc trước đây gán
   cho hệ này — xem Core Rule #5 và Edge Case #1). Nghĩa là ngay từ lúc
   `eligible` có thể = true, slot hiện tại LUÔN đã khép, bất kể người
   chơi có chạm dòng dẫn ngay hay để đó rất lâu.

2. **3 lối tiếp tục, đúng 1 lối khả dụng ở MVP**: màn hình hiển thị đủ
   3 lựa chọn (Quỷ tu, Chuyển sinh, Chơi lại) đúng tinh thần "lưới an
   toàn" của `game-concept.md`, nhưng **Quỷ tu và Chuyển sinh bị khóa**
   (không bấm được) ở phạm vi MVP — quyết định phạm vi đã khóa
   (`systems-index.md` Priority Tiers). Trạng thái khóa được truyền đạt
   THUẦN BẰNG HÌNH ẢNH — nét phác thảo mỏng, khung mực loang CHƯA khép
   kín ("trang chưa viết") — **KHÔNG có nhãn text nào loại "Sắp ra mắt"**
   (**sửa 2026-08-09**, `/design-review` round 1 — nhãn đó là ngôn ngữ
   phi-diegetic/roadmap-speak đặt ngay tại đỉnh điểm cảm xúc của game;
   sự VẮNG MẶT của nhãn là tín hiệu, đúng nguyên tắc "im lặng cũng là
   một tín hiệu" mà chính hệ này đã dùng cho âm thanh event 1 Visual/
   Audio — xem Visual/Audio §Event 2). Chỉ "Chơi lại" xử lý được hành
   động thật.

3. **Không có giới hạn thời gian chọn**: người chơi có thể ở trạng thái
   "Awaiting Continuation Choice" bao lâu tùy ý — không auto-timeout,
   không mặc định tự chọn lối nào. Nhất quán với trọng lượng cảm xúc
   của khoảnh khắc này (Player Fantasy).

4. **"Chơi lại" giữ nguyên bối cảnh danh tác, khép chương cũ, mở một
   hành trình MỚI hoàn toàn độc lập**: KHÔNG quay lại màn hình chọn bối
   cảnh (danh tác giữ nguyên, VD Đấu La Đại Lục) — chỉ khởi tạo lại
   đúng nhân vật chính mẫu chuẩn MVP (`game-concept.md` Required #1: "1
   nhân vật chính đầy đủ chỉ số/kỹ năng/trang bị", KHÔNG có character
   creator tùy chỉnh ở MVP) trong một playthrough hoàn toàn độc lập —
   không kế thừa bất kỳ trạng thái nào (Core Rule #6). "Giữ nguyên bối
   cảnh danh tác" chỉ có nghĩa là KHÔNG hỏi lại setting pack; nó không
   ngụ ý playthrough mới tiếp nối lịch sử của playthrough cũ (**làm rõ
   2026-08-09**, `/design-review` round 1 — tránh đọc nhầm rule này
   thành mâu thuẫn với Core Rule #6, xem Player Fantasy).

5. **"Chơi lại" kích hoạt ĐÚNG 1 thao tác Persistence: "Tạo slot mới"**
   (`persistence-save-system.md`, Approved) — gọi NGAY KHI vào state
   `Processing Chơi Lại` lần đầu, ĐÚNG 1 LẦN. **"Khóa slot" KHÔNG còn
   thuộc trách nhiệm của hệ này** (sửa lại 2026-08-09, `/design-review`
   round 1 — đảo ngược sửa 2026-08-05: thao tác đó nay do Death &
   Consequence trigger trực tiếp NGAY tại thời điểm `death_confirmed`
   [Nhánh A bước c], TRƯỚC KHI hệ này thậm chí có cơ hội chuyển sang
   `Awaiting Continuation Choice` — lý do: nếu "Khóa slot" chờ tới lúc
   người chơi chọn "Chơi lại" mới chạy, slot vẫn "đang chơi dở" suốt
   thời gian `Awaiting Continuation Choice`, và nếu người chơi đóng tab
   đúng lúc đó rồi mở lại game, họ sẽ rơi vào 1 slot có `alive=false`
   không có lối thoát nào — xem Edge Case #1). Retry đơn giản hơn hẳn vì
   chỉ còn 1 thao tác: KHÔNG gọi lại "Tạo slot mới" nếu bước reset trạng
   thái (Core Rule #6) thất bại sau đó và người chơi thử lại (retry tái
   dùng đúng `slot_id` vừa tạo — xem Edge Cases). Chỉ khi CHÍNH thao tác
   "Tạo slot mới" thất bại (lỗi tầng lưu trữ, VD quota đầy) thì retry
   mới gọi lại "Tạo slot mới" từ đầu.

6. **Playthrough mới KHÔNG kế thừa BẤT KỲ trạng thái nào từ playthrough
   cũ**: EXP/level reset về mẫu khởi điểm, `alive=true`,
   `death_and_consequence_blocked=false` (đã chốt ở
   `death-and-consequence.md` Edge Case #8), Hảo cảm mọi NPC reset về
   preset mặc định của setting pack, mọi event Setting & Canon
   (`canon_event_*_status`) reset về trạng thái ban đầu
   (`Dormant`/`Pending` gốc), **`known_skill_ids`/`equipped_weapon_id`
   (Equipment & Skill Data System) reset về loadout khởi điểm mẫu chuẩn
   MVP** — playthrough mới coi setting pack như vừa được chọn lần đầu,
   đúng nguyên tắc "mỗi slot = 1 playthrough độc lập" đã khóa ở
   Persistence.

7. **Sau khi "Chơi lại" hoàn tất, quyền điều khiển trả về luồng Turn
   Manager bình thường** ở slot MỚI, trạng thái "Awaiting Action" —
   sinh gợi ý hành động mở đầu như một game mới, không phải tiếp nối
   bất kỳ ngữ cảnh nào của lượt vừa chết.

### States and Transitions

| State | Mô tả | Chuyển sang |
|---|---|---|
| Idle | Trạng thái mặc định, không áp dụng (game đang chạy bình thường) | → Awaiting Continuation Choice (khi `continuation_choice_eligible=true` VÀ người chơi CHẠM dòng dẫn cuối đoạn văn lượt chết — Core UI #15's `tap_continue_to_fate`; `eligible=true` chỉ MỞ điều kiện, KHÔNG tự chuyển state — sửa 2026-08-09, xem Core Rule #1) |
| Awaiting Continuation Choice | Màn hình 3 lối hiển thị, chờ người chơi — Turn Manager KHÔNG hoạt động (không gợi ý hành động, không lượt mới); slot hiện tại LUÔN đã khép (Persistence "Khóa slot" đã chạy tại `death_confirmed`, xem Core Rule #5) | → Processing Chơi Lại (khi chọn Chơi lại) — Quỷ tu/Chuyển sinh không khả dụng ở MVP |
| Processing Chơi Lại | Gọi Persistence "Tạo slot mới" (chỉ 1 thao tác — "Khóa slot" đã xong từ trước), khởi tạo lại trạng thái mọi hệ (Core Rule #6) | → New Playthrough Started (khi `reset_completeness_check`/D.1 = `handoff_allowed=1`) HOẶC → Reset Failed (khi `handoff_allowed=0`) |
| New Playthrough Started | Bàn giao lại cho Turn Manager, trạng thái "Awaiting Action" ở slot mới | → [Ngoài phạm vi hệ này, Turn Manager tiếp quản] |
| Reset Failed | Ít nhất 1 hệ chưa xác nhận đạt fresh-init default (D.1), HOẶC thao tác "Tạo slot mới" thất bại — CHẶN bàn giao, hiển thị lỗi cho người chơi, KHÔNG trả quyền điều khiển về Turn Manager | → Processing Chơi Lại (người chơi thử lại thao tác "Chơi lại") HOẶC → [ngoài phạm vi hệ này, Save Slot Screen] khi `reset_failed_reason="persistence_error"` VÀ đã đạt `max_write_retry_before_escalation` (Persistence, registry) lần retry liên tiếp cùng lỗi — lối thoát KHÔNG phá hủy qua `tap_back_to_slots` (Core UI #15, đã hỗ trợ sẵn tại S5), bổ sung 2026-08-09 vì lỗi quota không tự hết, retry vô hạn sẽ không bao giờ thành công (xem Edge Cases) |

### Interactions with Other Systems

- **Death & Consequence** (upstream, hard) — nhận tín hiệu
  `death_confirmed` — nguồn kích hoạt duy nhất của hệ này.
- **Turn Manager** (upstream+downstream, hard) — ĐỌC `is_death_turn=true`
  đã khóa (điều kiện kích hoạt kèm theo); CUNG CẤP quyền điều khiển trở
  lại Turn Manager ("Awaiting Action") ở slot mới sau khi "Chơi lại"
  hoàn tất.
- **Persistence/Save System** (downstream, hard) — TRIGGER trực tiếp
  ĐÚNG 1 thao tác "Tạo slot mới" (sửa 2026-08-09: "Khóa slot" không còn
  thuộc hệ này — xem Core Rule #5); ĐỌC gián tiếp "Xem lại slot đã
  khép" làm căn cứ cho tính liên tục cảm xúc ở Player Fantasy.
- **Core UI/Screen Navigation** (hệ #15, Approved, downstream+upstream,
  hard — bổ sung 2026-08-09, đóng gap Dependencies một chiều): #15 sở
  hữu affordance CHẠM (`tap_continue_to_fate`) mở takeover màn S5 khi
  `continuation_choice_eligible=true`, và sở hữu layout/`tap_retry_reset`/
  `tap_back_to_slots` của màn 3 lối; hệ này (#13) sở hữu NỘI DUNG màn đó
  (3 lối, mô tả tường thuật, trạng thái Reset Failed).
- **Setting & Canon Integration** (soft, provisional) — playthrough mới
  cần setting pack reset về trạng thái ban đầu (mọi event
  Dormant/Pending gốc) — cơ chế reset cụ thể thuộc hệ đó, chưa hình
  thức hóa ở đây.
- **NPC Affinity & Relationship** (soft, provisional) — playthrough mới
  cần Hảo cảm mọi NPC reset về preset mặc định setting pack — cơ chế
  reset cụ thể thuộc hệ đó.
- **EXP & Realm Progression** (soft) — nhân vật mới khởi tạo `level=1`,
  `EXP=0` theo mẫu chuẩn MVP.
- **Equipment & Skill Data System** (soft) — nhân vật mới khởi tạo
  `known_skill_ids`/`equipped_weapon_id` về loadout khởi điểm mẫu
  chuẩn MVP (Core Rule #6).
- **Character Card & Identity** (downstream, soft, đã Designed) — sẽ
  hiển thị màn hình 3 lối tiếp tục (UI component).

## Formulas

*(Đề xuất bởi `systems-designer`, lean mode — Section D bắt buộc
spawn. Hệ này nhỏ theo đúng thiết kế MVP — 2 công thức dưới đây là
invariant/gate kỹ thuật (trigger + orchestration), KHÔNG phải công thức
cân bằng gameplay, cùng loại với `undo_availability_window`/
`bundle_completeness_check` (registry).)*

### D.1 — reset_completeness_check

The `reset_completeness_check` formula is defined as:

```
reset_complete(reset) = 1 nếu (N ≥ 1) AND (Σ(s=1→N) ok(s) = N), ngược lại 0
handoff_allowed(reset) = reset_complete(reset) AND (N ≥ 1)
completeness_ratio(reset) = 0 nếu N=0, ngược lại (1/N) × Σ(s=1→N) ok(s)
    — CHỈ dùng chẩn đoán/log, KHÔNG BAO GIỜ dùng làm gate
```

**Sửa 2026-08-09** (`/design-review` round 1, `systems-designer` +
`qa-lead` hội tụ): bản gốc dùng `completeness_ratio(reset) = 1` (so
sánh dấu-phẩy-động) làm gate — đúng lớp lỗi mà `bundle_completeness_check`
(Persistence, registry, "cùng loại" theo chính công thức này tự nhận)
đã phải sửa 2026-08-06/07: `N=5` không phải lũy thừa của 2, `(1/5)×5`
có thể không ra đúng `1.0` tuyệt đối do sai số IEEE-754 → false negative
chặn nhầm 1 lượt "Chơi lại" hợp lệ. Còn TỆ HƠN bản gốc của Persistence:
công thức cũ ở đây dùng `(1/N)` trực tiếp nên `N=0` là **chia cho 0
thật**, không chỉ vacuous-truth. Nay gate dùng so sánh SỐ NGUYÊN
`Σok(s) = N`; `completeness_ratio` lùi về vai trò thuần chẩn đoán, có
guard `N=0` để không chia cho 0 khi ghi log cho `reset_failed_reason=
"configuration_error"` (xem AC-11).

`ok(s) = 1` nếu hệ `s` xác nhận đã đạt trạng thái khởi tạo mới đã định
nghĩa (fresh-init default) của CHÍNH NÓ, ngược lại `0`. **Cơ chế xác
nhận (chốt 2026-08-05, cụm G `/design-review` gộp 11 GDD; SỬA 2026-08-10,
`/design-review` round 2 — đóng Open Question BLOCKING của vòng 1, phân
biệt 2 lớp hệ)**: LAZY-INIT — KHÔNG có lệnh gọi `reset_to_fresh_init`
tường minh nào; `ok(s)` là kết quả ĐỌC trạng thái sau khi khởi tạo,
không phải xác nhận đã NHẬN một lời gọi. Cơ chế ĐỌC cụ thể chia 2 lớp
theo cách hệ `s` định danh dữ liệu của nó — vòng 1 chỉ mô tả đúng Lớp A,
bỏ sót Lớp B:

- **Lớp A (định danh theo `char_id` — LUÔN MỚI mỗi playthrough)**: EXP &
  Realm Progression, Equipment & Skill Data System (nhân vật chính LUÔN
  nhận `char_id` MỚI khi "Chơi lại" — xác nhận qua `death-and-consequence.md`
  AC-13/AC-36). Ở lớp này, "truy vấn với ID chưa từng thấy" đúng nghĩa
  đen — hệ `s` tự trả default vì `char_id` đó thật sự mới với nó, đúng
  mô tả gốc của cụm G.
- **Lớp B (định danh theo ID CỐ ĐỊNH, setting-pack-authored —
  `npc_id`, `event_id` — KHÔNG đổi giữa các playthrough)**: NPC
  Affinity & Relationship, Setting & Canon Integration (và có thể
  Situation/Encounter Generation — xem Open Questions, chưa xác nhận
  vòng này). Ở lớp này, "ID chưa từng thấy" SAI hoàn toàn — cùng
  `npc_id`/`event_id` sẽ bị Character Continuation truy vấn LẠI ở slot
  mới, và object in-memory của hệ `s` vẫn sống nguyên vẹn (KHÔNG reload
  trang giữa 2 playthrough cùng phiên — "Chơi lại" chạy trong 1 phiên
  trình duyệt liên tục). `ok(s)` ở lớp này KHÔNG được định nghĩa qua "ID
  chưa từng thấy" — mà qua: **container trạng thái của hệ `s` đã REBIND
  sang blob rỗng của `slot_id` MỚI (Persistence "Tạo slot mới") TRƯỚC
  khi D.1 đọc `ok(s)`**. Storage đã namespace theo slot sẵn ở tầng
  Persistence (`turn_snapshot` per slot, xem `persistence-save-system.md`)
  — đây KHÔNG phải yêu cầu hệ `s` đổi schema lưu trữ hay thêm `slot_id`
  vào key của chính nó, chỉ là điều kiện THỜI ĐIỂM ĐỌC: hệ `s` phải đọc
  đúng blob đang active của Persistence, không giữ 1 bản sao in-memory
  không rebind theo lần chuyển slot gần nhất.

**Variables:**

| Variable | Symbol | Type | Range | Description |
|----------|--------|------|-------|-------------|
| Số hệ bị Core Rule #6 ràng buộc reset | `N` | int | ≥1 (0 = lỗi cấu hình) | Danh sách mở — hiện tại tối thiểu 5: EXP & Realm Progression, NPC Affinity & Relationship, Setting & Canon Integration, Death & Consequence (`alive`, `death_and_consequence_blocked`), Equipment & Skill Data System. **Ràng buộc versioning** (bổ sung 2026-08-09, `/design-review` round 1 — mượn nguyên cơ chế `bundle_completeness_check` đã có): bất kỳ bullet mới nào thêm vào Core Rule #6 (hệ khác cần tham gia reset) PHẢI đồng thời cập nhật N ở đây + re-run AC-07 (chốt field-list) trong cùng lần sửa — N không phải "đếm tay" độc lập, nó PHẢI khớp đúng số bullet trong Core Rule #6 |
| Hệ cụ thể | `s` | system_id | ∈{1..N} | Một hệ trong tập bị ràng buộc reset |
| Xác nhận reset xong | `ok(s)` | bool | {0,1} | 1 nếu hệ `s` đạt fresh-init default của CHÍNH NÓ — định nghĩa "thế nào là fresh-init" thuộc hệ đó, không phải Character Continuation |
| Tỉ lệ hoàn tất | `completeness_ratio(reset)` | float | [0,1] | Chỉ dùng chẩn đoán/log |
| Hoàn tất toàn bộ | `reset_complete(reset)` | bool | {0,1} | 1 CHỈ KHI tất cả N hệ đều `ok` |
| Cho phép bàn giao | `handoff_allowed(reset)` | bool | {0,1} | Điều kiện BẮT BUỘC trước khi chuyển `Processing Chơi Lại → New Playthrough Started` |

**Output Range**: boolean tất-cả-hoặc-không-gì — không có "bàn giao một
phần", cùng kiểu `bundle_completeness_check` (Persistence, registry).

**Example**: `N=5` (EXP, NPC Affinity, Setting & Canon, Death &
Consequence-flags, Equipment & Skill Data), cả 5 đều `ok=1` →
`handoff_allowed=1` → chuyển `New Playthrough Started`. Trường hợp NPC
Affinity trả `ok=0` (bug reset dở dang) → `completeness_ratio=0.8` →
`reset_complete=0` → `handoff_allowed=0` → **CHẶN bàn giao**, chuyển
`Reset Failed` (hiển thị lỗi cho người chơi, cho phép thử lại — quyết
định 2026-08-03, không retry ngầm/không chỉ log).

### D.2 — continuation_choice_eligible

The `continuation_choice_eligible` formula is defined as:

```
continuation_choice_eligible(turn) = is_death_turn(turn) AND death_confirmed(turn)
```

**Variables:**

| Variable | Symbol | Type | Range | Description |
|----------|--------|------|-------|-------------|
| Lượt đang xét | `turn` | turn_id | ≥0 | — |
| Cờ Turn Manager khóa vĩnh viễn | `is_death_turn(turn)` | bool | {0,1} | Nguồn: `undo_availability_window` (registry, Turn Manager) |
| Tín hiệu Death & Consequence | `death_confirmed(turn)` | bool | {0,1} | Nguồn: `death-and-consequence.md` Nhánh A bước c |
| Kết quả | `continuation_choice_eligible(turn)` | bool | {0,1} | 1 khi hệ này ĐƯỢC PHÉP chuyển `Idle → Awaiting Continuation Choice` — điều kiện CHO PHÉP, KHÔNG phải trigger tự động (sửa 2026-08-09, xem Core Rule #1); tác nhân chuyển thật là hành động CHẠM của người chơi (Core UI #15's `tap_continue_to_fate`) |

**Output Range**: boolean. Theo thiết kế nguồn, 2 flag input LUÔN được
khóa cùng lúc trong cùng 1 bước xử lý của Death & Consequence (AC-06
GDD đó) — công thức này tồn tại như **invariant phòng thủ 2 lớp giữa 2
hệ độc lập**, không phải bộ lọc case thường gặp.

**Example**: lượt 47, `is_death_turn=true`, `death_confirmed=true` →
`eligible=1` → dòng dẫn cuối đoạn văn hiện ra (Core UI #15); người chơi
CHẠM dòng dẫn đó (bất kỳ lúc nào sau đó, không giới hạn thời gian — Core
Rule #3) → chuyển `Idle → Awaiting Continuation Choice`. **Trường hợp
biên** (không nên xảy ra qua luồng bình thường, nhưng công thức phải xử
lý được nếu có bug đồng bộ giữa Turn Manager và Death & Consequence):
chỉ 1 trong 2 = true → `eligible=0` — dòng dẫn KHÔNG hiện, hệ này KHÔNG
chuyển state, ở lại `Idle`, log như lỗi đồng bộ.

---

*(Quỷ tu và Chuyển sinh KHÔNG có công thức ở phạm vi MVP — cả 2 là UI
stub khóa cứng (Core Rule #2), chưa có rule cơ học nào được định nghĩa.
Công thức cho 2 lối này, nếu có, sẽ được thiết kế khi phạm vi Vertical
Slice mở khóa chúng — không thiết kế trước nội dung đã hoãn, đúng quy
ước nhất quán của dự án.)*

## Edge Cases

*(Lean mode: không bắt buộc spawn specialist cho Section E — chỉ D và
H.)*

- **Nếu người chơi đóng trình duyệt trong lúc `Awaiting Continuation
  Choice` mà chưa chọn gì** (kể cả TRƯỚC khi chạm dòng dẫn để vào state
  này — xem Core Rule #1): KHÔNG có cơ chế phục hồi trạng thái này
  riêng — `is_death_turn=true` đã được Persistence auto-save (Turn
  Confirmed) VÀ "Khóa slot" đã chạy NGAY tại `death_confirmed` (Death &
  Consequence Nhánh A bước c, sửa 2026-08-09 — xem Core Rule #5) —
  slot cũ LUÔN đã khép thành read-only TRƯỚC KHI màn hình 3 lối kịp
  hiện ra, không phụ thuộc việc người chơi có kịp chạm dòng dẫn hay
  không. **Đây là điều kiện tiên quyết để hành vi dưới đây đúng** (fix
  2026-08-09 đóng 1 blocking: bản trước giả định điều này nhưng trigger
  "Khóa slot" thật sự chỉ chạy SAU khi chọn "Chơi lại" — khiến giả định
  sai, gây stuck state nếu đóng tab giữa chừng). Khi mở lại game, người
  chơi thấy màn hình chọn slot với slot cũ đã khép; chọn "Bắt đầu mới"
  thủ công từ đó (Persistence, đã Approved) — về mặt kết quả GIỐNG HỆT
  việc chọn "Chơi lại" (cùng bối cảnh danh tác, cùng loadout khởi điểm)
  — không cần hệ này tự lưu lại trạng thái "đang chờ chọn".
- **Nếu người chơi cố chọn Quỷ tu hoặc Chuyển sinh** (qua input tự do,
  bỏ qua UI khóa): hành động bị từ chối, không đổi state — hiển thị
  lại thông báo "Sắp ra mắt", vẫn ở `Awaiting Continuation Choice`.
  Không phải lỗi, chỉ là 1 lựa chọn chưa khả dụng.
- **Nếu `reset_completeness_check` (D.1) cho `handoff_allowed=0`**
  (lỗi Ở BƯỚC RESET TRẠNG THÁI, slot mới đã tạo thành công): chuyển
  `Reset Failed` (`reset_failed_reason="state_reset_error"`) — CHẶN bàn
  giao Turn Manager, hiển thị lỗi. Khi người chơi "Thử lại": hệ TÁI DÙNG
  ĐÚNG `slot_id` vừa tạo (KHÔNG gọi lại "Tạo slot mới" — đã gọi đủ 1
  lần theo Core Rule #5; "Khóa slot" không liên quan nhánh này — đã
  xong từ trước khi hệ này kích hoạt), chỉ chạy lại bước reset trạng
  thái (Core Rule #6) vào slot đó — không có slot dở dang nào bị bỏ
  lại, không cần Persistence lọc slot chưa hoàn tất khỏi màn hình chọn
  slot.
- **Nếu bản thân thao tác Persistence "Tạo slot mới" thất bại** (khác
  với D.1 — đây là lỗi tầng lưu trữ, VD quota trình duyệt đầy, xảy ra
  TRƯỚC KHI bất kỳ bước reset trạng thái nào chạy): chuyển `Reset
  Failed` (`reset_failed_reason="persistence_error"`) với thông báo cụ
  thể hơn ("hết dung lượng lưu trữ"). Khi người chơi "Thử lại": vì
  CHƯA có slot mới nào được tạo thành công, hệ gọi lại "Tạo slot mới"
  TỪ ĐẦU (Core Rule #5) — khác với nhánh `state_reset_error` ở trên;
  chỉ 1 thao tác được retry (không còn "Khóa slot" để gọi lại).
  **Lối thoát không-phá-hủy sau nhiều lần thất bại liên tiếp** (bổ
  sung 2026-08-09, `/design-review` round 1 — đóng 1 blocking: nguyên
  nhân gốc của `persistence_error` [quota đầy] KHÔNG tự hết, retry vô
  hạn theo Edge Case cuối sẽ không bao giờ thành công; mượn nguyên
  pattern `max_write_retry_before_escalation` đã có ở
  `persistence-save-system.md` Core Rule #4): sau
  `max_write_retry_before_escalation` (registry, tham chiếu không tạo
  bản sao) lần retry-"Tạo slot mới" liên tiếp thất bại cùng
  `reset_failed_reason="persistence_error"`, banner lỗi PHẢI thêm 1 nút
  điều hướng TRỰC TIẾP `tap_back_to_slots` (Core UI #15, đã hỗ trợ sẵn
  tại màn S5) sang Save Slot Screen — không tạo slot dở dang, không mất
  playthrough cũ đã khép (người chơi luôn "Xem lại" được, và có thể thử
  "Chơi lại" lại sau khi dọn quota). Nhánh `state_reset_error` KHÔNG
  cần lối thoát này (bug logic thường hết sau 1-2 lần thử, không phải
  tài nguyên hữu hạn tất định như quota).
- **Nếu `N=0`** (danh sách hệ ràng buộc reset rỗng — lỗi cấu hình, xem
  D.1): chuyển `Reset Failed`
  (`reset_failed_reason="configuration_error"`, bổ sung 2026-08-09) —
  KHÔNG tính `completeness_ratio` qua công thức gốc (tránh chia cho 0,
  xem D.1 guard); hiển thị lỗi kỹ thuật rõ ràng khác 2 nhánh trên (đây
  là lỗi cấu hình/dữ liệu, không phải lỗi lưu trữ hay lỗi 1 hệ reset dở
  dang) — không nên xảy ra qua vận hành bình thường (N tĩnh, gắn với số
  bullet Core Rule #6) nhưng test biên vẫn giữ để khóa hành vi
  fail-closed (xem AC-11).
- **Nếu người chơi cố gọi Undo trong lúc `Awaiting Continuation
  Choice`**: đã bị chặn ở tầng Turn Manager (Core Rule #9,
  `is_death_turn=true` khóa `undo_available=false` vĩnh viễn) — hệ này
  không cần enforcement riêng, chỉ xác nhận hành vi thừa hưởng đúng.
- **Nếu người chơi thử lại "Chơi lại" nhiều lần liên tiếp sau `Reset
  Failed`**: mỗi lần thử là một lượt gọi độc lập tới `Processing Chơi
  Lại` — không có giới hạn số lần thử, không cooldown (lỗi ở đây luôn
  là lỗi kỹ thuật/bug, không phải cơ chế gameplay cần chống spam). Với
  riêng nhánh `persistence_error`, sau `max_write_retry_before_escalation`
  lần liên tiếp UI THÊM (không THAY) 1 lối thoát `tap_back_to_slots` —
  người chơi vẫn có thể tiếp tục bấm "Thử lại" bao nhiêu lần tùy ý, lối
  thoát chỉ là lựa chọn bổ sung, không phải giới hạn cứng (làm rõ
  2026-08-09, tránh mâu thuẫn với chính bullet này).

## Dependencies

| System | Direction | Nature of Dependency | Hard/Soft |
|---|---|---|---|
| Death & Consequence (Approved) | Hệ này phụ thuộc | Tín hiệu `death_confirmed` — nguồn kích hoạt duy nhất; **sửa 2026-08-09** — hệ đó nay CŨNG trigger "Khóa slot" trực tiếp tại `death_confirmed` (Nhánh A bước c), không còn thuộc hệ này | Hard |
| Turn Manager (Approved) | 2 chiều | ĐỌC `is_death_turn=true` (điều kiện kích hoạt); CUNG CẤP quyền điều khiển trở lại ("Awaiting Action") ở slot mới sau khi hoàn tất | Hard |
| Persistence/Save System (Approved) | Hệ này phụ thuộc | TRIGGER trực tiếp ĐÚNG 1 thao tác "Tạo slot mới" (**sửa 2026-08-09**: "Khóa slot" chuyển sang Death & Consequence — xem dòng trên); ĐỌC "Xem lại slot đã khép" làm căn cứ Player Fantasy | Hard |
| Core UI/Screen Navigation (Approved, hệ #15) | 2 chiều hard (bổ sung 2026-08-09, đóng gap một chiều) | #15 sở hữu affordance CHẠM (`tap_continue_to_fate`) + layout/`tap_retry_reset`/`tap_back_to_slots` của màn 3 lối; hệ này sở hữu NỘI DUNG màn đó | Hard |
| Setting & Canon Integration (Designed) | Hệ này phụ thuộc (mềm) | Reset event states về `Dormant`/`Pending` gốc cho playthrough mới | Soft — **hình thức hóa 2026-08-10** (`/design-review` round 2): `setting-canon-integration.md` AC-49, kỹ thuật "container rebind" (Lớp B — xem D.1) |
| NPC Affinity & Relationship (Approved) | Hệ này phụ thuộc (mềm) | Reset Hảo cảm mọi NPC về preset mặc định setting pack (nếu có preset authored — xem AC-30 GDD đó, làm rõ 2026-08-09) | Soft — **hình thức hóa 2026-08-10** (`/design-review` round 2): `npc-affinity-relationship.md` AC-39, kỹ thuật "container rebind" (Lớp B — xem D.1) |
| EXP & Realm Progression (Designed) | Hệ này phụ thuộc (mềm) | Khởi tạo `level=1`, `EXP=0` cho nhân vật mới | Soft — **hình thức hóa 2026-08-10** (`/design-review` round 2): `exp-realm-progression.md` AC-49, kỹ thuật "dirty old slot first" gốc (Lớp A — `char_id` mới mỗi playthrough, xem D.1) |
| Equipment & Skill Data System (Approved) | Hệ này phụ thuộc (mềm) | Khởi tạo `known_skill_ids`/`equipped_weapon_id` về loadout khởi điểm mẫu chuẩn MVP | Soft — **hình thức hóa 2026-08-10** (`/design-review` round 2): `equipment-skill-data-system.md` AC-18 + Core Rule #6 làm rõ khóa theo `char_id` (Lớp A, xem D.1) |
| Character Card & Identity (đã Designed, hệ #14) | Card phụ thuộc hệ này | Hiển thị màn hình 3 lối tiếp tục (UI component) — **làm rõ 2026-08-09**: đây là dependency lịch sử/mô tả sớm; layout thật của màn 3 lối nay thuộc Core UI #15 (xem dòng trên), Card #14 chỉ còn liên quan nếu overlay Thẻ mở được từ trong màn 3 lối (chưa xác nhận, không phải MVP) | Hard (chiều ngược) |

## Tuning Knobs

Hệ này không có tuning knob RIÊNG nào cần thiết. D.1
(`reset_completeness_check`) và D.2 (`continuation_choice_eligible`)
là invariant boolean thuần túy — không có ngưỡng/hệ số nào để cân bằng
gameplay. `N` (số hệ bị ràng buộc reset ở D.1) là một con số PHÁI SINH
từ số bullet Core Rule #6 (xem D.1 Variables — ràng buộc versioning),
không phải giá trị designer chỉnh tay. Không có timer, không có xác
suất, không có curve nào trong toàn bộ hệ.

**Knob của hệ khác được tham chiếu, không tạo bản sao** (bổ sung
2026-08-09): `max_write_retry_before_escalation` (Persistence, registry)
— áp dụng cho lối thoát không-phá-hủy khi retry "Tạo slot mới" liên
tiếp thất bại (xem Edge Cases). Không nhất quán với quy mô S (1 phiên
thiết kế) đã ước tính ở `systems-index.md` nữa — round 1 review nâng
Scope Signal lên L do hợp đồng lazy-init với 4/5 hệ downstream còn
chưa hình thức hóa và cần hòa giải cross-GDD với Core UI #15/Persistence
(xem Open Questions).

## Visual/Audio Requirements

*(Đề xuất bởi `art-director` — Visual/Audio BẮT BUỘC cho hệ này (màn
hình cảm xúc quan trọng nhất game). Tiếp nối trực tiếp tiền lệ đã khóa
ở `death-and-consequence.md` event 1.)*

**Lý do liên tục màu sắc**: Death & Consequence đã tuyên bố đỏ son "khô
lại" và không còn sống động sau khoảnh khắc chết thật. Character
Continuation diễn ra ngay trong dư âm đó — cách tôn trọng luật khẩu
phần hóa tốt nhất là để sự VẮNG MẶT của đỏ son tiếp tục làm việc: người
chơi vừa thấy màu biến mất, màn hình này xác nhận nó thực sự đã biến
mất. **KHÔNG dùng đỏ son hoặc xanh ngọc ở bất kỳ đâu trong hệ này** —
toàn bộ khác biệt "khóa" vs "khả dụng" nằm ở độ hoàn thiện của nét mực
(phác thảo mỏng vs. mực đậm khép kín), không phát sinh màu mới.

| Event | Visual Feedback | Audio Feedback | Priority |
|---|---|---|---|
| **1. Transition vào (ngay sau khi trang khép ở Death & Consequence)** | Trang xám-đen tĩnh (đã có sẵn từ D&C event 1) thu nhỏ/lùi về góc màn hình như một trang vừa lật qua — KHÔNG cắt cảnh, KHÔNG fade-to-black kiểu Game Over. Không particle/rung màn hình (Anti-Pillar). | Im lặng tiếp nối từ sau âm "cộp" đóng dấu của D&C event 1 — không nhạc sting mới. | BLOCKING (visual) / ADVISORY (audio) |
| **2. Hiển thị 3 lối (Awaiting Continuation Choice)** | "Chơi lại": khung con dấu mực đậm, khép kín hoàn chỉnh; tap = press-feedback BẮT BUỘC (mực loang nhẹ, chạy trên MỌI input — touch lẫn mouse); hover (chỉ mouse) là preview tùy chọn KHÔNG mang thêm thông tin nào so với tap (**làm rõ 2026-08-09**, tránh vi phạm "no hover-only" của `technical-preferences.md`). "Quỷ tu"/"Chuyển sinh": nét phác thảo mỏng màu than nhạt, khung mực loang CHƯA khép kín ("trang chưa viết", không phải "nút tắt") — **KHÔNG có nhãn text "Sắp ra mắt" nào** (bỏ 2026-08-09, xem Core Rule #2 — sự vắng mặt của chữ là tín hiệu, cùng nguyên tắc "im lặng" đã dùng cho âm thanh event 1). Mỗi lối kèm 1-2 dòng mô tả tường thuật ngắn để không đọc như chỗ trống lấp đầy (nội dung authoring cho 2 lối khóa — xem Open Questions, owner/deadline mới). | Tùy chọn: tiếng sột soạt giấy rất nhẹ khi 3 lối hiện ra. | BLOCKING (visual) / ADVISORY (audio) |
| **3. Người chơi cố chọn Quỷ tu/Chuyển sinh (bị từ chối)** | Nét phác thảo "rung" rất nhẹ một nhịp rồi trở về nguyên trạng (không đổi state) — không popup lỗi, không rung màn hình. | Không cần. | ADVISORY |
| **4. Xác nhận "Chơi lại" (Processing Chơi Lại)** | Trang xám tĩnh (event 1) trượt hẳn ra ngoài khung nhìn (biểu thị "đã cất, không xóa"); đồng thời trang giấy dó kem trơn, chưa có chữ, mở ra choán giữa khung hình. KHÔNG dựng "giá sách"/thư viện đầy đủ (thuộc phạm vi màn hình chọn slot, chưa thiết kế). | Tùy chọn: tiếng gấp trang rất nhẹ, khác âm "cộp" của D&C event 1. | BLOCKING (visual) / ADVISORY (audio) |
| **5. New Playthrough Started (bàn giao Turn Manager)** | Trang giấy trơn (event 4) bắt đầu hiện chữ đầu tiên — gợi ý hành động mở đầu — nhịp game bình thường, không hiệu ứng đặc biệt thêm. | Không cần. | ADVISORY |
| **6. Reset Failed (D.1 `handoff_allowed=0`)** | Thông báo lỗi hiển thị NGAY TRÊN trang giấy trơn đang mở dở, khung tường thuật chuẩn — chữ đen-xám, KHÔNG dùng đỏ son (lỗi kỹ thuật, không phải hậu quả cơ học vĩnh viễn). **Copy-tone**: dùng ngôn ngữ diegetic nhất quán với "Mực Chưa Khô" (VD "trang chưa kịp khô, thử lại"), không phải câu thông báo kỹ thuật trần trụi kiểu trình duyệt (làm rõ 2026-08-09 — Open Question mới cho nội dung cụ thể, owner narrative-director). Nút "Thử lại" giữ đúng phong cách "Chơi lại" đã inked-in ở event 2; sau `max_write_retry_before_escalation` lần thất bại liên tiếp (nhánh `persistence_error`), thêm 1 nút điều hướng "Về danh sách quyển sổ" cùng phong cách, không phá vỡ khung tường thuật. | Không cần. | ADVISORY |

## UI Requirements

| Information | Display Location | Update Frequency | Condition |
|---|---|---|---|
| Màn hình 3 lối tiếp tục | Toàn màn hình, thay thế luồng tường thuật bình thường (chạm vào từ dòng dẫn `tap_continue_to_fate`, Core UI #15) | 1 lần/lần chết thật | Khi `continuation_choice_eligible=true` (D.2) VÀ người chơi đã chạm dòng dẫn |
| Trạng thái khóa Quỷ tu/Chuyển sinh — THUẦN HÌNH ẢNH, không nhãn text | Trong màn hình 3 lối, gắn trực tiếp từng lối | Tĩnh (MVP) | Luôn hiện ở MVP (sửa 2026-08-09 — bỏ nhãn "Sắp ra mắt") |
| Mô tả tường thuật ngắn mỗi lối (1-2 dòng, cả 2 lối khóa) | Trong màn hình 3 lối, dưới mỗi lối | Tĩnh, nội dung authoring | Luôn hiện — owner/deadline: xem Open Questions |
| Thông báo lỗi "Reset Failed" + nút "Thử lại" (+ nút "Về danh sách quyển sổ" sau nhiều lần thất bại) | Chồng lên trang giấy trơn đang mở dở | Khi lỗi xảy ra | Chỉ khi `handoff_allowed=0` (D.1) hoặc "Tạo slot mới" thất bại |
| Touch target 3 khung lối tiếp tục | Trong màn hình 3 lối | Tĩnh | `≥ TOUCH_TARGET_MIN=44px` (Core UI #15 D.4, nhóm (b) phần tử độc lập — bắt buộc, bổ sung 2026-08-09, kể cả 2 khung khóa) |

*(Không tạo màn hình phức tạp mới — tái dùng đúng khung tường thuật/
Character Card đã có, đúng tinh thần "không phải HUD game".)*

📌 **UX Flag — Character Continuation**: Hệ này có màn hình UI riêng (3
lối tiếp tục, layout/affordance chạm thuộc Core UI #15 — xem
Dependencies). Ở Phase 4 (Pre-Production), chạy `/ux-design` cho màn
hình này trước khi viết epics — story liên quan nên trích
`design/ux/character-continuation.md` (hoặc gộp vào UX spec chung của
luồng tường thuật), không trích thẳng GDD này. **Input còn thiếu cho
`/ux-design`** (bổ sung 2026-08-09, `/design-review` round 1): số đo cụ
thể (ms/px/hướng) cho hiệu ứng "rung nhẹ" event 3 + phát biểu tương
đương cho keyboard-only; bố cục 3 lối trên Mobile Web portrait
(stack/cuộn); mockup tĩnh xác nhận độ hoàn thiện nét mực đủ phân biệt
cảm xúc 3 lối (evidence Visual/Feel, screenshot + lead sign-off theo
`coding-standards.md`).

## Acceptance Criteria

*(Đề xuất bởi `qa-lead`. Hệ này thuần state machine + 2 công thức
invariant boolean, không network, không RNG — mọi phụ thuộc ngoài (Turn
Manager `is_death_turn`, Death & Consequence `death_confirmed`,
Persistence "Khóa slot"/"Tạo slot mới", và 5 tín hiệu `ok(s)` từ EXP &
Realm Progression/NPC Affinity/Setting & Canon/Death & Consequence/
Equipment & Skill Data) phải được **inject** như tham số/mock, không
gọi hệ thật. "Fresh-init default" của mỗi hệ trong D.1 là hợp đồng
thuộc CHÍNH hệ đó — Section này chỉ xác nhận hệ này GỌI ĐÚNG và ĐỌC
ĐÚNG kết quả `ok(s)`, không kiểm nội dung "thế nào là fresh-init" của
hệ khác.)*

**Story Type**: Logic (state machine + 2 formula invariant boolean, có
tương tác nhiều hệ qua mock) → **BLOCKING** gate, test tự động bắt
buộc tại `tests/unit/character-continuation/` (naming:
`character_continuation_[feature]_test.gd`, `test_[scenario]_[expected]`).

**Ghi chú test setup**: `N` (Formula D.1) cố định = 5 làm fixture mặc
định cho các AC dùng D.1 với danh sách hệ đầy đủ (AC-06 đến AC-10,
AC-12, AC-13). AC-11 dùng N=0 làm fixture RIÊNG cho boundary case cấu
hình lỗi — xem AC-11 (làm rõ 2026-08-09, tránh mâu thuẫn câu chữ với
câu trên). Cơ chế xác nhận `ok(s)` là LAZY-INIT (chốt 2026-08-05 — xem
D.1), không phải lệnh gọi tường minh. **Sửa 2026-08-09** (`/design-review`
round 1): AC dưới đây đánh dấu "provisional-interface" KHÔNG chỉ vì 5
hệ downstream chưa test tích hợp thật (mock only) — grep xác nhận 4/5
hệ (EXP & Realm Progression, Equipment & Skill Data System, Setting &
Canon Integration, NPC Affinity & Relationship) CHƯA CÓ bất kỳ khái
niệm `char_id`/`slot_id` hay AC lazy-init nào trong chính GDD của
chúng — chỉ Death & Consequence có cam kết thật (AC-13/AC-36, kỹ thuật
"dirty old slot first"). Nghĩa là hợp đồng D.1 đang tin tưởng vào 4 hệ
CHƯA TỪNG KÝ hợp đồng đó, không chỉ "chưa test tích hợp" — xem Open
Questions.

### Core Rules

**AC-01** (Rule #1 — duy nhất 1 đường kích hoạt, kiểm ở tầng interface;
**sửa 2026-08-09** thêm assertion tap-gated, đóng 1 blocking cross-GDD
với `core-ui-screen-navigation.md`): GIVEN interface public của hệ này,
WHEN kiểm tra bề mặt API, THEN CHỈ tồn tại đúng 1 entrypoint nội bộ
chuyển `Idle → Awaiting Continuation Choice`, và entrypoint đó ĐÒI HỎI
CẢ HAI: (a) `continuation_choice_eligible=true` (Formula D.2), VÀ (b)
1 lời gọi tap-trigger từ Core UI #15 (mock — entrypoint KHÔNG tự chuyển
state chỉ vì D.2 vừa đổi `true`, phải chờ tap) — không setter/trigger
nào khác (timer, hệ khác ngoài Turn Manager + Death & Consequence, hay
UI gọi thẳng bỏ qua điều kiện (a)) có thể ép chuyển state này. GIVEN
`eligible=true` NHƯNG mock tap chưa gọi, WHEN kiểm state, THEN VẪN
`Idle` (regression cho bug cross-GDD đã tìm thấy round 1). *(unit,
interface inspection)*

**AC-02** (Rule #2 — 3 lối hiển thị, đúng 2 lối khóa, chỉ Chơi lại xử
lý thật; **sửa 2026-08-09** bỏ tham chiếu nhãn text đã gỡ): GIVEN state
`Awaiting Continuation Choice`, WHEN truy vấn danh sách lối tiếp tục,
THEN trả về đúng 3 lối (Quỷ tu, Chuyển sinh, Chơi lại); Quỷ tu và
Chuyển sinh có `locked=true` (interface KHÔNG có field text nhãn nào —
trạng thái khóa truyền đạt thuần bằng UI hình ảnh, xem Visual/Audio),
Chơi lại có `locked=false`. GIVEN người chơi chọn "Chơi lại", WHEN xử
lý lựa chọn, THEN chuyển `Awaiting Continuation Choice → Processing
Chơi Lại`. *(unit)*

**AC-03** (Rule #3 — không giới hạn thời gian chọn, không
auto-timeout/default): GIVEN state `Awaiting Continuation Choice`,
WHEN mô phỏng trôi qua khoảng thời gian/số lượt tùy ý mà không có
input người chơi (test với ít nhất 2 giá trị lớn, VD 100 và 10.000),
THEN state VẪN `Awaiting Continuation Choice` — không auto-transition,
không lối nào được tự chọn mặc định; Turn Manager KHÔNG được gọi để
sinh gợi ý hành động trong suốt khoảng đó (spy đếm=0). *(unit + spy)*

**AC-04** (Rule #4 — giữ nguyên bối cảnh danh tác, nhân vật mới hoàn
toàn theo mẫu MVP, không character creator): GIVEN người chơi chọn
"Chơi lại" từ setting pack X hiện hành, WHEN `Processing Chơi Lại`
khởi tạo, THEN slot mới giữ đúng `setting_pack_id=X` (không đổi, không
reset); nhân vật mới khởi tạo đúng mẫu chuẩn MVP (stats/skill/trang bị
cố định theo template, không nhận tham số tùy chỉnh nào từ input người
chơi); không có lời gọi nào tới flow chọn bối cảnh/character-creator
(mock, spy đếm=0). *(unit + spy)*

**AC-05a** (Rule #5 — Persistence trigger ownership, ĐÚNG 1 thao tác;
**sửa 2026-08-09**, đảo ngược sửa trước — "Khóa slot" không còn thuộc
hệ này): GIVEN người chơi chọn "Chơi lại", WHEN `Processing Chơi Lại`
chạy LẦN ĐẦU, THEN Character Continuation gọi ĐÚNG 1 thao tác
Persistence: "Tạo slot mới" (spy đếm=1, mock Persistence) — KHÔNG gọi
"Khóa slot" (spy đếm=0, thao tác đó đã xong từ trước tại
`death_confirmed`). *(unit + spy)*

**AC-05b** (Rule #5 — Death & Consequence sở hữu "Khóa slot", KHÔNG
phải hệ này; tách từ AC-05 gốc để chẩn đoán rõ khi CI fail): GIVEN mock
Death & Consequence phát `death_confirmed`, WHEN kiểm spy Persistence
NGAY sau đó (trước khi Character Continuation vào `Awaiting
Continuation Choice`), THEN "Khóa slot" đã được gọi ĐÚNG 1 lần (spy
đếm=1) bởi Death & Consequence — đóng đúng điểm quy thuộc đã sửa ở
`persistence-save-system.md` và `death-and-consequence.md` Nhánh A
bước c. *(integration test, spy call-owner)*

**AC-06** (Rule #6 — lazy-init đồng loạt, đúng target = nhân vật/slot
MỚI; **sửa 2026-08-09** — đóng 1 blocking: mock gốc không parameterize
theo tham số nên PASS ngay cả khi implementation đọc nhầm `char_id`/
`slot_id` CŨ, làm rỗng chính tuyên bố "không hệ nào mang giá trị đọc từ
playthrough cũ"; nay dùng kỹ thuật "dirty old slot first" — đúng cách
`death-and-consequence.md` AC-36 đã làm): GIVEN 2 bộ mock riêng biệt
cho MỖI hệ trong 5 hệ (EXP & Realm Progression, NPC Affinity &
Relationship, Setting & Canon Integration, Death & Consequence,
Equipment & Skill Data System): mock trả `ok(s)=0` (hoặc giá trị KHÁC
default, VD `level=30` thay vì `1`) khi được truy vấn với
`char_id`/`slot_id` CŨ (đã "làm bẩn" trước — mô phỏng dữ liệu còn sót
của playthrough vừa chết), và trả `ok(s)=1`/giá trị default CHỈ khi
truy vấn với `char_id`/`slot_id` MỚI (chưa từng thấy); WHEN `Processing
Chơi Lại` vừa khởi tạo `char_id`/`slot_id` MỚI và D.1 truy vấn `ok(s)`
của từng hệ bằng cách ĐỌC trạng thái hiện tại (KHÔNG gọi bất kỳ hàm
reset tường minh nào — đúng thiết kế lazy-init đã xác nhận ở
`death-and-consequence.md` AC-13/AC-36), THEN D.1 PHẢI truy vấn ĐÚNG
bằng `char_id`/`slot_id` MỚI ở CẢ 5 hệ (nếu implementation lỡ dùng ID
CŨ ở bất kỳ hệ nào, mock hệ đó trả `ok=0` → `handoff_allowed=0` → test
FAIL, bắt đúng lỗi) → kết quả cuối cả 5 hệ đều trả `ok(s)=1` — không hệ
nào mang giá trị đọc từ playthrough cũ (nay CHỨNG MINH được, không chỉ
giả định). *(unit, provisional-interface — post-condition có phân
biệt tham số, không spy call-count)*

**AC-07** (Rule #6 — kết quả đọc lại sau reset khớp đúng danh sách Core
Rule #6): GIVEN mock 5 hệ trả kết quả cụ thể sau reset: `level=1,
EXP=0`; Hảo cảm mọi NPC = preset mặc định setting pack; mọi
`canon_event_*_status` = `Dormant`/`Pending` gốc; `alive=true,
death_and_consequence_blocked=false`; `known_skill_ids`/
`equipped_weapon_id` = loadout khởi điểm mẫu chuẩn MVP, WHEN đọc lại
state nhân vật mới NGAY SAU reset, THEN mọi giá trị khớp CHÍNH XÁC
danh sách trên. *(unit, regression — chốt field-list Core Rule #6)*

**AC-08** (Rule #7 — bàn giao lại Turn Manager, không tiếp nối ngữ
cảnh lượt chết): GIVEN `handoff_allowed=1` (D.1) vừa đạt được, WHEN
`Processing Chơi Lại → New Playthrough Started`, THEN quyền điều khiển
trả về Turn Manager (mock, spy đếm=1) ở `slot_id` MỚI, state `Awaiting
Action`; gợi ý hành động mở đầu được sinh (spy đếm=1) với tham số ngữ
cảnh KHÔNG mang `turn_id`/nội dung nào của lượt vừa chết. *(unit + spy)*

### Formulas

**D.1 — reset_completeness_check**

**AC-09** (ca thường N=5, tất cả `ok=1`, khớp ví dụ GDD): GIVEN N=5 hệ
mock đều trả `ok(s)=1`, WHEN tính `reset_completeness_check`, THEN
`completeness_ratio=1.0`, `reset_complete=1`, `handoff_allowed=1` →
chuyển `New Playthrough Started`. *(unit, regression neo số)*

**AC-10** (1 hệ `ok=0`, khớp ví dụ GDD, chặn bàn giao): GIVEN N=5, 4 hệ
trả `ok=1`, 1 hệ (VD NPC Affinity) trả `ok=0`, WHEN tính, THEN
`completeness_ratio=0.8`, `reset_complete=0`, `handoff_allowed=0` →
chuyển `Reset Failed` (`reset_failed_reason="state_reset_error"`),
hiển thị lỗi; Turn Manager handoff (Rule #7) KHÔNG được gọi (spy
đếm=0). *(unit, regression neo số + spy)*

**AC-11** (boundary N=0, lỗi cấu hình — KHÔNG crash khi log chẩn đoán;
**sửa 2026-08-09** mở rộng đáng kể, đóng 1 blocking: bản gốc chỉ assert
`handoff_allowed`, không assert đường tính `completeness_ratio` an
toàn): GIVEN N=0 (danh sách hệ ràng buộc rỗng — lý thuyết khó đạt được
qua vận hành bình thường với thiết kế N tĩnh hiện tại, nhưng test biên
vẫn giữ để khóa hành vi fail-closed, nhất quán `bundle_completeness_check`),
WHEN tính `handoff_allowed`, THEN = `0` BẤT KỂ `reset_complete` (theo
đúng định nghĩa `handoff_allowed = reset_complete AND (N≥1)`,
short-circuit — `reset_complete` KHÔNG được evaluate khi N=0). WHEN hệ
ghi log/hiển thị chẩn đoán cho `Reset Failed` ở nhánh này, THEN
`completeness_ratio` KHÔNG được tính trực tiếp qua công thức gốc
`(1/N)×Σok(s)` (tránh chia cho 0) — trả sentinel `0` theo guard đã thêm
ở D.1; không exception. THEN `reset_failed_reason =
"configuration_error"` (giá trị thứ 3, phân biệt rõ với
`state_reset_error`/`persistence_error`). *(unit, boundary —
configuration-error guard + no-crash)*

**AC-12** (nhiều hệ `ok=0` cùng lúc, không có "bàn giao một phần"):
GIVEN N=5, 2 hệ trả `ok=0`, WHEN tính, THEN `completeness_ratio=0.6`,
`handoff_allowed=0` — CHẶN TOÀN BỘ bàn giao, không có khái niệm bàn
giao một phần cho 3 hệ đã `ok`. *(unit)*

**AC-13** (Reset Failed do `state_reset_error` → retry TÁI DÙNG đúng
`slot_id`, KHÔNG gọi lại "Tạo slot mới"; **sửa 2026-08-09** chỉ còn 1
thao tác để retry): GIVEN state `Reset Failed` với
`reset_failed_reason="state_reset_error"` (`slot_id=X` đã tạo thành
công ở AC-05a), WHEN người chơi chọn "Thử lại", THEN `Processing Chơi
Lại` chạy lại CHỈ bước reset trạng thái (Core Rule #6) vào ĐÚNG
`slot_id=X` — Persistence "Tạo slot mới" KHÔNG được gọi lại (spy
đếm=0 ở lần retry này; "Khóa slot" không liên quan nhánh này, đã xong
từ trước); D.1 tính lại với `ok(s)` mock lần 2 toàn bộ=1 →
`handoff_allowed=1` → `New Playthrough Started` ở `slot_id=X`. *(unit +
spy — retry same-slot)*

**D.2 — continuation_choice_eligible**

**AC-14** (ma trận đầy đủ 4 tổ hợp, chỉ TT chuyển state — điểm neo
chính): GIVEN 4 tổ hợp `(is_death_turn, death_confirmed)` =
(T,T)/(T,F)/(F,T)/(F,F), WHEN tính `continuation_choice_eligible`,
THEN kết quả lần lượt = 1/0/0/0 — CHỈ (T,T) → chuyển `Idle → Awaiting
Continuation Choice`; 3 tổ hợp còn lại → `eligible=0`, state GIỮ
NGUYÊN `Idle`. *(unit, boundary matrix)*

**AC-15** (trường hợp biên phòng thủ 2 lớp — chỉ 1 flag true, log lỗi
đồng bộ): GIVEN 2 tổ hợp lệch (T,F) và (F,T) từ AC-14, WHEN
`eligible=0`, THEN hệ log như lỗi đồng bộ giữa Turn Manager và Death &
Consequence (mock logger, spy đếm=1 mỗi tổ hợp) — không throw
exception, không crash, chỉ dừng lại ở `Idle`. *(unit, defensive edge
case)*

### Edge Cases

**AC-16** (đóng trình duyệt giữa lúc `Awaiting Continuation Choice`,
không có state phục hồi riêng): GIVEN hệ này không đăng ký bất kỳ
save-blob nào cho state transient `Awaiting Continuation Choice`, WHEN
kiểm tra bề mặt API/đăng ký Persistence, THEN xác nhận KHÔNG có
field/blob nào tồn tại cho việc này. **Giới hạn**: AC này chỉ xác nhận
hệ này KHÔNG sở hữu cơ chế phục hồi (absence-of-state) — hành vi màn
hình chọn slot sau đó thuộc phạm vi `persistence-save-system.md`.
*(unit, interface inspection + scope note)*

**AC-17** (cố chọn Quỷ tu/Chuyển sinh bị từ chối): GIVEN state
`Awaiting Continuation Choice`, WHEN người chơi gửi lựa chọn Quỷ tu
HOẶC Chuyển sinh (kể cả qua input tự do bỏ qua UI khóa, gọi thẳng
handler), THEN hành động bị TỪ CHỐI — state GIỮ NGUYÊN `Awaiting
Continuation Choice`; không thao tác Persistence nào được gọi (spy
đếm=0); không exception. *(unit + spy)*

**AC-18** (Reset Failed do `persistence_error` → retry gọi lại TỪ ĐẦU
"Tạo slot mới", KHÁC nhánh AC-13; **sửa 2026-08-09** chỉ còn 1 thao
tác): GIVEN state `Reset Failed` với
`reset_failed_reason="persistence_error"` (CHƯA có slot mới nào tạo
thành công), WHEN người chơi chọn "Thử lại", THEN `Processing Chơi
Lại` gọi lại "Tạo slot mới" (spy đếm=1 ở lần retry này) — "Khóa slot"
KHÔNG liên quan (đã xong từ trước, không thuộc phạm vi retry của hệ
này) — khớp Core Rule #5, đối chứng trực tiếp với AC-13 (nhánh
`state_reset_error` không gọi lại "Tạo slot mới"). GIVEN retry liên
tiếp đạt `max_write_retry_before_escalation` lần cùng
`reset_failed_reason="persistence_error"`, THEN banner lỗi expose
thêm 1 action `tap_back_to_slots` khả dụng (mock UI state — không
BẮT BUỘC người chơi dùng, "Thử lại" vẫn hoạt động bình thường). *(unit
+ spy — retry from scratch)*

**AC-19** (phân biệt lỗi tầng Persistence với lỗi reset trạng thái
D.1): GIVEN 2 kịch bản lỗi riêng biệt: (a) mock Persistence "Tạo slot
mới" trả lỗi tầng lưu trữ (VD `QuotaExceededError`) TRƯỚC khi D.1 kịp
chạy; (b) "Tạo slot mới" thành công nhưng D.1 trả `handoff_allowed=0`,
WHEN cả 2 kịch bản đều chuyển `Reset Failed`, THEN `reset_failed_reason`
phân loại ĐÚNG: (a) = `"persistence_error"`, (b) = `"state_reset_error"`
— KHÔNG chỉ khác nhau ở chuỗi text hiển thị. *(unit, regression —
error-source classification)*

**AC-20** (Undo đã bị chặn ở tầng Turn Manager, hệ này không có đường
vòng — behavioral, không chỉ interface-absence; **sửa 2026-08-09**,
đóng gap: bản gốc chỉ soi TÊN HÀM, dễ bị qua mặt bởi 1 dispatcher tổng
quát ẩn logic Undo bên trong): GIVEN state `Awaiting Continuation
Choice`, WHEN gọi Undo qua MỌI entrypoint public đang expose của hệ
này (enumerate từ AC-01's interface list), THEN với MỖI entrypoint:
hoặc route đó không tồn tại (not-callable), hoặc nếu tồn tại thì lời
gọi bị từ chối/no-op — state GIỮ NGUYÊN `Awaiting Continuation Choice`,
Turn Manager KHÔNG được gọi (spy đếm=0), Persistence KHÔNG được gọi
(spy đếm=0). **Giới hạn**: AC này chỉ chứng minh hệ này không CHỦ ĐỘNG
mở đường cho Undo qua bề mặt API đang biết của chính nó — không chứng
minh không có handler ẩn nào bỏ qua interface (cùng giới hạn như
AC-16). *(unit + spy, behavioral)*

**AC-21** (retry sau Reset Failed không giới hạn số lần, không
cooldown): GIVEN state `Reset Failed`, WHEN người chơi gọi "Thử lại" N
lần liên tiếp (test N≥5), mỗi lần mock D.1 trả `handoff_allowed=0` cho
tới lần cuối trả `handoff_allowed=1`, THEN mỗi lần gọi được xử lý ngay
lập tức (không bị chặn vì "quá số lần thử", không cooldown/delay bắt
buộc), và lần cuối thành công chuyển `New Playthrough Started` bình
thường (khớp AC-13). *(unit — retry limit absence)*

## Open Questions

| Question | Owner | Deadline | Resolution |
|----------|-------|----------|-----------|
| ~~Hợp đồng "fresh-init default" (D.1's `ok(s)`) chưa được hình thức hóa~~ — **đã quyết 2026-08-05** (cụm G `/design-review` gộp 11 GDD): LAZY-INIT đồng loạt, không cần interface `reset_to_fresh_init` tường minh — mỗi hệ trong N tự trả về default khi gặp `char_id`/`slot_id` mới (D.1's `ok(s)` sửa lại theo hướng này; AC-06 sửa từ spy call-count sang post-condition check). | systems-designer | — | **Đã đóng** |
| `persistence-save-system.md` AC-05 chỉ test tính duy nhất `slot_id` + bất biến slot cũ khi "Chơi lại" — KHÔNG test việc "Bắt đầu mới" (thủ công) giữ nguyên `setting_pack_id` hiện hành giống cách Core Rule #4 của hệ này làm với "Chơi lại" (liên quan Edge Case #1 — đóng trình duyệt giữa chừng, người chơi tự chọn "Bắt đầu mới"). Ở MVP chỉ có 1 setting pack (`game-concept.md`) nên 2 hành vi cho ra kết quả giống hệt nhau — gap MOOT tại MVP, chỉ trở thành rủi ro thật khi Alpha mở khóa >1 setting pack. | qa-lead | **trước khi Alpha mở khóa >1 setting pack** (re-scope 2026-08-09, không còn "trước khi hệ này Approved" — không blocking round này) | Chưa quyết — bổ sung 1 AC ở `persistence-save-system.md` khi tới hạn |
| ~~**[MỚI 2026-08-09, BLOCKING trước khi hệ này Approved]** 4/5 hệ downstream trong N chưa có bất kỳ AC/cam kết lazy-init theo `char_id`/`slot_id` nào~~ — **đã giải quyết 2026-08-10** (`/design-review` round 2, narrow verify pass): đóng bằng 2 kỹ thuật khác nhau theo lớp hệ (xem D.1 "Cơ chế xác nhận" sửa cùng ngày) — Lớp A (`char_id` mới mỗi playthrough): EXP & Realm Progression `AC-49`, Equipment & Skill Data System `AC-18` (kỹ thuật "dirty old slot first" gốc, áp dụng đúng nghĩa đen). Lớp B (ID cố định `npc_id`/`event_id`, không đổi giữa playthrough): NPC Affinity & Relationship `AC-39`, Setting & Canon Integration `AC-49` (kỹ thuật "container rebind sang blob slot mới" — KHÔNG đổi schema/key của 2 GDD đó, `creative-director` bác bỏ đề xuất ban đầu của `systems-designer` là thêm `slot_id` vào key sau khi grep xác nhận storage đã namespace theo slot ở tầng Persistence). | systems-designer, creative-director | — | **Đã đóng** |
| **[MỚI 2026-08-10, KHÔNG BLOCKING — phát hiện ngoài phạm vi vòng 1]** Situation/Encounter Generation (hệ #11) có ít nhất 3 tracker per-NPC runtime (`last_used`, `provoked_flag`, `npc_last_initiated[hostile/friendly]`) cùng lớp rủi ro với NPC Affinity/Setting & Canon (Lớp B — ID `npc_id` cố định, không reset khi "Chơi lại" nếu container không rebind theo slot) — hệ này KHÔNG nằm trong N=5 hiện tại của D.1. **Cố ý HOÃN xử lý vòng này**: `situation-encounter-generation.md` đang ở trạng thái tranh chấp chưa giải quyết từ phiên trước (1 subagent tự ý ghi trực tiếp + bịa review log giả mạo tuyên bố phê duyệt của user chưa từng xảy ra — xem `production/session-state/active.md` đầu phiên) — user chọn KHÔNG chạm vào file đó cho tới khi tranh chấp được xử lý riêng. N giữ nguyên =5 cho tới lúc đó. | systems-designer, sau khi hệ #11 được review lại | sau khi hệ #11 được review lại (re-scope 2026-08-11 — cột này trước đó ghi nhầm "trước khi hệ này Approved", mâu thuẫn với nhãn "KHÔNG BLOCKING" ở đầu dòng; user xác nhận đây không phải điều kiện chặn Approved của `character-continuation.md`) | Chưa quyết — cần xử lý tranh chấp #11 trước, rồi mới thêm N=6 + AC container-rebind tương tự |
| Nội dung tường thuật 1-2 dòng cho Quỷ tu/Chuyển sinh (locked, MVP) — ai viết, khi nào; ràng buộc: CHỈ diễn đạt tâm trạng/chủ đề trừu tượng (VD "động lực đen tối", "danh tính mới mang dư âm" — đúng Player Fantasy), KHÔNG nêu chi tiết cơ chế/tên hệ thống cụ thể, tránh ràng buộc ngầm thiết kế Vertical Slice sau này. | narrative-director (chỉ đạo) + writer (thực thi) | trước Pre-Production / khi `/ux-design` màn này chạy | Chưa quyết |
| Copy-tone diegetic cụ thể cho thông báo "Reset Failed" (VD "trang chưa kịp khô, thử lại") — thay ngôn ngữ kỹ thuật trần trụi ("hết dung lượng lưu trữ") bằng giọng "Mực Chưa Khô" nhất quán toàn game; có/không 1 nhịp dừng trước khi lỗi hiện (tránh phá vỡ khoảnh khắc cảm xúc ngay sau event 1-2). | narrative-director + ux-designer | khi `/ux-design` màn này chạy | Chưa quyết |
