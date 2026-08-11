class_name CombatTuning
extends RefCounted
## Data-driven tuning knobs for the Combat System.
##
## NORMATIVE names / defaults / safe ranges come from
## `design/gdd/combat-system.md` (Tuning Knobs section), which remains the
## design authority for these values per ADR-0001. This class is the single
## config artifact the mechanics code reads; tests inject variants via
## [method from_dict].
##
## Knob names intentionally keep the GDD's UPPER_SNAKE identifiers verbatim
## (they are configuration data, not local variables).

# --- D.1 — realm suppression / gear-gap penalty -------------------------------
## % effective-stat reduction per adverse tier gap (D.1). Safe range 0.05-0.30.
var PENALTY_PER_TIER: float = 0.15
## Floor multiplier for each individual penalty layer (D.1). Safe range 0.05-0.3.
var FLOOR_LAYER: float = 0.1
## Floor multiplier for the TOTAL penalty product (D.1). Safe range 0.02-0.15.
var FLOOR_TOTAL: float = 0.05
## Multiplier applied while `death_and_consequence_blocked(C)=true` (D.1
## crippled_layer). Safe range 0.7-0.95.
var CRIPPLED_PENALTY_MULT: float = 0.85

# --- D.3 — hit chance ---------------------------------------------------------
## Slope of the ACC-vs-Evasion difference on hit probability (D.3). Safe range 0.005-0.02.
var K_HIT: float = 0.01
## Hit probability floor (D.3). Safe range 0.01-0.10.
var P_MIN: float = 0.05
## Hit probability ceiling (D.3). Safe range 0.90-0.99.
var P_MAX: float = 0.95

# --- D.4 — raw damage chip floor ----------------------------------------------
## Minimum raw damage on a landed hit, as a fraction of effective ATK (D.4).
## Safe range 0.02-0.15.
var MIN_RAW_RATIO: float = 0.05

# --- D.4b — progressive exhaustion --------------------------------------------
## Exchange index at which exhaustion starts ramping (D.4b). Safe range 20-80.
## Cross-constraints: must be < TECHNICAL_EXCHANGE_CAP, must be >
## CONTENT_EXCHANGE_ESTIMATE as configured, and
## TECHNICAL_EXCHANGE_CAP - EXHAUSTION_ONSET_EXCHANGE >= 120.
var EXHAUSTION_ONSET_EXCHANGE: int = 40
## % of max_HP drained per exchange (scaled by exhaustion_progress) once the
## exhaustion window is active (D.4b). Safe range 0.05-0.15 — MUST NOT go
## below 0.05 (convergence guarantee breaks, verified by reference harness).
var EXHAUSTION_DRAIN_PCT: float = 0.05

# --- D.6 — final damage -------------------------------------------------------
## Floor for the Amp x Mitigation final multiplier (D.6). Safe range 0.05-0.2.
var MIN_DMG_MULT: float = 0.1
## Deterministic damage reduction while the defender chose "Defend"
## (Core Rule #2b / D.6). Safe range 0.20-0.50.
var DEFEND_DMG_REDUCTION_PCT: float = 0.35

# --- D.9b — friendly-spar draw gate -------------------------------------------
## Relative combat-power difference under which a friendly spar is
## "evenly matched" (D.9b). Safe range 0.05-0.25.
var SPAR_PARITY_TOLERANCE: float = 0.15
## HP% at-or-under which the nominal winner of an eligible spar converts the
## result to a draw (D.9b). Safe range 0.05-0.25.
var SPAR_LOW_HP_THRESHOLD: float = 0.15

# --- D.9c — technical safety cap ----------------------------------------------
## Hard runtime exchange cap (D.9c). Safe range 100-500, AND
## TECHNICAL_EXCHANGE_CAP - EXHAUSTION_ONSET_EXCHANGE >= 120.
var TECHNICAL_EXCHANGE_CAP: int = 200

# --- D.10 — HP regen ----------------------------------------------------------
## Hard ceiling on effective_HPRegen before the exhaustion multiplier applies
## (D.10). Safe range 0.02-0.05.
var HP_REGEN_CAP: float = 0.05

# --- D.11 — flee --------------------------------------------------------------
## Slope of the SPD difference on flee probability (D.11). Same shape as K_HIT,
## tuned independently.
var K_FLEE: float = 0.01
## Flee probability floor (D.11).
var P_MIN_FLEE: float = 0.05
## Flee probability ceiling (D.11).
var P_MAX_FLEE: float = 0.95

# --- D.12 — content-authoring estimate ----------------------------------------
## DESIGN estimate of a typical battle's exchange count; only feeds
## max_invocations_per_battle (D.12). NOT a runtime cap. Safe range 15-50.
var CONTENT_EXCHANGE_ESTIMATE: int = 30

# --- D.13 — stat-point weights (display-only estimate) ------------------------
## Weights for Điểm Chỉ Số (D.13). Display/estimate only — never affect
## exchange outcomes (Core Rule #7). w_HP=0.25 is a documented placeholder.
var w_HP: float = 0.25
var w_ATK: float = 1.0
var w_DEF: float = 1.0
var w_SPD: float = 1.0
var w_ACC: float = 1.0
var w_NE: float = 1.0
var w_CR: float = 1.0
var w_CD: float = 1.0
var w_AMP: float = 1.0
var w_MIT: float = 1.0
var w_LSTL: float = 1.0
var w_REGEN: float = 1.0

# --- Core Rule #2 — NPC survival instinct -------------------------------------
## HP% under which the NPC auto-chooses "Flee" (Tier 1) outside friendly spars.
## Safe range 0.05-0.35.
var NPC_FLEE_HP_THRESHOLD: float = 0.20

# --- Locked external registry values ------------------------------------------
## From `equipment-skill-data-system.md` registry (LOCKED). Not a knob.
const MAX_KNOWN_SKILLS_PER_CHARACTER: int = 6


## Builds a tuning object from defaults with per-key overrides applied.
## Unknown keys are ignored. Tests use this to inject deterministic variants
## (e.g. P_MAX=0.0 to force a guaranteed miss).
static func from_dict(overrides: Dictionary) -> CombatTuning:
	var tuning: CombatTuning = CombatTuning.new()
	for key: Variant in overrides.keys():
		var name: String = String(key)
		if name in tuning:
			tuning.set(name, overrides[key])
	return tuning
