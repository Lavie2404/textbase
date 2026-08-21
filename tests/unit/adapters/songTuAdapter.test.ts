/**
 * Unit tests for src-web/systems/adapters/songTuAdapter.ts.
 *
 * Fixtures mirror `knowledge.characters[]` from App.tsx (INITIAL_STATS :2116);
 * the adapter reads only `titles`, `isPlayer` and `isPermanentlyDead`.
 *
 * Design docs: gdd-03 1.7, gdd-02 D.4, plan.md decision C-6 (Song Tu out of scope).
 */
import { describe, expect, it } from 'vitest';
import {
  getSongTuActiveNpcIds,
  isSongTuActiveFor,
  type SongTuCharacterView,
  type SongTuKnowledgeView,
} from '../../../src-web/systems/adapters/songTuAdapter';
import { SONG_TU_TITLE } from '../../../src-web/systems/registry';

const PLAYER_ID = 'char_player';
const PARTNER_ID = 'char_partner';
const OTHER_ID = 'char_other';

function makeCharacter(overrides: Partial<SongTuCharacterView> = {}): SongTuCharacterView {
  return {
    id: OTHER_ID,
    isPlayer: false,
    isPermanentlyDead: false,
    titles: [],
    ...overrides,
  };
}

function makeKnowledge(characters: SongTuCharacterView[]): SongTuKnowledgeView {
  return { characters };
}

describe('SONG_TU_TITLE', () => {
  it('test_title_matches_the_literal_in_app_tsx', () => {
    // App.tsx :27107 - const SONG_TU_TITLE = "Dao Lu" (Vietnamese, with diacritics).
    expect(SONG_TU_TITLE).toBe('Đạo Lữ');
  });
});

describe('getSongTuActiveNpcIds', () => {
  it('test_npc_with_title_is_returned', () => {
    const knowledge = makeKnowledge([
      makeCharacter({ id: PARTNER_ID, titles: [SONG_TU_TITLE] }),
    ]);
    expect(getSongTuActiveNpcIds(knowledge)).toEqual([PARTNER_ID]);
  });

  it('test_npc_without_title_is_excluded', () => {
    const knowledge = makeKnowledge([makeCharacter({ titles: ['Kiếm Khách'] })]);
    expect(getSongTuActiveNpcIds(knowledge)).toEqual([]);
  });

  it('test_title_among_several_still_counts', () => {
    const knowledge = makeKnowledge([
      makeCharacter({ id: PARTNER_ID, titles: ['Kiếm Khách', SONG_TU_TITLE, 'Trưởng Lão'] }),
    ]);
    expect(getSongTuActiveNpcIds(knowledge)).toEqual([PARTNER_ID]);
  });

  it('test_player_is_never_listed', () => {
    const knowledge = makeKnowledge([
      makeCharacter({ id: PLAYER_ID, isPlayer: true, titles: [SONG_TU_TITLE] }),
      makeCharacter({ id: PARTNER_ID, titles: [SONG_TU_TITLE] }),
    ]);
    expect(getSongTuActiveNpcIds(knowledge)).toEqual([PARTNER_ID]);
  });

  it('test_permanently_dead_partner_is_excluded', () => {
    const knowledge = makeKnowledge([
      makeCharacter({ id: PARTNER_ID, titles: [SONG_TU_TITLE], isPermanentlyDead: true }),
    ]);
    expect(getSongTuActiveNpcIds(knowledge)).toEqual([]);
  });

  it('test_multiple_partners_preserve_source_order', () => {
    const knowledge = makeKnowledge([
      makeCharacter({ id: 'char_b', titles: [SONG_TU_TITLE] }),
      makeCharacter({ id: 'char_a', titles: [SONG_TU_TITLE] }),
    ]);
    expect(getSongTuActiveNpcIds(knowledge)).toEqual(['char_b', 'char_a']);
  });

  it('test_duplicate_ids_are_collapsed', () => {
    const knowledge = makeKnowledge([
      makeCharacter({ id: PARTNER_ID, titles: [SONG_TU_TITLE] }),
      makeCharacter({ id: PARTNER_ID, titles: [SONG_TU_TITLE] }),
    ]);
    expect(getSongTuActiveNpcIds(knowledge)).toEqual([PARTNER_ID]);
  });

  it('test_missing_or_malformed_titles_are_ignored', () => {
    const knowledge = makeKnowledge([
      makeCharacter({ id: 'char_no_titles', titles: undefined }),
      makeCharacter({ id: 'char_string_titles', titles: SONG_TU_TITLE }),
      { id: 'char_bare' },
    ]);
    expect(getSongTuActiveNpcIds(knowledge)).toEqual([]);
  });

  it('test_missing_knowledge_yields_empty_list', () => {
    expect(getSongTuActiveNpcIds(null)).toEqual([]);
    expect(getSongTuActiveNpcIds(undefined)).toEqual([]);
    expect(getSongTuActiveNpcIds({})).toEqual([]);
  });

  it('test_characters_without_id_are_skipped', () => {
    const knowledge = makeKnowledge([{ titles: [SONG_TU_TITLE] }]);
    expect(getSongTuActiveNpcIds(knowledge)).toEqual([]);
  });

  it('test_adapter_does_not_mutate_knowledge', () => {
    const knowledge = makeKnowledge([
      makeCharacter({ id: PARTNER_ID, titles: [SONG_TU_TITLE] }),
    ]);
    const before = JSON.stringify(knowledge);
    getSongTuActiveNpcIds(knowledge);
    expect(JSON.stringify(knowledge)).toBe(before);
  });
});

describe('isSongTuActiveFor (gdd-02 D.4, self-relative)', () => {
  it('test_player_is_active_when_the_set_is_non_empty', () => {
    expect(isSongTuActiveFor(PLAYER_ID, true, [PARTNER_ID])).toBe(true);
  });

  it('test_player_is_inactive_when_the_set_is_empty', () => {
    expect(isSongTuActiveFor(PLAYER_ID, true, [])).toBe(false);
  });

  it('test_npc_is_active_only_when_listed', () => {
    expect(isSongTuActiveFor(PARTNER_ID, false, [PARTNER_ID])).toBe(true);
    expect(isSongTuActiveFor(OTHER_ID, false, [PARTNER_ID])).toBe(false);
  });

  it('test_result_does_not_scale_with_list_length', () => {
    const one = isSongTuActiveFor(PLAYER_ID, true, [PARTNER_ID]);
    const many = isSongTuActiveFor(PLAYER_ID, true, [PARTNER_ID, OTHER_ID, 'char_third']);
    expect(many).toBe(one);
  });
});
