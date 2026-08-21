/**
 * NPC Affinity - D.5 propagation, D.6 per-turn pipeline, attitude bands and the
 * deep-hostility flag.
 *
 * AC coverage (gdd-03 PART 1, 1.8): AC-01, AC-02, AC-03, AC-05, AC-06, AC-10,
 * AC-11, AC-18, AC-19, AC-19b, AC-20, AC-21, AC-22, AC-24, AC-25 (adapted),
 * AC-27, AC-30, AC-31, AC-32, AC-33, AC-35, AC-36, AC-37 (partial).
 */

import { describe, expect, it } from 'vitest';
import { resolveTurnAffinity } from '../../../src-web/systems/affinity/resolveTurnAffinity';
import {
  ATTITUDE_BAND_RANGES,
  attitudeBand,
  attitudeDescriptor,
  attitudeDirection,
  bandCrossed,
  bandCrossingMessage,
  isDeepHostile,
} from '../../../src-web/systems/affinity/bands';
import {
  propagationAllowed,
  propagationContributions,
} from '../../../src-web/systems/affinity/propagate';
import { emptyAffinityState, linkedNpcs, linkStrength } from '../../../src-web/systems/affinity/state';
import { entityIdFromField, FIELD_PREFIX_AFFINITY_DELTA } from '../../../src-web/systems/types';
import { DEEP_HOSTILITY_THRESHOLD } from '../../../src-web/systems/registry';
import { AC20, affinityLookup, event, knobs, MVP_SEED, PLAYER_ID, stateWithLinks } from './fixtures';

const K = knobs();

function resolve(
  events: ReturnType<typeof event>[],
  affinity: Record<string, number>,
  options: { turn?: number; state?: ReturnType<typeof emptyAffinityState>; alive?: (id: string) => boolean; tracked?: (id: string) => boolean } = {},
) {
  return resolveTurnAffinity({
    turn: options.turn ?? 1,
    events,
    knobs: K,
    state: options.state ?? emptyAffinityState(),
    affinityOf: affinityLookup(affinity),
    aliveOf: options.alive,
    isTrackedNpc: options.tracked,
  });
}

describe('attitude bands and deep hostility (AC-06, AC-33, AC-35)', () => {
  it('test_band_boundaries_are_exact', () => {
    expect(attitudeBand(-100)).toBe('Thù địch sâu sắc');
    expect(attitudeBand(-80)).toBe('Thù địch sâu sắc');
    expect(attitudeBand(-79)).toBe('Thù địch');
    expect(attitudeBand(-40)).toBe('Thù địch');
    expect(attitudeBand(-39)).toBe('Lạnh nhạt');
    expect(attitudeBand(-10)).toBe('Lạnh nhạt');
    expect(attitudeBand(-9)).toBe('Trung lập');
    expect(attitudeBand(0)).toBe('Trung lập');
    expect(attitudeBand(9)).toBe('Trung lập');
    expect(attitudeBand(10)).toBe('Thiện cảm');
    expect(attitudeBand(39)).toBe('Thiện cảm');
    expect(attitudeBand(40)).toBe('Thân thiết');
    expect(attitudeBand(79)).toBe('Thân thiết');
    expect(attitudeBand(80)).toBe('Tri kỷ');
    expect(attitudeBand(100)).toBe('Tri kỷ');
  });

  it('test_exactly_seven_bands_exist', () => {
    expect(ATTITUDE_BAND_RANGES).toHaveLength(7);
  });

  it('test_deep_hostility_is_inclusive_at_minus_eighty', () => {
    // AC-06: -79 / -80 / -81 / -100 -> false / true / true / true.
    expect(isDeepHostile(-79)).toBe(false);
    expect(isDeepHostile(-80)).toBe(true);
    expect(isDeepHostile(-81)).toBe(true);
    expect(isDeepHostile(-100)).toBe(true);
    expect(DEEP_HOSTILITY_THRESHOLD).toBe(-80);
  });

  it('test_redemption_clears_the_flag_at_minus_seventynine', () => {
    // AC-33: full +15 save_life at -80 (positive deltas are undiminished below 0).
    const result = resolve([event('save_life', 'n1')], { n1: -80 });
    const change = result.changes[0];
    expect(change.locked_delta).toBe(15);
    expect(change.after).toBe(-65);
    expect(isDeepHostile(change.after)).toBe(false);
    expect(isDeepHostile(-79)).toBe(false);
  });

  it('test_direction_and_descriptor_carry_no_digits', () => {
    expect(attitudeDirection(10, 20)).toBe('đang ấm lên');
    expect(attitudeDirection(20, 10)).toBe('đang lạnh đi');
    expect(attitudeDirection(10, 10)).toBe('không đổi');
    const descriptor = attitudeDescriptor(-30, -35);
    expect(descriptor).toBe('Lạnh nhạt, đang lạnh đi');
    expect(/\d/.test(descriptor)).toBe(false);
  });

  it('test_band_crossing_message_only_fires_on_a_crossing', () => {
    expect(bandCrossed(9, 10)).toBe(true);
    expect(bandCrossed(10, 11)).toBe(false);
    expect(bandCrossingMessage('Lão Trương', 10, 11)).toBeNull();
    expect(bandCrossingMessage('Lão Trương', 9, 10)).toContain('Thiện cảm');
  });

  it('test_mvp_seed_maps_to_the_expected_bands', () => {
    // AC-01: one hostile, one >= +60, one neutral.
    expect(attitudeBand(MVP_SEED.npc_thu_dich)).toBe('Thù địch sâu sắc');
    expect(attitudeBand(MVP_SEED.npc_hao_cam)).toBe('Thân thiết');
    expect(attitudeBand(MVP_SEED.npc_trung_lap)).toBe('Trung lập');
  });
});

