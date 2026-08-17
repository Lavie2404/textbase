/**
 * Turn Manager - phase order, budget, failure handling.
 * Design doc: production/gdd-integration/gdd-01-turn-contract-ai.md A.2/A.4/A.8.
 */

import { describe, expect, it } from 'vitest';
import {
  ACCEPTING_STATES,
  TM_TRANSITIONS,
  TurnManager,
  callsPerTurn,
  emptyCallTypeSet,
  overrideTwoSlots,
  padSuggestions,
  transitionAllowed,
} from '../../../src-web/systems/turn/turnManager';
import { CounterSystem, failingNarration, makeDeps } from './fixtures';

function boot(opts: Parameters<typeof makeDeps>[0] = {}) {
  const { deps, spies } = makeDeps(opts);
  const tm = new TurnManager({ deps });
  const sys = new CounterSystem();
  tm.registry.register(sys, 'counter');
  tm.begin();
  return { tm, deps, spies, sys };
}

describe('turn manager state machine', () => {
  it('test_boot_state_is_idle_until_begin', () => {
    const tm = new TurnManager({ deps: makeDeps().deps });
    expect(tm.state).toBe('idle');
    tm.begin();
    expect(tm.state).toBe('awaiting_action');
  });

  it('test_transition_table_rejects_unlisted_edges', () => {
    expect(transitionAllowed('awaiting_action', 'resolving')).toBe(true);
    expect(transitionAllowed('awaiting_action', 'turn_confirmed')).toBe(false);
    expect(TM_TRANSITIONS.committing).toContain('turn_confirmed');
    expect(ACCEPTING_STATES).not.toContain('resolving');
  });

  it('test_awaiting_action_renders_exactly_four_suggestions', () => {
    const { tm } = boot();
    expect(tm.suggestions).toHaveLength(4);
  });
});

describe('phase order (AC-04)', () => {
  it('test_confirmed_turn_runs_lock_narrate_memory_checkpoint_commit_in_order', async () => {
    const { tm, deps, spies } = boot();
    const r = await tm.submitAction('Nhìn quanh', deps);
    expect(r.ok).toBe(true);
    expect(spies.order).toEqual(['lock', 'narrate', 'memory', 'checkpoint', 'commit']);
  });

  it('test_snapshot_is_captured_before_any_mutation', async () => {
    const { tm, deps, sys } = boot();
    await tm.submitAction('Nhìn quanh', deps);
    expect(sys.captures).toBe(1);
  });

  it('test_one_confirmed_turn_advances_world_time_by_exactly_one', async () => {
    const { tm, deps } = boot();
    expect(tm.world_time).toBe(0);
    await tm.submitAction('a', deps);
    expect(tm.world_time).toBe(1);
    await tm.submitAction('b', deps);
    expect(tm.world_time).toBe(2);
  });
});

describe('AI call budget F2 (AC-09/AC-15)', () => {
  it('test_normal_turn_uses_one_narration_call', async () => {
    const { tm, deps } = boot();
    await tm.submitAction('a', deps);
    expect(tm.calls.narration_call).toBe(true);
    expect(tm.calls_per_turn).toBe(1);
  });

  it('test_marking_suggestion_calls_reaches_three_and_never_more', () => {
    const { tm } = boot();
    tm.markCall('narration_call');
    tm.markCall('suggestion_call');
    expect(tm.markCall('suggestion_retry_call')).toBe(3);
    expect(tm.markCall('suggestion_retry_call')).toBe(3);
  });

  it('test_resubmit_after_failure_does_not_increment_calls_per_turn', async () => {
    const { tm, deps } = boot({ narrate: failingNarration('network_error') });
    const first = await tm.submitAction('a', deps);
    expect(first.ok).toBe(false);
    expect(tm.calls_per_turn).toBe(1);
    await tm.submitAction('a', deps);
    expect(tm.calls_per_turn).toBe(1);
  });

  it('test_calls_per_turn_helper_counts_a_type_set', () => {
    const set = emptyCallTypeSet();
    expect(callsPerTurn(set)).toBe(0);
    set.narration_call = true;
    set.suggestion_call = true;
    expect(callsPerTurn(set)).toBe(2);
  });
});

