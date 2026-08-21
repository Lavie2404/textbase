/**
 * Turn Manager - the single clock of the game.
 *
 * Design docs:
 * - production/gdd-integration/gdd-01-turn-contract-ai.md section A (A.2 core
 *   rules, A.3 data model, A.4 formulas F1/F2/F3 + pseudocode, A.6 edge cases,
 *   A.8 acceptance checklist AC-01..AC-18)
 * - production/gdd-integration/plan.md decisions C-9 (calls_per_turn counts
 *   critical-path calls only), C-10 (AbortController budget), C-13 (build Undo)
 *
 * SCOPE
 * This module owns the phase order, the AI call budget, `world_time` and the
 * undo window. It owns NO gameplay math: every mechanical value arrives through
 * the injected `resolveMechanics` callback as an opaque `LockedResult`.
 *
 * PHASE ORDER (gdd-01 A.2 CR#4, spy-asserted by AC-04)
 *   capture snapshot -> lock -> narrate -> World Memory append -> checkpoint
 *   -> (durability_confirmed === true) -> commit
 * A returned write promise is NOT the gate; `durability_confirmed` is.
 *
 * PURITY
 * No React, no fetch, no timers, no globals. Clock, AI, memory and persistence
 * are all injected (`TurnDeps`).
 */

import { CALLS_PER_TURN_MAX, PERSISTENCE_KNOBS, TURN_KNOBS } from '../registry';
import type { Clock, LockedResult, Suggestion, TurnRecord } from '../types';
import { SnapshotRegistry } from './snapshotRegistry';

// ---------------------------------------------------------------------------
// State machine
// ---------------------------------------------------------------------------

/**
 * gdd-01 A.3 names four states; this implementation splits `resolving` into the
 * three observable phases the acceptance criteria assert on (`resolving` =
 * locking, `narrating` = AI in flight, `committing` = memory + durability) and
 * adds an explicit `failed` rest state so a resubmit is distinguishable from a
 * fresh action. `idle` is the pre-boot / post-death-handoff state.
 */
export type TmState =
  | 'idle'
  | 'awaiting_action'
  | 'resolving'
  | 'narrating'
  | 'committing'
  | 'turn_confirmed'
  | 'undoing'
  | 'failed';

/**
 * Explicit transition table (coding-standards.md: "State machines must have
 * explicit transition tables"). Anything not listed is unreachable by design.
 */
export const TM_TRANSITIONS: Record<TmState, readonly TmState[]> = {
  idle: ['awaiting_action'],
  awaiting_action: ['resolving'],
  resolving: ['narrating', 'committing', 'failed'],
  narrating: ['committing', 'failed'],
  committing: ['turn_confirmed', 'failed'],
  turn_confirmed: ['resolving', 'undoing', 'idle'],
  undoing: ['awaiting_action', 'turn_confirmed'],
  failed: ['resolving', 'awaiting_action'],
};

/** States in which a new action may be submitted (`input_locked === false`). */
export const ACCEPTING_STATES: readonly TmState[] = ['awaiting_action', 'turn_confirmed', 'failed'];

export function transitionAllowed(from: TmState, to: TmState): boolean {
  return TM_TRANSITIONS[from].includes(to);
}

// ---------------------------------------------------------------------------
// AI call budget (F2) - a THREE-BOOLEAN TYPE SET, never a counter
// ---------------------------------------------------------------------------

export type TurnCallType = 'suggestion_call' | 'suggestion_retry_call' | 'narration_call';

export interface CallTypeSet {
  suggestion_call: boolean;
  suggestion_retry_call: boolean;
  narration_call: boolean;
}

export function emptyCallTypeSet(): CallTypeSet {
  return { suggestion_call: false, suggestion_retry_call: false, narration_call: false };
}

/**
 * F2: `calls_per_turn = Number(suggestion_call) + Number(suggestion_retry_call)
 * + Number(narration_call)`, range {0,1,2,3}. Because these are type booleans,
 * a resubmitted `narration_call` after a Failed adds nothing (AC-13/AC-15).
 * Background calls (plan.md C-9: API-3 monitor, summariser, creation drains) are
 * never routed through here and therefore never counted.
 */
export function callsPerTurn(set: CallTypeSet): number {
  return (
    Number(set.suggestion_call) + Number(set.suggestion_retry_call) + Number(set.narration_call)
  );
}

