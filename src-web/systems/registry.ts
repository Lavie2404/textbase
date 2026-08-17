/**
 * Single source of truth for every shared numeric constant of the GDD systems.
 *
 * RULES
 * - A constant is declared exactly once, here, and imported everywhere else.
 *   Several GDDs explicitly say "referenced from other systems, never
 *   re-declared" (gdd-04 A5, gdd-05 A5, gdd-06 A5/B5) - this file is that
 *   registry.
 * - Every entry cites its GDD source. Where plan.md overrides a GDD default the
 *   deviation is called out inline with the decision id.
 * - Values here are DEFAULTS. Runtime configuration overrides them and must pass
 *   `validateSystemsConfig` (configValidation.ts) before a session starts.
 *
 * Design docs: production/gdd-integration/plan.md (P0),
 * gdd-01..gdd-06 under production/gdd-integration/.
 */

// ---------------------------------------------------------------------------
// Locked architectural constants (NOT knobs - changing them requires re-review)
// ---------------------------------------------------------------------------

/** gdd-06 A5: locked accessibility constant, in CSS px. */
export const TOUCH_TARGET_MIN = 44;

/** gdd-06 A5: minimum gap between two adjacent tap targets, in CSS px. */
export const MIN_ADJACENT_GAP_PX = 4;

/** gdd-03 1.3 / 2.3: deep hostility is inclusive (`affinity <= -80`). */
export const DEEP_HOSTILITY_THRESHOLD = -80;

/** gdd-05 A5: locked, not a knob. NPC may open hostilities only within this level gap. */
export const HOSTILE_INITIATIVE_LEVEL_GAP_MAX = 20;

/** gdd-05 A5: locked, not a knob. Max NPCs simultaneously in one scene. */
export const MAX_NPC_PER_SCENE = 3;

/** gdd-02 A7: exchanges per battle used by the D.1 economic invariant. */
export const CONTENT_EXCHANGE_ESTIMATE = 30;

/** gdd-02 A7 / D.1: the safe range the economic invariant is validated across. */
export const CONTENT_EXCHANGE_ESTIMATE_RANGE = [15, 30, 50] as const;

/** gdd-01 A.5: hard invariant, deliberately not tunable. */
export const CALLS_PER_TURN_MAX = 3;

/** gdd-03 1.3: the affinity scale is a locked design constant. */
export const AFFINITY_MIN = -100;
export const AFFINITY_MAX = 100;

/**
 * Song Tu gate. gdd-03 puts it at 60; the shipped App.tsx uses 80 and Song Tu is
 * OUT OF SCOPE (plan.md decision C-6). Recorded here for reference only - no
 * system in `src-web/systems/` may gate on it; the adapter reads titles instead.
 */
export const SONG_TU_THRESHOLD_APP = 80;

/** gdd-03 1.7 / plan.md C-6: the title App.tsx grants on Song Tu (SONG_TU_TITLE:27107). */
export const SONG_TU_TITLE = 'Đạo Lữ';

// ---------------------------------------------------------------------------
// Turn Manager (gdd-01 A.5)
// ---------------------------------------------------------------------------

export const TURN_KNOBS = {
  /** gdd-01 A.5. Range 2-6. Exactly this many suggestions per turn. */
  suggested_action_count: 4,
  /** gdd-01 A.5. Range 0-1; >1 breaks Pillar 2 and is forbidden. */
  undo_depth: 1,
} as const;

// ---------------------------------------------------------------------------
// AI / LLM layer (gdd-01 A.5 + C.5, with plan.md decision C-10 overrides)
// ---------------------------------------------------------------------------

