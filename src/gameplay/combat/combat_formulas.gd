class_name CombatFormulas
extends RefCounted
## Pure combat math — GDD formulas D.1-D.7 and D.10-D.13.
##
## NORMATIVE reference implementation per ADR-0001: signatures, types,
## execution order, division semantics and RNG threading defined HERE are
## authoritative; `design/gdd/combat-system.md` Section D describes them.
##
## Every function is pure: all state in via parameters, results out via
## return values. Every function that consumes randomness takes a single
## injected [RandomNumberGenerator] as its LAST parameter — no autoloads,
## no globals, no self-seeding.

## Sentinel for "the acting character is not using a skill this exchange"
## (defend / flee / interrupted): D.1 then drops the skill term of gap_gear.
const NO_SKILL_TIER: int = -1

## Action-type values (Core Rule #11 schema; "item" was cut from MVP scope).
const ACTION_SKILL: String = "skill"
const ACTION_DEFEND: String = "defend"
const ACTION_FLEE: String = "flee"

## The always-available fallback action id (Core Rule #5 / D.12 — exempt
## from the no-repeat rule and from max_invocations_per_battle).
const BASIC_ATTACK_ID: String = "basic_attack"

## Skill tier used when the chosen action is "Đánh thường" (basic attack):
## its own low rank — never above the character's tier, so it never adds
## a gear-gap penalty term (tier(C) >= 1 always holds upstream).
const BASIC_ATTACK_TIER: int = 0

## Sentinel returned by [method estimate_ratio] when both sides have zero
## combat power (insufficient data — never displayed as a fake "1.0").
const RATIO_NA: String = "N/A"
## Sentinel returned by [method estimate_ratio] when only the opponent has
## zero combat power (no division by zero).
const RATIO_INF: String = "+∞"


## GDD rounding convention: 0.5 rounds up (values in this system are >= 0).
static func gdd_round(v: float) -> int:
	return int(floor(v + 0.5))


## HP percentage with the mandatory float() cast AND maxi(max_hp, 1) guard
## (D.9b/D.9c/D.9 `hp_pct_pre_drain` — the guard pair whose omission was the
## round-4 escalation's most severe finding). max_hp is guaranteed > 0
## upstream; the guard is defense-in-depth, not input validation.
static func hp_pct(hp: int, max_hp: int) -> float:
	return float(hp) / float(maxi(max_hp, 1))


# ─── D.1 — Effective stats (realm suppression & gear-gap penalty) ─────────────

## Adverse realm gap: how many tiers the opponent is ABOVE c (0 if not behind).
static func gap_realm(tier_c: int, tier_opponent: int) -> int:
	return maxi(0, tier_opponent - tier_c)


## Adverse gear gap: how far weapon/skill tiers exceed the character's own
## tier. `skill_tier_used` only exists when the action is "skill"; pass
## [constant NO_SKILL_TIER] for defend/flee to drop the skill term.
static func gap_gear(weapon_tier: int, tier_c: int, skill_tier_used: int) -> int:
	var gap: int = maxi(0, weapon_tier - tier_c)
	if skill_tier_used != NO_SKILL_TIER:
		gap = maxi(gap, skill_tier_used - tier_c)
	return gap


## Per-layer penalty multiplier (D.1).
static func layer_mult(gap: int, tuning: CombatTuning) -> float:
	return clampf(1.0 - tuning.PENALTY_PER_TIER * float(gap), tuning.FLOOR_LAYER, 1.0)


## Total penalty multiplier across realm layer x gear layer x crippled layer,
## floored at FLOOR_TOTAL (D.1). Never reaches 0.
static func total_penalty_multiplier(realm_gap: int, gear_gap: int,
		crippled: bool, tuning: CombatTuning) -> float:
	var crippled_layer: float = tuning.CRIPPLED_PENALTY_MULT if crippled else 1.0
	return clampf(
		layer_mult(realm_gap, tuning) * layer_mult(gear_gap, tuning) * crippled_layer,
		tuning.FLOOR_TOTAL, 1.0)


