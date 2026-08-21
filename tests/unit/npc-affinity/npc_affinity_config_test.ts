/**
 * Data-load gates for the two P2 `gameConfig.js` blocks (sections 19 and 20).
 *
 * gdd-03 1.5 / 2.5 plus plan.md P0: a tuning constant is declared once, in
 * `gameConfig.js`, and every cross-system invariant is checked at load - never
 * with a release-stripped assert.
 */

import { describe, expect, it } from 'vitest';
import { GAME_CONFIG } from '../../../gameConfig.js';
import {
  affinityKnobsFromGameConfig,
  deathKnobsFromGameConfig,
  systemsConfigFromGameConfig,
  validateGameConfig,
} from '../../../src-web/systems/exp/gameConfigAdapter';
import { validateSystemsConfig } from '../../../src-web/systems/configValidation';
import { REQUIRED_AFFINITY_KNOBS } from '../../../src-web/systems/affinity/table';
import { REQUIRED_DEATH_KNOBS } from '../../../src-web/systems/death/deathRoll';
import { AFFINITY_KNOBS, DEATH_KNOBS, SITUATION_KNOBS } from '../../../src-web/systems/registry';

describe('gameConfig affinity block (21 knobs)', () => {
  it('test_every_required_knob_is_declared', () => {
    const knobs = affinityKnobsFromGameConfig(GAME_CONFIG as never) as unknown as Record<string, number>;
    for (const name of REQUIRED_AFFINITY_KNOBS) {
      expect(typeof knobs[name as string]).toBe('number');
    }
    expect(Object.keys(knobs)).toHaveLength(21);
  });

  it('test_values_match_the_registry_defaults', () => {
    expect(affinityKnobsFromGameConfig(GAME_CONFIG as never)).toEqual({ ...AFFINITY_KNOBS });
  });

  it('test_negative_knobs_are_stored_already_signed', () => {
    const knobs = affinityKnobsFromGameConfig(GAME_CONFIG as never);
    expect(knobs.INSULT_DELTA).toBeLessThan(0);
    expect(knobs.THREATEN_DELTA).toBeLessThan(0);
    expect(knobs.BETRAY_DELTA).toBeLessThan(0);
    expect(knobs.KILL_WITNESS_DELTA).toBeLessThan(0);
    expect(knobs.LOSS_VS_NPC_DELTA).toBeLessThan(0);
    expect(knobs.CRUELTY_REP_DELTA).toBeLessThan(0);
  });
});

describe('gameConfig death block (12 knobs)', () => {
  it('test_every_required_knob_is_declared', () => {
    const knobs = deathKnobsFromGameConfig(GAME_CONFIG as never) as unknown as Record<string, number>;
    for (const name of REQUIRED_DEATH_KNOBS) {
      expect(typeof knobs[name as string]).toBe('number');
    }
    expect(Object.keys(knobs)).toHaveLength(12);
  });

  it('test_values_match_the_registry_defaults', () => {
    expect(deathKnobsFromGameConfig(GAME_CONFIG as never)).toEqual({ ...DEATH_KNOBS });
  });
});

describe('cross-system invariants at load', () => {
  it('test_shipped_config_validates', () => {
    expect(() => validateGameConfig(GAME_CONFIG as never)).not.toThrow();
  });

  it('test_diminish_floor_must_never_be_zero', () => {
    const cfg = systemsConfigFromGameConfig(GAME_CONFIG as never);
    cfg.affinity = { ...cfg.affinity, DIMINISH_FLOOR: 0 };
    expect(() => validateSystemsConfig(cfg)).toThrow();
  });

  it('test_fatigue_window_must_cover_the_positive_social_cooldown', () => {
    const cfg = systemsConfigFromGameConfig(GAME_CONFIG as never);
    cfg.affinity = {
      ...cfg.affinity,
      FATIGUE_WINDOW_TURNS: SITUATION_KNOBS.POSITIVE_SOCIAL_COOLDOWN_TURNS - 1,
    };
    expect(() => validateSystemsConfig(cfg)).toThrow();
  });

  it('test_severity_thresholds_must_stay_ordered', () => {
    const cfg = systemsConfigFromGameConfig(GAME_CONFIG as never);
    cfg.death = { ...cfg.death, SEVERITY_MILD_THRESHOLD: 0.9 };
    expect(() => validateSystemsConfig(cfg)).toThrow();
  });

  it('test_death_roll_envelope_must_stay_ordered', () => {
    const cfg = systemsConfigFromGameConfig(GAME_CONFIG as never);
    cfg.death = { ...cfg.death, DEATH_ROLL_MIN: 0.99 };
    expect(() => validateSystemsConfig(cfg)).toThrow();
  });

  it('test_propagation_rate_must_stay_below_one', () => {
    const cfg = systemsConfigFromGameConfig(GAME_CONFIG as never);
    cfg.affinity = { ...cfg.affinity, PROPAGATION_RATE: 1 };
    expect(() => validateSystemsConfig(cfg)).toThrow();
  });
});
