const { line, arrow, poly, circle, arc, dash, dots, plot, wave, group } = require('../draw');

const r1 = (n) => Math.round(n * 10) / 10;
const pt = (x, y) => [r1(x), r1(y)];

// ---- cubic: x-axis through the middle, roots at 60, 100, 140
const cubF = (x) => ((x - 60) * (x - 100) * (x - 140));
const cubY = (x) => 100 - (50 / 57408) * cubF(x);
const dd = Math.sqrt(1600 / 3);
const cubMaxX = 100 - dd;
const cubMinX = 100 + dd;

// ---- exponential
const expY = (x) => 170 - 30 * Math.exp((Math.log(145 / 30) / 140) * (x - 30));

// ---- log
const logPt = (t) => {
  const x = 30 + 10 * Math.pow(14.5, t);
  return [x, 120 - 40 * Math.log((x - 30) / 30)];
};

// ---- hyperbola, centre (100,100), v = 1500/u
const hypU0 = 1500 / 82;
const hypPt = (s) => (t) => {
  const u = hypU0 * Math.pow(85 / hypU0, t);
  return [100 + s * u, 100 - s * (1500 / u)];
};

// ---- bell
const bellY = (x) => 160 - 100 * Math.exp(-((x - 100) ** 2) / (2 * 28 * 28));

// ---- area under curve
const areaY = (x) => 170 - (20 + 0.0045 * (x - 30) ** 2);

// ---- tangent
const tanY = (x) => 160 - 0.012 * (x - 60) ** 2;
const tanSlope = 0.024 * (120 - 60);
const tanLine = (x) => tanY(120) + tanSlope * (120 - x);

// ---- two curves
const upY = (x) => 170 - (110 - 0.016 * (x - 100) ** 2);
const loY = (x) => 170 - (20 + 0.016 * (x - 100) ** 2);
const crossD = Math.sqrt(90 / 0.032);

// ---- unit circle
const ang = (40 * Math.PI) / 180;
const ucP = [100 + 60 * Math.cos(ang), 100 - 60 * Math.sin(ang)];
const a20 = (20 * Math.PI) / 180;

