/**
 * World Memory - the two-tier store itself (gdd-04 Part A).
 *
 * Tier 1 "Full Narrative Log": every confirmed, non-undone turn record, never
 * lossy, never summarised. Tier 2 "AI Context View": a derived, size-bounded
 * view = the recency window verbatim + rule-based facts extracted from
 * `locked_result` only. Compression happens ONLY in tier 2 (Core Rule #1).
 *
 * Design docs: production/gdd-integration/gdd-04-memory-canon.md A2 (Core Rules
 * #1-#8), A3 (state model + invariants), A4 (Formulas #1-#5 + batch extraction),
 * A6, A7 (public interface), A8 (AC-01..AC-34);
 * production/gdd-integration/plan.md decision C-8 (runs alongside the existing
 * App.tsx AI summarizer), C-13 (Undo needs snapshots).
 *
 * Pure module: no I/O, no clock, no RNG, no React, zero AI calls.
 *
 * WRITE DISCIPLINE (Core Rule #2): only the Turn Manager writes. `asWriter()`
 * exposes the three mutating operations; `asReadView()` exposes everything else.
 * Consumers must hold the read view, never the instance.
 */
import { MEMORY_KNOBS } from '../registry';
import type { LockedResult, TurnRecord, UndoableSystem } from '../types';
import {
  GLOBAL_ENTITY_ID,
  extractFacts,
  lockedResultFields,
  type Fact,
  type SchemaWarning,
} from './factStore';
import {
  buildContextView,
  type BuildContextResult,
  type ContextView,
} from './contextView';
import { effectiveRecencyWindow, shouldExtract, turnIdFallsOut } from './recencyWindow';
import {
  DEFAULT_IMPORTANCE_TIER,
  selectFacts,
  type ImportanceTierFn,
} from './selectFacts';

/** `get_processing_state` result (gdd-04 A7). */
export interface ProcessingState {
  processed: boolean;
  fact_count: number;
}

/** `get_turn_page` result (gdd-04 A7). */
export interface TurnPage {
  records: TurnRecord[];
  has_more: boolean;
}

export type PageDirection = 'older' | 'newer';

/** What one `append` did, for the Turn Manager's own logging. */
export interface AppendResult {
  /** False when `turn_id` was already present: append is idempotent, never a duplicate. */
  appended: boolean;
  /** The turn that left the recency window and was compacted into facts, if any. */
  evicted_turn_id: number | null;
  facts_added: number;
  warnings: SchemaWarning[];
}

export interface WorldMemoryOptions {
  recencyWindowTurns?: number;
  maxFactsPerEntity?: number;
  maxEntitiesPerPrompt?: number;
  importanceTier?: ImportanceTierFn;
}

/** Serialized form (Core Rule #8: Persistence must store the Context View too). */
export interface WorldMemoryJson {
  version: 1;
  full_log: TurnRecord[];
  facts: Record<string, Fact[]>;
  processed_turns: Array<[number, ProcessingState]>;
  total_turns_counter: number;
  last_confirmed_turn_id: number;
  next_fact_id: number;
  /** Highest `turn_id` ever evicted. Eviction is irreversible (AC-32). */
  evicted_through_turn_id: number;
  warnings: SchemaWarning[];
  /** Knobs in force when the view was built. Diagnostic only - never replayed. */
  knobs: { recency_window_turns: number; max_facts_per_entity: number; max_entities_per_prompt: number };
}

/** Turn-Manager-only mutating surface (Core Rule #2). */
export interface WorldMemoryWriter {
  append(record: TurnRecord, lockedResult?: LockedResult): AppendResult;
  undoLast(): TurnRecord | null;
  undo(turnId: number): TurnRecord | null;
}

/** Everything every other system is allowed to touch (gdd-04 A7). */
export interface WorldMemoryReadView {
  getTurn(turnId: number): TurnRecord | null;
  getTurnPage(anchorTurnId: number, count: number, direction: PageDirection): TurnPage;
  getProcessingState(turnId: number): ProcessingState | null;
  getFactsByEntity(entityId: string): Fact[];
  totalTurns(): number;
  referencedInWorldMemory(entryId: string): boolean;
  selectedFacts(entityId: string): Fact[];
  recencyWindow(): TurnRecord[];
  buildContext(entitiesInScope: readonly string[], opts?: BuildContextArgs): BuildContextResult;
}

