/**
 * Code-review fix contract for the App.tsx <-> systems glue.
 *
 * Each `describe` block below pins one finding from the P6c code review that was
 * fixed inside `App.tsx`. App.tsx is never imported by a unit test
 * (vitest.config.ts), so the decision each fix depends on was factored into a
 * pure helper in `src-web/systems/glue/turnGlue.ts` and is pinned here:
 *
 *  - C-1 Turn Manager self-heal          -> `shouldSelfHealTurnManager`
 *  - C-3 credentials from real app state -> `buildAiCredentials`
 *  - C-4 long-narration budget           -> `narrationBudgetOverrides`
 *  - C-5 undo generation guard           -> `isStaleGeneration`
 *  - C-8 fail-CLOSED sanitising          -> `sanitizeCommandBlockForApply`
 *  - C-9 Turn Manager persistence        -> `buildSaveBundle` + bundle blobs
 *
 * Design docs: production/gdd-integration/plan.md C-1/C-9/C-10/C-13,
 * gdd-01 A.3/A.4/C.7, gdd-05 B3.
 */
import { describe, expect, it } from 'vitest';

import {
  LONG_NARRATION_BUDGET,
  buildAiCredentials,
  buildSaveBundle,
  credentialsAreUsable,
  isStaleGeneration,
  narrationBudgetOverrides,
  sanitizeCommandBlockForApply,
  shouldSelfHealTurnManager,
} from '../../../src-web/systems/glue/turnGlue';
import { resolveApiKey } from '../../../src-web/systems/ai/config';
import { fromBlobs, toBlobs, type SaveBundle } from '../../../src-web/systems/persistence/bundle';
import { createTurnManager } from '../../../src-web/systems/turn/turnManager';

const PLAYER_IDS = ['Nguoi', 'char_player'];

// ---------------------------------------------------------------------------
// C-3 - credentials
// ---------------------------------------------------------------------------

describe('turnGlue - AI credentials (code review C-3)', () => {
  it('test_user_key_mode_uses_the_app_state_key', () => {
    const creds = buildAiCredentials({ apiMode: 'userKey', apiKey: 'AIza-user', apiKeyFromUrl: '' });
    expect(creds).toEqual({ apiMode: 'userKey', userKey: 'AIza-user' });
    expect(resolveApiKey(creds)).toBe('AIza-user');
  });

  it('test_user_key_mode_falls_back_to_the_url_key', () => {
    const creds = buildAiCredentials({ apiMode: 'userKey', apiKey: '', apiKeyFromUrl: 'AIza-url' });
    expect(resolveApiKey(creds)).toBe('AIza-url');
  });

  it('test_default_mode_uses_the_platform_key_when_the_build_defines_one', () => {
    const creds = buildAiCredentials({ apiMode: 'defaultGemini', defaultKey: 'AIza-platform' });
    expect(creds).toEqual({ apiMode: 'default', defaultKey: 'AIza-platform' });
    expect(resolveApiKey(creds)).toBe('AIza-platform');
  });

  it('test_default_mode_without_any_key_is_unusable_so_requestAi_fails_fast', () => {
    const creds = buildAiCredentials({ apiMode: 'defaultGemini' });
    // `resolveApiKey === null` is exactly what makes `requestAi` return
    // `config_error` before touching the model ladder (gdd-01 C.7).
    expect(resolveApiKey(creds)).toBeNull();
    expect(credentialsAreUsable(creds)).toBe(false);
  });

  it('test_a_url_key_still_wins_over_an_empty_default_mode', () => {
    const creds = buildAiCredentials({ apiMode: 'defaultGemini', apiKeyFromUrl: 'AIza-legacy' });
    expect(resolveApiKey(creds)).toBe('AIza-legacy');
  });

  it('test_whitespace_only_keys_count_as_missing', () => {
    expect(credentialsAreUsable(buildAiCredentials({ apiMode: 'userKey', apiKey: '   ' }))).toBe(false);
    expect(credentialsAreUsable(null)).toBe(false);
  });

  it('test_missing_input_degrades_to_an_unusable_default', () => {
    expect(buildAiCredentials(undefined)).toEqual({ apiMode: 'default', defaultKey: '' });
  });
});

// ---------------------------------------------------------------------------
// C-4 - narration budget
// ---------------------------------------------------------------------------