describe('D.5 propagation (AC-05, AC-18, AC-19, AC-19b, AC-32)', () => {
  const links = stateWithLinks(AC20.links);
  const ctx = {
    knobs: K,
    links: links.links,
    affinityOf: affinityLookup(AC20.affinity),
  };

  it('test_gate_requires_severity_at_least_three', () => {
    // AC-05: insult (severity 2) does not propagate, threaten (3) does.
    expect(propagationAllowed(event('insult', AC20.victim, { witnesses: ['w'] }), -8, ctx)).toBe(false);
    expect(propagationAllowed(event('threaten', AC20.victim, { witnesses: ['w'] }), -12, ctx)).toBe(true);
  });

  it('test_gate_requires_a_known_perpetrator', () => {
    expect(propagationAllowed(event('kill_witnessed', AC20.victim, { witnesses: [] }), -25, ctx)).toBe(false);
    expect(propagationAllowed(event('kill_witnessed', AC20.victim, { witnesses: ['w'] }), -25, ctx)).toBe(true);
  });

  it('test_positive_events_never_propagate', () => {
    expect(propagationAllowed(event('gift', AC20.victim), 5, ctx)).toBe(false);
  });

  it('test_anchor_values_including_sign_inversion', () => {
    // AC-18: friend -8.75 - 2; enemy +7.5 diminished - 2 (sign flips on link < 0).
    const contributions = propagationContributions(
      event('kill_witnessed', AC20.victim, { witnesses: [AC20.witness] }),
      -25,
      ctx,
    );
    expect(contributions[AC20.friend]).toBeCloseTo(-10.75, 10);
    expect(contributions[AC20.enemy]).toBeCloseTo(5.446, 3);
  });

  it('test_witnesses_are_excluded_from_the_linked_loop', () => {
    // AC-19: no double counting.
    const withWitnessLinked = stateWithLinks([...AC20.links, [AC20.victim, AC20.witness, 0.5]]);
    const contributions = propagationContributions(
      event('kill_witnessed', AC20.victim, { witnesses: [AC20.witness] }),
      -25,
      { ...ctx, links: withWitnessLinked.links },
    );
    expect(contributions[AC20.witness]).toBeUndefined();
  });

  it('test_dead_linked_npc_is_skipped', () => {
    // AC-32.
    const contributions = propagationContributions(
      event('kill_witnessed', AC20.victim, { witnesses: [AC20.witness] }),
      -25,
      { ...ctx, aliveOf: (id: string) => id !== AC20.friend },
    );
    expect(contributions[AC20.friend]).toBeUndefined();
    expect(contributions[AC20.enemy]).toBeDefined();
  });

  it('test_saturated_living_victim_blocks_propagation', () => {
    // AC-19b: the exploit that farms positive affinity from a victim's enemies.
    const saturated = { ...AC20.affinity, [AC20.victim]: -100 };
    expect(
      propagationAllowed(event('threaten', AC20.victim, { witnesses: ['w'] }), -12, {
        ...ctx,
        affinityOf: affinityLookup(saturated),
      }),
    ).toBe(false);
  });

  it('test_kills_are_exempt_from_the_saturation_gate', () => {
    const saturated = { ...AC20.affinity, [AC20.victim]: -100 };
    expect(
      propagationAllowed(event('kill_witnessed', AC20.victim, { witnesses: ['w'] }), -25, {
        ...ctx,
        affinityOf: affinityLookup(saturated),
      }),
    ).toBe(true);
  });

  it('test_link_graph_helpers_are_stable_and_default_to_zero', () => {
    expect(linkedNpcs(links.links, AC20.victim)).toEqual([AC20.friend, AC20.enemy].sort());
    expect(linkStrength(links.links, AC20.victim, AC20.friend)).toBe(0.7);
    expect(linkStrength(links.links, AC20.victim, 'unknown')).toBe(0);
  });

  it('test_only_one_hop_is_ever_read', () => {
    // C is linked to B; E is linked to C but NOT to B -> E receives nothing.
    const graph = stateWithLinks([...AC20.links, [AC20.friend, 'npc_e', 0.9]]);
    const contributions = propagationContributions(
      event('kill_witnessed', AC20.victim, { witnesses: [AC20.witness] }),
      -25,
      { ...ctx, links: graph.links },
    );
    expect(contributions.npc_e).toBeUndefined();
  });
});

