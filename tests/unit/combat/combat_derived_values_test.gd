extends GutTest
## D.12 (max_invocations_per_battle) and D.13 (stat points / combat power /
## estimate ratio). Covers AC-31, AC-33, AC-34, AC-35.

const Factory := preload("res://tests/unit/combat/combat_test_factory.gd")

var _tuning: CombatTuning


func before_each() -> void:
	_tuning = CombatTuning.new()


func test_max_invocations_default_is_five_and_pool_sufficiency() -> void:
	# AC-31: ceil(30/6) = 5; a min-authored skill (3 thức) is insufficient —
	# an authoring warning, not a runtime block.
	assert_eq(CombatFormulas.max_invocations_per_battle(_tuning), 5)
	assert_false(CombatFormulas.is_pool_sufficient(3, _tuning))
	assert_true(CombatFormulas.is_pool_sufficient(5, _tuning))


func test_max_invocations_uses_float_cast_before_ceil() -> void:
	# D.12 implementation note: 25/6 must ceil to 5 — int division would
	# floor to 4 first and silently return 4.
	var tuning: CombatTuning = CombatTuning.from_dict({"CONTENT_EXCHANGE_ESTIMATE": 25})
	assert_eq(CombatFormulas.max_invocations_per_battle(tuning), 5)


func test_estimate_ratio_typical_case() -> void:
	# AC-33: 310 vs 250 -> 1.24.
	var c: Combatant = Factory.combatant("c")
	c.skill_points = 310.0
	assert_eq(CombatFormulas.luc_chien(c, _tuning), 310.0)
	var ratio: Variant = CombatFormulas.estimate_ratio(310.0, 250.0)
	assert_almost_eq(float(ratio), 1.24, 1e-9)


func test_estimate_ratio_both_zero_returns_na_sentinel() -> void:
	# AC-34: 0/0 -> "N/A", never a fake 1.0 or NaN.
	assert_eq(CombatFormulas.estimate_ratio(0.0, 0.0), CombatFormulas.RATIO_NA)


func test_estimate_ratio_opponent_zero_returns_infinity_sentinel() -> void:
	# AC-35: X/0 -> "+∞", no division by zero.
	assert_eq(CombatFormulas.estimate_ratio(310.0, 0.0), CombatFormulas.RATIO_INF)


func test_luc_chien_never_negative() -> void:
	# D.13 round-2 fix: CritDamage < 1 is clamped at the term, and the outer
	# max(0, ...) guards the total even against negative external points.
	var c: Combatant = Factory.combatant("c", {Combatant.STAT_CRIT_DAMAGE: 0.5})
	assert_eq(CombatFormulas.stat_points(c, _tuning), 0.0,
		"max(0, CritDamage-1) blocks the only negative term")
	c.skill_points = -1000.0
	assert_eq(CombatFormulas.luc_chien(c, _tuning), 0.0)


func test_stat_points_weighted_sum() -> void:
	# D.13 shape: HP weighted at 0.25, percent stats scaled x100.
	var c: Combatant = Factory.combatant("c", {
		Combatant.STAT_HP: 200.0,
		Combatant.STAT_ATK: 50.0,
		Combatant.STAT_CRIT_RATE: 0.1,
		Combatant.STAT_CRIT_DAMAGE: 1.5,
	})
	# 0.25*200 + 50 + 0.1*100 + 0.5*100 = 50 + 50 + 10 + 50 = 160.
	assert_almost_eq(CombatFormulas.stat_points(c, _tuning), 160.0, 1e-9)


func test_parity_diff_range_and_zero_guard() -> void:
	# D.9b: denominator floored at 1 — 0-vs-positive gives exactly 1.0
	# (closed upper bound), 0/0 gives 0 without dividing by zero.
	assert_eq(CombatFormulas.parity_diff(310.0, 0.0), 1.0)
	assert_eq(CombatFormulas.parity_diff(0.0, 0.0), 0.0)
	assert_almost_eq(CombatFormulas.parity_diff(310.0, 280.0), 30.0 / 310.0, 1e-9)
