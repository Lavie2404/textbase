/**
 * Persistence - the save bundle (gdd-05 B2 R2, B3).
 *
 * The bundle is many INDEPENDENT blobs owned by their source systems.
 * Persistence collects one blob per registered system, guarantees consistency
 * across them, and NEVER validates or interprets blob content (R2). The field
 * names below mirror the shipped `buildGithubSaveDataObject` in App.tsx
 * (:20593) so that P3b wiring is a rename-free hand-off.
 *
 * Design docs: production/gdd-integration/gdd-05-encounter-persistence.md B2
 * (R2/R7/R8), B3, B4 (Formula #2), B8 (AC-02, AC-07, AC-12..AC-14, AC-24, AC-36);
 * production/gdd-integration/app-map.md §(e) save/load + §2 state shapes;
 * gdd-04 A2 #8 (World Memory must be serialized INSIDE the bundle).
 *
 * Pure module: no I/O, no clock, no RNG.
 */
import type { TurnRecord } from '../types';
import type { WorldMemoryJson } from '../worldMemory/worldMemory';

/** Stable id of a registered system; also the blob key inside the bundle. */
export type SystemId = string;

export type BlobStatus = 'OK' | 'MISSING' | 'ERROR';

/** One system blob. `bytes` is opaque to Persistence (gdd-05 B3). */
export interface Blob {
  status: BlobStatus;
  bytes: string;
}

/** A blob plus the id of the system that produced it. */
export interface RegisteredBlob extends Blob {
  system_id: SystemId;
}

/**
 * The bundle Persistence stores for one slot.
 *
 * `knowledge`, `storyHistory`, `storySummaries`, `gameSettings` and
 * `currentTurn` are the App.tsx state shapes verbatim (app-map.md §2); the
 * remaining App fields are carried through so a round trip is lossless against
 * the existing GitHub save object.
 */
export interface SaveBundle {
  knowledge: unknown;
  storyHistory: unknown[];
  storySummaries: unknown[];
  gameSettings: unknown;
  currentTurn: number;
  /** `WorldMemory.toJSON()` - both tiers (gdd-04 Core Rule #8). */
  worldMemory: WorldMemoryJson | null;
  /** Optional append-only records. See `saveCheckpoint` for the P3a simplification. */
  turnRecords?: TurnRecord[];
  meta: BundleMeta;
  // --- carried through from App.tsx `buildGithubSaveDataObject` --------------
  choices?: unknown;
  gameMode?: string;
  activeTrade?: unknown;
  adventureTurnCount?: number;
  gameId?: string;
  /**
   * `TurnManager.toPersistable()` (code review C-9). Rides inside the existing
   * `turnManager` blob under `turn_manager` so no new registered system id is
   * introduced; absent in bundles written before P6c, hence optional.
   */
  turnManager?: unknown;
}

/** Persistence-owned, NOT opaque (gdd-05 B3 note on `SlotRecord`). */
export interface BundleMeta {
  slot_id: string;
  schema_version: number;
  world_time: number;
  saved_at: number;
  /** Checksum of the blob set - see `checksumOfBlobs`. Beyond the GDD (B9 #6). */
  checksum: string;
  /** Write-once-true (gdd-06 C5): a hack write happened in this slot. */
  hack_mode_used_this_slot: boolean;
}

/** The registered systems of P3a. `N = SYSTEM_IDS.length`. */
export const SYSTEM_IDS: readonly SystemId[] = [
  'knowledge',
  'storyHistory',
  'storySummaries',
  'gameSettings',
  'turnManager',
  'worldMemory',
];

/**
 * Serializes one bundle into the registered blob set.
 *
 * A system with nothing to store returns a valid EMPTY blob with `status: 'OK'`,
 * never `MISSING` (gdd-05 B4 Formula #2). A value that cannot be serialized
 * (a cycle, a BigInt) becomes `status: 'ERROR'`, which blocks the commit rather
 * than writing a half-bundle.
 */
export function toBlobs(bundle: SaveBundle): RegisteredBlob[] {
  const sources: Record<SystemId, unknown> = {
    knowledge: bundle.knowledge ?? null,
    storyHistory: bundle.storyHistory ?? [],
    storySummaries: bundle.storySummaries ?? [],
    gameSettings: bundle.gameSettings ?? null,
    turnManager: {
      currentTurn: bundle.currentTurn ?? 0,
      gameMode: bundle.gameMode ?? null,
      choices: bundle.choices ?? null,
      activeTrade: bundle.activeTrade ?? null,
      adventureTurnCount: bundle.adventureTurnCount ?? 0,
      turn_manager: bundle.turnManager ?? null,
    },
    worldMemory: bundle.worldMemory ?? null,
  };
  return SYSTEM_IDS.map((system_id) => {
    const value = sources[system_id];
    if (value === undefined) return { system_id, status: 'MISSING' as BlobStatus, bytes: '' };
    try {
      return { system_id, status: 'OK' as BlobStatus, bytes: JSON.stringify(value) };
    } catch (err) {
      return { system_id, status: 'ERROR' as BlobStatus, bytes: '' };
    }
  });
}

/** Rebuilds a bundle from its blob set. Throws only on a caller-supplied bad blob. */
export function fromBlobs(blobs: readonly RegisteredBlob[], meta: BundleMeta): SaveBundle {
  const byId = new Map(blobs.map((b) => [b.system_id, b]));
  const parse = (id: SystemId, fallback: unknown): unknown => {
    const blob = byId.get(id);
    if (!blob || blob.status !== 'OK' || blob.bytes === '') return fallback;
    return JSON.parse(blob.bytes);
  };
  const turn = parse('turnManager', {}) as Record<string, unknown>;
  return {
    knowledge: parse('knowledge', null),
    storyHistory: parse('storyHistory', []) as unknown[],
    storySummaries: parse('storySummaries', []) as unknown[],
    gameSettings: parse('gameSettings', null),
    currentTurn: (turn.currentTurn as number) ?? 0,
    gameMode: (turn.gameMode as string) ?? undefined,
    choices: turn.choices ?? undefined,
    activeTrade: turn.activeTrade ?? undefined,
    adventureTurnCount: (turn.adventureTurnCount as number) ?? undefined,
    turnManager: turn.turn_manager ?? undefined,
    worldMemory: parse('worldMemory', null) as SaveBundle['worldMemory'],
    meta,
  };
}

/**
 * FNV-1a 32-bit checksum, returned as 8 lowercase hex characters.
 *
 * BEYOND THE GDD: gdd-05 B3 records explicitly that "checksum is not specified
 * anywhere in GDD #6 or ADR-0002" and B9 #6 calls it a genuine gap for the
 * non-transactional GitHub/Firestore mirrors. P3a adds it because a mirror round
 * trip cannot rely on transaction atomicity. Adding the field is itself an R8
 * `schema_version` bump trigger, which is why `CURRENT_SCHEMA_VERSION` is 2.
 */
export function checksum(text: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    // 32-bit FNV prime multiply, kept in unsigned range.
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/** Checksum over the blob set, order-independent by `system_id`. */
export function checksumOfBlobs(blobs: readonly RegisteredBlob[]): string {
  const canonical = [...blobs]
    .sort((a, b) => (a.system_id < b.system_id ? -1 : a.system_id > b.system_id ? 1 : 0))
    .map((b) => `${b.system_id}:${b.status}:${b.bytes}`)
    .join('\u0000');
  return checksum(canonical);
}
