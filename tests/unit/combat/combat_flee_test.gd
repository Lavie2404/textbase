extends GutTest
## D.11 — flee probability. Covers AC-28b, AC-29.

const Factory := preload("res://tests/unit/combat/combat_test_factory.gd")

var _tuning: CombatTuning


func before_each() -> void:
	_tuning = CombatTuning.new()


func test_flee_probability_typical_case_matches_gdd_example() -> void:
	# AC-28b: SPD 32.5 vs 40 -> P_flee 0.425; a roll of >= 0.425 fails.
	assert_almost_eq(CombatFormulas.flee_probability(32.5, 40.0, _tuning), 0.425, 1e-9)
	for seed_value: int in range(1, 21):
		var roll: float = Factory.probe_randf(seed_value)
		var expected: bool = roll < 0.425
		assert_eq(CombatFormulas.roll_flee(32.5, 40.0, _tuning, Factory.rng(seed_value)),
			expected, "seed %d roll %f" % [seed_value, roll])


func test_flee_probability_equal_spd_is_half() -> void:
	# AC-29: SPD 0/0 -> difference formula, exactly 0.5, no exception.
	assert_eq(CombatFormulas.flee_probability(0.0, 0.0, _tuning), 0.5)
	assert_eq(CombatFormulas.flee_probability(40.0, 40.0, _tuning), 0.5)


func test_flee_probability_clamped_to_bounds() -> void:
	# D.11 output range: no certain escape, no certain capture.
	assert_eq(CombatFormulas.flee_probability(10000.0, 0.0, _tuning), _tuning.P_MAX_FLEE)
	assert_eq(CombatFormulas.flee_probability(0.0, 10000.0, _tuning), _tuning.P_MIN_FLEE)
