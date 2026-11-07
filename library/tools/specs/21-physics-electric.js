const { line, arrow, poly, closed, rect, curve, ellipse, circle, zigzag, coil, group } = require('../draw');

const plus = (cx, cy, h) => group(line(cx, cy - h, cx, cy + h), line(cx - h, cy, cx + h, cy));
const minus = (cx, cy, h) => line(cx - h, cy, cx + h, cy);
const mirror = (pts) => pts.map(([x, y]) => [x, 200 - y]);

const radial = [];
for (let i = 0; i < 8; i++) {
  const a = (i * Math.PI) / 4;
  const c = Math.cos(a);
  const s = -Math.sin(a);
  radial.push(arrow(100 + 26 * c, 100 + 26 * s, 100 + 78 * c, 100 + 78 * s, 10));
}

const topOuter = [[46, 92], [24, 62], [60, 32], [100, 28], [140, 32], [176, 62], [154, 92]];
const topInner = [[50, 86], [40, 66], [70, 52], [100, 50], [130, 52], [160, 66], [150, 86]];

module.exports = [
  {
    name: 'charge-positive',
    subject: 'physics',
    tags: ['charge', 'positive', 'proton', 'electric'],
    desc: 'circle with a plus sign inside, a positive charge',
    anchors: { center: [100, 100], top: [100, 60], right: [140, 100] },
    strokes: [circle(100, 100, 40), plus(100, 100, 20)],
  },
  {
    name: 'charge-negative',
    subject: 'physics',
    tags: ['charge', 'negative', 'electron', 'electric'],
    desc: 'circle with a minus sign inside, a negative charge',
    anchors: { center: [100, 100], top: [100, 60], right: [140, 100] },
    strokes: [circle(100, 100, 40), minus(100, 100, 20)],
  },
  {
    name: 'field-lines-radial',
    subject: 'physics',
    tags: ['electric field', 'field lines', 'point charge', 'radial'],
    desc: 'small charge in the centre with eight arrows pointing straight outward',
    anchors: { center: [100, 100], 'line-end-right': [178, 100], 'line-end-top': [100, 22], 'line-end-left': [22, 100] },
    strokes: [circle(100, 100, 15), plus(100, 100, 8), group(...radial)],
  },
  {
    name: 'capacitor-plates',
    subject: 'physics',
    tags: ['capacitor', 'uniform field', 'parallel plates', 'electric field'],
    desc: 'two vertical parallel plates with five arrows across the gap from left to right',
    anchors: { 'plate-left': [60, 100], 'plate-right': [140, 100], 'gap-mid': [100, 100], top: [100, 30] },
    strokes: [
      line(60, 30, 60, 170),
      line(140, 30, 140, 170),
      group(...[50, 75, 100, 125, 150].map((y) => arrow(66, y, 134, y, 10))),
    ],
  },
  {
    name: 'battery',
    subject: 'physics',
    tags: ['cell', 'battery', 'circuit symbol', 'voltage'],
    desc: 'cell symbol with a long thin plate and a short thick plate, wire leads each side',
    anchors: { left: [20, 100], right: [180, 100], positive: [88, 100], negative: [110, 100] },
    strokes: [line(20, 100, 88, 100), line(88, 68, 88, 132), group(line(108, 84, 108, 116), line(112, 84, 112, 116)), line(112, 100, 180, 100)],
  },
  {
    name: 'resistor',
    subject: 'physics',
    tags: ['resistor', 'circuit symbol', 'resistance', 'ohm'],
    desc: 'zigzag resistor with straight leads',
    anchors: { left: [20, 100], right: [180, 100], center: [100, 100] },
    strokes: [zigzag(20, 100, 180, 100, 6, 14, 0.15)],
  },
  {
    name: 'bulb',
    subject: 'physics',
    tags: ['lamp', 'bulb', 'circuit symbol', 'light'],
    desc: 'lamp symbol: circle with a cross inside and leads left and right',
    anchors: { center: [100, 100], left: [20, 100], right: [180, 100] },
    strokes: [circle(100, 100, 34), group(line(76, 76, 124, 124), line(124, 76, 76, 124)), group(line(20, 100, 66, 100), line(134, 100, 180, 100))],
  },
  {
    name: 'meter',
    subject: 'physics',
    tags: ['ammeter', 'voltmeter', 'meter', 'circuit symbol'],
    desc: 'plain circle with leads left and right, for an ammeter or voltmeter',
    anchors: { center: [100, 100], left: [20, 100], right: [180, 100] },
    strokes: [circle(100, 100, 34), group(line(20, 100, 66, 100), line(134, 100, 180, 100))],
  },
  {
    name: 'simple-circuit',
    subject: 'physics',
    tags: ['circuit', 'series', 'battery', 'resistor', 'current'],
    desc: 'rectangular wire loop with a battery in the top side and a resistor in the bottom side',
    anchors: { battery: [99, 45], resistor: [100, 155], 'left-side': [30, 100], 'right-side': [170, 100], 'corner-top-left': [30, 45] },
    strokes: [
      poly([[92, 45], [30, 45], [30, 155], [60, 155]]),
      zigzag(60, 155, 140, 155, 5, 10, 0.12),
      poly([[140, 155], [170, 155], [170, 45], [108, 45]]),
      line(92, 31, 92, 59),
      group(line(106, 38, 106, 52), line(109, 38, 109, 52)),
    ],
  },
  {
    name: 'parallel-circuit',
    subject: 'physics',
    tags: ['circuit', 'parallel', 'branches', 'battery', 'resistor'],
    desc: 'battery on the left feeding two parallel branches, each with a resistor',
    anchors: { battery: [30, 100], 'branch-top': [100, 100], 'branch-bottom': [165, 100], 'junction-top': [100, 40], 'junction-bottom': [100, 160] },
    strokes: [
      poly([[165, 40], [30, 40], [30, 92]]),
      poly([[30, 108], [30, 160], [165, 160]]),
      line(16, 92, 44, 92),
      group(line(23, 107, 37, 107), line(23, 110, 37, 110)),
      zigzag(100, 40, 100, 160, 5, 10, 0.22),
      zigzag(165, 40, 165, 160, 5, 10, 0.22),
      { kind: 'dots', args: [[[100, 40], [100, 160]]] },
    ],
  },
  {
    name: 'magnet',
    subject: 'physics',
    tags: ['magnet', 'bar magnet', 'magnetic field', 'poles'],
    desc: 'bar magnet split in the middle with four curved field lines looping from one end to the other',
    anchors: { 'north-end': [50, 100], 'south-end': [150, 100], center: [100, 100], 'field-top': [100, 28], 'field-bottom': [100, 172] },
    strokes: [rect(50, 85, 100, 30), line(100, 85, 100, 115), curve(topOuter), curve(topInner), curve(mirror(topInner)), curve(mirror(topOuter))],
  },
  {
    name: 'solenoid',
    subject: 'physics',
    tags: ['solenoid', 'coil', 'electromagnet', 'magnetic field'],
    desc: 'horizontal coil of wire with straight leads at both ends',
    anchors: { 'left-lead': [20, 100], 'right-lead': [180, 100], center: [100, 100], inside: [112, 100] },
    strokes: [line(20, 100, 45, 100), coil(45, 100, 155, 100, 6, 18), line(155, 100, 180, 100)],
  },
  {
    name: 'wire-field',
    subject: 'physics',
    tags: ['magnetic field', 'current', 'wire', 'right hand rule'],
    desc: 'vertical wire with current arrow pointing up and flattened rings around it for the magnetic field',
    anchors: { 'wire-top': [100, 20], 'wire-bottom': [100, 180], ring: [160, 150], current: [100, 45] },
    strokes: [
      line(100, 180, 100, 70),
      arrow(100, 70, 100, 20, 12),
      ellipse(100, 150, 60, 16),
      ellipse(100, 115, 48, 13),
      ellipse(100, 82, 36, 10),
      arrow(92, 166, 110, 166.4, 9),
    ],
  },
  {
    name: 'transformer',
    subject: 'physics',
    tags: ['transformer', 'coil', 'iron core', 'induction'],
    desc: 'rectangular iron core with a few-turn coil on the left and a many-turn coil on the right',
    anchors: { primary: [52, 100], secondary: [148, 100], 'core-top': [100, 35], 'primary-lead': [18, 65], 'secondary-lead': [182, 65] },
    strokes: [
      rect(40, 35, 120, 130),
      rect(65, 60, 70, 80),
      coil(52, 65, 52, 135, 3, 10),
      coil(148, 65, 148, 135, 6, 10),
      group(line(18, 65, 52, 65), line(18, 135, 52, 135), line(148, 65, 182, 65), line(148, 135, 182, 135)),
    ],
  },
];
