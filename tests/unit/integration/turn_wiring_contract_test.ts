/**
 * P3b/P4b wiring contract - the glue between App.tsx and the pure systems.
 *
 * App.tsx itself is never imported by a unit test (vitest.config.ts). What CAN
 * be tested is the pure glue the wiring calls: `src-web/systems/glue/turnGlue.ts`.
 * These tests pin the contract the App relies on:
 *   - `applyUpdates` writes deltas into `knowledge.lastLockedResult`
 *   - `assembleLockedResultFromKnowledge` turns that into a `LockedResult`
 *   - `buildTurnRecordFromTurn` shapes the append-only record
 *   - the record then flows through leak detection, World Memory and a
 *     `saveCheckpoint` durability gate, and finally through Turn Manager
 *     manual mode + Undo.
 *
 * Design docs: production/gdd-integration/plan.md D/P3 + D/P4 (C-1, C-8, C-9,
 * C-13), gdd-01 A.3/A.4, gdd-04 A4, gdd-05 R1/B3.
 */
import { describe, expect, it } from 'vitest';

import {
  CALL_SITE_KINDS,
  LOCKED_ACCUM_KEY,
  assembleLockedResultFromKnowledge,
  buildSaveBundle,
  buildTurnRecordFromTurn,
  buildWorldMemoryPromptBlock,
  callTypeFor,
  chooseBackgroundFlag,
  createLockedAccumulator,
  entitiesInScopeFromKnowledge,
  narrationTextOf,
  recordAffinityDelta,
  recordBreakthroughFlag,
  recordCombatView,
  recordDeathFlag,
  recordExpDelta,
  renderWorldMemoryContext,
  suggestionsFromChoices,
} from '../../../src-web/systems/glue/turnGlue';
import {
  createSessionLeakLog,
  leakCheck,
  leakCheckAndRecord,
} from '../../../src-web/systems/contract/leakDetector';
import { sanitizeCommandBlock } from '../../../src-web/systems/contract/tagPolicy';
import { WorldMemory } from '../../../src-web/systems/worldMemory/worldMemory';
import { MemoryBackend } from '../../../src-web/systems/persistence/storageBackend';
import { saveCheckpoint } from '../../../src-web/systems/persistence/saveCheckpoint';
import { createSlotRecord } from '../../../src-web/systems/persistence/slotRecord';
import { createTurnManager } from '../../../src-web/systems/turn/turnManager';
import { makeAppStateUndoable } from '../../../src-web/systems/turn/undoAppState';
import type { SaveBundle } from '../../../src-web/systems/persistence/bundle';

const PLAYER = 'char_player';
const NPC = 'npc_lam';

/** The shape `applyUpdates` leaves on `knowledge` at the end of a turn. */
function knowledgeWithAccumulator(): Record<string, unknown> {
  const acc = createLockedAccumulator(7, 7);
  recordCombatView(acc, {
    in_combat: true,
    battle_active: false,
    outcome: { type: 'win', winner_id: PLAYER, loser_id: NPC },
  });
  recordExpDelta(acc, PLAYER, 120);
  recordAffinityDelta(acc, NPC, -15);
  recordBreakthroughFlag(acc, PLAYER);
  return {
    characters: [
      { id: PLAYER, Name: 'Diệp Thần', isPlayer: true, current_location_id: 'loc_thanh' },
      { id: NPC, Name: 'Lâm Nhi', current_location_id: 'loc_thanh' },
      { id: 'npc_xa', Name: 'Kẻ Ở Xa', current_location_id: 'loc_khac' },
    ],
    [LOCKED_ACCUM_KEY]: acc,
  };
}

