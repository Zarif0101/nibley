// Gemini brain (brainstorm 2026-11-08-setup-for-any-agent): for learners with a Google account instead of Claude.
// Same interface as brain.js. One `gemini --acp` process (Agent Client Protocol, JSON-RPC over stdio) stays running,
// because the CLI alone takes ~5 s to start. Measured 2026-11-09: 8-11 s to the first words of an answer (Zarif chose
// this "slow way" over an API key). ACP can't replace Gemini CLI's own instructions, so Nibley's prompt goes in as the
// first message of each session. Side calls (recaps, analysis, learner) use once(): a fresh `gemini -p` per call.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const readline = require('node:readline');
const { log } = require('./log');

const MAX_TURNS = 12, TURN_TIMEOUT = 90e3, MODEL = 'gemini-3-flash-preview';
const model = () => (/^gemini/.test(cfg?.model || '') ? cfg.model : MODEL); // settings.model is a Claude name (haiku/sonnet)
let cfg = null, proc = null, session = null, turns = 0, carry = null, lastTurn = null, crashes = [];

// The CLI is an npm .cmd shim on Windows, so it runs through cmd.exe; every argument is fixed text, never user input.
const gemini = (args, opts) => spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', 'gemini', ...args], { windowsHide: true, ...opts });
const workDir = () => { const d = path.join(os.tmpdir(), 'nibley-gemini'); fs.mkdirSync(d, { recursive: true }); return d; }; // empty folder: nothing of his to read

function classify(s) {
  if (/quota|rate.?limit|resource.?exhausted|429/i.test(s)) return 'limit';
  if (/auth|log ?in|credential|401|403/i.test(s)) return 'auth';
  return null;
}

function startProc() {
  const child = gemini(['--acp', '-m', model()], { cwd: workDir() });
  const p = { child, id: 0, wait: new Map(), turn: null, stderr: '', dead: false };
  child.stdin.on('error', () => {});
  child.stderr.on('data', (d) => { p.stderr = (p.stderr + d).slice(-2000); });
  readline.createInterface({ input: child.stdout }).on('line', (line) => {
    let m;
    try { m = JSON.parse(line); } catch { return; }
    if (m.id != null && p.wait.has(m.id) && !m.method) { const w = p.wait.get(m.id); p.wait.delete(m.id); w(m); return; }
    if (m.method === 'session/update') {
      const u = m.params?.update;
      if (u?.sessionUpdate === 'agent_message_chunk' && u.content?.type === 'text' && p.turn) {
        p.turn.text += u.content.text;
        if (!p.turn.cancelled) p.turn.onText(u.content.text);
      }
    } else if (m.method === 'session/request_permission') {
      write(p, { jsonrpc: '2.0', id: m.id, result: { outcome: { outcome: 'cancelled' } } }); // Nibley answers; it never runs tools
    }
  });
  child.on('exit', (code) => {
    p.dead = true;
    for (const w of p.wait.values()) w({ error: { message: `gemini exited (${code}) ${p.stderr.slice(-200)}` } });
    p.wait.clear();
    if (p.killed) return;
    log({ ev: 'gemini_crash', code, stderr: p.stderr.slice(-300) });
    crashes = crashes.filter((t) => Date.now() - t < 5 * 60e3).concat(Date.now());
    if (crashes.length >= 3) return cfg.onFatal('Gemini keeps crashing.');
    if (p === proc) { proc = startProc(); session = null; }
  });
  p.ready = call(p, 'initialize', { protocolVersion: 1, clientCapabilities: { fs: { readTextFile: false, writeTextFile: false } } })
    .then((r) => { if (r.error) throw new Error(r.error.message); log({ ev: 'gemini_init', model: model() }); });
  return p;
}

const write = (p, o) => { if (!p.dead) p.child.stdin.write(`${JSON.stringify(o)}\n`); };
function call(p, method, params) {
  return new Promise((resolve) => { const id = ++p.id; p.wait.set(id, resolve); write(p, { jsonrpc: '2.0', id, method, params }); });
}

// A new session starts with Nibley's whole prompt; the warm-up's own answer is thrown away.
async function newSession() {
  const p = proc;
  await p.ready;
  const r = await call(p, 'session/new', { cwd: workDir(), mcpServers: [] });
  if (r.error) throw new Error(r.error.message);
  const id = r.result.sessionId;
  turns = 0;
  await call(p, 'session/prompt', { sessionId: id, prompt: [{ type: 'text', text: `${cfg.buildPrompt()}\n\n(Set-up message, not from the student. Follow everything above for every message after this one. Reply with only: say ok)` }] });
  return id;
}

