class_name CombatResolver
extends RefCounted
## Exchange resolution — GDD formulas D.8 (resolve_attack), D.9
## (resolve_exchange), D.9b (spar-draw reclassification) and D.9c
## (technical-cap tiebreak).
##
## NORMATIVE reference implementation per ADR-0001. Pure functions: current
## HP is passed in via the `hp` dictionary and returned inside
## `per_actor[*].hp_after`; nothing here reads or mutates ambient state.
## The single injected [RandomNumberGenerator] is the LAST parameter of every
## randomness-consuming function and is threaded down every sub-call
## (D.2/D.3/D.5/D.8/D.11) — no function creates its own RNG.

const OUTCOME_WIN: String = "win"
const OUTCOME_LOSE: String = "lose"
const OUTCOME_NO_OUTCOME: String = "no_outcome"


# ─── D.8 — Resolve one strike (chains D.3 → D.7) ──────────────────────────────

## Resolves a single strike from `attacker` against `defender`.
##
## `hp_defender` is the defender's HP entering the strike. `attacker_skill_tier`
## / `defender_skill_tier` are the skill tiers of each side's chosen action
## this exchange ([constant CombatFormulas.NO_SKILL_TIER] when not a skill) —
## D.1 penalties are recomputed from them here, every strike, never cached.
## `defender_is_defending` comes from the CALLER (D.9) reading the defender's
## action this exchange — D.8 never infers it.
##
## Returns the internal strike struct
## `{hit: bool, crit: bool|null, damage: int, heal: int, hp_defender_after: int}`
## — NOT the final `locked_result` shape (see Core Rule #11).
static func resolve_attack(attacker: Combatant, defender: Combatant,
		hp_defender: int, attacker_skill_tier: int, defender_skill_tier: int,
		defender_is_defending: bool, tuning: CombatTuning,
		rng: RandomNumberGenerator) -> Dictionary:
	var acc: float = CombatFormulas.effective_stat_for(
		attacker, Combatant.STAT_ACC, defender, attacker_skill_tier, tuning)
	var ne: float = CombatFormulas.effective_stat_for(
		defender, Combatant.STAT_NE, attacker, defender_skill_tier, tuning)
	var hit: bool = CombatFormulas.roll_hit(acc, ne, tuning, rng)
	if not hit:
		return {"hit": false, "crit": null, "damage": 0, "heal": 0,
			"hp_defender_after": hp_defender}
	var atk: float = CombatFormulas.effective_stat_for(
		attacker, Combatant.STAT_ATK, defender, attacker_skill_tier, tuning)
	var def: float = CombatFormulas.effective_stat_for(
		defender, Combatant.STAT_DEF, attacker, defender_skill_tier, tuning)
	var raw: float = CombatFormulas.raw_damage(atk, def, tuning)
	var crit_rate: float = CombatFormulas.effective_stat_for(
		attacker, Combatant.STAT_CRIT_RATE, defender, attacker_skill_tier, tuning)
	var is_crit: bool = CombatFormulas.roll_crit(crit_rate, rng)
	var crit_damage: float = CombatFormulas.effective_stat_for(
		attacker, Combatant.STAT_CRIT_DAMAGE, defender, attacker_skill_tier, tuning)
	var cmult: float = CombatFormulas.crit_multiplier(is_crit, crit_damage)
	var amp: float = CombatFormulas.effective_stat_for(
		attacker, Combatant.STAT_AMP, defender, attacker_skill_tier, tuning)
	var mitigation: float = CombatFormulas.effective_stat_for(
		defender, Combatant.STAT_MITIGATION, attacker, defender_skill_tier, tuning)
	var damage: int = CombatFormulas.final_damage(
		raw, cmult, amp, mitigation, defender_is_defending, tuning)
	var lifesteal: float = CombatFormulas.effective_stat_for(
		attacker, Combatant.STAT_LIFESTEAL, defender, attacker_skill_tier, tuning)
	var heal: int = CombatFormulas.lifesteal_heal(damage, lifesteal)
	return {"hit": true, "crit": is_crit, "damage": damage, "heal": heal,
		"hp_defender_after": maxi(0, hp_defender - damage)}


