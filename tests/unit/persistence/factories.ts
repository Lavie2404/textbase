/**
 * Fixture factories for the Persistence suite (gdd-05 Part B).
 */
import { PERSISTENCE_KNOBS } from '../../../src-web/systems/registry';
import { emptyLockedResult, type TurnRecord } from '../../../src-web/systems/types';
import type { SaveBundle } from '../../../src-web/systems/persistence/bundle';
import { createSlotRecord, type SlotRecord } from '../../../src-web/systems/persistence/slotRecord';

export const SLOT_ID = 'slot_1';
export const NOW = 1_700_000_000_000;
export const fixedClock = () => NOW;

export function makeSlot(overrides: Partial<SlotRecord> = {}): SlotRecord {
  return {
    ...createSlotRecord({ slot_id: SLOT_ID, character_name: 'Diệp Thần', now: NOW }),
    ...overrides,
  };
}

export function makeTurnRecord(worldTime: number, hackSeq = 0): TurnRecord {
  return {
    slot_id: SLOT_ID,
    world_time: worldTime,
    hack_seq: hackSeq,
    turn_id: worldTime,
    action_text: `hành động ${worldTime}`,
    locked_result: emptyLockedResult(worldTime, worldTime),
    narration_text: `Lời kể lượt ${worldTime}.`,
    suggestions: [],
    schema_version: PERSISTENCE_KNOBS.schema_version,
    created_at: NOW,
  };
}

/** Mirrors the App.tsx state shapes (app-map.md §2 / `buildGithubSaveDataObject`). */
export function makeBundle(overrides: Partial<SaveBundle> = {}): SaveBundle {
  return {
    knowledge: { characters: [{ id: 'char_player', Name: 'Diệp Thần', affinity: 0 }], time: { year: 1, month: 1, day: 1, hour: 8 } },
    storyHistory: [{ id: 1, type: 'story', content: 'Mở đầu.' }],
    storySummaries: [],
    gameSettings: { storyTitle: 'Thử nghiệm', playStyle: 'RPG' },
    currentTurn: 1,
    worldMemory: null,
    gameMode: 'EXPLORATION',
    adventureTurnCount: 0,
    meta: {
      slot_id: SLOT_ID,
      schema_version: PERSISTENCE_KNOBS.schema_version,
      world_time: 1,
      saved_at: NOW,
      checksum: '',
      hack_mode_used_this_slot: false,
    },
    ...overrides,
  };
}
