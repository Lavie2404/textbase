/**
 * Shared fixtures for the Character Card & Identity suite (gdd-06 PART B).
 *
 * Factory functions only - no inline magic numbers in the tests themselves,
 * except where a boundary value IS the point (coding-standards.md).
 */

import { GDD_STAT_KEYS, type GddStatKey } from '../../../src-web/systems/registry';
import type { CardCharacter } from '../../../src-web/systems/card/displayedField';

/** All 12 stats set to the same value. */
export function fullStats(value = 10): Record<GddStatKey, number> {
  const out = {} as Record<GddStatKey, number>;
  for (const key of GDD_STAT_KEYS) out[key] = value;
  return out;
}

/** All 12 surface (concealment) stats set to the same value. */
export function fullSurfaceStats(value = 5): Record<string, number> {
  const out: Record<string, number> = {};
  for (const key of GDD_STAT_KEYS) out[key] = value;
  return out;
}

export function makeCharacter(overrides: Partial<CardCharacter> = {}): CardCharacter {
  return {
    char_id: 'npc_1',
    is_player: false,
    name: 'Diệp Thần',
    gender: 'Nam',
    than_phan: 'Tán tu',
    personality: 'Trầm mặc',
    appearance: 'Áo xanh bạc màu',
    backstory: 'Xuất thân vô danh',
    level: 25,
    current_exp: 300,
    stats: fullStats(),
    affinity: 0,
    titles: [],
    alive: true,
    location: 'Thanh Vân Trấn',
    ...overrides,
  };
}

export function makeProtagonist(overrides: Partial<CardCharacter> = {}): CardCharacter {
  return makeCharacter({ char_id: 'player', is_player: true, name: 'Chủ nhân công', ...overrides });
}

/** A concealed NPC with every surface stat filled (the legal activation state). */
export function makeConcealedNpc(overrides: Partial<CardCharacter> = {}): CardCharacter {
  return makeCharacter({
    concealment: {
      active: true,
      displayed: {
        name: 'Lão nhân áo xám',
        than_phan: 'Khách qua đường',
        ...fullSurfaceStats(),
      },
    },
    ...overrides,
  });
}

/** Counts calls so AC-24's "spy count = 0" assertions are literal. */
export function countingStatScore(value = 1000) {
  const spy = {
    calls: 0,
    fn: (_stats: Record<GddStatKey, number>) => {
      spy.calls += 1;
      return value;
    },
  };
  return spy;
}
