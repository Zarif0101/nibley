const { line, arrow, poly, closed, rect, circle, ellipse, arc, dash, dots, group } = require('../draw');

const pt = (cx, cy, r, a) => [cx + r * Math.cos((a * Math.PI) / 180), cy - r * Math.sin((a * Math.PI) / 180)];
const ang = (dx, dy) => (Math.atan2(-dy, dx) * 180) / Math.PI; // degrees, y-down input
const dd = (pts) => group(...pts.map(([x, y]) => circle(x, y, 3.5, { smooth: true })));
const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

// triangle
const A = [30, 165], B = [170, 150], C = [85, 35];
const aA = [ang(B[0] - A[0], B[1] - A[1]), ang(C[0] - A[0], C[1] - A[1])];
const aB = [ang(C[0] - B[0], C[1] - B[1]), ang(A[0] - B[0], A[1] - B[1]) + 360];
const aC = [ang(A[0] - C[0], A[1] - C[1]) + 360, ang(B[0] - C[0], B[1] - C[1]) + 360];
const triAng = (P, a) => pt(P[0], P[1], 16, (a[0] + a[1]) / 2);

// angle
const V = [30, 150];
const r1 = [175, 150];
const r2 = pt(30, 150, 150, 50);

// vector-add
const aT = [30, 150], aH = [100, 70], bH = [175, 100];

// parallelogram
const pc = [40, 150], pa = [145, 140], pb = [75, 65], pf = [180, 55];

// cuboid
const cubeTopC = [(40 + 80 + 170 + 130) / 4, (80 + 45 + 45 + 80) / 4];

// ellipse
const fc = Math.sqrt(80 * 80 - 45 * 45);

// bars
const bx = [38, 66, 94, 122, 150];
const bh = [50, 85, 65, 115, 95];

// ruler ticks
const ticks = [];
for (let i = 0; i <= 20; i++) ticks.push(line(20 + 8 * i, 80, 20 + 8 * i, 80 + (i % 5 === 0 ? 17 : 9)));

// dice face points
const L = (s, t) => [35 + 65 * s, 62 + 38 * s + 76 * t];
const R = (s, t) => [100 + 65 * s, 100 - 38 * s + 75 * t];

