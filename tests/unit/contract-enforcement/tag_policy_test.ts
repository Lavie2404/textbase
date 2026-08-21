/**
 * Contract Enforcement - C-1 tag split.
 * Design docs: plan.md decision C-1; gdd-01 B.2 R3; app-map.md section 3.
 */

import { describe, expect, it } from 'vitest';
import {
  ContractViolationError,
  ENCOUNTER_REWARD_EP_CAP,
  MECHANICAL_RESULT_TAGS,
  WORLD_CONTENT_TAGS,
  classifyTag,
  isMechanicalResultTag,
  isWorldContentTag,
  parseTags,
  sanitizeCommandBlock,
} from '../../../src-web/systems/contract/tagPolicy';

const PLAYER = { playerIds: ['p1', 'Diệp Thần'] };

describe('tag inventory', () => {
  it('test_world_content_and_mechanical_lists_do_not_overlap', () => {
    const overlap = WORLD_CONTENT_TAGS.filter((t) => MECHANICAL_RESULT_TAGS.includes(t));
    expect(overlap).toEqual([]);
  });

  it('test_membership_helpers_agree_with_the_lists', () => {
    expect(isWorldContentTag('CREATE_NPC')).toBe(true);
    expect(isWorldContentTag('QUEST_ASSIGNED')).toBe(true);
    expect(isWorldContentTag('SYSTEM_ANYTHING')).toBe(true);
    expect(isMechanicalResultTag('ENCOUNTER_REWARD')).toBe(true);
    expect(isMechanicalResultTag('CREATE_NPC')).toBe(false);
  });
});

describe('parser', () => {
  it('test_parses_key_value_and_positional_tag_shapes', () => {
    const tags = parseTags('[CREATE_NPC: Name="Lý Mỗ", Role="Kiếm khách"] [ENCOUNTER_REWARD 50,thắng,p1]');
    expect(tags).toHaveLength(2);
    expect(tags[0].attrs.Name).toBe('Lý Mỗ');
    expect(tags[1].positional).toEqual(['50', 'thắng', 'p1']);
  });

  it('test_parses_bare_tags', () => {
    const tags = parseTags('[EXIT_TRADE_MODE]');
    expect(tags[0].name).toBe('EXIT_TRADE_MODE');
    expect(tags[0].attrs).toEqual({});
  });
});

describe('classifyTag allow/strip matrix', () => {
  it('test_world_content_tags_are_allowed', () => {
    expect(classifyTag('CREATE_NPC', { Name: 'Lý Mỗ' })).toBe('allow');
    expect(classifyTag('LORE_LOCATION', {})).toBe('allow');
    expect(classifyTag('TIME_PASSED', { hours: '3' })).toBe('allow');
    expect(classifyTag('MOVE_PLAYER', { target: 'loc_2' })).toBe('allow');
  });

  it('test_unknown_tags_are_stripped_and_logged', () => {
    expect(classifyTag('TOTALLY_NEW_TAG', {})).toBe('strip_and_log');
  });

  it('test_encounter_reward_within_cap_is_allowed', () => {
    expect(classifyTag('ENCOUNTER_REWARD', { ep_score: String(ENCOUNTER_REWARD_EP_CAP) })).toBe('allow');
  });

  it('test_encounter_reward_above_cap_is_stripped_and_logged', () => {
    expect(classifyTag('ENCOUNTER_REWARD', { ep_score: '500' })).toBe('strip_and_log');
    expect(classifyTag('ENCOUNTER_REWARD', {}, {}, ['500', 'lý do', 'p1'])).toBe('strip_and_log');
  });

  it('test_relationship_changed_without_a_number_keeps_its_standing_half', () => {
    expect(classifyTag('RELATIONSHIP_CHANGED', { NPC: 'Lý Mỗ', Standing: 'Nghi ngờ' })).toBe('allow');
    expect(classifyTag('RELATIONSHIP_CHANGED', { AffinityChange: '0' })).toBe('allow');
  });

  it('test_relationship_changed_with_a_number_is_stripped_and_logged', () => {
    expect(classifyTag('RELATIONSHIP_CHANGED', { AffinityChange: '-12' })).toBe('strip_and_log');
  });

  it('test_player_death_and_revive_are_forbidden_but_npc_ones_are_not', () => {
    expect(classifyTag('CHARACTER_DEATH', { target: 'p1' }, PLAYER)).toBe('strip_and_log');
    expect(classifyTag('CHARACTER_REVIVE', { target: 'Diệp Thần' }, PLAYER)).toBe('strip_and_log');
    expect(classifyTag('CHARACTER_DEATH', { target: 'npc_7' }, PLAYER)).toBe('allow');
  });

  it('test_set_level_is_forbidden_for_the_player', () => {
    expect(classifyTag('SET_LEVEL', { target: 'p1', level: '40' }, PLAYER)).toBe('strip_and_log');
    expect(classifyTag('SET_LEVEL', { target: 'npc_7', level: '40' }, PLAYER)).toBe('allow');
  });

  it('test_heal_participants_is_always_forbidden', () => {
    expect(classifyTag('HEAL_PARTICIPANTS', {})).toBe('strip_and_log');
  });

  it('test_character_update_writing_mechanical_fields_is_forbidden', () => {
    expect(classifyTag('CHARACTER_UPDATE', { target: 'p1', exp: '900' }, PLAYER)).toBe('strip_and_log');
    expect(classifyTag('CHARACTER_UPDATE', { target: 'npc_7', hp: '10' }, PLAYER)).toBe('allow');
    expect(classifyTag('CHARACTER_UPDATE', { target: 'p1', Appearance: 'rách rưới' }, PLAYER)).toBe('allow');
  });

  it('test_player_hp_writes_are_allowed_by_default_and_barred_on_opt_in', () => {
    // STORY mode has no CombatLoop owning HP, so redacting it would delete all
    // damage from the scene - the bar is opt-in per mode.
    expect(classifyTag('CHARACTER_UPDATE', { target: 'p1', hp: '10' }, PLAYER)).toBe('allow');
    expect(
      classifyTag('CHARACTER_UPDATE', { target: 'p1', hp: '10' }, { ...PLAYER, forbidPlayerHpWrites: true }),
    ).toBe('strip_and_log');
  });

  it('test_silent_strip_list_produces_a_plain_strip', () => {
    expect(classifyTag('CREATE_NPC', {}, { silentStripTags: ['CREATE_NPC'] })).toBe('strip');
  });
});

