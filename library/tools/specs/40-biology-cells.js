const { line, poly, closed, rect, curve, circle, ellipse, earc, dots, wave, plot, group } = require('../draw');

const r1 = (n) => Math.round(n * 10) / 10;

// rounded sausage (stadium) outline around the segment p-q, radius r, as a looping point list
function sausage(px, py, qx, qy, r) {
  const len = Math.hypot(qx - px, qy - py);
  const d = [(qx - px) / len, (qy - py) / len];
  const n = [-d[1], d[0]];
  const at = (p, a, b) => [p[0] + n[0] * a * r + d[0] * b * r, p[1] + n[1] * a * r + d[1] * b * r];
  const P = [px, py];
  const Q = [qx, qy];
  const M = [(px + qx) / 2, (py + qy) / 2];
  const k = Math.SQRT1_2;
  const pts = [at(P, 1, 0), at(M, 1, 0), at(Q, 1, 0), at(Q, k, k), at(Q, 0, 1), at(Q, -k, k), at(Q, -1, 0), at(M, -1, 0), at(P, -1, 0), at(P, -k, -k), at(P, 0, -1), at(P, k, -k)];
  pts.push(pts[0]);
  return pts;
}

// antibody geometry
const ab = (() => {
  const d = [-48 / 84.9, -70 / 84.9];
  const nn = [0.824, -0.565];
  const J = [100, 110];
  const L = 85;
  const tip = [J[0] + d[0] * L, J[1] + d[1] * L];
  const cupAng = Math.atan2(-d[1], d[0]) * 180 / Math.PI; // outward, maths angle
  return { d, nn, J, tip, cupAng, L };
})();
const cupL = (() => {
  const c = [ab.tip[0] + ab.d[0] * 5, ab.tip[1] + ab.d[1] * 5];
  return { c, a0: ab.cupAng + 180 - 78, a1: ab.cupAng + 180 + 78 };
})();

// dna helix
const helX = (u, s) => 100 + s * 32 * Math.sin(4 * Math.PI * u);
const helY = (u) => 15 + 170 * u;
const rungs = [];
for (let k = 0; k < 16; k++) {
  const u = (k + 0.5) / 16;
  rungs.push(line(helX(u, 1), helY(u), helX(u, -1), helY(u)));
}

// membrane
const headsTop = [];
const headsBot = [];
const tails = [];
const blob = (x, y) => [[x, y], [x - 1.7, y], [x + 1.7, y], [x, y - 1.7], [x, y + 1.7]];
[24, 40, 56, 72, 128, 144, 160, 176].forEach((x) => {
  headsTop.push(...blob(x, 52));
  headsBot.push(...blob(x, 148));
  [-2.8, 2.8].forEach((o) => {
    tails.push(line(x + o, 58, x + o, 88));
    tails.push(line(x + o, 142, x + o, 112));
  });
});

