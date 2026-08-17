/**
 * Character Customization Mode - the 3-zone / 3-save commit algorithm.
 *
 * Design docs: production/gdd-integration/gdd-06-ui-card-customization.md
 * (PART C: Core Rule #6a/#6a1/#6a2/#6b/#6c/#6d, #8, #11, C4 "Apply / validate /
 * rollback flow", C6, AC-17/18/19/29/33/34/39/40), plan.md P6 (reduced) and
 * decision C-13 (1-turn Undo exists, so #6b is live).
 *
 * THE ORDER IS THE SPEC. Every step below is load-bearing:
 *   1. read the drafts of THIS zone only; re-read `old_level` / current base
 *      stats / the existing id set at this instant
 *   2. run the zone validator
 *   3. on failure -> render the error inside THIS zone; other zones untouched;
 *      NO partial write; return (no lock is ever taken)
 *   4. on success -> lock all 3 Save buttons + all delete buttons + Undo;
 *      start the async write-through commit (the game's 3rd durable checkpoint)
 *   5. failed()    -> restore nothing (nothing was applied), show the error in
 *      this zone, unlock. STOP.
 *   6. committed() -> in ONE atomic step, in this order:
 *      a. apply values to in-memory state
 *      b. if a pending Undo snapshot exists -> invalidatePendingSnapshot()
 *      c. set `hack_mode_used_this_slot = true` (same write-through checkpoint,
 *         outside every snapshot)
 *      d. emit the `hack_write` log entry
 *      e. show "Đã ghi" (+ "Undo lượt trước đã khóa" when (b) fired)
 *      f. unlock, respecting `SUBMIT_DEBOUNCE_MS` per button
 *
 * There is no cross-zone "partial save": each Save press is its own atomic
 * transaction over its own zone, and the panel does NOT close after a submit.
 *
 * Pure module: no React, no I/O of its own - every side effect is injected.
 */

import { HACK_KNOBS } from '../registry';
import type { Clock } from '../types';
import type { ValidationIssue, ValidationResult } from './validators';

export type CustomizeZone = 'progress' | 'base_stats' | 'entries';
export const CUSTOMIZE_ZONES: readonly CustomizeZone[] = ['progress', 'base_stats', 'entries'];

export type HackWriteType =
  | 'progress'
  | 'base_stats'
  | 'create_item'
  | 'create_skill'
  | 'delete';

/**
 * gdd-06 C2 #6c: every write emits a mechanical-state-log entry tagged
 * `hack_write` so a hack write between two turn snapshots is never misread as
 * "the AI silently changed a mechanical result".
 */
export interface HackWriteLogEntry {
  tag: 'hack_write';
  zone: CustomizeZone;
  type: HackWriteType;
  /** Delete operations additionally record the entry identifiers. */
  entry_ids?: string[];
  world_time: number;
  /** Sequence inside the current `world_time` (gdd-06 C2 #6a2 record identity). */
  hack_seq: number;
  at: number;
}

/** What the injected persistence adapter receives. */
export interface HackCheckpointPayload {
  reason: 'hack_write';
  zone: CustomizeZone;
  type: HackWriteType;
  /** The zone's validated values. Opaque to this module. */
  values: unknown;
  world_time: number;
  hack_seq: number;
  /**
   * gdd-06 C2 #8: written in the SAME write-through checkpoint and living
   * OUTSIDE every capture_snapshot/restore_snapshot scope.
   */
  hack_mode_used_this_slot: true;
}

export interface CommitDeps {
  /** Step 2. Re-reads live state itself; this module never caches it. */
  validate: (request: CommitRequest) => ValidationResult;
  /** Step 6a. Runs only after the durable write reported success. */
  applyInMemory: (request: CommitRequest) => void;
  /** Steps 4-5. The 3rd durable checkpoint (write-through, atomic). */
  writeCheckpoint: (payload: HackCheckpointPayload) => Promise<{ ok: boolean; error?: string }>;
  /** Step 6b guard: AC-34 requires 0 calls when no snapshot is pending. */
  hasPendingSnapshot: () => boolean;
  invalidatePendingSnapshot: () => void;
  /** Step 6c, in-memory mirror of the flag persisted in the payload. */
  setHackModeUsed: () => void;
  /** Step 6d. */
  emitLog: (entry: HackWriteLogEntry) => void;
  /** Injected; defaults to a fixed 0 so tests stay deterministic. */
  clock?: Clock;
  /** Current `world_time`; hack writes never advance it (#6d). */
  worldTime?: () => number;
  /** Per-button debounce, gdd-06 C5. */
  submitDebounceMs?: number;
}

export interface CommitRequest {
  zone: CustomizeZone;
  type: HackWriteType;
  /** Validated payload the zone will write. */
  values: unknown;
  /** Delete operations only. */
  entry_ids?: string[];
}

export type CommitStatus = 'ok' | 'invalid' | 'write_failed' | 'locked' | 'debounced';

export interface CommitResult {
  ok: boolean;
  status: CommitStatus;
  zone: CustomizeZone;
  /** Player-facing text for THIS zone (Vietnamese). */
  message: string;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
  /** True when step 6b fired, i.e. the previous turn's Undo is now dead. */
  undo_locked: boolean;
  hack_seq: number | null;
}

const MESSAGE = {
  written: 'Đã ghi',
  undoLocked: 'Undo lượt trước đã khóa',
  inFlight: 'Đang ghi, vui lòng chờ.',
  debounced: 'Bấm quá nhanh — hãy chờ một nhịp.',
  writeFailed: 'Ghi thất bại. Không có thay đổi nào được áp dụng.',
  invalid: 'Dữ liệu chưa hợp lệ. Chưa ghi gì cả.',
} as const;

