const { line, arrow, poly, closed, rect, curve, circle, arc, dash, dots, wave, hatch, group } = require('../draw');

const rad = (d) => (d * Math.PI) / 180;
const pt = (cx, cy, r, a) => [cx + r * Math.cos(rad(a)), cy - r * Math.sin(rad(a))];

const fdots = (ps) => group(...ps.map((p) => circle(p[0], p[1], 3.5, { smooth: true })));

// concave mirror: arc centred on C, opening to the right
const mCx = 150, mCy = 100, mR = 100;
const mirrorTicks = [];
for (let a = 152; a <= 208; a += 11.2) {
  const [x, y] = pt(mCx, mCy, mR, a);
  mirrorTicks.push(line(x, y, x - 8, y + 6));
}

// biconcave sides
const cc = (s) => curve([[100 + s * 15, 40], [100 + s * 7, 70], [100 + s * 4, 100], [100 + s * 7, 130], [100 + s * 15, 160]]);
const cv = (s) => curve([[100, 40], [100 + s * 11, 70], [100 + s * 15, 100], [100 + s * 11, 130], [100, 160]]);

// atom
const el = (r, a) => pt(100, 100, r, a);
const e1 = el(28, 40), e2 = el(52, 200), e3 = el(78, 300);

// nucleus cluster
const nR = 16, nD = 32;
const ncs = [[100, 100], ...[0, 60, 120, 180, 240, 300].map((a) => pt(100, 100, nD, a))];
const plus = (c) => group(line(c[0] - 5, c[1], c[0] + 5, c[1]), line(c[0], c[1] - 5, c[0], c[1] + 5));
const protons = [pt(100, 100, nD, 0), pt(100, 100, nD, 120), pt(100, 100, nD, 240)];