describe('failure handling (AC-13 / AC-13b / AC-13c)', () => {
  it('test_narration_failure_leaves_world_time_and_turn_id_untouched', async () => {
    const { tm, deps } = boot({ narrate: failingNarration('timeout') });
    const before = tm.world_time;
    const r = await tm.submitAction('a', deps);
    expect(r.ok).toBe(false);
    expect(tm.world_time).toBe(before);
    expect(tm.state).toBe('failed');
    const idAfterFail = tm.turn_id;
    await tm.submitAction('a', deps);
    expect(tm.turn_id).toBe(idAfterFail);
  });

  it('test_pending_locked_result_is_reused_byte_for_byte_on_same_action_AC13b_c', async () => {
    let roll = 0;
    const { tm, deps, spies } = boot({
      narrate: failingNarration('timeout'),
      rollValue: () => ++roll,
    });
    await tm.submitAction('đánh', deps);
    const pending = tm.pending_locked_result;
    expect(spies.resolveCalls).toBe(1);
    await tm.submitAction('đánh', deps);
    expect(spies.resolveCalls).toBe(1);
    expect(tm.pending_locked_result).toBe(pending);
  });

  it('test_different_action_cancels_the_pending_lock_AC13b_b', async () => {
    const { tm, deps, spies } = boot({ narrate: failingNarration('timeout') });
    await tm.submitAction('đánh', deps);
    expect(spies.resolveCalls).toBe(1);
    await tm.submitAction('chạy', deps);
    expect(spies.resolveCalls).toBe(2);
  });

  it('test_busy_from_the_ai_layer_is_logged_under_its_own_label_AC13c', async () => {
    const { tm, deps, spies } = boot({ narrate: failingNarration('BUSY') });
    const r = await tm.submitAction('a', deps);
    expect(r.ok).toBe(false);
    expect((r as { label: string }).label).toBe('caller_bug_busy');
    expect(spies.logs.some((l) => l.label === 'caller_bug_busy')).toBe(true);
  });

  it('test_rollback_restores_every_registered_system_on_narration_failure', async () => {
    const { tm, deps, sys } = boot({ narrate: failingNarration('timeout') });
    sys.value = 5;
    await tm.submitAction('a', deps);
    expect(sys.restores).toBe(1);
    expect(sys.value).toBe(5);
  });

  it('test_lock_failure_is_reported_as_its_own_stage', async () => {
    const { deps, spies } = makeDeps();
    const tm = new TurnManager({ deps });
    tm.registry.register(new CounterSystem(), 'counter');
    tm.begin();
    const throwing = {
      ...deps,
      resolveMechanics: () => {
        throw new Error('exp module blew up');
      },
    };
    const r = await tm.submitAction('a', throwing);
    expect(r).toMatchObject({ ok: false, stage: 'lock', label: 'lock_failed' });
    expect(spies.narrateCalls).toBe(0);
  });
});

describe('durability gate (AC-04 / gdd-05 R1)', () => {
  it('test_commit_is_blocked_when_durability_is_not_confirmed', async () => {
    const { tm, deps, spies } = boot({
      checkpoint: async () => ({ durability_confirmed: false, error_code: 'WRITE_FAILED_QUOTA' }),
    });
    const r = await tm.submitAction('a', deps);
    expect(r).toMatchObject({ ok: false, stage: 'persistence', label: 'WRITE_FAILED_QUOTA' });
    expect(tm.world_time).toBe(0);
    expect(tm.undo_available).toBe(false);
    expect(spies.removeCalls).toBe(1);
    expect(spies.commits).toBe(0);
  });

  it('test_write_only_retry_does_not_burn_a_second_narration_call', async () => {
    let ok = false;
    const { tm, deps, spies } = boot({
      checkpoint: async () =>
        ok
          ? { durability_confirmed: true }
          : { durability_confirmed: false, error_code: 'WRITE_FAILED_QUOTA' },
    });
    await tm.submitAction('a', deps);
    expect(spies.narrateCalls).toBe(1);
    ok = true;
    const r = await tm.submitAction('a', deps);
    expect(r.ok).toBe(true);
    expect(spies.narrateCalls).toBe(1);
    expect(spies.checkpointCalls).toBe(2);
  });

  it('test_escalation_is_flagged_after_max_write_retries', async () => {
    const { deps } = makeDeps({
      checkpoint: async () => ({ durability_confirmed: false, error_code: 'WRITE_FAILED_QUOTA' }),
    });
    const tm = new TurnManager({ deps, maxWriteRetry: 2 });
    tm.registry.register(new CounterSystem(), 'counter');
    tm.begin();
    await tm.submitAction('a', deps);
    const second = await tm.submitAction('a', deps);
    expect((second as { detail?: string }).detail).toBe('escalate');
  });
});

describe('input lock / BUSY (AC-18)', () => {
  it('test_second_submit_while_resolving_is_rejected_not_queued', async () => {
    let release: (() => void) | null = null;
    const gate = new Promise<void>((res) => {
      release = res;
    });
    const { tm, deps, spies } = boot({
      narrate: async () => {
        await gate;
        return { ok: true, text: 'xong' };
      },
    });
    const first = tm.submitAction('a', deps);
    const second = await tm.submitAction('b', deps);
    expect(second).toMatchObject({ ok: false, stage: 'gate', label: 'BUSY' });
    expect(tm.input_locked).toBe(true);
    (release as unknown as () => void)();
    await first;
    expect(spies.narrateCalls).toBe(1);
    expect(tm.input_locked).toBe(false);
  });
});

describe('suggestion padding (AC-02 / AC-16)', () => {
  it('test_padding_always_returns_four_unique_entries', () => {
    expect(padSuggestions([])).toHaveLength(4);
    expect(padSuggestions([{ text: 'A', envelope: null, source: 'ai' }])).toHaveLength(4);
    const dup = [
      { text: 'A', envelope: null, source: 'ai' as const },
      { text: 'A', envelope: null, source: 'ai' as const },
    ];
    const padded = padSuggestions(dup);
    expect(new Set(padded.map((s) => s.text)).size).toBe(4);
  });

  it('test_pending_fate_overrides_exactly_two_slots', () => {
    const base = padSuggestions([]);
    const forced = [
      { text: 'Kết liễu Lý Mỗ', envelope: 'finish', source: 'ai' as const },
      { text: 'Tha mạng Lý Mỗ', envelope: 'spare', source: 'ai' as const },
    ];
    const out = overrideTwoSlots(base, forced);
    expect(out).toHaveLength(4);
    expect(out[0].source).toBe('pending_fate');
    expect(out[1].source).toBe('pending_fate');
    expect(out[2]).toEqual(base[2]);
  });
});
