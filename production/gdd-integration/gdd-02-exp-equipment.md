# Implementation Contract — GDD Set 02

Sources (read in full, 2026-08-17):
- `design/gdd/exp-realm-progression.md` (Status: Approved, review round 2 + narrow verify, 2026-08-08)
- `design/gdd/equipment-skill-data-system.md` (Status: Approved, 2026-08-02)

Scope note: `combat-system.md` and the Song Tu (dual-cultivation) mechanic are **out of scope**.
Existing in-game implementations of combat and Song Tu stay as-is. This document records only the
**interface field names** those systems must expose (`battle_active`, `outcome.winner_id`,
`outcome.loser_id`, `outcome.type`, `in_combat`, `is_death_turn`,
`song_tu_relationship_active_npc_ids`, `CONTENT_EXCHANGE_ESTIMATE`) — no combat rules are extracted.

---

# PART A — EXP & Realm Progression

## A1. Purpose

This system owns the entire concept of "level" (`level`) and "realm/tier" (`tier`) for every
character with a Character Card (player **and** NPCs). It accumulates EXP from four sources per
confirmed turn, scales the sum once by the active Tâm Pháp multiplier, then applies level-ups with
carry-over, blocks at a hard ceiling on every multiple-of-10 level (the "Chờ Đột Phá" /
awaiting-breakthrough state), and executes the breakthrough only when an externally-owned boolean
predicate returns true. It also defines the per-level / per-tier stat growth curve for all 12
Character Card stats. It is a pure data/state system: it emits `level`, `tier`, `exp`, `state` and
stat values; it owns no narration, no content for the breakthrough condition, and no combat math.

## A2. Core Rules (numbered, with GDD refs)

