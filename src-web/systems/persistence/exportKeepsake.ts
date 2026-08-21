/**
 * Persistence - export 9b, "Chép lại quyển sổ" (gdd-05 R9 / AC-09b).
 *
 * A Vietnamese, human-readable keepsake produced by concatenating
 * `narration_text` in `world_time` order. It exposes NO technical field names,
 * NO mechanical blobs and NO mechanical numbers, it must never be called a
 * "backup", and it has NO import path.
 *
 * Reads the latest committed state and never modifies the save.
 *
 * Pure module: no I/O.
 */
import type { TurnRecord } from '../types';

export interface KeepsakeOptions {
  /**
   * Optional title line - the story title or character name. Player-facing text
   * only; passing a turn count or any other number would violate AC-09b.
   */
  title?: string;
  /** Separator between turns. Default: one blank line. */
  separator?: string;
}

/** Builds the keepsake text. Empty history yields an empty string, never throws. */
export function exportKeepsake(
  records: readonly TurnRecord[],
  opts: KeepsakeOptions = {},
): string {
  const ordered = [...(records ?? [])].sort((a, b) =>
    a.world_time !== b.world_time ? a.world_time - b.world_time : a.hack_seq - b.hack_seq,
  );
  const body = ordered
    .map((record) => (record.narration_text ?? '').trim())
    .filter((text) => text !== '')
    .join(opts.separator ?? '\n\n');
  const title = (opts.title ?? '').trim();
  if (title === '') return body;
  return body === '' ? title : `${title}\n\n${body}`;
}
