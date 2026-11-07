'use strict';

// Tiny pen-style SVG builder for the study library. No dependencies.
// Each stroke helper returns a description; build() turns it into one wobbly <path>,
// seeded by asset name + stroke index so rebuilds are identical.
// Angles are in degrees, counter-clockwise from +x (maths style, so 90 = up on screen).

const fs = require('fs');
const path = require('path');

const MAX_PATHS = 12;

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const num = (n) => {
  const r = Math.round(n * 10) / 10;
  const s = (Object.is(r, -0) ? 0 : r).toFixed(1);
  return s.endsWith('.0') ? s.slice(0, -2) : s;
};
const P = ([x, y]) => `${num(x)} ${num(y)}`;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const rad = (d) => (d * Math.PI) / 180;
const onEllipse = (cx, cy, rx, ry, rot, a) => {
  const x = rx * Math.cos(rad(a));
  const y = ry * Math.sin(rad(a));
  const c = Math.cos(rad(rot));
  const s = Math.sin(rad(rot));
  return [cx + x * c - y * s, cy - (x * s + y * c)];
};

class Pen {
  constructor(rand, wobble) {
    this.r = rand;
    this.w = wobble;
  }
  j(a) {
    return (this.r() * 2 - 1) * a * this.w;
  }
  jp(p, a = 0.8) {
    return [p[0] + this.j(a), p[1] + this.j(a)];
  }
  // slightly bowed segment from p to q (p already emitted)
  seg(p, q, bend = 0.022) {
    const dx = q[0] - p[0];
    const dy = q[1] - p[1];
    const len = Math.hypot(dx, dy);
    if (len < 8) return `L${P(q)}`;
    const b = clamp(len * bend, 0.5, 3) * (this.r() * 2 - 1) * this.w;
    const t = 0.4 + this.r() * 0.2;
    const c = [p[0] + dx * t - (dy / len) * b * 2, p[1] + dy * t + (dx / len) * b * 2];
    return `Q${P(c)} ${P(q)}`;
  }
  // smooth curve through points (Catmull-Rom -> cubic Bezier)
  spline(pts, closedLoop = false) {
    const n = pts.length;
    const get = (i) => (closedLoop ? pts[(i + n) % n] : pts[clamp(i, 0, n - 1)]);
    let d = `M${P(pts[0])}`;
    const last = closedLoop ? n : n - 1;
    for (let i = 0; i < last; i++) {
      const p0 = get(i - 1);
      const p1 = get(i);
      const p2 = get(i + 1);
      const p3 = get(i + 2);
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += `C${P(c1)} ${P(c2)} ${P(p2)}`;
    }
    return d;
  }
}

// ---------- stroke helpers ----------
const S = (kind, ...args) => ({ kind, args });

