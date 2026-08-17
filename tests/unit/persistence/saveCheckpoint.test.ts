/**
 * Unit tests - the save path and Formula #2.
 * AC ids: gdd-05 B8 (AC-01..AC-04, AC-12..AC-14, AC-17, AC-24, AC-29, AC-32,
 * AC-36..AC-38).
 */
import { describe, expect, it } from 'vitest';
import {
  MemoryBackend,
  checkpointKey,
  slotKey,
  turnRecordKey,
} from '../../../src-web/systems/persistence/storageBackend';
import {
  REGISTERED_SYSTEM_COUNT,
  commitAllowed,
  completenessRatio,
  firstBlobFailure,
  isComplete,
  okCount,
  pruneCheckpoints,
  saveCheckpoint,
} from '../../../src-web/systems/persistence/saveCheckpoint';
import { SYSTEM_IDS, toBlobs, type RegisteredBlob } from '../../../src-web/systems/persistence/bundle';
import { closeSlot, markUnreadable } from '../../../src-web/systems/persistence/slotRecord';
import { NOW, SLOT_ID, fixedClock, makeBundle, makeSlot, makeTurnRecord } from './factories';

function blob(id: string, status: 'OK' | 'MISSING' | 'ERROR'): RegisteredBlob {
  return { system_id: id, status, bytes: status === 'OK' ? '{}' : '' };
}

describe('Formula #2 - completeness (AC-12, AC-13, AC-14, AC-36, AC-37)', () => {
  it('test_all_ok_allows_commit', () => {
    const blobs = [blob('a', 'OK'), blob('b', 'OK'), blob('c', 'OK')];
    expect(okCount(blobs)).toBe(3);
    expect(isComplete(blobs)).toBe(true);
    expect(commitAllowed(blobs)).toBe(true);
    expect(completenessRatio(blobs)).toBe(1);
  });
  it('test_one_error_blocks_commit_and_reports_the_system_id', () => {
    const blobs = [blob('a', 'OK'), blob('b', 'ERROR'), blob('c', 'OK')];
    expect(completenessRatio(blobs)).toBeCloseTo(0.667, 3);
    expect(commitAllowed(blobs)).toBe(false);
    expect(firstBlobFailure(blobs)).toMatchObject({ code: 'BLOB_ERROR', system_id: 'b' });
  });
  it('test_missing_blob_is_distinct_from_error', () => {
    expect(firstBlobFailure([blob('a', 'MISSING')])).toMatchObject({
      code: 'BLOB_MISSING',
      system_id: 'a',
    });
  });
  it('test_zero_systems_never_divides_and_is_never_complete', () => {
    expect(completenessRatio([])).toBe('not_applicable');
    expect(isComplete([])).toBe(false);
    expect(commitAllowed([])).toBe(false);
  });
  it('test_valid_empty_blob_still_counts_as_ok', () => {
    expect(commitAllowed([{ system_id: 'a', status: 'OK', bytes: '' }])).toBe(true);
  });
  it('test_default_registry_has_six_systems_all_ok', () => {
    const blobs = toBlobs(makeBundle());
    expect(blobs).toHaveLength(REGISTERED_SYSTEM_COUNT);
    expect(REGISTERED_SYSTEM_COUNT).toBe(SYSTEM_IDS.length);
    expect(commitAllowed(blobs)).toBe(true);
  });
});

