class_name CombatConvergenceLib
extends RefCounted
## Shared model for the AC-47a / AC-47b convergence sweeps, migrated from the
## frozen Python harness (`prototypes/combat-reference/harness.py`, archival
## per ADR-0001 migration step 6).
##
## Unlike the Python harness, this drives the REAL production resolver
## (`CombatResolver.resolve_exchange`) — the thing being verified IS the
## thing that ships:
## - Deterministic mode (AC-47a): both sides choose "defend" every exchange —
##   no attacks, no crit, no lifesteal — so only D.1/D.4b/D.10 shape the HP
##   trajectory, exactly the harness's `no_attacks=True` model.
## - Monte Carlo mode (AC-47b, ADVISORY): both sides basic-attack every
##   exchange, with real D.3 hit rolls.

## Safe-Range sweep axes — identical grid to harness.py Q1/Q1-FIXED
## (3 x 2 x 2 x 3 x 3 = 108 combinations).
const SWEEP_DRAIN_PCTS: Array[float] = [0.05, 0.10, 0.15]
const SWEEP_REGEN_CAPS: Array[float] = [0.02, 0.05]
const SWEEP_ONSETS: Array[int] = [40, 80]
const SWEEP_CAPS: Array[int] = [100, 200, 500]
const SWEEP_HP_REGENS: Array[float] = [0.0, 0.5, 1.0]

## Minimum exhaustion window required by the Tuning Knobs cross-constraint #2:
## TECHNICAL_EXCHANGE_CAP - EXHAUSTION_ONSET_EXCHANGE >= 120.
const MIN_EXHAUSTION_WINDOW: int = 120


## Symmetric worst-case combatant (ATK == DEF — chip floor on every hit),
## matching harness.py's `worst_case_actor`.
static func worst_case_combatant(actor_id: String, hp_regen: float, spd: float) -> Combatant:
	return Combatant.create(actor_id, 1, 0, 200, {
		Combatant.STAT_ATK: 50.0,
		Combatant.STAT_DEF: 50.0,
		Combatant.STAT_ACC: 50.0,
		Combatant.STAT_NE: 50.0,
		Combatant.STAT_SPD: spd,
		Combatant.STAT_CRIT_RATE: 0.0,
		Combatant.STAT_CRIT_DAMAGE: 1.0,
		Combatant.STAT_AMP: 0.0,
		Combatant.STAT_MITIGATION: 0.0,
		Combatant.STAT_LIFESTEAL: 0.0,
		Combatant.STAT_HP_REGEN: hp_regen,
	})


## Runs one attrition battle through the real resolver until it concludes or
## TECHNICAL_EXCHANGE_CAP is reached.
##
## Returns `{converged: bool, exchange_id: int, winner_id: String,
## hp_a: int, hp_b: int}` — `converged` means a genuine HP=0 ending (a D.9c
## cap tiebreak, where both sides are still above 0, does NOT count).
static func run_attrition_battle(a: Combatant, b: Combatant, tuning: CombatTuning,
		seed_value: int, use_attacks: bool) -> Dictionary:
	var rng: RandomNumberGenerator = RandomNumberGenerator.new()
	rng.seed = seed_value
	var action: String = CombatFormulas.ACTION_SKILL if use_attacks \
		else CombatFormulas.ACTION_DEFEND
	var action_type_of: Dictionary = {a.actor_id: action, b.actor_id: action}
	var thuc_id_of: Dictionary = {}
	var thuc_tier_of: Dictionary = {}
	if use_attacks:
		thuc_id_of = {
			a.actor_id: CombatFormulas.BASIC_ATTACK_ID,
			b.actor_id: CombatFormulas.BASIC_ATTACK_ID,
		}
		thuc_tier_of = {
			a.actor_id: CombatFormulas.BASIC_ATTACK_TIER,
			b.actor_id: CombatFormulas.BASIC_ATTACK_TIER,
		}
	var hp: Dictionary = {a.actor_id: a.max_hp, b.actor_id: b.max_hp}
	for exchange_id: int in range(1, tuning.TECHNICAL_EXCHANGE_CAP + 1):
		var result: Dictionary = CombatResolver.resolve_exchange(
			a, b, hp, action_type_of, thuc_id_of, thuc_tier_of, exchange_id,
			a.actor_id, false, false, tuning, rng)
		var per_actor: Dictionary = result["per_actor"]
		hp[a.actor_id] = int(per_actor[a.actor_id]["hp_after"])
		hp[b.actor_id] = int(per_actor[b.actor_id]["hp_after"])
		if not bool(result["battle_active"]):
			var hp_zero: bool = hp[a.actor_id] == 0 or hp[b.actor_id] == 0
			var outcome: Dictionary = result["outcome"]
			var winner_id: String = "" if outcome["winner_id"] == null \
				else String(outcome["winner_id"])
			return {"converged": hp_zero, "exchange_id": exchange_id,
				"winner_id": winner_id, "hp_a": hp[a.actor_id],
				"hp_b": hp[b.actor_id]}
	return {"converged": false, "exchange_id": tuning.TECHNICAL_EXCHANGE_CAP,
		"winner_id": "", "hp_a": hp[a.actor_id], "hp_b": hp[b.actor_id]}