const line = (x1, y1, x2, y2) => S('line', [x1, y1], [x2, y2]);
const arrow = (x1, y1, x2, y2, head = 11) => S('arrow', [x1, y1], [x2, y2], head);
const poly = (pts) => S('poly', pts);
const closed = (pts) => S('closed', pts);
const rect = (x, y, w, h) => S('closed', [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
const curve = (pts) => S('curve', pts);
const ellipse = (cx, cy, rx, ry, opts = {}) => S('ellipse', cx, cy, rx, ry, opts);
const circle = (cx, cy, r, opts = {}) => S('ellipse', cx, cy, r, r, opts);
const arc = (cx, cy, r, a0, a1, opts = {}) => S('ellipse', cx, cy, r, r, { ...opts, start: a0, sweep: a1 - a0, partial: true });
const earc = (cx, cy, rx, ry, a0, a1, opts = {}) => S('ellipse', cx, cy, rx, ry, { ...opts, start: a0, sweep: a1 - a0, partial: true });
const dash = (x1, y1, x2, y2, n) => S('dash', [x1, y1], [x2, y2], n);
const dots = (pts) => S('dots', pts);
const zigzag = (x1, y1, x2, y2, n = 6, amp = 8, lead = 0.15) => S('zigzag', [x1, y1], [x2, y2], n, amp, lead);
const coil = (x1, y1, x2, y2, turns = 6, r = 12) => S('coil', [x1, y1], [x2, y2], turns, r);
const wave = (x0, y0, x1, amp, cycles, phase = 0) => S('wave', x0, y0, x1, amp, cycles, phase);
const plot = (fn, t0, t1, n = 12) => S('plot', fn, t0, t1, n);
const hatch = (x1, y1, x2, y2, n = 6, len = 9, angle = -135) => S('hatch', [x1, y1], [x2, y2], n, len, angle);
const group = (...strokes) => S('group', strokes);

function render(stroke, pen) {
  const [a, b, c, d, e, f] = stroke.args;
  switch (stroke.kind) {
    case 'line': {
      const p = pen.jp(a);
      return `M${P(p)}${pen.seg(p, pen.jp(b))}`;
    }
    case 'arrow': {
      const p = pen.jp(a);
      const q = pen.jp(b, 0.4);
      const ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
      const h = c;
      const wing = (s) => [q[0] - h * Math.cos(ang + s * rad(28 + pen.j(4))), q[1] - h * Math.sin(ang + s * rad(28 + pen.j(4)))];
      const l = wing(1);
      const r = wing(-1);
      return `M${P(p)}${pen.seg(p, q, 0.015)}M${P(l)}L${P([q[0] + pen.j(0.5), q[1] + pen.j(0.5)])}L${P(r)}`;
    }
    case 'poly':
    case 'closed': {
      const pts = a.map((p) => pen.jp(p));
      if (stroke.kind === 'closed') {
        const [p0, p1] = [pts[0], pts[1]];
        const len = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) || 1;
        const over = 2 + pen.r() * 2;
        pts.push([p0[0] + ((p1[0] - p0[0]) / len) * over + pen.j(1), p0[1] + ((p1[1] - p0[1]) / len) * over + pen.j(1)]);
      }
      let out = `M${P(pts[0])}`;
      for (let i = 1; i < pts.length; i++) out += pen.seg(pts[i - 1], pts[i]);
      return out;
    }
    case 'curve':
      return pen.spline(a.map((p) => pen.jp(p, 0.7)));
    case 'ellipse': {
      const [cx, cy, rx, ry, o] = [a, b, c, d, e];
      const partial = !!o.partial;
      const start = o.start ?? 150 + pen.j(10);
      const sweep = o.sweep ?? (o.tight ? 360 : 360 + 14 + pen.j(5));
      const rot = o.rot ?? 0;
      const rmax = Math.max(rx, ry);
      const n = Math.max(partial ? 2 : 6, Math.round((Math.abs(sweep) / 360) * clamp(6 + rmax / 9, 6, 12)));
      const ph1 = pen.r() * 6.28;
      const ph2 = pen.r() * 6.28;
      const amp = o.smooth ? 0.4 : 1;
      const pts = [];
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const ang = start + sweep * t;
        let k = 1 + amp * (0.022 * Math.sin(rad(2 * ang) + ph1) + 0.012 * Math.sin(rad(3 * ang) + ph2));
        if (!partial && !o.tight && t > 0.85) k += ((t - 0.85) / 0.15) * 0.03;
        pts.push(onEllipse(cx, cy, rx * k, ry * k, rot, ang));
      }
      if (o.tight && !partial) return pen.spline(pts.slice(0, -1), true);
      return pen.spline(pts);
    }
    case 'dash': {
      const n = c || Math.max(2, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 14));
      let out = '';
      for (let i = 0; i < n; i++) {
        const t0 = i / n;
        const t1 = (i + 0.55) / n;
        const p = [a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0];
        const q = [a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1];
        out += `M${P(pen.jp(p, 0.4))}L${P(pen.jp(q, 0.4))}`;
      }
      return out;
    }
    case 'dots':
      return a.map((p) => {
        const q = pen.jp(p, 0.3);
        return `M${P(q)}L${P([q[0] + 0.1, q[1]])}`;
      }).join('');
    case 'zigzag': {
      const [p, q, n, amp, lead] = [a, b, c, d, e];
      const dx = q[0] - p[0];
      const dy = q[1] - p[1];
      const len = Math.hypot(dx, dy);
      const [ux, uy, nx, ny] = [dx / len, dy / len, -dy / len, dx / len];
      const pts = [p, [p[0] + dx * lead, p[1] + dy * lead]];
      const body = len * (1 - 2 * lead);
      for (let i = 0; i < n; i++) {
        const t = len * lead + body * ((i + 0.5) / n);
        const s = i % 2 ? -1 : 1;
        pts.push([p[0] + ux * t + nx * amp * s, p[1] + uy * t + ny * amp * s]);
      }
      pts.push([q[0] - dx * lead, q[1] - dy * lead], q);
      const jp = pts.map((pt) => pen.jp(pt, 0.5));
      return `M${P(jp[0])}` + jp.slice(1).map((pt) => `L${P(pt)}`).join('');
    }
    case 'coil': {
      const [p, q, turns, r] = [a, b, c, d];
      const dx = q[0] - p[0];
      const dy = q[1] - p[1];
      const len = Math.hypot(dx, dy);
      const [ux, uy, nx, ny] = [dx / len, dy / len, -dy / len, dx / len];
      const pitch = len / turns;
      const k = pitch * 0.35;
      const per = 6;
      const pts = [];
      for (let i = 0; i <= turns * per; i++) {
        const phi = (i / per) * 2 * Math.PI;
        const along = (pitch * phi) / (2 * Math.PI) + k * (1 - Math.cos(phi));
        const across = r * Math.sin(phi);
        pts.push(pen.jp([p[0] + ux * along + nx * across, p[1] + uy * along + ny * across], 0.5));
      }
      return pen.spline(pts);
    }
    case 'wave': {
      const [x0, y0, x1, amp, cycles, phase] = [a, b, c, d, e, f];
      const n = Math.max(4, Math.round(cycles * 8));
      const pts = [];
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        pts.push(pen.jp([x0 + (x1 - x0) * t, y0 - amp * Math.sin(2 * Math.PI * cycles * t + rad(phase))], 0.5));
      }
      return pen.spline(pts);
    }
    case 'plot': {
      const [fn, t0, t1, n] = [a, b, c, d];
      const pts = [];
      for (let i = 0; i <= n; i++) pts.push(pen.jp(fn(t0 + ((t1 - t0) * i) / n), 0.5));
      return pen.spline(pts);
    }
    case 'hatch': {
      const [p, q, n, len, angle] = [a, b, c, d, e];
      const dir = Math.atan2(-(q[1] - p[1]), q[0] - p[0]);
      const ang = dir + rad(angle);
      let out = '';
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        const s = pen.jp([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t], 0.4);
        out += `M${P(s)}L${P([s[0] + len * Math.cos(ang) + pen.j(0.8), s[1] - len * Math.sin(ang) + pen.j(0.8)])}`;
      }
      return out;
    }
    case 'group':
      return a.map((s) => render(s, pen)).join('');
    default:
      throw new Error(`unknown stroke kind ${stroke.kind}`);
  }
}

