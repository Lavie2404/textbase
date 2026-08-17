/**
 * Unit tests for src-web/systems/adapters/combatAdapter.ts.
 *
 * Fixtures mirror the real App.tsx shapes:
 * - `handleCombatEnd(outcome, { winningSideInfo, losingSideInfo })` (:27614)
 *   fed by `CombatLoop.checkCombatEnd` (:4088),
 * - `'FLED'` raised at :28124 with the sides deliberately swapped,
 * - `knowledge.narrativeCombatState` (:19991) for the STORY playstyle.
 *
 * Design docs: gdd-02 A7, gdd-03 1.7 / 2.7, production/gdd-integration/plan.md P0.
 */
import { describe, expect, it } from 'vitest';
import {
  COMBAT_HANDOFF_REQUIRED_FIELDS,
  COMBAT_OUTCOME_REQUIRED_FIELDS,
  PER_ACTOR_REQUIRED_FIELDS,
  toCombatHandoff,
  type AppCombatant,
  type KnowledgeView,
} from '../../../src-web/systems/adapters/combatAdapter';

// --- fixture factories ------------------------------------------------------

const PLAYER_ID = 'char_player';
const COMPANION_ID = 'char_companion';
const ENEMY_ID = 'char_enemy';
const ENEMY_ELITE_ID = 'char_enemy_elite';

function makePlayer(overrides: Partial<AppCombatant> = {}): AppCombatant {
  return {
    id: PLAYER_ID,
    isPlayer: true,
    isCompanion: false,
    hp: 40,
    maxhp: 100,
    level: 12,
    ...overrides,
  };
}

function makeCompanion(overrides: Partial<AppCombatant> = {}): AppCombatant {
  return {
    id: COMPANION_ID,
    isPlayer: false,
    isCompanion: true,
    hp: 25,
    maxhp: 80,
    level: 10,
    ...overrides,
  };
}

function makeEnemy(overrides: Partial<AppCombatant> = {}): AppCombatant {
  return {
    id: ENEMY_ID,
    isPlayer: false,
    isCompanion: false,
    hp: 0,
    maxhp: 60,
    level: 11,
    ...overrides,
  };
}

function makeKnowledge(characters: AppCombatant[] = []): KnowledgeView {
  return {
    characters,
    narrativeCombatState: { isActive: false, combatants: [] },
  };
}

// --- tests ------------------------------------------------------------------

