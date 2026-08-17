# Kế hoạch tích hợp GDD vào game — Quyết định đã chốt (2026-08-17)

> Nguồn: phân tích khoảng cách GDD ↔ `App.tsx` (bên dưới, mục A–E).
> Chủ sản phẩm đã chốt các quyết định sau trong phiên 2026-08-17.

## Phạm vi & loại trừ

- **NGOÀI phạm vi (giữ nguyên code hiện tại, không sửa):** Combat System GDD
  (`CombatLoop`, `finalizeCombatEnd`, narrative combat) và cơ chế **Song Tu**
  (`handleSongTu`, `SONG_TU_TITLE`, ngưỡng affinity ≥ 80, NSFW branch).
  Mọi hệ mới chỉ ĐỌC hai hệ này qua adapter.
- **Lộ trình RÚT GỌN:** P0 → P1 → P2 → P3 (rút gọn) → P4 → P6 (rút gọn).
  **Bỏ P5** (Situation/Encounter scheduler + Setting & Canon). P7 (CI) làm
  tối thiểu (vitest chạy trong CI).

## Quyết định xung đột (C-x)

| # | Quyết định |
|---|---|
| C-1 | **Lai**: giữ tag nội dung thế giới (CREATE_NPC, WORLD_*, LORE_*, QUEST_*, TIME_PASSED, MOVE_PLAYER…); **cấm** tag ghi kết quả cơ học (ENCOUNTER_REWARD/exp, số affinity trong RELATIONSHIP_CHANGED, CHARACTER_DEATH/REVIVE cho người chơi, SET_LEVEL, HEAL_PARTICIPANTS) → module tất định tính. |
| C-2 | IndexedDB = nguồn chân lý (autosave mỗi lượt, `durability_confirmed` gate lượt, slot local không trần). Giữ nút nhưng đổi thành "Sao lưu lên GitHub" (5 slot backup). |
| C-3 | Giữ mọi tính năng Settings, gom 4 nhóm (Hiển thị / Âm thanh / AI & Dữ liệu / Tùy chỉnh nhân vật); cỡ chữ thêm preset S/M/L + thanh trượt nâng cao. |
| C-4 | **Giữ** `calculateMaxExpForLevel` (100·L^1.5·1.8^realm) làm `exp_threshold`; áp 4 nguồn EXP tất định (tỷ lệ × threshold) + cổng "Chờ Đột Phá" mỗi 10 cấp + rollback. |
| C-5 | Giữ AP; stat = base + LEVEL_GROWTH·(L−1) + BREAKTHROUGH_BONUS·(tier−1) + AP_bonus. |
| C-6 | Song Tu giữ ngưỡng 80 (out of scope). Vẫn thêm 7 dải thái độ + `deep_hostile = −80`. |
| C-7 | **Giữ hồi sinh** (`handleRespawn`) như hiện tại. Không làm chết vĩnh viễn/khóa slot/Character Continuation 3 lối. Vẫn làm death_roll / severity / thương tật. |
| C-8 | Chạy song song: fact store theo luật + giữ summarizer AI (nền, ngoài lượt). |
| C-9 | `calls_per_turn` chỉ đếm critical path (API-1, API-2, retry). API-3 thu hẹp dần về giám sát thời gian & vị trí. |
| C-10 | AbortController + timeout 60s logical / 45s request; không tính queue delay. |
| C-11 | Crippled = `longTermStatus` "Phế Đan Điền" (giảm chỉ số + chặn EXP), không đụng CombatLoop. |
| C-12 | Không áp dụng (P5 bỏ). |
| C-13 | **Làm Undo 1 lượt**. |
| C-14 | Không áp dụng (P5 bỏ). |

## Quy trình

- Mỗi giai đoạn: module TS thuần dưới `src-web/systems/`, unit test Vitest
  dưới `tests/unit/<system>/`, cắm vào `App.tsx` tại điểm móc cố định.
- Xong giai đoạn (test xanh + `vite build` xanh) → commit 1 lần, không push.

---

# Phân tích khoảng cách & Kế hoạch tích hợp GDD vào game

**Ngày:** 2026-08-17 · **Phạm vi:** đưa toàn bộ GDD đã duyệt vào `App.tsx` (34.502 dòng) + `gameConfig.js`
**Ngoại lệ (giữ nguyên, không đụng tới):** Combat System (`CombatLoop:3335`, `applyCombatResults:18647`, `finalizeCombatEnd:27618`) và cơ chế Song Tu (`SONG_TU_TITLE:27107` → `handleSongTu:27186–27320`).

---

## A. Tóm tắt điều hành

1. **Game hiện tại và bộ GDD là hai triết lý ngược nhau ở tầng lõi.** App hiện nay để AI *quyết định* kết quả cơ học rồi parse ngược văn bản AI thành world state (`parseGeminiResponseAndUpdateState:23201`, ~40 loại tag). GDD Contract Enforcement quy tắc R3 cấm tuyệt đối việc này: hệ thống phải **khóa (lock) kết quả trước**, AI chỉ được kể lại.
2. **Cái đã có sẵn và khớp khá tốt:** vòng lượt 1-hành-động-1-lượt (`processPlayerAction:27995`), tách API-1 "Expert Logic Engine" / API-2 "Narrative Engine" (`callGeminiAPI:24938–25309`) — đây chính là phôi thai của kiến trúc "lock rồi kể", danh sách model fallback (`GEMINI_TEXT_MODEL_FALLBACKS:17944`) + circuit breaker 503 90s khớp gần đúng ADR-0003, nén ký ức 2 tầng (`checkForSummarization:30913`) tương đồng ý tưởng World Memory, affinity int ±100, IndexedDB autosave, `CustomizationModal:8289` ≈ O-Customize.
3. **Cái thiếu hoàn toàn:** Undo 1 lượt + snapshot/rollback, `locked_result` như một cấu trúc dữ liệu thật, envelope/intent-chip (12 loại), Situation/Encounter scheduler, Setting & Canon (canon event, premise, cascade), Character Continuation (chết vĩnh viễn + "Chơi lại"), turn-record append-only + `durability_confirmed`, `schema_version`, multi-tab lock, leak detector, timeout 30s/AbortController, `safetySettings: BLOCK_NONE`.
4. **Xung đột lớn nhất về số:** EXP hiện dùng `calculateMaxExpForLevel = 100·L^1.5·1.8^realm` (`:15220`) và chỉ nhận EXP qua tag `[ENCOUNTER_REWARD ep_score]` do AI chấm (`applyUpdates:31935`); GDD dùng ngưỡng **tuyến tính** `100 + 10·(L−1)` và 4 nguồn EXP tất định + cổng "Chờ Đột Phá" mỗi 10 cấp. Hai mô hình không tương thích, phải chọn.
5. **Rủi ro lớn nhất:** (a) làm đúng R3 sẽ phá vỡ toàn bộ trải nghiệm "AI tự sinh thế giới" mà game đang có; (b) `calls_per_turn ≤ 3` mâu thuẫn với 33 call-site Gemini hiện tại + `runAPI3StateMonitor:29280` + queue 13s; (c) `applyUpdates` là hàm 1.278 dòng deep-clone, mọi hệ mới cắm vào đây đều có nguy cơ regression.
6. **Kiến trúc khuyến nghị: KHÔNG viết lại monolith.** Tạo các module TypeScript thuần (pure, không React, không fetch) dưới `src-web/systems/*.ts`, mỗi module là một hàm tất định `resolve_*(input) → locked_result`, có unit test Vitest riêng. Sau đó cắm vào `App.tsx` tại **điểm móc nối cố định**: `processPlayerAction:27995` (trước khi gọi AI), `applyUpdates:30989` (giai đoạn reducer), `processAndUpdateState:32280` (sau AI), `handleAutosave:32663` (persistence).
7. **Combat và Song Tu được bọc bằng adapter, không sửa.** `src-web/systems/adapters/combatAdapter.ts` đọc output của `applyCombatResults:18647` / `finalizeCombatEnd:27618` và dịch sang shape GDD (`battle_active`, `outcome.winner_id/loser_id/type`, `per_actor[id].hp_after`, `is_spar_friendly`). `songTuAdapter.ts` chỉ đọc `npc.titles.includes("Đạo Lữ")` để suy ra `song_tu_relationship_active_npc_ids`.
8. **Chiến lược "tuân thủ từng phần" được đề xuất** cho R3: giữ tag pipeline cho *nội dung thế giới* (tạo NPC, vật phẩm, địa điểm, thời gian) nhưng **cấm tag ghi các trường cơ học có chủ sở hữu mới** (exp, level, affinity, hp, alive, canon status). Đây là quyết định cần chủ sản phẩm chốt (mục C-1).
9. **Không có test runner.** `package.json` chưa có Vitest; `tests/` chỉ có thư mục rỗng. Phải scaffold trước mọi thứ khác.
10. **Ước lượng tổng:** 8 giai đoạn, ~40 file mới dưới `src-web/systems/`, ~25 điểm sửa trong `App.tsx`, ~450–600 unit test. Nếu làm đủ toàn bộ AC của GDD thì đây là khối lượng **nhiều tháng solo**; nếu chỉ làm "MVP-đủ-dùng" (P0–P4 + phần UI tối thiểu) thì gọn hơn nhiều. Cần chốt mức độ tuân thủ ở mục C.

---

## B. Bảng khoảng cách theo hệ thống

Ký hiệu độ khó: **S** ≤ 0,5 ngày · **M** 1–2 ngày · **L** 3–5 ngày · **XL** > 1 tuần.

### B.1 Turn Manager (GDD 01/A)

| Quy tắc/Cơ chế GDD | Hiện trạng trong App.tsx | Trạng thái | Việc cần làm | Điểm móc nối | Độ khó |
|---|---|---|---|---|---|
| 1 lượt = 1 hành động; `world_time` +1 | `currentTurn` tăng tại `processPlayerAction:28180`; `adventureTurnCount:18995` | **Đã có** | Đổi tên khái niệm sang `world_time`, tách khỏi `currentTurn` (hiện tăng cả trong combat) | `processPlayerAction:28180` | S |
| Đúng **4** gợi ý + ô free-text | `choices:19555` quét từ text AI (`parseGeminiResponseAndUpdateState:23544–23594`), số lượng biến thiên | **Khác biệt** | Ép schema JSON `array[4] {text, envelope}`; pad bằng 3 fallback ("Quan sát xung quanh"/"Chờ đợi"/"Rời đi") | `callGeminiAPI:25136` (API-2) hoặc call riêng | M |
| Thứ tự pha: lock → narrate → World Memory → Persistence → Turn Confirmed | Hiện là: AI-1 (roll) → AI-2 (kể) → parse tag → `applyUpdates` → autosave rời rạc | **Khác biệt** | Viết `src-web/systems/turnManager.ts` với pipeline `submitAction()`; `applyUpdates` trở thành 1 bước bên trong | `processPlayerAction:27995`, `processAndUpdateState:32280` | XL |
| `locked_result` là struct thật, bất biến trước khi gọi AI | Không tồn tại; kết quả cơ học nằm rải trong text AI | **Thiếu** | Định nghĩa `LockedResult` trong `src-web/systems/types.ts`; các hệ ghi field vào đây | `processPlayerAction:28283` (trước prompt) | L |
| Undo 1 lượt, không tích lũy, `undo_available` theo F3 | **Không có gì** (`undo:5127` là undo của canvas sửa ảnh avatar) | **Thiếu** | `UndoableSystem { capture_snapshot / restore_snapshot }`, `_pending_snapshot[]`, nút "Hoàn tác" ở `GameplayScreen:9162` | `processPlayerAction:27995` (capture), UI `GameplayScreen:9162` | XL |
| `input_locked` khi Resolving/Undoing | `isProcessingAction:20112` + `isLoading` đã khóa nút | **Đã có** | Ánh xạ sang `tm_state ∈ {awaiting_action, resolving, undoing}` | `GameplayScreen:9162` | S |
| `pending_locked_result` giữ qua lỗi AI (chống rút mạng) | Lỗi AI → toàn bộ lượt hủy, roll lại từ đầu (`fetchWithRetries:17965`) | **Thiếu** | Giữ `pending_locked_result` + `pending_locked_action` trong ref | `processPlayerAction:28690` | M |
| `is_death_turn` khóa vĩnh viễn Undo | Không có khái niệm | **Thiếu** | Cờ từ Death & Consequence | `applyUpdates:31089` | S |
| Death handoff → Character Continuation | `showGameOverModal:19005` + `handleRespawn:32347` (hồi sinh 50% HP) | **Khác biệt** | Thay bằng màn 3 lựa chọn; xem C-7 | `GameOverModal:10227` | L |
| `pending_fate` ghi đè 2/4 slot gợi ý | Không có | **Thiếu** | Từ Death & Consequence Branch B | `parseGeminiResponseAndUpdateState:23544` | M |

