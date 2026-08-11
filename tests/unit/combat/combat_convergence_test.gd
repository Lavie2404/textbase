extends GutTest
## AC-47a — deterministic Safe-Range convergence sweep (BLOCKING gate),
## driven through the real CombatResolver via CombatConvergenceLib.
##
## The 108-combination grid replicates the frozen reference harness
## (`prototypes/combat-reference/harness.py`, Q1-FIXED: 96/108 converge; the
## 12 non-converging combos all violate cross-constraint #2, window < 120,
## and are flagged explicitly — never silently skipped).

const ConvergenceLib := preload("res://tools/combat/convergence_lib.gd")


func test_safe_range_sweep_converges_everywhere_constraint_holds() -> void:
	var sweep: Dictionary = ConvergenceLib.run_deterministic_sweep()
	assert_eq(int(sweep["total"]), 108, "full Safe-Range grid")
	var unexpected: Array[Dictionary] = sweep["unexpected_failures"]
	assert_eq(unexpected.size(), 0,
		"every combo with window >= 120 must converge: %s" % str(unexpected))
	var violations: Array[Dictionary] = sweep["constraint_violations"]
	assert_eq(int(sweep["converged"]), 96, "matches frozen harness Q1-FIXED")
	assert_eq(violations.size(), 12, "matches frozen harness Q1-FIXED")
	for combo: Dictionary in violations:
		assert_lt(int(combo["window"]), ConvergenceLib.MIN_EXHAUSTION_WINDOW,
			"non-converging combo must violate the window constraint: %s" % str(combo))