// ---------------------------------------------------------------------------
// F3 - undo availability
// ---------------------------------------------------------------------------

export interface UndoConjuncts {
  /** `turn_id === last_confirmed_turn_id` */
  is_newest_turn: boolean;
  no_newer_turn_confirmed: boolean;
  has_confirmed_turn: boolean;
  /** Negated in the formula: `!is_death_turn`. */
  is_death_turn: boolean;
  pending_snapshot_valid: boolean;
}

/**
 * F3, verbatim:
 * `undo_available = turn_id === last_confirmed_turn_id && no_newer_turn_confirmed
 *  && has_confirmed_turn && !is_death_turn && pending_snapshot_valid`
 */
export function computeUndoAvailable(c: UndoConjuncts): boolean {
  return (
    c.is_newest_turn &&
    c.no_newer_turn_confirmed &&
    c.has_confirmed_turn &&
    !c.is_death_turn &&
    c.pending_snapshot_valid
  );
}

// ---------------------------------------------------------------------------
// Suggestions
// ---------------------------------------------------------------------------

/** gdd-01 A.3 fallback set, padded to exactly `suggested_action_count`. */
export const FALLBACK_SUGGESTIONS: readonly Suggestion[] = [
  { text: 'Quan sát xung quanh', envelope: 'observe', source: 'fallback' },
  { text: 'Chờ đợi', envelope: 'wait', source: 'fallback' },
  { text: 'Rời đi', envelope: 'leave', source: 'fallback' },
  { text: 'Trầm ngâm suy nghĩ', envelope: null, source: 'fallback' },
];

/** Unique by `text`, then padded with fallbacks. Never returns fewer than 4 (AC-16). */
export function padSuggestions(
  input: readonly Suggestion[] | null | undefined,
  count: number = TURN_KNOBS.suggested_action_count,
): Suggestion[] {
  const seen = new Set<string>();
  const out: Suggestion[] = [];
  for (const s of input ?? []) {
    const key = (s && s.text ? s.text : '').trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ text: key, envelope: s.envelope ?? null, source: s.source ?? 'ai' });
    if (out.length === count) return out;
  }
  for (const f of FALLBACK_SUGGESTIONS) {
    if (out.length === count) break;
    if (seen.has(f.text)) continue;
    seen.add(f.text);
    out.push({ ...f });
  }
  // Degenerate configuration (count > available unique fallbacks): synthesise.
  let n = 1;
  while (out.length < count) {
    const text = 'Chờ đợi (' + n++ + ')';
    if (seen.has(text)) continue;
    seen.add(text);
    out.push({ text, envelope: 'wait', source: 'fallback' });
  }
  return out;
}

/** gdd-01 A.2 CR#10: Death & Consequence overwrites exactly 2 of the 4 slots. */
export function overrideTwoSlots(
  base: readonly Suggestion[],
  forced: readonly Suggestion[],
): Suggestion[] {
  const out = base.slice();
  const two = forced.slice(0, 2).map((s) => ({ ...s, source: 'pending_fate' as const }));
  for (let i = 0; i < two.length; i++) out[i] = two[i];
  return out;
}

// ---------------------------------------------------------------------------
// Injected dependencies
// ---------------------------------------------------------------------------

export interface TurnInput {
  text: string;
  envelope?: string | null;
  source?: 'suggestion' | 'free_text';
}

export interface NarrationContext {
  turn_id: number;
  world_time: number;
  action: TurnInput;
  /** True when this narration re-uses a pending locked result (AC-13b(c)). */
  is_resubmit: boolean;
}

export type NarrationOutcome =
  | { ok: true; text: string; suggestions?: Suggestion[] }
  | { ok: false; label: string; detail?: string };

export interface CheckpointContext {
  reason: 'turn_confirm' | 'post_undo';
  turn_id: number;
  world_time: number;
  record: TurnRecord | null;
  /** Number of consecutive write retries already attempted for this payload. */
  retry_index: number;
}

export interface CheckpointOutcome {
  durability_confirmed: boolean;
  error_code?: string;
}

export interface TurnLogEntry {
  kind: 'failure' | 'phase' | 'commit' | 'undo';
  label: string;
  turn_id: number;
  detail?: string;
  at: number;
}

/**
 * Everything Turn Manager needs from the outside world. All callbacks, so the
 * state machine is unit-testable without React, fetch or IndexedDB.
 */