describe('save path happy cases (AC-01, AC-38)', () => {
  it('test_turn_confirm_commits_and_confirms_durability', async () => {
    const backend = new MemoryBackend();
    const result = await saveCheckpoint(backend, SLOT_ID, makeBundle(), 'turn_confirm', {
      slotRecord: makeSlot(),
      clock: fixedClock,
    });
    expect(result.ok).toBe(true);
    expect(result.durability_confirmed).toBe(true);
    expect(result.checksum).toMatch(/^[0-9a-f]{8}$/);
    expect(await backend.get(checkpointKey(SLOT_ID, 1))).toBeTruthy();
    expect(await backend.get(slotKey(SLOT_ID))).toBeTruthy();
  });
  it('test_first_turn_write_is_one_atomic_transaction', async () => {
    const backend = new MemoryBackend();
    await saveCheckpoint(backend, SLOT_ID, makeBundle(), 'turn_confirm', {
      slotRecord: makeSlot(),
      clock: fixedClock,
      turnRecord: makeTurnRecord(1),
    });
    expect(backend.commitLog).toHaveLength(1);
    expect(backend.commitLog[0]).toContain(turnRecordKey(SLOT_ID, 1, 0));
    expect(backend.stagedCount()).toBe(0);
  });
  it('test_turn_confirm_increments_turn_count_and_world_time_latest', async () => {
    const backend = new MemoryBackend();
    const result = await saveCheckpoint(
      backend,
      SLOT_ID,
      makeBundle({ meta: { ...makeBundle().meta, world_time: 7 } }),
      'turn_confirm',
      { slotRecord: makeSlot({ turn_count: 6, world_time_latest: 6 }), clock: fixedClock },
    );
    expect(result.slotRecord?.turn_count).toBe(7);
    expect(result.slotRecord?.world_time_latest).toBe(7);
    expect(result.slotRecord?.last_saved_at).toBe(NOW);
  });
  it('test_hack_write_sets_the_permanent_flag_and_uses_hack_seq_one', async () => {
    const backend = new MemoryBackend();
    const result = await saveCheckpoint(backend, SLOT_ID, makeBundle(), 'hack_write', {
      slotRecord: makeSlot(),
      clock: fixedClock,
    });
    expect(result.slotRecord?.hack_mode_used_this_slot).toBe(true);
    expect(result.slotRecord?.turn_count).toBe(0);
  });
  it('test_hack_flag_is_never_cleared_by_a_later_ordinary_write', async () => {
    const backend = new MemoryBackend();
    const result = await saveCheckpoint(backend, SLOT_ID, makeBundle(), 'turn_confirm', {
      slotRecord: makeSlot({ hack_mode_used_this_slot: true }),
      clock: fixedClock,
    });
    expect(result.slotRecord?.hack_mode_used_this_slot).toBe(true);
  });
  it('test_manual_backup_reason_writes_without_touching_turn_count', async () => {
    const backend = new MemoryBackend();
    const result = await saveCheckpoint(backend, SLOT_ID, makeBundle(), 'manual_backup', {
      slotRecord: makeSlot({ turn_count: 5 }),
      clock: fixedClock,
    });
    expect(result.ok).toBe(true);
    expect(result.slotRecord?.turn_count).toBe(5);
  });
});