module.exports = [
  {
    name: 'reflection',
    subject: 'physics',
    tags: ['mirror', 'reflection', 'ray', 'light', 'angle'],
    desc: 'light ray hitting a flat mirror and bouncing off at the same angle, with a dashed normal',
    anchors: { 'hit-point': [100, 140], 'normal-end': [100, 40], 'ray-in-start': [40, 50], 'ray-out-end': [160, 50], 'angle-in': [91, 111], 'angle-out': [109, 111] },
    strokes: [
      group(line(20, 140, 180, 140), hatch(25, 140, 175, 140, 10, 9, -135)),
      dash(100, 140, 100, 40, 6),
      arrow(40, 50, 100, 140),
      arrow(100, 140, 160, 50),
      group(arc(100, 140, 30, 90, 123.7), arc(100, 140, 30, 56.3, 90)),
    ],
  },
  {
    name: 'mirror-concave',
    subject: 'physics',
    tags: ['mirror', 'concave', 'focus', 'curved', 'optics'],
    desc: 'curved concave mirror with hatching behind, dashed principal axis, focus and centre of curvature dots',
    anchors: { pole: [50, 100], focus: [100, 100], 'center-of-curvature': [150, 100], 'axis-left': [15, 100], 'mirror-top': pt(mCx, mCy, mR, 150) },
    strokes: [
      arc(mCx, mCy, mR, 150, 210),
      group(...mirrorTicks),
      dash(15, 100, 188, 100, 12),
      fdots([[100, 100], [150, 100]]),
    ],
  },
  {
    name: 'refraction',
    subject: 'physics',
    tags: ['refraction', 'glass', 'ray', 'light', 'normal', 'snell'],
    desc: 'light ray entering glass from air and bending toward the dashed normal',
    anchors: { 'hit-point': [100, 100], 'ray-in-start': [45, 40], 'ray-out-end': [135, 170], 'normal-top': [100, 30], 'normal-bottom': [100, 170], 'angle-in': [90, 74], 'angle-out': [107, 127] },
    strokes: [
      rect(15, 100, 170, 80),
      dash(100, 30, 100, 170, 10),
      arrow(45, 40, 100, 100),
      arrow(100, 100, 135, 170),
      group(arc(100, 100, 28, 90, 132.5), arc(100, 100, 28, -90, -63.4)),
    ],
  },
  {
    name: 'tir',
    subject: 'physics',
    tags: ['total internal reflection', 'glass', 'semicircle', 'ray', 'critical angle'],
    desc: 'ray going into a semicircular glass block and reflecting back off the flat side',
    anchors: { 'hit-point': [140, 100], 'ray-in-start': [85.4, 34.9], 'ray-out-end': [85.4, 165.1], 'block-center': [110, 100] },
    strokes: [
      group(arc(140, 100, 70, 90, 270), line(140, 30, 140, 170)),
      dash(140, 100, 70, 100, 5),
      arrow(85.4, 34.9, 140, 100),
      arrow(140, 100, 85.4, 165.1),
    ],
  },
  {
    name: 'lens-convex',
    subject: 'physics',
    tags: ['lens', 'convex', 'converging', 'focus', 'optics'],
    desc: 'fat-in-the-middle convex lens on a dashed axis with a focus dot on each side',
    anchors: { center: [100, 100], 'focus-left': [45, 100], 'focus-right': [155, 100], top: [100, 40], bottom: [100, 160] },
    strokes: [group(cv(1), cv(-1)), dash(15, 100, 188, 100, 12), fdots([[45, 100], [155, 100]])],
  },
  {
    name: 'lens-concave',
    subject: 'physics',
    tags: ['lens', 'concave', 'diverging', 'focus', 'optics'],
    desc: 'thin-in-the-middle concave lens on a dashed axis with a focus dot on each side',
    anchors: { center: [100, 100], 'focus-left': [45, 100], 'focus-right': [155, 100], top: [100, 40], bottom: [100, 160] },
    strokes: [group(cc(1), cc(-1), line(85, 40, 115, 40), line(85, 160, 115, 160)), dash(15, 100, 188, 100, 12), fdots([[45, 100], [155, 100]])],
  },
  {
    name: 'double-slit',
    subject: 'physics',
    tags: ['double slit', 'interference', 'young', 'wave', 'fringes', 'light'],
    desc: 'light source, a barrier with two small gaps, and a screen with five bright fringe marks',
    anchors: { source: [25, 100], 'slit-top': [80, 85], 'slit-bottom': [80, 115], 'screen-center': [170, 100], 'barrier-top': [80, 30], 'fringe-1': [177, 50] },
    strokes: [
      circle(25, 100, 5, { smooth: true }),
      group(line(80, 30, 80, 80), line(80, 90, 80, 110), line(80, 120, 80, 170)),
      line(170, 25, 170, 175),
      group(line(30, 100, 80, 85), line(30, 100, 80, 115), line(80, 85, 170, 100), line(80, 115, 170, 100)),
      group(line(170, 50, 184, 50), line(170, 75, 184, 75), line(170, 100, 184, 100), line(170, 125, 184, 125), line(170, 150, 184, 150)),
    ],
  },
  {
    name: 'single-slit',
    subject: 'physics',
    tags: ['single slit', 'diffraction', 'wavefront', 'wave', 'barrier'],
    desc: 'straight wavefronts hitting a barrier with one gap and spreading out as curved arcs',
    anchors: { gap: [110, 100], 'waves-in': [68, 100], 'waves-out': [155, 100], 'barrier-top': [110, 25] },
    strokes: [
      group(line(110, 25, 110, 85), line(110, 115, 110, 175)),
      group(line(28, 35, 28, 165), line(48, 35, 48, 165), line(68, 35, 68, 165), line(88, 35, 88, 165)),
      group(arc(110, 100, 25, -55, 55), arc(110, 100, 45, -55, 55), arc(110, 100, 65, -55, 55)),
    ],
  },
  {
    name: 'polariser',
    subject: 'physics',
    tags: ['polariser', 'polarisation', 'filter', 'wave', 'light'],
    desc: 'unpolarised light (vibrations in many directions) goes into a slotted filter and comes out as a single-plane wave',
    anchors: { filter: [100, 100], 'wave-in': [40, 100], 'wave-out': [164, 100], slits: [87, 100] },
    strokes: [
      group(line(20, 100, 60, 100), line(40, 80, 40, 120), line(26, 86, 54, 114), line(26, 114, 54, 86)),
      rect(75, 50, 50, 100),
      group(line(87, 58, 87, 142), line(100, 58, 100, 142), line(113, 58, 113, 142)),
      wave(138, 100, 188, 10, 2),
    ],
  },
  {
    name: 'photon',
    subject: 'physics',
    tags: ['photon', 'light', 'wave', 'quantum', 'particle'],
    desc: 'a wavy arrow of about three cycles, standing for a photon of light',
    anchors: { start: [15, 100], head: [186, 100], mid: [87.5, 100] },
    strokes: [group(wave(15, 100, 165, 14, 3), arrow(160, 100, 186, 100, 13))],
  },
  {
    name: 'atom',
    subject: 'physics',
    tags: ['atom', 'electron', 'orbit', 'nucleus', 'bohr'],
    desc: 'small nucleus with three circular orbits and one electron dot on each',
    anchors: { nucleus: [100, 100], electron: e1, 'orbit-1': [128, 100], 'orbit-2': [152, 100], 'orbit-3': [178, 100] },
    strokes: [
      circle(100, 100, 9, { smooth: true }),
      circle(100, 100, 28, { tight: true }),
      circle(100, 100, 52, { tight: true }),
      circle(100, 100, 78, { tight: true }),
      group(circle(e1[0], e1[1], 4, { smooth: true }), circle(e2[0], e2[1], 4, { smooth: true }), circle(e3[0], e3[1], 4, { smooth: true })),
    ],
  },
  {
    name: 'energy-levels',
    subject: 'physics',
    tags: ['energy levels', 'bohr', 'electron', 'transition', 'photon'],
    desc: 'four horizontal energy levels closing in toward the top, with an arrow jumping down from level 3 to level 1',
    anchors: { 'level-1': [45, 160], 'level-2': [45, 110], 'level-3': [45, 75], 'level-4': [45, 52], jump: [100, 117.5] },
    strokes: [line(40, 160, 160, 160), line(40, 110, 160, 110), line(40, 75, 160, 75), line(40, 52, 160, 52), arrow(100, 75, 100, 160)],
  },
  {
    name: 'nucleus',
    subject: 'physics',
    tags: ['nucleus', 'proton', 'neutron', 'atom', 'nuclear'],
    desc: 'cluster of seven touching circles; the three with plus marks are protons, the rest neutrons',
    anchors: { center: [100, 100], proton: protons[0], neutron: pt(100, 100, nD, 60), edge: [148, 100] },
    strokes: [group(...ncs.map((c) => circle(c[0], c[1], nR, { smooth: true }))), group(...protons.map(plus))],
  },
];
