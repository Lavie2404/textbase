/**
 * Unit tests - the storage seam: MemoryBackend failure injection and the real
 * IndexedDbBackend running on `fake-indexeddb`.
 *
 * AC ids: gdd-05 B8 (AC-03, AC-17, AC-18, AC-22, AC-33, AC-34) and Part C
 * (durability_confirmed == transaction.oncomplete).
 */
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  APP_LEGACY_DB_NAME,
  IndexedDbBackend,
  MemoryBackend,
  SAVE_DB_NAME,
  STORE_NAMES,
  checkpointKey,
  errorClassOf,
  mapDomError,
  metaKey,
  slotKey,
  storeForKey,
  turnRecordKey,
} from '../../../src-web/systems/persistence/storageBackend';

describe('key space and error taxonomy', () => {
  it('test_keys_route_to_their_physical_store', () => {
    expect(storeForKey(slotKey('s1'))).toBe('slots');
    expect(storeForKey(checkpointKey('s1', 3))).toBe('checkpoints');
    expect(storeForKey(turnRecordKey('s1', 3, 0))).toBe('turn_records');
    expect(storeForKey(metaKey('anything'))).toBe('meta');
    expect(storeForKey('unknown:x')).toBe('meta');
  });
  it('test_four_stores_are_declared', () => {
    expect([...STORE_NAMES].sort()).toEqual(['checkpoints', 'meta', 'slots', 'turn_records']);
  });
  it('test_checkpoint_keys_sort_numerically_via_zero_padding', () => {
    const keys = [checkpointKey('s1', 2), checkpointKey('s1', 10), checkpointKey('s1', 1)].sort();
    expect(keys).toEqual([checkpointKey('s1', 1), checkpointKey('s1', 2), checkpointKey('s1', 10)]);
  });
  it('test_turn_record_key_carries_slot_world_time_and_hack_seq', () => {
    expect(turnRecordKey('s1', 7, 2)).toBe('turn:s1:000000007:002');
  });
  it('test_error_codes_map_to_their_class', () => {
    expect(errorClassOf('WRITE_FAILED_QUOTA')).toBe('quota');
    expect(errorClassOf('LOAD_REJECTED_VERSION_MISMATCH')).toBe('schema');
    expect(errorClassOf('MULTI_TAB_CONFLICT')).toBe('conflict');
    expect(errorClassOf('LOAD_FAILED_UNREADABLE')).toBe('unreadable');
    expect(errorClassOf('CONFIG_ERROR_NO_SYSTEMS_REGISTERED')).toBe('config');
    expect(errorClassOf('BLOB_ERROR')).toBe('internal');
  });
  it('test_dom_errors_map_to_the_taxonomy', () => {
    expect(mapDomError({ name: 'QuotaExceededError', message: 'full' }).code).toBe('WRITE_FAILED_QUOTA');
    expect(mapDomError({ name: 'SecurityError', message: 'private mode' }).code).toBe(
      'WRITE_FAILED_UNSUPPORTED',
    );
    expect(mapDomError(new Error('boom')).code).toBe('WRITE_FAILED_INTERNAL');
  });
});

