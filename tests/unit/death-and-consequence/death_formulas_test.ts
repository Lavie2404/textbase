/**
 * Death & Consequence - D.1 death_roll, D.2 severity_tier, D.3 recovery_attempt.
 *
 * AC coverage (gdd-03 PART 2, 2.8): AC-16..AC-31, AC-35, AC-47, AC-48, plus the
 * three mandatory MIN<MAX knob invariants of 2.4.
 */

import { describe, expect, it } from 'vitest';
import {
  assertDeathKnobs,
  deathProbability,
  rollDeath,
  DEATH_ERROR,
  DeathError,
} from '../../../src-web/systems/death/deathRoll';
import {
  CONSEQUENCE_TYPE,
  consequenceType,
  severityTier,
  tierCripples,
} from '../../../src-web/systems/death/severityTier';
import {
  RECOVERY_METHODS,
  attemptRecovery,
  recoveryProbability,
  recoverySelfAllowed,
} from '../../../src-web/systems/death/recovery';
import { DEATH_KNOBS } from '../../../src-web/systems/registry';
import { knobs, rngSequence } from './fixtures';

const K = knobs();

describe('D.1 death_roll (AC-16..AC-20, AC-48)', () => {
  it('test_anchor_margin_030_gives_p_0355_and_roll_02_dies', () => {
    expect(deathProbability(0.3, K)).toBeCloseTo(0.355, 10);
    const result = rollDeath(0.3, rngSequence(0.2), K);
    expect(result.died).toBe(true);
  });

  it('test_anchor_margin_100_clamps_to_095_and_roll_097_survives', () => {
    // AC-17: the envelope is never 100%.
    expect(deathProbability(1.0, K)).toBeCloseTo(0.95, 10);
    expect(rollDeath(1.0, rngSequence(0.97), K).died).toBe(false);
  });

  it('test_probability_clamps_up_to_the_minimum', () => {
    // AC-18: a 0-margin win still carries the floor risk.
    expect(deathProbability(-5, K)).toBe(K.DEATH_ROLL_MIN);
    expect(deathProbability(0, knobs({ DEATH_ROLL_BASE: 0 }))).toBe(K.DEATH_ROLL_MIN);
  });

  it('test_probability_clamps_down_to_the_maximum', () => {
    // AC-19.
    expect(deathProbability(5, K)).toBe(K.DEATH_ROLL_MAX);
  });

  it('test_comparison_is_strict_so_equality_survives', () => {
    // AC-20: roll == P must SURVIVE.
    const p = deathProbability(0.3, K);
    expect(rollDeath(0.3, rngSequence(p), K).died).toBe(false);
    expect(rollDeath(0.3, rngSequence(p - 1e-12), K).died).toBe(true);
  });

  it('test_rng_is_a_required_injected_dependency', () => {
    try {
      rollDeath(0.3, undefined as never, K);
      throw new Error('should have thrown');
    } catch (err) {
      expect((err as DeathError).code).toBe(DEATH_ERROR.RNG_REQUIRED);
    }
  });

  it('test_two_rng_stubs_do_not_leak_into_each_other', () => {
    // AC-48.
    const a = rngSequence(0.01);
    const b = rngSequence(0.99);
    expect(rollDeath(0.3, a, K).died).toBe(true);
    expect(rollDeath(0.3, b, K).died).toBe(false);
    expect(a.calls()).toBe(1);
    expect(b.calls()).toBe(1);
  });

  it('test_result_reports_the_probability_and_the_sample_it_used', () => {
    const result = rollDeath(0.5, rngSequence(0.4), K);
    expect(result.p_death).toBeCloseTo(0.525, 10);
    expect(result.roll).toBe(0.4);
  });
});

