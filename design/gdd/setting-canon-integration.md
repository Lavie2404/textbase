# Setting & Canon Integration

> **Status**: **Approved**
> **Author**: user + agents
> **Last Updated**: 2026-08-08 — `/design-review` vòng 2/2 (vòng cuối,
> round cap mechanically-heavy) hoàn tất: audit có mục tiêu (4
> specialist: `narrative-director`, `game-designer`, `systems-designer`,
> `qa-lead`) + `creative-director` tổng hợp — đúng theo khuyến nghị của
> review log vòng 1 (kiểm chứng bất biến mới, không adversarial toàn
> văn bản). Verdict NEEDS REVISION (minor), 3 blocking + 7 recommended
> đã sửa live cùng phiên — TẤT CẢ đều là propagation gap từ chính các
> bản sửa vòng 1 (không đòi quyết định thiết kế mới): D.4 cascade thiếu
> dòng ghi `canon_break_flag_[D.id]` dù AC-22b/AC-30 đã giả định field
> này tồn tại; `rescue_window_final` là interface công khai chưa từng
> có AC lẫn chưa từng được giao cho hệ tiêu thụ
> `situation-encounter-generation.md`; `resolution_order` (D.2) không
> validate khớp hướng cạnh DAG (D.4) — có thể khiến 1 event downstream
> bị Vanished sai vĩnh viễn nếu tác giả gán sai mốc thời gian. Cùng
> phiên: `canon_rescue_failed_*` bổ sung vào D.5 (Tier 2) + Dependencies;
> Guard 1 (terminal write-once) viết thành bất biến tường minh cho ca
> 2 đề xuất cùng severity; đơn vị `longest_path` chốt = số cạnh; enum
> `no_vacant_role` chốt nghĩa (= `substitutes_used_this_turn`); registry
> `entities.yaml` đồng bộ; Player Fantasy + Open Questions (ND-1/ND-2)
> làm rõ. Vòng 1 (trước đó): verdict NEEDS REVISION, 5 blocking đã sửa
> (writer một-cửa `transition_event_status` + severity lattice; `depth`
> param D.4 + validate DAG-depth tại load; D.6 STEP 1 chứng minh hội tụ
> + `FIXPOINT_MAX_ITERATIONS`; `canon_rescue_failed_[event_id]` enum;
> `on_break` bắt buộc khai, bỏ default `substitute`); 2 quyết định
> người dùng: mức hiển lộ định mệnh trước cam kết = Phương án B; đỉnh
> Player Fantasy "phá vỡ định mệnh" có 2 dạng hợp lệ (chủ động + bi
> kịch thụ động). Xem
> `design/gdd/reviews/setting-canon-integration-review-log.md`.
> **Implements Pillar**: Pillar 1 (Thế Giới Khách Quan), Pillar 2 (Hệ Quả Thực Sự); nền cho đặc quyền xuyên không & Discovery — **sửa khung 2026-08-08** (`/design-review`, đóng gap `game-designer`): KHÔNG phải Discovery về DANH TÍNH (đặc quyền xuyên không cho biết trước, có chủ đích, với `is_major_canon`) — Discovery ở đây là về việc **thế giới trở thành cái gì** sau khi một tiền đề bị bẻ gãy: nhánh rẽ là thứ chưa biết ngay cả với người chơi đã thuộc lòng nguyên tác

## Overview

**Setting & Canon Integration** là hệ thống sở hữu **toàn bộ tri thức về
danh tác nền** mà người chơi chọn làm thế giới (Đấu La Đại Lục, Phàm Nhân
Tu Tiên...): hồ sơ nhân vật nguyên tác (danh tính thật, kể cả khi cải
trang), dòng sự kiện canon, **tiền đề nhân quả** của từng sự kiện (điều
kiện khiến sự kiện đó xảy ra như nguyên tác), và dữ liệu luật thế giới
theo bối cảnh — trong đó có `breakthrough_requirement` (điều kiện đột phá
bậc, VD: Hồn Hoàn) mà EXP & Realm Progression phụ thuộc cứng. Với người
chơi, đây là hệ thống hiện thực hóa fantasy **xuyên không**: bước vào thế
giới đã thuộc lòng, biết trước ai là ai (kể cả nhân vật lớn đang cải
trang) và chuyện gì sắp đến — rồi dùng chính hiểu biết đó để **phá vỡ
định mệnh**: bẻ gãy tiền đề nhân quả của một sự kiện canon (cứu người lẽ
ra phải chết, hóa giải mối thù lẽ ra phải nổ ra) và nhìn thế giới rẽ sang
nhánh mới không còn ràng buộc bởi nguyên tác.

