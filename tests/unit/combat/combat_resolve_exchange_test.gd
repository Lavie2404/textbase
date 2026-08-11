extends GutTest
## D.9 — resolve_exchange (central formula).
## Covers AC-25, AC-26, AC-26b, AC-27, AC-30, AC-40, AC-41k, AC-07/AC-45,
## AC-08, AC-09 (locked_result schema) and the D.7 heal application.

const Factory := preload("res://tests/unit/combat/combat_test_factory.gd")

const PLAYER: String = "player"
const NPC: String = "npc"


func _player(overrides: Dictionary = {}) -> Combatant:
	var stats: Dictionary = {
		Combatant.STAT_ATK: 80.0,
		Combatant.STAT_DEF: 50.0,
		Combatant.STAT_SPD: 32.5,
	}
	stats.merge(overrides, true)
	return Factory.combatant(PLAYER, stats)


func _npc(overrides: Dictionary = {}) -> Combatant:
	var stats: Dictionary = {
		Combatant.STAT_ATK: 95.0,
		Combatant.STAT_DEF: 50.0,
		Combatant.STAT_SPD: 40.0,
	}
	stats.merge(overrides, true)
	return Factory.combatant(NPC, stats)


func test_normal_exchange_both_skills_matches_gdd_example_1() -> void:
	# AC-25: NPC first (SPD), deals 45 (player 50 -> 5); player deals 30
	# (npc 40 -> 10); battle continues, outcome null; hp asserted BY actor_id.
	var result: Dictionary = Factory.resolve({
		"a": _player(), "b": _npc(),
		"hp": {PLAYER: 50, NPC: 40},
		"tuning": Factory.tuning(Factory.FORCE_HIT),
	})
	assert_eq(result["first_id"], NPC)
	assert_eq(result["second_id"], PLAYER)
	var per_actor: Dictionary = result["per_actor"]
	assert_eq(per_actor[NPC]["executed"], true)
	assert_eq(per_actor[NPC]["hit"], true)
	assert_eq(per_actor[NPC]["damage_dealt"], 45)
	assert_eq(per_actor[PLAYER]["executed"], true)
	assert_eq(per_actor[PLAYER]["hit"], true)
	assert_eq(per_actor[PLAYER]["damage_dealt"], 30)
	assert_eq(per_actor[PLAYER]["hp_after"], 5, "player HP by actor_id — no swap")
	assert_eq(per_actor[NPC]["hp_after"], 10, "npc HP by actor_id — no swap")
	assert_eq(result["battle_active"], true)
	assert_eq(result["outcome"], null, "battle-continues branch returns outcome null")


func test_early_interrupt_kills_second_strike_and_skips_regen() -> void:
	# AC-26: NPC deals 60, player 50 -> 0 -> player's strike never executes;
	# npc HP unchanged (npc has regen 0.05 — if D.10 had run it would be 50).
	var result: Dictionary = Factory.resolve({
		"a": _player(),
		"b": _npc({Combatant.STAT_ATK: 110.0, Combatant.STAT_HP_REGEN: 0.05}),
		"hp": {PLAYER: 50, NPC: 40},
		"tuning": Factory.tuning(Factory.FORCE_HIT),
	})
	var per_actor: Dictionary = result["per_actor"]
	assert_eq(per_actor[NPC]["damage_dealt"], 60)
	assert_eq(per_actor[PLAYER]["executed"], false)
	assert_eq(per_actor[PLAYER]["hit"], null, "interrupted, not missed — hit is null")
	assert_eq(per_actor[PLAYER]["hp_after"], 0)
	assert_eq(per_actor[NPC]["hp_after"], 40,
		"npc HP untouched: no player strike AND no D.10 regen on an ending exchange")
	assert_eq(result["battle_active"], false)
	var outcome: Dictionary = result["outcome"]
	assert_eq(outcome["type"], "lose")
	assert_eq(outcome["winner_id"], NPC)
	assert_eq(outcome["loser_id"], PLAYER)


