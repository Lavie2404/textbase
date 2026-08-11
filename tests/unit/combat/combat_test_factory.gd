extends RefCounted
## Shared factory helpers for the Combat System GUT suite.
## Not a test script (no `_test.gd` suffix) — preload it:
## `const Factory := preload("res://tests/unit/combat/combat_test_factory.gd")`

## Tuning override that forces every D.3 hit roll to land (P_hit == 1).
const FORCE_HIT: Dictionary = {"P_MIN": 1.0, "P_MAX": 1.0}
## Tuning override that forces every D.3 hit roll to miss (P_hit == 0).
const FORCE_MISS: Dictionary = {"P_MIN": 0.0, "P_MAX": 0.0}
## Tuning override that forces every D.11 flee roll to fail (P_flee == 0).
const FORCE_FLEE_FAIL: Dictionary = {"P_MIN_FLEE": 0.0, "P_MAX_FLEE": 0.0}
## Tuning override that forces every D.11 flee roll to succeed (P_flee == 1).
const FORCE_FLEE_SUCCEED: Dictionary = {"P_MIN_FLEE": 1.0, "P_MAX_FLEE": 1.0}


## Builds a combatant with all-zero stats overridden per `stats`, default
## tier 1 / weapon tier 0 / max_hp 200.
static func combatant(actor_id: String, stats: Dictionary = {},
		tier: int = 1, weapon_tier: int = 0, max_hp: int = 200) -> Combatant:
	return Combatant.create(actor_id, tier, weapon_tier, max_hp, stats)


## Fresh RNG with a fixed seed (deterministic across runs).
static func rng(seed_value: int) -> RandomNumberGenerator:
	var r: RandomNumberGenerator = RandomNumberGenerator.new()
	r.seed = seed_value
	return r


## The first randf() a fresh RNG with `seed_value` will produce — used to
## derive the expected branch of a roll deterministically.
static func probe_randf(seed_value: int) -> float:
	return rng(seed_value).randf()


## Merges two tuning-override dictionaries (later keys win) into a CombatTuning.
static func tuning(overrides: Dictionary = {}, more_overrides: Dictionary = {}) -> CombatTuning:
	var merged: Dictionary = overrides.duplicate()
	merged.merge(more_overrides, true)
	return CombatTuning.from_dict(merged)


## Convenience wrapper around CombatResolver.resolve_exchange.
## `cfg` keys (all optional unless noted): `a`, `b` (required Combatants),
## `hp` (defaults to full), `actions` ({id: action}, default both "skill"),
## `thuc_ids`, `thuc_tiers`, `exchange_id` (1), `player_id` (a), `spar`
## (false), `eligible` (false), `tuning` (defaults), `seed` (1) or `rng`.
static func resolve(cfg: Dictionary) -> Dictionary:
	var a: Combatant = cfg["a"]
	var b: Combatant = cfg["b"]
	var hp: Dictionary = cfg.get("hp", {a.actor_id: a.max_hp, b.actor_id: b.max_hp})
	var actions: Dictionary = cfg.get("actions", {
		a.actor_id: CombatFormulas.ACTION_SKILL,
		b.actor_id: CombatFormulas.ACTION_SKILL,
	})
	var thuc_ids: Dictionary = cfg.get("thuc_ids", {
		a.actor_id: CombatFormulas.BASIC_ATTACK_ID,
		b.actor_id: CombatFormulas.BASIC_ATTACK_ID,
	})
	var thuc_tiers: Dictionary = cfg.get("thuc_tiers", {
		a.actor_id: CombatFormulas.BASIC_ATTACK_TIER,
		b.actor_id: CombatFormulas.BASIC_ATTACK_TIER,
	})
	var the_rng: RandomNumberGenerator = cfg.get("rng", rng(int(cfg.get("seed", 1))))
	return CombatResolver.resolve_exchange(
		a, b, hp, actions, thuc_ids, thuc_tiers,
		int(cfg.get("exchange_id", 1)),
		String(cfg.get("player_id", a.actor_id)),
		bool(cfg.get("spar", false)),
		bool(cfg.get("eligible", false)),
		cfg.get("tuning", CombatTuning.new()),
		the_rng)
