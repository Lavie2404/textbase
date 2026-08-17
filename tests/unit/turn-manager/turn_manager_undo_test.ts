/**
 * Turn Manager - Undo window (F1/F3, AC-05..AC-12, AC-17).
 * Design doc: production/gdd-integration/gdd-01-turn-contract-ai.md A.2/A.4/A.6.
 */

import { describe, expect, it } from 'vitest';
import {
  TurnManager,
  computeUndoAvailable,
  type UndoConjuncts,
} from '../../../src-web/systems/turn/turnManager';
import { CounterSystem, makeDeps } from './fixtures';

function boot(opts: Parameters<typeof makeDeps>[0] = {}) {
  const { deps, spies } = makeDeps(opts);
  const tm = new TurnManager({ deps });
  const sys = new CounterSystem();
  tm.registry.register(sys, 'counter');
  tm.begin();
  return { tm, deps, spies, sys };
}

const ALL_TRUE: UndoConjuncts = {
  is_newest_turn: true,
  no_newer_turn_confirmed: true,
  has_confirmed_turn: true,
  is_death_turn: false,
  pending_snapshot_valid: true,
};

describe('F3 conjuncts', () => {
  it('test_all_five_conjuncts_true_yields_undo_available', () => {
    expect(computeUndoAvailable(ALL_TRUE)).toBe(true);
  });

  it('test_stale_turn_id_disables_undo', () => {
    expect(computeUndoAvailable({ ...ALL_TRUE, is_newest_turn: false })).toBe(false);
  });

  it('test_newer_confirmed_turn_disables_undo', () => {
    expect(computeUndoAvailable({ ...ALL_TRUE, no_newer_turn_confirmed: false })).toBe(false);
  });

  it('test_no_confirmed_turn_disables_undo', () => {
    expect(computeUndoAvailable({ ...ALL_TRUE, has_confirmed_turn: false })).toBe(false);
  });

  it('test_death_turn_disables_undo', () => {
    expect(computeUndoAvailable({ ...ALL_TRUE, is_death_turn: true })).toBe(false);
  });

  it('test_invalid_pending_snapshot_disables_undo', () => {
    expect(computeUndoAvailable({ ...ALL_TRUE, pending_snapshot_valid: false })).toBe(false);
  });
});

describe('undo lifecycle', () => {
  it('test_undo_is_unavailable_before_any_turn_confirms', () => {
    const { tm } = boot();
    expect(tm.undo_available).toBe(false);
  });

  it('test_undo_becomes_available_only_after_durability_confirmed', async () => {
    const { tm, deps } = boot();
    await tm.submitAction('a', deps);
    expect(tm.undo_available).toBe(true);
    expect(tm.pending_snapshot_valid).toBe(true);
  });

  it('test_world_time_chain_confirm_undo_reconfirm_AC07_AC08', async () => {
    const { deps } = makeDeps();
    const tm = new TurnManager({ deps, initialWorldTime: 10 });
    tm.registry.register(new CounterSystem(), 'counter');
    tm.begin();
    expect(tm.world_time).toBe(10);
    await tm.submitAction('a', deps);
    expect(tm.world_time).toBe(11);
    await tm.undo(deps);
    expect(tm.world_time).toBe(10);
    await tm.submitAction('a', deps);
    expect(tm.world_time).toBe(11);
  });

  it('test_undo_restores_every_registered_system_AC05', async () => {
    const { tm, deps, sys } = boot();
    sys.value = 3;
    await tm.submitAction('a', deps);
    sys.value = 99;
    await tm.undo(deps);
    expect(sys.value).toBe(3);
  });

  it('test_undo_tombstones_the_memory_record', async () => {
    const { tm, deps, spies } = boot();
    await tm.submitAction('a', deps);
    await tm.undo(deps);
    expect(spies.undoneCalls).toBe(1);
  });

  it('test_undo_regenerates_a_fresh_suggestion_set_AC05', async () => {
    const { tm, deps, spies } = boot();
    await tm.submitAction('a', deps);
    await tm.undo(deps);
    expect(spies.regenerated).toBe(1);
    expect(tm.suggestions).toHaveLength(4);
    expect(tm.suggestions[0].text).toBe('Gợi ý mới');
  });

  it('test_undo_does_not_accumulate_AC06', async () => {
    const { tm, deps } = boot();
    await tm.submitAction('a', deps);
    await tm.undo(deps);
    expect(tm.undo_available).toBe(false);
    const second = await tm.undo(deps);
    expect(second).toMatchObject({ ok: false });
  });

  it('test_only_the_newest_confirmed_turn_is_undoable_AC10', async () => {
    const { tm, deps } = boot();
    await tm.submitAction('a', deps);
    const first = tm.last_confirmed_turn_id;
    await tm.submitAction('b', deps);
    expect(tm.last_confirmed_turn_id).not.toBe(first);
    expect(tm.undo_available).toBe(true);
    expect(tm.undoConjuncts().is_newest_turn).toBe(true);
  });

  it('test_undo_with_undo_available_false_changes_nothing_AC17', async () => {
    const { tm, deps, sys } = boot();
    await tm.submitAction('a', deps);
    tm.invalidatePendingSnapshot();
    expect(tm.undo_available).toBe(false);
    const before = sys.restores;
    const r = await tm.undo(deps);
    expect(r).toMatchObject({ ok: false, label: 'not_available' });
    expect(sys.restores).toBe(before);
  });
});

