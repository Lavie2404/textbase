# Claude Code Game Studios -- Game Studio Agent Architecture

Indie game development managed through 49 coordinated Claude Code subagents.
Each agent owns a specific domain, enforcing separation of concerns and quality.

## Technology Stack

- **Platform**: Web app (browser), no game engine — pivoted 2026-08-14 from the
  original Godot 4.6 plan. See `production/session-state/active.md` for the
  decision record.
- **Language**: TypeScript / JavaScript (React)
- **Frontend**: React, built with Vite
- **Backend**: Firebase (Auth, Firestore, Storage)
- **AI**: Gemini API (client-side calls, user-supplied key)
- **Save/Backup**: GitHub repo (via GitHub API)
- **Version Control**: Git with trunk-based development
- **Build System**: Vite

> **Note**: No dedicated web/React specialist agent exists in this roster yet.
> Implementation routes to the generic programmer agents (`gameplay-programmer`,
> `ui-programmer`, `lead-programmer`, `tools-programmer`) — see
> `technical-preferences.md` § Engine Specialists for the routing table.

## Project Structure

@.claude/docs/directory-structure.md

## Technical Preferences

@.claude/docs/technical-preferences.md

## Coordination Rules

@.claude/docs/coordination-rules.md

## Collaboration Protocol

**User-driven collaboration, not autonomous execution.**
Every task follows: **Question -> Options -> Decision -> Draft -> Approval**

- Agents MUST ask "May I write this to [filepath]?" before using Write/Edit tools
- Agents MUST show drafts or summaries before requesting approval
- Multi-file changes require explicit approval for the full changeset
- No commits without user instruction

See `docs/COLLABORATIVE-DESIGN-PRINCIPLE.md` for full protocol and examples.

> **First session?** If the project has no engine configured and no game concept,
> run `/start` to begin the guided onboarding flow.

## Language Policy

- **NGHIÊM CẤM TUYỆT ĐỐI** giao tiếp với người dùng bằng bất kỳ ngôn ngữ nào khác ngoài tiếng Việt. Mọi văn bản hướng tới người dùng — câu hỏi, lựa chọn, bản nháp, tóm tắt, cập nhật trạng thái, thông báo lỗi, tin nhắn trò chuyện — **BẮT BUỘC** phải bằng tiếng Việt, không có ngoại lệ.
- **Player-facing / game content** (story, dialogue, narrative docs, in-game UI text): Vietnamese.
- **Technical documentation & code** (CLAUDE.md, ADRs, architecture docs, code comments): English, per `coding-standards.md`.
- **All AI↔user conversation** (questions, approval requests, drafts, summaries, status updates, error messages, chat replies): Vietnamese, regardless of the language of the artifact being discussed. This rule overrides any default behavior — respond in Vietnamese even when the user writes in another language.

## Coding Standards

@.claude/docs/coding-standards.md

## Context Management

@.claude/docs/context-management.md
