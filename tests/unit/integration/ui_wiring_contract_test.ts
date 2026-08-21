/**
 * P6b wiring contract - the glue between App.tsx's UI layer and the pure UI
 * systems (`card/`, `ui/`, `customize/`, `persistence/quota`).
 *
 * App.tsx itself is never imported by a unit test (vitest.config.ts). What CAN
 * be tested is the pure glue the wiring calls: `src-web/systems/glue/uiGlue.ts`.
 * These tests pin the contract the App relies on:
 *   - the App's 9 combat stats project onto the GDD's 12 without inventing zeros
 *   - percentage stats survive the round trip App -> GDD -> App
 *   - a `CardCharacter` built from an App character feeds `buildCardBlocks`
 *   - the Song Tu button stays gated by the injected `affinity >= 80` predicate
 *     (plan.md C-6: the threshold lives in App.tsx, never in the card)
 *   - the settings item ids of `settingsGroups.ts` all have a handler mapping
 *   - the hack-mode toggle defaults to OFF and persists as a device setting
 *   - the quota banner fires at >= 0.85 and stays silent when unmeasurable
 *   - `tm_state` folds the App's three loading booleans correctly
 *
 * Design docs: production/gdd-integration/plan.md P6 (reduced) + C-3/C-6/C-13,
 * gdd-06 PART A/B/C.
 */
import { describe, expect, it } from 'vitest';

import { buildCardBlocks } from '../../../src-web/systems/card/cardBlocks';
import { baseStatCompletenessCheck } from '../../../src-web/systems/card/baseStatCompleteness';
import { customizeButtonVisibility } from '../../../src-web/systems/customize/validators';
import { GDD_STAT_KEYS } from '../../../src-web/systems/registry';
import { SETTINGS_GROUPS } from '../../../src-web/systems/ui/settingsGroups';
import { undoButtonState } from '../../../src-web/systems/ui/writeActionAllowed';
import * as uiGlue from '../../../src-web/systems/glue/uiGlue';

/** A representative App character (post-`calculateFinalStats`). */
function appNpc(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'npc_1',
    isPlayer: false,
    Name: 'Diệp Thần',
    Gender: 'Nam',
    Role: 'Kiếm khách',
    Personality: 'Trầm mặc',
    Appearance: 'Áo xanh',
    Backstory: 'Từ Bắc Vực tới',
    level: 12,
    exp: 40,
    affinity: 85,
    hp: 300,
    maxhp: 400,
    atk: 55,
    def: 33,
    spd: 21,
    cr: 15,
    cdmg: 150,
    evasion: 8,
    dmgAmp: 4,
    dmgRes: 6,
    titles: ['Đạo Lữ'],
    ...overrides,
  };
}

