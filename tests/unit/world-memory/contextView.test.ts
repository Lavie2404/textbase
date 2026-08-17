/**
 * Unit tests - Formulas #4/#5: the O(1) bound C and the hard clamp.
 * AC ids: gdd-04 A8 (AC-14, AC-15, AC-28, AC-28b, AC-33, AC-34).
 */
import { describe, expect, it } from 'vitest';
import {
  AVG_FACT_TOKENS,
  AVG_TURN_TOKENS,
  buildContextView,
  clampEntities,
  contextSizeBound,
  entitiesInvariantHolds,
  estimateContextSize,
  type ContextView,
} from '../../../src-web/systems/worldMemory/contextView';
import type { Fact } from '../../../src-web/systems/worldMemory/factStore';
import { MAX_NPC_PER_SCENE, MEMORY_KNOBS } from '../../../src-web/systems/registry';
import { makeTurns } from './factories';

function fact(id: number, entity: string, worldTime: number): Fact {
  return {
    fact_id: id,
    entity_id: entity,
    turn_id: worldTime,
    world_time: worldTime,
    field_name: `affinity_delta_${entity}`,
    field_value: 1,
  };
}

/** One token per turn / per fact - makes the clamp arithmetic exact. */
const unitMeasure = (ctx: ContextView) => ctx.recency.length + ctx.facts.length;

describe('Formula #4 - the size bound C (AC-14, AC-15)', () => {
  it('test_gdd_worked_example_c_equals_2230', () => {
    expect(
      contextSizeBound({
        recencyWindowTurns: 5,
        maxEntitiesPerPrompt: 4,
        maxFactsPerEntity: 8,
        avgTurnTokens: 350,
        avgFactTokens: 15,
      }),
    ).toBe(2230);
  });
  it('test_bound_is_independent_of_world_time', () => {
    const atEarly = estimateContextSize({ recencyTurnCount: 5, factCountsPerEntity: [8, 8, 8, 8] });
    const atLate = estimateContextSize({ recencyTurnCount: 5, factCountsPerEntity: [500, 900, 8, 8] });
    const bound = contextSizeBound({ recencyWindowTurns: 5 });
    expect(atEarly).toBeLessThanOrEqual(bound);
    expect(atLate).toBeLessThanOrEqual(bound);
    expect(atLate).toBe(atEarly);
  });
  it('test_world_time_zero_costs_one_turn', () => {
    expect(estimateContextSize({ recencyTurnCount: 1, factCountsPerEntity: [] })).toBe(AVG_TURN_TOKENS);
  });
  it('test_fact_tokens_are_capped_per_entity', () => {
    expect(
      estimateContextSize({ recencyTurnCount: 0, factCountsPerEntity: [50], maxFactsPerEntity: 8 }),
    ).toBe(8 * AVG_FACT_TOKENS);
  });
});

describe('cross-GDD entity invariant (AC-33, AC-34)', () => {
  it('test_registry_satisfies_max_entities_ge_max_npc_plus_one', () => {
    expect(entitiesInvariantHolds()).toBe(true);
    expect(MEMORY_KNOBS.max_entities_per_prompt).toBeGreaterThanOrEqual(MAX_NPC_PER_SCENE + 1);
  });
  it('test_violation_is_detected', () => {
    expect(entitiesInvariantHolds(3, 3)).toBe(false);
  });
  it('test_defensive_clamp_keeps_global_and_drops_lowest_priority', () => {
    const clamped = clampEntities(['npc_a', 'npc_b', 'npc_c', 'npc_d', 'global'], 2);
    expect(clamped).toContain('global');
    expect(clamped).toHaveLength(2);
  });
  it('test_clamp_deduplicates_and_preserves_input_order', () => {
    expect(clampEntities(['npc_a', 'npc_a', 'global'], 4)).toEqual(['npc_a', 'global']);
  });
  it('test_clamp_is_a_noop_below_the_limit', () => {
    expect(clampEntities(['a', 'b'], 4)).toEqual(['a', 'b']);
  });
});

describe('Formula #5 - runtime hard clamp (AC-28, AC-28b)', () => {
  const recency = makeTurns(5);
  const facts = [fact(1, 'npc_a', 1), fact(2, 'npc_a', 2), fact(3, 'npc_a', 3), fact(4, 'npc_a', 4)];
  const factsByEntity = () => facts;

  it('test_under_budget_returns_untrimmed_context', () => {
    const result = buildContextView({
      entitiesInScope: ['npc_a'],
      recency,
      factsByEntity,
      hardTokenBudget: 100,
      measure: unitMeasure,
    });
    expect(result.over_budget).toBe(false);
    expect(result.trimmed_turns).toBe(0);
    expect(result.trimmed_facts).toBe(0);
  });
  it('test_step_one_drops_oldest_turns_first', () => {
    const result = buildContextView({
      entitiesInScope: ['npc_a'],
      recency,
      factsByEntity,
      hardTokenBudget: 5,
      measure: unitMeasure,
    });
    expect(result.trimmed_turns).toBe(4);
    expect(result.trimmed_facts).toBe(0);
    expect(result.context.recency).toHaveLength(1);
    expect(result.context.recency[0].turn_id).toBe(5);
  });
  it('test_step_two_drops_lowest_tier_facts_after_recency_floor', () => {
    const tier = (f: Fact) => (f.fact_id === 1 ? 3 : 0);
    const result = buildContextView({
      entitiesInScope: ['npc_a'],
      recency,
      factsByEntity,
      importanceTier: tier,
      hardTokenBudget: 2,
      measure: unitMeasure,
    });
    expect(result.context.recency).toHaveLength(1);
    expect(result.context.facts).toHaveLength(1);
    expect(result.context.facts[0].fact_id).toBe(1);
    expect(result.over_budget).toBe(false);
  });
  it('test_rock_bottom_returns_over_budget_without_throwing', () => {
    const result = buildContextView({
      entitiesInScope: ['npc_a'],
      recency,
      factsByEntity,
      hardTokenBudget: 0,
      measure: unitMeasure,
    });
    expect(result.over_budget).toBe(true);
    expect(result.context.recency).toHaveLength(1);
    expect(result.context.facts).toHaveLength(0);
  });
  it('test_clamp_never_deletes_source_facts', () => {
    buildContextView({
      entitiesInScope: ['npc_a'],
      recency,
      factsByEntity,
      hardTokenBudget: 0,
      measure: unitMeasure,
    });
    expect(facts).toHaveLength(4);
  });
  it('test_default_token_measurement_is_used_when_none_injected', () => {
    const result = buildContextView({ entitiesInScope: ['npc_a'], recency, factsByEntity });
    expect(result.measured).toBeGreaterThan(0);
    expect(result.over_budget).toBe(false);
  });
});
