/**
 * Unit tests - the two-tier store itself.
 * AC ids: gdd-04 A8 (AC-01..AC-07, AC-11, AC-16, AC-20..AC-27, AC-29..AC-32).
 */
import { describe, expect, it } from 'vitest';
import { WorldMemory, gddInterface } from '../../../src-web/systems/worldMemory/worldMemory';
import { makeTurn, makeTurns } from './factories';

function seed(count: number, recency = 5): WorldMemory {
  const wm = new WorldMemory({ recencyWindowTurns: recency });
  for (const turn of makeTurns(count)) wm.append(turn);
  return wm;
}

describe('append / undo core rules (AC-01, AC-02, AC-07, AC-27)', () => {
  it('test_append_stores_the_record_verbatim', () => {
    const wm = new WorldMemory();
    const turn = makeTurn(1, { narration: 'Gió thổi qua đỉnh núi.' });
    wm.append(turn);
    expect(wm.getTurn(1)).toEqual(turn);
  });
  it('test_duplicate_turn_id_is_not_appended_twice', () => {
    const wm = new WorldMemory();
    wm.append(makeTurn(1));
    const second = wm.append(makeTurn(1));
    expect(second.appended).toBe(false);
    expect(wm.totalTurns()).toBe(1);
  });
  it('test_undo_hard_deletes_and_lookup_reports_not_found', () => {
    const wm = seed(3);
    expect(wm.undoLast()?.turn_id).toBe(3);
    expect(wm.getTurn(3)).toBeNull();
    expect(wm.getProcessingState(3)).toBeNull();
  });
  it('test_undo_of_unknown_turn_is_a_noop', () => {
    const wm = seed(2);
    expect(wm.undo(99)).toBeNull();
    expect(wm.totalTurns()).toBe(2);
  });
  it('test_double_undo_never_throws', () => {
    const wm = seed(1);
    wm.undoLast();
    expect(() => wm.undoLast()).not.toThrow();
    expect(wm.undoLast()).toBeNull();
  });
  it('test_undo_lowers_last_confirmed_turn_id', () => {
    const wm = seed(4);
    wm.undoLast();
    expect(wm.lastConfirmedTurn()).toBe(3);
  });
  it('test_reads_on_an_empty_store_never_throw', () => {
    const wm = new WorldMemory();
    expect(wm.getTurn(1)).toBeNull();
    expect(wm.totalTurns()).toBe(0);
    expect(wm.getFactsByEntity('npc_a')).toEqual([]);
    expect(() => wm.getTurnPage(1, 5, 'older')).not.toThrow();
    expect(() => wm.buildContext([])).not.toThrow();
  });
  it('test_write_and_extract_are_atomic_after_twenty_confirms', () => {
    // AC-27: 20 confirms, recency 5 -> log 20, window 16..20, facts for 1..15.
    const wm = new WorldMemory({ recencyWindowTurns: 5 });
    for (const turn of makeTurns(20, 1)) {
      wm.append(makeTurn(turn.turn_id, { fields: { affinity_delta_npc_a: 1 } }));
    }
    expect(wm.totalTurns()).toBe(20);
    expect(wm.recencyWindow().map((r) => r.turn_id)).toEqual([16, 17, 18, 19, 20]);
    expect(wm.getFactsByEntity('npc_a')).toHaveLength(15);
    expect(wm.getProcessingState(15)).toEqual({ processed: true, fact_count: 1 });
    expect(wm.getProcessingState(16)).toEqual({ processed: false, fact_count: 0 });
  });
  it('test_zero_fact_turn_is_processed_with_zero_count', () => {
    const wm = seed(7, 2);
    expect(wm.getProcessingState(1)).toEqual({ processed: true, fact_count: 0 });
  });
  it('test_evicted_turn_remains_byte_identical_in_the_full_log', () => {
    const original = makeTurn(1, { narration: 'Nguyên văn.' , fields: { hp_delta: -3 } });
    const wm = new WorldMemory({ recencyWindowTurns: 1 });
    wm.append(original);
    wm.append(makeTurn(2));
    wm.append(makeTurn(3));
    expect(wm.getTurn(1)).toEqual(original);
  });
});

describe('counters and eviction (AC-29, AC-32, AC-16)', () => {
  it('test_total_turns_is_97_after_100_confirms_with_3_undos', () => {
    const wm = new WorldMemory({ recencyWindowTurns: 5 });
    let confirmed = 0;
    for (let i = 1; i <= 100; i += 1) {
      wm.append(makeTurn(i));
      confirmed += 1;
      if (confirmed === 20 || confirmed === 50 || confirmed === 80) wm.undo(i);
    }
    expect(wm.totalTurns()).toBe(97);
  });
  it('test_fresh_slot_total_is_zero', () => {
    expect(new WorldMemory().totalTurns()).toBe(0);
  });
  it('test_undo_does_not_pull_an_evicted_turn_back_to_verbatim', () => {
    const wm = seed(20, 8);
    expect(wm.recencyWindow().some((r) => r.turn_id === 12)).toBe(false);
    wm.undoLast();
    expect(wm.recencyWindow().some((r) => r.turn_id === 12)).toBe(false);
  });
  it('test_next_fact_id_is_monotonic_across_evictions', () => {
    const wm = new WorldMemory({ recencyWindowTurns: 1 });
    wm.append(makeTurn(1, { fields: { affinity_delta_a: 1 } }));
    wm.append(makeTurn(2, { fields: { affinity_delta_b: 1 } }));
    wm.append(makeTurn(3, { fields: { affinity_delta_c: 1 } }));
    expect(wm.peekNextFactId()).toBe(3);
  });
});