describe('stat projection (App 9 stats -> GDD 12)', () => {
  it('test_maps_every_app_stat_and_leaves_the_three_missing_ones_absent', () => {
    const stats = uiGlue.gddStatsFromApp(appNpc());
    expect(stats.HP).toBe(400);
    expect(stats.ATK).toBe(55);
    expect(stats.DEF).toBe(33);
    expect(stats.SPD).toBe(21);
    // No App counterpart exists - absence must stay visible, never become 0.
    expect(stats.ACC).toBeUndefined();
    expect(stats.LIFESTEAL).toBeUndefined();
    expect(stats.HP_REGEN).toBeUndefined();
  });

  it('test_percentage_stats_are_converted_to_fractions', () => {
    const stats = uiGlue.gddStatsFromApp(appNpc());
    expect(stats.CRIT_RATE).toBeCloseTo(0.15, 10);
    expect(stats.CRIT_DAMAGE).toBeCloseTo(1.5, 10);
    expect(stats.MITIGATION).toBeCloseTo(0.06, 10);
  });

  it('test_base_stat_projection_reports_the_three_missing_keys_as_a_content_gap', () => {
    const result = baseStatCompletenessCheck(
      uiGlue.gddBaseStatsFromApp({ baseHp: 200, baseAtk: 20, baseDef: 10, baseSpd: 30 }),
    );
    expect(result.ok).toBe(false);
    const missing = result.issues.map((issue) => issue.stat);
    expect(missing).toContain('ACC');
    expect(missing).toContain('LIFESTEAL');
    expect(missing).toContain('HP_REGEN');
  });

  it('test_base_stat_draft_round_trips_through_the_gdd_shape', () => {
    const current = uiGlue.gddBaseStatsFromApp({
      baseHp: 200,
      baseAtk: 20,
      baseDef: 10,
      baseSpd: 30,
      baseCr: 5,
      baseCdmg: 150,
      baseEvasion: 2,
      baseDmgAmp: 0,
      baseDmgRes: 0,
    });
    const gdd = uiGlue.baseStatDraftToGdd({ baseHp: '250', baseCr: '10' }, current);
    expect(gdd.HP).toBe(250);
    expect(gdd.CRIT_RATE).toBeCloseTo(0.1, 10);
    // A blank field keeps the CURRENT value; it must never silently become 0.
    expect(gdd.ATK).toBe(20);

    const back = uiGlue.gddStatsToAppBaseFields(gdd);
    expect(back.baseHp).toBe(250);
    expect(back.baseCr).toBeCloseTo(10, 10);
    expect(back.baseAtk).toBe(20);
  });

  it('test_blank_and_non_numeric_input_are_not_coerced_to_zero', () => {
    const gdd = uiGlue.baseStatDraftToGdd({ baseHp: '', baseAtk: 'abc' }, { HP: 100, ATK: 7 });
    expect(gdd.HP).toBe(100);
    expect(Number.isNaN(gdd.ATK as number)).toBe(true);
  });
});

describe('card character projection', () => {
  it('test_app_character_projects_onto_the_card_shape', () => {
    const card = uiGlue.cardCharacterFromApp(appNpc());
    expect(card.char_id).toBe('npc_1');
    expect(card.is_player).toBe(false);
    expect(card.name).toBe('Diệp Thần');
    expect(card.than_phan).toBe('Kiếm khách');
    expect(card.level).toBe(12);
    expect(card.alive).toBe(true);
  });

  it('test_a_zero_hp_character_projects_as_not_alive', () => {
    expect(uiGlue.cardCharacterFromApp(appNpc({ hp: 0 })).alive).toBe(false);
    expect(uiGlue.cardContextFromApp({ appChar: appNpc({ hp: 0 }) }).alive).toBe(false);
  });

  it('test_song_tu_button_follows_the_injected_app_threshold_only', () => {
    const gate = (npc: { affinity?: number }) => (npc.affinity || 0) >= 80;

    const high = buildCardBlocks(
      uiGlue.cardCharacterFromApp(appNpc({ affinity: 85 })),
      uiGlue.cardContextFromApp({ appChar: appNpc({ affinity: 85 }), showSongTuButton: gate }),
    );
    expect(high.affinity?.song_tu_button.visible).toBe(true);

    const low = buildCardBlocks(
      uiGlue.cardCharacterFromApp(appNpc({ affinity: 79 })),
      uiGlue.cardContextFromApp({ appChar: appNpc({ affinity: 79 }), showSongTuButton: gate }),
    );
    expect(low.affinity?.song_tu_button.visible).toBe(false);
  });

  it('test_a_resolving_turn_dims_but_never_hides_the_song_tu_button', () => {
    const ctx = uiGlue.cardContextFromApp({
      appChar: appNpc(),
      tmLocked: true,
      showSongTuButton: () => true,
    });
    const card = buildCardBlocks(uiGlue.cardCharacterFromApp(appNpc()), ctx);
    expect(card.affinity?.song_tu_button.visible).toBe(true);
    expect(card.affinity?.song_tu_button.enabled).toBe(false);
  });

  it('test_blocks_render_in_the_fixed_gdd_order', () => {
    const card = buildCardBlocks(
      uiGlue.cardCharacterFromApp(appNpc()),
      uiGlue.cardContextFromApp({ appChar: appNpc() }),
    );
    expect(card.order).toEqual(['profile', 'combat_stats', 'equipment', 'affinity']);
  });

  it('test_the_player_card_has_no_affinity_block_and_carries_the_exp_element', () => {
    const player = appNpc({ id: 'player', isPlayer: true, level: 3, exp: 10 });
    const card = buildCardBlocks(
      uiGlue.cardCharacterFromApp(player),
      uiGlue.cardContextFromApp({ appChar: player }),
    );
    expect(card.affinity).toBeNull();
    expect(card.combatStats.exp).not.toBeNull();
  });

  it('test_a_crippled_character_gets_the_status_badge_block', () => {
    const card = buildCardBlocks(
      uiGlue.cardCharacterFromApp(appNpc()),
      uiGlue.cardContextFromApp({ appChar: appNpc(), crippled: true }),
    );
    expect(card.order).toContain('status_badges');
    expect(card.statusBadges?.badges.map((b) => b.code)).toContain('crippled');
  });
});