module.exports = [
  {
    name: 'cell-animal',
    subject: 'biology',
    tags: ['cell', 'animal', 'nucleus', 'mitochondria', 'organelles'],
    desc: 'animal cell with a nucleus, two mitochondria and ribosome dots inside a rounded membrane',
    anchors: { membrane: [100, 24], nucleus: [92, 68], mitochondrion: [156, 119], cytoplasm: [140, 90] },
    strokes: [
      curve([[100, 24], [150, 34], [178, 80], [170, 135], [135, 175], [85, 172], [40, 150], [24, 100], [40, 52], [70, 30], [100, 24]]),
      circle(92, 92, 24),
      circle(98, 88, 6, { smooth: true }),
      ellipse(140, 125, 16, 8, { rot: 30 }),
      ellipse(58, 138, 15, 7, { rot: -20 }),
      dots([[125, 62], [140, 70], [132, 80], [60, 62], [70, 150], [105, 148], [118, 150]]),
    ],
  },
  {
    name: 'cell-plant',
    subject: 'biology',
    tags: ['cell', 'plant', 'cell wall', 'vacuole', 'chloroplast'],
    desc: 'plant cell with a thick wall, membrane, big central vacuole, nucleus and three chloroplasts',
    anchors: { 'cell-wall': [100, 40], membrane: [100, 46], vacuole: [118, 100], nucleus: [47, 98], chloroplast: [120, 57] },
    strokes: [
      rect(20, 40, 160, 120),
      rect(27, 46, 146, 108),
      ellipse(120, 100, 48, 32),
      circle(47, 98, 13),
      group(ellipse(120, 57, 10, 5, { smooth: true }), ellipse(120, 143, 10, 5, { smooth: true }), ellipse(47, 135, 10, 5, { smooth: true })),
    ],
  },
  {
    name: 'bacterium',
    subject: 'biology',
    tags: ['bacteria', 'prokaryote', 'flagellum', 'plasmid', 'dna'],
    desc: 'capsule-shaped bacterium with a loose loop of DNA, a plasmid ring and a wavy flagellum, no nucleus',
    anchors: { 'cell-wall': [85, 70], dna: [85, 92], plasmid: [120, 100], flagellum: [188, 100] },
    strokes: [
      curve([[55, 70], [85, 70], [115, 70], [138, 77], [145, 100], [138, 123], [115, 130], [85, 130], [55, 130], [32, 123], [25, 100], [32, 77], [55, 70]]),
      curve([[56, 98], [66, 86], [85, 92], [98, 82], [108, 92], [100, 104], [88, 100], [93, 116], [76, 114], [64, 106], [56, 98]]),
      circle(120, 106, 6, { smooth: true }),
      wave(145, 100, 188, 6, 2),
    ],
  },
  {
    name: 'mitochondrion',
    subject: 'biology',
    tags: ['mitochondria', 'cristae', 'organelle', 'respiration', 'atp'],
    desc: 'oval mitochondrion with a folded inner membrane forming cristae',
    anchors: { 'outer-membrane': [100, 55], cristae: [68, 104], matrix: [112, 85] },
    strokes: [
      ellipse(100, 100, 75, 45, { start: 90 }),
      curve([
        [36, 100], [44, 85], [57, 75], [65, 73], [66, 103], [71, 103], [72, 73],
        [86, 72], [94, 72], [95, 103], [100, 103], [101, 72],
        [118, 72], [125, 73], [126, 103], [131, 103], [132, 73],
        [146, 78], [158, 88], [166, 100],
        [158, 112], [146, 122], [136, 127], [117, 127], [116, 97], [110, 97], [109, 127],
        [88, 127], [87, 97], [81, 97], [80, 127],
        [60, 125], [44, 114], [36, 100],
      ]),
    ],
  },
  {
    name: 'chloroplast',
    subject: 'biology',
    tags: ['chloroplast', 'grana', 'photosynthesis', 'organelle', 'plant'],
    desc: 'oval chloroplast with three stacks of discs (grana) inside',
    anchors: { membrane: [100, 52], grana: [62, 98], stroma: [100, 75] },
    strokes: [
      ellipse(100, 100, 75, 48, { start: 90 }),
      group(
        ...[62, 100, 138].flatMap((x, i) => {
          const y = [98, 104, 98][i];
          return [-8, 0, 8].map((o) => ellipse(x, y + o, 14, 3.5, { smooth: true }));
        }),
      ),
      group(line(76, 98, 86, 104), line(114, 104, 124, 98)),
    ],
  },
  {
    name: 'membrane-bilayer',
    subject: 'biology',
    tags: ['membrane', 'phospholipid', 'bilayer', 'channel', 'protein'],
    desc: 'cell membrane: two rows of phospholipids with tails pointing inward and a protein channel through both',
    anchors: { 'heads-top': [24, 52], 'heads-bottom': [24, 148], tails: [40, 73], channel: [82, 100] },
    strokes: [
      dots(headsTop),
      dots(headsBot),
      group(...tails),
      group(ellipse(90, 100, 8, 52), ellipse(110, 100, 8, 52)),
    ],
  },
  {
    name: 'enzyme-substrate',
    subject: 'biology',
    tags: ['enzyme', 'substrate', 'active site', 'lock and key', 'catalyst'],
    desc: 'big enzyme with a notch on top and a smaller substrate above it that fits the notch',
    anchors: { enzyme: [172, 145], 'active-site': [100, 121], substrate: [100, 52] },
    strokes: [
      curve([[30, 150], [34, 120], [55, 102], [80, 98], [84, 97], [88, 116], [100, 121], [112, 116], [116, 97], [120, 98], [145, 102], [168, 120], [172, 145], [150, 172], [100, 178], [50, 172], [30, 150]]),
      curve([[88, 62], [90, 79], [100, 84], [110, 79], [112, 62], [100, 52], [88, 62]]),
    ],
  },
  {
    name: 'dna-helix',
    subject: 'biology',
    tags: ['dna', 'double helix', 'base pair', 'strand', 'genetics'],
    desc: 'two twisting DNA strands with short rungs for the base pairs',
    anchors: { 'strand-1': [132, 36.3], 'strand-2': [68, 36.3], 'base-pair': [100, 30.9], top: [100, 15], bottom: [100, 185] },
    strokes: [
      plot((u) => [helX(u, 1), helY(u)], 0, 1, 24),
      plot((u) => [helX(u, -1), helY(u)], 0, 1, 24),
      group(...rungs),
    ],
  },
  {
    name: 'chromosome',
    subject: 'biology',
    tags: ['chromosome', 'chromatid', 'centromere', 'mitosis', 'dna'],
    desc: 'X-shaped chromosome made of two sister chromatids joined at the centromere',
    anchors: { centromere: [100, 100], 'arm-top-left': [68, 68], 'arm-top-right': [132, 68], 'arm-bottom-left': [68, 132], 'arm-bottom-right': [132, 132] },
    strokes: [
      curve(sausage(45, 45, 155, 155, 12)),
      curve(sausage(155, 45, 45, 155, 12)),
      circle(100, 100, 5, { smooth: true }),
    ],
  },
  {
    name: 'punnett-square',
    subject: 'biology',
    tags: ['punnett', 'genetics', 'alleles', 'inheritance', 'cross'],
    desc: 'two-by-two grid with an empty header strip above and to the left for the parent alleles',
    anchors: { 'cell-11': [85, 85], 'cell-12': [153, 85], 'cell-21': [85, 153], 'cell-22': [153, 153], 'top-1': [85, 32], 'top-2': [153, 32], 'side-1': [32, 85], 'side-2': [32, 153] },
    strokes: [rect(14, 14, 174, 174), line(50, 14, 50, 188), line(119, 14, 119, 188), line(14, 50, 188, 50), line(14, 119, 188, 119)],
  },
  {
    name: 'antibody',
    subject: 'biology',
    tags: ['antibody', 'immune', 'antigen', 'binding site', 'y-shape'],
    desc: 'Y-shaped antibody drawn with double lines and a small cup at each arm tip',
    anchors: {
      stem: [100, 150],
      'arm-left': [r1(ab.J[0] + ab.d[0] * 42), r1(ab.J[1] + ab.d[1] * 42)],
      'arm-right': [r1(200 - (ab.J[0] + ab.d[0] * 42)), r1(ab.J[1] + ab.d[1] * 42)],
      'binding-site': [r1(cupL.c[0] - ab.d[0] * 5 + 0), r1(cupL.c[1] - ab.d[1] * 5)],
    },
    strokes: [
      group(line(93, 185, 93, 112), line(107, 185, 107, 112)),
      group(line(93, 112, 46.2, 44), line(100, 97.5, 57.8, 36)),
      group(line(107, 112, 153.8, 44), line(100, 97.5, 142.2, 36)),
      earc(cupL.c[0], cupL.c[1], 8, 8, cupL.a0, cupL.a1),
      earc(200 - cupL.c[0], cupL.c[1], 8, 8, 180 - cupL.a1, 180 - cupL.a0),
    ],
  },
];
