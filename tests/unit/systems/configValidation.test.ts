/**
 * Unit tests for src-web/systems/configValidation.ts.
 *
 * Each load-time invariant is violated INDIVIDUALLY (defaults untouched
 * otherwise) and the thrown error must name that invariant, so a failing build
 * tells a designer exactly which knob to fix.
 *
 * Design docs: gdd-02 A3/A5/D.1/D.2, gdd-03 1.5 + 2.5, gdd-04 A5, gdd-05 A5/B5,
 * gdd-06 A5/C5, gdd-01 A.5/C.5, production/gdd-integration/plan.md P0.
 */
import { describe, expect, it } from 'vitest';
import {
  CONFIG_ERROR,
  DEFAULT_SYSTEMS_CONFIG,
  SystemsConfigError,
  cloneDefaultSystemsConfig,
  validateSystemsConfig,
  type ConfigErrorCode,
  type SystemsConfig,
} from '../../../src-web/systems/configValidation';
import { GDD_STAT_KEYS } from '../../../src-web/systems/registry';

/** Factory: valid defaults with one targeted mutation applied. */
function configWith(mutate: (cfg: SystemsConfig) => void): SystemsConfig {
  const cfg = cloneDefaultSystemsConfig();
  mutate(cfg);
  return cfg;
}

function expectViolation(cfg: SystemsConfig, code: ConfigErrorCode, invariantFragment: string) {
  let thrown: unknown;
  try {
    validateSystemsConfig(cfg);
  } catch (e) {
    thrown = e;
  }
  expect(thrown).toBeInstanceOf(SystemsConfigError);
  const err = thrown as SystemsConfigError;
  const matching = err.violations.filter((v) => v.code === code);
  expect(matching.length).toBeGreaterThan(0);
  expect(matching.some((v) => v.invariant.includes(invariantFragment))).toBe(true);
  expect(err.message).toContain(code);
}

describe('DEFAULT_SYSTEMS_CONFIG', () => {
  it('test_defaults_pass_validation', () => {
    expect(() => validateSystemsConfig(DEFAULT_SYSTEMS_CONFIG)).not.toThrow();
  });

  it('test_validate_returns_the_config_when_valid', () => {
    const cfg = cloneDefaultSystemsConfig();
    expect(validateSystemsConfig(cfg)).toBe(cfg);
  });

  it('test_clone_is_independent_of_defaults', () => {
    const cfg = cloneDefaultSystemsConfig();
    cfg.exp.LOSS_EXP_RATE = 0.99;
    cfg.ui.font_scale_steps.S = 9;
    expect(DEFAULT_SYSTEMS_CONFIG.exp.LOSS_EXP_RATE).not.toBe(0.99);
    expect(DEFAULT_SYSTEMS_CONFIG.ui.font_scale_steps.S).not.toBe(9);
  });

  it('test_registry_supplies_all_26_mandatory_exp_constants', () => {
    expect(GDD_STAT_KEYS.length).toBe(12);
    for (const stat of GDD_STAT_KEYS) {
      expect(typeof DEFAULT_SYSTEMS_CONFIG.levelGrowth[stat]).toBe('number');
      expect(typeof DEFAULT_SYSTEMS_CONFIG.breakthroughBonus[stat]).toBe('number');
    }
    expect(typeof DEFAULT_SYSTEMS_CONFIG.exp.BASE_EXP_THRESHOLD).toBe('number');
    expect(typeof DEFAULT_SYSTEMS_CONFIG.exp.EXP_THRESHOLD_INCREMENT).toBe('number');
  });
});

