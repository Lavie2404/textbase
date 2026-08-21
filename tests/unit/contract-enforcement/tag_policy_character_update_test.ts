/**
 * Contract Enforcement - the REAL shipped tag shapes. Regression suite for the
 * P4b code review:
 *
 *  B1 `[CHARACTER_UPDATE: Name="X", Stats="hp:-9999, exp:+50, ..."]` - the
 *     mechanical keys live INSIDE the `Stats` string, not as tag attributes
 *  B2 offset-based rebuild (duplicate tags, `$` in values)
 *  B3 `[REALM_LIST: [...]]` - one level of nested brackets
 *  B4 dev mode throws but still hands the caller the sanitised block
 *
 * Design docs: plan.md C-1; gdd-01 B.2 R3; app-map.md section 3.
 */

import { describe, expect, it } from 'vitest';
import {
  ContractViolationError,
  buildStatsString,
  classifyTag,
  parseStatsString,
  parseTags,
  sanitizeCommandBlock,
  type SanitizeResult,
} from '../../../src-web/systems/contract/tagPolicy';

const PLAYER = { playerIds: ['p1', 'Diệp Thần'] };

/** The verbatim shape App emits (app-map.md section 3). */
const PLAYER_UPDATE =
  '[CHARACTER_UPDATE: Name="Diệp Thần", Stats="hp:-9999, exp:+50, level:5, currency:-10"]';
const NPC_UPDATE = '[CHARACTER_UPDATE: Name="Lý Mỗ", Stats="hp:-30, exp:+10, level:3"]';

describe('B1 - Stats sub-entry parsing', () => {
  it('test_stats_string_splits_on_commas_and_semicolons', () => {
    const entries = parseStatsString('hp:-9999, exp:+50; level:5 , currency:-10');
    expect(entries.map((e) => e.key)).toEqual(['hp', 'exp', 'level', 'currency']);
    expect(entries[0].raw).toBe('hp:-9999');
  });

  it('test_stats_round_trip_preserves_the_written_entries', () => {
    const entries = parseStatsString('hp:-9999, currency:-10');
    expect(buildStatsString(entries)).toBe('hp:-9999, currency:-10');
  });

  it('test_an_empty_or_keyless_stats_string_is_not_a_crash', () => {
    expect(parseStatsString('')).toEqual([]);
    expect(parseStatsString('   ,  ; ')).toEqual([]);
    expect(parseStatsString('mystery')).toEqual([{ key: 'mystery', raw: 'mystery' }]);
  });
});

describe('B1 - CHARACTER_UPDATE classification on the real shape', () => {
  it('test_forbidden_sub_entries_on_the_player_are_a_violation', () => {
    const tag = parseTags(PLAYER_UPDATE)[0];
    expect(classifyTag(tag.name, tag.attrs, PLAYER, tag.positional)).toBe('strip_and_log');
  });

  it('test_the_same_sub_entries_on_an_npc_are_untouched', () => {
    const tag = parseTags(NPC_UPDATE)[0];
    expect(classifyTag(tag.name, tag.attrs, PLAYER, tag.positional)).toBe('allow');
  });

  it('test_a_player_update_with_only_cosmetic_stats_is_allowed', () => {
    const tag = parseTags('[CHARACTER_UPDATE: Name="Diệp Thần", Stats="currency:-10, hp:-40"]')[0];
    expect(classifyTag(tag.name, tag.attrs, PLAYER, tag.positional)).toBe('allow');
  });

  it('test_player_hp_sub_entries_are_barred_only_on_opt_in', () => {
    const tag = parseTags('[CHARACTER_UPDATE: Name="Diệp Thần", Stats="hp:-40"]')[0];
    expect(classifyTag(tag.name, tag.attrs, PLAYER, tag.positional)).toBe('allow');
    expect(
      classifyTag(tag.name, tag.attrs, { ...PLAYER, forbidPlayerHpWrites: true }, tag.positional),
    ).toBe('strip_and_log');
  });

  it('test_sub_entry_keys_match_case_insensitively', () => {
    const tag = parseTags('[CHARACTER_UPDATE: Name="Diệp Thần", Stats="EXP:+50"]')[0];
    expect(classifyTag(tag.name, tag.attrs, PLAYER, tag.positional)).toBe('strip_and_log');
  });
});

describe('B1 - CHARACTER_UPDATE redaction rebuilds the Stats string', () => {
  it('test_only_the_forbidden_sub_entries_are_removed', () => {
    const r = sanitizeCommandBlock(PLAYER_UPDATE, PLAYER);
    expect(r.kept).toContain('Name="Diệp Thần"');
    expect(r.kept).toContain('hp:-9999');
    expect(r.kept).toContain('currency:-10');
    expect(r.kept).not.toContain('exp:+50');
    expect(r.kept).not.toContain('level:5');
    expect(r.stripped[0].redacted_attrs).toEqual(['Stats.exp', 'Stats.level']);
  });

  it('test_the_rebuilt_tag_is_reparseable_with_the_same_shape', () => {
    const r = sanitizeCommandBlock(PLAYER_UPDATE, PLAYER);
    const reparsed = parseTags(r.kept)[0];
    expect(reparsed.name).toBe('CHARACTER_UPDATE');
    expect(parseStatsString(reparsed.attrs.Stats).map((e) => e.key)).toEqual(['hp', 'currency']);
  });

  it('test_a_fully_forbidden_stats_string_drops_the_attribute_not_the_tag', () => {
    const r = sanitizeCommandBlock('[CHARACTER_UPDATE: Name="Diệp Thần", Stats="exp:+50, level:5"]', PLAYER);
    expect(r.kept).toContain('CHARACTER_UPDATE');
    expect(r.kept).toContain('Name="Diệp Thần"');
    expect(r.kept).not.toContain('Stats=');
  });

  it('test_npc_stats_survive_sanitising_byte_identically', () => {
    const r = sanitizeCommandBlock(NPC_UPDATE, PLAYER);
    expect(r.kept).toBe(NPC_UPDATE);
    expect(r.stripped).toEqual([]);
  });

  it('test_a_mixed_block_redacts_the_player_and_leaves_the_npc_alone', () => {
    const r = sanitizeCommandBlock(`${PLAYER_UPDATE} ${NPC_UPDATE}`, PLAYER);
    expect(r.kept).toContain(NPC_UPDATE);
    expect(r.kept).not.toContain('exp:+50');
    expect(r.keptTags).toHaveLength(2);
  });
});

