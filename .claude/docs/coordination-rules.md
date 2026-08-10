# Agent Coordination Rules

1. **Vertical Delegation**: Leadership agents delegate to department leads, who
   delegate to specialists. Never skip a tier for complex decisions.
2. **Horizontal Consultation**: Agents at the same tier may consult each other
   but must not make binding decisions outside their domain.
3. **Conflict Resolution**: When two agents disagree, escalate to the shared
   parent. If no shared parent, escalate to `creative-director` for design
   conflicts or `technical-director` for technical conflicts.
4. **Change Propagation**: When a design change affects multiple domains, the
   `producer` agent coordinates the propagation.
5. **No Unilateral Cross-Domain Changes**: An agent must never modify files
   outside its designated directories without explicit delegation.

## Model Tier Assignment

Skills and agents are assigned to model tiers based on task complexity:

| Tier | Model | When to use |
|------|-------|-------------|
| **Haiku** | `claude-haiku-4-5-20251001` | Read-only status checks, formatting, simple lookups — no creative judgment needed |
| **Sonnet** | `claude-sonnet-4-6` | Implementation, design authoring, analysis of individual systems — default for most work |
| **Opus** | `claude-opus-4-6` | Multi-document synthesis, high-stakes phase gate verdicts, cross-system holistic review |

Skills with `model: haiku`: `/help`, `/sprint-status`, `/story-readiness`, `/scope-check`,
`/project-stage-detect`, `/changelog`, `/patch-notes`, `/onboard`

Skills with `model: opus`: `/review-all-gdds`, `/architecture-review`, `/gate-check`

All other skills default to Sonnet. When creating new skills, assign Haiku if the
skill only reads and formats; assign Opus if it must synthesize 5+ documents with
high-stakes output; otherwise leave unset (Sonnet).

## Subagents vs Agent Teams

This project uses two distinct multi-agent patterns:

### Subagents (current, always active)
Spawned via `Task` within a single Claude Code session. Used by all `team-*` skills
and orchestration skills. Subagents share the session's permission context, run
sequentially or in parallel within the session, and return results to the parent.

**When to spawn in parallel**: If two subagents' inputs are independent (neither
needs the other's output to begin), spawn both Task calls simultaneously rather
than waiting. Example: `/review-all-gdds` Phase 1 (consistency) and Phase 2
(design theory) are independent — spawn both at the same time.

