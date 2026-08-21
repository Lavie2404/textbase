/**
 * Pillar 1 - "The Gioi Khach Quan": the OVERREACH SUCCESS CAP.
 * Design doc: design/gdd/game-concept.md "Pillar 1" (243-255).
 *
 * The mechanical floor under the prompt directives: when the strongest relevant
 * NPC is a tier or more above the player, the TOTAL weight of `success`
 * scenarios is capped and the excess is redistributed to failure/partial.
 */

import { describe, expect, it } from 'vitest';
import {
  capOverreach,
  normaliseOutcome,
  tierGapOf,
  type ScenarioLike,
} from '../../../src-web/systems/objectivity/overreachCap';
import { OBJECTIVITY_KNOBS, overreachSuccessCap } from '../../../src-web/systems/registry';

const TIER = OBJECTIVITY_KNOBS.OVERREACH_TIER_SIZE;

function sc(outcome: string, probability: number, summary = 'x'): ScenarioLike {
  return { outcome_for_player: outcome, probability, summary };
}

function shareOf(list: readonly ScenarioLike[], outcome: string): number {
  const total = list.reduce((s, x) => s + Number(x.probability), 0);
  const part = list
    .filter((x) => normaliseOutcome(x.outcome_for_player) === outcome)
    .reduce((s, x) => s + Number(x.probability), 0);
  return total > 0 ? part / total : 0;
}

describe('normaliseOutcome', () => {
  it('test_known_values_pass_through', () => {
    expect(normaliseOutcome('success')).toBe('success');
    expect(normaliseOutcome('FAILURE')).toBe('failure');
    expect(normaliseOutcome('partial')).toBe('partial');
  });

  it('test_missing_or_unknown_defaults_to_partial_not_success', () => {
    expect(normaliseOutcome(undefined)).toBe('partial');
    expect(normaliseOutcome('')).toBe('partial');
    expect(normaliseOutcome('rat tot')).toBe('partial');
  });
});

describe('tierGapOf', () => {
  it('test_no_targets_means_no_gap', () => {
    expect(tierGapOf(10, [], TIER)).toBe(0);
  });

  it('test_below_one_tier_is_zero', () => {
    expect(tierGapOf(10, [19], TIER)).toBe(0);
  });

  it('test_exactly_one_tier_is_one', () => {
    expect(tierGapOf(10, [20], TIER)).toBe(1);
  });

  it('test_uses_the_strongest_target', () => {
    expect(tierGapOf(10, [12, 45, 20], TIER)).toBe(3);
  });

  it('test_three_or_more_tiers_saturate_the_cap_lookup', () => {
    expect(overreachSuccessCap(3)).toBe(OBJECTIVITY_KNOBS.OVERREACH_SUCCESS_CAP_TIER3);
    expect(overreachSuccessCap(9)).toBe(OBJECTIVITY_KNOBS.OVERREACH_SUCCESS_CAP_TIER3);
    expect(overreachSuccessCap(0)).toBe(1);
  });
});

describe('capOverreach - no cap cases', () => {
  it('test_no_relevant_npc_leaves_weights_untouched', () => {
    const list = [sc('success', 60), sc('failure', 40)];
    const out = capOverreach(list, { playerLevel: 10, targetLevels: [] });
    expect(out.capped.applied).toBe(false);
    expect(out.scenarios.map((s) => s.probability)).toEqual([60, 40]);
  });

  it('test_same_tier_target_leaves_weights_untouched', () => {
    const list = [sc('success', 60), sc('failure', 40)];
    const out = capOverreach(list, { playerLevel: 10, targetLevels: [15] });
    expect(out.capped.tierGap).toBe(0);
    expect(out.scenarios.map((s) => s.probability)).toEqual([60, 40]);
  });

  it('test_empty_list_is_safe', () => {
    const out = capOverreach([], { playerLevel: 10, targetLevels: [90] });
    expect(out.scenarios).toEqual([]);
    expect(out.capped.applied).toBe(false);
  });

  it('test_all_zero_weights_is_safe', () => {
    const list = [sc('success', 0), sc('failure', 0)];
    const out = capOverreach(list, { playerLevel: 10, targetLevels: [90] });
    expect(out.capped.applied).toBe(false);
    expect(out.scenarios).toHaveLength(2);
  });

  it('test_success_already_under_cap_is_not_touched', () => {
    const list = [sc('success', 10), sc('failure', 90)];
    const out = capOverreach(list, { playerLevel: 10, targetLevels: [25] });
    expect(out.capped.applied).toBe(false);
    expect(shareOf(out.scenarios, 'success')).toBeCloseTo(0.1, 6);
  });
});

