# ADR-0004: Turn Manager Undo — Optimistic-Apply Snapshot Rollback + turn_snapshot Schema

## Status

Accepted

## Date

2026-08-12

## Last Verified

2026-08-12

## Decision Makers

user + `godot-specialist` (engine validation — round 1 BLOCKING-ISSUES [5 findings,
2026-08-12], all fixed; round 2 re-validation APPROVE-WITH-NOTES [confirmed against
ADR-0002 text + real `src/gameplay/combat/*.gd` source + engine reference docs,
2026-08-12]).
*(TD-ADR strategic review skipped — `review-mode=lean`, not a PHASE-GATE.)*

## Summary

Locks the technical mechanism behind Turn Manager's Core Rule #8 (no Feature system's
result is "final" until its turn is confirmed and not undone): every registered Feature
system applies its `locked_result` optimistically (live state updates immediately, no
staging/read-through anywhere), while Turn Manager retains exactly one pre-turn snapshot
(matching `undo_depth=1`) captured via a `capture_snapshot()`/`restore_snapshot()`
contract each system implements for itself. The same restore path serves both Undo and
"Persistence write failed after Resolving" (`turn-manager.md` already specifies identical
player-facing behavior for both). Also closes **QQ-03**
(`docs/architecture/architecture.md`) / Character Card's **OQ#14**: Entity Record
*creation* is folded into the per-turn `turn_records` write that already happens every
confirmed turn (per ADR-0002/Core Rule #1), giving card existence the same durability
boundary as `world_time` itself — only ongoing field *updates* to an already-existing
card still ride the periodic 50-turn snapshot cadence.

## Engine Compatibility

| Field | Value |
|-------|-------|
| **Engine** | Godot 4.6 |
| **Domain** | Core / Scripting |
| **Knowledge Risk** | MEDIUM — the correct deep-copy API for snapshot capture (`Resource.duplicate_deep()`) was added in Godot 4.5, after the engine reference library's stated LLM knowledge cutoff (May 2025). Verified against `docs/engine-reference/godot/deprecated-apis.md` and `current-best-practices.md`, not training-data recall. |
| **References Consulted** | `docs/engine-reference/godot/deprecated-apis.md`, `docs/engine-reference/godot/current-best-practices.md`, `docs/engine-reference/godot/breaking-changes.md`, `docs/engine-reference/godot/VERSION.md` |
| **Post-Cutoff APIs Used** | `Resource.duplicate_deep()` (Godot 4.5+) — required for correctly-isolated snapshots of any Feature system whose Undo-covered state includes nested `Resource` objects, not just plain `Dictionary`/`Array` values; plain `duplicate()` retains its old *shallow-for-nested-resources* behavior for backward compatibility and is the wrong choice here. |
| **Verification Required** | `Resource.duplicate_deep()`'s exact behavior against a Resource shared across multiple instances (e.g. content-authored NPC templates) should be confirmed with a small GUT spike before Combat's retrofit (Migration Plan step 2) — the project docs confirm the method exists and its general purpose (`godot-specialist` review, 2026-08-12), but not every edge case; see Risks. |

## ADR Dependencies

| Field | Value |
|-------|-------|
| **Depends On** | ADR-0002 (Accepted) — builds directly on the `stage()`/`commit()` seam and `turn_records`/`snapshots` store split; does not modify either. |
| **Enables** | Combat System, EXP & Realm Progression, NPC Affinity & Relationship, Death & Consequence, Character Card & Identity — all five have an Undo requirement (`TR-*-Undo` items) that names this exact mechanism as "ADR owed"; all five are unblocked to implement `capture_snapshot()`/`restore_snapshot()` against a locked contract. |
| **Blocks** | Any story implementing Undo for a Feature system; `/create-epics` scoping any epic whose acceptance criteria include Undo (Combat AC-16 RNG-reroll-on-redo family, NPC affinity Undo, Death & Consequence Undo, Character Card AC for `card_exists` reverting on Undo). |
| **Ordering Note** | Must be Accepted before any Feature system's Undo-related stories are scoped. Does not block non-Undo stories for the same systems. |

## Context

### Problem Statement

`turn-manager.md`'s Core Rule #8 is an Approved, binding requirement: results computed
by Combat, EXP & Realm Progression, NPC Affinity, Death & Consequence, and (per its own
D.1) Character Card must not be treated as permanent until the turn containing them is
confirmed **and** not subsequently undone. The GDD explicitly defers the *mechanism* to
an ADR, naming two candidate approaches (deferred-commit staging, or each system writing
its own inverse operation) without choosing between them — and five downstream GDDs each
independently registered a `TR-*-Undo` requirement pointing back at this same unresolved
ADR. Related: `docs/architecture/architecture.md`'s **QQ-03** and Character Card's own
**OQ#14** flag a second, narrower problem that turns out to share the same root cause —
Entity Record creation (`card_exists` flipping to `true`) rides Persistence's periodic
50-turn snapshot cadence rather than the per-turn write, creating a crash window where a
card that visibly existed in-session could vanish on reload.

Cost of not deciding: Combat/EXP/NPC Affinity/Death & Consequence/Character Card cannot
have their Undo-related acceptance criteria implemented or tested; `/create-epics` cannot
scope any Undo-touching story for five different systems.

### Current State

No code exists for Undo yet. Combat System is Implemented (ADR-0001 Accepted) but its
Undo behavior (`TR-combat-016`) is explicitly listed as depending on this ADR and is not
yet built.

### Constraints

- `undo_depth=1` (registry-locked, `turn-manager.md` Tuning Knobs) — only the single most
  recently confirmed turn is ever undo-able; this ADR should exploit that constraint
  rather than build infrastructure for an arbitrary-depth undo stack it will never use.
- Must build on ADR-0002's `stage()`/`commit()` seam and `turn_records`/`snapshots` store
  split without modifying either (Depends On above) — this ADR distributes work across
  that existing interface, it does not renegotiate it.
- `coding-standards.md`: dependency injection over singletons; every public method must
  be unit-testable. GUT is the test framework (`test-setup` decision).
- Solo/small-team MVP budget — per the project's established `/architecture-decision`
  precedent (ADR-0001/0002/0003), prefer the option with the smallest footprint when two
  approaches achieve the same observable behavior.

### Requirements

- Must give every Feature system a way to guarantee its Undo-covered state (per its own
  `TR-*-Undo` item) reverts exactly to its pre-turn value.
- Must reuse the exact same mechanism for the "Persistence write failed after Resolving/
  Undoing" edge cases (`turn-manager.md` already specifies identical player-facing
  behavior — "lượt coi như chưa xảy ra" — for both cases; the mechanism should not
  duplicate logic for what is observably the same operation).