describe('EXP invariants (gdd-02)', () => {
  it('test_win_loss_invariant_violated_throws_naming_it', () => {
    // gdd-02 A5 counter-example: both values are inside their published ranges.
    expectViolation(
      configWith((c) => {
        c.exp.WIN_EXP_BASE_FRACTION = 0.1;
      }),
      CONFIG_ERROR.WIN_LOSS_INVARIANT_VIOLATED,
      'WIN_EXP_BASE_FRACTION * WIN_EXP_FLOOR_MULT >= LOSS_EXP_RATE',
    );
  });

  it('test_win_loss_invariant_equality_is_allowed', () => {
    const cfg = configWith((c) => {
      c.exp.LOSS_EXP_RATE = c.exp.WIN_EXP_BASE_FRACTION * c.exp.WIN_EXP_FLOOR_MULT;
    });
    expect(() => validateSystemsConfig(cfg)).not.toThrow();
  });

  it('test_economy_margin_violated_throws_naming_it', () => {
    expectViolation(
      configWith((c) => {
        c.exp.PASSIVE_EXP_RATE = 0.05;
      }),
      CONFIG_ERROR.ECONOMY_INVARIANT_MARGIN_VIOLATED,
      'CONTENT_EXCHANGE_ESTIMATE',
    );
  });

  it('test_economy_margin_checked_at_every_exchange_estimate', () => {
    // Legal at 15 exchanges, illegal at 50 - the check must still fire.
    const cfg = configWith((c) => {
      c.exp.PASSIVE_EXP_RATE = 0.002;
      c.exp.SONG_TU_EXP_RATE = 0.0015;
    });
    let thrown: SystemsConfigError | undefined;
    try {
      validateSystemsConfig(cfg);
    } catch (e) {
      thrown = e as SystemsConfigError;
    }
    expect(thrown).toBeDefined();
    expect(
      thrown!.violations.filter(
        (v) => v.code === CONFIG_ERROR.ECONOMY_INVARIANT_MARGIN_VIOLATED,
      ).length,
    ).toBeGreaterThan(0);
  });

  it('test_base_exp_threshold_zero_throws', () => {
    expectViolation(
      configWith((c) => {
        c.exp.BASE_EXP_THRESHOLD = 0;
      }),
      CONFIG_ERROR.INVALID_THRESHOLD_CONFIG,
      'BASE_EXP_THRESHOLD > 0',
    );
  });

  it('test_negative_threshold_increment_throws', () => {
    expectViolation(
      configWith((c) => {
        c.exp.EXP_THRESHOLD_INCREMENT = -1;
      }),
      CONFIG_ERROR.INVALID_THRESHOLD_CONFIG,
      'EXP_THRESHOLD_INCREMENT >= 0',
    );
  });

  it('test_missing_level_growth_constant_throws_naming_the_stat', () => {
    expectViolation(
      configWith((c) => {
        delete c.levelGrowth.HP;
      }),
      CONFIG_ERROR.MISSING_TUNING_CONSTANT,
      'LEVEL_GROWTH_HP',
    );
  });

  it('test_missing_breakthrough_bonus_constant_throws_naming_the_stat', () => {
    expectViolation(
      configWith((c) => {
        delete c.breakthroughBonus.MITIGATION;
      }),
      CONFIG_ERROR.MISSING_TUNING_CONSTANT,
      'BREAKTHROUGH_BONUS_MITIGATION',
    );
  });

  it('test_missing_constant_never_silently_defaults_to_zero', () => {
    const cfg = configWith((c) => {
      delete c.exp.BASE_EXP_THRESHOLD;
    });
    expect(() => validateSystemsConfig(cfg)).toThrow(SystemsConfigError);
  });

  it('test_floor_mult_above_ceil_mult_throws', () => {
    expectViolation(
      configWith((c) => {
        c.exp.WIN_EXP_FLOOR_MULT = 4;
      }),
      CONFIG_ERROR.EXP_RANGE,
      'WIN_EXP_FLOOR_MULT <= WIN_EXP_CEIL_MULT',
    );
  });

  it('test_percent_stat_cap_at_one_throws', () => {
    expectViolation(
      configWith((c) => {
        c.exp.PERCENT_STAT_CAP = 1;
      }),
      CONFIG_ERROR.EXP_RANGE,
      'PERCENT_STAT_CAP',
    );
  });
});

describe('Affinity invariants (gdd-03 1.5)', () => {
  it('test_diminish_floor_zero_throws', () => {
    expectViolation(
      configWith((c) => {
        c.affinity.DIMINISH_FLOOR = 0;
      }),
      CONFIG_ERROR.AFFINITY_RANGE,
      'DIMINISH_FLOOR > 0',
    );
  });

  it('test_fatigue_window_shorter_than_positive_social_cooldown_throws', () => {
    expectViolation(
      configWith((c) => {
        c.affinity.FATIGUE_WINDOW_TURNS = 3;
        c.situation.POSITIVE_SOCIAL_COOLDOWN_TURNS = 4;
      }),
      CONFIG_ERROR.AFFINITY_FATIGUE_WINDOW,
      'FATIGUE_WINDOW_TURNS >= POSITIVE_SOCIAL_COOLDOWN_TURNS',
    );
  });

  it('test_fatigue_window_equal_to_cooldown_is_allowed', () => {
    const cfg = configWith((c) => {
      c.affinity.FATIGUE_WINDOW_TURNS = 4;
      c.situation.POSITIVE_SOCIAL_COOLDOWN_TURNS = 4;
    });
    expect(() => validateSystemsConfig(cfg)).not.toThrow();
  });

  it('test_propagation_rate_at_one_throws', () => {
    expectViolation(
      configWith((c) => {
        c.affinity.PROPAGATION_RATE = 1;
      }),
      CONFIG_ERROR.AFFINITY_RANGE,
      'PROPAGATION_RATE',
    );
  });

  it('test_non_positive_per_turn_cap_throws', () => {
    expectViolation(
      configWith((c) => {
        c.affinity.CAP_POSITIVE_PER_TURN = 0;
      }),
      CONFIG_ERROR.AFFINITY_RANGE,
      'CAP_POSITIVE_PER_TURN > 0',
    );
  });

  it('test_propagation_severity_outside_scale_throws', () => {
    expectViolation(
      configWith((c) => {
        c.affinity.PROPAGATION_SEVERITY_MIN = 6;
      }),
      CONFIG_ERROR.AFFINITY_RANGE,
      'PROPAGATION_SEVERITY_MIN',
    );
  });
});