describe('B2 - offset-based rebuild', () => {
  it('test_two_identical_forbidden_tags_are_both_removed', () => {
    const block = '[HEAL_PARTICIPANTS: amount="50"] [CREATE_NPC: Name="Lý Mỗ"] [HEAL_PARTICIPANTS: amount="50"]';
    const r = sanitizeCommandBlock(block, PLAYER);
    expect(r.kept).not.toContain('HEAL_PARTICIPANTS');
    expect(r.stripped).toHaveLength(2);
  });

  it('test_two_identical_redactable_tags_are_both_redacted', () => {
    const r = sanitizeCommandBlock(`${PLAYER_UPDATE} ${PLAYER_UPDATE}`, PLAYER);
    expect(r.kept).not.toContain('exp:+50');
    expect(r.stripped).toHaveLength(2);
    expect(r.keptTags).toHaveLength(2);
  });

  it('test_a_dollar_sign_in_a_value_is_never_interpreted_as_a_replacement_pattern', () => {
    const block = '[CHARACTER_UPDATE: Name="Diệp Thần", Note="giá $&$1$`", Stats="exp:+50, hp:-5"]';
    const r = sanitizeCommandBlock(block, PLAYER);
    expect(r.kept).toContain('giá $&$1$`');
    expect(r.kept).not.toContain('exp:+50');
    expect(r.kept).toContain('hp:-5');
  });

  it('test_text_between_tags_is_preserved_in_order', () => {
    const block = 'trước [HEAL_PARTICIPANTS] giữa [CREATE_NPC: Name="Lý Mỗ"] sau';
    const r = sanitizeCommandBlock(block, PLAYER);
    expect(r.kept.startsWith('trước')).toBe(true);
    expect(r.kept.endsWith('sau')).toBe(true);
    expect(r.kept).toContain('giữa');
  });
});

describe('B3 - nested brackets in a tag body', () => {
  it('test_realm_list_survives_whole_and_is_reported_as_kept', () => {
    const block = '[REALM_LIST: [Luyện Khí, Trúc Cơ, Kim Đan]]';
    const tags = parseTags(block);
    expect(tags).toHaveLength(1);
    expect(tags[0].raw).toBe(block);
    expect(classifyTag('REALM_LIST', tags[0].attrs, PLAYER, tags[0].positional)).toBe('allow');
    const r = sanitizeCommandBlock(block, PLAYER);
    expect(r.keptTags.map((t) => t.name)).toEqual(['REALM_LIST']);
    expect(r.kept).toBe(block);
    expect(r.stripped).toEqual([]);
  });

  it('test_a_nested_tag_does_not_swallow_the_following_tag', () => {
    const block = '[REALM_LIST: [Luyện Khí, Trúc Cơ]] [CREATE_NPC: Name="Lý Mỗ"]';
    expect(parseTags(block).map((t) => t.name)).toEqual(['REALM_LIST', 'CREATE_NPC']);
  });

  it('test_match_offsets_line_up_with_the_source_text', () => {
    const block = 'x [CREATE_NPC: Name="Lý Mỗ"] y';
    const tag = parseTags(block)[0];
    expect(block.slice(tag.start, tag.end)).toBe(tag.raw);
  });
});

describe('B4 - dev mode fails CLOSED with the sanitised block attached', () => {
  it('test_the_thrown_error_carries_the_sanitised_result', () => {
    const block = '[CREATE_NPC: Name="Lý Mỗ"] [HEAL_PARTICIPANTS: amount="50"]';
    let caught: ContractViolationError | null = null;
    try {
      sanitizeCommandBlock(block, { ...PLAYER, mode: 'dev' });
    } catch (err) {
      caught = err as ContractViolationError;
    }
    expect(caught).toBeInstanceOf(ContractViolationError);
    const result = caught?.result as SanitizeResult;
    expect(result.kept).toContain('CREATE_NPC');
    expect(result.kept).not.toContain('HEAL_PARTICIPANTS');
    expect(result.stripped).toHaveLength(1);
  });

  it('test_the_attached_result_matches_what_prod_mode_would_have_returned', () => {
    const block = `${PLAYER_UPDATE} [CREATE_NPC: Name="Lý Mỗ"]`;
    const prod = sanitizeCommandBlock(block, { ...PLAYER, mode: 'prod' });
    let devResult: SanitizeResult | undefined;
    try {
      sanitizeCommandBlock(block, { ...PLAYER, mode: 'dev' });
    } catch (err) {
      devResult = (err as ContractViolationError).result;
    }
    expect(devResult?.kept).toBe(prod.kept);
    expect(devResult?.stripped).toEqual(prod.stripped);
  });
});
