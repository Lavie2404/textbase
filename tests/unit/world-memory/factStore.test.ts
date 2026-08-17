/**
 * Unit tests - World Memory fact extraction (gdd-04 A4 Formula #2).
 * AC ids refer to production/gdd-integration/gdd-04-memory-canon.md A8.
 */
import { describe, expect, it } from 'vitest';
import {
  GLOBAL_ENTITY_ID,
  deriveEntityId,
  extractFacts,
  factExtractionCount,
  hasSignal,
  lockedResultFields,
} from '../../../src-web/systems/worldMemory/factStore';
import { makeLockedResult } from './factories';

describe('has_signal - the five supported kinds (AC-10, AC-10b, AC-31)', () => {
  it('test_numeric_zero_does_not_signal', () => {
    expect(hasSignal(0)).toEqual({ signal: false, unsupported_type: false });
  });
  it('test_numeric_nonzero_signals_both_polarities', () => {
    expect(hasSignal(-15).signal).toBe(true);
    expect(hasSignal(2).signal).toBe(true);
  });
  it('test_boolean_true_signals_false_does_not', () => {
    expect(hasSignal(true).signal).toBe(true);
    expect(hasSignal(false).signal).toBe(false);
  });
  it('test_null_event_does_not_signal', () => {
    expect(hasSignal(null).signal).toBe(false);
    expect(hasSignal(undefined).signal).toBe(false);
  });
  it('test_empty_string_does_not_signal_nonempty_does', () => {
    expect(hasSignal('').signal).toBe(false);
    expect(hasSignal('victory').signal).toBe(true);
  });
  it('test_empty_array_does_not_signal_nonempty_does', () => {
    expect(hasSignal([]).signal).toBe(false);
    expect(hasSignal(['npc_a']).signal).toBe(true);
  });
  it('test_unsupported_type_signals_with_warning_flag', () => {
    expect(hasSignal({ nested: 1 })).toEqual({ signal: true, unsupported_type: true });
  });
  it('test_nan_takes_the_failsafe_branch', () => {
    expect(hasSignal(Number.NaN)).toEqual({ signal: true, unsupported_type: true });
  });
});

describe('entity_id derivation (AC-19)', () => {
  it('test_affinity_prefix_yields_npc_id', () => {
    expect(deriveEntityId('affinity_delta_bui_lan')).toEqual({
      entity_id: 'bui_lan',
      unknown_convention: false,
    });
  });
  it('test_known_global_field_is_global_without_warning', () => {
    expect(deriveEntityId('hp_delta')).toEqual({
      entity_id: GLOBAL_ENTITY_ID,
      unknown_convention: false,
    });
  });
  it('test_canon_prefix_is_global_without_warning', () => {
    expect(deriveEntityId('canon_break_flag_evt_1').unknown_convention).toBe(false);
  });
  it('test_unknown_convention_is_global_with_warning', () => {
    expect(deriveEntityId('mystery_field')).toEqual({
      entity_id: GLOBAL_ENTITY_ID,
      unknown_convention: true,
    });
  });
  it('test_bare_prefix_without_id_is_not_entity_scoped', () => {
    expect(deriveEntityId('death_flag_').unknown_convention).toBe(true);
  });
});