## AC-47a — deterministic Safe-Range sweep over all 108 combinations.
##
## Returns `{total, converged, constraint_violations, unexpected_failures}`
## where `constraint_violations` are the non-converging combos that violate
## cross-constraint #2 (window < 120 — expected, flagged explicitly, never a
## silent skip) and `unexpected_failures` are non-converging combos that
## SATISFY the constraint (must be empty for the gate to pass).
## Each combo entry is `{drain, regen_cap, onset, cap, hp_regen, window}`.
static func run_deterministic_sweep() -> Dictionary:
	var total: int = 0
	var converged: int = 0
	var constraint_violations: Array[Dictionary] = []
	var unexpected_failures: Array[Dictionary] = []
	for drain: float in SWEEP_DRAIN_PCTS:
		for regen_cap: float in SWEEP_REGEN_CAPS:
			for onset: int in SWEEP_ONSETS:
				for cap: int in SWEEP_CAPS:
					if onset >= cap:
						continue
					for hp_regen: float in SWEEP_HP_REGENS:
						total += 1
						var tuning: CombatTuning = CombatTuning.from_dict({
							"EXHAUSTION_DRAIN_PCT": drain,
							"HP_REGEN_CAP": regen_cap,
							"EXHAUSTION_ONSET_EXCHANGE": onset,
							"TECHNICAL_EXCHANGE_CAP": cap,
						})
						var a: Combatant = worst_case_combatant("A", hp_regen, 50.0)
						var b: Combatant = worst_case_combatant("B", hp_regen, 50.0)
						var res: Dictionary = run_attrition_battle(
							a, b, tuning, 1, false)
						if bool(res["converged"]):
							converged += 1
						else:
							var combo: Dictionary = {
								"drain": drain, "regen_cap": regen_cap,
								"onset": onset, "cap": cap,
								"hp_regen": hp_regen, "window": cap - onset,
							}
							if cap - onset < MIN_EXHAUSTION_WINDOW:
								constraint_violations.append(combo)
							else:
								unexpected_failures.append(combo)
	return {"total": total, "converged": converged,
		"constraint_violations": constraint_violations,
		"unexpected_failures": unexpected_failures}


## Q3b migration — SPD-bias fairness check: A has strictly higher SPD (always
## `first`); under the fixed symmetric drain order the win split must be fair,
## not 0%/100%. Returns `{a_wins, b_wins, non_converged}`.
static func run_spd_bias_check(battles: int) -> Dictionary:
	var tuning: CombatTuning = CombatTuning.from_dict({
		"EXHAUSTION_ONSET_EXCHANGE": 40,
		"TECHNICAL_EXCHANGE_CAP": 200,
	})
	var a_wins: int = 0
	var b_wins: int = 0
	var non_converged: int = 0
	for seed_value: int in range(battles):
		var a: Combatant = worst_case_combatant("A", 0.05, 51.0)
		var b: Combatant = worst_case_combatant("B", 0.05, 50.0)
		var res: Dictionary = run_attrition_battle(a, b, tuning, seed_value, false)
		if not bool(res["converged"]):
			non_converged += 1
		elif String(res["winner_id"]) == "A":
			a_wins += 1
		else:
			b_wins += 1
	return {"a_wins": a_wins, "b_wins": b_wins, "non_converged": non_converged}


## AC-47b (ADVISORY) — Monte Carlo sweep with real D.3 hit rolls: both sides
## basic-attack every exchange. Returns per-combo convergence percentages.
static func run_monte_carlo_sweep(seeds_per_combo: int) -> Array[Dictionary]:
	var rows: Array[Dictionary] = []
	for drain: float in SWEEP_DRAIN_PCTS:
		for regen_cap: float in SWEEP_REGEN_CAPS:
			for onset: int in SWEEP_ONSETS:
				for cap: int in SWEEP_CAPS:
					if onset >= cap:
						continue
					for hp_regen: float in SWEEP_HP_REGENS:
						var tuning: CombatTuning = CombatTuning.from_dict({
							"EXHAUSTION_DRAIN_PCT": drain,
							"HP_REGEN_CAP": regen_cap,
							"EXHAUSTION_ONSET_EXCHANGE": onset,
							"TECHNICAL_EXCHANGE_CAP": cap,
						})
						var converged: int = 0
						for seed_value: int in range(seeds_per_combo):
							var a: Combatant = worst_case_combatant("A", hp_regen, 50.0)
							var b: Combatant = worst_case_combatant("B", hp_regen, 50.0)
							var res: Dictionary = run_attrition_battle(
								a, b, tuning, seed_value, true)
							if bool(res["converged"]):
								converged += 1
						rows.append({
							"drain": drain, "regen_cap": regen_cap,
							"onset": onset, "cap": cap, "hp_regen": hp_regen,
							"window": cap - onset,
							"converged": converged, "battles": seeds_per_combo,
						})
	return rows
