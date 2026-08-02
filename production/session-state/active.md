<!-- STATUS -->
Epic: Systems Design
Feature: EXP & Realm Progression
Task: GDD complete (Designed — Pending Review), 8/15 MVP systems designed
<!-- /STATUS -->

<!-- CONSISTENCY-CHECK: 2026-08-02 | GDDs checked: 2 | Conflicts found: 0 -->
<!-- CONSISTENCY-CHECK: 2026-08-02 | GDDs checked: 3 (post /design-review fixes) | Conflicts found: 0 -->
<!-- CONSISTENCY-CHECK: 2026-08-02 | GDDs checked: 4 (post AI/LLM Integration Layer GDD) | Conflicts found: 0 -->
<!-- CONSISTENCY-CHECK: 2026-08-02 | GDDs checked: 5 (post World Memory GDD) | Conflicts found: 0 (1 stale Open Question fixed in turn-manager.md) -->
<!-- CONSISTENCY-CHECK: 2026-08-02 | GDDs checked: 6 (post Persistence/Save System GDD) | Conflicts found: 0 (6 referenced_by metadata gaps fixed in entities.yaml) -->
<!-- CONSISTENCY-CHECK: 2026-08-02 | GDDs checked: 7 (post Combat System GDD) | Conflicts found: 2 (combat_power_estimate registry entry missing variables + wrong output_range, both self-authored errors, fixed; 5 referenced_by metadata gaps also fixed) -->

## Current Task (updated)

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

Next system in design order (from `systems-index.md`): **NPC Affinity &
Relationship** (Feature, #9 of 15) — depends on Turn Manager (Approved),
World Memory (Designed). Will need to define the exact "Song Tu active"
interface that `exp-realm-progression.md` left provisional (Open
Questions), and the Hảo cảm propagation/decay rates flagged as a
High-Risk System in `systems-index.md`.
