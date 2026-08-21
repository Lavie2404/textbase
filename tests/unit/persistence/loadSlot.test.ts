/**
 * Unit tests - the load path: locks, schema gate, checksum, replay.
 * AC ids: gdd-05 B8 (AC-02, AC-08, AC-18, AC-22, AC-23, AC-33).
 */
import { describe, expect, it } from 'vitest';
import { MemoryBackend, slotKey } from '../../../src-web/systems/persistence/storageBackend';
import { saveCheckpoint } from '../../../src-web/systems/persistence/saveCheckpoint';
import { loadSlot, worldMemoryFromBundle } from '../../../src-web/systems/persistence/loadSlot';
import { CURRENT_SCHEMA_VERSION } from '../../../src-web/systems/persistence/slotRecord';
import { WorldMemory } from '../../../src-web/systems/worldMemory/worldMemory';
import { SLOT_ID, fixedClock, makeBundle, makeSlot, makeTurnRecord } from './factories';

async function seededBackend(
  locks?: Map<string, string>,
  store?: Map<string, string>,
): Promise<MemoryBackend> {
  const backend = new MemoryBackend({ locks, store });
  await saveCheckpoint(backend, SLOT_ID, makeBundle(), 'turn_confirm', {
    slotRecord: makeSlot(),
    clock: fixedClock,
    turnRecord: makeTurnRecord(1),
  });
  return backend;
}

describe('happy path (AC-02)', () => {
  it('test_load_returns_the_bundle_with_unmixed_blobs', async () => {
    const backend = await seededBackend();
    const result = await loadSlot(backend, SLOT_ID);
    expect(result.ok).toBe(true);
    expect(result.bundle?.gameSettings).toEqual(makeBundle().gameSettings);
    expect(result.bundle?.knowledge).toEqual(makeBundle().knowledge);
    expect(result.bundle?.currentTurn).toBe(1);
    expect(result.bundle?.storyHistory).toEqual(makeBundle().storyHistory);
  });
  it('test_load_holds_a_lock_that_can_be_released', async () => {
    const backend = await seededBackend();
    const result = await loadSlot(backend, SLOT_ID);
    expect(result.lock?.slot_id).toBe(SLOT_ID);
    await result.lock?.release();
    const second = await loadSlot(backend, SLOT_ID);
    expect(second.ok).toBe(true);
  });
  it('test_load_can_skip_locking_for_a_readonly_view', async () => {
    const backend = await seededBackend();
    const result = await loadSlot(backend, SLOT_ID, { acquireLock: false });
    expect(result.ok).toBe(true);
    expect(result.lock).toBeNull();
  });
  it('test_round_trip_is_lossless_for_every_registered_system', async () => {
    const backend = new MemoryBackend();
    const bundle = makeBundle({ storySummaries: [{ id: 's1', content: 'Biên niên sử.' }] });
    await saveCheckpoint(backend, SLOT_ID, bundle, 'turn_confirm', {
      slotRecord: makeSlot(),
      clock: fixedClock,
    });
    const result = await loadSlot(backend, SLOT_ID);
    expect(result.bundle?.storySummaries).toEqual(bundle.storySummaries);
    expect(result.bundle?.gameMode).toBe('EXPLORATION');
  });
});

