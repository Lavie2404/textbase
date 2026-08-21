/**
 * Shared vocabulary for every deterministic gameplay system under `src-web/systems/`.
 *
 * Design docs: production/gdd-integration/plan.md (P0), gdd-01 (Turn Manager /
 * Contract Enforcement), gdd-02 (EXP & Equipment), gdd-03 (Affinity / Death /
 * Continuation), gdd-04 (World Memory), gdd-05 (Persistence), gdd-06 (UI).
 *
 * RULES FOR THIS FILE
 * - Types only (plus a handful of frozen name constants). No behaviour, no React,
 *   no I/O. Every later phase imports its field names from here so that a rename
 *   is a compile error rather than a silent runtime mismatch.
 * - Field-name decisions made in P0 are frozen as `const` string values below.
 *   gdd-02 A8 records that a real `battle_result` vs `outcome` drift once shipped;
 *   these constants exist so that class of bug cannot recur.
 */

/** Stable identity of any character record. Equals `character.id` in App.tsx. */
export type CharId = string;

/** Identity of an NPC used as a relationship key. Same space as `CharId`. */
export type NpcId = CharId;

// ---------------------------------------------------------------------------
// Frozen field names (provisional decisions taken in P0 - see plan.md P0)
// ---------------------------------------------------------------------------

/**
 * Canonical name of the combat result field on `LockedResult`.
 * DECISION: `outcome`, never `battle_result` (gdd-02 A7 "Consumes", gdd-03 2.7).
 */
export const FIELD_OUTCOME = 'outcome' as const;

/** `death_flag_<char_id>` - mirrors `alive[char_id]` (gdd-03 2.3). */
export const FIELD_PREFIX_DEATH_FLAG = 'death_flag_' as const;

/** `affinity_delta_<npc_id>` - one per affected NPC, only when non-zero (gdd-03 1.7). */
export const FIELD_PREFIX_AFFINITY_DELTA = 'affinity_delta_' as const;

/** `exp_delta_<char_id>` - deterministic per-turn EXP grant (gdd-02 D.6). */
export const FIELD_PREFIX_EXP_DELTA = 'exp_delta_' as const;

/**
 * `breakthrough_flag_<char_id>` - true on the turn a tier breakthrough executed.
 * DECISION: a per-character prefixed field, not a bare global boolean, because
 * companions progress independently (gdd-02 D.7, AC-49 "keyed by char_id").
 */
export const FIELD_PREFIX_BREAKTHROUGH_FLAG = 'breakthrough_flag_' as const;

/** `consequence_type_<char_id>` - one of 4 values (gdd-03 2.3). */
export const FIELD_PREFIX_CONSEQUENCE_TYPE = 'consequence_type_' as const;

/** `consequence_witnesses_<char_id>` - entity ids (gdd-03 2.3). */
export const FIELD_PREFIX_CONSEQUENCE_WITNESSES = 'consequence_witnesses_' as const;

/** Builds a per-entity locked field name from a prefix above. */
export function lockedFieldName(prefix: string, id: CharId): string {
  return prefix + id;
}

/**
 * Parses `<prefix><id>` back into its entity id. Returns null when the field does
 * not carry that prefix. World Memory derives `entity_id` this way (gdd-04 A6).
 */
export function entityIdFromField(prefix: string, field: string): CharId | null {
  return field.startsWith(prefix) ? field.slice(prefix.length) : null;
}

// ---------------------------------------------------------------------------
// Combat hand-off (read-only view over the out-of-scope combat code)
// ---------------------------------------------------------------------------

/**
 * Outcome taxonomy consumed by EXP (gdd-02 A7) and Death & Consequence (gdd-03 2.2).
 * `'none'` is the GDD `no_outcome` value: nothing resolves.
 */
export type CombatOutcomeType = 'win' | 'loss' | 'flee' | 'draw' | 'none';

export interface CombatOutcome {
  type: CombatOutcomeType;
  /** Null whenever the outcome does not designate a winner (`flee`/`draw`/`none`). */
  winner_id: CharId | null;
  loser_id: CharId | null;
}

export interface PerActorCombatState {
  /** HP after the battle resolved. Never negative. */
  hp_after: number;
  /** Character Card `max_HP`; must be > 0 (gdd-03 1.7 "Consumes"). */
  max_HP: number;
}

/**
 * The complete, read-only projection of Combat that downstream deterministic
 * systems are allowed to see. Nothing else may reach into CombatLoop.
 */
export interface CombatHandoff {
  /** True while a battle is still running; only `false` allows combat EXP (gdd-02 D.6). */
  battle_active: boolean;
  /** True on any turn belonging to a battle, including its final turn (gdd-02 A7). */
  in_combat: boolean;
  /** Friendly spar: Death & Consequence must not resolve at all (gdd-03 2.2 CR#3). */
  is_spar_friendly: boolean;
  outcome: CombatOutcome;
  per_actor: Record<CharId, PerActorCombatState>;
}

