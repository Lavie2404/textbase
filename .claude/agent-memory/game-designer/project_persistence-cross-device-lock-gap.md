---
name: persistence-cross-device-lock-gap
description: Persistence's MULTI_TAB_CONFLICT is designed as a rare defensive edge case, but game-concept.md's Target Player Profile confirms PC+Mobile switching is this project's normal/default play pattern
metadata:
  type: project
---

`persistence-save-system.md` treats concurrent access to the same save slot
(`MULTI_TAB_CONFLICT`) purely as a rare defensive edge case, with recovery
text "Đóng tab/cửa sổ khác đang mở quyển này" — this assumes the player has
physical access to the *other* device right now. But `game-concept.md`
Target Player Profile explicitly states the sole target player uses
"Trình duyệt web trên PC và điện thoại" — switching devices mid-playthrough
is the *default* expected usage pattern for this specific solo project, not
an edge case. If the lock isn't released cleanly (crash, backgrounded mobile
tab, dead laptop battery), the player has no way to act on the recovery
instruction and no visibility into the ADR-deferred lock-release timeout.

**Why**: Surfaced in `/design-review` round 3 (2026-08-07) of
`persistence-save-system.md`. Open Questions already flag the *technical*
lock-release mechanism as ADR-blocked (Web Locks API vs. heartbeat/timeout),
but no design-level guidance exists for what timeout/messaging would
preserve flow for this confirmed cross-device usage pattern.

**How to apply**: When `/create-architecture` or a future GDD revision
addresses the cross-tab lock mechanism, push for either (a) a short,
player-visible wait/expiry estimate instead of "close the other tab", or
(b) an explicit "force takeover" flow with a clear risk warning — not just
an opaque ADR-owned timeout. This is a UX/game-design input the ADR needs,
not a pure technical decision.
