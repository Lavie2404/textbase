# Systems Index: Vô Danh Lục

> **Status**: Draft
> **Created**: 2026-08-01
> **Last Updated**: 2026-08-03
> **Source Concept**: design/gdd/game-concept.md

---

## Overview

Vô Danh Lục là một RPG tu tiên tường thuật bằng văn bản, theo lượt, dựa trên
**Khế Ước Cơ Học/Tường Thuật**: mọi kết quả cơ học (chiến đấu, EXP, Hảo cảm,
cái chết) phải được hệ thống tính toán và khóa TRƯỚC khi AI được phép tường
thuật nó thành văn xuôi. Điều này tạo ra hai lớp song song xuyên suốt toàn bộ
hệ thống bên dưới: các hệ thống sở hữu trạng thái (logic thuần) và một tầng
tường thuật AI render kết quả đã khóa của chúng thành văn bản sống động
(Pillar 4). Toàn bộ phục vụ Core Fantasy — một kẻ vô danh tu luyện trong một
thế giới khách quan công bằng, hệ quả vĩnh viễn (Pillar 1-3), với một khoảng
mở cho tự do nhập vai (Pillar 5) mà kiến trúc nền tảng (Khế Ước một chiều) đã
được kiểm chứng kỹ thuật qua concept prototype (`prototypes/khe-uoc-ai-concept/`,
verdict PROCEED).

---

## Systems Enumeration

| # | System Name | Category | Priority | Status | Design Doc | Depends On |
|---|-------------|----------|----------|--------|------------|------------|
| 1 | Turn Manager / Core Game Loop (inferred) | Core | MVP | Approved | [turn-manager.md](turn-manager.md) | — |
| 2 | Mechanic/Narration Contract Enforcement (inferred) | Core | MVP | Approved | [mechanic-narration-contract-enforcement.md](mechanic-narration-contract-enforcement.md) | — |
| 3 | Equipment & Skill Data System (inferred) | Gameplay | MVP | Approved | [equipment-skill-data-system.md](equipment-skill-data-system.md) | — |
| 4 | AI/LLM Integration Layer | Core | MVP | Designed | [ai-llm-integration-layer.md](ai-llm-integration-layer.md) | Mechanic/Narration Contract Enforcement |
| 5 | World Memory & Context Management (inferred) | Core | MVP | Designed | [world-memory-context-management.md](world-memory-context-management.md) | Turn Manager |
| 6 | Persistence / Save System | Persistence | MVP | Designed | [persistence-save-system.md](persistence-save-system.md) | Turn Manager |
| 7 | Combat System | Gameplay | MVP | Designed | [combat-system.md](combat-system.md) | Equipment & Skill Data, AI Integration Layer, Turn Manager, Contract Enforcement |
| 8 | EXP & Realm Progression | Progression | MVP | Designed | [exp-realm-progression.md](exp-realm-progression.md) | Combat System, Turn Manager |
| 9 | NPC Affinity & Relationship | Progression | MVP | Not Started | — | Turn Manager, World Memory |
| 10 | Setting & Canon Integration | Narrative | MVP | Not Started | — | World Memory |
| 11 | Situation/Encounter Generation (inferred) | Narrative | MVP | Not Started | — | AI Integration Layer, Turn Manager, World Memory |
| 12 | Death & Consequence | Gameplay | MVP | Not Started | — | Combat System, NPC Affinity |
| 13 | Character Continuation (inferred) | Gameplay | MVP | Not Started | — | Death & Consequence |
| 14 | Character Card & Identity | UI | MVP | Not Started | — | Equipment & Skill Data, NPC Affinity, Setting & Canon Integration |
| 15 | Core UI/Screen Navigation (inferred) | UI | MVP | Not Started | — | Combat System, Character Card, Situation Generation |

---

## Categories

