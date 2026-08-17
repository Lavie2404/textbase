/**
 * Read-only adapter over the out-of-scope Song Tu mechanic.
 *
 * Design docs: production/gdd-integration/plan.md (scope + decision C-6),
 * gdd-03 1.7 (`song_tu_relationship_active_npc_ids` emitted by NPC Affinity),
 * gdd-02 D.4 (EXP reads the same list, self-relative).
 *
 * SOURCE SHAPE IN App.tsx
 * - `SONG_TU_TITLE = "Dao Lu"` (:27107); `handleSongTu` (:27186-27320) pushes it
 *   into `npc.titles` the first time the relationship is established (:27291).
 * - Characters live in `knowledge.characters[]`; each has `id`, `isPlayer`,
 *   `titles: string[]` and `isPermanentlyDead` (INITIAL_STATS :2116).
 *
 * The title is the ONLY signal read here. The affinity gate (>= 80 in App.tsx vs
 * 60 in the GDD) is deliberately not re-implemented: plan.md C-6 keeps the shipped
 * threshold and declares Song Tu out of scope, so duplicating it would create a
 * second source of truth that could silently drift.
 *
 * Consumers must derive their own boolean from "list is non-empty" and must never
 * scale a bonus by the list length (gdd-03 1.7, gdd-02 D.4).
 */

import type { CharId } from '../types';
import { SONG_TU_TITLE } from '../registry';

/** Minimal read-only view of an App.tsx character record. */
export interface SongTuCharacterView {
  id?: CharId;
  isPlayer?: boolean;
  isPermanentlyDead?: boolean;
  titles?: unknown;
  [k: string]: unknown;
}

export interface SongTuKnowledgeView {
  characters?: SongTuCharacterView[];
  [k: string]: unknown;
}

function hasSongTuTitle(character: SongTuCharacterView): boolean {
  const titles = character.titles;
  return Array.isArray(titles) && titles.includes(SONG_TU_TITLE);
}

/**
 * Ids of NPCs currently in a Song Tu relationship with the player.
 *
 * Excluded: the player character itself (Song Tu is always player <-> NPC) and
 * permanently dead NPCs (gdd-03 1.6: the relationship state is terminal once the
 * partner dies).
 *
 * Order follows `knowledge.characters` so the result is deterministic for tests
 * and for snapshot comparison. Duplicated ids are collapsed.
 */
export function getSongTuActiveNpcIds(
  knowledge: SongTuKnowledgeView | null | undefined,
): CharId[] {
  const characters = knowledge?.characters;
  if (!Array.isArray(characters)) return [];

  const seen = new Set<CharId>();
  const ids: CharId[] = [];
  for (const character of characters) {
    if (!character || character.id == null) continue;
    if (character.isPlayer === true) continue;
    if (character.isPermanentlyDead === true) continue;
    if (!hasSongTuTitle(character)) continue;
    if (seen.has(character.id)) continue;
    seen.add(character.id);
    ids.push(character.id);
  }
  return ids;
}

/**
 * `SONG_TU_ACTIVE(self)` from gdd-02 D.4, self-relative:
 * - for the player: true when the active set is non-empty;
 * - for an NPC: true when that NPC is in the set.
 */
export function isSongTuActiveFor(
  charId: CharId,
  isPlayerCharacter: boolean,
  activeNpcIds: readonly CharId[],
): boolean {
  return isPlayerCharacter ? activeNpcIds.length > 0 : activeNpcIds.includes(charId);
}