1. **(Core Rule #1)** Every character has `level: int ∈ [1, ∞)` and `tier = floor((level - 1) / 10) + 1`.
   10 levels = 1 tier. `tier` is a **derived/computed property only — never stored as a field**
   (prevents desync on rollback which restores only `level`). Because `level ≥ 1` always,
   `tier` is never 0; `tier(1) = 1` is the true floor. No rule ever decreases `level` except
   Rollback (Rule 8) restoring a prior valid snapshot.
2. **(Core Rule #2)** Four EXP sources accumulate on each turn that is *confirmed and not undone*:
   combat-win, combat-loss, passive, Song Tu. All four are blocked entirely when
   `turn.is_death_turn == true`.
   - **Combat win** — computed once, only on the turn where `locked_result.battle_active`
     becomes `false` (battle conclusion). Never recomputed per exchange inside a battle.
   - **Combat loss** — fixed `LOSS_EXP_RATE` fraction; zero if `is_death_turn == true`; same
     trigger point as combat win.
   - **Passive** — every confirmed turn where `turn.in_combat == false`: `+PASSIVE_EXP_RATE`
     (0.1%) of the current level's threshold. Unconditional otherwise.
   - **Song Tu** — bonus per turn when (a) self's Tâm Pháp has `type == "song tu"` AND
     (b) self is in an active Song Tu relationship with the player AND (c) `turn.in_combat == false`.
   - **Critical gate (round-1 cluster A1)**: passive and Song Tu **must not tick while
     `turn.in_combat == true`**, because each combat exchange is itself a Turn Manager turn.
     `turn.in_combat` is `true` throughout "In Combat — Awaiting Exchange", "Resolving Exchange",
     **and "Battle Concluded" (including the battle-ending turn)**; it is `false` only from
     "Not In Combat" onward. Consequence: `combat_win_exp`/`combat_loss_exp` (gated on
     `battle_active == false`) and passive/Song Tu (gated on `in_combat == false`) **can never
     resolve on the same turn**.
3. **(Core Rule #3)** **Tâm Pháp** — minimal ownership only. Each character has exactly one active
   Tâm Pháp at a time: `{ tam_phap_id, exp_multiplier: float ≥ 1 (default 1.0 if none), type: "đơn tu" | "song tu" }`.
   `exp_multiplier` multiplies the **entire turn total** (all four sources), applied **exactly once**,
   **before** level-up/cap logic. There is currently **no cap** on `exp_multiplier` — a future Tâm Pháp
   system is advised to add `TAM_PHAP_EXP_MULTIPLIER_MAX` low enough that one won battle never exceeds
   ~1 level's worth of EXP (no other `MAX_LEVELS_PER_TURN` safety exists).
4. **(Core Rule #4)** **Normal level-up**: when accumulated EXP ≥ current threshold AND
   `level mod 10 != 0`, level up immediately; surplus EXP carries over; multiple level-ups may
   cascade in one turn, stopping immediately before the next breakthrough gate.
5. **(Core Rule #5)** **Breakthrough gate**: when EXP reaches the threshold while `level mod 10 == 0`,
   the character enters **Chờ Đột Phá**. EXP is **clamped exactly at 100% of the threshold** — no
   further accumulation, no banking; all further EXP that turn and on later turns is **discarded**
   until `breakthrough_requirement_met(tier)` returns true.
6. **(Core Rule #6)** The content of the breakthrough condition (e.g. Hồn Hoàn) is **external data**
   owned by Setting & Canon Integration. This system only calls the boolean
   `breakthrough_requirement_met(tier)`. **Binding constraint on the owner**: the condition may only
   be satisfied through **combat** actions/results (the `raw_combat` branch of `resolve_turn_exp`,
   i.e. the turn `locked_result.battle_active` flips to `false`) — never through passive cultivation,
   Song Tu, or any non-combat action.
7. **(Core Rule #7)** When `breakthrough_requirement_met == true` (re-checked every turn while in
   Chờ Đột Phá): breakthrough executes immediately that turn — `level += 1`, `tier` follows
   automatically, `exp = 0` (the clamped ceiling does **not** carry over), state returns to
   Tu Luyện Thường. Stat jump comes for free from D.5's `BREAKTHROUGH_BONUS_X` term — no separate
   "apply bonus" mechanism. Blocked if `death_and_consequence_blocked == true` (Rule 9).
8. **(Core Rule #8)** **Rollback**: every change to `level`/`tier`/`exp`/Chờ-Đột-Phá state caused by
   a turn — including a breakthrough that happened in that same turn — must be fully undoable to the
   pre-turn snapshot. Undo depth is 1, non-chainable.
9. **(Core Rule #9)** If Death & Consequence flags the character as "phế đan điền/võ công"
   (`death_and_consequence_blocked == true`): **all** EXP accumulation halts (all 4 sources) **and**
   breakthrough **execution** is blocked. The Chờ Đột Phá state and an already-satisfied condition are
   **preserved**, not lost; breakthrough fires on the first turn after the flag clears, re-evaluating
   `breakthrough_requirement_met` at that moment (never assuming it is still true).
10. **(Core Rule #10)** `level` is raw data this system provides. It does **not** compute the
    "gap ≤ 20 levels" hostility threshold — that belongs to Situation/Encounter Generation.
11. **(Core Rule #11)** `resolve_turn_exp` applies to **every** character with a Character Card,
    including NPCs. `self` is whichever character is being evaluated, **not** necessarily the player.
    Win/loss must be determined by `outcome.winner_id == self` / `outcome.loser_id == self` —
    **never** by `outcome.type`, which `combat-system.md` defines relative to `player_id`. Using
    `type` would silently leave `raw_combat = 0` when `self` is a winning NPC.
12. **(Core Rule #12)** **Required-for-MVP**: when the state transitions to Chờ Đột Phá, Setting &
    Canon Integration and/or Character Card & Identity **must** surface at least one minimal
    qualitative signal (non-null / non-empty) telling the player they are in this state. This system
    owns only the *requirement that the hook exists*, not its content. The signal must **not** reveal
    the exact answer of `breakthrough_requirement_met`.

## A3. State / Data Model

### Per-character progression state (keyed by `char_id`)

| Field | Type | Initial | Notes |
|---|---|---|---|
| `char_id` | string | issued by Character Continuation | **All state is keyed by `char_id`**, never a global "main character" slot (AC-49) |
| `level` | int | `1` (dev-seed for MVP main character: `9`) | Range `[1, ∞)`, no cap |
| `exp` | float | `0.0` | EXP toward `level → level+1`; clamped at `exp_threshold(level)` while in Chờ Đột Phá |
| `state` | enum `"Tu Luyện Thường" \| "Chờ Đột Phá"` | `"Tu Luyện Thường"` | Only 2 states |
| `tier` | **derived**, int | `floor((level-1)/10)+1` | **Do not persist.** Compute on read |
| `tam_phap_id` | string \| null | `null` | |
| `exp_multiplier` | float ≥ 1 | `1.0` when `tam_phap_id == null` | From active Tâm Pháp |
| `tam_phap_type` | `"đơn tu" \| "song tu"` \| null | `null` | |

### State machine

| State | Condition | Transition out |
|---|---|---|
| Tu Luyện Thường | `level mod 10 != 0`, or `level mod 10 == 0` with EXP below threshold | → Tu Luyện Thường (`level+1`) when EXP suffices and the next level is not a gate; → Chờ Đột Phá when EXP suffices exactly at `level mod 10 == 0` |
| Chờ Đột Phá | `level mod 10 == 0`, `exp == exp_threshold(level)`, requirement not met | → Tu Luyện Thường (`level+1`, `tier+1`, `exp = 0`) the moment `breakthrough_requirement_met(tier) == true` and no blocker applies |

### 12 Character Card stats governed by D.5

- **Raw (uncapped)**: HP, ATK, DEF, SPD
- **Percentage (clamped to `PERCENT_STAT_CAP`)**: Crit Rate, Crit Damage, ACC, Evasion (Né tránh),
  Lifesteal, HP Regen, Amp (Khuếch đại), Mitigation (Chống chịu)

Each stat needs its own `(base_X0, LEVEL_GROWTH_X, BREAKTHROUGH_BONUS_X)`. `base_X0` is owned by
Character Card, not this system. **The config data file must contain all 26 constants**:
24 = `LEVEL_GROWTH_X` + `BREAKTHROUGH_BONUS_X` for each of 12 stats, plus `BASE_EXP_THRESHOLD` and
`EXP_THRESHOLD_INCREMENT`. A missing constant is a **fail-loud data-load error**, never a silent `0`.

### Error taxonomy (`EXP_ERROR_*`, verified by equality against a constant, never string matching)

| Code | Trigger | Verification strictness |
|---|---|---|
| `EXP_ERROR_OPPONENT_TIER_UNDEFINED` | Opponent Character Card lacks `tier` when `combat_win_exp` is called | Exact-equality assert required (AC-32) |
| `EXP_ERROR_WIN_LOSS_INVARIANT_VIOLATED` | Data-load: `WIN_EXP_BASE_FRACTION × WIN_EXP_FLOOR_MULT < LOSS_EXP_RATE` | Exact-equality assert required (AC-45) |
| `EXP_ERROR_MISSING_TUNING_CONSTANT` (suggested, with `missing_constant_name` param) | Any of the 26 required constants missing | Behaviour-only: test asserts fail-loud, not the literal (AC-41) |
| `EXP_ERROR_INVALID_THRESHOLD_CONFIG` (suggested, shared) | `BASE_EXP_THRESHOLD ≤ 0` or `EXP_THRESHOLD_INCREMENT < 0` | Behaviour-only (AC-42 / AC-47) |
| `EXP_ERROR_ECONOMY_INVARIANT_MARGIN_VIOLATED` (suggested) | D.1 economic invariant violated across the `CONTENT_EXCHANGE_ESTIMATE` safe range | Behaviour-only (AC-48) |

**Never implement fail-fast with a stripped-in-release assert.** The project ships a Web /
Mobile Web build; a stripped assertion silently no-ops in production, inverting the intent.

## A4. Formulas & Algorithms

### D.1 — EXP threshold curve (linear, deliberately)

```
exp_threshold(level) = BASE_EXP_THRESHOLD + EXP_THRESHOLD_INCREMENT * (level - 1)
```
Output range `[BASE_EXP_THRESHOLD, ∞)`, monotone increasing, unbounded.
This is the **single** threshold formula; D.3, D.4 and the passive source all use it as their
denominator. Examples with defaults (100 / 10): `exp_threshold(1)=100`, `(10)=190`, `(20)=290`,
`(25)=340`, `(26)=350`.

**Algebraic consequence (must be understood before tuning)**: every EXP source has the form
`RATE * exp_threshold(level)`, so turns-per-level via any single source
`= exp_threshold / (RATE * exp_threshold) = 1/RATE`. `exp_threshold` cancels out.
`BASE_EXP_THRESHOLD` / `EXP_THRESHOLD_INCREMENT` therefore only change the **displayed number**
on the Character Card — they do **not** change real pacing in turns. Pacing is constant across the
whole game by design; escalating difficulty comes entirely from the breakthrough gate.

**Economic invariant (must hold when tuning)**:
```
WIN_EXP_BASE_FRACTION / CONTENT_EXCHANGE_ESTIMATE >= 1.5 * (PASSIVE_EXP_RATE + SONG_TU_EXP_RATE)
```
Must be validated at **all three** points of the `CONTENT_EXCHANGE_ESTIMATE` safe range
(15 / 30 / 50, constant read cross-system from `combat-system.md`), not just the default 30.
With current defaults: `0.20/15 = 0.01333`, `0.20/30 = 0.00667`, `0.20/50 = 0.004`, all ≥
`1.5 × 0.0025 = 0.00375`. Violation means passive/Song Tu becomes a faster path than combat,
inverting the intended incentive hierarchy.

### D.2 — Combat win EXP

```
tier_diff        = tier(opponent) - tier(self)          // positive = punching up
tier_multiplier  = clamp(1 + WIN_EXP_TIER_BONUS * tier_diff, WIN_EXP_FLOOR_MULT, WIN_EXP_CEIL_MULT)
combat_win_exp   = WIN_EXP_BASE_FRACTION * exp_threshold(level(self)) * tier_multiplier
```
`tier(self)`, `tier(opponent)` are **raw ints in `[1, ∞)`**, not object references. Output is always
strictly positive (`WIN_EXP_FLOOR_MULT > 0`). With defaults, `tier_diff ≤ -3` all clamp to the floor
(the true breakeven between raw multiplier and floor is `tier_diff ≈ -2.8`); `tier_diff ≥ +8` clamps
to the ceiling (≈60% of a threshold).

**Mandatory invariant**: `WIN_EXP_BASE_FRACTION * WIN_EXP_FLOOR_MULT >= LOSS_EXP_RATE`.
Current: `0.20 × 0.30 = 0.06 ≥ 0.04`. If violated, deliberately losing becomes the higher-EV choice
at deep negative `tier_diff` — a dominant strategy. Any balance pass touching any of those three
constants must re-verify, and the check is enforced at data-load time.

Note: `WIN_EXP_TIER_BONUS` deliberately does **not** reuse `combat-system.md`'s `PENALTY_PER_TIER`
even though both are `clamp(1 + rate*gap, floor, ceil)`; the numeric coincidence at 0.15 was
accidental and must not be linked.

### D.3 — Combat loss EXP

```
combat_loss_exp(self) = LOSS_EXP_RATE * exp_threshold(level(self))
```
Independent of opponent tier (deliberately unlike D.2). `= 0` when `is_death_turn == true`
(already short-circuited globally in D.6, so no extra branch is needed inside D.3).

### D.4 — Song Tu bonus (interface only; mechanic out of scope)

```
SONG_TU_ACTIVE(self) = 1 if (tam_phap_type(self) == "song tu"
                             AND self ∈ player's active Song Tu set)
                       else 0
song_tu_exp_bonus(self) = SONG_TU_ACTIVE(self) * SONG_TU_EXP_RATE * exp_threshold(level(self))
```
**Self-relative**: if `self == player`, the check is
`song_tu_relationship_active_npc_ids != ∅`; if `self == NPC_X`, the check is
`NPC_X ∈ song_tu_relationship_active_npc_ids`. The same single flag from
`npc-affinity-relationship.md` Tier-2 state machine is used for both — Song Tu is always
player↔NPC, never NPC↔NPC. **The bonus does not stack with the number of NPCs.**
This system is the sole owner of the name `SONG_TU_ACTIVE`; NPC Affinity owns
`song_tu_relationship_active_npc_ids`.

### D.5 — Stat growth

```
stat_value(C, X)            = base_X0 + LEVEL_GROWTH_X * (level(C) - 1)
                                      + BREAKTHROUGH_BONUS_X * (tier(C) - 1)
percentage_stat_value(C, X) = clamp(stat_value(C, X), 0, PERCENT_STAT_CAP)   // % stats only
```
`tier(C) - 1` = number of successful breakthroughs. Worked examples (fixtures used by ACs):
HP `100 + 8*24 + 50*2 = 392` at L25/T3; ATK `10 + 1.5*24 + 8*2 = 62`;
Crit Rate `0.05 + 0.008*24 + 0.02*2 = 0.282` (below cap, unclamped).

### D.6 — Per-turn EXP resolution

```
resolve_turn_exp(self, turn):
  IF death_and_consequence_blocked(self): RETURN 0        // global short-circuit #1 (Rule 9)
  IF turn.is_death_turn:                  RETURN 0        // global short-circuit #2 (Rule 2)

  raw_combat = 0
  IF turn.locked_result.battle_active == false:
    IF   turn.locked_result.outcome.type == "no_outcome":
      raw_combat = 0                                       // fled / friendly draw — explicitly 0
    ELIF turn.locked_result.outcome.winner_id == self:
      raw_combat = combat_win_exp(self, tier(turn.locked_result.outcome.loser_id))   // D.2
    ELIF turn.locked_result.outcome.loser_id  == self:
      raw_combat = combat_loss_exp(self)                                             // D.3
    // ELSE: self was not a participant (multi-party future) -> 0

  raw_passive = 0
  raw_song_tu = 0
  IF turn.in_combat == false:                              // A1 gate — never during any combat turn
    raw_passive = PASSIVE_EXP_RATE * exp_threshold(level(self))
    raw_song_tu = song_tu_exp_bonus(self)                  // D.4

  raw_total  = raw_combat + raw_passive + raw_song_tu
  final_gain = raw_total * exp_multiplier(active_tam_phap(self))   // multiply EXACTLY ONCE
  apply_exp_gain(self, final_gain)                                 // D.7, EXACTLY ONCE
```
`final_gain ∈ [0, ∞)`. The two things that actually matter (multiplying the sum vs. each source is
algebraically identical): (a) `exp_multiplier` must be applied **before** the cap/cascade step —
multiplying after clamping loses EXP; (b) the cap/cascade must run **once** on the combined
`final_gain`, never three times per source (running per-source invites forgetting to recompute
`exp_threshold(level)` after a mid-turn level-up).

### D.7 — Applying gain, gating, executing breakthrough

```
apply_exp_gain(self, final_gain):
  ASSERT BASE_EXP_THRESHOLD > 0            // hard guard; violation risks a near-infinite cascade
  current_exp = exp(self) + final_gain
  WHILE true:
    threshold = exp_threshold(level(self))
    IF level(self) mod 10 != 0:                    // Rule 4 — ordinary level
      IF current_exp >= threshold:
        current_exp -= threshold
        level(self) += 1                            // tier follows via Rule 1 (derived)
        CONTINUE                                    // may cascade further
      ELSE:
        BREAK
    ELSE:                                           // Rule 5 — decade gate
      IF current_exp >= threshold:
        current_exp = threshold                     // clamp EXACTLY at 100%; surplus discarded
        state(self)  = "Chờ Đột Phá"
      BREAK                                         // never cascade past the gate
  exp(self) = current_exp

try_execute_breakthrough(self, turn):
  IF state(self) != "Chờ Đột Phá":            RETURN
  IF death_and_consequence_blocked(self):     RETURN     // Rule 9 — also blocks execution
  IF turn.in_combat  == true:                 RETURN     // no breakthrough mid-battle
  IF turn.is_death_turn == true:              RETURN     // no breakthrough on the death turn
  IF breakthrough_requirement_met(tier(self)):
    level(self) += 1                                     // tier +1 automatically
    exp(self)    = 0
    state(self)  = "Tu Luyện Thường"

process_character_turn(self, turn):          // MANDATORY per-turn orchestrator
  try_execute_breakthrough(self, turn)       // MUST run first — later gain uses the NEW threshold
  resolve_turn_exp(self, turn)
```
**Implementation hygiene note (from the GDD's own open items)**: `apply_exp_gain` does not take
`turn` and does not check `turn.in_combat`. It is safe only because it has exactly one call site
(`resolve_turn_exp`), which always passes `final_gain = 0` on non-concluding in-combat turns. Add an
invariant comment or a cheap call-site assertion so a future second call site cannot silently break this.

## A5. Tuning Knobs

| Knob | Default | Safe range | Notes |
|---|---|---|---|
| `BASE_EXP_THRESHOLD` | 100 | 50–300 | Display-only; must be `> 0` (hard guard) |
| `EXP_THRESHOLD_INCREMENT` | 10 | 5–50 | Display-only; must be `≥ 0` |
| `PASSIVE_EXP_RATE` | 0.001 (0.1%) | 0.0005–0.003 | Re-verify D.1 economic invariant before raising |
| `LOSS_EXP_RATE` | 0.04 (4%) | 0.02–0.06 | Must be `≤ WIN_EXP_BASE_FRACTION × WIN_EXP_FLOOR_MULT` |
| `WIN_EXP_BASE_FRACTION` | 0.20 | 0.05–0.30 | **Not independent** of `WIN_EXP_FLOOR_MULT` |
| `WIN_EXP_TIER_BONUS` | 0.25 | 0.10–0.40 | |
| `WIN_EXP_FLOOR_MULT` | 0.30 | 0.27–0.50 | **Not independent** of `WIN_EXP_BASE_FRACTION`; known unfixed farming risk (see A9) |
| `WIN_EXP_CEIL_MULT` | 3.0 | 2.0–5.0 | |
| `SONG_TU_EXP_RATE` | 0.0015 (0.15%) | 0.001–0.003 | Set specifically so the D.1 margin ≥1.5× holds at `CONTENT_EXCHANGE_ESTIMATE` = 15, 30 **and** 50 |
| `PERCENT_STAT_CAP` | 0.95 | 0.85–0.99 | Matches `P_MAX = 0.95` philosophy in combat |
| `LEVEL_GROWTH_X` / `BREAKTHROUGH_BONUS_X` (24 total) | e.g. HP 8/50, ATK 1.5/8, CritRate 0.008/0.02 | per-stat balance pass | 9 of 12 stats still untuned |
| `exp_multiplier` (Tâm Pháp, external owner) | 1.0 | **no cap defined** | Advise a `TAM_PHAP_EXP_MULTIPLIER_MAX` |

**Joint constraint the published independent ranges do NOT enforce**:
`WIN_EXP_BASE_FRACTION × WIN_EXP_FLOOR_MULT ≥ LOSS_EXP_RATE` must hold *simultaneously*.
Counter-example that is inside both published ranges yet violates it: `0.10 × 0.30 = 0.03 < 0.04`.
Enforce at data-load.

## A6. Edge Cases (resolved)

- **EC-1 — opponent has no `tier`**: not a valid input, a configuration bug. Fail fast with the
  structured code `EXP_ERROR_OPPONENT_TIER_UNDEFINED`; never null-coalesce to 0; never use a
  release-stripped assert.
- **EC-8 — a required constant is missing from the config file**: fail loud at data-load time,
  before the play session begins. Never default to `0`.
- **EC-8b — `BASE_EXP_THRESHOLD ≤ 0`**: blocked at data-load; also guarded by the `ASSERT` at the top
  of `apply_exp_gain`. The `WHILE` loop must execute zero times before the error is raised.
- **EC-10 — `EXP_THRESHOLD_INCREMENT < 0`**: blocked at data-load (detectable there; does not need a
  runtime assert).
- **EC-9 — win/loss invariant violated in config**: blocked at data-load with
  `EXP_ERROR_WIN_LOSS_INVARIANT_VIOLATED`.
- **EC-11 — D.1 economic invariant**: validated at data-load across the whole published
  `CONTENT_EXCHANGE_ESTIMATE` safe range, not only its default.
- **EC-2 — breakthrough condition becomes true on a turn that also grants EXP**: breakthrough is
  processed **first** (using start-of-turn state), then that turn's EXP is applied against the **new**
  threshold `exp_threshold(level+1)`. Enforced structurally by `process_character_turn`.
- **EC-3 — a turn that caused a breakthrough is undone**: roll back `level`, `tier`, `exp`, **and** the
  Chờ Đột Phá state (not merely returning to Tu Luyện Thường). Rolling back an *external* resource
  consumed by the breakthrough (e.g. Hồn Hoàn) is explicitly **out of scope** — write no assertion
  about it.
- **EC-4 — `is_death_turn == true`**: the entire `resolve_turn_exp` returns 0, not just the combat
  portion. Passive and Song Tu are suppressed too.
- **EC-5 — `death_and_consequence_blocked` becomes true while in Chờ Đột Phá**: the state is
  preserved intact; only accumulation stops. When the flag clears, the character is still in
  Chờ Đột Phá and resumes normally.
- **EC — blocked flag and requirement-met become true on the same turn**: breakthrough does **not**
  fire. State and satisfied-condition are preserved; execution happens on the first turn after the
  flag clears, re-checking the predicate then.
- **EC-6 — both sides at `tier = 1`**: this is the real floor (`tier = 0` is unreachable). `tier_diff = 0`
  → `multiplier = 1`; D.2 works normally, no sentinel needed (unlike `combat_power_estimate`,
  where 0 is genuinely reachable).
- **EC-7 — no Tâm Pháp ever assigned**: `exp_multiplier = 1.0`, `SONG_TU_ACTIVE = 0`
  unconditionally. No special null handling anywhere in D.1–D.7.
- **Chờ Đột Phá information for the player**: the clamp-no-bank mechanic stays as designed and is
  explicitly **not** reversed; the mitigation is the mandatory qualitative signal of Core Rule #12.

## A7. Interfaces

### Consumes

| Source system | Field / call | Type |
|---|---|---|
| Turn Manager | `turn.is_death_turn` | bool |
| Turn Manager / Combat | `turn.in_combat` | bool |
| Combat System (out of scope, read-only) | `turn.locked_result.battle_active` | bool |
| Combat System | `turn.locked_result.outcome.winner_id` / `.loser_id` | char_id |
| Combat System | `turn.locked_result.outcome.type` | enum — **use only to detect `"no_outcome"`** |
| Combat System (constant) | `CONTENT_EXCHANGE_ESTIMATE` | int, default 30, safe range 15–50 |
| Combat System (constant, informational) | `max_invocations_per_battle = 5`, `margin_ratio` | — |
| Death & Consequence | `death_and_consequence_blocked(self)` | bool |
| Setting & Canon Integration | `breakthrough_requirement_met(tier)` | bool; missing data → hard `false` + "content gap" warning |
| NPC Affinity (out of scope) | `song_tu_relationship_active_npc_ids` | list of NPC ids |
| Character Card | `base_X0` for each of 12 stats | float |

### Emits

| Consumer | Field |
|---|---|
| Combat System | `tier(C)` (int, `1–∞`) for realm-suppression math |
| Character Card & Identity | `level`, `tier`, `exp`, `state` for the "Cấp độ - Bậc" display; plus the Chờ Đột Phá signal hook |
| Situation/Encounter Generation | `level` (raw) for `hostile_initiative_allowed` / `HOSTILE_INITIATIVE_LEVEL_GAP_MAX = 20` and `encounter_level_range` |
| Character Continuation | `level`/`exp` lazily initialised per `char_id` |
| All | `stat_value(C, X)` feeding `effective_stat` in combat |

Hard dependencies: Combat System (bidirectional), Turn Manager, Setting & Canon Integration
(without authored data, no tier breakthrough is ever possible, though within-tier levelling works),
Character Card (reverse direction). Soft: NPC Affinity, Death & Consequence, Situation Generation.

## A8. Acceptance Criteria Checklist (53 total: 52 BLOCKING + 1 ADVISORY)

Story type **Logic → BLOCKING gate**. Unit tests at `tests/unit/exp-realm-progression/`, naming
`exp_realm_progression_[feature]_test.*`, functions `test_[scenario]_[expected]`. All defaults are
fixed fixtures — no randomness. `locked_result.outcome`, `is_death_turn`, `SONG_TU_ACTIVE`,
`breakthrough_requirement_met`, `death_and_consequence_blocked`, `turn.in_combat` **must be injected
as mocks** (DI, no singletons). Plus **≥1 integration test** at
`tests/integration/exp-realm-progression/` that schema-checks the real
`battle_active` / `outcome.winner_id` / `outcome.loser_id` / `outcome.type` field names against the
actual Combat output (a real field-name drift bug — `battle_result` vs `outcome` — shipped once).

- [ ] **AC-01** `tier` for levels 1,10,11,20,21,30 → 1,1,2,2,3,3
- [ ] **AC-02** combat-win source identified via `winner_id == self`, exact `combat_win_exp`
- [ ] **AC-02b** `outcome.type == "no_outcome"` → `raw_combat = 0` explicitly, not by fallthrough
- [ ] **AC-03** combat-loss identified via `loser_id == self`, exact `combat_loss_exp`
- [ ] **AC-04** passive always added when the 3 blockers are false and `in_combat == false`
- [ ] **AC-05** Song Tu AND-logic: 3 partial combinations all yield 0
- [ ] **AC-06** `exp_multiplier = 1.2` on `raw_total = 85` → `final_gain = 102`, multiplied once on the sum
- [ ] **AC-07** L25 exp 300 + 102 → L26, surplus 62
- [ ] **AC-08** L5 exp 50 + 300 → cascades to L7, surplus 60 (2 level-ups in one turn)
- [ ] **AC-09** L20 exp 280 + 50 → Chờ Đột Phá, exp clamped at exactly 290, 40 wasted, level stays 20
- [ ] **AC-10** further passive gain while waiting leaves exp at 290, repeatable N turns, no overflow
- [ ] **AC-11** behaviour depends only on the injected `breakthrough_requirement_met` mock
      (+ CI/code-review checklist item: no hardcoded condition content such as the string "Hồn Hoàn")
- [ ] **AC-12** requirement true → L21, tier 3, exp 0, state back to normal, no carry-over
- [ ] **AC-13** HP L10/T1 = 172 → L11/T2 = 230; delta 58 = 8 growth + 50 breakthrough, no separate mechanism
- [ ] **AC-14** rollback of a normal turn restores level/tier/exp fully (no partial field)
- [ ] **AC-15** rollback of a breakthrough turn also restores the Chờ Đột Phá state
- [ ] **AC-16** `death_and_consequence_blocked` short-circuits even with a winning outcome present
- [ ] **AC-17** `level(C)` readable as raw `37` (+ checklist item: no 20-level-gap method in the public API)
- [ ] **AC-18** `exp_threshold` at 1,10,20,25 → 100,190,290,340
- [ ] **AC-19** `tier_diff=+2` → multiplier 1.5, `combat_win_exp = 102`
- [ ] **AC-20** `tier_diff=-3` and `-4` both clamp to 0.30 → 20.4, and `20.4 > 13.6`
- [ ] **AC-21** `tier_diff=8` and `10` both clamp to 3.0 → 204.0
- [ ] **AC-21b** property test over `tier_diff ∈ [-10, +10]`: never `combat_win_exp < combat_loss_exp`
- [ ] **AC-22** `combat_loss_exp = 0.04 * 340 = 13.6`
- [ ] **AC-23** Song Tu active at L25 → `0.0015 * 340 = 0.51`
- [ ] **AC-24** Song Tu inactive → exactly 0 at any level
- [ ] **AC-25** raw stat ATK = 62, never clamped
- [ ] **AC-26** % stat Crit Rate 0.282 below cap, unclamped
- [ ] **AC-27** % stat raw 5.9 clamps to exactly 0.95 (not 1.0, not 5.9)
- [ ] **AC-28** multiply-before-compare: `raw_total 40 × 2.0 = 80`, exp 130, level stays 5
- [ ] **AC-29** `final_gain = 2500` at L11 cascades L12→L19 (2160 consumed), stops at L20 in Chờ Đột Phá with exp 290, 50 wasted
- [ ] **AC-30** both global short-circuits return 0 at the very first step and D.2/D.3/D.4 are **not called** (no side effects)
- [ ] **AC-31** out-of-combat passive+Song Tu at L25: `raw_total 0.85`, `final_gain 1.02`, exp 301.02, level stays 25
- [ ] **AC-31b** on the battle-concluding turn (`battle_active=false`, `in_combat=true`, `SONG_TU_ACTIVE=1`): `raw_combat` computed normally, `raw_passive = raw_song_tu = 0` absolutely
- [ ] **AC-32** missing opponent `tier` → exact `EXP_ERROR_OPPONENT_TIER_UNDEFINED`, no silent default, no strippable assert
- [ ] **AC-33** `process_character_turn` orders breakthrough before gain; that turn's EXP applies to `exp_threshold(21)=300`, not 290
- [ ] **AC-34** breakthrough-turn undo restores progression state; **no assertion at all** about the external Hồn Hoàn resource
- [ ] **AC-35** `is_death_turn` returns 0 for the whole turn, not just `raw_combat`
- [ ] **AC-36** crippled during Chờ Đột Phá: state preserved across N turns, resumes normally
- [ ] **AC-36b** blocked + requirement-true in the same turn → no breakthrough; fires on the first turn after the flag clears
- [ ] **AC-37** both at `tier=1` → multiplier 1, no error, no "N/A" sentinel
- [ ] **AC-38** `tam_phap_id = null` → multiplier 1.0, `SONG_TU_ACTIVE = 0`, no null-check needed
- [ ] **AC-39** `self` = winning NPC with `outcome.type = "lose"` (player-relative) → still `combat_win_exp`
- [ ] **AC-40** *(ADVISORY, manual playtest)* Chờ Đột Phá survey question skews to "hồi hộp/mong chờ" over "bối rối/bế tắc"
- [ ] **AC-41** missing any of the 26 constants → fail-loud at data-load before session start
- [ ] **AC-42** `BASE_EXP_THRESHOLD = 0` → immediate error, `WHILE` loop runs **zero** iterations
- [ ] **AC-43** `in_combat = true` blocks breakthrough execution; fires on the first `in_combat = false` turn
- [ ] **AC-44** `is_death_turn = true` blocks breakthrough execution
- [ ] **AC-45** config `0.10 × 0.30 = 0.03 < 0.04` → exact `EXP_ERROR_WIN_LOSS_INVARIANT_VIOLATED` at load; current defaults pass
- [ ] **AC-46** `SONG_TU_ACTIVE(NPC_X) = 1` using the same player-side flag (symmetric to AC-05)
- [ ] **AC-47** `EXP_THRESHOLD_INCREMENT = -5` → fail-loud at data-load
- [ ] **AC-48** economic invariant validated at `CONTENT_EXCHANGE_ESTIMATE` = 15 **and** 50 (both pass); an out-of-range 60 must raise a config error
- [ ] **AC-49** lazy-init by `char_id`: a new `char_id` reads `level=1, exp=0` even after an old `char_id` was dirtied to `level=30, exp=450`; the old id still reads 30 afterwards

## A9. Open Questions / Ambiguities

1. **Weak-opponent farming is a known, deliberately unfixed risk.** Farming `tier_diff ≤ -3`
   out-earns fair fights per turn whenever the easy battle ends within
   `WIN_EXP_FLOOR_MULT × N_fair` exchanges (≈9 vs 30). The breakeven does **not** depend on
   `WIN_EXP_BASE_FRACTION` — only on `WIN_EXP_FLOOR_MULT`. The system has no way to distinguish
   "real difficulty" from "battle length". Tracked risk, revisit before Production.
2. **No cap on `exp_multiplier`.** The future Tâm Pháp system must impose one; there is no other
   safety limit on multi-level cascades in D.7.
3. **Rollback ownership of external breakthrough resources** (e.g. Hồn Hoàn) is unowned across three
   GDDs. Proposed owner: Equipment & Skill Data System.
4. **9 of 12 stats have no tuned `LEVEL_GROWTH_X` / `BREAKTHROUGH_BONUS_X`** (only HP, ATK, Crit Rate
   are exemplified). A balance pass is required before implementation.
5. **`combat_power_estimate` weights (`w_HP = 0.25` placeholder)** were never reconciled against
   D.5's actual scale (HP ~100–400 at L1–25). Owned by combat, out of scope here.
6. **The Chờ Đột Phá signal content** (wording, visuals) is unspecified; only its existence is mandated.
7. **`breakthrough_requirement` data per tier** is not authored yet.

---

# PART B — Equipment & Skill Data System

## B1. Purpose

A pure data-definition layer for every weapon, skill (tâm pháp / võ công base art), and *thức*
(a named individual move belonging to one skill) in the game, plus a separate minimal recovery-item
category. It contains **no gameplay math** — combat power and damage belong to Combat System, tier
penalties to Combat System, EXP rates to EXP & Realm Progression. It answers only "what properties
does this weapon/skill/thức have"; it never answers "how much HP does this character have right now".
Its two formulas are data-integrity validators, not balance math. Combat reads it to compute and to
pick a move for narration; Character Card reads it for display.

## B2. Core Rules (numbered, with GDD refs)

1. **(Rule #1)** Three hierarchical data tiers: **Weapon** (weapon type + concrete instance)
   → **Skill** (each skill bound to exactly 1 weapon *type*) → **Thức** (each thức belongs to exactly
   1 skill; minimum 1 thức per skill).
2. **(Rule #2)** **Skill family** — optional cosmetic grouping via `family_id` (string, optional,
   empty/null when unaffiliated) linking same-named skills across different weapon types
   (e.g. "Lưu Vân" → "Lưu Vân Kiếm Pháp" + "Lưu Vân Đao Pháp"). Each skill in a family remains a
   separate entry with its own `style_descriptor`.
3. **(Rule #3)** **Thức IDs are globally unique**, not merely unique within a skill — this is the
   foundation for Combat's "no repeated thức within one battle" runtime rule (that rule itself is
   Combat's, out of scope here).
4. **(Rule #4)** **`style_descriptor`** — a short prose description of execution style, held at the
   **Skill** level, fed into the AI narration prompt through the Mechanic/Narration Contract wrapper.
   It is style guidance, **not** locked mechanical data — therefore explicitly **outside** the scope of
   numeric leak-detection.
5. **(Rule #5)** **`tier`** (int) exists on both Weapon and Skill. This system stores the integer only;
   it does not compute cross-tier penalties (Combat) and does not define the tier semantics
   (EXP & Realm Progression — 10 levels per tier).
6. **(Rule #6)** **Ownership at Character level**: each character (player or NPC) has exactly one
   `equipped_weapon_id` plus a `known_skill_ids` list (may be empty). **No full inventory in MVP.**
   Every ownership record is **keyed by `char_id`** (the same identity Character Card uses) — not a
   single global "main character" slot. When Character Continuation issues a **new** `char_id`
   (a "play again" run), this system lazily initialises an **independent** record and never overwrites
   the old `char_id`'s record.
7. **(Rule #7)** **Static templates, not runtime state**: no current HP/EXP fields may exist anywhere
   in this dataset.
8. **(Rule #8)** **Recovery item** — a category **separate** from the weapon/skill/thức hierarchy,
   serving only the "tiên thảo dị bảo" branch of `death-and-consequence.md` D.3. Minimum schema
   `{ item_id, efficacy }` with `efficacy: float ∈ [0, 1]`, **mandatory at authoring time with no
   engine default** — an item without `efficacy` is invalid for that branch. Consumption model
   (single-use vs charges) is undecided.
9. **(Rule #9)** **Per-entry deletion-gate markers** (for Character Customization Mode, system #16).
   Written exactly once, permanent, never reset:
   - item: `was_ever_equipped: bool` (default `false`) → permanently `true` the first time the item is
     equipped. Past-perfect semantics — distinct from the *current* `equipped_weapon_id`.
   - skill: `was_ever_resolved_in_combat: bool` (default `false`) → permanently `true` the first time
     any thức of that skill is resolved by Combat in any battle. Distinct from "learned", which
     `known_skill_ids` already means.
   - **Dangling-reference rule**: when system #16 deletes a custom skill, that skill id **must** be
     removed from **every** `known_skill_ids` still referencing it, **in the same write-through
     transaction**.
   - Neither marker is a tuning knob nor a gameplay branch flag; they serve only the #16 delete gate.

## B3. State / Data Model

```ts
type WeaponType = string;          // enum content NOT yet decided for MVP (Kiếm, Đao, Quyền, ...)

interface Weapon {
  weapon_id: string;               // unique
  weapon_type: WeaponType;         // must ∈ valid_weapon_types
  tier: int;                       // >= 0, non-null (AC-05)
  // display name, description ... (presentation fields)
  was_ever_equipped: boolean;      // default false, write-once-true, permanent (Rule #9)
}

interface Skill {
  skill_id: string;                // unique; member of valid_skill_ids
  weapon_type: WeaponType;         // exactly 1, must be valid
  tier: int;                       // >= 0, non-null
  family_id: string | null;        // optional cosmetic grouping, null/"" when none
  style_descriptor: string;        // prose, narration context only
  was_ever_resolved_in_combat: boolean;  // default false, write-once-true, permanent
}

interface Thuc {                   // "move"
  thuc_id: string;                 // GLOBALLY unique across the whole dataset
  skill_id: string;                // exactly 1 parent, must exist
  display_name: string;            // NOT required to be globally unique
}

interface RecoveryItem {           // separate category, outside the 3-tier hierarchy
  item_id: string;
  efficacy: number;                // [0,1], mandatory, no default
}

interface CharacterLoadout {       // keyed by char_id
  char_id: string;
  equipped_weapon_id: string;      // exactly 1 at any time in MVP
  known_skill_ids: string[];       // may be empty; length <= max_known_skills_per_character
}
```

**Structural relations / integrity constraints**

| Relation | Cardinality | Constraint |
|---|---|---|
| Weapon type → Skill | 1–many | each skill has exactly 1 valid `weapon_type` |
| Skill → Thức | 1–many | each thức has exactly 1 parent skill; N ≥ 1 per skill |
| Family → Skill | 1–many, optional | a family may contain only 1 skill |
| Character → Weapon | 1–1 | `equipped_weapon_id` |
| Character → Skill | 1–many | `known_skill_ids` |

No orphan thức may exist; no skill may lack a valid `weapon_type`.

**Implicit basic attack ("Đánh thường")**: **not** one shared entry. There is **one separate
"Đánh thường" entry per valid `weapon_type`** (e.g. "Đánh thường - Kiếm", "Đánh thường - Đao"). Each
obeys Rule #1 normally, and each is **automatically treated as learned** for any character whose
`equipped_weapon_id` matches that `weapon_type`, regardless of `known_skill_ids`. Consequence: Combat
never encounters "0 available thức". Combat exempts basic attack entirely from
`max_invocations_per_battle` and from the no-repeat rule.

There is **no state machine** in this system.

## B4. Formulas (validation only)

**F1 — Thức pool sufficiency (authoring-time warning)**
```
is_pool_sufficient(skill) = thuc_count(skill) >= max_invocations_per_battle
```
`thuc_count ∈ [1, ∞)`. `max_invocations_per_battle` is external, owned by Combat, resolved to
**5** (`ceil(MAX_EXCHANGE_COUNT / max_known_skills_per_character)`). Uses `>=`, not `>`. Boolean
output, no clamping. A `false` result is a **content warning at authoring time**, never a runtime
block; how Combat behaves when it runs out of moves is Combat's decision.

**F2 — Global dataset integrity (blocking gate)**
```
is_valid_dataset =
      (|all_thuc_ids| == |unique(all_thuc_ids)|)
  AND (∀ thuc  : thuc.skill_id      ∈ valid_skill_ids)
  AND (∀ skill : skill.weapon_type  ∈ valid_weapon_types)
```
Run as an automated lint/test on every data addition. A `false` result **blocks the commit / CI merge**.
Same referential-integrity spirit is applied at runtime by Rule #9's dangling-reference removal.

## B5. Tuning Knobs

| Knob | Default | Safe range | Effect |
|---|---|---|---|
| `min_thuc_per_skill` | 3 | 1–10 | Minimum thức required when authoring a new skill. Too low (1–2) → easily violates `is_pool_sufficient` in long battles; too high (>6) → authoring cost per skill slows content production |
| `max_known_skills_per_character` | 6 | 3–12 | Max simultaneously known skills. Too low → character feels monotonous; too high (>12) → doesn't fit the Character Card on mobile, and the AI struggles to pick a contextually appropriate skill |

Note: `max_known_skills_per_character` is also an input to Combat's derivation of
`max_invocations_per_battle`, so changing it changes F1's threshold.

## B6. Edge Cases (resolved)

- **`is_pool_sufficient == false`** → authoring-stage content warning only. Does **not** block the
  build and is **not** a runtime error.
- **`known_skill_ids` is empty** (new NPC, early-game player) → **valid**. The character always has the
  implicit basic-attack entry matching the current weapon's `weapon_type`. Combat is guaranteed ≥1
  usable move.
- **`equipped_weapon_id`'s `weapon_type` matches no skill in `known_skill_ids`** (switched weapons
  before learning matching arts) → **valid data state, not an error**. The character can only use the
  matching basic attack until a compatible skill is learned. Normal unlock progression; no blocking
  validation.
- **Two different skills give two thức the same display name** (two sects both naming a move
  "Nhất Thức") → **allowed**. Only IDs must be unique, never display names.
- **Weapon `tier` ≠ Skill `tier`** (tier-2 weapon with a tier-4 art) → **allowed at the data layer**.
  It is valid input to Combat's cross-tier penalty formula; that system handles the consequence.
- **`is_valid_dataset == false`** (duplicate ID, or a dangling `skill_id` / `weapon_type`) → **hard
  block**. This is the only blocking case; it is caught at authoring/CI, never treated as a valid
  gameplay state.

## B7. Interfaces

**Upstream dependencies: none.** This is a Foundation system with zero dependencies.

### Emits (downstream consumers)

| Consumer | Fields read |
|---|---|
| Combat System (out of scope) | `weapon.tier`, `skill.tier`, `skill.style_descriptor`, the thức list with globally-unique `thuc_id`; `is_pool_sufficient` as a QA signal when authoring new skills. Combat implements the no-repeat-thức rule on top of these stable IDs and supplies `max_invocations_per_battle = 5` |
| Character Card & Identity | `equipped_weapon_id`, `known_skill_ids` (per `char_id`) for display |
| Mechanic/Narration Contract Enforcement | `style_descriptor` as prompt **context**, explicitly **not** `locked_result` and therefore outside numeric leak-detection |
| Death & Consequence | `efficacy` on the recovery-item schema, for `recovery_attempt` D.3's herb branch (soft dependency, bypasses the 3-tier hierarchy) |
| EXP & Realm Progression | semantic reconciliation of `tier` only (10 levels per tier) — **not** a hard dependency edge |
| Character Customization Mode (#16) | `was_ever_equipped`, `was_ever_resolved_in_combat` for its D.5 delete gate; issues skill-deletion transactions that must scrub `known_skill_ids` |
| Character Continuation | lazy-init of a loadout record on first read of a new `char_id` |

## B8. Acceptance Criteria Checklist (18)

- [ ] **AC-01** (R1) every thức resolves to exactly one existing parent skill (not 0, not >1)
- [ ] **AC-02** (R2) skills in a family with ≥2 members each retain their own `style_descriptor`
- [ ] **AC-03** (R3) no two thức share an id **globally**
- [ ] **AC-04** (R4) `style_descriptor` is style prose, not locked numeric data
- [ ] **AC-05** (R5) weapon and skill `tier` are both valid integers — non-null, non-negative
- [ ] **AC-06** (R6) each character has exactly 1 `equipped_weapon_id` and 1 `known_skill_ids` list (possibly empty)
- [ ] **AC-07** (R7) no HP/EXP runtime field exists anywhere in the Weapon/Skill/Thức schema
- [ ] **AC-08** no orphan thức — every `skill_id` resolves against `valid_skill_ids`
- [ ] **AC-09** every skill's `weapon_type` resolves against `valid_weapon_types`
- [ ] **AC-10** (F1 false) `thuc_count = 3`, `max_invocations_per_battle = 5` → `false`; warning only, build not blocked
- [ ] **AC-11** (F1 boundary) `thuc_count == 5` → `true` (`>=`, not `>`)
- [ ] **AC-12** (F2) a duplicated `thuc_id` → `is_valid_dataset = false` and the CI/authoring pipeline blocks the commit
- [ ] **AC-13** empty `known_skill_ids` → still ≥1 usable skill via the implicit basic attack, no error
- [ ] **AC-14** `equipped_weapon_id` matching no known skill → still valid (basic attack only)
- [ ] **AC-15** two thức with different ids but identical display names → not flagged
- [ ] **AC-16** weapon `tier` ≠ skill `tier` → not blocked at the data layer
- [ ] **AC-17** (= AC-12) Formula-2 violation blocks merge in CI/authoring lint
- [ ] **AC-18** *(cross-system, unit, provisional-interface)* lazy-init by `char_id`: after dirtying an
      old `char_id` to `equipped_weapon_id = "thiet_kiem_hoen_ri"`,
      `known_skill_ids = ["luu_van_kiem_phap_tam"]`, a brand-new `char_id`'s first read returns the
      **standard MVP starting loadout**, not the dirtied values; re-reading the old `char_id`
      afterwards still returns the dirtied values (proves keyed-by-`char_id` storage)

## B9. Open Questions / Ambiguities

1. **The MVP `weapon_type` list is not decided** (Kiếm, Đao, Quyền, …). Must be enumerated before
   authoring real content for 1 player character + 3 NPCs. *(Owner: game-designer)*
2. **Canonical "Đánh thường" entries per `weapon_type` are only structurally decided.** Display name,
   `style_descriptor`, and thức count per entry are still unspecified. *(Owner: game-designer)*
3. **Recovery-item consumption model** (single-use vs charges) is undecided — deferred to
   `death-and-consequence.md`'s open questions.
4. **Whether thức need further metadata** (element, animation tag) — current schema is
   name + `style_descriptor` + tier, deemed sufficient for MVP, possibly insufficient at Vertical Slice.
5. **Proposed but unaccepted ownership**: EXP & Realm Progression proposes this system as the owner of
   *rollback for external resources consumed on breakthrough* (e.g. Hồn Hoàn), as a natural extension
   of open question 3. This system does not currently mention such a resource at all. **Unowned gap.**
6. `tier` scale reconciliation with EXP & Realm Progression was listed as open in this GDD but is
   in fact satisfied: EXP defines `tier = floor((level-1)/10)+1`, i.e. 10 levels per tier, and never
   returns 0 for a valid character. Weapon/skill `tier`, however, is an independent authored integer
   with no stated upper bound and is permitted to be non-null but is only constrained to be
   non-negative by AC-05 — so a weapon `tier = 0` is schema-legal while a character `tier = 0` is not.
   **Flag this asymmetry to the implementer.**