- Must close QQ-03/OQ#14 (Entity Record durability timing) as a byproduct, not a bolted-on
  special case, if the chosen mechanism naturally supports it.
- Must not require every Feature system's state-reading API to become staging-aware
  (i.e., avoid forcing a read-through-overlay pattern into code that doesn't otherwise
  need it) unless the alternative that avoids this is materially worse.

## Decision

**Rollback mechanism: optimistic-apply + single-slot snapshot-restore.**

Every registered Feature system applies its computed `locked_result` to its own live
state immediately during Resolving — exactly as if there were no Undo at all; nothing
about a system's normal read/write APIs changes. Separately, Turn Manager captures a
snapshot of every registered system's Undo-covered state **immediately before** Resolving
begins, and retains **exactly one** such snapshot at a time (never a stack — `undo_depth=1`
makes a stack unnecessary weight). If Undo is requested, or if Persistence's atomic write
fails after Resolving/Undoing, Turn Manager calls `restore_snapshot()` on every registered
system with that one retained snapshot — both cases use the **identical** restore call,
because both are specified in `turn-manager.md` to produce the identical player-facing
outcome ("lượt coi như chưa xảy ra"). The snapshot is discarded and replaced the moment
the *next* turn begins Resolving (matching "Undo không dồn được" at the mechanism level,
not just the UI level).

**Snapshot ownership: distributed, not centralized.** Turn Manager does not know the
shape of any other system's state. It holds an opaque `Array[Dictionary]`, index-aligned
with `_registered_systems` (fixed registration order, never reordered — see
Implementation Guidelines), where each entry is whatever `capture_snapshot()` returned
for that system — Turn Manager's only responsibility is calling `capture_snapshot()`
before Resolving and `restore_snapshot()` on rollback, on every registered system, in
that same fixed order. This mirrors the project's already-established pattern of state
ownership staying with the owning system (`docs/registry/architecture.yaml`
state_ownership convention) rather than being centralized. (Array-indexed rather than
name-keyed because the shared base is `RefCounted`, matching Combat System's existing
classes — `RefCounted` has no built-in identity/name the way `Node` does; see Key
Interfaces.)

**QQ-03/OQ#14 closed**: Character Card's per-turn contribution to the *existing* per-turn
`stage()`/`commit()` write (which already happens every confirmed turn, per ADR-0002 —
this is not a new write path) includes a small `entities_created_this_turn: Array[String]`
delta whenever a turn creates a new Entity Record — near-zero marginal byte cost on turns
that create nothing (the common case). The *full* Entity Record blob (all fields) still
only refreshes on the periodic 50-turn `snapshots` flush, exactly as ADR-0002 designed.
On Load, Persistence replays `turn_records` since the last snapshot as it already does;
Character Card's loader re-applies any `entities_created_this_turn` deltas from that
replay on top of the last full snapshot, reconstructing `card_exists` correctly even for
cards created after the last periodic flush. This resolves the crash-window OQ#14
describes for **existence** while deliberately leaving the narrower, purely cosmetic risk
(a few recent field *updates* to an already-existing card going stale on crash, bounded by
the same ≤50-turn window every other `fixed_blob_bytes` system already accepts) unchanged
— consistent with why ADR-0002 chose that cadence in the first place.

