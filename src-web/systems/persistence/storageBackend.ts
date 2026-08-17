/**
 * Persistence - the storage seam (gdd-05 Part B, R3 + Part C).
 *
 * Two-phase protocol owned by this GDD regardless of backend: `stage(key, blob)`
 * then `commit()` / `abort()`. `commit()` resolves with `durability_confirmed`,
 * which is TRUE only when the backend's full durability chain completed - for
 * IndexedDB that is the transaction's `oncomplete` event, never the moment a
 * `put()` call returned (gdd-05 B2 R3, Part C mapping table).
 *
 * Design docs: production/gdd-integration/gdd-05-encounter-persistence.md B2
 * (R3/R4/R5), B3, B4 (save path), B8 (AC-01, AC-03, AC-17, AC-18, AC-22, AC-33),
 * Part C (Godot -> web translation); plan.md decision C-2 (IndexedDB is the
 * source of truth; GitHub is demoted to a best-effort backup mirror).
 *
 * No React, no fetch. The IndexedDB implementation is the only impure part and
 * it is injected into every consumer.
 */

/** Physical stores of the P3 database. Chosen by key prefix, see `storeForKey`. */
export type StoreName = 'slots' | 'checkpoints' | 'turn_records' | 'meta';

export const STORE_NAMES: readonly StoreName[] = ['slots', 'checkpoints', 'turn_records', 'meta'];

/**
 * Database name for save data.
 *
 * MUST NOT be `aiSimulatorDB`: that database belongs to the shipped App.tsx
 * (store `npcAvatars`, keys `autosave_<gameId>` / `manual_local_<gameId>` -
 * app-map.md :13306-13502). P3 opens its own database so a migration bug here
 * can never corrupt the avatars or the legacy autosave of a live player.
 */
export const SAVE_DB_NAME = 'vdl_saves';
export const SAVE_DB_VERSION = 1;

/** The database P3 must never open. Exported so tests can assert isolation. */
export const APP_LEGACY_DB_NAME = 'aiSimulatorDB';

/** Error taxonomy (gdd-05 B3). The first five are player-visible. */
export type ErrorCode =
  | 'WRITE_FAILED_QUOTA'
  | 'WRITE_FAILED_UNSUPPORTED'
  | 'LOAD_REJECTED_VERSION_MISMATCH'
  | 'MULTI_TAB_CONFLICT'
  | 'LOAD_FAILED_UNREADABLE'
  | 'BLOB_MISSING'
  | 'BLOB_ERROR'
  | 'CONFIG_ERROR_NO_SYSTEMS_REGISTERED'
  | 'WRITE_FAILED_INTERNAL';

/** Coarse class of a failure, for callers that do not want to switch on 9 codes. */
export type ErrorClass = 'quota' | 'unsupported' | 'internal' | 'schema' | 'conflict' | 'unreadable' | 'config';

export interface PersistenceError {
  code: ErrorCode;
  class: ErrorClass;
  /** Vietnamese-facing text is built by the UI layer; this is a technical message. */
  message: string;
  /** Set for BLOB_MISSING / BLOB_ERROR (gdd-05 AC-12/AC-13/AC-37). */
  system_id?: string;
}

export function persistenceError(code: ErrorCode, message: string, system_id?: string): PersistenceError {
  return { code, class: errorClassOf(code), message, system_id };
}

export function errorClassOf(code: ErrorCode): ErrorClass {
  switch (code) {
    case 'WRITE_FAILED_QUOTA':
      return 'quota';
    case 'WRITE_FAILED_UNSUPPORTED':
      return 'unsupported';
    case 'LOAD_REJECTED_VERSION_MISMATCH':
      return 'schema';
    case 'MULTI_TAB_CONFLICT':
      return 'conflict';
    case 'LOAD_FAILED_UNREADABLE':
      return 'unreadable';
    case 'CONFIG_ERROR_NO_SYSTEMS_REGISTERED':
      return 'config';
    case 'BLOB_MISSING':
    case 'BLOB_ERROR':
    case 'WRITE_FAILED_INTERNAL':
    default:
      return 'internal';
  }
}

export interface CommitResult {
  durability_confirmed: boolean;
  error?: PersistenceError;
}

/** Handle returned by `acquireLock`; `null` means the slot is held elsewhere. */
export interface SlotLock {
  slot_id: string;
  release: () => Promise<void>;
}

/**
 * The DI seam. A mock that fails between `stage()` and `commit()` (AC-17) or
 * hangs inside `commit()` (AC-22) is a first-class requirement, not a test hack.
 */
