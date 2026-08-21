/**
 * Persistence - the load path (gdd-05 B4 `load_slot`).
 *
 * acquire lock -> read metadata -> verify `schema_version` (migrate or reject)
 * -> verify checkpoint integrity -> return the bundle plus any turn records
 * written after the checkpoint.
 *
 * Design docs: production/gdd-integration/gdd-05-encounter-persistence.md B2
 * (R5/R6/R8), B4 (load path), B6 (EC-2, EC-5, EC-8), B8 (AC-08, AC-18, AC-23,
 * AC-33); plan.md C-2. Multi-tab detection happens at slot OPEN, never at action
 * time, so no typed input can be lost.
 */
import type { TurnRecord } from '../types';
import { fromBlobs, checksumOfBlobs, type RegisteredBlob, type SaveBundle } from './bundle';
import {
  CURRENT_SCHEMA_VERSION,
  markUnreadable,
  migrateSlot,
  type SlotRecord,
} from './slotRecord';
import {
  KEY_PREFIX,
  persistenceError,
  slotKey,
  type PersistenceError,
  type SlotLock,
  type StorageBackend,
} from './storageBackend';
import { WorldMemory } from '../worldMemory/worldMemory';

export interface LoadSlotOptions {
  /** Skip lock acquisition (read-only journal view of a closed slot). */
  acquireLock?: boolean;
  /**
   * Verify the bundle checksum. BEYOND THE GDD (gdd-05 B9 #6 records the gap);
   * a mismatch is treated exactly like EC-8 silent data loss.
   */
  verifyChecksum?: boolean;
  /** Persist the `readable = false` flag so the row stays labelled (EC-8). */
  persistUnreadableFlag?: boolean;
}

export interface LoadSlotResult {
  ok: boolean;
  error?: PersistenceError;
  /** Present even on failure when metadata could be read - the row stays listed. */
  slotRecord?: SlotRecord;
  bundle?: SaveBundle;
  /** Held for the whole session; release on leaving the slot. */
  lock?: SlotLock | null;
  /** True when the record was upgraded through the migration chain. */
  migrated?: boolean;
  /** Records with `world_time` past the checkpoint, ordered for replay. */
  turnRecords?: TurnRecord[];
}

