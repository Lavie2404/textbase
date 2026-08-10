# EXP & Realm Progression

> **Status**: Approved (`/design-review` vòng 2 + verify hẹp hoàn tất, 2026-08-08 — xem `design/gdd/reviews/exp-realm-progression-review-log.md`)
> **Author**: user + agents
> **Last Updated**: 2026-08-08
> **Implements Pillar**: Pillar 3 (Sức Mạnh Có Logic)

## Overview

EXP & Realm Progression là hệ thống dữ liệu sở hữu toàn bộ khái niệm "cấp" và
"bậc/cảnh giới" của nhân vật trong Vô Danh Lục: tích lũy điểm kinh nghiệm
(EXP) từ nhiều nguồn hành động, quy đổi qua hệ số Tâm pháp, và quản lý việc
lên cấp theo quy tắc 10 cấp = 1 bậc/cảnh giới. Với người chơi, đây chính là
cảm giác "tu luyện" cụ thể nhất của thể loại tu tiên — mỗi lần đủ EXP để lên
cấp là một xác nhận tiến bộ nhỏ, và mỗi lần vượt qua một mốc tròn chục (cấp
10, 20, 30...) để đột phá sang bậc/cảnh giới mới là một khoảnh khắc lớn, có
điều kiện riêng chứ không chỉ đơn thuần đủ EXP (ví dụ: cần thêm Hồn Hoàn ở
các mốc đó, theo motif nguyên tác Đấu La Đại Lục). Giá trị `tier(C)` mà hệ
này tính ra được Combat System đọc trực tiếp để tính áp chế cảnh giới
(Formula D.1) — không có hệ này, Combat không có cách nào biết ai đang ở bậc
nào để áp dụng phạt vượt bậc, và Character Card không có gì để hiển thị ở
mục Cấp độ - Bậc.

## Player Fantasy

Người chơi cảm nhận sự tu luyện dày công gây dựng: mỗi trận thắng, mỗi tình
huống vượt qua đều cộng dồn vào EXP, và ranh giới rõ ràng nhất của tiến bộ
không phải là một bảng số liệu tăng đều mà là những **MỐC ĐỘT PHÁ**
(breakthrough) — vượt cấp tròn chục để bước sang bậc/cảnh giới mới. Cảm giác
đúng là hồi hộp-thỏa mãn kiểu "đủ điều kiện đột phá chưa?" thay vì chỉ "đủ
EXP chưa?" — vì đến ngưỡng tròn chục, đủ EXP thôi CHƯA đủ, cần thêm một điều
kiện đặc thù (ví dụ Hồn Hoàn ở Đấu La Đại Lục), khiến mỗi lần đột phá thành
công giống một cột mốc thật trong hành trình tu luyện, chứ không đơn thuần
"cày đủ số" — đúng tinh thần "không ai cho không bạn điều gì" của Core
Fantasy. Đây trực tiếp phục vụ Pillar 3 (Sức Mạnh Có Logic) — sức mạnh tăng
theo công thức minh bạch, không có hào quang nhân vật chính; và phần thưởng
cảm xúc của breakthrough được xác nhận khách quan qua Thẻ Nhân Vật (mục Cấp
độ - Bậc), không chỉ qua lời AI tường thuật (Pillar 4 chỉ diễn dịch, không
quyết định).

*(`creative-director` không được tham vấn cho section này — Lean mode, chỉ
Formulas/Acceptance Criteria bắt buộc spawn specialist ở lean mode.)*

## Detailed Design

### Core Rules

