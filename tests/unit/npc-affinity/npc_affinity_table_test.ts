/**
 * NPC Affinity - D.1 lookup table, D.2 diminishing returns, D.3 repetition
 * fatigue, D.4 per-turn cap.
 *
 * AC coverage (gdd-03 PART 1, 1.8): AC-04, AC-12, AC-13, AC-13b, AC-14, AC-15,
 * AC-16, AC-16a, AC-16b, AC-17.
 */

import { describe, expect, it } from 'vitest';
import {
  baseDelta,
  combatWinDelta,
  isPositiveEventType,
  marginRatio,
  perpetratorKnown,
  severityOf,
  assertAffinityKnobs,
  AFFINITY_ERROR,
  AffinityError,
  SOCIAL_EVENT_TYPES,
} from '../../../src-web/systems/affinity/table';
import { applyDiminish, diminishFactor } from '../../../src-web/systems/affinity/diminish';
import {
  applyFatigue,
  fatigueFactor,
  streakBefore,
  updateStreak,
} from '../../../src-web/systems/affinity/fatigue';
import { capPositiveTotal } from '../../../src-web/systems/affinity/perTurnCap';
import { AFFINITY_KNOBS, SITUATION_KNOBS } from '../../../src-web/systems/registry';
import { event, knobs } from './fixtures';

const K = knobs();

describe('D.1 event -> base_delta table (AC-12)', () => {
  it('test_gift_returns_plus_five', () => {
    expect(baseDelta(event('gift', 'n1'), K)).toBe(5);
  });

  it('test_small_help_returns_plus_three', () => {
    expect(baseDelta(event('small_help', 'n1'), K)).toBe(3);
  });

  it('test_save_life_returns_plus_fifteen', () => {
    expect(baseDelta(event('save_life', 'n1'), K)).toBe(15);
  });

  it('test_combat_loss_vs_npc_is_negative_three', () => {
    // The row is easy to mis-read as a positive consolation prize.
    expect(baseDelta(event('combat_loss_vs_npc', 'n1'), K)).toBe(-3);
  });

  it('test_insult_threaten_betray_kill_are_signed_once', () => {
    // Regression: the GDD prose writes "-INSULT_DELTA" while the knob is already
    // negative. Double-negating would turn insults into favours.
    expect(baseDelta(event('insult', 'n1'), K)).toBe(-8);
    expect(baseDelta(event('threaten', 'n1'), K)).toBe(-12);
    expect(baseDelta(event('betray', 'n1'), K)).toBe(-30);
    expect(baseDelta(event('kill_witnessed', 'n1'), K)).toBe(-25);
  });

  it('test_base_delta_output_range_is_minus_thirty_to_plus_fifteen', () => {
    const values = SOCIAL_EVENT_TYPES.map((type) =>
      baseDelta(event(type, 'n1', { margin_ratio: 1 }), K),
    );
    expect(Math.min(...values)).toBe(-30);
    expect(Math.max(...values)).toBe(15);
  });

  it('test_only_three_event_types_are_positive', () => {
    expect(SOCIAL_EVENT_TYPES.filter(isPositiveEventType)).toEqual([
      'gift',
      'small_help',
      'save_life',
    ]);
  });

  it('test_unknown_event_type_is_fail_loud', () => {
    expect(() => baseDelta({ type: 'bribe' } as never, K)).toThrowError(AffinityError);
    try {
      severityOf({ type: 'bribe' } as never, K);
    } catch (err) {
      expect((err as AffinityError).code).toBe(AFFINITY_ERROR.UNKNOWN_EVENT_TYPE);
    }
  });

  it('test_combat_win_without_margin_is_fail_loud', () => {
    try {
      baseDelta(event('combat_win_vs_npc', 'n1'), K);
      throw new Error('should have thrown');
    } catch (err) {
      expect((err as AffinityError).code).toBe(AFFINITY_ERROR.MISSING_MARGIN_RATIO);
    }
  });
});

