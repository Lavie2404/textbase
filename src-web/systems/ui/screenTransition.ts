/**
 * Core UI D.2 - `screen_transition_valid(from, to, ctx)` and the overlay tier,
 * expressed over the SHIPPED app's screens rather than the GDD's abstract ones.
 *
 * Design docs: production/gdd-integration/gdd-06-ui-card-customization.md
 * (PART A, Core Rules #1/#2, D.2, A6 edge cases, AC-08..AC-11, AC-64),
 * app-map.md section (l), plan.md P6 (reduced).
 *
 * SCREEN MAPPING (recorded assumption, P6a)
 *   GDD S1  (root / save slots)  -> app `initial`
 *   GDD S2  (main play screen)   -> app `gameplay`
 *   app `setup` (character creation) has NO GDD counterpart; it sits between
 *   `initial` and `gameplay` and is treated as an S1-class screen for the
 *   purposes of D.1's write-action matrix.
 *   GDD S4 / S4-RO (Story Log) and S5 (3-way continuation) are OUT of the
 *   reduced P6a scope: story-log pagination UI and Character Continuation were
 *   both cut (plan.md decision C-7 + "P6 rút gọn").
 *
 * Pure module: no React, no I/O, no RNG, no clock (elapsed time is injected).
 */

import { AI_KNOBS, UI_KNOBS } from '../registry';
import type { ScreenId, TmState } from './writeActionAllowed';

// ---------------------------------------------------------------------------
// Screens
// ---------------------------------------------------------------------------

export type AppScreen = 'initial' | 'setup' | 'gameplay';
export const APP_SCREENS: readonly AppScreen[] = ['initial', 'setup', 'gameplay'];

/** Boot always lands here, regardless of the last played slot (gdd-06 AC-51). */
export const BOOT_SCREEN: AppScreen = 'initial';

/** Which GDD screen class an app screen behaves as (see the header note). */
export const GDD_SCREEN_OF: Record<AppScreen, ScreenId> = {
  initial: 'S1',
  setup: 'S1',
  gameplay: 'S2',
};

export function gddScreenOf(screen: AppScreen): ScreenId {
  return GDD_SCREEN_OF[screen] ?? 'S1';
}

// ---------------------------------------------------------------------------
// Overlays
// ---------------------------------------------------------------------------

export type OverlayId = 'none' | 'settings' | 'card' | 'customize' | 'confirmDelete';
export const OVERLAY_IDS: readonly OverlayId[] = [
  'none',
  'settings',
  'card',
  'customize',
  'confirmDelete',
];

/**
 * Which screens each overlay may be opened from (gdd-06 A4 D.2 "Open-source
 * sets", plus gdd-06 C4 D.1 for `customize`, which requires the play screen).
 */
export const OVERLAY_SOURCES: Record<Exclude<OverlayId, 'none'>, readonly AppScreen[]> = {
  settings: ['initial', 'gameplay'],
  card: ['gameplay'],
  customize: ['gameplay'],
  confirmDelete: ['initial'],
};

export interface ScreenTransitionContext {
  tm_state?: TmState;
  /** Guard for `initial -> gameplay`: a slot must exist / be loadable. */
  slot_ready?: boolean;
  /** True while the character-creation flow has produced a startable world. */
  setup_complete?: boolean;
}

export interface ScreenEdge {
  from: AppScreen;
  to: AppScreen;
  /** Human-readable guard id; `null` = unconditional. */
  guard: string | null;
  test: (ctx: ScreenTransitionContext) => boolean;
}

/**
 * The complete edge set. Anything not listed here is a NON-edge and
 * `screenTransitionValid` returns `false` - which means "don't render this
 * control", never an error (gdd-06 A4 D.2).
 */
export const SCREEN_EDGES: readonly ScreenEdge[] = [
  { from: 'initial', to: 'setup', guard: null, test: () => true },
  {
    from: 'initial',
    to: 'gameplay',
    guard: 'slot_ready',
    test: (ctx) => ctx.slot_ready === true,
  },
  { from: 'setup', to: 'initial', guard: null, test: () => true },
  {
    from: 'setup',
    to: 'gameplay',
    guard: 'setup_complete',
    test: (ctx) => ctx.setup_complete === true,
  },
  {
    // gdd-06 A4 D.2 `S2 -> S1`: leaving the play screen is a mutating action and
    // is blocked while the world is still being written.
    from: 'gameplay',
    to: 'initial',
    guard: 'tm_state = awaiting_action',
    test: (ctx) => (ctx.tm_state ?? 'awaiting_action') === 'awaiting_action',
  },
];

/** D.2. Total function; never throws. */
export function screenTransitionValid(
  from: AppScreen,
  to: AppScreen,
  ctx: ScreenTransitionContext = {},
): boolean {
  return SCREEN_EDGES.some((edge) => edge.from === from && edge.to === to && edge.test(ctx));
}

/** The guard id of an edge, for diagnostics. `null` when the edge is absent. */
export function screenEdgeGuard(from: AppScreen, to: AppScreen): string | null | undefined {
  const edge = SCREEN_EDGES.find((e) => e.from === from && e.to === to);
  return edge ? edge.guard : undefined;
}

// ---------------------------------------------------------------------------
// Overlay state machine
// ---------------------------------------------------------------------------

