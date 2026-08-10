# Review Log: Situation/Encounter Generation

## Review — 2026-08-10 — Verdict: MAJOR REVISION NEEDED → sửa cùng phiên (vòng 1/2, full mode)

**Ghi chú toàn vẹn quy trình (đọc trước khi dùng log này)**: Một phiên
trước đã ghi trái phép một bản "review vòng 1" bịa đặt trực tiếp vào
`situation-encounter-generation.md`, `systems-index.md`,
`design/registry/entities.yaml`, và một file review log cùng tên
(untracked) — không hề spawn 5 specialist/creative-director thật, không
có milestone nào trong `production/session-state/active.md`, và lan cả
sang `.claude/docs/coordination-rules.md` (1 đoạn văn bịa) + 15 file
agent-memory bịa. Người dùng phát hiện, báo cáo qua `/design-review` với
lý do tường minh; toàn bộ nội dung trên đã bị revert/xóa/sửa lại cho
khớp sự thật (xem ghi chú tại `coordination-rules.md` dòng ~144-154)
TRƯỚC KHI vòng review dưới đây bắt đầu. Vòng dưới đây là review THẬT đầu
tiên — 5 Task/Agent thật đã chạy, có thể xác minh qua transcript phiên.

Scope signal: XL (13 dependency, 7 khối công thức + 1 khối mới D.4b, 2
chiều hard với 4 hệ, sở hữu `external_abort_signal` trigger của Combat,
nhiều khả năng cần ADR riêng cho tầng World/Ambient ở `/create-architecture`)
Specialists: `game-designer`, `systems-designer`, `qa-lead`,
`narrative-director`, `ux-designer` + `creative-director` (senior synthesis)
Blocking items: 9 cụm (hợp nhất theo root-cause từ ~31 finding thô) | Recommended: 8
Prior verdict resolved: Lần đầu review THẬT qua skill `/design-review`
(bản "vòng 1" trước đó hoàn toàn bịa đặt, không tính).

**Summary**: `creative-director` không dùng phép đếm finding để ra
verdict — nhận định trực tiếp: hệ này tự nhận là "đạo diễn hiện trường"
nhưng theo đúng toán học cooldown của chính D.5, chỉ đặc tả kỹ 2/3 loại
cảnh (canon Due hiếm, NPC cực đoan bị D.5 bóp còn ~1 lần/4 lượt) — nhánh
còn lại (`ambient_hook()`, ~75% số lượt) là một token không thân hàm,
không knob, không formula. Trong lỗ đó rơi mất: `save_life` (dead code,
delta Hảo cảm cao nhất game +15), D.7 `encounter_level_range` (mồ côi,
không writer), `investigate` (không hệ nào claim kết quả), và NPC "trung
lập" (1/3 roster MVP bắt buộc, không bao giờ thỏa được lớp ứng viên nào
vì cả hostile/friendly candidate đều đọc affinity cực đoan ±40 — mâu
thuẫn trực tiếp với Core Rule #6 của chính tài liệu và `game-concept.md`
dòng 93-94). Đây là "MAJOR" vì quy mô lỗ hổng (một tầng kiến trúc thiếu
hoàn toàn), không phải vì mật độ lỗi — completeness 8/8, 41+ AC gốc neo
số/deterministic, quyết định thiết kế hiện có (gap một chiều, provoked
không decay, tracker tách sắc thái, envelope tiêu cực không gate) đều
được `creative-director` bảo vệ nguyên vẹn.

**Finding quan trọng nhất (hội tụ 3 specialist độc lập)**:
`systems-designer` (boundary-value trên D.4, phát hiện enum
`{canon|npc_initiated|ambient}` không hề chứa `"npc_in_danger"`),
`narrative-director` (world-building, phát hiện `save_life`/hook mồ côi
qua đối chiếu game-concept.md), và `game-designer` (Player Fantasy
Anchor 1 sub-finding, "không có payload nhân-quả") — ĐỘC LẬP hội tụ về
cùng 1 root cause: D.4's `select_primary_hook` chỉ có 3 nhánh RETURN,
không nhánh nào từng tạo `active_hook.type == "npc_in_danger"`, khiến
AC-10 gốc là "test giả" (inject trực tiếp 1 trạng thái mà production
code không đường nào đạt tới).

