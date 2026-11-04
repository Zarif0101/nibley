// Shared helpers. Everything is a pure function of time t (seconds): no CSS transitions, no timers.
const NS = 'http://www.w3.org/2000/svg';
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const pr = (t, t0, d) => clamp01((t - t0) / d);            // progress of an event starting at t0 lasting d
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = (s) => ((ax * s + bx) * s + cx) * s, Y = (s) => ((ay * s + by) * s + cy) * s;
  return (x) => {
    if (x <= 0) return 0; if (x >= 1) return 1;
    let s = x;
    for (let i = 0; i < 8; i++) { const d = (3 * ax * s + 2 * bx) * s + cx; if (Math.abs(d) < 1e-6) break; s -= (X(s) - x) / d; }
    return Y(clamp01(s));
  };
}
const ease = bezier(0.3, 0.7, 0.2, 1);
const backOut = (x) => { x = clamp01(x); const c = 1.9; return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2); };

function h(tag, props, parent, html) {
  const e = document.createElement(tag);
  if (props) for (const k in props) { if (k === 'style') Object.assign(e.style, props[k]); else e[k] = props[k]; }
  if (html != null) e.innerHTML = html;
  if (parent) parent.appendChild(e);
  return e;
}
function sv(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}

// Laptop: neutral flat device, no logos.
function buildLaptop(parent) {
  const lap = h('div', { id: 'laptop' }, parent);
  const lid = h('div', { id: 'lid' }, lap);
  h('div', { id: 'cam' }, lid);
  const screen = h('div', { id: 'screen' }, lid);
  const base = h('div', { id: 'base' }, lap);
  h('div', { id: 'notch' }, base);
  return { lap, screen };
}
function laptopTilt(lap, t, exit0 = 1e9) {
  const e = ease(pr(t, 0, 1.5));
  const ex = ease(pr(t, exit0, 0.55));
  lap.style.transform = `perspective(2400px) rotateX(${(7 * (1 - e)).toFixed(3)}deg) rotateY(${(-11 * (1 - e)).toFixed(3)}deg) translateY(${(ex * 260).toFixed(1)}px)`;
  lap.style.opacity = 1 - ex;
  lap.style.display = ex >= 1 ? 'none' : 'block';
}

