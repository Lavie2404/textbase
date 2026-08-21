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
  /**
   * A PROJECTION of `gameSettings:18965`, never the whole object - see
   * `TURN_RELEVANT_SETTINGS_KEYS`. The setter MUST merge it
   * (`setGameSettings(prev => ({ ...prev, ...s.gameSettings }))`), never assign
   * it, because the keys outside the projection are deliberately absent.
   */
  gameSettings: unknown;
  /** `choices:19555` - the rendered suggestion set. */
  choices: unknown;

  // -- Optional fields (added after the first P4b wiring pass). Absent keys are
  // NOT written into the snapshot, so an older caller keeps its exact shape.

  /** `gameMode` - EXPLORATION | COMBAT | TRADE. A turn can switch it via tags. */
  gameMode?: unknown;
  /** `activeTrade` - the whole trade session object; a turn can open/close it. */
  activeTrade?: unknown;
  /** `adventureTurnCount` - the adventure-skill clock, incremented per turn. */
  adventureTurnCount?: number;
}

/**
 * Keys of `gameSettings` the TURN PIPELINE may mutate, and therefore the only
 * ones Undo has to restore.
 *
 * AUDITED EMPTY. Every `setGameSettings` call site in App.tsx belongs to world
 * creation, the settings screen, the BGM controls, or a save load - none of them
 * runs inside the turn cycle, and none of them is inside the undo window. So the
 * projection is `{}` and restoring it is a no-op merge, which is exactly right:
 * capturing the full object would deep-clone `initialWorldElements` and the
 * custom theme config on EVERY turn for nothing.
 *
 * If a turn-pipeline setting ever appears, add its key here - that is the whole
 * change needed, and `makeAppStateUndoable` picks it up automatically.
 */
export const TURN_RELEVANT_SETTINGS_KEYS: readonly string[] = [];

/** Field order is fixed so a snapshot is diffable and stable across sessions. */
export const APP_UNDOABLE_FIELDS: readonly (keyof AppUndoableState)[] = [
  'knowledge',
  'storyHistory',
  'storySummaries',
  'currentTurn',
  'gameSettings',
  'choices',
  'gameMode',
  'activeTrade',
  'adventureTurnCount',
];

/**
 * Fields a caller may omit. They are copied only when the getter actually
 * returns them, so a snapshot taken by a caller that predates them contains no
 * `undefined` placeholders and restores byte-identically.
 */
export const APP_UNDOABLE_OPTIONAL_FIELDS: readonly (keyof AppUndoableState)[] = [
  'gameMode',
  'activeTrade',
  'adventureTurnCount',
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
  /**
   * Overrides how `gameSettings` is narrowed to its turn-relevant projection.
   * Defaults to picking `TURN_RELEVANT_SETTINGS_KEYS`. A caller that stores its
   * settings somewhere other than a plain object can supply its own picker.
   */
  settingsProjection?: (settings: unknown, keys: readonly string[]) => unknown;
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

/** Default projection: pick the listed keys, skipping ones the object lacks. */
export function projectSettings(settings: unknown, keys: readonly string[]): unknown {
  if (keys.length === 0) return {};
  if (!settings || typeof settings !== 'object') return {};
  const src = settings as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of keys) if (k in src) out[k] = src[k];
  return out;
}

/** Picks exactly the enumerated fields, dropping anything else the caller passed. */
function pickFields(state: AppUndoableState): AppUndoableState {
  const out = {} as AppUndoableState;
  const src = state as unknown as Record<string, unknown>;
  for (const key of APP_UNDOABLE_FIELDS) {
    if (APP_UNDOABLE_OPTIONAL_FIELDS.includes(key) && !(key in src)) continue;
    (out as unknown as Record<string, unknown>)[key] = src[key];
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
  const project = accessors.settingsProjection ?? projectSettings;

  return {
    fields: APP_UNDOABLE_FIELDS,

    captureSnapshot(): AppStateSnapshot {
      const live = pickFields(accessors.get());
      // Narrow gameSettings BEFORE cloning: the full object carries the world
      // creation payload and the theme config, none of which a turn can change.
      live.gameSettings = project(live.gameSettings, TURN_RELEVANT_SETTINGS_KEYS);
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
