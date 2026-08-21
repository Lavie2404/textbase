/**
 * Unit tests - checkpoint pruning (plan.md D "P3 rut gon": full-state writes
 * grow storage O(state) per turn, so the count must be bounded).
 * Regression suite for the P4b code review (section E): exported, knob-driven,
 * idempotent, and never destructive past the last checkpoint.
 */
import { describe, expect, it } from 'vitest';
import { MemoryBackend, checkpointKey } from '../../../src-web/systems/persistence/storageBackend';
import {
  checkpointPrefix,
  pruneCheckpoints,
  saveCheckpoint,
} from '../../../src-web/systems/persistence/saveCheckpoint';
import { PERSISTENCE_KNOBS } from '../../../src-web/systems/registry';
import { SLOT_ID, fixedClock, makeBundle, makeSlot, makeTurnRecord } from './factories';

async function seed(backend: MemoryBackend, turns: number): Promise<void> {
  for (let wt = 1; wt <= turns; wt += 1) {
    const base = makeBundle();
    await saveCheckpoint(backend, SLOT_ID, { ...base, meta: { ...base.meta, world_time: wt } }, 'turn_confirm', {
      slotRecord: makeSlot(),
      clock: fixedClock,
    });
  }
}

describe('E - pruneCheckpoints', () => {
  it('test_the_retention_count_is_a_registry_knob', () => {
    expect(PERSISTENCE_KNOBS.max_checkpoints_per_slot).toBeGreaterThanOrEqual(1);
  });

  it('test_the_default_keep_comes_from_the_knob', async () => {
    const backend = new MemoryBackend();
    await seed(backend, 6);
    await pruneCheckpoints(backend, SLOT_ID);
    const remaining = await backend.list(checkpointPrefix(SLOT_ID));
    expect(remaining).toHaveLength(PERSISTENCE_KNOBS.max_checkpoints_per_slot);
  });

  it('test_pruning_keeps_the_newest_checkpoints', async () => {
    const backend = new MemoryBackend();
    await seed(backend, 5);
    expect(await pruneCheckpoints(backend, SLOT_ID, 2)).toBe(3);
    expect(await backend.get(checkpointKey(SLOT_ID, 5))).toBeTruthy();
    expect(await backend.get(checkpointKey(SLOT_ID, 4))).toBeTruthy();
    expect(await backend.get(checkpointKey(SLOT_ID, 3))).toBeUndefined();
  });

  it('test_pruning_is_idempotent', async () => {
    const backend = new MemoryBackend();
    await seed(backend, 5);
    const first = await pruneCheckpoints(backend, SLOT_ID, 2);
    const after = await backend.list(checkpointPrefix(SLOT_ID));
    const second = await pruneCheckpoints(backend, SLOT_ID, 2);
    const third = await pruneCheckpoints(backend, SLOT_ID, 2);
    expect(first).toBe(3);
    expect(second).toBe(0);
    expect(third).toBe(0);
    expect(await backend.list(checkpointPrefix(SLOT_ID))).toEqual(after);
  });

  it('test_pruning_an_empty_or_short_slot_deletes_nothing', async () => {
    const backend = new MemoryBackend();
    expect(await pruneCheckpoints(backend, SLOT_ID, 2)).toBe(0);
    await seed(backend, 1);
    expect(await pruneCheckpoints(backend, SLOT_ID, 2)).toBe(0);
    expect(await backend.list(checkpointPrefix(SLOT_ID))).toHaveLength(1);
  });

  it('test_keep_is_clamped_so_a_slot_never_loses_its_last_checkpoint', async () => {
    const backend = new MemoryBackend();
    await seed(backend, 3);
    await pruneCheckpoints(backend, SLOT_ID, 0);
    expect(await backend.list(checkpointPrefix(SLOT_ID))).toHaveLength(1);
    await pruneCheckpoints(backend, SLOT_ID, -5);
    expect(await backend.list(checkpointPrefix(SLOT_ID))).toHaveLength(1);
  });

  it('test_pruning_touches_only_the_named_slot_and_never_turn_records', async () => {
    const backend = new MemoryBackend();
    await seed(backend, 4);
    const other = makeBundle();
    await saveCheckpoint(backend, 'slot_2', other, 'turn_confirm', {
      slotRecord: makeSlot({ slot_id: 'slot_2' }),
      clock: fixedClock,
      turnRecord: makeTurnRecord(1),
    });
    await pruneCheckpoints(backend, SLOT_ID, 1);
    expect(await backend.list(checkpointPrefix('slot_2'))).toHaveLength(1);
    expect(await backend.list('turn:')).toHaveLength(1);
  });

  it('test_a_hack_write_marks_the_slot_and_the_flag_survives_the_next_save', async () => {
    // "hack flags" live on the slot record / bundle meta, NOT on the Turn
    // Manager - a hack write happens outside the turn cycle (gdd-05 B4).
    const backend = new MemoryBackend();
    const hacked = await saveCheckpoint(backend, SLOT_ID, makeBundle(), 'hack_write', {
      slotRecord: makeSlot(),
      clock: fixedClock,
      turnRecord: makeTurnRecord(1, 1),
    });
    expect(hacked.slotRecord?.hack_mode_used_this_slot).toBe(true);

    const later = await saveCheckpoint(backend, SLOT_ID, makeBundle(), 'turn_confirm', {
      slotRecord: hacked.slotRecord,
      clock: fixedClock,
    });
    expect(later.slotRecord?.hack_mode_used_this_slot).toBe(true);
  });
});