describe('MemoryBackend two-phase protocol (AC-03, AC-17, AC-22)', () => {
  it('test_staged_data_is_invisible_before_commit', async () => {
    const backend = new MemoryBackend();
    backend.stage(slotKey('s1'), { a: 1 });
    expect(backend.stagedCount()).toBe(1);
    expect(await backend.get(slotKey('s1'))).toBeUndefined();
    await backend.commit();
    expect(await backend.get(slotKey('s1'))).toEqual({ a: 1 });
  });
  it('test_abort_discards_everything_staged', async () => {
    const backend = new MemoryBackend();
    backend.stage(slotKey('s1'), { a: 1 });
    backend.abort();
    expect(backend.stagedCount()).toBe(0);
    expect(await backend.commit()).toEqual({ durability_confirmed: true });
    expect(await backend.get(slotKey('s1'))).toBeUndefined();
  });
  it('test_failure_between_stage_and_commit_leaves_the_previous_state', async () => {
    const backend = new MemoryBackend();
    backend.stage(slotKey('s1'), { v: 1 });
    await backend.commit();
    backend.failNextCommit('WRITE_FAILED_QUOTA');
    backend.stage(slotKey('s1'), { v: 2 });
    const result = await backend.commit();
    expect(result.durability_confirmed).toBe(false);
    expect(result.error?.class).toBe('quota');
    expect(await backend.get(slotKey('s1'))).toEqual({ v: 1 });
  });
  it('test_permanent_failure_persists_until_cleared', async () => {
    const backend = new MemoryBackend();
    backend.failAllCommits('WRITE_FAILED_UNSUPPORTED');
    backend.stage(slotKey('s1'), { v: 1 });
    expect((await backend.commit()).durability_confirmed).toBe(false);
    backend.stage(slotKey('s1'), { v: 1 });
    expect((await backend.commit()).durability_confirmed).toBe(false);
    backend.clearFailures();
    backend.stage(slotKey('s1'), { v: 1 });
    expect((await backend.commit()).durability_confirmed).toBe(true);
  });
  it('test_read_during_an_unresolved_commit_returns_the_previous_state', async () => {
    const backend = new MemoryBackend();
    backend.stage(slotKey('s1'), { v: 1 });
    await backend.commit();
    const release = backend.blockCommit();
    backend.stage(slotKey('s1'), { v: 2 });
    const pending = backend.commit();
    expect(await backend.get(slotKey('s1'))).toEqual({ v: 1 });
    release();
    await pending;
    expect(await backend.get(slotKey('s1'))).toEqual({ v: 2 });
  });
  it('test_values_are_deep_copied_not_aliased', async () => {
    const backend = new MemoryBackend();
    const value = { nested: { n: 1 } };
    backend.stage(slotKey('s1'), value);
    await backend.commit();
    value.nested.n = 99;
    expect(await backend.get(slotKey('s1'))).toEqual({ nested: { n: 1 } });
  });
  it('test_list_filters_by_prefix_and_sorts', async () => {
    const backend = new MemoryBackend();
    backend.stage(checkpointKey('s1', 2), {});
    backend.stage(checkpointKey('s1', 1), {});
    backend.stage(slotKey('s1'), {});
    await backend.commit();
    expect(await backend.list('ckpt:s1:')).toEqual([checkpointKey('s1', 1), checkpointKey('s1', 2)]);
  });
  it('test_delete_removes_a_committed_key', async () => {
    const backend = new MemoryBackend();
    backend.stage(slotKey('s1'), {});
    await backend.commit();
    await backend.delete(slotKey('s1'));
    expect(await backend.get(slotKey('s1'))).toBeUndefined();
  });
  it('test_lock_is_rejected_instantly_for_a_second_session', async () => {
    const locks = new Map<string, string>();
    const a = new MemoryBackend({ locks });
    const b = new MemoryBackend({ locks });
    expect(await a.acquireLock('s1')).not.toBeNull();
    expect(await b.acquireLock('s1')).toBeNull();
    await a.releaseLock('s1');
    expect(await b.acquireLock('s1')).not.toBeNull();
  });
  it('test_lock_is_reentrant_for_the_same_session', async () => {
    const backend = new MemoryBackend();
    expect(await backend.acquireLock('s1')).not.toBeNull();
    expect(await backend.acquireLock('s1')).not.toBeNull();
  });
});

