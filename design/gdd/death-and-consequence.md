# Death & Consequence

> **Status**: **Approved** (round 2/2 `/design-review` — pass xác minh hẹp hoàn tất 2026-08-09, 1 blocking + 3 recommended sửa cùng phiên, round-cap mechanically-heavy đóng ở đây, user xác nhận Approved qua `AskUserQuestion` — xem `reviews/death-and-consequence-review-log.md`). **Cascade nhỏ cùng ngày**: Nhánh A bước c thêm trigger "Khóa slot" (Persistence) — sửa từ `/design-review character-continuation.md` round 1, đóng 1 blocking cross-GDD (xem Nhánh A bước c + `character-continuation.md` Core Rule #1/#5).
> **Author**: user + agents
> **Last Updated**: 2026-08-09
> **Implements Pillar**: Pillar 3 (Sức Mạnh Có Logic), Pillar 2 (Hệ Quả Thực Sự)
> **Creative Director Review (CD-GDD-ALIGN)**: Hoàn tất qua `/design-review` round 1 full mode (senior synthesis), 2026-08-09

## Overview

Death & Consequence là hệ sở hữu duy nhất quyết định điều gì xảy ra SAU KHI
nhân vật chính thua một trận đấu: nó đọc tín hiệu "đã thua" từ Combat System,
đối chiếu với ngưỡng thù địch sâu sắc (`affinity ≤ -80`) do NPC Affinity cung
cấp, rồi khóa MỘT trong hai loại kết quả — cái chết thật (không thể cứu,
không ngoại lệ, kể cả AI) hoặc một hậu quả nghiêm trọng không gây chết (trọng
thương, ép uống độc, sỉ nhục trước đám đông, phế đan điền/võ công) — trước
khi AI được phép tường thuật lại. Hệ này cũng là chủ sở hữu duy nhất của cờ
`alive(X)`/`death_flag_[char]` mà Setting & Canon Integration cần để phán
quyết premise-break, và của `is_death_turn` mà Turn Manager cần để khóa Undo
vĩnh viễn ngay khi cái chết thật xảy ra. Về mặt người chơi, đây chính là nơi
Core Fantasy "không ai cho không bạn điều gì" trở thành rủi ro cụ thể, đo
lường được — không phải một cảnh cắt (cutscene) trang trí.

## Player Fantasy

*(Cập nhật 2026-08-09: `creative-director` ĐÃ tham vấn qua `/design-review`
full mode round 1 — anchor Player Fantasy được rà bởi `game-designer`
[forced_severe làm mờ tín hiệu kỹ năng, phế đan điền không đổi stat khi
Character Card lộ ra] và `creative-director` synthesis. Xem
`reviews/death-and-consequence-review-log.md`.)*

Người chơi phải cảm nhận TRỌNG LƯỢNG thật của rủi ro trước khi giao chiến
với một kẻ thù thù địch sâu sắc — một cảm giác lo lắng có căn cứ, không phải
sợ hãi mơ hồ, vì ranh giới -80 Hảo cảm luôn đọc được qua Thẻ Nhân Vật trước
khi hành động (đúng tinh thần "an toàn có luật" mà Situation/Encounter
Generation đã xác lập). Khi thua không dẫn đến chết, hậu quả phải cảm thấy
THẬT và ĐAU nhưng không phải ngõ cụt — trọng thương/phế đan điền là một cái
giá phải trả, một câu chuyện mới để viết tiếp (tìm đại cơ duyên khôi phục),
không phải một màn hình Game Over. Khi cái chết thật xảy ra, đó phải là một
cú sốc THẬT SỰ — không có nút "thử lại" ẩn giấu nào cứu được, kể cả AI —
nhưng game vẫn tiếp tục có ý nghĩa qua Quỷ tu/Chuyển sinh/Chơi lại, đúng
nguyên tắc "lưới an toàn nằm ở việc tiếp tục sống có ý nghĩa sau khi chết,
không phải ở việc né tránh cái chết" (`game-concept.md`, mục Cái Chết).

## Detailed Design

*(Cập nhật 2026-08-09: rà bởi `game-designer`/`narrative-director`/
`ux-designer`/`qa-lead` qua `/design-review` full mode round 1 — xem
`reviews/death-and-consequence-review-log.md`.)*

### Core Rules

1. **Phạm vi kích hoạt**: Death & Consequence resolve trong lượt CHỈ KHI
   Combat System phát hand-off với `battle_active=false` VÀ
   `outcome.type ∈ {win, lose}` (KHÔNG áp dụng khi `outcome.type="no_outcome"`
   — bỏ chạy, hoặc (CHỈ khi `is_spar_friendly=true`) chạm trần kỹ thuật
   `TECHNICAL_EXCHANGE_CAP`; trận KHÔNG giao hữu chạm trần này luôn bị ép
   tiebreak thành `win`/`lose` — không bao giờ ra `no_outcome` qua đường
   đó, đúng Core Rule #8(d)/D.9c đã khóa ở `combat-system.md`; tên hằng
   số cập nhật 2026-08-05 theo đổi tên `MAX_EXCHANGE_COUNT` →
   `TECHNICAL_EXCHANGE_CAP`/`CONTENT_EXCHANGE_ESTIMATE` 2026-08-03) VÀ
   `is_spar_friendly=false` (bổ sung 2026-08-05, đóng gap `/design-review`
   gộp 11 GDD — giao hữu KHÔNG BAO GIỜ kích hoạt Death & Consequence, kể
   cả khi Combat vẫn ra `win`/`lose` bình thường cho trận giao hữu không
   cân sức; tránh thua 1 trận đấu tập vô tình kích hoạt máy chết thật)
   VÀ một trong hai bên là nhân vật chính. Không xử lý combat NPC-vs-NPC
   (không tồn tại trong phạm vi MVP).

2. **Thứ tự trong lượt**: Death & Consequence resolve NGAY SAU khi Combat
   khóa hand-off, và TRƯỚC NPC Affinity (để `kill_witnessed` phát ra kịp
   cho pipeline `resolve_turn_affinity` cùng lượt) và TRƯỚC Setting &
   Canon Integration (đúng ràng buộc đã khóa bên đó: "SAU Combat/Death &
   Consequence/NPC Affinity, TRƯỚC resolve_turn_exp").

3. **Nhánh A — Nhân vật chính THUA** (`outcome.type="lose"`, loser=nhân
   vật chính):
   a. Đọc `affinity(đối thủ)` hiện hành (giá trị ĐẦU lượt, trước khi NPC
      Affinity áp delta của chính lượt này) qua interface public của NPC
      Affinity.
   b. Nếu đối thủ KHÔNG phải NPC có Hảo cảm theo dõi (VD quái vật/thú
      hoang tương lai): mặc định coi `affinity=0` (an toàn, không đạt
      ngưỡng thù địch sâu sắc) — xem Edge Cases.
   c. Nếu `affinity(đối thủ) ≤ deep_hostility_threshold` (registry, `-80`,
      bao gồm): chạy **Formula D.1 (death_roll)**. Nếu kết quả = chết:
      khóa `alive(nhân vật chính)=false`, `death_flag_player=true`,
      `turn.is_death_turn=true`, **TRIGGER trực tiếp thao tác Persistence
      "Khóa slot"** (bổ sung 2026-08-09, `/design-review
      character-continuation.md` round 1 — sửa lại điểm quy thuộc: trước
      đây "Khóa slot" chờ tới khi người chơi chọn "Chơi lại" mới chạy,
      khiến slot vẫn "đang chơi dở" trong toàn bộ thời gian
      `Awaiting Continuation Choice`; nếu người chơi đóng tab ở đúng lúc
      này và mở lại game, họ rơi vào 1 slot có `alive=false` không có
      lối thoát nào — hệ này giờ khóa slot NGAY khi chết thật được xác
      nhận, TRƯỚC KHI bàn giao, để `Awaiting Continuation Choice` LUÔN
      diễn ra trên nền 1 slot đã khép; xem `persistence-save-system.md`
      bảng Thao tác + `character-continuation.md` Core Rule #1/#5 và Edge
      Case #1), rồi bàn giao cho Character Continuation (hệ #13) — KHÔNG
      chạy tiếp bước d. Nếu kết quả = sống sót: đặt cờ nội
      bộ `forced_severe=true` — vừa thoát chết trước thù địch sâu sắc
      thì không thể chỉ là "trọng thương nhẹ" — rồi tiếp tục bước d.
      **`forced_severe` mặc định `false` và LUÔN reset về `false` ở đầu
      MỖI LẦN Nhánh A chạy, TRƯỚC khi bước c có cơ hội set lại** (bổ
      sung 2026-08-08, `/design-review` round 1 — biến cục bộ trong
      phạm vi ĐÚNG 1 lần resolve, KHÔNG persist giữa các lượt/trận khác
      nhau; nếu implement thành field không reset, một trận thua sau đó
      trước đối thủ vô hại có thể bị ăn ké `forced_severe=true` còn sót
      từ trận trước — xem AC-42).
   d. Chạy **Formula D.2 (severity_tier)** theo `margin_ratio` (từ
      hand-off Combat) để chọn 1 trong 4 loại hậu quả không-chết. Nếu
      `forced_severe=true` (từ bước c): kết quả D.2 bị ÉP CỨNG thành
      `severe`, bỏ qua bảng ngưỡng margin thông thường. Khóa
      `death_and_consequence_blocked(nhân vật chính) = true` nếu tier =
      severe (phế đan điền/võ công); các tier khác không đặt cờ chặn
      EXP.

      **Bổ sung 2026-08-09 (`/design-review` round 1, theo lựa chọn của
      user — giữ nguyên cơ chế ép severe, bù lại tín hiệu margin đã bị
      xóa cho narration)**: khi `forced_severe=true`, hệ này VẪN xuất
      thêm 1 trường `forced_severe_margin_ratio = margin_ratio` (giá
      trị GỐC trước khi bị ép, KHÔNG phải giá trị D.2 tính lại) đi kèm
      `consequence_type` — CHỈ dùng làm ngữ cảnh cho narration (Mechanic/
      Narration Contract truyền xuống AI), KHÔNG ảnh hưởng D.3/EXP/bất
      kỳ formula cơ học nào khác. Mục đích: dù tier cơ học luôn khóa
      `severe` bất kể margin, AI vẫn phân biệt tường thuật được "suýt
      thắng nhưng vẫn bị phế" (`forced_severe_margin_ratio` thấp) khỏi
      "bị nghiền và may mắn sống sót" (`forced_severe_margin_ratio`
      cao) — đóng finding game-designer "forced_severe xóa tín hiệu
      kỹ năng". Trường này CHỈ có mặt khi `forced_severe=true`; các
      trường hợp severity=severe thường (không qua forced_severe) không
      cần trường này vì `margin_ratio` gốc đã trực tiếp quyết định tier.
      **Làm rõ 2026-08-09 (`/design-review` round 2, đóng finding
      "cosmetic-only fix" của `creative-director`/`game-designer` —
      round 1 chỉ khai ý định, chưa nối dây thật)**: `forced_severe_margin_ratio`
      là MỘT PHẦN `locked_result` của lượt đó (đúng pattern
      `consequence_type_[char_id]`/`consequence_witnesses_[char_id]` đã
      khai ở Interactions with Other Systems) — Mechanic/Narration
      Contract Enforcement (hệ #2, xem Dependencies bổ sung round 2) đọc
      trực tiếp field này từ `locked_result` khi dựng payload narration,
      cùng cơ chế Core Rule #4 của chính hệ đó (không lộ số thô, chỉ
      dùng làm ngữ cảnh định hướng văn phong). Xem AC-50.

4. **Nhánh B — Nhân vật chính THẮNG** (`outcome.type="win"`,
   winner=nhân vật chính): đối thủ bị đánh bại (HP=0) bước vào trạng
   thái tạm thời `pending_fate(npc_id)` đúng 1 lượt kế tiếp (xem States
   and Transitions). Turn Manager nhận 2 gợi ý hành động bổ sung từ hệ
   này trong lượt đó: "Kết liễu [NPC]" và "Tha mạng [NPC]" (nằm trong
   `suggested_action_count=4`, phối hợp với gợi ý khác nếu có); người
   chơi cũng có thể diễn đạt ý định qua input tự do (phân loại xác
   định, không qua AI — cùng pattern các hệ khác).
   - **Kết liễu**: khóa `alive(npc)=false`, `death_flag_[npc]=true`;
     phát sự kiện `kill_witnessed` (nạn nhân=npc,
     nhân chứng=`entities_in_scope(scene) \ {npc}`) cho NPC Affinity xử
     lý lan truyền. (Lưu ý bổ sung 2026-08-08: hành động Kết liễu VẪN
     undo được như mọi hành động khác trong lượt — Turn Manager Core
     Rule #8 cho phép sửa lỗi thao tác đúng 1 lượt gần nhất; NGOẠI LỆ
     DUY NHẤT không undo được là lượt chết thật của NHÂN VẬT CHÍNH
     [`is_death_turn=true`], không áp dụng cho việc Kết liễu NPC.)
   - **Yêu cầu hiển thị bắt buộc cho cửa sổ `Pending Fate`** (bổ sung
     2026-08-08, sửa câu chữ 2026-08-09 `/design-review` round 1 — đóng
     mâu thuẫn nội tại với bullet "Kết liễu" phía trên): quyết định này
     VẪN undo được bằng Turn Manager Undo như mọi hành động khác (đúng
     bullet "Kết liễu" ở trên, khớp AC-38/AC-39) — nhưng cửa sổ
     `Pending Fate` CHÍNH NÓ chỉ mở đúng 1 lượt và KHÔNG mở lại lần thứ
     2 một khi lượt đó đã xác nhận (dù sau đó có Undo hay không — Undo
     chỉ rollback state, không "mở lại" cửa sổ đã đóng theo lịch trình
     tự nhiên của lượt kế tiếp). Vì vậy cửa sổ PHẢI có tín hiệu tường
     minh rằng đây là quyết định có hạn đúng 1 lượt — tối thiểu 1 dòng
     nhắc kèm gợi ý (VD: "cơ hội cuối để quyết định số phận [NPC] TRONG
     LƯỢT NÀY") ngay khi cửa sổ mở, không chỉ dựa vào độ đậm chữ (xem UI
     Requirements). Mục đích: tránh người chơi vô tình mặc định "Tha
     mạng" mà không nhận ra mình vừa quyết định gì — KHÔNG phải vì Undo
     không tồn tại, mà vì cửa sổ ra quyết định đã trôi qua.
   - **Tha mạng** (mặc định — kích hoạt đúng tại thời điểm Turn Manager
     XÁC NHẬN lượt `pending_fate` đó mà người chơi không chọn "Kết
     liễu" tường minh, kể cả khi làm việc khác trong lượt — đúng
     Pillar 1, thế giới không tự giết thay người chơi): NPC bị đánh bại
     chịu **CÙNG bảng hậu quả không-chết**
     (Formula D.2, `margin_ratio` của chính trận đó) như khi nhân vật
     chính thua — không có bảng riêng cho NPC. Không có nhánh "NPC chết
     vì thua trận" — chỉ chết khi người chơi chủ động chọn Kết liễu.
     **Bổ sung 2026-08-09 (`/design-review` round 1, đóng finding
     "mild/medium không có khác biệt cơ học" của `creative-director`,
     theo lựa chọn của user)**: khi tier = `medium` (sỉ nhục/ép uống
     độc) áp cho NPC bại trận ở nhánh này, hệ này PHÁT thêm 1
     `classified_event(type="insult", victim=npc,
     witnesses=entities_in_scope(scene) \ {npc})` cho NPC Affinity xử
     lý — tái dùng NGUYÊN VẸN event type `insult` đã có sẵn ở
     `npc-affinity-relationship.md` D.1 (không thêm hằng số/event type
     mới, chỉ bổ sung nguồn phát cho event có sẵn), làm NPC bị sỉ nhục
     GIẢM Hảo cảm với nhân vật chính (oán hận từ việc bị làm nhục công
     khai) — khớp cùng quy ước witness "0 nhân chứng vẫn hợp lệ" đã
     dùng cho `kill_witnessed`. Nhánh A (nhân vật chính bị sỉ nhục)
     KHÔNG có delta tương ứng — game không theo dõi "Hảo cảm của nhân
     vật chính dành cho NPC" như 1 field cơ học (chỉ chiều NPC→nhân vật
     chính được theo dõi), nên ở Nhánh A hậu quả tier medium dừng ở
     tường thuật, đúng phạm vi hệ này. Xem AC-49.

     **Bổ sung 2026-08-09 (`/design-review` round 2, đóng finding
     "insult delta vô hình cho tới khi mở Character Card" —
     `game-designer`/`creative-director`, user chọn phương án A)**:
     delta Hảo cảm `insult` là số nội bộ (Contract Enforcement Core Rule
     #4 cấm lộ ra tường thuật, đúng `npc-affinity-relationship.md` UI
     Requirements — Character Card là nơi DUY NHẤT xem số), nhưng NGỮ
     CẢNH của sự kiện (dữ kiện, KHÔNG phải giá trị delta) — "NPC bị làm
     nhục công khai trước [số nhân chứng] người" — LÀ một phần
     `locked_result` cho payload narration (cùng cơ chế
     `forced_severe_margin_ratio` ở bước c). Mục đích: AI dựng được
     phản ứng của NPC bị sỉ nhục NGAY trong cảnh đó (nét mặt, câu nói,
     ánh nhìn) — hệ quả cơ học (delta) vẫn trì hoãn/không lộ số đúng
     kiến trúc Pillar 4, nhưng khoảnh khắc vẫn có trọng lượng CẢM ĐƯỢC
     tại bàn chơi, không chỉ tồn tại như 1 con số chờ người chơi tự mở
     thẻ NPC để phát hiện.

5. **Cờ `alive(X)` và `death_flag_[char_id]`**: hệ này SỞ HỮU DUY NHẤT 2
   field này cho MỌI nhân vật (chính + NPC). Mặc định `alive=true` khi
   nhân vật được tạo/xuất hiện lần đầu. Chỉ chuyển `false` qua Nhánh A
   bước c (chết thật) hoặc Nhánh B "Kết liễu" — KHÔNG có đường nào khác
   trong toàn bộ game được phép đổi 2 field này (đóng interface
   provisional mà Setting & Canon Integration chờ).

6. **Cờ `death_and_consequence_blocked(self)`**: boolean per-character,
   mặc định `false`. Đặt `true` khi severity tier = severe (phế đan
   điền/võ công). Chỉ gỡ qua **Formula D.3 (recovery_attempt)** thành
   công (xem Formulas) — không tự hết hạn theo thời gian.

   **Ghi chú thiết kế (sửa 2026-08-09, `/design-review` round 1 — thay
   thế ghi chú "không penalty" trước đó, quyết định user + creative-director)**:
   `death_and_consequence_blocked=true` giờ áp dụng CẢ 2 hệ quả: (1)
   chặn tích lũy EXP (qua `exp-realm-progression.md` Core Rule #9, áp
   dụng cho MỌI nhân vật có Character Card — kể cả NPC, xem Interactions
   with Other Systems), VÀ (2) **một penalty Lực chiến thật, có chủ đích
   giữ NHỎ**: Combat System (`combat-system.md` Formula D.1) đọc cờ này
   và nhân thêm 1 lớp `crippled_layer(C) = CRIPPLED_PENALTY_MULT` (knob
   mới, mặc định **0.85** — tương đương độ nặng đúng 1 bậc chênh lệch
   cảnh giới) vào `total_penalty_multiplier(C)`, cùng cơ chế và cùng
   sàn `FLOOR_TOTAL` với 2 lớp phạt cảnh giới/trang bị đã có sẵn — xem
   Dependencies. Vì đây là mức phạt NHỎ, CỐ ĐỊNH (không cộng dồn theo
   số lần thua liên tiếp — cờ chỉ có {true,false}, không có "độ sâu"),
   và luôn được sàn `FLOOR_TOTAL` bảo vệ khỏi về 0 tuyệt đối dù cộng dồn
   với phạt cảnh giới/trang bị nặng nhất, rủi ro death-spiral được GIẢM
   nhưng KHÔNG loại bỏ hoàn toàn — đây là đánh đổi CÓ CHỦ ĐÍCH, ưu tiên
   tính trung thực tường thuật hơn việc né hoàn toàn rủi ro
   death-spiral. Vì mức suy giảm giờ LÀ THẬT, KHÔNG còn cần ràng buộc
   narration đặc biệt nào — AI được phép mô tả trung thực nhân vật đang
   `death_and_consequence_blocked=true` "yếu đi/đánh kém hơn" khi điều
   đó phản ánh đúng `effective_stat` đã khóa, đúng kiến trúc chung của
   Mechanic/Narration Contract Enforcement (không cần interface mở rộng
   riêng — đóng gap "AC-46 kiểm chứng 1 artifact không tồn tại phía
   Mechanic/Narration Contract Enforcement" bằng cách loại bỏ chính yêu
   cầu đó, thay vì xây interface mới ở 1 doc đã Approved). Xem AC-46
   (đã nghỉ hưu — SUPERSEDED) và AC mới ở `combat-system.md`.

### States and Transitions

**A. Luồng giải quyết ngay sau trận** (transient, tối đa 1-2 lượt):

| State | Mô tả | Chuyển sang |
|---|---|---|
| Idle | Không có trận vừa kết thúc cần xử lý | → Resolving Loss / Resolving Win (khi Combat phát hand-off `lose`/`win`) |
| Resolving Loss | Đang chạy Nhánh A (death_roll nếu áp dụng, rồi severity_tier) | → Idle (đã khóa toàn bộ kết quả, có thể là Death Confirmed) |
| Death Confirmed | `is_death_turn=true`, bàn giao Character Continuation | → [ngoài phạm vi hệ này] |
| Pending Fate | Đối thủ HP=0 sau trận thắng, chờ đúng 1 lượt để người chơi chọn Kết liễu/Tha mạng | → Idle (Kết liễu hoặc Tha mạng đã xử lý — kể cả mặc định Tha mạng khi hết lượt không chọn) |

**B. Vòng đời cờ `death_and_consequence_blocked` (persistent, xuyên
nhiều lượt)**:

| State | Entry Condition | Exit Condition |
|---|---|---|
| Healthy | Mặc định | → Crippled (severity tier = severe) |
| Crippled | `death_and_consequence_blocked=true` | → Healthy (Formula D.3 thành công) |

### Interactions with Other Systems

- **Combat System** (2 chiều, hard — sửa 2026-08-09) — nhận hand-off
  `outcome={type,winner_id,loser_id}` + `per_actor[*].hp_after` (→
  `margin_ratio`, field-shape sửa 2026-08-09; công thức giống
  `npc-affinity-relationship.md` D.1 dùng, cùng lỗi field-shape đã tồn
  tại ở đó, xem Open Questions) khi `battle_active=false`. **CHIỀU
  NGƯỢC mới (bổ sung 2026-08-09)**: Combat System (D.1 `crippled_layer`)
  ĐỌC `death_and_consequence_blocked(C)` từ hệ này để áp penalty Lực
  chiến nhỏ — xem Core Rule #6.
- **Character Card & Identity** (upstream, soft — MỚI bổ sung
  2026-08-09, đóng finding D-CRITICAL) — đọc `max_HP(C)`, field KHÔNG
  có trong hand-off Combat, input trực tiếp `margin_ratio`.
- **NPC Affinity & Relationship** (2 chiều, hard) — ĐỌC
  `affinity(đối thủ)` để quyết định death_roll; PHÁT `kill_witnessed`
  (nạn nhân + witnesses) cho hệ đó lan truyền — đóng interface
  provisional bên đó.
- **Setting & Canon Integration** (downstream, hard) — CUNG CẤP
  `alive(X)` + `death_flag_[char_id]` làm premise-break eager-check
  quan trọng nhất — đóng interface provisional bên đó. Resolve TRƯỚC
  hệ đó trong cùng lượt.
- **EXP & Realm Progression** (downstream, soft) — CUNG CẤP
  `death_and_consequence_blocked(self)` — đúng TÊN đã được GDD đó dùng
  provisional, không đổi tên để tránh sửa chéo file không cần thiết.
  **Làm rõ 2026-08-08 (đóng Blocking #4)**: `resolve_turn_exp` (D.6 của
  `exp-realm-progression.md`) áp dụng cho MỌI nhân vật có Character
  Card — KỂ CẢ NPC. Nghĩa là khi Nhánh B "Tha mạng" khóa
  `death_and_consequence_blocked(npc)=true`, NPC đó CŨNG bị chặn tích
  lũy EXP của chính mình qua interface có sẵn này — đây KHÔNG phải hiệu
  ứng thuần trang trí như đọc lướt tưởng, dù không có penalty Lực chiến
  tức thời (xem Core Rule #6, ghi chú thiết kế).
- **World Memory & Context Management** (downstream, soft, bổ sung
  2026-08-08 — đóng Blocking #3) — CUNG CẤP field
  `consequence_type_[char_id]` (string, 1 trong 4 giá trị D.2) +
  `consequence_witnesses_[char_id]` (danh sách entity_id — dùng CHUNG
  witness list với `kill_witnessed` khi có, rỗng nếu hậu quả không có
  tính chất công khai) làm MỘT PHẦN `locked_result` của lượt đó, cho
  MỌI tier (mild/medium/severe) — không chỉ severe. World Memory tự
  trích fact từ field `has_signal=true` bất kỳ trong `locked_result`
  (Formula #2), mặc định `importance_tier=0` (Setting & Canon
  Integration D.5 chưa có rule riêng cho field này, xem Open Questions
  mới bên dưới). Đây là fix cho khoảng trống "hậu quả không-chết không
  để lại dấu vết bền nào" — trước bản sửa này, `consequence_type` chỉ
  tồn tại trong đúng 1 lượt tường thuật rồi biến mất khỏi mọi state,
  mâu thuẫn Pillar 2 ("Hệ Quả Thực Sự... ảnh hưởng nội dung AI tạo ra
  sau này").
- **Turn Manager** (downstream, hard) — CUNG CẤP `is_death_turn` cho
  `undo_availability_window` (registry) — khóa Undo vĩnh viễn đúng lượt
  chết thật; CUNG CẤP 2 gợi ý hành động bổ sung trong cửa sổ
  `Pending Fate`.
- **Situation/Encounter Generation** (2 chiều, hard — Designed) — PHÁT
  thông tin chết để hệ đó dọn presence/`provoked_flag`; NHẬN witness
  list (`entities_in_scope`) làm input cho `kill_witnessed`.
- **Character Continuation** (downstream, hard) — bàn giao tín hiệu
  `death_confirmed` khi Nhánh A kết thúc bằng chết thật — hệ này KHÔNG
  tự xử lý Quỷ tu/Chuyển sinh/Chơi lại.
- **Equipment & Skill Data System** (upstream, soft) — đọc field
  `recovery_item` + `efficacy` (field `efficacy` đã bổ sung schema "Vật
  phẩm hồi phục" 2026-08-05) cho Formula D.3 nhánh tiên thảo dị bảo.

## Formulas

*(Đề xuất bởi `systems-designer`, lean mode — Section D bắt buộc spawn.
Ký hiệu chung: `margin_ratio(battle, winner_id) =
float(hand_off.per_actor[winner_id].hp_after) / max(max_HP(winner_id), 1)`
tại `battle_active=false` — ÉP KIỂU `float()` TƯỜNG MINH TRƯỚC KHI CHIA
+ sàn mẫu số `max(...,1)` BẮT BUỘC (sửa 2026-08-08, `/design-review`
round 1 — bản trước copy nguyên công thức CHƯA sửa; `combat-system.md`
và `npc-affinity-relationship.md` D.1 — chính 2 nguồn GDD này tự nhận
"tái dùng pattern" — đã tự sửa lỗi int/int truncation này ở review của
chính họ. Không ép kiểu, GDScript trả `hp_after/max_HP` nguyên `0` gần
như luôn [`42/100=0`], xóa sạch input thật của cả D.1 lẫn D.2; `max_HP=0`
do dữ liệu lỗi upstream không còn crash chia-cho-0. Xem AC-40/AC-41.)
**Sửa 2026-08-09 (`/design-review` round 1, đóng finding "D-CRITICAL"
của `systems-designer`)**: bản trước ghi `hp_after(người thắng)` như
thể là field CẤP NGOÀI của hand-off Combat — SAI. Field thật nằm LỒNG
trong `per_actor[actor_id].hp_after` (đúng schema `locked_result` DUY
NHẤT ở `combat-system.md` Core Rule #11 — không có field `hp_after` cấp
ngoài nào). `max_HP(winner_id)` KHÔNG đến từ hand-off Combat — Combat
không phát field này trong `locked_result` — mà đến từ **Character Card
& Identity** (hệ #14, xem Dependencies bổ sung bên dưới). — Nhánh A
dùng của đối thủ, Nhánh B "Tha mạng" dùng của nhân vật chính, cùng công
thức khác chủ thể. Không đăng ký registry — chỉ là pattern tái dùng từ
`npc-affinity-relationship.md` D.1, không phải formula sở hữu duy nhất.)*

### D.1 — death_roll

The `death_roll` formula is defined as:
`death_roll = roll_uniform[0,1) < clamp(DEATH_ROLL_BASE + DEATH_ROLL_SCALE × margin_ratio, DEATH_ROLL_MIN, DEATH_ROLL_MAX)`

Chỉ chạy khi `affinity(đối thủ) ≤ deep_hostility_threshold` (Core Rule
3c). `margin_ratio` ở đây luôn là của **đối thủ** (người thắng trận đó).

**Variables:**

| Variable | Symbol | Type | Range | Description |
|----------|--------|------|-------|-------------|
| Tỷ lệ HP còn lại của đối thủ | `margin_ratio` | float | [0,1] | `float(per_actor[đối thủ].hp_after)/max(max_HP(đối thủ),1)` — `hp_after` từ hand-off Combat (lồng trong `per_actor`), `max_HP` từ Character Card & Identity — PHẢI ép kiểu `float()` trước chia (sửa 2026-08-08; field-shape sửa 2026-08-09) |
| Xác suất chết nền | `DEATH_ROLL_BASE` | float (knob) | 0–0.3 | Xác suất chết khi đối thủ thắng sát nút (`margin_ratio≈0`) |
| Hệ số margin | `DEATH_ROLL_SCALE` | float (knob) | 0–1 | Độ dốc tăng xác suất chết theo mức áp đảo của đối thủ |
| Sàn xác suất | `DEATH_ROLL_MIN` | float (knob) | 0–0.2 | Không bao giờ 0% chết tuyệt đối |
| Trần xác suất | `DEATH_ROLL_MAX` | float (knob) | 0.8–1.0 | Không bao giờ 100% chết tuyệt đối |
| Xác suất chết thật | `P_death` | float | `[DEATH_ROLL_MIN, DEATH_ROLL_MAX]` | Đầu ra trung gian trước roll |
| Số ngẫu nhiên | `roll_uniform[0,1)` | float | [0,1) | Lấy đúng thời điểm formula chạy, không tái sử dụng |
| Kết quả | `death` | bool | {true,false} | `true`→chết thật (Core Rule 3c); `false`→sống sót, BUỘC severity=`severe` |

**Output Range:** `P_death ∈ [DEATH_ROLL_MIN, DEATH_ROLL_MAX]` mặc định
`[0.05, 0.95]`. Trần 0.95 (không phải 1.0) là quyết định có chủ đích:
dù `margin_ratio=1.0` (thua tan nát), vẫn giữ 5% cơ hội sống sót, khớp
đúng shape language đã khóa ở `combat-system.md` (`P_MIN=0.05/P_MAX=0.95`)
và triết lý "không có gì tuyệt đối" của dự án. Đây là knob RIÊNG
(`DEATH_ROLL_MIN/MAX`), không chia sẻ constant với `P_MIN/P_MAX` của
Combat — tránh coupling 2 hệ khác domain.

**Example:** `DEATH_ROLL_BASE=0.10, DEATH_ROLL_SCALE=0.85` → tại
`margin_ratio=0.3` (đối thủ còn 30% HP, thắng sát nút):
`P_death = clamp(0.10+0.85×0.3, 0.05, 0.95) = 0.355` → roll=0.2 < 0.355
→ **chết**. Tại `margin_ratio=1.0` (đối thủ thắng tuyệt đối):
`P_death = clamp(0.95,...) = 0.95` → roll=0.97 ≥ 0.95 → **sống sót**,
nhưng Core Rule 3c buộc severity=`severe` (bỏ qua bảng D.2).

### D.2 — severity_tier

The `severity_tier` formula is defined as:
`severity_tier = "mild" if margin_ratio < SEVERITY_MILD_THRESHOLD else "medium" if margin_ratio < SEVERITY_SEVERE_THRESHOLD else "severe"`
(ép cứng `"severe"` nếu Core Rule 3c kích hoạt — sống sót sau
`death_roll` dù thù địch sâu sắc)

Kèm hàm chọn tên hậu quả cụ thể trong tier:
`consequence_type(tier, npc_tag) = "trọng thương"` (mild) `| (npc_tag?.medium_override) ?? "sỉ nhục"` (medium) `| "phế đan điền/võ công" + set death_and_consequence_blocked(loser)=true` (severe)

**Sửa 2026-08-09 (`/design-review` round 1, đóng finding D2-3 của
`systems-designer`)**: toán tử `?.` (optional chaining) BẮT BUỘC trước
`.medium_override` — bản trước chỉ guard `medium_override` null, KHÔNG
guard trường hợp chính `npc_tag` null/absent (VD đối thủ là quái vật
chưa có Character Card, Edge Case #1). `npc_tag?.medium_override` trả
`null` an toàn nếu `npc_tag` chính nó null, rơi về `"sỉ nhục"` qua `??`
— cùng hành vi mặc định như khi `npc_tag` tồn tại nhưng
`medium_override=null`.

**Variables:**

| Variable | Symbol | Type | Range | Description |
|----------|--------|------|-------|-------------|
| Tỷ lệ HP còn lại người thắng trận đó | `margin_ratio` | float | [0,1] | Nhánh A: của đối thủ; Nhánh B Tha mạng: của nhân vật chính (cùng công thức `float(per_actor[winner_id].hp_after)/max(max_HP(winner_id),1)`, khác chủ thể — sửa 2026-08-08; field-shape sửa 2026-08-09) |
| Ngưỡng mild/medium | `SEVERITY_MILD_THRESHOLD` | float (knob) | 0.2–0.5 | Dưới ngưỡng này → trọng thương |
| Ngưỡng medium/severe | `SEVERITY_SEVERE_THRESHOLD` | float (knob) | 0.6–0.85 | Từ ngưỡng này trở lên → phế đan điền/võ công |
| Tag ghi đè NPC (chỉ tier medium) | `npc_tag.medium_override` | enum \| null | {`"ep_uong_doc"`, null} | Content-authored, mặc định null → "sỉ nhục" |
| Tier | `severity_tier` | enum | {mild, medium, severe} | Kết quả chính |
| Tên hậu quả | `consequence_type` | string | 4 giá trị cố định | trọng thương / sỉ nhục / ép uống độc / phế đan điền-võ công |

**Bất biến bắt buộc (bổ sung 2026-08-08, mở rộng 2026-08-09
`/design-review` round 1, đóng finding D1-2/D2-1/D2-2 `systems-designer`)**:
CẢ 3 cặp knob dưới đây PHẢI luôn thỏa `MIN/MILD < MAX/SEVERE` — an
toàn hiện tại CHỈ nhờ các cặp safe range không giao nhau, chưa được
enforce ở đâu (không có load-time validation, không AC nào reject
config vi phạm):
1. `SEVERITY_MILD_THRESHOLD < SEVERITY_SEVERE_THRESHOLD` (D.2, safe
   range 0.2–0.5 vs. 0.6–0.85) — nếu đảo ngược (VD `MILD=0.7,
   SEVERE=0.6`), tier `"medium"` trở thành KHÔNG THỂ ĐẠT ĐƯỢC (bug im
   lặng, không crash).
2. `DEATH_ROLL_MIN < DEATH_ROLL_MAX` (D.1, safe range 0–0.2 vs.
   0.8–1.0) — nếu đảo ngược, `clamp` cho ra hàm bậc thang phi đơn điệu
   (P_death nhảy giữa đúng 2 giá trị cực đoan tùy điểm cắt tùy tiện).
3. `RECOVERY_ITEM_MIN < RECOVERY_ITEM_MAX` (D.3, safe range 0–0.2 vs.
   0.7–0.95) — cùng cấu trúc rủi ro với #2, trước đây bị bỏ sót khỏi
   danh sách này dù cùng lớp lỗi.

**Chủ sở hữu enforcement (mới 2026-08-09)**: chưa hệ nào implement
load-time validation cho 3 cặp này — ghi vào Open Questions, owner đề
xuất `technical-director` (áp dụng chung cho MỌI GDD có cặp knob
MIN/MAX tương tự, không riêng hệ này — cùng lớp rủi ro đã xuất hiện ở
`combat-system.md` D.1 `FLOOR_LAYER`/`FLOOR_TOTAL`).

**Output Range:** Categorical — 3 tier × tối đa 4 tên hậu quả cụ thể.
Domain đầu vào `margin_ratio ∈ [0,1]`. **Lưu ý thiết kế**: KHÔNG tái
dùng `SEVERE_WIN_MARGIN_THRESHOLD` của `combat-system.md`/
`npc-affinity-relationship.md` cho `SEVERITY_SEVERE_THRESHOLD` dù giá
trị đề xuất trùng khoảng — 2 domain khác nhau (affinity-delta severity
vs. hậu quả nhân vật), giữ tách biệt để không coupling ngầm 2 hệ tuning
khác nhau.

**Example:** `SEVERITY_MILD_THRESHOLD=0.35, SEVERITY_SEVERE_THRESHOLD=0.75`.
`margin_ratio=0.42` → `0.35≤0.42<0.75` → `medium`; NPC không có tag →
`"sỉ nhục"`. `margin_ratio=0.85` → `≥0.75` → `severe` →
`"phế đan điền/võ công"`, `death_and_consequence_blocked=true`.
**Ví dụ forced-severe (3c)**: `margin_ratio=0.15` (đáng lẽ `mild` theo
bảng) nhưng nhân vật chính vừa sống sót sau `death_roll` trước thù địch
sâu sắc → bỏ qua bảng, ép `severe` → `"phế đan điền/võ công"`.

### D.3 — recovery_attempt

The `recovery_attempt` formula is defined as:
`recovery_attempt = roll_uniform[0,1) < P_recovery(method, character)`,
với `P_recovery` theo phương pháp, và chi phí bị trừ **bất kể kết quả**.

```
P_recovery(method, character) =
    RECOVERY_FORTUNE_RATE                                        nếu method = đại_cơ_duyên
    clamp(efficacy(item), RECOVERY_ITEM_MIN, RECOVERY_ITEM_MAX)    nếu method = tiên_thảo_dị_bảo
    RECOVERY_SELF_RATE                                            nếu method = tự_tu
    REJECT — hành động không hợp lệ, KHÔNG trừ resource nào         method khác 3 giá trị enum trên
                                                                    (bổ sung 2026-08-09, đóng finding D3-1 `systems-designer`:
                                                                    UI hiện chỉ liệt đúng 3 lựa chọn nên không reachable qua
                                                                    flow bình thường, nhưng interface public PHẢI reject
                                                                    tường minh thay vì để `P_recovery` undefined nếu 1 giá trị
                                                                    method thứ 4 lọt qua — VD do save file cũ/enum đổi sau này)

recovery_self_attempt_allowed(character, current_turn) =
    last_self_attempt_turn(character) = null
    OR (current_turn − last_self_attempt_turn(character)) ≥ RECOVERY_SELF_COOLDOWN_TURNS
```

Kết quả: `true` → `death_and_consequence_blocked(character) = false`.
`false` → cờ giữ nguyên `true`.
Chi phí (LUÔN trừ, không hoàn khi thất bại — đúng "không dễ dàng và
không đảm bảo"): `đại_cơ_duyên` → sự kiện cơ duyên đó bị tiêu (không
lặp lại); `tiên_thảo_dị_bảo` → item bị tiêu thụ (mất charge/instance);
`tự_tu` → `last_self_attempt_turn(character) = current_turn` (reset
cooldown dù thành hay bại).

**Variables:**

| Variable | Symbol | Type | Range | Description |
|----------|--------|------|-------|-------------|
| Phương pháp | `method` | enum | {đại_cơ_duyên, tiên_thảo_dị_bảo, tự_tu} | Người chơi chủ động chọn |
| Tỷ lệ thành công cơ duyên | `RECOVERY_FORTUNE_RATE` | float (knob) | 0.5–0.9 | Cố định, không phụ thuộc input nào khác |
| Hiệu lực vật phẩm (EXTERNAL) | `efficacy(item)` | float | [0,1] | Field trên schema "Vật phẩm hồi phục" của `equipment-skill-data-system.md` (bổ sung 2026-08-05, cụm D `/design-review` gộp 11 GDD) — do tác giả item tự khai, KHÔNG có default engine |
| Sàn hiệu lực item | `RECOVERY_ITEM_MIN` | float (knob) | 0–0.2 | Item yếu nhất vẫn có cơ hội tối thiểu |
| Trần hiệu lực item | `RECOVERY_ITEM_MAX` | float (knob) | 0.7–0.95 | Không item nào đảm bảo 100% |
| Tỷ lệ tự tu | `RECOVERY_SELF_RATE` | float (knob) | 0.03–0.15 | Thấp — miễn phí ngoại trừ thời gian |
| Cooldown tự tu | `RECOVERY_SELF_COOLDOWN_TURNS` | int (knob) | 5–15 | Số lượt chờ giữa 2 lần thử tự tu |
| Lượt thử gần nhất | `last_self_attempt_turn(character)` | int \| null | ≥0 hoặc null | State nội bộ hệ này, `null` = chưa từng thử |
| Lượt hiện tại | `current_turn` | int | ≥0 | Từ Turn Manager |
| Kết quả | `recovery_success` | bool | {true,false} | Gỡ cờ `death_and_consequence_blocked` nếu true |

**Output Range:** `P_recovery` bị chặn theo method — cơ duyên là hằng
cố định `(0,1)`; item bị `clamp` vào `[RECOVERY_ITEM_MIN, RECOVERY_ITEM_MAX]`
bất kể `efficacy(item)` gốc; tự tu là hằng thấp cố định. `recovery_success`
boolean.

**Example (a — đại cơ duyên):** `RECOVERY_FORTUNE_RATE=0.70` → roll=0.42
< 0.70 → thành công → gỡ cờ.
**Example (b — tiên thảo dị bảo):** `efficacy(item)=0.55,
RECOVERY_ITEM_MIN=0.05, RECOVERY_ITEM_MAX=0.90` → `P=0.55` → roll=0.71
≥ 0.55 → **thất bại** — item vẫn bị tiêu (mất trắng).
**Example (c — tự tu):** `RECOVERY_SELF_RATE=0.12,
RECOVERY_SELF_COOLDOWN_TURNS=5` (giá trị default sửa 2026-08-08, xem
Tuning Knobs); `last_self_attempt_turn=95, current_turn=100` →
`100−95=5≥5` → được phép thử → roll=0.03 < 0.12 → thành công.

## Edge Cases

*(Cập nhật 2026-08-09: rà bởi `systems-designer`/`qa-lead` qua
`/design-review` full mode round 1 — xem
`reviews/death-and-consequence-review-log.md`.)*

- **Nếu đối thủ không có Hảo cảm theo dõi** (VD quái vật/thú hoang trong
  tình huống tương lai, chưa có trong MVP 3-NPC): `affinity(đối thủ)`
  mặc định = 0 — không bao giờ đạt ngưỡng thù địch sâu sắc qua đường
  này, luôn đi Nhánh A bước d (severity_tier thường), không có nguy cơ
  chết thật từ đối thủ vô danh ở MVP.
- **Nếu nhân vật chính đã `death_and_consequence_blocked=true` (đang
  phế đan điền) mà THUA TIẾP** trước khi khôi phục: cờ giữ nguyên
  `true` (idempotent — không "phế 2 lần", không cộng dồn hiệu ứng);
  `severity_tier` vẫn chạy để chọn tên hậu quả tường thuật cho lần thua
  này, nhưng không ảnh hưởng gì thêm nếu tier lại ra severe.
- **Nếu nhân vật chính đang phế đan điền mà rơi vào Nhánh A (thua trước
  thù địch sâu sắc)**: `death_roll` vẫn chạy bình thường — bị phế
  KHÔNG miễn trừ nguy cơ chết thật. Nếu `death=true`: chết thật xảy ra
  dù đang phế (không có "bảo hiểm kép").
- **Nếu người chơi diễn đạt ý định mơ hồ trong cửa sổ `Pending Fate`**
  (VD input tự do không rõ Kết liễu hay Tha mạng): phân loại hạ về mặc
  định **Tha mạng** — cùng nguyên tắc "nhãn ngoài menu → hạ an toàn"
  đã dùng ở Situation/Encounter Generation (`rp_only`).
- **Nếu `kill_witnessed` xảy ra với 0 nhân chứng còn sống**
  (`entities_in_scope(scene) \ {npc}` rỗng): "tội ác hoàn hảo" hợp lệ —
  đã chốt sẵn ở registry (`resolve_turn_affinity`: "Giết không nhân
  chứng: 0 field"). Death & Consequence vẫn khóa `alive(npc)=false`/
  `death_flag_[npc]=true` bình thường; chỉ NPC Affinity không nhận
  field lan truyền nào.
- **Nếu `affinity(đối thủ)` đúng biên `-80`**: Core Rule 3c dùng `≤` nên
  tự động tính vào nhánh thù địch sâu sắc — khớp registry
  `deep_hostility_threshold` (bao gồm).
- **Nếu `recovery_attempt` được gọi khi `death_and_consequence_blocked=false`**
  (nhân vật không hề bị phế): hành động không hợp lệ, bị chặn TRƯỚC khi
  tiêu tốn bất kỳ resource nào (đại cơ duyên/item/lượt tự tu) — không
  phải một no-op âm thầm, mà là action không xuất hiện trong gợi ý/
  không được chấp nhận.
- **Nếu nhân vật chính chết thật trong khi đang phế đan điền, rồi người
  chơi chọn Chơi lại** (Character Continuation): nhân vật MỚI khởi tạo
  `death_and_consequence_blocked=false`, `alive=true` từ đầu — cờ
  KHÔNG kế thừa sang nhân vật mới, kể cả với Quỷ tu/Chuyển sinh khi các
  lối đó được thiết kế đầy đủ (Vertical Slice).
- **Nếu NPC đang có quan hệ Song Tu active bị Kết liễu**: hành vi phía
  NPC Affinity đã chốt sẵn (state → Ended, terminal) — Death &
  Consequence chỉ cần khóa `alive`/`death_flag` đúng lúc, không cần
  logic riêng cho trường hợp Song Tu.
- **Nếu người chơi Undo đúng lượt Death & Consequence vừa resolve**
  (KHÔNG phải lượt chết thật — lượt chết thật không thể Undo theo Turn
  Manager Core Rule #9): TOÀN BỘ state hệ này vừa ghi/đổi trong lượt đó
  phải rollback về snapshot trước lượt, theo đúng Turn Manager Core
  Rule #8 ("chưa final tới khi xác nhận và không undo") — trách nhiệm
  tuân thủ thuộc về chính hệ này, giống cách `combat-system.md` đã xác
  nhận cho các hệ downstream của nó. Danh sách ĐẦY ĐỦ field cần rollback
  (bổ sung 2026-08-08, `/design-review` round 1 — bản trước chỉ liệt 2
  field, bỏ sót field thứ 3 gây bug thật):
  1. `death_and_consequence_blocked` (cờ).
  2. Kết quả `pending_fate` (Kết liễu/Tha mạng vừa xử lý trong lượt đó).
  3. **`last_self_attempt_turn(character)`** (bổ sung — trước bản sửa
     này bị bỏ sót: nếu lượt Undo có chạy `recovery_attempt(tự_tu)`,
     không rollback field này khiến `current_turn` lùi lại nhưng
     `last_self_attempt_turn` vẫn giữ giá trị mới → `current_turn <
     last_self_attempt_turn` → `recovery_self_attempt_allowed` tính âm,
     khóa nhầm quyền tự tu cho tới khi `current_turn` vượt qua mốc cũ +
     cooldown. Xem AC-43.)

  Ngoài ra, nếu lượt đó chạy `recovery_attempt` tiêu tốn resource thuộc
  hệ KHÁC (item `tiên_thảo_dị_bảo` — Equipment & Skill Data Sysem; sự
  kiện `đại_cơ_duyên` — hệ story-event chưa có chủ, xem Open Questions),
  Undo PHẢI hoàn trả resource đó — trách nhiệm hoàn trả thuộc về hệ SỞ
  HỮU resource (Equipment & Skill Data cho item, hệ story-event cho cơ
  duyên khi được thiết kế), theo đúng nguyên tắc mỗi hệ tự tuân thủ Turn
  Manager Core Rule #8 cho phần trạng thái mình sở hữu — Death &
  Consequence chỉ đảm bảo tín hiệu Undo của mình lan đúng, không tự giữ
  bản sao resource ngoài. Xem AC-44 (provisional-interface).
- **Nếu trận đấu kết thúc với `outcome.type="no_outcome"`** (bỏ chạy
  thành công, hoặc — CHỈ khi `is_spar_friendly=true` — chạm trần kỹ
  thuật `TECHNICAL_EXCHANGE_CAP` mà D.9b chưa từng kích hoạt trước đó):
  Death & Consequence hoàn toàn KHÔNG resolve — không được diễn giải
  thành thắng hoặc thua. Trận KHÔNG giao hữu chạm trần này luôn bị ép
  tiebreak thành `win`/`lose` (đúng ràng buộc đã khóa ở
  `combat-system.md` Core Rule #8(d)/D.9c) — không bao giờ tạo ra
  `no_outcome` qua đường đó.
- **Nếu trận đấu là giao hữu (`is_spar_friendly=true`) và VẪN ra
  `outcome.type ∈ {win, lose}`** (không cân sức, không parity — xem D.9b
  của `combat-system.md`): Death & Consequence hoàn toàn KHÔNG resolve,
  giống hệt xử lý `no_outcome` — giao hữu không bao giờ có hậu quả
  thật, bất kể kết quả thắng/thua (bổ sung 2026-08-05).

## Dependencies

| System | Direction | Nature of Dependency | Hard/Soft |
|---|---|---|---|
| Combat System (Designed) | 2 chiều (bổ sung 2026-08-09 — trước là 1 chiều) | Hand-off `outcome={type,winner_id,loser_id}` + `per_actor[*].hp_after` (→ `margin_ratio`, sửa field-shape 2026-08-09) khi `battle_active=false`; NGƯỢC LẠI Combat System (D.1 `crippled_layer`) ĐỌC `death_and_consequence_blocked(C)` từ hệ này để áp penalty Lực chiến (bổ sung 2026-08-09, xem Core Rule #6) | Hard (cả 2 chiều) |
| Character Card & Identity (Designed, hệ #14 — MỚI bổ sung 2026-08-09, đóng finding D-CRITICAL `systems-designer`) | Hệ này phụ thuộc (mềm) | Đọc `max_HP(C)` — field KHÔNG có trong hand-off Combat (`locked_result` không phát field này), là input trực tiếp `margin_ratio` (D.1/D.2); PHẢI `>0`, nay đảm bảo bởi `base_HP0>0` strict phía Card (bổ sung 2026-08-10, D.5 của GDD đó) | Soft |
| NPC Affinity & Relationship (Designed) | 2 chiều | ĐỌC `affinity(đối thủ)` cho `death_roll`; PHÁT `kill_witnessed` (nạn nhân + witnesses) cho lan truyền; PHÁT thêm `classified_event(type="insult",...)` khi Nhánh B Tha mạng tier=medium (bổ sung 2026-08-09, tái dùng event type có sẵn) | Hard |
| Turn Manager (Approved) | 2 chiều | ĐỌC `current_turn`, `suggested_action_count=4`; CUNG CẤP `is_death_turn` cho `undo_availability_window` (registry) + 2 gợi ý hành động trong cửa sổ `Pending Fate` | Hard |
| Setting & Canon Integration (Designed) | Setting & Canon phụ thuộc hệ này | CUNG CẤP `alive(X)` + `death_flag_[char_id]` — đóng interface provisional bên đó, hệ này resolve TRƯỚC trong cùng lượt | Hard (chiều ngược) |
| EXP & Realm Progression (Designed) | EXP phụ thuộc hệ này | CUNG CẤP `death_and_consequence_blocked(self)` — đúng tên provisional GDD đó đã dùng | Soft (chiều ngược) — thiếu thì EXP không bị chặn, hệ vẫn hoạt động |
| Situation/Encounter Generation (Designed) | 2 chiều | PHÁT thông tin chết để hệ đó dọn presence/`provoked_flag`; NHẬN witness list (`entities_in_scope`) cho `kill_witnessed` | Hard |
| Character Continuation (đã Designed, hệ #13) | Character Continuation phụ thuộc hệ này | Bàn giao tín hiệu `death_confirmed` khi chết thật — hệ này KHÔNG tự xử lý Quỷ tu/Chuyển sinh/Chơi lại | Hard (chiều ngược) |
| Persistence/Save System (Approved) | Hệ này phụ thuộc (mới, 2026-08-09) | TRIGGER trực tiếp thao tác "Khóa slot" tại Nhánh A bước c (chết thật) — chủ sở hữu trigger thật, sửa lại điểm quy thuộc trước đây gán nhầm cho Character Continuation (`persistence-save-system.md` bảng Thao tác) | Hard |
| Equipment & Skill Data System (Approved) | Hệ này phụ thuộc (mềm) | Đọc field `efficacy` trên schema "Vật phẩm hồi phục" (bổ sung 2026-08-05) cho `recovery_attempt` nhánh tiên thảo dị bảo; NHẬN tín hiệu hoàn trả item khi Undo lượt `recovery_attempt` (bổ sung 2026-08-08) | Soft |
| World Memory & Context Management (Approved) | World Memory phụ thuộc hệ này | CUNG CẤP `consequence_type_[char_id]` + `consequence_witnesses_[char_id]` làm 1 phần `locked_result` để World Memory tự trích fact bền (bổ sung 2026-08-08, đóng Blocking #3) | Soft (chiều ngược) |
| Mechanic/Narration Contract Enforcement (Approved) | Mechanic/Narration Contract phụ thuộc hệ này (MỚI bổ sung 2026-08-09 round 2 — đóng finding "cosmetic-only fix" của `creative-director`/`game-designer`, xem `reviews/death-and-consequence-review-log.md`) | CUNG CẤP `forced_severe_margin_ratio` (khi `forced_severe=true`, xem Core Rule 3d) VÀ ngữ cảnh công khai của `insult` tier medium Nhánh B (số nhân chứng — KHÔNG phải giá trị delta số) làm 1 phần `locked_result`; hệ đó chuyển 2 trường này xuống AI theo Core Rule #4 của chính nó (cấm lộ số liệu thô, chỉ truyền dữ kiện) | Soft (chiều ngược) |

*(`systems-index.md` hiện chỉ liệt kê Combat System + NPC Affinity là
dependency của hệ #12 — các dependency còn lại ở trên (nay gồm cả
Character Card & Identity bổ sung 2026-08-09 round 1 và Mechanic/
Narration Contract Enforcement bổ sung 2026-08-09 round 2) tạo ra
dependency gap một chiều, cùng pattern các gap đã ghi nhận trước đó
trong phiên này — sẽ footnote ở `systems-index.md`, không sửa cấu trúc
bảng.)*

## Tuning Knobs

| Parameter | Current Value | Safe Range | Effect of Increase | Effect of Decrease |
|---|---|---|---|---|
| `DEATH_ROLL_BASE` | 0.10 | 0–0.3 | Ngay cả thua sát nút trước thù địch sâu sắc cũng rủi ro hơn — có thể cảm thấy quá khắc nghiệt nếu quá cao | Thua sát nút gần như luôn an toàn — làm nhạt "nguy cơ THẬT SỰ" mà game-concept.md yêu cầu |
| `DEATH_ROLL_SCALE` | 0.85 | 0–1 | Độ dốc dốc hơn — thua càng đậm càng nhanh chạm trần chết gần như chắc chắn | Xác suất chết tăng chậm theo margin — ngay cả thua tan nát vẫn khá an toàn |
| `DEATH_ROLL_MIN` | 0.05 | 0–0.2 | Không bao giờ hoàn toàn an toàn dù thắng sát nút trước thù địch sâu sắc | Có thể chạm 0% — mất tính "không có gì tuyệt đối" |
| `DEATH_ROLL_MAX` | 0.95 | 0.8–1.0 | Gần 1.0 — thua tan nát gần như chắc chắn chết | Dưới 0.8 — ngay cả thua thảm hại nhất vẫn có cơ hội sống đáng kể, giảm trọng lượng ngưỡng thù địch sâu sắc |
| `SEVERITY_MILD_THRESHOLD` | 0.35 | 0.2–0.5 | Dải "trọng thương" (nhẹ nhất) thu hẹp — dễ rơi vào medium/severe hơn | Dải "trọng thương" mở rộng — khó đạt hậu quả nghiêm trọng hơn |
| `SEVERITY_SEVERE_THRESHOLD` | 0.75 | 0.6–0.85 | Khó đạt "phế đan điền/võ công" hơn — chỉ khi thua cực kỳ áp đảo | Dễ bị phế đan điền hơn — có thể cảm thấy quá trừng phạt cho MVP |
| `RECOVERY_FORTUNE_RATE` | 0.70 | 0.5–0.9 | Đại cơ duyên gần như luôn thành công — giảm căng thẳng của phế đan điền | Đại cơ duyên cũng có thể thất bại đáng kể — "không dễ dàng và không đảm bảo" rõ hơn nhưng có thể nản |
| `RECOVERY_ITEM_MIN` | 0.05 | 0–0.2 | Item yếu nhất vẫn có cơ hội đáng kể | Item yếu gần như vô dụng — khuyến khích chỉ dùng item tốt |
| `RECOVERY_ITEM_MAX` | 0.90 | 0.7–0.95 | Item tốt nhất gần như đảm bảo — giảm rủi ro sưu tầm | Ngay cả item tốt nhất vẫn có rủi ro thất bại đáng kể |
| `RECOVERY_SELF_RATE` | 0.12 (sửa 2026-08-08, cũ 0.08) | 0.03–0.15 | Tự tu trở thành lối thoát khả thi hơn — giảm áp lực phải tìm cơ duyên/item | Tự tu gần như vô dụng — buộc người chơi phụ thuộc cơ duyên/item |
| `RECOVERY_SELF_COOLDOWN_TURNS` | 5 (sửa 2026-08-08, cũ 8) | 5–15 | Người chơi thử tự tu ít lần hơn trong cùng khoảng thời gian chơi | Có thể spam thử tự tu liên tục — làm nhạt chi phí "thời gian" của phương pháp này |

*(Sửa 2026-08-08, `/design-review` round 1, đóng Blocking #6: knob cũ
[0.08/8] khiến người bị phế ở lượt 30 chỉ có ~44% khả năng gỡ cờ trước
lượt 90 (cửa sổ kiểm chứng MVP, `game-concept.md`) NẾU chỉ dựa tự tu
[miễn phí] — nguy cơ vô hiệu hóa phép đo vòng lặp EXP của MVP cho một
phần đáng kể người chơi. Knob mới [0.12/5] đạt ~81% gỡ cờ trước lượt 90
**CHỈ trong kịch bản bị phế SỚM (lượt 30) — best-case, KHÔNG đại diện
population trung bình** (sửa 2026-08-09, đóng finding H-1
`economy-designer`, xác nhận lại bởi `creative-director`): nếu bị phế
muộn hơn, xác suất gỡ cờ trước lượt 90 giảm theo số lượt còn lại —
lượt 60 → ~59%, lượt 80 → ~32%, lượt 85 → ~23%, lượt 88 → ~12%. Mức
nguy hại tự triệt tiêu phần lớn theo cùng tỷ lệ (bị phế càng muộn, số
lượt EXP bị chặn còn lại càng ít), nhưng con số "~81%" KHÔNG nên trích
dẫn như thống kê đại diện — chỉ là ví dụ biên tốt nhất. Kỳ vọng số lượt
trung bình để tự tu đơn thuần gỡ cờ (không dùng cơ duyên/item) ≈ **42
lượt**, trong suốt thời gian đó nhân vật nhận 0 EXP — đây là con đường
ĐẮT NHẤT (trả bằng thời gian), không phải "quá dễ"; thứ tự ưu tiên "cơ
duyên/item trước, tự tu là sàn cuối" được bảo toàn đúng như thiết kế.
KHÔNG đổi `SEVERITY_SEVERE_THRESHOLD` — tần suất rơi vào severe không
đổi, phế đan điền vẫn giữ tính đe dọa, chỉ đường thoát miễn phí nhanh
hơn. `đại_cơ_duyên`/`tiên_thảo_dị_bảo` vẫn là lối thoát nhanh hơn khi
có cơ hội — tự tu chỉ là sàn đảm bảo, không phải lối thoát chính.)*

*(Ghi chú kỷ luật đồng bộ, mới 2026-08-09, đóng finding R4 `qa-lead`:
khi đổi Current Value HOẶC Safe Range của BẤT KỲ knob nào ở bảng trên,
PHẢI rà lại các AC neo số + worked-example liên quan
[AC-16/17/18/19/21/22/23/24/26/27/28/30/31] — không có cơ chế tự động
đồng bộ, đã xảy ra đúng 1 lần khi đổi `RECOVERY_SELF_RATE`/
`RECOVERY_SELF_COOLDOWN_TURNS` 2026-08-08 và mọi AC liên quan được cập
nhật đúng, nhưng kỷ luật này không tự lặp lại cho các knob khác nếu đổi
sau này.)*

## Visual/Audio Requirements

*(Đề xuất bởi `art-director` — Visual/Audio BẮT BUỘC cho hệ này (nhóm
Combat/damage/health). Chưa có Art Bible chính thức, dựa trên Visual
Identity Anchor "Mực Chưa Khô" của `game-concept.md`.)*

**Giải quyết vấn đề "đỏ son trùng lặp" với Combat**: Combat đã dùng đỏ
son làm viền mỏng, thoáng qua quanh khung Character Card khi
`outcome.type="lose"`. Hệ này xử lý các trạng thái NẶNG và BỀN hơn
nhiều (trọng thương thoáng qua → phế đan điền kéo dài → chết vĩnh
viễn), nhưng luật "khẩu phần hóa nghiêm ngặt" cấm thêm màu/sắc độ mới.
Giải pháp: KHÔNG đổi màu, chỉ đổi **diện tích, độ đặc, và độ bền** của
cùng một đỏ son — độ bền tín hiệu thị giác phản chiếu đúng độ bền trạng
thái cơ học. "Hồi phục" biểu đạt bằng sự BIẾN MẤT của đỏ son (không
dùng xanh ngọc — xanh ngọc độc quyền cho đột phá cảnh giới).

| Event | Visual Feedback | Audio Feedback | Priority |
|---|---|---|---|
| **1. Chết thật** (`is_death_turn=true`) | Một nét đỏ son "gạch" ngang dưới mục tường thuật cuối cùng như đang đóng một trang nhật ký — KHÔNG phải màn hình Game Over. Ngay sau đó, toàn trang khô lại thành xám-đen đơn sắc vĩnh viễn; đỏ son không xuất hiện sống động cho nhân vật này nữa. Character Card từ đây về sau mang dấu triện đỏ son nhỏ, TĨNH (không hoạt ảnh) cố định góc thẻ đánh dấu `alive=false`. Không particle/rung màn hình (Anti-Pillar). | (Tùy chọn) âm "cộp" ngắn (<1s) mô phỏng đóng dấu triện, sau đó im lặng hoàn toàn — sự vắng mặt âm thanh củng cố tính chung cuộc. | BLOCKING (visual) / ADVISORY (audio) |
| **2. Phế đan điền/võ công** (severe, khóa `death_and_consequence_blocked`) | Khung con dấu tại vùng chỉ số/đan điền của Character Card đóng lại thành khối đỏ son ĐẶC (khác viền mảnh của Combat `lose`) — cục bộ, chỉ vùng đó. Bền — hiển thị lại mỗi lần mở thẻ cho tới khi D.3 thành công. | Không bắt buộc — nếu có, âm đóng dấu tương tự event 1 nhưng nhỏ/trầm hơn. | BLOCKING (visual) / ADVISORY (audio) |
| **3. Hậu quả nhẹ/vừa** (trọng thương/sỉ nhục/ép uống độc) | Nét đỏ son mảnh kiểu "gạch chân" thoáng qua dưới dòng tường thuật khi hậu quả được viết ra, mờ đi trong cùng nhịp đọc — KHÔNG lưu dấu trên Character Card. | Không cần. | ADVISORY |
| **4. Pending Fate — Kết liễu vs Tha mạng** | Chưa có sự thật cơ học nào khóa ở thời điểm này → KHÔNG dùng đỏ son. 2 gợi ý này trình bày chữ đậm hơn gợi ý thường (cùng pattern Combat dùng cho cảnh báo áp chế cảnh giới), trong khung mực loang hữu cơ (tường thuật, không phải khung con dấu dữ liệu cứng) — phản ánh đây là quyết định nhập vai, chưa phải kết quả đã khóa. | Không cần. | BLOCKING (visual framing) / ADVISORY (audio) |
| **5. Hồi phục thành công** (D.3, gỡ cờ) | Con dấu đỏ son đặc (event 2) nứt và tan biến, lộ lại nền giấy dó trung tính — hiệu ứng "sáng nhẹ" thoáng qua bằng tông giấy kem, KHÔNG dùng xanh ngọc. Sự biến mất của đỏ son chính là tín hiệu hy vọng. | Tùy chọn: âm nhẹ kiểu hơi thở/chuông thoáng, khác hẳn âm "cộp" của event 1/2. | ADVISORY |
| **6. Character Card hiển thị `alive=false`/crippled khi xem lại sau** | Nhân vật đã chết: dấu triện đỏ son nhỏ/tĩnh cố định góc thẻ + vùng chân dung/tên chuyển xám nhạt đơn sắc. Nhân vật đang phế: badge đỏ son đặc cục bộ vùng chỉ số, tiếp tục hiển thị mỗi lần mở thẻ. Áp dụng ĐỒNG NHẤT cho cả nhân vật chính lẫn NPC. | Không cần (màn hình tĩnh). | BLOCKING (visual) |

*(Toàn bộ khác biệt giữa 3 tầng nghiêm trọng nằm ở diện tích + độ đặc +
độ bền của cùng một đỏ son, không phát sinh sắc độ mới — giữ đúng luật
khẩu phần hóa đã khóa ở `game-concept.md`. Audio ở mức tối thiểu/tùy
chọn — project chưa có hệ audio chính thức.)*

## UI Requirements

| Information | Display Location | Update Frequency | Condition |
|---|---|---|---|
| Trạng thái `alive=false` (đã chết) | Character Card (badge góc thẻ, xem Visual/Audio event 1/6) | Tĩnh, không đổi sau khi set | Khi nhân vật (chính hoặc NPC) đã chết thật |
| Trạng thái `death_and_consequence_blocked=true` (phế đan điền) | Character Card, vùng chỉ số/đan điền (badge, xem event 2/6) | Mỗi lần mở thẻ, cho tới khi gỡ cờ | Khi đang phế đan điền/võ công |
| Nút "Hồi phục" | Character Card, cạnh badge phế đan điền — cùng pattern nút Song Tu (chỉ hiện khi đủ điều kiện) | Theo trạng thái mỗi lượt | CHỈ hiện khi `death_and_consequence_blocked=true`; liệt kê tối đa 2 lựa chọn khả dụng ngay lúc đó: "Dùng [tên item]" (nếu sở hữu ≥1 item có `efficacy`) và "Tự tu" (nếu `recovery_self_attempt_allowed=true`) — "Đại cơ duyên" KHÔNG phải nút bấm, phát sinh từ tình huống do Situation/Encounter Generation dựng, không thuộc UI này |
| Gợi ý "Kết liễu [NPC]" / "Tha mạng [NPC]" | Danh sách 4 gợi ý hành động chuẩn (đã có UX Flag từ Turn Manager/Combat) | Đúng 1 lượt (cửa sổ `Pending Fate`) | Chỉ khi vừa thắng trận và đối thủ còn `pending_fate`; PHẢI kèm 1 dòng nhắc thời hạn tường minh (bổ sung 2026-08-08, xem Detailed Design Rule #4) |
| Đoạn tường thuật hậu quả (mọi tier) | Khung tường thuật chính (không phải UI riêng — do AI viết dựa trên `consequence_type` đã khóa) | Mỗi lần hệ này resolve | Luôn — mọi nhánh A/B đều có tường thuật tương ứng |
| Lý do "0 EXP nhận được" khi thắng trận | Đoạn tường thuật/gợi ý kết quả trận đấu (không phải UI riêng của hệ này — cross-doc với `exp-realm-progression.md`/Character Card) | Đúng lượt `resolve_turn_exp` short-circuit vì `death_and_consequence_blocked=true` | Bổ sung 2026-08-08 (đóng Blocking #5): người chơi/NPC đang phế đan điền thắng trận vẫn nhận 0 EXP theo Core Rule #9 của EXP GDD — cần MỘT tín hiệu tại đúng thời điểm đó (không chỉ suy luận ngược từ badge đã thấy ở lượt khác); sở hữu hiển thị thật thuộc EXP/Character Card, hệ này chỉ khai yêu cầu |
| Xác nhận cơ học độc lập với narration khi Kết liễu/chết thật khóa flag | Tín hiệu UI riêng (không phải chờ đoạn tường thuật AI) — sở hữu hiển thị thật thuộc AI/LLM Integration Layer + Core UI/Screen Navigation, hệ này chỉ khai yêu cầu | Ngay khi flag `alive`/`death_flag` bị khóa, TRƯỚC KHI chờ `narration_call` trả về | Bổ sung 2026-08-09 (`ux-designer` + `creative-director`, đóng gap cross-doc): nếu lệnh gọi AI cho lượt đó rơi vào retry/backoff/fallback (`ai-llm-integration-layer.md`), flag đã khóa VĨNH VIỄN nhưng người chơi chỉ thấy màn hình đang tải — cần 1 tín hiệu XÁC NHẬN CƠ HỌC tách biệt khỏi việc chờ tường thuật, để người chơi không bao giờ nghi ngờ quyết định có được ghi nhận hay không. `ai-llm-integration-layer.md` UI Requirements hiện ghi "[To be designed]" — xem Open Questions. |

*(Không tạo màn hình riêng cho hệ này — mọi hiển thị đều lồng vào
Character Card và luồng tường thuật/gợi ý hành động đã có sẵn, đúng
tinh thần "không phải HUD game" của Visual Identity Anchor.)*

📌 **UX Flag — Death & Consequence**: Hệ này có yêu cầu UI (badge trạng
thái + nút Hồi phục có điều kiện trên Character Card, 2 gợi ý hành
động bổ sung trong cửa sổ Pending Fate). Ở Phase 4 (Pre-Production),
chạy `/ux-design` cho Character Card (nếu chưa có UX spec riêng)
**trước khi** viết epics — story liên quan nên trích
`design/ux/character-card.md`, không trích thẳng GDD này.

**Checklist bắt buộc đầu vào cho `/ux-design character-card.md`** (bổ
sung 2026-08-08, `/design-review` round 1, `ux-designer`):
1. Text label/tooltip cho badge "phế đan điền" — KHÔNG chỉ dựa vào hình
   khối (Godot Web export không có AccessKit, mọi ARIA phải tự chế, cần
   nguồn text).
2. Trạng thái 0-lựa-chọn-khả-dụng của nút "Hồi phục" (không item + đang
   cooldown tự tu) — hàng KHÔNG được biến mất hoàn toàn; hiển thị rõ số
   lượt cooldown còn lại.
3. Bảng đối chiếu định lượng (px/ms) tách tín hiệu đỏ son của Combat
   ("viền mỏng khi lose") khỏi tín hiệu "hậu quả nhẹ/vừa" của hệ này
   (event 3, Visual/Audio) — 2 tín hiệu này LUÔN xảy ra cùng lượt (mọi
   `lose` không-giao-hữu kích hoạt Death & Consequence), nguy cơ hòa
   lẫn thành "một chớp đỏ" nếu không định lượng riêng.
4. Pacing gate bắt buộc cho khoảnh khắc "chết thật" trước khi overlay
   Character Continuation tiếp quản — tránh đọc lướt bỏ lỡ khoảnh khắc
   quan trọng nhất game.
5. **(bổ sung 2026-08-09, `ux-designer`)** Bước xác nhận UI riêng cho
   "Kết liễu" (tap lần 1 mở xác nhận inline ngắn, tap lần 2 mới commit)
   — KHÔNG dựa hoàn toàn vào Turn Manager Undo cho hành động không thể
   hoàn tác về đạo đức + lan truyền `kill_witnessed`; đặc biệt quan
   trọng trên touch/mobile (mis-tap risk, target platform Web/Mobile
   Web). Đồng thời xác nhận vị trí "Kết liễu"/"Tha mạng" trong danh
   sách 4 gợi ý ổn định trong toàn bộ cửa sổ Pending Fate.
6. **(bổ sung 2026-08-09, `ux-designer`)** Badge `death_and_consequence_blocked`
   là "invisible state" ngoài lúc mở Character Card — cân nhắc chèn
   định kỳ 1 gợi ý hành động nhắc nhở (VD "[Tìm cách hồi phục đan
   điền]") khi cờ=true và chưa có hoạt động hồi phục nào trong N lượt
   gần nhất, tái dùng pattern gợi ý hành động sẵn có (phối hợp
   `game-designer`).
7. **(bổ sung 2026-08-09, `ux-designer`)** Bất đối xứng độ đậm chữ giữa
   "Kết liễu" và "Tha mạng" — hệ quả 2 lựa chọn hoàn toàn bất đối xứng
   (vĩnh viễn+lan truyền vs. an toàn+mặc định) nhưng hiện dùng chung 1
   optical weight; cân nhắc cho "Kết liễu" trọng lượng thị giác cao hơn
   (không dùng thêm màu — giữ khẩu phần hóa).
8. **(bổ sung 2026-08-09, `ux-designer`)** Đặc tả đầy đủ nút "Hồi phục"
   cho N=0 (đã có, mục 2) VÀ N≥2 loại item hồi phục sở hữu cùng lúc —
   chọn 1 trong 2: (a) hiển thị item ưu tiên theo quy tắc rõ ràng + link
   mở danh sách đầy đủ, hoặc (b) luôn hiển thị danh sách cuộn khi >1
   item, không gộp vào 1 dòng.
9. **(bổ sung 2026-08-09, `ux-designer`)** Kích thước chạm tối thiểu cho
   "Kết liễu"/"Tha mạng" và nút "Hồi phục" — quan trọng hơn bình thường
   vì đây là hành động rủi ro cao/không hoàn tác trên Mobile Web.

## Acceptance Criteria

*(Đề xuất bởi `qa-lead`. Hệ này thuần logic/state machine + RNG, không
network — mọi phụ thuộc ngoài (Combat hand-off, NPC Affinity đọc
affinity, Turn Manager, Character Continuation, Situation/Encounter
Generation witness list, Equipment & Skill Data `efficacy`) phải được
**inject** như tham số/mock, không gọi hệ thật. Tường thuật hậu quả do
AI viết SAU khi hệ này khóa `consequence_type` (Mechanic/Narration
Contract một chiều) — nằm NGOÀI phạm vi Section này, không có AC nào ở
đây kiểm nội dung narration.)*

**Story Type (Logic)**: formula + state machine + pipeline resolution,
RNG-driven → **BLOCKING** gate, test tự động bắt buộc tại
`tests/unit/death-and-consequence/` (naming:
`death_consequence_[feature]_test.gd`, `test_[scenario]_[expected]`).

**Story Type (Visual/Feel — bổ sung 2026-08-09, `/design-review` round
1, đóng qa-lead Blocking B2)**: áp dụng cho event 1/2/4/6 của Visual/Audio
Requirements (đã tự gắn nhãn "BLOCKING (visual)" trong bảng đó) và toàn
bộ UI Requirements table → **ADVISORY** gate theo đúng phân loại Story
Type của `coding-standards.md` (Visual/Feel = ADVISORY, không phải
BLOCKING) — evidence: screenshot + `art-director` sign-off tại
`production/qa/evidence/death-and-consequence/`, nộp cùng lúc với
`/ux-design character-card.md` theo 📌 UX Flag đã có. Nhãn "BLOCKING
(visual)" trong 2 bảng đó là cách diễn đạt "bắt buộc phải CÓ đặc tả
thị giác cho event này" (đối lập với event ADVISORY thuần túy như event
3/5) — KHÔNG phải BLOCKING gate theo nghĩa test-evidence của
`coding-standards.md`; giữ nguyên chữ trong bảng gốc nhưng đọc đúng
nghĩa qua khai báo Story Type này.

**Ghi chú test setup**: Trừ khi ghi chú khác, mọi AC dùng cố định giá
trị default ở Tuning Knobs làm fixture, cùng hằng số khóa
(`deep_hostility_threshold=-80` bao gồm, registry). RNG phải inject
được (seeded stub) để test deterministic. `margin_ratio` đổi CHỦ THỂ
theo nhánh — Nhánh A dùng của **đối thủ** (người thắng), Nhánh B "Tha
mạng" dùng của **nhân vật chính** (người thắng) — mọi fixture phải ghi
rõ chủ thể để tránh nhầm lẫn khi viết test. Các AC dùng interface
provisional (Character Continuation — đã Designed; Equipment & Skill
Data — `efficacy` chưa có schema) đánh dấu "provisional-interface", rà
lại khi hệ nguồn được thiết kế/bổ sung field.

### Core Rules

**AC-01** (Rule #1 — phạm vi kích hoạt; đóng Edge Case "no_outcome"):
GIVEN 3 kịch bản hand-off từ Combat: (a) `outcome.type="lose"`,
loser=nhân vật chính; (b) `outcome.type="win"`, winner=nhân vật chính;
(c) `outcome.type="no_outcome"` (bỏ chạy, hoặc — CHỈ khi
`is_spar_friendly=true` — chạm trần kỹ thuật `TECHNICAL_EXCHANGE_CAP`),
WHEN Combat phát `battle_active=false`, THEN Death & Consequence resolve
ở (a) và (b) — khóa đúng 1 trong 2 nhánh tương ứng — nhưng KHÔNG resolve
ở (c): không nhánh nào chạy, không field nào bị khóa. *(integration
test, mock Combat hand-off)*

**AC-02** (Rule #2 — thứ tự trong lượt: sau Combat, trước NPC
Affinity/Setting & Canon): GIVEN 1 lượt xác nhận có đủ 4 hệ tham gia
(Combat → Death & Consequence → NPC Affinity → Setting & Canon, spy ghi
thứ tự gọi), WHEN lượt resolve, THEN thứ tự gọi ĐÚNG: Combat trước,
Death & Consequence kế tiếp (`kill_witnessed` đã sẵn sàng khi
`resolve_turn_affinity` chạy), rồi mới tới NPC Affinity và Setting &
Canon (đọc `alive`/`death_flag` mới nhất). *(integration test, spy
call-order)*

**AC-03** (Rule #3a — đọc affinity ĐẦU lượt, TRƯỚC delta cùng lượt của
NPC Affinity): GIVEN `affinity(đối thủ)` lưu trữ hiện hành = -85 đầu
lượt, VÀ NPC Affinity của CHÍNH lượt đó (mock) đã chuẩn bị delta +10
nhưng CHƯA apply (chờ resolve sau theo AC-02), WHEN Death & Consequence
đọc `affinity(đối thủ)` qua interface public để chạy `death_roll`, THEN
giá trị đọc được = -85 (đầu lượt), KHÔNG phải -75. *(integration test,
mock NPC Affinity delta pending)*

**AC-04** (Rule #3b — đối thủ không theo dõi Hảo cảm → affinity=0 mặc
định; đóng Edge Case #1): GIVEN đối thủ KHÔNG nằm trong danh sách NPC
theo dõi Hảo cảm (mock trả not-found), WHEN đọc `affinity(đối thủ)`,
THEN mặc định = 0 — KHÔNG BAO GIỜ đạt `deep_hostility_threshold=-80`
qua đường này → luôn đi thẳng bước d (severity_tier thường);
`death_roll` KHÔNG được gọi (spy đếm=0). *(unit + spy)*

**AC-05** (Rule #3c — biên `deep_hostility_threshold=-80` bao gồm, gate
death_roll; đóng Edge Case #6): GIVEN `affinity(đối thủ)` lần lượt =
-79, -80, -81, WHEN nhân vật chính thua, THEN `death_roll` ĐƯỢC gọi
(spy đếm=1) chỉ ở -80 và -81, KHÔNG được gọi ở -79 (spy đếm=0) — khớp
đúng registry (`<=`, bao gồm). *(unit + spy)*

**AC-06** (Rule #3c — chết thật: khóa flags + trigger "Khóa slot" +
bàn giao Character Continuation, KHÔNG chạy tiếp Formula D.2; **sửa
2026-08-09** thêm assertion "Khóa slot", đóng 1 blocking cross-GDD của
`/design-review character-continuation.md` round 1): GIVEN
`affinity(đối thủ)=-90`, `death_roll` mock trả `death=true`, WHEN
resolve Nhánh A, THEN khóa `alive(nhân vật chính)=false`,
`death_flag_player=true`, `turn.is_death_turn=true`; Persistence "Khóa
slot" được gọi ĐÚNG 1 lần (mock, spy đếm=1) TRƯỚC khi tín hiệu
`death_confirmed` phát cho Character Continuation (mock, spy đếm=1,
call-order); Formula D.2 KHÔNG được gọi ở nhánh này (spy đếm=0). *(unit
+ spy call-order, provisional-interface)*

**AC-07** (Rule #3c/3d — sống sót ép `severe` qua `forced_severe`, ĐỘC
LẬP với margin_ratio thấp — điểm neo boundary chính): GIVEN
`affinity(đối thủ)=-90`, `death_roll` mock trả `death=false`,
`margin_ratio=0.05` (rõ ràng thuộc dải "mild" nếu tính thường), WHEN
resolve bước d, THEN `forced_severe=true` được set ở bước c, D.2 trả
`severity_tier="severe"` BẤT KỂ margin_ratio thấp — bảng margin
(mild/medium) bị bỏ qua hoàn toàn;
`consequence_type="phế đan điền/võ công"`,
`death_and_consequence_blocked(nhân vật chính)=true`. Test đối chứng:
CÙNG `margin_ratio=0.05` nhưng `affinity(đối thủ) > -80` (`forced_severe`
không được set) → `severity_tier="mild"` — chứng minh kết quả đổi do cờ
`forced_severe`, không phải do input D.2 đổi. *(unit,
boundary/contrast test)*

**AC-08** (Rule #3d — áp D.2 bình thường khi `forced_severe=false`):
GIVEN `affinity(đối thủ) > -80`, `margin_ratio=0.42`, WHEN resolve bước
d, THEN chạy Formula D.2 bình thường theo bảng margin (không ép
severe), `severity_tier="medium"`. *(unit)*

**AC-09** (Rule #4 — Nhánh B Kết liễu: khóa flags NPC + phát
kill_witnessed): GIVEN nhân vật chính thắng, đối thủ `pending_fate`,
người chơi chọn "Kết liễu", `entities_in_scope(scene)={global,
npc_victim, npc_A, npc_B}`, WHEN resolve, THEN khóa
`alive(npc_victim)=false`, `death_flag_npc_victim=true`; phát
`kill_witnessed(victim=npc_victim, witnesses={npc_A, npc_B})` (loại
chính npc_victim khỏi witness set) cho NPC Affinity (mock, spy đếm=1,
đúng payload). *(unit + spy)*

**AC-10** (Rule #4 — Nhánh B Tha mạng tường minh: áp CÙNG bảng D.2,
chủ thể margin_ratio là nhân vật chính): GIVEN nhân vật chính thắng với
`margin_ratio(nhân vật chính)=0.85` (chủ thể đổi so với Nhánh A), người
chơi chọn "Tha mạng" tường minh, WHEN resolve, THEN NPC bại trận nhận
`severity_tier="severe"` (CÙNG bảng D.2, cùng threshold Nhánh A dùng) —
không có bảng riêng cho NPC; `alive(npc)` KHÔNG đổi (vẫn true). *(unit)*

**AC-11** (Rule #4 — Tha mạng mặc định khi hết lượt không chọn, resolve
đúng tại thời điểm Turn Manager XÁC NHẬN lượt đó — điểm neo boundary
chính): GIVEN `pending_fate(npc)` mở đúng 1 lượt kế tiếp sau trận
thắng, WHEN lượt đó được Turn Manager XÁC NHẬN (mock) mà người chơi
KHÔNG chọn "Kết liễu" tường minh (không hành động gì liên quan HOẶC làm
việc khác), THEN hệ tự động resolve theo nhánh "Tha mạng" NGAY TẠI thời
điểm xác nhận đó — CÙNG hành vi AC-10; state `pending_fate` chuyển Idle
đúng lúc lượt đó xác nhận, KHÔNG kéo dài sang lượt thứ 2. Test đối
chứng: nếu người chơi chọn "Kết liễu" ĐÚNG trong lượt đó, timeout KHÔNG
kích hoạt (AC-09 áp dụng thay). *(unit + mock Turn Manager confirm)*

**AC-12** (Rule #4 — ý định mơ hồ hạ về Tha mạng; đóng Edge Case #4):
GIVEN người chơi nhập input tự do mơ hồ trong cửa sổ `pending_fate`
(không phân loại rõ Kết liễu/Tha mạng qua bộ phân loại xác định), WHEN
phân loại ý định, THEN hạ về mặc định **Tha mạng** — không bao giờ tự
suy diễn thành Kết liễu từ input mơ hồ. *(unit, provisional-interface —
pattern `rp_only`)*

**AC-13** (Rule #5 — mặc định `alive=true` khi tạo mới, lazy-init):
GIVEN 1 nhân vật (chính hoặc NPC) CHƯA từng được hệ này ghi field
`alive`, WHEN đọc `alive(char_id)` lần đầu, THEN trả về `true` — không
cần signal "tạo nhân vật" riêng, khớp pattern default init của NPC
Affinity (AC-30 GDD đó). *(unit)*

**AC-14** (Rule #5 — độc quyền ghi `alive=false`/`death_flag=true` CHỈ
kiểm chứng được ở TẦNG INTERFACE của module này — xem Open Questions):
GIVEN interface public của hệ này, WHEN kiểm tra bề mặt API (interface
inspection, pattern AC-09 của `npc-affinity-relationship.md`), THEN
CHỈ tồn tại đúng 2 code path nội bộ có quyền ghi (Nhánh A bước c, Nhánh
B Kết liễu) — không setter public nào khác lộ ra; mọi mock consumer
khác (Setting & Canon, Turn Manager, Character Continuation) CHỈ có
quyền đọc, gọi setter phải bị từ chối/không tồn tại. **Giới hạn**: AC
này KHÔNG (và không thể chỉ bằng unit test của module này) chứng minh
không hệ nào KHÁC trong toàn codebase ghi thẳng vào storage layer, bỏ
qua interface — xem Open Questions. *(unit, interface inspection)*

**AC-15** (Rule #6 — mặc định false, chỉ true khi severe, không tự hết
hạn): GIVEN nhân vật mới chưa từng thua severe, WHEN đọc
`death_and_consequence_blocked`, THEN = `false`; GIVEN severity_tier=
"severe" vừa khóa (từ AC-07 hoặc AC-08 dạng severe thường), WHEN đọc
lại NGAY SAU, THEN = `true`; GIVEN cờ=true, WHEN 100 lượt xác nhận trôi
qua KHÔNG có D.3 nào chạy, THEN cờ VẪN = `true`. *(unit — pattern "no
decay" giống npc-affinity AC-03)*

### Formulas

**AC-16** (D.1 — ca thường, khớp ví dụ GDD): GIVEN
`DEATH_ROLL_BASE=0.10, DEATH_ROLL_SCALE=0.85`, `margin_ratio=0.3`, roll
mock=0.2, WHEN tính `death_roll`, THEN `P_death=0.355` chính xác,
`death=true`. *(unit, regression neo số)*

**AC-17** (D.1 — ca thường 2, chạm trần MAX, khớp ví dụ GDD): GIVEN
cùng knob, `margin_ratio=1.0`, roll mock=0.97, WHEN tính `death_roll`,
THEN `P_death=clamp(0.95,...)=0.95` (không vượt `DEATH_ROLL_MAX` dù
margin=1.0 tối đa), `death=false` → kích hoạt AC-07 (ép severe).
*(unit, regression neo số)*

**AC-18** (D.1 — boundary `margin_ratio=0`, clamp sàn): GIVEN
`DEATH_ROLL_BASE=0` (cực đoan trong safe range), `margin_ratio=0`, WHEN
tính `P_death`, THEN bị clamp LÊN đúng `DEATH_ROLL_MIN=0.05` (không
phải 0) — không bao giờ 0% chết tuyệt đối dù cả base và margin đều 0.
*(unit, boundary)*

**AC-19** (D.1 — boundary `margin_ratio=1`, clamp trần): GIVEN
`DEATH_ROLL_BASE=0.3, DEATH_ROLL_SCALE=1.0` (cực đoan trong safe
range), `margin_ratio=1.0` (thô=1.3), WHEN tính `P_death`, THEN bị
clamp XUỐNG đúng `DEATH_ROLL_MAX=0.95` (không phải 1.3/1.0) — không bao
giờ 100% chết tuyệt đối. *(unit, boundary)*

**AC-20** (D.1 — biên so sánh chặt `<`, không phải `<=`): GIVEN
`roll_uniform` mock trả ĐÚNG BẰNG `P_death` (VD `P_death=0.355`,
roll=0.355), WHEN tính `death_roll`, THEN `death=false` — công thức
dùng `roll < P_death` (chặt), bằng ngưỡng KHÔNG tính là chết. *(unit,
boundary — operator correctness)*

**AC-21** (D.2 — ca thường medium + tag mặc định null, khớp ví dụ
GDD): GIVEN `SEVERITY_MILD_THRESHOLD=0.35, SEVERITY_SEVERE_THRESHOLD=
0.75`, `margin_ratio=0.42`, `npc_tag.medium_override=null`, WHEN tính
`severity_tier`, THEN `tier="medium"`, `consequence_type="sỉ nhục"`.
*(unit, regression neo số)*

**AC-22** (D.2 — ca thường severe, khớp ví dụ GDD): GIVEN cùng knob,
`margin_ratio=0.85`, WHEN tính `severity_tier`, THEN `tier="severe"`,
`consequence_type="phế đan điền/võ công"`,
`death_and_consequence_blocked=true` khóa TRONG CÙNG bước này. *(unit,
regression neo số)*

**AC-23** (D.2 — boundary mild/medium tại đúng threshold): GIVEN
`SEVERITY_MILD_THRESHOLD=0.35`, `margin_ratio` lần lượt = 0.349, 0.35,
0.351, WHEN tính tier, THEN lần lượt = "mild", "medium", "medium" —
đúng bằng ngưỡng đã rơi qua tier kế tiếp (biên `<`). *(unit, boundary)*

**AC-24** (D.2 — boundary medium/severe tại đúng threshold): GIVEN
`SEVERITY_SEVERE_THRESHOLD=0.75`, `margin_ratio` lần lượt = 0.749,
0.75, 0.751, WHEN tính tier, THEN lần lượt = "medium", "severe",
"severe". *(unit, boundary)*

**AC-25** (D.2 — `npc_tag.medium_override` chỉ áp dụng ở tier medium):
GIVEN `npc_tag.medium_override="ep_uong_doc"`, WHEN margin_ratio rơi
vào (a) medium và (b) severe, THEN (a) `consequence_type="ép uống
độc"` (ghi đè "sỉ nhục"), (b) `consequence_type` VẪN "phế đan
điền/võ công" — tag không ảnh hưởng tier severe. *(unit)*

**AC-26** (D.3 — thành công đại cơ duyên, khớp ví dụ GDD + gỡ cờ):
GIVEN `RECOVERY_FORTUNE_RATE=0.70`, roll mock=0.42,
`death_and_consequence_blocked=true` trước đó, WHEN gọi
`recovery_attempt(method=đại_cơ_duyên)`, THEN `recovery_success=true`,
cờ chuyển `false`; sự kiện cơ duyên bị tiêu (mock spy đếm=1). *(unit,
regression neo số)*

**AC-27** (D.3 — thất bại tiên thảo dị bảo, chi phí VẪN bị trừ, khớp ví
dụ GDD — 1/3 method của "cost trừ bất kể kết quả"): GIVEN
`efficacy(item)=0.55, RECOVERY_ITEM_MIN=0.05, RECOVERY_ITEM_MAX=0.90`,
roll mock=0.71, WHEN gọi `recovery_attempt(method=tiên_thảo_dị_bảo)`,
THEN `P=0.55`, `recovery_success=false`, cờ giữ nguyên `true`; NHƯNG
item VẪN bị tiêu thụ (mất charge/instance, mock spy đếm=1). *(unit,
regression neo số, provisional-interface — `efficacy` schema)*

**AC-28** (D.3 — thất bại tự tu, chi phí VẪN bị trừ (reset cooldown) —
2/3 method): GIVEN `RECOVERY_SELF_RATE=0.12` (default, sửa 2026-08-08),
roll mock=0.5 (thất bại), `current_turn=100`, WHEN gọi
`recovery_attempt(method=tự_tu)`, THEN `recovery_success=false`, cờ
giữ nguyên `true`; NHƯNG `last_self_attempt_turn(character)` VẪN set =
100. *(unit)*

**AC-29** (D.3 — thất bại đại cơ duyên, chi phí VẪN bị trừ — 3/3
method, hoàn thiện "cost trừ bất kể kết quả"): GIVEN
`RECOVERY_FORTUNE_RATE=0.70`, roll mock=0.85 (thất bại), WHEN gọi
`recovery_attempt(method=đại_cơ_duyên)`, THEN `recovery_success=false`,
cờ giữ nguyên `true`; NHƯNG sự kiện cơ duyên VẪN bị tiêu (mock spy
đếm=1). *(unit — cùng nhóm AC-27/AC-28)*

**AC-30** (D.3 — thành công tự tu, khớp ví dụ GDD, boundary cooldown
chính xác): GIVEN `RECOVERY_SELF_COOLDOWN_TURNS=5` (default, sửa
2026-08-08), `last_self_attempt_turn=95, current_turn=100` (hiệu=5),
roll mock=0.03 < 0.12, WHEN kiểm `recovery_self_attempt_allowed` rồi
gọi `recovery_attempt`, THEN `allowed=true`, `recovery_success=true`,
cờ gỡ `false`. *(unit, regression neo số)*

**AC-31** (D.3 — boundary cooldown CHƯA đủ, hành động bị chặn TRƯỚC khi
tốn resource): GIVEN `RECOVERY_SELF_COOLDOWN_TURNS=5` (default, sửa
2026-08-08), `last_self_attempt_turn=96, current_turn=100` (hiệu=4<5),
WHEN kiểm `recovery_self_attempt_allowed`, THEN = `false` — "Tự tu"
KHÔNG xuất hiện trong gợi ý; `roll_uniform` KHÔNG được gọi (spy đếm=0),
`last_self_attempt_turn` KHÔNG đổi. *(unit + spy, boundary)*

### Edge Cases

**AC-32** (Edge Case #2 — blocked flag idempotent khi thua tiếp lúc
đang phế): GIVEN `death_and_consequence_blocked=true` (đang phế), nhân
vật chính thua tiếp trận mới với `severity_tier` tính lại = "severe",
WHEN resolve, THEN cờ VẪN `true` (không "phế 2 lần", không cộng dồn
hiệu ứng cơ học); `consequence_type`/`severity_tier` VẪN tính bình
thường cho tường thuật lượt đó, chỉ KHÔNG có side-effect cơ học bổ sung
nào. *(unit — idempotency test)*

**AC-33** (Edge Case #3 — bị phế KHÔNG miễn trừ death_roll, không "bảo
hiểm kép"): GIVEN `death_and_consequence_blocked=true`, nhân vật chính
rơi vào Nhánh A với `affinity(đối thủ) ≤ -80`, WHEN `death_roll` chạy,
THEN thực thi BÌNH THƯỜNG (không bị skip vì đang phế); GIVEN roll mock
cho `death=true`, THEN chết thật xảy ra dù đang phế đan điền. *(unit)*

**AC-34** (Edge Case #5 — kill_witnessed 0 nhân chứng, "tội ác hoàn
hảo"): GIVEN `entities_in_scope(scene) \ {npc}` rỗng, người chơi chọn
Kết liễu, WHEN resolve, THEN `alive(npc)=false`/`death_flag_npc=true`
VẪN khóa bình thường (không phụ thuộc số nhân chứng); `kill_witnessed`
VẪN phát ra cho NPC Affinity nhưng với witness set RỖNG (không phải
không phát sự kiện). *(unit)*

**AC-35** (Edge Case #7 — recovery_attempt khi KHÔNG bị phế, chặn
TRƯỚC khi tốn resource): GIVEN `death_and_consequence_blocked=false`,
WHEN người chơi cố gọi `recovery_attempt` (bất kỳ method), THEN hành
động bị TỪ CHỐI TRƯỚC khi `roll_uniform` được gọi (spy đếm=0) và TRƯỚC
khi bất kỳ resource nào bị tiêu (item/cơ duyên/lượt tự tu — spy đếm=0
cả 3) — không phải no-op âm thầm mà action không xuất hiện trong gợi ý
hợp lệ. *(unit + spy)*

**AC-36** (Edge Case #8 — nhân vật MỚI sau Chơi lại không kế thừa cờ):
GIVEN nhân vật chính CŨ chết thật trong khi
`death_and_consequence_blocked=true`, Character Continuation phát
`char_id` MỚI (mock), WHEN đọc `alive`/`death_and_consequence_blocked`
của `char_id` MỚI lần đầu, THEN `alive=true`,
`death_and_consequence_blocked=false` (lazy-init, khớp AC-13/AC-15) —
KHÔNG có đường đọc nào trả về giá trị của `char_id` CŨ. *(unit,
provisional-interface — Character Continuation đã Designed)*

**AC-37** (Edge Case #9 — NPC Song Tu active bị Kết liễu, không cần
logic riêng): GIVEN NPC đang có quan hệ Song Tu active (mock trạng thái
NPC Affinity), người chơi chọn Kết liễu NPC đó, WHEN resolve, THEN hành
vi ĐÚNG NHƯ AC-09, KHÔNG có nhánh code riêng rẽ theo trạng thái Song Tu
— hệ này không đọc/không quan tâm trạng thái Song Tu khi Kết liễu.
*(unit — negative-assertion, xác nhận rõ ràng hành vi không-có-nhánh-riêng)*

**AC-38** (Edge Case #10 — Undo lượt vừa resolve, KHÔNG PHẢI lượt chết
thật, rollback toàn bộ cờ): GIVEN snapshot X trước lượt N; lượt N
resolve `severity_tier="severe"` (khóa blocked=true) HOẶC Kết liễu
(khóa alive/death_flag NPC) HOẶC pending_fate còn đang mở, WHEN Turn
Manager Undo đúng lượt N (mock, độ sâu 1, `is_death_turn=false`), THEN
MỌI cờ hệ này vừa khóa trong lượt N rollback về ĐÚNG snapshot X — không
field nào rollback một phần. *(unit + mock Turn Manager)*

**AC-38b** (Edge Case #10 — Undo lượt Tha mạng, kể cả timeout mặc
định; bổ sung 2026-08-09, đóng finding R1 `qa-lead`): GIVEN lượt N
resolve nhánh Tha mạng (tường minh HOẶC timeout mặc định, AC-10/AC-11)
với `severity_tier="severe"` → `death_and_consequence_blocked(npc)=true`,
WHEN Turn Manager Undo đúng lượt N (mock, `is_death_turn=false`), THEN
cờ NPC rollback về `false` VÀ state `pending_fate(npc)` quay lại
"Pending Fate" (mở, chưa quyết định) — KHÔNG phải `Idle`. *(unit + mock
Turn Manager — bổ sung vì AC-38 gốc chỉ nêu tên "Kết liễu"/"severe"/
"pending_fate còn mở", không nêu tên tường minh nhánh Tha mạng dù Edge
Case gốc nêu tên cả 2)*

**AC-39** (Edge Case #10 — biên: lượt chết thật KHÔNG BAO GIỜ undo
được): GIVEN lượt N là chết thật (Nhánh A bước c,
`turn.is_death_turn=true`), WHEN kiểm `undo_availability_window`
(registry, mock Turn Manager) cho lượt N kể cả khi là lượt gần nhất,
THEN `undo_available=false` TUYỆT ĐỐI — NGOẠI LỆ DUY NHẤT so với mọi
lượt D&C khác (đối chứng AC-38, nơi lượt severe/Kết liễu không có
`is_death_turn=true` và VẪN undo được). *(unit — đóng biên trách nhiệm
giữa Rule #3c và Turn Manager Rule #9)*

### Round 1 `/design-review` Fixes (bổ sung 2026-08-08)

**AC-40** (D.1/D.2 — regression: input int thô, mirror
`npc-affinity-relationship.md` AC-13b; đóng Blocking #1/#2): GIVEN
`hp_after(đối thủ)=42` (int), `max_HP(đối thủ)=100` (int) — KHÔNG ép
kiểu trước khi truyền vào formula, WHEN tính `margin_ratio`, THEN kết
quả PHẢI = `0.42` (float), KHÔNG PHẢI `0` (int truncation) —
implementation BẮT BUỘC dùng `float(hp_after)/max(max_HP,1)`, không
được truyền thẳng 2 số nguyên vào phép chia ngôn ngữ gốc. Test đối
chứng: GIVEN cùng input đó chạy tiếp qua D.2
(`SEVERITY_MILD_THRESHOLD=0.35, SEVERITY_SEVERE_THRESHOLD=0.75`), THEN
`severity_tier="medium"` (khớp đúng ví dụ D.2 GDD tự đưa ra) — KHÔNG
PHẢI `"mild"` (kết quả sai nếu truncation xảy ra). *(unit, regression —
lớp lỗi đã xảy ra 2 lần trong repo ở `combat-system.md`/
`npc-affinity-relationship.md`)*

**AC-41** (D.1/D.2 — `max_HP=0`, dữ liệu lỗi upstream không crash; đóng
Blocking #1): GIVEN `max_HP(đối thủ)=0` (dữ liệu lỗi từ Combat, không
hợp lệ nhưng có thể xảy ra do bug upstream), WHEN tính `margin_ratio`,
THEN KHÔNG crash chia-cho-0 — sàn `max(max_HP,1)` trả
`margin_ratio = hp_after/1 = hp_after`, được `clamp` xử lý tiếp bình
thường ở D.1/D.2. *(unit, boundary — degenerate input)*

**AC-42** (Rule #3c — `forced_severe` không rò rỉ trạng thái qua lượt
khác; đóng Blocking #8): GIVEN lượt N: nhân vật chính thua trước đối
thủ `affinity=-90` (≤-80), `death_roll` trả sống sót → `forced_severe=
true` → `severity_tier` ép `severe`. GIVEN lượt N+k (trận HOÀN TOÀN
khác) sau đó: nhân vật chính thua trước đối thủ KHÁC với `affinity=0`
(không đạt ngưỡng), `margin_ratio=0.15` (thuộc dải "mild" theo bảng),
WHEN resolve Nhánh A bước d của lượt N+k, THEN `forced_severe` đọc được
= `false` (đã reset), `severity_tier="mild"` bình thường — KHÔNG bị ăn
ké giá trị `true` còn sót từ lượt N. *(unit — regression, chuỗi 2 lần
resolve độc lập)*

**AC-43** (Edge Case Undo — bổ sung `last_self_attempt_turn` vào
rollback; đóng Blocking #9): GIVEN `last_self_attempt_turn(character)=
92` trước lượt N; lượt N người chơi thử `tự_tu` (thất bại),
`current_turn=100` → `last_self_attempt_turn` set = `100`, WHEN Turn
Manager Undo đúng lượt N (mock, `is_death_turn=false`), THEN
`last_self_attempt_turn(character)` rollback về `92` (KHÔNG giữ `100`)
— `recovery_self_attempt_allowed` tính đúng lại theo `current_turn`
mới (99) so với `92`. *(unit + mock Turn Manager)*

**AC-44** (Edge Case Undo — hoàn trả resource D.3 thuộc hệ khác khi
Undo; đóng Blocking #10, provisional-interface): GIVEN lượt N chạy
`recovery_attempt(method=tiên_thảo_dị_bảo)` tiêu 1 instance item (mock
Equipment & Skill Data, spy ghi nhận đã trừ), WHEN Turn Manager Undo
đúng lượt N, THEN Equipment & Skill Data (mock) nhận tín hiệu hoàn trả
instance item đó (spy đếm=1) — Death & Consequence không tự giữ bản
sao item, chỉ đảm bảo tín hiệu Undo lan đúng tới hệ sở hữu resource.
*(integration, provisional-interface — mô hình tiêu thụ item chưa
chốt, xem Open Questions)*

**AC-45** (Rule #1 — giao hữu vẫn ra win/lose KHÔNG resolve; đóng
Blocking #11, đóng edge case cuối cùng của mục Edge Cases): GIVEN
`is_spar_friendly=true` VÀ Combat phát `outcome.type ∈ {"win","lose"}`
(không cân sức/không parity — D.9b của `combat-system.md`), WHEN Combat
phát `battle_active=false`, THEN Death & Consequence hoàn toàn KHÔNG
resolve — không nhánh nào chạy, không field nào bị khóa, giống hệt xử
lý `outcome.type="no_outcome"` (đối chứng AC-01 kịch bản c). *(integration
test, mock Combat hand-off, spy đếm=0 mọi setter)*

**AC-46** (SUPERSEDED 2026-08-09, `/design-review` round 1 — Core Rule
#6 giờ áp penalty Lực chiến THẬT thay vì cấm narration; xem
`combat-system.md` AC boundary mới cho `crippled_layer`): AC này KHÔNG
còn áp dụng — không còn ràng buộc narration nào cần audit, vì
`death_and_consequence_blocked=true` giờ tạo ra suy giảm chiến lực THẬT
(qua `combat-system.md` D.1 `crippled_layer`), nên AI mô tả "yếu đi"
không còn là vi phạm mà là mô tả trung thực khớp `effective_stat` đã
khóa. Số AC này giữ nguyên làm mốc lịch sử (không tái dùng số), không
tính vào tổng AC hiệu lực của hệ này.

### Round 1 `/design-review` Fixes — batch 2 (bổ sung 2026-08-09, qua skill `/design-review`)

**AC-47** (Rule #6 — độc quyền gỡ cờ `death_and_consequence_blocked`
CHỈ qua D.3 thành công; đóng finding R2 `qa-lead`, đối xứng AC-14 của
Rule #5): GIVEN interface public của hệ này, WHEN kiểm bề mặt API
(interface inspection, cùng pattern AC-14), THEN CHỈ tồn tại đúng 1
code path ghi `death_and_consequence_blocked=false` (nhánh D.3 thành
công) — không setter public nào khác lộ ra để gỡ cờ trực tiếp. **Giới
hạn** (bổ sung 2026-08-09, `/design-review` round 2, đóng finding
`qa-lead` — đối xứng đúng câu chữ AC-14): AC này KHÔNG (và không thể
chỉ bằng unit test của module này) chứng minh không hệ nào KHÁC trong
toàn codebase ghi thẳng vào storage layer, bỏ qua interface — xem Open
Questions (hàng CI-lint, phạm vi mở rộng round 2 để bao gồm field này).
*(unit, interface inspection)*

**AC-48** (D.1/D.3 — RNG injection contract; đóng finding R3 `qa-lead`):
GIVEN implementation của `death_roll`/`recovery_attempt`, WHEN kiểm chữ
ký hàm (interface inspection), THEN nguồn RNG PHẢI là tham số/dependency
injected tường minh (không phải lệnh gọi global/static ẩn bên trong) —
xác nhận bằng cách truyền 2 seeded stub khác nhau liên tiếp trong cùng
1 test run và không có state rò rỉ giữa 2 lần gọi. *(unit, interface
inspection)*

**AC-49** (Rule #4 Tha mạng — delta Hảo cảm khi tier=medium cho NPC;
đóng finding "mild/medium không khác biệt cơ học" `creative-director`):
GIVEN nhân vật chính thắng, chọn Tha mạng, `severity_tier="medium"`
cho NPC bại trận, `entities_in_scope(scene)={global, npc_victim, npc_A}`,
WHEN resolve, THEN hệ này PHÁT `classified_event(type="insult",
victim=npc_victim, witnesses={npc_A})` cho NPC Affinity (mock, spy
đếm=1, đúng payload) — TÁI DÙNG event type `insult` có sẵn, không tạo
event type mới. Test đối chứng: CÙNG kịch bản nhưng Nhánh A (nhân vật
chính bị sỉ nhục, không phải NPC), THEN `classified_event` KHÔNG được
phát (spy đếm=0) — game không theo dõi Hảo cảm nhân vật chính dành cho
NPC như 1 field cơ học. *(unit + spy)*

### Round 2 `/design-review` Fixes (bổ sung 2026-08-09, narrow verify pass)

**AC-50** (Rule #3d/#4 — `forced_severe_margin_ratio` PHẢI tới được
payload narration; đóng finding "cosmetic-only fix"
`creative-director`/`game-designer`): GIVEN `forced_severe=true` (đối
thủ thù địch sâu sắc, sống sót sau `death_roll`, `margin_ratio=0.12`
gốc), WHEN hệ này khóa `locked_result` cho lượt đó, THEN
`forced_severe_margin_ratio=0.12` (giá trị GỐC, KHÔNG phải giá trị D.2
tính lại) CÓ MẶT trong `locked_result` (mock kiểm payload, spy xác nhận
field tồn tại + đúng giá trị). Test đối chứng: CÙNG kịch bản nhưng
`severity_tier="severe"` đạt được bình thường qua bảng D.2 (KHÔNG qua
`forced_severe`), THEN `forced_severe_margin_ratio` VẮNG MẶT hoàn toàn
trong `locked_result` (không phải `null`/`0` — không có field) — đúng
câu chữ "trường này CHỈ có mặt khi forced_severe=true" ở Core Rule 3d.
*(unit + spy, kiểm payload — đóng gap round 1 chỉ khai ý định, chưa
test việc phát/chuyển tiếp)*

## Open Questions

| Question | Owner | Deadline | Resolution |
|----------|-------|----------|-----------|
| Rule #5 ("KHÔNG có đường nào khác được đổi `alive`/`death_flag`") không thể chứng minh trọn vẹn chỉ bằng unit test của module này — AC-14 chỉ kiểm được ở tầng interface. Cần: architecture-contract/lint test cấp dự án (grep toàn codebase tìm write trực tiếp vào field này ngoài module) đưa vào CI. **Mở rộng phạm vi 2026-08-09 (`/design-review` round 2, đóng finding `qa-lead` + `creative-director`)**: CI-lint PHẢI bao gồm CẢ `death_and_consequence_blocked` (AC-47, cùng lớp "chỉ kiểm ở tầng interface") — không chỉ `alive`/`death_flag`. Field này KHÔNG còn thuần vệ sinh code từ round 1: nó giờ là đầu vào trực tiếp của `combat-system.md` D.1 (`crippled_layer`), nên 1 đường ghi trái phép giờ là vector gian lận Lực chiến, không chỉ lệch kinh tế EXP. | technical-director | **Trước khi hệ này MERGE VÀO MAIN** (đổi từ "trước khi Approved" — quyết định `creative-director` + user 2026-08-08, `/design-review` round 1: đây là bảo đảm vệ sinh codebase cần CI-lint trên code chưa tồn tại, không thể giải bằng công việc thiết kế) | **Đã chốt phạm vi**: AC-14/AC-47 được CHẤP NHẬN là trần coverage tự động ở tầng thiết kế (module tự kiểm interface, không tự kiểm toàn codebase) — KHÔNG chặn verdict Approved của GDD này; CI-lint là điều kiện merge, không phải điều kiện Approved; phạm vi CI-lint PHẢI phủ cả 3 field (`alive`, `death_flag`, `death_and_consequence_blocked`) |
| **[Mới 2026-08-09, `/design-review` round 2, đóng finding `systems-designer` "dead pointer"]** 3 cặp knob bất biến `MIN < MAX` (`SEVERITY_MILD_THRESHOLD < SEVERITY_SEVERE_THRESHOLD`, `DEATH_ROLL_MIN < DEATH_ROLL_MAX`, `RECOVERY_ITEM_MIN < RECOVERY_ITEM_MAX` — xem Formulas, "Bất biến bắt buộc") chưa có load-time validation ở đâu — an toàn hiện tại CHỈ nhờ Safe Range không giao nhau, chưa được enforce. Áp dụng chung cho MỌI GDD có cặp knob MIN/MAX tương tự (cùng lớp rủi ro với `FLOOR_LAYER`/`FLOOR_TOTAL` của `combat-system.md`), không riêng hệ này. | technical-director | trước khi hệ này merge vào main (cùng deadline hàng CI-lint phía trên — cùng lớp "bảo đảm vệ sinh codebase") | Chưa quyết — không chặn Approved (Safe Range hiện tại không giao nhau, rủi ro chỉ phát sinh nếu tuning vượt Safe Range mà không qua enforcement) |
| **[Mới 2026-08-08]** `consequence_type_[char]`/`consequence_witnesses_[char]` (field mới, đóng Blocking #3) mặc định `importance_tier=0` qua World Memory D.5 (`setting-canon-integration.md`) — chưa có rule tier riêng (VD tier 2 khi severe, giống affinity swing lớn) như 3 field provisional khác (`death_flag_[char]`, `breakthrough_flag_[char]`, `battle_result_[char]`) đã có ở D.5. | systems-designer | trước `/design-review` re-review kế tiếp của `setting-canon-integration.md` | Chưa quyết — không chặn MVP vì tier 0 vẫn được World Memory lưu, chỉ ảnh hưởng thứ tự ưu tiên khi fact bị cắt bớt do `max_facts_per_entity` |
| ~~`efficacy(item)` (Formula D.3, nhánh tiên thảo dị bảo) chưa tồn tại trên item schema~~ — **đã bổ sung 2026-08-05** (cụm D `/design-review` gộp 11 GDD): schema "Vật phẩm hồi phục" trên `equipment-skill-data-system.md`, field `efficacy: float [0,1]`, tác giả item tự khai, không default. **Còn lại**: mô hình tiêu thụ (single-use hay có "charge") chưa quyết. | game-designer + systems-designer | trước khi authoring content tiên thảo dị bảo thật | Một phần — schema field đã đóng, mô hình tiêu thụ còn mở |
| Chưa có hệ nào sở hữu việc kích hoạt/tần suất sự kiện "đại cơ duyên" — D.3 chỉ định nghĩa tỷ lệ thành công KHI sự kiện đã xảy ra. | narrative-director + game-designer | trước Vertical Slice (nội dung đại cơ duyên thật) | Chưa quyết — có thể thuộc Situation/Encounter Generation hoặc một hệ story-event riêng |
| `npc_tag.medium_override` (D.2 — chọn "ép uống độc" thay "sỉ nhục") cần 1 trường content-authored trên schema NPC — chưa rõ hệ nào sở hữu schema đó (`character-card-identity.md`, hệ #14, status **Designed — Pending Review**, sửa 2026-08-09: bản trước ghi nhầm "chưa thiết kế"). **Bổ sung 2026-08-09 (`narrative-director`)**: field này đổi ý nghĩa ngữ nghĩa tùy nhánh — Nhánh A đọc tag của kẻ THẮNG (đòn thù đặc trưng); Nhánh B Tha mạng đọc tag của NPC đang THUA (người thắng thật — nhân vật chính — không có tag) — cần làm rõ ngữ nghĩa tường minh khi thiết kế schema: "đòn thù khi ở vai kẻ mạnh hơn" hay "mô-típ gắn với nhân vật bất kể vai trò". | game-designer | khi Character Card & Identity được thiết kế | Chưa quyết — mặc định null (→"sỉ nhục") vẫn hoạt động đầy đủ ở MVP nếu thiếu tag |
| ~~Cơ chế `outcome="no_outcome"` của `combat-system.md`~~ — **đã sửa 2026-08-03 cùng phiên**: `MAX_EXCHANGE_COUNT` không còn là trần thiết kế; hòa giờ chỉ qua D.9b (giao hữu, parity + HP thấp) hoặc D.9c-trong-spar (chạm trần kỹ thuật) hoặc tín hiệu khẩn cấp xen ngang (`external_abort_signal`) — ngoài spar luôn bắt buộc win/lose. AC-01 của GDD này ("no_outcome không resolve") vẫn đúng nguyên vẹn (mọi nhánh no_outcome mới vẫn là no_outcome). | game-designer + systems-designer | — | **Còn lại**: điều kiện trigger `external_abort_signal` thuộc `situation-encounter-generation.md`, chưa thiết kế — xem Open Question tương ứng ở đó |
| **[Mới 2026-08-09, đóng finding D-CRITICAL `systems-designer` + xác nhận `creative-director`]** `max_HP` là **orphan field toàn dự án**: 3 GDD tiêu thụ (`combat-system.md`, `death-and-consequence.md`, `npc-affinity-relationship.md`), **0 GDD sở hữu/định nghĩa/khởi tạo/chặn biên**. `character-card-identity.md` (hệ #14) là ứng viên tự nhiên nhưng chưa tuyên bố sở hữu field này tường minh trong Detailed Rules của chính nó. | technical-director (route sang systems-designer khi `character-card-identity.md` được thiết kế/review) | trước khi `character-card-identity.md` chuyển Approved | Chưa quyết — file RA NGOÀI GDD này có chủ thật, không để lại làm Open Question vô chủ (đúng cảnh báo `creative-director`: đây chính pattern đã gây ra gap Blocking #1 của round này) |
| **[Mới 2026-08-09, `ux-designer` + `creative-director`]** Không có tín hiệu UI xác nhận cơ học độc lập với việc AI narration đang xử lý/lỗi — đúng lúc rủi ro cao nhất (chết thật/Kết liễu). `ai-llm-integration-layer.md` UI Requirements hiện ghi "[To be designed]"; toàn bộ ngôn ngữ "fallback" ở đó là fallback model/network, không phải "narration hỏng hoàn toàn thì người chơi thấy gì". | ux-designer + ai-llm-integration-layer owner | trước `/ux-design character-card.md` VÀ trước khi `ai-llm-integration-layer.md` UI Requirements được thiết kế | Chưa quyết — không chặn Approved của GDD này (surface thuộc 2 hệ khác), nhưng đã khai yêu cầu tường minh ở UI Requirements (xem hàng "Xác nhận cơ học độc lập với narration") |
| **[Mới 2026-08-09, đóng finding gốc "cùng lỗi field-shape ở `npc-affinity-relationship.md` D.1" `creative-director`]** `npc-affinity-relationship.md` D.1 (`combat_win_vs_npc`) có công thức `margin_ratio` với cùng lỗi field-shape đã sửa ở GDD này (`hp_after(người thắng)` viết như field cấp ngoài, thực ra lồng trong `per_actor`) — ĐÃ SỬA cascade cùng phiên này (xem file đó), ghi lại đây làm mốc tham chiếu vì đây là hệ đã Approved. | systems-designer | — (đã sửa) | **Đã đóng** — sửa field-shape trong cùng phiên `/design-review` này, xem `npc-affinity-relationship.md` D.1 |