### Architecture

```
Resolving begins
      │
      ▼
┌─────────────────────────────────────────────────────────┐
│ Turn Manager._capture_all()                                │
│   _pending_snapshot.clear()                                │
│   for system in _registered_systems:  # fixed order        │
│       _pending_snapshot.append(system.capture_snapshot())  │
│   (single slot — overwrites whatever was retained before) │
└─────────────────────────────────────────────────────────┘
      │
      ▼
  Feature system resolves locked_result, applies it LIVE
  (Combat updates HP now, NPC updates affinity now, Character
  Card creates Entity Record now — unchanged from today)
      │
      ▼
  AI narration → Persistence stage()/commit() (per-turn write,
  now also gathering get_turn_delta_blob() from any opted-in
  system — Character Card's entities_created_this_turn — plus
  Turn Manager's own turn record with a new `undone: bool` field,
  default false)
      │
      ├── commit() → committed() signal ──► Turn Confirmed
      │                                      (snapshot RETAINED,
      │                                       becomes the Undo target)
      │
      └── commit() → failed() signal ──────► restore path (below)
                                              world_time unchanged

Undo requested (only while undo_available)  ─┐
                                               ├──► SAME restore path:
Persistence write failed after Resolving  ────┘     for i in _registered_systems.size():
                                                        _registered_systems[i].restore_snapshot(_pending_snapshot[i])
                                                     (Undo case ALSO re-stages a TOMBSTONE
                                                      record — same compound key
                                                      [slot_id, world_time] as the
                                                      just-undone turn, `undone: true` —
                                                      via the EXISTING put()-overwrite
                                                      semantics of stage()/commit(), no
                                                      new delete primitive needed; Load's
                                                      replay skips any record where
                                                      undone=true instead of re-applying
                                                      it — see Implementation Guidelines)
```

### Key Interfaces