/** Caller-supplied overrides for one context build (the AI/LLM layer owns the budget). */
export interface BuildContextArgs {
  hardTokenBudget?: number;
  measure?: (ctx: ContextView) => number;
  priorityKey?: (entityId: string, index: number) => number;
}

/**
 * The store. Tracks exactly ONE open slot - there is no slot parameter
 * (gdd-04 A3). Persistence owns the slot boundary.
 */
export class WorldMemory implements UndoableSystem {
  private fullLog: TurnRecord[] = [];
  private facts: Map<string, Fact[]> = new Map();
  private processedTurns: Map<number, ProcessingState> = new Map();
  private totalTurnsCounter = 0;
  private lastConfirmedTurnId = 0;
  private nextFactId = 1;
  private evictedThroughTurnId = 0;
  private warnings: SchemaWarning[] = [];

  readonly recencyWindowTurns: number;
  readonly maxFactsPerEntity: number;
  readonly maxEntitiesPerPrompt: number;
  readonly importanceTier: ImportanceTierFn;

  constructor(opts: WorldMemoryOptions = {}) {
    this.recencyWindowTurns = effectiveRecencyWindow(
      opts.recencyWindowTurns ?? MEMORY_KNOBS.recency_window_turns,
    );
    this.maxFactsPerEntity = opts.maxFactsPerEntity ?? MEMORY_KNOBS.max_facts_per_entity;
    this.maxEntitiesPerPrompt = opts.maxEntitiesPerPrompt ?? MEMORY_KNOBS.max_entities_per_prompt;
    this.importanceTier = opts.importanceTier ?? DEFAULT_IMPORTANCE_TIER;
  }

  // -------------------------------------------------------------------------
  // Writes (Turn Manager only)
  // -------------------------------------------------------------------------

  /**
   * Append one confirmed turn. Write + extract are ONE atomic operation, never
   * two caller-driven steps (Core Rule #2 / AC-27).
   *
   * @param lockedResult Optional override of `record.locked_result`, so the Turn
   *   Manager can hand the freshly locked struct in directly without rebuilding
   *   the record. When omitted, `record.locked_result` is used.
   */
  append(record: TurnRecord, lockedResult?: LockedResult): AppendResult {
    if (this.processedTurns.has(record.turn_id) || this.getTurn(record.turn_id)) {
      return { appended: false, evicted_turn_id: null, facts_added: 0, warnings: [] };
    }
    const stored: TurnRecord =
      lockedResult === undefined ? record : { ...record, locked_result: lockedResult };
    this.fullLog.push(stored);
    this.fullLog.sort((a, b) => a.turn_id - b.turn_id);
    this.totalTurnsCounter += 1; // O(1) contract: never a rescan of full_log.
    if (stored.turn_id > this.lastConfirmedTurnId) this.lastConfirmedTurnId = stored.turn_id;
    this.processedTurns.set(stored.turn_id, { processed: false, fact_count: 0 });

    const fallOut = turnIdFallsOut(this.lastConfirmedTurnId, this.recencyWindowTurns);
    if (!shouldExtract(fallOut)) {
      return { appended: true, evicted_turn_id: null, facts_added: 0, warnings: [] };
    }
    if (fallOut > this.evictedThroughTurnId) this.evictedThroughTurnId = fallOut;
    const falling = this.getTurn(fallOut);
    const state = this.processedTurns.get(fallOut);
    if (!falling || (state && state.processed)) {
      // The turn was undone before it could fall out, or was already extracted.
      return { appended: true, evicted_turn_id: null, facts_added: 0, warnings: [] };
    }
    const result = this.extractTurn(falling);
    return {
      appended: true,
      evicted_turn_id: fallOut,
      facts_added: result.facts_added,
      warnings: result.warnings,
    };
  }

  /** Hard-delete the newest record (Core Rule #2). Returns it, or null when empty. */
  undoLast(): TurnRecord | null {
    if (this.fullLog.length === 0) return null;
    return this.undo(this.fullLog[this.fullLog.length - 1].turn_id);
  }