func test_outcome_type_follows_player_id_not_actor_labels() -> void:
	# AC-26b: identical numbers, only player_id flips -> type flips between
	# "lose" and "win"; winner/loser ids stay the same.
	for expectation: Array in [[PLAYER, "lose"], [NPC, "win"]]:
		var result: Dictionary = Factory.resolve({
			"a": _player(), "b": _npc({Combatant.STAT_ATK: 110.0}),
			"hp": {PLAYER: 50, NPC: 40},
			"player_id": expectation[0],
			"tuning": Factory.tuning(Factory.FORCE_HIT),
		})
		var outcome: Dictionary = result["outcome"]
		assert_eq(outcome["type"], expectation[1],
			"player_id=%s must read %s" % [expectation[0], expectation[1]])
		assert_eq(outcome["winner_id"], NPC)
		assert_eq(outcome["loser_id"], PLAYER)


func test_simultaneous_death_by_strikes_impossible_across_matrix() -> void:
	# AC-27: >= 10 combinations where the first strike kills — the second
	# strike must NEVER execute, so both-at-zero cannot happen via strikes.
	var combos: Array = [
		[60, 1], [60, 10], [80, 1], [80, 25], [80, 30],
		[110, 1], [110, 30], [110, 50], [150, 60], [150, 100],
		[200, 1], [200, 150],
	]
	for combo: Array in combos:
		var npc_atk: float = float(combo[0])
		var player_hp: int = int(combo[1])
		var result: Dictionary = Factory.resolve({
			"a": _player(), "b": _npc({Combatant.STAT_ATK: npc_atk}),
			"hp": {PLAYER: player_hp, NPC: 40},
			"tuning": Factory.tuning(Factory.FORCE_HIT),
		})
		var per_actor: Dictionary = result["per_actor"]
		assert_eq(per_actor[PLAYER]["hp_after"], 0,
			"combo %s must be a kill" % str(combo))
		assert_eq(per_actor[PLAYER]["executed"], false,
			"combo %s: second strike must not execute" % str(combo))
		assert_gt(int(per_actor[NPC]["hp_after"]), 0,
			"combo %s: no simultaneous zero" % str(combo))


func test_failed_flee_concedes_first_to_opponent_despite_higher_spd() -> void:
	# AC-30: fleeing player has HIGHER SPD (override must beat D.2), flee
	# fails -> opponent is first and only the opponent attacks.
	var result: Dictionary = Factory.resolve({
		"a": _player({Combatant.STAT_SPD: 60.0}),
		"b": _npc({Combatant.STAT_ATK: 60.0}),
		"hp": {PLAYER: 50, NPC: 40},
		"actions": {PLAYER: CombatFormulas.ACTION_FLEE, NPC: CombatFormulas.ACTION_SKILL},
		"thuc_ids": {PLAYER: null, NPC: CombatFormulas.BASIC_ATTACK_ID},
		"tuning": Factory.tuning(Factory.FORCE_HIT, Factory.FORCE_FLEE_FAIL),
	})
	assert_eq(result["first_id"], NPC, "opponent overrides D.2 order")
	assert_eq(result["second_id"], PLAYER)
	var per_actor: Dictionary = result["per_actor"]
	assert_eq(per_actor[PLAYER]["action_type"], "flee")
	assert_eq(per_actor[PLAYER]["executed"], true,
		"failed flee is executed=true — acted but did not escape")
	assert_eq(per_actor[PLAYER]["hit"], null)
	assert_eq(per_actor[PLAYER]["damage_dealt"], 0)
	assert_eq(per_actor[PLAYER]["hp_after"], 40, "took npc's 10 damage")
	assert_eq(per_actor[NPC]["damage_dealt"], 10)
	assert_eq(result["battle_active"], true)


