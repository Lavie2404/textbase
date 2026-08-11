extends GutTest
## D.4 (raw damage), D.5 (crit), D.6 (final damage, defend).
## Covers AC-18, AC-19, AC-20, AC-21, AC-22, AC-51.

const Factory := preload("res://tests/unit/combat/combat_test_factory.gd")

var _tuning: CombatTuning


func before_each() -> void:
	_tuning = CombatTuning.new()


func test_raw_damage_chip_floor_replaces_zero_on_wall_punch() -> void:
	# AC-18: ATK 19.25 vs DEF 22 -> chip floor 0.9625, not 0.
	assert_almost_eq(CombatFormulas.raw_damage(19.25, 22.0, _tuning), 0.9625, 1e-9)


func test_raw_damage_uses_plain_difference_when_above_floor() -> void:
	assert_almost_eq(CombatFormulas.raw_damage(95.0, 50.0, _tuning), 45.0, 1e-9)


func test_crit_roll_and_multiplier_match_gdd_example() -> void:
	# AC-19: rate 0.18 with a roll below it -> crit; CritDamage 1.6 -> x1.6.
	for seed_value: int in range(1, 21):
		var roll: float = Factory.probe_randf(seed_value)
		var expected: bool = roll < 0.18
		assert_eq(CombatFormulas.roll_crit(0.18, Factory.rng(seed_value)), expected)
	assert_eq(CombatFormulas.crit_multiplier(true, 1.6), 1.6)


func test_crit_multiplier_floors_at_one_when_crit_damage_below_one() -> void:
	# AC-19: a crit never weakens the strike.
	assert_eq(CombatFormulas.crit_multiplier(true, 0.8), 1.0)
	assert_eq(CombatFormulas.crit_multiplier(false, 5.0), 1.0)


func test_zero_crit_rate_never_crits() -> void:
	for seed_value: int in range(1, 11):
		assert_false(CombatFormulas.roll_crit(0.0, Factory.rng(seed_value)))


func test_final_damage_typical_case_matches_gdd_example() -> void:
	# AC-20: raw 30, crit x1.6, Amp 0.1, Mitigation 0.15 -> 45.
	assert_eq(CombatFormulas.final_damage(30.0, 1.6, 0.1, 0.15, false, _tuning), 45)


func test_final_damage_extreme_mitigation_clamped_and_floored() -> void:
	# AC-21: Mitigation 5.0 -> final multiplier clamps at MIN_DMG_MULT, and
	# the result never drops below 1 while raw damage > 0.
	assert_eq(CombatFormulas.final_damage(30.0, 1.0, 0.0, 5.0, false, _tuning), 3)
	assert_eq(CombatFormulas.final_damage(0.125, 1.0, 0.0, 5.0, false, _tuning), 1)


func test_final_damage_floor_activates_when_rounding_to_zero() -> void:
	# AC-22: chip-floored raw 0.125 with Mitigation 0.5 -> raw round = 0 but
	# floor lifts it to 1 (a landed hit never deals 0 true damage).
	assert_eq(CombatFormulas.final_damage(0.125, 1.0, 0.0, 0.5, false, _tuning), 1)


func test_final_damage_zero_raw_stays_zero() -> void:
	# AC-22 (absolute-zero ATK edge): raw 0 -> 0, the max(1,...) floor does
	# NOT apply.
	assert_eq(CombatFormulas.final_damage(0.0, 2.0, 1.0, 0.0, false, _tuning), 0)


func test_defend_reduces_final_damage_deterministically() -> void:
	# AC-51: pre_mitigation x final_multiplier = 45; defending -> x0.65 -> 29.
	assert_eq(CombatFormulas.final_damage(45.0, 1.0, 0.0, 0.0, true, _tuning), 29)
	assert_eq(CombatFormulas.final_damage(45.0, 1.0, 0.0, 0.0, false, _tuning), 45)