export interface OverlayState {
  open: OverlayId;
}

export interface OverlayTransitionResult {
  open: OverlayId;
  /** The overlay that was silently closed to honour the max-1 rule, if any. */
  closed: OverlayId | null;
  /** False when the request was rejected (illegal source screen). */
  changed: boolean;
  /** Always 0 - opening/closing an overlay costs no turn (gdd-06 AC-03). */
  turn_cost: 0;
}

export function overlayAllowedFrom(overlay: OverlayId, screen: AppScreen): boolean {
  if (overlay === 'none') return true;
  return (OVERLAY_SOURCES[overlay] ?? []).includes(screen);
}

/**
 * Opening an overlay auto-closes the previous one SILENTLY, with no stacking
 * (gdd-06 A6). Requesting an overlay from an illegal screen is rejected and
 * leaves the current one untouched.
 */
export function openOverlay(
  current: OverlayId,
  next: Exclude<OverlayId, 'none'>,
  screen: AppScreen,
): OverlayTransitionResult {
  if (!overlayAllowedFrom(next, screen)) {
    return { open: current, closed: null, changed: false, turn_cost: 0 };
  }
  if (current === next) {
    return { open: current, closed: null, changed: false, turn_cost: 0 };
  }
  return {
    open: next,
    closed: current === 'none' ? null : current,
    changed: true,
    turn_cost: 0,
  };
}

export function closeOverlay(current: OverlayId): OverlayTransitionResult {
  return {
    open: 'none',
    closed: current === 'none' ? null : current,
    changed: current !== 'none',
    turn_cost: 0,
  };
}

/**
 * gdd-06 A4 D.2: any screen transition auto-closes the open overlay BEFORE the
 * flip. Typed content in `confirmDelete` is lost, not restored.
 */
export function applyScreenTransition(
  from: AppScreen,
  to: AppScreen,
  overlay: OverlayId,
  ctx: ScreenTransitionContext = {},
): { screen: AppScreen; open: OverlayId; closed: OverlayId | null; valid: boolean } {
  if (!screenTransitionValid(from, to, ctx)) {
    return { screen: from, open: overlay, closed: null, valid: false };
  }
  return {
    screen: to,
    open: 'none',
    closed: overlay === 'none' ? null : overlay,
    valid: true,
  };
}

/**
 * gdd-06 A6: Esc is consumed by the topmost open tier. Overlay open -> close it;
 * nothing open -> NO action (there is no pause menu). Esc never leaves a screen.
 */
export function handleEscape(overlay: OverlayId): OverlayTransitionResult {
  if (overlay === 'none') {
    return { open: 'none', closed: null, changed: false, turn_cost: 0 };
  }
  return closeOverlay(overlay);
}

// ---------------------------------------------------------------------------
// AI wait state (gdd-06 A2 #9)
// ---------------------------------------------------------------------------

export type AiWaitPhase = 'idle' | 'writing' | 'escalated' | 'timeout';

export interface AiWaitOptions {
  /** Default from `UI_KNOBS` (15s). */
  escalationSeconds?: number;
  /**
   * The GDD value is 30s; the shipped app deviates to 60s under plan.md C-10.
   * Both satisfy the binding invariant `escalation < timeout`.
   */
  timeoutSeconds?: number;
}

/** The GDD's own timeout, kept so the invariant can be asserted against it. */
export const GDD_AI_CALL_TIMEOUT_SECONDS = 30;

export function aiWaitPhase(
  elapsedMs: number,
  tmState: TmState,
  opts: AiWaitOptions = {},
): AiWaitPhase {
  if (tmState !== 'resolving') return 'idle';
  const escalation = (opts.escalationSeconds ?? UI_KNOBS.ai_writing_escalation_seconds) * 1000;
  const timeout = (opts.timeoutSeconds ?? AI_KNOBS.ai_call_timeout_seconds) * 1000;
  const elapsed = Number(elapsedMs);
  if (!Number.isFinite(elapsed) || elapsed < 0) return 'writing';
  if (elapsed >= timeout) return 'timeout';
  if (elapsed >= escalation) return 'escalated';
  return 'writing';
}

/**
 * Binding invariant of gdd-06 A2 #9 / A5: the single diegetic escalation must
 * fire strictly BEFORE the call can time out.
 */
export function aiWaitInvariantHolds(opts: AiWaitOptions = {}): boolean {
  const escalation = opts.escalationSeconds ?? UI_KNOBS.ai_writing_escalation_seconds;
  const timeout = opts.timeoutSeconds ?? AI_KNOBS.ai_call_timeout_seconds;
  return escalation < timeout;
}

/**
 * gdd-06 A2 #9 + AC-33: on timeout the UI returns to Awaiting Action, renders
 * the error INSIDE the narrative frame (never a banner), leaves `world_time`
 * unchanged and preserves the free-text box verbatim.
 */
export interface AiTimeoutOutcome {
  tm_state: TmState;
  render_error_in_frame: true;
  render_error_as_banner: false;
  world_time_delta: 0;
  preserved_input: string;
}

export function aiTimeoutOutcome(freeText: string): AiTimeoutOutcome {
  return {
    tm_state: 'awaiting_action',
    render_error_in_frame: true,
    render_error_as_banner: false,
    world_time_delta: 0,
    preserved_input: freeText,
  };
}
