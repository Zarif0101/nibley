const { line, arrow, poly, closed, rect, circle, arc, ellipse, dash, dots, plot, group } = require('../draw');

const rad = (d) => (d * Math.PI) / 180;
// bond from edge of circle at a (radius ra) to edge of circle at b (radius rb)
const bondPts = (a, ra, b, rb) => {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
  const ux = dx / L, uy = dy / L;
  return [[a[0] + ux * ra, a[1] + uy * ra], [b[0] - ux * rb, b[1] - uy * rb], [-uy, ux]];
};
const bondLine = (a, ra, b, rb) => {
  const [p, q] = bondPts(a, ra, b, rb);
  return line(p[0], p[1], q[0], q[1]);
};

// water
const O = [100, 75], HR = 15, OR = 24, BL = 80, half = rad(104.5 / 2);
const HL = [O[0] - BL * Math.sin(half), O[1] + BL * Math.cos(half)];
const HRt = [O[0] + BL * Math.sin(half), O[1] + BL * Math.cos(half)];

// tetrahedral
const C = [100, 100], CR = 14, ER = 9;
const eUp = [100, 32], eLeft = [40, 132], eWedge = [158, 138], eDash = [162, 70];
const wedge = (() => {
  const [p, q, n] = bondPts(C, CR, eWedge, ER);
  const w = 6;
  return closed([p, [q[0] + n[0] * w, q[1] + n[1] * w], [q[0] - n[0] * w, q[1] - n[1] * w]]);
})();
const dashBond = (() => {
  const [p, q] = bondPts(C, CR, eDash, ER);
  return dash(p[0], p[1], q[0], q[1], 4);
})();

// energy profile
const base = (x) => { const u = Math.min(1, Math.max(0, (x - 66) / 80)); return 90 + 35 * (u * u * (3 - 2 * u)); };
const hump = (H) => (x) => base(x) - H * Math.exp(-(((x - 104) / 15) ** 2));
const fMain = hump(60), fCat = hump(38);
const peakOf = (f) => { let b = [66, 999]; for (let x = 66; x <= 154; x += 0.5) if (f(x) < b[1]) b = [x, f(x)]; return b; };
const pk = peakOf(fMain), cpk = peakOf(fCat);
const catDashes = [];
for (let k = 0; k < 6; k++) {
  const x0 = 70 + k * 14.5, x1 = x0 + 8.5;
  catDashes.push(poly([x0, (x0 + x1) / 2, x1].map((x) => [x, fCat(x)])));
}

// ph ticks
const ticks = [];
for (let i = 0; i < 15; i++) { const x = 20 + (160 / 14) * i; ticks.push(line(x, 104, x, i === 7 ? 126 : 114)); }