# ─── D.9 — Resolve one exchange (central formula) ─────────────────────────────

## Single entry point the Turn Manager invokes per exchange.
##
## AUTHORITATIVE full parameter list (per ADR-0001 — includes the parameters
## the round-3/4 reviews found missing from the GDD pseudocode signature:
## `hp`, `exchange_id`, `thuc_id_of`, `player_id`, `rng`):
## - `a`, `b`: the two combatants (order-agnostic; labels come from D.2).
## - `hp`: `{actor_id: int}` — current HP entering the exchange (not mutated).
## - `action_type_of`: `{actor_id: "skill"|"defend"|"flee"}` — actions already
##   chosen (player via UI, NPC via CombatNpc). "item" does not exist in MVP.
## - `thuc_id_of`: `{actor_id: String|null}` — the specific thức chosen
##   (null unless action is "skill"; may be "basic_attack").
## - `thuc_tier_of`: `{actor_id: int}` — tier of the chosen thức (source for
##   D.1's skill_tier_used; ignored for non-skill actions).
## - `exchange_id`: 1-based per-battle exchange counter (Core Rule #1).
## - `player_id`: which actor is the player — translates neutral A/B labels
##   into outcome.type "win"/"lose" (D.9b/D.9c).
## - `is_spar_friendly`: battle-level flag, read once at battle init.
## - `spar_parity_eligible`: D.9b parity gate, computed ONCE at battle init
##   via [method CombatFormulas.compute_spar_parity_eligible] and cached.
## - `tuning`: injected knob config.
## - `rng`: the single injected RNG stream for the whole exchange.
##
## Returns the `locked_result` dictionary — EXACTLY the 6 outer fields of
## Core Rule #11: `exchange_id`, `first_id`, `second_id`, `per_actor`,
## `battle_active`, `outcome` (no extra fields).
static func resolve_exchange(a: Combatant, b: Combatant, hp: Dictionary,
		action_type_of: Dictionary, thuc_id_of: Dictionary, thuc_tier_of: Dictionary,
		exchange_id: int, player_id: String, is_spar_friendly: bool,
		spar_parity_eligible: bool, tuning: CombatTuning,
		rng: RandomNumberGenerator) -> Dictionary:
	var actors: Dictionary = {a.actor_id: a, b.actor_id: b}
	var hp_now: Dictionary = {
		a.actor_id: int(hp[a.actor_id]),
		b.actor_id: int(hp[b.actor_id]),
	}
	var outcome: Variant = null # stays null on the battle-continues branch

	# (0) Canonical order labels via D.2 FIRST — deterministic iteration order
	#     for the flee check below (round-3 fix: no implementation-defined
	#     iteration when both sides flee).
	var spd_of: Dictionary = {}
	for actor_id: String in actors.keys():
		var actor: Combatant = actors[actor_id]
		var opponent: Combatant = _opponent_of(actors, actor_id)
		spd_of[actor_id] = CombatFormulas.effective_stat_for(
			actor, Combatant.STAT_SPD, opponent,
			_skill_tier_used(action_type_of, thuc_tier_of, actor_id), tuning)
	var order: Array[String] = CombatFormulas.determine_order(
		a.actor_id, b.actor_id, spd_of[a.actor_id], spd_of[b.actor_id], rng)
	var order_first: String = order[0]
	var order_second: String = order[1]

	# (1) Flee has priority over SPD order (Core Rule #9 / D.11).
	var failed_fleer: String = ""
	var both_fled_failed: bool = false
	for x_id: String in [order_first, order_second]:
		if String(action_type_of[x_id]) != CombatFormulas.ACTION_FLEE:
			continue
		var opp_id: String = _other_id(a, b, x_id)
		var flee_success: bool = CombatFormulas.roll_flee(
			spd_of[x_id], spd_of[opp_id], tuning, rng)
		if flee_success:
			var per_actor_flee: Dictionary = {}
			per_actor_flee[x_id] = _per_actor_entry(null, CombatFormulas.ACTION_FLEE,
				true, null, null, 0, 0, hp_now[x_id])
			# Opponent's chosen-but-never-executed thức never leaks (schema
			# exception, round 3): thuc_id is ALWAYS null on this branch.
			per_actor_flee[opp_id] = _per_actor_entry(null,
				String(action_type_of[opp_id]), false, null, null, 0, 0,
				hp_now[opp_id])
			return _locked_result(exchange_id, x_id, opp_id, per_actor_flee,
				false, _outcome(OUTCOME_NO_OUTCOME, null, null))
		if failed_fleer != "":
			both_fled_failed = true
		else:
			failed_fleer = x_id

	# Neither side escaped. A single failed fleer concedes `first` to the
	# opponent; both-failed (or no fleer) keeps the D.2 labels.
	var first_id: String = order_first
	var second_id: String = order_second
	if failed_fleer != "" and not both_fled_failed:
		first_id = _other_id(a, b, failed_fleer)
		second_id = failed_fleer

	var first: Combatant = actors[first_id]
	var second: Combatant = actors[second_id]
	var battle_active: bool = true

	# (2) First strike — only when the first actor's action is "skill".
	var r1: Dictionary
	if String(action_type_of[first_id]) == CombatFormulas.ACTION_SKILL:
		r1 = resolve_attack(first, second, hp_now[second_id],
			_skill_tier_used(action_type_of, thuc_tier_of, first_id),
			_skill_tier_used(action_type_of, thuc_tier_of, second_id),
			String(action_type_of[second_id]) == CombatFormulas.ACTION_DEFEND,
			tuning, rng)
		hp_now[second_id] = int(r1["hp_defender_after"])
		# D.7: lifesteal heals the attacker as part of fully resolving the
		# strike (the GDD's D.9 pseudocode records but never applies the heal
		# — mechanical omission resolved here per D.7's explicit hp' formula).
		hp_now[first_id] = CombatFormulas.apply_heal(
			hp_now[first_id], first.max_hp, int(r1["heal"]))
	else:
		r1 = _no_attack_result(hp_now[second_id])

	var r2: Dictionary
	var r2_executed: bool = true
	if hp_now[second_id] == 0:
		# EARLY INTERRUPT (Core Rule #2): the second strike never executes.
		r2 = _no_attack_result(hp_now[first_id])
		r2_executed = false
		battle_active = false
		outcome = reclassify_outcome(first_id, second_id, hp_now, actors,
			player_id, spar_parity_eligible, tuning)
	else:
		if String(action_type_of[second_id]) == CombatFormulas.ACTION_SKILL:
			r2 = resolve_attack(second, first, hp_now[first_id],
				_skill_tier_used(action_type_of, thuc_tier_of, second_id),
				_skill_tier_used(action_type_of, thuc_tier_of, first_id),
				String(action_type_of[first_id]) == CombatFormulas.ACTION_DEFEND,
				tuning, rng)
			hp_now[first_id] = int(r2["hp_defender_after"])
			hp_now[second_id] = CombatFormulas.apply_heal(
				hp_now[second_id], second.max_hp, int(r2["heal"]))
		else:
			r2 = _no_attack_result(hp_now[first_id])
		if hp_now[first_id] == 0:
			battle_active = false
			outcome = reclassify_outcome(second_id, first_id, hp_now, actors,
				player_id, spar_parity_eligible, tuning)
		else:
			# (3) Battle continues: D.10 regen, then D.4b exhaustion drain —
			#     BOTH drains computed unconditionally before any death check
			#     (round-3 fix: sequential early-return made the higher-SPD
			#     actor lose 100% of symmetric attrition battles, 0/300).
			for actor_id: String in [first_id, second_id]:
				var actor: Combatant = actors[actor_id]
				var opponent: Combatant = _opponent_of(actors, actor_id)
				var hp_regen: float = CombatFormulas.effective_stat_for(
					actor, Combatant.STAT_HP_REGEN, opponent,
					_skill_tier_used(action_type_of, thuc_tier_of, actor_id),
					tuning)
				hp_now[actor_id] = CombatFormulas.regen_hp(
					hp_now[actor_id], actor.max_hp, hp_regen, exchange_id, tuning)
			# hp_pct_pre_drain: measured right before this exchange's drain,
			# WITH the mandatory float() cast + maxi(max_HP, 1) guard (the
			# round-4 escalation finding: without them this tiebreak
			# degenerates into a hidden coin flip in symmetric scenarios).
			var hp_pct_pre_drain: Dictionary = {
				first_id: CombatFormulas.hp_pct(hp_now[first_id], first.max_hp),
				second_id: CombatFormulas.hp_pct(hp_now[second_id], second.max_hp),
			}
			var d_first: int = CombatFormulas.exhaustion_drain(
				first.max_hp, exchange_id, tuning)
			var d_second: int = CombatFormulas.exhaustion_drain(
				second.max_hp, exchange_id, tuning)
			hp_now[first_id] = maxi(0, hp_now[first_id] - d_first)
			hp_now[second_id] = maxi(0, hp_now[second_id] - d_second)
			var first_dead: bool = hp_now[first_id] == 0
			var second_dead: bool = hp_now[second_id] == 0
			if first_dead and second_dead:
				# "Mutual exhaustion" — the only legal simultaneous-zero in
				# the whole system (D.4b). Tiebreak on pre-drain HP%.
				battle_active = false
				var winner: String
				if hp_pct_pre_drain[first_id] != hp_pct_pre_drain[second_id]:
					winner = first_id \
						if hp_pct_pre_drain[first_id] > hp_pct_pre_drain[second_id] \
						else second_id
				else:
					winner = CombatFormulas.coin_flip(first_id, second_id, rng)
				var loser: String = _other_id(a, b, winner)
				outcome = _outcome(
					OUTCOME_WIN if winner == player_id else OUTCOME_LOSE,
					winner, loser)
			elif first_dead:
				battle_active = false
				outcome = reclassify_outcome(second_id, first_id, hp_now, actors,
					player_id, spar_parity_eligible, tuning)
			elif second_dead:
				battle_active = false
				outcome = reclassify_outcome(first_id, second_id, hp_now, actors,
					player_id, spar_parity_eligible, tuning)
			# else: both survive the drain — battle_active stays true,
			# outcome stays null.

	# (4) Explicit per-actor assembly — r1 targets `second`, r2 targets
	#     `first`, so each actor's hp_after comes from hp_now[that actor],
	#     never from a spread of r1/r2 (round-2 hp swap bug).
	var per_actor: Dictionary = {}
	per_actor[first_id] = _per_actor_entry(
		_thuc_id_for(action_type_of, thuc_id_of, first_id),
		String(action_type_of[first_id]),
		true, # `first` is never interrupted
		r1["hit"], r1["crit"], int(r1["damage"]), int(r1["heal"]),
		hp_now[first_id])
	per_actor[second_id] = _per_actor_entry(
		_thuc_id_for(action_type_of, thuc_id_of, second_id),
		String(action_type_of[second_id]),
		r2_executed,
		r2["hit"], r2["crit"], int(r2["damage"]), int(r2["heal"]),
		hp_now[second_id])

	# (5) D.9c — explicit hookup: checked only AFTER the exchange fully
	#     resolved (regen + drain included), so the cap exchange itself runs
	#     at full exhaustion effect before the tiebreak can intervene.
	if battle_active and exchange_id >= tuning.TECHNICAL_EXCHANGE_CAP:
		battle_active = false
		outcome = technical_cap_outcome(a, b, hp_now, player_id,
			is_spar_friendly, rng)

	return _locked_result(exchange_id, first_id, second_id, per_actor,
		battle_active, outcome)