### B.2 Contract Enforcement (GDD 01/B)

| Quy tắc/Cơ chế GDD | Hiện trạng | Trạng thái | Việc cần làm | Điểm móc nối | Độ khó |
|---|---|---|---|---|---|
| R1 Lock trước, kể sau | API-1 chấm xác suất & chọn kịch bản (`rollDiceAndChooseScenario:24699`) rồi API-2 kể → **đúng tinh thần**, nhưng bản thân API-1 là AI, không phải công thức | **Khác biệt** | Chuyển các kết quả *có công thức* (EXP, affinity, death, combat) sang module thuần; giữ API-1 chỉ cho phần "kịch bản tự do" | `callGeminiAPI:24942` | L |
| R3 **Cấm tuyệt đối parse ngược** | Vi phạm nặng: `parseGeminiResponseAndUpdateState:23201` + `tagWithDataRegex:23232` đọc ~40 tag từ output AI thành state | **Khác biệt (xung đột lõi)** | Xem quyết định C-1. Tối thiểu: chặn tag ghi `exp/level/affinity/hp/alive` | `parseGeminiResponseAndUpdateState:23201`, `applyUpdates:30989` | XL |
| R5/R6 Một wrapper duy nhất dựng prompt | 33 call-site tới `generativelanguage.googleapis.com` | **Khác biệt** | Gộp về `src-web/systems/ai/requestAi.ts`; các nơi khác gọi qua nó | Toàn bộ 33 call-site (ưu tiên `callGeminiAPI:24867`, `fetchGenericGeminiText:21992`) | XL |
| R4 Cấm số thô trong văn kể | Prompt hiện đã có luật "kể chuyện", chưa cấm số tường minh; đã strip tag khỏi API-2 (`:25241`) | **Khác biệt** | Thêm 2 directive bắt buộc vào prompt builder | `callGeminiAPI:25136` | S |
| F1 Leak detector post-hoc | Không có | **Thiếu** | `src-web/systems/contract/leakDetector.ts` (thuần) + log session | Sau `callGeminiAPI` trả text | M |
| R7 Không có cờ bypass | Có `skipCrisis`, `exactValues` (`:22231/:22493`) nhưng không phải bypass contract | **Đã có** (không vi phạm) | Thêm CI check | CI | S |

### B.3 AI/LLM Integration Layer (GDD 01/C)

| Quy tắc/Cơ chế GDD | Hiện trạng | Trạng thái | Việc cần làm | Điểm móc nối | Độ khó |
|---|---|---|---|---|---|
| R1 một call-site duy nhất | 33 call-site | **Khác biệt** | Như B.2/R5 | — | XL |
| R4 model ladder + cooldown | `GEMINI_TEXT_MODEL_FALLBACKS:17944` (đúng 5 model như ADR-0003), sticky model `:17962`, breaker 503 90s `:17949–17957` | **Đã có (≈95%)** | Rút thành `AiLlmTuningConfig` data-driven; đảm bảo `tried` **monotonic**, không reset khi ladder recompute (bug loop A→B→C→A) | `fetchWithRetries:17965` | M |
| R5 phân loại lỗi 429/403 không retry | `translateGeminiApiError:2520` + xử lý 429 quota/401/403/404 trong `fetchWithRetries` | **Đã có** | Chuẩn hóa 4 nhãn `timeout / no_models_left / config_error / BUSY` | `fetchWithRetries:17965` | S |
| R8 timeout 30s toàn bộ logical call | **Không có** `AbortController`, không có timeout | **Thiếu** | `AbortSignal.timeout(min(request_timeout_default, t_remaining))` | `fetchWithRetries:17965` | M |
| R7 `safetySettings: BLOCK_NONE` | **Không set** ở bất kỳ payload nào (grep = 0) | **Thiếu** | Thêm vào wrapper, ghi đè payload | `requestAi.ts` mới | S |
| F4 `calls_per_turn ≤ 3` (type-set) | 1 lượt hiện tốn 2–3 call chính + `runAPI3StateMonitor:29280` + `runQuestCheckAPI:32267` + drain `pendingCreations` (`fetchItemDetailsFromAI:22019`, `fetchSkillDetailsFromAI:22298`, `fetchQuestDetailsFromAI:22959`) → có thể 5–7 | **Khác biệt** | Xem quyết định C-9 | `runAPI3StateMonitor:29280` | L |
| BUSY khi `state !== 'idle'` (từ chối, không xếp hàng) | Ngược lại: `ApiQueueManager:13646` + `globalApiQueue:13691` **xếp hàng** với delay 13s | **Khác biệt** | Xem C-9 | `ApiQueueManager:13646` | M |
| `suggestion_call` schema JSON 4 phần tử | Có `response_schema` ở nhiều nơi nhưng không cho suggestions | **Thiếu** | Thêm schema + 1 lần internal parse retry | `callGeminiAPI:25136` | M |
| userKey tách khỏi save bundle | Key lưu ở Firestore user profile (`:21249`), **không** nằm trong save bundle | **Đã có** | Thêm AC test cho export | `handleSaveToFile` | S |

### B.4 EXP & Realm Progression (GDD 02/A)

| Quy tắc/Cơ chế GDD | Hiện trạng | Trạng thái | Việc cần làm | Điểm móc nối | Độ khó |
|---|---|---|---|---|---|
| `exp_threshold(L) = 100 + 10·(L−1)` tuyến tính | `calculateMaxExpForLevel:15220` = `floor(100·L^1.5·1.8^floor((L−1)/10))` từ `gameConfig.expFormula` | **Khác biệt** | Thay công thức trong `src-web/systems/exp/expThreshold.ts`; `App.tsx:15220` gọi sang module. **Cần quyết định C-4** | `calculateMaxExpForLevel:15220`, dùng lại ở `:15431`, `:22847`, `:22854`, `:27651`, `:31989` | M |
| `tier = floor((L−1)/10)+1`, **derived, không lưu** | `getRealmInfoFromLevel:22791` (bản sao ở `:6911`) tính `realmIndex=floor((L−1)/10)`, `tier=((L−1)%10)+1` — **đảo ngược ngữ nghĩa** so với GDD | **Khác biệt** | Thống nhất từ vựng: GDD `tier` = cảnh giới = app `realmIndex+1`; app `tier` = tiểu cấp. Viết `tierFromLevel()` mới, giữ hàm hiển thị cũ | `getRealmInfoFromLevel:22791` | M |
| 4 nguồn EXP tất định (win/loss/passive/song tu) | **Duy nhất** tag `[ENCOUNTER_REWARD ep_score,reason,target]` do AI chấm (`applyUpdates:31935`), `MIN_EP_FOR_EXP_GAIN=10` (`:30986`), anti-farm ×0.7/0.4/0.1, `expBasic=EP·2`, `expGrowth=(EP/3)·L`, `expBreakthrough=maxExp·0.5·(EP/100)²` (`:31988`) | **Khác biệt (lớn)** | Viết `resolve_turn_exp(self, turn)` theo D.6; nguồn combat lấy từ `combatAdapter`; passive tick mỗi lượt ngoài chiến đấu | thêm `resolve_turn_exp` vào `applyUpdates:32135` (giai đoạn reconciliation) | L |
| `turn.in_combat` chặn passive/song tu; `battle_active=false` mới tính combat EXP | Không có khái niệm `in_combat` tách khỏi `battle_active`; `gameMode==='COMBAT'` là thứ gần nhất | **Thiếu** | `combatAdapter` xuất cả 2 cờ; `in_combat` true cả ở lượt kết trận | `finalizeCombatEnd:27618` | M |
| Cổng "Chờ Đột Phá" mỗi 10 cấp, clamp exp = 100%, không bank | `handleLevelUp:22839` lên cấp tự do, không có cổng | **Thiếu** | `apply_exp_gain` + `state ∈ {Tu Luyện Thường, Chờ Đột Phá}` | `handleLevelUp:22839` | L |
| `breakthrough_requirement_met(tier)` từ Setting & Canon | Có `activeBreakthroughQuests` trong `knowledge:19987` (do AI sinh) — **gần đúng ý tưởng** nhưng không tất định | **Khác biệt** | Nối vào Setting & Canon STEP 3; tạm thời trả `false` + cảnh báo "content gap" nếu chưa có pack | `applyUpdates` | M |
| D.5 stat growth 12 chỉ số `base_X0 + LEVEL_GROWTH_X·(L−1) + BREAKTHROUGH_BONUS_X·(tier−1)` | `calculateTrueBaseStats:15226` + `calculateFinalStats:15256` dùng `allocatedPoints` (AP) + trang bị; app có nhiều chỉ số hơn 12 (`baseCr/baseCdmg/baseDmgAmp/baseDmgRes/baseEvasion`) | **Khác biệt** | Ánh xạ 12 stat GDD ↔ tên app; thêm 26 hằng số vào `gameConfig.js`, fail-loud khi thiếu. **Cần quyết định C-5** (giữ hệ AP hay bỏ) | `calculateTrueBaseStats:15226` | L |
| `death_and_consequence_blocked` chặn EXP | Không có | **Thiếu** | Từ Death & Consequence | `resolve_turn_exp` | S |
| Rollback level/exp/state khi undo | Không có undo | **Thiếu** | `capture_snapshot` của expSystem | `turnManager` | M |
| Lazy-init theo `char_id` | Nhân vật lưu trong `knowledge.characters[]` với `id` — **đã theo id** | **Đã có** | Chuẩn hóa `char_id` = `character.id` | — | S |

### B.5 Equipment & Skill Data (GDD 02/B)

