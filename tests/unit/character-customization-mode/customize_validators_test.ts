/**
 * Character Customization Mode - D.1 availability, D.2/D.2b progress writes,
 * D.3 base stats, D.4 custom ids, D.5 conditional deletion.
 *
 * AC coverage (gdd-06 PART C, C8): AC-01, AC-06, AC-07, AC-09..AC-16, AC-25,
 * AC-26, AC-35..AC-39, AC-41, AC-47.
 */

import { describe, expect, it } from 'vitest';
import {
  customizeButtonVisibility,
  customizePanelAvailable,
  derivedTier,
  expandSkillDelete,
  isDeletableCustomEntry,
  isValidBaseStatSet,
  isValidCustomId,
  isValidItemSubmit,
  isValidLevelWrite,
  isValidProgressWrite,
  isValidSkillSubmit,
  parseStatDraft,
  parseStatInput,
  shouldForceClosePanel,
  validateDeleteBatch,
  validateProgressZone,
  STAT_FIELDS_12,
  type CustomEntry,
  type DeleteGateDeps,
} from '../../../src-web/systems/customize/validators';
import { linearExpThreshold } from '../../../src-web/systems/exp/expThreshold';
import { APP_SCREENS } from '../../../src-web/systems/ui/screenTransition';
import { TM_STATES } from '../../../src-web/systems/ui/writeActionAllowed';
import { EQUIPMENT_KNOBS, HACK_KNOBS } from '../../../src-web/systems/registry';
import { fullStatDraft, noDeps } from './fixtures';

const linear = (level: number) => linearExpThreshold(level);
const thresholdCtx = { thresholdFn: linear };

describe('D.1 customize_panel_available (AC-01, AC-41)', () => {
  it('test_full_matrix_has_exactly_one_true_combination', () => {
    let trueCount = 0;
    let total = 0;
    for (const toggle_enabled of [true, false]) {
      for (const screen of [...APP_SCREENS, 'S4-RO' as never, 'S5' as never]) {
        for (const tm_state of TM_STATES) {
          for (const in_combat of [true, false]) {
            for (const is_death_turn of [true, false]) {
              total += 1;
              if (
                customizePanelAvailable({
                  toggle_enabled,
                  screen: screen as never,
                  tm_state,
                  in_combat,
                  is_death_turn,
                })
              ) {
                trueCount += 1;
              }
            }
          }
        }
      }
    }
    expect(total).toBe(2 * 5 * 3 * 2 * 2); // 120 combinations
    expect(trueCount).toBe(1);
  });

  it('test_the_single_true_combination_is_the_expected_one', () => {
    expect(
      customizePanelAvailable({
        toggle_enabled: true,
        screen: 'gameplay',
        tm_state: 'awaiting_action',
        in_combat: false,
        is_death_turn: false,
      }),
    ).toBe(true);
  });

  it('test_button_is_hidden_when_the_toggle_is_off_or_off_screen_or_on_a_death_turn', () => {
    const base = {
      toggle_enabled: true,
      screen: 'gameplay' as const,
      tm_state: 'awaiting_action' as const,
      in_combat: false,
      is_death_turn: false,
    };
    expect(customizeButtonVisibility({ ...base, toggle_enabled: false })).toBe('hidden');
    expect(customizeButtonVisibility({ ...base, screen: 'initial' })).toBe('hidden');
    expect(customizeButtonVisibility({ ...base, is_death_turn: true })).toBe('hidden');
  });

  it('test_button_is_dimmed_while_resolving_or_in_combat', () => {
    const base = {
      toggle_enabled: true,
      screen: 'gameplay' as const,
      tm_state: 'awaiting_action' as const,
      in_combat: false,
      is_death_turn: false,
    };
    expect(customizeButtonVisibility({ ...base, tm_state: 'resolving' })).toBe('dimmed');
    expect(customizeButtonVisibility({ ...base, tm_state: 'undoing' })).toBe('dimmed');
    expect(customizeButtonVisibility({ ...base, in_combat: true })).toBe('dimmed');
    expect(customizeButtonVisibility(base)).toBe('enabled');
  });

  it('test_panel_force_closes_when_in_combat_flips_true_while_open', () => {
    // AC-02, defensive mock-only path.
    const ctx = {
      toggle_enabled: true,
      screen: 'gameplay' as const,
      tm_state: 'awaiting_action' as const,
      in_combat: true,
      is_death_turn: false,
    };
    expect(shouldForceClosePanel(true, ctx)).toBe(true);
    expect(shouldForceClosePanel(false, ctx)).toBe(false);
  });
});

