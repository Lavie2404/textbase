# Character Continuation

> **Status**: Designed — Pending Review
> **Author**: user + agents
> **Last Updated**: 2026-08-03
> **Implements Pillar**: Pillar 2 (Hệ Quả Thực Sự), Pillar 3 (Sức Mạnh Có Logic)
> **Creative Director Review (CD-GDD-ALIGN)**: Skipped — Lean mode (not a PHASE-GATE)

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

*(Ghi chú: `creative-director` không được tham vấn — chế độ review
`lean` chỉ bắt buộc spawn cho Section D và H.)*

Đây là khoảnh khắc người chơi cảm nhận trực tiếp và mạnh nhất trong
toàn bộ game — không phải nỗi sợ (cái chết đã xảy ra, không thể thương
lượng), mà là một câu hỏi thật: "câu chuyện này còn ý nghĩa gì để kể
tiếp?" Ba lối đi không phải ba mức độ "hình phạt nhẹ hơn" — chúng là ba
CÂU CHUYỆN khác nhau về cùng một mất mát: Quỷ tu là chọn để cái chết
biến thành động lực đen tối; Chuyển sinh là chọn để bắt đầu một danh
tính mới nhưng mang theo dư âm; Chơi lại là chọn đóng hẳn một chương và
mở trang trắng, không giả vờ nó chưa từng xảy ra (Persistence giữ
nguyên playthrough cũ như một "quyển nhật ký đã khép", không xóa).
Đúng tinh thần Pillar 2 (Hệ Quả Thực Sự): không có nút "undo cuộc đời",
chỉ có cách viết tiếp.

## Detailed Design

*(Lean mode: Section C không bắt buộc spawn specialist — chỉ D và H.)*

### Core Rules

