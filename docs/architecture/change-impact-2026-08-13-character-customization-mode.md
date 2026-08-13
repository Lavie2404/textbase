# Change Impact Report — Character Customization Mode (hệ #16)

**Date**: 2026-08-13
**Trigger**: `design/gdd/character-customization-mode.md` reached APPROVED (vòng 4, verify hẹp qa-lead — xem `design/gdd/reviews/character-customization-mode-review-log.md`). Run via `/propagate-design-change design/gdd/character-customization-mode.md`.

## Nature of this change

Not a diff against a prior committed version — this project has no git
history to diff against (`Is a git repository: false`). Character
Customization Mode is a **new system**, added mid-project (off the original
`/map-systems` design order — see `systems-index.md` note under Recommended
Design Order). Its own Dependencies section already names, in explicit
detail, which already-Accepted architecture predates it and therefore
doesn't know it exists. This report formalizes that self-declared list
against the actual ADR text.

## ADRs referencing systems this GDD hard-depends on

7 ADRs reviewed (ADR-0001 through ADR-0007).

### Not Affected (3)
- **ADR-0001** (Combat Spec Authority) — hệ #16 only reads the existing `in_combat` flag; no new interface requested.
- **ADR-0003** (AI/LLM Integration Layer) — hệ #16 bypasses AI narration entirely by design (Rule #6d); zero interaction.
- **ADR-0006** (tap-name-to-card-entry-point) — unrelated entry mechanism, no shared interface.

### Needs Review → Resolved this session (4)

#### ADR-0004: Turn Manager Undo
**What it assumed**: `_pending_snapshot` is mutated only internally by Turn Manager (capture/restore/next-turn-overwrite) — no external invalidation entry point existed for any of its 5 original consumers.
**What the GDD now says**: Rule #6b requires a hack-write/delete commit to permanently kill an open Undo window the instant it lands, independent of the normal next-turn overwrite.
**Resolution**: **Update in place.** Added `invalidate_pending_snapshot()` to Turn Manager's public orchestration surface (Key Interfaces) — idempotent, does not itself call `restore_snapshot()`. Added hệ #16 row to GDD Requirements Addressed. Core single-slot snapshot-restore decision unchanged.

#### ADR-0002: Persistence Storage Backend
**What it assumed**: Exactly 2 durability checkpoints (per-turn `turn_records` write, periodic `snapshots` full-flush), both gated on Turn Manager's Resolving→Confirmed cycle.
**What the GDD now says**: Rule #6a introduces a 3rd checkpoint — hack-write commits durably outside the turn cycle entirely; Rule #6a2 forbids reusing the `[slot_id, world_time]` turn-record key (would overwrite the confirmed turn's payload and corrupt the undo tombstone).
**Resolution**: **Update in place.** New subsection D1b: widen `turn_records`' compound key to `[slot_id, world_time, hack_seq]` (`hack_seq=0` for ordinary turns, `1,2,3...` for hack-writes at that `world_time`) — a generalization of the already-validated Experiment 2b cursor-scan mechanism, not a new prototype needed. Rejected the alternative (forced out-of-cadence full-snapshot flush) as contradicting Core Rule #3's append-only-constant-cost design. Added hệ #16 row to GDD Requirements Addressed.

#### ADR-0005: World Memory RAM Residency
**What it assumed**: Public Interface is exactly 4 turn-pagination reads (`get_turn_page`, `total_turns`, `get_turn`, `get_processing_state`).
**What the GDD now says**: Rule #11/D.5 needs a structural entity-reference existence check (`referenced_in_world_memory(entry)`) to gate whether a custom item/skill/thức is deletable — must be structural, never text-match (a false negative would let a player delete an entry already woven into story history).
**Resolution**: **Update in place.** Added `referenced_in_world_memory(entry_id)` as a 5th Public Interface method (Key Interfaces), `await`-shaped like the other four for the same Full Vision migration reason. RAM-residency decision itself unaffected — both `_full_log` and `_extracted_facts` are already fully resident. Added hệ #16 row to GDD Requirements Addressed.

#### ADR-0007: Core UI Input-Lock / Screen-Stack / Safe-Area
**What it assumed**: `OverlayStack` holds at most 1 of a fixed 2-member set, `{O-Card, O-Set}`.
**What the GDD now says**: Rule #2 makes O-Customize a 3rd overlay in the same max-1-concurrent state machine.
**Resolution**: **Update in place.** Widened the overlay set to `{O-Card, O-Set, O-Customize}` in Decision Part 2, the Architecture diagram, and the Key Interfaces comment. Mechanically trivial — `show_overlay()`'s single-active-overlay logic already generalizes to N members. Added hệ #16 row to GDD Requirements Addressed.

### Likely Superseded
None — every affected ADR's core decision stands; all 4 resolutions were additive.

## Still open (not ADR-level — GDD/registry amendments, tracked in hệ #16's own Dependencies section, not actioned this session)

- `persistence-save-system.md` Core Rule #1 wording ("2 checkpoint" → "3") — the schema decision is now made (ADR-0002 D1b above); the GDD prose itself still needs the matching edit.
- `turn-manager.md` `undo_availability_window` formula — new conjunct `pending_snapshot_valid` reflecting ADR-0004's `invalidate_pending_snapshot()`.
- `core-ui-screen-navigation.md` AC-59a/59b — add "hack-invalidate" to the list of causes for the Undo button's disappearance animation.
- `equipment-skill-data-system.md` — new persistent markers `was_ever_equipped` / `was_ever_resolved_in_combat`, and `known_skill_ids` removal semantics on skill deletion.
- `world-memory-context-management.md` — formally add `referenced_in_world_memory(entry)` to its own Public Interface section (ADR-0005 now specifies the shape; the GDD prose should mirror it).
- `design/registry/entities.yaml` — `referenced_by` backlinks for hệ #16's usage of `tier_from_level`, `exp_threshold`, `undo_availability_window`, `min_thuc_per_skill`, `max_known_skills_per_character`, `deep_hostility_threshold`, `HOSTILE_INITIATIVE_LEVEL_GAP_MAX`.

These are prose/schema edits to already-Approved GDDs and the registry, not architecture decisions — recommend handling them via each GDD's own revision process (e.g. `/design-system [system]` for a targeted amendment) rather than this report, since `/propagate-design-change`'s resolution workflow is scoped to ADRs.

## Verdict

**COMPLETE** — all 4 architecturally-affected ADRs resolved (update in place) this session. 6 GDD/registry-level amendments remain, explicitly listed above and already tracked in `character-customization-mode.md`'s own Dependencies section (Open Question #1).