export interface TurnDeps {
  /** Runs every deterministic system and returns the immutable locked result. */
  resolveMechanics(input: TurnInput, ctx: { turn_id: number; world_time: number }): LockedResult;
  /** The single AI narration call (goes through `ai/requestAi.ts` in P4b). */
  narrate(locked: LockedResult, ctx: NarrationContext): Promise<NarrationOutcome>;
  /** World Memory append (`worldMemory.asWriter().append`). */
  appendMemory(record: TurnRecord): void;
  /** Hard-delete of a record whose turn never confirmed. */
  removeMemory?(turnId: number): void;
  /** Tombstone (`undone = true`) used by Undo (`worldMemory.undoLast`). */
  markMemoryUndone?(turnId: number): void;
  /** Restores a tombstoned record when a post-undo write fails. */
  restoreMemoryUndone?(turnId: number): void;
  /** Persistence durability gate (`persistence/saveCheckpoint.ts`). */
  checkpoint(ctx: CheckpointContext): Promise<CheckpointOutcome>;
  onCommit?(record: TurnRecord): void;
  onUndo?(turnId: number): void;
  /** Fresh suggestion set after an undo (never reuse the old one, CR#5). */
  regenerateSuggestions?(): Promise<Suggestion[]>;
  /** Death handoff to Character Continuation (gdd-01 A.2 CR#11). */
  onDeathHandoff?(record: TurnRecord): void;
  clock: Clock;
  log?(entry: TurnLogEntry): void;
  slotId?: string;
}

// ---------------------------------------------------------------------------
// Results
// ---------------------------------------------------------------------------

export type SubmitFailureStage = 'gate' | 'lock' | 'narration' | 'persistence';

export type SubmitResult =
  | {
      ok: true;
      record: TurnRecord;
      world_time: number;
      undo_available: boolean;
      calls_per_turn: number;
    }
  | { ok: false; stage: SubmitFailureStage; label: string; detail?: string };

export type UndoResult =
  | { ok: true; turn_id: number; world_time: number }
  | {
      ok: false;
      label: 'not_available' | 'busy' | 'death_turn' | 'persistence_failed';
      detail?: string;
    };

export interface TurnManagerOptions {
  registry?: SnapshotRegistry;
  deps?: TurnDeps;
  slotId?: string;
  /** `world_time` of a loaded save; derived counting resumes from here. */
  initialWorldTime?: number;
  /** `turn_id` of a loaded save (AC-15 reload at Turn Confirmed). */
  initialTurnId?: number;
  suggestedActionCount?: number;
  maxWriteRetry?: number;
}

/** The persisted subset. Volatile fields (pending locked result) are excluded (AC-14). */
export interface TurnManagerPersistedState {
  world_time: number;
  turn_id: number;
  last_confirmed_turn_id: number | null;
  has_confirmed_turn: boolean;
  death_turn_ids: number[];
  state: 'awaiting_action' | 'turn_confirmed';
}

interface ConfirmedTurn {
  turn_id: number;
  undone: boolean;
  is_death_turn: boolean;
}

// ---------------------------------------------------------------------------

export class TurnManager {
  readonly registry: SnapshotRegistry;
  private readonly defaultDeps?: TurnDeps;
  private readonly slotId: string;
  private readonly suggestedActionCount: number;
  private readonly maxWriteRetry: number;

  private _state: TmState = 'idle';
  private _input_locked = false;
  private _turn_id: number;
  private _world_time_base: number;
  private _confirmed: ConfirmedTurn[] = [];
  private _last_confirmed_turn_id: number | null = null;
  private _no_newer_turn_confirmed = true;
  private _death_turn_ids = new Set<number>();
  private _is_death_turn = false;

  private _calls: CallTypeSet = emptyCallTypeSet();
  private _suggestions: Suggestion[] = [];

  // Volatile, in-memory only - never persisted (gdd-01 A.3).
  private _pending_locked_result: LockedResult | null = null;
  private _pending_locked_action: string | null = null;
  private _pending_narration_text: string | null = null;
  private _pending_write_record: TurnRecord | null = null;
  private _write_retry_index = 0;

  constructor(opts: TurnManagerOptions = {}) {
    this.registry = opts.registry ?? new SnapshotRegistry();
    this.defaultDeps = opts.deps;
    this.slotId = opts.slotId ?? 'slot_default';
    this.suggestedActionCount = opts.suggestedActionCount ?? TURN_KNOBS.suggested_action_count;
    this.maxWriteRetry = opts.maxWriteRetry ?? PERSISTENCE_KNOBS.max_write_retry_before_escalation;
    this._world_time_base = opts.initialWorldTime ?? 0;
    this._turn_id = opts.initialTurnId ?? 0;
  }

