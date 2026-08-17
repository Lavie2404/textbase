/**
 * Fail-loud validation of every cross-system tuning constant, run once at load.
 *
 * Design docs: production/gdd-integration/plan.md (P0),
 * gdd-02 A3 error taxonomy + A5 joint constraint + D.1 economic invariant,
 * gdd-03 1.5 / 2.5 knob tables, gdd-04 A5 cross-GDD invariant, gdd-05 A5 binding
 * constraint, gdd-06 A5 ordering invariants.
 *
 * WHY THIS EXISTS
 * Several GDD invariants are NOT implied by the published per-knob safe ranges:
 * a value can be legal on its own row and still break the economy (gdd-02 A5
 * gives the counter-example `0.10 x 0.30 = 0.03 < 0.04`). Those constraints must
 * be asserted at data-load, not merely documented.
 *
 * The validator reports EVERY violation at once (a single throw listing all of
 * them), because fixing config one error per run is how half-tuned builds ship.
 * gdd-02 A3 also forbids release-stripped asserts: this is an ordinary runtime
 * check that ships in the production bundle.
 */

import {
  AFFINITY_KNOBS,
  AI_KNOBS,
  BREAKTHROUGH_BONUS,
  CONTENT_EXCHANGE_ESTIMATE_RANGE,
  DEATH_KNOBS,
  EQUIPMENT_KNOBS,
  EXP_KNOBS,
  GDD_STAT_KEYS,
  HACK_KNOBS,
  LEVEL_GROWTH,
  MAX_NPC_PER_SCENE,
  MEMORY_KNOBS,
  PERSISTENCE_KNOBS,
  SITUATION_KNOBS,
  TURN_KNOBS,
  UI_KNOBS,
  type GddStatKey,
} from './registry';

// ---------------------------------------------------------------------------
// Error taxonomy (gdd-02 A3: compared by equality against a constant, never by
// string matching on the message)
// ---------------------------------------------------------------------------

export const CONFIG_ERROR = {
  MISSING_TUNING_CONSTANT: 'EXP_ERROR_MISSING_TUNING_CONSTANT',
  INVALID_THRESHOLD_CONFIG: 'EXP_ERROR_INVALID_THRESHOLD_CONFIG',
  WIN_LOSS_INVARIANT_VIOLATED: 'EXP_ERROR_WIN_LOSS_INVARIANT_VIOLATED',
  ECONOMY_INVARIANT_MARGIN_VIOLATED: 'EXP_ERROR_ECONOMY_INVARIANT_MARGIN_VIOLATED',
  EXP_RANGE: 'EXP_ERROR_RANGE',
  AFFINITY_RANGE: 'AFFINITY_ERROR_RANGE',
  AFFINITY_FATIGUE_WINDOW: 'AFFINITY_ERROR_FATIGUE_WINDOW_TOO_SHORT',
  DEATH_RANGE: 'DEATH_ERROR_RANGE',
  DEATH_ROLL_ENVELOPE: 'DEATH_ERROR_ROLL_ENVELOPE_INVERTED',
  DEATH_SEVERITY_ORDER: 'DEATH_ERROR_SEVERITY_THRESHOLD_ORDER',
  RECOVERY_ITEM_ENVELOPE: 'DEATH_ERROR_RECOVERY_ITEM_ENVELOPE_INVERTED',
  SITUATION_RESCUE_COOLDOWN: 'SITUATION_ERROR_RESCUE_COOLDOWN_TOO_SHORT',
  SITUATION_RANGE: 'SITUATION_ERROR_RANGE',
  MEMORY_ENTITY_BUDGET: 'MEMORY_ERROR_ENTITY_BUDGET_BELOW_SCENE_CAP',
  MEMORY_RANGE: 'MEMORY_ERROR_RANGE',
  AI_TIMEOUT_ORDER: 'AI_ERROR_TIMEOUT_ORDER',
  UI_FONT_SCALE_ORDER: 'UI_ERROR_FONT_SCALE_ORDER',
  UI_TRANSITION_ORDER: 'UI_ERROR_TRANSITION_ORDER',
  UI_RANGE: 'UI_ERROR_RANGE',
  TURN_RANGE: 'TURN_ERROR_RANGE',
  HACK_RANGE: 'HACK_ERROR_RANGE',
  PERSISTENCE_RANGE: 'PERSISTENCE_ERROR_RANGE',
} as const;

