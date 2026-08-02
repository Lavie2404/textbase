---
name: project-vo-danh-luc-design-philosophy
description: Core numeric-design philosophy for Vô Danh Lục (solo-dev xianxia text RPG) — legibility over exponential curves, and the existing formula "shape language" to stay consistent with.
metadata:
  type: project
---

Vô Danh Lục is a solo-dev, single-player, text-based xianxia interactive-fiction
RPG (Godot 4.6/GDScript). Its Pillar 4 explicitly states "numbers are always
grounded, never opaque" — the player should be able to mentally estimate
progress. game-concept.md flags exponential/opaque curves as an anti-pattern
to avoid specifically because this is a small, hand-tuned MVP (1 setting
region, 3 NPCs), not a live-service retention game with an infinite grind
treadmill.

**Why:** The user/game-concept doc explicitly calls out "avoid over-engineered
exponential curves meant for live-service retention" as guidance when the EXP
curve's shape was an open design risk. This is a recurring constraint, not a
one-off — it should shape every future numeric-progression formula in this
project (EXP, stat growth, drop rates, etc.), not just the one GDD it was
first stated for.

**How to apply:** Default to linear or mildly-linear formulas
(`base + increment * x`) over exponential/geometric ones unless the user
explicitly asks for accelerating difficulty. When in doubt, pick the shape a
player could compute in their head from the Character Card's visible numbers.

**Established formula "shape language" already in the registry** (reuse this
vocabulary/pattern for consistency across GDDs — see
`design/registry/entities.yaml` and `design/gdd/combat-system.md` Formula
D.1):
- Tier-gap penalties use `clamp(1 - RATE_PER_TIER * gap, FLOOR, 1.0)` — a
  linear decay clamped to a small nonzero floor, never truly zero (the game's
  "không có gì tuyệt đối" / nothing is ever 100% or 0% philosophy — see also
  combat's P_MIN=0.05/P_MAX=0.95 hit-chance clamps).
- `combat-system.md` owns `PENALTY_PER_TIER=0.15`, `FLOOR_LAYER=0.1`,
  `FLOOR_TOTAL=0.05` (tier/gear-gap combat penalty) — check these before
  proposing a new per-tier coefficient elsewhere; decide deliberately whether
  to reuse the same coefficient or introduce a separate knob (I chose to keep
  EXP's per-tier reward coefficient as a SEPARATE new knob from
  `PENALTY_PER_TIER` in exp-realm-progression.md Formula D.2, specifically to
  avoid silently coupling combat-difficulty tuning to EXP-economy tuning —
  worth reconsidering if the user prefers fewer knobs over decoupling).
- `combat_power_estimate` (combat-system.md D.13, in registry) has a
  placeholder weight `w_HP=0.25` explicitly waiting on this project's real
  stat-growth curve — any stat-growth formula's absolute output scale (e.g.
  "HP ≈ 100–400 across levels 1–25") needs to be flagged back to
  combat-system.md's owner so `w_*` can be recalibrated against real numbers,
  since `combat_power_estimate` is a weighted SUM across stats "quy đổi cùng
  thang" (converted to a common scale) — an unscaled stat curve could silently
  break that formula's meaningfulness.

See also [[reference-registry-workflow]] if written later.
