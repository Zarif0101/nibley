const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('../src/learn/model');

const DAY = 86400000;
const T0 = Date.UTC(2026, 10, 4, 10);

test('a new topic is not started at the prior', () => {
  const s = M.createModel();
  assert.equal(M.level(s, 'fractions-decimals', { now: T0 }), 'not-started');
  assert.equal(M.mastery(s, 'fractions-decimals').p, M.PARAMS.prior);
});

test('right answers raise the score, wrong ones lower it', () => {
  let s = M.createModel();
  s = M.observe(s, 'x', { correct: true, at: T0 });
  const up = s.topics.x.p;
  assert.ok(up > M.PARAMS.prior);
  s = M.observe(s, 'x', { correct: false, at: T0 + 1 });
  assert.ok(s.topics.x.p < up);
  assert.equal(s.topics.x.seen, 2);
  assert.equal(s.topics.x.right, 1);
});

test('matches the BKT equations', () => {
  const s = M.observe(M.createModel(), 'x', { correct: true, at: T0 });
  const { prior: p, slip, guess, learn } = M.PARAMS;
  const post = (p * (1 - slip)) / (p * (1 - slip) + (1 - p) * guess);
  assert.ok(Math.abs(s.topics.x.p - (post + (1 - post) * learn)) < 1e-12);
});

test('state is never mutated and stays JSON', () => {
  const s0 = M.createModel();
  const s1 = M.observe(s0, 'x', { correct: true, at: T0 });
  assert.deepEqual(s0, M.createModel());
  assert.deepEqual(JSON.parse(JSON.stringify(s1)), s1);
});

test('unsure + right counts for less; sure + wrong is a misconception', () => {
  const sure = M.observe(M.createModel(), 'x', { correct: true, at: T0, sure: true });
  const unsure = M.observe(M.createModel(), 'x', { correct: true, at: T0, sure: false });
  assert.ok(unsure.topics.x.p < sure.topics.x.p);
  let s = M.observe(M.createModel(), 'x', { correct: true, at: T0 });
  s = M.observe(s, 'x', { correct: true, at: T0 + DAY });
  s = M.observe(s, 'x', { correct: false, at: T0 + 2 * DAY, sure: true });
  assert.equal(s.topics.x.misconception, true);
  assert.equal(M.level(s, 'x', { now: T0 + 2 * DAY }), 'shaky');
});

test('strong needs a high score on two different days, and fades when stale', () => {
  let s = M.createModel();
  for (let i = 0; i < 4; i++) s = M.observe(s, 'x', { correct: true, at: T0 + i * 1000 });
  assert.ok(s.topics.x.p >= M.PARAMS.known);
  assert.equal(M.level(s, 'x', { now: T0 }), 'okay', 'same day only');
  s = M.observe(s, 'x', { correct: true, at: T0 + DAY });
  assert.equal(M.level(s, 'x', { now: T0 + DAY }), 'strong');
  assert.equal(M.level(s, 'x', { now: T0 + 100 * DAY }), 'okay');
});

test('asking about a topic is not evidence', () => {
  let s = M.noteAsked(M.createModel(), 'x', { at: T0 });
  s = M.noteAsked(s, 'x', { at: T0 + 1 });
  assert.equal(M.mastery(s, 'x').p, M.PARAMS.prior);
  assert.equal(M.level(s, 'x'), 'not-started');
  assert.deepEqual(M.worthChecking(s), ['x']);
  assert.deepEqual(M.gaps(s), []);
});

test('a gap opens, closes when fixed on a later day, and reopens if it comes back', () => {
  let s = M.observe(M.createModel(), 'fractions-decimals', { correct: false, at: T0 });
  s = M.openGap(s, 'fractions-decimals', { at: T0, under: 'ratios-percentages' });
  assert.equal(M.gaps(s).length, 1);
  assert.equal(M.level(s, 'fractions-decimals'), 'shaky');
  for (let i = 1; i <= 4; i++) s = M.observe(s, 'fractions-decimals', { correct: true, at: T0 + i * 1000 });
  assert.equal(M.gaps(s).length, 1, 'same day does not close it');
  s = M.observe(s, 'fractions-decimals', { correct: true, at: T0 + DAY });
  assert.equal(M.gaps(s).length, 0);
  assert.equal(M.gaps(s, { status: 'closed' })[0].under, 'ratios-percentages');
  for (let i = 0; i < 4; i++) s = M.observe(s, 'fractions-decimals', { correct: false, at: T0 + 30 * DAY + i });
  const open = M.gaps(s);
  assert.equal(open.length, 1);
  assert.deepEqual(open[0].history.map((h) => h.event), ['open', 'close', 'reopen']);
});

test('openGap twice does not duplicate; markKnown only raises', () => {
  let s = M.openGap(M.createModel(), 'x', { at: T0 });
  s = M.openGap(s, 'x', { at: T0 + 1 });
  assert.equal(s.gaps.x.history.length, 1);
  s = M.markKnown(s, 'y', { at: T0 });
  assert.equal(s.topics.y.p, M.PARAMS.inferred);
  assert.equal(s.topics.y.inferred, true);
  assert.equal(M.level(s, 'y'), 'okay');
  assert.throws(() => M.observe(s, 'y', {}), /correct/);
});
