const test = require('node:test');
const assert = require('node:assert/strict');
const Q = require('../src/learn/quiz');
const M = require('../src/learn/model');
const { loadLibrary } = require('../src/learn/library');

const lib = loadLibrary();
const MIN = 60000;
const T0 = Date.UTC(2026, 10, 4, 10);
const TOPIC = 'rearranging-formulas'; // 3 check questions, prereq linear-equations

test('no quiz mid-segment, too soon after session start, or too soon after a quiz', () => {
  let qs = Q.createQuizState(T0);
  assert.equal(Q.shouldQuiz(qs, { now: T0 + 10 * MIN, segmentEnd: false }), false);
  assert.equal(Q.shouldQuiz(qs, { now: T0 + 2 * MIN, segmentEnd: true }), false);
  assert.equal(Q.shouldQuiz(qs, { now: T0 + 3 * MIN, segmentEnd: true }), true);
  qs = Q.recordQuiz(qs, { at: T0 + 5 * MIN, topic: TOPIC, q: 'a', correct: true });
  assert.equal(Q.shouldQuiz(qs, { now: T0 + 7 * MIN, segmentEnd: true }), false);
  assert.equal(Q.shouldQuiz(qs, { now: T0 + 8 * MIN, segmentEnd: true }), true);
});

test('hourly cap counts skipped quizzes and rolls', () => {
  let qs = Q.createQuizState(T0);
  for (let i = 1; i <= 4; i++) qs = Q.recordQuiz(qs, { at: T0 + i * 5 * MIN, topic: TOPIC, q: `q${i}`, skipped: i % 2 === 0, correct: true });
  assert.equal(Q.shouldQuiz(qs, { now: T0 + 40 * MIN, segmentEnd: true }), false);
  assert.equal(Q.shouldQuiz(qs, { now: T0 + 5 * MIN + 60 * MIN, segmentEnd: true }), true, 'oldest quiz left the hour');
});

test('follow-up only after a wrong answer', () => {
  let qs = Q.createQuizState(T0);
  assert.equal(Q.wantsFollowUp(qs), false);
  qs = Q.recordQuiz(qs, { at: T0 + 4 * MIN, topic: TOPIC, q: 'a', correct: true });
  assert.equal(Q.wantsFollowUp(qs), false);
  qs = Q.recordQuiz(qs, { at: T0 + 9 * MIN, topic: TOPIC, q: 'b', correct: false });
  assert.equal(Q.wantsFollowUp(qs), true);
  qs = Q.recordQuiz(qs, { at: T0 + 10 * MIN, topic: TOPIC, q: 'c', skipped: true });
  assert.equal(Q.wantsFollowUp(qs), false);
});

test('pickQuestion never repeats, then falls back to the weakest prerequisite root check', () => {
  const model = M.markKnown(M.createModel(), 'fractions-decimals', { at: T0 });
  let qs = Q.createQuizState(T0);
  const seen = new Set();
  const checks = lib.questionsFor(TOPIC).filter((x) => x.kind === 'check');
  for (let i = 0; i < checks.length; i++) {
    const x = Q.pickQuestion(lib, model, qs, TOPIC);
    assert.equal(x.kind, 'check');
    assert.ok(!seen.has(x.q));
    seen.add(x.q);
    qs = Q.recordQuiz(qs, { at: T0 + i, topic: x.topic, q: x.q, correct: true });
  }
  const root = Q.pickQuestion(lib, model, qs, TOPIC);
  assert.equal(root.kind, 'root');
  assert.equal(root.source, TOPIC);
  assert.ok(lib.prereqs(TOPIC).includes(root.topic));
  qs = Q.recordQuiz(qs, { at: T0 + 99, topic: root.topic, q: root.q, correct: true });
  const rest = [];
  for (let x = Q.pickQuestion(lib, model, qs, TOPIC); x; x = Q.pickQuestion(lib, model, qs, TOPIC)) {
    assert.ok(!seen.has(x.q) && x.q !== root.q);
    seen.add(x.q);
    qs = Q.recordQuiz(qs, { at: T0 + 100 + rest.length, topic: x.topic, q: x.q, correct: true });
    rest.push(x);
  }
  assert.equal(Q.pickQuestion(lib, model, qs, TOPIC), null);
});