describe('Death & Consequence invariants (gdd-03 2.5)', () => {
  it('test_death_roll_min_above_max_throws', () => {
    expectViolation(
      configWith((c) => {
        c.death.DEATH_ROLL_MIN = 0.96;
      }),
      CONFIG_ERROR.DEATH_ROLL_ENVELOPE,
      'DEATH_ROLL_MIN < DEATH_ROLL_MAX',
    );
  });

  it('test_death_roll_min_equal_max_throws', () => {
    expectViolation(
      configWith((c) => {
        c.death.DEATH_ROLL_MIN = c.death.DEATH_ROLL_MAX;
      }),
      CONFIG_ERROR.DEATH_ROLL_ENVELOPE,
      'DEATH_ROLL_MIN < DEATH_ROLL_MAX',
    );
  });

  it('test_death_probability_outside_unit_interval_throws', () => {
    expectViolation(
      configWith((c) => {
        c.death.DEATH_ROLL_BASE = 1.5;
      }),
      CONFIG_ERROR.DEATH_RANGE,
      'DEATH_ROLL_BASE',
    );
  });

  it('test_severity_thresholds_out_of_order_throws', () => {
    expectViolation(
      configWith((c) => {
        c.death.SEVERITY_MILD_THRESHOLD = 0.8;
      }),
      CONFIG_ERROR.DEATH_SEVERITY_ORDER,
      'SEVERITY_MILD_THRESHOLD < SEVERITY_SEVERE_THRESHOLD',
    );
  });

  it('test_recovery_item_envelope_inverted_throws', () => {
    expectViolation(
      configWith((c) => {
        c.death.RECOVERY_ITEM_MIN = 0.95;
      }),
      CONFIG_ERROR.RECOVERY_ITEM_ENVELOPE,
      'RECOVERY_ITEM_MIN < RECOVERY_ITEM_MAX',
    );
  });

  it('test_zero_recovery_cooldown_throws', () => {
    expectViolation(
      configWith((c) => {
        c.death.RECOVERY_SELF_COOLDOWN_TURNS = 0;
      }),
      CONFIG_ERROR.DEATH_RANGE,
      'RECOVERY_SELF_COOLDOWN_TURNS >= 1',
    );
  });
});

describe('Cross-system invariants (gdd-04 A5, gdd-05 A5)', () => {
  it('test_rescue_cooldown_below_twice_social_cooldown_throws', () => {
    expectViolation(
      configWith((c) => {
        c.situation.POSITIVE_SOCIAL_COOLDOWN_TURNS = 8;
      }),
      CONFIG_ERROR.SITUATION_RESCUE_COOLDOWN,
      'RESCUE_COOLDOWN_TURNS >= 2 * POSITIVE_SOCIAL_COOLDOWN_TURNS',
    );
  });

  it('test_ambient_hostile_level_cap_above_hard_ceiling_throws', () => {
    expectViolation(
      configWith((c) => {
        c.situation.AMBIENT_HOSTILE_LEVEL_CAP = 25;
      }),
      CONFIG_ERROR.SITUATION_RANGE,
      'AMBIENT_HOSTILE_LEVEL_CAP <= 20',
    );
  });

  it('test_entity_budget_below_scene_cap_plus_global_slot_throws', () => {
    expectViolation(
      configWith((c) => {
        c.memory.max_entities_per_prompt = 3;
      }),
      CONFIG_ERROR.MEMORY_ENTITY_BUDGET,
      'max_entities_per_prompt >= MAX_NPC_PER_SCENE + 1',
    );
  });

  it('test_recency_window_below_absolute_floor_throws', () => {
    expectViolation(
      configWith((c) => {
        c.memory.recency_window_turns = 0;
      }),
      CONFIG_ERROR.MEMORY_RANGE,
      'recency_window_turns >= 1',
    );
  });
});