export const AI_KNOBS = {
  /**
   * gdd-01 A.5 default is 30 (range 10-60).
   * DEVIATION (plan.md C-10): raised to 60 - long narration, especially NSFW,
   * routinely exceeds 30s, and the client-side queue delay is not network latency.
   */
  ai_call_timeout_seconds: 60,
  /**
   * gdd-01 C.5 default is 15 (range 10-20).
   * DEVIATION (plan.md C-10): raised to 45, still strictly below
   * `ai_call_timeout_seconds` so model fallback stays possible.
   */
  request_timeout_default: 45,
  /** gdd-01 C.5: fixed wait before retrying the same model after a 503. */
  overload_retry_wait_seconds: 2,
  /** gdd-01 C.5: linear backoff base for non-503 transient errors. */
  transient_retry_base_seconds: 1,
  /** gdd-01 C.5: total attempts per model on 503 (1 = switch immediately). */
  max_same_model_attempts_overloaded: 1,
  /** gdd-01 C.5: total attempts per model on other transient errors. */
  max_same_model_attempts_transient: 2,
  /** gdd-01 C.5: matches the existing 90s breaker in App.tsx (:17949). */
  model_cooldown_seconds: 90,
  /** gdd-01 C.5 / gdd-04 A5: consumed by the World Memory runtime clamp. */
  ai_context_hard_token_budget: 8000,
  /** gdd-01 B.5: leak detector stays on during MVP hypothesis validation. */
  leak_detection_enabled: true,
} as const;

// ---------------------------------------------------------------------------
// EXP & Realm Progression (gdd-02 A5)
// ---------------------------------------------------------------------------

export const EXP_KNOBS = {
  /** gdd-02 A5. Display-only under decision C-4 (App keeps its own curve). Must be > 0. */
  BASE_EXP_THRESHOLD: 100,
  /** gdd-02 A5. Display-only; must be >= 0. */
  EXP_THRESHOLD_INCREMENT: 10,
  /** gdd-02 A5: 0.1% of threshold per non-combat turn. */
  PASSIVE_EXP_RATE: 0.001,
  /** gdd-02 A5/D.3. Must be <= WIN_EXP_BASE_FRACTION * WIN_EXP_FLOOR_MULT. */
  LOSS_EXP_RATE: 0.04,
  /** gdd-02 A5/D.2. Not independent of WIN_EXP_FLOOR_MULT. */
  WIN_EXP_BASE_FRACTION: 0.2,
  /** gdd-02 A5/D.2: per-tier bonus inside the win multiplier. */
  WIN_EXP_TIER_BONUS: 0.25,
  /** gdd-02 A5/D.2: lower clamp of the tier multiplier. */
  WIN_EXP_FLOOR_MULT: 0.3,
  /** gdd-02 A5/D.2: upper clamp of the tier multiplier. */
  WIN_EXP_CEIL_MULT: 3.0,
  /** gdd-02 A5/D.4: Song Tu EXP bonus rate (mechanic itself out of scope). */
  SONG_TU_EXP_RATE: 0.0015,
  /** gdd-02 A5/D.5: cap applied to percentage stats only. */
  PERCENT_STAT_CAP: 0.95,
  /** gdd-02 A5: advisory ceiling for the externally owned Tam Phap multiplier. */
  TAM_PHAP_EXP_MULTIPLIER_MAX: 3.0,
} as const;

/**
 * The 12 Character Card stats governed by gdd-02 D.5.
 * Raw (uncapped): HP, ATK, DEF, SPD. Percentage (clamped to PERCENT_STAT_CAP):
 * the remaining 8.
 */
export const GDD_STAT_KEYS = [
  'HP',
  'ATK',
  'DEF',
  'SPD',
  'CRIT_RATE',
  'CRIT_DAMAGE',
  'ACC',
  'EVASION',
  'LIFESTEAL',
  'HP_REGEN',
  'AMP',
  'MITIGATION',
] as const;

export type GddStatKey = (typeof GDD_STAT_KEYS)[number];

/** Which of the 12 are percentage stats (gdd-02 A3). */
export const PERCENT_STAT_KEYS: readonly GddStatKey[] = [
  'CRIT_RATE',
  'CRIT_DAMAGE',
  'ACC',
  'EVASION',
  'LIFESTEAL',
  'HP_REGEN',
  'AMP',
  'MITIGATION',
];

