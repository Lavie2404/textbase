/**
 * Fixture factories for the World Memory suite.
 *
 * Per coding-standards.md "no hardcoded data": tests build records through these
 * factories, not through inline literals (boundary-value tests excepted, where
 * the exact number IS the point).
 */
import { emptyLockedResult, type LockedFieldValue, type LockedResult, type TurnRecord } from '../../../src-web/systems/types';

export const SLOT_ID = 'slot_test';
export const SCHEMA_VERSION = 2;

export function makeLockedResult(
  turnId: number,
  fields: Record<string, LockedFieldValue> = {},
  overrides: Partial<LockedResult> = {},
): LockedResult {
  return { ...emptyLockedResult(turnId, turnId), ...overrides, fields };
}

export function makeTurn(
  turnId: number,
  opts: {
    fields?: Record<string, LockedFieldValue>;
    narration?: string;
    action?: string;
    worldTime?: number;
    hackSeq?: number;
    locked?: LockedResult;
  } = {},
): TurnRecord {
  const worldTime = opts.worldTime ?? turnId;
  return {
    slot_id: SLOT_ID,
    world_time: worldTime,
    hack_seq: opts.hackSeq ?? 0,
    turn_id: turnId,
    action_text: opts.action ?? `action ${turnId}`,
    locked_result:
      opts.locked ?? makeLockedResult(turnId, opts.fields ?? {}, { world_time: worldTime }),
    narration_text: opts.narration ?? `narration ${turnId}`,
    suggestions: [],
    schema_version: SCHEMA_VERSION,
    created_at: 0,
  };
}

/** Appends `count` plain turns starting at `from`. */
export function makeTurns(count: number, from = 1): TurnRecord[] {
  return Array.from({ length: count }, (_, i) => makeTurn(from + i));
}