describe('D.2 is_valid_level_write (AC-06, AC-07)', () => {
  it('test_the_ten_declared_fixtures', () => {
    expect(isValidLevelWrite(1)).toBe(true);
    expect(isValidLevelWrite(50)).toBe(true);
    expect(isValidLevelWrite(0)).toBe(false);
    expect(isValidLevelWrite(-5)).toBe(false);
    expect(isValidLevelWrite(3.5)).toBe(false);
    expect(isValidLevelWrite(HACK_KNOBS.LEVEL_WRITE_MAX)).toBe(true);
    expect(isValidLevelWrite(HACK_KNOBS.LEVEL_WRITE_MAX + 1)).toBe(false);
    expect(isValidLevelWrite('')).toBe(false);
    expect(isValidLevelWrite('abc')).toBe(false);
    expect(isValidLevelWrite(Number.NaN)).toBe(false);
  });

  it('test_infinity_is_caught_by_the_finite_ceiling', () => {
    expect(isValidLevelWrite(Number.POSITIVE_INFINITY)).toBe(false);
  });

  it('test_tier_is_derived_and_never_written', () => {
    expect(derivedTier(1)).toBe(1);
    expect(derivedTier(10)).toBe(1);
    expect(derivedTier(11)).toBe(2);
  });
});

describe('D.2b is_valid_progress_write - the 13 fixtures (AC-35)', () => {
  it('test_pass_new_level_resets_exp', () => {
    expect(isValidProgressWrite({ level: 50, current_exp: 0, state: 'Tu Luyện Thường' }, thresholdCtx).ok).toBe(
      true,
    );
  });

  it('test_pass_round_level_at_threshold_with_awaiting_state', () => {
    expect(
      isValidProgressWrite(
        { level: 10, current_exp: linear(10), state: 'Chờ Đột Phá' },
        thresholdCtx,
      ).ok,
    ).toBe(true);
  });

  it('test_pass_no_op_keeps_accumulated_exp', () => {
    expect(
      isValidProgressWrite({ level: 25, current_exp: 200, state: 'Tu Luyện Thường' }, thresholdCtx).ok,
    ).toBe(true);
  });

  it('test_pass_float_exp_is_legal_the_economy_is_float_native', () => {
    expect(
      isValidProgressWrite({ level: 25, current_exp: 123.45, state: 'Tu Luyện Thường' }, thresholdCtx).ok,
    ).toBe(true);
  });

  it('test_fail_exp_above_threshold_on_a_round_level', () => {
    const result = isValidProgressWrite(
      { level: 50, current_exp: linear(50) + 1, state: 'Chờ Đột Phá' },
      thresholdCtx,
    );
    expect(result.ok).toBe(false);
    expect(result.errors.map((e) => e.code)).toContain('exp_above_cap');
  });

  it('test_fail_ghost_breakthrough_on_a_non_round_level', () => {
    const result = isValidProgressWrite(
      { level: 25, current_exp: 200, state: 'Chờ Đột Phá' },
      thresholdCtx,
    );
    expect(result.ok).toBe(false);
    expect(result.errors.map((e) => e.code)).toContain('ghost_breakthrough');
  });

  it('test_fail_exp_equal_to_threshold_on_a_non_round_level_strict_bound', () => {
    const result = isValidProgressWrite(
      { level: 25, current_exp: linear(25), state: 'Tu Luyện Thường' },
      thresholdCtx,
    );
    expect(result.ok).toBe(false);
    expect(result.errors.map((e) => e.code)).toContain('exp_above_threshold');
  });

  it('test_fail_round_level_at_threshold_without_the_awaiting_state', () => {
    const result = isValidProgressWrite(
      { level: 10, current_exp: linear(10), state: 'Tu Luyện Thường' },
      thresholdCtx,
    );
    expect(result.ok).toBe(false);
    expect(result.errors.map((e) => e.code)).toContain('breakthrough_mismatch');
  });

  it('test_fail_awaiting_state_on_a_non_round_level_with_full_exp', () => {
    const result = isValidProgressWrite(
      { level: 11, current_exp: linear(11), state: 'Chờ Đột Phá' },
      thresholdCtx,
    );
    expect(result.ok).toBe(false);
  });

  it('test_fail_awaiting_state_with_exp_below_threshold', () => {
    const result = isValidProgressWrite({ level: 10, current_exp: 5, state: 'Chờ Đột Phá' }, thresholdCtx);
    expect(result.ok).toBe(false);
    expect(result.errors.map((e) => e.code)).toContain('breakthrough_mismatch');
  });

  it('test_fail_negative_exp', () => {
    const result = isValidProgressWrite({ level: 25, current_exp: -1, state: 'Tu Luyện Thường' }, thresholdCtx);
    expect(result.ok).toBe(false);
    expect(result.errors.map((e) => e.code)).toContain('exp_invalid');
  });

  it('test_fail_infinite_exp', () => {
    const result = isValidProgressWrite(
      { level: 25, current_exp: Number.POSITIVE_INFINITY, state: 'Tu Luyện Thường' },
      thresholdCtx,
    );
    expect(result.ok).toBe(false);
  });

  it('test_fail_unknown_state_string', () => {
    const result = isValidProgressWrite({ level: 25, current_exp: 0, state: 'Phi Thăng' }, thresholdCtx);
    expect(result.ok).toBe(false);
    expect(result.errors.map((e) => e.code)).toContain('state_invalid');
  });
});

