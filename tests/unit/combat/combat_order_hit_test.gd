extends GutTest
## D.2 (strike order) and D.3 (hit/miss). Covers AC-14, AC-15, AC-16, AC-17.

const Factory := preload("res://tests/unit/combat/combat_test_factory.gd")

var _tuning: CombatTuning


func before_each() -> void:
	_tuning = CombatTuning.new()


func test_higher_spd_goes_first_without_consuming_rng() -> void:
	# AC-14: SPD 32.5 vs 40 -> npc first; no coin flip consumed on a non-tie.
	var rng: RandomNumberGenerator = Factory.rng(7)
	var state_before: int = rng.state
	var order: Array[String] = CombatFormulas.determine_order(
		"player", "npc", 32.5, 40.0, rng)
	assert_eq(order[0], "npc")
	assert_eq(order[1], "player")
	assert_eq(rng.state, state_before, "no RNG must be consumed on a non-tie")


func test_exact_spd_tie_follows_injected_roll_not_exchange_id() -> void:
	# AC-15: on an exact tie the result tracks the injected roll (< 0.5 -> A),
	# varies across different rolls, and no self-seeding is involved.
	var saw_a: bool = false
	var saw_b: bool = false
	for seed_value: int in range(1, 41):
		var expected: String = "A" if Factory.probe_randf(seed_value) < 0.5 else "B"
		var order: Array[String] = CombatFormulas.determine_order(
			"A", "B", 40.0, 40.0, Factory.rng(seed_value))
		assert_eq(order[0], expected,
			"seed %d: first must follow the roll" % seed_value)
		saw_a = saw_a or order[0] == "A"
		saw_b = saw_b or order[0] == "B"
	assert_true(saw_a and saw_b, "both outcomes must occur across differing rolls")


func test_hit_probability_typical_case_matches_gdd_example() -> void:
	# AC-16: ACC 45.2 vs Né 38.0 -> P_hit 0.572.
	assert_almost_eq(CombatFormulas.hit_probability(45.2, 38.0, _tuning), 0.572, 1e-9)


func test_hit_roll_below_probability_hits() -> void:
	# AC-16 (roll part): result tracks the injected roll against P_hit.
	for seed_value: int in range(1, 21):
		var roll: float = Factory.probe_randf(seed_value)
		var expected: bool = roll < 0.572
		assert_eq(CombatFormulas.roll_hit(45.2, 38.0, _tuning, Factory.rng(seed_value)),
			expected, "seed %d roll %f" % [seed_value, roll])


func test_hit_probability_zero_acc_zero_ne_is_half() -> void:
	# AC-17: difference formula, no division -> exactly 0.5.
	assert_eq(CombatFormulas.hit_probability(0.0, 0.0, _tuning), 0.5)


func test_hit_probability_clamped_to_p_min_p_max() -> void:
	# D.3 output range: never certain hit or miss.
	assert_eq(CombatFormulas.hit_probability(10000.0, 0.0, _tuning), _tuning.P_MAX)
	assert_eq(CombatFormulas.hit_probability(0.0, 10000.0, _tuning), _tuning.P_MIN)
