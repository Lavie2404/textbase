/**
 * Character Card & Identity - D.2 `displayed_field` and D.5
 * `base_stat_completeness_check`.
 *
 * AC coverage (gdd-06 PART B, B8): AC-06, AC-12..AC-17, AC-26, AC-27, AC-28,
 * AC-46, AC-47, plus the concealment activation constraint of Core Rule #6.
 */

import { describe, expect, it } from 'vitest';
import {
  CONCEALABLE_FIELDS,
  CONCEALED_BADGE,
  IDENTITY_FIELDS,
  PROFILE_FIELDS,
  STAT_FIELDS,
  UNKNOWN_SENTINEL,
  concealmentActivationValid,
  concealmentActive,
  disguiseActive,
  displayFlags,
  displayedField,
  displayedFieldMap,
  isConcealableField,
  maxHp,
  trueValue,
} from '../../../src-web/systems/card/displayedField';
import {
  baseStatCompletenessCheck,
  extraStatKeys,
  isValidBaseStatRecord,
} from '../../../src-web/systems/card/baseStatCompleteness';
import { GDD_STAT_KEYS } from '../../../src-web/systems/registry';
import { fullStats, fullSurfaceStats, makeCharacter, makeConcealedNpc } from './fixtures';

describe('field domains (gdd-06 B3)', () => {
  it('test_stat_fields_count_is_fourteen', () => {
    // 2 (level, tier) + the 12 combat stats.
    expect(STAT_FIELDS.length).toBe(14);
    expect(GDD_STAT_KEYS.length).toBe(12);
  });

  it('test_concealable_set_is_the_union_of_three_domains', () => {
    expect(CONCEALABLE_FIELDS.length).toBe(
      IDENTITY_FIELDS.length + STAT_FIELDS.length + PROFILE_FIELDS.length,
    );
    expect(isConcealableField('affinity')).toBe(false);
    expect(isConcealableField('location')).toBe(false);
    expect(isConcealableField('name')).toBe(true);
  });

  it('test_tier_is_derived_from_level_never_stored', () => {
    expect(trueValue(makeCharacter({ level: 1 }), 'tier')).toBe(1);
    expect(trueValue(makeCharacter({ level: 10 }), 'tier')).toBe(1);
    expect(trueValue(makeCharacter({ level: 11 }), 'tier')).toBe(2);
  });
});

describe('D.2 displayed_field - the four output kinds (AC-12..AC-15)', () => {
  it('test_plain_npc_field_returns_true_value', () => {
    const result = displayedField(makeCharacter(), 'name', displayFlags());
    expect(result.kind).toBe('true');
    expect(result.value).toBe('Diệp Thần');
    expect(result.badge).toBeNull();
  });

  it('test_concealed_field_with_surface_value_returns_displayed_plus_badge', () => {
    const result = displayedField(makeConcealedNpc(), 'name', displayFlags());
    expect(result.kind).toBe('displayed');
    expect(result.value).toBe('Lão nhân áo xám');
    expect(result.badge).toBe(CONCEALED_BADGE);
  });

  it('test_concealed_field_without_surface_value_returns_question_marks', () => {
    // `gender` has no surface value in the fixture.
    const result = displayedField(makeConcealedNpc(), 'gender', displayFlags());
    expect(result.kind).toBe('unknown');
    expect(result.value).toBe(UNKNOWN_SENTINEL);
    expect(result.badge).toBe(CONCEALED_BADGE);
  });

  it('test_canon_major_in_disguise_returns_dual_identity', () => {
    const c = makeCharacter({ disguise: { name: 'Vô Danh Khách' } });
    const result = displayedField(c, 'name', displayFlags({ is_canon_major: true, disguised: true }));
    expect(result.kind).toBe('dual_identity');
    expect(result.true_value).toBe('Diệp Thần');
    expect(result.disguise_value).toBe('Vô Danh Khách');
    expect(result.badge).toBeNull();
  });
});

describe('D.2 boundaries and the absolute-priority guard (AC-16, AC-17)', () => {
  it('test_is_major_canon_alone_does_not_produce_dual_identity', () => {
    const result = displayedField(makeCharacter(), 'name', displayFlags({ is_canon_major: true }));
    expect(result.kind).toBe('true');
  });

  it('test_canon_major_identity_beats_concealment_active', () => {
    const c = makeConcealedNpc();
    const result = displayedField(c, 'name', displayFlags({ is_canon_major: true }));
    // NEVER falls through to the concealment branch.
    expect(result.kind).toBe('true');
    expect(result.value).toBe('Diệp Thần');
  });

  it('test_canon_major_privilege_covers_identity_only_not_stats', () => {
    const c = makeConcealedNpc();
    const result = displayedField(c, 'ATK', displayFlags({ is_canon_major: true }));
    expect(result.kind).toBe('displayed');
    expect(result.badge).toBe(CONCEALED_BADGE);
  });

  it('test_canon_major_without_disguise_value_falls_back_to_true_value', () => {
    const c = makeCharacter({ disguise: { gender: 'Nữ' } });
    const result = displayedField(c, 'name', displayFlags({ is_canon_major: true, disguised: true }));
    expect(result.kind).toBe('true');
    expect(result.value).toBe('Diệp Thần');
  });

  it('test_disguise_active_is_derived_from_a_non_empty_alias_list', () => {
    expect(disguiseActive(makeCharacter())).toBe(false);
    expect(disguiseActive(makeCharacter({ alias_list: ['Vô Danh Khách'] }))).toBe(true);
  });
});

