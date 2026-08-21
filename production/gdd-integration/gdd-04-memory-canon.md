# Implementation Contract 04 — World Memory & Setting/Canon

Source GDDs (both **Approved**): `design/gdd/world-memory-context-management.md` (WM),
`design/gdd/setting-canon-integration.md` (SC). This document is the sole
implementation reference; the GDDs need not be re-read. Vietnamese prose in the
GDDs is normalized to English here; **all identifiers, enum values and field names
below are verbatim and must be used exactly as written.**

Out of scope: Combat System, Song Tu mechanic (only interface field names recorded).

---

# PART A — World Memory & Context Management

## A1. Purpose

World Memory is the global, append-only history of the world: every confirmed,
non-undone turn is stored as a turn record (`turn_id`, `action`, `locked_result`,
`narration_text`, `world_time`) covering the player character **and** every
significant NPC. It is the single source of context for the Turn Manager and the
AI/LLM Integration Layer when they build `narration_call` / `suggestion_call`
prompts. It solves one hard problem: the log grows without bound while every LLM
context window is finite, so it maintains two tiers — a **Full Narrative Log**
that is never lossy (the player can re-read the whole story) and a **bounded AI
Context View** (recent turns verbatim + rule-based extracted facts) that is O(1)
in `world_time`. It owns no persistent character profile (mutable per-entity data
such as `base_X0`, `npc_tag`, `concealment` lives in the **Entity Record** blob
owned by `persistence-save-system.md`), and it **never** reads or parses
`narration_text` to derive state.

## A2. Core rules

