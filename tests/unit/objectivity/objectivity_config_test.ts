/**
 * Pillar 1 - the objectivity knob block: registry <-> gameConfig.js <-> validator.
 * Design doc: design/gdd/game-concept.md "Pillar 1" (243-255).
 */

import { describe, expect, it } from 'vitest';
import { GAME_CONFIG } from '../../../gameConfig.js';
import { OBJECTIVITY_KNOBS, HOSTILE_INITIATIVE_LEVEL_GAP_MAX } from '../../../src-web/systems/registry';
import {
  CONFIG_ERROR,
  SystemsConfigError,
  cloneDefaultSystemsConfig,
  validateSystemsConfig,
} from '../../../src-web/systems/configValidation';
import { systemsConfigFromGameConfig, validateGameConfig } from '../../../src-web/systems/exp/gameConfigAdapter';

function codesOf(run: () => void): string[] {
  try {
    run();
  } catch (e) {
    if (e instanceof SystemsConfigError) return e.violations.map((v) => v.code);
    throw e;
  }
  return [];
}

describe('objectivity knobs', () => {
  it('test_gameConfig_declares_every_registry_knob', () => {
    const block = (GAME_CONFIG as Record<string, any>).objectivity;
    expect(block).toBeTruthy();
    for (const key of Object.keys(OBJECTIVITY_KNOBS)) {
      expect(block[key]).toBeDefined();
    }
  });

  it('test_adapter_carries_the_gameConfig_block_into_the_systems_config', () => {
    const cfg = systemsConfigFromGameConfig();
    expect(cfg.objectivity.OVERREACH_SUCCESS_CAP_TIER1)
      .toBe((GAME_CONFIG as Record<string, any>).objectivity.OVERREACH_SUCCESS_CAP_TIER1);
    expect(cfg.objectivity.GAP_INJURY_EXEMPT_WHEN_PROVOKED).toBe(false);
  });

  it('test_shipped_config_passes_every_gate', () => {
    expect(() => validateGameConfig()).not.toThrow();
  });

  it('test_defaults_validate', () => {
    expect(() => validateSystemsConfig(cloneDefaultSystemsConfig())).not.toThrow();
  });

  it('test_provoked_exemption_defaults_off_owner_rule_is_unconditional', () => {
    expect(OBJECTIVITY_KNOBS.GAP_INJURY_EXEMPT_WHEN_PROVOKED).toBe(false);
  });

  it('test_locked_gap_constant_is_twenty_and_not_a_knob', () => {
    expect(HOSTILE_INITIATIVE_LEVEL_GAP_MAX).toBe(20);
    expect((OBJECTIVITY_KNOBS as Record<string, unknown>).HOSTILE_INITIATIVE_LEVEL_GAP_MAX).toBeUndefined();
  });
});

describe('objectivity validation rules', () => {
  it('test_non_monotonic_caps_are_rejected', () => {
    const cfg = cloneDefaultSystemsConfig();
    cfg.objectivity.OVERREACH_SUCCESS_CAP_TIER2 = 0.9;
    expect(codesOf(() => validateSystemsConfig(cfg))).toContain(CONFIG_ERROR.OBJECTIVITY_CAP_ORDER);
  });

  it('test_cap_above_one_is_rejected', () => {
    const cfg = cloneDefaultSystemsConfig();
    cfg.objectivity.OVERREACH_SUCCESS_CAP_TIER1 = 1.5;
    expect(codesOf(() => validateSystemsConfig(cfg))).toContain(CONFIG_ERROR.OBJECTIVITY_RANGE);
  });

  it('test_cap_of_zero_is_rejected', () => {
    const cfg = cloneDefaultSystemsConfig();
    cfg.objectivity.OVERREACH_SUCCESS_CAP_TIER3 = 0;
    expect(codesOf(() => validateSystemsConfig(cfg))).toContain(CONFIG_ERROR.OBJECTIVITY_RANGE);
  });

  it('test_cap_of_exactly_one_is_allowed', () => {
    const cfg = cloneDefaultSystemsConfig();
    cfg.objectivity.OVERREACH_SUCCESS_CAP_TIER1 = 1;
    expect(codesOf(() => validateSystemsConfig(cfg))).not.toContain(CONFIG_ERROR.OBJECTIVITY_RANGE);
  });

  it('test_tier_size_below_one_is_rejected', () => {
    const cfg = cloneDefaultSystemsConfig();
    cfg.objectivity.OVERREACH_TIER_SIZE = 0;
    expect(codesOf(() => validateSystemsConfig(cfg))).toContain(CONFIG_ERROR.OBJECTIVITY_RANGE);
  });

  it('test_partial_multiplier_below_one_is_rejected', () => {
    const cfg = cloneDefaultSystemsConfig();
    cfg.objectivity.OVERREACH_PARTIAL_CAP_MULT = 0.5;
    expect(codesOf(() => validateSystemsConfig(cfg))).toContain(CONFIG_ERROR.OBJECTIVITY_RANGE);
  });

  it('test_validator_reports_every_objectivity_violation_at_once', () => {
    const cfg = cloneDefaultSystemsConfig();
    cfg.objectivity.OVERREACH_SUCCESS_CAP_TIER1 = 2;
    cfg.objectivity.OVERREACH_PARTIAL_CAP_MULT = 0;
    const codes = codesOf(() => validateSystemsConfig(cfg));
    expect(codes.filter((c) => c === CONFIG_ERROR.OBJECTIVITY_RANGE).length).toBeGreaterThanOrEqual(2);
  });
});
