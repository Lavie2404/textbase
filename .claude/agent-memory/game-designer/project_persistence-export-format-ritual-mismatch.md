---
name: persistence-export-format-ritual-mismatch
description: Persistence Core Rule #9 export was reframed as a "ritual of remembrance" but still outputs raw JSON with mechanical fields (turn_id, locked_result) — format was never revisited after the meaning changed
metadata:
  type: project
---

`persistence-save-system.md` Core Rule #9 ("Chép lại quyển sổ") was reframed
in an earlier `/design-review` round from "backup/QA tool" to "nghi thức lưu
niệm" (ritual of remembrance — read/keep the emotion of the story). But the
actual output format is unchanged: JSON with `turn_id`, `action`,
`locked_result`, `narration_text`, `world_time` — the same shape as the
underlying QA/debug export. A player clicking this expecting to keep/reread
their story gets a machine-readable file full of mechanical IDs and locked
results, not prose.

**Why**: Surfaced in `/design-review` round 3 (2026-08-07). Prior rounds
iterated heavily on the *meaning*/copy of this action but never revisited
the *format* once the meaning changed — QA export and player-facing
"keepsake" export are different needs (structured/parseable vs.
readable prose) being served by one artifact, serving neither well.

**How to apply**: When this GDD next revises Core Rule #9 / UI Requirements,
consider splitting into two outputs — QA export keeps full JSON; player-facing
"Chép lại quyển sổ" should output readable text (e.g. `narration_text`
concatenated by `world_time`, no raw mechanical fields) — or explicitly
document why JSON still counts as "đọc được" under the ritual framing if the
team decides to keep it as-is. See sibling finding
[[persistence-quota-doom-loop]] from the same review session.