| Category | Description | Systems in this project |
|----------|-------------|--------------------------|
| **Core** | Foundation systems everything depends on | Turn Manager, Contract Enforcement, AI Integration Layer, World Memory |
| **Gameplay** | The systems that make the game fun | Equipment & Skill Data, Combat, Death & Consequence, Character Continuation |
| **Progression** | How the player grows over time | EXP & Realm Progression, NPC Affinity & Relationship |
| **Persistence** | Save state and continuity | Persistence / Save System |
| **UI** | Player-facing information displays | Character Card & Identity, Core UI/Screen Navigation |
| **Narrative** | Story and dialogue delivery | Setting & Canon Integration, Situation/Encounter Generation |

*(Economy và Audio bị loại bỏ — game không có currency/shop, và audio ở mức tối
thiểu chưa cần hệ thống riêng theo Technical Considerations của game-concept.md.)*

---

## Priority Tiers

Toàn bộ 15 hệ thống đều ở tier **MVP** — không có hệ thống nào hoãn sang
Vertical Slice/Alpha/Full Vision ở cấp hệ thống; chỉ có phạm vi BÊN TRONG một
số hệ thống bị cắt (xem cột "Ghi chú scope MVP" bên dưới). Quyết định này đã
được người dùng xác nhận sau khi Producer (qua `/gate-check`) cảnh báo về rủi
ro scope creep.

| System | Ghi chú scope MVP |
|---|---|
| Character Continuation | Chỉ cần 1/3 lối (Chơi lại) hoạt động đầy đủ ở MVP — Quỷ tu và Chuyển sinh hoãn sang Vertical Slice (khuyến nghị Producer, `/gate-check` 2026-08-01) |

---

## Dependency Map

### Foundation Layer (no dependencies)

1. **Turn Manager / Core Game Loop** — mọi hệ thống khác đều "cắm vào" một lượt chơi; chưa có định nghĩa tường minh nào về trình tự lượt trong game-concept.md
2. **Mechanic/Narration Contract Enforcement** — nguyên tắc kiến trúc thuần (state → khóa → AI chỉ kể), không phụ thuộc hệ thống nào khác để tồn tại như một luật