  /**
   * Hard-delete one turn record. Undo of a non-existent or already-undone
   * `turn_id` is a no-op and NEVER throws (Core Rule #2 / AC-07).
   *
   * `last_confirmed_turn_id` drops to `turn_id - 1`, exactly as Formula #1's note
   * describes. `total_turns_counter` is decremented in place, never recomputed.
   */
  undo(turnId: number): TurnRecord | null {
    const index = this.fullLog.findIndex((r) => r.turn_id === turnId);
    if (index === -1) return null;
    const [removed] = this.fullLog.splice(index, 1);
    this.totalTurnsCounter -= 1;
    this.processedTurns.delete(turnId);
    if (this.lastConfirmedTurnId >= turnId) this.lastConfirmedTurnId = turnId - 1;
    // Defensive: an undone turn is always in-window and therefore factless, but a
    // corrupt import could violate that. Facts of a deleted turn must not survive.
    for (const [entityId, list] of this.facts) {
      const kept = list.filter((f) => f.turn_id !== turnId);
      if (kept.length === 0) this.facts.delete(entityId);
      else if (kept.length !== list.length) this.facts.set(entityId, kept);
    }
    return removed;
  }

  // -------------------------------------------------------------------------
  // Reads
  // -------------------------------------------------------------------------

  /** Exact point lookup. `null` = the GDD's explicit `not_found` (AC-01/AC-02). */
  getTurn(turnId: number): TurnRecord | null {
    return this.fullLog.find((r) => r.turn_id === turnId) ?? null;
  }

  /**
   * `get_turn_page(anchor_turn_id, count, direction)`.
   *
   * Never includes the anchor itself (unconditional). A vanished anchor behaves
   * as a virtual timestamp: the nearest surviving records in that direction.
   * Never throws, never fakes an empty result (AC-23..AC-26).
   */
  getTurnPage(anchorTurnId: number, count: number, direction: PageDirection): TurnPage {
    const n = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
    const candidates =
      direction === 'older'
        ? this.fullLog.filter((r) => r.turn_id < anchorTurnId).slice().reverse()
        : this.fullLog.filter((r) => r.turn_id > anchorTurnId);
    const taken = candidates.slice(0, n);
    const records = direction === 'older' ? taken.slice().reverse() : taken;
    return { records, has_more: candidates.length > n };
  }

  /**
   * In-window turn -> `{processed: false}`; extracted turn -> `{processed: true}`
   * even when `fact_count = 0` (AC-11). Unknown id -> `null` (not_found).
   */
  getProcessingState(turnId: number): ProcessingState | null {
    const state = this.processedTurns.get(turnId);
    return state ? { ...state } : null;
  }

  /**
   * ALL facts of an entity - explicitly NOT truncated by `max_facts_per_entity`
   * (that is `selectedFacts`, an internal prompt-assembly concern). Unknown
   * entity -> empty array, never throws (AC-30).
   */
  getFactsByEntity(entityId: string): Fact[] {
    return [...(this.facts.get(entityId) ?? [])];
  }

  /** O(1) maintained counter of confirmed, non-undone records (AC-29). */
  totalTurns(): number {
    return this.totalTurnsCounter;
  }

  /** `last_confirmed_turn_id`. Differs from `totalTurns()` by the number of undos. */
  lastConfirmedTurn(): number {
    return this.lastConfirmedTurnId;
  }

  /** Next `fact_id` to be assigned; strictly monotonic across the slot lifetime. */
  peekNextFactId(): number {
    return this.nextFactId;
  }

  /** Accumulated schema warnings for QA (AC-19/AC-31). Never thrown, never lost. */
  getWarnings(): SchemaWarning[] {
    return [...this.warnings];
  }

  /**
   * Has this entity/item/skill ever appeared STRUCTURALLY in the narrative?
   *
   * Checks extracted facts and the structured fields of in-window turns only.
   * It is NEVER a text match on display names in `narration_text` - a false
   * negative would let Character Customization Mode D.5 delete an entry already
   * written into history (gdd-04 A7). Unknown id -> false.
   */
  referencedInWorldMemory(entryId: string): boolean {
    if (!entryId) return false;
    for (const [entityId, list] of this.facts) {
      if (entityId === entryId) return true;
      for (const fact of list) {
        if (this.valueReferences(fact.field_name, fact.field_value, entryId)) return true;
      }
    }
    // In-window turns have not been compacted into facts yet, so their locked
    // results must be scanned too - structurally, field by field.
    for (const record of this.recencyWindow()) {
      const fields = lockedResultFields(record.locked_result);
      for (const fieldName of Object.keys(fields)) {
        if (this.valueReferences(fieldName, fields[fieldName], entryId)) return true;
      }
    }
    return false;
  }

  private valueReferences(fieldName: string, value: unknown, entryId: string): boolean {
    if (fieldName.endsWith(`_${entryId}`)) return true;
    if (typeof value === 'string') return value === entryId;
    if (Array.isArray(value)) return value.some((v) => v === entryId);
    return false;
  }

