extends SceneTree
## AC-47a / AC-47b numerical convergence sweeps for the Combat System
## (ADR-0001 migration step 6 — replaces the frozen Python harness
## `prototypes/combat-reference/harness.py` as the re-runnable tool).
##
## Run from the project root:
##   godot --headless --path . --script res://tools/combat/convergence_sweep.gd
## Optional user arg (after `--`): Monte Carlo seeds per combo (default 10):
##   godot --headless --path . --script res://tools/combat/convergence_sweep.gd -- 30
##
## Frozen reference numbers (harness.py / results.md, archival):
##   Q1-FIXED  : 96/108 combos converge; the 12 failures all violate the
##               window cross-constraint (CAP - ONSET < 120).
##   Q3b FIXED : higher-SPD actor wins 52.3%/47.7% over 300 battles (fair).


func _initialize() -> void:
	print("Combat convergence sweep — GDScript reference implementation")
	print("(drives the real CombatResolver.resolve_exchange, ADR-0001)")

	# ── AC-47a: deterministic Safe-Range sweep (BLOCKING gate) ──────────────
	print("\n=== AC-47a — deterministic sweep (108 Safe-Range combos, no attacks) ===")
	var sweep: Dictionary = CombatConvergenceLib.run_deterministic_sweep()
	print("  converged: %d/%d" % [int(sweep["converged"]), int(sweep["total"])])
	var violations: Array[Dictionary] = sweep["constraint_violations"]
	var unexpected: Array[Dictionary] = sweep["unexpected_failures"]
	print("  constraint-violating combos (window < %d, flagged — expected): %d"
		% [CombatConvergenceLib.MIN_EXHAUSTION_WINDOW, violations.size()])
	for combo: Dictionary in violations:
		print("    drain=%.2f regen_cap=%.2f onset=%d cap=%d hp_regen=%.2f (window=%d)"
			% [float(combo["drain"]), float(combo["regen_cap"]), int(combo["onset"]),
			int(combo["cap"]), float(combo["hp_regen"]), int(combo["window"])])
	print("  UNEXPECTED failures (window >= 120 but did not converge): %d"
		% unexpected.size())
	for combo: Dictionary in unexpected:
		print("    !! drain=%.2f regen_cap=%.2f onset=%d cap=%d hp_regen=%.2f (window=%d)"
			% [float(combo["drain"]), float(combo["regen_cap"]), int(combo["onset"]),
			int(combo["cap"]), float(combo["hp_regen"]), int(combo["window"])])
	var gate_pass: bool = unexpected.is_empty()
	print("  AC-47a gate: %s" % ("PASS" if gate_pass else "FAIL"))

	# ── Q3b migration: SPD-bias fairness (drain-order symmetry) ─────────────
	print("\n=== Q3b — SPD-bias fairness (A SPD=51 always `first`, 300 battles) ===")
	var bias: Dictionary = CombatConvergenceLib.run_spd_bias_check(300)
	var a_wins: int = int(bias["a_wins"])
	var b_wins: int = int(bias["b_wins"])
	var decided: int = a_wins + b_wins
	if decided > 0:
		print("  A (higher SPD, always first) wins: %d/%d (%.1f%%)"
			% [a_wins, decided, 100.0 * float(a_wins) / float(decided)])
		print("  B (lower SPD, always second) wins: %d/%d (%.1f%%)"
			% [b_wins, decided, 100.0 * float(b_wins) / float(decided)])
	print("  non-converged: %d" % int(bias["non_converged"]))

	# ── AC-47b: Monte Carlo with real hit rolls (ADVISORY) ──────────────────
	var seeds_per_combo: int = 10
	var user_args: PackedStringArray = OS.get_cmdline_user_args()
	if user_args.size() > 0 and user_args[0].is_valid_int():
		seeds_per_combo = user_args[0].to_int()
	print("\n=== AC-47b — Monte Carlo sweep (real D.3 rolls, %d battles/combo, ADVISORY) ==="
		% seeds_per_combo)
	var rows: Array[Dictionary] = CombatConvergenceLib.run_monte_carlo_sweep(seeds_per_combo)
	var full: int = 0
	var partial: int = 0
	var zero: int = 0
	for row: Dictionary in rows:
		var conv: int = int(row["converged"])
		var battles: int = int(row["battles"])
		if conv == battles:
			full += 1
		elif conv == 0:
			zero += 1
		else:
			partial += 1
		if conv < battles and int(row["window"]) >= CombatConvergenceLib.MIN_EXHAUSTION_WINDOW:
			print("  note: window>=120 combo below 100%%: drain=%.2f regen_cap=%.2f onset=%d cap=%d hp_regen=%.2f -> %d/%d"
				% [float(row["drain"]), float(row["regen_cap"]), int(row["onset"]),
				int(row["cap"]), float(row["hp_regen"]), conv, battles])
	print("  combos fully converged: %d/%d (partial: %d, zero: %d)"
		% [full, rows.size(), partial, zero])

	quit(0 if gate_pass else 1)