module.exports = [
  {
    name: 'triangle',
    subject: 'maths',
    tags: ['triangle', 'angle', 'geometry', 'scalene', 'shape'],
    desc: 'uneven triangle with a small angle arc at each corner',
    anchors: { 'vertex-a': A, 'vertex-b': B, 'vertex-c': C, 'side-ab-mid': mid(A, B), 'side-bc-mid': mid(B, C), 'side-ca-mid': mid(C, A), 'angle-a': triAng(A, aA), 'angle-b': triAng(B, aB), 'angle-c': triAng(C, aC) },
    strokes: [closed([A, B, C]), group(arc(A[0], A[1], 16, aA[0], aA[1]), arc(B[0], B[1], 16, aB[0], aB[1]), arc(C[0], C[1], 16, aC[0], aC[1]))],
  },
  {
    name: 'angle',
    subject: 'maths',
    tags: ['angle', 'rays', 'vertex', 'geometry'],
    desc: 'two rays from one point with an arc marking the angle between them',
    anchors: { vertex: V, 'ray-1-end': r1, 'ray-2-end': r2, 'arc-mid': pt(30, 150, 40, 25) },
    strokes: [line(V[0], V[1], r1[0], r1[1]), line(V[0], V[1], r2[0], r2[1]), arc(30, 150, 40, 0, 50)],
  },
  {
    name: 'vector-add',
    subject: 'shared',
    tags: ['vector', 'addition', 'resultant', 'head-to-tail'],
    desc: 'two vectors placed head to tail with the resultant from the first tail to the last head',
    anchors: { 'a-tail': aT, 'a-head': aH, 'b-head': bH, 'a-mid': mid(aT, aH), 'b-mid': mid(aH, bH), 'resultant-mid': mid(aT, bH) },
    strokes: [arrow(aT[0], aT[1], aH[0], aH[1]), arrow(aH[0], aH[1], bH[0], bH[1]), arrow(aT[0], aT[1], bH[0], bH[1])],
  },
  {
    name: 'vector-components',
    subject: 'shared',
    tags: ['vector', 'components', 'resolve', 'angle'],
    desc: 'slanted vector with dashed horizontal and vertical components and an angle arc at the tail',
    anchors: { tail: [30, 160], head: [160, 60], 'x-mid': [95, 160], 'y-mid': [160, 110], angle: pt(30, 160, 28, 19) },
    strokes: [arrow(30, 160, 160, 60), dash(30, 160, 160, 160, 8), dash(160, 160, 160, 60, 6), arc(30, 160, 28, 0, 37.6)],
  },
  {
    name: 'parallelogram',
    subject: 'maths',
    tags: ['parallelogram', 'area', 'cross-product', 'vectors'],
    desc: 'slanted parallelogram with two sides drawn as arrows from the same corner',
    anchors: { corner: pc, 'side-a-head': pa, 'side-b-head': pb, 'far-corner': pf, center: mid(pc, pf) },
    strokes: [closed([pc, pa, pf, pb]), arrow(pc[0], pc[1], pa[0], pa[1]), arrow(pc[0], pc[1], pb[0], pb[1])],
  },
  {
    name: 'axes-3d',
    subject: 'maths',
    tags: ['3d', 'axes', 'x-y-z', 'coordinates'],
    desc: 'three axes from one origin: z up, y to the right, x slanting down-left',
    anchors: { origin: [100, 110], 'x-end': [45, 160], 'y-end': [185, 110], 'z-end': [100, 20] },
    strokes: [arrow(100, 110, 100, 20), arrow(100, 110, 185, 110), arrow(100, 110, 45, 160)],
  },
  {
    name: 'plane-3d',
    subject: 'maths',
    tags: ['plane', '3d', 'normal', 'perpendicular'],
    desc: 'flat plane seen in perspective with a normal arrow standing up from its centre',
    anchors: { center: [100, 115], 'normal-head': [100, 30], 'corner-front': [95, 155], 'corner-back': [105, 75], 'corner-left': [20, 115], 'corner-right': [180, 115] },
    strokes: [closed([[95, 155], [180, 115], [105, 75], [20, 115]]), arrow(100, 115, 100, 30)],
  },
  {
    name: 'cuboid',
    subject: 'maths',
    tags: ['cuboid', 'box', '3d', 'volume', 'solid'],
    desc: 'three-dimensional box showing front, top and side faces',
    anchors: { 'front-center': [85, 120], 'top-center': cubeTopC, 'side-center': [150, 102.5], 'length-mid': [85, 160], 'height-mid': [40, 120], 'depth-mid': [150, 62.5] },
    strokes: [rect(40, 80, 90, 80), poly([[40, 80], [80, 45], [170, 45], [170, 125], [130, 160]]), line(130, 80, 170, 45)],
  },
  {
    name: 'ellipse-shape',
    subject: 'maths',
    tags: ['ellipse', 'focus', 'foci', 'conic', 'orbit'],
    desc: 'ellipse with two focus dots and a dashed major axis',
    anchors: { center: [100, 100], 'focus-left': [100 - fc, 100], 'focus-right': [100 + fc, 100], 'vertex-left': [20, 100], 'vertex-right': [180, 100], top: [100, 55] },
    strokes: [ellipse(100, 100, 80, 45), dash(20, 100, 180, 100, 10), dd([[100 - fc, 100], [100 + fc, 100]])],
  },
  {
    name: 'venn-two',
    subject: 'maths',
    tags: ['venn', 'sets', 'overlap', 'probability'],
    desc: 'rectangle frame with two overlapping circles',
    anchors: { 'set-a': [55, 100], 'set-b': [145, 100], overlap: [100, 100], outside: [28, 52] },
    strokes: [rect(15, 40, 170, 120), circle(75, 100, 42), circle(125, 100, 42)],
  },
  {
    name: 'fraction-pie',
    subject: 'maths',
    tags: ['fraction', 'pie', 'circle', 'quarter'],
    desc: 'circle cut into four equal slices with one slice hatched',
    anchors: { center: [100, 100], 'slice-shaded': [128, 72], 'slice-2': [75, 75], 'slice-3': [75, 125], 'slice-4': [125, 125] },
    strokes: [
      circle(100, 100, 70),
      group(line(30, 100, 170, 100), line(100, 30, 100, 170)),
      group(...[12, 24, 36, 48, 60].map((t) => line(100 + t, 100, 100, 100 - t))),
    ],
  },
  {
    name: 'bar-chart',
    subject: 'maths',
    tags: ['bar', 'chart', 'data', 'statistics', 'graph'],
    desc: 'axes with five bars of different heights',
    anchors: { origin: [25, 170], 'bar-1': [bx[0] + 11, 170 - bh[0]], 'bar-2': [bx[1] + 11, 170 - bh[1]], 'bar-3': [bx[2] + 11, 170 - bh[2]], 'bar-4': [bx[3] + 11, 170 - bh[3]], 'bar-5': [bx[4] + 11, 170 - bh[4]] },
    strokes: [arrow(25, 170, 185, 170), arrow(25, 170, 25, 15), group(...bx.map((x, i) => rect(x, 170 - bh[i], 22, bh[i])))],
  },
  {
    name: 'dice',
    subject: 'maths',
    tags: ['dice', 'die', 'cube', 'probability', 'random'],
    desc: 'die drawn as a cube with dots on the three visible faces',
    anchors: { center: [100, 100], 'top-face': [100, 62], 'front-face': L(0.5, 0.5), 'side-face': R(0.5, 0.5) },
    strokes: [
      closed([[100, 25], [165, 62], [165, 138], [100, 175], [35, 138], [35, 62]]),
      group(poly([[35, 62], [100, 100], [165, 62]]), line(100, 100, 100, 175)),
      dd([[100, 62], L(0.25, 0.25), L(0.5, 0.5), L(0.75, 0.75), R(0.3, 0.3), R(0.7, 0.7)]),
    ],
  },
  {
    name: 'tree-diagram',
    subject: 'maths',
    tags: ['tree', 'probability', 'branches', 'outcomes'],
    desc: 'probability tree with two branches, each splitting into two more, dots at the ends',
    anchors: { start: [20, 100], 'branch-a': [80, 55], 'branch-b': [80, 145], 'end-aa': [160, 30], 'end-ab': [160, 80], 'end-ba': [160, 120], 'end-bb': [160, 170], 'mid-a': [50, 77.5], 'mid-b': [50, 122.5] },
    strokes: [
      line(20, 100, 80, 55),
      line(20, 100, 80, 145),
      group(line(80, 55, 160, 30), line(80, 55, 160, 80), line(80, 145, 160, 120), line(80, 145, 160, 170)),
      dd([[20, 100], [160, 30], [160, 80], [160, 120], [160, 170]]),
    ],
  },
  {
    name: 'matrix-brackets',
    subject: 'maths',
    tags: ['matrix', 'brackets', 'linear-algebra', 'entries'],
    desc: 'tall square brackets with a two by two pattern of dashes for the entries',
    anchors: { 'entry-11': [75, 70], 'entry-12': [125, 70], 'entry-21': [75, 130], 'entry-22': [125, 130], 'left-bracket': [30, 100], 'right-bracket': [170, 100] },
    strokes: [
      poly([[45, 30], [30, 30], [30, 170], [45, 170]]),
      poly([[155, 30], [170, 30], [170, 170], [155, 170]]),
      group(line(65, 70, 85, 70), line(115, 70, 135, 70), line(65, 130, 85, 130), line(115, 130, 135, 130)),
    ],
  },
  {
    name: 'staircase',
    subject: 'maths',
    tags: ['steps', 'sequence', 'arithmetic', 'stairs'],
    desc: 'five equal steps rising left to right on a ground line',
    anchors: { 'step-1': [44, 146], 'step-2': [72, 122], 'step-3': [100, 98], 'step-4': [128, 74], 'step-5': [156, 50], 'bottom-left': [30, 170] },
    strokes: [
      poly([[30, 170], [30, 146], [58, 146], [58, 122], [86, 122], [86, 98], [114, 98], [114, 74], [142, 74], [142, 50], [170, 50], [170, 170]]),
      line(20, 170, 180, 170),
    ],
  },
  {
    name: 'scale-balance',
    subject: 'shared',
    tags: ['balance', 'scale', 'equation', 'mass', 'weigh'],
    desc: 'balance with a stand, level beam and two hanging pans',
    anchors: { pivot: [100, 45], 'left-pan': [35, 125], 'right-pan': [165, 125], 'beam-left': [35, 45], 'beam-right': [165, 45] },
    strokes: [
      line(70, 175, 130, 175),
      line(100, 175, 100, 45),
      line(35, 45, 165, 45),
      group(poly([[15, 105], [35, 45], [55, 105]]), arc(35, 105, 20, 180, 360)),
      group(poly([[145, 105], [165, 45], [185, 105]]), arc(165, 105, 20, 180, 360)),
    ],
  },
  {
    name: 'ruler',
    subject: 'shared',
    tags: ['ruler', 'measure', 'length', 'ticks'],
    desc: 'long thin ruler with evenly spaced ticks, every fifth one longer',
    anchors: { start: [20, 80], end: [180, 80], mid: [100, 98], 'top-edge': [60, 80] },
    strokes: [rect(15, 80, 170, 36), group(...ticks)],
  },
];
