#!/usr/bin/env node
/**
 * probe-gemini.mjs - which Gemini text models answer RIGHT NOW, and how fast?
 *
 * Usage:
 *   node tools/probe-gemini.mjs <API_KEY> [extra-model ...]
 *   GEMINI_API_KEY=... node tools/probe-gemini.mjs
 *
 * What it does (read-only, one tiny prompt per model):
 *   1. GET  /v1beta/models              -> lists every model your key can see that
 *                                          supports generateContent.
 *   2. POST /v1beta/models/<m>:generateContent for each model in the game's
 *      fallback ladder (plus any names passed on the command line), with a
 *      30 s abort, and prints: HTTP status, latency, and Google's error message.
 *
 * Interpreting the table:
 *   200            model is healthy -> a good "Model AI Uu Tien" choice in-game
 *   503            Google-side overload ("The model is overloaded") -> not your key
 *   429            quota exhausted for THIS key
 *   404            model name does not exist / not enabled for this key
 *   400/401/403    key problem (invalid, restricted, project not allowed)
 *   ABORT 30s      request hung - exactly what burns the game's fallback budget
 *
 * The key is never printed. Requires Node 18+ (global fetch).
 */

const LADDER = [
  'gemini-3-flash-preview',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
];
const BASE = 'https://generativelanguage.googleapis.com/v1beta';
const PER_REQUEST_TIMEOUT_MS = 30_000;

const argv = process.argv.slice(2);
const key = (argv[0] && !argv[0].startsWith('gemini-') ? argv.shift() : process.env.GEMINI_API_KEY || '').trim();
if (!key) {
  console.error('Thiếu API key. Dùng: node tools/probe-gemini.mjs <API_KEY> [model ...]');
  process.exit(2);
}
const modelsToProbe = [...new Set([...LADDER, ...argv])];

const headers = { 'Content-Type': 'application/json', 'x-goog-api-key': key };

async function withTimeout(ms, fn) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(t);
  }
}

async function listModels() {
  const found = [];
  let pageToken = '';
  for (let page = 0; page < 10; page++) {
    const url = `${BASE}/models?pageSize=200${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`;
    const res = await withTimeout(PER_REQUEST_TIMEOUT_MS, (signal) => fetch(url, { headers, signal }));
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`GET /models -> HTTP ${res.status}: ${body.slice(0, 300)}`);
    }
    const data = await res.json();
    for (const m of data.models || []) {
      if ((m.supportedGenerationMethods || []).includes('generateContent')) {
        found.push(String(m.name || '').replace(/^models\//, ''));
      }
    }
    pageToken = data.nextPageToken || '';
    if (!pageToken) break;
  }
  return found;
}

async function probe(model) {
  const url = `${BASE}/models/${model}:generateContent`;
  const body = JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: 'Trả lời đúng một từ: OK' }] }],
    generationConfig: { maxOutputTokens: 8 },
  });
  const t0 = Date.now();
  try {
    const res = await withTimeout(PER_REQUEST_TIMEOUT_MS, (signal) =>
      fetch(url, { method: 'POST', headers, body, signal }),
    );
    const ms = Date.now() - t0;
    let detail = '';
    if (res.status === 200) {
      const data = await res.json().catch(() => ({}));
      const text = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('').trim();
      detail = text ? `"${text.slice(0, 40)}"` : '(200 nhưng không có text)';
    } else {
      const raw = await res.text().catch(() => '');
      try {
        detail = JSON.parse(raw)?.error?.message || raw;
      } catch {
        detail = raw;
      }
      detail = String(detail).replace(/\s+/g, ' ').slice(0, 160);
    }
    return { model, status: String(res.status), ms, detail };
  } catch (err) {
    const ms = Date.now() - t0;
    const aborted = err && err.name === 'AbortError';
    return { model, status: aborted ? `ABORT ${PER_REQUEST_TIMEOUT_MS / 1000}s` : 'NETWORK', ms, detail: aborted ? 'request treo quá thời gian chờ' : String(err.message || err) };
  }
}

(async () => {
  console.log(`\n== 1. Model key này thấy được (hỗ trợ generateContent) ==`);
  try {
    const available = await listModels();
    const available_set = new Set(available);
    console.log(available.length ? available.join('\n') : '(danh sách rỗng)');
    console.log(`\n   Trong thang fallback của game: ` + LADDER.map((m) => `${m}${available_set.has(m) ? ' ✓' : ' ✗(không có)'}`).join(', '));
  } catch (err) {
    console.log(`   Không liệt kê được: ${err.message}`);
  }

  console.log(`\n== 2. Gọi thử từng model (timeout ${PER_REQUEST_TIMEOUT_MS / 1000}s mỗi model, tuần tự) ==`);
  const rows = [];
  for (const model of modelsToProbe) {
    process.stdout.write(`   ${model.padEnd(32)} ... `);
    const r = await probe(model);
    rows.push(r);
    console.log(`${r.status.padEnd(9)} ${String(r.ms).padStart(6)} ms  ${r.detail}`);
  }

  const healthy = rows.filter((r) => r.status === '200').map((r) => r.model);
  console.log('\n== Kết luận ==');
  if (healthy.length) {
    console.log(`   Model đang khỏe: ${healthy.join(', ')}`);
    console.log(`   -> Trong game: Thiết Lập Nguồn AI -> "Model AI Ưu Tiên" -> chọn ${healthy[0]}`);
  } else {
    console.log('   Không model nào trả 200. Nếu toàn 503/ABORT: Google đang quá tải diện rộng, đợi rồi chạy lại.');
    console.log('   Nếu toàn 400/401/403: vấn đề ở key/project, không phải model.');
  }
})();
