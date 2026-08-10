# Combat System

> **Status**: Designed — chờ implementation (chu trình `/design-review` văn bản đã kết thúc sau vòng 4; xem `docs/architecture/adr-0001-combat-spec-authority.md`)
> **Author**: user + agents
> **Last Updated**: 2026-08-07
> **Implements Pillar**: Pillar 3 (Sức Mạnh Có Logic), Pillar 4 (Tường Thuật Sống Động)
> **Creative Director Review (CD-GDD-ALIGN)**: Full mode `/design-review` 2026-08-06 (vòng 3, 7 specialist) → vòng 4 hẹp (3 specialist, 2026-08-06/07) KHÔNG đạt tiêu chí thoát → leo thang `technical-director` → **ADR-0001**: `src/gameplay/combat/*.gd` (GDScript + GUT) là nguồn sự thật cho cơ học Combat kể từ đây; Section D của GDD này hạ xuống vai trò MÔ TẢ cho chi tiết cơ học (chữ ký/kiểu/thứ tự thực thi/ngữ nghĩa chia), vẫn NORMATIVE cho ý định thiết kế/tuning knob/hợp đồng liên hệ hệ. Xem `design/gdd/reviews/combat-system-review-log.md` cho lịch sử đầy đủ 4 vòng + quyết định leo thang.

## Overview

Combat System vừa là tầng tính toán (Lực chiến, thắng/thua, hệ quả
HP/trang bị/thức đã dùng) vừa là nơi người chơi cảm nhận rõ nhất công
thức của game: mỗi khi một hành động dẫn đến giao chiến, hệ thống này so
sánh Lực chiến hai bên (Chỉ số + Kỹ năng + Trang bị, có phạt vượt bậc và
áp chế cảnh giới), khóa kết quả trước khi AI được phép tường thuật, rồi
trả tín hiệu kết quả trận (thắng/thua, mức chênh lệch, thức đã dùng) cho
các hệ khác (EXP & Realm Progression, Death & Consequence) tự xử lý hệ
quả riêng của họ — Combat System không tự tính EXP hay hậu quả cái chết.
Với người chơi, đây là nơi Pillar 3 (Sức Mạnh Có Logic) trở thành thứ họ
TRẢI NGHIỆM trực tiếp: không có hào quang nhân vật chính, chỉ số/kỹ
năng/trang bị chuẩn bị trước quyết định thắng thua, và văn tường thuật
gọi đúng tên thức vừa dùng (Pillar 4) khiến mỗi trận đấu có bản sắc riêng
dù công thức tính giống hệt. Không có hệ thống này, "chiến đấu theo lượt
tường thuật bằng văn bản" (Core Identity, `game-concept.md`) chỉ còn là
tường thuật tự do không rủi ro thật — phá vỡ chính premise cốt lõi của
game.

## Player Fantasy

*(`creative-director` không được tham vấn — Lean mode, không phải section
rủi ro cao theo quy tắc skill. Sections D và H mới bắt buộc spawn.)*

