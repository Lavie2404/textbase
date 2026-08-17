/**
 * gdd-02 PART B acceptance criteria - Equipment & Skill Data System (18 AC).
 *
 * Story type Logic -> BLOCKING gate. Deterministic; no RNG, no clock, no I/O.
 */

import { describe, expect, it } from 'vitest';
import {
  datasetFromApp,
  emptyDataset,
  makeThucId,
  parseThucId,
  skillFromAppSkill,
  thucListFromAppSkill,
  tierFromRarity,
  weaponFromAppItem,
  type EquipmentDataset,
  type Skill,
  type Thuc,
  type Weapon,
} from '../../../src-web/systems/equipment/schema';
import {
  MAX_INVOCATIONS_PER_BATTLE,
  assertValidDataset,
  hasOwnStyleDescriptor,
  isPoolSufficient,
  isValidRecoveryItem,
  thucCount,
  validateDataset,
} from '../../../src-web/systems/equipment/validateDataset';
import {
  DEFAULT_STARTING_LOADOUT,
  basicAttackSkillId,
  deleteSkillAndScrub,
  equipWeapon,
  getOrInitLoadout,
  hasUsableSkill,
  learnSkill,
  markEverEquipped,
  markEverResolvedInCombat,
  usableSkillIds,
  type LoadoutStore,
} from '../../../src-web/systems/equipment/loadout';

// --- fixtures ---------------------------------------------------------------

function weapon(over: Partial<Weapon> = {}): Weapon {
  return {
    weapon_id: 'thiet_kiem',
    weapon_type: 'Kiếm',
    tier: 1,
    was_ever_equipped: false,
    ...over,
  };
}

function skill(over: Partial<Skill> = {}): Skill {
  return {
    skill_id: 'luu_van_kiem_phap',
    weapon_type: 'Kiếm',
    tier: 2,
    family_id: 'luu_van',
    style_descriptor: 'Kiếm ý như mây trôi, chậm mà không thể cản.',
    was_ever_resolved_in_combat: false,
    ...over,
  };
}

function thuc(id: string, skillId = 'luu_van_kiem_phap', name = 'Nhất Thức'): Thuc {
  return { thuc_id: id, skill_id: skillId, display_name: name };
}

function dataset(over: Partial<EquipmentDataset> = {}): EquipmentDataset {
  return {
    ...emptyDataset(),
    weapons: [weapon()],
    skills: [skill()],
    thuc: [thuc('t1'), thuc('t2'), thuc('t3')],
    validWeaponTypes: ['Kiếm'],
    ...over,
  };
}

// --- tests ------------------------------------------------------------------

