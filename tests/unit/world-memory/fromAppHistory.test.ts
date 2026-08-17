/**
 * Unit tests - importing an existing App.tsx save into World Memory.
 * Shapes per production/gdd-integration/app-map.md §State (`storyHistory:19553`).
 */
import { describe, expect, it } from 'vitest';
import {
  turnRecordsFromAppHistory,
  worldMemoryFromAppHistory,
  type AppStoryEntry,
} from '../../../src-web/systems/worldMemory/fromAppHistory';
import { SCHEMA_VERSION, SLOT_ID } from './factories';

const OPTS = { slot_id: SLOT_ID, schema_version: SCHEMA_VERSION, clock: () => 1_700_000_000_000 };

function history(): AppStoryEntry[] {
  return [
    { id: 1, type: 'story', content: 'Mở đầu câu chuyện.' },
    { id: 2, type: 'user', content: 'Ta tiến vào rừng.' },
    { id: 3, type: 'story', content: 'Rừng sâu tĩnh mịch.', summarized: true },
    { id: 4, type: 'user_custom', content: 'Quan sát xung quanh.' },
    { id: 5, type: 'system', content: 'Bạn nhận được vật phẩm.' },
    { id: 6, type: 'story', content: 'Một thanh kiếm nằm dưới gốc cây.' },
  ];
}

describe('turnRecordsFromAppHistory', () => {
  it('test_story_entries_close_turns', () => {
    const records = turnRecordsFromAppHistory(history(), OPTS);
    expect(records).toHaveLength(3);
    expect(records.map((r) => r.turn_id)).toEqual([1, 2, 3]);
    expect(records.map((r) => r.world_time)).toEqual([1, 2, 3]);
  });
  it('test_user_entries_become_action_text', () => {
    const records = turnRecordsFromAppHistory(history(), OPTS);
    expect(records[1].action_text).toBe('Ta tiến vào rừng.');
    expect(records[2].action_text).toBe('Quan sát xung quanh.');
  });
  it('test_system_entries_are_prepended_to_narration_verbatim', () => {
    const records = turnRecordsFromAppHistory(history(), OPTS);
    expect(records[2].narration_text).toContain('Bạn nhận được vật phẩm.');
    expect(records[2].narration_text).toContain('Một thanh kiếm nằm dưới gốc cây.');
  });
  it('test_narration_is_stored_opaquely_with_an_empty_locked_result', () => {
    const records = turnRecordsFromAppHistory(history(), OPTS);
    expect(records[0].locked_result.fields).toEqual({});
    expect(records[0].locked_result.is_death_turn).toBe(false);
  });
  it('test_trailing_user_input_without_narration_is_not_a_turn', () => {
    const records = turnRecordsFromAppHistory(
      [...history(), { id: 7, type: 'user', content: 'Chờ đã.' }],
      OPTS,
    );
    expect(records).toHaveLength(3);
  });
  it('test_transient_entries_are_dropped_by_default', () => {
    const records = turnRecordsFromAppHistory(
      [{ id: 1, type: 'story', content: 'tạm thời', transient: true }, ...history()],
      OPTS,
    );
    expect(records).toHaveLength(3);
  });
  it('test_slot_and_schema_metadata_are_stamped', () => {
    const records = turnRecordsFromAppHistory(history(), OPTS);
    expect(records[0].slot_id).toBe(SLOT_ID);
    expect(records[0].schema_version).toBe(SCHEMA_VERSION);
    expect(records[0].hack_seq).toBe(0);
    expect(records[0].created_at).toBe(1_700_000_000_000);
  });
  it('test_empty_history_yields_no_records', () => {
    expect(turnRecordsFromAppHistory([], OPTS)).toEqual([]);
  });
  it('test_start_world_time_is_configurable', () => {
    const records = turnRecordsFromAppHistory(history(), { ...OPTS, startWorldTime: 100 });
    expect(records.map((r) => r.world_time)).toEqual([100, 101, 102]);
  });
});

describe('worldMemoryFromAppHistory', () => {
  it('test_imported_store_reports_all_turns', () => {
    const wm = worldMemoryFromAppHistory(history(), { ...OPTS, recencyWindowTurns: 2 });
    expect(wm.totalTurns()).toBe(3);
    expect(wm.recencyWindow().map((r) => r.turn_id)).toEqual([2, 3]);
  });
  it('test_import_extracts_zero_facts_because_old_saves_have_no_locked_results', () => {
    const wm = worldMemoryFromAppHistory(history(), { ...OPTS, recencyWindowTurns: 1 });
    expect(wm.getFactsByEntity('global')).toEqual([]);
    expect(wm.getProcessingState(1)).toEqual({ processed: true, fact_count: 0 });
  });
  it('test_imported_narration_is_readable_through_get_turn', () => {
    const wm = worldMemoryFromAppHistory(history(), OPTS);
    expect(wm.getTurn(1)?.narration_text).toBe('Mở đầu câu chuyện.');
  });
});
