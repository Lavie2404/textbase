/**
 * Core UI / Screen Navigation - D.4 touch targets, D.5 font scale + two-column,
 * D.6 transition ordering, the banner tier, the settings composition of plan.md
 * decision C-3, and the four CI-checkable static invariants.
 *
 * AC coverage (gdd-06 PART A, A8): AC-02, AC-20/21/22, AC-23..AC-27, AC-42/43,
 * AC-52, AC-63b, AC-67, AC-69.
 */

import { describe, expect, it } from 'vitest';
import {
  MIN_ADJACENT_GAP_PX,
  TOUCH_TARGET_MIN,
  expandAdjacentTargets,
  proseHitBox,
  spansOverlap,
  standaloneTargetOk,
  standaloneTargetSize,
} from '../../../src-web/systems/ui/touchTarget';
import {
  FONT_SIZE_SETTINGS,
  FONT_SCALE_STEP,
  applyAdvancedSlider,
  applyPreset,
  assertFontScaleSteps,
  clampTextScale,
  effectiveScale,
  fontScaleStepsMonotonic,
  presetFromTextScale,
  shouldShowFontSizeInvitation,
  textScaleFromPreset,
  themeScale,
} from '../../../src-web/systems/ui/fontScale';
import {
  TIER_ORDER,
  checkUiInvariants,
  durationOf,
  liveWindowInvariantValid,
  paginationInvariantValid,
  transitionDurations,
  transitionOrderingValid,
  twoColumnLayout,
  twoColumnThresholdPx,
  zOrderRank,
  zOrderValid,
} from '../../../src-web/systems/ui/layout';
import { BannerQueue, BANNER_TEXT } from '../../../src-web/systems/ui/bannerQueue';
import {
  HACK_MODE_TOGGLE_DEFAULT,
  SETTINGS_GROUPS,
  SETTINGS_ITEMS,
  checkSettingsIntegrity,
  findSettingsItem,
  groupedSettings,
  itemsByGroup,
} from '../../../src-web/systems/ui/settingsGroups';
import { CONTENT_EXCHANGE_ESTIMATE, UI_KNOBS } from '../../../src-web/systems/registry';

describe('D.4 minimum touch target (AC-20, AC-21, AC-22)', () => {
  it('test_standalone_elements_are_absolute', () => {
    expect(standaloneTargetOk(44, 44)).toBe(true);
    expect(standaloneTargetOk(43.9, 44)).toBe(false);
    expect(standaloneTargetSize(20, 10)).toEqual({ width: TOUCH_TARGET_MIN, height: TOUCH_TARGET_MIN });
  });

  it('test_prose_padding_is_capped_by_the_surrounding_typography', () => {
    // Half the line gap is the ceiling, so a tight line cannot reach 44px.
    const box = proseHitBox({ w: 30, h: 20, line_gap: 8, gap_to_neighbor: 100 });
    expect(box.pad_v).toBe(4);
    expect(box.hit_height).toBe(28);
    expect(box.meets_minimum).toBe(false);
    expect(box.compliant_by_exception).toBe(true);
  });

  it('test_prose_padding_reaches_the_minimum_when_the_typography_allows', () => {
    const box = proseHitBox({ w: 60, h: 30, line_gap: 40, gap_to_neighbor: 100 });
    expect(box.hit_height).toBeGreaterThanOrEqual(TOUCH_TARGET_MIN);
    expect(box.meets_minimum).toBe(true);
  });

  it('test_the_gap_term_wins_over_the_padding_term', () => {
    const tight = proseHitBox({ w: 10, h: 20, line_gap: 40, gap_to_neighbor: MIN_ADJACENT_GAP_PX });
    expect(tight.pad_h).toBe(0);
  });

  it('test_adjacent_targets_never_overlap_after_expansion', () => {
    const result = expandAdjacentTargets(
      { x: 0, w: 20, h: 20, line_gap: 40 },
      { x: 30, w: 20, h: 20, line_gap: 40 },
    );
    expect(result.overlap).toBe(false);
    expect(spansOverlap(result.left, result.right)).toBe(false);
  });
});