describe('tm_state folding', () => {
  it('test_idle_app_is_awaiting_action', () => {
    expect(uiGlue.tmStateFromApp({})).toBe('awaiting_action');
  });

  it('test_processing_or_loading_is_resolving_and_undoing_wins', () => {
    expect(uiGlue.tmStateFromApp({ isProcessingAction: true })).toBe('resolving');
    expect(uiGlue.tmStateFromApp({ isLoading: true })).toBe('resolving');
    expect(uiGlue.tmStateFromApp({ isProcessingAction: true, isUndoingTurn: true })).toBe('undoing');
  });

  it('test_undo_button_is_hidden_without_availability_and_dimmed_while_resolving', () => {
    const resolving = { tm_state: uiGlue.tmStateFromApp({ isProcessingAction: true }), screen: 'S2' as const };
    const idle = { tm_state: uiGlue.tmStateFromApp({}), screen: 'S2' as const };
    expect(undoButtonState(false, idle)).toBe('hidden');
    expect(undoButtonState(true, resolving)).toBe('disabled');
    expect(undoButtonState(true, idle)).toBe('enabled');
  });
});

describe('settings composition (plan.md C-3)', () => {
  it('test_every_settings_item_has_a_handler_mapping', () => {
    const report = uiGlue.checkSettingsHandlerMap();
    expect(report.unmapped_ids).toEqual([]);
    expect(report.orphan_keys).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it('test_the_app_renders_exactly_the_four_groups_minus_the_api_modal_items', () => {
    const groups = uiGlue.settingsGroupsForApp();
    expect(groups.map((g) => g.group.id)).toEqual(SETTINGS_GROUPS.map((g) => g.id));
    const ids = groups.flatMap((g) => g.items.map((item) => item.id));
    for (const elsewhere of uiGlue.SETTINGS_ITEMS_ELSEWHERE) {
      expect(ids).not.toContain(elsewhere);
    }
    expect(ids).toContain('font_size_preset');
    expect(ids).toContain('hack_mode_toggle');
  });
});

describe('hack-mode toggle (gdd-06 C2 #1)', () => {
  function memoryStore(seed: Record<string, string> = {}) {
    const data = { ...seed };
    return {
      getItem: (key: string) => (key in data ? data[key] : null),
      setItem: (key: string, value: string) => {
        data[key] = value;
      },
      data,
    };
  }

  it('test_the_toggle_defaults_to_off_on_a_fresh_device', () => {
    expect(uiGlue.readHackModeFlag(memoryStore())).toBe(false);
    expect(uiGlue.readHackModeFlag(null)).toBe(false);
  });

  it('test_the_toggle_round_trips_through_the_device_store', () => {
    const store = memoryStore();
    uiGlue.writeHackModeFlag(store, true);
    expect(store.data[uiGlue.HACK_MODE_STORAGE_KEY]).toBe('1');
    expect(uiGlue.readHackModeFlag(store)).toBe(true);
    uiGlue.writeHackModeFlag(store, false);
    expect(uiGlue.readHackModeFlag(store)).toBe(false);
  });

  it('test_a_throwing_store_never_breaks_the_toggle', () => {
    const hostile = {
      getItem: () => {
        throw new Error('private mode');
      },
      setItem: () => {
        throw new Error('private mode');
      },
    };
    expect(uiGlue.readHackModeFlag(hostile)).toBe(false);
    expect(() => uiGlue.writeHackModeFlag(hostile, true)).not.toThrow();
  });

  it('test_the_entry_point_is_hidden_off_and_dimmed_while_resolving', () => {
    const base = { screen: 'gameplay' as const, in_combat: false, is_death_turn: false };
    expect(
      customizeButtonVisibility({ ...base, toggle_enabled: false, tm_state: 'awaiting_action' }),
    ).toBe('hidden');
    expect(
      customizeButtonVisibility({ ...base, toggle_enabled: true, tm_state: 'resolving' }),
    ).toBe('dimmed');
    expect(
      customizeButtonVisibility({ ...base, toggle_enabled: true, tm_state: 'awaiting_action' }),
    ).toBe('enabled');
  });
});

describe('banners', () => {
  it('test_quota_banner_fires_at_or_above_the_threshold', () => {
    const banner = uiGlue.quotaBanner({ usage: 850, quota: 1000 });
    expect(banner).not.toBeNull();
    expect(banner?.kind).toBe('QUOTA_WARNING');
    expect(banner?.text).toBe(uiGlue.QUOTA_BANNER_TEXT);
  });

  it('test_quota_banner_stays_silent_below_the_threshold_and_when_unmeasurable', () => {
    expect(uiGlue.quotaBanner({ usage: 100, quota: 1000 })).toBeNull();
    expect(uiGlue.quotaBanner({ usage: null, quota: 1000 })).toBeNull();
    expect(uiGlue.quotaBanner({ usage: 900, quota: null })).toBeNull();
  });

  it('test_persistence_warning_becomes_a_write_failure_banner', () => {
    const banner = uiGlue.persistenceBanner('Không ghi được tiến trình.');
    expect(banner?.kind).toBe('WRITE_FAILED_UNKNOWN');
    expect(banner?.text).toBe('Không ghi được tiến trình.');
    expect(uiGlue.persistenceBanner('')).toBeNull();
    expect(uiGlue.persistenceBanner(null)).toBeNull();
  });

  it('test_banner_ids_are_unique_within_a_session', () => {
    const a = uiGlue.makeBanner('INFO', 'a');
    const b = uiGlue.makeBanner('INFO', 'b');
    expect(a.id).not.toBe(b.id);
  });

  it('test_quota_ratio_label_is_player_readable', () => {
    expect(uiGlue.quotaRatioLabel(0.873)).toBe('87.3%');
    expect(uiGlue.quotaRatioLabel('not measured')).toBe('chưa đo được');
  });
});

describe('stat table integrity', () => {
  it('test_both_stat_tables_cover_all_twelve_gdd_stats', () => {
    for (const key of GDD_STAT_KEYS) {
      expect(uiGlue.APP_TO_GDD_FINAL_STAT).toHaveProperty(key);
      expect(uiGlue.APP_TO_GDD_BASE_STAT).toHaveProperty(key);
    }
  });

  it('test_validation_issues_flatten_into_one_vietnamese_line', () => {
    expect(uiGlue.issuesToText([{ message: 'Sai cấp.' }, { message: 'Sai EXP.' }])).toBe(
      'Sai cấp. Sai EXP.',
    );
    expect(uiGlue.issuesToText(undefined)).toBe('');
  });
});