## Effective stat value from an explicit base value and gaps (D.1).
static func effective_stat(base_x: float, realm_gap: int, gear_gap: int,
		crippled: bool, tuning: CombatTuning) -> float:
	return base_x * total_penalty_multiplier(realm_gap, gear_gap, crippled, tuning)


## Effective stat for combatant `c` against `opponent`, given the skill tier
## used this exchange (or [constant NO_SKILL_TIER]). Recomputed EVERY exchange
## — never cached across exchanges (Core Rule #4 / AC-03).
static func effective_stat_for(c: Combatant, stat: String, opponent: Combatant,
		skill_tier_used: int, tuning: CombatTuning) -> float:
	return effective_stat(
		c.base_stat(stat),
		gap_realm(c.tier, opponent.tier),
		gap_gear(c.weapon_tier, c.tier, skill_tier_used),
		c.death_and_consequence_blocked,
		tuning)


# ─── D.2 — Strike order (SPD priority) ────────────────────────────────────────

## 50/50 pick between two actor ids using the injected RNG stream.
## NEVER self-seeded from exchange_id (round-1 fix — no cross-battle bias,
## true re-roll on Undo).
static func coin_flip(a_id: String, b_id: String, rng: RandomNumberGenerator) -> String:
	return a_id if rng.randf() < 0.5 else b_id


## Determines (first, second) by effective SPD, coin-flipping on an exact tie.
## Uses the exclusion structure `>` / `>` / else — no float `==` (Section D
## comparison convention). Returns `[first_id, second_id]`.
static func determine_order(a_id: String, b_id: String, spd_a: float, spd_b: float,
		rng: RandomNumberGenerator) -> Array[String]:
	var first_id: String
	if spd_a > spd_b:
		first_id = a_id
	elif spd_b > spd_a:
		first_id = b_id
	else:
		first_id = coin_flip(a_id, b_id, rng)
	var second_id: String = b_id if first_id == a_id else a_id
	return [first_id, second_id]


# ─── D.3 — Hit / miss (ACC vs Evasion) ────────────────────────────────────────

## Hit probability, clamped to [P_MIN, P_MAX] — never a guaranteed hit or miss.
static func hit_probability(acc_attacker: float, ne_defender: float,
		tuning: CombatTuning) -> float:
	return clampf(0.5 + tuning.K_HIT * (acc_attacker - ne_defender),
		tuning.P_MIN, tuning.P_MAX)


## Rolls the hit check against the injected RNG.
static func roll_hit(acc_attacker: float, ne_defender: float, tuning: CombatTuning,
		rng: RandomNumberGenerator) -> bool:
	return rng.randf() < hit_probability(acc_attacker, ne_defender, tuning)


# ─── D.4 — Raw damage (chip floor) ────────────────────────────────────────────

## Raw damage with the MIN_RAW_RATIO chip floor: a landed hit never deals
## exactly 0 raw damage while effective ATK > 0.
static func raw_damage(atk_attacker: float, def_defender: float,
		tuning: CombatTuning) -> float:
	return maxf(atk_attacker * tuning.MIN_RAW_RATIO, atk_attacker - def_defender)


# ─── D.4b — Progressive exhaustion ────────────────────────────────────────────

## Exhaustion ramp in [0, 1]: 0 before onset, linear to 1 at the technical cap.
## MANDATORY explicit float() casts — under raw int/int truncation this reads 0
## for almost the whole battle (0/108 Safe Range convergence, harness Q1).
## Denominator guarded with maxi(..., 1) against a misconfigured CAP == ONSET.
static func exhaustion_progress(exchange_id: int, tuning: CombatTuning) -> float:
	var num: float = float(exchange_id - tuning.EXHAUSTION_ONSET_EXCHANGE)
	var den: float = float(maxi(
		tuning.TECHNICAL_EXCHANGE_CAP - tuning.EXHAUSTION_ONSET_EXCHANGE, 1))
	return clampf(num / den, 0.0, 1.0)


## Multiplier that fades HP Regen out across the exhaustion window (D.4b (1)).
static func exhaustion_regen_mult(exchange_id: int, tuning: CombatTuning) -> float:
	return 1.0 - exhaustion_progress(exchange_id, tuning)