```gdscript
# Every Feature system whose state is covered by Turn Manager's Core Rule #8 (i.e. has
# its own TR-*-Undo requirement) extends this @abstract base -- Godot 4.5+ supports
# @abstract methods (verified: current-best-practices.md), so "forgot to implement" is
# a PARSE-TIME error, not a runtime/code-review-only gap. Matches ADR-0002's own
# StorageBackend precedent exactly (that ADR ALSO uses @abstract class_name + @abstract
# func, not duck-typing -- corrected from an earlier draft of this ADR that
# misattributed a duck-typed pattern to ADR-0002).
#
# Base is `extends RefCounted`, matching Combat System's ALREADY-IMPLEMENTED classes
# (src/gameplay/combat/*.gd -- combatant.gd, combat_resolver.gd, etc. all extend
# RefCounted today, verified by godot-specialist review, 2026-08-12) -- Combat's
# existing classes can adopt this base with a single-inheritance change (RefCounted ->
# UndoCapturable extends RefCounted) with no other change needed. A system whose
# controller must extend something else (e.g. Node, for unrelated engine reasons) is
# the one case where duck-typing + the CI-check backstop (see Risks) applies instead.

@abstract
class_name UndoCapturable
extends RefCounted

@abstract func capture_snapshot() -> Dictionary
    # Returns a DEEP COPY of exactly the fields this system's own GDD names as
    # Undo-covered (e.g. combat-system.md's TR-combat-016: HP, in_combat, used-skill-set;
    # npc-affinity-relationship.md's TR-npc-013: affinity table, D.3 streak trackers,
    # cooldown tracker, Song Tu transitions; death-and-consequence.md's TR-dc-013: its
    # 3 owned fields). MUST be a true deep copy -- and these are TWO SEPARATE steps,
    # not one call covering both (godot-specialist correction, 2026-08-12: Dictionary/
    # Array.duplicate(true) NEVER deep-copies a Resource held as a value, regardless of
    # the deep flag -- that flag only recurses into nested Dictionary/Array containers.
    # duplicate_deep() must be called explicitly, per Resource field, separately):
    #
    #   func capture_snapshot() -> Dictionary:
    #       var snap: Dictionary = _state.duplicate(true)   # deep-copies nested Dict/Array
    #       for key in snap:
    #           if snap[key] is Resource:
    #               snap[key] = snap[key].duplicate_deep()  # MUST call separately -- the
    #                                                        # line above does NOT reach it
    #       return snap
    #
    # A capture that misses this is a silent correctness bug: live state continues
    # mutating after capture, and the "snapshot" still shares the same Resource
    # instance, so it silently drifts along with live state instead of staying frozen.

@abstract func restore_snapshot(snap: Dictionary) -> void
    # Overwrites this system's live state with the captured snapshot, byte-for-byte.
    # Called ONLY by Turn Manager, ONLY during the restore path above, ONLY with a
    # snapshot this same system produced moments before the turn now being unwound.
    # MUST mutate the existing live container IN PLACE (.clear() + .merge(snap), or
    # per-field assignment) rather than reassigning the top-level variable to a new
    # object (godot-specialist finding, 2026-08-12: a plain reassignment leaves any
    # other code already holding a reference to the OLD container -- a cached lookup,
    # a closure, another field pointing at it -- silently stuck seeing the
    # optimistically-mutated pre-rollback data). MUST also re-emit whatever signal this
    # system normally emits on the fields it just overwrote (e.g. `health_changed`) --
    # UI bound to that signal has no other way to learn the rollback happened.

# Turn Manager's orchestration side (adds to the DI philosophy already established in
# adr-0003-ai-llm-integration-layer.md -- no Autoload -- but NOT the same Node base;
# AiLlmRequestService is a Node because it owns an HTTPRequest child node specifically,
# not because "registered systems must be Node"):

var _registered_systems: Array[UndoCapturable] = []  # populated at session setup, DI not
                                                       # discovery; each entry's concrete
                                                       # type is whatever Feature system
                                                       # it is (Combat's resolver, etc.);
                                                       # order is fixed at registration and
                                                       # never reordered (Implementation
                                                       # Guidelines) -- this is what lets
                                                       # _pending_snapshot key by ARRAY
                                                       # INDEX instead of needing each
                                                       # system to expose an identity/name
                                                       # (RefCounted has no built-in .name
                                                       # the way Node does)
var _pending_snapshot: Array[Dictionary] = []  # _pending_snapshot[i] pairs with
                                                # _registered_systems[i]; AT MOST 1 full
                                                # array retained at a time (overwritten
                                                # wholesale each time a new turn begins
                                                # Resolving), matching undo_depth=1

func _capture_all() -> void:
    _pending_snapshot.clear()
    for system in _registered_systems:
        _pending_snapshot.append(system.capture_snapshot())

func _restore_all() -> void:
    for i in _registered_systems.size():
        _registered_systems[i].restore_snapshot(_pending_snapshot[i])

# Added by propagation from character-customization-mode.md Rule #6b (2026-08-13):
# a caller OUTSIDE the normal Resolving/Undo cycle (hệ #16's write path, which
# bypasses Turn Manager entirely) needs to permanently kill an in-flight Undo
# window the moment its first hack-write/delete commits -- distinct from the
# existing implicit invalidation (next turn's _capture_all() overwriting the
# slot). No prior consumer needed an EXTERNAL invalidation entry point; all
# five original consumers only ever read via restore_snapshot() or let the
# next turn's capture overwrite the slot naturally.

func invalidate_pending_snapshot() -> void:
    # Idempotent: safe to call whether or not a snapshot is currently retained
    # (character-customization-mode.md's AC-34 "no-snapshot-treo" branch --
    # call-count is asserted, not the postcondition, when nothing was pending).
    # Does NOT call restore_snapshot() on anyone -- this only prevents a FUTURE
    # Undo/failed-write from using the retained snapshot; it does not roll
    # anything back itself.
    _pending_snapshot.clear()
    # `turn-manager.md`'s undo_availability_window formula must read this same
    # state (new conjunct `pending_snapshot_valid`, propagated separately into
    # that GDD) so `undo_available` flips to false in the same instant this
    # runs -- this method is the single source of truth that conjunct reads.

# Character Card's per-turn Persistence contribution -- NOT the same method as
# ADR-0002's already-locked get_blob() (that one keeps its existing name/shape
# {status: StringName, bytes: String} unchanged, and keeps serving the periodic
# 50-turn snapshot exactly as ADR-0002 designed it). This is a NEW, additive, opt-in
# extension point: Persistence's PER-TURN stage()/commit() call (Core Rule #1, already
# fires every confirmed turn for Turn Manager's own turn record) also gathers
# get_turn_delta_blob() from any OTHER registered system that implements it -- shape
# matches get_blob()'s String-payload convention (ADR-0002 D1a: JSON-string, never raw
# PackedByteArray/Dictionary across the bridge) so Persistence's gathering code can
# treat both uniformly:

func get_turn_delta_blob() -> Dictionary:
    # returns {status: &"ok", bytes: JSON.stringify({entities_created_this_turn: [...]})}
    # -- bytes is "[]" (empty array, ~2 bytes) on turns that create nothing (the common
    # case); absent/not-implemented for systems that don't need per-turn durability.
```