test('fallback picks the weaker prerequisite first', () => {
  // scientific-notation has two prereqs: powers-roots and fractions-decimals
  const t = 'scientific-notation';
  let qs = Q.createQuizState(T0);
  for (const c of lib.questionsFor(t).filter((x) => x.kind === 'check')) qs = Q.recordQuiz(qs, { at: T0, topic: t, q: c.q, correct: true });
  let model = M.markKnown(M.createModel(), 'powers-roots', { at: T0 });
  assert.equal(Q.pickQuestion(lib, model, qs, t).topic, 'fractions-decimals');
  model = M.markKnown(M.observe(M.createModel(), 'powers-roots', { correct: false, at: T0 }), 'fractions-decimals', { at: T0 });
  assert.equal(Q.pickQuestion(lib, model, qs, t).topic, 'powers-roots');
});

test('quiz state is never mutated and stays JSON', () => {
  const qs0 = Q.createQuizState(T0);
  const snap = JSON.stringify(qs0);
  const qs1 = Q.recordQuiz(qs0, { at: T0 + 1, topic: TOPIC, q: 'a', correct: false });
  assert.equal(JSON.stringify(qs0), snap);
  assert.deepEqual(JSON.parse(JSON.stringify(qs1)), qs1);
});

test('hint levels go 1, 2, 3 and stop at 3', () => {
  const question = lib.questionsFor(TOPIC)[0];
  let h = Q.createHints(question, T0);
  assert.equal(h.level, 0);
  const levels = [];
  for (let i = 1; i <= 5; i++) {
    h = Q.nextHint(h, { at: T0 + i * 10000 });
    levels.push(h.level);
  }
  assert.deepEqual(levels, [1, 2, 3, 3, 3]);
});

test('rapid flag when a hint comes under 3 s after the last one', () => {
  const question = lib.questionsFor(TOPIC)[0];
  let h = Q.nextHint(Q.createHints(question, T0), { at: T0 + 500 });
  assert.equal(h.rapid, false, 'first hint has no previous hint');
  h = Q.nextHint(h, { at: T0 + 500 + 2999 });
  assert.equal(h.rapid, true);
  h = Q.nextHint(h, { at: T0 + 500 + 2999 + 3000 });
  assert.equal(h.rapid, false);
});

test('hintGrade: none Good, 1-2 Hard, 3 Again', () => {
  let h = Q.createHints(lib.questionsFor(TOPIC)[0], T0);
  const grades = [Q.hintGrade(h)];
  for (let i = 1; i <= 3; i++) {
    h = Q.nextHint(h, { at: T0 + i * 10000 });
    grades.push(Q.hintGrade(h));
  }
  assert.deepEqual(grades, [3, 2, 2, 1]);
});

test('hintPrompt pieces per level; only level 3 has the answer', () => {
  const question = lib.questionsFor(TOPIC).find((x) => x.kind === 'check');
  const note = lib.note(TOPIC);
  assert.ok(note.formulas.length > 0);
  let h = Q.createHints(question, T0);
  assert.throws(() => Q.hintPrompt(lib, h), /no hint/);
  h = Q.nextHint(h, { at: T0 + 10000 });
  const p1 = Q.hintPrompt(lib, h);
  assert.ok(p1.includes(question.q) && p1.includes(note.idea));
  assert.ok(!p1.includes(question.a));
  assert.ok(!p1.includes(note.formulas[0]), 'level 1 gives no formulas');
  h = Q.nextHint(h, { at: T0 + 20000 });
  const p2 = Q.hintPrompt(lib, h);
  assert.ok(p2.includes(question.q) && p2.includes(note.idea) && p2.includes(note.formulas[0]));
  assert.ok(!p2.includes(question.a));
  h = Q.nextHint(h, { at: T0 + 30000 });
  const p3 = Q.hintPrompt(lib, h);
  assert.ok(p3.includes(question.q) && p3.includes(question.a));
  assert.match(p3, /twin/);
  assert.ok(!/calmly/.test(p3));
  const rapid = Q.hintPrompt(lib, Q.nextHint(h, { at: T0 + 30100 }));
  assert.match(rapid, /calmly/);
});
