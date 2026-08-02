---
name: finding-ai-narrative-test-evidence-gap
description: The 5-category story-type/test-evidence framework (Logic/Integration/Visual-Feel/UI/Config-Data) doesn't cleanly cover AI/LLM-generated non-deterministic narrative content — flagged during adversarial review of Vô Danh Lục MVP Definition (2026-08-01).
metadata:
  type: project
---

During adversarial review of `design/gdd/game-concept.md`'s MVP Definition
(2026-08-01), found that this project's core mechanic — AI/LLM-generated
dynamic situations and combat narration — does not map cleanly onto any of
the 5 story types in the QA test-evidence table (Logic/Integration/
Visual-Feel/UI/Config-Data). It's closest to Integration but the standard
"automated test OR documented playtest" bar doesn't address non-determinism:
you cannot assert exact narrative output, and per this project's own
`.claude/docs/coding-standards.md` Testing Standards, tests must be
deterministic (no time/random-dependent assertions) — LLM narrative output
violates that by construction.

Recommended resolution (not yet adopted/approved by user as of this writing):
split every AI-narrative-touching story into two layers before writing its
system GDD:
1. **Mechanical layer** (Lực chiến/EXP/Hảo cảm formulas, realm-suppression
   penalties, affinity propagation math) — classify as Logic, BLOCKING
   automated unit tests in `tests/unit/[system]/`, fully deterministic.
2. **Narrative layer** (AI prose generation, situation generation) — treat
   like Visual/Feel: ADVISORY, evidence = a fixed "golden scenario set" run
   against a rubric (e.g., does the prose mention the skill/gear actually
   used — Pillar 4; does it avoid declaring the PC objectively superior —
   Pillar 1) with lead sign-off, not automated pass/fail. Re-run the golden
   set (not exhaustively) whenever prompts/model change, as a manual
   regression check.

**Why:** Prevents two failure modes: (a) trying to force automated
determinism onto LLM output (flaky/impossible), or (b) letting core-loop
narrative quality skip test evidence entirely because it "can't be tested."

**How to apply:** Raise this explicitly when `/design-system` is run for
Combat/EXP/Hảo cảm/AI-narration systems, and when `/qa-plan` is first run for
this project — propose adding a 6th story-type row ("AI-Generated Content")
to the test-evidence table rather than stretching Integration to cover it.
See [[project-vo-danh-luc-overview]] for project context.