describe('D.5 font scale (AC-23, AC-69, AC-63b) and decision C-3', () => {
  it('test_exactly_three_strictly_increasing_steps', () => {
    expect(FONT_SIZE_SETTINGS.length).toBe(3);
    expect(FONT_SCALE_STEP.S).toBe(0.875);
    expect(FONT_SCALE_STEP.M).toBe(1.0);
    expect(FONT_SCALE_STEP.L).toBe(1.25);
    expect(fontScaleStepsMonotonic()).toBe(true);
  });

  it('test_the_monotonic_invariant_rejects_a_broken_knob_set', () => {
    expect(fontScaleStepsMonotonic({ S: 1.0, M: 0.875, L: 1.25 })).toBe(false);
    expect(() => assertFontScaleSteps({ S: 1.0, M: 1.0, L: 1.25 })).toThrow(RangeError);
  });

  it('test_preset_to_slider_round_trip_is_the_identity', () => {
    for (const setting of FONT_SIZE_SETTINGS) {
      expect(presetFromTextScale(textScaleFromPreset(setting))).toBe(setting);
    }
    expect(textScaleFromPreset('S')).toBe(90); // 87.5 clamped to the slider floor
    expect(textScaleFromPreset('M')).toBe(100);
    expect(textScaleFromPreset('L')).toBe(125);
  });

  it('test_slider_values_map_to_the_nearest_preset', () => {
    expect(presetFromTextScale(90)).toBe('S');
    expect(presetFromTextScale(93)).toBe('S');
    expect(presetFromTextScale(96)).toBe('M');
    expect(presetFromTextScale(112)).toBe('M');
    expect(presetFromTextScale(113)).toBe('L');
    expect(presetFromTextScale(140)).toBe('L');
  });

  it('test_slider_domain_is_clamped_to_the_shipped_range', () => {
    expect(clampTextScale(10)).toBe(90);
    expect(clampTextScale(999)).toBe(140);
    expect(clampTextScale(Number.NaN)).toBe(100);
  });

  it('test_choosing_a_preset_keeps_both_controls_in_sync', () => {
    expect(applyPreset('L')).toEqual({ font_size_setting: 'L', text_scale: 125 });
    expect(applyAdvancedSlider(132)).toEqual({ font_size_setting: 'L', text_scale: 132 });
  });

  it('test_effective_scale_prefers_the_exact_preset_value_on_preset_positions', () => {
    expect(effectiveScale(applyPreset('S'))).toBe(FONT_SCALE_STEP.S);
    expect(effectiveScale(applyAdvancedSlider(132))).toBeCloseTo(1.32, 10);
  });

  it('test_font_size_invitation_repeats_until_a_choice_is_made', () => {
    expect(shouldShowFontSizeInvitation({ font_size_setting: null, text_scale: 100 })).toBe(true);
    expect(shouldShowFontSizeInvitation(applyPreset('M'))).toBe(false);
  });
});

describe('D.5 two-column layout (AC-24, AC-25)', () => {
  it('test_touch_primary_always_forces_one_column', () => {
    expect(twoColumnLayout(1920, 'M', true)).toBe(0);
    expect(twoColumnLayout(1920, 'M', false)).toBe(1);
  });

  it('test_threshold_grows_with_the_font_step', () => {
    expect(twoColumnThresholdPx('S')).toBeCloseTo(2 * 360 * 0.875 + 24, 10);
    expect(twoColumnThresholdPx('M')).toBe(744);
    expect(twoColumnThresholdPx('L')).toBe(924);
    expect(twoColumnLayout(744, 'M', false)).toBe(1);
    expect(twoColumnLayout(743, 'M', false)).toBe(0);
    expect(twoColumnLayout(800, 'L', false)).toBe(0);
  });

  it('test_mobile_widths_are_always_one_column_without_an_is_mobile_branch', () => {
    for (const setting of FONT_SIZE_SETTINGS) {
      expect(twoColumnLayout(480, setting, false)).toBe(0);
      expect(twoColumnThresholdPx(setting)).toBeGreaterThan(654 - 1);
    }
  });

  it('test_theme_scale_reads_the_registry_steps', () => {
    expect(themeScale('M')).toBe(FONT_SCALE_STEP.M);
  });
});