| Quy tắc/Cơ chế GDD | Hiện trạng | Trạng thái | Việc cần làm | Điểm móc nối | Độ khó |
|---|---|---|---|---|---|
| 3 tầng Weapon → Skill → Thức, `thuc_id` **duy nhất toàn cục** | App có `items[]` + `learnedSkills[]` với `active_actions` (≈ thức) nhưng **không có id thức toàn cục** | **Khác biệt** | Sinh `thuc_id` khi tạo skill (`fetchSkillDetailsFromAI:22298`, `buildCreateSkillPrompt:1925`) | `fetchSkillDetailsFromAI:22298` | M |
| 1 `equipped_weapon_id` duy nhất | App có 10 ô trang bị (`equippedItems` gồm Đầu/Thân/Chân/Vũ khí chính/phụ/Phụ kiện 1-2/Phương tiện/Trữ vật/Dị thường) | **Khác biệt** | GDD là subset của app. Giữ app, adapter map `equipped_weapon_id := equippedItems['Vũ khí chính'].id`. **Không nên** thu hẹp | `handleEquipItem:26799` | S |
| `style_descriptor` ở tầng Skill, feed prompt narration | Skill có `description` — dùng làm `style_descriptor` được | **Đã có (đổi tên)** | Adapter | `formatEntityForPrompt:33447` | S |
| `was_ever_equipped` / `was_ever_resolved_in_combat` (write-once-true) | **Không có** | **Thiếu** | Thêm field vào item/skill; set trong `handleEquipItem:26799` và `applyCombatResults:18647` (chỉ đọc, ghi ở adapter) | `handleEquipItem:26799`, adapter combat | M |
| Xóa skill phải scrub `known_skill_ids` cùng transaction | `CustomizationModal` có tạo skill nhưng không có xóa có kiểm soát | **Thiếu** | Trong O-Customize D.5 | `CustomizationModal:8289` | M |
| "Đánh thường" 1 entry/weapon_type, auto-learned | Combat hiện có đòn cơ bản nội bộ (`CombatLoop:3335`) | **Đã có (tương đương)** | Không sửa (combat out of scope) | — | S |
| `RecoveryItem {item_id, efficacy ∈ [0,1]}` bắt buộc | Item có `effects` chuỗi tự do (`parseEffectsString:2982`) | **Thiếu** | Thêm field `efficacy` cho item loại hồi phục, chỉ dùng cho Death D.3 | `fetchItemDetailsFromAI:22019` | S |
| F2 `is_valid_dataset` lint CI | Không có | **Thiếu** | `src-web/systems/equipment/validateDataset.ts` + test | CI | S |

### B.6 NPC Affinity & Relationship (GDD 03/1) — trừ Song Tu

| Quy tắc/Cơ chế GDD | Hiện trạng | Trạng thái | Việc cần làm | Điểm móc nối | Độ khó |
|---|---|---|---|---|---|
| `affinity ∈ [-100,100]`, một giá trị/NPC | `character.affinity` (INITIAL_STATS:2116), clamp ±100 tại `applyUpdates:31877–31890` | **Đã có** | — | — | — |
| Delta chỉ từ **event đã phân loại**, 0 AI call | Delta đến từ tag `[RELATIONSHIP_CHANGED NPC,Standing,Reason,AffinityChange]` do **AI quyết định số** | **Khác biệt (lõi)** | Viết `resolve_turn_affinity(turn)` với bảng D.1; tag chỉ còn được dùng cho `Standing` mô tả, không cho số | `applyUpdates:31877–31896` | L |
| Bảng D.1 (gift +5, small_help +3, save_life +15, insult −8, threaten −12, betray −30, kill_witnessed −25/nhân chứng, combat_win −5..−15 theo `margin_ratio`, combat_loss −3) | Không có bảng; AI tự chấm | **Thiếu** | Hằng số vào `gameConfig.js` mục `affinity` | — | M |
| D.2 diminishing returns (chỉ delta dương) | Không có | **Thiếu** | `diminish_factor(A)` | `resolve_turn_affinity` | S |
| D.3 repetition fatigue, key `(npc_id, event_type)`, cửa sổ trượt 5 lượt | Không có | **Thiếu** | `streak[npc][event_type] = {last_event_turn, streak}` — thêm vào `knowledge.relationships` | `knowledge:19987` | M |
| D.4 cap dương/lượt = 20 | Không có | **Thiếu** | — | — | S |
| D.5 lan truyền 1 hop qua `link_strength`, gate `severity ≥ 3` + `perpetrator_known` | `knowledge.relationships` có quan hệ nhưng không có `link_strength` số | **Thiếu** | Thêm `link_strength[a][b] ∈ [-1,1]` (dữ liệu setting pack hoặc AI sinh 1 lần) | `knowledge.relationships` | L |
| 7 dải thái độ (Thù địch sâu sắc … Tri kỷ) | UI hiện hiển thị số affinity thô trong `QuickLoreModal:7514` | **Thiếu** | `attitudeBand(a)` thuần + đưa vào Character Card khối ④ | `QuickLoreModal:7620` | S |
| `deep_hostile = affinity ≤ −80` | Không có | **Thiếu** | Derived; Death & Consequence đọc | — | S |
| Prompt chỉ nhận **band + hướng thay đổi**, không nhận số | Prompt hiện gửi số affinity qua `formatEntityForPrompt:33447` | **Khác biệt** | Sửa formatter | `formatEntityForPrompt:33447` | S |
| Làm tròn half-away-from-zero, 1 lần/NPC | Không có chuẩn | **Thiếu** | `roundHalfAwayFromZero()` trong `src-web/systems/math.ts` | — | S |
| Song Tu | `handleSongTu:27186–27320`, gate `affinity ≥ 80`, `+10`, title "Đạo Lữ" | **GIỮ NGUYÊN** | Chỉ viết adapter xuất `song_tu_relationship_active_npc_ids` từ `titles.includes("Đạo Lữ")` | `songTuAdapter.ts` (mới) | S |
| `handleRecruitCompanion:27110` (affinity ≥ 50) | Có sẵn, không có trong GDD | **App-only** | Giữ, không đụng | — | — |

### B.7 Death & Consequence (GDD 03/2)

| Quy tắc/Cơ chế GDD | Hiện trạng | Trạng thái | Việc cần làm | Điểm móc nối | Độ khó |
|---|---|---|---|---|---|
| Chỉ resolve khi `battle_active=false` ∧ `outcome ∈ {win,lose}` ∧ `!is_spar_friendly` | Chết đến từ tag `[CHARACTER_DEATH]` (`:23324` → `applyUpdates:31089–31106`) do AI quyết | **Khác biệt (lõi)** | `resolve_death_consequence(handoff)` thuần, gọi từ combatAdapter | `finalizeCombatEnd:27618` → `processAndUpdateState:32280` | L |
| Branch A: `affinity(opponent) ≤ −80` → D.1 death_roll `P = clamp(0.10 + 0.85·margin, 0.05, 0.95)` | Không có; người chơi chết theo ý AI, sau đó `handleRespawn:32347` hồi 50% HP | **Thiếu** | RNG **inject được**; strict `<` | — | M |
| D.2 severity tier (mild/medium/severe) → 4 hậu quả | Có `LONG_TERM_STATUS_TEMPLATES:4155` + `[APPLY_LONG_TERM_STATUS]` — hạ tầng đã sẵn | **Khác biệt** | Map 4 `consequence_type` sang 4 template long-term status | `applyUpdates` (APPLY_LONG_TERM_STATUS) | M |
| `death_and_consequence_blocked` (phế đan điền) chặn EXP + `crippled_layer 0.85` | Không có | **Thiếu** | Cờ per-char; EXP đọc; combat **không sửa** (bỏ `crippled_layer`, xem C-11) | `resolve_turn_exp` | M |
| Branch B `pending_fate` 1 lượt: Kết liễu / Tha mạng | Không có | **Thiếu** | Cờ + 2 gợi ý ép vào 4 slot | `parseGeminiResponseAndUpdateState:23544` | M |
| D.3 recovery_attempt (3 phương pháp, cooldown 5 lượt) | Không có | **Thiếu** | Nút Recovery trên Character Card | `QuickLoreModal:7514` | M |
| Chết vĩnh viễn, khóa slot, không hồi sinh | `handleRespawn:32347` xóa inventory + hp 50%; `[CHARACTER_REVIVE]:31204` cho phép hồi sinh | **Xung đột** | Xem C-7 | `handleRespawn:32347`, `GameOverModal:10227` | L |
| `alive`/`death_flag` chỉ 2 code-path ghi | Ghi rải rác qua tag | **Khác biệt** | Đưa về 1 module + CI lint | `applyUpdates:31089` | M |

### B.8 Character Continuation (GDD 03/3)

| Quy tắc/Cơ chế GDD | Hiện trạng | Trạng thái | Việc cần làm | Điểm móc nối | Độ khó |
|---|---|---|---|---|---|
| 3 lối: Quỷ tu / Chuyển sinh / Chơi lại (chỉ Chơi lại chạy được) | `GameOverModal:10227` với Hồi sinh + `performRestart:32829` + `goHome:32836` | **Khác biệt** | Màn S5 mới, 2 stub khóa **thuần thị giác**, không chữ "Coming soon" | `GameOverModal:10227` | M |
| "Chơi lại" tạo **slot mới**, giữ setting pack, reset 5 hệ (N=5), gate `handoff_allowed` | `performRestart:32829` reset toàn bộ vào **cùng** ngữ cảnh | **Khác biệt** | `reset_completeness_check` + tạo slot | `performRestart:32829`, `handleAutosave:32663` | L |
| Không auto-timeout; chờ tap "…(chạm để tiếp tục)" | Modal hiện có nút ngay | **Khác biệt** | UI | `GameOverModal:10227` | S |
| Slot cũ read-only vĩnh viễn | Không có khái niệm khóa slot | **Thiếu** | `slot_closure_reason` (xem B.10) | Persistence | M |

### B.9 World Memory & Context Management (GDD 04/A)

| Quy tắc/Cơ chế GDD | Hiện trạng | Trạng thái | Việc cần làm | Điểm móc nối | Độ khó |
|---|---|---|---|---|---|
| 2 tầng: Full Log không mất mát + AI Context View bị chặn kích thước | `storyHistory:19553` (full) + `storySummaries:18994` (nén) → **cùng ý tưởng** | **Đã có (khác cơ chế)** | Giữ song song hoặc thay; xem C-8 | `checkForSummarization:30913` | L |
| Nén = **trích fact theo luật từ `locked_result`**, tuyệt đối không dùng AI tóm tắt `narration_text` | Ngược lại: `runSummarizationInBackground:30829` gọi AI tóm tắt văn kể ("Biên Niên Sử" 350–500 từ) | **Khác biệt (lõi)** | `extractFacts(locked_result)` theo F2 `has_signal`; giữ summarizer cũ như tầng phụ trợ tuỳ chọn | `runSummarizationInBackground:30829` | L |
| `recency_window_turns = 8` verbatim, sàn tuyệt đối 1 | `filterHistoryContext:24822` + ngưỡng 80 lượt chưa tóm tắt | **Khác biệt** | Tham số hóa | `filterHistoryContext:24822` | M |
| `Fact {fact_id, entity_id, turn_id, world_time, field_name, field_value}` truy vấn theo entity | Không có; `knowledge.eventHistory` là mảng phẳng | **Thiếu** | `src-web/systems/worldMemory/factStore.ts` | `applyUpdates` (sau khi có locked_result) | L |
| `top_K` theo `(importance_tier DESC, world_time DESC, fact_id ASC)` | Không có | **Thiếu** | Cần `importance_tier` từ Setting & Canon | — | M |
| F5 runtime hard clamp `ai_context_hard_token_budget = 8000` | Không đo token | **Thiếu** | Ước lượng token (~4 ký tự/token) + trim theo thứ tự | trước `callGeminiAPI:28690` | M |
| `get_turn_page(anchor, count, direction)` cho Story Log | `loadMoreStory` trong `GameplayScreen:9162` (cuộn vô hạn) | **Khác biệt** | API mới + màn S4 | `GameplayScreen:9162` | M |
| `total_turns()` O(1), `referenced_in_world_memory(entry_id)` cấu trúc | Không có | **Thiếu** | Counter duy trì trong reducer | `applyUpdates` | S |
| Undo = **hard delete** turn record | Không có | **Thiếu** | — | `turnManager` | S |

