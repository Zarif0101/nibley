// Overlay: draws marks (docs/DESIGN.md), plays the voice timed to them, records the mic.
const { ipcRenderer } = require('electron');

const NS = 'http://www.w3.org/2000/svg';
const W = 1366, H = 768;
const EASE = 'cubic-bezier(.3,.7,.2,1)';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (id) => document.getElementById(id);
const svg = $('svg'), layer = $('layer'), swipes = $('swipes'); // swipes sit under pen strokes
// Everything is drawn at 1366x768 (the screenshot size Claude sees) and scaled to the real screen (1600x900 since 2026-11).
const K = Math.min(innerWidth / W, innerHeight / H) || 1;
Object.assign(document.documentElement.style, { transformOrigin: '0 0', transform: `scale(${K})` });

// ---------- helpers ----------
function rng(seed) { // mulberry32: same mark, same wobble, so replays look identical
  let a = seed >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const seedOf = (m) => [...JSON.stringify(m)].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261);
const el = (tag, attrs = {}, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.append(e);
  return e;
};
const div = (cls, style = {}, parent = layer) => { const d = document.createElement('div'); d.className = cls; Object.assign(d.style, style); parent.append(d); return d; };
const pts = (list) => list.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
const grid4 = (v) => Math.round(v / 4) * 4;