describe('D.2b default fill and the no-op gate (AC-08, AC-36)', () => {
  const ctx = {
    old_level: 25,
    old_current_exp: 200,
    old_state: 'Tu Luyện Thường' as const,
    thresholdFn: linear,
  };

  it('test_changing_the_level_resets_exp_to_zero_and_the_state_to_normal', () => {
    const result = validateProgressZone({ level: 50 }, ctx);
    expect(result.ok).toBe(true);
    expect(result.write).toEqual({ level: 50, current_exp: 0, state: 'Tu Luyện Thường' });
    expect(result.is_noop).toBe(false);
  });

  it('test_resubmitting_the_current_level_preserves_accumulated_exp', () => {
    const result = validateProgressZone({ level: 25 }, ctx);
    expect(result.write).toEqual({ level: 25, current_exp: 200, state: 'Tu Luyện Thường' });
    expect(result.is_noop).toBe(true);
  });

  it('test_no_op_preserves_an_existing_awaiting_breakthrough_state', () => {
    const awaiting = {
      old_level: 10,
      old_current_exp: linear(10),
      old_state: 'Chờ Đột Phá' as const,
      thresholdFn: linear,
    };
    const result = validateProgressZone({ level: 10 }, awaiting);
    expect(result.ok).toBe(true);
    expect(result.write?.state).toBe('Chờ Đột Phá');
  });

  it('test_an_explicit_exp_value_wins_over_the_default_fill', () => {
    const result = validateProgressZone({ level: 50, current_exp: 12.5 }, ctx);
    expect(result.write?.current_exp).toBe(12.5);
  });

  it('test_the_write_payload_carries_no_tier_key', () => {
    const result = validateProgressZone({ level: 50 }, ctx);
    expect(Object.keys(result.write ?? {})).toEqual(['level', 'current_exp', 'state']);
  });
});

describe('D.3 is_valid_base_stat_set (AC-09, AC-10, AC-11, AC-37, AC-42)', () => {
  it('test_all_twelve_valid_values_pass', () => {
    expect(isValidBaseStatSet(fullStatDraft(10)).ok).toBe(true);
  });

  it('test_eleven_of_twelve_blocks_the_submit', () => {
    const draft = fullStatDraft(10);
    delete draft.SPD;
    const result = isValidBaseStatSet(draft);
    expect(result.ok).toBe(false);
    expect(result.errors[0].code).toBe('stat_missing');
  });

  it('test_a_stray_extra_key_fails_the_equality_check', () => {
    const result = isValidBaseStatSet({ ...fullStatDraft(10), STRAY: 1 });
    expect(result.ok).toBe(false);
    expect(result.errors.map((e) => e.code)).toContain('unknown_stat_key');
  });

  it('test_hp_must_be_strictly_positive_while_zero_is_legal_elsewhere', () => {
    expect(isValidBaseStatSet({ ...fullStatDraft(10), HP: 0 }).ok).toBe(false);
    expect(isValidBaseStatSet({ ...fullStatDraft(0), HP: 1 }).ok).toBe(true);
  });

  it('test_negative_non_hp_stats_are_blocked', () => {
    expect(isValidBaseStatSet({ ...fullStatDraft(10), DEF: -0.1 }).ok).toBe(false);
  });

  it('test_stat_write_max_passes_and_ten_times_it_fails', () => {
    expect(isValidBaseStatSet(fullStatDraft(HACK_KNOBS.STAT_WRITE_MAX)).ok).toBe(true);
    expect(isValidBaseStatSet(fullStatDraft(HACK_KNOBS.STAT_WRITE_MAX * 10)).ok).toBe(false);
  });

  it('test_non_finite_values_are_blocked', () => {
    expect(isValidBaseStatSet({ ...fullStatDraft(10), ATK: Number.POSITIVE_INFINITY }).ok).toBe(false);
    expect(isValidBaseStatSet({ ...fullStatDraft(10), ATK: Number.NaN }).ok).toBe(false);
  });

  it('test_a_blank_input_becomes_undefined_and_fails_while_a_deliberate_zero_passes', () => {
    expect(parseStatInput('')).toBeUndefined();
    expect(parseStatInput('   ')).toBeUndefined();
    expect(parseStatInput('0')).toBe(0);
    const draft = parseStatDraft({ ...fullStatDraft(10), ACC: '' });
    expect(isValidBaseStatSet(draft).ok).toBe(false);
    expect(isValidBaseStatSet(parseStatDraft({ ...fullStatDraft(10), ACC: '0' })).ok).toBe(true);
  });

  it('test_the_twelve_canonical_keys_match_the_registry', () => {
    expect(STAT_FIELDS_12.length).toBe(12);
    expect([...STAT_FIELDS_12]).toContain('HP');
    expect([...STAT_FIELDS_12]).toContain('CRIT_RATE');
  });
});