  // -- observable state ------------------------------------------------------

  get state(): TmState {
    return this._state;
  }

  get input_locked(): boolean {
    return this._input_locked;
  }

  /**
   * F1. DERIVED, never decremented: `world_time` is the base plus the number of
   * confirmed turns that are not undone. gdd-01 A.9 flags `world_time -= 1` as
   * implied-but-never-written and recommends exactly this derivation, which
   * makes the AC-08 chain (10 -> 11 -> undo -> 10 -> re-confirm -> 11) fall out
   * of the data instead of relying on paired increment/decrement code.
   */
  get world_time(): number {
    return this._world_time_base + this._confirmed.reduce((n, t) => n + (t.undone ? 0 : 1), 0);
  }

  get turn_id(): number {
    return this._turn_id;
  }

  get last_confirmed_turn_id(): number | null {
    return this._last_confirmed_turn_id;
  }

  /** "true iff at least one non-undone confirmed turn exists" (gdd-01 A.9). */
  get has_confirmed_turn(): boolean {
    return this._confirmed.some((t) => !t.undone);
  }

  get no_newer_turn_confirmed(): boolean {
    return this._no_newer_turn_confirmed;
  }

  get is_death_turn(): boolean {
    return this._is_death_turn;
  }

  get pending_snapshot_valid(): boolean {
    return this.registry.pendingSnapshotValid;
  }

  get calls(): CallTypeSet {
    return { ...this._calls };
  }

  get calls_per_turn(): number {
    return callsPerTurn(this._calls);
  }

  get suggestions(): Suggestion[] {
    return this._suggestions.slice();
  }

  /** Volatile pending lock, exposed read-only for AC-13b assertions. */
  get pending_locked_result(): LockedResult | null {
    return this._pending_locked_result;
  }

  get pending_locked_action(): string | null {
    return this._pending_locked_action;
  }

  undoConjuncts(): UndoConjuncts {
    return {
      is_newest_turn:
        this._last_confirmed_turn_id !== null && this._turn_id === this._last_confirmed_turn_id,
      no_newer_turn_confirmed: this._no_newer_turn_confirmed,
      has_confirmed_turn: this.has_confirmed_turn,
      is_death_turn:
        this._last_confirmed_turn_id !== null && this._death_turn_ids.has(this._last_confirmed_turn_id),
      pending_snapshot_valid: this.registry.pendingSnapshotValid,
    };
  }

  get undo_available(): boolean {
    return computeUndoAvailable(this.undoConjuncts());
  }

  // -- lifecycle helpers -----------------------------------------------------

  /** Moves `idle -> awaiting_action` once the slot is open and suggestions exist. */
  begin(suggestions?: readonly Suggestion[]): void {
    if (this._state === 'idle') this.transitionTo('awaiting_action');
    this._suggestions = padSuggestions(suggestions ?? this._suggestions, this.suggestedActionCount);
  }

  /** gdd-01 F3: sole legitimate caller is Character Customization Mode. */
  invalidatePendingSnapshot(): void {
    this.registry.invalidatePendingSnapshot();
  }

  /**
   * Records that a suggestion-generating AI call happened this turn. Exposed so
   * P4b can flag calls it makes outside `submitAction` while still respecting
   * the single budget (F2). Returns the new `calls_per_turn`.
   */
  markCall(type: TurnCallType): number {
    this._calls[type] = true;
    const n = this.calls_per_turn;
    /* Structurally unreachable: three booleans cap at three. Kept as a tripwire. */
    if (n > CALLS_PER_TURN_MAX) throw new Error('calls_per_turn invariant violated: ' + n);
    return n;
  }

  // -- manual mode (P4b) -----------------------------------------------------
  //
  // `submitAction()` owns the whole turn. App.tsx cannot hand it the whole turn:
  // its mechanical results are produced INSIDE the reducer that runs after the
  // narration call, not before it (plan.md risk R1 - rewriting that pipeline was
  // judged too high a regression risk for P4b). These three methods expose the
  // same bookkeeping - turn id, call budget, snapshot capture/validity, death
  // turn set, `world_time` derivation, undo availability - so a host that drives
  // its own pipeline still gets a correct `undo_available` and a correct
  // `world_time`. The phase ORDER remains the caller's responsibility.