### Implementation Guidelines

- Snapshot capture happens **before** a Feature system's resolve logic touches any
  Undo-covered field, not after — capturing after mutation would capture the wrong
  (post-mutation) state. The natural place is Turn Manager's transition into Resolving,
  before any system's resolve function is invoked.
- **Turn record schema gains an `undone: bool` field, default `false`** (this ADR's
  contribution to `turn_snapshot`/turn-record schema, alongside Turn Manager's existing
  `{turn_id, action, locked_result, narration_text, world_time}`). The "Auto-save sau
  Undo" trigger (already specified in `persistence-save-system.md`) re-stages a
  **tombstone** record — `{world_time: <the undone turn's>, undone: true}`, no
  `locked_result`/`narration_text` payload needed — to the **same** compound key
  `[slot_id, world_time]` the undone turn already occupies, and `commit()`s it through
  the unmodified `stage()`/`commit()` seam exactly like any normal write (corrected
  2026-08-12, `godot-specialist` review: ADR-0002's `stage()`/`commit()` interface has no
  delete primitive — only `put()`-style overwrite — so "delete the entry" as originally
  drafted was not implementable against the seam as specified; overwriting via the
  EXISTING primitive is both implementable and sufficient). Persistence's Load-time
  replay (already walking `turn_records` since the last snapshot, per ADR-0002) skips
  applying any record where `undone=true` instead of re-applying it — this is what
  prevents a reload immediately after Undo (before any new turn confirms) from silently
  resurrecting the undone turn's effects, including Character Card's
  `entities_created_this_turn` delta for that same key: `card_exists`'s own formula
  (`OR over confirmed AND NOT undone turns`) already produces the correct answer once the
  tombstone's `undone=true` is visible to replay, independent of whether the delta's
  *content* is still physically present in that record.
- `_registered_systems` order must be fixed and deterministic (e.g. registration order at
  session setup) — restore order across systems does not need to matter for correctness
  here (each system only touches its own state), but a fixed order makes test assertions
  and debugging traces reproducible.
- Systems with no Undo-covered state (e.g. purely derived/stateless logic) simply are not
  registered — this contract is opt-in per system, not forced on every system in the game.
- `capture_snapshot()`/`restore_snapshot()` must be cheap (single-turn scope only, not a
  full-game-state copy) — every field named in a system's own `TR-*-Undo` item is, by
  construction, small (a handful of counters/flags/small tables per NPC or per
  combatant), never the kind of large blob that goes through Persistence's periodic
  snapshot cadence.

## Alternatives Considered

### Alternative 1: Deferred-commit staging (the GDD's own primary suggestion)

- **Description**: `locked_result` is held in a staging area during the undo window;
  every system's state-reading API reads through a staging overlay (e.g. `get_hp()` =
  `base_hp - staged_pending_damage`) until the turn confirms and staging merges into real
  storage.
- **Pros**: matches the literal meaning of "not final until confirmed" most directly;
  was the option `/design-review` recommended when the Open Question was first raised.
- **Cons**: requires every Undo-covered read path across five Feature systems to become
  staging-aware — a cross-cutting change to code that otherwise has no reason to know
  about the undo window at all. Materially more invasive than optimistic-apply for
  identical observable behavior, given `undo_depth=1` never needs more than one
  in-flight staged delta.
- **Estimated Effort**: Medium-High (touches every read path in 5 systems).
- **Rejection Reason**: optimistic-apply achieves the same guarantee with zero changes
  to any system's normal read APIs — strictly less invasive for an equivalent result.

### Alternative 2: Each system writes its own inverse operation

- **Description**: Combat implements "undo damage" (`HP += damage`), NPC Affinity
  implements "undo affinity delta" (`affinity -= delta`), etc. — no shared mechanism.
- **Pros**: no shared abstraction to design; each system's undo logic lives next to its
  forward logic.
- **Cons**: an inverse operation is a *second*, independently-writable piece of logic per
  mutation type that can drift from the forward operation (e.g. Combat's exhaustion drain
  formula changes but its inverse is forgotten) — exactly the class of bug the project's
  `bare_int_division_in_gameplay_formulas`/`static_function_hidden_state_for_testable_mechanics`
  forbidden patterns exist to prevent categorically rather than case-by-case. No single
  test suite can verify "every inverse matches every forward op" the way a generic
  capture/restore contract's correctness is independent of what the forward logic does.
- **Estimated Effort**: Medium, but grows linearly with every new mutation type added to
  any of the 5 systems over the project's life — capture/restore's cost does not grow
  with mutation-type count.