### B.10 Setting & Canon Integration (GDD 04/B)

| Quy tắc/Cơ chế GDD | Hiện trạng | Trạng thái | Việc cần làm | Điểm móc nối | Độ khó |
|---|---|---|---|---|---|
| Setting pack tĩnh: canon character, canon event, world law | `gameSettings` có fan-fic fields + `knowledge.loreNpcs/loreLocations/loreItems` do AI sinh runtime | **Khác biệt** | Định dạng pack JSON tĩnh dưới `src-web/data/settingPacks/*.json`; AI-generated lore vẫn tồn tại song song | `initializeGame:26356` | XL |
| `CanonEvent {trigger_condition, earliest_world_time, roles[], premises[], on_break, status}` | **Không có gì** tương đương (`LORE_QUEST`/`QUEST_*` là quest do AI sinh, không có premise/cascade) | **Thiếu** | `src-web/systems/canon/` (D.1–D.6) | `processAndUpdateState:32280` | XL |
| 8 loại premise + bảng reversibility | Không có | **Thiếu** | `premiseSatisfied()` — `alive`, `affinity_at_least/most`, `event_completed`, `world_time_reached`, `song_tu_active`, `custom_flag` khả thi ngay; `possesses`/`at_location` cần Equipment/Situation | — | L |
| `transition_event_status` single-writer + severity lattice | Không có | **Thiếu** | — | — | M |
| D.4 cascade vanish + validate DAG lúc load | Không có | **Thiếu** | — | load pack | L |
| D.5 `importance_tier(fact)` 0–3 | Không có | **Thiếu** | World Memory phụ thuộc | — | S |
| `breakthrough_requirement_met(tier)` | `activeBreakthroughQuests` (AI sinh) | **Khác biệt** | Từ world_law của pack; fallback `false` + warning | `handleLevelUp:22839` | M |
| `[REALM_LIST]` tag cho AI đặt tên cảnh giới | `realmProgressionList` mặc định 10 "Giai Đoạn" (`:17353`), AI ghi đè qua tag (`:31433`) | **App-only** | Map sang `world_law.realm_names` của pack; xem C-4 | `applyUpdates:31433` | M |

### B.11 Situation / Encounter Generation (GDD 05/A)

| Quy tắc/Cơ chế GDD | Hiện trạng | Trạng thái | Việc cần làm | Điểm móc nối | Độ khó |
|---|---|---|---|---|---|
| `scene = {location_id, entities_in_scope, scene_tags, active_hook}` khóa trước mọi AI call | Ngữ cảnh dựng ad-hoc trong `processPlayerAction:28283–28689` (contextBlock `:28644`, entityIndexBlock `:28613`) | **Khác biệt** | `src-web/systems/situation/scene.ts` | `processPlayerAction:28283` | L |
| 12 `ENVELOPE_TYPES` + `allowed_envelope_menu` tất định + intent chip | **Không có**; người chơi gõ tự do (`handleCustomAction:30023`) hoặc bấm choice AI (`handleChoice:29186`) | **Thiếu** | Hàng chip trong `GameplayScreen:9162`; `suggest_chip(text)` heuristic | `handleCustomAction:30023` | XL |
| Free text **không chip** → `rp_only`, 0 delta cơ học | Hiện free text có thể gây mọi hậu quả qua AI | **Khác biệt (lõi)** | Ràng buộc mạnh trải nghiệm; xem C-12 | `handleCustomAction:30023` | L |
| D.4 scheduler ưu tiên cứng: Canon Due > NPC initiative > World/Ambient | `allowUnexpectedEvent:19902` + crisis arc theo mốc lượt 150/200/250 (`:28477–28527`) + roll của API-1 | **Khác biệt** | Scheduler tất định, RNG inject | `processPlayerAction:28530` | L |
| D.3 `provoked` + `provoked_consumed_ref` | Không có | **Thiếu** | Tracker trong `knowledge` | — | M |
| D.5 cooldown 2 tầng (per-NPC valence + global window) | `sharedCooldowns`, `adventureSkillCooldowns` có sẵn (khác mục đích) | **Thiếu** | `npc_last_initiated[npc][valence]` | — | M |
| D.7 `encounter_level_range` cho quái ambient | Sinh quái do AI mô tả | **Khác biệt** | Dùng khi tạo đối thủ ambient | `startCombat:18429` | M |
| R7 đồ thị địa điểm + `move_to` chỉ tới nơi kề | `knowledge.locations` có `parentId`, `openHours`, `isLocationOpen:30359`, `[MOVE_PLAYER]` — **có cấu trúc nhưng không có adjacency** | **Khác biệt** | Thêm `adjacent[]` vào location schema | `applyUpdates` (MOVE_PLAYER) | M |
| `spar_friendly` popup 2 lựa chọn | Không có | **Thiếu** | Trước `[START_COMBAT]` | `applyUpdates` (START_COMBAT) | S |

### B.12 Persistence / Save System (GDD 05/B)

| Quy tắc/Cơ chế GDD | Hiện trạng | Trạng thái | Việc cần làm | Điểm móc nối | Độ khó |
|---|---|---|---|---|---|
| **Không có nút Lưu thủ công**; auto-save tại 3 checkpoint | `handleAutosave:32663` (lượt 1 hoặc %5) + nút **"Lưu Ngay"** GitHub 5 slot (`SettingsMenu:8159`) + "Lưu Đám Mây" Firestore + Xuất/Nhập tệp | **Xung đột** | Xem C-2 | `handleAutosave:32663`, `handleConfirmGithubSaveSlot:20645` | L |
| Turn Confirmed **gated** bởi `durability_confirmed` | Autosave chạy fire-and-forget, không chặn lượt | **Khác biệt** | `await` IndexedDB `transaction.oncomplete` trước khi commit lượt | `handleAutosave:32663` → `turnManager` | L |
| `turn_records` append-only key `[slot_id, world_time, hack_seq]` + full flush mỗi 50 lượt | Ghi **toàn bộ state** mỗi lần (`buildGithubSaveDataObject:20593`) | **Khác biệt** | Store IndexedDB mới; giữ store cũ để migrate | IndexedDB `:13306–13502` | XL |
| `schema_version`, `slot_closure_reason`, `readable`, `world_time_latest`, `character_name`, `last_saved_at` | Không có field nào | **Thiếu** | Thêm `SlotRecord`; bump version | `getGithubSaveIndex:16324`, IndexedDB | M |
| `stage()/commit()/abort()` DI seam | Không có | **Thiếu** | `StorageBackend` interface + mock | `:13306–13502` | M |
| Multi-tab `navigator.locks` | Không có | **Thiếu** | `acquire_slot_lock` khi mở slot | `loadGame:21580` | M |
| Formula #1/#3 quota projection + cảnh báo 0.85 | Không có | **Thiếu** | `navigator.storage.estimate()` | — | S |
| Export QA (5 key) + "Chép lại quyển sổ" (text thuần) | Có "Xuất Tệp Đầy Đủ/Nhẹ" (JSON toàn state) | **Khác biệt** | Thêm 2 export mới; giữ export cũ | `SettingsMenu:8169` | M |
| Xóa slot: 1 bước / leo thang gõ lại tên (NFC+trim+case-insensitive) | `SaveSlotModal:8931` xóa bằng ghi `null` | **Thiếu** | O-ConfirmDelete | `SaveSlotModal:8931` | M |
| GitHub/Firestore là mirror best-effort, **không** gate durability | Hiện GitHub là kênh lưu chính do người chơi bấm | **Khác biệt** | Hạ cấp thành mirror | `:16250–16332` | M |

### B.13 Core UI / Screen Navigation (GDD 06/A)

| Quy tắc/Cơ chế GDD | Hiện trạng | Trạng thái | Việc cần làm | Điểm móc nối | Độ khó |
|---|---|---|---|---|---|
| 5 màn `{S1,S2,S4,S4-RO,S5}` + tối đa 1 overlay + tối đa 1 banner | `currentScreen ∈ {initial, gameplay, setup, loading}` + **~28 modal gốc** (`:34102–34490`) | **Khác biệt (lớn)** | `screen_transition_valid` + overlay manager; 28 modal → gom vào 3 overlay hoặc chấp nhận sai lệch (C-3) | `App.tsx:34102–34490` | XL |
| `write_action_allowed` (ma trận 46) | `isProcessingAction`/`isLoading` disable từng nút rời rạc | **Khác biệt** | Bảng tra thuần + recursive disable | `GameplayScreen:9162` | M |
| Nút Undo **biến mất** khi `undo_available=false` | Không có nút | **Thiếu** | — | `GameplayScreen:9162` | M |
| S2 live window ≤ 30 lượt, evict thật (unmount) | Cuộn vô hạn `loadMoreStory` | **Khác biệt** | `s2_resident_turns` + tripwire | `GameplayScreen:9162` | L |
| Settings **đúng 2 nhóm** (Cỡ chữ, Cấu hình AI) + nhóm 3 của #16 | `SettingsMenu:7959` có ~12 mục: BGM, playStyle, theme, textScale, Lưu Ngay, Lưu Đám Mây, Tải Game, Xuất/Nhập tệp, Gallery, Cache, HTAB debug | **Xung đột** | Xem C-3 | `SettingsMenu:7959` | M |
| Ink-sweep chờ AI + escalation 15s + timeout 30s hiển thị trong khung truyện | Có spinner/loading chung | **Khác biệt** | — | `GameplayScreen:9162` | M |
| Story Log S4 phân trang `PAGE_SIZE=20`, `MAX_LOADED_PAGES=3` | Không có màn riêng | **Thiếu** | — | mới | M |
| `TOUCH_TARGET_MIN = 44px`, font scale 3 bậc `{0.875,1.0,1.25}` | `textScale` 90–140 (7+ bậc) trong `SettingsMenu` | **Khác biệt** | Thu về 3 bậc hoặc giữ (C-3) | `SettingsMenu:7959` | S |
| Boot luôn về S1 | Boot về `initial` | **Đã có** | — | — | — |

### B.14 Character Card & Identity (GDD 06/B)