describe('turnGlue - locked result accumulation', () => {
  it('test_accumulator_assembles_every_delta_the_reducer_recorded', () => {
    const locked = assembleLockedResultFromKnowledge(knowledgeWithAccumulator(), {
      turn_id: 7,
      world_time: 7,
    });
    expect(locked.turn_id).toBe(7);
    expect(locked.fields['exp_delta_' + PLAYER]).toBe(120);
    expect(locked.fields['affinity_delta_' + NPC]).toBe(-15);
    expect(locked.fields['breakthrough_flag_' + PLAYER]).toBe(true);
    expect(locked.outcome.type).toBe('win');
    expect(locked.in_combat).toBe(true);
    expect(locked.battle_active).toBe(false);
  });

  it('test_missing_accumulator_degrades_to_empty_locked_result', () => {
    const locked = assembleLockedResultFromKnowledge({}, { turn_id: 3, world_time: 3 });
    expect(locked.fields).toEqual({});
    expect(locked.is_death_turn).toBe(false);
    expect(locked.outcome.type).toBe('none');
  });

  it('test_malformed_accumulator_never_throws', () => {
    expect(() =>
      assembleLockedResultFromKnowledge(
        { [LOCKED_ACCUM_KEY]: 'not an object' },
        { turn_id: 1, world_time: 1 },
      ),
    ).not.toThrow();
    expect(() => assembleLockedResultFromKnowledge(null, { turn_id: 1, world_time: 1 })).not.toThrow();
  });

  it('test_zero_and_non_finite_deltas_never_become_fields', () => {
    const acc = createLockedAccumulator(1, 1);
    recordExpDelta(acc, PLAYER, 0);
    recordExpDelta(acc, PLAYER, Number.NaN);
    recordAffinityDelta(acc, NPC, 0);
    const locked = assembleLockedResultFromKnowledge(
      { [LOCKED_ACCUM_KEY]: acc },
      { turn_id: 1, world_time: 1 },
    );
    expect(Object.keys(locked.fields)).toHaveLength(0);
  });

  it('test_repeated_deltas_for_one_entity_accumulate', () => {
    const acc = createLockedAccumulator(2, 2);
    recordAffinityDelta(acc, NPC, 5);
    recordAffinityDelta(acc, NPC, -2);
    recordExpDelta(acc, PLAYER, 10);
    recordExpDelta(acc, PLAYER, 15);
    expect(acc.fields['affinity_delta_' + NPC]).toBe(3);
    expect(acc.fields['exp_delta_' + PLAYER]).toBe(25);
  });

  it('test_only_player_death_sets_is_death_turn', () => {
    const acc = createLockedAccumulator(4, 4);
    recordDeathFlag(acc, NPC, false);
    expect(acc.is_death_turn).toBe(false);
    expect(acc.fields['death_flag_' + NPC]).toBe(true);
    recordDeathFlag(acc, PLAYER, true);
    expect(acc.is_death_turn).toBe(true);
  });
});

describe('turnGlue - turn record', () => {
  it('test_turn_record_carries_action_narration_and_locked_result', () => {
    const locked = assembleLockedResultFromKnowledge(knowledgeWithAccumulator(), {
      turn_id: 7,
      world_time: 7,
    });
    const record = buildTurnRecordFromTurn({
      slot_id: 'slot_a',
      turn_id: 7,
      world_time: 7,
      action_text: 'Rút kiếm',
      narration: 'Ngươi rút kiếm ra khỏi vỏ.',
      locked_result: locked,
      choices: ['Tiến lên', 'Lùi lại'],
      created_at: 1700,
    });
    expect(record.slot_id).toBe('slot_a');
    expect(record.hack_seq).toBe(0);
    expect(record.narration_text).toContain('rút kiếm');
    expect(record.locked_result.fields['exp_delta_' + PLAYER]).toBe(120);
    expect(record.suggestions).toHaveLength(2);
    expect(record.suggestions[0]).toEqual({ text: 'Tiến lên', envelope: null, source: 'ai' });
  });

  it('test_narration_text_flattens_the_dialogue_segment_union', () => {
    expect(narrationTextOf('một chuỗi')).toBe('một chuỗi');
    expect(
      narrationTextOf([
        { type: 'narration', content: 'Trời tối.' },
        { type: 'dialogue', content: 'Đi thôi.' },
        { type: 'empty' },
      ]),
    ).toBe('Trời tối.\nĐi thôi.');
    expect(narrationTextOf(null)).toBe('');
    expect(narrationTextOf(undefined)).toBe('');
  });

  it('test_suggestions_from_choices_drops_blanks_and_keeps_objects', () => {
    expect(suggestionsFromChoices(['  ', 'Đi'])).toEqual([
      { text: 'Đi', envelope: null, source: 'ai' },
    ]);
    expect(suggestionsFromChoices([{ text: 'Chờ', envelope: 'wait', source: 'fallback' }])).toEqual([
      { text: 'Chờ', envelope: 'wait', source: 'fallback' },
    ]);
    expect(suggestionsFromChoices(undefined)).toEqual([]);
  });
});

