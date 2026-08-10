---
name: project-world-memory-qualitative-gap
description: World Memory & Context Management only extracts numeric/structured facts from locked_result — qualitative narrative content (promises, personality reveals, dialogue-only commitments) has no durable home anywhere in the 15-system architecture
metadata:
  type: project
---

`design/gdd/world-memory-context-management.md` (reviewed 2026-08-05) builds
long-term AI memory ONLY from structured fields of `locked_result`
(`hp_delta`, `affinity_delta_[npc_id]`, etc. — Core Rule #3, Formula #2).
`narration_text` is permanently discarded from the AI Context View once a
turn falls outside `recency_window_turns` (default 5). This is intentional
and correctly enforces the Mechanic/Narration Contract (no inferring state
from prose) — but it means anything that is PURELY qualitative/narrative —
a spoken promise, a piece of backstory an NPC reveals, a reason for a grudge
that never produced a stat delta — generates zero facts (`facts_extracted=0`
is explicitly documented as valid, non-error) and is unrecoverable by the AI
after ~5 turns, even though the Overview/Player Fantasy of that same GDD
explicitly promises "một lời hứa NPC đưa ra 50 lượt trước vẫn được nhắc
đúng."

**Why this matters**: Checked `systems-index.md`'s full 15-system list and
`setting-canon-integration.md`'s premise system — there is NO quest/promise/
commitment-tracking system anywhere in the architecture. Setting & Canon's
"premise" mechanism only covers canon-sourced narrative events from the
source novel (e.g., "Tiểu Vũ alive"), not arbitrary player↔NPC commitments
made through roleplay. `persistence-save-system.md` even name-drops "mọi lời
hứa với NPC" as something the game is supposed to preserve, without any
system actually owning that data structurally. This is a recurring,
cross-cutting gap, not a one-off bug in one GDD — it will resurface whenever
reviewing NPC Affinity, Situation/Encounter Generation, or any future
quest-like system.

Also structurally tied: `recency_window_turns` is a raw turn-count window
with zero scene/conversation awareness — a single multi-turn dialogue (or a
handful of combat exchanges) can evict its own earlier turns before the
scene resolves, which is a self-inflicted mid-scene continuity break, not
just a long-horizon memory-loss issue.

**How to apply**: When reviewing NPC Affinity & Relationship, Situation/
Encounter Generation, or any future GDD that touches "NPC remembers X"
claims, check whether a structured Commitment/Promise ledger has been
proposed yet. If not, keep flagging it — recommend either (a) narrowing
Player-Fantasy claims to only structured/mechanical commitments, or (b) a
minimal Commitment Ledger (entity_id, commitment_type/tag, status, turn_id)
populated via a required structured field on `locked_result` when the AI/
player narrates a promise-like moment, consistent with this project's
"never trust free text" philosophy. See [[feedback_adversarial-review-anchor]].