// ---------------------------------------------------------------------------
// Locked result
// ---------------------------------------------------------------------------

/** Value kinds a locked mechanical field may hold. Deliberately narrow. */
export type LockedFieldValue = number | string | boolean | string[] | null;

/**
 * The immutable mechanical outcome of one turn, computed BEFORE any narration
 * call (gdd-01 A.2 R1 "lock first, narrate second").
 *
 * Shape rationale: a small set of always-present structural fields plus an open
 * `fields` record. Per-entity results (`exp_delta_<id>`, `affinity_delta_<id>`, ...)
 * live in `fields` because their key set is dynamic, and the World Memory fact
 * extractor already treats "one non-zero field = one fact" as its contract
 * (gdd-04 A6). P1/P2/P4 extend this by adding prefixes above, never by widening
 * the structural block.
 */
export interface LockedResult {
  /** Monotonic turn identity (Turn Manager). */
  turn_id: number;
  /** `world_time` advances exactly +1 per confirmed turn (gdd-01 A.3). */
  world_time: number;
  /** Permanently disables Undo when true (gdd-01 A.3, gdd-03 2.3). */
  is_death_turn: boolean;
  /** See `CombatHandoff`; mirrored here so consumers read one struct. */
  in_combat: boolean;
  battle_active: boolean;
  outcome: CombatOutcome;
  /** Open, additive mechanical fields keyed by the FIELD_PREFIX_* constants. */
  fields: Record<string, LockedFieldValue>;
}

/** An empty, structurally valid locked result. Systems fill `fields` additively. */
export function emptyLockedResult(turn_id: number, world_time: number): LockedResult {
  return {
    turn_id,
    world_time,
    is_death_turn: false,
    in_combat: false,
    battle_active: false,
    outcome: { type: 'none', winner_id: null, loser_id: null },
    fields: {},
  };
}

// ---------------------------------------------------------------------------
// Turn record and suggestions
// ---------------------------------------------------------------------------

/** Where a suggestion came from. `pending_fate` entries are forced (gdd-03 2.4 Branch B). */
export type SuggestionSource = 'ai' | 'fallback' | 'pending_fate';

export interface Suggestion {
  text: string;
  /**
   * Declared intent envelope. `null` = free roleplay only, no mechanical delta
   * (gdd-05 A2). The 12-value envelope union belongs to P5, which the shortened
   * roadmap drops; the field stays so the schema need not change later.
   */
  envelope: string | null;
  source: SuggestionSource;
}

/**
 * Append-only per-turn record (gdd-05 B3). Key is `[slot_id, world_time, hack_seq]`.
 */
export interface TurnRecord {
  slot_id: string;
  world_time: number;
  /** Disambiguates records written after a Customization ("hack") write. */
  hack_seq: number;
  turn_id: number;
  /** Raw player input for this turn. */
  action_text: string;
  locked_result: LockedResult;
  /** AI prose. NEVER parsed for mechanical values (gdd-01 B.2 R3). */
  narration_text: string;
  suggestions: Suggestion[];
  schema_version: number;
  created_at: number;
}

// ---------------------------------------------------------------------------
// Undo
// ---------------------------------------------------------------------------

/**
 * Every system holding turn-scoped state implements this so Turn Manager can run
 * a one-turn undo (gdd-01 A.2, decision C-13). Snapshots are opaque to the caller.
 */
export interface UndoableSystem {
  captureSnapshot(): unknown;
  restoreSnapshot(s: unknown): void;
}

// ---------------------------------------------------------------------------
// Progression / affinity vocabulary (used from P1/P2 on)
// ---------------------------------------------------------------------------

/** Only two states exist (gdd-02 A3). The Vietnamese literals are the stored values. */
export type ProgressionState = 'Tu Luyện Thường' | 'Chờ Đột Phá';

/** 7 attitude bands, a pure view over affinity (gdd-03 1.3). */
export type AttitudeBand =
  | 'Thù địch sâu sắc'
  | 'Thù địch'
  | 'Lạnh nhạt'
  | 'Trung lập'
  | 'Thiện cảm'
  | 'Thân thiết'
  | 'Tri kỷ';

/** Severity of a classified social event: 0 = positive, 1..5 = negative (gdd-03 1.4). */
export type EventSeverity = 0 | 1 | 2 | 3 | 4 | 5;

// ---------------------------------------------------------------------------
// Dependency-injection seams (no system may read a global clock or Math.random)
// ---------------------------------------------------------------------------

/** Uniform sample in [0, 1). Injected so every roll is reproducible in tests. */
export type Rng = () => number;

/** Milliseconds since epoch. Injected for the same reason. */
export type Clock = () => number;