describe('turnGlue - AI call-site classification (plan.md C-9)', () => {
  it('test_only_narration_is_a_foreground_call', () => {
    expect(chooseBackgroundFlag('narration')).toBe(false);
    for (const kind of CALL_SITE_KINDS) {
      if (kind === 'narration') continue;
      expect(chooseBackgroundFlag(kind)).toBe(true);
    }
  });

  it('test_unknown_or_missing_call_site_defaults_to_background', () => {
    expect(chooseBackgroundFlag(undefined)).toBe(true);
    expect(chooseBackgroundFlag('something-new')).toBe(true);
    expect(callTypeFor('narration')).toBe('narration_call');
    expect(callTypeFor('summarizer')).toBe('suggestion_call');
  });
});

describe('turnGlue - prompt and scope helpers (plan.md C-8)', () => {
  it('test_world_memory_block_is_fenced_and_titled', () => {
    const block = buildWorldMemoryPromptBlock('- char_player: exp_delta = 120');
    expect(block).toContain('KÝ ỨC THẾ GIỚI (fact store)');
    expect(block).toContain('exp_delta = 120');
    // The fence tokens come from narrationDirectives, never hand-written here.
    expect(block.split('\n').length).toBeGreaterThan(2);
  });

  it('test_empty_world_memory_adds_no_dead_header', () => {
    expect(buildWorldMemoryPromptBlock('')).toBe('');
    expect(buildWorldMemoryPromptBlock(null)).toBe('');
  });

  it('test_render_world_memory_groups_facts_by_entity', () => {
    const text = renderWorldMemoryContext({
      context: {
        facts: [
          { entity_id: PLAYER, field_name: 'exp_delta', field_value: 120 },
          { entity_id: PLAYER, field_name: 'breakthrough_flag', field_value: true },
          { entity_id: NPC, field_name: 'affinity_delta', field_value: -15 },
          { entity_id: '', field_name: 'ignored', field_value: 1 },
        ],
      },
    });
    expect(text).toContain('- ' + PLAYER + ': exp_delta = 120 | breakthrough_flag = true');
    expect(text).toContain('- ' + NPC + ': affinity_delta = -15');
    expect(renderWorldMemoryContext(null)).toBe('');
  });

  it('test_entities_in_scope_are_player_first_then_colocated', () => {
    const entities = entitiesInScopeFromKnowledge(knowledgeWithAccumulator());
    expect(entities[0]).toBe(PLAYER);
    expect(entities).toContain(NPC);
    expect(entities).toContain('loc_thanh');
    expect(entities).not.toContain('npc_xa');
  });

  it('test_entities_in_scope_survives_an_empty_world', () => {
    expect(entitiesInScopeFromKnowledge(null)).toEqual([]);
    expect(entitiesInScopeFromKnowledge({ characters: [] })).toEqual([]);
  });
});

describe('turnGlue - save bundle', () => {
  it('test_bundle_carries_every_registered_system_blob', () => {
    const bundle = buildSaveBundle(
      {
        knowledge: { a: 1 },
        storyHistory: [{ id: 'h1' }],
        storySummaries: [],
        gameSettings: { theme: 'Tiên hiệp' },
        currentTurn: 12,
        choices: ['A'],
        gameMode: 'EXPLORATION',
        adventureTurnCount: 9,
        worldMemory: null,
      },
      { slot_id: 'slot_a', world_time: 12, saved_at: 1700 },
    ) as unknown as SaveBundle;
    expect(bundle.currentTurn).toBe(12);
    expect(bundle.meta.slot_id).toBe('slot_a');
    expect(bundle.meta.hack_mode_used_this_slot).toBe(false);
    expect(bundle.storyHistory).toHaveLength(1);
  });

  it('test_bundle_defaults_are_never_undefined_blobs', () => {
    const bundle = buildSaveBundle(
      {},
      { slot_id: 'slot_b', world_time: 0, saved_at: 0 },
    ) as unknown as SaveBundle;
    expect(bundle.knowledge).toBeNull();
    expect(bundle.storyHistory).toEqual([]);
    expect(bundle.storySummaries).toEqual([]);
    expect(bundle.currentTurn).toBe(0);
  });
});