describe('multi-tab lock contention (AC-18, AC-33)', () => {
  it('test_second_session_is_blocked_instantly', async () => {
    const locks = new Map<string, string>();
    const store = new Map<string, string>();
    const first = await seededBackend(locks, store);
    const second = new MemoryBackend({ locks, store });
    const a = await loadSlot(first, SLOT_ID);
    expect(a.ok).toBe(true);
    const b = await loadSlot(second, SLOT_ID);
    expect(b.ok).toBe(false);
    expect(b.error?.code).toBe('MULTI_TAB_CONFLICT');
    expect(b.error?.class).toBe('conflict');
  });
  it('test_first_session_is_unaffected_by_the_rejected_second', async () => {
    const locks = new Map<string, string>();
    const store = new Map<string, string>();
    const first = await seededBackend(locks, store);
    const second = new MemoryBackend({ locks, store });
    const a = await loadSlot(first, SLOT_ID);
    await loadSlot(second, SLOT_ID);
    expect(a.bundle).toBeTruthy();
  });
  it('test_lock_is_released_when_the_holder_leaves', async () => {
    const locks = new Map<string, string>();
    const store = new Map<string, string>();
    const first = await seededBackend(locks, store);
    const second = new MemoryBackend({ locks, store });
    const a = await loadSlot(first, SLOT_ID);
    await a.lock?.release();
    const b = await loadSlot(second, SLOT_ID);
    expect(b.ok).toBe(true);
  });
  it('test_failed_load_releases_the_lock_it_took', async () => {
    const locks = new Map<string, string>();
    const backend = new MemoryBackend({ locks });
    const result = await loadSlot(backend, 'missing_slot');
    expect(result.ok).toBe(false);
    expect(locks.has('missing_slot')).toBe(false);
  });
});

describe('schema gate (AC-08)', () => {
  it('test_older_version_is_migrated_and_loads', async () => {
    const backend = await seededBackend();
    const stored = (await backend.get(slotKey(SLOT_ID))) as Record<string, unknown>;
    backend.stage(slotKey(SLOT_ID), { ...stored, schema_version: 1 });
    await backend.commit();
    const result = await loadSlot(backend, SLOT_ID);
    expect(result.ok).toBe(true);
    expect(result.migrated).toBe(true);
    expect(result.slotRecord?.schema_version).toBe(CURRENT_SCHEMA_VERSION);
  });
  it('test_newer_version_is_rejected_and_marks_the_slot_unreadable', async () => {
    const backend = await seededBackend();
    const stored = (await backend.get(slotKey(SLOT_ID))) as Record<string, unknown>;
    backend.stage(slotKey(SLOT_ID), { ...stored, schema_version: CURRENT_SCHEMA_VERSION + 5 });
    await backend.commit();
    const result = await loadSlot(backend, SLOT_ID);
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('LOAD_REJECTED_VERSION_MISMATCH');
    expect(result.slotRecord?.readable).toBe(false);
    expect(result.slotRecord?.slot_closure_reason).toBe('schema');
  });
  it('test_rejected_slot_stays_listed_with_its_flag_persisted', async () => {
    const backend = await seededBackend();
    const stored = (await backend.get(slotKey(SLOT_ID))) as Record<string, unknown>;
    backend.stage(slotKey(SLOT_ID), { ...stored, schema_version: 99 });
    await backend.commit();
    await loadSlot(backend, SLOT_ID);
    const persisted = (await backend.get(slotKey(SLOT_ID))) as { readable: boolean };
    expect(persisted.readable).toBe(false);
    expect(await backend.list('slot:')).toContain(slotKey(SLOT_ID));
  });
  it('test_no_partial_application_on_rejection', async () => {
    const backend = await seededBackend();
    const stored = (await backend.get(slotKey(SLOT_ID))) as Record<string, unknown>;
    backend.stage(slotKey(SLOT_ID), { ...stored, schema_version: 99 });
    await backend.commit();
    const result = await loadSlot(backend, SLOT_ID);
    expect(result.bundle).toBeUndefined();
  });
});

