extends GutTest
## D.8 — single-strike resolution chain. Covers AC-24.

const Factory := preload("res://tests/unit/combat/combat_test_factory.gd")


func _attacker() -> Combatant:
	return Factory.combatant("att", {
		Combatant.STAT_ATK: 95.0,
		Combatant.STAT_ACC: 50.0,
		Combatant.STAT_LIFESTEAL: 0.1,
	})


func _defender() -> Combatant:
	return Factory.combatant("def", {
		Combatant.STAT_DEF: 50.0,
		Combatant.STAT_NE: 50.0,
	})


func test_miss_short_circuits_with_null_crit_and_unchanged_hp() -> void:
	# AC-24: forced miss -> exact miss struct; D.4-D.7 outputs all inert
	# (damage 0, heal 0, crit null — asserted on RETURN VALUES, the
	# pure-function equivalent of the GDD's spy-count-zero).
	var tuning: CombatTuning = Factory.tuning(Factory.FORCE_MISS)
	for defending: bool in [false, true]:
		var result: Dictionary = CombatResolver.resolve_attack(
			_attacker(), _defender(), 120, CombatFormulas.BASIC_ATTACK_TIER,
			CombatFormulas.NO_SKILL_TIER, defending, tuning, Factory.rng(3))
		assert_eq(result["hit"], false)
		assert_eq(result["crit"], null, "crit must be null (not false) on a miss")
		assert_eq(result["damage"], 0)
		assert_eq(result["heal"], 0)
		assert_eq(result["hp_defender_after"], 120, "defender HP unchanged")


func test_hit_returns_damage_heal_and_reduced_hp() -> void:
	# Forced hit, no crit: 95 ATK vs 50 DEF -> 45 damage, heal 5 (lifesteal 0.1).
	var tuning: CombatTuning = Factory.tuning(Factory.FORCE_HIT)
	var result: Dictionary = CombatResolver.resolve_attack(
		_attacker(), _defender(), 120, CombatFormulas.BASIC_ATTACK_TIER,
		CombatFormulas.NO_SKILL_TIER, false, tuning, Factory.rng(3))
	assert_eq(result["hit"], true)
	assert_eq(result["crit"], false)
	assert_eq(result["damage"], 45)
	assert_eq(result["heal"], 5)
	assert_eq(result["hp_defender_after"], 75)


func test_hit_floors_defender_hp_at_zero() -> void:
	var tuning: CombatTuning = Factory.tuning(Factory.FORCE_HIT)
	var result: Dictionary = CombatResolver.resolve_attack(
		_attacker(), _defender(), 30, CombatFormulas.BASIC_ATTACK_TIER,
		CombatFormulas.NO_SKILL_TIER, false, tuning, Factory.rng(3))
	assert_eq(result["damage"], 45)
	assert_eq(result["hp_defender_after"], 0, "HP floors at 0, never negative")