export interface StorageBackend {
  /** Pure and synchronous: no I/O. Stages one key/value for the next commit. */
  stage(key: string, blob: unknown): void;
  /** ONE transaction. Resolves with `durability_confirmed`; never rejects. */
  commit(): Promise<CommitResult>;
  /** Discards everything staged. Idempotent. */
  abort(): void;
  get(key: string): Promise<unknown>;
  list(prefix: string): Promise<string[]>;
  delete(key: string): Promise<void>;
  /** Instant, never queued (gdd-05 B4 multi-tab). `null` = already held. */
  acquireLock(slotId: string): Promise<SlotLock | null>;
  releaseLock(slotId: string): Promise<void>;
  /** How many entries are staged but not committed. Diagnostic. */
  stagedCount(): number;
}

// ---------------------------------------------------------------------------
// Key space
// ---------------------------------------------------------------------------

export const KEY_PREFIX = {
  slot: 'slot:',
  checkpoint: 'ckpt:',
  turnRecord: 'turn:',
  meta: 'meta:',
} as const;

/** `slot:<slot_id>` */
export function slotKey(slotId: string): string {
  return `${KEY_PREFIX.slot}${slotId}`;
}

/** `ckpt:<slot_id>:<world_time padded>` - lexicographic order equals numeric order. */
export function checkpointKey(slotId: string, worldTime: number): string {
  return `${KEY_PREFIX.checkpoint}${slotId}:${padWorldTime(worldTime)}`;
}

/** `turn:<slot_id>:<world_time padded>:<hack_seq padded>` (gdd-05 B3 key shape). */
export function turnRecordKey(slotId: string, worldTime: number, hackSeq: number): string {
  return `${KEY_PREFIX.turnRecord}${slotId}:${padWorldTime(worldTime)}:${String(hackSeq).padStart(3, '0')}`;
}

export function metaKey(name: string): string {
  return `${KEY_PREFIX.meta}${name}`;
}

function padWorldTime(worldTime: number): string {
  return String(Math.max(0, Math.floor(worldTime))).padStart(9, '0');
}

/** Routes a key to its physical store. Unknown prefixes land in `meta`. */
export function storeForKey(key: string): StoreName {
  if (key.startsWith(KEY_PREFIX.slot)) return 'slots';
  if (key.startsWith(KEY_PREFIX.checkpoint)) return 'checkpoints';
  if (key.startsWith(KEY_PREFIX.turnRecord)) return 'turn_records';
  return 'meta';
}

// ---------------------------------------------------------------------------
// MemoryBackend - the test double (gdd-05 Part C: "a mock that can fail between
// stage and commit (AC-17) or hang inside commit (AC-22)")
// ---------------------------------------------------------------------------

export interface MemoryBackendOptions {
  /**
   * Lock registry shared between two `MemoryBackend` instances to simulate two
   * browser tabs on one origin (AC-18). Defaults to a private registry.
   */
  locks?: Map<string, string>;
  /**
   * Storage shared between two instances. Two tabs of one origin see the same
   * data, so a multi-tab test must share this as well as `locks`.
   */
  store?: Map<string, string>;
  /** Session identity used as the lock owner. Defaults to a counter. */
  sessionId?: string;
}

let memorySessionCounter = 0;

/**
 * In-memory `StorageBackend`. Values are JSON round-tripped on write and on
 * read, so a test can never observe a shared object reference and mistake
 * aliasing for durability.
 */
export class MemoryBackend implements StorageBackend {
  private data: Map<string, string>;
  private staged = new Map<string, string>();
  private locks: Map<string, string>;
  private readonly sessionId: string;
  private pendingCommitFailure: ErrorCode | null = null;
  private permanentCommitFailure: ErrorCode | null = null;
  private commitGate: Promise<void> | null = null;
  private releaseGate: (() => void) | null = null;
  /** Every committed key set, in order. Lets tests assert atomicity. */
  readonly commitLog: string[][] = [];

  constructor(opts: MemoryBackendOptions = {}) {
    this.locks = opts.locks ?? new Map();
    this.data = opts.store ?? new Map();
    memorySessionCounter += 1;
    this.sessionId = opts.sessionId ?? `session_${memorySessionCounter}`;
  }

  /** Injectable failure point: the NEXT commit fails, staged data is discarded. */
  failNextCommit(code: ErrorCode = 'WRITE_FAILED_QUOTA'): void {
    this.pendingCommitFailure = code;
  }

  /** Every commit fails until `clearFailures()` (drives the escalation path). */
  failAllCommits(code: ErrorCode = 'WRITE_FAILED_QUOTA'): void {
    this.permanentCommitFailure = code;
  }

  clearFailures(): void {
    this.pendingCommitFailure = null;
    this.permanentCommitFailure = null;
  }