describe('sanitizeCommandBlock', () => {
  it('test_world_content_survives_untouched', () => {
    const block = '[CREATE_NPC: Name="Lý Mỗ"] [TIME_PASSED: hours="2"]';
    const r = sanitizeCommandBlock(block, PLAYER);
    expect(r.stripped).toEqual([]);
    expect(r.keptTags.map((t) => t.name)).toEqual(['CREATE_NPC', 'TIME_PASSED']);
    expect(r.kept).toContain('CREATE_NPC');
  });

  it('test_forbidden_tag_is_removed_from_the_kept_block', () => {
    const block = '[CREATE_NPC: Name="Lý Mỗ"] [HEAL_PARTICIPANTS: amount="50"]';
    const r = sanitizeCommandBlock(block, PLAYER);
    expect(r.kept).not.toContain('HEAL_PARTICIPANTS');
    expect(r.kept).toContain('CREATE_NPC');
    expect(r.stripped).toHaveLength(1);
    expect(r.stripped[0]).toMatchObject({ tag: 'HEAL_PARTICIPANTS', verdict: 'strip_and_log' });
  });

  it('test_relationship_changed_is_redacted_not_deleted', () => {
    const block = '[RELATIONSHIP_CHANGED: NPC="Lý Mỗ", Standing="Cảnh giác", AffinityChange="-12"]';
    const r = sanitizeCommandBlock(block, PLAYER);
    expect(r.kept).toContain('RELATIONSHIP_CHANGED');
    expect(r.kept).toContain('Cảnh giác');
    expect(r.kept).not.toContain('AffinityChange');
    expect(r.stripped[0].redacted_attrs).toContain('AffinityChange');
  });

  it('test_character_update_keeps_its_cosmetic_attributes', () => {
    const block = '[CHARACTER_UPDATE: target="p1", exp="900", Appearance="áo rách"]';
    const r = sanitizeCommandBlock(block, PLAYER);
    expect(r.kept).toContain('Appearance');
    expect(r.kept).not.toContain('exp=');
    expect(r.stripped[0].redacted_attrs).toEqual(['exp']);
  });

  it('test_dev_mode_throws_on_a_mechanical_result_tag', () => {
    const block = '[ENCOUNTER_REWARD: ep_score="900"]';
    expect(() => sanitizeCommandBlock(block, { ...PLAYER, mode: 'dev' })).toThrow(ContractViolationError);
  });

  it('test_prod_mode_only_logs', () => {
    const block = '[ENCOUNTER_REWARD: ep_score="900"]';
    const r = sanitizeCommandBlock(block, { ...PLAYER, mode: 'prod' });
    expect(r.stripped).toHaveLength(1);
    expect(r.kept).not.toContain('ENCOUNTER_REWARD');
  });

  it('test_dev_mode_can_opt_out_of_throwing', () => {
    const block = '[HEAL_PARTICIPANTS]';
    const r = sanitizeCommandBlock(block, { mode: 'dev', throwOnViolation: false });
    expect(r.stripped).toHaveLength(1);
  });

  it('test_empty_block_is_a_no_op', () => {
    const r = sanitizeCommandBlock('', PLAYER);
    expect(r).toMatchObject({ kept: '', stripped: [] });
  });
});