describe('D.2 with the two coarse app flags (P6a mapping)', () => {
  it('test_realm_hidden_conceals_stats_but_not_identity', () => {
    const c = makeCharacter();
    const flags = displayFlags({ realm_hidden: true });
    expect(displayedField(c, 'level', flags).kind).toBe('unknown');
    expect(displayedField(c, 'ATK', flags).kind).toBe('unknown');
    expect(displayedField(c, 'name', flags).kind).toBe('true');
  });

  it('test_disguised_conceals_identity_and_profile_but_not_stats', () => {
    const c = makeCharacter();
    const flags = displayFlags({ disguised: true });
    expect(displayedField(c, 'name', flags).kind).toBe('unknown');
    expect(displayedField(c, 'backstory', flags).kind).toBe('unknown');
    expect(displayedField(c, 'HP', flags).kind).toBe('true');
  });

  it('test_realm_hidden_uses_surface_value_when_one_exists', () => {
    const c = makeCharacter({
      concealment: { active: false, displayed: { level: 3 } },
    });
    const result = displayedField(c, 'level', displayFlags({ realm_hidden: true }));
    expect(result.kind).toBe('displayed');
    expect(result.value).toBe(3);
  });

  it('test_concealment_active_reports_true_for_any_layer', () => {
    expect(concealmentActive(makeCharacter())).toBe(false);
    expect(concealmentActive(makeCharacter(), displayFlags({ disguised: true }))).toBe(true);
    expect(concealmentActive(makeConcealedNpc())).toBe(true);
  });
});

describe('D.2 non-concealable fields and snapshot evaluation', () => {
  it('test_non_concealable_fields_are_outside_the_selector_domain', () => {
    // affinity / location / equipment never go through D.2 (gdd-06 B3).
    for (const field of ['affinity', 'location', 'equipped_weapon_id', 'alive']) {
      expect(isConcealableField(field)).toBe(false);
    }
  });

  it('test_displayed_field_map_evaluates_the_whole_card_as_one_snapshot', () => {
    const map = displayedFieldMap(makeConcealedNpc(), [...IDENTITY_FIELDS], displayFlags());
    expect(Object.keys(map)).toEqual(['name', 'gender', 'than_phan']);
    expect(map.name.kind).toBe('displayed');
    expect(map.gender.kind).toBe('unknown');
  });

  it('test_max_hp_bypasses_d2_under_concealment', () => {
    // AC-47: Combat-facing accessors read the true value directly.
    const c = makeConcealedNpc({ stats: fullStats(999) });
    expect(maxHp(c)).toBe(999);
    expect(displayedField(c, 'HP', displayFlags()).value).not.toBe(999);
  });
});

describe('Core Rule #6 activation constraint', () => {
  it('test_activation_valid_when_all_twelve_surface_stats_present', () => {
    expect(concealmentActivationValid(makeConcealedNpc())).toBe(true);
  });

  it('test_activation_invalid_when_one_surface_stat_missing', () => {
    const surface = fullSurfaceStats();
    delete surface.ATK;
    const c = makeCharacter({ concealment: { active: true, displayed: surface } });
    expect(concealmentActivationValid(c)).toBe(false);
  });
});

describe('D.5 base_stat_completeness_check (AC-26..AC-28, AC-46)', () => {
  it('test_passes_at_twelve_of_twelve', () => {
    const result = baseStatCompletenessCheck('npc_1', fullStats(5));
    expect(result.ok).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.content_gap_log).toBeNull();
  });

  it('test_fails_fast_on_a_missing_stat_and_logs_a_content_gap', () => {
    const stats = fullStats(5) as Record<string, number>;
    delete stats.SPD;
    const result = baseStatCompletenessCheck('npc_1', stats);
    expect(result.ok).toBe(false);
    expect(result.issues).toEqual([{ stat: 'SPD', reason: 'missing' }]);
    expect(result.content_gap_log).toContain('content gap');
    expect(result.message).toContain('SPD');
  });

  it('test_fails_on_a_negative_stat', () => {
    const result = baseStatCompletenessCheck('npc_1', { ...fullStats(5), DEF: -1 });
    expect(result.ok).toBe(false);
    expect(result.issues[0]).toEqual({ stat: 'DEF', reason: 'negative' });
  });

  it('test_fails_on_a_non_numeric_stat', () => {
    const result = baseStatCompletenessCheck('npc_1', { ...fullStats(5), ACC: '5' } as never);
    expect(result.ok).toBe(false);
    expect(result.issues[0]).toEqual({ stat: 'ACC', reason: 'not_numeric' });
  });

  it('test_fails_on_base_hp_zero_exactly_but_passes_at_zero_point_zero_one', () => {
    // AC-46: HP is strict > 0 because three systems use it as a denominator.
    expect(baseStatCompletenessCheck('c', { ...fullStats(5), HP: 0 }).ok).toBe(false);
    expect(baseStatCompletenessCheck('c', { ...fullStats(5), HP: 0.01 }).ok).toBe(true);
  });

  it('test_allows_zero_for_the_other_eleven_stats', () => {
    expect(isValidBaseStatRecord({ ...fullStats(0), HP: 1 })).toBe(true);
  });

  it('test_reports_extra_keys_separately_from_completeness', () => {
    const stats = { ...fullStats(5), STRAY: 1 } as Record<string, number>;
    expect(baseStatCompletenessCheck('c', stats).ok).toBe(true);
    expect(extraStatKeys(stats)).toEqual(['STRAY']);
  });
});
