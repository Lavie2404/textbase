/**
 * Character Customization Mode - the 3-zone / 3-save commit algorithm
 * (gdd-06 PART C, Core Rule #6a/#6a1/#6a2/#6b/#6c/#6d, #8, C4 flow).
 *
 * AC coverage: AC-17, AC-18, AC-19, AC-29, AC-33, AC-34, AC-40, plus the
 * "no window in which Undo is pressable" constraint of #6a1.
 */

import { describe, expect, it } from 'vitest';
import {
  COMMIT_MESSAGES,
  CUSTOMIZE_ZONES,
  createCommitController,
} from '../../../src-web/systems/customize/commitFlow';
import { HACK_KNOBS } from '../../../src-web/systems/registry';
import { commitSpy } from './fixtures';

const progressRequest = {
  zone: 'progress' as const,
  type: 'progress' as const,
  values: { level: 50, current_exp: 0, state: 'Tu Luyện Thường' },
};

describe('validation gate - steps 1..3', () => {
  it('test_invalid_drafts_apply_nothing_write_nothing_and_take_no_lock', () => {
    const spy = commitSpy({ valid: false });
    const controller = createCommitController(spy.deps);
    return controller.commit(progressRequest).then((result) => {
      expect(result.ok).toBe(false);
      expect(result.status).toBe('invalid');
      expect(result.errors[0].code).toBe('test_invalid');
      expect(spy.calls.write).toBe(0);
      expect(spy.calls.apply).toBe(0);
      expect(spy.calls.invalidate).toBe(0);
      expect(spy.calls.setHackModeUsed).toBe(0);
      expect(spy.logs).toEqual([]);
      expect(controller.inFlight).toBe(false);
    });
  });

  it('test_a_failed_zone_leaves_the_other_zones_untouched', async () => {
    const spy = commitSpy({ valid: false });
    const controller = createCommitController(spy.deps);
    const result = await controller.commit({ ...progressRequest, zone: 'base_stats' });
    expect(result.zone).toBe('base_stats');
    for (const zone of CUSTOMIZE_ZONES) {
      expect(controller.buttonEnabled(zone)).toBe(true);
    }
  });
});

describe('successful commit - step 6 order (AC-17, AC-19, AC-33, AC-40)', () => {
  it('test_the_effects_only_happen_after_the_durable_write_succeeds', async () => {
    const spy = commitSpy();
    const controller = createCommitController(spy.deps);
    const result = await controller.commit(progressRequest);

    expect(result.ok).toBe(true);
    expect(result.status).toBe('ok');
    expect(result.message).toBe(COMMIT_MESSAGES.written);
    expect(spy.calls.write).toBe(1);
    expect(spy.calls.apply).toBe(1);
    expect(spy.calls.setHackModeUsed).toBe(1);
    expect(spy.logs.length).toBe(1);
  });

  it('test_the_checkpoint_payload_carries_reason_hack_write_and_the_flag', async () => {
    const spy = commitSpy();
    const controller = createCommitController(spy.deps);
    await controller.commit(progressRequest);

    expect(spy.payloads[0]).toMatchObject({
      reason: 'hack_write',
      zone: 'progress',
      type: 'progress',
      world_time: 42,
      hack_seq: 1,
      hack_mode_used_this_slot: true,
    });
  });

  it('test_world_time_is_never_advanced_by_a_hack_write', async () => {
    const spy = commitSpy();
    const controller = createCommitController(spy.deps);
    await controller.commit(progressRequest);
    expect(spy.state.worldTime).toBe(42);
    expect(spy.payloads[0].world_time).toBe(42);
  });

  it('test_hack_seq_increments_per_commit_inside_the_same_world_time', async () => {
    const spy = commitSpy();
    const controller = createCommitController(spy.deps);
    await controller.commit(progressRequest);
    spy.state.now += HACK_KNOBS.SUBMIT_DEBOUNCE_MS;
    await controller.commit(progressRequest);
    expect(spy.payloads.map((p) => p.hack_seq)).toEqual([1, 2]);
    expect(controller.hackSeq).toBe(2);
  });

  it('test_n_commits_emit_n_hack_write_log_entries', async () => {
    const spy = commitSpy();
    const controller = createCommitController(spy.deps);
    for (let i = 0; i < 3; i += 1) {
      await controller.commit({ ...progressRequest, zone: CUSTOMIZE_ZONES[i] });
    }
    expect(spy.logs.length).toBe(3);
    expect(spy.logs.every((entry) => entry.tag === 'hack_write')).toBe(true);
    expect(spy.logs.map((entry) => entry.zone)).toEqual(['progress', 'base_stats', 'entries']);
  });

  it('test_a_delete_commit_records_its_type_and_entry_ids', async () => {
    const spy = commitSpy();
    const controller = createCommitController(spy.deps);
    await controller.commit({
      zone: 'entries',
      type: 'delete',
      values: null,
      entry_ids: ['custom_skill', 'custom_skill:0'],
    });
    expect(spy.logs[0].type).toBe('delete');
    expect(spy.logs[0].entry_ids).toEqual(['custom_skill', 'custom_skill:0']);
  });

  it('test_the_transparency_flag_is_set_in_memory_and_never_cleared', async () => {
    const spy = commitSpy();
    const controller = createCommitController(spy.deps);
    expect(controller.hackModeUsedThisSlot).toBe(false);
    await controller.commit(progressRequest);
    expect(controller.hackModeUsedThisSlot).toBe(true);
    spy.state.now += HACK_KNOBS.SUBMIT_DEBOUNCE_MS;
    spy.state.valid = false;
    await controller.commit(progressRequest);
    expect(controller.hackModeUsedThisSlot).toBe(true);
  });
});