describe('D.6 transition family and z-order (AC-27)', () => {
  it('test_rank_order_is_banner_settings_card_screen', () => {
    expect([...TIER_ORDER]).toEqual(['banner', 'overlay_settings', 'overlay_card', 'screen']);
    expect(zOrderRank('banner')).toBeLessThan(zOrderRank('overlay_settings'));
    expect(zOrderRank('overlay_settings')).toBeLessThan(zOrderRank('overlay_card'));
    expect(zOrderRank('overlay_card')).toBeLessThan(zOrderRank('screen'));
    expect(zOrderValid()).toBe(true);
  });

  it('test_card_duration_comes_from_the_card_owned_knob', () => {
    expect(durationOf('overlay_card')).toBe(UI_KNOBS.card_transition_ms);
  });

  it('test_the_cross_knob_ordering_invariant_catches_a_legal_local_edit', () => {
    // card_transition_ms = 300 is inside its own 0-400 range yet breaks card <= screen.
    expect(transitionOrderingValid(transitionDurations())).toBe(true);
    expect(
      transitionOrderingValid({
        banner: 120,
        overlay_settings: 150,
        overlay_card: 300,
        screen: 260,
      }),
    ).toBe(false);
    expect(
      transitionOrderingValid({ banner: 200, overlay_settings: 150, overlay_card: 200, screen: 260 }),
    ).toBe(false);
  });
});

describe('the four CI-checkable static invariants', () => {
  it('test_invariant_1_log_prefetch_threshold_below_page_size', () => {
    expect(UI_KNOBS.log_prefetch_threshold).toBeLessThan(UI_KNOBS.log_page_size);
    expect(paginationInvariantValid()).toBe(true);
  });

  it('test_invariant_2_banner_settings_card_screen_ordering', () => {
    expect(transitionOrderingValid()).toBe(true);
  });

  it('test_invariant_3_font_scale_steps_are_strictly_increasing', () => {
    expect(FONT_SCALE_STEP.S).toBeLessThan(FONT_SCALE_STEP.M);
    expect(FONT_SCALE_STEP.M).toBeLessThan(FONT_SCALE_STEP.L);
  });

  it('test_invariant_4_live_window_covers_one_full_combat', () => {
    expect(UI_KNOBS.live_window_turns).toBeGreaterThanOrEqual(CONTENT_EXCHANGE_ESTIMATE);
    expect(liveWindowInvariantValid()).toBe(true);
  });

  it('test_all_four_invariants_report_green_together', () => {
    expect(checkUiInvariants()).toEqual({
      pagination: true,
      transition_ordering: true,
      font_scale: true,
      live_window: true,
      all: true,
    });
  });
});

