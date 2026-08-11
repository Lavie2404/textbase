class_name CombatNpc
extends RefCounted
## NPC decision logic — Core Rule #2 (two-tier decision) and formula D.14
## (thức selection). System logic only — the LLM never chooses NPC actions
## (Contract Enforcement).
##
## Thức entries are dictionaries `{"thuc_id": String, "tier": int}` drawn from
## the NPC's unused thức list for this battle (no-repeat rule, Core Rule #5).

## Key for a thức's unique id inside a thức entry dictionary.
const KEY_THUC_ID: String = "thuc_id"
## Key for a thức's skill tier inside a thức entry dictionary.
const KEY_TIER: String = "tier"


## D.14 — deterministic ordered pool the uniform pick draws from.
##
## Preference: `eligible_low` (thức whose tier <= NPC tier — no D.1 gear-gap
## self-penalty), else `eligible_all` (forced to accept the penalty), else
## the `basic_attack` fallback. Pool-set selection is fully deterministic
## (no RNG); the returned list is sorted by thuc_id ascending so two
## compliant implementations always produce the same order.
static func chosen_pool(npc_tier: int, unused_thucs: Array) -> Array[String]:
	var eligible_low: Array[String] = []
	var eligible_all: Array[String] = []
	for entry: Dictionary in unused_thucs:
		var thuc_id: String = String(entry[KEY_THUC_ID])
		eligible_all.append(thuc_id)
		if int(entry[KEY_TIER]) <= npc_tier:
			eligible_low.append(thuc_id)
	var pool: Array[String]
	if not eligible_low.is_empty():
		pool = eligible_low
	elif not eligible_all.is_empty():
		pool = eligible_all
	else:
		pool = [CombatFormulas.BASIC_ATTACK_ID]
	pool.sort()
	return pool


## D.14 — uniform pick from the chosen pool (P = 1/|pool| for every entry,
## NOT tier-weighted). `chosen_index` is clamped to |pool|-1 in-formula so a
## roll of exactly 1.0 can never index out of bounds (round-3 fix).
static func choose_thuc(npc_tier: int, unused_thucs: Array,
		rng: RandomNumberGenerator) -> String:
	var pool: Array[String] = chosen_pool(npc_tier, unused_thucs)
	var chosen_index: int = mini(
		int(floor(rng.randf() * float(pool.size()))), pool.size() - 1)
	return pool[chosen_index]


## Core Rule #2 — the NPC's full action decision for one exchange.
##
## Tier 1 (survival): flee when HP% is under NPC_FLEE_HP_THRESHOLD — DISABLED
## in friendly spars (round-3 fix: Tier 1 must never preempt D.9b's graceful
## draw). Tier 2: pick a thức via D.14. The NPC NEVER chooses "defend"
## (intentional scope boundary, AC-53).
##
## Returns `{"action_type": "skill"|"flee", "thuc_id": String|null}`.
static func choose_action(npc: Combatant, hp_npc: int, is_spar_friendly: bool,
		unused_thucs: Array, tuning: CombatTuning,
		rng: RandomNumberGenerator) -> Dictionary:
	if not is_spar_friendly \
			and CombatFormulas.hp_pct(hp_npc, npc.max_hp) < tuning.NPC_FLEE_HP_THRESHOLD:
		return {"action_type": CombatFormulas.ACTION_FLEE, "thuc_id": null}
	return {
		"action_type": CombatFormulas.ACTION_SKILL,
		"thuc_id": choose_thuc(npc.tier, unused_thucs, rng),
	}