describe('paging (AC-23..AC-26)', () => {
  it('test_older_page_excludes_the_anchor', () => {
    const wm = seed(40, 8);
    const page = wm.getTurnPage(30, 5, 'older');
    expect(page.records.map((r) => r.turn_id)).toEqual([25, 26, 27, 28, 29]);
    expect(page.has_more).toBe(true);
  });
  it('test_newer_page_stops_at_the_end_without_throwing', () => {
    const wm = seed(50, 8);
    const page = wm.getTurnPage(47, 10, 'newer');
    expect(page.records.map((r) => r.turn_id)).toEqual([48, 49, 50]);
    expect(page.has_more).toBe(false);
  });
  it('test_vanished_anchor_behaves_as_a_virtual_timestamp', () => {
    const wm = seed(40, 8);
    wm.undo(30);
    const page = wm.getTurnPage(30, 3, 'older');
    expect(page.records.map((r) => r.turn_id)).toEqual([27, 28, 29]);
  });
  it('test_count_beyond_the_remainder_returns_what_exists', () => {
    const wm = seed(3, 8);
    const page = wm.getTurnPage(3, 100, 'older');
    expect(page.records).toHaveLength(2);
    expect(page.has_more).toBe(false);
  });
  it('test_zero_count_returns_nothing_and_reports_more', () => {
    const wm = seed(5, 8);
    expect(wm.getTurnPage(5, 0, 'older')).toEqual({ records: [], has_more: true });
  });
});

describe('fact queries and structural references (AC-04, AC-22, AC-30)', () => {
  it('test_query_returns_only_the_requested_entity', () => {
    const wm = new WorldMemory({ recencyWindowTurns: 1 });
    wm.append(makeTurn(1, { fields: { affinity_delta_npc_a: 5 } }));
    wm.append(makeTurn(2, { fields: { affinity_delta_npc_b: 5 } }));
    wm.append(makeTurn(3));
    expect(wm.getFactsByEntity('npc_a')).toHaveLength(1);
    expect(wm.getFactsByEntity('npc_a')[0].entity_id).toBe('npc_a');
  });
  it('test_unknown_entity_returns_empty_set', () => {
    expect(seed(3).getFactsByEntity('ghost')).toEqual([]);
  });
  it('test_get_facts_by_entity_is_not_truncated_but_selected_facts_is', () => {
    const wm = new WorldMemory({ recencyWindowTurns: 1, maxFactsPerEntity: 8 });
    for (let i = 1; i <= 24; i += 1) wm.append(makeTurn(i, { fields: { affinity_delta_npc_a: i } }));
    expect(wm.getFactsByEntity('npc_a').length).toBeGreaterThan(8);
    expect(wm.selectedFacts('npc_a')).toHaveLength(8);
  });
  it('test_dead_npc_facts_stay_queryable', () => {
    const wm = new WorldMemory({ recencyWindowTurns: 1 });
    wm.append(makeTurn(1, { fields: { death_flag_npc_a: true } }));
    wm.append(makeTurn(2));
    wm.append(makeTurn(3));
    expect(wm.getFactsByEntity('npc_a')).toHaveLength(1);
  });
  it('test_referenced_in_world_memory_is_structural_for_evicted_turns', () => {
    const wm = new WorldMemory({ recencyWindowTurns: 1 });
    wm.append(makeTurn(1, { fields: { affinity_delta_npc_a: 3 } }));
    wm.append(makeTurn(2));
    wm.append(makeTurn(3));
    expect(wm.referencedInWorldMemory('npc_a')).toBe(true);
  });
  it('test_referenced_in_world_memory_sees_in_window_turns_too', () => {
    const wm = new WorldMemory({ recencyWindowTurns: 8 });
    wm.append(makeTurn(1, { fields: { witnesses_npc_a: ['item_sword'] } }));
    expect(wm.referencedInWorldMemory('item_sword')).toBe(true);
  });
  it('test_referenced_in_world_memory_never_matches_narration_text', () => {
    const wm = new WorldMemory();
    wm.append(makeTurn(1, { narration: 'Thanh kiếm item_sword lóe sáng.' }));
    expect(wm.referencedInWorldMemory('item_sword')).toBe(false);
  });
  it('test_unknown_entry_id_is_false', () => {
    expect(seed(3).referencedInWorldMemory('nothing')).toBe(false);
    expect(seed(3).referencedInWorldMemory('')).toBe(false);
  });
});

