/**
 * gdd-02 PART A, D.5 acceptance criteria - stat growth per level and per tier.
 *
 * Covers AC-13, AC-25, AC-26, AC-27, plus decision C-5 (the AP term) and the
 * documented App stat mapping.
 */

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STAT_GROWTH_CONFIG,
  GDD_TO_APP_STAT,
  PERCENT_STAT_CAP,
  StatGrowthConfigError,
  UNMAPPED_GDD_STATS,
  assertStatGrowthConfig,
  computeAllStats,
  computeAppStats,
  fromAppScale,
  isPercentStat,
  rawStatValue,
  statValue,
  toAppScale,
} from '../../../src-web/systems/exp/statGrowth';

describe('exp_realm_progression / D.5 stat growth', () => {
  it('AC-13 test_hp_l10_t1_is_172_and_l11_t2_is_230_with_delta_58', () => {
    const at10 = statValue('HP', 100, 10);
    const at11 = statValue('HP', 100, 11);
    expect(at10).toBe(172); // 100 + 8*9 + 50*0
    expect(at11).toBe(230); // 100 + 8*10 + 50*1
    expect(at11 - at10).toBe(58); // 8 growth + 50 breakthrough, one mechanism
  });

  it('AC-25 test_raw_atk_at_l25_t3_is_62_and_is_never_clamped', () => {
    expect(statValue('ATK', 10, 25)).toBe(62); // 10 + 1.5*24 + 8*2
    expect(isPercentStat('ATK')).toBe(false);
    expect(statValue('ATK', 10_000, 25)).toBeGreaterThan(PERCENT_STAT_CAP);
  });

  it('AC-26 test_crit_rate_at_l25_t3_is_0_282_and_stays_below_the_cap', () => {
    expect(statValue('CRIT_RATE', 0.05, 25)).toBeCloseTo(0.282, 12);
    expect(statValue('CRIT_RATE', 0.05, 25)).toBeLessThan(PERCENT_STAT_CAP);
  });

  it('AC-27 test_a_percentage_stat_raw_5_9_clamps_to_exactly_0_95', () => {
    const base = 5.9 - (0.008 * 24 + 0.02 * 2); // makes the raw value exactly 5.9
    expect(rawStatValue('CRIT_RATE', base, 25)).toBeCloseTo(5.9, 12);
    expect(statValue('CRIT_RATE', base, 25)).toBe(0.95);
    expect(statValue('CRIT_RATE', base, 25)).not.toBe(1.0);
  });

  it('AC-27b test_a_negative_percentage_stat_clamps_to_zero', () => {
    expect(statValue('EVASION', -5, 1)).toBe(0);
  });

  it('AC-13b test_level_1_tier_1_returns_the_base_value_untouched', () => {
    expect(statValue('HP', 100, 1)).toBe(100);
    expect(statValue('ATK', 10, 1)).toBe(10);
  });

  it('C-5 test_ap_bonus_is_a_fourth_additive_term', () => {
    expect(statValue('HP', 100, 10, DEFAULT_STAT_GROWTH_CONFIG, 400)).toBe(572);
  });

  it('C-5b test_ap_bonus_is_applied_before_the_percentage_clamp', () => {
    expect(statValue('CRIT_RATE', 0.05, 25, DEFAULT_STAT_GROWTH_CONFIG, 10)).toBe(0.95);
  });

  it('D5 test_compute_all_stats_returns_all_twelve_gdd_stats', () => {
    const all = computeAllStats({ HP: 100, ATK: 10, CRIT_RATE: 0.05 }, 25);
    expect(Object.keys(all)).toHaveLength(12);
    expect(all.HP).toBe(392); // 100 + 8*24 + 50*2 (gdd-02 D.5 worked example)
    expect(all.ATK).toBe(62);
    expect(all.CRIT_RATE).toBeCloseTo(0.282, 12);
  });

  it('D5b test_missing_growth_constant_fails_loud_and_never_defaults_to_zero', () => {
    const broken = {
      ...DEFAULT_STAT_GROWTH_CONFIG,
      levelGrowth: { ...DEFAULT_STAT_GROWTH_CONFIG.levelGrowth, DEF: undefined as unknown as number },
    };
    expect(() => assertStatGrowthConfig(broken)).toThrowError(StatGrowthConfigError);
    expect(() => rawStatValue('DEF', 10, 5, broken)).toThrowError(/LEVEL_GROWTH_DEF/);
  });

  it('MAP test_nine_gdd_stats_map_onto_app_fields_and_three_are_unmapped', () => {
    expect(UNMAPPED_GDD_STATS).toEqual(['ACC', 'LIFESTEAL', 'HP_REGEN']);
    expect(GDD_TO_APP_STAT.HP).toBe('baseHp');
    expect(GDD_TO_APP_STAT.CRIT_RATE).toBe('baseCr');
    expect(GDD_TO_APP_STAT.MITIGATION).toBe('baseDmgRes');
    expect(GDD_TO_APP_STAT.ACC).toBeNull();
  });

  it('MAP test_percentage_scale_conversion_round_trips', () => {
    expect(toAppScale('CRIT_RATE', 0.15)).toBeCloseTo(15, 12);
    expect(fromAppScale('CRIT_RATE', 15)).toBeCloseTo(0.15, 12);
    expect(toAppScale('HP', 392)).toBe(392);
  });

  it('MAP test_compute_app_stats_emits_only_the_mapped_app_field_names', () => {
    const app = computeAppStats({ HP: 100, ATK: 10 }, 25);
    expect(app.baseHp).toBe(392);
    expect(app.baseAtk).toBe(62);
    expect(Object.keys(app)).toHaveLength(9);
  });
});