describe('D.4 custom ids and creation (AC-12..AC-16, AC-25, AC-26, AC-47)', () => {
  const existing = { item: ['kiem_go'], skill: ['ngu_kiem'], thuc: ['ngu_kiem:0'] };

  it('test_uniqueness_is_enforced_at_submit_time_against_the_shared_namespace', () => {
    expect(isValidCustomId('kiem_go', 'item', existing).ok).toBe(false);
    expect(isValidCustomId('kiem_sat', 'item', existing).ok).toBe(true);
  });

  it('test_comparison_is_case_sensitive', () => {
    expect(isValidCustomId('Kiem_Go', 'item', existing).ok).toBe(true);
  });

  it('test_namespaces_are_separate', () => {
    expect(isValidCustomId('kiem_go', 'skill', existing).ok).toBe(true);
  });

  it('test_an_empty_id_is_blocked', () => {
    expect(isValidCustomId('', 'item', existing).ok).toBe(false);
    expect(isValidCustomId(undefined, 'item', existing).ok).toBe(false);
  });

  it('test_collisions_are_never_auto_renamed', () => {
    const result = isValidCustomId('kiem_go', 'item', existing);
    expect(result.errors[0].code).toBe('id_collision');
    expect(result.errors[0].message).toContain('đổi tên');
  });

  it('test_a_skill_with_zero_thuc_is_blocked', () => {
    const result = isValidSkillSubmit({ skill_id: 'moi', thuc_ids: [] }, existing);
    expect(result.ok).toBe(false);
    expect(result.errors.map((e) => e.code)).toContain('skill_without_thuc');
  });

  it('test_two_new_thuc_cannot_collide_with_each_other_inside_one_batch', () => {
    const result = isValidSkillSubmit({ skill_id: 'moi', thuc_ids: ['t1', 't1'] }, existing);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.field === 'thuc_ids[1]')).toBe(true);
  });

  it('test_a_valid_skill_submit_passes_with_no_warnings', () => {
    const result = isValidSkillSubmit(
      { skill_id: 'moi', thuc_ids: ['t1', 't2', 't3'], known_skill_count: 1 },
      existing,
    );
    expect(result.ok).toBe(true);
    expect(result.warnings).toEqual([]);
  });

  it('test_under_three_thuc_warns_but_succeeds', () => {
    const result = isValidSkillSubmit({ skill_id: 'moi', thuc_ids: ['t1'] }, existing);
    expect(result.ok).toBe(true);
    expect(result.warnings.map((w) => w.code)).toContain('thuc_below_recommended');
    expect(EQUIPMENT_KNOBS.min_thuc_per_skill).toBe(3);
  });

  it('test_exceeding_six_known_skills_warns_but_succeeds', () => {
    const result = isValidSkillSubmit(
      { skill_id: 'moi', thuc_ids: ['t1', 't2', 't3'], known_skill_count: 6 },
      existing,
    );
    expect(result.ok).toBe(true);
    expect(result.warnings.map((w) => w.code)).toContain('known_skills_above_recommended');
  });

  it('test_item_efficacy_boundaries', () => {
    const cases: [unknown, boolean][] = [
      [undefined, false],
      [-0.1, false],
      [0, true],
      [0.5, true],
      [1.0, true],
      [1.1, false],
    ];
    cases.forEach(([efficacy, allowed], index) => {
      const result = isValidItemSubmit(
        { item_id: 'item_' + index, efficacy, is_recovery_item: true },
        existing,
      );
      expect(result.ok, String(efficacy)).toBe(allowed);
    });
  });

  it('test_a_non_recovery_item_does_not_require_efficacy', () => {
    expect(isValidItemSubmit({ item_id: 'ao_choang', is_recovery_item: false }, existing).ok).toBe(
      true,
    );
  });
});