/**
 * Owns the in-flight lock shared by all 3 Save buttons, all delete buttons and
 * the Undo button, plus the per-button debounce stamps and the `hack_seq`
 * counter. One instance per open panel session (or per slot - it is cheap).
 */
export class CustomizeCommitController {
  private readonly deps: CommitDeps;
  private readonly clock: Clock;
  private readonly debounceMs: number;
  private _inFlight = false;
  private _lastPressAt: Partial<Record<CustomizeZone, number>> = {};
  private _hackSeq = 0;
  private _hackModeUsed = false;

  constructor(deps: CommitDeps) {
    this.deps = deps;
    this.clock = deps.clock ?? (() => 0);
    this.debounceMs = deps.submitDebounceMs ?? HACK_KNOBS.SUBMIT_DEBOUNCE_MS;
  }

  /** True while a durable write is in flight: everything mutating is dimmed. */
  get inFlight(): boolean {
    return this._inFlight;
  }

  /** gdd-06 C2 #6a1: there must exist NO window in which Undo is pressable. */
  undoPressable(baseAvailable: boolean): boolean {
    return baseAvailable === true && !this._inFlight;
  }

  /** Save/delete button state for any zone while a write is in flight. */
  buttonEnabled(_zone: CustomizeZone): boolean {
    return !this._inFlight;
  }

  get hackModeUsedThisSlot(): boolean {
    return this._hackModeUsed;
  }

  get hackSeq(): number {
    return this._hackSeq;
  }

  /** Test/teardown helper; never called from gameplay. */
  reset(): void {
    this._inFlight = false;
    this._lastPressAt = {};
    this._hackSeq = 0;
    this._hackModeUsed = false;
  }

  /**
   * One Save press = one atomic transaction over one zone.
   * Never throws: a rejected `writeCheckpoint` promise is reported as
   * `write_failed`, with nothing applied and nothing invalidated.
   */
  async commit(request: CommitRequest): Promise<CommitResult> {
    const zone = request.zone;

    if (this._inFlight) {
      return this.fail(zone, 'locked', MESSAGE.inFlight);
    }

    const now = this.clock();
    const lastPress = this._lastPressAt[zone];
    if (lastPress !== undefined && now - lastPress < this.debounceMs) {
      return this.fail(zone, 'debounced', MESSAGE.debounced);
    }

    // ------------------------------------------------------------ steps 1-3
    const validation = this.deps.validate(request);
    if (!validation.ok) {
      return {
        ok: false,
        status: 'invalid',
        zone,
        message: MESSAGE.invalid,
        errors: validation.errors,
        warnings: validation.warnings,
        undo_locked: false,
        hack_seq: null,
      };
    }

    // -------------------------------------------------------------- step 4
    this._inFlight = true;
    this._lastPressAt[zone] = now;
    const hackSeq = this._hackSeq + 1;
    const worldTime = this.deps.worldTime ? this.deps.worldTime() : 0;

    let outcome: { ok: boolean; error?: string };
    try {
      outcome = await this.deps.writeCheckpoint({
        reason: 'hack_write',
        zone,
        type: request.type,
        values: request.values,
        world_time: worldTime,
        hack_seq: hackSeq,
        hack_mode_used_this_slot: true,
      });
    } catch (error) {
      outcome = { ok: false, error: error instanceof Error ? error.message : String(error) };
    }

    // -------------------------------------------------------------- step 5
    if (!outcome || outcome.ok !== true) {
      this._inFlight = false;
      return {
        ok: false,
        status: 'write_failed',
        zone,
        message: MESSAGE.writeFailed + (outcome?.error ? ' (' + outcome.error + ')' : ''),
        errors: [
          {
            code: 'write_failed',
            message: outcome?.error ? String(outcome.error) : MESSAGE.writeFailed,
          },
        ],
        warnings: validation.warnings,
        undo_locked: false,
        hack_seq: null,
      };
    }

    // -------------------------------------------------------------- step 6
    this._hackSeq = hackSeq;
    this.deps.applyInMemory(request); // (a)

    let undoLocked = false;
    if (this.deps.hasPendingSnapshot()) {
      // (b) - AC-34: with no pending snapshot the method is NOT called at all.
      this.deps.invalidatePendingSnapshot();
      undoLocked = true;
    }

    this._hackModeUsed = true;
    this.deps.setHackModeUsed(); // (c)

    this.deps.emitLog({
      // (d)
      tag: 'hack_write',
      zone,
      type: request.type,
      ...(request.entry_ids ? { entry_ids: [...request.entry_ids] } : {}),
      world_time: worldTime,
      hack_seq: hackSeq,
      at: now,
    });

    this._inFlight = false; // (f)

    return {
      ok: true,
      status: 'ok',
      zone,
      message: undoLocked ? MESSAGE.written + ' · ' + MESSAGE.undoLocked : MESSAGE.written, // (e)
      errors: [],
      warnings: validation.warnings,
      undo_locked: undoLocked,
      hack_seq: hackSeq,
    };
  }

  private fail(zone: CustomizeZone, status: CommitStatus, message: string): CommitResult {
    return {
      ok: false,
      status,
      zone,
      message,
      errors: [{ code: status, message }],
      warnings: [],
      undo_locked: false,
      hack_seq: null,
    };
  }
}

export function createCommitController(deps: CommitDeps): CustomizeCommitController {
  return new CustomizeCommitController(deps);
}

/** Vietnamese copy, exported so the React layer never re-literals it. */
export const COMMIT_MESSAGES = MESSAGE;