Về mặt kiến trúc, hệ này là **trọng tài canon duy nhất**: nó — chứ không
phải AI — phán quyết sự kiện nào mang **lực đẩy vĩ mô** (nguyên nhân
độc lập với hành động cụ thể của người chơi — phá premise vẫn tái khẳng
định qua policy `substitute`, xem Core Rule #4) so với sự kiện phụ
thuộc tiền đề LÕI có thể thực sự **biến mất/rẽ nhánh**
(`vanish`/`branch`), và tiền đề nào ĐÃ bị phá tại thời điểm nào
(`canon_break_flag` khóa vào `locked_result`, đúng Khế Ước Cơ Học/Tường
Thuật — AI chỉ tường thuật nhánh rẽ, không tự quyết). **Không có
category sự kiện nào miễn nhiễm phá vỡ** (sửa 2026-08-05, đóng gap
`/design-review` gộp 11 GDD — câu trên trước dễ đọc nhầm thành có loại
"cố định = bất khả xâm phạm", mâu thuẫn rubric tổng quát ở Core Rule
#4) — chỉ khác nhau ở CÁCH phản ứng khi bị phá. Các hệ tiêu thụ: EXP đọc
`breakthrough_requirement_met`; Character Card đọc quy tắc danh tính/cải
trang; Situation/Encounter Generation đọc trạng thái canon để tạo tình
huống đúng dòng thời gian; World Memory ghi sự kiện phá canon thành fact
vĩnh viễn (và để ngỏ `importance_score` cho hệ này chấm điểm tầm quan
trọng sự kiện).

## Player Fantasy

*(`creative-director` không được tham vấn — Lean mode, không phải section
rủi ro cao theo quy tắc skill.)*

Người chơi trải nghiệm hệ này ở **cả hai tầng**. **Trực tiếp**: đây là
fantasy của **kẻ biết trước** — bước vào Đấu La Đại Lục với toàn bộ ký ức
về nguyên tác, người chơi chủ động khai thác lợi thế thông tin: nhận ra
"Vương Đông" chính là Đường Vũ Đồng khi mọi NPC khác còn bị lừa, chuẩn bị
trước cho đại nạn sắp đến, đón đầu cơ duyên trước cả nhân vật chính
nguyên tác. Lợi thế này thuần túy là **thông tin của người chơi** — thế
giới không hề biết và không nể nang: NPC vẫn đối xử theo thực lực thật
(Pillar 1), nên biết trước chỉ có giá trị khi người chơi đủ giỏi để hành
động dựa trên nó.

**Gián tiếp**: cảm giác **sống trong danh tác yêu thích** một cách chân
thực — thế giới vận hành đúng luật mình thuộc lòng: đúng người xuất hiện
đúng nơi, sự kiện lớn diễn tiến đúng nhịp nguyên tác chừng nào chưa ai
chạm vào tiền đề của nó, điều kiện đột phá đúng như trong truyện (muốn
lên bậc phải săn Hồn Hoàn, không có lối tắt). Người chơi không thấy bộ
máy phán quyết — họ chỉ thấy một thế giới nhất quán đến mức tin được.

Đỉnh của fantasy là khoảnh khắc **phá vỡ định mệnh**: dùng hiểu biết +
thực lực để bẻ gãy một tiền đề nhân quả — cứu người "chắc chắn phải
chết", hóa giải mối thù "chắc chắn phải nổ ra" — và nhìn thế giới THẬT SỰ
rẽ nhánh, vĩnh viễn, không quay lại nguyên tác nữa (Pillar 2: Hệ Quả
Thực Sự). Cảm giác đúng: định mệnh không phải kịch bản bất khả xâm phạm,
cũng không phải thứ đổi được bằng ý muốn — nó là một cấu trúc nhân quả có
thật mà người đủ hiểu và đủ mạnh có thể can thiệp. "Thế giới khách quan,
nhưng không bất biến trước một người chơi đủ giỏi." **Nhưng "đủ giỏi"
không luôn đủ** (thêm 2026-08-08 vòng 2, đóng gap `game-designer` cụm D
— câu trên đọc như hứa hẹn thành công-nếu-đủ-giỏi, trong khi Rule #4b
có lý do thất bại `no_vacant_role` hoàn toàn ngoài tầm kiểm soát người
chơi): thế giới khách quan đôi khi đã hết ứng viên trước khi người chơi
kịp hành động — một nỗ lực cứu đúng đắn vẫn có thể thất bại không phải
vì người chơi sai, mà vì thế giới không nợ ai một lối thoát sẵn có.

**Đỉnh này có HAI dạng, cả hai đều hợp lệ** (làm rõ 2026-08-08,
`/design-review` — quyết định người dùng): **(A) chủ động** — người chơi
cố ý bẻ gãy premise và TỪ CHỐI cứu (Rule #4b), nhìn thế giới rẽ nhánh vì
một lựa chọn có ý thức; **(B) bi kịch thụ động** — hệ quả không chủ ý (VD
một trận đấu thường giết chết một nhân vật gắn vai canon) rồi người chơi
nhận ra cái giá thật và không mua lại được. (B) KHÔNG phải đỉnh hạng hai
— nó là bằng chứng thuần khiết nhất của Pillar 2 (Hệ Quả Thực Sự) và
không cần bất kỳ hành động "buông tay" chủ ý nào. Đỉnh thật không phải
"chủ động buông tay" mà là **khoảnh khắc hiểu ra cái giá là thật** — đến
qua hành động, qua bất động, hoặc qua một lần cứu thành công nhưng vẫn
phải trả giá (AC-33: mỗi lần cứu-lại đòi 1 sinh mạng thật).

## Detailed Design

### Core Rules

1. **Setting pack là nguồn chân lý bối cảnh**: mỗi danh tác là một bộ
   data (setting pack) gồm: hồ sơ nhân vật nguyên tác, hồ sơ sự kiện
   canon, và luật thế giới theo bối cảnh (`breakthrough_requirement`
   theo tier, tên cảnh giới, quy tắc đặc thù). MVP: 1 setting (VD: Đấu
   La Đại Lục), 1 vùng, data tối thiểu đủ cho 3 NPC + 2–3 sự kiện canon.
2. **Hồ sơ nhân vật nguyên tác**: `{char_id, true_identity, danh sách bí
   danh/cải trang, is_major_canon, hồ sơ level/tier, vai trong các sự
   kiện}`. **Cam kết hợp đồng — alias list là TĨNH per setting pack ở
   MVP** *(thêm 2026-08-11, cascade đóng Open Question #11 của
   `character-card-identity.md`, quyết định user)*: `danh sách bí
   danh/cải trang` là data tồn kho của setting pack (nhất quán
   Dependencies "setting pack là data tĩnh không cần lưu"), KHÔNG có
   writer runtime — hệ quả ràng buộc content: **không nhân vật nào trong
   content MVP được "ngừng cải trang giữa truyện"**, để suy diễn
   `disguise_active(C) := len(alias_list(C)) > 0` của Character Card D.2
   luôn đúng. Nếu Alpha cần cơ chế ngừng-cải-trang, hệ NÀY phải sở hữu 1
   cờ runtime + serialize (xem Open Questions). **Đặc quyền xuyên không**: với `is_major_canon=true`,
   Character Card của người chơi LUÔN hiển thị danh tính thật kể cả khi
   đang cải trang; NPC thường thì chỉ hiển thị "đang che giấu/dịch
   dung". Đặc quyền là THÔNG TIN người chơi — không đổi world-state:
   các NPC khác vẫn bị lừa cho đến khi danh tính lộ qua diễn biến (đúng
   `game-concept.md` mục Bối Cảnh).
3. **Hồ sơ sự kiện canon**: `{event_id, trigger_condition (predicate
   world-state), earliest_world_time, location_id (bổ sung 2026-08-05 —
   nơi vai canon của event xuất hiện, dùng bởi `canon_role_npcs`, xem
   Dependencies), roles[] (vai + yêu cầu đủ điều kiện + nhân vật đang
   gắn + `priority`), premises[] (tiền đề — predicate cơ học + chính
   sách on_break riêng), canon_outcome (hệ quả cơ học + tóm tắt tường
   thuật cho AI), status}`.
4. **Rubric phá vỡ (giải cờ HIGH-RISK — quyết định người dùng
   2026-08-03)**: **MỌI sự kiện canon đều phá vỡ được** — không tồn tại
   sự kiện bất khả xâm phạm. Phá = làm sai ≥1 premise. Chính sách xử lý
   theo `on_break` của premise bị phá:
   - **`substitute`**: premise gắn một VAI thay thế được →
     thế giới tìm nhân vật khác đủ điều kiện lấp vai (chọn cơ học, xem
     Formulas D.3) — sự kiện vẫn diễn ra dạng biến thể. Đây là cách mô
     hình "lực đẩy vĩ mô": giết sứ giả Vũ Hồn Điện thì sứ giả khác đến,
     chiến tranh vẫn nổ ra.
   - **`vanish`**: premise là LÕI TỒN TẠI của sự kiện (VD: Tiểu Vũ
     trong "Tiểu Vũ hiến tế" — cướp Tiểu Vũ làm vợ trước thời điểm đó
     thì sự kiện hiến tế không còn tồn tại) → sự kiện vào trạng thái
     **Suspended (treo)** chờ biến mất — KHÔNG biến mất tức thì: người
     chơi có thể "cứu" sự kiện bằng cách mô tả vai thay thế qua ô nhập
     hành động tự do trước khi sự kiện đến hạn (quyết định người dùng
     2026-08-03, "ưu tiên trải nghiệm người chơi" — xem Core Rule #4b).
     Đến hạn mà vai lõi vẫn trống → **Vanished** chính thức, mọi sự
     kiện downstream phụ thuộc nó (premise `event_completed`) bị kiểm
     tra dây chuyền tại thời điểm đó.
   - **`branch`**: data khai sẵn nhánh thay thế cụ thể (sự kiện khác
     kích hoạt thay).

   **`on_break` BẮT BUỘC khai per-premise, KHÔNG có default** (sửa
   2026-08-08, `/design-review` vòng 1, đóng gap `game-designer` — cụm
   B5): bản trước dùng `substitute` làm mặc định khi tác giả quên khai,
   tạo rủi ro 1 NPC hoàn toàn trung lập bị "bốc" vào vai phản diện chỉ
   vì khớp tier/phe (D.3 hoàn toàn cơ học, không có chiều tính cách/
   quan hệ) — đối lập trực tiếp Player Fantasy "người chơi không thấy
   bộ máy phán quyết". Nhất quán với nguyên tắc default-an-toàn GDD đã
   tự áp dụng cho `custom_flag.reversible=false` ("an toàn hướng
   eager-check thay vì bỏ sót break", D.1): thiếu `on_break` là LỖI
   AUTHORING, từ chối load (xem D.4/AC-38 validation). *(Không thêm
   chiều tính cách/quan hệ/động cơ vào D.3 — sẽ phá tính deterministic
   AC-20 bảo vệ; rào chắn đúng chỗ là bắt buộc tác giả CHỦ Ý phân loại
   "vai thể chế" [an toàn cho substitute] khỏi "vai cá nhân có ý nghĩa"
   [nên dùng vanish/branch], không phải công thức chọn.)*

   **Rule #4b — Người chơi cứu sự kiện bị phá lõi**: khi một sự kiện ở
   trạng thái Suspended, một hành động tự do của người chơi được
   Situation/Encounter Generation phân loại là `canon_role_rescue`
   (đề cử/tạo nhân vật thay vai lõi cho sự kiện đó — provisional) sẽ
   được PHÁN QUYẾT CƠ HỌC: nhân vật được đề cử phải qua kiểm tra
   eligibility của Formulas D.3 (sống, đúng khoảng tier của vai, đúng
   phe, không bị loại trừ, **không đã được dùng làm substitute cho
   event khác trong CÙNG lượt** — điều kiện thứ 5 của `eligible()`, làm
   rõ 2026-08-08 vòng 2, đóng gap `game-designer` cụm D phụ: bản trước
   prose chỉ liệt kê 4/5 điều kiện của D.3, dù enum `canon_rescue_failed`
   ở Schema field/D.6 vẫn có `no_vacant_role` — nay chốt: `no_vacant_role`
   = ứng viên đã bị `substitutes_used_this_turn` "giữ chỗ" cho event
   khác, KHÔNG phải "vai không tồn tại"). Hợp lệ → vai được gắn lại, sự kiện →
   Dormant-Modified (tiếp tục tồn tại dạng biến thể, khóa
   `canon_role_filled_[npc_id]`); không hợp lệ → hành động vẫn diễn ra
   về mặt tường thuật nhưng sự kiện KHÔNG được cứu (kết quả phán quyết
   khóa trước khi AI tường thuật — đúng Khế Ước, AI không quyết).
   **Lý do thất bại được khóa cho tường thuật** (thêm 2026-08-08 vòng
   1, đóng gap `game-designer` — cụm B4: bản trước KHÔNG ghi field nào
   khi rescue thất bại, nên AI không có cơ sở cơ học nào để diễn giải
   LÝ DO — người chơi không bao giờ học được vì sao thất bại, vi phạm
   Competence [SDT]): khóa `canon_rescue_failed_[event_id]` với enum lý
   do (`dead` / `tier_out_of_range` / `wrong_faction` / `excluded` /
   `no_vacant_role`) vào `locked_result`, đưa vào payload
   `narration_call` DƯỚI DẠNG CHỈ THỊ tường thuật (không phải dữ liệu
   hiển thị — giữ nguyên UI Requirement #3, không lộ số liệu canon).
   AI diễn giải bằng văn ("cậu ta còn quá non nớt để gánh vai đó") —
   lý do là cơ học, deterministic; chỉ câu chữ do AI. Xem AC-07.

   **Tín hiệu "cửa sổ cứu cuối" — quyết định người dùng 2026-08-08
   (Phương án B: chỉ thị tường thuật, không cơ chế UI)**: interface
   công khai `rescue_window_final(event_id) = is_due(event)` được đánh
   giá NGAY khi `status(event)==Suspended` (dùng lại chính D.2
   `is_due`, không công thức mới) — TRUE nghĩa là nếu người chơi KHÔNG
   gửi `canon_role_rescue` hợp lệ trong CHÍNH lượt này, STEP 2 sẽ phán
   quyết Vanished ngay cuối lượt (STEP 1b luôn chạy TRƯỚC STEP 2 trong
   cùng lượt, D.6). Cờ này được xuất cho Situation/Encounter Generation
   làm CHỈ THỊ PROMPT (không phải badge/timer UI — giữ nguyên UI
   Requirement #2 "qua gợi ý tường thuật, không qua UI timer cơ học")
   để AI dựng áp lực bằng văn ("đây có thể là cơ hội cuối") đúng lượt
   quan trọng nhất, không phải mọi lượt Suspended. Xem Interfaces công
   khai (cuối Edge Cases) + UI Requirements.

   **Tie-break/severity — BẤT BIẾN TOÀN CỤC, không chỉ cục bộ trong
   nhánh Due** (nâng cấp 2026-08-08, `/design-review` vòng 1, đóng gap
   `systems-designer`+`qa-lead` — cụm B1: bản trước viết tie-break như
   thủ tục cục bộ CHỈ trong STEP 2/nhánh Due, trong khi nó thực chất là
   thứ tự nghiêm trọng PHẢI áp dụng ở MỌI nơi ghi `status(event)`,
   không riêng gì lúc nhiều premise cùng 1 event bị phá tại Due — xem
   D.6 `transition_event_status`, nơi bất biến này được enforce cho
   TOÀN BỘ pipeline): **`Suspended`/`Vanished` (vanish) > `Branched`
   (branch) > `Dormant-Modified` (substitute) > `Dormant`** — vi phạm
   lõi tồn tại là tuyệt đối; branch là nhánh đã tác giả hóa; substitute
   là fallback nhẹ nhất. Bất biến này áp dụng CẢ khi 1 event có nhiều
   premise bị phá cùng lúc với chính sách khác nhau (tie-break gốc) LẪN
   khi 1 event bị chạm bởi NHIỀU cascade độc lập trong cùng lượt (D.4) —
   trong cả 2 ca, kết quả PHẢI = mức nghiêm trọng cao nhất trong số các
   đề xuất, không phụ thuộc thứ tự xử lý.
5. **Phán quyết thuần cơ học — không AI**: premise là predicate trên
   world-state cơ học: `alive(X)`, `affinity(X) so ngưỡng`,
   `possesses(X, item)`, `location(X)`, `world_time`,
   `event_completed(E)`, `song_tu_active(X)`... Không lệnh gọi AI nào
   tham gia phán quyết (giữ `calls_per_turn ≤ 3`); AI chỉ nhận kết quả
   đã khóa (phá/thay vai/biến mất) để tường thuật — đúng Khế Ước Cơ
   Học/Tường Thuật.
6. **Phát hiện eager/lazy**: premise **không đảo được** sai (nhân vật
   chết, vật phẩm bị hủy, sự kiện upstream đã vanish) → khóa
   `canon_break_flag` **NGAY lượt đó** vào `locked_result`
   (`{event_id, premise bị phá, resolution}`) — người chơi thấy định
   mệnh gãy ngay khoảnh khắc gây ra nó. Premise **đảo được** (Hảo cảm,
   vị trí, sở hữu có thể lấy lại) → chỉ phán quyết tại thời điểm sự
   kiện đến hạn.
7. **Sự kiện đến hạn**: khi `trigger_condition=true` VÀ `world_time ≥
   earliest_world_time` → hệ này phán quyết trạng thái cuối (Canon
   nguyên bản / Substituted / Vanished / Branched) trong cùng lượt,
   khóa kết quả, phát cho Situation/Encounter Generation dựng tình
   huống tương ứng (interface đã hình thức hóa — hệ đó Designed +
   `/design-review` round 1 đóng cơ chế 2026-08-10; gỡ nhãn provisional
   2026-08-11, cascade từ round 2 bên đó).
8. **`breakthrough_requirement` data**: mỗi setting định nghĩa predicate
   cơ học theo tier (VD Đấu La: đã hấp thụ Hồn Hoàn phù hợp cho tier
   kế). Hệ này cung cấp evaluation `breakthrough_requirement_met(tier)`
   — đóng interface provisional mà `exp-realm-progression.md` Core Rule
   #6 chờ.
9. **`importance_score` cho World Memory (quyết định người dùng: định
   nghĩa ngay)**: hệ này sở hữu bảng trọng số tầm quan trọng theo loại
   fact (Formulas D.5); World Memory có thể chuyển key chọn fact từ
   recency thuần sang `(importance_tier giảm dần, world_time giảm dần)`
   — đúng khe cắm mà WM Formula #3 đã để ngỏ, không đổi cấu trúc công
   thức WM.
10. **Tuân thủ vòng đời lượt**: mọi thay đổi status sự kiện/
    `canon_break_flag` tuân Turn Manager Core Rule #8 — chưa final đến
    khi lượt xác nhận và không undo; undo hoàn tác cả phán quyết canon
    của lượt (trừ lượt chết thật vốn không undo được).

### States and Transitions

Mỗi canon event một instance:

| State | Điều kiện | Chuyển sang |
|---|---|---|
| Dormant | Trigger chưa thỏa hoặc chưa tới `earliest_world_time`; mọi premise lõi còn đúng | → Due (trigger + earliest thỏa) HOẶC → Suspended (premise `on_break=vanish` bị phá không-đảo-được — eager, `canon_break_flag` khóa ngay) HOẶC → Dormant-Modified (premise `on_break=substitute/branch` bị phá không-đảo-được — ghi flag, chờ đến hạn xử lý) |
| Dormant-Modified | Đã có premise bị phá vĩnh viễn, chính sách substitute/branch — sự kiện vẫn sẽ đến nhưng dạng biến thể | → Due (như Dormant) HOẶC → Suspended (nếu sau đó premise `on_break=vanish` khác cũng bị phá) |
| Suspended | Vai lõi bị trống (premise vanish đã phá vĩnh viễn) — sự kiện "treo", chờ người chơi cứu hoặc biến mất khi đến hạn. Cascade CHƯA chạy | → Dormant-Modified (người chơi cứu thành công qua `canon_role_rescue` — Rule #4b) HOẶC → Vanished (đến hạn mà vai lõi vẫn trống — cascade chạy TẠI ĐÂY) |
| Due | Đến hạn — phán quyết trong lượt hiện tại | → Resolved-Canon (mọi premise đúng) / Resolved-Substituted (rebind vai thành công) / Branched (kích hoạt sự kiện nhánh) / Vanished (tie-break tự động chọn vanish, hoặc substitute thất bại không còn ai đủ điều kiện) |
| Resolved-Canon / Resolved-Substituted / Branched / Vanished | Terminal — ghi vào World Memory dạng fact | (không chuyển tiếp; sự kiện downstream đọc qua premise `event_completed`) |

**Bảng trên là NGUỒN CHÂN LÝ cho mọi transition hợp lệ** (thêm
2026-08-08, `/design-review` vòng 1, đóng gap `systems-designer`+
`qa-lead` — cụm B1): bất kỳ pseudocode nào ghi `status(event)` (STEP 1,
STEP 1b, STEP 2 của D.6; cascade D.4) PHẢI đi qua hàm một-cửa
`transition_event_status` (xem D.6) — hàm đó enforce đúng bảng này +
severity lattice (Core Rule #4). `Suspended → Dormant-Modified` CHỈ hợp
lệ qua nhánh rescue (Rule #4b) — 1 cascade độc lập KHÔNG được phép ghi
đè `Suspended` thành `Dormant-Modified` (đây là bug đã đóng ở vòng 1,
xem D.4).

### Interactions with Other Systems

- **EXP & Realm Progression** (downstream, Designed): cung cấp
  `breakthrough_requirement_met(tier)` — predicate đánh giá mỗi lượt khi
  nhân vật ở Chờ Đột Phá. Đóng dependency HARD của GDD đó.
- **World Memory** (upstream + downstream, Designed): ĐỌC fact theo
  `entity_id` để đánh giá premise cần lịch sử; GHI `canon_break_flag`/
  kết quả sự kiện thành field trong `locked_result` (fact vĩnh viễn);
  CUNG CẤP bảng trọng số `importance_score` cho công thức chọn fact của
  WM.
- **NPC Affinity & Relationship** (upstream, Designed): đọc `affinity`,
  `song_tu_active`, cờ thù địch sâu sắc làm predicate premise (VD tiền
  đề "Tiểu Vũ chưa thuộc về ai" phá bằng quan hệ Song Tu).
- **Death & Consequence** (upstream, đã Approved 2026-08-09; đã hình
  thức hóa — gỡ nhãn provisional 2026-08-11, `/consistency-check`:
  interface nay đặc tả đầy đủ tại `death-and-consequence.md`): nguồn
  premise-break "chết" quan trọng nhất — sự kiện NPC chết kích hoạt
  kiểm tra eager mọi premise `alive(X)`.
- **Situation/Encounter Generation** (downstream, đã Designed — gỡ nhãn
  provisional 2026-08-11, cascade từ `/design-review` round 1-2 bên đó:
  cơ chế tiêu thụ Due/Resolved + `canon_role_rescue` + `location(X)` đã
  đặc tả đầy đủ trong GDD đó): tiêu thụ trạng thái sự kiện Due/Resolved
  để dựng tình huống đúng dòng canon; nhận `canon_outcome` narrative
  summary làm nguyên liệu.
- **Character Card & Identity** (downstream, đã Designed): đọc hồ sơ
  nhân vật nguyên tác — danh tính thật (major canon), trạng thái cải
  trang, hồ sơ tier.
- **Turn Manager / Mechanic-Narration Contract Enforcement** (upstream,
  hard): vòng đời lượt (deferred-commit, undo) + khóa mọi phán quyết
  trước tường thuật.

## Formulas

*(Đề xuất bởi `systems-designer`; người dùng chốt 2026-08-03: tie-break
tự động `vanish > branch > substitute` + cơ chế người-chơi-cứu-sự-kiện
(Suspended, Core Rule #4b). Mọi field trong `locked_result` là số
nguyên/boolean/enum; không AI call nào trong phán quyết.)*

### D.0 — Kiến trúc: `world_state` là adapter, không phải kho dữ liệu riêng

Hệ này **không lưu bản sao world-state của riêng nó**. `world_state`
trong mọi công thức là lớp truy vấn mỏng gọi thẳng interface đọc của hệ
sở hữu dữ liệu — đúng vai "trọng tài", không phải "chủ đất":

| Predicate | Hệ sở hữu thật | Interface đọc |
|---|---|---|
| `alive(X)` | Death & Consequence (đã Designed) | cờ boolean per-char |
| `affinity(X) so ngưỡng` | NPC Affinity & Relationship | `A_after` sau `resolve_turn_affinity` |
| `possesses(X, item)` | Equipment/Inventory | cờ sở hữu + cờ `destroyed` |
| `location(X)` | Situation Gen (Core Rule #7 bên đó — đặc tả đầy đủ, gỡ provisional 2026-08-11) | vị trí hiện tại |
| `world_time` | Turn Manager | `world_time_advancement` (registry) |
| `event_completed(E)` | **Chính hệ này** | `status(E)` — xem D.1 |
| `song_tu_active(X, npc)` | NPC Affinity | tập active (registry `song_tu_active`) |
| `custom_flag(flag_id)` | Hệ cơ học bất kỳ ghi flag vào `locked_result` | boolean, theo data setting-pack |

Mọi truy vấn là **O(1) trên state hiện tại**, không bao giờ quét lịch sử.

### D.1 — premise_satisfied(premise, world_state)

`premise_satisfied(premise, world_state) = EVAL[premise.type](premise.args, world_state)`

**Tập premise type chuẩn (8 loại) + tính đảo được** (quyết định
eager/lazy theo Core Rule #6):

| `type` | Predicate | Đảo được? | Lý do |
|---|---|---|---|
| `alive` | `alive(char_id) == true` | **KHÔNG** | Chết là chết thật (Anti-Pillar) — false thì false mãi |
| `affinity_at_least` | `affinity(npc_id) ≥ threshold` | **CÓ** | Hảo cảm lên xuống bình thường |
| `affinity_at_most` | `affinity(npc_id) ≤ threshold` | **CÓ** | Cùng lý do |
| `possesses` | `possesses(char_id, item_id) == true` | **CÓ, TRỪ KHI** `item.destroyed == true` | Sở hữu lấy lại được; vật phẩm bị hủy là trạng thái vĩnh viễn riêng |
| `at_location` | `location(char_id) == location_id` | **CÓ** | Di chuyển lại được |
| `event_completed` | `status(E) ∈ {Resolved-Canon, Resolved-Substituted, Branched}` (KHÔNG gồm Vanished) | **KHÔNG** | Status terminal — đúng thì đúng mãi; Vanished thì không bao giờ đúng nữa |
| `world_time_reached` | `world_time ≥ threshold` | **KHÔNG** | world_time monotonic |
| `song_tu_active` | `npc_id ∈ song_tu_relationship_active_npc_ids` (sửa tên biến 2026-08-08, `/consistency-check` sau `/design-review npc-affinity-relationship` vòng 2 — bản trước dùng tên cũ `active_song_tu_set(char_id)`; tham số `char_id` bỏ vì Song Tu LUÔN là player↔NPC (`exp-realm-progression.md` AC-46) — `char_id` ở premise này trước nay luôn ngầm định resolve về player, không có ca thực tế nào `char_id≠player`) | **CÓ** | Active ↔ Broken ↔ Active lại được |
| `custom_flag` | `flag(flag_id) == expected_value` | **Khai tường minh trong data**, mặc định `reversible=false` | An toàn hướng eager-check thay vì bỏ sót break |

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Loại premise | `premise.type` | enum | 8 giá trị trên | Loại predicate |
| Tham số | `premise.args` | struct | tùy type | VD `{npc_id, threshold}` |
| Tính đảo được | `reversible(premise.type)` | bool | {0,1} | Tra bảng — quyết định eager (false) hay lazy (true) |
| Kết quả | `premise_satisfied` | bool | {0,1} | Không có trạng thái "chưa biết" — mọi predicate đọc dữ liệu cơ học đã khóa |

**Output Range:** boolean. **Ví dụ 1** (đảo được): `{type:
affinity_at_least, npc_id: "duong_vu_dong", threshold: 60}` (đúng
`song_tu_threshold` registry), affinity=72 → true. **Ví dụ 2** (không
đảo được): `{type: alive, char_id: "tieu_vu"}`, Tiểu Vũ vừa chết →
false, `reversible=false` → break **eager** ngay lượt đó.

### D.2 — event_due(event) + thứ tự nhiều event cùng Due

```
is_due(event) = trigger_condition(event, world_state)
             AND world_time ≥ earliest_world_time(event)
             AND status(event) ∈ {Dormant, Dormant-Modified, Suspended}
resolution_order = sort(due_this_turn, key=(earliest_world_time ASC, event_id ASC))
```

Xử lý TUẦN TỰ theo `resolution_order` — "sự kiện lẽ ra xảy ra trước xử
lý trước", `event_id` (chuỗi, tăng dần) là tie-break ổn định cuối. NPC
đã được chọn làm substitute trong lượt bị loại khỏi pool của các event
Due sau trong CÙNG lượt (`substitutes_used_this_turn`) — một NPC không
thay vai 2 sự kiện trong 1 lượt.

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Điều kiện khởi phát | `trigger_condition` | bool | {0,1} | Predicate riêng của event (điều kiện KHỞI PHÁT — khác premises[] là điều kiện DUY TRÌ) |
| Mốc sớm nhất | `earliest_world_time` | int | [1,∞) | Data setting-pack |
| Tập Due lượt này | `due_this_turn` | set | 0 → số event active | Chặn trên bởi event ACTIVE — giảm dần theo thời gian chơi, quét O(active_events)/lượt |

**Output Range:** tập hữu hạn, không tăng theo world_time. **Ví dụ**: 2
event cùng `earliest_world_time=30` Due tại world_time=32 → tie-break
`event_id`: `"e03..." < "e07..."` → xử lý e03 trước; nếu e03 dùng
`npc_012` làm substitute thì e07 loại `npc_012` khỏi pool lượt này.

### D.3 — substitute_selection(role) — thuần cơ học, deterministic

```
eligible(c, role) = alive(c)
                 AND tier(c) ∈ [role.tier_min, role.tier_max]
                 AND (role.allowed_factions = ∅ OR faction(c) ∈ role.allowed_factions)
                 AND c ∉ role.excluded_ids
                 AND c ∉ substitutes_used_this_turn
fit_score(c, role) = |tier(c) − role.target_tier|
substitute_selection(role) = argmin over eligible của (fit_score, candidate_id)
```

Không RNG, không AI — cùng world_state chạy 1.000 lần ra đúng 1 kết
quả (phán quyết canon phải deterministic, khác `song_tu_action` vốn là
RNG). Pool rỗng → trả `NULL` → fallback theo ngữ cảnh gọi (Due:
Vanished; rescue: không cứu được). Cùng một hàm `eligible` dùng cho
kiểm tra đề cử của người chơi (Core Rule #4b).

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Khoảng tier vai | `role.tier_min/max` | int | 1–∞ | Data setting-pack |
| Tier lý tưởng | `role.target_tier` | int | 1–∞ | Thường = tier nhân vật gốc bị mất |
| Phe cho phép | `role.allowed_factions` | set\|∅ | data | ∅ = không giới hạn |
| Loại trừ | `role.excluded_ids` | set | data | VD loại người chơi khỏi vai phản diện |
| Độ ưu tiên vai | `role.priority` | int | 1–∞ (thấp = ưu tiên cao) | Bổ sung 2026-08-05, cụm F `/design-review` gộp 11 GDD — dùng bởi `canon_role_npcs`/D.6 tie-break của `situation-encounter-generation.md` (`(role.priority ASC, npc_id ASC)`); data setting-pack, KHÔNG phải tuning knob |
| Đã dùng lượt này | `substitutes_used_this_turn` | set | runtime, reset đầu lượt | Chặn double-booking (D.2) |
| Kết quả | `substitute_selection` | char_id \| NULL | — | NULL ⇒ fallback |

**Output Range:** char_id hợp lệ hoặc NULL — không có giá trị thứ 3.
**Ví dụ** (nhiều ứng viên bằng điểm): vai tier 2–4 (target 3), phe Vũ
Hồn Điện; `npc_004` (tier 3, fit=0) và `npc_012` (tier 3, fit=0) hòa →
tie-break id: chọn `npc_004`; `npc_099` (tier 3, sai phe) loại từ đầu.

### D.4 — cascade_vanish_check(event)

**Ràng buộc authoring bắt buộc**: đồ thị phụ thuộc "event B phụ thuộc
event A qua premise `event_completed(A)`" **PHẢI là DAG** — validate ở
bước load setting-pack (lỗi authoring, không phải runtime). **Bổ sung
2026-08-05** (đóng gap `/design-review` gộp 11 GDD): mọi event PHẢI có
`premises.length ≥ 1` — event `premises=∅` vi phạm Core Rule #4 ("không
tồn tại sự kiện bất khả xâm phạm", vì 0 premise khiến điều kiện "mọi
premise đúng" ở Bước 2 `resolve_turn_canon` vacuously true, event de
facto miễn nhiễm phá vỡ) — validate CÙNG bước load, cùng nhóm lỗi với
AC-38. Chỉ mục
ngược `downstream_index: event_id → [event phụ thuộc]` precomputed lúc
load — tra O(1), duyệt O(out-degree). **Bổ sung 2026-08-08
(`/design-review` vòng 1, đóng gap `qa-lead` — cụm B2)**: bước load
CŨNG tính `longest_path(downstream_index)` (O(V+E), 1 lần DFS trên DAG
đã validate acyclic) và TỪ CHỐI load nếu `longest_path >
CASCADE_MAX_DEPTH` — cùng nhóm lỗi AC-38. Lý do: `CASCADE_MAX_DEPTH` là
van an toàn RUNTIME (nhóm lỗi cấu hình/vận hành, xem Tuning Knobs);
content hợp lệ theo authoring KHÔNG BAO GIỜ được phép chạm van này —
validate tại load biến nó thành bất khả-kích-hoạt trong mọi content đã
qua kiểm, đúng triết lý "lỗi authoring, không phải lỗi runtime giữa
phiên chơi" mà Edge Cases đã tuyên bố cho các lỗi khác. **Đơn vị của
`longest_path` là SỐ CẠNH** (không phải số đỉnh) trên đường dài nhất —
cùng đơn vị với `depth` runtime (tăng đúng 1 mỗi lần đệ quy qua 1 cạnh
Vanished, làm rõ 2026-08-08 vòng 2, đóng gap `systems-designer` cụm C2):
với quy ước này, `depth` không bao giờ vượt `longest_path` của toàn đồ
thị khi content đã qua validate, VÀ guard `depth ≥ CASCADE_MAX_DEPTH`
nằm ở ĐẦU lời gọi — TRƯỚC khi xử lý cạnh nào của chính lời gọi đó — nên
ngay cả chuỗi tuyến tính ĐÚNG `CASCADE_MAX_DEPTH` cạnh (`longest_path ==
CASCADE_MAX_DEPTH`, PASS load) vẫn hoàn tất toàn bộ transition trước khi
van chạm ngưỡng (xem AC-22 ca biên mới).

**Bổ sung 2026-08-08 vòng 2** (`/design-review` vòng 2, đóng gap
`systems-designer` cụm B3): bước load CŨNG validate `resolution_order`
(D.2, khóa sort `(earliest_world_time, event_id)`) khớp hướng cạnh DAG
— với mọi cạnh `A→B` (B có premise `event_completed(A)`), yêu cầu
`(earliest_world_time(A), event_id(A)) < (earliest_world_time(B),
event_id(B))` theo đúng khóa sort mà `resolution_order` dùng để xử lý
tuần tự (so **cặp**, không chỉ `earliest_world_time` — vì tie-break thứ
2 `event_id ASC` cũng có thể tự đảo thứ tự nhân quả khi 2 event cùng
mốc thời gian). Lý do: nếu vi phạm, khi cả A và B cùng Due 1 lượt, STEP
2 (D.6) xử lý B TRƯỚC A theo `resolution_order` — premise
`event_completed(A)` của B đọc `status(A)` CHƯA terminal → đọc `false`
SAI → B có thể bị tie-break Vanished VĨNH VIỄN dù A ngay sau đó (cùng
lượt) sẽ Resolved-Canon. Không cơ chế nào trong STEP 1/STEP 2 tự sửa
được sai lệch này (STEP 1 chỉ chạm premise không-đảo-được đã
`touched_this_turn`, không chạm ca này — premise `event_completed` chỉ
đổi giá trị tại chính STEP 2). Cùng nhóm lỗi AC-38, `error_type` mới
`dependency_order_violation`.

**Ngữ nghĩa CẮT khi `depth ≥ CASCADE_MAX_DEPTH`** (thêm 2026-08-08 —
trước bản sửa này, AC-22 chỉ ràng buộc "không crash", KHÔNG ràng buộc
KẾT QUẢ sau khi cắt, để ngỏ 1 lỗ hổng im lặng): cắt = **DỪNG LAN TRUYỀN
EAGER**, KHÔNG PHẢI dừng phán quyết vĩnh viễn. Event ngoài độ sâu cắt
vẫn được D.6 STEP 2 đánh giá LAZY đúng lúc CHÍNH NÓ đến hạn (premise
`event_completed` của nó vẫn đọc `status` nguồn thật, không đọc trạng
thái "đã cắt"). Hệ quả DUY NHẤT của việc cắt: event đó **mất cửa sổ
Suspended sớm** (không được đẩy vào Suspended ngay khi cascade lẽ ra
chạm tới nó — chỉ được đánh giá tại Due của chính nó) — tức mất một
phần cơ hội cứu, một suy giảm có kiểm soát, chấp nhận được vì (a) đã
được validate KHÔNG xảy ra trong content hợp lệ (đoạn trên), (b) van an
toàn chỉ tồn tại phòng lỗi authoring bypass qua test hook (xem AC-22).

```
cascade_vanish_check(E, world_state, visited = ∅, depth = 0):   // CHỈ gọi khi E Vanished CHÍNH THỨC
  IF depth ≥ CASCADE_MAX_DEPTH: RETURN []              // van an toàn RUNTIME — log "cascade depth limit hit"
                                                         // (không nên kích hoạt trong content đã qua load-time validate)
  IF E.id ∈ visited: RETURN []                        // guard chống chu trình (log lỗi authoring, không crash)
  visited.add(E.id)
  affected = []
  FOR D IN downstream_index[E.id]:                     // đánh giá LIVE mỗi lần chạm D, KHÔNG snapshot đầu vòng
                                                         // (chốt 2026-08-08 vòng 2, đóng gap systems-designer cụm B2 —
                                                         // D có thể đã bị 1 nhánh đệ quy KHÁC của CÙNG lời gọi này
                                                         // đưa về terminal giữa chừng vòng lặp; xem "Diamond trong
                                                         // cùng 1 lời gọi" dưới pseudocode)
    IF status(D) ∉ {Dormant, Dormant-Modified, Suspended}: CONTINUE   // đã terminal hoặc đang Due — bỏ qua
    p = premise type=event_completed target=E.id của D
    // p không đảo được và giờ vĩnh viễn false (event_completed(E)=false vĩnh viễn, D.1)
    lock canon_break_flag_[D.id] = true                 // MỚI 2026-08-08 vòng 2 (đóng gap qa-lead cụm B1) — cascade
                                                         // LÀ 1 nguồn break eager, cùng cấp STEP 1/D.4 gốc; bản
                                                         // trước hàm này chỉ đổi status(D), không khóa flag, mâu
                                                         // thuẫn trực tiếp AC-22b/AC-30 vốn giả định field này tồn tại
    resolution = CASE p.on_break:
      vanish     → is_due(D) ? Vanished : Suspended    // còn cứu được nếu CHƯA đến hạn
      branch     → Dormant-Modified                     // (kích hoạt branch_target tại Due, không phải ở đây)
      substitute → Dormant-Modified                     // (rebind qua D.3 tại Due, không phải ở đây)
    transition_event_status(D, resolution, source = "cascade_from_" + E.id)   // MỘT CỬA — xem D.6,
                                                         // enforce severity lattice (Core Rule #4): nếu D đã
                                                         // bị 1 cascade KHÁC trong CÙNG lượt đề xuất mức nghiêm
                                                         // trọng cao hơn, transition_event_status GIỮ NGUYÊN mức
                                                         // cao hơn đó — affected ghi resolution THỰC SỰ áp dụng
                                                         // (có thể khác resolution vừa tính ở dòng trên)
    affected.append((D.id, applied_resolution(D)))
    IF applied_resolution(D) == Vanished: affected += cascade_vanish_check(D, world_state, visited, depth + 1)
  RETURN affected
```

DAG hữu hạn + visited-guard + `depth` cap → **luôn kết thúc**, độc lập
với việc `visited` có hiệu lực hay không (fan-out/diamond: nhiều cascade
độc lập có thể cùng chạm 1 event D — `visited` chỉ dedup theo "node đã
từng LÀ NGUỒN của 1 lời gọi cascade", KHÔNG chặn D bị ĐÁNH GIÁ nhiều lần
từ nhiều nguồn khác nhau, và điều đó ĐÚNG về mặt ngữ nghĩa — mỗi premise
của D thực sự gãy độc lập; cái mà `transition_event_status` chặn là GHI
ĐÈ sai, không phải đánh giá lại). `affected` chặn trên bởi tổng event
trong setting-pack (hàng chục ở Full Vision) — không tăng theo
world_time.

**Diamond trong CÙNG 1 lời gọi** (mới 2026-08-08 vòng 2, đóng gap
`systems-designer` cụm B2 — khác ca fan-out ở 2 lời gọi độc lập dưới
đây): nếu `downstream_index[E.id]` chứa cả D1 và D2, VÀ D1 cũng có cạnh
tới D2 (E→D1→D2 song song E→D2 trực tiếp — hợp lệ, vẫn là DAG), vòng
FOR có thể chạm D2 hai lần: 1 lần trực tiếp (E→D2), 1 lần gián tiếp qua
đệ quy vào D1 (D1→D2). Vì WHERE đánh giá LIVE (đoạn trên), lần chạm thứ
2 thấy `status(D2)` đã đổi từ lần đầu — nếu đã terminal (VD nhánh D1
đưa D2 tới Vanished), `CONTINUE` bỏ qua, không gọi lại
`transition_event_status`; nếu chưa terminal (VD nhánh D1 chỉ đưa D2
tới Dormant-Modified), lần thứ 2 vẫn gọi — Guard 2 (severity lattice)
phân xử đúng như ca fan-out. Guard 1 (write-once cho terminal) là lưới
an toàn cho ca terminal; severity lattice là lưới an toàn cho ca chưa
terminal — cả 2 cùng hoạt động, không guard nào thừa, và KHÔNG cần
`visited`-check riêng cho D (visited chỉ dedup theo nguồn cascade, đúng
như đoạn trên đã nêu).

**Ví dụ 2 tầng**: E1 "Tiểu Vũ hiến tế" Vanished chính thức → E2 "chiến
tranh trả thù" (premise `event_completed(E1)`, on_break=vanish, chưa
đến hạn) → Suspended (còn cứu được); nếu E2 sau đó Vanished → E3
(on_break=substitute) → Dormant-Modified, thử thay vai tại Due — cascade
dừng khi không còn Vanished mới.

**Ví dụ fan-out/diamond (mới 2026-08-08, đóng bug đã xác nhận
`systems-designer`+`qa-lead` — cụm B1)**: D có 2 premise
`event_completed` trỏ E1 (`on_break=vanish`) và E5 (`on_break=
substitute`), cả 2 Due cùng lượt và đều Vanished. `resolution_order`
(D.2) xử lý E1 trước (earliest nhỏ hơn) → `cascade_vanish_check(E1)`
đề xuất D=Suspended, `transition_event_status` CHẤP NHẬN (severity
Suspended > Dormant hiện tại của D) → D=Suspended. Sau đó
`cascade_vanish_check(E5)` đề xuất D=Dormant-Modified — nhưng
`transition_event_status` SO SÁNH severity: Dormant-Modified <
Suspended hiện tại → **TỪ CHỐI ghi đè, D giữ Suspended**. Đảo thứ tự
(E5 trước, E1 sau): E5 đề xuất D=Dormant-Modified trước (CHẤP NHẬN, vì
Dormant-Modified > Dormant) → E1 đề xuất D=Suspended sau → severity
Suspended > Dormant-Modified hiện tại → CHẤP NHẬN, ghi đè lên
Dormant-Modified. **Kết quả cuối GIỐNG NHAU ở cả 2 thứ tự: D=Suspended**
— đúng bất biến "outcome không phụ thuộc thứ tự xử lý". Xem AC-22b.

### D.5 — importance_score(fact) cho World Memory

Bảng trọng số rule-based THUẦN từ `field_name`/`field_value` của fact
(WM trích fact rule-based từ `locked_result` — tier phải suy ra được
không cần đọc world-state ngoài):

| `importance_tier` | Loại fact | Rule khớp |
|---|---|---|
| **3** | canon break / kết quả event, chết NPC | `canon_event_[id]_status` (terminal bất kỳ), `canon_break_flag_[id]=true`, `death_flag_[char]=true` *(provisional)* |
| **2** | đột phá tier, affinity swing lớn, rescue thất bại | `breakthrough_flag_[char]=true` *(provisional)*, `affinity_delta_[npc]` với \|value\| ≥ `AFFINITY_MAGNITUDE_TIER2`, `canon_rescue_failed_[event_id]` (mới 2026-08-08 vòng 2, đóng gap `systems-designer` cụm E — bản trước thiếu hàng này, field rơi mặc định Tier 0 dù được thiết kế RÕ RÀNG cho Competence/SDT ở Rule #4b, xem Dependencies) |
| **1** | combat outcome | `battle_result_[char]` *(provisional — Combat chưa đặt tên field enum outcome)* |
| **0** | delta thường | mọi field `has_signal=true` khác |

```
importance_tier(fact) = TIER_RULE(fact.field_name, fact.field_value)   // pure function, O(1)
selected_facts(entity_id) = top_K(facts(entity_id),
                                   key = (importance_tier DESC, world_time DESC, fact_id ASC),
                                   K = max_facts_per_entity)
```

*(Sửa 2026-08-06, `/design-review` vòng re-review 2 của
`world-memory-context-management.md`, `systems-designer`: bổ sung
`fact_id ASC` làm tie-break thứ 3 — bản trước chỉ 2 cấp, đã lệch so với
công thức nguồn thật của `entity_fact_selection` (World Memory Formula #3,
sở hữu công thức `top_K` này; D.5 chỉ cung cấp khe cắm `importance_tier`).
World Memory đã thêm tie-break này từ vòng review 2026-08-06 trước đó vì
tie ở `(importance_tier, world_time)` là trạng thái THƯỜNG XUYÊN (Formula
#2 của WM chủ đích sinh nhiều fact/lượt), không phải biên hiếm — thiếu
tie-break thứ 3, `top_K` không có total order, vi phạm tính deterministic.
D.5 ở đây trước bản sửa này mô tả LỖI THỜI công thức đã đổi ở nguồn — nay
đồng bộ lại.)*

Thay đúng khe cắm `key` của `entity_fact_selection` (WM Formula #3) —
cấu trúc `top_K` và bất biến `|selected| ≤ max_facts_per_entity` không
đổi. **Tương thích ngược**: mọi fact cùng tier → key suy biến thành
`(world_time DESC)` = recency thuần (hành vi WM hiện tại). **Ghi chú
proxy**: fact chỉ chứa delta (không có A_before/A_after) nên "vượt
ngưỡng affinity" phát hiện bằng BIÊN ĐỘ delta làm proxy — compromise có
chủ đích, không phải phát hiện ngưỡng chính xác 100%.

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Tên field | `fact.field_name` | string | quy ước entity_id WM | Input rule matching |
| Giá trị | `fact.field_value` | numeric\|bool\|enum | tùy field | Chỉ dùng magnitude |
| Ngưỡng biên độ tier 2 | `AFFINITY_MAGNITUDE_TIER2` | int (knob) | 10–25 | Mặc định 15 |
| Kết quả | `importance_tier` | int | {0,1,2,3} | Compact, rule-based |

**Ví dụ giá trị gia tăng**: entity "duong_vu_dong", K=3, pool 5 fact —
key recency cũ chọn 3 fact mới nhất, BỎ LỠ fact `canon_event_e07_status`
(wt=20, cũ nhất nhưng quan trọng nhất); key mới giữ canon (tier 3) +
betray -30 (tier 2) + fact mới nhất (tier 0) — "nhớ đúng cái đáng nhớ".

### D.5b — transition_event_status(E, proposed, source) — writer một cửa

*(Mới 2026-08-08, `/design-review` vòng 1, đóng gap `systems-designer`+
`qa-lead` — cụm B1. Trước bản này, `status(event)` bị ghi trực tiếp từ
4 nơi độc lập — STEP 1, STEP 1b, STEP 2 của D.6, và D.4 cascade — không
nơi nào biết nơi kia đã ghi gì trong CÙNG lượt, gây 2 bug xác nhận: ghi
đè sai thứ tự ưu tiên khi 2 cascade độc lập chạm cùng 1 event [D.4 ví
dụ fan-out/diamond], và nguy cơ resolve 1 event 2 lần [D.6 STEP 2].
Toàn bộ 4 nơi trên giờ PHẢI gọi qua hàm này, không được gán `status`
trực tiếp.)*

```
transition_event_status(E, proposed, source):
  IF is_terminal(status(E)):                          // Guard 1 — write-once cho status TERMINAL
    RETURN status(E)                                   // no-op + log "ignored: E already terminal this turn"
  current_severity = severity(status(E))
  proposed_severity = severity(proposed)
  IF proposed_severity < current_severity:              // Guard 2 — severity lattice (Core Rule #4)
    RETURN status(E)                                    // no-op + log "ignored: lower severity from " + source
  status(E) := proposed                                 // Guard 3 — write đúng 1 lần/lượt cho mỗi mức severity mới
  RETURN status(E)
```

`severity(status)`: **`Suspended`/`Vanished` = 3 > `Branched` = 2 >
`Dormant-Modified` = 1 > `Dormant` = 0** — khớp thứ tự tie-break Core
Rule #4 (vanish > branch > substitute), áp dụng CHO MỌI nơi ghi
`status`, không riêng nhánh Due. `canon_event_[E.id]_status` (field ghi
vào `locked_result`, STEP 4) chỉ đọc GIÁ TRỊ CUỐI CÙNG của `status(E)`
sau khi TOÀN BỘ pipeline lượt (STEP 1→1b→2, gồm mọi cascade đệ quy) đã
chạy xong — KHÔNG ghi field bên trong STEP 1/STEP 2/cascade (chữa vế
"ghi 2 lần" của bug double-resolve: field chỉ có ĐÚNG 1 cơ hội ghi/lượt,
tại STEP 4).

**Variables:**

| Variable | Symbol | Type | Range | Description |
|---|---|---|---|---|
| Sự kiện đích | `E` | event | — | Event đang được đề xuất đổi status |
| Status đề xuất | `proposed` | enum | {Dormant, Dormant-Modified, Suspended, Due, Resolved-Canon, Resolved-Substituted, Branched, Vanished} | Giá trị 1 writer muốn ghi |
| Nguồn đề xuất | `source` | string | tùy writer | Chỉ dùng cho log/debug, không ảnh hưởng logic |
| Độ nghiêm trọng | `severity(status)` | int | {0,1,2,3} cho non-terminal; terminal luôn thắng qua Guard 1 | Bảng tra cố định, KHÔNG phải tuning knob |

**Output Range**: `status(E)` sau khi gọi luôn là 1 trong 2 giá trị:
`proposed` (nếu Guard 1/2 đều pass) hoặc giá trị CŨ (nếu bị 1 trong 2
guard chặn) — không có giá trị thứ 3.

**Bất biến order-independence khi 2+ đề xuất CÙNG severity** (làm rõ
2026-08-08 vòng 2, đóng gap `systems-designer` cụm A — bảng severity
gộp `Suspended`/`Vanished` CÙNG mức 3, 2 enum khác nhau): khi 1 event
vừa là target Due vừa là target cascade cùng lượt (VD D Due VÀ có
premise trỏ 1 event vừa Vanished), order-independence KHÔNG đến từ số
severity (2 đề xuất có thể cùng bằng 3) mà từ **Guard 1** — sau khi D
bị ghi Vanished lần đầu (bất kể qua nhánh nào trước), `is_due(D)` tự
đổi vì `status(D) ∉ {Dormant, Dormant-Modified, Suspended}` không còn
đúng, nên "người thua" trong bất kỳ thứ tự xử lý nào cũng chỉ có thể đề
xuất lại đúng giá trị đã thắng — và Guard 1 (không phải Guard 2) chặn
ghi đè. Đây là bất biến TOÀN CỤC thứ 2 (bên cạnh severity lattice) mà
mọi implementation của `transition_event_status` phải giữ đúng — 2
guard bổ trợ, không guard nào thừa.

### D.6 — resolve_turn_canon(turn) — pipeline mỗi lượt

**Ràng buộc thứ tự trong lượt**: hệ này resolve **SAU**
Combat/Death & Consequence/NPC Affinity (cần `locked_result` của họ để
eager-check) và **TRƯỚC** `resolve_turn_exp` của EXP (EXP cần
`breakthrough_requirement_met` đầu vào — khớp Edge Case "đột phá trước,
EXP sau" của `exp-realm-progression.md`).

```
resolve_turn_canon(turn):
  // STEP 1 — Eager check tới fixpoint:
  WHILE có thay đổi:                          // "có thay đổi" = MỘT GIÁ TRỊ THỰC SỰ ĐỔI trong pass này
                                                // (canon_break_flag lật false→true, HOẶC status(E) đổi qua
                                                // transition_event_status) — KHÔNG PHẢI "nhánh IF được kích
                                                // hoạt" (chốt tường minh 2026-08-08, đóng gap systems-designer
                                                // cụm B3 — xem chứng minh hội tụ ngay dưới)
    FOR event chưa terminal, FOR premise không-đảo-được của event:
      IF touched_this_turn(premise, locked_results các hệ khác CÙNG lượt)   // O(1)
         AND NOT premise_satisfied(premise):
        lock canon_break_flag_[event.id] = true                              // eager, Core Rule #6
        on_break=vanish     → transition_event_status(event, Suspended, "eager_break")   // D.5b
        on_break=branch     → transition_event_status(event, Dormant-Modified, "eager_break")
        on_break=substitute → transition_event_status(event, Dormant-Modified, "eager_break")

  // STEP 1b — Người chơi cứu sự kiện (Core Rule #4b):
  IF classified_event(turn) == canon_role_rescue(event_E, char_C)            // nguồn: Situation Gen (char_C resolve qua
                                                                             // deterministic string-match, Core Rule #4 bên
                                                                             // đó — gỡ provisional 2026-08-11)
     AND status(E) == Suspended AND eligible(C, E.vacant_core_role):         // D.3, cơ học
    transition_event_status(E, Dormant-Modified, "rescue_success")           // hợp lệ theo bảng States (Suspended
                                                                               // → Dormant-Modified CHỈ qua nhánh này)
    lock canon_role_filled_[C] = true
  ELSE IF classified_event(turn) == canon_role_rescue(event_E, char_C)
       AND status(E) == Suspended:                                           // đề cử KHÔNG đạt eligible
    lock canon_rescue_failed_[E.id] = enum{dead, tier_out_of_range,
      wrong_faction, excluded, no_vacant_role} theo lý do eligible() thất bại // Rule #4b, đóng gap game-designer B4
    // status(E) KHÔNG đổi — không cứu, kết quả khóa trước narration (AI không quyết)
  // classified_event khác canon_role_rescue, hoặc event đích không Suspended → no-op cơ học (Edge Case)

  // STEP 2 — Phán quyết event Due theo resolution_order (D.2, snapshot ĐẦU STEP 2 — KHÔNG re-tính giữa chừng):
  FOR event IN resolution_order(due_this_turn):
    IF is_terminal(status(event)): CONTINUE                                  // Guard — event đã bị cascade từ 1 event
                                                                               // Due TRƯỚC nó (cùng resolution_order)
                                                                               // đưa về terminal rồi → SKIP, tránh
                                                                               // double-resolve (đóng gap
                                                                               // systems-designer cụm B1)
    Suspended + vai lõi còn trống → transition_event_status(event, Vanished, "due_suspended_expired") + cascade (D.4)
    mọi premise đúng             → transition_event_status(event, Resolved-Canon, "due_all_premises_ok")
    ELSE (≥1 premise sai, tie-break theo severity — Core Rule #4, D.5b):
      vanish  → transition_event_status(event, Vanished, "due_tiebreak") + cascade (D.4)
      branch  → transition_event_status(event, Branched, "due_tiebreak") + activate(branch_target)
      substitute → rebind mọi vai trống qua D.3 (tuần tự từng vai, cập nhật
                   substitutes_used_this_turn NGAY sau mỗi lần gắn — chặn 1
                   ứng viên bị gắn 2 vai của CÙNG 1 event, đóng gap
                   systems-designer);
                   NULL bất kỳ → transition_event_status(event, Vanished, "due_tiebreak") + cascade (D.4)
                   thành công → transition_event_status(event, Resolved-Substituted, "due_tiebreak"),
                                lock canon_role_filled_[npc]

  // STEP 3 — breakthrough_requirement_met cho nhân vật đang Chờ Đột Phá:
  setting thiếu định nghĩa tier → false CỨNG + log_warning "content gap"
  (phân biệt với "đã kiểm tra, chưa đủ điều kiện"); ngược lại →
  premise_satisfied(setting_pack.breakthrough_requirement[tier]); hand-off EXP.

  // STEP 4 — locked_result: {canon_break_flag_*, canon_event_*_status
  //          (đọc status(E) CUỐI CÙNG sau toàn bộ STEP 1→1b→2 kể cả
  //          cascade đệ quy — write-once, xem D.5b), canon_role_filled_*,
  //          canon_rescue_failed_* (mới, Rule #4b/B4)}
  // STEP 5 — TM Core Rule #8 tự động: mọi lock chỉ nằm trong locked_result
  //          của lượt; undo hoàn tác toàn bộ (status, flag, cascade). Lượt
  //          chết thật là is_death_turn → không undo (TM Core Rule #9).
```

**Chứng minh kết thúc STEP 1** (mới 2026-08-08, đóng gap
`systems-designer` cụm B3 — D.4 đã có tuyên bố tương đương, D.6 STEP 1
trước bản này thì không, một bất đối xứng tài liệu tự nó là lỗi): tập
giá trị STEP 1 có thể thay đổi chỉ gồm (i) `canon_break_flag_[event]`,
đơn điệu `false→true`, không bao giờ quay lại; (ii) `status(event)`, chỉ
đi theo chuỗi đơn điệu `Dormant → Dormant-Modified → Suspended` trong
phạm vi STEP 1 (cạnh quay lui duy nhất `Suspended → Dormant-Modified`
chỉ tồn tại ở STEP 1b, NẰM NGOÀI vòng WHILE này). STEP 1 chỉ đánh giá
premise loại KHÔNG-ĐẢO-ĐƯỢC: đã sai thì sai vĩnh viễn, không predicate
nào bật lại true trong lượt. Do đó mọi thay đổi đều đơn điệu trên 1
lattice hữu hạn chiều cao ≤ `3 × |events|` — vòng WHILE kết thúc sau tối
đa `3 × |events| + 1` vòng lặp. Điều kiện BẮT BUỘC để chứng minh này
đúng: `"có thay đổi"` PHẢI là giá trị-thực-sự-đổi (như đã chốt ở comment
pseudocode trên), KHÔNG PHẢI nhánh IF được kích hoạt — với ngữ nghĩa
nhánh-IF, 1 chu trình 2 event tự tham chiếu qua `custom_flag` (KHÔNG bị
DAG validation của D.4 chặn, vì đó chỉ validate đồ thị `event_completed`)
sẽ khiến vòng WHILE treo vô hạn thật. Van an toàn bổ sung (defense-in-
depth, cùng idiom `CASCADE_MAX_DEPTH`): `FIXPOINT_MAX_ITERATIONS` — xem
Tuning Knobs. *(Chu trình trong đồ thị `custom_flag` tự nó VÔ HẠI và
KHÔNG cần cấm ở DAG validation — monotonicity đã đủ đảm bảo hội tụ; cấm
nó sẽ áp thêm ràng buộc authoring không cần thiết lên chính cơ chế linh
hoạt nhất của setting pack.)*

**Schema field (quy ước entity_id cho WM):**

| Field pattern | Type | `entity_id` suy ra | Khi nào ghi |
|---|---|---|---|
| `canon_break_flag_[event_id]` | bool | `"global"` | Lần đầu 1 premise của event bị phá (eager hoặc tại Due) |
| `canon_event_[event_id]_status` | enum | `"global"` | Khi event đạt terminal status trong lượt |
| `canon_role_filled_[npc_id]` | bool | `[npc_id]` | Lượt NPC được gắn vai thay (tự động D.3 hoặc người chơi cứu #4b) |
| `canon_rescue_failed_[event_id]` | enum | `"global"` | Mới 2026-08-08 (Rule #4b/B4) — lượt có đề cử `canon_role_rescue` KHÔNG đạt eligible cho event Suspended; giá trị ∈ {dead, tier_out_of_range, wrong_faction, excluded, no_vacant_role} |

**Output Range:** số field/lượt chặn trên bởi (event active × premise +
số nhân vật Chờ Đột Phá + 1 field rescue-failed nếu có) — hữu hạn, không
tăng theo world_time.

**Ví dụ tổng hợp** (lượt 41, Tiểu Vũ vừa chết qua Death & Consequence):
Step 1 → `canon_break_flag_e01=true`, e01 (hiến tế) → Suspended. Người
chơi KHÔNG cứu trong các lượt sau; e01 đến hạn lượt 55 với vai lõi
trống → Vanished + cascade: e02 → Suspended (on_break=vanish, chưa đến
hạn), e03 giữ Dormant-Modified. `locked_result` lượt 55 =
`{canon_event_e01_status: "Vanished", canon_break_flag_e02: true}`.

**Ca biên đã kiểm** (nguồn cho Acceptance Criteria): (1) 2 event cùng
Due → tie-break D.2 + loại NPC đã dùng; (2) "premise vừa phá vừa hồi
trong 1 lượt" — không thể xảy ra theo cấu trúc (1 lượt = 1 delta
ròng/hệ, hệ này đọc SAU khi các hệ upstream khóa kết quả ròng); (3)
nhiều ứng viên bằng điểm → tie-break candidate_id; (4) cascade 2 tầng
dừng đúng khi gặp non-Vanished; (5) undo lượt có canon_break → TM
#8/#9; (6) event Due ngay lượt đầu (world_time=1) chạy đúng, không có
phép trừ âm; (7) breakthrough thiếu data tier → false cứng + warning
"content gap".

## Edge Cases

- **Nếu lượt có phán quyết canon (break/cứu/resolve) bị Undo**: TOÀN BỘ
  hoàn tác — status event quay về trước lượt (kể cả chuỗi cascade và
  trạng thái Suspended), `canon_break_flag`/`canon_role_filled` chưa
  từng tồn tại (Turn Manager Core Rule #8). Riêng lượt có cái chết thật
  (`is_death_turn=true`) không undo được (TM Core Rule #9) — canon
  break sinh từ cái chết là vĩnh viễn ngay lập tức.
- **Nếu nhân vật vừa được gắn vai thay (cứu/substitute) chết ở lượt
  sau**: vai đã gắn trở thành premise `alive(char mới)` với cùng chính
  sách `on_break` của vai gốc → event lại vào Suspended (nếu vanish) —
  người chơi có thể cứu tiếp bằng ứng viên khác. Không giới hạn số lần
  cứu.
- **Nếu người chơi đề cử nhân vật KHÔNG đủ điều kiện** (sai tier/phe/đã
  chết): không cứu được — kết quả phán quyết khóa trước tường thuật
  (`canon_rescue_failed_[event_id]` với lý do cụ thể, mới 2026-08-08
  Rule #4b/B4 — AI kể hành động diễn ra nhưng không ai lấp được vai,
  dựa trên LÝ DO cơ học đã khóa, không tự bịa). Người chơi được thử lại
  ở lượt khác, không giới hạn.
- **Nếu hành động được phân loại `canon_role_rescue` nhưng event đích
  không ở Suspended**: no-op cơ học — không field nào ghi, tường thuật
  vẫn diễn ra như hành động thường. Không phải lỗi.
- **Nếu premise `on_break=vanish` thuộc loại ĐẢO ĐƯỢC** (VD affinity)
  và sai tại thời điểm Due: Vanished ngay tại Due theo tie-break —
  KHÔNG có cửa sổ cứu (Suspended chỉ dành cho break eager từ premise
  không-đảo-được; premise đảo được còn cơ hội tự hồi cho đến đúng thời
  điểm phán quyết).
- **Nhân vật chính không bao giờ được TỰ ĐỘNG chọn làm substitute**
  (D.3): `role.excluded_ids` mặc định luôn chứa người chơi — thế giới
  không tự "bốc" người chơi vào vai canon; người chơi chỉ vào vai qua
  hành động chủ động của chính họ (agency, Pillar 1). Authoring có thể
  mở nếu event cụ thể cho phép.
- **Nếu setting pack không có event nào** (danh tác chỉ author luật thế
  giới): hệ vẫn chạy đầy đủ — `breakthrough_requirement` hoạt động,
  không phán quyết event nào, `resolve_turn_canon` trả locked_result
  rỗng. Hợp lệ.
- **Nếu setting pack có lỗi authoring** (đồ thị event có chu trình,
  premise trỏ char/item/event không tồn tại, breakthrough_requirement
  dùng predicate từ hệ chưa có nguồn, **premise thiếu khai `on_break`**
  [mới 2026-08-08, đóng gap game-designer B5 — không còn default], hoặc
  **đồ thị `event_completed` có longest path > `CASCADE_MAX_DEPTH`**
  [mới 2026-08-08, đóng gap qa-lead B2]): phát hiện ở bước LOAD pack
  (authoring-time validation) — từ chối load kèm danh sách lỗi
  (`{error_type, event_id|char_id|item_id, message}`, structured — xem
  AC-38), không phải lỗi runtime giữa phiên chơi.
- **Nếu save/load giữa chừng**: status mọi event (kể cả Suspended) là
  trạng thái bền → Persistence serialize trong state blob — event
  Suspended trước khi save vẫn Suspended sau khi load, cửa sổ cứu không
  mất; `substitutes_used_this_turn` là runtime reset mỗi lượt, không
  cần lưu.
- **Nếu nhân vật lớn nguyên tác (`is_major_canon`) chết**: đặc quyền
  xuyên không với nhân vật đó vẫn giữ trong lịch sử (Character
  Card/Nhật ký hiển thị đúng danh tính thật); mọi premise `alive` liên
  quan break eager như thường — KHÔNG có ngoại lệ "nhân vật quan trọng
  không thể chết" (Pillar 1: không ai được kịch bản bảo kê).
- **Nếu người chơi tự phá tiền đề rồi tự cứu trong cùng một lượt**:
  không thể — 1 lượt = 1 hành động; hành động gây break và hành động
  cứu là 2 lượt khác nhau (lượt gây break không thể đồng thời là lượt
  có classified_event = canon_role_rescue).
- **Nếu `trigger_condition` không bao giờ thỏa được nữa** (VD điều kiện
  phụ thuộc event đã Vanished): event ở Dormant vĩnh viễn — không lỗi,
  không rò rỉ; nó đơn giản không bao giờ Due. Tối ưu tùy chọn: đánh dấu
  "unreachable" khi mọi đường thỏa trigger đã đóng (không bắt buộc
  MVP).

### Interfaces công khai cho Situation/Encounter Generation

*(Bổ sung 2026-08-05, đóng gap cụm F `/design-review` gộp 11 GDD —
`situation-encounter-generation.md` D.4/D.6 tham chiếu các tên này
nhưng hệ đó chưa từng được định nghĩa chính thức ở đây.)*

- **`canon_due_payload(turn)`** — alias của kết quả
  `resolution_order(due_this_turn)` SAU KHI đã xử lý xong Bước 2 (Phán
  quyết event Due) của lượt đó:
  `canon_due_payload(turn).resolved_events = [event đã
  Resolved-Canon/Vanished/Suspended trong lượt turn, theo đúng thứ tự
  resolution_order]`. `null` nếu `due_this_turn` rỗng lượt đó.
- **`canon_role_npcs(location_id)`** — tập NPC đang gắn 1 vai
  (`canon_role_filled_[npc_id]=true`) thuộc bất kỳ event nào có
  `location_id` khớp và `status ∈ {Active, Due, Suspended}`. Kết quả sắp
  theo `(role.priority ASC, npc_id ASC)` khi cần cắt/tie-break (D.6 của
  `situation-encounter-generation.md`).
- **`rescue_window_final(event_id)`** — mới thêm 2026-08-08
  (`/design-review` vòng 1, quyết định người dùng Phương án B). Boolean,
  `= is_due(event)` (D.2, dùng lại nguyên công thức) đánh giá khi
  `status(event)==Suspended`, tại ĐẦU lượt (trước khi hành động lượt
  này được xử lý). TRUE ⇒ nếu người chơi KHÔNG gửi `canon_role_rescue`
  hợp lệ trong CHÍNH lượt này, sự kiện sẽ Vanished cuối lượt (STEP 1b
  luôn chạy trước STEP 2, D.6). Situation/Encounter Generation tiêu thụ
  cờ này làm CHỈ THỊ PROMPT cho `suggestion_call` (áp lực tường thuật
  "cơ hội cuối") — KHÔNG phải badge/timer UI, giữ nguyên UI Requirement
  #2. `false` (kể cả khi event không Suspended) là giá trị an toàn mặc
  định — không có "chưa biết".

## Dependencies

| System | Chiều | Bản chất giao diện | Hard/Soft |
|---|---|---|---|
| Turn Manager | Hệ này phụ thuộc | Vòng đời lượt: mọi phán quyết canon deferred-commit (Core Rule #8), `world_time` cho `event_due`/`world_time_reached` | Hard |
| Mechanic/Narration Contract Enforcement | Hệ này phụ thuộc | Mọi phán quyết (break/cứu/resolve/substitute) khóa vào `locked_result` trước tường thuật; AI nhận kết quả + `canon_outcome` summary, không quyết | Hard |
| World Memory & Context Management | 2 chiều | ĐỌC fact theo `entity_id` (premise cần lịch sử); GHI field `canon_break_flag_[event_id]`/`canon_event_[event_id]_status` (entity "global") + `canon_role_filled_[npc_id]` + `canon_rescue_failed_[event_id]` (entity "global", thêm 2026-08-08 vòng 2 — bản trước thiếu dòng này dù field đã tồn tại từ vòng 1) — khớp quy ước entity_id; CUNG CẤP `importance_tier` thay key chọn fact (khe cắm Formula #3 của WM) | Hard |
| NPC Affinity & Relationship | Hệ này phụ thuộc | Predicate `affinity_at_least/at_most`, `song_tu_active`, cờ thù địch sâu sắc | Hard (cho premise loại affinity) |
| Death & Consequence (đã Designed) | Hệ này phụ thuộc, provisional | Cờ `alive(X)` — nguồn premise-break eager quan trọng nhất; field `death_flag_[char]` (tên provisional) | Hard (hệ đó đã Designed) |
| Equipment & Skill Data / Inventory | Hệ này phụ thuộc | Predicate `possesses` + cờ `destroyed` (GDD equipment hiện chưa có cờ destroyed — cần đối chiếu, xem Open Questions) | Soft (chỉ event dùng premise possesses cần) |
| EXP & Realm Progression | EXP phụ thuộc hệ này | `breakthrough_requirement_met(tier)` — đóng dependency HARD của GDD đó; thứ tự trong lượt: canon resolve TRƯỚC EXP | Hard (chiều ngược) |
| Situation/Encounter Generation (đã Designed) | 2 chiều | NHẬN `canon_due_payload(turn)` + `canon_outcome` để dựng tình huống; CUNG CẤP phân loại `canon_role_rescue` từ hành động tự do + `location(X)` cho premise `at_location`; CUNG CẤP `canon_role_npcs(location_id)` + field `role.priority` cho D.4/D.6 của hệ đó | Hard (2 chiều, chốt 2026-08-05 — thay Soft, khớp phân loại thật của `situation-encounter-generation.md`) |
| Character Card & Identity (đã Designed) | Character Card phụ thuộc hệ này | Hồ sơ nhân vật nguyên tác: danh tính thật (`is_major_canon` → đặc quyền xuyên không), trạng thái cải trang, tier profile | Hard (chiều ngược) |
| Persistence/Save System | Persistence phụ thuộc hệ này | Serialize: status mọi event (kể cả Suspended), vai đã rebind; setting pack là data tĩnh không cần lưu | Hard (chiều ngược) |

## Tuning Knobs

| Knob | Default | Safe Range | Ảnh hưởng nếu chỉnh |
|---|---|---|---|
| `AFFINITY_MAGNITUDE_TIER2` | 15 | 10–25 | Tăng: chỉ swing cực lớn mới lên tier 2 — risk bỏ sót sự kiện cận ngưỡng. Giảm: loãng tier 2 |
| `CASCADE_MAX_DEPTH` | 20 | 5–50 | Safety valve — KHÔNG BAO GIỜ kích hoạt trong content hợp lệ (từ 2026-08-08, longest-path DAG validate tại LOAD, xem D.4/AC-38); quá thấp cắt cascade hợp lệ ở Full Vision (từ chối load thay vì cắt âm thầm) |
| `FIXPOINT_MAX_ITERATIONS` (mới 2026-08-08, đóng gap `systems-designer` cụm B3) | 100 | 20–200 | Safety valve cho vòng WHILE STEP 1 (D.6) — defense-in-depth, cùng idiom `CASCADE_MAX_DEPTH`. Chứng minh hội tụ (D.6) đã đảm bảo kết thúc trong ≤ `3×\|events\|+1` vòng với `\|events\|` MVP nhỏ; knob này chỉ chặn trường hợp implementation vi phạm định nghĩa "có thay đổi" (bug, không phải content) |

*(KHÔNG phải tuning knob: bảng reversibility 8 loại premise (D.1),
tie-break `(earliest_world_time, event_id)` (D.2), tie-break
`(fit_score, candidate_id)` (D.3), tie-break chính sách `vanish >
branch > substitute`, quy tắc tier D.5 — là quyết định thiết kế đã
khóa, đổi cần re-review. `earliest_world_time`/`tier_min/max`/
`target_tier`/`allowed_factions`/premise data là AUTHORING CONTENT
per-event trong setting pack, không phải knob toàn cục.)*

## Visual/Audio Requirements

Hệ data/luật — không asset riêng. Hai loại khoảnh khắc thuộc hệ này chạm
đúng "khẩu phần màu" của Visual Identity Anchor ("Mực Chưa Khô",
`game-concept.md`): **định mệnh gãy** (`canon_break_flag` — thay đổi
vĩnh viễn của thế giới → accent **đỏ son**) và **đột phá cảnh giới**
(`breakthrough_requirement_met` dẫn tới đột phá → accent **xanh ngọc**).
Chi tiết thể hiện (hiệu ứng mực, con dấu) chốt ở `/art-bible` — GDD này
chỉ khai 2 sự kiện này thuộc nhóm HIẾM được dùng màu accent, không thêm
sự kiện nào khác vào khẩu phần.

## UI Requirements

Hệ này không sở hữu màn hình riêng, nhưng định nghĩa 3 hành vi hiển thị
bắt buộc:

1. **Danh tính thật trên Character Card** (Character Card & Identity
   tôn trọng): NPC `is_major_canon=true` đang cải trang → thẻ hiển thị
   CẢ danh tính cải trang lẫn danh tính thật (đặc quyền xuyên không);
   NPC thường đang che giấu/dịch dung → thẻ chỉ hiển thị trạng thái
   "đang che giấu", KHÔNG lộ giá trị thật.
2. **Thông báo định mệnh gãy**: khi `canon_break_flag` khóa, người chơi
   phải NHẬN BIẾT được sự kiện định mệnh vừa gãy (qua tường thuật + tín
   hiệu thị giác đỏ son) — nhưng KHÔNG hiển thị event_id/data thô; sự
   kiện Suspended cần người chơi biết "còn cứu được" qua gợi ý tường
   thuật, không qua UI timer cơ học. **Quyết định người dùng 2026-08-08
   (Phương án B, `/design-review` vòng 1)**: quy tắc này GIỮ NGUYÊN
   nguyên văn — không thêm badge/timer/hộp thoại xác nhận nào, kể cả
   cho `is_major_canon` hay cho cửa sổ cứu sắp đóng. Thay vào đó, tầng
   cơ học cung cấp 2 tín hiệu MỚI làm CHỈ THỊ PROMPT (không phải dữ
   liệu hiển thị) để AI tự dựng áp lực bằng văn đúng lúc: cờ
   `rescue_window_final(event_id)` (Interfaces công khai, cuối Edge
   Cases) và field `canon_rescue_failed_[event_id]` với lý do cụ thể
   (Rule #4b). Rủi ro đã biết: chất lượng tín hiệu phụ thuộc prompt,
   thuộc tầng ADVISORY của AC-47 — không phải BLOCKING vì tầng cơ học
   (field/cờ) đã khóa deterministic, chỉ câu chữ diễn giải là
   non-deterministic.
3. **Không lộ số liệu canon trong tường thuật** (Contract Enforcement
   Core Rule #4): trạng thái event, premise, tier requirements chỉ thể
   hiện qua văn tường thuật do AI kể từ kết quả đã khóa.

📌 **UX Flag — Setting & Canon Integration**: hành vi 1–2 là input cho
UX spec Character Card + màn hình chính. Ở Phase 4 (Pre-Production),
chạy `/ux-design` trước khi viết epic — story tham chiếu UI trích
`design/ux/[screen].md`, không trích thẳng GDD này.

## Acceptance Criteria

*(Đề xuất bởi `qa-lead`. Hệ này thuần data/logic, không network, không
AI call trong phán quyết — phần lớn kiểm bằng unit test thuần; mọi hệ
ngoài (Death & Consequence, NPC Affinity, Inventory, Turn Manager,
Situation Gen, Persistence, narration) phải **inject** như tham
số/mock, không gọi hệ thật.)*

**Story Type**: Logic (data-driven state machine + pipeline formula) →
**BLOCKING** gate, test tự động bắt buộc tại
`tests/unit/setting-canon-integration/` (naming:
`setting_canon_[feature]_test.gd`, `test_[scenario]_[expected]`).

**Ghi chú test setup**: Trừ khi ghi chú khác, mọi AC dùng fixture
**setting pack tối thiểu** (3 NPC, 2–3 event, `breakthrough_requirement`
theo tier) + knobs default (`AFFINITY_MAGNITUDE_TIER2=15,
CASCADE_MAX_DEPTH=20`). Interface provisional (Situation Gen —
`classified_event`/`location`; Death & Consequence —
`alive`/`death_flag_*`; Character Card; Combat — `battle_result_*`)
đánh dấu `provisional-interface` trong file test, rà lại khi hệ đó được
thiết kế. Rule #9 phủ tại AC-23/24/25 (D.5), Rule #10 tại AC-32 (Edge
Undo).

### Core Rules

**AC-01** (Rule #1 — setting pack là nguồn chân lý): GIVEN 2 fixture
pack khác nhau (hồ sơ nhân vật/sự kiện/luật khác nhau), WHEN load từng
pack và truy vấn hồ sơ nhân vật, hồ sơ sự kiện, luật thế giới, THEN mọi
kết quả đúng theo data của pack đang load — đổi pack đổi kết quả, không
giá trị bối cảnh nào hard-code trong code. *(unit)*

**AC-02** (Rule #2 — đặc quyền xuyên không là THÔNG TIN, không đổi
world-state): GIVEN nhân vật `is_major_canon=true` đang mang bí danh và
1 NPC thường cũng đang cải trang, WHEN đọc interface hồ sơ cho
Character Card, THEN major canon trả `true_identity`; NPC thường chỉ
trả trạng thái "đang che giấu/dịch dung"; VÀ mock-spy xác nhận truy vấn
KHÔNG ghi field nào — cờ nhận diện của các NPC khác không đổi (họ vẫn
bị lừa) cho đến khi danh tính lộ qua diễn biến. *(unit + mock-spy,
provisional-interface)*

**AC-03** (Rule #3 — trigger_condition ≠ premises): GIVEN event có
`trigger_condition=false` nhưng mọi premise đúng và `world_time ≥
earliest`, WHEN đánh giá, THEN KHÔNG Due (trigger là điều kiện KHỞI
PHÁT); GIVEN trigger=true + world_time đủ nhưng 1 premise
`on_break=substitute` đã bị phá, THEN VẪN Due dạng biến thể (premise là
điều kiện DUY TRÌ, không chặn Due). *(unit)*

**AC-04** (Rule #4 — mọi event phá được, 3 chính sách `on_break`):
GIVEN 3 event mỗi cái 1 premise không-đảo-được với `on_break` lần lượt
`substitute`/`vanish`/`branch`, WHEN premise từng cái bị phá, THEN
status lần lượt → Dormant-Modified (rebind tại Due qua D.3) / Suspended
/ Dormant-Modified (tại Due kích hoạt `branch_target`); VÀ schema event
KHÔNG tồn tại thuộc tính "bất khả xâm phạm" nào (schema inspection).
*(unit)*

**AC-05** (Rule #4 — severity lattice `vanish > branch > substitute` LÀ
BẤT BIẾN TOÀN CỤC, không chỉ cục bộ Due; sửa 2026-08-08 vòng 1, đóng gap
`systems-designer`+`qa-lead` — cụm B1): GIVEN event Due với nhiều
premise bị phá cùng lúc, 3 tổ hợp chính sách: {substitute, branch},
{substitute, vanish}, {cả 3}, WHEN phán quyết tại Due, THEN kết quả lần
lượt Branched / Vanished / Vanished — bất kể thứ tự khai báo premise
trong data (unchanged từ bản trước). **MỚI**: GIVEN cùng 3 tổ hợp trên
nhưng đến từ 2 CASCADE ĐỘC LẬP (không phải Due trực tiếp — VD event D
có premise `event_completed(E1)` on_break=X và `event_completed(E5)`
on_break=Y, cả E1/E5 Vanished cùng lượt qua nhánh cascade riêng biệt),
WHEN chạy cả 2 thứ tự resolution_order (E1 trước hoặc E5 trước), THEN
`status(D)` cuối lượt GIỐNG NHAU Ở CẢ 2 THỨ TỰ = mức nghiêm trọng cao
nhất trong 2 đề xuất (spy assert `transition_event_status` từ chối ghi
đè khi severity thấp hơn). *(unit — property-based, 2 thứ tự đảo
ngược)*

**AC-06** (Rule #4b — cứu THÀNH CÔNG): GIVEN event E ở Suspended (vai
lõi trống), WHEN lượt có `classified_event=canon_role_rescue(E, C)` với
C qua đủ `eligible` D.3 (sống, tier trong khoảng vai, đúng phe, không
excluded), THEN E → Dormant-Modified, `canon_role_filled_[C]=true` nằm
trong `locked_result` ĐÚNG lượt đó; các lượt sau khi E đến hạn →
Resolved-Substituted (biến thể), KHÔNG Vanished. *(unit,
provisional-interface)*

**AC-07** (Rule #4b — cứu THẤT BẠI, khóa trước tường thuật, lý do cụ
thể; sửa 2026-08-08 vòng 1 (B4) VÀ vòng 2 (đóng gap `game-designer` cụm
D phụ — thêm biến thể thứ 5 khớp điều kiện `eligible()` vừa chốt đầy đủ
ở Rule #4b)): GIVEN E Suspended, đề cử C không đủ điều kiện (5 biến
thể: đã chết / sai tier / sai phe / thuộc `excluded_ids` / **C đã dùng
làm substitute cho 1 event KHÁC trong CÙNG lượt** [`substitutes_used_this_turn`,
MỚI vòng 2]), WHEN xử lý, THEN E VẪN Suspended, KHÔNG field
`canon_role_filled` nào ghi, NHƯNG `canon_rescue_failed_[E.id]` ghi
ĐÚNG enum lý do tương ứng (`dead` / `tier_out_of_range` /
`wrong_faction` / `excluded` / `no_vacant_role`) trong CÙNG
`locked_result`; VÀ mock-spy call-order xác nhận field này đã khóa
TRƯỚC `narration_call` — AI diễn giải lý do bằng văn nhưng không tự
quyết lý do. *(unit + mock-spy, provisional-interface)*

**AC-08** (Rule #4b + State Suspended — đến hạn Vanished, cascade đúng
THỜI ĐIỂM): GIVEN E Suspended từ lượt N, downstream D có premise
`event_completed(E)`, WHEN các lượt N+1..N+k−1 trôi qua không ai cứu và
E đến hạn tại lượt N+k, THEN assert TỪNG lượt trong khoảng: E giữ
Suspended và D hoàn toàn KHÔNG bị chạm (cascade CHƯA chạy khi
Suspended); đúng lượt N+k: E → Vanished VÀ cascade D.4 chạy ngay lượt
đó. *(unit)*

**AC-09** (Rule #5 — phán quyết thuần cơ học, 0 AI call): GIVEN 1 lượt
chứa đủ loại phán quyết (eager break + rescue + Due resolve có
substitute + cascade), WHEN `resolve_turn_canon` chạy trọn, THEN
mock-spy đếm lệnh gọi AI phát sinh bởi pipeline = 0 — không ảnh hưởng
budget `calls_per_turn ≤ 3`. *(unit + mock-spy)*

**AC-10** (Rule #6 — eager vs lazy): GIVEN event có premise `alive`
(không đảo) và premise `affinity_at_least` (đảo được), WHEN (a) NPC của
premise alive chết (mock locked_result D&C cùng lượt) THEN
`canon_break_flag_[event]` khóa NGAY lượt đó; (b) affinity tụt dưới
ngưỡng THEN KHÔNG break flag lượt đó — nếu hồi kịp trước Due →
Resolved-Canon; vẫn dưới ngưỡng tại Due → phán quyết tại Due. *(unit)*

**AC-11** (Rule #7 — Due phán quyết cùng lượt, đủ 4 terminal): GIVEN 4
fixture event dàn cho 4 kết cục, WHEN từng event đến hạn, THEN trạng
thái cuối Resolved-Canon / Resolved-Substituted / Vanished / Branched
khóa trong `locked_result` của CHÍNH lượt Due (không trễ lượt); payload
phát cho mock consumer Situation Gen chứa status + `canon_outcome`
narrative summary. *(unit, provisional-interface)*

**AC-12** (Rule #8 — `breakthrough_requirement` là data thuần): GIVEN 2
pack với `breakthrough_requirement[tier]` là predicate khác nhau, WHEN
gọi `breakthrough_requirement_met(tier)` trên cùng world-state, THEN
kết quả đúng theo data từng pack — code path không chứa logic
setting-specific nào (không string "Hồn Hoàn" hard-code; đối xứng với
exp-realm AC-11 phía tiêu thụ). *(unit)*

### Formulas

**AC-13** (D.0 — adapter O(1), không kho dữ liệu riêng): GIVEN mọi hệ
sở hữu inject dạng mock có spy, WHEN đánh giá từng loại predicate trong
bảng D.0, THEN mỗi truy vấn gọi ĐÚNG interface hệ sở hữu tương ứng; số
lệnh gọi tại lượt 5 và lượt 500 với cùng state là NHƯ NHAU (không quét
lịch sử — O(1)); VÀ đổi giá trị trong mock giữa 2 lần đọc → lần sau
thấy giá trị mới (không cache/bản sao stale). *(unit + mock-spy)*

**AC-14** (D.1 — semantics 8 loại premise): GIVEN table test từng loại,
THEN: `alive` ==true; `affinity_at_least` dùng ≥ (biên bằng ngưỡng →
true); `affinity_at_most` dùng ≤; `possesses` ==true; `at_location` ==;
`event_completed` chỉ true khi `status ∈ {Resolved-Canon,
Resolved-Substituted, Branched}` — **Vanished → false**;
`world_time_reached` dùng ≥; `song_tu_active` theo membership;
`custom_flag` so `expected_value`. Mọi kết quả boolean — không tồn tại
"chưa biết". *(unit)*

**AC-15** (D.1 — bảng reversibility quyết định eager/lazy): GIVEN tra
`reversible(type)` đủ 8 loại, THEN: `alive` KHÔNG;
`affinity_at_least/at_most` CÓ; `possesses` CÓ nhưng khi
`item.destroyed=true` → KHÔNG (break eager); `at_location` CÓ;
`event_completed` KHÔNG; `world_time_reached` KHÔNG; `song_tu_active`
CÓ; `custom_flag` mặc định `reversible=false` khi data không khai. VÀ
hành vi khớp: non-reversible sai → break NGAY lượt; reversible sai →
không break trước Due. *(unit — table test + nhánh destroyed,
provisional-interface cho destroyed)*

**AC-16** (D.2 — `is_due` là AND 3 điều kiện + status hợp lệ): GIVEN ma
trận (trigger, world_time, status), WHEN thiếu bất kỳ 1 trong 3, THEN
không Due; status terminal KHÔNG BAO GIỜ Due lại; Suspended CÓ THỂ Due
(để phán quyết Vanished tại hạn). *(unit)*

**AC-17** (D.2 — thứ tự nhiều event Due + chặn double-booking): GIVEN 2
event cùng `earliest_world_time=30` Due tại wt=32, WHEN xử lý, THEN
tie-break `event_id`: e03 trước e07; e03 chọn `npc_012` làm substitute
→ e07 loại `npc_012` khỏi pool CÙNG lượt; VÀ event `earliest=20` xử
trước event `earliest=30` bất kể id. *(unit — regression neo ví dụ)*

**AC-18** (D.3 — eligibility đủ điều kiện, biên bao gồm): GIVEN ma trận
ứng viên vi phạm đúng 1 điều kiện mỗi ca (chết / tier=tier_min−1 /
tier=tier_max+1 / sai phe khi `allowed_factions≠∅` / thuộc
`excluded_ids` / thuộc `substitutes_used_this_turn`), WHEN chạy
`eligible`, THEN từng ca bị loại; tier=tier_min và =tier_max ĐỀU hợp lệ
(biên bao gồm); `allowed_factions=∅` → mọi phe hợp lệ. *(unit)*

**AC-19** (D.3 — argmin + tie-break + NULL fallback theo ngữ cảnh):
GIVEN vai tier 2–4 target 3 với `npc_004`/`npc_012` cùng fit=0 và
`npc_099` sai phe, WHEN chọn, THEN `npc_004` (tie-break candidate_id);
GIVEN pool rỗng, THEN trả NULL không throw — NULL tại Due → Vanished +
cascade; NULL tại rescue → không cứu. *(unit — regression neo ví dụ)*

**AC-20** (D.3 — DETERMINISM bắt buộc): GIVEN world_state cố định với
pool ≥ 5 ứng viên (nhiều cặp đồng fit_score), WHEN chạy
`substitute_selection` 1.000 lần, VÀ chạy lại sau khi khởi tạo hệ với
thứ tự chèn dữ liệu khác (đảo insertion order chống phụ thuộc
dict/hash order), THEN toàn bộ các lần ra ĐÚNG 1 kết quả duy nhất —
không RNG, không phụ thuộc thứ tự duyệt. *(unit + property-based
seeded)*

**AC-21** (D.4 — DAG validation tại LOAD, từ chối chu trình): GIVEN
pack có chu trình `event_completed` (E1→E2→E3→E1), WHEN load, THEN TỪ
CHỐI load kèm thông báo nêu rõ chu trình — lỗi authoring-time, không
phải runtime; GIVEN pack DAG hợp lệ, THEN load thành công và
`downstream_index` precompute khớp 100% khai báo premise (đối chiếu 2
chiều). *(unit)*

**AC-22** (D.4 — cascade 2 tầng dừng đúng + guard; sửa 2026-08-08 vòng
1, đóng gap `qa-lead` B2 — bản trước KHÔNG có `depth` param trong
pseudocode dù chính AC này giả định nó tồn tại): GIVEN E1 Vanished
chính thức, E2 (`event_completed(E1)`, on_break=vanish, CHƯA đến hạn),
E3 (on_break=substitute), WHEN cascade chạy, THEN E2 → **Suspended**
(còn cửa cứu, KHÔNG Vanished), E3 → Dormant-Modified, đệ quy DỪNG;
biến thể: downstream đang Due tại thời điểm cascade → Vanished ngay +
đệ quy tầng kế; fixture chu trình cố ý (bypass validation qua test
hook) → visited-guard kết thúc + log lỗi authoring, không crash. GIVEN
fixture chuỗi TUYẾN TÍNH sâu 25 (bypass load-time depth validation qua
test hook — hành vi này KHÔNG reachable qua content đã load hợp lệ, xem
AC-38), WHEN cascade chạy với `CASCADE_MAX_DEPTH=20`, THEN đệ quy DỪNG
tại đúng depth=20 (spy đếm số lần `cascade_vanish_check` được gọi đệ
quy ≤ 20, không hơn) + log "cascade depth limit hit", KHÔNG crash; VÀ
event thứ 21 trong chuỗi (ngoài độ sâu cắt) KHÔNG bị đẩy Suspended sớm
bởi cascade — nhưng khi CHÍNH NÓ đến hạn (Due riêng, lượt sau), THEN nó
VẪN được phán quyết LAZY đúng theo premise thật (không đọc trạng thái
"đã cắt") — xác nhận ngữ nghĩa cắt = mất cửa sổ Suspended sớm, KHÔNG
mất phán quyết cuối cùng. *(unit — regression neo ví dụ)*

**AC-22d** (D.4 — ca biên ĐÚNG `CASCADE_MAX_DEPTH` cạnh: PASS load,
KHÔNG cắt mất transition nào tại runtime; mới 2026-08-08 vòng 2, đóng
gap `systems-designer` cụm C2 — làm rõ đơn vị `longest_path`=số cạnh):
GIVEN fixture chuỗi tuyến tính ĐÚNG `CASCADE_MAX_DEPTH` cạnh
(`longest_path == CASCADE_MAX_DEPTH == 20`, đi qua đường load BÌNH
THƯỜNG — KHÔNG bypass, vì `longest_path > CASCADE_MAX_DEPTH` là điều
kiện TỪ CHỐI nên `==` PASS), WHEN cascade chạy từ event gốc Vanished,
THEN TOÀN BỘ 20 cạnh của chuỗi được `transition_event_status` xử lý
đầy đủ (spy đếm đúng 20 lần gọi, không thiếu cạnh nào) — van
`depth ≥ CASCADE_MAX_DEPTH` chỉ chặn ở lời gọi thứ 21 (không tồn tại
trong chuỗi 20 cạnh), không cắt giữa chừng nội dung hợp lệ; đối chiếu
với AC-22 (chuỗi 25 cạnh, bypass load) để phân biệt 2 đường code:
AC-22d là content HỢP LỆ chạy trọn vẹn, AC-22 là content KHÔNG hợp lệ
bị van chặn. *(unit — regression neo ví dụ)*

**AC-22b** (D.4 — fan-out/diamond: 2 cascade độc lập cùng chạm 1 event,
mới 2026-08-08, đóng gap `systems-designer`+`qa-lead` — mirror AC-05
MỚI ở tầng cascade cụ thể): GIVEN event D có 2 premise
`event_completed` trỏ E1 (`on_break=vanish`) và E5 (`on_break=
substitute`), cả 2 Due cùng lượt và đều Vanished, WHEN chạy CẢ 2 thứ tự
`resolution_order` (E1 trước hoặc E5 trước — test cả 2 bằng cách đảo
`earliest_world_time`), THEN `status(D)` cuối lượt = **Suspended** Ở CẢ
2 THỨ TỰ (mức nghiêm trọng cao nhất giữa Suspended-từ-E1 và
Dormant-Modified-từ-E5); VÀ `canon_event_[D.id]_status`/`canon_break_flag_[D.id]`
chỉ xuất hiện ĐÚNG 1 lần trong `locked_result` của lượt đó, không 2 lần
dù D bị 2 cascade độc lập chạm. *(unit — property-based, 2 thứ tự đảo
ngược, quan trọng nhất trong lô sửa D.4)*

**AC-23** (Rule #9 + D.5 — bảng tier rules là pure function; thêm ca
tham số hóa 2026-08-08 vòng 1, đóng gap `systems-designer` — bản trước
chỉ neo 1 điểm dữ liệu tại default=15, một implementation hard-code
`>= 15` thay vì đọc knob vẫn PASS nguyên vẹn): GIVEN table test:
`canon_event_x_status` (terminal bất kỳ) → 3; `canon_break_flag_x=true`
→ 3; `death_flag_x=true` → 3 *(provisional)*; `breakthrough_flag_x=true`
→ 2 *(provisional)*; `affinity_delta_x` với |value|=15 → 2 và |value|=14
→ 0 (biên knob BAO GỒM, `AFFINITY_MAGNITUDE_TIER2=15` default);
`battle_result_x` → 1 *(provisional)*; field `has_signal` khác → 0, WHEN
tính `importance_tier`, THEN đúng bảng; VÀ spy xác nhận hàm CHỈ đọc
`field_name`/`field_value` — không truy vấn world-state ngoài (pure,
O(1)). GIVEN đổi `AFFINITY_MAGNITUDE_TIER2=10` (biên dưới Safe Range),
WHEN lặp lại đúng cặp biên `affinity_delta_x` |value|=10→2 và
|value|=9→0, THEN kết quả đúng theo knob MỚI — chứng minh implementation
đọc config, không hard-code 15. *(unit + mock-spy)*

**AC-24** (D.5 — top_K key mới, khớp ví dụ GDD): GIVEN entity
"duong_vu_dong", K=3, pool 5 fact như ví dụ (fact canon tier 3 tại
wt=20 CŨ NHẤT), WHEN chọn theo key `(importance_tier DESC, world_time
DESC, fact_id ASC)`, THEN giữ fact canon tier 3 + betray −30 (tier 2) +
fact mới nhất (tier 0); bất biến `|selected| ≤ max_facts_per_entity`
không đổi. *(unit — regression neo ví dụ)* *(Sửa 2026-08-06, `/design-review`
vòng re-review 2 của `world-memory-context-management.md`: thêm
`fact_id ASC` vào key, khớp bản sửa D.5 ở trên.)*

**AC-24b** (D.5 — tie-break `fact_id ASC` khi 2+ fact cùng `(importance_tier,
world_time)`, mới thêm 2026-08-06): GIVEN pool fact có ≥2 fact cùng
`importance_tier` VÀ cùng `world_time` (VD 1 turn có ≥2 field cùng ảnh
hưởng 1 entity, cùng tier suy ra từ D.5 — trạng thái THƯỜNG XUYÊN theo WM
Formula #2, không phải biên hiếm), WHEN chọn `top_K`, THEN `fact_id ASC`
(giá trị tăng đơn điệu theo thứ tự tạo fact) phân định thứ tự dứt điểm —
kết quả xác định (deterministic) bất kể cấu trúc dữ liệu implementation
dùng để lưu `facts(entity_id)`. *(unit — regression, mirror AC-14 của
`world-memory-context-management.md`)*

**AC-25** (D.5 — TƯƠNG THÍCH NGƯỢC bắt buộc): GIVEN pool fact trong đó
MỌI fact cùng `importance_tier` (cả 2 biến thể: toàn tier 0, toàn tier
3; pool sinh seeded kích thước ngẫu nhiên, `fact_id` phân biệt), WHEN chọn
top_K theo key mới và theo key recency thuần `(world_time DESC, fact_id
ASC)` của WM hiện tại, THEN 2 kết quả GIỐNG HỆT nhau — key suy biến đúng
thành recency (kèm tie-break `fact_id` khi `world_time` cũng trùng).
*(unit + property-based seeded)* *(Sửa 2026-08-06: key suy biến cũ chỉ
`(world_time DESC)` — thiếu tie-break sẽ không deterministic khi
`world_time` cũng trùng; nay khớp đúng "tương thích ngược" mà WM Formula
#3 mô tả.)*

**AC-26** (D.6 — ràng buộc thứ tự trong lượt): GIVEN pipeline lượt đầy
đủ với mock-spy call-order, WHEN lượt resolve, THEN
`resolve_turn_canon` chạy SAU khi Combat/Death & Consequence/NPC
Affinity đã khóa `locked_result` (eager-check STEP 1 đọc delta RÒNG của
họ CÙNG lượt — đồng thời chốt ca biên "vừa phá vừa hồi trong 1 lượt"
bất khả) và TRƯỚC `resolve_turn_exp`. *(unit + mock-spy)*

**AC-27** (D.6 STEP 1 — fixpoint + `touched_this_turn`): GIVEN event B
có premise `custom_flag` (reversible=false mặc định) trỏ vào field
`canon_break_flag_e01` mà chính STEP 1 sinh ra khi event A break, WHEN
A break trong lượt, THEN vòng WHILE lặp tới fixpoint — cả A VÀ B đều
break trong CÙNG lượt; VÀ premise không bị chạm lượt này
(`touched=false`) KHÔNG bị đánh giá lại (spy đếm số lần eval). *(unit +
mock-spy)*

**AC-27b** (D.6 STEP 1 — chu trình MUTUAL qua `custom_flag`, hội tụ
đúng bound; mới 2026-08-08, đóng gap `systems-designer` B3 — AC-27 chỉ
test chiều MỘT HƯỚNG A→B, chưa test ca 2 chiều A↔B): GIVEN event A có
premise `custom_flag` trỏ `canon_break_flag_e02` (của event B) VÀ event
B có premise `custom_flag` trỏ `canon_break_flag_e01` (của event A) —
2 event tự tham chiếu chéo qua `custom_flag` (KHÔNG bị DAG validation
D.4 chặn vì đó chỉ validate đồ thị `event_completed`), WHEN 1 nguồn
ngoài (VD `alive`) làm A break trong lượt, THEN vòng WHILE STEP 1 hội
tụ ĐÚNG sau tối đa `3×2+1=7` vòng lặp (chứng minh D.6) — cả A và B đều
`canon_break_flag=true`, VÀ số lần vòng WHILE lặp lại (spy đếm) ≤ bound
đó, KHÔNG chạm `FIXPOINT_MAX_ITERATIONS=100`; GIVEN implementation SAI
định nghĩa "có thay đổi" = "nhánh IF được kích hoạt" (bug giả lập bằng
patch trực tiếp điều kiện WHILE), THEN test này PHẢI FAIL (phát hiện
vòng lặp không hội tụ đúng bound, dù `FIXPOINT_MAX_ITERATIONS` vẫn chặn
crash) — test tồn tại chính để bắt đúng lớp bug này. *(unit — mirror
AC-22b/AC-31 của `ai-llm-integration-layer.md`, cùng idiom)*

**AC-28** (D.6 STEP 3 — content-gap: false CỨNG + warning phân biệt):
GIVEN nhân vật Chờ Đột Phá tại tier T mà pack KHÔNG định nghĩa
`breakthrough_requirement[T]`, WHEN STEP 3 chạy, THEN trả `false` cứng
+ log warning "content gap" — assert nội dung log; GIVEN tier CÓ định
nghĩa nhưng điều kiện chưa đủ, THEN trả `false` KHÔNG kèm warning — 2
code path phân biệt được. *(unit)*

**AC-29** (D.6 STEP 4 — schema field + kiểu giá trị): GIVEN lượt sinh
cả 3 loại field, WHEN Resolving hoàn tất, THEN đúng pattern
`canon_break_flag_[event_id]` (bool), `canon_event_[event_id]_status`
(enum), `canon_role_filled_[npc_id]` (bool), TẤT CẢ trong CÙNG 1
`locked_result` của đúng lượt; mọi giá trị là int/bool/enum — không
float/string tự do; số field/lượt ≤ (event active × premise + số nhân
vật Chờ Đột Phá). *(unit)*

**AC-30** (D.6 — REGRESSION TỔNG HỢP CỐ ĐỊNH lượt 41/55): GIVEN lượt 41
Tiểu Vũ chết (mock D&C), WHEN chạy tiếp tới lượt 55 không cứu, THEN:
`locked_result` lượt 41 chứa `canon_break_flag_e01=true`, e01 →
Suspended; các lượt 42–54: e01 giữ Suspended, KHÔNG field canon mới nào
sinh; lượt 55 (e01 đến hạn, vai lõi trống): e01 → Vanished + cascade —
e02 → Suspended, e03 giữ Dormant-Modified; `locked_result` lượt 55 =
`{canon_event_e01_status: "Vanished", canon_break_flag_e02: true}` —
ĐÚNG 2 field. Regression cố định — thay đổi fixture phải có chủ đích.
*(unit — regression cố định)*

**AC-31** (D.6 — Due ngay lượt đầu): GIVEN event `earliest_world_time=1`,
trigger=true từ đầu, WHEN lượt đầu tiên (world_time=1) resolve, THEN
event Due và phán quyết đúng ngay lượt đầu — không underflow. *(unit)*

### Edge Cases

**AC-32** (Undo + Rule #10 — hoàn tác TOÀN BỘ cascade + Suspended):
GIVEN snapshot X trước lượt N; lượt N chứa đồng thời: eager break →
Suspended, 1 event Vanished tại Due kéo cascade nhiều tầng, và 1
`canon_role_filled`, WHEN Turn Manager Undo lượt N (mock TM), THEN TOÀN
BỘ về ĐÚNG X: status MỌI event (kể cả chuỗi cascade và Suspended),
`canon_break_flag`/`canon_role_filled` chưa từng tồn tại — không
rollback một phần; VÀ GIVEN lượt có `is_death_turn=true` sinh canon
break từ cái chết, THEN không undo được (TM Core Rule #9) — break vĩnh
viễn ngay lập tức. *(unit + mock Turn Manager)*

**AC-33** (nhân vật thay vai chết ở lượt sau, cứu không giới hạn):
GIVEN E đã rebind vai lõi cho C, WHEN C chết lượt sau (mock D&C), THEN
vai trở thành premise `alive(C)` mang CÙNG chính sách `on_break` của
vai gốc → E lại Suspended; cứu lần 2 bằng C2 hợp lệ → lại
Dormant-Modified — không tồn tại giới hạn số lần cứu. *(unit)*

**AC-34** (thử lại rescue + rescue nhắm event không Suspended là
no-op): GIVEN (a) lượt M đề cử không hợp lệ, lượt M+2 đề cử hợp lệ →
cứu thành công (thử lại không giới hạn); (b) `canon_role_rescue` nhắm
event đang Dormant / Due / Resolved-Canon, WHEN xử lý, THEN (b) no-op
cơ học: KHÔNG field nào ghi, status không đổi, không lỗi. *(unit,
provisional-interface)*

**AC-35** (premise vanish ĐẢO ĐƯỢC: không có cửa sổ Suspended): GIVEN
event có premise `affinity_at_least` với `on_break=vanish`, affinity
dưới ngưỡng liên tục nhiều lượt TRƯỚC Due, WHEN kiểm từng lượt, THEN
event vẫn Dormant (không Suspended, không break flag); tại Due mà vẫn
dưới ngưỡng → Vanished NGAY tại Due, KHÔNG qua Suspended; hồi kịp
trước Due → Resolved-Canon. *(unit)*

**AC-36** (người chơi không bao giờ bị auto-chọn substitute): GIVEN
người chơi thỏa MỌI điều kiện và là ứng viên fit nhất, WHEN
`substitute_selection` tự động chạy, THEN người chơi KHÔNG được chọn
(`excluded_ids` mặc định luôn chứa player); GIVEN event authoring mở
tường minh → được chọn. *(unit)*

**AC-37** (pack không có event nào): GIVEN pack chỉ author luật thế
giới (0 event), WHEN load + chạy nhiều lượt, THEN load hợp lệ,
`resolve_turn_canon` trả locked_result rỗng mỗi lượt,
`breakthrough_requirement_met` hoạt động đầy đủ, không lỗi. *(unit)*

**AC-38** (authoring validation: dangling refs + predicate không
nguồn + `premises=∅` + `on_break` thiếu + cascade quá sâu + thứ tự phụ
thuộc sai; sửa 2026-08-08 vòng 1 (B2/B5) VÀ vòng 2 (đóng gap
`systems-designer` cụm B3 — thêm 1 loại lỗi mới): GIVEN pack có ĐỒNG
THỜI nhiều lỗi: premise trỏ char/item/event không tồn tại +
`breakthrough_requirement` dùng predicate từ hệ chưa có nguồn + 1 event
có `premises=∅` (bổ sung 2026-08-05) + 1 premise THIẾU khai `on_break`
(vòng 1, B5 — không còn default) + đồ thị `event_completed` có longest
path > `CASCADE_MAX_DEPTH` (vòng 1, B2) + 1 cạnh DAG `A→B` vi phạm
`(earliest_world_time(A), event_id(A)) < (earliest_world_time(B),
event_id(B))` (MỚI vòng 2, B3), WHEN load, THEN từ chối load kèm DANH
SÁCH ĐẦY ĐỦ mọi lỗi (không dừng ở lỗi đầu tiên) — mỗi lỗi là 1 object
structured `{error_type: enum{dangling_ref, missing_predicate_source,
empty_premises, missing_on_break, cascade_too_deep,
dependency_order_violation}, event_id|char_id|item_id, message:
string}` (spy assert trên `error_type` + id, không chỉ substring-match
trên free text). *(unit)*

**AC-38b** (`dependency_order_violation` cô lập; mới 2026-08-08 vòng 2,
đóng gap `systems-designer` cụm B3): GIVEN pack HOÀN TOÀN HỢP LỆ theo
mọi validate khác, NGOẠI TRỪ 1 cạnh DAG: event B có premise
`event_completed(A)` nhưng `earliest_world_time(B) < earliest_world_time(A)`
(B "xảy ra trước" A theo data dù B phụ thuộc A), WHEN load qua đường
validation BÌNH THƯỜNG, THEN từ chối load với `{error_type:
dependency_order_violation, event_id: B.id, message}` nêu rõ cặp
`(A.id, B.id)` vi phạm; GIVEN sửa `earliest_world_time(B) ≥
earliest_world_time(A)` (bằng nhau, tie-break `event_id` phân định),
THEN load thành công. *(unit)*

**AC-39** (save/load giữa chừng): GIVEN giữa phiên có e01 Suspended +
e02 Dormant-Modified + 1 vai đã rebind, WHEN serialize → deserialize
qua state blob (logic Persistence), THEN status mọi event và vai rebind
giữ NGUYÊN — Suspended vẫn Suspended, cửa sổ cứu không mất; VÀ
`substitutes_used_this_turn` KHÔNG nằm trong blob (runtime, reset đầu
lượt). *(unit + integration với logic Persistence)*

**AC-40** (`is_major_canon` chết: không bảo kê): GIVEN nhân vật lớn
nguyên tác chết (mock D&C), WHEN kiểm, THEN mọi premise `alive` liên
quan break EAGER như thường — không code path ngoại lệ "nhân vật quan
trọng"; VÀ interface hồ sơ VẪN trả `true_identity` cho Character
Card/lịch sử sau khi chết. *(unit)*

**AC-41** (tự phá tự cứu cùng lượt: bất khả theo SCHEMA của Turn
Manager, không phải cơ chế reject của hệ này; viết lại 2026-08-08 vòng
1, đóng gap `qa-lead` — bản trước mô tả HẬU QUẢ mong muốn mà không nêu
CƠ CHẾ/chủ sở hữu, hệ này không sở hữu code validate/reject cho bất
biến "1 lượt = 1 hành động"): GIVEN `turn.classified_event` là 1
trường DUY NHẤT (schema của `turn-manager.md`, không phải mảng/tập —
xem GDD đó), WHEN Setting & Canon Integration đọc `classified_event`
của 1 lượt, THEN về mặt CẤU TRÚC không tồn tại cách biểu diễn "vừa
canon_role_rescue vừa 1 loại khác" trong CÙNG 1 lượt — đây là hệ quả
TỰ ĐỘNG của schema 1-trường, KHÔNG PHẢI 1 nhánh reject runtime của hệ
này (schema inspection, không phải behavior test). *(unit — schema
assert, cùng phong cách AC-04's "schema inspection")* *(Ràng buộc thật
— 1 lượt = 1 hành động — thuộc phạm vi `turn-manager.md`; nếu GDD đó
chưa có AC tương đương khẳng định tường minh, route sang đó khi
`/design-review turn-manager.md` chạy lại.)*

**AC-42** (trigger không bao giờ thỏa được nữa): GIVEN event có trigger
phụ thuộc `event_completed(E)` với E đã Vanished, WHEN chạy 100 lượt,
THEN event giữ Dormant vĩnh viễn — không Due, không lỗi, không rò rỉ
(số event quét/lượt chặn trên bởi active events). *(unit)*

### Cross-System

**AC-43** (EXP — mock 2 chiều, thứ tự trước `resolve_turn_exp`): GIVEN
logic EXP tiêu thụ `breakthrough_requirement_met(tier)` qua mock 2
chiều, WHEN cùng lượt điều kiện đột phá vừa thỏa và pipeline chạy, THEN
spy call-order xác nhận STEP 3 của canon tính predicate TRƯỚC
`resolve_turn_exp`, EXP nhận đúng giá trị của CHÍNH lượt đó và đột phá
NGAY lượt (khớp Edge Case "đột phá trước, EXP sau" của exp GDD); đổi
mock predicate false/true → hành vi EXP đổi theo, không logic trùng lặp
ở phía EXP. *(integration với logic EXP, mock 2 chiều + mock-spy)*

**AC-44** (World Memory — fact extraction đúng `entity_id`): GIVEN
`locked_result` lượt 55 từ regression AC-30 + 1 lượt có
`canon_role_filled_npc_007=true`, WHEN đưa qua logic trích fact của WM
(Công thức #2), THEN `canon_event_e01_status` và `canon_break_flag_e02`
sinh fact `entity_id="global"`; `canon_role_filled_npc_007` sinh fact
`entity_id="npc_007"`; VÀ mọi `event_id`/`npc_id` trong fixture pack
pass validator quy ước đặt tên entity_id của WM. *(integration với
logic World Memory)*

**AC-45** (Contract Enforcement — khóa trước narration, không parse
ngược): GIVEN pipeline 1 lượt đầy đủ với `narration_call` mock, WHEN
kiểm bằng spy, THEN (a) call-order: MỌI field `canon_*` đã trong
`locked_result` TRƯỚC `narration_call`; (b) payload prompt chứa
`canon_outcome` summary + resolution đã khóa — không chứa gì cho phép
AI đảo phán quyết; (c) sửa `narration_text` trả về thành nội dung mâu
thuẫn hoàn toàn (VD "sự kiện vẫn diễn ra như nguyên tác" khi
status=Vanished) → status/flag KHÔNG đổi. *(unit + mock-spy)*

**AC-46** (NPC Affinity — premise đọc `A_after` cùng lượt): GIVEN
premise `affinity_at_least threshold=60`, NPC có `A_before=55`, lượt có
sự kiện đẩy `A_after=62` (mock NPC Affinity đã khóa delta +7), event
Due CÙNG lượt, WHEN canon resolve (SAU `resolve_turn_affinity` theo
AC-26), THEN premise đánh giá trên `A_after=62` → true →
Resolved-Canon — KHÔNG dùng `A_before`. *(unit + mock-spy)*

**AC-46b** (Situation/Encounter Generation — `rescue_window_final` tính
đúng; mới 2026-08-08 vòng 2, đóng gap `game-designer` cụm B — interface
công khai thêm ở vòng 1 chưa từng có AC riêng): GIVEN event E ở nhiều
trạng thái (Dormant, Dormant-Modified, Suspended CHƯA due, Suspended ĐÃ
due, Resolved-Canon), WHEN đánh giá `rescue_window_final(E.id)` tại đầu
lượt, THEN kết quả = `is_due(E)` (D.2) KHI VÀ CHỈ KHI `status(E) ==
Suspended`; MỌI trạng thái khác → LUÔN `false` (giá trị an toàn mặc
định — không có "chưa biết"), kể cả khi `is_due(E)` tình cờ đúng cho 1
event không Suspended. *(unit)*

**AC-46c** (Situation/Encounter Generation — `rescue_window_final`
THỰC SỰ tới payload `suggestion_call`; mới 2026-08-08 vòng 2, đóng gap
`game-designer` cụm B — mirror pattern mock-spy của AC-45 cho
`narration_call`, áp dụng cho `suggestion_call`): GIVEN E Suspended với
`rescue_window_final(E.id)=true` tại đầu lượt, WHEN hệ này build input
cho `suggestion_call` (mock Situation/Encounter Generation, có spy),
THEN spy xác nhận cờ `rescue_window_final` CÓ MẶT trong payload gửi đi
với đúng giá trị `true` cho event đó; GIVEN không event nào
Suspended-và-due, THEN payload không chứa cờ nào bật `true` cho field
này. Xem AC song sinh phía consumer:
`situation-encounter-generation.md` AC test field này thực sự được đọc
và ảnh hưởng chỉ thị prompt. *(unit + mock-spy, provisional-interface)*

### Non-automatable (FLAG — mô hình 2 tầng)

**AC-47** (Tường thuật nhánh rẽ — **KHÔNG test tự động được**): GIVEN
build chơi thật, các resolution đã khóa (Resolved-Canon / Substituted /
Branched / Vanished / rescue thất bại), WHEN đọc narration, THEN văn
bản nhất quán với phán quyết (Vanished không được kể như đã xảy ra;
Substituted kể biến thể với đúng nhân vật thay; rescue thất bại kể hành
động diễn ra nhưng vai không lấp). **FLAG: non-automatable** — kiểm
theo mô hình 2 tầng (finding `ai-narrative-test-evidence-gap`): tầng cơ
học (AC-01→AC-46) = Logic/BLOCKING; tầng narrative = ADVISORY — golden
scenario set ≥ 1 kịch bản/loại resolution, 2 lượt đánh giá độc lập, đạt
khi ≥ 90% consistent, evidence lưu `production/qa/evidence/`, re-run
khi prompt/model đổi. *(manual — ADVISORY)*

**AC-48** (Hiển thị đặc quyền xuyên không — manual, deferred): GIVEN
build thật có nhân vật major canon đang cải trang xuất hiện, WHEN mở
Character Card, THEN UI hiển thị danh tính thật (và "đang che giấu" cho
NPC thường). Tầng cơ học đã kiểm ở AC-02; tầng hiển thị thuộc Character
Card & Identity (đã Designed) — **FLAG: manual walkthrough** khi hệ
đó có UI, ADVISORY, deferred. *(manual — ADVISORY, deferred)*

**AC-49** (Character Continuation — container slot-scoped, đóng Open
Question BLOCKING của `character-continuation.md` D.1; thêm 2026-08-10,
`/design-review character-continuation.md` round 2, narrow verify pass —
Lớp B: `event_id` là ID CỐ ĐỊNH setting-pack-authored, không đổi giữa
các playthrough, cùng nguyên tắc `npc-affinity-relationship.md` AC-39 —
kỹ thuật "container rebind sang blob slot mới", KHÔNG đổi schema
`entity_id="global"` hiện có): GIVEN event `e01` ở status `Suspended`
(khác `Dormant`/`Pending` gốc, "làm bẩn" trước) ở slot A đang active,
WHEN Character Continuation hoàn tất "Chơi lại" (Persistence "Tạo slot
mới" → slot B, blob rỗng — mock), THEN hệ này ĐỌC blob active hiện hành
(slot B) khi truy vấn `status(e01)` — trả về `Dormant`/`Pending` gốc
theo authoring — KHÔNG PHẢI `Suspended` còn sót từ slot A (chứng minh hệ
này KHÔNG giữ 1 bản sao in-memory không rebind theo slot đang active của
Persistence). GIVEN sau đó slot A được mở lại qua "Xem lại slot đã khép"
(read-only), THEN `status(e01)` vẫn trả `Suspended` — 2 slot độc lập.
*(unit + integration, container rebind — KHÔNG đổi schema/AC-39 hiện
có, chỉ xác nhận điều kiện ĐỌC đúng blob active)*

## Open Questions

- **3 tên field provisional trong D.5** (`death_flag_[char]`,
  `breakthrough_flag_[char]`, `battle_result_[char]`) — cần đối chiếu
  khi Death & Consequence/EXP/Combat chốt schema `locked_result` thật
  của họ. *(Owner: systems-designer, target: `/design-system
  death-and-consequence` + `/consistency-check`)*
- **Phân loại `canon_role_rescue` từ hành động tự do** — **ĐÃ ĐÓNG
  2026-08-10/11** (ghi nhận cascade 2026-08-11): Situation/Encounter
  Generation Core Rule #4 đặc tả deterministic string-match (0 AI call),
  khớp 0/≥2 tên hạ `rp_only` có kiểm soát — xem GDD đó + AC-40b bên đó.
  Giữ bullet làm vết lịch sử.
- **Cơ chế "ngừng cải trang giữa truyện" cho Alpha** (mới 2026-08-11,
  cascade từ Open Question #11 của `character-card-identity.md`): MVP
  cam kết alias list TĨNH per setting pack (Core Rule #2 — không content
  MVP nào có nhân vật ngừng cải trang). Nếu Alpha cần diễn biến này, hệ
  NÀY phải sở hữu 1 cờ/trạng thái runtime (per char, per alias) + writer
  tường minh + serialize vào blob của hệ này (phá giả định "setting pack
  là data tĩnh không cần lưu" ở Dependencies — cần sửa đồng thời), và
  Character Card D.2 đổi nguồn `disguise_active` từ suy diễn alias-list
  sang đọc cờ này. *(Owner: hệ này + Character Card, target: khi
  authoring content Alpha đầu tiên có nhân vật ngừng cải trang)*
- **Cờ `destroyed` cho vật phẩm** — premise `possesses` cần nhưng
  `equipment-skill-data-system.md` (**Approved**) chưa có. **Nâng mức
  2026-08-08** (`/design-review` vòng 1, `creative-director`): vì hệ sở
  hữu đã Approved, đây không phải backlog note đơn thuần mà là MỞ LẠI 1
  tài liệu Approved — cần `producer` điều phối theo Coordination Rule
  #4, không tự ý sửa. **Ràng buộc MVP tạm thời** (đối xứng với cách xử
  lý `location(X)` bên dưới): MVP KHÔNG author premise loại `possesses`
  cho tới khi cờ `destroyed` được bổ sung — premise `alive`/
  `affinity_at_least`/`event_completed`/`custom_flag` đã đủ cho 2-3
  event MVP. *(Owner: producer + systems-designer, target: trước
  `/create-architecture`)*
- **Authoring 2–3 canon event MVP cho Đấu La Đại Lục** (event nào?
  premises/roles cụ thể?) + `breakthrough_requirement` cho các tier
  MVP — authoring content, quyết định giá trị thật. **2 ràng buộc mới
  cho rubric authoring** (thêm 2026-08-08, đóng gap `narrative-director`
  + `game-designer` cụm ND-1/ND-2, xem review log): (a) **≥1 event MVP
  PHẢI dùng `on_break=vanish` trên 1 premise KHÔNG thuộc phạm trù quan
  hệ tình cảm** (VD chính trị/quân sự/lãnh thổ) — tránh đỉnh Player
  Fantasy tầng 2 chỉ đạt được qua đòn bẩy lãng mạn (ví dụ Tiểu Vũ xuyên
  suốt GDD); (b) **setting pack MVP PHẢI có ≥1 NPC `is_major_canon=
  false` đang che giấu danh tính** — để nhánh "đang che giấu, không lộ
  giá trị thật" của UI Requirement #1/AC-02 thực sự chạy trong game
  thật (roster MVP chỉ 3 NPC — nếu toàn bộ là major canon, đặc quyền
  xuyên không lấn át hoàn toàn Discovery ngay trong MVP, không chỉ Full
  Vision). **Hướng dẫn authoring (thêm 2026-08-08 vòng 2, đóng gap hội
  tụ độc lập `game-designer`+`narrative-director` — cả 2 specialist
  audit riêng biệt cùng kết luận)**: với ngân sách 3 NPC (1 thù địch, 1
  hảo cảm/Song-Tu preset, 1 trung lập theo `game-concept.md`), KHÔNG có
  chỗ cho nhân vật thứ 4 — (a) và (b) nên GỘP vào CÙNG 1 NPC, ưu tiên
  NPC thù địch (không phải đối tác Song Tu): 1 NPC vừa là mỏ neo cho
  premise vanish chính trị/quân sự, vừa là nhân vật che giấu danh tính
  thật lộ ra chính qua sự kiện đó — không cần tác giả tưởng nhầm cần
  thêm nội dung. Gợi ý cụ thể (không bắt buộc, `narrative-director`):
  Event 1 "Tiểu Vũ Hiến Tế" (đỉnh dạng A — chủ động) + Event 2 "Chiến
  Tranh Trả Thù" (đỉnh dạng B — bi kịch thụ động, thỏa (a)+(b) trên
  CÙNG NPC thù địch) + Event 3 tùy chọn (`on_break=substitute`, không
  bắt buộc cho MVP). *(Owner: narrative-director + world-builder,
  target: trước vertical slice)*
- **`location(X)` chưa có hệ sở hữu** — premise `at_location` chỉ dùng
  được khi Situation Gen định nghĩa mô hình vị trí. MVP có thể né bằng
  cách không author premise loại này (cùng dạng ràng buộc tạm thời với
  `possesses` ở trên). *(Owner: systems-designer, target:
  `/design-system situation-encounter-generation`)*
- **Playtest rubric với ≥2–3 tình huống canon khác nhau** (mitigation
  cờ HIGH-RISK từ systems-index) — rubric đã tổng quát hóa trong Core
  Rule #4/#4b nhưng chưa playtest thật. *(Owner: qa-lead +
  game-designer, target: vertical slice)*
- **Tín hiệu stakes trước-khi-cam-kết cho nhân vật lớn** (`narrative-director`
  ND-3, đã được Phương án B — chỉ thị tường thuật — giải quyết ở tầng
  cơ học cho rescue; câu hỏi hẹp hơn còn mở: 1 trận combat thường có
  thể giết `is_major_canon` và kéo theo cascade nhiều nhánh — hiện
  KHÔNG có tín hiệu nào trước khi cam kết trận đấu đó, chỉ có thông báo
  SAU khi flag khóa, UI Requirement #2). Quyết định người dùng đã chốt
  giữ nguyên info-only sau-sự-kiện (Phương án B áp dụng chung) — không
  cần sửa gì thêm, ghi lại để không tranh luận lại. *(Closed — quyết
  định người dùng 2026-08-08)*

**Backlog test coverage — vòng 2 (2026-08-08), ghi lại theo khuyến nghị
`creative-director`, KHÔNG viết AC thật cho tới trước-khi-implement:**

- **AC-22c (D.4 — bit-identical TOÀN BỘ `locked_result`, không chỉ
  `status(D)` đơn lẻ)**: AC-22b hiện chỉ so `status(D)` giữa 2 thứ tự
  `resolution_order` đảo ngược — mở rộng so sánh TOÀN BỘ field
  (`canon_break_flag_*`, `canon_event_*_status` của MỌI event bị chạm,
  không chỉ D) giữa 2 lần chạy. *(Owner: qa-lead, target: trước viết
  unit test D.4)*
- **AC-38c (D.4/load — chuỗi tuyến tính sâu 25 KHÔNG bypass → từ chối
  tại LOAD)**: AC-38 hiện chỉ test `cascade_too_deep` gộp chung nhiều
  lỗi; AC-22's fixture sâu-25 CHỦ ĐÍCH bypass load-validation (test hành
  vi cắt runtime, đường code khác). Cần 1 AC cô lập: pack hợp lệ 100%
  NGOẠI TRỪ đúng chuỗi sâu 25, đi qua đường load bình thường, từ chối.
  *(Owner: qa-lead, target: trước viết unit test D.4)*
- **AC-47b + mở rộng AC-47 (golden scenario "rescue thất bại 2 lần liên
  tiếp cùng event" + phân biệt valence cảm xúc "bi kịch có ý nghĩa" vs
  "bất công/lỗi")**: AC-47 hiện quá generic (≥1 kịch bản/loại
  resolution); cần 1 kịch bản CỤ THỂ cho ca 2-lần-liên-tiếp (đóng đúng
  finding gốc `game-designer` vòng 1 về Competence/SDT — người chơi cần
  nói đúng lý do TỪNG lần, không chỉ biết "đã thất bại"), VÀ phân biệt
  liệu tường thuật "bi kịch thụ động" (dạng B Player Fantasy) đọc như
  khoảnh khắc có ý nghĩa hay như bất công/lỗi. *(Owner: qa-lead +
  game-designer, target: golden scenario set trước vertical slice)*
- **`on_break=substitute` khai NHẦM (khác thiếu khai)**: giới hạn cố
  hữu của schema hiện tại — D.3 chủ đích không có chiều tính cách/quan
  hệ để bảo vệ AC-20 determinism, nên không cơ học hóa được việc cảnh
  báo "vai này lẽ ra nên `vanish` nhưng tác giả khai `substitute`".
  Không thêm AC; ghi nhận là rủi ro authoring thuần túy, review thủ công
  khi author content thật. *(Owner: narrative-director, target: review
  thủ công lúc authoring 2-3 event MVP)*
- **Dạng (B) Player Fantasy — "bi kịch thụ động" là khoảnh khắc dùng-một-lần
  với roster 3 NPC**: sau lần đầu người chơi vô tình phá 1 premise
  không-đảo-được, họ đã học được luật — tai nạn tiếp theo không còn là
  bất ngờ thuần túy, trôi gần dạng (A). Tracked risk, không blocking;
  rà lại khi roster mở rộng ở Full Vision. *(Owner: game-designer,
  target: rà lại khi mở rộng roster NPC)*
- **Thứ tự `narration_call` cuối lượt vs. tín hiệu foreshadowing cho
  dạng (B)**: câu hỏi kỹ thuật hẹp (`narrative-director` vòng 2) — liệu
  AI viết trận combat thường có "biết trước" NPC đối thủ gắn vai canon
  quan trọng hay hoàn toàn không, ảnh hưởng build-up giọng văn. Route
  sang `systems-designer`/`lead-programmer` khi `/create-architecture`
  chạy, không phải quyết định narrative. *(Owner: systems-designer,
  target: `/create-architecture`)*
