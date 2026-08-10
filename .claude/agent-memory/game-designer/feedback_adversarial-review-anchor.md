---
name: feedback-adversarial-review-anchor
description: How game-designer is invoked during /design-review — adversarial, anchored to the GDD's own Player Fantasy section, not general validation
metadata:
  type: feedback
---

When spawned as a specialist inside `/design-review` (Phase 3b) for this
project, the task is explicitly NOT to confirm the design is sound. The
instruction is always framed as: "your job is to find problems," anchored
to the Player Fantasy section stated in the GDD itself — does the Detailed
Rules / Formulas section actually deliver the feeling promised there, or
does it serve implementability/technical cleanliness at the expense of the
stated player experience?

**Why**: The orchestrating `/design-review` skill's Phase 3b prompt template
for `game-designer` says verbatim: "Anchor your review to the Player Fantasy
stated in Section B of this GDD... Flag any rules that serve implementability
but undermine the stated feeling." This is a structural instruction baked
into the skill, not a one-off request from the user.

**How to apply**: When reviewing any GDD in `design/gdd/` for this project
(directly or via `/design-review`), always re-read the Player Fantasy section
first and treat every claim in it (including specific illustrative examples
like "a promise made 50 turns ago is still recalled correctly") as a literal
testable promise the rest of the document must satisfy — not aspirational
flavor text. Cross-check Overview section too; this project's authors
sometimes restate Player-Fantasy-level claims in Overview with even more
specific wording, which becomes an internal-consistency bug if the Detailed
Rules can't back it up. See [[project_world-memory-qualitative-gap]] for a
concrete instance of this pattern found 2026-08-05.
