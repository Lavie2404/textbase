# ADR-0001: Combat mechanics are specified by executable GDScript, not prose pseudocode

## Status
Accepted (2026-08-11 — the Migration Plan was executed in full under the user's
standing directive to close Combat per this ADR, and all three Validation
Criteria were met empirically; see "Validation Results" appendix at the end of
this document)

## Date
2026-08-06 (Proposed) / 2026-08-11 (Accepted)

## Engine Compatibility

| Field | Value |
|-------|-------|
| **Engine** | Godot 4.6 |
| **Domain** | Core / Scripting |
| **Knowledge Risk** | LOW — this decision rests on foundational GDScript language semantics (static typing, `int`/`int` truncating division, `RandomNumberGenerator`, pure functions vs. spy-testable instances) that are not flagged as changed in `docs/engine-reference/godot/breaking-changes.md` or `deprecated-apis.md` for any 4.4–4.6 version. No post-cutoff API risk identified. |
| **References Consulted** | `docs/engine-reference/godot/VERSION.md`, `breaking-changes.md`, `deprecated-apis.md`, `modules/` (no `Scripting`/`Core` module doc exists — this ADR is process/methodology, not module-API-specific) |
| **Post-Cutoff APIs Used** | None |
| **Verification Required** | None at the engine-API level. Verification required at the *specification* level is exactly what this ADR addresses (see Decision). |

## ADR Dependencies

| Field | Value |
|-------|-------|
| **Depends On** | None — first ADR in the project |
| **Enables** | Future ADRs for other mechanically-heavy systems (EXP & Realm Progression, NPC Affinity & Relationship) may cite this ADR's reasoning without re-litigating it |
| **Blocks** | `design/gdd/combat-system.md` implementation stories should not start until this ADR is Accepted and the 5 must-patch GDD items (see GDD Requirements Addressed) are applied |
| **Ordering Note** | None |

## Context

### Problem Statement

`design/gdd/combat-system.md` (formulas D.1–D.14, ~2790 lines) has been through 4 rounds of adversarial `/design-review`. Each round — including round 3, which introduced a numerical reference harness specifically to break the pattern — found NEW blocking-severity bugs in the exact same central formulas (D.9's `resolve_exchange`, D.9b/D.9c's outcome classification, D.4b's exhaustion mechanic, D.6's damage floor) that prior rounds had declared "closed":

