---
name: death-consequence-crippling-trivialized
description: phế đan điền (severe tier) has zero combat-stat penalty + narration ban + generous free self-recovery — compounds into a genre-defining punishment that's mechanically nearly free
metadata:
  type: project
---

`design/gdd/death-and-consequence.md` Core Rule #6 makes
`death_and_consequence_blocked=true` (phế đan điền/võ công, "crippled
dantian") block EXP accrual ONLY — zero Lực chiến/stat penalty, by
deliberate design (stated reason: avoid death-spiral). To prevent narrative
dissonance, it then bans Mechanic/Narration Contract Enforcement from
letting AI describe the character as weaker (AC-46: "yếu đi/đánh kém hơn"
forbidden; only "đan điền bị phong bế, không thể tiến bộ" permitted).
Separately, `RECOVERY_SELF_RATE=0.12`/`RECOVERY_SELF_COOLDOWN_TURNS=5`
(raised 2026-08-08 specifically to make the MVP's 90-turn validation
window statistically likely to clear the flag) means unlimited free
self-cultivation retries clear the flag in an expected ~35-40 turns with
no cost besides waiting, and no failure-side risk (no genre-appropriate
qi-deviation-style downside for a failed attempt).

**Why this matters**: `game-concept.md`'s own "Cái Chết" section describes
dantian-crippling recovery as "không dễ dàng và không đảm bảo" (not easy,
not guaranteed) — but unlimited free retries with the law of large numbers
makes eventual recovery *practically* guaranteed, just not on attempt 1.
Combined with zero stat penalty, and the fact that the player's own
Character Card (a core, always-visible UI element per `game-concept.md`)
shows unchanged ATK/DEF/etc., the "hậu quả phải cảm thấy THẬT và ĐAU" promise
in this GDD's own Player Fantasy section is falsifiable by the player's own
transparent data — the narration-ban solution hides the mechanical
non-impact in AI prose, but doesn't survive the player checking their own
stat sheet. This is the same defect class as
[[project_canon-identity-omniscience-kills-discovery]] and
[[project_combat-exhaustion-turn-counter-tension]]: a diegetic-framing
patch applied over a mechanical reality that a transparent, player-facing
UI element (Character Card) can directly contradict.

**How to apply**: If this topic resurfaces (balance pass, Vertical Slice
review, or a future economy-designer pass on `RECOVERY_SELF_RATE`/
`RECOVERY_SELF_COOLDOWN_TURNS`), flag that the MVP-motivated tuning fix
(2026-08-08, raised from 0.08/8 to 0.12/5) optimizes for a short-term
validation-window constraint at the cost of the mechanic's intended
long-term weight — worth an explicit design decision on whether
full-vision values should diverge from MVP values once the 90-turn
validation constraint no longer applies.
