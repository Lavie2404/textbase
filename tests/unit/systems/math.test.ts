/**
 * Unit tests for src-web/systems/math.ts.
 * Design docs: gdd-02 (tier derivation), gdd-03 1.4 (rounding convention),
 * production/gdd-integration/plan.md P0.
 */
import { describe, expect, it } from 'vitest';
import { clamp, roundHalfAwayFromZero, safeDiv, tierFromLevel } from '../../../src-web/systems/math';

/** Boundary fixtures: the exact values ARE the point (coding-standards.md). */
const HALF_CASES: Array<[number, number]> = [
  [0.5, 1],
  [-0.5, -1],
  [1.5, 2],
  [-1.5, -2],
  [10.5, 11],
  [-10.5, -11],
  [2.4, 2],
  [-2.4, -2],
];

describe('roundHalfAwayFromZero', () => {
  it.each(HALF_CASES)('test_round_%s_away_from_zero', (input, expected) => {
    expect(roundHalfAwayFromZero(input)).toBe(expected);
  });

  it('test_negative_half_differs_from_math_round', () => {
    expect(Math.round(-10.5)).toBe(-10);
    expect(roundHalfAwayFromZero(-10.5)).toBe(-11);
  });

  it('test_symmetric_for_equal_magnitudes', () => {
    const magnitude = 3.5;
    expect(roundHalfAwayFromZero(magnitude)).toBe(-roundHalfAwayFromZero(-magnitude));
  });

  it('test_integer_input_unchanged', () => {
    expect(roundHalfAwayFromZero(7)).toBe(7);
    expect(roundHalfAwayFromZero(-7)).toBe(-7);
    expect(roundHalfAwayFromZero(0)).toBe(0);
  });

  it('test_non_finite_passthrough', () => {
    expect(roundHalfAwayFromZero(Number.POSITIVE_INFINITY)).toBe(Number.POSITIVE_INFINITY);
    expect(Number.isNaN(roundHalfAwayFromZero(Number.NaN))).toBe(true);
  });
});

describe('clamp', () => {
  it('test_value_inside_range_unchanged', () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });

  it('test_value_below_min_returns_min', () => {
    expect(clamp(-50, -100, 100)).toBe(-50);
    expect(clamp(-150, -100, 100)).toBe(-100);
  });

  it('test_value_above_max_returns_max', () => {
    expect(clamp(150, -100, 100)).toBe(100);
  });

  it('test_bounds_are_inclusive', () => {
    expect(clamp(0.05, 0.05, 0.95)).toBe(0.05);
    expect(clamp(0.95, 0.05, 0.95)).toBe(0.95);
  });

  it('test_inverted_range_throws', () => {
    expect(() => clamp(1, 10, 0)).toThrow(RangeError);
  });
});

describe('safeDiv', () => {
  it('test_ordinary_division_is_float', () => {
    expect(safeDiv(1, 2)).toBe(0.5);
    expect(safeDiv(7, 2)).toBe(3.5);
  });

  it('test_zero_denominator_uses_floor_instead_of_infinity', () => {
    expect(safeDiv(5, 0)).toBe(5);
    expect(Number.isFinite(safeDiv(5, 0))).toBe(true);
  });

  it('test_denominator_below_floor_is_lifted', () => {
    expect(safeDiv(4, 0.25)).toBe(4);
  });

  it('test_negative_denominator_keeps_sign_when_floored', () => {
    expect(safeDiv(4, -0.25)).toBe(-4);
  });

  it('test_custom_floor_respected', () => {
    expect(safeDiv(10, 1, 5)).toBe(2);
  });

  it('test_non_positive_floor_throws', () => {
    expect(() => safeDiv(1, 1, 0)).toThrow(RangeError);
    expect(() => safeDiv(1, 1, -1)).toThrow(RangeError);
  });
});

describe('tierFromLevel', () => {
  /** gdd-02 A3: tier = floor((level-1)/10)+1. Boundary values are the point. */
  const TIER_CASES: Array<[number, number]> = [
    [1, 1],
    [9, 1],
    [10, 1],
    [11, 2],
    [20, 2],
    [21, 3],
    [25, 3],
    [100, 10],
    [101, 11],
  ];

  it.each(TIER_CASES)('test_level_%i_yields_tier_%i', (level, expected) => {
    expect(tierFromLevel(level)).toBe(expected);
  });

  it('test_tier_never_zero_for_invalid_levels', () => {
    expect(tierFromLevel(0)).toBe(1);
    expect(tierFromLevel(-5)).toBe(1);
    expect(tierFromLevel(Number.NaN)).toBe(1);
  });

  it('test_fractional_level_floors', () => {
    expect(tierFromLevel(10.9)).toBe(1);
    expect(tierFromLevel(11.9)).toBe(2);
  });
});
