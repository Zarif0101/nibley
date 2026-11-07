// Overlay: draws marks (docs/DESIGN.md), plays the voice timed to them, records the mic.
const { ipcRenderer } = require('electron');
const { pillMotion } = require(require('node:path').join(__dirname, 'pill-motion.js'));
const { createChoices } = require(require('node:path').join(__dirname, 'choices.js'));

const NS = 'http://www.w3.org/2000/svg';
const W = 1366, H = 768;
const EASE = 'cubic-bezier(.3,.7,.2,1)';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (id) => document.getElementById(id);
const svg = $('svg'), layer = $('layer');
// Everything is drawn at 1366x768 (the screenshot size Claude sees) and scaled to the real screen (1600x900 since 2026-11).
const K = Math.min(innerWidth / W, innerHeight / H) || 1;
Object.assign(document.documentElement.style, { transformOrigin: '0 0', transform: `scale(${K})` });

// ---------- helpers ----------
const el = (tag, attrs = {}, parent) => {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.append(e);
  return e;
};
const div = (cls, style = {}, parent = layer) => { const d = document.createElement('div'); d.className = cls; Object.assign(d.style, style); parent.append(d); return d; };
const pts = (list) => list.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');

// A pen stroke with its edge outline underneath; draws on over `ms`, starting after `delay`.
function stroke(d, edge, ms, delay = 0, kind = '') {
  const g = el('g', {}, svg);
  const e = el('path', { d, class: `edge ${kind}`, stroke: edge || '#2B3A4B' }, g);
  const p = el('path', { d, class: `pen ${kind}` }, g);
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

// Calm screen areas (busy map from main.js) and the boxes already used this turn, so cards go to empty space.
const placed = []; // boxes of every mark and note drawn this turn
let busy = null;   // {cell, cols, data}: how busy each screenshot cell is (0 = flat)
function inked(x, y, w, h, min = 3) {
  if (!busy) return 0;
  let n = 0;
  for (let cy = Math.floor(y / busy.cell); cy <= Math.floor((y + h) / busy.cell); cy++) {
    for (let cx = Math.floor(x / busy.cell); cx <= Math.floor((x + w) / busy.cell); cx++) if ((busy.data[cy * busy.cols + cx] || 0) >= min) n++;
  }
  return n;
}
function busyAt(x, y, w, h) {
  if (!busy) return 0;
  let s = 0, n = 0;
  for (let cy = Math.floor(y / busy.cell); cy <= Math.floor((y + h) / busy.cell); cy++) {
    for (let cx = Math.floor(x / busy.cell); cx <= Math.floor((x + w) / busy.cell); cx++) { s += busy.data[cy * busy.cols + cx] || 0; n++; }
  }
  return n ? s / n : 0;
}
let marks = [], currentStep = null, groups = []; // groups: one per drawn mark {made, boxes, step}, oldest first

// Answer guard (T6, NEXT-ROUND Q8): max 2 marks on screen, so the oldest non-step mark fades before a new one.
function fadeOldest() {
  const g = groups.find((x) => !x.step);
  if (!g) return;
  groups = groups.filter((x) => x !== g);
  g.made.forEach((x) => x.erase());
  marks = marks.filter((x) => !g.made.includes(x));
  for (const b of g.boxes) { const i = placed.indexOf(b); if (i >= 0) placed.splice(i, 1); }
}

// ---------- note cards (NEXT-ROUND phase 3 v2, Zarif 2026-11-08) ----------
// No free circles or arrows: a small card in a calm spot, a thin line that draws itself to the target, and a soft mark
// there (underline under text, thin outline round a shape). Older mark commands are drawn the same way.
const CARD_W = 240, NO_GO = [W / 2 - 400, H - 260, 800, 260]; // bottom centre: pill, answer buttons, subtitle
function targetOf(m) {
  switch (m.type) {
    case 'note': case 'highlight': return { box: [m.x, m.y, m.w, m.h], title: m.title || m.label, text: m.text };
    case 'ring': return { box: [m.x - m.r, m.y - m.r, m.r * 2, m.r * 2], title: m.label };
    case 'point': return { box: [m.x - 16, m.y - 16, 32, 32], title: m.label };
    case 'arrow': return { box: [m.x2 - 20, m.y2 - 20, 40, 40], title: m.label };
    case 'label': return { box: [m.x - 12, m.y - 12, 24, 24], title: m.text };
    case 'step': return { box: [m.x - 22, m.y - 16, 44, 32], title: m.label || `Step ${m.n}`, n: m.n };
  }
  return null;
}
const overlaps = (a, b, pad = 0) => a[0] < b[0] + b[2] + pad && a[0] + a[2] + pad > b[0] && a[1] < b[1] + b[3] + pad && a[1] + a[3] + pad > b[1];
// Best spot for a card: off the target and other marks, out of the bottom centre, calm (busy map), not too far.
function cardSpot(target, w, h) {
  const [tx, ty, tw, th] = target, cx = tx + tw / 2, cy = ty + th / 2;
  const others = subRect ? [...placed, subRect, NO_GO] : [...placed, NO_GO];
  let best = null;
  for (let y = 8; y + h <= H - 8; y += 16) for (let x = 8; x + w <= W - 8; x += 16) {
    const r = [x, y, w, h];
    if (overlaps(r, target, 16)) continue;
    // inked: cells with anything drawn in them (thin chalk lines on black average out as calm, so count them)
    const score = others.filter((o) => overlaps(r, o, 8)).length * 1000 + inked(x, y, w, h) * 40 + busyAt(x, y, w, h) + Math.hypot(x + w / 2 - cx, y + h / 2 - cy) * 0.03;
    if (!best || score < best[2]) best = [x, y, score];
  }
  return best || [8, 8];
}
function card(t, x, y, delay) {
  const d = div('card', { left: `${x}px`, top: `${y}px`, width: `${CARD_W}px` });
  const k = document.createElement('div');
  k.className = 'k';
  if (t.n) { const b = document.createElement('span'); b.className = 'num'; b.textContent = t.n; k.append(b); }
  k.append(t.title || '');
  d.append(k);
  if (t.text) {
    const v = document.createElement('div');
    v.className = 'v';
    v.textContent = t.text;
    d.append(v);
    if (!reduced) { // writes in like a pen, while he speaks
      const ms = Math.min(1100, t.text.length * 28);
      v.animate([{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: ms, delay: delay + 180, easing: 'linear', fill: 'backwards' });
    }
  }
  if (!reduced) d.animate([{ transform: 'translateY(6px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 180, delay, easing: EASE, fill: 'backwards' });
  d.addEventListener('mouseenter', () => holdCards(true));
  d.addEventListener('mouseleave', () => holdCards(false));
  d.erase = () => { d.animate([{ opacity: 1 }, { opacity: 0 }], { duration: reduced ? 0 : 600, fill: 'forwards' }); setTimeout(() => d.remove(), 620); };
  return d;
}
// Line from the card side nearest the target to the target's anchor, then the soft mark.
function pointer(t, r, edge, delay) {
  const [bx, by, bw, bh] = t.box, under = bh <= 48 && bw >= bh * 1.6;
  const [x, y, w, h] = r, left = bx + bw / 2 < x, right = bx + bw / 2 > x + w;
  const sx = left ? x : right ? x + w : x + w / 2, sy = left || right ? y + h / 2 : (by + bh / 2 < y ? y : y + h);
  const tx = under ? bx + bw / 2 : left ? bx + bw + 6 : right ? bx - 6 : bx + bw / 2;
  const ty = under ? by + bh + 5 : left || right ? by + bh / 2 : (by + bh / 2 < sy ? by + bh + 6 : by - 6);
  const mx = (sx + tx) / 2;
  const line = left || right ? `M${sx} ${sy} C${mx} ${sy} ${mx} ${ty} ${tx} ${ty}` : `M${sx} ${sy} C${sx} ${(sy + ty) / 2} ${tx} ${(sy + ty) / 2} ${tx} ${ty}`;
  return [stroke(line, edge, 380, delay, 'thin'), softMark(t.box, edge, delay + 380)];
}
function softMark([bx, by, bw, bh], edge, delay) {
  if (bh <= 48 && bw >= bh * 1.6) return stroke(`M${bx} ${by + bh + 4} q${bw / 2} 5 ${bw} -1`, edge, 300, delay); // underline under text
  const p = 6, x = bx - p, y = by - p, w = bw + p * 2, h = bh + p * 2, r = Math.min(12, w / 4, h / 4);
  return stroke(`M${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + h - r} Q${x + w} ${y + h} ${x + w - r} ${y + h} H${x + r} Q${x} ${y + h} ${x} ${y + h - r} V${y + r} Q${x} ${y} ${x + r} ${y}`, edge, 450, delay, 'soft');
}

function draw(m) {
  const t = targetOf(m);
  if (!t) return;
  const made = [], p0 = placed.length;
  if (m.type === 'step' && currentStep) { // one step at a time: the last one goes when the next draws in (Q7)
    const g = groups.find((x) => x.made === currentStep);
    if (g) { groups = groups.filter((x) => x !== g); g.made.forEach((x) => x.erase()); marks = marks.filter((x) => !g.made.includes(x)); }
  }
  placed.push(t.box.map(Math.round));
  if (t.title || t.text) {
    const c = card(t, 0, 0, 0), w = c.offsetWidth, h = c.offsetHeight, [x, y] = cardSpot(t.box, w, h);
    Object.assign(c.style, { left: `${x}px`, top: `${y}px` });
    placed.push([x, y, w, h]);
    made.push(c, ...pointer(t, [x, y, w, h], m.edge, 250));
  } else made.push(softMark(t.box, m.edge, 0));
  cardsShown(true);
  if (m.type === 'step') currentStep = made;
  marks.push(...made);
  groups.push({ made, boxes: placed.slice(p0), step: m.type === 'step' });
  if (subRect) placeSub(); else layoutStack(); // a new mark may sit where the subtitle or pill is
}

// Cards fade ~5 s after the answer; the mouse on a card keeps them (Q3). The overlay gets the mouse only over cards.
let cardsOn = false, hovering = false, answerDone = false;
function cardsShown(on) { if (on !== cardsOn) { cardsOn = on; ipcRenderer.send('cards:shown', on); } }
function holdCards(on) {
  hovering = on;
  clearTimeout(clearTimer);
  if (!on && answerDone && !replay) clearTimer = setTimeout(eraseAll, 5000);
}

function eraseAll() {
  for (const m of marks) m.erase();
  marks = [];
  groups = [];
  placed.length = 0;
  currentStep = null;
  cardsShown(false);
  layoutStack();
}

// ---------- subtitles (DESIGN.md): each say line while its audio plays ----------
const sub = $('sub'), SUB_MAX_H = 2 * 28 + 16, SUB_GAP = 64; // 2 lines of 28 px + padding
let subRect = null, subFade = null, subTimers = [], subPlan = null;
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
// Subtitle, answer buttons and pill stack together (DESIGN.md "Status pill"): bottom-centre, or all at the top when a
// mark sits in the bottom quarter. Bottom, from the edge: subtitle 64 px, buttons, pill 184 px. Top: pill 24 px, buttons, subtitle.
const atTop = () => placed.some((r) => r[1] + r[3] > H * 0.75);
function layoutStack() {
  const gap = 8, top = atTop(), wrap = $('status-wrap'), row = choices.el;
  const subOn = !!subRect, subH = subOn ? sub.offsetHeight : 0, btnOn = choices.visible, btnH = btnOn ? row.offsetHeight : 0;
  if (!top) {
    const btnAt = Math.max(128, subOn ? SUB_GAP + subH + gap : 0);
    const pillAt = Math.max(184, btnOn ? btnAt + btnH + gap : subOn ? SUB_GAP + subH + gap : 0);
    if (subOn) sub.style.top = `${H - SUB_GAP - subH}px`;
    Object.assign(row.style, { top: 'auto', bottom: `${btnAt}px` });
    Object.assign(wrap.style, { top: 'auto', bottom: `${pillAt}px` });
  } else {
    const pillAt = 24, btnAt = pillAt + 36 + gap, subAt = btnOn ? btnAt + btnH + gap : btnAt;
    if (subOn) sub.style.top = `${subAt}px`;
    Object.assign(row.style, { bottom: 'auto', top: `${btnAt}px` });
    Object.assign(wrap.style, { bottom: 'auto', top: `${pillAt}px` });
  }
  if (subOn) subRect[1] = parseFloat(sub.style.top);
}
function placeSub() {
  const w = sub.offsetWidth, h = sub.offsetHeight, x = Math.round((W - w) / 2);
  sub.style.left = `${x}px`;
  subRect = [x, 0, w, h];
  layoutStack();
}
// Returns a plan whose retime(seconds) re-spaces the parts not shown yet (streamed audio: exact length comes later).
function showSub(text, dur) {
  hideSub(true);
  const parts = subParts(text), words = text.split(/\s+/).filter(Boolean).length || 1;
  const sec = (d) => (Number.isFinite(d) && d > 0 ? d : words * 0.38) * 1000; // MP3 duration can be Infinity
  const plan = subPlan = { n: 0, before: 0, t0: performance.now(), ms: sec(dur) };
  // each part shows for its share of the audio
  const schedule = () => { if (plan.n < parts.length) subTimers.push(setTimeout(next, Math.max(0, plan.t0 + plan.ms * plan.before / words - performance.now()))); };
  const next = () => {
    sub.textContent = parts[plan.n]; sub.style.display = 'block'; placeSub();
    plan.before += parts[plan.n++].split(' ').length;
    schedule();
  };
  plan.retime = (d) => { if (subPlan !== plan) return; subTimers.forEach(clearTimeout); subTimers = []; plan.ms = sec(d); schedule(); };
  next();
  return plan;
}
function hideSub(now = false) {
  subTimers.forEach(clearTimeout);
  subTimers = [];
  subPlan = null;
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
  if (it.stream) { // Edge MP3 pieces as they arrive (P7), fed into a MediaSource; ipc 'audio:chunk' / 'audio:end' fill it
    const ms = new MediaSource();
    let exact;
    h.exact = new Promise((res) => (exact = res)); // true length once the last piece is in
    audio = new Audio(URL.createObjectURL(ms));
    ms.addEventListener('sourceopen', () => {
      let sb;
      try { sb = ms.addSourceBuffer(it.mime); } catch { audio.onerror(); return; } // can't stream: skip the line, never hang the turn
      let k = 0;
      it.feed = () => {
        if (sb.updating || ms.readyState !== 'open') return;
        if (k < it.chunks.length) sb.appendBuffer(it.chunks[k++]);
        else if (it.done) { ms.endOfStream(); exact(ms.duration); }
      };
      sb.addEventListener('updateend', it.feed);
      it.feed();
    }, { once: true });
    // Length unknown until the last piece: estimate from words, like the Windows voice (subtitle parts, mark spacing)
    h.started = new Promise((res) => { audio.onplaying = () => res(text.split(/\s+/).length * 0.38); });
    h.ended = new Promise((res) => { audio.onended = audio.onerror = audio.onpause = () => { h.done = true; res(); }; });
    audio.play().catch(() => { h.done = true; });
  } else if (it.buf) {
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
const isMark = (it) => it.kind === 'mark' || it.kind === 'choices'; // both appear while the line before them is spoken
const drawItem = (it) => (it.kind === 'choices' ? !replay && showChoices(it.options) : (it.fadeOldest && fadeOldest(), draw(it.mark)));

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
      const w0 = performance.now(); // wait_ms: silence before this line, waiting for its audio
      const a = await audioFor(it.i, id);
      if (!alive()) return;
      earHold();
      const h = play(a, it.text);
      const dur = await h.started;
      if (!alive()) return;
      const plan = showSub(it.text, dur);
      h.exact?.then((d) => plan?.retime(d));
      ipcRenderer.send('voice:start', { turn: id, i: it.i, src: a.src || (a.buf ? 'edge' : 'windows'), synth_ms: a.synth_ms, wait_ms: Math.round(performance.now() - w0) });
      // Marks after this say line appear while it is spoken, spaced across the line.
      const t0 = performance.now(), gap = Math.min(600, (dur * 1000) / 3);
      let j = 0;
      const take = () => {
        while (k < items.length && isMark(items[k])) {
          const m = items[k++], at = t0 + j++ * gap;
          setTimeout(() => alive() && drawItem(m), Math.max(0, at - performance.now()));
        }
      };
      take();
      while (!h.done) { await Promise.race([h.ended, changed()]); if (!alive()) return; take(); }
      hideSub();
      earRelease();
    } else if (isMark(it)) {
      drawItem(it);
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
      ipcRenderer.send('turn:done', id);
      clearTimeout(clearTimer);
      answerDone = true;
      if (!replay && !hovering) clearTimer = setTimeout(eraseAll, 5000);
      return;
    }
  }
}

function stopAll() {
  choices.hide();
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
  answerDone = false;
  items = [];
  audios = new Map();
  replay = !!opts.replay;
  $('back').style.display = replay ? 'flex' : 'none';
  busy = opts.busy || null;
  const bg = $('bg');
  if (opts.bg) { bg.src = opts.bg; bg.style.display = 'block'; } else { bg.removeAttribute('src'); bg.style.display = 'none'; }
  run(id);
});
ipcRenderer.on('item', (_e, id, it) => {
  if (id !== turn) return;
  if (it.kind === 'audio') audios.set(it.i, it.stream ? { ...it, chunks: [], done: false } : it); else items.push(it);
  wake();
});
ipcRenderer.on('audio:chunk', (_e, id, i, c) => { const a = id === turn && audios.get(i); if (a) { a.chunks.push(c); a.feed?.(); } });
ipcRenderer.on('audio:end', (_e, id, i) => { const a = id === turn && audios.get(i); if (a) { a.done = true; a.feed?.(); } });
ipcRenderer.on('ink', (_e, ink) => document.documentElement.style.setProperty('--ink', ink));
ipcRenderer.on('bg', (_e, src) => { const bg = $('bg'); bg.src = src; bg.style.display = 'block'; }); // tests: show the fixture under the marks
$('back').onclick = () => ipcRenderer.send('replay:close');
ipcRenderer.on('stop', () => { stopAll(); $('back').style.display = 'none'; const bg = $('bg'); bg.style.display = 'none'; bg.removeAttribute('src'); });
ipcRenderer.on('advance', () => advanceWait && advanceWait());
ipcRenderer.on('marks:clear', () => { clearTimeout(clearTimer); eraseAll(); }); // he switched window or tab: nothing lingers
addEventListener('keydown', (e) => { if (e.key === 'Escape') ipcRenderer.send('replay:close'); });

// ---------- answer buttons (QUALITY-PLAN T13): a pick counts as if he said it ----------
let pickHow = 'click';
const choices = createChoices(document.body, (text) => ipcRenderer.send('choice', { text, how: pickHow }), { onHide: () => ipcRenderer.send('choices:shown', false) });
choices.el.addEventListener('mouseenter', () => ipcRenderer.send('choices:mouse', true)); // main stops ignoring the mouse here only
choices.el.addEventListener('mouseleave', () => ipcRenderer.send('choices:mouse', false));
function showChoices(options) {
  choices.show(options);
  layoutStack();
  ipcRenderer.send('choices:shown', true);
}
// Keys come from the helper while the buttons show (the overlay never takes focus). 'other' = he is typing: get out of the way.
ipcRenderer.on('choices:key', (_e, name) => {
  if (name === 'other') return choices.hide();
  pickHow = 'key';
  choices.key(name);
  pickHow = 'click';
});

// ---------- status pill, one fixed spot (DESIGN.md): the mascot shows listening / thinking / speaking / problems ----------
// Main decides the order (src/overlay/pill-sequence.js); this only draws it, with motion (pill-motion.js).
const mascot = require(require('node:path').join(__dirname, 'mascot.js'));
let level = 0, statusTimer = null, levelLoop = null, talkLoop = null, statusKind = 'none', dotAnims = [];
const FACE = { listening: 'listening', thinking: 'thinking', speaking: 'speaking', msg: 'confused', error: 'error' };
function status(kind, text = '') {
  const s = $('status'), was = statusKind;
  clearTimeout(statusTimer);
  cancelAnimationFrame(levelLoop);
  clearInterval(talkLoop);
  dotAnims.forEach((a) => a.cancel());
  dotAnims = [];
  statusKind = kind;
  if (kind === 'none') {
    if (was !== 'none') pillMotion.leave(s, () => { if (statusKind === 'none') s.style.display = 'none'; });
    return;
  }
  const fill = () => {
    s.className = kind === 'listening' ? 'listening' : '';
    $('face').innerHTML = mascot.svg(FACE[kind], 28);
    $('word').textContent = text;
    $('bars').style.display = kind === 'listening' ? 'flex' : 'none';
    $('dots').style.display = kind === 'thinking' ? 'flex' : 'none';
  };
  s.getAnimations().forEach((a) => a.cancel()); // a leave still running must not hide the new state
  if (was === 'none' || s.style.display !== 'flex') { fill(); s.style.display = 'flex'; layoutStack(); pillMotion.enter(s); }
  else pillMotion.morph(s, fill);
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
ipcRenderer.on('status', (_e, kind, text) => status(kind, text));

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
