/**
 * World Memory - rule-based fact extraction (gdd-04 Part A, Formula #2).
 *
 * Design docs: production/gdd-integration/gdd-04-memory-canon.md A2 #3, A3, A4
 * (Formula #2), A6, A8 (AC-10, AC-10b, AC-11, AC-18, AC-19, AC-31);
 * production/gdd-integration/plan.md decision C-8 (this rule-based store runs
 * ALONGSIDE the existing AI summarizer in App.tsx, it does not replace it).
 *
 * HARD RULE (gdd-04 A2 #3 / gdd-01 B.2 R3): facts are derived ONLY from the
 * structured fields of `LockedResult`. `narration_text` is never read, parsed,
 * matched or tokenised here. There is no AI call in this file.
 *
 * Pure module: no I/O, no clock, no RNG.
 */
import {
  FIELD_PREFIX_AFFINITY_DELTA,
  FIELD_PREFIX_BREAKTHROUGH_FLAG,
  FIELD_PREFIX_CONSEQUENCE_TYPE,
  FIELD_PREFIX_CONSEQUENCE_WITNESSES,
  FIELD_PREFIX_DEATH_FLAG,
  FIELD_PREFIX_EXP_DELTA,
  entityIdFromField,
  type LockedFieldValue,
  type LockedResult,
} from '../types';

/** `entity_id` used for every fact not bound to a specific character (gdd-04 A2 #4). */
export const GLOBAL_ENTITY_ID = 'global';

/** A single extracted fact (gdd-04 A3). */
export interface Fact {
  /** Monotonic across the whole slot lifetime. Required for the total order of Formula #3. */
  fact_id: number;
  entity_id: string;
  turn_id: number;
  world_time: number;
  field_name: string;
  field_value: LockedFieldValue;
}

/** Non-fatal diagnostic. Extraction never throws (gdd-04 A6, AC-19, AC-31). */
export interface SchemaWarning {
  kind: 'unknown_entity_convention' | 'unsupported_field_type';
  field_name: string;
  turn_id: number;
}

/**
 * Field-name prefixes that bind a field to one entity. Extending this table is
 * the ONLY supported way to add an entity-scoped field (gdd-04 A9: the naming
 * convention must become a formal standard every feature system obeys).
 *
 * The first six come from `types.ts` (frozen in P0); the rest are the
 * cross-boundary names listed verbatim in gdd-04 A7.
 */
export const ENTITY_FIELD_PREFIXES: readonly string[] = [
  FIELD_PREFIX_AFFINITY_DELTA,
  FIELD_PREFIX_DEATH_FLAG,
  FIELD_PREFIX_EXP_DELTA,
  FIELD_PREFIX_BREAKTHROUGH_FLAG,
  FIELD_PREFIX_CONSEQUENCE_TYPE,
  FIELD_PREFIX_CONSEQUENCE_WITNESSES,
  'battle_result_',
  'canon_role_filled_',
  'witnesses_',
  'hp_delta_',
  'mana_delta_',
];

/**
 * Fields that are legitimately world-scoped. They resolve to `"global"` WITHOUT
 * a schema warning; anything else unmatched resolves to `"global"` WITH one
 * (gdd-04 A4 Formula #2, AC-19).
 */
export const GLOBAL_FIELD_NAMES: readonly string[] = [
  'hp_delta',
  'mana_delta',
  'is_death_turn',
  'in_combat',
  'battle_active',
  'outcome_type',
  'outcome_winner_id',
  'outcome_loser_id',
  'world_event',
  'location_id',
];

/**
 * Field-name prefixes that are world-scoped rather than entity-scoped. Canon
 * fields are keyed by `event_id`, not by `char_id` (gdd-04 A7), and P5 (Canon)
 * is dropped from the roadmap - they resolve to `"global"` silently so a future
 * pack cannot spam the warning log.
 */
export const GLOBAL_FIELD_PREFIXES: readonly string[] = [
  'canon_break_flag_',
  'canon_event_',
  'canon_rescue_failed_',
];

/** Result of `deriveEntityId`. */
export interface EntityIdDerivation {
  entity_id: string;
  /** True when the caller should emit an `unknown_entity_convention` warning. */
  unknown_convention: boolean;
}

/**
 * Derives `entity_id` from the field-name convention (gdd-04 A4 Formula #2):
 * `affinity_delta_bui_lan -> "bui_lan"`, unbound field -> `"global"`.
 *
 * The longest matching prefix wins so a future longer prefix cannot be shadowed
 * by a shorter one that happens to be its own proper prefix.
 */
export function deriveEntityId(fieldName: string): EntityIdDerivation {
  let best: string | null = null;
  for (const prefix of ENTITY_FIELD_PREFIXES) {
    if (fieldName.startsWith(prefix) && fieldName.length > prefix.length) {
      if (best === null || prefix.length > best.length) best = prefix;
    }
  }
  if (best !== null) {
    const id = entityIdFromField(best, fieldName);
    if (id) return { entity_id: id, unknown_convention: false };
  }
  if (GLOBAL_FIELD_NAMES.includes(fieldName)) {
    return { entity_id: GLOBAL_ENTITY_ID, unknown_convention: false };
  }
  for (const prefix of GLOBAL_FIELD_PREFIXES) {
    if (fieldName.startsWith(prefix)) {
      return { entity_id: GLOBAL_ENTITY_ID, unknown_convention: false };
    }
  }
  return { entity_id: GLOBAL_ENTITY_ID, unknown_convention: true };
}