| Quy tắc/Cơ chế GDD | Hiện trạng | Trạng thái | Việc cần làm | Điểm móc nối | Độ khó |
|---|---|---|---|---|---|
| Thẻ = **bề mặt duy nhất** hiển thị số thô, 6 khối cố định ①–⑥ | `QuickLoreModal:7514` + `CharacterInfoModal:6801` + `QuickReferenceModal:12408` — có số nhưng bố cục tự do | **Khác biệt** | Tái cấu trúc `QuickLoreModal` theo thứ tự ①–⑥ | `QuickLoreModal:7514` | L |
| `card_exists(char_id)` — chỉ nhân vật có `char_id` | `openQuickLoreModal:33249` + `formatStoryText:33473` (chạm tên) đã gần đúng | **Đã có** | Thêm gate `card_exists` | `formatStoryText:33473` | S |
| D.2 `displayed_field` (4 loại kết quả: true / displayed / "???" / dual_identity) | Không có che giấu | **Thiếu** | `concealment` schema + badge 「che giấu」 | `QuickLoreModal:7514` | L |
| `base_X0` 12 stat, `base_HP0 > 0` bắt buộc, D.5 completeness check chặn confirm lượt | `INITIAL_STATS:2116` có `baseHp/baseAtk/...`; `handleAppraiseNpc:16893` sinh stat NPC | **Khác biệt** | Validator lúc tạo entity record | `handleAppraiseNpc:16893`, `CREATE_NPC` trong `applyUpdates` | M |
| D.3 `exp_to_next` + sentinel "chờ đột phá" | Thanh EXP có sẵn | **Khác biệt** | Sau khi có EXP mới | `CharacterInfoModal:6801` | S |
| `npc_tag.medium_override`, `npc_tag.concealment_narrative_hint` | Không có | **Thiếu** | Field mới trên NPC | — | S |
| 2 nút mutating duy nhất: Song Tu + Recovery, đi qua Turn Manager | Nút Song Tu có ở `QuickLoreModal:7620` nhưng gọi trực tiếp `handleSongTu` (không tốn lượt) | **Khác biệt** | Không sửa Song Tu (out of scope). Chỉ thêm nút Recovery | `QuickLoreModal:7620` | S |
| Khối ⑤ combat chỉ khi `in_combat` | Có UI combat riêng | **Khác biệt** | — | — | M |

### B.15 Character Customization Mode (GDD 06/C)

| Quy tắc/Cơ chế GDD | Hiện trạng | Trạng thái | Việc cần làm | Điểm móc nối | Độ khó |
|---|---|---|---|---|---|
| Toggle device-level trong Settings, mặc định OFF | `CustomizationModal:8289` mở trực tiếp, không toggle | **Khác biệt** | Nhóm Settings thứ 3 | `SettingsMenu:7959` | S |
| 3 zone + 3 nút Save độc lập, mỗi lần Save = 1 transaction | Modal 1 khối: `handleCustomizeLevel:16991`, base stats `:17012`, item `:17029`, skill `:17055` | **Khác biệt** | Tái cấu trúc 3 zone | `CustomizationModal:8289` | L |
| D.2b bộ ba nguyên tử `(level, current_exp, state)` + no-op gate | `handleCustomizeLevel:16991` chỉ ghi level | **Thiếu** | Validator D.2b (13 fixture) | `handleCustomizeLevel:16991` | M |
| D.3 `is_valid_base_stat_set` — đủ 12 key, blank → `undefined` chứ **không** → 0 | `:17012` ghi từng stat | **Khác biệt** | Validator | `:17012` | M |
| Checkpoint durable thứ 3 (write-through khi submit) | Không ghi ngay | **Thiếu** | — | Persistence | M |
| `invalidate_pending_snapshot()` giết Undo đang chờ | Không có undo | **Thiếu** | — | `turnManager` | S |
| `hack_mode_used_this_slot` (trong slot bundle, **ngoài mọi snapshot**, không xóa được) | Không có | **Thiếu** | Cờ + badge minh bạch | Persistence | M |
| D.5 xóa entry custom có điều kiện | Không có xóa | **Thiếu** | Cần `was_ever_equipped`, `was_ever_resolved_in_combat`, `referenced_in_world_memory` | `CustomizationModal:8289` | L |
| `LEVEL_WRITE_MAX=1e6`, `STAT_WRITE_MAX=1e9` | Có `exactValues` flag (`:22231/:22493`) nhưng không có trần | **Thiếu** | — | `gameConfig.js` | S |

---

## C. Xung đột thiết kế cần chủ sản phẩm quyết định

### C-1. Parse ngược output AI thành world state (nghiêm trọng nhất)

- **GDD:** Contract Enforcement R3 — "Reverse-parsing is absolutely forbidden… no number extraction, no outcome inference, no flag setting. Permanent law."
- **App:** toàn bộ thế giới được AI viết ra qua ~40 tag (`parseGeminiResponseAndUpdateState:23201`): `CREATE_NPC`, `WORLD_ITEM`, `LORE_LOCATION`, `RELATIONSHIP_CHANGED`, `ENCOUNTER_REWARD`, `CHARACTER_DEATH`, `TIME_PASSED`…
- **Phương án A (theo GDD):** bỏ toàn bộ tag pipeline; mọi thay đổi state đến từ module tất định. → Mất hoàn toàn khả năng "AI tự sinh thế giới", vốn là điểm bán hàng của game hiện tại. Ước tính đập bỏ ~6.000 dòng.
- **Phương án B (giữ app):** giữ nguyên tag, không tích hợp Contract Enforcement.
- **Phương án C (lai — khuyến nghị):** chia đôi tag làm 2 nhóm.
  - *Nhóm "kiến tạo nội dung"* (CREATE_NPC, LORE_*, WORLD_ITEM, LOCATION_STATE_UPDATE, QUEST_*, ITEM/SKILL_IDEA…) — **giữ**, nhưng chuyển sang gọi ở **API-1** (call logic có schema JSON), không phải parse từ văn kể của API-2.
  - *Nhóm "kết quả cơ học"* (ENCOUNTER_REWARD/exp, RELATIONSHIP_CHANGED/số affinity, CHARACTER_DEATH, CHARACTER_REVIVE, SET_LEVEL, HEAL_PARTICIPANTS) — **cấm**, thay bằng `locked_result` do module tính.
- **Khuyến nghị: C.** Lý do: giữ được 100% cảm giác chơi hiện tại, mà vẫn đạt được mục tiêu thật sự của Pillar 3 (AI không được đổi kết quả cơ học). Leak detector F1 vẫn chạy được đầy đủ. AC-03 (lint cấm parser trên `narration_text`) áp dụng cho API-2 output là đủ.

### C-2. Lưu thủ công & mô hình slot

- **GDD:** Persistence R1 "người chơi không bao giờ bấm Lưu"; slot không giới hạn (chỉ bị quota trình duyệt giới hạn); mỗi slot = 1 lượt chơi; slot đóng → read-only vĩnh viễn.
- **App:** nút **"Lưu Ngay"** (`SettingsMenu:8159`) đẩy lên GitHub 5 slot cố định (`handleConfirmGithubSaveSlot:20645`, `saves/slot_N.json` + `index.json`), thêm "Lưu Đám Mây" Firestore, Xuất/Nhập tệp; autosave IndexedDB mỗi 5 lượt.
- **Phương án A (theo GDD):** bỏ nút Lưu Ngay; IndexedDB thành nguồn chân lý với `durability_confirmed`; GitHub/Firestore hạ thành mirror nền.
- **Phương án B (giữ app):** giữ 5 slot GitHub như hiện tại.
- **Khuyến nghị: A có điều chỉnh.** Làm IndexedDB thành nguồn chân lý gate lượt (đây là điều kiện tiên quyết cho Undo và cho toàn bộ tính "không thể lật kèo" của Pillar 2). **Giữ** nút "Lưu Ngay" nhưng đổi nhãn thành **"Sao lưu lên GitHub"** và định vị lại là kênh sao lưu đa thiết bị — vì Safari ITP xoá IndexedDB sau ~7 ngày, bỏ GitHub là mất dữ liệu người chơi thật. Slot local thì bỏ trần 5.

### C-3. Settings đúng 2 nhóm vs SettingsMenu hiện tại

- **GDD:** Core UI #10 — MVP chỉ 2 nhóm (Cỡ chữ S/M/L; Cấu hình AI), cộng nhóm 3 "Tùy chỉnh nhân vật" của #16. Font scale đúng 3 bậc `{0.875, 1.0, 1.25}`.
- **App:** ~12 mục (BGM + volume, playStyle RPG/STORY, uiTheme + theme editor, textScale 90–140, 5 mục save/load/export, Gallery, Cache manager, HTAB debug).
- **Phương án A (theo GDD):** cắt xuống 2–3 nhóm, chuyển phần còn lại vào submenu ẩn.
- **Phương án B (giữ app):** giữ nguyên, chỉ thêm nhóm "Tùy chỉnh nhân vật".
- **Khuyến nghị: B + gom nhóm.** GDD viết cho MVP tay trắng; app đã có tính năng người chơi đang dùng (BGM, theme, playStyle). Cắt bỏ là hồi quy tính năng. Đề xuất: gom thành 4 nhóm rõ ràng (Hiển thị / Âm thanh / AI & Dữ liệu / Tùy chỉnh nhân vật), và **chỉ** áp dụng nghiêm ràng buộc `FONT_SCALE_STEP[S] < [M] < [L]` bằng cách map 90–140 hiện tại về 3 preset + thanh trượt nâng cao.

### C-4. Cấu trúc cảnh giới & đường cong EXP

- **GDD:** `tier = floor((L−1)/10)+1`, không trần; `exp_threshold(L) = 100 + 10·(L−1)` **tuyến tính** (cố ý — nhịp độ hằng số, độ khó đến từ cổng đột phá).
- **App:** `calculateMaxExpForLevel:15220` = `100·L^1.5·1.8^realmIndex` (siêu tuyến tính, mỗi cảnh giới nhân 1.8×); `realmProgressionList` mặc định 10 mục (`:17353`) nhưng AI có thể ghi đè 10–20 cảnh giới qua `[REALM_LIST]` (`applyUpdates:31433`); `getRealmInfoFromLevel:22791` overflow ra "Vô Định Cảnh".
- **Phương án A (theo GDD):** thay bằng công thức tuyến tính + cổng "Chờ Đột Phá". → **Phá vỡ mọi save đang có**: nhân vật cấp 40 hiện có `maxExp ≈ 100·40^1.5·1.8^3 ≈ 147.000`, công thức mới cho 490. Cần migration hoặc chấp nhận reset.
- **Phương án B (giữ app):** giữ công thức mũ; chỉ thêm cổng "Chờ Đột Phá" mỗi 10 cấp lên trên công thức cũ.
- **Khuyến nghị: B.** Giá trị thật của GDD EXP nằm ở **4 nguồn tất định + cổng đột phá + rollback**, không nằm ở hình dạng đường cong (GDD tự thừa nhận `BASE_EXP_THRESHOLD`/`INCREMENT` là "display-only, không đổi nhịp thật"). Giữ `calculateMaxExpForLevel` làm `exp_threshold()`, đưa các tỷ lệ D.2/D.3/D.4 (`WIN_EXP_BASE_FRACTION` 0.20, `LOSS_EXP_RATE` 0.04, `PASSIVE_EXP_RATE` 0.001…) áp lên `exp_threshold(L)` như GDD quy định — bất biến kinh tế vẫn giữ nguyên vì mọi nguồn đều là `RATE × exp_threshold`. Giữ `realmProgressionList` do AI đặt tên (map vào `world_law.realm_names`).

### C-5. Hệ AP / allocatedPoints vs D.5 stat growth

