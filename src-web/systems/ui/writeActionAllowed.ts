/**
 * Core UI D.1 - `write_action_allowed(action, tm_state, screen)`.
 *
 * Design docs: production/gdd-integration/gdd-06-ui-card-customization.md
 * (PART A, Core Rules #4/#5/#6, D.1, AC-04/AC-07/AC-37), plan.md P6 (reduced).
 *
 * The GDD states the rule as a TABLE, so this module ships the table as DATA
 * (`WRITE_ACTION_MATRIX`, 46 rows) plus the total function that reads it. The
 * UI must never re-derive "is this button live?" from ad-hoc booleans; it calls
 * `isWriteActionAllowed` and applies a recursive subtree disable.
 *
 * Pure module: no React, no I/O, no RNG.
 */

/** Turn Manager state, mirrored from gdd-01 (never owned here). */
export type TmState = 'awaiting_action' | 'resolving' | 'undoing';
export const TM_STATES: readonly TmState[] = ['awaiting_action', 'resolving', 'undoing'];

/**
 * Screen ids. The GDD names them S1/S2/S4/S4-RO/S5; this project maps them onto
 * the shipped app's `currentScreen` values (see `screenTransition.ts`).
 */
export type ScreenId = 'S1' | 'S2' | 'S4' | 'S4-RO' | 'S5';
export const SCREEN_IDS: readonly ScreenId[] = ['S1', 'S2', 'S4', 'S4-RO', 'S5'];

/** gdd-06 A4 D.1: the 8 mutating actions. */
export const MUTATING_ACTIONS = [
  'submit_action',
  'tap_suggestion_card',
  'tap_intent_chip',
  'tap_undo',
  'tap_song_tu_button',
  'tap_recovery_button',
  'tap_back_to_slots',
  'tap_delete_slot',
] as const;

/** gdd-06 A4 D.1: the 7 read-only actions. */
export const READONLY_ACTIONS = [
  'open_card',
  'close_card',
  'tap_name_link',
  'open_story_log',
  'scroll_story_log',
  'open_settings',
  'close_settings',
] as const;

export type MutatingAction = (typeof MUTATING_ACTIONS)[number];
export type ReadonlyAction = (typeof READONLY_ACTIONS)[number];
export type UiAction = MutatingAction | ReadonlyAction;

export const ALL_ACTIONS: readonly UiAction[] = [...MUTATING_ACTIONS, ...READONLY_ACTIONS];

/**
 * gdd-06 A4 D.1 footnote: three actions are NOT gated by `tm_state`.
 * They are outside `write_action_allowed`'s domain and have their own owners.
 */
export const UNGATED_ACTIONS = [
  'tap_retry_reset', // gated by Character Continuation's `state`
  'tap_continue_to_fate', // always enabled while the line is visible (AC-57)
] as const;
export type UngatedAction = (typeof UNGATED_ACTIONS)[number];

export type ActionClass = 'mutating' | 'readonly';

/** Static classification; NEVER varies by screen (gdd-06 A4 D.1). */
export function actionClass(action: string): ActionClass | null {
  if ((MUTATING_ACTIONS as readonly string[]).includes(action)) return 'mutating';
  if ((READONLY_ACTIONS as readonly string[]).includes(action)) return 'readonly';
  return null;
}

export interface WriteActionContext {
  tm_state: TmState;
  screen: ScreenId;
}

/**
 * D.1, total function:
 *
 *   1                            if class(action) = readonly
 *   1                            if action = tap_back_to_slots AND screen = S5
 *   (tm_state = awaiting_action) otherwise
 *
 * An unknown action returns `false` - fail closed, never throw: the UI treats
 * `false` as "don't let the player press this", which is always the safe answer.
 */
export function isWriteActionAllowed(action: string, ctx: WriteActionContext): boolean {
  const klass = actionClass(action);
  if (klass === null) return false;
  if (klass === 'readonly') return true;
  if (action === 'tap_back_to_slots' && ctx.screen === 'S5') return true;
  return ctx.tm_state === 'awaiting_action';
}

export interface WriteActionMatrixRow {
  action: UiAction;
  tm_state: TmState;
  /** `null` = the outcome is screen-independent for this row. */
  screen: ScreenId | null;
  allowed: boolean;
  klass: ActionClass;
}

/**
 * The 46 distinct outcomes of AC-04: 15 actions x 3 `tm_state` values = 45,
 * PLUS the one screen-dependent carve-out `tap_back_to_slots @ S5`.
 *
 * Rows with `screen = null` hold for every screen; the carve-out row pins S5.
 */
export function buildWriteActionMatrix(): WriteActionMatrixRow[] {
  const rows: WriteActionMatrixRow[] = [];
  for (const action of ALL_ACTIONS) {
    for (const tm_state of TM_STATES) {
      rows.push({
        action,
        tm_state,
        screen: null,
        allowed: isWriteActionAllowed(action, { tm_state, screen: 'S2' }),
        klass: actionClass(action) as ActionClass,
      });
    }
  }
  rows.push({
    action: 'tap_back_to_slots',
    tm_state: 'resolving',
    screen: 'S5',
    allowed: true,
    klass: 'mutating',
  });
  return rows;
}

export const WRITE_ACTION_MATRIX: readonly WriteActionMatrixRow[] = buildWriteActionMatrix();

/**
 * gdd-06 A2 #7 / AC-37: S4-RO renders ZERO mutating elements - not even
 * disabled ones. This is a rendering gate, distinct from the enable gate.
 */
export function isActionRenderable(action: string, screen: ScreenId): boolean {
  const klass = actionClass(action);
  if (klass === null) return false;
  if (screen === 'S4-RO') return klass === 'readonly';
  return true;
}

export type UndoButtonState = 'hidden' | 'enabled' | 'disabled';

/**
 * gdd-06 A2 #6 + AC-07: the Undo button needs BOTH `undo_available` (to render)
 * AND `write_action_allowed(tap_undo, ...)` (to press). "Hidden" and "dimmed"
 * are two DIFFERENT mechanisms and must never collapse into one.
 */
export function undoButtonState(
  undoAvailable: boolean,
  ctx: WriteActionContext,
): UndoButtonState {
  if (!undoAvailable) return 'hidden';
  return isWriteActionAllowed('tap_undo', ctx) ? 'enabled' : 'disabled';
}

/**
 * Convenience for the React layer: the alpha to render a control at.
 * `null` means "do not render this node at all".
 */
export function controlAlpha(
  action: string,
  ctx: WriteActionContext,
  alphas: { full: number; disabled: number },
): number | null {
  if (!isActionRenderable(action, ctx.screen)) return null;
  return isWriteActionAllowed(action, ctx) ? alphas.full : alphas.disabled;
}