describe('D.2 severity_tier (AC-21..AC-25)', () => {
  it('test_mild_medium_boundary_at_035', () => {
    // AC-23: 0.349 / 0.35 / 0.351 -> mild / medium / medium.
    expect(severityTier(0.349, K)).toBe('mild');
    expect(severityTier(0.35, K)).toBe('medium');
    expect(severityTier(0.351, K)).toBe('medium');
  });

  it('test_medium_severe_boundary_at_075', () => {
    // AC-24: 0.749 / 0.75 / 0.751 -> medium / severe / severe.
    expect(severityTier(0.749, K)).toBe('medium');
    expect(severityTier(0.75, K)).toBe('severe');
    expect(severityTier(0.751, K)).toBe('severe');
  });

  it('test_forced_severe_bypasses_the_margin_table', () => {
    // AC-07: a 0.05 margin still becomes severe when forced...
    expect(severityTier(0.05, K, true)).toBe('severe');
    // ...and the contrast case proves the flag is what caused it.
    expect(severityTier(0.05, K, false)).toBe('mild');
  });

  it('test_medium_with_a_null_tag_is_the_default_humiliation', () => {
    // AC-21: the optional chaining must survive a null npc_tag entirely.
    expect(consequenceType('medium', null)).toBe(CONSEQUENCE_TYPE.MEDIUM);
    expect(consequenceType('medium', undefined)).toBe(CONSEQUENCE_TYPE.MEDIUM);
    expect(consequenceType('medium', { medium_override: null })).toBe(CONSEQUENCE_TYPE.MEDIUM);
  });

  it('test_medium_override_is_honoured_only_on_medium', () => {
    // AC-25.
    const tag = { medium_override: CONSEQUENCE_TYPE.MEDIUM_OVERRIDE_POISON };
    expect(consequenceType('medium', tag)).toBe(CONSEQUENCE_TYPE.MEDIUM_OVERRIDE_POISON);
    expect(consequenceType('mild', tag)).toBe(CONSEQUENCE_TYPE.MILD);
    expect(consequenceType('severe', tag)).toBe(CONSEQUENCE_TYPE.SEVERE);
  });

  it('test_only_severe_cripples', () => {
    // AC-22.
    expect(tierCripples('severe')).toBe(true);
    expect(tierCripples('medium')).toBe(false);
    expect(tierCripples('mild')).toBe(false);
  });

  it('test_int_inputs_are_cast_before_dividing', () => {
    // AC-40: 42/100 must be 0.42 and D.2 must then say medium.
    const margin = 42 / 100;
    expect(margin).toBeCloseTo(0.42, 10);
    expect(severityTier(margin, K)).toBe('medium');
  });
});

