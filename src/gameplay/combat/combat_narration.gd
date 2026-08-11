class_name CombatNarration
extends RefCounted
## AC-09b — the allowed-keyword table for outcome narration, owned by the
## Combat System (Contract Enforcement owns the numeric-leak MECHANISM, not
## per-system vocabulary).
##
## The narration of a battle-ending exchange MUST verbally state the outcome
## (a non-visual backup channel). This is a PERMISSIVE minimum gate: any
## phrasing containing at least one allowed keyword for the exchange's
## `outcome.type` (+ sub-context for no_outcome) passes; nothing is forbidden
## beyond that. Matching is case-insensitive substring (punctuation/suffix
## variants match naturally). Subject-dependent qualifiers in the GDD table
## ("khuất phục" for either side, "ngã gục" when the subject is the opponent)
## cannot be checked mechanically — the bare keyword is accepted.

## Narration contexts (outcome.type + sub-context for no_outcome).
const CONTEXT_WIN: String = "win"
const CONTEXT_LOSE: String = "lose"
const CONTEXT_NO_OUTCOME_FLEE: String = "no_outcome_flee"
const CONTEXT_NO_OUTCOME_SPAR_DRAW: String = "no_outcome_spar_draw"
const CONTEXT_NO_OUTCOME_INTERRUPT: String = "no_outcome_interrupt"

## Allowed keywords per context — verbatim from the GDD's AC-09b table.
const ALLOWED_KEYWORDS: Dictionary = {
	CONTEXT_WIN: [
		"thắng", "chiến thắng", "hạ gục", "khuất phục", "đánh bại", "áp đảo",
		"giành phần thắng", "ngã gục",
	],
	CONTEXT_LOSE: [
		"thua", "thất bại", "gục ngã", "trọng thương", "bị đánh bại",
		"không chống đỡ nổi", "khuất phục", "gục xuống",
	],
	CONTEXT_NO_OUTCOME_FLEE: [
		"chạy thoát", "rút lui", "bỏ chạy", "thoát khỏi", "tháo chạy",
		"thoát thân",
	],
	CONTEXT_NO_OUTCOME_SPAR_DRAW: [
		"hòa", "bất phân thắng bại", "ngang tài ngang sức", "dừng lại",
		"kết thúc trong hòa khí", "không phân định",
	],
	CONTEXT_NO_OUTCOME_INTERRUPT: [
		"gián đoạn", "dừng đột ngột", "bị cắt ngang", "ngừng lại",
	],
}


## True when `narration_text` contains at least one allowed keyword for
## `context` (one of the CONTEXT_* constants). Case-insensitive.
static func states_outcome(narration_text: String, context: String) -> bool:
	if not ALLOWED_KEYWORDS.has(context):
		return false
	var lowered: String = narration_text.to_lower()
	var keywords: Array = ALLOWED_KEYWORDS[context]
	for keyword: String in keywords:
		if lowered.contains(keyword.to_lower()):
			return true
	return false
