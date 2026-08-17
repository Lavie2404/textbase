/**
 * Adapter: App.tsx `storyHistory` -> World Memory `TurnRecord[]`.
 *
 * Lets an existing save (written long before World Memory existed) be imported
 * into the fact store so a returning player keeps a populated journal. This is a
 * BEST-EFFORT import, explicitly documented as such:
 *
 * - `narration_text` is stored OPAQUELY. Nothing here parses, matches or
 *   number-extracts from it (gdd-01 B.2 R3 / gdd-04 A2 #3). Old saves therefore
 *   import with an EMPTY `locked_result`, which yields 0 facts per turn - that
 *   is correct behaviour, not a bug: the mechanical history of a pre-P3 save
 *   simply does not exist in structured form and must not be invented.
 * - `world_time` is reconstructed as the 1-based index of the story beat, which
 *   is the only ordering App.tsx preserves (`storyHistory` is an ordered array).
 *
 * Design docs: production/gdd-integration/app-map.md (§State `storyHistory:19553`,
 * §(f) memory), gdd-04 A3/A4 (batch extraction on load), plan.md P3.
 *
 * Pure module: no I/O, no RNG; the clock is injected.
 */
import type { Clock, TurnRecord } from '../types';
import { emptyLockedResult } from '../types';
import { WorldMemory, type WorldMemoryOptions } from './worldMemory';

/** One entry of App.tsx `storyHistory` (app-map.md §State). */
export interface AppStoryEntry {
  id?: string | number;
  type: 'story' | 'user' | 'user_custom' | 'system' | string;
  content?: string;
  transient?: boolean;
  summarized?: boolean;
}

export interface FromAppHistoryOptions extends WorldMemoryOptions {
  slot_id: string;
  /** `PERSISTENCE_KNOBS.schema_version` of the importing build. */
  schema_version: number;
  /** Injected clock; every imported record shares one `created_at`. */
  clock?: Clock;
  /** First `world_time`/`turn_id` to assign. Defaults to 1. */
  startWorldTime?: number;
  /** Drop `transient` entries (App.tsx renders them but never persists them). */
  dropTransient?: boolean;
}

/**
 * Groups `storyHistory` into turn records.
 *
 * Grouping rule: a `'story'` entry closes a turn. Any `'user'` / `'user_custom'`
 * entries seen since the previous close become that turn's `action_text`; any
 * `'system'` entries are appended to the narration verbatim (they are prose the
 * player read). Trailing user input with no narration yet does NOT produce a
 * record - that turn was never confirmed.
 */
export function turnRecordsFromAppHistory(
  storyHistory: readonly AppStoryEntry[],
  opts: FromAppHistoryOptions,
): TurnRecord[] {
  const clock: Clock = opts.clock ?? (() => 0);
  const createdAt = clock();
  const start = opts.startWorldTime ?? 1;
  const records: TurnRecord[] = [];
  let pendingAction: string[] = [];
  let pendingSystem: string[] = [];

  for (const entry of storyHistory ?? []) {
    if (!entry) continue;
    if (opts.dropTransient !== false && entry.transient === true) continue;
    const content = typeof entry.content === 'string' ? entry.content : '';
    if (entry.type === 'user' || entry.type === 'user_custom') {
      pendingAction.push(content);
      continue;
    }
    if (entry.type === 'system') {
      pendingSystem.push(content);
      continue;
    }
    if (entry.type !== 'story') continue;
    const worldTime = start + records.length;
    const narration = [...pendingSystem, content].filter((s) => s !== '').join('\n\n');
    records.push({
      slot_id: opts.slot_id,
      world_time: worldTime,
      hack_seq: 0,
      turn_id: worldTime,
      action_text: pendingAction.join('\n'),
      locked_result: emptyLockedResult(worldTime, worldTime),
      narration_text: narration,
      suggestions: [],
      schema_version: opts.schema_version,
      created_at: createdAt,
    });
    pendingAction = [];
    pendingSystem = [];
  }
  return records;
}

/**
 * Full import path: `storyHistory` -> turn records -> a populated `WorldMemory`
 * with one batch extraction pass (gdd-04 A4, AC-20).
 */
export function worldMemoryFromAppHistory(
  storyHistory: readonly AppStoryEntry[],
  opts: FromAppHistoryOptions,
): WorldMemory {
  return WorldMemory.fromTurnRecords(turnRecordsFromAppHistory(storyHistory, opts), opts);
}
