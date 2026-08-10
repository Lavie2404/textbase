# Review Log: Setting & Canon Integration

## Review — 2026-08-08 — Verdict: NEEDS REVISION → sửa cùng phiên (vòng 1/2)
Scope signal: XL (11 dependency nhiều cái 2 chiều, 7 khối công thức D.0-D.6, state machine + đệ quy cascade, 48 AC — có thể cần 1 ADR riêng "Canon status transition authority")
Specialists: `narrative-director`, `game-designer`, `systems-designer`, `qa-lead` + `creative-director` (senior synthesis)
Blocking items: 5 | Recommended: ~9

Summary: Review đầu tiên. Kiến trúc hệ này vững — Player Fantasy 2 tầng
rõ nhất trong các GDD của dự án, determinism được bảo vệ chủ động
(AC-20 chống cả hash-order). Không phải MAJOR REVISION: 3/5 blocking
không đòi quyết định thiết kế mới, chỉ ép pseudocode tuân đúng bất biến
GDD đã tự viết ra (bảng States and Transitions). `systems-designer` và
`qa-lead` độc lập hội tụ vào cùng 1 root cause: không có "writer" bảo
vệ duy nhất cho `status(event)` — 4 nơi ghi trực tiếp (STEP 1, STEP 1b,
STEP 2, D.4 cascade) không nơi nào biết nơi kia, gây 2 bug xác nhận (2
cascade độc lập ghi đè nhau mất đúng tie-break `vanish>branch>substitute`;
nguy cơ resolve 1 event 2 lần trong lượt) + biến `resolution` chỉ gán
trong comment `//` (cùng lớp lỗi `combat-system.md` D.9b/D.9c).
`qa-lead` độc lập tìm thêm: `CASCADE_MAX_DEPTH` hoàn toàn không có cơ
chế trong pseudocode D.4 dù AC-22 giả định nó tồn tại. `systems-designer`
tìm thêm: D.6 STEP 1 (vòng lặp fixpoint) thiếu chứng minh hội tụ tường
minh (khác D.4 đã có) — nguy cơ vòng lặp vô hạn thật nếu "có thay đổi"
bị hiểu nhầm là "nhánh IF kích hoạt" thay vì "giá trị thực sự đổi".
`game-designer` tìm 2 finding mạnh: rescue thất bại không ghi field lý
do (AI không có cơ sở cơ học để diễn giải, vi phạm Competence SDT); và
`substitute` là default khi tác giả quên khai `on_break`, rủi ro NPC
trung lập bị "bốc" vào vai phản diện vô lý (D.3 hoàn toàn cơ học, không
chiều tính cách). `narrative-director` không tìm blocking nào — 2 câu
hỏi thiết kế mở (mức hiển lộ định mệnh trước cam kết; khung "phá vỡ
định mệnh" có phải luôn cần chủ động buông tay).

**5 blocking đã sửa:**
1. **Writer một cửa `transition_event_status(E, proposed, source)`**
   (D.5b mới) — 3 guard: terminal-write-once, severity lattice
   (`Suspended/Vanished=3 > Branched=2 > Dormant-Modified=1 > Dormant=0`,
   nâng Core Rule #4 tie-break thành bất biến TOÀN CỤC không chỉ cục bộ
   Due), write-once cho field `canon_event_*_status` (chỉ ghi ở STEP 4,
   không ghi giữa chừng). STEP 1/1b/2 và D.4 cascade đều gọi qua hàm
   này. AC-05 mở rộng + AC-22b mới (property-based 2 thứ tự đảo ngược).
2. **`CASCADE_MAX_DEPTH`**: thêm `depth` param vào chữ ký
   `cascade_vanish_check`; định nghĩa ngữ nghĩa CẮT = dừng lan truyền
   eager (lazy vẫn đúng tại Due riêng của event đó, không mất phán
   quyết cuối, chỉ mất cửa sổ Suspended sớm); validate `longest_path`
   DAG tại LOAD-time — van an toàn không bao giờ kích hoạt trong content
   hợp lệ. AC-22 sửa + AC-38 thêm loại lỗi `cascade_too_deep`.
3. **D.6 STEP 1 fixpoint**: định nghĩa tường minh "có thay đổi" = giá
   trị thực sự đổi (không phải nhánh IF kích hoạt) + chứng minh hội tụ
   (lattice đơn điệu hữu hạn `≤3×|events|`) dán vào GDD + van an toàn
   `FIXPOINT_MAX_ITERATIONS=100` (Tuning Knobs mới). AC-27b mới (chu
   trình mutual qua `custom_flag`).
4. **`canon_rescue_failed_[event_id]`** enum lý do (`dead`/
   `tier_out_of_range`/`wrong_faction`/`excluded`/`no_vacant_role`) —
   khóa vào `locked_result` khi rescue thất bại, đưa vào payload
   narration dạng CHỈ THỊ (không phải dữ liệu hiển thị, giữ nguyên UI
   Requirement #3). AC-07 mở rộng.
5. **`on_break` bắt buộc khai per-premise, bỏ default `substitute`** —
   validate tại load (nhất quán nguyên tắc default-an-toàn GDD đã tự áp
   dụng cho `custom_flag.reversible`). AC-38 thêm loại lỗi
   `missing_on_break`. Không thêm chiều tính cách/quan hệ vào D.3 (phá
   determinism AC-20) — rào chắn đúng chỗ là bắt buộc authoring phân
   loại vai thể chế/cá nhân, không phải công thức.

**2 quyết định người dùng chốt qua `AskUserQuestion`**:
(1) Mức hiển lộ định mệnh trước cam kết = **Phương án B** (chỉ thị
tường thuật qua `rescue_window_final`/`canon_rescue_failed_reason`,
KHÔNG thêm badge/timer UI — giữ nguyên UI Requirement #2 nguyên văn).
(2) Đỉnh Player Fantasy "phá vỡ định mệnh" có **2 dạng đều hợp lệ**:
(A) chủ động bẻ gãy + từ chối cứu, (B) bi kịch thụ động (hệ quả không
chủ ý, nhận ra cái giá về sau) — Player Fantasy section viết lại phản
ánh cả hai.

**Đóng góp phát hiện thêm của `creative-director`** (verify chéo): cờ
`destroyed` cho `possesses` không tồn tại trong
`equipment-skill-data-system.md` (đã **Approved**) — nâng mức từ
backlog note thành "mở lại tài liệu Approved", route sang `producer`
(Coordination Rule #4); ràng buộc MVP tạm thời "không author premise
`possesses`" thêm vào Open Questions.

**Recommended đã sửa cùng phiên** (chi phí thấp, cùng vùng sửa blocking):
nhãn "Discovery" ở frontmatter viết lại (không phải về danh tính, mà về
"thế giới trở thành cái gì"); D.3/D.6 STEP 2 làm rõ cập nhật
`substitutes_used_this_turn` NGAY sau mỗi vai gắn trong-event (chặn 1
ứng viên bị gắn 2 vai cùng event); AC-06/AC-07 đồng bộ tag
`provisional-interface`; AC-38 specify schema structured cho danh sách
lỗi; AC-41 viết lại theo schema-inspection (không phải behavior test),
route ràng buộc thật sang `turn-manager.md`; AC-23 (D.5) thêm ca tham
số hóa (test tại `AFFINITY_MAGNITUDE_TIER2=10`, không chỉ default=15);
2 ràng buộc rubric authoring MVP mới trong Open Questions (≥1 event
dùng `vanish` phi-lãng-mạn; ≥1 NPC MVP không-major đang che giấu).

File đã sửa: `setting-canon-integration.md` (chính — header, Player
Fantasy, Overview/frontmatter, Core Rule #4/#4b viết lại lớn, States
and Transitions +ghi chú enforcement, D.4 viết lại toàn bộ + ví dụ
fan-out mới, D.5b MỚI [`transition_event_status`], D.6 pipeline viết
lại STEP 1/1b/2/4 + chứng minh hội tụ, Interfaces công khai +1
[`rescue_window_final`], Edge Cases +2 sửa, Tuning Knobs +1 knob mới,
UI Requirements #2 mở rộng, AC-05/07/22/23/27/38/41 sửa + AC-22b/27b
mới, Open Questions 4 mục sửa/thêm), `.claude/docs/coordination-rules.md`
(thêm hệ này vào danh sách mechanically-heavy confirmed, ghi chú tiền
lệ ngược cho amendment economy-derivation-gated).

Prior verdict resolved: First review.

Trạng thái sau vòng này: **Designed — Revised, chờ re-review (vòng
1/2 — round cap mechanically-heavy, vòng 2 là vòng cuối)**. Theo
`.claude/docs/coordination-rules.md`, vòng 2 nên kiểm chứng đúng 4 bất
biến MỚI (theo tiêu chí xác nhận của creative-director): (1) chạy
`resolve_turn_canon` với `resolution_order` đảo ngược trên cùng fixture
→ kết quả bit-identical; (2) load setting pack có chuỗi sâu 25 → từ
chối tại LOAD, không phải cắt âm thầm tại runtime; (3) playtest rescue
thất bại 2 lần liên tiếp → người chơi nói đúng được vì sao; (4) rà 2-3
canon event MVP → không event nào dùng `substitute` chỉ vì quên khai —
không phải 1 lượt adversarial toàn văn bản mới. Khuyến nghị `/clear`
trước khi re-review.

## Review — 2026-08-08 — Verdict: NEEDS REVISION (minor) → sửa cùng phiên (vòng 2/2, vòng cuối)
Scope signal: XL (không đổi từ vòng 1)
Specialists: `narrative-director`, `game-designer`, `systems-designer`, `qa-lead` (audit có mục tiêu, đúng scope review log vòng 1 yêu cầu) + `creative-director` (senior synthesis)
Blocking items: 3 | Recommended: 7 | Backlog ghi vào Open Questions: 6

Summary: Vòng cuối của round cap — không có vòng 3. Chạy dạng audit có
mục tiêu (không adversarial toàn văn bản) theo đúng khuyến nghị vòng 1.
Cả 4 specialist hội tụ vào 1 chẩn đoán chung (`creative-director`):
gần như mọi finding vòng này là **propagation gap từ chính các bản sửa
vòng 1**, không phải defect thiết kế mới — dấu hiệu tài liệu đang hội
tụ (fixed point), đúng lý do round cap dừng ở đây thay vì mở vòng 3.
3 blocking: (1) [qa-lead, xác nhận creative-director] D.4
`cascade_vanish_check` không có dòng nào ghi `canon_break_flag_[D.id]`
dù AC-22b/AC-30 (regression cố định) đều giả định field này tồn tại —
tái diễn nguyên văn lớp lỗi #1 của vòng 1; (2) [game-designer, mở rộng
bởi creative-director] `rescue_window_final` (interface thêm ở vòng 1)
chưa từng có AC lẫn chưa từng được giao cho hệ tiêu thụ
`situation-encounter-generation.md` — Phương án B (chỉ thị tường thuật,
không UI timer) chỉ hợp lệ nếu chỉ thị THỰC SỰ đến nơi, hiện không gì
đảm bảo; (3) [systems-designer, xác nhận blocking bởi creative-director]
`resolution_order` (D.2) không validate khớp hướng cạnh DAG (D.4) — có
thể khiến 1 event downstream bị Vanished sai vĩnh viễn nếu tác giả gán
sai mốc thời gian, hậu quả không đối xứng (Pillar 2, không hoàn tác
được) trong khi chi phí fix ~0 (1 enum lỗi vào family validate load-time
đã có sẵn). `creative-director` bác lại 1 finding của `systems-designer`
(nghi ngờ `CASCADE_MAX_DEPTH` off-by-one — trace tay xác nhận KHÔNG mất
transition nào, hạ xuống recommended: chỉ cần khai rõ đơn vị
`longest_path`=số cạnh + 1 AC biên).

**3 blocking đã sửa cùng phiên** (2 câu hỏi người dùng chốt qua
`AskUserQuestion` trước khi sửa — cả 2 theo đúng khuyến nghị
`creative-director`): B-3 = BLOCKING (validate tại load); propagation
`rescue_window_final` = sửa chéo ngay trong phiên (không route qua
`/consistency-check` sau).
1. D.4 pseudocode: `FOR D IN downstream_index[E.id]` đổi từ WHERE-filter
   (ambiguous snapshot/live) sang `IF...CONTINUE` đánh giá LIVE + thêm
   dòng `lock canon_break_flag_[D.id] = true` trước khi tính resolution
   — cascade giờ LÀ 1 nguồn break eager tường minh, khớp AC-22b/AC-30.
   Thêm ví dụ "Diamond trong CÙNG 1 lời gọi" minh họa 2 guard
   (write-once + severity lattice) bổ trợ nhau.
2. `rescue_window_final`: AC-46b (tính đúng) + AC-46c (mock-spy payload
   `suggestion_call`) mới trong GDD này; cascade sang
   `situation-encounter-generation.md` — Edge Case mới (tag
   `canon_rescue_final_[event_id]` vào `scene_tags`, độc lập hook
   chính), Dependencies row cập nhật, AC-40b mới (mirror AC-40).
3. D.4: thêm validate load-time mới — mọi cạnh `A→B` yêu cầu
   `(earliest_world_time(A), event_id(A)) < (earliest_world_time(B),
   event_id(B))`; AC-38 thêm `error_type: dependency_order_violation`
   + AC-38b cô lập ca này.

**7 recommended đã sửa cùng phiên** (chi phí thấp, cùng vùng sửa
blocking): D.5 bảng thêm hàng `canon_rescue_failed_[event_id]` Tier 2 +
Dependencies WM row đồng bộ (bản trước rơi mặc định Tier 0, mâu thuẫn
tinh thần fix B4 vòng 1); đơn vị `longest_path` chốt = số cạnh + AC-22d
ca biên đúng `CASCADE_MAX_DEPTH` cạnh (PASS load, không cắt runtime);
D.5b thêm bất biến tường minh cho ca 2 đề xuất CÙNG severity=3
(`Suspended` vs `Vanished`) — cơ chế thật là Guard 1 (terminal
write-once), không phải số severity; registry `entities.yaml` entry
`resolve_turn_canon` đồng bộ (`revised: ""` → cập nhật đầy đủ); Rule
#4b + AC-07 chốt nghĩa `no_vacant_role` = ứng viên đã bị
`substitutes_used_this_turn` giữ chỗ cho event khác (điều kiện thứ 5
của `eligible()` D.3, trước đây thiếu cả trong prose lẫn AC); Player
Fantasy thêm 1 câu: rescue đúng đắn vẫn có thể thất bại vì thế giới hết
ứng viên, không phải lỗi người chơi; Open Questions ND-1/ND-2 (rubric
authoring MVP) — hướng dẫn GỘP cả 2 ràng buộc vào CÙNG 1 NPC thù địch
(hội tụ độc lập `game-designer`+`narrative-director`), kèm gợi ý cụ thể
3 event MVP.

**6 mục backlog ghi vào Open Questions** (không viết AC thật, có
owner): AC-22c (bit-identical toàn bộ `locked_result`, không chỉ
`status(D)`); AC-38c (chuỗi sâu 25 KHÔNG bypass → cô lập test load-reject);
AC-47b + mở rộng AC-47 (golden scenario rescue-thất-bại-2-lần-liên-tiếp
+ phân biệt valence "bi kịch có ý nghĩa" vs "bất công/lỗi");
`on_break=substitute` khai NHẦM (giới hạn cố hữu schema, không cơ học
hóa được); dạng (B) Player Fantasy là khoảnh khắc dùng-một-lần với
roster 3 NPC (tracked risk); thứ tự `narration_call` vs foreshadowing
dạng (B) (route sang `systems-designer`/`lead-programmer` lúc
`/create-architecture`).

File đã sửa: `setting-canon-integration.md` (D.4 pseudocode +
validate mới + ví dụ Diamond, D.5 bảng + AC-22d/AC-38b, D.5b bất biến
mới, Core Rule #4b + AC-07, Player Fantasy, Dependencies WM row,
AC-46b/AC-46c, Open Questions ND-1/ND-2 + 6 mục backlog, header),
`situation-encounter-generation.md` (Edge Case tag
`canon_rescue_final_*`, Dependencies row, AC-40b), `entities.yaml`
(`resolve_turn_canon` đồng bộ).

Prior verdict resolved: Yes — toàn bộ 5 blocking của vòng 1 xác nhận
đứng vững qua audit vòng 2 (không phát hiện regression thiết kế nào);
3 blocking mới của vòng 2 đều là propagation gap của chính bản sửa
vòng 1, không phải defect mới phát sinh độc lập.

**GDD status: Designed → Approved.** Round cap kết thúc — không có
vòng 3.
