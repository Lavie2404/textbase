# Review Log: Persistence / Save System

## Review — 2026-08-06 — Verdict: NEEDS REVISION → sửa cùng phiên (không re-review panel)
Scope signal: XL
Specialists: `game-designer`, `systems-designer`, `godot-specialist`, `qa-lead`, `ux-designer` + `creative-director` (senior synthesis)
Blocking items: 12 | Recommended: 9 | Nice-to-have: 4
Summary: Full-mode `/design-review` (5 specialist song song + creative-director tổng hợp). Finding trung tâm: 3 specialist độc lập (`game-designer`, `ux-designer`, `godot-specialist`) hội tụ về cùng 1 mâu thuẫn gốc — Core Rule #1 tuyên bố khoảng lệch "Turn Confirmed hiển thị vs dữ liệu bền vững thật" đã bị xóa sổ, trong khi Visual/Audio Requirements + chính Core Rule #3 tự thừa nhận khoảng lệch đó có thể vẫn tồn tại (đặc biệt qua `syncfs()` bất đồng bộ hoặc Threaded Web export/`Atomics.wait()`). Các finding khác: vòng lặp retry đốt AI call thật khi quota đầy không tự hết (`game-designer`); 2 bug/mâu thuẫn số học trong Formula #1/#2 (`systems-designer`); 5 rủi ro kỹ thuật Web export cần spike xác minh (`godot-specialist`); Core Rule #5 (không tự xóa slot đã khép) không có AC bảo vệ + AC-29 tự mâu thuẫn với Core Rule #3 (`qa-lead`); mâu thuẫn trực tiếp "mực loang" vs `core-ui-screen-navigation.md` §4 (đã xác minh độc lập bằng đọc file trực tiếp) + core-ui UI Requirements S1 lỗi thời + rủi ro chuẩn hóa chuỗi IME tiếng Việt (`ux-designer`). Creative-director nâng 1 finding từ Recommended lên Required (export/Core Rule #9 dễ đặt sai kỳ vọng "backup") và phân định rõ "doc-blocking" (sửa được ngay) vs "ADR-blocking" (chỉ spike đóng được).

Toàn bộ 12 mục Required đã được sửa cùng phiên (không chạy thêm vòng panel), theo 4 quyết định user: (1) posture bền vững = C — chặt về hợp đồng (`durability_confirmed`), hiện thực bằng chiến lược append-only; (2) export "Chép lại quyển sổ" reframe thành nghi thức lưu niệm, không phải backup; (3) giữ cơ chế gõ lại tên nhân vật để xác nhận xóa, bổ sung chuẩn hóa NFC/trim/case-insensitive; (4) chấp nhận đây là vòng panel đối kháng cuối cùng — bước tiếp theo là spike kỹ thuật (`docs/engine-reference/godot/modules/web-export.md`) trước khi vào ADR, không phải thêm 1 vòng `/design-review` văn bản.