export type ConfigErrorCode = (typeof CONFIG_ERROR)[keyof typeof CONFIG_ERROR];

export interface ConfigViolation {
  code: ConfigErrorCode;
  /** Name of the invariant or constant at fault - always present in the message. */
  invariant: string;
  message: string;
}

/** Thrown by `validateSystemsConfig`. Carries every violation found. */
export class SystemsConfigError extends Error {
  readonly violations: readonly ConfigViolation[];

  constructor(violations: readonly ConfigViolation[]) {
    const body = violations.map((v) => `  [${v.code}] ${v.message}`).join('\n');
    super(`Invalid systems config (${violations.length} violation(s)):\n${body}`);
    this.name = 'SystemsConfigError';
    this.violations = violations;
  }
}

// ---------------------------------------------------------------------------
// Config shape
// ---------------------------------------------------------------------------

export interface SystemsConfig {
  exp: Record<string, number>;
  levelGrowth: Record<string, number>;
  breakthroughBonus: Record<string, number>;
  affinity: Record<string, number>;
  death: Record<string, number>;
  situation: Record<string, number>;
  memory: Record<string, number>;
  ai: Record<string, number | boolean>;
  ui: {
    log_page_size: number;
    log_max_loaded_pages: number;
    log_prefetch_threshold: number;
    live_window_turns: number;
    font_scale_steps: { S: number; M: number; L: number };
    transition_banner_ms: number;
    transition_settings_ms: number;
    card_transition_ms: number;
    transition_screen_ms: number;
    ai_writing_escalation_seconds: number;
    [k: string]: unknown;
  };
  turn: Record<string, number>;
  hack: Record<string, number | boolean>;
  persistence: Record<string, number>;
  equipment: Record<string, number>;
  /** Battle exchange estimates the economic invariant is checked across (gdd-02 D.1). */
  contentExchangeEstimates: readonly number[];
}

/**
 * Defaults assembled from the registry. Guaranteed to pass
 * `validateSystemsConfig` - `tests/unit/systems/configValidation.test.ts` locks
 * that in so a registry edit that breaks an invariant fails CI, not a play session.
 */
export const DEFAULT_SYSTEMS_CONFIG: SystemsConfig = {
  exp: { ...EXP_KNOBS },
  levelGrowth: { ...LEVEL_GROWTH },
  breakthroughBonus: { ...BREAKTHROUGH_BONUS },
  affinity: { ...AFFINITY_KNOBS },
  death: { ...DEATH_KNOBS },
  situation: { ...SITUATION_KNOBS },
  memory: { ...MEMORY_KNOBS },
  ai: { ...AI_KNOBS },
  ui: {
    ...UI_KNOBS,
    font_scale_steps: { ...UI_KNOBS.font_scale_steps },
  },
  turn: { ...TURN_KNOBS },
  hack: { ...HACK_KNOBS },
  persistence: { ...PERSISTENCE_KNOBS },
  equipment: { ...EQUIPMENT_KNOBS },
  contentExchangeEstimates: [...CONTENT_EXCHANGE_ESTIMATE_RANGE],
};

