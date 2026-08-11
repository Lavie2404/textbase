extends GutTest
## D.14 (NPC thức selection) and Core Rule #2 (two-tier NPC decision).
## Covers AC-48, AC-49, AC-50, AC-52, AC-52b, AC-53, AC-05/AC-36 (fallback).

const Factory := preload("res://tests/unit/combat/combat_test_factory.gd")

var _tuning: CombatTuning


func before_each() -> void:
	_tuning = CombatTuning.new()


func _thuc(thuc_id: String, tier: int) -> Dictionary:
	return {CombatNpc.KEY_THUC_ID: thuc_id, CombatNpc.KEY_TIER: tier}


func test_pool_prefers_low_tier_and_sorts_by_thuc_id() -> void:
	# AC-48: tier-3 NPC with tiers {1,2,5} -> pool excludes tier 5, sorted
	# ascending by thuc_id, deterministically.
	var thucs: Array = [
		_thuc("truy_phong", 2), _thuc("cuong_long", 5), _thuc("diem_huyet", 1),
	]
	var pool: Array[String] = CombatNpc.chosen_pool(3, thucs)
	assert_eq(pool, ["diem_huyet", "truy_phong"])


func test_choose_thuc_is_deterministic_and_follows_the_roll() -> void:
	# AC-48 (determinism): the pick tracks the injected roll's index mapping;
	# the same seed always picks the same thức, and input ORDER is irrelevant.
	var thucs: Array = [
		_thuc("truy_phong", 2), _thuc("cuong_long", 5), _thuc("diem_huyet", 1),
	]
	var shuffled: Array = [
		_thuc("diem_huyet", 1), _thuc("cuong_long", 5), _thuc("truy_phong", 2),
	]
	var pool: Array[String] = CombatNpc.chosen_pool(3, thucs)
	var saw_both: Dictionary = {}
	for seed_value: int in range(1, 31):
		var roll: float = Factory.probe_randf(seed_value)
		var expected: String = pool[mini(int(floor(roll * 2.0)), 1)]
		var picked: String = CombatNpc.choose_thuc(3, thucs, Factory.rng(seed_value))
		assert_eq(picked, expected, "seed %d roll %f" % [seed_value, roll])
		assert_eq(CombatNpc.choose_thuc(3, shuffled, Factory.rng(seed_value)), picked,
			"input order must not change the pick")
		saw_both[picked] = true
	assert_eq(saw_both.size(), 2, "both pool entries occur across rolls")


func test_all_zero_tier_thucs_pick_uniformly_without_division() -> void:
	# AC-49: every remaining thức tier 0 -> all eligible, no Σtier division
	# exists to blow up.
	var thucs: Array = [_thuc("thuc_b", 0), _thuc("thuc_a", 0)]
	assert_eq(CombatNpc.chosen_pool(1, thucs), ["thuc_a", "thuc_b"])
	var picked: String = CombatNpc.choose_thuc(1, thucs, Factory.rng(9))
	assert_true(picked in ["thuc_a", "thuc_b"])


func test_only_over_tier_thucs_fall_back_to_eligible_all() -> void:
	# AC-50: tier-2 NPC, only a tier-4 thức left -> forced to use it.
	var thucs: Array = [_thuc("ba_vuong_quyen", 4)]
	assert_eq(CombatNpc.chosen_pool(2, thucs), ["ba_vuong_quyen"])
	assert_eq(CombatNpc.choose_thuc(2, thucs, Factory.rng(1)), "ba_vuong_quyen")


func test_no_thucs_left_falls_back_to_basic_attack() -> void:
	# AC-05 / AC-36: empty pool -> basic attack, action never blocked.
	assert_eq(CombatNpc.chosen_pool(3, []), [CombatFormulas.BASIC_ATTACK_ID])
	assert_eq(CombatNpc.choose_thuc(3, [], Factory.rng(1)),
		CombatFormulas.BASIC_ATTACK_ID)
	var action: Dictionary = CombatNpc.choose_action(
		Factory.combatant("npc"), 150, false, [], _tuning, Factory.rng(1))
	assert_eq(action["action_type"], "skill")
	assert_eq(action["thuc_id"], CombatFormulas.BASIC_ATTACK_ID)


func test_npc_flees_below_hp_threshold_outside_spar() -> void:
	# AC-52: hp 30/200 = 0.15 < 0.20 -> flee (Tier 1), skipping Tier 2.
	var npc: Combatant = Factory.combatant("npc")
	var thucs: Array = [_thuc("truy_phong", 1)]
	var low: Dictionary = CombatNpc.choose_action(npc, 30, false, thucs, _tuning,
		Factory.rng(1))
	assert_eq(low["action_type"], "flee")
	assert_eq(low["thuc_id"], null)
	# hp 50/200 = 0.25 above threshold -> straight to Tier 2.
	var healthy: Dictionary = CombatNpc.choose_action(npc, 50, false, thucs, _tuning,
		Factory.rng(1))
	assert_eq(healthy["action_type"], "skill")
	assert_eq(healthy["thuc_id"], "truy_phong")


func test_npc_never_flees_in_friendly_spar() -> void:
	# AC-52b: identical low HP but friendly spar -> Tier 1 disabled entirely.
	var npc: Combatant = Factory.combatant("npc")
	var thucs: Array = [_thuc("truy_phong", 1)]
	for hp: int in [30, 10, 1]:
		var action: Dictionary = CombatNpc.choose_action(npc, hp, true, thucs,
			_tuning, Factory.rng(1))
		assert_eq(action["action_type"], "skill",
			"spar at hp %d must still pick a skill" % hp)


func test_npc_never_chooses_defend_across_many_states() -> void:
	# AC-53: over varied HP / thức pools / rolls, the NPC's action is always
	# in {skill, flee} — never "defend".
	var npc: Combatant = Factory.combatant("npc", {}, 3)
	var pools: Array = [
		[], [_thuc("a_thuc", 1)], [_thuc("b_thuc", 5)],
		[_thuc("a_thuc", 1), _thuc("b_thuc", 2), _thuc("c_thuc", 3)],
	]
	for seed_value: int in range(1, 11):
		for hp: int in [10, 30, 50, 120, 200]:
			for pool: Array in pools:
				var action: Dictionary = CombatNpc.choose_action(
					npc, hp, false, pool, _tuning, Factory.rng(seed_value))
				assert_true(String(action["action_type"]) in ["skill", "flee"],
					"NPC must never defend")