File đã sửa: `persistence-save-system.md` (chính — Core Rule #1/#3/#9, Formula #1/#2, Error Taxonomy, Edge Cases, Tuning Knobs, Visual/Audio Requirements, AC-01/18/19/26/29 + AC-31/32/33 mới, Open Questions), `core-ui-screen-navigation.md` (UI Requirements S1 — đồng bộ 3 trạng thái slot + hành động export + 2-tier xác nhận xóa), `game-concept.md` (Technical Risks — bổ sung ràng buộc CSP/Threaded Web export), `turn-manager.md` (Edge Cases — đồng bộ cơ chế retry-chỉ-ghi).

Prior verdict resolved: First review (không có review log trước đó, dù GDD đã tự chứa nhiều annotation "sửa 2026-08-06" từ các vòng chỉnh sửa không chính thức trước đó cùng phiên).

Trạng thái sau vòng này: **Designed — Revised**, KHÔNG chuyển Approved — 12 mục Required đã đóng ở tầng văn bản, nhưng phần lớn vẫn cần spike kỹ thuật xác nhận trước khi ADR chốt (VD: choice (a)/(b) ở Core Rule #3, cơ chế cross-tab lock, hành vi IDBFS/Web Locks thật trên Godot 4.6). Recommended/Nice-to-have (9+4 mục) chưa xử lý, để dành cho vòng sau khi cần.

**Recommended (9 mục, không blocking, chưa xử lý vòng này)**: Core Rule #5
(không-tự-xóa-slot-đã-khép) chưa có AC dưới áp lực quota (`qa-lead`);
biên `quota_bytes=0` mơ hồ giữa 2 edge case của Formula #1
(`systems-designer`); cột Range của `quota_bytes`/`quota_bytes_available`
khai sai so với edge case thật xử lý — đề xuất sửa quy ước bảng cấp dự
án, không phải patch cục bộ (`systems-designer`); AC-11 không test hành
vi runtime "không bỏ qua lần ghi đầu" (`qa-lead`); hành vi QA export
chưa định nghĩa cho slot `LOAD_FAILED_UNREADABLE` (`qa-lead`); mô hình
mock tuần tự-blob của AC-03 xung đột khuyến nghị (a) ở Core Rule #3, nên
gắn cờ ADR-blocked cùng AC-17/AC-22 (`godot-specialist`); ràng buộc
liveness khóa đa-tab / thời điểm phát hiện khi tab đã mở sẵn
(`ux-designer`, một phần đã đóng ở bản sửa); copy banner cảnh báo quota
nên dùng giọng diegetic thay vì văn bản kỹ thuật thuần (`game-designer`).

**Nice-to-have (4 mục, chưa xử lý)**: variance-modeling cho input chưa đo
được bị từ chối vì false precision (`systems-designer`); split Open
Question theo loại bị coi là bookkeeping thuần (`godot-specialist`);
fixture-independence note cho AC-09 (`qa-lead`); slot-list sort/ordering
rule + nội dung dialog xác nhận xóa cụ thể (đã một phần đóng ở vòng 3 —
xem bên dưới).

---

## Review — 2026-08-07 — Verdict: NEEDS REVISION → sửa cùng phiên (vòng 3)
Scope signal: M (khối lượng sửa vòng này) / XL (implementation tổng thể, không đổi)
Specialists: `game-designer`, `systems-designer`, `qa-lead`, `godot-specialist`, `ux-designer` + `creative-director` (senior synthesis)
Blocking items: 9 cụm nhóm-A (gộp từ 19 finding thô, khử trùng lặp) | Batch nhóm-B: 8 | Recommended: 10 | Nice-to-have: (không tách riêng vòng này — folded)

Summary: Full-mode `/design-review` vòng 3 (re-review sau 2 vòng trước
gộp thành 1 entry ở trên). 5 specialist độc lập tìm 19 finding Required
thô; creative-director gộp thành 9 cụm nhóm-A (đánh đổi thiết kế thật/
mâu thuẫn cross-doc/hợp đồng liên-hệ-thống — KHÔNG compiler-catchable)
+ 8 mục nhóm-B (notation/coverage AC — batch được, theo đúng Design
Review Round Cap policy). Phát hiện quan trọng nhất: Core Rule #3
(append-only, cam kết vòng 2) mâu thuẫn ngầm với Core Rule #7 (nén cả
khối Nhật ký) VÀ không AC nào kiểm chứng được append-only — 1
implementation ghi lại toàn bộ bundle mỗi lượt vẫn pass mọi AC trước đó
(`godot-specialist` + `qa-lead`, hội tụ độc lập). 4/9 cụm blocking được
xác định là lỗi KÉO THEO từ chính bản sửa vòng 2 chưa propagate hết
(append-only/nén, export chưa đổi định dạng sau khi đổi ý nghĩa, dialog
gõ-tên chưa vào mô hình overlay, AC-17/22 gán nhãn ADR-blocked sai) —
tín hiệu creative-director dùng để khuyến nghị KHÉP chu trình văn bản
tại đây thay vì chạy vòng 4 (đúng Design Review Round Cap policy,
`.claude/docs/coordination-rules.md`, và tiền lệ Combat System/ADR-0001).

**9 cụm Required đã sửa** (đặt tên A1-A9 theo creative-director):
1. **A1 — Doom-loop quota** (`game-designer`): khi slot đang chơi đơn độc
   chiếm hết quota, không có slot khác để dọn → lối thoát duy nhất trước
   đây là tự xóa chính playthrough, mâu thuẫn Pillar 2. User chọn: Core
   Rule #10 mới — slot TỰ KHÉP có phẩm giá (read-only, KHÔNG mất dữ
   liệu) khi escalation quota persistent, `slot_closure_reason` mới
   phân biệt `death`/`quota_exhausted`, không kích hoạt Character
   Continuation.