# ─── D.9b — Friendly-spar draw: parity gate & reclassification ────────────────

## Reclassifies an HP=0 result into `no_outcome` when the battle is an
## eligible friendly spar AND the nominal winner ended at critically low HP.
## `spar_parity_eligible` is the battle-init cached gate (see
## [method CombatFormulas.compute_spar_parity_eligible]); outside spars it is
## always false, so this returns the plain D.9 outcome.
static func reclassify_outcome(nominal_winner_id: String, nominal_loser_id: String,
		hp: Dictionary, actors: Dictionary, player_id: String,
		spar_parity_eligible: bool, tuning: CombatTuning) -> Dictionary:
	var winner: Combatant = actors[nominal_winner_id]
	var winner_hp_pct: float = CombatFormulas.hp_pct(
		int(hp[nominal_winner_id]), winner.max_hp)
	if spar_parity_eligible and winner_hp_pct <= tuning.SPAR_LOW_HP_THRESHOLD:
		return _outcome(OUTCOME_NO_OUTCOME, null, null)
	return _outcome(
		OUTCOME_WIN if nominal_winner_id == player_id else OUTCOME_LOSE,
		nominal_winner_id, nominal_loser_id)


# ─── D.9c — Technical-cap tiebreak ────────────────────────────────────────────

