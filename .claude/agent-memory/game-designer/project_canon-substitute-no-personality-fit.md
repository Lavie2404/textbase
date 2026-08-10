---
name: canon-substitute-no-personality-fit
description: setting-canon-integration.md D.3 substitute_selection is pure tier+faction math with no relationship/personality-fit dimension, and substitute is the unspecified-authoring DEFAULT on_break policy — risk of mechanically-valid, narratively-absurd role recasts
metadata:
  type: project
---

`setting-canon-integration.md` Core Rule #4 (line ~101-105) marks
`substitute` as the DEFAULT `on_break` policy for any premise that
doesn't explicitly specify otherwise. D.3's `eligible()`/`fit_score()`
(line 300-306) selects a replacement purely by `alive`, `tier` proximity
to `role.target_tier`, and optional `allowed_factions` (which can be left
`∅` = unrestricted by the author) — there is no relationship history,
motive, or narrative-fit dimension anywhere in the selection math.

**The framing the GDD gives for `substitute` is deliberately low-stakes**
("giết sứ giả Vũ Hồn Điện thì sứ giả khác đến" — an institutional/
faceless role where personality doesn't matter). That's a legitimate use
case. But nothing in Core Rule #4 or D.3 *restricts* `substitute` to only
faceless institutional roles — it's the fallback for ANY premise an
author doesn't think to mark `vanish`/`branch`. Combined with the MVP's
admittedly minimal authoring scope (3 NPC, 2-3 events — Core Rule #1),
there's real risk that a personally-significant role (a specific rival's
grudge, a mentor's plot) gets recast onto a mechanically-fit but
narratively-unrelated NPC — the literal opposite of Player Fantasy's
"gián tiếp" tier promise: "thế giới vận hành đúng luật... người chơi chỉ
thấy một thế giới nhất quán đến mức tin được." A tier-matched stranger
stepping into a villain's shoes for no diegetic reason exposes exactly
the mechanical scaffolding that promise is supposed to hide.

**How to apply**: when authoring the MVP setting-pack content (Open
Questions item "Authoring 2-3 canon event MVP"), or reviewing future
setting packs, check that any role NOT marked `vanish` has been
deliberately considered as "faceless/institutional" — flag roles with
named, personality-bearing candidates defaulting to `substitute` without
an explicit author decision. This is an authoring-discipline gap, not
purely a formula gap: the formula is fine for its intended faceless-role
use case, the risk is scope creep from the *default* behavior.