describe('capOverreach - the caps per tier', () => {
  it('test_one_tier_gap_caps_success_at_tier1', () => {
    const list = [sc('success', 80), sc('failure', 20)];
    const out = capOverreach(list, { playerLevel: 10, targetLevels: [10 + TIER] });
    expect(out.capped.tierGap).toBe(1);
    expect(shareOf(out.scenarios, 'success')).toBeCloseTo(
      OBJECTIVITY_KNOBS.OVERREACH_SUCCESS_CAP_TIER1, 6,
    );
  });

  it('test_two_tier_gap_caps_success_at_tier2', () => {
    const list = [sc('success', 80), sc('failure', 20)];
    const out = capOverreach(list, { playerLevel: 10, targetLevels: [10 + 2 * TIER] });
    expect(out.capped.tierGap).toBe(2);
    expect(shareOf(out.scenarios, 'success')).toBeCloseTo(
      OBJECTIVITY_KNOBS.OVERREACH_SUCCESS_CAP_TIER2, 6,
    );
  });

  it('test_three_tier_gap_caps_success_at_tier3', () => {
    const list = [sc('success', 95), sc('failure', 5)];
    const out = capOverreach(list, { playerLevel: 5, targetLevels: [5 + 3 * TIER] });
    expect(out.capped.tierGap).toBe(3);
    expect(shareOf(out.scenarios, 'success')).toBeCloseTo(
      OBJECTIVITY_KNOBS.OVERREACH_SUCCESS_CAP_TIER3, 6,
    );
  });

  it('test_caps_are_monotonic_non_increasing', () => {
    expect(OBJECTIVITY_KNOBS.OVERREACH_SUCCESS_CAP_TIER1)
      .toBeGreaterThanOrEqual(OBJECTIVITY_KNOBS.OVERREACH_SUCCESS_CAP_TIER2);
    expect(OBJECTIVITY_KNOBS.OVERREACH_SUCCESS_CAP_TIER2)
      .toBeGreaterThanOrEqual(OBJECTIVITY_KNOBS.OVERREACH_SUCCESS_CAP_TIER3);
  });

  it('test_partial_is_capped_at_the_configured_multiple_of_success', () => {
    const list = [sc('partial', 90), sc('failure', 10)];
    const out = capOverreach(list, { playerLevel: 5, targetLevels: [5 + 3 * TIER] });
    const expected =
      OBJECTIVITY_KNOBS.OVERREACH_SUCCESS_CAP_TIER3 * OBJECTIVITY_KNOBS.OVERREACH_PARTIAL_CAP_MULT;
    expect(shareOf(out.scenarios, 'partial')).toBeCloseTo(expected, 6);
  });

  it('test_custom_knobs_are_honoured', () => {
    const list = [sc('success', 90), sc('failure', 10)];
    const out = capOverreach(list, {
      playerLevel: 10,
      targetLevels: [30],
      knobs: { OVERREACH_SUCCESS_CAP_TIER2: 0.5 },
    });
    expect(shareOf(out.scenarios, 'success')).toBeCloseTo(0.5, 6);
  });
});