  /**
   * Suspends `commit()` before it applies staged data. Returns the releaser.
   * Used by AC-22: a read during an unresolved commit must see the PREVIOUS state.
   */
  blockCommit(): () => void {
    this.commitGate = new Promise<void>((resolve) => {
      this.releaseGate = resolve;
    });
    return () => {
      const release = this.releaseGate;
      this.commitGate = null;
      this.releaseGate = null;
      if (release) release();
    };
  }

  stage(key: string, blob: unknown): void {
    this.staged.set(key, JSON.stringify(blob ?? null));
  }

  stagedCount(): number {
    return this.staged.size;
  }

  async commit(): Promise<CommitResult> {
    if (this.commitGate) await this.commitGate;
    const failure = this.pendingCommitFailure ?? this.permanentCommitFailure;
    if (failure) {
      this.pendingCommitFailure = null;
      this.abort(); // all-or-nothing: nothing staged reaches `data` (AC-03/AC-17)
      return {
        durability_confirmed: false,
        error: persistenceError(failure, `MemoryBackend injected failure: ${failure}`),
      };
    }
    const keys = [...this.staged.keys()];
    for (const [key, value] of this.staged) this.data.set(key, value);
    this.staged.clear();
    this.commitLog.push(keys);
    return { durability_confirmed: true };
  }

  abort(): void {
    this.staged.clear();
  }

  async get(key: string): Promise<unknown> {
    const raw = this.data.get(key);
    return raw === undefined ? undefined : JSON.parse(raw);
  }

  async list(prefix: string): Promise<string[]> {
    return [...this.data.keys()].filter((k) => k.startsWith(prefix)).sort();
  }

  async delete(key: string): Promise<void> {
    this.data.delete(key);
  }

  async acquireLock(slotId: string): Promise<SlotLock | null> {
    const holder = this.locks.get(slotId);
    if (holder !== undefined && holder !== this.sessionId) return null;
    this.locks.set(slotId, this.sessionId);
    return { slot_id: slotId, release: () => this.releaseLock(slotId) };
  }

  async releaseLock(slotId: string): Promise<void> {
    if (this.locks.get(slotId) === this.sessionId) this.locks.delete(slotId);
  }

  /** Test helper: raw committed byte size, for the quota formulas. */
  measuredBytes(): number {
    let total = 0;
    for (const value of this.data.values()) total += value.length;
    return total;
  }
}

// ---------------------------------------------------------------------------
// IndexedDbBackend - the real one
// ---------------------------------------------------------------------------

/** Minimal structural type so this module compiles without DOM lib assumptions. */
type IdbFactory = {
  open(name: string, version?: number): any;
  deleteDatabase?(name: string): any;
};

export interface IndexedDbBackendOptions {
  /** Injected for tests (`fake-indexeddb`). Defaults to `globalThis.indexedDB`. */
  indexedDB?: IdbFactory;
  dbName?: string;
  /** Injected Web Locks manager. Defaults to `navigator.locks` when present. */
  locks?: { request: (name: string, opts: any, cb: (lock: unknown) => Promise<void>) => Promise<void> } | null;
}

/**
 * Native IndexedDB backend. `durability_confirmed` is the transaction
 * `oncomplete` event, wrapped in a Promise resolved there and rejected on
 * `onerror` / `onabort` (gdd-05 Part C).
 *
 * Isolation: opens `vdl_saves` only. `aiSimulatorDB` is never touched.
 */
export class IndexedDbBackend implements StorageBackend {
  private staged = new Map<string, unknown>();
  private db: any = null;
  private readonly idb: IdbFactory;
  readonly dbName: string;
  private readonly locksApi: IndexedDbBackendOptions['locks'];
  /** Fallback lock registry for browsers without Web Locks. */
  private static fallbackLocks = new Map<string, boolean>();
  private heldLocks = new Map<string, () => void>();

  constructor(opts: IndexedDbBackendOptions = {}) {
    const globalIdb = (globalThis as any).indexedDB as IdbFactory | undefined;
    const factory = opts.indexedDB ?? globalIdb;
    if (!factory) {
      throw new Error('IndexedDbBackend: no IndexedDB implementation available');
    }
    this.idb = factory;
    this.dbName = opts.dbName ?? SAVE_DB_NAME;
    if (this.dbName === APP_LEGACY_DB_NAME) {
      // Guard rail, not a style rule: writing into the app database could destroy
      // a live player avatar store / legacy autosave (app-map.md :13306-13502).
      throw new Error(`IndexedDbBackend: refusing to open the app database "${APP_LEGACY_DB_NAME}"`);
    }
    const navLocks = (globalThis as any).navigator?.locks;
    this.locksApi = opts.locks !== undefined ? opts.locks : navLocks ?? null;
  }

  private open(): Promise<any> {
    if (this.db) return Promise.resolve(this.db);
    return new Promise((resolve, reject) => {
      const request = this.idb.open(this.dbName, SAVE_DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        for (const store of STORE_NAMES) {
          if (!db.objectStoreNames.contains(store)) db.createObjectStore(store);
        }
      };
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      request.onerror = () => reject(request.error);
    });
  }