1. Mỗi nhân vật có `level` (cấp, 1 → ∞) và `tier` (bậc/cảnh giới) =
   `floor((level - 1) / 10) + 1`. Quy tắc 10 cấp = 1 bậc (`game-concept.md`
   Core Mechanics #3). `level ∈ [1,∞)` từ khởi tạo — không rule nào trong
   GDD này giảm `level` ngoại trừ Rollback (Rule 8) khôi phục về 1 snapshot
   hợp lệ trước đó (invariant tường minh hóa 2026-08-08, `/design-review`
   vòng 1, cụm B5). `tier(C)` LÀ một **derived/computed property** thuần
   túy từ `level(C)` qua công thức trên — KHÔNG lưu trữ độc lập trong data
   model (làm rõ 2026-08-08, cụm B6 — tránh lớp bug desync nếu
   implementation vô tình lưu `tier` như 1 field riêng rồi quên đồng bộ khi
   Rollback chỉ phục hồi `level`). Vì `level≥1` luôn đúng, `tier(C)` KHÔNG
   BAO GIỜ bằng 0 ở bất kỳ trạng thái hợp lệ nào (`tier(1)=1` là biên SÀN
   thật — xem sửa đổi EC-6/AC-37, cụm B2/A12).
2. 4 nguồn EXP cộng dồn mỗi lượt xác nhận VÀ không bị undo (Turn Manager Core
   Rule #7/#8) — TRỪ KHI lượt đó là `is_death_turn=true` (nhân vật chính
   chết thật): khi đó TOÀN BỘ 4 nguồn bị chặn, không chỉ combat (xem D.6,
   short-circuit toàn cục giống Rule #9 bên dưới):
   - **Combat thắng**: EXP theo công thức riêng dựa trên chênh lệch tier với
     đối thủ (chi tiết ở Formulas). Chỉ tính đúng 1 lần, ở lượt
     `locked_result.battle_active` chuyển sang `false` (kết trận) — KHÔNG
     tính lại theo từng pha giao đấu bên trong trận.
   - **Combat thua**: EXP cố định = 4% (theo `game-concept.md` mục Cái
     Chết) — KHÔNG áp dụng nếu lượt đó là `is_death_turn=true` (chết thật
     thì hand-off Character Continuation, không "tiếp tục tu luyện" ở lượt
     đó). Cùng thời điểm kết trận như combat thắng, không tính lại theo pha.
   - **Thụ động**: mỗi lượt xác nhận (không undo) VÀ `turn.in_combat=false`
     tự động +0.1% của ngưỡng EXP cấp hiện tại→kế tiếp (sửa 2026-08-08,
     `/design-review` vòng 2, cụm A2-1 — hạ từ +1%, xem D.1 Invariant kinh
     tế mới/Tuning Knobs), vô điều kiện, không cần hành động cụ thể khác.
   - **Song Tu**: bonus EXP mỗi lượt khi (a) nhân vật sở hữu Tâm Pháp loại
     song-tu VÀ (b) self đang trong quan hệ Song Tu active với 1 bên khác
     (player hoặc NPC — quan hệ Song Tu vốn là 1 trạng thái CHUNG giữa 2
     bên, không hướng; nếu self=NPC_X, kiểm tra NPC_X có nằm trong tập
     "quan hệ Song Tu active" của player hay không — CÙNG 1 flag đã track
     ở `npc-affinity-relationship.md` Tầng 2 State Machine, không cần model
     NPC↔NPC mới vì Song Tu trong game này LUÔN là quan hệ player↔NPC,
     không có NPC↔NPC — self-relative hóa 2026-08-08, `/design-review`
     vòng 2, cụm A2-5, cùng tinh thần Core Rule #11/A13) (nguồn: NPC
     Affinity & Relationship — **đã Designed**) VÀ (c) `turn.in_combat=false`.

   **Sửa đổi 2026-08-08** (`/design-review` vòng 1, cụm A1 — BLOCKING, tìm
   thấy bởi `economy-designer`, escalate bởi `creative-director` thành
   Most Important Finding #1): nguồn Thụ động VÀ Song Tu KHÔNG cộng dồn khi
   `turn.in_combat=true` — mỗi pha giao đấu bên trong 1 trận CŨNG là 1 lượt
   Turn Manager (`combat-system.md` Core Rule #1), nên nếu không loại trừ,
   EXP thụ động sẽ cộng dồn theo SỐ PHA giao đấu (mặc định ước tính
   `CONTENT_EXCHANGE_ESTIMATE=30` pha/trận): 30 pha × 1% = 30% ngưỡng chỉ
   từ tick thụ động, xấp xỉ gấp đôi phần thưởng THẮNG trận cùng bậc (15%)
   — đảo ngược hoàn toàn incentive hierarchy dự định (kéo dài trận áp đảo
   thắng nhanh) VÀ phá vỡ invariant "tương quan cảnh giới không đổi trong 1
   trận" của `combat-system.md` Core Rule #4 (nếu `level`/`tier` đổi giữa
   chừng 1 trận vì lên cấp liên tục từ tick thụ động). *(Ghi chú 2026-08-08,
   `/design-review` vòng 2, cụm A2-1: số liệu "1%"/"15%" ở đoạn trên mô tả
   bug gốc bằng giá trị TẠI THỜI ĐIỂM phát hiện (`PASSIVE_EXP_RATE=0.01`,
   `WIN_EXP_BASE_FRACTION=0.15`) — 2 hằng số này đã hạ/đổi xuống
   `0.001`/`0.20` từ vòng 2 (xem D.1 Invariant kinh tế mới, D.2, Tuning
   Knobs); đoạn trên KHÔNG đại diện default hiện hành, chỉ giữ nguyên để
   minh họa MỨC ĐỘ nghiêm trọng của bug gốc mà cụm A1 đã sửa bằng
   `turn.in_combat` gate.)*

   `turn.in_combat` phản ánh đúng trạng thái Turn Manager/Combat tại lượt
   đó (`combat-system.md` States and Transitions) — **true** xuyên suốt
   "In Combat — Awaiting Exchange", "Resolving Exchange", VÀ "Battle
   Concluded" (kể cả lượt kết trận!), chỉ **false** kể từ lượt "Not In
   Combat" trở đi. Vì vậy `combat_win_exp`/`combat_loss_exp` (gate theo
   `locked_result.battle_active=false`, không theo `in_combat`) và
   passive/Song Tu (gate theo `in_combat=false`) KHÔNG BAO GIỜ cùng resolve
   trong 1 lượt: lượt kết trận chỉ sinh EXP combat; lượt ĐẦU TIÊN sau đó
   (đã "Not In Combat") mới sinh lại passive/Song Tu bình thường. Xem
   AC-31/AC-31b cho ví dụ tường minh của cả 2 nhánh.
3. **Tâm Pháp** (sở hữu tối thiểu ở GDD này, không thiết kế đầy đủ 1 hệ Tâm
   Pháp riêng): mỗi nhân vật có đúng 1 Tâm Pháp active tại một thời điểm —
   field tối thiểu `tam_phap_id`, `exp_multiplier` (float ≥ 1, mặc định 1.0
   nếu chưa có Tâm Pháp), `type` (đơn tu | song tu). `exp_multiplier` nhân
   vào TOÀN BỘ EXP nhận được ở lượt đó, áp dụng đều cho cả 4 nguồn ở Rule 2,
   trước khi cộng vào tổng. **Ghi chú khuyến nghị (thêm 2026-08-08,
   `/design-review` vòng 1, cụm A14, hội tụ độc lập từ `systems-designer` +
   `game-designer`)**: KHÔNG như mọi multiplier khác trong GDD này
   (`WIN_EXP_CEIL_MULT`, `PERCENT_STAT_CAP`...), `exp_multiplier` hiện
   không có trần/Safe Range nào — vì giá trị cụ thể thuộc quyền sở hữu 1 hệ
   Tâm Pháp tương lai (chưa thiết kế), GDD này không tự đặt hằng số, nhưng
   khuyến nghị hệ đó áp 1 trần (VD `TAM_PHAP_EXP_MULTIPLIER_MAX`) đủ thấp
   để 1 trận thắng không vượt quá ~1 cấp's worth EXP — tránh cascade nhiều
   cấp mất kiểm soát trong D.7 (không có `MAX_LEVELS_PER_TURN` an toàn nào
   khác ngoài trần này).
4. **Lên cấp thường**: khi EXP tích lũy ≥ ngưỡng cấp hiện tại→kế tiếp VÀ
   `level mod 10 != 0` (không phải mốc đột phá), lên cấp ngay lập tức; EXP
   dư carry-over, có thể lên nhiều cấp trong 1 lượt nếu nguồn EXP đủ lớn
   (dừng lại ngay trước mốc đột phá kế tiếp nếu chạm tới).
5. **Đột phá bậc** (mốc tròn chục, `level mod 10 == 0` muốn lên `level+1`):
   khi EXP đạt ngưỡng nhưng đang ở mốc tròn chục, nhân vật vào trạng thái
   **Chờ Đột Phá** — EXP bị CHẶN Ở TRẦN (100% ngưỡng, không tích thêm; mọi
   EXP nhận thêm trong lúc chờ bị lãng phí, không bank) cho đến khi
   `breakthrough_requirement_met(tier)` = true.
6. Điều kiện đột phá cụ thể (VD: Hồn Hoàn ở Đấu La Đại Lục) là dữ liệu NGOÀI
   do bối cảnh/Setting cung cấp — hệ này chỉ định nghĩa cơ chế kiểm tra
   boolean `breakthrough_requirement_met(tier)`, không sở hữu nội dung điều
   kiện (tương tự cách `persistence-save-system.md` coi `turn_snapshot` là
   opaque blob). Nguồn cụ thể: Setting & Canon Integration — **đã
   Designed, interface provisional**. **Ràng buộc thiết kế mới (thêm
   2026-08-08, `/design-review` vòng 2, cụm A2-1 Option C)**: GDD này KHÔNG
   sở hữu NỘI DUNG `breakthrough_requirement_met`, nhưng ĐẶT RA 1 ràng buộc
   bắt buộc cho hệ sở hữu nó (Setting & Canon Integration) — điều kiện đột
   phá (VD Hồn Hoàn) CHỈ được thỏa mãn qua hành động/kết quả **combat**
   (nhánh `raw_combat` của `resolve_turn_exp`, D.6, tức lượt
   `locked_result.battle_active` chuyển `false`) — KHÔNG qua tu luyện thụ
   động, Song Tu, hay bất kỳ hành động phi-combat nào khác. Rationale: xác
   nhận Hồn Hoàn (hay tài nguyên tương đương) LÀ tài nguyên gắn với combat,
   thu hẹp một phần gap sở hữu rollback treo ở A15 (xem Open Questions) —
   owner tương lai của tài nguyên đó chỉ cần model 1 nguồn sinh (kết quả
   combat), không cần lo case phát sinh từ nguồn phi-combat.
7. Khi `breakthrough_requirement_met=true` (kiểm tra lại mỗi lượt trong khi
   ở trạng thái Chờ Đột Phá): đột phá xảy ra ngay lập tức trong lượt đó —
   `level +1`, `tier +1`, EXP reset về 0 cho cấp mới (phần "trần" trước đó
   không carry-over, vì đã bị chặn ở Rule 5), chỉ số chiến đấu nhận cú nhảy
   vọt riêng ngoài mức tăng đều mỗi cấp (xem Formulas) — TRỪ KHI
   `death_and_consequence_blocked=true` cùng lúc, xem Rule 9.
8. **Rollback** (Turn Manager Core Rule #8): mọi thay đổi `level`/`tier`/EXP/
   trạng thái Chờ Đột Phá do 1 lượt gây ra — kể cả một lần đột phá vừa xảy
   ra trong chính lượt đó — phải hoàn tác được TOÀN BỘ nếu lượt đó bị Undo.
9. Nếu Death & Consequence (**đã Designed**) đánh dấu nhân vật ở trạng
   thái "phế đan điền/võ công": hệ này DỪNG toàn bộ tích lũy EXP (cả 4
   nguồn ở Rule 2) cho đến khi trạng thái đó được gỡ. Cơ chế gỡ bỏ (đại cơ
   duyên, tiên thảo dị bảo...) do Death & Consequence sở hữu — hệ này chỉ
   đọc 1 cờ boolean. **Sửa đổi 2026-08-08** (`/design-review` vòng 1, cụm
   A7, tìm thấy bởi `systems-designer`): cờ này CŨNG chặn việc THỰC THI đột
   phá (Rule 7), không chỉ tích EXP — nếu nhân vật đang ở Chờ Đột Phá VÀ
   `breakthrough_requirement_met` chuyển `true` ĐÚNG lúc
   `death_and_consequence_blocked=true`, đột phá KHÔNG xảy ra ngay; trạng
   thái Chờ Đột Phá VÀ điều kiện đã đủ được GIỮ NGUYÊN, đột phá chỉ thực
   thi ở lượt đầu tiên SAU KHI cờ phế được gỡ VÀ điều kiện vẫn còn đúng
   (kiểm tra lại tại thời điểm đó, không giả định còn hiệu lực). Rationale:
   một nhân vật phế đan điền/võ công về mặt chủ đề không nên "đột phá cảnh
   giới" trong lúc kinh mạch bị phế.
10. `level` là data thô hệ này cung cấp cho ngưỡng "chênh lệch không quá 20
    cấp" (`game-concept.md`, điều kiện NPC chủ động địch ý) — hệ này KHÔNG
    tự tính ngưỡng đó, thuộc logic của hệ khác (Situation/Encounter
    Generation).
11. `resolve_turn_exp` (D.6) áp dụng cho MỌI nhân vật có Character Card, kể
    cả NPC — không chỉ nhân vật chính (thêm 2026-08-08, `/design-review`
    vòng 1, cụm A13; nguồn: `game-concept.md` — "tiến triển EXP của NPC...
    chỉ trôi theo lượt của người chơi"). Tham số `self` là nhân vật ĐANG
    được tính EXP tại thời điểm gọi hàm, KHÔNG mặc định là nhân vật chính.
    D.6 pseudocode xác định thắng/thua bằng so sánh trực tiếp
    `outcome.winner_id==self` / `outcome.loser_id==self` — KHÔNG dùng
    `outcome.type` (`combat-system.md` định nghĩa field này tương đối theo
    `player_id`, không phải theo `self` gọi hàm; dùng nhầm `type` sẽ khiến
    `raw_combat` âm thầm ở lại `0` khi `self` là NPC vừa thắng).
12. **Tín hiệu Chờ Đột Phá là Required-for-MVP** (nâng cấp 2026-08-08,
    `/design-review` vòng 2, cụm A2-6, từ Open Question/"NÊN cung cấp" ở
    vòng 1 cụm A5 — tìm thấy bởi `game-designer` + `economy-designer`, hợp
    nhất bởi `creative-director` thành Most Important Finding #2): khi
    trạng thái chuyển sang **Chờ Đột Phá** (Rule 5), Setting & Canon
    Integration VÀ/HOẶC Character Card & Identity PHẢI cung cấp ÍT NHẤT 1
    tín hiệu định tính tối giản (khác `null`/rỗng — không cần phong phú)
    báo cho người chơi biết đang ở trạng thái này. Hệ này KHÔNG sở hữu nội
    dung tín hiệu cụ thể (vẫn thuộc 2 hệ kia, xem Open Questions và Edge
    Cases), chỉ đặt ra RÀNG BUỘC BẮT BUỘC rằng tín hiệu đó phải TỒN TẠI —
    nâng từ "nice-to-have hoãn Vertical Slice" lên "Required cho MVP", cùng
    lúc với dev-seed nhân vật chính ở level 9 (`game-concept.md` Required
    for MVP #1, cụm A2-3) vốn đã đảm bảo người chơi chạm được trạng thái
    này trong cửa sổ kiểm chứng MVP.

### States and Transitions

| State | Mô tả | Chuyển sang |
|---|---|---|
| Tu Luyện Thường | `level mod 10 != 0`, hoặc `level mod 10 == 0` nhưng EXP chưa đạt ngưỡng — EXP tích lũy bình thường qua 4 nguồn | → Tu Luyện Thường (level+1) khi đủ EXP và level+1 không phải mốc đột phá; → Chờ Đột Phá khi đủ EXP đúng lúc `level mod 10 == 0` |
| Chờ Đột Phá | `level mod 10 == 0`, EXP đã chạm trần 100% ngưỡng, `breakthrough_requirement_met=false` — EXP không tích thêm | → Tu Luyện Thường (level+1, tier+1, EXP=0) ngay khi `breakthrough_requirement_met=true` |

### Interactions with Other Systems

- **Combat System** (upstream, hard) — nhận EXP source events (thắng/thua)
  qua hand-off `combat-system.md` Core Rule #12 (làm rõ tên tài liệu
  2026-08-08 vòng 2, tránh đụng số với Core Rule #12 CỦA CHÍNH GDD này —
  xem cụm A2-6) khi `battle_active=false`; Combat đọc ngược
  `tier(C)` từ hệ này (Formula D.1) để tính áp chế cảnh giới — quan hệ 2
  chiều.
- **Turn Manager** (upstream, hard) — mọi thay đổi EXP/level/tier chỉ
  "final" khi lượt xác nhận và không undo (Core Rule #8); passive EXP
  trigger mỗi lượt xác nhận.
- **NPC Affinity & Relationship** (đã Designed, soft/provisional) — cung
  cấp trạng thái "quan hệ Song Tu active" cho nguồn EXP #4.
- **Death & Consequence** (đã Designed, soft/provisional) — cung cấp cờ
  "phế đan điền/võ công" chặn tích lũy EXP.
- **Setting & Canon Integration** (đã Designed, soft/provisional) — cung
  cấp dữ liệu `breakthrough_requirement` cụ thể theo bối cảnh.
- **Character Card & Identity** (đã Designed, downstream) — đọc `level`,
  `tier` để hiển thị mục "Cấp độ - Bậc".
- **Situation/Encounter Generation** (Designed 2026-08-03, downstream) —
  đọc `level` để áp dụng ngưỡng chênh lệch 20 cấp (registry
  `hostile_initiative_allowed`/`HOSTILE_INITIATIVE_LEVEL_GAP_MAX=20`) và
  để sinh `level` đối thủ ambient trong khoảng `encounter_level_range`.

*(Nhiều interaction ở trên là provisional vì hệ phụ thuộc lúc viết chưa
thiết kế — nay các hệ đó đã Designed —
cùng pattern các GDD trước đã dùng, sẽ đối chiếu lại khi các hệ đó được
thiết kế.)*

## Formulas

*(Đề xuất từ `systems-designer`, duyệt nguyên văn.)*

### D.1 — Đường cong ngưỡng EXP lên cấp (`exp_threshold`)

**Quyết định hình dạng đường cong**: chọn **TUYẾN TÍNH** (không phải
exponential/stepped). Lý do: đây là dự án solo, MVP nhỏ hand-tuned (1 vùng
bối cảnh, 3 NPC), không có kỳ vọng grind vô hạn kiểu live-service; Pillar 4
("numbers are always grounded, never opaque") đòi hỏi người chơi tự nhẩm
được "còn bao xa nữa". Một hàm tuyến tính đơn giản là hình dạng DUY NHẤT
người chơi có thể tính nhẩm chính xác từ Thẻ Nhân Vật mà không cần công cụ
ngoài. Cảm giác "đột phá là cột mốc lớn" (Player Fantasy) đến từ ĐIỀU KIỆN
GATE bên ngoài (Rule 5/6), không cần đường cong EXP tự nó dốc lên ở mốc
tròn chục — tách 2 nguồn "khó" này ra cho rõ ràng, tránh chồng 2 lớp độ khó
lên cùng 1 chỗ.

The `exp_threshold` formula is defined as:
`exp_threshold(level) = BASE_EXP_THRESHOLD + EXP_THRESHOLD_INCREMENT * (level - 1)`

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Cấp hiện tại | `level` | int | 1–∞ | Cấp của nhân vật tại thời điểm tính |
| Ngưỡng cơ sở | `BASE_EXP_THRESHOLD` | float (knob) | >0 | EXP cần để lên cấp 1→2 |
| Mức tăng mỗi cấp | `EXP_THRESHOLD_INCREMENT` | float (knob) | ≥0 | EXP tăng thêm cho mỗi cấp kế tiếp so với cấp trước |
| Kết quả | `exp_threshold(level)` | float | `[BASE_EXP_THRESHOLD, ∞)` | Tổng EXP cần để đi từ `level` lên `level+1` |

**Output Range:** `[BASE_EXP_THRESHOLD, ∞)`, tăng đều tuyến tính, không âm,
không bị chặn trần (vì `level` không bị chặn trần). Đây cũng là ngưỡng dùng
làm mẫu số cho D.3/D.4/D.6 (nguồn thua/song-tu/thụ động) — MỘT công thức
duy nhất, không có công thức ngưỡng thứ hai nào khác trong hệ này.

**Example:** `BASE_EXP_THRESHOLD=100`, `EXP_THRESHOLD_INCREMENT=10`.
`exp_threshold(1)=100`, `exp_threshold(10)=190` (đây chính là ngưỡng của
mốc Chờ Đột Phá đầu tiên, level 10→11), `exp_threshold(25)=340`,
`exp_threshold(20)=290` (mốc đột phá thứ 2, level 20→21).

**Ghi chú thiết kế — sửa đổi 2026-08-08** (`/design-review` vòng 1, cụm A3,
tìm thấy bởi `economy-designer`, escalate bởi `creative-director` thành
Most Important Finding #3): vì MỌI nguồn EXP trong hệ này (D.2–D.4, Rule 2)
đều có dạng `RATE * exp_threshold(level)`, số lượt/trận cần để lên 1 cấp
qua BẤT KỲ nguồn đơn lẻ nào = `exp_threshold(level) / (RATE *
exp_threshold(level)) = 1/RATE` — `exp_threshold(level)` TỰ TRIỆT TIÊU về
đại số. Hệ quả: `BASE_EXP_THRESHOLD`/`EXP_THRESHOLD_INCREMENT` chỉ đổi CON
SỐ HIỂN THỊ trên Thẻ Nhân Vật, KHÔNG đổi số lượt/trận thật cần để lên cấp —
pacing (tính bằng lượt) là HẰNG SỐ xuyên suốt toàn bộ game, không "khó dần"
như Tuning Knobs từng mô tả (đã sửa lại, xem bảng Tuning Knobs). Đây là hệ
quả CÓ CHỦ Ý của việc chọn họ công thức tỷ-lệ-theo-ngưỡng thuần túy (không
có nguồn EXP tuyệt đối/flat nào) — KHÔNG coi là bug, nhưng phải ghi đúng để
tránh nhầm lẫn khi tune. Độ khó tăng dần trong game này đến hoàn toàn từ
ĐIỀU KIỆN GATE đột phá (Rule 5/6), đúng hướng D.1 đã chọn ngay từ đầu.

**Invariant kinh tế mới (thêm 2026-08-08, `/design-review` vòng 2, cụm
A2-1, tìm thấy bởi `economy-designer`, re-derive theo yêu cầu người dùng)**:
cùng tính chất tự-triệt-tiêu `exp_threshold(level)` ở trên áp dụng cho việc
so sánh TỐC ĐỘ giữa nguồn combat và nguồn passive/Song Tu theo LƯỢT quy
đổi — dùng `CONTENT_EXCHANGE_ESTIMATE=30` (từ `combat-system.md`) làm mẫu
số quy đổi 1 trận ≈ 30 lượt xác nhận:
`combat_win_exp(same-tier) / CONTENT_EXCHANGE_ESTIMATE ≥ PASSIVE_EXP_RATE + SONG_TU_EXP_RATE`
Vì `combat_win_exp(same-tier) = WIN_EXP_BASE_FRACTION * exp_threshold(level)`
(tier_diff=0 → multiplier=1), `exp_threshold(level)` triệt tiêu ở CẢ 2 vế,
rút gọn còn:
`WIN_EXP_BASE_FRACTION / CONTENT_EXCHANGE_ESTIMATE ≥ PASSIVE_EXP_RATE + SONG_TU_EXP_RATE`
Verify với default MỚI (`WIN_EXP_BASE_FRACTION=0.20`, `PASSIVE_EXP_RATE=
0.001`, `SONG_TU_EXP_RATE=0.0015`): `0.20/30 ≈ 0.00667` (0.667%/lượt) ≥
`0.001+0.0015=0.0025` (0.25%/lượt) ✓ — combat thắng cùng bậc nhanh hơn
passive đơn thuần ~6.67× (`0.00667/0.001`), và nhanh hơn passive+Song Tu
gộp ~2.67× (`0.00667/0.0025`). Đây là invariant PHẢI giữ khi tune sau này
(cùng loại ràng buộc như invariant D.2) — nếu vi phạm, tu luyện thụ động/
Song Tu trở thành đường lên cấp nhanh hơn combat, đảo ngược incentive
hierarchy dự định (đúng lớp lỗi mà cụm A1 đã sửa bằng `turn.in_combat`
gate, nay áp thêm 1 lớp kiểm tra ở mức HẰNG SỐ thay vì chỉ ở mức GATE
theo lượt).

**Sửa đổi 2026-08-08, verify hẹp sau vòng 2** (tìm thấy bởi
`economy-designer` + `qa-lead`): kiểm tra ban đầu ở trên CHỈ verify với
`CONTENT_EXCHANGE_ESTIMATE` MẶC ĐỊNH (30) — nhưng `combat-system.md`
công bố Safe Range của hằng số đó là **15–50**, và invariant này KHÔNG
đúng đều trên toàn dải: ở đầu trên (`CONTENT_EXCHANGE_ESTIMATE=50`, trận
dài), tỷ lệ combat/passive+SongTu chỉ còn `(0.20/50)/0.0025 = 1.6×` —
sát ngưỡng an toàn tối thiểu 1.5× đặt ra khi re-derive (ở default 30 là
2.67×; ở đầu dưới 15 là 5.33×). `SONG_TU_EXP_RATE` đã hạ thêm từ `0.002`
xuống **`0.0015`** đúng để đảm bảo margin ≥1.5× GIỮ ĐÚNG ở CẢ 3 mốc của
Safe Range 15–50 (không chỉ ở giá trị mặc định) — cùng lớp lỗi "Safe
Range công bố độc lập nhưng invariant chỉ verify ở 1 giá trị" mà chính
GDD này vừa tự sửa cho cặp `WIN_EXP_BASE_FRACTION`/`WIN_EXP_FLOOR_MULT`
ở cụm A2-4. Xem thêm guard data-load-time mới ở Edge Cases/AC-48.

### D.2 — EXP từ Combat thắng

The `combat_win_exp` formula is defined as:
```
combat_win_exp(self, opponent) = WIN_EXP_BASE_FRACTION * exp_threshold(level(self)) * tier_multiplier(tier_diff)
tier_diff = tier(opponent) - tier(self)
tier_multiplier(tier_diff) = clamp(1 + WIN_EXP_TIER_BONUS * tier_diff, WIN_EXP_FLOOR_MULT, WIN_EXP_CEIL_MULT)
```

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Bậc người thắng | `tier(self)` | int | **1–∞** | Tier của nhân vật vừa thắng (nguồn: Rule 1 — `tier` không bao giờ =0 với `level≥1` hợp lệ; sửa 2026-08-08, cụm A12, trước đây bảng này ghi nhầm `0–∞`, mâu thuẫn Rule 1/registry `tier_from_level`) |
| Bậc đối thủ | `tier(opponent)` | int | **1–∞** | Tier của đối thủ vừa thua (raw int, không phải object reference — làm rõ 2026-08-08, cụm B7/qa#10) |
| Chênh lệch bậc | `tier_diff` | int | −∞ đến +∞ | Dương = đối thủ mạnh hơn (đánh lên); âm = đối thủ yếu hơn (đánh xuống) |
| Tỷ lệ nền | `WIN_EXP_BASE_FRACTION` | float (knob) | 0–1 | % của `exp_threshold(level)` nhận được khi thắng đối thủ CÙNG bậc (`tier_diff=0`) |
| Hệ số thưởng/bậc | `WIN_EXP_TIER_BONUS` | float (knob) | ≥0 | % thay đổi multiplier mỗi bậc chênh lệch |
| Sàn multiplier | `WIN_EXP_FLOOR_MULT` | float (knob) | **(0,1]** | Trần dưới, tránh về đúng 0 khi đánh xuống rất sâu (Range thắt lại 2026-08-08, cụm B4 — trước đây `0–1` mâu thuẫn với chính tuyên bố "luôn dương" của Output Range) |
| Trần multiplier | `WIN_EXP_CEIL_MULT` | float (knob) | ≥1 | Trần trên, tránh 1 trận đánh lên cực đoan cho EXP phi mã |
| Kết quả | `combat_win_exp` | float | `[WIN_EXP_BASE_FRACTION * WIN_EXP_FLOOR_MULT * exp_threshold, WIN_EXP_BASE_FRACTION * WIN_EXP_CEIL_MULT * exp_threshold]` | EXP thô từ 1 trận thắng, TRƯỚC khi nhân `exp_multiplier` (xem D.6) |

**Output Range:** luôn dương (không bao giờ về đúng 0, vì
`WIN_EXP_FLOOR_MULT > 0`), tỷ lệ thuận với `exp_threshold(level(self))` nên
tự động scale theo cấp độ hiện tại. Với default hiện hành (**sửa 2026-08-08,
`/design-review` vòng 2, cụm A2-1: `BASE=0.20`** — trước đây `0.15`;
`TIER_BONUS=0.25, FLOOR=0.30, CEIL=3.0` không đổi — `FLOOR` đã sửa ở vòng
1, xem invariant bên dưới): đánh xuống ≥3 bậc → chạm sàn (~6% ngưỡng); đánh
lên ≥8 bậc → chạm trần (~60% ngưỡng, một trận đủ để tiến bộ đáng kể nhưng
không auto-lên-nhiều-cấp trừ khi chồng thêm nguồn khác).

**Invariant bắt buộc (thêm 2026-08-08, `/design-review` vòng 1, cụm A2/A4,
tìm thấy bởi `economy-designer`)**: `WIN_EXP_BASE_FRACTION *
WIN_EXP_FLOOR_MULT` (EXP thắng TỐI THIỂU, mọi `tier_diff`) PHẢI ≥
`LOSS_EXP_RATE` (D.3) — nếu không, thua trở thành lựa chọn EV cao hơn
thắng ở `tier_diff` cực âm ("cố ý thua" dominant strategy, phát hiện tại
review này). Giá trị default hiện tại (**sửa 2026-08-08, vòng 2, cụm
A2-1**): `0.20*0.30=0.06` (6%) ≥ `LOSS_EXP_RATE=0.04` (4%) — thỏa mãn với
biên an toàn 2% (trước đây `0.15*0.30=0.045` (4.5%), biên 0.5% — biên MỚI
rộng hơn 4×); **bất kỳ pass cân bằng nào sau này PHẢI verify lại invariant
này** trước khi đổi 1 trong 3 hằng số liên quan (`WIN_EXP_BASE_FRACTION`,
`WIN_EXP_FLOOR_MULT`, `LOSS_EXP_RATE`) — xem thêm guard data-load time ở
Edge Cases/AC-45, cụm A2-4.

*Ghi chú thiết kế*: `WIN_EXP_TIER_BONUS` KHÔNG tái sử dụng
`PENALTY_PER_TIER=0.15` của Combat System dù cùng "họ" công thức
(`clamp(1 + rate*gap, floor, ceil)`) — cố ý tách riêng để việc tune độ khó
combat không vô tình kéo theo thay đổi nền kinh tế EXP. *(`PENALTY_PER_TIER`
là hằng số RIÊNG của `combat-system.md`, không liên quan tới đợt đổi
`WIN_EXP_BASE_FRACTION` ở A2-1 — trùng giá trị số `0.15` chỉ là ngẫu
nhiên, KHÔNG đổi theo.)*

**Example:** `self` level 25 (tier 3), đối thủ tier 5 → `tier_diff=+2`.
`exp_threshold(25)=340`. `tier_multiplier = clamp(1+0.25*2, 0.30, 3.0) =
1.5`. `combat_win_exp = 0.20 * 340 * 1.5 = 102` (sửa 2026-08-08 vòng 2,
cụm A2-1 — trước đây `0.15*340*1.5=76.5`).

Ca biên (đánh xuống sâu, sửa lại 2026-08-08 theo `WIN_EXP_FLOOR_MULT=0.30`
mới, số EXP tuyệt đối cập nhật lại vòng 2 cụm A2-1 theo `BASE=0.20`):
`self` tier 3, đối thủ tier 0 → `tier_diff=-3` →
`multiplier=clamp(1-0.75,0.30,3.0)=0.30` (raw `0.25` đã dưới sàn, bị kẹp
lên `0.30`) → `combat_win_exp=0.20*340*0.30=20.4` (6% ngưỡng — VẪN >
`combat_loss_exp=13.6`, đúng invariant ở trên). Nếu `tier_diff=-4` →
`multiplier=clamp(1-1.0,0.30,3.0)=0.30` (cùng giá trị sàn, không giảm
thêm) → `combat_win_exp=0.20*340*0.30=20.4` — breakeven point thật giữa
raw multiplier và sàn nằm ở `tier_diff≈-2.8` (không đổi — phụ thuộc
`WIN_EXP_TIER_BONUS`/`WIN_EXP_FLOOR_MULT`, không phụ thuộc `BASE_FRACTION`),
nên MỌI `tier_diff≤-3` đều cho kết quả bằng nhau (đã ở sàn).

Ca biên (cả 2 tier=1, mốc SÀN thật — sửa 2026-08-08, cụm B2/A12, xem EC-6):
`tier_diff=0` → `multiplier=1` → công thức hoạt động bình thường, không
cần case đặc biệt.

### D.3 — EXP từ Combat thua (formalize 4%)

**Quyết định mẫu số**: dùng `exp_threshold(level(self))` — CÙNG mẫu số với
thụ động (D.6) và Song Tu (D.4), vì cả 3 đều là "nguồn EXP theo % ngưỡng
cấp hiện tại, không phụ thuộc đối thủ". Việc đồng bộ mẫu số giúp 1 tuning
knob duy nhất (`exp_threshold`) chi phối scale của MỌI nguồn
không-phải-combat-thắng, giảm bề mặt lỗi khi cân bằng.

The `combat_loss_exp` formula is defined as:
`combat_loss_exp(self) = LOSS_EXP_RATE * exp_threshold(level(self))`

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Tỷ lệ EXP khi thua | `LOSS_EXP_RATE` | float (knob, giá trị đã chốt ở game-concept.md) | 0–1 | Cố định 4% theo thiết kế gốc. **Ràng buộc bắt buộc (2026-08-08, A2/A4)**: PHẢI ≤ `WIN_EXP_BASE_FRACTION * WIN_EXP_FLOOR_MULT` (xem invariant ở D.2) — nếu không, thua sinh lợi hơn thắng ở tier gap sâu |
| Kết quả | `combat_loss_exp` | float | `[0, ∞)` | EXP thô nhận khi thua 1 trận, TRƯỚC `exp_multiplier` |

**Output Range:** `[0, ∞)` tỷ lệ tuyến tính với `exp_threshold(level)`, luôn
dương, không phụ thuộc bậc đối thủ (đã chốt trong game-concept.md là "cố
định 4%", không theo tier gap — khác với D.2). **Edge case bắt buộc**: nếu
lượt thua đó đồng thời là `is_death_turn=true` (chết thật),
`combat_loss_exp = 0` — Rule 2 của Core Rules đã loại trừ case này (chết
thật hand-off sang Character Continuation, không "tiếp tục tu luyện" ở
chính lượt chết).

**Example:** level 25, `exp_threshold(25)=340` → `combat_loss_exp = 0.04 *
340 = 13.6`.

### D.4 — EXP bonus Song Tu

**Quyết định tỷ lệ**: **0.2%/lượt** (sửa 2026-08-08, `/design-review` vòng
2, cụm A2-1 — trước đây `2%/lượt`) — vẫn giữ nguyên tỷ lệ tương đối gấp đôi
tỷ lệ thụ động (nay `0.1%/lượt`, cũng hạ ở cùng đợt A2-1). Lý do chọn 2x
thay vì 1x (bằng passive, cảm giác nhạt) hay 3x (có nguy cơ lấn át D.2 nếu
người chơi né combat, chỉ dựa Song Tu để cày) không đổi: 2x tạo một cú
hích RÕ RÀNG có thể cảm nhận được ("tốc độ tu luyện thụ động của mình tăng
gấp 3 lần tổng cộng khi có Song Tu active" — `0.1%` passive + `0.2%` song
tu = `0.3%` tổng) nhưng vẫn nhỏ hơn nhiều so với 1 trận thắng cùng bậc
(~20%, D.2 — cũng sửa vòng 2) — đúng khung "bonus quan hệ chiến lược có
giá trị, không thay thế nguồn EXP chính". *(Xem D.1 Invariant kinh tế mới
cho verify định lượng đầy đủ: combat thắng cùng bậc vẫn nhanh hơn
passive+Song Tu gộp ~2.2× theo lượt quy đổi.)*

The `song_tu_exp_bonus` formula is defined as:
```
song_tu_exp_bonus(self) = SONG_TU_ACTIVE(self) * SONG_TU_EXP_RATE * exp_threshold(level(self))
SONG_TU_ACTIVE(self) = 1 if (Tâm Pháp hiện tại của self có type=song-tu AND self nằm trong tập "quan hệ Song Tu active" của player) else 0
```
*(`SONG_TU_ACTIVE` self-relative hóa 2026-08-08, `/design-review` vòng 2,
cụm A2-5 — trước đây ngầm định `self=player`; nay nếu `self`=player, kiểm
tra tập NPC song-tu active của player khác rỗng; nếu `self`=NPC_X, kiểm
tra NPC_X có thuộc tập đó hay không — CÙNG 1 flag `npc-affinity-
relationship.md` Tầng 2 State Machine, quan hệ Song Tu LUÔN là player↔NPC,
không có NPC↔NPC nên không cần model quan hệ mới.)*

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Cờ điều kiện Song Tu | `SONG_TU_ACTIVE(self)` | bool (0/1) | {0,1} | Cả 2 điều kiện Rule 2 (Tâm Pháp song-tu của `self` + `self` thuộc quan hệ Song Tu active với player, nguồn: NPC Affinity — provisional; self-relative hóa 2026-08-08 vòng 2, cụm A2-5) |
| Tỷ lệ Song Tu | `SONG_TU_EXP_RATE` | float (knob) | 0–1 | % của `exp_threshold(level)` mỗi lượt khi điều kiện đủ |
| Kết quả | `song_tu_exp_bonus` | float | `{0} ∪ [SONG_TU_EXP_RATE * exp_threshold, SONG_TU_EXP_RATE * exp_threshold]` | 0 nếu không active; giá trị cố định (theo level) nếu active |

**Output Range:** nhị phân về mặt điều kiện (0 hoặc giá trị đầy đủ, không có
trạng thái trung gian), giá trị khi active tỷ lệ tuyến tính theo
`exp_threshold(level)`.

**Example:** level 25, `exp_threshold(25)=340`, Song Tu active →
`song_tu_exp_bonus = 0.0015 * 340 = 0.51` (sửa 2026-08-08, verify hẹp sau
vòng 2 — trước đây `0.002*340=0.68` ở vòng 2, và `0.02*340=6.8` ở vòng 1).
Không active → `0`.

### D.5 — Đường cong tăng trưởng chỉ số (stat growth)

The `stat_growth` formula is defined as (áp dụng cho mỗi chỉ số `X` trong
12 chỉ số Character Card):
`stat_value(C, X) = base_X0 + LEVEL_GROWTH_X * (level(C) - 1) + BREAKTHROUGH_BONUS_X * (tier(C) - 1)`

Với các chỉ số dạng % (Crit Rate, Crit Damage, ACC, Né tránh, Lifesteal, HP
Regen, Khuếch đại, Chống chịu) áp thêm 1 lớp clamp:
`percentage_stat_value(C, X) = clamp(stat_value(C, X), 0, PERCENT_STAT_CAP)`

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Giá trị gốc cấp 1 | `base_X0` | float | ≥0 | Chỉ số khởi điểm của nhân vật (sở hữu bởi Character Card, không phải hệ này) |
| Cấp hiện tại | `level(C)` | int | 1–∞ | (nguồn: Rule 1) |
| Bậc hiện tại | `tier(C)` | int | 1–∞ | `tier(C)-1` = số lần đã đột phá thành công |
| Mức tăng/cấp | `LEVEL_GROWTH_X` | float (knob, mỗi chỉ số riêng) | ≥0 | Tăng đều mỗi cấp, kể cả cấp đột phá |
| Bonus đột phá | `BREAKTHROUGH_BONUS_X` | float (knob, mỗi chỉ số riêng) | ≥0 | Cộng thêm CHỈ khi đã hoàn tất 1 lần đột phá, cộng dồn theo số lần |
| Trần % (chỉ áp cho chỉ số dạng %) | `PERCENT_STAT_CAP` | float (knob) | 0–1 | Ngăn chỉ số dạng xác suất/% vượt quá mức hợp lý ở level rất cao |
| Kết quả | `stat_value(C,X)` | float | `[base_X0, ∞)` (chỉ số thô) hoặc `[0, PERCENT_STAT_CAP]` (chỉ số %) | Giá trị `base_X` dùng làm input cho `effective_stat` (combat-system.md D.1) |

**Output Range:** chỉ số thô (HP/ATK/DEF/SPD) không chặn trần, tăng tuyến
tính vô hạn theo `level`; chỉ số % bị `clamp` ở `PERCENT_STAT_CAP` (đề xuất
0.95, đồng nhất triết lý "không có gì tuyệt đối" đã dùng ở `P_MAX=0.95` của
combat-system.md D.3) để tránh ví dụ Crit Rate 300% ở level cực cao.

**Example (HP)**: `base_HP0=100`, `LEVEL_GROWTH_HP=8`,
`BREAKTHROUGH_BONUS_HP=50`. Level 25 (tier 3): `HP = 100 + 8*24 + 50*2 =
392`.

**Example (ATK)**: `base_ATK0=10`, `LEVEL_GROWTH_ATK=1.5`,
`BREAKTHROUGH_BONUS_ATK=8`. Level 25 (tier 3): `ATK = 10 + 1.5*24 + 8*2 =
62`.

**Example (Crit Rate, dạng %)**: `base_CR0=0.05`, `LEVEL_GROWTH_CR=0.008`,
`BREAKTHROUGH_BONUS_CR=0.02`. Level 25 (tier 3): `raw = 0.05 + 0.008*24 +
0.02*2 = 0.282` → dưới trần `0.95`, không bị clamp, `Crit Rate = 28.2%`.

10 chỉ số còn lại (DEF, SPD, ACC, Né tránh, Crit Damage, Amp, Mitigation,
Lifesteal, HP Regen) theo ĐÚNG hình dạng công thức trên, mỗi chỉ số có bộ
`(base_X0, LEVEL_GROWTH_X, BREAKTHROUGH_BONUS_X)` riêng — không hand-tune
đủ 12 chỉ số trong GDD này, để lại cho pass cân bằng số liệu cụ thể (Tuning
Knobs).

*Ghi chú liên hệ registry*: scale tuyệt đối của công thức này (VD HP
~100–400 ở level 1–25) là input mà `combat_power_estimate`
(combat-system.md D.13, `w_HP=0.25` placeholder) cần đối chiếu lại — GDD
này chỉ định nghĩa hình dạng/scale chỉ số, KHÔNG tự sửa trọng số `w_*`
(thuộc quyền sở hữu của combat-system.md).

### D.6 — Thứ tự xử lý khi nhiều nguồn EXP trùng lượt

**Quyết định**: (1) tính riêng từng nguồn thô, (2) CỘNG DỒN tất cả nguồn
thô thành 1 tổng, (3) nhân `exp_multiplier` của Tâm Pháp active ĐÚNG 1 LẦN
vào tổng đó (không nhân riêng từng nguồn), (4) áp dụng logic lên cấp/chặn
trần đột phá (nay là D.7) ĐÚNG 1 LẦN vào kết quả đã nhân. Đây là quy trình
MỘT CHIỀU, không lặp lại bước nào.

**Sửa đổi 2026-08-08** (`/design-review` vòng 1): pseudocode dưới đây đã
sửa 2 điểm so với bản gốc — (1) cụm A1: `raw_passive`/`raw_song_tu` nay có
điều kiện `turn.in_combat==false` (Core Rule #2); (2) cụm A13: nhánh combat
không còn dùng `outcome.type=="win"/"lose"` (tương đối theo `player_id`,
sai khi `self` là NPC) — chỉ so sánh trực tiếp `winner_id`/`loser_id` với
`self` (Core Rule #11).

The `resolve_turn_exp` formula is defined as:
```
resolve_turn_exp(self, turn):
  IF death_and_consequence_blocked(self):           // Core Rule #9 — short-circuit TRƯỚC cả 4 nguồn
    RETURN 0                                          // không tích lũy gì cả lượt này
  IF turn.is_death_turn:                             // short-circuit TOÀN CỤC, giống dòng trên —
    RETURN 0                                          // chết thật thì KHÔNG "tiếp tục tu luyện" dưới bất kỳ hình thức nào

  raw_combat = 0
  IF turn.locked_result.battle_active == false:
    IF turn.locked_result.outcome.type == "no_outcome":
      raw_combat = 0   // bỏ chạy hoặc hòa giao hữu (TECHNICAL_EXCHANGE_CAP, is_spar_friendly=true) — KHÔNG diễn giải thành thắng/thua, đúng ràng buộc đã khóa ở combat-system.md
    ELIF turn.locked_result.outcome.winner_id == self:              // sửa 2026-08-08 (A13) — self-relative, KHÔNG dùng outcome.type
      raw_combat = combat_win_exp(self, turn.locked_result.outcome.loser_id)   // D.2
    ELIF turn.locked_result.outcome.loser_id == self:                // sửa 2026-08-08 (A13) — self-relative, KHÔNG dùng outcome.type
      raw_combat = combat_loss_exp(self)                       // D.3 — is_death_turn đã bị chặn ở trên, không cần loại trừ lại ở đây
    // ELSE: self không phải bên tham chiến của trận này (N/A ở MVP 1-vs-1, giữ nhánh cho tương lai multi-party) → raw_combat=0

  raw_passive = 0
  raw_song_tu = 0
  IF turn.in_combat == false:                        // sửa 2026-08-08 (A1) — passive/Song Tu KHÔNG tick trong bất kỳ lượt nào thuộc 1 trận đang diễn ra, kể cả lượt kết trận
    raw_passive  = PASSIVE_EXP_RATE * exp_threshold(level(self))
    raw_song_tu  = song_tu_exp_bonus(self)                       // D.4, 0 nếu không active

  raw_total    = raw_combat + raw_passive + raw_song_tu
  final_gain   = raw_total * exp_multiplier(active_tam_phap(self))   // nhân 1 LẦN DUY NHẤT

  apply_exp_gain(self, final_gain)   // D.7 — chạy 1 LẦN trên final_gain đã gộp
```

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Cờ chặn tích lũy | `death_and_consequence_blocked(self)` | bool | {0,1} | Nguồn: Death & Consequence (đã Designed, Core Rule #9) |
| Cờ chết thật | `turn.is_death_turn` | bool | {0,1} | Nguồn: Turn Manager (Core Rule #9 của `turn-manager.md`) — short-circuit TOÀN CỤC thứ 2, độc lập với `death_and_consequence_blocked` |
| Cờ đang trong trận | `turn.in_combat` | bool | {0,1} | **Thêm 2026-08-08 (A1)**. Nguồn: Turn Manager/Combat System (`combat-system.md` Core Rule #1 + States and Transitions) — `true` xuyên suốt "In Combat — Awaiting Exchange"/"Resolving Exchange"/"Battle Concluded" (kể cả lượt kết trận), chỉ `false` từ "Not In Combat" trở đi |
| EXP thô combat | `raw_combat` | float | `[0, ∞)` | Từ D.2 (thắng) hoặc D.3 (thua, trừ death turn) hoặc 0 (không có trận nào kết thúc lượt này) |
| EXP thô thụ động | `raw_passive` | float | `{0} ∪ [PASSIVE_EXP_RATE * BASE_EXP_THRESHOLD, ∞)` | Sửa 2026-08-08 (A1): nay bằng `0` khi `turn.in_combat=true`; ngoài combat vẫn `PASSIVE_EXP_RATE * exp_threshold(level)` mọi lượt xác nhận (`PASSIVE_EXP_RATE=0.001` — sửa 2026-08-08 vòng 2, cụm A2-1, trước đây `0.01`) |
| EXP thô Song Tu | `raw_song_tu` | float | `[0, ∞)` | Từ D.4, cùng điều kiện `turn.in_combat=false` như passive (sửa 2026-08-08, A1) |
| Tổng thô | `raw_total` | float | `[0, ∞)` | Tổng CHƯA nhân hệ số Tâm Pháp |
| Hệ số Tâm Pháp | `exp_multiplier(active_tam_phap)` | float | `[1, ∞)` | Rule 3, mặc định 1.0 |
| EXP cuối cùng | `final_gain` | float | `[0, ∞)` | Input DUY NHẤT cho D.7 (lên cấp/đột phá) |

**Output Range:** `final_gain ∈ [0, ∞)`, luôn không âm — có thể bằng `0`
nếu `turn.in_combat=true` và trận đó chưa kết thúc lượt này (không nguồn
nào khác resolve). Xử lý tiếp theo (lên cấp/chặn trần/thực thi đột phá) là
D.7, chạy đúng 1 lần trên `final_gain` đã gộp — xem AC-31/AC-31b cho ví dụ
tường minh 2 nhánh (combat-only vs. passive+Song-Tu-only, không bao giờ
trộn lẫn cùng 1 lượt).

### D.7 — Áp dụng EXP đã gộp: lên cấp / chặn trần đột phá / thực thi đột phá

*(Mới tách thành pseudocode tường minh 2026-08-08, `/design-review` vòng 1,
cụm B3 — trước đây chỉ có prose dưới "Output Range" của D.6; đây là 1 trong
2 hàm nhạy cảm nhất với thứ tự state trong toàn hệ, cùng lý do dự án đã
formalize `resolve_turn_exp` thay vì để prose.)*

The `apply_exp_gain` / `try_execute_breakthrough` formulas are defined as:
```
apply_exp_gain(self, final_gain):
  ASSERT BASE_EXP_THRESHOLD > 0                       // guard cứng, thêm 2026-08-08 (B1) — ngăn cascade vô hạn/rất dài nếu data hỏng (xem EC-8b)
  current_exp = exp(self) + final_gain
  WHILE true:
    threshold = exp_threshold(level(self))
    IF level(self) mod 10 != 0:                        // Rule 4 — mốc thường
      IF current_exp >= threshold:
        current_exp -= threshold
        level(self) += 1                                 // tier(self) tự động cập nhật qua Rule 1 (derived, không lưu độc lập — xem B6)
        CONTINUE                                          // có thể cascade tiếp
      ELSE:
        BREAK
    ELSE:                                               // Rule 5 — mốc tròn chục, cần Chờ Đột Phá
      IF current_exp >= threshold:
        current_exp = threshold                          // kẹp CHÍNH XÁC ở 100% ngưỡng, phần dư lãng phí
        state(self) = "Chờ Đột Phá"
      BREAK                                              // KHÔNG cascade tiếp dù current_exp còn dư
  exp(self) = current_exp

try_execute_breakthrough(self, turn):                   // chạy TRƯỚC resolve_turn_exp mỗi lượt, qua process_character_turn (Edge Cases EC-2)
  IF state(self) != "Chờ Đột Phá": RETURN
  IF death_and_consequence_blocked(self): RETURN        // thêm 2026-08-08 (A7, Core Rule #9) — phế đan điền chặn CẢ thực thi đột phá
  IF turn.in_combat == true: RETURN          // thêm 2026-08-08 vòng 2 (A2-2) — cùng pattern A1, tránh đột phá giữa trận vi phạm combat-system.md CR#4
  IF turn.is_death_turn == true: RETURN      // thêm 2026-08-08 vòng 2 (A2-2) — cùng lý do combat_loss_exp=0 ở is_death_turn, không "tiếp tục tu luyện" đúng lượt chết
  IF breakthrough_requirement_met(tier(self)):
    level(self) += 1                                     // tier(self) tự động +1 qua Rule 1
    exp(self) = 0
    state(self) = "Tu Luyện Thường"

process_character_turn(self, turn):                     // MỚI, thêm 2026-08-08 vòng 2, cụm A2-2 — orchestrator cấp lượt, đóng gap N2 (trước đây thứ tự EC-2 chỉ có ở prose/comment)
  try_execute_breakthrough(self, turn)                    // PHẢI chạy trước — nếu đột phá xảy ra, resolve_turn_exp bên dưới dùng ngưỡng MỚI
  resolve_turn_exp(self, turn)
```

**Về mặt đại số**: nhân `exp_multiplier` 1 lần vào tổng cho kết quả TOÁN
HỌC giống hệt nhân riêng từng nguồn rồi cộng (phép nhân phân phối qua phép
cộng) — điểm mấu chốt thực sự KHÔNG PHẢI ở thứ tự cộng/nhân (không đổi kết
quả cuối), mà là: (a) `exp_multiplier` phải áp dụng TRƯỚC bước cap/cascade,
không phải sau (nhân sau khi đã bị kẹp trần sẽ làm mất phần EXP đáng lẽ
được nhân hệ số); và (b) cap/cascade chỉ chạy ĐÚNG 1 LẦN trên `final_gain`
đã gộp, không chạy riêng lẻ 3 lần cho 3 nguồn (chạy riêng lẻ dễ dẫn tới lỗi
implementation như quên tái tính `exp_threshold(level)` mới sau khi 1
nguồn đã gây lên cấp giữa chừng).

**Example (lượt kết trận — combat thắng, sửa 2026-08-08 cụm A1: KHÔNG còn
cộng passive/Song Tu cùng lượt, vì lượt kết trận vẫn `in_combat=true`, xem
AC-31b; số liệu cập nhật lại 2026-08-08 vòng 2, cụm A2-1 theo
`WIN_EXP_BASE_FRACTION=0.20` mới)**: level 25 (`exp_threshold(25)=340`),
lượt này vừa thắng 1 trận `tier_diff=+1` (`combat_win_exp =
0.20*340*clamp(1.25,...)=85` — trước đây `0.15*340*1.25=63.75`),
`raw_passive=0`, `raw_song_tu=0` (cả 2 bị chặn bởi `turn.in_combat=true`).
`raw_total = 85`. Tâm Pháp `exp_multiplier=1.2` → `final_gain =
85*1.2 = 102` (trước đây `76.5`). Giả sử EXP hiện tại trước lượt là 300/340
→ `300+102=402 ≥ 340`, và `level=25` (`25 mod 10 != 0`) → lên cấp:
`level=26`, EXP dư `=402-340=62`, kiểm tra tiếp `exp_threshold(26)=
350` → `62 < 350` → dừng, không cascade thêm.

**Example (lượt ngoài combat — passive + Song Tu, thêm 2026-08-08 cụm A1,
xem AC-31; số liệu cập nhật lại 2026-08-08, verify hẹp sau vòng 2 theo
`PASSIVE_EXP_RATE=0.001`/`SONG_TU_EXP_RATE=0.0015` mới)**: level 25
(`exp_threshold(25)=340`), `turn.in_combat=false` (không có trận nào lượt
này), passive `0.001*340=0.34`, Song Tu active `0.0015*340=0.51` (trước
đây `0.01*340=3.4` và `0.02*340=6.8` ở vòng 1; `0.68` ở vòng 2). `raw_total
= 0.34+0.51 = 0.85`. Tâm Pháp `exp_multiplier=1.2` → `final_gain =
0.85*1.2 = 1.02` (trước đây `12.24` vòng 1, `1.224` vòng 2).

**Example (chạm trần đột phá)**: level 20 (mốc tròn chục),
`exp_threshold(20)=290`, EXP hiện tại 280, `final_gain=50` →
`280+50=330 ≥ 290` VÀ `level mod 10==0` → vào Chờ Đột Phá, EXP bị kẹp đúng
`290` (100% ngưỡng), 40 EXP dư bị lãng phí, KHÔNG cascade sang cấp 21 dù đủ
số — chờ `breakthrough_requirement_met(tier=2)=true` ở 1 lượt sau đó mới
đột phá thật (Rule 7).

## Edge Cases

*(Lean mode — không spawn specialist cho section này.)*

- **Nếu đối thủ Combat chưa có `tier` xác định**: không phải edge case hợp
  lệ, coi là bug — mọi NPC tham gia Combat phải có Character Card đầy đủ
  (`level`/`tier`) theo `game-concept.md`; Combat System đã giả định input
  đủ dữ liệu này ở phía nó. **Sửa đổi 2026-08-08** (`/design-review` vòng
  1, cụm A10, tìm thấy bởi `qa-lead`): dù đây là lỗi cấu hình chứ không
  phải input hợp lệ, hệ thống PHẢI fail-fast bằng 1 ERROR CODE có cấu trúc
  (`EXP_ERROR_OPPONENT_TIER_UNDEFINED`) — KHÔNG dùng GDScript `assert()`
  (statement này bị STRIP khỏi exported/release build, và dự án ship
  Web/Mobile Web export — dùng `assert()` sẽ khiến fail-fast dự định âm
  thầm no-op đúng ở production, ngược lại chính ý định của edge case này).
  Theo đúng Error Taxonomy convention đã dùng ở `persistence-save-system.md`
  (verify bằng equality với hằng số, không match chuỗi debug tự do).
- **Nếu data file cấu hình thiếu 1 trong 26 hằng số bắt buộc** (24
  `LEVEL_GROWTH_X`/`BREAKTHROUGH_BONUS_X` — 2/chỉ số × 12 chỉ số — cộng
  `BASE_EXP_THRESHOLD`/`EXP_THRESHOLD_INCREMENT`): thêm 2026-08-08
  (`/design-review` vòng 1, cụm A9, tìm thấy bởi `qa-lead` + `systems-designer`).
  Hệ thống PHẢI fail LOUD ngay tại thời điểm data-load (trước khi phiên
  chơi bắt đầu), KHÔNG được âm thầm dùng giá trị mặc định `0` cho hằng số
  thiếu — cùng pattern "thiếu data → false cứng + warning content-gap" mà
  GDD này đã áp dụng cho `breakthrough_requirement_met` (Setting & Canon
  Integration).
- **Nếu `BASE_EXP_THRESHOLD ≤ 0` hoặc `EXP_THRESHOLD_INCREMENT < 0`**: đây
  là lỗi cấu hình data (vi phạm Range đã khai ở D.1), PHẢI bị chặn ở
  data-load time bằng validation tường minh — KHÔNG được để lọt tới
  runtime, vì `apply_exp_gain` (D.7) giả định `exp_threshold(level) > 0`
  là invariant cứng (`ASSERT` đầu hàm) — nếu vi phạm, vòng lặp cascade lên
  cấp có thể chạy rất dài/gần như vô hạn trong 1 lượt (thêm 2026-08-08, cụm
  B1, tìm thấy bởi `systems-designer`).
- **Nếu `EXP_THRESHOLD_INCREMENT < 0`** (thêm 2026-08-08, `/design-review`
  vòng 2, cụm B2-3, tìm thấy bởi `qa-lead`): cùng lớp lỗi cấu hình như
  `BASE_EXP_THRESHOLD≤0` ở trên (vi phạm Range `≥0` đã khai ở D.1), PHẢI bị
  chặn ở data-load time bằng validation tường minh — KHÔNG được để lọt tới
  runtime (xem AC-47).
- **Nếu data file cấu hình vi phạm invariant
  `WIN_EXP_BASE_FRACTION × WIN_EXP_FLOOR_MULT ≥ LOSS_EXP_RATE`** (thêm
  2026-08-08, `/design-review` vòng 2, cụm A2-4, tìm thấy bởi
  `economy-designer`): đây là lỗi cấu hình data — 2 Safe Range công bố ĐỘC
  LẬP của `WIN_EXP_BASE_FRACTION`/`WIN_EXP_FLOOR_MULT` (Tuning Knobs)
  KHÔNG đủ để đảm bảo invariant D.2 (VD combo `BASE=0.10×FLOOR=0.30=0.03 <
  LOSS=0.04` vẫn nằm trong 2 range công bố nhưng VI PHẠM) — PHẢI bị chặn ở
  data-load time bằng validation tường minh, cùng pattern
  `BASE_EXP_THRESHOLD≤0`/`EXP_THRESHOLD_INCREMENT<0` ở trên — KHÔNG được để
  lọt tới runtime. Error code có cấu trúc: `EXP_ERROR_WIN_LOSS_INVARIANT_VIOLATED`
  (verify bằng equality, cùng Error Taxonomy convention `EXP_ERROR_*` — xem
  AC-45).
- **Nếu character đang ở trạng thái Chờ Đột Phá VÀ `breakthrough_requirement_met`
  chuyển thành true VÀ cùng lượt đó cũng có Combat/Song Tu/passive sinh EXP
  mới**: thứ tự xử lý là (1) kiểm tra và thực hiện đột phá TRƯỚC (dùng
  trạng thái đầu lượt) — `level+1`, `tier+1`, EXP=0 — RỒI (2) mới tính
  `resolve_turn_exp` (D.6) của lượt đó áp vào NGƯỠNG MỚI
  (`exp_threshold(level+1)`). Không tính EXP lượt đó vào ngưỡng cũ trước
  khi đột phá. **Formalize hóa 2026-08-08 (`/design-review` vòng 2, cụm
  A2-2)**: thứ tự này nay được thực hiện bởi 1 orchestrator tường minh D.7
  `process_character_turn(self, turn)` — gọi `try_execute_breakthrough(self,
  turn)` TRƯỚC, `resolve_turn_exp(self, turn)` SAU — thay vì chỉ mô tả
  bằng prose (xem AC-33).
- **Nếu lượt đó vừa gây đột phá vừa bị Undo ngay sau (Turn Manager Core
  Rule #8)**: phải rollback TOÀN BỘ — `level`, `tier`, EXP VÀ trạng thái
  Chờ Đột Phá (không phải quay về trạng thái Tu Luyện Thường trước đó) —
  về đúng snapshot trước lượt. Nếu điều kiện đột phá đó tiêu tốn 1 tài
  nguyên ngoài (VD: Hồn Hoàn, sở hữu bởi hệ khác), việc rollback tài
  nguyên đó KHÔNG thuộc phạm vi GDD này — xem Open Questions.
- **Nếu lượt là `is_death_turn=true`**: `combat_loss_exp=0` (đã chốt ở Core
  Rule #2/D.3); nhưng `raw_passive` và `raw_song_tu` của D.6 KHÔNG áp dụng
  ở lượt đó nữa vì nhân vật chính đã chết thật — toàn bộ `resolve_turn_exp`
  trả về 0 cho lượt đó, không chỉ riêng phần combat.
- **Nếu `death_and_consequence_blocked=true` (phế đan điền/võ công, Core
  Rule #9) xảy ra ĐÚNG lượt đang ở trạng thái Chờ Đột Phá**: trạng thái Chờ
  Đột Phá vẫn giữ nguyên (không mất), chỉ có việc tích EXP mới bị dừng —
  khi trạng thái phế được gỡ sau này, nhân vật vẫn ở Chờ Đột Phá, chỉ cần
  `breakthrough_requirement_met` mới tiếp tục hoạt động bình thường.
- **Nếu `death_and_consequence_blocked=true` VÀ `breakthrough_requirement_met`
  chuyển `true` CÙNG lúc** (thêm 2026-08-08, `/design-review` vòng 1, cụm
  A7, tìm thấy bởi `systems-designer` — trước đây chỉ test tuần tự, chưa
  test đồng thời): đột phá KHÔNG thực thi ngay — xem Core Rule #9/D.7
  `try_execute_breakthrough`. Trạng thái Chờ Đột Phá + điều kiện-đã-đủ được
  giữ nguyên; thực thi ở lượt đầu tiên sau khi cờ phế được gỡ, kiểm tra lại
  `breakthrough_requirement_met` tại thời điểm đó (không giả định còn true).
- **Nếu 2 bên Combat đồng thời ở mốc tier=1 (mốc SÀN thật — sửa 2026-08-08,
  cụm B2/A12: `tier` không bao giờ =0 với `level≥1` hợp lệ theo Rule 1 +
  registry `tier_from_level`; bản gốc mô tả nhầm biên này là "tier=0",
  KHÔNG reachable, xem AC-37)**: `tier_diff=0` giữa 2 nhân vật MỚI TẠO
  (chưa từng đột phá lần nào, cả hai đang ở tier=1), D.2 hoạt động bình
  thường (`multiplier=1`), không có sentinel đặc biệt cần thiết — khác với
  Combat System's `combat_power_estimate` (D.13) vốn cần sentinel
  "N/A"/"+∞" khi Lực chiến=0 (Lực chiến=0 LÀ trạng thái reachable, tier=0
  THÌ KHÔNG).
- **Nếu người chơi chưa từng gán Tâm Pháp nào**: `exp_multiplier=1.0` mặc
  định (Core Rule #3), `SONG_TU_ACTIVE=0` vô điều kiện (không có Tâm Pháp
  thì không thể có `type=song-tu`) — không cần xử lý null riêng, các công
  thức D.1–D.7 hoạt động bình thường với giá trị mặc định.
- **Thông tin cho người chơi trong lúc Chờ Đột Phá** (thêm 2026-08-08,
  `/design-review` vòng 1, cụm A5, tìm thấy bởi `game-designer` +
  `economy-designer`, hợp nhất bởi `creative-director` thành Most Important
  Finding #2; **nâng cấp thành Core Rule #12 — Required-for-MVP — 2026-08-08
  `/design-review` vòng 2, cụm A2-6**): cơ chế "chặn trần, không bank"
  (Rule 5) giữ nguyên — đây là quyết định tường minh đã chốt trước đó trong
  phiên thiết kế GDD này, KHÔNG đảo ngược. Trạng thái Chờ Đột Phá PHẢI có
  ÍT NHẤT 1 tín hiệu định tính tối giản (Core Rule #12, không còn tùy
  chọn "NÊN") — GDD này CHỈ định nghĩa 1 interface hook (không tự hiện
  thực): hệ tường thuật (AI/LLM Integration Layer, qua Setting & Canon
  Integration cung cấp nội dung gợi ý) và Character Card & Identity (hiển
  thị) PHẢI cung cấp tín hiệu đó — KHÔNG lộ đáp án chính xác của
  `breakthrough_requirement_met`, chỉ giảm cảm giác bế tắc. Nội dung tín
  hiệu cụ thể (câu chữ, hình ảnh...) vẫn là Open Question hướng tới 2 hệ đó
  (xem Open Questions) — GDD này chỉ nâng yêu cầu TỒN TẠI tín hiệu từ tùy
  chọn lên bắt buộc, không tự thiết kế nội dung.

## Dependencies

| System | Direction | Nature | Hard/Soft |
|---|---|---|---|
| Combat System | This depends on Combat | Nhận EXP source events (thắng/thua) qua hand-off `combat-system.md` Core Rule #12 (làm rõ tên tài liệu 2026-08-08 vòng 2, tránh đụng số với Core Rule #12 của chính GDD này); Combat đọc ngược `tier(C)` (2 chiều) | Hard |
| Turn Manager | This depends on Turn Manager | Vòng đời xác nhận/undo (Core Rule #7/#8); trigger EXP thụ động mỗi lượt | Hard |
| NPC Affinity & Relationship (Designed 2026-08-03) | This depends on NPC Affinity | Trạng thái "quan hệ Song Tu active" cho nguồn EXP #4 — interface đã chốt: danh sách NPC ID, EXP đọc boolean derived "khác rỗng", bonus KHÔNG cộng dồn theo số NPC (registry `song_tu_active`) | Soft — thiếu thì mất 1 nguồn EXP phụ, hệ vẫn hoạt động |
| Death & Consequence (đã Designed) | This depends on Death & Consequence | Cờ "phế đan điền/võ công" chặn tích lũy EXP | Soft — edge interaction, không chặn core loop |
| Setting & Canon Integration (Designed 2026-08-03) | This depends on Setting & Canon | Dữ liệu `breakthrough_requirement` cụ thể theo bối cảnh — interface đã chốt: `breakthrough_requirement_met(tier)` (registry), predicate data thuần theo setting pack, thiếu data tier → false cứng + warning "content gap"; thứ tự trong lượt: canon resolve TRƯỚC resolve_turn_exp | **Hard** — thiếu data authoring thì KHÔNG bao giờ đột phá bậc được (dù cấp trong 1 bậc vẫn lên bình thường) |
| Character Card & Identity (đã Designed) | Character Card depends on this | Đọc `level`, `tier` để hiển thị "Cấp độ - Bậc" | Hard (chiều ngược) |
| Situation/Encounter Generation (Designed 2026-08-03) | Situation Gen depends on this | Đọc `level` cho ngưỡng chênh lệch 20 cấp (registry `hostile_initiative_allowed`) và cho sinh `level` đối thủ ambient (`encounter_level_range`) | Soft (chiều ngược) — Situation Gen còn hoạt động được mà không cần ngưỡng này ở MVP tối giản |

*(`systems-index.md` hiện chỉ liệt kê Combat System + Turn Manager là
dependency của hệ #8 — 5 dependency còn lại ở trên (đều với hệ chưa thiết
kế) tạo ra dependency gap một chiều, cùng pattern 4 gap đã ghi nhận trước
đó trong phiên này — sẽ footnote ở `systems-index.md`, không sửa cấu trúc
bảng chính.)*

*(Ghi chú thêm 2026-08-08, `/design-review` vòng 1, cụm A5/A15 — 2 gap MỚI
phát hiện, cũng footnote ở `systems-index.md` thay vì restructure bảng
này: (1) **A5** — Setting & Canon Integration + Character Card & Identity
nên cung cấp 1 tín hiệu/gợi ý tường thuật cho trạng thái Chờ Đột Phá (xem
Edge Cases), hiện CHƯA có interface nào cho việc này ở 1 trong 2 hệ đó;
(2) **A15** — rollback tài nguyên ngoài tiêu tốn khi đột phá (VD Hồn Hoàn,
xem Edge Cases mục Undo) là 1 gap SỞ HỮU treo ở CẢ 3 hệ: GDD này tự nhận
out-of-scope (Edge Cases), `setting-canon-integration.md` coi
`breakthrough_requirement_met` là predicate thuần không sở hữu resource,
`equipment-skill-data-system.md` chưa hề nhắc tới Hồn Hoàn hay bất kỳ tài
nguyên tiêu-thụ-khi-đột-phá nào. Đề xuất (không tự quyết ở đây): **Equipment
& Skill Data System** là owner hợp lý nhất — hệ đó đã có Open Question
riêng về "single-use hay có charge" cho item nói chung, rollback tài
nguyên khi Undo là phần mở rộng tự nhiên của câu hỏi đó.)*

## Tuning Knobs

| Parameter | Current Value | Safe Range | Effect of Increase | Effect of Decrease |
|---|---|---|---|---|
| `BASE_EXP_THRESHOLD` | 100 | 50–300 | **Sửa 2026-08-08 (A3)**: CHỈ đổi con số ngưỡng hiển thị trên Thẻ Nhân Vật — KHÔNG đổi số lượt/trận thật cần để lên cấp (tự triệt tiêu về đại số vì mọi nguồn EXP đều tỷ lệ `RATE*exp_threshold`, xem ghi chú thiết kế D.1). PHẢI > 0 (xem EC guard, cụm B1) | Tương tự — chỉ đổi con số hiển thị, không đổi pacing thật; nếu ≤0 là lỗi cấu hình nghiêm trọng (cascade vô hạn, xem EC) |
| `EXP_THRESHOLD_INCREMENT` | 10 | 5–50 | **Sửa 2026-08-08 (A3)**: tương tự — chỉ đổi con số hiển thị càng về sau càng lớn, KHÔNG đổi số lượt/trận thật cần cho mỗi cấp (hằng số `1/RATE`, độc lập ngưỡng) | Tương tự — chỉ đổi con số hiển thị, không đổi pacing thật |
| `PASSIVE_EXP_RATE` | **0.001 (0.1%)** (sửa 2026-08-08 vòng 2, cụm A2-1 — trước đây `0.01`) | **0.0005–0.003** (thu hẹp theo cùng tỷ lệ tương đối 0.5×–3× default cũ, sửa 2026-08-08 vòng 2, cụm A2-1) | Tự lên cấp nhanh hơn — **sửa 2026-08-08 (A1): chỉ khi NGOÀI combat** (`turn.in_combat=false`), không còn cộng dồn theo số pha giao đấu. PHẢI verify Invariant kinh tế D.1 (`WIN_EXP_BASE_FRACTION/CONTENT_EXCHANGE_ESTIMATE ≥ PASSIVE_EXP_RATE+SONG_TU_EXP_RATE`) trước khi tăng | Gần như phải chiến đấu mới tiến bộ — có thể cảm thấy passive vô nghĩa |
| `LOSS_EXP_RATE` | 0.04 (4%) | 0.02–0.06 | Thua trận vẫn tiến bộ đáng kể — giảm rủi ro thật của combat | Thua gần như vô ích — tăng áp lực né combat rủi ro cao. **Ràng buộc bắt buộc (A2/A4)**: PHẢI ≤ `WIN_EXP_BASE_FRACTION×WIN_EXP_FLOOR_MULT` (xem D.2/D.3) — mọi thay đổi PHẢI verify lại invariant này; vi phạm bị chặn ở data-load time (EC mới/AC-45, cụm A2-4) |
| `WIN_EXP_BASE_FRACTION` | **0.20** (sửa 2026-08-08 vòng 2, cụm A2-1 — trước đây `0.15`) | 0.05–0.30 — **KHÔNG độc lập với Safe Range của `WIN_EXP_FLOOR_MULT`** (ràng buộc chung, thêm 2026-08-08 vòng 2, cụm A2-4 — xem ghi chú ngay dưới bảng) | 1 trận thắng cùng bậc đóng góp lớn — lên cấp nhanh qua combat | Combat trở thành nguồn EXP yếu, passive/Song Tu lấn át. **Ràng buộc chéo (A2/A4)**: PHẢI verify `WIN_EXP_BASE_FRACTION×WIN_EXP_FLOOR_MULT ≥ LOSS_EXP_RATE` trước khi hạ giá trị này |
| `WIN_EXP_TIER_BONUS` | 0.25 | 0.10–0.40 | Đánh lên thưởng rất đậm, đánh xuống phạt rất nặng — khuyến khích mạo hiểm | Chênh lệch bậc ít ảnh hưởng tới EXP — làm nhạt tinh thần "mạo hiểm đánh lên có thưởng" |
| `WIN_EXP_FLOOR_MULT` | **0.30** (sửa 2026-08-08, A2/A4 — trước đây 0.05, gây dominant strategy "cố ý thua" ở `tier_diff≤-3`) | **0.27–0.50** — **KHÔNG độc lập với Safe Range của `WIN_EXP_BASE_FRACTION`** (ràng buộc chung, thêm 2026-08-08 vòng 2, cụm A2-4 — xem ghi chú ngay dưới bảng) | Farm đối thủ yếu vẫn còn chút lợi ích — **RỦI RO ĐÃ BIẾT, CHƯA CÓ CƠ CHẾ CHẶN (ghi nhận 2026-08-08, verify hẹp sau vòng 2, tìm thấy bởi `economy-designer`)**: quy đổi theo lượt, farm đối thủ `tier_diff≤-3` (EXP/trận = `WIN_EXP_BASE_FRACTION×WIN_EXP_FLOOR_MULT×exp_threshold`, không đổi theo `WIN_EXP_BASE_FRACTION`) vẫn VƯỢT TRỘI hơn đấu công bằng theo lượt nếu trận yếu-hơn kết thúc trong ≤ `WIN_EXP_FLOOR_MULT × N_fair` pha (VD ≤9 pha so với 1 trận công bằng 30 pha) — breakeven này KHÔNG phụ thuộc `WIN_EXP_BASE_FRACTION` (triệt tiêu ở 2 vế), chỉ phụ thuộc knob này. Đối thủ yếu hơn ≥3 bậc chịu `PENALTY_PER_TIER` nặng ở `combat-system.md`, thua nhanh trong khoảng đó là hoàn toàn khả thi. GDD này CHƯA có cơ chế phân biệt "độ khó thật của trận" khỏi "độ dài trận" — quyết định KHÔNG tự thiết kế cơ chế mới ở đây (đòi hỏi redesign D.2, ngoài phạm vi 1 lần verify hẹp); xem Open Questions | Đánh xuống quá sâu gần như vô nghĩa — nhưng KHÔNG được xuống dưới mức khiến thua sinh lợi hơn thắng (xem invariant D.2) |
| `WIN_EXP_CEIL_MULT` | 3.0 | 2.0–5.0 | 1 trận đánh lên cực đoan có thể cho EXP khổng lồ — rủi ro phá cân bằng nếu người chơi liều ăn may | Giới hạn phần thưởng mạo hiểm, giảm động lực đánh lên quá xa |
| `SONG_TU_EXP_RATE` | **0.0015 (0.15%)** (sửa 2026-08-08, verify hẹp sau vòng 2 — `0.002` ở vòng 2 không đủ margin cho Invariant kinh tế D.1 ở đầu trên Safe Range `CONTENT_EXCHANGE_ESTIMATE`, xem D.1; trước đó `0.02` ở vòng 1) | **0.001–0.003** (thu hẹp lại, đảm bảo Invariant kinh tế D.1 giữ ≥1.5× ở CẢ 3 mốc Safe Range `CONTENT_EXCHANGE_ESTIMATE=15/30/50`, không chỉ ở default) | Song Tu trở thành nguồn EXP đáng kể hơn — **sửa 2026-08-08 (A1): chỉ khi NGOÀI combat**, không còn cộng dồn theo số pha giao đấu. PHẢI verify Invariant kinh tế D.1 (ở TOÀN BỘ Safe Range `CONTENT_EXCHANGE_ESTIMATE`, không chỉ default) trước khi tăng — guard data-load-time ở AC-48 | Song Tu chỉ là bonus rất nhỏ, gần như chỉ mang ý nghĩa tường thuật |

**Ràng buộc chung KHÔNG độc lập giữa `WIN_EXP_BASE_FRACTION` và
`WIN_EXP_FLOOR_MULT` (thêm 2026-08-08, `/design-review` vòng 2, cụm A2-4,
tìm thấy bởi `economy-designer`)**: Safe Range của 2 knob này KHÔNG độc
lập — PHẢI luôn thỏa `WIN_EXP_BASE_FRACTION × WIN_EXP_FLOOR_MULT ≥
LOSS_EXP_RATE` ĐỒNG THỜI (VD range công bố `0.05–0.30` cho `BASE_FRACTION`
chỉ an toàn khi `FLOOR_MULT` ở mức default `0.30` trở lên — combo
`BASE=0.10×FLOOR=0.30=0.03 < LOSS=0.04` VẪN nằm trong 2 range công bố
nhưng VI PHẠM invariant). Vi phạm invariant này bị chặn ở data-load time
(Edge Cases, AC-45).
| `LEVEL_GROWTH_X` / `BREAKTHROUGH_BONUS_X` (riêng từng chỉ số) | VD: HP: 8 / 50; ATK: 1.5 / 8 | Tùy chỉ số, cần pass cân bằng riêng | Chỉ số tăng nhanh — Lực chiến vọt cao, cần đối chiếu lại `w_*` của `combat_power_estimate` | Chỉ số tăng chậm — cảm giác "tu luyện không mạnh lên" |
| `PERCENT_STAT_CAP` | 0.95 | 0.85–0.99 | Chỉ số % tối đa cao hơn — game trở nên biến động/RNG cực đoan hơn ở cấp cao | Chỉ số % bị nén sớm — mất cảm giác tiến bộ ở các chỉ số dạng % khi lên cấp cao |
| `exp_multiplier` (Tâm Pháp, sở hữu bởi hệ tương lai) | mặc định 1.0, không trần | **Khuyến nghị (thêm 2026-08-08, A14)**: hệ Tâm Pháp tương lai nên áp 1 trần đủ thấp để 1 trận thắng không vượt ~1 cấp's worth EXP | 1 Tâm Pháp multiplier lớn có thể gây cascade nhiều cấp mất kiểm soát trong D.7 | Không ảnh hưởng — mặc định 1.0 đã an toàn |

*(`LEVEL_GROWTH_X`/`BREAKTHROUGH_BONUS_X` là một BỘ 24 hằng số — 2 hằng/chỉ
số × 12 chỉ số Character Card — không liệt kê hết ở đây, chỉ 2 ví dụ đại
diện; toàn bộ nằm trong data file cấu hình theo `coding-standards.md`. Data
file PHẢI có đủ 24 hằng số này + `BASE_EXP_THRESHOLD`/`EXP_THRESHOLD_INCREMENT`
— thiếu 1 trong 26 hằng số là lỗi cấu hình fail-loud, xem Edge Cases cụm
A9.)*

## Visual/Audio Requirements

[To be designed]

## UI Requirements

[To be designed]

## Acceptance Criteria

*(Từ `qa-lead`, sau khi giải quyết 1 gap phát hiện — xem ghi chú cuối
section này.)*

**Story Type**: Logic (formulas + state machine) → **BLOCKING** gate, test
tự động bắt buộc tại `tests/unit/exp-realm-progression/` (naming:
`exp_realm_progression_[feature]_test.gd`, `test_[scenario]_[expected]`).

**Ghi chú test setup**: Trừ khi ghi chú khác, mọi AC dùng cố định giá trị
default ở Tuning Knobs (`BASE_EXP_THRESHOLD=100, EXP_THRESHOLD_INCREMENT=10,
PASSIVE_EXP_RATE=0.001, LOSS_EXP_RATE=0.04, WIN_EXP_BASE_FRACTION=0.20,
WIN_EXP_TIER_BONUS=0.25, WIN_EXP_FLOOR_MULT=0.30, WIN_EXP_CEIL_MULT=3.0,
SONG_TU_EXP_RATE=0.0015, PERCENT_STAT_CAP=0.95`) làm fixture — không random
(`WIN_EXP_FLOOR_MULT` sửa 2026-08-08 vòng 1, từ `0.05`;
`PASSIVE_EXP_RATE`/`WIN_EXP_BASE_FRACTION`/`SONG_TU_EXP_RATE` sửa
2026-08-08 vòng 2, cụm A2-1, từ `0.01`/`0.15`/`0.02`; `SONG_TU_EXP_RATE`
sửa THÊM 1 lần nữa ở verify hẹp sau vòng 2, từ `0.002` xuống `0.0015` — xem
D.1 Invariant kinh tế mới, D.2, D.4, Tuning Knobs).
`locked_result.outcome` (sửa 2026-08-05, tên field thật của
`combat-system.md` — trước ghi nhầm `battle_result`), `is_death_turn`,
`SONG_TU_ACTIVE`, `breakthrough_requirement_met`, VÀ
`death_and_consequence_blocked` VÀ `turn.in_combat` (2 mục cuối thêm
2026-08-08, cụm B7/qa#2 — dùng y hệt cách các mock khác dù trước đây không
được liệt kê tường minh trong danh sách bắt buộc)
phải được **inject** như tham số/mock (dependency injection over
singleton, theo `coding-standards.md`), KHÔNG gọi Combat/NPC Affinity/
Setting thật — giữ toàn bộ test suite deterministic dù các hệ phụ thuộc đó
nay đã Designed (lúc viết chưa thiết kế). `tier(self)`/`tier(opponent)`
trong mọi AC của D.2 là **raw int**, không phải object reference (làm rõ
2026-08-08, cụm B7/qa#10) — trừ AC-32 vốn test riêng trường hợp
opponent-thiếu-tier ở tầng data model.

**Ghi chú Integration test (thêm 2026-08-08, `/design-review` vòng 1, cụm
A11, tìm thấy bởi `qa-lead`; cấu trúc hóa lại 2026-08-08, `/design-review`
vòng 2, cụm B2-1)**: bộ AC dưới đây 100% Logic/mock hóa hoàn toàn Combat
System — điều này CHƯA ĐỦ, vì GDD này từng có 1 lỗi THẬT ở đúng lớp mock
hóa không bắt được (tên field `battle_result` vs `outcome` thật của
`combat-system.md`, phải sửa 2026-08-05). Theo `coding-standards.md` Test
Evidence (Integration = multi-system, BLOCKING), cần bổ sung ÍT NHẤT 1
Integration test tại `tests/integration/exp-realm-progression/` (naming:
cùng convention `exp_realm_progression_[feature]_test.gd`, VD
`exp_realm_progression_combat_handoff_schema_test.gd`). Field bắt buộc
phải schema-check: `battle_active` (bool), `outcome.winner_id` (Character
ID), `outcome.loser_id` (Character ID), `outcome.type` (enum, dùng để
phân biệt `no_outcome` — KHÔNG dùng cho thắng/thua self-relative, xem Core
Rule #11/AC-39). **Điều kiện pass/fail cụ thể**: test load fixture/schema
THẬT của `locked_result` từ `combat-system.md` (hoặc contract test đối
chiếu tên field) — PASS nếu cả 4 field trên tồn tại đúng tên VÀ đúng kiểu
trong output thật của Combat System tại thời điểm implement; FAIL (và
block merge) nếu bất kỳ tên field nào lệch (VD `battle_result` thay vì
`outcome`, tái diễn lỗi 2026-08-05) — không thay thế các AC Logic dưới
đây (xem tổng số AC ở ghi chú cuối section này), chỉ bổ sung lớp mà mock
không bắt được.

**Ghi chú Error Taxonomy (thêm 2026-08-08, `/design-review` vòng 2, cụm
B2-4, tìm thấy bởi `qa-lead`)**: mọi error code của hệ này dùng convention
`EXP_ERROR_*`, verify bằng equality với hằng số (KHÔNG match chuỗi debug
tự do) — cùng convention đã dùng ở `persistence-save-system.md`. 3 mã hiện
có/được đặt tên trong GDD này: (1) `EXP_ERROR_OPPONENT_TIER_UNDEFINED`
(AC-32, opponent thiếu `tier`); (2) `EXP_ERROR_WIN_LOSS_INVARIANT_VIOLATED`
(AC-45, mới cụm A2-4, vi phạm invariant
`WIN_EXP_BASE_FRACTION×WIN_EXP_FLOOR_MULT≥LOSS_EXP_RATE`); (3) tên gợi ý
cho case "thiếu hằng số bắt buộc" (AC-41): `EXP_ERROR_MISSING_TUNING_CONSTANT`
kèm tham số `missing_constant_name` — gợi ý dùng 1 mã CHUNG cho cả 26
hằng số khả dĩ thiếu thay vì 26 mã hard-code riêng biệt (over-spec ở tầng
GDD, cụ thể hóa để lại cho implementation). AC-42 (`BASE_EXP_THRESHOLD≤0`)
VÀ AC-47 mới (`EXP_THRESHOLD_INCREMENT<0`) CỐ Ý KHÔNG đặt tên hằng số
error code cụ thể trong prose AC — lý do: cùng họ "cấu hình `exp_threshold`
không hợp lệ", gợi ý dùng 1 mã CHUNG `EXP_ERROR_INVALID_THRESHOLD_CONFIG`
cho cả 2 thay vì 2 mã riêng, cũng để lại cụ thể hóa cho implementation.
Test của AC-41/AC-42/AC-47 vẫn PASS chỉ cần xác nhận hành vi fail-loud xảy
ra (không chấp nhận default `0` âm thầm), KHÔNG bắt buộc equality với 1
literal string cụ thể — khác AC-32/AC-45 vốn CÓ mã cụ thể và test PHẢI
verify equality.

### Core Rules

**AC-01** (Rule #1 — level/tier): GIVEN `level` lần lượt = 1, 10, 11, 20,
21, 30, WHEN tính `tier(C) = floor((level-1)/10)+1`, THEN kết quả lần lượt
= 1, 1, 2, 2, 3, 3.

**AC-02** (Rule #2a — nguồn Combat thắng): GIVEN 1 lượt có
`is_death_turn=false, death_and_consequence_blocked=false` (pin tường
minh 2026-08-08, cụm B7/qa#1),
`locked_result.battle_active=false, locked_result.outcome={type:"win",
winner_id:self, loser_id:opponent}` (sửa tên field 2026-08-05, khớp
schema thật của `combat-system.md`), WHEN `resolve_turn_exp` chạy,
THEN `raw_combat` bằng chính xác giá trị `combat_win_exp` (D.2) — xác định
qua `winner_id==self` (self-relative, KHÔNG qua `outcome.type`, sửa
2026-08-08 cụm A13, xem AC-39 cho case `self≠player_id`) — và không nguồn
nào khác được dùng thay thế.

**AC-02b** (Rule #2a/mở rộng — nguồn Combat khi `no_outcome`, đóng gap
"no_outcome chưa test" — bổ sung 2026-08-05, cụm B `/design-review` gộp
11 GDD): GIVEN 1 lượt có `is_death_turn=false,
death_and_consequence_blocked=false` (pin 2026-08-08, cụm B7/qa#1),
`locked_result.outcome={type:"no_outcome"}`
(bỏ chạy hoặc hòa giao hữu), WHEN `resolve_turn_exp` chạy, THEN
`raw_combat=0` TƯỜNG MINH (không phải fallthrough ngầm) — không diễn
giải thành thắng hay thua, đúng ràng buộc đã khóa ở `combat-system.md`.

**AC-03** (Rule #2b — nguồn Combat thua): GIVEN 1 lượt có
`locked_result.outcome={type:"lose", loser_id:self}, is_death_turn=false,
death_and_consequence_blocked=false` (sửa tên field 2026-08-05; pin cờ
thứ 2 thêm 2026-08-08, cụm B7/qa#1), WHEN `resolve_turn_exp` chạy,
THEN `raw_combat` bằng chính xác `combat_loss_exp` (D.3) — xác định qua
`loser_id==self` (self-relative, sửa 2026-08-08 cụm A13).

**AC-04** (Rule #2c — nguồn Thụ động): GIVEN bất kỳ lượt xác nhận nào (có
hoặc không có Song Tu, `is_death_turn=false`, `death_and_consequence_blocked=false`,
VÀ `turn.in_combat=false` — điều kiện thứ 4 thêm 2026-08-08, cụm A1, xem
AC-31b cho trường hợp `in_combat=true`), WHEN
`resolve_turn_exp` chạy, THEN `raw_passive = PASSIVE_EXP_RATE *
exp_threshold(level)` luôn được cộng — không có điều kiện bổ sung nào chặn
nó ngoài 2 short-circuit toàn cục (`death_and_consequence_blocked`,
`is_death_turn`) VÀ `turn.in_combat=true` (xem AC-16/AC-35/AC-31b).

**AC-05** (Rule #2d — nguồn Song Tu, AND logic): GIVEN 3 tổ hợp: (a) Tâm
Pháp type=song-tu NHƯNG không có quan hệ Song Tu active, (b) có quan hệ
Song Tu active NHƯNG Tâm Pháp không phải type song-tu, (c) không có Tâm
Pháp nào, WHEN tính `SONG_TU_ACTIVE(self)`, THEN cả 3 trường hợp đều trả
`0` (`raw_song_tu=0`) — chỉ khi CẢ HAI điều kiện đồng thời true mới trả
`1`.

**AC-06** (Rule #3 — Tâm Pháp exp_multiplier): GIVEN Tâm Pháp active có
`exp_multiplier=1.2`, `raw_total` đã biết = `85` (literal fixture độc lập
— sửa 2026-08-08, cụm B7/qa#9: KHÔNG phải giá trị đọc lại từ 1 test khác
chạy trước, chỉ tình cờ trùng con số của ví dụ D.7; giá trị này cũng
KHÔNG còn diễn giải là "tổng 3 nguồn" vì combat-win và passive/Song-Tu
không bao giờ cùng resolve 1 lượt kể từ cụm A1, xem AC-31/AC-31b; **sửa số
liệu 2026-08-08 vòng 2, cụm A2-1** — trước đây `63.75`, cập nhật theo
`WIN_EXP_BASE_FRACTION=0.20` mới để tiếp tục trùng với ví dụ D.7 — số liệu
combat này KHÔNG đổi thêm ở đợt verify hẹp sau vòng 2, chỉ `SONG_TU_EXP_RATE`
đổi), WHEN áp `exp_multiplier`, THEN `final_gain = 85 * 1.2 = 102` (trước
đây `76.5`) —
nhân đúng 1 lần vào TỔNG, không nhân riêng từng nguồn rồi cộng lại (dù kết
quả đại số giống nhau, implementation phải nhân sau bước cộng).

**AC-07** (Rule #4 — Lên cấp thường, đơn giản): GIVEN `level=25`
(`exp_threshold=340`), EXP hiện tại=300, WHEN `final_gain=102` áp vào
(sửa 2026-08-08 vòng 2 cụm A2-1, khớp AC-06 mới — trước đây `76.5`), THEN
`level=26`, EXP dư = `300+102-340=62` (trước đây `36.5`).

**AC-08** (Rule #4 — cascade nhiều cấp không chạm mốc đột phá): GIVEN
`level=5` (`exp_threshold(5)=140`), EXP hiện tại=50, `final_gain=300`, WHEN
áp dụng, THEN cascade qua `level=6` (`exp_threshold(6)=150`), dừng ở
`level=7` với EXP dư=60 (không đủ 160 để lên cấp 8) — 2 lần lên cấp trong 1
lượt.

**AC-09** (Rule #5 — vào trạng thái Chờ Đột Phá, chặn trần): GIVEN
`level=20` (`exp_threshold(20)=290`), EXP hiện tại=280, `final_gain=50`,
WHEN áp dụng, THEN state chuyển sang **Chờ Đột Phá**, EXP bị kẹp CHÍNH XÁC
ở `290` (không phải `330`), 40 EXP dư bị lãng phí, level VẪN = 20 (không
lên 21).

**AC-10** (Rule #5 — lãng phí EXP lặp lại khi đang chờ): GIVEN character
đang ở Chờ Đột Phá tại `level=20`, EXP=290 (đã kẹp trần),
`breakthrough_requirement_met=false`, WHEN thêm 1 lượt nữa chỉ có passive
(`final_gain=2.9`, không Combat/Song Tu), THEN EXP SAU lượt đó VẪN = 290
(không phải 292.9), level/tier/state không đổi — lặp lại được N lượt liên
tiếp mà không lỗi/overflow.

**AC-11** (Rule #6 — ranh giới sở hữu `breakthrough_requirement_met`):
GIVEN 2 mock predicate khác nhau cho `breakthrough_requirement_met(tier)`
(mock A luôn trả `false`, mock B luôn trả `true`) được inject vào cùng 1
state Chờ Đột Phá giống hệt nhau, WHEN chạy state check, THEN hành vi hệ
thống CHỈ phụ thuộc vào giá trị mock trả về (mock A → không đột phá, mock
B → đột phá ngay) — đây là phần runtime-testable của AC này. **Tách riêng
2026-08-08** (cụm B7/qa#6): claim "hệ EXP không chứa logic cứng nào về nội
dung điều kiện (VD không có string 'Hồn Hoàn')" KHÔNG phải 1 runtime
assertion hợp lệ (là static-inspection) — chuyển thành 1 mục CI/code-review
checklist, cùng cơ chế `technical-preferences.md` đã dùng cho Forbidden
Pattern `JavaScriptBridge.eval()`, không phải 1 unit test assertion.

**AC-12** (Rule #7 — thực thi đột phá, state transition): GIVEN character
ở Chờ Đột Phá tại `level=20, tier=2, EXP=290`,
`breakthrough_requirement_met(2)` chuyển thành `true` trong lượt này, WHEN
xử lý lượt, THEN NGAY LẬP TỨC: `level=21`, `tier=3`, `EXP=0` (không
carry-over phần 290 đã kẹp), state chuyển về Tu Luyện Thường.

**AC-13** (Rule #7 — cú nhảy chỉ số sau đột phá, qua D.5): GIVEN đột phá
xảy ra `level10(tier1)→level11(tier2)`, dùng fixture HP (`base_HP0=100,
LEVEL_GROWTH_HP=8, BREAKTHROUGH_BONUS_HP=50`), WHEN tính `stat_value(HP)`
TRƯỚC (level10,tier1: `100+8*9+50*0=172`) và SAU (level11,tier2:
`100+8*10+50*1=230`), THEN chênh lệch = 58, trong đó 8 là tăng đều mỗi cấp
và 50 là cú nhảy đột phá riêng — xác nhận D.5 tự động phản ánh cú nhảy mà
không cần một cơ chế "apply bonus" tách biệt.

**AC-14** (Rule #8 — Rollback lượt thường): GIVEN lượt gây thay đổi
`level/tier/EXP` (không đột phá) từ snapshot X sang Y, WHEN Turn Manager
Undo đúng lượt đó (độ sâu 1, non-chainable), THEN `level/tier/EXP` trở về
ĐÚNG snapshot X — không có field nào bị rollback một phần.

**AC-15** (Rule #8 — Rollback lượt có đột phá): GIVEN lượt vừa gây đột phá
(`level20,tier2→level21,tier3,EXP=0`), WHEN Undo đúng lượt đó, THEN
`level=20, tier=2`, EXP VÀ **trạng thái Chờ Đột Phá** đều được khôi phục
nguyên trạng (không chỉ level/tier/EXP mà cả state machine).

**AC-16** (Rule #9 — Death & Consequence chặn toàn bộ 4 nguồn): GIVEN
`death_and_consequence_blocked(self)=true` VÀ cùng lượt có
`locked_result.outcome={type:"win", winner_id:self}` (sửa tên field
2026-08-05; đáng lẽ sinh combat_win_exp lớn), WHEN
`resolve_turn_exp` chạy, THEN trả về `0` ngay từ đầu (short-circuit) —
`raw_combat/raw_passive/raw_song_tu` đều KHÔNG được tính, EXP/level/tier
không đổi.

**AC-17** (Rule #10 — `level` là raw data, không tự tính ngưỡng NPC): GIVEN
`level=37`, WHEN 1 hệ ngoài (giả lập Situation/Encounter Generation) đọc
`level(C)`, THEN trả về đúng `37` — đây là phần runtime-testable của AC
này (GIVEN/WHEN/THEN đầy đủ). **Tách riêng 2026-08-08** (cụm B7/qa#5):
claim "public API KHÔNG có method tính chênh lệch 20 cấp" KHÔNG phải 1
runtime assertion hợp lệ (là static-inspection, và fragile — 1 method đặt
tên khác vẫn vi phạm mà không bị bắt) — chuyển thành 1 mục CI/code-review
checklist, cùng cơ chế đã áp dụng cho AC-11.

### Formulas

**AC-18** (D.1 — exp_threshold): GIVEN `level` = 1, 10, 20, 25, WHEN tính
`exp_threshold(level) = 100 + 10*(level-1)`, THEN kết quả lần lượt = 100,
190, 290, 340.

**AC-19** (D.2 — combat_win_exp, trường hợp thường; **số liệu sửa
2026-08-08 vòng 2, cụm A2-1**): GIVEN self `level=25`
(`tier=3`, `exp_threshold=340`), opponent `tier=5` (`tier_diff=+2`), WHEN
tính `combat_win_exp`, THEN `tier_multiplier = clamp(1+0.25*2, 0.30, 3.0) =
1.5` VÀ `combat_win_exp = 0.20*340*1.5 = 102` (trước đây `0.15*340*1.5=
76.5` — nay ĐỔI theo `WIN_EXP_BASE_FRACTION=0.20` mới, khác round 1 nơi
`tier_diff=+2` không chạm sàn nên bất biến qua đổi `FLOOR_MULT`).

**AC-20** (D.2 — floor clamp, sửa 2026-08-08 theo `WIN_EXP_FLOOR_MULT=0.30`
mới, cụm A2/A4; **số liệu cập nhật lại 2026-08-08 vòng 2, cụm A2-1**):
GIVEN `tier_diff=-3` VÀ `tier_diff=-4` (2 giá trị, đầu vào trực tiếp cho
`tier_multiplier`), self threshold=340, WHEN tính, THEN CẢ HAI trả đúng
`multiplier=clamp(...,0.30,3.0)=0.30` (raw lần lượt `0.25` và `0` đều dưới
sàn mới, bị kẹp lên `0.30`), `combat_win_exp =
0.20*340*0.30 = 20.4` (trước đây `15.3`) cho cả 2 — VÀ `20.4 >
combat_loss_exp=13.6` (AC-22, không đổi), xác nhận invariant D.2 (thắng
luôn ≥ thua) giữ đúng ở chính biên nguy hiểm nhất, với biên an toàn RỘNG
HƠN trước (`20.4-13.6=6.8` so với `15.3-13.6=1.7` trước đây).

**AC-21** (D.2 — ceil clamp; **số liệu sửa 2026-08-08 vòng 2, cụm A2-1**):
GIVEN `tier_diff=8` VÀ `tier_diff=10` (self threshold=340), WHEN tính
`multiplier`, THEN cả 2 trường hợp đều trả đúng `3.0` (không vượt),
`combat_win_exp = 0.20*340*3.0 = 204.0` (trước đây `153.0`) cho cả 2 —
xác nhận trần không bị vượt dù tier_diff tăng thêm.

**AC-21b** (D.2 — invariant thắng≥thua, thêm 2026-08-08, cụm A2/A4, tìm
thấy bởi `economy-designer`): GIVEN mọi `tier_diff` từ `-10` đến `+10`
(vòng lặp property-based hoặc liệt kê rời rạc), self `level=25`
(`exp_threshold=340`), WHEN tính `combat_win_exp` cho từng giá trị, THEN
KHÔNG CÓ giá trị `tier_diff` nào cho `combat_win_exp < combat_loss_exp`
(`13.6`, không đổi vì `LOSS_EXP_RATE` không đổi) — dùng làm regression
test chống tái diễn dominant strategy "cố ý thua" nếu 1 pass cân bằng sau
này vô tình đổi lại 1 trong 3 hằng số liên quan mà không verify invariant.
**Ghi chú 2026-08-08 vòng 2 (cụm A2-1)**: với default mới
(`WIN_EXP_BASE_FRACTION=0.20`), biên an toàn thấp nhất (`tier_diff≤-3`) là
`20.4 vs 13.6` (margin `6.8`) — RỘNG hơn round 1 (`15.3 vs 13.6`, margin
`1.7`), assertion không đổi nhưng biên an toàn thực tế đã tăng.

**AC-22** (D.3 — combat_loss_exp, không đổi — `LOSS_EXP_RATE` không nằm
trong 3 hằng số bị re-derive ở A2-1): GIVEN self `level=25`
(`exp_threshold=340`), `is_death_turn=false`, WHEN tính `combat_loss_exp`,
THEN kết quả = `0.04*340 = 13.6`.

**AC-23** (D.4 — song_tu_exp_bonus active; **số liệu sửa 2026-08-08,
verify hẹp sau vòng 2**): GIVEN self `level=25` (`exp_threshold=340`),
`SONG_TU_ACTIVE=1`, WHEN tính, THEN
`song_tu_exp_bonus = 0.0015*340 = 0.51` (trước đây `0.68` ở vòng 2,
`0.02*340=6.8` ở vòng 1).

**AC-24** (D.4 — song_tu_exp_bonus inactive): GIVEN `SONG_TU_ACTIVE=0`,
WHEN tính (bất kỳ level nào), THEN kết quả = `0` chính xác.

**AC-25** (D.5 — stat thô không trần): GIVEN `level=25, tier=3`, fixture
ATK (`base=10, growth=1.5, breakthrough_bonus=8`), WHEN tính `stat_value`,
THEN `ATK = 10+1.5*24+8*2 = 62`, không bị clamp.

**AC-26** (D.5 — stat % dưới trần): GIVEN `level=25, tier=3`, fixture Crit
Rate (`base=0.05, growth=0.008, breakthrough_bonus=0.02`), WHEN tính
`percentage_stat_value`, THEN raw=`0.282`, dưới `PERCENT_STAT_CAP=0.95` nên
KHÔNG bị clamp, kết quả = `0.282` (28.2%).

**AC-27** (D.5 — clamp trần % đúng biên): GIVEN fixture chỉ số % được
thiết kế để vượt trần ở level cao (`base=0.05, growth=0.05,
breakthrough_bonus=0.1`, `level=100, tier=10` → raw=`5.9`), WHEN tính
`percentage_stat_value`, THEN kết quả bị clamp CHÍNH XÁC ở `0.95` — không
phải `5.9`, không phải `1.0`.

**AC-28** (D.6 — order of operations, nhân trước khi so ngưỡng): GIVEN
`level=5` (`exp_threshold=140`), EXP hiện tại=50, `raw_total=40`,
`exp_multiplier=2.0`, WHEN `resolve_turn_exp` áp dụng, THEN `final_gain =
40*2.0 = 80` (KHÔNG phải 40), EXP mới = `130`, level VẪN = 5 (chưa đủ
140) — xác nhận nhân xảy ra TRƯỚC bước so sánh ngưỡng, không phải sau hay
bị bỏ qua.

**AC-29** (D.6 — cascade nhiều cấp rồi chạm đúng trần đột phá cùng lượt):
GIVEN `level=11` (Tu Luyện Thường, `exp_threshold(11)=200`), EXP hiện
tại=0, `final_gain=2500` (đã gộp+nhân xong), WHEN áp dụng, THEN cascade
qua các cấp 12→19 (9 lần lên cấp liên tiếp, tổng tiêu thụ 2160 EXP:
`200+210+...+280`), dừng lại chính xác ở `level=20`, chuyển sang Chờ Đột
Phá với EXP kẹp = `290`, phần dư `2500-2160-290=50` bị lãng phí — level
KHÔNG được vượt quá 20 trong cùng lượt này dù `final_gain` vẫn còn dư sau
khi capped.

**AC-30** (D.6 — hand-off short-circuit trước cả 4 nguồn, cả 2 cờ):
GIVEN lần lượt `death_and_consequence_blocked=true` VÀ (riêng biệt)
`turn.is_death_turn=true`, dù input `raw_combat/raw_passive/raw_song_tu`
đáng lẽ đều >0, WHEN `resolve_turn_exp` chạy, THEN cả 2 trường hợp hàm
return `0` ngay ở bước đầu tiên — verify các sub-formula D.2/D.3/D.4
KHÔNG được gọi (không chỉ output=0, mà không có side-effect/tính toán
thừa).

**AC-31** (D.6 — ví dụ tổng hợp, nguồn thụ động + Song Tu cùng lượt NGOÀI
combat — **viết lại 2026-08-08**, cụm A1: kịch bản gốc kết hợp combat
thắng + passive + Song Tu trong 1 lượt KHÔNG CÒN hợp lệ, vì combat chỉ
resolve khi `battle_active=false` — lượt đó vẫn `in_combat=true` theo
States and Transitions, nên passive/Song Tu luôn = 0 ở đúng lượt combat
thắng/thua resolve, xem AC-31b; **số liệu cập nhật lại 2026-08-08, verify
hẹp sau vòng 2**): GIVEN `level=25` (`exp_threshold=340`),
`turn.in_combat=false` (không có trận nào đang/kết thúc lượt này),
`SONG_TU_ACTIVE=1` → `raw_passive=0.34`, `raw_song_tu=0.51` (trước đây
`3.4`/`6.8` ở vòng 1, `0.34`/`0.68` ở vòng 2), `exp_multiplier=1.2`, EXP
hiện tại=300, WHEN
`resolve_turn_exp` chạy, THEN `raw_combat=0` (không có combat lượt này),
`raw_total=0.85` (trước đây `10.2` vòng 1, `1.02` vòng 2), `final_gain=
1.02` (trước đây `12.24` vòng 1, `1.224` vòng 2), EXP mới=`301.02` (trước
đây `312.24` vòng 1, `301.224` vòng 2), level VẪN=25 (chưa đủ 340) — dùng
làm regression test cho tổ hợp 2 nguồn hợp lệ duy nhất còn lại cùng lượt.

**AC-31b** (D.6 — combat thắng lượt kết trận KHÔNG cộng passive/Song Tu dù
điều kiện đủ, thêm 2026-08-08, cụm A1, tìm thấy bởi `economy-designer`,
escalate bởi `creative-director` thành Most Important Finding #1): GIVEN
`level=25` (`exp_threshold=340`), `locked_result.battle_active=false,
outcome={winner_id:self,...}` (self vừa thắng, kết trận lượt này),
`turn.in_combat=true` (lượt NÀY vẫn thuộc chuỗi combat theo States and
Transitions của `combat-system.md` — "Battle Concluded" chưa chuyển "Not
In Combat"), `SONG_TU_ACTIVE=1` giả lập (dù đáng lẽ `raw_song_tu>0` nếu
ngoài combat), WHEN `resolve_turn_exp` chạy, THEN `raw_combat =
combat_win_exp(...)` tính bình thường (không phụ thuộc `in_combat`) NHƯNG
`raw_passive=0` VÀ `raw_song_tu=0` TUYỆT ĐỐI (không phụ thuộc
`SONG_TU_ACTIVE`) vì `turn.in_combat=true` — `final_gain` chỉ đến từ
`raw_combat`. Đây là test trực tiếp cho cơ chế "2 nguồn không bao giờ
resolve cùng lượt" mô tả ở Core Rule #2/D.6.

### Edge Cases

**AC-32** (EC-1 — opponent thiếu tier là bug, không phải case hợp lệ —
**viết lại 2026-08-08**, cụm A10, tìm thấy bởi `qa-lead`): GIVEN opponent
Character Card KHÔNG có `tier` xác định (null/undefined), WHEN
`combat_win_exp` được gọi, THEN hệ thống PHẢI trả về lỗi cấu hình có cấu
trúc — error code `EXP_ERROR_OPPONENT_TIER_UNDEFINED` (verify bằng
equality với hằng số, KHÔNG match chuỗi debug tự do) — KHÔNG được âm thầm
dùng giá trị mặc định (0, null-coalesce, v.v.) để tính tiếp, VÀ KHÔNG được
hiện thực bằng GDScript `assert()` (bị strip khỏi exported/release build —
dự án ship Web/Mobile Web export, `assert()` sẽ âm thầm no-op đúng ở
production); test xác nhận error code CHÍNH XÁC được trả, không xác nhận
một giá trị EXP cụ thể nào.

**AC-33** (EC-2 — đột phá xử lý trước, EXP lượt đó tính trên ngưỡng mới;
**cập nhật 2026-08-08 vòng 2, cụm A2-2** để tham chiếu orchestrator mới):
GIVEN character ở Chờ Đột Phá tại `level=20,tier=2,EXP=290`,
`breakthrough_requirement_met(2)` chuyển true ĐÚNG lượt này, VÀ cùng lượt
có thêm `final_gain` mới (VD combat_win_exp) — nếu tính TRƯỚC breakthrough
sẽ dùng `exp_threshold(20)=290` nhưng SAU breakthrough phải dùng
`exp_threshold(21)=300`, WHEN gọi `process_character_turn(self, turn)`
(D.7 — orchestrator mới, gọi `try_execute_breakthrough` rồi
`resolve_turn_exp`), THEN thứ tự bắt buộc là: (1) đột phá trước
(`level=21,tier=3,EXP=0`), (2) rồi mới cộng `final_gain` của lượt đó vào
EXP=0 tại ngưỡng MỚI `exp_threshold(21)=300` — verify implementation
KHÔNG tính EXP lượt đó dựa trên ngưỡng cũ `exp_threshold(20)`.

**AC-43** (D.7 — `try_execute_breakthrough` gate `turn.in_combat`, thêm
2026-08-08, `/design-review` vòng 2, cụm A2-2): GIVEN character ở Chờ Đột
Phá (`level=20,EXP=290,tier=2`) VÀ `turn.in_combat=true` VÀ
`breakthrough_requirement_met(2)=true` cùng lượt (lượt này thuộc 1 trận
đang diễn ra, CHƯA kết thúc), WHEN `try_execute_breakthrough(self, turn)`
chạy, THEN đột phá KHÔNG xảy ra — `level/tier/state` giữ nguyên
(`level=20,tier=2,state="Chờ Đột Phá"`), chỉ thực thi ở lượt đầu tiên
`turn.in_combat=false` sau đó (giả sử `breakthrough_requirement_met` vẫn
`true` tại thời điểm đó).

**AC-44** (D.7 — `try_execute_breakthrough` gate `turn.is_death_turn`,
thêm 2026-08-08, `/design-review` vòng 2, cụm A2-2): GIVEN character ở Chờ
Đột Phá (`level=20,EXP=290,tier=2`) VÀ `turn.is_death_turn=true` VÀ
`breakthrough_requirement_met(2)=true` cùng lượt, WHEN
`try_execute_breakthrough(self, turn)` chạy, THEN đột phá KHÔNG xảy ra
(`level/tier/state` giữ nguyên) — nhân vật chết thật, hand-off Character
Continuation (Turn Manager Core Rule #9), không đột phá cùng lượt chết.

**AC-34** (EC-3 — rollback đột phá+undo, không rollback tài nguyên ngoài):
GIVEN lượt vừa gây đột phá (`level20,tier2→level21,tier3,EXP=0`) VÀ giả
lập lượt đó tiêu tốn 1 "Hồn Hoàn" (tài nguyên hệ khác), WHEN Undo lượt đó,
THEN `level/tier/EXP/Chờ-Đột-Phá-state` khôi phục về snapshot trước lượt
(giống AC-15); NHƯNG test PHẢI xác nhận rõ ràng rằng việc hoàn trả Hồn
Hoàn KHÔNG nằm trong phạm vi assertion của hệ EXP (out of scope theo
GDD) — không viết assertion nào kiểm tra Hồn Hoàn ở đây, tránh false
negative khi hệ ngoài đó chưa tồn tại.

**AC-35** (EC-4 — is_death_turn, short-circuit toàn cục): GIVEN
`turn.is_death_turn=true`, `locked_result.outcome={type:"lose"}` (sửa
tên field 2026-08-05), VÀ passive/Song Tu đáng lẽ
đều >0, WHEN `resolve_turn_exp` chạy, THEN kết quả = `0` cho TOÀN BỘ lượt
(không chỉ `raw_combat`) — khớp với quyết định short-circuit toàn cục đã
chốt (xem sửa đổi D.6/Core Rule #2 sau khi gap này được giải quyết).

**AC-36** (EC-5 — crippled trong lúc Chờ Đột Phá, state được giữ nguyên):
GIVEN character đang Chờ Đột Phá (`level=20,EXP=290`),
`death_and_consequence_blocked` chuyển `true` giữa chừng, WHEN thêm N lượt
trong lúc bị block, THEN state VẪN là Chờ Đột Phá (`level=20,EXP=290`
không đổi, không bị "mất" trạng thái); WHEN `death_and_consequence_blocked`
chuyển lại `false` VÀ `breakthrough_requirement_met(2)=true` xảy ra sau
đó, THEN đột phá xảy ra bình thường như AC-12, không cần bất kỳ bước khôi
phục state đặc biệt nào.

**AC-36b** (Rule #9 mở rộng — đột phá bị chặn khi phế đan điền + điều
kiện đột phá true CÙNG lượt, thêm 2026-08-08, cụm A7, tìm thấy bởi
`systems-designer`): GIVEN character ở Chờ Đột Phá (`level=20,EXP=290`),
`death_and_consequence_blocked=true` VÀ `breakthrough_requirement_met(2)=true`
CÙNG lượt, WHEN xử lý lượt (`try_execute_breakthrough` chạy trước
`resolve_turn_exp`, D.7), THEN đột phá KHÔNG xảy ra (`level/tier/EXP/state`
không đổi); WHEN `death_and_consequence_blocked` chuyển `false` ở 1 lượt
sau đó VÀ `breakthrough_requirement_met(2)` vẫn `true`, THEN đột phá thực
thi ở ĐÚNG lượt đó (không cần thêm bước nào khác).

**AC-37** (EC-6 — tier_diff=0 giữa 2 bên tier=1, biên SÀN THẬT — **viết
lại 2026-08-08**, cụm B2/A12: bản gốc mô tả nhầm biên này là "tier=0",
KHÔNG reachable với `level≥1` hợp lệ theo Rule 1 + registry
`tier_from_level`, tìm thấy bởi `systems-designer`): GIVEN self tier=1,
opponent tier=1 (2 nhân vật MỚI TẠO, level=1, chưa từng đột phá lần nào —
biên SÀN thật, không phải giả lập), WHEN tính `combat_win_exp`, THEN
`multiplier=clamp(1+0,0.30,3.0)=1` — hoạt động bình thường, KHÔNG throw
lỗi/trả sentinel "N/A" (khác với `combat_power_estimate` của
combat-system.md, nơi Lực chiến=0 LÀ trạng thái reachable).

**AC-38** (EC-7 — không có Tâm Pháp, default hoạt động bình thường): GIVEN
character chưa từng gán Tâm Pháp (`tam_phap_id=null`), WHEN tính
`exp_multiplier` VÀ `SONG_TU_ACTIVE`, THEN `exp_multiplier=1.0` (mặc định)
VÀ `SONG_TU_ACTIVE=0` vô điều kiện — toàn bộ `resolve_turn_exp` vẫn chạy
được không lỗi, không cần null-check đặc biệt nào trong test.

**AC-39** (Rule #11 mới — `resolve_turn_exp` self-relative, không phụ
thuộc `player_id`, thêm 2026-08-08, cụm A13, tìm thấy bởi `qa-lead`,
escalate bởi `creative-director` thành Required): GIVEN `self` = một NPC
(KHÔNG phải `player_id`), `locked_result.outcome={winner_id: self,
loser_id: player_id}` (NPC vừa thắng người chơi — `combat-system.md` gắn
`type="lose"` cho outcome này vì field đó tương đối theo `player_id`,
KHÔNG theo `self`), WHEN `resolve_turn_exp(self=NPC, turn)` chạy, THEN
`raw_combat = combat_win_exp(self, player_id)` — hệ thống PHẢI nhận diện
đúng `self` vừa THẮNG dựa trên `winner_id==self`, KHÔNG bị đánh lừa bởi
`outcome.type="lose"` (chỉ đúng theo góc nhìn `player_id`). *(Ghi chú mở
rộng 2026-08-08, `/design-review` vòng 2, cụm A2-5: self-relative scoping
ở đây áp dụng cho CẢ 4 nguồn EXP của Rule #2, không chỉ nhánh combat — xem
AC-46 cho test tương tự ở nguồn Song Tu.)*

**AC-46** (D.4 — Song Tu self-relative, `self`=NPC, thêm 2026-08-08,
`/design-review` vòng 2, cụm A2-5): GIVEN `self`=NPC_X, NPC_X có Tâm Pháp
`type=song-tu` VÀ NPC_X nằm trong tập Song Tu active của player (đọc từ
`npc-affinity-relationship.md` Tầng 2 State Machine — CÙNG 1 flag dùng khi
`self`=player), WHEN tính `SONG_TU_ACTIVE(NPC_X)`, THEN = `1` — đối xứng
với AC-05 (vốn chỉ test `self`=player), xác nhận `song_tu_exp_bonus` hoạt
động đúng khi `resolve_turn_exp` chạy cho NPC (Core Rule #11).

**AC-40** (ADVISORY — Player Fantasy validation, thêm 2026-08-08, cụm A8,
tìm thấy bởi `game-designer`; **viết lại 2026-08-08, `/design-review` vòng
2, cụm B2-2, tìm thấy bởi `qa-lead`** — bản gốc mượn nhầm instrument của
`game-concept.md` Core Hypothesis, vốn chỉ có 1 câu hỏi hẹp về AI-thiên
vị, không đo cảm giác Chờ Đột Phá): playtest thật (KHÔNG tự động hóa) ghi
nhận qua 1 câu hỏi khảo sát MỚI, cụ thể, hỏi RIÊNG cho khoảnh khắc Chờ Đột
Phá — VD: "Khi ở trạng thái Chờ Đột Phá, cảm giác của bạn gần với 'hồi
hộp/mong chờ' hay 'bối rối/bế tắc' hơn?" — ghi nhận PASS nếu đa số phản
hồi nghiêng về "hồi hộp/mong chờ". Gate **ADVISORY**, không BLOCKING —
theo `coding-standards.md` Test Evidence bảng phân loại Visual/Feel; không
chặn implementation nhưng PHẢI được chạy trước khi hệ này coi là hoàn
thiện cho Vertical Slice, cùng lúc với hook Core Rule #12 (cụm A2-6).

**AC-41** (EC-8 — data cấu hình thiếu hằng số, fail loud, thêm 2026-08-08,
cụm A9, tìm thấy bởi `qa-lead` + `systems-designer`): GIVEN data file
thiếu 1 trong 26 hằng số bắt buộc (24 `LEVEL_GROWTH_X`/`BREAKTHROUGH_BONUS_X`
+ `BASE_EXP_THRESHOLD`/`EXP_THRESHOLD_INCREMENT`), WHEN hệ thống load data
lúc khởi động, THEN phải trả về lỗi cấu hình tường minh (error code, KHÔNG
phải mặc định `0` âm thầm) TRƯỚC khi cho phép bắt đầu phiên chơi — test
xác nhận hành vi fail-loud, không xác nhận giá trị cụ thể nào.

**AC-42** (EC-8b — `BASE_EXP_THRESHOLD≤0` guard, thêm 2026-08-08, cụm B1,
tìm thấy bởi `systems-designer`): GIVEN `BASE_EXP_THRESHOLD=0` (hoặc âm)
được inject giả lập, WHEN `apply_exp_gain` (D.7) chạy `ASSERT` đầu hàm,
THEN hệ thống trả lỗi cấu hình tường minh NGAY LẬP TỨC, KHÔNG cascade qua
BẤT KỲ vòng lặp lên cấp nào — test xác nhận vòng lặp `WHILE` chạy `0` lần
trước khi lỗi được raise (regression test chống cascade vô hạn/rất dài).

**AC-45** (EC-9 — joint invariant
`WIN_EXP_BASE_FRACTION×WIN_EXP_FLOOR_MULT≥LOSS_EXP_RATE` validation, thêm
2026-08-08, `/design-review` vòng 2, cụm A2-4, tìm thấy bởi
`economy-designer`; nhãn EC đánh số lại 2026-08-08 verify hẹp sau vòng 2,
cụm qa-lead — trước đây chỉ ghi "EC" không số, phá vỡ pattern EC-1..EC-8b):
GIVEN data file cấu hình có
`WIN_EXP_BASE_FRACTION=0.10, WIN_EXP_FLOOR_MULT=0.30, LOSS_EXP_RATE=0.04`
(combo hợp lệ theo 2 Safe Range ĐỘC LẬP công bố nhưng VI PHẠM invariant
chung: `0.10×0.30=0.03<0.04`), WHEN hệ thống load data lúc khởi động, THEN
phải trả về lỗi cấu hình tường minh `EXP_ERROR_WIN_LOSS_INVARIANT_VIOLATED`
(verify bằng equality) TRƯỚC khi cho phép bắt đầu phiên chơi — KHÔNG được
để lọt tới runtime; test cũng xác nhận combo default hiện hành
(`0.20×0.30=0.06≥0.04`) PASS validation này.

**AC-47** (EC-10 — `EXP_THRESHOLD_INCREMENT<0` guard, thêm 2026-08-08,
`/design-review` vòng 2, cụm B2-3, tìm thấy bởi `qa-lead`; nhãn EC đánh số
lại 2026-08-08 verify hẹp sau vòng 2, cùng lý do AC-45): GIVEN data
file cấu hình có `EXP_THRESHOLD_INCREMENT=-5` (vi phạm Range `≥0` đã khai
ở D.1), WHEN hệ thống load data lúc khởi động, THEN phải trả về lỗi cấu
hình tường minh (fail loud) TRƯỚC khi cho phép bắt đầu phiên chơi — cùng
pattern AC-41 (thiếu hằng số, phát hiện được ở data-load time) chứ KHÔNG
phải AC-42 (guard runtime `ASSERT` trong `apply_exp_gain`), vì giá trị âm
vi phạm Range khai báo là phát hiện được NGAY ở data-load time, không cần
đợi tới lúc gọi hàm mới phát hiện; test xác nhận hành vi fail-loud, không
xác nhận error code cụ thể (xem Error Taxonomy note ở đầu section AC).

**AC-48** (EC-11 — Invariant kinh tế D.1 validation, thêm 2026-08-08,
verify hẹp sau vòng 2, tìm thấy bởi `qa-lead` + `economy-designer` — đóng
gap "invariant mới ở D.1 không có AC/guard nào", cùng lớp lỗi mà AC-45 vừa
đóng cho invariant D.2/D.3): GIVEN data file cấu hình có
`WIN_EXP_BASE_FRACTION=0.20, PASSIVE_EXP_RATE=0.001,
SONG_TU_EXP_RATE=0.0015` (default hiện hành) VÀ `CONTENT_EXCHANGE_ESTIMATE`
(từ `combat-system.md`, đọc CHÉO hệ) LẦN LƯỢT ở 2 biên Safe Range **15**
VÀ **50** (không chỉ giá trị mặc định 30), WHEN hệ thống load data lúc
khởi động, THEN validate
`WIN_EXP_BASE_FRACTION/CONTENT_EXCHANGE_ESTIMATE ≥ 1.5*(PASSIVE_EXP_RATE+SONG_TU_EXP_RATE)`
(hệ số an toàn 1.5× đã dùng khi re-derive, không chỉ ≥1) — PASS ở CẢ 2
biên (`0.20/15=0.01333≥0.00375` và `0.20/50=0.004≥0.00375`); WHEN
`CONTENT_EXCHANGE_ESTIMATE` bị cấu hình NGOÀI Safe Range đã công bố (VD
`60`) khiến vế trái nhỏ hơn vế phải, THEN hệ thống PHẢI trả lỗi cấu hình
tường minh (error code gợi ý `EXP_ERROR_ECONOMY_INVARIANT_MARGIN_VIOLATED`)
TRƯỚC khi cho phép bắt đầu phiên chơi — test KHÔNG chỉ verify ở default
`CONTENT_EXCHANGE_ESTIMATE=30` như bản D.1 gốc, mà quét toàn Safe Range đã
công bố của hằng số phụ thuộc (cùng bài học rút ra từ A2-4/AC-45).

*(Ghi chú: `qa-lead` ban đầu phát hiện mâu thuẫn thật giữa pseudocode D.6 và
Edge Cases prose về `is_death_turn` — đã giải quyết TRƯỚC khi ghi section
này bằng quyết định "short-circuit toàn cục" (cùng dạng
`death_and_consequence_blocked`), áp dụng ngược lại vào D.6/Core Rule #2.
AC-35 phản ánh quyết định đã chốt, không phải mô tả gap. Cập nhật
2026-08-08 vòng 1: 7 AC mới (AC-21b, AC-31b, AC-36b, AC-39, AC-40
[ADVISORY], AC-41, AC-42) bổ sung sau `/design-review` vòng 1 — tổng 46 AC
(45 BLOCKING + 1 ADVISORY). Cập nhật 2026-08-08 vòng 2: thêm 5 AC mới
(AC-43, AC-44 [cụm A2-2 — gate `try_execute_breakthrough`], AC-45 [cụm
A2-4 — joint invariant validation], AC-46 [cụm A2-5 — Song Tu
self-relative], AC-47 [cụm B2-3 — `EXP_THRESHOLD_INCREMENT<0` guard]) —
tổng 51 AC (50 BLOCKING + 1 ADVISORY). **Cập nhật 2026-08-08, verify hẹp
sau vòng 2**: thêm **AC-48** (Invariant kinh tế D.1 validation trên toàn
Safe Range `CONTENT_EXCHANGE_ESTIMATE`, đóng gap tìm thấy bởi
`qa-lead`/`economy-designer` — invariant D.1 trước đó không có AC/guard
nào, cùng lớp lỗi AC-45 vừa đóng cho D.2/D.3); nhãn EC của AC-45/AC-47
được đánh số lại thành EC-9/EC-10 (trước đó chỉ ghi "EC" không số, phá vỡ
pattern); `SONG_TU_EXP_RATE` hạ thêm 1 lần nữa (`0.002→0.0015`) vì `0.002`
không đủ margin ≥1.5× ở đầu trên Safe Range `CONTENT_EXCHANGE_ESTIMATE`
(xem D.1) — mọi ví dụ/AC dùng Song Tu đã cập nhật theo giá trị mới nhất
này. **Cập nhật 2026-08-10, `/design-review character-continuation.md`
round 2**: thêm **AC-49** (lazy-init theo `char_id`, đóng Open Question
BLOCKING của `character-continuation.md` D.1). **Tổng hiện hành: 53 AC
(52 BLOCKING + 1 ADVISORY)**, xem
`design/gdd/reviews/exp-realm-progression-review-log.md` cho danh sách
đầy đủ blocker→fix.)*

**AC-49** (Character Continuation — lazy-init theo `char_id`, đóng Open
Question BLOCKING của `character-continuation.md` D.1; thêm 2026-08-10,
`/design-review character-continuation.md` round 2, narrow verify pass —
Lớp A: `char_id` LUÔN MỚI mỗi playthrough, xác nhận qua
`death-and-consequence.md` AC-13/AC-36; kỹ thuật "dirty old slot first"):
GIVEN 1 `char_id` CŨ đã bị "làm bẩn" (mock trả `level=30, EXP=450` khi
truy vấn `char_id` đó — mô phỏng nhân vật chính vừa chết ở playthrough
trước), WHEN Character Continuation phát `char_id` MỚI (mock, chưa từng
xuất hiện) và `reset_completeness_check` (D.1, `character-continuation.md`)
đọc `level(char_id_mới)`/`EXP(char_id_mới)` lần đầu (KHÔNG gọi bất kỳ
hàm reset tường minh nào), THEN hệ này trả về ĐÚNG giá trị khởi điểm mẫu
chuẩn MVP (`level=1, EXP=0`) — KHÔNG PHẢI giá trị đã đọc từ `char_id` CŨ
ở trên (chứng minh state lưu dạng keyed-by-`char_id`, không phải 1 biến
toàn cục `current_level`/`current_EXP` dùng chung mọi nhân vật). GIVEN
cùng fixture, WHEN đọc lại `level(char_id CŨ)` sau đó, THEN VẪN trả
`level=30` — 2 `char_id` độc lập, không ghi đè chéo. *(unit,
provisional-interface — post-condition có phân biệt tham số theo
`char_id`, không spy call-count)*

## Open Questions

- ~~**Interface cụ thể "quan hệ Song Tu active" từ NPC Affinity &
  Relationship** (boolean đơn giản, hay cần NPC ID cụ thể để hỗ trợ
  multi-NPC Song Tu sau này?) chưa được định nghĩa — chỉ mới giả định 1
  boolean `SONG_TU_ACTIVE`.~~ — **đã giải quyết, đặc tả lại 2026-08-08**
  (`npc-affinity-relationship.md` `/design-review` vòng 1 cụm A4 — đóng
  lệch nghĩa: bản trước đọc như thể NPC Affinity định nghĩa đầy đủ
  `SONG_TU_ACTIVE`, bỏ sót vế Tâm Pháp của chính D.4 formula bên trên):
  `npc-affinity-relationship.md` Core Rule #7 xuất
  `song_tu_relationship_active_npc_ids` (DANH SÁCH NPC ID, hỗ trợ đa NPC
  đồng thời) — hệ đó KHÔNG sở hữu và không định nghĩa tên
  `SONG_TU_ACTIVE`. Hệ NÀY (EXP) tiếp tục là chủ sở hữu DUY NHẤT của tên
  `SONG_TU_ACTIVE`, tính bằng phép AND với `song_tu_relationship_active_npc_ids ≠ ∅`
  đúng như D.4 formula phía trên đã viết từ đầu (không đổi); bonus KHÔNG
  cộng dồn theo số NPC (registry `song_tu_active`). *(Đóng tại
  `/design-system npc-affinity-relationship` 2026-08-03, đặc tả lại
  `/design-review npc-affinity-relationship` 2026-08-08)*
- **Cơ chế cụ thể của "phế đan điền/võ công" và điều kiện khôi phục** (đại
  cơ duyên, tiên thảo dị bảo...) — hệ này chỉ đọc 1 cờ boolean
  `death_and_consequence_blocked`, toàn bộ trigger/khôi phục do Death &
  Consequence sở hữu. *(Owner: game-designer, target: `/design-system
  death-and-consequence`)*
- **Dữ liệu `breakthrough_requirement` cụ thể theo từng bối cảnh** (VD: Hồn
  Hoàn ở Đấu La Đại Lục) và cơ chế tiêu thụ/hoàn trả tài nguyên đó khi
  Undo — hệ này chỉ định nghĩa cơ chế kiểm tra boolean, không sở hữu nội
  dung hay việc rollback tài nguyên ngoài (đã flag rõ ở AC-34). **Cập
  nhật 2026-08-03**: CƠ CHẾ đã chốt tại `setting-canon-integration.md`
  (registry `breakthrough_requirement_met` — predicate data thuần theo
  setting pack, thiếu data → false cứng + warning content-gap); phần còn
  mở chỉ là DATA authoring cụ thể cho từng tier (Open Question của GDD
  đó, target trước vertical slice). **Cập nhật 2026-08-08 (`/design-review`
  vòng 2, cụm A2-1, Option C)**: hệ này nay đặt thêm 1 ràng buộc bắt buộc
  cho DATA authoring đó (Core Rule #6 mở rộng) — nguồn thỏa
  `breakthrough_requirement_met` CHỈ được đến từ hành động/kết quả
  **combat**; `setting-canon-integration.md`/`narrative-director`/
  `world-builder` khi authoring content cụ thể (VD Hồn Hoàn) PHẢI đảm bảo
  mọi cách "kiếm" tài nguyên đó gắn với 1 trận combat đã kết thúc, không
  phải hành động tu luyện thụ động/Song Tu/phi-combat khác. *(Owner còn
  lại: narrative-director + world-builder — authoring content)*
- **Đối chiếu lại `w_HP=0.25` (và các `w_*` khác) của `combat_power_estimate`**
  (combat-system.md D.13) với scale thật của D.5 (VD HP~100-400 ở level
  1-25 theo default hiện tại) — D.5 chỉ định nghĩa hình dạng/scale, việc
  sửa trọng số `w_*` thuộc quyền sở hữu combat-system.md. *(Owner:
  systems-designer, target: lần `/consistency-check` hoặc `/design-review`
  kế tiếp chạm tới combat-system.md)*
- **Bộ hệ số đầy đủ `LEVEL_GROWTH_X`/`BREAKTHROUGH_BONUS_X` cho toàn bộ 12
  chỉ số** — GDD mới hand-tune ví dụ HP/ATK/Crit Rate, 9 chỉ số còn lại
  (DEF, SPD, ACC, Né tránh, Crit Damage, Amp, Mitigation, Lifesteal, HP
  Regen) cần 1 pass cân bằng số liệu riêng trước khi implement. *(Owner:
  economy-designer/systems-designer, target: trước `/create-architecture`
  hoặc đầu Production)*
- **Owner cụ thể cho rollback tài nguyên ngoài khi Undo lượt đột phá** (VD
  Hồn Hoàn) — thêm 2026-08-08, `/design-review` vòng 1, cụm A15 (đã flag
  từ trước ở AC-34, nay xác nhận đây là gap treo ở CẢ 3 hệ: GDD này,
  `setting-canon-integration.md`, `equipment-skill-data-system.md`, không
  hệ nào nhận sở hữu). Đề xuất **Equipment & Skill Data System** làm owner
  (đã có Open Question sẵn về "single-use hay có charge" cho item nói
  chung — rollback là mở rộng tự nhiên). **Cập nhật 2026-08-08
  (`/design-review` vòng 2, cụm A2-1, Option C)**: gap owner vẫn CHƯA đóng
  (đề xuất Equipment & Skill Data System giữ nguyên), nhưng phạm vi đã thu
  hẹp một phần — vì Core Rule #6 nay xác nhận Hồn Hoàn (hay tương đương)
  LÀ tài nguyên gắn với combat (chỉ sinh ra qua kết quả combat), owner
  tương lai chỉ cần model rollback cho 1 LOẠI nguồn sinh (combat outcome),
  không cần lo case tài nguyên đó phát sinh từ tu luyện thụ động/Song Tu.
  *(Owner: game-designer + systems-designer, target: lần `/design-review`
  hoặc `/design-system` tiếp theo chạm tới `equipment-skill-data-system.md`)*
- **Tín hiệu/gợi ý tường thuật cho trạng thái Chờ Đột Phá** — thêm
  2026-08-08, cụm A5 (Most Important Finding #2, `creative-director`).
  Interface hook đã định nghĩa ở Edge Cases (không lộ đáp án chính xác của
  `breakthrough_requirement_met`, chỉ giảm cảm giác bế tắc) — CHƯA có
  hiện thực ở phía cung cấp. **Cập nhật 2026-08-08 (`/design-review` vòng
  2, cụm A2-6)**: yêu cầu TỒN TẠI tín hiệu (không phải nội dung cụ thể) nay
  là Core Rule #12 bắt buộc, không còn tùy chọn — target đổi từ "trước
  Vertical Slice" thành **Required cho MVP, cùng lúc dev-seed level 9**
  (`game-concept.md` Required for MVP #1, cụm A2-3). Nội dung tín hiệu cụ
  thể (câu chữ, hình ảnh...) vẫn mở, không tự thiết kế ở đây. *(Owner:
  narrative-director/`setting-canon-integration.md` cho nội dung gợi ý,
  `ux-designer`/`character-card-identity.md` cho hiển thị; target:
  Required cho MVP, cùng lúc AC-40 ADVISORY playtest)*
- **Xác nhận `combat-system.md` D.1 đã sửa `tier(C)` Range khớp `1–∞`**
  (cụm A12) — sửa trong cùng đợt changeset 2026-08-08 của review này, ghi
  lại đây để `/consistency-check` lần sau xác nhận không bị revert. *(Owner:
  không ai — chỉ cần xác nhận đã đóng, không phải Open Question thật)*
- **Farm đối thủ yếu (`tier_diff≤-3`) vẫn vượt trội hơn đấu công bằng theo
  lượt** — ghi nhận 2026-08-08, verify hẹp sau vòng 2, tìm thấy bởi
  `economy-designer` (xem ghi chú chi tiết ở Tuning Knobs, hàng
  `WIN_EXP_FLOOR_MULT`). Breakeven: farm lời hơn công bằng nếu trận yếu
  hơn kết thúc trong ≤ `WIN_EXP_FLOOR_MULT × N_fair` pha — độc lập với
  đợt re-derive `WIN_EXP_BASE_FRACTION` (0.15→0.20) vừa làm ở A2-1, vì
  knob đó triệt tiêu khỏi phép so sánh. Đây là RỦI RO ĐÃ BIẾT, CHỦ Ý CHƯA
  THIẾT KẾ CƠ CHẾ CHẶN ở lần sửa này — quyết định của người dùng khi được
  hỏi là ghi nhận làm tracked risk thay vì mở 1 vòng redesign D.2 mới (đòi
  hỏi phân biệt "độ khó thật của trận" khỏi "độ dài trận", ngoài phạm vi 1
  lần verify hẹp). Rủi ro CHƯA blocking cho MVP (dự án solo, quy mô nhỏ,
  người chơi chưa chắc phát hiện/khai thác chiến lược này ở playtest ngắn)
  nhưng PHẢI xem lại ở pass cân bằng D.5 đã có sẵn (xem Open Question ngay
  trên) trước Production — có thể cần cơ chế mới kiểu "EXP theo trận tối
  thiểu bất kể độ dài" hoặc ràng buộc `tier_diff` tối thiểu để combat được
  tính là "đối thủ hợp lệ" cho mục đích EXP. *(Owner: economy-designer,
  target: cùng lúc pass cân bằng D.5 trước Production)*
- **`apply_exp_gain` (D.7) an toàn trước `turn.in_combat` nhờ data-flow,
  không nhờ gate tường minh** — ghi nhận 2026-08-08, verify hẹp sau vòng
  2, tìm thấy bởi `economy-designer`. Hàm này không nhận `turn` làm tham
  số và không tự kiểm tra `turn.in_combat`; nó an toàn CHỈ VÌ có đúng 1
  call site (`resolve_turn_exp`, D.6) và call site đó luôn truyền
  `final_gain=0` cho mọi lượt `in_combat=true` chưa kết trận. Nếu tương
  lai implementation thêm 1 call site khác gọi thẳng `apply_exp_gain`
  (bỏ qua `resolve_turn_exp`), bảo vệ này biến mất mà không có assertion
  nào bắt lỗi. KHÔNG coi là bug ở tầng thiết kế (đã trace đúng, xem verify
  hẹp) — chỉ là 1 ghi chú implementation-hygiene: khi hiện thực hóa,
  `apply_exp_gain` nên có 1 dòng comment/invariant-note nhắc rằng nó CHỈ
  được gọi qua `resolve_turn_exp`, hoặc lead-programmer cân nhắc 1
  assertion runtime nếu ngôn ngữ hiện thực hỗ trợ kiểm tra call-site rẻ.
  *(Owner: lead-programmer/godot-gdscript-specialist, target: lúc
  `/dev-story` implement hệ này)*