2. **A2 — Export không khớp khung ý nghĩa** (`game-designer` +
   `qa-lead`): "Chép lại quyển sổ" đổi Ý NGHĨA thành nghi thức lưu niệm
   ở vòng 2 nhưng vẫn xuất JSON kỹ thuật. User chọn: tách 2 artifact —
   9a (JSON, QA/nội bộ, key-set CHÍNH XÁC 5 field) và 9b (bản đọc được
   tiếng Việt, player-facing, không field kỹ thuật).
3. **A3 — Không có tính liên tục đa-thiết bị** (`game-designer` +
   `godot-specialist`): PC+điện thoại là cách chơi mặc định
   (`game-concept.md`) nhưng lưu trữ per-thiết-bị chưa từng được nói ra.
   Tuyên bố tường minh Core Rule #5 + Open Question mở rộng (ma trận
   WebView đích danh iOS Safari/Android Chrome/in-app browser Zalo-
   Facebook-Messenger, controllability `syncfs()`, cloud-save ngoài
   scope MVP).
4. **A4 — Append-only mâu thuẫn nén + thiếu AC** (`godot-specialist` +
   `qa-lead`, finding quan trọng nhất vòng): Core Rule #7 sửa rõ đơn vị
   nén PHẢI khớp đơn vị ghi (per-record hoặc full-flush, không phải cả
   khối mỗi lượt); AC-34 mới đo O(1) byte payload độc lập `world_time`.
5. **A5 — Quy tắc bump `schema_version` thiếu nhánh** (`godot-specialist`):
   mở rộng bắt buộc bump khi BẤT KỲ blob nào đổi format nội bộ, không chỉ
   khi `N` đổi — ghi rõ đây là quy tắc QUY TRÌNH (Persistence opaque,
   không tự phát hiện được).
6. **A6 — Rủi ro khóa vĩnh viễn save hậu-launch** (`godot-specialist`):
   Open Question mới đặt tên rủi ro (bump `schema_version` + export
   không import được = khóa vĩnh viễn save mọi người chơi), posture
   khuyến nghị ghi rõ, KHÔNG giải quyết ở vòng này.
