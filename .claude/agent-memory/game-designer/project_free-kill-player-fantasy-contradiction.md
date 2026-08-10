---
name: free-kill-player-fantasy-contradiction
description: npc-affinity-relationship.md Player Fantasy claims "không có free kill nào sạch sẽ" but Core Rule #4 / D.5 / Edge Cases explicitly deliver a fully clean, zero-consequence kill when there is no witness
metadata:
  type: project
---

`design/gdd/npc-affinity-relationship.md` Section B (Player Fantasy)
states: "Thù hận còn lan: hại một người là mang tiếng với cả vòng quan hệ
của họ — **không có 'free kill' nào sạch sẽ**." But Core Rule #4 and the
Edge Cases section explicitly specify the opposite: a `kill_witnessed`
event with zero witnesses in `entities_in_scope` produces **zero**
`affinity_delta` fields for any NPC — no propagation, no `CRUELTY_REP_DELTA`
reputation hit, nothing. The doc's own Open Questions entry closes this as
intentional ("tội ác hoàn hảo là chiến lược hợp lệ... Closed — quyết định
người dùng"). The mechanic is deliberately correct; the Player Fantasy
prose is the thing that overclaims and directly contradicts the doc's own
rules.

**Why**: found during `/design-review` of `npc-affinity-relationship.md`
(2026-08-08). This is a documentation-integrity issue, not a request to
reopen the already-closed no-witness design decision — the fix is wording,
not mechanics.

**How to apply**: when revising this GDD, reword the Player Fantasy line
to something like "hại một người CÓ NHÂN CHỨNG là mang tiếng với cả vòng
quan hệ của họ; giết không nhân chứng là tội ác hoàn hảo hợp lệ trong thế
giới khách quan" — so the stated fantasy matches the actual guarantee. Also
watch for this same overclaim pattern recurring in narrative-director or
UX copy that references this system (marketing copy tends to inherit GDD
Player Fantasy language verbatim).