describe('D.1 combat-win sub-formula (AC-13, AC-13b)', () => {
  const cases: [number, number, number][] = [
    // margin, delta, severity
    [0, -5, 2],
    [0.3, -8, 2],
    [0.69, -11.9, 2],
    [0.7, -12, 3],
    [1.0, -15, 3],
  ];

  for (const [margin, expectedDelta, expectedSeverity] of cases) {
    it(`test_margin_${margin}_gives_delta_${expectedDelta}_severity_${expectedSeverity}`, () => {
      expect(combatWinDelta(margin, K)).toBeCloseTo(expectedDelta, 10);
      expect(severityOf(event('combat_win_vs_npc', 'n1', { margin_ratio: margin }), K)).toBe(
        expectedSeverity,
      );
    });
  }

  it('test_severe_win_threshold_is_inclusive', () => {
    expect(severityOf(event('combat_win_vs_npc', 'n1', { margin_ratio: 0.6999 }), K)).toBe(2);
    expect(severityOf(event('combat_win_vs_npc', 'n1', { margin_ratio: 0.7 }), K)).toBe(3);
  });

  it('test_margin_ratio_casts_to_float_before_dividing', () => {
    // AC-13b: raw ints 50 / 100 must produce 0.5, never integer-truncated 0.
    expect(marginRatio(50, 100)).toBe(0.5);
    expect(marginRatio(42, 100)).toBeCloseTo(0.42, 10);
  });

  it('test_margin_ratio_floors_the_denominator', () => {
    // max_HP = 0 is corrupt data; it must not produce Infinity or NaN.
    expect(Number.isFinite(marginRatio(50, 0))).toBe(true);
    expect(marginRatio(50, 0)).toBe(50);
  });
});

describe('D.1 severity ladder and perpetrator_known (AC-14)', () => {
  it('test_severity_ladder', () => {
    expect(severityOf(event('gift', 'n1'), K)).toBe(0);
    expect(severityOf(event('small_help', 'n1'), K)).toBe(0);
    expect(severityOf(event('save_life', 'n1'), K)).toBe(0);
    expect(severityOf(event('combat_loss_vs_npc', 'n1'), K)).toBe(1);
    expect(severityOf(event('insult', 'n1'), K)).toBe(2);
    expect(severityOf(event('threaten', 'n1'), K)).toBe(3);
    expect(severityOf(event('betray', 'n1'), K)).toBe(4);
    expect(severityOf(event('kill_witnessed', 'n1'), K)).toBe(5);
  });

  it('test_living_victim_always_knows_the_perpetrator', () => {
    expect(perpetratorKnown(event('insult', 'n1'))).toBe(true);
    expect(perpetratorKnown(event('threaten', 'n1', { witnesses: [] }))).toBe(true);
  });

  it('test_kill_with_one_witness_is_known_and_with_none_is_not', () => {
    expect(perpetratorKnown(event('kill_witnessed', 'n1', { witnesses: ['w1'] }))).toBe(true);
    expect(perpetratorKnown(event('kill_witnessed', 'n1', { witnesses: [] }))).toBe(false);
  });
});

describe('D.2 diminishing returns (AC-15, AC-04)', () => {
  it('test_anchor_a_zero_gift_is_full_five', () => {
    expect(applyDiminish(5, 0, K)).toBeCloseTo(5.0, 10);
  });

  it('test_anchor_a_sixty_save_life', () => {
    // The GDD prints 12.09; the exact value is 12.084 (15 * 0.8056).
    expect(applyDiminish(15, 60, K)).toBeCloseTo(12.084, 3);
  });

  it('test_anchor_a_ninetyfive_gift', () => {
    expect(applyDiminish(5, 95, K)).toBeCloseTo(1.1418, 4);
  });

  it('test_anchor_negative_affinity_is_undiminished', () => {
    // Climbing out of hostility is never penalised.
    expect(applyDiminish(3, -50, K)).toBeCloseTo(3.0, 10);
    expect(diminishFactor(-100, K)).toBe(1);
  });

  it('test_factor_never_reaches_zero_across_the_whole_scale', () => {
    for (let a = -100; a <= 100; a += 1) {
      const factor = diminishFactor(a, K);
      expect(factor).toBeGreaterThanOrEqual(K.DIMINISH_FLOOR);
      expect(factor).toBeLessThanOrEqual(1);
    }
  });

  it('test_negative_deltas_are_never_diminished', () => {
    // AC-04: A = +90, repeated insult stays -8 every time.
    for (let i = 0; i < 5; i += 1) {
      expect(applyDiminish(-8, 90, K)).toBe(-8);
    }
  });
});