describe('wiring contract - the end-to-end turn path', () => {
  it('test_locked_result_flows_into_memory_and_a_durable_checkpoint', async () => {
    const knowledge = knowledgeWithAccumulator();
    const locked = assembleLockedResultFromKnowledge(knowledge, { turn_id: 7, world_time: 7 });
    const record = buildTurnRecordFromTurn({
      slot_id: 'slot_a',
      turn_id: 7,
      world_time: 7,
      action_text: 'Rút kiếm',
      narration: 'Ngươi rút kiếm, khí thế dâng lên.',
      locked_result: locked,
      choices: [],
      created_at: 1700,
    });

    const memory = new WorldMemory();
    expect(memory.asWriter().append(record, locked).appended).toBe(true);
    expect(memory.totalTurns()).toBe(1);

    const backend = new MemoryBackend();
    const bundle = buildSaveBundle(
      { knowledge, currentTurn: 7, worldMemory: memory.toJSON() },
      { slot_id: 'slot_a', world_time: 7, saved_at: 1700 },
    ) as unknown as SaveBundle;
    const result = await saveCheckpoint(backend, 'slot_a', bundle, 'turn_confirm', {
      slotRecord: createSlotRecord({ slot_id: 'slot_a', character_name: 'Diệp Thần', now: 1700 }),
      turnRecord: record,
      clock: () => 1700,
    });
    expect(result.durability_confirmed).toBe(true);
    expect(result.slotRecord && result.slotRecord.turn_count).toBe(1);
  });

  it('test_narration_that_prints_a_locked_number_is_a_contract_violation', () => {
    const locked = assembleLockedResultFromKnowledge(knowledgeWithAccumulator(), {
      turn_id: 7,
      world_time: 7,
    });
    const leaking = leakCheck({
      turn_id: 7,
      locked_result: locked,
      narration_text: 'Ngươi nhận được 120 điểm kinh nghiệm.',
    });
    expect(leaking.leak_flag).toBe(1);
    expect(leaking.leak_matches).toContain('exp_delta_' + PLAYER);

    const clean = leakCheck({
      turn_id: 7,
      locked_result: locked,
      narration_text: 'Ngươi cảm thấy nội tức dày lên rõ rệt.',
    });
    expect(clean.leak_flag).toBe(0);
    expect(clean.V).toBe(0);
  });

  it('test_session_log_counts_only_narrated_non_undone_turns', () => {
    const log = createSessionLeakLog();
    const locked = assembleLockedResultFromKnowledge(knowledgeWithAccumulator(), {
      turn_id: 7,
      world_time: 7,
    });
    leakCheckAndRecord({ turn_id: 7, locked_result: locked, narration_text: 'sạch sẽ' }, log);
    leakCheckAndRecord(
      { turn_id: 8, locked_result: locked, narration_text: 'thu được 120 điểm' },
      log,
    );
    expect(log.stats()).toMatchObject({ V: 1, T: 2 });
    log.markUndone(8);
    expect(log.stats()).toMatchObject({ V: 0, T: 1 });
  });

  it('test_mechanical_tags_are_stripped_before_the_reducer_sees_them', () => {
    const block = [
      '[WORLD_NPC: id="npc_lam", name="Lam Nhi", description="", level=5]',
      '[ENCOUNTER_REWARD: ep_score=95, reason="thang tran", target="Nguoi"]',
      '[CHARACTER_UPDATE: Name="Nguoi", Stats="exp:+500", exp="500"]',
      '[TIME_PASSED: hours=2]',
    ].join('\n');
    const sanitized = sanitizeCommandBlock(block, { mode: 'prod', playerIds: ['Nguoi', PLAYER] });
    expect(sanitized.kept).toContain('WORLD_NPC');
    expect(sanitized.kept).toContain('TIME_PASSED');
    expect(sanitized.kept).not.toContain('ENCOUNTER_REWARD');
    expect(sanitized.stripped.length).toBeGreaterThanOrEqual(2);
  });

  it('test_narrative_combat_start_survives_the_hybrid_tag_policy', () => {
    const sanitized = sanitizeCommandBlock('[NARRATIVE_COMBAT_START: Targets="Soi"]', {
      mode: 'prod',
    });
    expect(sanitized.kept).toContain('NARRATIVE_COMBAT_START');
    expect(sanitized.stripped).toHaveLength(0);
  });
});

