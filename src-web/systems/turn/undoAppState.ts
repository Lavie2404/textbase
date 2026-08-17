/**
 * `UndoableSystem` adapter for the React-owned state inside App.tsx.
 *
 * Design docs:
 * - production/gdd-integration/gdd-01-turn-contract-ai.md A.2 CR#8 / A.9
 *   (".duplicate(true) -> structuredClone", "re-emit signals on restore" ->
 *   "trigger a store update / re-render on restore, otherwise the UI shows
 *   stale values after rollback")
 * - production/gdd-integration/plan.md decision C-13 and risk R5 ("missing one
 *   piece of state -> incomplete rollback, ghost data"). R5 is the reason the
 *   captured field list is explicit and enumerated rather than "whatever the
 *   caller passes".
 *
 * This module is pure: it never imports React and never reaches for a store.
 * App.tsx (P4b) injects a getter and a setter; the getter must return the CURRENT
 * values (read from refs, not from a stale closure) and the setter must apply
 * them through `setState` so the re-render happens.
 */

import type { UndoableSystem } from '../types';

/**
 * The exact set of App-owned React state that a turn can mutate.
 *
 * Enumerated on purpose (plan.md R5). Adding a new turn-mutable React state to
 * App.tsx without adding it here silently breaks Undo, so this interface is the
 * checklist.
 */
export interface AppUndoableState {
  /** `knowledge:19987` - the world state object. */
  knowledge: unknown;
  /** `storyHistory:19553` - full narration log entries. */
  storyHistory: unknown;
  /** `storySummaries:18994` - compressed chronicle layer. */
  storySummaries: unknown;
  /** `currentTurn:19017` - the App's own turn counter (distinct from world_time). */
  currentTurn: number;
  /** `gameSettings:18965` - a turn may change e.g. difficulty-adjacent fields. */
  gameSettings: unknown;
  /** `choices:19555` - the rendered suggestion set. */
  choices: unknown;
}

/** Field order is fixed so a snapshot is diffable and stable across sessions. */
export const APP_UNDOABLE_FIELDS: readonly (keyof AppUndoableState)[] = [
  'knowledge',
  'storyHistory',
  'storySummaries',
  'currentTurn',
  'gameSettings',
  'choices',
];

export interface AppStateAccessors {
  /** Must return live values (read through refs), never a stale render closure. */
  get(): AppUndoableState;
  /**
   * Must write every field back through React setters so the UI re-renders
   * (gdd-01 A.9 "re-emit signals on restore").
   */
  set(next: AppUndoableState): void;
  /** Optional deep-clone override. Defaults to `structuredClone` + JSON fallback. */
  clone?: <T>(value: T) => T;
  /** Diagnostics sink for clone fallbacks; never throws out of the adapter. */
  onWarning?: (message: string) => void;
}

export interface AppStateSnapshot {
  /** Schema tag so a future field addition is detectable, not silently dropped. */
  kind: 'app_state';
  version: 1;
  fields: AppUndoableState;
}

/**
 * Deep clone with a documented degradation ladder:
 * 1. `structuredClone` (gdd-01 A.9's prescribed replacement for `.duplicate(true)`)
 * 2. `JSON.parse(JSON.stringify(...))` when the value carries something
 *    `structuredClone` refuses (functions, DOM nodes, React elements)
 * 3. the value itself, with a warning - better a shallow reference than a crash
 *    mid-turn, and the warning makes the gap visible to QA.
 */
export function deepCloneState<T>(value: T, onWarning?: (m: string) => void): T {
  const sc = (globalThis as { structuredClone?: <U>(v: U) => U }).structuredClone;
  if (typeof sc === 'function') {
    try {
      return sc(value);
    } catch {
      onWarning?.('structuredClone failed; falling back to JSON clone');
    }
  }
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    onWarning?.('JSON clone failed; snapshot holds a shared reference');
    return value;
  }
}

/** Picks exactly the enumerated fields, dropping anything else the caller passed. */
function pickFields(state: AppUndoableState): AppUndoableState {
  const out = {} as AppUndoableState;
  for (const key of APP_UNDOABLE_FIELDS) {
    (out as unknown as Record<string, unknown>)[key] = (state as unknown as Record<string, unknown>)[key];
  }
  return out;
}

export interface AppStateUndoable extends UndoableSystem {
  /** Type guard used by tests and by the Persistence bundle writer. */
  isSnapshot(s: unknown): s is AppStateSnapshot;
  /** The enumerated field list, exposed for the P4b wiring checklist. */
  readonly fields: readonly (keyof AppUndoableState)[];
}

/**
 * Builds the adapter. P4b wires it as:
 *
 * ```ts
 * registry.register(makeAppStateUndoable({
 *   get: () => ({ knowledge: knowledgeRef.current, ... }),
 *   set: (s) => { setKnowledge(s.knowledge); ... },
 * }), 'app_state');
 * ```
 */
export function makeAppStateUndoable(accessors: AppStateAccessors): AppStateUndoable {
  const clone = accessors.clone ?? (<T>(v: T) => deepCloneState(v, accessors.onWarning));

  return {
    fields: APP_UNDOABLE_FIELDS,

    captureSnapshot(): AppStateSnapshot {
      const live = pickFields(accessors.get());
      return { kind: 'app_state', version: 1, fields: clone(live) };
    },

    restoreSnapshot(snapshot: unknown): void {
      if (!isAppStateSnapshot(snapshot)) {
        accessors.onWarning?.('restoreSnapshot received a foreign snapshot; ignored');
        return;
      }
      // Clone on the way out too: the snapshot may be restored more than once
      // (a failed post-undo write reapplies it), so callers must never get a
      // reference they can mutate in place.
      accessors.set(clone(pickFields(snapshot.fields)));
    },

    isSnapshot: isAppStateSnapshot,
  };
}

export function isAppStateSnapshot(s: unknown): s is AppStateSnapshot {
  if (!s || typeof s !== 'object') return false;
  const cand = s as Partial<AppStateSnapshot>;
  return cand.kind === 'app_state' && cand.version === 1 && !!cand.fields;
}