## Outcome when TECHNICAL_EXCHANGE_CAP is reached with the battle still
## active. Friendly spar → no_outcome; otherwise a MANDATORY win/lose via
## the HP% tiebreak (coin flip only on an exact HP% tie).
static func technical_cap_outcome(a: Combatant, b: Combatant, hp: Dictionary,
		player_id: String, is_spar_friendly: bool,
		rng: RandomNumberGenerator) -> Dictionary:
	if is_spar_friendly:
		return _outcome(OUTCOME_NO_OUTCOME, null, null)
	var pct_a: float = CombatFormulas.hp_pct(int(hp[a.actor_id]), a.max_hp)
	var pct_b: float = CombatFormulas.hp_pct(int(hp[b.actor_id]), b.max_hp)
	var winner: String
	if pct_a != pct_b:
		winner = a.actor_id if pct_a > pct_b else b.actor_id
	else:
		winner = CombatFormulas.coin_flip(a.actor_id, b.actor_id, rng)
	var loser: String = _other_id(a, b, winner)
	return _outcome(OUTCOME_WIN if winner == player_id else OUTCOME_LOSE,
		winner, loser)


# ─── Internal helpers ─────────────────────────────────────────────────────────

static func _skill_tier_used(action_type_of: Dictionary, thuc_tier_of: Dictionary,
		actor_id: String) -> int:
	if String(action_type_of[actor_id]) == CombatFormulas.ACTION_SKILL:
		return int(thuc_tier_of.get(actor_id, CombatFormulas.BASIC_ATTACK_TIER))
	return CombatFormulas.NO_SKILL_TIER


