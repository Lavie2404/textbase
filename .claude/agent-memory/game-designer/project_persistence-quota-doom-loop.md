---
name: persistence-quota-doom-loop
description: Persistence GDD Formula #1 proves every playthrough eventually exhausts browser quota, but no designed outcome exists for a single active slot alone consuming all quota with no other slot to free
metadata:
  type: project
---

`persistence-save-system.md` Formula #1 explicitly proves `quota_exhaustion_turn`
is finite for every sufficiently long playthrough ("số phận tất định, không
phải edge case hiếm"). The only designed recovery paths are (a) delete other
slots to free shared quota, (b) retry-then-escalate banner back to Save Slot
Screen. Neither path is designed for the case where the ACTIVE slot alone is
large enough to consume all available quota even after every other slot is
deleted — the only remaining "exit" is deleting the very slot that is stuck,
i.e. destroying the exact "hệ quả thực sự" the system exists to protect.

**Why**: Surfaced in `/design-review` round 3 (2026-08-07) of
`persistence-save-system.md`. Not covered by the 12 Required items fixed in
rounds 1-2 (review log only records aggregate counts, no itemization — see
[[persistence-export-format-ritual-mismatch]] sibling finding from same
session).

**How to apply**: Before this GDD is marked Approved, or when
`/create-architecture` picks the storage backend (a)/(b) in Core Rule #3,
flag that an explicit design decision is still needed for "single active
slot exceeds total quota with zero other slots to free" — e.g. force a
diegetic close of that playthrough at the ceiling, rather than letting the
player retry-loop indefinitely or self-delete their own history to escape.