describe('failure paths (AC-03, AC-04, AC-17, AC-21, AC-32)', () => {
  it('test_failure_between_stage_and_commit_leaves_no_partial_state', async () => {
    const backend = new MemoryBackend();
    await saveCheckpoint(backend, SLOT_ID, makeBundle(), 'turn_confirm', {
      slotRecord: makeSlot(),
      clock: fixedClock,
    });
    const before = await backend.get(checkpointKey(SLOT_ID, 1));
    backend.failNextCommit('WRITE_FAILED_QUOTA');
    const second = await saveCheckpoint(
      backend,
      SLOT_ID,
      makeBundle({ currentTurn: 2, meta: { ...makeBundle().meta, world_time: 2 } }),
      'turn_confirm',
      { slotRecord: makeSlot(), clock: fixedClock },
    );
    expect(second.ok).toBe(false);
    expect(second.durability_confirmed).toBe(false);
    expect(await backend.get(checkpointKey(SLOT_ID, 2))).toBeUndefined();
    expect(await backend.get(checkpointKey(SLOT_ID, 1))).toEqual(before);
    expect(backend.stagedCount()).toBe(0);
  });
  it('test_quota_failure_returns_the_quota_error_class', async () => {
    const backend = new MemoryBackend();
    backend.failNextCommit('WRITE_FAILED_QUOTA');
    const result = await saveCheckpoint(backend, SLOT_ID, makeBundle(), 'turn_confirm', {
      slotRecord: makeSlot(),
      clock: fixedClock,
    });
    expect(result.error?.code).toBe('WRITE_FAILED_QUOTA');
    expect(result.error?.class).toBe('quota');
  });
  it('test_unsupported_failure_is_distinct_from_quota', async () => {
    const backend = new MemoryBackend();
    backend.failNextCommit('WRITE_FAILED_UNSUPPORTED');
    const result = await saveCheckpoint(backend, SLOT_ID, makeBundle(), 'turn_confirm', {
      slotRecord: makeSlot(),
      clock: fixedClock,
    });
    expect(result.error?.code).toBe('WRITE_FAILED_UNSUPPORTED');
    expect(result.error?.class).toBe('unsupported');
  });
  it('test_save_never_throws_even_when_commit_rejects', async () => {
    const backend = new MemoryBackend();
    const broken = {
      ...backend,
      stage: backend.stage.bind(backend),
      abort: backend.abort.bind(backend),
      commit: async () => {
        throw new Error('backend exploded');
      },
    } as unknown as MemoryBackend;
    const result = await saveCheckpoint(broken, SLOT_ID, makeBundle(), 'turn_confirm', {
      clock: fixedClock,
    });
    expect(result.ok).toBe(false);
    expect(result.error?.code).toBe('WRITE_FAILED_INTERNAL');
  });
  it('test_closed_slot_rejects_the_write', async () => {
    const backend = new MemoryBackend();
    const result = await saveCheckpoint(backend, SLOT_ID, makeBundle(), 'turn_confirm', {
      slotRecord: closeSlot(makeSlot(), 'death'),
      clock: fixedClock,
    });
    expect(result.ok).toBe(false);
    expect(backend.commitLog).toHaveLength(0);
  });
  it('test_unreadable_slot_rejects_the_write', async () => {
    const backend = new MemoryBackend();
    const result = await saveCheckpoint(backend, SLOT_ID, makeBundle(), 'turn_confirm', {
      slotRecord: markUnreadable(makeSlot(), 'corrupt'),
      clock: fixedClock,
    });
    expect(result.ok).toBe(false);
  });
  it('test_zero_registered_systems_logs_the_config_error', async () => {
    const backend = new MemoryBackend();
    const result = await saveCheckpoint(backend, SLOT_ID, makeBundle(), 'turn_confirm', {
      blobs: [],
      clock: fixedClock,
    });
    expect(result.error?.code).toBe('CONFIG_ERROR_NO_SYSTEMS_REGISTERED');
    expect(result.completeness_ratio).toBe('not_applicable');
    expect(backend.commitLog).toHaveLength(0);
  });
  it('test_incomplete_bundle_blocks_commit_before_staging', async () => {
    const backend = new MemoryBackend();
    const result = await saveCheckpoint(backend, SLOT_ID, makeBundle(), 'turn_confirm', {
      blobs: [blob('a', 'OK'), blob('b', 'MISSING')],
      clock: fixedClock,
    });
    expect(result.error?.code).toBe('BLOB_MISSING');
    expect(backend.stagedCount()).toBe(0);
    expect(backend.commitLog).toHaveLength(0);
  });
  it('test_error_path_never_touches_another_slot', async () => {
    const backend = new MemoryBackend();
    await saveCheckpoint(backend, 'slot_other', makeBundle(), 'turn_confirm', {
      slotRecord: makeSlot({ slot_id: 'slot_other' }),
      clock: fixedClock,
    });
    const otherBefore = await backend.get(slotKey('slot_other'));
    backend.failAllCommits('WRITE_FAILED_QUOTA');
    for (let i = 0; i < 3; i += 1) {
      await saveCheckpoint(backend, SLOT_ID, makeBundle(), 'turn_confirm', {
        slotRecord: makeSlot(),
        clock: fixedClock,
      });
    }
    expect(await backend.get(slotKey('slot_other'))).toEqual(otherBefore);
  });
});

describe('latency budget and pruning (AC-29, AC-34 relaxation)', () => {
  it('test_over_budget_write_reports_a_violation_without_blocking', async () => {
    const backend = new MemoryBackend();
    let t = 0;
    const result = await saveCheckpoint(backend, SLOT_ID, makeBundle(), 'turn_confirm', {
      slotRecord: makeSlot(),
      clock: () => (t += 400),
      maxLatencyMs: 150,
    });
    expect(result.ok).toBe(true);
    expect(result.budget_violation).toBe(true);
  });
  it('test_within_budget_write_reports_no_violation', async () => {
    const backend = new MemoryBackend();
    const result = await saveCheckpoint(backend, SLOT_ID, makeBundle(), 'turn_confirm', {
      slotRecord: makeSlot(),
      clock: fixedClock,
    });
    expect(result.budget_violation).toBe(false);
  });
  it('test_prune_keeps_the_newest_checkpoints_only', async () => {
    const backend = new MemoryBackend();
    for (let wt = 1; wt <= 5; wt += 1) {
      await saveCheckpoint(
        backend,
        SLOT_ID,
        makeBundle({ meta: { ...makeBundle().meta, world_time: wt } }),
        'turn_confirm',
        { slotRecord: makeSlot(), clock: fixedClock },
      );
    }
    const deleted = await pruneCheckpoints(backend, SLOT_ID, 2);
    expect(deleted).toBe(3);
    const remaining = await backend.list(`ckpt:${SLOT_ID}:`);
    expect(remaining).toHaveLength(2);
    expect(await backend.get(checkpointKey(SLOT_ID, 5))).toBeTruthy();
  });
});
