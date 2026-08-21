/**
 * World Memory - Formulas #4 and #5: the AI Context View, its O(1) bound `C`
 * and the terminating runtime hard clamp (gdd-04 A4).
 *
 * Design docs: production/gdd-integration/gdd-04-memory-canon.md A2 #3, A4
 * (Formulas #4/#5), A5, A8 (AC-14, AC-15, AC-28, AC-28b, AC-33, AC-34).
 *
 * Pure module: no I/O, no clock, no RNG, and - by construction - zero AI calls
 * (AC-15: context assembly adds 0 to `calls_per_turn`).
 */
import { AI_KNOBS, MAX_NPC_PER_SCENE, MEMORY_KNOBS } from '../registry';
import type { TurnRecord } from '../types';
import { GLOBAL_ENTITY_ID, type Fact } from './factStore';
import {
  DEFAULT_IMPORTANCE_TIER,
  indexOfLeastValuableFact,
  selectFacts,
  type ImportanceTierFn,
} from './selectFacts';

/**
 * Empirically measured averages (gdd-04 A5: explicitly NOT knobs). The GDD's
 * worked example uses 350 / 15; they must be re-measured whenever `F` (the
 * number of possible `locked_result` fields) grows materially.
 */
export const AVG_TURN_TOKENS = 350;
export const AVG_FACT_TOKENS = 15;

/**
 * gdd-04 A5 cross-GDD invariant: `max_entities_per_prompt >= MAX_NPC_PER_SCENE + 1`
 * (the `+1` is the `"global"` slot). AC-33 verifies it statically; AC-34 is the
 * defensive clamp applied when it is violated at runtime anyway.
 */
export function entitiesInvariantHolds(
  maxEntitiesPerPrompt: number = MEMORY_KNOBS.max_entities_per_prompt,
  maxNpcPerScene: number = MAX_NPC_PER_SCENE,
): boolean {
  return maxEntitiesPerPrompt >= maxNpcPerScene + 1;
}

/**
 * Formula #4 upper bound `C = recency_window_turns * avg_turn_tokens
 * + max_entities_per_prompt * max_facts_per_entity * avg_fact_tokens`.
 *
 * `C` is constant in `world_time` - that O(1) property is the load-bearing
 * result, not the exact number. It is an expected-value bound (the `avg_*` are
 * measured averages, not maxima); the guaranteed bound is Formula #5.
 */
export function contextSizeBound(opts: {
  recencyWindowTurns?: number;
  maxEntitiesPerPrompt?: number;
  maxFactsPerEntity?: number;
  avgTurnTokens?: number;
  avgFactTokens?: number;
} = {}): number {
  const recency = opts.recencyWindowTurns ?? MEMORY_KNOBS.recency_window_turns;
  const entities = opts.maxEntitiesPerPrompt ?? MEMORY_KNOBS.max_entities_per_prompt;
  const facts = opts.maxFactsPerEntity ?? MEMORY_KNOBS.max_facts_per_entity;
  const turnTokens = opts.avgTurnTokens ?? AVG_TURN_TOKENS;
  const factTokens = opts.avgFactTokens ?? AVG_FACT_TOKENS;
  return recency * turnTokens + entities * facts * factTokens;
}

/**
 * Formula #4 expected size of one concrete prompt:
 * `recency * avg_turn_tokens + SUM over entities of min(|facts(e)|, K) * avg_fact_tokens`.
 */
export function estimateContextSize(opts: {
  recencyTurnCount: number;
  factCountsPerEntity: readonly number[];
  maxFactsPerEntity?: number;
  avgTurnTokens?: number;
  avgFactTokens?: number;
}): number {
  const k = opts.maxFactsPerEntity ?? MEMORY_KNOBS.max_facts_per_entity;
  const turnTokens = opts.avgTurnTokens ?? AVG_TURN_TOKENS;
  const factTokens = opts.avgFactTokens ?? AVG_FACT_TOKENS;
  const factTotal = opts.factCountsPerEntity.reduce((sum, n) => sum + Math.min(n, k), 0);
  return opts.recencyTurnCount * turnTokens + factTotal * factTokens;
}

/**
 * Defensive clamp of AC-34: if `|entities_in_scope| > max_entities_per_prompt`
 * (possible only when the cross-GDD invariant is misconfigured), keep the
 * highest-priority entities instead of letting the bound break silently.
 *
 * `priorityKey` is owned by Situation/Encounter Generation; the default keeps
 * `"global"` first (it carries world-level facts nothing else can supply) and is
 * otherwise stable in input order.
 */
export function clampEntities(
  entities: readonly string[],
  maxEntitiesPerPrompt: number = MEMORY_KNOBS.max_entities_per_prompt,
  priorityKey: (entityId: string, index: number) => number = defaultPriorityKey,
): string[] {
  const unique: string[] = [];
  for (const e of entities) if (!unique.includes(e)) unique.push(e);
  const max = Math.max(0, Math.floor(maxEntitiesPerPrompt));
  if (unique.length <= max) return unique;
  return unique
    .map((entityId, index) => ({ entityId, index, key: priorityKey(entityId, index) }))
    // Higher key first; input order breaks ties so the clamp stays deterministic.
    .sort((a, b) => (b.key - a.key !== 0 ? b.key - a.key : a.index - b.index))
    .slice(0, max)
    .sort((a, b) => a.index - b.index)
    .map((e) => e.entityId);
}

