---
name: project-vo-danh-luc-progression-risks
description: Draft EXP/progression/áp chế cảnh giới formulas for Vô Danh Lục and the unresolved adversarial-review risks found on 2026-08-01, before any progression GDD exists.
metadata:
  type: project
---

Project "Vô Danh Lục" (`design/gdd/game-concept.md`, status: Draft) is a solo,
non-commercial, single-player xianxia interactive-fiction RPG (Godot 4.6). No
dedicated progression/combat GDD exists yet — formulas below are still only
described in conversation/concept level, not written to any GDD file.

**Draft formulas as of 2026-08-01** (source of truth once formalized should be
a `design/gdd/progression-system.md` or `combat-system.md`, not this memory):
- EXP/turn: default action 1%, combat spawns 5%, combat over-level win 10%,
  combat lose-not-die 4% (+ injury risk), Tu luyện 3%, Bế quan 8%, Song Tu
  (NSFW, requires skill) 3%. Tâm pháp gives +X% multiplicative on ALL sources.
- 10 levels = 1 bậc/cảnh giới. Skill/gear bậc higher than character bậc →
  -10% effectiveness per bậc of gap, capped at -90% (floor stays at 10% of
  nominal value, never reaches 0).
- Áp chế cảnh giới: any bậc gap → -10% Lực chiến per bậc gap, uncapped
  (unlike the gear penalty, no stated ceiling).
- NPCs have their own EXP bar and self-progress independently of the player
  ("world tự mô phỏng").
- MVP scope: 1 setting, 3 NPCs (1 hostile, 1 friendly, 1 neutral).

**Why this matters**: an adversarial review (2026-08-01) found several
concrete failure scenarios in these draft numbers, all still open/unfixed:
1. Bế quan (8%, zero risk) is only ~20% weaker than the single riskiest,
   hardest-to-trigger source (combat over-level win, 10%), and 2.7x better
   than Tu luyện (3%) and 8x better than baseline (1%) — same 1-turn cost for
   wildly different reward, with no stated cooldown/opportunity-cost on Bế
   quan. This is a likely dominant strategy that crowds out combat, Hảo cảm,
   and Song Tu content, undermining the Fellowship/Narrative/Discovery
   pillars the game concept prioritizes.
2. If NPCs progress on their own clock (not gated to player turns), a solo
   dev's irregular play cadence (concept doc: 30-120 min sessions, gaps of
   days/weeks between sessions) risks NPCs out-leveling the player between
   sessions. Combined with the *uncapped* áp chế cảnh giới penalty, a few
   bậc of NPC lead could make large parts of the MVP's 3-NPC cast
   permanently unplayable-against — contradicts the stated pillar that the
   world is "objective but not immutable to a good player."
3. The gear-bậc penalty caps at -90%, not -100% — there's no bậc gap large
   enough to make an overleveled item strictly worthless. If item base value
   scales faster than linear with bậc (not yet specified), an overleveled
   item can remain strictly better than same-tier gear even at 10%
   effectiveness, silently defeating the "no shortcut by overpowered gear"
   design intent stated in the concept doc's Long-Term Progression section.
4. Other flagged degenerate strategies: deliberate safe-loss farming (4%
   EXP for losing non-lethally, if losses can be engineered to be low-risk);
   ambiguity on whether combat EXP sources stack additively in one combat
   turn (5% + 10% = 15%?) — this is already an open question in the concept
   doc's "Open Questions" section, and the adversarial review confirms it's
   a real balance risk, not just a spec gap; Song Tu spam once unlocked
   (same 3% rate as Tu luyện, but no stated cooldown/diminishing returns);
   hostility-contagion is only triggered by killing NPCs who have positive
   Hảo cảm with others, creating a perverse incentive to preferentially
   target socially-isolated NPCs as "free kills."

**Second adversarial review pass (2026-08-01, same session)** — covered
Life-Saving cooldown, NPC Affinity, and MVP scope sufficiency (concept doc
sections not covered by the first pass):
5. Life-Saving mechanic (50-player-turn cooldown, auto-save on lethal outcome,
   resets to 0 on trigger, repeatable) is a pure faucet with no sink/cost —
   flagged as likely a *stronger* dominant-strategy risk than Bế quan (risk
   #1 above) because it affects survival, not just EXP rate. A player who
   learns the counter can deliberately take fights near cooldown expiry
   ("sawtooth" risk curve). Recommend requiring either a cost-on-trigger
   (stat/Affinity/resource penalty) or converting to a probability that scales
   with turns-since-last-save instead of a hard deterministic floor.
6. NPC Affinity (-100..+100) is claimed as "a strategic resource, not just an
   emotion" but has zero stated economy: no gain-per-action rate, no decay,
   no diminishing returns near ±100, no cost to lose Affinity, and social
   propagation is mentioned but has no stated rate/multiplier. Without decay
   it's a ratchet (time invested, not relationship quality, decides Dual
   Cultivation unlock) — contradicts the "strategic resource" framing.
7. MVP scope (1 region, 3 NPCs, one of which starts pre-set at the Dual
   Cultivation Affinity threshold) leaves only 2 unshortcut NPCs to validate
   Affinity earn-rate, hostility-gating, EXP pacing, and the Life-Saving
   cooldown simultaneously across the target 3 test sessions — likely too
   thin to distinguish "well-tuned" from "edge case not yet hit."

**How to apply**: when `/design-system` is run to author the actual
progression/combat GDD, treat all four numbered risks above as required
Edge Cases / Tuning Knobs to resolve explicitly (per `design/CLAUDE.md`'s
8-required-sections rule) — do not let the GDD ship with these numbers
unchanged without an explicit rationale for why they're safe. In particular,
confirm: (1) whether the EXP-to-level-up denominator is literally 100% per
level (this was an assumption made during the review, not confirmed by the
user), (2) whether NPC world-simulation ticks on player turns only or on a
separate real-time/session clock, (3) whether the -90% gear penalty cap is
intentional or should be -100%, (4) whether combat EXP sources (5%/10%/4%)
are mutually exclusive tiers or additively stackable in the same turn.
