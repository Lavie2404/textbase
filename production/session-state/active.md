# Session State — Checkpoint 2026-08-13

## Hoàn tất phiên này (tiếp theo phiên trước)

**`/ux-design O-Customize` + `/ux-review o-customize` — HOÀN TẤT,
verdict cuối: APPROVED.** UX spec đầy đủ cho overlay "Chỉnh sửa nhân
vật" (hệ #16, đóng Open Question #6 của GDD). Review vòng 1 tìm 2
blocking (dirty-tracking flag cho `current_exp`/`state` no-op gate —
Core Rule #10; nhãn "Bậc" trùng tên 2 khái niệm khác nhau trên cùng
panel) + 4 advisory (state Loading chưa giải thích; `efficacy` thiếu
nhãn; thiếu AC round-trip; weapon_type control-type chưa nối với Open
Question #7) — tất cả đã vá cùng phiên, review lại xác nhận APPROVED.

### Files đã ghi phiên này

1. `design/ux/o-customize.md` — UX spec đầy đủ 15 section (Purpose →
   Open Questions). Quyết định quan trọng: 3 khu luôn cùng mở (không
   tab/accordion); banner cảnh báo khóa-Undo là 1 banner chung đầu
   panel; nhãn 12 chỉ số tái dùng nguyên văn `game-concept.md`; chữ ký
   chuyển cảnh tái dùng `overlay_settings` (GDD cấm mực loang); Khu 3
   mặc định chọn loại "Vật phẩm"; AT/screen-reader có tiềm năng tốt
   hơn tap-tên nhờ Control chuẩn + AccessKit (chưa verify).
2. `design/ux/interaction-patterns.md` — thêm 11 pattern mới (nhóm
   "công cụ kỹ thuật" đầu tiên của thư viện: `tool-panel-header`,
   `tool-panel-close`, `hack-undo-lock-warning`, `tool-field-input`,
   `tool-segmented-choice`, `tool-derived-readout`,
   `tool-save-feedback`, `tool-inline-error`, `tool-repeatable-list`,
   `tool-soft-warning`, `tool-deletable-list-row`); cập nhật Open
   Question #1 với phát hiện: 0/11 pattern gốc S2 tái dùng được (đúng
   dự kiến — 2 trục hình học đối lập, không phải gap).

### Open Questions quan trọng để lại (đầy đủ trong file, tóm tắt):

- Token màu accent kỹ thuật + contrast ratio thật — cần
  `art-director` sign-off (GDD đã yêu cầu rõ).
- Tier D.6 riêng cho O-Customize hay dùng chung `overlay_settings` —
  cần `technical-director` xác nhận.
- `valid_weapon_types` (danh sách loại vũ khí) chưa được liệt kê ở
  bất kỳ đâu trong dự án — cần `game-designer` bổ sung trước khi
  implement dropdown Khu 3.
- `design/accessibility-requirements.md` vẫn chưa tồn tại (gap cũ,
  lặp lại từ `main-screen.md`).

## Hàng đợi — việc tiếp theo khi mở phiên mới

`o-customize.md` đã APPROVED — sẵn sàng cho `/team-ui` khi cần.

1. Cân nhắc `design/ux/accessibility-requirements.md` (thiếu — đã
   flag lặp lại ở cả `main-screen.md` và `o-customize.md`, cả 2 lần
   `/ux-review`) trước khi chạy `/gate-check pre-production`.
2. Tiếp tục thiết kế các màn hình/overlay còn lại của hệ #15
   (`core-ui-screen-navigation.md` đã flag: `save-slot-screen.md`,
   `story-log.md`, `settings.md`) — `settings.md` đáng ưu tiên vì
   `tool-segmented-choice` vừa dự đoán tái dùng được ở đó (cỡ chữ
   S/M/L).
3. Open Questions còn treo trong `o-customize.md` cần stakeholder
   ngoài phiên: token màu accent kỹ thuật (`art-director`), tier D.6
   riêng hay dùng chung `overlay_settings` (`technical-director`),
   `valid_weapon_types` chưa có danh sách cụ thể (`game-designer`).

## Đã hoàn thành phiên này

**`/architecture-review` (full) — HOÀN TẤT.** Verdict: **CONCERNS** (không có gap
Foundation/Core bị bỏ sót, không cross-ADR conflict chặn triển khai; 2 lỗ hổng
correctness BLOCKING trong ADR-0002 D1b — đã vá cùng phiên).

