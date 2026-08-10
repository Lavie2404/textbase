---
name: canon-suspended-chip-urgency-gap
description: setting-canon-integration.md Suspended-event rescue window has a real UI signal (canon_role_rescue chip) but it conveys "opportunity exists," never urgency or loss, and vanishes with the same "no explanation" treatment as a mundane cooldown chip
metadata:
  type: project
---

`setting-canon-integration.md` UI Requirements #2 (line ~630-634) frames
Suspended-event rescue windows as narration-only ("KHÔNG hiển thị UI
timer cơ học"). On first read this looks like a pure invisible-deadline
problem (same class as [[project_combat-exhaustion-turn-counter-tension]]
/ [[project_affinity-fatigue-invisible-signal]]) — but it is NOT: cross-
checking `situation-encounter-generation.md` D.1 (line 220) shows
`canon_role_rescue` is gated onto the intent-chip menu whenever `∃ E :
status(E) == Suspended`, and gets a distinct empty-seal outline chip
treatment (line 745-748) specifically because it is hook-gated. So the
player DOES get a persistent, non-narrative signal that "a rescue is
currently possible."

**The gap that remains**: that chip's design intentionally carries zero
urgency information — `situation-encounter-generation.md` line 727-732
states the general chip philosophy explicitly: chip absence/reappearance
renders with **no badge, no tooltip, no "mới!" indicator**, specifically
"làm nổi sẽ lộ bộ đếm cooldown, phá ảo giác 'thế giới tự nhiên vậy thôi'."
That anti-ratchet philosophy was designed for ordinary cooldown chips
(gift, small_help) where disappearance is temporary and low-stakes. It
gets applied uniformly to `canon_role_rescue` too, whose disappearance
is **permanent and is the literal failure state of the game's #2 Player
Fantasy tier** ("phá vỡ định mệnh"). Nothing in either GDD distinguishes
"chip gone because cooldown" from "chip gone because the one chance to
rewrite fate just closed forever."

**Why**: the two chip-visibility philosophies (soft/cooldown vs.
hard/permanent-loss) were designed by different authors at different
times and never reconciled against each other — `situation-encounter-
generation.md`'s general "no explanation" rule was written for its own
domain (social envelope cooldowns) and setting-canon-integration.md's
Suspended-rescue mechanic inherited it by gate-composition without a
dedicated review of whether the stakes match.

**How to apply**: when reviewing UX spec work for the intent-chip row
(`/ux-design`) or any future revision to setting-canon-integration.md's
UI Requirements, flag that `canon_role_rescue` chip disappearance needs
either (a) an explicit design decision that permanent narrative loss is
acceptable with zero differentiated signal, defended on aesthetic
grounds, or (b) a distinguishing treatment (narration-driven, not a
mechanical timer, to stay consistent with the "no cơ học timer" rule —
e.g. guaranteed narrative beat when `earliest_world_time` is within N
turns) that current AC-47 (ADVISORY, non-automatable) does not currently
test for.
