# Implementation Contract — Situation/Encounter Generation (GDD #11) + Persistence/Save System (GDD #6)

Sources: `design/gdd/situation-encounter-generation.md` (1648 lines, **Approved** 2026-08-11, round 2/2 closed),
`design/gdd/persistence-save-system.md` (1948 lines, **Designed**; prototype complete 2026-08-11),
`docs/architecture/adr-0002-persistence-storage-backend.md` (Proposed, 642 lines).
Both GDDs were written against the pre-pivot Godot 4.6 Web-export stack. Every Godot-specific mechanism is
translated to the current React/TS/Vite stack in **Part C**; where a rule's intent is engine-neutral it is
restated engine-neutrally in Parts A/B. Out of scope by instruction: Combat GDD internals and Song Tu mechanics
(only interface field names are recorded).

---

# PART A — SITUATION / ENCOUNTER GENERATION

## A1. Purpose

Per-turn "scene director". Before every AI call it decides **where** the turn happens (`location_id`), **who is
present** (`entities_in_scope`), and **which single dramatic hook** is open (canon event due / an NPC taking
initiative / a world-ambient event), locks that scene, computes a deterministic whitelist of legal player actions
(`allowed_envelope_menu`), and hands scene+menu to the Turn Manager's `suggestion_call`. In the reverse direction
it **classifies** player actions (including free text) into normalized mechanical events and dispatches them to
the owning systems in a fixed order, *before* narration. It is 100% deterministic and makes **zero AI calls of its
own**; it owns no numeric outcome (no affinity/EXP/HP deltas) — only scene structure, presence, location and event
classification (Overview L36-38).

## A2. Core Rules (numbered; refs = GDD line ranges)

**R1 — Scene is owned mechanical state** (L79-88). `scene = {location_id, entities_in_scope, scene_tags,
active_hook}` — exactly 4 public fields; no runtime tracker leaks into it (AC-01). `entities_in_scope` = present
NPCs + the literal `"global"`, at most `MAX_NPC_PER_SCENE = 3` NPCs, so `|entities_in_scope| <= 4 =
max_entities_per_prompt` structurally. `scene_tags` is a normalized flag set (`private`/`public`, `dangerous`,
`faction_[id]`, `canon_bg_[event_id]`, `npc_reason_[npc_id]`) set by data + scheduler. **The scene is LOCKED
before any AI call in the turn**; the AI never decides the scene.

