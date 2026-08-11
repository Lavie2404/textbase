extends GutTest
## D.1 — effective stats (realm suppression, gear gap, crippled layer).
## Covers AC-12, AC-13, AC-13b, AC-03.

const Factory := preload("res://tests/unit/combat/combat_test_factory.gd")

var _tuning: CombatTuning


func before_each() -> void:
	_tuning = CombatTuning.new()


func test_effective_stat_typical_case_matches_gdd_example() -> void:
	# AC-12: tier 3 vs 6, weapon 5, skill 4, base ATK 50.
	assert_eq(CombatFormulas.gap_realm(3, 6), 3)
	assert_eq(CombatFormulas.gap_gear(5, 3, 4), 2)
	assert_almost_eq(CombatFormulas.layer_mult(3, _tuning), 0.55, 1e-9)
	assert_almost_eq(CombatFormulas.layer_mult(2, _tuning), 0.7, 1e-9)
	assert_almost_eq(
		CombatFormulas.total_penalty_multiplier(3, 2, false, _tuning), 0.385, 1e-9)
	assert_almost_eq(
		CombatFormulas.effective_stat(50.0, 3, 2, false, _tuning), 19.25, 1e-9)


func test_extreme_stacked_gaps_clamp_to_floor_total() -> void:
	# AC-13: each layer floors at 0.1, product 0.01 clamps UP to FLOOR_TOTAL.
	assert_almost_eq(
		CombatFormulas.total_penalty_multiplier(10, 10, false, _tuning), 0.05, 1e-9)
	assert_almost_eq(
		CombatFormulas.effective_stat(50.0, 10, 10, false, _tuning), 2.5, 1e-9)


func test_effective_stat_never_zero_or_negative_across_extreme_gaps() -> void:
	# AC-13 (parameterized): no gap combination drives a positive base to <= 0.
	var gap_pairs: Array = [[0, 0], [5, 0], [0, 7], [3, 15], [20, 20], [100, 100]]
	for pair: Array in gap_pairs:
		for crippled: bool in [false, true]:
			var value: float = CombatFormulas.effective_stat(
				50.0, int(pair[0]), int(pair[1]), crippled, _tuning)
			assert_gt(value, 0.0,
				"gaps %s crippled=%s must stay > 0" % [str(pair), str(crippled)])


func test_crippled_layer_alone_applies_exact_multiplier() -> void:
	# AC-13b: crippled with no other gaps -> exactly CRIPPLED_PENALTY_MULT.
	assert_almost_eq(
		CombatFormulas.total_penalty_multiplier(0, 0, true, _tuning), 0.85, 1e-9)


func test_crippled_layer_stacked_with_extreme_gaps_still_floors_at_total() -> void:
	# AC-13b boundary: 3 worst layers still clamp to FLOOR_TOTAL, same as AC-13.
	assert_almost_eq(
		CombatFormulas.total_penalty_multiplier(10, 10, true, _tuning), 0.05, 1e-9)
	assert_almost_eq(
		CombatFormulas.effective_stat(50.0, 10, 10, true, _tuning), 2.5, 1e-9)


func test_skill_tier_recomputed_per_exchange_not_cached() -> void:
	# AC-03: same character, different skill tiers across exchanges -> the
	# effective value follows the CURRENT exchange's skill_tier_used.
	var c: Combatant = Factory.combatant("c", {Combatant.STAT_ATK: 50.0}, 3, 1)
	var opponent: Combatant = Factory.combatant("o", {}, 3, 1)
	var with_tier_2: float = CombatFormulas.effective_stat_for(
		c, Combatant.STAT_ATK, opponent, 2, _tuning)
	var with_tier_4: float = CombatFormulas.effective_stat_for(
		c, Combatant.STAT_ATK, opponent, 4, _tuning)
	assert_almost_eq(with_tier_2, 50.0, 1e-9) # no gap
	assert_almost_eq(with_tier_4, 42.5, 1e-9) # gap 1 -> 0.85
	assert_ne(with_tier_2, with_tier_4)


func test_non_skill_action_drops_skill_term_of_gap_gear() -> void:
	# D.1: defend/flee use gap_gear = max(0, weapon_tier - tier) only.
	assert_eq(CombatFormulas.gap_gear(2, 3, CombatFormulas.NO_SKILL_TIER), 0)
	assert_eq(CombatFormulas.gap_gear(5, 3, CombatFormulas.NO_SKILL_TIER), 2)
	assert_eq(CombatFormulas.gap_gear(1, 3, 9), 6)