/** Deep-ish clone helper for callers that want to tweak one value safely. */
export function cloneDefaultSystemsConfig(): SystemsConfig {
  return {
    exp: { ...DEFAULT_SYSTEMS_CONFIG.exp },
    levelGrowth: { ...DEFAULT_SYSTEMS_CONFIG.levelGrowth },
    breakthroughBonus: { ...DEFAULT_SYSTEMS_CONFIG.breakthroughBonus },
    affinity: { ...DEFAULT_SYSTEMS_CONFIG.affinity },
    death: { ...DEFAULT_SYSTEMS_CONFIG.death },
    situation: { ...DEFAULT_SYSTEMS_CONFIG.situation },
    memory: { ...DEFAULT_SYSTEMS_CONFIG.memory },
    ai: { ...DEFAULT_SYSTEMS_CONFIG.ai },
    ui: {
      ...DEFAULT_SYSTEMS_CONFIG.ui,
      font_scale_steps: { ...DEFAULT_SYSTEMS_CONFIG.ui.font_scale_steps },
    },
    turn: { ...DEFAULT_SYSTEMS_CONFIG.turn },
    hack: { ...DEFAULT_SYSTEMS_CONFIG.hack },
    persistence: { ...DEFAULT_SYSTEMS_CONFIG.persistence },
    equipment: { ...DEFAULT_SYSTEMS_CONFIG.equipment },
    contentExchangeEstimates: [...DEFAULT_SYSTEMS_CONFIG.contentExchangeEstimates],
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function isNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/**
 * Validates a systems config and throws `SystemsConfigError` listing every
 * violation. Returns the config unchanged when valid, so it can wrap a load:
 * `const cfg = validateSystemsConfig(loadConfig())`.
 */
export function validateSystemsConfig(cfg: SystemsConfig): SystemsConfig {
  const violations: ConfigViolation[] = [];
  const add = (code: ConfigErrorCode, invariant: string, message: string) =>
    violations.push({ code, invariant, message });

  const exp = cfg.exp ?? {};
  const affinity = cfg.affinity ?? {};
  const death = cfg.death ?? {};
  const situation = cfg.situation ?? {};
  const memory = cfg.memory ?? {};
  const ai = cfg.ai ?? {};
  const ui = cfg.ui;
  const turn = cfg.turn ?? {};
  const hack = cfg.hack ?? {};
  const persistence = cfg.persistence ?? {};

  // --- gdd-02 EC-8: all 26 mandatory EXP constants must be present -----------
  const requiredExpScalars = ['BASE_EXP_THRESHOLD', 'EXP_THRESHOLD_INCREMENT'];
  for (const name of requiredExpScalars) {
    if (!isNumber(exp[name])) {
      add(
        CONFIG_ERROR.MISSING_TUNING_CONSTANT,
        name,
        `Missing or non-numeric required tuning constant "${name}" (gdd-02 EC-8: never default to 0)`,
      );
    }
  }
  for (const stat of GDD_STAT_KEYS as readonly GddStatKey[]) {
    if (!isNumber(cfg.levelGrowth?.[stat])) {
      add(
        CONFIG_ERROR.MISSING_TUNING_CONSTANT,
        `LEVEL_GROWTH_${stat}`,
        `Missing or non-numeric required tuning constant "LEVEL_GROWTH_${stat}" (gdd-02 D.5)`,
      );
    }
    if (!isNumber(cfg.breakthroughBonus?.[stat])) {
      add(
        CONFIG_ERROR.MISSING_TUNING_CONSTANT,
        `BREAKTHROUGH_BONUS_${stat}`,
        `Missing or non-numeric required tuning constant "BREAKTHROUGH_BONUS_${stat}" (gdd-02 D.5)`,
      );
    }
  }

  // --- gdd-02 EC-8b / EC-10: threshold config ------------------------------
  if (isNumber(exp.BASE_EXP_THRESHOLD) && exp.BASE_EXP_THRESHOLD <= 0) {
    add(
      CONFIG_ERROR.INVALID_THRESHOLD_CONFIG,
      'BASE_EXP_THRESHOLD > 0',
      `BASE_EXP_THRESHOLD must be > 0, got ${exp.BASE_EXP_THRESHOLD} (gdd-02 EC-8b)`,
    );
  }
  if (isNumber(exp.EXP_THRESHOLD_INCREMENT) && exp.EXP_THRESHOLD_INCREMENT < 0) {
    add(
      CONFIG_ERROR.INVALID_THRESHOLD_CONFIG,
      'EXP_THRESHOLD_INCREMENT >= 0',
      `EXP_THRESHOLD_INCREMENT must be >= 0, got ${exp.EXP_THRESHOLD_INCREMENT} (gdd-02 EC-10)`,
    );
  }

  // --- gdd-02 D.2 mandatory win/loss invariant ------------------------------
  if (
    isNumber(exp.WIN_EXP_BASE_FRACTION) &&
    isNumber(exp.WIN_EXP_FLOOR_MULT) &&
    isNumber(exp.LOSS_EXP_RATE) &&
    exp.WIN_EXP_BASE_FRACTION * exp.WIN_EXP_FLOOR_MULT < exp.LOSS_EXP_RATE
  ) {
    add(
      CONFIG_ERROR.WIN_LOSS_INVARIANT_VIOLATED,
      'WIN_EXP_BASE_FRACTION * WIN_EXP_FLOOR_MULT >= LOSS_EXP_RATE',
      `WIN_EXP_BASE_FRACTION * WIN_EXP_FLOOR_MULT >= LOSS_EXP_RATE violated: ` +
        `${exp.WIN_EXP_BASE_FRACTION} * ${exp.WIN_EXP_FLOOR_MULT} = ` +
        `${exp.WIN_EXP_BASE_FRACTION * exp.WIN_EXP_FLOOR_MULT} < ${exp.LOSS_EXP_RATE} ` +
        `(gdd-02 D.2: losing on purpose would become the higher-EV choice)`,
    );
  }

  // --- gdd-02 D.1 economic invariant, across the whole exchange range -------
  if (
    isNumber(exp.WIN_EXP_BASE_FRACTION) &&
    isNumber(exp.PASSIVE_EXP_RATE) &&
    isNumber(exp.SONG_TU_EXP_RATE)
  ) {
    const required = 1.5 * (exp.PASSIVE_EXP_RATE + exp.SONG_TU_EXP_RATE);
    for (const estimate of cfg.contentExchangeEstimates ?? []) {
      if (!isNumber(estimate) || estimate <= 0) continue;
      const perExchange = exp.WIN_EXP_BASE_FRACTION / estimate;
      if (perExchange < required) {
        add(
          CONFIG_ERROR.ECONOMY_INVARIANT_MARGIN_VIOLATED,
          'WIN_EXP_BASE_FRACTION / CONTENT_EXCHANGE_ESTIMATE >= 1.5 * (PASSIVE_EXP_RATE + SONG_TU_EXP_RATE)',
          `Economy margin violated at CONTENT_EXCHANGE_ESTIMATE=${estimate}: ` +
            `${perExchange} < ${required} (gdd-02 D.1: idling would outpace combat)`,
        );
      }
    }
  }

  // --- gdd-02 A5 per-knob sanity -------------------------------------------
  if (
    isNumber(exp.WIN_EXP_FLOOR_MULT) &&
    isNumber(exp.WIN_EXP_CEIL_MULT) &&
    exp.WIN_EXP_FLOOR_MULT > exp.WIN_EXP_CEIL_MULT
  ) {
    add(
      CONFIG_ERROR.EXP_RANGE,
      'WIN_EXP_FLOOR_MULT <= WIN_EXP_CEIL_MULT',
      `WIN_EXP_FLOOR_MULT (${exp.WIN_EXP_FLOOR_MULT}) must be <= WIN_EXP_CEIL_MULT (${exp.WIN_EXP_CEIL_MULT}) (gdd-02 D.2)`,
    );
  }
  if (isNumber(exp.WIN_EXP_FLOOR_MULT) && exp.WIN_EXP_FLOOR_MULT <= 0) {
    add(
      CONFIG_ERROR.EXP_RANGE,
      'WIN_EXP_FLOOR_MULT > 0',
      `WIN_EXP_FLOOR_MULT must be > 0 so win EXP stays strictly positive, got ${exp.WIN_EXP_FLOOR_MULT} (gdd-02 D.2)`,
    );
  }
  if (
    isNumber(exp.PERCENT_STAT_CAP) &&
    (exp.PERCENT_STAT_CAP <= 0 || exp.PERCENT_STAT_CAP >= 1)
  ) {
    add(
      CONFIG_ERROR.EXP_RANGE,
      '0 < PERCENT_STAT_CAP < 1',
      `PERCENT_STAT_CAP must be strictly between 0 and 1, got ${exp.PERCENT_STAT_CAP} (gdd-02 D.5)`,
    );
  }

  // --- gdd-03 1.5 affinity --------------------------------------------------
  if (isNumber(affinity.DIMINISH_FLOOR) && affinity.DIMINISH_FLOOR <= 0) {
    add(
      CONFIG_ERROR.AFFINITY_RANGE,
      'DIMINISH_FLOOR > 0',
      `DIMINISH_FLOOR must be > 0 (never 0), got ${affinity.DIMINISH_FLOOR} (gdd-03 1.5)`,
    );
  }
  if (isNumber(affinity.FATIGUE_FLOOR) && affinity.FATIGUE_FLOOR <= 0) {
    add(
      CONFIG_ERROR.AFFINITY_RANGE,
      'FATIGUE_FLOOR > 0',
      `FATIGUE_FLOOR must be > 0, got ${affinity.FATIGUE_FLOOR} (gdd-03 D.3)`,
    );
  }
  if (
    isNumber(affinity.PROPAGATION_RATE) &&
    (affinity.PROPAGATION_RATE <= 0 || affinity.PROPAGATION_RATE >= 1)
  ) {
    add(
      CONFIG_ERROR.AFFINITY_RANGE,
      '0 < PROPAGATION_RATE < 1',
      `PROPAGATION_RATE must be strictly between 0 and 1, got ${affinity.PROPAGATION_RATE} (gdd-03 D.5)`,
    );
  }
  if (isNumber(affinity.CAP_POSITIVE_PER_TURN) && affinity.CAP_POSITIVE_PER_TURN <= 0) {
    add(
      CONFIG_ERROR.AFFINITY_RANGE,
      'CAP_POSITIVE_PER_TURN > 0',
      `CAP_POSITIVE_PER_TURN must be > 0, got ${affinity.CAP_POSITIVE_PER_TURN} (gdd-03 D.4)`,
    );
  }
  if (
    isNumber(affinity.PROPAGATION_SEVERITY_MIN) &&
    (affinity.PROPAGATION_SEVERITY_MIN < 1 || affinity.PROPAGATION_SEVERITY_MIN > 5)
  ) {
    add(
      CONFIG_ERROR.AFFINITY_RANGE,
      '1 <= PROPAGATION_SEVERITY_MIN <= 5',
      `PROPAGATION_SEVERITY_MIN must be within the 1..5 severity scale, got ${affinity.PROPAGATION_SEVERITY_MIN} (gdd-03 D.5)`,
    );
  }
  if (isNumber(affinity.DIMINISH_EXPONENT) && affinity.DIMINISH_EXPONENT < 1) {
    add(
      CONFIG_ERROR.AFFINITY_RANGE,
      'DIMINISH_EXPONENT >= 1',
      `DIMINISH_EXPONENT must be >= 1, got ${affinity.DIMINISH_EXPONENT} (gdd-03 D.2)`,
    );
  }
  if (
    isNumber(affinity.FATIGUE_WINDOW_TURNS) &&
    isNumber(situation.POSITIVE_SOCIAL_COOLDOWN_TURNS) &&
    affinity.FATIGUE_WINDOW_TURNS < situation.POSITIVE_SOCIAL_COOLDOWN_TURNS
  ) {
    add(
      CONFIG_ERROR.AFFINITY_FATIGUE_WINDOW,
      'FATIGUE_WINDOW_TURNS >= POSITIVE_SOCIAL_COOLDOWN_TURNS',
      `FATIGUE_WINDOW_TURNS (${affinity.FATIGUE_WINDOW_TURNS}) must be >= ` +
        `POSITIVE_SOCIAL_COOLDOWN_TURNS (${situation.POSITIVE_SOCIAL_COOLDOWN_TURNS}) (gdd-03 1.5)`,
    );
  }

  // --- gdd-03 2.5 death ----------------------------------------------------
  if (
    isNumber(death.DEATH_ROLL_MIN) &&
    isNumber(death.DEATH_ROLL_MAX) &&
    death.DEATH_ROLL_MIN >= death.DEATH_ROLL_MAX
  ) {
    add(
      CONFIG_ERROR.DEATH_ROLL_ENVELOPE,
      'DEATH_ROLL_MIN < DEATH_ROLL_MAX',
      `DEATH_ROLL_MIN (${death.DEATH_ROLL_MIN}) must be < DEATH_ROLL_MAX (${death.DEATH_ROLL_MAX}) (gdd-03 D.1)`,
    );
  }
  for (const name of ['DEATH_ROLL_MIN', 'DEATH_ROLL_MAX', 'DEATH_ROLL_BASE', 'DEATH_ROLL_SCALE']) {
    const v = death[name];
    if (isNumber(v) && (v < 0 || v > 1)) {
      add(
        CONFIG_ERROR.DEATH_RANGE,
        `0 <= ${name} <= 1`,
        `${name} must be a probability in [0, 1], got ${v} (gdd-03 D.1)`,
      );
    }
  }
  if (
    isNumber(death.SEVERITY_MILD_THRESHOLD) &&
    isNumber(death.SEVERITY_SEVERE_THRESHOLD) &&
    death.SEVERITY_MILD_THRESHOLD >= death.SEVERITY_SEVERE_THRESHOLD
  ) {
    add(
      CONFIG_ERROR.DEATH_SEVERITY_ORDER,
      'SEVERITY_MILD_THRESHOLD < SEVERITY_SEVERE_THRESHOLD',
      `SEVERITY_MILD_THRESHOLD (${death.SEVERITY_MILD_THRESHOLD}) must be < ` +
        `SEVERITY_SEVERE_THRESHOLD (${death.SEVERITY_SEVERE_THRESHOLD}) (gdd-03 D.2)`,
    );
  }
  if (
    isNumber(death.RECOVERY_ITEM_MIN) &&
    isNumber(death.RECOVERY_ITEM_MAX) &&
    death.RECOVERY_ITEM_MIN >= death.RECOVERY_ITEM_MAX
  ) {
    add(
      CONFIG_ERROR.RECOVERY_ITEM_ENVELOPE,
      'RECOVERY_ITEM_MIN < RECOVERY_ITEM_MAX',
      `RECOVERY_ITEM_MIN (${death.RECOVERY_ITEM_MIN}) must be < RECOVERY_ITEM_MAX (${death.RECOVERY_ITEM_MAX}) (gdd-03 D.3)`,
    );
  }
  if (
    isNumber(death.RECOVERY_SELF_COOLDOWN_TURNS) &&
    death.RECOVERY_SELF_COOLDOWN_TURNS < 1
  ) {
    add(
      CONFIG_ERROR.DEATH_RANGE,
      'RECOVERY_SELF_COOLDOWN_TURNS >= 1',
      `RECOVERY_SELF_COOLDOWN_TURNS must be >= 1, got ${death.RECOVERY_SELF_COOLDOWN_TURNS} (gdd-03 D.3)`,
    );
  }
  if (
    isNumber(death.CRIPPLED_PENALTY_MULT) &&
    (death.CRIPPLED_PENALTY_MULT <= 0 || death.CRIPPLED_PENALTY_MULT > 1)
  ) {
    add(
      CONFIG_ERROR.DEATH_RANGE,
      '0 < CRIPPLED_PENALTY_MULT <= 1',
      `CRIPPLED_PENALTY_MULT must be within (0, 1], got ${death.CRIPPLED_PENALTY_MULT} (gdd-03 2.5)`,
    );
  }

  // --- gdd-05 A5 binding cross-constraint ----------------------------------
  if (
    isNumber(situation.RESCUE_COOLDOWN_TURNS) &&
    isNumber(situation.POSITIVE_SOCIAL_COOLDOWN_TURNS) &&
    situation.RESCUE_COOLDOWN_TURNS < 2 * situation.POSITIVE_SOCIAL_COOLDOWN_TURNS
  ) {
    add(
      CONFIG_ERROR.SITUATION_RESCUE_COOLDOWN,
      'RESCUE_COOLDOWN_TURNS >= 2 * POSITIVE_SOCIAL_COOLDOWN_TURNS',
      `RESCUE_COOLDOWN_TURNS (${situation.RESCUE_COOLDOWN_TURNS}) must be >= ` +
        `2 * POSITIVE_SOCIAL_COOLDOWN_TURNS (${2 * situation.POSITIVE_SOCIAL_COOLDOWN_TURNS}) (gdd-05 A5)`,
    );
  }
  if (
    isNumber(situation.AMBIENT_HOSTILE_LEVEL_CAP) &&
    situation.AMBIENT_HOSTILE_LEVEL_CAP > 20
  ) {
    add(
      CONFIG_ERROR.SITUATION_RANGE,
      'AMBIENT_HOSTILE_LEVEL_CAP <= 20',
      `AMBIENT_HOSTILE_LEVEL_CAP must not exceed its hard ceiling of 20, got ${situation.AMBIENT_HOSTILE_LEVEL_CAP} (gdd-05 A5)`,
    );
  }

  // --- gdd-04 A5 cross-GDD invariant ---------------------------------------
  if (
    isNumber(memory.max_entities_per_prompt) &&
    memory.max_entities_per_prompt < MAX_NPC_PER_SCENE + 1
  ) {
    add(
      CONFIG_ERROR.MEMORY_ENTITY_BUDGET,
      'max_entities_per_prompt >= MAX_NPC_PER_SCENE + 1',
      `max_entities_per_prompt (${memory.max_entities_per_prompt}) must be >= ` +
        `MAX_NPC_PER_SCENE + 1 (${MAX_NPC_PER_SCENE + 1}) so the "global" slot always fits (gdd-04 A5)`,
    );
  }
  if (isNumber(memory.recency_window_turns) && memory.recency_window_turns < 1) {
    add(
      CONFIG_ERROR.MEMORY_RANGE,
      'recency_window_turns >= 1',
      `recency_window_turns has an absolute floor of 1, got ${memory.recency_window_turns} (gdd-04 A5)`,
    );
  }

  // --- gdd-01 C.5 + plan.md C-10 timeout ordering ---------------------------
  const logicalTimeout = ai.ai_call_timeout_seconds;
  const requestTimeout = ai.request_timeout_default;
  if (
    isNumber(logicalTimeout) &&
    isNumber(requestTimeout) &&
    requestTimeout >= logicalTimeout
  ) {
    add(
      CONFIG_ERROR.AI_TIMEOUT_ORDER,
      'request_timeout_default < ai_call_timeout_seconds',
      `request_timeout_default (${requestTimeout}) must be < ai_call_timeout_seconds ` +
        `(${logicalTimeout}) or model fallback becomes impossible (gdd-01 C.5)`,
    );
  }
  if (
    isNumber(logicalTimeout) &&
    isNumber(ui?.ai_writing_escalation_seconds) &&
    ui.ai_writing_escalation_seconds >= logicalTimeout
  ) {
    add(
      CONFIG_ERROR.AI_TIMEOUT_ORDER,
      'ai_writing_escalation_seconds < ai_call_timeout_seconds',
      `ai_writing_escalation_seconds (${ui.ai_writing_escalation_seconds}) must be strictly < ` +
        `ai_call_timeout_seconds (${logicalTimeout}) (gdd-06 A5)`,
    );
  }

  // --- gdd-06 A5 UI ordering invariants ------------------------------------
  const steps = ui?.font_scale_steps;
  if (steps && isNumber(steps.S) && isNumber(steps.M) && isNumber(steps.L)) {
    if (!(steps.S < steps.M && steps.M < steps.L)) {
      add(
        CONFIG_ERROR.UI_FONT_SCALE_ORDER,
        'font_scale_steps S < M < L',
        `font_scale_steps must satisfy S < M < L, got S=${steps.S}, M=${steps.M}, L=${steps.L} (gdd-06 A5)`,
      );
    }
  }
  if (
    isNumber(ui?.transition_banner_ms) &&
    isNumber(ui?.transition_settings_ms) &&
    isNumber(ui?.card_transition_ms) &&
    isNumber(ui?.transition_screen_ms)
  ) {
    const ordered =
      ui.transition_banner_ms <= ui.transition_settings_ms &&
      ui.transition_settings_ms <= ui.card_transition_ms &&
      ui.card_transition_ms <= ui.transition_screen_ms;
    if (!ordered) {
      add(
        CONFIG_ERROR.UI_TRANSITION_ORDER,
        'transition_banner_ms <= transition_settings_ms <= card_transition_ms <= transition_screen_ms',
        `Transition duration ordering violated: banner=${ui.transition_banner_ms}, ` +
          `settings=${ui.transition_settings_ms}, card=${ui.card_transition_ms}, ` +
          `screen=${ui.transition_screen_ms} (gdd-06 A5/B5 cross-GDD hazard)`,
      );
    }
  }
  if (
    isNumber(ui?.log_prefetch_threshold) &&
    isNumber(ui?.log_page_size) &&
    ui.log_prefetch_threshold >= ui.log_page_size
  ) {
    add(
      CONFIG_ERROR.UI_RANGE,
      'log_prefetch_threshold < log_page_size',
      `log_prefetch_threshold (${ui.log_prefetch_threshold}) must be < log_page_size (${ui.log_page_size}) (gdd-06 A5)`,
    );
  }
  if (isNumber(ui?.log_max_loaded_pages) && ui.log_max_loaded_pages < 2) {
    add(
      CONFIG_ERROR.UI_RANGE,
      'log_max_loaded_pages >= 2',
      `log_max_loaded_pages has a hard logical floor of 2, got ${ui.log_max_loaded_pages} (gdd-06 A5)`,
    );
  }

  // --- gdd-01 A.5 turn knobs ------------------------------------------------
  if (
    isNumber(turn.suggested_action_count) &&
    (turn.suggested_action_count < 2 || turn.suggested_action_count > 6)
  ) {
    add(
      CONFIG_ERROR.TURN_RANGE,
      '2 <= suggested_action_count <= 6',
      `suggested_action_count must be within 2..6, got ${turn.suggested_action_count} (gdd-01 A.5)`,
    );
  }
  if (isNumber(turn.undo_depth) && (turn.undo_depth < 0 || turn.undo_depth > 1)) {
    add(
      CONFIG_ERROR.TURN_RANGE,
      '0 <= undo_depth <= 1',
      `undo_depth must be 0 or 1; >1 breaks Pillar 2, got ${turn.undo_depth} (gdd-01 A.5)`,
    );
  }

  // --- gdd-06 C5 hack ceilings ---------------------------------------------
  for (const name of ['LEVEL_WRITE_MAX', 'STAT_WRITE_MAX']) {
    const v = hack[name];
    if (isNumber(v) && v <= 0) {
      add(
        CONFIG_ERROR.HACK_RANGE,
        `${name} > 0`,
        `${name} must be > 0, got ${v} (gdd-06 C5)`,
      );
    }
  }

  // --- gdd-05 B5 persistence ------------------------------------------------
  if (
    isNumber(persistence.quota_warn_threshold) &&
    (persistence.quota_warn_threshold <= 0 || persistence.quota_warn_threshold >= 1)
  ) {
    add(
      CONFIG_ERROR.PERSISTENCE_RANGE,
      '0 < quota_warn_threshold < 1',
      `quota_warn_threshold must be strictly between 0 and 1, got ${persistence.quota_warn_threshold} (gdd-05 B5)`,
    );
  }
  if (isNumber(persistence.FLUSH_EVERY_N_TURNS) && persistence.FLUSH_EVERY_N_TURNS < 1) {
    add(
      CONFIG_ERROR.PERSISTENCE_RANGE,
      'FLUSH_EVERY_N_TURNS >= 1',
      `FLUSH_EVERY_N_TURNS must be >= 1, got ${persistence.FLUSH_EVERY_N_TURNS} (gdd-05 B5)`,
    );
  }

  if (violations.length > 0) {
    throw new SystemsConfigError(violations);
  }
  return cfg;
}
