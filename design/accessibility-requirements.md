# Accessibility Requirements — AI Story Game

> **Status**: Committed
> **Author**: ux-designer (soạn), user (phê duyệt tier + phạm vi)
> **Last Updated**: 2026-08-14
> **Accessibility Tier Target**: **Basic** (kèm danh mục Standard đã đạt sẵn theo thiết kế — xem §Cam kết)
> **Platform(s)**: Web + Mobile Web (Godot 4.6 HTML5 export — target duy nhất, `technical-preferences.md`)
> **External Standards Targeted**:
> - WCAG 2.1 — dùng làm **khung tham chiếu** (SC được trích dẫn theo từng mục), KHÔNG phải tuyên bố tuân thủ
> - ⚠️ **CẤM tuyên bố "đạt WCAG 2.1 AA"** ở bất kỳ đâu (store page, README, marketing, spec) khi gap AT của ADR-0006 còn mở — điều kiện ràng buộc #3 của ADR-0006 Part 2, đăng ký forbidden-pattern
> - XAG / Sony / console guidelines: N/A — không phát hành console
> **Accessibility Consultant**: None engaged (solo MVP)
> **Linked Documents**: `design/gdd/systems-index.md`, `design/ux/interaction-patterns.md`, `docs/architecture/adr-0006-tap-name-to-card-entry-point.md`

> **Vai trò file này**: ghi chép cam kết accessibility toàn dự án — tier, ma trận
> tính năng, ngoại lệ có chủ đích, test plan. Chú thích accessibility per-screen
> nằm trong từng UX spec (`design/ux/*.md`); file này là chuẩn chung mà các spec
> đó tham chiếu. Nếu một tính năng mâu thuẫn với cam kết ở đây: sửa tính năng,
> không sửa cam kết (trừ khi producer phê duyệt sửa đổi chính thức).
>
> **Khi nào cập nhật**: sau mỗi lần `/gate-check`, sau mọi audit accessibility,
> và khi thêm hệ mới vào `systems-index.md` (thêm hàng vào §Ma trận per-system).

---

## Định nghĩa tier (từ vựng chung của studio)

| Tier | Cam kết lõi |
|------|-------------|
| **Basic** | Text quan trọng đọc được ở độ phân giải chuẩn. Không tính năng nào đòi hỏi phân biệt màu đơn thuần. Volume độc lập cho music/SFX/voice. Hoàn thành game không có rủi ro photosensitivity. |
| **Standard** | Basic + remap input đầy đủ, subtitle kèm speaker ID, cỡ chữ điều chỉnh được, ≥1 colorblind mode, không timed input không-gia-hạn-được. |
| **Comprehensive** | Standard + screen reader cho menu, mono audio, assist mode, HUD reposition, reduced motion, chỉ báo hình cho mọi audio gameplay-critical. |
| **Exemplary** | Comprehensive + tùy biến subtitle đầy đủ, high contrast, cognitive assist, haptic thay thế audio, audit bên thứ ba. |

## Cam kết của dự án này

**Tier cam kết: Basic.**

**Lý do**: Đây là game tường thuật AI thuần chữ, theo lượt, tiếng Việt đơn ngôn
ngữ, chỉ phát hành Web + Mobile Web. Cấu trúc theo lượt loại bỏ toàn bộ rào cản
motor nghiêm trọng (không phản xạ, không giữ phím, không mash); thiết kế nặng
đọc tạo rào cản chính ở trục thị giác — và các quyết định thị giác cốt lõi
(đậm mực/alpha thay màu, 3 nấc cỡ chữ) đã xử lý trục này ngay từ Visual
Identity. Tier Comprehensive **bất khả thi về kỹ thuật** trên target duy nhất
của dự án: AccessKit (Godot 4.5+) chỉ hoạt động native desktop, không chạy trên
Web export (xác nhận bởi điều tra `accessibility-specialist` + `godot-specialist`,
ADR-0006) — không có đường screen-reader-cho-menu nào ở mức chi phí MVP. Tier
Standard có 3 hạng mục N/A về bản chất với game này (xem bảng dưới), nên cam
kết Standard sẽ là tuyên bố cao hơn thực chất deliver — vi phạm tinh thần điều
kiện #3 của ADR-0006. Basic là cam kết trung thực; các mục vượt tier được ghi
tường minh bên dưới để `/ux-review` kiểm tra theo chuẩn thực tế, không phải
chuẩn tối thiểu.

