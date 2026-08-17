/**
 * gdd-02 PART A acceptance criteria - the four EXP sources (D.2 win, D.3 loss,
 * D.4 Song Tu, passive) and their gates.
 *
 * Covers AC-02, AC-02b, AC-03, AC-04, AC-05, AC-16, AC-19, AC-20, AC-21,
 * AC-21b, AC-22, AC-23, AC-24, AC-30, AC-31b, AC-32, AC-35, AC-38, AC-39, AC-46.
 */

import { describe, expect, it, vi } from 'vitest';
import {
  EXP_ERROR,
  ExpError,
  combatLossExp,
  combatWinExp,
  computeTurnExp,
  songTuActive,
  songTuExpBonus,
  winTierMultiplier,
} from '../../../src-web/systems/exp/resolveTurnExp';
import { turnViewFromHandoff } from '../../../src-web/systems/exp/resolveTurnExp';
import { toCombatHandoff } from '../../../src-web/systems/adapters/combatAdapter';
import { EPS, concludingTurn, deps, idleTurn, knobs, outcome, record } from './fixtures';

describe('exp_realm_progression / D.2 combat win', () => {
  it('AC-19 test_tier_diff_plus_2_gives_multiplier_1_5_and_win_exp_102', () => {
    expect(winTierMultiplier(2, knobs())).toBeCloseTo(1.5, 12);
    // self L25 -> tier 3; opponent tier 5 -> tier_diff = +2.
    expect(combatWinExp(record({ level: 25 }), 5, deps())).toBeCloseTo(102, 9);
  });

  it('AC-20 test_tier_diff_minus_3_and_minus_4_both_clamp_to_floor_20_4', () => {
    const self = record({ level: 25 }); // tier 3
    expect(combatWinExp(self, 0 as number, deps())).toBeCloseTo(20.4, 9); // diff -3
    expect(combatWinExp(self, -1 as number, deps())).toBeCloseTo(20.4, 9); // diff -4
  });

  it('AC-20b test_clamped_win_exp_still_beats_loss_exp', () => {
    const self = record({ level: 25 });
    expect(combatWinExp(self, 0 as number, deps())).toBeGreaterThan(combatLossExp(self, deps()));
    expect(combatLossExp(self, deps())).toBeCloseTo(13.6, 9);
  });

  it('AC-21 test_tier_diff_8_and_10_both_clamp_to_ceiling_204', () => {
    const self = record({ level: 25 }); // tier 3
    expect(combatWinExp(self, 11, deps())).toBeCloseTo(204, 9);
    expect(combatWinExp(self, 13, deps())).toBeCloseTo(204, 9);
  });

  it('AC-21b test_property_win_exp_never_below_loss_exp_over_tier_diff_minus_10_to_plus_10', () => {
    const self = record({ level: 25 });
    const loss = combatLossExp(self, deps());
    for (let diff = -10; diff <= 10; diff++) {
      const win = combatWinExp(self, 3 + diff, deps());
      expect(win).toBeGreaterThanOrEqual(loss - EPS);
    }
  });

  it('AC-32 test_missing_opponent_tier_raises_the_exact_error_code', () => {
    try {
      combatWinExp(record(), undefined as unknown as number, deps());
      throw new Error('expected a throw');
    } catch (e) {
      expect(e).toBeInstanceOf(ExpError);
      expect((e as ExpError).code).toBe(EXP_ERROR.OPPONENT_TIER_UNDEFINED);
    }
  });

  it('AC-32b test_missing_opponent_tier_is_never_null_coalesced_to_zero', () => {
    const d = deps({ opponentTier: () => undefined });
    const turn = concludingTurn(outcome({ type: 'win', winner_id: 'player', loser_id: 'npc_1' }));
    expect(() => computeTurnExp(record(), turn, d)).toThrowError(/EXP_ERROR_OPPONENT_TIER_UNDEFINED/);
  });

  it('AC-37b test_both_sides_at_tier_1_gives_multiplier_1_with_no_sentinel', () => {
    const self = record({ level: 5 }); // tier 1
    expect(winTierMultiplier(0, knobs())).toBe(1);
    expect(combatWinExp(self, 1, deps())).toBeCloseTo(0.2 * 140 * 1, 9);
  });
});

