/**
 * Undo adapter - the fields a turn can mutate. Regression suite for the P4b
 * code review:
 *
 *  C1 `gameMode` / `activeTrade` / `adventureTurnCount` are captured, and are
 *     OPTIONAL so an older caller's snapshot shape is unchanged
 *  C2 `gameSettings` is captured as a turn-relevant PROJECTION, not whole
 *
 * Design docs: gdd-01 A.2 CR#8 / A.9; plan.md C-13 and risk R5.
 */

import { describe, expect, it } from 'vitest';
import {
  APP_UNDOABLE_FIELDS,
  APP_UNDOABLE_OPTIONAL_FIELDS,
  TURN_RELEVANT_SETTINGS_KEYS,
  makeAppStateUndoable,
  projectSettings,
  type AppUndoableState,
} from '../../../src-web/systems/turn/undoAppState';

const FULL_SETTINGS = {
  theme: 'dark',
  initialWorldElements: [{ id: 'e1' }],
  customThemeConfig: { hue: 210 },
  playStyle: 'nghiêm túc',
};

function makeStore(extra: Partial<AppUndoableState> = {}) {
  const store: Record<string, unknown> = {
    knowledge: { characters: [{ id: 'p1', exp: 10 }] },
    storyHistory: [{ id: 1, content: 'a' }],
    storySummaries: [],
    currentTurn: 3,
    gameSettings: { ...FULL_SETTINGS },
    choices: ['A', 'B'],
    ...extra,
  };
  const adapter = makeAppStateUndoable({
    get: () => ({ ...store }) as unknown as AppUndoableState,
    set: (next) => Object.assign(store, next),
  });
  return { store, adapter };
}

describe('C1 - the new turn-mutable fields', () => {
  it('test_the_three_new_fields_are_enumerated_and_optional', () => {
    for (const f of ['gameMode', 'activeTrade', 'adventureTurnCount'] as const) {
      expect(APP_UNDOABLE_FIELDS).toContain(f);
      expect(APP_UNDOABLE_OPTIONAL_FIELDS).toContain(f);
    }
  });

  it('test_game_mode_and_trade_and_adventure_count_round_trip', () => {
    const { store, adapter } = makeStore({
      gameMode: 'EXPLORATION',
      activeTrade: { trader: null, playerOffer: ['item_1'], offerType: 'sell' },
      adventureTurnCount: 7,
    });
    const snap = adapter.captureSnapshot();

    store.gameMode = 'TRADE';
    store.activeTrade = { trader: 'Lý Mỗ', playerOffer: [], offerType: 'buy' };
    store.adventureTurnCount = 8;

    adapter.restoreSnapshot(snap);
    expect(store.gameMode).toBe('EXPLORATION');
    expect(store.adventureTurnCount).toBe(7);
    expect(store.activeTrade).toEqual({ trader: null, playerOffer: ['item_1'], offerType: 'sell' });
  });

  it('test_the_restored_trade_object_is_not_a_live_reference', () => {
    const trade = { trader: null as string | null, playerOffer: ['item_1'] };
    const { store, adapter } = makeStore({ gameMode: 'TRADE', activeTrade: trade });
    const snap = adapter.captureSnapshot();
    trade.playerOffer.push('item_2');
    adapter.restoreSnapshot(snap);
    expect((store.activeTrade as { playerOffer: string[] }).playerOffer).toEqual(['item_1']);
  });

  it('test_a_caller_that_omits_the_new_fields_keeps_the_old_snapshot_shape', () => {
    const { adapter } = makeStore();
    const snap = adapter.captureSnapshot() as { fields: Record<string, unknown> };
    expect(Object.keys(snap.fields)).toEqual([
      'knowledge',
      'storyHistory',
      'storySummaries',
      'currentTurn',
      'gameSettings',
      'choices',
    ]);
    expect('gameMode' in snap.fields).toBe(false);
  });

  it('test_restoring_an_older_snapshot_does_not_clobber_the_new_fields', () => {
    const { store, adapter } = makeStore();
    const snap = adapter.captureSnapshot();
    store.gameMode = 'COMBAT';
    adapter.restoreSnapshot(snap);
    expect(store.gameMode).toBe('COMBAT');
  });
});

describe('C2 - gameSettings is captured as a projection', () => {
  it('test_the_turn_relevant_key_list_is_audited_empty', () => {
    // No setGameSettings call site in App.tsx runs inside the turn cycle.
    expect([...TURN_RELEVANT_SETTINGS_KEYS]).toEqual([]);
  });

  it('test_the_snapshot_does_not_carry_the_whole_settings_object', () => {
    const { adapter } = makeStore();
    const snap = adapter.captureSnapshot() as { fields: { gameSettings: Record<string, unknown> } };
    expect(snap.fields.gameSettings).toEqual({});
    expect('initialWorldElements' in snap.fields.gameSettings).toBe(false);
  });

  it('test_a_projection_picks_only_the_listed_keys_that_exist', () => {
    expect(projectSettings(FULL_SETTINGS, ['playStyle'])).toEqual({ playStyle: 'nghiêm túc' });
    expect(projectSettings(FULL_SETTINGS, ['playStyle', 'nope'])).toEqual({ playStyle: 'nghiêm túc' });
    expect(projectSettings(null, ['playStyle'])).toEqual({});
    expect(projectSettings(FULL_SETTINGS, [])).toEqual({});
  });

  it('test_a_custom_projection_overrides_the_default', () => {
    const store: Record<string, unknown> = {
      knowledge: {},
      storyHistory: [],
      storySummaries: [],
      currentTurn: 1,
      gameSettings: { ...FULL_SETTINGS },
      choices: [],
    };
    const adapter = makeAppStateUndoable({
      get: () => ({ ...store }) as unknown as AppUndoableState,
      set: (next) => Object.assign(store, next),
      settingsProjection: (settings) => ({ theme: (settings as { theme: string }).theme }),
    });
    const snap = adapter.captureSnapshot() as { fields: { gameSettings: unknown } };
    expect(snap.fields.gameSettings).toEqual({ theme: 'dark' });
  });
});
