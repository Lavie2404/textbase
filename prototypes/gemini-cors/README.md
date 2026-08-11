# Prototype: Gemini API CORS from a browser origin

## Hypothesis being tested

`design/gdd/ai-llm-integration-layer.md` Core Rule #6 (client-direct AI calls
from a Godot Web export, no backend proxy) only works if the chosen AI
endpoint's real CORS policy allows cross-origin `POST` from the game's origin.
This is prototype item **#1** in the ranked list at the end of
`docs/engine-reference/godot/modules/web-export.md` — the sole remaining
Approved gate for that GDD (decided 2026-08-08, `/design-review` round 2).

- **PASS** → `systems-index.md` moves AI/LLM Integration Layer straight to Approved.
- **FAIL** → route to `/design-system` to redesign Core Rule #6 (backend proxy).

## How to run

```
python cors_probe.py
```

Requires: Python 3, Google Chrome, network access. No API key needed — CORS
verdicts are independent of auth (a readable 400 response proves CORS passes;
a CORS block manifests as `TypeError: Failed to fetch` with network up, which
the same-origin `/ping` control isolates).

Measurement A: raw `OPTIONS` preflight against
`generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`
for 4 candidate origins (localhost, itch.zone, github.io, unknown domain).

Measurement B: headless Chrome loads a page served from
`http://localhost:8765` and runs a real `fetch()` POST (same
`mode: "cors"` path Godot's Web `HTTPRequest` uses), reporting whether the
response is readable. Full output: `results.json`.

## Status

**CONCLUDED — 2026-08-11. VERDICT: PASS.**

## Findings

1. **CORS PASS, unconditionally.** Preflight returns 200 with
   `access-control-allow-origin` **echoing whatever Origin is sent** (all 4
   tested origins, including an arbitrary unknown domain), `POST` in
   `access-control-allow-methods`, and both tested header sets
   (`content-type,x-goog-api-key` and `content-type` alone) allowed verbatim.
   `access-control-max-age: 3600`.
2. **Real-browser confirmation.** From origin `http://localhost:8765`, a
   `fetch()` POST with a dummy key received **HTTP 400 "API key not valid"
   with a fully readable JSON body** for BOTH auth variants
   (`x-goog-api-key` header and `?key=` query param). The browser permitted
   the cross-origin read end-to-end; the failure was auth-layer, not CORS.
3. **Security consequence (feeds the ADR, flagged in advance by
   `security-engineer`, round 2):** because the policy is effectively
   `Allow-Origin: *` (origin-reflecting), CORS provides **zero** protection
   against a leaked/extracted default key being used from any website. The
   previously-deferred "HTTP referrer restriction in Google Cloud Console for
   the default key" is therefore the ONLY mechanism preventing quota theft
   from foreign origins — it must land in the same ADR as the backend choice
   (do not split them).
4. Prototype item **#6** (real billing impact of abandoned/zombie requests)
   is NOT closed by this prototype — it needs a real key and a billing
   console, and per the round-2 decision it is not part of the Approved gate.
   Carry it as a non-blocking measurement item into the AI-backend ADR.
