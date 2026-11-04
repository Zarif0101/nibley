const { line, arrow, poly, closed, rect, curve, circle, arc, dash, dots, coil, wave, plot, hatch, group } = require('../draw');

const rad = (d) => (d * Math.PI) / 180;

// pendulum geometry
const PIV = [80, 20];
const ang = 25;
const sx = Math.sin(rad(ang));
const cx = Math.cos(rad(ang));
const at = (L) => [PIV[0] + L * sx, PIV[1] + L * cx];
const bob = at(125);
const bobEdge = at(111);
const strMid = at(55);
const arcMid = [PIV[0] + 45 * Math.cos(rad(-77.5)), PIV[1] - 45 * Math.sin(rad(-77.5))];

// projectile dashed path
const proj = (u) => [30 + 140 * u, 157 - 97 * 4 * u * (1 - u)];
const N = 12;
const pathDashes = [];
for (let i = 0; i < N; i++) {
  const t1 = i === N - 1 ? 1 : (i + 0.6) / N;
  pathDashes.push(plot(proj, i / N, t1, 2));
}

// disc rotation arrow head
const spinR = 75;
const spinEnd = [100 + spinR * Math.cos(rad(140)), 100 - spinR * Math.sin(rad(140))];
const tdir = [-Math.sin(rad(140)), -Math.cos(rad(140))];
const wing = (s) => {
  const a = rad(28 * s);
  const dx = tdir[0] * Math.cos(a) - tdir[1] * Math.sin(a);
  const dy = tdir[0] * Math.sin(a) + tdir[1] * Math.cos(a);
  return [spinEnd[0] - 15 * dx, spinEnd[1] - 15 * dy];
};

const blobs = (pts) => dots(pts.flatMap(([x, y]) => [[x, y], [x + 2.5, y + 0.5], [x + 1, y + 2.5]]));

// orbit
const satA = rad(45);
const sat = [100 + 70 * Math.cos(satA), 100 - 70 * Math.sin(satA)];

// longitudinal wave
const longLines = [];
for (let x0 = 25; x0 <= 175; x0 += 10) {
  const x = x0 + 5.73 * Math.sin((2 * Math.PI * (x0 - 20)) / 80);
  longLines.push(line(x, 72, x, 128));
}