- **Rejection Reason**: shifts a correctness burden onto five independent teams-of-one
  (in a solo project, five independent *sessions*) to keep forward/inverse pairs in sync
  forever, for a problem generic snapshot/restore solves once.

### Alternative 3: QQ-03 — accept the risk, no change to Entity Record's cadence

- **Description**: leave Entity Record entirely on the 50-turn periodic snapshot cadence,
  as ADR-0002 already implemented; do not special-case creation events.
- **Pros**: zero additional implementation — this is the current de facto state.
- **Cons**: leaves the exact crash-window OQ#14 describes open — a card that visibly
  exists in-session can vanish after a reload if the crash lands in the up-to-49-turn gap
  before the next periodic flush. MVP scope is small (3 seed NPCs) so the probability is
  low, but the failure mode is maximally player-visible (a card silently ceasing to exist)
  compared to the accepted risk for ordinary field-update staleness.
- **Estimated Effort**: None (status quo).
- **Rejection Reason**: the fix (Decision above) is cheap — one small per-turn delta field
  — for a failure mode disproportionately worse than its probability suggests, given how
  legible "my card just disappeared" is to a player versus "a stat field is briefly
  stale."

### Alternative 4: QQ-03 — write the full Entity Record blob every turn

- **Description**: fold Character Card's entire `entity_records` blob into the per-turn
  `turn_records` write, abandoning the periodic-snapshot cadence for this system.
- **Pros**: maximally safe — no crash window at all, for existence *or* content.
- **Cons**: directly undoes the reason ADR-0002 split `turn_records`/`snapshots` in the
  first place (avoid re-writing full "current state" blobs every turn) — the byte cost
  scales with the number of Entity Records that exist, on every turn, regardless of
  whether that turn touched any of them.
- **Estimated Effort**: Low code change, but negative performance/cost impact that grows
  with NPC count over the project's life (MVP has 3, but the mechanism should not need
  revisiting the moment that count grows).
- **Rejection Reason**: solves a problem more thoroughly than the accepted risk profile
  requires, at a cost that scales the wrong way. The creation-delta approach (Decision)
  gets the safety that actually matters (existence) at near-zero marginal cost.

## Consequences

### Positive

- Five GDDs' `TR-*-Undo` requirements (Combat, EXP, NPC Affinity, Death & Consequence,
  Character Card) are all unblocked against one shared, generically-testable contract
  instead of five independently-invented mechanisms.
- The "Undo" and "Persistence write failed after Resolving/Undoing" edge cases —
  previously described only in prose as producing identical outcomes — now share
  literally the same code path, which is both a simplification and a correctness
  guarantee (they cannot silently diverge from each other later).
- QQ-03/OQ#14 closes without touching ADR-0002 — Character Card's fix is additive
  (one new small field in its existing per-turn contribution), not a renegotiation of the
  storage backend.
- `capture_snapshot()`/`restore_snapshot()` is independently unit-testable per system with
  GUT, with no dependency on Turn Manager's own logic being correct first (each system's
  test only needs to assert "capture then mutate then restore == pre-mutation state").

### Negative

- Every Feature system with Undo-covered state must now implement and maintain two new
  methods (`capture_snapshot()`/`restore_snapshot()`) — a small, fixed cost per system,
  but a real one, applied five times.
- The optimistic-apply pattern means Undo-covered state is briefly "wrong" (already
  mutated) between a turn's Resolving and its confirm/rollback resolution — invisible to
  the player (nothing renders mid-Resolving per existing input-lock rules) but a real
  implementation detail engineers must remember: reading a system's state DURING
  Resolving reflects the optimistically-applied, not-yet-final value.
- Character Card's field-update staleness risk (Alternative 3's accepted residual, up to
  49 turns) remains for updates to *already-existing* cards — only creation is protected.

### Neutral

- This ADR does not change any Feature system's forward resolve logic (how HP is
  computed, how affinity deltas are calculated, etc.) — it only wraps that
  already-designed logic with capture-before/restore-on-rollback.

## Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| A system's `capture_snapshot()` calls `.duplicate(true)` on its top-level Dictionary and assumes that alone deep-copies any Resource held as a value — it does not, regardless of the `true` flag (confirmed by `godot-specialist` review against engine behavior, 2026-08-12) | Medium | Medium | This is a silent-corruption bug (snapshot silently shares the same Resource instance as live state, so it drifts along with later mutations instead of staying frozen) — the two-step pattern (`.duplicate(true)` for containers, separate explicit `.duplicate_deep()` per Resource-typed field) is spelled out with a code sample in Key Interfaces; flag as a required GUT test pattern in `test-helpers` (assert restore produces byte-identical pre-mutation state after mutating post-capture) for every system implementing this contract, not just Combat. |
| A system forgets to register with Turn Manager's `_registered_systems`, so its Undo-covered state silently never rolls back | Low | High | `@abstract` on `UndoCapturable` (Godot 4.5+) makes "forgot to implement the two methods" a parse-time error, not a runtime gap — but registration itself (adding the instance to `_registered_systems`) is not compiler-enforced. Recommend a CI/static check (same pattern as `ai-llm-integration-layer.md` AC-01) cross-referencing each GDD's declared `TR-*-Undo` systems against the actual registration call, flagged as an implementation-time backlog item, not blocking this ADR. |
| `restore_snapshot()` implemented as a top-level variable reassignment instead of an in-place mutation, leaving stale references elsewhere in the codebase pointed at the pre-rollback container (`godot-specialist` finding, 2026-08-12) | Low | Medium | Key Interfaces now states the in-place-mutation requirement explicitly (`.clear()` + `.merge()`, or per-field assignment) with the rationale (aliasing risk) spelled out. |
| A system's `restore_snapshot()` overwrites fields without re-emitting the signal(s) it normally fires on those fields, leaving UI stale until an unrelated redraw (`godot-specialist` finding, 2026-08-12) | Medium | Low | Key Interfaces now requires re-emitting the normal signal(s) as part of `restore_snapshot()`. |
| `Resource.duplicate_deep()`'s exact parameters/edge-case behavior (e.g. against a Resource shared across multiple instances, such as content-authored NPC templates) not independently verified beyond the engine reference library's summary (`godot-specialist` could not WebSearch to confirm the full signature during review) | Low | Medium | Recommend a small GUT spike test against the real Godot 4.6 API before Combat's retrofit (Migration Plan step 2) confirming `duplicate_deep()` does not unintentionally deep-copy a Resource meant to stay shared (e.g. a content-authored template referenced by multiple instances) — not blocking this ADR's Acceptance, but should land before the first system relies on it. |

## Performance Implications

| Metric | Before | Expected After | Budget |
|--------|--------|---------------|--------|
| CPU (frame time) | N/A (no code yet) | Negligible — snapshot capture/restore is a handful of small Dictionary/Resource copies once per turn, not a per-frame cost | N/A |
| Memory | N/A | Exactly 1 retained snapshot at a time (`undo_depth=1`) across all registered systems combined — small, bounded, never grows with `world_time` | N/A |
| Load Time | N/A | No change — Load semantics (snapshot + turn_records replay) are unchanged from ADR-0002; Character Card's replay of `entities_created_this_turn` deltas is O(turns since last snapshot), same order as everything else already replayed on Load | N/A |
| Network (per turn) | N/A | Character Card's `entities_created_this_turn: Array[String]` adds near-zero bytes to the existing per-turn `turn_records` write on turns that create nothing (the common case) | N/A |

## Migration Plan

Greenfield for the mechanism itself; Combat System already exists (ADR-0001 Accepted,
Implemented) and needs `capture_snapshot()`/`restore_snapshot()` retrofitted.

1. Implement the generic contract + Turn Manager orchestration (`_capture_all()`/
   `_restore_all()`, single-slot `_pending_snapshot`), tested against a fake registered
   system double first (no real Feature system dependency needed for this layer's tests).
2. Retrofit Combat System (only Implemented Feature system today) with
   `capture_snapshot()`/`restore_snapshot()` covering `TR-combat-016`'s named fields;
   verify against Combat's existing GUT suite (91 tests) plus new Undo-specific tests.
3. Each subsequent Feature system (EXP, NPC Affinity, Death & Consequence, Character
   Card) implements the same contract as part of its own implementation work — this ADR
   defines the contract, not each system's field list (that stays owned by each system's
   own GDD, per its `TR-*-Undo` item).
4. Character Card additionally implements `get_turn_delta_blob()`'s
   `entities_created_this_turn` delta and the corresponding Load-time replay merge.
5. Turn Manager's turn record schema gains the `undone: bool` field; Persistence's
   "Auto-save sau Undo" trigger re-stages a tombstone record via the existing `put()`
   overwrite semantics of `stage()`/`commit()` (small addition to already-specified
   behavior and the existing seam, not a new primitive — corrected 2026-08-12 from an
   earlier draft that assumed a delete operation the seam does not have).
6. Load-time replay is extended to skip applying any `turn_records` entry where
   `undone=true` instead of re-applying it.

**Rollback plan**: if optimistic-apply proves wrong in practice (unexpected complexity
surfaces), the fallback is Alternative 1 (deferred-commit staging) — the
`capture_snapshot()`/`restore_snapshot()` contract this ADR defines would need replacing
with staging-overlay reads, a larger but isolated change (does not touch Persistence's
`stage()`/`commit()` seam either way).

## Validation Criteria

