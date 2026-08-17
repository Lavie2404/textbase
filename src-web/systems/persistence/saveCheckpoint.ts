/**
 * Persistence - the save path (gdd-05 B4 `save_checkpoint`, Formula #2).
 *
 * stage -> completeness gate -> commit -> `durability_confirmed`. The Turn
 * Manager transition is allowed ONLY once `durability_confirmed` is true
 * (gdd-05 R1/R3); a failed write blocks the transition and revokes nothing (R4).
 *
 * P3 REDUCED VARIANT (plan.md D, "P3 rút gọn: bỏ append-only, giữ full-state
 * ghi"): each checkpoint writes the FULL bundle under
 * `ckpt:<slot>:<world_time>` plus an OPTIONAL append-only turn record under
 * `turn:<slot>:<world_time>:<hack_seq>`, both inside ONE transaction. What this
 * keeps: atomicity, the durability gate, Formula #2 completeness, the
 * `[slot_id, world_time, hack_seq]` key shape, and load-time replay. What it
 * drops: the O(1)-per-turn payload invariant (gdd-05 AC-34) and the periodic
 * 50-turn merge flush - a full-state write is O(state) every turn, exactly as
 * the shipped App.tsx autosave already behaves. `pruneCheckpoints` bounds the
 * checkpoint count so storage growth stays linear in turns, not quadratic.
 *
 * Design docs: gdd-05 B2 (R1..R4, R10), B4 (save path + Formula #2), B5, B8
 * (AC-01, AC-03, AC-04, AC-12..AC-14, AC-29, AC-36..AC-38); plan.md C-2.
 */
import { PERSISTENCE_KNOBS } from '../registry';
import type { Clock, TurnRecord } from '../types';
import {
  SYSTEM_IDS,
  checksumOfBlobs,
  toBlobs,
  type BundleMeta,
  type RegisteredBlob,
  type SaveBundle,
} from './bundle';
import { isWritable, type SlotRecord } from './slotRecord';
import {
  KEY_PREFIX,
  checkpointKey,
  persistenceError,
  slotKey,
  turnRecordKey,
  type PersistenceError,
  type StorageBackend,
} from './storageBackend';

/**
 * Checkpoint triggers.
 *
 * `turn_confirm` and `post_undo` are the two HARD gates of gdd-05 R1.
 * `hack_write` is the write-through commit of Character Customization Mode,
 * outside the turn cycle, gating nothing. `manual_backup` is P3a-specific: the
 * "Sao lưu lên GitHub" button of plan.md C-2, a best-effort mirror that must
 * never gate a turn.
 */
export type CheckpointReason = 'turn_confirm' | 'post_undo' | 'hack_write' | 'manual_backup';

/** Reasons that gate a Turn Manager transition (gdd-05 R1 checkpoints 1 and 2). */
export const GATING_REASONS: readonly CheckpointReason[] = ['turn_confirm', 'post_undo'];

export interface SaveCheckpointOptions {
  /** Current slot metadata. A closed slot rejects the write (R6 / AC-06). */
  slotRecord?: SlotRecord | null;
  /** Optional append-only record for this turn. */
  turnRecord?: TurnRecord | null;
  /** Injected clock. Defaults to a fixed 0 so tests stay deterministic. */
  clock?: Clock;
  /** Overrides the blob set - lets a test drive Formula #2 directly. */
  blobs?: RegisteredBlob[];
  /** Latency budget; exceeding it logs one violation and never blocks (AC-29). */
  maxLatencyMs?: number;
}

export interface SaveCheckpointResult {
  ok: boolean;
  durability_confirmed: boolean;
  error?: PersistenceError;
  /** Updated metadata, ready to be stored by the caller on success. */
  slotRecord?: SlotRecord;
  checksum?: string;
  bytes_written?: number;
  duration_ms?: number;
  /** True when `duration_ms` exceeded `max_perceived_autosave_latency_ms`. */
  budget_violation?: boolean;
  /** Diagnostic only (Formula #2); `'not_applicable'` when `N = 0`. */
  completeness_ratio?: number | 'not_applicable';
}

// ---------------------------------------------------------------------------
// Formula #2 - bundle completeness before commit
// ---------------------------------------------------------------------------

