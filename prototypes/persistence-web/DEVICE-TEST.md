# Device test — web-export.md open item #4

Goal: measure the values documentation cannot give us, **on the real
distribution channels**: iOS Safari / WKWebView and the Zalo / Facebook /
Messenger in-app browsers (plus Android Chrome WebView).

What the page measures and shows **on-screen** (top-left overlay, no console
needed): `navigator.storage.estimate()` quota + usage,
`navigator.storage.persist()` grant result, Web Locks availability, IndexedDB
availability, `OS.is_userfs_persistent()` — then it runs the same #2/#3/#5
experiments and POSTs everything to the serving origin's `/report` endpoint
(captured into `device-reports.json`).

## Option A — same Wi-Fi, plain http (quick, PARTIAL results only)

```
python prototypes/persistence-web/run_prototype.py --serve
```

It prints a `http://<LAN-IP>:8766/index.html?phase=1` URL. Open it on the
phone (same Wi-Fi; allow Python through the Windows firewall on first run).

**Limitation**: `navigator.storage` and `navigator.locks` are
SECURE-CONTEXT-ONLY APIs. Over plain `http://` on a LAN IP (not localhost)
they are `undefined`, so quota / persist / Web Locks will report *unavailable*
— that is the http limitation, NOT the device's answer. IndexedDB/IDBFS
(experiments #2 write path via bridge may also fail since `indexedDB` itself
still works on http, but treat any missing-API result over http as suspect).
Use Option A only as a smoke test that the build boots on the device.

## Option B — https tunnel (RECOMMENDED; required for Zalo/FB/Messenger anyway)

In-app browsers open links from a chat message, so they need a public URL —
and https gives the secure context that makes all four probes meaningful.

1. Start the local server: `python prototypes/persistence-web/run_prototype.py --serve`
2. Tunnel it, e.g. with cloudflared (no account needed):
   `cloudflared tunnel --url http://localhost:8766`
   (or `ngrok http 8766`, or VS Code / Dev Tunnels port forwarding set to public)
3. Send the printed `https://...` URL (append `/index.html?phase=1`) to
   yourself in Zalo / Messenger, open it inside the app's browser; also open
   it in real iOS Safari.
4. After the overlay shows `== REPORT SENT ==`, close the page, reopen the
   same URL with `?phase=2` (this is the reload leg of the mtime test #5).
5. Reports land in `prototypes/persistence-web/device-reports.json` on the PC
   (one entry per page load; `device.user_agent` tells the runs apart).

## What to record per browser/app

| Item | Where it appears |
|---|---|
| Quota (`estimate().quota`) | overlay + report `device.quota_bytes` |
| `persist()` granted? | overlay + report `device.persist_granted` |
| Web Locks available? | overlay + report `device.web_locks_available` |
| IndexedDB available? / `is_userfs_persistent` | overlay + report |
| #2 latency on the device | report `exp2_idb.latency` (compare vs 150 ms budget) |
| #3 lock pattern works? | report `exp3_locks.pass` (expect `bind_trick`) |
| #5 reload survival | phase-2 report `exp5_phase2` |

Also worth noting per WebKit's ITP: a *denied* `persist()` on iOS means the
~7-day-no-interaction eviction risk stands (see web-export.md Q8).

Matrix to cover: iOS Safari, iOS Zalo in-app, iOS Messenger/Facebook in-app,
Android Chrome, Android Zalo in-app — lowest supported OS versions you target.