function ensureSession() {
  if (!session) {
    const s = { id: newSession() };
    s.id.catch(() => { if (session === s) session = null; }); // a failed start is tried again on the next question
    session = s;
  }
  return session.id;
}

module.exports = {
  // opts: {model?, buildPrompt, onFatal}
  start(opts) {
    cfg = { onFatal: () => {}, ...opts };
    proc = startProc();
    session = null;
    ensureSession().catch((e) => log({ ev: 'gemini_error', kind: 'start', err: String(e.message).slice(0, 200) }));
  },

  // Same as brain.ask: onText(delta), onEnd(fullText), onError(kind, detail). Returns {cancel}.
  ask({ png, text, video, turn, onText = () => {}, onEnd = () => {}, onError = () => {} }) {
    if (turns >= MAX_TURNS && !proc.turn) { carry = topic(); session = null; } // keep the conversation short, like brain.js
    const q = video ? `${video}\n\n${text}` : text;
    const t = { text: '', cancelled: false, done: false, onText, sid: null };
    const finish = (ok, kind, detail) => {
      if (t.done) return;
      t.done = true;
      clearTimeout(t.timer);
      if (proc.turn === t) proc.turn = null;
      if (t.cancelled) return;
      if (ok) onEnd(t.text); else onError(kind, detail);
    };
    t.timer = setTimeout(() => { finish(false, 'timeout', 'no answer in 90 s'); if (t.sid) write(proc, { jsonrpc: '2.0', method: 'session/cancel', params: { sessionId: t.sid } }); }, TURN_TIMEOUT);
    const t0 = Date.now();
    (async () => {
      t.sid = await ensureSession();
      if (t.done) return;
      const prompt = [];
      if (png) prompt.push({ type: 'image', mimeType: 'image/png', data: png.toString('base64') });
      prompt.push({ type: 'text', text: carry ? `(Before this, we talked about: ${carry})\n\n${q}` : q });
      carry = null;
      proc.turn = t;
      turns++;
      lastTurn = { q: text, t };
      const r = await call(proc, 'session/prompt', { sessionId: t.sid, prompt });
      log({ ev: 'gemini_turn', turn, ms: Date.now() - t0, stop: r.result?.stopReason, image: !!png });
      if (r.error) finish(false, classify(r.error.message) || 'error', r.error.message);
      else finish(true);
    })().catch((e) => finish(false, classify(e.message) || 'error', e.message));
    return { cancel() { if (!t.done) { t.cancelled = true; if (t.sid) write(proc, { jsonrpc: '2.0', method: 'session/cancel', params: { sessionId: t.sid } }); finish(false); } } };
  },

  interrupt() { const t = proc?.turn; if (t?.sid) { t.cancelled = true; write(proc, { jsonrpc: '2.0', method: 'session/cancel', params: { sessionId: t.sid } }); } },

  setModel() {}, // the Haiku/Sonnet switch is for Claude; Gemini uses one fast model

  stop() { if (proc) { proc.killed = true; proc.child.kill(); } },

  // One-off call for background work (recaps, video analysis, learner): system text + input, plain text back.
  once({ system, input, timeoutMs = 120e3 }) {
    return new Promise((resolve, reject) => {
      const c = gemini(['-p', 'Follow the instructions and data given on standard input.', '-m', model(), '--output-format', 'json'], { cwd: workDir() });
      let out = '', err = '';
      const timer = setTimeout(() => { c.kill(); reject(new Error('gemini timeout')); }, timeoutMs);
      c.stdout.on('data', (d) => (out += d));
      c.stderr.on('data', (d) => (err = (err + d).slice(-1000)));
      c.on('error', reject);
      c.on('exit', () => {
        clearTimeout(timer);
        try { resolve(JSON.parse(out.slice(out.indexOf('{'))).response || ''); } catch { reject(new Error(`gemini output not JSON: ${(out || err).slice(0, 200)}`)); }
      });
      c.stdin.end(`${system}\n\n---\n\n${input}`);
    });
  },
};

function topic() {
  if (!lastTurn) return null;
  const says = lastTurn.t.text.split('\n').filter((l) => /^say /.test(l)).slice(0, 2).map((l) => l.slice(4));
  return `They asked "${lastTurn.q}". You said: ${says.join(' ')}`;
}