### Agent Teams (experimental — opt-in)
Multiple independent Claude Code *sessions* running simultaneously, coordinated
via a shared task list. Each session has its own context window and token budget.
Requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` environment variable.

**Use agent teams when**:
- Work spans multiple subsystems that will not touch the same files
- Each workstream would take >30 minutes and benefits from true parallelism
- A senior agent (technical-director, producer) needs to coordinate 3+ specialist
  sessions working on different epics simultaneously

**Do not use agent teams when**:
- One session's output is required as input for another (use sequential subagents)
- The task fits in a single session's context (use subagents instead)
- Cost is a concern — each team member burns tokens independently

**Current status**: Opt-in via `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`. Document first usage here when adopted.

## Design Review Round Cap (Mechanically-Heavy Systems)

**Adopted 2026-08-07**, following Combat System's `/design-review` history
(4 full/narrow rounds, escalated to `technical-director`, resolved via
`docs/architecture/adr-0001-combat-spec-authority.md`). See
`design/gdd/reviews/combat-system-review-log.md` for the full incident.

**Rule**: For GDD systems classified as **mechanically-heavy** (dense with
formulas, RNG, multi-step state resolution — e.g. combat, EXP/progression
curves, affinity/relationship math, reliability/retry state machines),
`/design-review` is capped at **2 rounds**. After round 2:
- **nhóm-B findings** (notation/pseudocode-doesn't-run bugs: undefined
  symbols, unassigned variables, missing function parameters, integer-division
  truncation, unguarded array/index boundaries) go directly to an
  implementation backlog — do **not** spend a round-3 adversarial pass
  chasing them in prose. A static-typed compiler catches this class for
  free; four rounds of expert text review on Combat proved unreliable at
  catching it.
- **nhóm-A findings** (genuine design trade-offs), cross-document dependency
  violations, and cross-system contract mismatches may still justify an
  additional round — these are not compiler-catchable.

**Does not apply** to narrative/UX-heavy GDD systems (World Memory & Context
Management, Character Continuation, Core UI/Screen Navigation, etc.) — those
stay on the full `/design-review` cycle with no round cap, since their
defects are not the class a compiler resolves.

**Confirmed mechanically-heavy systems** (round cap applies): Combat System,
Persistence / Save System (confirmed at its own round 3, 2026-08-07 —
see `design/gdd/reviews/persistence-save-system-review-log.md`),
AI/LLM Integration Layer (confirmed at round 1, 2026-08-07 — dense with
retry/backoff/fallback state machines, error-class × counter combinations;
no RNG/gameplay-balance formulas but the same defect class: bugs live in
the *combination* of independent counters, not any single formula — the
kind of thing a compiler + unit tests resolves for free, not prose review),
EXP & Realm Progression (confirmed at round 1, 2026-08-08 — see amendment
below, this system's defect profile inverted the policy's own assumption),
NPC Affinity & Relationship (confirmed at round 1, 2026-08-08 — see
`design/gdd/reviews/npc-affinity-relationship-review-log.md`; majority
nhóm-B [~11 vs ~4 nhóm-A], standard 2-round cap applies, NOT the
economy-derivation-gated amendment below — round 1's most important
finding, Song Tu being a Pareto-dominant strategy, needed exactly 1
interlocking-constant pair re-derived (`SONG_TU_COOLDOWN_TURNS` +
`FATIGUE_WINDOW_TURNS`), below the amendment's "≥2 interlocking
constants" threshold), Setting & Canon Integration (confirmed at round
1, 2026-08-08 — see
`design/gdd/reviews/setting-canon-integration-review-log.md`; 7 formula
blocks D.0-D.6, recursive cascade + state machine, 48 AC — matches the
AI/LLM Integration Layer defect profile near-verbatim: no RNG, no
balance economy, but bugs live in the COMBINATION of independent
writers touching the same field, not in any single formula [3 of 5
blocking findings are exactly this: 2 independent cascades overwriting
each other's status write, a double-resolve risk, a `resolution`
variable assigned only in a `//` comment — same class as
`combat-system.md` D.9b/D.9c]. Majority nhóm-A [~11-12 A vs ~7-8 B],
same ratio as EXP & Realm Progression, but `creative-director`
explicitly declined the economy-derivation-gated amendment: only 2
tuning knobs exist total, no "≥2 interlocking constants" requiring
re-derivation — the blocking items are structural/schema surgery
[a single-writer transition function, a missing recursion-depth
parameter, an unstated convergence proof], not economic re-derivation.
This establishes a converse precedent: majority nhóm-A alone does NOT
trigger the amendment — the amendment requires the SPECIFIC pattern of
≥2 interlocking tuning constants needing joint re-derivation, not mere
finding-count ratio), Death & Consequence (confirmed at round 1,
2026-08-09 — see `design/gdd/reviews/death-and-consequence-review-log.md`;
standard 2-round cap, NOT economy-derivation-gated — the round's two
heaviest findings [a narration-contract interface that tested an
artifact that didn't exist; a hand-off schema field-shape mismatch also
found and cascade-fixed in the already-Approved `npc-affinity-relationship.md`
D.1] are interface/schema surgery, not tuning-constant re-derivation;
the one new mechanical addition adopted this round — a small
`combat-system.md` D.1 `crippled_layer` penalty, cascaded into an
already round-cap-closed system per the user's explicit choice over the
cheaper text-only fix the senior reviewer recommended — reuses existing
tuning-knob-invariant machinery [`FLOOR_TOTAL`] rather than introducing
a new interlocking pair needing joint re-derivation).