  /**
   * Starts a manually driven turn: bumps `turn_id`, resets the call budget and
   * captures the pre-turn snapshot. Returns `null` when the machine is busy
   * (the caller must then reject the input, exactly like a BUSY submit).
   */
  beginManualTurn(): { turn_id: number; world_time: number } | null {
    if (this._input_locked || !ACCEPTING_STATES.includes(this._state)) return null;
    this._turn_id += 1;
    this._calls = emptyCallTypeSet();
    this._is_death_turn = false;
    this._write_retry_index = 0;
    this._input_locked = true;
    this.transitionTo('resolving');
    // Phase 1 - snapshot BEFORE anything mutates (ADR-0004).
    this.registry.captureAll();
    return { turn_id: this._turn_id, world_time: this.world_time };
  }

  /**
   * Ends a manually driven turn. `durability_confirmed` is THE gate (gdd-05 R1):
   * false leaves the machine in `failed` with the snapshot invalidated, so Undo
   * cannot offer to roll back a turn that was never stored.
   */
  commitManualTurn(
    durabilityConfirmed: boolean,
    opts: { is_death_turn?: boolean; suggestions?: readonly Suggestion[] } = {},
  ): boolean {
    if (this._state === 'resolving' || this._state === 'narrating') this.transitionTo('committing');
    if (this._state !== 'committing') return false;

    if (opts.is_death_turn) {
      // gdd-01 CR#9: a death turn is hard-locked out of Undo, permanently.
      this._is_death_turn = true;
      this._death_turn_ids.add(this._turn_id);
    }

    if (!durabilityConfirmed) {
      this.registry.invalidatePendingSnapshot();
      this._input_locked = false;
      this.transitionTo('failed');
      return false;
    }

    this._confirmed.push({
      turn_id: this._turn_id,
      undone: false,
      is_death_turn: this._is_death_turn,
    });
    this._last_confirmed_turn_id = this._turn_id;
    this._no_newer_turn_confirmed = true;
    this.registry.markValid();
    this._input_locked = false;
    this.transitionTo('turn_confirmed');
    this._suggestions = this._is_death_turn
      ? []
      : padSuggestions(opts.suggestions, this.suggestedActionCount);
    if (this._is_death_turn) this.transitionTo('idle');
    return true;
  }

  /**
   * Abandons a manually driven turn (AI error, user cancellation). The snapshot
   * is invalidated rather than restored: the host owns its own rollback policy,
   * and offering Undo for a turn that never confirmed would be a lie.
   */
  failManualTurn(): void {
    if (
      this._state === 'resolving' ||
      this._state === 'narrating' ||
      this._state === 'committing'
    ) {
      this.transitionTo('failed');
    }
    this.registry.invalidatePendingSnapshot();
    this._input_locked = false;
  }
  /** AC-14/AC-15: only this subset survives a reload. */
  toPersistable(): TurnManagerPersistedState {
    return {
      world_time: this.world_time,
      turn_id: this._turn_id,
      last_confirmed_turn_id: this._last_confirmed_turn_id,
      has_confirmed_turn: this.has_confirmed_turn,
      death_turn_ids: [...this._death_turn_ids],
      state: this._state === 'turn_confirmed' ? 'turn_confirmed' : 'awaiting_action',
    };
  }

  /**
   * Rehydrates after a reload. A reload mid-Resolving lands in
   * `awaiting_action` with no dangling `locked_result` because the volatile
   * fields simply do not exist in `TurnManagerPersistedState` (AC-14).
   */
  hydrate(s: TurnManagerPersistedState): void {
    this._world_time_base = s.world_time;
    this._confirmed = [];
    this._turn_id = s.turn_id;
    this._last_confirmed_turn_id = s.last_confirmed_turn_id;
    this._no_newer_turn_confirmed = true;
    this._death_turn_ids = new Set(s.death_turn_ids ?? []);
    this._is_death_turn =
      s.last_confirmed_turn_id !== null && this._death_turn_ids.has(s.last_confirmed_turn_id);
    // `has_confirmed_turn` is derived; synthesise one settled entry so the
    // derivation and F1 keep agreeing after a reload.
    if (s.has_confirmed_turn && s.last_confirmed_turn_id !== null) {
      this._world_time_base = s.world_time - 1;
      this._confirmed = [
        { turn_id: s.last_confirmed_turn_id, undone: false, is_death_turn: this._is_death_turn },
      ];
    }
    this._state = s.state;
    this._input_locked = false;
    this._calls = emptyCallTypeSet();
    this._pending_locked_result = null;
    this._pending_locked_action = null;
    this._pending_narration_text = null;
    this._pending_write_record = null;
  }

