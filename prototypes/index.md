# Prototype Index

Complete history of what was tried and what was learned. See individual
`REPORT.md` files for full detail.

## Concept Prototypes

| Concept | Date | Path | Verdict | Report |
|---|---|---|---|---|
| Khế Ước AI-Tường Thuật | 2026-08-01 | HTML | PROCEED | [REPORT.md](khe-uoc-ai-concept/REPORT.md) |

## Technical Prototypes

| Question | Date | Path | Verdict | Report |
|---|---|---|---|---|
| CORS Gemini API từ browser origin (AI/LLM Core Rule #6, hạng mục #1 web-export.md) | 2026-08-11 | Python + headless Chrome | **PASS** — mở cổng Approved cho AI/LLM Integration Layer | [README.md](gemini-cors/README.md) |
| Persistence #2/#3/#5: IndexedDB oncomplete→GDScript + latency; Web Locks pending-Promise; mtime-collision IDBFS | 2026-08-11 | Godot 4.6 Web export | **#2 PASS, #3 PASS (biến thể `Promise.resolve.bind`), #5 measured-safe** — mở đường ADR-0002 | [README.md](persistence-web/README.md) |
| Persistence **Experiment 2b** (cổng pre-implementation ADR-0002 D1a): PackedByteArray qua bridge, compound-key cursor scan, transaction đa-store | 2026-08-11 | Godot 4.6 Web export | **DỞ DANG** — code 2b đã viết trong `main.gd` + đã re-export, nhưng harness bị treo khi chạy (chưa có results); phiên sau debug + chạy lại `run_prototype.py` | [persistence-web/](persistence-web/) |