describe('exp_realm_progression / D.6 source selection', () => {
  it('AC-02 test_win_is_identified_by_winner_id_equals_self', () => {
    const turn = concludingTurn(outcome({ type: 'win', winner_id: 'player', loser_id: 'npc_1' }));
    const b = computeTurnExp(record({ level: 25 }), turn, deps({ opponentTier: () => 5 }));
    expect(b.raw_combat).toBeCloseTo(102, 9);
    expect(b.raw_passive).toBe(0);
    expect(b.raw_song_tu).toBe(0);
  });

  it('AC-02b test_no_outcome_yields_raw_combat_zero_explicitly', () => {
    const turn = concludingTurn(outcome({ type: 'none', winner_id: 'player', loser_id: 'npc_1' }));
    const spy = vi.fn();
    const b = computeTurnExp(
      record(),
      turn,
      deps({ formulas: { combatWinExp: spy as never, combatLossExp: spy as never } }),
    );
    expect(b.raw_combat).toBe(0);
    expect(spy).not.toHaveBeenCalled();
  });

  it('AC-03 test_loss_is_identified_by_loser_id_equals_self', () => {
    const turn = concludingTurn(outcome({ type: 'loss', winner_id: 'npc_1', loser_id: 'player' }));
    const b = computeTurnExp(record({ level: 25 }), turn, deps());
    expect(b.raw_combat).toBeCloseTo(13.6, 9);
  });

  it('AC-39 test_winning_npc_gets_win_exp_even_when_outcome_type_is_player_relative_lose', () => {
    // gdd-02 Core Rule #11: `type` is defined relative to the player; using it
    // would silently leave a winning NPC at 0.
    const npc = record({ char_id: 'npc_1', level: 25, isPlayer: false });
    const turn = concludingTurn(outcome({ type: 'loss', winner_id: 'npc_1', loser_id: 'player' }));
    const b = computeTurnExp(npc, turn, deps({ opponentTier: () => 5 }));
    expect(b.raw_combat).toBeCloseTo(102, 9);
  });

  it('AC-39b test_non_participant_gets_zero_combat_exp', () => {
    const bystander = record({ char_id: 'npc_9', isPlayer: false });
    const turn = concludingTurn(outcome({ type: 'win', winner_id: 'player', loser_id: 'npc_1' }));
    expect(computeTurnExp(bystander, turn, deps()).raw_combat).toBe(0);
  });

  it('AC-04 test_passive_always_ticks_out_of_combat_when_no_blocker_applies', () => {
    const b = computeTurnExp(record({ level: 25 }), idleTurn(), deps());
    expect(b.raw_passive).toBeCloseTo(0.34, 9);
  });

  it('AC-04b test_passive_does_not_tick_mid_battle', () => {
    const b = computeTurnExp(record({ level: 25 }), { ...idleTurn(), in_combat: true, battle_active: true }, deps());
    expect(b.raw_passive).toBe(0);
    expect(b.final_gain).toBe(0);
  });

  it('AC-31b test_on_the_concluding_turn_passive_and_song_tu_are_absolutely_zero', () => {
    const self = record({ level: 25, tam_phap_type: 'song tu', isPlayer: true });
    const turn = concludingTurn(outcome({ type: 'win', winner_id: 'player', loser_id: 'npc_1' }));
    const b = computeTurnExp(self, turn, deps({ opponentTier: () => 5, songTuActiveNpcIds: ['npc_2'] }));
    expect(b.raw_combat).toBeCloseTo(102, 9);
    expect(b.raw_passive).toBe(0);
    expect(b.raw_song_tu).toBe(0);
  });
});

describe('exp_realm_progression / D.4 Song Tu', () => {
  it('AC-05 test_song_tu_and_logic_three_partial_combinations_all_yield_zero', () => {
    const base = record({ level: 25, isPlayer: true });
    // (a) right tam phap, no partner
    expect(songTuExpBonus({ ...base, tam_phap_type: 'song tu' }, deps({ songTuActiveNpcIds: [] }))).toBe(0);
    // (b) partner, wrong tam phap
    expect(songTuExpBonus({ ...base, tam_phap_type: 'đơn tu' }, deps({ songTuActiveNpcIds: ['npc_1'] }))).toBe(0);
    // (c) neither
    expect(songTuExpBonus({ ...base, tam_phap_type: null }, deps({ songTuActiveNpcIds: [] }))).toBe(0);
  });

  it('AC-23 test_song_tu_active_at_l25_is_0_51', () => {
    const self = record({ level: 25, tam_phap_type: 'song tu', isPlayer: true });
    expect(songTuExpBonus(self, deps({ songTuActiveNpcIds: ['npc_1'] }))).toBeCloseTo(0.51, 9);
  });

  it('AC-23b test_song_tu_bonus_never_scales_with_the_number_of_partners', () => {
    const self = record({ level: 25, tam_phap_type: 'song tu', isPlayer: true });
    const one = songTuExpBonus(self, deps({ songTuActiveNpcIds: ['a'] }));
    const three = songTuExpBonus(self, deps({ songTuActiveNpcIds: ['a', 'b', 'c'] }));
    expect(three).toBeCloseTo(one, 12);
  });

  it('AC-24 test_song_tu_inactive_is_exactly_zero_at_any_level', () => {
    for (const level of [1, 10, 25, 40]) {
      expect(songTuExpBonus(record({ level, tam_phap_type: null }), deps())).toBe(0);
    }
  });

  it('AC-46 test_npc_song_tu_uses_the_same_player_side_flag', () => {
    const npc = record({ char_id: 'npc_1', level: 25, isPlayer: false, tam_phap_type: 'song tu' });
    expect(songTuActive(npc, deps({ songTuActiveNpcIds: ['npc_1'] }))).toBe(true);
    expect(songTuActive(npc, deps({ songTuActiveNpcIds: ['npc_2'] }))).toBe(false);
  });

  it('AC-38 test_null_tam_phap_gives_multiplier_1_and_song_tu_zero', () => {
    const self = record({ level: 25, tam_phap_type: null, exp_multiplier: undefined });
    const b = computeTurnExp(self, idleTurn(), deps());
    expect(b.raw_song_tu).toBe(0);
    expect(b.multiplied).toBeCloseTo(b.raw_total, 12);
  });
});

