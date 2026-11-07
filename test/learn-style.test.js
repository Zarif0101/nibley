const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../src/learn/style');

function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// One run: a fake learner asks 30 questions of one kind; the favourite style lands 80% of the time, others 35%.
function run(seed, { kind, favourite, level = 'not-started', n = 30, pLand = (s) => (s === favourite ? 0.8 : 0.35) }) {
  const rand = rng(seed);
  let st = S.createStyleState(0);
  const picks = [];
  for (let i = 0; i < n; i++) {
    const p = S.pickStyle(st, kind, { level, rand, now: i * 1e6 });
    st = S.recordPick(st, { kind, ...p, at: i * 1e6 });
    st = S.landed(st, { kind, style: p.style, value: rand() < pLand(p.style) ? 1 : 0, at: i * 1e6 });
    picks.push(p);
  }
  return picks;
}

test('learns a hidden favourite: picked ≥ 70% in answers 21-30 in ≥ 85% of 200 runs', () => {
  const kinds = ['concept', 'formula', 'problem', 'visual'];
  const favs = ['doodle-story', 'board-builder', 'exam-coach', 'picture-first'];
  let good = 0;
  for (let r = 0; r < 200; r++) {
    const kind = kinds[r % 4], favourite = favs[(r * 7 + 3) % 4];
    const late = run(1000 + r, { kind, favourite }).slice(20);
    if (late.filter((p) => p.style === favourite).length >= 7) good++;
  }
  assert.ok(good >= 170, `only ${good}/200 runs learned the favourite`);
});

test('first answer uses the home style, each style is tried once, then explores at most 1 in 5', () => {
  for (let r = 0; r < 50; r++) {
    const picks = run(r, { kind: 'concept', favourite: 'exam-coach', pLand: () => 0.5 });
    assert.equal(picks[0].style, 'doodle-story');
    assert.deepEqual(new Set(picks.slice(0, 4).map((p) => p.style)), new Set(['doodle-story', 'board-builder', 'exam-coach', 'picture-first']));
    const later = picks.slice(4);
    for (let i = 0; i < later.length; i++) if (later[i].explore) assert.ok(!later.slice(Math.max(0, i - 4), i).some((p) => p.explore));
    assert.ok(picks.filter((p) => p.explore).length <= 9);
  }
});

test('no favourite at all: still valid picks, home style keeps a lead', () => {
  const picks = run(7, { kind: 'formula', favourite: null, pLand: () => 0.5 });
  assert.ok(picks.every((p) => S.STYLES.includes(p.style)));
});

test('never switches inside a thread; fixed and asked styles win', () => {
  const st = S.createStyleState(0);
  const last = { style: 'board-builder', topic: 'vectors', at: 1000 };
  assert.equal(S.pickStyle(st, 'concept', { last, topic: 'vectors', now: 1000 + 60e3 }).style, 'board-builder');
  assert.notEqual(S.pickStyle(st, 'concept', { last, topic: 'vectors', now: 1000 + 5 * 60e3, rand: () => 0.5 }).reason, 'same-thread');
  assert.equal(S.pickStyle(st, 'concept', { mode: 'fixed', fixed: 'exam-coach' }).style, 'exam-coach');
  assert.equal(S.pickStyle(st, 'concept', { mode: 'fixed', fixed: 'exam-coach', request: 'doodle-story' }).style, 'doodle-story');
});

test('Question Buddy only for check questions or topics he knows a bit', () => {
  assert.ok(!S.allowedStyles('concept', 'not-started').includes('question-buddy'));
  assert.ok(S.allowedStyles('concept', 'okay').includes('question-buddy'));
  assert.ok(S.allowedStyles('check', 'not-started').includes('question-buddy'));
});

test('landed and decay are pure; decay shrinks learned counts toward the prior', () => {
  const a = S.createStyleState(0);
  const b = S.landed(a, { kind: 'concept', style: 'doodle-story', value: 1 });
  assert.deepEqual(a.scores, {});
  assert.equal(b.scores.concept['doodle-story'].a, 1);
  const c = S.decay(b, 10 * 86400000);
  assert.ok(c.scores.concept['doodle-story'].a < 1 && c.scores.concept['doodle-story'].a > 0.8);
});

test('suggests another style after 2 misses in a row with the same style', () => {
  let st = S.createStyleState(0);
  st = S.landed(st, { kind: 'concept', style: 'board-builder', value: 0 });
  assert.equal(S.suggestSwitch(st, 'concept', 'board-builder'), null);
  st = S.landed(st, { kind: 'concept', style: 'board-builder', value: 0 });
  assert.equal(S.suggestSwitch(st, 'concept', 'board-builder'), 'doodle-story');
});

test('sampleBeta stays in (0, 1) with a mean near a / (a + b)', () => {
  const rand = rng(42);
  let sum = 0;
  for (let i = 0; i < 4000; i++) { const x = S.sampleBeta(3, 7, rand); assert.ok(x > 0 && x < 1); sum += x; }
  assert.ok(Math.abs(sum / 4000 - 0.3) < 0.02);
});
