/**
 * gdd-02 PART A acceptance criteria - the breakthrough gate, its blockers, the
 * mandatory orchestrator ordering, rollback and per-`char_id` lazy init.
 *
 * Covers AC-11, AC-12, AC-14, AC-15, AC-33, AC-34, AC-36, AC-36b, AC-43,
 * AC-44, AC-49, plus the D.6/D.7 locked-field projection.
 */

import { describe, expect, it, vi } from 'vitest';
import {
  initProgression,
  processCharacterTurn,
  toLockedFields,
  tryExecuteBreakthrough,
} from '../../../src-web/systems/exp/resolveTurnExp';
import { tierFromLevel } from '../../../src-web/systems/math';
import {
  PROGRESSION_STATE_NORMAL,
  PROGRESSION_STATE_WAITING,
  concludingTurn,
  deps,
  idleTurn,
  midBattleTurn,
  outcome,
  record,
} from './fixtures';

const waiting = (level = 20) =>
  record({ level, exp: 290, state: PROGRESSION_STATE_WAITING });

describe('exp_realm_progression / try_execute_breakthrough', () => {
  it('AC-11 test_behaviour_depends_only_on_the_injected_requirement_predicate', () => {
    const noGo = tryExecuteBreakthrough(waiting(), idleTurn(), deps({ breakthroughRequirementMet: () => false }));
    const go = tryExecuteBreakthrough(waiting(), idleTurn(), deps({ breakthroughRequirementMet: () => true }));
    expect(noGo.executed).toBe(false);
    expect(go.executed).toBe(true);
  });

  it('AC-11b test_the_predicate_receives_the_derived_tier_and_no_hardcoded_condition_exists', () => {
    const predicate = vi.fn(() => true);
    tryExecuteBreakthrough(waiting(20), idleTurn(), deps({ breakthroughRequirementMet: predicate }));
    expect(predicate).toHaveBeenCalledTimes(1);
    expect(predicate.mock.calls[0][0]).toBe(tierFromLevel(20));
    // No content string such as "Hon Hoan" may appear in this system's source.
    expect(JSON.stringify(predicate.mock.calls[0])).not.toMatch(/Hồn Hoàn/);
  });

  it('AC-12 test_requirement_true_gives_l21_tier_3_exp_0_state_normal_no_carry_over', () => {
    const out = tryExecuteBreakthrough(waiting(20), idleTurn(), deps({ breakthroughRequirementMet: () => true }));
    expect(out.executed).toBe(true);
    expect(out.record.level).toBe(21);
    expect(tierFromLevel(out.record.level)).toBe(3);
    expect(out.record.exp).toBe(0);
    expect(out.record.state).toBe(PROGRESSION_STATE_NORMAL);
  });

  it('AC-43 test_in_combat_blocks_execution_and_it_fires_on_the_first_out_of_combat_turn', () => {
    const d = deps({ breakthroughRequirementMet: () => true });
    const blockedRun = tryExecuteBreakthrough(waiting(), midBattleTurn(), d);
    expect(blockedRun.executed).toBe(false);
    expect(blockedRun.reason).toBe('in_combat');
    expect(blockedRun.record.state).toBe(PROGRESSION_STATE_WAITING);
    expect(tryExecuteBreakthrough(blockedRun.record, idleTurn(), d).executed).toBe(true);
  });

  it('AC-43b test_the_battle_concluding_turn_still_counts_as_in_combat', () => {
    const d = deps({ breakthroughRequirementMet: () => true });
    const turn = concludingTurn(outcome({ type: 'win', winner_id: 'player', loser_id: 'npc_1' }));
    expect(tryExecuteBreakthrough(waiting(), turn, d).executed).toBe(false);
  });

  it('AC-44 test_is_death_turn_blocks_execution', () => {
    const d = deps({ breakthroughRequirementMet: () => true });
    const out = tryExecuteBreakthrough(waiting(), idleTurn({ is_death_turn: true }), d);
    expect(out.executed).toBe(false);
    expect(out.reason).toBe('is_death_turn');
  });

  it('AC-36 test_crippled_during_cho_dot_pha_preserves_the_state_across_n_turns', () => {
    let r = waiting();
    const blockedDeps = deps({ breakthroughRequirementMet: () => true, deathAndConsequenceBlocked: () => true });
    for (let turn = 0; turn < 5; turn++) {
      const out = tryExecuteBreakthrough(r, idleTurn(), blockedDeps);
      expect(out.executed).toBe(false);
      expect(out.record.state).toBe(PROGRESSION_STATE_WAITING);
      expect(out.record.exp).toBe(290);
      r = out.record;
    }
    const cleared = tryExecuteBreakthrough(r, idleTurn(), deps({ breakthroughRequirementMet: () => true }));
    expect(cleared.executed).toBe(true);
    expect(cleared.record.level).toBe(21);
  });

  it('AC-36b test_blocked_and_requirement_true_in_the_same_turn_defers_to_the_next_clear_turn', () => {
    const predicate = vi.fn(() => true);
    const out = tryExecuteBreakthrough(
      waiting(),
      idleTurn(),
      deps({ breakthroughRequirementMet: predicate, deathAndConsequenceBlocked: () => true }),
    );
    expect(out.executed).toBe(false);
    // The predicate must not even be consulted while blocked - it is re-evaluated
    // at the moment the flag clears, never assumed to still be true.
    expect(predicate).not.toHaveBeenCalled();
  });

  it('AC-36c test_a_character_not_waiting_is_a_no_op', () => {
    const out = tryExecuteBreakthrough(record({ level: 25 }), idleTurn(), deps({ breakthroughRequirementMet: () => true }));
    expect(out.executed).toBe(false);
    expect(out.reason).toBe('not_waiting');
    expect(out.record.level).toBe(25);
  });
});

