# ADR-0005: World Memory RAM Residency — MVP Synchronous, Async-Shaped for Full Vision

## Status

Accepted

## Date

2026-08-12

## Last Verified

2026-08-12

## Decision Makers

user + `godot-specialist` (engine validation — APPROVE-WITH-NOTES, 3 non-blocking
findings incorporated, 2026-08-12).
*(TD-ADR strategic review skipped — `review-mode=lean`, not a PHASE-GATE.)*

## Summary

Ratifies World Memory's own proposed MVP fallback — the Full Narrative Log and
extracted-fact store stay fully RAM-resident for the whole session, `get_turn_page()`/
`total_turns()`/`get_turn()`/`get_processing_state()` remain effectively synchronous, and
Core UI's `#15` D.3/D.3b behaviors (cold-start-instant, double-tap-swallow) need no
change — but locks the **public interface shape as `await`-based starting now**, so
Full Vision's eventual move to real bounded-RAM async IndexedDB reads (reusing
ADR-0002's already-validated cursor-scan mechanism) requires zero call-site changes at
Core UI, only a World Memory-internal implementation swap. Closes the GDD's own
explicitly-flagged "assumption written to be overturned by an ADR, not to self-approve"
Open Question with a concrete numeric ceiling instead of an open-ended risk.

## Engine Compatibility

| Field | Value |
|-------|-------|
| **Engine** | Godot 4.6 |
| **Domain** | Core / Web Export |
| **Knowledge Risk** | MEDIUM — the load-bearing MEMFS/IDBFS behavior this ADR's reasoning depends on (Godot Web export's `user://` mirrors the entire file in RAM, no partial/lazy load) is already source-verified (`web-export.md` Q5/Q6, LOW risk). The one genuinely unverified claim is GDScript's `await`-on-a-plain-non-coroutine-expression semantics (used for the async-shaped-now interface decision below) — not confirmed anywhere in the engine reference library yet. |
| **References Consulted** | `docs/engine-reference/godot/modules/web-export.md` (Group B, Q5-Q6, source-verified); `docs/engine-reference/godot/deprecated-apis.md` (`await signal` replacing `yield()`, GDScript 2.0 coroutine syntax, since 4.0) |
| **Post-Cutoff APIs Used** | None new beyond what ADR-0002/0003 already established — this ADR reuses the already-validated `[slot_id, world_time]` compound-key cursor-scan pattern (Experiment 2b) for its Full Vision migration path, not for MVP. |
| **Verification Required** | Whether `await get_turn_page(...)` on an MVP implementation that is a plain synchronous function (no internal `await`) resolves same-frame with zero suspension, as GDScript's `await`-on-non-coroutine-expression semantics are believed to allow — see Risks. Recommend a 5-minute GUT spike before Core UI's `#15` implementation starts, not a full prototype cycle. |

## ADR Dependencies

| Field | Value |
|-------|-------|
| **Depends On** | ADR-0002 (Accepted) — Full Vision's migration path reuses its validated `[slot_id, world_time]` compound-key cursor-scan (Experiment 2b) and `JavaScriptBridge`-direct-IndexedDB pattern; not required for MVP itself. |
| **Enables** | World Memory implementation (`get_turn_page`/`total_turns`/`get_turn`/`get_processing_state`); Core UI/Screen Navigation `#15` implementation (D.3 Story Log pagination, D.3b S2 live window) — both were blocked on this ADR per their own Open Questions/dependency declarations. |
| **Blocks** | Any story implementing World Memory's Public Interface or Core UI's D.3/D.3b. |
| **Ordering Note** | Must be Accepted before `/create-epics` scopes World Memory or Core UI `#15`. This is the last of the 3 Foundation/Core-layer blocking ADRs identified in Phase 6 of `/create-architecture` — once Accepted, all prerequisite ADRs for `/create-epics` are in place. |

## Context

### Problem Statement