static func _thuc_id_for(action_type_of: Dictionary, thuc_id_of: Dictionary,
		actor_id: String) -> Variant:
	if String(action_type_of[actor_id]) == CombatFormulas.ACTION_SKILL:
		return thuc_id_of.get(actor_id)
	return null


static func _other_id(a: Combatant, b: Combatant, actor_id: String) -> String:
	return b.actor_id if actor_id == a.actor_id else a.actor_id


static func _opponent_of(actors: Dictionary, actor_id: String) -> Combatant:
	for other_id: String in actors.keys():
		if other_id != actor_id:
			return actors[other_id]
	return actors[actor_id] # unreachable for well-formed input


static func _no_attack_result(hp_defender: int) -> Dictionary:
	return {"hit": null, "crit": null, "damage": 0, "heal": 0,
		"hp_defender_after": hp_defender}


static func _per_actor_entry(thuc_id: Variant, action_type: String, executed: bool,
		hit: Variant, crit: Variant, damage_dealt: int, heal: int,
		hp_after: int) -> Dictionary:
	return {
		"thuc_id": thuc_id,
		"action_type": action_type,
		"executed": executed,
		"hit": hit,
		"crit": crit,
		"damage_dealt": damage_dealt,
		"heal": heal,
		"hp_after": hp_after,
	}


static func _outcome(type: String, winner_id: Variant, loser_id: Variant) -> Dictionary:
	return {"type": type, "winner_id": winner_id, "loser_id": loser_id}


static func _locked_result(exchange_id: int, first_id: String, second_id: String,
		per_actor: Dictionary, battle_active: bool, outcome: Variant) -> Dictionary:
	return {
		"exchange_id": exchange_id,
		"first_id": first_id,
		"second_id": second_id,
		"per_actor": per_actor,
		"battle_active": battle_active,
		"outcome": outcome,
	}
