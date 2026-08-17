/**
 * Turn Manager - the save/load round trip App uses to restore TM state.
 * Regression suite for the P4b code review (section D):
 * `toPersistable()` -> `rehydrate()` must carry turn_id, world_time,
 * death_turn_ids and the confirmed-turn derivation, and must NOT carry the
 * volatile fields.
 *
 * Design doc: gdd-01 A.3 (data model), A.8 AC-14 / AC-15; CR#9 (death lock).
 */

import { describe, expect, it } from 'vitest';
import { TurnManager } from '../../../src-web/systems/turn/turnManager';
import { CounterSystem, makeDeps } from './fixtures';

function boot(opts: Parameters<typeof makeDeps>[0] = {}) {
  const { deps, spies } = makeDeps(opts);
  const tm = new TurnManager({ deps });
  tm.registry.register(new CounterSystem(), 'counter');
  tm.begin();
  return { tm, deps, spies };
}

function freshFrom(tm: TurnManager, deps: Parameters<TurnManager['submitAction']>[1]) {
  const fresh = new TurnManager({ deps });
  fresh.registry.register(new CounterSystem(), 'counter');
  fresh.rehydrate(tm.toPersistable());
  return fresh;
}

describe('D - toPersistable / rehydrate round trip', () => {
  it('test_the_persisted_shape_is_exactly_the_documented_subset', async () => {
    const { tm, deps } = boot();
    await tm.submitAction('a', deps);
    expect(Object.keys(tm.toPersistable()).sort()).toEqual([
      'death_turn_ids',
      'has_confirmed_turn',
      'last_confirmed_turn_id',
      'state',
      'turn_id',
      'world_time',
    ]);
  });

  it('test_turn_id_and_world_time_survive_a_reload', async () => {
    const { tm, deps } = boot();
    await tm.submitAction('a', deps);
    await tm.submitAction('b', deps);
    const fresh = freshFrom(tm, deps);
    expect(fresh.world_time).toBe(tm.world_time);
    expect(fresh.turn_id).toBe(tm.turn_id);
    expect(fresh.last_confirmed_turn_id).toBe(tm.last_confirmed_turn_id);
    expect(fresh.has_confirmed_turn).toBe(true);
  });

  it('test_rehydrate_is_the_documented_alias_of_hydrate', async () => {
    const { tm, deps } = boot();
    await tm.submitAction('a', deps);
    const snap = tm.toPersistable();

    const viaHydrate = new TurnManager({ deps });
    viaHydrate.registry.register(new CounterSystem(), 'counter');
    viaHydrate.hydrate(snap);

    const viaRehydrate = new TurnManager({ deps });
    viaRehydrate.registry.register(new CounterSystem(), 'counter');
    viaRehydrate.rehydrate(snap);

    expect(viaRehydrate.toPersistable()).toEqual(viaHydrate.toPersistable());
  });

  it('test_death_turn_ids_survive_and_keep_undo_locked_after_a_reload', async () => {
    const { tm, deps } = boot({ deathOn: (input) => input.text === 'chết' });
    await tm.submitAction('chết', deps);
    const persisted = tm.toPersistable();
    expect(persisted.death_turn_ids).toEqual([persisted.last_confirmed_turn_id]);

    const fresh = freshFrom(tm, deps);
    expect(fresh.toPersistable().death_turn_ids).toEqual(persisted.death_turn_ids);
    expect(fresh.is_death_turn).toBe(true);
    expect(fresh.undo_available).toBe(false);
  });

  it('test_a_non_death_turn_reloads_with_an_empty_death_set', async () => {
    const { tm, deps } = boot();
    await tm.submitAction('a', deps);
    const fresh = freshFrom(tm, deps);
    expect(fresh.toPersistable().death_turn_ids).toEqual([]);
    expect(fresh.is_death_turn).toBe(false);
  });

  it('test_the_volatile_locked_result_never_crosses_the_boundary', async () => {
    const { tm, deps } = boot({ narrate: async () => ({ ok: false, label: 'timeout' }) });
    await tm.submitAction('a', deps);
    expect(tm.pending_locked_result).not.toBeNull();
    const fresh = freshFrom(tm, deps);
    expect(fresh.pending_locked_result).toBeNull();
    expect(fresh.state).toBe('awaiting_action');
  });

  it('test_the_round_trip_is_stable_when_repeated', async () => {
    const { tm, deps } = boot({ deathOn: (input) => input.text === 'chết' });
    await tm.submitAction('a', deps);
    const once = freshFrom(tm, deps);
    const twice = freshFrom(once, deps);
    expect(twice.toPersistable()).toEqual(once.toPersistable());
  });
});
