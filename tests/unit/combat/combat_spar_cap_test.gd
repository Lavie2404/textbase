extends GutTest
## D.9b (spar parity gate & reclassification) and D.9c (technical-cap
## tiebreak) plus the D.4b mutual-exhaustion tiebreak.
## Covers AC-41a, AC-41b, AC-41c, AC-41d, AC-41e, AC-41f, AC-41g, AC-41j and
## the hp_pct_pre_drain regression (round-4 escalation finding).

const Factory := preload("res://tests/unit/combat/combat_test_factory.gd")

const A: String = "actor_a"
const B: String = "actor_b"


func _defender_pair(spd_a: float = 60.0, spd_b: float = 40.0) -> Array[Combatant]:
	# Distinct SPD so D.2 consumes no RNG — the first draw (if any) belongs
	# to the tiebreak under test.
	return [
		Factory.combatant(A, {Combatant.STAT_SPD: spd_a}),
		Factory.combatant(B, {Combatant.STAT_SPD: spd_b}),
	]


func _cap_exchange(hp_a: int, hp_b: int, spar: bool, seed_value: int = 1,
		player_id: String = A) -> Dictionary:
	var pair: Array[Combatant] = _defender_pair()
	return Factory.resolve({
		"a": pair[0], "b": pair[1],
		"hp": {A: hp_a, B: hp_b},
		"actions": {A: CombatFormulas.ACTION_DEFEND, B: CombatFormulas.ACTION_DEFEND},
		"thuc_ids": {A: null, B: null},
		"exchange_id": 200,
		"spar": spar,
		"player_id": player_id,
		"seed": seed_value,
	})


func test_cap_reached_non_spar_forces_win_by_higher_hp_pct() -> void:
	# AC-41a: cap exchange, hp 62/36 -> after max drain (10) 52/26; D.9c gives
	# the win to the higher HP% side — never no_outcome outside spars.
	var result: Dictionary = _cap_exchange(62, 36, false)
	assert_eq(result["battle_active"], false)
	var outcome: Dictionary = result["outcome"]
	assert_eq(outcome["type"], "win")
	assert_eq(outcome["winner_id"], A)
	assert_eq(outcome["loser_id"], B)
	var per_actor: Dictionary = result["per_actor"]
	assert_eq(per_actor[A]["hp_after"], 52, "cap exchange still applies full drain")
	assert_eq(per_actor[B]["hp_after"], 26)


func test_cap_reached_spar_ends_with_no_outcome() -> void:
	# AC-41b: same numbers, friendly spar -> no_outcome for both.
	var result: Dictionary = _cap_exchange(62, 36, true)
	assert_eq(result["battle_active"], false)
	var outcome: Dictionary = result["outcome"]
	assert_eq(outcome["type"], "no_outcome")
	assert_eq(outcome["winner_id"], null)
	assert_eq(outcome["loser_id"], null)


func test_cap_tiebreak_exact_hp_pct_tie_follows_injected_roll() -> void:
	# AC-41c: equal HP% -> coin flip driven by the injected roll (< 0.5 -> A),
	# varying across battles — no exchange_id self-seeding.
	var saw_a: bool = false
	var saw_b: bool = false
	for seed_value: int in range(1, 31):
		var expected: String = A if Factory.probe_randf(seed_value) < 0.5 else B
		var result: Dictionary = _cap_exchange(50, 50, false, seed_value)
		var outcome: Dictionary = result["outcome"]
		assert_eq(outcome["winner_id"], expected, "seed %d" % seed_value)
		saw_a = saw_a or String(outcome["winner_id"]) == A
		saw_b = saw_b or String(outcome["winner_id"]) == B
	assert_true(saw_a and saw_b, "both winners must occur across rolls")


func _spar_kill(hp_a: int, spar: bool, eligible: bool,
		player_id: String = A) -> Dictionary:
	# A (higher SPD) kills B (hp 5) with a 10-damage strike.
	var a: Combatant = Factory.combatant(A, {
		Combatant.STAT_ATK: 60.0, Combatant.STAT_SPD: 60.0})
	var b: Combatant = Factory.combatant(B, {
		Combatant.STAT_DEF: 50.0, Combatant.STAT_SPD: 40.0})
	return Factory.resolve({
		"a": a, "b": b,
		"hp": {A: hp_a, B: 5},
		"spar": spar, "eligible": eligible, "player_id": player_id,
		"tuning": Factory.tuning(Factory.FORCE_HIT),
	})