describe('exp_realm_progression / combat hand-off schema drift', () => {
  // gdd-02 A8 requires a field-name check against the REAL combat output: a
  // `battle_result` vs `outcome` drift shipped once. `toCombatHandoff` is the P0
  // adapter over the untouched CombatLoop, so consuming it here binds the EXP
  // economy to the actual field names rather than to a hand-written literal.
  it('DRIFT test_turn_view_reads_battle_active_in_combat_and_outcome_ids_from_the_adapter', () => {
    const handoff = toCombatHandoff(
      {
        outcome: 'VICTORY',
        combatType: 'Lethal',
        data: {
          winningSideInfo: [{ id: 'player', isPlayer: true, hp: 40, maxhp: 100, level: 25 }],
          losingSideInfo: [{ id: 'npc_1', hp: 0, maxhp: 80, level: 45 }],
        },
      },
      { characters: [] },
    );
    const turn = turnViewFromHandoff(handoff, false);
    expect(turn.battle_active).toBe(false);
    expect(turn.in_combat).toBe(true);
    expect(turn.outcome.winner_id).toBe('player');
    expect(turn.outcome.loser_id).toBe('npc_1');

    const b = computeTurnExp(record({ char_id: 'player', level: 25 }), turn, deps({ opponentTier: () => 5 }));
    expect(b.raw_combat).toBeCloseTo(102, 9);
    expect(b.raw_passive).toBe(0);
  });

  it('DRIFT test_a_flee_outcome_designates_no_winner_and_grants_no_exp', () => {
    const handoff = toCombatHandoff(
      { outcome: 'FLED', combatType: 'Lethal', data: { winningSideInfo: [], losingSideInfo: [] } },
      { characters: [] },
    );
    const b = computeTurnExp(record(), turnViewFromHandoff(handoff), deps());
    expect(b.raw_combat).toBe(0);
    expect(b.final_gain).toBe(0);
  });
});

describe('exp_realm_progression / global short-circuits', () => {
  it('AC-16 test_death_and_consequence_blocked_short_circuits_even_with_a_win', () => {
    const turn = concludingTurn(outcome({ type: 'win', winner_id: 'player', loser_id: 'npc_1' }));
    const b = computeTurnExp(record(), turn, deps({ deathAndConsequenceBlocked: () => true }));
    expect(b.final_gain).toBe(0);
    expect(b.short_circuit).toBe('death_and_consequence_blocked');
  });

  it('AC-35 test_is_death_turn_zeroes_the_whole_turn_not_only_raw_combat', () => {
    const self = record({ level: 25, tam_phap_type: 'song tu', isPlayer: true });
    const turn = idleTurn({ is_death_turn: true });
    const b = computeTurnExp(self, turn, deps({ songTuActiveNpcIds: ['npc_1'] }));
    expect(b.raw_combat).toBe(0);
    expect(b.raw_passive).toBe(0);
    expect(b.raw_song_tu).toBe(0);
    expect(b.short_circuit).toBe('is_death_turn');
  });

  it('AC-30 test_both_short_circuits_return_before_d2_d3_d4_are_called', () => {
    const win = vi.fn(() => 999);
    const loss = vi.fn(() => 999);
    const song = vi.fn(() => 999);
    const formulas = { combatWinExp: win as never, combatLossExp: loss as never, songTuExpBonus: song as never };
    const turn = concludingTurn(outcome({ type: 'win', winner_id: 'player', loser_id: 'npc_1' }));

    computeTurnExp(record(), turn, deps({ deathAndConsequenceBlocked: () => true, formulas }));
    computeTurnExp(record(), { ...turn, is_death_turn: true }, deps({ formulas }));

    expect(win).not.toHaveBeenCalled();
    expect(loss).not.toHaveBeenCalled();
    expect(song).not.toHaveBeenCalled();
  });
});