// A pen stroke with its edge outline underneath; draws on over `ms`, starting after `delay`.
function stroke(d, edge, ms, delay = 0) {
  const g = el('g', {}, svg);
  const e = el('path', { d, class: 'edge', stroke: edge || '#2B3A4B' }, g);
  const p = el('path', { d, class: 'pen' }, g);
  const len = p.getTotalLength();
  for (const s of [e, p]) {
    s.style.strokeDasharray = `${len} ${len}`;
    s.style.strokeDashoffset = reduced ? 0 : len;
    if (!reduced) s.animate([{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: ms, delay, easing: EASE, fill: 'forwards' });
  }
  g.erase = () => {
    for (const s of [e, p]) s.animate([{ strokeDashoffset: 0 }, { strokeDashoffset: len }], { duration: reduced ? 0 : 200, easing: 'ease-in', fill: 'forwards' });
    setTimeout(() => g.remove(), 220);
  };
  return g;
}

// Label chip: slides 6 px in from the left and fades in.
function note(text, x, y, delay = 0) {
  const d = div('chip', { left: `${x}px`, top: `${y}px` });
  d.textContent = text;
  if (!reduced) d.animate([{ transform: 'translateX(-6px)', opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }], { duration: 180, delay, easing: EASE, fill: 'backwards' });
  d.erase = () => { d.animate([{ opacity: 1 }, { opacity: 0 }], { duration: reduced ? 0 : 200, fill: 'forwards' }); setTimeout(() => d.remove(), 220); };
  return d;
}

// Place a note outside the mark's box, toward the calmest screen area, never over a mark or another note.
const placed = []; // boxes of every mark and note drawn this turn
let busy = null;   // {cell, cols, data}: how busy each screenshot cell is (0 = flat)
function busyAt(x, y, w, h) {
  if (!busy) return 0;
  let s = 0, n = 0;
  for (let cy = Math.floor(y / busy.cell); cy <= Math.floor((y + h) / busy.cell); cy++) {
    for (let cx = Math.floor(x / busy.cell); cx <= Math.floor((x + w) / busy.cell); cx++) { s += busy.data[cy * busy.cols + cx] || 0; n++; }
  }
  return n ? s / n : 0;
}
function placeNote(text, box, delay, across = false) {
  const d = note(text, 0, 0, delay);
  const w = d.offsetWidth, h = d.offsetHeight, gap = 12;
  const [bx, by, bw, bh] = box;
  const side = [[bx + bw + gap, by + bh / 2 - h / 2], [bx - gap - w, by + bh / 2 - h / 2]];
  const vert = [[bx + bw / 2 - w / 2, by - gap - h], [bx + bw / 2 - w / 2, by + bh + gap]];
  // across: the box is a line (arrow), so put the note beside the line, not along it
  const cands = [...(across ? vert : side), ...(across ? side : vert), [bx + bw + gap, by + bh + gap], [bx - gap - w, by - gap - h]];
  const fits = ([x, y]) => x >= 4 && y >= 4 && x + w <= W - 4 && y + h <= H - 4;
  const hits = ([x, y]) => (subRect ? [...placed, subRect] : placed).filter((r) => x < r[0] + r[2] && x + w > r[0] && y < r[1] + r[3] && y + h > r[1]).length;
  const score = (c, i) => hits(c) * 1000 + busyAt(c[0], c[1], w, h) + i * 3; // order breaks near-ties
  const best = cands.map((c, i) => [c, score(c, i)]).filter(([c]) => fits(c)).sort((a, b) => a[1] - b[1])[0];
  const [x, y] = best ? best[0] : [Math.min(Math.max(4, bx), W - w - 4), Math.min(Math.max(4, by + bh + gap), H - h - 4)];
  Object.assign(d.style, { left: `${Math.round(x)}px`, top: `${Math.round(y)}px` });
  placed.push([x, y, w, h]);
  return d;
}

// ---------- mark shapes ----------
function ringPath(x, y, r, rand) {
  // Starts at ~10 o'clock, goes round once, overshoots ~25° so the ends cross; radius wobbles ±4%.
  const p1 = rand() * 6.28, p2 = rand() * 6.28, sweep = (385 + rand() * 10) * Math.PI / 180, start = 210 * Math.PI / 180;
  const out = [];
  for (let i = 0; i <= 80; i++) {
    const t = i / 80, a = start + sweep * t;
    const k = 1 + 0.04 * (0.6 * Math.sin(2 * a + p1) + 0.4 * Math.sin(3 * a + p2)) - 0.06 * t;
    out.push([x + Math.cos(a) * r * 1.06 * k, y + Math.sin(a) * r * 0.96 * k]);
  }
  return pts(out);
}

function arrowPaths(x1, y1, x2, y2, rand) {
  const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len, bend = len * (0.06 + rand() * 0.04) * (rand() < 0.5 ? -1 : 1);
  const cx = (x1 + x2) / 2 + nx * bend * 2, cy = (y1 + y2) / 2 + ny * bend * 2;
  const ex = x2 - (x2 - cx) / Math.hypot(x2 - cx, y2 - cy) * 6, ey = y2 - (y2 - cy) / Math.hypot(x2 - cx, y2 - cy) * 6; // stop short of the target
  const ang = Math.atan2(ey - cy, ex - cx), head = 14, spread = 0.5;
  const h1 = [ex - head * Math.cos(ang - spread), ey - head * Math.sin(ang - spread)];
  const h2 = [ex - head * Math.cos(ang + spread), ey - head * Math.sin(ang + spread)];
  return { shaft: `M${x1} ${y1} Q${cx.toFixed(1)} ${cy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}`, head: pts([h1, [ex, ey], h2]), mid: [(x1 + 2 * cx + x2) / 4, (y1 + 2 * cy + y2) / 4] };
}

function tickPath(x, y, rand) {
  const ox = x - 70, oy = y + 2 + rand() * 4; // beside the target, left of its ring
  return pts([[ox, oy - 8], [ox + 8, oy + 2], [ox + 26, oy - 18]]);
}

function swipe(x, y, w, h, rand, delay) {
  const d = div('swipe', { left: `${x}px`, top: `${y}px`, width: `${w}px`, height: `${h}px`, transform: 'rotate(-2deg)' }, swipes);
  const s = el('svg', { width: w, height: h, viewBox: `0 0 ${w} ${h}` });
  s.style.position = 'static';
  const j = () => 2 + rand(); // ragged short ends, 2-3 px
  const poly = [[j(), 0], [w - j(), 0], [w - j() + 1, h * 0.33], [w - j(), h * 0.66], [w - j(), h], [j(), h], [j() - 1, h * 0.6], [j(), h * 0.3]];
  el('polygon', { points: poly.map((p) => p.join(',')).join(' ') }, s);
  d.append(s);
  if (!reduced) d.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: 350, delay, easing: EASE, fill: 'backwards' });
  d.erase = () => { d.animate([{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(0 0 0 100%)' }], { duration: reduced ? 0 : 200, fill: 'forwards' }); setTimeout(() => d.remove(), 220); };
  return d;
}

let marks = [], currentStep = null;

function draw(m) {
  const rand = rng(seedOf(m));
  const made = [];
  const block = (x, y, w, h) => placed.push([x, y, w, h]);
  if (m.type === 'ring') {
    block(m.x - m.r * 1.1, m.y - m.r, m.r * 2.2, m.r * 2);
    made.push(stroke(ringPath(m.x, m.y, m.r, rand), m.edge, 450));
    if (m.label) made.push(placeNote(m.label, [m.x - m.r * 1.1, m.y - m.r, m.r * 2.2, m.r * 2], 300));
  } else if (m.type === 'point') {
    block(m.x - 72, m.y - 30, 102, 60);
    made.push(stroke(tickPath(m.x, m.y, rand), m.edge, 250), stroke(ringPath(m.x, m.y, 28, rand), m.edge, 450, 150));
    if (m.label) made.push(placeNote(m.label, [m.x - 50, m.y - 30, 80, 60], 300));
  } else if (m.type === 'arrow') {
    const a = arrowPaths(m.x1, m.y1, m.x2, m.y2, rand);
    const xs = [m.x1, m.x2, a.mid[0]], ys = [m.y1, m.y2, a.mid[1]];
    block(Math.min(...xs) - 8, Math.min(...ys) - 8, Math.max(...xs) - Math.min(...xs) + 16, Math.max(...ys) - Math.min(...ys) + 16);
    made.push(stroke(a.shaft, m.edge, 220), stroke(a.head, m.edge, 80, 220));
    if (m.label) {
      const flat = Math.abs(m.x2 - m.x1) >= Math.abs(m.y2 - m.y1);
      made.push(placeNote(m.label, [a.mid[0] - 10, a.mid[1] - 10, 20, 20], 250, flat));
    }
  } else if (m.type === 'highlight') {
    block(m.x, m.y, m.w, m.h);
    made.push(swipe(m.x, m.y, m.w, m.h, rand, 0));
    if (m.label) made.push(placeNote(m.label, [m.x, m.y, m.w, m.h], 300));
  } else if (m.type === 'label') {
    made.push(placeNote(m.text, [m.x - 4, m.y - 4, 8, 8], 0));
  } else if (m.type === 'step') {
    if (currentStep) currentStep.forEach((x) => x.classList?.add('done') ?? x.style.setProperty('opacity', '.35'));
    const r = 28;
    block(m.x - r * 1.1 - 36, m.y - r - 20, r * 2.2 + 36, r * 2 + 20);
    const blk = div('step', { left: `${grid4(m.x - r * 1.1 - 36)}px`, top: `${grid4(m.y - r - 20)}px` });
    blk.textContent = m.n;
    if (!reduced) blk.animate([{ transform: 'scale(0.6)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }], { duration: 150, easing: EASE });
    blk.erase = () => { blk.animate([{ clipPath: 'inset(0 0 0 0)' }, { clipPath: 'inset(0 100% 0 0)' }], { duration: reduced ? 0 : 200, fill: 'forwards' }); setTimeout(() => blk.remove(), 220); };
    made.push(blk, stroke(ringPath(m.x, m.y, r, rand), m.edge, 450));
    if (m.label) made.push(placeNote(m.label, [m.x - r * 1.1 - 36, m.y - r - 20, r * 2.2 + 36, r * 2 + 20], 300));
    currentStep = made;
  }
  marks.push(...made);
  if (subRect) placeSub(); // a new mark may sit where the subtitle is
}

function eraseAll() {
  for (const m of marks) m.erase();
  marks = [];
  placed.length = 0;
  currentStep = null;
}

// ---------- subtitles (DESIGN.md): each say line while its audio plays ----------
const sub = $('sub'), SUB_MAX_H = 2 * 28 + 16, SUB_GAP = 64; // 2 lines of 28 px + padding
let subRect = null, subFade = null, subTimers = [];
// Splits a line into parts of at most 2 lines at the subtitle's size.
function subParts(text) {
  const parts = [];
  let cur = [];
  Object.assign(sub.style, { display: 'block', visibility: 'hidden' });
  for (const w of text.split(/\s+/).filter(Boolean)) {
    sub.textContent = [...cur, w].join(' ');
    if (cur.length && sub.offsetHeight > SUB_MAX_H) { parts.push(cur.join(' ')); cur = [w]; } else cur.push(w);
  }
  if (cur.length) parts.push(cur.join(' '));
  Object.assign(sub.style, { display: 'none', visibility: '' });
  return parts;
}
// Bottom-centre; top-centre when the bottom spot would cover a mark or label.
function placeSub() {
  const w = sub.offsetWidth, h = sub.offsetHeight, x = Math.round((W - w) / 2);
  const hitsAt = (y) => placed.filter((r) => x < r[0] + r[2] && x + w > r[0] && y < r[1] + r[3] && y + h > r[1]).length;
  const bottom = H - SUB_GAP - h, top = SUB_GAP;
  const y = hitsAt(bottom) && hitsAt(top) < hitsAt(bottom) ? top : bottom;
  Object.assign(sub.style, { left: `${x}px`, top: `${y}px` });
  subRect = [x, y, w, h];
}
function showSub(text, dur) {
  hideSub(true);
  const parts = subParts(text), words = text.split(/\s+/).filter(Boolean).length || 1;
  const ms = (Number.isFinite(dur) && dur > 0 ? dur : words * 0.38) * 1000; // MP3 duration can be Infinity
  const showPart = (p) => { sub.textContent = p; sub.style.display = 'block'; placeSub(); };
  let at = 0;
  parts.forEach((p, n) => {
    if (n === 0) showPart(p); else subTimers.push(setTimeout(() => showPart(p), at));
    at += ms * p.split(' ').length / words; // each part shows for its share of the audio
  });
}
function hideSub(now = false) {
  subTimers.forEach(clearTimeout);
  subTimers = [];
  subFade?.cancel();
  subFade = null;
  subRect = null;
  if (sub.style.display === 'none' || !sub.style.display) return;
  if (now || reduced) { sub.style.display = 'none'; return; }
  subFade = sub.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150 });
  subFade.onfinish = () => { sub.style.display = 'none'; subFade = null; };
}

// ---------- voice ----------
let audio = null;
function play(it, text) {
  // Returns {started: Promise<duration s>, ended: Promise, done}
  const h = { done: false };
  if (it.buf) {
    audio = new Audio(URL.createObjectURL(new Blob([it.buf], { type: it.mime || 'audio/mpeg' })));
    h.started = new Promise((res) => { audio.onplaying = () => res(audio.duration || 2); });
    h.ended = new Promise((res) => { audio.onended = audio.onerror = audio.onpause = () => { h.done = true; res(); }; });
    audio.play().catch(() => { h.done = true; });
  } else { // backup voice: Windows voices through Chromium
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US';
    u.rate = 1.05;
    h.started = new Promise((res) => { u.onstart = () => res(text.split(/\s+/).length * 0.38); });
    h.ended = new Promise((res) => { u.onend = u.onerror = () => { h.done = true; res(); }; });
    speechSynthesis.speak(u);
  }
  h.started = Promise.race([h.started, h.ended.then(() => 0)]);
  return h;
}
function stopVoice() {
  if (audio) { audio.onpause = null; audio.pause(); audio = null; }
  speechSynthesis.cancel();
}

// ---------- turn player ----------
let turn = 0, items = [], audios = new Map(), wakers = [], advanceWait = null, clearTimer = null, replay = false;
const changed = () => new Promise((r) => wakers.push(r));
const wake = () => { const w = wakers; wakers = []; w.forEach((r) => r()); };
const isMark = (it) => it.kind === 'mark';

async function audioFor(i, id) {
  while (!audios.has(i)) { await changed(); if (id !== turn) return null; }
  return audios.get(i);
}

async function run(id) {
  let k = 0;
  const alive = () => id === turn;
  while (alive()) {
    while (k >= items.length) { await changed(); if (!alive()) return; }
    const it = items[k++];
    if (it.kind === 'say') {
      const a = await audioFor(it.i, id);
      if (!alive()) return;
      earHold();
      const h = play(a, it.text);
      const dur = await h.started;
      if (!alive()) return;
      showSub(it.text, dur);
      ipcRenderer.send('voice:start', { turn: id, i: it.i, src: a.src || (a.buf ? 'edge' : 'windows') });
      if (!replay && ['listening', 'thinking', 'none'].includes(statusKind)) status('speaking', 'Speaking');
      // Marks after this say line appear while it is spoken, spaced across the line.
      const t0 = performance.now(), gap = Math.min(600, (dur * 1000) / 3);
      let j = 0;
      const take = () => {
        while (k < items.length && isMark(items[k])) {
          const m = items[k++].mark, at = t0 + j++ * gap;
          setTimeout(() => alive() && draw(m), Math.max(0, at - performance.now()));
        }
      };
      take();
      while (!h.done) { await Promise.race([h.ended, changed()]); if (!alive()) return; take(); }
      hideSub();
      earRelease();
    } else if (isMark(it)) {
      draw(it.mark);
    } else if (it.kind === 'wait') {
      if (replay) continue;
      ipcRenderer.send('waiting', { x: it.x, y: it.y });
      await Promise.race([new Promise((r) => (advanceWait = r)), new Promise((r) => setTimeout(r, 60000)), changed().then(function again() { return alive() ? changed().then(again) : null; })]);
      advanceWait = null;
      ipcRenderer.send('waiting-done');
      if (!alive()) return;
      if (currentStep) currentStep.forEach((x) => (x.style ? (x.style.opacity = '.35') : null));
    } else if (it.kind === 'act') {
      ipcRenderer.send('act', it.id);
    } else if (it.kind === 'clear') {
      eraseAll();
    } else if (it.kind === 'end') {
      if (statusKind === 'speaking') status('none');
      ipcRenderer.send('turn:done', id);
      clearTimeout(clearTimer);
      if (!replay) clearTimer = setTimeout(eraseAll, 20000);
      return;
    }
  }
}

function stopAll() {
  if (statusKind === 'speaking') status('none');
  turn++;
  wake();
  stopVoice();
  hideSub(true);
  earRelease();
  clearTimeout(clearTimer);
  eraseAll();
}

ipcRenderer.on('turn', (_e, id, opts = {}) => {
  stopAll();
  turn = id;
  items = [];
  audios = new Map();
  replay = !!opts.replay;
  busy = opts.busy || null;
  const bg = $('bg');
  if (opts.bg) { bg.src = opts.bg; bg.style.display = 'block'; } else { bg.removeAttribute('src'); bg.style.display = 'none'; }
  run(id);
});
ipcRenderer.on('item', (_e, id, it) => {
  if (id !== turn) return;
  if (it.kind === 'audio') audios.set(it.i, it); else items.push(it);
  wake();
});
ipcRenderer.on('ink', (_e, ink) => document.documentElement.style.setProperty('--ink', ink));
ipcRenderer.on('bg', (_e, src) => { const bg = $('bg'); bg.src = src; bg.style.display = 'block'; }); // tests: show the fixture under the marks
ipcRenderer.on('stop', () => { stopAll(); const bg = $('bg'); bg.style.display = 'none'; bg.removeAttribute('src'); });
ipcRenderer.on('advance', () => advanceWait && advanceWait());
addEventListener('keydown', (e) => { if (e.key === 'Escape') ipcRenderer.send('replay:close'); });

// ---------- status pill near the cursor: the mascot shows listening / thinking / speaking / problems ----------
const mascot = require(require('node:path').join(__dirname, 'mascot.js'));
let level = 0, statusTimer = null, levelLoop = null, talkLoop = null, statusKind = 'none', dotAnims = [], pillAt = [0, 0];
const FACE = { listening: 'listening', thinking: 'thinking', speaking: 'speaking', msg: 'confused', error: 'error' };
function status(kind, text = '', x = pillAt[0], y = pillAt[1]) {
  const s = $('status');
  clearTimeout(statusTimer);
  cancelAnimationFrame(levelLoop);
  clearInterval(talkLoop);
  dotAnims.forEach((a) => a.cancel());
  dotAnims = [];
  statusKind = kind;
  if (kind === 'none') { s.style.display = 'none'; return; }
  pillAt = [x, y];
  s.className = kind === 'listening' ? 'listening' : '';
  $('face').innerHTML = mascot.svg(FACE[kind], 28);
  $('word').textContent = text;
  $('bars').style.display = kind === 'listening' ? 'flex' : 'none';
  $('dots').style.display = kind === 'thinking' ? 'flex' : 'none';
  s.style.display = 'flex';
  s.style.left = `${Math.max(4, Math.min(x + 18, W - s.offsetWidth - 4))}px`;
  s.style.top = `${Math.max(4, Math.min(y + 18, H - s.offsetHeight - 4))}px`;
  if (kind === 'listening') {
    const bars = [...$('bars').children];
    const tick = () => {
      bars.forEach((b, i) => { b.style.height = `${4 + Math.min(12, level * 50 * (0.7 + 0.3 * Math.sin(performance.now() / 90 + i * 2)))}px`; });
      levelLoop = requestAnimationFrame(tick);
    };
    tick();
  } else if (kind === 'thinking' && !reduced) {
    dotAnims = [...$('dots').children].map((d, i) => d.animate([{ opacity: 0.25 }, { opacity: 1 }, { opacity: 0.25 }], { duration: 900, delay: i * 150, iterations: Infinity }));
  } else if (kind === 'speaking' && !reduced) {
    let open = false;
    talkLoop = setInterval(() => { open = !open; $('face').innerHTML = mascot.svg(open ? 'speaking' : 'happy', 28); }, 180);
  } else if (kind === 'msg' || kind === 'error') {
    statusTimer = setTimeout(() => status('none'), kind === 'error' || text.length > 30 ? 4000 : 1500);
  }
}
ipcRenderer.on('status', (_e, kind, text, x, y) => status(kind, text, x === undefined ? x : x / K, y === undefined ? y : y / K)); // cursor is in screen px

// ---------- mic ----------
let stream, rec, chunks = [], recStart = 0, analyser;
async function initMic() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    const ctx = new AudioContext();
    analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    ctx.createMediaStreamSource(stream).connect(analyser);
    ctx.suspend(); // only runs while listening (idle CPU)
    analyser.ctx = ctx;
    ipcRenderer.send('mic', { ok: true });
  } catch (e) {
    ipcRenderer.send('mic', { ok: false, err: String(e) });
  }
}
const buf = new Float32Array(256);
let meter = null;
ipcRenderer.on('rec:start', () => {
  if (!stream || rec?.state === 'recording') return;
  chunks = [];
  rec = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  rec.start();
  recStart = performance.now();
  analyser.ctx.resume();
  clearInterval(meter);
  meter = setInterval(() => { analyser.getFloatTimeDomainData(buf); level = Math.sqrt(buf.reduce((s, v) => s + v * v, 0) / buf.length); }, 50);
});
const endRec = (send) => {
  if (rec?.state !== 'recording') return send && ipcRenderer.send('rec:data', null, 0);
  const r = rec, dur = performance.now() - recStart;
  r.onstop = async () => {
    if (send) ipcRenderer.send('rec:data', new Uint8Array(await new Blob(chunks, { type: 'audio/webm' }).arrayBuffer()), dur);
  };
  r.stop();
  clearInterval(meter);
  analyser.ctx.suspend();
};
ipcRenderer.on('rec:stop', () => endRec(true));
ipcRenderer.on('rec:cancel', () => endRec(false));

// ---------- lecture ear (ARCHITECTURE-v2 3): the laptop's sound, cut into pieces that main sends to Groq ----------
const EAR_PIECE_MS = 30000, EAR_LOUD_MIN_MS = 1500, EAR_LEVEL = 0.01; // below EAR_LEVEL counts as silence
let ear = null;
async function earStart() {
  if (ear) return;
  try {
    const s = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true }); // main answers with system audio loopback
    s.getVideoTracks().forEach((t) => t.stop()); // only the sound is needed
    const audio = new MediaStream(s.getAudioTracks());
    if (!audio.getAudioTracks().length) throw new Error('no system audio track');
    const ctx = new AudioContext(), an = ctx.createAnalyser();
    an.fftSize = 512;
    ctx.createMediaStreamSource(audio).connect(an);
    ear = { audio, ctx, an, buf: new Float32Array(512), cur: null, muted: false, timer: null, letGo: null };
    ear.meter = setInterval(() => {
      if (!ear?.cur) return;
      ear.an.getFloatTimeDomainData(ear.buf);
      if (Math.sqrt(ear.buf.reduce((a, v) => a + v * v, 0) / ear.buf.length) > EAR_LEVEL) ear.cur.loudMs += 200;
    }, 200);
    earPiece();
    ipcRenderer.send('ear', { ok: true });
  } catch (e) {
    ear = null;
    ipcRenderer.send('ear', { ok: false, err: String(e) });
  }
}
function earPiece() {
  const rec = new MediaRecorder(ear.audio, { mimeType: 'audio/webm;codecs=opus' });
  const p = { rec, chunks: [], t0: Date.now(), loudMs: 0 };
  rec.ondataavailable = (e) => e.data.size && p.chunks.push(e.data);
  rec.start();
  ear.cur = p;
  clearTimeout(ear.timer);
  ear.timer = setTimeout(() => earCut(true), EAR_PIECE_MS);
}
// Ends the current piece and sends it if it had sound; starts the next one unless Nibley is speaking.
function earCut(again) {
  const p = ear?.cur;
  if (!p) return;
  ear.cur = null;
  clearTimeout(ear.timer);
  const t1 = Date.now();
  p.rec.onstop = async () => {
    if (p.loudMs >= EAR_LOUD_MIN_MS) ipcRenderer.send('ear:piece', new Uint8Array(await new Blob(p.chunks, { type: 'audio/webm' }).arrayBuffer()), { t0: p.t0, t1, loudMs: p.loudMs });
  };
  p.rec.stop();
  if (again && !ear.muted) earPiece();
}
// Nibley's own voice must not be transcribed (Windows 10 can't leave one app out of the loopback): pause around it.
function earHold() { if (!ear) return; clearTimeout(ear.letGo); if (!ear.muted) { ear.muted = true; earCut(false); } }
function earRelease() { if (!ear) return; clearTimeout(ear.letGo); ear.letGo = setTimeout(() => { ear.muted = false; if (!ear.cur) earPiece(); }, 700); }
function earStop() {
  if (!ear) return;
  clearInterval(ear.meter); clearTimeout(ear.timer); clearTimeout(ear.letGo);
  if (ear.cur) { ear.cur.rec.onstop = null; ear.cur.rec.stop(); } // the off switch: the piece in progress is dropped
  ear.audio.getTracks().forEach((t) => t.stop());
  ear.ctx.close();
  ear = null;
}
ipcRenderer.on('ear:on', earStart);
ipcRenderer.on('ear:off', earStop);
ipcRenderer.on('ear:cut', () => earCut(true)); // hotkey pressed: send what was just heard now

initMic();
