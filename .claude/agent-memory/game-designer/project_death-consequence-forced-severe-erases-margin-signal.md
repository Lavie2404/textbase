---
name: death-consequence-forced-severe-erases-margin-signal
description: forced_severe (D&C Core Rule 3c/3d) collapses margin_ratio's skill-expression signal exactly for the highest-stakes fights, where it matters most
metadata:
  type: project
---

In `design/gdd/death-and-consequence.md`, Branch A (player loses to a
deeply hostile opponent, `affinity ≤ -80`): if `death_roll` (D.1) says the
player survives, `forced_severe=true` overrides Formula D.2 and locks
`severity_tier="severe"` regardless of `margin_ratio` (AC-07 explicitly
tests `margin_ratio=0.05`, which the D.2 table alone would read as
"mild," forced to "severe" anyway).

**Why**: Everywhere else in this GDD (and in `combat-system.md`/
`npc-affinity-relationship.md`), `margin_ratio` is the game's transparent,
skill-linked feedback signal — how well you actually fought determines how
bad the outcome is (Pillar 3, "Sức Mạnh Có Logic"). `forced_severe` erases
that signal specifically for the one category of fight where the player
cares most about it: a near-total-crush loss (`margin_ratio` high, i.e.
opponent barely scratched) and a genuinely close call the player almost
won (`margin_ratio` low, opponent nearly died too) both resolve to the
identical worst tier once `death_roll` says "survived." The player who
fought best among all deep-hostility losses gets the same maximal
punishment as the player who fought worst — Competence-feedback is
erased exactly at the moment of highest stakes. The design is internally
documented/deliberate (rationale: "vừa thoát chết thì không thể chỉ là
trọng thương nhẹ") but nothing in the GDD gives the AI narration a hook to
distinguish "you were annihilated and barely lived" from "you nearly won
and barely lived" — both get the same `consequence_type` string
("phế đan điền/võ công").

**How to apply**: When reviewing narrative/UX treatment of severe-tier
consequences from Branch A forced_severe, check whether
`consequence_type`/narration guidance differentiates by the actual
`margin_ratio` that was overridden (even just as a narration-flavor hint,
not a new mechanical branch) — otherwise this is a legitimate, still-open
design tension worth resurfacing if the topic comes up again (e.g. during
`/design-system` for a future revision, or when Mechanic/Narration Contract
Enforcement drafts the actual instruction template for this case).
