// Warm `claude -p` processes (BUILD-PLAN 4.5): one in use, one spare. ask() streams text deltas.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const readline = require('node:readline');
const { log } = require('./log');

const MAX_TURNS = 8, MAX_IDLE = 10 * 60e3, TURN_TIMEOUT = 45e3;
// This app's own Claude session vars must not leak in: they turn on a slow post-turn summary call.
const cleanEnv = () => Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^(CLAUDE|ANTHROPIC|MCP_)/.test(k)));

let cfg, cur, spare, carry = null, lastTurn = null, crashes = [], seq = 0;

function startProc() {
  const file = path.join(os.tmpdir(), `nibley-prompt-${process.pid}-${++seq}.md`);
  fs.writeFileSync(file, cfg.buildPrompt());
  const args = ['-p', '--model', cfg.model, '--setting-sources', '', '--strict-mcp-config', '--tools', '', '--disable-slash-commands',
    '--no-session-persistence', '--system-prompt-file', file, '--input-format', 'stream-json', '--output-format', 'stream-json',
    '--verbose', '--include-partial-messages', ...(cfg.effort ? ['--effort', cfg.effort] : [])];
  const child = spawn(cfg.claudePath, args, { shell: false, windowsHide: true, env: cleanEnv() });
  const p = { child, file, turns: 0, lastUsed: Date.now(), queue: [], stderr: '', loggedInit: false };
  child.stdin.on('error', () => {});
  child.stderr.on('data', (d) => { p.stderr = (p.stderr + d).slice(-2000); });
  readline.createInterface({ input: child.stdout }).on('line', (line) => {
    let m;
    try { m = JSON.parse(line); } catch { return; }
    onEvent(p, m);
  });
  // The first request of a process is slow (~3-5 s, measured), so spend it on a silent warm-up.
  p.queue.push({ text: '', done: false, cancelled: true, meta: { warmup: true }, onText() {}, finish() { this.done = true; }, fail() { this.done = true; } });
  child.stdin.write(JSON.stringify({ type: 'user', message: { role: 'user', content: [{ type: 'text', text: '(Warm-up, not from the student. Reply with only: say ok)' }] } }) + '\n');
  child.on('exit', (code) => {
    p.dead = true;
    fs.rm(file, () => {});
    for (const t of p.queue) t.fail(classify(p.stderr) || 'crash', p.stderr.trim().slice(-300));
    p.queue = [];
    if (!p.killed) onCrash(p, code);
  });
  return p;
}

// Events belong to the oldest unfinished turn; each user message gets exactly one `result`.
function onEvent(p, m) {
  const t = p.queue[0];
  if (m.type === 'system' && m.subtype === 'init' && !p.loggedInit) {
    p.loggedInit = true;
    log({ ev: 'claude_init', model: m.model, plugins: (m.plugins || []).map((x) => x.name), mcp: m.mcp_servers, tools: m.tools });
  }
  if (!t) return;
  const e = m.event;
  if (m.type === 'stream_event' && e?.type === 'content_block_delta' && e.delta?.type === 'text_delta') {
    t.text += e.delta.text;
    if (!t.cancelled) t.onText(e.delta.text);
  } else if (m.type === 'stream_event' && e?.type === 'message_stop') {
    t.finish();
  } else if (m.type === 'result') {
    p.queue.shift();
    clearTimeout(t.timer);
    logUsage(t, m);
    if (m.is_error && !t.cancelled && !t.done) t.fail(classify(String(m.result || '') + ' ' + (m.errors || []).join(' ')) || 'error', String(m.result || m.subtype));
    else if (m.is_error && !t.cancelled) log({ ev: 'claude_result_error', result: String(m.result || m.subtype).slice(0, 300) });
    t.finish();
  }
}

// SPEED-TOKEN-PLAN P0: tokens and time per answer. Field names checked on a real result line (2026-11-05).
function logUsage(t, m) {
  const u = m.usage || {};
  log({ ev: t.meta?.warmup ? 'claude_warmup_usage' : 'claude_usage', ...t.meta, cancelled: t.cancelled || undefined,
    input: u.input_tokens, cache_write: u.cache_creation_input_tokens, cache_read: u.cache_read_input_tokens, output: u.output_tokens,
    thinking: u.output_tokens_details?.thinking_tokens, cost: m.total_cost_usd, api_ms: m.duration_api_ms, ttft_ms: m.ttft_ms });
}

