/**
 * gdd-02 PART A acceptance criteria - D.6 multiplier placement and D.7
 * `apply_exp_gain` (cascade, decade gate, no banking).
 *
 * Covers AC-06, AC-07, AC-08, AC-09, AC-10, AC-28, AC-29, AC-31, AC-42,
 * plus the C-1 free-event cap and the A3 per-turn safety valve.
 */

import { describe, expect, it, vi } from 'vitest';
import {
  EXP_ERROR,
  ExpError,
  applyExpGain,
  applyFreeEventExp,
  computeTurnExp,
  resolveTurnExp,
} from '../../../src-web/systems/exp/resolveTurnExp';
import {
  PROGRESSION_STATE_NORMAL,
  PROGRESSION_STATE_WAITING,
  concludingTurn,
  deps,
  gddThreshold,
  idleTurn,
  knobs,
  outcome,
  record,
} from './fixtures';

describe('exp_realm_progression / D.6 multiplier placement', () => {
  it('AC-06 test_multiplier_1_2_on_raw_total_85_gives_final_gain_102_multiplied_once', () => {
    const self = record({ level: 25, exp_multiplier: 1.2 });
    // raw_total 85 is produced here by a stubbed combat source so the AC anchor
    // is exact regardless of the threshold curve.
    const b = computeTurnExp(
      self,
      concludingTurn(outcome({ type: 'win', winner_id: 'player', loser_id: 'npc_1' })),
      deps({ formulas: { combatWinExp: () => 85 } }),
    );
    expect(b.raw_total).toBe(85);
    expect(b.final_gain).toBeCloseTo(102, 9);
  });

  it('AC-06b test_multiplier_is_applied_to_the_sum_exactly_once', () => {
    const self = record({ level: 25, exp_multiplier: 2, tam_phap_type: 'song tu', isPlayer: true });
    const b = computeTurnExp(self, idleTurn(), deps({ songTuActiveNpcIds: ['npc_1'] }));
    expect(b.raw_total).toBeCloseTo(0.85, 9);
    expect(b.multiplied).toBeCloseTo(1.7, 9);
  });

  it('AC-28 test_multiply_before_compare_raw_40_x_2_is_80_and_level_5_holds', () => {
    const self = record({ level: 5, exp: 50, exp_multiplier: 2 });
    const turn = concludingTurn(outcome({ type: 'win', winner_id: 'player', loser_id: 'npc_1' }));
    const d = deps({ formulas: { combatWinExp: () => 40 } });
    const out = resolveTurnExp(self, turn, d);
    expect(out.breakdown.final_gain).toBeCloseTo(80, 9);
    expect(out.record.exp).toBeCloseTo(130, 9);
    expect(out.record.level).toBe(5);
  });

  it('AC-31 test_out_of_combat_passive_plus_song_tu_at_l25', () => {
    const self = record({ level: 25, exp: 300, exp_multiplier: 1.2, tam_phap_type: 'song tu', isPlayer: true });
    const out = resolveTurnExp(self, idleTurn(), deps({ songTuActiveNpcIds: ['npc_1'] }));
    expect(out.breakdown.raw_total).toBeCloseTo(0.85, 9);
    expect(out.breakdown.final_gain).toBeCloseTo(1.02, 9);
    expect(out.record.exp).toBeCloseTo(301.02, 9);
    expect(out.record.level).toBe(25);
  });
});

