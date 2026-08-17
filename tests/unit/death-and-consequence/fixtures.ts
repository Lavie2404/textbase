/**
 * Shared, deterministic fixtures for the Death & Consequence acceptance tests
 * (gdd-03 PART 2, 2.8 AC list).
 *
 * AC-48 is structural: every roll comes from an INJECTED rng stub, there is no
 * hidden global, and two stubs never leak into each other.
 */

import { DEATH_KNOBS } from '../../../src-web/systems/registry';
import type { DeathKnobs } from '../../../src-web/systems/death/deathRoll';
import type { CombatHandoff } from '../../../src-web/systems/types';

export const PLAYER_ID = 'player_1';
export const ENEMY_ID = 'npc_enemy';

export function knobs(overrides: Partial<DeathKnobs> = {}): DeathKnobs {
  return { ...DEATH_KNOBS, ...overrides } as DeathKnobs;
}

/** An RNG that yields the given values in order, then keeps returning the last. */
export function rngSequence(...values: number[]) {
  let index = 0;
  const fn = () => {
    const value = values[Math.min(index, values.length - 1)];
    index += 1;
    return value;
  };
  fn.calls = () => index;
  return fn as (() => number) & { calls: () => number };
}

/** An RNG that fails the test if it is ever called (spy = 0 assertions). */
export function rngNeverCalled() {
  return () => {
    throw new Error('RNG must not be called on this path');
  };
}

/**
 * Player LOSES to `ENEMY_ID`. `enemyHpAfter` / `enemyMaxHp` drive margin_ratio,
 * which is always the WINNER's in Branch A.
 */
export function lossHandoff(enemyHpAfter: number, enemyMaxHp = 100): CombatHandoff {
  return {
    battle_active: false,
    in_combat: true,
    is_spar_friendly: false,
    outcome: { type: 'loss', winner_id: ENEMY_ID, loser_id: PLAYER_ID },
    per_actor: {
      [PLAYER_ID]: { hp_after: 0, max_HP: 100 },
      [ENEMY_ID]: { hp_after: enemyHpAfter, max_HP: enemyMaxHp },
    },
  };
}

/** Player WINS. `playerHpAfter` drives the Branch B spare margin_ratio. */
export function winHandoff(playerHpAfter: number, playerMaxHp = 100): CombatHandoff {
  return {
    battle_active: false,
    in_combat: true,
    is_spar_friendly: false,
    outcome: { type: 'win', winner_id: PLAYER_ID, loser_id: ENEMY_ID },
    per_actor: {
      [PLAYER_ID]: { hp_after: playerHpAfter, max_HP: playerMaxHp },
      [ENEMY_ID]: { hp_after: 0, max_HP: 100 },
    },
  };
}

/** Base deps for `resolveDeathConsequence`; override per test. */
export function deps(affinity: Record<string, number>, rng: () => number) {
  return {
    turn: 10,
    playerId: PLAYER_ID,
    affinityOf: (id: string) => (typeof affinity[id] === 'number' ? affinity[id] : 0),
    entitiesInScope: ['npc_witness'],
    rng,
    knobs: knobs(),
    state: {},
  };
}