*(Phát hiện từ `/design-system` hệ #2, 2026-08-02: dù cả hai đều ở Foundation
layer, Turn Manager's Core Rule #4/#8 trên thực tế GIẢ ĐỊNH pipeline
enforcement của hệ #2 tồn tại — một phụ thuộc trong-tier chưa được liệt kê
tường minh ở bảng Systems Enumeration phía trên. Không sửa cột "Depends
On" của Turn Manager để giữ nguyên ngữ nghĩa "Foundation = 0 dependency
bên ngoài" của bảng đó; ghi nhận ở đây làm nguồn tham chiếu chính thức.)*
3. **Equipment & Skill Data System** — data model thuần cho vũ khí/kỹ năng/thức, độc lập với logic game

### Core Layer (depends on foundation)

1. **AI/LLM Integration Layer** — depends on: Mechanic/Narration Contract Enforcement (phải tuân thủ kiến trúc một chiều khi gọi AI)

*(Phát hiện từ `/design-system` hệ #4, 2026-08-02, cùng dạng với ghi chú ở
Foundation Layer phía trên: Turn Manager gọi thẳng vào AI/LLM Integration
Layer (`request_ai()`, tối đa 3 lần/lượt) — một phụ thuộc chưa được liệt
kê tường minh ở bảng Systems Enumeration (Turn Manager vẫn giữ "Depends
On: —" để đúng ngữ nghĩa "Foundation = 0 dependency bên ngoài"). Ghi nhận
ở đây làm nguồn tham chiếu chính thức, giống cách xử lý cạnh Turn Manager
→ Contract Enforcement.)*
2. **World Memory & Context Management** — depends on: Turn Manager (thời gian thế giới chỉ trôi theo lượt người chơi)

*(Phát hiện từ `/design-system` hệ #5, 2026-08-02, cùng dạng với 2 ghi chú
phía trên: Turn Manager đọc Khung ngữ cảnh AI trực tiếp từ World Memory
(chưa được liệt kê tường minh ở bảng Systems Enumeration — Turn Manager
vẫn giữ "Depends On: —"). Ghi nhận ở đây làm nguồn tham chiếu chính thức,
giống cách xử lý 2 cạnh trước.)*
3. **Persistence / Save System** — depends on: Turn Manager (cần biết trạng thái nào tồn tại sau mỗi lượt để lưu)

*(Phát hiện từ `/design-system` hệ #6, 2026-08-02, cùng dạng với 3 ghi chú
phía trên: `equipment-skill-data-system.md` (Approved) không hề nhắc đến
Persistence/Save System trong Dependencies của chính nó, dù Persistence
GDD liệt kê nó là 1 downstream hard dependency (blob chứa
`known_skill_ids`, trang bị). Ghi nhận ở đây làm nguồn tham chiếu chính
thức, giống cách xử lý 3 cạnh trước.)*

### Feature Layer (depends on core)

1. **Combat System** — depends on: Equipment & Skill Data, AI Integration Layer, Turn Manager, Contract Enforcement
2. **EXP & Realm Progression** — depends on: Combat System (nguồn EXP), Turn Manager
3. **NPC Affinity & Relationship** — depends on: Turn Manager, World Memory (lan truyền xã hội cần lịch sử)
4. **Setting & Canon Integration** — depends on: World Memory (luật tiền đề nhân quả phá vỡ cần theo dõi lịch sử)
5. **Situation/Encounter Generation** — depends on: AI Integration Layer, Turn Manager, World Memory
6. **Death & Consequence** — depends on: Combat System (kích hoạt "phải chết"), NPC Affinity (ngưỡng thù địch sâu sắc -100→-80)
7. **Character Continuation** — depends on: Death & Consequence (chỉ kích hoạt khi cái chết thật xảy ra)

*(Phát hiện từ `/design-system` hệ #8, 2026-08-03, cùng dạng với các ghi
chú phía trên: `exp-realm-progression.md` (Designed) có 5 dependency chưa
được liệt kê tường minh ở bảng Systems Enumeration (hàng của hệ #8 vẫn giữ
"Depends On: Combat System, Turn Manager" để đúng phạm vi phụ thuộc cứng
chính) — (a) NPC Affinity & Relationship (soft, trạng thái Song Tu active
cho nguồn EXP), (b) Death & Consequence (soft, cờ "phế đan điền" chặn tích
lũy EXP), (c) Setting & Canon Integration (**hard** cho việc đột phá bậc —
dữ liệu `breakthrough_requirement` cụ thể theo bối cảnh), (d) Character
Card & Identity (chiều ngược, đọc `level`/`tier` để hiển thị), (e)
Situation/Encounter Generation (chiều ngược, đọc `level` cho ngưỡng 20
cấp). Ghi nhận ở đây làm nguồn tham chiếu chính thức, giống cách xử lý 4
gap trước.)*

### Presentation Layer (depends on features)

1. **Character Card & Identity** — depends on: Equipment & Skill Data, NPC Affinity, Setting & Canon Integration (quy tắc cải trang/xuyên không)
2. **Core UI/Screen Navigation** — depends on: Combat System, Character Card, Situation/Encounter Generation

### Polish Layer (depends on everything)

*(Chưa có hệ thống nào ở layer này trong scope hiện tại — tutorial/accessibility/analytics chưa được đề cập trong game-concept.md)*

---

## Recommended Design Order

| Order | System | Priority | Layer | Agent(s) | Est. Effort |
|-------|--------|----------|-------|----------|-------------|
| 1 | Turn Manager / Core Game Loop | MVP | Foundation | systems-designer | S |
| 2 | Mechanic/Narration Contract Enforcement | MVP | Foundation | systems-designer, godot-specialist | M |
| 3 | Equipment & Skill Data System | MVP | Foundation | systems-designer, game-designer | M |
| 4 | AI/LLM Integration Layer | MVP | Core | godot-specialist, systems-designer | M |
| 5 | World Memory & Context Management | MVP | Core | systems-designer, technical-director (context) | L |
| 6 | Persistence / Save System | MVP | Core | godot-specialist | M |
| 7 | Combat System | MVP | Feature | systems-designer, game-designer | L |
| 8 | EXP & Realm Progression | MVP | Feature | systems-designer, economy-designer | M |
| 9 | NPC Affinity & Relationship | MVP | Feature | systems-designer, economy-designer | L |
| 10 | Setting & Canon Integration | MVP | Feature | narrative-director, game-designer | L |
| 11 | Situation/Encounter Generation | MVP | Feature | narrative-director, systems-designer | M |
| 12 | Death & Consequence | MVP | Feature | game-designer, systems-designer | M |
| 13 | Character Continuation | MVP | Feature | narrative-director, game-designer | S |
| 14 | Character Card & Identity | MVP | Presentation | ux-designer, game-designer | M |
| 15 | Core UI/Screen Navigation | MVP | Presentation | ux-designer, ui-programmer | M |

*(S = 1 phiên thiết kế, M = 2-3 phiên, L = 4+ phiên.)*

---

## Circular Dependencies

- Không phát hiện. Một vòng lặp tiềm ẩn giữa Death & Consequence ↔ Character
  Continuation đã được giải quyết bằng cách xác định rõ chiều phụ thuộc: Death
  & Consequence kích hoạt Character Continuation (không ngược lại) — Character
  Continuation chỉ là một nhánh xử lý được gọi SAU KHI cái chết thật xảy ra.

---

## High-Risk Systems

| System | Risk Type | Risk Description | Mitigation |
|--------|-----------|-------------------|------------|
| World Memory & Context Management | Technical | "Nhật ký thế giới vô hạn" xung đột trực tiếp với giới hạn context window của LLM — cảnh báo từ technical-director tại `/gate-check` 2026-08-01 | Đặc tả chiến lược nén/rotate NGAY trong GDD, không hoãn; cần ADR riêng trước `/create-architecture` |
| Setting & Canon Integration | Design | Luật "tiền đề nhân quả cố định vs. có thể phá vỡ" hiện chỉ có 1 ví dụ minh họa, chưa có rubric tổng quát — phát hiện từ narrative-director tại `/design-review` | Định nghĩa rubric tường minh (không chỉ ví dụ) trong Detailed Rules; playtest với ≥2-3 tình huống canon khác nhau trước khi chốt |
| NPC Affinity & Relationship | Design | Chưa có tốc độ tăng/giảm/suy giảm Hảo cảm, rủi ro clamp qua chuỗi lan truyền — phát hiện từ systems-designer tại `/design-review` | Định nghĩa rate + toàn bộ test case biên (đã liệt kê trong `design/gdd/reviews/game-concept-review-log.md`) trong Formulas section |
| Combat System | Design | Rủi ro biên công thức (0/0 khi 2 bên đều 0 điểm, floor khi chồng phạt vượt bậc + áp chế cảnh giới) — đã flag từ `/design-review`, MỘT PHẦN đã kiểm chứng qua prototype (thức/nhịp trận) | Dùng nguyên bộ test case biên trong review log làm Acceptance Criteria của GDD |
| AI/LLM Integration Layer | Technical | Backend AI/LLM chưa chốt; ToS Gemini cho nội dung NSFW (Pillar 5) chưa xác minh | Resolve qua ADR trước `/create-architecture`; kiến trúc pattern (one-way lock, safetySettings) đã kiểm chứng khả thi qua prototype — chỉ còn vấn đề pháp lý/nhà cung cấp |

---

## Progress Tracker

| Metric | Count |
|--------|-------|
| Total systems identified | 15 |
| Design docs started | 8 |
| Design docs reviewed | 3 |
| Design docs approved | 3 |
| MVP systems designed | 8/15 |
| Vertical Slice systems designed | 0/0 |

---

## Next Steps

- [x] Review and approve this systems enumeration
- [ ] Design MVP-tier systems first (use `/design-system [system-name]`), theo đúng Recommended Design Order ở trên
- [ ] Run `/design-review` on each completed GDD
- [ ] Run `/gate-check pre-production` when MVP systems are designed
- [ ] Validate the highest-risk systems (World Memory context management, Combat formula boundaries) with focused spikes before committing to full implementation