const HEAD = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">';

function toSvg(asset) {
  if (asset.strokes.length > MAX_PATHS) throw new Error(`${asset.name}: ${asset.strokes.length} strokes (max ${MAX_PATHS})`);
  const paths = asset.strokes.map((s, i) => {
    const pen = new Pen(mulberry32(hash(`${asset.name}:${i}`)), asset.wobble ?? 1);
    return `<path d="${render(s, pen)}"/>`;
  });
  return `${HEAD}\n${paths.join('\n')}\n</svg>\n`;
}

function build(specDir, outDir) {
  const files = fs.readdirSync(specDir).filter((f) => f.endsWith('.js')).sort();
  const all = [];
  for (const f of files) {
    const list = require(path.join(specDir, f));
    for (const a of list) all.push(a);
  }
  const seen = new Set();
  for (const a of all) {
    if (seen.has(a.name)) throw new Error(`duplicate asset ${a.name}`);
    seen.add(a.name);
  }
  fs.mkdirSync(outDir, { recursive: true });
  for (const f of fs.readdirSync(outDir)) if (f.endsWith('.svg') && !seen.has(f.slice(0, -4))) fs.unlinkSync(path.join(outDir, f));
  const index = [];
  const sizes = [];
  for (const a of all) {
    const svg = toSvg(a);
    fs.writeFileSync(path.join(outDir, `${a.name}.svg`), svg);
    sizes.push([a.name, Buffer.byteLength(svg)]);
    index.push({ name: a.name, subject: a.subject, tags: a.tags, desc: a.desc, anchors: a.anchors });
  }
  fs.writeFileSync(path.join(outDir, 'index.json'), `[\n${index.map((e) => `  ${JSON.stringify(e)}`).join(',\n')}\n]\n`);
  return { count: all.length, sizes };
}

module.exports = { line, arrow, poly, closed, rect, curve, ellipse, circle, arc, earc, dash, dots, zigzag, coil, wave, plot, hatch, group, toSvg, build };

if (require.main === module) {
  // node tools/draw.js                          build every spec into library/assets
  // node tools/draw.js --only <spec.js> --out <dir>   build one spec file somewhere else (for previews)
  const arg = (k) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : null);
  const only = arg('--only');
  let specDir = path.join(__dirname, 'specs');
  if (only) {
    const tmp = fs.mkdtempSync(path.join(require('os').tmpdir(), 'nibley-spec-'));
    const src = path.resolve(only);
    fs.writeFileSync(path.join(tmp, path.basename(src)), `module.exports = require(${JSON.stringify(src)});\n`);
    specDir = tmp;
  }
  const { count, sizes } = build(specDir, arg('--out') ? path.resolve(arg('--out')) : path.join(__dirname, '..', 'assets'));
  const big = sizes.filter(([, b]) => b > 3500);
  console.log(`built ${count} assets${big.length ? `; near the 4 KB limit: ${big.map(([n, b]) => `${n} (${b} B)`).join(', ')}` : ''}`);
}