- **GDD:** 12 chỉ số theo công thức cứng `base_X0 + LEVEL_GROWTH_X·(L−1) + BREAKTHROUGH_BONUS_X·(tier−1)`; không có khái niệm người chơi phân bổ điểm.
- **App:** `calculateTotalAP:18568` + `allocatedPoints {hp,atk,def,spd}` + `apConversionRates` — người chơi tự phân bổ.
- **Khuyến nghị: giữ app, cộng dồn.** `stat_value = base_X0 + LEVEL_GROWTH_X·(L−1) + BREAKTHROUGH_BONUS_X·(tier−1) + AP_bonus`. GDD D.5 không cấm số hạng phụ, và bỏ AP là hồi quy tính năng lớn. Cần thêm 24 hằng số vào `gameConfig.js` (9/12 stat GDD tự nhận là "chưa tune").

### C-6. Ngưỡng affinity & Song Tu

- **GDD:** `SONG_TU_THRESHOLD = 60`, break < 40, máy trạng thái 5 pha, cooldown 5 lượt; 7 dải thái độ; `deep_hostile ≤ −80`.
- **App:** nút Song Tu ở `QuickLoreModal:7620` gate `affinity ≥ 80`, hiệu ứng `+10`, tặng title "Đạo Lữ" (`handleSongTu:27186`).
- **Khuyến nghị: giữ 80 (đã được chỉ định out-of-scope).** Nhưng **phải** thêm 7 dải thái độ và `deep_hostile = −80` vì Death & Consequence Branch A phụ thuộc trực tiếp vào ngưỡng −80. Song Tu adapter chỉ đọc title, không đọc ngưỡng. Lưu ý ghi vào tài liệu: GDD Character Card nói "thẻ không được giữ ngưỡng riêng" — ở đây ngưỡng nằm ở `handleSongTu`, chấp nhận sai lệch có ý thức.

### C-7. Chết vĩnh viễn vs hồi sinh

- **GDD:** chết là vĩnh viễn, không cứu được kể cả bởi AI (anti-pillar); slot bị khóa read-only ngay; chuyển sang Character Continuation (Quỷ tu / Chuyển sinh / Chơi lại), Undo bị vô hiệu vĩnh viễn.
- **App:** `GameOverModal:10227` → `handleRespawn:32347` hồi sinh với 50% HP, mất inventory + trang bị; ngoài ra AI có thể hồi sinh NPC qua `[CHARACTER_REVIVE]:31204`.
- **Phương án A (theo GDD):** bỏ `handleRespawn`, thêm khóa slot + màn 3 lối.
- **Phương án B (giữ app):** giữ hồi sinh.
- **Phương án C (lai):** thêm cài đặt "Chế độ khắc nghiệt" (mặc định OFF cho save cũ, ON cho save mới) — OFF = hồi sinh như hiện tại, ON = theo GDD.
- **Khuyến nghị: C.** Đây là thay đổi cảm xúc nặng nhất với người chơi hiện hữu; ép A sẽ gây phản ứng. Nhưng toàn bộ giá trị của Death & Consequence (death_roll, severity tier, crippled) chỉ có ý nghĩa khi cái chết thật sự mất mát. Cho phép chọn.

### C-8. Nén ký ức bằng AI vs trích fact theo luật

- **GDD:** World Memory tuyệt đối không dùng AI tóm tắt `narration_text`; chỉ trích fact từ trường có cấu trúc của `locked_result` (giữ `calls_per_turn ≤ 3` và chặn stored prompt-injection ở mức "cửa sổ nhiễm bẩn có trần").
- **App:** `runSummarizationInBackground:30829` gọi AI tóm tắt 40 lượt cũ thành "Biên Niên Sử" 350–500 từ; > 20 bản tóm tắt lại gộp thành "Đại Biên Niên Sử".
- **Khuyến nghị: chạy song song.** Thêm fact store theo luật (bắt buộc, vì Setting & Canon `importance_tier` và Character Card phụ thuộc), **giữ** summarizer AI như một tầng ngữ cảnh bổ sung. Ghi rõ: mỗi summarize là 1 call ngoài `calls_per_turn` (chạy nền, không trong lượt) — cần chốt cùng C-9.

### C-9. `calls_per_turn ≤ 3` vs kiến trúc gọi AI hiện tại

- **GDD:** hằng số kiến trúc cứng, không phải knob; 2 call bình thường (suggestion + narration), 3 khi retry gợi ý; call thứ 2 khi đang bận → trả `BUSY`, **không xếp hàng**.
- **App:** mỗi lượt gồm API-1 (logic) + API-2 (kể) = 2 ✔, nhưng thêm `runAPI3StateMonitor:29280` (giám sát state nền), `runQuestCheckAPI:32267`, drain `pendingCreations` (item/skill/quest details), và `ApiQueueManager` xếp hàng với `apiQueueDelayMs = 13000`.
- **Phương án A (theo GDD):** bỏ API-3 + quest check + drain, chuyển sang tất định.
- **Phương án B (giữ app):** định nghĩa lại `calls_per_turn` = chỉ đếm call **trong critical path của lượt**; các call nền (API-3, summarizer, drain creations) không tính.
- **Khuyến nghị: B, có ghi chú chính thức.** API-3 đang sửa chữa chính những sai lệch mà GDD tránh được bằng cách lock-first; khi đã lock-first cho exp/affinity/death thì API-3 sẽ tự nhẹ đi và có thể cắt dần. Nhưng bỏ ngay lập tức là quá rủi ro. Đề xuất mục tiêu: sau P4, API-3 chỉ còn giám sát *thời gian & vị trí*, bỏ giám sát HP/EXP/quest.

### C-10. Timeout 30s vs văn kể dài

- **GDD:** `ai_call_timeout_seconds = 30` cho toàn bộ logical call, `request_timeout_default = 15` mỗi HTTP request.
- **App:** không có timeout nào; queue delay 13s giữa các call đã ăn gần nửa ngân sách 30s ngay từ đầu; văn kể dài (đặc biệt nội dung NSFW dài) thường vượt 15s.
- **Khuyến nghị:** thêm `AbortController` (bắt buộc — hiện tại một request treo sẽ treo game vĩnh viễn), nhưng **nâng knob**: `ai_call_timeout_seconds = 60`, `request_timeout_default = 45`, và **loại `apiQueueDelayMs` ra khỏi phép đo `t_elapsed`** (nó là hàng đợi client-side, không phải độ trễ mạng). Ghi vào registry như sai lệch có chủ ý so với dải 10–60 của GDD.

### C-11. `crippled_layer` chạm vào Combat (out of scope)

- **GDD:** Death & Consequence severe → `death_and_consequence_blocked = true` → Combat nhân `CRIPPLED_PENALTY_MULT = 0.85`.
- **App:** Combat được chỉ định giữ nguyên.
- **Khuyến nghị:** **bỏ** nhánh nhân vào combat. Thay bằng một `longTermStatus` "Phế Đan Điền" dùng hạ tầng `LONG_TERM_STATUS_TEMPLATES:4155` sẵn có (giảm chỉ số qua `parseStatsBonus:2653`) — đạt cùng hiệu ứng mà không đụng `CombatLoop`. Giữ nguyên tác dụng chặn EXP.

### C-12. Envelope/intent-chip vs nhập tự do

- **GDD:** free text **không có chip** → `rp_only`, tuyệt đối 0 delta cơ học; mọi hệ quả cơ học phải khai báo trước bằng chip từ menu whitelist.
- **App:** `handleCustomAction:30023` cho gõ bất cứ gì, AI-1 chấm xác suất và mọi hệ quả đều có thể xảy ra — đây là "Roleplay Freedom" mà người chơi đang có.
- **Phương án A (theo GDD):** thêm hàng chip, khóa hệ quả cơ học sau chip.
- **Phương án B (giữ app):** không làm envelope; Situation Gen chỉ làm phần scheduler + scene.
- **Phương án C (lai — khuyến nghị):** thêm hàng chip **tùy chọn** với `suggest_chip(text)` gợi ý; nếu người chơi không chọn chip, vẫn để AI-1 chấm như hiện tại nhưng **giới hạn** biên độ delta (áp trần bảng D.1). Như vậy có được lợi ích chống prompt-injection mà không mất tự do.

### C-13. Undo — tính năng hoàn toàn mới

- **GDD:** Undo 1 lượt là Pillar 2 ("history is permanent **except** a one-turn undo"), có snapshot/restore trên mọi hệ, không dùng được ở lượt chết.
- **App:** không có gì; và `applyUpdates:30989` đã deep-clone toàn bộ `knowledge` mỗi lượt — nghĩa là **snapshot gần như miễn phí** về mặt kiến trúc.
- **Khuyến nghị: LÀM.** Đây là tính năng đắt giá nhất/chi phí thấp nhất trong toàn bộ bộ GDD, vì hạ tầng deep-clone đã sẵn. Chỉ cần giữ 1 bản `structuredClone(knowledge + storyHistory + gameSettings)` trước mỗi lượt và một nút. Rủi ro chính là các state nằm ngoài `knowledge` (storySummaries, currentTurn, IndexedDB avatar) cần được liệt kê đầy đủ.

### C-14. Setting Pack tĩnh vs lore do AI sinh

- **GDD:** Setting & Canon giả định một "setting pack" tĩnh viết tay (canon character, canon event, premise, world law) là nguồn chân lý.
- **App:** hoàn toàn ngược lại — người chơi tự nhập bối cảnh ở `GameSetupScreen:5468` (tab WORLD/CHARACTER/ENTITIES/FAN_FICTION), AI sinh toàn bộ lore runtime.
- **Khuyến nghị:** làm Setting & Canon **tùy chọn theo pack**. Nếu người chơi chọn "Đồng nhân" của một tác phẩm có pack (`src-web/data/settingPacks/*.json`) thì bật engine canon; nếu chơi thế giới tự tạo thì `resolve_turn_canon` trả rỗng mỗi lượt (GDD đã cho phép: "A pack with zero events still runs fully"). Đây là giai đoạn nên xếp **cuối cùng**.

---

## D. Kế hoạch theo giai đoạn

Nguyên tắc xuyên suốt: mọi logic mới là **module TS thuần** dưới `src-web/systems/`, không import React, không `fetch`, nhận mọi phụ thuộc bằng dependency injection (RNG, đồng hồ, storage). `App.tsx` chỉ *gọi* chúng tại các điểm móc nối cố định.

### P0 — Hạ tầng & hợp đồng (điều kiện tiên quyết)

**Mục tiêu:** có test runner, có từ vựng chung, có adapter đọc Combat/Song Tu mà không sửa chúng.