describe('integrity and unreadable slots (AC-23)', () => {
  it('test_missing_metadata_is_load_failed_unreadable', async () => {
    const backend = new MemoryBackend();
    const result = await loadSlot(backend, 'ghost');
    expect(result.error?.code).toBe('LOAD_FAILED_UNREADABLE');
    expect(result.error?.class).toBe('unreadable');
  });
  it('test_missing_checkpoint_marks_the_slot_corrupt', async () => {
    const backend = new MemoryBackend();
    backend.stage(slotKey(SLOT_ID), makeSlot());
    await backend.commit();
    const result = await loadSlot(backend, SLOT_ID);
    expect(result.error?.code).toBe('LOAD_FAILED_UNREADABLE');
    expect(result.slotRecord?.slot_closure_reason).toBe('corrupt');
  });
  it('test_checksum_mismatch_is_detected_and_reported', async () => {
    const backend = await seededBackend();
    const keys = await backend.list(`ckpt:${SLOT_ID}:`);
    const payload = (await backend.get(keys[0])) as { meta: { checksum: string }; blobs: unknown[] };
    payload.meta.checksum = 'deadbeef';
    backend.stage(keys[0], payload);
    await backend.commit();
    const result = await loadSlot(backend, SLOT_ID);
    expect(result.ok).toBe(false);
    expect(result.error?.message).toContain('checksum mismatch');
    expect(result.slotRecord?.slot_closure_reason).toBe('corrupt');
  });
  it('test_checksum_verification_can_be_disabled', async () => {
    const backend = await seededBackend();
    const keys = await backend.list(`ckpt:${SLOT_ID}:`);
    const payload = (await backend.get(keys[0])) as { meta: { checksum: string } };
    payload.meta.checksum = 'deadbeef';
    backend.stage(keys[0], payload);
    await backend.commit();
    const result = await loadSlot(backend, SLOT_ID, { verifyChecksum: false });
    expect(result.ok).toBe(true);
  });
  it('test_slot_already_marked_unreadable_refuses_to_load', async () => {
    const backend = await seededBackend();
    backend.stage(slotKey(SLOT_ID), makeSlot({ readable: false, slot_closure_reason: 'corrupt' }));
    await backend.commit();
    const result = await loadSlot(backend, SLOT_ID);
    expect(result.error?.code).toBe('LOAD_FAILED_UNREADABLE');
  });
});

describe('turn record replay and World Memory rehydration', () => {
  it('test_records_after_the_checkpoint_are_returned_in_order', async () => {
    const backend = new MemoryBackend();
    await saveCheckpoint(
      backend,
      SLOT_ID,
      makeBundle({ meta: { ...makeBundle().meta, world_time: 1 } }),
      'turn_confirm',
      { slotRecord: makeSlot(), clock: fixedClock, turnRecord: makeTurnRecord(1) },
    );
    backend.stage(`turn:${SLOT_ID}:000000003:001`, makeTurnRecord(3, 1));
    backend.stage(`turn:${SLOT_ID}:000000002:000`, makeTurnRecord(2));
    backend.stage(`turn:${SLOT_ID}:000000003:000`, makeTurnRecord(3));
    await backend.commit();
    const result = await loadSlot(backend, SLOT_ID);
    expect(result.turnRecords?.map((r) => [r.world_time, r.hack_seq])).toEqual([
      [2, 0],
      [3, 0],
      [3, 1],
    ]);
  });
  it('test_world_memory_is_read_from_the_bundle_not_regenerated', async () => {
    const wm = new WorldMemory({ recencyWindowTurns: 2 });
    for (let i = 1; i <= 5; i += 1) wm.append(makeTurnRecord(i));
    const backend = new MemoryBackend();
    await saveCheckpoint(backend, SLOT_ID, makeBundle({ worldMemory: wm.toJSON() }), 'turn_confirm', {
      slotRecord: makeSlot(),
      clock: fixedClock,
    });
    const result = await loadSlot(backend, SLOT_ID);
    const restored = worldMemoryFromBundle(result.bundle!);
    expect(restored.totalTurns()).toBe(5);
    expect(restored.recencyWindow().map((r) => r.turn_id)).toEqual([4, 5]);
  });
  it('test_bundle_without_world_memory_falls_back_to_turn_records', async () => {
    const backend = new MemoryBackend();
    await saveCheckpoint(backend, SLOT_ID, makeBundle(), 'turn_confirm', {
      slotRecord: makeSlot(),
      clock: fixedClock,
    });
    backend.stage(`turn:${SLOT_ID}:000000002:000`, makeTurnRecord(2));
    await backend.commit();
    const result = await loadSlot(backend, SLOT_ID);
    const restored = worldMemoryFromBundle(result.bundle!);
    expect(restored.totalTurns()).toBe(1);
  });
});