/**
 * gdd-02 D.5 / A5: 24 of the 26 mandatory EXP data constants.
 * HP 8/50, ATK 1.5/8 and CRIT_RATE 0.008/0.02 are the GDD anchors used by its
 * worked examples; the other 9 stats are explicitly "not yet tuned" (gdd-02 A5)
 * and carry provisional values here. A MISSING key is a fail-loud data-load
 * error, never a silent 0 (gdd-02 EC-8).
 */
export const LEVEL_GROWTH: Record<GddStatKey, number> = {
  HP: 8,
  ATK: 1.5,
  DEF: 1.2,
  SPD: 0.5,
  CRIT_RATE: 0.008,
  CRIT_DAMAGE: 0.004,
  ACC: 0.004,
  EVASION: 0.003,
  LIFESTEAL: 0.002,
  HP_REGEN: 0.002,
  AMP: 0.003,
  MITIGATION: 0.003,
};

export const BREAKTHROUGH_BONUS: Record<GddStatKey, number> = {
  HP: 50,
  ATK: 8,
  DEF: 6,
  SPD: 3,
  CRIT_RATE: 0.02,
  CRIT_DAMAGE: 0.02,
  ACC: 0.01,
  EVASION: 0.01,
  LIFESTEAL: 0.01,
  HP_REGEN: 0.01,
  AMP: 0.01,
  MITIGATION: 0.01,
};

// ---------------------------------------------------------------------------
// NPC Affinity (gdd-03 1.5)
// ---------------------------------------------------------------------------

export const AFFINITY_KNOBS = {
  /** gdd-03 D.1 base deltas. */
  GIFT_DELTA: 5,
  SMALL_HELP_DELTA: 3,
  SAVE_LIFE_DELTA: 15,
  LOSS_VS_NPC_DELTA: -3,
  COMBAT_WIN_BASE: 5,
  COMBAT_WIN_MARGIN_SCALE: 10,
  SEVERE_WIN_MARGIN_THRESHOLD: 0.7,
  INSULT_DELTA: -8,
  THREATEN_DELTA: -12,
  BETRAY_DELTA: -30,
  KILL_WITNESS_DELTA: -25,
  /** gdd-03 D.2 diminishing returns (positive deltas only). */
  DIMINISH_EXPONENT: 3,
  /** gdd-03 A5: must never be 0 - a 0 floor makes high affinity unreachable. */
  DIMINISH_FLOOR: 0.1,
  /** gdd-03 D.3 repetition fatigue. */
  FATIGUE_RATE: 0.15,
  FATIGUE_FLOOR: 0.25,
  /** gdd-03 A5: must be >= POSITIVE_SOCIAL_COOLDOWN_TURNS (gdd-05). */
  FATIGUE_WINDOW_TURNS: 5,
  /** gdd-03 D.4: per-turn cap on summed positive deltas. */
  CAP_POSITIVE_PER_TURN: 20,
  /** gdd-03 D.5: one-hop propagation strength, always < 1. */
  PROPAGATION_RATE: 0.5,
  CRUELTY_REP_DELTA: -2,
  /** gdd-03 D.5: propagation gate on classified event severity. */
  PROPAGATION_SEVERITY_MIN: 3,
  /** gdd-03 A5, [SONG-TU-ADAPT]: recorded, not implemented (out of scope). */
  SONG_TU_COOLDOWN_TURNS: 5,
} as const;

// ---------------------------------------------------------------------------
// Death & Consequence (gdd-03 2.5)
// ---------------------------------------------------------------------------