World Memory's Full Narrative Log and extracted-fact store are both designed
never-purge — but no document had architected who is responsible for bounding RAM usage
at runtime on Mobile Web (WASM32 heap-constrained). The GDD itself surfaced this as
serious, not theoretical, after a `godot-specialist` source-read: Godot Web export
mounts `user://` via Emscripten IDBFS, which mirrors the **entire file in RAM (MEMFS)**
and only syncs to IndexedDB in batch on `syncfs()` — meaning a naive "paginate via
`FileAccess`" design does not bound RAM at all. The only way to get genuinely
RAM-bounded reads is to bypass `FileAccess`/IDBFS entirely and query IndexedDB directly
via `JavaScriptBridge` — and IndexedDB is inherently asynchronous. (This MEMFS fact
explains *why* a `FileAccess`-based pagination scheme was never a real option — it is
not, itself, what this ADR's MVP decision relies on: ADR-0002 already abandoned
`FileAccess`/MEMFS entirely for Persistence, and this ADR's slot-open replay reuses that
same direct-IndexedDB mechanism. `godot-specialist` review, 2026-08-12.) Meanwhile, Core UI's
`#15` (D.3 Story Log pagination, D.3b S2 live window) already designed several
behaviors — cold-start "hiện ngay, KHÔNG chờ" (AC-50), double-tap-swallow — assuming
`get_turn_page()`/`total_turns()` resolve synchronously, in-frame. These are two mutually
exclusive assumptions baked into two different Approved/Designed GDDs, neither written
down as an explicit assumption until the cross-reference surfaced it. Additionally, WASM
linear memory only grows within a session (never shrinks), so even a temporary RAM peak
(e.g. AC-20's batch-extract when loading an old save) leaves a permanent floor for the
rest of the session — a genuine OOM risk on long playthroughs on memory-constrained
mobile browsers if left unbounded.

The GDD itself proposes a temporary MVP stance (full RAM residency, keep the interfaces
synchronous, no change to `#15`) but explicitly frames it as "written to be overturned
by an ADR, not to self-approve" — this ADR is that formal review.

Cost of not deciding: World Memory and Core UI `#15` cannot be implemented — both have
this ADR as a hard, explicitly-declared dependency.

### Current State

No code exists for World Memory or Core UI `#15` yet.

### Constraints

- Godot Web export's `user://` (IDBFS/MEMFS) does not provide bounded-RAM reads under
  any configuration — this is an engine-level fact (source-verified), not a design
  choice this ADR can work around by choosing a different `FileAccess`-based approach.
- Core UI `#15` (Designed, not yet built) has multiple ACs (AC-50 and others) written
  against a synchronous read assumption — changing that assumption now means rewriting
  those ACs; keeping it means accepting the RAM-residency trade-off this ADR must
  formally justify with numbers, not just informally accept.
- MVP scope is small (per `systems-index.md`: 3 seed NPCs) — the real question is
  whether that scope keeps realistic playthrough lengths far enough below any plausible
  mobile heap ceiling, not whether unbounded growth is theoretically safe forever.
- Solo/small-team MVP budget — per this session's established `/architecture-decision`
  precedent (ADR-0001/0002/0003/0004), prefer the option with the smallest footprint
  when the numbers support it being safe, while keeping a documented, low-cost path to
  the more robust option for later.

### Requirements

- Must give a concrete, numeric answer to "is RAM residency actually safe for MVP" —
  not just repeat the GDD's qualitative "probably fine, 3 NPCs" reasoning without
  grounding it in the project's own already-established byte-accounting formula.
- Must not force Core UI `#15`'s already-Designed synchronous-read ACs to be rewritten,
  unless the numbers show MVP-scope RAM residency is actually unsafe.
- Must leave a low-cost path to Full Vision's real bounded-RAM solution — "low-cost"
  meaning it should not require touching Core UI's call sites when that migration
  eventually happens, if achievable without meaningfully complicating MVP.

## Decision

**MVP: full RAM residency, ratified with a numeric ceiling.** World Memory holds the
entire confirmed-turn Full Narrative Log and extracted-fact store for the open slot in a
GDScript-side `Array`/`Dictionary` structure, populated once at slot-open (replaying
Persistence's latest snapshot + `turn_records` since it, the same Load mechanism
ADR-0002 already defined) and updated live as turns confirm/undo. Core UI `#15`'s
existing synchronous-read-shaped ACs (AC-50 cold-start-instant, double-tap-swallow, etc.)
require **no changes**.

**Numeric grounding** (closes the GDD's "written to be overturned, not self-approved"
flag with an actual number instead of leaving it qualitative): using
`persistence-save-system.md`'s own worked example (`avg_turn_record_bytes ≈ 800` bytes
serialized), and applying a conservative **8× overhead multiplier** for GDScript
`Dictionary`/`Variant` boxing versus raw serialized bytes (Dictionaries hold hashed
key-value pairs with per-entry `Variant` overhead, not a packed binary layout — 8× is a
deliberately pessimistic estimate, not a measured one, precisely because no measured
number exists yet):