  /** Formula #3, internal prompt-assembly selection. */
  selectedFacts(entityId: string): Fact[] {
    return selectFacts(this.facts.get(entityId) ?? [], this.maxFactsPerEntity, this.importanceTier);
  }

  /**
   * The turns still kept verbatim, oldest first.
   *
   * Derived from the eviction watermark, NOT from a live re-evaluation of
   * `in_window`: once a turn is evicted it never returns to verbatim form, even
   * if a later undo lowers `last_confirmed_turn_id` (AC-32).
   */
  recencyWindow(): TurnRecord[] {
    return this.fullLog.filter((r) => r.turn_id > this.evictedThroughTurnId);
  }

  /** Formulas #4/#5 - the bounded AI Context View for one prompt. */
  buildContext(entitiesInScope: readonly string[], opts: BuildContextArgs = {}): BuildContextResult {
    return buildContextView({
      entitiesInScope: entitiesInScope.length === 0 ? [GLOBAL_ENTITY_ID] : entitiesInScope,
      recency: this.recencyWindow(),
      factsByEntity: (id) => this.facts.get(id) ?? [],
      maxEntitiesPerPrompt: this.maxEntitiesPerPrompt,
      maxFactsPerEntity: this.maxFactsPerEntity,
      importanceTier: this.importanceTier,
      hardTokenBudget: opts.hardTokenBudget,
      measure: opts.measure,
      priorityKey: opts.priorityKey,
    });
  }

  // -------------------------------------------------------------------------
  // Undo support (gdd-01 A.2 / plan.md C-13)
  // -------------------------------------------------------------------------

  /** Opaque snapshot for the Turn Manager's one-turn undo. */
  captureSnapshot(): unknown {
    return this.toJSON();
  }

  /** Restores a snapshot produced by `captureSnapshot`. Ignores a null snapshot. */
  restoreSnapshot(snapshot: unknown): void {
    if (!snapshot) return;
    this.loadJson(snapshot as WorldMemoryJson);
  }

  // -------------------------------------------------------------------------
  // Serialization (Core Rule #8 - Persistence stores BOTH tiers)
  // -------------------------------------------------------------------------

  toJSON(): WorldMemoryJson {
    const facts: Record<string, Fact[]> = {};
    for (const [entityId, list] of this.facts) facts[entityId] = list.map((f) => ({ ...f }));
    return {
      version: 1,
      full_log: this.fullLog.map((r) => JSON.parse(JSON.stringify(r)) as TurnRecord),
      facts,
      processed_turns: [...this.processedTurns.entries()].map(([k, v]) => [k, { ...v }]),
      total_turns_counter: this.totalTurnsCounter,
      last_confirmed_turn_id: this.lastConfirmedTurnId,
      next_fact_id: this.nextFactId,
      evicted_through_turn_id: this.evictedThroughTurnId,
      warnings: this.warnings.map((w) => ({ ...w })),
      knobs: {
        recency_window_turns: this.recencyWindowTurns,
        max_facts_per_entity: this.maxFactsPerEntity,
        max_entities_per_prompt: this.maxEntitiesPerPrompt,
      },
    };
  }

  /**
   * Rebuilds a store from its serialized form. The Context View is READ from the
   * save, never regenerated with current knob values (Core Rule #8, AC-21b);
   * knob changes therefore apply forward only (AC-21a).
   */
  static fromJSON(json: WorldMemoryJson, opts: WorldMemoryOptions = {}): WorldMemory {
    const wm = new WorldMemory(opts);
    wm.loadJson(json);
    return wm;
  }

  private loadJson(json: WorldMemoryJson): void {
    this.fullLog = (json.full_log ?? []).map((r) => JSON.parse(JSON.stringify(r)) as TurnRecord);
    this.fullLog.sort((a, b) => a.turn_id - b.turn_id);
    this.facts = new Map();
    for (const entityId of Object.keys(json.facts ?? {})) {
      this.facts.set(entityId, (json.facts[entityId] ?? []).map((f) => ({ ...f })));
    }
    this.processedTurns = new Map((json.processed_turns ?? []).map(([k, v]) => [k, { ...v }]));
    this.totalTurnsCounter = json.total_turns_counter ?? this.fullLog.length;
    this.lastConfirmedTurnId = json.last_confirmed_turn_id ?? 0;
    this.nextFactId = json.next_fact_id ?? 1;
    this.evictedThroughTurnId = json.evicted_through_turn_id ?? 0;
    this.warnings = (json.warnings ?? []).map((w) => ({ ...w }));
  }