export const DEATH_KNOBS = {
  /** gdd-03 D.1: P = clamp(BASE + SCALE * margin_ratio, MIN, MAX). */
  DEATH_ROLL_BASE: 0.1,
  DEATH_ROLL_SCALE: 0.85,
  /** Never 0% and never 100% - the envelope is deliberate. */
  DEATH_ROLL_MIN: 0.05,
  DEATH_ROLL_MAX: 0.95,
  /** gdd-03 D.2 severity tiers. */
  SEVERITY_MILD_THRESHOLD: 0.35,
  SEVERITY_SEVERE_THRESHOLD: 0.75,
  /** gdd-03 D.3 recovery methods. */
  RECOVERY_FORTUNE_RATE: 0.7,
  RECOVERY_ITEM_MIN: 0.05,
  RECOVERY_ITEM_MAX: 0.9,
  RECOVERY_SELF_RATE: 0.12,
  RECOVERY_SELF_COOLDOWN_TURNS: 5,
  /**
   * gdd-03 A5: owned by combat-system.md D.1.
   * DEVIATION (plan.md C-11): the combat multiplier branch is NOT implemented -
   * Combat is out of scope. The same effect is produced through the existing
   * "Phe Dan Dien" long-term status. Kept here for reference/tests only.
   */
  CRIPPLED_PENALTY_MULT: 0.85,
} as const;

// ---------------------------------------------------------------------------
// Situation / Encounter (gdd-05 A5) - P5 is dropped, but three of these knobs
// are cross-referenced by affinity/death invariants and must still validate.
// ---------------------------------------------------------------------------

export const SITUATION_KNOBS = {
  /** gdd-05 A5: binding against FATIGUE_WINDOW_TURNS and RESCUE_COOLDOWN_TURNS. */
  POSITIVE_SOCIAL_COOLDOWN_TURNS: 4,
  PROVOKE_SEVERITY_MIN: 3,
  PROVOKE_RECONCILE_AFFINITY: -10,
  HOSTILE_INITIATIVE_AFFINITY_MAX: -40,
  FRIENDLY_INITIATIVE_AFFINITY_MIN: 40,
  NPC_INITIATIVE_COOLDOWN_TURNS: 5,
  NPC_INITIATED_WINDOW_TURNS: 3,
  NPC_INITIATED_WINDOW_CAP: 1,
  AMBIENT_LEVEL_BAND_DOWN: 15,
  /** gdd-05 A5: hard ceiling 20. */
  AMBIENT_HOSTILE_LEVEL_CAP: 15,
  /** gdd-05 A5: derived = NPC_INITIATED_WINDOW_CAP / (NPC_INITIATED_WINDOW_TURNS + 1). */
  AMBIENT_ENCOUNTER_CHANCE: 0.25,
  /** gdd-05 A5: binding, must be >= 2 * POSITIVE_SOCIAL_COOLDOWN_TURNS. */
  RESCUE_COOLDOWN_TURNS: 8,
} as const;

// ---------------------------------------------------------------------------
// World Memory (gdd-04 A5) and Canon (gdd-04 B5)
// ---------------------------------------------------------------------------

export const MEMORY_KNOBS = {
  /** gdd-04 A5: turns kept verbatim. Absolute floor 1. */
  recency_window_turns: 8,
  /** gdd-04 A5: facts per entity per prompt. */
  max_facts_per_entity: 8,
  /** gdd-04 A5: hard floor 4, and must be >= MAX_NPC_PER_SCENE + 1. */
  max_entities_per_prompt: 4,
  /** gdd-04 B5: affinity magnitude that promotes a fact to importance tier 2. */
  AFFINITY_MAGNITUDE_TIER2: 15,
  /** gdd-04 B5: cascade safety valve. */
  CASCADE_MAX_DEPTH: 20,
  /** gdd-04 B5: fixpoint iteration safety valve. */
  FIXPOINT_MAX_ITERATIONS: 100,
} as const;

// ---------------------------------------------------------------------------
// Persistence (gdd-05 B5)
// ---------------------------------------------------------------------------

