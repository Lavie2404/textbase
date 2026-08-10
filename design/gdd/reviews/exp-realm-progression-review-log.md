# Review Log: EXP & Realm Progression

## Review — 2026-08-08 — Verdict: MAJOR REVISION NEEDED

Scope signal: **XL** (producer nên verify trước sprint planning)
Specialists: `game-designer`, `systems-designer`, `economy-designer`, `qa-lead` + `creative-director` (senior synthesis)
Blocking items: 15 (nhóm-A, không compiler-catchable) | Recommended: 7 (nhóm-B, đã sửa cùng đợt theo lựa chọn "sửa GDD ngay")

### Tóm tắt

Round 1 full mode — first review pass cho hệ #8/15. Hồ sơ defect ĐẢO NGƯỢC
so với Combat/Persistence/AI-LLM (đa số nhóm-A thay vì nhóm-B): 15 nhóm-A
vs 7 nhóm-B. `creative-director` khuyến nghị KHÔNG áp Design Review Round
Cap policy nguyên văn ("2 vòng rồi thôi") cho hệ này vì hầu hết finding là
design trade-off/cross-doc contract thật, không phải notation bug mà
compiler/unit test bắt được miễn phí — xem amendment mới trong
`.claude/docs/coordination-rules.md`.

**Most Important Findings** (creative-director):
1. **MIF-1 (A1)** — Passive/Song Tu EXP từng cộng dồn ở MỌI pha giao đấu
   trong combat (không chỉ lúc kết trận), phá vỡ invariant thành văn của
   `combat-system.md` Core Rule #4 ("tương quan cảnh giới không đổi trong
   1 trận") vì `tier`/`base_X` (kể cả `max_HP`) có thể đổi giữa trận. Sửa
   bằng cách thêm khái niệm `turn.in_combat` (phân biệt với
   `locked_result.battle_active`) và gỡ passive/Song Tu khỏi mọi lượt
   `in_combat=true`, kể cả lượt kết trận.
2. **MIF-2 (A5)** — Trạng thái "Chờ Đột Phá" là vùng chết: 0 thông tin, 0
   đòn bẩy, 0 phần thưởng cho người chơi (EXP dư bị hủy), trong khi rủi ro
   chết vẫn nguyên vẹn — ngược Player Fantasy "hồi hộp" mà chính hệ này
   tuyên bố phục vụ. Sửa bằng 1 interface hook gợi ý tường thuật (không
   đảo ngược quyết định "không bank" đã chốt trước đó).
3. **MIF-3 (A3)** — `BASE_EXP_THRESHOLD`/`EXP_THRESHOLD_INCREMENT` tự
   triệt tiêu về đại số, không hề điều khiển pacing dù bảng Tuning Knobs
   cũ tuyên bố ngược lại. Sửa bằng cách sửa lại mô tả (không thêm nguồn
   EXP tuyệt đối mới — ngoài scope MVP).

### 15 nhóm-A đã sửa (tất cả — không có mục nào hoãn)