7. **A7 — `quota_bytes` vs `quota_bytes_available` mơ hồ** (`systems-designer`):
   Formula #3 viết lại hoàn toàn ở phạm vi ORIGIN (không còn per-slot) —
   `measured_total_bytes(origin)`/`quota_bytes_total(origin)`, đóng đúng
   ví dụ số nguy hiểm creative-director xác nhận (slot nhỏ trông "an
   toàn" khi origin thật đã gần cạn).
8. **A8 — Dialog gõ-tên chưa có tầng overlay** (`ux-designer`, cross-file
   `core-ui-screen-navigation.md`): overlay `O-ConfirmDelete` mới (nguồn
   mở CHỈ S1) + AC-64 row + D.2 graph edge + ràng buộc bàn phím ảo BẮT
   BUỘC + AC-70 (bàn phím-only + layout).
9. **A9 — Tên rỗng vô hiệu hóa friction xóa** (`ux-designer`): fallback
   literal "XÁC NHẬN" khi tên chuẩn hóa ra rỗng, AC-19 mở rộng.

**8 mục batch nhóm-B** (theo Design Review Round Cap — coverage/notation,
không phải đánh đổi thiết kế): `is_complete` vacuous truth tại `N=0`
(guard `N≥1` thêm trực tiếp vào định nghĩa); `blob_status=ERROR` thiếu
`error_code` riêng (`BLOB_ERROR` mới); off-by-one trong mô tả
`quota_exhaustion_turn` (world_time CÒN vừa, không phải VƯỢT);
`compression_ratio>1` chưa được guard (clamp về 1 khi lập kế hoạch);
AC-17/AC-22 gán nhãn ADR-blocked sai (tách 2 tầng logic/thật qua seam
`stage()`/`commit()` mới, theo đúng tiền lệ AC-29); AC-38 mới cho "lượt
đầu thực sự kích hoạt ghi, không bị optimize-away"; AC-01 làm rõ mô
phỏng độ trễ KHÔNG dùng timer thực; AC-31 mở rộng điều kiện (c) "rời
slot" xóa `pending_write_cache`.

**Recommended rẻ đã fold cùng phiên**: copy cảnh báo quota sớm đồng bộ
nguyên tắc "chép lại trước khi xóa"; gợi ý mềm chủ động rủi ro Safari ITP
trên Save Slot Screen (chỉ có nghĩa sau khi A2 xong).

**Specialist disagreements creative-director đã phân xử**: bác cơ chế
"biến thể `MULTI_TAB_CONFLICT`" của `game-designer` cho A3 nhưng giữ kết
luận (khóa cross-tab không tồn tại xuyên thiết bị — vấn đề thật nặng hơn
cơ chế được đề xuất); hạ 3 mục xuống Recommended (test "không có API
import" — không chứng minh được sự vắng mặt bằng unit test; ngân sách
latency chưa neo device profile — khoảng trống cấp dự án; `is_complete`
N=0 lẽ ra chỉ nhóm-B không phải Required riêng — đã gộp batch); phản đối
đề xuất "AC cần tiêu chí trải nghiệm" của `game-designer` (vi phạm
`coding-standards.md`).

**Không fixed vòng này** (Recommended, deferred): ràng buộc đầu vào tên
nhân vật chính (route sang `character-card-identity.md`/luồng tạo nhân
vật — không phải gap của Persistence); "xóa slot đã khép quá dễ tiếp
cận" (`game-designer`, giá trị judgment chưa quyết); F8 banner
preempt/restore của core-ui chưa có AC (carry-over từ vòng 2, `ux-designer`
tự nhắc lại).

File đã sửa: `persistence-save-system.md` (chính — Core Rule #3/#5/#6/
#7/#8/#9/#10 mới, Formula #2/#3 viết lại, Error Taxonomy +`BLOB_ERROR`,
Edge Cases, Tuning Knobs, UI Requirements, AC-09/09b/12/13/15/16/17/19/
22/28/31 sửa + AC-34..AC-38 mới, Open Questions mở rộng, header),
`core-ui-screen-navigation.md` (Approved — overlay `O-ConfirmDelete` mới,
AC-64/AC-70/D.2 graph, `slot_closure_reason` display, empty-state
đa-thiết bị, đồng bộ mô tả export, header — 8 điểm sửa, đều additive
không đổi kiến trúc D.1-D.6 đã Approved).

Prior verdict resolved: Có — 12/12 mục Required của vòng 1+2 xác nhận
vẫn đứng vững qua vòng 3 (không bị specialist nào lật lại); 4/9 cụm mới
là hệ quả kéo theo của chính bản sửa vòng 2 (không phải hồi quy, mà là
propagation chưa hoàn tất).

**Quyết định quy trình (user + creative-director)**: **KHÉP chu trình
`/design-review` văn bản tại vòng 3** — không chạy vòng 4. Lý do: (1)
4/9 cụm blocking là lỗi kéo-theo, không phải khám phá thiết kế mới — vòng
4 sẽ lặp lại đúng pattern cho bản sửa vòng 3; (2) câu hỏi giá trị cao
nhất còn lại (xác suất doom-loop thật, ma trận WebView, chi phí migrate)
đều bị chặn bởi THỰC NGHIỆM (spike), không phải bởi văn bản; (3) Design
Review Round Cap policy — hệ mechanically-heavy, cap 2 vòng, đây đã là
vòng 3; (4) ngân sách MVP dự án. Bước tiếp theo: chạy spike kỹ thuật
(`docs/engine-reference/godot/modules/web-export.md`), rồi 1 cổng hẹp
`technical-director` + `creative-director` (không panel đầy đủ) kiểm
đúng 1 câu hỏi — kết quả spike có làm mất hiệu lực posture Core Rule #3/
khung A1 không — trước khi vào `/architecture-decision`.