export const PERSISTENCE_KNOBS = {
  /** gdd-05 B5: origin-level quota early warning point (Formula #3). */
  quota_warn_threshold: 0.85,
  /** gdd-05 B5: budget to `durability_confirmed` for one ordinary append. */
  max_perceived_autosave_latency_ms: 150,
  /** gdd-05 B5: consecutive same-error write retries before escalation. */
  max_write_retry_before_escalation: 3,
  /** gdd-05 B5 (ADR D2): post-hoc assertion on synchronous stage(). */
  blob_gather_timeout_ms: 100,
  /** gdd-05 B5 (ADR D1): full-flush cadence in turns. */
  FLUSH_EVERY_N_TURNS: 50,
  /**
   * gdd-05 B6/R8: release-bound technical value, not a knob. Bumped on schema
   * change. P3a raised it from 1 to 2 - three R8 triggers fired at once: the
   * turn-record key shape became `[slot_id, world_time, hack_seq]`, `SlotRecord`
   * gained its metadata fields, and the bundle gained a checksum.
   */
  schema_version: 2,
  /**
   * gdd-05 B4 "Backup prompt threshold": days since `last_saved_at` after which
   * a slot row shows the faint diegetic "Chep lai quyen so" invitation. Kept
   * below the ~7-day Safari ITP eviction window.
   */
  backup_prompt_days: 5,
} as const;

// ---------------------------------------------------------------------------
// Core UI / Character Card / Customization (gdd-06 A5, B5, C5)
// ---------------------------------------------------------------------------

export const UI_KNOBS = {
  /** gdd-06 A5: Story Log pagination. */
  log_page_size: 20,
  log_max_loaded_pages: 3,
  log_prefetch_threshold: 5,
  /** gdd-06 A5: S2 live window; relative floor is CONTENT_EXCHANGE_ESTIMATE. */
  live_window_turns: 30,
  /** gdd-06 A5: exactly 3 steps, S < M < L. */
  font_scale_steps: { S: 0.875, M: 1.0, L: 1.25 },
  base_column_width_px: 360,
  column_gutter_px: 24,
  /** gdd-06 A5/B5 ordering invariant: banner <= settings <= card <= screen. */
  transition_banner_ms: 120,
  transition_settings_ms: 150,
  card_transition_ms: 200,
  transition_screen_ms: 260,
  /** gdd-06 A5: must be strictly < ai_call_timeout_seconds. */
  ai_writing_escalation_seconds: 15,
  /** gdd-06 B5: profile free-text length cap per field. */
  profile_text_max_length: 280,
  /** gdd-06 B5: integers for raw stats, 1 decimal for percentage stats. */
  stat_display_precision: 0,
} as const;

/** gdd-06 A5: visual placeholder alphas - single source, never re-literalled. */
export const UI_ALPHA = {
  full: 1.0,
  oneStepDown: 0.68,
  disabled: 0.38,
} as const;

export const HACK_KNOBS = {
  /** gdd-06 C5: technical hygiene ceiling (typos/overflow), explicitly not balance. */
  LEVEL_WRITE_MAX: 1_000_000,
  /** gdd-06 C5: technical hygiene ceiling. */
  STAT_WRITE_MAX: 1_000_000_000,
  /** gdd-06 C5: debounce applied per button. */
  SUBMIT_DEBOUNCE_MS: 500,
  /** gdd-06 C5: policy switch, default OFF. */
  hack_mode_toggle_default: false,
} as const;

// ---------------------------------------------------------------------------
// Equipment & Skill Data (gdd-02 B5)
// ---------------------------------------------------------------------------

export const EQUIPMENT_KNOBS = {
  /** gdd-02 B: a skill below 3 thuc warns; 0 thuc is blocked. */
  min_thuc_per_skill: 3,
  /** gdd-02 B / gdd-06 C6: exceeding this warns, never blocks. */
  max_known_skills_per_character: 6,
} as const;
