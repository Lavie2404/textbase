---
name: canon-rescue-success-overclaim
description: setting-canon-integration.md Player Fantasy phrasing ("nguoi du hieu va du manh co the can thiep") reads as skill-guarantees-success, but rescue can fail via no_vacant_role regardless of player skill/correctness
metadata:
  type: project
---

`setting-canon-integration.md` Player Fantasy's peak description says
breaking fate is "một cấu trúc nhân quả có thật mà người đủ hiểu và đủ
mạnh có thể can thiệp" (a real causal structure that someone with
enough understanding and strength CAN intervene in). Read casually this
implies mastery -> success. Mechanically that's not guaranteed: Rule
#4b's `canon_rescue_failed_[event_id]` enum includes `no_vacant_role` —
a failure mode independent of the player's proposed candidate's
eligibility, i.e. the world-state may simply have zero valid candidates
left anywhere, so even a perfectly-informed, perfectly-executed rescue
attempt fails through no fault of the player. This is consistent with
Pillar 1 (objective world, no guarantees) but the Player Fantasy prose
doesn't carry that caveat, risking a Competence/fairness complaint in
playtest ("I did everything right and it still failed with no
explanation of what I could've done differently").

Secondary, smaller finding: AC-07 (which tests Rule #4b rescue-failure)
only exercises 4 of the 5 listed enum reasons (dead / tier_out_of_range
/ wrong_faction / excluded) — `no_vacant_role` has zero test coverage
in the rescue-failure context, and its applicability is questionable
there in the first place since Rule #4b's flow evaluates one
player-proposed candidate C (per-candidate reasons: dead/tier/faction/
excluded make sense; "no vacant role" reads more like D.3's pool-empty
fallback at Due, not a per-candidate rescue check). Worth a follow-up
question to systems-designer: can `no_vacant_role` actually arise from
Rule #4b's specific-candidate eligibility check, or was it miscopied
from D.3's Due-context enum?

**Not blocking** (round-cap final round) — advisory text clarification:
add one clause acknowledging skilled/correct attempts can still fail
due to world-state scarcity. The enum-coverage question is nhóm-B,
appropriate for backlog per the mechanically-heavy round-cap policy.
