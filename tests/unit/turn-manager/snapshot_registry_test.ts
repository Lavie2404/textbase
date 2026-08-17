/**
 * Snapshot registry + App-state adapter (ADR-0004, gdd-01 A.3/A.9, plan.md R5).
 */

import { describe, expect, it } from 'vitest';
import { SnapshotRegistry } from '../../../src-web/systems/turn/snapshotRegistry';
import {
  APP_UNDOABLE_FIELDS,
  deepCloneState,
  makeAppStateUndoable,
} from '../../../src-web/systems/turn/undoAppState';
import { CounterSystem } from './fixtures';

describe('snapshot registry', () => {
  it('test_snapshots_are_index_aligned_with_registration_order', () => {
    const reg = new SnapshotRegistry();
    const a = new CounterSystem();
    const b = new CounterSystem();
    a.value = 1;
    b.value = 2;
    expect(reg.register(a, 'a')).toBe(0);
    expect(reg.register(b, 'b')).toBe(1);
    reg.captureAll();
    expect(reg.snapshotAt(0)).toEqual({ value: 1 });
    expect(reg.snapshotAt(1)).toEqual({ value: 2 });
    expect(reg.ids).toEqual(['a', 'b']);
  });

  it('test_capture_does_not_make_the_snapshot_valid_by_itself', () => {
    const reg = new SnapshotRegistry();
    reg.register(new CounterSystem(), 'a');
    reg.captureAll();
    expect(reg.hasSnapshot).toBe(true);
    expect(reg.pendingSnapshotValid).toBe(false);
    reg.markValid();
    expect(reg.pendingSnapshotValid).toBe(true);
  });

  it('test_invalidate_pending_snapshot_is_idempotent', () => {
    const reg = new SnapshotRegistry();
    reg.register(new CounterSystem(), 'a');
    reg.captureAll();
    reg.markValid();
    reg.invalidatePendingSnapshot();
    reg.invalidatePendingSnapshot();
    expect(reg.pendingSnapshotValid).toBe(false);
    expect(reg.hasSnapshot).toBe(true);
  });

  it('test_restore_all_writes_every_system_back', () => {
    const reg = new SnapshotRegistry();
    const a = new CounterSystem();
    reg.register(a, 'a');
    a.value = 7;
    reg.captureAll();
    a.value = 99;
    expect(reg.restoreAll()).toBe(true);
    expect(a.value).toBe(7);
  });

  it('test_restore_without_a_snapshot_warns_and_restores_nothing', () => {
    const warnings: string[] = [];
    const reg = new SnapshotRegistry({ onWarning: (m) => warnings.push(m) });
    const a = new CounterSystem();
    reg.register(a, 'a');
    expect(reg.restoreAll()).toBe(false);
    expect(a.restores).toBe(0);
    expect(warnings).toHaveLength(1);
  });

  it('test_registering_after_a_capture_invalidates_the_pending_snapshot', () => {
    const warnings: string[] = [];
    const reg = new SnapshotRegistry({ onWarning: (m) => warnings.push(m) });
    reg.register(new CounterSystem(), 'a');
    reg.captureAll();
    reg.markValid();
    reg.register(new CounterSystem(), 'b');
    expect(reg.pendingSnapshotValid).toBe(false);
    expect(warnings.join()).toContain('registered after captureAll');
    expect(reg.restoreAll()).toBe(false);
  });

  it('test_detached_capture_and_restore_do_not_touch_the_pending_snapshot', () => {
    const reg = new SnapshotRegistry();
    const a = new CounterSystem();
    reg.register(a, 'a');
    a.value = 1;
    reg.captureAll();
    a.value = 2;
    const detached = reg.captureDetached();
    a.value = 3;
    expect(reg.restoreFrom(detached)).toBe(true);
    expect(a.value).toBe(2);
    expect(reg.snapshotAt(0)).toEqual({ value: 1 });
  });

  it('test_diagnostics_expose_the_alignment_contract', () => {
    const reg = new SnapshotRegistry();
    reg.register(new CounterSystem(), 'a');
    reg.captureAll();
    expect(reg.diagnostics()).toMatchObject({ system_count: 1, snapshot_count: 1, captured: true });
  });
});

describe('app state undo adapter (plan.md risk R5)', () => {
  function makeStore() {
    const store = {
      knowledge: { characters: [{ id: 'p1', exp: 10 }] },
      storyHistory: [{ id: 1, content: 'a' }],
      storySummaries: [] as unknown[],
      currentTurn: 3,
      gameSettings: { theme: 'dark' },
      choices: ['A', 'B'],
    };
    const adapter = makeAppStateUndoable({
      get: () => ({ ...store }),
      set: (next) => Object.assign(store, next),
    });
    return { store, adapter };
  }

  it('test_field_list_enumerates_every_turn_mutable_react_state', () => {
    expect([...APP_UNDOABLE_FIELDS]).toEqual([
      'knowledge',
      'storyHistory',
      'storySummaries',
      'currentTurn',
      'gameSettings',
      'choices',
      'gameMode',
      'activeTrade',
      'adventureTurnCount',
    ]);
  });

  it('test_capture_restore_round_trip_returns_every_field', () => {
    const { store, adapter } = makeStore();
    const snap = adapter.captureSnapshot();
    store.currentTurn = 99;
    store.knowledge = { characters: [{ id: 'p1', exp: 9999 }] };
    store.choices = [];
    adapter.restoreSnapshot(snap);
    expect(store.currentTurn).toBe(3);
    expect(store.knowledge.characters[0].exp).toBe(10);
    expect(store.choices).toEqual(['A', 'B']);
  });

  it('test_snapshot_is_deep_cloned_and_not_a_live_reference', () => {
    const { store, adapter } = makeStore();
    const snap = adapter.captureSnapshot();
    store.knowledge.characters[0].exp = 555;
    adapter.restoreSnapshot(snap);
    expect(store.knowledge.characters[0].exp).toBe(10);
  });

  it('test_restoring_twice_from_one_snapshot_stays_independent', () => {
    const { store, adapter } = makeStore();
    const snap = adapter.captureSnapshot();
    adapter.restoreSnapshot(snap);
    store.knowledge.characters[0].exp = 1;
    adapter.restoreSnapshot(snap);
    expect(store.knowledge.characters[0].exp).toBe(10);
  });

  it('test_a_foreign_snapshot_is_ignored_and_warns', () => {
    const warnings: string[] = [];
    const store = { currentTurn: 1 } as Record<string, unknown>;
    const adapter = makeAppStateUndoable({
      get: () => store as never,
      set: (next) => Object.assign(store, next),
      onWarning: (m) => warnings.push(m),
    });
    adapter.restoreSnapshot({ kind: 'something_else' });
    expect(warnings).toHaveLength(1);
    expect(store.currentTurn).toBe(1);
  });

  it('test_deep_clone_falls_back_to_json_for_non_cloneable_values', () => {
    const warnings: string[] = [];
    const withFn = { a: 1, f: () => 2 };
    const cloned = deepCloneState(withFn, (m) => warnings.push(m));
    expect(cloned.a).toBe(1);
    expect(warnings.length).toBeGreaterThanOrEqual(1);
  });

  it('test_snapshot_carries_a_schema_tag', () => {
    const { adapter } = makeStore();
    const snap = adapter.captureSnapshot() as { kind: string; version: number };
    expect(snap.kind).toBe('app_state');
    expect(snap.version).toBe(1);
    expect(adapter.isSnapshot(snap)).toBe(true);
  });
});
