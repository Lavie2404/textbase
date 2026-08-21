/**
 * Snapshot registry - the storage half of the one-turn Undo (ADR-0004).
 *
 * Design docs:
 * - production/gdd-integration/gdd-01-turn-contract-ai.md A.3 / A.4 (F3)
 * - production/gdd-integration/plan.md decision C-13 ("Undo 1 turn: DO IT")
 *
 * WHY A SEPARATE MODULE
 * Turn Manager owns *when* a snapshot is taken; this module owns the array that
 * holds it. gdd-01 A.3 requires `_pending_snapshot` to be **index-aligned with
 * the registration order of `_registered_systems`**, which is exactly the class
 * of invariant that rots when it lives inline in a 300-line state machine.
 *
 * VALIDITY vs PRESENCE - two different things, deliberately
 * - "present"  = `captureAll()` ran and produced snapshots.
 * - "valid"    = the snapshot may still back an Undo. gdd-01 F3 says
 *   `pending_snapshot_valid` returns to `true` **only when the next turn
 *   confirms**, so `captureAll()` does NOT set it; Turn Manager calls
 *   `markValid()` at commit time. `invalidatePendingSnapshot()` (sole caller:
 *   Character Customization Mode, on the first hack write inside an undo window)
 *   clears validity while leaving the data in place for diagnostics.
 *
 * No React, no I/O, no globals. Every system it holds is an `UndoableSystem`.
 */

import type { UndoableSystem } from '../types';

/** A registered system plus the id used in diagnostics. */
interface RegisteredEntry {
  id: string;
  system: UndoableSystem;
}

export interface SnapshotRegistryOptions {
  /** Called instead of throwing when a restore finds a shape mismatch. */
  onWarning?: (message: string) => void;
}

/** Diagnostic record of one capture/restore cycle. */
export interface SnapshotDiagnostics {
  system_count: number;
  snapshot_count: number;
  captured: boolean;
  valid: boolean;
  /** Registration ids in order - the index alignment contract, made observable. */
  ids: string[];
}

export class SnapshotRegistry {
  private _registered_systems: RegisteredEntry[] = [];
  private _pending_snapshot: unknown[] = [];
  /** Number of systems that existed at capture time (index-alignment guard). */
  private _snapshot_arity = 0;
  private _captured = false;
  private _valid = false;
  private readonly onWarning: (message: string) => void;

  constructor(opts: SnapshotRegistryOptions = {}) {
    this.onWarning = opts.onWarning ?? (() => {});
  }

  /**
   * Registers a system. Registration order IS the snapshot index order and must
   * never change mid-session (gdd-01 A.3). Returns the assigned index.
   */
  register(system: UndoableSystem, id?: string): number {
    const index = this._registered_systems.length;
    this._registered_systems.push({ id: id ?? `system_${index}`, system });
    // A system registered after a capture cannot be restored from that capture.
    if (this._captured) {
      this.onWarning(
        `system registered after captureAll(); pending snapshot invalidated (index ${index})`,
      );
      this.invalidatePendingSnapshot();
    }
    return index;
  }

  /** Number of registered systems. */
  get systemCount(): number {
    return this._registered_systems.length;
  }

  /** Registration ids, in index order. */
  get ids(): string[] {
    return this._registered_systems.map((e) => e.id);
  }

  /** gdd-01 F3 conjunct 5. */
  get pendingSnapshotValid(): boolean {
    return this._valid;
  }

  /** True once `captureAll()` has produced an index-aligned snapshot array. */
  get hasSnapshot(): boolean {
    return this._captured;
  }

  /**
   * `_pending_snapshot = _registered_systems.map(s => s.capture_snapshot())`.
   * Runs BEFORE anything mutates (gdd-01 A.4 step 1). Never marks the snapshot
   * valid - see the module header.
   */
  captureAll(): void {
    this._pending_snapshot = this._registered_systems.map((e) => e.system.captureSnapshot());
    this._snapshot_arity = this._registered_systems.length;
    this._captured = true;
  }

  /**
   * Captures into a detached array without touching `_pending_snapshot`. Used by
   * Undo to keep a "pre-undo" copy so a failed post-undo write can be rolled
   * forward again (gdd-01 A.4 `reapplyPreUndoState`).
   */
  captureDetached(): unknown[] {
    return this._registered_systems.map((e) => e.system.captureSnapshot());
  }

  /** Restores from a detached array produced by `captureDetached()`. */
  restoreFrom(snapshots: readonly unknown[]): boolean {
    if (snapshots.length !== this._registered_systems.length) {
      this.onWarning(
        `restoreFrom arity mismatch: ${snapshots.length} snapshots vs ${this._registered_systems.length} systems`,
      );
      return false;
    }
    this._registered_systems.forEach((entry, i) => entry.system.restoreSnapshot(snapshots[i]));
    return true;
  }

  /**
   * `_registered_systems.forEach((s,i) => s.restore_snapshot(_pending_snapshot[i]))`.
   * Returns false (and restores nothing) when no snapshot exists or the arity
   * drifted - a partial restore is worse than none.
   */
  restoreAll(): boolean {
    if (!this._captured) {
      this.onWarning('restoreAll() called with no pending snapshot');
      return false;
    }
    if (this._snapshot_arity !== this._registered_systems.length) {
      this.onWarning(
        `restoreAll arity mismatch: snapshot has ${this._snapshot_arity}, registry has ${this._registered_systems.length}`,
      );
      return false;
    }
    this._registered_systems.forEach((entry, i) => entry.system.restoreSnapshot(this._pending_snapshot[i]));
    return true;
  }

  /**
   * Turn Manager calls this at commit: the just-captured snapshot now backs a
   * real, confirmed turn and Undo may use it (gdd-01 A.4 step 6).
   */
  markValid(): void {
    if (!this._captured) {
      this.onWarning('markValid() called with no pending snapshot');
      return;
    }
    this._valid = true;
  }

  /**
   * gdd-01 F3: sole caller is Character Customization Mode, on the FIRST
   * hack-write/delete inside an undo window. Idempotent.
   */
  invalidatePendingSnapshot(): void {
    this._valid = false;
  }

  /** Drops both data and validity (slot change, restart, death handoff). */
  clear(): void {
    this._pending_snapshot = [];
    this._snapshot_arity = 0;
    this._captured = false;
    this._valid = false;
  }

  /** Removes every registration. Test/teardown helper. */
  reset(): void {
    this._registered_systems = [];
    this.clear();
  }

  /** Read-only peek used by tests and the debug panel. */
  snapshotAt(index: number): unknown {
    return this._pending_snapshot[index];
  }

  diagnostics(): SnapshotDiagnostics {
    return {
      system_count: this._registered_systems.length,
      snapshot_count: this._pending_snapshot.length,
      captured: this._captured,
      valid: this._valid,
      ids: this.ids,
    };
  }
}

/** Factory mirroring the other systems' style. */
export function createSnapshotRegistry(opts: SnapshotRegistryOptions = {}): SnapshotRegistry {
  return new SnapshotRegistry(opts);
}
