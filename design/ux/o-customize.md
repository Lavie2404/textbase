# UX Spec: O-Customize (Overlay Chỉnh sửa nhân vật)

> **Status**: In Design
> **Author**: duchx + ux-designer
> **Last Updated**: 2026-08-13
> **Journey Phase(s)**: [To be designed — no player-journey.md yet]
> **Template**: UX Spec

---

## Purpose & Player Need

Người chơi đến O-Customize với một nhu cầu **hoàn toàn khác** mọi màn
hình khác trong game: không phải "chọn hành động và xem thế giới phản
hồi" (S2), mà **"tạm rời ghế nhân vật để ngồi vào ghế đạo diễn"** —
trực tiếp ghi trạng thái (cấp độ, 12 chỉ số cơ bản, vật phẩm/kỹ năng
tùy chỉnh) mà không cần đi qua con đường "kiếm được qua gameplay".

**Hai lý do cụ thể người chơi mở panel này** (từ Overview + Player
Fantasy, `character-customization-mode.md`):
1. **Thử nghiệm nhanh 1 nhánh nhân vật** — không cày lại từ đầu mỗi
   lần muốn xem 1 tổ hợp chỉ số/kỹ năng chơi ra sao.
2. **Tập trung trải nghiệm tường thuật/roleplay ở một trạng thái cụ
   thể** — bỏ qua công đoạn tiến triển để thẳng vào đoạn truyện/tình
   huống muốn trải nghiệm.

**Hoàn thành câu**: *"Người chơi mở O-Customize vì muốn ghi trực tiếp
một trạng thái cụ thể cho nhân vật chính — bỏ qua quá trình kiếm được
nó qua gameplay — và biết rõ mình đang làm gì khi làm vậy."*