describe('equipment_skill_data / structure', () => {
  it('AC-01 test_every_thuc_resolves_to_exactly_one_existing_parent_skill', () => {
    const d = dataset();
    for (const t of d.thuc) {
      const parents = d.skills.filter((s) => s.skill_id === t.skill_id);
      expect(parents).toHaveLength(1);
    }
    expect(validateDataset(d).is_valid_dataset).toBe(true);
  });

  it('AC-02 test_skills_in_one_family_each_keep_their_own_style_descriptor', () => {
    const kiem = skill({ skill_id: 'luu_van_kiem', weapon_type: 'Kiếm', style_descriptor: 'Kiếm ý như mây.' });
    const dao = skill({ skill_id: 'luu_van_dao', weapon_type: 'Đao', style_descriptor: 'Đao thế như sấm.' });
    expect(kiem.family_id).toBe(dao.family_id);
    expect(kiem.style_descriptor).not.toBe(dao.style_descriptor);
    expect(hasOwnStyleDescriptor(kiem)).toBe(true);
    expect(hasOwnStyleDescriptor(dao)).toBe(true);
  });

  it('AC-03 test_no_two_thuc_share_an_id_globally', () => {
    const d = dataset({
      skills: [skill({ skill_id: 'a' }), skill({ skill_id: 'b' })],
      thuc: [thuc('shared', 'a'), thuc('shared', 'b')],
    });
    const result = validateDataset(d);
    expect(result.is_valid_dataset).toBe(false);
    expect(result.violations.some((v) => v.code === 'DUPLICATE_THUC_ID')).toBe(true);
  });

  it('AC-04 test_style_descriptor_is_prose_not_locked_numeric_data', () => {
    const s = skill();
    expect(typeof s.style_descriptor).toBe('string');
    expect(Number.isFinite(Number(s.style_descriptor))).toBe(false);
  });

  it('AC-05 test_weapon_and_skill_tier_are_non_null_non_negative_integers', () => {
    expect(validateDataset(dataset()).is_valid_dataset).toBe(true);
    const bad = dataset({ weapons: [weapon({ tier: -1 })] });
    expect(validateDataset(bad).violations.some((v) => v.code === 'INVALID_TIER')).toBe(true);
    const nullish = dataset({ skills: [skill({ tier: undefined as unknown as number })], thuc: [] });
    expect(validateDataset(nullish).violations.some((v) => v.code === 'INVALID_TIER')).toBe(true);
  });

  it('AC-05b test_a_weapon_tier_of_zero_is_schema_legal', () => {
    // gdd-02 B9 #6 asymmetry: weapon tier 0 is legal, character tier 0 is not.
    expect(validateDataset(dataset({ weapons: [weapon({ tier: 0 })] })).is_valid_dataset).toBe(true);
  });

  it('AC-07 test_no_hp_or_exp_runtime_field_exists_anywhere_in_the_schema', () => {
    const dirty = dataset({
      weapons: [{ ...weapon(), hp: 100 } as unknown as Weapon],
    });
    const result = validateDataset(dirty);
    expect(result.is_valid_dataset).toBe(false);
    expect(result.violations.some((v) => v.code === 'RUNTIME_FIELD_PRESENT')).toBe(true);
  });

  it('AC-08 test_an_orphan_thuc_is_rejected', () => {
    const result = validateDataset(dataset({ thuc: [thuc('t1', 'khong_ton_tai')] }));
    expect(result.is_valid_dataset).toBe(false);
    expect(result.violations.some((v) => v.code === 'ORPHAN_THUC')).toBe(true);
  });

  it('AC-09 test_a_skill_weapon_type_outside_valid_weapon_types_is_rejected', () => {
    const result = validateDataset(dataset({ skills: [skill({ weapon_type: 'Thương' })], thuc: [] }));
    expect(result.is_valid_dataset).toBe(false);
    expect(result.violations.some((v) => v.code === 'UNKNOWN_WEAPON_TYPE')).toBe(true);
  });
});

