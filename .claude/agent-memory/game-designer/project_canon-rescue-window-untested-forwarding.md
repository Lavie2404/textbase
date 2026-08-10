---
name: canon-rescue-window-untested-forwarding
description: setting-canon-integration.md's rescue_window_final interface (added round 1) has zero acceptance criteria testing its correctness or that it reaches the downstream payload — the gap the round's own ADVISORY classification assumed didn't exist
metadata:
  type: project
---

`setting-canon-integration.md` round 1 (2026-08-08) added
`rescue_window_final(event_id)` as a new public interface (end of Edge
Cases / Interfaces section) so Situation/Encounter Generation can build
narrative "last chance" pressure without a UI timer (Phương án B,
user decision). The doc's own risk note (UI Requirements #2) says this
is safely ADVISORY because "tầng cơ học (field/cờ) đã khóa
deterministic, chỉ câu chữ diễn giải là non-deterministic" — i.e., it
assumes only 2 layers exist: (1) deterministic flag computation, (2)
non-deterministic AI prose.

That assumption is wrong — there's a **3rd layer** with zero test
coverage: whether the deterministic flag actually gets *forwarded* into
whatever payload Situation/Encounter Generation's `suggestion_call`
consumes. No AC in the file (checked full AC-01 through AC-48) verifies
either (a) `rescue_window_final`'s boolean correctness across the
Suspended/is_due matrix, or (b) that the flag is present in the payload
via mock-spy when true — the same testable-contract pattern the doc
itself already uses elsewhere (AC-45 does exactly this call-order/
payload-content check for `narration_call`). Every OTHER public
interface in this GDD (`canon_due_payload`, `canon_role_npcs`,
`canon_rescue_failed_*`) has a dedicated AC; this one — introduced in
the same round that produced the ADVISORY-risk note about it — does
not.

**Why this matters**: MVP has only 3 NPCs / 2-3 canon events, so this
"rare edge" fires at most 2-3 times in a full playthrough. If the
forwarding link is silently broken (a plumbing bug, not a prose-quality
issue), the player permanently loses a rescue opportunity with literally
zero chance of noticing — no badge/timer exists by design (Phương án B),
and now no test would catch the underlying bug either.

**How to apply**: when this GDD is revised, add 2 ACs before Approved:
(1) unit test for `rescue_window_final` boolean correctness (reuses
`is_due`, D.2), (2) mock-spy test verifying the flag is forwarded into
the Situation/Encounter Generation payload whenever true — classify both
BLOCKING (same class as AC-45), leaving only the actual prose-quality
question ADVISORY under [[project_canon-suspended-chip-urgency-gap]] /
AC-47. Don't accept "the mechanical layer is locked" as sufficient
without checking the interface that layer feeds actually has a covered
contract.
