# Implementation Contract — GDD Group 3

Systems covered: **NPC Affinity & Relationship** (`design/gdd/npc-affinity-relationship.md`, Approved),
**Death & Consequence** (`design/gdd/death-and-consequence.md`, Approved),
**Character Continuation** (`design/gdd/character-continuation.md`, Approved).

**Scope exclusions applied throughout:**
1. **Song Tu (dual cultivation) is OUT OF SCOPE.** The shipped game already implements Song Tu
   (gate `affinity >= 80`, effect `+10` affinity, grants "Đạo Lữ" title) and that implementation is kept
   unchanged. The GDD's own Song Tu rules (threshold +60, random +1..10, `SONG_TU_COOLDOWN_TURNS`,
   5-state machine, D.2–D.4 exemption) are **not** to be implemented. Every place another rule reads
   Song Tu state is flagged below as **[SONG-TU-ADAPT]** so it can be re-pointed at the existing
   implementation's own flags.
2. **Combat System is out of scope.** Only the interface field names it must produce are recorded.

**Combat hand-off interface consumed by both Affinity and Death (exact shapes):**

```
handoff = {
  battle_active: bool,                       // resolve only on the false edge
  is_spar_friendly: bool,
  outcome: { type: "win"|"lose"|"no_outcome", winner_id: char_id, loser_id: char_id },
  per_actor: { [actor_id]: { hp_after: int, ... } }   // hp_after is NESTED, never top-level
}
max_HP(char_id): int                          // NOT in the hand-off — comes from Character Card & Identity
margin_ratio(winner_id) = float(per_actor[winner_id].hp_after) / max(max_HP(winner_id), 1)
```