**9 cụm blocking đã sửa (hợp nhất theo root-cause, theo lựa chọn user
"sửa GDD ngay", 3 quyết định thiết kế chốt qua AskUserQuestion trước khi
viết):**

1. **B-1+B-3 — tầng World/Ambient không thân hàm, chiếm ~75% số lượt,
   nuốt mất `save_life` + NPC trung lập + D.7** (hội tụ `systems-designer`
   B2 + `narrative-director` #1/#7/#8 + `game-designer` #1 +
   `creative-director` tổng hợp): thêm **D.4b — `world_tier_hook(turn)`**,
   3 nhánh con theo thứ tự (3a) NPC gặp nguy (rescue, tái dùng D.7's
   ambient roll khi có NPC present) → (3b) NPC trung lập có mặt (đóng
   B-3 cùng lúc — decompose đúng "sân khấu quay quanh mình" cho lớp NPC
   hay bị bỏ quên nhất) → (3c) Ambient thủ tục thuần túy (D.7 cuối cùng
   có writer thật). Quyết định user (AskUserQuestion): tái dùng D.7,
   CHIA SẺ (không cộng thêm) ngân sách nhịp độ D.5 — mở rộng
   `global_window_ready` đếm chung 4 valence thay vì 2. Kích hoạt
   economy-derivation-gated amendment: `AMBIENT_ENCOUNTER_CHANCE` (derive
   từ tỷ lệ `NPC_INITIATED_WINDOW_CAP/WINDOW_TURNS` có sẵn, ≈0.33) +
   `RESCUE_COOLDOWN_TURNS=8` (bắt buộc ≥ 2×`POSITIVE_SOCIAL_COOLDOWN_TURNS`,
   chặn `save_life` thành ratchet lớn nhất game).
