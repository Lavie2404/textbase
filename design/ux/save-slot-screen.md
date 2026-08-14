# UX Spec: Save Slot Screen (S1)

> **Status**: Approved (`/ux-review` 2026-08-14 — NEEDS REVISION 1 blocking + 4 advisory; blocking + 2 advisory cục bộ vá cùng phiên → APPROVED; 2 advisory hệ thống còn lại xem Ghi chú treo session state)
> **Author**: user + ux-designer
> **Last Updated**: 2026-08-14
> **Journey Phase(s)**: unknown — no player-journey.md
> **Template**: UX Spec

---

## Purpose & Player Need

Save Slot Screen là **ngăn kéo đựng những cuốn nhật ký** — màn hình đầu
tiên mỗi lần mở game (Core Rule #2: S1 là gốc), nơi người chơi: (a) rút
cuốn sổ đang viết dở ra viết tiếp ("Tiếp tục"), (b) mở lại một cuốn đã
khép để đọc ("Xem lại" — đời đã kết thúc vì chết hoặc hết chỗ chứa),
(c) đặt một cuốn sổ trắng mới lên bàn ("Bắt đầu mới"), và (d) trông coi
kho sổ của mình — chép lại (export) đề phòng trình duyệt tự xóa, hoặc
xóa hẳn một cuốn.

Vai trò (d) nặng hơn vẻ ngoài của nó: save nằm per-device trong trình
duyệt, có thể bị xóa ngoài ý muốn (Safari ITP ~7 ngày không tương tác) —
S1 là **bề mặt phòng thủ dữ liệu duy nhất** của game, nơi duy nhất có
gợi ý chủ động "chép lại trước khi mất" và nơi duy nhất người chơi thấy
được một cuốn sổ đã "phai mực" (hỏng không đọc được).

**Nếu thiếu màn hình này**: không tồn tại đường đi nào từ lúc mở game
đến lượt chơi đầu tiên (GDD hệ #15 nói thẳng điều này về cả hệ — S1 là
cánh cửa đầu tiên của chuỗi đó); nhiều đời chơi không thể cùng tồn tại;
và mất dữ liệu do trình duyệt trở thành mất trắng không có phòng bị.

**"Người chơi arrives wanting to ___"**: phần lớn thời gian — *tiếp tục
đời đang chơi càng nhanh càng tốt* (đường nóng số 1, phải đạt được trong
1 tap); thỉnh thoảng — bắt đầu lại, đọc lại đời cũ, hoặc dọn dẹp/sao lưu
kho sổ.

**Vai trò onboarding đặc biệt** (lần đầu mở app): S1 là nơi hỏi cỡ chữ
chủ động (dòng mời ghim đầu danh sách, lặp lại tới khi người chơi thực
sự chọn — Visual/Audio mục 4) — vì Settings nằm sau 「Mục」 theo quy ước
marginalia người mới chưa học, đây là đường duy nhất đảm bảo người thị
lực kém tìm thấy tính năng cỡ chữ.

---

## Player Context on Arrival

- **Lần đầu gặp**: giây đầu tiên của toàn bộ trải nghiệm — S1 là màn
  hình đầu tiên người chơi từng thấy (trước cả khi biết game vận hành
  thế nào). Thiết kế phải chịu được vai "màn chào sân" dù bản chất là
  màn quản lý: lần đầu chỉ có "Bắt đầu mới" + dòng mời cỡ chữ.
  (Ink-reveal onboarding 3 bút tích KHÔNG thuộc S1 — GDD Visual/Audio
  mục 1 gắn nó vào lần đầu S2 render, xem `main-screen.md`.)
- **4 ngữ cảnh đến, cảm xúc rất khác nhau**:
  1. **Mở app (cold open — thường gặp nhất)**: bị game "đưa tới" (S1
     luôn là gốc). Tâm trạng: mong vào chơi ngay — mọi ma sát thêm ở
     đây là ma sát trước cửa. Đường nóng "Tiếp tục" phải nổi bật, 1 tap.
  2. **Từ S2 quay về** (「Mục」→ "Về danh sách sổ", chỉ khi
     `awaiting_action`): chủ động — muốn đổi sổ, xem sổ khác, hoặc dọn
     dẹp. Tâm trạng: bình tĩnh, admin.
  3. **Từ S5 (màn 3 lối) quay về**: người chơi **vừa chết thật**. Tâm
     trạng: nặng — vừa mất một đời nhân vật. S1 lúc này hiện cuốn sổ
     vừa khép (khử bão hòa + con dấu `death`) nằm trong danh sách; màn
     hình không cần "chia buồn" thêm (đã có nghi thức ở S5), nhưng
     tuyệt đối không được vui vẻ/khuyến mại kiểu app ("Chơi ngay!").
  4. **Từ S4-RO thoát về** (đọc xong đời cũ, `origin_screen=S1`): hoài
     niệm, bình tĩnh.
- **Ngữ cảnh lỗi chồng lên bất kỳ nhánh nào**: đến S1 và thấy banner
  (version mismatch khi load / multi-tab conflict / cảnh báo quota)
  hoặc thấy 1 slot "phai mực" — thiết kế phải cho các tín hiệu này đủ
  chỗ mà không phá đường nóng "Tiếp tục".
- **Tự nguyện hay bị đưa tới**: cold open = bị đưa tới (mặc định hệ
  thống); 3 nhánh còn lại = tự nguyện.

---

## Navigation Position

S1 là **gốc của toàn bộ đồ thị điều hướng** (Core Rule #2) — mọi phiên
chơi bắt đầu ở đây, và mọi đường "thoát ra ngoài" từ các màn khác đều đổ
về đây. Trong D.2, S1 có 2 cạnh đi ra (S1→S2, S1→S4-RO) và 3 cạnh đổ về
(S2→S1 có gate, S5→S1, S4-RO→S1 khi `origin_screen=S1`). Overlay mở
được từ S1: **O-Set** (qua 「Mục」) và **O-ConfirmDelete** (nguồn mở hẹp
nhất — CHỈ từ S1). O-Card **không** mở được từ S1 (Core Rule #8 — không
có văn tường thuật/tên để tap ở đây).

**Nội dung menu 「Mục」 tại S1**: chỉ còn 1 mục "Cài đặt" — mục "Về danh
sách sổ" vắng mặt hoàn toàn (không mờ mực) vì đã đứng ở đó rồi; đúng
luật "không áp dụng về cấu trúc → ẩn hoàn toàn, không ghost"
(Visual/Audio mục 1) và đúng tiền lệ S5 (「Mục」 chỉ còn "Về danh sách
sổ" — bút tích không đổi hình, chỉ nội dung menu đổi).

---

## Entry & Exit Points

| Entry Source | Trigger | Player carries this context |
|---|---|---|
| Mở app (cold open) | Tự động — S1 luôn là màn đầu | Không có gì — trạng thái sạch; nếu lần đầu trên thiết bị: dòng mời cỡ chữ + ink-reveal |
| S2 | 「Mục」→ "Về danh sách sổ" (chỉ khi `tm_state=awaiting_action` — D.1) | Slot vừa rời vẫn "đang chơi dở" — auto-save đã lo, không có khái niệm "chưa lưu" |
| S5 (màn 3 lối) | "Về danh sách sổ" | Vừa chết thật; slot vừa khép hiện trong danh sách với con dấu `death` |
| S4-RO | Nút thoát "« về danh sách sổ" (khi `origin_screen=S1`) | Vừa đọc xong 1 đời cũ |

| Exit Destination | Trigger | Notes |
|---|---|---|
| S2 | "Tiếp tục" (slot đang chơi) / "Bắt đầu mới" | Page-flip 260ms; guard tầng màn hình luôn `true` — slot hợp lệ hay không là việc của Persistence: load fail → **ở lại S1** + banner (version mismatch / multi-tab) |
| S4-RO | "Xem lại" (slot đã khép) | Read-only; thoát sẽ về lại đúng S1 |
| O-Set | 「Mục」→ "Cài đặt" | Overlay, không rời S1 |
| O-ConfirmDelete | "Xóa" trên 1 hàng slot (mọi trạng thái slot) | Overlay, không rời S1; 2 biến thể xác nhận (thường/escalated) |
| **Không có exit một chiều ở tầng điều hướng** | — | Nhưng 2 hành động **một chiều ở tầng dữ liệu**: xác nhận Xóa (mất vĩnh viễn slot) và "Khép quyển sổ này lại" (escalation ghi-thất-bại, Core Rule #10 Persistence) — cả 2 đều qua O-ConfirmDelete, không bao giờ 1-tap |

---

## Layout Specification

### Information Hierarchy

(trên → dưới đúng thứ tự ưu tiên)

1. **(điều kiện) Banner** — đỉnh màn hình, dải giấy ngang (3 nguồn tại
   S1: load bị từ chối version-mismatch, xung đột đa-tab, cảnh báo
   quota; tối đa 1, hàng chờ FIFO + ngoại lệ preempt đã khóa ở GDD §5).
2. **Chrome mỏng đầu màn hình**: chỉ 1 bút tích 「Mục」 (lề phải, nhất
   quán vị trí lề phải của S2) — 「Thẻ」「Lục」 **ẩn hoàn toàn** tại S1
   (không áp dụng về cấu trúc: chưa có slot nào mở nên không có "thẻ
   bản thân"/"nhật ký" để trỏ tới; đúng luật ẩn-không-ghost).
3. **(điều kiện) Dòng mời cỡ chữ** — ghim cố định dưới chrome, TRÊN
   "Bắt đầu mới", không cuộn lẫn trong danh sách (GDD khóa vị trí +
   luật bootstrapping: alpha 1.0, glyph ≥ nấc M bất kể theme_scale,
   3 tap target ≥44px, lặp lại tới khi thực sự chọn).
4. **"Bắt đầu mới"** — ghim đầu danh sách (gáy nét đứt nhạt, "cuốn sổ
   trắng chưa viết").
5. **Danh sách slot** — sort theo **lần lưu cuối giảm dần**, không phân
   nhóm; cuộn dọc, virtualized. Trong mỗi hàng, ưu tiên đọc: **tên nhân
   vật** (chính) → cảnh giới + số lượt (world_time) → lần lưu cuối
   (+ dòng nhắc "chép lại" nhạt khi ≥ `EXPORT_NUDGE_DAYS=5` ngày) →
   hành động theo trạng thái.
6. **Empty state** (0 slot) — thay danh sách bằng 2 dòng căn giữa: dòng
   chính đã khóa "Chưa có sổ nào — hãy bắt đầu cuốn đầu tiên" + dòng
   phụ nhạt hơn "mỗi cuốn sổ chỉ thuộc về nơi nó được viết"; "Bắt đầu
   mới" VẪN hiển thị phía trên (empty state giải thích danh sách trống,
   không thay CTA).

### Layout Zones

(1 cột, mọi viewport — S1 không có lý do 2 cột)

| Zone | Nội dung | Ghi chú |
|---|---|---|
| Banner (transient) | 1 banner text | Đè trên cùng, đẩy nội dung xuống (không overlay che) |
| Chrome | 「Mục」 lề phải | Mỏng, marginalia Họ A |
| Pinned (điều kiện) | Dòng mời cỡ chữ | Chỉ khi `font_size_setting` chưa tồn tại |
| List (cuộn) | "Bắt đầu mới" + hàng slot gáy-sách | Virtualized; safe-area insets đáy |
| Empty (thay List) | 2 dòng lặng lẽ | Khi 0 slot |

**Ghi chú lớp backup GitHub (hybrid — chỗ mở)**: hành động "Chép lại
quyển sổ" trong spec này là export local (artifact 9b); khi ADR lớp
backup GitHub được viết (hàng đợi `technical-director` — quyết định
hybrid 2026-08-14, xem session state), hành động này có thể nhận thêm
đích đến thứ 2 — spec này không thiết kế trước UI đó, chỉ ghi nhận điểm
nối.

### Component Inventory

| Zone | Component | Loại | Nội dung | Interactive? | Pattern |
|---|---|---|---|---|---|
| Banner | Dải giấy banner | Text strip + X | Văn bản diegetic từ Error Taxonomy Persistence (3 nguồn tại S1) | Có — X dismiss | **MỚI**: `paper-strip-banner` |
| Chrome | Bút tích 「Mục」 | Text link nhẹ (Họ A) | 「Mục」 | Có — mở menu 1 mục "Cài đặt" | `marginalia-nav-link` + **MỚI**: `marginalia-menu` (popup nhỏ neo cạnh bút tích — dùng chung S1/S2/S5, nội dung theo màn) |
| Pinned | Dòng mời cỡ chữ | Text + 3 tap target S/M/L | "Chọn cỡ chữ để đọc thoải mái:" + 3 ô glyph mẫu | Có — chọn nấc → ghi `font_size_setting`, dòng biến mất vĩnh viễn | `tool-segmented-choice` (biến thể bootstrapping: alpha 1.0, glyph ≥ nấc M cố định — KHÔNG theo theme_scale) |
| List | "Bắt đầu mới" | Hàng gáy nét đứt nhạt | Nhãn "Bắt đầu mới" | Có — tạo slot → S2 | **MỚI**: `slot-spine-row` (biến thể "sổ trắng") |
| List | Hàng slot **đang chơi** | Gáy sách + dog-ear mép phải | Tên (chính) · cảnh giới · N lượt · lần lưu cuối; text links phụ: "Chép lại · Xóa" (+ "Khép quyển sổ này lại" CHỈ khi escalation ghi-thất-bại, Core Rule #10 Persistence) | Tap hàng = **Tiếp tục**; links phụ vùng chạm 44px riêng | `slot-spine-row` |
| List | Hàng slot **đã khép** | Khử bão hòa toàn hàng + con dấu góc phải (nội dung con dấu phân biệt `death`/`quota_exhausted` bằng CHỮ) | Như trên | Tap hàng = **Xem lại** (S4-RO); "Chép lại · Xóa" (Xóa → escalated) | `slot-spine-row` (biến thể khép) |
| List | Hàng slot **phai mực** | Con dấu "?" mực nhòe; metadata thay bằng "Trang này đã phai mực" | — | Tap hàng = không hành động; CHỈ link "Xóa" | `slot-spine-row` (biến thể hỏng) |
| List | Dòng nhắc chép lại | 1 dòng chữ nhạt trong hàng slot | *"Lâu chưa mở lại — cân nhắc chép lại quyển sổ"* (copy NHÁP chờ `writer`; hiện khi ≥ `EXPORT_NUDGE_DAYS=5` ngày) | Có — tap = kích hoạt luôn "Chép lại" | Thuộc spec `slot-spine-row` |
| Empty | 2 dòng lặng lẽ | Text tĩnh căn giữa | "Chưa có sổ nào — hãy bắt đầu cuốn đầu tiên" (copy đã khóa GDD §8) + dòng phụ nhạt "mỗi cuốn sổ chỉ thuộc về nơi nó được viết" | Không | Công thức empty-state chung (GDD §8) |
| O-ConfirmDelete | Dialog xác nhận xóa | Overlay 2 biến thể | (a) thường: 1 dòng + Hủy/Xóa; (b) escalated: + tên tham chiếu + ô nhập (khớp NFC/trim/case-insensitive, literal "XÁC NHẬN" nếu tên rỗng) + nút Xóa chỉ active khi khớp | Có | `tool-field-input` (ô nhập); layout PHẢI lọt vùng viewport trừ bàn phím ảo (~40-50% chiều cao — GDD khóa) |

Chữ cụ thể trong con dấu phân biệt `death`/`quota_exhausted`: quyết định
`art-director`/`writer` — spec chỉ khóa nguyên tắc "phân biệt bằng chữ,
không màu, không icon".

### ASCII Wireframe

```
┌─────────────────────────────────────┐
│ ⚠ Trình duyệt sắp hết chỗ chứa… [X] │ ← banner (điều kiện)
│                          「Mục」    │ ← chrome mỏng
│ Chọn cỡ chữ để đọc thoải mái:       │ ← dòng mời (điều kiện)
│   [ S ]   [ M ]   [ L ]             │
├─────────────────────────────────────┤
│ ╎ Bắt đầu mới                       │ ← gáy nét đứt
│ ┃▐ Lâm Phong — Luyện Khí t.3        │ ← đang chơi (dog-ear ⌐)
│ ┃▐ 214 lượt · lưu 2 giờ trước    ⌐ │
│ ┃▐   Chép lại · Xóa                 │
│ ┃▒ Vô Danh — Trúc Cơ t.1      [Vong]│ ← đã khép (khử bão hòa, con dấu)
│ ┃▒ 892 lượt · lưu 12 ngày trước     │
│ ┃▒   Lâu chưa mở lại — cân nhắc     │
│ ┃▒   chép lại quyển sổ              │
│ ┃▒   Chép lại · Xóa                 │
│ ┃? Trang này đã phai mực            │ ← hỏng
│ ┃?   Xóa                            │
└─────────────────────────────────────┘
```

`┃` = gáy đậm; `▐`/`▒` = bìa thường/khử bão hòa; `[Vong]` = con dấu chữ
(minh họa — chữ thật chờ art-director/writer); tên/cảnh giới trong
wireframe là dữ liệu ví dụ.

---

## States & Variants

| State / Variant | Trigger | What Changes |
|---|---|---|
| Default (có slot) | Mở S1 bình thường | Baseline — danh sách sort lưu-gần-nhất trước |
| Chưa chọn cỡ chữ | `font_size_setting` chưa tồn tại trong `app_config` | Dòng mời cỡ chữ ghim hiện (render cố định nấc M, alpha 1.0); **lặp lại mỗi lần mở S1 tới khi người chơi thực sự CHỌN** (GDD khóa ngữ nghĩa trigger); chọn xong → biến mất vĩnh viễn |
| Empty (0 slot) | Chưa có slot nào / đã xóa hết / thiết bị mới | 2 dòng lặng lẽ thay danh sách; "Bắt đầu mới" VẪN hiện; dùng CHUNG 1 empty state cho mọi nguyên nhân (GDD §8 — không phân biệt giả) |
| Escalation ghi-thất-bại | Persistence Core Rule #10 kích hoạt trên 1 slot | Hàng slot đó thêm link "Khép quyển sổ này lại" (mở O-ConfirmDelete biến thể riêng) |
| Nhắc chép lại | Khoảng cách từ lần lưu cuối ≥ `EXPORT_NUDGE_DAYS=5` ngày | Dòng nhắc nhạt hiện trong hàng slot tương ứng (per-row, có thể nhiều hàng cùng lúc) |
| Banner: load bị từ chối | `LOAD_REJECTED_VERSION_MISMATCH` khi tap "Tiếp tục"/"Xem lại" | **Ở lại S1** (không page-flip), banner hiện đỉnh màn |
| Banner: xung đột đa-tab | `MULTI_TAB_CONFLICT` khi mở slot đang bị tab khác giữ quyền ghi | Ở lại S1, banner hiện; slot không mở |
| Banner: cảnh báo quota | `warn_triggered(origin)=1` | Banner không chặn, copy đã khóa ở GDD Persistence ("…cân nhắc chép lại một quyển sổ cũ trước khi xóa…") |
| O-ConfirmDelete mở | "Xóa" (mọi trạng thái slot) / "Khép quyển sổ này lại" | 2 biến thể thường/escalated; nền S1 giữ nguyên vị trí cuộn |
| Không có loading state | — | Dữ liệu local <100ms; mốc pass: page-flip kết thúc = màn đích đã render đủ (khớp AC `main-screen.md`); load fail → ở lại S1 + banner, KHÔNG có spinner |

---

## Interaction Map

Input: Touch/Mouse mixed, không gamepad (`technical-preferences.md`).

| Component | Action | Feedback | Outcome |
|---|---|---|---|
| Hàng slot đang chơi | Tap/click (bất kỳ đâu trừ vùng links phụ) | Pressed đậm mực | Load → page-flip 260ms → S2; load fail → **ở lại S1** + banner |
| Hàng slot đã khép | Tap/click | Pressed | Page-flip → S4-RO (read-only) |
| Hàng phai mực | Tap/click | **Không phản hồi** (không có hành động chính — cùng nguyên tắc tap-tên `card_exists=false`) | Không hành động |
| "Bắt đầu mới" | Tap/click | Pressed | Tạo slot mới → page-flip → S2 (cold-start: AI viết đoạn mở) |
| Link "Chép lại" | Tap/click | Pressed; sau khi xong: 1 dòng nhạt "Đã chép lại quyển sổ" tại hàng (không timer, biến mất khi rời màn) | Sinh artifact 9b (bản đọc được tiếng Việt) — cơ chế tải file thuộc Persistence |
| Link "Xóa" | Tap/click | Pressed | Mở O-ConfirmDelete: biến thể **thường** (đang chơi/phai mực) hoặc **escalated** (đã khép) |
| Link "Khép quyển sổ này lại" | Tap/click | Pressed | Mở O-ConfirmDelete biến thể escalation-close (riêng, không phải "Xóa") |
| Dòng nhắc chép lại | Tap/click | Pressed | = kích hoạt "Chép lại" |
| 「Mục」 | Tap/click | Pressed | Mở `marginalia-menu` (S1: 1 mục "Cài đặt") → chọn → O-Set |
| Dòng mời cỡ chữ (3 ô S/M/L) | Tap/click 1 ô | Pressed; toàn UI re-render cỡ mới ngay | Ghi `font_size_setting`; dòng mời fade-out ≤150ms, không bao giờ hiện lại |
| Banner [X] | Tap/click | — | Dismiss; banner kế tiếp trong hàng chờ (nếu có) hiện |
| O-ConfirmDelete (thường) | Tap Hủy/Xóa; Esc = Hủy | Pressed | Xóa → hàng slot fade-out, danh sách khép lại mượt |
| O-ConfirmDelete (escalated) | Focus TỰ ĐỘNG vào ô nhập khi mở (GDD khóa); gõ tên; Enter = submit khi khớp; Esc = Hủy | Nút "Xóa" mờ mực tới khi chuỗi khớp (NFC/trim/case-insensitive) | Khớp + Xóa → xóa vĩnh viễn |

**Bàn phím-only**: Tab order = banner X (nếu có) → 「Mục」 → 3 ô cỡ chữ
(nếu có) → "Bắt đầu mới" → từng hàng slot theo thứ tự danh sách (mỗi
hàng: thân hàng → links phụ trái-sang-phải). Enter/Space kích hoạt.
⚠️ Implementation note: danh sách virtualized phải giữ focus hợp lệ khi
hàng bị recycle — không được để focus "rơi" vào node đã gỡ.

---

## Events Fired

| Player Action | Event | Payload |
|---|---|---|
| Tap hàng đang chơi / "Bắt đầu mới" | `slot_load_requested` / `slot_create_requested` | `{slot_id}` / — |
| Tap hàng đã khép | `slot_review_opened` | `{slot_id}` |
| Chép lại | `slot_exported` | `{slot_id}` — **không bao giờ** chứa nội dung save trong payload |
| Xác nhận xóa thành công | `slot_deleted` | `{slot_id, was_escalated: bool}` — ghi-trạng-thái vĩnh viễn, cần chú ý architecture |
| "Khép quyển sổ này lại" xác nhận | `slot_closed_by_escalation` | `{slot_id}` |
| Chọn cỡ chữ lần đầu | `font_scale_changed` | `{setting}` — CÙNG event đã định nghĩa ở `settings.md`, không tạo event riêng |
| Mở menu 「Mục」/ O-Set | `settings_opened` | Tái dùng event `main-screen.md` |
| Dismiss banner | Không có event | Chỉ trạng thái hiển thị cục bộ |

---

## Transitions & Animations

- **Cold open**: S1 render thẳng khi mở app — không có màn nào trước
  nó, không transition vào.
- **S1 → S2 / S4-RO**: page-flip tiến (lật từ phải),
  `transition_screen_ms=260ms`. **Về S1** (từ S2/S5/S4-RO): lật lùi từ
  trái — đúng luật "hướng lật mã hóa chiều điều hướng" (D.6 mục 2).
- **Banner**: fade + rơi nhẹ 1 nấc từ đỉnh, `transition_banner_ms=120ms`;
  dismiss = fade ngược.
- **O-Set**: trượt dọc từ mép trên + fade, 150ms (đã đặc tả ở
  `settings.md`).
- **O-ConfirmDelete**: đề xuất dùng CHUNG chữ ký + thời lượng
  `overlay_settings` (trượt dọc + fade, 150ms) — dialog phi-diegetic
  cùng họ "công cụ"; ⚠️ D.6 chưa gán tier tường minh cho O-ConfirmDelete
  (GDD bổ sung overlay này sau khi D.6 đã khóa 4 tier) — cùng loại câu
  hỏi với O-Customize đang treo, gộp chung cho `technical-director`
  (xem Open Questions).
- **Xóa slot thành công**: hàng fade-out ≤150ms rồi gỡ khỏi layout,
  danh sách khép lại mượt (không snap) — cùng ngôn ngữ "ngay cả sự vắng
  mặt cũng được viết ra" (mục 12).
- **Dòng mời cỡ chữ biến mất** (sau khi chọn): fade ≤150ms.
- **Reduced motion**: N/A ở MVP; mọi animation ≤260ms, không lặp —
  riêng banner là chuyển động "rơi" duy nhất, 1 lần, biên độ 1 nấc nhỏ.

---

## Data Requirements

| Data | Source System | Read/Write | Notes |
|---|---|---|---|
| Danh sách slot + metadata mỗi slot (tên, cảnh giới, world_time, lần lưu cuối, trạng thái, `slot_closure_reason`, `error_code`) | Persistence | Read | UI không suy diễn trạng thái — đọc nguyên trạng từ Persistence |
| Cờ escalation ghi-thất-bại per slot (Core Rule #10) | Persistence | Read | Quyết định link "Khép quyển sổ này lại" có render không |
| `warn_triggered(origin)` | Persistence Formula #3 | Read | Kích banner quota |
| Lệnh load / create / delete / export / close-slot | Persistence | Write (qua API Persistence) | UI chỉ phát yêu cầu — mọi ghi thật thuộc Persistence; **xóa là ghi-vĩnh-viễn** |
| `font_size_setting` | `app_config` | Read + Write | CÙNG field với `settings.md` — 1 nguồn sự thật, 2 bề mặt ghi |
| Đồng hồ hiện tại (tính "lưu N giờ/ngày trước" + ngưỡng nhắc) | Client clock | Read | Sai lệch đồng hồ chỉ ảnh hưởng hiển thị tương đối — chấp nhận |
| `EXPORT_NUDGE_DAYS` | **Tuning knob MỚI do spec này đặt** — mặc định 5, safe range 3-6 (phải < ~7 ngày ITP) | Read | Cần đăng ký vào registry khi implement (xem Open Questions) |

Không có dữ liệu real-time; không data nào do UI sở hữu.

---

## Accessibility

*(Tuân `design/accessibility-requirements.md` — tier Basic + mục
Standard đã đạt. S1 chứa **tính năng accessibility quan trọng nhất toàn
game**: dòng mời cỡ chữ bootstrapping.)*

- **Dòng mời cỡ chữ — luật bootstrapping BẮT BUỘC** (GDD khóa, nhắc lại
  vì là ràng buộc accessibility nặng nhất của màn này): tự đạt alpha
  1.0 (mực đầy, KHÔNG ngôn ngữ marginalia nhạt), glyph ≥ cỡ thân văn
  nấc M **bất kể** `theme_scale` hiện hành, 3 tap target ≥44px —
  affordance dẫn tới tính năng accessibility phải tự đạt ngưỡng
  accessibility ở cấu hình mặc định.
- **Keyboard-only**: Tab order đã định ở Interaction Map;
  O-ConfirmDelete escalated autofocus ô nhập, Enter/Esc chuẩn; không
  keyboard trap; chú ý giữ focus qua virtualize.
- **AT/Screen reader**: cùng tình trạng toàn dự án — Control chuẩn
  nhưng AccessKit không chạy trên Web export; không claim AT support.
- **Color-independent**: 3 trạng thái slot phân biệt bằng **hình khối +
  chữ**, không màu — dog-ear (đang chơi) vs bìa phẳng + con dấu CHỮ (đã
  khép, nội dung con dấu phân biệt `death`/`quota_exhausted`) vs con
  dấu "?" + text "Trang này đã phai mực" (hỏng); khử bão hòa -40% giữ
  nguyên lightness (GDD khóa) nên không đụng contrast ratio.
- **Contrast**: token theme chính (`#F5EFE0`/`#2B2620`) — không theme
  riêng, không gap mới.
- **Touch target**: hàng slot ≥44px (thực tế ~72-88px); links phụ trong
  hàng có vùng chạm 44px vô hình mở rộng; khoảng cách các links phụ
  liền kề tôn trọng `MIN_ADJACENT_GAP_PX=4px`.
- **Reduced motion**: N/A MVP — không animation lặp nào ở S1.

---

## Localization Considerations

**Ngoài phạm vi hiện tại** (đơn ngôn ngữ — cùng lý do các spec trước).
Ghi chú dự phòng:

- **"Khép quyển sổ này lại"** — nhãn hành động dài nhất toàn màn (5 âm
  tiết), nằm trong hàng slot chật — HIGH PRIORITY nếu dịch (tiếng Anh/
  Pháp dễ dài hơn 40%).
- **Thời gian tương đối** ("lưu 2 giờ trước" / "12 ngày trước") — cần
  locale formatting nếu dịch; hiện chỉ tiếng Việt.
- **Copy empty state 2 dòng + copy dòng nhắc chép lại** — văn diegetic,
  dịch cần giữ giọng nhật ký, không dịch máy.
- **Tên nhân vật trong hàng + trong O-ConfirmDelete escalated** — do
  người chơi/AI đặt, độ dài không kiểm soát: hàng phải truncate có
  ellipsis; ô nhập so khớp dùng chuỗi ĐẦY ĐỦ (truncate chỉ ở hiển thị,
  không ở so sánh).

---

## Acceptance Criteria

- [ ] Mở app (cold open): S1 render hoàn chỉnh với danh sách + metadata
      đúng, dữ liệu sẵn sàng <100ms (local); không loading screen/
      spinner ở bất kỳ nhánh nào.
- [ ] Danh sách sort đúng theo lần lưu cuối giảm dần; sau khi chơi 1
      lượt ở slot B rồi quay về S1, slot B đứng đầu danh sách (trên
      slot A lưu cũ hơn).
- [ ] Tap thân hàng slot đang chơi → page-flip 260ms → S2 đúng slot đó,
      S2 đã render đủ khi animation kết thúc; tap thân hàng slot đã
      khép → S4-RO đúng slot, thoát S4-RO quay về đúng S1.
- [ ] Hàng phai mực: tap thân hàng KHÔNG có phản hồi/hành động; chỉ
      link "Xóa" khả dụng, dùng xác nhận 1 bước thường.
- [ ] Xóa escalated (slot đã khép): gõ sai tên → nút "Xóa" mờ mực,
      không bấm được; gõ đúng tên với khác hoa-thường + khoảng trắng
      thừa đầu/cuối + dạng NFC khác → nút active (chuẩn hóa đúng); xóa
      xong hàng fade-out ≤150ms rồi danh sách khép mượt.
- [ ] Link "Khép quyển sổ này lại" CHỈ render khi cờ escalation
      ghi-thất-bại của slot đó =true; mở O-ConfirmDelete biến thể riêng
      (không phải biến thể "Xóa").
- [ ] Dòng mời cỡ chữ: hiện khi `font_size_setting` chưa tồn tại;
      render cố định nấc M + alpha 1.0 bất kể theme_scale; bỏ qua không
      chọn → hiện lại lần mở S1 kế tiếp; chọn 1 nấc → toàn UI re-render
      ngay, field được ghi, dòng mời không bao giờ hiện lại.
- [ ] Dòng nhắc chép lại: KHÔNG hiện khi lần lưu cuối cách 4 ngày 23h;
      HIỆN khi ≥5 ngày (test biên); tap dòng nhắc kích hoạt đúng flow
      "Chép lại".
- [ ] Banner: (a) load slot bị `LOAD_REJECTED_VERSION_MISMATCH` → Ở LẠI
      S1 + banner đúng copy Error Taxonomy; (b) mở slot đang bị tab
      khác giữ → bị chặn + banner multi-tab; (c) `warn_triggered=1` →
      banner quota đúng copy; mọi lúc ≤1 banner hiển thị, banner sau
      vào hàng chờ.
- [ ] Export ("Chép lại"): sinh artifact 9b đọc được; dòng xác nhận
      "Đã chép lại quyển sổ" hiện tại hàng; giá trị `userKey` KHÔNG
      xuất hiện trong output (mirror AC-28).
- [ ] Keyboard-only: đủ mọi phần tử tương tác theo Tab order đã định;
      O-ConfirmDelete escalated tự focus ô nhập khi mở; Enter submit
      khi hợp lệ; Esc hủy; focus không rơi vào node đã bị
      virtualize-recycle.
- [ ] Mọi phần tử tap độc lập (thân hàng, từng link phụ, 3 ô S/M/L, X
      banner, nút trong O-ConfirmDelete) đo ≥44px trên build thật;
      links phụ liền kề cách nhau ≥4px (`MIN_ADJACENT_GAP_PX`).
- [ ] Empty state (0 slot): đúng 2 dòng copy đã chốt, căn giữa, -1 bậc
      alpha (dòng phụ nhạt hơn dòng chính); "Bắt đầu mới" vẫn hiển thị
      và hoạt động.
- [ ] O-ConfirmDelete escalated trên mobile viewport với bàn phím ảo
      ĐANG MỞ (test trên viewport đã trừ ~40-50% chiều cao bàn phím
      thực tế): tên tham chiếu, ô nhập, VÀ cả 2 nút Hủy/Xóa đều nhìn
      thấy + bấm được mà KHÔNG cần ẩn bàn phím (ràng buộc BẮT BUỘC —
      GDD §O-ConfirmDelete).
- [ ] Từ S1: tap 「Mục」 mở menu đúng 1 mục "Cài đặt" (không có "Về
      danh sách sổ"); chọn "Cài đặt" → O-Set mở; đóng O-Set trả về
      đúng S1 với vị trí cuộn danh sách giữ nguyên.

---

## Open Questions

| Question | Owner | Deadline | Resolution |
|---|---|---|---|
| Lớp backup GitHub (hybrid — quyết định user 2026-08-14): đánh giá khả thi + ADR; lưu ý chỉ 1 người dùng vĩnh viễn → không cần hệ account, chỉ cần repo private + token cá nhân | technical-director | Không chặn MVP (có thể sau MVP) | Chưa đánh giá — "Chép lại" là điểm nối tương lai |
| Tier D.6 cho O-ConfirmDelete (spec này đề xuất dùng chung `overlay_settings` 150ms) — GỘP với câu hỏi tier D.6 của O-Customize đang treo | technical-director | Trước implement chuyển cảnh overlay | Chưa xác nhận |
| `EXPORT_NUDGE_DAYS=5` (range 3-6, phải < ~7 ngày ITP) — đăng ký registry/entities.yaml | Khi implement story S1 | — | Knob mới do spec này đặt |
| Copy literal: dòng nhắc chép lại + chữ trong 2 con dấu `death`/`quota_exhausted` | writer + art-director | Trước `/team-ui` S1 | Copy nháp đang dùng trong spec |
| `player-journey.md` chưa tồn tại — ngữ cảnh cảm xúc 4 nhánh đến suy luận từ GDD, chưa validate | ux-designer | — | Template tại `.claude/docs/templates/player-journey.md` |
| Cơ chế giữ focus qua virtualized list (implementation) | ui-programmer | Khi implement | Ràng buộc đã ghi ở Interaction Map |
