# Session State

## Phiên 2026-08-11 (phiên 2 trong ngày) — Đóng 3 cổng cuối: CORS / Combat / Persistence

**TẠM DỪNG GIỮA CHỪNG — user chuyển máy.** Đọc kỹ mục "Việc còn dở" trước khi làm gì khác.

### ⚠️ Lưu ý chuyển máy (dự án KHÔNG có git)

- Repo này chưa `git init` — chuyển máy = copy nguyên thư mục `ai-story-game/` (đã chứa đủ: `src/`, `tests/`, `addons/gut/` [GUT 9.7.1], `prototypes/`, `docs/`, `project.godot`). Cân nhắc `git init` ngay ở máy mới — lượng code/tài liệu đã đáng được version control.
- Phụ thuộc CỤC BỘ MÁY (phải cài lại ở máy mới):
  - Godot 4.6 stable: `winget install --id GodotEngine.GodotEngine --version 4.6` — binary KHÔNG vào PATH, nằm ở `%LOCALAPPDATA%\Microsoft\WinGet\Packages\GodotEngine.GodotEngine_...\Godot_v4.6-stable_win64_console.exe`.
  - Web export templates 4.6.stable (chỉ cần cho prototype Persistence, KHÔNG cần cho GUT combat): tải tpz 4.6-stable từ GitHub releases, giải nén các file `web_*.zip` + `version.txt` vào `%APPDATA%\Godot\export_templates\4.6.stable\`.
  - Chrome + Python 3 (cho harness prototype).
- Lệnh GUT (từ repo root, bash): `"$GODOT" --headless --path . -s res://addons/gut/gut_cmdln.gd -gdir=res://tests/unit -ginclude_subdirs '-gprefix=' '-gsuffix=_test.gd' -gexit`

### ĐÃ XONG phiên này

1. **AI/LLM Integration Layer → APPROVED (14/16)** — cổng CORS prototype PASS:
   - `prototypes/gemini-cors/` (cors_probe.py + README + results.json): preflight Gemini echo MỌI origin (≈ `Allow-Origin: *`); browser thật (Chrome headless, origin localhost:8765) đọc được body HTTP 400 "API key not valid" ở cả 2 biến thể auth → CORS mở hoàn toàn, Core Rule #6 đứng vững. Không cần key thật.
   - Hệ quả bảo mật XÁC NHẬN: CORS không giới hạn origin → HTTP referrer restriction (Google Cloud Console) là phòng thủ DUY NHẤT cho key mặc định — nâng thành ràng buộc BẮT BUỘC của ADR backend AI (chưa viết, tương lai).
   - Cascade đủ: GDD header Approved + Open Question #1 đóng, review log có biên bản 2026-08-11, systems-index hàng #4 Approved + đồng bộ 6 ô Status lỗi thời (nợ backlog phiên trước) + Progress Tracker reviewed 15/approved 13, prototypes/index.md.
   - Hạng mục #6 (billing zombie) KHÔNG thuộc cổng (đúng quyết định vòng 2) — mang sang ADR backend AI, cần key thật + billing console (user-side).

2. **Combat System → ĐÓNG (Implemented, ADR-0001 Accepted)**:
   - `src/gameplay/combat/` 7 file GDScript static-typed (tuning config data-driven, combatant, formulas D.1–D.7/D.10–D.13, resolver D.8/D.9/D.9b/D.9c, NPC D.14, action slots, narration keywords) — nguồn chuẩn NORMATIVE cho cơ chế theo ADR-0001.
   - `tests/unit/combat/` 13 file + factory: **GUT 14 scripts / 91 tests / 91 PASS / 829 asserts** (đã re-run xác minh độc lập). `tools/combat/convergence_sweep.gd`: AC-47a 96/108 KHỚP CHÍNH XÁC harness.py đóng băng; Q3b 51,7%/48,3% nhất quán. `tools/lint/combat_lint.py` (D2): 0 finding.
   - ADR-0001 → **Accepted** + phụ lục Validation Results (3/3 tiêu chí đạt; 9 backlog items bị compiler bắt [mục tiêu ≥5]; KHÔNG defect kiến trúc — trigger đảo ngược không kích hoạt; ~35 phút tới xanh).
   - 1 bug prose mới ngoài backlog (cục bộ): D.9 không bao giờ cộng lifesteal `heal` vào HP — code áp dụng đúng D.7. Judgment calls ghi ở banner Section D GDD + review log entry 2026-08-11.
   - GDD combat: header `Implemented — GUT green`, banner Section D "THI HÀNH XONG" + delta list. systems-index hàng #7 cập nhật.

