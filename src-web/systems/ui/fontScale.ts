/**
 * Core UI D.5 (font scale) + plan.md decision C-3.
 *
 * Design docs: production/gdd-integration/gdd-06-ui-card-customization.md
 * (PART A, Core Rule #11, D.5, A5, AC-23/AC-69), plan.md C-3.
 *
 * DECISION C-3: the shipped app has a continuous `textScale` slider (90-140,
 * percent) inside `SettingsMenu`. The GDD mandates EXACTLY 3 discrete steps
 * `{0.875, 1.0, 1.25}`. C-3 keeps both: three presets S/M/L as the primary
 * control plus the existing slider as an "advanced" control, with a lossless
 * mapping in both directions. The binding invariant
 * `FONT_SCALE_STEP[S] < [M] < [L]` is CI-checked (AC-69).
 *
 * Font-size changes reflow IMMEDIATELY (a display parameter) - deliberately the
 * opposite of the Card's "never re-render mid-open" world-state rule.
 *
 * Pure module: no React, no I/O, no DOM.
 */

import { UI_KNOBS } from '../registry';

export type FontSizeSetting = 'S' | 'M' | 'L';
export const FONT_SIZE_SETTINGS: readonly FontSizeSetting[] = ['S', 'M', 'L'];

/** The three steps, from the registry. Never re-literalled anywhere else. */
export const FONT_SCALE_STEP: Record<FontSizeSetting, number> = {
  S: UI_KNOBS.font_scale_steps.S,
  M: UI_KNOBS.font_scale_steps.M,
  L: UI_KNOBS.font_scale_steps.L,
};

/** Player-facing labels (Vietnamese). */
export const FONT_SIZE_LABELS: Record<FontSizeSetting, string> = {
  S: 'Nhỏ',
  M: 'Vừa',
  L: 'Lớn',
};

/** The shipped slider's domain, in percent (App.tsx `SettingsMenu`, textScale). */
export const TEXT_SCALE_MIN = 90;
export const TEXT_SCALE_MAX = 140;

/** `theme_scale(setting) = FONT_SCALE_STEP[setting]`. */
export function themeScale(setting: FontSizeSetting): number {
  return FONT_SCALE_STEP[setting] ?? FONT_SCALE_STEP.M;
}

/**
 * CI INVARIANT (AC-69): exactly 3 steps, strictly increasing. `verify jointly`
 * is the point - each step can sit inside its own +/-0.125 range while the
 * ordering still breaks.
 */
export function fontScaleStepsMonotonic(
  steps: Record<FontSizeSetting, number> = FONT_SCALE_STEP,
): boolean {
  return (
    Object.keys(steps).length === 3 &&
    Number.isFinite(steps.S) &&
    Number.isFinite(steps.M) &&
    Number.isFinite(steps.L) &&
    steps.S < steps.M &&
    steps.M < steps.L
  );
}

export function assertFontScaleSteps(
  steps: Record<FontSizeSetting, number> = FONT_SCALE_STEP,
): Record<FontSizeSetting, number> {
  if (!fontScaleStepsMonotonic(steps)) {
    throw new RangeError(
      'FONT_SCALE_STEP must have exactly 3 strictly increasing steps S < M < L, got ' +
        JSON.stringify(steps),
    );
  }
  return steps;
}

/** Clamp a raw slider value into the shipped app's domain. */
export function clampTextScale(textScale: number): number {
  const value = Number(textScale);
  if (!Number.isFinite(value)) return 100;
  return value < TEXT_SCALE_MIN ? TEXT_SCALE_MIN : value > TEXT_SCALE_MAX ? TEXT_SCALE_MAX : value;
}

/** Slider percent -> raw multiplier (the advanced control's own scale factor). */
export function scaleFactorFromTextScale(textScale: number): number {
  return clampTextScale(textScale) / 100;
}

/**
 * Preset -> slider percent. `S` is `0.875 -> 87.5%`, which sits BELOW the
 * shipped slider's floor of 90, so it is clamped. The mapping stays strictly
 * increasing (90 < 100 < 125), which is what the round trip depends on.
 */
export function textScaleFromPreset(setting: FontSizeSetting): number {
  return clampTextScale(themeScale(setting) * 100);
}

/**
 * Slider percent -> nearest preset. Comparison uses the UNCLAMPED preset
 * percents (87.5 / 100 / 125) so the midpoints are 93.75 and 112.5 and the
 * round trip `preset -> slider -> preset` is the identity for all 3 presets.
 */
export function presetFromTextScale(textScale: number): FontSizeSetting {
  const value = clampTextScale(textScale);
  let best: FontSizeSetting = 'M';
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const setting of FONT_SIZE_SETTINGS) {
    const distance = Math.abs(themeScale(setting) * 100 - value);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = setting;
    }
  }
  return best;
}

/** True when the slider sits exactly on one of the three presets. */
export function isPresetTextScale(textScale: number): boolean {
  return FONT_SIZE_SETTINGS.some((setting) => textScaleFromPreset(setting) === clampTextScale(textScale));
}

export interface FontSizeState {
  /** `app_config.font_size_setting`; ABSENT until the player chooses (gdd-06 A3). */
  font_size_setting: FontSizeSetting | null;
  /** The advanced slider value the app already persists. */
  text_scale: number;
}

/**
 * gdd-06 A3: absence of `font_size_setting` triggers the S1 font-size
 * invitation, REPEATEDLY, until a choice is made (AC-63b).
 */
export function shouldShowFontSizeInvitation(state: FontSizeState): boolean {
  return state?.font_size_setting == null;
}

/** Choosing a preset writes BOTH fields so the advanced slider stays in sync. */
export function applyPreset(setting: FontSizeSetting): FontSizeState {
  return { font_size_setting: setting, text_scale: textScaleFromPreset(setting) };
}

/**
 * Moving the advanced slider keeps the preset field pointing at the nearest
 * step - the settings screen must never show "no preset selected" once the
 * player has interacted.
 */
export function applyAdvancedSlider(textScale: number): FontSizeState {
  const value = clampTextScale(textScale);
  return { font_size_setting: presetFromTextScale(value), text_scale: value };
}

/**
 * The multiplier the theme should actually apply. The advanced slider wins when
 * it is off-preset; otherwise the preset's exact GDD value is used so the three
 * canonical steps stay bit-exact.
 */
export function effectiveScale(state: FontSizeState): number {
  if (state?.font_size_setting && isPresetTextScale(state.text_scale)) {
    return themeScale(state.font_size_setting);
  }
  if (state?.text_scale == null) {
    return state?.font_size_setting ? themeScale(state.font_size_setting) : FONT_SCALE_STEP.M;
  }
  return scaleFactorFromTextScale(state.text_scale);
}
