# Architecture Review Report — 2026-08-13

**Mode**: `/architecture-review` (full)
**Engine**: Godot 4.6 (Web/Mobile Web export, nothreads variant, GDScript)
**GDDs Reviewed**: 16 (15 covered by `architecture.md`'s existing baseline + Character Customization Mode, hệ #16, approved 2026-08-13 and not yet folded into `architecture.md`)
**ADRs Reviewed**: 7 (ADR-0001 through ADR-0007, all Accepted)

**Trigger for this run**: 4 ADRs (0002, 0004, 0005, 0007) were amended simultaneously on 2026-08-13 via `/propagate-design-change` to integrate hệ #16 into the existing architecture. This review verifies the amendments are internally consistent and re-checks global traceability.

---

## Traceability Summary (system-level — matches the precedent `architecture.md` itself established, since a 320-row TR × 7-ADR matrix is mostly redundant GAP)

| System | # TR (baseline) | ADR Coverage | Status |
|---|---|---|---|
| Combat System | 20 | ADR-0001 | ✅ Covered |
| Persistence / Save System | 24 | ADR-0002 (+ D1b, hệ #16 amendment) | ✅ Covered |
| AI/LLM Integration Layer | 25 | ADR-0003 | ✅ Covered |
| Turn Manager / Core Game Loop | 26 | ADR-0004 (Undo mechanism + `turn_snapshot` schema subset only) | ⚠️ Partial |
| World Memory & Context Management | 22 | ADR-0005 (+ `referenced_in_world_memory`, hệ #16 amendment) | ✅ Covered |
| Character Card & Identity | 16 | ADR-0004 (TR-cci-009 Undo cache), ADR-0006 (tap-name entry point) | ⚠️ Partial |
| Core UI/Screen Navigation | 21 | ADR-0007 (input-lock/screen-stack/safe-area + OverlayStack widened for hệ #16), ADR-0005 (D.3/D.3b sync assumption), ADR-0006 (tap-name) | ⚠️ Partial (most engine-risk items closed) |
| Character Customization Mode (hệ #16) | ~24 (freshly extracted, not yet in `tr-registry.yaml`) | ADR-0002/0004/0005/0007 — only the 4 cross-system interface points; hệ #16's own internal D.1–D.5 logic has no dedicated ADR | ⚠️ Partial |
| Contract Enforcement, Equipment & Skill Data, EXP & Realm Progression, NPC Affinity & Relationship, Setting & Canon Integration, Situation/Encounter Generation, Death & Consequence, Character Continuation | 18+22+17+16+20+20+17+12 = 142 | — (deliberately deferred per `architecture.md` Phase 6 policy) | ❌ Gap (accepted) |

**Total**: ~320 requirements. ~95 Covered/Partial via 7 ADRs. ~142 deliberate GAP — this matches `architecture.md` Phase 6's already-approved policy ("escalate to a dedicated ADR only if implementation-time defect-density matches Combat/Persistence's pattern, not a mechanical one-per-system requirement"). **This is not a new finding** — it is re-confirmed, not newly discovered, by this review.

---

## Cross-ADR Conflicts

No blocking conflict (data ownership / integration contract / performance budget / dependency cycle / state-ownership) was found among the 7 ADRs. One **stale cross-reference** surfaced by the simultaneous 2026-08-13 amendment:

### Finding: ADR-0004's tombstone-write text is stale after ADR-0002 D1b

- **ADR-0004** (written 2026-08-12) describes the Undo tombstone record as written to "the SAME compound key `[slot_id, world_time]`" the undone turn occupies.
- **ADR-0002 D1b** (written 2026-08-13, propagated from hệ #16) widened `turn_records`' compound key from 2 segments to 3: `[slot_id, world_time, hack_seq]`.
- ADR-0004's literal text now describes a key shape that no longer matches the schema. The intended semantics (tombstone always writes at `hack_seq=0`, structurally mutually-exclusive with any hack-write at that `world_time` because of hệ #16 Rule #6b's permanent-invalidate-on-first-hack-write behavior) is correct — **verified by `godot-specialist` via cross-system proof** (see Engine Compatibility below) — but was never written down anywhere. Classified **Advisory** (not blocking — the runtime behavior is correct, only the documentation is imprecise).

**Fix applied this session** (see "Files Written" below): ADR-0004's Architecture diagram and Implementation Guidelines were corrected to reference `[slot_id, world_time, 0]` with a note explaining why `hack_seq≥1` and a tombstone-write can never target the same key.

### ADR Dependency Order

No cycle. Topological order:

- **Foundation (no dependencies)**: ADR-0001, ADR-0002, ADR-0003, ADR-0007
- **Depends on Foundation**: ADR-0004 (depends on ADR-0002), ADR-0005 (depends on ADR-0002), ADR-0006 (depends on ADR-0003)

All 7 are Accepted.

---

## Engine Compatibility Audit

### Standard checks (all 7 ADRs)

- **Version consistency**: all ADRs target Godot 4.6, no stale-version references.
- **Deprecated API check**: none of the 7 ADRs reference an API listed in `deprecated-apis.md`. ADR-0002's note on `FileAccess.store_*()`'s 4.4 return-type change is handled correctly ("check it"), not a violation.
- **Post-Cutoff API conflicts**: no two ADRs make contradictory assumptions about the same post-cutoff API. The `JavaScriptBridge` glue pattern (`get_interface()`/`create_object()`/`create_callback()`, never `eval()`) is applied consistently across ADR-0002/0003/0007.
- **Missing Engine Compatibility sections**: none — all 7 ADRs have the section populated.

### Engine Specialist Consultation (`godot-specialist`, dispatched specifically against the 4 amended ADRs)

**2 BLOCKING findings** (do not block the ADRs' Accepted status — they block *starting to code* hệ #16's persistence write-path against D1b's current text without a fix):

| # | Finding | Location | Severity |
|---|---|---|---|
| **1A** | `IDBKeyRange` bound construction for the already-verified compound-key cursor scan (Experiment 2b) used 2-segment bounds matching the old 2-segment key. IndexedDB's array-key comparison rule ("a shorter array key always sorts before a longer one with the same prefix") means a naively-reused 2-segment upper bound at `world_time_max` will silently **exclude every hack-write record at that same `world_time`** from a Load-time range scan — the array `[slot_id, world_time_max, N]` (N≥1) sorts *after* the 2-segment bound `[slot_id, world_time_max]`, not before it. This was not covered by Experiment 2b, which only tested 2-segment keys. | ADR-0002 D1b | BLOCKING before Load-path code |
| **1B** | D1b does not specify how the per-`world_time` `hack_seq` counter is rehydrated across a session boundary. If implemented as an in-memory counter reset on load (rather than derived by scanning existing records for the max `hack_seq` at the current `world_time`), a hack-write made after reopening a slot at an unchanged `world_time` can silently `put()`-overwrite an earlier hack-write, losing it with no error — the exact failure class hệ #16's own Rule #7 ("vĩnh viễn, người chơi tự chịu trách nhiệm") treats as unacceptable when caused by an engine bug rather than player intent. | ADR-0002 D1b | BLOCKING before write-path code |

**6 ADVISORY findings** (not blocking, should be closed before the relevant implementation step):

1. ADR-0004's `invalidate_pending_snapshot()` mutual-exclusion invariant (its call window and `_capture_all()`/`_restore_all()`'s execution window are structurally disjoint, per hệ #16's D.1 gate) is true and provable but was never written into the ADR — a future reader would have to re-derive it.
2. `character-customization-mode.md`'s D.5 (`is_deletable_custom_entry`, which calls the now-async-shaped `referenced_in_world_memory()`) does not mention `await`/coroutine-contagion at all, unlike Rule #6a1 which handles Persistence's async `commit()` very carefully — an asymmetry in the GDD's own text.
3. It is not explicitly confirmed anywhere (GDD or ADR-0007) that opening the O-Customize overlay actually locks input on the S2 screen beneath it — the "no lượt resolves while panel is open" reachability argument (used to justify finding 1/#3 in the engine audit) depends on this being true, and ADR-0007 only formalizes input-lock for Resolving/Undoing, not for "overlay open."
4. ADR-0002 D6's `schema_version`-bump trigger list (2 triggers: N changes, blob format changes) does not explicitly list "changed the physical key shape of an existing object store" as a 3rd trigger — D1b itself already expects a bump but D6's own text is narrower than what it now needs to cover.
5. ADR-0002's Validation Criteria checklist predates D1b and has no item verifying the `(world_time, hack_seq)` ascending replay order or the 1A/1B fixes above.
6. No other issues found — `OverlayStack`'s widened `{O-Card, O-Set, O-Customize}` set (ADR-0007), the safe-area mechanism (unrelated to hệ #16), and Autoload boot order are all unaffected by these amendments.

**Full specialist report** (Vietnamese, verbatim reasoning and cross-references) is preserved in this session's transcript; summarized findings above are the actionable extract.

---

## GDD Revision Flags (Architecture → Design Feedback)

No new flag was produced by an engine-verification-vs-GDD-assumption contradiction this run (the class Phase 5b specifically targets). What remains open is a distinct, already-known category — **ADR-decision-vs-GDD-prose sync gaps**, carried over from the prior session's `/propagate-design-change` run plus 2 new items from this review's specialist consultation:

| GDD / Registry | Gap | Action |
|---|---|---|
| `persistence-save-system.md` | Core Rule #1 still reads "2 checkpoint" — ADR-0002 D1b already made it 3 | Revise prose |
| `turn-manager.md` | `undo_availability_window` formula needs conjunct `pending_snapshot_valid` — ADR-0004 already added the interface | Revise formula |
| `core-ui-screen-navigation.md` | AC-59a/59b need "hack-invalidate" added as a cause of Undo-button disappearance | Revise AC |
| `equipment-skill-data-system.md` | Needs `was_ever_equipped`/`was_ever_resolved_in_combat` markers + `known_skill_ids` removal semantics | Add schema |
| `world-memory-context-management.md` | Needs `referenced_in_world_memory(entry)` mirrored into Public Interface prose — ADR-0005 already added it | Revise prose |
| `design/registry/entities.yaml` | 7 constants need hệ #16 added to `referenced_by` | Registry housekeeping |
| `character-customization-mode.md` | D.5 needs a coroutine-contagion note for `referenced_in_world_memory()` (new, from this review) | Add note |
| `docs/architecture/adr-0002-...md` D6 | Trigger list needs a 3rd bullet for key-shape changes (new, from this review) | Revise trigger list |

None of these block MVP implementation of any *other* system — they are prose/schema sync debt specific to hệ #16's cascade and are already tracked as the queued next step in `production/session-state/active.md`.

---

## Architecture Document Coverage (Phase 6)

`architecture.md` (Phases 1–4: System Layer Map, Module Ownership Map, Data Flow, API Boundaries) predates hệ #16's approval — its "Document Status" header reads "15 GDDs mapped," last updated 2026-08-12, one day before hệ #16 was Approved. Hệ #16 was **absent** from:

- Phase 1 System Layer Map (no layer/module-boundary/engine-risk row)
- Phase 2 Module Ownership Map (no owns/exposes/consumes/engine-APIs row)
- Phase 3 Data Flow (not mentioned in the Turn Resolution Path or any diagram — correctly, since it bypasses Turn Manager entirely, but that exemption was never stated)
- Phase 4 API Boundaries (no GDScript interface stub for the O-Customize write path)
- The Technical Requirements Baseline's system count (still says "296 total requirements" / "15 system GDDs")

This is a real completeness gap in the master architecture document, distinct from the ADR-level integration (which *was* done correctly via `/propagate-design-change`). **Fix applied this session** — see "Files Written" below.

---

## Verdict: **CONCERNS**

No Foundation/Core-layer requirement is silently uncovered, and no cross-ADR conflict blocks any currently-planned implementation work. However:

- 2 BLOCKING findings (1A, 1B above) must be fixed in ADR-0002 D1b before coding hệ #16's persistence write path, or a real silent-data-loss bug will ship.
- `architecture.md` was stale relative to the 4-ADR amendment cascade (now fixed this session).
- The 142-requirement ADR gap across 8 systems is intentional, already-approved project policy — not a blocking concern, restated here only for completeness.

### Blocking Issues (must resolve before coding the affected path)

1. ADR-0002 D1b: specify 3-segment `IDBKeyRange` bound construction for `world_time`-scoped scans (fix: use `world_time_upper_exclusive = world_time + 1` as the second bound segment, never a shorter array).
2. ADR-0002 D1b: specify `hack_seq` rehydration as `1 + max(existing hack_seq for [slot_id, world_time])` via the already-verified cursor scan, never an independent in-memory counter.

Both were patched into ADR-0002 this session per the user's approval — see below.

---

## Files Written This Session

- `docs/architecture/architecture-review-2026-08-13.md` — this report.
- `docs/architecture/adr-0002-persistence-storage-backend.md` — D1b patched with the two blocking fixes (1A, 1B) plus D6's trigger-list addition.
- `docs/architecture/adr-0004-turn-manager-undo.md` — tombstone-key text corrected + mutual-exclusion invariant documented.
- `docs/architecture/architecture.md` — hệ #16 added to Phase 1 (System Layer Map), Phase 2 (Module Ownership Map), and the Technical Requirements Baseline system count.
- `docs/architecture/tr-registry.yaml` — populated with the established TR-IDs already used throughout `architecture.md` for 15 systems, plus ~24 new `TR-ccm-*` entries for hệ #16 (Character Customization Mode; `ccm` chosen to avoid colliding with `cc` = Character Continuation).

## Not Written This Session (tracked, not forgotten)

- The 8-item GDD/registry prose-sync backlog (table above) — GDD-text-level edits, out of `/architecture-review`'s own write scope; queued as the next `production/session-state/active.md` step, per the existing plan.
- ID-namespace note: 7 background extraction agents spawned during this review's Phase 2 independently re-derived TRs for all 16 GDDs using a *different* ID convention (full document-name slugs, e.g. `TR-combat-system-001`) than the one already established and ADR-cited in `architecture.md` (e.g. `TR-combat-016`). That independent extraction was **not** used to populate the registry — only `architecture.md`'s pre-existing, ADR-cross-referenced IDs were, to avoid creating two incompatible ID namespaces. The independent extraction remains available in this session's transcript as a secondary completeness cross-check if ever needed, but was not authoritative.

## Rerun Trigger

Re-run `/architecture-review` after any new ADR is written, or after the GDD/registry prose-sync backlog above is closed (to confirm the sync didn't introduce a new drift).