  /**
   * Alias of `hydrate` under the name the load path uses. App calls
   * `tm.rehydrate(bundle.turn_manager)` right after a slot load, symmetrically
   * with `tm.toPersistable()` on the save path; `hydrate` stays for the existing
   * callers. Same contract: volatile fields (a pending locked result, the
   * snapshot array) are NOT restored, so a reload mid-Resolving lands in
   * `awaiting_action` with nothing dangling (AC-14).
   */
  rehydrate(s: TurnManagerPersistedState): void {
    this.hydrate(s);
  }

  // -- the pipeline ----------------------------------------------------------

  /**
   * gdd-01 A.4 `submitAction`. Returns a result object; it never throws for a
   * runtime failure, so callers cannot accidentally treat "AI down" as a crash.
   *
   * BUSY: a submit while a call is in flight is REJECTED, never queued
   * (gdd-01 C.6 "two concurrent calls"), and logged under its own label.
   */
  async submitAction(input: string | TurnInput, depsArg?: TurnDeps): Promise<SubmitResult> {
    const deps = depsArg ?? this.defaultDeps;
    if (!deps) throw new Error('TurnManager.submitAction requires TurnDeps');

    const action: TurnInput =
      typeof input === 'string' ? { text: input, source: 'free_text' } : input;

    if (this._input_locked || !ACCEPTING_STATES.includes(this._state)) {
      this.log(deps, { kind: 'failure', label: 'BUSY', turn_id: this._turn_id, at: deps.clock() });
      return { ok: false, stage: 'gate', label: 'BUSY', detail: 'state=' + this._state };
    }

    // A turn that already confirmed starts a NEW turn id and a NEW budget.
    // A resubmit after a failure keeps both: no turn_id is burned and the
    // narration_call boolean is already true, so calls_per_turn cannot grow
    // (F2 / AC-13 / AC-15).
    const isResubmit = this._state === 'failed';
    if (!isResubmit) {
      this._turn_id += 1;
      this._calls = emptyCallTypeSet();
      this._is_death_turn = false;
      this._write_retry_index = 0;
    }

    this._input_locked = true;
    this.transitionTo('resolving');

    // Phase 1 - snapshot BEFORE anything mutates (ADR-0004).
    this.registry.captureAll();

    // Phase 2 - lock (or reuse a pending lock).
    const sameAction =
      this._pending_locked_action !== null && this._pending_locked_action === action.text;
    let locked: LockedResult;
    if (this._pending_locked_result && sameAction) {
      // Byte-for-byte reuse; resolveMechanics (and therefore the RNG) is NOT
      // called again - this is what blocks the "pull the cable when losing"
      // exploit (AC-13b(c)).
      locked = this._pending_locked_result;
    } else {
      // A different action cancels the pending lock (AC-13b(b)).
      this._pending_locked_result = null;
      this._pending_locked_action = null;
      this._pending_narration_text = null;
      this._pending_write_record = null;
      try {
        locked = deps.resolveMechanics(action, {
          turn_id: this._turn_id,
          world_time: this.world_time,
        });
      } catch (err) {
        this.registry.restoreAll();
        this.registry.invalidatePendingSnapshot();
        this._input_locked = false;
        this.transitionTo('failed');
        const detail = err instanceof Error ? err.message : String(err);
        this.log(deps, {
          kind: 'failure',
          label: 'lock_failed',
          turn_id: this._turn_id,
          detail,
          at: deps.clock(),
        });
        return { ok: false, stage: 'lock', label: 'lock_failed', detail };
      }
    }

    // gdd-01 CR#9: a death turn is hard-locked out of Undo the moment the
    // result is locked - BEFORE narration, not after.
    if (locked.is_death_turn) {
      this._is_death_turn = true;
      this._death_turn_ids.add(this._turn_id);
    }

    // Phase 3 - narration. Skipped on a write-only retry: quota errors do not
    // heal between attempts and re-narrating would burn a real AI call
    // (gdd-01 A.4 "Write-only retry").
    let narrationText: string;
    let narratedSuggestions: Suggestion[] | undefined;
    const writeOnlyRetry =
      sameAction && this._pending_write_record !== null && this._pending_narration_text !== null;

    if (writeOnlyRetry) {
      narrationText = this._pending_narration_text as string;
      this.transitionTo('committing');
    } else {
      this.transitionTo('narrating');
      this.markCall('narration_call');
      const r = await deps.narrate(locked, {
        turn_id: this._turn_id,
        world_time: this.world_time,
        action,
        is_resubmit: sameAction,
      });
      if (!r.ok) {
        // `strict` is off in tsconfig.json, which disables boolean-literal
        // discriminant narrowing; the cast restores the union's failure half.
        const rf = r as { ok: false; label: string; detail?: string };
        // Hold the locked result, roll the optimistic apply back, stay unconfirmed.
        this._pending_locked_result = locked;
        this._pending_locked_action = action.text;
        this._pending_narration_text = null;
        this.registry.restoreAll();
        this.registry.invalidatePendingSnapshot();
        this._input_locked = false;
        this.transitionTo('failed');
        // BUSY keeps its own label: it can only be a caller bug (AC-13c).
        const label = rf.label === 'BUSY' ? 'caller_bug_busy' : rf.label;
        this.log(deps, {
          kind: 'failure',
          label,
          turn_id: this._turn_id,
          detail: rf.detail,
          at: deps.clock(),
        });
        return { ok: false, stage: 'narration', label, detail: rf.detail };
      }
      const rs = r as { text: string; suggestions?: Suggestion[] };
      narrationText = rs.text;
      narratedSuggestions = rs.suggestions;
      this.transitionTo('committing');
    }

    // Phase 4 - World Memory append.
    const record: TurnRecord = this._pending_write_record ?? {
      slot_id: deps.slotId ?? this.slotId,
      world_time: this.world_time + 1,
      hack_seq: 0,
      turn_id: this._turn_id,
      action_text: action.text,
      locked_result: locked,
      narration_text: narrationText,
      suggestions: [],
      schema_version: PERSISTENCE_KNOBS.schema_version,
      created_at: deps.clock(),
    };
    if (!writeOnlyRetry) deps.appendMemory(record);

    // Phase 5 - persistence. `durability_confirmed` is THE gate.
    const w = await deps.checkpoint({
      reason: 'turn_confirm',
      turn_id: this._turn_id,
      world_time: record.world_time,
      record,
      retry_index: this._write_retry_index,
    });
    if (!w.durability_confirmed) {
      deps.removeMemory?.(record.turn_id);
      this.registry.restoreAll();
      this.registry.invalidatePendingSnapshot();
      this._pending_locked_result = locked;
      this._pending_locked_action = action.text;
      this._pending_narration_text = narrationText;
      this._pending_write_record = record;
      this._write_retry_index += 1;
      this._input_locked = false;
      this.transitionTo('failed');
      const escalate = this._write_retry_index >= this.maxWriteRetry;
      const label = w.error_code ?? 'WRITE_FAILED';
      this.log(deps, {
        kind: 'failure',
        label: escalate ? label + '_ESCALATED' : label,
        turn_id: this._turn_id,
        at: deps.clock(),
      });
      return {
        ok: false,
        stage: 'persistence',
        label,
        detail: escalate ? 'escalate' : undefined,
      };
    }

    // Phase 6 - commit.
    this._confirmed.push({
      turn_id: this._turn_id,
      undone: false,
      is_death_turn: this._is_death_turn,
    });
    this._last_confirmed_turn_id = this._turn_id;
    this._no_newer_turn_confirmed = true;
    this.registry.markValid();
    this._pending_locked_result = null;
    this._pending_locked_action = null;
    this._pending_narration_text = null;
    this._pending_write_record = null;
    this._write_retry_index = 0;
    this._input_locked = false;
    this.transitionTo('turn_confirmed');

    this._suggestions = this._is_death_turn
      ? []
      : padSuggestions(narratedSuggestions, this.suggestedActionCount);
    record.suggestions = this._suggestions.slice();

    deps.onCommit?.(record);
    this.log(deps, {
      kind: 'commit',
      label: 'turn_confirmed',
      turn_id: this._turn_id,
      at: deps.clock(),
    });

    if (this._is_death_turn) {
      // gdd-01 CR#11: no next-turn suggestions; control hands off.
      deps.onDeathHandoff?.(record);
      this.transitionTo('idle');
    }

    return {
      ok: true,
      record,
      world_time: this.world_time,
      undo_available: this.undo_available,
      calls_per_turn: this.calls_per_turn,
    };
  }