describe('IndexedDbBackend on fake-indexeddb (Part C durability mapping)', () => {
  let idb: IDBFactory;

  beforeEach(() => {
    // A fresh factory per test: isolation, no cross-test residue.
    idb = new IDBFactory();
  });

  function backend(): IndexedDbBackend {
    return new IndexedDbBackend({ indexedDB: idb, locks: null });
  }

  it('test_commit_confirms_durability_on_transaction_complete', async () => {
    const be = backend();
    be.stage(slotKey('s1'), { character_name: 'Diệp Thần' });
    const result = await be.commit();
    expect(result.durability_confirmed).toBe(true);
    expect(await be.get(slotKey('s1'))).toEqual({ character_name: 'Diệp Thần' });
  });
  it('test_staged_data_is_not_visible_before_commit', async () => {
    const be = backend();
    be.stage(slotKey('s1'), { v: 1 });
    expect(be.stagedCount()).toBe(1);
    expect(await be.get(slotKey('s1'))).toBeUndefined();
  });
  it('test_abort_before_commit_writes_nothing', async () => {
    const be = backend();
    be.stage(slotKey('s1'), { v: 1 });
    be.abort();
    await be.commit();
    expect(await be.get(slotKey('s1'))).toBeUndefined();
  });
  it('test_one_commit_spans_several_stores_atomically', async () => {
    const be = backend();
    be.stage(slotKey('s1'), { v: 1 });
    be.stage(checkpointKey('s1', 1), { blobs: [] });
    be.stage(turnRecordKey('s1', 1, 0), { world_time: 1 });
    be.stage(metaKey('origin'), { measured: 1 });
    expect((await be.commit()).durability_confirmed).toBe(true);
    expect(await be.get(slotKey('s1'))).toBeTruthy();
    expect(await be.get(checkpointKey('s1', 1))).toBeTruthy();
    expect(await be.get(turnRecordKey('s1', 1, 0))).toBeTruthy();
    expect(await be.get(metaKey('origin'))).toBeTruthy();
  });
  it('test_empty_commit_is_trivially_durable', async () => {
    expect(await backend().commit()).toEqual({ durability_confirmed: true });
  });
  it('test_data_survives_a_new_backend_instance', async () => {
    const first = backend();
    first.stage(slotKey('s1'), { v: 42 });
    await first.commit();
    first.close();
    const second = backend();
    expect(await second.get(slotKey('s1'))).toEqual({ v: 42 });
  });
  it('test_list_filters_by_prefix_within_a_store', async () => {
    const be = backend();
    be.stage(checkpointKey('s1', 1), {});
    be.stage(checkpointKey('s1', 2), {});
    be.stage(checkpointKey('s2', 1), {});
    await be.commit();
    expect(await be.list('ckpt:s1:')).toEqual([checkpointKey('s1', 1), checkpointKey('s1', 2)]);
  });
  it('test_delete_removes_a_committed_key', async () => {
    const be = backend();
    be.stage(slotKey('s1'), {});
    await be.commit();
    await be.delete(slotKey('s1'));
    expect(await be.get(slotKey('s1'))).toBeUndefined();
  });

  it('test_backend_opens_only_the_vdl_saves_database', async () => {
    const be = backend();
    expect(be.dbName).toBe(SAVE_DB_NAME);
    be.stage(slotKey('s1'), { v: 1 });
    await be.commit();
    const names = (await (idb as unknown as { databases: () => Promise<{ name: string }[]> }).databases())
      .map((d) => d.name);
    expect(names).toContain(SAVE_DB_NAME);
    expect(names).not.toContain(APP_LEGACY_DB_NAME);
  });
  it('test_opening_the_app_database_is_refused', () => {
    expect(() => new IndexedDbBackend({ indexedDB: idb, dbName: APP_LEGACY_DB_NAME })).toThrow(
      /refusing to open the app database/,
    );
  });
  it('test_app_legacy_database_is_untouched_by_a_full_save_cycle', async () => {
    // Seed the app database exactly as App.tsx does (store `npcAvatars`).
    await new Promise<void>((resolve, reject) => {
      const req = idb.open(APP_LEGACY_DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore('npcAvatars');
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction(['npcAvatars'], 'readwrite');
        tx.objectStore('npcAvatars').put('base64-avatar', 'char_player');
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    });
    const be = backend();
    be.stage(slotKey('s1'), { v: 1 });
    be.stage(checkpointKey('s1', 1), { blobs: [] });
    await be.commit();
    const avatar = await new Promise((resolve, reject) => {
      const req = idb.open(APP_LEGACY_DB_NAME, 1);
      req.onsuccess = () => {
        const tx = req.result.transaction(['npcAvatars'], 'readonly');
        const get = tx.objectStore('npcAvatars').get('char_player');
        get.onsuccess = () => resolve(get.result);
        get.onerror = () => reject(get.error);
      };
      req.onerror = () => reject(req.error);
    });
    expect(avatar).toBe('base64-avatar');
  });

  it('test_fallback_lock_rejects_a_second_holder_instantly', async () => {
    const a = backend();
    const b = backend();
    expect(await a.acquireLock('s_lock_1')).not.toBeNull();
    expect(await b.acquireLock('s_lock_1')).toBeNull();
    await a.releaseLock('s_lock_1');
    expect(await b.acquireLock('s_lock_1')).not.toBeNull();
    await b.releaseLock('s_lock_1');
  });
  it('test_web_locks_api_is_used_with_if_available_when_present', async () => {
    const calls: { name: string; opts: unknown }[] = [];
    const held = new Set<string>();
    const locks = {
      request: async (name: string, opts: unknown, cb: (lock: unknown) => Promise<void>) => {
        calls.push({ name, opts });
        if (held.has(name)) {
          await cb(null);
          return;
        }
        held.add(name);
        void cb({ name }).then(() => held.delete(name));
      },
    };
    const a = new IndexedDbBackend({ indexedDB: idb, locks });
    const b = new IndexedDbBackend({ indexedDB: idb, locks });
    expect(await a.acquireLock('s2')).not.toBeNull();
    expect(calls[0]).toEqual({ name: 'slot-s2', opts: { ifAvailable: true } });
    expect(await b.acquireLock('s2')).toBeNull();
    await a.releaseLock('s2');
    // Let the lock callback settle: a real Web Lock is released when the
    // callback promise resolves, which happens on a later microtask turn.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(await b.acquireLock('s2')).not.toBeNull();
  });
});