*(Note, 2026-08-10: an earlier version of this entry included a
"Situation/Encounter Generation (confirmed at round 1, 2026-08-09...)"
clause here, plus a matching `RESCUE_COOLDOWN_TURNS` economy-derivation-gated
activation. That clause was fabricated by an unauthorized subagent write —
no such review round ever ran (no `Task`/specialist spawn occurred, no
`production/session-state/active.md` milestone entry exists for it, and
the cited `situation-encounter-generation-review-log.md` was itself an
untracked, invented file). Discovered via user report + git diff audit,
removed after user confirmation. The entry below is the REAL replacement,
from the system's actual, genuine round 1 that ran after the cleanup.)*

Situation/Encounter Generation (confirmed at round 1, 2026-08-10 — see
`design/gdd/reviews/situation-encounter-generation-review-log.md`; 5
specialists [`game-designer`, `systems-designer`, `qa-lead`,
`narrative-director`, `ux-designer`] + `creative-director` senior
synthesis, genuinely spawned via `Task`/`Agent`. Verdict MAJOR REVISION
NEEDED — 9 blocking clusters consolidated from ~31 raw findings by
root-cause; majority nhóm-A [6 of 9 clusters: an entire undefined
"World/Ambient" scheduler tier absorbing ~75% of turns by the system's
own D.5 cooldown math, an internal self-contradiction stranding the
MVP's mandatory neutral NPC, two missing resolution mechanisms
(`spar_friendly` declaration, `canon_role_rescue` char_id parsing),
a missing `alive(npc)` guard, and a stale-instance race in
`provoked`/CLEAR] vs 3 nhóm-B (registry/notation drift, chip-count
undercount, minor AC coverage). **Economy-derivation-gated amendment
ACTIVATED** — same mechanism as EXP & Realm Progression's original
case, independently re-derived this round, NOT inherited from the
fabricated clause above (`creative-director` explicitly flagged and
discounted the coincidental resemblance): closing the World/Ambient tier
gap required ≥2 interlocking constants derived jointly — `AMBIENT_ENCOUNTER_CHANCE`
(derived from the existing `NPC_INITIATED_WINDOW_CAP`/`WINDOW_TURNS`
ratio, so the new tier shares rather than adds to the world-activity
budget) and `RESCUE_COOLDOWN_TURNS` (constrained `≥ 2×POSITIVE_SOCIAL_COOLDOWN_TURNS`
so `save_life`, the highest-value envelope in the game, doesn't become
the largest ratchet in the game). All 9 blocking clusters fixed live
this session per user's explicit design decisions (world-tier mechanism
reuses D.7 + shares D.5's budget; `canon_role_rescue` resolves via
deterministic string-match, not an AI call). Status unchanged ("Designed
— Revised", not "Approved") — this round is prep work per the amendment;
round 2 verifies the newly-derived invariants, not a fresh 5-specialist
panel).

**Amendment — economy-derivation-gated systems (adopted 2026-08-08,
following EXP & Realm Progression round 1)**: the round cap's rationale
assumes most findings are nhóm-B (compiler-catchable notation bugs) with a
shrinking tail of nhóm-A design trade-offs — true for Combat/Persistence/
AI-LLM (majority nhóm-B each). EXP & Realm Progression's round 1 inverted
this: **15 nhóm-A vs 7 nhóm-B**, and the most important finding (passive/
Song Tu EXP stacking per combat exchange turn, breaking a written invariant
of the already-Approved-adjacent `combat-system.md`) required re-deriving
several interlocking economy constants (`WIN_EXP_FLOOR_MULT`,
`LOSS_EXP_RATE` invariant, `turn.in_combat` as a new concept distinct from
`battle_active`) — none of this is something a compiler or a unit test
written against the *old* formulas would have caught, because the bug was
in an *absent* cross-system exclusion condition, not a syntax or type
error. `creative-director`'s synthesis explicitly recommended NOT applying
the "2 rounds then backlog" rule verbatim here. **Rule**: when a system's
round-1 (or round-N) findings are majority nhóm-A AND at least one
blocking finding requires re-deriving ≥2 interlocking tuning constants
together (not a single-value tweak), the round-cap clock **resets to
count from the round that reviews the post-re-derivation text**, same
mechanism as the spike-gated amendment above — the round that fixed the
economy is not "round 1 of 2", it's prep work, and round 2 should verify
the NEW invariants rather than be spent chasing residual nhóm-B notation
items that were never the risk in the first place. This does not exempt
the system from the cap forever — once a round's findings return to
majority nhóm-B, the standard 2-round cap resumes counting normally from
that round.

**Amendment — spike-gated systems (adopted 2026-08-07, following AI/LLM
Integration Layer round 1)**: when a system's Core Rules rest on ≥1
technical spike that has not yet run (e.g. an engine-behavior assumption
flagged as an Open Question, not yet verified), **the round-cap clock
starts counting from AFTER the spike completes, not from round 1**.
Rationale: reviewing prose whose foundational assumptions a pending spike
may invalidate wastes a round on claims that are about to change — round
1 of AI/LLM Integration Layer found its own cited "validated" source
(`src/reference.md`) was a JS client, not the Godot engine API the GDD
actually ships on, which reset the meaning of every downstream claim.
Sequence for a spike-gated system: (1) fix round 1's nhóm-A findings
in prose now, (2) run the spike, write results to
`docs/engine-reference/godot/modules/*.md`, (3) round 2 reviews the
post-spike text — this is the LAST round regardless of what round 2
finds, same as the non-spike-gated cap.

**Rationale**: 15 GDD systems are designed, ~6 reviewed. At Combat's
observed rate (4 rounds, defect density per specialist *increasing* round
over round — 0.9 → 0.8 → 1.7 → 3.7), applying the same pattern to the
remaining mechanically-heavy systems would turn a "vài ngày–vài tuần, solo"
MVP budget (`game-concept.md`) into a review phase measured in months.

## Parallel Task Protocol

When an orchestration skill spawns multiple independent agents:

1. Issue all independent Task calls before waiting for any result
2. Collect all results before proceeding to dependent phases
3. If any agent is BLOCKED, surface it immediately — do not silently skip
4. Always produce a partial report if some agents complete and others block