function classify(s) {
  if (/usage limit|limit reached|hit your limit|rate.?limit/i.test(s)) return 'limit';
  if (/log ?in|not authenticated|unauthori[sz]ed|invalid api key|401|oauth/i.test(s)) return 'auth';
  return null;
}

function onCrash(p, code) {
  log({ ev: 'claude_crash', code, stderr: p.stderr.slice(-300) });
  crashes = crashes.filter((t) => Date.now() - t < 5 * 60e3).concat(Date.now());
  if (crashes.length >= 3) return cfg.onFatal('Claude keeps crashing.');
  if (p === cur) { cur = spare && !spare.dead ? spare : startProc(); spare = startProc(); }
  else if (p === spare) spare = startProc();
}

function rotate() {
  const old = cur;
  cur = spare && !spare.dead ? spare : startProc();
  spare = startProc();
  old.killed = true;
  old.child.kill();
  log({ ev: 'claude_rotate', turns: old.turns });
}

module.exports = {
  cleanEnv,

  // opts: {model, claudePath, buildPrompt, onFatal, effort?} effort: claude --effort (low..max), none = Claude's default
  start(opts) {
    cfg = { onFatal: () => {}, ...opts };
    cur = startProc();
    spare = startProc();
  },

  // Sends one question. Callbacks: onText(delta), onEnd(fullText), onError(kind, detail). Returns {cancel}.
  // video: optional text block (YouTube title, time, transcript part) put before the question; not carried over.
  ask({ png, text, video, turn, onText = () => {}, onEnd = () => {}, onError = () => {} }) {
    if (!cur.queue.length && (cur.turns >= MAX_TURNS || Date.now() - cur.lastUsed > MAX_IDLE)) { carry = topic(); rotate(); }
    const p = cur;
    const content = [];
    if (png) content.push({ type: 'image', source: { type: 'base64', media_type: 'image/png', data: png.toString('base64') } });
    const q = video ? `${video}\n\n${text}` : text;
    content.push({ type: 'text', text: carry ? `(Before this, we talked about: ${carry})\n\n${q}` : q });
    carry = null;
    const t = {
      text: '', done: false, cancelled: false, onText, meta: { turn, image: !!png, n: p.turns + 1 },
      finish() { if (t.done) return; t.done = true; clearTimeout(t.timer); if (!t.cancelled) onEnd(t.text); },
      fail(kind, detail) { if (t.done) return; t.done = true; clearTimeout(t.timer); if (!t.cancelled) onError(kind, detail); },
    };
    t.timer = setTimeout(() => { t.fail('timeout', 'no answer in 45 s'); interrupt(p); }, TURN_TIMEOUT);
    p.queue.push(t);
    p.turns++;
    p.lastUsed = Date.now();
    p.child.stdin.write(JSON.stringify({ type: 'user', message: { role: 'user', content } }) + '\n');
    lastTurn = { q: text, t };
    return { cancel() { if (!t.done) { t.cancelled = true; interrupt(p); } } };
  },

  // Barge-in: stop whatever the current process is writing.
  interrupt() { interrupt(cur); },

  setModel(model) {
    cfg.model = model;
    for (const p of [cur, spare]) { p.killed = true; p.child.kill(); }
    cur = startProc();
    spare = startProc();
  },

  stop() { for (const p of [cur, spare]) if (p) { p.killed = true; p.child.kill(); } },
};

function interrupt(p) {
  const live = p.queue.filter((t) => !t.done);
  if (!live.length) return;
  for (const t of live) t.cancelled = true;
  p.child.stdin.write(JSON.stringify({ type: 'control_request', request_id: `int-${Date.now()}`, request: { subtype: 'interrupt' } }) + '\n');
  log({ ev: 'claude_interrupt' });
}

// Carry-over for rotation: the last question and the first answer lines (text only, no images).
function topic() {
  if (!lastTurn) return null;
  const says = lastTurn.t.text.split('\n').filter((l) => /^say /.test(l)).slice(0, 2).map((l) => l.slice(4));
  return `He asked "${lastTurn.q}". You said: ${says.join(' ')}`;
}