describe('undo snapshot invalidation - step 6b (AC-34)', () => {
  it('test_invalidate_is_called_exactly_once_when_a_snapshot_is_pending', async () => {
    const spy = commitSpy({ pendingSnapshot: true });
    const controller = createCommitController(spy.deps);
    const result = await controller.commit(progressRequest);
    expect(spy.calls.invalidate).toBe(1);
    expect(result.undo_locked).toBe(true);
    expect(result.message).toContain(COMMIT_MESSAGES.undoLocked);
  });

  it('test_invalidate_is_not_called_at_all_when_no_snapshot_is_pending', async () => {
    const spy = commitSpy({ pendingSnapshot: false });
    const controller = createCommitController(spy.deps);
    const result = await controller.commit(progressRequest);
    expect(spy.calls.invalidate).toBe(0);
    expect(result.undo_locked).toBe(false);
    expect(result.message).toBe(COMMIT_MESSAGES.written);
  });

  it('test_a_second_hack_write_in_the_same_window_leaves_post_conditions_unchanged', async () => {
    const spy = commitSpy({ pendingSnapshot: true });
    const controller = createCommitController(spy.deps);
    await controller.commit(progressRequest);
    spy.state.now += HACK_KNOBS.SUBMIT_DEBOUNCE_MS;
    const second = await controller.commit(progressRequest);
    expect(second.ok).toBe(true);
    expect(second.undo_locked).toBe(false);
    expect(spy.calls.invalidate).toBe(1);
    expect(spy.state.pendingSnapshot).toBe(false);
  });
});