## Flat cumulative HP drain applied to BOTH sides at end of exchange
## (D.4b (2)) — independent of effective ATK/DEF by design.
static func exhaustion_drain(max_hp: int, exchange_id: int, tuning: CombatTuning) -> int:
	return gdd_round(float(max_hp) * tuning.EXHAUSTION_DRAIN_PCT
		* exhaustion_progress(exchange_id, tuning))


# ─── D.5 — Critical hits ──────────────────────────────────────────────────────

## Rolls whether this strike crits (only called when hit == true).
static func roll_crit(crit_rate: float, rng: RandomNumberGenerator) -> bool:
	return rng.randf() < clampf(crit_rate, 0.0, 1.0)


## Crit multiplier, floored at 1.0 — a crit never weakens a strike.
static func crit_multiplier(is_crit: bool, crit_damage: float) -> float:
	return maxf(1.0, crit_damage) if is_crit else 1.0


# ─── D.6 — Final damage (Amp x Mitigation x Defend) ───────────────────────────

## Final integer damage. The max(1, ...) floor applies whenever raw damage
## was > 0 (round-3 fix: a landed hit never rounds down to 0 true damage);
## raw_damage == 0 (absolute ATK-zero edge) still yields 0.
static func final_damage(p_raw_damage: float, p_crit_multiplier: float,
		amp_attacker: float, mitigation_defender: float,
		defender_is_defending: bool, tuning: CombatTuning) -> int:
	var pre_mitigation: float = p_raw_damage * p_crit_multiplier
	var final_multiplier: float = maxf(
		(1.0 + amp_attacker) * (1.0 - mitigation_defender), tuning.MIN_DMG_MULT)
	var defend_mult: float = (1.0 - tuning.DEFEND_DMG_REDUCTION_PCT) \
		if defender_is_defending else 1.0
	var final_damage_raw: int = gdd_round(pre_mitigation * final_multiplier * defend_mult)
	return maxi(1, final_damage_raw) if p_raw_damage > 0.0 else 0


# ─── D.7 — Lifesteal ──────────────────────────────────────────────────────────

## Heal gained by the attacker from damage actually dealt (post-D.6).
static func lifesteal_heal(p_final_damage: int, lifesteal_attacker: float) -> int:
	return gdd_round(float(p_final_damage) * lifesteal_attacker)


## Applies a heal without overhealing past max HP.
static func apply_heal(hp: int, max_hp: int, heal: int) -> int:
	return mini(max_hp, hp + heal)


# ─── D.10 — HP Regen (passive, end of exchange, conditional) ──────────────────

## End-of-exchange regen: effective_HPRegen hard-capped by HP_REGEN_CAP, then
## scaled by the exhaustion regen multiplier. Only called from the
## battle-continues branch of D.9.
static func regen_hp(hp: int, max_hp: int, effective_hp_regen: float,
		exchange_id: int, tuning: CombatTuning) -> int:
	var regen_pct_used: float = minf(effective_hp_regen, tuning.HP_REGEN_CAP)
	var gained: int = gdd_round(float(max_hp) * regen_pct_used
		* exhaustion_regen_mult(exchange_id, tuning))
	return mini(max_hp, hp + gained)


# ─── D.11 — Flee probability ──────────────────────────────────────────────────

## Flee success probability from the SPD difference, clamped to
## [P_MIN_FLEE, P_MAX_FLEE].
static func flee_probability(spd_fleeing: float, spd_opponent: float,
		tuning: CombatTuning) -> float:
	return clampf(0.5 + tuning.K_FLEE * (spd_fleeing - spd_opponent),
		tuning.P_MIN_FLEE, tuning.P_MAX_FLEE)


## Rolls the flee check against the injected RNG.
static func roll_flee(spd_fleeing: float, spd_opponent: float, tuning: CombatTuning,
		rng: RandomNumberGenerator) -> bool:
	return rng.randf() < flee_probability(spd_fleeing, spd_opponent, tuning)


# ─── D.12 — max_invocations_per_battle ────────────────────────────────────────

