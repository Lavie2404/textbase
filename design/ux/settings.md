# UX Spec: Settings (O-Set)

> **Status**: Approved (`/ux-review` 2026-08-14 — 0 blocking, 3 advisory nhỏ, 1 đã dọn cùng phiên; xem review log nếu tạo)
> **Author**: user + ux-designer
> **Last Updated**: 2026-08-14
> **Journey Phase(s)**: unknown — no player-journey.md
> **Template**: UX Spec

---

## Purpose & Player Need

Settings là overlay cho 2 nhu cầu thực dụng, phi-diegetic, không thuộc về
thế giới trong truyện: chỉnh cỡ chữ để đọc thoải mái hơn, và cấu hình kết
nối AI (dùng key mặc định của dự án hay key riêng của người chơi). Đây là
bề mặt DUY NHẤT được phép "lộ" ra rằng đây là một phần mềm — mọi bề mặt
khác của game giả vờ là vật thể trong ẩn dụ cuốn nhật ký (gáy sách, con
dấu, mực loang); Settings cố tình KHÔNG giả vờ (Visual/Audio Requirements
#6, `core-ui-screen-navigation.md`).

**Nếu thiếu màn hình này**: người chơi không đọc được chữ ở cỡ phù hợp
(đặc biệt nghiêm trọng trên Mobile Web, nền tảng chính của dự án); và khi
key AI mặc định hết quota/bị giới hạn tốc độ, người chơi bị chặn hoàn
toàn — không có đường nào để dùng key riêng, tức là không chơi tiếp được.

**"Người chơi mở Settings vì muốn"**: (a) đọc dễ hơn — đổi cỡ chữ ngay lập
tức, thấy hiệu quả tức thì; hoặc (b) tự chủ về kết nối AI — chuyển sang
key riêng khi cần, không phụ thuộc vào key mặc định của dự án.

---

## Player Context on Arrival

- **Lần đầu gặp**: bất cứ lúc nào sau khi mở game — không có tutorial ép
  buộc, không có overlay tự mở lần đầu. Người chơi tự tìm 「Mục」 khi có
  nhu cầu (thường gặp nhất: chữ quá nhỏ trên Mobile Web ngay từ Save Slot
  Screen đầu tiên).
- **Vừa làm gì trước đó**: chỉ 2 nguồn — (a) đang ở Save Slot Screen (S1),
  trước khi bắt đầu chơi hoặc giữa các lần chọn slot — trạng thái admin,
  không áp lực; (b) đang ở Màn chơi chính (S2), và vì 「Mục」 luôn
  readonly/tự do theo D.1, người chơi có thể mở Settings **ở bất kỳ trạng
  thái Turn Manager nào — kể cả giữa lúc Resolving** (AI đang viết) hoặc
  ngay lúc đang cân nhắc một lựa chọn Pending Fate căng thẳng.
- **Trạng thái cảm xúc cần thiết kế phục vụ**: 2 nhánh trái ngược — (i)
  *calm* tại S1 (không áp lực thời gian); (ii) có thể *urgent* tại S2 (chữ
  đọc không nổi ngay lúc đang đọc đoạn quan trọng, hoặc cần đổi key AI gấp
  sau khi thấy lỗi). Vì nhánh (ii) tồn tại, mở/đóng phải nhanh, không tiêu
  lượt, và **không được làm mất vị trí cuộn hay tiến trình đang chờ AI bên
  dưới** — đã khóa sẵn ở Core Rule #1 (`core-ui-screen-navigation.md`),
  spec này chỉ thừa hưởng, không tự quyết.
- **Tự nguyện hay bị đưa tới**: LUÔN tự nguyện — không trigger hệ thống
  nào tự mở Settings, không có redirect ép buộc.

---

## Navigation Position

Settings nằm ở tầng overlay (Core Rule #1) — không thuộc đồ thị màn hình
D.2. Vị trí: `[S1 hoặc S2] → tap 「Mục」 → menu nhỏ mở → tap "Cài đặt" →
O-Set`. Là điểm cuối trong chuỗi 2-bước đó — không có submenu sâu hơn.
Reachable từ **2 nơi** (S1 và S2), không có nơi thứ 3 ở MVP (khác O-Card,
mở được từ 4 nơi).

---

## Entry & Exit Points

| Entry Source | Trigger | Player carries this context |
|---|---|---|
| S1 (Save Slot Screen) | Tap 「Mục」 → tap "Cài đặt" | Danh sách slot giữ nguyên — không có gì để mất ở S1. |
| S2 (Màn chơi chính), **bất kỳ** `tm_state` | Tap 「Mục」 → tap "Cài đặt" | Vị trí cuộn khung tường thuật, nội dung ô tự do đang gõ (nếu có), và tiến trình Resolving nếu AI đang viết — TẤT CẢ giữ nguyên khi đóng lại (Core Rule #1, không tiêu lượt). |

| Exit Destination | Trigger | Notes |
|---|---|---|
| Màn hình nguồn (S1 hoặc S2 — nơi vừa mở từ đó) | X / tap ngoài / Esc | Không tiêu lượt. **Ngoại lệ tap-ngoài 2 lần** (đã khóa ở UI Requirements §Settings, GDD): khi ô nhập API key đang focus với nội dung CHƯA lưu, tap ngoài lần 1 chỉ unfocus/ẩn bàn phím ảo — KHÔNG đóng overlay; tap ngoài lần 2 (ô đã unfocus) mới đóng. X và Esc không có ngoại lệ này — đóng ngay lập tức. |
| Không quay lại menu nhỏ 2 mục | — | Đóng Settings luôn trả thẳng về màn hình nguồn, không phải quay lại menu 「Mục」 — nhất quán với O-Card/O-ConfirmDelete (không overlay nào có "back" nội bộ). |
| Không có exit một chiều | — | Khác S2→S5 (Core Rule #6), không có hệ quả không-thể-hoàn-tác nào khi rời Settings. |

*(Đóng overlay khi field API key có draft chưa Lưu → đã quyết ở
§States & Variants/§Acceptance Criteria: mất êm, không cảnh báo.)*

---

## Layout Specification

### Information Hierarchy

1. Tiêu đề overlay ("Cài đặt")
2. Nhóm **Cỡ chữ**: 3 lựa chọn S/M/L (mỗi ô hiện glyph mẫu thật + chấm
   mực đánh dấu lựa chọn hiện tại)
3. Nhóm **Cấu hình AI**: chọn chế độ (Mặc định / Của tôi) + ô nhập key
   (chỉ hiện khi "Của tôi") + trạng thái Lưu/lỗi
4. Nút đóng (X)

**Thứ tự ưu tiên: Cỡ chữ trước, Cấu hình AI sau** — khớp đúng thứ tự
`core-ui-screen-navigation.md` đã liệt kê ở cả Core Rule #10 và Visual/
Audio Requirements #6. Hợp lý về tần suất: Cỡ chữ là thao tác nhẹ, dùng
thường xuyên, không rủi ro; Cấu hình AI hiếm dùng hơn nhưng khi cần thì
quan trọng (chặn chơi tiếp nếu sai) — đứng sau, có nhiều không gian hơn
cho validate/feedback mà không chen lấn phần "nhẹ" phía trên.

### Layout Zones

- **Header zone**: `tool-panel-header` (tiêu đề "Cài đặt") + `tool-panel-
  close` (X) cùng hàng — tái dùng nguyên pattern từ O-Customize.
- **Body zone**: list dọc 2 nhóm, mỗi nhóm có nhãn nhóm rồi tới control:
  - Nhóm **Cỡ chữ**: 3 tap target ngang hàng (`tool-segmented-choice`).
  - Nhóm **Cấu hình AI**: `tool-segmented-choice` 2 lựa chọn (Mặc định/
    Của tôi) → `tool-field-input` (ô key, chỉ hiện khi "Của tôi") →
    feedback Lưu (`tool-save-feedback`).
- **Không có footer/nút "Lưu tất cả"**: Cỡ chữ áp dụng NGAY khi tap
  (không cần Lưu — Visual/Audio #6 "áp dụng toàn cục qua Theme scale");
  Cấu hình AI tự chịu trách nhiệm giao dịch Lưu riêng của nhóm mình —
  đúng tinh thần `tool-save-feedback` ("mỗi khu tự chịu trách nhiệm 1
  giao dịch nguyên tử riêng", đã dùng ở O-Customize). 2 nhóm độc lập
  hoàn toàn, không có hành động "Lưu" cấp toàn overlay.

### Component Inventory

| Zone | Component | Loại | Nội dung | Interactive? | Pattern |
|---|---|---|---|---|---|
| Header | Tiêu đề | Text tĩnh | "Cài đặt" | Không | `tool-panel-header` |
| Header | Nút đóng | Button (X) | — | Có — đóng overlay ngay, bỏ draft chưa Lưu không cảnh báo | `tool-panel-close` |
| Body — Cỡ chữ | Nhãn nhóm | Text tĩnh | "Cỡ chữ" | Không | — |
| Body — Cỡ chữ | 3 tap target S/M/L | Segmented control | Mỗi ô hiện glyph mẫu thật ở đúng cỡ sẽ áp dụng + chấm mực đặc đánh dấu lựa chọn hiện tại | Có — đổi `setting` NGAY khi tap, áp dụng toàn cục tức thì, không cần Lưu | `tool-segmented-choice` |
| Body — Cấu hình AI | Nhãn nhóm | Text tĩnh | "Cấu hình AI" | Không | — |
| Body — Cấu hình AI | 2 lựa chọn chế độ | Segmented control | "Mặc định" / "Của tôi" | Có — đổi `apiMode` NGAY khi tap | `tool-segmented-choice` |
| Body — Cấu hình AI | Ô nhập key | Text input, **che mặc định** (`•••`) | Pre-fill key đã lưu nếu có (che); placeholder **"Nhập API key"** khi rỗng | Có — chỉ hiện khi `apiMode='userKey'`; gõ tự do | `tool-field-input` (biến thể mask) |
| Body — Cấu hình AI | Nút "Hiện" | Toggle text button, cạnh ô key | "Hiện" ⇄ "Ẩn" | Có — lật trạng thái che/hiện tạm thời (không đổi giá trị key) | **MỚI**: `tool-field-mask-toggle` |
| Body — Cấu hình AI | Nút Lưu + feedback | Button + inline text | "Lưu" → "Đã lưu" (thành công) hoặc lỗi ("Key rỗng — nhập trước khi lưu") | Có — chỉ enable khi có thay đổi chưa lưu | `tool-save-feedback` |

**Quyết định kèm theo** (suy luận từ AC-09 đã khóa, không phải chọn mới):
chuyển `apiMode` từ "Của tôi" sang "Mặc định" **không xóa** key đã lưu —
chỉ ẩn field khỏi tầm nhìn; quay lại "Của tôi" thì field pre-fill (che)
lại đúng key cũ, không cần gõ lại. Validate ở Settings chỉ kiểm tra
"không rỗng" trước khi cho Lưu — không gọi API để verify key thật (việc
đó xảy ra tự nhiên ở lần gọi AI đầu tiên, lỗi hiển thị qua cơ chế
`ai-llm-integration-layer.md` đã có, ngoài phạm vi Settings).

### ASCII Wireframe

```
Trạng thái apiMode='default' (mặc định, field key ẩn):
┌─────────────────────────────────┐
│ Cài đặt                    [X]  │
├─────────────────────────────────┤
│ Cỡ chữ                          │
│  [ S ]   [ M ]•   [ L ]         │
│                                  │
│ Cấu hình AI                     │
│  [ Mặc định ]•  [ Của tôi ]     │
│                                  │
└─────────────────────────────────┘

Trạng thái apiMode='userKey' (field key hiện ra):
┌─────────────────────────────────┐
│ Cài đặt                    [X]  │
├─────────────────────────────────┤
│ Cỡ chữ                          │
│  [ S ]   [ M ]•   [ L ]         │
│                                  │
│ Cấu hình AI                     │
│  [ Mặc định ]  [ Của tôi ]•     │
│                                  │
│  API key                        │
│  ┌────────────────────┐ [Hiện]  │
│  │ ••••••••••••••     │         │
│  └────────────────────┘         │
│                       [ Lưu ]   │
│                       Đã lưu    │
└─────────────────────────────────┘
```

`•` = chấm mực đánh dấu lựa chọn hiện tại (segmented control). Panel co
giãn theo nội dung — không cần scroll ở MVP vì chỉ 2 nhóm ngắn.

---

## States & Variants

| State / Variant | Trigger | What Changes |
|---|---|---|
| Mặc định lần đầu (chưa từng cấu hình) | Mở game lần đầu, chưa từng vào Settings | `setting=M` (nấc giữa), `apiMode='default'`, field key ẩn — chưa có gì để hiện "Đã lưu". |
| Mặc định (đã cấu hình trước) | Mở lại sau khi đã lưu | Pre-fill đúng lựa chọn/giá trị đã lưu — S/M/L đang chọn hiện tại; nếu `apiMode='userKey'`, field pre-fill (che) đúng key cũ. |
| Lưu — in-flight | Tap "Lưu" (nhóm Cấu hình AI) | Nút Lưu + field khóa tạm (alpha mờ), chờ commit — mirrors `tool-save-feedback`, dự phòng cho trường hợp storage backend là async (Open Question #4 GDD chưa chốt cơ chế lưu `app_config` — thiết kế an toàn với cả 2 khả năng). |
| Lưu — thành công | Commit OK | Text "Đã lưu" hiện ngay dưới nút, biến mất khi field bị sửa tiếp (không auto-timeout). |
| Lưu — lỗi (key rỗng) | Tap "Lưu" khi field rỗng | `tool-inline-error` dưới field: "Nhập key trước khi lưu" — không đổi state đã lưu trước đó (nếu có). |
| Lưu — lỗi (ghi thất bại hạ tầng) | Storage write fail (quota/lỗi kỹ thuật) | Lỗi hiển thị ngay tại khu Cấu hình AI, KHÔNG banner (theo `tool-save-feedback`: "Thất bại: KHÔNG đổi state, báo lỗi trong khu đó, mở khóa lại"). |
| Cỡ chữ — đổi tức thời | Tap 1 trong 3 ô S/M/L | Theme scale đổi ngay toàn cục — kể cả chính overlay Settings tự re-render theo cỡ mới; chấm mực dời sang ô mới. |

Không có empty/loading state kiểu danh sách (Settings không phải nội dung
data-dependent), không có progression/locked variant, không có platform
variant riêng.

---

## Interaction Map

Input methods: Touch/Mouse (mixed), không gamepad — từ
`technical-preferences.md`.

| Component | Action | Input | Feedback | Outcome |
|---|---|---|---|---|
| Nút đóng (X) | Tap/click | Touch/mouse | Pressed feedback (đậm mực tức thời, mục 9 GDD) | Đóng overlay ngay, về màn hình nguồn |
| Tap ngoài panel | Tap/click ngoài | Touch/mouse | — | Đóng overlay — NGOẠI LỆ: nếu field key đang focus với draft chưa lưu, lần 1 chỉ unfocus/ẩn bàn phím ảo (GDD đã khóa) |
| Esc | Phím Esc | Bàn phím | — | Đóng overlay ngay, KHÔNG qua luật 2 lần (ngoại lệ đó chỉ áp cho tap-ngoài) |
| 3 ô S/M/L | Tap/click | Touch/mouse | Chấm mực dời ngay; toàn UI re-render theo cỡ mới | `setting` đổi NGAY, áp dụng toàn cục — không cần Lưu |
| 2 ô Mặc định/Của tôi | Tap/click | Touch/mouse | Chấm mực dời ngay; field key hiện/ẩn tương ứng (fade ≤150ms) | `apiMode` đổi NGAY |
| Ô nhập key | Gõ (tap để focus trên mobile) | Bàn phím ảo/thật | Con trỏ nhấp nháy chuẩn; nội dung hiển thị che `•••` | Text giữ trong field, CHƯA lưu tới khi tap "Lưu" |
| Nút "Hiện"/"Ẩn" | Tap/click | Touch/mouse | Field chuyển hiển thị rõ ⇄ che ngay lập tức | Không đổi giá trị key, chỉ đổi cách hiển thị tạm thời |
| Nút "Lưu" | Tap/click | Touch/mouse | Khóa tạm nút+field (alpha mờ) trong lúc commit | Field rỗng → lỗi inline; có nội dung → commit key, hiện "Đã lưu" |

**Bàn phím-only**: Tab/Shift+Tab di chuyển focus theo thứ tự: X → 3 ô Cỡ
chữ → 2 ô Cấu hình AI → (nếu `userKey`) field key → nút Hiện → nút Lưu.
Enter/Space kích hoạt phần tử đang focus — outcome giống hệt tap/click
tương ứng (cùng gate, không có gì bị khóa theo `tm_state` vì toàn bộ
Settings luôn readonly/tự do theo D.1).

---

## Events Fired

| Player Action | Event Fired | Payload / Data |
|---|---|---|
| Đổi cỡ chữ (S/M/L) | `font_scale_changed` | `{ setting: 'S'\|'M'\|'L' }` |
| Đổi `apiMode` | `api_mode_changed` | `{ apiMode: 'default'\|'userKey' }` |
| Lưu key thành công | `api_key_saved` | Cờ boolean thành công — **KHÔNG BAO GIỜ** kèm giá trị key thật trong payload (mở rộng nguyên tắc export-safety của AC-28 sang cả kênh telemetry/event bus) |
| Lưu key lỗi (rỗng) | Không có event | Chỉ lỗi inline UI, không phải hành động ghi trạng thái |
| Lưu key lỗi (storage fail) | `api_key_save_failed` | `{ reason: string }` — không kèm giá trị key |
| Tap "Hiện"/"Ẩn" | Không có event | Chỉ thay đổi hiển thị cục bộ, không ghi world state |
| Mở Settings | `settings_opened` | *(đã tồn tại sẵn trong `main-screen.md` §Events Fired — không định nghĩa lại)* |
| Đóng Settings | `settings_closed` | — |

**Cờ kiến trúc**: `font_scale_changed` và `api_mode_changed`/
`api_key_saved` đều ghi vào `app_config` cấp-thiết-bị (Core Rule #10),
không phải slot bundle — cơ chế lưu cụ thể vẫn là Open Question #4 chưa
chốt ở GDD, spec này không quyết định thay. Yêu cầu bảo mật payload của
`api_key_saved`/`api_key_save_failed` (không bao giờ chứa giá trị key
thật) cần truyền đạt rõ cho `security-engineer`/`lead-programmer` khi
implement — đây là điểm mở rộng thật của AC-28, không phải suy diễn tùy
tiện.

---

## Transitions & Animations

- **Vào (entrance)**: trượt dọc từ mép trên + fade in, **150ms**
  (`transition_settings_ms`, D.6) — KHÔNG mực loang như Card, vì Settings
  "hành chính, không sống" (GDD mục 2, đối lập có chủ đích với
  `overlay_card`).
- **Ra (exit)**: ngược lại — trượt lên + fade out, cùng 150ms.
- **State-change trong overlay** (gom lại từ các section trước):
  - Chấm mực đánh dấu lựa chọn (S/M/L, Mặc định/Của tôi): dời vị trí tức
    thời, không tween riêng (nhất quán style segmented control của
    O-Customize).
  - Field API key hiện/ẩn khi đổi `apiMode`: fade ≤150ms (ngân sách
    chung mục 9 GDD).
  - Nút Lưu + field khóa tạm khi in-flight: alpha giảm ngay, không tween
    dài.
  - Text "Đã lưu": fade in nhẹ ≤150ms, biến mất khi field bị sửa tiếp
    (không auto-timeout, đã chốt ở States & Variants).
- **Rủi ro say chuyển động**: thấp — mọi animation ở đây ≤150ms, không có
  motion lặp/liên tục nào. Không có toggle reduced-motion ở Settings MVP
  (đã xác nhận không mở rộng Core Rule #10, xem
  `accessibility-requirements.md`).

---

## Data Requirements

| Data | Source System | Read/Write | Notes |
|---|---|---|---|
| `setting` (cỡ chữ S/M/L) | `app_config` (cấp thiết bị — cơ chế lưu cụ thể là Open Question #4 GDD, chưa chốt) | Read + Write | KHÔNG thuộc Persistence slot bundle (Core Rule #10) |
| `apiMode` (`'default'` \| `'userKey'`) | `app_config` | Read + Write | — |
| `userKey` (giá trị key thật) | `app_config`, namespace **TÁCH BIỆT HOÀN TOÀN** khỏi save-data bundle (đã khóa ở `ai-llm-integration-layer.md`: "KHÔNG BAO GIỜ được nằm trong bất kỳ slot/blob nào có thể đi qua cơ chế export") | Read (pre-fill che) + Write | Field nhạy cảm nhất của toàn Settings — vi phạm namespace này = vi phạm AC-28 |
| Key mặc định của dự án | Build-time config / ADR-0003 | Read-only, **KHÔNG hiển thị ở Settings** | Không phải data của UI này — người chơi không thấy/không chỉnh key mặc định, chỉ chọn dùng nó hay không qua `apiMode` |

Không có dữ liệu real-time/time-sensitive nào ở màn hình này. Cờ kiến
trúc (nhắc lại từ Events Fired): cơ chế lưu `app_config` cụ thể vẫn treo
ở Open Question #4 GDD — spec này định nghĩa UI cần đọc/ghi gì, không
quyết định lưu ở đâu.

---

## Accessibility

*(Tuân `design/accessibility-requirements.md` — tier Basic + các mục
Standard đã đạt by-design. Settings KHÔNG có nhóm audio/motion — đã xác
nhận không mở rộng Core Rule #10.)*

- **Keyboard-only navigation**: Tab/Shift+Tab đủ mọi field/nút theo đúng
  thứ tự đã định ở Interaction Map (X → 3 ô Cỡ chữ → 2 ô Cấu hình AI →
  field key nếu có → nút Hiện → nút Lưu). Enter/Space kích hoạt. Không
  keyboard trap. Esc đóng ngay.
- **Gamepad**: N/A — dự án không hỗ trợ gamepad (`technical-preferences.md`).
- **AT/Screen reader**: Settings dùng TOÀN BỘ Control chuẩn Godot
  (segmented control/Button/LineEdit) — khác tap-tên (kỹ thuật
  `RichTextLabel` meta-tag, nơi ADR-0006 phải chấp nhận gap AT vì hạn
  chế kỹ thuật riêng của kỹ thuật đó). Về lý thuyết, Control chuẩn có
  tiềm năng AT qua AccessKit (Godot 4.5+) — NHƯNG
  `accessibility-requirements.md` đã xác nhận AccessKit **không hoạt
  động trên Web export** (target duy nhất của dự án) — rào cản engine,
  không phải lựa chọn thiết kế. Spec này KHÔNG tự nhận đạt AT support;
  chỉ ghi nhận keyboard-only hoạt động đầy đủ (không phải AT thật qua
  screen reader hệ điều hành).
- **Text contrast & cỡ chữ**: dùng nguyên token nền giấy kem/mực đã tính
  sẵn (`#F5EFE0`/`#2B2620`, giống S2) — KHÔNG có theme "phá vỡ" riêng
  như O-Customize, nên **không có gap contrast mới** cần `art-director`
  xác nhận. 3 nấc `font_scale_steps` áp dụng đệ quy cho chính nội dung
  Settings — đổi cỡ chữ trong lúc đang mở overlay làm chính nó re-render
  theo cỡ mới ngay.
- **Color-independent**: chấm mực (không màu) đánh dấu lựa chọn
  segmented control; lỗi validate luôn kèm text lỗi, không chỉ viền đỏ
  (khớp `tool-inline-error`).
- **Touch target**: `TOUCH_TARGET_MIN=44px` mọi phần tử độc lập (3 ô
  S/M/L, 2 ô `apiMode`, field key, nút Hiện, nút Lưu, nút X) — không
  ngoại lệ.
- **Reduced motion**: N/A ở MVP (đã xác nhận không mở rộng Core Rule
  #10) — rủi ro thấp vì mọi animation ≤150ms, không lặp.

---

## Localization Considerations

**Ngoài phạm vi hiện tại**: cùng lý do đã ghi ở `main-screen.md`/
`o-customize.md` — dự án đơn ngôn ngữ (tiếng Việt), không có kế hoạch đa
ngôn ngữ (`game-concept.md` Target Player Profile). Không có yêu cầu
localization thật cho Settings ở giai đoạn này.

**Ghi chú dự phòng** (nếu localize trong tương lai, không chặn MVP):
- **Nhãn segmented control Cấu hình AI** ("Mặc định" 4 âm tiết vs "Của
  tôi" 3 âm tiết) — độ dài tương đối cân bằng, rủi ro layout thấp hơn
  hẳn cặp "Thức"/"Vật phẩm" của O-Customize.
- **Nhãn S/M/L** — chữ viết tắt gốc Latin (Small/Medium/Large), không
  cần dịch, rủi ro layout gần như 0.
- **Nút "Hiện"/"Ẩn"** — 1 âm tiết, tương tự rủi ro layout thấp như cặp
  bookmark 「Thẻ」「Lục」「Mục」 đã ghi ở `main-screen.md`.
- **Text lỗi inline** ("Nhập key trước khi lưu") — câu dài nhất trong
  toàn Settings, layout đã chừa sẵn khoảng trống cố định dưới field
  (theo `tool-field-input`/`tool-inline-error`) nên giãn dòng khi dịch
  không phá layout, chỉ cần kiểm tra không tràn khung.

---

## Acceptance Criteria

- [ ] Mở Settings từ 「Mục」 (chọn "Cài đặt" trong menu 2 mục) tại S1 hoặc
      S2: overlay hoàn tất animation trượt+fade trong đúng **150ms**
      (`transition_settings_ms`), không frame trống/skeleton sau khi
      animation kết thúc.
- [ ] Mở Settings từ S2 trong lúc `tm_state=resolving`: overlay vẫn mở
      thành công (readonly, D.1), khu nhập bên dưới vẫn giữ nguyên trạng
      khóa, vị trí cuộn khung tường thuật không đổi sau khi đóng Settings
      lại.
- [ ] Tap 1 trong 3 ô S/M/L: `setting` đổi ngay, toàn bộ UI (kể cả chính
      Settings) re-render đúng cỡ chữ mới trong cùng khung hình — không
      cần đóng/mở lại overlay để thấy hiệu ứng.
- [ ] Đổi `apiMode` từ "Mặc định" sang "Của tôi": field key hiện ra,
      pre-fill đúng giá trị đã lưu trước đó (nếu có) ở trạng thái che;
      đổi ngược lại "Mặc định" rồi quay lại "Của tôi": field vẫn giữ
      đúng giá trị cũ, không bị xóa.
- [ ] Tap "Lưu" khi field key rỗng: hiện lỗi inline "Nhập key trước khi
      lưu", KHÔNG gửi bất kỳ request/write nào (spy xác nhận 0 write),
      giá trị đã lưu trước đó (nếu có) không bị ghi đè/xóa.
- [ ] Tap "Lưu" với key hợp lệ: text "Đã lưu" xuất hiện; đóng Settings
      rồi mở lại (kể cả sau khi đóng/mở lại trình duyệt): field vẫn
      pre-fill đúng giá trị vừa lưu.
- [ ] Đóng overlay bằng X hoặc Esc khi có draft chưa Lưu trong field
      key: overlay đóng ngay lập tức, draft bị bỏ êm, giá trị đã lưu
      TRƯỚC ĐÓ (nếu có) không đổi.
- [ ] Tap ngoài panel khi field key đang focus với nội dung chưa lưu:
      lần 1 chỉ unfocus (không đóng overlay); lần 2 (đã unfocus) mới
      đóng.
- [ ] Export slot save (theo `persistence-save-system.md` QA log 9a/9b)
      KHÔNG chứa giá trị `userKey` ở bất kỳ đâu trong output, dù key
      đang ở trạng thái đã lưu hay đang có draft chưa lưu (mở rộng
      AC-28).
- [ ] Toàn bộ điều khiển trong Settings reachable + activatable bằng Tab
      + Enter/Space thuần bàn phím, đúng thứ tự đã định ở Interaction
      Map — không phần tử nào bị bỏ sót khỏi Tab order.
- [ ] Mọi phần tử tap độc lập (3 ô S/M/L, 2 ô `apiMode`, field key, nút
      Hiện, nút Lưu, nút X) đo được ≥44px touch target trên build thật.
- [ ] Nút "Hiện"/"Ẩn" chỉ đổi cách hiển thị (che/hiện), không làm thay
      đổi giá trị đang gõ trong field — verify bằng gõ 1 chuỗi, bấm
      Hiện, bấm Ẩn, xác nhận chuỗi y hệt.

---

## Open Questions

| Question | Owner | Deadline | Resolution |
|---|---|---|---|
| Cơ chế lưu `app_config` (localStorage riêng hay góc nhỏ hệ lưu trữ Persistence?) | technical-director | ADR persistence tại `/create-architecture` | Chưa giải quyết — Open Question #4 gốc của `core-ui-screen-navigation.md`, spec này không quyết định thay |
| Namespace lưu `userKey` tách biệt hoàn toàn khỏi save-data bundle — cơ chế KỸ THUẬT cụ thể (IndexedDB riêng? key localStorage riêng?) | technical-director | ADR persistence/backend AI | Yêu cầu NGHIỆP VỤ đã khóa (`ai-llm-integration-layer.md`); cơ chế kỹ thuật vẫn chưa chốt |
| Thiết kế field "Cấu hình AI" ở đây (2 field: chế độ + key, không model selection) có nên propagate ngược thành cập nhật chính thức cho Open Question #3 của `core-ui-screen-navigation.md` không? | user/producer | Không blocking | Thiết kế đã quyết ở spec này; GDD gốc vẫn ghi "chưa đóng" — cân nhắc 1 sửa nhỏ đồng bộ sau |
| `design/player-journey.md` chưa tồn tại — nhánh cảm xúc "urgent" tại S2 (Player Context on Arrival) suy luận từ Core Rule #1/D.1, chưa validate bằng playtest thật | ux-designer | — | Template tại `.claude/docs/templates/player-journey.md` |