describe('D.5 conditional deletion (AC-39)', () => {
  const item = (over: Partial<CustomEntry> = {}): CustomEntry => ({
    id: 'custom_item',
    type: 'item',
    created_by_hack: true,
    ...over,
  });
  const skill = (over: Partial<CustomEntry> = {}): CustomEntry => ({
    id: 'custom_skill',
    type: 'skill',
    created_by_hack: true,
    ...over,
  });

  it('test_an_unreferenced_hack_item_is_deletable', () => {
    expect(isDeletableCustomEntry(item(), noDeps()).ok).toBe(true);
  });

  it('test_original_content_is_never_deletable', () => {
    const result = isDeletableCustomEntry(item({ created_by_hack: false }), noDeps());
    expect(result.ok).toBe(false);
    expect(result.errors.map((e) => e.code)).toContain('not_custom');
  });

  it('test_a_world_memory_reference_blocks_the_delete', () => {
    const deps: DeleteGateDeps = { ...noDeps(), referencedInWorldMemory: () => true };
    const result = isDeletableCustomEntry(item(), deps);
    expect(result.ok).toBe(false);
    expect(result.errors.map((e) => e.code)).toContain('referenced_in_world_memory');
  });

  it('test_was_ever_equipped_is_past_perfect_and_blocks_an_item', () => {
    const deps: DeleteGateDeps = { ...noDeps(), wasEverEquipped: () => true };
    expect(isDeletableCustomEntry(item(), deps).ok).toBe(false);
    // The same marker does not block a skill - the gate is per type.
    expect(isDeletableCustomEntry(skill(), deps).ok).toBe(true);
  });

  it('test_was_ever_resolved_in_combat_blocks_a_skill', () => {
    const deps: DeleteGateDeps = { ...noDeps(), wasEverResolvedInCombat: () => true };
    expect(isDeletableCustomEntry(skill(), deps).ok).toBe(false);
  });

  it('test_a_thuc_whose_parent_skill_survives_cannot_be_deleted_alone', () => {
    const thuc: CustomEntry = {
      id: 'custom_skill:0',
      type: 'thuc',
      created_by_hack: true,
      parent_skill_id: 'custom_skill',
    };
    const deps: DeleteGateDeps = { ...noDeps(), hasParentSkillAlive: () => true };
    expect(isDeletableCustomEntry(thuc, deps).ok).toBe(false);
  });

  it('test_deleting_a_skill_cascades_to_all_of_its_thuc', () => {
    const thucList: CustomEntry[] = [0, 1, 2].map((i) => ({
      id: 'custom_skill:' + i,
      type: 'thuc',
      created_by_hack: true,
      parent_skill_id: 'custom_skill',
    }));
    const batch = expandSkillDelete(skill(), thucList);
    expect(batch.length).toBe(4);
    const result = validateDeleteBatch(batch, noDeps());
    expect(result.ok).toBe(true);
    expect(result.removed_ids).toEqual([
      'custom_skill',
      'custom_skill:0',
      'custom_skill:1',
      'custom_skill:2',
    ]);
    expect(result.scrub_known_skill_ids).toEqual(['custom_skill']);
  });

  it('test_the_cascade_is_all_or_nothing', () => {
    const thucList: CustomEntry[] = [
      { id: 'custom_skill:0', type: 'thuc', created_by_hack: true, parent_skill_id: 'custom_skill' },
      { id: 'custom_skill:1', type: 'thuc', created_by_hack: false, parent_skill_id: 'custom_skill' },
    ];
    const result = validateDeleteBatch(expandSkillDelete(skill(), thucList), noDeps());
    expect(result.ok).toBe(false);
    expect(result.removed_ids).toEqual([]);
    expect(result.scrub_known_skill_ids).toEqual([]);
  });
});