describe('turnGlue - narration budget overrides (code review C-4)', () => {
  it('test_dai_tag_raises_the_budget', () => {
    expect(narrationBudgetOverrides(['mieuta', 'dai'])).toEqual({
      ai_call_timeout_seconds: 240,
      request_timeout_default: 200,
    });
  });

  it('test_the_override_is_a_copy_so_a_caller_cannot_mutate_the_constant', () => {
    const first = narrationBudgetOverrides(['dai']);
    expect(first).not.toBe(LONG_NARRATION_BUDGET as unknown);
    if (first) first.ai_call_timeout_seconds = 1;
    expect(narrationBudgetOverrides(['dai'])?.ai_call_timeout_seconds).toBe(240);
  });

  it('test_tag_matching_ignores_case_and_padding', () => {
    expect(narrationBudgetOverrides([' DAI '])).toBeTruthy();
  });

  it('test_a_normal_turn_gets_no_override_and_keeps_the_config_budget', () => {
    expect(narrationBudgetOverrides(['hanhdong', 'doithoai'])).toBeUndefined();
    expect(narrationBudgetOverrides([])).toBeUndefined();
    expect(narrationBudgetOverrides(null)).toBeUndefined();
    expect(narrationBudgetOverrides(undefined)).toBeUndefined();
  });

  it('test_non_string_tags_never_trigger_the_long_budget', () => {
    expect(narrationBudgetOverrides([null, 7, { dai: true }])).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// C-5 - undo generation guard
// ---------------------------------------------------------------------------

describe('turnGlue - undo generation guard (code review C-5)', () => {
  it('test_result_of_the_current_generation_is_applied', () => {
    expect(isStaleGeneration(3, 3)).toBe(false);
  });

  it('test_result_scheduled_before_an_undo_is_dropped', () => {
    expect(isStaleGeneration(3, 4)).toBe(true);
  });

  it('test_any_movement_counts_as_stale_even_backwards', () => {
    expect(isStaleGeneration(4, 3)).toBe(true);
  });

  it('test_unknown_generations_never_drop_a_result', () => {
    // Fail OPEN here on purpose: dropping a legitimate background result on a
    // bookkeeping bug would silently lose world state.
    expect(isStaleGeneration(undefined, 2)).toBe(false);
    expect(isStaleGeneration(2, null)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// C-1 - Turn Manager self-heal
// ---------------------------------------------------------------------------

describe('turnGlue - Turn Manager self-heal (code review C-1)', () => {
  it('test_lock_left_by_an_early_return_is_healed', () => {
    expect(shouldSelfHealTurnManager({ inputLocked: true, isProcessingAction: false })).toBe(true);
  });

  it('test_a_turn_actually_in_flight_is_never_stolen', () => {
    expect(shouldSelfHealTurnManager({ inputLocked: true, isProcessingAction: true })).toBe(false);
  });

  it('test_an_unlocked_machine_needs_no_healing', () => {
    expect(shouldSelfHealTurnManager({ inputLocked: false, isProcessingAction: false })).toBe(false);
    expect(shouldSelfHealTurnManager({})).toBe(false);
  });

  it('test_a_real_turn_manager_left_locked_is_detected_and_recoverable', () => {
    const tm = createTurnManager({ slotId: 'slot_selfheal' });
    tm.begin();
    expect(tm.beginManualTurn()).not.toBeNull();
    // The App returned early here: neither commit nor fail ran.
    expect(tm.input_locked).toBe(true);
    expect(tm.beginManualTurn()).toBeNull(); // every later turn is locked out
    expect(shouldSelfHealTurnManager({ inputLocked: tm.input_locked, isProcessingAction: false })).toBe(true);
    tm.failManualTurn(); // what `abortSystemsTurn({ force: true })` runs
    expect(tm.input_locked).toBe(false);
    expect(tm.beginManualTurn()).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// C-8 - fail-closed sanitising
// ---------------------------------------------------------------------------

describe('turnGlue - fail-closed command block sanitising (code review C-8)', () => {
  it('test_prod_mode_strips_mechanical_tags_without_degrading', () => {
    const block = [
      '[WORLD_NPC: id="npc_lam", name="Lam Nhi", description="", level=5]',
      '[ENCOUNTER_REWARD: ep_score=95, reason="thang tran", target="Nguoi"]',
    ].join('\n');
    const result = sanitizeCommandBlockForApply(block, { mode: 'prod', playerIds: PLAYER_IDS });
    expect(result.degraded).toBe('none');
    expect(result.kept).toContain('WORLD_NPC');
    expect(result.kept).not.toContain('ENCOUNTER_REWARD');
  });

  it('test_dev_mode_violation_applies_the_sanitised_block_not_the_raw_one', () => {
    const block = [
      '[WORLD_NPC: id="npc_lam", name="Lam Nhi", description="", level=5]',
      '[ENCOUNTER_REWARD: ep_score="900"]',
    ].join('\n');
    const result = sanitizeCommandBlockForApply(block, { mode: 'dev', playerIds: PLAYER_IDS });
    // The throw is caught and the CARRIED result is used: world content survives,
    // the mechanical tag does not.
    expect(result.degraded).toBe('contract_violation');
    expect(result.kept).toContain('WORLD_NPC');
    expect(result.kept).not.toContain('ENCOUNTER_REWARD');
  });

  it('test_an_unexpected_failure_degrades_to_an_empty_block_never_the_raw_block', () => {
    const exploding = {
      mode: 'prod' as const,
      isPlayer: () => {
        throw new Error('policy blew up');
      },
    };
    const block = '[CHARACTER_UPDATE: Name="Nguoi", Stats="exp:+500"]';
    const result = sanitizeCommandBlockForApply(block, exploding);
    expect(result.degraded).toBe('empty');
    expect(result.kept).toBe('');
    expect(result.kept).not.toContain('exp');
  });

  it('test_empty_input_is_a_no_op', () => {
    expect(sanitizeCommandBlockForApply('', { mode: 'prod' })).toMatchObject({
      kept: '',
      degraded: 'none',
    });
  });
});

// ---------------------------------------------------------------------------
// C-9 - Turn Manager persistence across reloads
// ---------------------------------------------------------------------------

describe('turnGlue - Turn Manager persistence (code review C-9)', () => {
  function bundleWith(turnManager: unknown): SaveBundle {
    return buildSaveBundle(
      {
        knowledge: { characters: [] },
        storyHistory: [],
        storySummaries: [],
        gameSettings: {},
        currentTurn: 12,
        worldMemory: null,
        gameMode: 'EXPLORATION',
        adventureTurnCount: 4,
        turnManager,
      },
      { slot_id: 'slot_persist', world_time: 12, saved_at: 1_000 },
    ) as unknown as SaveBundle;
  }

  it('test_the_persistable_state_survives_a_blob_round_trip', () => {
    const tm = createTurnManager({ slotId: 'slot_persist' });
    tm.begin();
    tm.beginManualTurn();
    tm.commitManualTurn(true, { suggestions: [] });
    const persisted = tm.toPersistable();
    expect(persisted.turn_id).toBe(1);

    const bundle = bundleWith(persisted);
    const restored = fromBlobs(toBlobs(bundle), bundle.meta);
    expect(restored.turnManager).toEqual(persisted);
  });

  it('test_a_rehydrated_turn_manager_continues_instead_of_restarting_at_zero', () => {
    const first = createTurnManager({ slotId: 'slot_persist' });
    first.begin();
    first.beginManualTurn();
    first.commitManualTurn(true, { suggestions: [] });
    first.beginManualTurn();
    first.commitManualTurn(true, { suggestions: [] });

    const bundle = bundleWith(first.toPersistable());
    const restored = fromBlobs(toBlobs(bundle), bundle.meta);

    const reloaded = createTurnManager({ slotId: 'slot_persist' });
    reloaded.begin();
    expect(reloaded.turn_id).toBe(0);
    reloaded.rehydrate(restored.turnManager as ReturnType<typeof first.toPersistable>);
    expect(reloaded.turn_id).toBe(first.turn_id);
    expect(reloaded.world_time).toBe(first.world_time);
    // The next turn continues the sequence rather than colliding with turn 1.
    expect(reloaded.beginManualTurn()?.turn_id).toBe(first.turn_id + 1);
  });

  it('test_a_death_turn_stays_un_undoable_after_a_reload', () => {
    const first = createTurnManager({ slotId: 'slot_persist' });
    first.begin();
    first.beginManualTurn();
    first.commitManualTurn(true, { is_death_turn: true });

    const bundle = bundleWith(first.toPersistable());
    const restored = fromBlobs(toBlobs(bundle), bundle.meta);
    const reloaded = createTurnManager({ slotId: 'slot_persist' });
    reloaded.begin();
    reloaded.rehydrate(restored.turnManager as ReturnType<typeof first.toPersistable>);
    expect(reloaded.undo_available).toBe(false);
  });

  it('test_a_legacy_bundle_without_the_field_still_loads', () => {
    const bundle = bundleWith(undefined);
    const restored = fromBlobs(toBlobs(bundle), bundle.meta);
    expect(restored.turnManager ?? null).toBeNull();
    expect(restored.currentTurn).toBe(12);
  });
});
