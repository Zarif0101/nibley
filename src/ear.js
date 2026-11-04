// Lecture ear (docs/ARCHITECTURE-v2.md section 3): turns pieces of the sound the laptop plays into text, so Nibley
// knows what the lecturer just said in any browser, site or player. The overlay records the pieces (system audio
// loopback). Pieces without sound, during Nibley's own voice or during a call are never sent. Only text is kept.
const fs = require('node:fs');
const path = require('node:path');
const { FILLER } = require('./stt');

const KEEP_MS = 30 * 60e3, MIN_LOUD_MS = 1500;
const LECTURE = 'A lecture: physics, maths, chemistry, biology.';
let cfg, lines, pending, lastText, lastSkip, pausedUntil;

// opts: { transcribe(buf, {durationMs, prompt}) -> text, micUsers() -> [names], foreground() -> {title},
//         ownMic(name) -> bool, enabled() -> bool, vaultPath, log }
function start(opts) {
  cfg = { log: () => {}, enabled: () => true, ownMic: () => false, ...opts };
  lines = [];
  pending = new Set();
  lastText = '';
  lastSkip = null;
  pausedUntil = 0;
}

function skip(why, detail) {
  if (why !== lastSkip) cfg.log({ ev: 'ear_skip', why, detail }); // log each change, not every piece
  lastSkip = why;
  return why;
}

const clock = (d) => d.toTimeString().slice(0, 5);
function save(line) {
  const d = new Date(line.t0), file = path.join(cfg.vaultPath, 'nibley', 'sessions', `${d.toLocaleDateString('sv')}.md`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (!fs.existsSync(file)) fs.writeFileSync(file, `# Heard on ${d.toLocaleDateString('sv')}\n\nWhat Nibley heard from lectures (text only, no audio).\n\n`);
  fs.appendFileSync(file, `- ${clock(d)} · ${line.title || 'unknown window'} · ${line.text}\n`); // one line per 30 s piece: sync keeps order
}

// piece: { buf, t0, t1, loudMs }. Returns 'sent' or why it was skipped.
async function onPiece(p) {
  if (!cfg.enabled()) return skip('off');
  if (p.loudMs < MIN_LOUD_MS) return skip('quiet');
  if (Date.now() < pausedUntil) return skip('groq_limit');
  const others = (await cfg.micUsers().catch(() => [])).filter((n) => !cfg.ownMic(n));
  if (others.length) return skip('call', others[0]); // someone may be talking to Zarif: their voice stays private
  const { title = '' } = await cfg.foreground().catch(() => ({}));
  const job = cfg.transcribe(p.buf, { durationMs: p.t1 - p.t0, prompt: `${LECTURE} ${lastText.slice(-200)}`.trim() })
    .then((text) => {
      text = String(text || '').trim();
      if (!text || FILLER.test(text)) return;
      const line = { t0: p.t0, t1: p.t1, title, text };
      lines = lines.filter((l) => l.t1 > Date.now() - KEEP_MS).concat(line);
      lastText = text;
      save(line);
    })
    .catch((e) => {
      if (e.kind === 'rate') pausedUntil = Date.now() + 60e3; // free limit: stop for a minute, then try again
      cfg.log({ ev: 'ear_error', kind: e.kind, err: String(e.message).slice(0, 120) });
    });
  pending.add(job);
  job.finally(() => pending.delete(job));
  lastSkip = null;
  cfg.log({ ev: 'ear_sent', ms: p.t1 - p.t0, loud_ms: p.loudMs });
  return 'sent';
}

// Waits (at most ms) for pieces still being transcribed, e.g. the one cut when the hotkey was pressed.
const settled = (ms) => (pending.size ? Promise.race([Promise.allSettled([...pending]), new Promise((r) => setTimeout(r, ms))]) : Promise.resolve());

const ago = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

// Block put before a question: the window on screen and what was heard in the last 2 minutes.
function context({ windowMs = 120e3, now = Date.now() } = {}) {
  const near = (lines || []).filter((l) => l.t1 >= now - windowMs);
  if (!near.length) return null;
  return `[On screen: "${near.at(-1).title || 'unknown window'}"]\n[Heard in the last 2 min]\n${near.map((l) => `${ago(now - l.t0)} ago  ${l.text}`).join('\n')}`;
}

module.exports = { start, onPiece, settled, context, MIN_LOUD_MS };