**Điều hỏng nặng nhất nếu panel này khó dùng**: khác mọi UI khác trong
game (nơi sai thao tác còn có Undo 1-lượt để sửa), write path này
**vĩnh viễn theo thiết kế** (Core Rule #7) và tự khóa luôn cả Undo của
lượt gameplay trước đó (Core Rule #6b) ngay lần ghi đầu tiên. Một
panel khó dùng ở đây không chỉ gây khó chịu — nó biến một hành động
"đạo diễn có chủ đích" thành **thao tác nhầm không thể tự động lùi
lại**, đúng lúc người chơi tin tưởng nhất rằng mình đang kiểm soát
hoàn toàn.

**Ranh giới thiết kế quan trọng cần giữ xuyên suốt spec** (Player
Fantasy GDD nói thẳng, không né tránh): panel này **không giả vờ trung
lập đạo đức** — không có gate nào ngăn dùng nó để "thắng dễ hơn". Cái
giữ tính chính trực không phải rào cản UX (dialog xác nhận, friction)
mà là hai cơ chế minh bạch thật đã có ở tầng dữ liệu: cờ
`hack_mode_used_this_slot` không thể xóa (Core Rule #8) và nhãn
`hack_write` trong log trạng thái cơ học (Core Rule #6c). Ý nghĩa cho
UX: **không thêm friction giả** (đã bị `creative-director` chặn ở
review vòng 1 — "tai nạn chính là tính năng", không thêm dialog xác
nhận toggle) — nhiệm vụ của UI là làm cho 2 cơ chế minh bạch đó **luôn
nhìn thấy được**, không phải làm cho việc dùng panel khó hơn.

---

## Player Context on Arrival

O-Customize chỉ có **đúng 1 đường vào thật**: nút "Chỉnh sửa nhân vật"
trong O-Set, chỉ hiện khi cả 4 điều kiện thỏa (toggle ON, `screen=S2`,
`tm_state=awaiting_action`, `in_combat=false` — Core Rule #1/#1b).
Không có game event/redirect nào mở panel này thay người chơi.

**Luôn là hành động chủ động 2 bước**, tách rời về thời gian:
1. Vào Settings, bật toggle "Chỉnh sửa nhân vật" (thường chỉ làm 1
   lần, mặc định OFF) — micro-copy discoverability xuất hiện ngay:
   *"Đóng Cài đặt và mở lại từ Màn chơi chính để thấy nút Chỉnh sửa
   nhân vật."*
2. (Có thể ở phiên chơi khác) Từ S2, mở O-Set → bấm "Chỉnh sửa nhân
   vật".

**Vừa làm gì trước đó**: luôn đang ở S2, `awaiting_action` — vừa đọc
xong 1 đoạn tường thuật, đứng giữa lượt, không đang dở dang hành động
nào. Không có ngữ cảnh "khẩn cấp" hay "đang chờ" nào mang theo — điều
kiện gate còn chủ động loại trừ cả combat lẫn lúc AI đang viết.

**Trạng thái cảm xúc mặc định**: **tập trung, có chủ đích** — khác
hẳn baseline "calm/immersed" của S2. Đây là lúc người chơi chủ động
**rời khỏi** trạng thái nhập vai để bước sang chế độ "làm việc"/cấu
hình, đúng tinh thần "đạo diễn đứng sau hậu trường" của Player Fantasy:
biết rõ mình muốn đổi gì trước khi mở panel, không bị cuốn theo cảm
xúc trường đoạn tường thuật vừa đọc. Baseline này chi phối tông
chữ/copy toàn panel (mục Layout/Interaction Map sau) — rõ ràng, trực
tiếp, không diegetic.

**Voluntary vs. sent**: hoàn toàn chủ động — không có cơ chế nào "gợi
ý" hay tự động mở panel này.

---

## Navigation Position

O-Customize là 1 **overlay** (tầng thứ 2 trong mô hình 3-tầng của
`core-ui-screen-navigation.md`), không phải screen độc lập — không có
"vị trí trong cây điều hướng" theo nghĩa screen, mà là **đè lên** đúng
1 screen gốc:

**root** → **Màn chơi chính (S2)** → **O-Set (overlay Settings)** →
**O-Customize (overlay)**

- **Không context-dependent theo nghĩa "chỉ tồn tại ở 1 trạng thái
  slot"** như S5 — nhưng **context-dependent theo nghĩa gate 4 điều
  kiện** (xem Player Context on Arrival): chỉ reachable khi đang đứng
  tại đúng S2 với `awaiting_action` + `in_combat=false`, và toggle đã
  bật.
- **Không phải top-level**: không có đường vào trực tiếp nào bỏ qua
  O-Set — luôn phải qua O-Set trước (Core Rule #2: mở O-Customize tự
  đóng O-Set).
- **Chỉ 1 đường vào duy nhất, không có đường thay thế**: khác hẳn
  O-Card (vào được từ tap-tên HOẶC bút tích 「Thẻ」, ở 4 bề mặt khác
  nhau) — O-Customize chỉ vào được từ đúng 1 nút, ở đúng 1 overlay
  (O-Set), khi đang ở đúng 1 screen (S2).

---

## Entry & Exit Points

| Entry Source | Trigger | Player carries this context |
|---|---|---|
| O-Set (chỉ khi mở từ S2) | Tap nút "Chỉnh sửa nhân vật" | Không có state đặc biệt nào mang theo — panel tự đọc `get_base_X0`, `level` hiện tại để pre-fill Khu 2/Khu Tiến trình (Core Rule #4); O-Set đóng NGAY trước khi O-Customize mở (Core Rule #2, tối đa 1 overlay) |

**Đây là điểm vào DUY NHẤT** — không có đường thay thế nào khác (khác O-Card có 2 điểm vào).

| Exit Destination | Trigger | Notes |
|---|---|---|
| S2 (đóng overlay, quay lại màn hình bên dưới) | Nút X | Đóng ngay lập tức — hành động tường minh, không qua luật 2-bậc |
| S2 | Tap ngoài panel — **luật 2 bậc khi có field đang focus**: lần 1 chỉ unfocus/ẩn bàn phím ảo, lần 2 mới đóng | Draft (dữ liệu chưa Lưu) bị bỏ, không cảnh báo — panel không tự lưu draft |
| S2 | Esc — cùng luật 2 bậc như trên | Bàn phím vật lý |
| S2 | *(Defensive-only, KHÔNG phải regression path thật)* — force-close khi điều kiện D.1 mất giữa lúc panel đang mở (VD `in_combat=true`) | GDD ghi rõ: không reachable qua gameplay thật vì không lượt nào resolve được trong lúc panel mở, bypass Turn Manager — chỉ test bằng mock injection (AC-02 GDD). Liệt kê ở đây để đầy đủ, KHÔNG thiết kế UI riêng cho path này ngoài behavior chuẩn "đóng ngay" |

**Không có exit nào rời khỏi S2** — O-Customize không bao giờ điều
hướng sang screen khác; mọi đường thoát đều quay về đúng S2 bên dưới,
đúng bản chất overlay.

**Panel KHÔNG tự đóng sau khi Lưu thành công** (3 nút Lưu riêng theo
khu, Core Rule #6/#6a) — người chơi có thể lưu nhiều khu liên tiếp
trong 1 lần mở, tự chọn lúc nào đóng bằng 1 trong 3 trigger ở bảng
trên.

---

## Layout Specification

### Information Hierarchy

**Ưu tiên cao nhất (luôn hiện đầu panel, không phụ thuộc trạng thái)**:
1. Tiêu đề panel + đường thoát (X) — định vị ngay "đây là công cụ,
   không phải tường thuật"

**Điều kiện/cảnh báo (chỉ xuất hiện khi đúng trạng thái, nhưng khi có
thì đứng NGAY sau tiêu đề — trên cả Khu 1)**:
2. Banner cảnh báo khóa-Undo — chỉ khi `undo_available=true`, đặt cố
   định đầu panel — người chơi thấy TRƯỚC khi chạm bất kỳ field nào,
   không phải sau khi đã sắp bấm Lưu (1 banner chung, KHÔNG lặp lại
   cạnh từng nút Lưu)

**Ưu tiên cao (nội dung chính, chiếm phần lớn panel, thứ tự đã khóa
theo GDD)**:
3. Khu Tiến trình (level, current_exp, state, `tier` derive
   read-only) + nút "Lưu tiến trình"
4. Khu 12 chỉ số cơ bản (lưới 12 field, pre-fill sẵn) + nút "Lưu chỉ
   số"
5. Khu Vật phẩm/Kỹ năng tùy chỉnh (form tạo mới theo loại) + nút "Lưu
   vật phẩm/kỹ năng"

**Ưu tiên trung bình (trong Khu 3, hỗ trợ — không phải nội dung chính
cần nhập)**:
6. Danh sách entry custom đã tạo (read-only reference) + nút xóa
   per-entry

**Phản hồi tại chỗ (xuất hiện ngay dưới field/nút liên quan, không
phải vị trí cố định riêng)**:
7. Validate inline lỗi — trong từng field, sau first-interaction/blur
8. Feedback "Đã ghi" — trong khu vừa thao tác, tồn tại tới khi field
   bị sửa tiếp

**Lý do banner Undo đứng trên cả Khu 1 dù về logic chỉ liên quan lúc
bấm Lưu**: đây là thông tin ảnh hưởng cách người chơi tiếp cận CẢ 3
khu (biết trước hệ quả trước khi bắt đầu nhập, không phải bị "giật
mình" ngay trước khi bấm) — khớp tinh thần "trọng lượng của thao tác"
đã nêu ở Purpose & Player Need.

### Layout Zones

**1 luồng cuộn dọc duy nhất, 3 khu luôn cùng mở** (khớp D.5
`core-ui-screen-navigation.md`: mọi touch-primary luôn 1-cột; và
không dùng tab/accordion — tất cả khu hiện sẵn để người chơi thấy
toàn bộ nội dung panel ngay khi mở, không cần thao tác điều hướng
phụ):

```
[Tiêu đề "Chỉnh sửa nhân vật" + nút X]
[Banner cảnh báo khóa-Undo — chỉ khi undo_available=true]
[Khu 1 — Tiến trình]
  level / current_exp / state / tier (read-only)
  [Nút "Lưu tiến trình"]
[Khu 2 — 12 chỉ số cơ bản]
  lưới 12 field
  [Nút "Lưu chỉ số"]
[Khu 3 — Vật phẩm/Kỹ năng tùy chỉnh]
  chọn loại (Vật phẩm/Kỹ năng/Thức) → form theo loại
  danh sách entry custom đã tạo (read-only + nút xóa)
  [Nút "Lưu vật phẩm/kỹ năng"]
```

**Mobile/touch-primary**: full width, 1 cột dọc xuyên suốt cả 3 khu —
không có ngoại lệ nào (khác Character Card, nơi desktop có thể
2-cột; O-Customize không tham chiếu `two_column_layout` ở cấp toàn
panel).

**Desktop/mouse-primary**: cột nội dung căn giữa (cùng tinh thần
`readable_width` của S2, nhưng panel này rộng hơn vì cần chỗ cho lưới
12 field); **riêng bên trong Khu 2**, lưới 12 field có thể xếp 2–3
cột thay vì 1 cột dọc dài (đúng UI Requirements GDD: "desktop/mouse-
primary có thể xếp Khu 2... thành lưới 2-3 cột để đỡ cuộn dài") — Khu
1 và Khu 3 vẫn giữ 1 cột (không đủ số field đồng dạng để hưởng lợi từ
lưới).

**Ranh giới hình ảnh giữa 3 khu**: đường phân cách mảnh (border
thẳng, góc vuông — đúng nguyên tắc "phá vỡ" Visual Identity Anchor,
không dùng viền mực loang hữu cơ như Card/S2), kèm tiêu đề khu rõ
ràng (VD "Khu 1 — Tiến trình") để người chơi luôn biết đang ở khu nào
khi cuộn dài.

**Vì sao không dùng accordion/tab**: (1) GDD không đặc tả quy tắc
"chuyển khu có mất draft không" mà accordion/tab sẽ cần; (2) nhất
quán nguyên tắc toàn game "không thêm thao tác điều hướng phụ khi có
thể tránh" (S2 cũng không dùng tab dù có nhiều loại nội dung); (3)
panel này vốn đã hiếm khi mở (opt-in, không thường xuyên) — ưu tiên
"thấy hết ngay" hơn "gọn nhẹ từng lúc".

### Component Inventory

*(Nhãn 12 field chỉ số Khu 2: tái dùng nguyên văn bộ thuật ngữ đã
Approved ở `game-concept.md` Core Mechanics #7 — HP, ATK, DEF, SPD,
ACC, Lifesteal [LSTL], HP Regen, Crit Rate, Crit Damage, Khuếch đại
sát thương, Chống chịu, Né tránh — nhất quán với Character Card và
mọi bề mặt khác hiển thị cùng dữ liệu, đóng đúng khoảng trống GDD để
ngỏ "nhãn hiển thị tiếng Việt thống nhất do `/ux-design` chốt".)*

| Zone | Component | Loại | Nội dung | Interactive? | Pattern |
|---|---|---|---|---|---|
| Header | Tiêu đề panel | Text tĩnh | "Chỉnh sửa nhân vật" | Không | **MỚI**: `tool-panel-header` |
| Header | Nút X | Icon button (chữ "X", không icon asset — nhất quán "chữ thay icon") | — | Có — đóng panel | **MỚI**: `tool-panel-close` |
| Banner | Cảnh báo khóa-Undo | Banner text, chỉ render khi `undo_available=true` | "Lưu bất kỳ khu nào sẽ khóa vĩnh viễn Undo của lượt trước" | Không | **MỚI**: `hack-undo-lock-warning` |
| Khu 1 | Field `level` | Number input, int, required | Pre-fill giá trị hiện tại | Có | **MỚI**: `tool-field-input` (biến thể số nguyên) |
| Khu 1 | Field `current_exp` | Number input, float ≥0, optional | Pre-fill giá trị hiện tại | Có | `tool-field-input` (biến thể float, optional) — **dùng chung dirty-tracking flag với validate-inline** (xem ghi chú dưới bảng) |
| Khu 1 | Chọn `state` | Segmented control 2 lựa chọn (cùng ngôn ngữ thị giác với S/M/L ở O-Set) | "Tu Luyện Thường" / "Chờ Đột Phá" | Có — "Chờ Đột Phá" mờ mực + lý do khi D.2b không thỏa | **MỚI**: `tool-segmented-choice` — **dùng chung dirty-tracking flag** |
| Khu 1 | `tier` display | Text read-only | Derive real-time từ `level` | Không | **MỚI**: `tool-derived-readout` |
| Khu 1 | Feedback "Đã ghi" | Text trạng thái, per-khu | "Đã ghi" (+ "Undo lượt trước đã khóa" nếu là hack-write đầu tiên) | Không | **MỚI**: `tool-save-feedback` |
| Khu 1 | Nút "Lưu tiến trình" | Button | — | Có — submit khu 1, debounce 500ms | `tool-save-feedback` cùng họ (trạng thái nút) |
| Khu 2 | 12 field chỉ số | Number input ×12, pre-fill `base_X0` | Nhãn: HP, ATK, DEF, SPD, ACC, Lifesteal (LSTL), HP Regen, Crit Rate, Crit Damage, Khuếch đại sát thương, Chống chịu, Né tránh | Có | `tool-field-input`, mỗi field chừa sẵn khoảng trống error-text cố định (mục Responsive GDD) |
| Khu 2 | Validate inline lỗi | Text lỗi ngắn dưới field | VD "Không được âm", "HP phải > 0" | Không (chỉ đọc) | **MỚI**: `tool-inline-error` |
| Khu 2 | Feedback + Nút "Lưu chỉ số" | như Khu 1 | — | Có | tái dùng `tool-save-feedback` |
| Khu 3 | Chọn loại | Segmented control 3 lựa chọn | "Vật phẩm" / "Kỹ năng" / "Thức" | Có — đổi loại giữ draft riêng từng loại | tái dùng `tool-segmented-choice` |
| Khu 3 | Form Vật phẩm | 2 field: `item_id` (text, nhãn "Mã vật phẩm"), `efficacy` (number, 0–1, nhãn "Hệ số hiệu lực") | — | Có | `tool-field-input` |
| Khu 3 | Form Kỹ năng | `weapon_type` (dropdown/segmented theo danh sách loại vũ khí hợp lệ — loại control cụ thể chốt cùng lúc với Open Question #7, dropdown nếu >4-5 loại), **"Bậc kỹ năng"** (`skill.tier`, number — nhãn cố ý khác "Bậc hiện tại" của Khu 1 vì 2 khái niệm khác nhau, xem ghi chú dưới bảng), `family_id` (text, optional), `style_descriptor` (text ngắn) + **danh sách thức lặp lại** (≥1 dòng bắt buộc, mỗi dòng 1 field tên; nút "+ Thêm thức" thêm dòng mới, nút xóa dòng — bị mờ nếu chỉ còn đúng 1 dòng, vì N≥1 là invariant cứng) | — | Có | **MỚI**: `tool-repeatable-list` (dòng thức) |
| Khu 3 | Form Thức (standalone) | `tên` (text) + chọn `thuộc skill nào` (dropdown — mọi skill đã tồn tại, gốc lẫn custom) | — | Có | `tool-field-input` + dropdown chuẩn |
| Khu 3 | Validate ID trùng | Text lỗi, hiện ngay khi rời field ID | VD "ID này đã tồn tại" | Không | tái dùng `tool-inline-error` |
| Khu 3 | Cảnh báo dưới-ngưỡng-khuyến-nghị | Text cảnh báo, KHÔNG chặn submit | "Dưới số thức khuyến nghị (tối thiểu 3 để tránh lặp thức khi giao tranh dài)" — chỉ hiện khi 1–2 thức | Không | **MỚI**: `tool-soft-warning` (khác `tool-inline-error` — không chặn) |
| Khu 3 | Danh sách entry custom | List read-only, mỗi dòng: tên/ID + nút xóa | Toàn bộ entry custom đã tạo trong slot | Có (nút xóa) — mờ + lý do nếu entry đã tham chiếu | **MỚI**: `tool-deletable-list-row` |
| Khu 3 | Feedback + Nút "Lưu vật phẩm/kỹ năng" | như Khu 1/2 | — | Có | tái dùng `tool-save-feedback` |

**11 pattern MỚI trong khu vực này** (khác biệt hoàn toàn với 11
pattern hiện có của thư viện — sẽ flag ở Cross-Reference Check cuối
file, vì đây đúng là ngôn ngữ "công cụ" mà `interaction-patterns.md`
chưa có).

**Nhãn "Bậc kỹ năng" (Khu 3) khác "Bậc hiện tại" (Khu 1)** — bổ sung
sau `/ux-review`: `tier` ở Khu 1 (derive read-only, `tier_from_level`
— bậc CẢNH GIỚI nhân vật) và `tier` ở Khu 3 (`skill.tier`, field nhập
tự do — bậc SỨC MẠNH của kỹ năng đang tạo) là 2 khái niệm hoàn toàn
độc lập, không có ràng buộc chéo nào trong GDD. Dùng chung nhãn "Bậc"
cho cả 2 trên cùng 1 panel dễ khiến người chơi nhầm thang giá trị khi
cuộn qua lại giữa 2 khu — nhãn Khu 3 đổi thành **"Bậc kỹ năng"** để
tách biệt rõ, Khu 1 giữ nguyên "Bậc hiện tại".

**Dirty-tracking flag cho gate no-op (Core Rule #10 GDD)** — bổ sung
sau `/ux-review`: GDD nguồn giao đúng phần "ngữ nghĩa điền mặc định"
này cho UI quyết định (`character-customization-mode.md`, đoạn "Ngữ
nghĩa điền mặc định TRƯỚC khi validate — thuộc UI, ghi ở đây để đóng
đinh"). Vì `current_exp`/`state` đều **pre-fill giá trị hiện tại**
(không bắt đầu rỗng), "người chơi KHÔNG nhập current_exp mới"/"KHÔNG
chọn state" (điều kiện gate no-op) **không được xác định bằng cách so
sánh giá trị submit với giá trị cũ** (2 giá trị trùng nhau không có
nghĩa người chơi không chạm field — họ có thể chủ động gõ lại đúng số
cũ). Panel dùng **CHÍNH dirty-tracking flag đã thiết lập cho validate-
inline** (first-interaction/blur, đã có sẵn ở Khu 2) làm nguồn sự
thật duy nhất: field/control chưa từng nhận sự kiện input/tap từ
người chơi trong lần mở panel này → coi là "không nhập"/"không chọn"
→ áp gate no-op theo đúng Core Rule #10; đã từng nhận sự kiện đó (kể
cả nếu giá trị cuối trùng giá trị cũ) → coi là "đã nhập" → gate no-op
KHÔNG áp dụng, ghi đúng giá trị người chơi để lại.

### ASCII Wireframe

Mobile portrait, trạng thái mặc định (đã bật `undo_available=true` để
minh họa banner cảnh báo — trường hợp phổ biến vì panel thường mở
ngay sau khi chơi vài lượt), Khu 3 đang chọn loại "Kỹ năng" (để minh
họa danh sách thức lặp lại):

```
┌───────────────────────────────────┐
│ Chỉnh sửa nhân vật            [X] │
├───────────────────────────────────┤
│ ⚠ Lưu bất kỳ khu nào sẽ khóa      │
│   vĩnh viễn Undo của lượt trước   │
├───────────────────────────────────┤
│ Khu 1 — Tiến trình                │
│                                   │
│  Cấp độ (level)                  │
│  ┌─────────────┐                 │
│  │ 9            │                 │
│  └─────────────┘                 │
│  EXP hiện tại (tùy chọn)          │
│  ┌─────────────┐                 │
│  │              │                 │
│  └─────────────┘                 │
│  Trạng thái                       │
│  [Tu Luyện Thường] [Chờ Đột Phá]  │
│                     (mờ — lý do)  │
│  Bậc hiện tại: 1  (derive)        │
│                                   │
│              [ Lưu tiến trình ]  │
├───────────────────────────────────┤
│ Khu 2 — 12 chỉ số cơ bản          │
│                                   │
│  HP            ATK                │
│  ┌────────┐    ┌────────┐        │
│  │ 120     │    │ 45      │        │
│  └────────┘    └────────┘        │
│  (khoảng trống lỗi — ẩn)         │
│  ... (10 field còn lại, cùng     │
│       khuôn mẫu) ...             │
│                                   │
│              [ Lưu chỉ số ]      │
├───────────────────────────────────┤
│ Khu 3 — Vật phẩm/Kỹ năng tùy chỉnh│
│                                   │
│  [Vật phẩm] [Kỹ năng] [Thức]      │
│              ▲ đang chọn          │
│                                   │
│  Loại vũ khí       Bậc kỹ năng    │
│  ┌────────────┐    ┌──────┐      │
│  │ Kiếm        │    │ 3     │      │
│  └────────────┘    └──────┘      │
│  Family ID (tùy chọn)             │
│  ┌───────────────────────┐       │
│  │                         │       │
│  └───────────────────────┘       │
│  Mô tả phong cách                 │
│  ┌───────────────────────┐       │
│  │                         │       │
│  └───────────────────────┘       │
│                                   │
│  Thức (tối thiểu 1)               │
│  ┌───────────────────────┐ [x]   │
│  │ tên thức 1              │       │
│  └───────────────────────┘       │
│           [+ Thêm thức]           │
│                                   │
│  — Danh sách entry đã tạo —       │
│  Lưu Vân Kiếm Pháp         [Xóa] │
│  Đoạn Hồn Chưởng      (mờ, đã    │
│                        dùng)     │
│                                   │
│         [ Lưu vật phẩm/kỹ năng ] │
└───────────────────────────────────┘
```

**Ghi chú wireframe**:
- Border thẳng góc vuông xuyên suốt (không mực loang) — đúng nguyên
  tắc "phá vỡ" Visual Identity Anchor.
- Field nhập kiểu input-box chuẩn (không khung con dấu) — đúng UI
  Requirements GDD.
- Desktop: Khu 2 xếp 12 field thành lưới 2–3 cột thay vì xen kẽ
  2-cột như trên (mobile vẫn 1 field/dòng).

---

## States & Variants

| State / Variant | Trigger | What Changes |
|---|---|---|
| Default | Vừa mở panel | 3 khu pre-fill giá trị hiện tại (level, current_exp, state, 12 chỉ số); Khu 3 mặc định chọn loại "Vật phẩm"; không banner cảnh báo Undo nếu `undo_available=false`; validate inline CHƯA kích hoạt (0 viền đỏ trước first-interaction, khớp Khu 2 GDD) |
| Loading | *(Không có — cố ý)* | Cả 6 lệnh đọc khi mở panel (EXP, Character Card, Equipment & Skill, World Memory, Turn Manager, Combat) đều local (Persistence/registry in-memory) — cùng lý do "mọi dữ liệu local, không loading screen" đã áp dụng cho S1-S5 (Core Rule #3 `core-ui-screen-navigation.md`). Panel render hoàn chỉnh trong 1 frame sau khi chuyển cảnh `overlay_settings` kết thúc |
| Undo đang treo | `undo_available=true` khi mở panel (hoặc chuyển true trong lúc panel đang mở — live re-evaluate) | Banner cảnh báo hiện đầu panel; biến mất nếu không còn snapshot treo |
| Field lỗi (per-field) | Blur field sau khi gõ giá trị không hợp lệ | Viền đỏ + text lỗi ngắn dưới field đó; field khác trong CÙNG khu không bị ảnh hưởng |
| Khu bị chặn submit | Bấm nút Lưu khi ≥1 field trong khu đó không hợp lệ (VD Khu 2 thiếu 1/12, hoặc Khu 3 tạo skill 0 thức) | Submit KHÔNG gửi đi; lỗi hiển thị đúng field/khu gây chặn; 2 khu còn lại không bị ảnh hưởng |
| In-flight (đang gửi) | Bấm 1 nút Lưu HOẶC 1 nút xóa | Khóa NGAY CẢ 3 nút Lưu + mọi nút xóa + nút Undo (mờ mực 0.38) trong suốt cửa sổ commit bất đồng bộ (Rule #6a1) — không chỉ khu đang thao tác |
| Commit thành công (`committed()`) | Server/persistence xác nhận | Mở khóa lại 3 nút Lưu/xóa/Undo; feedback "Đã ghi" hiện trong khu vừa thao tác; nếu là hack-write ĐẦU TIÊN trong cửa sổ Undo → thêm dòng "Undo lượt trước đã khóa" + banner cảnh báo Undo biến mất (không còn snapshot treo để cảnh báo) |
| Commit thất bại (`failed()`) | Lỗi ghi (VD quota, mạng) | KHÔNG đổi state in-memory nào; mở khóa lại 3 nút Lưu/xóa/Undo; báo lỗi trong khu vừa thao tác (không banner riêng) |
| Feedback "Đã ghi" đang hiện | Sau commit thành công | Tồn tại tới khi field trong khu đó bị sửa tiếp (không tự biến mất theo timer) |
| Khu 3 — đổi loại | Tap 1 trong 3 lựa chọn "Vật phẩm/Kỹ năng/Thức" | Form đổi theo loại; **draft của TỪNG loại giữ riêng** trong cùng lần mở panel — đổi qua lại không mất dữ liệu đã gõ |
| Khu 3 — "Chờ Đột Phá" khả dụng | Bất biến chéo D.2b thỏa (`current_exp == exp_threshold(level)` tại mốc tròn chục) | Lựa chọn "Chờ Đột Phá" bấm được |
| Khu 3 — "Chờ Đột Phá" bị chặn | Bất biến D.2b không thỏa | Lựa chọn mờ mực + lý do ngắn (VD "Cần EXP đạt đúng ngưỡng đột phá") |
| Danh sách entry rỗng | Slot chưa từng tạo entry custom nào | 1 dòng chữ nhạt "Chưa có vật phẩm/kỹ năng tùy chỉnh nào" — công thức empty-state chung toàn game (font prose, -1 bậc alpha, không icon/khung) |
| Entry xóa được | Entry thỏa D.5 (chưa từng dùng/tham chiếu) | Nút "Xóa" bấm được |
| Entry KHÔNG xóa được | Entry đã tham chiếu (equipped/resolved trong combat/xuất hiện World Memory) | Nút "Xóa" mờ mực + lý do ngắn (VD "Đã từng trang bị") |
| Field đang focus (bàn phím ảo mobile) | Tap vào 1 field | Ảnh hưởng luật tap-ngoài/Esc (2 bậc — lần 1 chỉ unfocus) |
| Khóa cứng combat | `in_combat=true` xảy ra TRƯỚC khi mở panel | Nút "Chỉnh sửa nhân vật" ở O-Set mờ mực — panel không mở được (không phải state của chính panel, liệt kê để đầy đủ ngữ cảnh) |

---

## Interaction Map

Mapping cho: Touch/Mouse hỗn hợp + bàn phím (không gamepad).

| Component | Input | Feedback tức thời | Outcome |
|---|---|---|---|
| Field nhập (level/exp/12 chỉ số/ID/tên...) | Gõ (tap để focus trên mobile) | Con trỏ nhấp nháy chuẩn; viền đỏ + text lỗi xuất hiện SAU blur nếu không hợp lệ (không khi đang gõ) | Giá trị giữ trong draft cục bộ của khu đó, chưa ghi gì cho tới khi bấm nút Lưu của khu |
| Segmented control (`state`, chọn loại Khu 3) | Tap/click 1 lựa chọn | Lựa chọn chuyển "đã chọn" (1 chấm mực đặc, cùng ngôn ngữ đã dùng ở O-Set S/M/L — không gạch chân, nghĩa đó đã bị hệ #12 chiếm) | Đổi form/field hiển thị tương ứng; KHÔNG tự submit |
| Nút "+ Thêm thức" | Tap/click | Thêm 1 dòng field tên thức mới ngay dưới dòng cuối | Chỉ thay đổi draft cục bộ Khu 3, chưa ghi gì |
| Nút xóa dòng thức (trong form đang tạo, KHÁC xóa entry đã lưu) | Tap/click | Gỡ dòng khỏi form; mờ mực nếu chỉ còn đúng 1 dòng (N≥1 cứng) | Chỉ thay đổi draft cục bộ |
| Nút "Lưu tiến trình" / "Lưu chỉ số" / "Lưu vật phẩm/kỹ năng" | Tap/click | Khóa NGAY toàn bộ 3 nút Lưu + mọi nút xóa + Undo (mờ 0.38) trong cửa sổ in-flight; `SUBMIT_DEBOUNCE_MS=500ms` per-nút | `committed()` → apply state, feedback "Đã ghi" trong khu đó (+ "Undo lượt trước đã khóa" nếu là hack-write đầu tiên); `failed()` → không đổi gì, báo lỗi trong khu đó, mở khóa lại |
| Nút "Xóa" (per-entry trong danh sách custom) | Tap/click | Cùng khóa in-flight như nút Lưu (Rule #6a1 áp dụng cho xóa) | Xóa thành công → entry biến mất khỏi danh sách, ID giải phóng; feedback "Đã ghi" (loại `delete`) |
| Nút X | Tap/click | Đóng ngay | Panel đóng, draft chưa Lưu bị bỏ (không cảnh báo) |
| Tap ngoài panel (field ĐANG focus) | Tap/click | Lần 1: chỉ unfocus/ẩn bàn phím ảo | Panel KHÔNG đóng ở lần 1 |
| Tap ngoài panel (field đã unfocus, hoặc không field nào focus) | Tap/click | Lần 2 (hoặc tap đầu nếu không có field focus): đóng panel | Draft chưa Lưu bị bỏ |
| Esc | Bàn phím | Cùng luật 2 bậc như tap ngoài | Như trên |
| Khu nhập (bàn phím) | Tab/Shift+Tab di chuyển focus | Focus ring 2px chuẩn (mục 9 Visual/Audio `core-ui-screen-navigation.md`) | Đủ mọi field/nút/nút-xóa theo thứ tự đọc, không keyboard trap |
| Field bất kỳ (bàn phím) | Enter | — | Submit KHU CHỨA field đó (tương đương bấm nút Lưu của khu, tôn trọng debounce) — áp dụng đồng nhất, kể cả field tên thức trong danh sách lặp lại (Enter KHÔNG thêm dòng mới — thêm dòng chỉ qua nút "+ Thêm thức" tường minh, tránh submit nhầm khi người chơi chỉ muốn thêm 1 dòng) |
| "Chờ Đột Phá" (segmented, đang mờ) | Tap/click | Không có gì xảy ra — lý do hiện sẵn cạnh lựa chọn (không cần hover) | Không hành động |
| Nút "Xóa" entry (đang mờ, đã tham chiếu) | Tap/click | Không có gì xảy ra — lý do hiện sẵn cạnh nút | Không hành động |

---

## Events Fired

*(Ghi chú: "event" ở đây là game-state signal nội bộ (Godot signal
bus) — dự án chưa cấu hình hệ analytics nào, cùng quy ước
`main-screen.md`.)*

| Player Action | Event Fired | Payload / Data |
|---|---|---|
| Lưu tiến trình (thành công) | `hack_progress_committed` | `level`, `current_exp`, `state` — nhãn nguồn `hack_write` (Rule #6c) |
| Lưu chỉ số (thành công) | `hack_stats_committed` | 12 `base_X0` — nhãn nguồn `hack_write` |
| Lưu vật phẩm/kỹ năng (thành công) | `hack_entry_created` | loại (`item`/`skill`/`thuc`), toàn bộ field theo schema — nhãn nguồn `hack_write` |
| Xóa entry custom (thành công) | `hack_entry_deleted` | `entry_id`, loại — nhãn nguồn `hack_write`, loại thao tác `delete` (Rule #11 "xóa là hack-write commit đầy đủ") |
| Đổi loại Khu 3 (Vật phẩm/Kỹ năng/Thức) | **Không có event** — chỉ đổi state cục bộ hiển thị form, không ghi world state | — |
| Thêm/xóa dòng thức trong form đang soạn | **Không có event** — cùng lý do trên (draft cục bộ) | — |
| Đóng panel (X/tap-ngoài/Esc) | **Không có event** — không ghi gì, draft bị bỏ | — |

**⚠️ Toàn bộ 4 event có tiền tố `hack_*` đều ghi trạng thái bền vững
(persistent)** — đây là điểm khác biệt lớn nhất với mọi UI khác trong
game: **cả 4** hành động ghi của panel này đều persistent (khác S2,
nơi chỉ 3/7 event ghi gì đó). Mỗi event PHẢI kèm entry log trạng thái
cơ học nhãn `hack_write` (Rule #6c, Required-for-MVP #6
`game-concept.md`) — để không bao giờ bị đọc nhầm thành "AI tự ý đổi
kết quả cơ học" (tiêu chí FAIL BLOCKING duy nhất của Core Hypothesis
MVP). Đây là điểm cần chú ý đặc biệt từ team kiến trúc khi implement.

---

## Transitions & Animations

**Screen enter/exit (mở/đóng panel)**: tái dùng đúng chữ ký
`overlay_settings` của `core-ui-screen-navigation.md` D.6/mục 2
Visual-Audio — **trượt dọc từ mép trên + fade**, KHÔNG mực loang.
Thời lượng = `transition_settings_ms` (registry, tier
`overlay_settings` — không đăng ký tier riêng cho O-Customize, dùng
chung giá trị đã khóa của Settings).

**Lý do tái dùng thay vì tạo chữ ký riêng**: Visual/Audio Requirements
của chính GDD hệ #16 đã cấm rõ "mực loang" (chữ ký `overlay_card`) cho
panel này — phần còn lại của thang D.6 chỉ có `overlay_settings` là
phi-diegetic sẵn có; tạo 1 chữ ký thứ 3 sẽ cần propagate sang
`core-ui-screen-navigation.md` D.6 (thêm tier mới, re-xác nhận
invariant thứ tự `banner ≤ overlay_settings ≤ overlay_card ≤ screen`)
— vượt phạm vi quyết định UI thuần túy của spec này. Flag ở Open
Questions để `technical-director`/`ux-designer` xác nhận có cần đăng
ký tier riêng hay dùng chung `overlay_settings` là đủ.

**In-screen state-change animations**:
- **Field lỗi xuất hiện/biến mất**: hard cut (viền đỏ + text lỗi
  hiện/ẩn ngay khi blur) — không cần animation, cùng "ngân sách hard
  cut hoặc fade ≤150ms" chung toàn UI (mục 9
  `core-ui-screen-navigation.md`).
- **Vào in-flight (bấm Lưu/Xóa)**: 3 nút Lưu + mọi nút xóa + Undo
  fade alpha xuống `0.38` ngay lập tức (đồng bộ với frame bấm — không
  cần animation riêng, giống cơ chế double-fire protection của D.1
  `write_action_allowed`).
- **Feedback "Đã ghi" xuất hiện**: fade-in ≤150ms trong khu vừa thao
  tác.
- **Feedback "Đã ghi" biến mất**: KHÔNG animation — biến mất ngay khi
  field trong khu đó bị sửa tiếp (không phải theo timer).
- **Banner cảnh báo khóa-Undo xuất hiện/biến mất**: fade ≤150ms, live
  re-evaluate cùng pattern Rule #1b (không cần đóng/mở lại panel).
- **Thêm dòng thức ("+ Thêm thức")**: fade-in ≤150ms cho dòng mới,
  không đẩy giật layout xung quanh (khu vực bên dưới trượt xuống mượt
  theo chiều cao dòng mới).
- **Xóa dòng thức (đang soạn) / xóa entry (đã lưu)**: fade-out ≤150ms
  trước khi gỡ khỏi layout — cùng chữ ký "không snap giữa 2 frame" đã
  khóa cho nút Undo ở `interaction-patterns.md` (`undo-button`).

**Reduced-motion**: ⚠️ cùng gap đã flag ở `main-screen.md` — GDD
nguồn chưa có toggle giảm chuyển động ở Settings MVP. Toàn bộ
animation trên O-Customize đều ngắn (≤150ms, không lặp liên tục như
nhịp thở `breathing-continue-line`) nên rủi ro thấp hơn S2, nhưng vẫn
nên nằm trong phạm vi toggle đó nếu được thêm sau này.

---

## Data Requirements

| Data | Nguồn hệ | Read/Write | Ghi chú |
|---|---|---|---|
| `level`, `current_exp`, `state` hiện tại (pre-fill Khu 1) | EXP & Realm Progression | Read | Đọc khi mở panel để pre-fill |
| Bộ ba `(level, current_exp, state)` | EXP & Realm Progression | Write | Giao dịch nguyên tử (Core Rule #10) — S2/HUD sau đó đọc lại giá trị mới |
| `tier` (derive real-time trong Khu 1) | EXP & Realm Progression (`tier_from_level`) | Read (derive, không ghi) | Không có field tier riêng — Core Rule #3 |
| `get_base_X0(char_id, X)` ×12 (pre-fill Khu 2) | Character Card & Identity | Read | Khi mở panel |
| 12 `base_X0` | Character Card & Identity | Write | All-12-or-nothing (Rule #4) |
| Danh sách `weapon_type` hợp lệ (dropdown Khu 3 Kỹ năng) | Equipment & Skill Data System | Read | Populate dropdown |
| Toàn bộ ID đã tồn tại (gốc + custom, cho uniqueness check) | Equipment & Skill Data System | Read | Runtime check khi submit (Formula 2 `is_valid_dataset`, Rule #5) |
| Danh sách skill đã tồn tại (dropdown "thuộc skill nào" — form Thức standalone) | Equipment & Skill Data System | Read | Gốc lẫn custom |
| Custom item/skill (N≥1 thức)/thức | Equipment & Skill Data System | Write | Theo schema hiện có |
| `known_skill_ids` | Equipment & Skill Data System | Write (khi xóa skill) | Gỡ ID khỏi danh sách CÙNG giao dịch với xóa (Rule #11) |
| Danh sách entry custom đã tạo trong slot (Khu 3, danh sách read-only) | Equipment & Skill Data System | Read | Hiển thị + kiểm điều kiện xóa (D.5) |
| Xóa entry custom | Equipment & Skill Data System | Write (delete) | Chỉ khi thỏa D.5 |
| `was_ever_equipped` / `was_ever_resolved_in_combat` | Equipment & Skill Data System | Read | Gate xóa item/skill (D.5) |
| Đã xuất hiện trong World Memory chưa | World Memory | Read | Gate xóa (Rule #11b, mọi loại entry) |
| `tm_state`, `is_death_turn` | Turn Manager | Read | Gate mở panel (D.1/#1b) — panel tự đọc lại nếu live re-evaluate cần (dù panel thường không mở được nếu các cờ này sai ngay từ đầu) |
| `in_combat` | Combat System | Read | Gate khóa cứng (Core Rule #9) |
| `undo_available` | Turn Manager (`undo_availability_window`) | Read | Hiện/ẩn banner cảnh báo khóa-Undo |
| `invalidate_pending_snapshot()` | Turn Manager / ADR-0004 | Write (gọi hàm) | Kích hoạt ở hack-write/xóa ĐẦU TIÊN trong cửa sổ Undo (Rule #6b) |
| Checkpoint ghi-bền-vững thứ 3 (write-through) | Persistence | Write | Mỗi submit thành công (Rule #6a) |
| `hack_mode_used_this_slot` | Persistence (slot bundle, ngoài mọi snapshot) | Write (chỉ set 1 lần, không bao giờ xóa) | Rule #8 |
| Entry log trạng thái cơ học, nhãn `hack_write` | Log trạng thái cơ học (Required-for-MVP #6) | Write | Mỗi submit/xóa thành công (Rule #6c) |
| Validate 5 formula D.1–D.5 (`is_valid_level_write`, `is_valid_progress_write`, `is_valid_base_stat_set`, `is_valid_custom_id`, `is_deletable_custom_entry`) | Chính hệ này (`character-customization-mode.md`) | Local (không phải "data" ngoài, nhưng là logic UI phải gọi trước khi submit) | Validate inline trong panel dùng đúng các formula này, không tự chế logic riêng |

**Lưu ý kiến trúc** (không phải quyết định UI): panel cần đọc dữ liệu
từ **6 hệ khác nhau** cùng lúc khi mở (EXP, Character Card, Equipment
& Skill, World Memory, Turn Manager, Combat) — nhiều hơn bất kỳ UI
spec nào khác đã viết. Thời điểm/thứ tự gọi các read này khi mở panel
(đồng bộ hay tuần tự, có cần loading state tạm thời nào không nếu 1
trong 6 lệnh đọc chậm) là quyết định kiến trúc, để `technical-director`
xác nhận khi vào `/create-architecture` — spec này chỉ định nghĩa UI
CẦN đọc gì.

---

## Accessibility

*(Chưa có `design/accessibility-requirements.md` — baseline đề xuất:
WCAG-AA. Xem Open Questions.)*

- **Keyboard-only navigation**: Tab/Shift+Tab đủ mọi field, segmented
  control, nút Lưu/Xóa/"+ Thêm thức", nút X — theo đúng thứ tự đọc
  (header → banner nếu có → Khu 1 → Khu 2 → Khu 3 → nút Lưu tương
  ứng mỗi khu). Enter trong field = submit khu chứa field đó. Esc/tap-
  ngoài theo luật 2 bậc (xem Interaction Map). Không keyboard trap.
- **Gamepad**: N/A — dự án không hỗ trợ gamepad (`technical-preferences.md`).
- **AT/Screen reader — khác ADR-0006**: toàn bộ input là Control
  chuẩn Godot (LineEdit/Button/OptionButton/segmented control), KHÔNG
  dùng kỹ thuật `RichTextLabel` meta-tag như tap-tên (nơi ADR-0006
  phải chấp nhận gap AT ngoài phạm vi MVP vì hạn chế kỹ thuật của
  chính kỹ thuật đó). Kể từ Godot 4.5+, AccessKit cung cấp AT support
  built-in cho Control chuẩn — O-Customize **có tiềm năng đạt AT
  support đầy đủ** nếu implementation dùng đúng Control chuẩn (không
  tự vẽ field bằng custom draw để giữ ngôn ngữ "công cụ"). Spec này
  KHÔNG tự nhận đã đạt AT support — chỉ ghi nhận tiềm năng, cần
  `godot-specialist` xác nhận khi vào `/create-architecture` (xem Open
  Questions). Tuân theo ADR-0006: không tuyên bố "đạt chuẩn WCAG 2.1
  AA" ở bất kỳ đâu (kể cả spec này) cho tới khi xác nhận thật.
- **Text contrast & cỡ chữ**: tuân 3 nấc `font_scale_steps`
  `{0.875, 1.0, 1.25}` (S/M/L) từ Settings — cùng cơ chế toàn game.
  **Lưu ý riêng**: vì panel dùng nền/màu khác hẳn theme chính (Visual/
  Audio Requirements GDD — "phá vỡ" chủ đích), giá trị contrast cụ thể
  CHƯA có số đo (khác S2, nơi `main-screen.md` đã tính sẵn theo
  `#F5EFE0`/`#2B2620`) — cần `art-director` xác nhận contrast ratio
  thật khi khóa token màu accent kỹ thuật (đã flag từ chính GDD, xem
  Open Questions).
- **Color-independent**: lỗi validate luôn kèm viền đỏ **+ text lỗi
  ngắn** (không chỉ màu) — đạt color-independence ngay từ Component
  Inventory. Trạng thái khóa in-flight/disabled dùng alpha (mờ mực
  0.38), không dùng màu — nhất quán chuẩn toàn game (mục 9
  `core-ui-screen-navigation.md`). Panel này KHÔNG dùng 2 màu accent
  đã khẩu phần hóa (đỏ son/xanh ngọc) cho bất kỳ mục đích nào (Visual/
  Audio Requirements GDD) — loại trừ luôn rủi ro nhầm lẫn màu với hệ
  quả thế giới thật.
- **Touch target**: `TOUCH_TARGET_MIN=44px` áp dụng cho MỌI field/nút
  độc lập trong panel (field nhập, nút Lưu/Xóa/X/"+ Thêm thức", từng
  lựa chọn trong segmented control) — không có ngoại lệ, đúng GDD
  ("cùng chuẩn toàn game, không có ngoại lệ cho panel 'kỹ thuật' này").
- **Reduced motion**: cùng gap đã flag ở `main-screen.md` (chưa có
  toggle Settings MVP) — rủi ro thấp hơn S2 vì O-Customize không có
  animation lặp liên tục nào (xem Transitions & Animations).

---

## Localization Considerations

**Ngoài phạm vi hiện tại**: cùng lý do đã ghi ở `main-screen.md` —
dự án đơn ngôn ngữ (tiếng Việt), không có kế hoạch đa ngôn ngữ
(`game-concept.md` Target Player Profile). Không có yêu cầu
localization thật cho O-Customize ở giai đoạn này.

**Ghi chú dự phòng** (nếu localize trong tương lai, không chặn MVP):
- **Nhãn 12 field chỉ số** (HP, ATK, DEF, SPD, ACC, Lifesteal, HP
  Regen, Crit Rate, Crit Damage, Khuếch đại sát thương, Chống chịu,
  Né tránh) — phần lớn đã là viết tắt gốc Latin, rủi ro layout thấp;
  riêng "Khuếch đại sát thương" và "Chống chịu" là cụm tiếng Việt dài
  nhất trong 12 nhãn, layout-critical nếu grid Khu 2 (desktop 2-3
  cột) có bề rộng cột cố định.
- **Nhãn segmented control** ("Tu Luyện Thường"/"Chờ Đột Phá", "Vật
  phẩm"/"Kỹ năng"/"Thức") — 3 lựa chọn Khu 3 chênh lệch độ dài lớn
  ("Thức" 1 âm tiết vs "Vật phẩm"/"Kỹ năng" 2 âm tiết) — HIGH PRIORITY
  nếu localize, vì mở rộng 40% (Anh/Pháp) có thể phá cân bằng chiều
  rộng 3 ô ngang hàng.
- **Tên entry custom (danh sách Khu 3)** — do người chơi tự đặt, độ
  dài KHÔNG kiểm soát được (không có giới hạn ký tự trong GDD) — danh
  sách phải tự xử lý wrap/truncate, không phải vấn đề dịch thuật
  nhưng cùng lớp rủi ro layout với text dài không đoán trước.
- **Banner cảnh báo khóa-Undo** — câu dài nhất trong toàn panel
  ("Lưu bất kỳ khu nào sẽ khóa vĩnh viễn Undo của lượt trước"), HIGH
  PRIORITY nếu localize vì đứng ở vùng cố định đầu panel, ít chỗ giãn
  nở dọc.

---

## Acceptance Criteria

- [ ] Mở panel từ O-Set (nút "Chỉnh sửa nhân vật"): panel hiện trong `transition_settings_ms`; cả 3 khu đã pre-fill ĐÚNG dữ liệu hiện tại (level/current_exp/state, 12 `base_X0`, danh sách entry custom) **trước khi panel render hoàn chỉnh** — không có khoảng trống/loading giữa chừng; 0 viền đỏ hiện trước khi người chơi chạm field nào
- [ ] Nút "Chỉnh sửa nhân vật" trong O-Set: mờ mực (không bấm được) khi `tm_state≠awaiting_action` HOẶC `in_combat=true`; ẩn hoàn toàn khi `toggle_enabled=false` HOẶC `screen≠S2` HOẶC `is_death_turn=true` — verify cả 5 điều kiện độc lập (mirror Core Rule #1b GDD)
- [ ] Đóng bằng nút X → panel đóng ngay lập tức, mọi draft chưa bấm Lưu bị bỏ, KHÔNG có state nào được ghi
- [ ] Tap ngoài panel khi có field đang focus → lần 1 CHỈ unfocus (ẩn bàn phím ảo), panel KHÔNG đóng; lần 2 (field đã unfocus) mới đóng panel
- [ ] Submit Khu 2 (12 chỉ số) khi thiếu đúng 1/12 field (bị xóa trống) → submit bị CHẶN, lỗi hiển thị đúng tại field thiếu, Khu 1 và Khu 3 không bị ảnh hưởng (mỗi khu là 1 giao dịch độc lập)
- [ ] Submit Khu 3 tạo Kỹ năng với 0 thức → bị CHẶN (N≥1 cứng); với 1–2 thức → submit THÀNH CÔNG kèm cảnh báo mềm "dưới số thức khuyến nghị" (không chặn) — verify đúng 2 ngưỡng khác nhau (mirror AC-38/AC-47 GDD)
- [ ] Khi `undo_available=true` lúc mở panel: banner cảnh báo khóa-Undo hiện NGAY đầu panel, trước cả Khu 1 — verify banner có mặt trước khi người chơi chạm bất kỳ field nào; sau khi bấm 1 nút Lưu bất kỳ và commit thành công → banner biến mất + dòng "Undo lượt trước đã khóa" xuất hiện trong feedback của khu vừa thao tác
- [ ] Trong cửa sổ in-flight (đã bấm 1 nút Lưu/Xóa, chưa nhận `committed()`/`failed()`): CẢ 3 nút Lưu + mọi nút Xóa + nút Undo đều mờ mực (0.38), không bấm được — verify bằng cả 2: (a) thao tác UI thật không phản hồi, (b) trạng thái khóa áp dụng ngay đồng bộ với frame bấm, không có cửa sổ hở nào
- [ ] Xóa 1 entry đã tham chiếu (`was_ever_equipped=true` hoặc đã xuất hiện World Memory) → nút "Xóa" mờ mực + hiển thị lý do ngắn, không xóa được; entry chưa tham chiếu → nút "Xóa" bấm được và xóa thành công, ID được giải phóng (dùng lại được ngay)
- [ ] Đổi loại Khu 3 qua lại (VD Vật phẩm → Kỹ năng → Vật phẩm) trong cùng 1 lần mở panel: dữ liệu đã gõ ở MỖI loại được giữ nguyên riêng biệt, không bị mất khi chuyển loại khác rồi quay lại
- [ ] (Bàn phím) Tab tới 1 field bất kỳ trong Khu 2 → Enter → CHỈ submit Khu 2 (không phải Khu 1/3); cùng test cho field ở Khu 1/Khu 3 — verify Enter luôn submit đúng khu CHỨA field đang focus
- [ ] (Bàn phím) Toàn bộ field/nút/segmented-option trong panel Tab-reachable theo đúng thứ tự đọc, không có keyboard trap; Esc theo đúng luật 2 bậc như tap-ngoài
- [ ] Mọi field/nút độc lập trong panel (không phải tap-target nhúng trong văn xuôi) đạt `hit_height ≥ 44px` VÀ `hit_width ≥ 44px` (D.4 nhóm b, không ngoại lệ)
- [ ] Bấm "+ Thêm thức" trong form tạo Kỹ năng → thêm 1 dòng field tên thức mới; khi chỉ còn đúng 1 dòng, nút xóa dòng đó mờ mực (không xóa được — N≥1 là invariant cứng, không được để 0 dòng)
- [ ] Vòng lặp đầy đủ: Lưu tiến trình với `level=15` → `committed()` → đóng panel (X) → mở lại panel → Khu 1 pre-fill ĐÚNG `level=15` (không phải giá trị cũ trước khi Lưu) — verify tương tự cho Khu 2 (1 chỉ số bất kỳ) và Khu 3 (entry vừa tạo xuất hiện trong danh sách)

---

## Open Questions

1. **`design/player-journey.md` chưa tồn tại** — thiết kế này dựa
   trên giả định về bối cảnh người chơi (Player Context on Arrival)
   thay vì hành trình đã map, cùng gap đã flag ở `main-screen.md`.
2. **Chữ ký chuyển cảnh cho O-Customize dùng chung `overlay_settings`,
   chưa đăng ký tier riêng** (owner: `technical-director`, target:
   trước khi implement) — `core-ui-screen-navigation.md` D.6 chỉ liệt
   kê 4 tier cố định (`banner`/`overlay_settings`/`overlay_card`/
   `screen`); spec này chọn dùng chung `overlay_settings` (xem
   Transitions & Animations) thay vì propagate 1 tier mới sang GDD đó.
   Cần xác nhận đây là quyết định cuối, hoặc có lý do cần tier riêng.
3. **Token màu accent kỹ thuật + contrast ratio thật chưa chốt**
   (owner: `art-director`, target: trước implement) — Visual/Audio
   Requirements GDD đã yêu cầu rõ art-director sign-off cho bề mặt
   DUY NHẤT được thiết kế "phá vỡ" theme gốc; spec này chỉ định nghĩa
   nguyên tắc (không dùng đỏ son/xanh ngọc, border thẳng góc vuông),
   chưa có mã màu/số contrast cụ thể.
4. **Tiềm năng AT/Screen-reader qua AccessKit (Godot 4.5+) chưa xác
   nhận** (owner: `godot-specialist`, target: khi vào
   `/create-architecture`) — spec này ghi nhận O-Customize dùng
   Control chuẩn (khác kỹ thuật `RichTextLabel` meta-tag của tap-tên,
   nơi ADR-0006 phải chấp nhận gap AT) nên CÓ THỂ đạt AT support tốt
   hơn phần lớn game, nhưng chưa được verify — không tự nhận đã đạt.
5. **`design/accessibility-requirements.md` chưa tồn tại** — tier
   accessibility chính thức của toàn dự án chưa định nghĩa, cùng gap
   đã flag ở `main-screen.md`. Baseline đề xuất: WCAG-AA.
6. **11 pattern mới trong Component Inventory chưa có trong
   `design/ux/interaction-patterns.md`** — xem Cross-Reference Check
   bên dưới.
7. **`valid_weapon_types` — danh sách loại vũ khí hợp lệ chưa được
   liệt kê cụ thể ở bất kỳ đâu** (owner: `game-designer`/
   `equipment-skill-data-system.md`, target: trước implement) —
   `equipment-skill-data-system.md` chỉ tham chiếu khái niệm
   "`valid_weapon_types` — toàn bộ loại vũ khí hợp lệ đã định nghĩa"
   (Formula 2, AC-09) nhưng không có bảng/enum cụ thể (VD Kiếm, Đao,
   Quyền...) — dropdown "Loại vũ khí" ở Khu 3 (form tạo Kỹ năng) cần
   nguồn dữ liệu này để populate, hiện chưa có nơi nào sở hữu danh
   sách đó. **Quyết định control type phụ thuộc câu trả lời này**:
   dropdown nếu danh sách >4-5 loại, segmented control (`tool-segmented-
   choice`) nếu ít hơn — chốt luôn khi `valid_weapon_types` được định
   nghĩa, không cần quay lại `/ux-design` riêng cho việc này.
8. **Pattern "danh sách lặp lại có thêm/xóa dòng" (`tool-repeatable-list`,
   dùng cho danh sách thức khi tạo Kỹ năng) là quyết định UX của spec
   này, không có đặc tả tương đương trong GDD nguồn** — GDD chỉ nói
   "kèm tối thiểu 1 thức trong cùng form", không đặc tả cơ chế
   thêm/bớt. **Đã xác nhận qua `/ux-review` 2026-08-13**: giải pháp
   (nút "+ Thêm thức" tường minh, N≥1 cứng, Enter không thêm dòng) hợp
   lý và không tìm thấy vấn đề — giữ nguyên, không cần quay lại
   `/ux-design`.