### Mục Standard ĐÃ ĐẠT sẵn theo thiết kế (cam kết giữ, không nâng tier)

| Mục | Nguồn thiết kế | Trạng thái |
|-----|----------------|------------|
| Cỡ chữ điều chỉnh được — 3 nấc `font_scale_steps {0.875, 1.0, 1.25}` (S/M/L), re-wrap đúng khi đổi cỡ | `core-ui-screen-navigation.md`; áp dụng trong `main-screen.md`, `o-customize.md` | Designed |
| Không timed input — game theo lượt, không có input đếm giờ ở bất kỳ đâu | Bản chất core loop (`game-concept.md`) | Đạt by-design |
| Color-independence toàn diện — Pending Fate = đậm mực, disabled = alpha 0.38, lỗi validate = viền + text lỗi | Visual Identity Anchor; `main-screen.md`, `o-customize.md` §Accessibility | Designed |
| Touch target `TOUCH_TARGET_MIN = 44px` mọi phần tử tap độc lập, không ngoại lệ (kể cả panel "kỹ thuật" O-Customize) | `core-ui-screen-navigation.md` mục 9; GDD hệ #16 | Designed |
| Không hover-only interaction — mọi tương tác hoạt động bằng cả tap lẫn click | `technical-preferences.md` §Platform Notes | Ràng buộc nền tảng |
| Keyboard-only navigation đầy đủ (Tab/Enter/Space/Esc) qua mọi phần tử tương tác, trừ 2 ngoại lệ ADR-0006 | `main-screen.md`, `o-customize.md` §Accessibility; AC-56a | Designed |

### Mục Standard N/A (có lý do, không phải bỏ sót)

| Mục | Lý do N/A |
|-----|-----------|
| Remap input đầy đủ | Game point-and-tap; không có phím gán gameplay nào ngoài chuỗi Tab/Enter/Space/Esc chuẩn của hệ điều hành/engine — không có gì để remap. |
| Subtitle + speaker ID | Không có thoại tiếng/VO — toàn bộ tường thuật đã là văn bản. |
| Colorblind mode chuyên dụng | Không cần: thiết kế đã không dùng màu làm kênh thông tin duy nhất ở bất kỳ đâu (xem audit bên dưới) — palette mực tàu + đậm/nhạt/alpha. Một colorblind mode sẽ không thay đổi thông tin nào người chơi nhận được. |

---

## Ngoại lệ có ghi chép — ADR-0006 Part 2 (tap-tên & bút tích, AT scope)

**Tap-tên-mở-Thẻ trong văn tường thuật và 3 bút tích marginalia
(「Thẻ」「Lục」「Mục」) nằm NGOÀI phạm vi hỗ trợ screen-reader/AT ở MVP.**
SC 4.1.2 (Name/Role/Value) và SC 1.3.1 (Info & Relationships) — đều Level A —
**không đạt** tại các entry point này. Đây là ngoại lệ có chủ đích, có phạm vi,
tạm thời — không phải miễn trừ accessibility chung — sau điều tra độc lập xác
nhận cả 2 phương án thay thế (ARIA DOM overlay, TTS layer riêng) đều chi phí
bất cân xứng cho kết quả compliance-island một phần. Chi tiết kỹ thuật đầy đủ:
ADR-0006 §Decision Part 2 + §Alternatives 2/3.

**4 điều kiện ràng buộc đi kèm** (chép nguyên từ ADR-0006 — cả 4 bắt buộc):