```
ram_resident_bytes(world_time) ≈ world_time × avg_turn_record_bytes × 8
```

At `world_time = 2,000` (a very long single playthrough for this game's format —
turn-based interactive fiction, not an open-world game measured in tens of thousands of
actions) → **≈ 12.8 MB**. At `world_time = 10,000` (an extreme outlier) → **≈ 64 MB**.
Both are small relative to any plausible mobile WASM heap budget once Godot's own
engine/asset footprint is accounted for — but no project-specific measured ceiling
exists yet (see Risks). Extracted facts add a smaller, bounded-per-entity contribution
(top-K facts per entity, not one record per turn) and do not change this conclusion.

**One sub-component of the 8× is not an estimate — it is exactly computable from data
this project already has** (`godot-specialist` review, 2026-08-12): GDScript's `String`
is stored internally as UTF-32 (4 bytes/character), not UTF-8. `persistence-save-system.md`'s
own worked example already gives `narration_text ≈ 300 Vietnamese UTF-8 characters ≈
600 bytes` — the same text held as a GDScript `String` is `300 × 4 = 1,200 bytes`, an
exact **2×** multiplier on the majority-share component of a turn record's size, before
any Dictionary/Variant boxing overhead is added on top. This 2× stacks with (does not
get replaced by) the boxing overhead — a blended real-world multiplier could plausibly
land closer to 12-16× than a flat 8×, but even at 16× the `world_time=2,000` estimate is
still only ≈25.6 MB, well within the same conclusion. The 8× used above is kept as the
headline planning number because it is the simpler, still-pessimistic round figure; this
2× component is the one part of it that is derived, not guessed.

**Full Vision migration path, pre-shaped now at near-zero MVP cost**: World Memory's
public read interface (`get_turn_page`, `total_turns`, `get_turn`,
`get_processing_state`) is declared **`await`-shaped starting now**, even though the MVP
implementation is a plain synchronous function with no internal `await`/yield. Every
Core UI call site writes `await get_turn_page(...)` from day one. GDScript's semantics
for `await` on a plain (non-`Signal`, non-coroutine) expression are understood to
evaluate and return the value immediately with no actual frame suspension — meaning
AC-50's "hiện ngay, KHÔNG chờ" holds exactly as designed under MVP, with **zero
behavioral or call-site change required** later when Full Vision swaps the
*implementation* to real async IndexedDB cursor-scan queries (reusing ADR-0002's
validated `[slot_id, world_time]` pattern). This is the one point in this ADR flagged
`Verification Required` above — a small GUT spike should confirm this semantics claim
before Core UI's `#15` implementation begins, not before this ADR is Accepted (the
claim, if wrong, would change *how* the MVP function is written, not *whether* RAM
residency is the right MVP call).

**No new runtime RAM monitoring for MVP.** The numeric grounding above is judged
sufficient reasoning for MVP scope without adding a `warn_triggered`-style live counter
(Persistence's existing quota-warning pattern was considered and explicitly not
duplicated here — see Alternatives). True empirical verification of the actual
per-device WASM heap ceiling is deferred to the project's existing `/soak-test` protocol
during Polish phase (extended memory-growth observation over a long session on real
target devices) rather than a new synthetic prototype — this reuses planned
infrastructure instead of adding new process.

### Architecture