/** `ok(s) = 1 if blob_status(s) == 'OK' else 0`. */
export function okCount(blobs: readonly RegisteredBlob[]): number {
  return blobs.reduce((sum, b) => sum + (b.status === 'OK' ? 1 : 0), 0);
}

/** INTEGER comparison, never a float `== 1.0` (gdd-05 B4 Formula #2). */
export function isComplete(blobs: readonly RegisteredBlob[]): boolean {
  const n = blobs.length;
  return n >= 1 && okCount(blobs) === n;
}

/** `commit_allowed(bundle) = is_complete(bundle) AND (N >= 1)`. */
export function commitAllowed(blobs: readonly RegisteredBlob[]): boolean {
  return blobs.length >= 1 && isComplete(blobs);
}

/**
 * DIAGNOSTIC ONLY. `N == 0` skips the division and returns the sentinel
 * `'not_applicable'` - never 0, NaN or Infinity (gdd-05 AC-13/AC-36).
 */
export function completenessRatio(blobs: readonly RegisteredBlob[]): number | 'not_applicable' {
  const n = blobs.length;
  if (n === 0) return 'not_applicable';
  return okCount(blobs) / n;
}

/** First blob that blocks the commit, with the right error code (AC-12/AC-37). */
export function firstBlobFailure(blobs: readonly RegisteredBlob[]): PersistenceError | null {
  for (const blob of blobs) {
    if (blob.status === 'MISSING') {
      return persistenceError('BLOB_MISSING', `blob missing for system ${blob.system_id}`, blob.system_id);
    }
    if (blob.status === 'ERROR') {
      return persistenceError('BLOB_ERROR', `blob error for system ${blob.system_id}`, blob.system_id);
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// The save path
// ---------------------------------------------------------------------------

/**
 * Writes one checkpoint. NEVER throws - every failure comes back as
 * `{ok: false, durability_confirmed: false, error}` so the Turn Manager can
 * stay in Awaiting Action and surface a diegetic message (gdd-05 R4).
 *
 * Order: reject closed slot -> gather blobs -> `N >= 1` -> completeness gate ->
 * `stage()` -> `commit()` -> durability gate.
 */
export async function saveCheckpoint(
  backend: StorageBackend,
  slotId: string,
  bundle: SaveBundle,
  reason: CheckpointReason,
  opts: SaveCheckpointOptions = {},
): Promise<SaveCheckpointResult> {
  const clock: Clock = opts.clock ?? (() => 0);
  const startedAt = clock();
  const budget = opts.maxLatencyMs ?? PERSISTENCE_KNOBS.max_perceived_autosave_latency_ms;
  const slotRecord = opts.slotRecord ?? null;

  if (slotRecord && !isWritable(slotRecord)) {
    // R6: a closed slot never receives writes, but still reads fully.
    return {
      ok: false,
      durability_confirmed: false,
      error: persistenceError(
        'WRITE_FAILED_INTERNAL',
        `slot ${slotId} is closed (${slotRecord.slot_closure_reason})`,
      ),
    };
  }

  const blobs = opts.blobs ?? toBlobs(bundle);
  if (blobs.length < 1) {
    return {
      ok: false,
      durability_confirmed: false,
      error: persistenceError('CONFIG_ERROR_NO_SYSTEMS_REGISTERED', 'no systems registered'),
      completeness_ratio: 'not_applicable',
    };
  }
  if (!commitAllowed(blobs)) {
    const failure = firstBlobFailure(blobs);
    return {
      ok: false,
      durability_confirmed: false,
      error: failure ?? persistenceError('WRITE_FAILED_INTERNAL', 'incomplete bundle'),
      completeness_ratio: completenessRatio(blobs),
    };
  }

  const worldTime = bundle.meta?.world_time ?? bundle.currentTurn ?? 0;
  const hackSeq = opts.turnRecord?.hack_seq ?? (reason === 'hack_write' ? 1 : 0);
  const sum = checksumOfBlobs(blobs);
  const meta: BundleMeta = {
    slot_id: slotId,
    schema_version: bundle.meta?.schema_version ?? PERSISTENCE_KNOBS.schema_version,
    world_time: worldTime,
    saved_at: startedAt,
    checksum: sum,
    hack_mode_used_this_slot:
      bundle.meta?.hack_mode_used_this_slot === true ||
      slotRecord?.hack_mode_used_this_slot === true ||
      reason === 'hack_write',
  };
  const payload = { meta, blobs };
  const bytes = JSON.stringify(payload).length;

  const nextSlotRecord: SlotRecord | undefined = slotRecord
    ? {
        ...slotRecord,
        last_saved_at: startedAt,
        world_time_latest: Math.max(slotRecord.world_time_latest, worldTime),
        turn_count: reason === 'turn_confirm' ? slotRecord.turn_count + 1 : slotRecord.turn_count,
        hack_mode_used_this_slot: meta.hack_mode_used_this_slot,
        schema_version: meta.schema_version,
        byte_accounting: {
          fixed_blob_bytes: bytes,
          sum_turn_record_bytes:
            slotRecord.byte_accounting.sum_turn_record_bytes +
            (opts.turnRecord ? JSON.stringify(opts.turnRecord).length : 0),
        },
      }
    : undefined;

  try {
    backend.stage(checkpointKey(slotId, worldTime), payload);
    if (opts.turnRecord) {
      backend.stage(turnRecordKey(slotId, worldTime, hackSeq), opts.turnRecord);
    }
    if (nextSlotRecord) backend.stage(slotKey(slotId), nextSlotRecord);
  } catch (err) {
    backend.abort();
    return {
      ok: false,
      durability_confirmed: false,
      error: persistenceError('WRITE_FAILED_INTERNAL', String((err as Error)?.message ?? err)),
    };
  }

  let commitResult;
  try {
    commitResult = await backend.commit();
  } catch (err) {
    // A backend that rejects instead of resolving must still not throw upward.
    backend.abort();
    return {
      ok: false,
      durability_confirmed: false,
      error: persistenceError('WRITE_FAILED_INTERNAL', String((err as Error)?.message ?? err)),
    };
  }

  const duration = clock() - startedAt;
  if (!commitResult.durability_confirmed) {
    return {
      ok: false,
      durability_confirmed: false,
      error: commitResult.error ?? persistenceError('WRITE_FAILED_INTERNAL', 'commit failed'),
      duration_ms: duration,
      completeness_ratio: completenessRatio(blobs),
    };
  }
  return {
    ok: true,
    durability_confirmed: true,
    slotRecord: nextSlotRecord,
    checksum: sum,
    bytes_written: bytes,
    duration_ms: duration,
    budget_violation: duration > budget,
    completeness_ratio: completenessRatio(blobs),
  };
}

/** `N` for the default registry (gdd-05 B3 "Registered systems"). */
export const REGISTERED_SYSTEM_COUNT = SYSTEM_IDS.length;

/** `ckpt:<slot_id>:` - the list() prefix covering one slot's checkpoints. */
export function checkpointPrefix(slotId: string): string {
  return `${KEY_PREFIX.checkpoint}${slotId}:`;
}

/**
 * Bounds checkpoint growth in the reduced variant: keeps the newest `keep`
 * checkpoints of a slot and deletes the rest. Off the critical path - the caller
 * runs it during Awaiting Action idle, never inside the durability gate, and it
 * NEVER throws (a failed delete leaves the checkpoint in place; the next prune
 * retries it).
 *
 * IDEMPOTENT: re-running it deletes nothing once the slot is already at or below
 * `keep`, so it is safe to call after every turn, on load, and on resume without
 * tracking whether it already ran.
 *
 * `keep` defaults to `PERSISTENCE_KNOBS.max_checkpoints_per_slot` and is clamped
 * to at least 1: pruning a slot down to zero checkpoints would delete the very
 * state a load needs.
 */
export async function pruneCheckpoints(
  backend: StorageBackend,
  slotId: string,
  keep: number = PERSISTENCE_KNOBS.max_checkpoints_per_slot,
): Promise<number> {
  const keys = await backend.list(checkpointPrefix(slotId));
  // Keys pad world_time, so lexicographic order IS numeric order; sorting here
  // removes any dependence on the backend's own listing order.
  const sorted = [...keys].sort();
  const doomed = sorted.slice(0, Math.max(0, sorted.length - Math.max(1, Math.floor(keep))));
  let deleted = 0;
  for (const key of doomed) {
    try {
      await backend.delete(key);
      deleted += 1;
    } catch {
      /* a checkpoint that refuses to delete is pruned on the next pass */
    }
  }
  return deleted;
}
