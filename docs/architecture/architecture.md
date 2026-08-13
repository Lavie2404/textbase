# Vô Danh Lục — Master Architecture

## Document Status

- Version: 1.1 — **Phases 0–7b complete for the original 15 GDDs** (ownership/data-flow/API
  boundaries drafted, ADR audit + Missing ADR List done, TD self-review complete);
  **hệ #16 (Character Customization Mode) folded in 2026-08-13** via `/architecture-review`
  Phase 6 (this system was Approved 2026-08-13, one day after this doc's Phase 0-7b
  session closed, and was missing from Phases 1/2/4/Baseline until this update — its
  cross-system interface points were already correctly amended into ADR-0002/0004/
  0005/0007 via `/propagate-design-change`, 2026-08-13; this update only closes the
  gap in THIS document's own system map).
- Last Updated: 2026-08-13
- Engine: Godot 4.6 (Web/Mobile Web export, nothreads variant, GDScript)
- GDDs Covered: 16 system GDDs + `game-concept.md`, all Approved (2 additionally Implemented: Combat / ADR-0001; Persistence has ADR-0002 Accepted)
- ADRs Referenced: all 7 (ADR-0001 through ADR-0007, all Accepted)
- Technical Director Sign-Off: 2026-08-12 — **APPROVED WITH CONCERNS** (see Phase
  7b below: 4 blocking ADRs still unwritten, incl. one Foundation-layer gap; no
  internal contradictions or unaddressed HIGH-risk domains found) — **status
  unchanged by the 2026-08-13 hệ #16 addition**; see
  `docs/architecture/architecture-review-2026-08-13.md` for that review's own
  separate CONCERNS verdict (2 blocking engine-correctness findings in ADR-0002 D1b,
  now patched).
- Lead Programmer Feasibility: **SKIPPED — Lean mode** (not a PHASE-GATE in lean
  review mode per skill rule)
- Review mode this session: **lean** (from `production/review-mode.txt`)

> This document is being authored incrementally per `/create-architecture`. Phase 0
> (engine knowledge gaps + Technical Requirements Baseline, extracted via 6 parallel
> research passes) is complete and recorded below. Phases 1-8 (layer map, module
> ownership, data flow, API boundaries, ADR audit, required-ADR list, principles,
> sign-off, handoff) are drafted section-by-section with user approval as the
> session continues — see the bottom of this document for progress.

---

## Engine Knowledge Gap Summary

**Engine: Godot 4.6** (release Jan 2026, project pinned 2026-02-12). **LLM knowledge
cutoff: ~May 2025 (~Godot 4.3)**. Post-cutoff versions in scope: **4.4 (MEDIUM)**,
**4.5 (HIGH)**, **4.6 (HIGH)**.

### HIGH RISK Domains

- **Web Export (IndexedDB/JavaScriptBridge/HTTPRequest)** — `modules/web-export.md`,
  entirely post-cutoff by construction. Load-bearing verified facts: `cancel_request()`
  does NOT abort browser fetch traffic on Web; `FileAccess.store_*()` durability is
  unobservable from GDScript on Web (`force_fs_sync()` only raises a dirty flag);
  `HTTPClientWeb.get_response_body_length()` always returns `-1`; single-threaded Web
  export (`thread_support=false`) is the 4.6 default and must stay off.
- **UI — Dual-Focus System (4.6)** — mouse/touch focus is now separate from
  keyboard/gamepad focus; `grab_focus()` only affects keyboard/gamepad focus, not
  mouse/touch. Directly affects every screen in this touch+mouse Control-node UI game.
- **Core/Scripting — GDScript 4.5+ language features** — variadic args, `@abstract`
  (already used in ADR-0002's `StorageBackend` interface) are new language features
  not in training data.

### MEDIUM RISK Domains

- **`FileAccess.store_*()` return-type change (4.4)** — now returns `bool` (was `void`).
- **`Resources.duplicate_deep()` (4.5)** — new explicit deep-duplication method.
- **Networking (HTTPRequest specifics)** — generic module doc is thin; real risk lives
  in `web-export.md` (HIGH), not this module.

### LOW RISK Domains

- **Core/Scripting** (static typing, `int/int` division, `RandomNumberGenerator`) —
  ADR-0001 rates this LOW, foundational semantics unchanged 4.4–4.6.
- **Physics, Navigation** — not used (no real-time combat, no pathfinding gameplay).
- **Animation** — minimal scope; only 4.5/4.6 changes are 3D-skeleton features unused here.
- **Audio** — `modules/audio.md`: "no major breaking changes 4.4–4.6."
- **Multiplayer/Networking (RPC etc.)** — not used, no multiplayer beyond the external AI/LLM REST call.
- **Rendering** — text-heavy UI game, no custom rendering/shader pipeline in scope.

### Systems from this game that touch HIGH/MEDIUM risk domains

- **UI** (all Presentation-layer systems: Character Card & Identity, Core UI/Screen
  Navigation) — touches the 4.6 dual-focus system; every focusable element needs
  separate mouse-hover vs. keyboard/gamepad focus testing. Also touches 4.5
  `FoldableContainer` (Character Card's collapsible sections) and `RichTextLabel` meta
  tags (4.4+, tap-name-to-card entry point).
- **Persistence / Web Export** (Persistence/Save System) — the single densest
  HIGH-risk surface; every save/load, turn-confirm, and undo path touches it. Fully
  governed by ADR-0002 + `web-export.md` Group B (Q5–Q9).
- **AI/LLM Integration Layer** — touches `web-export.md` Group A (Q1–Q4): CORS
  (not COOP/COEP) gates the cross-origin call; `timeout` safely re-settable per
  attempt; `cancel_request()` doesn't stop billed traffic; SceneTree must not pause
  during an in-flight call.
- **Core/Scripting** (every mechanics system — Combat implemented, EXP/Affinity/
  Canon/Situation/Death&Consequence/Continuation to be built) — GDScript 4.5+
  `@abstract`, `int/int` truncation gotcha (load-bearing for every formula).
- **Persistence/Web-Export bridge quirks** — any code building JS arrays/objects
  from GDScript is exposed to the `JavaScriptObject` int-indexing rejection.

### Already-Verified Patterns (settled — do not re-flag as open risk)

- **JavaScriptBridge glue pattern**: `get_interface()`/`create_object()`/
  `create_callback()` only, never `eval()`.
- **`JavaScriptObject` int-indexing gotcha**: GDScript 4.6 static type-checker
  rejects `int` index on `JavaScriptObject` at PARSE time ("Only String or
  StringName can be used as index") — whole-script load failure, looks like a hang.
  Fix: `arr[str(i)] = value`.
- **`PackedByteArray`-must-be-String/base64 contract**: raw `PackedByteArray` across
  the bridge arrives as JS `undefined`, fails silently (IDB `put()` "succeeds," reads
  back `null`). `get_blob()` returns `{status, bytes: String}` — JSON directly for
  structured data, `Marshalls.raw_to_base64()` for genuinely binary blobs.
- **Web Locks `Promise.resolve.bind` pattern**: naive callback-returns-Promise fails
  (Callable return values don't cross the bridge). Working: construct pending Promise
  from GDScript, stash `resolve`, pass `Promise.resolve.bind(Promise, pendingPromise)`
  as the lock callback.
- **IDBFS mtime granularity**: millisecond-resolution, same-millisecond collision
  unreachable via normal Godot sync cadence (≥1 frame between writes).
- **`RandomNumberGenerator`-injection pattern**: single instance, injected as last
  param of every RNG-consuming function, never a global singleton (ADR-0001).
- **`int/int` truncating division gotcha**: GDScript truncates toward zero by
  default; always `float(a) / b` explicit cast in gameplay formulas (ADR-0001 — this
  exact bug class caused two real defects in Combat's formulas before the fix).

### Forbidden Patterns (registered, active)

- `JavaScriptBridge.eval()` — banned project-wide.
- Bare `int/int` division in gameplay formulas — banned, must `float()` cast.
- Static-function hidden state for testable gameplay mechanics — banned, use DI/pure functions.
- `FileAccess`/`user://` as a durability gate — banned, only IndexedDB `oncomplete` counts.

---

## Technical Requirements Baseline

**Extracted from 16 system GDDs + game-concept.md | ~320 total requirements**
(exact per-system counts below; ID format `TR-[gdd-slug]-[NNN]`; hệ #16's 24 TRs
added 2026-08-13 via `/architecture-review`, `ccm` slug — see subsection 16 below)

> Full requirement tables, module ownership summaries, key architectural decisions,
> and open questions per system are preserved in this section — they feed Phase 1
> (layer map), Phase 2 (ownership map), Phase 5 (ADR audit/traceability), and Phase 6
> (required-ADR list) later in this session.

### FOUNDATION LAYER

#### 1. Turn Manager / Core Game Loop (26 TRs)

| Req ID | Requirement | Domain |
|---|---|---|
| TR-turn-manager-001 | State machine: `Awaiting Action`, `Resolving`, `Turn Confirmed(is_death_turn)`, `Undoing` | Core |
| TR-turn-manager-002 | Turn record `{turn_id, action, locked_result, narration_text, world_time}` written to World Memory on confirm, deleted on undo | Data |
| TR-turn-manager-003 | `world_time: int`, monotonic; `world_time' = world_time + confirmed×(1−undone)` | Data |
| TR-turn-manager-004 | `undo_available` = `(turn_id==last_confirmed_turn_id) AND no_newer_confirmed AND has_confirmed_turn AND NOT is_death_turn` | Core |
| TR-turn-manager-005 | `calls_per_turn` = 3 independent type-booleans, not an instance counter; hard invariant ≤3 | Core |
| TR-turn-manager-006 | Transient `locked_result` pending cache during failed narration_call, released on retry-success/new-action/leave | Data |
| TR-turn-manager-007 | `turn_snapshot` blob for Undo rollback — schema/ownership open (ADR owed) | Persistence |
| TR-turn-manager-008 | Persistence reads/writes TM state: `state`, `last_confirmed_turn_id`, `undo_available`, `turn_snapshot` | Persistence |
| TR-turn-manager-009 | Suggestion shape `{text, envelope}` × 4/turn | Data |
| TR-turn-manager-010 | Fixed fallback suggestion set (literal 3 entries) when AI retry fails | Data |
| TR-turn-manager-011 | Async call to `request_ai()`, per-call timeout `ai_call_timeout_seconds` (30, 10-60) | Timing/Async |
| TR-turn-manager-012 | Input locked (reject 2nd submission) during Resolving/Undoing | Core |
| TR-turn-manager-013 | Persistence write is a GATE (not side-effect) on Resolving→Confirmed / Undoing→Awaiting, condition = `durability_confirmed=true` | Persistence |
| TR-turn-manager-014 | Write-only retry path distinct from full Resolving re-run | Persistence |
| TR-turn-manager-015 | RNG source injectable/mockable/seedable for deterministic tests | Testing |
| TR-turn-manager-016 | Direct call TM → Feature systems to compute+lock result | Core |
| TR-turn-manager-017 | TM → AI/LLM Layer via `request_ai()`, max 3 calls/turn | Core |
| TR-turn-manager-018 | TM → World Memory: write on confirm, delete on undo, direct history read | Data |
| TR-turn-manager-019 | Death & Consequence: `pending_fate=true` overwrites 2/4 suggestion slots, bypasses AI, no `calls_per_turn` change | Core |
| TR-turn-manager-020 | Character Continuation handoff: `is_death_turn=true` hands off; `handoff_allowed=1` returns control at new `slot_id` | Core |
| TR-turn-manager-021 | `request_ai` `error_code=BUSY` handled as network failure for player, distinct log label | Testing |
| TR-turn-manager-022 | Reload mid-Resolving → revert to Awaiting Action; reload during Confirmed → restore exact state | Persistence |
| TR-turn-manager-023 | Data-driven knobs: `suggested_action_count`(4,2-6), `undo_depth`(1,0-1), `ai_call_timeout_seconds`(30,10-60) | Data |
| TR-turn-manager-024 | `calls_per_turn≤3` is a hard invariant, NOT a tuning knob | Core |
| TR-turn-manager-025 | `HTTPRequest` on Godot 4.6 Web export (COOP/COEP) unverified pre-spike | Networking |
| TR-turn-manager-026 | Undeclared edges (real, not in Systems Enumeration table): TM→Contract Enforcement, TM→AI/LLM Layer, TM→World Memory, TM→Persistence | Core |

**Ownership**: Owns turn state machine, `world_time`, `turn_id`, `last_confirmed_turn_id`, `undo_available`, `calls_per_turn`, transient `locked_result` cache, `turn_snapshot` (schema open). Exposes `turn_id`/`locked_result`/`world_time`/`undo_available`/`is_death_turn`. Consumes: `locked_result` from Feature systems, narration/suggestions from AI/LLM Layer, `durability_confirmed` from Persistence (hard gate), history from World Memory, `handoff_allowed`/`slot_id` from Character Continuation.

**Key decisions mandated**: Undo rollback mechanism explicitly unresolved (ADR owed). Durability-gated transitions (write success is a hard gate, not fire-and-forget). Two opposite RNG behaviors on similar-looking paths (undo-reconfirm rerolls; AI-retry-resubmit replays byte-for-byte) — flagged in-GDD as bug-prone. Call counting is type-based not instance-based.

**Open**: rollback mechanism (deferred-commit vs inverse-ops) ADR; `turn_snapshot` schema/ownership ADR; transaction boundary between downstream lock and TM write (crash risk); `HTTPRequest` Web threading spike.

---

#### 2. Mechanic/Narration Contract Enforcement (18 TRs)

| Req ID | Requirement | Domain |
|---|---|---|
| TR-mnce-001 | `locked_result: dict`, 0-n numeric fields | Data |
| TR-mnce-002 | `narration_text: string` verbatim from AI | Data |
| TR-mnce-003 | Single mandatory shared wrapper for EVERY `narration_call`/`suggestion_call` — no Feature system calls AI directly | Core |
| TR-mnce-004 | Wrapper (not caller) owns prompt construction | Core |
| TR-mnce-005 | 5-stage checkpoint pipeline at every AI call site | Core |
| TR-mnce-006 | Numeric Leak Detection: `leak_matches`/`leak_count`/`leak_flag` via regex `\d+(\.\d+)?` vs `digits(abs(f.value))` | Data/Testing |
| TR-mnce-007 | Generic backstop regex for `n=0` case (`rp_only` turns) | Data/Testing |
| TR-mnce-008 | Session counters `V`/`T`, `violation_rate=V/T`, `N/A` at `T=0` | Data |
| TR-mnce-009 | Per-field diagnostic aggregation `leak_count_field(f)` | Data |
| TR-mnce-010 | All 3 formulas run post-hoc, zero extra AI calls | Timing/Async |
| TR-mnce-011 | CI grep enforcing 100% AI-call-sites route through wrapper | Testing |
| TR-mnce-012 | Lint forbidding parsing `narration_text` outside whitelist | Testing |
| TR-mnce-013 | CI check: no enforcement-bypass flag anywhere, incl. dev builds | Testing |
| TR-mnce-014 | World Memory persists only `locked_result`+`narration_text` verbatim | Persistence |
| TR-mnce-015 | `leak_flag` log retained incl. undone turns; excluded from `T`/`V` math | Persistence/Testing |
| TR-mnce-016 | MVP gate: PASS iff `V=0` across `T≥90` turns / ≥3 sessions — absolute zero-tolerance | Testing |
| TR-mnce-017 | Multi-Feature-system-in-one-turn: all `locked_result` fields merge into ONE prompt/ONE call | Core |
| TR-mnce-018 | `leak_detection_enabled` toggles only Formula 1-3, not the pipeline itself | Data |

**Ownership**: No runtime state machine — owns the enforcement pipeline contract + QA telemetry. Exposes the wrapper-interface requirement to AI/LLM Layer + leak diagnostics. Consumes `locked_result` (from triggering Feature system), `narration_text` (AI/LLM Layer), undo status (TM).

**Key decisions**: One-way contract is load-bearing (compute+lock BEFORE AI; AI has zero outcome authority; AI text never parsed back into world state, permanent law). Enforcement via mandatory code-level wrapper, NOT prompt engineering alone. No bypass anywhere, incl. dev/prototype builds. `suggestion_call` excluded from the lock-gate/leak formulas but still routes through the shared wrapper.

**Open**: wrapper's exact interface/host module deferred to AI/LLM Layer GDD. Semantic-mismatch violations (AI narrates opposite outcome, no digit leaked) — 100% manual QA today, **escalated priority** since prompt injection via free-text action input turns this into a repeatable exploit vector, not just drift. Undeclared same-tier edge: TM→Contract Enforcement.

---

#### 3. Equipment & Skill Data System (22 TRs)

| Req ID | Requirement | Domain |
|---|---|---|
| TR-esds-001 | 3-tier: Weapon(type)→N Skill→N Thức; each Thức belongs to 1 Skill; each Skill to 1 weapon_type; min 1 Thức/Skill | Data |
| TR-esds-002 | Optional cosmetic `family_id` grouping across weapon types, own `style_descriptor` each | Data |
| TR-esds-003 | `thuc_id` globally unique (not per-skill) — required by Combat's "no repeat Thức/battle" rule | Data |
| TR-esds-004 | `style_descriptor`: text fed to AI narration, NOT a `locked_result` numeric | Data |
| TR-esds-005 | `tier: int` on Weapon+Skill, reconciliation with 10-tier Cảnh giới scale open | Data |
| TR-esds-006 | Ownership keyed by `char_id`: 1 `equipped_weapon_id` + `known_skill_ids` list | Data/Persistence |
| TR-esds-007 | No full inventory in MVP — 1 equipped weapon/character | Core |
| TR-esds-008 | Static template only, no runtime HP/EXP state | Data |
| TR-esds-009 | Recovery Item catalog `{item_id, efficacy:[0,1]}`, no engine default | Data |
| TR-esds-010 | Referential integrity: no orphan Thức, no invalid weapon_type | Data |
| TR-esds-011 | `is_pool_sufficient` — authoring-time warning, non-blocking | Testing |
| TR-esds-012 | `is_valid_dataset` — CI hard gate, blocks commit | Testing |
| TR-esds-013 | Implicit "Đánh thường" — 1 distinct entry PER weapon_type, auto-known, not in `known_skill_ids` | Core/Data |
| TR-esds-014 | Display names need not be globally unique (only `thuc_id`) | Data |
| TR-esds-015 | Tier mismatch between weapon/skill is a VALID data-layer state (Combat penalizes) | Core |
| TR-esds-016 | `char_id`-keyed storage supports lazy-init for a NEW char_id (Character Continuation) | Persistence |
| TR-esds-017 | Persistence must serialize `equipped_weapon_id`+`known_skill_ids` — undeclared hard dep (this GDD doesn't list Persistence) | Persistence |
| TR-esds-018 | Combat reads `weapon.tier`/`skill.tier`/`style_descriptor`/Thức list/`is_pool_sufficient` | Core |
| TR-esds-019 | Character Card reads `equipped_weapon_id`+`known_skill_ids` for display | UI |
| TR-esds-020 | Knobs: `min_thuc_per_skill`(3,1-10), `max_known_skills_per_character`(6,3-12) | Data |
| TR-esds-021 | No calc/balance logic owned here (Combat owns it) | Core |
| TR-esds-022 | `max_known_skills_per_character` upper bound implies UI list-render + AI context-selection constraint | UI |

**Ownership**: Owns weapon/skill/thức schema+data, per-`char_id` ownership records, Recovery Item catalog. Exposes to Combat (tier/style/thức list), Character Card (equipped/known display). Foundation, zero declared upstream — but undeclared downstream (Persistence needs its blob).

**Key decisions**: Pure data layer, no logic. Ownership keyed by `char_id` not singleton slot (Character Continuation support). `efficacy` has no default — required field. CI gate blocks commit on invalid dataset. "Đánh thường" solved via N per-weapon_type entries, not a Core Rule #1 exception.

**Open**: MVP `weapon_type` list not finalized. `tier` scale not reconciled with EXP's Cảnh giới. Undeclared Persistence dependency. AC-18's char_id lazy-init contract flagged provisional.

---

### CORE LAYER

#### 4. AI/LLM Integration Layer (25 TRs) — **No ADR exists yet, Required New ADR**

| Req ID | Requirement | Domain |
|---|---|---|
| TR-aill-001 | Single call-site invariant: only this layer invokes HTTPRequest to AI endpoint allowlist; CI static grep | Core |
| TR-aill-002 | One wrapper `request_ai(call_type, payload)` for narration+suggestion calls | Core |
| TR-aill-003 | `narration_call` validates `locked_result` present before ANY HTTP request | Data |
| TR-aill-004 | `suggestion_call` requires `response_mime_type:application/json` + schema for 4×`{text,envelope}` | Data/Networking |
| TR-aill-005 | `HTTPRequest`/`Timer`: `use_threads=false`, `process_mode=PROCESS_MODE_ALWAYS`; CI check | Engine |
| TR-aill-006 | `timeout` property set immediately before each `.request()` | Engine |
| TR-aill-007 | Network-retry state machine Idle→Requesting→{Success,Retrying-Network,Failed}; Retrying-Network invisible to caller, no extra `calls_per_turn` | Timing/Async |
| TR-aill-008 | Backoff: OVERLOADED=`overload_retry_wait_seconds`; TRANSIENT_OTHER=`transient_retry_base_seconds×(attempt+1)` | Timing/Async |
| TR-aill-009 | Global budget: `t_elapsed(n)≤ai_call_timeout_seconds`(30s); per-request timeout=`min(request_timeout_default,t_remaining(n))` | Timing/Async |
| TR-aill-010 | Model fallback ladder `M` data-driven; `cooldown_until(m)` uses real wall-clock; `tried` set monotonic within one logical call | Data/Core |
| TR-aill-011 | `cooldown_until` NOT persisted across reload; DI for test isolation | Testing/State |
| TR-aill-012 | Error taxonomy: 503→retry+fallback; 429→fail immediate; 403→fail immediate config error; `M=[]`→fail immediate | Core |
| TR-aill-013 | `calls_per_turn` counts distinct call_types (max 3), NEVER `http_attempt_count` | Data/Core |
| TR-aill-014 | 2nd `request_ai` while state≠Idle → immediate `BUSY`, no queueing | Core/Timing |
| TR-aill-015 | API key: `apiMode∈{default,userKey}`; `userKey` storage namespace separate from Persistence save bundle | Data/Security |
| TR-aill-016 | `safetySettings=BLOCK_NONE` fixed system-wide, never per-turn toggle | Data/Core |
| TR-aill-017 | Prompt injection defense: player input + World Memory context both delimiter-wrapped + disclaimed | Core/Security |
| TR-aill-018 | `narration_call` prompt forbids spelled-out numerals (closes regex-leak-detector gap) | Core |
| TR-aill-019 | Concealment context injection when NPC `concealment.active=true` | Cross-system/Data |
| TR-aill-020 | CORS verified PASS via browser prototype; NOT yet verified via real Godot `HTTPRequest` | Networking |
| TR-aill-021 | `cancel_request()` on 4.6 Web export confirmed no-op — zombie requests billed but never wrongly resolve (IDs never reused) | Engine/Networking |
| TR-aill-022 | Test methodology: mocked HTTP + fake clock, except CI checks and manually-stepped mock for coroutine ordering | Testing |
| TR-aill-023 | Resubmit-after-Failed: caller MUST resend exact same `locked_result` | Cross-system |
| TR-aill-024 | Consumes `ai_context_hard_token_budget` from World Memory Formula #5 — **owner declared here but value undefined anywhere (gap)** | Cross-system/Data |
| TR-aill-025 | Undeclared edge: TM→AI/LLM Layer not in Systems Enumeration table | Core/Cross-system |

**Ownership**: Owns outbound call surface, prompt-construction pipeline, retry/fallback state machine, API-key storage/selection. Exposes `request_ai(call_type,payload)`. Consumes `locked_result`+World Memory context from callers, `allowed_envelope_menu` (Situation Gen), `style_descriptor` (Equipment), `npc_tag.concealment_narrative_hint` (Character Card), timing constants (TM registry).

**One-way lock architecture (full)**: `narration_call` always carries `locked_result`, AI narrates only; `suggestion_call` carries none, output constrained JSON from `allowed_envelope_menu`. All adversarial-content sources (player free text, stored `narration_text`) delimiter-wrapped + disclaimed. AI never determines state, never alters `locked_result` on retry. Retry/backoff/fallback state machine fully specified (see TR table). Per-attempt dynamic timeout shrinks as budget consumed. Zombie-request billing is a cost concern, not a correctness concern (IDs never reused, no wrong-resolve risk).

**Required New ADR** — must cover: AI backend formalization (Gemini, prototype-confirmed, no ADR yet) + ToS check; concrete fallback model list; **mandatory** HTTP referrer restriction (Google Cloud Console) since CORS echoes any origin; Godot-engine-level HTTPRequest re-verification (currently only JS-fetch-verified); `ai_context_hard_token_budget` definition (closes the World-Memory-side gap too); zombie-request billing cost measurement.

---

#### 5. World Memory & Context Management (22 TRs) — HIGH-RISK flagged system

| Req ID | Requirement | Domain |
|---|---|---|
| TR-wmcm-001 | Two-tier: Full Narrative Log (unbounded) vs AI Context View (bounded, derived) | Data |
| TR-wmcm-002 | Full Log never compressed for confirmed-not-undone turns; Undo hard-deletes | Data/Core |
| TR-wmcm-003 | AI Context View = Recency Window(verbatim, default 8, floor 1) + Extracted Facts | Data/Core |
| TR-wmcm-004 | Fact extraction 100% rule-based on `locked_result` fields, NEVER reads `narration_text` via AI; 0 `calls_per_turn` | Core/Data |
| TR-wmcm-005 | `recency_window_turns` floor=1 (undoable turn always verbatim) | Core |
| TR-wmcm-006 | `in_window()` ONE-WAY trigger at confirm time, never re-queryable/resurrecting after Undo | Data/Core |
| TR-wmcm-007 | `has_signal(f)` 5 typed branches + fail-safe default=true for unknown types | Data |
| TR-wmcm-008 | `selected_facts(entity)=top_K(...,key=(importance_tier DESC,world_time DESC,fact_id ASC),K)` | Data |
| TR-wmcm-009 | `context_size≤C` — O(1)-in-world_time EXPECTED bound (not pointwise) | Performance |
| TR-wmcm-010 | Runtime Hard Clamp: measure REAL tokens, cut oldest-window-turn-first then lowest-tier-fact, return `{context,over_budget}`, never throw | Performance/Data |
| TR-wmcm-011 | `get_turn_page(anchor_turn_id,count,direction)→{records,has_more}`, never includes anchor, deleted anchor = virtual timestamp | Core/UI |
| TR-wmcm-012 | `get_turn(id)`, `get_processing_state(id)`, `get_facts_by_entity(id)`, `total_turns()` O(1) counter | Core/Data |
| TR-wmcm-013 | `total_turns()` MUST be O(1) maintained counter, not full-log rescan | Performance |
| TR-wmcm-014 | Write+extract is ONE atomic op on TM confirm event | Core/Cross-system |
| TR-wmcm-015 | Persistence MUST serialize AI Context View as MANDATORY blob | Persistence/Data |
| TR-wmcm-016 | Loading save with large `world_time` triggers ONE-TIME batch extraction pass | Persistence/Core |
| TR-wmcm-017 | Tuning-knob changes mid-playthrough apply prospectively only | Core |
| TR-wmcm-018 | INVARIANT: `max_entities_per_prompt ≥ MAX_NPC_PER_SCENE+1` — must register jointly | Data/Cross-system |
| TR-wmcm-019 | Story Log UI must lazy-load/page, never load full log | UI/Performance |
| TR-wmcm-020 | **[Required New ADR]** RAM residency unresolved — IDBFS mirrors whole files into RAM; true IndexedDB access is async, conflicts with Core UI's sync-call assumption | Timing/Async/Persistence |
| TR-wmcm-021 | Nearly all AC are pure unit tests, no network calls | Testing |
| TR-wmcm-022 | Undeclared edge: TM reads AI Context View directly | Cross-system |

**Ownership**: Owns Full Narrative Log + Extracted Facts store (keyed `entity_id`). NOT permanent character records (Persistence's Entity Record). Exposes `get_turn_page`, `get_turn`, `get_processing_state`, `get_facts_by_entity`, `total_turns()`, AI Context View builder. Consumes confirm/undo (TM), `importance_tier` (Setting & Canon), `ai_context_hard_token_budget` (AI/LLM Layer — undefined gap).

**Context-limit mitigation (5-formula defense, HIGH-RISK closure)**: Formula #1 Recency Window Membership (one-way trigger) → Formula #2 Fact Extraction (rule-based, never touches narration_text) → Formula #3 Entity-Scoped Fact Selection (top_K bound) → Formula #4 AI Context View Size Bound (proven O(1)-expected in world_time) → Formula #5 Runtime Hard Clamp (absolute safety net, strict cut order, never throws). Raw storage stays O(world_time) by design (Persistence's problem); AI-facing slice is provably bounded.

**Open**: `ai_context_hard_token_budget` undefined at source (AI/LLM Layer gap). **Required New ADR** on RAM residency / sync-vs-async signature for `get_turn_page`/`total_turns()` on Web export — MVP-interim assumption is RAM-resident/synchronous, deferred to follow-up ADR at scale. `entity_id` naming convention only a working assumption. `avg_turn_tokens`/`avg_fact_tokens` not yet empirically measured.

---

#### 6. Persistence / Save System (24 TRs) — **ADR-0002 Accepted, finalized contracts below**

| Req ID | Requirement | Domain |
|---|---|---|
| TR-pss-001 | Write-ahead gate: `durability_confirmed=true` BEFORE Confirmed/Awaiting transition | Persistence/Core |
| TR-pss-002 | `durability_confirmed` = full durable-commit chain — finalized: IndexedDB `transaction.oncomplete` | Persistence |
| TR-pss-003 | Save bundle = independently-owned blobs; Persistence opaque to content, enforces `blob_status∈{OK,MISSING,ERROR}` | Data/Persistence |
| TR-pss-004 | Atomic all-or-nothing per turn; append-only, never re-serializes whole log | Persistence |
| TR-pss-005 | `stage()/commit()/abort()` seam — finalized: `StorageBackend` abstract class w/ `committed`/`failed` signals | Persistence/Testing |
| TR-pss-006 | Full-flush snapshot+compaction off critical path, same atomic op as record deletion | Persistence/Performance |
| TR-pss-007 | `commit_allowed(bundle)=is_complete AND N≥1` | Data/Core |
| TR-pss-008 | `schema_version` refuse-to-load on ANY mismatch | Data/Persistence |
| TR-pss-009 | Bundle size O(world_time) growth (Formula #1) — unbounded by design | Performance/Data |
| TR-pss-010 | Quota Utilization scoped at ORIGIN level (not per-slot) | Data/Persistence |
| TR-pss-011 | Error taxonomy: player-facing (diegetic text) vs internal/log-only codes | Core/UI |
| TR-pss-012 | Multi-tab: first tab writes, second instantly rejected — finalized: Web Locks `{ifAvailable:true}` | Persistence/Timing |
| TR-pss-013 | Slot lifecycle: `slot_closure_reason∈{death,quota_exhausted}`, only `death` gates continuation | Core/Data |
| TR-pss-014 | Export: 9a QA JSON log, 9b readable text — never "backup", no import | Data/UI |
| TR-pss-015 | After `max_write_retry_before_escalation`(3), offer non-destructive "Khép quyển sổ" | Core/UI |
| TR-pss-016 | `max_perceived_autosave_latency_ms=150`(100-300) — append-only path only | Performance/Timing |
| TR-pss-017 | Compression: NONE MVP; if adopted, unit=(b) full-flush only, never per-record | Persistence/Performance |
| TR-pss-018 | Entity Record blob (permanent char records) owned by Persistence, opaque | Data/Cross-system |
| TR-pss-019 | `commit()` result ONLY via signals, never sync return | Timing/Async |
| TR-pss-020 | TOCTOU: `get_blob()->{status,bytes}` ONE atomic call — `bytes` finalized as String | Data/Persistence |
| TR-pss-021 | `blob_gather_timeout_ms=100` post-hoc assertion | Timing/Async |
| TR-pss-022 | Pending-write-cache: persistent failure + resubmit retries ONLY write step, no re-AI-call | Cross-system/Persistence |
| TR-pss-023 | Testing: unit+mock/spy mostly; multi-tab/mid-tx/quota need dedicated sim — AC-17/22/29/33 unblocked by ADR-0002 | Testing |
| TR-pss-024 | Undeclared edges: Equipment/Combat/EXP/Death&Consequence don't list Persistence despite being hard dependents | Cross-system |

**Ownership**: Owns save/load transaction, `schema_version` gate, slot lifecycle, opaque blob registry (never interprets content). Exposes `StorageBackend` interface, `get_blob()` contract, lock acquire/release, 9a/9b export. Consumes write-triggers (TM), Full Log+Context View blobs (World Memory — now mandatory), blobs from every Feature system.

**Finalized (ADR-0002, cite directly — do not re-derive)**: IndexedDB direct via JavaScriptBridge, 3 stores (`slots`/`turn_records` compound-key `[slot_id,world_time]`/`snapshots`), `FLUSH_EVERY_N_TURNS=50`. `get_blob()` bytes=String (PackedByteArray proven to fail silently, Experiment 2b 2026-08-11). Web Locks `Promise.resolve.bind` pattern. No compression MVP. `schema_version` pre-1.0 save-breaking OK. `versionchange`/`onblocked` handling specified. Non-Web dev backend behind same seam, `OS.has_feature("web")` guarded.

**Open**: `turn_snapshot` field-level schema still unowned (TM's open question). Real-device matrix (#4) unresolved, pre-deploy gate not coding blocker. Save Slot Screen virtualization routed to `/ux-design`. Post-external-player migration strategy deferred to future superseding ADR.

---

### FEATURE LAYER

#### 7. Combat System (20 TRs) — **Implemented, ADR-0001 Accepted, src/gameplay/combat/**

| Req ID | Requirement | Domain |
|---|---|---|
| TR-combat-001 | Battle = multi-turn under TM; each TM turn during `in_combat` = one "exchange", `exchange_id` counter/battle | Core |
| TR-combat-002 | `resolve_exchange(A,B,action_type_of,thuc_id_of,player_id,rng)` single call-site | Core |
| TR-combat-003 | RNG injected as LAST param, never global singleton | Core |
| TR-combat-004 | All `int/int` division `float()`-cast explicitly (largest defect class, 4 review rounds) | Core |
| TR-combat-005 | `locked_result` fixed 6 fields: `exchange_id,first_id,second_id,per_actor,battle_active,outcome` | Data |
| TR-combat-006 | `per_actor[id]`: `thuc_id,action_type,executed,hit(3-state),crit,damage_dealt,heal,hp_after` | Data |
| TR-combat-007 | `outcome={type,winner_id,loser_id}` — both null iff `type="no_outcome"` | Data/Cross-system |
| TR-combat-008 | `is_spar_friendly`(immutable/battle) + `external_abort_signal`(checked once/exchange) | Core/Timing |
| TR-combat-009 | Sequential non-reentrant resolution: attacker fully resolves incl. HP=0 check before defender acts ("no double-kill") | Core/Timing |
| TR-combat-010 | Realm/gear suppression recomputed EVERY exchange, not cached | Core |
| TR-combat-011 | Skill-repeat exclusion scoped to whole battle, symmetric; "Đánh thường" exempt | Core/Data |
| TR-combat-012 | Combat items cut from MVP; field reserved, never read | Data |
| TR-combat-013 | `battle_active=false` is the sole hand-off signal for EXP/Death&Consequence/Affinity | Cross-system |
| TR-combat-014 | Exactly 1 narration_call/exchange, one-directional lock-then-narrate | Cross-system/Async |
| TR-combat-015 | `TECHNICAL_EXCHANGE_CAP`(200) pure safety valve, cross-constrained ≥120 vs `EXHAUSTION_ONSET_EXCHANGE` | Timing/Testing |
| TR-combat-016 | Undo rolls back HP/`in_combat`/used-skill-set; RNG genuinely re-rolls on redo | Persistence/Core |
| TR-combat-017 | Exhaustion drain computed unconditionally both sides (avoids proven SPD-bias) | Core |
| TR-combat-018 | GUT mandatory for every BLOCKING AC; convergence sweeps via headless script | Testing |
| TR-combat-019 | Win/lose/no_outcome distinguishable by shape/glyph not color alone; text fallback | UI |
| TR-combat-020 | `Lực_chiến` estimate display-only, never decides outcome; sentinels `"N/A"`/`"+∞"` | UI/Data |

**Ownership**: Owns D.1-D.14 formulas, `locked_result` schema, `in_combat`/`battle_active`/`exchange_id`, `max_invocations_per_battle`, `is_spar_friendly`/`external_abort_signal`. Exposes `outcome`, `hp_after`, `battle_active`, `combat_power_estimate`. Consumes `tier(C)` (EXP), `base_X(C)` (Character Card), skill/thức data (Equipment), `death_and_consequence_blocked` (Death&Consequence, drives `crippled_layer`), `external_abort_signal` (Situation Gen).

**ADR-0001 finalized architecture (cite directly)**: `src/gameplay/combat/` 7 files — `combat_tuning.gd`, `combatant.gd`, `combat_formulas.gd` (pure D.1-D.7/D.10-D.13), `combat_resolver.gd` (D.8/D.9/D.9b/D.9c), `combat_npc.gd` (D.14), `combat_actions.gd`, `combat_narration.gd`. Mandates: pure functions/DI over static hidden state; RNG injected last-param; `float()` cast + `maxi(denom,1)` guard everywhere division occurs (fixed 2 real defects: 0/108 exhaustion convergence, disguised 100%-coin-flip tiebreak); signature-symmetry discipline. Validation: GUT 91/91 green, 829 asserts, `tools/lint/combat_lint.py` 0 findings, convergence sweep 96/108 exact match vs frozen Python harness (harness itself is archival-only, NOT authoritative — Python's lossless division structurally can't catch GDScript's lossy-by-default bug class).

**Status vs code**: Combat is the ONE feature-layer system that's an **already-built reference module** — architecture doc should describe its existing structure as the pattern for other mechanically-heavy systems, not re-specify mechanics from GDD prose.

**Open**: D.13's `w_HP=0.25` weight placeholder pending EXP stat-growth reconciliation. Ambient/ownerless opponent stat-construction algorithm not formalized. `external_abort_signal` trigger conditions deferred to Situation Gen (also unresolved there).

---

#### 8. EXP & Realm Progression (17 TRs) — Approved, not yet implemented

| Req ID | Requirement | Domain |
|---|---|---|
| TR-exp-001 | `tier(C)` DERIVED from `level` via `floor((level-1)/10)+1`, never stored independently | Data |
| TR-exp-002 | 4 EXP sources gated by `turn.in_combat` vs `locked_result.battle_active=false` — mutually exclusive/turn | Core/Timing |
| TR-exp-003 | `turn.in_combat=true` across all 3 Combat states incl. concluding turn | Cross-system/Timing |
| TR-exp-004 | `resolve_turn_exp` win/loss via SELF-RELATIVE comparison (`winner_id==self`), never `outcome.type` | Core |
| TR-exp-005 | `exp_multiplier`(Tâm Pháp) applied ONCE to summed total, before cascade/cap | Core |
| TR-exp-006 | Level-up WHILE cascade, halts unconditionally at `level mod 10==0` → "Chờ Đột Phá", EXP capped at 100%, overflow discarded | Core |
| TR-exp-007 | `try_execute_breakthrough` MUST run before `resolve_turn_exp`; gated off when blocked/in_combat/death_turn | Core/Timing |
| TR-exp-008 | Full Rollback restores level/tier/EXP AND breakthrough-state atomically | Persistence |
| TR-exp-009 | `breakthrough_requirement_met(tier)` owned by Setting&Canon; may ONLY resolve true via combat branch | Cross-system |
| TR-exp-010 | "Awaiting Breakthrough" qualitative signal Required-for-MVP, surfaced without leaking the answer | UI/Cross-system |
| TR-exp-011 | Fail-loud validation at load-time for 5+ invariants; `assert()` forbidden (stripped in release Web); structured `EXP_ERROR_*` codes | Core/Testing |
| TR-exp-012 | `resolve_turn_exp` applies to EVERY Card holder incl. NPCs | Core |
| TR-exp-013 | `is_death_turn=true` short-circuits ALL 4 sources to 0 | Core |
| TR-exp-014 | Stat growth feeds Combat's `base_X(C)` — 12-stat/24-constant contract | Cross-system/Data |
| TR-exp-015 | Economic invariant must hold across FULL `CONTENT_EXCHANGE_ESTIMATE` Safe Range (15-50), not just default | Testing/Data |
| TR-exp-016 | Integration test required (not just mocks) to schema-check Combat's real field names | Testing |
| TR-exp-017 | Fail-fast `EXP_ERROR_OPPONENT_TIER_UNDEFINED` if opponent lacks `tier` | Core/Testing |

**Ownership**: Owns `level`, `tier`(derived), EXP accumulator, Awaiting-Breakthrough state machine, D.1-D.7 formulas, 26 tuning constants. Exposes `level(C)`/`tier(C)`. Consumes Combat hand-off (hard, 2-way), `song_tu_relationship_active_npc_ids` (NPC Affinity, soft), `death_and_consequence_blocked` (soft), `breakthrough_requirement_met` (Setting&Canon, hard).

**Naming nuance**: `SONG_TU_ACTIVE` is EXP's OWN internal D.4 variable — NPC Affinity exports only `song_tu_relationship_active_npc_ids` (a list). Two distinct symbols, already fixed once as a documented bug.

**Status**: Build following this spec — no `src/` implementation exists. Should follow Combat's structural precedent (formula module + resolver + tuning-config + GUT suite).

**Open**: Rollback of an external breakthrough-consumed resource (e.g. "Hồn Hoàn") — ownerless gap across 3 GDDs simultaneously, needs an owning decision before implementation. `WIN_EXP_FLOOR_MULT` known unmitigated tier-farming exploit, logged not fixed. No UI interface yet for "Awaiting Breakthrough" signal.

---

#### 9. NPC Affinity & Relationship (16 TRs) — Approved, not yet implemented

| Req ID | Requirement | Domain |
|---|---|---|
| TR-npc-001 | Single source of truth `affinity`/NPC, int `[-100,+100]` | Data |
| TR-npc-002 | Delta ONLY from classified events (hard mechanical or pre-classified social) — zero AI calls in pipeline | Core |
| TR-npc-003 | No time-decay; only in-pipeline diminishing-returns + repetition-fatigue; negative deltas never diminished | Core |
| TR-npc-004 | Propagation ONE-HOP only, hard-capped, never chains; independent per-NPC clamp (closes chained-clamp High-Risk flag) | Core |
| TR-npc-005 | `margin_ratio` MUST `float()`-cast `hp_after`/`max_HP` — same truncation class as Combat D.9b/D.9c | Core |
| TR-npc-006 | `SONG_TU_COOLDOWN_TURNS`(5) independent per-NPC tracker, rejected-at-input (no RNG roll if on cooldown) | Core/Timing |
| TR-npc-007 | Exports `song_tu_relationship_active_npc_ids` (list) — NOT a boolean `SONG_TU_ACTIVE`; bonus doesn't scale w/ NPC count | Cross-system/Data |
| TR-npc-008 | All deltas incl. propagated computed/locked during Resolving, as `affinity_delta_[npc_id]` fields | Persistence/Core |
| TR-npc-009 | Clamp `[-100,+100]` BEFORE lock, per-NPC independent, verified via 1000-combo property test | Testing/Core |
| TR-npc-010 | Deep-hostility flag `affinity≤-80`(inclusive) DERIVED, re-evaluated live | Cross-system/Data |
| TR-npc-011 | Song Tu 5-state machine (Locked/Available/Active/Broken/Ended), independent/NPC, `Ended` terminal | Core |
| TR-npc-012 | Rounding ONCE, per-NPC, after summing, before clamp, round-half-away-from-zero | Core |
| TR-npc-013 | Undo reverses deltas, D.3 streak trackers, cooldown tracker, Song Tu transitions | Persistence |
| TR-npc-014 | Persistence serializes affinity table, active Song Tu set, cooldowns, streaks, `link_strength` graph | Persistence |
| TR-npc-015 | Numbers never in `narration_text` — AI gets attitude band + direction only | UI/Core |
| TR-npc-016 | INVARIANT: `FATIGUE_WINDOW_TURNS ≥ POSITIVE_SOCIAL_COOLDOWN_TURNS`(Situation Gen) — dedicated static-assertion AC | Testing/Data |

**Ownership**: Owns `affinity`, event→delta table (9 types), D.2-D.6 pipeline, Song Tu state machine + cooldown, static `link_strength` graph, 7-band attitude derivation. Exposes `affinity_delta_[npc_id]`, deep-hostility flag, `song_tu_relationship_active_npc_ids`, attitude/Song-Tu display. Consumes Combat hand-off (hard), Death&Consequence `kill_witnessed`+read-back of -80 flag (hard), Situation Gen classified events (soft, MVP works without it), TM lifecycle (hard).

**Status**: Build following this spec. GDD anticipates the same DI/pure-function structure ADR-0001 established for Combat (not mandated by a formal ADR extension, but a strong signal — ADR-0001's "Enables" section names this system explicitly).

**Interlocking constants (register jointly)**: `FATIGUE_WINDOW_TURNS`(NPC Affinity) ↔ `POSITIVE_SOCIAL_COOLDOWN_TURNS`(Situation Gen) — explicit mandatory invariant, both GDDs cross-reference, dedicated AC-16b. `deep_hostility_threshold=-80` — locked design constant (NOT tunable), consumed by ≥3 systems, worth one named registry entry.

**Open**: `spar_friendly` vs hostile distinction for combat-event classification deferred to Situation Gen.

---

#### 10. Setting & Canon Integration (20 TRs) — Approved, not yet implemented

| Req ID | Requirement | Domain |
|---|---|---|
| TR-sci-001 | Setting-pack static data: char roles + event `{trigger_condition,earliest_world_time,location_id,roles,premises,canon_outcome,status}` + `breakthrough_requirement[tier]`; NOT serialized (static) | Data |
| TR-sci-002 | 8 premise types, each with fixed reversibility flag driving eager/lazy-break evaluation | Core |
| TR-sci-003 | Event state machine (8 states) via single-writer `transition_event_status(E,proposed,source)` — Guard 1 terminal write-once, Guard 2 severity lattice, GLOBAL invariant at every call site | Core |
| TR-sci-004 | Load-time DAG validation: `downstream_index` O(1), `longest_path` DFS, reject if `>CASCADE_MAX_DEPTH`, validate `resolution_order` vs DAG edges | Data/Testing |
| TR-sci-005 | `cascade_vanish_check` recursive: depth-cap cuts EAGER propagation only (not final judgment); live re-evaluation; visited-set is cycle-guard on SOURCE only (fan-out evaluated multiple times by design) | Core |
| TR-sci-006 | STEP1 fixpoint bounded (≤3×|events|+1, proven); "change" = actual value mutation, required for proof | Core/Timing |
| TR-sci-007 | `resolve_turn_canon` pipeline: AFTER Combat/Death&Consequence/Affinity lock, BEFORE `resolve_turn_exp`; 5-step (fixpoint→rescue→Due-resolution→breakthrough→locked_result write→undo compliance) | Timing/Async |
| TR-sci-008 | `substitute_selection` deterministic argmin, NO RNG, 1000-run determinism required | Core/Testing |
| TR-sci-009 | `canon_role_rescue` mechanical resolution: char_id from Situation Gen string-match (0 AI); on-failure locks structured reason code | Core |
| TR-sci-010 | `rescue_window_final(event_id)=is_due(event)` exported to Situation Gen as PROMPT DIRECTIVE only (no UI timer) | Core (cross-system) |
| TR-sci-011 | `canon_due_payload`/`canon_role_npcs` exported to Situation Gen | Core |
| TR-sci-012 | `importance_score`/`importance_tier` supplies World Memory's fact-selection sort key | Data |
| TR-sci-013 | `world_state` = thin O(1) adapter — owns NO copy of any other system's state | Core |
| TR-sci-014 | 0 AI calls in judgment; `calls_per_turn≤3` preserved | Core |
| TR-sci-015 | Event `status`(incl. Suspended) durable; `substitutes_used_this_turn` turn-scoped runtime only | Persistence |
| TR-sci-016 | TM Core Rule #8/#9 compliance: undo reverses status/cascades EXCEPT permanent lock on `is_death_turn` | Core/Persistence |
| TR-sci-017 | Load-time authoring validation rejects 5 error classes, returns STRUCTURED LIST of ALL errors (not fail-fast-on-first) | Data/Testing |
| TR-sci-018 | Container-rebind requirement for slot-scoped replay (Layer B pattern) — reads ACTIVE slot blob every query, no stale copy | Persistence |
| TR-sci-019 | `turn_snapshot` includes event status(incl. Suspended)+rebound roles | Persistence |
| TR-sci-020 | Testing: BLOCKING, all external systems mocked | Testing |

**Ownership**: Owns `status(E)` machine, `canon_break_flag_[id]`, `canon_event_[id]_status`, `canon_role_filled_[npc]`, `canon_rescue_failed_[id]`, `downstream_index`, `substitutes_used_this_turn`, `importance_tier` table, `breakthrough_requirement_met`. Exposes `canon_due_payload`, `canon_role_npcs`, `rescue_window_final`, `breakthrough_requirement_met`. Consumes `alive(X)` (Death&Consequence), `affinity_at_least/most`+`song_tu_active` (NPC Affinity), `possesses`(Equipment, gap — no `destroyed` flag yet), `location(X)` (Situation Gen), `world_time` (TM), `canon_role_rescue` classification (Situation Gen).

**Key decisions**: Single-writer `transition_event_status` is the ONLY legal mutation path (2-guard invariant, order-independent under same-turn collisions). Deterministic non-AI resolution (`substitute_selection` argmin, `canon_role_rescue` string-match). Recursive cascade + convergence: DFS-bounded, depth-cap cuts eager-propagation ONLY. Mandatory `on_break` declaration, NO default (previously silently defaulted, now a load-time error). Rubric: no immortal events, only reaction policy differs. `world_state`=adapter pattern, zero owned foreign-state copies.

**Open**: 3 provisional field names pending reconciliation. `possesses` premise blocked at MVP (Equipment has no `destroyed` flag). `CASCADE_MAX_DEPTH`(20)/`FIXPOINT_MAX_ITERATIONS`(100) are safety valves, NOT tuning knobs meant to be exercised.

---

#### 11. Situation/Encounter Generation (20 TRs) — Approved, not yet implemented

| Req ID | Requirement | Domain |
|---|---|---|
| TR-seg-001 | `scene={location_id,entities_in_scope,scene_tags,active_hook}` locked before any AI call; `entities_in_scope` capped `MAX_NPC_PER_SCENE=3`(LOCKED)+"global"≤4 | Data |
| TR-seg-002 | Turn lifecycle state machine: Scene Pending Update→Locked→Awaiting Action→Classifying→Dispatched→(confirm/undo) | Core |
| TR-seg-003 | Fixed 12-value `ENVELOPE_TYPES` taxonomy | Data |
| TR-seg-004 | `allowed_envelope_menu(turn)` computed ONCE at Scene Locked, never recomputed mid-turn; out-of-menu labels hard-downgrade to `rp_only` | Core |
| TR-seg-005 | `spar_friendly` declared via UI popup on first `combat_challenge` tap, forced binary, no default | UI/Core |
| TR-seg-006 | `canon_role_rescue` char_id: deterministic client-side STRING-MATCH, exactly 1 match required, 0/≥2→`rp_only` fallback, NO AI call | Core |
| TR-seg-007 | Anti-ratchet gating: `gift`/`small_help` need hook+cooldown; `song_tu_action` needs `private` tag+threshold — gates apply to AVAILABILITY not delta magnitude | Core |
| TR-seg-008 | `select_primary_hook` strict 3-tier priority: Canon Due→NPC-initiated→World/Ambient; exactly 1 hook/turn | Timing/Async |
| TR-seg-009 | `hostile_initiative_allowed(npc)=(level_gap≤20[LOCKED]) OR provoked_flag` — ONE-SIDED gap | Core |
| TR-seg-010 | `provoked(npc)` schema `{set_turn,source_event_ref}|null` — instance-identity SET/CLEAR (not turn-count), no decay | Core |
| TR-seg-011 | `cooldown_ok`=4 independent per-NPC valence trackers AND shared sliding-window global budget (World/Ambient tier SHARES this budget) | Core/Timing |
| TR-seg-012 | `entities_in_scope`=`{"global"}∪top_K(candidates,key=(tier,-\|affinity\|,npc_id),K=3)` | Core |
| TR-seg-013 | `encounter_level_range` hard-constrained `AMBIENT_HOSTILE_LEVEL_CAP≤HOSTILE_INITIATIVE_LEVEL_GAP_MAX=20` | Core |
| TR-seg-014 | **`AMBIENT_ENCOUNTER_CHANCE`=0.25(derived=`CAP/(WINDOW_TURNS+1)`) ↔ `RESCUE_COOLDOWN_TURNS`=8(≥2×`POSITIVE_SOCIAL_COOLDOWN_TURNS`) — BINDING joint constraint** | Timing/Async |
| TR-seg-015 | `is_rescue_candidate` reuses ambient roll + neutral-band affinity gate; cooldown consumed at hook-selection time | Core/Timing |
| TR-seg-016 | `deterministic_roll(turn,seed_stream)` injectable/seeded, separate `"ambient"` stream from level-roll | Testing/Core |
| TR-seg-017 | `turn_snapshot` serializes scene/presence/cooldowns/`provoked`/4 trackers/hook-window history | Persistence |
| TR-seg-018 | 0 AI calls; fixed resolve order Combat/Death→Affinity→Canon→EXP | Timing/Async |
| TR-seg-019 | Every chip `≥44px`(TOUCH_TARGET_MIN); stable relative-order (grouped by npc_id then fixed envelope order) | UI |
| TR-seg-020 | Testing: BLOCKING, all deps injected as mocks incl RNG | Testing |

**Ownership**: Owns `scene`+`active_hook`, `entities_in_scope`, `allowed_envelope_menu`, `location(X)` presence table (BOTH player+NPC), `provoked`, cooldown trackers. Exposes `entities_in_scope` (World Memory), classified/dispatched events (Affinity/Canon/Combat), `canon_role_rescue` resolved char_id, `combat_challenge`, `encounter_level_range`, `location(X)` (Setting&Canon). Consumes `canon_due_payload` etc (Setting&Canon), classified social events+affinity data (NPC Affinity), `level`(EXP,soft), `alive(X)` (Death&Consequence).

**Key decisions**: Deterministic client-side classification everywhere (never AI) for `canon_role_rescue`/`spar_friendly`. 3-tier scheduler shares, doesn't add to, world-activity budget (anti-"quest vending machine"). `provoked` redesigned bool→`{set_turn,source_event_ref}` to fix a same-turn race.

**Interlocking constants (economy-derivation-gated, per coordination-rules.md)**: `AMBIENT_ENCOUNTER_CHANCE`↔`NPC_INITIATED_WINDOW_CAP`/`WINDOW_TURNS` (derivation formula, corrected once already 2026-08-11). `RESCUE_COOLDOWN_TURNS`↔`POSITIVE_SOCIAL_COOLDOWN_TURNS`(≥2× binding). Effectively a 3-way interlocking group requiring joint config-load-time assertion, NOT independently-tunable knobs.

**Open**: `entities_in_scope` conflates presentation-cap with witness/simulation set — structural debt flagged for pre-Alpha split. Concealed-level NPCs not yet handled by "readable danger" model. `external_abort_signal` trigger conditions (owned here, undefined).

---

#### 12. Death & Consequence (17 TRs) — Approved, not yet implemented

| Req ID | Requirement | Domain |
|---|---|---|
| TR-dc-001 | Activates ONLY when Combat hand-off has `battle_active=false` AND `outcome.type∈{win,lose}` AND `!is_spar_friendly` AND player involved | Core |
| TR-dc-002 | Pipeline order: immediately AFTER Combat, BEFORE NPC Affinity (kill_witnessed ready same turn) BEFORE Setting&Canon | Timing/Async |
| TR-dc-003 | Branch A (player loses): read `affinity(opponent)` at turn-START value; `≤-80`→D.1 death_roll→death locks `alive=false`+`is_death_turn=true`+**synchronous Persistence "Khóa slot" trigger BEFORE handoff**; survival→`forced_severe=true` | Core |
| TR-dc-004 | `forced_severe_margin_ratio` = ORIGINAL pre-override ratio, narration-tone only, not mechanical input | Data/Core |
| TR-dc-005 | D.1 death_roll formula w/ explicit `float()` cast + denom floor (same truncation class) | Core |
| TR-dc-006 | D.2 `severity_tier`(mild/medium/severe), forced `severe` overrides; `severe`→`death_and_consequence_blocked=true` | Core |
| TR-dc-007 | D.3 `recovery_attempt` 3 methods, cost ALWAYS deducted regardless of success; explicit REJECT for stale 4th enum value | Core |
| TR-dc-008 | Branch B (player wins): `pending_fate` open exactly 1 turn, ambiguous intent defaults to Tha mạng, resolves at TM confirm instant | Core/Timing |
| TR-dc-009 | Kết liễu: locks `alive=false`+`death_flag`, fires `kill_witnessed(victim,witnesses)`; NORMALLY UNDOABLE (unlike player death) | Core |
| TR-dc-010 | Tha mạng@medium fires extra `classified_event(type="insult")` reusing NPC Affinity's type | Core |
| TR-dc-011 | `alive(X)`/`death_flag` EXCLUSIVE single-writer for ALL characters; exactly 2 internal write paths | Core/Data |
| TR-dc-012 | `death_and_consequence_blocked` blocks EXP AND applies `crippled_layer=CRIPPLED_PENALTY_MULT`(0.85) into Combat's penalty multiplier | Core (cross-system tuning-invariant) |
| TR-dc-013 | Undo rolls back exactly 3 fields; resource refunds owned by OWNING system | Persistence |
| TR-dc-014 | Persistence "Khóa slot" trigger OWNED HERE (moved from Character Continuation, fires synchronously) | Persistence |
| TR-dc-015 | 3 MIN/MAX knob-pairs need load-time validation, NOT YET implemented — flagged for technical-director | Testing/Data |
| TR-dc-016 | `consequence_type`/`consequence_witnesses` exposed for EVERY tier for World Memory fact extraction | Persistence/Data |
| TR-dc-017 | Testing: Logic=BLOCKING, Visual/Feel=ADVISORY | Testing |

**Ownership**: Owns `alive(X)`/`death_flag`(ALL characters), `death_and_consequence_blocked`, `forced_severe`(turn-scoped), `pending_fate`, `consequence_type/witnesses`, `last_self_attempt_turn`, `is_death_turn` generation. Exposes all above + `kill_witnessed` event + "Khóa slot" trigger. Consumes Combat hand-off, `max_HP(C)`(Character Card), `affinity(opponent)`(NPC Affinity), TM turn context, `entities_in_scope`(Situation Gen), `efficacy`(Equipment).

**Key decisions**: `alive`/`death_flag` single-writer, exactly 2 write paths. `forced_severe` deliberate override w/ mandatory turn-scoped reset. Pending Fate resolution precisely turn-CONFIRM-timed. Genuine non-undoability: player death is the ONE permanent-lock TM exception; all OTHER same-turn writes remain undoable. **Persistence trigger relocated from Character Continuation to here** — closes a stuck-slot bug. `crippled_layer` REUSES Combat's existing `FLOOR_TOTAL` machinery — explicitly does NOT trigger the economy-derivation-gated amendment (contrast w/ Situation Gen's pair).

**Open**: Load-time validation for 3 knob-pairs unowned. `efficacy`/`đại cơ duyên` ownership provisional.

---

#### 13. Character Continuation (12 TRs) — Approved, not yet implemented

| Req ID | Requirement | Domain |
|---|---|---|
| TR-cc-001 | `continuation_choice_eligible=is_death_turn AND death_confirmed` — PERMISSION only, not auto-trigger; needs explicit `tap_continue_to_fate` | Core |
| TR-cc-002 | State machine Idle→Awaiting Choice→Processing Chơi Lại→New Playthrough\|Reset Failed; only Chơi Lại functional MVP, other 2 "silent" stubs | Core/UI |
| TR-cc-003 | D.1 `reset_completeness_check`: INTEGER-SUM gate `Σok(s)=N`(not float ratio==1, avoids IEEE-754 false-negative already fixed once in Persistence) | Core/Testing |
| TR-cc-004 | `N` DERIVED 1:1 from Core Rule #6 bullet count, currently min 5 | Data |
| TR-cc-005 | `ok(s)` 2-layer: Layer A(char_id-keyed, new/playthrough) vs Layer B(setting-pack fixed IDs, requires CONTAINER REBIND to new slot before read) | Persistence/Core |
| TR-cc-006 | `continuation_choice_eligible` = 2-layer defensive invariant between 2 independent systems | Core |
| TR-cc-007 | Persistence trigger: ONLY "Tạo slot mới", called once on first Processing entry; "Khóa slot" explicitly NOT owned here | Persistence |
| TR-cc-008 | Core Rule #6 full reset scope: EXP/level/alive/blocked-flag/affinity/canon-events/loadout all → defaults | Data/Core |
| TR-cc-009 | Non-destructive escape-hatch after `max_write_retry_before_escalation` consecutive failures | UI/Timing |
| TR-cc-010 | Cross-system UI split: Core UI owns affordance/layout, this system owns content/copy | UI |
| TR-cc-011 | NO timeout/auto-select — player may remain in Awaiting Choice indefinitely (deliberate) | Timing/Async |
| TR-cc-012 | Testing: BLOCKING, N=5 main fixture + N=0 boundary fixture, all 5 `ok(s)` mocked | Testing |

**Ownership**: Owns state machine, D.1/D.2 formulas, reset ORCHESTRATION (not target-system reset semantics), 3-path screen content. Exposes `continuation_choice_eligible`, `handoff_allowed`. Consumes `death_confirmed`(Death&Consequence), `is_death_turn`(TM), 5× `ok(s)` signals, Core UI taps.

**Key decisions**: `eligible=true` explicitly decoupled from transition (requires player tap). Persistence trigger split (Lock-Slot moved OUT to Death&Consequence; only Create-Slot here). `reset_completeness_check` redesigned float→integer-sum. **Two-layer lazy-init taxonomy (Layer A/B) is a NEW cross-cutting pattern this GDD introduces**, pushed as an obligation onto NPC Affinity + Setting&Canon's own ACs. No timeout — deliberate contrast to Death&Consequence's 1-turn Pending Fate window.

**Open**: Situation Gen has ≥3 Layer-B-class trackers but is NOT currently in `N=5` — pending resolution, `N` becomes 6 once fixed. Locked-path copy for Quỷ tu/Chuyển sinh unresolved.

---

### PRESENTATION LAYER

#### 14. Character Card & Identity (16 TRs) — Approved

| Req ID | Requirement | Domain |
|---|---|---|
| TR-cci-001 | 6 fixed-order content blocks (Hồ sơ/Stats+EXP/Equipment/Affinity+SongTu/InCombat/PermanentBadges), order never reorders | Data/UI |
| TR-cci-002 | `displayed_field(C,field)` total function, 4 mutually exclusive outputs (true/displayed/`"???"`/dual-identity) — pure, injectable | Data/Testing |
| TR-cci-003 | `displayed_estimate(C)` reuses Combat D.13 verbatim; propagates `"???"` all-or-nothing if any of 12 stats missing | Data |
| TR-cci-004 | `exp_to_next(C)` special-cases "Chờ Đột Phá"→sentinel string, not numeric 0 | Data |
| TR-cci-005 | `base_stat_completeness_check` fail-fast at record-creation; `base_HP0` strictly >0(denominator elsewhere) | Data |
| TR-cci-006 | Song Tu button renders only 2/5 states visible (Available/Active), others fully absent; Recovery=distinct square seal | UI |
| TR-cci-007 | Card open/close is FREE — never submits TM action, viewable in all 3 TM states | Core |
| TR-cci-008 | Song Tu/Recovery buttons submit via standard TM action path; also disabled by `in_combat` independently of TM lock | Core |
| TR-cci-009 | Cache invalidated when Undo reverts entity-record-creating turn (`card_exists` true→false) | Persistence/Data |
| TR-cci-010 | Knobs: `card_transition_ms`(200,0-400), `profile_text_max_length`(280,120-600), `stat_display_precision` | Performance |
| TR-cci-011 | Responsive: mobile=1-col+accordion (`FoldableContainer`, 4.5+) except block⑤ non-collapsible in-combat; desktop=2-col | UI/Engine |
| TR-cci-012 | Tap-name entry via `RichTextLabel` meta tag(4.4+); 4 interactive elements need `TOUCH_TARGET_MIN=44px`(shared w/ #15) | Engine/UI |
| TR-cci-013 | Godot 4.6 dual-focus: every interactive element needs mouse+keyboard focus testing — flagged for an ADR | Engine/Testing |
| TR-cci-014 | Owns 3 read-schemas: `base_X0`(seeds EXP), `npc_tag`(medium_override/concealment_hint), `concealment`; instance storage in Persistence's Entity Record | Data/Persistence |
| TR-cci-015 | All 5 formulas deterministic, 0-AI-call, 0-world-write pure functions, unit-testable via mocks | Testing |
| TR-cci-016 | AC-01-47 Unit BLOCKING; AC-40-45 Manual/UI ADVISORY | Testing |

**Ownership**: Owns card display schema+render-selection logic (D.1-D.5), `base_X0`, `npc_tag` schema, `concealment` schema. NOT storage (Persistence's Entity Record). Exposes `base_X0`→EXP, `npc_tag.medium_override`→Death&Consequence, `npc_tag.concealment_narrative_hint`→Contract Enforcement+AI/LLM Layer, `base_X(C)`/`max_HP(C)`→Combat/Death&Consequence/NPC Affinity, `card_exists`→Core UI, `card_transition_ms`→Core UI D.6. Consumes from EXP, Combat, Equipment, NPC Affinity, Setting&Canon, Death&Consequence, Situation Gen, World Memory, Character Continuation (all Hard).

**Visual Identity Anchor implementation (binding, not just art guidance)**: seal frame = reusable Theme/Control pattern for EVERY numeric+sentinel field (sentinels use IDENTICAL frame as real numbers — "a locked mechanical fact, just different content"); organic ink-blot = separate Control-style family for profile text. Red scoped to exactly 3 enumerated sources on the Card (loss-border/`alive=false` seal/blocked-flag), no new usage added. Jade-green absent from Card entirely (its one legal use is EXP's undesigned breakthrough moment).

**Open (4 remain, 5 closed 2026-08-11)**: investigation-mechanic for concealment reveal (Situation Gen, not designed). `Điểm_Kỹ_Năng`/`Điểm_Trang_Bị` no concealment slot yet (harmless while both default 0). Card-render cache architecture ownership → `/create-architecture`. Tap-name mechanism has NO declared owner even at spec level, spans AI/LLM Layer+Contract Enforcement → `/create-architecture`. **OQ #14 (newest)**: Entity Record durability timing — no guarantee a newly created record survives a crash between Persistence flush cycles → `/create-architecture`.

---

#### 15. Core UI/Screen Navigation (21 TRs) — Approved (systems-index.md's "Designed—Revised" note is STALE, GDD itself now reads Approved)

| Req ID | Requirement | Domain |
|---|---|---|
| TR-cusn-001 | 3-tier UI model: screen(5 states)/overlay(max 1 concurrent)/banner(max 1, FIFO, one preempt exception) | Core |
| TR-cusn-002 | `write_action_allowed(action,tm_state,screen)` — 46 combinations, pure total function | Core/Testing |
| TR-cusn-003 | `screen_transition_valid(from,to,ctx)` — closed/total over explicit 11-edge table | Core |
| TR-cusn-004 | Story Log pagination: `PAGE_SIZE`(20,10-50), `MAX_LOADED_PAGES`(3,2-5), `PREFETCH_THRESHOLD`(5,`<PAGE_SIZE`); O(1) memory bound | Performance/Timing |
| TR-cusn-005 | `get_turn_page(anchor_turn_id,count,direction)→{records,has_more}` — the World Memory interface locked 2026-08-04 | Timing/Async |
| TR-cusn-006 | S2 live window: `LIVE_WINDOW_TURNS`(30) default; full state machine incl. real node eviction (`RichTextLabel.remove_paragraph()`) | Performance/Timing |
| TR-cusn-007 | **`LIVE_WINDOW_TURNS`(#15)≥`CONTENT_EXCHANGE_ESTIMATE`(#7 Combat) — cross-GDD invariant, must jointly register at `/create-architecture`, same pattern as `card_transition_ms`** | Testing/Data |
| TR-cusn-008 | Touch-target: inline(best-effort padding) vs standalone(`TOUCH_TARGET_MIN=44px` hard, `MIN_ADJACENT_GAP_PX=4`) | UI |
| TR-cusn-009 | Font-scale(`S:0.875,M:1.0,L:1.25`)/2-col layout ONLY when `is_touch_primary=false`; touch-primary forces 1-col always | UI/Engine |
| TR-cusn-010 | Transition-duration family: `rank(banner)<settings<card<screen)` monotonic; `overlay_card` sourced from #14's `card_transition_ms` | Performance/Timing |
| TR-cusn-011 | Undo-button-disappear: dedicated alpha-fade signature, distinct from D.6's 4 tiers | UI |
| TR-cusn-012 | `app_config`(font+onboarding flag) stored OUTSIDE Persistence slot bundle — new ownership scope | Persistence |
| TR-cusn-013 | **Bidirectional fragility flagged in-GDD**: `card_transition_ms` tuned either direction can break #15's D.6 invariant — AC-27 CI check is the safety net | Testing/Data |
| TR-cusn-014 | ~~Safe-area insets need `JavaScriptBridge.eval()` reading CSS env() — requires custom HTML shell w/ `viewport-fit=cover`, stock template lacks it, fails SILENTLY~~ — **CORRECTED 2026-08-12, ADR-0007**: original text's `eval()` claim was wrong (conflicted with the project's own locked forbidden pattern). Real mechanism: custom HTML shell (still required) + `get_interface("window")` → `getComputedStyle()` → `getPropertyValue("--sat"...)`, zero `eval()`. | Engine |
| TR-cusn-015 | ~~Input-lock via recursive node disable — CONTESTED/unverified API (2-property 4.5+ PR claim vs project's own single-property doc); GDD refuses to arbitrate, mandates Editor verification before ADR~~ — **CLOSED 2026-08-12, ADR-0007**: verified directly against the pinned 4.6.stable binary via `ClassDB` introspection + runtime test — the 2-property claim was CORRECT (`mouse_behavior_recursive` + `focus_behavior_recursive`, independent enums); this project's own `ui.md` was the stale source, now corrected. | Engine |
| TR-cusn-016 | Screen-stack: must NOT use `change_scene_to_file/packed()`; Autoload `CanvasLayer`s per tier, cached not freed — but content nodes inside S2/S4 must be truly freed on eviction | Engine |
| TR-cusn-017 | Dual-focus testing required per element (Pressed/Hover/Focus/Disabled 4-channel) | Engine/Testing |
| TR-cusn-018 | Mobile virtual-keyboard avoidance mandatory for escalated delete-confirm | UI |
| TR-cusn-019 | Outbound TM action catalogue: 8 actions incl 3 ungated-by-tm_state (GAP-4) | Core |
| TR-cusn-020 | Testing: Unit BLOCKING for D.1-D.3b/D.6; Integration/Manual/Config ADVISORY | Testing |
| TR-cusn-021 | Combat architecturally constrained to NEVER self-trigger screen transition | Core |

**Ownership**: Owns screen/overlay/banner tiers+priority rules, `write_action_allowed`, `screen_transition_valid`, Story Log pagination, S2 live window, touch-target formulas, font-scale/layout, transition-duration family, `app_config`(new). Exposes entry points, TM action outflow, `two_column_layout()`. Consumes `tm_state`/`undo_available`/`is_death_turn`(TM), `get_turn_page`/`total_turns`(World Memory), slot metadata(Persistence), `continuation_choice_eligible`(Character Continuation), `card_exists`+`card_transition_ms`(Character Card), scene/menu content(Situation Gen), Pending Fate content(Death&Consequence, soft).

**Visual Identity Anchor implementation**: declares itself fully MONO — zero accent color on anything it owns (glyphs, chrome, banners); accent only appears when staging #14/#12 content. Explicit precedent split for "closed" state: list views (Save Slot, Story Log read-only) use desaturation(-40%), NOT red, even for `alive=false` entities — protects rarity mechanic from list-view dilution. Typography-as-icon (no icon assets) for nav glyphs「Thẻ」「Lục」「Mục」and concealment badge. Settings overlay is the ONE declared non-diegetic/flat exception in the whole UI.

**Open (12 items, 3 closed)**: ~~OQ#11 (elevated) — AccessKit confirmed native-desktop-only, non-functional on this project's sole HTML5 target; no accessibility solution chosen yet, demanded resolved BEFORE the shared `RichTextLabel`-meta-tag pattern locks into an ADR.~~ — **CLOSED 2026-08-12, ADR-0006**: Nhánh C (out-of-scope-MVP for tap-name/marginalia screen-reader support), 4 binding conditions, after independent `accessibility-specialist`/`godot-specialist` investigation confirmed ARIA overlay (HIGH risk) and standalone TTS (MEDIUM risk) both carry disproportionate cost for a partial, compliance-island result. OQ#12 — WCAG 200%-resize may be structurally unreachable if Web export locks `user-scalable=no`; needs a prototype. Self-flagged engine-doc conflict on the recursive-disable API (TR-cusn-015) — blocking for the input-lock ADR. `RichTextLabel` has no official per-meta-span bounding-rect API, relevant to whichever ADR picks shared-buffer vs Control-overlay hit-testing (confirmed by ADR-0006's `godot-specialist` investigation — absent, not merely undocumented).

**Cross-cutting registration requirement (explicit, confirmed in both GDDs)**: `LIVE_WINDOW_TURNS`(#15)≥`CONTENT_EXCHANGE_ESTIMATE`(#7) — must register jointly at `/create-architecture`, `systems-index.md` explicitly names this pattern (same as `card_transition_ms`/#14).

---

#### 16. Character Customization Mode (24 TRs) — Approved 2026-08-13, not yet implemented; **added to this baseline 2026-08-13 via `/architecture-review`** (was missing from the original 15-GDD Phase 0 pass — this system didn't exist yet)

| Req ID | Requirement | Domain |
|---|---|---|
| TR-ccm-001 | Device-level toggle (O-Set, new "Tùy chỉnh nhân vật" group), OUTSIDE slot bundle, default OFF | Persistence |
| TR-ccm-002 | `customize_panel_available` = D.1 5-way AND predicate (`toggle_enabled`, `screen=S2`, `tm_state=awaiting_action`, `NOT in_combat`, `NOT is_death_turn`); Rule #1b hidden-vs-dimmed mapping; live re-evaluate while O-Set open | Core |
| TR-ccm-003 | O-Customize is the 3rd overlay (`{O-Card,O-Set,O-Customize}`), max 1 concurrent — ADR-0007 amendment | Core |
| TR-ccm-004 | Write `level` only, never `tier`; `tier` always derives via registry `tier_from_level` | Data |
| TR-ccm-005 | 12 `base_X0` all-12-or-nothing write, pre-filled via `get_base_X0`; finite, `≤STAT_WRITE_MAX`, `HP>0`, rest `≥0`; `undefined` never coerced to `0.0` | Data |
| TR-ccm-006 | Custom item/skill/thức share original content's ID namespace (no prefix); per-namespace runtime uniqueness check; N≥1 thức/skill cardinality gate | Data |
| TR-ccm-007 | Checkpoint #3: write-through atomic to Persistence at commit — ADR-0002 D1b amendment (`persistence-save-system.md` Core Rule #1: 2→3 checkpoints) | Persistence |
| TR-ccm-007b | `turn_records` key widened `[slot_id,world_time,hack_seq]` so checkpoint #3 never overwrites the current turn's `locked_result`/`narration_text` | Persistence |
| TR-ccm-008 | Async commit sequencing: lock 3 Save buttons + delete buttons + Undo during in-flight window; all effects (apply, invalidate, flag, log, feedback) fire only after `committed()`; `failed()` changes nothing | Timing |
| TR-ccm-009 | First hack-write in an open Undo window calls `invalidate_pending_snapshot()` — ADR-0004 new interface, permanently locks prior turn's Undo | Cross-system |
| TR-ccm-010 | Every write (incl. delete) emits a mechanical-state-log entry labeled `hack_write`, outside the turn index | Cross-system |
| TR-ccm-011 | Permanent — no dedicated undo/revert; standard 1-turn Undo cannot touch a hack-write once its window is invalidated (Rule #6b) | Data |
| TR-ccm-012 | `hack_mode_used_this_slot` flag: set on first write, lives in slot bundle, never cleared/reset, OUTSIDE every system's `capture_snapshot()`/`restore_snapshot()`, persisted in the same write-through checkpoint as TR-ccm-007 | Persistence |
| TR-ccm-013 | Hard lock when `in_combat=true` (read from Combat System) | Cross-system |
| TR-ccm-014 | D.2b atomic `(level,current_exp,state)` triple write; no-op gate on unchanged `level`; bidirectional invariant at tier-boundary levels; `state="Chờ Đột Phá"` forbidden at non-boundary levels; absolute EXP ceiling at boundary levels | Data |
| TR-ccm-015 | Conditional delete (Rule #11): `entry.created_by_hack AND NOT referenced_in_world_memory(entry) AND` per-type condition (item: `NOT was_ever_equipped`; skill: `NOT was_ever_resolved_in_combat` + `known_skill_ids` removed same transaction; thức: `NOT has_parent_skill_alive`, cascade all-or-nothing) | Data |
| TR-ccm-016 | Panel operates only on the slot's active main-character `char_id` — no NPC-targeting UI | Data |
| TR-ccm-017 | `SUBMIT_DEBOUNCE_MS` per-button (3 Save buttons + delete buttons independently), blocks double-tap races | Timing |
| TR-ccm-018 | Downstream constraint: no system may infer "valid progression" from hack-written `tier`/`level`; hack-injected values are ground truth to all gameplay logic, no "fake" flag tracked mechanically | Cross-system |
| TR-ccm-019 | Progress-gate bypass is intentional: hack level-write skips `breakthrough_requirement_met` and `death_and_consequence_blocked` | Cross-system |
| TR-ccm-020 | Force-close discards draft with no warning — defensive-only path, not reachable via real gameplay (D.1 note) | UI |
| TR-ccm-021 | Keyboard/focus: full Tab traversal, Enter submits the focused zone, two-tier Esc/tap-outside dismissal when a field has focus | UI |
| TR-ccm-022 | `TOUCH_TARGET_MIN=44px` (registry constant) for every field/button, no panel-specific exception | UI |
| TR-ccm-023 | Knobs: `LEVEL_WRITE_MAX`(1,000,000; 1,000–10,000,000), `STAT_WRITE_MAX`(1e9; 1e6–1e12), `SUBMIT_DEBOUNCE_MS`(500ms; 200–1000ms), `hack_mode_toggle_default`(false, fixed) | Data |
| TR-ccm-024 | A slot with `hack_mode_used_this_slot=true` is excluded as a data source for MVP/Vertical Slice validation layers requiring a clean playthrough | Data |

**Ownership**: Owns a self-contained write lifecycle bypassing Turn Manager entirely (D.1/Rule #6), `hack_mode_used_this_slot`, `LEVEL_WRITE_MAX`/`STAT_WRITE_MAX`/`SUBMIT_DEBOUNCE_MS` knobs. Exposes no new read API of its own — writes land directly in EXP&Realm's/Character Card's/Equipment&Skill's own owned fields, gated by its own D.1-D.5 formulas. Consumes `tm_state`/`in_combat`/`is_death_turn` (TM/Combat, gate-only reads), `get_base_X0` (Character Card, pre-fill).

**Key decisions**: A 3rd, fully independent write-lifecycle — not a Turn Manager action, not staged/deferred like every other write path in the game. Cross-system integration was folded into 4 EXISTING ADRs (0002/0004/0005/0007) rather than a new ADR of its own, since none of its 4 interface points introduce a genuinely new engine-risk domain — each rides a mechanism those ADRs had already engine-verified. `/architecture-review` (2026-08-13) found 2 BLOCKING correctness gaps in exactly one of those 4 points (ADR-0002 D1b's `hack_seq` key extension) — both patched into that ADR the same session.

**Open**: 8-item GDD/registry prose-sync backlog (persistence-save-system.md Core Rule #1 text, turn-manager.md `undo_availability_window` conjunct, core-ui-screen-navigation.md AC-59a/59b, equipment-skill-data-system.md markers, world-memory-context-management.md interface mirror, entities.yaml `referenced_by` housekeeping, this GDD's own D.5 coroutine-contagion note, ADR-0002 D6 trigger-list wording) — tracked in `production/session-state/active.md`, not yet executed. `/ux-design` for O-Customize not yet run (Open Question #6 of the GDD).

---

## Cross-Cutting Findings (consolidated across all 6 research passes)

### Undeclared dependency edges (real, but Systems Enumeration table intentionally left unedited per project precedent — do not re-open Approved GDDs, but the architecture's ownership map must reflect the true edges)

- Turn Manager → Contract Enforcement, AI/LLM Integration Layer, World Memory, Persistence (4 edges, TM's own row stays "Depends On: —")
- Equipment & Skill Data → Persistence (this GDD doesn't declare it despite being a hard dependent)
- Combat, EXP & Realm Progression, Death & Consequence → Persistence (3 more one-way gaps, same pattern)
- AI/LLM Integration Layer ↔ World Memory: reverse edge points at `ai_context_hard_token_budget`, a value that **does not actually exist** in either source GDD — genuine gap, not just undocumented edge

### Interlocking tuning constants requiring joint registration (architecture.yaml-style)

1. **`FATIGUE_WINDOW_TURNS`(NPC Affinity) ≥ `POSITIVE_SOCIAL_COOLDOWN_TURNS`(Situation Gen)** — explicit mandatory invariant, dedicated AC-16b.
2. **`AMBIENT_ENCOUNTER_CHANCE` ↔ `NPC_INITIATED_WINDOW_CAP`/`WINDOW_TURNS` ↔ `RESCUE_COOLDOWN_TURNS` ↔ `POSITIVE_SOCIAL_COOLDOWN_TURNS`** (Situation Gen, 4-way cluster, economy-derivation-gated per coordination-rules.md, confirmed round 1 2026-08-10).
3. **`LIVE_WINDOW_TURNS`(Core UI) ≥ `CONTENT_EXCHANGE_ESTIMATE`(Combat)** — HARD dependency discovered review rounds 4-5, explicitly flagged for `technical-director` joint registration.
4. **`card_transition_ms`(Character Card) ↔ Core UI's D.6 duration-family monotonic invariant** — bidirectionally fragile, flagged in-GDD, AC-27 is the CI safety net.
5. **`max_entities_per_prompt`(World Memory) ≥ `MAX_NPC_PER_SCENE`+1(Situation Gen)** — explicit invariant.
6. `deep_hostility_threshold=-80` — locked constant (not tunable), consumed by ≥3 systems (NPC Affinity/Death&Consequence/Combat), worth one named registry entry rather than 3 literals.
7. (Explicitly ruled OUT of the amendment) Death & Consequence's `crippled_layer`/`FLOOR_TOTAL` — reuses Combat's existing machinery, not a new pair.

### Required New ADRs (signals collected from all 6 reports — full prioritized list to be finalized in Phase 6)

- **AI/LLM Integration Layer** — no ADR exists; backend formalization, fallback model list, mandatory HTTP referrer restriction, engine-level HTTPRequest re-verification, `ai_context_hard_token_budget` definition, zombie-request billing measurement.
- **World Memory RAM residency / sync-vs-async** — IDBFS/MEMFS conflicts with Core UI's synchronous `get_turn_page`/`total_turns()` assumption.
- **Turn Manager's Undo rollback mechanism** (deferred-commit vs inverse-ops) + `turn_snapshot` schema/ownership.
- **Core UI's input-lock recursive-disable API** — contested engine claim, needs Editor verification before locking.
- **Core UI's screen-stack architecture** — pre-loaded with 2 mandatory warnings (no `change_scene_to_file`, safe-area custom HTML shell).
- ~~**Character Card's tap-name-to-card mechanism** — no declared owner, spans AI/LLM Layer + Contract Enforcement.~~ — **DONE 2026-08-12, ADR-0006**
- **Character Card's Entity Record durability timing** (OQ #14) — crash-window gap vs Persistence's periodic flush.
- Possible: NPC Affinity / Setting & Canon / EXP & Realm Progression follow-on ADRs extending ADR-0001's DI/pure-function ruling, if their eventual implementation review shows the same defect-density pattern Combat did (not yet triggered, per ADR-0001's own "Enables" section).

### Implemented vs. Approved-not-yet-built (affects how the architecture doc should treat each system)

| System | Status | Treatment |
|---|---|---|
| Combat System | Implemented, ADR-0001 Accepted | Already-built reference module — describe existing structure |
| Persistence / Save System | ADR-0002 Accepted, not yet coded | Finalized contracts (StorageBackend, get_blob) — cite directly, do not re-derive |
| All other 13 systems | Approved (GDD), no code | Build following spec — GDD is sole authority |

---

## Phase 1: System Layer Map

**Approach**: reuses the project's own 4-layer taxonomy from `systems-index.md`
(Foundation → Core → Feature → Presentation — already reviewed across many design
sessions, every GDD cross-references it) rather than forcing the skill's generic
5-layer template verbatim, since that template's "CORE LAYER ← physics, input,
combat, movement" framing doesn't fit a physics-free, turn-based text RPG. A
**Platform Layer** is added beneath Foundation for the engine/browser substrate
that no GDD system owns.

### PLATFORM LAYER (infrastructure — no owning GDD system)

Godot 4.6 engine, Web/HTML5 export (nothreads variant), browser APIs accessed via
`JavaScriptBridge` (IndexedDB, Web Locks, HTTPRequest/fetch, StorageManager).
⚠️ **HIGH RISK** (Web Export domain, per Phase 0).

### FOUNDATION LAYER (zero external dependencies — everything else plugs into these)

| System | Owns | Module Boundary | Engine Risk |
|---|---|---|---|
| Turn Manager / Core Game Loop | Turn state machine, `world_time`, `undo_available`, `calls_per_turn` | `src/core/turn_manager/` | ⚠️ MEDIUM — HTTPRequest Web threading behavior unverified (calls into AI/LLM Layer) |
| Mechanic/Narration Contract Enforcement | Enforcement pipeline contract (no state machine) + leak-detection telemetry | `src/core/contract_enforcement/` | LOW |
| Equipment & Skill Data System | Weapon/skill/thức schema+data, per-`char_id` ownership records | `src/core/equipment_skill_data/` | LOW |

### CORE LAYER (engine-integration / save-load / event-bus systems — matches skill's Foundation-layer *definition*, kept under the project's own "Core" name for consistency with existing docs)

| System | Owns | Module Boundary | Engine Risk |
|---|---|---|---|
| AI/LLM Integration Layer | Outbound call surface, prompt pipeline, retry/fallback state machine | `src/ai/` | 🔴 HIGH — Web Export Group A (HTTPRequest/CORS/timeout); **no ADR yet** |
| World Memory & Context Management | Full Narrative Log, Extracted Facts store, AI Context View | `src/core/world_memory/` | 🔴 HIGH — RAM residency / sync-vs-async on Web export unresolved (Required New ADR) |
| Persistence / Save System | Save/load transaction, `schema_version` gate, slot lifecycle, blob registry | `src/core/persistence/` | 🔴 HIGH — Web Export Group B, but **ADR-0002 Accepted**, contracts finalized |

### FEATURE LAYER (gameplay mechanics + narrative-generation systems)

| System | Owns | Module Boundary | Engine Risk |
|---|---|---|---|
| Combat System | Exchange resolution D.1–D.14, `locked_result` schema | `src/gameplay/combat/` (**existing, implemented**) | LOW — settled, ADR-0001 Accepted |
| EXP & Realm Progression | `level`/`tier`, EXP accumulator, breakthrough state machine | `src/gameplay/exp_realm/` | LOW |
| NPC Affinity & Relationship | Affinity table, event→delta pipeline, Song Tu state machine | `src/gameplay/npc_affinity/` | LOW |
| Setting & Canon Integration | Event state machine, cascade/fixpoint resolution | `src/gameplay/setting_canon/` | LOW |
| Situation/Encounter Generation | `scene` struct, hook scheduler, envelope menu | `src/gameplay/situation_encounter/` | LOW |
| Death & Consequence | `alive`/`death_flag` (single-writer, ALL characters), `pending_fate` | `src/gameplay/death_consequence/` | LOW |
| Character Continuation | Continuation state machine, reset orchestration | `src/gameplay/character_continuation/` | LOW |
| Character Customization Mode *(hệ #16, added 2026-08-13)* | `level`/12-`base_X0`/custom-item-skill-thức write path (bypasses Turn Manager entirely — a 3rd, self-contained write lifecycle, see D.1/Rule #6), `hack_mode_used_this_slot` flag | `src/gameplay/character_customization/` | LOW — no new engine-risk domain of its own; its 4 cross-system interface points (checkpoint #3, `invalidate_pending_snapshot()`, `referenced_in_world_memory()`, `OverlayStack` widening) already ride ADR-0002/0004/0005/0007's existing engine-verified mechanisms. 2 BLOCKING correctness findings surfaced against ADR-0002 D1b during `/architecture-review` 2026-08-13 (IndexedDB range-scan bound width, `hack_seq` rehydration) — both patched into that ADR the same session, see `architecture-review-2026-08-13.md`. |

### PRESENTATION LAYER

| System | Owns | Module Boundary | Engine Risk |
|---|---|---|---|
| Character Card & Identity | Card display schema + render-selection D.1–D.5 | `src/ui/character_card/` | ⚠️ MEDIUM — 4.6 dual-focus, `FoldableContainer`(4.5+), `RichTextLabel` meta tag(4.4+) |
| Core UI/Screen Navigation | Screen/overlay/banner tiers, `write_action_allowed`, pagination | `src/ui/screen_navigation/` | 🔴 HIGH — dual-focus + 2 contested/unverified engine APIs (input-lock, safe-area insets) |

**Note on `src/networking/`**: `directory-structure.md` reserves this bucket, but
the project has no traditional multiplayer networking — the one network-touching
system (AI/LLM Integration Layer's `HTTPRequest` calls) is placed under `src/ai/`
instead, since its concerns (prompt construction, retry semantics, model fallback)
are AI-integration-specific, not generic networking. `src/networking/` stays
reserved/unused unless a future need arises.

**Approved by user 2026-08-12.**

## Phase 2: Module Ownership Map

### FOUNDATION LAYER

| Module | Owns | Exposes | Consumes | Engine APIs |
|---|---|---|---|---|
| Turn Manager | turn state machine, `world_time`, `undo_available`, `calls_per_turn`, `turn_snapshot`(schema open) | `turn_id`, `locked_result`, `world_time`, `undo_available`, `is_death_turn` | `locked_result`(Feature systems), narration/suggestions(AI/LLM Layer), `durability_confirmed`(Persistence, hard gate), history(World Memory) | Signals/coroutines (`await`), injected `RandomNumberGenerator` |
| Contract Enforcement | enforcement pipeline contract, leak-detection telemetry (`V`/`T`/`leak_*`) | wrapper-interface requirement (to AI/LLM Layer), leak diagnostics (QA) | `locked_result`(triggering system), `narration_text`(AI/LLM Layer), undo status(TM) | `RegEx` (regex engine) |
| Equipment & Skill Data | weapon/skill/thức schema+data, per-`char_id` ownership records, Recovery Item catalog | `weapon.tier`/`skill.tier`/thức list(→Combat), `equipped_weapon_id`/`known_skill_ids`(→Character Card) | — (zero declared upstream) | `Resource`/Dictionary-backed lookups |

### CORE LAYER

| Module | Owns | Exposes | Consumes | Engine APIs |
|---|---|---|---|---|
| AI/LLM Integration Layer | outbound call surface, prompt pipeline, retry/fallback state machine, API-key storage | `request_ai(call_type, payload)` | `locked_result`+context(callers), `allowed_envelope_menu`(Situation Gen), `style_descriptor`(Equipment), `concealment_narrative_hint`(Character Card), timing constants(TM registry) | ⚠️`HTTPRequest`(`use_threads=false`,`process_mode=ALWAYS`), child `Timer`, `JSON.stringify/parse_string`, `Time.get_unix_time_from_system()` |
| World Memory & Context Management | Full Narrative Log, Extracted Facts store, AI Context View | `get_turn_page`, `get_turn`, `get_processing_state`, `get_facts_by_entity`, `total_turns()` | confirm/undo(TM), `importance_tier`(Setting&Canon), `ai_context_hard_token_budget`(AI/LLM Layer — **undefined gap**) | Dictionary/Array data structures — no direct Web API itself |
| Persistence / Save System | save/load transaction, `schema_version` gate, slot lifecycle, opaque blob registry | `StorageBackend`(`stage/commit/abort`), `get_blob()` contract, lock acquire/release, 9a/9b export | write-triggers(TM), Full Log+Context View blobs(World Memory, mandatory), blobs(every Feature system) | ⚠️`JavaScriptBridge.get_interface/create_object/create_callback` (never `eval`), IndexedDB, `navigator.locks`, `Marshalls.raw_to_base64/base64_to_raw`, `OS.has_feature("web")` |

### FEATURE LAYER

| Module | Owns | Exposes | Consumes | Engine APIs |
|---|---|---|---|---|
| Combat System | D.1–D.14 formulas, `locked_result` schema, `in_combat`/`battle_active`/`exchange_id` | `outcome`, `hp_after`, `battle_active`, `combat_power_estimate` | `tier(C)`(EXP), `base_X(C)`(Character Card), thức data(Equipment), `death_and_consequence_blocked`(Death&Consequence) | `RandomNumberGenerator`(injected last-param), `RefCounted`(`Combatant`) |
| EXP & Realm Progression | `level`/`tier`(derived), EXP accumulator, breakthrough state machine | `level(C)`, `tier(C)` | Combat hand-off(hard,2-way), `song_tu_relationship_active_npc_ids`(NPC Affinity), `breakthrough_requirement_met`(Setting&Canon,hard) | Pure GDScript, structured `EXP_ERROR_*` codes (no `assert()` — stripped in release Web) |
| NPC Affinity & Relationship | `affinity` table, event→delta pipeline, Song Tu state machine, `link_strength` graph | `affinity_delta_[npc_id]`, deep-hostility flag, `song_tu_relationship_active_npc_ids` | Combat hand-off(hard), `kill_witnessed`+`-80`flag(Death&Consequence), classified events(Situation Gen,soft) | Pure GDScript |
| Setting & Canon Integration | `status(E)` state machine, `downstream_index`, `importance_tier` table | `canon_due_payload`, `canon_role_npcs`, `rescue_window_final`, `breakthrough_requirement_met` | `alive(X)`(Death&Consequence), affinity predicates(NPC Affinity), `location(X)`(Situation Gen) | Pure GDScript (DFS/graph algorithms in-code) |
| Situation/Encounter Generation | `scene`+`active_hook`, `entities_in_scope`, `allowed_envelope_menu`, presence/cooldown trackers | `entities_in_scope`, classified events, `canon_role_rescue` resolved `char_id` | `canon_due_payload`(Setting&Canon), classified data(NPC Affinity), `alive(X)`(Death&Consequence) | `RandomNumberGenerator`(seeded `"ambient"` stream) |
| Death & Consequence | `alive`/`death_flag`(ALL characters), `death_and_consequence_blocked`, `pending_fate` | `alive(X)`, `is_death_turn`, `kill_witnessed`, "Khóa slot" trigger | Combat hand-off, `max_HP(C)`(Character Card), `affinity(opponent)`(NPC Affinity) | `RandomNumberGenerator`(`death_roll`) |
| Character Continuation | continuation state machine, reset orchestration | `continuation_choice_eligible`, `handoff_allowed` | `death_confirmed`(Death&Consequence), `is_death_turn`(TM), 5×`ok(s)` signals | Pure GDScript, calls Persistence "Tạo slot mới" |
| Character Customization Mode *(hệ #16)* | `level`/12-`base_X0`/custom item-skill-thức write path (self-contained lifecycle, NOT orchestrated by Turn Manager), `hack_mode_used_this_slot` | writes into EXP&Realm/Character Card/Equipment&Skill's own owned fields directly (D.1-D.5 formulas gate the write, not a new exposed read API of its own) | `tm_state`/`in_combat`/`is_death_turn`(TM/Combat, gate only), `get_base_X0`(Character Card, pre-fill) | `invalidate_pending_snapshot()`(ADR-0004), `referenced_in_world_memory()`(ADR-0005), 3rd Persistence checkpoint via `[slot_id,world_time,hack_seq]`(ADR-0002 D1b), `OverlayStack`'s 3rd overlay slot(ADR-0007) — reuses 4 already-engine-verified mechanisms, introduces none of its own |

### PRESENTATION LAYER

| Module | Owns | Exposes | Consumes | Engine APIs |
|---|---|---|---|---|
| Character Card & Identity | card display schema+render-selection D.1–D.5, `base_X0`/`npc_tag`/`concealment` schemas | `base_X0`(→EXP), `card_exists`(→Core UI), `card_transition_ms`(→Core UI D.6) | EXP, Combat, Equipment, NPC Affinity, Setting&Canon, Death&Consequence, Situation Gen, World Memory, Character Continuation (all Hard) | ⚠️`Control`, `RichTextLabel` meta tag(4.4+), `FoldableContainer`(4.5+), Theme resources |
| Core UI/Screen Navigation | screen/overlay/banner tiers, `write_action_allowed`, `screen_transition_valid`, pagination, `app_config`(new) | entry points, TM action outflow, `two_column_layout()` | `tm_state`(TM), `get_turn_page`/`total_turns`(World Memory), slot metadata(Persistence), `card_exists`+`card_transition_ms`(Character Card) | 🔴`Control`/`CanvasLayer`(Autoload pattern, never `change_scene_to_file`), dual-focus properties(4.6), `RichTextLabel.remove_paragraph()`, contested input-lock API, `JavaScriptBridge.eval()`(safe-area insets, needs custom HTML shell) |

### Dependency Diagram (layer-level; see tables above for detailed edges)

```
┌──────────────────────────────────────────────────────────────────┐
│ PRESENTATION — Character Card & Identity   Core UI/Screen Nav     │
└───────────────────────────┬────────────────────────────────────--┘
                             │ reads (all Feature + Core layers)
┌────────────────────────────▼───────────────────────────────────--┐
│ FEATURE — Combat ─► EXP&Realm ─► NPC Affinity ─► Setting&Canon    │
│           │                                                       │
│           └─► Death&Consequence ─► Character Continuation         │
│           Situation/Encounter Generation (scene+hook orchestrator)│
└───────────────────────────┬────────────────────────────────────--┘
                             │ writes locked_result via TM;
                             │ reads world_time/tm_state
┌────────────────────────────▼───────────────────────────────────--┐
│ CORE — AI/LLM Integration Layer   World Memory   Persistence      │
└───────────────────────────┬────────────────────────────────────--┘
                             │ orchestrated by
┌────────────────────────────▼───────────────────────────────────--┐
│ FOUNDATION — Turn Manager (event bus) ── Contract Enforcement     │
│              Equipment & Skill Data (static data)                 │
└───────────────────────────┬────────────────────────────────────--┘
                             │
┌────────────────────────────▼───────────────────────────────────--┐
│ PLATFORM — Godot 4.6 Web export, JavaScriptBridge, browser APIs   │
└──────────────────────────────────────────────────────────────────┘
```

**Engine-risk highlights**: 🔴 HIGH-risk API touches concentrate in AI/LLM Layer,
Persistence, and Core UI (input-lock + safe-area insets — both explicitly
*contested/unverified* per the GDD, need direct Editor verification before an ADR
locks the pattern).

**Approved by user 2026-08-12.**

## Phase 3: Data Flow

This game is turn-based, not real-time — the 4 required scenarios are reinterpreted
for a turn-based architecture rather than a per-frame one.

### 3.1 Turn Resolution Path (equivalent of "frame update path")

The single most important data flow in the whole architecture — consolidates the
resolve-order notes scattered across multiple GDDs (stated most explicitly by
Situation/Encounter Generation: "fixed cross-system resolve order Combat/Death→NPC
Affinity→Canon→EXP"):

```
Player (Core UI) ─submit_action──► Turn Manager: Awaiting Action → Resolving
                                          │
                                          ▼
                          Situation/Encounter Gen: classify action → envelope
                                    (deterministic, 0 AI call)
                                          │
                          ┌───────────────┴────────────────┐
                          ▼ combat_challenge                ▼ other envelopes
                    Combat System                  NPC Affinity / Setting&Canon /
                 resolve_exchange()                Situation Gen (move_to/investigate)
                 → locked_result.outcome                    │
                          │                                  │
                          └──────────────┬───────────────────┘
                                          ▼
        FIXED RESOLVE ORDER: Combat → Death&Consequence → NPC Affinity
                              → Setting&Canon → EXP&Realm Progression
                    (every system merges fields into ONE shared locked_result dict —
                     Contract Enforcement TR-017: never split across multiple AI calls)
                                          │
                                          ▼
                    Turn Manager ──► AI/LLM Integration Layer
                              request_ai(narration_call, {locked_result, context})
                    [Contract Enforcement wraps this call in its 5-checkpoint pipeline]
                                          │  (ASYNC — HTTPRequest, retry/fallback possible)
                                          ▼
                              narration_text (verbatim, never parsed back)
                                          │
                                          ▼
                    Contract Enforcement: Numeric Leak Detection (post-hoc, 0 AI call)
                                          │
                                          ▼
                World Memory: write turn record {turn_id,action,locked_result,
                              narration_text,world_time} + rule-based fact extraction
                                          │
                                          ▼
                    Persistence: stage(blobs from EVERY registered system) → commit()
                              → IndexedDB transaction.oncomplete
                                          │  (ASYNC — Web Locks holds tab, IDB transaction)
                                          ▼
                    durability_confirmed=true ──► Turn Manager: Resolving → Turn Confirmed
                                          │
                                          ▼
                    Presentation (Core UI + Character Card) re-renders from new state
```

**The only 2 genuine async cut-points** (everything else is a synchronous call chain
within one pass): (a) AI/LLM Layer's `HTTPRequest` — network, retry/backoff/fallback
possible; (b) Persistence's `commit()` — IndexedDB transaction, resolves via
`committed`/`failed` signal, never returns synchronously.

### 3.2 Event/Signal Path

This architecture is **primarily a direct-call chain** (Turn Manager orchestrates
sequentially within one turn), NOT a loose event bus — Contract Enforcement demands
strict lock ordering (compute→lock→narrate). Only 2 places genuinely use
signal/async communication:

| Signal | Producer | Consumer | Data |
|---|---|---|---|
| `committed(world_time)` / `failed(error_code)` | Persistence `StorageBackend` | Turn Manager (gate) | Commit result — Turn Manager `await`s it |
| `death_confirmed` | Death & Consequence | Character Continuation | Triggers `continuation_choice_eligible` |
| AI/LLM `request_ai()` resolution | AI/LLM Integration Layer | Turn Manager | `narration_text` or `Failed(error_code)`/`BUSY` |

Everything else (Combat→EXP, Death&Consequence→NPC Affinity, etc.) is a **direct
function call within the same synchronous Resolving pass** — not a signal — to
avoid race conditions between systems writing the same turn's `locked_result`.

### 3.3 Save/Load Path

**Write (finalized via ADR-0002)**: every registered system implements
`get_blob() -> {status, bytes: String}` (atomic, TOCTOU-safe) → Persistence
`stage(blobs[])` gathers → `commit()` → one IndexedDB transaction → `oncomplete`.

**Read (gap to close in Phase 4)**: no GDD has yet named the symmetric load-side
interface (a `set_blob(bytes: String)`-equivalent) — every system currently only
has an obligation to *export* a blob, not a standard contract for *re-hydrating*
from one. Flagged to finalize in Phase 4 (API Boundaries).

**Ownership split**: Persistence owns the transaction + slot lifecycle but is
opaque to blob content — each system serializes its own state. World Memory's Full
Log + AI Context View is a MANDATORY blob (not optional/reconstructable). The
Entity Record (permanent character data: `base_X0`, `npc_tag`, `concealment`) is
owned directly by Persistence, not World Memory.

### 3.4 Initialization Order

```
1. Platform: Godot 4.6 Web export runtime boots
2. Persistence: opens IndexedDB connection (game_persistence v1), checks schema_version
3. Equipment & Skill Data: loads static content pack (weapon/skill/thức) into memory
4. Setting & Canon Integration: loads setting-pack static data + load-time DAG
   validation (CASCADE_MAX_DEPTH, dependency_order — rejects if invalid)
5. World Memory: hydrates Full Narrative Log + AI Context View from Persistence blob
   (existing save) or empty state (new game)
6. Turn Manager: determines initial state (Awaiting Action) from hydrated/new data
7. AI/LLM Integration Layer: loads config (apiMode, model fallback list) — no
   save-dependent boot state
8. Feature systems (Combat/EXP/NPC Affinity/Death&Consequence/Situation Gen/
   Character Continuation): hydrate per-character/per-NPC state from the Entity
   Record + each system's own blob
9. Presentation: renders initial screen (Save Slot Screen if no active slot,
   otherwise Main Play S2)
```

Note: step 3's `is_valid_dataset` CI gate is a build/CI-time check, NOT a runtime
boot step — step 3 here is only loading data that already passed the gate earlier.

**Approved by user 2026-08-12.**

## Phase 4: API Boundaries

Interfaces below are GDScript pseudocode — the contracts programmers implement
against. Combat and Persistence already have FINALIZED interfaces (ADR-0001/0002),
cited verbatim, not re-derived. **Engine-awareness**: every `extends
Node/RefCounted/Control` below is unchanged foundational API across 4.4→4.6 (LOW
RISK) — no per-interface verification needed beyond what Phase 0/1/2 already flagged.

### FOUNDATION LAYER

```gdscript
## Turn Manager
class_name TurnManager extends Node
signal turn_confirmed(turn_id: int, is_death_turn: bool)
signal turn_undone(turn_id: int)
signal state_changed(new_state: StringName)  # Awaiting Action|Resolving|Turn Confirmed|Undoing
func submit_action(action: Dictionary) -> void   # only valid when state==Awaiting Action
func request_undo() -> void                       # only valid when undo_available
func get_state() -> StringName
func is_undo_available() -> bool
```
Invariant callers must respect: never call `submit_action` while `state != Awaiting
Action` (UI checks `write_action_allowed` first — Core UI D.1 owns this check).
Guarantee: `turn_confirmed` fires ONLY after Persistence reports
`durability_confirmed=true`.

```gdscript
## Contract Enforcement — not a class with instance state, a call-path constraint
static func check_narration_call_precondition(locked_result: Dictionary) -> bool
static func detect_numeric_leak(locked_result: Dictionary, narration_text: String) -> Dictionary
```
Guarantee: every `narration_call`/`suggestion_call` site provably (CI grep) routes
through AI/LLM Layer's single wrapper.

```gdscript
## Equipment & Skill Data
class_name EquipmentSkillData extends Node
func get_weapon(weapon_type: StringName) -> Dictionary
func get_skill(skill_id: StringName) -> Dictionary
func get_known_skills(char_id: StringName) -> Array[StringName]
func get_equipped_weapon(char_id: StringName) -> StringName
func is_valid_dataset() -> bool   # CI gate, Formula 2
```

### CORE LAYER

```gdscript
## AI/LLM Integration Layer
class_name AILLMIntegrationLayer extends Node
## call_type: &"narration_call" | &"suggestion_call" | &"suggestion_retry_call"
func request_ai(call_type: StringName, payload: Dictionary) -> Variant
    # returns: String(narration_text) | Array[Dictionary](4x{text,envelope}) |
    #          {error_code} on Failed | {error_code:&"BUSY"} if state != Idle
```
Invariant: `narration_call` payload MUST include `locked_result` — 0 HTTP calls
fire otherwise. Resubmit-after-Failed MUST reuse the exact same `locked_result`.
Guarantee: never exceeds `ai_call_timeout_seconds`; rejects immediately (BUSY) if a
call is already in flight.

```gdscript
## World Memory
class_name WorldMemory extends Node
func get_turn_page(anchor_turn_id: int, count: int, direction: StringName) -> Dictionary  # {records,has_more}
func get_turn(turn_id: int) -> Dictionary
func get_processing_state(turn_id: int) -> Dictionary
func get_facts_by_entity(entity_id: StringName) -> Array[Dictionary]
func total_turns() -> int                          # O(1)
func build_ai_context_view() -> Dictionary          # {context, over_budget} — Formula #5, never throws
```

```gdscript
## Persistence — FINALIZED via ADR-0002, cited verbatim
@abstract class_name StorageBackend extends RefCounted
signal committed(world_time: int)
signal failed(error_code: StringName)
@abstract func stage(blobs: Array[Dictionary]) -> void
@abstract func commit() -> void
@abstract func abort() -> void
@abstract func acquire_slot_lock(slot_id: int) -> bool
@abstract func release_slot_lock(slot_id: int) -> void

## Per-system blob contract (every registered system implements):
## get_blob() -> {status: StringName, bytes: String}
## NEWLY PROPOSED (Phase 4 — closes Phase 3.3's gap): symmetric load-side contract —
## load_blob(bytes: String) -> {status: StringName}, called once per system when
## Persistence finishes loading, in the SAME registration order as get_blob().
```

### FEATURE LAYER

```gdscript
## Combat System — ALREADY IMPLEMENTED, cited from src/gameplay/combat/, ADR-0001
static func resolve_exchange(A: Combatant, B: Combatant, action_type_of: Callable,
        thuc_id_of: Callable, player_id: StringName, rng: RandomNumberGenerator) -> Dictionary
    # returns locked_result: {exchange_id,first_id,second_id,per_actor,battle_active,outcome}
```

```gdscript
## EXP & Realm Progression
class_name ExpRealmProgression extends Node
func process_character_turn(char_id: StringName, turn: Dictionary) -> Dictionary
    # orchestrator: try_execute_breakthrough() THEN resolve_turn_exp()
func resolve_turn_exp(self_id: StringName, turn: Dictionary) -> Dictionary
func try_execute_breakthrough(self_id: StringName, turn: Dictionary) -> bool
func get_level(char_id: StringName) -> int
func get_tier(char_id: StringName) -> int   # DERIVED, never stored independently
```

```gdscript
## NPC Affinity & Relationship
class_name NpcAffinity extends Node
func resolve_turn_affinity(turn: Dictionary) -> Dictionary   # affinity_delta_[npc_id]* fields
func get_affinity(npc_id: StringName) -> int
func is_deep_hostility(npc_id: StringName) -> bool           # affinity<=-80, derived
func get_active_song_tu_npc_ids() -> Array[StringName]       # NOT a bool SONG_TU_ACTIVE
```

```gdscript
## Setting & Canon Integration
class_name SettingCanonIntegration extends Node
func resolve_turn_canon(turn: Dictionary) -> Dictionary
func transition_event_status(event_id: StringName, proposed: StringName, source: StringName) -> bool  # SINGLE WRITER
func canon_due_payload(turn: Dictionary) -> Array[Dictionary]
func canon_role_npcs(location_id: StringName) -> Array[StringName]
func rescue_window_final(event_id: StringName) -> bool
func breakthrough_requirement_met(tier: int) -> bool
```

```gdscript
## Situation/Encounter Generation
class_name SituationEncounterGeneration extends Node
func lock_scene(turn: Dictionary) -> Dictionary   # {location_id,entities_in_scope,scene_tags,active_hook}
func classify_action(input: Variant) -> Dictionary  # {envelope,...} deterministic, 0 AI call
func get_allowed_envelope_menu(turn: Dictionary) -> Array[StringName]
```

```gdscript
## Death & Consequence
class_name DeathAndConsequence extends Node
func resolve_combat_outcome(outcome: Dictionary, turn: Dictionary) -> Dictionary  # Branch A/B
func is_alive(char_id: StringName) -> bool
func is_blocked(char_id: StringName) -> bool     # death_and_consequence_blocked
signal death_confirmed(char_id: StringName)
```

```gdscript
## Character Continuation
class_name CharacterContinuation extends Node
func is_continuation_eligible(turn: Dictionary) -> bool   # is_death_turn AND death_confirmed
func start_new_playthrough() -> void   # only 1 functional path: "Chơi lại"
func get_reset_completeness() -> Dictionary  # {ok_count, N, complete}
```

```gdscript
## Character Customization Mode (hệ #16, added 2026-08-13) — NOT orchestrated by
## Turn Manager; self-contained write lifecycle (D.1/Rule #6). Each func below is
## one independent atomic transaction (one Persistence checkpoint-#3 write each).
class_name CharacterCustomizationMode extends Control
func is_panel_available(toggle_enabled: bool, screen: StringName, tm_state: StringName,
        in_combat: bool, is_death_turn: bool) -> bool          # D.1, pure predicate
func submit_progress(level: int, current_exp: float, state: StringName) -> void
    # D.2b-gated atomic (level,current_exp,state) triple write
func submit_base_stats(base_x0_map: Dictionary) -> void        # D.3-gated, all-12-or-nothing
func submit_custom_entry(namespace: StringName, entry: Dictionary) -> void
    # D.4-gated (uniqueness + cardinality); namespace ∈ {item, skill, thuc}
func delete_custom_entry(entry_id: StringName) -> void         # D.5-gated
# Every func above: on success, calls TurnManager.invalidate_pending_snapshot()
# exactly once IF this is the first hack-write in an open Undo window (Rule #6b);
# always sets hack_mode_used_this_slot=true in the same Persistence checkpoint on
# first write ever (Rule #8); never touches world_time, never calls request_ai().
```

### PRESENTATION LAYER

```gdscript
## Character Card & Identity
class_name CharacterCard extends Control
func open_card(char_id: StringName) -> void   # FREE action, never submits a TM action
func displayed_field(char_id: StringName, field: StringName) -> Variant
func card_exists(char_id: StringName) -> bool
```

```gdscript
## Core UI/Screen Navigation
class_name ScreenNavigation extends Node
func write_action_allowed(action: StringName, tm_state: StringName, screen: StringName) -> bool  # 46 combinations
func screen_transition_valid(from: StringName, to: StringName, ctx: Dictionary) -> bool
func get_two_column_layout(viewport_width_px: float, setting: StringName, is_touch_primary: bool) -> bool
```

**Approved by user 2026-08-12.**

## Phase 5: ADR Audit + Traceability

### ADR Quality Check

| ADR | Engine Compat | Version | GDD Linkage | Conflicts w/ Phase 1-4 | Valid |
|---|---|---|---|---|---|
| ADR-0001 (Combat) | ✅ (LOW risk, foundational GDScript semantics) | ✅ Godot 4.6 | ✅ `GDD Requirements Addressed` table, 4 rows | None — module ownership matches Phase 1/2 exactly (Feature layer, `src/gameplay/combat/`) | ✅ |
| ADR-0002 (Persistence) | ✅ (HIGH risk, extensively documented) | ✅ Godot 4.6 | ✅ `GDD Requirements Addressed` table, 5 rows | None — matches Phase 1/2 (Core layer, `src/core/persistence/`) | ✅ |

Both existing ADRs are clean — no corrections needed.

### Traceability Coverage Check

With 296 TRs spread across 15 systems and only 2 ADRs, coverage is checked at the
**system level** rather than per-TR-row (296 rows would be mostly redundant "GAP"
for the 13 uncovered systems) — this matches how the project has actually written
ADRs so far (one per system only when a genuinely contested architectural decision
exists, not mechanically one-per-system):

| System | # TRs | ADR Coverage | Status |
|---|---|---|---|
| Combat System | 20 | ADR-0001 | ✅ Covered |
| Persistence / Save System | 24 | ADR-0002 | ✅ Covered |
| Remaining 13 systems (Turn Manager, Contract Enforcement, Equipment, AI/LLM Layer, World Memory, EXP, NPC Affinity, Setting&Canon, Situation Gen, Death&Consequence, Character Continuation, Character Card, Core UI) | 252 | — | ❌ GAP |

**Count: 44/296 covered (14.9%), 252/296 gap (85.1%)** — expected at this stage
(only 2/15 systems have an ADR so far).

### Required New ADRs (prioritized by what actually blocks implementation, not mechanically one-per-system)

**Genuine blockers — needed before implementation starts:**

| # | Proposed ADR | Layer | Why it blocks |
|---|---|---|---|
| 1 | AI/LLM Integration Layer backend + retry/fallback architecture | Core | **No ADR exists yet** — every turn calls into this (Turn Resolution Path, middle step). Blocks the whole pipeline. |
| 2 | ~~World Memory RAM residency / sync-vs-async on Web export~~ — **RESOLVED 2026-08-12, ADR-0005** | Core | Core UI's Story Log + live window (D.3/D.3b) assume synchronous `get_turn_page`/`total_turns()` — IDBFS/MEMFS may conflict. Self-flagged "Required New ADR" in the GDD itself. |
| 3 | ~~Turn Manager Undo rollback mechanism + `turn_snapshot` schema/ownership~~ — **RESOLVED 2026-08-12, ADR-0004** | Foundation | EVERY Feature system declares "Undo must roll back X" but the shared mechanism (deferred-commit vs inverse-ops) is unresolved — blocks Undo implementation project-wide. |
| 4 | Core UI: input-lock API + screen-stack architecture + safe-area insets | Presentation | 3 related engine-verification items (2 of which the GDD itself says need direct Editor verification before an ADR can lock the pattern). |

**Optional — escalate to an ADR only if implementation-time defect-density matches
Combat/Persistence's pattern (per ADR-0001's own stated precedent, not a default
requirement):** EXP & Realm Progression, NPC Affinity, Setting & Canon Integration,
Situation/Encounter Generation, Death & Consequence, Character Continuation,
Equipment & Skill Data, Contract Enforcement, Character Card & Identity — these 9
systems build directly from their Approved GDD spec; revisit only if review surfaces
a Combat-style (repeated-bugs-across-review-rounds) or Persistence-style
(genuine-backend-technology-dispute) pattern.

**Approved by user 2026-08-12.**

## Phase 6: Missing ADR List

**Must have before coding starts (Foundation & Core decisions):**
- ~~AI/LLM Integration Layer backend + retry/fallback architecture~~ — **DONE 2026-08-12, ADR-0003**
- ~~Turn Manager Undo rollback mechanism + `turn_snapshot` schema/ownership~~ — **DONE 2026-08-12, ADR-0004**
- ~~World Memory RAM residency / sync-vs-async on Web export~~ — **DONE 2026-08-12, ADR-0005**

**All 3 Foundation/Core-layer blocking ADRs identified in this phase are now Accepted
(2026-08-12, same session as the "now Proposed" note above originally recorded) —
`/create-epics` prerequisites are satisfied.**

- ~~Tap-name-to-card entry point mechanism (Character Card ↔ Core UI ↔ AI/LLM Layer ↔ Contract Enforcement) — before wiring the two Presentation systems together; may fold into the Core UI ADR above rather than standing alone~~ — **DONE 2026-08-12, ADR-0006** (stood alone rather than folding into the Core UI ADR, since it also had to independently resolve OQ#11 before the Core UI ADR's own D.4 touch-target work could safely proceed on the same shared pattern)

**Should have before the relevant system is built:**
- ~~Core UI: input-lock API + screen-stack architecture + safe-area insets — before building Core UI/Screen Navigation~~ — **DONE 2026-08-12, ADR-0007**

**Both "should have" ADRs from this list are now written — no remaining priority
ADRs from Phase 6 of `/create-architecture` are outstanding.**

**Can defer to implementation (build directly from GDD spec; escalate to an ADR only if a Combat/Persistence-style pattern emerges):**
EXP & Realm Progression, NPC Affinity & Relationship, Setting & Canon Integration,
Situation/Encounter Generation, Death & Consequence, Character Continuation,
Equipment & Skill Data System, Contract Enforcement, Character Card & Identity
(D.1–D.5 core logic — distinct from the entry-point mechanism above)

**Approved by user 2026-08-12.**

## Architecture Principles

5 principles derived directly from evidence gathered in this session:

1. **The one-way Mechanic/Narration Contract is inviolable.** State is computed and
   locked BEFORE the AI narrates; AI output is never parsed back into world state.
   Enforced by one mandatory wrapper call-path + CI static checks, never prompt
   engineering alone.
2. **Static-typed, dependency-injected GDScript, never hidden state.** Every
   mechanics function is pure or constructor-DI'd; RNG is always injected as the
   last parameter; every `int/int` division in gameplay formulas gets an explicit
   `float()` cast (ADR-0001 precedent, applied project-wide).
3. **Durability means a real, observable browser commit — never assumed.**
   `durability_confirmed` = IndexedDB's `transaction.oncomplete`, gating every Turn
   Confirmed/Undo transition; `FileAccess`/`user://` is never treated as a
   durability signal (ADR-0002 precedent).
4. **AI context is bounded; world truth is not.** World Memory retains full history
   forever (Persistence bears the O(world_time) storage cost off the critical path)
   but the AI-facing context is provably O(1) via layered compression (recency
   window + fact extraction + hard clamp) — never truncate the source of truth to
   fit a prompt.
5. **Every tuning constant shared by ≥2 systems is registered and validated
   jointly, never tuned independently.** Closes the interlocking-constants risk
   class that surfaced repeatedly in review (Song Tu cooldown pairs,
   `LIVE_WINDOW_TURNS`/`CONTENT_EXCHANGE_ESTIMATE`, `card_transition_ms`).

## Open Questions

Cross-cutting, high-priority items (full per-system open questions are preserved
in the Technical Requirements Baseline above, under each system's subsection):

| ID | Summary | Priority | Resolution Path |
|---|---|---|---|
| QQ-01 | ~~`ai_context_hard_token_budget` undefined anywhere (both AI/LLM Layer and World Memory reference it)~~ — **CLOSED 2026-08-12, ADR-0003**: defined as a fixed tuning knob = 8000 (safe range 4000–16000) in `ai-llm-integration-layer.md`, cost/latency-driven, not derived from model context window (all 5 fallback models verified ~1,048,576 tokens — too large to be a meaningful bound). | High | ADR-0003 (`docs/architecture/adr-0003-ai-llm-integration-layer.md`) |
| QQ-02 | ~~Semantic-mismatch AI narration drift...~~ — **CLOSED 2026-08-12, ADR-0003**: decision is NOT to build an "AI judge" for MVP (Alternative 3, rejected — would require a 4th `call_type`, breaking the registry-locked `ai_call_budget_per_turn=3`, for a risk with no measured frequency yet). Residual risk accepted, tracked for manual QA; revisit if playtest shows recurring drift. | High | ADR-0003 (`docs/architecture/adr-0003-ai-llm-integration-layer.md`) |
| QQ-03 | ~~Character Card OQ#14: Entity Record may not survive a crash between Persistence flush cycles~~ — **CLOSED 2026-08-12, ADR-0004**: entity-creation events now piggyback the existing per-turn `turn_records` write (same durability boundary as `world_time`); only ongoing field updates to already-existing cards still ride the periodic 50-turn cadence. | Medium | ADR-0004 (`docs/architecture/adr-0004-turn-manager-undo.md`) |
| QQ-04 | ~~Core UI OQ#11: AccessKit confirmed NON-functional on the sole HTML5 target — no accessibility solution chosen yet~~ — **CLOSED 2026-08-12, ADR-0006**: Nhánh C (out-of-scope-MVP), 4 binding conditions (no silent gap, AC-56a keyboard fallback must pass, no WCAG 2.1 AA compliance claim while open, Core UI's D.4 keeps positioning layer separable for future retrofit). | Medium | ADR-0006 (`docs/architecture/adr-0006-tap-name-to-card-entry-point.md`) |
| QQ-05 | Core UI OQ#12: WCAG 200%-resize may be structurally unreachable if the Web export locks `user-scalable=no` | Low | Needs a prototype before deciding |
| QQ-06 | Character Continuation: Situation Gen has a Layer-B-class tracker not yet counted in `N=5` reset scope | Medium | Resolve when Situation Gen is implemented |
| QQ-07 | Setting & Canon: `possesses` premise blocked at MVP (Equipment lacks a `destroyed` flag) | Low | `producer` coordinates re-opening the Equipment GDD |
| QQ-08 | EXP: `WIN_EXP_FLOOR_MULT` has a known, unmitigated tier-farming exploit | Low | Redesign D.2 post-MVP |
| QQ-09 | Combat: ambient/ownerless opponent stat-construction algorithm not yet formalized | Medium | Needed before Situation Gen generates real encounters |

**Approved by user 2026-08-12.**

## Phase 7b: Technical Director Sign-Off

**Review mode = lean → LP-FEASIBILITY skipped** (not a PHASE-GATE in lean mode, per skill rule).

### TD-ARCHITECTURE self-review (4 gate criteria, `.claude/docs/director-gates.md`)

1. **Is every TR in the baseline covered by an architectural decision?** — Yes at
   the architecture level (all 296 TRs have a layer/module ownership/interface from
   Phases 1–4), but only 44/296 (14.9%) have a formally **Accepted ADR**. The 4
   required new ADRs from Phase 6 are not yet written.
2. **Are all HIGH RISK engine domains explicitly addressed or flagged?** — ✅ Yes.
   Web Export (settled via ADR-0001/0002), UI Dual-Focus (flagged on every
   Presentation-layer module), GDScript 4.5+ (flagged). No HIGH-risk domain is
   silently unaddressed.
3. **Are the API boundaries clean, minimal, implementable?** — ✅ Yes, 15 GDScript
   interfaces drafted in Phase 4 with reasonable method counts. One newly-proposed,
   not-yet-verified addition: `load_blob()` (symmetric counterpart to `get_blob()`)
   — needs confirming when the World Memory ADR / ADR-0002 extension is written.
4. **Are Foundation-layer ADR gaps resolved before implementation begins?** — ✅
   **YES** *(updated 2026-08-12, post-hoc — this Phase 7b record is a point-in-time
   snapshot from the original `/architecture-review`-adjacent self-check; ADR-0003,
   ADR-0004, and ADR-0005 were all written in the sessions immediately following)*:
   Turn Manager's Undo rollback mechanism + `turn_snapshot` schema (Foundation
   layer) — **RESOLVED, ADR-0004**. AI/LLM Integration Layer backend —
   **RESOLVED, ADR-0003**. World Memory RAM residency/sync-vs-async on Web export
   — **RESOLVED, ADR-0005**. All 3 Foundation/Core-layer blocking ADRs from Phase 6
   are now written (Proposed) — none Accepted yet, but the gap this checklist item
   tracks (an ADR not existing at all) is closed.

**Verdict: APPROVED WITH CONCERNS** — the architecture is internally coherent, no
contradictions found, every gap is already identified and prioritized (Phase 5/6),
but 3–4 blocking ADRs (including one Foundation-layer gap) remain unwritten, so a
clean APPROVE-to-start-coding is not yet warranted.

**Approved by user 2026-08-12.**