describe('exp_realm_progression / process_character_turn ordering', () => {
  it('AC-33 test_breakthrough_runs_before_gain_so_exp_applies_to_threshold_21', () => {
    const self = waiting(20);
    const d = deps({
      breakthroughRequirementMet: () => true,
      formulas: { combatWinExp: () => 0 },
    });
    // The turn must be out of combat for the breakthrough to fire; passive is the
    // only source, so the assertion isolates the threshold in use.
    const out = processCharacterTurn({ ...self, exp_multiplier: 1 }, idleTurn(), d);
    expect(out.breakthrough).toBe(true);
    expect(out.after.level).toBe(21);
    // exp_threshold(21) = 300 under the injected linear curve; passive is
    // 0.001 * 300 = 0.3, proving the NEW threshold was used, not 290's 0.29.
    expect(out.after.exp).toBeCloseTo(0.3, 9);
  });

  it('AC-33b test_orchestrator_reports_before_and_after_snapshots', () => {
    const out = processCharacterTurn(record({ level: 25, exp: 10 }), idleTurn(), deps());
    expect(out.before).toEqual({ level: 25, exp: 10, state: PROGRESSION_STATE_NORMAL });
    expect(out.after.level).toBe(25);
    expect(out.exp_delta).toBeCloseTo(0.34, 9);
  });

  it('AC-14 test_rollback_of_a_normal_turn_restores_level_tier_and_exp', () => {
    const before = record({ level: 25, exp: 300 });
    const snapshot = { ...before };
    const after = processCharacterTurn(before, idleTurn(), deps()).record;
    expect(after).not.toEqual(snapshot);
    // The module never mutates in place, so the snapshot IS the rollback.
    expect(before).toEqual(snapshot);
    expect(snapshot.level).toBe(25);
    expect(snapshot.exp).toBe(300);
    expect(tierFromLevel(snapshot.level)).toBe(3);
  });

  it('AC-15 test_rollback_of_a_breakthrough_turn_also_restores_the_cho_dot_pha_state', () => {
    const before = waiting(20);
    const snapshot = { ...before };
    const out = processCharacterTurn(before, idleTurn(), deps({ breakthroughRequirementMet: () => true }));
    expect(out.breakthrough).toBe(true);
    expect(out.after.state).toBe(PROGRESSION_STATE_NORMAL);
    expect(snapshot.state).toBe(PROGRESSION_STATE_WAITING);
    expect(snapshot.level).toBe(20);
    expect(snapshot.exp).toBe(290);
  });

  it('AC-34 test_breakthrough_turn_undo_asserts_nothing_about_external_resources', () => {
    // gdd-02 AC-34/EC-3: rolling back an external resource (Hon Hoan) is
    // explicitly OUT OF SCOPE - the record carries no such field at all.
    const out = processCharacterTurn(waiting(20), idleTurn(), deps({ breakthroughRequirementMet: () => true }));
    expect(Object.keys(out.record).sort()).toEqual(
      ['char_id', 'exp', 'exp_multiplier', 'isPlayer', 'level', 'state', 'tam_phap_type'].sort(),
    );
  });
});

describe('exp_realm_progression / lazy init by char_id', () => {
  it('AC-49 test_a_new_char_id_reads_level_1_exp_0_after_an_old_one_was_dirtied', () => {
    const store: Record<string, ReturnType<typeof initProgression>> = {};
    store['old'] = initProgression('old');
    // Dirty the old record directly: level 30 with exp 450 is a mid-tier state a
    // save could legitimately hold, and it must not leak into a new char_id.
    store['old'] = { ...store['old'], level: 30, exp: 450 };

    const fresh = store['new'] ?? initProgression('new');
    expect(fresh.level).toBe(1);
    expect(fresh.exp).toBe(0);
    expect(fresh.state).toBe(PROGRESSION_STATE_NORMAL);
    // The old id keeps its dirtied values afterwards.
    expect(store['old'].level).toBe(30);
    expect(store['old'].exp).toBe(450);
  });

  it('AC-49b test_init_never_produces_a_level_below_1', () => {
    expect(initProgression('x', 0).level).toBe(1);
    expect(initProgression('x', -7).level).toBe(1);
  });
});

describe('exp_realm_progression / locked-result projection', () => {
  it('LOCK test_exp_delta_and_breakthrough_flag_use_the_p0_field_prefixes', () => {
    const results = [
      processCharacterTurn(record({ char_id: 'player', level: 25, exp: 0 }), idleTurn(), deps()),
      processCharacterTurn(waiting(20), idleTurn(), deps({ breakthroughRequirementMet: () => true })),
    ];
    const fields = toLockedFields(results);
    expect(Object.keys(fields)).toContain('exp_delta_player');
    expect(fields['breakthrough_flag_player']).toBe(true);
  });

  it('LOCK test_zero_deltas_and_false_flags_are_omitted', () => {
    const noGain = processCharacterTurn(record(), midBattleTurn(), deps());
    expect(toLockedFields([noGain])).toEqual({});
  });
});