module.exports = [
  {
    name: 'car',
    subject: 'physics',
    tags: ['vehicle', 'motion', 'velocity', 'wheels'],
    desc: 'side view of a car with a cabin bump and two wheels, facing right',
    anchors: { center: [100, 105], front: [182, 118], back: [20, 118], roof: [100, 80], 'wheel-front': [147, 134], 'wheel-back': [55, 134] },
    strokes: [
      closed([[20, 130], [20, 108], [50, 103], [70, 80], [135, 80], [155, 103], [182, 110], [182, 130]]),
      circle(55, 134, 16),
      circle(147, 134, 16),
      dots([[55, 134], [147, 134]]),
    ],
  },
  {
    name: 'ground',
    subject: 'physics',
    tags: ['surface', 'floor', 'horizontal', 'support'],
    desc: 'horizontal ground line with short hatch strokes underneath',
    anchors: { left: [15, 100], right: [185, 100], mid: [100, 100] },
    strokes: [group(line(15, 100, 185, 100), hatch(20, 100, 180, 100, 12, 12, -135))],
  },
  {
    name: 'pendulum',
    subject: 'physics',
    tags: ['swing', 'oscillation', 'period', 'bob', 'string'],
    desc: 'pendulum on a string from the ceiling, swung 25 degrees from the dashed vertical rest line',
    anchors: { pivot: PIV, bob, 'rest-position': [80, 150], angle: arcMid, 'string-mid': strMid },
    strokes: [
      group(line(40, 20, 120, 20), hatch(45, 20, 115, 20, 8, 9, 135)),
      dash(80, 20, 80, 150, 7),
      line(PIV[0], PIV[1], bobEdge[0], bobEdge[1]),
      circle(bob[0], bob[1], 14),
      arc(80, 20, 45, -90, -65),
    ],
  },
  {
    name: 'mass-spring',
    subject: 'physics',
    tags: ['spring', 'oscillation', 'hooke', 'block', 'shm'],
    desc: 'block hanging from a ceiling on a vertical coil spring',
    anchors: { ceiling: [100, 18], 'spring-mid': [100, 64], 'mass-center': [100, 135], 'mass-bottom': [100, 160] },
    strokes: [
      group(line(55, 18, 145, 18), hatch(60, 18, 140, 18, 7, 9, 135)),
      coil(100, 18, 100, 110, 7, 14),
      rect(72, 110, 56, 50),
    ],
  },
  {
    name: 'projectile-path',
    subject: 'physics',
    tags: ['projectile', 'trajectory', 'parabola', 'range', 'launch'],
    desc: 'ball on the ground at left with a dashed parabolic path rising and landing at right',
    anchors: { launch: [30, 157], peak: proj(0.5), landing: [170, 157], 'path-up': proj(0.25), 'path-down': proj(0.75) },
    strokes: [
      group(line(12, 165, 188, 165), hatch(16, 165, 184, 165, 14, 9, -135)),
      circle(30, 157, 8, { smooth: true }),
      group(...pathDashes),
    ],
  },
  {
    name: 'seesaw',
    subject: 'physics',
    tags: ['lever', 'torque', 'moment', 'balance', 'pivot'],
    desc: 'long plank balanced on a triangular pivot in the middle',
    anchors: { pivot: [100, 116], 'left-end': [20, 112], 'right-end': [180, 112], 'plank-mid-left': [60, 112], 'plank-mid-right': [140, 112] },
    strokes: [rect(20, 108, 160, 8), closed([[100, 116], [78, 160], [122, 160]]), line(45, 160, 155, 160)],
  },
  {
    name: 'disc-rotation',
    subject: 'physics',
    tags: ['rotation', 'spin', 'angular', 'disc', 'wheel'],
    desc: 'disc with a centre dot and a curved arrow around part of it showing it spinning',
    anchors: { center: [100, 100], edge: [155, 100], 'arrow-head': [37.6, 64] },
    strokes: [
      circle(100, 100, 55),
      dots([[100, 100]]),
      arc(100, 100, 72, 25, 150),
      poly([[48.6, 57.1], [37.6, 64], [38.1, 51]]),
    ],
  },
  {
    name: 'orbit',
    subject: 'physics',
    tags: ['gravity', 'satellite', 'planet', 'circular motion', 'orbit'],
    desc: 'planet in the centre, a circular orbit path, and a small satellite on the orbit',
    anchors: { planet: [100, 100], satellite: sat, 'orbit-top': [100, 30], 'orbit-right': [170, 100], 'orbit-left': [30, 100] },
    strokes: [circle(100, 100, 18), arc(100, 100, 70, 57, 393), circle(sat[0], sat[1], 9, { smooth: true })],
  },
  {
    name: 'beaker',
    subject: 'physics',
    tags: ['lab', 'liquid', 'container', 'volume', 'chemistry'],
    desc: 'lab beaker with a small spout and the liquid surface two-thirds up',
    anchors: { 'liquid-surface': [100, 73], 'liquid-mid': [100, 117], bottom: [100, 160], 'top-left': [58, 30], 'top-right': [142, 30] },
    strokes: [
      poly([[46, 36], [58, 30], [58, 160], [142, 160], [142, 30]]),
      line(58, 73, 142, 73),
      group(line(142, 50, 130, 50), line(142, 95, 130, 95), line(142, 140, 130, 140)),
    ],
  },
  {
    name: 'thermometer',
    subject: 'physics',
    tags: ['temperature', 'heat', 'measure', 'scale', 'liquid'],
    desc: 'thin tube with a round bulb, liquid level line inside and scale ticks beside it',
    anchors: { bulb: [100, 150], top: [100, 30], level: [100, 75] },
    strokes: [
      poly([[91, 132], [91, 38], [100, 30], [109, 38], [109, 132]]),
      arc(100, 150, 20, 63, -243),
      group(line(100, 150, 100, 75), circle(100, 150, 8, { smooth: true })),
      group(...[45, 60, 75, 90, 105, 120].map((y, i) => line(118, y, i % 2 ? 124 : 130, y))),
    ],
  },
  {
    name: 'burner',
    subject: 'physics',
    tags: ['bunsen', 'heat', 'flame', 'lab', 'heating'],
    desc: 'Bunsen burner tube on a base with a flame on top',
    anchors: { 'flame-tip': [100, 30], 'flame-center': [100, 78], base: [100, 176] },
    strokes: [
      closed([[60, 176], [140, 176], [128, 160], [72, 160]]),
      rect(90, 100, 20, 60),
      curve([[92, 98], [84, 78], [96, 58], [100, 30], [106, 58], [116, 78], [108, 98]]),
      curve([[96, 98], [92, 86], [100, 68], [108, 86], [104, 98]]),
      line(86, 125, 114, 125),
    ],
  },
  {
    name: 'gas-box',
    subject: 'physics',
    tags: ['gas', 'particles', 'kinetic theory', 'pressure', 'molecules'],
    desc: 'closed box with gas particles as dots and short arrows showing their motion',
    anchors: { center: [100, 100], 'wall-left': [25, 100], 'wall-right': [175, 100], top: [100, 35], particle: [70, 120] },
    strokes: [
      rect(25, 35, 150, 130),
      blobs([[45, 55], [70, 120], [95, 60], [120, 140], [140, 70], [155, 120], [60, 150], [110, 100], [85, 90], [150, 150], [125, 48], [40, 105]]),
      group(arrow(45, 55, 66, 70, 8), arrow(140, 70, 118, 82, 8), arrow(120, 140, 100, 128, 8), arrow(155, 120, 140, 103, 8)),
    ],
  },
  {
    name: 'piston',
    subject: 'physics',
    tags: ['gas', 'cylinder', 'pressure', 'volume', 'compression'],
    desc: 'cylinder open at the top with a piston plate and rod, gas dots below the piston',
    anchors: { piston: [100, 78], 'rod-end': [100, 16], gas: [100, 125], 'cylinder-bottom': [100, 165] },
    strokes: [
      poly([[60, 30], [60, 165], [140, 165], [140, 30]]),
      rect(63, 72, 74, 12),
      group(line(100, 72, 100, 16), line(86, 16, 114, 16)),
      blobs([[78, 102], [100, 98], [122, 104], [88, 124], [112, 120], [74, 142], [98, 146], [124, 140], [136, 124]]),
    ],
  },
  {
    name: 'wave-transverse',
    subject: 'physics',
    tags: ['wave', 'sine', 'wavelength', 'amplitude', 'crest'],
    desc: 'dashed rest line with a two-cycle sine wave along it',
    anchors: { crest: [40, 60], trough: [80, 140], 'wavelength-start': [40, 60], 'wavelength-end': [120, 60], 'axis-left': [15, 100], 'axis-right': [185, 100] },
    strokes: [dash(15, 100, 185, 100, 14), wave(20, 100, 180, 40, 2, 0)],
  },
  {
    name: 'wave-longitudinal',
    subject: 'physics',
    tags: ['wave', 'sound', 'compression', 'rarefaction', 'longitudinal'],
    desc: 'row of vertical lines in a band, bunched in compressions and spread in rarefactions',
    anchors: { compression: [60, 100], rarefaction: [100, 100], left: [12, 100], right: [188, 100] },
    strokes: [rect(12, 60, 176, 80), group(...longLines)],
  },
  {
    name: 'standing-wave',
    subject: 'physics',
    tags: ['wave', 'node', 'antinode', 'resonance', 'string'],
    desc: 'two fixed ends with mirrored sine shapes between them making three loops',
    anchors: { 'node-1': [25, 100], 'node-2': [75, 100], 'node-3': [125, 100], 'node-4': [175, 100], 'antinode-1': [50, 62], 'antinode-2': [100, 138], 'antinode-3': [150, 62] },
    strokes: [group(line(25, 80, 25, 120), line(175, 80, 175, 120)), wave(25, 100, 175, 38, 1.5, 0), wave(25, 100, 175, 38, 1.5, 180)],
  },
  {
    name: 'wavefronts',
    subject: 'physics',
    tags: ['doppler', 'wave', 'source', 'frequency', 'sound'],
    desc: 'moving source with four circles whose centres shift left, bunched on the right and spread on the left',
    anchors: { source: [140, 100], 'bunched-side': [170, 100], 'spread-side': [50, 100], direction: [172, 176] },
    strokes: [
      circle(132.5, 100, 15, { tight: true }),
      circle(125, 100, 30, { tight: true }),
      circle(117.5, 100, 45, { tight: true }),
      circle(110, 100, 60, { tight: true }),
      dots([[140, 100]]),
      arrow(128, 176, 172, 176, 10),
    ],
  },
];
