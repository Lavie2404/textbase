/**
 * World Memory - Formula #3, entity-scoped fact selection (gdd-04 A4).
 *
 * Design docs: production/gdd-integration/gdd-04-memory-canon.md A4 (Formula #3),
 * A8 (AC-12, AC-13, AC-22, AC-30).
 *
 * Pure module: no I/O, no clock, no RNG.
 */
import { MEMORY_KNOBS } from '../registry';
import type { Fact } from './factStore';

/**
 * `importance_tier(fact) -> 0..3`, supplied by Setting & Canon D.5 as a pure
 * function of `field_name`/`field_value`.
 *
 * P5 (Setting & Canon) is dropped from the shortened roadmap (plan.md), so the
 * default implementation returns 0 for everything: Formula #3 then degenerates
 * to pure recency, which the GDD explicitly calls out as backward compatible.
 */
export type ImportanceTierFn = (fact: Fact) => number;

/** Default tier function: every fact is tier 0 (no Canon pack loaded). */
export const DEFAULT_IMPORTANCE_TIER: ImportanceTierFn = () => 0;

/**
 * Total order of Formula #3: `(importance_tier DESC, world_time DESC, fact_id ASC)`.
 *
 * `fact_id ASC` is mandatory, not decorative: ties on `(tier, world_time)` are
 * common because Formula #2 deliberately emits several facts per turn, and
 * without it `top_K` has no total order and determinism (AC-17) breaks.
 */
export function compareFactsForSelection(
  a: Fact,
  b: Fact,
  importanceTier: ImportanceTierFn = DEFAULT_IMPORTANCE_TIER,
): number {
  const tierDelta = importanceTier(b) - importanceTier(a);
  if (tierDelta !== 0) return tierDelta;
  const timeDelta = b.world_time - a.world_time;
  if (timeDelta !== 0) return timeDelta;
  return a.fact_id - b.fact_id;
}

/**
 * `selected_facts(entity_id) = top_K(facts(entity_id), key, K = max_facts_per_entity)`.
 *
 * - `K > |set|` returns the whole set: no padding, no error.
 * - An empty input returns an empty array, never throws.
 * - `K = 0` is formally legal and always returns empty (disables the fact tier).
 * - The input array is never mutated.
 */
export function selectFacts(
  facts: readonly Fact[],
  maxFactsPerEntity: number = MEMORY_KNOBS.max_facts_per_entity,
  importanceTier: ImportanceTierFn = DEFAULT_IMPORTANCE_TIER,
): Fact[] {
  if (!facts || facts.length === 0) return [];
  const k = Number.isFinite(maxFactsPerEntity) ? Math.floor(maxFactsPerEntity) : 0;
  if (k <= 0) return [];
  return [...facts].sort((a, b) => compareFactsForSelection(a, b, importanceTier)).slice(0, k);
}

/**
 * Exact inverse of the selection key, used by the Formula #5 hard clamp: drop the
 * LOWEST importance tier first, and within a tier the OLDEST `world_time` first
 * (ties broken by the HIGHEST `fact_id`, mirroring `fact_id ASC`).
 *
 * Returns the index of the fact to drop, or -1 for an empty set.
 */
export function indexOfLeastValuableFact(
  facts: readonly Fact[],
  importanceTier: ImportanceTierFn = DEFAULT_IMPORTANCE_TIER,
): number {
  if (!facts || facts.length === 0) return -1;
  let worst = 0;
  for (let i = 1; i < facts.length; i += 1) {
    // compare(worst, candidate) > 0 means candidate sorts earlier => keep candidate.
    if (compareFactsForSelection(facts[worst], facts[i], importanceTier) < 0) {
      worst = i;
    }
  }
  return worst;
}
