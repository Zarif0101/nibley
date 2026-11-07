// General diagram templates for any topic: steps, cycles, timelines, comparisons, maps of ideas. No text.
const { line, arrow, poly, closed, rect, curve, ellipse, circle, arc, dash, dots, group } = require('../draw');

const rad = (d) => (d * Math.PI) / 180;
const at = (cx, cy, r, a) => [cx + r * Math.cos(rad(a)), cy - r * Math.sin(rad(a))];
// Chevron arrowhead on a circle at angle a, pointing clockwise (cw = true) or anticlockwise.
const head = (cx, cy, r, a, cw = true, size = 9) => {
  const [px, py] = at(cx, cy, r, a), s = cw ? 1 : -1;
  const dx = s * Math.sin(rad(a)), dy = s * Math.cos(rad(a)), nx = Math.cos(rad(a)), ny = -Math.sin(rad(a));
  return poly([[px - dx * size + nx * size * 0.7, py - dy * size + ny * size * 0.7], [px, py], [px - dx * size - nx * size * 0.7, py - dy * size - ny * size * 0.7]]);
};

module.exports = [
  { name: 'flow-steps', subject: 'diagram', tags: ['steps', 'process', 'sequence', 'flow', 'order'], desc: 'three boxes in a row joined by arrows',
    anchors: { 'step-1': [34, 100], 'step-2': [100, 100], 'step-3': [166, 100] },
    strokes: [rect(12, 78, 44, 44), rect(78, 78, 44, 44), rect(144, 78, 44, 44), arrow(58, 100, 76, 100), arrow(124, 100, 142, 100)] },
  { name: 'cycle', subject: 'diagram', tags: ['cycle', 'loop', 'stages', 'repeat', 'circular'], desc: 'four stages around a circle, arrows going clockwise',
    anchors: { 'stage-top': [100, 36], 'stage-right': [164, 100], 'stage-bottom': [100, 164], 'stage-left': [36, 100], center: [100, 100] },
    strokes: [group(circle(100, 36, 14, { smooth: true }), circle(164, 100, 14, { smooth: true }), circle(100, 164, 14, { smooth: true }), circle(36, 100, 14, { smooth: true })),
      group(arc(100, 100, 64, 76, 14), arc(100, 100, 64, -14, -76), arc(100, 100, 64, -104, -166), arc(100, 100, 64, 166, 104)),
      group(head(100, 100, 64, 14), head(100, 100, 64, -76), head(100, 100, 64, -166), head(100, 100, 64, 104))] },
  { name: 'timeline', subject: 'diagram', tags: ['timeline', 'history', 'events', 'order', 'time'], desc: 'horizontal timeline arrow with four event marks',
    anchors: { start: [24, 100], end: [184, 100], 'event-1': [44, 100], 'event-4': [158, 100] },
    strokes: [arrow(14, 100, 188, 100), group(line(44, 88, 44, 112), line(82, 88, 82, 112), line(120, 88, 120, 112), line(158, 88, 158, 112)), dots([[44, 70], [82, 130], [120, 70], [158, 130]])] },
  { name: 'venn-three', subject: 'diagram', tags: ['venn', 'overlap', 'sets', 'compare', 'shared'], desc: 'three overlapping circles',
    anchors: { a: [74, 76], b: [126, 76], c: [100, 128], middle: [100, 96] },
    strokes: [circle(78, 82, 46), circle(122, 82, 46), circle(100, 122, 46)] },
  { name: 'comparison-columns', subject: 'diagram', tags: ['compare', 'versus', 'columns', 'pros-cons', 'table'], desc: 'two columns side by side with a header and three rows each',
    anchors: { left: [56, 110], right: [144, 110], 'left-header': [56, 44], 'right-header': [144, 44] },
    strokes: [rect(16, 28, 80, 150), rect(104, 28, 80, 150), group(line(16, 60, 96, 60), line(104, 60, 184, 60)), group(...[92, 124, 156].flatMap((y) => [line(28, y, 84, y), line(116, y, 172, y)]))] },
  { name: 'mind-map', subject: 'diagram', tags: ['mind-map', 'ideas', 'branches', 'brainstorm', 'topics'], desc: 'central idea with five branches to smaller ideas',
    anchors: { center: [100, 100], 'branch-1': [100, 26], 'branch-2': [172, 74], 'branch-3': [150, 166], 'branch-4': [50, 166], 'branch-5': [28, 74] },
    strokes: [ellipse(100, 100, 34, 22), group(...[[100, 26], [172, 74], [150, 166], [50, 166], [28, 74]].map(([x, y]) => ellipse(x, y, 20, 12, { smooth: true }))),
      group(line(100, 78, 100, 38), line(132, 92, 154, 80), line(122, 116, 142, 154), line(78, 116, 58, 154), line(68, 92, 46, 80))] },
  { name: 'funnel', subject: 'diagram', tags: ['funnel', 'filter', 'narrow-down', 'many-to-one', 'select'], desc: 'funnel with three arrows going in and one coming out',
    anchors: { top: [100, 50], bottom: [100, 176], wide: [100, 62] },
    strokes: [poly([[28, 62], [88, 128], [88, 160]]), poly([[172, 62], [112, 128], [112, 160]]), ellipse(100, 62, 72, 10), group(arrow(60, 14, 70, 46), arrow(100, 10, 100, 44), arrow(140, 14, 130, 46)), arrow(100, 160, 100, 192)] },
  { name: 'pyramid-levels', subject: 'diagram', tags: ['pyramid', 'levels', 'hierarchy', 'base', 'priority'], desc: 'pyramid split into four levels',
    anchors: { top: [100, 54], base: [100, 160], 'level-2': [100, 108] },
    strokes: [closed([[100, 22], [180, 176], [20, 176]]), group(line(76, 68, 124, 68), line(52, 114, 148, 114), line(36, 146, 164, 146))] },
  { name: 'matrix-2x2', subject: 'diagram', tags: ['quadrants', 'matrix', 'two-by-two', 'sort', 'priority'], desc: 'square split into four quadrants with two axis arrows',
    anchors: { 'top-left': [68, 64], 'top-right': [132, 64], 'bottom-left': [68, 128], 'bottom-right': [132, 128] },
    strokes: [rect(36, 32, 128, 128), group(line(100, 32, 100, 160), line(36, 96, 164, 96)), arrow(26, 176, 176, 176), arrow(22, 172, 22, 24)] },
  { name: 'fishbone', subject: 'diagram', tags: ['cause-effect', 'causes', 'root-cause', 'fishbone', 'why'], desc: 'fishbone chart: a spine arrow to the effect, with four cause bones',
    anchors: { effect: [182, 100], 'cause-top': [60, 48], 'cause-bottom': [60, 152], spine: [100, 100] },
    strokes: [arrow(14, 100, 172, 100), rect(172, 84, 22, 32), group(line(50, 44, 76, 100), line(110, 44, 136, 100), line(50, 156, 76, 100), line(110, 156, 136, 100))] },
  { name: 'before-after', subject: 'diagram', tags: ['before-after', 'change', 'compare', 'transform', 'result'], desc: 'two panels with an arrow from the first to the second',
    anchors: { before: [46, 100], after: [154, 100], change: [100, 100] },
    strokes: [rect(12, 56, 68, 88), rect(120, 56, 68, 88), arrow(84, 100, 116, 100), group(line(24, 116, 68, 84)), poly([[132, 128], [146, 110], [160, 118], [176, 76]])] },
  { name: 'spectrum', subject: 'diagram', tags: ['scale', 'spectrum', 'range', 'between', 'degree'], desc: 'line with arrows at both ends, five marks and a pointer',
    anchors: { left: [22, 112], right: [178, 112], marker: [130, 92], middle: [100, 112] },
    strokes: [arrow(100, 112, 12, 112), arrow(100, 112, 188, 112), group(line(40, 104, 40, 120), line(70, 104, 70, 120), line(100, 104, 100, 120), line(130, 104, 130, 120), line(160, 104, 160, 120)), closed([[122, 80], [138, 80], [130, 96]])] },
  { name: 'feedback-loop', subject: 'diagram', tags: ['feedback', 'loop', 'cause', 'reinforce', 'system'], desc: 'two boxes: an arrow from the first to the second and one curving back',
    anchors: { 'box-a': [48, 100], 'box-b': [152, 100], forward: [100, 86], back: [100, 152] },
    strokes: [rect(20, 76, 56, 48), rect(124, 76, 56, 48), arrow(78, 92, 122, 92), curve([[152, 126], [140, 154], [100, 162], [60, 154], [48, 128]]), poly([[40, 138], [48, 126], [58, 136]])] },
  { name: 'checklist', subject: 'diagram', tags: ['checklist', 'tasks', 'done', 'steps', 'todo'], desc: 'three tick boxes with lines, two ticked',
    anchors: { 'item-1': [100, 56], 'item-2': [100, 100], 'item-3': [100, 144] },
    strokes: [group(rect(30, 42, 28, 28), rect(30, 86, 28, 28), rect(30, 130, 28, 28)), group(line(72, 56, 170, 56), line(72, 100, 170, 100), line(72, 144, 150, 144)), poly([[34, 54], [44, 66], [62, 36]]), poly([[34, 98], [44, 110], [62, 80]])] },
  { name: 'target', subject: 'diagram', tags: ['target', 'goal', 'aim', 'accuracy', 'bullseye'], desc: 'bullseye target with an arrow in the middle',
    anchors: { center: [92, 108], arrow: [160, 40] },
    strokes: [circle(92, 108, 64), circle(92, 108, 42), circle(92, 108, 18, { smooth: true }), arrow(174, 26, 98, 102)] },
  { name: 'layers-stack', subject: 'diagram', tags: ['layers', 'stack', 'levels', 'abstraction', 'build-on'], desc: 'four flat layers stacked one on top of another',
    anchors: { top: [100, 54], bottom: [100, 150], 'layer-2': [100, 86] },
    strokes: [...[150, 118, 86, 54].map((y) => closed([[100, y - 13], [174, y], [100, y + 13], [26, y]]))] },
];