## Design-time constant derived once from CONTENT_EXCHANGE_ESTIMATE and the
## LOCKED registry value MAX_KNOWN_SKILLS_PER_CHARACTER. The float() cast
## before ceili is mandatory (int division would floor before ceil runs).
static func max_invocations_per_battle(tuning: CombatTuning) -> int:
	return ceili(float(tuning.CONTENT_EXCHANGE_ESTIMATE)
		/ float(maxi(CombatTuning.MAX_KNOWN_SKILLS_PER_CHARACTER, 1)))


## Content-sufficiency authoring check for one skill (closes Equipment GDD
## AC-11). A warning signal only — never blocks runtime actions.
static func is_pool_sufficient(thuc_count: int, tuning: CombatTuning) -> bool:
	return thuc_count >= max_invocations_per_battle(tuning)


# ─── D.13 — Stat points & pre-battle combat-power estimate ────────────────────

## Điểm_Chỉ_Số: weighted sum of BASE stats (display of potential — not the
## effective, penalized values). max(0, CritDamage - 1) blocks the only term
## that could go negative at the source.
static func stat_points(c: Combatant, tuning: CombatTuning) -> float:
	return tuning.w_HP * c.base_stat(Combatant.STAT_HP) \
		+ tuning.w_ATK * c.base_stat(Combatant.STAT_ATK) \
		+ tuning.w_DEF * c.base_stat(Combatant.STAT_DEF) \
		+ tuning.w_SPD * c.base_stat(Combatant.STAT_SPD) \
		+ tuning.w_ACC * c.base_stat(Combatant.STAT_ACC) \
		+ tuning.w_NE * c.base_stat(Combatant.STAT_NE) \
		+ tuning.w_CR * (c.base_stat(Combatant.STAT_CRIT_RATE) * 100.0) \
		+ tuning.w_CD * (maxf(0.0, c.base_stat(Combatant.STAT_CRIT_DAMAGE) - 1.0) * 100.0) \
		+ tuning.w_AMP * (c.base_stat(Combatant.STAT_AMP) * 100.0) \
		+ tuning.w_MIT * (c.base_stat(Combatant.STAT_MITIGATION) * 100.0) \
		+ tuning.w_LSTL * (c.base_stat(Combatant.STAT_LIFESTEAL) * 100.0) \
		+ tuning.w_REGEN * (c.base_stat(Combatant.STAT_HP_REGEN) * 100.0)


## Lực_chiến: stat points + external skill/equipment points, clamped >= 0 at
## the outer layer (second independent guard, D.13 round-2 fix).
static func luc_chien(c: Combatant, tuning: CombatTuning) -> float:
	return maxf(0.0, stat_points(c, tuning) + c.skill_points + c.equipment_points)


## Pre-battle estimate ratio. Returns a float, or the string sentinels
## [constant RATIO_NA] (both sides 0) / [constant RATIO_INF] (opponent 0).
## Display-only — NEVER used to decide outcomes (Core Rule #7).
static func estimate_ratio(luc_chien_self: float, luc_chien_opponent: float) -> Variant:
	if luc_chien_self == 0.0 and luc_chien_opponent == 0.0:
		return RATIO_NA
	if luc_chien_opponent == 0.0:
		return RATIO_INF
	return luc_chien_self / luc_chien_opponent


## Relative combat-power difference for the spar parity gate (D.9b).
## Denominator floored at 1 — no division by zero. Range [0, 1].
static func parity_diff(luc_chien_a: float, luc_chien_b: float) -> float:
	return absf(luc_chien_a - luc_chien_b) \
		/ maxf(maxf(luc_chien_a, luc_chien_b), 1.0)


## Spar parity eligibility — computed ONCE at battle init and cached by the
## caller for the whole battle (D.9b). Hard false when both sides have zero
## combat power (insufficient data), and always false outside friendly spars.
static func compute_spar_parity_eligible(luc_chien_a: float, luc_chien_b: float,
		is_spar_friendly: bool, tuning: CombatTuning) -> bool:
	if not is_spar_friendly:
		return false
	if luc_chien_a == 0.0 and luc_chien_b == 0.0:
		return false
	return parity_diff(luc_chien_a, luc_chien_b) <= tuning.SPAR_PARITY_TOLERANCE
