// Bridge to the Chrome extension (docs/ARCHITECTURE-v2.md section 3): which YouTube video is on screen, where it is,
// and its transcript. Listens on 127.0.0.1 only and accepts only the extension (secret token + extension origin).
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const ID = /^[\w-]{11}$/; // YouTube video ids; also keeps file names safe
const MAX_BODY = 2e6, MAX_LINES = 20000;
let tabs = new Map(), transcripts = new Map(), cfg = null, server = null;

const sameToken = (a, b) => typeof a === 'string' && a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
const videoFile = (id) => path.join(cfg.vaultPath, 'nibley', 'videos', `${id}.json`);
const num = (v) => (Number.isFinite(v) ? v : 0);

function onMessage(m) {
  if (!Number.isInteger(m.tabId)) return;
  if (m.kind === 'gone') { tabs.delete(m.tabId); return; }
  if (m.kind === 'state' && m.state && ID.test(m.state.videoId)) {
    const s = m.state;
    tabs.set(m.tabId, { videoId: s.videoId, title: String(s.title || '').slice(0, 200), t: num(s.t), paused: !!s.paused, duration: num(s.duration), rate: num(s.rate) || 1, visible: !!s.visible, at: Date.now() });
  } else if (m.kind === 'transcript' && ID.test(m.videoId) && Array.isArray(m.lines)) {
    const lines = m.lines.slice(0, MAX_LINES).filter((l) => Array.isArray(l) && Number.isFinite(l[0]) && typeof l[1] === 'string').map(([t, s]) => [t, s.slice(0, 500)]);
    transcripts.set(m.videoId, lines);
    const file = videoFile(m.videoId);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFile(file, JSON.stringify({ videoId: m.videoId, title: String(m.title || '').slice(0, 200), duration: num(m.duration), lang: String(m.lang || ''), auto: !!m.auto, saved: new Date().toISOString(), lines }), () => {});
    cfg.log({ ev: 'transcript', videoId: m.videoId, lines: lines.length, auto: !!m.auto });
  } else if (m.kind === 'no_transcript' && ID.test(m.videoId)) {
    cfg.log({ ev: 'no_transcript', videoId: m.videoId, reason: String(m.reason || '').slice(0, 100) });
  }
}

// opts: {port, token, vaultPath, log}. Resolves with the port it listens on (port 0 = any free port, for tests).
function start(opts) {
  cfg = { log: () => {}, ...opts };
  tabs = new Map();
  transcripts = new Map();
  server = http.createServer((req, res) => {
    const ok = req.method === 'POST' && req.url === '/state' && sameToken(req.headers['x-nibley-token'], cfg.token)
      && String(req.headers.origin || '').startsWith('chrome-extension://');
    if (!ok) { res.writeHead(403).end(); req.resume(); return; }
    const chunks = [];
    let size = 0;
    req.on('data', (c) => { size += c.length; if (size > MAX_BODY) { res.writeHead(413).end(); req.destroy(); } else chunks.push(c); });
    req.on('end', () => {
      if (res.writableEnded) return;
      try { onMessage(JSON.parse(Buffer.concat(chunks))); } catch { res.writeHead(400).end(); return; }
      res.writeHead(200, { 'content-type': 'application/json' }).end('{}');
    });
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(cfg.port, '127.0.0.1', () => resolve(server.address().port));
  });
}

// The video on screen: the most recent tab whose last report says visible. Time moves on while it plays.
function current() {
  let best = null;
  for (const s of tabs.values()) if (s.visible && (!best || s.at > best.at)) best = s;
  if (!best) return null;
  const t = best.paused ? best.t : Math.min(best.duration || Infinity, best.t + ((Date.now() - best.at) / 1000) * best.rate);
  return { ...best, t };
}

function transcriptOf(id) {
  if (!transcripts.has(id)) {
    try { transcripts.set(id, JSON.parse(fs.readFileSync(videoFile(id), 'utf8')).lines); } catch { return null; }
  }
  return transcripts.get(id);
}

const clock = (s) => { s = Math.max(0, Math.floor(s)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = String(s % 60).padStart(2, '0'); return h ? `${h}:${String(m).padStart(2, '0')}:${x}` : `${m}:${x}`; };

// Text block put in front of a question: title, time, and the transcript from 2 min before to 30 s after now.
function context({ before = 120, after = 30 } = {}) {
  const s = current();
  if (!s) return null;
  const head = `[Video: "${s.title}" at ${clock(s.t)} of ${clock(s.duration)}, ${s.paused ? 'paused' : 'playing'}]`;
  const lines = transcriptOf(s.videoId);
  if (!lines) return `${head}\n[No transcript for this video]`;
  const near = lines.filter(([t]) => t >= s.t - before && t <= s.t + after);
  return `${head}\n[Transcript ${clock(s.t - before)}-${clock(s.t + after)}]\n${near.map(([t, x]) => `${clock(t)} ${x}`).join('\n')}`;
}

module.exports = { start, stop: () => server?.close(), current, context, clock };