describe('banner tier (AC-02, AC-42, AC-43)', () => {
  const banner = (id: string, kind: Parameters<BannerQueue['push']>[0]['kind']) => ({
    id,
    kind,
    text: BANNER_TEXT[kind],
  });

  it('test_at_most_one_banner_is_visible_and_the_rest_queue_fifo', () => {
    const queue = new BannerQueue();
    queue.push(banner('a', 'INFO'));
    queue.push(banner('b', 'INFO'));
    queue.push(banner('c', 'INFO'));
    expect(queue.visible?.id).toBe('a');
    expect(queue.queued.map((x) => x.id)).toEqual(['b', 'c']);
    expect(queue.dismiss()?.id).toBe('b');
    expect(queue.dismiss()?.id).toBe('c');
    expect(queue.dismiss()).toBeNull();
    expect(queue.invariantHolds()).toBe(true);
  });

  it('test_write_failure_preempts_a_quota_warning_which_returns_to_the_queue', () => {
    const queue = new BannerQueue();
    queue.push(banner('quota', 'QUOTA_WARNING'));
    queue.push(banner('fail', 'WRITE_FAILED_QUOTA'));
    expect(queue.visible?.id).toBe('fail');
    expect(queue.queued.map((x) => x.id)).toEqual(['quota']);
    expect(queue.dismiss()?.id).toBe('quota');
  });

  it('test_a_write_failure_does_not_preempt_another_write_failure', () => {
    const queue = new BannerQueue();
    queue.push(banner('fail1', 'WRITE_FAILED_UNKNOWN'));
    queue.push(banner('fail2', 'WRITE_FAILED_QUOTA'));
    expect(queue.visible?.id).toBe('fail1');
  });

  it('test_banners_never_auto_dismiss_and_can_be_removed_by_id', () => {
    const queue = new BannerQueue();
    queue.push(banner('a', 'INFO'));
    queue.push(banner('b', 'BACKUP_PROMPT'));
    expect(queue.remove('b')).toBe(true);
    expect(queue.size).toBe(1);
    expect(queue.visible?.id).toBe('a'); // still there: no timer exists
    queue.clear();
    expect(queue.size).toBe(0);
  });
});

describe('settings composition - plan.md decision C-3', () => {
  it('test_exactly_four_groups_in_the_declared_order', () => {
    expect(SETTINGS_GROUPS.map((g) => g.id)).toEqual(['display', 'audio', 'ai_data', 'customize']);
    expect(SETTINGS_GROUPS.map((g) => g.label)).toEqual([
      'Hiển thị',
      'Âm thanh',
      'AI & Dữ liệu',
      'Tùy chỉnh nhân vật',
    ]);
  });

  it('test_every_group_has_items_and_ids_are_unique', () => {
    expect(checkSettingsIntegrity()).toEqual({
      ok: true,
      duplicate_ids: [],
      unknown_groups: [],
      empty_groups: [],
    });
    expect(groupedSettings().length).toBe(4);
  });

  it('test_the_shipped_settings_features_all_survive_the_regrouping', () => {
    for (const id of [
      'bgm_enabled',
      'bgm_volume',
      'play_style',
      'ui_theme',
      'theme_editor',
      'text_scale_advanced',
      'cloud_save',
      'load_game',
      'export_file_full',
      'export_file_light',
      'import_file',
      'gallery',
      'cache_manager',
      'htab_debug',
      'api_mode',
      'api_key',
    ]) {
      expect(findSettingsItem(id), id).not.toBeNull();
    }
  });

  it('test_the_new_integration_items_exist_with_vietnamese_labels', () => {
    expect(findSettingsItem('github_backup')?.label).toBe('Sao lưu lên GitHub');
    expect(findSettingsItem('export_keepsake')?.label).toBe('Xuất kỷ vật');
    expect(findSettingsItem('export_qa_log')?.label).toBe('Xuất nhật ký QA');
    expect(findSettingsItem('contract_log')?.label).toBe('Nhật ký khế ước');
    expect(findSettingsItem('hack_mode_toggle')?.label).toBe('Tùy chỉnh nhân vật');
  });

  it('test_the_hack_mode_toggle_defaults_to_off_and_lives_in_group_four', () => {
    const item = findSettingsItem('hack_mode_toggle');
    expect(item?.group).toBe('customize');
    expect(item?.default).toBe(false);
    expect(HACK_MODE_TOGGLE_DEFAULT).toBe(false);
    expect(itemsByGroup('customize').map((i) => i.id)).toEqual([
      'hack_mode_toggle',
      'open_customize',
    ]);
  });

  it('test_font_size_preset_is_the_primary_display_control', () => {
    const preset = findSettingsItem('font_size_preset');
    expect(preset?.group).toBe('display');
    expect(preset?.kind).toBe('select');
    expect(preset?.default).toBe('M');
    expect(SETTINGS_ITEMS.filter((i) => i.group === 'display').length).toBeGreaterThanOrEqual(5);
  });
});