  /**
   * Recovery path (gdd-04 A4 "Batch extraction on load"): build a store from a
   * bare list of turn records when a save carries no Context View. One pass over
   * every turn already outside the window, producing results identical to
   * sequential per-turn extraction (AC-20).
   */
  static fromTurnRecords(records: readonly TurnRecord[], opts: WorldMemoryOptions = {}): WorldMemory {
    const wm = new WorldMemory(opts);
    const ordered = [...records].sort((a, b) => a.turn_id - b.turn_id);
    for (const record of ordered) {
      wm.fullLog.push(record);
      wm.totalTurnsCounter += 1;
      if (record.turn_id > wm.lastConfirmedTurnId) wm.lastConfirmedTurnId = record.turn_id;
      wm.processedTurns.set(record.turn_id, { processed: false, fact_count: 0 });
    }
    const watermark = turnIdFallsOut(wm.lastConfirmedTurnId, wm.recencyWindowTurns);
    if (shouldExtract(watermark)) {
      wm.evictedThroughTurnId = watermark;
      for (const record of ordered) {
        if (record.turn_id <= watermark) wm.extractTurn(record);
      }
    }
    return wm;
  }

  // -------------------------------------------------------------------------
  // Narrowed surfaces
  // -------------------------------------------------------------------------

  /** Turn-Manager-only write handle (Core Rule #2). */
  asWriter(): WorldMemoryWriter {
    return {
      append: (record, lockedResult) => this.append(record, lockedResult),
      undoLast: () => this.undoLast(),
      undo: (turnId) => this.undo(turnId),
    };
  }

  /** Read handle for every other system. */
  asReadView(): WorldMemoryReadView {
    return {
      getTurn: (id) => this.getTurn(id),
      getTurnPage: (anchor, count, direction) => this.getTurnPage(anchor, count, direction),
      getProcessingState: (id) => this.getProcessingState(id),
      getFactsByEntity: (id) => this.getFactsByEntity(id),
      totalTurns: () => this.totalTurns(),
      referencedInWorldMemory: (id) => this.referencedInWorldMemory(id),
      selectedFacts: (id) => this.selectedFacts(id),
      recencyWindow: () => this.recencyWindow(),
      buildContext: (entities, opts) => this.buildContext(entities, opts),
    };
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  /** Compacts one turn into facts. Idempotent per `turn_id`. */
  private extractTurn(record: TurnRecord): { facts_added: number; warnings: SchemaWarning[] } {
    const result = extractFacts(
      {
        turn_id: record.turn_id,
        world_time: record.world_time,
        locked_result: record.locked_result,
      },
      this.nextFactId,
    );
    this.nextFactId = result.next_fact_id;
    for (const fact of result.facts) {
      const list = this.facts.get(fact.entity_id);
      if (list) list.push(fact);
      else this.facts.set(fact.entity_id, [fact]);
    }
    if (result.warnings.length > 0) this.warnings.push(...result.warnings);
    this.processedTurns.set(record.turn_id, { processed: true, fact_count: result.facts.length });
    return { facts_added: result.facts.length, warnings: result.warnings };
  }
}

// ---------------------------------------------------------------------------
// GDD-name aliases
// ---------------------------------------------------------------------------

/**
 * The GDD spells the public interface in snake_case (`get_turn_page`,
 * `total_turns`, ...) while this codebase uses camelCase for functions
 * (technical-preferences.md). These thin aliases let call sites and tests quote
 * the GDD verbatim without a second implementation.
 */
export function gddInterface(wm: WorldMemory) {
  return {
    get_turn: (id: number) => wm.getTurn(id),
    get_turn_page: (anchor: number, count: number, direction: PageDirection) =>
      wm.getTurnPage(anchor, count, direction),
    get_processing_state: (id: number) => wm.getProcessingState(id),
    get_facts_by_entity: (id: string) => wm.getFactsByEntity(id),
    total_turns: () => wm.totalTurns(),
    referenced_in_world_memory: (id: string) => wm.referencedInWorldMemory(id),
    selected_facts: (id: string) => wm.selectedFacts(id),
    build_context_view: (entities: readonly string[], opts?: BuildContextArgs) =>
      wm.buildContext(entities, opts),
  };
}
