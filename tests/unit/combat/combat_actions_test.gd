extends GutTest
## Action availability & the fixed 4-slot layout.
## Covers AC-04, AC-11, AC-32, AC-42.


func _thuc(thuc_id: String, tier: int) -> Dictionary:
	return {CombatNpc.KEY_THUC_ID: thuc_id, CombatNpc.KEY_TIER: tier}


func test_layout_with_three_or_more_thucs_uses_more_slot() -> void:
	# AC-11: >= 3 unused thức -> slot 1 top-tier thức, slot 2 "Xem thêm"
	# carrying ALL of them in the same deterministic order, slots 3/4 fixed.
	var slots: Array[Dictionary] = CombatActions.build_action_slots([
		_thuc("b_thuc", 2), _thuc("a_thuc", 3), _thuc("c_thuc", 3),
	])
	assert_eq(slots.size(), 4)
	assert_eq(slots[0]["kind"], CombatActions.SLOT_THUC)
	assert_eq(slots[0]["thuc_id"], "a_thuc", "tier desc, thuc_id asc tiebreak")
	assert_eq(slots[1]["kind"], CombatActions.SLOT_MORE)
	var more_list: Array = slots[1]["thuc_list"]
	assert_eq(more_list.size(), 3, "popover lists ALL unused thức")
	assert_eq(more_list[0][CombatNpc.KEY_THUC_ID], "a_thuc")
	assert_eq(more_list[1][CombatNpc.KEY_THUC_ID], "c_thuc")
	assert_eq(more_list[2][CombatNpc.KEY_THUC_ID], "b_thuc")
	assert_eq(slots[2]["kind"], CombatActions.SLOT_DEFEND)
	assert_eq(slots[3]["kind"], CombatActions.SLOT_FLEE)


func test_layout_with_two_thucs_shows_both_directly() -> void:
	# AC-11: <= 2 thức -> slot 2 is the second-priority thức, slots 3/4 fixed.
	var slots: Array[Dictionary] = CombatActions.build_action_slots([
		_thuc("z_thuc", 1), _thuc("m_thuc", 4),
	])
	assert_eq(slots[0]["thuc_id"], "m_thuc")
	assert_eq(slots[1]["kind"], CombatActions.SLOT_THUC)
	assert_eq(slots[1]["thuc_id"], "z_thuc")
	assert_eq(slots[2]["kind"], CombatActions.SLOT_DEFEND)
	assert_eq(slots[3]["kind"], CombatActions.SLOT_FLEE)


func test_layout_with_one_thuc_offers_basic_attack_second() -> void:
	var slots: Array[Dictionary] = CombatActions.build_action_slots([
		_thuc("z_thuc", 1),
	])
	assert_eq(slots[0]["kind"], CombatActions.SLOT_THUC)
	assert_eq(slots[1]["kind"], CombatActions.SLOT_BASIC_ATTACK)
	assert_eq(slots[2]["kind"], CombatActions.SLOT_DEFEND)
	assert_eq(slots[3]["kind"], CombatActions.SLOT_FLEE)


func test_layout_with_no_thucs_falls_back_to_basic_attack_first() -> void:
	# AC-05 / UI Requirements: out of thức -> slot 1 "Đánh thường";
	# defend/flee still never displaced.
	var slots: Array[Dictionary] = CombatActions.build_action_slots([])
	assert_eq(slots[0]["kind"], CombatActions.SLOT_BASIC_ATTACK)
	assert_eq(slots[2]["kind"], CombatActions.SLOT_DEFEND)
	assert_eq(slots[3]["kind"], CombatActions.SLOT_FLEE)


func test_defend_and_flee_slots_never_displaced() -> void:
	# AC-11 invariant: across 0..6 unused thức, slots 3/4 are always
	# defend/flee — no category is ever pushed out of one-tap reach.
	for count: int in range(0, 7):
		var thucs: Array = []
		for i: int in range(count):
			thucs.append(_thuc("thuc_%d" % i, i))
		var slots: Array[Dictionary] = CombatActions.build_action_slots(thucs)
		assert_eq(slots.size(), 4, "%d thức" % count)
		assert_eq(slots[2]["kind"], CombatActions.SLOT_DEFEND, "%d thức" % count)
		assert_eq(slots[3]["kind"], CombatActions.SLOT_FLEE, "%d thức" % count)


func test_used_thuc_rejected_even_via_free_text() -> void:
	# AC-04 / AC-42: a used thức is not available again this battle,
	# regardless of the input path.
	assert_false(CombatActions.is_thuc_available("thuc_x", ["thuc_x"]))
	assert_true(CombatActions.is_thuc_available("thuc_y", ["thuc_x"]))


func test_basic_attack_exempt_from_no_repeat_rule() -> void:
	# AC-32: basic attack is usable any number of times.
	assert_true(CombatActions.is_thuc_available(
		CombatFormulas.BASIC_ATTACK_ID, [CombatFormulas.BASIC_ATTACK_ID, "thuc_x"]))