describe('capOverreach - redistribution and renormalisation', () => {
  it('test_total_weight_is_preserved', () => {
    const list = [sc('success', 70), sc('partial', 20), sc('failure', 10)];
    const before = list.reduce((s, x) => s + Number(x.probability), 0);
    const out = capOverreach(list, { playerLevel: 10, targetLevels: [50] });
    const after = out.scenarios.reduce((s, x) => s + Number(x.probability), 0);
    expect(after).toBeCloseTo(before, 6);
  });

  it('test_excess_goes_to_failure_proportionally', () => {
    const list = [sc('success', 80), sc('failure', 15, 'A'), sc('failure', 5, 'B')];
    const out = capOverreach(list, { playerLevel: 10, targetLevels: [50] });
    const a = Number(out.scenarios[1].probability);
    const b = Number(out.scenarios[2].probability);
    // 15:5 ratio is preserved among receivers.
    expect(a / b).toBeCloseTo(3, 5);
  });

  it('test_order_and_count_are_preserved', () => {
    const list = [sc('success', 50, 'S'), sc('partial', 30, 'P'), sc('failure', 20, 'F')];
    const out = capOverreach(list, { playerLevel: 10, targetLevels: [90] });
    expect(out.scenarios).toHaveLength(3);
    expect(out.scenarios.map((s) => s.summary)).toEqual(['S', 'P', 'F']);
  });

  it('test_scenario_content_is_not_rewritten', () => {
    const list = [{ ...sc('success', 80), commands: '[MOVE_PLAYER: locationName="X"]' }, sc('failure', 20)];
    const out = capOverreach(list, { playerLevel: 10, targetLevels: [90] });
    expect(out.scenarios[0].commands).toBe('[MOVE_PLAYER: locationName="X"]');
    expect(out.scenarios[0].outcome_for_player).toBe('success');
  });

  it('test_input_list_is_not_mutated', () => {
    const list = [sc('success', 80), sc('failure', 20)];
    capOverreach(list, { playerLevel: 10, targetLevels: [90] });
    expect(list[0].probability).toBe(80);
  });

  it('test_report_records_before_and_after_shares', () => {
    const list = [sc('success', 80), sc('failure', 20)];
    const out = capOverreach(list, { playerLevel: 10, targetLevels: [50] });
    expect(out.capped.successWeightBefore).toBeCloseTo(0.8, 6);
    expect(out.capped.successWeightAfter).toBeLessThan(out.capped.successWeightBefore);
    expect(out.capped.redistributed).toBeGreaterThan(0);
    expect(out.capped.strongestTargetLevel).toBe(50);
  });
});

describe('capOverreach - the no-failure edge case', () => {
  it('test_no_failure_scenario_is_reported_and_nothing_is_synthesized', () => {
    const list = [sc('success', 60, 'A'), sc('success', 40, 'B')];
    const out = capOverreach(list, { playerLevel: 5, targetLevels: [80] });
    expect(out.scenarios).toHaveLength(2);
    expect(out.capped.noFailureScenario).toBe(true);
    expect(out.capped.notes.join(' ')).toContain('KHÔNG bịa thêm kịch bản');
  });

  it('test_no_failure_scenario_still_renormalises_to_the_original_total', () => {
    const list = [sc('success', 60), sc('success', 40)];
    const out = capOverreach(list, { playerLevel: 5, targetLevels: [80] });
    const total = out.scenarios.reduce((s, x) => s + Number(x.probability), 0);
    expect(total).toBeCloseTo(100, 6);
  });

  it('test_success_only_list_keeps_relative_ordering_after_renormalisation', () => {
    const list = [sc('success', 60, 'A'), sc('success', 40, 'B')];
    const out = capOverreach(list, { playerLevel: 5, targetLevels: [80] });
    expect(Number(out.scenarios[0].probability)).toBeGreaterThan(Number(out.scenarios[1].probability));
  });

  it('test_success_plus_partial_moves_weight_into_partial_headroom', () => {
    const list = [sc('success', 90), sc('partial', 10)];
    const out = capOverreach(list, { playerLevel: 5, targetLevels: [80] });
    expect(out.capped.noFailureScenario).toBe(true);
    expect(shareOf(out.scenarios, 'partial')).toBeGreaterThan(0.1);
  });
});

describe('capOverreach - injured NPCs count at their EFFECTIVE level', () => {
  it('test_injured_target_at_reduced_level_produces_a_smaller_tier_gap', () => {
    // True level 90, but the level-gap injury capped it at 30 for a level-10 player.
    const list = [sc('success', 80), sc('failure', 20)];
    const asTrue = capOverreach(list, { playerLevel: 10, targetLevels: [90] });
    const asEffective = capOverreach(list, { playerLevel: 10, targetLevels: [30] });
    expect(asTrue.capped.tierGap).toBe(8);
    expect(asEffective.capped.tierGap).toBe(2);
    expect(asEffective.capped.successWeightAfter).toBeGreaterThan(asTrue.capped.successWeightAfter);
  });

  it('test_injured_target_dropped_into_the_same_tier_lifts_the_cap_entirely', () => {
    const list = [sc('success', 80), sc('failure', 20)];
    const out = capOverreach(list, { playerLevel: 25, targetLevels: [30] });
    expect(out.capped.tierGap).toBe(0);
    expect(out.capped.applied).toBe(false);
  });
});
