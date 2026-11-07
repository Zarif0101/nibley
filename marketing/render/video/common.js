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
  const wrap = h('div', { id: 'camwrap' }, parent);
  const lap = h('div', { id: 'laptop' }, wrap);
  const lid = h('div', { id: 'lid' }, lap);
  h('div', { id: 'cam' }, lid);
  const screen = h('div', { id: 'screen' }, lid);
  const base = h('div', { id: 'base' }, lap);
  h('div', { id: 'notch' }, base);
  return { lap, screen, wrap };
}
// Camera: laptop sits at the frame's middle (scale 1.1); during the drawing beats it eases to 1.3x more,
// keeping focal point F (laptop-local px) at the frame target. cubic-bezier(.3,.7,.2,1), 600 ms each way.
function laptopTilt(lap, t, exit0 = 1e9, cam) {
  if (cam) {
    const k = 1.1, c = [470, 313], C = [540, 740], T = cam.T || [540, 730], F = cam.F;
    const z = ease(pr(t, cam.in, 0.6)) * (1 - ease(pr(t, cam.out, 0.6)));
    const B = [C[0] + k * (F[0] - c[0]), C[1] + k * (F[1] - c[1])];
    const G = [B[0] * (1 - z) + T[0] * z, B[1] * (1 - z) + T[1] * z];
    const S = k * (1 + 0.3 * z);
    cam.wrap.style.transform = `translate(${G[0].toFixed(2)}px,${G[1].toFixed(2)}px) scale(${S.toFixed(4)}) translate(${-F[0]}px,${-F[1]}px)`;
  }
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
    this.edge = mk('#2B3A4B', 9.5);
    this.ink = mk('#2F8BFF', 5.5);
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
    if (shown !== c) { el.textContent = c.text; shown = c; el.style.top = (c.top || 1130) + 'px'; }
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
  return (t, appear, press, release, vanish = 1e9) => {
    const a = ease(pr(t, appear, 0.25)) * (1 - pr(t, vanish, 0.2));
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
  // block centred in the safe zone (y 220..1500): top of Nibley at 435, caption card ends near 1294
  const root = h('div', { className: 'abs', style: { left: 0, top: 0, width: '1080px', height: '1920px' } }, stage);
  const m = new Mascot(root, 18);
  const word = h('div', { className: 'abs', style: { left: '80px', top: '835px', fontWeight: 700, fontSize: '96px', lineHeight: '108px' } }, root, 'Nibley');
  const url = h('div', { className: 'abs', style: { left: '80px', top: '955px', fontWeight: 600, fontSize: '60px', lineHeight: '72px', color: '#1E6FEB', whiteSpace: 'nowrap' } }, root, 'github.com/Zarif0101/nibley');
  const small = h('div', { className: 'abs', style: { left: '80px', top: '1041px', fontWeight: 400, fontSize: '40px', lineHeight: '52px', color: '#6B7A90', whiteSpace: 'nowrap' } }, root, 'Windows \u00b7 uses your Claude subscription');
  const usvg = sv('svg', { class: 'pen', width: 1080, height: 1920, viewBox: '0 0 1080 1920' }, root);
  const ug = sv('g', { transform: 'translate(80 1028) scale(1 1)' }, usvg);
  const um = new Mark(ug, MARKS.underline);
  return { root, m, word, url, small, um };
}