- [ ] Every Feature system with a `TR-*-Undo` requirement implements and passes a GUT
      test proving `restore_snapshot(capture_snapshot())` after an intervening mutation
      restores byte-identical pre-mutation state.
- [ ] A test proves Undo and "Persistence write failed after Resolving" produce
      identical post-state for the same pre-turn snapshot (proving the shared code path
      claim in Decision is actually shared, not just described the same in prose).
- [ ] A fixture-driven test proves Character Card's `card_exists` correctly reconstructs
      to `true` on Load when the creating turn is *after* the last periodic snapshot
      flush (the exact crash-window scenario OQ#14 describes) — this is the test that
      proves QQ-03 is actually closed, not just documented as closed.
- [ ] A test proves an undone turn's `entities_created_this_turn` delta does not survive
      in a way that makes `card_exists` incorrectly `true` after Undo + reload — i.e.
      reload immediately after Undo (before any new turn confirms) sees the tombstone
      (`undone=true`) at that turn's key and does not re-apply it.
- [ ] A test proves `capture_snapshot()` on a system whose state includes a nested
      Resource produces a snapshot that is unaffected by a subsequent live mutation of
      that Resource's fields (proving `.duplicate_deep()` was actually applied, not just
      the container-level `.duplicate(true)`).

## GDD Requirements Addressed

| GDD Document | System | Requirement | How This ADR Satisfies It |
|-------------|--------|-------------|--------------------------|
| `turn-manager.md` | Turn Manager | Core Rule #8 (downstream results not "final" until confirmed + not undone) | `capture_snapshot()`/`restore_snapshot()` contract + single-slot retained snapshot, orchestrated by Turn Manager. |
| `turn-manager.md` | Turn Manager | Open Question: "Cơ chế rollback/snapshot cho Undo... chưa được chọn" | Closed — optimistic-apply + snapshot-restore (Decision), rejecting the GDD's own two named alternatives with documented reasoning (Alternatives 1-2). |
| `turn-manager.md` | Turn Manager | Open Question: "Schema `turn_snapshot`... chưa được định nghĩa" | Closed — distributed ownership, index-aligned `Array[Dictionary]` (matching `_registered_systems`' fixed registration order); each system owns its own snapshot's field shape per its own `TR-*-Undo` item. Turn record schema itself gains one new field: `undone: bool`, default `false`. |
| `combat-system.md` | Combat System | `TR-combat-016` (Undo rolls back HP/`in_combat`/used-skill-set) | Combat implements the contract with those fields (Migration Plan step 2). |
| `npc-affinity-relationship.md` | NPC Affinity & Relationship | `TR-npc-013` (Undo reverses deltas, streak trackers, cooldowns, Song Tu transitions) | NPC Affinity implements the contract with those fields. |
| `death-and-consequence.md` | Death & Consequence | `TR-dc-013` (Undo rolls back exactly 3 fields) | Death & Consequence implements the contract with those fields. |
| `character-card-identity.md` | Character Card & Identity | `TR-cci-009` (cache invalidated when Undo reverts entity-record-creating turn) | `restore_snapshot()` reverts Character Card's live entity table; `card_exists`'s own derivation formula then naturally recomputes to `false`. |
| `character-card-identity.md` | Character Card & Identity | OQ#14 (Entity Record durability timing vs. flush cycle) | Closed — see Decision "QQ-03/OQ#14 closed". |
| `docs/architecture/architecture.md` | Cross-system Open Questions | QQ-03 | Closed — see Decision. |
| `character-customization-mode.md` | Character Customization Mode | Rule #6b (hack-write/delete commit must permanently invalidate an open Undo window, independent of the normal next-turn overwrite) | Added `invalidate_pending_snapshot()` to Turn Manager's public orchestration surface (Key Interfaces) — propagated 2026-08-13, hệ #16 Approved vòng 4. Does not change this ADR's core single-slot snapshot-restore decision. |

## Related

- `design/gdd/turn-manager.md` — Core Rule #8, Open Questions, States and Transitions this ADR resolves.
- `design/gdd/character-card-identity.md` — D.1 (`card_exists`), OQ#14 this ADR closes.
- `design/gdd/combat-system.md`, `design/gdd/npc-affinity-relationship.md`, `design/gdd/death-and-consequence.md` — each system's own `TR-*-Undo` item, implemented against this ADR's contract.
- `docs/architecture/adr-0002-persistence-storage-backend.md` — `stage()`/`commit()` seam and `turn_records`/`snapshots` split this ADR builds on without modifying.
- `docs/architecture/adr-0003-ai-llm-integration-layer.md` — precedent for the DI-registered-systems (not Autoload) ownership pattern reused here.
- `docs/architecture/architecture.md` §Open Questions — QQ-03 this ADR closes.