3. **Persistence — prototype PASS + ADR-0002 Proposed (CÒN DỞ, xem dưới)**:
   - `prototypes/persistence-web/` (Godot 4.6 Web export thật, nothreads, chạy bằng Chrome headless + run_prototype.py):
     - **#2 PASS**: `transaction.oncomplete` reach GDScript qua `create_callback` (24/24, thứ tự đúng); latency e2e p50 0,6/2,0/14,2ms cho 1KB/100KB/1MB, max 20,9ms — dư ~7× (worst) tới ~16–25× (typical) so budget 150ms.
     - **#3 PASS với twist**: pattern "callback trả pending Promise" THẤT BẠI thật (return value không băng qua bridge) — pattern hoạt động: dựng Promise từ GDScript + truyền `Promise.resolve.bind(Promise, pendingPromise)` làm lock callback; đủ 3 tiêu chí giữ/từ chối/giải phóng. Landmine: gọi JS function stashed phải qua property trên object mới, `.call()` đụng `Object.call()` GDScript.
     - **#5 measured-safe**: mtime IDBFS độ phân giải MILI GIÂY, 8/8 trial cùng-giây không mất dữ liệu.
     - `persist()` bị DENY ngay trên desktop Chrome headless (quota ~10,7GB) → ITP iOS phải đo thiết bị thật.
   - **ADR-0002** `docs/architecture/adr-0002-persistence-storage-backend.md` (**Proposed**): IDB 3 store (slots/turn_records/snapshots), `durability_confirmed` := `oncomplete` 1 transaction/lượt, seam `stage()/commit()` + mock protocol cho AC-03/17/22, Web Locks D3, quota D4, KHÔNG nén MVP (đơn vị (b) nếu sau này nén), `schema_version` D6 (pre-1.0 save-breaking OK), versionchange/onblocked handling, D1a evidence status.
   - **Engine-specialist validation: APPROVE-WITH-NOTES** — 8 minor ĐÃ SỬA vào ADR; 2 blocking-cho-implementation → Experiment 2b (Migration step 0).
   - GDD Persistence: header + Open Questions addendum 2026-08-11; review log entry đầy đủ; systems-index hàng #6 + Progress Tracker.

### ⚠️ VIỆC CÒN DỞ (theo thứ tự)

1. **Experiment 2b (cổng pre-implementation của ADR-0002, D1a/Migration step 0) — DỞ DANG**: phải chứng minh trên Web export thật: (i) PackedByteArray qua bridge vào `store.put()` (JS type nhận được? cần encode không? byte-identical round-trip? overhead?) — quyết định contract `get_blob()` bytes-vs-JSON-string; (ii) compound key `[slot_id, world_time]` + `IDBKeyRange` cursor scan qua callback MULTI-FIRE (utility await hiện tại single-settle, không phục vụ cursor); (iii) transaction đa-store (snapshot put + delete turn records, 1 oncomplete; thử abort rollback). **Hiện trạng**: code 2b ĐÃ VIẾT trong `prototypes/persistence-web/main.gd` (~31 mốc "2b"), build/ đã re-export 17:00, nhưng **harness bị TREO khi chạy** (agent bị dừng giữa lúc debug — điểm treo có thể chính là dữ kiện về cursor multi-fire). Phiên sau: debug `run_prototype.py` + main.gd, chạy lại, ghi kết quả vào results.json/README, rồi cập nhật ADR-0002 D1a + Key Interfaces (chốt payload type). Fallback nếu fail đã định danh sẵn trong D1a.
2. **User quyết định** (đã chuẩn bị, chưa hỏi): (a) ADR-0002 Proposed → Accepted? (b) cập nhật `docs/registry/architecture.yaml` với các stance mới của ADR-0002 (state ownership save bundle → persistence; interface `stage()/commit()`; api_decision IndexedDB-direct + Web Locks; forbidden pattern "FileAccess/user:// làm durability gate")? — BLOCKING theo skill, chưa ghi registry. (c) ADR-0001 đã Accepted theo chỉ thị đóng Combat — user xác nhận lại nếu muốn.
3. **Hạng mục #4 (user, thiết bị thật)**: chạy `prototypes/persistence-web/DEVICE-TEST.md` — iOS Safari/WKWebView + Zalo/FB/Messenger in-app + case iframe sandbox (itch.io-style, đã thêm vào ma trận theo specialist note). Cần https tunnel (cloudflared/ngrok) vì secure-context-only. Kết quả → append README prototype + ADR-0002 Verification. Điều kiện TRƯỚC deploy công khai, không chặn implementation.
4. **Hạng mục #6 (user, cần key thật + billing)**: đo chi phí zombie requests — thuộc ADR backend AI (chưa viết).
5. Backlog cũ không đổi: 8 AC world-memory fixture recency_window_turns=5→8; OQ #14 Character Card (durability timing — giờ có thể trả lời theo ADR-0002 D1); systems-index còn vài chỗ provisional nhỏ.

### Bối cảnh cho máy mới

- 15/16 hệ hết nợ: 13 GDD Approved + game-concept Approved + Combat Implemented (ADR-0001 Accepted). Persistence là hệ DUY NHẤT còn cổng (ADR-0002 accept + Exp 2b).
- Sau khi Persistence đóng: bước tiếp theo tự nhiên theo workflow là `/create-architecture` (đã đủ điều kiện tiên quyết ADR nền) hoặc `/architecture-review` (PHẢI chạy ở session MỚI, không cùng session với /architecture-decision — quy tắc skill).
- Toolchain máy cũ ghi ở memory máy cũ (không chuyển theo) — đã chép các thông tin cần vào mục "Lưu ý chuyển máy" ở trên.

<!-- STATUS -->
Epic: Persistence / Save System
Feature: ADR-0002 gate
Task: Experiment 2b (marshalling/cursor/multi-store) + user accept ADR
<!-- /STATUS -->