describe('D.6 per-turn pipeline (AC-02, AC-10, AC-20, AC-21, AC-22, AC-24)', () => {
  it('test_no_event_returns_no_fields', () => {
    const result = resolve([], MVP_SEED);
    expect(result.fields).toEqual({});
    expect(result.changes).toEqual([]);
  });

  it('test_ac20_regression_fixture_locks_three_fields_in_one_result', () => {
    const result = resolve(
      [event('kill_witnessed', AC20.victim, { witnesses: [AC20.witness] })],
      AC20.affinity,
      { state: stateWithLinks(AC20.links) },
    );
    expect(result.fields).toEqual({
      affinity_delta_npc_a: -27,
      affinity_delta_npc_c: -11,
      affinity_delta_npc_d: 5,
    });
    const after = Object.fromEntries(result.changes.map((c) => [c.npc_id, c.after]));
    expect(after).toEqual({ npc_a: -17, npc_c: 29, npc_d: 25 });
  });

  it('test_every_locked_field_is_an_integer', () => {
    const result = resolve(
      [event('kill_witnessed', AC20.victim, { witnesses: [AC20.witness] })],
      AC20.affinity,
      { state: stateWithLinks(AC20.links) },
    );
    for (const value of Object.values(result.fields)) {
      expect(Number.isInteger(value)).toBe(true);
    }
  });

  it('test_entity_id_parses_back_out_of_the_field_name', () => {
    // AC-36: World Memory derives entity_id from the field name.
    const result = resolve(
      [event('kill_witnessed', AC20.victim, { witnesses: [AC20.witness] })],
      AC20.affinity,
      { state: stateWithLinks(AC20.links) },
    );
    const ids = Object.keys(result.fields).map((f) =>
      entityIdFromField(FIELD_PREFIX_AFFINITY_DELTA, f),
    );
    expect(ids.sort()).toEqual(['npc_a', 'npc_c', 'npc_d']);
  });

  it('test_witnessless_kill_writes_nothing_at_all', () => {
    // AC-24: the perfect crime.
    const result = resolve(
      [event('kill_witnessed', AC20.victim, { witnesses: [] })],
      AC20.affinity,
      { state: stateWithLinks(AC20.links) },
    );
    expect(result.fields).toEqual({});
    expect(result.skipped[0].reason).toBe('kill_without_witnesses');
  });

  it('test_round_half_away_from_zero_is_applied_once_per_npc', () => {
    // AC-21: -10.75 -> -11 (not -10), and the rounding happens after summing.
    const result = resolve(
      [event('kill_witnessed', AC20.victim, { witnesses: [AC20.witness] })],
      AC20.affinity,
      { state: stateWithLinks(AC20.links) },
    );
    expect(result.fields.affinity_delta_npc_c).toBe(-11);
  });

  it('test_zero_locked_delta_writes_no_field_but_still_moves_the_streak', () => {
    // AC-22: gift at +100 rounds to 0 delta, yet the streak advances.
    const result = resolve([event('gift', 'n1')], { n1: 100 });
    expect(result.fields).toEqual({});
    expect(result.state.streaks.n1.gift.streak).toBe(1);
  });

  it('test_clamp_never_lets_a_locked_delta_escape_the_scale', () => {
    // AC-27: at +95 a +8 propagation locks +5.
    const result = resolve([event('save_life', 'n1')], { n1: 95 });
    const change = result.changes[0];
    expect(change.after).toBeLessThanOrEqual(100);
    expect(change.locked_delta).toBe(change.after - change.before);
  });

  it('test_untracked_opponent_returns_no_fields_and_no_error', () => {
    // AC-31.
    const result = resolve(
      [event('combat_win_vs_npc', 'beast_1', { margin_ratio: 0.5 })],
      {},
      { tracked: (id) => id !== 'beast_1' },
    );
    expect(result.fields).toEqual({});
    expect(result.skipped[0].reason).toBe('untracked_target');
  });

  it('test_no_preset_npc_starts_at_zero_then_applies_the_delta', () => {
    // AC-30.
    const result = resolve([event('gift', 'brand_new')], {});
    expect(result.fields.affinity_delta_brand_new).toBe(5);
    expect(result.changes[0].before).toBe(0);
  });

  it('test_no_decay_over_a_hundred_empty_turns', () => {
    // AC-03: +50 is unchanged after 100 turns with no events.
    let state = emptyAffinityState();
    for (let turn = 1; turn <= 100; turn += 1) {
      const result = resolve([], { n1: 50 }, { turn, state });
      state = result.state;
      expect(result.fields).toEqual({});
    }
  });

  it('test_multiple_contributions_to_one_npc_produce_exactly_one_field', () => {
    // Witness delta + cruelty are summed before cap/round/clamp.
    const result = resolve(
      [event('kill_witnessed', AC20.victim, { witnesses: [AC20.witness] })],
      AC20.affinity,
      { state: stateWithLinks(AC20.links) },
    );
    const witnessFields = Object.keys(result.fields).filter((f) => f.endsWith(AC20.witness));
    expect(witnessFields).toHaveLength(1);
  });

  it('test_positive_cap_applies_across_stacked_events_in_one_turn', () => {
    // AC-17 at pipeline level: two save_life (+15 each) cap at +20.
    const result = resolve(
      [event('save_life', 'n1'), event('save_life', 'n1')],
      { n1: 0 },
    );
    expect(result.fields.affinity_delta_n1).toBe(20);
  });

  it('test_fatigue_applies_between_two_identical_events_in_the_same_turn', () => {
    // The second small_help of the turn is already fatigued (+3 then +2.55).
    const result = resolve([event('small_help', 'n1'), event('small_help', 'n1')], { n1: 0 });
    expect(result.fields.affinity_delta_n1).toBe(6); // 3 + 2.55 = 5.55 -> 6
  });

  it('test_start_of_turn_affinity_is_used_for_every_event_of_the_turn', () => {
    // Both gifts are diminished against A_before = 90, not against a moving value.
    const result = resolve([event('gift', 'n1'), event('gift', 'n1')], { n1: 90 });
    expect(result.changes[0].before).toBe(90);
  });

  it('test_song_tu_relationship_ends_when_the_partner_is_killed', () => {
    // [SONG-TU-ADAPT] AC-25: the only surviving coupling.
    const result = resolveTurnAffinity({
      turn: 5,
      events: [event('kill_witnessed', 'npc_partner', { witnesses: ['w1'] })],
      knobs: K,
      state: emptyAffinityState(),
      affinityOf: affinityLookup({ npc_partner: 80, w1: 0 }),
      songTuActiveNpcIds: ['npc_partner'],
    });
    expect(result.song_tu_ended_npc_ids).toEqual(['npc_partner']);
  });

  it('test_state_is_never_mutated_in_place', () => {
    const state = emptyAffinityState();
    const result = resolve([event('gift', 'n1')], { n1: 0 }, { state });
    expect(state.streaks).toEqual({});
    expect(result.state).not.toBe(state);
  });

  it('test_property_locked_delta_keeps_affinity_in_range_over_1000_combos', () => {
    // AC-11: seeded, deterministic sweep - no Math.random anywhere.
    let seed = 20260817;
    const next = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    const types = ['gift', 'small_help', 'save_life', 'insult', 'threaten', 'betray'] as const;
    for (let i = 0; i < 1000; i += 1) {
      const before = Math.round(next() * 200) - 100;
      const type = types[Math.floor(next() * types.length)];
      const result = resolve([event(type, 'n1')], { n1: before }, { turn: i + 1 });
      const delta = result.fields.affinity_delta_n1 ?? 0;
      expect(before + delta).toBeGreaterThanOrEqual(-100);
      expect(before + delta).toBeLessThanOrEqual(100);
      expect(Number.isInteger(delta)).toBe(true);
    }
  });
});
