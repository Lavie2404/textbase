/**
 * Core UI D.4 - minimum touch target and adjacency.
 *
 * Design docs: production/gdd-integration/gdd-06-ui-card-customization.md
 * (PART A, D.4, A5 locked constants, AC-20/21/22).
 *
 * Two groups with DIFFERENT contracts:
 *   (a) prose-embedded targets (a tapped name inside narration) - best effort,
 *       capped by the surrounding typography; may fall short of 44px and is
 *       compliant-by-exception under the WCAG "Inline" exemption.
 *   (b) standalone elements (chip, suggestion card, glyph, button) - absolute:
 *       both dimensions must reach `TOUCH_TARGET_MIN`.
 *
 * Adjacent targets must NEVER overlap: the gap term wins over the padding term.
 *
 * Pure module: no React, no I/O, no DOM.
 */

import { MIN_ADJACENT_GAP_PX, TOUCH_TARGET_MIN } from '../registry';

export { TOUCH_TARGET_MIN, MIN_ADJACENT_GAP_PX };

export interface ProseTargetInput {
  /** Rendered width of the text fragment, in CSS px. */
  w: number;
  /** Rendered height (usually the line box), in CSS px. */
  h: number;
  /** Vertical gap between this line and the next, in CSS px. */
  line_gap: number;
  /** Horizontal distance to the nearest neighbouring target, in CSS px. */
  gap_to_neighbor: number;
}

export interface HitBox {
  pad_v: number;
  pad_h: number;
  hit_width: number;
  hit_height: number;
  /** True when BOTH dimensions reached `TOUCH_TARGET_MIN`. */
  meets_minimum: boolean;
  /** True when the shortfall is legal under the inline exemption (group a). */
  compliant_by_exception: boolean;
}

/**
 * D.4 group (a):
 *   pad_v = min( max(0, TOUCH_TARGET_MIN - h)/2 , line_gap/2 )
 *   pad_h = min( max(0, TOUCH_TARGET_MIN - w)/2 , max(0, gap_to_neighbor - MIN_ADJACENT_GAP_PX)/2 )
 */
export function proseHitBox(input: ProseTargetInput): HitBox {
  const w = num(input.w);
  const h = num(input.h);
  const lineGap = num(input.line_gap);
  const gapToNeighbor = num(input.gap_to_neighbor);

  const padV = Math.min(Math.max(0, TOUCH_TARGET_MIN - h) / 2, Math.max(0, lineGap) / 2);
  const padH = Math.min(
    Math.max(0, TOUCH_TARGET_MIN - w) / 2,
    Math.max(0, gapToNeighbor - MIN_ADJACENT_GAP_PX) / 2,
  );

  const hitHeight = h + 2 * padV;
  const hitWidth = w + 2 * padH;
  const meets = hitHeight >= TOUCH_TARGET_MIN && hitWidth >= TOUCH_TARGET_MIN;

  return {
    pad_v: padV,
    pad_h: padH,
    hit_width: hitWidth,
    hit_height: hitHeight,
    meets_minimum: meets,
    compliant_by_exception: !meets,
  };
}

/** D.4 group (b): standalone elements are absolute, no exemption. */
export function standaloneTargetOk(width: number, height: number): boolean {
  return num(width) >= TOUCH_TARGET_MIN && num(height) >= TOUCH_TARGET_MIN;
}

/** The size a standalone element must be padded up to. */
export function standaloneTargetSize(
  width: number,
  height: number,
): { width: number; height: number } {
  return {
    width: Math.max(num(width), TOUCH_TARGET_MIN),
    height: Math.max(num(height), TOUCH_TARGET_MIN),
  };
}

export interface Span1D {
  start: number;
  end: number;
}

/** Two hit areas overlap when they share any horizontal extent. */
export function spansOverlap(a: Span1D, b: Span1D): boolean {
  return Math.max(a.start, b.start) < Math.min(a.end, b.end);
}

/**
 * AC-22: expanding two adjacent prose targets must never make them overlap.
 * Returns the expanded spans plus the verdict.
 */
export function expandAdjacentTargets(
  left: { x: number; w: number; h: number; line_gap: number },
  right: { x: number; w: number; h: number; line_gap: number },
): { left: Span1D; right: Span1D; overlap: boolean } {
  const gap = right.x - (left.x + left.w);
  const leftBox = proseHitBox({ w: left.w, h: left.h, line_gap: left.line_gap, gap_to_neighbor: gap });
  const rightBox = proseHitBox({
    w: right.w,
    h: right.h,
    line_gap: right.line_gap,
    gap_to_neighbor: gap,
  });
  const leftSpan: Span1D = { start: left.x - leftBox.pad_h, end: left.x + left.w + leftBox.pad_h };
  const rightSpan: Span1D = {
    start: right.x - rightBox.pad_h,
    end: right.x + right.w + rightBox.pad_h,
  };
  return { left: leftSpan, right: rightSpan, overlap: spansOverlap(leftSpan, rightSpan) };
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}