module.exports = [
  {
    name: 'conical-flask', subject: 'chemistry',
    tags: ['erlenmeyer', 'flask', 'glassware', 'lab', 'liquid'],
    desc: 'conical flask with a narrow neck, wide flat bottom and a liquid level line',
    anchors: { mouth: [100, 20], neck: [100, 50], 'liquid-surface': [100, 125], bottom: [100, 165] },
    strokes: [closed([[88, 20], [112, 20], [112, 70], [160, 165], [40, 165], [88, 70]]), line(60, 125, 140, 125), line(82, 20, 118, 20)],
  },
  {
    name: 'test-tube', subject: 'chemistry',
    tags: ['test tube', 'glassware', 'lab', 'liquid'],
    desc: 'test tube with a round bottom and a liquid level line',
    anchors: { mouth: [100, 20], 'liquid-surface': [100, 90], bottom: [100, 170] },
    strokes: [line(80, 20, 80, 150), arc(100, 150, 20, 180, 360), line(120, 150, 120, 20), line(74, 20, 126, 20), line(80, 90, 120, 90)],
  },
  {
    name: 'burette', subject: 'chemistry',
    tags: ['burette', 'titration', 'glassware', 'tap'],
    desc: 'long thin burette with scale ticks, a tap near the bottom and a narrow tip',
    anchors: { top: [100, 15], tap: [100, 150], tip: [100, 184], scale: [88, 75] },
    strokes: [
      poly([[92, 15], [92, 148], [98, 162], [98, 184], [102, 184], [102, 162], [108, 148], [108, 15]]),
      group(...[30, 45, 60, 75, 90, 105, 120].map((y) => line(83, y, 92, y))),
      line(78, 150, 122, 150),
      circle(100, 150, 4, { smooth: true }),
    ],
  },
  {
    name: 'molecule-diatomic', subject: 'chemistry',
    tags: ['molecule', 'atoms', 'bond', 'diatomic'],
    desc: 'two equal atoms joined by a single bond',
    anchors: { 'atom-left': [60, 100], 'atom-right': [140, 100], bond: [100, 100] },
    strokes: [circle(60, 100, 22), circle(140, 100, 22), line(82, 100, 118, 100)],
  },
  {
    name: 'water-molecule', subject: 'chemistry',
    tags: ['water', 'h2o', 'molecule', 'bent', 'bond angle'],
    desc: 'bent water molecule: big oxygen atom, two hydrogen atoms at 104.5 degrees, angle arc',
    anchors: { oxygen: O, 'hydrogen-left': HL, 'hydrogen-right': HRt, angle: [100, 111] },
    strokes: [circle(O[0], O[1], OR), circle(HL[0], HL[1], HR), circle(HRt[0], HRt[1], HR), group(bondLine(O, OR, HL, HR), bondLine(O, OR, HRt, HR)), arc(O[0], O[1], 36, 270 - 52.25, 270 + 52.25)],
  },
  {
    name: 'tetrahedral-molecule', subject: 'chemistry',
    tags: ['tetrahedral', 'methane', 'wedge', 'dash', '3d', 'molecule'],
    desc: 'central atom with four bonds: two in the page, one wedge coming out, one dashed going back',
    anchors: { center: C, 'bond-up': [100, 66], 'bond-left': [70, 116], 'bond-wedge': [129, 119], 'bond-dash': [131, 85] },
    strokes: [circle(C[0], C[1], CR), group(bondLine(C, CR, eUp, ER), bondLine(C, CR, eLeft, ER)), wedge, dashBond, group(circle(eUp[0], eUp[1], ER, { smooth: true }), circle(eLeft[0], eLeft[1], ER, { smooth: true }), circle(eWedge[0], eWedge[1], ER, { smooth: true }), circle(eDash[0], eDash[1], ER, { smooth: true }))],
  },
  {
    name: 'benzene-ring', subject: 'chemistry',
    tags: ['benzene', 'aromatic', 'hexagon', 'ring'],
    desc: 'hexagon with a circle inside, the benzene ring',
    anchors: { center: [100, 100], 'vertex-top': [100, 35], 'vertex-right': [156.3, 67.5], 'vertex-bottom': [100, 165], 'side-left': [43.7, 100] },
    strokes: [closed([90, 30, -30, -90, -150, 150].map((a) => [100 + 65 * Math.cos(rad(a)), 100 - 65 * Math.sin(rad(a))])), circle(100, 100, 38)],
  },
  {
    name: 'carbon-chain', subject: 'chemistry',
    tags: ['skeletal formula', 'organic', 'carbon', 'chain', 'functional group'],
    desc: 'zigzag skeletal chain of five carbons with a branch up from carbon 2 ending in a small circle',
    anchors: { 'chain-start': [25, 135], 'chain-end': [175, 135], 'carbon-2': [62.5, 105], group: [62.5, 50] },
    strokes: [poly([[25, 135], [62.5, 105], [100, 135], [137.5, 105], [175, 135]]), line(62.5, 105, 62.5, 59), circle(62.5, 50, 9, { smooth: true })],
  },
  {
    name: 'orbitals', subject: 'chemistry',
    tags: ['orbital', 's orbital', 'p orbital', 'electron', 'atom'],
    desc: 's orbital as a circle and p orbital as a two-lobed dumbbell, each around a nucleus dot',
    anchors: { 's-orbital': [55, 100], 'p-orbital': [140, 100], 'p-lobe-top': [140, 72], 'p-lobe-bottom': [140, 128] },
    strokes: [circle(55, 100, 35), group(ellipse(140, 72, 15, 28, { smooth: true }), ellipse(140, 128, 15, 28, { smooth: true })), dots([[55, 100], [140, 100]])],
  },
  {
    name: 'periodic-table', subject: 'chemistry',
    tags: ['periodic table', 'blocks', 'elements', 'groups'],
    desc: 'outline of the periodic table blocks: s block on the left, d block low in the middle, p block on the right',
    anchors: { 's-block': [29, 110], 'd-block': [82, 126], 'p-block': [153, 110], 'top-left': [20, 36], 'top-right': [180, 36] },
    strokes: [
      closed([[20, 36], [28.9, 36], [28.9, 54], [37.8, 54], [37.8, 162], [20, 162]]),
      rect(37.8, 90, 88.9, 72),
      closed([[126.7, 54], [171.1, 54], [171.1, 36], [180, 36], [180, 162], [126.7, 162]]),
    ],
  },
  {
    name: 'energy-profile', subject: 'chemistry',
    tags: ['energy', 'reaction', 'activation energy', 'catalyst', 'exothermic', 'enthalpy'],
    desc: 'exothermic energy profile: reactants, a hump, lower products, a dashed catalyst hump and a delta H arrow',
    anchors: { origin: [30, 170], reactants: [53, 90], products: [172, 125], peak: [pk[0], pk[1]], 'catalyst-peak': [cpk[0], cpk[1]], 'delta-h': [160, 107] },
    strokes: [
      group(arrow(30, 172, 30, 16), arrow(24, 170, 186, 170)),
      line(40, 90, 66, 90),
      plot((x) => [x, fMain(x)], 66, 154, 16),
      line(154, 125, 178, 125),
      group(...catDashes),
      group(arrow(160, 107, 160, 91, 8), arrow(160, 107, 160, 124, 8), dash(150, 90, 176, 90, 3)),
    ],
  },
  {
    name: 'equilibrium-arrows', subject: 'chemistry',
    tags: ['equilibrium', 'reversible', 'reaction', 'arrows'],
    desc: 'reversible reaction symbol: top half-arrow pointing right, bottom half-arrow pointing left',
    anchors: { forward: [100, 80], backward: [100, 120], center: [100, 100] },
    strokes: [poly([[30, 80], [170, 80], [152, 65]]), poly([[170, 120], [30, 120], [48, 135]])],
  },
  {
    name: 'electrochemical-cell', subject: 'chemistry',
    tags: ['galvanic cell', 'electrode', 'salt bridge', 'voltaic', 'redox'],
    desc: 'two beakers with electrodes, a salt bridge between them and a wire with a meter on top',
    anchors: { 'left-electrode': [53, 100], 'right-electrode': [147, 100], 'salt-bridge': [100, 55], wire: [70, 32], meter: [100, 32] },
    strokes: [
      poly([[25, 90], [25, 170], [85, 170], [85, 90]]),
      poly([[115, 90], [115, 170], [175, 170], [175, 90]]),
      group(line(25, 118, 85, 118), line(115, 118, 175, 118)),
      group(rect(48, 50, 10, 95), rect(142, 50, 10, 95)),
      group(line(75, 138, 75, 80), arc(100, 80, 25, 0, 180), line(125, 80, 125, 138)),
      group(poly([[53, 50], [53, 32], [90, 32]]), poly([[110, 32], [147, 32], [147, 50]])),
      circle(100, 32, 10),
    ],
  },
  {
    name: 'electrolysis-cell', subject: 'chemistry',
    tags: ['electrolysis', 'anode', 'cathode', 'electrode', 'battery'],
    desc: 'beaker of liquid with two electrodes wired up to a battery symbol',
    anchors: { anode: [75, 110], cathode: [125, 110], battery: [100, 25], liquid: [100, 105] },
    strokes: [
      poly([[45, 75], [45, 170], [155, 170], [155, 75]]),
      line(45, 105, 155, 105),
      group(rect(70, 45, 10, 85), rect(120, 45, 10, 85)),
      group(poly([[75, 45], [75, 25], [92, 25]]), poly([[108, 25], [125, 25], [125, 45]])),
      group(line(92, 14, 92, 36), line(108, 19, 108, 31)),
    ],
  },
  {
    name: 'ionic-lattice', subject: 'chemistry',
    tags: ['ionic', 'lattice', 'nacl', 'ions', 'crystal'],
    desc: '3 by 3 grid of ions alternating big and small, like salt in 2D',
    anchors: { 'big-ion': [50, 50], 'small-ion': [100, 50], center: [100, 100] },
    strokes: [
      group(...[[50, 50], [150, 50], [100, 100], [50, 150], [150, 150]].map(([x, y]) => circle(x, y, 17, { smooth: true }))),
      group(...[[100, 50], [50, 100], [150, 100], [100, 150]].map(([x, y]) => circle(x, y, 10, { smooth: true }))),
    ],
  },
  {
    name: 'polymer-chain', subject: 'chemistry',
    tags: ['polymer', 'repeat unit', 'brackets', 'monomer'],
    desc: 'zigzag repeat unit between two square brackets with bonds sticking out of each side',
    anchors: { 'repeat-unit': [100, 115], 'bracket-left': [58, 100], 'bracket-right': [142, 100] },
    strokes: [
      poly([[68, 40], [58, 40], [58, 160], [68, 160]]),
      poly([[132, 40], [142, 40], [142, 160], [132, 160]]),
      poly([[72, 115], [86, 92], [100, 115], [114, 92], [128, 115]]),
      group(line(30, 115, 72, 115), line(128, 115, 170, 115)),
    ],
  },
  {
    name: 'ph-scale', subject: 'chemistry',
    tags: ['ph', 'acid', 'base', 'neutral', 'scale'],
    desc: 'horizontal bar with 15 ticks below it for the pH scale, the middle tick longer',
    anchors: { 'acid-end': [14, 86], neutral: [100, 86], 'base-end': [186, 86] },
    strokes: [rect(14, 70, 172, 32), group(...ticks)],
  },
];