| # | Nguồn | Tóm tắt | Sửa ở |
|---|---|---|---|
| A1 | economy-designer + creative-director | Passive/Song Tu tick mọi pha combat, phá invariant Combat CR#4 | Core Rule #2, D.6, D.2 Tuning Knobs |
| A2 | economy-designer | "Cố ý thua" dominant khi tier_diff≤-3 | D.2 (`WIN_EXP_FLOOR_MULT` 0.05→0.30), AC-20/AC-21b |
| A3 | economy-designer | 2 tuning knob ngưỡng EXP không điều khiển pacing thật | D.1, Tuning Knobs |
| A4 | economy-designer | Thiếu invariant chéo-knob LOSS_EXP_RATE↔WIN_EXP_BASE_FRACTION×FLOOR | D.2, D.3, Tuning Knobs |
| A5 | game-designer + economy-designer | Chờ Đột Phá: 0 info/đòn bẩy/thưởng | Edge Cases (hook), Dependencies, Open Questions, AC-40 |
| A6 | game-designer | Song Tu EXP có thể unreachable ở MVP | `game-concept.md` (dev-seed Tâm Pháp) |
| A7 | systems-designer | Đột phá + `death_and_consequence_blocked` đồng thời chưa định nghĩa | Core Rule #7/#9, D.7, AC-36b |
| A8 | game-designer | 0 tiêu chí experiential cho fantasy cốt lõi | AC-40 (ADVISORY, mới) |
| A9 | qa-lead + systems-designer | Thiếu contract cho 26 hằng số data thiếu | Edge Cases (EC-8), AC-41 |
| A10 | qa-lead | AC-32 xung đột Error Taxonomy + rủi ro `assert()` strip khỏi export build | Edge Cases, AC-32 (error code) |
| A11 | qa-lead | 0 integration test dù 2 Hard dependency | AC preamble (yêu cầu mới) |
| A12 | systems-designer | `tier` range khai `0–∞` sai (Rule 1/registry là `1–∞`) | D.2 table + `combat-system.md` D.1 (2 chỗ) |
| A13 | qa-lead + creative-director | D.6 self-scoping giả định ngầm `self=player_id` | Core Rule #11, D.6 pseudocode, AC-39 |
| A14 | systems-designer + game-designer | `exp_multiplier` không ceiling | Core Rule #3, Tuning Knobs |
| A15 | game-designer + creative-director | Rollback Hồn Hoàn treo ở cả 3 hệ, không owner | Dependencies, Open Questions (đề xuất Equipment & Skill Data) |

### 7 nhóm-B đã sửa (cùng đợt, theo policy — không cần vòng riêng)

B1 (guard `BASE_EXP_THRESHOLD≤0`, AC-42), B2 (AC-37/EC-6 sửa từ tier=0
không-reachable sang tier=1 biên thật), B3 (D.7 mới — `apply_exp_gain` +
`try_execute_breakthrough` thành pseudocode tường minh), B4
(`WIN_EXP_FLOOR_MULT` range → `(0,1]`), B5 (invariant `level≥1` tường
minh), B6 (`tier` là derived property, không lưu độc lập), B7 (6 mục AC
hygiene: pin flags AC-02/02b, thêm `death_and_consequence_blocked` vào
injection list, tách AC-17/AC-11 static-check, note fixture AC-06/AC-07
độc lập, contract `tier(opponent)` raw int).

### Specialist Disagreements

- **DIS-1**: game-designer cho rằng đường cong quá chậm (playtest MVP có
  thể không chạm breakthrough) vs economy-designer cho rằng combat quá
  nhanh (passive-trong-combat ≈ 1 cấp/trận). Không mâu thuẫn số học, kê
  đơn ngược chiều (dev-seed vs gỡ passive khỏi combat) — creative-director
  áp dụng cả hai (A1 theo hướng economy, dev-seed KHÔNG áp dụng cho pacing
  ship — chỉ dùng cho MVP Song Tu code path ở A6, khác mục đích).
- **DIS-2**: qa-lead báo cáo AC coverage hoàn hảo (0 orphan) vs
  game-designer báo cáo bộ AC không validate được lời hứa cốt lõi — cả hai
  đúng (phủ 100% những gì GDD nói, 0% những gì GDD hứa) — giải quyết bằng
  AC-40 ADVISORY mới.

### Cascade edits (files khác)

- `design/gdd/combat-system.md` — 2 chỗ sửa range `tier(C)` từ `0–∞` →
  `1–∞` (D.1 table, 2 vị trí)
- `design/gdd/game-concept.md` — Required for MVP #4 + Scope Tiers: thêm
  dev-seed 1 Tâm Pháp tối giản cho MVP
- `design/gdd/systems-index.md` — High-Risk Systems row mới, Dependency
  Map footnote mở rộng (2 gap mới A5/A15), header Last Updated