```
Slot open (Awaiting Action / cold-start)
      │
      ▼
World Memory replays Persistence's latest snapshot + turn_records since it
(ADR-0002's existing Load mechanism — unchanged)
      │
      ▼
┌──────────────────────────────────────────────┐
│ World Memory (RAM-resident, GDScript-side)     │
│   _full_log: Array[Dictionary]  (turn records) │
│   _extracted_facts: Dictionary[entity_id, ...] │
│   — never purged for the open slot's lifetime  │
└──────────────────────────────────────────────┘
      │
      │  await get_turn_page(anchor, count, direction)  ◄── Core UI #15
      │  await total_turns()                             ◄── (D.3, D.3b)
      │  await get_turn(turn_id)
      │  await get_processing_state(turn_id)
      ▼
MVP: plain synchronous slice of _full_log — `await` resolves same-frame,
     zero suspension (Verification Required — see above)

Full Vision (future, separate migration, NOT this ADR's implementation):
     same `await` call sites at Core UI, UNCHANGED — only World Memory's
     internal implementation swaps to real async IndexedDB cursor-scan
     queries via JavaScriptBridge (ADR-0002 Experiment 2b pattern),
     bounding RAM to a real sliding window instead of the full log.
```

### Key Interfaces

```gdscript
# World Memory's public read interface -- async-SHAPED starting at MVP, even though
# the MVP body has no internal await. Every caller (Core UI #15) writes `await` from
# day one so Full Vision's real-async implementation swap needs ZERO call-site changes.

func get_turn_page(anchor_turn_id: int, count: int, direction: StringName) -> Dictionary:
    # MVP body: plain synchronous Array slice of _full_log. No internal `await`/yield.
    # Callers MUST still write `await get_turn_page(...)` (see Core UI call sites below)
    # -- this is what makes the Full Vision swap call-site-free later.
    # returns {records: Array[Dictionary], has_more: bool}
    ...

func total_turns() -> int:
    # MVP body: O(1) counter read (already specified by world-memory-context-management.md
    # Public Interface -- this ADR does not change that invariant, only the call-site shape)
    ...

func get_turn(turn_id: int) -> Dictionary:
    ...

func get_processing_state(turn_id: int) -> Variant:
    ...

# Core UI #15 call sites (D.3 cold-start example) -- written `await`-shaped from MVP:

func _cold_start_load_page() -> void:
    var page: Dictionary = await world_memory.get_turn_page(anchor, count, direction)
    # AC-50 "hiện ngay, KHÔNG chờ" is satisfied because the MVP implementation above
    # resolves same-frame -- this line does not introduce a visible delay under MVP.
    _render_page(page)
```

### Implementation Guidelines