Người chơi cảm nhận Combat System trực tiếp nhưng KHÔNG qua thao tác thời
gian thực — agency nằm ở khâu CHUẨN BỊ và CAM KẾT (chọn trang bị/kỹ năng
phù hợp trước khi giao đấu, quyết định có đánh hay tránh, có tìm cách
thay đổi điều kiện trận đấu trước không), đúng nguyên tắc Khế Ước Cơ
Học/Tường Thuật của `game-concept.md`: một khi đã giao chiến, công thức
Lực chiến quyết định, AI chỉ tường thuật trung thực — không phải phản xạ
tay hay chọn chiêu theo thời gian thực (Anti-Pillar cấm rõ "chiến đấu
real-time/hoạt ảnh phức tạp"). Cảm giác đúng là MASTERY qua chuẩn bị: một
nhân vật được trang bị/luyện tập đúng bậc thắng vì đã chuẩn bị kỹ, không
phải vì may mắn hay hào quang nhân vật chính. Đọc đoạn văn tường thuật
một trận đấu — nhịp giao đấu xen kẽ chiêu thức, không dồn chiêu liên tục
(đã kiểm chứng qua prototype) — là khoảnh khắc người chơi THẤY thành quả
chuẩn bị của mình biến thành hành động cụ thể, gọi đúng tên thức, đúng
phong cách vũ khí.

Rủi ro thật là một phần cốt lõi của cảm giác: một trận thua có thể dẫn
tới hậu quả nặng (trọng thương, phế đan điền) hoặc tệ nhất là cái chết
thật (ngưỡng Hảo cảm thù địch sâu sắc) — không có "thử lại vô hạn", đúng
Pillar 2 (Hệ Quả Thực Sự). Áp chế cảnh giới tạo áp lực chiến lược thật:
vượt bậc quá xa mà chưa chuẩn bị đủ có thể quyết định thua ngay cả khi
thực lực gần bằng nhau — người chơi học cách tôn trọng con số, không
đánh liều mù quáng.

## Detailed Design

*(Lean mode: Section C không bắt buộc spawn specialist — chỉ D và H. Đã
thu thập đủ quyết định kiến trúc qua 3 vòng câu hỏi trước khi draft. Hệ
số/công thức chính xác của các phép so sánh chỉ số được ĐẶT TÊN ở đây
nhưng định nghĩa đầy đủ ở Section D với `systems-designer`.)*

### Core Rules

1. **1 trận đấu = một chuỗi nhiều lượt Turn Manager liên tiếp**: khi 1
   hành động kích hoạt giao chiến, nhân vật chuyển sang trạng thái
   `in_combat=true`, duy trì xuyên suốt nhiều lượt Turn Manager cho đến
   khi trận kết thúc (Core Rule #8). Mỗi lượt Turn Manager trong lúc
   `in_combat=true` = đúng 1 **pha giao đấu** (exchange), đánh số bằng
   `exchange_id` — bộ đếm nguyên bắt đầu từ 1, tăng dần theo TỪNG TRẬN
   (KHÔNG xuyên suốt phiên chơi), reset về 1 khi 1 trận mới bắt đầu.
   `exchange_id` làm đơn vị đếm cho trần an toàn KỸ THUẬT
   `TECHNICAL_EXCHANGE_CAP` (D.9c) và cho ngưỡng kích hoạt kiệt sức lũy
   tiến `EXHAUSTION_ONSET_EXCHANGE` (D.4b, mới 2026-08-06) — KHÔNG còn
   liên quan tới D.12; D.12 giờ dùng `CONTENT_EXCHANGE_ESTIMATE`, một
   hằng số THIẾT KẾ tách biệt hoàn toàn khỏi bộ đếm runtime này (sửa
   2026-08-03, xem Open Questions). **`exchange_id` KHÔNG còn được dùng
   làm seed cho `coin_flip` (sửa 2026-08-06)** — `coin_flip()` giờ dùng
   trực tiếp `roll_uniform` injected, cùng cơ chế với mọi formula RNG
   khác trong hệ này, để tránh thiên vị hệ thống lặp lại giữa các trận
   khác nhau (đóng gap `/design-review`, xem Open Questions).

2. **Mỗi pha giao đấu: cả hai bên ra đòn theo thứ tự SPD, có thể ngắt sớm**:
   người chơi chọn hành động (dùng 1 thức từ `known_skill_ids` chưa dùng
   trong trận, phòng thủ — Core Rule #2b, hoặc bỏ chạy — Core Rule #9;
   **"Dùng vật phẩm chiến đấu" đã CẮT khỏi phạm vi MVP, xem Core Rule
   #6 sửa 2026-08-06 vòng 2**); đối thủ (NPC) cũng chọn 1 hành động theo
   LOGIC HỆ THỐNG, KHÔNG phải AI/LLM tự quyết định, đúng Contract
   Enforcement, qua ĐÚNG 2 TẦNG quyết định sau (bổ sung 2026-08-06 vòng
   1, đóng gap `/design-review` "NPC có bao giờ phòng thủ/bỏ chạy
   không" — **NPC KHÔNG BAO GIỜ chọn "Phòng thủ"; đây là ranh giới
   phạm vi CÓ CHỦ ĐÍCH, giữ NPC đơn giản, không phải gap**):

   a. **Tầng 1 — kiểm tra sinh tồn**: nếu `hp_pct(NPC) < NPC_FLEE_HP_THRESHOLD`
      (knob, xem Tuning Knobs) **VÀ `is_spar_friendly=false`** (sửa
      2026-08-06 vòng 3 `/design-review`, đóng gap hội tụ độc lập
      [ai-programmer] — Tầng 1 trước đây kích hoạt cả trong trận giao
      hữu, có thể kết thúc trận bằng khung tường thuật "bỏ chạy" TRƯỚC
      khi cơ chế hòa D.9b (chỉ kiểm tại HP=0) có cơ hội chạy, phá vỡ
      đúng mục đích trận giao hữu cân sức), NPC chọn "Bỏ chạy" (Core Rule
      #9) thay vì tấn công — tái dùng nguyên vẹn D.11, không có formula
      riêng. Trong trận `is_spar_friendly=true`, Tầng 1 KHÔNG BAO GIỜ
      kích hoạt — NPC luôn đi thẳng vào Tầng 2, để D.9b là đường thoát
      "graceful" DUY NHẤT cho giao hữu. Ngoài trận giao hữu, đây là biểu
      hiện tối thiểu của "NPC là nhân vật chính của chính họ"
      (`game-concept.md`) — đối xứng với người chơi (AC-36).
   b. **Tầng 2 — chọn thức**: nếu Tầng 1 không kích hoạt, NPC chọn 1 thức
      trong số thức CHƯA dùng trong trận (đúng luật không-lặp-thức) qua
      công thức D.14 (mới 2026-08-06, tách khỏi Core Rule #2 để có bảng
      ký hiệu + ví dụ biên đầy đủ như mọi formula khác); nếu KHÔNG còn
      thức nào khả dụng, NPC dùng "Đánh thường" (đúng Edge Case đã định
      nghĩa ở `equipment-skill-data-system.md`).

   RNG dùng chung `roll_uniform` injected như mọi formula khác của hệ
   này (deterministic khi test, KHÔNG tự seed theo `exchange_id` — sửa
   2026-08-06, xem D.2/D.9c). `SPD` của hai bên quyết định ai ra đòn
   TRƯỚC trong pha.
   **Nếu đòn đi trước làm HP bên kia về 0, đòn đi sau trong CÙNG pha đó
   KHÔNG được thực thi** — trận kết thúc ngay tại đó, pha coi như đã giải
   quyết xong (không phải pha "dở dang"). Chỉ khi đòn đi trước KHÔNG hạ
   HP đối phương về 0, đòn đi sau mới thực thi bình thường.

2b. **"Phòng thủ" — tác dụng cơ học** (SỬA LẠI 2026-08-06 vòng 2
   `/design-review` — bản vòng 1 nhân hệ số lên `effective_DEF`/
   `effective_Né` bị xác nhận là "false choice": sàn chip
   `MIN_RAW_RATIO` (D.4) làm tăng DEF gần như vô nghĩa đúng lúc bị áp
   đảo nhất — chính lúc người chơi cần Phòng thủ nhất — và +Né chỉ dịch
   `P_hit` vài điểm % (K_HIT thoải) trong khi từ bỏ TOÀN BỘ sát thương
   gây ra pha đó, ước tính giao dịch bất lợi ~13:1 ở mọi trạng thái trận
   đấu có ý nghĩa; đồng thời hoàn toàn vô hình với người chơi trước khi
   commit hành động (không affordance định tính nào). Fix vòng 2: giảm
   trừ sát thương TẤT ĐỊNH, tích hợp thẳng vào D.6 — hiệu quả không phụ
   thuộc build ATK/DEF của 2 bên (không bị chip-floor D.4 vô hiệu hóa),
   dễ đặt tên/affordance rõ ràng ("giảm X% sát thương nhận vào pha
   này"), và mạnh nhất đúng lúc HP nguy kịch cần nhất):
   khi hành động của C trong pha là "Phòng thủ", mọi `final_damage`
   (D.6) mà đối phương gây lên C TRONG PHA ĐÓ bị nhân thêm
   `defend_mult = 1 - DEFEND_DMG_REDUCTION_PCT` (knob, xem Tuning
   Knobs) — tích hợp trực tiếp vào công thức D.6 (xem D.6 đã sửa), ÁP
   DỤNG SAU `final_multiplier`/TRƯỚC `round()` cuối cùng. `heal` (D.7,
   lifesteal của bên tấn công) tính trên `final_damage` ĐÃ giảm — đúng
   nguyên văn Core Rule #3 "hồi máu theo % sát thương GÂY RA", tức sát
   thương thực đã xảy ra sau khi phòng thủ phát huy tác dụng, không
   phải sát thương giả định trước phòng thủ. C KHÔNG ra đòn tấn công ở
   pha đó (không có `raw_damage`/`final_damage` phía tấn công của C —
   Phòng thủ là hành động THUẦN PHÒNG NGỰ). Cả người chơi lẫn NPC đều
   có thể chọn hành động này — nhưng theo Core Rule #2, NPC không bao
   giờ tự chọn nó (chỉ người chơi mới chủ động dùng).

3. **Giải quyết pha giao đấu bằng mô phỏng cặp chỉ số đầy đủ**: mỗi đòn
   đánh trong pha tính qua chuỗi: `ACC` (người đánh) vs `Né tránh` (người
   đỡ) → trúng/hụt; nếu trúng: `ATK` vs `DEF` → sát thương cơ bản; `Crit
   Rate`/`Crit Damage` → có chí mạng hay không; `Khuếch đại sát thương`
   (người đánh) và `Chống chịu` (người đỡ) → nhân/giảm sát thương cuối;
   `Lifesteal` → hồi máu người đánh theo % sát thương gây ra. Đòn đi
   trước (theo SPD, Core Rule #2) giải quyết xong hoàn toàn (bao gồm cả
   kiểm tra HP=0) TRƯỚC KHI đòn đi sau bắt đầu tính — không tính đồng
   thời. `HP Regen` áp dụng thụ động vào cuối pha CHỈ KHI pha kết thúc mà
   không bên nào về 0 HP (trận còn tiếp tục) — không áp dụng nếu pha đã
   kết thúc trận (Core Rule #2 vừa ngắt sớm). Công thức chính xác từng
   bước — Section D.

4. **Áp chế cảnh giới & phạt vượt bậc áp dụng MỖI PHA, không phải 1 lần
   duy nhất đầu trận**: chênh lệch cảnh giới giữa 2 bên làm giảm chỉ số
   hiệu dụng (ATK/DEF/ACC...) của bên thấp cảnh giới hơn — áp dụng lại ở
   từng bước tính của Core Rule #3, không phải một hệ số tính 1 lần rồi
   khóa cứng cho cả trận (vì HP/trạng thái thay đổi từng pha nhưng tương
   quan cảnh giới không đổi trong 1 trận).

5. **Không lặp thức trong 1 trận — áp dụng CẢ HAI bên, xuyên suốt toàn bộ
   chuỗi lượt**: đúng Core Rule #3 của `equipment-skill-data-system.md`
   (ID thức duy nhất toàn cục), ràng buộc "không lặp" tính trên PHẠM VI
   TOÀN TRẬN (nhiều lượt), không phải từng lượt riêng lẻ. Hết thức khả
   dụng → dùng "Đánh thường" (basic attack, luôn khả dụng theo Edge Case
   của Equipment GDD) làm phương án dự phòng, không chặn hành động.

6. **Vật phẩm chiến đấu — CẮT KHỎI PHẠM VI MVP** (SỬA 2026-08-06 vòng 2
   `/design-review`, QĐ-2 — `ui-programmer` phát hiện `action_type=
   "item"` thiếu HOÀN TOÀN công thức resolution: không phải chỉ thiếu
   NỘI DUNG như Open Questions vòng 1 ghi nhận, mà thiếu cả CƠ CHẾ —
   không có D.x nào (như D.8 cho skill, Core Rule #2b cho defend, D.11
   cho flee) định nghĩa item resolve ra sao. `creative-director` đánh
   giá tính năng này không phục vụ pillar nào của `game-concept.md`,
   cắt rẻ hơn nhiều so với thiết kế 1 hệ resolution mới): hành động
   "Dùng vật phẩm chiến đấu" **KHÔNG có mặt trong MVP** — người chơi và
   NPC chỉ có 3 hành động khả dụng trong 1 trận: dùng thức (D.14/Core
   Rule #5), Phòng thủ (Core Rule #2b), Bỏ chạy (D.11/Core Rule #9).
   Field `combat_item_id` (optional) VẪN được giữ trong schema nhân vật
   — DÀNH SẴN cho mở rộng tương lai (Vertical Slice/Full Vision, khi đã
   có formula resolution riêng) — nhưng Combat System KHÔNG đọc/tiêu
   thụ field này ở MVP; `action_type` không còn giá trị `"item"` trong
   phạm vi MVP (xem schema Core Rule #11 đã cập nhật).

7. **Điểm Chỉ số (Core Mechanics #2, `game-concept.md`) = điểm tổng hợp
   cho mục đích khác, KHÔNG phải cơ chế thắng/thua trực tiếp**: thắng/thua
   của TOÀN TRẬN được xác định bởi HP về 0 (Core Rule #8), KHÔNG bởi 1
   phép so sánh "Lực chiến" tổng duy nhất. "Lực chiến" (Điểm Chỉ số +
   Điểm Kỹ năng + Điểm Trang bị) vẫn tồn tại như MỘT con số tổng hợp hiển
   thị trên Character Card và dùng để: (a) ước tính trước trận (người
   chơi cân nhắc có nên giao chiến), (b) làm biến đầu vào cho các hệ khác
   (EXP scaling theo chênh lệch, ngưỡng 20 cấp) — nhưng KHÔNG tự nó quyết
   định kết quả từng pha hay toàn trận. Đây là điểm làm rõ (và thu hẹp
   phạm vi nghĩa) so với cách `game-concept.md` mô tả ở tầng concept.
   **Ngoại lệ DUY NHẤT** (sửa 2026-08-03, xem Open Questions): Lực chiến
   pre-battle được dùng làm ĐIỀU KIỆN ĐỦ (eligibility gate, D.9b) để
   PHÂN LOẠI LẠI một kết quả win/lose ĐÃ ĐƯỢC D.9 xác định theo HP=0
   thành `no_outcome`, CHỈ khi trận là `spar_friendly`. Đây không phải
   "Lực chiến quyết định ai thắng" — HP=0 vẫn là điều kiện DUY NHẤT D.9
   dùng để xác định `nominal_winner`; Lực chiến chỉ quyết định kết quả
   đó có được HIỂN THỊ dưới nhãn hòa hay không, phạm vi hẹp trong giao
   hữu.

8. **Điều kiện kết thúc trận** (sửa 2026-08-03 — bỏ trần thiết kế
   `MAX_EXCHANGE_COUNT`, xem Open Questions): (a) HP của 1 bên chạm 0 →
   bên đó thua qua D.9, TRỪ KHI bị D.9b phân loại lại thành hòa (chỉ
   trong `spar_friendly`, xem dưới); (b) hành động "Bỏ chạy" thành công
   (Core Rule #9) → `no_outcome`; (c) tín hiệu KHẨN CẤP xen ngang từ hệ
   ngoài (`external_abort_signal`, Core Rule #13) được nhận đúng thời
   điểm Combat kiểm tra → `no_outcome` ngay lập tức; (d) trần an toàn KỸ
   THUẬT `TECHNICAL_EXCHANGE_CAP` bị chạm (D.9c) → nếu `is_spar_friendly`,
   `no_outcome`; NẾU KHÔNG, D.9c BẮT BUỘC ra `win`/`lose` qua tiebreak,
   không có `no_outcome` ở nhánh này. **Ngoài (a)-(d), và ngoài
   `spar_friendly`: HP về 0 luôn luôn ra 1 kết quả win/lose rõ ràng —
   không có "bế tắc kỹ thuật" nào tạo hòa nữa.**

9. **Bỏ chạy — có tỉ lệ thành công, không phải luôn khả dụng**: hành động
   "Bỏ chạy" xác suất thành công dựa trên chênh lệch `SPD` hai bên (công
   thức — Section D); thất bại → tính là 1 pha giao đấu bình thường (đối
   thủ vẫn ra đòn, người chơi không ra đòn ở pha đó).

10. **`max_invocations_per_battle` — hằng số này thuộc sở hữu Combat
    GDD**: giới hạn số lần TỐI ĐA 1 kỹ năng có thể được gọi (qua các thức
    khác nhau của nó) trong 1 trận — đóng Open Question đang BLOCKED của
    `equipment-skill-data-system.md` AC-11. Giá trị cụ thể — Tuning
    Knobs.

11. **`locked_result` mỗi pha giao đấu — SCHEMA THỐNG NHẤT DUY NHẤT**
    (sửa 2026-08-06, đóng gap `/design-review` "3 mô tả không khớp nhau
    ở Core Rule #11/D.8/D.9" — đây là NGUỒN SỰ THẬT duy nhất cho shape
    của `locked_result`; D.8/D.9 tham chiếu ngược lại bảng này, không tự
    khai field riêng):

    ```
    locked_result = {
      exchange_id: int,
      first_id: string, second_id: string,          # đúng D.2 first/second
      per_actor: {
        [actor_id]: {
          thuc_id: string | "basic_attack" | null,   # null nếu hành động = phòng thủ/bỏ chạy
          action_type: "skill" | "defend" | "flee",  # "item" ĐÃ CẮT khỏi MVP (Core Rule #6, sửa 2026-08-06 vòng 2)
          executed: bool,        # false CHỈ khi bị ngắt sớm (Core Rule #2, D.9). defend LUÔN executed=true (không có hit/damage nhưng có tác dụng D.6). flee LUÔN executed=true — kể cả khi flee_success=false (D.11): "thất bại" nghĩa là hành động ĐÃ được thực hiện nhưng không đạt hiệu quả né trận, KHÁC với bị ngắt sớm/chưa kịp làm gì (đóng gap `/design-review` "executed mơ hồ cho flee", vòng 2)
          hit: bool | null,      # null nếu executed=false HOẶC action_type≠"skill" (defend/flee không roll trúng-hụt ACC/Né — flee dùng P_flee riêng ở D.11, không phải P_hit)
          crit: bool | null,     # null nếu hit≠true
          damage_dealt: int,     # 0 nếu miss/không tấn công
          heal: int,             # 0 nếu không có lifesteal (D.7) — LUÔN có mặt, đóng gap "heal rơi khỏi hợp đồng"
          hp_after: int
        }
      },
      battle_active: bool,
      outcome: { type: "win"|"lose"|"no_outcome", winner_id: string|null, loser_id: string|null } | null
    }
    ```
    **KHÔNG có field nào khác ở cấp ngoài** ngoài đúng 5 field đã khai
    (`exchange_id`, `first_id`, `second_id`, `per_actor`, `battle_active`,
    `outcome`) — implementation không được trả thêm field thừa (đóng gap
    `/design-review` "D.9 tự ý trả thêm field `hp` không có trong schema
    này", vòng 2; xem D.9 đã sửa).

    **KHÔNG có field `dodge` riêng** (đóng gap "AC-09 và D.8 loại trừ lẫn
    nhau") — D.3 gộp ACC/Né vào 1 roll duy nhất (`hit`), không có sự
    kiện "né" tách biệt khỏi "hụt"; UI hiển thị "hụt" khi `hit=false`,
    không cần field riêng. Tất cả field số tuân thủ Contract
    Enforcement — không xuất hiện trần trụi trong `narration_text`,
    BAO GỒM `heal` (trước đây rơi khỏi hợp đồng dù được hiển thị "+N"
    theo Visual/Audio Requirements — nay đã đóng). Khi `battle_active=false`,
    `outcome` có schema THỐNG NHẤT cố định:
    `{ type: "win" | "lose" | "no_outcome", winner_id: string | null,
    loser_id: string | null }` — `winner_id`/`loser_id` đều `null` khi
    `type="no_outcome"` (bỏ chạy thành công, hòa giao hữu D.9b, tín hiệu
    khẩn cấp xen ngang, hoặc chạm `TECHNICAL_EXCHANGE_CAP` trong
    `spar_friendly` — sửa 2026-08-03, xem Open Questions); không có hình
    dạng dữ liệu nào khác cho field này ở bất kỳ nhánh kết thúc trận nào.

12. **Chỉ pha KẾT THÚC trận mới phát tín hiệu hand-off**: `battle_active=false`
    kèm `outcome` (win/lose), margin liên quan (chênh lệch HP còn lại, số
    pha đã đấu...) — EXP & Realm Progression, Death & Consequence, NPC
    Affinity & Relationship (đã Designed) tự đọc tín hiệu này để tính
    hệ quả riêng; Combat System không tự tính EXP/hậu quả cái chết/thay
    đổi Hảo cảm.

13. **2 field trạng thái trận MỚI** (sửa 2026-08-03, xem Open Questions):
    `is_spar_friendly` (bool) — đọc ĐÚNG 1 LẦN khi trận khởi tạo từ cờ
    `spar_friendly` của `combat_challenge(target, spar_friendly)`
    (Situation/Encounter Generation), KHÔNG đổi trong suốt trận;
    `external_abort_signal` (`{ requested: bool, reason_tag: string|null }
    | null`, mặc định `null`) — có thể được 1 hệ ngoài set BẤT KỲ LÚC NÀO
    giữa trận, Combat CHỈ kiểm tra đúng 1 lần tại đầu state "In Combat —
    Awaiting Exchange" (TRƯỚC khi build gợi ý hành động cho Turn Manager),
    KHÔNG kiểm tra giữa lúc D.9 đang resolve (giữ nguyên tính atomic của
    D.9/Core Rule #2-3). `reason_tag` là field MỜ với Combat — không diễn
    giải, chỉ truyền nguyên văn vào `narration_call` làm ngữ cảnh phong
    cách (như `style_descriptor`), không thuộc phạm vi Numeric Leak
    Detection (không phải field số).

### States and Transitions

| State | Mô tả | Chuyển sang |
|---|---|---|
| Not In Combat | Trạng thái mặc định, hành động thường không kích hoạt cơ chế chiến đấu | → In Combat (khi 1 hành động kích hoạt giao chiến, ở lượt Turn Manager đó) |
| In Combat — Awaiting Exchange | Đang trong trận, chờ Turn Manager đưa gợi ý hành động (thức khả dụng + phòng thủ + bỏ chạy) | → Resolving Exchange (khi người chơi xác nhận hành động) |
| Resolving Exchange | Tính pha giao đấu: chọn hành động đối thủ (Core Rule #2), giải quyết theo Core Rule #3-4, cập nhật HP | → In Combat — Awaiting Exchange (nếu `battle_active=true`, lượt kế tiếp) HOẶC → Battle Concluded (nếu `battle_active=false`) |
| Battle Concluded | Trận đã kết thúc (thắng/thua/bỏ chạy thành công), phát tín hiệu hand-off (Core Rule #12) | → Not In Combat (lượt kế tiếp trở lại bình thường) |

*(Không có quay lại "In Combat" từ "Not In Combat" trong cùng 1 trận đã
Concluded — muốn giao chiến lại là một trận HOÀN TOÀN MỚI, reset danh
sách thức đã dùng theo Core Rule #5.)*

### Interactions with Other Systems

- **Turn Manager** (Foundation, Approved) — mỗi pha giao đấu là 1 lượt
  Turn Manager bình thường (đúng Core Rule #1 của Turn Manager: 1 lượt =
  1 hành động); Combat cung cấp danh sách hành động khả dụng (thức +
  phòng thủ + bỏ chạy — không còn "vật phẩm", CẮT khỏi MVP, Core Rule
  #6) cho Turn Manager hiển thị làm gợi ý, đúng invariant "mọi category
  hành động hợp lệ đều tới được UI" (xem UI Requirements).
- **Equipment & Skill Data System** (Foundation, Approved) — đọc
  `known_skill_ids`, `equipped_weapon_id`, danh sách thức + `thuc_id`
  (unique) + `style_descriptor` + `tier`; đóng Open Question BLOCKED của
  GDD đó bằng cách định nghĩa `max_invocations_per_battle` (Core Rule
  #10).
- **AI/LLM Integration Layer** (Core, Designed) — gọi `narration_call`
  với `locked_result` của MỖI pha giao đấu (1 lệnh gọi/lượt, đúng
  `calls_per_turn_max=3`); `style_descriptor` của thức được chèn vào
  prompt như ngữ cảnh phong cách.
- **Mechanic/Narration Contract Enforcement** (Foundation, Approved) —
  mọi field số trong `locked_result` mỗi pha (damage, HP...) chịu Numeric
  Leak Detection; Combat không bao giờ đọc lại `narration_text` để suy ra
  kết quả.
- **EXP & Realm Progression** (Feature, đã Designed) — đọc tín hiệu
  hand-off (Core Rule #12) khi `battle_active=false`, tự tính EXP; Combat
  không sở hữu công thức EXP.
- **Death & Consequence** (Feature, đã Designed) — đọc tín hiệu thua
  trận + ngưỡng Hảo cảm đối thủ (từ NPC Affinity, Designed 2026-08-03 —
  cờ thù địch sâu sắc `affinity ≤ -80`, registry
  `deep_hostility_threshold`) để quyết định hậu quả (chết thật hay
  không); Combat chỉ báo "đã thua", không tự quyết định mức độ hậu quả.
- **NPC Affinity & Relationship** (Feature, đã Designed) — Combat
  không trực tiếp đọc/ghi Hảo cảm; ngưỡng 20 cấp chênh lệch (điều kiện
  NPC chủ động địch ý) thuộc phạm vi Situation/Encounter Generation
  quyết định KHI NÀO kích hoạt Combat, không phải Combat tự kiểm tra.
- **Situation/Encounter Generation** (provisional, sửa 2026-08-03) —
  Combat lắng nghe `external_abort_signal` (Core Rule #13) để ngắt trận
  khẩn cấp giữa chừng; ĐIỀU KIỆN gì khiến hệ đó set tín hiệu này KHÔNG
  thuộc phạm vi GDD này — flag Open Question tương ứng ở
  `situation-encounter-generation.md`.

## Formulas

> 📌 **Thẩm quyền spec (kể từ `docs/architecture/adr-0001-combat-spec-authority.md`,
> 2026-08-07)**: Section D này (D.1–D.14) giờ là MÔ TẢ cho chi tiết cơ học
> (chữ ký hàm, kiểu dữ liệu, thứ tự thực thi, ngữ nghĩa chia số, biên
> mảng) — **nguồn sự thật thật sự là `src/gameplay/combat/*.gd`** (chưa
> tồn tại tại thời điểm viết dòng này — xem Migration Plan của ADR-0001).
> Nếu văn xuôi ở đây và code `.gd` mâu thuẫn nhau, `.gd` ĐÚNG cho tới khi
> có 1 lần sửa tường minh cả hai cùng lúc — KHÔNG sửa cơ học ở đây trước
> rồi chép sang `.gd` sau (nguyên tắc 1 chiều: code → prose). Section D
> vẫn NORMATIVE đầy đủ cho: ý định thiết kế, tên/giá trị mặc định/dải an
> toàn/lý do của mọi Tuning Knob, và hợp đồng liên hệ chéo hệ (field nào
> hệ khác đọc, điều kiện nào).

*(Quy ước ký hiệu dùng xuyên suốt: `clamp(v, lo, hi) = max(lo, min(hi, v))`;
`round()` làm tròn thông thường, 0.5 làm tròn lên; `roll_uniform[0,1)` là
số ngẫu nhiên đều lấy tại đúng thời điểm formula chạy, không tái sử dụng
giữa các bước. Mọi field số trong `locked_result` là số nguyên sau
`round()`, đúng Numeric Leak Detection của Mechanic/Narration Contract
Enforcement. Đề xuất bởi `systems-designer`.)*

*(**Quy ước BỔ SUNG, áp dụng TOÀN Section D** — tích lũy qua vòng 2 và
vòng 3 `/design-review`:
(1) **Cấm `is_equal_approx()` cho MỌI so sánh bằng-tuyệt-đối bằng số
thực trong hệ này** (VD `hp_pct(A)!=hp_pct(B)` ở D.9c) — dùng phép so
sánh bằng CHÍNH XÁC (`==`/`!=`), KHÔNG dùng dung sai (epsilon). **Lý do
SỬA LẠI vòng 3** (đóng gap [godot-specialist] R3 — lý do gốc vòng 2 sai
cho chính ví dụ nó trích dẫn): các giá trị field trong `locked_result`
(damage, hp_after...) là kết quả ĐÃ ROUND (Contract Enforcement) nên
so sánh chính xác an toàn theo nghĩa đó; nhưng `effective_stat` (D.1,
VD `effective_SPD`) KHÔNG hề bị `round()` ở bất kỳ đâu — D.2 an toàn
KHÔNG PHẢI vì dữ liệu đã round, mà vì D.2 dùng cấu trúc loại trừ
`>`/`>`/else (không có `==` tường minh nào). Kết luận (cấm
`is_equal_approx()`) vẫn đúng và giữ nguyên; MỌI so sánh `==`/`!=` MỚI
được thêm sau này trên 1 giá trị KHÔNG đảm bảo đã `round()` (như
`effective_stat`) PHẢI dùng cấu trúc loại trừ tương tự D.2, không dùng
`==` trực tiếp.
(2) **RNG injection — kiến trúc tham số hóa bắt buộc, THỂ HIỆN TƯỜNG
MINH trong pseudocode kể từ vòng 3**: mọi formula dùng `roll_uniform`
(D.2, D.3, D.5, D.8, D.9, D.11, D.14) nhận nó như 1 tham số `rng` ĐƯỢC
INJECT bởi lớp gọi (state "Resolving Exchange" → `resolve_exchange` →
xuống mọi lời gọi con), KHÔNG đọc từ global/autoload — implementation
GDScript dùng 1 `RandomNumberGenerator` instance DUY NHẤT làm tham số
cuối cùng của mọi hàm D.x liên quan (SỬA vòng 3, đóng gap
[godot-specialist] B4 — bỏ lựa chọn `Callable` khỏi vòng 2: `Callable.call()`
trả về `Variant` không kiểu tĩnh, ma sát với mandate static-typing của
`coding-standards.md`; `RandomNumberGenerator` cho kiểu `float` tường
minh tại call site). Xác nhận khả thi bằng harness
(`prototypes/combat-reference/harness.py`, thí nghiệm Q5): cùng seed,
luồn đúng 1 object rng qua toàn chuỗi gọi → kết quả 2 lần chạy giống hệt
tuyệt đối. D.9/D.9b/D.9c's pseudocode giờ khai `rng` tường minh trong
chữ ký (xem D.9) — vòng 2 chỉ ghi chú văn xuôi, chưa phản ánh vào chính
pseudocode, đây là điểm đã đóng ở vòng 3.
(3) **Ép kiểu `float()` tường minh TRƯỚC MỌI phép chia có cả 2 toán
hạng khai kiểu `int`** — MỚI vòng 3, tổng quát hóa ghi chú D.12 cũ (chỉ
áp cho 1 phép chia) thành quy tắc CHUNG cho toàn Section D. GDScript
`int/int` cắt cụt (C-style truncation), KHÔNG như phép chia số thực
thông thường — xác nhận bằng harness: dưới ngữ nghĩa cắt cụt, D.4b's
`exhaustion_progress` hội tụ **0/108** tổ hợp Safe Range (xem D.4b) do
biểu thức `(exchange_id - ONSET)/(CAP - ONSET)` (cả 3 biến đều `int`)
cắt cụt về 0 cho gần như toàn trận. Áp dụng cho: D.4b's
`exhaustion_progress`, D.9b/D.9c's `hp_pct`, D.12's
`max_invocations_per_battle` (ghi chú gốc, giữ nguyên). Không áp dụng
cho phép chia có ít nhất 1 toán hạng đã khai `float` (VD D.3's `P_hit`,
vốn không có vấn đề này).)*

*(**Ranh giới phạm vi bắt buộc nêu rõ**: KHÔNG có formula nào dưới đây
nhận Hảo cảm làm input — ngưỡng -80 (thù địch sâu sắc) thuộc Death &
Consequence + NPC Affinity (đã Designed). Combat chỉ xuất tín hiệu
thắng/thua + `hp_after` qua `locked_result`/hand-off (Core Rule #12);
việc ngưỡng -80 có tính bao gồm hay không là quyết định của hệ đó, không
phải hệ này.)*

**D.1 — Chỉ số hiệu dụng (Áp chế cảnh giới & Phạt vượt bậc)**

```
effective_stat(C, X) = base_X(C) * total_penalty_multiplier(C)

total_penalty_multiplier(C) = clamp(
    layer_mult(gap_realm(C)) * layer_mult(gap_gear(C)) * crippled_layer(C),
    FLOOR_TOTAL, 1.0
)

layer_mult(gap) = clamp(1 - PENALTY_PER_TIER * gap, FLOOR_LAYER, 1.0)

gap_realm(C)  = max(0, tier(opponent(C)) - tier(C))
gap_gear(C)   = max(0, weapon_tier(C) - tier(C), skill_tier_used(C) - tier(C))

crippled_layer(C) = CRIPPLED_PENALTY_MULT if death_and_consequence_blocked(C) else 1.0
```

**Bổ sung 2026-08-09 (cascade edit từ `/design-review` round 1 của
`death-and-consequence.md`, theo lựa chọn user cho Core Rule #6 của GDD
đó — "thêm penalty cơ học thật" thay vì chỉ chặn EXP)**: `crippled_layer(C)`
là lớp phạt thứ 3, ĐỘC LẬP với `gap_realm`/`gap_gear` — không phải hàm
của gap, chỉ phụ thuộc 1 cờ boolean đọc từ Death & Consequence (hệ #12,
đã Designed). Cố định (không cộng dồn theo số lần bị phế liên tiếp — cờ
chỉ có {true,false}, không "độ sâu"), và vẫn nằm trong sàn `FLOOR_TOTAL`
chung — dù cộng dồn với `gap_realm`/`gap_gear` ở mức nặng nhất,
`effective_stat` không bao giờ về 0 tuyệt đối, cùng đảm bảo như 2 lớp
kia. Đây là cascade edit cục bộ (thêm 1 lớp, không đổi công thức D.1
cũ) — CHƯA chạy lại vòng review đầy đủ của hệ này; cần 1 pass xác minh
hẹp (không phải panel đầy đủ) trước khi hệ này chuyển Approved, xem
High-Risk Systems table ở `systems-index.md`.

Áp dụng cho X ∈ {ATK, DEF, ACC, Né tránh, SPD, Crit Rate, Crit Damage,
Khuếch đại sát thương, Chống chịu, Lifesteal, HP Regen}. **KHÔNG áp dụng
cho max HP** — HP là "vốn sinh mệnh" thô, không phải hiệu năng giao đấu;
bị áp chế nghĩa là đánh/đỡ kém hơn, không phải "mất máu sẵn" trước khi
đánh.

`skill_tier_used(C)` chỉ tồn tại khi hành động của C trong pha là "dùng
thức"; với phòng thủ/bỏ chạy, `gap_gear(C) = max(0, weapon_tier(C) -
tier(C))` (bỏ số hạng kỹ năng).

| Symbol | Type | Range | Description |
|---|---|---|---|
| `tier(C)` | int | **1–∞** | Bậc/cảnh giới hiện tại của C (nguồn: EXP & Realm Progression, đã Designed — Combat chỉ đọc; sửa 2026-08-08 từ `0–∞`, khớp `exp-realm-progression.md` Rule 1 + registry `tier_from_level` — `tier` không bao giờ =0 với `level≥1` hợp lệ, phát hiện tại `/design-review` vòng 1 của GDD đó, cụm A12) |
| `weapon_tier(C)` | int | 0–∞ | `tier` vũ khí đang trang bị (nguồn: Equipment & Skill Data System) |
| `skill_tier_used(C)` | int | 0–∞ (optional) | `tier` kỹ năng gốc của thức vừa dùng trong pha |
| `gap_realm`, `gap_gear` | int | 0–∞ | Số bậc chênh lệch bất lợi (0 nếu C không thua kém) |
| `PENALTY_PER_TIER` | float (knob) | 0–1 | % giảm mỗi bậc chênh lệch — đề xuất mặc định **0.15** |
| `FLOOR_LAYER` | float (knob) | 0–1 | Sàn multiplier mỗi lớp phạt riêng — đề xuất mặc định **0.1** |
| `FLOOR_TOTAL` | float (knob) | 0–1 | Sàn multiplier TỔNG sau khi nhân 2 lớp — đề xuất mặc định **0.05** |
| `base_X(C)` | float | 0–∞ | Giá trị gốc chưa bị phạt (từ Character Card) |
| Đang bị phế (MỚI 2026-08-09) | `death_and_consequence_blocked(C)` | bool | {true,false} | Nguồn: Death & Consequence (hệ #12, đã Designed) — Combat chỉ ĐỌC |
| Hệ số phạt khi bị phế (MỚI 2026-08-09) | `CRIPPLED_PENALTY_MULT` | float (knob) | 0.7–0.95 | Đề xuất mặc định **0.85** (tương đương độ nặng đúng 1 bậc chênh lệch cảnh giới) — xem Tuning Knobs |
| `effective_stat(C,X)` | float | `[FLOOR_TOTAL·base_X, base_X]` | Giá trị dùng thực tế trong pha, input cho mọi formula D.2–D.10 |

**Output range**: `[FLOOR_TOTAL * base_X, base_X]` — luôn ≥0 vì `base_X ≥
0` và multiplier ∈ `[FLOOR_TOTAL, 1]`. **Đóng trực tiếp test case "floor
khi chồng phạt"**: dù 2 lớp phạt cộng dồn cực đoan, `effective_stat`
không bao giờ âm và không bao giờ về đúng 0 nếu `base_X > 0`.

**Ví dụ thường**: C tier=3, đối thủ tier=6 → `gap_realm=3`; C trang bị vũ
khí tier=5, dùng thức thuộc kỹ năng tier=4 → `gap_gear = max(0,2,1) = 2`.
`layer_mult(3) = clamp(1-0.45, 0.1, 1) = 0.55`; `layer_mult(2) =
clamp(1-0.3, 0.1, 1) = 0.7`.
`total = clamp(0.55*0.7, 0.05, 1) = 0.385`. `base_ATK=50` →
`effective_ATK = 19.25`.

**Ví dụ biên (floor kích hoạt)**: `gap_realm=10, gap_gear=10` → mỗi lớp
floor tại 0.1 → tích `0.01` → `clamp(0.01, 0.05, 1) = 0.05` (FLOOR_TOTAL
thắng, không phải 0.01) → `effective_ATK = 50*0.05 = 2.5`. Không bao giờ
về 0.

**Ví dụ `crippled_layer` (MỚI 2026-08-09)**: C đang
`death_and_consequence_blocked=true`, KHÔNG có chênh lệch cảnh
giới/trang bị (`gap_realm=0, gap_gear=0` → `layer_mult=1.0` cả 2) →
`total = clamp(1.0*1.0*0.85, 0.05, 1) = 0.85` → `base_ATK=50` →
`effective_ATK=42.5` (giảm 15%, không đổi nếu không có gap khác).
**Ví dụ cộng dồn biên (floor vẫn bảo vệ)**: C đang bị phế VÀ
`gap_realm=10, gap_gear=10` (như ví dụ floor ở trên) → `total =
clamp(0.1*0.1*0.85, 0.05, 1) = clamp(0.0085, 0.05, 1) = 0.05` —
`FLOOR_TOTAL` vẫn thắng, kết quả GIỐNG HỆT ví dụ floor không có
`crippled_layer` (`effective_ATK=2.5`) — cộng dồn 3 lớp phạt nặng nhất
không đẩy `effective_stat` xuống thấp hơn sàn đã có, đúng thiết kế
"giảm rủi ro death-spiral vô hạn nhưng không loại bỏ hoàn toàn" đã
thống nhất ở `death-and-consequence.md` Core Rule #6.

**Ghi chú ngưỡng 20 cấp**: vì đây là hàm suy giảm TUYẾN TÍNH LIÊN TỤC
theo từng bậc (không phải ngưỡng cắt cứng), câu hỏi "`>=20` hay `>20`"
không áp dụng được cho công thức này. Ngưỡng 20 CẤP của `game-concept.md`
đo bằng "cấp" (10 cấp = 1 bậc), khác thang đo với "bậc/cảnh giới" ở đây,
và thuộc quyết định của Situation/Encounter Generation (đã chốt ở
Interactions with Other Systems) — Combat không dùng nó trong formula
này.

---

**D.2 — Xác định thứ tự ra đòn (SPD Priority)**

```
first(A,B,rng)  = A  nếu effective_SPD(A) > effective_SPD(B)
                = B  nếu effective_SPD(B) > effective_SPD(A)
                = coin_flip(rng)  nếu bằng nhau tuyệt đối
second(A,B,rng) = bên còn lại

coin_flip(rng) = A  nếu roll_uniform[0,1) < 0.5   # roll_uniform lấy từ `rng` injected — xem quy ước RNG injection
               = B  nếu ngược lại
```

`rng` — MỚI vòng 3 `/design-review`, tham số injected tường minh (xem
quy ước RNG injection ở đầu Section D), thay cho ghi chú văn xuôi vòng 2
chưa phản ánh vào pseudocode.

| Symbol | Type | Range | Description |
|---|---|---|---|
| `effective_SPD(A)`, `effective_SPD(B)` | float | 0–∞ | Từ D.1 |
| `coin_flip()` | bool | {A,B}, 50/50 | Dùng `roll_uniform` injected — CÙNG stream RNG với mọi formula khác của hệ này (sửa 2026-08-06: KHÔNG còn tự seed theo `exchange_id` — đóng gap `/design-review` "thiên vị hệ thống cố định giữa các trận khác nhau" + "phá vỡ re-roll thật khi Undo, AC-37/Turn Manager AC-12"). Random đều, KHÔNG thiên vị người chơi (Pillar 1), và không thiên vị giữa các TRẬN khác nhau |
| `first`, `second` | enum | {A,B} | Thứ tự ra đòn trong pha, dùng bởi D.9 |

**Output**: luôn xác định 1 cặp (first, second), không có "hòa treo".

**Ví dụ**: `effective_SPD(player)=32.5`, `effective_SPD(npc)=40` →
`first=npc, second=player`.
**Ví dụ hòa**: cả 2 = 40.0 chính xác → `coin_flip()` quyết định qua
`roll_uniform` mock (KHÔNG qua `exchange_id`) — Undo + xác nhận lại
cùng pha đó sẽ re-roll THẬT (giá trị mock khác lần trước có thể ra kết
quả khác), đúng Turn Manager AC-12; và 2 trận khác nhau có cùng
`exchange_id=1` không còn bị ép ra cùng 1 kết quả.

---

**D.3 — Xác định trúng/hụt (ACC vs Né tránh)**

```
P_hit(attacker, defender) = clamp(0.5 + K_HIT * (effective_ACC(attacker) - effective_Né(defender)), P_MIN, P_MAX)
hit = roll_uniform(rng)[0,1) < P_hit   # roll_uniform lấy từ `rng` injected — xem quy ước RNG injection
```

| Symbol | Type | Range | Description |
|---|---|---|---|
| `effective_ACC`, `effective_Né` | float | 0–∞ | Từ D.1 |
| `K_HIT` | float (knob) | >0 | Độ dốc — đề xuất mặc định **0.01** |
| `P_MIN`, `P_MAX` | float (knob) | 0–1 | Sàn/trần xác suất — đề xuất mặc định **0.05 / 0.95** |
| `P_hit` | float | `[P_MIN, P_MAX]` | Xác suất trúng đòn |
| `hit` | bool | {true,false} | Kết quả |

**Output range**: `P_hit ∈ [P_MIN, P_MAX]` — không bao giờ 100% trúng hay
100% hụt tuyệt đối (đúng nguyên tắc "thế giới khách quan không có tuyệt
đối"). **Đóng test case 0/0**: vì là hàm HIỆU SỐ (trừ, không chia),
`effective_ACC = effective_Né = 0` → hiệu số = 0 → `P_hit = 0.5`, không
có phép chia nào xảy ra, không cần xử lý ngoại lệ riêng.

**Ví dụ**: `effective_ACC=45.2, effective_Né=38.0` → diff=7.2 → `P_hit =
0.572` → roll 0.4 < 0.572 → `hit=true`.

---

**D.4 — Sát thương cơ bản**

```
raw_damage = max(effective_ATK(attacker) * MIN_RAW_RATIO, effective_ATK(attacker) - effective_DEF(defender))
```

| Symbol | Type | Range | Description |
|---|---|---|---|
| `effective_ATK`, `effective_DEF` | float | 0–∞ | Từ D.1 |
| `MIN_RAW_RATIO` | float (knob) | 0–1 | Sàn sát thương tối thiểu khi đòn TRÚNG, theo % `effective_ATK` — đóng gap `/design-review` "đấm vào tường vô hạn khi ATK≤DEF cả 2 chiều → bế tắc → coin_flip ẩn" (sửa 2026-08-06, xem D.4b + Open Questions). Đề xuất mặc định **0.05**, nhất quán với `FLOOR_TOTAL` (D.1) |
| `raw_damage` | float | `[effective_ATK*MIN_RAW_RATIO, ∞)` | Sát thương trước crit/khuếch đại/chống chịu |

**Output range**: `[effective_ATK*MIN_RAW_RATIO, ∞)` — không còn có thể
về đúng 0 khi đòn trúng (đúng nguyên tắc "không có tuyệt đối" đã dùng ở
D.1/D.3/D.6, D.4 trước sửa là chỗ DUY NHẤT thiếu sàn này). Đúng phát
hiện từ prototype: chênh lệch nhỏ → `raw_damage` gần sàn (nhiều pha
giằng co); chênh lệch lớn → `raw_damage` lớn (kết thúc nhanh) — đây
CHÍNH LÀ cơ chế tạo nhịp trận tự nhiên. **Sàn `MIN_RAW_RATIO` MỘT MÌNH
KHÔNG đủ để đảm bảo trận hội tụ** (HP Regen D.10 mặc định vẫn thắng
sàn chip ~10:1 ở ví dụ dưới) — xem D.4b cho cơ chế kiệt sức lũy tiến xử
lý tương tác này.

**Ví dụ**: `effective_ATK=19.25, effective_DEF=22` → `raw = max(19.25*0.05,
-2.75) = max(0.9625, -2.75) = 0.9625` — đòn trúng (D.3 pass) gây sát
thương chip tối thiểu thay vì 0 tuyệt đối ("đấm vào tường" giờ vẫn để
lại vết, dù rất nhẹ).

---

**D.4b — Kiệt sức lũy tiến (chống bế tắc vô hạn)** (SỬA LẠI 2026-08-06,
vòng 2 `/design-review` — bản vòng 1 chỉ giảm HP Regen về 0 và ĐÃ ĐƯỢC
CHỨNG MINH KHÔNG ĐỦ bằng harness số độc lập, không chỉ suy luận: quét
toàn bộ Safe Range đã công bố của `MIN_RAW_RATIO`×`EXHAUSTION_ONSET_EXCHANGE`
×`effective_HPRegen`×`P_hit`, cơ chế vòng 1 chỉ hội tụ **0–3/36 tổ hợp**
trước khi chạm `TECHNICAL_EXCHANGE_CAP` — kể cả ở kịch bản "regen về
đúng 0 tuyệt đối tại cap", tổng sát thương chip tích lũy trong cả cửa
sổ kiệt sức chỉ ~77 HP trên nền `max_HP=200`, không đủ hạ ai về 0.
Nguyên nhân gốc: sàn chip D.4 neo theo `effective_ATK` — chính đại
lượng bị D.1 đè bẹp trong đúng kịch bản bế tắc — nên cơ chế chống-bế-tắc
tự bị bế tắc làm suy yếu. Fix vòng 2 kết hợp 2 cơ chế ĐỘC LẬP với
`effective_ATK`/`effective_DEF`, ban đầu tuyên bố hội tụ "72/72 tổ hợp
Safe Range" bằng 1 harness Python ở `/tmp/combat_harness.py` — **KHÔNG
NẰM TRONG REPO, đã mất, không tái kiểm được**.
**SỬA LẠI 2026-08-06 vòng 3** `/design-review`: creative-director đặt
điều kiện "không chấp nhận tuyên bố hội tụ nếu harness không tồn tại
trong repo và không mô hình đúng ngữ nghĩa số GDScript". Vòng 3 phát
hiện (qua reference harness MỚI, commit tại
`prototypes/combat-reference/harness.py`, xem `results.md` cùng thư
mục): (a) dưới đúng ngữ nghĩa `int/int` cắt cụt của GDScript (không phải
`/` của Python mà harness vòng 2 gần như chắc chắn đã dùng),
`exhaustion_progress` (công thức bên dưới) cắt cụt về 0 cho gần như toàn
bộ trận — **0/108 tổ hợp hội tụ**, tệ hơn cả thất bại vòng 1; (b)
`TECHNICAL_EXCHANGE_CAP` chưa từng được đưa vào 4 trục quét gốc — khi
thêm vào, ngay cả dưới chia-số-thực ĐÚNG, kết quả là **96/108 (89%)**,
không phải 100%, với thất bại tập trung ở cửa sổ kiệt sức hẹp (`CAP -
ONSET` ≤ 60, xem `results.md`). Đã sửa: (1) ép kiểu `float()` tường minh
bắt buộc cho MỌI phép chia `int/int` trong D.4b/D.9b/D.9c (xem công thức
dưới); (2) thêm ràng buộc chéo về độ rộng cửa sổ vào Tuning Knobs; (3)
harness giờ SỐNG trong repo, có thể tái chạy khi bất kỳ knob nào đổi —
xem AC-47a đã viết lại.)

```
exhaustion_progress = clamp(
    float(exchange_id - EXHAUSTION_ONSET_EXCHANGE) / (TECHNICAL_EXCHANGE_CAP - EXHAUSTION_ONSET_EXCHANGE),
    0, 1
)
# ÉP KIỂU float() TƯỜNG MINH bắt buộc — sửa 2026-08-06 vòng 3
# `/design-review`, đóng gap [godot-specialist] nghiêm trọng nhất vòng 3:
# `exchange_id`, `EXHAUSTION_ONSET_EXCHANGE`, `TECHNICAL_EXCHANGE_CAP` đều
# khai `int` (bảng ký hiệu dưới) — GDScript `int/int` CẮT CỤT (không như
# Python's `/`, ngữ nghĩa mà harness vòng 2 gần như chắc chắn đã dùng).
# Xác nhận bằng harness (`prototypes/combat-reference/harness.py`, thí
# nghiệm Q1): dưới đúng ngữ nghĩa GDScript, **0/108 tổ hợp Safe Range hội
# tụ** (tệ hơn cả "0-3/36" mà chính vòng này đang sửa) — vì
# `exhaustion_progress` cắt cụt về `0` cho GẦN NHƯ TOÀN BỘ trận, chỉ đạt
# đúng `1` ở CHÍNH pha `exchange_id==TECHNICAL_EXCHANGE_CAP` (điểm DUY
# NHẤT tử/mẫu bằng nhau tuyệt đối) — quá muộn để có tác dụng. Đây là quy
# tắc BẮT BUỘC áp dụng CHUNG cho MỌI phép chia `int/int` trong Section D
# (không chỉ D.4b) — xem cùng fix ở D.9b/D.9c's `hp_pct`; ghi chú D.12 cũ
# (chỉ áp cho phép chia đó) được coi là 1 trường hợp riêng của quy tắc
# chung này, không phải quy tắc duy nhất.

# (1) Giảm dần hiệu lực HP Regen về 0 (giữ nguyên cơ chế vòng 1)
exhaustion_regen_mult = 1 - exhaustion_progress

# (2) MỚI (vòng 2) — hao tổn cộng dồn trực tiếp, ĐỘC LẬP với effective_ATK/effective_DEF
exhaustion_drain(C) = round(max_HP(C) * EXHAUSTION_DRAIN_PCT * exhaustion_progress)
```

`exhaustion_regen_mult` nhân THÊM vào `effective_HPRegen(C)` đã bị
`HP_REGEN_CAP` chặn trần (D.10 — MỚI vòng 2, xem dưới), cho CẢ HAI bên
như nhau. `exhaustion_drain(C)` là 1 lượng HP trừ THẲNG vào `hp(C)` ở
CUỐI pha, cùng thời điểm D.10 chạy (chỉ khi `battle_active=true` sau
khi cả 2 đòn đã resolve, đúng Core Rule #3) — áp dụng cho CẢ HAI bên
như nhau, không phụ thuộc ai đang thắng/thua, chỉ phụ thuộc trận đã kéo
dài bao lâu. Thứ tự áp dụng trong pha: D.8×2 (2 đòn đánh) → D.10 Regen
(nếu battle còn tiếp diễn) → `exhaustion_drain` theo thứ tự `first` rồi
`second` (D.2) — nếu `exhaustion_drain` làm 1 bên về 0, xử lý HOÀN
TOÀN giống nhánh HP=0 thường của D.9 (qua D.9b `reclassify_outcome`);
nếu áp dụng cho `first` không làm `first` về 0, `exhaustion_drain` của
`second` vẫn áp dụng bình thường ngay sau đó (khác cơ chế ngắt sớm của
đòn đánh — đây là hao tổn thụ động đối xứng, không có khái niệm "đối
phương chưa kịp ra đòn"); nếu CẢ HAI cùng về 0 do drain trong cùng pha
đó (trường hợp duy nhất trong toàn hệ "cùng kiệt sức" được phép xảy
ra, khác Edge Case "cùng chết" của D.9 vốn cấm tuyệt đối cho đòn đánh),
giải quyết bằng tiebreak D.9c (so `hp_pct` NGAY TRƯỚC khi drain của pha
đó áp dụng; nếu bằng tuyệt đối, `coin_flip()` qua `roll_uniform`).

| Symbol | Type | Range | Description |
|---|---|---|---|
| `EXHAUSTION_ONSET_EXCHANGE` | int (knob) | >0, < `TECHNICAL_EXCHANGE_CAP`, VÀ PHẢI được cấu hình lớn hơn giá trị `CONTENT_EXCHANGE_ESTIMATE` **đang dùng** (không chỉ giá trị mặc định — Safe Range của 2 knob này chồng lấp nhau, xem ràng buộc chéo ở Tuning Knobs) | Pha bắt đầu kích hoạt kiệt sức — mặc định **40** |
| `exchange_id` | int | 1–∞ | Từ Core Rule #1 |
| `TECHNICAL_EXCHANGE_CAP` | int (knob) | >0 | Từ D.9c, mặc định 200 |
| `exhaustion_progress` | float | `[0,1]` | 0 trước ngưỡng onset, tuyến tính tăng tới 1 đúng lúc chạm cap |
| `exhaustion_regen_mult` | float | `[0,1]` | Nhân thêm vào `effective_HPRegen` đã bị `HP_REGEN_CAP` chặn (D.10) |
| `EXHAUSTION_DRAIN_PCT` | float (knob, MỚI vòng 2) | 0–1, Safe Range **0.05–0.15** | % `max_HP` hao tổn CỘNG DỒN mỗi pha, nhân với `exhaustion_progress` — đề xuất mặc định **0.05**. **KHÔNG được đặt dưới 0.05** — harness xác nhận dưới ngưỡng này KHÔNG còn đảm bảo hội tụ trên toàn Safe Range (VD 0.03 chỉ hội tụ 48/72 tổ hợp kiểm thử, 0.02 chỉ 7/72) |
| `exhaustion_drain(C)` | int | `[0, round(max_HP*EXHAUSTION_DRAIN_PCT)]` | Hao tổn cộng dồn, ĐỘC LẬP hoàn toàn với `effective_ATK`/`effective_DEF` — đảm bảo hội tụ ngay cả khi cả 2 bên bị D.1 phạt nặng tới mức sàn chip D.4 gần như vô nghĩa |

**MỚI (vòng 2) — `HP_REGEN_CAP`**: D.10 giờ áp dụng thêm 1 trần cứng
lên `effective_HPRegen(C)` TRƯỚC khi nhân `exhaustion_regen_mult` — xem
D.10 và Tuning Knobs. Lý do: bảng ký hiệu D.10 khai `effective_HPRegen
∈ [0,1]` nhưng không có Tuning Knob nào chặn trần thực tế — 1 build
HPRegen cao (VD 0.5–1.0, hợp lệ theo range đã khai) đủ để đánh bại cả
sàn chip D.4 LẪN `exhaustion_drain` nếu không bị chặn (harness xác
nhận: drain 5% một mình, không có `HP_REGEN_CAP`, chỉ hội tụ 9/15 tổ
hợp khi quét tới `effective_HPRegen=1.0`).

**Output range**: `exhaustion_regen_mult ∈ [0,1]`;
`exhaustion_drain(C) ∈ [0, round(max_HP*EXHAUSTION_DRAIN_PCT)]`, tăng
tuyến tính theo `exhaustion_progress`. Kết hợp sàn chip `MIN_RAW_RATIO`
(D.4) + trần `HP_REGEN_CAP` (D.10) + hao tổn cộng dồn `exhaustion_drain`
(tính CẢ HAI bên KHÔNG ĐIỀU KIỆN mỗi pha — sửa vòng 3, xem D.9) — **đã
XÁC NHẬN BẰNG HARNESS SỐNG TRONG REPO** (`prototypes/combat-reference/harness.py`,
mô phỏng TẤT ĐỊNH quét Safe Range đã công bố, BAO GỒM
`TECHNICAL_EXCHANGE_CAP` — mở rộng vòng 3 so với 4 trục gốc): **96/108
tổ hợp hội tụ HP=0 thật trước `TECHNICAL_EXCHANGE_CAP`**, với 12 tổ hợp
KHÔNG hội tụ đều có cửa sổ kiệt sức hẹp (`CAP-ONSET` ≤ 60) — xem ràng
buộc chéo #2 ở Tuning Knobs (`CAP-ONSET ≥ 120`) và AC-47a đã viết lại.
D.9c vẫn giữ lại làm van an toàn kỹ thuật cho cấu hình knob nằm ngoài
ràng buộc chéo đó.

**Ý nghĩa diegetic**: không đổi so với vòng 1 — AI vẫn được phép tường
thuật trung thực "cả hai đã dần kiệt sức, chiêu thức chậm lại, khả năng
hồi phục giảm sút, từng vết thương nhỏ không kịp lành" khi trận kéo dài
bất thường — vẫn là 1 công thức minh bạch, không phải luật phi-diegetic
ghi đè kết quả (Pillar 3 giữ nguyên).

**Tín hiệu UI BẮT BUỘC (không phụ thuộc AI có narrate hay không) — MỚI
2026-08-06 vòng 3** `/design-review`, đóng gap BLOCKING [ux-designer]
"kênh diegetic duy nhất trước đây dùng chữ 'ĐƯỢC PHÉP' (permission),
không phải 'PHẢI' — một thay đổi công thức thật (Regen suy giảm, hao
tổn cộng dồn) có thể xảy ra mà KHÔNG có cách nào đáng tin cậy để người
chơi biết tại sao, vi phạm nguyên tắc người chơi phải luôn hiểu chuyện
gì đang xảy ra": khi `exchange_id > EXHAUSTION_ONSET_EXCHANGE` (cửa sổ
kiệt sức đã kích hoạt), số thứ tự pha (`exchange_id`, hiển thị trong
khối "Trạng thái giao đấu" — xem UI Requirements) đổi sang trọng lượng
chữ đậm hơn 1 bậc — cùng ngôn ngữ hình khối "con dấu" đã dùng cho chí
mạng (biến thiên trong pha, KHÔNG dùng màu accent, không phải thay đổi
vĩnh viễn). Đây là tín hiệu TĨNH tối thiểu, KHÔNG cần animation, và
KHÔNG thay thế tường thuật AI (vẫn được khuyến khích) — chỉ đảm bảo có
1 kênh chắc chắn xảy ra dù AI không nhắc tới.

**Ví dụ**: `EXHAUSTION_ONSET_EXCHANGE=40`, `exchange_id=120`,
`TECHNICAL_EXCHANGE_CAP=200`, `max_HP=200`, `EXHAUSTION_DRAIN_PCT=0.05`
→ `exhaustion_progress = (120-40)/(200-40) = 0.5` → `exhaustion_regen_mult
=0.5` (Regen còn phân nửa hiệu lực, sau khi đã bị `HP_REGEN_CAP` chặn)
VÀ `exhaustion_drain = round(200*0.05*0.5) = 5` HP hao tổn thẳng, cộng
dồn mỗi pha còn lại của trận.

**Ví dụ biên**: `exchange_id ≤ 40` → `exhaustion_progress=0` (clamp) →
`exhaustion_regen_mult=1`, `exhaustion_drain=0`, không ảnh hưởng gì —
đúng ý đồ "trận điển hình 15-50 pha không bị tác động" (VỚI ĐIỀU KIỆN
`EXHAUSTION_ONSET_EXCHANGE` đang cấu hình thực sự lớn hơn
`CONTENT_EXCHANGE_ESTIMATE` đang dùng). `exchange_id ≥ 200` →
`exhaustion_progress=1` → `exhaustion_regen_mult=0`,
`exhaustion_drain=round(max_HP*EXHAUSTION_DRAIN_PCT)` (tối đa), Regen
vô hiệu hoàn toàn + hao tổn ở mức cao nhất ở lượt cuối cùng trước khi
D.9c có thể kích hoạt.

---

**D.5 — Chí mạng (Crit Rate → Crit Damage)**

```
is_crit = roll_uniform(rng)[0,1) < clamp(effective_CritRate(attacker), 0, 1)   # rng injected — xem quy ước RNG injection
crit_multiplier = is_crit ? max(1.0, effective_CritDamage(attacker)) : 1.0
```

| Symbol | Type | Range | Description |
|---|---|---|---|
| `effective_CritRate` | float | `[0,1]` | Xác suất chí mạng |
| `effective_CritDamage` | float | ≥1.0 (stat) | Hệ số nhân TỔNG khi chí mạng (VD 1.5 = 150%) |
| `crit_multiplier` | float | `[1.0, ∞)` | Floor tại 1.0 — chí mạng không bao giờ làm YẾU đòn |

**Output range**: `[1.0, ∞)`. Chỉ chạy khi `hit=true` (D.3) — miss thì bỏ
qua toàn bộ D.5-D.7.

**Ghi nhận CÓ CHỦ ĐÍCH (MỚI 2026-08-06 vòng 2, đóng gap `/design-review`
"D.1×D.5 CritDamage bị cứu sớm" — trước đây chỉ bị khóa ngầm qua AC-19,
không có quyết định tường minh)**: floor `max(1.0, ...)` nghĩa là
`effective_CritDamage` (sau khi bị D.1 phạt) chỉ cần rơi xuống ≤1.0 là
crit KHÔNG còn tác dụng khuếch đại — với `base_CritDamage=1.5` (ví dụ
điển hình), điều này xảy ra ngay khi `total_penalty_multiplier ≤ 1/1.5
≈ 0.667`, tức chỉ **~3 bậc chênh lệch cảnh giới đơn thuần** (thấp hơn
nhiều so với `FLOOR_TOTAL=0.05`, ngưỡng "vô hiệu hoàn toàn" của các
stat khác). Đây là hành vi ĐÃ BIẾT, không phải lỗi: build thiên Crit
Damage mất giá trị NHANH HƠN các build khác khi bị áp chế cảnh giới,
trong khi Crit RATE (`effective_CritRate`) vẫn suy giảm tuyến tính bình
thường. Giữ nguyên cho MVP (không phải blocker — không suy biến/crash,
chỉ là 1 đặc điểm cân bằng); cân nhắc lại nếu playtest cho thấy build
Crit Damage bị phạt bất công so với các build khác khi chênh cảnh
giới lớn. *(Owner: game-designer, target: playtest Vertical Slice)*

**Ví dụ**: `effective_CritRate=0.18`, roll=0.05 → `is_crit=true`;
`effective_CritDamage=1.6` → `crit_multiplier=1.6`.

---

**D.6 — Sát thương cuối (Khuếch đại × Chống chịu)**

```
pre_mitigation   = raw_damage * crit_multiplier
final_multiplier = clamp((1 + effective_Amp(attacker)) * (1 - effective_Mitigation(defender)), MIN_DMG_MULT, ∞)
defend_mult      = defender_is_defending ? (1 - DEFEND_DMG_REDUCTION_PCT) : 1.0
final_damage_raw = round(pre_mitigation * final_multiplier * defend_mult)
final_damage     = (raw_damage > 0) ? max(1, final_damage_raw) : 0
```

`defend_mult` (vòng 2 `/design-review`, thay thế cơ chế nhân
`effective_DEF`/`effective_Né` của vòng 1 — xem Core Rule #2b): `true`
khi và chỉ khi hành động của DEFENDER trong pha đó là "Phòng thủ" —
KHÔNG liên quan tới hành động của attacker.

**Sàn `max(1, ...)` MỚI vòng 3** `/design-review` (đóng gap hội tụ độc
lập bởi 2 specialist — [game-designer][systems-designer], cùng ví dụ
khác nhau): văn xuôi D.6 (Output range dưới) VÀ AC-21/AC-22 từ trước đã
khẳng định "không bao giờ về 0 tuyệt đối", nhưng công thức KHÔNG có sàn
nào bảo đảm điều đó — xác nhận bằng harness (`prototypes/combat-reference/harness.py`,
thí nghiệm Q2): với `effective_ATK` bị D.1 đè xuống `FLOOR_TOTAL` (chênh
lệch cảnh giới/trang bị ~10 bậc, kịch bản HỢP LỆ không dị thường) +
`effective_Mitigation=0.5` (không cực đoan), `final_damage` làm tròn về
đúng 0 trên **100% số đòn trúng đo được**, không phải biên hiếm — một
build Chống chịu vừa phải + chọn Phòng thủ có thể vô hiệu hóa hoàn toàn
sát thương thật nhận vào. Sàn `max(1, ...)` khớp đúng lời hứa văn xuôi
đã có sẵn, đối xứng với cách D.3/D.4/D.11 xử lý "không có tuyệt đối" ở
chỗ khác — CHỈ áp dụng khi `raw_damage>0` (giữ nguyên hành vi biên cũ
cho `effective_ATK(attacker)=0` tuyệt đối, xem AC-22).

| Symbol | Type | Range | Description |
|---|---|---|---|
| `effective_Amp` | float | ≥0 | Khuếch đại sát thương (người đánh) |
| `effective_Mitigation` | float | ≥0 (có thể >1) | Chống chịu (người đỡ) |
| `MIN_DMG_MULT` | float (knob) | 0–1 | Sàn multiplier cuối — đề xuất mặc định **0.1** |
| `defender_is_defending` | bool | {true,false} | `action_type` của defender trong CHÍNH pha đó có phải `"defend"` hay không (Core Rule #2b) |
| `DEFEND_DMG_REDUCTION_PCT` | float (knob) | 0–1 | % giảm trừ sát thương tất định khi Phòng thủ — xem Tuning Knobs |
| `defend_mult` | float | `{1.0, 1-DEFEND_DMG_REDUCTION_PCT}` | 1.0 khi defender không phòng thủ pha đó |
| `final_damage_raw` | int | `[0, ∞)` | Giá trị làm tròn TRƯỚC khi áp sàn — nội bộ, không ghi vào `locked_result` |
| `final_damage` | int | `{0} ∪ [1, ∞)` (MỚI vòng 3 — không còn `(0,1)`, tức không còn thể rơi về 0 khi `raw_damage>0`) | Sát thương thực nhận, ghi vào `locked_result.damage_dealt` |

**Output range**: `{0} ∪ [1, ∞)`. `final_damage=0` CHỈ khi `raw_damage=0`
tuyệt đối (tức `effective_ATK(attacker)=0`, biên hiếm — xem D.4).
Ngược lại, khi `raw_damage>0` (LUÔN đúng nhờ sàn `MIN_RAW_RATIO` của D.4
— tức MỌI đòn trúng thông thường), `final_damage ≥ 1` — `MIN_DMG_MULT`
+ sàn `max(1,...)` cùng đảm bảo **Chống chịu dù vượt 100% cũng không
bao giờ làm sát thương âm hay bằng 0 tuyệt đối**, không có bất tử tuyệt
đối (nhất quán "không có tuyệt đối" như D.3).

**Ví dụ**: `raw=30`, `crit_multiplier=1.6` → `pre_mit=48`;
`effective_Amp=0.1, effective_Mitigation=0.15` →
`final_mult=clamp(1.1*0.85,0.1,∞)=0.935` → `final_damage_raw=round(44.88)=45`
→ `final_damage=max(1,45)=45` (sàn không kích hoạt, giá trị không đổi).

**Ví dụ biên (sàn kích hoạt — đóng gap vòng 3)**: `effective_ATK=2.5`
(floor D.1, ví dụ biên đã công bố ở D.1) → `raw_damage=0.125` (D.4);
`effective_Mitigation=0.5`, không crit → `pre_mit=0.125`,
`final_mult=clamp(0.5,0.1,∞)=0.5` → `final_damage_raw=round(0.0625)=0`
→ **`final_damage=max(1,0)=1`** (KHÔNG còn về 0 — trước fix, đòn TRÚNG
này gây đúng 0 sát thương thật, mâu thuẫn thẳng văn xuôi D.6 tự tuyên
bố).

---

**D.7 — Lifesteal**

```
heal_attacker = round(final_damage * effective_Lifesteal(attacker))
hp'(attacker) = min(max_HP(attacker), hp(attacker) + heal_attacker)
```

| Symbol | Type | Range | Description |
|---|---|---|---|
| `effective_Lifesteal` | float | ≥0 | % sát thương gây ra hồi lại thành HP |
| `heal_attacker` | int | `[0, ∞)` | Lượng hồi — 0 tự động nếu `final_damage=0` (miss hoặc đấm vào tường) |
| `hp'(attacker)` | int | `[hp, max_HP]` | Clamp không overheal quá max HP |

**Output range**: `[hp(attacker), max_HP(attacker)]`. Tính TRÊN
`final_damage` (sát thương thực nhận sau D.6), không phải `raw_damage` —
đúng câu chữ Core Rule #3 "hồi máu theo % sát thương gây ra".

**Ví dụ**: `final_damage=45`, `effective_Lifesteal=0.1` →
`heal=round(4.5)=5`.

---

**D.8 — Chuỗi giải quyết 1 đòn đánh (kết hợp D.3–D.7)**

```
resolve_attack(attacker, defender, hp_defender, defender_is_defending, rng):
  hit = D.3(attacker, defender, rng)
  if not hit:
    return { hit:false, crit:null, damage:0, heal:0, hp_defender_after: hp_defender }
  raw          = D.4(attacker, defender)
  crit, cmult  = D.5(attacker, rng)
  final_damage = D.6(raw, cmult, attacker, defender, defender_is_defending)
  hp_defender_after = max(0, hp_defender - final_damage)
  heal = D.7(final_damage, attacker)
  return { hit:true, crit, damage:final_damage, heal, hp_defender_after }
```

`defender_is_defending` (MỚI vòng 2, xem D.6/Core Rule #2b) — do lớp
gọi (D.9) truyền vào, đọc từ `action_type` của `defender` trong CHÍNH
pha đó, KHÔNG do D.8 tự suy luận. `rng` (MỚI vòng 3, xem quy ước RNG
injection) — 1 instance DUY NHẤT nhận từ `resolve_exchange`, luồn tiếp
xuống D.3/D.5, KHÔNG tự khởi tạo.

**Output**: struct 5 field (`hit, crit, damage, heal, hp_defender_after`)
— đây là struct TRUNG GIAN nội bộ của D.8, KHÔNG phải shape cuối cùng
của `locked_result` (schema thống nhất tại Core Rule #11). Khi D.9 ghép
kết quả D.8 vào `locked_result.per_actor[actor_id]`, nó bổ sung thêm
`thuc_id`, `action_type`, `executed` (D.9 tự thêm, không phải D.8) —
KHÔNG có field `dodge` (đóng gap "AC-09 không thể thỏa mãn bởi D.8" —
`hit=false` chính là tín hiệu duy nhất cho "hụt", không có sự kiện né
tách biệt). `crit=null` khi `hit=false` (không phải `false`) — nhất
quán với sentinel 3 trạng thái đã dùng cho `r2.hit` ở D.9. Tất cả field
số đã clamp/round ở D.3–D.7. `hp_defender_after ∈ [0, hp_defender]` —
floor tại 0 (không HP âm).

---

**D.9 — Giải quyết pha giao đấu & Quy tắc ngắt sớm** (formula trung tâm
— đúng Core Rule #2/#3/#2b/#9, VIẾT LẠI 2026-08-06 vòng 2 `/design-review`
để đóng 3 gap hội tụ: (1) `ui-programmer`/`qa-lead` — pseudocode trước
đó CHỈ mô hình hóa `action_type="skill"`, không có dispatch nào cho
`"defend"`/`"flee"`, khiến Core Rule #2b/D.11 "treo" bên ngoài formula
trung tâm; (2) `qa-lead` — bug tráo `hp_after` giữa 2 actor khi ghép
`per_actor` (spread `r1`/`r2` trực tiếp theo nghĩa đen sẽ gán HP của
`second` vào `per_actor[first]` và ngược lại); (3) `systems-designer`
B2 — D.9c chưa nối tường minh, 2 cách đọc cho 2 kết quả khác nhau về
thời điểm `exhaustion_regen_mult=0` có hiệu lực thật)

```
resolve_exchange(A, B, action_type_of, thuc_id_of, player_id, rng):
  # action_type_of[X] ∈ {"skill", "defend", "flee"} — hành động ĐÃ CHỌN
  # của X trong pha này (Core Rule #2). "item" không tồn tại (Core Rule #6).
  # thuc_id_of[X]: string | "basic_attack" | null — thức CỤ THỂ mà X chọn
  # dùng pha này (null nếu action_type_of[X] ≠ "skill") — MỚI vòng 3
  # `/design-review`, đóng gap [ui-programmer] "chữ ký resolve_exchange
  # thiếu tham số mang thuc_id, trong khi D.1's skill_tier_used(C) VÀ
  # per_actor[X].thuc_id đều cần giá trị này". `thuc_id_of` được build bởi
  # lớp gọi (Core Rule #2: người chơi chọn qua UI, NPC chọn qua D.14) và
  # là NGUỒN DUY NHẤT cho `skill_tier_used(C)` — D.1 đọc trực tiếp từ đây,
  # không tự suy luận. player_id ∈ {A,B}: actor nào là NHÂN VẬT CHÍNH
  # (người chơi) trong trận này — cố định 1 lần khi trận khởi tạo, dùng
  # bởi D.9b/D.9c để dịch `nominal_winner`/`winner` (nhãn A/B trung lập)
  # sang `outcome.type` ("win"/"lose", nhãn có ý nghĩa với người chơi) —
  # đóng gap [qa-lead] "`self`/`other` dùng trong D.9b/D.9c nhưng không
  # bao giờ được khai báo là tham số". rng: RandomNumberGenerator injected
  # — xem quy ước RNG injection; MỌI lời gọi D.2/D.3/D.5/D.8/D.11/D.14 bên
  # dưới PHẢI truyền `rng` này, KHÔNG hàm nào tự khởi tạo RNG riêng (đóng
  # gap [godot-specialist] "ghi chú RNG injection không phản ánh trong
  # bất kỳ chữ ký D.x nào").

  outcome = null   # MỚI vòng 3, đóng gap [ui-programmer] "outcome không
  # được gán ở nhánh 'trận tiếp diễn bình thường' — biến chưa khởi tạo bị
  # return". Mọi nhánh bên dưới HOẶC ghi đè giá trị này (khi trận kết
  # thúc) HOẶC để nguyên `null` (khi `battle_active=true`, đúng bảng ký
  # hiệu Core Rule #11).

  # (0) Xác định thứ tự nhãn CHUẨN qua D.2 TRƯỚC — dùng làm thứ tự lặp
  #     TẤT ĐỊNH cho bước kiểm Bỏ chạy bên dưới (sửa 2026-08-06 vòng 3
  #     `/design-review`, đóng gap hội tụ độc lập bởi 4 specialist —
  #     [game-designer][systems-designer][ui-programmer][qa-lead] —
  #     "thứ tự lặp `{A,B}` không xác định khi CẢ HAI cùng chọn flee":
  #     2 implementation tuân thủ đúng D.9 trước đây có thể tiêu thụ
  #     `roll_uniform` theo thứ tự A-trước-B hay B-trước-A khác nhau,
  #     vi phạm cam kết determinism mà D.14/AC-48 vừa chốt cho toàn hệ).
  #     Đây CHỈ là nhãn thứ tự lặp, KHÔNG phải kết quả cuối cùng của
  #     first/second nếu có bên bỏ chạy thất bại (xem bước dưới):
  order_first, order_second = D.2(A, B, rng)

  # (1) Bỏ chạy có ƯU TIÊN TRƯỚC thứ tự SPD (Core Rule #9/D.11): bên chọn
  #     "flee" KHÔNG vào vòng tấn công dù thắng SPD. Lặp theo ĐÚNG thứ tự
  #     (order_first, order_second) vừa xác định:
  for X in (order_first, order_second) where action_type_of[X] == "flee":
    flee_success = D.11(X, opponent(X), rng)
    if flee_success:
      battle_active = false
      outcome = { type:"no_outcome", winner_id:null, loser_id:null }
      per_actor[X]           = { thuc_id:null, action_type:"flee", executed:true, hit:null, crit:null, damage_dealt:0, heal:0, hp_after:hp[X] }
      per_actor[opponent(X)] = { thuc_id:null, action_type:action_type_of[opponent(X)], executed:false, hit:null, crit:null, damage_dealt:0, heal:0, hp_after:hp[opponent(X)] }
      return locked_result{ exchange_id, first_id:X, second_id:opponent(X), per_actor, battle_active, outcome }
      # D.2 (đã gọi ở bước 0 CHỈ để lấy thứ tự lặp, không tính là "đã
      # resolve pha theo D.2") — D.3-D.10 KHÔNG được gọi cho pha này
      # (đúng Core Rule #8b)
  # Tới đây: KHÔNG bên nào bỏ chạy thành công. Nếu ĐÚNG 1 bên vừa "flee"
  # thất bại, đối thủ của bên đó LUÔN là `first` cho phần còn lại của pha
  # (D.11, ghi đè `order_first`/`order_second`); nếu KHÔNG bên nào chọn
  # "flee", `first`/`second` = `order_first`/`order_second` không đổi;
  # nếu CẢ HAI cùng chọn "flee" và cùng thất bại (KHÔNG hiếm — NPC Tầng 1
  # có thể tự động chọn flee đúng lúc người chơi độc lập cũng chọn flee,
  # sửa 2026-08-06 vòng 3): không bên nào tấn công pha này, `first`/
  # `second` = `order_first`/`order_second` thuần túy làm nhãn thứ tự,
  # không ảnh hưởng D.10/exhaustion_drain bên dưới (đối xứng theo Core
  # Rule #2b/D.4b, không phụ thuộc nhãn).

  first, second = <opponent của bên flee-thất-bại, nếu có> else (order_first, order_second)

  # (1) Đòn đi trước — CHỈ khi action_type_of[first] == "skill"
  if action_type_of[first] == "skill":
    r1 = D.8(first, second, hp[second], defender_is_defending = action_type_of[second]=="defend", rng)
  else:
    r1 = { hit:null, crit:null, damage:0, heal:0, hp_defender_after: hp[second] }  # defend/flee-thất-bại: không tấn công
  hp[second] = r1.hp_defender_after

  if hp[second] == 0:
    # NGẮT SỚM — đòn đi sau KHÔNG thực thi (Core Rule #2), chỉ có thể xảy ra nếu r1 vừa tấn công thật
    r2 = { hit:null, crit:null, damage:0, heal:0, executed:false, hp_defender_after: hp[first] }
    battle_active = false
    outcome = D.9b.reclassify_outcome(nominal_winner=first, nominal_loser=second, player_id)
  else:
    if action_type_of[second] == "skill":
      r2 = D.8(second, first, hp[first], defender_is_defending = action_type_of[first]=="defend", rng)
      r2.executed = true
    else:
      r2 = { hit:null, crit:null, damage:0, heal:0, executed:true, hp_defender_after: hp[first] }  # defend/flee-thất-bại
    hp[first] = r2.hp_defender_after
    if hp[first] == 0:
      battle_active = false
      outcome = D.9b.reclassify_outcome(nominal_winner=second, nominal_loser=first, player_id)
    else:
      battle_active = true
      hp[first]  = D.10(first,  hp[first])
      hp[second] = D.10(second, hp[second])
      # (D.4b) hao tổn cộng dồn — VIẾT LẠI 2026-08-06 vòng 3
      # `/design-review`, đóng gap hội tụ độc lập bởi 2 specialist
      # [systems-designer][ui-programmer] "cấu trúc if/else tuần tự với
      # early-return khiến `first` LUÔN bị kiểm drain trước `second` —
      # xác nhận bằng harness số (`prototypes/combat-reference/harness.py`,
      # thí nghiệm Q3b): trong trận đối kháng gương (2 bên thống kê giống
      # hệt nhau), nhân vật SPD cao hơn (luôn là `first`) THUA TẤT ĐỊNH
      # 100% (0/300 trận đo được), vi phạm thẳng lời hứa 'đối xứng, không
      # có khái niệm đối phương chưa kịp ra đòn' mà D.4b tự tuyên bố.
      # FIX: tính CẢ HAI lượng drain KHÔNG ĐIỀU KIỆN trước khi kiểm bất kỳ
      # bên nào về 0 — sau fix, harness đo lại cho kết quả 52.3%/47.7%
      # (công bằng trong nhiễu thống kê của 300 mẫu, so với 0%/100% trước
      # fix). `hp_pct_pre_drain` (đã tồn tại từ vòng 2 nhưng là dead code
      # do cấu trúc early-return cũ) giờ THẬT SỰ được dùng làm tiebreak
      # khi cả 2 cùng về 0:
      hp_pct_pre_drain = { first: hp[first]/max_HP(first), second: hp[second]/max_HP(second) }
      d_first  = exhaustion_drain(first)
      d_second = exhaustion_drain(second)
      hp[first]  = max(0, hp[first]  - d_first)
      hp[second] = max(0, hp[second] - d_second)
      first_dead  = (hp[first]  == 0)
      second_dead = (hp[second] == 0)
      if first_dead AND second_dead:
        # "Cùng kiệt sức" — trường hợp DUY NHẤT trong toàn hệ 2 bên cùng
        # về 0 trong 1 bước được phép xảy ra (D.4b), nay THỰC SỰ reachable
        # nhờ fix trên (trước đây là dead code — xem ghi chú vòng 3 ở
        # trên). Tiebreak dùng `hp_pct_pre_drain` (đo NGAY TRƯỚC drain của
        # pha này, không phải HP hiện tại — cả 2 đều đã về 0):
        battle_active = false
        if hp_pct_pre_drain.first != hp_pct_pre_drain.second:
          winner = (hp_pct_pre_drain.first > hp_pct_pre_drain.second) ? first : second
        else:
          winner = coin_flip(rng)   # trùng tuyệt đối — cực hiếm, tái dùng D.2's coin_flip
        loser = opponent(winner)
        outcome = { type: (winner==player_id ? "win" : "lose"), winner_id:winner, loser_id:loser }
      elif first_dead:
        battle_active = false; outcome = D.9b.reclassify_outcome(nominal_winner=second, nominal_loser=first, player_id)
      elif second_dead:
        battle_active = false; outcome = D.9b.reclassify_outcome(nominal_winner=first, nominal_loser=second, player_id)
      # else: cả 2 sống sót drain — battle_active giữ nguyên true, outcome
      # giữ nguyên null (đã khởi tạo ở đầu hàm).

  # (2) Ghép TƯỜNG MINH vào locked_result.per_actor — KHÔNG spread trực
  #     tiếp r1/r2 (đóng gap "tráo hp_after giữa 2 actor"): r1 nhắm vào
  #     `second`, r2 nhắm vào `first`, nên `hp_after` của MỖI actor phải
  #     lấy từ struct kết quả đòn TẤN CÔNG VÀO actor đó, không phải struct
  #     actor đó tự tạo ra:
  per_actor[first]  = { thuc_id: (action_type_of[first]=="skill") ? thuc_id_of[first] : null,
                         action_type: action_type_of[first],
                         executed: true,   # `first` KHÔNG BAO GIỜ bị ngắt sớm (đòn của nó luôn resolve trước) — literal `true`, không phải ternary vô nghĩa (dọn dẹp 2026-08-06 vòng 3, đóng gap [qa-lead][ui-programmer] "ternary `? true : true` gây khó hiểu")
                         hit: r1.hit, crit: r1.crit, damage_dealt: r1.damage, heal: r1.heal,
                         hp_after: hp[first] }
  per_actor[second] = { thuc_id: (action_type_of[second]=="skill") ? thuc_id_of[second] : null,
                         action_type: action_type_of[second],
                         executed: r2.executed,
                         hit: r2.hit, crit: r2.crit, damage_dealt: r2.damage, heal: r2.heal,
                         hp_after: hp[second] }
  # Ngoại lệ schema (MỚI vòng 3, đóng gap [ui-programmer] "thuc_id bị ép
  # null trong nhánh flee-thành-công dù đối thủ đã chọn action_type=
  # 'skill'"): ở nhánh flee-thành-công (bước 0 ở trên), `per_actor[
  # opponent(X)].thuc_id` LUÔN `null` bất kể `action_type_of[opponent(X)]`
  # — đây là quyết định CÓ CHỦ ĐÍCH (thức ĐÃ CHỌN nhưng CHƯA THỰC THI của
  # đối thủ không lộ ra UI/dữ liệu, vì hành động đó chưa từng resolve),
  # không phải case thứ 3 nào khác của "null nếu phòng thủ/bỏ chạy".

  # (3) D.9c — nối TƯỜNG MINH (đóng gap "2 cách đọc khác nhau", vòng 2):
  #     kiểm tra SAU KHI pha này đã resolve XONG hoàn toàn (kể cả D.10/
  #     exhaustion_drain ở trên) — KHÔNG kiểm tra ở đầu state như
  #     `external_abort_signal` (Core Rule #13). Nghĩa là pha đúng
  #     `exchange_id=TECHNICAL_EXCHANGE_CAP` LUÔN được resolve đầy đủ
  #     (exhaustion_regen_mult=0/exhaustion_drain tối đa CÓ hiệu lực thật)
  #     TRƯỚC KHI D.9c có cơ hội can thiệp:
  if battle_active == true AND exchange_id >= TECHNICAL_EXCHANGE_CAP:
    battle_active, outcome = D.9c.apply(A, B, player_id, rng)   # có thể ghi đè outcome ở trên

  return locked_result{ exchange_id, first_id:first, second_id:second, per_actor, battle_active, outcome }
  # KHÔNG có field `hp` cấp ngoài — HP đã nằm trong per_actor[*].hp_after
  # (đóng gap "D.9 tự ý trả thêm field không có trong schema Core Rule #11")
```

| Symbol | Type | Range | Description |
|---|---|---|---|
| `r1`, `r2` | struct (nội bộ D.9) | — | Kết quả D.8 (hoặc struct "không tấn công" cho defend/flee) — KHÔNG phải shape cuối, xem ghép TƯỜNG MINH vào `per_actor` ở bước (2) |
| `r2.executed` | bool | {true,false} | `false` CHỈ khi bị ngắt sớm bởi đòn đi trước (Core Rule #2) — phân biệt với miss (`r2.hit=null`, không phải `false`); defend/flee LUÔN `executed=true` |
| `r2.hit = null` | sentinel | {null,true,false} | Trạng thái thứ 3: "chưa từng ra đòn" (ngắt sớm HOẶC action_type≠"skill"), KHÔNG phải "ra đòn nhưng trượt" |
| `battle_active` | bool | {true,false} | Khớp field `locked_result.battle_active` (Core Rule #11) |
| `outcome` | struct | {win/lose/no_outcome} hoặc `null` | `null` nếu `battle_active=true` (trận tiếp tục) — khởi tạo `null` đầu hàm (MỚI vòng 3), chỉ ghi đè khi trận kết thúc |
| `player_id` | enum {A,B} | — | Actor đóng vai người chơi trong trận này — tham số MỚI vòng 3, dùng để dịch `nominal_winner`/`winner` (A/B trung lập) sang `outcome.type` ("win"/"lose") ở D.9b/D.9c |
| `thuc_id_of` | dict {A,B} → thuc_id\|null | — | Thức CỤ THỂ mỗi actor chọn dùng pha này — tham số MỚI vòng 3, nguồn cho `per_actor[X].thuc_id` VÀ `skill_tier_used(C)` (D.1) |
| `rng` | RandomNumberGenerator | — | Instance injected DUY NHẤT cho toàn pha — tham số MỚI vòng 3, xem quy ước RNG injection |

**Output**: `hp[A], hp[B] ∈ [0, max_HP]` luôn; `battle_active` xác định rõ
ràng mọi trường hợp, không có pha "dở dang"; `per_actor[X].hp_after`
LUÔN đúng theo `X`, không tráo (xem bước ghép (2) ở trên).

**Ví dụ 1 (không ngắt, cả 2 dùng thức)**: NPC đi trước (D.2), đánh
trúng, `final_damage=45`, player hp 50→`max(0,5)=5` (≠0) → player's đòn
THỰC THI → trúng, `final_damage=30`, npc hp 40→10 (≠0) → cả 2 sống sót
D.10 (Regen) VÀ `exhaustion_drain` (nếu pha đã qua
`EXHAUSTION_ONSET_EXCHANGE`, tính KHÔNG ĐIỀU KIỆN cho cả 2 — sửa vòng 3,
xem D.9's ghi chú "hao tổn cộng dồn") → `battle_active=true`,
`outcome=null` → `per_actor[player_id].hp_after=5` (sau D.10/drain nếu
áp dụng), `per_actor[npc_id].hp_after=10` (đúng theo actor, không tráo).

**Ví dụ 2 (ngắt sớm — đóng đúng quyết định 3B)**: NPC đi trước,
`final_damage=60`, player hp 50→`max(0,-10)=0` → **player's đòn KHÔNG
thực thi** (`r2={hit:null, executed:false}`) → `battle_active=false`,
`outcome=D.9b.reclassify_outcome(nominal_winner=npc_id, nominal_loser=
player_id, player_id)` — nếu `is_spar_friendly=false` HOẶC parity gate
không thỏa, kết quả `{type:"lose", winner_id:npc_id, loser_id:player_id}`
(từ góc nhìn người chơi — `type` phụ thuộc `player_id`, xem D.9b) → không
có D.10/drain pha này → `per_actor[player_id].hp_after=0`.

**Ví dụ 3 (defend — MỚI vòng 2)**: `first` dùng thức, `final_damage`
trước phòng thủ `=45`; `second` chọn "Phòng thủ" (`action_type_of
[second]="defend"`) → `defender_is_defending=true` truyền vào D.8/D.6 →
`final_damage=round(45×0.65)=29` (với `DEFEND_DMG_REDUCTION_PCT=0.35`)
→ `hp[second]` giảm 29, KHÔNG phải 45; `second` không có đòn tấn công
(`r2={hit:null, damage:0, executed:true}`, `action_type="defend"`).

---

**D.9b — Hòa giao hữu: Parity Gate & Phân loại lại** (sửa 2026-08-03,
đóng Core Rule #7 ngoại lệ + Core Rule #8(a) — chỉ áp dụng
`is_spar_friendly=true`)

```
# Tính 1 LẦN khi trận khởi tạo, is_spar_friendly=true, cache suốt trận:
parity_diff(A,B)      = |Lực_chiến(A) - Lực_chiến(B)| / max(Lực_chiến(A), Lực_chiến(B), 1)
spar_parity_eligible  = is_spar_friendly
                         AND NOT (Lực_chiến(A)==0 AND Lực_chiến(B)==0)
                         AND (parity_diff(A,B) <= SPAR_PARITY_TOLERANCE)

# Gọi từ CẢ HAI nhánh HP==0 của D.9, THAY cho outcome={winner,loser} gốc:
reclassify_outcome(nominal_winner, nominal_loser, player_id):
  # player_id — MỚI vòng 3 `/design-review`, đóng gap [qa-lead] "`self`
  # dùng ở dòng cuối nhưng không bao giờ được khai báo tham số, cũng
  # không có quy ước nào định nghĩa nó" — player_id là actor A/B đóng vai
  # NGƯỜI CHƠI trong trận này (cố định từ lúc khởi tạo, truyền xuống từ
  # `resolve_exchange`, xem D.9). "self" cũ đã bị xoá khỏi công thức.
  hp_pct(C) = float(hp(C)) / max(max_HP(C), 1)   # ÉP KIỂU float() TƯỜNG MINH TRƯỚC KHI CHIA — bắt buộc, xem D.4b/Tuning Knobs (sửa 2026-08-06 vòng 3, đóng gap [godot-specialist] "int/int cắt cụt trong GDScript, hp/max_HP đều khai int — nếu không ép kiểu, hp_pct gần như LUÔN đọc 0, khiến parity gate kích hoạt sai gần như mọi lần"). Mẫu số floor tại 1 — xem tiền điều kiện dưới
  if spar_parity_eligible AND hp_pct(nominal_winner) <= SPAR_LOW_HP_THRESHOLD:
    return { type:"no_outcome", winner_id:null, loser_id:null }
  else:
    return { type: (nominal_winner==player_id ? "win" : "lose"),
             winner_id: nominal_winner, loser_id: nominal_loser }
```

**Tiền điều kiện `max_HP(C) > 0`** (MỚI vòng 2, cùng gap `systems-designer`
B3 nêu ở D.9c — xem ghi chú đầy đủ ở đó, áp dụng y hệt cho `hp_pct` ở
đây).

| Symbol | Type | Range | Description |
|---|---|---|---|
| `Lực_chiến(A)`, `Lực_chiến(B)` | float | **≥0** (D.13, SỬA vòng 2 — chặn cứng không âm tại nguồn, xem D.13) | Tính 1 lần đầu trận |
| `parity_diff` | float | `[0,1]` (SỬA vòng 3 — trước ghi `[0,1)`, nhưng khi 1 bên `Lực_chiến=0` và bên kia `>0`, `parity_diff = X/max(X,1) = 1.0` đúng — biên đóng, không phải mở; đóng gap [systems-designer] "range tự khai sai") | Chênh lệch tương đối; mẫu số floor tại 1 (tránh chia 0) |
| `SPAR_PARITY_TOLERANCE` | float (knob) | 0–1 | Mặc định **0.15** |
| `spar_parity_eligible` | bool | — | Cache 1 lần/trận, không tính lại mỗi pha; `false` cứng nếu CẢ HAI `Lực_chiến=0` (coi là chưa đủ dữ liệu, KHÔNG eligible) |
| `nominal_winner/loser` | enum {A,B} | — | Kết quả D.9 gốc TRƯỚC khi D.9b can thiệp |
| `player_id` | enum {A,B} | — | Actor đóng vai người chơi trong trận này — MỚI vòng 3, xem ghi chú `reclassify_outcome` |
| `hp_pct(C)` | float | `[0,1]` | HP% tại thời điểm trận kết luận — bên thua LUÔN =0 (chính là điều kiện D.9 vừa xác định), chỉ cần kiểm bên thắng. `max_HP(C)` PHẢI `>0` (xem tiền điều kiện trên). **Tính bằng `float(hp(C))/max(...)` — KHÔNG dùng `int/int`** (xem `reclassify_outcome`) |
| `SPAR_LOW_HP_THRESHOLD` | float (knob) | 0–1 | Mặc định **0.15** |
| `outcome` | struct | `{win/lose}` hoặc `{no_outcome}` | Ghi vào `locked_result.outcome`, schema Core Rule #11 KHÔNG đổi |

**Output range**: khi `is_spar_friendly=false`, `spar_parity_eligible`
luôn `false` → D.9b không bao giờ can thiệp, hành vi giống hệt D.9 gốc
— đúng ranh giới hẹp của Core Rule #7's ngoại lệ.

**Ví dụ dương (hòa)**: `Lực_chiến(A)=310, Lực_chiến(B)=280` →
`parity_diff = 30/310 ≈ 0.097 ≤ 0.15` → eligible. Pha 12, A hạ B về 0,
nhưng `hp_pct(A) ≈ 0.082 ≤ 0.15` lúc đó → `outcome=no_outcome`.

**Ví dụ âm 1 (không đủ parity)**: `Lực_chiến(A)=400, Lực_chiến(B)=280`
→ `parity_diff ≈ 0.30 > 0.15` → không eligible → `outcome=win(A)/lose(B)`
bình thường dù `hp_pct(A)` thấp thế nào.

**Ví dụ âm 2 (đủ parity nhưng thắng khỏe)**: parity như ví dụ dương,
nhưng `hp_pct(A)=0.55` lúc kết luận → không thỏa `SPAR_LOW_HP_THRESHOLD`
→ `outcome=win(A)/lose(B)` bình thường, dù là giao hữu.

**Ví dụ biên 0/0**: cả 2 `Lực_chiến=0` → `spar_parity_eligible=false`
CỨNG (khác D.13's `estimate_ratio` coi 0/0 là "N/A" — ở đây là "không
đủ điều kiện", không phải sentinel hiển thị) → không bao giờ hòa qua
đường này.

---

**D.9c — Tiebreak khi chạm trần kỹ thuật `TECHNICAL_EXCHANGE_CAP`**
(sửa 2026-08-03, van an toàn KỸ THUẬT thuần túy — không phải cơ chế
gameplay)

```
apply(A, B, player_id, rng) -> (battle_active, outcome):     # ĐƯỢC GỌI TƯỜNG MINH từ D.9, bước (3)
  # Tiền điều kiện (chỉ được gọi khi): exchange_id >= TECHNICAL_EXCHANGE_CAP AND battle_active == true
  # player_id, rng — MỚI vòng 3 `/design-review`, cùng gap [qa-lead] đã
  # đóng ở D.9b: "self"/"other" trước đây KHÔNG được khai báo tham số ở
  # đâu cả. player_id = actor đóng vai người chơi (xem D.9b); rng = RNG
  # injected, dùng bởi `tiebreak_winner`'s `coin_flip`.
  if is_spar_friendly:
    outcome = { type:"no_outcome", winner_id:null, loser_id:null }
  else:
    winner = tiebreak_winner(A, B, rng)
    loser  = opponent(winner)   # actor còn lại trong {A,B} — thay "other" (không khai báo) vòng 3
    outcome = { type: (winner==player_id ? "win" : "lose"),
                winner_id: winner, loser_id: loser }
  return (false, outcome)

tiebreak_winner(A, B, rng):
  hp_pct(C) = float(hp(C)) / max(max_HP(C), 1)   # ÉP KIỂU float() TƯỜNG MINH — cùng fix bắt buộc như D.9b/D.4b, sửa 2026-08-06 vòng 3 (đóng gap [godot-specialist] "int/int khiến hp_pct gần như LUÔN đọc bằng nhau (cả 2 truncate về 0 trừ khi 1 bên nguyên máu), khiến coin_flip bắn thường xuyên hơn nhiều so với ví dụ GDD tự đưa ra"). Mẫu số floor tại 1
  if hp_pct(A) != hp_pct(B):  return argmax(hp_pct)
  else:                        return coin_flip(rng)   # tái dùng D.2's coin_flip, cùng rng injected — sửa 2026-08-06 vòng 2/3
```

**Tiền điều kiện `max_HP(C) > 0`** (MỚI vòng 2 `/design-review`, đóng
gap `systems-designer` B3 — "D.9b/D.9c dùng `hp/max_HP` nhưng không tự
khai mẫu số=0 trong bảng ký hiệu của CHÍNH chúng, đẩy trách nhiệm sang
D.10, formula khác, trên đúng con đường code quyết định thắng/thua"):
`max_HP(C)` được ĐẢM BẢO `>0` bởi D.10/Character Card ở thượng nguồn —
Combat KHÔNG re-validate; `max(max_HP(C), 1)` ở `tiebreak_winner` là
lớp phòng vệ THÊM (defense-in-depth), không phải cách xử lý chính thức
cho input sai — nếu `max_HP(C)=0` lọt tới đây, đó là bug dữ liệu ở hệ
khác, không phải hành vi hợp lệ của Combat.

| Symbol | Type | Range | Description |
|---|---|---|---|
| `TECHNICAL_EXCHANGE_CAP` | int (knob, kỹ thuật) | >0, VÀ `CAP - EXHAUSTION_ONSET_EXCHANGE ≥ 120` (ràng buộc chéo #2, xem Tuning Knobs) | Trần runtime cứng, mặc định **200** — KHÔNG hiển thị người chơi, chỉ tránh runaway `narration_call` cost. Với D.4b (kiệt sức lũy tiến), nhánh này CHỈ còn là van an toàn cho cấu hình knob nằm ngoài ràng buộc chéo — 96/108 tổ hợp Safe Range hội tụ HP=0 thật trước khi chạm cap (xác nhận bằng harness SỐNG TRONG REPO, xem D.4b) |
| `hp_pct(C)` | float | `[0,1]` | Tiebreak bậc 1 — `max_HP(C)` PHẢI `>0` (xem tiền điều kiện trên) |
| `coin_flip()` | bool→{A,B} | 50/50 | Tiebreak bậc 2 (hp_pct trùng tuyệt đối) — tái dùng đúng cơ chế D.2 (sửa 2026-08-06: dùng `roll_uniform` injected, KHÔNG tự seed theo `exchange_id` — đóng gap "2 lời gọi coin_flip trong cùng exchange_id tương quan với nhau"), KHÔNG dùng Lực chiến (giữ Core Rule #7 sạch ở nhánh này) |

**Output range**: ngoài `spar_friendly`, D.9c luôn ra đúng 1 `win`/`lose`
— không nhánh nào của D.9c trả `no_outcome` khi `is_spar_friendly=false`.
Đóng trực tiếp yêu cầu "còn lại bắt buộc phân thắng thua".

**Ví dụ**: `TECHNICAL_EXCHANGE_CAP=200` chạm, `is_spar_friendly=false`,
`hp_pct(A)=0.31, hp_pct(B)=0.18` → A thắng (hp_pct cao hơn), không cần
coin_flip.

**Ví dụ biên (hp_pct trùng tuyệt đối)**: `hp_pct(A)=hp_pct(B)=0.20`
chính xác → `coin_flip()` quyết định qua `roll_uniform` mock — độc lập
với lần gọi `coin_flip()` khác (nếu có) trong cùng `exchange_id`, và
độc lập giữa các trận khác nhau dù cùng chạm `TECHNICAL_EXCHANGE_CAP`.

---

**D.10 — HP Regen (thụ động, cuối pha, có điều kiện)** (SỬA 2026-08-06
vòng 2 — thêm `HP_REGEN_CAP`, xem D.4b)

```
regen_pct_used(C) = min(effective_HPRegen(C), HP_REGEN_CAP)
hp'(C) = min(max_HP(C), hp(C) + round(max_HP(C) * regen_pct_used(C) * exhaustion_regen_mult))
```

Chỉ được gọi từ nhánh `battle_active=true` của D.9 — **không chạy nếu
pha vừa kết thúc trận** (đúng Core Rule #3 đã sửa). `exhaustion_regen_mult`
(D.4b) nhân thêm vào Regen — mặc định = 1 (không ảnh hưởng) cho mọi
trận dưới `EXHAUSTION_ONSET_EXCHANGE=40` pha, chỉ giảm dần ở trận kéo
dài bất thường. Sau D.10, `exhaustion_drain(C)` (D.4b) trừ THẲNG thêm
vào `hp'(C)` — xem thứ tự áp dụng đầy đủ trong pha ở D.4b (D.8×2 → D.10
→ `exhaustion_drain`).

| Symbol | Type | Range | Description |
|---|---|---|---|
| `effective_HPRegen` | float | `[0,1]` | % max HP hồi mỗi pha (từ D.1) — trước khi bị `HP_REGEN_CAP` chặn |
| `HP_REGEN_CAP` | float (knob, MỚI vòng 2) | 0–1, Safe Range **0.02–0.05** | Trần cứng lên `effective_HPRegen` trước khi nhân `exhaustion_regen_mult` — đề xuất mặc định **0.05**, nhất quán với `MIN_RAW_RATIO`/`FLOOR_TOTAL`. Không có trần này, 1 build HPRegen cao (hợp lệ theo range `[0,1]` đã khai) có thể đánh bại cả sàn chip D.4 lẫn `exhaustion_drain` (D.4b) — xác nhận bằng harness |
| `regen_pct_used(C)` | float | `[0, HP_REGEN_CAP]` | `effective_HPRegen` sau khi bị chặn trần |
| `exhaustion_regen_mult` | float | `[0,1]` | Từ D.4b — 1 mặc định, giảm dần khi trận kéo dài quá `EXHAUSTION_ONSET_EXCHANGE` |
| `max_HP(C)` | int | >0 | KHÔNG bị D.1 phạt (xem D.1) |
| `hp'(C)` | int | `[hp(C), max_HP(C)]` | Không overheal — TRƯỚC khi `exhaustion_drain` (D.4b) trừ tiếp |

**Ví dụ (trận điển hình)**: `max_HP=200`, `effective_HPRegen=0.05`
(≤`HP_REGEN_CAP`, không bị chặn), `exhaustion_regen_mult=1`
(exchange_id≤40) → regen=10; `hp=150` → `hp'=160`. Ví dụ overheal-cap:
`hp=195` → `hp'=min(200,205)=200`. Ví dụ `HP_REGEN_CAP` kích hoạt:
`effective_HPRegen=0.5` (build cao) → `regen_pct_used=min(0.5,0.05)=0.05`
— hành vi giống hệt build HPRegen=0.05 bình thường, không được lợi từ
việc đầu tư HPRegen vượt trần.
**Ví dụ (trận kiệt sức)**: cùng số liệu nhưng `exchange_id=120` →
`exhaustion_regen_mult=0.5` → regen=`round(200*0.05*0.5)=5`; `hp=150` →
`hp'=155`; sau đó `exhaustion_drain(C)=round(200*0.05*0.5)=5` (D.4b) trừ
tiếp → `hp` cuối pha = `150`.

---

**D.11 — Xác suất bỏ chạy thành công**

```
P_flee(fleeing, opponent) = clamp(0.5 + K_FLEE * (effective_SPD(fleeing) - effective_SPD(opponent)), P_MIN_FLEE, P_MAX_FLEE)
flee_success = roll_uniform(rng)[0,1) < P_flee   # rng injected — xem quy ước RNG injection
```

| Symbol | Type | Range | Description |
|---|---|---|---|
| `K_FLEE` | float (knob) | >0 | Đề xuất mặc định **0.01** (cùng dạng D.3, tune độc lập) |
| `P_MIN_FLEE`, `P_MAX_FLEE` | float (knob) | 0–1 | Đề xuất mặc định **0.05 / 0.95** |
| `flee_success` | bool | {true,false} | — |

**Output range**: `[P_MIN_FLEE, P_MAX_FLEE]` — cùng lý do D.3, không có
bỏ chạy chắc chắn thành công/thất bại. `effective_SPD` bằng nhau (kể cả
cả 2 = 0) → diff=0 → `P_flee=0.5`, không lỗi (cùng cơ chế hiệu số, không
chia).

**Tương tác với D.9 (Core Rule #9)**: nếu `flee_success=false`, pha đó
chỉ có ĐỐI THỦ ra đòn — bên bỏ chạy không tấn công (không phải hoán đổi
thứ tự D.2, đơn giản là hành động của họ trong pha này là "bỏ chạy thất
bại", không phải "tấn công"), D.9 chạy với `first=opponent`, và vế
"second" là bên vừa bỏ chạy nhưng KHÔNG thực hiện đòn tấn công (tương tự
nhánh `executed:false` nhưng vì lý do khác — chọn hành động khác, không
phải bị ngắt sớm). Nếu `flee_success=true`, trận kết thúc ngay, không
tính là 1 pha giao đấu bình thường (đúng Core Rule #8b).

**Ví dụ**: `effective_SPD(player)=32.5, effective_SPD(npc)=40` →
diff=-7.5 → `P_flee=0.425` → roll 0.5 → 0.5 ≥ 0.425 → thất bại.

---

**D.12 — `max_invocations_per_battle`** (đóng AC-11 BLOCKED của
`equipment-skill-data-system.md`)

```
max_invocations_per_battle = ceil(CONTENT_EXCHANGE_ESTIMATE / max_known_skills_per_character)
```

| Symbol | Type | Range | Description |
|---|---|---|---|
| `CONTENT_EXCHANGE_ESTIMATE` | int (knob, MỚI — Combat sở hữu; đổi tên từ `MAX_EXCHANGE_COUNT` 2026-08-03, xem Open Questions) | >0 | Ước tính THIẾT KẾ số pha điển hình/trận, CHỈ dùng cho content-sufficiency (`is_pool_sufficient`) — KHÔNG còn là trần runtime nào (đã tách khỏi `TECHNICAL_EXCHANGE_CAP`, D.9c) — mặc định **30**, giữ nguyên giá trị cũ để `max_invocations_per_battle` KHÔNG đổi |
| `max_known_skills_per_character` | int (registry, LOCKED) | =6 | Từ `equipment-skill-data-system.md`, không đổi |
| `max_invocations_per_battle` | int | ≥1 | Hằng số THIẾT KẾ, tính 1 lần, không tính lại theo trận cụ thể |

`= ceil(30/6) = 5` — **giá trị không đổi** so với trước sửa đổi
2026-08-03; `equipment-skill-data-system.md` AC-11 không bị ảnh hưởng.

**Output**: hằng số nguyên duy nhất áp dụng cho MỌI kỹ năng, không phải
per-battle runtime value — đây là mục tiêu content-authoring ("mỗi kỹ
năng nên có đủ thức để chịu được worst-case luân phiên đều 6 kỹ năng
trong 1 trận dài tới trần an toàn"), KHÔNG phải giới hạn runtime chặn
hành động (giới hạn thật là "không lặp thức" của Combat Core Rule #5, đã
tự nhiên bị chặn bởi `thuc_count` của mỗi kỹ năng).

**Đóng AC-11**: `is_pool_sufficient(skill) = thuc_count(skill) >= 5`.

**Ghi chú quan trọng — không phải mâu thuẫn**: registry
`min_thuc_per_skill=3` (LOCKED) nghĩa là kỹ năng author ở MỨC TỐI THIỂU
sẽ cho `is_pool_sufficient=false` (3<5). Đây KHÔNG phải lỗi cần sửa
`min_thuc_per_skill` — theo đúng Edge Cases của Equipment GDD,
`is_pool_sufficient=false` chỉ là CẢNH BÁO AUTHORING, không chặn runtime;
khi 1 kỹ năng hết thức khả dụng giữa trận, Combat Core Rule #5 đã định
nghĩa fallback: dùng "Đánh thường" (bậc riêng, tự động "đã học" theo mọi
`weapon_type`) — và tại đây làm rõ dứt điểm: **"Đánh thường" được MIỄN
TRỪ hoàn toàn khỏi `max_invocations_per_battle` và khỏi quy tắc
không-lặp-thức** (số lần dùng không giới hạn), đúng nguyên văn "không
chặn hành động" của Equipment GDD.

---

**D.13 — Điểm Chỉ số & Tỉ lệ ước tính Lực chiến trước trận**

```
Điểm_Chỉ_Số(C) = w_HP·HP + w_ATK·ATK + w_DEF·DEF + w_SPD·SPD + w_ACC·ACC + w_Né·Né
                + w_CR·(CritRate·100) + w_CD·(max(0, CritDamage-1)·100)
                + w_AMP·(Amp·100) + w_MIT·(Mitigation·100)
                + w_LSTL·(Lifesteal·100) + w_REGEN·(HPRegen·100)

Lực_chiến(C) = max(0, Điểm_Chỉ_Số(C) + Điểm_Kỹ_Năng(C) + Điểm_Trang_Bị(C))

estimate_ratio(self, opponent):
  if Lực_chiến(self) == 0 AND Lực_chiến(opponent) == 0:  return "N/A"
  if Lực_chiến(opponent) == 0:                            return "+∞"
  else:                                                    return Lực_chiến(self) / Lực_chiến(opponent)
```

**SỬA 2026-08-06 vòng 2** (đóng gap `systems-designer` R1 — "`Lực_chiến`
có thể âm vì `base_CritDamage<1` không bị cấm ở nguồn, làm `parity_diff`
[D.9b] vượt chính range `[0,1)` nó tự khai"): 2 lớp chặn ĐỘC LẬP, không
phụ thuộc invariant từ hệ khác — (a) `max(0, CritDamage-1)` chặn ngay
tại số hạng duy nhất có thể âm (thay vì giả định `base_CritDamage≥1.0`
được đảm bảo ở Equipment/Character Card — Combat không re-validate input
ngoài); (b) `Lực_chiến(C) = max(0, ...)` chặn TỔNG một lần nữa ở tầng
ngoài cùng, phòng trường hợp `w_*` âm hoặc số hạng khác âm ngoài dự
liệu. Mọi số hạng khác của `Điểm_Chỉ_Số` đều `≥0` theo range đã khai
(HP/ATK/DEF/SPD/ACC/Né/CritRate/Amp/Mitigation/Lifesteal/HPRegen ≥0),
nên với 2 lớp chặn này, `Lực_chiến(C) ∈ [0,∞)` LUÔN đúng, không phụ
thuộc giả định ngoài phạm vi Combat.

| Symbol | Type | Range | Description |
|---|---|---|---|
| `HP, ATK, DEF, SPD, ACC, Né` | float | 0–∞ | Chỉ số GỐC (base), không phải effective — Điểm Chỉ số hiển thị năng lực TIỀM NĂNG, không phải sau áp chế 1 trận cụ thể |
| `CritRate, CritDamage, Amp, Mitigation, Lifesteal, HPRegen` | float | như D.1–D.10 | Nhân ×100 để quy về cùng thang "điểm" với chỉ số phẳng |
| `w_*` | float (knob) | ≥0 | Trọng số từng chỉ số — đề xuất mặc định **1** cho mọi chỉ số TRỪ `w_HP = 0.25`* |
| `Điểm_Kỹ_Năng(C)`, `Điểm_Trang_Bị(C)` | float | 0–∞ (external) | Sở hữu bởi hệ khác (đã Designed) — Combat coi là input mờ, mặc định 0 nếu chưa có |
| `Điểm_Trang_Bị(C)` phạm vi (làm rõ 2026-08-07, theo yêu cầu người dùng) | — | — | Tính TRÊN TRANG BỊ ĐANG MẶC (`equipped_weapon_id` + giáp, nếu Equipment & Skill Data System mở rộng) — **KHÔNG bao gồm vật phẩm tiêu hao** (`combat_item_id`). Nhất quán với Core Rule #6 (vật phẩm chiến đấu đã cắt khỏi MVP, field `combat_item_id` chỉ dành sẵn cho tương lai, Combat không đọc). `Lực_chiến`/CP hiển thị trước trận CHỈ phản ánh 3 nguồn: chỉ số nhân vật (`Điểm_Chỉ_Số`), kỹ năng đã học (`Điểm_Kỹ_Năng`), trang bị đang mặc (`Điểm_Trang_Bị`) — không có nguồn thứ 4 nào từ vật phẩm. |
| `estimate_ratio` | float \| sentinel | `(0,∞)` hoặc `{"N/A","+∞"}` | CHỈ dùng hiển thị ước tính trước trận — **KHÔNG BAO GIỜ dùng để quyết định thắng/thua** (Core Rule #7) |

*`w_HP=0.25` là **placeholder tạm** vì HP thường có thang giá trị lớn
hơn nhiều lần các chỉ số khác trong ví dụ minh họa — trọng số thật cần
đối chiếu lại khi EXP & Realm Progression (đã Designed) định nghĩa
đường cong tăng trưởng chỉ số thật. Cần ghi vào Open Questions.

**Output range**: `estimate_ratio ∈ (0,∞)` bình thường, hoặc sentinel
`"N/A"`/`"+∞"` ở biên. **Đóng trực tiếp test case "Lực chiến 0/0"**: khi
cả 2 bên Lực chiến = 0 (VD 2 NPC/nhân vật chưa gán chỉ số nào), trả về
`"N/A"` — không hiển thị `1.0` giả tạo (tránh ngộ nhận "ngang sức" khi
thực chất chưa đủ dữ liệu so sánh), theo đúng tiền lệ sentinel `"N/A"`
đã dùng ở `session_violation_count` (registry).

**Ví dụ thường**: `Điểm_Chỉ_Số(self)=310`,
`Điểm_Kỹ_Năng=Điểm_Trang_Bị=0` (đã Designed) → `Lực_chiến(self)=310`;
đối thủ `Lực_chiến=250` → `estimate_ratio=1.24` → hiển thị "nhỉnh hơn
~24%".

**Ví dụ 0/0**: NPC vừa khởi tạo (toàn bộ 12 chỉ số = 0, chưa học kỹ
năng/trang bị) đối đầu 1 NPC khác cùng trạng thái → cả 2 `Lực_chiến=0` →
`estimate_ratio="N/A"`.

**Ví dụ 1 bên = 0**: đối thủ `Lực_chiến=0`, self=310 →
`estimate_ratio="+∞"` (không chia 310/0).

---

**D.14 — Chọn thức của NPC (Tầng 2, Core Rule #2)** (mới 2026-08-06,
tách khỏi văn xuôi Core Rule #2 để có bảng ký hiệu + ví dụ biên đầy đủ
như mọi formula khác — đóng gap `/design-review` "công thức chọn thức
NPC là công thức DUY NHẤT thiếu bảng ký hiệu, cũng là công thức duy
nhất có cả chia-cho-0 lẫn logic nghịch đảo". **Thay thế hoàn toàn**
công thức weighted-random-theo-tier cũ `P(thức_i) = tier_i/Σtier_j` —
công thức đó khiến NPC ưu tiên thức TIER CAO NHẤT, nhưng D.1 phạt nặng
khi `skill_tier_used` vượt `tier(C)`, nghĩa là NPC bị thiết kế để tối
đa hóa tự-phạt — vừa là lỗi thiết kế (lợi thế hệ thống ẩn cho người
chơi, chạm Pillar 1/3) vừa có chia-cho-0 khi mọi thức còn lại `tier=0`.)

```
eligible_low(C)  = { thức chưa dùng trong trận | tier(thức) ≤ tier(C) }
eligible_all(C)  = { thức chưa dùng trong trận }   # toàn bộ, không lọc

chosen_pool_set(C) = eligible_low(C)   nếu eligible_low(C) ≠ ∅
                    = eligible_all(C)  nếu eligible_low(C) = ∅ VÀ eligible_all(C) ≠ ∅
                    = { "basic_attack" } nếu eligible_all(C) = ∅

# MỚI vòng 2 — chosen_pool_set là TẬP HỢP không thứ tự; chosen_pool là
# DANH SÁCH có thứ tự TẤT ĐỊNH, bắt buộc để roll_uniform ánh xạ ra
# ĐÚNG 1 kết quả có thể tái lập (đóng gap `/design-review` "D.14 định
# nghĩa phân phối nhưng không định nghĩa phép chọn — phá determinism"):
chosen_pool(C) = sort(chosen_pool_set(C), key = thuc_id, order = ascending)

P(thức_i) = 1 / |chosen_pool(C)|   với mọi thức_i ∈ chosen_pool(C)   # đều tuyệt đối, KHÔNG theo tier

# MỚI vòng 2 — dòng chọn tường minh, CÙNG khuôn mẫu D.2/D.3/D.5/D.11:
chosen_index = min(int(floor(roll_uniform[0,1) * |chosen_pool(C)|)), |chosen_pool(C)| - 1)
chosen_thuc  = chosen_pool(C)[chosen_index]
```

`min(..., |chosen_pool(C)|-1)` MỚI vòng 3 `/design-review` (đóng gap
[ai-programmer] "không có clamp phòng vệ tại biên `roll_uniform→1.0`" —
D.14 là công thức DUY NHẤT trong hệ dùng `roll_uniform` để tính INDEX
MẢNG qua nhân-rồi-floor; mọi formula khác chỉ dùng `roll_uniform` qua so
sánh `<`, luôn an toàn dù `roll_uniform` chạm đúng 1.0. Quy ước
`roll_uniform[0,1)` là half-open GIẢ ĐỊNH loại trừ 1.0 tuyệt đối — đây
là giả định về hành vi RNG bên NGOÀI phạm vi D.14, không phải điều D.14
tự đảm bảo được; nếu implementation RNG lỡ trả đúng 1.0 (dù hiếm),
`chosen_index` không có clamp sẽ ra `|chosen_pool(C)|` — out-of-bounds
cho mảng 0-indexed. Cùng lớp lỗi ("biên không được đóng tường minh
trong chính formula") như div-by-zero đã sửa ở vòng trước, chỉ khác
biểu hiện (mảng vỡ thay vì phép chia vỡ) — không phụ thuộc hợp đồng RNG
bên ngoài có giữ đúng half-open hay không. `int()` tường minh trước
`floor()` (GDScript's `floor()` trả về `float`) — cùng ghi chú
implementation như D.12.

| Symbol | Type | Range | Description |
|---|---|---|---|
| `tier(thức)` | int | 0–∞ | Bậc kỹ năng gốc của thức (từ `equipment-skill-data-system.md`) |
| `tier(C)` | int | **1–∞** | Bậc/cảnh giới hiện tại của NPC (D.1; sửa 2026-08-08, cùng lý do dòng 458 ở trên) |
| `eligible_low(C)` | set | — | Thức NPC dùng KHÔNG bị D.1 phạt gear-gap (tier thức ≤ tier NPC) |
| `eligible_all(C)` | set | — | Mọi thức chưa dùng, không lọc theo tier |
| `chosen_pool_set(C)` | set | — | Tập thực sự dùng để random — ưu tiên `eligible_low` trước |
| `chosen_pool(C)` | list | — | `chosen_pool_set(C)` sắp theo `thuc_id` TĂNG DẦN (MỚI vòng 2) — 2 implementation tuân thủ đúng D.14 LUÔN cho ra CÙNG danh sách theo CÙNG thứ tự cho cùng input |
| `P(thức_i)` | float | `(0,1]` | Phân phối ĐỀU trên `chosen_pool`, không phụ thuộc tier — không còn chia cho `Σtier`, không còn chia-cho-0 |
| `chosen_index` | int | `[0, \|chosen_pool(C)\|-1]` | Chỉ số phần tử được chọn — dùng `roll_uniform` injected, CÙNG stream RNG với mọi formula khác của hệ này (như D.2/D.3/D.5/D.11) |
| `chosen_thuc` | element của `chosen_pool(C)` | — | Thức NPC thực sự dùng ở pha này — Tầng 2 (Core Rule #2) trả về giá trị này |

**Output range**: `P(thức_i) ∈ (0,1]`, tổng = 1 trên `chosen_pool(C)` —
KHÔNG BAO GIỜ chia cho 0 (mẫu số là `|chosen_pool(C)|`, luôn ≥1 vì
nhánh `basic_attack` fallback bắt mọi trường hợp rỗng). NPC ưu tiên
dùng thức KHÔNG bị D.1 phạt (đúng logic "NPC dùng thứ nó thật sự thuần
thục", có ý nghĩa diegetic) — chỉ rơi vào `eligible_all` (chấp nhận bị
phạt) khi không còn lựa chọn nào an toàn. Việc CHỌN `chosen_pool_set`
(`eligible_low`→`eligible_all`→`basic_attack`) là hoàn toàn TẤT ĐỊNH,
KHÔNG dùng RNG (đúng Contract Enforcement — đây là "logic hệ thống",
không phải AI/LLM quyết định); chỉ bước CHỌN PHẦN TỬ CUỐI trong pool đã
xác định mới dùng `roll_uniform` — ranh giới rõ ràng giữa 2 giai đoạn.

**Ví dụ thường**: NPC `tier=3`, thức chưa dùng có tier `{1,2,5}` →
`eligible_low={tier 1, tier 2}` (loại tier 5 vì `5>3`) →
`chosen_pool` = 2 thức đó, sắp theo `thuc_id` (VD `["diem_huyet",
"truy_phong"]`) → mỗi thức `P=0.5`. **MỚI vòng 2**: `roll_uniform=0.7`
→ `chosen_index = floor(0.7×2) = 1` → `chosen_thuc = "truy_phong"`
(phần tử thứ 2, tất định — cùng `roll_uniform` luôn cho cùng kết quả
với cùng `chosen_pool`).

**Ví dụ biên (mọi thức đều tier=0, trường hợp gây chia-cho-0 ở công
thức cũ)**: NPC `tier=0`, thức chưa dùng `{tier 0, tier 0}` →
`eligible_low = {cả 2}` (vì `0≤0`) → `chosen_pool` = 2 thức, mỗi thức
`P=0.5` — KHÔNG có phép chia nào liên quan tới `Σtier`, lỗi div-0 biến
mất theo cấu trúc.

**Ví dụ biên (chỉ còn thức vượt tier)**: NPC `tier=2`, thức chưa dùng
còn lại duy nhất tier `4` → `eligible_low=∅` → rơi xuống `eligible_all`
= {thức tier 4} → NPC BUỘC dùng thức đó (chấp nhận bị D.1 phạt, không
còn lựa chọn nào khác trong trận này).

**Ví dụ biên (hết thức hoàn toàn)**: `eligible_all(C)=∅` →
`chosen_pool={"basic_attack"}` — khớp fallback đã định nghĩa ở Core
Rule #5/Edge Cases, không phải nhánh mới.

---

### Ánh xạ test case biên bắt buộc → Formula

| Test case biên bắt buộc | Formula xử lý | Hành vi cụ thể |
|---|---|---|
| Lực chiến 0/0 | D.13 | `estimate_ratio` trả `"N/A"`, không chia 0/0, không giả định `1.0` |
| Floor khi chồng phạt vượt bậc + áp chế cảnh giới | D.1 | `FLOOR_TOTAL=0.05` chặn tích 2 lớp không về dưới 5%, không bao giờ âm |
| Ngưỡng 20 cấp — bao gồm/loại trừ | D.1 (ghi chú) | Không áp dụng — khác thang đo (cấp≠bậc), thuộc hệ khác; D.1 dùng hàm liên tục nên không có ngưỡng cắt |
| Ngưỡng Hảo cảm -80 — ranh giới phạm vi | Toàn bộ Section D (ghi chú đầu mục) | Không formula nào nhận input Hảo cảm; chỉ xuất `outcome`/`hp_after` cho hệ khác tự quyết |
| ACC/Né 0/0 | D.3 | Hiệu số, không chia → `P_hit=0.5` |
| SPD 0/0 (bỏ chạy) | D.11 | Hiệu số, không chia → `P_flee=0.5` |
| Ngắt sớm giữa pha (quyết định 3B) | D.9 | Nhúng trực tiếp trong nhánh `if hp[second]==0` |
| Bế tắc "đấm vào tường" 2 chiều → trận không hội tụ | D.4 + D.4b + D.10 | Sàn `MIN_RAW_RATIO` (D.4) + kiệt sức lũy tiến (D.4b: giảm Regen VÀ hao tổn cộng dồn `exhaustion_drain`, độc lập ATK/DEF, tính CẢ HAI bên KHÔNG ĐIỀU KIỆN — sửa vòng 3) + trần `HP_REGEN_CAP` (D.10) — đảm bảo HP luôn trôi về 0 trước/tại `TECHNICAL_EXCHANGE_CAP` khi thỏa ràng buộc chéo cửa sổ ≥120 (Tuning Knobs), xác nhận **96/108** tổ hợp Safe Range bằng harness SỐNG TRONG REPO (`prototypes/combat-reference/harness.py`, vòng 3 — thay thế "72/72" của vòng 2, harness đó đã mất/không tái kiểm được, và không mô hình đúng ngữ nghĩa số nguyên GDScript) |
| `final_damage` (D.6) làm tròn về 0 dù đòn trúng → mâu thuẫn "không tuyệt đối" | D.6 | Sàn `max(1, final_damage_raw)` khi `raw_damage>0` — sửa vòng 3, xác nhận bằng harness: tỉ lệ về 0 đo được 100% ở kịch bản áp chế cực đoan + Chống chịu vừa phải, TRƯỚC fix |
| Nhân vật SPD cao hơn thua tất định ở tàn trận kiệt sức | D.9 (thứ tự tính `exhaustion_drain`) | Tính `exhaustion_drain` cho CẢ HAI bên KHÔNG ĐIỀU KIỆN trước khi kiểm `==0` (thay vì tuần tự-với-early-return) — sửa vòng 3, harness đo được 0/300 (100% thua) TRƯỚC fix → 52.3%/47.7% (công bằng) SAU fix |
| `chosen_index` (D.14) ra ngoài biên mảng khi `roll_uniform→1.0` | D.14 | `min(floor(...), \|pool\|-1)` — sửa vòng 3, đóng cùng lớp lỗi "biên không phòng vệ" như div-by-zero đã sửa ở vòng trước |
| Chọn thức NPC: mọi thức còn lại tier=0 → chia-cho-0 (mới 2026-08-06) | D.14 | Phân phối đều trên `chosen_pool`, không còn chia cho `Σtier` — lỗi biến mất theo cấu trúc |
| `coin_flip` thiên vị cố định giữa các trận / phá vỡ re-roll khi Undo (mới 2026-08-06) | D.2, D.9c | Bỏ self-seed theo `exchange_id`, dùng `roll_uniform` injected — cùng cơ chế mọi formula RNG khác |

*(Hằng số/knob MỚI do GDD này giới thiệu, chính thức hóa với safe range
đầy đủ ở Tuning Knobs: `PENALTY_PER_TIER`, `FLOOR_LAYER`, `FLOOR_TOTAL`,
`K_HIT`, `P_MIN`, `P_MAX`, `MIN_DMG_MULT`, `K_FLEE`, `P_MIN_FLEE`,
`P_MAX_FLEE`, `CONTENT_EXCHANGE_ESTIMATE` (đổi tên từ
`MAX_EXCHANGE_COUNT` 2026-08-03), `TECHNICAL_EXCHANGE_CAP`,
`SPAR_PARITY_TOLERANCE`, `SPAR_LOW_HP_THRESHOLD` (3 hằng số mới
2026-08-03, D.9b/D.9c), `max_invocations_per_battle` (dẫn xuất, không
phải knob độc lập), `w_HP` và các `w_*` khác của D.13, `MIN_RAW_RATIO`
(D.4), `EXHAUSTION_ONSET_EXCHANGE`/`EXHAUSTION_DRAIN_PCT` (D.4b),
`HP_REGEN_CAP` (D.10), `DEFEND_DMG_REDUCTION_PCT` (Core Rule #2b),
`NPC_FLEE_HP_THRESHOLD` (Core Rule #2) — hằng số mới 2026-08-06 (vòng 1
và vòng 2 `/design-review`.)*

## Edge Cases

*(Lean mode: không bắt buộc spawn specialist — chỉ D và H. Đối chiếu Core
Rules/Formulas vừa viết + Turn Manager's Undo model để đảm bảo nhất
quán.)*

- **Nếu 2 bên "cùng chết" trong 1 pha**: KHÔNG THỂ xảy ra theo thiết kế —
  D.9 giải quyết đòn đi trước HOÀN TOÀN (kể cả kiểm tra HP=0) trước khi
  đòn đi sau bắt đầu tính; nếu đòn đi trước đã hạ đối phương về 0, đòn đi
  sau không thực thi. Nếu implementation cho ra kết quả "song sát", đó là
  bug vi phạm D.9, không phải trường hợp hợp lệ.
- **Nếu đối thủ (NPC) hết thức khả dụng giữa trận** (đã dùng hết
  `known_skill_ids` theo quy tắc không lặp): dùng "Đánh thường" khớp
  `weapon_type` của đối thủ làm phương án dự phòng — đúng Core Rule #5,
  áp dụng đối xứng cho cả người chơi lẫn NPC, không có ngoại lệ nào cho
  đối thủ.
- **(mới 2026-08-06) Nếu HP% của NPC xuống dưới `NPC_FLEE_HP_THRESHOLD`
  ở đầu pha**: NPC tự động chọn "Bỏ chạy" (Core Rule #2, Tầng 1) thay vì
  tiếp tục tấn công — kiểm tra này chạy TRƯỚC Tầng 2 (chọn thức, D.14),
  không phụ thuộc thức nào còn khả dụng. Nếu bỏ chạy thất bại (D.11),
  pha đó tính là NPC "bỏ chạy thất bại", KHÔNG quay lại chọn thức tấn
  công ở cùng pha (đúng Core Rule #9's mô tả tương tác D.9-D.11, áp dụng
  đối xứng cho NPC).
- **(mới 2026-08-06 vòng 1) NPC KHÔNG BAO GIỜ chọn "Phòng thủ"**: đây
  là ranh giới phạm vi CÓ CHỦ ĐÍCH (Core Rule #2), không phải thiếu sót
  — NPC chỉ có 2 hành động khả dụng: tấn công bằng thức (D.14) hoặc bỏ
  chạy khi HP thấp (trên). (Hành động "Dùng vật phẩm" đã CẮT khỏi MVP
  cho CẢ người chơi lẫn NPC — sửa 2026-08-06 vòng 2, Core Rule #6 —
  không còn là ranh giới riêng của NPC nữa.)
- **Nếu người chơi Undo 1 pha giao đấu đã dùng 1 thức**: thức đó quay
  lại trạng thái "chưa dùng trong trận" (rollback đầy đủ, đúng Turn
  Manager Core Rule #8) — không chỉ hoàn tác HP/kết quả mà cả trạng thái
  "đã dùng thức nào" của Core Rule #5. Xác nhận lại pha đó (RNG re-roll
  thật, đúng Turn Manager AC-12) có thể chọn thức khác hoặc thức cũ, và
  có thể ra kết quả khác hoàn toàn (trúng/hụt/crit khác lần trước).
- **Nếu người chơi Undo đúng pha KẾT THÚC trận** (pha có `battle_active`
  chuyển từ true→false): `in_combat` quay lại `true`, `battle_active`
  quay lại `true`, HP hai bên quay về giá trị trước pha đó — trận "sống
  lại", danh sách thức đã dùng KHÔNG bao gồm pha vừa undo. Việc các hệ
  downstream (EXP, Death & Consequence, NPC Affinity) đã tiêu thụ tín
  hiệu hand-off của pha đó trước khi bị undo hay chưa là trách nhiệm của
  CHÍNH các hệ đó tuân thủ Turn Manager Core Rule #8 ("chưa final tới khi
  xác nhận và không undo") — Combat System chỉ đảm bảo trạng thái CỦA
  CHÍNH NÓ (`in_combat`, `battle_active`, HP, thức đã dùng) rollback
  đúng.
- **Nếu Bỏ chạy thành công**: trận kết thúc với tín hiệu hand-off riêng
  biệt `outcome="no_outcome"` (KHÁC `"win"`/`"lose"`) — EXP & Realm
  Progression và Death & Consequence (đã Designed) không được phép
  diễn giải bỏ chạy thành thắng hoặc thua khi tự xử lý hệ quả riêng.
- **(sửa 2026-08-03) Nếu trận `is_spar_friendly=false` chạm
  `TECHNICAL_EXCHANGE_CAP` mà chưa bên nào về 0 HP**: D.9c BẮT BUỘC ra
  `win`/`lose` qua tiebreak (hp_pct cao hơn thắng; trùng tuyệt đối →
  `coin_flip()` qua `roll_uniform` injected — **SỬA 2026-08-06 vòng 2**:
  đoạn này trước đó còn ghi nhầm "coin_flip theo `exchange_id`", tàn dư
  của cơ chế self-seed đã bị bỏ ở D.2/D.9c cùng ngày, đóng gap
  `/design-review` "Edge Case mâu thuẫn trực tiếp D.9c đã sửa") —
  KHÔNG BAO GIỜ `no_outcome` ở nhánh này, đúng yêu cầu "ngoài giao hữu
  luôn bắt buộc phân thắng thua". Đây là van an toàn KỸ THUẬT thuần túy
  (tránh giằng co vô hạn về mặt `narration_call` cost — dù với D.4b vòng
  2 đảm bảo hội tụ, nhánh này giờ chỉ còn là phần đuôi lý thuyết hiếm),
  không phải cơ chế gameplay thiết kế để người chơi khai thác.
- **(sửa 2026-08-03) Nếu trận `is_spar_friendly=true` chạm
  `TECHNICAL_EXCHANGE_CAP` mà D.9b chưa từng kích hoạt trước đó**: kết
  thúc với `outcome="no_outcome"` cho cả 2 bên — cùng xử lý như Bỏ chạy
  thành công.
- **(sửa 2026-08-03) Nếu `is_spar_friendly=true` nhưng parity (D.9b)
  hoặc ngưỡng HP-thấp không thỏa khi HP về 0**: `outcome` vẫn
  `win`/`lose` bình thường — KHÔNG tự động hòa chỉ vì là trận giao hữu.
- **(sửa 2026-08-03) Nếu `external_abort_signal.requested=true` tại
  thời điểm Combat kiểm tra** (đầu state "In Combat — Awaiting
  Exchange"): trận kết thúc NGAY, `outcome="no_outcome"`, D.2–D.10
  KHÔNG được gọi cho lượt đó (không tính là 1 pha giao đấu bình thường,
  cùng tiền lệ D.11 dùng cho bỏ chạy thành công) — tín hiệu là one-shot,
  bị Combat clear ngay sau khi tiêu thụ.
- **Nếu người chơi cố dùng lại 1 thức đã dùng trong trận** (qua input tự
  do, bỏ qua danh sách gợi ý): hệ thống từ chối, không cho hành động đó
  tính là 1 pha hợp lệ — yêu cầu chọn lại (không tính vào lượt đã dùng,
  tương tự Turn Manager Edge Case "lệnh gọi AI thất bại" về mặt không
  tốn 1 lượt).
- **Nếu người chơi thắng trận nhưng đối thủ không có tên/không phải NPC
  có Hảo cảm theo dõi** (VD quái vật/thú hoang trong tình huống tương
  lai): Combat vẫn phát tín hiệu hand-off `outcome="win"` bình thường —
  việc EXP & Realm Progression có tính EXP khác nhau cho "đối thủ không
  phải NPC" hay không là quyết định của hệ đó, Combat không phân biệt
  loại đối thủ trong formula của mình.
- **Nếu `narration_call` của 1 pha giao đấu Failed SAU KHI `locked_result`
  của pha đó đã tính xong** (bổ sung 2026-08-07, `/design-review
  ai-llm-integration-layer.md`, đóng gap `game-designer`, cascade từ
  `turn-manager.md` Edge Cases): `locked_result` của pha đó (đã ghi vào
  `per_actor`, `outcome`...) PHẢI được giữ nguyên và TÁI SỬ DỤNG khi
  người chơi thao tác lại — Combat KHÔNG được tính lại pha giao đấu đó
  (không reroll `d20`/crit/damage) chỉ vì lỗi mạng/API thuần hạ tầng ở
  bước tường thuật. Xem `turn-manager.md` Edge Cases cho ràng buộc đầy đủ
  (ai giữ `locked_result` treo, khi nào hủy) — Combat chỉ cần đảm bảo:
  MỖI lần D.2-D.10 chạy cho 1 `exchange_id` cụ thể chỉ chạy ĐÚNG MỘT LẦN
  cho tới khi lượt đó thực sự xác nhận (Turn Confirmed) hoặc bị hủy hẳn
  (hành động khác được chọn) — không phụ thuộc số lần `narration_call`
  Failed/retry ở giữa.

## Dependencies

*(Đối chiếu 2 chiều: cả 4 GDD phụ thuộc ban đầu đều liệt kê sẵn Combat
System trong Dependencies của chính họ. Bổ sung 2026-08-05: phát hiện
thêm 1 phụ thuộc Hard chưa khai — Character Card & Identity (`base_X(C)`
làm input D.1) — đã thêm vào danh sách dưới, đóng gap.)*

**Phụ thuộc vào (upstream)**:
- **Turn Manager** (Foundation, Approved) — **hard**: mỗi pha giao đấu
  là 1 lượt Turn Manager; toàn bộ mô hình Undo/RNG re-roll của Combat kế
  thừa trực tiếp từ Turn Manager Core Rule #8 + AC-12.
- **Equipment & Skill Data System** (Foundation, Approved) — **hard**:
  đọc `known_skill_ids`, `equipped_weapon_id`, thức + `tier` +
  `style_descriptor`; Combat định nghĩa `max_invocations_per_battle` cho
  hệ này (đã đóng AC-11 BLOCKED của GDD đó).
- **Character Card & Identity** (Presentation, đã Designed) — **hard**
  (bổ sung 2026-08-05, đóng gap `/design-review` gộp 11 GDD): đọc
  `base_X(C)` — giá trị gốc CHƯA bị phạt — làm input trực tiếp của
  Formula D.1, nền của mọi formula khác trong hệ này.
- **AI/LLM Integration Layer** (Core, Designed) — **hard**: mọi
  `narration_call` của Combat đi qua wrapper này, đúng
  `calls_per_turn_max=3`.
- **Mechanic/Narration Contract Enforcement** (Foundation, Approved) —
  **hard**: mọi `locked_result` mỗi pha chịu Numeric Leak Detection;
  Combat không bao giờ đọc lại `narration_text`.

**Các hệ thống phụ thuộc vào Combat** (downstream), kèm giao diện dữ
liệu cụ thể:
- **EXP & Realm Progression** (Feature, đã Designed) — **hard (hệ đó
  đã Designed)**: đọc tín hiệu hand-off (`outcome` ∈ {win, lose,
  no_outcome}, HP còn lại, margin) khi `battle_active=false`; tự tính
  EXP — Combat không sở hữu công thức EXP (đã xác nhận phạm vi đầu
  phiên).
- **Death & Consequence** (Feature, đã Designed) — **hard, 2 CHIỀU (bổ
  sung 2026-08-09 — trước là 1 chiều)**: đọc tín hiệu `outcome="lose"` để
  quyết định mức độ hậu quả (kết hợp với ngưỡng Hảo cảm từ NPC Affinity,
  Designed 2026-08-03 — cờ thù địch sâu sắc `affinity ≤ -80`, registry
  `deep_hostility_threshold`) — Combat chỉ báo "đã thua", không tự quyết
  định mức độ. **CHIỀU NGƯỢC mới**: Combat (D.1 `crippled_layer`) ĐỌC
  `death_and_consequence_blocked(C)` từ hệ này để áp penalty Lực chiến
  nhỏ khi C đang phế đan điền — cascade edit từ `/design-review` round 1
  của `death-and-consequence.md`, xem `CRIPPLED_PENALTY_MULT` ở Tuning
  Knobs.
- **NPC Affinity & Relationship** (Feature, Designed 2026-08-03) —
  **soft**: không đọc/ghi trực tiếp qua Combat; giao diện đã cố định tại
  `npc-affinity-relationship.md` D.1: hand-off của Combat (`outcome`,
  `hp_after`/`max_HP` → `margin_ratio`) được hệ đó ánh xạ thành sự kiện
  `combat_win_vs_npc`/`combat_loss_vs_npc` — Combat không cần thay đổi
  gì, đúng như đã để ngỏ.
- **Situation/Encounter Generation** (Narrative, Designed 2026-08-03) —
  **soft**: quyết định KHI NÀO 1 tình huống dẫn đến giao chiến (registry
  `hostile_initiative_allowed`/`HOSTILE_INITIATIVE_LEVEL_GAP_MAX=20`,
  đóng ngưỡng 20 cấp chênh lệch của `game-concept.md`) — Combat chỉ
  tiêu thụ quyết định "đã vào trận", không tự kiểm tra điều kiện kích
  hoạt. Với đối thủ ambient vô danh (không có `char_id`), Situation/
  Encounter Generation cũng cấp `level` sinh ra trong khoảng registry
  `encounter_level_range` — Combat dùng level đó + `stat_growth` (EXP &
  Realm Progression) để dựng chỉ số đối thủ; thuật toán dựng chỉ số cụ
  thể chưa hình thức hóa thành công thức riêng của Combat (xem Open
  Questions). **(sửa 2026-08-03)** Combat cũng lắng nghe
  `external_abort_signal` (Core Rule #13) từ hệ này để ngắt trận khẩn
  cấp giữa chừng — điều kiện gì khiến hệ đó set tín hiệu này thuộc
  phạm vi `situation-encounter-generation.md`, chưa thiết kế ở đây.
- **Character Card & Identity** (Presentation, đã Designed) —
  **soft**: sẽ hiển thị "Điểm Chỉ số"/Lực chiến ước tính (Formula D.13)
  trên thẻ nhân vật.

## Tuning Knobs

| Knob | Default | Safe Range | Ảnh hưởng nếu chỉnh |
|---|---|---|---|
| `PENALTY_PER_TIER` | 0.15 | 0.05–0.30 | % giảm chỉ số hiệu dụng mỗi bậc chênh lệch cảnh giới/trang bị (D.1). Quá thấp → áp chế cảnh giới vô nghĩa, phá vỡ premise "mây tầng nào gặp gió tầng nấy"; quá cao → chỉ cần chênh 3-4 bậc là gần như bất khả chiến thắng, giảm động lực thử liều lĩnh có tính toán. |
| `CRIPPLED_PENALTY_MULT` (MỚI 2026-08-09, cascade từ `death-and-consequence.md`) | 0.85 | 0.7–0.95 | Multiplier áp khi `death_and_consequence_blocked(C)=true` (D.1 `crippled_layer`) — cố định, không cộng dồn theo số lần bị phế. Quá thấp → penalty nặng, tăng rủi ro death-spiral (nhân vật vừa thua càng dễ thua tiếp); quá cao (gần 1.0) → penalty gần như cảm nhận không được, làm nhạt tính "phế đan điền là hậu quả thật" mà `death-and-consequence.md` Core Rule #6 yêu cầu. |
| `FLOOR_LAYER` | 0.1 | 0.05–0.3 | Sàn multiplier của MỖI lớp phạt riêng (D.1). Quá thấp → 1 lớp phạt đơn lẻ đã gần như vô hiệu hóa chỉ số; quá cao → giảm hiệu quả trần an toàn khi 2 lớp cộng dồn. |
| `FLOOR_TOTAL` | 0.05 | 0.02–0.15 | Sàn multiplier TỔNG sau khi nhân 2 lớp phạt (D.1) — đây là con số trực tiếp giải quyết test case biên "floor khi chồng phạt". Quá thấp → chỉ số hiệu dụng gần như 0 ở chênh lệch cực đoan (mất cảm giác "vẫn có cơ hội dù nhỏ"); quá cao → làm yếu tác dụng răn đe của áp chế cảnh giới. |
| `K_HIT` | 0.01 | 0.005–0.02 | Độ dốc ảnh hưởng của chênh lệch ACC/Né tránh lên xác suất trúng (D.3). Quá thấp → ACC/Né tránh gần như không có tác dụng; quá cao → chênh lệch nhỏ cũng tạo trúng/hụt gần tuyệt đối, mâu thuẫn "không có tuyệt đối". |
| `P_MIN` / `P_MAX` | 0.05 / 0.95 | 0.01–0.10 / 0.90–0.99 | Sàn/trần xác suất trúng đòn (D.3). Nới rộng khoảng này (P_MIN thấp hơn, P_MAX cao hơn) làm tăng tính "chắc chắn" ở 2 cực — cân nhắc kỹ vì đây là nơi trực tiếp thể hiện triết lý "không có gì tuyệt đối" của game. |
| `MIN_DMG_MULT` | 0.1 | 0.05–0.2 | Sàn multiplier sát thương cuối sau Khuếch đại/Chống chịu (D.6). Quá thấp → gần như miễn nhiễm sát thương khả thi với Chống chịu cực cao; quá cao → Chống chịu mất tác dụng phòng thủ thực chất. |
| `K_FLEE` / `P_MIN_FLEE` / `P_MAX_FLEE` | 0.01 / 0.05 / 0.95 | (cùng logic K_HIT/P_MIN/P_MAX) | Xác suất bỏ chạy thành công (D.11) — tune độc lập với trúng/hụt đòn đánh dù cùng công thức hiệu số, vì "né đòn" và "thoát khỏi trận" là 2 quyết định khác bản chất. |
| `CONTENT_EXCHANGE_ESTIMATE` | 30 | 15–50 | (Đổi tên từ `MAX_EXCHANGE_COUNT` 2026-08-03) Ước tính THIẾT KẾ số pha điển hình/trận — CHỈ ảnh hưởng `max_invocations_per_battle` qua D.12 (content-authoring), KHÔNG còn là trần runtime. Đổi số này SẼ đổi hằng số LOCKED downstream `max_invocations_per_battle` — cần review lại `equipment-skill-data-system.md` AC-11 nếu chỉnh. |
| `TECHNICAL_EXCHANGE_CAP` | 200 | 100–500, **VÀ `TECHNICAL_EXCHANGE_CAP - EXHAUSTION_ONSET_EXCHANGE ≥ 120`** (ràng buộc chéo MỚI vòng 3 — xem hàng `EXHAUSTION_ONSET_EXCHANGE` dưới) | (Mới 2026-08-03) Van an toàn KỸ THUẬT thuần túy (D.9c) — không ảnh hưởng nội dung/authoring. Quá thấp → có thể cắt ngang trận đấu cân sức hợp lệ thành tiebreak cưỡng bức (mất "trận giằng co thật"); quá cao → rủi ro cost `narration_call` runaway thực sự nếu bug logic khiến trận không bao giờ tự kết thúc. **Xác nhận bằng harness** (`prototypes/combat-reference/harness.py`, vòng 3): 12/108 tổ hợp Safe Range KHÔNG hội tụ trước cap, TẤT CẢ đều có cửa sổ `CAP-ONSET` ≤ 60 — mọi thay đổi `TECHNICAL_EXCHANGE_CAP` hoặc `EXHAUSTION_ONSET_EXCHANGE` khỏi mặc định BẮT BUỘC re-run harness trước khi coi là an toàn. |
| `SPAR_PARITY_TOLERANCE` | 0.15 | 0.05–0.25 | (Mới 2026-08-03) Ngưỡng "ngang sức" cho hòa giao hữu (D.9b). Quá thấp → gần như không bao giờ hòa được (chỉ 2 bên gần như y hệt mới đủ điều kiện); quá cao → giao hữu chênh lệch rõ vẫn có thể hòa, làm nhạt "Sức Mạnh Có Logic". |
| `SPAR_LOW_HP_THRESHOLD` | 0.15 | 0.05–0.25 | (Mới 2026-08-03) Ngưỡng "nguy kịch" cho bên thắng danh nghĩa (D.9b). Quá thấp → hầu như không bao giờ kích hoạt hòa; quá cao → dễ hòa ngay cả khi bên thắng còn khá nhiều HP, làm hòa mất cảm giác "cả 2 kiệt sức thật". |
| `w_HP`, `w_ATK`, `w_DEF`, `w_SPD`, `w_ACC`, `w_Né`, `w_CR`, `w_CD`, `w_AMP`, `w_MIT`, `w_LSTL`, `w_REGEN` | `w_HP=0.25`, còn lại =1 | ≥0 | Trọng số "Điểm Chỉ số" (D.13) — CHỈ ảnh hưởng con số ước tính hiển thị trước trận, KHÔNG ảnh hưởng thắng/thua thật (Core Rule #7). `w_HP` thấp hơn hẳn vì thang giá trị HP thường lớn hơn nhiều lần các chỉ số khác — placeholder tạm, cần đối chiếu lại khi EXP & Realm Progression định nghĩa đường cong tăng trưởng chỉ số thật (xem Open Questions). |
| `MIN_RAW_RATIO` | 0.05 | 0.02–0.15 | Sàn sát thương tối thiểu khi đòn trúng, theo % `effective_ATK` (D.4). Quá thấp → gần như không giải quyết được bế tắc "đấm vào tường" một mình (cần D.4b hỗ trợ); quá cao → làm yếu tác dụng phòng thủ của DEF/Chống chịu ở đầu trận, mọi đòn trúng đều gây sát thương đáng kể bất kể build. **Không đủ MỘT MÌNH để đảm bảo hội tụ — xem `EXHAUSTION_DRAIN_PCT`/`HP_REGEN_CAP`, đã xác nhận bằng harness.** |
| `EXHAUSTION_ONSET_EXCHANGE` | 40 | 20–80 (luôn phải < `TECHNICAL_EXCHANGE_CAP` VÀ luôn phải > `CONTENT_EXCHANGE_ESTIMATE` **đang cấu hình**, không chỉ giá trị mặc định — xem ràng buộc chéo dưới) | Pha bắt đầu kiệt sức lũy tiến (D.4b) — giảm dần HP Regen về 0 + tăng dần hao tổn cộng dồn tới `TECHNICAL_EXCHANGE_CAP`. Quá thấp → cả trận điển hình (15-50 pha, `CONTENT_EXCHANGE_ESTIMATE`) cũng bị ảnh hưởng, thay đổi cảm giác cân bằng không chủ đích; quá cao (gần `TECHNICAL_EXCHANGE_CAP`) → không đủ cửa sổ để kiệt sức thắng Regen trước khi chạm trần. **Ràng buộc chéo #1** (đóng gap `/design-review` vòng 2 — Safe Range của knob này (20-80) và của `CONTENT_EXCHANGE_ESTIMATE` (15-50) chồng lấp, cho phép tổ hợp hợp lệ nhưng sai ý đồ nếu chỉ dựa vào giá trị mặc định): người chỉnh knob PHẢI đảm bảo `EXHAUSTION_ONSET_EXCHANGE > CONTENT_EXCHANGE_ESTIMATE` với GIÁ TRỊ ĐANG DÙNG thực tế của cả hai, không chỉ tin vào mặc định 40>30. **Ràng buộc chéo #2, MỚI vòng 3** (đóng gap [systems-designer] "cửa sổ kiệt sức có thể hẹp tới ~20 pha, chưa từng được AC-47a quét trước vòng 3"): `TECHNICAL_EXCHANGE_CAP - EXHAUSTION_ONSET_EXCHANGE ≥ 120` — harness xác nhận mọi tổ hợp Safe Range dưới ngưỡng này (cửa sổ ≤ 60) có nguy cơ KHÔNG hội tụ trước cap; mặc định (200-40=160) an toàn, nhưng bất kỳ thay đổi nào PHẢI re-run `prototypes/combat-reference/harness.py` trước khi khóa giá trị mới. |
| `EXHAUSTION_DRAIN_PCT` | 0.05 | **0.05–0.15 (KHÔNG được thấp hơn 0.05)** | (Mới vòng 2 `/design-review`, D.4b) % `max_HP` hao tổn cộng dồn mỗi pha trong cửa sổ kiệt sức, ĐỘC LẬP với `effective_ATK`/`effective_DEF` — đây là số hạng chính đảm bảo hội tụ (harness: 5% hội tụ 72/72 tổ hợp Safe Range; 3% chỉ 48/72; 2% chỉ 7/72). Quá thấp (dưới 0.05) → mất đảm bảo hội tụ đã xác nhận; quá cao → trận dài cảm giác "rơi tự do" đột ngột thay vì kiệt sức dần. |
| `HP_REGEN_CAP` | 0.05 | 0.02–0.05 | (Mới vòng 2 `/design-review`, D.10) Trần cứng lên `effective_HPRegen` trước khi nhân `exhaustion_regen_mult` (D.4b) — chặn build HPRegen cao (hợp lệ theo range `[0,1]` của D.10) đánh bại cơ chế chống bế tắc. Quá thấp → build Regen mất hoàn toàn tác dụng ngay cả ngoài kịch bản bế tắc; quá cao (>0.05) → mất đảm bảo hội tụ đã xác nhận bằng harness (build HPRegen cực cao có thể thắng cả sàn chip lẫn drain). |
| `DEFEND_DMG_REDUCTION_PCT` | 0.35 | 0.20–0.50 | (SỬA vòng 2 `/design-review`, thay `DEFEND_DEF_MULT`/`DEFEND_NE_MULT`) % giảm trừ TẤT ĐỊNH lên `final_damage` nhận vào khi chọn "Phòng thủ" (Core Rule #2b/D.6). Quá thấp → Phòng thủ gần như vô nghĩa; quá cao → Phòng thủ trở thành lựa chọn áp đảo, làm nhạt agency "tấn công hay thủ" thành "luôn thủ khi không chắc thắng". Không phụ thuộc build ATK/DEF của 2 bên (khác cơ chế vòng 1 bị chip-floor D.4 vô hiệu hóa). |
| `NPC_FLEE_HP_THRESHOLD` | 0.20 | 0.05–0.35 | (Mới 2026-08-06) Ngưỡng HP% khiến NPC tự động bỏ chạy thay vì tiếp tục tấn công (Core Rule #2, Tầng 1). Quá thấp → NPC gần như luôn chiến đấu tới chết (mất bản năng sinh tồn); quá cao → NPC bỏ chạy quá sớm, giảm cảm giác rủi ro thật của trận đấu, có thể làm nhạt hệ quả nghiêm trọng (EXP/Death & Consequence) chờ ở cuối trận thắng. |

*(`max_invocations_per_battle=5` KHÔNG phải tuning knob độc lập — là giá
trị DẪN XUẤT từ `CONTENT_EXCHANGE_ESTIMATE` (đổi tên từ
`MAX_EXCHANGE_COUNT` 2026-08-03) và `max_known_skills_per_character` đã
khóa registry, xem Formula D.12. Trong GDScript, phép chia số nguyên
`CONTENT_EXCHANGE_ESTIMATE / max_known_skills_per_character` PHẢI ép
kiểu số thực TRƯỚC KHI gọi `ceil()` — nếu không, giá trị lẻ (VD 25) có
thể bị floor trước khi ceil chạy, cho kết quả sai. Ghi chú implementation,
không phải tuning knob — [systems-designer, sửa 2026-08-06].)*

## Visual/Audio Requirements

*(Đề xuất bởi `art-director` — REQUIRED cho category Combat, không được
bỏ qua theo quy tắc skill.)*

### 1. Tín hiệu thị giác cho các sự kiện Combat

Character Card của cả 2 bên là bề mặt hiển thị DUY NHẤT cho kết quả từng
pha (Core Rule #11) — không có hiệu ứng bay số/particle giữa hai nhân
vật kiểu game hành động.

- **Trúng/hụt**: khung "con dấu" quanh ô ATK/DEF liên quan đổi trạng
  thái — trúng: viền đóng dấu rõ nét, mực đậm; hụt: viền mờ/nhạt hơn
  (gợi "đòn trượt" thuần bằng độ đậm nhạt của nét vẽ, không cần icon
  riêng).
- **Chí mạng (crit)**: ô sát thương của pha đó đổi sang khung "con dấu"
  SẮC CẠNH HƠN mức thường + số đậm hơn 1 bậc trọng lượng chữ — vẫn trong
  dải đen-xám, KHÔNG dùng màu accent (crit là biến thiên trong 1 pha,
  không phải hệ quả vĩnh viễn).
- **HP thay đổi**: thanh HP nhảy theo BƯỚC RỜI RẠC đúng giá trị
  `hp_after` (hard cut, không tween mượt) — khớp triết lý "kết quả đã
  khóa trước khi hiển thị".
- **Lifesteal**: số hồi máu "+N" nhỏ cạnh thanh HP người đánh, cập nhật
  cùng nhịp với đòn gây ra nó.
- **Kết thúc trận — 3 outcome, 3 tín hiệu khác nhau rõ rệt** (SỬA
  2026-08-06 vòng 3 `/design-review`, đóng gap BLOCKING [ux-designer]
  "win/lose phân biệt gần như CHỈ bằng màu — cả hai đều là khung ĐÓNG,
  khác biệt duy nhất trước đây là 2 tính từ chủ quan 'biên rõ' vs 'viền
  mảnh', không glyph riêng, không delta tương phản định lượng; với
  permadeath thật (Pillar 2, không retry), đọc nhầm thắng/thua là hậu
  quả cao nhất toàn game — vi phạm 'functional without reliance on
  color alone'"):
  - `win`: khung "con dấu" quanh Character Card bên thắng đóng lại hoàn
    chỉnh, mang glyph "khép kín" (hoa văn viền liền mạch, không đứt
    đoạn) — giữ đen-xám (thắng là kết quả cơ học bình thường, không
    "tiêu" khẩu phần màu).
  - `lose` (gồm cả nhánh ngắt sớm D.9): khung "con dấu" mang glyph KHÁC
    BIỆT rõ rệt về HÌNH DẠNG với `win` (VD 1 nét gạch chéo cắt ngang
    khung — không chỉ đổi độ dày viền), CHUYỂN sang viền đỏ son — đây là
    ranh giới bàn giao cho Death & Consequence: Combat chỉ đóng dấu "đã
    thua", không tự vẽ thêm hệ quả nặng hơn. Glyph khác biệt là kênh
    CHÍNH (hoạt động cả khi người chơi không phân biệt được đỏ/đen-xám);
    màu đỏ son là kênh CỦNG CỐ, không phải kênh duy nhất.
  - `no_outcome` (bỏ chạy thành công, hòa giao hữu D.9b, tín hiệu khẩn
    cấp xen ngang, hoặc chạm `TECHNICAL_EXCHANGE_CAP` trong giao hữu —
    sửa 2026-08-03): khung "con dấu" của CẢ HAI bên mờ dần rồi biến
    mất, không đóng hoàn chỉnh — tránh người chơi hiểu nhầm những
    trường hợp rất khác nhau này thành "thắng nhẹ".
  - **Kênh dự phòng bắt buộc, không phụ thuộc thị giác** (MỚI vòng 3):
    `narration_text` của pha kết thúc trận PHẢI nêu rõ BẰNG LỜI kết quả
    (thắng/thua/rút lui/hòa...) — không chỉ ngụ ý qua diễn biến — như 1
    kênh dự phòng độc lập với thị giác (hữu ích cho TTS/đọc màn hình tự
    chế trên Web, vì AccessKit không chạy Web). AC-09 (Contract
    Enforcement) trước đây chỉ CẤM số trần trong `narration_text`, KHÔNG
    YÊU CẦU nêu outcome — cần 1 AC riêng cho yêu cầu này (xem Acceptance
    Criteria, AC-09b).
- **Ngắt sớm (kết liễu giữa pha)**: dùng đúng khung `lose` ở trên nhưng
  đóng dấu NGAY LẬP TỨC, tốc độ nhanh hơn hẳn so với kết thúc trận ở
  cuối pha đủ 2 đòn — khác biệt duy nhất là tốc độ, không phải hiệu ứng
  mới.
- **Hai tín hiệu TÁCH BIỆT trước trận** (sửa 2026-08-06, đóng gap
  `/design-review` "cảnh báo áp chế cảnh giới bị chôn cùng chỗ với ước
  tính thô, độ nổi bật thấp nhất mâu thuẫn với chính vai trò 'agency ở
  khâu chuẩn bị' của Player Fantasy" — phân xử [creative-director]: đây
  là 2 loại tín hiệu khác bản chất, không phải 1):
  - **`estimate_ratio` (D.13)**: MỘT ƯỚC TÍNH XÁC SUẤT (trọng số `w_*`
    còn là placeholder) — Core Rule #7 áp dụng đầy đủ, GIỮ NGUYÊN độ
    nổi bật THẤP NHẤT trong visual hierarchy, chỉ đổi trọng lượng chữ
    (đậm hơn) khi bất lợi rõ rệt, không đổi màu/hình dạng.
  - **Chênh lệch cảnh giới** (`tier(self)` vs `tier(đối thủ)`, từ D.1):
    MỘT SỰ THẬT CƠ HỌC ĐÃ KHÓA — không xác suất, không placeholder, Core
    Rule #7 KHÔNG áp dụng cho nó. Khi `gap_realm(self) > 0` (bất lợi
    cảnh giới), hiển thị 1 khung "con dấu" RIÊNG cạnh Điểm Chỉ số trên
    Character Card — cùng ngôn ngữ hình khối sắc cạnh đã dùng cho mọi số
    liệu cứng khác của Combat, độ nổi bật CAO (ngang cấp thanh HP trong
    hierarchy), KHÔNG dùng màu accent mới (giữ đen-xám, không tiêu khẩu
    phần đỏ son/xanh ngọc — đây không phải "thay đổi vĩnh viễn", chỉ là
    một sự thật đã khóa của thời điểm hiện tại).

### 2. Ràng buộc phong cách hoạt ảnh

- Không có hoạt ảnh nhân vật/combat dưới bất kỳ hình thức nào (đúng
  Anti-Pillar `game-concept.md`) — không sprite tấn công, không particle
  bay giữa 2 nhân vật, không camera shake, không hit-stop.
- Chuyển động cho phép giới hạn ở: (a) đổi trạng thái tĩnh của khung
  "con dấu" (đóng/mờ dần/đổi viền), (b) bước nhảy rời rạc của số liệu,
  (c) hiệu ứng chữ xuất hiện của đoạn văn tường thuật (thuộc UI text
  chung, không riêng Combat).
- Không easing phức tạp (spring, bounce) cho số liệu — mọi thay đổi số
  là hard cut hoặc fade tối đa 150–200ms.
- Ngoại lệ tốc độ duy nhất: đóng dấu nhanh hơn khi ngắt sớm (mục 1) —
  vẫn là hiệu ứng tĩnh sẵn có, chỉ khác tốc độ.

### 3. Nguyên tắc Art Bible áp dụng (theo Visual Identity Anchor "Mực
Chưa Khô")

- Nền giấy dó kem/trắng ngà + chữ đen-xám đơn sắc là mặc định cho MỌI
  thành phần Combat UI — không có bảng màu riêng cho "chế độ combat".
- Khung "con dấu" góc cạnh, sắc bén áp dụng cho MỌI số liệu cứng của
  Combat (HP, ATK/DEF hiệu dụng, sát thương, Lực chiến ước tính) — phân
  biệt rõ với khung mực loang hữu cơ dùng cho vùng văn bản tường thuật.
- Đỏ son bị khẩu phần hóa nghiêm ngặt trong phạm vi Combat: CHỈ dùng ở
  khung Character Card bên thua khi `outcome.type="lose"` — không nơi
  nào khác trong Combat UI được dùng đỏ son. Xanh ngọc KHÔNG xuất hiện
  trong Combat System (dành riêng cho đột phá cảnh giới, thuộc EXP &
  Realm Progression).
- Visual hierarchy trên Character Card (mắt nhìn ưu tiên từ cao xuống
  thấp, sửa 2026-08-06 — thêm khung chênh lệch cảnh giới ngang cấp HP):
  (1) khung "con dấu" kết thúc trận (khi có) → (2) thanh HP VÀ khung
  chênh lệch cảnh giới (cùng cấp độ nổi bật — cả hai là sự thật cơ học
  đã khóa, Core Rule #7 không áp dụng) → (3) chi tiết trúng/hụt/crit
  từng pha → (4) Lực chiến ước tính (`estimate_ratio`, D.13 — độ nổi bật
  thấp nhất, ĐÚNG Core Rule #7 vì đây là ước tính xác suất, không phải
  sự thật đã khóa). `ux-designer` nên đối chiếu thứ tự này khi thiết kế
  mục UI Requirements kế tiếp.

### 4. Âm thanh

Đúng phạm vi "tối thiểu" của `game-concept.md` — không có yêu cầu audio
nào BLOCKING cho MVP; toàn mục này ở mức ADVISORY, có thể bỏ qua hoàn
toàn ở bản đầu.

- Nếu bổ sung sau, giới hạn tối đa 2 SFX ngắn (<0.5s, dạng "tick"/"đóng
  dấu"):
  - 1 âm "đóng dấu" dùng chung cho cả 3 outcome kết thúc trận (không
    phân biệt bằng âm thanh — thị giác đã đủ phân biệt, tránh nhân đôi
    kênh tín hiệu).
  - (Tùy chọn, có thể bỏ) 1 âm nhẹ riêng cho chí mạng — chỉ cân nhắc nếu
    playtest cho thấy tín hiệu thị giác bị bỏ lỡ.
- Không đề xuất: nhạc nền combat riêng, SFX cho từng đòn, voice-over,
  ambient loop — vượt quá scope "tối thiểu" và không tương xứng effort
  cho dự án cá nhân.

📌 **Asset Spec** — Visual/Audio requirements đã được định nghĩa. Sau khi
art bible được duyệt, chạy `/asset-spec system:combat-system` để tạo mô
tả hình ảnh chi tiết theo từng asset, kích thước, và prompt sinh ảnh từ
section này.

## UI Requirements

**Không có màn hình chiến đấu riêng biệt**: Combat diễn ra ngay trong
luồng tường thuật chính (cùng màn hình Turn Manager dùng cho mọi lượt
khác) — không chuyển cảnh/màn hình phụ, giữ đúng tinh thần "tiểu thuyết
tương tác liên tục", không phải chuyển sang 1 "chế độ combat" tách biệt.

**Character Card mở rộng khi `in_combat=true`**: thêm 1 khối "Trạng thái
giao đấu" hiển thị: HP hiện tại/HP tối đa của cả 2 bên (thanh HP theo
bước rời rạc — Visual/Audio Requirements), số thứ tự pha hiện tại
(`exchange_id`), và banner kết quả khi trận kết thúc (khung "con dấu" 3
tín hiệu theo `outcome.type`, đã đặc tả ở Visual/Audio Requirements).
Khối này biến mất khi `in_combat=false`.

**Khung "con dấu" chênh lệch cảnh giới KHÔNG thuộc khối "Trạng thái giao
đấu" ở trên — hiển thị CẢ TRƯỚC LẪN TRONG trận** (MỚI 2026-08-06 vòng 3
`/design-review`, đóng gap BLOCKING [ux-designer] "Fix F vòng 1 đặt
khung cảnh giới cạnh Điểm Chỉ số trên Character Card, NGỤ Ý luôn hiện kể
cả trước trận — nhưng UI Requirements, mục implementer thực sự đọc,
chưa từng nói rõ điều này; đọc nghĩa đen có thể bị gate nhầm vào khối
chỉ-khi-`in_combat=true`, khiến cảnh báo chỉ hiện SAU khi đã vào trận,
đúng thứ Fix F sinh ra để chặn, phá thẳng Player Fantasy 'agency ở khâu
chuẩn bị'"): Khung "con dấu" chênh lệch cảnh giới (`gap_realm(self)>0`,
D.1) là 1 PHẦN CỦA khối Điểm Chỉ số CHUẨN trên Character Card — hiển
thị bất kể `in_combat`, giống hệt cách các trường hồ sơ khác (Tên, Giới
tính...) không bị gate theo trạng thái combat. Đây khác hẳn
`estimate_ratio` (mục dưới) — chỉ `estimate_ratio` mới bị giới hạn
"chỉ trước trận".

**Nguyên tắc bắt buộc (MỚI 2026-08-06 vòng 2 `/design-review`, đóng gap
"ngân sách 4 ô loại trọn 1 category hành động khỏi lối chạm" — phát
hiện hội tụ độc lập bởi `game-designer` VÀ `ux-designer`, tái lập chính
xác lỗi mà fix vòng 1 vừa đóng, lần này trên Phòng thủ/Bỏ chạy thay vì
thức)**: **Mọi CATEGORY hành động hợp lệ của pha (thức, Phòng thủ, Bỏ
chạy) phải luôn tới được bằng đúng 1 thao tác chạm. Ngân sách 4 ô KHÔNG
BAO GIỜ được phép loại bỏ TRỌN một category** — đặc biệt "Bỏ chạy", vì
đây là hành động duy nhất có thể cứu mạng thật (Pillar 2, không có thử
lại) trong 1 hệ có mức cược sinh tử thật.

**Danh sách hành động mỗi pha tái sử dụng UI gợi ý sẵn có của Turn
Manager — bố cục 4 ô CỐ ĐỊNH VỊ TRÍ** (SỬA 2026-08-06 vòng 2, thay thế
bố cục "ưu tiên tier rồi lấp chỗ trống" của vòng 1):
- **Ô 3 = "Phòng thủ"**, **Ô 4 = "Bỏ chạy"** — CỐ ĐỊNH, luôn hiện, KHÔNG
  BAO GIỜ bị thức hay "Xem thêm" chiếm chỗ (cả 2 hành động này LUÔN hợp
  lệ mỗi pha cho người chơi — Core Rule #2b/#9 — nên luôn xứng đáng 1 ô
  riêng, không cạnh tranh ngân sách với thức).
- **Ô 1–2 = thức khả dụng**, sắp theo **TIER CAO NHẤT trước** (tiêu chí
  tất định, đóng gap vòng 1 "ưu tiên theo gì chưa định nghĩa"); khi ≥2
  thức cùng tier cao nhất, **tie-break theo `thuc_id` tăng dần** (thứ
  tự alphabet, MỚI vòng 2 — đóng gap "chưa có tiebreak", đảm bảo thứ tự
  hiển thị ỔN ĐỊNH giữa các lần render, tránh người chơi chạm nhầm do
  dựa vào vị trí ghi nhớ cơ học/muscle-memory trên màn hình cảm ứng).
  Nếu hết thức (đúng Edge Case fallback), Ô 1 hiển thị "Đánh thường".
- Ô nhập tự do vẫn tồn tại cạnh 4 ô trên cho trường hợp người chơi
  muốn diễn đạt hành động ngoài danh sách gợi ý (đúng tinh thần tự do
  nhập vai Pillar 5) — không cần UI riêng, chỉ cần Combat cung cấp đúng
  danh sách hành động hợp lệ cho UI đã có của Turn Manager render.

**Khi >2 thức chưa dùng cùng lúc** (rất phổ biến giữa/cuối trận vì luật
không-lặp-thức áp dụng TOÀN TRẬN — nhân vật có tối đa 6 thức):
**Ô 2 đổi thành "Xem thêm"** thay vì thức ưu tiên nhì (Ô 1 vẫn giữ
thức tier cao nhất) — mở 1 danh sách đầy đủ dạng nút chạm (không phải
ô nhập tự do) liệt kê MỌI thức `known_skill_ids` chưa dùng trong trận,
sắp XẾP THEO CÙNG tiêu chí tất định (tier giảm dần, tie-break `thuc_id`
tăng dần — KHỚP thứ tự đã dùng để chọn 2 ô ưu tiên, tránh 2 nơi hiển
thị thứ tự khác nhau). **"Xem thêm" KHÔNG cần liệt lại Phòng thủ/Bỏ
chạy** — 2 hành động đó đã LUÔN có mặt cố định ở Ô 3/4, không bao giờ
bị ẩn nên không cần xuất hiện lại trong popover. Ô nhập tự do vẫn tồn
tại song song, nhưng KHÔNG còn là lối thoát DUY NHẤT để dùng 1 thức đã
học hợp lệ — giữ 100% thao tác chọn-hành-động-hợp-lệ (thức LẪN Phòng
thủ/Bỏ chạy) trong phạm vi chạm trên Mobile Web.

**Ràng buộc BẮT BUỘC cho chính bố cục popover — phát biểu theo THUỘC
TÍNH QUAN SÁT ĐƯỢC, không theo cơ chế cụ thể** (MỚI 2026-08-06 vòng 3,
SỬA vòng 4 — đóng gap [ux-designer] "lần tái phát THỨ TƯ của cùng lớp
lỗi: vòng 1 ẩn thức → vòng 2 ẩn Bỏ chạy ở bố cục ĐÓNG → vòng 3 phát biểu
bất biến chỉ cấm 'che'/'chặn', bỏ sót cơ chế thất bại thứ ba — CUỘN: 1
popover non-modal dạng bottom-sheet full-height đẩy Ô 3/4 ra khỏi
viewport phía trên, về mặt kỹ thuật không 'che' không 'chặn' nhưng vẫn
cần 1 thao tác cuộn trước khi chạm được 'Bỏ chạy', đúng nghĩa đen thỏa
mãn bản vòng 3 mà vẫn phá tinh thần 1-chạm — kết luận: bất biến phát
biểu theo CƠ CHẾ (che/chặn) sẽ luôn có cơ chế thứ N+1 lách qua; đổi sang
phát biểu theo THUỘC TÍNH chặn hết mọi cơ chế cùng lúc"):

**Ô 3 (Phòng thủ) và Ô 4 (Bỏ chạy) PHẢI tới được bằng ĐÚNG 1 thao tác
chạm, KHÔNG CẦN bất kỳ thao tác nào khác trước đó (kể cả cuộn/vuốt/đóng
lớp phủ), ở MỌI trạng thái UI — kể cả khi popover "Xem thêm" đang mở.**
Đây là bất biến ĐẦU RA (quan sát được, kiểm bằng thao tác thật của
người dùng), không phải danh sách cơ chế bị cấm — bất kỳ thiết kế
popover nào (modal nổi trên, non-modal, panel một phần, v.v.) đều được
phép MIỄN LÀ thuộc tính này giữ đúng. Ràng buộc TƯƠNG TÁC (không phải
hình ảnh/kích thước) nên chốt ở GDD này, không hoãn cho `/ux-design` —
thi công chi tiết (bố cục popover, kích thước, animation) vẫn hoãn
`/ux-design` khi viết `character-card.md`; SHAPE dữ liệu Combat cần
cung cấp cho popover (danh sách đầy đủ kèm `thuc_id`/`tier`/
`style_descriptor` để UI tự hiển thị nhãn, đã sẵn có nội bộ D.14) đã
chốt ở đây, không cần đợi `/ux-design`.

**Bất biến tương đương cho Keyboard/Mouse** (MỚI vòng 3, đóng gap
[ux-designer] "invariant '1 chạm' chỉ viết cho touch, thiếu phát biểu
tương đương cho keyboard dù `technical-preferences.md` liệt kê
Keyboard/Mouse là input CHÍNH THỨC ngang hàng Touch"): Phòng thủ/Bỏ
chạy PHẢI luôn có 1 phím tắt cố định hoặc nằm trong cùng 1 tab-stop
không đổi theo trạng thái popover — cùng mức bảo đảm như Ô 3/4 có cho
touch.

**"Phòng thủ" — affordance tối thiểu** (MỚI vòng 2, đóng gap
`ux-designer` "người chơi không biết Phòng thủ có tác dụng gì"): Ô
"Phòng thủ" PHẢI kèm 1 dòng mô tả tĩnh, định tính, không cần số chính
xác (VD: "giảm sát thương nhận vào pha này") — không để trần trụi chỉ
có tên hành động, vì đây là cơ chế MỚI (Core Rule #2b) không có
`style_descriptor` tự nhiên như thức để người chơi suy luận ngữ nghĩa.
**Ràng buộc phối hợp với `TOUCH_TARGET_MIN=44px`** (registry, MỚI vòng
3, đóng gap [ux-designer] "combat-system.md chưa đăng ký vào hằng số
này dù định nghĩa nhiều phần tử chạm mới"): dòng mô tả này KHÔNG được
thu hẹp vùng chạm thực tế của nút "Phòng thủ" xuống dưới 44px — mô tả
đặt CẠNH (không đè lên) vùng chạm, tự wrap dòng nếu cần trên màn hình
hẹp thay vì co vùng chạm lại. Thi công chi tiết (chữ, kích thước) —
`/ux-design`; ràng buộc bất khả xâm phạm này chốt ở đây.

**Ước tính Lực chiến trước trận (Formula D.13)** hiển thị trên Character
Card ở trạng thái `in_combat=false` (trước khi giao chiến) — độ nổi bật
thấp nhất trong visual hierarchy (theo `art-director` đã chốt), rõ ràng
đây là thông tin tham khảo, không phải kết quả đã khóa.

📌 **UX Flag — Combat System**: Hệ này có yêu cầu UI thật (mở rộng
Character Card + tái sử dụng UI gợi ý hành động của Turn Manager). Ở
Phase 4 (Pre-Production), chạy `/ux-design` để tạo UX spec cho khối
"Trạng thái giao đấu" trên Character Card **trước khi** viết epic —
story tham chiếu UI nên trích `design/ux/character-card.md` (khi được
tạo), không trích thẳng GDD này.

## Acceptance Criteria

*(Đề xuất bởi `qa-lead`. Mọi AC đánh dấu **Logic** hoặc **Integration**
là BLOCKING theo `coding-standards.md` — phải có test tự động pass
trước khi story liên quan được Done. Test dùng RNG/roll đã mock ở giá
trị cố định (Determinism) — không dựa vào xác suất thật không seed.)*

### Core Rules

**AC-01** (Rule #1 — `in_combat` duy trì xuyên suốt nhiều lượt, VIẾT LẠI
2026-08-06 vòng 2 — bản trước mâu thuẫn trực tiếp bảng States and
Transitions: câu chữ cũ ngụ ý `in_combat` tắt NGAY lượt `battle_active`
chuyển `false`, nhưng bảng States khai state "Battle Concluded" — nơi
banner kết quả hiển thị — chuyển sang "Not In Combat" ở "lượt KẾ TIẾP",
nghĩa là `in_combat` PHẢI còn `true` trong chính lượt kết thúc để banner
có chỗ hiển thị, đóng gap `/design-review` "AC-01 mâu thuẫn bảng
States"): GIVEN 1 hành động kích hoạt giao chiến ở lượt Turn Manager T,
WHEN trận kết thúc ở lượt T+2 (`battle_active` chuyển `true→false` tại
T+2), THEN `in_combat=true` giữ nguyên liên tục từ T đến HẾT lượt T+2
(bao gồm cả lượt `battle_active` vừa chuyển `false` — state "Battle
Concluded", banner kết quả hiển thị); `in_combat` CHỈ chuyển `false` ở
ĐẦU lượt T+3 (chuyển sang "Not In Combat", đúng bảng States and
Transitions). *(Integration test.)*

**AC-02** (Rule #2 — hành động NPC là logic hệ thống, không phải LLM):
GIVEN đến bước chọn hành động của NPC trong 1 pha, WHEN hệ thống chạy
thuật toán chọn thức đối thủ, THEN `narration_call` KHÔNG được gọi ở
bước này (spy đếm = 0); chỉ đúng 1 `narration_call` xảy ra SAU KHI pha
đã resolve xong. *(Integration test, spy trên `narration_call`.)*

**AC-03** (Rule #4 — phạt vượt bậc tính lại MỖI pha, không cache): GIVEN
cùng 1 nhân vật dùng thức tier=2 ở pha 1 và thức tier=4 ở pha 3 trong
CÙNG 1 trận, WHEN `effective_stat` được tính ở mỗi pha, THEN `gap_gear`
(và do đó `effective_ATK`) khác nhau đúng theo `skill_tier_used` của pha
đó — giá trị pha 3 KHÔNG bằng giá trị đã cache từ pha 1. *(Logic test.)*

**AC-04** (Rule #5 — không lặp thức tính trên TOÀN TRẬN): GIVEN thức X
đã dùng ở pha 1 của trận hiện tại, WHEN nhân vật cố dùng thức X lại ở
pha 5 CÙNG trận, THEN thức X không nằm trong danh sách hành động khả
dụng của pha 5. *(Logic test.)*

**AC-05** (Rule #5 — fallback "Đánh thường" khi hết thức): GIVEN toàn bộ
`known_skill_ids` khả dụng đã dùng hết trong trận, WHEN nhân vật (người
chơi HOẶC NPC) cần chọn hành động, THEN "Đánh thường" xuất hiện trong
danh sách gợi ý và có thể chọn được, hành động KHÔNG bị chặn. *(Logic
test.)*

**AC-06** — **RÚT KHỎI PHẠM VI (SỬA 2026-08-06 vòng 2)**: "Vật phẩm
chiến đấu" đã CẮT khỏi MVP (Core Rule #6, QĐ-2) — không còn hành động
"Dùng vật phẩm" để test. Số AC giữ lại làm placeholder (không tái sử
dụng) để tránh xáo trộn thứ tự các AC khác trong tài liệu tham chiếu.

**AC-07** (Rule #7 — Lực chiến/`estimate_ratio` KHÔNG quyết định
thắng/thua, ngoại trừ vai trò eligibility-gate của D.9b): GIVEN 2 lần
gọi `resolve_exchange` với `effective_stat` giống hệt nhau nhưng `w_*`
(D.13) hoặc `Điểm_Kỹ_Năng`/`Điểm_Trang_Bị` khác nhau, VÀ
`is_spar_friendly=false` (loại trừ nhánh D.9b), WHEN so sánh outcome/HP
trả về, THEN kết quả `resolve_exchange` giống hệt nhau tuyệt đối — thay
đổi trọng số D.13 không làm thay đổi bất kỳ output nào của D.2–D.10.
Ai THẮNG (`nominal_winner`) luôn do HP=0 quyết định, không bao giờ do
Lực chiến — D.9b (khi `is_spar_friendly=true`) chỉ có thể đổi NHÃN kết
quả đã có (`win`/`lose` → `no_outcome`), không bao giờ đổi AI là
`nominal_winner`. *(Logic test, architecture-contract; xem AC mới cho
D.9b ở phần Formulas.)*

**AC-08** (Rule #8 — không có kết quả hòa/null NGOÀI 4 đường đã định
nghĩa): GIVEN các nhánh kết thúc trận có thể xảy ra: HP=0 (không
spar-eligible), bỏ chạy thành công, hòa giao hữu (D.9b), tín hiệu khẩn
cấp xen ngang, chạm `TECHNICAL_EXCHANGE_CAP` (spar và non-spar), WHEN
duyệt hết các nhánh bằng test riêng, THEN `outcome` luôn nhận đúng 1
trong 3 giá trị `{"win","lose","no_outcome"}` — không bao giờ
`null`/`undefined`; VÀ khi `is_spar_friendly=false`, HP=0 không qua
D.9b/D.9c-cap-nhánh-spar KHÔNG BAO GIỜ cho ra `no_outcome`. *(Logic
test tổng hợp nhiều kịch bản.)*

**AC-09** (Rule #11 — `locked_result` đủ field + không rò số ra
`narration_text`, sửa 2026-08-06 theo schema thống nhất): GIVEN 1 pha đã
resolve xong, WHEN kiểm tra `locked_result`, THEN mỗi `per_actor[id]`
chứa đủ `thuc_id`, `action_type`, `executed`, `hit`, `crit`,
`damage_dealt`, `heal`, `hp_after`; cấp ngoài chứa `exchange_id`,
`first_id`, `second_id`, `battle_active`; **KHÔNG có field `dodge`**
(đóng gap "AC-09 và D.8 loại trừ lẫn nhau" — D.3 không sinh sự kiện né
tách biệt khỏi hụt, `hit=false` là tín hiệu duy nhất); `heal` PHẢI có
mặt dù bằng 0 (đóng gap "heal rơi khỏi hợp đồng, không qua Numeric Leak
Detection"); VÀ `narration_text` tương ứng không chứa số nguyên/số thập
phân trần trụi nào của các field trên. *(Integration test với Contract
Enforcement.)*

**AC-09b** (Visual/Audio Requirements — `narration_text` phải nêu rõ
outcome bằng lời, MỚI 2026-08-06 vòng 3, đóng gap BLOCKING [ux-designer]
"AC-09 chỉ cấm số trần, không yêu cầu nêu outcome — kênh dự phòng
không-phụ-thuộc-thị-giác cho win/lose không được hợp đồng hóa". SỬA
2026-08-06 vòng 4, đóng gap BLOCKING hội tụ độc lập [qa-lead][ux-designer]
"'kiểm bằng danh sách từ khóa cho phép' tự mâu thuẫn với 'không cần đúng
từ khóa cứng', và danh sách đó chưa từng được định nghĩa ở bất kỳ đâu"):
GIVEN 1 pha kết thúc trận (`battle_active` chuyển `true→false`), WHEN
kiểm tra `narration_text` tương ứng, THEN văn bản chứa ÍT NHẤT 1 từ/cụm
từ khớp (không phân biệt hoa-thường, chấp nhận biến thể có dấu câu/hậu
tố) với danh sách CHO PHÉP theo đúng `outcome.type` của pha đó:

| `outcome.type` (+ ngữ cảnh phụ) | Danh sách từ khóa cho phép (khớp 1 trong số này là ĐỦ) |
|---|---|
| `win` | thắng, chiến thắng, hạ gục, khuất phục, đánh bại, áp đảo, giành phần thắng, ngã gục (khi chủ ngữ là đối phương) |
| `lose` | thua, thất bại, gục ngã, trọng thương, bị đánh bại, không chống đỡ nổi, khuất phục (khi chủ ngữ là nhân vật chính), gục xuống |
| `no_outcome` — bỏ chạy thành công | chạy thoát, rút lui, bỏ chạy, thoát khỏi, tháo chạy, thoát thân |
| `no_outcome` — hòa giao hữu (D.9b) | hòa, bất phân thắng bại, ngang tài ngang sức, dừng lại, kết thúc trong hòa khí, không phân định |
| `no_outcome` — tín hiệu khẩn cấp/chạm cap trong spar | gián đoạn, dừng đột ngột, bị cắt ngang, ngừng lại |

Đây là hàng rào TỐI THIỂU (permissive — bất kỳ cách diễn đạt nào chứa 1
từ khớp là PASS), KHÔNG phải văn phong bắt buộc cho AI — không cấm AI
dùng từ khác miễn có ít nhất 1 từ trong danh sách xuất hiện. Danh sách
này thuộc sở hữu Combat System (không tách rời sang
`mechanic-narration-contract-enforcement.md` — đó chỉ định nghĩa CƠ CHẾ
Numeric Leak Detection, không định nghĩa từ vựng theo hệ). *(Integration
test với Contract Enforcement.)*

**AC-10** (Rule #12 — tín hiệu hand-off phát ĐÚNG 1 LẦN, chỉ ở pha kết
thúc): GIVEN 1 trận kéo dài 4 pha, kết thúc ở pha 4, WHEN theo dõi sự
kiện hand-off qua cả 4 pha, THEN sự kiện chỉ phát sinh đúng 1 lần, tại
pha 4; các pha 1–3 không phát tín hiệu này. *(Integration test.)*

**AC-11** (Interactions — bố cục 4 ô cố định vị trí, VIẾT LẠI 2026-08-06
vòng 2 — đóng gap "AC-11 stale, không phản ánh cơ chế Xem thêm/tier-
priority" + "ngân sách 4 ô loại trọn category Phòng thủ/Bỏ chạy"):
GIVEN nhân vật có ≥3 thức chưa dùng trong trận, WHEN Combat build danh
sách gợi ý cho Turn Manager, THEN danh sách LUÔN có đúng 4 mục theo bố
cục cố định — Ô 1 = thức tier cao nhất (tie-break `thuc_id` tăng dần),
Ô 2 = "Xem thêm" (liệt kê TOÀN BỘ thức chưa dùng, cùng thứ tự tất
định), Ô 3 = "Phòng thủ", Ô 4 = "Bỏ chạy"; VÀ với nhân vật có ≤2 thức
chưa dùng, Ô 2 hiển thị thức ưu tiên nhì (hoặc "Đánh thường" nếu hết
thức) THAY VÌ "Xem thêm", Ô 3/4 KHÔNG ĐỔI. TRONG MỌI TRƯỜNG HỢP, Ô 3
("Phòng thủ") và Ô 4 ("Bỏ chạy") không bao giờ vắng mặt hay bị thay thế
bởi thức/"Xem thêm" — đóng trực tiếp invariant "không category nào bị
loại trọn khỏi 4 ô". *(Integration test.)*

### Formulas (D.1–D.13)

**AC-12** (D.1 — chỉ số hiệu dụng, ca thường): GIVEN `tier(C)=3`,
`tier(đối thủ)=6`, `weapon_tier(C)=5`, `skill_tier_used(C)=4`,
`base_ATK=50`, WHEN tính `effective_stat`, THEN `gap_realm=3`,
`gap_gear=2`, `layer_mult` lần lượt `0.55`/`0.7`, `total=0.385`,
`effective_ATK=19.25` (đúng ví dụ trong GDD). *(Logic test.)*

**AC-13** (D.1 — boundary "floor khi chồng phạt"): GIVEN `gap_realm=10`,
`gap_gear=10`, WHEN tính `total_penalty_multiplier`, THEN mỗi lớp floor
ở `0.1`, tích `0.01` bị `clamp` lên đúng `FLOOR_TOTAL=0.05` (không phải
`0.01`), `effective_ATK=2.5`; VÀ chạy thêm test tham số hóa (nhiều tổ
hợp `gap` cực đoan khác nhau, `base_X>0`) khẳng định `effective_stat`
không bao giờ âm và không bao giờ về đúng 0. *(Logic test tham số hóa.)*

**AC-13b** (D.1 — `crippled_layer` ca thường + boundary cộng dồn với
floor; MỚI 2026-08-09, cascade từ `/design-review` round 1 của
`death-and-consequence.md`): GIVEN `death_and_consequence_blocked(C)=true`,
`gap_realm=0, gap_gear=0`, `CRIPPLED_PENALTY_MULT=0.85`, WHEN tính
`total_penalty_multiplier`, THEN kết quả = `0.85` chính xác (không có
gap khác che khuất). Test đối chứng boundary: GIVEN CÙNG cờ
`death_and_consequence_blocked=true` NHƯNG `gap_realm=10, gap_gear=10`
(cực đoan như AC-13), WHEN tính lại, THEN kết quả VẪN bị `clamp` lên
đúng `FLOOR_TOTAL=0.05` — GIỐNG HỆT AC-13 không có `crippled_layer` —
xác nhận sàn `FLOOR_TOTAL` bảo vệ dù cộng dồn 3 lớp phạt nặng nhất,
`effective_stat` không bao giờ thấp hơn mức đã có trước khi thêm lớp
này. *(Logic test tham số hóa, mirror AC-13.)*

**AC-14** (D.2 — thứ tự ra đòn, ca thường): GIVEN
`effective_SPD(player)=32.5`, `effective_SPD(npc)=40`, WHEN gọi
`first(A,B)`, THEN `first=npc, second=player`. *(Logic test.)*

**AC-15** (D.2 — boundary hòa SPD tuyệt đối, VIẾT LẠI 2026-08-06 — bản
cũ dùng `coin_flip(seed=exchange_id)` tự chứng nhận cho 1 bug thiên vị
cố định giữa các trận, xem Open Questions): GIVEN
`effective_SPD(A) = effective_SPD(B) = 40.0` chính xác, WHEN gọi
`first(A,B)` nhiều lần với `roll_uniform` mock KHÁC NHAU mỗi lần (không
phải cùng 1 giá trị cố định), THEN kết quả `first/second` THAY ĐỔI theo
đúng giá trị roll (roll&lt;0.5→A, roll≥0.5→B) — chứng minh `coin_flip()`
KHÔNG tự seed theo `exchange_id`, và Undo+xác nhận lại cùng pha với roll
mock khác có thể ra `first/second` khác (đúng Turn Manager AC-12).
*(Logic test.)*

**AC-16** (D.3 — trúng/hụt, ca thường): GIVEN `effective_ACC=45.2`,
`effective_Né=38.0`, roll mock `=0.4`, WHEN tính `P_hit` và `hit`, THEN
`P_hit=0.572`, `hit=true`. *(Logic test.)*

**AC-17** (D.3 — boundary ACC/Né 0/0): GIVEN `effective_ACC =
effective_Né = 0`, WHEN tính `P_hit`, THEN `P_hit=0.5` chính xác, không
có exception/phép chia nào xảy ra. *(Logic test.)*

**AC-18** (D.4 — sát thương cơ bản, boundary "đấm vào tường", VIẾT LẠI
2026-08-06 — thêm `MIN_RAW_RATIO`, đóng gap "bế tắc vô hạn"): GIVEN
`effective_ATK=19.25`, `effective_DEF=22`, `hit=true`, `MIN_RAW_RATIO=0.05`,
WHEN tính `raw_damage`, THEN `raw_damage=max(19.25*0.05, -2.75)=0.9625`
(KHÔNG còn về đúng 0 — sàn chip luôn >0 khi `effective_ATK>0`), pha ghi
nhận `hit=true`, `damage>0`. *(Logic test.)*

**AC-19** (D.5 — chí mạng): GIVEN `effective_CritRate=0.18`, roll mock
`=0.05`, `effective_CritDamage=1.6`, WHEN tính `is_crit`/`crit_multiplier`,
THEN `is_crit=true`, `crit_multiplier=1.6`; VÀ với `effective_CritDamage`
giả định <1.0, `crit_multiplier` vẫn floor ở `1.0`. *(Logic test.)*

**AC-20** (D.6 — sát thương cuối, ca thường): GIVEN `raw_damage=30`,
`crit_multiplier=1.6`, `effective_Amp=0.1`, `effective_Mitigation=0.15`,
WHEN tính `final_damage`, THEN `final_multiplier=0.935`,
`final_damage=45`. *(Logic test.)*

**AC-21** (D.6 — boundary `MIN_DMG_MULT` + sàn `max(1,...)`, VIẾT LẠI
2026-08-06 vòng 3 — bản cũ chỉ assert `final_damage>0` mà KHÔNG có sàn
nào trong công thức bảo đảm điều đó, xác nhận sai bằng harness
`prototypes/combat-reference/harness.py` thí nghiệm Q2, tỉ lệ về 0 đo
được 100% ở kịch bản áp chế cực đoan): GIVEN `effective_Mitigation` cực
đoan (VD 5.0), `raw_damage>0`, WHEN tính `final_multiplier` rồi
`final_damage`, THEN `final_multiplier` bị `clamp` ở đúng
`MIN_DMG_MULT=0.1`, VÀ `final_damage >= 1` LUÔN đúng khi `raw_damage>0`
— kể cả khi `final_damage_raw` (giá trị TRƯỚC sàn `max(1,...)`) làm
tròn về 0. *(Logic test.)*

**AC-22** (D.6 — boundary `raw_damage` ở sàn tối thiểu → `final_damage`
KHÔNG BAO GIỜ về 0 khi `raw_damage>0`, VIẾT LẠI 2026-08-06 vòng 3 —
đóng gap hội tụ độc lập [game-designer][systems-designer]: "`effective_ATK`
bị D.1 đè xuống `FLOOR_TOTAL` + `effective_Mitigation` vừa phải (VD 0.5,
KHÔNG cực đoan) khiến `round(raw*0.5)=0` — bug thật, không phải giả
định"): GIVEN `effective_ATK=2.5` (floor D.1) → `raw_damage=0.125` (D.4,
sàn `MIN_RAW_RATIO`), `effective_Mitigation=0.5` (không cực đoan, không
crit), WHEN tính `final_damage`, THEN `final_damage_raw=round(0.125×0.5)=0`
NHƯNG `final_damage=max(1,0)=1` — sàn `max(1,...)` (D.6, MỚI vòng 3)
kích hoạt đúng lúc cần, không còn 0 sát thương thật trên đòn TRÚNG; VÀ
với `effective_ATK(attacker)=0` (biên tuyệt đối, chỉ số gốc=0 hoặc phạt
về 0 — hiếm nhưng hợp lệ), `raw_damage=0` → `final_damage=0` tuyệt đối
bất kể multiplier (giữ nguyên hành vi biên cũ cho case ATK=0, sàn
`max(1,...)` KHÔNG áp dụng khi `raw_damage=0`). *(Logic test.)*

**AC-23** (D.7 — lifesteal, ca thường + boundary overheal): GIVEN
`final_damage=45`, `effective_Lifesteal=0.1`, `hp(attacker)=195`,
`max_HP(attacker)=200`, WHEN tính `heal_attacker`/`hp'(attacker)`, THEN
`heal=5`, `hp'=200` (clamp đúng `max_HP`); VÀ với `final_damage=0`,
`heal_attacker=0` tự động. *(Logic test.)*

**AC-24** (D.8 — miss short-circuit, sửa 2026-08-06 vòng 1: `crit:null`
thay `crit:false`, nhất quán sentinel 3-trạng-thái với `r2.hit=null`
của D.9; chữ ký BỔ SUNG `defender_is_defending` vòng 2, không ảnh hưởng
nhánh miss): GIVEN `hit=false` (bất kể `defender_is_defending`), WHEN
gọi `resolve_attack`, THEN trả về đúng `{hit:false, crit:null, damage:0,
heal:0, hp_defender_after: hp_defender KHÔNG ĐỔI}` — D.4 đến D.7 không
được gọi (spy đếm = 0), `defend_mult` (D.6) không được tính vì D.6
không được gọi. *(Logic test, spy trên D.4–D.7.)*

**AC-25** (D.9 — ca thường, không ngắt sớm, cả 2 dùng thức, BỔ SUNG
assert theo actor_id 2026-08-06 vòng 2 — đóng gap `qa-lead` "AC-25 chỉ
mô tả văn xuôi, không assert đúng actor, không bắt được bug tráo
`hp_after`"): GIVEN các giá trị đúng Ví dụ 1 của GDD (NPC đi trước,
`action_type` cả 2 = "skill", `final_damage=45`, HP player 50→5; player
đòn 2 trúng `final_damage=30`, HP npc 40→10), WHEN gọi `resolve_exchange`,
THEN cả `r1` và `r2` đều `executed`, `battle_active=true`, D.10 VÀ
`exhaustion_drain` (nếu áp dụng) được tính cho CẢ HAI bên sau đó; VÀ
**`locked_result.per_actor[player_id].hp_after == 5`,
`locked_result.per_actor[npc_id].hp_after == 10`** — assert ĐÚNG THEO
`actor_id`, không chỉ theo biến cục bộ `first`/`second` — chặn trực
tiếp lỗi tráo HP giữa 2 actor tại bước ghép `per_actor` của D.9; VÀ
**`locked_result.outcome == null`** (MỚI 2026-08-06 vòng 3, đóng gap
[ui-programmer] "nhánh 'trận tiếp diễn' — nhánh PHỔ BIẾN NHẤT — không
được assert ở đâu cả trước vòng 3; `outcome` từng là biến chưa gán trong
chính pseudocode D.9 cho nhánh này"). *(Logic test.)*

**AC-26b** (D.9b/D.9c — `outcome.type` dịch ĐÚNG theo `player_id`, MỚI
2026-08-06 vòng 4, đóng gap BLOCKING [qa-lead] "field `player_id` — cơ
chế MỚI vòng 3 để sửa bug `self`/`other` không khai báo — chưa từng có
AC nào assert literal `outcome.type=='lose'`, dù Death & Consequence
đọc field này để kích hoạt hậu quả thật, kể cả permadeath"): GIVEN
`player_id=B` (B đóng vai người chơi trong trận này), HP của B về 0 (qua
bất kỳ nhánh nào — ngắt sớm D.9, drain D.4b, hay tiebreak D.9c), WHEN
`outcome` được xác định, THEN **`outcome.type == "lose"`** (KHÔNG phải
`"win"`) VÀ `outcome.loser_id == B`; VÀ đối chứng: GIVEN CÙNG dữ liệu số
(HP, action_type, roll mock) nhưng `player_id=A` thay vì B, WHEN
`outcome` được xác định, THEN **`outcome.type == "win"`** cho ĐÚNG actor
vừa thua ở test trước — xác nhận `outcome.type` phụ thuộc `player_id`,
không phụ thuộc actor_id nào cố định. *(Logic test — BLOCKING vì hậu
quả hạ nguồn có thể là permadeath.)*

**AC-26** (D.9 — boundary ngắt sớm, quyết định kiến trúc trung tâm, BỔ
SUNG assert actor_id 2026-08-06 vòng 2): GIVEN NPC đi trước,
`action_type` cả 2 = "skill", `final_damage=60` làm HP player 50→0,
WHEN gọi `resolve_exchange`, THEN `r2.executed=false`, `r2.hit=null`
(không phải `false`), `battle_active=false`, `outcome` xác định đúng
người thắng/thua; D.10 KHÔNG được gọi ở pha này (spy = 0); VÀ
`locked_result.per_actor[player_id].hp_after == 0`,
`locked_result.per_actor[npc_id].hp_after` KHÔNG ĐỔI so với đầu pha
(NPC không nhận sát thương vì đòn của player bị ngắt sớm). *(Logic
test, spy trên D.10.)*

**AC-27** (D.9 — chứng minh "cùng chết trong 1 pha" KHÔNG THỂ xảy ra):
GIVEN một ma trận ≥10 tổ hợp stat/roll khác nhau (deterministic, mock
đầy đủ) mà đòn đi trước hạ `hp[second]` về đúng 0, WHEN chạy
`resolve_exchange` trên TOÀN BỘ ma trận, THEN với MỌI tổ hợp,
`r2.executed` luôn là `false` — không tồn tại trường hợp nào mà
`hp[A]==0 AND hp[B]==0` cùng lúc. *(Logic test tham số hóa — đóng Edge
Case "cùng chết", không cần AC riêng ở mục Edge Cases.)*

**AC-28** (D.10 — HP Regen, ca thường + boundary overheal): GIVEN
`max_HP=200`, `effective_HPRegen=0.05`, `hp=150`, WHEN D.10 chạy (chỉ
khi `battle_active=true`), THEN `hp'=160`; VÀ với `hp=195`,
`hp'=min(200,205)=200`. *(Logic test.)*

**AC-28b** (D.11 — ca thường, MỚI 2026-08-06 vòng 3, đóng gap [qa-lead]
B4 "D.11 có 0 AC ca thường trước vòng 3 — chỉ boundary 0/0 (AC-29) và
tương tác hậu-thất-bại (AC-30) được test, đúng ví dụ GDD tự đưa ra chưa
từng có AC khớp"): GIVEN `effective_SPD(fleeing)=32.5,
effective_SPD(opponent)=40`, roll mock `=0.5`, WHEN tính `P_flee`/
`flee_success`, THEN `P_flee=0.425`, `flee_success=false` (khớp nguyên
văn ví dụ GDD). *(Logic test.)*

**AC-29** (D.11 — boundary SPD 0/0): GIVEN `effective_SPD(fleeing) =
effective_SPD(opponent) = 0`, WHEN tính `P_flee`, THEN `P_flee=0.5`
chính xác, không exception. *(Logic test.)*

**AC-30** (D.11 — bỏ chạy thất bại, tương tác với D.9, BỔ SUNG điều kiện
SPD 2026-08-06 vòng 3 — đóng gap [qa-lead] R9 "test không phân biệt được
'opponent đi trước vì override' với 'opponent đi trước vì D.2 vốn đã
chọn opponent'"): GIVEN `flee_success=false` VÀ `effective_SPD(bên bỏ
chạy) > effective_SPD(opponent)` (D.2 lẽ ra chọn BÊN BỎ CHẠY đi trước
nếu không có override — điều kiện BẮT BUỘC để chứng minh override thật
sự có tác dụng), WHEN pha giao đấu được giải quyết, THEN `first=opponent`
(override thắng D.2, chỉ đối thủ ra đòn), bên bỏ chạy KHÔNG thực hiện
đòn tấn công ở pha đó. *(Logic test.)*

**AC-31** (D.12 — dẫn xuất `max_invocations_per_battle` +
`is_pool_sufficient`): GIVEN `CONTENT_EXCHANGE_ESTIMATE=30` (đổi tên từ
`MAX_EXCHANGE_COUNT` 2026-08-03, giá trị không đổi),
`max_known_skills_per_character=6`, WHEN tính
`max_invocations_per_battle`, THEN kết quả = `ceil(30/6) = 5` chính xác
(bất biến so với trước sửa đổi);
VÀ với 1 kỹ năng author ở `min_thuc_per_skill=3` (LOCKED),
`is_pool_sufficient(skill) = (3>=5) = false` — coi là CẢNH BÁO
AUTHORING, không phải lỗi chặn build. *(Logic test, arithmetic thuần.)*

**AC-32** (D.12 — "Đánh thường" miễn trừ quy tắc không lặp thức,
RUNTIME): GIVEN nhân vật đã dùng "Đánh thường" ở pha 1 CÙNG trận, WHEN
nhân vật chọn "Đánh thường" lại ở pha 3, THEN hành động được CHẤP NHẬN
bình thường (khác AC-42 dành cho thức thường bị từ chối khi lặp).
*(Logic test.)*

**AC-33** (D.13 — ước tính Lực chiến, ca thường): GIVEN
`Điểm_Chỉ_Số(self)=310`, `Điểm_Kỹ_Năng=Điểm_Trang_Bị=0`, đối thủ
`Lực_chiến=250`, WHEN gọi `estimate_ratio`, THEN kết quả `=1.24`.
*(Logic test.)*

**AC-34** (D.13 — boundary 0/0): GIVEN `Lực_chiến(self) =
Lực_chiến(opponent) = 0`, WHEN gọi `estimate_ratio`, THEN trả về đúng
sentinel chuỗi `"N/A"` (KHÔNG phải `1.0`, KHÔNG phải `NaN`). *(Logic
test.)*

**AC-35** (D.13 — boundary 1 bên = 0): GIVEN `Lực_chiến(opponent)=0`,
`Lực_chiến(self)=310`, WHEN gọi `estimate_ratio`, THEN trả về đúng
sentinel chuỗi `"+∞"`, không có exception chia-cho-0. *(Logic test.)*

### Edge Cases

**AC-36** (NPC hết thức, fallback đối xứng): GIVEN NPC đã dùng hết
`known_skill_ids` hợp lệ giữa trận, WHEN đến lượt NPC chọn hành động,
THEN "Đánh thường" khớp `weapon_type` của NPC được tự động chọn làm dự
phòng — hành vi giống hệt đường dẫn code dùng cho người chơi. *(Integration
test.)*

**AC-37** (Undo pha dùng thức): GIVEN pha đã dùng thức X, sau đó bị
Undo, WHEN kiểm tra danh sách thức "đã dùng trong trận", THEN thức X
quay lại "chưa dùng"; VÀ khi xác nhận lại pha đó, roll là RNG re-roll
THẬT (giá trị mock lần 2 khác lần 1 → kết quả có thể khác). *(Integration
test, Turn Manager Undo + Combat.)*

**AC-38** — **RÚT KHỎI PHẠM VI (SỬA 2026-08-06 vòng 2)**: cùng lý do
AC-06 — "Vật phẩm chiến đấu" đã CẮT khỏi MVP. Số AC giữ lại làm
placeholder.

**AC-39** (Undo đúng pha KẾT THÚC trận): GIVEN pha N có `battle_active`
chuyển `true→false`, sau đó bị Undo, WHEN Undo thực thi, THEN
`in_combat=true`, `battle_active=true`, HP hai bên quay về giá trị TRƯỚC
pha N, pha N không còn nằm trong danh sách thức đã dùng. *(Integration
test.)*

**AC-40** (bỏ chạy thành công → `no_outcome`): GIVEN `flee_success=true`,
WHEN trận kết thúc, THEN `outcome="no_outcome"` (KHÁC `"win"`/`"lose"`),
`battle_active=false`. *(Logic test.)*

**AC-41a** (chạm `TECHNICAL_EXCHANGE_CAP`, KHÔNG spar — bắt buộc
win/lose qua D.9c): GIVEN `TECHNICAL_EXCHANGE_CAP=200`,
`is_spar_friendly=false`, 200 pha đã diễn ra liên tiếp mà chưa bên nào
HP=0, `hp_pct(A)=0.31, hp_pct(B)=0.18`, WHEN pha thứ 200 kết thúc, THEN
trận buộc kết thúc ngay với `outcome="win"` cho A (`hp_pct` cao hơn) —
KHÔNG BAO GIỜ `no_outcome` ở nhánh này. *(Logic test.)*

**AC-41b** (chạm `TECHNICAL_EXCHANGE_CAP`, CÓ spar — hòa): GIVEN
`TECHNICAL_EXCHANGE_CAP=200`, `is_spar_friendly=true`, D.9b chưa từng
kích hoạt trước đó, 200 pha đã diễn ra mà chưa bên nào HP=0, WHEN pha
thứ 200 kết thúc, THEN trận buộc kết thúc ngay với `outcome="no_outcome"`
cho CẢ HAI bên, bất kể %HP còn lại. *(Logic test.)*

**AC-41c** (tiebreak D.9c — biên hp_pct trùng tuyệt đối, VIẾT LẠI
2026-08-06 — bản cũ dùng `coin_flip(seed=exchange_id)`): GIVEN cùng
điều kiện AC-41a nhưng `hp_pct(A)=hp_pct(B)=0.20` chính xác, WHEN
tiebreak chạy với `roll_uniform` mock cụ thể, THEN kết quả quyết định
đúng theo giá trị roll đó (roll&lt;0.5→A, roll≥0.5→B), KHÔNG phụ thuộc
`exchange_id`; VÀ 2 trận khác nhau cùng chạm `TECHNICAL_EXCHANGE_CAP`
với `hp_pct` hòa nhưng roll mock khác nhau cho ra kết quả khác nhau
(đóng gap "thiên vị cố định giữa các trận"). *(Logic test, boundary.)*

**AC-41d** (D.9b — hòa giao hữu, ca dương): GIVEN
`SPAR_PARITY_TOLERANCE=0.15, SPAR_LOW_HP_THRESHOLD=0.15`,
`is_spar_friendly=true`, `Lực_chiến(A)=310, Lực_chiến(B)=280`
(`parity_diff≈0.097≤0.15`), A hạ B về 0 ở pha 12 với `hp_pct(A)≈0.082`
lúc đó, WHEN D.9 gọi D.9b, THEN `outcome="no_outcome"` (KHÔNG phải
`win=A`). *(Logic test, regression neo số — khớp ví dụ GDD.)*

**AC-41e** (D.9b — ca âm, parity không đủ): GIVEN cùng điều kiện AC-41d
nhưng `Lực_chiến(A)=400, Lực_chiến(B)=280` (`parity_diff≈0.30>0.15`),
WHEN D.9b chạy, THEN `outcome="win"` cho A bình thường — KHÔNG hòa dù
`hp_pct(A)` thấp. *(Logic test, boundary — negative case.)*

**AC-41f** (D.9b — ca âm, HP bên thắng không đủ thấp): GIVEN parity
thỏa như AC-41d nhưng `hp_pct(A)=0.55` lúc kết luận (>
`SPAR_LOW_HP_THRESHOLD`), WHEN D.9b chạy, THEN `outcome="win"` cho A
bình thường dù là giao hữu — KHÔNG hòa chỉ vì context spar.
*(Logic test, negative case.)*

**AC-41g** (D.9b — boundary cả 2 Lực chiến = 0, KHÔNG eligible): GIVEN
`is_spar_friendly=true`, `Lực_chiến(A)=Lực_chiến(B)=0`, WHEN tính
`spar_parity_eligible`, THEN = `false` CỨNG (không tính `parity_diff`
trivially = 0) — HP=0 sau đó luôn ra `win`/`lose` bình thường, không
bao giờ hòa qua đường D.9b khi cả 2 chưa có dữ liệu Lực chiến thật.
*(Logic test, boundary.)*

**AC-41j** (D.9b — negative test khi `is_spar_friendly=false`, MỚI
2026-08-06 vòng 3, đóng gap [qa-lead] B3 "còn treo từ vòng 2 — chưa AC
nào xác nhận `spar_parity_eligible` không bao giờ false-positive ngoài
giao hữu; bug ở đây âm thầm biến 'lose' thật thành 'no_outcome', vô hiệu
hóa Death & Consequence"): GIVEN các điều kiện HỆT AC-41d (parity đủ,
`hp_pct` bên thắng đủ thấp — CẢ HAI điều kiện D.9b đòi hỏi đều thỏa) NHƯNG
`is_spar_friendly=false`, WHEN `resolve_exchange` xử lý nhánh HP=0, THEN
`reclassify_outcome` KHÔNG BAO GIỜ được vào nhánh `no_outcome` —
`spar_parity_eligible` PHẢI = `false` (vì phụ thuộc trực tiếp
`is_spar_friendly`), kết quả `outcome` là `win`/`lose` bình thường theo
`nominal_winner`/`nominal_loser`, giống hệt hành vi D.9 KHÔNG có D.9b.
*(Logic test, negative case — BLOCKING vì bug ở đây làm mất tín hiệu
"lose" thật mà Death & Consequence phụ thuộc.)*

**AC-41h** (`external_abort_signal` — kiểm tra đầu state Awaiting
Exchange, D.2–D.14 không chạy, VIẾT LẠI 2026-08-06 vòng 3 — đóng 2 gap
[qa-lead]: (a) dải "D.2–D.10" là khoảng SỐ, không bao gồm D.11/D.14 dù
cả 2 reachable ở đúng bước "build gợi ý hành động"/"NPC chọn hành động"
mà AC này gate; (b) nhãn "unit + spy" không khớp từ khóa "Logic"/
"Integration" mà chính preamble mục này dùng làm tiêu chí BLOCKING, có
thể bị tooling đọc là non-blocking dù đây là tín hiệu an toàn liên hệ
thống): GIVEN `external_abort_signal=
{requested:true, reason_tag:"canon_event"}` được set TRƯỚC khi Combat
kiểm tra ở đầu "In Combat — Awaiting Exchange", WHEN lượt đó xử lý,
THEN `outcome="no_outcome"` ngay lập tức, `battle_active=false`;
**KHÔNG hàm nào trong D.2, D.3, D.4, D.4b, D.5, D.6, D.7, D.8, D.9, D.10,
D.11, D.14 được gọi** (spy đếm=0 cho TOÀN BỘ danh sách này, không chỉ
dải số D.2–D.10 — đóng gap "D.14 có thể được NPC pre-compute trước khi
signal được kiểm, vẫn pass AC cũ theo đúng nghĩa đen"); tín hiệu bị clear
ngay sau tiêu thụ (đọc lại = `null`). *(Integration test — đổi nhãn từ
"unit + spy" để khớp tiêu chí BLOCKING của mục này; provisional-interface
— nguồn trigger thuộc Situation/Encounter Generation.)*

**AC-41i** (`external_abort_signal` — set GIỮA lúc D.9 đang resolve,
KHÔNG áp dụng cho pha đang chạy): GIVEN pha N đang resolve
(`resolve_exchange` đã bắt đầu), signal được set NGAY GIỮA quá trình
đó (mock timing), WHEN pha N hoàn tất bình thường theo D.9 (không bị
ngắt atomic), THEN tín hiệu CHỈ được Combat kiểm tra và áp dụng ở ĐẦU
pha N+1 (nếu `battle_active` vẫn `true` sau pha N) — giữ nguyên tính
atomic của D.9/Core Rule #2-3. *(Integration test — đổi nhãn từ "unit"
2026-08-06 vòng 3, cùng lý do AC-41h; provisional-interface.)*

**AC-41k** (D.9 — cả hai bên cùng chọn "Bỏ chạy" và cùng thất bại, MỚI
2026-08-06 vòng 3, đóng gap hội tụ độc lập bởi 4 specialist —
[game-designer][systems-designer][ui-programmer][qa-lead] — "kịch bản
được chính pseudocode D.9 gọi tên nhưng zero AC phủ, và comment cũ gọi
nó 'hiếm' trong khi thực ra thường gặp: NPC Tầng 1 tự động bỏ chạy dưới
`NPC_FLEE_HP_THRESHOLD` đúng lúc người chơi độc lập cũng chọn Bỏ chạy"):
GIVEN `action_type_of[A]="flee"` VÀ `action_type_of[B]="flee"` trong
CÙNG 1 pha, `flee_success(A)=false` VÀ `flee_success(B)=false` (mock
`roll_uniform` để cả 2 đều thất bại), WHEN `resolve_exchange` chạy,
THEN: (a) thứ tự lặp kiểm Bỏ chạy là TẤT ĐỊNH theo `order_first`/
`order_second` (D.2, tính TRƯỚC vòng lặp flee-check — sửa 2026-08-06
vòng 3, đóng gap "thứ tự lặp `{A,B}` không xác định"), không phụ thuộc
thứ tự duyệt tập hợp của implementation; (b) KHÔNG bên nào tấn công pha
đó (`r1`/`r2` đều không tấn công); (c) `first`/`second` = `order_first`/
`order_second` thuần túy làm nhãn, KHÔNG ảnh hưởng D.10/`exhaustion_drain`
(vẫn áp dụng đối xứng cho cả 2 nếu `battle_active` còn `true` sau bước
này). *(Logic test, boundary.)*

**AC-42** (dùng lại thức đã dùng qua input tự do): GIVEN thức X đã nằm
trong danh sách "đã dùng trong trận", WHEN người chơi cố chọn thức X qua
input tự do (bỏ qua gợi ý UI), THEN hành động bị từ chối, KHÔNG tính là
1 pha hợp lệ. *(Logic test.)*

**AC-43** — **RÚT KHỎI PHẠM VI (SỬA 2026-08-06 vòng 2)**: cùng lý do
AC-06 — "Vật phẩm chiến đấu" đã CẮT khỏi MVP. Số AC giữ lại làm
placeholder.

**AC-44** (thắng đối thủ không có Hảo cảm theo dõi): GIVEN đối thủ chiến
thắng không phải NPC có Hảo cảm theo dõi, WHEN trận kết thúc với
`outcome="win"`, THEN Combat vẫn phát tín hiệu hand-off đầy đủ giống mọi
trường hợp khác — không có nhánh rẽ logic riêng theo loại đối thủ.
*(Logic test.)*

**AC-45** (Ranh giới phạm vi — Hảo cảm & ngưỡng 20 cấp KHÔNG phải input
của Combat, VIẾT LẠI 2026-08-06 vòng 3 — bản cũ cho phép "rà soát chữ ký
hàm" (review thủ công) làm phương án THAY THẾ test tự động, vi phạm
chính quy tắc BLOCKING của mục Acceptance Criteria này VÀ
`coding-standards.md`, đóng gap [qa-lead] còn treo từ vòng 2): GIVEN 2
lần gọi `resolve_exchange` với `A, B, action_type_of, thuc_id_of,
player_id` giống hệt nhau (cùng `effective_stat` qua Character Card
mock) chỉ khác 1 giá trị Hảo cảm giả lập được set trên actor mock (field
KHÔNG nằm trong chữ ký `resolve_exchange` — xem D.9), WHEN so sánh 2
`locked_result` trả về, THEN giống hệt tuyệt đối ở mọi field — không có
review thủ công nào được chấp nhận thay thế. *(Logic test,
architecture-contract.)*

### D.4b, D.14, Core Rule #2b/#2 (mới 2026-08-06, đóng blocker `/design-review`)

**AC-46** (D.4b — kiệt sức lũy tiến, ca thường + boundary onset, BỔ
SUNG `exhaustion_drain` 2026-08-06 vòng 2): GIVEN
`EXHAUSTION_ONSET_EXCHANGE=40`, `TECHNICAL_EXCHANGE_CAP=200`,
`exchange_id=120`, `max_HP=200`, `EXHAUSTION_DRAIN_PCT=0.05`, WHEN tính
`exhaustion_progress`/`exhaustion_regen_mult`/`exhaustion_drain`, THEN
`exhaustion_progress=0.5`, `exhaustion_regen_mult=0.5` (đúng ví dụ
GDD), `exhaustion_drain=round(200×0.05×0.5)=5`; VÀ với `exchange_id≤40`,
`exhaustion_progress=0` → `exhaustion_regen_mult=1`, `exhaustion_drain=0`
(clamp, không ảnh hưởng trận điển hình 15-50 pha, VỚI ĐIỀU KIỆN
`EXHAUSTION_ONSET_EXCHANGE` đang cấu hình > `CONTENT_EXCHANGE_ESTIMATE`
đang dùng). *(Logic test.)*

**AC-47a** (D.4b/D.10 — chứng minh hội tụ, property-based, TẤT ĐỊNH,
VIẾT LẠI 2026-08-06 vòng 3 — thay thế bản vòng 2, đóng 3 gap: (a)
[godot-specialist] harness vòng 2 không mô hình ngữ nghĩa `int/int` của
GDScript; (b) [systems-designer] `TECHNICAL_EXCHANGE_CAP` chưa từng nằm
trong ma trận quét gốc dù Safe Range của nó (100–500) × của
`EXHAUSTION_ONSET_EXCHANGE` (20–80) cho phép cửa sổ hẹp tới ~20 pha; (c)
harness vòng 2 không nằm trong repo, không tái kiểm được): GIVEN 1 ma
trận tổ hợp TẤT ĐỊNH (không RNG — giả định MỌI đòn trúng tuyệt đối,
KHÔNG crit, KHÔNG lifesteal, loại D.3/D.5/D.7 khỏi phạm vi, chỉ còn
D.1/D.4/D.4b/D.10 là hàm số thuần theo `exchange_id`, ÉP KIỂU float()
đúng ngữ nghĩa GDScript) của `EXHAUSTION_DRAIN_PCT` × `HP_REGEN_CAP` ×
`EXHAUSTION_ONSET_EXCHANGE` × **`TECHNICAL_EXCHANGE_CAP`** (4 trục, quét
TOÀN BỘ Safe Range đã công bố, KHÔNG lọc trước — 108 tổ hợp, MỞ RỘNG so
với vòng 2, giờ bao gồm cả trục `TECHNICAL_EXCHANGE_CAP`) VÀ 2 bên có
`effective_ATK ≤ effective_DEF` đối xứng (kịch bản bế tắc tệ nhất), WHEN
mô phỏng chuỗi pha lặp lại tới `TECHNICAL_EXCHANGE_CAP` cho TỪNG tổ hợp
trong 108, THEN kết quả tách 2 nhánh TƯỜNG MINH theo ràng buộc chéo
`TECHNICAL_EXCHANGE_CAP - EXHAUSTION_ONSET_EXCHANGE ≥ 120` (xem Tuning
Knobs) — **SỬA 2026-08-06 vòng 4**, đóng gap BLOCKING hội tụ độc lập
[qa-lead] "GIVEN quét cả 108 nhưng THEN chỉ khẳng định cho 96 tổ hợp
thỏa ràng buộc, không có nhãn phân biệt 'loại trừ hợp lệ' với 'fail
thật' — 1 implementer parametrize test thẳng theo GIVEN sẽ ra 12 fail
giả":
- Với 96 tổ hợp thỏa `CAP-ONSET≥120`: PHẢI hội tụ — HP của ít nhất 1 bên
  chạm 0 TRƯỚC `exchange_id=TECHNICAL_EXCHANGE_CAP`.
- Với 12 tổ hợp còn lại (`CAP-ONSET&lt;120`): PHẢI kích hoạt 1 assertion
  RIÊNG xác nhận tổ hợp đó vi phạm ràng buộc chéo (VD `assert_constraint_violated`)
  — KHÔNG được coi là fail của gate hội tụ, và KHÔNG được bỏ qua im
  lặng (silent skip).

**ĐÃ XÁC NHẬN bằng harness SỐNG TRONG REPO** — chạy
`python prototypes/combat-reference/harness.py` (experiment "Q1-FIXED"):
**96/108 tổ hợp hội tụ đúng theo nhánh 1**; **12/108 tổ hợp đúng theo
nhánh 2** (cửa sổ hẹp, `CAP-ONSET` ∈ {20, 60}, xem
`prototypes/combat-reference/results.md` bảng chi tiết) — đây KHÔNG phải
bug, đây chính là lý do ràng buộc chéo cửa sổ tối thiểu được thêm vào
Tuning Knobs. **Đã bỏ tuyên bố "bao gồm biên P_hit=P_MIN=0.05"** của bản
vòng 2 — đây là 1 "mô hình mở rộng" chưa từng được hình thức hóa thành
công thức nào trong tài liệu, mâu thuẫn trực tiếp với chính GIVEN của AC
này (loại D.3 khỏi phạm vi) — xem AC-47b cho phiên bản CÓ `P_hit` thật.
Gate BLOCKING hợp lệ vì hoàn toàn tất định, không có RNG; và giờ có thể
tái chạy bất cứ lúc nào, không phụ thuộc lời kể. *(Logic test tham số
hóa — BLOCKING.)*

**AC-47b** (D.4b/D.10 — mô phỏng Monte Carlo với `roll_uniform` thật,
MỚI 2026-08-06 vòng 2, thay phần "cần prototype xác nhận" của AC-47 cũ
— đóng gap `qa-lead` "câu hỏi thống kê không thể là gate BLOCKING theo
Determinism rule"): GIVEN cùng ma trận tổ hợp Safe Range như AC-47a
nhưng CÓ đưa D.3 (roll trúng/hụt thật, nhiều seed độc lập, N≥1000
trận/tổ hợp) vào mô phỏng, WHEN đo tỉ lệ trận hội tụ HP=0 trước
`TECHNICAL_EXCHANGE_CAP`, THEN báo cáo % hội tụ cho từng tổ hợp. **KHÔNG
phải gate BLOCKING per-story** (vi phạm nguyên tắc Determinism của
`coding-standards.md` nếu bắt buộc mỗi lần CI chạy) — xếp loại tương tự
"Config/Data — smoke check" (ADVISORY): chạy 1 lần để xác nhận số liệu
trước khi khóa default `MIN_RAW_RATIO`/`EXHAUSTION_ONSET_EXCHANGE`/
`EXHAUSTION_DRAIN_PCT`/`HP_REGEN_CAP`, không phải test tái chạy mỗi CI.
*(Smoke check, ADVISORY.)*

**AC-48** (D.14 — chọn thức NPC, ca thường, BỔ SUNG determinism 2026-08-06
vòng 2): GIVEN NPC `tier=3`, thức chưa dùng có tier `{1,2,5}`, WHEN
tính `chosen_pool`/`P`, THEN `eligible_low={tier 1, tier 2}` (loại tier
5), `chosen_pool` sắp theo `thuc_id` tăng dần (THỨ TỰ TẤT ĐỊNH, không
đổi giữa các lần gọi), mỗi thức `P=0.5` (đúng ví dụ GDD); VÀ với
`roll_uniform=0.7` cố định, `chosen_index=1`, `chosen_thuc` LUÔN là
phần tử thứ 2 của `chosen_pool` — chạy lại với CÙNG input (kể cả nạp
dữ liệu theo thứ tự khác) PHẢI cho ra CÙNG `chosen_thuc` (đóng gap
`/design-review` "D.14 không định nghĩa phép chọn, phá determinism" —
2 implementation tuân thủ đúng D.14 không được phép ra kết quả khác
nhau cho cùng roll). *(Logic test.)*

**AC-49** (D.14 — boundary mọi thức tier=0, đóng gap chia-cho-0): GIVEN
NPC `tier=0`, thức chưa dùng `{tier 0, tier 0}`, WHEN tính
`chosen_pool`/`P`, THEN `eligible_low={cả 2}`, mỗi thức `P=0.5`, KHÔNG
có exception chia-cho-0 xảy ra ở bất kỳ bước nào. *(Logic test,
boundary — đóng trực tiếp gap `/design-review` phát hiện bởi
game-designer + ai-programmer.)*

**AC-50** (D.14 — boundary chỉ còn thức vượt tier, rơi xuống
`eligible_all`): GIVEN NPC `tier=2`, thức chưa dùng còn lại duy nhất
tier `4`, WHEN tính `chosen_pool`, THEN `eligible_low=∅` →
`chosen_pool={thức tier 4}` (100% xác suất), NPC buộc dùng thức đó.
*(Logic test, boundary.)*

**AC-51** (Core Rule #2b/D.6 — "Phòng thủ" có tác dụng cơ học, VIẾT LẠI
2026-08-06 vòng 2 — bản vòng 1 test hệ số DEF/Né bị thay bằng giảm trừ
sát thương tất định): GIVEN `defender_is_defending=true`,
`DEFEND_DMG_REDUCTION_PCT=0.35`, `pre_mitigation × final_multiplier`
(trước `defend_mult`) `= 45` (khớp ví dụ D.6 gốc), WHEN tính
`final_damage`, THEN `defend_mult=0.65`, `final_damage=round(45×0.65)
=29` (so với `45` nếu không phòng thủ — giảm ~35% tất định, không phụ
thuộc build ATK/DEF của 2 bên); VÀ `per_actor[C].thuc_id=null`,
`action_type="defend"`, không có `raw_damage`/`final_damage` phía tấn
công của C ở pha đó; VÀ với `defender_is_defending=false`,
`defend_mult=1.0`, `final_damage` không đổi (=45). *(Logic test — đóng
gap "Phòng thủ không có tác dụng nào được định nghĩa" + "Phòng thủ là
false choice" vòng 2.)*

**AC-52** (Core Rule #2, Tầng 1 — NPC bỏ chạy dưới ngưỡng HP%): GIVEN
`NPC_FLEE_HP_THRESHOLD=0.20`, `hp_pct(NPC)=0.15` ở đầu pha,
`is_spar_friendly=false`, WHEN NPC chọn hành động, THEN NPC chọn "Bỏ
chạy" (Core Rule #9/D.11) — KHÔNG đi vào Tầng 2 (D.14, chọn thức); VÀ
với `hp_pct(NPC)=0.25` (trên ngưỡng), NPC đi thẳng vào Tầng 2 như bình
thường. *(Logic test — đóng gap "NPC chiến đấu tới chết 100% số lần,
không có bản năng sinh tồn".)*

**AC-52b** (Core Rule #2, Tầng 1 — TẮT trong trận giao hữu, MỚI
2026-08-06 vòng 3, đóng gap [ai-programmer] "NPC vẫn tự động bỏ chạy
trong `is_spar_friendly=true`, có thể kết thúc trận giao hữu bằng khung
tường thuật 'bỏ chạy' TRƯỚC khi D.9b — cơ chế hòa chuyên dụng — có cơ
hội chạy"): GIVEN CÙNG điều kiện AC-52 (`hp_pct(NPC)=0.15`, dưới ngưỡng)
NHƯNG `is_spar_friendly=true`, WHEN NPC chọn hành động, THEN Tầng 1
KHÔNG kích hoạt — NPC đi thẳng vào Tầng 2 (D.14, chọn thức) như thể
đang trên ngưỡng, bất kể `hp_pct` thấp thế nào. *(Logic test, negative
case.)*

**AC-53** (Core Rule #2 — NPC không bao giờ chọn Phòng thủ, negative
test, SỬA 2026-08-06 vòng 2 — bỏ nhánh vật phẩm vì đã cắt khỏi MVP cho
CẢ 2 bên, không còn là ranh giới riêng của NPC): GIVEN 1 trận với
`hp_pct(NPC)` trên ngưỡng bỏ chạy, WHEN chạy N pha liên tiếp (mock đủ
đa dạng roll/tier), THEN `action_type` của NPC ở MỌI pha chỉ nhận giá
trị `{"skill", "flee"}` — KHÔNG BAO GIỜ `"defend"`. *(Logic test,
negative case — xác nhận ranh giới phạm vi có chủ đích, không phải
gap.)*

**AC-54** (Edge Case mới — `narration_call` Failed sau khi `locked_result`
đã tính, N lần retry = đúng 1 kết quả cơ học, bổ sung 2026-08-07,
`/design-review ai-llm-integration-layer.md`, đóng gap `game-designer`):
GIVEN 1 pha giao đấu đã chạy D.2-D.10 xong (mock RNG cố định, VD roll
crit=true), tạo ra `locked_result` với `outcome`/`per_actor` cụ thể, WHEN
`narration_call` (mock AI layer) Failed N lần liên tiếp (N=1,2,3 — mô
phỏng lỗi mạng thuần túy, KHÔNG phải hành động mới của người chơi) rồi
người chơi thao tác lại ĐÚNG hành động ban đầu, THEN spy đếm số lần
D.2-D.10 được gọi lại (recompute pha giao đấu) = **0** trong toàn bộ N
lần retry đó — `locked_result` trả về ở lần retry thành công GIỐNG HỆT
byte-for-byte lần tính đầu tiên (đặc biệt `outcome`/`per_actor[*].hp_after`),
bất kể mock RNG có được set để trả giá trị KHÁC ở các lần gọi sau (chứng
minh thực sự không recompute, không phải trùng hợp ngẫu nhiên). GIVEN sau
đó người chơi gửi 1 hành động KHÁC (không phải thao tác lại đúng hành
động cũ), THEN D.2-D.10 CHẠY LẠI bình thường cho hành động mới (không bị
khóa vĩnh viễn vào kết quả cũ). **Ghi chú cascade `error_code=BUSY`**
(thêm 2026-08-08 `/design-review ai-llm-integration-layer.md` vòng 2,
đóng gap `game-designer`): nếu `request_ai` trả `BUSY` trong pha này
(hợp đồng phía caller của tầng AI/LLM — chỉ xảy ra do bug caller), Combat
KHÔNG tự xử lý riêng — hành vi và nhãn log thuộc trách nhiệm của Turn
Manager (`turn-manager.md` AC-13c), Combat chỉ cần đảm bảo không tự gọi
`request_ai` lần 2 song song trong khi 1 lệnh gọi của chính pha này chưa
resolve (đúng ràng buộc "1 lượt = 1 hành động" đã có).

## Open Questions

- **[Vòng 4 + Leo thang, 2026-08-07] Backlog mục cơ học chuyển sang
  implementation — KHÔNG vá thêm vào văn xuôi GDD** (xem
  `docs/architecture/adr-0001-combat-spec-authority.md` Migration Plan
  bước 4): vòng 4 (systems-designer/qa-lead/ux-designer) + leo thang
  `technical-director` tìm ra ~9-11 mục blocking bổ sung sau vòng 3,
  phần lớn thuộc lớp compiler-catchable (tham số thiếu trong chữ ký
  `resolve_exchange`; `hp_pct_pre_drain` thiếu `float()`+`max(...,1)` —
  **ưu tiên CAO NHẤT, gây coin_flip ẩn 100% trong kịch bản đối xứng,
  xem review log mục Escalation**; D.14's `P(thức_i)` là tính chất
  không phải biểu thức thực thi, AC-48 cần viết lại theo phân phối thực
  nghiệm chứ không đọc `P`; AC-45 GIVEN thiếu tham số `rng`; D.1
  non-skill branch + D.9b cache-once thiếu AC; AC-09/Core Rule #11 lệch
  số đếm field "5" vs 6; AC-07 tham chiếu tham số không tồn tại trong
  `resolve_exchange`; AC-27 thiếu tiêu chí cấu trúc). **Quyết định**:
  KHÔNG vá tay từng mục vào 2790 dòng văn xuôi (rủi ro tiêm lỗi mới đã
  đo được cao qua 4 vòng) — chốt MỘT LẦN, đúng, khi viết
  `src/gameplay/combat/*.gd`. 5 mục KHÔNG-compiler-catchable (nội dung/
  cross-doc/coverage thật) đã vá trực tiếp trong vòng này — xem entry
  review log "Escalation — 2026-08-07".
- **[Vòng 3, 2026-08-06] Tổng hợp 6 cụm blocking đã đóng** (chi tiết đầy
  đủ trong `design/gdd/reviews/combat-system-review-log.md`, mục Vòng
  3): (C-1) "72/72 hội tụ" vòng 2 không xác minh được (harness mất) và
  không đúng dưới ngữ nghĩa GDScript thật (`int/int` cắt cụt) — sửa bằng
  ép kiểu `float()` tường minh CHUNG cho D.4b/D.9b/D.9c + ràng buộc chéo
  cửa sổ kiệt sức ≥120 + reference harness SỐNG TRONG REPO
  (`prototypes/combat-reference/harness.py`, xác nhận 96/108). (C-2) D.6
  `final_damage` có thể làm tròn về 0 (100% số lần đo được ở kịch bản áp
  chế cực đoan) — thêm sàn `max(1,...)`; D.9's thứ tự tính
  `exhaustion_drain` tuần tự khiến SPD cao thua tất định (0/300 đo
  được) — sửa thành tính cả 2 không điều kiện (khôi phục 52.3%/47.7%).
  (C-3) `self`/`other` không khai báo ở D.9b/D.9c — thêm tham số
  `player_id`; `outcome` không được gán ở nhánh trận-tiếp-diễn — thêm
  `outcome=null` đầu hàm; `thuc_id` không có tham số mang — thêm
  `thuc_id_of`; RNG injection không phản ánh trong pseudocode — thêm
  tham số `rng` tường minh xuyên suốt D.2/D.3/D.5/D.8/D.9/D.11/D.14;
  `chosen_index` (D.14) thiếu clamp biên `roll_uniform→1.0` — thêm
  `min(...,|pool|-1)`. (C-4) AC-45 cho phép review thủ công thay test tự
  động — sửa; thêm AC-41j (D.9b negative test ngoài spar), AC-28b (D.11
  ca thường), AC-41k (double-flee-fail); AC-41h/i mở rộng spy scope +
  đổi nhãn Integration. (C-5, UX) popover "Xem thêm" giờ có ràng buộc
  bắt buộc không che Ô 3/4; win/lose thêm glyph phân biệt phi-màu +
  AC-09b bắt buộc narration nêu outcome bằng lời; khung cảnh giới xác
  nhận hiển thị cả trước trận; thêm tín hiệu UI bắt buộc cho kiệt sức;
  đăng ký `combat-system.md` vào registry `TOUCH_TARGET_MIN`. (C-6) NPC
  Tầng 1 (bỏ chạy) tắt khi `is_spar_friendly=true` — thêm AC-52b; thứ tự
  lặp khi cả 2 cùng bỏ chạy nay tất định qua `order_first`/`order_second`
  (D.2, tính trước vòng lặp flee-check) — thêm AC-41k.
- ~~Thuật toán chọn thức của đối thủ (NPC) chưa được định nghĩa cụ
  thể~~ — chốt lần đầu 2026-08-05 (weighted-random theo tier), **THAY
  THẾ HOÀN TOÀN 2026-08-06** sau `/design-review`: công thức cũ có
  chia-cho-0 (mọi thức còn lại tier=0) VÀ logic nghịch đảo (NPC tự tối
  đa hóa phạt gear-gap của chính mình) — nay dùng D.14 (phân phối đều
  trên `eligible_low`, ưu tiên thức không bị phạt). *(Owner:
  game-designer + systems-designer + creative-director — Đã đóng)*
- ~~NPC có bao giờ chọn Phòng thủ/Dùng vật phẩm/Bỏ chạy không~~ — **đã
  chốt 2026-08-06 vòng 1** (`/design-review`, phát hiện bởi
  ai-programmer): NPC có 2 tầng quyết định (Core Rule #2) — Tầng 1 bỏ
  chạy khi `hp_pct<NPC_FLEE_HP_THRESHOLD`, Tầng 2 chọn thức (D.14); NPC
  KHÔNG BAO GIỜ chọn Phòng thủ — ranh giới phạm vi có chủ đích, đóng
  bằng AC-53 (negative test). (Nhánh "Vật phẩm" của câu hỏi gốc nay
  MOOT — hành động này đã CẮT khỏi MVP cho cả 2 bên, vòng 2, xem Core
  Rule #6.) *(Owner: game-designer + ai-programmer — Đã đóng)*
- ~~"Phòng thủ" không có tác dụng cơ học nào được định nghĩa~~ — **đã
  chốt 2026-08-06 vòng 1** (`/design-review`, phát hiện bởi
  ai-programmer + creative-director): tăng `effective_DEF`/
  `effective_Né`. **VIẾT LẠI 2026-08-06 vòng 2**: cơ chế vòng 1 bị
  chứng minh là "false choice" (~13:1 giao dịch bất lợi so với tấn
  công, chip-floor D.4 làm DEF vô nghĩa đúng lúc cần nhất) — thay bằng
  giảm trừ sát thương TẤT ĐỊNH `DEFEND_DMG_REDUCTION_PCT` tích hợp vào
  D.6, xem Core Rule #2b. *(Owner: game-designer + creative-director —
  Đã đóng vòng 2)*
- ~~`coin_flip(seed=exchange_id)` (D.2, D.9c) — thiên vị hệ thống cố
  định giữa các trận khác nhau + tương quan giữa 2 lời gọi cùng
  `exchange_id` + phá vỡ re-roll thật khi Undo (AC-37/Turn Manager
  AC-12) + mâu thuẫn với tuyên bố "RNG dùng chung `roll_uniform`
  injected" của Core Rule #2~~ — **đã chốt 2026-08-06** (`/design-review`,
  hội tụ độc lập bởi main review + systems-designer + godot-specialist +
  qa-lead + creative-director): bỏ hoàn toàn self-seeding, `coin_flip()`
  giờ dùng `roll_uniform` injected như mọi formula RNG khác. AC-15/AC-41c
  viết lại theo phân phối qua roll mock, không theo seed. *(Owner:
  systems-designer + godot-specialist — Đã đóng)*
- ~~D.4 không có sàn sát thương tối thiểu → bế tắc "đấm vào tường" 2
  chiều → trận không hội tụ → vi phạm Anti-Pillar "không luật
  phi-diegetic ghi đè kết quả công thức"~~ — **chốt LẦN ĐẦU 2026-08-06
  vòng 1** (thêm sàn `MIN_RAW_RATIO` + giảm HP Regen về 0 qua
  `EXHAUSTION_ONSET_EXCHANGE`) — **BỊ CHỨNG MINH SAI ở vòng 2** bằng
  harness số độc lập (`systems-designer`, xác nhận lại bởi
  `creative-director`): cơ chế vòng 1 chỉ hội tụ **0–3/36 tổ hợp** Safe
  Range, KHÔNG đủ ngay cả khi Regen về đúng 0 tuyệt đối. **ĐÃ CHỐT LẠI
  2026-08-06 vòng 2**: kết hợp `exhaustion_drain` (hao tổn cộng dồn
  ĐỘC LẬP với `effective_ATK`/`effective_DEF`, MỚI) + `HP_REGEN_CAP`
  (trần cứng Regen, MỚI) — xem D.4b/D.10. **Đã XÁC NHẬN bằng harness số**
  (AC-47a): **72/72 tổ hợp Safe Range hội tụ**, bao gồm biên
  `P_hit=P_MIN=0.05`. Không còn "treo" — đây là kết quả đo được, không
  phải suy luận. Khuyến nghị còn lại (không blocking): chạy AC-47b
  (Monte Carlo, ADVISORY) 1 lần trước khi khóa default cuối cùng cho
  Vertical Slice, để xác nhận cảm giác nhịp trận thực tế (không chỉ
  boolean "có hội tụ"). *(Owner: systems-designer — Đã đóng vòng 2, còn
  1 ADVISORY item trước Vertical Slice)*
- ~~Schema `locked_result` mô tả không khớp nhau ở 3 nơi (Core Rule
  #11/D.8/D.9) — field `dodge` không formula nào sinh ra, `heal` rơi
  khỏi hợp đồng Numeric Leak Detection~~ — **đã chốt 2026-08-06**
  (`/design-review`, phát hiện bởi ui-programmer): Core Rule #11 giờ là
  NGUỒN SỰ THẬT duy nhất cho shape `locked_result` (field `per_actor`
  lồng theo actor_id), bỏ `dodge`, thêm `heal` bắt buộc. *(Owner:
  ui-programmer + lead-programmer — Đã đóng)*
- ~~Cảnh báo áp chế cảnh giới trước trận chỉ đổi trọng lượng chữ, đặt ở
  vị trí độ nổi bật thấp nhất — mâu thuẫn với chính vai trò "agency ở
  khâu chuẩn bị" của Player Fantasy~~ — **đã chốt 2026-08-06**
  (`/design-review`, phát hiện bởi ux-designer, phân xử bởi
  creative-director): tách thành 2 tín hiệu — `estimate_ratio` (D.13,
  xác suất, giữ nổi bật thấp, Core Rule #7 áp dụng) và chênh lệch cảnh
  giới thô (sự thật đã khóa, độ nổi bật cao, khung "con dấu" riêng, Core
  Rule #7 KHÔNG áp dụng). *(Owner: ux-designer + art-director — Đã
  đóng)*
- ~~Khi >4 hành động khả dụng, 2/6 thức bị ẩn, lối thoát duy nhất là gõ
  tự do — vi phạm touch-first Mobile Web~~ — **đã chốt 2026-08-06**
  (`/design-review`, phát hiện bởi ux-designer): ưu tiên tier cao nhất
  trước (tiêu chí tất định) + 1 ô "Xem thêm" mở danh sách đầy đủ dạng
  nút chạm khi còn thức bị ẩn. Thi công chi tiết (bố cục/animation) —
  `/ux-design` khi viết `character-card.md`. *(Owner: ux-designer — Đã
  đóng phần quyết định, thi công còn mở)*
- ~~Schema đầy đủ của vật phẩm chiến đấu (`combat_item_id` trỏ tới gì,
  hiệu ứng cụ thể, VÀ công thức resolution cho `action_type="item"`)
  chưa định nghĩa~~ — **đã chốt 2026-08-06 vòng 2** (`/design-review`,
  phát hiện bởi `ui-programmer`: gap thật không chỉ là "thiếu nội dung"
  như ghi nhận ban đầu, mà là thiếu HOÀN TOÀN cơ chế resolution — không
  có D.x nào định nghĩa item resolve ra sao): **CẮT khỏi phạm vi MVP**
  (QĐ-2, `creative-director`: tính năng không phục vụ pillar nào, cắt
  rẻ hơn thiết kế 1 hệ resolution mới) — xem Core Rule #6. Field
  `combat_item_id` giữ lại dành sẵn cho mở rộng tương lai (Vertical
  Slice/Full Vision), khi đó cần quay lại thiết kế formula resolution +
  nội dung cụ thể. *(Owner: game-designer, target: nếu/khi tính năng
  được đưa lại vào scope — Đã đóng cho MVP)*
- **"Đánh thường" có tính `skill_tier_used` (D.1) hay không — CHƯA CHỐT
  qua 3 vòng review liên tiếp, nâng mức ưu tiên ở vòng 3** (đóng gap hội
  tụ [game-designer]: "nếu miễn phạt gear-gap, chiến lược áp đảo là
  KHÔNG BAO GIỜ dùng thức đã học — chỉ gõ tự do 'đòn thường' để né hoàn
  toàn rủi ro `gap_gear`, trong khi vẫn dùng cùng bộ chỉ số — phá thẳng
  lời hứa Player Fantasy 'trang bị/kỹ năng đúng bậc thắng vì đã chuẩn bị
  kỹ'"). *(Owner: game-designer, BẮT BUỘC chốt trước Vertical Slice —
  không hoãn lần thứ 4; 2 lựa chọn: (a) `skill_tier_used("basic_attack")
  = weapon_tier(C)` — Đánh thường vẫn bị phạt như thức thường, đóng lỗ
  hổng; (b) xác nhận thức chỉ có giá trị NARRATIVE (Pillar 4/5), không
  phải sức mạnh — nếu chọn (b), Player Fantasy (dòng 33-46) cần viết lại
  để không ngụ ý thức ảnh hưởng thắng/thua.)*
- **D.14's "phân phối đều" là fix ĐÚNG cho div-by-zero/nghịch-đảo-khích-lệ
  của vòng 1, nhưng KHÔNG mang lại "agency" NPC thật — ghi nhận có chủ
  đích, không phải gap kỹ thuật** (đồng thuận sau phân xử creative-director
  vòng 3 giữa [ai-programmer] và [game-designer]: 2 phát hiện tưởng mâu
  thuẫn — "giữ D.14" vs "D.14 làm NPC nhàm" — hoá ra không loại trừ
  nhau, gốc rễ nằm ở schema thức của `equipment-skill-data-system.md`
  không có khác biệt cơ học nào giữa các thức cùng tier, không phải ở
  D.14): giữ nguyên D.14 (không revert); câu hỏi "NPC có cảm giác có
  nhân cách khi combat không" thuộc phạm vi
  `equipment-skill-data-system.md` (thêm modifier cơ học riêng cho
  thức?) hoặc 1 hệ tương lai kết nối "Tính cách" (Character Card) vào
  quyết định combat — KHÔNG sửa được trong `combat-system.md`. *(Owner:
  game-designer, target: khi/nếu playtest Vertical Slice cho thấy NPC
  combat nhàm/dự đoán được.)*
- **`EXHAUSTION_ONSET_EXCHANGE=40` mặc định nằm TRONG dải "trận điển
  hình" (`CONTENT_EXCHANGE_ESTIMATE` Safe Range 15-50) tự GDD công bố —
  và hao tổn kiệt sức đánh thuế bất cân xứng vào build phòng thủ**
  (đóng gap [game-designer]: "trận 41-50 pha là HOÀN TOÀN BÌNH THƯỜNG,
  không bệnh lý, nhưng đã bắt đầu bị kiệt sức tác động — mâu thuẫn câu
  'trận điển hình không bị ảnh hưởng' (D.4b); build DEF/Chống chịu/Regen
  cao — chính kiểu build khiến trận kéo dài — bị chính 'thành công' đó
  kích hoạt đồng hồ kiệt sức sớm hơn, trong khi build sát thương cao
  không bao giờ chạm ngưỡng"). *(Owner: game-designer, target: playtest
  Vertical Slice đo cảm giác nhịp trận thật — không blocking vì đã hội
  tụ số học qua harness, chỉ là câu hỏi CẢM GIÁC CÂN BẰNG giữa các
  archetype build.)*
- **Kiến trúc static-function-vs-instance-DI cho D.1–D.14 chưa chốt —
  cần 1 ADR ở `/create-architecture`, KHÔNG tự quyết ở GDD này** (mở từ
  vòng 1, xác nhận vẫn mở ở vòng 3 bởi [godot-specialist]): D.1–D.14
  viết dạng hàm thuần (pure function), nhưng nhiều AC BLOCKING (AC-02,
  AC-24, AC-26, AC-41h) đòi spy đếm lời gọi từng D.x — GUT cần bọc
  INSTANCE để spy, không spy được hàm tĩnh/global trần trụi như
  pseudocode hiện ngụ ý. Quyết định này ràng buộc với cách RNG được
  inject (tham số mỗi lời gọi — như GDD hiện viết — HAY field instance
  qua constructor) — 2 lựa chọn dẫn tới 2 kiến trúc implementation khác
  nhau. *(Owner: `godot-specialist`/`lead-programmer`, target: 1 ADR
  trước khi story hóa Combat System — KHÔNG chặn việc GDD này được
  Approved, vì đây là quyết định implementation, không phải quyết định
  thiết kế/công thức.)*
- **`Điểm_Kỹ_Năng(C)` và `Điểm_Trang_Bị(C)` (Formula D.13) chưa có công
  thức, chỉ là input mờ mặc định 0** — hệ nào sở hữu công thức này
  (Combat tự định nghĩa, hay Equipment & Skill Data System mở rộng phạm
  vi) chưa chốt. *(Owner: systems-designer, target: khi `estimate_ratio`
  cần chính xác hơn placeholder, không chặn MVP vì không ảnh hưởng
  thắng/thua thật)*
- **Trọng số `w_*` của Điểm Chỉ số (D.13, đặc biệt `w_HP=0.25`) là
  placeholder tạm** — cần đối chiếu lại khi EXP & Realm Progression (đã
  Designed) định nghĩa đường cong tăng trưởng chỉ số thật. *(Owner:
  systems-designer, target: `/design-system exp-realm-progression`)*
- **`exchange_id` — đã chốt trong Core Rule #1** (bộ đếm per-battle,
  reset mỗi trận mới) — không còn là open question, ghi nhận ở đây để
  xác nhận đã đóng gap do `qa-lead` phát hiện.
- **Schema `outcome` — đã chốt trong Core Rule #11** (`{type, winner_id,
  loser_id}` thống nhất cho mọi nhánh kết thúc trận) — không còn là open
  question, đóng gap thứ 2 do `qa-lead` phát hiện.
- **~~Yêu cầu người dùng (2026-08-03, nêu khi đang thiết kế
  `death-and-consequence.md`): xem lại cơ chế `outcome="no_outcome"`
  qua `MAX_EXCHANGE_COUNT=30`~~ — đã giải quyết CÙNG NGÀY 2026-08-03**:
  `MAX_EXCHANGE_COUNT` loại bỏ hoàn toàn vai trò "trần thiết kế → hòa".
  Core Rule #8 viết lại 4 đường kết thúc trận (a-d); D.9b (hòa giao hữu,
  eligibility gate Lực chiến trong `spar_friendly` — parity ≤
  `SPAR_PARITY_TOLERANCE=0.15` AND HP bên thắng ≤
  `SPAR_LOW_HP_THRESHOLD=0.15`) + D.9c (tiebreak `TECHNICAL_EXCHANGE_CAP=200`
  KỸ THUẬT thuần, ngoài spar luôn ra win/lose) là 2 formula mới. Core
  Rule #7 thêm 1 ngoại lệ tường minh (Lực chiến chỉ đổi NHÃN kết quả đã
  có, không đổi AI thắng). `CONTENT_EXCHANGE_ESTIMATE=30` (đổi tên từ
  `MAX_EXCHANGE_COUNT`, giá trị KHÔNG đổi) giữ nguyên
  `max_invocations_per_battle=5` — `equipment-skill-data-system.md`
  AC-11 không bị ảnh hưởng. AC-07/08/31/41(a-i) cập nhật/thêm mới.
  **Còn lại CHƯA đóng**: đường (c) "tín hiệu khẩn cấp xen ngang" — Combat
  chỉ định nghĩa phía LẮNG NGHE (`external_abort_signal`, Core Rule #13,
  interface provisional); ĐIỀU KIỆN gì khiến Situation/Encounter
  Generation set tín hiệu này thuộc phạm vi GDD đó, chưa thiết kế.
  *(Owner: narrative-director + game-designer, target:
  `/design-system` hoặc chỉnh sửa trực tiếp cho
  `situation-encounter-generation.md`)*
- **`max_invocations_per_battle` không có cơ chế enforcement runtime —
  xác nhận đây là ĐÚNG THIẾT KẾ, không phải gap**: hằng số này chỉ phục
  vụ content-authoring (`is_pool_sufficient`), giới hạn thật chặn runtime
  là quy tắc không-lặp-thức (Core Rule #5) đã tự nhiên giới hạn qua
  `thuc_count` của từng kỹ năng. Ghi nhận theo `qa-lead` để tránh nhầm
  lẫn sau này.
- **Thuật toán dựng chỉ số đối thủ ambient (vô danh, không có `char_id`)
  chưa có công thức riêng** — Situation/Encounter Generation cấp `level`
  sinh ra (registry `encounter_level_range`), nhưng cách map `level` đó
  qua `stat_growth` (EXP & Realm Progression) thành bộ 12 chỉ số đầy đủ
  của đối thủ (D.1–D.10 input) chưa được Combat hình thức hóa. *(Owner:
  systems-designer, target: khi vertical slice cần đối thủ ambient thật
  đầu tiên — không chặn MVP vì NPC/canon có `char_id` dùng level data cố
  định, không qua path này)*