**8-item GDD/registry prose-sync backlog (cascade sau `/propagate-design-change`
của hệ #16) — HOÀN TẤT TOÀN BỘ.**

### Files đã ghi phiên này

1. `docs/architecture/architecture-review-2026-08-13.md` — báo cáo đầy đủ.
2. `docs/architecture/adr-0002-persistence-storage-backend.md` — vá 2 blocking của
   D1b (IDBKeyRange bound 3 phần tử; rehydrate `hack_seq` từ cursor-scan) + D6
   trigger thứ 3 (đổi hình dạng khóa store) + 2 mục Validation Criteria.
3. `docs/architecture/adr-0004-turn-manager-undo.md` — sửa câu chữ tombstone-key
   lỗi thời + invariant loại-trừ-lẫn-nhau + 1 dòng Risk cho
   `invalidate_pending_snapshot()`.
4. `docs/architecture/architecture.md` — thêm hệ #16 vào layer map/module
   ownership/API boundary/TR baseline (25 TR mới `TR-ccm-*`); header 15→16 GDD.
5. `docs/architecture/tr-registry.yaml` — nạp 321 TR-ID (296 hệ #1-15 + 25 hệ #16).
6. `design/gdd/persistence-save-system.md` — Core Rule #1: "2 checkpoint" → "3",
   thêm mô tả checkpoint thứ 3 (hack-write commit).
7. `design/gdd/turn-manager.md` — formula `undo_availability_window` thêm conjunct
   `pending_snapshot_valid` + biến giải thích.
8. `design/gdd/core-ui-screen-navigation.md` — AC-59a/59b thêm nguyên nhân thứ 3
   "hack-invalidate".
9. `design/gdd/equipment-skill-data-system.md` — Core Rule #9 mới: marker
   `was_ever_equipped`/`was_ever_resolved_in_combat` + ngữ nghĩa gỡ
   `known_skill_ids` khi xóa skill.
10. `design/gdd/world-memory-context-management.md` — Public Interface thêm
    `referenced_in_world_memory(entry_id)` mirror từ ADR-0005.
11. `design/registry/entities.yaml` — thêm `character-customization-mode.md` vào
    `referenced_by` của 7 hằng số: `undo_availability_window`, `tier_from_level`,
    `exp_threshold`, `min_thuc_per_skill`, `max_known_skills_per_character`,
    `deep_hostility_threshold`, `HOSTILE_INITIATIVE_LEVEL_GAP_MAX`.
12. `design/gdd/character-customization-mode.md` — D.5 thêm ghi chú
    coroutine-contagion cho `referenced_in_world_memory()`.

### Ghi chú kỹ thuật quan trọng (không lặp lại nếu chạy review lần sau)

- 7 agent nền trích xuất độc lập song song trong Phase 2 đã tạo ra 1 bộ ID KHÁC
  (dạng tên-đầy-đủ, VD `TR-combat-system-001`) không tương thích với ID đã thiết
  lập trong `architecture.md`/`tr-registry.yaml` (VD `TR-combat-016`). Bộ ID đó
  KHÔNG được dùng để nạp registry. Nếu chạy `/architecture-review` lần sau, đọc
  `tr-registry.yaml` (giờ có 321 entry) làm nguồn — KHÔNG lặp lại trích xuất độc
  lập từ đầu cho 16 hệ đã có baseline.
- `godot-specialist` đã review sâu 4 ADR vừa amend (0002/0004/0005/0007) — báo cáo
  đầy đủ nằm trong `architecture-review-2026-08-13.md` §Engine Compatibility Audit.

## Hàng đợi — việc ĐẦU TIÊN khi mở phiên mới

Không còn việc cascade nào treo cho hệ #16. Bước tiếp theo tự nhiên:

1. **`/ux-design` O-Customize** (Open Question #6 của GDD hệ #16) — sinh AC-48+ cho
   bố cục panel/copy literal, token màu accent kỹ thuật (cần art-director sign-off
   theo khuyến nghị review log).
2. Cân nhắc `design/ux/accessibility-requirements.md` (thiếu — pre-gate checklist
   của `/architecture-review` phát hiện) trước khi chạy `/gate-check pre-production`
   — lưu ý ADR-0006 đã đóng câu hỏi accessibility bằng "Nhánh C, out-of-scope-MVP"
   nên file này có thể chỉ cần ghi lại quyết định đó, không phải thiết kế mới.

## Ghi chú treo (không chặn, theo dõi trong chính GDD hệ #16)

- Recommended R1-R3 vòng 3 + Advisory A1-A11 + 7 nice-to-have vòng 2: xem
  Gap Analysis + review log của hệ #16.
- Open Question #2 (gate hack mode cho build công khai) — chỉ liên quan khi
  cân nhắc public release, không chặn MVP.