### Trạng thái

GDD Status: **"Designed — Revised, chờ re-review (`/design-review` vòng 1,
2026-08-08)"** — chưa Approved. `systems-index.md` Systems Enumeration
KHÔNG đổi (vẫn "Designed", đúng quy ước verdict MAJOR REVISION NEEDED
không APPROVED thì không đổi index).

**Khuyến nghị round 2** (không bắt buộc theo Round Cap cũ, nhưng
`creative-director` khuyến nghị mạnh do khối lượng re-derive kinh tế +
invariant mới `turn.in_combat`/`battle_active` interlock cần verify độc
lập): chạy trong phiên `/clear` mới, tập trung xác nhận các invariant MỚI
(đặc biệt A1/A2/A4/A13) thay vì tìm finding hoàn toàn mới.

---

## Review — 2026-08-08 — Verdict: MAJOR REVISION NEEDED (round 2)

Scope signal: **L** (giảm từ XL vòng 1)
Specialists: `game-designer`, `systems-designer`, `economy-designer`, `qa-lead` + `creative-director` (senior synthesis), sau đó verify hẹp bởi `economy-designer` + `qa-lead`
Blocking items: 6 (A2-1 đến A2-6) | Recommended: 4 (B2-1 đến B2-4) | Verify-hẹp gap: 4 điểm (đã sửa cùng phiên)

### Tóm tắt

Round 2 full mode — verify các invariant mới của round 1 (đặc biệt A1
`turn.in_combat`/`battle_active` interlock, A2/A4) theo đúng khuyến nghị
round 1. 12/15 nhóm-A round 1 xác nhận CLOSED bằng trace/tính toán độc
lập (không chỉ đọc lại prose). Nhưng 4/6 blocking mới của round 2 là
**propagation gap sinh ra từ chính bản sửa round 1** (A1 gỡ passive khỏi
combat → over-correct kinh tế thành dominant-strategy né-combat ngược
chiều; A1/A7 thêm gate cho 1 hàm nhưng không lan sang hàm chị em
`try_execute_breakthrough`; invariant D.2 khai bằng prose không có
enforcement).

**Most Important Findings** (creative-director):
1. **MIF-1 (round 2)** — Sau khi quy đổi theo lượt (đúng lăng kính A1
   dùng để tìm bug gốc), né combat hoàn toàn (chỉ cày passive+Song Tu)
   hiệu quả hơn 2–6× so với thắng trận combat ở MỌI `tier_diff` — mâu
   thuẫn trực tiếp D.4 và đe dọa Core Hypothesis MVP (kiểm chứng qua kết
   quả chiến đấu).
2. **MIF-2 (round 2)** — `try_execute_breakthrough` (D.7) thiếu gate
   `turn.in_combat`/`turn.is_death_turn` — đột phá có thể xảy ra giữa
   trận, vi phạm CHÍNH invariant mà A1 vừa sửa, qua đường khác.
3. **MIF-3 (round 2)** — Đột phá đầu tiên cần ~300–3.000 lượt tùy chiến
   lược, vượt xa cửa sổ test MVP (≥90 lượt/3 phiên) — AC-40 (gate
   playtest của fix A5 round 1) không bao giờ được thực thi.

### 6 nhóm-A đã sửa (tất cả)