1. **Điều kiện kích hoạt**: hệ này chuyển sang trạng thái "Awaiting
   Continuation Choice" (xem States) CHỈ KHI CẢ HAI điều kiện cùng đúng
   trong 1 lượt: Turn Manager đã khóa `undo_available=false` vĩnh viễn
   qua `is_death_turn=true` (Core Rule #9), VÀ Death & Consequence đã
   phát tín hiệu `death_confirmed`. Không có đường kích hoạt nào khác.

2. **3 lối tiếp tục, đúng 1 lối khả dụng ở MVP**: màn hình hiển thị đủ
   3 lựa chọn (Quỷ tu, Chuyển sinh, Chơi lại) đúng tinh thần "lưới an
   toàn" của `game-concept.md`, nhưng **Quỷ tu và Chuyển sinh bị khóa**
   (hiển thị nhãn "Sắp ra mắt", không bấm được) ở phạm vi MVP — quyết
   định phạm vi đã khóa (`systems-index.md` Priority Tiers). Chỉ "Chơi
   lại" xử lý được hành động thật.

3. **Không có giới hạn thời gian chọn**: người chơi có thể ở trạng thái
   "Awaiting Continuation Choice" bao lâu tùy ý — không auto-timeout,
   không mặc định tự chọn lối nào. Nhất quán với trọng lượng cảm xúc
   của khoảnh khắc này (Player Fantasy).

4. **"Chơi lại" giữ nguyên bối cảnh danh tác, tạo nhân vật MỚI hoàn
   toàn**: KHÔNG quay lại màn hình chọn bối cảnh (danh tác giữ nguyên,
   VD Đấu La Đại Lục) — chỉ khởi tạo lại đúng nhân vật chính mẫu chuẩn
   MVP (`game-concept.md` Required #1: "1 nhân vật chính đầy đủ chỉ
   số/kỹ năng/trang bị", KHÔNG có character creator tùy chỉnh ở MVP)
   trong một playthrough hoàn toàn độc lập.

5. **"Chơi lại" kích hoạt CHÍNH XÁC 2 thao tác Persistence đã định
   nghĩa sẵn, ĐÚNG 1 LẦN mỗi lần kích hoạt** (`persistence-save-system.md`,
   Approved): "Khóa slot" (slot hiện tại, đã có lượt `is_death_turn=true`,
   chuyển read-only) rồi "Tạo slot mới" (slot_id mới, độc lập hoàn
   toàn) — gọi NGAY KHI vào state `Processing Chơi Lại` lần đầu, KHÔNG
   gọi lại nếu bước reset trạng thái (Core Rule #6) thất bại sau đó và
   người chơi thử lại (xem Edge Cases — retry tái dùng đúng `slot_id`
   vừa tạo, không tạo thêm slot mới, không để lại slot dở dang). Chỉ
   khi CHÍNH thao tác Persistence này thất bại (lỗi tầng lưu trữ, VD
   quota đầy) thì retry mới gọi lại từ đầu (cả 2 thao tác Persistence).
   Character Continuation là hệ TRIGGER chính thức 2 thao tác này —
   không phải Death & Consequence (sửa lại điểm quy thuộc chưa chính
   xác ở `persistence-save-system.md`, xem Dependencies).

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
| Idle | Trạng thái mặc định, không áp dụng (game đang chạy bình thường) | → Awaiting Continuation Choice (khi Core Rule #1 thỏa) |
| Awaiting Continuation Choice | Màn hình 3 lối hiển thị, chờ người chơi — Turn Manager KHÔNG hoạt động (không gợi ý hành động, không lượt mới) | → Processing Chơi Lại (khi chọn Chơi lại) — Quỷ tu/Chuyển sinh không khả dụng ở MVP |
| Processing Chơi Lại | Gọi Persistence "Khóa slot" rồi "Tạo slot mới", khởi tạo lại trạng thái mọi hệ (Core Rule #6) | → New Playthrough Started (khi `reset_completeness_check`/D.1 = `handoff_allowed=1`) HOẶC → Reset Failed (khi `handoff_allowed=0`) |
| New Playthrough Started | Bàn giao lại cho Turn Manager, trạng thái "Awaiting Action" ở slot mới | → [Ngoài phạm vi hệ này, Turn Manager tiếp quản] |
| Reset Failed | Ít nhất 1 hệ chưa xác nhận đạt fresh-init default (D.1) — CHẶN bàn giao, hiển thị lỗi cho người chơi, KHÔNG trả quyền điều khiển về Turn Manager | → Processing Chơi Lại (người chơi thử lại thao tác "Chơi lại") |

### Interactions with Other Systems

- **Death & Consequence** (upstream, hard) — nhận tín hiệu
  `death_confirmed` — nguồn kích hoạt duy nhất của hệ này.
- **Turn Manager** (upstream+downstream, hard) — ĐỌC `is_death_turn=true`
  đã khóa (điều kiện kích hoạt kèm theo); CUNG CẤP quyền điều khiển trở
  lại Turn Manager ("Awaiting Action") ở slot mới sau khi "Chơi lại"
  hoàn tất.
- **Persistence/Save System** (downstream, hard) — TRIGGER trực tiếp 2
  thao tác "Khóa slot" + "Tạo slot mới" đã định nghĩa sẵn (sửa lại
  điểm quy thuộc: GDD đó hiện ghi "Death & Consequence" kích hoạt,
  đúng ra là hệ này — footnote ở Dependencies).
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
- **Character Card & Identity** (downstream, soft, chưa thiết kế) — sẽ
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
completeness_ratio(reset) = (1/N) × Σ(s=1→N) ok(s)
reset_complete(reset) = 1 nếu completeness_ratio(reset) = 1, ngược lại 0
handoff_allowed(reset) = reset_complete(reset) AND (N ≥ 1)
```

`ok(s) = 1` nếu hệ `s` xác nhận đã đạt trạng thái khởi tạo mới đã định
nghĩa (fresh-init default) của CHÍNH NÓ, ngược lại `0`.

**Variables:**

| Variable | Symbol | Type | Range | Description |
|----------|--------|------|-------|-------------|
| Số hệ bị Core Rule #6 ràng buộc reset | `N` | int | ≥1 (0 = lỗi cấu hình) | Danh sách mở — hiện tại tối thiểu: EXP & Realm Progression, NPC Affinity & Relationship, Setting & Canon Integration, Death & Consequence (`alive`, `death_and_consequence_blocked`), Equipment & Skill Data System |
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
| Kết quả | `continuation_choice_eligible(turn)` | bool | {0,1} | 1 khi hệ này được phép chuyển `Idle → Awaiting Continuation Choice` |

**Output Range**: boolean. Theo thiết kế nguồn, 2 flag input LUÔN được
khóa cùng lúc trong cùng 1 bước xử lý của Death & Consequence (AC-06
GDD đó) — công thức này tồn tại như **invariant phòng thủ 2 lớp giữa 2
hệ độc lập**, không phải bộ lọc case thường gặp.

**Example**: lượt 47, `is_death_turn=true`, `death_confirmed=true` →
`eligible=1` → chuyển state. **Trường hợp biên** (không nên xảy ra qua
luồng bình thường, nhưng công thức phải xử lý được nếu có bug đồng bộ
giữa Turn Manager và Death & Consequence): chỉ 1 trong 2 = true →
`eligible=0` — hệ này KHÔNG chuyển state, ở lại `Idle`, log như lỗi
đồng bộ.

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
  Choice` mà chưa chọn gì**: KHÔNG có cơ chế phục hồi trạng thái này
  riêng — `is_death_turn=true` đã được Persistence auto-save (Turn
  Confirmed) và khóa slot cũ thành read-only TRƯỚC khi màn hình 3 lối
  hiện ra. Khi mở lại game, người chơi thấy màn hình chọn slot với
  slot cũ đã khép; chọn "Bắt đầu mới" thủ công từ đó (Persistence, đã
  Approved) — về mặt kết quả GIỐNG HỆT việc chọn "Chơi lại" (cùng bối
  cảnh danh tác, cùng loadout khởi điểm) — không cần hệ này tự lưu lại
  trạng thái "đang chờ chọn".
- **Nếu người chơi cố chọn Quỷ tu hoặc Chuyển sinh** (qua input tự do,
  bỏ qua UI khóa): hành động bị từ chối, không đổi state — hiển thị
  lại thông báo "Sắp ra mắt", vẫn ở `Awaiting Continuation Choice`.
  Không phải lỗi, chỉ là 1 lựa chọn chưa khả dụng.
- **Nếu `reset_completeness_check` (D.1) cho `handoff_allowed=0`**
  (lỗi Ở BƯỚC RESET TRẠNG THÁI, slot đã tạo thành công): chuyển `Reset
  Failed` (`reset_failed_reason="state_reset_error"`) — CHẶN bàn giao
  Turn Manager, hiển thị lỗi. Khi người chơi "Thử lại": hệ TÁI DÙNG
  ĐÚNG `slot_id` vừa tạo (KHÔNG gọi lại "Khóa slot"/"Tạo slot mới" —
  đã gọi đủ 1 lần theo Core Rule #5), chỉ chạy lại bước reset trạng
  thái (Core Rule #6) vào slot đó — không có slot dở dang nào bị bỏ
  lại, không cần Persistence lọc slot chưa hoàn tất khỏi màn hình chọn
  slot.
- **Nếu bản thân thao tác Persistence "Tạo slot mới" thất bại** (khác
  với D.1 — đây là lỗi tầng lưu trữ, VD quota trình duyệt đầy, xảy ra
  TRƯỚC KHI bất kỳ bước reset trạng thái nào chạy): chuyển `Reset
  Failed` (`reset_failed_reason="persistence_error"`) với thông báo cụ
  thể hơn ("hết dung lượng lưu trữ"). Khi người chơi "Thử lại": vì
  CHƯA có slot nào được tạo thành công, hệ gọi lại TỪ ĐẦU cả 2 thao
  tác Persistence (Core Rule #5) — khác với nhánh `state_reset_error`
  ở trên.
- **Nếu người chơi cố gọi Undo trong lúc `Awaiting Continuation
  Choice`**: đã bị chặn ở tầng Turn Manager (Core Rule #9,
  `is_death_turn=true` khóa `undo_available=false` vĩnh viễn) — hệ này
  không cần enforcement riêng, chỉ xác nhận hành vi thừa hưởng đúng.
- **Nếu người chơi thử lại "Chơi lại" nhiều lần liên tiếp sau `Reset
  Failed`**: mỗi lần thử là một lượt gọi độc lập tới `Processing Chơi
  Lại` — không có giới hạn số lần thử, không cooldown (lỗi ở đây luôn
  là lỗi kỹ thuật/bug, không phải cơ chế gameplay cần chống spam).

## Dependencies

| System | Direction | Nature of Dependency | Hard/Soft |
|---|---|---|---|
| Death & Consequence (Designed) | Hệ này phụ thuộc | Tín hiệu `death_confirmed` — nguồn kích hoạt duy nhất | Hard |
| Turn Manager (Approved) | 2 chiều | ĐỌC `is_death_turn=true` (điều kiện kích hoạt); CUNG CẤP quyền điều khiển trở lại ("Awaiting Action") ở slot mới sau khi hoàn tất | Hard |
| Persistence/Save System (Approved) | Hệ này phụ thuộc | TRIGGER trực tiếp "Khóa slot" + "Tạo slot mới" — hệ này là chủ sở hữu trigger thật (sửa lại điểm quy thuộc chưa chính xác tại `persistence-save-system.md`, đã sửa cùng phiên) | Hard |
| Setting & Canon Integration (Designed) | Hệ này phụ thuộc (mềm) | Reset event states về `Dormant`/`Pending` gốc cho playthrough mới | Soft — cơ chế reset cụ thể thuộc hệ đó |
| NPC Affinity & Relationship (Designed) | Hệ này phụ thuộc (mềm) | Reset Hảo cảm mọi NPC về preset mặc định setting pack | Soft |
| EXP & Realm Progression (Designed) | Hệ này phụ thuộc (mềm) | Khởi tạo `level=1`, `EXP=0` cho nhân vật mới | Soft |
| Equipment & Skill Data System (Approved) | Hệ này phụ thuộc (mềm) | Khởi tạo `known_skill_ids`/`equipped_weapon_id` về loadout khởi điểm mẫu chuẩn MVP | Soft |
| Character Card & Identity (chưa thiết kế, hệ #14) | Card phụ thuộc hệ này | Hiển thị màn hình 3 lối tiếp tục (UI component) | Hard (chiều ngược) |

## Tuning Knobs

Hệ này không có tuning knob nào cần thiết. D.1
(`reset_completeness_check`) và D.2 (`continuation_choice_eligible`)
là invariant boolean thuần túy — không có ngưỡng/hệ số nào để cân bằng
gameplay. `N` (số hệ bị ràng buộc reset ở D.1) là một con số PHÁI SINH
từ số hệ đã đăng ký, không phải giá trị designer chỉnh tay. Không có
timer, không có xác suất, không có curve nào trong toàn bộ hệ — nhất
quán với quy mô S (1 phiên thiết kế) đã ước tính ở `systems-index.md`.

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
| **2. Hiển thị 3 lối (Awaiting Continuation Choice)** | "Chơi lại": khung con dấu mực đậm, khép kín hoàn chỉnh, có phản hồi hover/tap (mực loang nhẹ). "Quỷ tu"/"Chuyển sinh": nét phác thảo mỏng màu than nhạt, khung mực loang CHƯA khép kín ("trang chưa viết", không phải "nút tắt"); nhãn "Sắp ra mắt" viết tay bằng mực mảnh, không dùng ribbon/badge/icon khóa. Mỗi lối kèm 1-2 dòng mô tả tường thuật ngắn để không đọc như chỗ trống lấp đầy. | Tùy chọn: tiếng sột soạt giấy rất nhẹ khi 3 lối hiện ra. | BLOCKING (visual) / ADVISORY (audio) |
| **3. Người chơi cố chọn Quỷ tu/Chuyển sinh (bị từ chối)** | Nét phác thảo "rung" rất nhẹ một nhịp rồi trở về nguyên trạng (không đổi state) — không popup lỗi, không rung màn hình. | Không cần. | ADVISORY |
| **4. Xác nhận "Chơi lại" (Processing Chơi Lại)** | Trang xám tĩnh (event 1) trượt hẳn ra ngoài khung nhìn (biểu thị "đã cất, không xóa"); đồng thời trang giấy dó kem trơn, chưa có chữ, mở ra choán giữa khung hình. KHÔNG dựng "giá sách"/thư viện đầy đủ (thuộc phạm vi màn hình chọn slot, chưa thiết kế). | Tùy chọn: tiếng gấp trang rất nhẹ, khác âm "cộp" của D&C event 1. | BLOCKING (visual) / ADVISORY (audio) |
| **5. New Playthrough Started (bàn giao Turn Manager)** | Trang giấy trơn (event 4) bắt đầu hiện chữ đầu tiên — gợi ý hành động mở đầu — nhịp game bình thường, không hiệu ứng đặc biệt thêm. | Không cần. | ADVISORY |
| **6. Reset Failed (D.1 `handoff_allowed=0`)** | Thông báo lỗi hiển thị NGAY TRÊN trang giấy trơn đang mở dở, khung tường thuật chuẩn — chữ đen-xám, KHÔNG dùng đỏ son (lỗi kỹ thuật, không phải hậu quả cơ học vĩnh viễn). Nút "Thử lại" giữ đúng phong cách "Chơi lại" đã inked-in ở event 2. | Không cần. | ADVISORY |

## UI Requirements

| Information | Display Location | Update Frequency | Condition |
|---|---|---|---|
| Màn hình 3 lối tiếp tục | Toàn màn hình, thay thế luồng tường thuật bình thường | 1 lần/lần chết thật | Khi `continuation_choice_eligible=true` (D.2) |
| Trạng thái khóa Quỷ tu/Chuyển sinh + nhãn "Sắp ra mắt" | Trong màn hình 3 lối, gắn trực tiếp từng lối | Tĩnh (MVP) | Luôn hiện ở MVP |
| Mô tả tường thuật ngắn mỗi lối (1-2 dòng) | Trong màn hình 3 lối, dưới mỗi lối | Tĩnh, nội dung authoring | Luôn hiện |
| Thông báo lỗi "Reset Failed" + nút "Thử lại" | Chồng lên trang giấy trơn đang mở dở | Khi lỗi xảy ra | Chỉ khi `handoff_allowed=0` (D.1) |

*(Không tạo màn hình phức tạp mới — tái dùng đúng khung tường thuật/
Character Card đã có, đúng tinh thần "không phải HUD game".)*

📌 **UX Flag — Character Continuation**: Hệ này có màn hình UI riêng (3
lối tiếp tục). Ở Phase 4 (Pre-Production), chạy `/ux-design` cho màn
hình này trước khi viết epics — story liên quan nên trích
`design/ux/character-continuation.md` (hoặc gộp vào UX spec chung của
luồng tường thuật), không trích thẳng GDD này.

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

**Ghi chú test setup**: `N` (Formula D.1) cố định = 5 làm fixture cho
mọi AC dưới đây. Mọi AC dùng interface provisional (5 hệ downstream
soft, chưa có hợp đồng "reset-to-fresh-init" hình thức hóa) đánh dấu
"provisional-interface".

### Core Rules

**AC-01** (Rule #1 — duy nhất 1 đường kích hoạt, kiểm ở tầng
interface): GIVEN interface public của hệ này, WHEN kiểm tra bề mặt
API, THEN CHỈ tồn tại đúng 1 entrypoint nội bộ chuyển `Idle → Awaiting
Continuation Choice`, và entrypoint đó evaluate qua Formula D.2
(`continuation_choice_eligible`) — không setter/trigger nào khác (UI
gọi trực tiếp, timer, hệ khác ngoài Turn Manager + Death & Consequence)
có thể ép chuyển state này. *(unit, interface inspection)*

**AC-02** (Rule #2 — 3 lối hiển thị, đúng 2 lối khóa, chỉ Chơi lại xử
lý thật): GIVEN state `Awaiting Continuation Choice`, WHEN truy vấn
danh sách lối tiếp tục, THEN trả về đúng 3 lối (Quỷ tu, Chuyển sinh,
Chơi lại); Quỷ tu và Chuyển sinh có `locked=true` (nhãn "Sắp ra mắt"),
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

**AC-05** (Rule #5 — Persistence trigger ownership, đúng thứ tự, đúng
chủ sở hữu): GIVEN người chơi chọn "Chơi lại", WHEN `Processing Chơi
Lại` chạy LẦN ĐẦU, THEN Character Continuation gọi ĐÚNG 2 thao tác
Persistence theo thứ tự: "Khóa slot" TRƯỚC, "Tạo slot mới" SAU (spy
call-order, mock Persistence). GIVEN cùng test có mock Death &
Consequence, THEN xác nhận Death & Consequence KHÔNG gọi bất kỳ thao
tác Persistence nào (spy đếm=0) — đóng lại điểm quy thuộc đã sửa ở
`persistence-save-system.md`. *(integration test, spy call-order +
call-owner)*

**AC-06** (Rule #6 — hợp đồng gọi reset tới từng hệ trong N, đúng
target = nhân vật/slot MỚI): GIVEN `Processing Chơi Lại` đang khởi tạo
trạng thái mọi hệ, WHEN kiểm tra lời gọi reset tới 5 hệ (EXP & Realm
Progression, NPC Affinity & Relationship, Setting & Canon Integration,
Death & Consequence [`alive`/`death_and_consequence_blocked`],
Equipment & Skill Data System — mock/spy độc lập mỗi hệ), THEN mỗi hệ
nhận ĐÚNG 1 lời gọi reset-to-fresh-init-default cho `char_id`/`slot_id`
MỚI; không tham số nào của lời gọi mang giá trị đọc từ playthrough cũ.
*(unit + spy, provisional-interface)*

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

**AC-11** (boundary N=0, lỗi cấu hình): GIVEN N=0 (danh sách hệ ràng
buộc rỗng), WHEN tính `handoff_allowed`, THEN = `0` BẤT KỂ
`reset_complete` — theo đúng định nghĩa `handoff_allowed = reset_complete
AND (N≥1)`. *(unit, boundary — configuration-error guard)*

**AC-12** (nhiều hệ `ok=0` cùng lúc, không có "bàn giao một phần"):
GIVEN N=5, 2 hệ trả `ok=0`, WHEN tính, THEN `completeness_ratio=0.6`,
`handoff_allowed=0` — CHẶN TOÀN BỘ bàn giao, không có khái niệm bàn
giao một phần cho 3 hệ đã `ok`. *(unit)*

**AC-13** (Reset Failed do `state_reset_error` → retry TÁI DÙNG đúng
`slot_id`, KHÔNG gọi lại "Tạo slot mới"): GIVEN state `Reset Failed`
với `reset_failed_reason="state_reset_error"` (`slot_id=X` đã tạo
thành công ở AC-05), WHEN người chơi chọn "Thử lại", THEN `Processing
Chơi Lại` chạy lại CHỈ bước reset trạng thái (Core Rule #6) vào ĐÚNG
`slot_id=X` — Persistence "Khóa slot"/"Tạo slot mới" KHÔNG được gọi
lại (spy đếm=0 ở lần retry này); D.1 tính lại với `ok(s)` mock lần 2
toàn bộ=1 → `handoff_allowed=1` → `New Playthrough Started` ở
`slot_id=X`. *(unit + spy — retry same-slot)*

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
cả 2 thao tác Persistence, KHÁC nhánh AC-13): GIVEN state `Reset
Failed` với `reset_failed_reason="persistence_error"` (CHƯA có slot
nào tạo thành công), WHEN người chơi chọn "Thử lại", THEN `Processing
Chơi Lại` gọi lại cả "Khóa slot" VÀ "Tạo slot mới" (spy đếm=1 mỗi thao
tác ở lần retry này) — khớp Core Rule #5, đối chứng trực tiếp với
AC-13 (nhánh `state_reset_error` không gọi lại 2 thao tác này).
*(unit + spy — retry from scratch)*

**AC-19** (phân biệt lỗi tầng Persistence với lỗi reset trạng thái
D.1): GIVEN 2 kịch bản lỗi riêng biệt: (a) mock Persistence "Tạo slot
mới" trả lỗi tầng lưu trữ (VD `QuotaExceededError`) TRƯỚC khi D.1 kịp
chạy; (b) "Tạo slot mới" thành công nhưng D.1 trả `handoff_allowed=0`,
WHEN cả 2 kịch bản đều chuyển `Reset Failed`, THEN `reset_failed_reason`
phân loại ĐÚNG: (a) = `"persistence_error"`, (b) = `"state_reset_error"`
— KHÔNG chỉ khác nhau ở chuỗi text hiển thị. *(unit, regression —
error-source classification)*

**AC-20** (Undo đã bị chặn ở tầng Turn Manager, không cần enforcement
riêng — negative-assertion): GIVEN interface public của hệ này, WHEN
kiểm tra bề mặt API, THEN KHÔNG tồn tại bất kỳ logic/handler nào trong
hệ này xử lý hoặc chặn Undo — hệ này hoàn toàn dựa vào Turn Manager
Core Rule #9 (`is_death_turn=true` đã khóa vĩnh viễn TRƯỚC KHI hệ này
được kích hoạt, theo chính điều kiện ở Core Rule #1/AC-01). *(unit —
negative-assertion)*

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
| Hợp đồng "fresh-init default" (D.1's `ok(s)`) chưa được hình thức hóa ở bất kỳ hệ nào trong 5 hệ phụ thuộc (EXP & Realm Progression, NPC Affinity, Setting & Canon, Equipment & Skill Data, Death & Consequence) — chưa rõ có quy ước tên gọi chung `reset_to_fresh_init(char_id) -> ok:bool` hay mỗi hệ có interface riêng. | systems-designer | trước khi implement D.1 thật | Chưa quyết |
| `persistence-save-system.md` AC-05 chỉ test tính duy nhất `slot_id` + bất biến slot cũ khi "Chơi lại" — KHÔNG test việc "Bắt đầu mới" (thủ công) giữ nguyên `setting_pack_id` hiện hành giống cách Core Rule #4 của hệ này làm với "Chơi lại" (liên quan Edge Case #1 — đóng trình duyệt giữa chừng, người chơi tự chọn "Bắt đầu mới"). | qa-lead | trước khi hệ này Approved | Chưa quyết — có thể bổ sung 1 AC ở `persistence-save-system.md` hoặc ghi nhận rõ đây là hành vi chỉ đúng theo prose, không test tự động |