- File mới:
  - `package.json` + `vitest.config.ts` — thêm `vitest`, `@vitest/coverage-v8`, script `test`
  - `src-web/systems/types.ts` — `LockedResult`, `TurnRecord`, `Suggestion`, `Envelope`, `UndoableSystem`, `CharId`
  - `src-web/systems/registry.ts` — mọi hằng số dùng chung, **import một lần, không viết lặp**: `TOUCH_TARGET_MIN=44`, `suggested_action_count=4`, `undo_depth=1`, `ai_call_timeout_seconds`, `deep_hostility_threshold=-80`, `HOSTILE_INITIATIVE_LEVEL_GAP_MAX=20`, `MAX_NPC_PER_SCENE=3`, `max_entities_per_prompt=4`, `recency_window_turns=8`, `CONTENT_EXCHANGE_ESTIMATE=30`, `live_window_turns=30`, `LEVEL_WRITE_MAX`, `STAT_WRITE_MAX`
  - `src-web/systems/math.ts` — `roundHalfAwayFromZero`, `clamp`, `safeDiv(a, b, floor=1)` (ép `float()` trước chia, mẫu số sàn 1)
  - `src-web/systems/adapters/combatAdapter.ts` — `toCombatHandoff(combatResults, knowledge)` → `{battle_active, is_spar_friendly, outcome:{type,winner_id,loser_id}, per_actor:{[id]:{hp_after}}, in_combat}`
  - `src-web/systems/adapters/songTuAdapter.ts` — `getSongTuActiveNpcIds(knowledge)` từ `titles.includes("Đạo Lữ")`
  - `src-web/systems/configValidation.ts` — fail-loud lúc load: `WIN_EXP_BASE_FRACTION × WIN_EXP_FLOOR_MULT ≥ LOSS_EXP_RATE`, `SEVERITY_MILD_THRESHOLD < SEVERITY_SEVERE_THRESHOLD`, `DEATH_ROLL_MIN < DEATH_ROLL_MAX`, `RECOVERY_ITEM_MIN < RECOVERY_ITEM_MAX`, `DIMINISH_FLOOR > 0`, `FATIGUE_WINDOW_TURNS ≥ POSITIVE_SOCIAL_COOLDOWN_TURNS`, `RESCUE_COOLDOWN_TURNS ≥ 2×POSITIVE_SOCIAL_COOLDOWN_TURNS`, đủ 26 hằng số EXP
- Sửa `App.tsx`: **không sửa gì** ngoài việc `import` adapter (adapter đọc, không ghi).
- Test: `tests/unit/adapters/*.test.ts` — schema drift test giữa `applyCombatResults:18647`/`finalizeCombatEnd:27618` và shape GDD (GDD 02 AC nhấn mạnh lỗi `battle_result` vs `outcome` đã từng xảy ra thật).
- Ước lượng: **M (2–3 ngày)**, ~40 test.

### P1 — EXP & Realm + Equipment/Skill Data (thuần, chưa nối UI)

**Phụ thuộc:** P0.

- File mới:
  - `src-web/systems/exp/expThreshold.ts` — `expThreshold(level)` (bọc `calculateMaxExpForLevel` theo quyết định C-4), `tierFromLevel(level)`
  - `src-web/systems/exp/resolveTurnExp.ts` — D.2/D.3/D.4/D.6 + `apply_exp_gain` D.7 + `try_execute_breakthrough` + `process_character_turn`
  - `src-web/systems/exp/statGrowth.ts` — D.5, `PERCENT_STAT_CAP = 0.95`
  - `src-web/systems/equipment/schema.ts`, `validateDataset.ts` (F1/F2), `loadout.ts` (lazy-init theo `char_id`)
- Sửa `gameConfig.js`: thêm khối `expProgression` (10 knob + 24 hằng số `LEVEL_GROWTH_X`/`BREAKTHROUGH_BONUS_X`), khối `equipment` (`min_thuc_per_skill=3`, `max_known_skills_per_character=6`).
- Sửa `App.tsx`:
  - `calculateMaxExpForLevel:15220` → delegate sang module
  - `handleLevelUp:22839` → thêm cổng "Chờ Đột Phá" (dừng trước cấp bội số 10, clamp exp = threshold, set `state`)
  - `applyUpdates:31935–32010` (`ENCOUNTER_REWARD`) → giữ như nguồn EXP "sự kiện tự do", **thêm** `resolve_turn_exp` gọi ở giai đoạn reconciliation `:32135`
  - `handleEquipItem:26799` → set `was_ever_equipped = true`
  - `fetchSkillDetailsFromAI:22298` → sinh `thuc_id` toàn cục cho từng `active_action`
- Test: `tests/unit/exp-realm-progression/` (AC-01…AC-49, ~55 test), `tests/unit/equipment/` (18 AC).
- Ước lượng: **L (4–6 ngày)**.

### P2 — NPC Affinity + Death & Consequence

**Phụ thuộc:** P0 (adapter), P1 (`max_HP` từ stat growth).

- File mới:
  - `src-web/systems/affinity/table.ts` (D.1), `diminish.ts` (D.2), `fatigue.ts` (D.3), `propagate.ts` (D.5), `resolveTurnAffinity.ts` (D.6), `bands.ts` (7 dải + `deep_hostile`)
  - `src-web/systems/death/deathRoll.ts` (D.1), `severityTier.ts` (D.2), `recovery.ts` (D.3), `resolveDeathConsequence.ts` (Branch A/B), `pendingFate.ts`
- Sửa `gameConfig.js`: khối `affinity` (21 knob), khối `death` (12 knob).
- Sửa `App.tsx`:
  - `applyUpdates:31877–31896` (`RELATIONSHIP_CHANGED`) → tag chỉ còn ghi `Standing` chữ; số delta đến từ `resolve_turn_affinity`
  - `applyUpdates:31089–31106` (`CHARACTER_DEATH`) → phải đi qua `resolveDeathConsequence`; tag không được ghi trực tiếp `isPermanentlyDead` cho người chơi
  - `finalizeCombatEnd:27618` → sau khi combat kết thúc, gọi thứ tự **cố định**: `combatAdapter → resolveDeathConsequence → resolveTurnAffinity → (canon, P5) → resolveTurnExp`
  - `handleRespawn:32347` → gate bằng cài đặt "Chế độ khắc nghiệt" (C-7)
  - `QuickLoreModal:7514` → hiển thị dải thái độ thay số thô; thêm nút Recovery; **không đụng nút Song Tu ở `:7620`**
  - `formatEntityForPrompt:33447` → prompt nhận band + hướng, không nhận số
- Test: `tests/unit/npc-affinity/` (~39 AC), `tests/unit/death-and-consequence/` (~50 AC). RNG inject bắt buộc.
- Ước lượng: **L (5–7 ngày)**.

### P3 — World Memory + Persistence v2

**Phụ thuộc:** P0. Song song được với P1/P2.

- File mới:
  - `src-web/systems/worldMemory/factStore.ts` (F2 `has_signal`, `entity_id` từ tên trường), `recencyWindow.ts` (F1), `selectFacts.ts` (F3), `contextView.ts` (F4/F5 clamp), `worldMemory.ts` (API `get_turn_page`/`get_turn`/`get_facts_by_entity`/`total_turns`/`referenced_in_world_memory`)
  - `src-web/systems/persistence/storageBackend.ts` (interface `stage/commit/abort` + impl IndexedDB + mock), `slotRecord.ts` (`schema_version`, `slot_closure_reason`, `readable`, `character_name`, `last_saved_at`), `saveCheckpoint.ts` (F2 completeness), `quota.ts` (F1/F3), `slotLock.ts` (`navigator.locks`), `exportQaLog.ts` (5 key), `exportKeepsake.ts` (text thuần)
- Sửa `App.tsx`:
  - IndexedDB `:13306–13502` → thêm store `slots`, `turn_records` (key `[slot_id, world_time, hack_seq]`), `snapshots`; migration từ `autosave_<gameId>`
  - `handleAutosave:32663` → thay bằng `saveCheckpoint(slot, 'turn_confirm')` **await** `durability_confirmed`
  - `loadGame:21580` / `loadGameAndResetHistory:17151` → `acquire_slot_lock` + kiểm `schema_version` + apply snapshot rồi replay turn records
  - `SaveSlotModal:8931` → 2 mức xác nhận xóa
  - `:16250–16332` (GitHub) → hạ cấp thành mirror best-effort, không gate lượt (C-2)
  - `SettingsMenu:8169` → thêm "Chép lại quyển sổ"
- Test: `tests/unit/world-memory/` (~34 AC), `tests/unit/persistence/` (~38 AC), mock backend fail giữa `stage()` và `commit()`.
- Ước lượng: **XL (8–12 ngày)**.

### P4 — Turn Manager + Contract Enforcement + AI Layer (**giai đoạn then chốt**)

**Phụ thuộc:** P1, P2, P3.

- File mới:
  - `src-web/systems/turn/turnManager.ts` — `submitAction()` theo pseudocode A.4, `undo()`, F1/F2/F3
  - `src-web/systems/turn/snapshotRegistry.ts` — `_registered_systems[]` + `_pending_snapshot[]` index-aligned, `invalidate_pending_snapshot()`
  - `src-web/systems/ai/requestAi.ts` — wrapper duy nhất, F1 backoff, F2 budget, F3 model ladder (`tried` monotonic), 4 nhãn lỗi, `BUSY`
  - `src-web/systems/ai/promptBuilder.ts` — dựng prompt cho `narration_call` / `suggestion_call`; delimiter bọc World Memory + player input; 2 directive bắt buộc; `safetySettings: BLOCK_NONE`
  - `src-web/systems/contract/leakDetector.ts` — F1/F1-backstop/F2/F3 + session log
  - `src-web/systems/ai/config.ts` — `AiLlmTuningConfig` (model list + knob)
- Sửa `App.tsx`:
  - `fetchWithRetries:17965` → delegate sang `requestAi`; thêm `AbortSignal` + timeout (C-10)
  - `callGeminiAPI:24867` → API-1 giữ (logic engine), API-2 đi qua `promptBuilder`; sau khi có text → `leakCheck(turnRecord)`
  - `processPlayerAction:27995` → bọc trong `turnManager.submitAction()`: capture snapshot → resolve mechanics (P1/P2) → narration → World Memory append → `saveCheckpoint` await → commit
  - `GameplayScreen:9162` → nút "Hoàn tác" hiện/ẩn theo `undo_available`; 4 gợi ý cố định; `tm_state` khóa input
  - `parseGeminiResponseAndUpdateState:23201` → chia 2 nhóm tag theo quyết định C-1; nhóm cơ học bị chặn (throw ở dev, log ở prod)
  - Gộp dần 33 call-site: ưu tiên `fetchGenericGeminiText:21992`, `runAPI3StateMonitor:29280`, `runQuestCheckAPI:32267`
- Test: `tests/unit/turn-manager/` (18 AC), `tests/unit/contract-enforcement/` (16 AC), `tests/unit/ai-llm/` (34 AC — mock `fetch` + fake clock).
- Ước lượng: **XL (10–15 ngày)**. Đây là giai đoạn rủi ro regression cao nhất.

### P5 — Situation/Encounter + Setting & Canon

**Phụ thuộc:** P4 (cần `locked_result` + turn lifecycle).

- File mới:
  - `src-web/systems/situation/envelopeMenu.ts` (D.1), `provoked.ts` (D.3), `selectHook.ts` (D.4/D.4b), `cooldowns.ts` (D.5), `entitiesInScope.ts` (D.6), `encounterLevelRange.ts` (D.7), `classify.ts` (chip → envelope, string-match cho `canon_role_rescue`)
  - `src-web/systems/canon/settingPack.ts` (load + validate DAG, `on_break` bắt buộc), `premise.ts` (D.1), `substitute.ts` (D.3), `cascade.ts` (D.4), `importanceTier.ts` (D.5), `transitionStatus.ts` (D.5b), `resolveTurnCanon.ts` (D.6)
  - `src-web/data/settingPacks/` — ít nhất 1 pack MVP (5–8 địa điểm, 3 NPC, 2–3 canon event)