describe('toCombatHandoff - lethal victory', () => {
  const input = {
    outcome: 'VICTORY' as const,
    combatType: 'Lethal' as const,
    data: {
      winningSideInfo: [makePlayer(), makeCompanion()],
      losingSideInfo: [makeEnemy()],
    },
  };

  it('test_victory_maps_to_win', () => {
    expect(toCombatHandoff(input, makeKnowledge()).outcome.type).toBe('win');
  });

  it('test_victory_winner_is_the_player_character', () => {
    expect(toCombatHandoff(input, makeKnowledge()).outcome.winner_id).toBe(PLAYER_ID);
  });

  it('test_victory_loser_is_the_enemy', () => {
    expect(toCombatHandoff(input, makeKnowledge()).outcome.loser_id).toBe(ENEMY_ID);
  });

  it('test_battle_is_not_active_on_the_final_turn_but_turn_is_in_combat', () => {
    const handoff = toCombatHandoff(input, makeKnowledge());
    expect(handoff.battle_active).toBe(false);
    expect(handoff.in_combat).toBe(true);
  });

  it('test_lethal_combat_is_not_spar_friendly', () => {
    expect(toCombatHandoff(input, makeKnowledge()).is_spar_friendly).toBe(false);
  });

  it('test_per_actor_covers_both_sides_with_post_combat_hp', () => {
    const handoff = toCombatHandoff(input, makeKnowledge());
    expect(Object.keys(handoff.per_actor).sort()).toEqual(
      [PLAYER_ID, COMPANION_ID, ENEMY_ID].sort(),
    );
    expect(handoff.per_actor[PLAYER_ID].hp_after).toBe(40);
    expect(handoff.per_actor[ENEMY_ID].hp_after).toBe(0);
  });

  it('test_negative_hp_is_floored_to_zero', () => {
    const handoff = toCombatHandoff(
      {
        ...input,
        data: {
          winningSideInfo: [makePlayer()],
          losingSideInfo: [makeEnemy({ hp: -37 })],
        },
      },
      makeKnowledge(),
    );
    expect(handoff.per_actor[ENEMY_ID].hp_after).toBe(0);
  });

  it('test_strongest_enemy_is_the_designated_loser', () => {
    const handoff = toCombatHandoff(
      {
        ...input,
        data: {
          winningSideInfo: [makePlayer()],
          losingSideInfo: [makeEnemy(), makeEnemy({ id: ENEMY_ELITE_ID, level: 30 })],
        },
      },
      makeKnowledge(),
    );
    expect(handoff.outcome.loser_id).toBe(ENEMY_ELITE_ID);
  });

  it('test_enemy_pick_is_deterministic_on_level_ties', () => {
    const a = makeEnemy({ id: 'char_b', level: 11 });
    const b = makeEnemy({ id: 'char_a', level: 11 });
    const first = toCombatHandoff(
      { ...input, data: { winningSideInfo: [makePlayer()], losingSideInfo: [a, b] } },
      makeKnowledge(),
    );
    const second = toCombatHandoff(
      { ...input, data: { winningSideInfo: [makePlayer()], losingSideInfo: [b, a] } },
      makeKnowledge(),
    );
    expect(first.outcome.loser_id).toBe('char_a');
    expect(second.outcome.loser_id).toBe('char_a');
  });
});

describe('toCombatHandoff - lethal defeat', () => {
  const input = {
    outcome: 'DEFEAT' as const,
    combatType: 'Lethal' as const,
    data: {
      winningSideInfo: [makeEnemy({ hp: 22 })],
      losingSideInfo: [makePlayer({ hp: 0 })],
    },
  };

  it('test_defeat_maps_to_loss_from_the_player_perspective', () => {
    expect(toCombatHandoff(input, makeKnowledge()).outcome.type).toBe('loss');
  });

  it('test_defeat_winner_is_the_enemy_and_loser_is_the_player', () => {
    const handoff = toCombatHandoff(input, makeKnowledge());
    expect(handoff.outcome.winner_id).toBe(ENEMY_ID);
    expect(handoff.outcome.loser_id).toBe(PLAYER_ID);
  });
});

describe('toCombatHandoff - flee (assumption A1)', () => {
  // App.tsx :28124 puts the ENEMY party in `winningSideInfo` on a successful flee.
  const input = {
    outcome: 'FLED' as const,
    combatType: 'Lethal' as const,
    data: {
      winningSideInfo: [makeEnemy({ hp: 55 })],
      losingSideInfo: [makePlayer({ hp: 18 })],
    },
  };

  it('test_flee_maps_to_flee_type', () => {
    expect(toCombatHandoff(input, makeKnowledge()).outcome.type).toBe('flee');
  });

  it('test_flee_designates_no_winner_or_loser', () => {
    const handoff = toCombatHandoff(input, makeKnowledge());
    expect(handoff.outcome.winner_id).toBeNull();
    expect(handoff.outcome.loser_id).toBeNull();
  });

  it('test_flee_still_reports_per_actor_hp', () => {
    const handoff = toCombatHandoff(input, makeKnowledge());
    expect(handoff.per_actor[PLAYER_ID].hp_after).toBe(18);
    expect(handoff.per_actor[ENEMY_ID].hp_after).toBe(55);
  });
});