describe('serialization, snapshots and recovery (AC-17, AC-20, AC-21a, AC-21b)', () => {
  it('test_round_trip_preserves_both_tiers', () => {
    const wm = new WorldMemory({ recencyWindowTurns: 3 });
    for (let i = 1; i <= 10; i += 1) wm.append(makeTurn(i, { fields: { affinity_delta_npc_a: i } }));
    const restored = WorldMemory.fromJSON(wm.toJSON(), { recencyWindowTurns: 3 });
    expect(restored.toJSON()).toEqual(wm.toJSON());
    expect(restored.totalTurns()).toBe(10);
    expect(restored.getFactsByEntity('npc_a')).toHaveLength(7);
  });
  it('test_context_view_is_read_from_the_save_not_regenerated_under_new_knobs', () => {
    const wm = new WorldMemory({ recencyWindowTurns: 3 });
    for (let i = 1; i <= 10; i += 1) wm.append(makeTurn(i));
    const reloaded = WorldMemory.fromJSON(wm.toJSON(), { recencyWindowTurns: 9 });
    expect(reloaded.recencyWindow().map((r) => r.turn_id)).toEqual([8, 9, 10]);
  });
  it('test_knob_change_is_forward_only', () => {
    const wm = new WorldMemory({ recencyWindowTurns: 3 });
    for (let i = 1; i <= 10; i += 1) wm.append(makeTurn(i));
    const widened = WorldMemory.fromJSON(wm.toJSON(), { recencyWindowTurns: 9 });
    widened.append(makeTurn(11));
    expect(widened.recencyWindow().some((r) => r.turn_id === 5)).toBe(false);
  });
  it('test_batch_extraction_equals_sequential_extraction', () => {
    const records = Array.from({ length: 20 }, (_, i) =>
      makeTurn(i + 1, { fields: { affinity_delta_npc_a: i + 1 } }),
    );
    const sequential = new WorldMemory({ recencyWindowTurns: 5 });
    for (const r of records) sequential.append(r);
    const batch = WorldMemory.fromTurnRecords(records, { recencyWindowTurns: 5 });
    expect(batch.getFactsByEntity('npc_a')).toEqual(sequential.getFactsByEntity('npc_a'));
    expect(batch.recencyWindow().map((r) => r.turn_id)).toEqual(
      sequential.recencyWindow().map((r) => r.turn_id),
    );
    expect(batch.totalTurns()).toBe(sequential.totalTurns());
  });
  it('test_snapshot_restore_undoes_an_append', () => {
    const wm = seed(5, 3);
    const snapshot = wm.captureSnapshot();
    wm.append(makeTurn(6, { fields: { affinity_delta_npc_a: 4 } }));
    expect(wm.totalTurns()).toBe(6);
    wm.restoreSnapshot(snapshot);
    expect(wm.totalTurns()).toBe(5);
    expect(wm.getTurn(6)).toBeNull();
  });
  it('test_restore_of_a_null_snapshot_is_a_noop', () => {
    const wm = seed(2);
    wm.restoreSnapshot(null);
    expect(wm.totalTurns()).toBe(2);
  });
  it('test_snapshot_is_a_deep_copy', () => {
    const wm = seed(2);
    const snapshot = wm.captureSnapshot() as { full_log: { narration_text: string }[] };
    snapshot.full_log[0].narration_text = 'mutated';
    expect(wm.getTurn(1)?.narration_text).not.toBe('mutated');
  });
});

describe('narrowed surfaces and GDD aliases', () => {
  it('test_writer_surface_exposes_only_mutations', () => {
    const wm = new WorldMemory();
    const writer = wm.asWriter();
    expect(Object.keys(writer).sort()).toEqual(['append', 'undo', 'undoLast']);
    writer.append(makeTurn(1));
    expect(wm.totalTurns()).toBe(1);
  });
  it('test_read_view_has_no_mutating_method', () => {
    const view = new WorldMemory().asReadView() as Record<string, unknown>;
    expect(view.append).toBeUndefined();
    expect(view.undoLast).toBeUndefined();
  });
  it('test_gdd_aliases_match_the_camel_case_methods', () => {
    const wm = seed(5, 3);
    const api = gddInterface(wm);
    expect(api.total_turns()).toBe(wm.totalTurns());
    expect(api.get_turn(2)).toEqual(wm.getTurn(2));
    expect(api.get_turn_page(4, 2, 'older')).toEqual(wm.getTurnPage(4, 2, 'older'));
    expect(api.get_processing_state(1)).toEqual(wm.getProcessingState(1));
  });
  it('test_build_context_defaults_to_global_when_scene_is_empty', () => {
    const wm = seed(3, 3);
    expect(wm.buildContext([]).context.entities).toEqual(['global']);
  });
  it('test_context_assembly_adds_zero_ai_calls', () => {
    // Structural: the module imports nothing that can perform I/O.
    const wm = seed(3, 3);
    const result = wm.buildContext(['global']);
    expect(result.context.recency.length).toBeGreaterThan(0);
    expect(result.over_budget).toBe(false);
  });
});