1. **Không im lặng**: ghi tại đây + backlog item do **`producer` sở hữu** (item
   thật, được theo dõi — không phải "someday").
2. **Fallback bàn phím phải thật sự chạy**: mở Thẻ qua bút tích 「Thẻ」 (Control
   chuẩn, thuộc Tab-focus chain) **phải pass AC-56a trước MVP release** —
   SC 2.1.1 (Keyboard) được đáp ứng cho việc tới Thẻ; người chơi keyboard-only
   không dùng AT không bị chặn. Lưu ý: AC-56b (mở Thẻ NPC qua bàn phím) vẫn
   **BLOCKED** ở MVP — chỉ Thẻ nhân vật chính reachable qua 「Thẻ」.
3. **Không claim compliance khi gap còn mở**: cấm tuyên bố "WCAG 2.1 AA
   compliant" ở mọi nơi khi quyết định này còn hiệu lực — forbidden-pattern,
   grep-check được bởi `/architecture-review`.
4. **Giữ cửa mở với chi phí ~0**: nếu ADR Core UI D.4 (touch-target padding)
   chọn nhánh Control-overlay, giữ positioning layer tách khỏi text-render
   layer để retrofit accessibility tương lai gắn ARIA vào hạ tầng sẵn có thay
   vì xây lại (advisory).

---

## Trục Thị giác (Visual)

