---
name: death-consequence-pending-fate-undo-contradiction
description: death-and-consequence.md Core Rule #4 literally contradicts itself on whether Kết liễu (execute) can be undone
metadata:
  type: project
---

`design/gdd/death-and-consequence.md` Core Rule #4 contains two adjacent
bullets that directly contradict each other:

1. The "Kết liễu" bullet states explicitly: "hành động Kết liễu VẪN undo
   được như mọi hành động khác trong lượt — Turn Manager Core Rule #8 cho
   phép sửa lỗi thao tác đúng 1 lượt gần nhất; NGOẠI LỆ DUY NHẤT không undo
   được là lượt chết thật của NHÂN VẬT CHÍNH... không áp dụng cho việc Kết
   liễu NPC." This is confirmed mechanically by AC-38 (undo of a non-death
   turn, including a Kết liễu turn, must roll back all D&C-owned flags).

2. The very next bullet ("Yêu cầu hiển thị bắt buộc cho cửa sổ Pending
   Fate") justifies a mandatory on-screen reminder by saying the opposite:
   "quyết định này KHÔNG thể undo một khi đã lan truyền (`kill_witnessed`
   kích hoạt phản ứng NPC Affinity)."

**Why**: These can't both be true as written. The likely intended meaning
is narrower — "irreversible" in the sense of "no second Pending Fate window
exists after this turn confirms, and once turn N+1 begins the standard
1-turn undo lock kicks in" — not "the system Undo feature is unavailable
for this action." As written, the reminder text this rule mandates (example
given: "cơ hội cuối để quyết định số phận [NPC]" / "last chance") actively
teaches the player something the GDD's own AC-38 says is false. If shipped
verbatim, a player who discovers they actually could have undone a Kết
liễu decision may lose trust in future irreversibility warnings elsewhere
in the game — a bad outcome for a system whose whole Player Fantasy promise
is that consequences are load-bearing and truthfully telegraphed.

**How to apply**: Flag this in any review/revision pass on
`death-and-consequence.md` Core Rule #4 or its Pending Fate UI copy — the
rationale sentence needs to be reworded to "no further chance to change
this choice after this turn confirms" (scoping to the 1-turn window) rather
than claiming Undo itself is unavailable. Cross-check the eventual
`design/ux/character-card.md` Pending Fate copy against whichever wording
wins here.