1. **(WM Core Rule #1) Two separate tiers.** *Full Narrative Log* = ordered list
   of all turn records currently considered confirmed-and-not-undone; content is
   never summarized or lost. *AI Context View* = a derived, size-bounded view used
   only for prompt assembly; compression happens only here.
2. **(#2) Turn Manager is the only writer.** Append one turn record when a turn is
   confirmed and not undone; **hard-delete** the record when that turn is later
   undone (not a soft-delete/flag). Deleting on undo is not an exception to
   "no content loss" — an undone turn never happened (Turn Manager Core Rule #7).
   Undo of a non-existent / already-undone `turn_id` = **no-op, never throw**.
3. **(#3) AI Context View = recency window + extracted facts.** The last
   `recency_window_turns` turns keep `narration_text` + `locked_result` verbatim.
   Every older turn keeps **no** `narration_text` — only facts extracted from
   structured fields of `locked_result`, grouped per entity. Extraction is purely
   rule-based over already-structured data; **never** use AI to summarize
   `narration_text` (keeps `calls_per_turn <= 3` untouched, contributes 0 AI calls).
4. **(#4) Entity-scoped querying.** Extracted facts must be queryable by
   `entity_id` (a specific NPC id, or the literal `"global"` for facts not bound
   to an NPC).
5. **(#5) The undoable turn is always verbatim.** `recency_window_turns` has an
   absolute minimum of **1**, so the newest turn (the only undoable one per
   `undo_availability_window`) can never be demoted to fact form. This closes the
   Turn Manager open question "Undo vs compaction".
6. **(#6) "No compression" means no *content* loss.** Physical storage-level
   lossless compression (gzip-style) is allowed and owned by Persistence/Save
   System, not by this system.
7. **(#7) No state machine.** This is a data store plus extraction rules, not a
   sequential pipeline.
8. **(#8) Persistence MUST serialize the AI Context View.** The save bundle must
   contain both the Full Narrative Log **and** the AI Context View (recency window
   + fact store). On load, the Context View is **read directly from the save**,
   never regenerated with current knob values (regeneration under changed knobs is
   retroactive and violates AC-17/AC-21). Formulas #1-#2 remain valid only as a
   **recovery path** for old/corrupt saves missing the Context View.

### Operations table (trigger -> behavior)

| Operation | Triggered by | Behavior |
|---|---|---|
| Write turn record | Turn Manager: turn confirmed and not undone | Append to Full Log; if the new turn pushes a turn out of `recency_window_turns`, extract facts from that turn's `locked_result` immediately. **Atomic** — write + extract are one operation, never two caller-driven steps (AC-27) |
| Delete turn record | Turn Manager: turn undone | Remove from Full Log and from the recency window (the undone turn is always the newest, hence always in-window). Unknown `turn_id` -> no-op |
| Build AI Context View | AI/LLM layer preparing `narration_call` / `suggestion_call` | Return recency window (verbatim) + extracted facts of the entities in the current scene only (never the whole fact store), after applying the Runtime Hard Clamp (Formula #5) |
| Query facts by entity | NPC Affinity, Setting & Canon, Situation Gen | Facts matching the requested `entity_id` |

## A3. State / data model

```
TurnRecord {
  turn_id:        int      // 1..inf, monotonic, assigned by Turn Manager, NEVER reused after undo
  action:         <opaque> // player action payload
  locked_result:  Struct   // structured mechanical result; only source of facts
  narration_text: string   // AI prose; NEVER parsed/read for state
  world_time:     int
}

Fact {
  fact_id:     int     // 1..inf, monotonic in creation order — REQUIRED for total order
  entity_id:   string  // npc id, "player", or "global"
  turn_id:     int
  world_time:  int
  field_name:  string
  field_value: any     // numeric | boolean | event | string/enum | array
}

WorldMemoryState {
  full_log:               ordered TurnRecord[]       // initial []
  recency_window:         TurnRecord[]               // derived; size <= recency_window_turns, initial []
  facts:                  Map<entity_id, Fact[]>     // initial {}
  processed_turns:        Map<turn_id, {processed: bool, fact_count: int}>  // initial {}
  total_turns_counter:    int                        // initial 0, O(1) maintained
  last_confirmed_turn_id: int                        // initial 0
  next_fact_id:           int                        // initial 1
}
```

Invariants:
- `total_turns() != last_confirmed_turn_id`. They differ by exactly the number of
  undos in the slot (100 confirmed with 3 undos -> `last_confirmed_turn_id=100`,
  `total_turns()=97`). Neither may be derived from the other.
- `total_turns_counter` is incremented/decremented **inside** the write/delete
  operations. It must never be a rescan of `full_log` (O(1) is a contract, not an
  optimization — `core-ui-screen-navigation.md` AC-15/AC-48 depend on it).
- `next_fact_id` is strictly monotonic across the whole slot lifetime.
- World Memory tracks exactly **one open slot**; there is no slot parameter.

## A4. Formulas and algorithms

### Formula #1 — Recency window membership (`recency_window_membership`)

```
in_window(turn_id) = (last_confirmed_turn_id - turn_id) < recency_window_turns
turn_id_falls_out  = last_confirmed_turn_id' - recency_window_turns   // ' = AFTER the new confirm
```

Exactly **one** turn falls out per confirmed turn — no batch rescan at steady state.
Guard: extract only if `turn_id_falls_out >= 1` (the first turns of the game yield a
negative id -> no extraction).

**`in_window` is a one-way TRIGGER evaluated at the moment a new turn is confirmed —
it is NOT a live re-queryable predicate.** After an undo lowers
`last_confirmed_turn_id`, literal re-evaluation can return `true` for a turn already
evicted (e.g. `recency=8`, `last_confirmed=20` -> turn 12 evicted; undo turn 20 ->
`(19-12)=7<8` = true). Eviction is irreversible, exactly like undo itself. A turn
never returns to verbatim form. (AC-32.)

### Formula #2 — Fact extraction count (`fact_extraction_count`)

```
facts_extracted(turn) = SUM over f in fields(turn.locked_result) of signal(f)
signal(f) = 1 if has_signal(f) else 0

has_signal(f) =
     (numeric(f) AND f.value != 0)
  OR (boolean(f) AND f.value == true)
  OR (event(f)   AND f.value != null)
  OR (string(f)  AND f.value != null AND f.value != "")
  OR (array(f)   AND len(f.value) > 0)
  ELSE /* type outside the 5 supported kinds, e.g. nested object/dict */
       has_signal = TRUE            // fail-safe: emit the fact, never silently drop
       + emit schema warning log for QA          // AC-31
```

Each signalling field produces **exactly one** fact (1 fact per field, **not** 1 per
turn). `entity_id(f)` is derived from the field-name convention
(`affinity_delta_bui_lan` -> `"bui_lan"`; unbound field -> `"global"`). A field whose
name matches no known `entity_id` convention -> `entity_id = "global"` + schema
warning log, never a hard error (AC-19).

`F` = number of possible fields in the `locked_result` schema — finite **per schema
version**, and it grows as feature systems (Combat, EXP, Death & Consequence) add
fields. `facts_extracted(turn)` is always in `[0, F]`. A pure-dialogue turn yields
`facts_extracted = 0`, which is valid and must be recorded as
`{processed: true, fact_count: 0}` — distinguishable from `{processed: false}`. A
0-fact turn leaves **no trace at all** in the Context View once it exits the window
(it remains fully intact in the Full Log).

### Formula #3 — Entity-scoped fact selection (`entity_fact_selection`)

```
selected_facts(entity_id) =
    top_K(facts(entity_id),
          key = (importance_tier DESC, world_time DESC, fact_id ASC),
          K   = max_facts_per_entity)
```

- `importance_tier` (0-3) is supplied by Setting & Canon D.5 as a **pure function**
  of `field_name`/`field_value`; a fact matching no D.5 rule defaults to tier 0.
- `fact_id ASC` is mandatory — ties on `(tier, world_time)` are **common**, not rare
  (Formula #2 deliberately emits several facts per turn); without it `top_K` has no
  total order and determinism (AC-17) breaks.
- `K > |set|` returns the whole set (no padding, no error). `facts(entity_id) = {}`
  returns the empty set, never throws. `max_facts_per_entity = 0` is formally legal
  (always empty) but disables the fact tier entirely — not recommended.
- Backward compatible: if all tiers are equal the key degenerates to
  `(world_time DESC, fact_id ASC)` = pure recency.

### Formula #4 — AI Context View size bound (`ai_context_view_size_bound`)

```
context_size(prompt) = recency_window_turns * avg_turn_tokens
                     + SUM over e in entities_in_scope of
                         min(|facts(e)|, max_facts_per_entity) * avg_fact_tokens

context_size(prompt) <= recency_window_turns * avg_turn_tokens
                      + max_entities_per_prompt * max_facts_per_entity * avg_fact_tokens
                      = C     // constant, independent of world_time
```

`C` is an **expected-value** bound (`avg_*` are measured averages, not maxima), so a
single prompt may exceed it; the guaranteed bound is Formula #5. The load-bearing
result is that `context_size` is **O(1) in `world_time`** even though raw data is
O(world_time). Worked example: `recency=5`, `avg_turn_tokens=350`,
`max_entities_per_prompt=4`, `max_facts_per_entity=8`, `avg_fact_tokens=15` ->
`C = 1750 + 480 = 2230`.

`entities_in_scope` = NPCs actually present in the current scene (supplied by
Situation/Encounter Generation) + `"global"`. World Memory does not decide who is in
scene. **Defensive clamp (AC-34):** if `|entities_in_scope| > max_entities_per_prompt`
(possible only if the cross-GDD invariant is misconfigured), apply
`top_K(entities_in_scope, key = Situation Gen's priority_key, K = max_entities_per_prompt)`
before summing rather than letting the bound break silently.

### Formula #5 — Runtime hard clamp

Measure the **real** token count at prompt-assembly time (`context_size_measured`),
not the `avg_*` estimate. If it exceeds `ai_context_hard_token_budget`, trim in this
order until under budget or out of moves:

```
build_context(entities_in_scope) -> {context, over_budget}:
  ctx = recency_window + selected_facts(e) for e in clamped(entities_in_scope)
  WHILE measure(ctx) > ai_context_hard_token_budget:
     IF |ctx.recency| > 1:                       // step 1
        drop OLDEST turn in recency window       // absolute floor 1 (Core Rule #5)
     ELSE IF ctx has any fact:                   // step 2
        drop fact with LOWEST importance_tier first (tier 0 before tier 3);
        within a tier drop OLDEST world_time first    // exact inverse of top_K's key
     ELSE:
        RETURN {context: ctx, over_budget: true}  // rock bottom: 1 turn, 0 facts
  RETURN {context: ctx, over_budget: false}
```

**Termination**: each step strictly decreases one of two finite quantities and never
increases either; the true stopping point is both floors reached (recency = 1 turn,
facts = 0). Reaching the floors does **not** imply being under budget — that is the
`over_budget = true` case. **Never throw.** The caller (AI/LLM layer, real owner of
`ai_context_hard_token_budget`) decides what to do with the flag. Trimmed turns and
facts are **not** deleted from the Full Log or fact store — the clamp affects one
prompt only (unlike undo).

### Batch extraction on load

Loading a save whose Context View is absent (recovery path) requires a **one-shot
batch extraction** of every turn already outside the window (e.g. `world_time=200`,
`recency=5` -> extract turns 1..195 in a single pass), producing results identical
to sequential per-turn extraction (AC-20). See the WASM peak-memory caveat in A9.

## A5. Tuning knobs

| Knob | Default | Safe range | Effect |
|---|---|---|---|
| `recency_window_turns` | 8 | 1-15 (absolute floor 1) | Turns kept verbatim. Too low (1-2): AI loses prose continuity. Too high (>15): wasted tokens |
| `max_facts_per_entity` | 8 | 3-20 (0 disables the fact tier, not recommended) | Facts per entity per prompt. Too low (<3): NPCs "forget" too fast |
| `max_entities_per_prompt` | 4 | **4-8** | Entities (NPCs + `"global"`) per prompt. **Hard floor 4**, not a preference |

**Not knobs**: `avg_turn_tokens`, `avg_fact_tokens` (empirically measured; must be
re-measured whenever `F` grows materially).
**External, consumed not owned**: `ai_context_hard_token_budget = 8000`
(safe range 4000-16000), defined in `ai-llm-integration-layer.md` per ADR-0003 — a
fixed config constant, deliberately not derived from the model's context window.

**Cross-GDD INVARIANT**: `max_entities_per_prompt >= MAX_NPC_PER_SCENE + 1`, where
`MAX_NPC_PER_SCENE = 3` is locked in `situation-encounter-generation.md` and `+1` is
the `"global"` slot. Both must be registered together in the registry. Verified
statically by AC-33 (BLOCKING); AC-34 is the defensive clamp when violated.

## A6. Edge cases (resolved)

- An evicted turn can never become undo-eligible again — structural invariant, not
  an enforced rule (`recency_window_turns >= 1` plus `undo_availability_window`).
- Context View regeneration is deterministic but is **no longer the default path**;
  it is a recovery path valid only if no knob changed and no undo occurred after an
  eviction in the replayed range.
- A turn affecting multiple entities needs no special logic — one fact per
  signalling field, each with its own `entity_id`.
- Unknown entity-name convention -> `entity_id="global"` + warning log. Unknown
  field *type* -> `has_signal = true` + warning log (symmetric fail-safe).
- Loading a save with large `world_time` -> one batch extraction pass.
- Knob changes mid-playthrough apply **forward only**: already-extracted turns are
  not restored to verbatim, already-verbatim turns are not re-extracted (no
  thrashing). Save+reload right after a knob change must preserve this (AC-21b).
- Dead / departed NPCs are **never** purged — their facts stay queryable forever;
  Formula #3 merely may not select them for a given prompt.
- Rock-bottom over-budget prompt -> `{context: <1 turn, 0 facts>, over_budget: true}`.

## A7. Interfaces

All public interfaces are **`await`-shaped from day one** (ADR-0005) even though the
MVP resolves in the same frame, so a later IndexedDB async backend needs no call-site
change. Beware coroutine contagion: callers must be async-shaped and must not be
invoked from `_process()` / `_physics_process()` / `_draw()` / `_input()`.

**Provides (public):**
- `get_turn_page(anchor_turn_id, count, direction) -> {records, has_more}` —
  `direction in {older, newer}`. Returns up to `count` consecutive records from the
  anchor in that direction, **never including `anchor_turn_id` itself**
  (unconditional). `anchor_turn_id` is **mandatory** (no null "latest page" mode).
  A non-existent anchor is treated as a **virtual timestamp**: return the `count`
  nearest surviving records in the requested direction — never throw, never fake an
  empty result. `count` beyond the remainder returns what exists with `has_more=false`.
- `get_turn(turn_id) -> TurnRecord | not_found` — exact point lookup; explicit
  `not_found` for never-written or undone ids.
- `get_processing_state(turn_id) -> {processed: bool, fact_count: int} | not_found` —
  in-window turn -> `processed=false`; extracted turn -> `processed=true` even when
  `fact_count=0`.
- `get_facts_by_entity(entity_id) -> set<Fact>` — **ALL** facts, explicitly **not**
  truncated by `max_facts_per_entity` (that is `selected_facts`, an internal
  prompt-assembly function). Empty set for unknown entity, never throws.
- `total_turns() -> int` — **no parameters**; O(1) maintained counter of confirmed,
  non-undone records in the open slot. Returns `0` on a fresh slot.
- `referenced_in_world_memory(entry_id) -> bool` — has this entity/item/skill ever
  appeared structurally in the narrative. **MUST** be a structural entity-reference
  check against `_extracted_facts` / internal entity tags — **never** a text match on
  display names in `narration_text` (a false negative would let
  `character-customization-mode.md` D.5 delete an entry already written into history).
  Unknown `entry_id` -> `false`.
- Build AI Context View -> `{context, over_budget}` (Formula #5).
- `selected_facts(entity_id)` — internal only (Formula #3).

**Consumes:**
- Turn Manager: turn-confirmed / turn-undone events, `turn_id` allocation
  (monotonic, never reused), `undo_availability_window`.
- Situation/Encounter Generation: `entities_in_scope`, its `priority_key`, and
  `MAX_NPC_PER_SCENE`.
- Setting & Canon Integration: `importance_tier(fact)` (D.5).
- AI/LLM Integration Layer: `ai_context_hard_token_budget`.
- Persistence: serialize/deserialize both Full Log and Context View blobs.

**Consumed by:** AI/LLM layer (prompt context), Turn Manager (reads Context View),
NPC Affinity, Setting & Canon, Situation Gen (`get_facts_by_entity`), Core UI/Screen
Navigation (`get_turn_page`, `total_turns()` — hard dependency feeding `total_pages`,
`default_page_index`, `s2_resident_turns`), Character Customization Mode
(`referenced_in_world_memory`).

**Field names crossing the boundary:** `affinity_delta_[npc_id]`,
`canon_break_flag_[event_id]`, `canon_event_[event_id]_status`,
`canon_role_filled_[npc_id]`, `canon_rescue_failed_[event_id]`,
`battle_result_[char]`, `death_flag_[char]`, `breakthrough_flag_[char]`,
`hp_delta`, `mana_delta`.

**UI requirement:** a dedicated Story Log screen renders `narration_text` only (never
raw `locked_result` or facts), ordered by `world_time`, mandatory lazy paging via
`get_turn_page`, opening at the newest turn with a "back to start" control.
`log_page_size` / `log_max_loaded_pages` / `log_prefetch_threshold` are owned by
Core UI/Screen Navigation, not here.

## A8. Acceptance criteria checklist

Core rules
- [ ] **AC-01** `get_turn(turn_id)` returns `narration_text`/`locked_result`
      byte-for-byte identical forever, including after eviction.
- [ ] **AC-02** Confirm -> exactly one appended record with all 5 fields, no duplicate
      per `turn_id`; undo -> hard delete, subsequent lookup = not found.
- [ ] **AC-03** (a) window turns appear verbatim; (b) older turns expose no
      `narration_text`, only facts; (c) two turns with identical `locked_result` but
      different `narration_text` extract identical facts (ignoring `turn_id`/`world_time`).
- [ ] **AC-04** Query by one `entity_id` returns only that entity's facts.
- [ ] **AC-05** With `recency_window_turns=1`, the just-confirmed turn N stays verbatim.
- [ ] **AC-06** `get_turn` output identical under a non-compressing and a gzip storage
      backend (tier separation).
- [ ] **AC-07** No read operation throws on: (a) empty log; (b) undo of unknown
      `turn_id`; (c) double-undo; (d) `get_turn_page` with vanished anchor; (e) context
      build immediately after an undo.

Formulas
- [ ] **AC-08** `last_confirmed=20`, `recency=5` -> `in_window(15)=false`,
      `in_window(16..20)=true`, `turn_id_falls_out=15`; confirming 21 flips exactly one id (16).
- [ ] **AC-09** First turn -> `turn_id_falls_out=-4`, guard blocks extraction;
      `recency=1` -> turn N-1 extracted immediately; an undone turn goes through Core
      Rule #2 deletion, never through extraction.
- [ ] **AC-10** `{hp_delta:-15, affinity_delta_bui_lan:+2, mana_delta:0, canon_break_flag:null}`
      -> `facts_extracted=2`, correct `entity_id` derivation; result always in `[0,F]`.
- [ ] **AC-10b** Positive string/array branch: `battle_result_bui_lan:"victory"` and
      `witnesses_bui_lan:["npc_a","npc_b"]` both signal -> 2 facts.
- [ ] **AC-11** Pure-dialogue turn -> `facts_extracted=0` and
      `get_processing_state -> {processed:true, fact_count:0}`; no trace in the Context
      View, full text still in the Full Log.
- [ ] **AC-12** 23 facts, one old tier-3 fact, `K=8` -> exactly 8, tier-3 always
      included, remainder newest-first; bound holds at 50/100+ facts.
- [ ] **AC-13** 3 facts with `K=8` -> all 3, no padding; empty entity -> empty set;
      `max_facts_per_entity=0` -> always empty.
- [ ] **AC-14** `C = 5*350 + 4*8*15 = 2230`; `context_size` at `world_time=500` and
      `50000` both `<= C`.
- [ ] **AC-15** 0 AI calls added by context assembly; `world_time=0` ->
      `1*avg_turn_tokens`; 50 known NPCs but 3 in scene -> `|entities_in_scope|=4`.

Edge cases
- [ ] **AC-16** Evicted turn 15 is never undo-eligible across 3 representative event orders.
- [ ] **AC-17** Recovery-path regeneration equals the live view — **only if** knobs
      were unchanged **and** no undo occurred after any eviction in the range.
- [ ] **AC-18** Multi-entity turn -> one distinct fact per signalling field.
- [ ] **AC-19** Unknown entity naming -> `entity_id="global"` + warning log, no throw.
- [ ] **AC-20** Load `world_time=200`, `recency=5` -> batch-extract turns 1-195,
      identical to sequential; 196-200 stay verbatim.
- [ ] **AC-21a** Knob change mid-session is forward-only (turns 90-95 stay facts).
- [ ] **AC-21b** Knob change then save+reload preserves state exactly (Context View
      read from save, not regenerated).
- [ ] **AC-22** Dead NPC's facts still fully queryable; absence from a prompt is
      selection, not deletion.

Public interface
- [ ] **AC-23** `get_turn_page(30, 5, older)` -> `{25..29}`, excludes 30, `has_more=true`.
- [ ] **AC-24** `get_turn_page(47, 10, newer)` -> `{48,49,50}`, `has_more=false`, no throw.
- [ ] **AC-25** Vanished anchor 30 -> virtual-timestamp behavior, no throw.
- [ ] **AC-26** `count=100` on a 3-record log -> 2 records, `has_more=false`.

Integration and clamp
- [ ] **AC-27** Write is atomic: after 20 confirms with `recency=5`, log has 20, window
      holds 16-20 verbatim, facts exist for 1-15 — extraction never a separate step.
- [ ] **AC-28** Budget 2000, measured 2050 -> trim exactly the 4 lowest-tier facts,
      stop at `<=2000`, `over_budget=false`, recency untouched.
- [ ] **AC-28b** Rock bottom (recency=1, 0 facts, measured 5000 > 2000) -> no throw,
      `{context, over_budget:true}`; trimmed data still present in log/fact store.
- [ ] **AC-29** `total_turns()` = 97 after 100 confirms with 3 undos; `0` on a fresh
      slot; O(1) (no scan) verified by spy.
- [ ] **AC-30** `get_facts_by_entity` returns 23 while `selected_facts` returns 8 on the
      same state; empty entity -> empty set, no throw.
- [ ] **AC-31** Unsupported field type -> `has_signal=true` + schema warning log.
- [ ] **AC-32** Undo of a newer turn does **not** pull an evicted turn back to verbatim.
- [ ] **AC-33** Static check `max_entities_per_prompt >= MAX_NPC_PER_SCENE + 1` (BLOCKING).
- [ ] **AC-34** Invariant violated at runtime -> defensive `top_K` clamp on
      `entities_in_scope`, lowest `priority_key` dropped.

## A9. Open questions / ambiguities (WM)

- The `entity_id` naming convention inside `locked_result` is still only a working
  assumption; it must become a formal standard every feature system obeys. It includes
  a boolean-polarity rule: name booleans so the *memorable* state is `value=true`
  (`death_flag=true`, never `is_alive=false`) because `has_signal` only catches `true`.
- `avg_turn_tokens` / `avg_fact_tokens` are unmeasured; measure against a real build
  and **re-measure** whenever `F` grows.
- `systems-index.md` still lacks the Turn Manager -> World Memory dependency edge.
- `persistence-save-system.md` has not yet been updated for Core Rule #8 (Context View
  as a mandatory save blob).
- `recency_window_turns` counts raw turns and is scene-blind; a conversation longer than
  the window loses its opening prose before the scene ends. Scene-relative windows are a
  post-playtest candidate.
- Qualitative "promises" have no structured field and are deliberately unsupported; the
  correct future fix is another system defining e.g. `promise_id_[npc]` in its own
  `locked_result` — Formula #2's string branch then picks it up for free.
- **Closed**: RAM residency + async signatures (ADR-0005: fully RAM-resident MVP,
  `await`-shaped signatures, ~12.8-25.6 MB at `world_time=2000`; real device ceiling
  deferred to `/soak-test`). Caveat to implement against: WASM linear memory never
  shrinks within a session, so a batch-extraction peak (AC-20) leaves a permanent floor —
  a real OOM risk on mobile Safari for long playthroughs.
  `ai_context_hard_token_budget` is closed by ADR-0003.

---

# PART B — Setting & Canon Integration

## B1. Purpose

Setting & Canon Integration owns all knowledge of the source work the player chose as
their world (Dau La Dai Luc, Pham Nhan Tu Tien...): canonical character profiles
(true identity even under disguise), the canon event line, each event's **causal
premises**, and setting-specific world law including `breakthrough_requirement`, on
which EXP & Realm Progression hard-depends. Architecturally it is the **sole canon
arbiter**: it — never the AI — decides which events carry macro-momentum (survive a
broken premise via `substitute`) versus which genuinely vanish or branch, and which
premise broke when (`canon_break_flag` locked into `locked_result` before narration).
It owns no world-state copy: `world_state` is a thin adapter over the owning systems
(D.0). Every adjudication is deterministic, RNG-free and AI-free.

## B2. Core rules

1. **(#1) The setting pack is the truth source**: canonical character profiles, canon
   event profiles, and world law (`breakthrough_requirement` per tier, realm names,
   special rules). MVP = 1 setting, 1 region, minimum data for 3 NPCs + 2-3 canon events.
2. **(#2) Canonical character profile** =
   `{char_id, true_identity, alias/disguise list, is_major_canon, level/tier profile, roles in events}`.
   The alias list is **static per setting pack in MVP** — no runtime writer — so
   Character Card's inference `disguise_active(C) := len(alias_list(C)) > 0` always
   holds; content constraint: **no MVP character may stop disguising mid-story**.
   **Transmigrator privilege**: for `is_major_canon=true` the player's Character Card
   always shows the true identity even while disguised; ordinary NPCs show only
   "concealing". The privilege is *player information only* — it changes no world state
   and other NPCs stay deceived until the identity leaks through events.
3. **(#3) Canon event profile** =
   `{event_id, trigger_condition (world-state predicate), earliest_world_time, location_id, roles[] (role + eligibility + bound character + priority), premises[] (mechanical predicate + its own on_break policy), canon_outcome (mechanical consequence + narrative summary for AI), status}`.
4. **(#4) Break rubric.** **Every canon event is breakable**; breaking = falsifying >= 1
   premise. Handling depends on the broken premise's `on_break`:
   - `substitute` — the role is replaceable; the world picks another eligible character
     (D.3) and the event happens as a variant (models macro-momentum).
   - `vanish` — the premise is the event's existential core; the event goes **Suspended**
     (not gone yet: the player may rescue it) and becomes **Vanished** at due time if the
     core role is still empty, triggering the downstream cascade at that moment.
   - `branch` — data declares a concrete alternate event that fires instead.

   `on_break` is **mandatory per premise, with no default** — a missing `on_break` is an
   authoring error and the pack is refused at load.
   **Rule #4b — player rescue**: while an event is Suspended, a free-form action
   classified by Situation/Encounter Generation as `canon_role_rescue` is adjudicated
   mechanically — the nominee must pass D.3 `eligible()` (all 5 conditions). Pass ->
   role rebound, event -> Dormant-Modified, lock `canon_role_filled_[npc_id]`. Fail ->
   the action still happens narratively but the event is not rescued, and
   `canon_rescue_failed_[event_id]` is locked with the reason enum
   `{dead, tier_out_of_range, wrong_faction, excluded, no_vacant_role}`, passed into the
   `narration_call` payload as a **narration directive**, never as displayed data
   (`no_vacant_role` means the candidate is already held by `substitutes_used_this_turn`
   for another event — *not* "the role does not exist").
   **Severity lattice is a GLOBAL invariant**, not local to the Due branch:
   `Suspended`/`Vanished` (vanish) > `Branched` (branch) > `Dormant-Modified`
   (substitute) > `Dormant`. It applies wherever `status(event)` is written, both when
   one event has several broken premises with different policies and when several
   independent cascades touch one event in the same turn; the result must equal the
   highest proposed severity, independent of processing order.
5. **(#5) Purely mechanical adjudication — no AI.** Premises are predicates over locked
   mechanical world state; no AI call participates (`calls_per_turn <= 3` preserved).
6. **(#6) Eager vs lazy detection.** A **non-reversible** premise turning false (death,
   item destroyed, upstream event vanished) locks `canon_break_flag` **that same turn**
   into `locked_result` as `{event_id, broken premise, resolution}`. A **reversible**
   premise (affinity, location, possession) is judged only at due time.
7. **(#7) Due events** — when `trigger_condition` is true and `world_time >= earliest_world_time`,
   the final state is decided **in the same turn** (Resolved-Canon / Resolved-Substituted /
   Vanished / Branched), locked, and emitted to Situation/Encounter Generation.
8. **(#8) `breakthrough_requirement` is data**; this system exposes
   `breakthrough_requirement_met(tier)`, closing the interface EXP waits on.
9. **(#9) `importance_score` for World Memory** — this system owns the tier weight table
   (D.5) that fills WM Formula #3's sort key slot; WM's `top_K` structure is unchanged.
10. **(#10) Turn lifecycle compliance** — every status/flag change follows Turn Manager
    Core Rule #8 (not final until the turn is confirmed and not undone); undo reverts the
    entire canon adjudication, except a true-death turn which cannot be undone (TM #9).

## B3. State / data model

```
SettingPack {                     // static data, NOT serialized into saves
  characters: CanonCharacter[]    // {char_id, true_identity, alias_list[], is_major_canon,
                                  //  tier_profile, roles_in_events[]}
  events:     CanonEvent[]
  world_law:  { breakthrough_requirement: Map<tier, Predicate>, realm_names, special_rules }
}

CanonEvent {
  event_id:             string            // stable, setting-pack-authored, playthrough-invariant
  trigger_condition:    Predicate         // ONSET condition (distinct from premises = MAINTENANCE)
  earliest_world_time:  int   [1, inf)
  location_id:          string
  roles:                Role[]
  premises:             Premise[]         // length >= 1 REQUIRED (validated at load)
  canon_outcome:        { mechanical, narrative_summary }
  status:               StatusEnum        // initial: Dormant
  branch_target:        event_id | null   // required when on_break = branch
}

Role { tier_min:int, tier_max:int, target_tier:int, allowed_factions:set|EMPTY,
       excluded_ids:set (ALWAYS contains the player by default), priority:int (lower = higher priority),
       bound_character: char_id | null }

Premise { type: PremiseTypeEnum(8), args: struct, on_break: {substitute|vanish|branch} /* MANDATORY */,
          reversible: bool /* table-derived; custom_flag declares explicitly, default false */ }

StatusEnum = { Dormant, Dormant-Modified, Suspended, Due,
               Resolved-Canon, Resolved-Substituted, Branched, Vanished }
severity   = { Suspended:3, Vanished:3, Branched:2, Dormant-Modified:1, Dormant:0 }
terminal   = { Resolved-Canon, Resolved-Substituted, Branched, Vanished }

RuntimeState {
  status_by_event:            Map<event_id, StatusEnum>   // PERSISTED (incl. Suspended)
  bound_roles:                Map<event_id+role, char_id> // PERSISTED
  substitutes_used_this_turn: set<char_id>                // RUNTIME ONLY, reset each turn, NOT persisted
  downstream_index:           Map<event_id, event_id[]>   // precomputed at load, O(1) lookup
  longest_path:               int                         // computed at load, unit = EDGES
}
```

### State transition table (single source of truth for legal transitions)

| State | Condition | Transitions to |
|---|---|---|
| Dormant | Trigger unmet or before `earliest_world_time`; core premises hold | -> Due (trigger + earliest met); -> Suspended (`on_break=vanish` premise irreversibly broken — eager, flag locked immediately); -> Dormant-Modified (`substitute`/`branch` premise irreversibly broken) |
| Dormant-Modified | A premise is permanently broken under substitute/branch; the event still arrives as a variant | -> Due; -> Suspended (if a `vanish` premise later breaks too) |
| Suspended | Core role empty; awaiting rescue or expiry. **Cascade has NOT run yet** | -> Dormant-Modified (**only** via `canon_role_rescue`, Rule #4b); -> Vanished (due with core role still empty — **cascade runs here**) |
| Due | Adjudicated this turn | -> Resolved-Canon / Resolved-Substituted / Branched / Vanished |
| Resolved-Canon / Resolved-Substituted / Branched / Vanished | Terminal — written to World Memory as a fact | (none) |

Any code writing `status(event)` **must** go through `transition_event_status` (D.5b).
A cascade may never overwrite `Suspended` with `Dormant-Modified`.

## B4. Formulas and algorithms

### D.0 — `world_state` is an adapter, not a store

| Predicate | Owning system | Read interface |
|---|---|---|
| `alive(X)` | Death & Consequence | per-char boolean flag |
| `affinity(X)` vs threshold | NPC Affinity | `A_after` after `resolve_turn_affinity` |
| `possesses(X, item)` | Equipment/Inventory | ownership flag + `destroyed` flag |
| `location(X)` | Situation Gen | current position |
| `world_time` | Turn Manager | `world_time_advancement` (registry) |
| `event_completed(E)` | **This system** | `status(E)` |
| `song_tu_active(X, npc)` | NPC Affinity | `song_tu_relationship_active_npc_ids` |
| `custom_flag(flag_id)` | any system writing into `locked_result` | boolean, setting-pack data |

Every query is **O(1) on current state**; never scan history. No caching (a re-read after
a mock changes must see the new value — AC-13).

### D.1 — `premise_satisfied(premise, world_state)`

`premise_satisfied = EVAL[premise.type](premise.args, world_state)`. Result is always
boolean — there is no "unknown".

| `type` | Predicate | Reversible? |
|---|---|---|
| `alive` | `alive(char_id) == true` | **NO** |
| `affinity_at_least` | `affinity(npc_id) >= threshold` | YES |
| `affinity_at_most` | `affinity(npc_id) <= threshold` | YES |
| `possesses` | `possesses(char_id, item_id) == true` | YES, **except** `item.destroyed == true` -> NO |
| `at_location` | `location(char_id) == location_id` | YES |
| `event_completed` | `status(E) in {Resolved-Canon, Resolved-Substituted, Branched}` (**Vanished excluded**) | **NO** |
| `world_time_reached` | `world_time >= threshold` | **NO** |
| `song_tu_active` | `npc_id in song_tu_relationship_active_npc_ids` (no `char_id` param — always player<->NPC) | YES |
| `custom_flag` | `flag(flag_id) == expected_value` | declared in data, **default false** |

`reversible == false` -> eager break (Core Rule #6); `true` -> judged only at Due.

### D.2 — `is_due` and ordering

```
is_due(event) = trigger_condition(event, world_state)
            AND world_time >= earliest_world_time(event)
            AND status(event) in {Dormant, Dormant-Modified, Suspended}

resolution_order = sort(due_this_turn, key = (earliest_world_time ASC, event_id ASC))
```

Processed strictly sequentially. An NPC chosen as a substitute this turn is removed from
the pool of later Due events in the same turn via `substitutes_used_this_turn` — one NPC
never fills two roles in one turn.

### D.3 — `substitute_selection(role)` — mechanical, deterministic

```
eligible(c, role) = alive(c)
                AND tier(c) in [role.tier_min, role.tier_max]        // bounds INCLUSIVE
                AND (role.allowed_factions == EMPTY OR faction(c) in role.allowed_factions)
                AND c not in role.excluded_ids
                AND c not in substitutes_used_this_turn

fit_score(c, role) = abs(tier(c) - role.target_tier)
substitute_selection(role) = argmin over eligible of (fit_score, candidate_id)
```

No RNG, no AI: the same world state must yield the same result 1000 times and must not
depend on dictionary/hash insertion order. Empty pool -> `NULL`, and the fallback depends
on the call context (Due -> Vanished; rescue -> not rescued). The same `eligible()` backs
the player's nomination check (Rule #4b).

### D.4 — `cascade_vanish_check(event)`

**Load-time authoring validation** (all failures are refused at load, never runtime errors,
all reported together — see AC-38):
1. The `event_completed` dependency graph must be a **DAG** (cycles rejected).
2. Every event must have `premises.length >= 1` (0 premises makes "all premises hold"
   vacuously true, i.e. an unbreakable event).
3. `longest_path(downstream_index)` computed by one DFS, **unit = EDGES**; refuse load if
   `longest_path > CASCADE_MAX_DEPTH`, so valid content can never trip the runtime valve.
4. `resolution_order` must agree with edge direction: for every edge `A -> B` (B has
   premise `event_completed(A)`), require
   `(earliest_world_time(A), event_id(A)) < (earliest_world_time(B), event_id(B))`
   compared as a **pair**. Otherwise, with A and B due in the same turn, STEP 2 processes
   B first, reads `status(A)` as not-yet-terminal, and can permanently Vanish B by
   tie-break. `error_type = dependency_order_violation`.
5. Every premise must declare `on_break`; premises must not reference missing
   char/item/event ids; `breakthrough_requirement` must not use predicates with no
   owning source.

```
cascade_vanish_check(E, world_state, visited = EMPTY, depth = 0):   // called ONLY when E is officially Vanished
  IF depth >= CASCADE_MAX_DEPTH: RETURN []      // runtime safety valve; log "cascade depth limit hit"
  IF E.id in visited: RETURN []                 // cycle guard (log authoring error, never crash)
  visited.add(E.id)
  affected = []
  FOR D IN downstream_index[E.id]:              // status evaluated LIVE each touch, never snapshotted
    IF status(D) not in {Dormant, Dormant-Modified, Suspended}: CONTINUE   // terminal or Due -> skip
    p = the premise of D with type=event_completed, target=E.id
    lock canon_break_flag_[D.id] = true         // cascade IS an eager break source
    resolution = CASE p.on_break:
      vanish     -> is_due(D) ? Vanished : Suspended   // still rescuable if not yet due
      branch     -> Dormant-Modified                    // branch_target fires at Due, not here
      substitute -> Dormant-Modified                    // rebind via D.3 at Due, not here
    transition_event_status(D, resolution, source = "cascade_from_" + E.id)
    affected.append((D.id, applied_resolution(D)))      // the APPLIED value, may differ from proposed
    IF applied_resolution(D) == Vanished:
       affected += cascade_vanish_check(D, world_state, visited, depth + 1)
  RETURN affected
```

**Termination**: finite DAG + visited guard + depth cap. `visited` dedups only *cascade
sources*; it deliberately does not prevent a node D from being **evaluated** from several
sources — each of D's premises really did break independently. What is prevented is a
*wrong write*, and that is `transition_event_status`'s job. `affected` is bounded by the
number of events in the pack and does not grow with `world_time`.

**Diamond within one call**: if `downstream_index[E]` contains D1 and D2 and D1 also has
an edge to D2, the FOR loop may touch D2 twice. Because status is read live, the second
touch either sees a terminal status (skip via CONTINUE) or a non-terminal one (the
severity lattice arbitrates). Guard 1 covers the terminal case, Guard 2 the non-terminal
case; neither guard is redundant and no separate `visited` check for D is needed.

**Cut semantics when `depth >= CASCADE_MAX_DEPTH`**: cutting stops **eager propagation
only**, not adjudication. An event beyond the cut is still judged **lazily** at its own
Due (its `event_completed` premise reads the real source status, never a "was cut" state).
The single consequence is the loss of the early Suspended window (part of the rescue
opportunity) — an accepted, controlled degradation, unreachable in validated content.

### D.5 — `importance_tier(fact)` for World Memory

Pure, O(1), rule-based on `field_name`/`field_value` only — must never read outside
world state (spy-verified by AC-23).

| tier | Fact class | Matching rule |
|---|---|---|
| **3** | canon break / event outcome / NPC death | `canon_event_[id]_status` (any terminal), `canon_break_flag_[id]=true`, `death_flag_[char]=true` *(provisional name)* |
| **2** | tier breakthrough, large affinity swing, failed rescue | `breakthrough_flag_[char]=true` *(provisional)*, `affinity_delta_[npc]` with `abs(value) >= AFFINITY_MAGNITUDE_TIER2`, `canon_rescue_failed_[event_id]` |
| **1** | combat outcome | `battle_result_[char]` *(provisional — Combat has not named its enum field)* |
| **0** | ordinary delta | every other field with `has_signal=true` |

```
importance_tier(fact) = TIER_RULE(fact.field_name, fact.field_value)   // pure, O(1)
selected_facts(entity_id) = top_K(facts(entity_id),
                                  key = (importance_tier DESC, world_time DESC, fact_id ASC),
                                  K   = max_facts_per_entity)
```

This fills the key slot of WM Formula #3 only; WM owns `top_K` and the invariant
`|selected| <= max_facts_per_entity`. Backward compatible: uniform tiers degenerate the key
to pure recency. **Known proxy limitation**: facts carry deltas only (no `A_before`/
`A_after`), so "crossed an affinity threshold" is approximated by delta magnitude — a
deliberate compromise, not exact threshold detection.

### D.5b — `transition_event_status(E, proposed, source)` — the single writer

```
transition_event_status(E, proposed, source):
  IF is_terminal(status(E)):                    // Guard 1 — write-once for terminal status
     RETURN status(E)                            // no-op + log "ignored: E already terminal this turn"
  current_severity  = severity(status(E))
  proposed_severity = severity(proposed)
  IF proposed_severity < current_severity:      // Guard 2 — severity lattice (Core Rule #4)
     RETURN status(E)                            // no-op + log "ignored: lower severity from " + source
  status(E) := proposed                         // Guard 3 — one write per new severity level
  RETURN status(E)
```

All four writers (D.6 STEP 1, STEP 1b, STEP 2 and the D.4 cascade) must call this; direct
assignment to `status` is forbidden. `canon_event_[E.id]_status` reads the **final**
`status(E)` only at STEP 4, after the whole turn pipeline including recursive cascades —
this is what makes the field write-once per turn.

**Order independence when two proposals share a severity** (`Suspended` and `Vanished` are
both 3): independence then comes from Guard 1, not Guard 2 — once D is written Vanished by
whichever path runs first, `is_due(D)` becomes false because `status(D)` is no longer in
`{Dormant, Dormant-Modified, Suspended}`, so the loser can only re-propose the winning
value and Guard 1 blocks the rewrite.

### D.6 — `resolve_turn_canon(turn)` — per-turn pipeline

**Ordering constraint**: runs **after** Combat / Death & Consequence / NPC Affinity have
locked their `locked_result` (needed for eager checks) and **before** `resolve_turn_exp`.

```
resolve_turn_canon(turn):

  // STEP 1 — eager check to fixpoint
  WHILE something changed:        // "changed" = A VALUE ACTUALLY CHANGED this pass
                                  // (canon_break_flag false->true, or status(E) changed via
                                  //  transition_event_status) — NOT "an IF branch fired"
    FOR event not terminal, FOR non-reversible premise of event:
      IF touched_this_turn(premise, other systems' locked_results this turn)   // O(1)
         AND NOT premise_satisfied(premise):
        lock canon_break_flag_[event.id] = true                    // eager, Core Rule #6
        on_break = vanish     -> transition_event_status(event, Suspended,        "eager_break")
        on_break = branch     -> transition_event_status(event, Dormant-Modified, "eager_break")
        on_break = substitute -> transition_event_status(event, Dormant-Modified, "eager_break")

  // STEP 1b — player rescue (Rule #4b)
  IF classified_event(turn) == canon_role_rescue(event_E, char_C)
     AND status(E) == Suspended AND eligible(C, E.vacant_core_role):
    transition_event_status(E, Dormant-Modified, "rescue_success")
    lock canon_role_filled_[C] = true
  ELSE IF classified_event(turn) == canon_role_rescue(event_E, char_C)
       AND status(E) == Suspended:
    lock canon_rescue_failed_[E.id] = <enum reason from the failing eligible() condition>
    // status(E) unchanged — not rescued; result locked before narration

  // STEP 2 — adjudicate Due events in resolution_order (snapshot taken at STEP 2 entry)
  FOR event IN resolution_order(due_this_turn):
    IF is_terminal(status(event)): CONTINUE      // already cascaded terminal -> avoid double-resolve
    Suspended + core role still empty -> transition_event_status(event, Vanished, "due_suspended_expired") + cascade
    all premises hold                -> transition_event_status(event, Resolved-Canon, "due_all_premises_ok")
    ELSE (>=1 premise false, tie-break by severity):
      vanish     -> transition_event_status(event, Vanished, "due_tiebreak") + cascade (D.4)
      branch     -> transition_event_status(event, Branched, "due_tiebreak") + activate(branch_target)
      substitute -> rebind each empty role via D.3 sequentially, updating
                    substitutes_used_this_turn IMMEDIATELY after each binding;
                    any NULL -> transition_event_status(event, Vanished, "due_tiebreak") + cascade
                    success  -> transition_event_status(event, Resolved-Substituted, "due_tiebreak"),
                                lock canon_role_filled_[npc]

  // STEP 3 — breakthrough_requirement_met for characters awaiting breakthrough
  //   tier missing from the pack -> HARD false + log_warning "content gap"
  //     (distinct code path from "checked, not yet qualified" -> false, no warning)
  //   otherwise -> premise_satisfied(setting_pack.breakthrough_requirement[tier]); hand off to EXP

  // STEP 4 — write locked_result: {canon_break_flag_*, canon_event_*_status (final value only),
  //          canon_role_filled_*, canon_rescue_failed_*}
  // STEP 5 — Turn Manager Core Rule #8: all locks live only inside this turn's locked_result;
  //          undo reverts everything (status, flags, cascades). is_death_turn -> no undo (TM #9)
```

**STEP 1 termination proof**: the only mutable values are `canon_break_flag_[event]`
(monotone `false -> true`) and `status(event)` (monotone `Dormant -> Dormant-Modified ->
Suspended` within STEP 1; the only backward edge `Suspended -> Dormant-Modified` exists
solely in STEP 1b, outside this loop). STEP 1 evaluates only non-reversible premises: once
false, false forever. The lattice height is `<= 3 * |events|`, so the loop ends within
`3 * |events| + 1` iterations. **This requires that "changed" means a value truly
changed** — with "an IF branch fired" semantics, two events referencing each other through
`custom_flag` (not caught by the `event_completed` DAG validation) would loop forever.
`FIXPOINT_MAX_ITERATIONS` is a defense-in-depth valve only. Cycles in the `custom_flag`
graph are harmless and must **not** be banned by validation.

### `locked_result` schema written by this system

| Field pattern | Type | Derived `entity_id` | Written when |
|---|---|---|---|
| `canon_break_flag_[event_id]` | bool | `"global"` | First time any premise of the event breaks (eager or at Due) |
| `canon_event_[event_id]_status` | enum | `"global"` | When the event reaches a terminal status this turn |
| `canon_role_filled_[npc_id]` | bool | `[npc_id]` | Turn an NPC is bound to a replacement role (auto D.3 or player rescue) |
| `canon_rescue_failed_[event_id]` | enum | `"global"` | Turn a `canon_role_rescue` nomination fails eligibility; value in `{dead, tier_out_of_range, wrong_faction, excluded, no_vacant_role}` |

Field count per turn is bounded by (active events x premises + characters awaiting
breakthrough + 1 rescue-failed field) — finite, not growing with `world_time`. All values
are int/bool/enum; never float or free-form string.

**Canonical regression scenario (turns 41 / 55)**: turn 41, Tieu Vu dies -> STEP 1 locks
`canon_break_flag_e01=true`, e01 -> Suspended. No rescue. Turn 55, e01 due with the core
role empty -> Vanished + cascade: e02 -> Suspended (`on_break=vanish`, not yet due), e03
stays Dormant-Modified. `locked_result` of turn 55 =
`{canon_event_e01_status: "Vanished", canon_break_flag_e02: true}` — exactly two fields.

## B5. Tuning knobs

| Knob | Default | Safe range | Effect |
|---|---|---|---|
| `AFFINITY_MAGNITUDE_TIER2` | 15 | 10-25 | Raise: only extreme swings reach tier 2 (risk of missing near-threshold events). Lower: dilutes tier 2 |
| `CASCADE_MAX_DEPTH` | 20 | 5-50 | Runtime safety valve; must **never** fire in valid content (load-time longest-path validation). Too low -> valid Full-Vision cascades are refused at load rather than silently cut |
| `FIXPOINT_MAX_ITERATIONS` | 100 | 20-200 | Safety valve for the STEP 1 WHILE loop; only catches an implementation violating the "changed" definition, not content |

**Not knobs** (locked design decisions, changing them requires re-review): the D.1
reversibility table, the D.2 tie-break `(earliest_world_time, event_id)`, the D.3 tie-break
`(fit_score, candidate_id)`, the policy lattice `vanish > branch > substitute`, and the D.5
tier rules. `earliest_world_time`, `tier_min/max`, `target_tier`, `allowed_factions`,
`role.priority` and premise data are **per-event authoring content**, not global knobs.

## B6. Edge cases (resolved)

- Undo of a turn containing a canon adjudication reverts **everything**: statuses across
  the whole cascade chain, Suspended states, `canon_break_flag`, `canon_role_filled`. A
  turn with `is_death_turn=true` cannot be undone, so a death-born canon break is instantly
  permanent.
- A character bound to a replacement role who dies later turns the binding into an
  `alive(new_char)` premise carrying the **original role's** `on_break`, so the event can
  return to Suspended. Rescues are unlimited in number.
- An ineligible nomination -> not rescued, reason locked in `canon_rescue_failed_[event_id]`
  before narration; the player may retry on any later turn, unlimited.
- `canon_role_rescue` aimed at an event that is not Suspended -> **mechanical no-op**: no
  field written, status unchanged, not an error; the action still narrates normally.
- A `vanish` premise of a **reversible** type that is false at Due -> Vanished immediately
  at Due, with **no** Suspended window (Suspended exists only for eager breaks of
  non-reversible premises).
- The player is never auto-selected as a substitute: `role.excluded_ids` contains the player
  by default; authoring may open it per event.
- A pack with zero events still runs fully: `breakthrough_requirement` works,
  `resolve_turn_canon` returns an empty `locked_result` each turn.
- Authoring errors (cycles, dangling refs, sourceless predicates, `premises=EMPTY`, missing
  `on_break`, `longest_path > CASCADE_MAX_DEPTH`, dependency-order violation) are detected
  at **load** and refused with a complete structured error list, never mid-session.
- Save/load mid-run: every event status including Suspended is durable state and is
  serialized; the rescue window survives a reload. `substitutes_used_this_turn` is runtime
  only and is **not** serialized.
- An `is_major_canon` character can die: every related `alive` premise breaks eagerly with
  no exception path, while the profile interface still returns `true_identity` afterwards.
- Breaking and rescuing in the same turn is structurally impossible: `turn.classified_event`
  is a single field (Turn Manager schema), not an array.
- A `trigger_condition` that can never be satisfied again leaves the event Dormant forever —
  not an error and not a leak (per-turn scanning is bounded by active events).

## B7. Interfaces

**Provides:**
- `breakthrough_requirement_met(tier) -> bool` — consumed by EXP & Realm Progression,
  evaluated each turn for characters awaiting breakthrough; computed in STEP 3, strictly
  before `resolve_turn_exp`.
- `importance_tier(fact) -> int {0..3}` — consumed by World Memory Formula #3.
- `status(E) -> StatusEnum` / `event_completed(E)` — consumed internally and by premises.
- `canon_due_payload(turn)` -> `{resolved_events: [...]}` — alias for
  `resolution_order(due_this_turn)` **after** STEP 2 completes, in `resolution_order` order;
  `null` when `due_this_turn` is empty. Consumed by Situation/Encounter Generation.
- `canon_role_npcs(location_id)` -> NPCs currently holding a role
  (`canon_role_filled_[npc_id]=true`) in any event whose `location_id` matches and whose
  status is in `{Active, Due, Suspended}`, sorted by `(role.priority ASC, npc_id ASC)`.
- `rescue_window_final(event_id) -> bool` — `= is_due(event)` evaluated **at turn start**
  and **only** when `status(event) == Suspended`; every other status returns `false` (safe
  default, no "unknown"). True means: without a valid `canon_role_rescue` this very turn,
  STEP 2 will Vanish the event at end of turn. Emitted to Situation/Encounter Generation as
  a **prompt directive** for `suggestion_call` — never a UI badge or timer.
- Canonical character profile reads for Character Card & Identity (`true_identity`,
  `is_major_canon`, disguise state, tier profile).

**Consumes:** Death & Consequence (`alive(X)`, `death_flag_[char]` *provisional*);
NPC Affinity (`A_after`, `song_tu_relationship_active_npc_ids`, deep-hostility flags);
Equipment/Inventory (`possesses`, `destroyed` — **not yet available**);
Situation/Encounter Generation (`classified_event` = `canon_role_rescue`, `location(X)`);
Turn Manager (`world_time`, deferred-commit lifecycle, `is_death_turn`, single-field
`classified_event`); World Memory (`get_facts_by_entity` for history-dependent premises);
Persistence (serialize event statuses and rebound roles; the setting pack itself is static
data and is not saved).

**Writes into `locked_result`** (consumed by WM fact extraction): `canon_break_flag_[event_id]`,
`canon_event_[event_id]_status`, `canon_role_filled_[npc_id]`, `canon_rescue_failed_[event_id]`.

**UI requirements** (no screen of its own): (1) Character Card shows the true identity for
`is_major_canon` under disguise, and only "concealing" for ordinary NPCs; (2) a canon break
must be perceivable through narration plus a vermilion visual accent — **no** badge, timer
or confirmation dialog, including for a closing rescue window (the mechanical layer supplies
`rescue_window_final` and `canon_rescue_failed_*` as prompt directives instead);
(3) no raw canon numbers, event ids, premises or tier requirements in narration.

## B8. Acceptance criteria checklist

Story type: **Logic -> BLOCKING**, automated tests at
`tests/unit/setting-canon-integration/`, naming `setting_canon_[feature]_test`,
`test_[scenario]_[expected]`. Default fixture: minimal pack (3 NPCs, 2-3 events,
`breakthrough_requirement` per tier) with `AFFINITY_MAGNITUDE_TIER2=15`,
`CASCADE_MAX_DEPTH=20`. Every external system must be injected as a mock; provisional
interfaces are tagged `provisional-interface` in the test file.

Core rules
- [ ] **AC-01** Two different packs -> all queries follow the loaded pack; no hard-coded setting values.
- [ ] **AC-02** Transmigrator privilege is read-only: major canon returns `true_identity`,
      ordinary NPC returns "concealing"; spy confirms no field is written.
- [ ] **AC-03** `trigger_condition=false` with all premises true -> not Due; trigger true
      with a broken `substitute` premise -> Due as a variant.
- [ ] **AC-04** Three events with `substitute`/`vanish`/`branch` -> Dormant-Modified /
      Suspended / Dormant-Modified; schema has no "invulnerable" attribute.
- [ ] **AC-05** Severity lattice is global: `{substitute,branch}`->Branched,
      `{substitute,vanish}`->Vanished, all three->Vanished, regardless of premise
      declaration order; and identical `status(D)` under both `resolution_order` orders
      when two independent cascades touch D.
- [ ] **AC-06** Successful rescue -> Dormant-Modified, `canon_role_filled_[C]=true` that
      turn, later Due -> Resolved-Substituted, never Vanished.
- [ ] **AC-07** Five failure variants (dead / wrong tier / wrong faction / excluded /
      already used as substitute this turn) -> event stays Suspended, no
      `canon_role_filled`, correct `canon_rescue_failed_[E.id]` enum, locked **before**
      `narration_call` (spy call-order).
- [ ] **AC-08** Suspended from turn N: downstream D untouched every turn until N+k; cascade
      runs exactly at N+k when E becomes Vanished.
- [ ] **AC-09** A full turn (eager break + rescue + Due substitute + cascade) issues **0** AI calls.
- [ ] **AC-10** Eager vs lazy: `alive` break locks the flag that turn; `affinity` dip does
      not, and recovers by Due -> Resolved-Canon.
- [ ] **AC-11** Four Due fixtures produce all four terminal states in the Due turn itself;
      payload to Situation Gen carries status + `canon_outcome`.
- [ ] **AC-12** `breakthrough_requirement_met(tier)` is data-driven; no setting-specific
      string in the code path.

Formulas
- [ ] **AC-13** D.0 adapter: each predicate calls the owning interface; identical call count
      at turn 5 and turn 500 (O(1)); no stale cache.
- [ ] **AC-14** All 8 premise semantics, `event_completed` false for Vanished, always boolean.
- [ ] **AC-15** Reversibility table drives eager/lazy, including `possesses` + `destroyed`.
- [ ] **AC-16** `is_due` is the AND of three conditions; terminal never Due again; Suspended
      can be Due.
- [ ] **AC-17** Two events at `earliest=30` due at wt=32 -> e03 before e07; e03's `npc_012`
      excluded from e07's pool that turn; `earliest=20` precedes `earliest=30` regardless of id.
- [ ] **AC-18** Eligibility matrix, one violated condition per case; `tier_min`/`tier_max`
      **inclusive**; `allowed_factions=EMPTY` -> any faction.
- [ ] **AC-19** argmin + `candidate_id` tie-break -> `npc_004`; empty pool -> NULL, no throw,
      context-dependent fallback.
- [ ] **AC-20** Determinism: 1000 runs plus reversed insertion order -> one single result.
- [ ] **AC-21** DAG validation at load rejects cycles; valid pack -> `downstream_index`
      matches premise declarations both ways.
- [ ] **AC-22** Two-level cascade stops correctly; Due downstream -> Vanished immediately +
      next level; deliberate cycle via test hook -> visited guard, log, no crash; depth-25
      chain (bypassing load validation) stops at exactly depth 20; event 21 is **not**
      Suspended early but is still adjudicated lazily at its own Due.
- [ ] **AC-22b** Fan-out/diamond: D reached by E1 (`vanish`) and E5 (`substitute`) ->
      `status(D)=Suspended` in **both** `resolution_order` orders; `canon_event_[D.id]_status`
      / `canon_break_flag_[D.id]` appear exactly once in `locked_result`.
- [ ] **AC-22d** Chain of exactly `CASCADE_MAX_DEPTH` edges passes load and processes all 20
      transitions (valve blocks only the non-existent 21st call).
- [ ] **AC-23** D.5 tier table is a pure function; boundary `abs(value)=15 -> 2`, `14 -> 0`;
      re-run with `AFFINITY_MAGNITUDE_TIER2=10` proves the knob is read, not hard-coded.
- [ ] **AC-24** `top_K` with the new key matches the worked example.
- [ ] **AC-24b** `fact_id ASC` decides ties on `(importance_tier, world_time)` deterministically.
- [ ] **AC-25** Backward compatibility: uniform tiers -> identical to pure-recency selection.
- [ ] **AC-26** Turn ordering: canon resolves after Combat/D&C/NPC Affinity, before `resolve_turn_exp`.
- [ ] **AC-27** STEP 1 reaches fixpoint (A breaks -> B breaks the same turn); untouched
      premises are not re-evaluated.
- [ ] **AC-27b** Mutual `custom_flag` cycle converges within `3*2+1=7` iterations and never
      reaches `FIXPOINT_MAX_ITERATIONS`; the test **must fail** if "changed" is implemented
      as "an IF branch fired".
- [ ] **AC-28** Missing tier -> hard `false` + "content gap" warning; defined-but-unmet -> `false`, no warning.
- [ ] **AC-29** STEP 4 field patterns and types; all in one `locked_result`; bounded field count.
- [ ] **AC-30** Fixed regression on turns 41/55 with exactly the two expected fields at turn 55.
- [ ] **AC-31** Event with `earliest_world_time=1` resolves on turn 1, no underflow.

Edge cases
- [ ] **AC-32** Undo restores the full snapshot including cascade chains and Suspended;
      `is_death_turn` cannot be undone.
- [ ] **AC-33** Replacement character dying later re-Suspends the event; unlimited rescues.
- [ ] **AC-34** Retry after a failed rescue succeeds; rescue aimed at a non-Suspended event
      is a mechanical no-op.
- [ ] **AC-35** Reversible `vanish` premise -> Vanished at Due with no Suspended window.
- [ ] **AC-36** Player never auto-selected as substitute unless authoring opens it explicitly.
- [ ] **AC-37** Zero-event pack loads and runs; empty `locked_result` each turn.
- [ ] **AC-38** Load validation reports **all** errors as structured objects
      `{error_type: {dangling_ref, missing_predicate_source, empty_premises, missing_on_break,
      cascade_too_deep, dependency_order_violation}, event_id|char_id|item_id, message}`.
- [ ] **AC-38b** Isolated `dependency_order_violation` naming the violating `(A.id, B.id)`
      pair; loads successfully once `earliest_world_time(B) >= earliest_world_time(A)`.
- [ ] **AC-39** Save/load preserves all statuses and rebound roles;
      `substitutes_used_this_turn` is **not** in the blob.
- [ ] **AC-40** `is_major_canon` death breaks `alive` premises eagerly with no exception path.
- [ ] **AC-41** Schema assertion: `turn.classified_event` is a single field, so
      break-and-rescue in one turn is structurally impossible.
- [ ] **AC-42** Permanently unsatisfiable trigger -> Dormant for 100 turns, no leak.

Cross-system
- [ ] **AC-43** EXP receives `breakthrough_requirement_met` from the same turn, computed before `resolve_turn_exp`.
- [ ] **AC-44** WM extraction assigns `entity_id="global"` to `canon_event_*_status` /
      `canon_break_flag_*` and `"npc_007"` to `canon_role_filled_npc_007`.
- [ ] **AC-45** All `canon_*` fields locked before `narration_call`; contradicting
      `narration_text` changes no status or flag.
- [ ] **AC-46** Affinity premise reads `A_after` of the same turn, not `A_before`.
- [ ] **AC-46b** `rescue_window_final` equals `is_due(E)` **iff** `status(E)==Suspended`,
      else always `false`.
- [ ] **AC-46c** `rescue_window_final` actually reaches the `suggestion_call` payload with
      the correct value (spy).
- [ ] **AC-47** *(ADVISORY, non-automatable)* Narration is consistent with every locked
      resolution; golden scenario set, >= 1 scenario per resolution type, 2 independent
      raters, pass at >= 90% consistency, evidence in `production/qa/evidence/`, re-run on
      prompt/model change.
- [ ] **AC-48** *(ADVISORY, deferred, manual)* Character Card displays the transmigrator privilege.
- [ ] **AC-49** Container is slot-scoped: after "Play again" creates slot B, `status(e01)`
      reads slot B's blob (original `Dormant`/`Pending`), never slot A's `Suspended`;
      reopening slot A read-only still yields `Suspended`.

## B9. Open questions / ambiguities (SC)

- **Three provisional field names in D.5** (`death_flag_[char]`, `breakthrough_flag_[char]`,
  `battle_result_[char]`) must be reconciled when Death & Consequence, EXP and Combat lock
  their real `locked_result` schemas.
- **`destroyed` flag for items** does not exist in the already-**Approved**
  `equipment-skill-data-system.md`. Reopening an approved document requires producer
  coordination. **Temporary MVP constraint: do not author any `possesses` premise** until
  the flag exists.
- **`location(X)` has no owning system yet**, so `at_location` premises must not be authored
  in MVP either.
- **"Stop disguising mid-story" for Alpha**: MVP commits to a static alias list. Supporting
  it would require this system to own a runtime per-character/per-alias flag with an explicit
  writer and serialization (breaking the "setting pack is static, unsaved data" assumption),
  and Character Card D.2 would have to read that flag instead of inferring from the alias list.
- **MVP canon-event authoring is unresolved** (which 2-3 events, which premises/roles, which
  `breakthrough_requirement` values), with two binding rubric constraints: (a) at least one
  MVP event must use `on_break=vanish` on a **non-romantic** premise (political/military/
  territorial); (b) the MVP pack must include at least one `is_major_canon=false` character
  who is concealing their identity. With only 3 NPCs budgeted, (a) and (b) should be merged
  into the **same hostile NPC**.
- **Playtest rubric with >= 2-3 distinct canon situations** has not been run (HIGH-RISK
  mitigation).
- **Test-coverage backlog** (write before implementation, not now): AC-22c (bit-identical
  full `locked_result` across reversed orders), AC-38c (depth-25 chain refused through the
  normal load path), AC-47b (golden scenario for two consecutive failed rescues and
  emotional-valence discrimination). Also tracked, non-blocking: a mis-declared
  `on_break=substitute` cannot be detected mechanically (D.3 deliberately has no
  personality/relationship dimension, to protect AC-20 determinism) — manual review at
  authoring time only.
- **Narration ordering for passive tragedy**: whether the AI writing an ordinary combat turn
  "knows" the opponent holds a canon role (affects foreshadowing tone) is routed to
  `systems-designer` / `lead-programmer` at `/create-architecture`.

---

# PART C — Shared integration contract (both systems)

1. **Fact pipeline**: SC writes `canon_*` fields into `locked_result` -> WM Formula #2
   extracts one fact per signalling field with the derived `entity_id` -> WM Formula #3
   ranks them using SC's `importance_tier` -> ranked facts enter the prompt within the
   Formula #4/#5 budget. No AI call at any point in this chain.
2. **Turn ordering per turn**: Combat / Death & Consequence / NPC Affinity lock results ->
   `resolve_turn_canon` (STEP 1..4) -> `resolve_turn_exp` -> WM write turn record (atomic
   write + extraction) -> WM build AI Context View -> `narration_call`. Every canon field
   must exist in `locked_result` before narration; `narration_text` is never parsed back.
3. **Determinism contract**: WM `top_K` requires `(importance_tier, world_time, fact_id)`;
   SC requires `(fit_score, candidate_id)`, `(earliest_world_time, event_id)` and the
   severity lattice. All must be order-independent and hash-order-independent.
4. **Persistence contract**: mandatory save blobs = WM Full Narrative Log, WM AI Context
   View, SC event statuses (including Suspended) and rebound roles. Not saved: the setting
   pack (static) and `substitutes_used_this_turn` (per-turn runtime).
5. **Undo contract**: undo hard-deletes the WM turn record and fully reverts SC statuses,
   flags and cascades; WM eviction is one-way and is never reversed by an undo;
   `is_death_turn` turns cannot be undone at all.