  /**
   * gdd-01 A.4 `undo()`. Reverts mechanical state AND the memory record, then
   * asks for a fresh suggestion set (never reuse the undone one, CR#5).
   */
  async undo(depsArg?: TurnDeps): Promise<UndoResult> {
    const deps = depsArg ?? this.defaultDeps;
    if (!deps) throw new Error('TurnManager.undo requires TurnDeps');

    // The death check runs FIRST so a death turn reports its own label even
    // after the handoff moved the machine out of `turn_confirmed` (AC-11).
    const target = this._last_confirmed_turn_id;
    if (target !== null && this._death_turn_ids.has(target)) {
      // AC-11: rejected even when called directly / from a debug path.
      this.log(deps, {
        kind: 'undo',
        label: 'rejected_death_turn',
        turn_id: target,
        at: deps.clock(),
      });
      return { ok: false, label: 'death_turn' };
    }
    if (this._input_locked || this._state !== 'turn_confirmed') {
      return { ok: false, label: 'busy', detail: 'state=' + this._state };
    }
    if (!this.undo_available || target === null) {
      return { ok: false, label: 'not_available' };
    }

    this._input_locked = true;
    this.transitionTo('undoing');

    // Keep a pre-undo copy so a failed post-undo write can be rolled forward.
    const preUndo = this.registry.captureDetached();
    this.registry.restoreAll();
    if (deps.markMemoryUndone) deps.markMemoryUndone(target);
    else deps.removeMemory?.(target);

    const entry = this._confirmed.find((t) => t.turn_id === target);
    const w = await deps.checkpoint({
      reason: 'post_undo',
      turn_id: target,
      world_time: this.world_time - 1,
      record: null,
      retry_index: 0,
    });
    if (!w.durability_confirmed) {
      // "The undo is treated as not having happened": Turn Confirmed persists
      // and Undo stays available for a retry (gdd-01 A.6).
      this.registry.restoreFrom(preUndo);
      deps.restoreMemoryUndone?.(target);
      this._input_locked = false;
      this.transitionTo('turn_confirmed');
      this.log(deps, {
        kind: 'undo',
        label: w.error_code ?? 'WRITE_FAILED',
        turn_id: target,
        at: deps.clock(),
      });
      return { ok: false, label: 'persistence_failed', detail: w.error_code };
    }

    if (entry) entry.undone = true;
    this._last_confirmed_turn_id = this.newestNonUndoneTurnId();
    this._no_newer_turn_confirmed = true;
    this._is_death_turn = false;
    this.registry.invalidatePendingSnapshot();
    // Undo is a retry, not a guarantee: the next submit of the same action must
    // recompute, so nothing pending may survive (AC-12).
    this._pending_locked_result = null;
    this._pending_locked_action = null;
    this._pending_narration_text = null;
    this._pending_write_record = null;
    this._calls = emptyCallTypeSet();
    this._input_locked = false;
    this.transitionTo('awaiting_action');

    deps.onUndo?.(target);
    this.log(deps, { kind: 'undo', label: 'undone', turn_id: target, at: deps.clock() });

    if (deps.regenerateSuggestions) {
      const fresh = await deps.regenerateSuggestions();
      this._suggestions = padSuggestions(fresh, this.suggestedActionCount);
    } else {
      this._suggestions = padSuggestions([], this.suggestedActionCount);
    }
    return { ok: true, turn_id: target, world_time: this.world_time };
  }

  // -- internals -------------------------------------------------------------

  private newestNonUndoneTurnId(): number | null {
    let best: number | null = null;
    for (const t of this._confirmed) {
      if (!t.undone && (best === null || t.turn_id > best)) best = t.turn_id;
    }
    return best;
  }

  private transitionTo(next: TmState): void {
    if (!transitionAllowed(this._state, next)) {
      throw new Error('illegal turn state transition ' + this._state + ' -> ' + next);
    }
    this._state = next;
  }

  private log(deps: TurnDeps, entry: TurnLogEntry): void {
    deps.log?.(entry);
  }
}

export function createTurnManager(opts: TurnManagerOptions = {}): TurnManager {
  return new TurnManager(opts);
}