describe('death turns are permanently non-undoable (AC-11)', () => {
  it('test_death_turn_locks_undo_at_lock_time_before_narration', async () => {
    const { tm, deps } = boot({ deathOn: () => true });
    const r = await tm.submitAction('lao vào chỗ chết', deps);
    expect(r.ok).toBe(true);
    expect(tm.is_death_turn).toBe(true);
    expect(tm.undo_available).toBe(false);
  });

  it('test_direct_undo_call_on_a_death_turn_is_rejected_with_its_own_label', async () => {
    const { tm, deps, sys } = boot({ deathOn: () => true });
    await tm.submitAction('lao vào chỗ chết', deps);
    const before = sys.restores;
    const r = await tm.undo(deps);
    expect(r).toMatchObject({ ok: false, label: 'death_turn' });
    expect(sys.restores).toBe(before);
  });

  it('test_death_turn_hands_off_without_generating_suggestions', async () => {
    let handoffs = 0;
    const { deps } = makeDeps({ deathOn: () => true });
    const tm = new TurnManager({ deps: { ...deps, onDeathHandoff: () => (handoffs += 1) } });
    tm.registry.register(new CounterSystem(), 'counter');
    tm.begin();
    await tm.submitAction('chết', { ...deps, onDeathHandoff: () => (handoffs += 1) });
    expect(handoffs).toBe(1);
    expect(tm.suggestions).toHaveLength(0);
    expect(tm.state).toBe('idle');
  });
});

describe('undo persistence failure (A.6)', () => {
  it('test_failed_post_undo_write_keeps_the_turn_confirmed_and_undo_available', async () => {
    let confirmCount = 0;
    const { deps } = makeDeps({
      checkpoint: async (ctx) => {
        confirmCount += 1;
        return ctx.reason === 'post_undo'
          ? { durability_confirmed: false, error_code: 'WRITE_FAILED_QUOTA' }
          : { durability_confirmed: true };
      },
    });
    const tm = new TurnManager({ deps });
    const sys = new CounterSystem();
    tm.registry.register(sys, 'counter');
    tm.begin();
    sys.value = 1;
    await tm.submitAction('a', deps);
    sys.value = 42;
    const r = await tm.undo(deps);
    expect(r).toMatchObject({ ok: false, label: 'persistence_failed' });
    expect(tm.state).toBe('turn_confirmed');
    expect(tm.undo_available).toBe(true);
    // The pre-undo state was rolled forward again, so nothing was lost.
    expect(sys.value).toBe(42);
    expect(confirmCount).toBe(2);
  });
});

describe('AC-12 - undo then re-confirm must recompute (no caching)', () => {
  it('test_reconfirming_the_same_action_after_undo_rolls_the_rng_again', async () => {
    let roll = 100;
    const { tm, deps, spies } = boot({ rollValue: () => (roll += 1) });
    const first = await tm.submitAction('đánh', deps);
    const firstDamage = (first as { record: { locked_result: { fields: Record<string, unknown> } } })
      .record.locked_result.fields.damage;
    expect(spies.resolveCalls).toBe(1);
    await tm.undo(deps);
    const second = await tm.submitAction('đánh', deps);
    const secondDamage = (second as { record: { locked_result: { fields: Record<string, unknown> } } })
      .record.locked_result.fields.damage;
    expect(spies.resolveCalls).toBe(2);
    expect(secondDamage).not.toBe(firstDamage);
    expect(tm.pending_locked_result).toBeNull();
  });
});

describe('reload semantics (AC-14 / AC-15)', () => {
  it('test_persisted_state_never_carries_a_pending_locked_result', async () => {
    const { tm, deps } = boot({ narrate: async () => ({ ok: false, label: 'timeout' }) });
    await tm.submitAction('a', deps);
    expect(tm.pending_locked_result).not.toBeNull();
    const snap = tm.toPersistable();
    expect(Object.keys(snap)).not.toContain('pending_locked_result');
    const fresh = new TurnManager({ deps });
    fresh.registry.register(new CounterSystem(), 'counter');
    fresh.hydrate(snap);
    expect(fresh.pending_locked_result).toBeNull();
    expect(fresh.state).toBe('awaiting_action');
  });

  it('test_reload_at_turn_confirmed_preserves_world_time_and_the_undo_target', async () => {
    const { tm, deps } = boot();
    await tm.submitAction('a', deps);
    const snap = tm.toPersistable();
    const fresh = new TurnManager({ deps });
    fresh.registry.register(new CounterSystem(), 'counter');
    fresh.hydrate(snap);
    expect(fresh.world_time).toBe(tm.world_time);
    expect(fresh.last_confirmed_turn_id).toBe(tm.last_confirmed_turn_id);
    expect(fresh.state).toBe('turn_confirmed');
    // The snapshot array itself is volatile, so Undo needs a fresh capture:
    // it stays unavailable until the next confirm (documented deviation).
    expect(fresh.undo_available).toBe(false);
  });
});