/** Opens a slot. Never throws; every failure is an Error Taxonomy code. */
export async function loadSlot(
  backend: StorageBackend,
  slotId: string,
  opts: LoadSlotOptions = {},
): Promise<LoadSlotResult> {
  let lock: SlotLock | null = null;
  if (opts.acquireLock !== false) {
    lock = await backend.acquireLock(slotId);
    if (!lock) {
      return {
        ok: false,
        error: persistenceError('MULTI_TAB_CONFLICT', `slot ${slotId} is open in another tab`),
        lock: null,
      };
    }
  }
  const fail = async (error: PersistenceError, slotRecord?: SlotRecord): Promise<LoadSlotResult> => {
    if (lock) await lock.release();
    return { ok: false, error, slotRecord, lock: null };
  };

  let raw: unknown;
  try {
    raw = await backend.get(slotKey(slotId));
  } catch (err) {
    return fail(persistenceError('LOAD_FAILED_UNREADABLE', String((err as Error)?.message ?? err)));
  }
  if (!raw || typeof raw !== 'object') {
    return fail(persistenceError('LOAD_FAILED_UNREADABLE', `slot ${slotId} has no readable metadata`));
  }

  let record = raw as SlotRecord;
  let migrated = false;
  if (record.schema_version !== CURRENT_SCHEMA_VERSION) {
    const migration = migrateSlot(record);
    if (!migration.ok || !migration.record) {
      // R8: reject in BOTH directions, no partial application, no implicit guess.
      const marked = markUnreadable(record, 'schema');
      await persistSlotRecord(backend, slotId, marked, opts);
      return fail(
        persistenceError(
          'LOAD_REJECTED_VERSION_MISMATCH',
          `slot ${slotId} schema_version ${record.schema_version} != ${CURRENT_SCHEMA_VERSION} (${migration.reason})`,
        ),
        marked,
      );
    }
    record = migration.record;
    migrated = true;
  }
  if (record.readable === false) {
    return fail(persistenceError('LOAD_FAILED_UNREADABLE', `slot ${slotId} is marked unreadable`), record);
  }

  const prefix = `${KEY_PREFIX.checkpoint}${slotId}:`;
  let checkpointKeys: string[] = [];
  try {
    checkpointKeys = await backend.list(prefix);
  } catch (err) {
    return fail(persistenceError('LOAD_FAILED_UNREADABLE', String((err as Error)?.message ?? err)), record);
  }
  if (checkpointKeys.length === 0) {
    const marked = markUnreadable(record, 'corrupt');
    await persistSlotRecord(backend, slotId, marked, opts);
    return fail(persistenceError('LOAD_FAILED_UNREADABLE', `slot ${slotId} has no checkpoint`), marked);
  }
  const latestKey = checkpointKeys[checkpointKeys.length - 1];
  const payload = (await backend.get(latestKey)) as
    | { meta: SaveBundle['meta']; blobs: RegisteredBlob[] }
    | undefined;
  if (!payload || !payload.meta || !Array.isArray(payload.blobs)) {
    const marked = markUnreadable(record, 'corrupt');
    await persistSlotRecord(backend, slotId, marked, opts);
    return fail(persistenceError('LOAD_FAILED_UNREADABLE', `checkpoint ${latestKey} is unreadable`), marked);
  }
  if (opts.verifyChecksum !== false) {
    const actual = checksumOfBlobs(payload.blobs);
    if (actual !== payload.meta.checksum) {
      const marked = markUnreadable(record, 'corrupt');
      await persistSlotRecord(backend, slotId, marked, opts);
      return fail(
        persistenceError(
          'LOAD_FAILED_UNREADABLE',
          `checksum mismatch on ${latestKey}: ${actual} != ${payload.meta.checksum}`,
        ),
        marked,
      );
    }
  }

  const bundle = fromBlobs(payload.blobs, payload.meta);
  const turnRecords = await readTurnRecordsAfter(backend, slotId, payload.meta.world_time);
  bundle.turnRecords = turnRecords;
  return { ok: true, slotRecord: record, bundle, lock, migrated, turnRecords };
}

/**
 * Turn records written after the checkpoint, ordered by
 * `(world_time ASC, hack_seq ASC)` - so `hack_seq = 0` (the turn's own confirmed
 * result) always applies before any hack write at the same `world_time`.
 */
export async function readTurnRecordsAfter(
  backend: StorageBackend,
  slotId: string,
  worldTimeAtCheckpoint: number,
): Promise<TurnRecord[]> {
  const keys = await backend.list(`${KEY_PREFIX.turnRecord}${slotId}:`);
  const records: TurnRecord[] = [];
  for (const key of keys) {
    const record = (await backend.get(key)) as TurnRecord | undefined;
    if (record && record.world_time > worldTimeAtCheckpoint) records.push(record);
  }
  return records.sort((a, b) =>
    a.world_time !== b.world_time ? a.world_time - b.world_time : a.hack_seq - b.hack_seq,
  );
}

/**
 * Rehydrates World Memory from a loaded bundle.
 *
 * The Context View is READ from the save, never regenerated with current knob
 * values (gdd-04 Core Rule #8 / AC-21b). Post-checkpoint turn records are then
 * appended through the ordinary write path, so their eviction/extraction is
 * identical to a live session.
 */
export function worldMemoryFromBundle(bundle: SaveBundle): WorldMemory {
  const wm = bundle.worldMemory
    ? WorldMemory.fromJSON(bundle.worldMemory)
    : WorldMemory.fromTurnRecords(bundle.turnRecords ?? []);
  if (bundle.worldMemory) {
    for (const record of bundle.turnRecords ?? []) wm.append(record);
  }
  return wm;
}

/** Best-effort persistence of the `readable = false` flag. Failure is ignored. */
async function persistSlotRecord(
  backend: StorageBackend,
  slotId: string,
  record: SlotRecord,
  opts: LoadSlotOptions,
): Promise<void> {
  if (opts.persistUnreadableFlag === false) return;
  try {
    backend.stage(slotKey(slotId), record);
    await backend.commit();
  } catch {
    backend.abort();
  }
}