describe('D.3 recovery_attempt (AC-26..AC-31, AC-35, AC-47)', () => {
  const base = { blocked: true, currentTurn: 100, knobs: K };

  it('test_probability_per_method', () => {
    expect(recoveryProbability('dai_co_duyen', K)).toBe(K.RECOVERY_FORTUNE_RATE);
    expect(recoveryProbability('tu_tu', K)).toBe(K.RECOVERY_SELF_RATE);
    expect(recoveryProbability('tien_thao_di_bao', K, 0.5)).toBe(0.5);
  });

  it('test_item_efficacy_is_clamped_into_its_envelope', () => {
    expect(recoveryProbability('tien_thao_di_bao', K, 0)).toBe(K.RECOVERY_ITEM_MIN);
    expect(recoveryProbability('tien_thao_di_bao', K, 1)).toBe(K.RECOVERY_ITEM_MAX);
  });

  it('test_unknown_method_and_missing_efficacy_return_null', () => {
    expect(recoveryProbability('cau_troi', K)).toBeNull();
    expect(recoveryProbability('tien_thao_di_bao', K)).toBeNull();
  });

  it('test_fortune_success_clears_the_flag_and_consumes_the_event', () => {
    // AC-26.
    const result = attemptRecovery({ ...base, method: 'dai_co_duyen', rng: rngSequence(0.1) });
    expect(result.success).toBe(true);
    expect(result.blocked_after).toBe(false);
    expect(result.cost_paid).toBe(true);
  });

  it('test_fortune_failure_still_consumes_the_event', () => {
    // AC-29.
    const result = attemptRecovery({ ...base, method: 'dai_co_duyen', rng: rngSequence(0.99) });
    expect(result.success).toBe(false);
    expect(result.blocked_after).toBe(true);
    expect(result.cost_paid).toBe(true);
  });

  it('test_item_failure_still_consumes_the_item', () => {
    // AC-27.
    const result = attemptRecovery({
      ...base,
      method: 'tien_thao_di_bao',
      itemEfficacy: 0.2,
      rng: rngSequence(0.9),
    });
    expect(result.accepted).toBe(true);
    expect(result.success).toBe(false);
    expect(result.cost_paid).toBe(true);
  });

  it('test_self_failure_still_stamps_the_cooldown', () => {
    // AC-28.
    const result = attemptRecovery({ ...base, method: 'tu_tu', rng: rngSequence(0.99) });
    expect(result.success).toBe(false);
    expect(result.last_self_attempt_turn).toBe(100);
  });

  it('test_cooldown_boundary_is_inclusive', () => {
    // AC-30: 100 - 95 = 5 with a cooldown of 5 IS allowed.
    expect(recoverySelfAllowed(95, 100, K)).toBe(true);
    expect(recoverySelfAllowed(null, 0, K)).toBe(true);
    const result = attemptRecovery({
      ...base,
      method: 'tu_tu',
      lastSelfAttemptTurn: 95,
      rng: rngSequence(0.01),
    });
    expect(result.accepted).toBe(true);
    expect(result.success).toBe(true);
  });

  it('test_cooldown_blocks_before_any_roll_or_state_change', () => {
    // AC-31: 4 < 5 is refused, and the RNG is never touched.
    const rng = rngSequence(0.01);
    const result = attemptRecovery({
      ...base,
      method: 'tu_tu',
      lastSelfAttemptTurn: 96,
      rng,
    });
    expect(result.accepted).toBe(false);
    expect(result.rejected_reason).toBe('self_cooldown');
    expect(result.cost_paid).toBe(false);
    expect(result.last_self_attempt_turn).toBe(96);
    expect(rng.calls()).toBe(0);
  });

  it('test_recovery_while_healthy_is_rejected_before_any_cost', () => {
    // AC-35.
    const rng = rngSequence(0.01);
    const result = attemptRecovery({ ...base, blocked: false, method: 'dai_co_duyen', rng });
    expect(result.accepted).toBe(false);
    expect(result.rejected_reason).toBe('not_crippled');
    expect(result.cost_paid).toBe(false);
    expect(rng.calls()).toBe(0);
  });

  it('test_invalid_method_is_rejected_with_no_cost', () => {
    const rng = rngSequence(0.01);
    const result = attemptRecovery({ ...base, method: 'cau_troi', rng });
    expect(result.rejected_reason).toBe('invalid_method');
    expect(rng.calls()).toBe(0);
  });

  it('test_success_is_the_only_path_that_clears_the_flag', () => {
    // AC-47.
    for (const method of RECOVERY_METHODS) {
      const failed = attemptRecovery({
        ...base,
        method,
        itemEfficacy: 0.5,
        rng: rngSequence(0.999),
      });
      expect(failed.blocked_after).toBe(true);
    }
  });

  it('test_comparison_is_strict_for_recovery_too', () => {
    const result = attemptRecovery({
      ...base,
      method: 'dai_co_duyen',
      rng: rngSequence(K.RECOVERY_FORTUNE_RATE),
    });
    expect(result.success).toBe(false);
  });
});

describe('knob block validation (gdd-03 2.4 mandatory MIN<MAX invariants)', () => {
  it('test_registry_defaults_pass', () => {
    expect(() => assertDeathKnobs(DEATH_KNOBS)).not.toThrow();
    expect(Object.keys(DEATH_KNOBS)).toHaveLength(12);
  });

  it('test_missing_knob_names_itself', () => {
    const broken = { ...DEATH_KNOBS } as Record<string, number>;
    delete broken.RECOVERY_SELF_RATE;
    try {
      assertDeathKnobs(broken as never);
      throw new Error('should have thrown');
    } catch (err) {
      expect((err as DeathError).code).toBe(DEATH_ERROR.MISSING_TUNING_CONSTANT);
      expect((err as DeathError).details.missing_constant_name).toBe('RECOVERY_SELF_RATE');
    }
  });

  it('test_severity_order_inversion_is_rejected', () => {
    // Otherwise `medium` becomes silently unreachable.
    expect(() =>
      assertDeathKnobs(knobs({ SEVERITY_MILD_THRESHOLD: 0.8, SEVERITY_SEVERE_THRESHOLD: 0.75 })),
    ).toThrowError(DeathError);
  });

  it('test_death_roll_and_recovery_item_envelopes_are_checked', () => {
    expect(() => assertDeathKnobs(knobs({ DEATH_ROLL_MIN: 0.96 }))).toThrowError(DeathError);
    expect(() => assertDeathKnobs(knobs({ RECOVERY_ITEM_MIN: 0.95 }))).toThrowError(DeathError);
  });
});
