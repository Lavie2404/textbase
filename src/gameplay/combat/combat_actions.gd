class_name CombatActions
extends RefCounted
## Action availability & the fixed 4-slot suggestion layout Combat provides
## to the Turn Manager UI (UI Requirements + AC-04/AC-11/AC-32/AC-42).
##
## Slot invariant: slot 3 = "Defend" and slot 4 = "Flee" are FIXED and never
## displaced — no valid action category is ever pushed out of one-tap reach.

## Slot kinds returned by [method build_action_slots].
const SLOT_THUC: String = "thuc"
const SLOT_MORE: String = "more"
const SLOT_BASIC_ATTACK: String = "basic_attack"
const SLOT_DEFEND: String = "defend"
const SLOT_FLEE: String = "flee"
const SLOT_EMPTY: String = "empty"


## Deterministic display order: tier DESCENDING, tie-broken by thuc_id
## ASCENDING (stable between renders — muscle-memory safety on touch).
## Entries are `{"thuc_id": String, "tier": int}` dictionaries.
static func sort_thucs_for_display(unused_thucs: Array) -> Array:
	var sorted: Array = unused_thucs.duplicate()
	sorted.sort_custom(func(x: Dictionary, y: Dictionary) -> bool:
		var tier_x: int = int(x[CombatNpc.KEY_TIER])
		var tier_y: int = int(y[CombatNpc.KEY_TIER])
		if tier_x != tier_y:
			return tier_x > tier_y
		return String(x[CombatNpc.KEY_THUC_ID]) < String(y[CombatNpc.KEY_THUC_ID]))
	return sorted


## Builds the fixed 4-slot action list for one exchange.
##
## - Slot 1: highest-priority thức, or "Đánh thường" (basic attack) when no
##   thức remains.
## - Slot 2: with >2 unused thức → "Xem thêm" carrying the FULL sorted list;
##   with exactly 2 → the second thức; with exactly 1 → basic attack (always
##   available); with 0 → empty (basic attack already occupies slot 1 —
##   judgment call, the GDD leaves the 0-thức slot-2 content unspecified).
## - Slot 3: Defend (fixed). Slot 4: Flee (fixed).
static func build_action_slots(unused_thucs: Array) -> Array[Dictionary]:
	var sorted: Array = sort_thucs_for_display(unused_thucs)
	var slot_1: Dictionary
	var slot_2: Dictionary
	if sorted.is_empty():
		slot_1 = {"kind": SLOT_BASIC_ATTACK}
		slot_2 = {"kind": SLOT_EMPTY}
	elif sorted.size() == 1:
		slot_1 = _thuc_slot(sorted[0])
		slot_2 = {"kind": SLOT_BASIC_ATTACK}
	elif sorted.size() == 2:
		slot_1 = _thuc_slot(sorted[0])
		slot_2 = _thuc_slot(sorted[1])
	else:
		slot_1 = _thuc_slot(sorted[0])
		slot_2 = {"kind": SLOT_MORE, "thuc_list": sorted}
	return [slot_1, slot_2, {"kind": SLOT_DEFEND}, {"kind": SLOT_FLEE}]


## Whether using `thuc_id` is a legal action given the thức already used this
## battle. Basic attack is fully EXEMPT from the no-repeat rule and from
## max_invocations_per_battle (D.12/AC-32); every other thức is rejected once
## used (Core Rule #5/AC-04/AC-42 — including via free-text input).
static func is_thuc_available(thuc_id: String, used_thuc_ids: Array) -> bool:
	if thuc_id == CombatFormulas.BASIC_ATTACK_ID:
		return true
	return not used_thuc_ids.has(thuc_id)


static func _thuc_slot(entry: Dictionary) -> Dictionary:
	return {
		"kind": SLOT_THUC,
		"thuc_id": String(entry[CombatNpc.KEY_THUC_ID]),
		"tier": int(entry[CombatNpc.KEY_TIER]),
	}