func test_successful_flee_ends_battle_with_no_outcome() -> void:
	# AC-40 + round-3 schema exception: the opponent's chosen-but-unexecuted
	# thức stays null.
	var result: Dictionary = Factory.resolve({
		"a": _player(), "b": _npc(),
		"hp": {PLAYER: 50, NPC: 40},
		"actions": {PLAYER: CombatFormulas.ACTION_FLEE, NPC: CombatFormulas.ACTION_SKILL},
		"thuc_ids": {PLAYER: null, NPC: "quyen_phap_x"},
		"tuning": Factory.tuning(Factory.FORCE_FLEE_SUCCEED),
	})
	assert_eq(result["battle_active"], false)
	var outcome: Dictionary = result["outcome"]
	assert_eq(outcome["type"], "no_outcome")
	assert_eq(outcome["winner_id"], null)
	assert_eq(outcome["loser_id"], null)
	assert_eq(result["first_id"], PLAYER)
	var per_actor: Dictionary = result["per_actor"]
	assert_eq(per_actor[PLAYER]["executed"], true)
	assert_eq(per_actor[PLAYER]["hp_after"], 50)
	assert_eq(per_actor[NPC]["executed"], false, "opponent never acted")
	assert_eq(per_actor[NPC]["thuc_id"], null,
		"chosen-but-unexecuted thức must not leak (schema exception)")
	assert_eq(per_actor[NPC]["hp_after"], 40)


func test_double_flee_failure_keeps_deterministic_order_labels() -> void:
	# AC-41k: both flee, both fail -> nobody attacks; first/second are the
	# D.2 labels; exchange continues symmetrically.
	var result: Dictionary = Factory.resolve({
		"a": _player({Combatant.STAT_SPD: 60.0}), "b": _npc(),
		"hp": {PLAYER: 50, NPC: 40},
		"actions": {PLAYER: CombatFormulas.ACTION_FLEE, NPC: CombatFormulas.ACTION_FLEE},
		"thuc_ids": {PLAYER: null, NPC: null},
		"tuning": Factory.tuning(Factory.FORCE_FLEE_FAIL),
	})
	assert_eq(result["first_id"], PLAYER, "pure D.2 label (player SPD 60 > 40)")
	assert_eq(result["second_id"], NPC)
	var per_actor: Dictionary = result["per_actor"]
	for actor_id: String in [PLAYER, NPC]:
		assert_eq(per_actor[actor_id]["action_type"], "flee")
		assert_eq(per_actor[actor_id]["executed"], true)
		assert_eq(per_actor[actor_id]["damage_dealt"], 0)
		assert_eq(per_actor[actor_id]["hit"], null)
	assert_eq(per_actor[PLAYER]["hp_after"], 50, "no attack, no drain at exchange 1")
	assert_eq(per_actor[NPC]["hp_after"], 40)
	assert_eq(result["battle_active"], true)
	assert_eq(result["outcome"], null)


func test_lifesteal_heal_is_applied_to_attacker_hp() -> void:
	# D.7 resolution (prose gap fixed in code): attacker with lifesteal 0.5
	# vs a defending target: damage round(10 x 0.65) = 7, heal round(3.5) = 4.
	var result: Dictionary = Factory.resolve({
		"a": _player({Combatant.STAT_ATK: 60.0, Combatant.STAT_LIFESTEAL: 0.5,
			Combatant.STAT_SPD: 60.0}),
		"b": _npc(),
		"hp": {PLAYER: 100, NPC: 40},
		"actions": {PLAYER: CombatFormulas.ACTION_SKILL, NPC: CombatFormulas.ACTION_DEFEND},
		"thuc_ids": {PLAYER: CombatFormulas.BASIC_ATTACK_ID, NPC: null},
		"tuning": Factory.tuning(Factory.FORCE_HIT),
	})
	var per_actor: Dictionary = result["per_actor"]
	assert_eq(per_actor[PLAYER]["damage_dealt"], 7)
	assert_eq(per_actor[PLAYER]["heal"], 4)
	assert_eq(per_actor[PLAYER]["hp_after"], 104, "heal applied to attacker HP")
	assert_eq(per_actor[NPC]["hp_after"], 33)


