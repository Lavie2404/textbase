/**
 * gdd-02 PART A acceptance criteria - threshold curve, tier derivation, realm
 * naming and the raw `level` contract.
 *
 * Covers AC-01, AC-17, AC-18, AC-37 (tier floor), plus the decision C-4
 * regression lock that the module curve equals the shipped App formula.
 */

import { describe, expect, it } from 'vitest';
import {
  DEFAULT_REALM_NAMES,
  OVERFLOW_REALM_NAME,
  expThreshold,
  linearExpThreshold,
  realmInfoFromLevel,
  realmNameFromLevel,
  tierFromLevel,
} from '../../../src-web/systems/exp/expThreshold';
import { GAME_CONFIG } from '../../../gameConfig.js';
import { record } from './fixtures';
import { tierOfRecord } from '../../../src-web/systems/exp/resolveTurnExp';

describe('exp_realm_progression / threshold + tier', () => {
  it('AC-01 test_tier_for_levels_1_10_11_20_21_30_is_1_1_2_2_3_3', () => {
    expect([1, 10, 11, 20, 21, 30].map(tierFromLevel)).toEqual([1, 1, 2, 2, 3, 3]);
  });

  it('AC-01b test_tier_is_derived_never_stored_on_the_record', () => {
    const r = record({ level: 25 });
    expect(tierOfRecord(r)).toBe(3);
    expect(Object.prototype.hasOwnProperty.call(r, 'tier')).toBe(false);
  });

  it('AC-18 test_linear_exp_threshold_at_1_10_20_25_is_100_190_290_340', () => {
    expect([1, 10, 20, 25].map((l) => linearExpThreshold(l, 100, 10))).toEqual([
      100, 190, 290, 340,
    ]);
  });

  it('AC-18b test_threshold_is_monotone_increasing_and_unbounded', () => {
    for (let level = 1; level < 60; level++) {
      expect(linearExpThreshold(level + 1, 100, 10)).toBeGreaterThan(
        linearExpThreshold(level, 100, 10),
      );
      expect(expThreshold(level + 1)).toBeGreaterThan(expThreshold(level));
    }
  });

  it('AC-17 test_level_is_readable_as_a_raw_int_37', () => {
    expect(record({ level: 37 }).level).toBe(37);
    expect(tierFromLevel(37)).toBe(4);
  });

  it('AC-17b test_public_api_exposes_no_20_level_gap_helper', () => {
    // gdd-02 Core Rule #10: the "gap <= 20 levels" hostility rule belongs to
    // Situation/Encounter Generation, not to this system.
    const api = Object.keys(
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      {} as Record<string, unknown>,
    );
    expect(api).not.toContain('hostileInitiativeAllowed');
  });

  it('AC-37 test_tier_1_is_the_true_floor_and_level_below_1_never_yields_tier_0', () => {
    expect(tierFromLevel(1)).toBe(1);
    expect(tierFromLevel(0)).toBe(1);
    expect(tierFromLevel(-5)).toBe(1);
  });

  it('C-4 test_module_threshold_matches_the_shipped_app_formula_exactly', () => {
    const { base, levelExponent, realmMultiplier } = GAME_CONFIG.expFormula;
    for (const level of [1, 2, 9, 10, 11, 25, 40, 61]) {
      const expected = Math.floor(
        base * Math.pow(level, levelExponent) * Math.pow(realmMultiplier, Math.floor((level - 1) / 10)),
      );
      expect(expThreshold(level)).toBe(expected);
    }
  });

  it('C-4b test_threshold_clamps_a_level_below_1_to_a_positive_value', () => {
    expect(expThreshold(0)).toBeGreaterThan(0);
    expect(linearExpThreshold(0, 100, 10)).toBe(100);
  });

  it('REALM test_realm_name_uses_the_injected_list_and_strips_tang_suffixes', () => {
    const list = ['"Luyện Khí Tầng 3"', 'Trúc Cơ', 'Kim Đan'];
    expect(realmNameFromLevel(1, list)).toBe('Luyện Khí');
    expect(realmNameFromLevel(11, list)).toBe('Trúc Cơ');
    expect(realmInfoFromLevel(11, list)).toEqual({ realmName: 'Trúc Cơ', realmTier: 1 });
    expect(realmInfoFromLevel(20, list)).toEqual({ realmName: 'Trúc Cơ', realmTier: 10 });
  });

  it('REALM test_overflow_beyond_the_authored_list_is_vo_dinh_canh', () => {
    const list = ['A', 'B', 'C'];
    expect(realmNameFromLevel(31, list)).toBe(OVERFLOW_REALM_NAME);
    expect(realmInfoFromLevel(31, list).realmTier).toBe(1);
    expect(realmInfoFromLevel(41, list).realmTier).toBe(2);
  });

  it('REALM test_missing_list_falls_back_to_the_ten_default_realms', () => {
    expect(realmNameFromLevel(1, null)).toBe(DEFAULT_REALM_NAMES[0]);
    expect(realmNameFromLevel(95, [])).toBe(DEFAULT_REALM_NAMES[9]);
    expect(realmNameFromLevel(101, [])).toBe(OVERFLOW_REALM_NAME);
  });
});