module.exports = [
  {
    name: 'graph-cubic',
    subject: 'maths',
    tags: ['graph', 'cubic', 'polynomial', 'roots', 'turning points'],
    desc: 'axes with an S-shaped cubic curve crossing the x-axis three times',
    anchors: {
      origin: [30, 100],
      'root-1': [60, 100],
      'root-2': [100, 100],
      'root-3': [140, 100],
      'local-max': pt(cubMaxX, cubY(cubMaxX)),
      'local-min': pt(cubMinX, cubY(cubMinX)),
    },
    strokes: [arrow(22, 100, 186, 100), arrow(30, 186, 30, 14), plot((x) => [x, cubY(x)], 48, 152, 16)],
  },
  {
    name: 'graph-sine',
    subject: 'maths',
    tags: ['graph', 'sine', 'trigonometry', 'wave', 'period', 'periodic'],
    desc: 'axes with a sine curve of one and a half cycles starting at the origin',
    anchors: {
      origin: [30, 100],
      peak: pt(30 + 140 / 6, 60),
      trough: pt(30 + 140 / 2, 140),
      crossing: pt(30 + 140 / 3, 100),
      'period-end': pt(30 + 140 / 1.5, 100),
    },
    strokes: [arrow(22, 100, 186, 100), arrow(30, 186, 30, 14), wave(30, 100, 170, 40, 1.5)],
  },
  {
    name: 'graph-exponential',
    subject: 'maths',
    tags: ['graph', 'exponential', 'growth', 'curve', 'e'],
    desc: 'axes with a rising exponential curve, flat on the left and steep on the right',
    anchors: {
      origin: [30, 170],
      'y-intercept': [30, 140],
      'curve-left': pt(60, expY(60)),
      'curve-end': pt(170, expY(170)),
    },
    strokes: [arrow(22, 170, 186, 170), arrow(30, 178, 30, 14), plot((x) => [x, expY(x)], 30, 170, 14)],
  },
  {
    name: 'graph-log',
    subject: 'maths',
    tags: ['graph', 'logarithm', 'log', 'curve', 'inverse'],
    desc: 'axes with a log curve rising steeply from the y-axis, crossing the x-axis, then flattening',
    anchors: {
      origin: [30, 120],
      'x-intercept': [60, 120],
      'curve-start': pt(...logPt(0)),
      'curve-end': pt(...logPt(1)),
    },
    strokes: [arrow(22, 120, 186, 120), arrow(30, 186, 30, 14), plot(logPt, 0, 1, 14)],
  },
  {
    name: 'graph-hyperbola',
    subject: 'maths',
    tags: ['graph', 'hyperbola', 'reciprocal', '1/x', 'asymptote'],
    desc: 'axes crossing at the centre with the two branches of y = 1/x, not touching the axes',
    anchors: {
      origin: [100, 100],
      'branch-top': pt(100 + Math.sqrt(1500), 100 - Math.sqrt(1500)),
      'branch-bottom': pt(100 - Math.sqrt(1500), 100 + Math.sqrt(1500)),
      'top-near-axis': pt(...hypPt(1)(0)),
      'bottom-near-axis': pt(...hypPt(-1)(0)),
    },
    strokes: [arrow(12, 100, 188, 100), arrow(100, 188, 100, 12), plot(hypPt(1), 0, 1, 10), plot(hypPt(-1), 0, 1, 10)],
  },
  {
    name: 'graph-abs',
    subject: 'maths',
    tags: ['graph', 'absolute value', 'modulus', 'v-shape', 'vertex'],
    desc: 'axes with a V-shaped graph whose point sits on the x-axis',
    anchors: { origin: [60, 150], vertex: [110, 150], 'arm-left': [50, 60], 'arm-right': [170, 60] },
    strokes: [arrow(22, 150, 186, 150), arrow(60, 178, 60, 14), poly([[50, 60], [110, 150], [170, 60]])],
  },
  {
    name: 'graph-bell',
    subject: 'maths',
    tags: ['graph', 'normal distribution', 'bell curve', 'statistics', 'standard deviation', 'mean'],
    desc: 'bell curve over an x-axis with a dashed line at the mean and one spread either side',
    anchors: {
      peak: [100, 60],
      mean: [100, 160],
      'tail-left': pt(35, bellY(35)),
      'tail-right': pt(165, bellY(165)),
      'sd-left': pt(72, bellY(72)),
      'sd-right': pt(128, bellY(128)),
    },
    strokes: [
      arrow(14, 160, 186, 160),
      plot((x) => [x, bellY(x)], 28, 172, 16),
      dash(100, 60, 100, 160, 5),
      group(dash(72, bellY(72), 72, 160, 3), dash(128, bellY(128), 128, 160, 3)),
    ],
  },
  {
    name: 'graph-area',
    subject: 'maths',
    tags: ['graph', 'integral', 'area under curve', 'calculus', 'hatching'],
    desc: 'axes with a rising curve and hatching under it between two dashed vertical lines',
    anchors: {
      origin: [30, 170],
      a: [70, 170],
      b: [140, 170],
      'curve-top': pt(140, areaY(140)),
      'area-mid': pt(105, (170 + areaY(105)) / 2),
    },
    strokes: [
      arrow(22, 170, 186, 170),
      arrow(30, 178, 30, 14),
      plot((x) => [x, areaY(x)], 32, 175, 12),
      group(dash(70, 170, 70, areaY(70), 3), dash(140, 170, 140, areaY(140), 4)),
      group(...[80, 90, 100, 110, 120, 130].map((x) => line(x, 170, x, areaY(x)))),
    ],
  },
  {
    name: 'graph-tangent',
    subject: 'maths',
    tags: ['graph', 'tangent', 'gradient', 'derivative', 'calculus'],
    desc: 'axes with a curve bending upward and a straight tangent line touching it at a dot',
    anchors: {
      origin: [30, 170],
      'touch-point': pt(120, tanY(120)),
      'tangent-start': pt(88, tanLine(88)),
      'tangent-end': pt(155, tanLine(155)),
      'curve-end': pt(165, tanY(165)),
    },
    strokes: [
      arrow(22, 170, 186, 170),
      arrow(30, 178, 30, 14),
      plot((x) => [x, tanY(x)], 40, 165, 12),
      line(88, tanLine(88), 155, tanLine(155)),
      dots([[120, tanY(120)]]),
    ],
  },
  {
    name: 'graph-hole',
    subject: 'maths',
    tags: ['graph', 'hole', 'discontinuity', 'limit', 'open circle'],
    desc: 'axes with a smooth curve that has a small open circle gap in it',
    anchors: {
      origin: [30, 170],
      hole: pt(105, tanY2(105)),
      'curve-start': pt(35, tanY2(35)),
      'curve-end': pt(175, tanY2(175)),
    },
    strokes: [
      arrow(22, 170, 186, 170),
      arrow(30, 178, 30, 14),
      plot((x) => [x, tanY2(x)], 35, 98, 6),
      plot((x) => [x, tanY2(x)], 112, 175, 6),
      circle(105, tanY2(105), 5, { smooth: true }),
    ],
  },
  {
    name: 'graph-two-curves',
    subject: 'maths',
    tags: ['graph', 'area between curves', 'integral', 'intersection', 'hatching'],
    desc: 'axes with an upper and a lower curve crossing twice, hatched between them',
    anchors: {
      origin: [30, 170],
      'cross-left': pt(100 - crossD, upY(100 - crossD)),
      'cross-right': pt(100 + crossD, upY(100 + crossD)),
      'top-mid': pt(100, upY(100)),
      'bottom-mid': pt(100, loY(100)),
      'area-mid': pt(100, (upY(100) + loY(100)) / 2),
    },
    strokes: [
      arrow(22, 170, 186, 170),
      arrow(30, 178, 30, 14),
      plot((x) => [x, upY(x)], 38, 162, 10),
      plot((x) => [x, loY(x)], 38, 162, 10),
      group(...[60, 70, 80, 90, 100, 110, 120, 130, 140].map((x) => line(x, upY(x), x, loY(x)))),
    ],
  },
  {
    name: 'unit-circle',
    subject: 'maths',
    tags: ['unit circle', 'trigonometry', 'sine', 'cosine', 'angle', 'radius'],
    desc: 'axes with a circle at the centre, a radius at about 40 degrees, a dashed drop to the x-axis and an angle arc',
    anchors: {
      center: [100, 100],
      point: pt(...ucP),
      foot: pt(ucP[0], 100),
      angle: pt(100 + 18 * Math.cos(a20), 100 - 18 * Math.sin(a20)),
      top: [100, 40],
      right: [160, 100],
    },
    strokes: [
      arrow(12, 100, 188, 100),
      arrow(100, 188, 100, 12),
      circle(100, 100, 60),
      line(100, 100, ucP[0], ucP[1]),
      dash(ucP[0], ucP[1], ucP[0], 100, 3),
      arc(100, 100, 18, 0, 40),
    ],
  },
];

function tanY2(x) {
  return 170 - (25 + 0.0045 * (x - 30) ** 2);
}
