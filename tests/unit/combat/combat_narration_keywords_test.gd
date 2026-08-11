extends GutTest
## AC-09b — outcome keyword gate for battle-ending narration (Combat-owned
## vocabulary table).


func test_win_narration_with_allowed_keyword_passes() -> void:
	assert_true(CombatNarration.states_outcome(
		"Một chiêu cuối cùng, hắn đã đánh bại đối thủ.", CombatNarration.CONTEXT_WIN))
	assert_true(CombatNarration.states_outcome(
		"Trận đấu kết thúc — ngươi giành phần thắng!", CombatNarration.CONTEXT_WIN))


func test_win_match_is_case_insensitive() -> void:
	assert_true(CombatNarration.states_outcome(
		"CHIẾN THẮNG thuộc về ngươi.", CombatNarration.CONTEXT_WIN))


func test_lose_narration_with_allowed_keyword_passes() -> void:
	assert_true(CombatNarration.states_outcome(
		"Ngươi gục ngã, không chống đỡ nổi thêm một chiêu nào.",
		CombatNarration.CONTEXT_LOSE))


func test_narration_without_outcome_keyword_fails_gate() -> void:
	# Pure blow-by-blow without stating the outcome must FAIL for every
	# context — the verbal channel is mandatory on battle-ending exchanges.
	var vague: String = "Hai bóng người giao nhau giữa sân, bụi mù cuốn lên."
	for context: String in CombatNarration.ALLOWED_KEYWORDS.keys():
		assert_false(CombatNarration.states_outcome(vague, context),
			"context %s must reject outcome-free narration" % context)


func test_flee_draw_and_interrupt_contexts_use_their_own_lists() -> void:
	assert_true(CombatNarration.states_outcome(
		"Hắn tháo chạy khỏi trận địa.", CombatNarration.CONTEXT_NO_OUTCOME_FLEE))
	assert_true(CombatNarration.states_outcome(
		"Hai người dừng lại, bất phân thắng bại.",
		CombatNarration.CONTEXT_NO_OUTCOME_SPAR_DRAW))
	assert_true(CombatNarration.states_outcome(
		"Trận đấu bị cắt ngang bởi biến cố bất ngờ.",
		CombatNarration.CONTEXT_NO_OUTCOME_INTERRUPT))
	# Cross-context: a flee phrase does not satisfy the spar-draw context.
	assert_false(CombatNarration.states_outcome(
		"Hắn tháo chạy khỏi trận địa.", CombatNarration.CONTEXT_NO_OUTCOME_SPAR_DRAW))


func test_unknown_context_never_passes() -> void:
	assert_false(CombatNarration.states_outcome("thắng", "not_a_context"))


func test_every_context_has_a_non_empty_keyword_list() -> void:
	# The round-4 finding was an AC referencing an UNDEFINED keyword list —
	# the table now exists and is non-empty for every outcome context.
	var contexts: Array = [
		CombatNarration.CONTEXT_WIN, CombatNarration.CONTEXT_LOSE,
		CombatNarration.CONTEXT_NO_OUTCOME_FLEE,
		CombatNarration.CONTEXT_NO_OUTCOME_SPAR_DRAW,
		CombatNarration.CONTEXT_NO_OUTCOME_INTERRUPT,
	]
	for context: String in contexts:
		var keywords: Array = CombatNarration.ALLOWED_KEYWORDS[context]
		assert_gt(keywords.size(), 0, "context %s must define keywords" % context)