describe('wiring contract - Turn Manager manual mode (plan.md C-13)', () => {
  /** The App's registered undoables, in the fixed P4b order. */
  function makeManager() {
    const state = {
      knowledge: { hp: 100 },
      storyHistory: [],
      storySummaries: [],
      currentTurn: 0,
      gameSettings: {},
      choices: [],
    };
    const memory = new WorldMemory();
    const tm = createTurnManager({ slotId: 'slot_a' });
    tm.registry.register(
      makeAppStateUndoable({
        get: () => ({ ...state }),
        set: (next) => Object.assign(state, next),
      }),
      'app_state',
    );
    tm.registry.register(memory, 'world_memory');
    tm.begin();
    return { tm, state, memory };
  }

  it('test_manual_turn_confirms_and_enables_undo', () => {
    const { tm } = makeManager();
    const begun = tm.beginManualTurn();
    expect(begun).not.toBeNull();
    expect(tm.input_locked).toBe(true);
    expect(tm.commitManualTurn(true)).toBe(true);
    expect(tm.state).toBe('turn_confirmed');
    expect(tm.world_time).toBe(1);
    expect(tm.undo_available).toBe(true);
  });

  it('test_failed_durability_leaves_the_turn_unconfirmed_and_undo_off', () => {
    const { tm } = makeManager();
    tm.beginManualTurn();
    expect(tm.commitManualTurn(false)).toBe(false);
    expect(tm.state).toBe('failed');
    expect(tm.undo_available).toBe(false);
    expect(tm.world_time).toBe(0);
  });

  it('test_death_turn_permanently_disables_undo', () => {
    const { tm } = makeManager();
    tm.beginManualTurn();
    tm.commitManualTurn(true, { is_death_turn: true });
    expect(tm.is_death_turn).toBe(true);
    expect(tm.undo_available).toBe(false);
  });

  it('test_customization_write_invalidates_the_pending_snapshot', () => {
    const { tm } = makeManager();
    tm.beginManualTurn();
    tm.commitManualTurn(true);
    expect(tm.undo_available).toBe(true);
    tm.invalidatePendingSnapshot();
    expect(tm.undo_available).toBe(false);
  });

  it('test_undo_restores_app_state_and_hard_deletes_the_memory_record', async () => {
    const { tm, state, memory } = makeManager();
    tm.beginManualTurn();
    state.knowledge = { hp: 40 };
    state.currentTurn = 1;
    const record = buildTurnRecordFromTurn({
      slot_id: 'slot_a',
      turn_id: tm.turn_id,
      world_time: 1,
      action_text: 'Xông lên',
      narration: 'Ngươi trúng đòn.',
      locked_result: assembleLockedResultFromKnowledge({}, { turn_id: tm.turn_id, world_time: 1 }),
      created_at: 0,
    });
    memory.asWriter().append(record);
    tm.commitManualTurn(true);

    const undone = await tm.undo({
      resolveMechanics: () => assembleLockedResultFromKnowledge({}, { turn_id: 0, world_time: 0 }),
      narrate: async () => ({ ok: false, label: 'unused' }),
      appendMemory: () => {},
      markMemoryUndone: () => {
        memory.undoLast();
      },
      checkpoint: async () => ({ durability_confirmed: true }),
      clock: () => 0,
    });
    expect(undone.ok).toBe(true);
    expect(state.knowledge).toEqual({ hp: 100 });
    expect(state.currentTurn).toBe(0);
    expect(memory.totalTurns()).toBe(0);
    expect(tm.world_time).toBe(0);
    expect(tm.undo_available).toBe(false);
  });

  it('test_undo_is_rejected_when_the_post_undo_write_is_not_durable', async () => {
    const { tm, state } = makeManager();
    tm.beginManualTurn();
    state.knowledge = { hp: 10 };
    tm.commitManualTurn(true);
    const result = await tm.undo({
      resolveMechanics: () => assembleLockedResultFromKnowledge({}, { turn_id: 0, world_time: 0 }),
      narrate: async () => ({ ok: false, label: 'unused' }),
      appendMemory: () => {},
      checkpoint: async () => ({ durability_confirmed: false, error_code: 'QUOTA_EXCEEDED' }),
      clock: () => 0,
    });
    expect(result.ok).toBe(false);
    expect(state.knowledge).toEqual({ hp: 10 });
    expect(tm.state).toBe('turn_confirmed');
    expect(tm.undo_available).toBe(true);
  });
});
