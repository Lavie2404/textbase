# Character Customization Mode

> **Status**: In Design — Revised (vòng 3, sau verify hẹp 3 specialist, 2026-08-13)
> **Author**: duchx + Claude Code agents
> **Last Updated**: 2026-08-13
> **Implements Pillar**: Không phục vụ pillar nào của lối chơi chính —
> tồn tại song song, tính năng meta/dev-tool ngoài phạm vi 5 Pillar của
> `game-concept.md` (xem Overview + Player Fantasy)
> **Review vòng 1**: MAJOR REVISION NEEDED 2026-08-13 (5 specialist +
> creative-director) — 10 blocking đã xử lý cùng phiên theo 4 quyết định
> user (hủy-snapshot / 3-nút-Lưu / xóa-có-điều-kiện / nhãn-hack_write).
> **Review vòng 2**: NEEDS REVISION 2026-08-13 (cùng panel, session mới)
> — 10/10 fix vòng 1 xác nhận đúng hướng, 4 quyết định user đều sống
> sót; 12 cụm blocking mới (đặc tả/tích hợp, không lỗ cấu trúc) đã xử
> lý cùng phiên theo fix creative-director phân xử. Vòng 3 = verify hẹp
> 3 specialist, không cần panel đầy đủ.
> **Review vòng 3**: NEEDS REVISION (hẹp) 2026-08-13 (verify hẹp
> systems-designer/ux-designer/qa-lead + creative-director synthesis)
> — 10/12 cụm fix vòng 2 xác nhận khớp file nguồn; 2 blocking mới đã
> xử lý cùng phiên: D.2b +2 conjunct (formula tụt sau prose Rule #10)
> + AC-41 case (d) (`in_combat` render-level, backing cho AC-20).
> Vòng 4 = verify hẹp qa-lead DUY NHẤT (phạm vi D.2b + AC-35 + AC-41),
> sạch → APPROVED không cần vòng 5.
> Xem `reviews/character-customization-mode-review-log.md`.

## Overview

**Character Customization Mode** là một cơ chế **tùy chọn (opt-in)** cho
phép người chơi tự ghi trực tiếp lên nhân vật chính của mình: cấp độ, 12
chỉ số cơ bản, và tạo vật phẩm/kỹ năng tùy chỉnh — bỏ qua hoàn toàn con
đường "kiếm được qua gameplay" mà `exp-realm-progression.md` và
`equipment-skill-data-system.md` quy định cho lối chơi thông thường.

Về tầng dữ liệu, đây là một **write path hoàn toàn mới**, độc lập với
Turn Manager — không tốn lượt, không qua AI tường thuật — khác biệt với
*mọi* cơ chế ghi trạng thái hiện có trong game (vốn luôn đi qua chu
trình xác nhận lượt, kể cả 2 nút ghi-trạng-thái hiếm hoi trên Thẻ Nhân
Vật là Song Tu/Hồi phục). Vì độc lập với Turn Manager, write path này
phải TỰ đặc tả vòng đời của mình thay vì thừa hưởng: nó có checkpoint
ghi-bền-vững riêng (Rule #6a) và lần hack-ghi đầu tiên trong cửa sổ Undo
sẽ **khóa vĩnh viễn Undo của lượt trước** bằng cách hủy snapshot đang
treo (Rule #6b — xem tương tác với ADR-0004).

Về tầng người chơi, hệ này **không sửa đổi** Pillar 2 (Hệ Quả Thực Sự)
hay Pillar 3 (Sức Mạnh Có Logic) của lối chơi mặc định — nó là một "cửa
sau" minh bạch, người chơi tự bật, tự chịu trách nhiệm, tồn tại **song
song** chứ không thay thế thiết kế gốc, giống cơ chế cheat console phổ
biến trong game single-player. Vì `game-concept.md` xác nhận đây là dự
án cá nhân, phi thương mại, người chơi duy nhất là nhà phát triển — hệ
này tồn tại để nhà phát triển thử nghiệm nhanh các nhánh nhân vật, hoặc
tập trung trải nghiệm tường thuật/roleplay ở một trạng thái cụ thể, mà
không cần cày lại từ đầu qua lối chơi thật mỗi lần.

Người chơi tương tác **chủ động, không thường xuyên** — bật/tắt qua 1
toggle, chỉnh sửa qua 1 panel riêng, hoàn toàn tách khỏi vòng lặp
moment-to-moment (chọn hành động mỗi lượt) của lối chơi chính.

## Player Fantasy

*(Ghi chú lịch sử: mục này authored ở review mode `lean` không có
specialist; đã qua vòng `/design-review` full 2026-08-13 —
`game-designer` + `creative-director` review, câu chữ sửa lại cho trung
thực theo phán quyết senior.)*

**Cảm giác đích**: *"Tôi tạm rời ghế nhân vật để ngồi vào ghế đạo
diễn."*

Đây là một fantasy **hoàn toàn khác** với lối chơi chính. Trong khi
Pillar 2/3 xây dựng cảm giác "thực lực kiếm được, hệ quả thật" xuyên
suốt game, Character Customization Mode phục vụ cảm giác **"đạo diễn
đứng sau hậu trường"** — tạm rời khỏi vai nhân vật chính đang tu luyện,
để chỉnh trực tiếp trạng thái của một lần chơi. Gần với cảm giác dùng
console lệnh trong Skyrim/Bethesda hay Debug Mode của Stardew Valley:
**bật lên có chủ đích, biết rõ mình đang làm gì**, không phải một phần
thưởng/tiến trình tự nhiên của gameplay.

**Nói thẳng về giới hạn của fantasy này** (sửa 2026-08-13, phán quyết
`creative-director`): panel mở được ở *mọi* thời điểm `awaiting_action`
— kể cả ngay trước một trận sắp thua — và đạo diễn thì đương nhiên có
thể viết cho mình thắng. Hệ này **không có rule nào ngăn việc dùng nó
để thắng dễ hơn, và không giả vờ có**. Thứ giữ tính chính trực không
phải là một lời hứa ("không phải để thắng dễ hơn") mà là hai cơ chế
thật: cờ minh bạch vĩnh viễn (Rule #8) và nhãn `hack_write` trong log
trạng thái cơ học (Rule #6c) — người chơi luôn biết, và không thể tự
lừa, rằng mình vừa làm gì.

**Phản-fantasy** (cần tránh): tuyệt đối không được cảm thấy giống một
phần tự nhiên của "cuốn nhật ký đang sống" (Visual Identity Anchor của
`core-ui-screen-navigation.md`) — nếu panel này mang cùng ngôn ngữ
hình ảnh với màn chơi chính (mực loang, con dấu, marginalia), người
chơi sẽ mất ranh giới giữa "chuyện đang thật" và "mình vừa chỉnh tay",
làm xói mòn chính minh bạch mà tính năng này cam kết giữ.

**Trade-off có chủ đích của cờ minh bạch**: `hack_mode_used_this_slot`
là cờ mức-slot, không granular theo field/thời điểm — 1 lần chỉnh 1
field và 100 lần chỉnh toàn bộ để lại cùng một dấu vết. Đây là lựa
chọn có ý thức: cờ không thể weaponize thành "chỉ đánh dấu cái tôi
muốn", đổi lại toàn bộ slot bị "tô màu" vĩnh viễn dù chỉ chạm 1 lần.
Ai cần trạng thái sạch để roleplay/validation thì dùng slot chưa bật
hack mode.

## Detailed Design

*(Ghi chú lịch sử: mục này authored ở lean mode; đã qua vòng
`/design-review` full 2026-08-13 — Core Rules #1, #4, #5, #6, #8, #10
được sửa/mở rộng, thêm Rule #11.)*

### Core Rules

**#1 — Truy cập 2 lớp.** (a) **Toggle bật/tắt** tính năng — cấu hình
device-level trong Settings (O-Set, nhóm mới "Tùy chỉnh nhân vật"),
**ngoài slot bundle** (giống cỡ chữ), mặc định **OFF**. (b) Khi toggle
ON, VÀ đang ở S2 (Màn chơi chính) với `tm_state=awaiting_action` VÀ
`in_combat=false`, O-Set hiện thêm nút **"Chỉnh sửa nhân vật"** mở
overlay mới **O-Customize**.

**#1b — Ánh xạ ẩn vs mờ mực** (bổ sung 2026-08-13, khớp phân biệt đã
chốt của `core-ui-screen-navigation.md`: mờ mực `alpha=0.38` = khóa
tạm thời; ẩn hoàn toàn, không ghost = bất khả dụng cấu trúc):

| Điều kiện không thỏa | Trạng thái nút | Lý do |
|---|---|---|
| `toggle_enabled=false` | **Ẩn hoàn toàn** (không render) | Bất khả dụng cấu trúc — tính năng tắt |
| `screen≠S2` (VD mở O-Set từ S1) | **Ẩn hoàn toàn** | Bất khả dụng cấu trúc — không có nhân vật sống để chỉnh |
| `tm_state≠awaiting_action` (đang ở S2, toggle ON) | **Mờ mực** `alpha=0.38`, không bấm được | Khóa tạm thời — AI đang viết/đang undo, sắp quay lại |
| `in_combat=true` (đang ở S2, toggle ON) | **Mờ mực** `alpha=0.38`, không bấm được | Khóa tạm thời — hết trận sẽ mở lại (Rule #9) |
| `is_death_turn=true` (S2-D — lượt chết đã confirm, đang chờ dòng dẫn sang S5) | **Ẩn hoàn toàn** | Bất khả dụng cấu trúc — không có nhân vật sống để chỉnh, cùng lý do hàng S1 *(bổ sung vòng 2 2026-08-13: thiếu điều kiện này thì tại S2-D cả 4 điều kiện cũ đều thỏa — `screen=S2`, `tm_state` đọc ra `awaiting_action`, `in_combat=false` — nút bấm được và hack-write commit được lên slot đã chết; đường REACHABLE thật, không phải defensive)* |

Nút **live re-evaluate**: vì O-Set mở được cả khi `tm_state=resolving`
(lớp `readonly` của `core-ui-screen-navigation.md` D.1), nút phải nhận
signal thay đổi `tm_state`/`in_combat` và cập nhật trạng thái mờ↔bấm
được **tại chỗ** trong khi O-Set đang mở — không yêu cầu đóng/mở lại
O-Set.

**#2 — O-Customize là overlay thứ 3**, tuân theo state machine overlay
có sẵn (`core-ui-screen-navigation.md`): tối đa 1 overlay mở cùng lúc —
mở O-Customize tự đóng O-Card/O-Set nếu đang mở.

**#3 — Ghi `level`, không bao giờ ghi `tier`.** Panel chỉ cho nhập
field `level`; `tier` LUÔN derive theo công thức có sẵn của
`exp-realm-progression.md` (`tier = floor((level-1)/10)+1`, export
chính thức `tier_from_level` trong `design/registry/entities.yaml`) —
không có field tier riêng, tránh desync mà GDD đó đã cảnh báo.

**#4 — Ghi 12 chỉ số cơ bản: all-12-or-nothing, có pre-fill.** Khi mở
Khu 2, cả 12 field **pre-fill giá trị `base_X0` hiện tại** của nhân
vật (đọc qua `get_base_X0` — cùng tinh thần Khu 1 hiển thị `tier`
derive real-time). Submit bắt buộc đủ 12/12 `base_X0` cùng lúc — bị
chặn nếu thiếu bất kỳ field nào (field bị người chơi tự xóa trống →
`undefined`, KHÔNG BAO GIỜ coerce thành `0.0` — xem D.3), hoặc nếu
`base_HP0 ≤ 0` (khớp D.5 `base_stat_completeness_check` của
`character-card-identity.md`, vì downstream dùng HP làm mẫu số), hoặc
nếu bất kỳ giá trị nào non-finite/vượt `STAT_WRITE_MAX` (D.3).

**#5 — Tạo vật phẩm/kỹ năng tùy chỉnh dùng chung namespace ID** với
nội dung gốc (quyết định người dùng — không có prefix riêng; giữ
nguyên sau review 2026-08-13). Hệ thống bắt buộc chạy kiểm tra
uniqueness (kiểu Formula 2 `is_valid_dataset`,
`equipment-skill-data-system.md`) **tại runtime** khi submit, so với
toàn bộ ID đã tồn tại (nội dung gốc + custom trước đó) — nếu trùng,
**chặn submit**, yêu cầu người chơi tự đổi ID (không tự động đổi tên).
**Cardinality bắt buộc** (bổ sung 2026-08-13): tạo kỹ năng mới PHẢI
kèm **N≥1 thức** trong cùng lần submit — mirror invariant "N≥1
thức/kỹ năng" của `equipment-skill-data-system.md`; submit kỹ năng 0
thức bị chặn (không tạo skill mồ côi mà Combat không có thức để gọi
tên khi tường thuật).

**#6 — Bypass Turn Manager, kèm vòng đời write path tự đặc tả** (viết
lại 2026-08-13 — "bypass" phải trả lời được "vậy ai ghi, và ai có thể
ghi đè"):
- **(a) Ghi bền vững ngay khi commit.** Mỗi submit thành công là một
  **checkpoint ghi-bền-vững thứ 3** của game: write-through atomic
  xuống Persistence NGAY tại thời điểm commit, không chờ checkpoint
  lượt. Đây là amendment đối với `persistence-save-system.md` Core
  Rule #1 (hiện ghi "Auto-save duy nhất tại 2 checkpoint") — cần
  `/propagate-design-change` (xem Dependencies). Không có (a), hack-ghi
  chỉ nằm in-memory và mất trắng khi đóng tab/crash trước lượt kế —
  mâu thuẫn Rule #7.
  - **(a1) Trình tự quanh commit bất đồng bộ** (bổ sung vòng 2
    2026-08-13 — `commit()` của ADR-0002 là async, kết quả CHỈ về qua
    signal `committed()`/`failed()`): khi bấm một nút Lưu (hoặc nút
    xóa, Rule #11), **khóa ngay cả 3 nút Lưu + mọi nút xóa + nút Undo**
    trong suốt cửa sổ in-flight (mờ mực chuẩn 0.38 — khóa tạm thời
    đúng nghĩa); TOÀN BỘ hiệu lực của giao dịch — apply giá trị vào
    state in-memory, hủy snapshot (b), set cờ Rule #8, phát entry log
    (c), feedback "Đã ghi" — chỉ xảy ra SAU khi nhận `committed()`.
    Nhận `failed()` → KHÔNG đổi bất kỳ state in-memory nào, KHÔNG
    invalidate, KHÔNG set cờ, KHÔNG entry log; báo lỗi trong khu vừa
    thao tác và mở khóa lại các nút. Không tồn tại cửa sổ nào mà người
    chơi bấm được Undo trong khi một hack-write đang bay.
  - **(a2) Ràng buộc danh tính bản ghi cho amendment persistence**
    (bổ sung vòng 2): store `turn_records` của ADR-0002 keyed
    `[slot_id, world_time]`, append-only — hack-write giữ nguyên
    `world_time` (Rule #6d), nên checkpoint thứ 3 **KHÔNG ĐƯỢC** ghi
    bằng khóa turn record hiện tại (sẽ ĐÈ mất `locked_result`/
    `narration_text` của lượt vừa xác nhận, phá cả tombstone `undone`).
    Amendment phải chọn một trong: record type riêng có khóa phụ tuần
    tự (VD `[slot_id, world_time, hack_seq]`), hoặc ép flush
    full-snapshot ngoài cadence. Thứ tự replay khi load phải được bảo
    toàn: hack-write sau lượt T, trước lượt T+1.
- **(b) Hủy snapshot Undo đang treo.** ADR-0004 giữ snapshot của lượt
  vừa xác nhận treo suốt cửa sổ Undo; panel mở được đúng trong cửa sổ
  đó. Lần hack-ghi ĐẦU TIÊN commit trong một cửa sổ Undo (tính cả thao
  tác xóa — Rule #11) sẽ gọi `invalidate_pending_snapshot()` — **Undo
  của lượt trước bị khóa vĩnh viễn ngay lập tức**. Nút Undo **biến mất
  theo đúng pattern `undo-button`** của `interaction-patterns.md`
  (tween alpha 1.0→0 ≤150ms rồi gỡ node — AC-59a/59b
  `core-ui-screen-navigation.md`: "mọi nguyên nhân biến mất render CÙNG
  hiệu ứng"); *(sửa vòng 2 2026-08-13: bản vòng 1 ghi "mờ mực" — sai
  pattern đã chốt: mờ 0.38 chỉ dành cho khóa TẠM THỜI, đây là khóa vĩnh
  viễn = "mực đã khô" = biến mất; "hack-invalidate" là nguyên nhân biến
  mất MỚI cần propagate vào danh sách nguyên nhân của AC-59a bên
  core-ui)*. `invalidate_pending_snapshot()` là **interface mới, phạm
  vi amendment gồm 3 nơi** (mở rộng vòng 2): ADR-0004 (thêm method),
  `turn-manager.md` + registry formula `undo_availability_window`
  (thêm conjunct `pending_snapshot_valid` — formula hiện tại không có
  term nào phản ánh "snapshot đã hủy", amend riêng ADR-0004 là không
  đủ để `undo_available` trả `false`). Không có (b),
  `restore_snapshot()` của một lần Undo sau đó sẽ rollback toàn bộ
  hack-write (kể cả cờ Rule #8) — quyết định user 2026-08-13, chọn
  thay cho 2 phương án "chặn panel khi `undo_available`" (giết công
  cụ) và "merge hack vào snapshot" (phức tạp, cần vá blob từng hệ).
- **(c) Nhãn nguồn trong log trạng thái cơ học.** Mọi ghi qua
  O-Customize PHẢI phát ra một entry log trạng thái cơ học (Required
  for MVP #6, `game-concept.md`) mang **nhãn nguồn `hack_write`**,
  ngoài chỉ mục lượt — để một hack-ghi giữa 2 snapshot lượt không bao
  giờ bị đọc nhầm thành "AI tự ý đổi kết quả cơ học" (false positive
  đánh trượt tiêu chí FAIL BLOCKING duy nhất của Core Hypothesis MVP).
  Quyết định user 2026-08-13, chọn thay cho quy tắc quy trình thuần.
- **(d)** Ngoài ra giữ nguyên ngữ nghĩa gốc: không tốn lượt, không qua
  AI tường thuật, `world_time` không đổi, không action nào gửi tới
  Turn Manager.

**#7 — Vĩnh viễn, không hoàn tác tự động.** Không có cơ chế
undo/revert riêng cho panel này, và Undo 1-lượt chuẩn không đụng được
tới hack-write (Rule #6b) — người chơi tự chịu trách nhiệm (khớp
Player Fantasy). Làm rõ (2026-08-13): "vĩnh viễn" nghĩa là **không có
đường lùi tự động** — người chơi vẫn có thể mở lại panel và ghi đè
giá trị khác, hoặc xóa entry custom chưa-tham-chiếu (Rule #11); khác
với "không thể thay đổi nữa".

**#8 — Cờ minh bạch không thể xóa.** Lần đầu tiên bất kỳ field nào
được ghi qua O-Customize trong 1 slot, set
`hack_mode_used_this_slot = true` (lưu trong slot bundle, không phải
device-level) — cờ này **không bao giờ** bị xóa/reset trong đời của
slot đó, kể cả khi tắt toggle sau đó. **Ràng buộc kỹ thuật bắt buộc**
(bổ sung 2026-08-13): cờ phải nằm **NGOÀI phạm vi mọi
`capture_snapshot()`/`restore_snapshot()`** của ADR-0004 (không thuộc
blob snapshot của bất kỳ hệ đã đăng ký nào), và được ghi bền vững
trong CÙNG checkpoint write-through của Rule #6a — nếu không, một lần
Undo có thể rollback chính cờ "không bao giờ xóa", đánh sập cam kết
minh bạch là trụ cột đạo đức duy nhất của hệ này.

**#9 — Khóa cứng khi combat.** Panel disabled hoàn toàn khi
`in_combat=true` (đọc từ Combat System) — nhất quán với bất biến
"tier/level không đổi giữa trận" (nêu trong phần rationale của Combat
System Core Rule #4; sửa trích dẫn 2026-08-13 — nội dung chính của
rule đó là "phạt áp dụng mỗi pha", bất biến này là mệnh đề rationale
đi kèm).

**#10 — Ghi tiến trình là giao dịch nguyên tử bộ ba `(level,
current_exp, state)`** (viết lại 2026-08-13, thay cho "ghi level kéo
theo reset EXP"):
- Khu Tiến trình cho ghi 3 field: `level` (bắt buộc khi lưu khu),
  `current_exp` (tùy chọn), `state` (enum `{"Tu Luyện Thường", "Chờ
  Đột Phá"}` của `exp-realm-progression.md` D.7 — mặc định "Tu Luyện
  Thường").
- **Gate no-op**: `current_exp` chỉ tự reset về `0` khi `new_level ≠
  old_level` VÀ người chơi không nhập `current_exp` mới. Submit trùng
  level hiện tại = no-op đúng nghĩa — KHÔNG reset EXP tích lũy.
- **Ghi `current_exp` tùy ý**: float hữu hạn ≥0 (KHÔNG ép số nguyên —
  kinh tế EXP là float từ gốc, sửa vòng 2 2026-08-13), miền theo nhánh:
  level không-mốc → `[0, exp_threshold(level))` (strict); mốc tròn chục
  → chạm ngưỡng đúng khi và chỉ khi state "Chờ Đột Phá" (D.2b). Cho
  phép dev-seed đúng trạng thái "Chờ Đột Phá" (trạng thái đắt nhất/khó
  dựng nhất của EXP system, Required-for-MVP #12 của GDD đó) mà bản gốc
  Rule #10 vô tình chặn.
- **Bắt buộc ghi kèm `state`**: cả 3 field commit trong CÙNG một giao
  dịch. Không ghi `state` thì nhân vật đang "Chờ Đột Phá" hack level
  xong sẽ treo vĩnh viễn (EXP bị kẹp ở nhánh mốc-tròn-chục, lối thoát
  duy nhất `breakthrough_requirement_met` chỉ thỏa qua combat — Rule
  #6 GDD EXP).
- **Bất biến chéo HAI CHIỀU** (nâng từ một chiều, vòng 2): tại mốc tròn
  chục, `current_exp == exp_threshold(level) ⟺ state == "Chờ Đột Phá"`;
  ở level không-mốc, `state` luôn là "Tu Luyện Thường" và exp không bao
  giờ chạm ngưỡng (xem D.2b).
- Miền D.2b không bị vi phạm dù chỉ thoáng qua trong giao dịch (không
  tồn tại trạng thái quan sát được nào có level mới + exp cũ vượt
  ngưỡng, và không trạng thái nào validator chấp nhận mà mô hình EXP
  tuyên bố bất khả tồn tại).

**#11 — Xóa entry custom có điều kiện** (bổ sung 2026-08-13, quyết
định user — đóng mâu thuẫn create-only vs fantasy "thử nghiệm rẻ";
siết đặc tả vòng 2 cùng ngày). Panel có cơ chế xóa một entry custom
(item/skill/thức), CHỈ khi thỏa đồng thời: (a) entry do hack-mode tạo
(đánh dấu nguồn khi tạo — dấu này là metadata quản trị nội bộ, KHÔNG
phải cờ cơ học và không hệ gameplay nào được đọc nó để phân nhánh);
(b) entry **chưa được tham chiếu**, định nghĩa THEO LOẠI *(sửa vòng 2
— "trang bị" chỉ có nghĩa cho vũ khí trong data model
`equipment-skill-data-system.md`; skill là "known", không "equipped")*:
  - **item**: chưa TỪNG được trang bị (`was_ever_equipped` — thì
    quá-khứ-hoàn-thành, không phải "đang trang bị") VÀ chưa xuất hiện
    trong World Memory;
  - **skill**: chưa TỪNG được resolve trong bất kỳ combat nào VÀ chưa
    xuất hiện trong World Memory; xóa skill **gỡ ID khỏi
    `known_skill_ids` trong CÙNG giao dịch** — không để dangling
    reference;
  - **thức**: kỹ năng cha không tồn tại ngoài batch xóa này VÀ chưa
    xuất hiện trong World Memory. Xóa kỹ năng thì xóa cả N thức của nó
    — **all-or-nothing trong 1 giao dịch**: nếu BẤT KỲ thức nào (hoặc
    chính skill) không thỏa điều kiện, chặn TOÀN BỘ, không xóa bán
    phần.

**Xóa là một hack-write commit ĐẦY ĐỦ** (bổ sung vòng 2 — bịt lỗ "xóa
thoát vòng đời write path"): áp nguyên vẹn Rule #6a (write-through +
trình tự async a1), #6b (invalidate snapshot treo — không có nó, Undo
chuẩn hồi sinh entry đã xóa: nếu ID đã tái sử dụng cho entry mới thì
2 entry cùng ID, phá chính invariant D.4; và Undo đảo ngược được một
thao tác hack-mode, vi phạm Rule #7), #6c (entry log nhãn `hack_write`,
ghi loại thao tác `delete` + định danh entry — một entity biến mất
giữa 2 snapshot lượt mà không nhãn nguồn sẽ tái tạo đúng false
positive Core Hypothesis mà nhãn này sinh ra để chặn), và debounce
`SUBMIT_DEBOUNCE_MS` per-nút như 3 nút Lưu.

Xóa thành công giải phóng ID — dùng lại được. Entry đã tham chiếu: nút
xóa mờ mực + lý do ngắn. Nội dung gốc: không bao giờ có nút xóa.

### States and Transitions

| # | Trạng thái | Vào từ | Thoát đến | Điều kiện |
|---|---|---|---|---|
| O-Customize | Overlay chỉnh sửa nhân vật | nút "Chỉnh sửa nhân vật" trong O-Set, chỉ khi mở từ S2 (O-Set đóng NGAY trước khi O-Customize mở — Rule #2) | đóng qua X/tap ngoài/Esc (tap-ngoài/Esc: luật 2 bậc khi có field đang focus — lần 1 chỉ unfocus, vòng 2), hoặc force-close khi điều kiện D.1 mất; panel **KHÔNG tự đóng sau submit** (3 nút Lưu riêng theo khu — người chơi có thể lưu nhiều khu liên tiếp trong 1 lần mở) | toggle ON + `tm_state=awaiting_action` + `in_combat=false`; không tiêu lượt; mỗi submit ghi ngay + write-through bền vững (Rule #6a), không qua Turn Manager |

### Interactions with Other Systems

| Hệ | Chiều | Dữ liệu qua interface | Ai sở hữu |
|---|---|---|---|
| EXP & Realm Progression | ghi | bộ ba nguyên tử `(level, current_exp, state)` (Rule #10); `tier` luôn derive | Hệ này sở hữu write path mới; EXP GDD sở hữu formula derive `tier`, `exp_threshold`, enum `state` D.7 |
| Character Card & Identity | ghi + đọc | ghi 12 `base_X0` (all-12-or-nothing, `HP0>0`, finite, ≤`STAT_WRITE_MAX`); đọc `get_base_X0` để pre-fill Khu 2 | như trên |
| Equipment & Skill Data System | ghi + xóa | custom item (`item_id`, `efficacy`), custom skill (N≥1 thức)/thức theo schema hiện có; xóa entry custom chưa-tham-chiếu (Rule #11) | như trên, tôn trọng uniqueness runtime check (Rule #5) + cardinality N≥1 |
| Turn Manager / ADR-0004 | đọc + hủy snapshot | đọc `tm_state` + `is_death_turn` để gate (Rule #1/#1b/#9); gọi `invalidate_pending_snapshot()` ở hack-write/xóa đầu tiên trong cửa sổ Undo (Rule #6b) — **interface mới, amendment phạm vi 3 nơi (ADR-0004 + turn-manager.md + registry `undo_availability_window`)** | Turn Manager sở hữu snapshot lifecycle; hệ này chỉ được phép hủy, không đọc/sửa nội dung snapshot |
| Combat System | đọc | `in_combat` (gate Rule #9) | Combat sở hữu cờ |
| Persistence | ghi | checkpoint ghi-bền-vững thứ 3 "hack-write commit" (write-through atomic mỗi submit — **amendment Core Rule #1 bên đó**); `hack_mode_used_this_slot` (slot bundle, NGOÀI mọi snapshot); toggle (device-level, ngoài slot bundle) | Persistence sở hữu lưu trữ, hệ này sở hữu nội dung + trigger mới |
| World Memory | đọc | kiểm tra entry custom đã xuất hiện trong tường thuật chưa (gate xóa, Rule #11b) | World Memory sở hữu lịch sử |
| Log trạng thái cơ học (Required for MVP #6) | ghi | entry nhãn nguồn `hack_write` mỗi submit commit (Rule #6c) | Schema log thuộc Required-for-MVP #6; hệ này sở hữu nhãn |
| Core UI/Screen Navigation | cung cấp | overlay O-Customize tích hợp state machine overlay hiện có (tối đa 1 mở); entry point nút trong O-Set; ánh xạ ẩn/mờ-mực theo chuẩn bên đó (Rule #1b) | Core UI sở hữu khung overlay + chuẩn ẩn/mờ; hệ này sở hữu nội dung O-Customize |

## Formulas

*(Đề xuất bởi `systems-designer` khi authoring; sửa/bổ sung
2026-08-13 sau bảng kiểm biên của vòng review full: D.2 sửa rationale,
thêm D.2b, D.3 đóng miền non-finite + trần, D.4 thêm cardinality,
thêm D.5.)*

### D.1 — `customize_panel_available(toggle_enabled, screen, tm_state, in_combat, is_death_turn)`

The `customize_panel_available` formula is defined as:

`customize_panel_available = toggle_enabled AND (screen=S2) AND (tm_state=awaiting_action) AND (NOT in_combat) AND (NOT is_death_turn)`

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Toggle tính năng | `toggle_enabled` | bool | `{0,1}` | Cấu hình device-level (O-Set → "Tùy chỉnh nhân vật"), mặc định OFF (Rule #1a) |
| Màn hình hiện tại | `screen` | enum | `{S1,S2,S4,S4-RO,S5}` | Nguồn: state machine của `core-ui-screen-navigation.md` D.2 (enum gốc không có S3 — xác minh 2026-08-13, không phải lỗi) |
| Trạng thái Turn Manager | `tm_state` | enum | `{awaiting_action, resolving, undoing}` | Nguồn sự thật duy nhất, đọc chung interface với D.1 của `core-ui-screen-navigation.md`. Lưu ý: enum 3 giá trị này không biểu diễn "Turn Confirmed" như một giá trị riêng — sau Turn Confirmed, `tm_state` đọc ra là `awaiting_action` và cửa sổ Undo vẫn mở; đây chính là lý do Rule #6b tồn tại |
| Đang giao đấu | `in_combat` | bool | `{0,1}` | Đọc từ Combat System (Dependencies) |
| Lượt chết đã confirm | `is_death_turn` | bool | `{0,1}` | Cờ của lượt vừa xác nhận (Turn Manager, registry `undo_availability_window` — dùng chung, không định nghĩa lại). `true` = đang ở S2-D chờ chuyển S5 — không còn nhân vật sống để chỉnh *(bổ sung vòng 2 2026-08-13)* |
| Kết quả | `customize_panel_available` | bool | `{0,1}` | `1` = nút "Chỉnh sửa nhân vật" trong O-Set hiện & bấm được; `0` → ẩn hoặc mờ mực theo bảng ánh xạ Rule #1b |

**Output Range:** Boolean thuần, hàm tổng — 120 tổ hợp test đầy đủ (2×5×3×2×2).

**Example:** `(true,S2,awaiting_action,false,false)=true` — mọi điều kiện Rule #1b thỏa. `(true,S1,awaiting_action,false,false)=false` — mở O-Set từ S1, không có nhân vật sống để chỉnh (ẩn hoàn toàn). `(true,S2,resolving,false,false)=false` — AI đang viết (mờ mực, live re-evaluate khi về `awaiting_action`). `(true,S2,awaiting_action,true,false)=false` — Rule #9 khóa cứng combat (mờ mực). `(false,S2,awaiting_action,false,false)=false` — toggle OFF (ẩn hoàn toàn). `(true,S2,awaiting_action,false,true)=false` — S2-D sau lượt chết, ẩn hoàn toàn (không hack lên slot đã chết).

**Edge cases:** không cần carve-out riêng cho `screen=S5` — không có đường dẫn hợp lệ nào tới O-Customize từ S5. `toggle_enabled` không đổi được trong lúc O-Customize đang mở (O-Set/O-Customize loại trừ nhau, Rule #2). Nếu `in_combat` chuyển `true` ngay lúc panel đang mở, formula đánh giá lại trả `false` → panel force-close, không chỉ ẩn nút — **lưu ý reachability** (xác minh 2026-08-13, `systems-designer` + `qa-lead` đồng thuận): đường này KHÔNG reachable qua gameplay thật (`in_combat` chỉ đổi trong Resolving; không lượt nào resolve được khi panel đang mở và bypass Turn Manager) — force-close là **hành vi phòng thủ có chủ đích**, test bằng mock injection trực tiếp (AC-02), không phải regression path thật. Ngược lại, đường **REACHABLE** cần xử lý là live re-evaluate của NÚT trong O-Set (Rule #1b — O-Set mở được lúc `resolving`, nút phải tự chuyển mờ↔bấm được khi `tm_state` đổi).

**Rationale:** Hình thức hóa Rule #1b + #9 thành 1 predicate AND thuần túy, cùng phong cách D.1 gốc của `core-ui-screen-navigation.md` — unit-test được không cần dựng scene Godot.

### D.2 — `is_valid_level_write(level)`

The `is_valid_level_write` formula is defined as:

`is_valid_level_write(level) = is_int(level) AND (level ≥ 1) AND (level ≤ LEVEL_WRITE_MAX)`

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Giá trị nhập | `level` | int/float/string (raw UI input) | không giới hạn trước validate | Giá trị người chơi gõ vào field `level` của O-Customize |
| Trần vệ sinh kỹ thuật | `LEVEL_WRITE_MAX` | int (knob) | mặc định 1,000,000; safe range 1,000–10,000,000 | Chặn giá trị phi thực tế/lỗi đánh máy — vệ sinh kỹ thuật thuần túy, KHÔNG phải cân bằng gameplay |
| Kết quả | `is_valid_level_write` | bool | `{0,1}` | `1` = giá trị `level` hợp lệ để đưa vào giao dịch D.2b; `tier` sau đó derive tự động (Rule #3) |

**Output Range:** Boolean.

**Example:** `(50)=true`. `(0)=false` — vi phạm `level≥1` (nếu lọt qua sẽ làm `tier_from_level(0)=0`, phá bất biến "`tier` không bao giờ = 0 với `level≥1` hợp lệ"). `(-5)=false`. `(3.5)=false` — không phải số nguyên, fail-fast thay vì âm thầm làm tròn. `(2,000,000)=false` — vượt `LEVEL_WRITE_MAX`. `(NaN)=false` — mọi so sánh với NaN trả false.

**Edge cases:** `level=1` hợp lệ (biên dưới model gốc). Input phi số/rỗng → `is_int=false` → chặn toàn bộ, không có giá trị mặc định ngầm. `"1e999"`/`Infinity` bị chặn bởi `≤ LEVEL_WRITE_MAX` (trần hữu hạn che chắn non-finite ở formula này — khác D.3 trước revision). Submit trùng giá trị hiện tại của nhân vật → hợp lệ, và là **no-op đúng nghĩa: KHÔNG reset `current_exp`** (Rule #10 gate theo `new_level ≠ old_level` — sửa 2026-08-13, đóng mâu thuẫn với bản gốc).

**Rationale:** `level≥1` là bắt buộc cứng (bảo vệ bất biến `tier_from_level`, dùng chung với Combat/Character Card). `LEVEL_WRITE_MAX` là quyết định thiết kế riêng của hệ này — vệ sinh kỹ thuật, không kế thừa từ hệ khác. **Sửa 2026-08-13 (`economy-designer`, verified bởi `creative-director`)**: bản gốc viện dẫn "Combat đã tự bảo vệ bằng `FLOOR_TOTAL`" — SAI kỹ thuật: `FLOOR_TOTAL` là **sàn** multiplier (`effective_stat ∈ [FLOOR_TOTAL·base_X, base_X]`, chống stat tụt về 0), hoàn toàn không chặn giá trị tuyệt đối lớn. Sự thật là: **không có cơ chế combat nào chặn hệ quả của level/stat cực lớn** — hack level/stat cao là chủ ý phá cân bằng của người chơi, hệ chỉ chặn lỗi kỹ thuật (typo, non-finite), không chặn ý định.

### D.2b — `is_valid_progress_write(level, current_exp, state, old_level)` *(mới 2026-08-13 — Rule #10)*

```
is_valid_progress_write(level, current_exp, state, old_level) =
    is_valid_level_write(level)                                          // D.2
    AND (state ∈ {"Tu Luyện Thường", "Chờ Đột Phá"})                     // enum D.7 exp-realm-progression
    AND (is_finite(current_exp) VÀ current_exp ≥ 0)                      // float — kinh tế EXP là float từ gốc, xem ghi chú vòng 2
    AND (level mod 10 ≠ 0
         ⟹ current_exp < exp_threshold(level))                          // level không-mốc: biên trên STRICT — exp == threshold là trạng thái
                                                                         // bất khả tồn tại theo vòng lặp D.7 (level-up tiêu ngay), ghi vào sẽ
                                                                         // gây "level-up ma" ở lượt kế
    AND (level mod 10 == 0
         ⟹ (current_exp == exp_threshold(level) ⟺ state == "Chờ Đột Phá"))  // mốc tròn chục: bất biến chéo HAI CHIỀU — "Tu Luyện Thường"
                                                                             // tại mốc đòi exp CHƯA chạm ngưỡng (khớp bảng state EXP GDD),
                                                                             // "Chờ Đột Phá" đòi exp ĐÚNG ngưỡng
    AND (level mod 10 ≠ 0
         ⟹ state == "Tu Luyện Thường")                                  // level không-mốc: KHÔNG chọn được "Chờ Đột Phá" — mới vòng 3
                                                                         // 2026-08-13. Thiếu conjunct này, mệnh đề mốc-tròn vacuously true
                                                                         // → (25,200,"Chờ Đột Phá",25) PASS sai; try_execute_breakthrough
                                                                         // bên EXP chỉ gate bằng state (không kiểm level mod 10) → trạng
                                                                         // thái hỏng lọt qua gây "đột phá ma" ở level không-mốc
    AND (level mod 10 == 0
         ⟹ current_exp ≤ exp_threshold(level))                          // mốc tròn chục: chặn trên TUYỆT ĐỐI, độc lập với iff — mới vòng 3.
                                                                         // Thiếu nó, iff hai-vế-cùng-sai = true → (50,exp_threshold(50)+1,
                                                                         // "Tu Luyện Thường",·) PASS sai, exp vượt ngưỡng "tự-lành" lượt kế
                                                                         // — đúng lớp mutation-không-ai-yêu-cầu mà D.2b sinh ra để chặn
```

*(Sửa vòng 2 2026-08-13: (i) bỏ ràng buộc "`current_exp` là số nguyên"
— kinh tế EXP là float từ gốc (`PASSIVE_EXP_RATE=0.001 × exp_threshold`
≈ 0.1–0.34/lượt, threshold là float knob), ép nguyên sẽ khóa chết chính
đường no-op mà Rule #10 tồn tại để bảo vệ, và làm "Chờ Đột Phá" bất khả
thỏa nếu knob tune ra threshold lẻ; (ii) biên trên tách theo nhánh
mốc/không-mốc + bất biến chéo nâng thành hai chiều — bản vòng 1 chỉ có
chiều ⟹, cho phép seed trạng thái mà mô hình EXP tuyên bố bất khả tồn
tại.)*

*(Sửa vòng 3 2026-08-13 — verify hẹp `systems-designer`, senior tự kiểm
phản ví dụ xác nhận: thêm 2 conjunct cuối. Bản vòng 2 tụt sau chính
prose Rule #10 ("ở level không-mốc, `state` luôn là 'Tu Luyện Thường'")
— prose đúng nhưng formula không mã hóa: (i) không gì cấm `state="Chờ
Đột Phá"` ở level không-mốc; (ii) tại mốc tròn chục, exp VƯỢT ngưỡng
với state "Tu Luyện Thường" lọt qua iff. Cả 4 pass-fixture và 7
fail-fixture hiện có giữ nguyên kết quả sau patch.)*

Ngữ nghĩa điền mặc định TRƯỚC khi validate (thuộc UI, ghi ở đây để
đóng đinh): người chơi không nhập `current_exp` → mặc định `0` nếu
`level ≠ old_level`, giữ nguyên giá trị hiện tại nếu `level ==
old_level` (no-op gate); không chọn `state` → mặc định "Tu Luyện
Thường" nếu `level ≠ old_level`, giữ nguyên nếu không đổi level.

**Variables:** `level`/`LEVEL_WRITE_MAX` như D.2; `current_exp` float hữu hạn ≥0 (KHÔNG ép số nguyên — sửa vòng 2); `state` enum D.7 (import, không định nghĩa lại); `exp_threshold` import từ EXP & Realm Progression; `old_level` = level hiện tại của nhân vật trước giao dịch, re-read mỗi lần bấm Lưu (panel không tự đóng, có thể Lưu nhiều lần trong 1 lần mở). Kết quả bool — `1` = cả bộ ba được ghi trong 1 giao dịch nguyên tử.

**Example (pass):** `(50, 0, "Tu Luyện Thường", 25) = true` — hack level thường. `(10, exp_threshold(10), "Chờ Đột Phá", 9) = true` — dev-seed đúng trạng thái Chờ Đột Phá (use-case Required-for-MVP mà bản gốc chặn). `(25, 200, "Tu Luyện Thường", 25) = true` — no-op level, giữ EXP (`exp_threshold(25)=340`, 200 < 340). `(25, 123.45, "Tu Luyện Thường", 25) = true` — no-op với EXP float tích lũy lẻ, đường phổ biến nhất của nhân vật thật.
**Example (fail):** `(50, exp_threshold(50)+1, ·, ·) = false` — EXP vượt ngưỡng tại mốc, fail với MỌI state *(ký hiệu `·` thành sự thật nhờ conjunct chặn-trên vòng 3 — trước đó chỉ fail khi state="Chờ Đột Phá")*. `(25, 200, "Chờ Đột Phá", 25) = false` — state "Chờ Đột Phá" ở level không-mốc: trạng thái bất khả tồn tại theo D.7, lọt qua sẽ gây "đột phá ma" *(case mới vòng 3)*. `(25, 340, "Tu Luyện Thường", 25) = false` — exp ĐÚNG ngưỡng ở level không-mốc: trạng thái bất khả tồn tại theo D.7, ghi vào gây level-up ma lượt kế *(case mới vòng 2 — bản vòng 1 PASS case này và fixture AC còn mã hóa nó)*. `(10, exp_threshold(10), "Tu Luyện Thường", 9) = false` — mốc tròn chục + exp chạm ngưỡng bắt buộc state "Chờ Đột Phá" (chiều ⟸ của bất biến hai chiều). `(11, exp_threshold(11), "Chờ Đột Phá", 9) = false` — level 11 không phải mốc tròn chục. `(10, 5, "Chờ Đột Phá", 9) = false` — Chờ Đột Phá đòi EXP chạm trần. `(25, -1, ·, ·) = false`, `(25, Infinity, ·, ·) = false` — miền float hữu hạn ≥0.

**Rationale:** Không có bất biến chéo thì (b)-cho-ghi-EXP-tùy-ý sẽ tạo được nhân vật `state="Chờ Đột Phá"` không thỏa điều kiện nào của EXP GDD → treo không lối ra hợp lệ (phát hiện `creative-director` vòng 1). Vòng 2 phát hiện chiều ngược cũng hở: validator chấp nhận trạng thái mà mô hình nguồn tuyên bố bất khả tồn tại thì "tự-lành" của D.7 ở lượt kế chính là defect — một mutation không ai yêu cầu.

### D.3 — `is_valid_base_stat_set(base_X0_map)`

The `is_valid_base_stat_set` formula is defined as:

```
STAT_FIELDS_12 = {HP, ATK, DEF, SPD, ACC, Né, CritRate, CritDamage, Amp, Mitigation, Lifesteal, HPRegen}
// key literal chuẩn: theo đúng STAT_FIELDS của character-card-identity.md (nguồn sự thật,
// = STAT_FIELDS ∖ {level, tier}) — nhãn hiển thị tiếng Việt là việc của /ux-design,
// validator so key kỹ thuật, không so nhãn.
// (Sửa vòng 2 2026-08-13: bản vòng 1 viết `Né tránh, Crit Rate, Crit Damage` — lệch 3 key
// so với nguồn `Né, CritRate, CritDamage` ngay dưới dòng comment tự nhận "theo đúng nguồn";
// equality check của formula này sẽ fail 100% mọi submit nếu giữ nguyên.)

is_valid_base_stat_set(base_X0_map) =
    (keys(base_X0_map) = STAT_FIELDS_12)                                     // đủ 12/12, không thừa/thiếu field nào
    AND ∀X ∈ STAT_FIELDS_12: (base_X0_map[X] là số VÀ is_finite(base_X0_map[X])
                              VÀ base_X0_map[X] ≤ STAT_WRITE_MAX)             // chặn Infinity/NaN/tràn — mới 2026-08-13
    AND (base_X0_map[HP] > 0)                                                 // HP: strict >0
    AND ∀X ∈ STAT_FIELDS_12∖{HP}: (base_X0_map[X] ≥ 0)                        // 11 chỉ số còn lại: ≥0
```

**Quy tắc parse bắt buộc** (mới 2026-08-13): raw UI input rỗng PHẢI
map về `undefined` (→ fail check `keys`/`là số`), **KHÔNG BAO GIỜ**
coerce thành `0.0` — nếu không, không phân biệt được "bỏ trống" và
"nhập 0 chủ đích", phá chính mục đích Rule #4.

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Bộ 12 chỉ số nháp | `base_X0_map` | map (key→float) | 12 key cố định | Payload Khu 2 gửi khi submit — draft, chưa phải entity record; pre-fill từ `get_base_X0` khi mở panel (Rule #4) |
| Chỉ số khởi điểm HP | `base_X0_map[HP]` | float \| undefined | `(0, STAT_WRITE_MAX]` khi có | Strict >0 — khớp `character-card-identity.md` D.5 |
| Chỉ số khởi điểm (11 còn lại) | `base_X0_map[X]` | float \| undefined | `[0, STAT_WRITE_MAX]` khi có | ≥0 — khớp D.5 |
| Trần vệ sinh kỹ thuật | `STAT_WRITE_MAX` | float (knob, mới 2026-08-13) | mặc định 1,000,000,000; safe range 1,000,000 – 1e12 | Mirror đúng vai trò `LEVEL_WRITE_MAX`: chặn non-finite/tràn/typo, KHÔNG phải cân bằng — đóng Open Question #3 |
| Kết quả | `is_valid_base_stat_set` | bool | `{0,1}` | `1` = submit được phép ghi cả 12 field cùng lúc (Rule #4) |

**Output Range:** Boolean.

**Example (pass):** đủ 12/12 key, `HP=120`, các field còn lại ≥0 và hữu hạn → `true` → ghi ngay (Rule #6).
**Example (fail — thiếu field):** chỉ 11/12 (thiếu `Lifesteal`, hoặc field bị xóa trống → `undefined`) → `false` — cùng lớp lỗi AC-27 của `character-card-identity.md` D.5.
**Example (fail — HP=0):** đủ 12/12 nhưng `HP=0` → `false` — cùng lớp lỗi AC-46 của D.5.
**Example (fail — chỉ số âm):** `ATK=-5` → `false`.
**Example (fail — non-finite, mới):** `ATK=Infinity` (hoặc `"1e999"` parse tràn) → `false` — bản gốc PASS case này (`Infinity ≥ 0 = true`, không trần), gây `stat_growth=∞` vĩnh viễn → `hp_pct`/`margin_ratio` ở Combat/NPC Affinity/Death & Consequence nhận mẫu số `∞` → `0`/`NaN` (phát hiện `systems-designer` 2026-08-13).

**Edge cases:** chỉ số dạng % vượt `PERCENT_STAT_CAP` (VD `Crit Rate=5.0`) **không bị chặn ở đây** — clamp là việc của read-time (`exp-realm-progression.md`'s `percentage_stat_value`), không phải write-time; mirror đúng D.5 gốc. Giá trị LỚN nhưng hữu hạn và ≤ `STAT_WRITE_MAX` (VD `ATK=999,999,999`) vẫn hợp lệ — hack mode chủ ý cho phép phá cân bằng, chỉ chặn lớp lỗi kỹ thuật (xem D.2 Rationale đã sửa). Field lạ/thừa trong `base_X0_map` → equality check (không phải superset-check) → fail-fast thay vì âm thầm bỏ qua.

**Rationale:** Tái dùng chính xác bất biến `base_stat_completeness_check` (D.5, `character-card-identity.md`) — chỉ khác điểm áp dụng — CỘNG lớp vệ sinh non-finite/trần mà D.5 gốc không cần (nó validate record đã tồn tại, không validate raw UI input).

### D.4 — `is_valid_custom_id(new_id, namespace, existing_id_set)` + cardinality

The `is_valid_custom_id` formula is defined as:

`is_valid_custom_id = non_empty(new_id) AND (new_id ∉ existing_id_set)`

**Cardinality gate của submit tạo kỹ năng** (mới 2026-08-13 — Rule #5):

`is_valid_skill_submit(skill_id, thuc_ids) = is_valid_custom_id(skill_id, skill, ...) AND (len(thuc_ids) ≥ 1) AND ∀i: is_valid_custom_id(thuc_ids[i], thuc, existing ∪ {đã chấp nhận trong batch})`

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| ID mới | `new_id` | string | bất kỳ chuỗi | ID người chơi tự đặt, không có prefix bắt buộc (Rule #5) |
| Loại namespace | `namespace` | enum | `{item, skill, thuc}` | 3 namespace tách biệt, khớp cấu trúc dữ liệu có sẵn của `equipment-skill-data-system.md` — ID vật phẩm chỉ cần khác ID vật phẩm khác, không cần khác ID kỹ năng |
| Tập ID đã tồn tại | `existing_id_set` | set(string) | — | Nội dung gốc + custom trước đó (trừ entry đã xóa qua Rule #11 — ID giải phóng), CÙNG `namespace`, nạp lại runtime tại thời điểm submit |
| Danh sách thức kèm kỹ năng | `thuc_ids` | list(string) | `len ≥ 1` | Invariant "N≥1 thức/kỹ năng" của `equipment-skill-data-system.md` — bắt buộc, không có kỹ năng mồ côi |
| Kết quả | `is_valid_custom_id` | bool | `{0,1}` | `1` = ID hợp lệ, submit tiến hành; `0` = chặn, yêu cầu tự đổi ID (không tự động đổi tên) |

**Output Range:** Boolean.

**Example (pass):** `new_id="huyet_dan_cai_tien"`, `namespace=item`, không trùng `existing_id_set` → `true`.
**Example (fail — trùng nội dung gốc):** `new_id="huyet_dan"` (đã là 1 `item_id` gốc) → `false` — chặn, KHÔNG tự đổi tên.
**Example (fail — chuỗi rỗng):** `new_id=""` → `false`.
**Example (fail — kỹ năng 0 thức, mới):** `is_valid_skill_submit("phong_van_v2", [])` → `false` — bản gốc PASS (chỉ validate `skill_id`), tạo skill mồ côi Combat không có thức để gọi tên khi tường thuật.

**Edge cases:** tạo 1 kỹ năng kèm N thức trong CÙNG 1 lần submit → gọi `is_valid_custom_id` N+1 lần (1 cho `skill_id`, N cho từng `thuc_id`); các lần gọi `thuc` sau phải thấy các `thuc_id` mới vừa được lần trước chấp nhận trong cùng batch (chặn tự-trùng giữa 2 thức mới, không chỉ trùng dữ liệu cũ). So khớp phân biệt hoa/thường (mirror Formula 2 gốc — `"Huyet_Dan"` và `"huyet_dan"` là 2 ID khác nhau). ID của entry đã xóa (Rule #11) không còn trong `existing_id_set` — dùng lại hợp lệ.

**Rationale:** Tái dùng nguyên vẹn ngữ nghĩa uniqueness của Formula 2 (`equipment-skill-data-system.md`), chuyển từ kiểm tra CI/authoring-time sang runtime/submit-time — CỘNG cardinality gate tái dùng invariant N≥1 mà bản gốc bỏ sót dù cùng lớp ("input hợp lệ theo kiểu nhưng phá invariant hệ khác").

### D.5 — `is_deletable_custom_entry(entry)` *(mới 2026-08-13 — Rule #11)*

```
is_deletable_custom_entry(entry) =
    entry.created_by_hack                            // metadata nguồn, set khi tạo qua O-Customize
    AND NOT referenced_in_world_memory(entry)        // chưa từng xuất hiện trong tường thuật (World Memory)
    AND điều-kiện-theo-loại(entry):                  // sửa vòng 2 2026-08-13 — per-loại, xem Rule #11b
        item:  NOT was_ever_equipped(entry)          // chưa TỪNG trang bị (đổi tên từ is_equipped — ngữ nghĩa
                                                     // quá-khứ-hoàn-thành thành tên hàm, hết mơ hồ thì hiện tại)
        skill: NOT was_ever_resolved_in_combat(entry)  // "equipped" không có nghĩa cho skill trong data model nguồn
        thức:  NOT has_parent_skill_alive(entry)     // kỹ năng cha không tồn tại ngoài batch xóa này
```

**Output:** bool — `1` = nút xóa hiện và bấm được; `0` = nút mờ mực + lý do ngắn.

**Ràng buộc giao dịch** (vòng 2): xóa skill ⟹ gỡ ID khỏi `known_skill_ids` cùng giao dịch; cascade skill + N thức là all-or-nothing; toàn bộ đi qua vòng đời Rule #6a/6b/6c (xem Rule #11). `was_ever_equipped`/`was_ever_resolved_in_combat` cần marker per-entry bền vững — ràng buộc schema lên `equipment-skill-data-system.md`, thêm vào danh sách propagate.

**Lưu ý implement — coroutine contagion** (bổ sung 2026-08-13, `godot-specialist` review qua `/architecture-review`): `referenced_in_world_memory(entry)` là `await`-shaped (ADR-0005's convention chung cho cả 5 method Public Interface của World Memory — xem `adr-0005-world-memory-ram-residency.md` Implementation Guidelines, "coroutine contagion"). Hàm build danh sách nút xóa cho N entry custom trong Khu 3 (vòng lặp gọi D.5 cho từng entry) do đó cũng phải tự async-shaped (`await is_deletable_custom_entry(...)` từng entry) — không được gọi trực tiếp từ `_process()`/`_physics_process()`/`_draw()`/`_input()`. Khác với Rule #6a1 (đã đặc tả kỹ trình tự quanh `commit()` bất đồng bộ của Persistence), D.5's pseudocode ở trên không tự thể hiện tính chất này — ghi chú ở đây để implementer không bỏ sót, không cần sửa lại chính công thức D.5 (vẫn là predicate/pseudocode, không phải GDScript thật, giống D.1).

**Example:** item vừa tạo nhầm tên, chưa trang bị, chưa vào truyện → xóa được, ID giải phóng. Skill đã resolve trong 1 trận (hoặc World Memory có tường thuật nhắc tên) → KHÔNG xóa được — nó đã là một phần lịch sử thế giới (Pillar 2), rác-hay-không giờ là chuyện của quá khứ thật.

**Rationale:** Đóng mâu thuẫn create-only vs fantasy "thử nghiệm rẻ" (`game-designer` B-1, phân xử `creative-director`: giữ chung namespace theo quyết định user, thuốc đúng là cơ chế xóa). Điều kiện chưa-tham-chiếu đảm bảo xóa không bao giờ đục lỗ lịch sử thế giới — không xung đột Pillar 2. Vòng 2 giữ ngữ nghĩa CHẶT "chưa từng" cho item (phân xử `creative-director`: belt-and-suspenders rẻ cho đường equip-chưa-kịp-vào-tường-thuật; triết lý hệ này là trả giá bằng tính vĩnh viễn, không phải thủ tục — hướng nới thành "không ĐANG trang bị" ghi nhận ở Advisory, quyền quyết thuộc user).

## Edge Cases

*(Ghi chú lịch sử: mục này authored ở lean mode; bổ sung/sửa 6 mục
2026-08-13 sau review full.)*

- **Nếu số kỹ năng đã biết (gồm custom) vượt `max_known_skills_per_character=6`**
  (`equipment-skill-data-system.md`): **KHÔNG chặn submit** — knob đó là
  giả định UI/AI narration, không phải schema cap cứng. Panel hiển thị
  cảnh báo "vượt số kỹ năng khuyến nghị — AI có thể chọn kỹ năng kém
  tối ưu khi tường thuật combat", nhưng vẫn cho ghi.
- **Nếu custom skill có ít thức hơn `min_thuc_per_skill=3`** (knob
  authoring của `equipment-skill-data-system.md`; bổ sung vòng 2
  2026-08-13 — panel chính là "author kỹ năng mới tại runtime"):
  **KHÔNG chặn submit** — D.4 chỉ enforce invariant schema cứng N≥1;
  `min_thuc_per_skill` và `thuc_pool_sufficiency` (cần đủ thức cho
  `max_invocations_per_battle=5` trận dài) là ràng buộc chất lượng
  authoring, xử lý cùng pattern `max_known_skills`: hiển thị cảnh báo
  "dưới số thức khuyến nghị — AI sẽ phải lặp thức khi tường thuật trận
  dài", vẫn cho ghi.
- **Nếu custom item không khai `efficacy` hoặc khai ngoài `[0,1]`**:
  chặn submit — mirror đúng ràng buộc author-mandatory, không có
  default, của `equipment-skill-data-system.md` (item hồi phục).
- **Nếu custom skill có `weapon_type` không khớp vũ khí đang trang bị**:
  vẫn cho tạo — không phải lỗi. Skill chỉ đơn giản **không dùng được
  cho tới khi** trang bị đúng loại vũ khí, đúng luật đã áp dụng cho nội
  dung gốc (không có ngoại lệ riêng cho nội dung hack-tạo).
- **Nếu load lại 1 slot có `hack_mode_used_this_slot=true` trên thiết bị
  mà toggle đang OFF** (mặc định trên máy mới): dữ liệu đã ghi (level/
  stat/item/skill) **vẫn tải và hoạt động bình thường**, cùng code path
  với nội dung gốc — toggle chỉ gate quyền **mở panel chỉnh sửa tiếp**,
  không gate quyền đọc dữ liệu đã tồn tại. Cờ `hack_mode_used_this_slot`
  chỉ là dấu vết lịch sử, không phải điều kiện runtime.
- **Tương tác với Undo 1-lượt (Pillar 2)** — VIẾT LẠI 2026-08-13 (bản
  gốc sai sự thật kỹ thuật, xem review log): hack-write KHÔNG "vô hình"
  với Undo — ADR-0004 giữ snapshot lượt vừa xác nhận treo suốt cửa sổ
  Undo, và `restore_snapshot()` sẽ đè lên MỌI giá trị hiện tại, kể cả
  hack-write. Vì vậy Rule #6b: lần hack-ghi đầu tiên trong một cửa sổ
  Undo **hủy snapshot treo** → Undo lượt trước khóa vĩnh viễn ngay khi
  ghi. Sau đó: giá trị hack là baseline bình thường — snapshot của các
  lượt TIẾP THEO capture nó như mọi giá trị khác, và Undo các lượt sau
  hoạt động bình thường (rollback về baseline có hack). Cờ Rule #8 nằm
  ngoài mọi snapshot nên không bao giờ bị rollback.
- **Bypass gate tiến trình là CHỦ Ý** (mới 2026-08-13, `economy-designer`):
  ghi `level` nhảy qua ranh giới tier bỏ qua hoàn toàn
  `breakthrough_requirement_met` (điều kiện chỉ thỏa qua combat — Rule
  #6 GDD EXP) và bỏ qua cả `death_and_consequence_blocked` (phế đan
  điền — Rule #9 GDD EXP). Cả hai đều là hành vi chủ ý của "cửa sau",
  không phải gap. Hệ quả được chấp nhận: nội dung canon gắn với
  breakthrough thật sẽ không trigger cho tier hack-ghi; nhân vật phế
  đan điền vẫn hack-level được. **Ràng buộc cho downstream**: không hệ
  nào được suy luận "tiến trình hợp lệ / milestone đã đạt" từ
  `tier`/`level` hoặc `tier` của item/skill — muốn biết tiến trình có
  thật không, đọc `hack_mode_used_this_slot`.
- **Slot có `hack_mode_used_this_slot=true` không dùng làm dữ liệu
  validation** (mới 2026-08-13): các tầng kiểm chứng (b)/(c) của MVP/
  Vertical Slice (`game-concept.md` MVP Definition — tăng trưởng Hảo
  cảm tự nhiên, tốc độ đột phá thật) yêu cầu playthrough sạch; slot đã
  bật hack không đủ điều kiện làm nguồn dữ liệu cho các tầng đó. Tầng
  (a) — Khế Ước — được bảo vệ riêng bằng nhãn `hack_write` (Rule #6c).
- **Force-close vứt draft là CHỦ ĐÍCH** (mới 2026-08-13, `ux-designer`):
  khi panel force-close (D.1 mất điều kiện — đường phòng thủ, không
  reachable qua gameplay thật), mọi dữ liệu đang nhập dở bị bỏ, không
  cảnh báo, không lưu draft. Khác có chủ ý với tiền lệ ô API key của
  O-Set (tap ngoài lần đầu chỉ unfocus): ô API key bảo vệ input NGƯỜI
  DÙNG CHỦ ĐỘNG đóng nhầm; force-close ở đây do HỆ THỐNG kích hoạt ở
  một đường gần-như-không-xảy-ra, và dữ liệu panel là số liệu ngắn gõ
  lại được — chi phí đặc tả draft-preservation không xứng đáng. Đóng
  panel do người chơi (X/tap ngoài/Esc) cũng bỏ draft — nút "Hủy" là
  ngữ nghĩa mặc định của mọi đường thoát không-phải-Lưu. *(Siết vòng 2
  2026-08-13: riêng tap-ngoài/Esc khi có field đang focus áp luật 2
  bậc — lần 1 chỉ unfocus/ẩn bàn phím, lần 2 mới là Hủy; xem UI
  Requirements "Đường thoát & bàn phím". Cử chỉ ẩn-bàn-phím trên
  Mobile Web không mang ý định hủy, và lập luận "số liệu ngắn gõ lại
  được" không đúng cho Khu 3 — luật 2 bậc chặn đường mất-draft-do-cử-chỉ
  mà không đổi ngữ nghĩa Hủy.)*
- **Nếu người chơi bấm 1 nút Lưu 2 lần liên tiếp nhanh (double-tap)**:
  nút tự khóa ngay sau lần bấm đầu tiên cho tới khi ghi xong (debounce
  chuẩn `SUBMIT_DEBOUNCE_MS`, áp **per-nút** — 3 nút Lưu độc lập, cùng
  pattern khóa input đệ quy đã dùng ở `core-ui-screen-navigation.md`
  D.1) — tránh ghi đè 2 lần hoặc race condition. Trong khoảng khóa,
  nút hiển thị disabled-state mờ mực 0.38 (không khóa âm thầm).
- **Sau khi ghi, giá trị hack-injected được coi là sự thật như mọi giá
  trị khác** trong toàn bộ gameplay logic (Combat, Death & Consequence,
  NPC Affinity...) — không có cờ "giả"/"tạm" nào được theo dõi riêng ở
  tầng cơ học; nhân vật hack-boost vẫn có thể chết thật theo đúng luật
  Cái Chết ở ngưỡng thù địch sâu sắc, không có miễn trừ. (Metadata
  `created_by_hack` của Rule #11 chỉ phục vụ gate xóa, không hệ
  gameplay nào đọc nó để phân nhánh.)
- **Panel chỉ thao tác trên `char_id` của nhân vật chính đang active
  trong slot** — không có UI nào cho phép chọn NPC khác làm mục tiêu
  ghi, dù schema Equipment & Skill vốn keyed theo `char_id` tổng quát.

## Dependencies

**Hard — upstream (hệ này không hoạt động được nếu thiếu):**

| Hệ | Vì sao hard | Interface cụ thể |
|---|---|---|
| Core UI/Screen Navigation | Cần state machine overlay có sẵn để host O-Customize; cần đọc `screen`/`tm_state`; cần chuẩn ẩn/mờ-mực | Đọc `screen=S2`, `tm_state`; cung cấp overlay O-Customize (Rule #1, #2, D.1); ánh xạ ẩn/mờ Rule #1b |
| Turn Manager + ADR-0004 | Cần đọc `tm_state` + `is_death_turn` để gate; cần interface MỚI `invalidate_pending_snapshot()` (Rule #6b) — **cần amendment phạm vi 3 nơi**: ADR-0004 + `turn-manager.md` + registry `undo_availability_window` (conjunct `pending_snapshot_valid`) | Đọc `tm_state`, `is_death_turn` (D.1); hủy snapshot treo ở hack-write/xóa đầu tiên trong cửa sổ Undo; không gửi action/không tiêu lượt (Rule #6d) |
| Combat System | Cần đọc `in_combat` để khóa cứng (Rule #9) | Đọc `in_combat` (D.1) |
| EXP & Realm Progression | Ghi bộ ba `(level, current_exp, state)`, phải tôn trọng derive `tier`, `exp_threshold`, enum `state` D.7 | Giao dịch nguyên tử D.2b (Rule #3, #10) |
| Character Card & Identity | Ghi 12 `base_X0`, phải tôn trọng `base_stat_completeness_check` (D.5); đọc `get_base_X0` pre-fill | Ghi `base_X0_map` (Rule #4, D.3); đọc pre-fill Khu 2 |
| Equipment & Skill Data System | Ghi custom item/skill/thức, tôn trọng uniqueness (Formula 2) + cardinality N≥1; xóa entry custom | Ghi item/skill(N≥1 thức)/thức (Rule #5, D.4); xóa (Rule #11, D.5) |
| Persistence / Save System | Cần checkpoint ghi-bền-vững THỨ 3 "hack-write commit" — **amendment Core Rule #1 bên đó** ("Auto-save duy nhất tại 2 checkpoint" → 3); field mới bắt buộc bump `schema_version`; `hack_mode_used_this_slot` trong slot bundle NGOÀI mọi snapshot; toggle device-level ngoài slot bundle | Write-through atomic mỗi submit (Rule #6a); ghi cờ (Rule #8) |
| World Memory | Cần đọc để gate xóa (entry đã xuất hiện trong tường thuật chưa) | `referenced_in_world_memory(entry)` (Rule #11, D.5) |
| Log trạng thái cơ học (Required for MVP #6) | Schema log phải có field nguồn để nhận nhãn `hack_write` — ràng buộc thiết kế lên schema đó | Entry nhãn `hack_write` mỗi submit (Rule #6c) |

**Soft — downstream (bị ảnh hưởng gián tiếp khi dữ liệu thay đổi, không
cần phối hợp trực tiếp):** Situation/Encounter Generation (đọc `level`
cho ngưỡng chênh 20 cấp — không cần biết giá trị đến từ hack mode hay
gameplay thật), NPC Affinity (không trực tiếp, chỉ qua kết quả combat
nếu có). Kèm ràng buộc chung cho MỌI downstream: không suy luận
"tiến trình hợp lệ" từ `tier`/`level` (xem Edge Cases).

**⚠️ Phụ thuộc một chiều CẦN xử lý** (vi phạm "Dependencies must be
bidirectional", `coding-standards.md`/`design-docs.md`): các GDD hard-
dependency ở trên đều đã **Approved** và **không hề biết tới hệ thống
này** — `core-ui-screen-navigation.md` chưa có O-Customize trong bảng
States/overlay; `exp-realm-progression.md`, `character-card-identity.md`,
`equipment-skill-data-system.md`, `persistence-save-system.md`,
`world-memory-context-management.md` đều chưa liệt kê hệ này ở
Dependencies của chính chúng. **Sau review vòng 1 + vòng 2 (đều 2026-08-13), danh sách propagate mở
rộng**: (i) amendment `persistence-save-system.md` Core Rule #1
(checkpoint thứ 3) — kèm ràng buộc danh tính bản ghi Rule #6a2 (KHÔNG
dùng khóa `[slot_id, world_time]` của turn record; record type
riêng/`hack_seq`/flush full-snapshot; bảo toàn thứ tự replay); (ii)
amendment ADR-0004 (`invalidate_pending_snapshot()`) — **phạm vi 3
nơi** (vòng 2): ADR-0004 + `turn-manager.md` + registry formula
`undo_availability_window` thêm conjunct `pending_snapshot_valid`;
(iii) `core-ui-screen-navigation.md` AC-59a/59b — thêm
"hack-invalidate" vào danh sách nguyên nhân biến mất của nút Undo
(Rule #6b); (iv) `equipment-skill-data-system.md` — marker per-entry
bền vững `was_ever_equipped` (item) / `was_ever_resolved_in_combat`
(skill) cho gate xóa D.5, và ngữ nghĩa gỡ `known_skill_ids` khi xóa
skill; (v) `world-memory-context-management.md` — interface
`referenced_in_world_memory(entry)` phải là structural
entity-reference (tag entity-id tại thời điểm tường thuật), KHÔNG
phải text-match theo tên hiển thị — nếu không, gate xóa có false
negative → xóa được entry đã vào truyện, đục lỗ lịch sử đúng thứ
Pillar 2 cấm; (vi) registry housekeeping — thêm hệ này vào
`referenced_by` của `tier_from_level`/`exp_threshold`/
`undo_availability_window`/`min_thuc_per_skill`/
`max_known_skills_per_character`/`deep_hostility_threshold`/
`HOSTILE_INITIATIVE_LEVEL_GAP_MAX` trong `design/registry/entities.yaml`
(`STAT_WRITE_MAX` đã đăng ký trực tiếp vòng 2). Gap cùng dạng đã xảy ra 14 lần
trước với các hệ khác (xem lịch sử "Phát hiện từ `/design-system` hệ
#N" trong `systems-index.md`) — cần chạy `/propagate-design-change`
sau khi GDD này hoàn tất để cascade đúng.

## Tuning Knobs

| Knob | Mặc định | Safe Range | Ảnh hưởng nếu thấp quá / cao quá |
|---|---|---|---|
| `LEVEL_WRITE_MAX` | 1,000,000 | 1,000 – 10,000,000 | **Thấp quá**: chặn cả những giá trị testing hợp lý (VD muốn test level 5,000 để xem UI hiển thị bậc lớn). **Cao quá (vượt safe range)**: mất tác dụng vệ sinh input — không còn chặn được lỗi đánh máy thừa số 0. *(Sửa 2026-08-13: bỏ mệnh đề "Combat đã tự bảo vệ bằng `FLOOR_TOTAL`" — sai kỹ thuật, xem D.2 Rationale; không có cơ chế combat nào chặn hệ quả của level cực lớn.)* Lưu ý gián tiếp *(REWRITE vòng 2 2026-08-13 — bản vòng 1 viết NGƯỢC CHIỀU công thức)*: gate `hostile_initiative_allowed = (level(npc) − level(player) ≤ 20) OR provoked` là gate MỘT CHIỀU bảo-vệ-người-chơi — chỉ chặn NPC cao hơn player quá 20 cấp. Hack level CAO **không** tắt hostile initiative (mọi gap thành số âm ≤ 20 → NPC nào cũng được phép gây sự, chỉ bị nghiền bởi `gap_realm` khi đánh thật); thứ thực sự tắt nhánh này là hack level **THẤP** + stat cao ("thần cấp 1") — mọi NPC cao hơn 20+ cấp bị chặn initiative, và ambient encounter (dải `[player−15, player+15]`) bị kẹp theo level thấp. Đây là bypass gate bảo-vệ-người-chơi CÓ CHỦ Ý, cùng họ với "Bypass gate tiến trình" ở Edge Cases |
| `STAT_WRITE_MAX` *(mới 2026-08-13)* | 1,000,000,000 | 1,000,000 – 1e12 | **Thấp quá**: chặn seed stat hợp lý cho testing cực trị. **Cao quá**: tiến gần giới hạn float64, các phép nhân downstream (`stat_growth`, tổng Lực chiến) có nguy cơ tràn — knob này tồn tại để giữ mọi phép tính ở dải hữu hạn, cùng vai trò `LEVEL_WRITE_MAX`, KHÔNG phải cân bằng (đóng Open Question #3) |
| `SUBMIT_DEBOUNCE_MS` | 500ms | 200 – 1000ms | **Thấp quá**: double-tap vẫn lọt qua, rủi ro race condition ghi đè (xem Edge Cases). **Cao quá**: cảm giác nút phản hồi chậm, người chơi tưởng nút không hoạt động. Áp **per-nút** (3 nút Lưu độc lập) |
| `hack_mode_toggle_default` | `false` (OFF) | `{true, false}` — cố định, không phải dải số | Đây là giá trị mặc định lúc cài đặt mới, không phải "quá cao/quá thấp" — đổi giá trị này tương đương đổi chính sách "tính năng ẩn theo mặc định" của toàn hệ, không phải tuning cân bằng |

Không định nghĩa lại `max_known_skills_per_character` (đã thuộc
`equipment-skill-data-system.md`) — hệ này chỉ tham chiếu, không sở
hữu (xem Edge Cases: vượt ngưỡng đó chỉ cảnh báo, không chặn).

## Visual/Audio Requirements

*(Ghi chú: `art-director` không được tham vấn khi authoring — category
"Gameplay" không nằm trong danh sách bắt buộc của skill. Review
2026-08-13 khuyến nghị: khóa token màu cụ thể tại `/ux-design` với
art-director sign-off — vì đây là bề mặt DUY NHẤT được thiết kế để
"phá vỡ" theme gốc, rủi ro dev tự chọn màu vô tình đụng đỏ son/xanh
ngọc cao hơn bình thường.)*

**Nguyên tắc chủ đạo**: O-Customize phải **chủ động phá vỡ** Visual
Identity Anchor "Mực Chưa Khô" của toàn game (khớp Player Fantasy —
"phản-fantasy"). Cụ thể:
- **Không** dùng khung/viền mép mực loang hữu cơ — dùng border thẳng,
  góc vuông, kiểu bảng điều khiển/công cụ kỹ thuật.
- **Không** dùng nền giấy dó kem/trắng ngà — dùng nền trung tính khác
  biệt rõ (VD xám nhạt hoặc tối, tùy theo theme UI kỹ thuật của
  Godot), để không thể nhầm với 1 trang truyện.
- **Không** dùng 2 màu accent đã "khẩu phần hóa" của thế giới thật (đỏ
  son = trọng thương/chết, xanh ngọc = đột phá cảnh giới) cho bất kỳ
  yếu tố nào trong panel — tránh gây hiểu nhầm "thế giới vừa đổi thật"
  khi thực chất là thao tác hack. Nếu cần 1 accent riêng, dùng màu
  trung tính khác (VD xám/cam kỹ thuật) chưa từng dùng ở nơi khác —
  token cụ thể chốt ở `/ux-design`.
- Chữ số liệu **không cần** đặt trong khung con dấu (quy tắc "mọi con
  số phải minh họa bằng nét mực" chỉ áp dụng cho thế giới thật) — hiển
  thị dạng field nhập liệu chuẩn (input box), đúng tinh thần "công cụ",
  không phải "tường thuật".
- Riêng trạng thái **mờ mực** của nút/điều khiển bị khóa tạm thời
  (Rule #1b, nút Lưu trong debounce, nút xóa bị chặn) vẫn dùng đúng
  chuẩn `alpha=0.38` chung toàn game — đây là ngữ pháp tương tác, không
  phải ngôn ngữ tường thuật, nên không thuộc diện "phá vỡ".

**Audio**: không cần SFX riêng — khớp `game-concept.md` Technical
Considerations ("Audio Needs: Tối thiểu"). Nếu game sau này có SFX
UI chung (click/confirm), panel dùng lại đúng bộ đó, không cần âm
thanh đặc trưng riêng.

## UI Requirements

**Toggle (trong O-Set, nhóm mới "Tùy chỉnh nhân vật")**:
- 1 dòng switch on/off, label rõ ràng (VD "Bật chế độ tùy chỉnh nhân
  vật (hack mode)"), kèm 1 dòng mô tả ngắn cảnh báo hệ quả (không thể
  hoàn tác tự động, minh bạch vĩnh viễn trên slot, hack-ghi sẽ khóa
  Undo lượt trước) — hiển thị NGAY DƯỚI switch, không cần dialog xác
  nhận riêng (khớp tinh thần "tự chịu trách nhiệm", không phải "chặn
  bằng thủ tục" — giữ nguyên sau phân xử review 2026-08-13: KHÔNG thêm
  dialog, tai nạn chính là tính năng).
- Khi vừa bật ON, hiện thêm 1 dòng micro-copy discoverability (mới
  2026-08-13): "Đóng Cài đặt và mở lại từ Màn chơi chính để thấy nút
  Chỉnh sửa nhân vật." — vì toggle và nút nằm ở 2 ngữ cảnh khác nhau,
  bật xong không thấy gì đổi tại chỗ.
- Vị trí: nhóm thứ 3 trong O-Set, sau "Cỡ chữ" và "Cấu hình AI" —
  không thay thế 2 nhóm hiện có.

**O-Customize (overlay panel)** — 3 khu vực rõ ràng, không cuộn ngang,
**mỗi khu 1 nút "Lưu" riêng** (quyết định user 2026-08-13, thay cho 1
nút chung — mental model rõ, lỗi khu nào hiện khu đó, không cần
dirty-tracking; panel KHÔNG tự đóng sau submit):
1. **Khu Tiến trình** (mở rộng 2026-08-13 từ "Khu Cấp độ" — Rule #10):
   field `level` (số nguyên, bắt buộc khi lưu khu), field `current_exp`
   (tùy chọn — mặc định 0 nếu đổi level, giữ nguyên nếu không), chọn
   `state` (2 giá trị D.7, mặc định "Tu Luyện Thường"; lựa chọn "Chờ
   Đột Phá" chỉ bấm được khi bất biến chéo D.2b thỏa — mờ mực kèm lý
   do nếu không). Hiển thị `tier` derive real-time bên cạnh (read-only)
   để người chơi thấy ngay hệ quả trước khi lưu. Nút "Lưu tiến trình".
2. **Khu 12 chỉ số cơ bản**: lưới 12 field nhập (khớp `STAT_FIELDS_12`
   — key kỹ thuật theo `character-card-identity.md`, nhãn hiển thị
   tiếng Việt thống nhất do `/ux-design` chốt), **pre-fill giá trị
   `base_X0` hiện tại khi mở panel** (Rule #4 — người chơi chỉ sửa
   field cần đổi). Validate inline (viền đỏ + thông báo ngắn nếu
   âm/HP=0/non-finite) chỉ kích hoạt **sau first-interaction/blur của
   TỪNG field** — không chạy khi panel vừa render (tránh mở panel là
   thấy dàn viền đỏ). Field bị xóa trống → coi là `undefined`, chặn
   lưu khu (không coerce về 0). Nút "Lưu chỉ số".
3. **Khu Vật phẩm/Kỹ năng tùy chỉnh**: form tạo mới — chọn loại (Vật
   phẩm/Kỹ năng/Thức), các field theo đúng schema
   `equipment-skill-data-system.md` (item: `item_id`+`efficacy`; skill:
   `weapon_type`+`tier`+`family_id`+`style_descriptor` **+ tối thiểu 1
   thức trong cùng form** — cardinality Rule #5; thức: tên + thuộc 1
   skill). Validate ID trùng hiển thị NGAY khi rời field (không đợi
   submit). Đổi loại giữa chừng: draft của TỪNG loại giữ riêng trong
   cùng lần mở panel — đổi qua lại không mất dữ liệu đã gõ (mới
   2026-08-13). Kèm **danh sách entry custom đã tạo trong slot**
   (read-only reference — giảm tạo trùng gần-giống) với nút xóa
   per-entry theo D.5 (đủ điều kiện: bấm được; không đủ: mờ mực + lý
   do; nội dung gốc không có nút). Nút "Lưu vật phẩm/kỹ năng".

**Chung cho cả 3 khu**: mỗi nút Lưu áp `SUBMIT_DEBOUNCE_MS=500ms`
per-nút, tự khóa + hiển thị disabled-state mờ mực 0.38 trong khoảng
khóa (và toàn bộ nút Lưu/xóa/Undo khóa trong cửa sổ in-flight — Rule
#6a1). Lỗi validate của khu nào hiển thị trong khu đó — khu khác không
bị ảnh hưởng, không có ngữ nghĩa "lưu bán phần" xuyên khu (mỗi nút chỉ
ghi khu của nó, mỗi lần ghi là 1 giao dịch nguyên tử riêng).

**Feedback thành công** (bổ sung vòng 2 2026-08-13 — trước đó đặc tả
kỹ feedback lỗi mà 0 dòng cho thành công, lỗ đúng vào trụ cột "biết
mình vừa làm gì"): mỗi submit/xóa `committed()` hiển thị xác nhận
**trong khu vừa thao tác** (VD dòng trạng thái "Đã ghi" — tồn tại tới
khi field trong khu bị sửa tiếp, không tự biến mất theo timer); nếu
thao tác đó là hack-write ĐẦU TIÊN trong cửa sổ Undo (Rule #6b vừa
invalidate), xác nhận kèm 1 dòng "Undo lượt trước đã khóa". Copy chính
xác chốt ở `/ux-design`.

**Cảnh báo khóa-Undo tại chỗ** (bổ sung vòng 2 — khoảnh khắc hệ quả
xảy ra, nút Undo nằm ngoài tầm mắt; micro-copy dưới toggle đọc 1 lần
nhiều ngày trước là không đủ): khi panel đang mở VÀ snapshot Undo đang
treo (`undo_available=true`), hiển thị 1 dòng trạng thái cạnh 3 nút
Lưu: "Lưu bất kỳ khu nào sẽ khóa vĩnh viễn Undo của lượt trước" —
live re-evaluate cùng pattern Rule #1b, biến mất khi không còn snapshot
treo. Đây là THÔNG TIN, không phải dialog chặn — nhất quán phán quyết
vòng 1 "không chặn bằng thủ tục".

**Badge cờ minh bạch** (bổ sung vòng 2 — cờ Rule #8 trước đó không có
bề mặt hiển thị nào; "cờ minh bạch không ai thấy là telemetry"): slot
có `hack_mode_used_this_slot=true` hiển thị badge/dấu hiệu nhận biết
tại **danh sách chọn slot** và một chỉ báo tĩnh kín đáo ở S2; dùng
accent kỹ thuật của panel — TUYỆT ĐỐI không đỏ son/xanh ngọc (khớp
Visual/Audio Requirements). Vị trí/hình thức cụ thể chốt ở
`/ux-design`.

**Đường thoát & bàn phím** (bổ sung vòng 2 — B9): khi có field đang
focus (bàn phím ảo đang mở trên mobile), **tap-ngoài/Esc lần 1 CHỈ
unfocus field/ẩn bàn phím, lần 2 mới đóng panel** (= Hủy, bỏ draft) —
áp nguyên tiền lệ ô API key của O-Set: tap-ngoài trên Mobile Web là cử
chỉ ẩn-bàn-phím chuẩn, không mang ý định hủy; panel này dày đặc field
số nên đường mất-draft-do-cử-chỉ phải chặn. Nút X đóng ngay (hành động
tường minh). Bàn phím vật lý: **Tab traversal đủ mọi
field/nút/nút-xóa theo thứ tự đọc, không keyboard trap; Enter trong 1
field = submit KHU CHỨA field đó** (tương đương bấm nút Lưu của khu,
tôn trọng debounce); Esc theo luật 2 bậc trên. Thứ tự tab chi tiết +
`inputmode` thuộc `/ux-design`.

Nút "Hủy"/tap-ngoài-lần-2/Esc-lần-2/X đóng panel không lưu gì (draft
bị bỏ — xem Edge Cases).

**Touch target**: mọi field/nút trong panel tuân `TOUCH_TARGET_MIN=44px`
(registry constant, đã dùng ở `core-ui-screen-navigation.md`) — cùng
chuẩn toàn game, không có ngoại lệ cho panel "kỹ thuật" này.

**Responsive**: touch-primary device → 1 cột dọc (khớp D.5 rule của
`core-ui-screen-navigation.md` — mọi touch-primary luôn 1-column bất
kể chiều rộng màn hình); desktop/mouse-primary có thể xếp Khu 2 (12
chỉ số) thành lưới 2-3 cột để đỡ cuộn dài — khi đó chừa sẵn khoảng
trống cố định cho error text dưới mỗi field (kể cả khi không lỗi) để
tránh reflow lệch hàng khi validate inline bật (mới 2026-08-13).

*(Đây là yêu cầu ở mức GDD — bố cục ASCII wireframe, spacing chi tiết,
copy chính xác từng dòng, token màu accent kỹ thuật, `inputmode` bàn
phím số cho field số trên mobile, thứ tự tab desktop thuộc phạm vi
`/ux-design`, chạy sau khi GDD này Approved.)*

## Acceptance Criteria

*(Đề xuất bởi `qa-lead` khi authoring; viết lại/bổ sung 2026-08-13
theo vòng review full — AC-08/18/21/23/27/28/30 rewrite, thêm
AC-33→AC-43. Phân loại theo bảng Story Type của `coding-standards.md`:
D.1–D.5 và hầu hết AC là **Logic/Integration → BLOCKING**, test file
tại `tests/unit/character-customization-mode/` (naming
`character_customization_[feature]_test.gd`, hàm
`test_[scenario]_[expected]`) và
`tests/integration/character-customization-mode/`. Chỉ AC-32 là
**Visual/Feel → ADVISORY**, bằng chứng screenshot + lead sign-off tại
`production/qa/evidence/character-customization-mode/`.)*

**Ghi chú test setup**: mọi phụ thuộc ngoài phải inject qua mock/fixture
— không gọi hệ thật, không AI, không mạng, không đồng hồ thật, không
random không-seed (RNG mock seed cố định ở AC-30). Hằng số của chính hệ
này: `LEVEL_WRITE_MAX=1,000,000`, `STAT_WRITE_MAX=1,000,000,000`,
`SUBMIT_DEBOUNCE_MS=500ms`, `hack_mode_toggle_default=false`. Hằng
số/formula tham chiếu từ hệ khác, chia 2 nhóm ĐÚNG SỰ THẬT nguồn
*(REWRITE vòng 2 2026-08-13 — bản vòng 1 claim cả danh sách "import
qua entities.yaml" trong khi ~7 tên không có entry registry nào; test
writer sẽ đi tìm export không tồn tại)*:
- **Đã đăng ký `design/registry/entities.yaml`** (import qua registry,
  không định nghĩa lại): `tier_from_level` (source
  `exp-realm-progression.md` Core Rule #1), `exp_threshold`,
  `deep_hostility_threshold=-80`, `HOSTILE_INITIATIVE_LEVEL_GAP_MAX=20`,
  `max_known_skills_per_character=6`, `min_thuc_per_skill=3`,
  `undo_availability_window` (gồm cờ `is_death_turn` dùng ở D.1);
  của chính hệ này: `LEVEL_WRITE_MAX`, `STAT_WRITE_MAX` (đăng ký
  2026-08-13).
- **Import trực tiếp từ GDD/ADR nguồn (CHƯA có entry registry)**: enum
  `state` D.7 (EXP & Realm Progression); `get_base_X0`,
  `base_stat_completeness_check` D.5, `STAT_FIELDS`
  (Character Card & Identity); Formula 2 `is_valid_dataset`,
  cardinality N≥1, `weapon_type` gate AC-14, `known_skill_ids`
  (Equipment & Skill Data System); `gap_realm` (Combat System D.1);
  `DEATH_ROLL_MAX=0.95` (Death & Consequence);
  `capture_snapshot`/`restore_snapshot`/`invalidate_pending_snapshot`
  (ADR-0004, interface mới qua amendment — xem precondition AC-34).
  *(Đã bỏ `PENALTY_PER_TIER`/`FLOOR_TOTAL` khỏi danh sách import —
  không AC nào dùng, tàn dư rationale FLOOR_TOTAL đã gỡ.)*

### 1. Truy cập 2 lớp & `customize_panel_available` — D.1 (Core Rule #1)

- [ ] **AC-01** [Unit] Ma trận đầy đủ 120 tổ hợp (2×5×3×2×2 của `toggle_enabled`×`screen`×`tm_state`×`in_combat`×`is_death_turn`): `customize_panel_available` chỉ `true` khi CẢ 5 điều kiện đồng thời thỏa; 119 tổ hợp còn lại `false`. *(Vòng 2 2026-08-13: thêm chiều `is_death_turn` — ma trận cũ 60/59 mở rộng thành 120/119.)*
- [ ] **AC-02** [Integration — DEFENSIVE, mock-only] GIVEN O-Customize đang mở hợp lệ, WHEN mock injection ép `in_combat=true` (bơm thẳng cờ — đường này KHÔNG reachable qua gameplay thật, xem D.1 Edge cases), THEN panel đóng NGAY — không chỉ disable nút bên trong; draft đang nhập bị bỏ không cảnh báo (Edge Cases).
- [ ] **AC-03** [Integration] GIVEN O-Set mở từ `screen=S1`, `toggle_enabled=true`, WHEN dựng O-Set, THEN nút "Chỉnh sửa nhân vật" **không render** (ẩn hoàn toàn — bất khả dụng cấu trúc, Rule #1b).
- [ ] **AC-41** [Integration — mới; +case (d) vòng 3] Ánh xạ ẩn/mờ + live re-evaluate: (a) GIVEN S2, toggle ON, `tm_state=resolving`, WHEN dựng O-Set, THEN nút render **mờ mực `alpha=0.38`**, không bấm được; (b) WHEN `tm_state` chuyển `awaiting_action` trong khi O-Set vẫn mở, THEN nút chuyển bấm được TẠI CHỖ (không cần đóng/mở lại O-Set); (c) GIVEN toggle OFF cùng điều kiện, THEN không render; (d) *(mới vòng 3 2026-08-13 — trước đó nhánh `in_combat=true` không có AC render-level nào, khiến claim "trạng thái mờ mực" của AC-20 không có backing)* GIVEN S2, toggle ON, `tm_state=awaiting_action`, `in_combat=true`, WHEN dựng O-Set, THEN nút render **mờ mực `alpha=0.38`**, không bấm được (hàng `in_combat` của bảng Rule #1b — khóa tạm thời, hết trận mở lại).

### 2. O-Customize là overlay thứ 3 (Core Rule #2)

- [ ] **AC-04** [Unit] GIVEN O-Card đang mở, WHEN mở O-Customize (gọi hàm trực tiếp — đường UI thật đi qua O-Set, xem AC-43), THEN O-Card đóng NGAY trước khi O-Customize mở; ≤1 overlay có `open=true` tại mọi thời điểm trong {O-Card, O-Set, O-Customize}.
- [ ] **AC-43** [Integration — mới, đường THẬT duy nhất] GIVEN O-Set đang mở từ S2 với nút "Chỉnh sửa nhân vật" bấm được, WHEN bấm nút, THEN O-Set đóng NGAY trước khi O-Customize mở; không thời điểm nào 2 overlay cùng `open=true`.
- [ ] **AC-05** [Integration] Chiều ngược lại: mở O-Set/O-Card khi O-Customize đang mở → O-Customize đóng trước; không có thời điểm nào 2 overlay cùng `open=true`.

### 3. Ghi tiến trình — D.2/D.2b (Core Rule #3, #10)

- [ ] **AC-06** [Unit] GIVEN các giá trị `{1, 50, 0, -5, 3.5, 1000000, 1000001, "", "abc", NaN}`, WHEN chạy `is_valid_level_write`, THEN kết quả đúng lần lượt: `1=true, 50=true, 0=false, -5=false, 3.5=false, 1000000=true, 1000001=false, ""=false, "abc"=false, NaN=false`.
- [ ] **AC-35** [Unit — REWRITE vòng 2 2026-08-13, miền float + bất biến hai chiều; +2 fixture vòng 3] D.2b `is_valid_progress_write`: `(50,0,"Tu Luyện Thường",25)=true`; `(10,exp_threshold(10),"Chờ Đột Phá",9)=true` — dev-seed Chờ Đột Phá hợp lệ; `(25,200,"Tu Luyện Thường",25)=true` — no-op giữ EXP; `(25,123.45,"Tu Luyện Thường",25)=true` — EXP float lẻ hợp lệ (nhân vật thật tích lũy passive float); `(50,exp_threshold(50)+1,·,·)=false`; `(25,340,"Tu Luyện Thường",25)=false` — exp đúng ngưỡng ở level không-mốc, trạng thái bất khả tồn tại; `(10,exp_threshold(10),"Tu Luyện Thường",9)=false` — chiều ⟸ bất biến hai chiều; `(11,exp_threshold(11),"Chờ Đột Phá",·)=false` — level không tròn chục; `(10,5,"Chờ Đột Phá",·)=false` — EXP chưa chạm trần; `(25,-1,·,·)=false`; `(25,Infinity,·,·)=false` — miền float hữu hạn ≥0. *(2 fixture mới vòng 3 2026-08-13 — chặn đúng 2 phản ví dụ verify hẹp phát hiện, mỗi fixture fail qua đúng conjunct mới thêm, không fail nhờ conjunct khác):* `(25,200,"Chờ Đột Phá",25)=false` — state "Chờ Đột Phá" ở level không-mốc (exp 200 hợp lệ, chỉ state sai); `(50,exp_threshold(50)+1,"Tu Luyện Thường",25)=false` — exp vượt ngưỡng tại mốc với state thường (iff hai-vế-cùng-sai không còn cứu được).
- [ ] **AC-07** [Integration] GIVEN cây UI O-Customize, THEN không có field nào gắn với `tier` (chỉ `level`). WHEN 1 giao dịch tiến trình hợp lệ commit, THEN `tier` tính lại đúng `tier=floor((level-1)/10)+1` — kiểm 3 biên: `level=1→tier=1`, `level=10→tier=1`, `level=11→tier=2`.
- [ ] **AC-08** [Integration — REWRITE vòng 2 2026-08-13: bỏ `tier` khỏi payload (Rule #3 cấm GHI tier — payload là BỘ BA đúng Rule #10; assertion tier derive đã có ở AC-07), sửa fixture exp] GIVEN nhân vật `level=25, current_exp=200, state="Tu Luyện Thường"` và spy gắn vào API ghi, WHEN submit `level=50` (không nhập exp/state), THEN API ghi được gọi **ĐÚNG 1 LẦN** với payload gộp `{level:50, current_exp:0, state:"Tu Luyện Thường"}` — không phải nhiều lệnh ghi tách rời, KHÔNG chứa field `tier`; NẾU implementation phát signal (VD `level_changed`), spy nối vào signal PHẢI đọc được `current_exp=0` ngay tại thời điểm handler chạy (không phải giá trị cũ 200).
- [ ] **AC-36** [Integration — sửa fixture vòng 2] Gate no-op: GIVEN `level=25, current_exp=200, state="Tu Luyện Thường"`, WHEN submit `level=25` (trùng, không nhập exp/state), THEN `current_exp` giữ nguyên `200` — KHÔNG reset. Nhánh giữ-state: GIVEN nhân vật `level=10, current_exp=exp_threshold(10), state="Chờ Đột Phá"`, WHEN submit no-op `level=10` (không chọn state), THEN `state` VẪN là "Chờ Đột Phá" — không bị đá về mặc định "Tu Luyện Thường" *(nhánh dễ hỏng nhất của điền-mặc-định, bổ sung vòng 2)*.

### 4. Ghi 12 chỉ số cơ bản — D.3 (Core Rule #4)

- [ ] **AC-09** [Unit] GIVEN 4 ca — (a) đủ 12/12, `HP=120`, còn lại ≥0 hữu hạn → `true`; (b) 11/12 (thiếu `Lifesteal`) → `false`; (c) đủ 12/12 nhưng `HP=0` → `false`; (d) đủ 12/12 nhưng `ATK=-5` → `false`, WHEN chạy `is_valid_base_stat_set`, THEN khớp đúng cả 4.
- [ ] **AC-37** [Unit — mới] Miền non-finite/trần: `ATK=Infinity → false`; `HP=NaN → false`; input `"1e999"` (parse tràn thành `inf`) → `false`; `ATK=STAT_WRITE_MAX → true` (biên trên hợp lệ); `ATK=STAT_WRITE_MAX×10 → false`. Field bị xóa trống → map về `undefined` → `false` (thiếu key), KHÔNG được coerce thành `0.0` — assert giá trị `0` chủ đích vẫn `true` để phân biệt.
- [ ] **AC-10** [Integration] GIVEN chỉ điền 11/12 field, WHEN bấm "Lưu chỉ số", THEN bị chặn (spy write=0) — entity record giống hệt trước/sau (không ghi bán phần).
- [ ] **AC-11** [Unit] GIVEN `base_X0_map` đủ 12 key bắt buộc CỘNG 1 key lạ (VD `"Luck"`), WHEN chạy `is_valid_base_stat_set`, THEN `false` (equality check, không phải superset-check).
- [ ] **AC-42** [Integration — mới] Pre-fill: GIVEN nhân vật có bộ `base_X0` bất kỳ, WHEN mở O-Customize, THEN 12 field Khu 2 chứa ĐÚNG giá trị `get_base_X0(char_id, X)` hiện tại; validate inline KHÔNG kích hoạt trước first-interaction (0 viền đỏ khi panel vừa render).

### 5. Custom ID uniqueness + cardinality — D.4 (Core Rule #5)

- [ ] **AC-12** [Unit] GIVEN `new_id="huyet_dan_cai_tien"` (không trùng, `namespace=item`)→`true`; `new_id="huyet_dan"` (trùng gốc)→`false`; `new_id=""`→`false`, WHEN chạy `is_valid_custom_id`, THEN khớp đúng cả 3.
- [ ] **AC-13** [Unit] GIVEN `existing_id_set` chứa `"huyet_dan"`, WHEN test `new_id="Huyet_Dan"`, THEN `true` — phân biệt hoa/thường (mirror Formula 2 gốc).
- [ ] **AC-14** [Unit] GIVEN `existing_id_set` của `namespace=item` chứa `"phong_van"`, WHEN test `new_id="phong_van"` với `namespace=skill`, THEN `true` — 2 pool ID tách biệt.
- [ ] **AC-15** [Integration] GIVEN 1 lần submit tạo 1 `skill_id`+2 `thuc_id` cùng lúc, WHEN `thuc_id` thứ 2 trùng `thuc_id` thứ 1 VỪA được chấp nhận trong CÙNG batch, THEN submit bị chặn — `is_valid_custom_id` gọi đúng N+1 lần, lần sau thấy ID mới vừa chấp nhận.
- [ ] **AC-38** [Integration — mới] Cardinality: GIVEN form tạo kỹ năng với 0 thức, WHEN bấm "Lưu vật phẩm/kỹ năng", THEN bị chặn (`is_valid_skill_submit=false`, spy write=0) — không tạo skill mồ côi.
- [ ] **AC-16** [Integration] GIVEN `new_id` trùng ID đã tồn tại, WHEN submit, THEN KHÔNG tự sinh ID thay thế — không ghi nào xảy ra.

### 6. Vòng đời write path (Core Rule #6)

- [ ] **AC-17** [Integration] GIVEN Turn Manager mock `tm_state=awaiting_action, world_time=T`, WHEN submit bất kỳ ghi hợp lệ nào, THEN không action nào gửi tới Turn Manager, `world_time` giữ nguyên `T`, `tm_state` giữ nguyên, không có AI call nào (spy=0).
- [ ] **AC-33** [Integration — mới, Rule #6a] GIVEN Persistence mock, WHEN 1 submit hợp lệ commit, THEN Persistence nhận ĐÚNG 1 lệnh write-through atomic NGAY tại commit (không chờ checkpoint lượt); WHEN mô phỏng kill app ngay sau commit + reload slot, THEN giá trị hack-ghi còn nguyên.
- [ ] **AC-34** [Integration — REWRITE vòng 2 2026-08-13, Rule #6b] **Precondition: AC này chỉ implement được SAU khi amendment 3-nơi được chấp thuận** (ADR-0004 `invalidate_pending_snapshot()` + `turn-manager.md`/registry `undo_availability_window` thêm conjunct `pending_snapshot_valid`) — không nhặt story chứa AC này trước khi amendment chốt. GIVEN `undo_available=true` (snapshot lượt N đang treo), WHEN hack-write đầu tiên `committed()` (Rule #6a1), THEN `invalidate_pending_snapshot()` được gọi, hậu-điều-kiện `undo_available=false` NGAY lập tức, nút Undo **biến mất theo pattern `undo-button`** (tween ≤150ms rồi gỡ node — KHÔNG phải mờ mực); WHEN cố gọi Undo qua API sau đó, THEN bị từ chối, giá trị hack còn nguyên. Hack-write THỨ HAI trong cùng cửa sổ: hậu-điều-kiện không đổi (`invalidate` idempotent hoặc không gọi lại — assert hậu-điều-kiện, không đếm call). Nhánh không-có-snapshot-treo: GIVEN `undo_available=false` sẵn (chưa có lượt confirm nào), WHEN hack-write commit, THEN `invalidate_pending_snapshot()` KHÔNG được gọi (call-count=0), không lỗi nào phát sinh.
- [ ] **AC-40** [Integration — sửa vòng 2, Rule #6c] GIVEN log trạng thái cơ học mock, WHEN N **thao tác commit** (submit HOẶC xóa — sửa từ "N submit") trong 1 phiên, THEN log nhận đúng N entry mang nhãn nguồn `hack_write` (ngoài chỉ mục lượt; thao tác xóa kèm loại `delete` + định danh entry); không tồn tại hack-write nào tạo entry thiếu nhãn — mọi thay đổi trạng thái giữa 2 snapshot lượt đều truy được nguồn.

### 7. Vĩnh viễn, không hoàn tác tự động (Core Rule #7)

- [ ] **AC-18** [Integration — REWRITE 2026-08-13] GIVEN panel O-Customize, THEN không có control Undo/revert nào trong panel. GIVEN 1 hack-write vừa commit trong cửa sổ Undo của lượt N, THEN Undo lượt N đã bị khóa (AC-34 — bản gốc AC này giả định "hack không nằm trong snapshot nào" là sai sự thật kỹ thuật, xem review log). GIVEN lượt N+1 xác nhận SAU hack-write, WHEN Undo lượt N+1, THEN rollback về baseline CÓ hack (giá trị hack là một phần snapshot lượt N+1 như mọi giá trị khác).

### 8. Cờ minh bạch không thể xóa (Core Rule #8)

- [ ] **AC-19** [Integration] GIVEN slot mới `hack_mode_used_this_slot=false`, WHEN lần ghi ĐẦU TIÊN qua O-Customize commit, THEN `→true` trong CÙNG checkpoint write-through (AC-33). WHEN toggle device-level tắt VÀ app reload, THEN cờ vẫn `true`. WHEN `capture_snapshot()`/`restore_snapshot()` của mọi hệ đã đăng ký chạy (mock đủ vòng), THEN cờ KHÔNG xuất hiện trong bất kỳ blob snapshot nào và không bao giờ bị rollback (Rule #8 ràng buộc kỹ thuật).

### 9. Khóa cứng khi combat (Core Rule #9)

- [ ] **AC-20** cross-reference AC-01, AC-02, AC-41 — nhánh `in_combat=true` đã phủ bởi ma trận D.1 + hành vi force-close (defensive) + trạng thái mờ mực; không test lặp.

### 10. Cross-system

- [ ] **AC-21** [Integration — REWRITE 2026-08-13, output-equivalence] GIVEN 2 fixture `tier=2` cho `self` — 1 từ hack-write, 1 từ mock đạt qua gameplay thật (cùng giá trị) — và NPC đối thủ `tier=5` CHUNG, WHEN gọi `gap_realm(self)` cho cả 2, THEN 2 kết quả BẰNG NHAU (`=max(0,5-2)=3`) VÀ spy call-trace xác nhận CÙNG 1 hàm `gap_realm()` được gọi ở cả 2 case; khung "con dấu" chênh lệch cảnh giới trên Card xuất hiện đúng.
- [ ] **AC-22** [Integration] GIVEN hack-ghi đủ 12/12 `base_X0`, WHEN mở O-Card, THEN cả 12 giá trị khớp CHÍNH XÁC, đọc qua CÙNG interface `get_base_X0(char_id, X)` dùng cho dữ liệu gameplay thật.
- [ ] **AC-23** [Integration — REWRITE 2026-08-13] GIVEN custom item hợp lệ (`efficacy∈[0,1]`, ID không trùng) và 1 item nội dung gốc có cùng bộ giá trị field, WHEN cả 2 được trang bị và resolve trong combat với CÙNG input, THEN spy xác nhận CÙNG hàm resolve được gọi và output identical.
- [ ] **AC-24** [Integration — REWRITE vòng 2 2026-08-13, sửa chiều] GIVEN hack-ghi `level` cho nhân vật chính, WHEN scheduler tính `hostile_initiative_allowed = (level(npc) − level(player) ≤ 20) OR provoked` với `level` hack-ghi, THEN đọc CHÍNH XÁC như gameplay thật, kiểm đúng chiều một-chiều của gate: (a) player hack THẤP, `level(npc) − level(player) = 19` → `true`; (b) player hack THẤP, `= 21` → `false` (NPC cao hơn quá 20 cấp bị chặn initiative); (c) player hack CAO, gap âm (VD `= −30`) → `true` — level cao KHÔNG miễn nhiễm initiative (mirror AC-18 của `situation-encounter-generation.md`).

### 11. Edge Cases

- [ ] **AC-25** [Integration] GIVEN nhân vật đã có đúng 6 kỹ năng (`max_known_skills_per_character=6`), WHEN tạo thêm kỹ năng thứ 7, THEN submit THÀNH CÔNG + hiển thị cảnh báo — KHÔNG bị chặn.
- [ ] **AC-47** [Integration — mới vòng 2, mirror AC-25] GIVEN form tạo kỹ năng với 1 hoặc 2 thức (≥1, dưới `min_thuc_per_skill=3`), WHEN bấm "Lưu vật phẩm/kỹ năng", THEN submit THÀNH CÔNG + hiển thị cảnh báo "dưới số thức khuyến nghị" — KHÔNG bị chặn (chỉ 0 thức mới chặn, AC-38).
- [ ] **AC-26** [Unit] GIVEN `efficacy∈{undefined,-0.1,0,0.5,1.0,1.1}`, WHEN validate, THEN: `undefined=chặn, -0.1=chặn, 0=cho phép, 0.5=cho phép, 1.0=cho phép, 1.1=chặn`.
- [ ] **AC-27** [Integration — REWRITE 2026-08-13] GIVEN custom skill `weapon_type=kiếm` khi đang trang bị `weapon_type=quyền`, WHEN submit, THEN tạo THÀNH CÔNG; WHEN dùng skill đó lúc vẫn trang bị sai loại, THEN kết quả khớp ĐÚNG assertion cụ thể của AC-14 `equipment-skill-data-system.md` (skill không khả dụng — cùng input cho ra cùng output với skill gốc sai-vũ-khí, spy xác nhận cùng hàm gate).
- [ ] **AC-28** [Integration — REWRITE 2026-08-13] GIVEN slot `hack_mode_used_this_slot=true`, toggle device `=false`, WHEN load slot, THEN kết quả khớp ĐÚNG các assertion đã có ở AC-22/AC-23/AC-24 (get_base_X0 trả đúng giá trị, item resolve đúng, level đọc đúng cho scheduler — không thêm claim "hoạt động đúng" mơ hồ); VÀ nút "Chỉnh sửa nhân vật" không render (assert render=false).
- [ ] **AC-29** [Integration] GIVEN bấm 1 nút Lưu 2 lần trong `SUBMIT_DEBOUNCE_MS=500ms`, WHEN trace, THEN đúng 1 lần ghi commit; nút hiển thị disabled-state mờ 0.38 trong khoảng khóa.
- [ ] **AC-30** [Integration — REWRITE 2026-08-13] GIVEN nhân vật hack-boost cực đoan và đối thủ có `affinity ≤ deep_hostility_threshold(-80)`, WHEN Death & Consequence resolve với RNG mock seed cố định và `DEATH_ROLL_MAX=0.95`, THEN kết quả chết/sống KHỚP BIT-IDENTICAL với cùng seed chạy trên nhân vật đạt trạng thái đó qua gameplay thật (mock) — không nhánh `if hack_mode` nào trong call trace.
- [ ] **AC-31** [Integration] GIVEN O-Customize đang mở, THEN không có control nào cho phép chọn `char_id` khác ngoài nhân vật chính đang active.
- [ ] **AC-39** [Unit + Integration — REWRITE vòng 2 2026-08-13, Rule #11/D.5] (a) GIVEN entry custom chưa-tham-chiếu (item: chưa từng trang bị; skill: chưa từng resolve trong combat; đều chưa vào World Memory), WHEN xóa, THEN xóa thành công, ID biến mất khỏi `existing_id_set` — tạo lại entry mới CÙNG ID → hợp lệ; với skill: ID đồng thời biến mất khỏi `known_skill_ids` trong cùng giao dịch (không dangling ref); (b) GIVEN item đã từng trang bị / skill đã từng resolve trong combat / entry đã xuất hiện trong World Memory (mock), THEN nút xóa mờ mực, cố gọi xóa qua API → từ chối, không ghi nào xảy ra; (c) GIVEN entry nội dung gốc, THEN không render nút xóa; (d) [vòng đời Rule #6 — mới] GIVEN xóa hợp lệ commit, THEN: Persistence nhận đúng 1 write-through (mirror AC-33), snapshot treo bị invalidate nếu đang có (mirror AC-34), log nhận entry nhãn `hack_write` loại `delete` (đếm vào AC-40), nút xóa tôn trọng debounce (mirror AC-29); (e) [cascade all-or-nothing — mới] GIVEN skill có 2 thức trong đó 1 thức đã vào World Memory (mock), WHEN xóa skill, THEN chặn TOÀN BỘ — skill và cả 2 thức còn nguyên, không xóa bán phần.
- [ ] *(Edge case "Undo × hack-write" — cross-reference AC-18/AC-34, không test lặp.)*

### 12. Player Fantasy — ngôn ngữ hình ảnh (phản-fantasy)

- [ ] **AC-32** [Manual] GIVEN O-Customize đang mở, THEN nền/khung/iconography KHÔNG tái sử dụng Visual Identity Anchor của S2/S4/S4-RO/S5 (mực loang, con dấu, marginalia) — screenshot + lead sign-off xác nhận khác biệt nhận ra được ngay bằng mắt. *(screenshot + lead sign-off, `production/qa/evidence/character-customization-mode/`)*

### 13. Bổ sung vòng 2 (2026-08-13) — bàn phím, feedback, minh bạch

- [ ] **AC-44** [Integration — mới, mirror tiền lệ AC-70 core-ui] Bàn phím: (a) Tab traversal chạm đủ MỌI control của panel (mọi field 3 khu, 3 nút Lưu, nút xóa per-entry, X) theo thứ tự đọc, không keyboard trap; (b) GIVEN focus đang trong 1 field của Khu N, WHEN Enter, THEN kích hoạt đúng nút Lưu của Khu N (tôn trọng debounce — spy xác nhận không gọi nút Lưu khu khác); (c) Esc lần 1 khi field đang focus → chỉ unfocus, panel còn mở; Esc lần 2 → đóng panel (Hủy); (d) tap-ngoài mirror đúng (c) trên touch.
- [ ] **AC-45** [Integration — mới, B6 feedback] GIVEN submit hợp lệ `committed()`, THEN khu vừa lưu hiển thị xác nhận "Đã ghi" và xác nhận tồn tại cho tới khi 1 field trong khu bị sửa (không biến mất theo timer); GIVEN thao tác đó là hack-write đầu tiên trong cửa sổ Undo, THEN xác nhận kèm dòng "Undo lượt trước đã khóa"; GIVEN snapshot Undo đang treo và panel mở, THEN dòng cảnh báo cạnh 3 nút Lưu render và biến mất live khi snapshot không còn treo (mock đổi `undo_available`).
- [ ] **AC-46** [Integration + Manual — mới, B6 badge] GIVEN slot `hack_mode_used_this_slot=true`, WHEN render danh sách chọn slot và S2, THEN badge/chỉ báo cờ hiển thị ở cả 2 nơi (assert render=true); GIVEN slot cờ `false`, THEN không render. Màu accent thuộc kiểm tra thị giác AC-32.

### Gap Analysis (cập nhật vòng 2 2026-08-13)

- **Vòng 2 đã dùng AC-44→AC-47** (bàn phím, feedback, badge, min_thuc)
  — slot AC cho `/ux-design` (bố cục panel, copy literal, tab order chi
  tiết) dời thành **AC-48+**.
- **Advisory vòng 2 còn treo** (creative-director A1-A11, xem review
  log): nới điều kiện xóa item (quyền quyết user), payload-compare
  no-op, HP floor chống subnormal, trim/trần độ dài ID, case phế-đan-điền
  + tier vượt thang canon, thức custom attach skill gốc, uid 2 thế hệ
  trong log, AC draft-giữ-riêng Khu 3, toggle vào live-signal, bàn phím
  ảo auto-scroll-into-view, propagate `open_customize` vào GAP-4 core-ui.

- ~~Không AC nào phủ "1 nút Lưu, 3 khu"~~ — **đã giải quyết**: mô hình đổi thành 3 nút riêng (quyết định user), mỗi khu tự chứa AC của mình.
- **AC-25** chỉ test hành vi "không chặn submit", không khóa literal copy cảnh báo (chưa có UI copy doc riêng — Open Question #4).
- **AC-27** phụ thuộc `equipment-skill-data-system.md` AC-14 không đổi — rủi ro doc-drift giữa 2 GDD nếu bên đó được review lại (Open Question #5).
- **Cố ý KHÔNG** thêm AC cho việc bump `schema_version` — nghĩa vụ của `persistence-save-system.md`; nhưng LƯU Ý amendment checkpoint thứ 3 (Rule #6a) sẽ cần AC mới BÊN ĐÓ khi propagate.
- AC biên Safe Range của knob (`SUBMIT_DEBOUNCE_MS` 200/1000, `LEVEL_WRITE_MAX`, `STAT_WRITE_MAX` khi tune khác default) chưa có — chấp nhận (Safe Range là khuyến nghị tune, không phải invariant), nhưng nên có 1 AC xác nhận formula đọc từ knob thay vì hardcode khi implement.
- Khi `/ux-design` chạy (Open Question #6), bổ sung AC-48+ (đổi từ AC-44+ — vòng 2 đã dùng tới AC-47) cho bố cục panel cụ thể (vị trí toggle, layout 12 field + reserved error space, thông báo lỗi inline, danh sách custom + nút xóa, micro-copy discoverability, copy literal các dòng feedback/cảnh báo mới của vòng 2).
- Nếu `/propagate-design-change` sau này đổi shape các interface mà AC-08/19/21-24/33/34 coi là đã ổn định (`get_base_X0`, `tier_from_level`, `gap_realm`, `hack_mode_used_this_slot`, `invalidate_pending_snapshot`), các AC cross-system này cần review lại đồng bộ.

## Open Questions

1. **Phụ thuộc một chiều chưa cascade** (owner: `technical-director`,
   target: trước khi implement) — các GDD Approved upstream chưa biết
   hệ này tồn tại; sau review vòng 1 + vòng 2 (2026-08-13) danh sách
   đầy đủ: amendment `persistence-save-system.md` Core Rule #1
   (checkpoint thứ 3, Rule #6a + ràng buộc danh tính khóa #6a2),
   amendment ADR-0004 **phạm vi 3 nơi** (`invalidate_pending_snapshot()`
   + `turn-manager.md` + registry `undo_availability_window` conjunct
   `pending_snapshot_valid`, Rule #6b), `core-ui-screen-navigation.md`
   AC-59a/59b (nguyên nhân biến mất "hack-invalidate"), ràng buộc
   schema log Required-for-MVP #6 (nhãn `hack_write` + loại `delete`,
   Rule #6c/#11), `equipment-skill-data-system.md` (marker
   `was_ever_equipped`/`was_ever_resolved_in_combat`, gỡ
   `known_skill_ids` khi xóa skill), World Memory (interface
   `referenced_in_world_memory` — BẮT BUỘC structural entity-ref,
   không text-match), reword nghĩa "tier−1 = số lần đột phá thành
   công" trong `exp-realm-progression.md` D.5, registry housekeeping
   (`referenced_by` — xem Dependencies (vi)). Cần chạy
   `/propagate-design-change` (xem Dependencies).

2. **Giới hạn cho build công khai trong tương lai** (owner:
   `creative-director`, target: trước khi cân nhắc public release,
   KHÔNG chặn MVP) — game hiện là dự án cá nhân, phi thương mại,
   người chơi duy nhất là nhà phát triển (`game-concept.md`). Nếu dự
   án sau này công khai/chia sẻ, cần quyết định có nên gate/loại bỏ
   hack mode khỏi build công khai hay giữ nguyên như 1 tính năng
   chính thức.

3. ✅ **ĐÃ ĐÓNG 2026-08-13** — ~~`base_X0` không có trần trên~~: thêm
   `STAT_WRITE_MAX` (trần vệ sinh kỹ thuật, mirror `LEVEL_WRITE_MAX`)
   + điều kiện `is_finite()` vào D.3. Rationale cũ ("Combat đã tự bảo
   vệ bằng `FLOOR_TOTAL`") xác nhận SAI kỹ thuật và đã gỡ — hack stat
   lớn-nhưng-hữu-hạn vẫn được phép (chủ ý), chỉ chặn lớp lỗi kỹ thuật
   non-finite/tràn.

4. **AC-25 chưa khóa văn bản cảnh báo chính xác** (owner:
   `ux-designer`, target: khi chạy `/ux-design` cho O-Customize) —
   cần UI copy doc riêng để test literal string, hiện AC chỉ test
   hành vi "không chặn submit".

5. **AC-27 phụ thuộc `equipment-skill-data-system.md` AC-14 không
   đổi** (owner: `qa-lead`, target: theo dõi lần review kế tiếp của
   GDD đó) — rủi ro doc-drift nếu AC-14 bên đó được sửa mà không
   cascade về đây.

6. **`/ux-design` cho O-Customize chưa chạy** (owner: `ux-designer`,
   target: sau khi GDD này Approved) — UI Requirements ở mục trên chỉ
   ở mức GDD; wireframe/copy/interaction map chi tiết, token màu
   accent kỹ thuật (art-director sign-off), nhãn 12 field tiếng Việt
   thống nhất, `inputmode` mobile, tab order desktop đều thuộc phạm
   vi đó.