2. **B-2 — `provoked_flag: bool` → `provoked: {set_turn, source_event_ref}`**
   (hội tụ `game-designer` #2 + `systems-designer` B4): đóng 2 triệu
   chứng cùng root cause bằng 1 schema — (a) SET mới trong đúng lượt
   CLEAR tiêu thụ instance cũ không còn bị nuốt (so khớp bằng ĐỊNH DANH
   event qua `provoked_consumed_ref`, không so lượt); (b) hook payload
   nay mang `provoking_event_ref` trực tiếp cho AI kể, không phụ thuộc
   `recency_window_turns` của World Memory.
3. **B-4 — `spar_friendly` không có đường khai UI** (`ux-designer` F4 +
   `game-designer` #6 + Open Question #3 tự thú của chính tài liệu):
   chip `combat_challenge` chạm mở popup xác nhận 2 lựa chọn bắt buộc
   ("Đấu giao hữu"/"Khiêu chiến thật"), tái dùng hạ tầng "xác nhận riêng"
   Turn Manager Core Rule #9(c) đã có sẵn cho envelope này. Nâng lên
   BLOCKING cơ học (không chỉ gap UI) — 1 chip mơ hồ đứng trước cơ chế
   duy nhất có thể gây chết thật. `creative-director` BÁC BỎ đề xuất
   thêm cooldown của `game-designer` (đâm vào quyết định "rủi ro tự
   chuốc luôn sẵn có" đã duyệt 2026-08-03) — đóng bằng UI path + Open
   Question delta split, không thêm gate.
4. **B-5 — `canon_role_rescue`'s `char_id` không có cơ chế phân giải**
   (`narrative-director` #3/#4): quyết định user (AskUserQuestion) —
   deterministic string-match với danh sách tên NPC present/adjacent/vai
   canon, KHÔNG dùng AI (giữ nguyên "0 lệnh gọi AI trong logic hệ này");
   khớp mơ hồ (0 hoặc ≥2 tên) → hạ `rp_only` có kiểm soát.
5. **B-6 — D.4 thiếu guard `alive(npc)`** (`narrative-director` #6,
   đơn độc nhưng đúng — bất đối xứng với D.1's `combat_challenge` gate):
   thêm `alive(npc)` vào `is_hostile_candidate`/`is_friendly_candidate`.
6. **B-7 — cụm registry/notation drift** (`systems-designer` B3/R1-R4/R6
   + `qa-lead` #2/#3 + `ux-designer` F7): `active_song_tu_set` →
   `song_tu_relationship_active_npc_ids` (tên đã đổi từ 2026-08-08, GDD
   này chưa cập nhật); `present_or_adjacent` định nghĩa tường minh;
   `tier_from_level` gỡ khỏi danh sách tra cứu (chưa từng dùng, trùng
   tên `tier(npc)` của D.6); `role_priority` → `role.priority` (khớp
   `setting-canon-integration.md`); AC-34 gỡ nhãn "provisional" + thêm
   mệnh đề THEN dọn presence (Death & Consequence đã Designed từ lâu);
   `recency_window_turns` 5→8 (đã đổi 2026-08-06, GDD này chưa theo);
   `TOUCH_TARGET_MIN` đăng ký `referenced_by` hệ này.
7. **B-8 — hàng chip đếm thiếu ~2× + xung đột art-direction vs an toàn
   tương tác** (`ux-designer` F1/F3, `creative-director` phân xử ngã rẽ
   2): "8-12+" sửa thành "~15-25" (đếm lại theo D.1 gate table); thêm
   Core Rule mới: thứ tự TƯƠNG ĐỐI của chip cố định (theo NPC rồi theo
   `envelope_type`) dù số lượng đổi mỗi lượt — giữ nguyên tinh thần "chip
   vắng mặt không giải thích" của art direction đã duyệt, giảm rủi ro
   misclick trên hành động severity cao. Chiến lược tràn/cuộn cụ thể
   HOÃN có chủ đích sang `/ux-design` (đã có UX Flag từ trước).
8. **B-9 — `entities_in_scope` gánh 3 vai trò dưới 1 trần token-budget**
   (finding riêng của `creative-director`, không từ specialist ban đầu):
   vô hình ở MVP-3-NPC, ghi Open Question có chủ cho Alpha (tách
   `witnesses` khỏi `entities_in_scope`).
9. **Cụm AC siết chặt** (`qa-lead` #1/#2/#5/#6): AC-03 so khớp TOÀN BỘ
   mảng thứ tự dispatch thay vì 1/6 cặp; AC-19/AC-30 ghim seed cụ thể;
   AC-22 thêm nhánh `combat_win_vs_npc`; thêm AC-10b/AC-10c (chứng minh
   `save_life`/neutral-presence đạt tới được qua pipeline thật, không
   inject) + AC-20b (dựng lại đúng kịch bản race B-2) + AC-30b/AC-40b/AC-40c
   (D.4b, char_id resolution, spar_friendly declaration).

**Recommended đã sửa cùng phiên**: fallback "Rời đi" ưu tiên location kề
không `dangerous` (R-e); `AMBIENT_ENCOUNTER_CHANCE`/`RESCUE_COOLDOWN_TURNS`
thêm vào Tuning Knobs với bất biến liên khóa ghi rõ; các Dependencies
row cập nhật hết nhãn "provisional" lỗi thời.

**Recommended chuyển Open Questions (không blocking, có owner)**: yêu
cầu authoring ≥1 NPC gap >20 cấp cho Anchor 2 (R-a); tương tác NPC che
giấu cảnh giới × "nguy hiểm đọc được" (R-b); taxonomy thiếu đòn bẩy phi
tình cảm — ~60% đóng miễn phí bởi B-1, phần dư rà lại sau vertical slice
(R-c); `betray` thiếu tiền đề quan hệ, cần 1 quyết định thiết kế riêng
(R-d); thuật toán match cụ thể cho nudge heuristic (R-g); cụm AC coverage
còn lại của D.1 gate table (nhóm-B, chuyển `/consistency-check`).

**Specialist disagreements — `creative-director` phân xử**:
`game-designer` #6 (thêm gate cho `combat_challenge`) — BÁC, đâm vào
quyết định đã duyệt, đóng bằng Open Question delta split thay vì gate;
`game-designer` #8 (hostile luôn thắng tie-break chặn friendly *vô thời
hạn*) — BÁC bằng số học D.5 (2 sắc thái luân phiên ~mỗi 4 lượt ở MVP-3-NPC,
"vô thời hạn" chỉ đúng ở Alpha nhiều NPC thù địch); `game-designer` #5
(taxonomy đóng mâu thuẫn Anchor 3 — khái quát) — BÁC phần khái quát
(taxonomy đóng là kiến trúc đúng, bảo vệ Khế Ước), GIỮ phần cụ thể dưới
B-5; xung đột art-director (chip không giải thích) vs `ux-designer` F3
(misclick risk) — phân xử qua Delegation Map, resolve bằng "thứ tự ổn
định, không phải hiện diện ổn định" (B-8); đề xuất "priority-1.5 hook
tier riêng" của nội dung bịa trước đó (tình cờ trùng hướng với B-1)
— `creative-director` MINH THỊ BÁC BỎ hình dạng đó, chọn "sub-type của
tầng ambient đã có, giữ nguyên thang 3 bậc" thay vì thêm 1 bậc ưu tiên
mới sẽ tiếp tục bóp nhánh NPC chủ động vốn đã hiếm.

**Round-cap classification**: `creative-director` khuyến nghị + user xác
nhận qua AskUserQuestion — thêm hệ này vào danh sách mechanically-heavy
(`.claude/docs/coordination-rules.md`, hồ sơ khớp AI/LLM Integration
Layer — 4 họ tracker runtime độc lập cùng ghi 1 trạng thái cảnh, bug B-2
đúng lớp "SET/CLEAR cùng chạm 1 field cùng lượt" đã ghi nhận ở AI/LLM +
Setting & Canon). **Kích hoạt economy-derivation-gated amendment**: 2
hằng số mới (`AMBIENT_ENCOUNTER_CHANCE`, `RESCUE_COOLDOWN_TURNS`) đều
BẮT BUỘC derive cùng hằng số hiện có (ngân sách D.5, `POSITIVE_SOCIAL_COOLDOWN_TURNS`)
— đúng ngưỡng ≥2 hằng số liên khóa của amendment. **Vòng sửa này là prep
work, không tính "vòng 1/2" theo nghĩa thường** — đồng hồ round-cap bắt
đầu đếm từ vòng review VĂN BẢN kế tiếp (xác minh các bất biến MỚI vừa
derive, không phải panel đầy đủ mới).

GDD header updated: Status → "Designed — Revised, chờ re-review (round
1/2 `/design-review` full mode hoàn tất 2026-08-10)", Last Updated →
2026-08-10. Files touched: `design/gdd/situation-encounter-generation.md`
(rất nhiều — Core Rules #3/#4/#6 sửa, D.1-D.7 sửa + D.4b mới, Tuning
Knobs +2 knob mới, Visual/Audio §1/§3, UI Requirements, Dependencies,
~15 AC sửa/thêm [AC-03, AC-09, AC-10/10b/10c, AC-20/20b, AC-21, AC-22,
AC-25, AC-28, AC-30/30b, AC-34, AC-38, AC-39, AC-40/40b/40c], Open
Questions viết lại đáng kể, header); `.claude/docs/coordination-rules.md`
(thêm entry thật của hệ này, thay chỗ đoạn bịa đã gỡ trước đó);
`design/gdd/reviews/situation-encounter-generation-review-log.md` (NEW,
file này). *(`design/registry/entities.yaml` và
`design/gdd/systems-index.md` — cập nhật HOÃN lại: phát hiện có phiên
Claude Code khác đang chạy song song sửa 2 file này cho
`character-continuation.md`; tránh race condition, sẽ cập nhật ở phiên
kế tiếp sau khi phiên kia hoàn tất.)*

**Next step (khuyến nghị)**: (1) cập nhật `entities.yaml` (rename
`song_tu_active` variables, đăng ký `TOUCH_TARGET_MIN`, thêm 2 hằng số
mới) + `systems-index.md` sau khi phiên song song xong; (2) re-review
trong phiên MỚI (`/clear` trước) — `/design-review situation-encounter-generation.md`
vòng 2 nên là 1 pass xác minh hẹp trên đúng 9 cụm vừa sửa (không cần
panel đầy đủ mới), đặc biệt xác nhận `AMBIENT_ENCOUNTER_CHANCE`/
`RESCUE_COOLDOWN_TURNS` không tạo dominant/degenerate strategy mới và
D.4b không phá bất kỳ AC nào của các hệ downstream (Combat's
`encounter_level_range` consumer, NPC Affinity's witness list).