func test_result_ignores_display_weights_and_external_points() -> void:
	# AC-07 + AC-45: identical mechanical inputs with different D.13 weights
	# and different external skill/equipment points -> byte-identical
	# locked_result (no hidden inputs, no affinity, no Lực chiến influence).
	var a1: Combatant = _player()
	var b1: Combatant = _npc()
	var a2: Combatant = _player()
	a2.skill_points = 999.0
	a2.equipment_points = 123.0
	var b2: Combatant = _npc()
	b2.skill_points = -777.0
	var tuning_2: CombatTuning = CombatTuning.from_dict({"w_HP": 9.0, "w_ATK": 0.0})
	var result_1: Dictionary = Factory.resolve({
		"a": a1, "b": b1, "hp": {PLAYER: 50, NPC: 40}, "seed": 5,
	})
	var result_2: Dictionary = Factory.resolve({
		"a": a2, "b": b2, "hp": {PLAYER: 50, NPC: 40}, "seed": 5,
		"tuning": tuning_2,
	})
	assert_eq(result_1, result_2, "locked_result must be identical field-for-field")


func test_locked_result_schema_has_exactly_the_contract_fields() -> void:
	# AC-09 (Combat side): exactly the 6 outer fields; per_actor entries carry
	# exactly the 8 fields; no `dodge` anywhere; `heal` present even when 0.
	var result: Dictionary = Factory.resolve({
		"a": _player(), "b": _npc(),
		"hp": {PLAYER: 50, NPC: 40},
		"tuning": Factory.tuning(Factory.FORCE_HIT),
	})
	var outer_keys: Array = result.keys()
	outer_keys.sort()
	assert_eq(outer_keys, ["battle_active", "exchange_id", "first_id",
		"outcome", "per_actor", "second_id"])
	var per_actor: Dictionary = result["per_actor"]
	for actor_id: String in [PLAYER, NPC]:
		var entry_keys: Array = per_actor[actor_id].keys()
		entry_keys.sort()
		assert_eq(entry_keys, ["action_type", "crit", "damage_dealt", "executed",
			"heal", "hit", "hp_after", "thuc_id"])
		assert_false(per_actor[actor_id].has("dodge"), "no dodge field exists")
	assert_eq(result["exchange_id"], 1)


func test_outcome_domain_across_all_ending_branches() -> void:
	# AC-08: every ending branch yields exactly one of win/lose/no_outcome;
	# outcome is null ONLY while battle_active; non-spar HP=0 never
	# produces no_outcome.
	var endings: Array[Dictionary] = []
	# HP=0, non-spar.
	endings.append(Factory.resolve({
		"a": _player(), "b": _npc({Combatant.STAT_ATK: 110.0}),
		"hp": {PLAYER: 50, NPC: 40},
		"tuning": Factory.tuning(Factory.FORCE_HIT),
	}))
	# Successful flee.
	endings.append(Factory.resolve({
		"a": _player(), "b": _npc(),
		"hp": {PLAYER: 50, NPC: 40},
		"actions": {PLAYER: CombatFormulas.ACTION_FLEE, NPC: CombatFormulas.ACTION_SKILL},
		"thuc_ids": {PLAYER: null, NPC: null},
		"tuning": Factory.tuning(Factory.FORCE_FLEE_SUCCEED),
	}))
	# Technical cap, non-spar and spar.
	for spar: bool in [false, true]:
		endings.append(Factory.resolve({
			"a": _player(), "b": _npc(),
			"hp": {PLAYER: 150, NPC: 100},
			"actions": {PLAYER: CombatFormulas.ACTION_DEFEND, NPC: CombatFormulas.ACTION_DEFEND},
			"thuc_ids": {PLAYER: null, NPC: null},
			"exchange_id": 200,
			"spar": spar,
		}))
	for result: Dictionary in endings:
		assert_eq(result["battle_active"], false)
		var outcome: Dictionary = result["outcome"]
		assert_true(String(outcome["type"]) in ["win", "lose", "no_outcome"])
	# Non-spar HP=0 ending must be win/lose.
	var hp_zero_outcome: Dictionary = endings[0]["outcome"]
	assert_ne(hp_zero_outcome["type"], "no_outcome")
	# Battle-continues branch: outcome null.
	var continuing: Dictionary = Factory.resolve({
		"a": _player(), "b": _npc(),
		"hp": {PLAYER: 50, NPC: 40},
		"tuning": Factory.tuning(Factory.FORCE_HIT),
	})
	assert_eq(continuing["battle_active"], true)
	assert_eq(continuing["outcome"], null)