**R2 — In-turn lifecycle** (L89-96). After turn N is confirmed (and not undone): the scheduler updates the scene
for N+1 -> locks the scene -> computes `allowed_envelope_menu` -> Turn Manager issues `suggestion_call` (context =
locked scene + World Memory's AI context frame). On player action: resolve envelope -> dispatch classified events
to owning systems in the fixed order **`[combat_death, npc_affinity, canon, exp]`** (`resolve_turn_canon` runs
before `resolve_turn_exp`); AC-03 asserts the whole call-order array.

**R3 — Normalized envelope + whitelist menu** (L97-120). `envelope = {envelope_type, target?, params?}`.
`ENVELOPE_TYPES` (12): `gift`, `small_help`, `save_life`, `insult`, `threaten`, `betray`, `combat_challenge`
(carries `spar_friendly`), `song_tu_action`, `canon_role_rescue(event_id, char_id)`, `move_to(location_id)`,
`investigate`, `rp_only` (default). `allowed_envelope_menu(turn)` is deterministic; the `suggestion_call` prompt
lists only that menu; an AI-returned label **outside** the menu is hard-downgraded to `rp_only` keeping its text,
and that downgrade **never triggers a retry** (retries follow Turn Manager's `<4`/duplicate rule only).
**`spar_friendly` declaration**: the first tap on chip `combat_challenge[npc]` opens a 2-option confirm popup —
"Đấu giao hữu" (`spar_friendly=true`) / "Khiêu chiến thật" (`spar_friendly=false`); the choice is mandatory, **no
implicit default**; the envelope counts as "sent" only after the popup resolves (so it does not conflict with Turn
Manager Rule #3).

**R4 — Free text is classified ONLY by declared player intent** (L121-145). The free-text box carries intent
chips; only chips inside this turn's menu are shown; no chip -> `rp_only` (the AI may narrate but must not assert
any mechanical consequence — prompt constraint + Contract Enforcement leak post-check). A client-side keyword
heuristic may only *nudge* the player to enable a chip before sending; it must never auto-classify (its public API
is exactly `suggest_chip(text) -> chip_id | null`, AC-06). Chips mirror menu entries **per (type, NPC) pair**
(e.g. separate "Tặng quà [NPC A]" and "Tặng quà [NPC B]" chips; no separate target selector). **`char_id`
resolution for `canon_role_rescue` is deterministic string matching, never AI**: match free text against known
names/aliases of NPCs that are `present_or_adjacent` or hold a canon role at the current `location_id` (same data
source as `canon_role_npcs(location_id)`); exactly 1 match -> `char_id` resolved; 0 or >=2 matches -> controlled
refusal, downgrade to `rp_only` (no crash, no guessing).

**R5 — Anti-ratchet gating** (L146-154). (a) Positive envelopes (`gift`, `small_help`) enter the menu only with a
real hook (NPC present + suitable context) **and** cooldown `POSITIVE_SOCIAL_COOLDOWN_TURNS` elapsed per
(type, NPC) — applied identically to chips and to the AI suggestion payload (no back door, AC-07). (b)
`song_tu_action` requires `private` in `scene_tags` **and** NPC willingness (`affinity >= song_tu_threshold=60`
OR npc in `song_tu_relationship_active_npc_ids`). (c) Gates affect **availability only**, never deltas.

**R6 — Deterministic encounter scheduler, hard priority** (L155-180). (1) **Canon Due** (payload from the previous
turn's `resolve_turn_canon`); (2) **NPC initiative**: hostile initiative requires
`level(npc) - level(player) <= 20` OR `provoked(npc) != null`; friendly initiative has no level-gap limit;
NPC-initiated hooks have their own cooldowns (D.5); (3) **World/Ambient tier** (D.4b) with 3 sub-branches in order
**(3a) NPC in danger (rescue) -> (3b) neutral NPC presence -> (3c) pure procedural ambient**. Branches (3a)/(3b)
share the D.5 budget directly via `cooldown_ok ⊃ global_window_ready`; branch **(3c) is NOT window-gated** — it
self-limits through `AMBIENT_ENCOUNTER_CHANCE` and therefore always returns (`ambient_hostile` or `ambient_lull`),
preserving the never-null invariant (AC-25). **Exactly 1 primary hook per turn across all 3 tiers.**

**R7 — Movement & location** (L181-185). The setting pack declares the location graph (nodes + adjacency).
`move_to` is legal only to an adjacent location. This system owns `location(X)` for player **and** NPCs
(data-driven presence table, updated by the scheduler when a hook demands it) and exposes the `at_location`
predicate consumed by Setting & Canon.

**R8 — Deferred commit + locked fields** (L186-194). Every state change of this system (location, presence,
cooldowns, `provoked_*`, hook state) becomes final only when the turn is confirmed and not undone. Undo restores
the scene and the menu is recomputed deterministically (identical menu; only the 4 AI suggestions are
regenerated). Fields written into `locked_result`: `location_change_player` (entity `global`),
`encounter_initiated_[npc_id]` (entity `[npc_id]`), `classified_event_[npc_id]`.

**State machine** (L196-205): `Scene Pending Update` -> `Scene Locked` -> `Awaiting Player Action` ->
`Classifying` (0 AI calls) -> `Dispatched` -> back to `Scene Pending Update` (commit staging on confirm, rollback
staging on undo).

## A3. State / Data Model

All trackers are runtime state of this system, serialized inside `turn_snapshot` (Persistence), rolled back
wholesale on undo (Formulas preamble L249-251; Dependencies table).

```ts
type NpcId = string; type LocationId = string; type EventId = string;

type SceneTag = 'private' | 'public' | 'dangerous' | `faction_${string}`
              | `canon_bg_${EventId}` | `npc_reason_${NpcId}`;

type HookType = 'canon' | 'npc_initiated' | 'rescue' | 'neutral_presence'
              | 'npc_in_danger'          // active_hook.type produced by rescue_hook
              | 'ambient';               // ambient_hostile / ambient_lull are subtypes
interface Hook {
  type: HookType;
  participants: NpcId[];                 // hook_participants -> D.6 tier 0
  at_risk_npc?: NpcId;                   // ONLY when type === 'npc_in_danger'
  provoking_event_ref?: EventId;         // set when provoked opened the right (D.3)
  event_id?: EventId;                    // canon hook
  level_range?: [number, number];        // ambient_hostile_hook, from D.7
  valence?: 'hostile' | 'friendly';      // npc_initiated
  lull?: boolean;                        // ambient_lull_hook
}
interface Scene {                              // EXACTLY these 4 public fields (AC-01)
  location_id: LocationId;
  entities_in_scope: (NpcId | 'global')[];     // 1..4 elements, always contains 'global'
  scene_tags: Set<SceneTag>;
  active_hook: Hook;
}

type EnvelopeType = 'gift'|'small_help'|'save_life'|'insult'|'threaten'|'betray'
  |'combat_challenge'|'song_tu_action'|'canon_role_rescue'|'move_to'|'investigate'|'rp_only';
interface Envelope { envelope_type: EnvelopeType; target?: NpcId | LocationId;
  params?: { spar_friendly?: boolean; event_id?: EventId; char_id?: NpcId }; }

type Valence = 'hostile' | 'friendly' | 'rescue' | 'neutral_presence';

interface EncounterState {                                    // initial values at world_time = 0
  scene: Scene;                                               // setting pack: start location, initial presence,
                                                              // active_hook = world_tier_hook(0) (normally lull)
  presence: Record<NpcId, LocationId>;                        // data-driven, from setting pack
  player_location: LocationId;                                // from setting pack
  last_used: Record<`${EnvelopeType}|${NpcId}`, number|null>;  // {} == all null
  provoked: Record<NpcId, { set_turn: number; source_event_ref: EventId } | null>;  // all null
  provoked_consumed_ref: Record<NpcId, EventId | null>;        // all null
  npc_last_initiated: Record<NpcId, Record<Valence, number|null>>;  // 4 trackers/NPC, all null
  hook_history: Array<{ turn: number; hook_type: HookType }>;  // D.5 sliding window source;
                                                              // retain >= NPC_INITIATED_WINDOW_TURNS entries
}
```

Read-only inputs (never cached; re-read each turn): `level(C)` (EXP), `affinity(npc)`,
`song_tu_relationship_active_npc_ids`, severity table D.1 (NPC Affinity), `alive(npc)` /
`death_flag_[char_id]` (Death & Consequence), `canon_due_payload(turn)`, `canon_role_npcs(location_id)`,
`role.priority`, `status(E)` (Setting & Canon), `adjacent(location_id)` (setting pack).

## A4. Formulas & Algorithms (faithful pseudocode)

### D.1 `allowed_envelope_menu(turn)` (L253-329)
`allowed_envelope_menu(turn) = { t in ENVELOPE_TYPES : gate(t, turn, npc?) }`. NPC-bound envelopes emit one entry
per legal NPC; non-NPC envelopes (`move_to`, `investigate`, `rp_only`, `canon_role_rescue`) emit once.

```
gate(gift, npc)        = present(npc,scene) AND 'dangerous' NOT IN scene_tags AND cooldown_elapsed(gift,npc,turn)
gate(small_help, npc)  = present(npc,scene) AND 'dangerous' NOT IN scene_tags AND cooldown_elapsed(small_help,npc,turn)
gate(save_life, npc)   = present(npc,scene) AND active_hook.type == 'npc_in_danger' AND npc == active_hook.at_risk_npc
gate(insult, npc)      = present(npc,scene)          // deliberately NO cooldown, NO dangerous check
gate(threaten, npc)    = present(npc,scene)
gate(betray, npc)      = present(npc,scene)
gate(combat_challenge, npc) = present(npc,scene) AND alive(npc)   // spar_friendly is a param, not a gate
gate(song_tu_action, npc)   = 'private' IN scene_tags
                              AND (affinity(npc) >= 60 OR npc IN song_tu_relationship_active_npc_ids)
gate(canon_role_rescue)     = EXISTS E in canon_events : status(E) == 'Suspended'  // no char_id list exposed (AC-40)
gate(move_to)               = |adjacent(location_id)| >= 1        // one chip per adjacent location
gate(investigate)           = true
gate(rp_only)               = true

cooldown_elapsed(t,npc,turn) = last_used(t,npc) == null
                            OR (turn - last_used(t,npc)) >= POSITIVE_SOCIAL_COOLDOWN_TURNS
// last_used(t,npc) := turn ONLY when that envelope RESOLVES (not when merely offered) — AC-16
```
The output always contains `rp_only` and `investigate`; minimum size 1. `save_life` has **no** per-envelope
cooldown — it is entirely hook-gated, and the hook itself is rate-limited by `RESCUE_COOLDOWN_TURNS`.

### D.2 `hostile_initiative_allowed(npc)` (L331-370)
```
hostile_initiative_allowed(npc) = (level(npc) - level(player) <= HOSTILE_INITIATIVE_LEVEL_GAP_MAX)  // 20, LOCKED
                                  OR provoked_flag(npc)
```
**One-sided, NOT absolute value** — `gap < 0` is always true (a weaker NPC attacking upward is legal). Deep
hostility (`affinity <= -80`) does **not** bypass the gap; only `provoked` does.

### D.3 `provoked(npc)` (L372-477)
```
provoked(npc): { set_turn: int, source_event_ref: EventId } | null      // default null, NO decay

SET provoked(npc) := { set_turn: turn, source_event_ref: e.event_id }
  when resolving a turn with classified_event e such that
      (e.target == npc AND severity(e) >= PROVOKE_SEVERITY_MIN)
   OR (e.type == 'kill_witnessed' AND npc IN witnesses(e))
  // unconditional overwrite: the newest event always wins

CLEAR provoked(npc) := null, checked at the START of every turn, BEFORE D.4, when
      (provoked(npc) != null AND provoked_consumed_ref(npc) == provoked(npc).source_event_ref)
   OR (affinity(npc) >= PROVOKE_RECONCILE_AFFINITY)   // reconciliation clears ANY instance

// provoked_consumed_ref(npc) is written ONLY in D.4, at the moment is_hostile_candidate(npc) is CHOSEN as the
// hook BECAUSE provoked(npc) != null opened the right (bypassing D.2):
//   provoked_consumed_ref(npc) := provoked(npc).source_event_ref
// captured BEFORE that same turn can SET a new instance over it.
provoked_flag(npc) = (provoked(npc) != null)      // derived convenience only, not stored state
```
Severity is looked up from `npc-affinity-relationship.md` D.1 — never redefined here. At
`PROVOKE_SEVERITY_MIN=3`: `threaten`(3), `betray`(4), dominant `combat_win_vs_npc`(3), `kill_witnessed`(5)
qualify; `insult`(2) does not. When D.4 selects a hostile hook via provoked, the hook payload must carry
`provoking_event_ref := provoked(npc).source_event_ref` so the AI can narrate the real cause independently of
World Memory's `recency_window_turns=8`.

### D.4 `select_primary_hook(turn)` (L479-564)
```
select_primary_hook(turn):
  payload = canon_due_payload(turn)
  if payload != null and payload.resolved_events != []:
      return canon_hook(payload.resolved_events[0])   // remaining events -> scene_tags 'canon_bg_[event_id]'
  candidates = { npc : is_initiative_candidate(npc, turn) }
  if candidates != {}:
      return npc_hook(argmin over candidates of tie_break_key(npc))
      // tie_break_key = (-hostility_rank(npc), -|affinity(npc)|, npc_id); hostility_rank: hostile=1, friendly=0
  return world_tier_hook(turn)                        // D.4b — unconditional fallback, never null

is_hostile_candidate(npc)  = alive(npc) AND affinity(npc) <= HOSTILE_INITIATIVE_AFFINITY_MAX
                             AND hostile_initiative_allowed(npc)             // D.2
                             AND present_or_adjacent(npc, player_location)
                             AND cooldown_ok(npc, 'hostile', turn)           // D.5
is_friendly_candidate(npc) = alive(npc) AND affinity(npc) >= FRIENDLY_INITIATIVE_AFFINITY_MIN
                             AND present_or_adjacent(npc, player_location)
                             AND cooldown_ok(npc, 'friendly', turn)          // D.2 NOT required
is_initiative_candidate(npc,turn) = is_hostile_candidate(npc) OR is_friendly_candidate(npc)

present_or_adjacent(npc, loc) = present(npc, scene) OR location(npc) IN adjacent(loc)
// if an only-adjacent NPC is chosen as the hook, the scheduler sets location(npc) := player_location
// immediately, before the scene locks.
```
`provoked` opens the **right**, not the **motive**: a provoked NPC still needs `affinity <= -40` to become a
hostile candidate.

### D.4b `world_tier_hook(turn)` (L566-689)
```
world_tier_hook(turn):
  at_risk = { npc : is_rescue_candidate(npc, turn) }
  if at_risk != {}:
      npc = argmin(npc_id in at_risk)
      npc_last_initiated[npc]['rescue'] := turn     // consumed AT HOOK SELECTION, not when the player acts
      return rescue_hook(npc)                       // active_hook = {type:'npc_in_danger', at_risk_npc: npc}

  neutral = { npc : is_neutral_presence_candidate(npc, turn) }
  if neutral != {}:
      npc = argmin(npc_id in neutral)
      npc_last_initiated[npc]['neutral_presence'] := turn
      return neutral_presence_hook(npc)             // scene_tags += 'npc_reason_[npc_id]'; npc forced into
                                                    // hook_participants (D.6 tier 0). No mechanical delta.

  roll = deterministic_roll(turn, seed_stream='ambient')      // injectable RNG, [0,1)
  if roll < AMBIENT_ENCOUNTER_CHANCE:
      return ambient_hostile_hook(encounter_level_range(player_level))    // D.7
  return ambient_lull_hook()

is_rescue_candidate(npc, turn) =
      alive(npc)
  AND present(npc, scene)                                   // pure present, NOT present_or_adjacent
  AND affinity(npc) >  HOSTILE_INITIATIVE_AFFINITY_MAX      // > -40
  AND affinity(npc) <  FRIENDLY_INITIATIVE_AFFINITY_MIN     // < +40   (neutral band only)
  AND deterministic_roll(turn, seed_stream='ambient') < AMBIENT_ENCOUNTER_CHANCE   // SAME roll as (3c)
  AND cooldown_ok(npc, 'rescue', turn)

is_neutral_presence_candidate(npc, turn) =
      alive(npc) AND present_or_adjacent(npc, player_location)
  AND affinity(npc) > HOSTILE_INITIATIVE_AFFINITY_MAX AND affinity(npc) < FRIENDLY_INITIATIVE_AFFINITY_MIN
  AND cooldown_ok(npc, 'neutral_presence', turn)
```
The rescue roll and the ambient roll are **the same world event** (same `turn`, same seed stream); they differ
only by whether a neutral NPC is present. A rescue opportunity missed by the player is still consumed — "the
world does not wait for me".

### D.5 `npc_initiative_cooldown` (L690-747)
```
cooldown_ok(npc, valence, turn) = per_npc_ready(npc, valence, turn) AND global_window_ready(turn)

per_npc_ready(npc, valence, turn) = npc_last_initiated[npc][valence] == null
                                 OR (turn - npc_last_initiated[npc][valence]) >= cooldown_turns_for(valence)
cooldown_turns_for(hostile|friendly|neutral_presence) = NPC_INITIATIVE_COOLDOWN_TURNS   // 5
cooldown_turns_for(rescue)                            = RESCUE_COOLDOWN_TURNS           // 8

global_window_ready(turn) =
    count({ t' in [turn - NPC_INITIATED_WINDOW_TURNS, turn) :
            hook_type(t') in {npc_initiated, rescue, neutral_presence} })
    < NPC_INITIATED_WINDOW_CAP
```
Two tiers: `per_npc_ready` stops one NPC monopolizing; `global_window_ready` is the world-wide breather. Per-NPC
trackers are **split by valence** (a friendly initiative does not block a hostile one and vice versa); the global
window counts all 4 valences together. The real cycle of the sliding window is `WINDOW_TURNS + 1 = 4` turns (hook
at turn 23 -> ready again at turn 27, AC-26) — this is exactly what `AMBIENT_ENCOUNTER_CHANCE` is derived from.

### D.6 `entities_in_scope(scene)` (L748-794)
```
entities_in_scope(scene) = {'global'} UNION top_K(candidates(scene), key=priority_key, K=MAX_NPC_PER_SCENE)
candidates(scene) = hook_participants(active_hook)
                    UNION canon_role_npcs(location_id)
                    UNION other_present_npcs(location_id)
priority_key(npc) = (tier(npc), -|affinity(npc)|, npc_id)      // ascending sort
  tier = 0 if npc in hook_participants        // always kept
  tier = 1 if npc in canon_role_npcs \ hook_participants
  tier = 2 otherwise
```
Structural edge case (unreachable with the MVP 3-NPC roster): if `|hook_participants| > 3`, truncate within tier 0
by `(role.priority ASC, npc_id ASC)` and emit a "content gap" warning. Result size is always `1..4`.

### D.7 `encounter_level_range(player_level)` (L795-831)
```
encounter_level_range(pl) = [ max(1, pl - AMBIENT_LEVEL_BAND_DOWN), pl + AMBIENT_HOSTILE_LEVEL_CAP ]
// ambient enemy level = uniform random (injectable RNG, stream separate from 'ambient') within the range
// HARD INVARIANT: AMBIENT_HOSTILE_LEVEL_CAP <= HOSTILE_INITIATIVE_LEVEL_GAP_MAX (=20). A freshly spawned
// ambient enemy can never carry provoked, so gap > 20 would be a self-contradictory state under D.2.
```
Named/canon NPCs never use D.7 — their levels are fixed setting-pack data.

## A5. Tuning Knobs (L930-968)

| Knob | Default | Safe range | Used by |
|---|---|---|---|
| `POSITIVE_SOCIAL_COOLDOWN_TURNS` | 4 | 2–8 (⊕ binding) | D.1 |
| `PROVOKE_SEVERITY_MIN` | 3 | 2–4 | D.3 |
| `PROVOKE_RECONCILE_AFFINITY` | −10 | −20…0 | D.3 |
| `HOSTILE_INITIATIVE_AFFINITY_MAX` | −40 | −60…−10 | D.4, D.4b |
| `FRIENDLY_INITIATIVE_AFFINITY_MIN` | +40 | +10…+60 | D.4, D.4b |
| `NPC_INITIATIVE_COOLDOWN_TURNS` | 5 | 3–10 | D.5 (hostile/friendly/neutral_presence) |
| `NPC_INITIATED_WINDOW_TURNS` | 3 | 2–6 | D.5 |
| `NPC_INITIATED_WINDOW_CAP` | 1 | 1–2 | D.5 |
| `AMBIENT_LEVEL_BAND_DOWN` | 15 | 5–30 | D.7 |
| `AMBIENT_HOSTILE_LEVEL_CAP` | 15 | 5–20 (**hard ceiling 20**) | D.7 |
| `AMBIENT_ENCOUNTER_CHANCE` | 0.25 | 0.2–0.5 | D.4b; derived = `NPC_INITIATED_WINDOW_CAP / (NPC_INITIATED_WINDOW_TURNS + 1)` |
| `RESCUE_COOLDOWN_TURNS` | 8 | 8–16 (⊕ binding) | D.4b / D.5 |

**⊕ BINDING cross-constraint, must be asserted at config load (not merely documented):**
`RESCUE_COOLDOWN_TURNS >= 2 * POSITIVE_SOCIAL_COOLDOWN_TURNS`. Per-row ranges alone are insufficient
(POSITIVE=8 requires RESCUE>=16, which is why the ceiling was raised 15 -> 16).

**Locked constants, NOT knobs:** `HOSTILE_INITIATIVE_LEVEL_GAP_MAX = 20`, `MAX_NPC_PER_SCENE = 3`.
**Referenced from other systems, never re-declared:** `song_tu_threshold = 60`, `deep_hostility_threshold = -80`,
`max_entities_per_prompt = 4`, `recency_window_turns = 8`, `TOUCH_TARGET_MIN = 44px`.
At defaults, ~56% of turns are `ambient_lull` (0.75 × 0.75) — the acceptable target % is an open question.

## A6. Edge Cases Resolved (L832-906)

1. AI returns an off-menu label -> hard downgrade to `rp_only`, text preserved, **no retry** caused.
2. Turn Manager generic fallback suggestions map hard: "Quan sát xung quanh"->`investigate`, "Chờ đợi"->`rp_only`,
   "Rời đi"->`move_to` to the first adjacent location by **safety-priority order** (non-`dangerous` first, then
   `dangerous`, tie-break = data declaration order); if `adjacent = {}` -> `rp_only`.
3. Free text describing a mechanical act without a chip -> `rp_only`, zero deltas, zero downstream calls.
4. A menu reduced to `{move_to, investigate, rp_only}` is legal (a "lull" turn) — no warning.
5. `adjacent(location_id) = {}` (authoring error) -> drop `move_to`, log one "content gap" warning, never crash.
6. `provoked` on an NPC whose gap is already <= 20 -> harmless no-op override, no UI/narrative distinction.
7. `provoked` while the player is far away -> the flag persists indefinitely (no decay) until presence allows.
8. Multiple eligible initiative NPCs -> only the tie-break winner is chosen; losers do **not** spend their
   per-NPC cooldown.
9. `global_window_ready` blocks despite an eligible NPC -> the hook falls to the World/Ambient tier; **no backlog**
   of missed opportunities is kept.
10. An NPC holding `provoked` dies before consumption -> `alive(npc)=false` already excludes it from every
    candidate set; clearing `provoked` is memory hygiene, not a required safety condition (two layers exist).
11. Multiple canon events due in one turn -> only `resolved_events[0]` becomes the hook; the rest add
    `canon_bg_[event_id]` to `scene_tags` (their facts already exist via `canon_event_[id]_status`).
12. Undo -> every tracker rolls back atomically (`provoked`, `provoked_consumed_ref`, all `last_used`, all 4
    `npc_last_initiated` valences, D.5 hook history); the recomputed menu is identical; only AI text differs.
13. Load / fresh start -> the scene is restored from `turn_snapshot` and the menu recomputes identically. At
    `world_time=0` the scene comes from the setting pack and the hook is `world_tier_hook(0)` (normally
    `ambient_lull_hook()`).
14. Affinity changes mid-turn -> the menu is **not** recomputed; gates are evaluated exactly once at scene lock.
15. `|hook_participants| > MAX_NPC_PER_SCENE` -> truncate in tier 0 by `(role.priority, npc_id)` + warning.
16. Missing/failed EXP data -> `hostile_initiative_allowed` defaults to `true`; `encounter_level_range(null)`
    returns a fixed coded fallback range; never throws (AC-41).

## A7. Interfaces with Other Systems (exact field names)

**Emits / provides:** `entities_in_scope` (also the witness list for `kill_witnessed`);
`classified_event_[npc_id]`, `encounter_initiated_[npc_id]`, `location_change_player` (locked_result fields, World
Memory entity_id convention); `at_location(npc, loc)` and `location(X)` predicates (Setting & Canon);
`canon_role_rescue(event_id, char_id)`; `combat_challenge(target, spar_friendly)` (Combat);
`encounter_level_range` output for ambient enemy generation; the `suggestion_call` payload = locked scene +
`allowed_envelope_menu` (response schema `array[4] {text, envelope}`, closed at `ai-llm-integration-layer.md`
AC-03); `turn_snapshot` contents for Persistence: scene, presence, `last_used`, `provoked`
(`{set_turn, source_event_ref}`), `provoked_consumed_ref`,
`npc_last_initiated[hostile|friendly|rescue|neutral_presence]`, D.5 hook-window history.

**Consumes:** `canon_due_payload(turn).resolved_events`, `status(E) == 'Suspended'`, `canon_outcome`,
`canon_role_npcs(location_id)`, `role.priority` (Setting & Canon); `affinity(npc)`,
`song_tu_relationship_active_npc_ids` (renamed from the obsolete `active_song_tu_set`), severity table D.1 (NPC
Affinity); `level(npc)`, `level(player)`, `stat_growth` (EXP); `alive(X)`, `death_flag_[char_id]` (Death &
Consequence); Turn Manager confirm/undo triggers and the `calls_per_turn <= 3` budget (this system adds 0 calls);
Contract Enforcement leak post-check for `rp_only` turns; a write path into Combat's
`external_abort_signal.requested` (trigger conditions still open).

## A8. Acceptance Criteria Checklist (IDs preserved)

- [ ] **AC-01** scene has exactly 4 fields; `entities_in_scope` = `{global, npc_Y, npc_B, npc_A}` (4 elems).
- [ ] **AC-02** `lock_scene()` precedes `suggestion_call()` in 50/50 simulated turns; menu final at call time.
- [ ] **AC-03** dispatch spy array equals `[combat_death, npc_affinity, canon, exp]` exactly.
- [ ] **AC-04** off-menu AI label -> `rp_only`, text kept, 0 retries triggered.
- [ ] **AC-05** menu computed twice with no intervening event is identical.
- [ ] **AC-06** no chip -> `rp_only`, 0 downstream calls; heuristic exposes only `suggest_chip()`.
- [ ] **AC-07** cooldown removes `gift[npc_A]` from **both** the chip path and the `suggestion_call` payload.
- [ ] **AC-08** `dangerous` tag blocks gift/small_help even when the cooldown has elapsed.
- [ ] **AC-09** song_tu 4-combination truth table = `false,false,true,true`.
- [ ] **AC-10** `save_life` hook-gated, ignores cooldown; disappears when the hook type changes.
- [ ] **AC-10b** `npc_in_danger` reachable through the **real** D.4/D.4b pipeline (no state injection).
- [ ] **AC-10c** neutral NPC reachable as hook; `scene_tags` gets `npc_reason_NPC_C`; tier 0 in D.6.
- [ ] **AC-11** hard priority canon > npc_initiated > ambient; always exactly 1 hook.
- [ ] **AC-12** `move_to` non-adjacent rejected without crash; adjacent succeeds after confirm.
- [ ] **AC-13** `at_location` reads the data-driven presence table, not affinity/hook.
- [ ] **AC-14** locked fields `location_change_player`, `encounter_initiated_npc_Y`, `classified_event_npc_Y`.
- [ ] **AC-15** turn-42 worked example menu matches; `song_tu_action[npc_B]` excluded in a `public` scene.
- [ ] **AC-16** cooldown boundary 3<4 false / 4>=4 true; `last_used` unchanged if merely offered.
- [ ] **AC-17** D.2 examples (+18 true, +35 false, −20 true, +35 with provoked true).
- [ ] **AC-18** one-sided predicate: gap −30 -> true (an abs-value implementation fails).
- [ ] **AC-19** property test, 500 samples, `seed=20260810`, `[1,300]²`.
- [ ] **AC-20** provoked lifecycle turns 20->24 (set, consume, clear).
- [ ] **AC-20b** a new SET in the same turn as consumption survives the CLEAR.
- [ ] **AC-21** no decay over 50 turns; reconciliation at exactly −10 clears, −11 does not.
- [ ] **AC-22** severity boundary `false,true,true,true,true` (insult/threaten/betray/combat_win/kill_witnessed).
- [ ] **AC-23** turn-23 example: hostility rank wins the tie-break.
- [ ] **AC-24** tie-break levels 2 and 3 are deterministic.
- [ ] **AC-25** empty candidates -> `world_tier_hook` returns one of 4 values, never null, never throws.
- [ ] **AC-26** D.5 turns 23/25/27: two-tier cooldown + valence separation.
- [ ] **AC-27** D.6 tier ordering, exactly 4 elements.
- [ ] **AC-28** truncation above the cap by `role.priority`, exactly 1 warning logged.
- [ ] **AC-29** D.7 `[20,50]` at pl=35; `[1,20]` at pl=5.
- [ ] **AC-30** property test 1000 samples, `seed=20260810b`, cap invariant <= 20 at caps 5/15/20.
- [ ] **AC-30b** `encounter_level_range` called exactly once with the turn's `player_level`.
- [ ] **AC-31** fallback suggestion mapping incl. `adjacent = {}` -> `rp_only`.
- [ ] **AC-32** minimal legal menu, no warnings.
- [ ] **AC-33** `adjacent = {}` drops `move_to`, logs 1 warning, no exception.
- [ ] **AC-34** dead NPC excluded from candidates **and** from `entities_in_scope`.
- [ ] **AC-35** multiple canon due -> first only + `canon_bg_event_B` tag.
- [ ] **AC-36** mid-turn affinity change does not recompute the menu.
- [ ] **AC-37** tie-break loser does not spend cooldown.
- [ ] **AC-38** load/restore reproduces the menu; `world_time=0` initialization works.
- [ ] **AC-39** undo rolls back all trackers; menu identical (BLOCKING), AI text may differ (ADVISORY).
- [ ] **AC-40** the `canon_role_rescue` menu entry exposes no candidate `char_id` list.
- [ ] **AC-40b** string-match resolution: exactly 1 match resolves, 0 or >=2 -> `rp_only`, **0 AI calls**.
- [ ] **AC-40c** `spar_friendly` popup: exactly 2 options, no implicit default, correct param per choice.
- [ ] **AC-41** EXP failure tolerated (D.2 defaults to true, D.7 uses a fixed fallback).

Test location/naming per GDD: `tests/unit/situation-encounter-generation/`, story type **Logic / BLOCKING**; all
external systems and both RNG streams must be injectable mocks; fixture = the knob defaults in A5.

## A9. Open Questions / Ambiguities (encounter)

1. The location graph, NPC presence table and `scene_tags` data for the MVP region (~5–8 locations, 3 NPCs) is
   unauthored. **Required**: at least one named NPC with `level − level(player) > 20` placed and present often
   enough (D.7 caps ambient at 20, so this is the only path to the "readable danger" anchor).
2. `spar_friendly` has a declaration path but **no distinct economic effect** — NPC Affinity still applies the
   same `combat_win/loss_vs_npc` deltas.
3. Full stat-block generation for ambient enemies (D.7 yields level only; the `stat_growth` pipeline is unconfirmed).
4. `external_abort_signal.requested` trigger conditions, the Combat API to call, and `reason_tag` content are
   undefined — this system owns the decision but has not specified it.
5. UX spec missing for chips/nudge/scene header: chip overflow strategy for ~15–25+ chips, and the concrete nudge
   matching algorithm (currently only "matches keyword patterns", no negation list).
6. Concealed cultivation levels break "readable danger": D.2 has no branch distinguishing `level=null` (missing
   data) from a level deliberately hidden by an NPC.
7. The 12-envelope taxonomy lacks non-emotional leverage (alliance, information trade) — probably belongs to
   Setting & Canon premises; re-evaluate after the vertical slice.
8. `betray` has no relationship precondition (its gate equals `insult`'s) — design decision pending.
9. `entities_in_scope` conflates the presentation cap with witness simulation; splitting `witnesses` (uncapped)
   from `entities_in_scope` (capped) is structural debt due before Alpha.
10. Target % for `ambient_lull` (~56% at defaults) is unvalidated by playtest.
11. Missing AC coverage: `combat_challenge` with `alive=false`, guard-rail AC that negative envelopes stay
    available under `dangerous`, and separate `gift` vs `small_help` trackers for the same NPC.

---

# PART B — PERSISTENCE / SAVE SYSTEM

## B1. Purpose

Saves and restores the whole game state — protagonist stats/EXP/realm/equipment/skills, per-NPC affinity, and
World Memory's full narrative journal — across browser sessions. The player never presses "Save": the system
writes atomically at fixed checkpoints and **gates the Turn Manager's state transitions on durable write success**
(write-ahead), so "Turn Confirmed" is by construction equivalent to "persisted". Each slot is one independent
playthrough ("a diary volume"); a closed slot (death or exhausted quota) becomes permanently read-only but stays
fully readable. Persistence is **opaque** to blob contents: it collects one blob per registered system, guarantees
all-or-nothing consistency between them, and never interprets what is inside.

## B2. Core Rules (numbered; refs = GDD line ranges)

**R1 — Auto-save at 3 checkpoints, gated on `durability_confirmed`** (L64-106). (1) Immediately **before** Turn
Manager transitions Resolving -> **Turn Confirmed** (after narration is produced); (2) immediately **before**
Undoing completes back to **Awaiting Action**; (3) **hack-write commit** (Character Customization Mode, system
#16) — a write-through commit at the moment of submit/delete, outside the turn cycle entirely, gating no Turn
Manager transition. Checkpoints (1) and (2) are hard gates: the transition may occur only once
`durability_confirmed = true`. No writes happen in the middle of Resolving or Undoing steps.

**R2 — The bundle is many independent blobs owned by their source systems** (L108-114). Persistence collects one
blob per registered system, guarantees consistency across them, and never validates blob content; correctness of
a blob's interior belongs to the owning GDD.

**R3 — Atomic write + explicit durability + append-only strategy** (L116-228). One turn's bundle is written as
ONE transaction — never a half-written state. `durability_confirmed(write)` is `true` only when the storage
backend's full durability chain has completed (not merely when the high-level write call returned). Per-turn cost
must be ~constant, not `O(world_time)`: each confirmed turn persists only the **increment** (1 new turn record +
changed "current state" blobs), plus a **periodic full-bundle flush** that runs off the critical path and must
**merge old turn records into a snapshot and delete the merged records** (otherwise record count grows without
bound). Internal 2-phase seam owned by this GDD regardless of backend: `stage(blobs[])` then `commit()` /
`abort()` — the DI test seam for AC-03/AC-17/AC-22.

**R4 — A failed write blocks the transition; nothing is ever retroactively revoked** (L230-245). If the atomic
write fails before Turn Confirmed, the turn is not confirmed, `world_time` does not increase, the player gets a
clear message using one Error Taxonomy code, control returns to Awaiting Action, and the last valid on-disk state
is preserved. Same for a failed post-Undo write: the Undo is treated as not having happened; the previous Turn
Confirmed state and its Undo button remain.

**R5 — One slot = one playthrough, bound to one browser on one device; no multi-device sync in MVP** (L247-273).
Storage is per-origin per-device: opening the game on another device shows an empty Save Slot Screen (not an
error). No hard slot-count limit — only browser quota. New slots are created (a) by "Bắt đầu mới", (b)
automatically by "Chơi lại" after a real death (the just-finished playthrough, containing the turn with
`is_death_turn=true`, is locked in its old slot). **The system never auto-deletes or overwrites a closed slot**;
only the player can delete it, via a dedicated escalated confirmation.

**R6 — A closed slot is read-only** (L275-285). A slot whose `slot_closure_reason` is set (`death` or
`quota_exhausted`) cannot be played further but opens fully for reading the journal. Only `death` makes
`continuation_choice_eligible` possible (gated on `is_death_turn AND death_confirmed`, not on
`slot_closure_reason` generally).

**R7 — Lossless-only compression, and the compression unit must equal the write unit** (L287-304). Logical content
must be byte-identical after decompression. If compression is adopted, its unit is either (a) per turn record or
(b) only at the periodic full flush — **never re-compressing the whole journal on each ordinary turn**. ADR-0002
D5 chose: no compression in MVP (`compression_ratio = 1`); if adopted later, unit (b) only.

**R8 — The bundle is versioned** (L306-334). Every bundle carries `schema_version`. On load, any mismatch (older
**or** newer) is rejected with `LOAD_REJECTED_VERSION_MISMATCH` — never a silent guess or implicit migration.
**Process rule**: `schema_version` must be bumped when `N` changes (a system registers/unregisters a blob) **and**
whenever *any* registered system changes its internal blob format (Persistence cannot detect this at runtime,
being opaque) — ADR-0002 D6 adds a third trigger: any change to a store's physical key shape.

**R9 — Two separate export artifacts** (L336-384). **9a QA log (JSON, technical)**: every turn of a playthrough as
an object with **exactly 5 keys** — `turn_id`, `action`, `locked_result`, `narration_text`, `world_time` — ordered
by ascending `world_time`; may live behind a QA/debug surface only. **9b "Chép lại quyển sổ" (player-facing
keepsake)**: a Vietnamese human-readable text produced by concatenating `narration_text` in `world_time` order,
exposing **no** technical field names and **no** mechanical blobs; it must never be called a "backup" and has
**no import path**. Both read the latest committed state and never modify the save.

**R10 — Dignified closure when quota is fully exhausted** (L386-428). After
`max_write_retry_before_escalation` consecutive write-only retries fail with the same
`error_code in {WRITE_FAILED_QUOTA, WRITE_FAILED_UNSUPPORTED}`, the player is offered an explicit action **"Khép
quyển sổ này lại"**: the slot becomes read-only with `slot_closure_reason = quota_exhausted` at the last valid
commit. This is not a delete (no successfully written turn is lost), does not set `is_death_turn`, does not
trigger Character Continuation, and does not replace the escalation banner + Save-Slot-Screen navigation button.

## B3. State / Data Model

```ts
type SlotId = string;                       // repo reality: 1..5 for the GitHub mirror; unlimited locally
type ErrorCode =
  | 'WRITE_FAILED_QUOTA' | 'WRITE_FAILED_UNSUPPORTED' | 'LOAD_REJECTED_VERSION_MISMATCH'
  | 'MULTI_TAB_CONFLICT' | 'LOAD_FAILED_UNREADABLE'                    // 5 player-visible codes
  | 'BLOB_MISSING' | 'BLOB_ERROR' | 'CONFIG_ERROR_NO_SYSTEMS_REGISTERED'
  | 'WRITE_FAILED_INTERNAL';                                           // ADR D2: stage() over budget

interface SlotRecord {                      // store `slots`, key = slot_id — Persistence-owned metadata,
                                            // NOT opaque (Core Rule #2 does not apply to these fields)
  slot_id: SlotId;
  schema_version: number;                   // bumped per R8 triggers
  slot_closure_reason: 'death' | 'quota_exhausted' | null;   // null = still playable
  world_time_latest: number;                // 0 at creation
  created_at: number;                       // epoch ms
  last_saved_at: number;                    // epoch ms — drives the "chép lại" soft prompt
  character_name: string;                   // used by the escalated delete confirmation
  byte_accounting: { fixed_blob_bytes: number; sum_turn_record_bytes: number };  // Formula #1/#3 inputs
  readable: boolean;                        // false => LOAD_FAILED_UNREADABLE state, row stays listed
}

interface TurnRecord {                      // store `turn_records`, key = [slot_id, world_time, hack_seq]
  turn_id: string; action: unknown; locked_result: unknown;
  narration_text: string; world_time: number;
  // hack_seq = 0 for ordinary turn-confirm writes; 1,2,3... for hack-write commits at the same world_time.
  // next hack_seq = 1 + max(existing hack_seq for that [slot_id, world_time]) — derived from storage on
  // slot-open, NEVER an in-memory counter (ADR-0002 D1b, silent-overwrite hazard).
}

interface SnapshotRecord {                  // store `snapshots`, key = [slot_id, world_time_at_flush]
  bundle: Record<SystemId, string>;         // one serialized blob per registered system
  schema_version: number; world_time_at_flush: number;
}

type BlobStatus = 'OK' | 'MISSING' | 'ERROR';
interface Blob { status: BlobStatus; bytes: string; }   // ONE atomic get_blob() per system (TOCTOU rule)

interface PendingWriteCache {               // survives write retries only
  slot_id: SlotId; locked_result: unknown; narration_text: string;
  consecutive_failures: number; last_error_code: ErrorCode;
}
```

**Registered systems (`N`)**: Turn Manager (`state`, `last_confirmed_turn_id`, `undo_available`,
`turn_snapshot`), World Memory (full journal; the AI context frame is optional cache), Equipment & Skill Data
(`known_skill_ids`, owned/equipped items), Character Card & Identity (**Entity Record** blob: `base_X0`,
`npc_tag`, `concealment` instance), plus NPC Affinity, Combat, EXP, Death & Consequence, Setting & Canon,
Situation/Encounter Generation as they are integrated. Registration must be **idempotent by `system_id`**; `N` is
snapshotted at the start of a gather and held constant for that write.

**Autosave cadence**: every confirmed turn, every completed undo, every hack-write commit; **full flush every
`FLUSH_EVERY_N_TURNS = 50` confirmed turns**, off the critical path (during Awaiting Action idle), writing the new
snapshot and deleting the compacted turn records in the **same** transaction.

**Namespacing (app_config vs save data)** — *not specified by the GDD; recorded as an inference + gap*: the save
bundle contains only registered-system blobs plus Persistence's own slot metadata. Tuning knobs, API keys, theme,
and QA/debug flags are app-level configuration and must live in a separate namespace outside the bundle; they must
not affect `N` or `schema_version`.

**Checksum** — *not specified anywhere in GDD #6 or ADR-0002*. Integrity is guaranteed structurally by
transaction atomicity, and content loss outside the app's control is detected only as
`LOAD_FAILED_UNREADABLE`. If a checksum is added (recommended for the GitHub/Firestore mirrors, where writes are
not transactional), it is a new field and therefore a `schema_version` bump under R8.

## B4. Formulas & Algorithms

### Save path (per checkpoint)
```
save_checkpoint(slot, reason in {turn_confirm, post_undo, hack_write}):
  if slot.slot_closure_reason != null: reject          // R6, closed slots never receive writes (AC-06)
  N = snapshot_registered_system_count()               // idempotent by system_id; frozen for this write
  if N < 1: log CONFIG_ERROR_NO_SYSTEMS_REGISTERED; commit_allowed = 0; return failure
  blobs = [ system.get_blob() for system in registered ]     // ONE atomic call each (TOCTOU rule)
  if elapsed(stage) > blob_gather_timeout_ms (=100): log + WRITE_FAILED_INTERNAL   // post-hoc assertion
  if not commit_allowed(blobs): log BLOB_MISSING / BLOB_ERROR with system_id; return failure   // Formula #2
  stage(blobs)                                          // pure, synchronous, no I/O — the DI test seam
  commit()                                              // ONE readwrite transaction:
                                                        //   put turn_record [slot_id, world_time, hack_seq]
                                                        //   put changed "current state" blobs
  on durability_confirmed:                              // == transaction oncomplete
      update measured_total_bytes; evaluate Formula #3 warning
      allow Turn Manager transition (checkpoints 1 and 2 only)
      clear pending_write_cache
  on failure(error_code):
      abort(); keep last valid state; store pending_write_cache; surface the diegetic message; stay in
      Awaiting Action (R4)
```

### Load path
```
load_slot(slot_id):
  if not acquire_slot_lock(slot_id): return MULTI_TAB_CONFLICT     // detected at OPEN, not at action time
  meta = read slots[slot_id]
  if meta unreadable or records unreadable and no active write: return LOAD_FAILED_UNREADABLE
                                                                  // slot stays listed, marked unreadable
  if meta.schema_version != CURRENT_SCHEMA_VERSION: return LOAD_REJECTED_VERSION_MISMATCH   // both directions
  snap = latest snapshots[slot_id]
  records = turn_records where world_time > snap.world_time_at_flush, ordered by (world_time ASC, hack_seq ASC)
  state = apply(snap.bundle); for r in records: apply(r)
  // hack_seq = 0 (the turn's own confirmed result) applies before any hack-write at the same world_time
```

### Formula #1 — bundle growth and quota projection (L533-560, edge cases L563-640)
```
bundle_size_bytes(world_time) = fixed_blob_bytes + world_time * avg_turn_record_bytes * compression_ratio
quota_exhaustion_turn(quota_bytes) =
    0                                   if quota_bytes <= fixed_blob_bytes
                                        OR quota_bytes unmeasurable/NaN/undefined  (fail-safe, worst case)
    SENTINEL 'not measured'             if avg_turn_record_bytes <= 0 OR compression_ratio <= 0
                                        (never divide, never Infinity/NaN)
    floor((quota_bytes - fixed_blob_bytes) / (avg_turn_record_bytes * compression_ratio))   otherwise
// planning default compression_ratio = 1 ALWAYS (worst case); a measured ratio > 1 is clamped to 1.
// The value is the LAST world_time that still fits (off-by-one clarified 2026-08-07). Planning only —
// never a hard gate; R4 is the real enforcement.
```
Worked example (AC-10): `fixed=50_000`, `avg=800`, `ratio=1` -> `bundle(1000)=850_000`,
`bundle(50_000)=40_050_000`; with `quota=10_485_760` -> `quota_exhaustion_turn = 13_044`; with `ratio=0.3` ->
`43_482`.

### Formula #2 — bundle completeness before commit (L644-700)
```
ok(s) = 1 if blob_status(s) == 'OK' else 0
is_complete(bundle) = 1 if (N >= 1) AND (SUM(ok(s)) == N) else 0      // INTEGER comparison, never float ==1.0
commit_allowed(bundle) = is_complete(bundle) AND (N >= 1)
completeness_ratio(bundle) = (1/N) * SUM(ok(s))   // DIAGNOSTIC ONLY; if N == 0 skip the division and set the
                                                  // sentinel "not applicable" (never 0, NaN or Infinity)
```
A system with nothing to store must return a valid empty/default blob with `status = OK` — never `MISSING`. A
system that unregisters or crashes mid-gather counts as `ERROR` and **must not shrink `N`**.

### Formula #3 — quota utilization warning, ORIGIN scope (L707-818)
```
utilization_ratio(origin) = measured_total_bytes(origin) / quota_bytes_total(origin)
warn_triggered(origin)    = 1 if utilization_ratio >= quota_warn_threshold else 0
// measured_total_bytes = sum of the real byte sizes of ALL slots in the origin, recomputed right after any
// successful atomic write of ANY slot (never the single writing slot's size).
// If quota_bytes_total <= 0 (negative sentinels included) or unmeasurable/NaN -> do NOT divide;
// warn_triggered = 1 by default (worst-case assumption). utilization_ratio > 1 needs no special branch.
```

### Slot lifecycle operations
- **Create slot**: new unique `slot_id`, empty bundle, touches no other slot.
- **Close slot**: triggered by Death & Consequence Branch A step c immediately on `death_confirmed`
  (`slot_closure_reason = 'death'`), or by the player's quota-closure action (`'quota_exhausted'`).
- **Delete slot** — two different frictions: an **ordinary 1-step confirmation** for an in-progress slot and for
  an unreadable slot; an **escalated confirmation** for a closed slot, requiring the player to retype the
  character name. Comparison rules: normalize both sides to **Unicode NFC**, **trim**, compare
  **case-insensitively**. If the stored name is empty after NFC+trim, require the literal fallback string
  **"XÁC NHẬN"** instead.
- **Retry-only write**: on a persistent failure, `pending_write_cache` retains the already-computed
  `locked_result`/`narration_text`; resending the identical action retries **only the write**, never a new AI
  narration call. The cache is cleared when (a) a retry succeeds, (b) the player submits a different action, or
  (c) the player leaves the slot.
- **Multi-tab**: one lock per slot, acquired when the slot is opened, held for the session, rejected
  **instantly** (never queued) when already held, and auto-released on tab close/crash.

### Slot UI rules (data contract only; layout belongs to `core-ui-screen-navigation.md`)
Each slot row shows: character name, current realm, `world_time`, status (in progress / closed / unreadable), and
last-saved time (omitted when unreadable). Actions by state — **in progress**: "Tiếp tục", "Chép lại quyển sổ",
"Xóa" (1-step), plus "Khép quyển sổ này lại" while in quota escalation; **closed**: "Xem lại" (read-only journal),
"Chép lại quyển sổ", "Xóa" (escalated); **unreadable**: "Xóa" only. "Bắt đầu mới" is always available. **Backup
prompt threshold**: if `now - last_saved_at` exceeds a soft threshold (~5–6 days, below the ~7-day Safari ITP
eviction window; the exact value is a `/ux-design` decision), that row shows a faint diegetic line inviting "Chép
lại quyển sổ" — never a blocking banner. Error surfaces: write failures -> banner on the play screen (may preempt
an open quota banner); version mismatch and multi-tab conflict -> banner on the Save Slot Screen; unreadable slot
-> a permanent label on the row, not a banner. All five player-visible codes are distinguished **by Vietnamese
text only** — no icons, no colour coding; raw `error_code` values are never shown to players.

## B5. Tuning Knobs (L1014-1031, plus ADR constants)

| Knob | Default | Safe range | Effect |
|---|---|---|---|
| `quota_warn_threshold` | 0.85 | 0.7–0.9 | Origin-level early warning point (Formula #3). Too low = nagging false alarms; too high = the warning arrives on the same turn as the real failure. |
| `max_perceived_autosave_latency_ms` | 150 | 100–300 | Budget for one ordinary append-only write measured **end-to-end to `durability_confirmed`** (gather + serialize + durability). Periodic full flush is explicitly out of this budget. |
| `max_write_retry_before_escalation` | 3 | 1–5 | Consecutive write-only retries with the same persistent `error_code` before the banner gains a direct Save-Slot-Screen navigation button and new actions are blocked. |
| `blob_gather_timeout_ms` (ADR D2) | 100 | — | Post-hoc assertion on synchronous `stage()`; exceeding it logs `WRITE_FAILED_INTERNAL`. |
| `FLUSH_EVERY_N_TURNS` (ADR D1) | 50 | data-driven | Full-flush cadence; trades load-merge work against per-flush cost, both off the critical path. |

Not knobs: `fixed_blob_bytes`, `avg_turn_record_bytes`, `compression_ratio`, `quota_bytes*` (measured values) and
`schema_version` (a release-bound technical value).

## B6. Edge Cases Resolved (L820-946)

1. Browser/OS killed mid-write -> the next load must show the pre-write state exactly; an uncommitted write never
   happened.
2. Same slot opened in two tabs -> only the first holder may write; the second is blocked read-only with
   `MULTI_TAB_CONFLICT`, detected at slot open (so no typed input can be lost).
3. Deleting a **closed** slot -> escalated confirmation (retype character name, NFC + trim + case-insensitive;
   empty stored name -> literal "XÁC NHẬN"); irreversibility stated explicitly.
4. Deleting an **in-progress** slot -> ordinary 1-step confirmation, no pre-locking; the slot reads as
   non-existent immediately afterwards.
5. `schema_version` mismatch in **either** direction -> refuse to load, no partial application, no implicit
   migration.
6. `bundle_completeness_check` failing for many consecutive turns -> the player is never trapped: leaving to the
   Save Slot Screen, opening another slot and starting a new one all still work, and QA export still reads the
   last commit of the broken slot.
7. First-turn write failure (e.g. Safari private mode) -> `WRITE_FAILED_UNSUPPORTED`, whose message must differ
   from the ordinary quota message.
8. A previously-written slot that no longer reads back with no write in flight -> `LOAD_FAILED_UNREADABLE`; the
   slot **stays listed**, labelled unreadable, is never auto-deleted and never shows stale/fake data.
9. Persistent write failure + identical resend -> write-only retry from `pending_write_cache` (exactly 1 AI
   narration call across the whole retry chain), escalating after `max_write_retry_before_escalation`.
10. QA export invoked while a write is in flight -> always reads the latest **committed** state, never a partial
    one; no separate lock is needed.
11. "Chơi lại" chosen while browsing a *different* closed slot -> the new slot is scoped to the slot that just
    ended in death; the browsed slot is byte-for-byte untouched.
12. Empty journal on the first write (`world_time=0`) -> the write still happens (never optimized away); after it,
    `world_time = 1` with exactly 1 turn record.
13. Unmeasured `avg_turn_record_bytes` / quota -> formulas never block saving or loading; they are planning and
    warning tools only.
14. Undone turns never count toward `world_time` and their record must not appear in the journal after the
    post-undo write.

## B7. Interfaces with Other Systems (exact field names)

**Consumes / is triggered by:** Turn Manager (checkpoints; reads/writes `state`, `last_confirmed_turn_id`,
`undo_available`, `turn_snapshot` as an opaque blob), Death & Consequence (invokes **Close slot** at Branch A
step c on `death_confirmed`; `is_death_turn`), Character Continuation (invokes **Create slot** on "Chơi lại";
reads `continuation_choice_eligible`, which is gated on `is_death_turn AND death_confirmed`, never on
`slot_closure_reason`), Character Customization Mode #16 (hack-write commits through the same
`stage()`/`commit()` seam), and each registered system through `get_blob() -> {status, bytes}`.

**Provides:** `durability_confirmed` as the gate signal for Turn Manager transitions; `slot_closure_reason`
(`death` | `quota_exhausted`) and slot metadata to the Save Slot Screen; the Error Taxonomy codes; QA export (9a)
and keepsake export (9b); storage for the **Entity Record** blob (Character Card & Identity); storage of
Situation/Encounter Generation's scene/presence/cooldown/`provoked`/`npc_last_initiated`/hook-window state inside
`turn_snapshot`.

**Process obligation propagated to every blob owner:** any internal blob-format change requires a
`schema_version` bump; Persistence cannot detect it (R8).

## B8. Acceptance Criteria Checklist (IDs preserved)

- [ ] **AC-01** exactly 2 turn-cycle write invocations (confirm + undo), zero before them, and the transition
      fires only after a **separately fired** `durability_confirmed` event (test-controlled, never a real timer);
      the undone turn's record is absent and `world_time = W-1` afterwards.
- [ ] **AC-02** opaque blobs: no content-based rejection; round-trip returns each system's sentinel unmixed.
- [ ] **AC-03** failure between blob 2 and 3 leaves the pre-write bundle intact; no half state observable.
- [ ] **AC-04** quota failure -> `world_time` unchanged, no Turn Confirmed, `WRITE_FAILED_QUOTA`, last valid state
      still readable.
- [ ] **AC-05** new slot uses a fresh `slot_id`, touches no other slot; after "Chơi lại" the old slot is
      byte-identical.
- [ ] **AC-06** closed slot rejects auto-save but reads the full journal without restriction.
- [ ] **AC-07** lossless compression round-trip is byte-identical for **every** blob in the bundle.
- [ ] **AC-08** version mismatch rejected in both directions with `LOAD_REJECTED_VERSION_MISMATCH`, no partial
      application; exact match loads normally.
- [ ] **AC-09** QA export: M objects in `world_time` order, key set **exactly** the 5 fields, no extra key at
      object or top level; source save unchanged.
- [ ] **AC-09b** keepsake export: continuous text, no JSON structure, no technical field names, no mechanical
      numbers; source save unchanged.
- [ ] **AC-10** Formula #1 worked examples (850_000 / 40_050_000 / 13_044 / 43_482).
- [ ] **AC-11** `bundle_size_bytes(0) == fixed_blob_bytes`; omitted `compression_ratio` defaults to 1.
- [ ] **AC-12** `N=3` with one ERROR -> ratio ≈0.667, `commit_allowed=0`, log `BLOB_ERROR` + `system_id`; all OK ->
      1/1/1.
- [ ] **AC-13** `N=0` -> `commit_allowed=0`, log `CONFIG_ERROR_NO_SYSTEMS_REGISTERED`, no division performed;
      a MISSING blob logs `BLOB_MISSING` + `system_id`.
- [ ] **AC-14** a valid empty blob (`status=OK`) keeps `commit_allowed=1`.
- [ ] **AC-15** Formula #3 origin-scope example (0.858 -> warn=1; 8_000_000 -> warn=0; small slot + large sibling
      still warns).
- [ ] **AC-16** unmeasurable/0/negative quota -> `warn_triggered=1`, no divide-by-zero, no NaN.
- [ ] **AC-17** (logic) crash between `stage()` and `commit()` -> a fresh instance loads the pre-stage state;
      (real-tech, ADR-blocked) backend genuinely rolls back an interrupted transaction.
- [ ] **AC-18** second session blocked with `MULTI_TAB_CONFLICT` (single-threaded sequential mock is valid);
      first session unaffected.
- [ ] **AC-19** escalated delete: bypassing confirmation fails; wrong name fails; correct name (with NFC / trim /
      case / NFD variants accepted) deletes permanently; empty stored name requires "XÁC NHẬN".
- [ ] **AC-20** persistent completeness failure never traps the player; QA export still works on the last commit.
- [ ] **AC-21** first-turn failure in private mode -> `WRITE_FAILED_UNSUPPORTED`, distinct from
      `WRITE_FAILED_QUOTA`.
- [ ] **AC-22** (logic) export during an unresolved `commit()` returns the previous commit; after the test
      resolves commit, the new turn appears; (real-tech, ADR-blocked) concurrent read/write isolation.
- [ ] **AC-23** silently-lost slot -> `LOAD_FAILED_UNREADABLE`, distinct from write/version codes; row stays
      listed and marked.
- [ ] **AC-24** duplicate registration does not double `N`; a mid-gather unregister yields `ERROR` and keeps `N`.
- [ ] **AC-25** measurement errors (`<=0` values) -> "not measured" sentinel, no division, no exception.
- [ ] **AC-26** `quota_bytes <= fixed_blob_bytes` or unmeasurable -> `quota_exhaustion_turn = 0`.
- [ ] **AC-27** "Chơi lại" while browsing another closed slot scopes to the death slot only.
- [ ] **AC-28** `utilization_ratio > 1` needs no special branch; `warn_triggered = 1`.
- [ ] **AC-29** (logic) `write_duration_ms` over `max_perceived_autosave_latency_ms` logs exactly one budget
      violation, never blocks the turn; (real-tech, ADR-blocked) end-to-end measurement on the real backend.
- [ ] **AC-30** deleting an in-progress slot requires the ordinary confirmation only.
- [ ] **AC-31** retry-only path costs exactly 1 AI narration call across N retries; escalation adds the
      navigation button and blocks new actions; `pending_write_cache` clears on success, on a different action,
      and on leaving the slot.
- [ ] **AC-32** no automatic error path ever reads/writes/deletes another slot, even under repeated quota failure.
- [ ] **AC-33** after an abrupt tab death the lock is released so a later tab is not falsely blocked
      (ADR-blocked).
- [ ] **AC-34** append-only cost: written payload bytes are independent of `K` existing turn records (K=10 vs
      K=10_000); a full-flush turn does not delay the transition.
- [ ] **AC-35** quota closure sets `slot_closure_reason='quota_exhausted'`, keeps every previously written turn,
      leaves `continuation_choice_eligible = 0`, and behaves like a death-closed slot when reopened.
- [ ] **AC-36** `is_complete` at `N=0` is 0 (or the "not applicable" sentinel), never 1.
- [ ] **AC-37** `blob_status=ERROR` logs `BLOB_ERROR` + `system_id`, distinct from `BLOB_MISSING`.
- [ ] **AC-38** the very first turn triggers exactly 1 atomic write (never optimized away); afterwards
      `world_time=1` and exactly 1 turn record exists.

## B9. Open Questions / Ambiguities (persistence)

1. **Real-device matrix (#4) still open** — `navigator.locks` availability and Safari/iOS ITP behaviour must be
   measured on real devices before public deploy; `navigator.storage.persist()` was **denied** even on desktop
   headless Chrome, so ITP eviction risk is real. Not implementation-blocking.
2. **`turn_snapshot` schema is still undefined** — Persistence deliberately treats it as an opaque blob, so Turn
   Manager's original open question (which fields, who owns them) remains open.
3. **Post-launch `schema_version` migration strategy** — pre-1.0 accepts save-breaking bumps; a real migration
   plan is mandatory before the first external player (future ADR supersedes ADR-0002 D6 only).
4. **Compression algorithm** — none in MVP; if adopted, unit (b) only (full-flush snapshots).
5. **Multi-slot quota accounting** — per-slot byte counters are self-maintained; `estimate()` measures only the
   whole origin; the 0.85 margin absorbs browser fuzzing.
6. **Checksum/integrity verification is not specified at all** (see B3) — a genuine gap for the non-transactional
   GitHub/Firestore mirrors.
7. **Save Slot Screen virtualization/pagination** for long lists belongs to `core-ui-screen-navigation.md`.
8. **Blob-gather timeout semantics**: `blob_gather_timeout_ms` is a post-hoc assertion, not a watchdog — a hung
   synchronous gather cannot be preempted on a single thread.
9. One-directional dependency gap: `equipment-skill-data-system.md` (Approved) does not list Persistence in its
   own Dependencies; to be fixed with a `systems-index.md` footnote.

---

# PART C — GODOT-SPECIFIC ITEMS TRANSLATED TO THE WEB STACK

The GDD/ADR text is written for Godot 4.6 HTML5 export. The project pivoted to React + Vite on 2026-08-14. The
following mappings preserve the *contract*; only the mechanism changes.

| GDD/ADR item (Godot) | Web/TS equivalent |
|---|---|
| `FileAccess` / `user://` over IDBFS (rejected option (a)) | Not applicable — no virtual FS. Use IndexedDB directly. |
| `JavaScriptBridge` glue (`get_interface`/`create_object`/`create_callback`), the `eval()` ban, marshalling limits, `PackedByteArray` failing silently, `str(i)` indexing quirks, GC-collected callbacks, `.call()` collisions | **All obsolete.** In TS the IndexedDB API is called natively; no bridge, no marshalling, no base64 workaround. `Marshalls.raw_to_base64()` is unnecessary — store structured values directly (IDB supports the structured clone algorithm) or `JSON.stringify()` them. |
| `durability_confirmed` = `transaction.oncomplete` reaching GDScript | `durability_confirmed` = the IndexedDB `transaction.oncomplete` event; wrap the transaction in a Promise resolved on `oncomplete` and rejected on `onerror`/`onabort`. Gate the turn-state transition on `await` of that Promise. |
| `syncfs()` observability problem (the entire reason option (b) won) | Does not exist in the web build. The controllability argument is satisfied natively. |
| Web Locks held via `Promise.resolve.bind(Promise, pendingPromise)` (workaround for Callable return values not crossing the bridge) | Plain `navigator.locks.request('slot-'+id, {ifAvailable:true}, () => holdPromise)` — a JS callback may simply return a pending Promise. Keep `{ifAvailable:true}` (instant rejection, AC-18) and the auto-release-on-tab-close behaviour (AC-33). Keep the heartbeat fallback only for browsers lacking `navigator.locks`. |
| GDScript `@abstract class StorageBackend` with `committed`/`failed` signals | A TS interface `StorageBackend { stage(blobs): void; commit(): Promise<void>; abort(): void }` behind DI, with a real IDB implementation and a mock that can fail between `stage` and `commit` (AC-17) or hang inside `commit` (AC-22). |
| `get_blob() -> {status, bytes: String}` | `getBlob(): { status: BlobStatus; bytes: string }` — one atomic call per system (TOCTOU rule preserved). |
| Godot test runner / `situation_gen_[feature]_test.gd` | Vitest (per `technical-preferences.md`, still "TO BE CONFIGURED"): `tests/unit/situation-encounter-generation/*.test.ts`, `tests/unit/persistence/*.test.ts`; keep the `test_[scenario]_[expected]` naming intent and the pinned seeds `20260810` / `20260810b`. |
| `'wasm-unsafe-eval'` CSP requirement | Not needed for a plain React build; keep the general CSP-hostility note for the host. |

**Current repository reality vs the GDD** (verified in `App.tsx` and `saves/`): saves live in IndexedDB
(`autosave_*`, `manual_N_*` keys), are mirrored to Firestore, and pushed to a GitHub repo as
`saves/slot_1.json` … `saves/slot_5.json` plus `saves/index.json` (`{ slots: [...] }`, slot cleared by writing
`null`). Divergences the implementer must reconcile:

1. **Manual save exists today** ("Lưu Ngay", 5 GitHub slots) — GDD R1/Player Fantasy specify **no manual save
   button** and unlimited local slots. Either the GDD's slot model is adapted (GitHub = a mirror/backup channel,
   not the slot model) or the rule is formally amended.
2. **The GitHub/Firestore mirrors are not transactional** — R3's all-or-nothing guarantee holds only for the
   IndexedDB write. The mirrors must be treated as best-effort, must not gate `durability_confirmed`, and should
   carry a checksum (see B9 item 6).
3. **`schema_version`, `slot_closure_reason`, `readable`, `world_time_latest`, `character_name`,
   `last_saved_at` are not present in the current save shape** — they are required by R6/R8/R10 and by the slot
   UI contract; adding them is itself a `schema_version`-bump event.
4. **Append-only turn records / periodic full flush are not implemented today** (whole-state saves). This is the
   single largest gap against R3 and AC-34; the `[slot_id, world_time, hack_seq]` keyed record store is the
   prescribed shape.
5. **Web Locks / multi-tab conflict handling is absent** — required by R5-adjacent Edge Case 2, AC-18 and AC-33.