- **Round 1** (7 blocking clusters): division-by-zero in NPC skill selection, a hidden `coin_flip` deciding battle outcomes via a non-diegetic exchange counter, undefined mechanical effect for "Phòng thủ" (Defend).
- **Round 2** (6 blocking clusters): 4 of round 1's 7 fixes were found to have patched only the specific *instance* reported, not the underlying *invariant* — the same bug class resurfaced in a new form (e.g. the round-1 "Defend" fix was a false choice; the round-1 deadlock fix converged in only 0–3/36 tested combinations despite being declared closed).
- **Round 3** (6 blocking clusters, C-1 through C-6): introduced a Python reference harness (`prototypes/combat-reference/harness.py`) to numerically verify the two highest-stakes claims *before* editing prose — a genuine methodology improvement. It correctly proved a `float()`-cast bug voided a prior "72/72 convergence" claim, and that a sequential-drain bug in `resolve_exchange` caused the higher-SPD combatant to lose 100% of symmetric attrition battles (0/300, confirmed by harness). Both were fixed and re-verified by harness before the prose was edited.
- **Round 4** (narrow 3-specialist re-verification, explicit exit criterion: 0 new notation-level bugs, ≤4 remaining blocking findings all in the design/UX category): the exit criterion **failed**. Three independent specialists found ~9–11 new blocking findings, several via independent convergence (two specialists separately found the same AC-09b defect from different angles). Critically, `systems-designer` found that `resolve_exchange`'s own rewritten signature was missing two parameters (`hp`, `exchange_id`) used throughout its body — provable because the round-3 harness itself had to silently add them to become runnable, and nobody propagated that fact back to the GDD.
- **Escalation to `technical-director`** (this ADR's origin) found a *fifth*, more severe defect during verification: `hp_pct_pre_drain` (introduced by round 3's own drain-symmetry fix) is missing both the `float()` cast *and* the `max(max_HP, 1)` guard that its two sibling expressions (D.9b/D.9c's `hp_pct`) received in the same round. Under GDScript's actual `int`/`int` truncation, this silently degrades a "compare HP% then decide" tiebreak into a **disguised `coin_flip` deciding battle outcomes 100% of the time in symmetric scenarios** — reintroducing, through a different code path, the exact Anti-Pillar violation ("no non-diegetic rule overrides a computed result") that round 1 was fought to eliminate. The Python harness could not detect this: it measures *fairness* (an even win/lose split), which a hidden coin-flip and a correct HP%-comparison both produce; it does not measure *diegetic correctness*.

Root cause, per `technical-director`'s analysis: **two artifacts carry spec authority (GDD prose/pseudocode and the Python harness) with no machine-checked equivalence between them**, and the harness itself has an inverted default relative to the target language — GDScript's default is *lossy* (`int/int` truncates unless you opt out with `float()`); Python's default is *lossless* (`/` is true division unless you opt in to truncation). Every place the GDD's prose forgot a `float()` cast, the Python model silently ran *correctly* — a false pass that hides exactly the bug class it exists to catch. The harness also covers only 10 of 17 formulas (D.9b, D.9c, D.11, D.12, D.13, D.14 are entirely unmodeled).

Defect density per specialist across rounds: ~0.9 (R1) → ~0.8 (R2) → ~1.7 (R3) → ~3.7 (R4) — **not converging** by this measure. Architectural risk, however, has converged completely: no round, across 4 full adversarial passes, has found the exchange-loop / lock-before-narrate / D.9-D.9b-D.9c structure to be wrong. The remaining defects are uniformly local and mechanical (undefined symbols, missing parameters, missing casts, missing guards, missing test coverage) — precisely the class of error a static-typed compiler catches for free, in seconds, that four rounds of expert text review have proven unreliable at catching.

### Constraints
- Solo-developer personal project (`game-concept.md`: "dự án cá nhân, không thương mại"; MVP timeline "vài ngày–vài tuần, solo") — no team of programmers waiting on a frozen spec to coordinate against.
- `src/` currently contains no `.gd` files and no `project.godot` — the Godot project has not been bootstrapped yet.
- `docs/architecture/` currently has zero ADRs, despite `coding-standards.md` requiring one per system.
- 15 GDD systems are designed; ~6 have been through `/design-review`. Applying Combat's 4-round pattern to the remaining ~9 systems would consume a schedule measured in months against an MVP budget measured in weeks.
- `coding-standards.md` mandates GUT for automated tests and `godot --headless --script tests/gdunit4_runner.gd` for CI — any spec artifact must ultimately produce GDScript test coverage regardless of what authors the mechanics.

### Requirements
- The authoritative source for Combat's mechanical behavior (function signatures, types, execution order, division semantics, array-bounds handling) must be something a language tool can validate automatically.
- The GDD must retain full authority over design intent, tuning-knob safe ranges and rationale, and cross-system contracts (what other GDDs read from Combat's hand-off) — these are not compiler-checkable and code communicates them poorly.
- Whatever is chosen must not create a third spec artifact alongside the GDD and the harness — that would compound the drift problem, not resolve it.
- The Python harness (`prototypes/combat-reference/harness.py`) is explicitly a throwaway prototype per `.claude/rules/prototype-code.md` ("prototype code is NOT migrated directly — it is rewritten to production standards"; the harness's own `results.md` states "This is a THROWAWAY prototype") and must not be promoted to the status of authoritative spec.

## Decision

**`src/gameplay/combat/*.gd` (a static-typed GDScript reference implementation, tested via GUT) becomes the normative source of truth for Combat System's mechanical behavior** — function signatures, parameter lists, types, execution order within an exchange, division semantics (`float()` casts), array-index bounds, and RNG threading.

**`design/gdd/combat-system.md` Section D is downgraded from normative to descriptive for these mechanical details.** It remains fully normative for: design intent and rationale, Player Fantasy justification, tuning-knob names/default values/safe ranges/*why* those ranges, cross-system hand-off contracts (what fields other GDDs read and under what conditions), and Acceptance Criteria as design-level test *intent* (the GUT tests are the executable form of that intent, not a replacement for stating it).

This is a one-directional authority flow: **mechanical changes are made in `.gd` first, then reflected in GDD prose second — never the reverse.** If prose and code disagree on a mechanical detail, the code is correct until a deliberate GDD-and-code co-edit resolves the discrepancy; the GDD is never silently assumed correct.

The existing Python harness (`prototypes/combat-reference/harness.py`) is **frozen as historical evidence** — it is not deleted (its Q1/Q2/Q3b/Q5 outputs are the only extant proof for the "0/108", "0/300", "100%" claims already written into the GDD's review log and Tuning Knobs cross-constraints) — but it is not extended, and it is not cited as authoritative for anything not already measured. `AC-47a`/`AC-47b`'s numerical convergence sweeps are migrated to a `godot --headless --script` tool once `src/gameplay/combat/` exists, at which point the harness's role becomes purely archival.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ design/gdd/combat-system.md  (Section D)                    │
│ NORMATIVE for:                    DESCRIPTIVE for:          │
│  - design intent / Player Fantasy  - function signatures    │
│  - tuning knob values + ranges     - execution order         │
│    + rationale                     - division semantics      │
│  - cross-system hand-off contract  - array-bounds handling   │
│  - AC as design-level test intent  - RNG threading mechanics │
└───────────────────────┬───────────────────────────────────────┘
                         │  (one-directional: code → prose,
                         │   never prose → code)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ src/gameplay/combat/*.gd                                     │
│ NORMATIVE for: mechanics (this ADR's whole point)            │
│  - static-typed signatures (compiler-checked)                │
│  - explicit float() casts (linted, see D2 below)             │
│  - single injected RandomNumberGenerator (DI, no autoload)   │
│  - execution order literally IS the code                     │
└───────────────────────┬───────────────────────────────────────┘
                         │  tested by
                         ▼
┌─────────────────────────────────────────────────────────────┐
│ tests/unit/combat/*.gd  (GUT)                                │
│  - every BLOCKING AC → 1+ executable test                    │
│  - numeric convergence sweeps (AC-47a/47b) → godot --headless │
└─────────────────────────────────────────────────────────────┘

prototypes/combat-reference/harness.py  — FROZEN, archival only.
Cited by AC-47a's review-log history; not extended; not authoritative
for anything not already measured in results.md.
```

### Key Interfaces

- **RNG injection (D4 below)**: every mechanics function that consumes randomness takes a single `RandomNumberGenerator` as its last parameter, injected by the caller (the "Resolving Exchange" state), never read from an autoload/global. This was already the *intent* of GDD rounds 2–3's prose notes; this ADR makes it a structural requirement of the `.gd` implementation rather than a convention that can be silently violated in pseudocode.
- **Combat resolution entry point**: `resolve_exchange(...)` (or its `.gd` equivalent) is the single call site Turn Manager invokes per exchange; its full parameter list (including `hp`, `exchange_id`, `thuc_id_of`, `player_id`, `rng` — all of which round 3–4 review found missing from the GDD's pseudocode signature at various points) is defined authoritatively in code, and the GDD's Formulas section is updated to *describe* that signature, not invent its own.
- **Pure-function / dependency-injection resolution (D3 below)**: mechanics functions are pure (take all needed state as parameters, including `rng`), not static globals reading ambient state and not methods requiring an instance purely for spy-testability. This resolves the "static-function-vs-spy-test" tension flagged open since round 1 and still open at round 4 — GUT tests assert against **return values**, not call counts, wherever a pure function makes that possible.

## Alternatives Considered

### Alternative 1: Formalize `prototypes/combat-reference/harness.py` as the authoritative spec
- **Description**: Treat the existing Python harness as the normative source, with GDD prose generated from or kept in lockstep with it.
- **Pros**: Already exists, committed, re-runnable; would close the "hand-copied, no equivalence check" gap in one direction.
- **Cons**: (1) Its division-semantics default is the *inverse* of GDScript's — Python's `/` is lossless by default, GDScript's is lossy by default — so "missing `float()`" bugs, the single largest defect class found across 4 rounds, are **structurally undetectable** by this harness; promoting it to spec authority would institutionalize the exact false-pass mechanism that produced round 3's C-1 and the technical-director's newly-found `hp_pct_pre_drain` bug. (2) Covers only 10/17 formulas — D.9b, D.9c, D.11, D.12, D.13, D.14 are entirely absent, and D.9b/D.9c are the outcome-classification layer Death & Consequence depends on. (3) Would become a *third* spec artifact (GDD + Python + eventual GDScript), compounding rather than resolving the two-artifact drift problem. (4) Violates `.claude/rules/prototype-code.md`'s explicit prohibition on prototype code growing into production authority; the harness's own `results.md` self-identifies as "THROWAWAY". (5) GUT/CI (`coding-standards.md`) requires GDScript tests; a Python-authoritative spec still leaves the executable AC suite to be written from prose, which is the unsolved problem this ADR exists to close.
- **Rejection Reason**: Right instinct (an executable spec), wrong language — the harness's semantic inversion makes it actively unsafe as the primary authority, not merely incomplete.

### Alternative 2: Keep the GDD prose fully normative; add tooling (signature-symmetry lint, banned bare `/` operator) without changing spec authority
- **Description**: Continue treating `combat-system.md` Section D as the single source of truth, but add lightweight static checks — e.g. a ~20-line script asserting every symbol used in a pseudocode function body appears in its declared signature or symbol table, and a grep-based ban on bare `/` between two `int`-typed operands.
- **Pros**: Cheap; catches 2 of the recurring defect classes (undefined-symbol bugs like round 4's `hp`/`exchange_id` gap, and the `float()`-cast omissions) without a language/authority change; useful independent of whichever alternative is chosen.
- **Cons**: Still leaves two spec artifacts (GDD, harness) with no equivalence check between them; does not close the 6-formula coverage gap in the harness; does not produce GDScript test coverage (the CI-facing deliverable `coding-standards.md` actually requires); a lint script maintained by hand for a domain-specific pseudocode dialect is itself a source of drift.
- **Rejection Reason**: Rejected as the *primary* mechanism (does not resolve the two-artifact problem), but its two concrete techniques are **retained and folded into this ADR's Decision** (see D2 below) because they are cheap and independently valuable regardless of spec authority.

## Consequences

### Positive
- The single largest recurring defect class across all 4 review rounds (undefined symbols, missing parameters, integer-truncation, unguarded array bounds) becomes impossible to ship undetected — a static-typed compiler rejects or silently miscompiles none of these; it either refuses to build or (for the `float()` class) is caught by the D2 lint below.
- Resolves the drift problem by **reducing to one spec-authoritative artifact for mechanics** rather than adding a synchronization mechanism between two.
- Produces `docs/architecture/adr-0001` — the project's first ADR, closing a standing debt (`coding-standards.md` requires one per system; none existed).
- Combat gains real GUT test coverage as a direct byproduct, rather than as separate future work.
- Given `src/` has zero existing GDScript, writing the reference implementation is not additional cost layered on top of "real" implementation — it *is* the first implementation work, arriving a few days earlier than it would have under a "finish reviewing, then start coding" sequence.

### Negative
- Section D's mechanical prose can drift out of sync with `.gd` over time if the one-directional discipline (code first, prose second, never reversed) is not maintained by whoever edits Combat next. *Mitigation*: a status banner at the top of Section D pointing to the authoritative `.gd` path, and this ADR's explicit ordering rule.
- Code alone communicates *why* a value was chosen poorly (a GDScript constant doesn't carry design rationale). *Mitigation*: all tuning-knob names, default values, safe ranges, and rationale remain fully normative in the GDD — only mechanical/executable details move to code.
- Risk of inconsistency with the ~9 remaining un-reviewed GDD systems, which are not (yet) subject to this ADR. *Mitigation*: scope is explicitly limited to mechanically-heavy systems (see Validation Criteria); D7 below sets a 2-round review cap intended to prevent any future system from reaching Combat's 4-round pattern in the first place.

### Risks
- **Risk**: someone edits Combat mechanics in the GDD prose first, intending to "update the code later," recreating the two-artifact drift this ADR exists to close. *Mitigation*: the one-directional rule is stated explicitly in this ADR and should be restated at the top of Section D itself when the GDD is next touched.
- **Risk**: if GDScript implementation surfaces an *architectural* defect (not a notation bug) that 4 rounds of design review missed, this ADR's core premise — that remaining defects are uniformly local/mechanical — would be wrong. *Mitigation*: this is the explicit reversal trigger in Validation Criteria below; if it happens, re-open a full `/design-review` for Combat rather than patching in code silently.

## GDD Requirements Addressed

| GDD System | Requirement | How This ADR Addresses It |
|------------|-------------|--------------------------|
| `combat-system.md` | D.9's `resolve_exchange` central formula, and D.9b/D.9c's outcome classification, must produce results Death & Consequence / EXP & Realm Progression can trust (`outcome.type`, `hp_after`, hand-off signal) | Signatures, types, and division semantics become compiler-checked in `.gd`; the 5 non-compiler-catchable gaps (AC-09b keyword list, `character-card-identity.md` sync, missing `outcome=="lose"` AC, popover invariant restated as a property, AC-47a GIVEN/THEN scope split) are patched directly in the GDD text per this session's round-4 findings, since a compiler cannot generate design content |
| `combat-system.md` | Tuning Knobs cross-constraint (`TECHNICAL_EXCHANGE_CAP - EXHAUSTION_ONSET_EXCHANGE ≥ 120`) must be verifiable, not just asserted | Migrates to a `godot --headless --script` sweep once `src/gameplay/combat/` exists (D6); `harness.py`/`results.md` remain as the historical evidence for the numbers already committed |
| `character-card-identity.md` | Dependencies must be bidirectional (`design-docs.md`) — Combat's realm-gap warning stamp claim required this GDD's visual-hierarchy tables to acknowledge it | Synced directly in this session (lines 149–150) as one of the 5 non-compiler-catchable patches; not itself a GDScript-authority question, but surfaced by the same verification pass that produced this ADR |
| `death-and-consequence.md` | Reads `outcome.type=="lose"` literally to gate permadeath/severe-consequence logic | New AC-26b (added this session) plus this ADR's GUT-test requirement (D5) ensure this mapping is compiler/test-verified, not merely asserted in prose |

## Performance Implications
- **CPU**: Negligible. Combat resolution runs once per player action (an exchange), not per frame — the 16.6ms/60 FPS budget (`technical-preferences.md`) is unaffected by any choice made here. The pure-function/DI approach (D3) may add small per-exchange allocations versus a static-method approach; immaterial at this call frequency.
- **Memory**: Negligible at this call frequency; no persistent structures introduced by this ADR.
- **Load Time**: None — this ADR does not introduce autoloads, singletons, or startup-time work.
- **Network**: N/A — single-player, no networking layer.
- *Note*: the budgets that actually need protecting in this project are `ai_call_timeout_seconds=30` (narration latency) and the Web/Mobile Web memory ceiling, currently `[TO BE CONFIGURED]` in `technical-preferences.md` — a separate, pre-existing debt this ADR does not address but flags for visibility.

## Migration Plan
1. Apply the 5 non-compiler-catchable GDD patches (already done this session — see GDD Requirements Addressed).
2. Add the two D2 lint techniques (signature-symmetry check, banned bare `int/int` division) to project tooling — cheap, independently valuable, retained from Alternative 2.
3. Bootstrap `project.godot` and `src/gameplay/combat/` (does not yet exist).
4. Implement `src/gameplay/combat/*.gd` from the GDD's current Formulas section (D.1–D.14), resolving the ~9–11 round-4 mechanical findings (missing parameters, missing `float()` casts, missing `max(...,1)` guards, D.14's `P(thức_i)` being a property rather than an executable expression) directly in code, one time, correctly — not by further hand-editing 2790 lines of prose.
5. Write GUT tests in `tests/unit/combat/` implementing every BLOCKING Acceptance Criterion from Section D.
6. Migrate AC-47a/AC-47b's numerical sweeps to a `godot --headless --script` tool; freeze `harness.py` as archival.
7. Update Section D's mechanical prose to *describe* (not define) the resulting `.gd` signatures, execution order, and division handling; add the status banner noting `.gd` is authoritative.

## Validation Criteria
This decision is correct if, once Combat is implemented in GDScript:
1. The compiler + static typing catch **≥5 of the round-4 backlog items** within the first hour of implementation, with no reviewer needed.
2. **No implementation-time finding reveals an architectural defect** — if one does, that means 4 rounds of design review missed something structural, which would falsify this ADR's core premise (that remaining defects are local/mechanical, not architectural); the correct response is to re-open a full `/design-review`, not to patch silently in code.
3. Combat goes from "start coding" to "GUT tests green" **faster than one additional full `/design-review` round** would have taken.

If criterion 2 fails, that is the sole signal that should reverse this decision.

## Related Decisions
- `design/gdd/reviews/combat-system-review-log.md` — full 4-round review history this ADR is a direct response to.
- `prototypes/combat-reference/harness.py` + `results.md` — frozen evidence base (see Decision).
- Future ADRs for EXP & Realm Progression / NPC Affinity & Relationship may cite this one if those systems' review cycles show the same defect-density pattern.

---

## Validation Results (2026-08-11 — appended at Acceptance)

The Migration Plan was executed 2026-08-11: `project.godot` bootstrapped,
GUT 9.7.1 installed, `src/gameplay/combat/*.gd` implemented (7 source files:
tuning config, combatant snapshot, formulas D.1–D.7/D.10–D.13, resolver
D.8/D.9/D.9b/D.9c, NPC D.14 + Core Rule #2, action slots, narration keyword
table), `tests/unit/combat/` written (13 test files + shared factory), the
AC-47a/47b sweeps migrated to `tools/combat/convergence_sweep.gd`, and the D2
lint delivered as `tools/lint/combat_lint.py` (verified to catch both defect
classes on a seeded bad file; runs clean on the real code).

**Final GUT run: Scripts 14 | Tests 91 | Passing 91 | Asserts 829 — all
green** (independently re-run and confirmed by the orchestrating session).

Against the three Validation Criteria:

1. **≥5 round-4 backlog items caught by compiler/typing/lint — MET (9)**:
   missing `hp`/`exchange_id` params; `hp_pct_pre_drain` missing
   `float()`+`max(max_HP,1)` (the disguised-coin-flip defect this ADR was
   written over — now a dedicated regression test); undeclared `self`/`other`
   in D.9b/D.9c; `outcome` unassigned on the common branch; `thuc_id`/`rng`
   never threaded; D.14 bounds clamp; D.14 `P(thức_i)` property→executable
   pick; AC-09b keyword list→executable data; D.12 int-division-before-ceil.
2. **No architectural defect — MET**: the exchange-loop /
   lock-before-narrate / D.9-D.9b-D.9c structure translated to typed GDScript
   unchanged. The reversal trigger was NOT activated. One additional *local*
   prose bug was found and fixed in code (D.7 lifesteal recorded but never
   applied to HP) — mechanical class, logged in the GDD Section D banner.
3. **Faster than one review round — MET**: ~35 minutes from first source file
   to full-suite green; the 91-test suite passed its first complete run.

Convergence evidence vs the frozen harness: AC-47a deterministic sweep
96/108 converging (EXACT match with frozen Q1-FIXED; all 12 non-converging
combos are flagged cross-constraint-#2 violations, none silent); Q3b
SPD-fairness 155/300 vs 145/300 (51.7%/48.3%, consistent with frozen
52.3%/47.7%, vs 0/300 pre-fix); AC-47b Monte Carlo advisory sweep consistent.
`harness.py` remains frozen/archival as decided.