// Pen mark: edge outline behind (text colour), then ink. Draws on with stroke-dashoffset.
// parts: path strings drawn one after another; fractions = share of the duration for each.
class Mark {
  constructor(svg, paths, fractions) {
    this.fr = fractions || paths.map(() => 1 / paths.length);
    this.g = sv('g', { fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
    const mk = (stroke, w) => paths.map((d) => sv('path', { d, pathLength: 1, stroke, 'stroke-width': w, 'stroke-dasharray': '1 2', 'stroke-dashoffset': 1 }, this.g));
    this.edge = mk('#2B3A4B', 12);
    this.ink = mk('#2F8BFF', 7);
  }
  set(t, t0, dur, erase0 = 1e9, eraseDur = 0.2) {
    let p = pr(t, t0, dur);
    let eraseP = pr(t, erase0, eraseDur);
    let acc = 0;
    this.g.style.display = p <= 0 || eraseP >= 1 ? 'none' : 'block';
    this.ink.forEach((ink, i) => {
      const local = ease(clamp01((p - acc) / this.fr[i]));
      acc += this.fr[i];
      // erase = run the pen backwards (start end moves forward)
      const off = 1 - local;
      const dashOff = eraseP > 0 ? 1 - local + 0 : off;
      for (const el of [ink, this.edge[i]]) {
        if (eraseP > 0) { el.setAttribute('stroke-dasharray', `${(1 - eraseP).toFixed(4)} 2`); el.setAttribute('stroke-dashoffset', -eraseP); }
        else { el.setAttribute('stroke-dasharray', '1 2'); el.setAttribute('stroke-dashoffset', dashOff.toFixed(4)); }
        el.style.opacity = local <= 0 ? 0 : 1;
      }
    });
  }
}

function chipShow(el, t, t0, fadeOut0 = 1e9) {
  const p = pr(t, t0, 0.18), o = 1 - pr(t, fadeOut0, 0.18);
  el.style.opacity = p * o;
  el.style.transform = `translateX(${((1 - p) * -12).toFixed(2)}px)`;
}

// Mascot from src/overlay/mascot.js. Integer pixel scale (px per grid cell) keeps it crisp.
class Mascot {
  constructor(parent, cell) {
    this.cell = cell; this.size = cell * 20; this.face = null;
    this.el = h('div', { className: 'mascot', style: { width: this.size + 'px', height: this.size + 'px' } }, parent);
    this.set('happy');
  }
  set(face) { if (face !== this.face) { this.face = face; this.el.innerHTML = svg(face, this.size); } }
  place(x, y, s = 1, rot = 0, op = 1) {
    this.el.style.left = x + 'px'; this.el.style.top = y + 'px';
    this.el.style.transform = `scale(${s.toFixed(3)}) rotate(${rot.toFixed(2)}deg)`;
    this.el.style.opacity = op; this.el.style.display = op <= 0 || s <= 0 ? 'none' : 'block';
  }
}
// One extra face (same 20x20 grid and palette): eyes lowered one row, tiny mouth, for shy / looking down.
FACES.down = [[10, 6, 'WE....WE'], [11, 6, 'EE....EE'], [12, 6, 'EE....EE'], [14, 10, 'E']];

// Captions: [{a, b, text}] with a white card, fades/rises in over 0.2 s.
function captions(list) {
  const el = document.getElementById('cap');
  let shown = null;
  return (t) => {
    const c = list.find((c) => t >= c.a && t < c.b);
    if (!c) { el.style.opacity = 0; return; }
    if (shown !== c) { el.textContent = c.text; shown = c; }
    const p = ease(pr(t, c.a, 0.22)), o = 1 - pr(t, c.b - 0.12, 0.12);
    el.style.opacity = p * o;
    el.style.transform = `translateY(${((1 - p) * 14).toFixed(1)}px)`;
  };
}

// Keycaps Win + `: press = translateY + smaller shadow.
function buildKeys(parent, x, y) {
  const win = h('div', { className: 'key', style: { left: x + 'px', top: y + 'px' } }, parent, 'Win');
  const plus = h('div', { className: 'plus', style: { left: x + 150 + 22 + 'px', top: y + 'px' } }, parent, '+');
  const tick = h('div', { className: 'key', style: { left: x + 150 + 76 + 'px', top: y + 'px', fontSize: '58px' } }, parent, '`');
  return (t, appear, press, release) => {
    const a = ease(pr(t, appear, 0.25));
    const d = pr(t, press, 0.08) * (1 - pr(t, release, 0.1));
    plus.style.opacity = a;
    for (const [k, delay] of [[win, 0], [tick, 0.12]]) {
      const dd = pr(t, press + delay, 0.08) * (1 - pr(t, release, 0.1));
      k.style.opacity = a;
      k.style.display = a <= 0 ? 'none' : 'block';
      k.style.transform = `translateY(${(((1 - a) * 16) + dd * 7).toFixed(1)}px)`;
      k.style.boxShadow = `0 ${(9 - dd * 7).toFixed(1)}px 0 var(--deep)`;
      k.style.background = dd > 0.5 ? '#fff' : '#fff';
    }
  };
}

// Lecturer's slide drawing: block + ground from library/assets in text colour, hand-drawn look kept.
function lectureArt(slideSvg, { cx, floor, s }) {
  const g = sv('g', { fill: 'none', stroke: '#2B3A4B', 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, slideSvg);
  sv('path', { d: BLOCK, transform: `translate(${cx - 100 * s} ${floor - 130 * s}) scale(${s})`, 'vector-effect': 'non-scaling-stroke' }, g);
  sv('path', { d: GROUND, transform: `translate(${cx - 100 * s} ${floor - 100 * s}) scale(${s})`, 'vector-effect': 'non-scaling-stroke' }, g);
  return g;
}
function printedPath(slideSvg, d) {
  return sv('path', { d, fill: 'none', stroke: '#2B3A4B', 'stroke-width': 5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, slideSvg);
}

// End card (left aligned): Nibley, wordmark, url with a pen underline, small print.
function buildEndCard(stage) {
  const root = h('div', { className: 'abs', style: { left: 0, top: 0, width: '1080px', height: '1920px' } }, stage);
  const m = new Mascot(root, 14);
  const word = h('div', { className: 'abs', style: { left: '80px', top: '700px', fontWeight: 700, fontSize: '84px', lineHeight: '96px' } }, root, 'Nibley');
  const url = h('div', { className: 'abs', style: { left: '80px', top: '830px', fontWeight: 600, fontSize: '50px', lineHeight: '64px', color: '#1E6FEB', whiteSpace: 'nowrap' } }, root, 'github.com/Zarif0101/nibley');
  const small = h('div', { className: 'abs', style: { left: '80px', top: '930px', fontWeight: 400, fontSize: '32px', lineHeight: '44px', color: '#6B7A90' } }, root, 'Windows · uses your Claude subscription');
  const usvg = sv('svg', { class: 'pen', width: 1080, height: 1920, viewBox: '0 0 1080 1920' }, root);
  const ug = sv('g', { transform: `translate(80 ${906}) scale(${0.97} 1)` }, usvg);
  const um = new Mark(ug, MARKS.underline);
  return { root, m, word, url, small, um };
}