describe('D.3 repetition fatigue (AC-16, AC-16a, AC-16b)', () => {
  it('test_consecutive_turns_anchor_sequence', () => {
    // small_help on turns 10..15 -> +3, +2.55, +2.10, +1.65, +1.20, +0.75.
    const expected = [3, 2.55, 2.1, 1.65, 1.2, 0.75];
    let table = {};
    const observed: number[] = [];
    for (let i = 0; i < expected.length; i += 1) {
      const turn = 10 + i;
      const before = streakBefore(table, 'n1', 'small_help', turn, K);
      observed.push(applyFatigue(3, before, K));
      table = updateStreak(table, 'n1', 'small_help', turn, K);
    }
    observed.forEach((value, index) => expect(value).toBeCloseTo(expected[index], 10));
  });

  it('test_streak_lapses_after_the_window', () => {
    let table = {};
    for (let turn = 10; turn <= 15; turn += 1) {
      table = updateStreak(table, 'n1', 'small_help', turn, K);
    }
    // Gap of 6 > FATIGUE_WINDOW_TURNS (5) -> full price again.
    expect(streakBefore(table, 'n1', 'small_help', 21, K)).toBe(0);
    expect(applyFatigue(3, streakBefore(table, 'n1', 'small_help', 21, K), K)).toBe(3);
  });

  it('test_menu_cadence_every_four_turns_does_not_reset', () => {
    // AC-16a: turns 10, 14, 18, 22 -> +3, +2.55, +2.10, +1.65.
    const expected = [3, 2.55, 2.1, 1.65];
    let table = {};
    const observed: number[] = [];
    for (let i = 0; i < 4; i += 1) {
      const turn = 10 + i * 4;
      observed.push(applyFatigue(3, streakBefore(table, 'n1', 'small_help', turn, K), K));
      table = updateStreak(table, 'n1', 'small_help', turn, K);
    }
    observed.forEach((value, index) => expect(value).toBeCloseTo(expected[index], 10));
  });

  it('test_streaks_are_independent_per_npc_and_per_event_type', () => {
    let table = updateStreak({}, 'n1', 'gift', 10, K);
    table = updateStreak(table, 'n1', 'gift', 11, K);
    expect(streakBefore(table, 'n1', 'gift', 12, K)).toBe(2);
    // Diversification is not penalised.
    expect(streakBefore(table, 'n1', 'small_help', 12, K)).toBe(0);
    expect(streakBefore(table, 'n2', 'gift', 12, K)).toBe(0);
  });

  it('test_fatigue_factor_respects_its_floor', () => {
    expect(fatigueFactor(0, K)).toBe(1);
    expect(fatigueFactor(100, K)).toBe(K.FATIGUE_FLOOR);
  });

  it('test_negative_deltas_are_never_fatigued', () => {
    expect(applyFatigue(-12, 5, K)).toBe(-12);
  });

  it('test_static_invariant_fatigue_window_ge_positive_social_cooldown', () => {
    // AC-16b: violating this makes D.3 dead code for menu-driven play.
    expect(AFFINITY_KNOBS.FATIGUE_WINDOW_TURNS).toBeGreaterThanOrEqual(
      SITUATION_KNOBS.POSITIVE_SOCIAL_COOLDOWN_TURNS,
    );
  });

  it('test_update_streak_returns_a_new_table', () => {
    const table = {};
    const next = updateStreak(table, 'n1', 'gift', 3, K);
    expect(next).not.toBe(table);
    expect(table).toEqual({});
  });
});

describe('D.4 per-turn positive cap (AC-17)', () => {
  it('test_positive_total_is_capped', () => {
    expect(capPositiveTotal(21, K)).toBe(20);
    expect(capPositiveTotal(20, K)).toBe(20);
    expect(capPositiveTotal(19.5, K)).toBe(19.5);
  });

  it('test_negative_total_is_never_capped', () => {
    expect(capPositiveTotal(-27, K)).toBe(-27);
    expect(capPositiveTotal(-100, K)).toBe(-100);
  });

  it('test_zero_total_stays_zero', () => {
    expect(capPositiveTotal(0, K)).toBe(0);
  });
});

describe('knob block validation', () => {
  it('test_all_21_knobs_are_present_in_the_registry_defaults', () => {
    expect(() => assertAffinityKnobs(AFFINITY_KNOBS)).not.toThrow();
    expect(Object.keys(AFFINITY_KNOBS)).toHaveLength(21);
  });

  it('test_missing_knob_is_fail_loud_and_names_itself', () => {
    const broken = { ...AFFINITY_KNOBS } as Record<string, number>;
    delete broken.DIMINISH_FLOOR;
    try {
      assertAffinityKnobs(broken as never);
      throw new Error('should have thrown');
    } catch (err) {
      expect((err as AffinityError).code).toBe(AFFINITY_ERROR.MISSING_TUNING_CONSTANT);
      expect((err as AffinityError).details.missing_constant_name).toBe('DIMINISH_FLOOR');
    }
  });
});