/** Outcome of `hasSignal` - the boolean plus whether the type was recognised. */
export interface SignalDecision {
  signal: boolean;
  /** True when the value fell outside the 5 supported kinds (fail-safe branch). */
  unsupported_type: boolean;
}

/**
 * Formula #2 `has_signal(f)`. Five supported kinds; anything else takes the
 * fail-safe branch: emit the fact and warn, never silently drop (AC-31).
 *
 * Boolean polarity rule (gdd-04 A9): only `true` signals, so memorable state
 * must be named `death_flag=true`, never `is_alive=false`.
 */
export function hasSignal(value: unknown): SignalDecision {
  if (typeof value === 'number') {
    // NaN is not a "value != 0" the GDD contemplates; treat it as unsupported so
    // it surfaces in the QA log instead of silently becoming an ordinary fact.
    if (Number.isNaN(value)) return { signal: true, unsupported_type: true };
    return { signal: value !== 0, unsupported_type: false };
  }
  if (typeof value === 'boolean') return { signal: value === true, unsupported_type: false };
  if (typeof value === 'string') return { signal: value !== '', unsupported_type: false };
  if (Array.isArray(value)) return { signal: value.length > 0, unsupported_type: false };
  // `event(f)`: the GDD's fifth kind is a null-able event value; `null` and
  // `undefined` never signal, regardless of which kind the schema intended.
  if (value === null || value === undefined) return { signal: false, unsupported_type: false };
  // Nested object / dict / function / symbol: outside the 5 supported kinds.
  return { signal: true, unsupported_type: true };
}

/**
 * Flattens a `LockedResult` into the field record Formula #2 iterates.
 *
 * DECISION (P3a, beyond the GDD text): the GDD says "fields(turn.locked_result)"
 * without stating whether the structural block counts. `types.ts` keeps
 * per-entity results in the open `fields` record, but `is_death_turn` and
 * `outcome` are memorable world facts, so they are projected in under stable
 * global names. `outcome.type === 'none'` is the GDD `no_outcome` value (nothing
 * resolved) and is projected as `null` so it does not signal. `fields` always
 * wins on a name collision, keeping feature systems authoritative.
 */
export function lockedResultFields(lr: LockedResult): Record<string, LockedFieldValue> {
  const outcomeType = lr.outcome?.type ?? 'none';
  const projected: Record<string, LockedFieldValue> = {
    is_death_turn: lr.is_death_turn === true,
    in_combat: lr.in_combat === true,
    battle_active: lr.battle_active === true,
    outcome_type: outcomeType === 'none' ? null : outcomeType,
    outcome_winner_id: lr.outcome?.winner_id ?? null,
    outcome_loser_id: lr.outcome?.loser_id ?? null,
  };
  return { ...projected, ...(lr.fields ?? {}) };
}

/** Return value of `extractFacts`. */
export interface ExtractionResult {
  facts: Fact[];
  warnings: SchemaWarning[];
  /** `next_fact_id` after this extraction (gdd-04 A3, strictly monotonic). */
  next_fact_id: number;
}

/**
 * Formula #2 in full: one fact per signalling field, in a deterministic field
 * order (the insertion order of `lockedResultFields`), assigning `fact_id` from
 * `nextFactId` upward.
 *
 * `facts_extracted(turn)` is always in `[0, F]`. A pure-dialogue turn yields 0
 * facts, which is valid and must still be recorded as processed (AC-11).
 */
export function extractFacts(
  args: { turn_id: number; world_time: number; locked_result: LockedResult },
  nextFactId: number,
): ExtractionResult {
  const facts: Fact[] = [];
  const warnings: SchemaWarning[] = [];
  let factId = nextFactId;
  const fields = lockedResultFields(args.locked_result);
  for (const field_name of Object.keys(fields)) {
    const value = fields[field_name];
    const decision = hasSignal(value);
    if (decision.unsupported_type) {
      warnings.push({ kind: 'unsupported_field_type', field_name, turn_id: args.turn_id });
    }
    if (!decision.signal) continue;
    const derived = deriveEntityId(field_name);
    if (derived.unknown_convention) {
      warnings.push({ kind: 'unknown_entity_convention', field_name, turn_id: args.turn_id });
    }
    facts.push({
      fact_id: factId++,
      entity_id: derived.entity_id,
      turn_id: args.turn_id,
      world_time: args.world_time,
      field_name,
      field_value: value,
    });
  }
  return { facts, warnings, next_fact_id: factId };
}

/** Convenience for AC-10: how many facts a locked result would yield. */
export function factExtractionCount(lr: LockedResult): number {
  return extractFacts({ turn_id: 0, world_time: 0, locked_result: lr }, 1).facts.length;
}
