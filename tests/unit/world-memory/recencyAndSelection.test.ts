/**
 * Unit tests - Formula #1 (recency window) and Formula #3 (fact selection).
 * AC ids: gdd-04 A8 (AC-05, AC-08, AC-09, AC-12, AC-13, AC-30).
 */
import { describe, expect, it } from 'vitest';
import {
  RECENCY_WINDOW_FLOOR,
  effectiveRecencyWindow,
  inWindow,
  shouldExtract,
  turnIdFallsOut,
} from '../../../src-web/systems/worldMemory/recencyWindow';
import {
  compareFactsForSelection,
  indexOfLeastValuableFact,
  selectFacts,
} from '../../../src-web/systems/worldMemory/selectFacts';
import type { Fact } from '../../../src-web/systems/worldMemory/factStore';

function fact(id: number, worldTime: number, entity = 'npc_a'): Fact {
  return {
    fact_id: id,
    entity_id: entity,
    turn_id: worldTime,
    world_time: worldTime,
    field_name: 'affinity_delta_npc_a',
    field_value: 1,
  };
}

describe('Formula #1 - recency window (AC-05, AC-08, AC-09)', () => {
  it('test_floor_is_one_for_zero_knob', () => {
    expect(effectiveRecencyWindow(0)).toBe(RECENCY_WINDOW_FLOOR);
    expect(effectiveRecencyWindow(-5)).toBe(1);
    expect(effectiveRecencyWindow(Number.NaN)).toBe(1);
  });
  it('test_knob_is_used_when_above_floor', () => {
    expect(effectiveRecencyWindow(8)).toBe(8);
  });
  it('test_gdd_membership_example', () => {
    expect(inWindow(15, 20, 5)).toBe(false);
    for (const id of [16, 17, 18, 19, 20]) expect(inWindow(id, 20, 5)).toBe(true);
  });
  it('test_falls_out_id_matches_gdd_example', () => {
    expect(turnIdFallsOut(20, 5)).toBe(15);
    expect(turnIdFallsOut(21, 5)).toBe(16);
  });
  it('test_first_turn_guard_blocks_extraction', () => {
    expect(turnIdFallsOut(1, 5)).toBe(-4);
    expect(shouldExtract(-4)).toBe(false);
    expect(shouldExtract(0)).toBe(false);
    expect(shouldExtract(1)).toBe(true);
  });
  it('test_window_of_one_extracts_the_previous_turn_immediately', () => {
    expect(turnIdFallsOut(5, 1)).toBe(4);
  });
});

describe('Formula #3 - top_K selection (AC-12, AC-13, AC-30)', () => {
  it('test_k_larger_than_set_returns_everything_without_padding', () => {
    const facts = [fact(1, 1), fact(2, 2), fact(3, 3)];
    expect(selectFacts(facts, 8)).toHaveLength(3);
  });
  it('test_empty_set_returns_empty_never_throws', () => {
    expect(selectFacts([], 8)).toEqual([]);
  });
  it('test_zero_k_disables_the_fact_tier', () => {
    expect(selectFacts([fact(1, 1)], 0)).toEqual([]);
  });
  it('test_recency_order_when_all_tiers_equal', () => {
    const facts = [fact(1, 1), fact(2, 5), fact(3, 3)];
    expect(selectFacts(facts, 2).map((f) => f.world_time)).toEqual([5, 3]);
  });
  it('test_tier_beats_recency_and_old_tier3_is_always_included', () => {
    const facts = [...Array.from({ length: 22 }, (_, i) => fact(i + 2, i + 2)), fact(1, 1)];
    const tier = (f: Fact) => (f.fact_id === 1 ? 3 : 0);
    const selected = selectFacts(facts, 8, tier);
    expect(selected).toHaveLength(8);
    expect(selected[0].fact_id).toBe(1);
  });
  it('test_fact_id_breaks_ties_ascending', () => {
    const a = fact(9, 4);
    const b = fact(3, 4);
    expect(compareFactsForSelection(a, b)).toBeGreaterThan(0);
    expect(selectFacts([a, b], 2).map((f) => f.fact_id)).toEqual([3, 9]);
  });
  it('test_input_array_is_not_mutated', () => {
    const facts = [fact(2, 2), fact(1, 1)];
    const copy = [...facts];
    selectFacts(facts, 1);
    expect(facts).toEqual(copy);
  });
  it('test_least_valuable_is_lowest_tier_then_oldest', () => {
    const facts = [fact(1, 5), fact(2, 1), fact(3, 9)];
    const tier = (f: Fact) => (f.fact_id === 2 ? 3 : 0);
    expect(indexOfLeastValuableFact(facts, tier)).toBe(0);
  });
  it('test_least_valuable_of_empty_set_is_minus_one', () => {
    expect(indexOfLeastValuableFact([])).toBe(-1);
  });
  it('test_selection_is_deterministic_across_runs', () => {
    const facts = [fact(4, 2), fact(5, 2), fact(6, 2)];
    expect(selectFacts(facts, 2)).toEqual(selectFacts(facts, 2));
  });
});
