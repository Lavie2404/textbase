---
name: canon-rescue-failure-no-reason
description: setting-canon-integration.md canon_role_rescue failure gives the player zero specific reason (tier/faction/alive mismatch) because Contract Enforcement forbids leaking numeric canon criteria into narration — a Competence/flow violation on the game's highest-stakes mechanic
metadata:
  type: project
---

`setting-canon-integration.md` Core Rule #4b + Edge Cases (line ~515-521)
+ AC-07: when a player nominates a rescue candidate for a Suspended event
and the candidate fails `eligible()` (D.3 — wrong tier / wrong faction /
dead / excluded), the result is "hành động vẫn diễn ra về mặt tường
thuật nhưng sự kiện KHÔNG được cứu" with no field written. UI
Requirements #3 + Contract Enforcement Core Rule #4 explicitly forbid
narration from leaking numeric canon data (tier requirements, premise
state) — so the player cannot be told *why* their nominee didn't work
except through whatever qualitative flavor the AI narrator improvises
(unverified beyond AC-47's ADVISORY, non-automatable narrative-
consistency check).

**Why this matters**: this is the exact SDT Competence failure mode —
"the player must know WHY they succeeded or failed." Retries are
unlimited (AC-34), so the cost isn't permanent, but the *learning
signal* for "what makes a good rescue nominee" is structurally hidden by
design (mechanical layer forbidden to expose criteria) and only
optionally recoverable through narration quality that is explicitly
flagged elsewhere in the same GDD as non-automatable/unreliable.

**How to apply**: when this system reaches `/ux-design` or narration-
prompt design (AI/LLM Integration Layer prompt engineering), flag that
`canon_role_rescue` failure narration should carry a required minimum
qualitative signal (e.g. "nó còn quá non, đám thù địch sẽ không coi hắn
ra gì" for tier mismatch) as a *contract requirement* on the prompt, not
left to narration-quality happenstance — otherwise this is trial-and-
error with no feedback on the game's most emotionally loaded mechanic.
Related invisible-feedback pattern: [[project_canon-suspended-chip-urgency-gap]].
