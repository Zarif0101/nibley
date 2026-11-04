// Overlay simulator: runs the real src/overlay (overlay.html + overlay.js) in headless Chromium, with a fake Electron
// message bus, over a test screenshot, and takes pictures mid-answer. For looks only: no Claude, no voice, no hotkey.
//   node test/sim/sim.js            all scenarios -> test/out/sim-*.png
// Needs Playwright with Chromium (dev only; not part of npm test).
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { parseAll } = require('../../src/script');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'test', 'out');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.woff2': 'font/woff2', '.webp': 'image/webp', '.css': 'text/css' };

// 8 kHz mono silence of a given length, so the overlay's audio timing runs like real speech.
function wav(seconds) {
  const n = Math.round(8000 * seconds), b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(8000, 24); b.writeUInt32LE(16000, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  return [...b];
}

const SHIM = `
window.__dirname = '.';
const __h = {}; window.__sent = [];
window.__ipc = { emit(ch, ...a) { (__h[ch] || []).forEach((f) => f({}, ...a)); } };
const __ipcRenderer = { on(ch, f) { (__h[ch] = __h[ch] || []).push(f); }, send(ch, d) { window.__sent.push([ch, d]); if (window.__onSend) window.__onSend(ch, d); } };
const __mod = { exports: {} }, __x = new XMLHttpRequest();
__x.open('GET', 'mascot.js', false); __x.send(); new Function('module', __x.responseText)(__mod); // own scope, like Electron's require
window.require = (m) => m === 'electron' ? { ipcRenderer: __ipcRenderer } : m === 'node:path' ? { join: (...p) => p.join('/') }
  : /mascot\\.js$/.test(m) ? __mod.exports : {};`;
const HOOK = `
const __subs = window.subtitles.createSubtitles(document.body);
const __choices = window.createChoices(document.body, (text) => window.__sent.push(['choice', text]));
window.__choices = __choices;
// Pill in its own spot (Zarif, 2026-11-04): a full-width centred row at the bottom, above buttons and subtitle.
const __wrap = document.createElement('div'); __wrap.id = 'status-wrap'; document.body.appendChild(__wrap); __wrap.appendChild(document.getElementById('status'));
const __pst = document.createElement('style');
__pst.textContent = '#status-wrap { position: absolute; left: 0; right: 0; bottom: 184px; display: flex; justify-content: center; pointer-events: none; } #status-wrap.top { bottom: auto; top: 24px; } #status-wrap #status { position: static !important; }';
document.head.appendChild(__pst);
window.__say = {}; window.__marks = []; window.__ask = null;
window.__onSend = (ch, d) => {
  const top = window.subtitles.inBottomQuarter(window.__marks);
  if (ch === 'voice:start') {
    __subs.show(window.__say[d.i], { top });
    __wrap.classList.toggle('top', top);
    if (window.__ask && window.__ask.i === d.i) __choices.show(window.__ask.options, { top });
  }
  if (ch === 'turn:done') __subs.hideSoon();
};
// Proposed pill motion (QUALITY-PLAN T12) wrapped around the real status(): pop in, morph between states, fade out.
const __status = status;
window.__pill = function (kind, text, x, y) {
  const s = document.getElementById('status'), visible = s.style.display === 'flex';
  if (kind === 'none') { if (visible) window.pillMotion.leave(s, () => __status('none')); return; }
  if (visible) window.pillMotion.morph(s, () => __status(kind, text, x, y));
  else { __status(kind, text, x, y); window.pillMotion.enter(s); }
};`;

// Each scenario: a fixture, a Nibley script (real commands), the pen edge colour for that frame, when to take pictures (ms).
const SCENARIOS = [
  { name: 'lecture-white', fixture: 'lecture', edge: '#2B3A4B', shots: [2600, 5200], script: `say It's a system of two equations, written as one matrix equation.
ring 570 245 70 | matrix times x
say Think of a recipe: set amounts of two unknowns give a known total.
arrow 760 250 -> 700 120 | the totals
say Solving it means finding the x and y that make both lines true.
title Matrix form of linear equations` },
  { name: 'diagram-dark', fixture: 'diagram', edge: '#FFFFFF', shots: [2600, 5200], script: `say This is a neural network: numbers flow from left to right.
ring 120 160 60 | inputs
say Each circle is a neuron that takes in numbers and passes one on.
arrow 360 330 -> 520 330 | weights
say The lines are weights: how much each neuron listens to the one before.
title How a neural network passes numbers` },
  { name: 'ask-with-buttons', fixture: 'lecture', edge: '#2B3A4B', shots: [2200], script: `say That's the matrix form. Want a twin problem to try?
ring 570 245 70 | try this one
choices Yes, give me one | Not now | Explain again
title Matrix form check` },
  { name: 'player-bottom-mark', fixture: 'player', edge: '#FFFFFF', shots: [2400], script: `say Click the CC button at the bottom right of the video.
ring 768 566 34 | CC
say Captions then show at the bottom of the video.
title Turning on captions` },
];

function serve() {
  return new Promise((res) => {
    const s = http.createServer((req, rsp) => {
      const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (!p.startsWith(ROOT) || !fs.existsSync(p)) { rsp.writeHead(404); return rsp.end(); }
      let body = fs.readFileSync(p);
      if (p.endsWith(path.join('src', 'overlay', 'overlay.html'))) {
        body = Buffer.from(String(body).replace('<script src="overlay.js"></script>',
          `<script>${SHIM}</script><script src="subtitles.js"></script><script src="pill-sequence.js"></script><script src="pill-motion.js"></script><script src="choices.js"></script><script src="overlay.js"></script><script>${HOOK}</script>`));
      }
      rsp.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
      rsp.end(body);
    }).listen(0, '127.0.0.1', () => res(s));
  });
}

async function runScenario(page, port, sc) {
  await page.goto(`http://127.0.0.1:${port}/src/overlay/overlay.html`);
  await page.evaluate(() => document.fonts.ready);
  const cmds = parseAll(sc.script);
  const items = [];
  let i = 0;
  for (const c of cmds) {
    if (c.type === 'say') { items.push({ kind: 'say', i, text: c.text }); items.push({ kind: 'audio', i, buf: wav(Math.max(1.6, c.text.split(/\s+/).length * 0.33)), mime: 'audio/wav', src: 'edge' }); i++; }
    else if (c.type === 'title') continue;
    else if (c.type === 'choices') items.push({ kind: 'choices', i: i - 1, options: c.options });
    else if (c.type === 'step' || c.type === 'ring' || c.type === 'arrow' || c.type === 'point' || c.type === 'label' || c.type === 'highlight') items.push({ kind: 'mark', mark: { ...c, edge: sc.edge } });
  }
  items.push({ kind: 'end' });
  await page.evaluate(({ items, bg }) => {
    window.__marks = items.filter((x) => x.kind === 'mark').map((x) => x.mark);
    window.__ask = items.find((x) => x.kind === 'choices') || null;
    if (window.__ask) window.__pill('thinking', 'Thinking', 700, 330);
    for (const x of items) if (x.kind === 'say') window.__say[x.i] = x.text;
    window.__ipc.emit('turn', 1, { bg });
    for (const x of items) if (x.kind !== 'choices') window.__ipc.emit('item', 1, x.kind === 'audio' ? { ...x, buf: new Uint8Array(x.buf) } : x);
  }, { items, bg: `/test/fixtures/${sc.fixture}.png` });
  const t0 = Date.now(), files = [];
  for (const [n, at] of sc.shots.entries()) {
    await page.waitForTimeout(Math.max(0, at - (Date.now() - t0)));
    const f = path.join(OUT, `sim-${sc.name}-${n + 1}.png`);
    await page.screenshot({ path: f });
    files.push(path.relative(ROOT, f));
  }
  const sent = await page.evaluate(() => window.__sent.map(([c]) => c));
  return { files, voiceStarts: sent.filter((c) => c === 'voice:start').length };
}

// --pill <dir>: frames of the proposed pill motion (pop in as Listening, morph to Thinking, then Speaking) for a preview.
async function pillFrames(page, port, dir) {
  await page.goto(`http://127.0.0.1:${port}/src/overlay/overlay.html`);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => { document.getElementById('bg').src = '/test/fixtures/lecture.png'; document.getElementById('bg').style.display = 'block'; });
  fs.mkdirSync(dir, { recursive: true });
  const clip = { x: 553, y: 520, width: 260, height: 80 };
  let n = 0;
  const phase = async (kind, text, ms, steps) => {
    await page.evaluate(([k, t]) => { window.__pill(k, t, 560, 360); document.getAnimations().forEach((a) => a.pause()); }, [kind, text]);
    for (let i = 0; i <= steps; i++) {
      await page.evaluate((t) => document.getAnimations().forEach((a) => { a.currentTime = t; }), (ms * i) / steps);
      await page.screenshot({ path: path.join(dir, `f${String(n++).padStart(3, '0')}.png`), clip });
    }
    await page.evaluate(() => document.getAnimations().forEach((a) => (Number.isFinite(a.effect.getComputedTiming().endTime) ? a.finish() : a.play())));
    for (let i = 0; i < 8; i++) await page.screenshot({ path: path.join(dir, `f${String(n++).padStart(3, '0')}.png`), clip }); // hold
  };
  await phase('listening', 'Listening', 170, 6);
  await phase('thinking', 'Thinking', 220, 6);
  await phase('speaking', 'Speaking', 220, 6);
  return n;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  if (process.argv[2] === '--pill') {
    const server = await serve();
    const browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    const n = await pillFrames(page, server.address().port, path.resolve(process.argv[3] || path.join(OUT, 'pill-frames')));
    console.log(`pill frames: ${n}`);
    await browser.close(); server.close();
    return;
  }
  const server = await serve();
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
  const errors = [];
  page.on('pageerror', (e) => { errors.push(e.message); console.log('page error:', e.message); });
  const only = process.argv[2];
  for (const sc of SCENARIOS.filter((s) => !only || s.name === only)) {
    const r = await runScenario(page, server.address().port, sc);
    console.log(`${sc.name}: ${r.voiceStarts} lines started, pictures ${r.files.join(', ')}`);
  }
  await browser.close();
  server.close();
  if (errors.length) { console.log('page errors:', errors); process.exitCode = 1; }
})();