- World Memory's slot-open replay (populating `_full_log`/`_extracted_facts` from
  Persistence) is the ONE place a real, potentially-multi-frame async wait already
  exists in this design (reading `turn_records` via ADR-0002's mechanism) — this ADR
  does not change that; it only concerns the READ interface's shape after the slot is
  already open and resident.
- Do not confuse this ADR's RAM-residency decision with Persistence's own storage
  durability question (ADR-0002) — they are different concerns operating at different
  layers (Persistence: what's durable on disk; this ADR: what's resident in RAM while
  playing) that happen to share the same underlying engine constraint (MEMFS/IDBFS).
- The 8× overhead multiplier (Decision, Numeric grounding) is a deliberately pessimistic
  planning estimate, not a measured constant — do not treat it as validated until a real
  measurement exists (see Risks/Validation Criteria).
- If the `await`-on-plain-expression verification spike (Verification Required) turns
  out to be wrong for Godot 4.6's actual semantics, the fallback is trivial: wrap the
  MVP body in a 1-frame-deferred `Signal`-based coroutine instead of a plain function —
  this changes nothing about the Decision's conclusion (RAM residency is still safe;
  only the exact mechanism for keeping AC-50's "instant" feel needs a 1-line adjustment).
- **Coroutine "contagion" — any function whose body contains `await` becomes a
  coroutine to ITS OWN caller, whether or not it ever actually suspends**
  (`godot-specialist` finding, 2026-08-12). Every call site of the Public Interface —
  and every function that wraps one, like the `_cold_start_load_page()` example above —
  must therefore itself be async-shaped. **None of these may be called directly from an
  engine callback that cannot itself `await`** (`_process()`, `_physics_process()`,
  `_draw()`, `_input()`, etc.). This is harmless at MVP (no real suspension ever
  happens), but is exactly the class of bug that would silently break the moment Full
  Vision's implementation starts actually suspending — audit call sites against this
  rule now, while it's free to fix, not later.

## Alternatives Considered

### Alternative 1: Build async-IndexedDB-backed reads from day one (reject MVP fallback)

- **Description**: implement `get_turn_page()`/`total_turns()` as real async queries
  against IndexedDB via `JavaScriptBridge` from the start, reusing ADR-0002's validated
  cursor-scan mechanism (Experiment 2b) immediately rather than deferring it.
- **Pros**: maximally safe against RAM growth at any playthrough length; no reliance on
  an unmeasured 8× overhead estimate.
- **Cons**: requires rewriting Core UI `#15`'s already-Designed synchronous-read ACs
  (AC-50 cold-start-instant, double-tap-swallow) — real async IndexedDB reads have
  genuine multi-frame latency (even if small), which conflicts with "hiện ngay, KHÔNG
  chờ" as currently specified; adds real engineering cost for a risk this ADR's own
  numeric grounding shows is not realistic at MVP scope (3 NPCs, thousands of turns
  needed before RAM residency approaches even a conservative fraction of typical mobile
  heap budgets).
- **Estimated Effort**: Medium-High (new async query layer + Core UI AC rewrites).
- **Rejection Reason**: solves a risk that the numbers show is not real at MVP scope, at
  a cost (rewriting already-Designed, reviewed Core UI ACs) that is real today. The
  async-shaped-interface decision (this ADR's actual Decision) captures Alternative 1's
  safety benefit for Full Vision without paying its cost now.

### Alternative 2: Plain synchronous signature now, accept a breaking change later

- **Description**: keep `get_turn_page()`/`total_turns()` as ordinary non-`await`
  functions for MVP; when Full Vision needs real async reads, change the signatures and
  update every Core UI call site at that time.
- **Pros**: simplest possible MVP — no `await`-on-plain-expression semantics to verify,
  no spike needed before `#15` implementation.
- **Cons**: defers a known-future breaking change to a later date, when more code will
  depend on the synchronous shape (every new Core UI screen, every test) — the migration
  cost only grows the longer it's deferred. The GDD's own history already shows this
  project pays real review cost when an interface's true shape surfaces late (`total_turns()`
  itself was exactly this kind of gap, discovered only when Core UI's dependency was
  cross-referenced).
- **Estimated Effort**: Low now, unknown-but-strictly-larger later (proportional to how
  much code has accumulated against the synchronous shape by the time Full Vision
  starts).
- **Rejection Reason**: the async-shaped-now Decision achieves the same MVP simplicity
  (zero actual suspension, same "instant" feel) while avoiding a foreseeable future
  breaking change at near-zero extra cost today (one keyword — `await` — at each call
  site).

### Alternative 3: Add a `warn_triggered`-style RAM monitor now (reject — no new runtime mechanism)

- **Description**: mirror Persistence's storage-quota warning pattern with a live
  RAM-resident-turn-count counter that warns (does not block) past a threshold.
- **Pros**: gives an early real signal instead of relying purely on the numeric estimate
  above; consistent with an existing project pattern (Persistence quota warnings).
- **Cons**: adds a new runtime mechanism, its own tuning knob (threshold), and its own
  test surface, for a risk the numeric grounding already shows is far from the MVP
  scope's realistic range — Persistence's `warn_triggered` exists because *storage*
  quota is a real, externally-imposed, browser-enforced hard limit that can genuinely be
  hit; RAM residency at MVP's realistic playthrough lengths is not in the same risk
  class.
- **Estimated Effort**: Low-Medium (one counter + one UI surface).
- **Rejection Reason**: over-engineering for a risk not yet observed to be real;
  `/soak-test` during Polish phase (already-planned project infrastructure) is the
  right place to get an empirical answer, not a new bespoke runtime mechanism bolted on
  now.

## Consequences

### Positive

- World Memory and Core UI `#15` are both unblocked with a concrete, numeric
  justification instead of an unratified assumption sitting in GDD prose.
- Full Vision's eventual migration to real bounded-RAM async reads costs a World
  Memory-internal implementation swap only — zero Core UI call-site changes, because
  every call site already writes `await` from MVP day one.
- No new runtime mechanism, tuning knob, or test surface added for a risk the numbers
  show is not realistic at MVP scope — keeps footprint minimal, consistent with this
  session's established `/architecture-decision` precedent.
- Reuses `/soak-test` (already-planned Polish-phase infrastructure) for real
  verification instead of inventing a new prototype cycle.

### Negative

- The 8× GDScript object-overhead multiplier is an unmeasured, pessimistic estimate —
  if actual overhead is much higher than 8×, the "very long playthrough" ceiling
  estimate could be optimistic. This is explicitly flagged, not hidden (see Risks).
- MVP has no runtime signal if RAM residency ever does become a real problem for a
  specific player's specific device/playthrough — the first sign would be an actual
  crash/slowdown during `/soak-test` or real play, not a graceful warning.
- The `await`-on-plain-expression semantics claim underpinning the "zero call-site
  changes later" benefit is unverified against Godot 4.6 specifically — see Risks and
  Verification Required.

### Neutral

- This ADR does not change any of World Memory's or Core UI `#15`'s already-Designed
  Core Rules, Formulas, or ACs — it ratifies an assumption already written into both
  GDDs and adds an interface-shape decision (async-now) that is additive, not a
  rewrite.

## Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| The 8× Dictionary/Variant overhead multiplier is an unmeasured estimate, not a real measurement | Medium | Low | Deliberately chosen pessimistic (not optimistic) — even if actual overhead is 2-3× higher than assumed, the conclusion (safe at MVP's realistic playthrough lengths) likely still holds; `/soak-test` during Polish phase gives the real number before this matters for a shipped build. |
| `await` on a plain (non-`Signal`, non-coroutine) GDScript expression may not behave exactly as assumed (same-frame resolution, zero suspension) on Godot 4.6 specifically | Low | Medium | Explicitly flagged as `Verification Required` — a small GUT spike before Core UI `#15` implementation begins closes this; if wrong, the fallback (1-frame-deferred coroutine wrapper) is a 1-line, low-cost fix that does not change this ADR's core conclusion. |
| No real per-device WASM heap ceiling number exists for this project's actual Godot build + asset footprint | Medium | Medium | Deferred to `/soak-test` (Polish phase, real target devices) rather than blocking this ADR — matches the project's existing pattern of deferring device-specific unknowns to the already-planned real-device verification pass (same category as Persistence's DEVICE-TEST.md backlog item #4, though a separate concern). |
| A future content update (e.g. richer per-turn data, larger `locked_result` payloads) raises `avg_turn_record_bytes` well past the 800-byte example used here | Low | Low | The ceiling formula is re-runnable with updated inputs at any time — this ADR's numeric grounding is a reasoning tool, not a hardcoded assumption baked into code. |

## Performance Implications

| Metric | Before | Expected After | Budget |
|--------|--------|---------------|--------|
| CPU (frame time) | N/A (no code yet) | Negligible for MVP reads — plain Array/Dictionary slicing, no I/O in the read path itself (slot-open replay is the only I/O-bound step, already accounted for by ADR-0002) | N/A |
| Memory | N/A | ≈12.8 MB at a very long 2,000-turn playthrough, ≈64 MB at an extreme 10,000-turn outlier (pessimistic 8× estimate) — small relative to typical mobile WASM heap budgets, pending real-device confirmation via `/soak-test` | N/A |
| Load Time | N/A | Slot-open replay cost is unchanged from ADR-0002's existing Load mechanism — this ADR does not add a new load-time cost, only defines what happens to the replayed data afterward (stays resident) | N/A |
| Network | N/A | Not applicable — no new network-bound operation introduced | N/A |

## Migration Plan

Greenfield — no existing World Memory/Core UI `#15` implementation to migrate from.

1. Implement World Memory's `_full_log`/`_extracted_facts` as RAM-resident structures,
   populated at slot-open via ADR-0002's existing replay mechanism.
2. Implement the Public Interface (`get_turn_page`/`total_turns`/`get_turn`/
   `get_processing_state`) as plain synchronous function bodies, but require every call
   site (starting with Core UI `#15`) to write `await` regardless.
3. Run the `await`-on-plain-expression verification spike (Verification Required) before
   Core UI `#15` implementation begins — confirms the MVP shape actually delivers
   same-frame resolution as assumed.
4. **Full Vision migration (separate future effort, not part of this ADR's
   implementation)**: swap World Memory's internal implementation to real async
   IndexedDB cursor-scan queries (ADR-0002 Experiment 2b pattern), bounding
   `_full_log`/`_extracted_facts` to a real sliding window. Trigger: `/soak-test`
   or real play surfacing an actual memory-pressure problem, or a deliberate Full
   Vision scope-planning pass — whichever comes first. Zero Core UI call-site changes
   required, per this ADR's Decision.

**Rollback plan**: if the `await`-on-plain-expression verification spike fails
(semantics don't match assumption), the fix is local and cheap — wrap the MVP body in a
minimal 1-frame-deferred coroutine (e.g. `await get_tree().process_frame` then return)
so the `await` at call sites resolves correctly without changing any call-site code or
this ADR's RAM-residency conclusion.

## Validation Criteria

- [ ] A GUT spike confirms `await get_turn_page(...)` against the MVP's plain
      synchronous implementation resolves within the same frame (no observable delay),
      before Core UI `#15` implementation begins — the same spike should also check
      whether Godot 4.6 emits a static-analysis warning (e.g. "redundant await") for
      this pattern, so the team knows whether to expect/suppress it (not blocking, just
      worth knowing ahead of time; `godot-specialist` review, 2026-08-12).
- [ ] `/soak-test` (Polish phase) measures real memory growth over an extended session
      on real target devices, confirmed against this ADR's ≈12.8 MB / 2,000-turn
      estimate (or flags a real discrepancy for follow-up).
- [ ] A test proves Core UI's AC-50 (cold-start "hiện ngay, KHÔNG chờ") passes against
      the MVP implementation exactly as originally specified — no rewrite needed.
- [ ] `world-memory-context-management.md`'s Open Question and
      `core-ui-screen-navigation.md`'s corresponding cross-reference are both updated to
      point at this ADR as the resolution.

## GDD Requirements Addressed

| GDD Document | System | Requirement | How This ADR Satisfies It |
|-------------|--------|-------------|--------------------------|
| `world-memory-context-management.md` | World Memory & Context Management | Open Question: "RAM residency lúc runtime + chữ ký sync/async của `get_turn_page`" (REQUIRED ADR, self-flagged as not self-approving) | Ratified with numeric grounding (Decision) — the GDD's proposed MVP fallback is formally APPROVED, not left as an unreviewed assumption. |
| `world-memory-context-management.md` | World Memory & Context Management | Public Interface (`get_turn_page`, `total_turns`, `get_turn`, `get_processing_state`) | Interface shape locked as `await`-based starting at MVP (Key Interfaces), with the MVP implementation remaining synchronous internally. |
| `core-ui-screen-navigation.md` | Core UI/Screen Navigation | D.3 (Story Log pagination), D.3b (S2 live window) — "Cứng" dependency on synchronous `get_turn_page`/`total_turns()` | No change required — this ADR's Decision explicitly preserves the synchronous-feel MVP behavior these ACs (including AC-50) depend on. |
| `persistence-save-system.md` | Persistence/Save System | `avg_turn_record_bytes` byte-accounting Formula | Reused as the numeric basis for this ADR's RAM-ceiling estimate (Decision, Numeric grounding) — no change to that Formula. |

## Related

- `design/gdd/world-memory-context-management.md` — the Open Question this ADR closes.
- `design/gdd/core-ui-screen-navigation.md` — D.3/D.3b, the "Cứng" dependency this ADR preserves without change.
- `design/gdd/persistence-save-system.md` — `avg_turn_record_bytes` Formula reused for the numeric ceiling.
- `docs/architecture/adr-0002-persistence-storage-backend.md` — the Load mechanism and cursor-scan pattern this ADR's Full Vision migration path reuses.
- `docs/engine-reference/godot/modules/web-export.md` — Group B (Q5-Q6), the MEMFS/IDBFS source-verification this ADR's problem statement rests on.
- `prototypes/persistence-web/DEVICE-TEST.md` — related but distinct real-device verification backlog item (storage quota, not RAM/heap — noted as a separate concern in Risks).
