/**
 * gdd-02 PART A data-load acceptance criteria - the fail-loud config gates.
 *
 * Covers AC-41, AC-42, AC-45, AC-47, AC-48, and the live `gameConfig.js`
 * regression lock (the shipped defaults must always pass every gate).
 */

import { describe, expect, it } from 'vitest';
import {
  EXP_ERROR,
  ExpError,
  assertEconomyInvariant,
  assertExpKnobs,
} from '../../../src-web/systems/exp/resolveTurnExp';
import {
  equipmentKnobsFromGameConfig,
  expKnobsFromGameConfig,
  statGrowthConfigFromGameConfig,
  systemsConfigFromGameConfig,
  validateGameConfig,
} from '../../../src-web/systems/exp/gameConfigAdapter';
import { validateSystemsConfig } from '../../../src-web/systems/configValidation';
import { GDD_STAT_KEYS } from '../../../src-web/systems/registry';
import { DEFAULT_KNOBS, knobs } from './fixtures';

function expectCode(fn: () => unknown, code: string) {
  try {
    fn();
    throw new Error('expected a throw');
  } catch (e) {
    expect(e).toBeInstanceOf(ExpError);
    expect((e as ExpError).code).toBe(code);
  }
}

describe('exp_realm_progression / data-load gates', () => {
  it('AC-41 test_missing_any_required_constant_fails_loud_before_the_session_starts', () => {
    for (const name of ['PASSIVE_EXP_RATE', 'WIN_EXP_TIER_BONUS', 'SONG_TU_EXP_RATE'] as const) {
      const broken = { ...DEFAULT_KNOBS };
      delete (broken as Record<string, unknown>)[name];
      expectCode(() => assertExpKnobs(broken), EXP_ERROR.MISSING_TUNING_CONSTANT);
    }
  });

  it('AC-41b test_the_error_names_the_missing_constant_and_never_defaults_to_zero', () => {
    const broken = { ...DEFAULT_KNOBS };
    delete (broken as Record<string, unknown>).LOSS_EXP_RATE;
    try {
      assertExpKnobs(broken);
      throw new Error('expected a throw');
    } catch (e) {
      expect((e as ExpError).details.missing_constant_name).toBe('LOSS_EXP_RATE');
    }
  });

  it('AC-41c test_all_24_stat_growth_constants_are_present_in_gameConfig', () => {
    const growth = statGrowthConfigFromGameConfig();
    for (const stat of GDD_STAT_KEYS) {
      expect(Number.isFinite(growth.levelGrowth[stat])).toBe(true);
      expect(Number.isFinite(growth.breakthroughBonus[stat])).toBe(true);
    }
  });

  it('AC-42 test_base_exp_threshold_zero_is_blocked_at_data_load', () => {
    expectCode(
      () => assertExpKnobs(knobs({ BASE_EXP_THRESHOLD: 0 })),
      EXP_ERROR.INVALID_THRESHOLD_CONFIG,
    );
  });

  it('AC-47 test_negative_exp_threshold_increment_is_blocked_at_data_load', () => {
    expectCode(
      () => assertExpKnobs(knobs({ EXP_THRESHOLD_INCREMENT: -5 })),
      EXP_ERROR.INVALID_THRESHOLD_CONFIG,
    );
  });

  it('AC-45 test_win_loss_invariant_0_10_x_0_30_below_0_04_raises_the_exact_code', () => {
    expectCode(
      () => assertExpKnobs(knobs({ WIN_EXP_BASE_FRACTION: 0.1, WIN_EXP_FLOOR_MULT: 0.3, LOSS_EXP_RATE: 0.04 })),
      EXP_ERROR.WIN_LOSS_INVARIANT_VIOLATED,
    );
  });

  it('AC-45b test_the_shipped_defaults_pass_the_win_loss_invariant', () => {
    expect(() => assertExpKnobs(DEFAULT_KNOBS)).not.toThrow();
    expect(DEFAULT_KNOBS.WIN_EXP_BASE_FRACTION * DEFAULT_KNOBS.WIN_EXP_FLOOR_MULT).toBeGreaterThanOrEqual(
      DEFAULT_KNOBS.LOSS_EXP_RATE,
    );
  });

  it('AC-48 test_economy_invariant_holds_at_15_and_50_exchanges', () => {
    expect(() => assertEconomyInvariant(DEFAULT_KNOBS, [15, 30, 50])).not.toThrow();
  });

  it('AC-48b test_an_out_of_range_exchange_estimate_of_60_raises_a_config_error', () => {
    expectCode(
      () => assertEconomyInvariant(DEFAULT_KNOBS, [60]),
      EXP_ERROR.ECONOMY_INVARIANT_MARGIN_VIOLATED,
    );
  });

  it('AC-48c test_raising_passive_until_idling_outpaces_combat_raises_the_margin_error', () => {
    expectCode(
      () => assertEconomyInvariant(knobs({ PASSIVE_EXP_RATE: 0.02 }), [50]),
      EXP_ERROR.ECONOMY_INVARIANT_MARGIN_VIOLATED,
    );
  });
});

describe('exp_realm_progression / gameConfig.js wiring', () => {
  it('CFG test_the_shipped_gameConfig_passes_every_gate', () => {
    expect(() => validateGameConfig()).not.toThrow();
  });

  it('CFG test_exp_knobs_are_read_from_the_expProgression_block', () => {
    const k = expKnobsFromGameConfig();
    expect(k.WIN_EXP_BASE_FRACTION).toBe(0.2);
    expect(k.LOSS_EXP_RATE).toBe(0.04);
    expect(k.FREE_EVENT_EXP_CAP_FRACTION).toBe(0.1);
    expect(k.PERCENT_STAT_CAP).toBe(0.95);
  });

  it('CFG test_equipment_knobs_are_read_from_the_equipment_block', () => {
    const k = equipmentKnobsFromGameConfig();
    expect(k.min_thuc_per_skill).toBe(3);
    expect(k.max_known_skills_per_character).toBe(6);
  });

  it('CFG test_the_assembled_systems_config_validates_as_a_whole', () => {
    expect(() => validateSystemsConfig(systemsConfigFromGameConfig())).not.toThrow();
  });

  it('CFG test_a_broken_config_block_is_reported_rather_than_silently_absorbed', () => {
    const broken = { expProgression: { ...expKnobsFromGameConfig(), LOSS_EXP_RATE: 9 }, statGrowth: {}, equipment: {} };
    expect(() => validateGameConfig(broken as never)).toThrow();
  });
});
