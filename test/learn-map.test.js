const test = require('node:test');
const assert = require('node:assert/strict');
const { loadLibrary } = require('../src/learn/library');
const M = require('../src/learn/model');
const { knowledgeMap, subjectSummary } = require('../src/learn/map');

const lib = loadLibrary();
const T0 = Date.UTC(2026, 10, 4, 10);
const DAY = 86400000;
const FOCUS = 'speed-basics';
const ids = (map) => map.nodes.map((n) => n.id).sort();

// Make a topic strong: right on two different days.
function strong(s, id) {
  s = M.observe(s, id, { correct: true, at: T0 - 2 * DAY });
  for (let i = 0; i < 4; i++) s = M.observe(s, id, { correct: true, at: T0 - DAY + i });
  return s;
}

test('focus view: focus, prerequisites 2 down, dependents 1 up, edges only between them', () => {
  const map = knowledgeMap(lib, M.createModel(), { focus: FOCUS, now: T0 });
  const want = new Set([FOCUS]);
  for (const p of lib.prereqs(FOCUS)) { want.add(p); for (const q of lib.prereqs(p)) want.add(q); }
  for (const d of lib.dependents(FOCUS)) want.add(d);
  assert.deepEqual(ids(map), [...want].sort());
  assert.ok(map.edges.length > 0);
  const inView = new Set(ids(map));
  for (const e of map.edges) {
    assert.ok(inView.has(e.from) && inView.has(e.to));
    assert.ok(lib.prereqs(e.to).includes(e.from));
  }
  const all = new Set(map.edges.map((e) => `${e.from}>${e.to}`));
  for (const id of inView) for (const p of lib.prereqs(id)) if (inView.has(p)) assert.ok(all.has(`${p}>${id}`));
});

test('down and up change the reach', () => {
  const small = knowledgeMap(lib, M.createModel(), { focus: FOCUS, down: 1, up: 0 });
  assert.deepEqual(ids(small), [FOCUS, ...lib.prereqs(FOCUS)].sort());
});

test('levels come from the model', () => {
  let s = strong(M.createModel(), 'units-si');
  s = M.observe(s, 'ratios-percentages', { correct: false, at: T0 });
  const map = knowledgeMap(lib, s, { focus: FOCUS, now: T0 });
  const lv = Object.fromEntries(map.nodes.map((n) => [n.id, n.level]));
  for (const id of Object.keys(lv)) assert.equal(lv[id], M.level(s, id, { now: T0 }));
  assert.equal(lv['units-si'], 'strong');
  assert.equal(lv['ratios-percentages'], 'shaky');
  assert.equal(lv[FOCUS], 'not-started');
});

test('exactly one ready-to-learn, and it obeys the rule', () => {
  let s = M.createModel();
  let map = knowledgeMap(lib, s, { focus: FOCUS, now: T0 });
  const solid = (id) => ['okay', 'strong'].includes(M.level(s, id, { now: T0 }));
  const check = (m) => {
    if (m.readyToLearn === null) return;
    assert.ok(m.nodes.some((n) => n.id === m.readyToLearn));
    assert.ok(['not-started', 'shaky'].includes(M.level(s, m.readyToLearn, { now: T0 })));
    assert.ok(lib.prereqs(m.readyToLearn).every(solid));
  };
  check(map);
  assert.equal(knowledgeMap(lib, s, { subject: 'maths', now: T0 }).readyToLearn !== null, true);
  assert.equal(lib.depth(knowledgeMap(lib, s, { subject: 'maths', now: T0 }).readyToLearn), 0, 'nothing known: start at a root');
  // every prerequisite of the focus solid: the focus itself is next
  for (const a of lib.ancestors(FOCUS)) s = strong(s, a);
  map = knowledgeMap(lib, s, { focus: FOCUS, now: T0 });
  check(map);
  assert.equal(map.readyToLearn, FOCUS);
  // everything in view known: null
  s = strong(s, FOCUS);
  for (const d of lib.dependents(FOCUS)) s = strong(s, d);
  map = knowledgeMap(lib, s, { focus: FOCUS, now: T0 });
  assert.equal(map.readyToLearn, null);
});

test('open gaps come first among ready topics', () => {
  let s = M.observe(M.createModel(), 'units-si', { correct: false, at: T0 });
  s = M.openGap(s, 'units-si', { at: T0, under: FOCUS });
  s = strong(s, 'scientific-notation');
  for (const a of lib.ancestors('scientific-notation')) s = strong(s, a);
  s = M.openGap(s, 'units-si', { at: T0, under: FOCUS });
  const map = knowledgeMap(lib, s, { focus: FOCUS, now: T0 });
  assert.equal(map.readyToLearn, 'units-si');
});

test('open-gap nodes say so in why', () => {
  let s = M.observe(M.createModel(), 'units-si', { correct: false, at: T0 });
  s = M.openGap(s, 'units-si', { at: T0, under: FOCUS });
  const map = knowledgeMap(lib, s, { focus: FOCUS, now: T0 });
  const n = map.nodes.find((x) => x.id === 'units-si');
  assert.equal(n.gap, true);
  assert.match(n.why, /^Gap found while studying Speed, distance and time/);
  assert.equal(map.nodes.filter((x) => x.gap).length, 1);
});

test('why-lines are short plain text with no percentages', () => {
  let s = strong(M.createModel(), 'units-si');
  s = M.markKnown(s, 'scientific-notation', { at: T0 });
  s = M.observe(s, 'ratios-percentages', { correct: false, at: T0, sure: true });
  const map = knowledgeMap(lib, s, { focus: FOCUS, now: T0 });
  for (const n of map.nodes) {
    assert.ok(n.why.length > 0 && n.why.length <= 60, n.why);
    assert.doesNotMatch(n.why, /\d+%|0\.\d/);
  }
  const by = Object.fromEntries(map.nodes.map((n) => [n.id, n.why]));
  assert.match(by['units-si'], /Right on 2 different days/);
  assert.match(by['scientific-notation'], /harder topic/);
  assert.match(by[FOCUS], /^Needs .* first$/);
});

test('subject view and subjectSummary add up to the subject topic count', () => {
  let s = strong(M.createModel(), 'arithmetic-basics');
  s = M.observe(s, 'units-si', { correct: false, at: T0 });
  for (const subject of ['maths', 'physics', 'chemistry', 'biology']) {
    const total = lib.topics.filter((t) => t.subject === subject).length;
    const map = knowledgeMap(lib, s, { subject, now: T0 });
    assert.equal(map.nodes.length, total);
    assert.ok(map.nodes.every((n) => n.subject === subject));
    assert.equal(Object.values(map.counts).reduce((a, b) => a + b, 0), total);
    const sum = subjectSummary(lib, s, { now: T0 })[subject];
    assert.equal(Object.values(sum).reduce((a, b) => a + b, 0), total);
    assert.deepEqual(sum, map.counts);
  }
});

test('input is not mutated', () => {
  const s = strong(M.createModel(), 'units-si');
  const copy = JSON.parse(JSON.stringify(s));
  knowledgeMap(lib, s, { focus: FOCUS, now: T0 });
  subjectSummary(lib, s, { now: T0 });
  assert.deepEqual(s, copy);
});