describe('AI + UI ordering invariants (gdd-01 C.5, gdd-06 A5)', () => {
  it('test_request_timeout_not_below_logical_timeout_throws', () => {
    expectViolation(
      configWith((c) => {
        c.ai.request_timeout_default = 60;
      }),
      CONFIG_ERROR.AI_TIMEOUT_ORDER,
      'request_timeout_default < ai_call_timeout_seconds',
    );
  });

  it('test_decision_c10_timeouts_are_the_shipped_defaults', () => {
    // plan.md C-10 deliberately overrides the GDD 30s/15s pair.
    expect(DEFAULT_SYSTEMS_CONFIG.ai.ai_call_timeout_seconds).toBe(60);
    expect(DEFAULT_SYSTEMS_CONFIG.ai.request_timeout_default).toBe(45);
  });

  it('test_escalation_not_below_logical_timeout_throws', () => {
    expectViolation(
      configWith((c) => {
        c.ui.ai_writing_escalation_seconds = 60;
      }),
      CONFIG_ERROR.AI_TIMEOUT_ORDER,
      'ai_writing_escalation_seconds < ai_call_timeout_seconds',
    );
  });

  it('test_font_scale_steps_out_of_order_throws', () => {
    expectViolation(
      configWith((c) => {
        c.ui.font_scale_steps.M = 0.5;
      }),
      CONFIG_ERROR.UI_FONT_SCALE_ORDER,
      'font_scale_steps S < M < L',
    );
  });

  it('test_transition_duration_ordering_violation_throws', () => {
    expectViolation(
      configWith((c) => {
        c.ui.card_transition_ms = 300;
      }),
      CONFIG_ERROR.UI_TRANSITION_ORDER,
      'transition_banner_ms <= transition_settings_ms',
    );
  });

  it('test_prefetch_threshold_not_below_page_size_throws', () => {
    expectViolation(
      configWith((c) => {
        c.ui.log_prefetch_threshold = 20;
      }),
      CONFIG_ERROR.UI_RANGE,
      'log_prefetch_threshold < log_page_size',
    );
  });

  it('test_single_loaded_page_throws', () => {
    expectViolation(
      configWith((c) => {
        c.ui.log_max_loaded_pages = 1;
      }),
      CONFIG_ERROR.UI_RANGE,
      'log_max_loaded_pages >= 2',
    );
  });
});

describe('Turn / hack / persistence ranges', () => {
  it('test_suggested_action_count_out_of_range_throws', () => {
    expectViolation(
      configWith((c) => {
        c.turn.suggested_action_count = 7;
      }),
      CONFIG_ERROR.TURN_RANGE,
      'suggested_action_count',
    );
  });

  it('test_undo_depth_above_one_throws', () => {
    expectViolation(
      configWith((c) => {
        c.turn.undo_depth = 2;
      }),
      CONFIG_ERROR.TURN_RANGE,
      'undo_depth',
    );
  });

  it('test_non_positive_write_ceiling_throws', () => {
    expectViolation(
      configWith((c) => {
        c.hack.LEVEL_WRITE_MAX = 0;
      }),
      CONFIG_ERROR.HACK_RANGE,
      'LEVEL_WRITE_MAX > 0',
    );
  });

  it('test_quota_warn_threshold_at_one_throws', () => {
    expectViolation(
      configWith((c) => {
        c.persistence.quota_warn_threshold = 1;
      }),
      CONFIG_ERROR.PERSISTENCE_RANGE,
      'quota_warn_threshold',
    );
  });
});

describe('error reporting', () => {
  it('test_all_violations_reported_in_one_throw', () => {
    const cfg = configWith((c) => {
      c.exp.WIN_EXP_BASE_FRACTION = 0.1;
      c.death.DEATH_ROLL_MIN = 0.99;
      c.affinity.DIMINISH_FLOOR = 0;
    });
    let thrown: SystemsConfigError | undefined;
    try {
      validateSystemsConfig(cfg);
    } catch (e) {
      thrown = e as SystemsConfigError;
    }
    expect(thrown).toBeDefined();
    const codes = new Set(thrown!.violations.map((v) => v.code));
    expect(codes.has(CONFIG_ERROR.WIN_LOSS_INVARIANT_VIOLATED)).toBe(true);
    expect(codes.has(CONFIG_ERROR.DEATH_ROLL_ENVELOPE)).toBe(true);
    expect(codes.has(CONFIG_ERROR.AFFINITY_RANGE)).toBe(true);
  });

  it('test_error_codes_are_compared_by_constant_not_message_text', () => {
    // gdd-02 A3: codes are stable identifiers, verified by equality.
    expect(CONFIG_ERROR.WIN_LOSS_INVARIANT_VIOLATED).toBe(
      'EXP_ERROR_WIN_LOSS_INVARIANT_VIOLATED',
    );
    expect(CONFIG_ERROR.MISSING_TUNING_CONSTANT).toBe('EXP_ERROR_MISSING_TUNING_CONSTANT');
  });
});