describe('exp_realm_progression / D.7 apply_exp_gain', () => {
  it('AC-07 test_l25_exp_300_plus_102_becomes_l26_with_surplus_62', () => {
    const out = applyExpGain(record({ level: 25, exp: 300 }), 102, deps());
    expect(out.record.level).toBe(26);
    expect(out.record.exp).toBeCloseTo(62, 9);
    expect(out.record.state).toBe(PROGRESSION_STATE_NORMAL);
  });

  it('AC-08 test_l5_exp_50_plus_300_cascades_to_l7_with_surplus_60', () => {
    const out = applyExpGain(record({ level: 5, exp: 50 }), 300, deps());
    expect(out.record.level).toBe(7);
    expect(out.record.exp).toBeCloseTo(60, 9);
    expect(out.levels_gained).toBe(2);
  });

  it('AC-09 test_l20_exp_280_plus_50_clamps_at_290_and_enters_cho_dot_pha', () => {
    const out = applyExpGain(record({ level: 20, exp: 280 }), 50, deps());
    expect(out.record.level).toBe(20);
    expect(out.record.exp).toBe(290);
    expect(out.record.state).toBe(PROGRESSION_STATE_WAITING);
    expect(out.wasted).toBeCloseTo(40, 9);
    expect(out.entered_waiting).toBe(true);
  });

  it('AC-10 test_further_gain_while_waiting_leaves_exp_pinned_at_290_over_n_turns', () => {
    let r = applyExpGain(record({ level: 20, exp: 280 }), 50, deps()).record;
    for (let turn = 0; turn < 8; turn++) {
      r = applyExpGain(r, 37, deps()).record;
      expect(r.exp).toBe(290);
      expect(r.level).toBe(20);
      expect(r.state).toBe(PROGRESSION_STATE_WAITING);
    }
  });

  it('AC-10b test_no_banking_surplus_is_discarded_not_stored', () => {
    const out = applyExpGain(record({ level: 10, exp: 0 }), 10_000, deps());
    expect(out.record.exp).toBe(gddThreshold(10));
    expect(out.wasted).toBeCloseTo(10_000 - gddThreshold(10), 6);
  });

  it('AC-29 test_final_gain_2500_at_l11_stops_at_l20_in_cho_dot_pha_with_50_wasted', () => {
    const out = applyExpGain(record({ level: 11, exp: 0 }), 2500, deps());
    expect(out.record.level).toBe(20);
    expect(out.record.exp).toBe(290);
    expect(out.record.state).toBe(PROGRESSION_STATE_WAITING);
    expect(out.wasted).toBeCloseTo(50, 6);
  });

  it('AC-29b test_cascade_never_jumps_past_the_decade_gate', () => {
    const out = applyExpGain(record({ level: 8, exp: 0 }), 1_000_000, deps());
    expect(out.record.level).toBe(10);
    expect(out.record.state).toBe(PROGRESSION_STATE_WAITING);
  });

  it('AC-42 test_base_exp_threshold_zero_errors_before_the_loop_runs_once', () => {
    const threshold = vi.fn(gddThreshold);
    const d = deps({ knobs: knobs({ BASE_EXP_THRESHOLD: 0 }), expThreshold: threshold });
    try {
      applyExpGain(record({ level: 5, exp: 0 }), 500, d);
      throw new Error('expected a throw');
    } catch (e) {
      expect(e).toBeInstanceOf(ExpError);
      expect((e as ExpError).code).toBe(EXP_ERROR.INVALID_THRESHOLD_CONFIG);
    }
    expect(threshold).not.toHaveBeenCalled();
  });

  it('AC-42b test_a_non_positive_threshold_curve_errors_instead_of_looping_forever', () => {
    const d = deps({ expThreshold: () => 0 });
    expect(() => applyExpGain(record({ level: 5 }), 10, d)).toThrowError(
      /EXP_ERROR_INVALID_THRESHOLD_CONFIG/,
    );
  });

  it('A3 test_per_turn_safety_valve_caps_a_runaway_multiplier', () => {
    const self = record({ level: 25, exp_multiplier: 1000 });
    const d = deps({
      knobs: knobs({ TURN_EXP_CAP_FRACTION: 2 }),
      formulas: { combatWinExp: () => 340 },
    });
    const b = computeTurnExp(
      self,
      concludingTurn(outcome({ type: 'win', winner_id: 'player', loser_id: 'npc_1' })),
      d,
    );
    expect(b.multiplied).toBeCloseTo(340_000, 3);
    expect(b.final_gain).toBeCloseTo(2 * 340, 9);
    expect(b.capped).toBe(true);
  });

  it('A3b test_cap_fraction_zero_disables_the_safety_valve', () => {
    const self = record({ level: 25, exp_multiplier: 10 });
    const d = deps({
      knobs: knobs({ TURN_EXP_CAP_FRACTION: 0 }),
      formulas: { combatWinExp: () => 340 },
    });
    const b = computeTurnExp(
      self,
      concludingTurn(outcome({ type: 'win', winner_id: 'player', loser_id: 'npc_1' })),
      d,
    );
    expect(b.capped).toBe(false);
    expect(b.final_gain).toBeCloseTo(3400, 6);
  });
});

describe('exp_realm_progression / C-1 free-event EXP', () => {
  it('C-1 test_encounter_reward_is_capped_at_ten_percent_of_the_threshold', () => {
    const out = applyFreeEventExp(record({ level: 25, exp: 0 }), 5000, idleTurn(), deps());
    expect(out.capped).toBe(true);
    expect(out.granted).toBeCloseTo(34, 9); // 0.10 * 340
    expect(out.record.exp).toBeCloseTo(34, 9);
  });

  it('C-1b test_free_event_exp_below_the_cap_passes_through_unchanged', () => {
    const out = applyFreeEventExp(record({ level: 25, exp: 0 }), 12, idleTurn(), deps());
    expect(out.capped).toBe(false);
    expect(out.granted).toBe(12);
  });

  it('C-1c test_free_event_exp_still_respects_the_breakthrough_gate', () => {
    const out = applyFreeEventExp(record({ level: 20, exp: 285 }), 9999, idleTurn(), deps());
    expect(out.record.level).toBe(20);
    expect(out.record.exp).toBe(290);
    expect(out.record.state).toBe(PROGRESSION_STATE_WAITING);
  });

  it('C-1d test_free_event_exp_is_blocked_on_a_death_turn_and_when_crippled', () => {
    expect(
      applyFreeEventExp(record(), 50, idleTurn({ is_death_turn: true }), deps()).granted,
    ).toBe(0);
    expect(
      applyFreeEventExp(record(), 50, idleTurn(), deps({ deathAndConsequenceBlocked: () => true }))
        .granted,
    ).toBe(0);
  });
});
