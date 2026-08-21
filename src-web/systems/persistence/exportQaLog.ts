/**
 * Persistence - export 9a, the QA log (gdd-05 R9 / AC-09).
 *
 * Every turn of a playthrough as an object with EXACTLY 5 keys - `turn_id`,
 * `action`, `locked_result`, `narration_text`, `world_time` - ordered by
 * ascending `world_time`. No extra key at object level or top level. Technical
 * artefact: it may live behind a QA/debug surface only.
 *
 * Reads the latest committed state and never modifies the save (AC-22).
 *
 * Pure module: no I/O.
 */
import type { TurnRecord } from '../types';

/** The five keys, in order. Frozen so a drift is a compile error, not a diff. */
export const QA_LOG_KEYS = ['turn_id', 'action', 'locked_result', 'narration_text', 'world_time'] as const;

export interface QaLogEntry {
  turn_id: number;
  action: unknown;
  locked_result: unknown;
  narration_text: string;
  world_time: number;
}

/** Builds the QA log. Input is never mutated. */
export function exportQaLog(records: readonly TurnRecord[]): QaLogEntry[] {
  return [...(records ?? [])]
    .sort((a, b) => (a.world_time !== b.world_time ? a.world_time - b.world_time : a.hack_seq - b.hack_seq))
    .map((record) => ({
      turn_id: record.turn_id,
      action: record.action_text,
      locked_result: record.locked_result,
      narration_text: record.narration_text,
      world_time: record.world_time,
    }));
}

/** Serialized form. The top level is the bare array - no wrapper object (AC-09). */
export function exportQaLogJson(records: readonly TurnRecord[]): string {
  return JSON.stringify(exportQaLog(records));
}