describe('equipment_skill_data / F1 pool sufficiency', () => {
  it('AC-10 test_thuc_count_3_against_max_invocations_5_is_false_and_only_warns', () => {
    expect(isPoolSufficient(3, 5)).toBe(false);
    const result = validateDataset(dataset());
    expect(result.is_valid_dataset).toBe(true); // warning only, never blocking
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('AC-11 test_thuc_count_exactly_5_is_sufficient_because_the_test_is_gte', () => {
    expect(isPoolSufficient(5, 5)).toBe(true);
    expect(isPoolSufficient(4, 5)).toBe(false);
    expect(MAX_INVOCATIONS_PER_BATTLE).toBe(5);
  });

  it('AC-11b test_thuc_count_counts_only_the_parent_skill_children', () => {
    const d = dataset({
      skills: [skill({ skill_id: 'a' }), skill({ skill_id: 'b' })],
      thuc: [thuc('t1', 'a'), thuc('t2', 'a'), thuc('t3', 'b')],
    });
    expect(thucCount('a', d.thuc)).toBe(2);
    expect(thucCount('b', d.thuc)).toBe(1);
  });
});

describe('equipment_skill_data / F2 blocking gate', () => {
  it('AC-12 test_a_duplicated_thuc_id_makes_is_valid_dataset_false', () => {
    const d = dataset({ thuc: [thuc('dup'), thuc('dup')] });
    expect(validateDataset(d).is_valid_dataset).toBe(false);
  });

  it('AC-17 test_a_formula_2_violation_throws_so_ci_blocks_the_merge', () => {
    const d = dataset({ thuc: [thuc('dup'), thuc('dup')] });
    expect(() => assertValidDataset(d)).toThrowError(/is_valid_dataset = false/);
    expect(() => assertValidDataset(dataset())).not.toThrow();
  });

  it('AC-15 test_two_thuc_with_different_ids_but_identical_display_names_are_fine', () => {
    const d = dataset({
      skills: [skill({ skill_id: 'a' }), skill({ skill_id: 'b' })],
      thuc: [thuc('t1', 'a', 'Nhất Thức'), thuc('t2', 'b', 'Nhất Thức')],
    });
    expect(validateDataset(d).is_valid_dataset).toBe(true);
  });

  it('AC-16 test_weapon_tier_different_from_skill_tier_is_not_blocked', () => {
    const d = dataset({ weapons: [weapon({ tier: 2 })], skills: [skill({ tier: 4 })] });
    expect(validateDataset(d).is_valid_dataset).toBe(true);
  });

  it('RULE8 test_a_recovery_item_without_efficacy_is_invalid', () => {
    expect(isValidRecoveryItem({ item_id: 'tien_thao', efficacy: 0.5 })).toBe(true);
    expect(isValidRecoveryItem({ item_id: 'tien_thao' } as never)).toBe(false);
    expect(isValidRecoveryItem({ item_id: 'tien_thao', efficacy: 1.5 })).toBe(false);
    expect(validateDataset(dataset({ recoveryItems: [{ item_id: 'x', efficacy: 2 }] })).is_valid_dataset).toBe(false);
  });
});

describe('equipment_skill_data / loadout ownership', () => {
  it('AC-06 test_each_character_has_one_equipped_weapon_and_one_known_skill_list', () => {
    const store: LoadoutStore = {};
    const loadout = getOrInitLoadout(store, 'player');
    expect(loadout.equipped_weapon_id).toBe(DEFAULT_STARTING_LOADOUT.equipped_weapon_id);
    expect(Array.isArray(loadout.known_skill_ids)).toBe(true);
    equipWeapon(store, 'player', 'thiet_kiem');
    equipWeapon(store, 'player', 'huyen_thiet_kiem');
    expect(store['player'].equipped_weapon_id).toBe('huyen_thiet_kiem');
  });

  it('AC-13 test_empty_known_skill_ids_still_yields_at_least_one_usable_move', () => {
    const store: LoadoutStore = {};
    const loadout = getOrInitLoadout(store, 'npc_1');
    expect(loadout.known_skill_ids).toHaveLength(0);
    expect(hasUsableSkill(loadout, 'Kiếm')).toBe(true);
    expect(usableSkillIds(loadout, 'Kiếm')).toEqual([basicAttackSkillId('Kiếm')]);
  });

  it('AC-14 test_an_equipped_weapon_matching_no_known_skill_is_still_valid', () => {
    const store: LoadoutStore = {};
    learnSkill(store, 'player', 'luu_van_dao_phap'); // a Dao art
    equipWeapon(store, 'player', 'thiet_kiem'); // but a Kiem is equipped
    const usable = usableSkillIds(store['player'], 'Kiếm');
    expect(usable).toContain(basicAttackSkillId('Kiếm'));
    expect(usable.length).toBeGreaterThan(0);
  });

  it('AC-18 test_lazy_init_by_char_id_does_not_leak_a_dirtied_old_record', () => {
    const store: LoadoutStore = {};
    getOrInitLoadout(store, 'char_old');
    equipWeapon(store, 'char_old', 'thiet_kiem_hoen_ri');
    learnSkill(store, 'char_old', 'luu_van_kiem_phap_tam');

    const fresh = getOrInitLoadout(store, 'char_new');
    expect(fresh.equipped_weapon_id).toBe(DEFAULT_STARTING_LOADOUT.equipped_weapon_id);
    expect(fresh.known_skill_ids).toEqual([]);

    expect(store['char_old'].equipped_weapon_id).toBe('thiet_kiem_hoen_ri');
    expect(store['char_old'].known_skill_ids).toEqual(['luu_van_kiem_phap_tam']);
  });

  it('RULE9 test_was_ever_equipped_is_write_once_true_and_permanent', () => {
    const item = { was_ever_equipped: false };
    expect(markEverEquipped(item)).toBe(true);
    expect(item.was_ever_equipped).toBe(true);
    expect(markEverEquipped(item)).toBe(false); // already set, never re-fired
    expect(item.was_ever_equipped).toBe(true);
  });

  it('RULE9b test_was_ever_resolved_in_combat_is_write_once_true', () => {
    const s = { was_ever_resolved_in_combat: false };
    expect(markEverResolvedInCombat(s)).toBe(true);
    expect(markEverResolvedInCombat(s)).toBe(false);
    expect(s.was_ever_resolved_in_combat).toBe(true);
  });

  it('RULE9c test_deleting_a_skill_scrubs_every_known_skill_ids_in_one_transaction', () => {
    const store: LoadoutStore = {};
    learnSkill(store, 'a', 'doomed');
    learnSkill(store, 'b', 'doomed');
    learnSkill(store, 'b', 'kept');
    const skills = [skill({ skill_id: 'doomed' }), skill({ skill_id: 'kept' })];

    const out = deleteSkillAndScrub(store, skills, 'doomed');
    expect(out.removedSkill).toBe(true);
    expect(out.scrubbedCharIds.sort()).toEqual(['a', 'b']);
    expect(store['a'].known_skill_ids).toEqual([]);
    expect(store['b'].known_skill_ids).toEqual(['kept']);
    expect(skills.map((s) => s.skill_id)).toEqual(['kept']);
  });

  it('B5 test_exceeding_max_known_skills_warns_but_never_blocks', () => {
    const store: LoadoutStore = {};
    let last = learnSkill(store, 'p', 's0', 2);
    last = learnSkill(store, 'p', 's1', 2);
    expect(last.overCapacity).toBe(false);
    last = learnSkill(store, 'p', 's2', 2);
    expect(last.overCapacity).toBe(true);
    expect(store['p'].known_skill_ids).toHaveLength(3);
  });
});

describe('equipment_skill_data / App.tsx mapping layer', () => {
  it('MAP test_thuc_ids_are_generated_deterministically_from_the_skill_id', () => {
    expect(makeThucId('skill-1', 0)).toBe('skill-1:0');
    expect(parseThucId('skill-1:2')).toEqual({ skill_id: 'skill-1', index: 2 });
    expect(parseThucId('no-index')).toBeNull();
  });

  it('MAP test_app_skill_active_actions_become_thuc_with_backfilled_ids', () => {
    const appSkill = {
      id: 'sk_1',
      Name: 'Thần Hành',
      description: 'Bước chân như gió.',
      Rarity: 'Hiếm',
      skillType: 'adventure',
      active_actions: [{ action_name: 'Khinh Thân' }, { action_name: 'Độn Ảnh', thuc_id: 'custom' }],
    };
    const list = thucListFromAppSkill(appSkill);
    expect(list.map((t) => t.thuc_id)).toEqual(['sk_1:0', 'custom']);
    expect(list.every((t) => t.skill_id === 'sk_1')).toBe(true);
  });

  it('MAP test_app_item_and_skill_project_onto_the_gdd_shape', () => {
    const w = weaponFromAppItem({ id: 'it_1', Name: 'Thiết Kiếm', Type: 'Vũ khí chính', Rarity: 'Tốt' });
    expect(w).toMatchObject({ weapon_id: 'it_1', weapon_type: 'Vũ khí chính', tier: 1, was_ever_equipped: false });

    const s = skillFromAppSkill({ id: 'sk_1', description: 'Kiếm ý.', Rarity: 'Cực Phẩm', skillType: 'combat' });
    expect(s).toMatchObject({ skill_id: 'sk_1', tier: 3, style_descriptor: 'Kiếm ý.', family_id: null });
    expect(tierFromRarity('khong_biet')).toBe(0);
  });

  it('MAP test_a_dataset_built_from_live_app_data_validates', () => {
    const built = datasetFromApp(
      [{ id: 'it_1', Type: 'Vũ khí chính', Rarity: 'Tốt' }],
      [
        {
          id: 'sk_1',
          description: 'a',
          Rarity: 'Hiếm',
          skillType: 'adventure',
          active_actions: [{ action_name: 'x' }, { action_name: 'y' }, { action_name: 'z' }],
        },
      ],
    );
    const result = validateDataset(built);
    expect(result.is_valid_dataset).toBe(true);
    expect(built.thuc).toHaveLength(3);
  });
});
