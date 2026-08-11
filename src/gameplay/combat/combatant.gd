class_name Combatant
extends RefCounted
## Immutable-per-battle snapshot of one combat participant.
##
## Pure data carrier for the Combat System reference implementation
## (ADR-0001). Base stats come from Character Card & Identity; tiers from
## EXP & Realm Progression / Equipment & Skill Data. Combat only READS these.
## Current HP is intentionally NOT stored here — it is threaded through
## `CombatResolver.resolve_exchange` via the `hp` parameter so the resolver
## stays a pure function.

## Canonical base-stat dictionary keys (see D.1's stat list).
const STAT_HP: String = "HP"
const STAT_ATK: String = "ATK"
const STAT_DEF: String = "DEF"
const STAT_ACC: String = "ACC"
const STAT_NE: String = "NE" # "Né tránh" (evasion)
const STAT_SPD: String = "SPD"
const STAT_CRIT_RATE: String = "CRIT_RATE"
const STAT_CRIT_DAMAGE: String = "CRIT_DAMAGE"
const STAT_AMP: String = "AMP" # "Khuếch đại sát thương"
const STAT_MITIGATION: String = "MITIGATION" # "Chống chịu"
const STAT_LIFESTEAL: String = "LIFESTEAL"
const STAT_HP_REGEN: String = "HP_REGEN"

## Unique actor id used as key in hp / action_type_of / per_actor maps.
var actor_id: String = ""
## Realm tier of the combatant (EXP & Realm Progression; always >= 1).
var tier: int = 1
## Tier of the equipped weapon (Equipment & Skill Data System).
var weapon_tier: int = 0
## Maximum HP ("vốn sinh mệnh" — never penalized by D.1). Must be > 0
## upstream; formulas add a defense-in-depth maxi(..., 1) guard regardless.
var max_hp: int = 1
## True while Death & Consequence has the combatant crippled
## (`death_and_consequence_blocked`). Combat only reads this flag (D.1).
var death_and_consequence_blocked: bool = false
## Base (unpenalized) stat values, keyed by the STAT_* constants above.
## Missing keys read as 0.0.
var base_stats: Dictionary = {}
## Điểm_Kỹ_Năng — external opaque input for D.13 (default 0).
var skill_points: float = 0.0
## Điểm_Trang_Bị — external opaque input for D.13 (default 0).
var equipment_points: float = 0.0


## Convenience factory for tests and callers.
static func create(p_actor_id: String, p_tier: int, p_weapon_tier: int,
		p_max_hp: int, p_base_stats: Dictionary) -> Combatant:
	var c: Combatant = Combatant.new()
	c.actor_id = p_actor_id
	c.tier = p_tier
	c.weapon_tier = p_weapon_tier
	c.max_hp = p_max_hp
	c.base_stats = p_base_stats.duplicate()
	return c


## Returns the base value for `stat` (0.0 when absent).
func base_stat(stat: String) -> float:
	return float(base_stats.get(stat, 0.0))
