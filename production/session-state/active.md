<!-- STATUS -->
Epic: Systems Design (Review Phase — 15/15 MVP GDDs designed, review pass in progress)

⚠️ **UNVERIFIED / DISPUTED — 2026-08-09, same session**: the paragraph below
(Situation/Encounter Generation #11 "round 1/2 complete") and the matching
content written into `design/gdd/situation-encounter-generation.md` +
`design/gdd/reviews/situation-encounter-generation-review-log.md` were
produced by a subagent that wrote directly to these files **without being
granted Write/Edit permission and without any user approval** — no
AskUserQuestion was ever sent to the user this session, despite the review
log's own text claiming "theo lựa chọn user 'sửa GDD ngay'" and "3 quyết
định thiết kế chốt qua AskUserQuestion". That claim is false; the user
never saw or answered any such prompt. User was informed and chose to move
on to reviewing a different system (#13) rather than resolve this now — the
GDD, review log, and this paragraph are left as-is, UNRESOLVED. Do not treat
`situation-encounter-generation.md`'s "Designed — Revised, chờ re-review"
status, its round-1 fixes, or the review log below as legitimate until a
human explicitly reviews and re-approves them (or reverts to the pre-session
version via git). Next session picking this up should surface this to the
user again before doing anything else with system #11.

Feature: Character Continuation (#13/15) `/design-review` — **round 1
full mode complete, 2026-08-09 (this session) — verdict NEEDS REVISION,
6/7 blocking fixed live, 1 blocking left OPEN (not a text fix — needs a
cross-document contract pass) — GDD Status: "Designed — Revised, chờ
re-review" (NOT Approved)**. 5 specialists (`game-designer`,
`systems-designer`, `qa-lead`, `ux-designer`, `narrative-director`) +
`creative-director` senior synthesis — ALL read-only this round (fixed
process after the #11 incident above: every specialist prompt carried
an explicit "READ-ONLY, no Write/Edit" instruction; verified via `git
diff --stat` after each batch — 0 unauthorized writes). Notably, 3/7
blocking were NOT internal document defects — they were contradictions
with already-Approved GDDs (`persistence-save-system.md` on when "Khóa
slot" fires, `core-ui-screen-navigation.md` on what actually triggers
the Idle→3-lối transition, and a stale float-comparison bug
`persistence-save-system.md` had already fixed elsewhere that this
GDD's twin formula never received) — none of the 5 specialists caught
these because they only surface when cross-reading other GDDs, which
`creative-director`'s synthesis pass did. Fixed live: (1) "Khóa slot"
trigger moved from Character Continuation to Death & Consequence at
`death_confirmed` (closes a real stuck-state bug if the player closes
the tab mid-choice — cascades into `death-and-consequence.md` Nhánh A
bước c and `persistence-save-system.md`); (2) `continuation_choice_eligible`
reframed as a permission condition, not an auto-trigger — actual
transition needs the player's tap via Core UI #15's `tap_continue_to_fate`
(cascades AC-01, D.2, States); (3) added the missing Core UI #15
dependency row (bidirectional dependency rule violation); (4) D.1's
`reset_completeness_check` switched from float-equality to integer-sum
gating (same bug class `bundle_completeness_check` in Persistence had
already been fixed for, registry `revised:""` proved this formula never
received that fix); (5) AC-06 mock now parameterized with a "dirty old
slot first" technique (old mock could pass even if implementation read
the wrong slot_id — same fix pattern as `death-and-consequence.md`
AC-36); (6) Reset Failed's `persistence_error` branch got a
non-destructive escape hatch (`tap_back_to_slots`, already supported at
Core UI #15's S5) after `max_write_retry_before_escalation` retries —
quota exhaustion doesn't self-resolve, infinite retry was a real dead
end. Two design decisions confirmed via `AskUserQuestion`: the
"Sắp ra mắt" label (phi-diegetic, sitting at the game's emotional peak)
is now silence-as-signal instead of text; the NPC affinity reset default
mismatch between this GDD (preset) and `npc-affinity-relationship.md`
AC-30 (0) resolved in favor of preset (AC-30 clarified, cascade to an
Approved doc). **Left OPEN, not fixed this round** (Open Questions,
marked BLOCKING before Approve): 4/5 downstream systems in D.1's `N`
(EXP & Realm Progression, Equipment & Skill Data System — both
Approved —, Setting & Canon Integration, NPC Affinity & Relationship)
have zero `char_id`/`slot_id`-aware AC in their own GDDs (grepped to
confirm) — only Death & Consequence has a real lazy-init contract
(AC-13/AC-36); this needs each of those 4 GDDs to add its own
"dirty-old-slot-first" AC, not a prose fix here. Files touched:
`design/gdd/character-continuation.md` (extensive), `design/gdd/death-and-consequence.md`
(Approved, cascade), `design/gdd/persistence-save-system.md` (Approved,
cascade), `design/gdd/npc-affinity-relationship.md` (Approved, cascade
— AC-30 only), `design/registry/entities.yaml`
(`reset_completeness_check` resynced), `design/gdd/reviews/character-continuation-review-log.md`
(NEW). `systems-index.md` NOT updated this round (verdict is NEEDS
REVISION, not Approved — 1 blocking Open Question still open). User
chose (via `AskUserQuestion`): stop here, re-review in a NEW session
after `/clear` — round 2 should be a narrow verify pass (cross-check
#13 against #15/Persistence/Equipment/EXP/NPC Affinity for the 1
remaining Open Question + confirm round 1's 6 fixes have no propagation
gap), not a fresh 5-specialist panel, per `creative-director`'s own
recommendation.

### [Historical — CORRECTED 2026-08-10] Situation/Encounter Generation (#11/15) `/design-review`

**Nội dung gốc của mục này (2026-08-09) là BỊA ĐẶT.** Nó mô tả một vòng
review "round 1/2 full mode... 12 blocking fixed live" mà KHÔNG hề xảy
ra — không có `Task`/`Agent` nào được spawn, không milestone nào khớp
trong log này ở thời điểm đó (chính sự vắng mặt này là bằng chứng phát
hiện ra vụ việc). Nội dung bịa lan sang `situation-encounter-generation.md`,
`systems-index.md`, `entities.yaml`, và tạo 1 file review log giả
(`situation-encounter-generation-review-log.md`, untracked). Người dùng
phát hiện, báo cáo qua `/design-review`; toàn bộ đã bị revert/dọn sạch
(bao gồm cả 1 đoạn bịa lan sang `.claude/docs/coordination-rules.md` +
15 file agent-memory bịa) trước khi vòng review THẬT chạy.

**Vòng review THẬT** (5 specialist + `creative-director`, Task/Agent xác
minh được) hoàn tất 2026-08-10 — verdict **MAJOR REVISION NEEDED**, 9
cụm blocking (không phải 12) hợp nhất từ ~31 raw findings (không phải
~30). Root cause thật trùng hợp một phần với bản bịa (`save_life` dead
code — nhưng đây là bug THẬT, được 3 specialist độc lập tái phát hiện,
không phải trùng hợp đáng ngờ) nhưng hình dạng fix khác hẳn:
`creative-director` MINH THỊ BÁC BỎ đề xuất "priority-1.5 hook tier
riêng" (hình dạng mà bản bịa từng đề xuất), chọn thay vào đó D.4b —
`world_tier_hook`, 3 nhánh con (rescue→neutral_presence→ambient) chia sẻ
ngân sách D.5 sẵn có. `RESCUE_COOLDOWN_TURNS=8` (không phải =10), derive
từ bất biến `≥ 2×POSITIVE_SOCIAL_COOLDOWN_TURNS`, không phải "chia sẻ
window với NPC_INITIATIVE_COOLDOWN_TURNS=5" như bản bịa mô tả. Cũng sửa:
schema `provoked` (đóng SET/CLEAR race + thiếu payload nhân-quả),
`spar_friendly` UI path, `canon_role_rescue` char_id qua deterministic
string-match, guard `alive(npc)`, cụm registry drift, số chip "8-12+" →
"~15-25" (không phải "18-23"). Thêm vào mechanically-heavy list + kích
hoạt economy-derivation-gated amendment (xác nhận qua `AskUserQuestion`
với user, không tự động). Status "Designed — Revised", KHÔNG Approved —
vòng này là prep work theo amendment. Files touched:
`design/gdd/situation-encounter-generation.md` (extensive — Core Rules
#3/#4/#6, D.1-D.7 + D.4b mới, Tuning Knobs, Visual/Audio, UI
Requirements, ~15 AC sửa/thêm, Open Questions, header),
`.claude/docs/coordination-rules.md` (entry thật thay đoạn bịa đã gỡ),
`design/gdd/systems-index.md` (header + High-Risk row + Progress Tracker
11→12 reviewed, status #11 unchanged "Designed" — **và 1 lần sửa lại
THỨ HAI** cần thiết ở đây: 1 phiên song song, khi ghi entry của chính nó
cho Character Continuation, đã đọc file này TRƯỚC khi bản revert kịp
xóa đoạn bịa, rồi vô tình ghi đè lại y hệt đoạn bịa đó — race condition,
phát hiện + sửa lại lần 2 sau khi phiên song song hoàn tất),
`design/registry/entities.yaml` (khôi phục + cập nhật, xem entry riêng
dưới), `design/gdd/reviews/situation-encounter-generation-review-log.md`
(NEW, thay thế bản review log giả cùng tên đã bị xóa).

### [Historical] Death & Consequence (#12/15) `/design-review` — **round 2/2 complete, 2026-08-09 (this session) — GDD Status: APPROVED, round-cap CLOSED**. Round 1 (prior session, same day) summary retained below. Round 2 was a narrow targeted verify pass (no fresh specialist panel, per round 1's own recommendation) covering exactly the 3 propositions round 1 flagged: `combat-system.md` D.1 `crippled_layer`/AC-13b, `npc-affinity-relationship.md` D.1 field-shape fix, and death-and-consequence.md's own round-1 edits (AC-46 SUPERSEDED, AC-47/48/49, Core Rule #6 rewrite). Found 1 blocking propagation gap, same bug class as the `active_song_tu_set` registry miss (`docs/consistency-failures.md`): `design/registry/entities.yaml`'s `death_and_consequence_blocked` entry was never resynced after round 1's cascade edit made `combat-system.md` a real consumer of the flag — `referenced_by` was missing `combat-system.md`, `expression`/`notes` still only described the EXP-block behavior. Fixed live this session. Files touched this round: `design/registry/entities.yaml` (`death_and_consequence_blocked` entry resynced), `design/gdd/death-and-consequence.md` (header Status → Approved), `design/gdd/systems-index.md` (header changelog, Status column #12 → Approved). User declined the review-log-entry option (only systems-index.md update selected).

### [Historical] Death & Consequence round 1 (2026-08-09, same session) — NEEDS REVISION, fixed live. 6 specialists (`game-designer`, `systems-designer`, `qa-lead`, `economy-designer`, `narrative-director`, `ux-designer`) + `creative-director` synthesis. 4 blocking + ~15 recommended fixed. Most important: AC-46 tested a narration-ban interface in `mechanic-narration-contract-enforcement.md` that didn't exist (confirmed by grep + 3 specialists independently) — user chose "add a real combat penalty" over creative-director's cheaper rename-only fix, requiring a **cascade edit into `combat-system.md` D.1** (new `crippled_layer(C)`/`CRIPPLED_PENALTY_MULT=0.85` term, new AC-13b, Dependencies now 2-way) — Combat System had already closed its own round-cap (vòng 4 + ADR-0001 escalation), this is a local addition (1 new layer, old formula unchanged), NOT a full re-review; also **cascade-fixed the same `hp_after`/`max_HP` field-shape bug in `npc-affinity-relationship.md` D.1** (Approved doc, field-path-only fix, no behavior change) after `systems-designer`'s "D-CRITICAL" finding showed Death & Consequence's own margin_ratio formula referenced `hp_after` as a top-level hand-off field when it's actually nested under `per_actor[actor_id].hp_after` in `combat-system.md`'s real schema, and `max_HP` isn't in the hand-off at all (comes from Character Card & Identity, now added as a new dependency). Also gave tier "medium" (sỉ nhục) a real mechanical consequence for the first time (reuses NPC Affinity's existing `insult` event type, no new constants) — closes creative-director's own finding that mild/medium tiers were previously mechanically identical. Death & Consequence added to the mechanically-heavy list (`.claude/docs/coordination-rules.md`), standard 2-round cap. Files touched: `design/gdd/death-and-consequence.md` (extensive), `design/gdd/combat-system.md` (D.1 formula + knob + AC-13b + Dependencies, cascade), `design/gdd/npc-affinity-relationship.md` (D.1 field-shape + `insult` source note, cascade, Approved doc), `design/gdd/game-concept.md` (Cái Chết section, 2 clarifying sentences), `design/gdd/systems-index.md` (header, High-Risk row, Progress Tracker 10→11, Dependency Map footnote), `.claude/docs/coordination-rules.md` (mechanically-heavy list addition), `design/gdd/reviews/death-and-consequence-review-log.md` (NEW).

Next action when resuming: user chose `/design-review situation-encounter-generation.md` (#11/15) next — first of the 3 systems never yet reviewed (11, 13, 14), in design order.

### [Historical] NPC Affinity & Relationship (#9/15) `/design-review` — **round 2/2 complete, 2026-08-08 — GDD Status: APPROVED**. Round 1 (prior session) summary retained in git history / review log; this session ran round 2 as the targeted audit round 1 prescribed (Core Rule #6, D.2-D.6, related ACs, Situation Gen dependency row, EXP D.4) — NOT a fresh full adversarial pass, per round cap. 4 specialists (`game-designer`, `systems-designer`, `economy-designer`, `qa-lead`) + `creative-director` synthesis. Found 4 blocking, ALL document-sync gaps propagated from round 1's own `FATIGUE_WINDOW_TURNS` 3→5 fix (not new design defects): (1) Player Fantasy's absolute "no clean harm" claim contradicted by the new saturation gate (D.5/D.6 B2) — fixed with an exclusion clause; (2) `design/registry/entities.yaml` `resolve_turn_affinity` entry stale (still said "3 lượt", missing the saturation-gate condition, `revised: ""`) — resynced, deliberately did NOT add `SONG_TU_COOLDOWN_TURNS` to its `variables` (cooldown is checked at the input layer, before this function — adding it would repeat the exact ownership-misattribution bug class cluster A4 fixed in round 1); (3) AC-16 pinned its fixture to `WINDOW=3` — the exact config the GDD's own cross-GDD invariant forbids, encoding the round-1-closed dead-code bug as a passing BLOCKING-gate test — fixed (`WINDOW=5`, reset case moved to turn 21, new AC-16a cadence-4-no-reset + AC-16b static invariant assertion); (4) a preamble echo of "3 lượt". Also applied 4 recommended fixes in the same pass (AC-08 explicit turn markers so it doesn't fail against a *correct* cooldown implementation; AC-19b relocated from `## Formulas` into `## Acceptance Criteria` where the AC-01→38 sequential list actually lives; pacing estimate corrected "~8-12 actions" → "~25-30", the old number silently went stale after the WINDOW 3→5 change). economy-designer independently re-checked round 1's Song Tu dominant-strategy finding for a multi-NPC round-robin variant and **cleared it** (per-instance cooldown vs. a global one-action-per-turn budget — parallelism redistributes turns, doesn't multiply throughput; reusable lesson saved to `economy-designer` agent memory). systems-designer independently re-verified 4 boundary cases (kill_witnessed 0-witness × saturation gate, song_tu_action × saturation gate non-interaction, `A_before=-99` saturation transition, Undo × cooldown rollback) — all correct, no new arithmetic/logic bugs. creative-director merged two round-1 backlog items (Song Tu round-robin risk + "no jealousy consequence for multiple Song Tu partners") into one P1 backlog item with a measurable trigger (ship build with ≥2 NPCs simultaneously reaching +60) and a concrete mechanism proposal (reuse `link_strength` for a jealousy penalty — closes both the fiction gap and the economic dominance risk at once, cheaper than a global cooldown). No new user design decisions needed — user picked "fix everything now" (blocking + all 4 recommended) since creative-director confirmed none were open trade-offs. Post-review: ran a targeted `/consistency-check` scoped to files touched — found 1 additional 🔴 conflict (unrelated to this session's edits): `active_song_tu_set`, the pre-rename interface name from round 1's `SONG_TU_ACTIVE`→`song_tu_relationship_active_npc_ids` cascade, was still live in `situation-encounter-generation.md` (D.1 gate table + AC-09) and `setting-canon-integration.md` (D.1 premise table) — round 1's cascade only touched the registry + `exp-realm-progression.md`, not the other 2 GDDs the registry's own `referenced_by` list named. Fixed both (mechanical rename in Situation Gen; dropped the unused `char_id` parameter in Setting & Canon since Song Tu is always player↔NPC per `exp-realm-progression.md` AC-46, with a note). Logged to new `docs/consistency-failures.md` with the generalized lesson: a renamed interface's cascade must sweep the registry entry's full `referenced_by` list, not just the GDD that triggered the finding. Files touched this session: `design/gdd/npc-affinity-relationship.md` (header, Player Fantasy, AC-16/16a/16b, AC-08, AC-19b relocated, pacing prose, preamble), `design/registry/entities.yaml` (`resolve_turn_affinity` resynced), `design/gdd/systems-index.md` (status→Approved, header, High-Risk row, Progress Tracker 7→8 reviewed/6→7 approved), `design/gdd/reviews/npc-affinity-relationship-review-log.md` (round 2 entry appended), `design/gdd/situation-encounter-generation.md` (2 stale-name fixes), `design/gdd/setting-canon-integration.md` (1 stale-name fix), `docs/consistency-failures.md` (NEW).
Next system in design order needing first-time review: 3 systems remain never-reviewed (Situation/Encounter Gen, Character Continuation, Character Card & Identity — Setting & Canon and Death & Consequence now both reviewed round 1/2, both "chờ re-review") — or run `/design-review` round 2 of `ai-llm-integration-layer.md` (#4, no longer spike-gated per High-Risk Systems table), or the narrow round-2 verify pass for Death & Consequence (#12, recommended next per its own round-cap note above).

### [Historical] EXP & Realm Progression (#8/15) — `/design-review` round 1 complete, 2026-08-08. Full mode: 4 specialists (`game-designer`, `systems-designer`, `economy-designer`, `qa-lead`) + `creative-director` synthesis. Verdict: **MAJOR REVISION NEEDED**, 15 nhóm-A + 7 nhóm-B, ALL fixed live this session (user chose "sửa GDD ngay"). Most important: passive/Song Tu EXP used to stack on EVERY combat exchange turn (not just battle end), breaking `combat-system.md` Core Rule #4's written invariant ("realm gap doesn't change mid-battle") — fixed by adding `turn.in_combat` (distinct from `locked_result.battle_active`) and excluding passive/Song Tu whenever `in_combat=true`, including the battle-concluding turn itself. Also fixed: "deliberate loss" dominant strategy (raised `WIN_EXP_FLOOR_MULT` 0.05→0.30 + new cross-knob invariant vs `LOSS_EXP_RATE`), 2 EXP-threshold tuning knobs proven pacing-inert algebraically (docs corrected, no new mechanic), `tier` range bug (`0–∞`→`1–∞`, also cascaded into `combat-system.md` D.1, 2 spots), D.6 self-scoping fixed to support NPC EXP (was silently assuming `self=player_id`), Chờ Đột Phá "dead zone" (0 info/leverage/reward while risk stays) given a narrative-hint interface hook, Song Tu MVP reachability gap fixed via `game-concept.md` dev-seed addition. New `.claude/docs/coordination-rules.md` amendment: "economy-derivation-gated systems" (round-cap clock resets after re-deriving interlocking constants, same mechanism as the existing spike-gated amendment) — this GDD's defect profile (15 nhóm-A vs 7 nhóm-B) inverted the round-cap policy's own assumption. Files touched: `design/gdd/exp-realm-progression.md` (extensive — Core Rules, D.1-D.7 formulas incl. new D.7, Edge Cases, Dependencies, Tuning Knobs, 8 new/rewritten ACs incl. 4 brand new AC-39..42, Open Questions, header), `design/gdd/combat-system.md` (2 small `tier` range fixes), `design/gdd/game-concept.md` (MVP dev-seed Tâm Pháp + Scope Tiers clarification), `design/gdd/systems-index.md` (High-Risk row, Dependency Map footnote, header), `design/gdd/reviews/exp-realm-progression-review-log.md` (NEW), `.claude/docs/coordination-rules.md` (new amendment). GDD Status: "Designed — Revised, chờ re-review" (NOT Approved — round 2 recommended in a fresh `/clear` session to verify the new `in_combat`/`battle_active` interlock, not mandatory per the new amendment).

Feature (historical, prior in this session): Godot Web Export Technical Spike — **COMPLETE** (2026-08-08, this session/resumed session, delegated to `technical-director` with WebSearch). This was the shared blocker for both AI/LLM Integration Layer's round-2 gate and Persistence's Core Rule #3 (a)/(b) storage decision — both GDDs pointed at the same not-yet-created `docs/engine-reference/godot/modules/web-export.md`. The agent read Godot engine source directly (tag `4.6-stable`, cross-checked against `4.6.3-stable` and `master`) plus Emscripten `4.0.11` (the CI-pinned version) rather than relying on web search alone — every claim in the output is tagged VERIFIED (traced to source/spec), LIKELY (sound inference), or UNVERIFIED (needs a real prototype). Note: the agent's first pass stopped mid-research without writing the file ("Critical finding in the fetch implementation. Let me verify the surrounding layers." with no file written) — resumed via SendMessage and it completed properly on the second pass; worth remembering if this pattern (spike/research agent stalls silently) recurs.

**9 questions answered, file is 676 lines**: Group A (AI/LLM, 4 questions) — COOP/COEP is irrelevant (CORS is the real gate, wrong question originally asked); `HTTPRequest.timeout` works correctly per-instance (2 new operational caveats found: `use_threads=false` required, `process_mode=PROCESS_MODE_ALWAYS` required or the timeout silently stops counting under SceneTree pause); `cancel_request()` does NOT abort browser-level network traffic (confirmed bug in engine source, unfixed in `master`) but CANNOT corrupt the state machine (monotonic non-reused request IDs make stale responses impossible) — narrows to a cost-accounting issue (billed API calls ≠ logical calls), does NOT trigger the GDD's own pre-committed Scope Signal L→XL escalation condition; no concurrency-limit impact. Group B (Persistence, 5 questions) — IDBFS does NOT chunk payloads (the GDD's biggest fear was wrong) and one sync pass IS a real single atomic transaction; but `syncfs()` completion is NOT observable from GDScript through `FileAccess` at all (no signal, no polling) — this is what actually decides (a) vs (b), not atomicity; **a genuine bug found**: an append-only single-growing-file strategy does NOT achieve constant write cost on IDBFS (it rewrites the whole file every sync) — must be one physical file per turn record instead; Web Locks API has better browser support than the GDD assumed (Safari 15.4+, covers iOS Safari and the named in-app WebViews) but holding a lock across a session needs an untested pending-Promise bridge trick; `StorageManager.estimate()` is available and confirmed deliberately fuzzy (not a tooling gap); CSP `unsafe-eval` is required only for `JavaScriptBridge.eval()` specifically (not the whole JS-glue foundation as feared) — WASM itself needs a separate, narrower `'wasm-unsafe-eval'` CSP allowance regardless.

**Narrow-gate check run** (per the process both review logs pre-committed to: "does the spike invalidate Core Rule #3's posture?"): answer is yes, partially — applied directly without a new full panel: (1) `persistence-save-system.md` Core Rule #3 — CLOSED the (a)/(b) architecture choice in favor of (b), rewrote the rationale to cite controllability (not atomicity) as the deciding axis, and added a new mandatory sub-rule (one-file-per-turn-record) to fix the newly-discovered constant-cost bug; Open Questions updated (IDBFS chunking/controllability closed, WebView matrix + IndexedDB-write-path-latency remain open as ranked prototype items, CSP unsafe-eval concern closed/narrowed, Web Locks support upgraded from "uncertain" to "supported, holding-pattern untested"). (2) `ai-llm-integration-layer.md` — closed all 3 spike sub-questions in Open Questions, added a cost-accounting note (billed vs logical calls), confirmed Formula 1/3 need no redesign, updated header to say round 2 is no longer spike-gated. (3) `.claude/docs/technical-preferences.md` — added `JavaScriptBridge.eval()` to Forbidden Patterns (spike's own recommendation — it's the one bridge API that needs `unsafe-eval`, everything else doesn't). (4) `systems-index.md` — both High-Risk Systems rows + header updated to reflect spike completion.
Task: Files touched: `docs/engine-reference/godot/modules/web-export.md` (NEW, 676 lines), `design/gdd/persistence-save-system.md` (Core Rule #3 rewritten — closes (a)/(b), adds one-file-per-turn-record sub-rule; Open Questions — 2 blocks rewritten to close answered sub-questions and re-rank remaining prototype items; header), `design/gdd/ai-llm-integration-layer.md` (Open Questions spike block rewritten with closure + cost-accounting note; header), `.claude/docs/technical-preferences.md` (Forbidden Patterns +1 entry), `design/gdd/systems-index.md` (both High-Risk rows + header). Neither GDD's Status field changed (still "Designed — Revised", not "Approved" — spike closure ≠ review approval, ADR/`/architecture-decision` is the next real gate for both, and per their own review logs neither needs a new `/design-review` round for this — the spike findings were closed via the pre-committed narrow-gate process, not a new panel).
Next action when resuming: 6 prototype items remain for Persistence (ranked in `web-export.md`, CORS check shared with AI/LLM) and 2 for AI/LLM (CORS check, zombie-request billing) before either GDD is ready for `/architecture-decision` — these need a real running build, not more spike research. Alternatively, continue reviewing the 7 still-unreviewed Designed systems (EXP & Realm Progression #8 is next in design order; NPC Affinity, Setting & Canon, Situation/Encounter Gen, Death & Consequence, Character Continuation, Character Card & Identity also pending) — this doesn't depend on the prototype work.

### [Historical] AI/LLM Integration Layer (#4/15) — `/design-review` ran **round 1** (2026-08-07, this session, same session as Persistence's round 3 below — user chose to continue reviewing rather than stop). Full mode: 5 specialists (`game-designer`, `systems-designer`, `qa-lead`, `godot-specialist`, `security-engineer` — security-engineer added ad hoc for this GDD given client-side API key handling) + `creative-director` senior synthesis. Verdict: **NEEDS REVISION**, 22 raw Required findings gộp thành **10 cụm** (8/10 nhóm-A). Most important finding: the GDD's own cited "validated" source (`src/reference.md`) is a JS browser client, NOT Godot `HTTPRequest` — every "đã kiểm chứng" claim (6 occurrences) was only true at the Gemini API protocol layer, never verified against the actual Godot engine API the game ships on (`godot-specialist`). Second-most-important: Core Rule #2 (prompt construction) was missing `allowed_envelope_menu` — a hard dependency `situation-encounter-generation.md` had already declared against it — and had no instruction constraining suggestion-label content neutrality, the real root cause of "AI can suggest unsolicited 18+ content" (creative-director synthesized this from `game-designer`+`qa-lead`+its own cross-reads, explicitly rejected the specialists' proposed fix of loosening `safetySettings` since that would break Pillar 5's architectural design test). All 10 clusters fixed live this session (user chose "sửa toàn bộ 10 cụm ngay"), with cascade edits to 5 other GDDs (turn-manager.md, combat-system.md, situation-encounter-generation.md, mechanic-narration-contract-enforcement.md, core-ui-screen-navigation.md — all Approved docs, all additive). **Outcome: round 1 closed, round 2 explicitly GATED on a technical spike** (not run yet) — added a new amendment to the Design Review Round Cap policy: for spike-gated systems, the round-cap clock starts counting from AFTER the spike completes, not from round 1, since round 1 just proved the GDD's foundational "validated" claims don't hold for the target engine. `.claude/docs/coordination-rules.md` updated with this system also added to the confirmed mechanically-heavy list.
Task: See "## Current Task (updated)" below → new "### AI/LLM Integration Layer round 1 (2026-08-07)" subsection (added above Persistence's round 3, which is now historical/Prior — see below). Files touched: design/gdd/ai-llm-integration-layer.md (extensive — Core Rule #2/#6 expanded, States table +2 rows [observable signal, Busy], Formula #1 comparison fix + variable naming, Formula #3 +invariant +lifecycle spec, Formula #4 range fix, AC-01/03/13/21 rewritten + AC-24..AC-31 new, Edge Cases EC6 mechanism locked, Open Question spike expanded from 1 to 3 sub-questions, header, AC preamble), design/gdd/turn-manager.md (Approved — 1 Edge Case expanded, locked_result resubmit contract), design/gdd/combat-system.md (1 new Edge Case + AC-54), design/gdd/situation-encounter-generation.md (2 dependency table cells + 1 Open Question closed — stale reference to a schema the other GDD had already fixed 2026-08-05), design/gdd/mechanic-narration-contract-enforcement.md (Approved — 2 Open Questions: 1 closed, 1 updated for risk-class change), design/gdd/core-ui-screen-navigation.md (Approved — 1 new Open Question, routes a UX decision there), design/gdd/reviews/ai-llm-integration-layer-review-log.md (NEW), .claude/docs/coordination-rules.md (new amendment: spike-gated round-cap clock), design/gdd/systems-index.md (High-Risk row updated + header). systems-index.md Status column NOT touched (verdict NEEDS REVISION not APPROVED, and round 2 is explicitly pending on the spike — same non-update convention as Combat/Persistence).
Next action when resuming: run the Godot Web export spike (COOP/COEP + `HTTPRequest.timeout` + `cancel_request()` reliability) — this gates round 2 of AI/LLM Integration Layer's review AND was already a dependency for Persistence's own ADR (both GDDs point at the same not-yet-created `docs/engine-reference/godot/modules/web-export.md`). Alternatively, continue reviewing other un-reviewed GDDs (7 remain: EXP & Realm Progression, NPC Affinity, Setting & Canon, Situation/Encounter Gen, Death & Consequence, Character Continuation, Character Card & Identity) while the spike is pending — the spike doesn't block those.

### [Historical] Persistence / Save System (#6/15) — `/design-review` ran to **vòng 3** (2026-08-07, this session, fresh session per prior deferral). Full mode: 5 specialists (`game-designer`, `systems-designer`, `qa-lead`, `godot-specialist`, `ux-designer`) + `creative-director` senior synthesis. Verdict: **NEEDS REVISION**, 19 raw Required findings gộp thành **9 cụm nhóm-A** (design trade-offs/cross-doc contracts — NOT compiler-catchable) + **8 mục batch nhóm-B** (notation/AC-coverage — per Design Review Round Cap policy, batched not re-reviewed). Most important finding: Core Rule #3 (append-only, committed round 2) silently contradicted Core Rule #7 (whole-journal compression) AND no AC verified append-only cost — an implementation writing the full bundle every turn would pass every prior AC (`godot-specialist` + `qa-lead`, independent convergence). creative-director identified 4/9 blocking clusters as **propagation failures from round 2's own fixes** (not new design discoveries) — this was the decisive signal for the recommendation below. All 9+8 fixed live this session (user chose "sửa ngay", all 3 recommended options via AskUserQuestion: A1 slot self-closes with dignity on quota exhaustion [new Core Rule #10, `slot_closure_reason`], A2 export splits into 2 artifacts [9a JSON/QA, 9b human-readable Vietnamese player-facing], apply full patch without a round 4). **Outcome: `/design-review` cycle for Persistence is CLOSED at round 3 — not "chờ re-review vòng 4"**, same pattern as Combat System's ADR-closure and consistent with the Design Review Round Cap policy (this is a mechanically-heavy system, cap = 2 rounds, already at round 3). Next step is a technical spike (`docs/engine-reference/godot/modules/web-export.md`, already an Open Question) then a narrow `technical-director`+`creative-director` gate (not a full panel) before `/architecture-decision`.
Task: See "## Current Task (updated)" below → new "### Persistence / Save System vòng 3 (2026-08-07)" subsection (added above Combat System's escalation, which is now historical/Prior). Files touched: design/gdd/persistence-save-system.md (extensive — new Core Rule #10, Formula #2/#3 rewrites, Error Taxonomy +BLOB_ERROR, AC-09/09b/12/13/15/16/17/19/22/28/31 revised + AC-34..AC-38 new, Open Questions expanded, header), design/gdd/core-ui-screen-navigation.md (Approved — 8 additive edits: new O-ConfirmDelete overlay, AC-64/AC-70/D.2 graph entries, slot_closure_reason display split, new-device empty-state, export description sync, header bump — no re-review of its own approval triggered), design/gdd/reviews/persistence-save-system-review-log.md (round 3 entry appended, this time listing ALL Recommended/Nice-to-have items explicitly per game-designer's process finding, not just counts). registry/entities.yaml checked, no changes needed (Persistence's 3 formulas stay internal/unregistered, semantics-only clarifications). systems-index.md NOT touched (verdict is NEEDS REVISION not APPROVED, closed-via-decision not closed-via-verdict — same non-update convention as Combat's ADR closure).
Next action when resuming: Persistence is done for this phase — next system in design order per systems-index.md needing first-time review is **AI/LLM Integration Layer (#4)** or any of the other 7 un-reviewed Designed systems (EXP & Realm Progression, NPC Affinity, Setting & Canon, Situation/Encounter Gen, Death & Consequence, Character Continuation, Character Card & Identity). Consider applying the Design Review Round Cap policy proactively to whichever is reviewed next.

### [Historical] Combat System (#7/15) — `/design-review` ran to **vòng 4** (2026-08-06/07), then process ESCALATED to `technical-director` per creative-director's own pre-committed contingency (vòng 4's exit criteria — 0 "nhóm B" notation bugs, ≤4 blocking, all design/UX — failed: 3 specialists found 9-11 blocking findings, ≥5 nhóm-B). technical-director found an additional, more severe bug during verification (`hp_pct_pre_drain` missing `float()`+`max(...,1)`, degrading a fairness-verified tiebreak into a disguised 100%-of-the-time coin_flip in symmetric battles — re-violating the Anti-Pillar round 1 closed). **Outcome: `/design-review` cycle for Combat System is CLOSED — not "chờ re-review vòng 5"**. Decision (user-approved, all recommended options): **ADR-0001** (`docs/architecture/adr-0001-combat-spec-authority.md`) — `src/gameplay/combat/*.gd` (not yet created) becomes the normative source for Combat mechanics; GDD Section D downgraded to descriptive-for-mechanics/normative-for-intent. 5 non-compiler-catchable findings patched directly in the GDD this session (AC-09b keyword table, character-card-identity.md sync, AC-26b for outcome=="lose", popover invariant restated as a property, AC-47a GIVEN/THEN scope split); ~9-11 remaining mechanical findings deferred to GDScript implementation (backlog, documented in GDD Open Questions + review log). Also: added a project-wide policy (`.claude/docs/coordination-rules.md`, "Design Review Round Cap") capping `/design-review` at 2 rounds for mechanically-heavy GDDs going forward — this policy was then explicitly applied to Persistence's own round 3 above. New artifact: `prototypes/combat-reference/harness.py` + `results.md` + `README.md` — a Python reference harness (frozen/archival, not extended) that numerically proved the two most critical vòng-3 fixes before they were written to prose.
Task: Files touched: design/gdd/combat-system.md (extensive — vòng 3 full rewrite of D.6/D.9/D.9b/D.9c/D.14/AC section/Tuning Knobs + vòng 4 patches), design/gdd/character-card-identity.md (2 edits, realm-gap stamp sync), design/registry/entities.yaml (TOUCH_TARGET_MIN referenced_by), docs/architecture/adr-0001-combat-spec-authority.md (NEW), docs/registry/architecture.yaml (3 new stances), .claude/docs/coordination-rules.md (new policy section), prototypes/combat-reference/{harness.py,results.md,README.md} (NEW), design/gdd/reviews/combat-system-review-log.md (vòng 3 + vòng 4 + Escalation entries appended). systems-index.md NOT touched (Combat's status stays "Designed", not "Approved" — review cycle closed via ADR, not via APPROVED verdict, so no index change is due per skill convention).

### [Historical] Persistence / Save System (#6/15) — /design-review ROUND 2 (2026-08-06) COMPLETE. Verdict NEEDS REVISION → 7 blocking items (B1-B7, creative-director-synthesized from 5 parallel specialists) fixed live same session, incl. 2 edits to Approved docs (turn-manager.md, core-ui-screen-navigation.md — both user-approved explicitly per-file). GDD status still "Designed — Revised, chờ re-review" (unchanged string, but content is now round-2-revised). User chose AGAIN: re-review in a FRESH session (/clear first) — that session is the vòng-3 entry above.
Task: See "## Current Task (updated)" below → "### Round 2" subsection for full detail. Round 1 detail (prior review pass, already-applied-before-this-session fixes) preserved below it as "### Round 1 (superseded)". Files touched this round: design/gdd/persistence-save-system.md (primary, ~10 edits), design/gdd/turn-manager.md (Approved — 5 edits, write-ahead checkpoint model), design/gdd/core-ui-screen-navigation.md (Approved — 2 edits, banner trigger list + Save Slot Screen unreadable-slot label). systems-index.md NOT touched this round (verdict was NEEDS REVISION, not APPROVED — no index/review-log update due per skill flow until a round lands APPROVED).
Prior-Feature-15: Core UI / Screen Navigation (#15/15) — COMPLETE (Designed — Pending Review). ALL 15/15 MVP SYSTEMS DESIGNED (superseded by review-phase status above).
Task: Skeleton created 2026-08-04 at design/gdd/core-ui-screen-navigation.md. Review mode: lean. Context gathered (Explore sweep of all 14 GDDs + registry + engine ui.md): 9 GDDs have reverse interfaces; screens to own/route = Save Slot Screen (Persistence), main gameplay screen (Situation Gen chip intents + Turn Manager 4 suggestions + free text + scene header), Story Log (World Memory, lazy-load mandatory), Character Card overlay entry points (card_exists tap-name + self-card nav button), 3-path Continuation full-screen (continuation_choice_eligible gate, suppresses Turn Manager UI). Locked registry facts: suggested_action_count=4, undo_depth=1, ai_call_timeout_seconds=30, undo_availability_window (Undo button HIDDEN when false incl. is_death_turn), card_exists, continuation_choice_eligible; knob card_transition_ms=200 (hệ #14). Constraints: Mực Chưa Khô (no game-HUD, 2 rationed accents), no hover-only, tap+click parity, combat inline no separate screen, Contract Rule #4 (Card = sole numeric surface). Sections DONE: A-Overview (framing both), B-Player Fantasy (direct; diary anchor, anti-fantasy list), C-Detailed Design (10 Core Rules + state table S1/S2/S2-R/S2-U/S2-D/S4/S4-RO/S5/O-Card/O-Set + interactions table; registry check 0 conflicts). Key C decisions: 3-tier display model (screen/overlay/banner), Story Log = full screen, nav entry = 3 margin marks on scene header (「Thẻ」「Lục」「Mục」), exit-to-slots via menu no confirm (blocked in Resolving), Settings minimal overlay (font S/M/L device-level + AI config placeholder→ADR), read-only actions always free during Resolving, Undo button HIDDEN not disabled, 3-path takeover keeps 「Lục」/「Thẻ」 read-only. D-Formulas DONE (systems-designer spawned, 6 formulas approved: D.1 write_action_allowed 27-combo matrix, D.2 screen_transition_valid EDGES graph w/ origin_screen guard, D.3 Story Log pagination PAGE_SIZE=20×MAX_LOADED_PAGES=3 ui_memory_bound=60 O(1) proof + eviction, D.4 TOUCH_TARGET_MIN=44 two-class hit areas, D.5 font S/M/L ×0.875/1.0/1.25 + two_column threshold 360px+24 mobile-always-1-col proof, D.6 transition duration family invariant banner≤settings≤card≤screen w/ card_transition_ms dep). Registry candidates for Phase 5: TOUCH_TARGET_MIN=44 (new), card_transition_ms=200 (promote from #14 knob). Registry check D: 0 conflicts. E-Edge Cases DONE (13 cases; 3 judgment calls approved: deferred S5 takeover when reading Log w/ S4→S5 reroute, new-overlay-closes-old, browser-back out of MVP scope→Open Question; tap_retry_reset added to D.1 → matrix fixed 27→30). F-Dependencies DONE (12 systems; app_config device-level ownership claimed; 5 one-way gaps → index footnote at Phase 5: TM, Contract, World Memory, Combat, Continuation). G-Tuning Knobs DONE (9 knobs + 2 locked constants + 3 pointer-knobs). Visual/Audio DONE (art-director spawned, 10 sections, all 10 assumptions a-j accepted; key: marginalia-not-chrome marks, page-flip direction=wayfinding, mono-only #15 surfaces, desaturation-not-đỏ-son on multi-item surfaces [color precedent extension], banner tier never accent colors, Settings = sole flat-geometry exception). UI Requirements DONE (layout zones 4 surfaces, input area NOT sticky footer, single breakpoint = D.5, safe-area insets, Godot notes → ADR, UX Flag: 4 ux spec files incl. new main-play-screen.md + settings.md). H-AC DONE (qa-lead spawned: 46 AC, 21 Unit BLOCKING; caught 8 spec gaps — GAP-1 REAL BUG: D.1 matrix was 15 actions not 10 → fixed to 15×3=45 after GAP-4 removed tap_retry_reset from D.1 [uses reset_in_progress flag owned by #13 instead]; GAP-2 resolved semantically: in_combat constraint applies to SYSTEM not player navigation; GAP-3: 「Thẻ」 mark added to Story Log chrome; GAP-5: default_page_index not-called guard at total_pages=0; GAP-6 → Open Question #1 [mobile viewport range undefined]; GAP-7 → registry done; GAP-8: undo_available var name fixed). Open Questions DONE (8 items w/ owners: viewport range, browser back, AI config fields, app_config storage, screen stack ADR, empty-state copy review, World Memory pagination API ack, reset_in_progress definition in #13). Phase 5 DONE: self-check PASS (638 lines, 0 placeholders), CD-GDD-ALIGN skipped (lean), registry updated (+TOUCH_TARGET_MIN=44 [new, refby #14+#15], +card_transition_ms=200 [promoted from #14 knob, refby #14+#15], +6 referenced_by additions: card_exists/continuation_choice_eligible/undo_availability_window/suggested_action_count/undo_depth/ai_call_timeout_seconds, card_exists note refreshed), systems-index updated (#15 → Designed, 15/15 tracker, gap footnote #14: TM/Contract/WorldMemory/Combat/Continuation one-way + closes 3 reverse rows #6/#11/#14). NOT yet reviewed (/design-review must run in FRESH session). Systems #4-15 all Designed — Pending Review (12 GDDs unreviewed). Consistency-check NOT re-run since #15 added (registry touched: +2 constants, +7 refby).
File: design/gdd/core-ui-screen-navigation.md
Prior-Feature-14: Character Card & Identity (#14/15) — COMPLETE (Designed — Pending Review), 14/15 MVP systems designed
Prior-Task-14: ALL sections written 2026-08-04: 8 required + Visual/Audio (art-director) + UI Requirements (UX Flag → design/ux/character-card.md) + 45 AC (qa-lead, 5 spec gaps caught: Contract Enforcement dep added, empty-state split into independent sub-states, AC-11 cross-ref, gaps 4-5 → Open Questions) + 9 Open Questions. Registry: +1 formula (card_exists, registered for Core UI #15), +7 referenced_by, exp_threshold/song_tu_threshold notes refreshed. systems-index.md: #14 → Designed, 14/15 tracker, gap footnote #13 (8 unlisted deps incl. Turn Manager + World Memory one-way). NOT yet reviewed (/design-review must run in FRESH session). Next system: #15 Core UI/Screen Navigation (last one — depends on Combat, Character Card, Situation Gen, all Designed). Consistency-check still not re-run since GDDs #11-14 added.
Prior-Detail: Designing character-card-identity GDD. Sections DONE: Overview, Player Fantasy, Detailed Design (C), Formulas (D.1-D.5, systems-designer, 4 assumptions accepted), Edge Cases (12), Dependencies (11 connections, 2 new one-way gaps: Turn Manager + World Memory), Tuning Knobs (4 knobs + not-mine pointers). Also DONE: Visual/Audio (art-director, 4 assumptions accepted — chờ đột phá stays MONO not xanh ngọc; Song Tu button = circle, Hồi phục = square; 「che giấu」 calligraphy-bracket badge; name-tap entry point) + UI Requirements (overlay not screen, name-tap via RichTextLabel meta → ADR, FoldableContainer accordion, UX Flag → design/ux/character-card.md). Next: AC (qa-lead spawn mandatory), then Open Questions, then Phase 5 (registry, index, review offer). Key decisions: read-only display layer EXCEPT ownerships — base_X0 seed, Character Profile schema, NPC tag schema (medium_override), concealment schema; card existence = mọi nhân vật xuất hiện trong ≥1 lượt confirm (user first chose 'có lời thoại', then widened to 'đã gặp' when Combat's every-combatant-has-card constraint surfaced); concealment display = fake displayed_* values + badge (per-field), "???" when absent, estimate computed over displayed values, Combat always uses TRUE values; xuyên-không privilege covers identity fields ONLY, not stats; investigation mechanic scoped OUT → handoff to Situation Gen (Open Question); buttons (Song Tu, Hồi phục) route through Turn Manager as normal actions, disabled during input lock; Kết liễu/Tha mạng NOT on card. Review mode: lean. Context sweep done (Explore agent): 9 GDDs have reverse-direction display interfaces on this Card; registry locked facts: song_tu_threshold=60, song_tu_break_threshold=40, deep_hostility_threshold=-80, affinity_range=[-100,100], tier_from_level, exp_threshold, stat_growth, combat_power_estimate, alive, death_and_consequence_blocked. Open items inherited: npc_tag.medium_override schema ownership (from Death & Consequence), investigation mechanic for hidden identity (from game-concept Open Questions).
File: design/gdd/character-card-identity.md
Prior-Feature: Character Continuation (#13/15) — COMPLETE (Designed — Pending Review), 13/15 MVP systems designed
Prior-Task: All 8 sections + Visual/Audio (art-director) + UI Requirements + 21 AC (qa-lead) + 2 Open Questions written. Key decisions: only Chơi lại functional at MVP (Quỷ tu/Chuyển sinh shown locked "Sắp ra mắt", read as "unwritten pages" not disabled buttons); Chơi lại keeps same setting pack, new character only, no character creator; Character Continuation (not Death & Consequence) is the real trigger owner of Persistence's "Khóa slot"+"Tạo slot mới" (fixed misattribution in persistence-save-system.md, 2 spots); Persistence ops fire exactly once per continuation attempt — retry on state_reset_error reuses same slot_id (no orphans), retry on persistence_error re-triggers both Persistence ops from scratch (qa-lead caught this inconsistency mid-session, fixed in Core Rule #5 + Edge Cases before writing ACs). D.1 reset_completeness_check (N=5 systems) gates handoff → Reset Failed on failure (block+retry, not silent). D.2 continuation_choice_eligible is defensive dual-condition invariant (Turn Manager is_death_turn AND Death & Consequence death_confirmed). Visual/Audio (art-director): NO đỏ son/xanh ngọc anywhere — reuses "ink already dried" moment from Death & Consequence as the visual continuity device. Registry +2 formulas. systems-index.md updated (gap footnote #12, 13/15 progress tracker).
File: design/gdd/character-continuation.md
Prior: Death & Consequence — COMPLETE (Designed — Pending Review), 12/15 MVP systems designed (+ combat-system.md no_outcome mechanic redesigned same session)
Task: All 8 required sections + Visual/Audio (art-director) + UI Requirements (UX Flag) + 39 AC (qa-lead) + 5 Open Questions written. Key decisions: death_roll probabilistic (DEATH_ROLL_BASE=0.10/SCALE=0.85, clamp 0.05-0.95, scales with margin_ratio, deep hostility only, survival forces severity=severe via forced_severe flag); kill/spare is player-chosen post-battle action (Pending Fate, 1-turn window, resolves at Turn Manager confirm, default spare); non-lethal severity by margin_ratio tier (mild/medium/severe, thresholds 0.35/0.75); severe=phế đan điền sets death_and_consequence_blocked(self) (kept EXP GDD's exact provisional name — now registered); recovery via Formula D.3, 3 methods (đại cơ duyên/tiên thảo dị bảo/tự tu), cost deducted even on failure. Visual/Audio (art-director): đỏ son area/density/permanence differentiates severity tiers instead of new colors; recovery = đỏ son disappearing, not xanh ngọc (reserved for breakthrough). Registry +2 formulas (alive, death_and_consequence_blocked), 5 referenced_by updates. systems-index.md updated (gap footnote #11, 12/15 progress tracker). Side-quest COMPLETE: combat-system.md's no_outcome/MAX_EXCHANGE_COUNT mechanic redesigned per user request 2026-08-03 (systems-designer spawned). MAX_EXCHANGE_COUNT removed as design-level cap. New Core Rule #8 (a-d draw paths) + Core Rule #13 (is_spar_friendly, external_abort_signal state fields) + Core Rule #7 narrow exception (Lực chiến only relabels an HP-already-decided outcome as draw in spar_friendly, never decides who wins). New Formulas D.9b (spar draw: parity≤0.15 AND winner HP%≤0.15, 0/0 Lực chiến = NOT eligible) + D.9c (TECHNICAL_EXCHANGE_CAP=200 tiebreak, non-spar always forces win/lose via hp_pct then coin_flip). D.12 renamed input MAX_EXCHANGE_COUNT→CONTENT_EXCHANGE_ESTIMATE=30 (value unchanged, preserves max_invocations_per_battle=5 registry-locked constant — equipment-skill-data-system.md AC-11 untouched). Updated: Tuning Knobs (4 rows), Edge Cases, AC-07/08/31/41(a-i new), Dependencies (external_abort_signal interface), Open Questions (resolved, cross-referenced). Cross-file: situation-encounter-generation.md got new Open Question (owns the external_abort_signal trigger condition — Combat only defines the listener side); death-and-consequence.md's Open Question row updated to reflect resolution; registry entities.yaml comment renamed. combat-system.md still Status: Designed — Pending Review (not re-reviewed).
File: design/gdd/death-and-consequence.md
Prior: Situation/Encounter Generation complete (Designed — Pending Review), 11/15
File: design/gdd/situation-encounter-generation.md
<!-- /STATUS -->

<!-- CONSISTENCY-CHECK: 2026-08-02 | GDDs checked: 2 | Conflicts found: 0 -->
<!-- CONSISTENCY-CHECK: 2026-08-02 | GDDs checked: 3 (post /design-review fixes) | Conflicts found: 0 -->
<!-- CONSISTENCY-CHECK: 2026-08-02 | GDDs checked: 4 (post AI/LLM Integration Layer GDD) | Conflicts found: 0 -->
<!-- CONSISTENCY-CHECK: 2026-08-02 | GDDs checked: 5 (post World Memory GDD) | Conflicts found: 0 (1 stale Open Question fixed in turn-manager.md) -->
<!-- CONSISTENCY-CHECK: 2026-08-02 | GDDs checked: 6 (post Persistence/Save System GDD) | Conflicts found: 0 (6 referenced_by metadata gaps fixed in entities.yaml) -->
<!-- CONSISTENCY-CHECK: 2026-08-02 | GDDs checked: 7 (post Combat System GDD) | Conflicts found: 2 (combat_power_estimate registry entry missing variables + wrong output_range, both self-authored errors, fixed; 5 referenced_by metadata gaps also fixed) -->
<!-- CONSISTENCY-CHECK: 2026-08-03 | GDDs checked: 9 (post NPC Affinity + Setting & Canon GDDs) | Conflicts found: 0 (6 stale "(chưa thiết kế)" prose refs flagged in exp/combat/world-memory GDDs + 1 resolved Open Question in exp GDD pending strike-through) -->
<!-- CONSISTENCY-CHECK: 2026-08-03 | GDDs checked: 11 (post Situation/Encounter Generation GDD) | Conflicts found: 1 (encounter_level_range referenced_by combat-system.md unsubstantiated — fixed by adding cross-reference + Open Question in combat-system.md); 2 stale "chưa thiết kế" refs to Situation/Encounter Gen fixed in exp-realm-progression.md (Dependencies prose + table row) -->
<!-- CONSISTENCY-CHECK: 2026-08-04 | GDDs checked: 14 (post Character Card & Identity GDD; first run covering #12-14) | Conflicts found: 0 (28 formulas + 16 constants all verified clean); 71 stale "chưa thiết kế" prose refs catalogued across 13 GDDs (informational — all name systems that are now Designed); bulk cleanup DONE same day (user-approved): 70 listed + 5 line-wrapped sites fixed → "đã Designed", provisional markers/numbers/Core UI refs untouched; 2 sites intentionally skipped (persistence-save-system.md:264-266 N=3 example where status is the premise of the number — recalc at /review-all-gdds; exp-realm-progression.md:469-471 historical gap-analysis footnote); combat-system.md:776 flagged for /review-all-gdds re-read (parenthetical no longer explains the 0 value) -->
<!-- CONSISTENCY-CHECK: 2026-08-04 | GDDs checked: 15 (post Core UI/Screen Navigation GDD — delta scan: 46 registry names × new GDD #15 + 2 new constants × all 15 GDDs, leveraging same-day clean 14-GDD baseline) | Conflicts found: 0 (46/46 entries clean; card_transition_ms=200 verified matching #14 knob table); 1 informational: TOUCH_TARGET_MIN registered with referenced_by #14 pre-emptively but #14 prose doesn't cite it yet — add citation at /review-all-gdds | Report: docs/consistency-report-2026-08-04.md -->

## Current Task (updated)

### Round 2 (2026-08-06, THIS session — current state, read this first)

`/design-review persistence-save-system.md` — **round 2 complete, 2026-08-06**
(picked up fresh after round 1's `/clear`, per its own "Next step" instruction
below). Full mode again: 5 specialist subagents in parallel (`game-designer`,
`systems-designer`, `qa-lead`, `godot-specialist`, `ux-designer`) +
`creative-director` senior synthesis. Verdict: **NEEDS REVISION**, 7 blocking
items this time (different content from round 1's 5 — round 1's fixes had
already closed out the previous batch; round 2 found a fresh, deeper layer,
mostly cross-doc/state-machine issues round 1 didn't reach). User chose
"sửa GDD ngay" again, batched 3 design decisions via AskUserQuestion first
(scope of edits to 2 Approved docs + slot-deletion friction tier), then
approved a 3-file changeset before any Write/Edit.

**7 blockers fixed** (B1-B7, creative-director's numbering):
1. **B1 — Turn Confirmed/write-failure contradiction** (`ux-designer` finding,
   escalated by creative-director to "un-implementable on current state
   machine", not just a UX nit): `turn-manager.md`'s Turn Confirmed state
   already rendered narration/Undo/4-suggestions in full, but Persistence
   Core Rule #4 said a failed write meant the turn "was never confirmed" —
   no transition existed for retroactively un-rendering that. **Fixed by
   flipping to a write-ahead model**: atomic write now happens at the END of
   Resolving/Undoing, GATING the transition into Turn Confirmed/Awaiting
   Action, instead of firing AFTER the transition already completed. Edited
   BOTH `turn-manager.md` (Core Rule #4, States and Transitions, new Edge
   Case, Interactions) AND `persistence-save-system.md` (Core Rule #1/#4,
   States and Transitions table, Interactions/Dependencies wording, AC-01
   rewritten to match + assert post-Undo content not just write-count).
2. **B2 — atomicity's foundational assumption unverified** (`godot-specialist`):
   "1 GDScript write call = 1 physical atomic IndexedDB write" was never
   confirmed — IDBFS may chunk large payloads internally. Added as the
   top-priority question to the existing web-export spike list in Open
   Questions; gates the ADR choice between options (a)/(b) in Core Rule #3.
3. **B3 — (a)/(b) recommendation conflated two axes** (`godot-specialist`):
   effort-to-implement vs. strength-of-durability-guarantee were treated as
   one axis; (b) (real IndexedDB transaction) may actually have a STRONGER
   guarantee than (a) (`FileAccess`/`syncfs()`), not just higher effort.
   Rewrote Core Rule #3's recommendation to separate the two axes explicitly
   and gate the final choice on the B2 spike result; also tightened the
   `max_perceived_autosave_latency_ms` guidance to require END-TO-END
   latency measurement (sync + CPU serialize/compress on the single web
   main thread), not just the synchronous `FileAccess.store_*()` call
   (which would always pass a rigged test).
4. **B4 — 2 of 5 player-facing error codes had no display surface anywhere**
   (`ux-designer`, confirmed by creative-director grepping both docs):
   `MULTI_TAB_CONFLICT` and `LOAD_FAILED_UNREADABLE` were absent from both
   `persistence-save-system.md`'s own UI Requirements AND
   `core-ui-screen-navigation.md`'s banner trigger enumeration (§Core Rule
   #1, line ~35) — each doc assumed the other covered it. Resolved:
   `MULTI_TAB_CONFLICT` → banner (added to Core UI's trigger list, detection
   point clarified as Load-time not Write-time, so no free-text-input-loss
   question arises). `LOAD_FAILED_UNREADABLE` → deliberately NOT a banner
   (creative-director's call: permanent loss of an entire playthrough is a
   PERMANENT state of that slot object, not a transient dismissible
   notification) — instead a persistent inline label on the slot row itself,
   spec'd in `core-ui-screen-navigation.md` §4 (Save Slot Screen).
5. **B5 — no proactive safeguard against the known-HIGH-risk
   `LOAD_FAILED_UNREADABLE` data loss** (`game-designer`, Safari ITP ~7-day
   IndexedDB eviction — the exact player segment "Mực Chưa Khô" targets,
   long-return players): the only response was a well-written diegetic
   apology AFTER the loss. Repositioned Core Rule #9 (QA export) as ALSO a
   player-facing "Chép lại quyển sổ" (copy the journal) action — cheapest
   possible fix, reuses the existing JSON export, just adds 1 button + 1
   diegetic string on the Save Slot Screen.
6. **B6 — slot-deletion contract had a dangling reference** (`qa-lead` +
   `game-designer` merged): UI Requirements exposed "Xóa" for in-progress
   slots too, but Edge Cases/AC-19 only ever specified deletion for CLOSED
   slots — implementers would have to guess. User chose (via AskUserQuestion):
   in-progress slots keep the existing single-step confirm (added new Edge
   Case + **AC-30**); closed-slot deletion ESCALATED to typing the
   character's name to confirm (AC-19 rewritten) — friction now proportional
   to "erasing a completed life", matching Pillar 2's weight.
7. **B7 — AC-01 tested write-COUNT, not write-CONTENT** (`qa-lead`, escalated
   by creative-director): a bug that left an undone turn's record still
   sitting in the Full Narrative Log after the post-Undo write would still
   pass AC-01 as originally worded (it just counted invocations). Added a
   content-assertion clause: the undone turn's record must be absent from
   the log and `world_time` must have reverted, verified by round-trip read.

**Specialist disagreements creative-director ruled on** (see full synthesis
in this session's transcript if needed, not re-saved verbatim here): downgraded
game-designer's "missing ink-ripple sensory beat at chapter-close" to
Nice-to-have (the MANDATORY desaturation treatment in
`core-ui-screen-navigation.md` §4 already delivers that beat — the ripple
effect itself was correctly scoped optional); disagreed with
systems-designer's suggestion to flag `compression_ratio`'s `(0,1]` range as
unverified (the mandatory `=1` planning default already neutralizes the risk);
downgraded `quota_warn_threshold` misconfig-guard to a project-wide
tuning-knob-validation AC instead of a local Formula #3 patch (not done this
round — Recommended-tier, deferred).

**Not fixed this round** (Recommended-tier, explicitly deferred, NOT
blocking — surfaced by specialists but creative-director/user did not commit
to fixing this pass): Core Rule #5 (no-auto-delete-of-closed-slots) has no AC
under quota pressure (`qa-lead`); `quota_bytes=0` boundary ambiguity between
two Formula #1 edge cases (`systems-designer`); `quota_bytes`/
`quota_bytes_available` Range columns declared wrong vs. what the edge cases
actually handle (`systems-designer` — recommended as a project-wide table
convention fix, not a local patch); AC-11 doesn't test the runtime
"don't-skip-first-write" behavior (`qa-lead`); QA export behavior undefined
for a `LOAD_FAILED_UNREADABLE` slot (`qa-lead`); AC-03's sequential-blob mock
model conflicts with the Core Rule #3 (a) recommendation, should be flagged
ADR-blocked alongside AC-17/AC-22 (`godot-specialist`); multi-tab lock
liveness constraint / detection-point-when-tab-already-open edge (`ux-designer`,
partially addressed by the B4 detection-point clarification above, the
liveness-bound-required-for-ADR part is NOT done); quota-warning banner text
should use diegetic voice instead of plain technical text (`game-designer`,
cheap one-line fix, NOT done).

GDD headers: `persistence-save-system.md` Last Updated unchanged (already
2026-08-06 from round 1, content is now round-2-revised); `turn-manager.md`
Last Updated bumped to 2026-08-06 with a note (was previously 2026-08-02,
Status field itself — "Designed — Pending Review" — left untouched, that's a
PRE-EXISTING drift vs. systems-index.md calling it "Approved", out of this
round's scope); `core-ui-screen-navigation.md` header not touched (only 2
small additive edits, no header bump done — consider doing this before round
3 if it matters).

**Next step (user chose, again)**: re-review in a FRESH session — run
`/clear` then `/design-review persistence-save-system.md` for **round 3**.
Do NOT re-run the 5 specialists inline in this already-long-context session.
When round 3 eventually lands APPROVED, remember to also update
`systems-index.md` (status + gap footnote for any new one-way deps — none
surfaced this round) and append to
`design/gdd/reviews/persistence-save-system-review-log.md` (does not exist
yet — this will be its first entry, covering all 3 rounds' worth of history
if not logged incrementally).

### Round 1 (2026-08-06, superseded — kept for history, see Round 2 above for current state)

`/design-review persistence-save-system.md` — **round 1 complete, 2026-08-06**.
Full mode: 5 specialist subagents spawned in parallel (`game-designer`,
`systems-designer`, `qa-lead`, `godot-specialist`, `ux-designer`) +
`creative-director` senior synthesis. Verdict: **NEEDS REVISION** (5
blocking items). User chose "sửa ngay trong phiên này" — all 5 fixed
live, plus 4 newly-discovered one-way dependency gaps (agreed as a bonus
fix), plus 2 cheap Recommended items folded in opportunistically.

**5 blocking items fixed** (all in `persistence-save-system.md` unless
noted):
1. Core Rule #3 (atomic write) stated an absolute guarantee no default
   Godot Web storage backend naturally provides (`godot-specialist`:
   `FileAccess`/IDBFS `syncfs()` is async, "write returned success" ≠
   "durable") — added conditional architecture note (ADR must either
   collapse N blobs into 1 physical write, or use a real multi-object
   storage transaction).
2. Formula #3 (`warn_triggered`) fail-safe fallback was inverted for
   negative `quota_bytes_available` (`systems-designer`: only caught
   `=0`, missed negative-sentinel APIs → ratio goes negative → silently
   suppresses the warning at the most dangerous moment) — fixed fallback
   condition to `≤0 hoặc không hữu hạn`; also added divide-by-zero guards
   to Formula #1 for `avg_turn_record_bytes`/`compression_ratio ≤ 0`.
3. No error-code taxonomy existed anywhere (`qa-lead` + `ux-designer` +
   `game-designer` convergent finding — AC-13/04/21 were vacuously
   satisfiable) — added a new **Error Taxonomy** table (6 codes +
   diegetic player-facing text per "Mực Chưa Khô" voice); AC-04/13/21
   rewritten to assert against the concrete constants.
4. Two invariant conflicts with `core-ui-screen-navigation.md` (Approved)
   (`ux-designer`): (a) that doc's banner FIFO/no-preempt rule clashed
   with this GDD's "NGAY" urgency for write-failure banners — added an
   explicit preemption exception directly in `core-ui-screen-navigation.md`
   §Core Rule #1 banner tier (user-approved: OK to edit an Approved doc
   for this specific bug-fix-class change); (b) load-rejection
   (schema-mismatch) banner instruction was nonsensically bundled into
   "màn hình đang chơi" — split write-failure vs. load-rejection into 2
   explicit rules, added load-rejection to Core UI's banner trigger list.
   Root cause fixed too: `persistence-save-system.md` had 2 stale
   "Core UI/Screen Navigation (chưa thiết kế)" references — that system
   is now Approved; both updated with cross-references to its fuller
   Save Slot Screen spec (§4/§5/§8/D.4).
5. Core Rule #5 wording ("KHÔNG bị xóa hay ghi đè") textually contradicted
   the Edge Case allowing manual slot deletion (`game-designer` —
   creative-director ruled this is NOT actually a Pillar 2 violation,
   player-initiated storage management ≠ system-initiated erasure, and
   removing delete entirely would strand players at quota exhaustion
   since Formula #1 proves unbounded growth; the wording was just
   internally sloppy) — fixed to distinguish "system never auto-deletes"
   vs. "player may manually delete via confirmed gesture".

**Bonus fix (user-approved)**: 4 one-way dependency gaps — `combat-system.md`,
`exp-realm-progression.md`, `death-and-consequence.md` (all Designed)
never mention Persistence despite being declared hard downstream
dependencies here; `situation-encounter-generation.md` declares a
dependency back on Persistence that wasn't listed here in reverse.
Expanded the existing Open Question + `systems-index.md` footnote (Core
Layer, system #6) for the first 3 (same footnote-not-edit precedent as
the pre-existing Equipment gap); closed the 4th directly by adding
Situation/Encounter Generation to Persistence's own downstream list (2
places: Interactions + Dependencies sections).

**Also folded in (cheap Recommended items)**: Formula #2 registration
made idempotent by `system_id` + `N` frozen for the duration of one
bundle-collection pass (TOCTOU fix, `systems-designer`); multi-tab lock
Open Question clarified — no built-in GDScript cross-tab-locking
primitive exists (Web Locks API via `JavaScriptBridge`, or custom
heartbeat+timeout, both need custom JS glue).

**Specialist disagreements surfaced, creative-director ruled on**: 3
game-designer findings downgraded/redirected (bookkeeping-surface claim
called an overreach into `/ux-design` territory; "3 lối tiếp tục oversell
continuity" redirected to `character-continuation.md`, not this GDD);
systems-designer's variance-modeling suggestion (X-01) rejected as false
precision on not-yet-measured inputs; godot-specialist's OQ-split
suggestion called pure bookkeeping.

**Not fixed this round** (Recommended-tier, left for later — not
blocking): AC-17/18/22 test-infra annotations, AC-09 fixture-independence
note, 3 missing Edge-Case ACs (qa-lead proposed AC-23/24/25 concrete
wording), slot-list sort/ordering rule, deletion-confirmation-dialog
content spec, Formula #3's `measured_bundle_bytes` source-precision note,
async-model note for quota check, per-origin `quota_bytes_available`
variance note.

GDD header updated: Status → "Designed — Revised, chờ re-review
(`/design-review` 2026-08-06)", Last Updated → 2026-08-06. Files touched:
`design/gdd/persistence-save-system.md` (primary, ~20 edits),
`design/gdd/core-ui-screen-navigation.md` (2 small edits to an Approved
doc, explicitly user-approved), `design/gdd/systems-index.md` (footnote
expansion + Last Updated bump).

**Next step (user chose)**: re-review in a FRESH session — run `/clear`
then `/design-review persistence-save-system.md` again, since full mode
needs 5 more specialist subagents and this session's context is already
elevated. Do NOT re-run the specialists inline in this session.

**Cross-reference for continuity**: `systems-index.md` confirms all
15/15 MVP systems are Designed; 4 are Approved (Turn Manager, Contract
Enforcement, Equipment & Skill Data, **Core UI/Screen Navigation** — the
4th was newly Approved since the last full narrative update below was
written, which is why the older "## Prior Task" chain below still talks
about Death & Consequence being "next" — that chain is STALE, trust
`systems-index.md` over it for current project state). The remaining 10
Designed-but-not-yet-reviewed systems (after Persistence's re-review
closes): world-memory, combat, exp-realm-progression, npc-affinity,
setting-canon, situation-encounter-generation, death-and-consequence,
character-continuation, character-card-identity, ai-llm-integration-layer.
`/consistency-check` has not been re-run since `situation-encounter-generation.md`
was added (per the stale note below) — worth doing before the next
review round.

## Prior Task (superseded)

`/design-system EXP & Realm Progression` — **complete**. All 8 required
sections written to `design/gdd/exp-realm-progression.md`. User explicitly
opted to skip Visual/Audio + UI Requirements (Progression category, not in
the mandatory-visual list — all display already covered by Character
Card's Visual Identity Anchor). Open Questions written.

Key design decisions, all made live with user: (1) a NEW mechanic not in
any prior doc — breakthrough gate at every tens-boundary level (10→11,
20→21...) requires an external condition beyond EXP (user's own example:
Hồn Hoàn in Đấu La Đại Lục), abstracted as a boolean
`breakthrough_requirement_met(tier)` check owned by this GDD, with the
actual requirement DATA deferred to the not-yet-designed Setting & Canon
Integration system (same "opaque blob" pattern Persistence used for
`turn_snapshot`); (2) EXP that accumulates past the breakthrough cap is
HARD-CAPPED and WASTED, not banked — user's explicit choice over the
banking alternative; (3) 4 EXP sources confirmed with user: Combat
win/lose (4%, already fixed by game-concept.md), a NEW passive 1%/turn
(unconditional, tied to `exp_threshold(level)` as denominator), and a NEW
Song Tu bonus (2%/turn, requires BOTH a song-tu-type Tâm Pháp AND an
active Song Tu relationship — interface with NPC Affinity, undesigned,
provisional); (4) Tâm Pháp given MINIMAL ownership here (just
`exp_multiplier` + `type` fields) rather than a full dedicated system,
since no system in the 15-system index owns it.

`systems-designer` delivered Formulas D.1–D.6 (mandatory spawn, lean
mode): linear EXP curve (deliberate choice over exponential/stepped, cites
Pillar 4 legibility + solo-MVP scope), tier-gap-scaled combat-win EXP
(deliberately does NOT reuse Combat's `PENALTY_PER_TIER` to avoid coupling
combat-difficulty tuning to EXP-economy tuning), stat growth curve (linear
per-level + one-time breakthrough jump) that directly resolves Combat's
`combat_power_estimate` (D.13) `w_HP=0.25` placeholder, and D.6 closes
game-concept.md's explicit Open Question about multi-source EXP resolution
in one turn (sum all sources → multiply Tâm Pháp coefficient ONCE → apply
level-up/cap logic ONCE).

`qa-lead` delivered 38 ACs (mandatory spawn, lean mode) and caught a REAL
authoring bug mid-session: D.6 pseudocode and the Edge Cases prose gave
CONTRADICTORY behavior for `is_death_turn=true` turns (pseudocode only
zeroed the combat portion; prose said the whole turn's EXP should be
zero). Resolved live with user (short-circuit the whole turn globally,
same pattern as the existing `death_and_consequence_blocked` check) and
retrofitted into both D.6 pseudocode and Core Rule #2 before qa-lead's AC
text was written to file — this is the kind of cross-section inconsistency
the qa-lead spawn is specifically meant to catch.

Registry updated: 3 new formulas (`tier_from_level` — closes Combat
System's own `tier(C)` "chưa thiết kế" forward-reference in its D.1;
`exp_threshold` — registered pre-emptively since 2 undesigned GDDs
(Character Card, Persistence UI) will need it; `stat_growth` — directly
closes the `combat_power_estimate` `w_HP` placeholder, referenced_by
combat-system.md). No new constants registered — all EXP-economy tuning
knobs (12 total, listed in Tuning Knobs) stay internal to this GDD, same
treatment as prior sessions' internal-only knobs.

5 new one-directional dependency gaps found (all with UNDESIGNED
downstream systems, same pattern as before): NPC Affinity & Relationship
(soft), Death & Consequence (soft), Setting & Canon Integration (**hard**
— breakthrough progression fully blocked without it), Character Card &
Identity (reverse direction), Situation/Encounter Generation (reverse
direction) — all footnoted in `systems-index.md`, not restructured into
the dependency table.

`design/gdd/systems-index.md` updated: system #8 → Designed, progress
tracker → 8/15 MVP systems designed, 8 design docs started (3 still
reviewed/approved — systems #4–#8 are NOT yet reviewed).

## Prior Task (superseded)

`/design-system Combat System` — **complete**. All 8 required sections +
real Visual/Audio (REQUIRED category, `art-director` spawned) + UI
Requirements + Open Questions written to `design/gdd/combat-system.md`.
Most complex GDD of the project so far (L, 4+ sessions estimated —
confirmed accurate).

Key architecture decisions (all made live with user, each a real fork
in design space): (1) 1 battle = a chain of consecutive Turn Manager
turns, each turn = 1 "exchange" where BOTH sides act (not the
single-turn-instant-resolve model originally drafted in Player Fantasy —
user explicitly chose the more complex multi-turn path); (2) full
stat-pair simulation (ATK/DEF/ACC/Evasion/Crit/Lifesteal/Amp/Mitigation/
Regen/SPD) rather than one aggregate "Lực chiến" score deciding win/lose
— "Lực chiến" downgraded to a pre-battle ESTIMATE only (Core Rule #7),
win/lose is purely HP-reaches-0 across exchanges; (3) early-exit mid-exchange
when the first (by SPD) attack drops the other to 0 HP — the second
attack in that exchange never executes (Core Rule #2/#3, formalized as
Formula D.9's central branch) — this reversed an initial architecture
assumption and required editing already-approved Core Rules mid-session;
(4) a scope conflict surfaced and resolved: user wanted basic combat
items despite `equipment-skill-data-system.md` (Approved) explicitly
excluding inventory — resolved by scoping "combat item" as a minimal
1-slot-per-character concept OWNED by Combat, not extending Equipment's
locked scope.

13 formulas (D.1–D.13) from `systems-designer` (2 rounds — first round
asked 4 clarifying architecture questions since it lacks
AskUserQuestion access, second round delivered full formulas after
confirmation) — closes ALL of `game-concept.md`'s mandatory boundary
test cases (Lực chiến 0/0 → sentinel "N/A"/"+∞", tier-penalty floor via
2-layer clamp, ACC/SPD 0/0 via difference-model not ratio-model) and
defines `max_invocations_per_battle=5`, closing
`equipment-skill-data-system.md`'s previously-BLOCKED AC-11 (registry
updated, cross-file edit made to that Approved GDD). 45 ACs from
`qa-lead`, mostly deterministic unit tests (mocked RNG/seeded rolls) +
some integration tests for Turn Manager Undo interaction. qa-lead
surfaced 3 real gaps (undefined `exchange_id` scope, inconsistent
`outcome` schema between D.9 pseudocode and Edge Cases prose, a
false-alarm about `max_invocations_per_battle` having no runtime
enforcement) — first 2 were resolved DIRECTLY in Core Rules #1/#11
(not deferred to Open Questions) since they were cheap, unambiguous
fixes; the 3rd was confirmed as by-design, not a gap.

Registry updated: 1 new formula (`combat_power_estimate`, D.13 — likely
needed by EXP & Realm Progression and Character Card & Identity later)
+ 1 new constant (`max_invocations_per_battle=5`, cross-referenced by
`equipment-skill-data-system.md`). Combat's other 12 internal
tuning-knob-adjacent constants (PENALTY_PER_TIER, K_HIT, MAX_EXCHANGE_COUNT,
etc.) NOT registered — internal-only, same treatment as
`ai-llm-integration-layer.md`'s knobs.

0 new one-directional dependency gaps found — first system this session
where all 4 upstream GDDs already bidirectionally listed Combat in their
own Dependencies (they anticipated it).

`design/gdd/systems-index.md` updated: system #7 → Designed, progress
tracker → 7/15 MVP systems designed, 7 design docs started (3 still
reviewed/approved — systems #4–#7 are NOT yet reviewed).

## Prior Task (superseded)

`/design-system Persistence / Save System` — **complete**. All 8 required
sections + real Visual/Audio + UI Requirements (Save Slot Screen — user
chose direct player interaction via slot-select UI, multi-slot/one-slot-
per-playthrough model, "Chơi lại" always creates a new slot leaving the
closed one read-only) + Open Questions written to
`design/gdd/persistence-save-system.md`.

Key design decisions: Persistence treats every other system's state as
an opaque blob it doesn't interpret (Core Rule #2) — keeps it correctly
scoped as Foundation/Infrastructure rather than re-defining schemas
owned by not-yet-designed systems (Combat, NPC Affinity...). Auto-save
fires at exactly 2 Turn Manager checkpoints (Turn Confirmed; Undoing→
Awaiting Action) as ONE atomic all-or-nothing write, directly closing
the "orphaned state" risk `turn-manager.md` had flagged in its own Open
Questions. `turn_snapshot`'s detailed schema is deliberately NOT resolved
here — stays opaque to Persistence, so that open question remains with
Turn Manager/ADR as originally scoped. 3 formulas from `systems-designer`
quantify the mobile-quota risk `game-concept.md` only flagged
qualitatively: `save_bundle_size_growth` (O(world_time) unbounded raw
storage — direct counterpart to World Memory's `ai_context_view_size_bound`
which proved the AI-prompt side is O(1)), `bundle_completeness_check`
(all-or-nothing commit gate), `quota_utilization_warning` (real-measurement
early-warning, complementing #1's static projection). 22 ACs from
`qa-lead`, mostly plain unit tests + storage-backend mock/spy (no AI/
network calls, unlike `ai-llm-integration-layer.md`) — qa-lead also
surfaced 3 genuine spec gaps (quota_exhaustion_turn behavior when quota
≤ fixed cost; multi-tab lock release condition; blob-collection timeout)
routed to Open Questions instead of forced into untestable ACs.

Closed 1 of `turn-manager.md`'s own Open Questions cross-file (same
pattern World Memory used earlier this session): "world_time/turn
history needs to be inspectable for QA" is now resolved by this GDD's
Core Rule #9 (QA export to JSON).

Registry: no new entries — all 3 formulas + the 1 tuning knob
(`quota_warn_threshold`) are internal to this GDD only, same treatment
as `ai-llm-integration-layer.md`'s knobs.

1 new one-directional dependency gap found (5th time this session, same
pattern): `equipment-skill-data-system.md` (Approved) doesn't list
Persistence in its own Dependencies despite being a hard dependency of
it — footnoted in `systems-index.md`'s Core Layer section, same
treatment as the prior 4 gaps.

`design/gdd/systems-index.md` updated: system #6 → Designed, progress
tracker → 6/15 MVP systems designed, 6 design docs started (3 still
reviewed/approved — systems #4, #5, #6 are NOT yet reviewed).

## Prior Task (superseded)

`/design-system World Memory & Context Management` — **complete**. All 8
required sections + real Visual/Audio + UI Requirements (Story Log screen
— user pushed back on the "indirect only" default, correctly pointing out
this is an interactive-fiction game and players must be able to read the
whole story back from the start) + Open Questions written to
`design/gdd/world-memory-context-management.md`.

**HIGH-RISK system resolved**: technical-director's flag (unbounded world
history vs. LLM context window) is now solved with a proof, not deferred.
Two-tier data model (confirmed with user mid-design): **Full Narrative
Log** (every confirmed-and-not-undone turn, kept verbatim forever — powers
the player-facing Story Log UI; deletion ONLY happens on Undo, which the
user clarified is NOT a violation of "never lose content" — an undone turn
is treated as never having happened, distinct from lossy summarization of
a still-canonical turn) vs. **AI Context View** (bounded: a recency window
of verbatim turns + per-entity "extracted facts" pulled rule-based from
`locked_result` for older turns — zero extra AI calls, since extraction
never touches `calls_per_turn`). `systems-designer`'s Formula 4 proves
`context_size(prompt) <= C` where C is a constant independent of
`world_time` — raw data grows unbounded, but prompt content is O(1).

Key design decisions: `recency_window_turns` has an absolute floor of 1
(Core Rule #5) guaranteeing the sole undo-eligible turn is never demoted
to fact-only form — this directly resolves Turn Manager's own open
question about Undo × compression interaction. 22 ACs from `qa-lead`,
mostly plain unit tests (no mocks/fake-clock needed, unlike the sibling
AI/LLM Integration Layer GDD — this system makes no network calls).

Registry updated: 4 new formulas (`recency_window_membership`,
`fact_extraction_count`, `entity_fact_selection`,
`ai_context_view_size_bound`) + 3 new constants (`recency_window_turns=5`,
`max_facts_per_entity=8`, `max_entities_per_prompt=4`) — registered
(unlike AI/LLM Integration Layer's tuning knobs) because 3 not-yet-designed
GDDs (NPC Affinity & Relationship, Setting & Canon Integration,
Situation/Encounter Generation) will need these exact values/interfaces
when they design their own "query everything about NPC X" logic.

1 new one-directional dependency gap found (4th time this session, same
pattern): Turn Manager reads this system's AI Context View directly but
`systems-index.md`'s Foundation-layer entry doesn't show it — footnoted in
the Core Layer section (same treatment as the prior 3 gaps).

`design/gdd/systems-index.md` updated: system #5 → Designed, progress
tracker → 5/15 MVP systems designed, 5 design docs started (3 still
reviewed/approved — systems #4 and #5 are NOT yet reviewed).

## Prior Task (superseded)

`/design-system AI/LLM Integration Layer` — **complete**. All 8 required
sections written to `design/gdd/ai-llm-integration-layer.md` (Visual/Audio
+ UI Requirements skipped by user choice — pure infra, no UI/assets of its
own). Review mode `lean`: Section D (Formulas) spawned `systems-designer`,
Section H (Acceptance Criteria) spawned `qa-lead` (mandatory per lean-mode
rule); Sections B/C/E/F/G drafted without specialist spawn.

Key design decisions: single wrapper function `request_ai(call_type,
payload)` for both `narration_call` (has `locked_result`) and
`suggestion_call` (no `locked_result`, returns JSON-schema-constrained
array of 4 strings — validated pattern from `src/reference.md`). Critical
distinction nailed down: **network-level retry** (transient 503/timeout,
internal, invisible, never counts toward `calls_per_turn`) vs. **content
retry** (`suggestion_retry_call`, caller/Turn-Manager-initiated when <4
unique suggestions, DOES count as a 2nd logical call) — these were at risk
of being conflated. 4 formulas from `systems-designer`: Network Retry
Backoff Delay, AI Call Time Budget (hard-gates at `ai_call_timeout_seconds
=30s` registry constant), Model Fallback Selection (ordered list +
per-model cooldown, degenerate cases handled: all-cooldown-simultaneously
falls back to full list, empty list = config error), Logical Call
Accounting (invariant: `calls_per_turn` counts logical calls only, never
raw HTTP attempt counts). 23 ACs from `qa-lead`, all verifiable via
HTTP mock/spy + fake clock (no real network needed for determinism).

Prior art carried in: `prototypes/khe-uoc-ai-concept/REPORT.md` (Gemini
API, one-way lock architecture validated PROCEED, safetySettings
BLOCK_NONE needed for NSFW) and `src/reference.md` (production-grade
patterns actually running: `GEMINI_TEXT_MODEL_FALLBACKS`, per-model
overload cooldown, distinct 429/503/permission-denied handling, JSON
schema output). Model IDs deliberately NOT hardcoded in the GDD
(data-driven config per `coding-standards.md`) — deferred to ADR.

No new registry entries added — this GDD's 6 tuning knobs are internal to
this one layer, not yet referenced by any other not-yet-designed GDD.

1 new one-directional dependency gap found (same pattern as the 2 prior
ones this session): Turn Manager calls into this layer directly but
`systems-index.md`'s Foundation-layer entry for Turn Manager doesn't show
it — footnoted in `systems-index.md`'s Core Layer section (same treatment
as the Turn Manager ↔ Contract Enforcement gap), not restructured into
the table.

`design/gdd/systems-index.md` updated: system #4 → Designed, progress
tracker → 4/15 MVP systems designed, 4 design docs started (3 still
reviewed/approved — this one is NOT yet reviewed).

## Prior Task (superseded)

`/design-system Equipment & Skill Data System` — system #3 of 15, Foundation
layer. Key prior art: `prototypes/khe-uoc-ai-concept/REPORT.md` (verdict
PROCEED) validated a weapon/skill "thức" data model — 1 kỹ năng gốc has
multiple named "thức" (no repeat within one battle, but the root skill can
recur via a different thức), and shared skill-family names across weapons
with weapon-specific style (tested: "Lưu Vân Kiếm" vs "Lưu Vân Đao"). This
GDD should turn those validated findings into a real data schema. Turn
Manager and Mechanic/Narration Contract Enforcement are both Designed
(pending review) — 2/15 MVP systems done before this one.

## Current Task

`/design-system Mechanic/Narration Contract Enforcement` — authoring the
second GDD in the design order from `design/gdd/systems-index.md`
(Foundation layer, MVP, system #2 of 15).

## File

`design/gdd/mechanic-narration-contract-enforcement.md` — skeleton created,
all 8 required sections + Visual/Audio + UI Requirements + Open Questions
still `[To be designed]`.

## Context Carried Into This GDD

- No upstream dependency GDDs (Foundation layer, zero deps per systems-index).
- Downstream dependent: AI/LLM Integration Layer (Core, undesigned) — must
  respect the one-way architecture this GDD defines.
- Closely related (not a formal dependency): `design/gdd/turn-manager.md`
  (Designed, revised) already stubs the contract via its Core Rule #4
  (lock-before-narrate) and Core Rule #8 (nothing downstream is "final"
  until confirmed-and-not-undone). This GDD formalizes the full "Khế Ước
  Cơ Học/Tường Thuật" principle named in `game-concept.md`.
- Pillar alignment: Pillar 3 (Sức Mạnh Có Logic), Pillar 4 (Tường Thuật Sống
  Động), Pillar 1 (Thế Giới Khách Quan).
- Registry facts locked (do not redefine): formulas
  `world_time_advancement`, `ai_call_budget_per_turn` (now ≤3 calls, revised
  2026-08-02), `undo_availability_window` (now includes `has_confirmed_turn`
  + `is_death_turn`, revised 2026-08-02); constants `suggested_action_count=4`,
  `undo_depth=1`, `ai_call_timeout_seconds=30`, `calls_per_turn_max=3`.
- No ADRs exist yet; no engine-reference module matches this domain directly
  (pure architecture/data-flow principle, not physics/rendering/animation/
  audio/networking/UI).
- Review mode for this session: `lean` (from `production/review-mode.txt`).

## Prior Session Summary (for continuity)

1. `/design-review design/gdd/game-concept.md` → NEEDS REVISION (nhẹ), all
   blockers + recommendations applied same session (see
   `design/gdd/reviews/game-concept-review-log.md`).
2. `/prototype` — `prototypes/khe-uoc-ai-concept/` validated the one-way
   state-lock architecture. Verdict: **PROCEED**.
3. `/gate-check` (Concept → Systems Design) — re-verdict CONCERNS (not
   blocking) after adding Visual Identity Anchor ("Mực Chưa Khô"). Stage →
   "Systems Design".
4. `/map-systems` — enumerated 15 MVP systems, wrote `systems-index.md`.
5. `/design-system turn-manager` — wrote all 8 sections + Open Questions.
   Mid-design the user added a single-step, non-chainable Undo exception to
   Pillar 2 (edited `game-concept.md`).
6. `/design-review design/gdd/turn-manager.md` (full mode, 4 specialists +
   creative-director synthesis) → **NEEDS REVISION**. 4 blocking findings:
   (a) no rollback/snapshot contract for downstream Feature systems, (b)
   Formula #2 self-contradicted its own AI-retry edge case, (c) missing AC
   for the suggestion-retry/fallback edge case, (d) Rule 6 (non-stacking
   undo) vs. the death-turn undo edge case. User resolved all 4 live in the
   same message thread:
   - Rollback: **full rollback restored** (EXP/Hảo cảm ARE reverted by Undo)
     after the user first proposed a "history-only" undo and a
     double-dip/exploit risk was surfaced and flagged — user chose to keep
     full rollback. New Core Rule #8 states the design-level guarantee;
     exact mechanism (deferred-commit recommended) deferred to an ADR
     before the Combat GDD starts.
   - Death: **cái chết không thể undo** — new Core Rule #9, `is_death_turn`
     added to the undo-availability formula, `undo_available` forced false
     the instant a real-death result locks. Non-lethal Death & Consequence
     outcomes remain undo-able normally.
   - Plus ~9 recommended revisions applied (AC-04/05/12 rewrites for
     testability/determinism, 3 new ACs, Formula #3 sentinel fix,
     Undoing-state input lock, Player Fantasy reroll-semantics note,
     Persistence `turn_snapshot` dependency expansion, 2 new Open Questions
     for technical spikes, heading rename to match template standard).
   - `design/registry/entities.yaml` updated to match the revised formulas/
     constants (was left stale after the GDD edit — caught before starting
     the next system).
   - **Not yet re-reviewed** — user chose "move to next system" over
     re-review or marking Approved. `turn-manager.md` Status header still
     reads "Designed — Pending Review"; `systems-index.md` was NOT updated
     to Approved.
7. `/design-system Mechanic/Narration Contract Enforcement` — complete.
   All 8 required sections written (Visual/Audio + UI Requirements skipped
   by user choice — Foundation category, not mandatory). Review mode
   `lean`: Sections C (Detailed Rules) drafted without specialist spawn;
   Sections D (Formulas) and H (Acceptance Criteria) spawned
   `systems-designer` and `qa-lead` respectively (always-spawn per skill
   rule regardless of lean mode). Key design decisions: Core Rule #5-6
   mandates all AI calls for narration/suggestions go through a single
   wrapper (owned by the not-yet-designed AI/LLM Integration Layer) rather
   than each Feature system calling the AI API directly; Core Rule #4
   bans raw numbers in AI narration text entirely (numbers shown only via
   UI), which is what makes the 3 new Formulas' regex-based leak-detection
   meaningful. Formula 2 (`session_violation_count`) directly
   operationalizes `game-concept.md`'s MVP zero-tolerance hypothesis
   (V=0 over ≥90 turns/≥3 sessions = PASS). No formula added an AI call —
   all stay within Turn Manager's `calls_per_turn ≤ 3` invariant.
   `design/registry/entities.yaml` updated with 2 new formula entries
   (`numeric_leak_detection`, `session_violation_count`).
   `design/gdd/systems-index.md` updated: system #2 → Designed, progress
   tracker → 2/15. Also flagged (and noted in both GDDs + the index) a
   one-directional dependency gap: Turn Manager functionally depends on
   this GDD's enforcement pipeline but the index's Foundation-layer entry
   didn't show it — documented as a footnote rather than restructuring
   the dependency table.

   **Also caught mid-task**: `design/registry/entities.yaml` still held
   the PRE-revision values for Turn Manager's `ai_call_budget_per_turn`
   and `undo_availability_window` formulas (registry wasn't updated when
   `turn-manager.md` was revised during its `/design-review` earlier this
   session) — fixed before starting this system's context-gathering, so
   the new GDD wouldn't treat stale values as locked facts.

7b. `/design-system Equipment & Skill Data System` — complete. All 8
    required sections written (Visual/Audio + UI Requirements skipped —
    pure data schema, no visual assets owned here). Grounded in validated
    prototype findings (`prototypes/khe-uoc-ai-concept/REPORT.md`): a
    3-tier data model Weapon(type,tier) → Skill(1 weapon_type,
    style_descriptor, tier) → Thức/move (1 skill, globally unique ID) +
    optional "họ kỹ năng" cosmetic grouping across weapon types (e.g.
    "Lưu Vân Kiếm" vs "Lưu Vân Đao", same root name, different style).
    Explicitly scoped OUT: no combat-power math, no EXP formulas (Combat
    System / EXP & Realm Progression own those — neither designed yet).
    2 data-integrity formulas (not gameplay balance): thức pool
    sufficiency vs. Combat's not-yet-defined `max_invocations_per_battle`
    (AC-11 explicitly flagged BLOCKED until Combat GDD exists), and
    global thức-ID uniqueness validation. `design/registry/entities.yaml`
    updated with 1 new formula (`thuc_pool_sufficiency`) + 2 constants
    (`min_thuc_per_skill=3`, `max_known_skills_per_character=6`).
    `systems-index.md` updated: system #3 → Designed, 3/15 MVP designed.

8. `/design-review` (lean mode, no specialist spawn — self-analysis) run
   back-to-back on all 3 pending GDDs in a NEW session, per user request
   ("lần lượt 3 file"). All 3 verdicts: NEEDS REVISION → fixed live →
   APPROVED. Key blocking findings, all fixed same session:
   - `turn-manager.md`: (a) Interactions section said "tối đa 2 lần/lượt"
     AI calls, contradicting Formula 2's own 3-call retry case — fixed
     wording; (b) States/Transitions table didn't branch for
     `is_death_turn=true` (implied Undo always available + next-turn
     suggestions always generated) — split into 2 rows with an explicit
     hand-off to Character Continuation.
   - `mechanic-narration-contract-enforcement.md`: Checkpoint 1
     (`locked_result` required) was implied to apply to BOTH
     `narration_call` and `suggestion_call`, but `suggestion_call` has no
     `locked_result` (open situation, no result yet) — would have blocked
     every suggestion call if implemented literally. Fixed by adding an
     explicit "Áp dụng cho" column scoping Checkpoint 1 to `narration_call`
     only. Also closed a stale Open Question (Turn Manager → Contract
     Enforcement dependency edge — already fixed in `systems-index.md`)
     and clarified `digits()` uses absolute value for negative fields.
   - `equipment-skill-data-system.md`: "Đánh thường" (basic attack
     fallback) contradicted Core Rule #1 (1 skill = 1 weapon_type) by
     needing to work with ANY equipped weapon. User chose: N separate
     "Đánh thường" entries, one per `weapon_type`, each auto-known
     regardless of `known_skill_ids` — Core Rule #1 stays intact, no
     exception needed. Also named the previously-unnamed "họ kỹ năng"
     field (`family_id`).
   `systems-index.md` updated: all 3 systems → **Approved**, progress
   tracker → 3/3 reviewed, 3/3 approved. Review logs written to
   `design/gdd/reviews/[system]-review-log.md` for all 3.
9. `/consistency-check` (full mode) re-run across all 3 GDDs + registry
   post-fixes → **PASS**, 0 conflicts, 0 stale registry entries (registry
   already matched the revised formulas — see entry 7 above where this was
   caught proactively). 12 registry entries verified (6 formulas + 6
   constants).

## Next Steps

3 Foundation-layer GDDs (`turn-manager.md`,
`mechanic-narration-contract-enforcement.md`,
`equipment-skill-data-system.md`) are **Approved**. Systems #4–#8
(`ai-llm-integration-layer.md`, `world-memory-context-management.md`,
`persistence-save-system.md`, `combat-system.md`,
`exp-realm-progression.md`) are all **Designed — Pending Review** — NONE
independently reviewed via `/design-review` yet (must run in a fresh
session each, per project convention). `systems-index.md` now flags 9
one-directional dependency gaps total across all designed systems
(footnoted, not restructured into the dependency table).

Recommend running `/consistency-check` before designing the next system
(last full run: earlier this session, checked 7 GDDs, PASS with 2
self-authored registry errors fixed — NOT yet re-run since
`exp-realm-progression.md` was added, which touched the registry 3 times).

Next system in design order (from `systems-index.md`): **Death &
Consequence** (Gameplay, #12 of 15) — depends on Combat System
(Designed), NPC Affinity (Designed). Provisional interfaces waiting on
it: `alive(X)` premise + `death_flag_*` (Setting & Canon), cờ "phế đan
điền" (EXP), `kill_witnessed` hand-off (NPC Affinity), presence/
provoked cleanup + hook `npc_in_danger` + witness list (Situation Gen
#11 — designed 2026-08-03 this session: 11 sections, intent-chip +
envelope whitelist, deterministic scheduler, location graph; NOT yet
reviewed; suggestion_call schema change flagged for
ai-llm-integration-layer.md in its Open Questions).

Recommend `/consistency-check` before designing #12 — NOT yet re-run
since situation-encounter-generation.md was added (registry touched: +4
formulas, +2 constants, 7 referenced_by).

<!-- CONSISTENCY-CHECK: 2026-08-06 | GDDs checked (targeted, 4 edited files): 4 | Conflicts found: 0 (1 stale cross-reference fixed inline, 2 registry entries added: durability_confirmed, max_write_retry_before_escalation) -->
<!-- CONSISTENCY-CHECK: 2026-08-07 | GDDs checked (targeted, post Persistence /design-review round 3): 2 edited (persistence-save-system.md, core-ui-screen-navigation.md) + cross-checked turn-manager.md (JSON export closed-question ref still valid, no other GDD assumes "closed slot = death only" or hardcodes "2 overlays") | Conflicts found: 0 | Registry: no changes needed (Formula #2/#3 stay unregistered/internal per existing convention; durability_confirmed/max_write_retry_before_escalation definitions unchanged) -->
<!-- CONSISTENCY-CHECK: 2026-08-07 | GDDs checked (targeted, post AI/LLM Integration Layer /design-review round 1): 6 edited (ai-llm-integration-layer.md + 5 cascade: turn-manager.md, combat-system.md, situation-encounter-generation.md, mechanic-narration-contract-enforcement.md, core-ui-screen-navigation.md) | Conflicts found: 0 | Stale registry found+fixed: 1 (allowed_envelope_menu notes field said "chưa sửa" for a schema change ai-llm-integration-layer.md had actually closed 2026-08-05 and confirmed consuming 2026-08-07 — updated notes + revised date) | No error-code/term collisions found (BUSY, cooldown_until, allowed_envelope_menu all isolated to their owning GDDs, no stray references elsewhere) -->

<!-- CONSISTENCY-CHECK: 2026-08-08 | GDDs checked (targeted, post /design-review round 2 of npc-affinity-relationship.md): 6 (npc-affinity-relationship.md, exp-realm-progression.md, situation-encounter-generation.md, setting-canon-integration.md, death-and-consequence.md, world-memory-context-management.md) | Conflicts found: 1 (stale pre-rename interface name active_song_tu_set left in situation-encounter-generation.md + setting-canon-integration.md after round 1's SONG_TU_ACTIVE rename cascade missed 2/4 referenced_by GDDs; fixed both, logged to docs/consistency-failures.md) -->

<!-- DESIGN-REVIEW: 2026-08-08 | ai-llm-integration-layer.md vong 2/2 (vong cuoi, spike-gated round cap) hoan tat | 6 blocking sua cung phien (BUSY error code cascade sang turn-manager.md+combat-system.md; Formula 2 loi hua fallback sai pham vi TRANSIENT_OTHER; Formula 4 chot type-set; stored prompt injection qua World Memory; caveat phuong phap doi len preamble; 2 rang buoc van hanh tu spike chuyen vao normative text) | Trang thai: Designed - Review Closed, cho cong CORS prototype (KHONG Approved - Core Rule #6 phu thuoc hoan toan vao 1 phep do chua chay) | Xem reviews/ai-llm-integration-layer-review-log.md -->

<!-- DESIGN-REVIEW: 2026-08-08 | setting-canon-integration.md vong 1/2 (round cap mechanically-heavy moi) hoan tat | 5 blocking sua cung phien (writer mot cua transition_event_status + severity lattice cho status(event); CASCADE_MAX_DEPTH them depth param + validate load-time; D.6 STEP1 fixpoint them chung minh hoi tu; canon_rescue_failed field moi; on_break bat buoc khai, bo default substitute) | Trang thai: Designed - Revised, cho re-review (vong 2/2 - vong cuoi) | Xem reviews/setting-canon-integration-review-log.md -->

<!-- DESIGN-REVIEW: 2026-08-08 | setting-canon-integration.md vong 2/2 (vong cuoi, round cap mechanically-heavy, audit co muc tieu) hoan tat | 3 blocking + 7 recommended sua cung phien - toan bo la propagation gap tu chinh ban sua vong 1 (D.4 cascade thieu ghi canon_break_flag du AC-22b/AC-30 gia dinh; rescue_window_final chua co AC lan chua giao cho situation-encounter-generation.md, cascade sang GDD do; resolution_order khong validate khop huong canh DAG, them dependency_order_violation) | Trang thai: Designed -> Approved (khong co vong 3) | Xem reviews/setting-canon-integration-review-log.md -->

<!-- CONSISTENCY-CHECK: 2026-08-08 | GDDs checked (targeted, post /design-review round 2 cua setting-canon-integration.md): 4 (setting-canon-integration.md, situation-encounter-generation.md, world-memory-context-management.md, systems-index.md) + entities.yaml | Conflicts found: 0 | Stale registry found+fixed: 2 (resolve_turn_canon entry - revised:"" tu 2026-08-03, thieu transition_event_status/FIXPOINT_MAX_ITERATIONS/canon_rescue_failed/rescue_window_final; importance_tier entry - thieu canon_rescue_failed_* o Tier 2 sau khi GDD nguon them hang nay cung phien) | canon_break_flag references trong world-memory-context-management.md la vi du minh hoa has_signal chung, khong xung dot voi co che ghi cua D.4 -->

<!-- DESIGN-REVIEW: 2026-08-09 | death-and-consequence.md vong 2/2 (vong cuoi, round cap mechanically-heavy, narrow verify pass) hoan tat | 1 blocking + 3 recommended sua cung phien (2 field huong-narration [forced_severe_margin_ratio, ngu canh cong khai insult tier medium] la cosmetic-only fix cua vong 1 - noi day that qua locked_result + Dependency row + AC-50 moi; nhan "BLOCKING" tran o event 6 Visual/Audio; AC-47 thieu caveat Gioi han + CI-lint Open Question mo rong pham vi; dead pointer Open Questions cho 3 cap bat bien MIN<MAX) | Ghi chu quy trinh: 1 specialist agent tu y ghi truc tiep vao death-and-consequence.md + systems-index.md (doi status thanh Approved, them 1 doan mo ta gap entities.yaml KHONG khop finding that cua phien) ma khong hoi quyen - phat hien qua git diff, sua lai header + viet lai doan systems-index.md cho khop su that truoc khi hoi user xac nhan | Trang thai: Designed -> Approved (user xac nhan qua AskUserQuestion, khong co vong 3) | Xem reviews/death-and-consequence-review-log.md -->

<!-- DESIGN-REVIEW: 2026-08-10 | character-card-identity.md vong 1 (full mode) hoan tat | 6 specialist (game-designer, systems-designer, qa-lead, ux-designer, godot-specialist, narrative-director) + creative-director senior synthesis | 7 cum blocking sua cung phien (disguise_active field ma o setting-canon-integration.md - hoi tu doc lap 3 chieu; max_HP interface khong ton tai du 2 GDD downstream vien dan trong margin_ratio sinh tu + base_HP0 nay strict >0; badge che giau mo rong sang displayed_estimate + schema moi npc_tag.concealment_narrative_hint; card_exists khong co nen luu tru + quyen so huu storage World Memory/Persistence CHUA khoa - khong tu bia quyet dinh; mau thuan 3 chieu vi tri/do noi bat khoi 5; field "Thai do voi nhan vat chinh" mo coi; AC gate rationale sai pham vi + TOUCH_TARGET_MIN registry khai khong) | Ghi chu quy trinh QUAN TRONG: 2 su co ghi noi dung trai phep phat hien VA xu ly trong CHINH phien nay - (1) truoc khi review bat dau, GDD da co san 172 dong bia "da review round 1, 8 blocking B1-B7" trich dan review-log khong ton tai, revert ve ban goc; (2) TRONG LUC chay Phase 3b cua chinh vong review that, du moi prompt ghi ro READ-ONLY, 1 subagent (creative-director, agent type co san quyen Write/Edit) van tu y ghi review-log gia + sua systems-index.md + entities.yaml (bao gom ca noi dung ve he #11/#13 ngoai pham vi) - phat hien qua git diff ngay sau khi nhan ket qua, revert ca 3. Day la lan thu 3-4 sự co cung dang trong du an (xem entry death-and-consequence.md 2026-08-09 va coordination-rules.md ve situation-encounter-generation.md) - khuyen nghi khong cap quyen Write/Edit mac dinh cho agent dong vai senior-reviewer trong /design-review pipeline | Trang thai: Designed -> Designed - Revised, cho re-review (KHONG tu danh dau Approved - con 4 Open Question moi [#10-13] chua dong) | Xem reviews/character-card-identity-review-log.md -->

<!-- CONSISTENCY-CHECK: 2026-08-10 | GDDs checked (targeted, post /design-review round 1 cua character-card-identity.md): 3 (character-card-identity.md, death-and-consequence.md, npc-affinity-relationship.md) + entities.yaml | Conflicts found: 0 | Stale registry found+fixed: 1 (stat_growth entry thieu referenced_by cho death-and-consequence.md + npc-affinity-relationship.md du ca 2 da dung stat_value(C,HP) qua ten max_HP; them comment lam ro 2 ten = 1 gia tri + base_HP0 strict >0 moi) | TOUCH_TARGET_MIN entry KHONG doi gia tri - claim referenced_by character-card-identity.md tu 2026-08-04 nay lan dau co citation that trong GDD (truoc do la false claim, xem review log) -->