/** Default `priority_key`: `"global"` outranks NPCs, everything else ties. */
export function defaultPriorityKey(entityId: string): number {
  return entityId === GLOBAL_ENTITY_ID ? 1 : 0;
}

/** The assembled, size-bounded context (gdd-04 A2 #1: derived, never the Full Log). */
export interface ContextView {
  /** Recent turns kept verbatim, oldest first. */
  recency: TurnRecord[];
  /** Selected facts of the entities in scope, in selection order. */
  facts: Fact[];
  /** The entity ids actually included, after the AC-34 clamp. */
  entities: string[];
}

export interface BuildContextResult {
  context: ContextView;
  /** True only at rock bottom: 1 turn, 0 facts, still over budget (AC-28b). */
  over_budget: boolean;
  /** Measured token count of the returned context. */
  measured: number;
  /** How many verbatim turns / facts the clamp removed from this one prompt. */
  trimmed_turns: number;
  trimmed_facts: number;
}

/**
 * Default token measurement: ~4 characters per token over the serialised
 * content. Deliberately crude and injectable - the AI/LLM layer owns the real
 * tokenizer and the `ai_context_hard_token_budget` knob (gdd-04 A5).
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/** Default measurement of a whole context view. */
export function measureContext(ctx: ContextView): number {
  let total = 0;
  for (const turn of ctx.recency) {
    total += estimateTokens(turn.narration_text ?? '');
    total += estimateTokens(JSON.stringify(turn.locked_result ?? {}));
    total += estimateTokens(turn.action_text ?? '');
  }
  for (const fact of ctx.facts) {
    total += estimateTokens(`${fact.entity_id}.${fact.field_name}=${JSON.stringify(fact.field_value)}`);
  }
  return total;
}

export interface BuildContextOptions {
  entitiesInScope: readonly string[];
  recency: readonly TurnRecord[];
  /** All facts of an entity (unbounded); Formula #3 truncates them here. */
  factsByEntity: (entityId: string) => readonly Fact[];
  maxEntitiesPerPrompt?: number;
  maxFactsPerEntity?: number;
  importanceTier?: ImportanceTierFn;
  hardTokenBudget?: number;
  measure?: (ctx: ContextView) => number;
  priorityKey?: (entityId: string, index: number) => number;
}

/**
 * Formula #5 - build the AI Context View and apply the runtime hard clamp.
 *
 * Trim order until under budget or out of moves:
 *  1. drop the OLDEST turn in the recency window, absolute floor 1 (Core Rule #5);
 *  2. drop the least valuable fact - lowest `importance_tier` first, oldest
 *     `world_time` within a tier (the exact inverse of Formula #3's key);
 *  3. rock bottom (1 turn, 0 facts) -> return `{context, over_budget: true}`.
 *
 * Termination: each step strictly decreases one of two finite quantities and
 * never increases either. This function NEVER throws; the caller decides what to
 * do with `over_budget`. Trimming affects one prompt only - nothing is deleted
 * from the Full Log or the fact store (unlike undo).
 */
export function buildContextView(opts: BuildContextOptions): BuildContextResult {
  const maxEntities = opts.maxEntitiesPerPrompt ?? MEMORY_KNOBS.max_entities_per_prompt;
  const maxFacts = opts.maxFactsPerEntity ?? MEMORY_KNOBS.max_facts_per_entity;
  const tier = opts.importanceTier ?? DEFAULT_IMPORTANCE_TIER;
  const budget = opts.hardTokenBudget ?? AI_KNOBS.ai_context_hard_token_budget;
  const measure = opts.measure ?? measureContext;
  const entities = clampEntities(opts.entitiesInScope, maxEntities, opts.priorityKey ?? defaultPriorityKey);

  const facts: Fact[] = [];
  for (const entityId of entities) {
    facts.push(...selectFacts(opts.factsByEntity(entityId) ?? [], maxFacts, tier));
  }
  const ctx: ContextView = { recency: [...opts.recency], facts, entities };

  let trimmedTurns = 0;
  let trimmedFacts = 0;
  let measured = measure(ctx);
  while (measured > budget) {
    if (ctx.recency.length > 1) {
      ctx.recency.shift();
      trimmedTurns += 1;
    } else if (ctx.facts.length > 0) {
      const idx = indexOfLeastValuableFact(ctx.facts, tier);
      ctx.facts.splice(idx, 1);
      trimmedFacts += 1;
    } else {
      return {
        context: ctx,
        over_budget: true,
        measured,
        trimmed_turns: trimmedTurns,
        trimmed_facts: trimmedFacts,
      };
    }
    measured = measure(ctx);
  }
  return {
    context: ctx,
    over_budget: false,
    measured,
    trimmed_turns: trimmedTurns,
    trimmed_facts: trimmedFacts,
  };
}
