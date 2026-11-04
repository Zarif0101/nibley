const test = require('node:test');
const assert = require('node:assert/strict');
const G = require('../src/learn/gapfinder');
const M = require('../src/learn/model');
const { loadLibrary } = require('../src/learn/library');

const lib = loadLibrary();
const T0 = Date.UTC(2026, 10, 4, 10);

// Run a session against a learner who answers via `knows(topic)`.
function run(state, topic, knows, opts) {
  let s = G.startGapFinder(lib, state, topic, opts);
  const asked = [];
  for (let i = 0; i < 20; i++) {
    const step = G.nextStep(lib, state, s);
    if (step.done) return { s, step, asked };
    assert.ok(step.question && step.question.q, 'a question comes with every ask');
    asked.push(step.ask);
    s = G.answer(s, knows(step.ask));
  }
  throw new Error('did not finish');
}

// A mid-level topic with a deep chain of testable basics.
const TOPIC = 'speed-basics';
const suspectsOf = (state) => G.startGapFinder(lib, state, TOPIC).suspects;

test('the test topic has a real chain below it', () => {
  assert.ok(suspectsOf(M.createModel()).length >= 5);
});

test('a fully unknown learner is asked at most 4 questions and ends on a lower basic', () => {
  const { step, asked } = run(M.createModel(), TOPIC, () => false);
  assert.ok(asked.length >= 1 && asked.length <= 4);
  assert.ok(step.done);
  assert.notEqual(step.weak, TOPIC);
  assert.ok(lib.ancestors(TOPIC).includes(step.weak));
  assert.ok(lib.depth(step.weak) < lib.depth(TOPIC));
});

test('a learner who passes everything: weak is the failed topic, no gap opened', () => {
  const state = M.createModel();
  const { s, step } = run(state, TOPIC, () => true);
  assert.equal(step.weak, TOPIC);
  const after = G.applyGapFinder(state, s, { at: T0 });
  assert.deepEqual(M.gaps(after, { status: 'all' }), []);
});

test('one weak basic (and everything built on it) is found in at most 6 questions', () => {
  const state = M.createModel();
  for (const target of suspectsOf(state)) {
    const bad = new Set([target, ...lib.descendants(target)]);
    const { step, asked } = run(state, TOPIC, (t) => !bad.has(t));
    assert.equal(step.weak, target, `target ${target}`);
    assert.ok(asked.length <= 6);
  }
});

test('finds the weak basic for every topic and every one of its basics', () => {
  let cases = 0;
  for (const t of lib.topics.filter((x) => x.level !== 'foundation')) {
    for (const target of lib.ancestors(t.id)) {
      const bad = new Set([target, ...lib.descendants(target)]);
      assert.equal(run(M.createModel(), t.id, (x) => !bad.has(x)).step.weak, target, `${t.id} <- ${target}`);
      cases++;
    }
  }
  assert.ok(cases > 2000);
});

test('hidden truth set: failing a basic means failing everything built on it', () => {
  const state = M.createModel();
  const target = 'powers-roots';
  const bad = new Set([target, ...lib.descendants(target)]);
  const { step } = run(state, TOPIC, (t) => !bad.has(t));
  assert.equal(step.weak, target);
  assert.equal(step.rootCause, true);
});

test('already-known ancestors are never asked, and the same topic is never asked twice', () => {
  let state = M.createModel();
  for (const id of ['arithmetic-basics', 'fractions-decimals']) {
    for (let i = 0; i < 5; i++) state = M.observe(state, id, { correct: true, at: T0 + i });
  }
  const { asked } = run(state, TOPIC, () => false);
  assert.ok(!asked.includes('arithmetic-basics') && !asked.includes('fractions-decimals'));
  assert.equal(new Set(asked).size, asked.length);
  const all = run(M.createModel(), TOPIC, () => true).asked;
  assert.equal(new Set(all).size, all.length);
});

test('maxQuestions is respected', () => {
  const { asked } = run(M.createModel(), TOPIC, () => true, { maxQuestions: 2 });
  assert.ok(asked.length <= 2);
});

test('applyGapFinder opens the gap with under set and marks passed ancestors known', () => {
  const state = M.createModel();
  const target = 'powers-roots';
  const bad = new Set([target, ...lib.descendants(target)]);
  const { s, step } = run(state, TOPIC, (t) => !bad.has(t));
  const after = G.applyGapFinder(state, s, { at: T0 });
  assert.equal(step.weak, target);
  const gap = M.gaps(after)[0];
  assert.equal(gap.id, target);
  assert.equal(gap.under, TOPIC);
  assert.equal(gap.source, 'gap-finder');
  for (const a of s.asked.filter((x) => x.correct)) {
    for (const anc of lib.ancestors(a.topic)) assert.equal(M.level(after, anc, { now: T0 }), 'okay', `${anc} marked known`);
  }
  assert.ok(after.topics[target].seen >= 1);
});

test('input state and session are not mutated, and sessions are JSON', () => {
  const state = M.observe(M.createModel(), 'arithmetic-basics', { correct: true, at: T0 });
  const frozen = JSON.stringify(state);
  const s0 = G.startGapFinder(lib, state, TOPIC);
  const s0json = JSON.stringify(s0);
  const s1 = G.answer(s0, false);
  assert.equal(JSON.stringify(s0), s0json);
  assert.deepEqual(JSON.parse(JSON.stringify(s1)), s1);
  G.applyGapFinder(state, s1, { at: T0 });
  assert.equal(JSON.stringify(state), frozen);
});

test('answering after done throws', () => {
  const { s } = run(M.createModel(), TOPIC, () => true);
  assert.throws(() => G.answer(s, true), /done/);
});