describe('toCombatHandoff - sparring, sandbox, pvp (assumptions A3/A4)', () => {
  it('test_sparring_win_is_spar_friendly', () => {
    const handoff = toCombatHandoff(
      {
        outcome: 'VICTORY',
        combatType: 'Sparring',
        data: { winningSideInfo: [makePlayer()], losingSideInfo: [makeEnemy()] },
      },
      makeKnowledge(),
    );
    expect(handoff.is_spar_friendly).toBe(true);
    expect(handoff.outcome.type).toBe('win');
  });

  it('test_sandbox_produces_no_outcome', () => {
    const handoff = toCombatHandoff(
      {
        outcome: 'VICTORY',
        combatType: 'Sandbox',
        data: { winningSideInfo: [makePlayer()], losingSideInfo: [makeEnemy()] },
      },
      makeKnowledge(),
    );
    expect(handoff.is_spar_friendly).toBe(true);
    expect(handoff.outcome.type).toBe('none');
    expect(handoff.outcome.winner_id).toBeNull();
  });

  it('test_pvp_is_spar_friendly', () => {
    const handoff = toCombatHandoff(
      {
        outcome: 'DEFEAT',
        combatType: 'PvP',
        data: { winningSideInfo: [makeEnemy({ hp: 5 })], losingSideInfo: [makePlayer({ hp: 0 })] },
      },
      makeKnowledge(),
    );
    expect(handoff.is_spar_friendly).toBe(true);
  });
});

describe('toCombatHandoff - battle in progress', () => {
  it('test_live_loop_reports_battle_active', () => {
    const handoff = toCombatHandoff(
      {
        activeCombatLoop: {
          combatType: 'Lethal',
          allCombatants: [makePlayer(), makeEnemy({ hp: 30 })],
        },
        gameMode: 'COMBAT',
      },
      makeKnowledge(),
    );
    expect(handoff.battle_active).toBe(true);
    expect(handoff.in_combat).toBe(true);
    expect(handoff.outcome.type).toBe('none');
    expect(handoff.per_actor[ENEMY_ID].hp_after).toBe(30);
  });

  it('test_live_loop_combat_type_drives_spar_flag', () => {
    const handoff = toCombatHandoff(
      {
        activeCombatLoop: { combatType: 'Sparring', allCombatants: [makePlayer()] },
        gameMode: 'COMBAT',
      },
      makeKnowledge(),
    );
    expect(handoff.is_spar_friendly).toBe(true);
  });
});

describe('toCombatHandoff - narrative combat (STORY playstyle)', () => {
  const knowledge: KnowledgeView = {
    characters: [makePlayer({ hp: 70 }), makeEnemy({ hp: 45 }), { id: 'char_bystander', hp: 90, maxhp: 90 }],
    narrativeCombatState: { isActive: true, combatants: [PLAYER_ID, ENEMY_ID] },
  };

  it('test_narrative_combat_is_battle_active', () => {
    const handoff = toCombatHandoff({ gameMode: 'EXPLORATION' }, knowledge);
    expect(handoff.battle_active).toBe(true);
    expect(handoff.in_combat).toBe(true);
  });

  it('test_narrative_combat_includes_only_listed_combatants', () => {
    const handoff = toCombatHandoff({ gameMode: 'EXPLORATION' }, knowledge);
    expect(Object.keys(handoff.per_actor).sort()).toEqual([PLAYER_ID, ENEMY_ID].sort());
  });

  it('test_narrative_combat_is_lethal', () => {
    expect(toCombatHandoff({ gameMode: 'EXPLORATION' }, knowledge).is_spar_friendly).toBe(false);
  });

  it('test_inactive_narrative_state_yields_no_combat', () => {
    const handoff = toCombatHandoff({ gameMode: 'EXPLORATION' }, makeKnowledge([makePlayer()]));
    expect(handoff.battle_active).toBe(false);
    expect(handoff.in_combat).toBe(false);
  });
});