| Hạng mục | Tier | Trạng thái | Ghi chú |
|----------|------|------------|---------|
| Cỡ chữ 3 nấc S/M/L toàn game | Standard (vượt) | Designed | `font_scale_steps {0.875, 1.0, 1.25}` — khung tường thuật re-wrap, không cắt chữ. |
| Contrast text/nền — theme chính | Basic | Designed | Token S2 đã tính sẵn theo `#F5EFE0`/`#2B2620` (`main-screen.md`). Mục tiêu ≥4.5:1 body text (SC 1.4.3). |
| Contrast — panel O-Customize (theme "phá vỡ") | Basic | **Chờ art-director** | Panel dùng nền/màu khác theme chính; số đo contrast thật chưa có — chốt cùng token màu accent kỹ thuật (Open Question, đã flag từ GDD hệ #16). |
| Không màu-làm-kênh-duy-nhất | Basic | Đạt by-design | Xem audit bên dưới. |
| Photosensitivity — không strobe/flash | Basic | Ràng buộc thiết kế | Thẩm mỹ mực tàu tĩnh; ràng buộc: không VFX flash >3 lần/giây ở mọi hiệu ứng tương lai (chuẩn Harding FPA). Chuyển cảnh dùng chữ ký `overlay_settings` (GDD hệ #16 cấm mực loang) — không có nguồn flash nào hiện hữu. |
| Reduced motion toggle | Standard | **Ngoài scope MVP — có chủ đích** | `core-ui-screen-navigation.md` Core Rule #10 (GDD Approved, 6 vòng review) khóa cứng Settings MVP ở ĐÚNG 2 nhóm (Cỡ chữ + Cấu hình AI) — thêm nhóm thứ 3 sẽ mâu thuẫn với 1 Core Rule đã duyệt, không phải quyết định của riêng `/ux-design settings`. Xác nhận 2026-08-14 khi thiết kế `settings.md`. Rủi ro hiện tại thấp: không animation lặp liên tục nào trong 2 spec đã duyệt (`main-screen.md`, `o-customize.md`). Nếu cần bật ở tương lai: phải sửa GDD Core Rule #10 trước (re-review theo `coordination-rules.md`), không phải thêm ngầm vào UX spec. |
| WCAG 200% resize (SC 1.4.4) | Standard | **Treo — OQ#12 hệ #15** | Nấc L = 1.25×; 200% chưa được thiết kế/xác nhận. Không chặn Basic. |

### Audit màu-làm-kênh-duy-nhất

| Vị trí | Tín hiệu màu? | Kênh không-màu | Trạng thái |
|--------|---------------|----------------|------------|
| Pending Fate (S2) | Không dùng màu | Độ đậm mực | Designed — đạt |
| Trạng thái Resolving/disabled (toàn game) | Không dùng màu | Alpha 0.38 | Designed — đạt |
| Lỗi validate (O-Customize) | Viền đỏ (phụ) | Text lỗi ngắn đi kèm luôn | Designed — đạt |
| 2 màu accent khẩu phần hóa (đỏ son/xanh ngọc) | Có — hệ quả thế giới thật | O-Customize bị cấm dùng 2 màu này cho mọi mục đích (GDD hệ #16); nơi dùng thật phải kèm kênh chữ/hình — kiểm tra ở từng UX spec mới | Ràng buộc — kiểm per-spec |

---

## Trục Vận động (Motor)

- **Không rào cản motor nghiêm trọng by-design**: theo lượt, không giữ phím,
  không mash, không QTE, không timed input — các hạng mục remap/toggle/timing
  của template đều N/A.
- **Touch target**: `TOUCH_TARGET_MIN = 44px` mọi phần tử tap độc lập.
  **Ngoại lệ hợp lệ duy nhất**: tap-tên nhúng trong văn xuôi dùng công thức
  D.4a (best-effort, giới hạn vật lý bởi cỡ chữ trong dòng) — ngoại lệ
  "Inline" hợp lệ theo WCAG SC 2.5.5, nhưng **chưa validate mis-tap thật trên
  thiết bị** cho tên 1-2 ký tự — playtest tripwire trước khi ship
  (`main-screen.md`).
- **Keyboard-only**: mọi phần tử tương tác Tab-reachable + Enter/Space
  activatable theo thứ tự visual, không keyboard trap; dòng dẫn tap-to-continue
  TỰ NHẬN focus sau lượt chết (con đường duy nhất sang S5 — thiếu là kẹt vĩnh
  viễn, `main-screen.md`). 2 ngoại lệ ADR-0006 ở trên.
- **Gamepad**: N/A toàn dự án (`technical-preferences.md`).

## Trục Nhận thức (Cognitive)

- **Không áp lực thời gian**: game chờ người chơi vô hạn ở mọi trạng thái —
  "pause anywhere" đạt by-design (không có trạng thái real-time nào để pause).
- **Không auto-dismiss mang thông tin hành động**: feedback lưu
  (`tool-save-feedback`) chỉ là xác nhận, không chứa hành động; lỗi validate
  giữ nguyên tới khi sửa. Ràng buộc cho mọi spec mới: dialog chứa thông tin
  hành động không được tự tắt <5 giây.
- **Tutorial persistence**: chưa có hệ tutorial được thiết kế — khi có, phải
  truy xuất lại được từ menu (ràng buộc ghi trước cho spec tương lai).
- **Tải nhận thức**: game 1 hành động/lượt, không track đồng thời >4 trạng
  thái ở màn hình chính. Hệ nào vượt → review trigger (§Ma trận per-system).

## Trục Thính giác (Auditory)

- **Không thoại tiếng** — toàn bộ nội dung đã là văn bản; subtitle N/A.
- **Ràng buộc thiết kế âm thanh** (cho mọi audio tương lai): không thông tin
  gameplay nào được truyền CHỈ qua âm thanh — mọi cue phải có kênh hình/chữ
  tương đương. Hiện chưa có audio system nào được thiết kế vi phạm điều này.
- **Volume độc lập** (yêu cầu Basic — N/A ở MVP hiện tại): tối thiểu 2 slider
  Music/SFX (thêm Voice nếu có sau này), 0–100%, persist. **Không N/A vì bị
  bỏ sót — N/A vì chưa có gì để điều chỉnh**: dự án chưa có audio system nào
  được thiết kế (`game-concept.md` §Technical Considerations: "Audio Needs:
  Tối thiểu — có thể bổ sung nhạc nền/SFX nhẹ sau"), và Settings MVP
  (`core-ui-screen-navigation.md` Core Rule #10, GDD Approved) khóa cứng ở
  ĐÚNG 2 nhóm không gồm audio. Xác nhận 2026-08-14 khi thiết kế
  `settings.md` — `settings.md` không thiết kế nhóm này. **Kích hoạt lại
  khi**: 1 audio system có GDD riêng VÀ Core Rule #10 được sửa/mở rộng qua
  re-review chính thức để thêm nhóm thứ 3.

---

## Tích hợp API accessibility nền tảng

| Nền tảng | API | Trạng thái | Ghi chú |
|----------|-----|------------|---------|
| Web (target duy nhất) | AccessKit (Godot 4.5+) | **Không hoạt động — rào cản engine** | AccessKit chỉ native desktop; Godot Web export render toàn bộ UI vào 1 `<canvas>`, không phần tử DOM thật (ADR-0006). Không có đường OS-AT nào ở MVP. |
| Web | ARIA DOM overlay qua `JavaScriptBridge` | Từ chối ở MVP | ADR-0006 Alternative 2 — compliance island + không có bounding-rect API. Post-MVP nếu producer ưu tiên. |
| Web | TTS (Web Speech API) | Từ chối ở MVP | ADR-0006 Alternative 3 — không đạt SC 4.1.2 thật; WebView in-app (Zalo/FB/Messenger) chưa verify. |
| iOS/Android native | VoiceOver/TalkBack | N/A | Không phát hành app native — chỉ web. |

## Ma trận per-system (chỉ hệ có bề mặt người chơi)

> Hệ thuần logic (Persistence, AI/LLM Layer, Contract Enforcement, World
> Memory, Turn Manager backend, Setting & Canon, Situation/Encounter
> Generation, Character Continuation backend, Equipment/Skill Data): **không
> có bề mặt UI riêng** — accessibility của chúng được kiểm qua màn hình
> hiển thị chúng (các hàng dưới). Thêm hàng khi hệ mới có UI riêng.

| Bề mặt | Thị giác | Vận động | Nhận thức | Thính giác | Trạng thái |
|--------|----------|----------|-----------|------------|------------|
| S2 Main Screen (hệ #15) | Contrast token đã tính; đậm mực/alpha | Tap-tên = ngoại lệ D.4a + ADR-0006 | Không track >4 trạng thái | N/A | Designed — spec APPROVED |
| O-Customize (hệ #16) | Contrast chờ art-director | Control chuẩn, 44px đủ | Banner khóa-Undo 1 lần, rõ ràng | N/A | Designed — spec APPROVED; tiềm năng AT tốt hơn tap-tên (Control chuẩn) nhưng KHÔNG tự nhận — AccessKit vẫn không chạy trên Web |
| Character Card | Kênh chữ thuần | Mở qua tap-tên (ngoại lệ ADR-0006) HOẶC 「Thẻ」 keyboard (AC-56a) | — | N/A | Chưa có UX spec riêng |
| Combat (hiển thị trong tường thuật) | Số liệu bị cấm leak vào văn (Contract Enforcement) — thông tin qua chữ | Theo lượt | Track tài nguyên qua văn bản | N/A | Kiểm khi có UX spec liên quan |
| Settings (`settings.md`) | Contrast theme chính | Control chuẩn, keyboard-only đầy đủ | Đúng 2 nhóm (Core Rule #10) — không quá tải | N/A — không có audio group ở MVP (xem §Auditory) | Đang thiết kế 2026-08-14 |
| Save-slot / Story-log (hệ #15, chưa thiết kế) | — | — | — | N/A | Chưa thiết kế — mỗi spec mới phải đối chiếu file này |

---

## Test plan

| Bài test | Phương pháp | Tiêu chí pass | Phụ trách | Trạng thái |
|----------|-------------|---------------|-----------|------------|
| Contrast tự động | Contrast analyzer trên token màu final của từng screen | Body text ≥4.5:1; large text ≥3:1 (SC 1.4.3). O-Customize test sau khi art-director khóa token | ux-designer | Not Started |
| Keyboard-only walkthrough | Đi hết S2 → mở Thẻ qua 「Thẻ」 → O-Customize → lưu, chỉ bằng bàn phím | AC-56a pass; không keyboard trap; dòng dẫn tap-to-continue tự nhận focus sau lượt chết | qa-tester | Not Started — **BLOCKING trước MVP release** (điều kiện #2 ADR-0006) |
| Touch-target audit | Đo mọi phần tử tap độc lập trên build thật (mobile viewport) | ≥44px, không ngoại lệ ngoài inline tap-tên D.4a; mis-tap tripwire cho tên 1-2 ký tự | qa-tester | Not Started |
| Font-scale re-wrap | Đổi S/M/L ở mọi màn hình đã implement | Không cắt chữ, không vỡ layout, khung tường thuật re-wrap đúng | qa-tester | Not Started |

## Known Intentional Limitations

| Hạng mục | Tier cần | Vì sao không có | Rủi ro | Giảm thiểu |
|----------|----------|-----------------|--------|-----------|
| Screen reader/AT — toàn bộ UI | Comprehensive | AccessKit không chạy trên Web export (rào cản engine, không phải lựa chọn); ARIA overlay/TTS bị từ chối có điều tra (ADR-0006) | Người dùng AT không tự khám phá được UI | 4 điều kiện ADR-0006; keyboard fallback AC-56a; backlog producer sở hữu; revisit post-MVP |
| Mở Thẻ NPC qua bàn phím (AC-56b) | — | Phụ thuộc gap AT trên | Keyboard-only user chỉ mở được Thẻ nhân vật chính | Ghi chép tường minh; chờ giải pháp cùng đợt retrofit AT |
| Reduced motion toggle | Standard | Chưa quyết cho Settings MVP | Thấp — chưa có animation lặp nào trong 2 spec đã duyệt | Quyết khi `/ux-design settings`; không animation lặp là ràng buộc tạm |
| WCAG 200% resize | Standard | Nấc L dừng ở 1.25× | Người thị lực kém cần >125% phải dùng zoom trình duyệt | OQ#12 hệ #15 còn treo; zoom trình duyệt là mitigation tự nhiên trên web |

## Audit history

| Ngày | Người audit | Loại | Phạm vi | Kết quả | Trạng thái |
|------|-------------|------|---------|---------|------------|
| 2026-08-14 | Internal — ux-designer + user | Cam kết tier ban đầu | Toàn dự án, tổng hợp từ ADR-0006 + 2 UX spec APPROVED | Tier Basic committed; 6 mục Standard đạt by-design; 4 giới hạn có chủ đích ghi chép | Committed |

## Open Questions

| Câu hỏi | Owner | Deadline | Trạng thái |
|---------|-------|----------|------------|
| Token màu accent kỹ thuật O-Customize + số đo contrast thật | art-director | Trước `/team-ui` O-Customize | Chưa giải quyết (flag từ GDD hệ #16) |
| Reduced motion toggle có vào Settings MVP không | ux-designer | Khi `/ux-design settings` | **Đã giải quyết 2026-08-14 — KHÔNG**, tôn trọng khóa "đúng 2 nhóm" của Core Rule #10 (`core-ui-screen-navigation.md`, GDD Approved). Mở lại chỉ qua re-review chính thức sửa Core Rule #10, không qua UX spec. |
| WCAG 200%-resize (OQ#12 hệ #15) — có nâng nấc L hay dựa zoom trình duyệt | ux-designer + technical-director | Trước Production gate | Chưa giải quyết |
| Backlog item AT retrofit (điều kiện #1 ADR-0006) đã tồn tại trong production/ chưa | producer | Trước `/gate-check pre-production` | **Cần kiểm** — nếu chưa có, tạo khi sprint-plan kế tiếp |
