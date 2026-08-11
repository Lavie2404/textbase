extends GutTest
## D.7 (lifesteal), D.10 (regen), D.4b (exhaustion).
## Covers AC-23, AC-28, AC-46.

var _tuning: CombatTuning


func before_each() -> void:
	_tuning = CombatTuning.new()


func test_lifesteal_heal_rounds_and_caps_at_max_hp() -> void:
	# AC-23: 45 damage x 0.1 lifesteal -> 5 heal (4.5 rounds up); overheal
	# clamps at max HP.
	assert_eq(CombatFormulas.lifesteal_heal(45, 0.1), 5)
	assert_eq(CombatFormulas.apply_heal(195, 200, 5), 200)
	assert_eq(CombatFormulas.apply_heal(100, 200, 5), 105)


func test_lifesteal_heal_zero_damage_heals_zero() -> void:
	assert_eq(CombatFormulas.lifesteal_heal(0, 0.9), 0)


func test_regen_typical_case_and_overheal_cap() -> void:
	# AC-28: max 200, regen 0.05, exchange 1 (mult 1) -> +10; overheal clamps.
	assert_eq(CombatFormulas.regen_hp(150, 200, 0.05, 1, _tuning), 160)
	assert_eq(CombatFormulas.regen_hp(195, 200, 0.05, 1, _tuning), 200)


func test_regen_hard_capped_by_hp_regen_cap() -> void:
	# D.10: a 0.5 regen build behaves exactly like a 0.05 build (cap).
	assert_eq(CombatFormulas.regen_hp(150, 200, 0.5, 1, _tuning), 160)


func test_regen_scaled_down_by_exhaustion() -> void:
	# D.10 exhaustion example: exchange 120 -> mult 0.5 -> +5.
	assert_eq(CombatFormulas.regen_hp(150, 200, 0.05, 120, _tuning), 155)


func test_exhaustion_midpoint_matches_gdd_example() -> void:
	# AC-46: onset 40, cap 200, exchange 120 -> progress 0.5, regen mult 0.5,
	# drain round(200 x 0.05 x 0.5) = 5.
	assert_almost_eq(CombatFormulas.exhaustion_progress(120, _tuning), 0.5, 1e-9)
	assert_almost_eq(CombatFormulas.exhaustion_regen_mult(120, _tuning), 0.5, 1e-9)
	assert_eq(CombatFormulas.exhaustion_drain(200, 120, _tuning), 5)


func test_exhaustion_inactive_before_onset() -> void:
	# AC-46 boundary: exchange <= onset -> progress 0, no drain, full regen.
	assert_eq(CombatFormulas.exhaustion_progress(40, _tuning), 0.0)
	assert_eq(CombatFormulas.exhaustion_progress(1, _tuning), 0.0)
	assert_eq(CombatFormulas.exhaustion_regen_mult(40, _tuning), 1.0)
	assert_eq(CombatFormulas.exhaustion_drain(200, 40, _tuning), 0)


func test_exhaustion_full_at_technical_cap() -> void:
	# AC-46 boundary: at the cap, progress 1 -> regen dead, drain maximal.
	assert_eq(CombatFormulas.exhaustion_progress(200, _tuning), 1.0)
	assert_eq(CombatFormulas.exhaustion_regen_mult(200, _tuning), 0.0)
	assert_eq(CombatFormulas.exhaustion_drain(200, 200, _tuning), 10)


func test_exhaustion_progress_uses_float_division_not_truncation() -> void:
	# The round-3 C-1 bug: under int/int truncation, progress reads 0 for the
	# whole window (0/108 convergence). One tick past onset must already be
	# a small POSITIVE fraction.
	var progress: float = CombatFormulas.exhaustion_progress(41, _tuning)
	assert_gt(progress, 0.0)
	assert_almost_eq(progress, 1.0 / 160.0, 1e-9)
