/**
 * Core UI D.5 (two-column layout) and D.6 (transition/z-order ranking).
 *
 * Design docs: production/gdd-integration/gdd-06-ui-card-customization.md
 * (PART A, D.5, D.6, A5 knobs, AC-23..AC-27, AC-69), plan.md P6 (reduced).
 *
 * The four CI-checkable static invariants of gdd-06 "cross-cutting notes" are
 * implemented as assertable predicates here and in `fontScale.ts`, so a knob
 * edit that breaks one fails a unit test rather than a play session.
 *
 * Pure module: no React, no I/O, no DOM.
 */

import { CONTENT_EXCHANGE_ESTIMATE, UI_KNOBS } from '../registry';
import { FONT_SCALE_STEP, themeScale, type FontSizeSetting } from './fontScale';

export { themeScale };
export type { FontSizeSetting };

// ---------------------------------------------------------------------------
// D.5 - two column layout
// ---------------------------------------------------------------------------

export interface LayoutKnobs {
  base_column_width_px: number;
  column_gutter_px: number;
}

export const DEFAULT_LAYOUT_KNOBS: LayoutKnobs = {
  base_column_width_px: UI_KNOBS.base_column_width_px,
  column_gutter_px: UI_KNOBS.column_gutter_px,
};

/** The viewport width at which 2 columns become legal for a given font step. */
export function twoColumnThresholdPx(
  setting: FontSizeSetting,
  knobs: LayoutKnobs = DEFAULT_LAYOUT_KNOBS,
): number {
  return 2 * knobs.base_column_width_px * themeScale(setting) + knobs.column_gutter_px;
}

/**
 * D.5:
 *   0 if is_touch_primary
 *   1 if (not touch) AND viewport >= 2*BASE_COLUMN_WIDTH*theme_scale + GUTTER
 *   0 otherwise
 *
 * Returns 0/1 (not a boolean) exactly as the GDD writes it, so the acceptance
 * fixtures transcribe 1:1. There is deliberately NO `if is_mobile` branch.
 */
export function twoColumnLayout(
  viewportWidthPx: number,
  setting: FontSizeSetting,
  isTouchPrimary: boolean,
  knobs: LayoutKnobs = DEFAULT_LAYOUT_KNOBS,
): 0 | 1 {
  if (isTouchPrimary) return 0;
  const width = Number(viewportWidthPx);
  if (!Number.isFinite(width)) return 0;
  return width >= twoColumnThresholdPx(setting, knobs) ? 1 : 0;
}

// ---------------------------------------------------------------------------
// D.6 - transition duration family / z-order
// ---------------------------------------------------------------------------

export type UiTier = 'banner' | 'overlay_settings' | 'overlay_card' | 'screen';

/** gdd-06 A4 D.6: `banner(1) < overlay_settings(2) < overlay_card(3) < screen(4)`. */
export const TIER_RANK: Record<UiTier, number> = {
  banner: 1,
  overlay_settings: 2,
  overlay_card: 3,
  screen: 4,
};

export const TIER_ORDER: readonly UiTier[] = [
  'banner',
  'overlay_settings',
  'overlay_card',
  'screen',
];

export interface TransitionDurations {
  banner: number;
  overlay_settings: number;
  /** Owned by the Character Card (#14), NOT independently tunable here. */
  overlay_card: number;
  screen: number;
}

export function transitionDurations(knobs = UI_KNOBS): TransitionDurations {
  return {
    banner: knobs.transition_banner_ms,
    overlay_settings: knobs.transition_settings_ms,
    overlay_card: knobs.card_transition_ms,
    screen: knobs.transition_screen_ms,
  };
}

export function durationOf(tier: UiTier, knobs = UI_KNOBS): number {
  return transitionDurations(knobs)[tier];
}

/**
 * CI INVARIANT #2 (AC-27): `banner <= settings <= card <= screen`.
 * This is a CROSS-knob invariant: every knob can sit inside its own safe range
 * while the ordering still breaks, which is exactly the bug gdd-06 B5 warns
 * about in both directions.
 */
export function transitionOrderingValid(durations: TransitionDurations = transitionDurations()): boolean {
  return (
    durations.banner <= durations.overlay_settings &&
    durations.overlay_settings <= durations.overlay_card &&
    durations.overlay_card <= durations.screen
  );
}

/** Z-order follows the same ranking as the transition family. */
export function zOrderRank(tier: UiTier): number {
  return TIER_RANK[tier];
}

export function zOrderValid(): boolean {
  return (
    TIER_RANK.banner <= TIER_RANK.overlay_settings &&
    TIER_RANK.overlay_settings <= TIER_RANK.overlay_card &&
    TIER_RANK.overlay_card <= TIER_RANK.screen
  );
}

// ---------------------------------------------------------------------------
// The other two CI-checkable static invariants
// ---------------------------------------------------------------------------

/** CI INVARIANT #1 (AC-52): `log_prefetch_threshold < log_page_size`. */
export function paginationInvariantValid(knobs = UI_KNOBS): boolean {
  return knobs.log_prefetch_threshold < knobs.log_page_size;
}

/** CI INVARIANT #4 (AC-67): `live_window_turns >= CONTENT_EXCHANGE_ESTIMATE`. */
export function liveWindowInvariantValid(
  knobs = UI_KNOBS,
  contentExchangeEstimate: number = CONTENT_EXCHANGE_ESTIMATE,
): boolean {
  return knobs.live_window_turns >= contentExchangeEstimate;
}

/** CI INVARIANT #3 (AC-69) lives in `fontScale.ts`; re-exported for one call site. */
export function fontScaleInvariantValid(steps = FONT_SCALE_STEP): boolean {
  return steps.S < steps.M && steps.M < steps.L;
}

export interface UiInvariantReport {
  pagination: boolean;
  transition_ordering: boolean;
  font_scale: boolean;
  live_window: boolean;
  all: boolean;
}

/** One call the CI job (P7) and a unit test can both use. */
export function checkUiInvariants(): UiInvariantReport {
  const pagination = paginationInvariantValid();
  const ordering = transitionOrderingValid();
  const font = fontScaleInvariantValid();
  const live = liveWindowInvariantValid();
  return {
    pagination,
    transition_ordering: ordering,
    font_scale: font,
    live_window: live,
    all: pagination && ordering && font && live,
  };
}