`float()` cast before division is **mandatory** (int/int truncation bug class, already hit twice in this repo).
`max(...,1)` denominator floor is **mandatory** (no divide-by-zero on corrupt `max_HP=0`).
Combat also consumes `death_and_consequence_blocked(C)` back from Death & Consequence for its
`crippled_layer(C) = CRIPPLED_PENALTY_MULT` (default `0.85`, floored by Combat's existing `FLOOR_TOTAL`).

---

# 1. NPC Affinity & Relationship

## 1.1 Purpose

Sole owner ("single source of truth") of every important NPC's **Hảo cảm** (affinity) toward the player
character — one integer per NPC on the scale `[-100, +100]` — plus the relations derived from it:
the 7 attitude bands shown on the Character Card, the deep-hostility flag `affinity <= -80` that Death &
Consequence reads to decide whether a lost battle can kill, and one-hop social propagation through a static
`link_strength` graph so that harming one NPC damages your standing with everyone connected to the victim
(when the perpetrator is known). It never interprets free-form player actions: it maps an already-classified
event to a delta with a pure lookup table plus three dampening rules (diminishing returns, repetition
fatigue, per-turn positive cap), locks the integer deltas into `locked_result` **before** the AI narrates,
and never lets narration write back into the numbers.

## 1.2 Core Rules (§ Detailed Design → Core Rules, lines 101–212)

1. **Data sovereignty** (CR#1, L103): integer `affinity ∈ [-100,+100]`, exactly one value per tracked NPC,
   initial value from NPC content data. MVP seed = 3 NPCs: one hostile, one preset ≥ +60, one neutral.
2. **Deltas only from classified events** (CR#2, L109): two sources — (a) hard mechanical events
   (Combat hand-off, kill from Death & Consequence); (b) classified social events from
   Situation/Encounter Generation. **Zero AI calls** anywhere in this pipeline (asserted by AC-02).
3. **Diminishing, never decaying** (CR#3, L120): positive deltas shrink near +100 (D.2) and shrink further
   on repetition (D.3); positive total per NPC per turn is capped (D.4). **No time/turn decay whatsoever.**
   **Negative deltas are never diminished, never fatigued, never capped** — losing favour is always cheaper
   than gaining it.
4. **Propagation requires a known perpetrator** (CR#4, L128): static `link_strength ∈ [-1.0,+1.0]` per NPC
   pair. Propagate only when `severity >= PROPAGATION_SEVERITY_MIN` **and** `perpetrator_known`. A kill with
   zero witnesses produces **zero** affinity fields ("perfect crime" is an intentional, valid strategy);
   the world still records the death via Death & Consequence's own fields.
5. **Deep hostility is inclusive** (CR#5, L144): `deep_hostile(npc) ⇔ affinity(npc) <= -80`. Owned here;
   consumers must not re-derive the threshold.
6. **[SONG-TU-ADAPT]** CR#6 (L148) and CR#7 (L181) define the GDD's Song Tu action, cooldown, 5-state
   machine, and the exported list `song_tu_relationship_active_npc_ids`. **Not implemented.** Only two
   couplings survive and must be re-pointed at the existing Song Tu implementation:
   (a) when an NPC dies, its Song Tu relationship terminates permanently (`Ended`, terminal — climbing
   affinity back does not revive it, AC-25); (b) EXP's bonus is a boolean AND with cultivation-method data
   and **never scales with the number of partners** (anti-harem-farming, AC-34).
7. **Turn lifecycle compliance** (CR#8, L200): all deltas (direct + propagated) are computed and locked
   during Resolving into `locked_result` as fields `affinity_delta_[npc_id]` (integers). One event may write
   **many** fields in one `locked_result` — exactly one field per affected NPC. Undo rolls back everything.
8. **Clamp before lock** (CR#9, L208): clamp to `[-100,+100]` before writing; `locked_result` may never carry
   an out-of-range value, even through a multi-NPC propagation chain.

## 1.3 State / Data Model

| Field | Type | Initial | Notes |
|---|---|---|---|
| `affinity[npc_id]` | int | from NPC data; `0` if no authored preset (AC-30) | range `[-100,+100]`, single source |
| `attitude_band[npc_id]` | derived enum | — | pure view, never stored |
| `streak[npc_id][event_type]` | `{ last_event_turn: int, streak: int }` | absent = `streak_before 0` | D.3 sliding window |
| `link_strength[a][b]` | float `[-1.0,+1.0]` | content-authored, static | negative = `b` hates `a` |
| `alive[npc_id]` | bool | owned by Death & Consequence | dead NPCs are skipped by propagation |
| `deep_hostile(npc)` | derived bool | — | `affinity <= -80`, live-derived each read |
| `song_tu_*` | — | — | **[SONG-TU-ADAPT]** — use the existing implementation's state |

**Attitude bands** (§ States and Transitions, L217–228) — pure view derived from affinity, no transitions
to manage:

| Band | Interval |
|---|---|
| Thù địch sâu sắc | `[-100, -80]` |
| Thù địch | `(-80, -40]` |
| Lạnh nhạt | `(-40, -10]` |
| Trung lập | `(-10, +10)` |
| Thiện cảm | `[+10, +40)` |
| Thân thiết | `[+40, +80)` |
| Tri kỷ | `[+80, +100]` |

The AI receives **the band name plus a direction of change** ("Lạnh nhạt, xấu đi") — never the raw number,
never the delta (Contract Enforcement CR#4; asserted by AC-37b).

MVP seed fixture (AC-01): `npc_thu_dich = -85`, `npc_hao_cam = +60`, `npc_trung_lap = 0`.

## 1.4 Formulas

**Shared conventions** (§ Formulas preamble, L294–305):
- `severity ∈ {0..5}` integer. `0` = positive event (no victim, never propagates). `1..5` = negative,
  increasing gravity.
- `perpetrator_known = (|witnesses(scene)| >= 1) OR (victim_alive == true)`, where
  `witnesses(scene) = entities_in_scope \ {target}`. Any non-kill event ⇒ the living victim knows the
  perpetrator ⇒ always `true`. Only kills depend on witnesses.
- **Rounding**: all intermediates stay float; round exactly **once**, at D.6 step B3, per NPC, after summing,
  before clamping, using **round-half-away-from-zero** (`-10.5 → -11`, `+0.5 → +1`).

### D.1 — event → base_delta table (L307–341, IN FULL)

| `event_type` | Source | `base_delta` | `severity` | Subject to D.2/D.3/D.4? |
|---|---|---|---|---|
| `gift` | Situation Gen | `+GIFT_DELTA` = **+5** | 0 | yes (positive) |
| `small_help` | Situation Gen | `+SMALL_HELP_DELTA` = **+3** | 0 | yes |
| `save_life` | Situation Gen / Combat | `+SAVE_LIFE_DELTA` = **+15** | 0 | yes |
| `combat_win_vs_npc` | Combat `outcome=win` | `-(COMBAT_WIN_BASE + COMBAT_WIN_MARGIN_SCALE × margin_ratio)` = **-5 → -15** | `2`; raised to `3` if `margin_ratio >= SEVERE_WIN_MARGIN_THRESHOLD` | no (negative) |
| `combat_loss_vs_npc` | Combat `outcome=lose` | `LOSS_VS_NPC_DELTA` = **-3** | 1 | no |
| `insult` | Situation Gen; **or** Death & Consequence Branch B "Tha mạng" with tier=medium | `-INSULT_DELTA` = **-8** | 2 | no |
| `threaten` | Situation Gen | `-THREATEN_DELTA` = **-12** | 3 | no |
| `betray` | Situation Gen | `-BETRAY_DELTA` = **-30** | 4 | no |
| `kill_witnessed` | Death & Consequence hand-off | `-KILL_WITNESS_DELTA` = **-25 per witness** (the victim is dead — no affinity to adjust) | 5 | no |
| `song_tu_action` | — | **[SONG-TU-ADAPT]** — not implemented | n/a | GDD said fully exempt |

Combat-win sub-formula:
```
margin_ratio           = float(per_actor[winner_id].hp_after) / max(max_HP(winner_id), 1)
combat_win_vs_npc_delta = -(COMBAT_WIN_BASE + COMBAT_WIN_MARGIN_SCALE * margin_ratio)
severity                = (margin_ratio >= SEVERE_WIN_MARGIN_THRESHOLD) ? 3 : 2
```
Output range of `base_delta`: `[-30, +15]` — intentionally asymmetric.
`spar_friendly` differentiation is an MVP scope-cut (deferred to Situation Gen).

**Pacing reality check** (L358): `0 → +60` needs roughly **25–30** positive actions ≈ 6–8 focused sessions
(only `gift`/`small_help`/`save_life` exist at MVP, and `save_life` is situational). `0 → -80` needs only
2–3 severe acts; a single extreme witnessed act can drop neutral to -80 in one turn. This is intended.

### D.2 — Diminishing returns (positive deltas only, L377–399)

```
diminish_factor(A) = clamp(1 - (max(0, A)/100)^DIMINISH_EXPONENT * (1 - DIMINISH_FLOOR),
                           DIMINISH_FLOOR, 1)
effective_delta    = base_delta * diminish_factor(A_before)     // only when base_delta > 0
```
`A <= 0 ⇒ factor = 1` (recovering from negative affinity is never penalised).
`DIMINISH_FLOOR` must never be `0` (there is always room to improve, even at +99).
Anchors (`EXP=3, FLOOR=0.1`): `A=0` gift → `+5.0`; `A=60` save_life → `+12.09`; `A=95` gift → `+1.14`;
`A=-50` small_help → `+3.0`.

### D.3 — Repetition fatigue, sliding window (L401–456)

```
fatigue_factor(streak_before) = clamp(1 - FATIGUE_RATE * streak_before, FATIGUE_FLOOR, 1)
effective_delta' = effective_delta * fatigue_factor            // only when base_delta > 0
```
Tracker key is the **pair** `(npc_id, event_type)`. On an event at turn `T`:
```
if T - last_event_turn <= FATIGUE_WINDOW_TURNS: streak_before = streak; streak += 1
else:                                            streak_before = 0;      streak = 1
last_event_turn = T
```
Alternating NPCs or event types is deliberate diversification and is **not** penalised (independent streaks).
Never applied to propagated deltas (D.5).

**Mandatory cross-GDD invariant**: `FATIGUE_WINDOW_TURNS >= POSITIVE_SOCIAL_COOLDOWN_TURNS`
(Situation Gen D.1, default 4). Violating it makes D.3 dead code for every legitimate menu-driven play path.
Enforced as a static config assertion (AC-16b).

Anchors (`RATE=0.15, FLOOR=0.25, WINDOW=5`): `small_help` on turns 10..15 → `+3, +2.55, +2.10, +1.65,
+1.20, +0.75`; resume at turn 21 (gap 6 > 5) → full `+3`. Menu cadence every 4 turns (10,14,18,22) →
`+3, +2.55, +2.10, +1.65` (streak does **not** reset).

### D.4 — Per-turn positive cap (L458–476)

```
capped_positive_total(npc) = min(sum(positive contributions to npc this turn, post D.2/D.3),
                                 CAP_POSITIVE_PER_TURN)
```
**Never applied to negative totals.** Normal flow (one event/turn, max +15) rarely touches the cap; this is a
safety net for "positive propagation stacked on a direct positive" only.

### D.5 — Propagation (one-hop, witness-gated, L478–529)

```
IF severity(event) >= PROPAGATION_SEVERITY_MIN
   AND perpetrator_known(event)
   AND (event.type == kill_witnessed OR A_before(victim) > -100):     // saturation gate
  FOR npc IN linked_npcs(victim) \ witnesses \ {victim}:
     raw_prop       = base_delta(event) * PROPAGATION_RATE * link_strength(victim, npc)
     prop_effective = raw_prop * (raw_prop > 0 ? diminish_factor(A_before(npc)) : 1)   // NO D.3
     total_from_event(npc) = prop_effective + CRUELTY_REP_DELTA
  FOR npc IN witnesses:                       // currently only kill_witnessed has multiple witnesses
     total_from_event(npc) = base_delta(event) + CRUELTY_REP_DELTA    // negative, no D.2/D.3
ELSE:
  direct delta only (D.1). Anonymous perpetrator = valid strategy.
```
**Hard rules**: no second-hop propagation, ever — only `link_strength(victim, npc)` is read, never the
result for an NPC who just received propagation. Each NPC clamps independently against **its own**
`A_before`, so no chained-clamp risk exists. The sign of `raw_prop` **flips** when `link_strength < 0`
(the victim's enemies are pleased) — intended, not a bug.
Saturation gate rationale: a living victim already at `-100` yields `locked_delta = 0` for the direct hit,
so propagation must also stop, otherwise repeating `threaten` on a saturated victim farms free positive
affinity from that victim's enemies forever, exempt from fatigue (AC-19b). Kills are exempt from this gate
because an NPC can only die once.

Worked anchor (kill NPC_B; witness A; C is B's friend `link=+0.7`, absent; D is B's enemy `link=-0.6`,
`A_before(D)=20`; `RATE=0.5, CRUELTY=-2`): A = `-25 + (-2) = -27`; C = `-25×0.5×0.7 = -8.75`, `-2` →
`-10.75` → round `-11`; D = `-25×0.5×(-0.6) = +7.5`, diminished ×0.993 ≈ `7.45`, `-2` → `5.45` → round `+5`.

### D.6 — Per-turn pipeline (L531–591)

```
resolve_turn_affinity(turn):
  event = classified_event(turn)              // 0 or 1 event per turn (1 turn = 1 action)
  IF event == null: RETURN {}

  contributions = {}                          // npc_id -> list[float]

  // B1 — direct delta
  IF event.type == kill_witnessed:
     IF |witnesses(scene)| == 0: RETURN {}     // perfect crime: zero fields
     FOR w IN witnesses(scene):
        contributions[w] += base_delta(event) + CRUELTY_REP_DELTA     // witnesses get cruelty too
  ELSE IF event.type == song_tu_action:
     [SONG-TU-ADAPT] — explicit guard, fully exempt from D.2/D.3. Not implemented here.
  ELSE:
     raw = base_delta(event, context)
     IF raw > 0:
        raw *= diminish_factor(A_before(target)) * fatigue_factor(streak_before(target, event.type))
     contributions[target] += raw

  // B2 — propagation
  IF base_delta(event) < 0 AND severity >= PROPAGATION_SEVERITY_MIN AND perpetrator_known
     AND (event.type == kill_witnessed OR A_before(target) > -100):
     victim = (event.type == kill_witnessed) ? event.victim_id : target
     FOR npc IN linked_npcs(victim) \ witnesses(scene) \ {victim}:
        contributions[npc] += D5_total(event, victim, npc)      // already includes cruelty component

  // B3 — per-NPC cap / round / clamp
  result = {}
  FOR (npc_id, deltas) IN contributions:
     total         = sum(deltas)
     final_raw     = min(max(0, total), CAP_POSITIVE_PER_TURN) + min(0, total)   // cap positive part only
     final_rounded = round_half_away_from_zero(final_raw)
     A_after       = clamp(A_before(npc_id) + final_rounded, -100, 100)
     locked_delta  = A_after - A_before(npc_id)                  // the value actually written
     IF locked_delta != 0:
        result["affinity_delta_" + npc_id] = locked_delta

  update_streak_trackers(event)               // runs even when locked_delta == 0
  RETURN result
```
Band/flag re-evaluation (deep hostility, and **[SONG-TU-ADAPT]** any Song Tu gating) happens **after** B3,
within the same turn, reading `A_after` (e.g. `A_before=58, +2 → 60` flips gates in that same turn).
Fixed regression fixture (AC-20): `A_before A=10, C=40, D=20` →
`locked_result = {affinity_delta_A: -27, affinity_delta_C: -11, affinity_delta_D: +5}` →
`A_after: A=-17, C=29, D=25`.

## 1.5 Tuning Knobs (§ Tuning Knobs, L720–749)

| Knob | Default | Safe range |
|---|---|---|
| `GIFT_DELTA` | +5 | 2–10 |
| `SMALL_HELP_DELTA` | +3 | 1–6 |
| `SAVE_LIFE_DELTA` | +15 | 8–25 |
| `LOSS_VS_NPC_DELTA` | -3 | -6…0 |
| `COMBAT_WIN_BASE` | 5 | 2–10 |
| `COMBAT_WIN_MARGIN_SCALE` | 10 | 0–15 |
| `SEVERE_WIN_MARGIN_THRESHOLD` | 0.7 | 0.6–0.85 |
| `INSULT_DELTA` | -8 | -15…-3 |
| `THREATEN_DELTA` | -12 | -20…-6 |
| `BETRAY_DELTA` | -30 | -45…-15 |
| `KILL_WITNESS_DELTA` | -25 | -40…-15 |
| `DIMINISH_EXPONENT` | 3 | 2–5 |
| `DIMINISH_FLOOR` | 0.1 | 0.05–0.3 (**never 0**) |
| `FATIGUE_RATE` | 0.15 | 0.05–0.3 |
| `FATIGUE_FLOOR` | 0.25 | 0.1–0.5 |
| `FATIGUE_WINDOW_TURNS` | 5 | 3–8 (**must be ≥ `POSITIVE_SOCIAL_COOLDOWN_TURNS`**) |
| `CAP_POSITIVE_PER_TURN` | 20 | 15–25 |
| `PROPAGATION_RATE` | 0.5 | 0.3–0.7 (always < 1) |
| `CRUELTY_REP_DELTA` | -2 | -5…-1 |
| `PROPAGATION_SEVERITY_MIN` | 3 | 2–4 |
| `SONG_TU_COOLDOWN_TURNS` | 5 | 3–8 — **[SONG-TU-ADAPT]**, not implemented |

**Not knobs** (locked design constants, other systems depend on the exact values): deep-hostility `-80`,
the `[-100,+100]` scale, and (in the GDD) `SONG_TU_THRESHOLD=60`, `SONG_TU_BREAK_THRESHOLD=40`,
random range 1–10. `link_strength` is per-NPC **content data**, not a global knob.

## 1.6 Edge Cases Resolved (§ Edge Cases, L621–696)

- **Undo** rolls back everything the turn touched: all affinity values (including propagated),
  streak trackers to their pre-turn values, and any Song Tu state/cooldown established that turn.
- **Saturated victim (-100, alive)**: no direct field, and **no propagation at all** that turn. Input is not
  blocked; the turn is simply mechanically inert.
- **Kill with zero witnesses**: `{}` — no field for anyone, no cruelty reputation. Intentional.
- **NPC dies while Song Tu active**: state → `Ended` (terminal); regaining `>= +60` later does **not** leave
  `Ended`. **[SONG-TU-ADAPT]**.
- **Linked NPC already dead**: skipped entirely; its World Memory history is untouched.
- **Threshold exactness**: `+60` shows the Song Tu button (inclusive); `+40` does **not** yet break the
  relationship (breaks at `< +40`, i.e. `<= +39`); `-80` **is** deep hostility.
- **Clamp overshoot**: at `A_before=95` a `+8` propagation locks `+5`, not `+8`; no knock-on effect.
- **New/untracked NPC**: initialise from authored preset if it exists, else `0`, then apply the delta
  normally. `0` is the *no-preset* fallback, **not** a floor overriding setting-pack presets (AC-30).
- **Combat opponent is not a tracked NPC** (beast/monster): hand-off is accepted, no affinity event is
  generated, `{}` returned. Not an error.
- **Positive action while deeply hostile**: fully valid and **undiminished** (factor = 1 when `A <= 0`);
  the deep-hostility flag clears the moment `A_after >= -79`.
- **Multiple contributions to the same NPC in one turn** (witness delta + cruelty): summed inside
  `contributions[npc_id]` before cap/round/clamp — exactly **one** field per NPC per turn, never two.
- **Situation Gen absent** (early MVP): the hard mechanical event subset still works standalone.

## 1.7 Interfaces

**Emits**
- `locked_result["affinity_delta_" + npc_id] : int` — one per affected NPC, only when non-zero
  (World Memory's `has_signal` convention; each non-zero field becomes one fact with `entity_id` parsed
  from the field name).
- `deep_hostile(npc_id) : bool` — derived, read by Death & Consequence.
- `attitude_band(npc_id) + change_direction` — to Contract Enforcement / narration payload only.
- `song_tu_relationship_active_npc_ids : npc_id[]` — **[SONG-TU-ADAPT]**; consumers must derive their own
  boolean from "non-empty", and must never scale a bonus by list length.

**Consumes**
- Combat: `outcome.type`, `outcome.winner_id`, `outcome.loser_id`, `per_actor[id].hp_after`,
  `battle_active`, `is_spar_friendly`.
- Character Card & Identity: `max_HP(char_id)` (must be `> 0`).
- Death & Consequence: `kill_witnessed{victim_id, witnesses[]}`, `alive(npc_id)`, and
  `classified_event{type:"insult", victim, witnesses}` from Branch B "Tha mạng" tier=medium.
- Situation Gen: `classified_event{type, target, context}` and `entities_in_scope` (witness list).
- Turn Manager: turn confirm / undo signals, `current_turn`.
- Persistence serialises: affinity table, streak trackers, Song Tu active set + `last_song_tu_turn`,
  `link_strength` graph — inside `turn_snapshot`.

## 1.8 Acceptance Criteria Checklist

- [ ] **AC-01** MVP seed loads exactly; single value per NPC, no second copy.
- [ ] **AC-02** `event=null` → `{}`; AI-call spy count = 0 across D.1→D.6.
- [ ] **AC-03** No decay: +50 unchanged after 100 empty turns.
- [ ] **AC-04** Negative deltas never diminished/fatigued (`A=+90`, repeated `insult` = -8 each time).
- [ ] **AC-05** Propagation needs `severity >= 3` **and** `perpetrator_known` (insult no, threaten yes).
- [ ] **AC-06** Deep hostility at -79/-80/-81/-100 → false/true/true/true.
- [ ] **AC-07 / AC-07b / AC-08** Song Tu effect, cooldown, 5-state machine — **[SONG-TU-ADAPT]**, superseded.
- [ ] **AC-09** Song Tu interface returns an **ID list**, never a boolean or per-NPC bonus (anti-harem).
- [ ] **AC-10** Propagation touching 3 NPCs → 3 fields in **one** `locked_result`, all integers.
- [ ] **AC-11** Property-based, 1000 seeded combos: `A_before + locked_delta ∈ [-100,+100]` always.
- [ ] **AC-12** D.1 lookup table exact (note `combat_loss_vs_npc = -3`, negative).
- [ ] **AC-13** `margin_ratio` 0/0.3/0.69/0.7/1.0 → delta -5/-8/-11.9/-12/-15; severity 2/2/2/**3**/**3**.
- [ ] **AC-13b** Pass raw ints `hp_after=50, max_HP=100` → must compute `0.5`, not `0` (float-cast regression).
- [ ] **AC-14** `perpetrator_known` truth table: living victim true; kill w/ 1 witness true; kill w/ 0 false.
- [ ] **AC-15** D.2 anchors +5.0 / +12.09 / +1.14 / +3.0; `diminish_factor >= 0.1 > 0` for all `A`.
- [ ] **AC-16 / AC-16a** D.3 anchors for consecutive turns and for the 4-turn menu cadence.
- [ ] **AC-16b** Static config assertion `FATIGUE_WINDOW_TURNS >= POSITIVE_SOCIAL_COOLDOWN_TURNS`.
- [ ] **AC-17** D.4 caps positives (`min(21,20)=20`) but never negatives (`-27` stays `-27`).
- [ ] **AC-18** D.5 anchors incl. sign inversion for `link_strength < 0`.
- [ ] **AC-19** One-hop only, witnesses excluded from the linked loop (no double count), independent clamps.
- [ ] **AC-19b** Saturated-victim exploit closed: repeated `threaten` on `affinity=-100` writes **no** fields.
- [ ] **AC-20** Fixed regression fixture (3 fields, one `locked_result`).
- [ ] **AC-21** Round-half-away-from-zero, exactly once, per NPC, after summing, before clamping.
- [ ] **AC-22** `event=null` → `{}`; zero delta → no field **but** streak still increments.
- [ ] **AC-23** Undo restores affinity + streaks + Song Tu state atomically.
- [ ] **AC-24** Witness-less kill → zero fields.
- [ ] **AC-25** Dead NPC's Song Tu → `Ended`, terminal even if affinity climbs back.
- [ ] **AC-26** Boundaries 60/40/-80 and same-turn ordering (resolve first, gate checks after).
- [ ] **AC-27** Clamp cases at ±100, incl. partial propagation delta.
- [ ] **AC-28** Song Tu RNG re-rolls after undo-redo — **[SONG-TU-ADAPT]**.
- [ ] **AC-29** Song Tu EXP bonus starts the **next** turn (start-of-turn evaluation).
- [ ] **AC-30** No-preset NPC initialises to `0` then applies delta; presets still win on replay reset.
- [ ] **AC-31** Untracked combat opponent → `{}`, no error.
- [ ] **AC-32** Dead linked NPC skipped.
- [ ] **AC-33** Redemption from -80 with full `+15`, flag clears at `>= -79`.
- [ ] **AC-34** EXP bonus identical for 1 vs 3 partners; no API returning a per-NPC bonus.
- [ ] **AC-35** Deep-hostility flag exposed as derived value; consumers never re-derive `-80`.
- [ ] **AC-36** World Memory extracts exactly 3 facts from the AC-20 fixture; `entity_id` parses from field name.
- [ ] **AC-37** Locked before narration; prompt carries band + direction only; corrupted narration text cannot
      change any number.
- [ ] **AC-38** *(ADVISORY, manual)* narration tone matches band — ≥3 samples/band, 2 raters, ≥90% consistent.
- [ ] **AC-39** Container rebind: after "Chơi lại" creates slot B, reading `affinity(npc_A)` returns the slot-B
      default, not the `+42` left in slot A; reopening slot A read-only still returns `+42`.

## 1.9 Open Questions

- Formal social-event taxonomy + `spar_friendly` flag are owned by Situation Gen.
- "No positive social event on demand every turn" is a constraint Situation Gen must keep honouring.
- `round-half-away-from-zero` needs project-wide standardisation in `coding-standards.md`
  (owner: technical-director).
- `link_strength` values and starting affinities for the 3 MVP NPCs are unwritten content.
- Free-kill without witnesses: **closed**, accepted as designed.

---

# 2. Death & Consequence

## 2.1 Purpose

Sole owner of what happens **after** a battle ends: on a player loss it reads the opponent's deep-hostility
flag and either kills the player permanently (unrecoverable, no exceptions, not even by AI) or locks one of
four non-lethal consequences (severe injury / public humiliation / forced poison / crippled dantian);
on a player win it opens a one-turn `Pending Fate` window in which the player may execute or spare the
defeated NPC. It is also the exclusive owner of `alive(X)` and `death_flag_[char_id]` for **every**
character (player and NPC), of `is_death_turn` (which permanently disables Undo), of
`death_and_consequence_blocked` (the crippled flag that gates EXP and feeds Combat's `crippled_layer`),
and it triggers Persistence "Khóa slot" the instant a true death is confirmed.

## 2.2 Core Rules (§ Core Rules, lines 51–251)

1. **Activation scope** (CR#1, L53): resolve **only** when Combat emits `battle_active=false` **AND**
   `outcome.type ∈ {win, lose}` **AND** `is_spar_friendly == false` **AND** one side is the player.
   `no_outcome` never resolves. A friendly spar never resolves **even if it produced win/lose**.
   NPC-vs-NPC combat is out of MVP scope.
2. **Turn ordering** (CR#2, L69): Combat → **Death & Consequence** → NPC Affinity (so `kill_witnessed` is
   ready for `resolve_turn_affinity` in the same turn) → Setting & Canon → `resolve_turn_exp`.
3. **Branch A — player loses** (CR#3, L74):
   a. Read `affinity(opponent)` as of the **start of turn** (before this turn's affinity deltas apply).
   b. Untracked opponent ⇒ treat as `affinity = 0` (never deep-hostile).
   c. If `affinity(opponent) <= deep_hostility_threshold` (`-80`, inclusive) → run **D.1 death_roll**.
      - death ⇒ lock `alive(player)=false`, `death_flag_player=true`, `turn.is_death_turn=true`,
        **call Persistence "Khóa slot" immediately** (before handing off), then hand `death_confirmed`
        to Character Continuation. **Skip step d entirely.**
      - survived ⇒ set the local flag `forced_severe=true`, continue to step d.
      - `forced_severe` defaults `false` and is **reset to false at the start of every Branch A run**,
        before step c can set it. It is a local variable scoped to exactly one resolve — never a persisted
        field (AC-42).
   d. Run **D.2 severity_tier** on `margin_ratio`. If `forced_severe` → hard-force `"severe"`, bypassing the
      margin table. If the tier is `severe`, lock `death_and_consequence_blocked(loser) = true`.
      When (and only when) `forced_severe=true`, also emit `forced_severe_margin_ratio = margin_ratio`
      (the **original** pre-forcing value) as part of `locked_result`, for narration context only —
      it must not feed D.3, EXP, or any other formula. The field is **absent** (not `null`, not `0`) in
      normal severe cases (AC-50).
4. **Branch B — player wins** (CR#4, L142): the defeated opponent enters `pending_fate(npc_id)` for exactly
   one following turn. Two extra suggested actions go to Turn Manager ("Kết liễu", "Tha mạng", within
   `suggested_action_count=4`); free-form input is classified deterministically, never by AI.
   - **Kết liễu (execute)**: lock `alive(npc)=false`, `death_flag_[npc]=true`; emit
     `kill_witnessed(victim=npc, witnesses=entities_in_scope(scene) \ {npc})`. This action **is** undoable
     like any other; the only non-undoable turn in the game is the player's true-death turn.
   - The `Pending Fate` window itself opens for exactly one turn and never re-opens once that turn is
     confirmed (Undo rolls state back but does not re-open a closed window), so the UI **must** carry an
     explicit "last chance this turn" line, not just bold text.
   - **Tha mạng (spare — the default)**: fires at the moment Turn Manager **confirms** that `pending_fate`
     turn without an explicit execute, including when the player did something else entirely. The defeated
     NPC takes the **same** D.2 table (using that battle's `margin_ratio`, subject = the player as winner).
     There is no "NPC dies from losing" branch — NPCs only die by explicit execution.
     When the resulting tier is `medium`, additionally emit
     `classified_event(type="insult", victim=npc, witnesses=entities_in_scope \ {npc})` to NPC Affinity
     (reusing the existing event type; 0 witnesses is still valid). Branch A has **no** mirror event —
     the game does not track player→NPC affinity. The public **context** of the insult (that the NPC was
     humiliated in front of N witnesses — the fact, never the delta value) is part of `locked_result` for
     the narration payload.
5. **`alive` / `death_flag` ownership** (CR#5, L214): this system owns both fields for every character.
   Default `alive=true` on first read (lazy-init, no explicit creation signal). Only two internal code paths
   may write `false`: Branch A step c and Branch B execute. No public setter exists.
6. **`death_and_consequence_blocked`** (CR#6, L221): boolean per character, default `false`, set `true`
   on tier `severe`, cleared **only** by a successful D.3. It never expires. It has two real effects:
   (1) blocks EXP accumulation for **any** character with a Character Card, including NPCs;
   (2) Combat multiplies in `crippled_layer(C) = CRIPPLED_PENALTY_MULT` (default `0.85` ≈ one realm step),
   sharing Combat's existing `FLOOR_TOTAL`. It has no "depth" — a second severe loss does not stack.
   Because the weakening is real, the AI is free to describe the character as weakened.

## 2.3 State / Data Model

| Field | Type | Initial | Owner/notes |
|---|---|---|---|
| `alive[char_id]` | bool | `true` (lazy) | exclusive write: Branch A c, Branch B execute |
| `death_flag_[char_id]` | bool | `false` | mirrors the above |
| `turn.is_death_turn` | bool | `false` | true only on the player's true-death turn; permanently kills Undo |
| `death_and_consequence_blocked[char_id]` | bool | `false` | Healthy ⇄ Crippled lifecycle |
| `forced_severe` | bool | `false`, **reset each Branch A run** | local variable, never persisted |
| `forced_severe_margin_ratio` | float, optional | absent | present in `locked_result` only when forced |
| `pending_fate[npc_id]` | transient state | absent | open exactly 1 turn |
| `last_self_attempt_turn[char_id]` | `int \| null` | `null` | D.3 self-cultivation cooldown |
| `consequence_type_[char_id]` | string (4 values) | — | `locked_result`, all tiers |
| `consequence_witnesses_[char_id]` | entity_id[] | `[]` | shares the `kill_witnessed` list when present |
| `deep_hostility_threshold` | int const | `-80` | registry, inclusive |

Resolution states: `Idle → Resolving Loss | Resolving Win → Idle`, plus `Death Confirmed` (terminal hand-off)
and `Pending Fate`. Flag lifecycle: `Healthy → Crippled` (severe) `→ Healthy` (D.3 success).

## 2.4 Formulas

### D.1 — death_roll (L357–391)
```
P_death    = clamp(DEATH_ROLL_BASE + DEATH_ROLL_SCALE * margin_ratio, DEATH_ROLL_MIN, DEATH_ROLL_MAX)
death_roll = roll_uniform[0,1) < P_death        // STRICT '<' — equality is survival (AC-20)
```
Runs only under CR#3c. `margin_ratio` here is always the **opponent's** (the winner's).
Default envelope `[0.05, 0.95]` — never 0%, never 100%. RNG must be injected (AC-48).
Anchor: `BASE=0.10, SCALE=0.85, margin=0.3 → P=0.355`; roll 0.2 → death. `margin=1.0 → P=0.95`;
roll 0.97 → survives → `forced_severe`.

### D.2 — severity_tier (L393–460)
```
severity_tier = "mild"   if margin_ratio <  SEVERITY_MILD_THRESHOLD
              : "medium" if margin_ratio <  SEVERITY_SEVERE_THRESHOLD
              : "severe"
// hard-forced to "severe" when forced_severe == true

consequence_type(tier, npc_tag) =
    "trọng thương"                                    if mild
  : (npc_tag?.medium_override) ?? "sỉ nhục"           if medium     // optional chaining REQUIRED
  : "phế đan điền/võ công" + set blocked(loser)=true  if severe
```
`npc_tag?.medium_override ∈ {"ep_uong_doc", null}` — content-authored, default null. The `?.` guards a
null `npc_tag` itself (e.g. a monster with no Character Card), not just a null override.
Subject of `margin_ratio`: Branch A = the opponent; Branch B spare = the player. Same formula, different
subject — every fixture must state which.

**Mandatory MIN<MAX invariants** (no load-time validation exists yet — currently safe only because the
safe ranges do not overlap): `SEVERITY_MILD_THRESHOLD < SEVERITY_SEVERE_THRESHOLD` (else `medium` becomes
unreachable, silently); `DEATH_ROLL_MIN < DEATH_ROLL_MAX`; `RECOVERY_ITEM_MIN < RECOVERY_ITEM_MAX`.
Do **not** alias `SEVERITY_SEVERE_THRESHOLD` to Affinity's `SEVERE_WIN_MARGIN_THRESHOLD` — different domains,
deliberately decoupled.

### D.3 — recovery_attempt (L462–521)
```
P_recovery(method, character) =
    RECOVERY_FORTUNE_RATE                                     if method == đại_cơ_duyên
    clamp(efficacy(item), RECOVERY_ITEM_MIN, RECOVERY_ITEM_MAX) if method == tiên_thảo_dị_bảo
    RECOVERY_SELF_RATE                                        if method == tự_tu
    REJECT (invalid action, no resource consumed)             otherwise

recovery_self_attempt_allowed(character, current_turn) =
    last_self_attempt_turn(character) == null
    OR (current_turn - last_self_attempt_turn(character)) >= RECOVERY_SELF_COOLDOWN_TURNS

recovery_attempt = roll_uniform[0,1) < P_recovery(...)
```
Success ⇒ `death_and_consequence_blocked(character) = false`. Failure ⇒ flag unchanged.
**Cost is always paid, win or lose**: the fortune event is consumed; the item loses a charge/instance;
self-cultivation sets `last_self_attempt_turn = current_turn`.
Calling it while `blocked == false` is rejected **before** any resource is spent — the action does not
even appear in the suggestion list.

**Economy note**: self-cultivation alone averages ≈ **42 turns** to clear the flag (0 EXP throughout) —
the most expensive path, paid in time. Crippled at turn 30 → ~81% cleared by turn 90 (best case only);
turn 60 → ~59%; turn 80 → ~32%; turn 88 → ~12%. Do not quote 81% as representative.

## 2.5 Tuning Knobs (L637–663)

| Knob | Default | Safe range |
|---|---|---|
| `DEATH_ROLL_BASE` | 0.10 | 0–0.3 |
| `DEATH_ROLL_SCALE` | 0.85 | 0–1 |
| `DEATH_ROLL_MIN` | 0.05 | 0–0.2 |
| `DEATH_ROLL_MAX` | 0.95 | 0.8–1.0 |
| `SEVERITY_MILD_THRESHOLD` | 0.35 | 0.2–0.5 |
| `SEVERITY_SEVERE_THRESHOLD` | 0.75 | 0.6–0.85 |
| `RECOVERY_FORTUNE_RATE` | 0.70 | 0.5–0.9 |
| `RECOVERY_ITEM_MIN` | 0.05 | 0–0.2 |
| `RECOVERY_ITEM_MAX` | 0.90 | 0.7–0.95 |
| `RECOVERY_SELF_RATE` | 0.12 | 0.03–0.15 |
| `RECOVERY_SELF_COOLDOWN_TURNS` | 5 | 5–15 |
| `CRIPPLED_PENALTY_MULT` | 0.85 | (owned by `combat-system.md` D.1) |

Changing any value or range obliges a re-check of the numeric-anchor ACs (AC-16/17/18/19/21/22/23/24/
26/27/28/30/31) — there is no automatic sync.

## 2.6 Edge Cases Resolved (L523–610)

- Untracked opponent ⇒ `affinity = 0` ⇒ `death_roll` never called (spy = 0).
- Already crippled and losing again ⇒ flag stays `true`, idempotent; the tier is still computed for
  narration but produces no extra mechanical effect.
- Already crippled and losing to a deeply hostile opponent ⇒ `death_roll` runs normally; being crippled is
  **not** death insurance.
- Ambiguous free-form input during `Pending Fate` ⇒ downgraded to **Tha mạng**, never inferred as execute.
- Execute with zero surviving witnesses ⇒ `alive/death_flag` still lock; `kill_witnessed` is still **emitted**
  with an **empty** witness set (Affinity then writes zero fields).
- `affinity == -80` exactly ⇒ deep-hostile branch (inclusive `<=`).
- `recovery_attempt` while not crippled ⇒ rejected before any cost.
- New character after "Chơi lại" ⇒ `alive=true`, `blocked=false`; flags never inherit.
- Song Tu-active NPC executed ⇒ no special code path here; Affinity handles `Ended` itself.
- **Undo of a non-death D&C turn** must roll back exactly three fields:
  (1) `death_and_consequence_blocked`; (2) the `pending_fate` outcome (execute/spare, returning the window
  to **open**, not `Idle`); (3) **`last_self_attempt_turn`** — omitting it makes `current_turn <
  last_self_attempt_turn` and wrongly locks self-cultivation. Resources owned by other systems
  (item instance, fortune event) are refunded **by their owning system** on the undo signal.
- `no_outcome`, and any friendly spar (even one producing win/lose) ⇒ this system does not resolve at all.

## 2.7 Interfaces

**Emits**: `alive(X)`, `death_flag_[char_id]` (→ Setting & Canon premise-break check, resolved before it);
`is_death_turn` (→ Turn Manager `undo_availability_window`); `death_and_consequence_blocked(self)`
(→ EXP block, → Combat `crippled_layer`); `death_confirmed` (→ Character Continuation — sole trigger);
`kill_witnessed{victim_id, witnesses[]}` and `classified_event{type:"insult",…}` (→ NPC Affinity);
`consequence_type_[char_id]`, `consequence_witnesses_[char_id]`, `forced_severe_margin_ratio`
(→ `locked_result`, World Memory facts default `importance_tier=0`, Contract Enforcement narration payload);
2 suggested actions during `Pending Fate` (→ Turn Manager); Persistence **"Khóa slot"** trigger at
`death_confirmed`.

**Consumes**: Combat hand-off (above); `max_HP(C)` from Character Card & Identity; `affinity(opponent)` and
the deep-hostility flag from NPC Affinity; `entities_in_scope` from Situation Gen; `current_turn` and
`suggested_action_count=4` from Turn Manager; `efficacy(item) ∈ [0,1]` from Equipment & Skill Data.

## 2.8 Acceptance Criteria Checklist

Core rules — [ ] **AC-01** resolves on win/lose, never on `no_outcome`; [ ] **AC-02** call order
Combat→D&C→Affinity→Canon; [ ] **AC-03** reads start-of-turn affinity (-85, not -75); [ ] **AC-04**
untracked opponent ⇒ 0, no `death_roll`; [ ] **AC-05** `death_roll` fires at -80/-81 but not -79;
[ ] **AC-06** true death locks 3 flags, calls "Khóa slot" **once before** `death_confirmed`, never calls D.2;
[ ] **AC-07** `forced_severe` forces severe at `margin=0.05` + contrast case proving the flag caused it;
[ ] **AC-08** normal D.2 when not forced; [ ] **AC-09** execute locks NPC flags and emits `kill_witnessed`
with the victim removed from witnesses; [ ] **AC-10** explicit spare uses the same D.2 with the **player's**
margin; [ ] **AC-11** default spare fires exactly at turn confirmation, window never spans 2 turns;
[ ] **AC-12** ambiguous intent ⇒ spare; [ ] **AC-13** `alive` lazy-inits `true`; [ ] **AC-14** only 2 internal
write paths, no public setter (interface inspection; codebase-wide proof needs CI lint);
[ ] **AC-15** `blocked` default false, set on severe, never expires over 100 turns.

Formulas — [ ] **AC-16** `P=0.355` → death; [ ] **AC-17** clamped `0.95`, roll 0.97 → survive;
[ ] **AC-18** clamps up to `DEATH_ROLL_MIN`; [ ] **AC-19** clamps down to `DEATH_ROLL_MAX`;
[ ] **AC-20** strict `<` (roll == P ⇒ survive); [ ] **AC-21** medium + null tag ⇒ "sỉ nhục";
[ ] **AC-22** severe ⇒ crippled + flag in the same step; [ ] **AC-23** 0.349/0.35/0.351 ⇒ mild/medium/medium;
[ ] **AC-24** 0.749/0.75/0.751 ⇒ medium/severe/severe; [ ] **AC-25** `medium_override` only affects medium;
[ ] **AC-26** fortune success clears the flag, event consumed; [ ] **AC-27** item failure still consumes the
item; [ ] **AC-28** self failure still stamps `last_self_attempt_turn`; [ ] **AC-29** fortune failure still
consumes the event; [ ] **AC-30** cooldown boundary `100-95=5` allowed → success; [ ] **AC-31** `4 < 5`
blocked before any roll or state change.

Edge cases — [ ] **AC-32** idempotent double-cripple; [ ] **AC-33** crippled is not death insurance;
[ ] **AC-34** witness-less execute still emits `kill_witnessed` with an empty set;
[ ] **AC-35** recovery when healthy is rejected before any cost; [ ] **AC-36** new `char_id` lazy-inits clean;
[ ] **AC-37** no Song Tu-specific branch on execute; [ ] **AC-38 / AC-38b** undo restores all flags, and a
spare-turn undo returns `pending_fate` to **open**; [ ] **AC-39** the true-death turn is never undoable;
[ ] **AC-40** int inputs must yield `0.42`, and D.2 must then say `medium`; [ ] **AC-41** `max_HP=0` does not
crash (denominator floor); [ ] **AC-42** `forced_severe` never leaks across battles;
[ ] **AC-43** undo restores `last_self_attempt_turn`; [ ] **AC-44** undo propagates an item refund signal;
[ ] **AC-45** friendly spar with win/lose does not resolve (all setters spy = 0); [ ] ~~AC-46~~ **SUPERSEDED**
(number retired, not reused); [ ] **AC-47** only one code path clears `blocked`;
[ ] **AC-48** RNG is an injected dependency, no hidden global, no leakage between two stubs;
[ ] **AC-49** medium spare emits exactly one `insult` event; Branch A emits none;
[ ] **AC-50** `forced_severe_margin_ratio` present with the original value only when forced, otherwise the
field is entirely **absent**.

## 2.9 Open Questions

- CI lint (project-wide) proving nothing writes `alive` / `death_flag` / `death_and_consequence_blocked`
  outside this module — **merge condition**, not an approval condition. `death_and_consequence_blocked` is
  now a combat-power cheat vector, not just EXP hygiene.
- No load-time validation of the three MIN<MAX knob pairs (owner: technical-director).
- `importance_tier` rule for `consequence_type_*` / `consequence_witnesses_*` is still default `0`.
- Item consumption model (single-use vs charges) for `tiên_thảo_dị_bảo` undecided.
- No system owns the triggering/frequency of `đại_cơ_duyên` events — D.3 only defines success odds.
- `npc_tag.medium_override` needs an owner schema, and its semantics differ by branch (Branch A reads the
  **winner's** tag, Branch B spare reads the **losing NPC's**).
- **`max_HP` is a project-wide orphan field**: 3 GDDs consume it, 0 GDDs define/initialise/bound it.
- No UI signal distinguishing "mechanics locked" from "AI narration pending/failed" at the highest-risk
  moment (true death / execute).

---

# 3. Character Continuation

## 3.1 Purpose

Receives the `death_confirmed` hand-off from Death & Consequence (with Turn Manager's `is_death_turn=true`
and Undo already permanently disabled), and presents exactly three continuation paths — Quỷ tu, Chuyển sinh,
Chơi lại. **At MVP only "Chơi lại" (replay) is functional**; the other two are visually locked stubs with no
mechanics designed. "Chơi lại" keeps the same setting pack, creates a brand-new save slot, resets every
constrained system to its fresh-init defaults, verifies that reset with an all-or-nothing gate, and returns
control to Turn Manager in the new slot. It inherits **nothing** from the dead playthrough; the old slot
stays readable forever as a closed journal.

## 3.2 Core Rules (§ Core Rules, lines 68–159)

1. **Two-layer activation** (CR#1, L70): `continuation_choice_eligible` requires **both**
   `is_death_turn=true` (Turn Manager) and `death_confirmed` (Death & Consequence) in the same turn.
   But eligibility only **enables** the entrypoint — it does **not** auto-transition. The actual transition
   `Idle → Awaiting Continuation Choice` happens when the player **taps** the trailing line of the death
   turn's prose (`tap_continue_to_fate`, owned by Core UI #15). No timer, no other trigger.
2. **"Khóa slot" is NOT this system's job** (CR#1/CR#5): Death & Consequence already triggered it at
   `death_confirmed`, before this system can even enter `Awaiting Continuation Choice`. Therefore the slot
   is **always** already closed while the choice screen is up — this is what makes closing the browser mid-choice
   safe.
3. **Three options, one usable** (CR#2, L96): all three are displayed; Quỷ tu and Chuyển sinh have
   `locked=true`. The locked state is conveyed **purely visually** (thin sketch strokes, unsealed ink frame) —
   the interface must expose **no** label text field, and no "Coming soon" string.
4. **No time limit** (CR#3, L113): the player may stay in `Awaiting Continuation Choice` indefinitely.
   No auto-timeout, no default selection, and Turn Manager must not be asked for suggestions during it.
5. **"Chơi lại" keeps the setting pack** (CR#4, L115): no return to the setting-pack picker; re-initialise
   the standard MVP protagonist template (no character creator at MVP). Keeping the pack means only
   "don't re-ask" — it does **not** mean continuing the old history.
6. **Exactly one Persistence operation** (CR#5, L126): call **"Tạo slot mới"** once, on first entry into
   `Processing Chơi Lại`. Retry semantics differ by failure class (see Edge Cases).
7. **Nothing is inherited** (CR#6, L144). The reset field list — **this list defines `N`**:
   1. EXP & Realm Progression: `level=1`, `EXP=0`.
   2. NPC Affinity & Relationship: every NPC back to the setting pack's authored preset (or `0` if none).
   3. Setting & Canon Integration: every `canon_event_*_status` back to its original `Dormant`/`Pending`.
   4. Death & Consequence: `alive=true`, `death_and_consequence_blocked=false`.
   5. Equipment & Skill Data: `known_skill_ids` / `equipped_weapon_id` back to the MVP starting loadout.
   Adding a bullet here **requires** bumping `N` and re-running AC-07 in the same change.
8. **Hand back to Turn Manager** (CR#7, L156) in the new slot, state "Awaiting Action", generating an opening
   suggestion as a fresh game — carrying no context from the death turn.

## 3.3 State / Data Model

| State | Meaning | Exit |
|---|---|---|
| `Idle` | normal play | → `Awaiting Continuation Choice` (eligible **and** tapped) |
| `Awaiting Continuation Choice` | 3-path screen; Turn Manager idle; slot already closed | → `Processing Chơi Lại` |
| `Processing Chơi Lại` | call "Tạo slot mới" once, then reset all systems | → `New Playthrough Started` (`handoff_allowed=1`) or `Reset Failed` |
| `New Playthrough Started` | control returned to Turn Manager | — |
| `Reset Failed` | blocked hand-off, error shown | → `Processing Chơi Lại` (retry), or Save Slot Screen |

Fields: `continuation_choice_eligible: bool`; `reset_failed_reason ∈ {"state_reset_error",
"persistence_error", "configuration_error"}`; `slot_id` (the newly created one, reused across
state-reset retries); `N: int` (derived from CR#6's bullet count, currently **5**); `ok(s): {0,1}` per system.
**No save blob exists for the transient `Awaiting Continuation Choice` state** — this absence is intentional
and is itself asserted (AC-16).

## 3.4 Formulas

### D.1 — reset_completeness_check (L212–290)
```
reset_complete(reset)     = 1 if (N >= 1) AND (Σ(s=1..N) ok(s) == N) else 0     // INTEGER comparison
handoff_allowed(reset)    = reset_complete(reset) AND (N >= 1)                   // short-circuits at N=0
completeness_ratio(reset) = 0 if N == 0 else (1/N) * Σ ok(s)   // DIAGNOSTIC/LOG ONLY — never a gate
```
Using `completeness_ratio == 1` as the gate is forbidden: with `N=5`, IEEE-754 can make `(1/5)×5 ≠ 1.0`,
producing a false negative that blocks a valid replay; and the original `(1/N)` form was a real
divide-by-zero at `N=0`.

**How `ok(s)` is confirmed — LAZY-INIT, no explicit `reset_to_fresh_init` call anywhere.** `ok(s)` is the
result of **reading** state after initialisation, and the reading mechanism splits into two classes:
- **Class A — keyed by `char_id`** (EXP & Realm Progression, Equipment & Skill Data): the protagonist always
  gets a **new** `char_id` on replay, so "queried with an ID never seen before" is literally true and the
  system returns its own defaults.
- **Class B — keyed by fixed setting-pack-authored IDs** (`npc_id`, `event_id`: NPC Affinity, Setting & Canon):
  the same IDs **are** re-queried and the in-memory object survives (no page reload between playthroughs in
  one browser session). Here `ok(s)` means: **the system's state container has rebound to the new
  `slot_id`'s empty blob before D.1 reads it.** Storage is already slot-namespaced at the Persistence layer —
  this requires no schema/key change in those systems, only a read-timing guarantee (never hold an
  unrebound in-memory copy).

Anchor: `N=5`, all `ok=1` → `handoff_allowed=1`. One system `ok=0` → ratio 0.8 → `handoff_allowed=0` →
`Reset Failed`, block the hand-off (no silent retry, no log-only).

### D.2 — continuation_choice_eligible (L292–321)
```
continuation_choice_eligible(turn) = is_death_turn(turn) AND death_confirmed(turn)
```
A defensive two-layer invariant between two independent systems, not a common-case filter: by design both
flags are locked in the same Death & Consequence step. If only one is true, `eligible=0`, the trailing line
does not appear, the system stays `Idle`, and it **logs a sync error** (no exception, no crash).

Quỷ tu and Chuyển sinh have **no formulas at MVP** — hard-locked UI stubs by design.

## 3.5 Tuning Knobs

**None.** Both formulas are boolean invariants; `N` is derived from CR#6's bullet count, not designer-tuned.
One knob is **referenced, not copied**: `max_write_retry_before_escalation` (Persistence registry).

## 3.6 Edge Cases Resolved (L331–410)

- **Browser closed during `Awaiting Continuation Choice`** (even before the tap): no recovery state is kept.
  `is_death_turn=true` was auto-saved at Turn Confirmed and "Khóa slot" already ran at `death_confirmed`,
  so the old slot is always read-only before the screen appears. On reopening, the player sees the slot
  picker with the old slot closed and can choose "Bắt đầu mới" manually — functionally identical to
  "Chơi lại" at MVP (one setting pack).
- **Attempting Quỷ tu / Chuyển sinh** (including via free text bypassing the locked UI): rejected, state
  unchanged, no Persistence call, no exception.
- **`handoff_allowed=0` with the slot already created** → `Reset Failed`, `reason="state_reset_error"`.
  Retry **reuses the same `slot_id`** and re-runs only the state reset — "Tạo slot mới" is **not** called again.
- **"Tạo slot mới" itself fails** (e.g. `QuotaExceededError`, before any reset ran) → `Reset Failed`,
  `reason="persistence_error"`. Retry calls "Tạo slot mới" **from scratch**. After
  `max_write_retry_before_escalation` consecutive identical failures, the error banner must **add** (not
  replace) a `tap_back_to_slots` navigation to the Save Slot Screen — quota does not clear itself, so
  infinite retry can never succeed. "Thử lại" keeps working; the exit is an addition, not a cap.
  The `state_reset_error` branch does **not** need this escape (logic bugs clear in 1–2 tries).
- **`N == 0`** (configuration error) → `Reset Failed`, `reason="configuration_error"`;
  `completeness_ratio` must return the sentinel `0` rather than evaluating `(1/N)`.
- **Undo during `Awaiting Continuation Choice`**: already blocked at Turn Manager
  (`is_death_turn=true` ⇒ `undo_available=false`, permanent). This system adds no enforcement of its own but
  must expose no bypass route.
- **Repeated retries**: unlimited, no cooldown — failures here are technical, not gameplay.

## 3.7 Interfaces

**Consumes**: `death_confirmed` (Death & Consequence — sole activation source); `is_death_turn`
(Turn Manager); `tap_continue_to_fate`, `tap_retry_reset`, `tap_back_to_slots` (Core UI #15, which owns the
layout and affordances while this system owns the screen's **content**); Persistence "Tạo slot mới" and
`max_write_retry_before_escalation`; `ok(s)` from the 5 constrained systems (all injected/mocked in tests,
never the real systems).
**Emits**: control hand-back to Turn Manager ("Awaiting Action") in the new `slot_id`; `reset_failed_reason`.

## 3.8 Acceptance Criteria Checklist

- [ ] **AC-01** Exactly one entrypoint into `Awaiting Continuation Choice`, requiring **both** `eligible=true`
      and a tap call; `eligible=true` alone leaves the state at `Idle`.
- [ ] **AC-02** Three options returned; Quỷ tu/Chuyển sinh `locked=true` with **no** label-text field;
      choosing Chơi lại transitions to `Processing Chơi Lại`.
- [ ] **AC-03** No auto-timeout at 100 and 10,000 ticks; Turn Manager spy = 0 throughout.
- [ ] **AC-04** `setting_pack_id` preserved; standard MVP protagonist; zero calls to setting-picker /
      character-creator.
- [ ] **AC-05a** "Tạo slot mới" called exactly once; "Khóa slot" called **zero** times by this system.
- [ ] **AC-05b** "Khóa slot" was already called once **by Death & Consequence** at `death_confirmed`.
- [ ] **AC-06** "Dirty old slot first": mocks return non-defaults for the OLD `char_id`/`slot_id` and defaults
      only for the NEW one; all 5 systems must be queried with the NEW ID (lazy-init read, no explicit reset call).
- [ ] **AC-07** Post-reset read matches the CR#6 field list exactly (locks the field list).
- [ ] **AC-08** Control returns to Turn Manager in the new slot, "Awaiting Action", opening suggestion carries
      no `turn_id`/content from the death turn.
- [ ] **AC-09** `N=5`, all ok → ratio 1.0, `handoff_allowed=1`.
- [ ] **AC-10** One `ok=0` → ratio 0.8, `handoff_allowed=0`, `state_reset_error`, Turn Manager spy = 0.
- [ ] **AC-11** `N=0` → `handoff_allowed=0` by short-circuit (`reset_complete` not evaluated),
      `completeness_ratio` returns sentinel `0` without dividing, `reason="configuration_error"`, no exception.
- [ ] **AC-12** Two `ok=0` → ratio 0.6, no partial hand-off.
- [ ] **AC-13** `state_reset_error` retry reuses the same `slot_id`; "Tạo slot mới" spy = 0 on retry.
- [ ] **AC-14** Truth matrix (T,T)/(T,F)/(F,T)/(F,F) → 1/0/0/0; only (T,T) may transition.
- [ ] **AC-15** Mismatched flags log a sync error once each, no throw, stay `Idle`.
- [ ] **AC-16** No save blob/field registered for the transient awaiting state.
- [ ] **AC-17** Quỷ tu/Chuyển sinh selection rejected even when calling the handler directly; no Persistence
      call, no exception.
- [ ] **AC-18** `persistence_error` retry calls "Tạo slot mới" from scratch; after
      `max_write_retry_before_escalation` consecutive failures `tap_back_to_slots` becomes available.
- [ ] **AC-19** Error-source classification is real state, not just display strings
      (`persistence_error` vs `state_reset_error`).
- [ ] **AC-20** Undo rejected/absent across **every** public entrypoint (behavioral, not name-based); state
      unchanged, Turn Manager and Persistence spies = 0.
- [ ] **AC-21** Unlimited retries, no cooldown; the successful attempt transitions normally.

## 3.9 Open Questions

- Persistence AC-05 does not test that manual "Bắt đầu mới" preserves `setting_pack_id` the way "Chơi lại"
  does — moot at MVP (one pack), a real risk once Alpha unlocks multiple packs.
- Situation/Encounter Generation holds ≥3 per-NPC runtime trackers (`last_used`, `provoked_flag`,
  `npc_last_initiated[*]`) in the same Class-B risk category but is **not** in `N=5`. Deliberately deferred
  (that GDD is under an unresolved dispute); `N` stays 5 until it is reviewed, then becomes 6 with a matching
  container-rebind AC.
- Narrative copy (1–2 lines) for the two locked paths: must express mood/theme only, never mechanics or
  system names, to avoid constraining the Vertical Slice design.
- Diegetic copy tone for the "Reset Failed" message (in the "Mực Chưa Khô" voice, not raw browser-speak),
  and whether to insert a beat before the error appears.
- UX inputs still missing: ms/px for the event-3 "shiver", keyboard-only equivalent, Mobile-Web portrait
  layout for the 3 paths, and a static mockup proving the ink-completeness difference reads emotionally.

---

# 4. Cross-Cutting Implementation Notes

1. **Turn order within one confirmed turn**:
   Combat → **Death & Consequence** → **NPC Affinity** (`resolve_turn_affinity`) → Setting & Canon →
   `resolve_turn_exp`. Death must run first so `kill_witnessed` / the medium-tier `insult` event exist when
   affinity resolves; affinity must run before EXP/Canon so `A_after` and the deep-hostility flag are current.
2. **Deferred commit**: every field all three systems write is provisional until Turn Manager confirms the
   turn and the undo window closes. The only permanently non-undoable turn in the game is the player's true
   death (`is_death_turn=true`).
3. **Numeric hygiene**: `float()` before every `hp_after / max_HP` division, `max(denominator, 1)` floor,
   round-half-away-from-zero exactly once per NPC at the end of the affinity pipeline, integers only in
   `locked_result`. No raw number or delta may ever reach the narration payload — only bands, directions,
   and factual context (witness counts, `forced_severe_margin_ratio` as style guidance).
4. **RNG**: `death_roll`, `recovery_attempt` (and the GDD's Song Tu roll) must take an injected RNG
   dependency, never a global. Undo-then-redo re-rolls; results are allowed to differ.
5. **Interface-inspection limits**: AC-14/AC-47 (Death) and AC-16/AC-20 (Continuation) can only prove this
   module exposes no bypass. Proving nothing anywhere in the codebase writes `alive`, `death_flag`, or
   `death_and_consequence_blocked` directly requires a project-level CI lint — recorded as a **merge**
   condition.
6. **Load-time validation to add** (currently unenforced anywhere): `SEVERITY_MILD_THRESHOLD <
   SEVERITY_SEVERE_THRESHOLD`, `DEATH_ROLL_MIN < DEATH_ROLL_MAX`, `RECOVERY_ITEM_MIN < RECOVERY_ITEM_MAX`,
   `DIMINISH_FLOOR > 0`, `FATIGUE_WINDOW_TURNS >= POSITIVE_SOCIAL_COOLDOWN_TURNS`, `max_HP > 0`.