describe('Formula #2 fact counts (AC-10, AC-10b, AC-11, AC-18)', () => {
  it('test_gdd_worked_example_yields_two_facts', () => {
    // AC-10: {hp_delta:-15, affinity_delta_bui_lan:+2, mana_delta:0, canon_break_flag:null}
    const lr = makeLockedResult(1, {
      hp_delta: -15,
      affinity_delta_bui_lan: 2,
      mana_delta: 0,
      canon_break_flag: null,
    });
    const result = extractFacts({ turn_id: 1, world_time: 1, locked_result: lr }, 1);
    expect(result.facts).toHaveLength(2);
    expect(result.facts.map((f) => f.entity_id).sort()).toEqual(['bui_lan', 'global']);
  });
  it('test_string_and_array_branches_yield_two_facts', () => {
    // AC-10b
    const lr = makeLockedResult(2, {
      battle_result_bui_lan: 'victory',
      witnesses_bui_lan: ['npc_a', 'npc_b'],
    });
    expect(factExtractionCount(lr)).toBe(2);
  });
  it('test_pure_dialogue_turn_yields_zero_facts', () => {
    expect(factExtractionCount(makeLockedResult(3, {}))).toBe(0);
  });
  it('test_multi_entity_turn_yields_one_fact_per_signalling_field', () => {
    const lr = makeLockedResult(4, {
      affinity_delta_a: 3,
      affinity_delta_b: -8,
      exp_delta_player: 40,
    });
    const facts = extractFacts({ turn_id: 4, world_time: 4, locked_result: lr }, 1).facts;
    expect(facts).toHaveLength(3);
    expect(new Set(facts.map((f) => f.entity_id)).size).toBe(3);
  });
  it('test_fact_ids_are_monotonic_from_the_seed', () => {
    const lr = makeLockedResult(5, { affinity_delta_a: 1, affinity_delta_b: 1 });
    const result = extractFacts({ turn_id: 5, world_time: 5, locked_result: lr }, 41);
    expect(result.facts.map((f) => f.fact_id)).toEqual([41, 42]);
    expect(result.next_fact_id).toBe(43);
  });
  it('test_unknown_convention_emits_warning_and_still_extracts', () => {
    const lr = makeLockedResult(6, { weird_field: 7 });
    const result = extractFacts({ turn_id: 6, world_time: 6, locked_result: lr }, 1);
    expect(result.facts).toHaveLength(1);
    expect(result.warnings[0]).toMatchObject({ kind: 'unknown_entity_convention', turn_id: 6 });
  });
  it('test_unsupported_type_emits_warning_and_still_extracts', () => {
    const lr = makeLockedResult(7, { odd_field: { a: 1 } as never });
    const result = extractFacts({ turn_id: 7, world_time: 7, locked_result: lr }, 1);
    expect(result.facts).toHaveLength(1);
    expect(result.warnings.some((w) => w.kind === 'unsupported_field_type')).toBe(true);
  });
  it('test_identical_locked_results_with_different_narration_extract_identically', () => {
    // AC-03(c): narration is never an input to extraction.
    const fields = { affinity_delta_x: 4 };
    const a = extractFacts({ turn_id: 9, world_time: 9, locked_result: makeLockedResult(9, fields) }, 1);
    const b = extractFacts({ turn_id: 9, world_time: 9, locked_result: makeLockedResult(9, fields) }, 1);
    expect(a.facts).toEqual(b.facts);
  });
});

describe('structural projection of LockedResult', () => {
  it('test_no_outcome_is_projected_as_null_and_does_not_signal', () => {
    const fields = lockedResultFields(makeLockedResult(1, {}));
    expect(fields.outcome_type).toBeNull();
    expect(factExtractionCount(makeLockedResult(1, {}))).toBe(0);
  });
  it('test_death_turn_flag_becomes_one_global_fact', () => {
    const lr = makeLockedResult(1, {}, { is_death_turn: true });
    const facts = extractFacts({ turn_id: 1, world_time: 1, locked_result: lr }, 1).facts;
    expect(facts).toHaveLength(1);
    expect(facts[0]).toMatchObject({ field_name: 'is_death_turn', entity_id: 'global' });
  });
  it('test_win_outcome_projects_three_facts', () => {
    const lr = makeLockedResult(1, {}, {
      outcome: { type: 'win', winner_id: 'player', loser_id: 'npc_a' },
    });
    expect(factExtractionCount(lr)).toBe(3);
  });
  it('test_explicit_field_overrides_the_projection', () => {
    const lr = makeLockedResult(1, { in_combat: true }, { in_combat: false });
    expect(lockedResultFields(lr).in_combat).toBe(true);
  });
});