  stage(key: string, blob: unknown): void {
    this.staged.set(key, blob);
  }

  stagedCount(): number {
    return this.staged.size;
  }

  abort(): void {
    this.staged.clear();
  }

  /**
   * ONE readwrite transaction over exactly the stores the staged keys touch.
   * `durability_confirmed` is set only in `oncomplete`.
   */
  async commit(): Promise<CommitResult> {
    if (this.staged.size === 0) return { durability_confirmed: true };
    let db: any;
    try {
      db = await this.open();
    } catch (err) {
      this.abort();
      return { durability_confirmed: false, error: mapDomError(err) };
    }
    const entries = [...this.staged.entries()];
    const stores = [...new Set(entries.map(([key]) => storeForKey(key)))];
    return new Promise<CommitResult>((resolve) => {
      let tx: any;
      try {
        tx = db.transaction(stores, 'readwrite');
      } catch (err) {
        this.abort();
        resolve({ durability_confirmed: false, error: mapDomError(err) });
        return;
      }
      let settled = false;
      const settle = (result: CommitResult) => {
        if (settled) return;
        settled = true;
        this.staged.clear();
        resolve(result);
      };
      tx.oncomplete = () => settle({ durability_confirmed: true });
      tx.onerror = () => settle({ durability_confirmed: false, error: mapDomError(tx.error) });
      tx.onabort = () => settle({ durability_confirmed: false, error: mapDomError(tx.error) });
      try {
        for (const [key, value] of entries) {
          tx.objectStore(storeForKey(key)).put(value, key);
        }
      } catch (err) {
        try {
          tx.abort();
        } catch {
          /* the abort handler settles the promise */
        }
        settle({ durability_confirmed: false, error: mapDomError(err) });
      }
    });
  }

  async get(key: string): Promise<unknown> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([storeForKey(key)], 'readonly');
      const req = tx.objectStore(storeForKey(key)).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async list(prefix: string): Promise<string[]> {
    const db = await this.open();
    const store = storeForKey(prefix);
    return new Promise((resolve, reject) => {
      const tx = db.transaction([store], 'readonly');
      const req = tx.objectStore(store).getAllKeys();
      req.onsuccess = () =>
        resolve((req.result as string[]).filter((k) => k.startsWith(prefix)).sort());
      req.onerror = () => reject(req.error);
    });
  }

  async delete(key: string): Promise<void> {
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([storeForKey(key)], 'readwrite');
      tx.objectStore(storeForKey(key)).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  /**
   * `navigator.locks.request(name, {ifAvailable: true}, cb)` when available -
   * instant rejection, never queued, auto-released on tab close (AC-18/AC-33).
   * Browsers without Web Locks fall back to a process-local registry, which is a
   * no-op across tabs; that limitation is deliberate and documented.
   */
  async acquireLock(slotId: string): Promise<SlotLock | null> {
    const name = `slot-${slotId}`;
    if (this.locksApi && typeof this.locksApi.request === 'function') {
      let granted = false;
      let release!: () => void;
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      await this.locksApi.request(name, { ifAvailable: true }, async (lock: unknown) => {
        if (!lock) return;
        granted = true;
        await held;
      });
      if (!granted) return null;
      this.heldLocks.set(slotId, release);
      return { slot_id: slotId, release: () => this.releaseLock(slotId) };
    }
    if (IndexedDbBackend.fallbackLocks.get(name)) return null;
    IndexedDbBackend.fallbackLocks.set(name, true);
    this.heldLocks.set(slotId, () => IndexedDbBackend.fallbackLocks.delete(name));
    return { slot_id: slotId, release: () => this.releaseLock(slotId) };
  }

  async releaseLock(slotId: string): Promise<void> {
    const release = this.heldLocks.get(slotId);
    if (release) {
      release();
      this.heldLocks.delete(slotId);
    }
    IndexedDbBackend.fallbackLocks.delete(`slot-${slotId}`);
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

/** Maps a DOMException to the GDD error taxonomy (gdd-05 B3). */
export function mapDomError(err: unknown): PersistenceError {
  const name = (err as { name?: string } | null)?.name ?? '';
  const message = (err as { message?: string } | null)?.message ?? String(err ?? 'unknown');
  if (name === 'QuotaExceededError') {
    return persistenceError('WRITE_FAILED_QUOTA', message);
  }
  if (name === 'InvalidStateError' || name === 'SecurityError' || name === 'NotSupportedError') {
    return persistenceError('WRITE_FAILED_UNSUPPORTED', message);
  }
  return persistenceError('WRITE_FAILED_INTERNAL', message);
}