describe('in-flight lock - step 4 / #6a1 (AC-29)', () => {
  it('test_undo_is_never_pressable_while_a_write_is_in_flight', async () => {
    let release: (value: { ok: boolean }) => void = () => {};
    const spy = commitSpy();
    spy.deps.writeCheckpoint = () =>
      new Promise((resolve) => {
        release = resolve;
      });
    const controller = createCommitController(spy.deps);

    expect(controller.undoPressable(true)).toBe(true);
    const pending = controller.commit(progressRequest);
    expect(controller.inFlight).toBe(true);
    expect(controller.undoPressable(true)).toBe(false);
    for (const zone of CUSTOMIZE_ZONES) {
      expect(controller.buttonEnabled(zone)).toBe(false);
    }

    release({ ok: true });
    await pending;
    expect(controller.inFlight).toBe(false);
    expect(controller.undoPressable(true)).toBe(true);
  });

  it('test_a_second_press_during_the_in_flight_window_is_rejected', async () => {
    let release: (value: { ok: boolean }) => void = () => {};
    const spy = commitSpy();
    spy.deps.writeCheckpoint = () =>
      new Promise((resolve) => {
        release = resolve;
      });
    const controller = createCommitController(spy.deps);
    const pending = controller.commit(progressRequest);
    const rejected = await controller.commit({ ...progressRequest, zone: 'base_stats' });
    expect(rejected.status).toBe('locked');
    expect(rejected.message).toBe(COMMIT_MESSAGES.inFlight);
    release({ ok: true });
    await pending;
  });

  it('test_double_tapping_one_button_yields_exactly_one_commit', async () => {
    const spy = commitSpy();
    const controller = createCommitController(spy.deps);
    await controller.commit(progressRequest);
    const second = await controller.commit(progressRequest); // same clock instant
    expect(second.status).toBe('debounced');
    expect(spy.calls.write).toBe(1);
  });

  it('test_the_debounce_is_per_button_not_global', async () => {
    const spy = commitSpy();
    const controller = createCommitController(spy.deps);
    await controller.commit(progressRequest);
    const otherZone = await controller.commit({ ...progressRequest, zone: 'base_stats' });
    expect(otherZone.ok).toBe(true);
    expect(spy.calls.write).toBe(2);
  });

  it('test_the_debounce_expires_after_submit_debounce_ms', async () => {
    const spy = commitSpy();
    const controller = createCommitController(spy.deps);
    await controller.commit(progressRequest);
    spy.state.now += HACK_KNOBS.SUBMIT_DEBOUNCE_MS;
    const again = await controller.commit(progressRequest);
    expect(again.ok).toBe(true);
  });
});

describe('failed durable write - step 5', () => {
  it('test_nothing_is_applied_invalidated_flagged_or_logged', async () => {
    const spy = commitSpy({ writeOk: false, pendingSnapshot: true });
    const controller = createCommitController(spy.deps);
    const result = await controller.commit(progressRequest);

    expect(result.ok).toBe(false);
    expect(result.status).toBe('write_failed');
    expect(result.message).toContain('QUOTA_EXCEEDED');
    expect(spy.calls.apply).toBe(0);
    expect(spy.calls.invalidate).toBe(0);
    expect(spy.calls.setHackModeUsed).toBe(0);
    expect(spy.logs).toEqual([]);
    expect(controller.hackModeUsedThisSlot).toBe(false);
    expect(controller.hackSeq).toBe(0);
  });

  it('test_a_thrown_backend_error_is_reported_not_propagated', async () => {
    const spy = commitSpy({ throwOnWrite: true });
    const controller = createCommitController(spy.deps);
    const result = await controller.commit(progressRequest);
    expect(result.status).toBe('write_failed');
    expect(result.message).toContain('backend exploded');
    expect(controller.inFlight).toBe(false);
  });

  it('test_the_buttons_unlock_after_a_failure', async () => {
    const spy = commitSpy({ writeOk: false });
    const controller = createCommitController(spy.deps);
    await controller.commit(progressRequest);
    for (const zone of CUSTOMIZE_ZONES) {
      expect(controller.buttonEnabled(zone)).toBe(true);
    }
    expect(controller.undoPressable(true)).toBe(true);
  });

  it('test_a_retry_after_a_failure_succeeds_and_reuses_the_same_hack_seq', async () => {
    const spy = commitSpy({ writeOk: false });
    const controller = createCommitController(spy.deps);
    await controller.commit(progressRequest);
    spy.state.writeOk = true;
    spy.state.now += HACK_KNOBS.SUBMIT_DEBOUNCE_MS;
    const result = await controller.commit(progressRequest);
    expect(result.ok).toBe(true);
    expect(result.hack_seq).toBe(1);
  });
});

describe('panel lifecycle invariants (AC-18)', () => {
  it('test_the_controller_exposes_no_revert_path', () => {
    const controller = createCommitController(commitSpy().deps);
    expect((controller as unknown as Record<string, unknown>).revert).toBeUndefined();
    expect((controller as unknown as Record<string, unknown>).rollback).toBeUndefined();
  });

  it('test_reset_is_a_test_only_helper_that_clears_the_session_state', async () => {
    const spy = commitSpy();
    const controller = createCommitController(spy.deps);
    await controller.commit(progressRequest);
    controller.reset();
    expect(controller.hackSeq).toBe(0);
    expect(controller.hackModeUsedThisSlot).toBe(false);
    expect(controller.inFlight).toBe(false);
  });
});