- Sửa `App.tsx`:
  - `processPlayerAction:28283–28689` → dùng scene đã khóa thay cho contextBlock ad-hoc
  - `:28477–28530` (crisis arc + `allowUnexpectedEvent`) → thay bằng scheduler tất định, hoặc giữ như tầng "ambient" thứ 4
  - `GameplayScreen:9162` → hàng intent chip (theo C-12: tùy chọn)
  - `applyUpdates` (`MOVE_PLAYER`) → chỉ tới địa điểm kề
  - `applyUpdates` (`START_COMBAT`) → popup `spar_friendly` 2 lựa chọn
  - `handleLevelUp:22839` → `breakthrough_requirement_met(tier)` từ canon STEP 3
- Test: `tests/unit/situation-encounter-generation/` (41 AC, seed `20260810`/`20260810b`), `tests/unit/setting-canon-integration/` (49 AC).
- Ước lượng: **XL (12–18 ngày)**. Có thể cắt: chỉ làm Situation Gen, hoãn Canon (C-14).

### P6 — UI: Character Card, Core UI, Continuation, Customization

**Phụ thuộc:** P4 (P5 cho scene header).

- File mới:
  - `src-web/systems/ui/writeActionAllowed.ts` (D.1 ma trận 46), `screenTransition.ts` (D.2), `pagination.ts` (D.3), `liveWindow.ts` (D.3b + tripwire), `touchTarget.ts` (D.4), `layout.ts` (D.5), `bannerQueue.ts`
  - `src-web/systems/card/displayedField.ts` (D.2), `expToNext.ts` (D.3), `displayedEstimate.ts` (D.4), `baseStatCompleteness.ts` (D.5), `cardBlocks.ts`
  - `src-web/systems/customize/validators.ts` (D.1/D.2/D.2b/D.3/D.4/D.5)
- Sửa `App.tsx`:
  - `QuickLoreModal:7514` → cấu trúc lại theo ①–⑥, `displayed_field`, badge 「che giấu」/`"???"`
  - `GameOverModal:10227` → màn S5 3 lối; `performRestart:32829` → `Processing Chơi Lại` + `reset_completeness_check` (N=5)
  - `CustomizationModal:8289` → 3 zone, 3 nút Save, in-flight lock, write-through checkpoint, `hack_mode_used_this_slot`, `invalidate_pending_snapshot()`
  - `SettingsMenu:7959` → gom nhóm (C-3) + nhóm "Tùy chỉnh nhân vật" + toggle mặc định OFF
  - `GameplayScreen:9162` → live window 30 lượt (unmount thật), ink-sweep + escalation 15s, màn Story Log S4
  - `handleCustomizeLevel:16991`/`:17012` → validator D.2b/D.3
- Test: `tests/unit/core-ui-screen-navigation/` (35 unit AC blocking), `tests/unit/character-card-identity/` (~47 AC), `tests/unit/character-customization-mode/` (~48 AC).
- Ước lượng: **XL (10–15 ngày)**.

### P7 — CI, bất biến tĩnh, cổng giả thuyết MVP

- `tools/ci/checkAiCallSites.mjs` — chỉ `src-web/systems/ai/` được match cả HTTP client lẫn allowlist endpoint (AC-01 của AI layer)
- ESLint `no-restricted-syntax` cấm `parse*`/`match`/`Number()` trên định danh `narration_text` ngoài module leak detector (AC-03 Contract)
- 4 bất biến CI của Core UI: `log_prefetch_threshold < log_page_size`, `banner ≤ settings ≤ card ≤ screen`, `FONT_SCALE_STEP[S]<[M]<[L]`, `live_window_turns ≥ CONTENT_EXCHANGE_ESTIMATE`
- CI lint: không hệ nào ngoài `death/` ghi `alive`/`death_flag`/`death_and_consequence_blocked`
- GitHub Actions chạy `vitest run` mỗi push/PR (chưa có workflow nào)
- Cổng MVP: log leak `V = 0` qua `T ≥ 90` lượt / ≥ 3 phiên
- Ước lượng: **M (2–3 ngày)**.

### Bảng tổng hợp

| Giai đoạn | Hệ thống | Kích thước | Có thể cắt? |
|---|---|---|---|
| P0 | Hạ tầng, adapter, registry | M | ❌ bắt buộc |
| P1 | EXP & Realm, Equipment Data | L | ❌ |
| P2 | Affinity, Death & Consequence | L | ❌ |
| P3 | World Memory, Persistence v2 | XL | ⚠️ có thể làm rút gọn (bỏ append-only, giữ full-state ghi) |
| P4 | Turn Manager, Contract, AI Layer | XL | ❌ trái tim |
| P5 | Situation/Encounter, Setting & Canon | XL | ✅ Canon có thể hoãn hoàn toàn |
| P6 | Core UI, Card, Continuation, Customize | XL | ⚠️ chỉ làm Card + Undo button + Continuation |
| P7 | CI & bất biến | M | ⚠️ |

**Lộ trình rút gọn đề xuất (nếu muốn thấy giá trị sớm):** P0 → P1 → P2 → P3-rút-gọn → P4 → P6-rút-gọn. Bỏ P5 hoàn toàn. Kết quả: EXP/affinity/death tất định + Undo + Character Card chuẩn + leak detector — tức là đã đạt được 4/5 pillar mà không phải viết engine canon.

---

## E. Rủi ro & giả định

### Rủi ro

| # | Rủi ro | Mức | Giảm thiểu |
|---|---|---|---|
| R1 | **`applyUpdates:30989–32266` là hàm 1.278 dòng**, deep-clone, nhiều kênh ghi `knowledge`. Mọi hệ mới cắm vào đây đều dễ gây regression âm thầm | Cao | Cắm vào **một điểm duy nhất** ở cuối (`:32135` reconciliation); viết integration test chụp `knowledge` trước/sau |
| R2 | Ép R3 (cấm parse ngược) sẽ **phá vỡ trải nghiệm cốt lõi** của game hiện hữu | Cao | Quyết định C-1 phương án lai; làm từng nhóm tag một, có cờ bật/tắt trong dev |
| R3 | **Không có test nào tồn tại**; không có baseline để biết đã hỏng gì | Cao | P0 phải scaffold Vitest trước; viết integration test "golden turn" từ save thật trước khi sửa |
| R4 | Thay công thức EXP làm **hỏng save cũ** (nhân vật cấp cao mất tiến độ) | Cao | Khuyến nghị C-4 phương án B (giữ công thức); nếu đổi thì phải viết migration + bump `schema_version` |
| R5 | Undo cần snapshot **toàn bộ** state; bỏ sót một mảnh (storySummaries, currentTurn, IndexedDB avatar, `activeCriticalPromisesRef`) → rollback không toàn vẹn, dữ liệu "ma" | Cao | Liệt kê tường minh `_registered_systems`; test AC-05 kiểm tra từng trường; tripwire assert |
| R6 | Gộp 33 call-site AI về 1 wrapper là **thay đổi bề mặt rộng**, dễ vỡ các luồng phụ (sinh ảnh, thẩm định NPC, crafting) | Cao | Gộp theo đợt; luồng ảnh (`:13534`, `:13694`, `:13882`) có thể giữ ngoài wrapper vì không phải narration |
| R7 | `calls_per_turn ≤ 3` xung đột với `ApiQueueManager` delay 13s → 1 lượt có thể mất > 40s cảm nhận | Trung bình | C-9 + C-10; đo lại `apiQueueDelayMs` sau khi cắt API-3 |
| R8 | Persistence gate `durability_confirmed` làm **chậm mỗi lượt** thêm 50–150ms; trên mobile Safari có thể tệ hơn | Trung bình | Knob `max_perceived_autosave_latency_ms = 150`; ghi log vi phạm ngân sách, không chặn |
| R9 | Setting & Canon giả định pack tĩnh — **mâu thuẫn kiến trúc** với game để người chơi tự nhập bối cảnh | Trung bình | C-14: pack tùy chọn; engine trả rỗng khi không có pack |
| R10 | `crippled_layer` và `stat_growth` đều muốn chạm vào Combat (out of scope) | Trung bình | C-11: dùng `longTermStatus` thay vì sửa `CombatLoop` |
| R11 | Bộ GDD có **~450 AC blocking**. Viết đủ test là khối lượng ngang phần implement | Trung bình | Ưu tiên AC có anchor số cụ thể (AC-13, AC-20, AC-29 của EXP; AC-20 của Affinity); các AC "spy call order" viết sau |
| R12 | Nhiều GDD có ngoặc "provisional field name" (`death_flag_[char]`, `battle_result_[char]`, `breakthrough_flag_[char]`) chưa chốt | Thấp | Chốt một lần trong `src-web/systems/types.ts` ở P0; mọi nơi import |
| R13 | GDD `character-customization-mode.md` vẫn là **"In Design — Revised r3"**, và tự khai báo cần chạy `/propagate-design-change` cho 6 hệ upstream trước khi implement | Thấp | Xếp P6 cuối cùng; chạy propagate trước |
| R14 | Rò rỉ khóa API: 33 call-site nhúng `?key=` trực tiếp trong URL; GDD chỉ yêu cầu "chống tò mò" nhưng CORS prototype cho thấy Gemini echo mọi Origin | Thấp | Bật HTTP-referrer restriction ở Google Cloud Console (điều kiện của ADR AI backend) |

### Giả định

1. **Combat và Song Tu tuyệt đối không sửa.** Mọi tương tác đi qua adapter chỉ-đọc. Nếu adapter phát hiện shape combat không cung cấp đủ `winner_id`/`loser_id`/`hp_after`, phải bổ sung ở lớp adapter bằng cách suy ra từ `combatResults`, **không** sửa `CombatLoop`.
2. **`character.id` chính là `char_id` của GDD**, và duy nhất trong một slot. Cần verify: `CREATE_NPC` có sinh id ổn định không, hay có va chạm.
3. **`knowledge` được deep-clone mỗi lượt** (đã xác nhận ở `applyUpdates`), nên `capture_snapshot` là `structuredClone` và rẻ về mặt kiến trúc — nhưng có chi phí bộ nhớ. Giả định `knowledge` < 5 MB ở lượt 500.
4. **IndexedDB là nguồn chân lý**; GitHub/Firestore là mirror. Nếu chủ sản phẩm chọn ngược lại (C-2 phương án B) thì `durability_confirmed` không thể gate lượt và Undo mất tính an toàn.
5. **Người chơi hiện hữu có save đang chơi.** Mọi thay đổi schema phải kèm migration hoặc bump `schema_version` có đường nâng cấp, không được reject thẳng save cũ như GDD R8 quy định (R8 viết cho MVP tay trắng).
6. **Vietnamese-only** cho mọi chuỗi hiển thị; code/comment tiếng Anh theo `coding-standards.md`.
7. **Không có backend proxy**; khóa API vẫn ở client theo ADR-0003.
8. GDD 05 (Persistence) trạng thái là **"Designed"** chứ không phải "Approved" như các GDD khác — nghĩa là phần P3 có rủi ro thiết kế còn thay đổi cao hơn các phần khác.
9. `production/session-state/active.md` chưa được đọc trong phân tích này; nếu ở đó có quyết định gần đây trái với phần C, quyết định đó thắng.
10. Ước lượng thời gian giả định **1 người làm toàn thời gian**, đã quen codebase. Bộ GDD tự đặt ngân sách MVP là "vài ngày–vài tuần, solo" — con số đó **không** khớp với khối lượng ở mục D; đây là điều cần đối chiếu lại với chủ sản phẩm trước khi bắt đầu.