describe('toCombatHandoff - degenerate inputs', () => {
  it('test_no_input_yields_inert_handoff', () => {
    const handoff = toCombatHandoff(null, null);
    expect(handoff.battle_active).toBe(false);
    expect(handoff.in_combat).toBe(false);
    expect(handoff.outcome.type).toBe('none');
    expect(handoff.per_actor).toEqual({});
  });

  it('test_combat_mode_without_loop_still_counts_as_in_combat', () => {
    expect(toCombatHandoff({ gameMode: 'COMBAT' }, makeKnowledge()).in_combat).toBe(true);
  });

  it('test_missing_maxhp_falls_back_to_knowledge_then_to_one', () => {
    const knowledge = makeKnowledge([{ id: ENEMY_ID, maxhp: 64 }]);
    const handoff = toCombatHandoff(
      {
        outcome: 'VICTORY',
        data: {
          winningSideInfo: [{ id: PLAYER_ID, isPlayer: true, hp: 10 }],
          losingSideInfo: [{ id: ENEMY_ID, hp: 0 }],
        },
      },
      knowledge,
    );
    expect(handoff.per_actor[ENEMY_ID].max_HP).toBe(64);
    expect(handoff.per_actor[PLAYER_ID].max_HP).toBe(1);
  });

  it('test_max_hp_is_always_positive', () => {
    const handoff = toCombatHandoff(
      {
        outcome: 'DEFEAT',
        data: {
          winningSideInfo: [makeEnemy({ maxhp: 0 })],
          losingSideInfo: [makePlayer({ maxhp: -5 })],
        },
      },
      makeKnowledge(),
    );
    for (const actor of Object.values(handoff.per_actor)) {
      expect(actor.max_HP).toBeGreaterThan(0);
    }
  });

  it('test_empty_sides_do_not_invent_ids', () => {
    const handoff = toCombatHandoff(
      { outcome: 'VICTORY', data: { winningSideInfo: [], losingSideInfo: [] } },
      makeKnowledge(),
    );
    expect(handoff.outcome.winner_id).toBeNull();
    expect(handoff.outcome.loser_id).toBeNull();
    expect(handoff.per_actor).toEqual({});
  });
});

describe('schema drift guard', () => {
  // gdd-02 A8 records a real `battle_result` vs `outcome` naming drift. These
  // assertions fail loudly if the hand-off shape is ever renamed or trimmed.
  const handoff = toCombatHandoff(
    {
      outcome: 'VICTORY',
      combatType: 'Lethal',
      data: { winningSideInfo: [makePlayer()], losingSideInfo: [makeEnemy()] },
    },
    makeKnowledge(),
  );

  it('test_handoff_exposes_every_required_field', () => {
    for (const field of COMBAT_HANDOFF_REQUIRED_FIELDS) {
      expect(handoff).toHaveProperty(field);
    }
  });

  it('test_handoff_has_no_extra_fields', () => {
    expect(Object.keys(handoff).sort()).toEqual([...COMBAT_HANDOFF_REQUIRED_FIELDS].sort());
  });

  it('test_field_is_named_outcome_not_battle_result', () => {
    expect(handoff).not.toHaveProperty('battle_result');
    expect(handoff).toHaveProperty('outcome');
  });

  it('test_outcome_exposes_every_required_field', () => {
    expect(Object.keys(handoff.outcome).sort()).toEqual(
      [...COMBAT_OUTCOME_REQUIRED_FIELDS].sort(),
    );
  });

  it('test_per_actor_entries_expose_every_required_field', () => {
    for (const actor of Object.values(handoff.per_actor)) {
      expect(Object.keys(actor).sort()).toEqual([...PER_ACTOR_REQUIRED_FIELDS].sort());
    }
  });

  it('test_outcome_type_stays_within_the_declared_union', () => {
    const allowed = ['win', 'loss', 'flee', 'draw', 'none'];
    expect(allowed).toContain(handoff.outcome.type);
  });

  it('test_adapter_does_not_mutate_knowledge', () => {
    const knowledge = makeKnowledge([makePlayer(), makeEnemy()]);
    const before = JSON.stringify(knowledge);
    toCombatHandoff(
      {
        outcome: 'VICTORY',
        data: { winningSideInfo: [makePlayer()], losingSideInfo: [makeEnemy()] },
      },
      knowledge,
    );
    expect(JSON.stringify(knowledge)).toBe(before);
  });
});
