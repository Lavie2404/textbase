/**
 * gdd-03 PART 2, Branch B - the one-turn Pending Fate window.
 *
 * Design docs: production/gdd-integration/gdd-03-affinity-death-continuation.md
 * (2.2 CR#4, AC-09..AC-12, AC-34, AC-38b).
 *
 * RULES ENCODED HERE
 * - The window opens for EXACTLY one turn and never re-opens once confirmed.
 * - Free-form input is classified DETERMINISTICALLY, never by the AI.
 * - Ambiguous intent is downgraded to spare, never inferred as an execution
 *   (AC-12) - the destructive reading is never the default.
 * - Executing with zero surviving witnesses still emits kill_witnessed with an
 *   EMPTY witness set (AC-34); Affinity then writes zero fields.
 *
 * Player-facing strings are Vietnamese by project language policy.
 */

import type { CharId, Suggestion } from '../types';
import { normalizeVietnamese } from '../affinity/classifyFromTags';
import type { PendingFate } from './state';

export type FateIntent = 'execute' | 'spare';

export const FATE_EXECUTE_LABEL = 'Kết liễu';
export const FATE_SPARE_LABEL = 'Tha mạng';

/** Diacritic-free keywords that unambiguously mean "finish them". */
export const EXECUTE_KEYWORDS: readonly string[] = [
  'ket lieu',
  'giet',
  'ha sat',
  'doat mang',
  'tan sat',
  'khong tha',
  'lay mang',
  'xu tu',
];

/** Explicit mercy keywords; anything else also falls through to spare. */
export const SPARE_KEYWORDS: readonly string[] = ['tha mang', 'tha cho', 'buong tha', 'khoan hong'];

export function openPendingFate(
  npcId: CharId,
  turn: number,
  marginRatio: number,
  witnesses: CharId[],
): PendingFate {
  return {
    npc_id: npcId,
    opened_turn: turn,
    margin_ratio: Number.isFinite(marginRatio) ? marginRatio : 0,
    witnesses: (witnesses ?? []).filter((id) => id !== npcId),
  };
}

/** The window covers exactly the turn after it opened. */
export function isPendingFateOpen(fate: PendingFate | null | undefined, turn: number): boolean {
  if (!fate) return false;
  return turn <= fate.opened_turn + 1;
}

/**
 * Deterministic intent classification for the Pending Fate turn.
 * Execution requires an explicit keyword; everything else - including silence,
 * an unrelated action, or ambiguous prose - is mercy (AC-12).
 */
export function classifyFateIntent(text: string | null | undefined): FateIntent {
  const haystack = normalizeVietnamese(text ?? '');
  if (!haystack) return 'spare';
  for (const keyword of EXECUTE_KEYWORDS) {
    if (haystack.includes(keyword)) return 'execute';
  }
  return 'spare';
}

/**
 * The two forced suggestions the Turn Manager must place inside its
 * suggested_action_count = 4 budget (gdd-03 CR#4).
 */
export function pendingFateSuggestions(npcName: string): Suggestion[] {
  return [
    { text: FATE_EXECUTE_LABEL + ' ' + npcName, envelope: null, source: 'pending_fate' },
    { text: FATE_SPARE_LABEL + ' ' + npcName, envelope: null, source: 'pending_fate' },
  ];
}

/** The mandatory "last chance this turn" line, not just bold text (CR#4). */
export function pendingFateBannerText(npcName: string): string {
  return (
    '**' +
    npcName +
    '** đang nằm dưới chân ngươi. Đây là cơ hội cuối cùng trong lượt này: kết liễu hay tha mạng?'
  );
}