| # | Nguồn | Tóm tắt | Sửa ở |
|---|---|---|---|
| A2-1 | economy-designer | Né combat là dominant strategy (MIF-1) | D.1 (invariant mới), Tuning Knobs (`PASSIVE_EXP_RATE`→0.001, `SONG_TU_EXP_RATE`→0.002→0.0015, `WIN_EXP_BASE_FRACTION`→0.20), Core Rule #6 mở rộng (Option C — Hồn Hoàn chỉ từ combat) |
| A2-2 | systems-designer | `try_execute_breakthrough` thiếu gate `in_combat`/`is_death_turn` (MIF-2) | D.7 (2 gate mới + orchestrator `process_character_turn`), AC-43/AC-44 |
| A2-3 | game-designer | MVP không chạm được đột phá đầu (MIF-3) | `game-concept.md` Required for MVP #1 — dev-seed level 9 |
| A2-4 | economy-designer | Safe Range độc lập phá invariant D.2/D.3 | Tuning Knobs (ràng buộc chung), Edge Cases + AC-45 (data-load guard `EXP_ERROR_WIN_LOSS_INVARIANT_VIOLATED`) |
| A2-5 | qa-lead | Song Tu self-scoping chưa định nghĩa cho `self`=NPC | Rule 2(d), D.4 (self-relative), AC-46 |
| A2-6 | game-designer | Hook Chờ Đột Phá vẫn "NÊN", không Required | Core Rule #12 mới (Required-for-MVP) |

### 4 nhóm-B đã sửa (cùng đợt)

B2-1 (integration test note cụ thể hóa — path + field schema-check), B2-2
(AC-40 — bỏ trích dẫn instrument sai phạm vi), B2-3 (AC-47 — orphan rule
`EXP_THRESHOLD_INCREMENT<0`), B2-4 (Error Taxonomy note — liệt kê đủ 3 mã
lỗi + lý do 2 AC cố ý không đặt tên hằng số).

*(Trong lúc tự verify sau khi agent sửa file, phát hiện + sửa thêm 1 bug
hygiene ngoài checklist: "Core Rule #12" bị đụng số giữa rule cục bộ mới
và tham chiếu chéo `combat-system.md` — đã làm rõ tên tài liệu ở 2 chỗ
tham chiếu chéo.)*

### Verify hẹp sau round 2 (thay cho round 3 full panel)

Theo khuyến nghị `creative-director`: 4/6 blocking round 2 là propagation
gap, dấu hiệu round 3 full panel sẽ chỉ sinh thêm propagation gap cùng
tỷ lệ. Thay vào đó chạy verify hẹp (`economy-designer` + `qa-lead`, không
phải full `/design-review`) khóa phạm vi vào: (1) prototype số cho
invariant kinh tế mới ở 3 độ dài trận (15/30/50 pha), (2) audit
invariant↔AC coverage + coherence pass toàn file.

**Kết quả**: cả 2 việc phát hiện gap thật — invariant D.1 chỉ đúng ở
`CONTENT_EXCHANGE_ESTIMATE=30` mặc định (2,22×), tụt xuống 1,33× (dưới
ngưỡng an toàn 1,5×) ở N=50; và chính invariant đó có 0 AC/guard (đúng
lớp lỗi mà A2-4 vừa vá cho invariant D.2/D.3). Cũng xác nhận: farm đối
thủ yếu (`tier_diff≤-3`) hoàn toàn không bị ảnh hưởng bởi A2-1 (breakeven
chỉ phụ thuộc `WIN_EXP_FLOOR_MULT`, không đổi từ round 1).

**4 điểm đã xử lý cùng phiên**: `SONG_TU_EXP_RATE` hạ thêm `0.002→0.0015`
(invariant D.1 nay giữ ≥1,5× ở cả 3 mốc Safe Range); thêm AC-48/EC-11
(data-load guard cho invariant D.1); farm-đối-thủ-yếu ghi nhận **tracked
risk** ở Tuning Knobs + Open Questions (không thiết kế cơ chế chặn mới —
quyết định người dùng, để dành pass cân bằng D.5 trước Production); nhãn
EC của AC-45/AC-47 đánh số lại EC-9/EC-10.

### Trạng thái

GDD Status: **"Designed — Revised, chờ re-review (`/design-review` vòng
2, 2026-08-08)"** — chưa Approved. Tổng AC: 46 → 52 (51 BLOCKING + 1
ADVISORY). `systems-index.md` chưa cập nhật — chờ quyết định người dùng.