func test_parity_gate_matches_gdd_examples() -> void:
	# D.9b parity: 310/280 eligible; 400/280 not; 0/0 hard false (AC-41g);
	# never eligible outside spars (AC-41j precondition).
	var tuning: CombatTuning = CombatTuning.new()
	assert_true(CombatFormulas.compute_spar_parity_eligible(310.0, 280.0, true, tuning))
	assert_false(CombatFormulas.compute_spar_parity_eligible(400.0, 280.0, true, tuning))
	assert_false(CombatFormulas.compute_spar_parity_eligible(0.0, 0.0, true, tuning))
	assert_false(CombatFormulas.compute_spar_parity_eligible(310.0, 280.0, false, tuning))


func test_eligible_spar_with_critical_winner_hp_reclassifies_to_draw() -> void:
	# AC-41d: winner ends at 17/200 = 0.085 <= 0.15 -> no_outcome.
	var result: Dictionary = _spar_kill(17, true, true)
	var outcome: Dictionary = result["outcome"]
	assert_eq(outcome["type"], "no_outcome")
	assert_eq(outcome["winner_id"], null)
	assert_eq(outcome["loser_id"], null)


func test_ineligible_parity_keeps_normal_win_despite_low_hp() -> void:
	# AC-41e: parity gate failed -> normal win even at critical HP.
	var result: Dictionary = _spar_kill(17, true, false)
	var outcome: Dictionary = result["outcome"]
	assert_eq(outcome["type"], "win")
	assert_eq(outcome["winner_id"], A)


func test_eligible_spar_with_healthy_winner_keeps_normal_win() -> void:
	# AC-41f: winner at 110/200 = 0.55 > threshold -> normal win in a spar.
	var result: Dictionary = _spar_kill(110, true, true)
	var outcome: Dictionary = result["outcome"]
	assert_eq(outcome["type"], "win")
	assert_eq(outcome["winner_id"], A)


func test_non_spar_never_reclassifies_even_with_draw_conditions_met() -> void:
	# AC-41j: same numbers as the AC-41d draw, but non-spar -> the gate is
	# false by construction and the true "lose" signal reaches Death &
	# Consequence (player is the loser here).
	var result: Dictionary = _spar_kill(17, false, false, B)
	var outcome: Dictionary = result["outcome"]
	assert_eq(outcome["type"], "lose", "player_id=B lost — literal 'lose'")
	assert_eq(outcome["winner_id"], A)
	assert_eq(outcome["loser_id"], B)


func test_mutual_drain_death_tiebreaks_on_pre_drain_hp_pct_not_coin_flip() -> void:
	# Round-4 escalation regression: hp 9 vs 8 at full drain (10 each) — both
	# die; the pre-drain HP% (0.045 vs 0.040) must decide DETERMINISTICALLY.
	# Under the buggy int/int truncation both percentages read 0 and a hidden
	# coin flip decides — the fixed float()+guard version always picks A.
	for seed_value: int in range(1, 11):
		var result: Dictionary = _cap_exchange(9, 8, false, seed_value)
		var outcome: Dictionary = result["outcome"]
		assert_eq(outcome["type"], "win")
		assert_eq(outcome["winner_id"], A,
			"seed %d: higher pre-drain HP%% must win, not a coin flip" % seed_value)
		assert_eq(outcome["loser_id"], B)
		var per_actor: Dictionary = result["per_actor"]
		assert_eq(per_actor[A]["hp_after"], 0)
		assert_eq(per_actor[B]["hp_after"], 0)
	assert_eq(_cap_exchange(9, 8, false, 3, B)["outcome"]["type"], "lose",
		"outcome.type still follows player_id")


func test_mutual_drain_death_exact_tie_coin_flips_on_injected_roll() -> void:
	# D.4b: exact pre-drain HP% tie -> coin flip between first/second on the
	# injected stream (first draw of the exchange — SPD is distinct).
	var saw_a: bool = false
	var saw_b: bool = false
	for seed_value: int in range(1, 31):
		var expected: String = A if Factory.probe_randf(seed_value) < 0.5 else B
		var result: Dictionary = _cap_exchange(9, 9, false, seed_value)
		var outcome: Dictionary = result["outcome"]
		assert_eq(outcome["winner_id"], expected, "seed %d" % seed_value)
		saw_a = saw_a or String(outcome["winner_id"]) == A
		saw_b = saw_b or String(outcome["winner_id"]) == B
	assert_true(saw_a and saw_b)
