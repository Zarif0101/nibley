const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('../src/learn/fsrs');

const DAY = 86400000;
const HOUR = 3600000;
const T0 = Date.UTC(2026, 10, 4, 10);

// Expected values come from ts-fsrs 6.0.0 (default FSRS-6 parameters, no fuzz, no learning steps),
// run in a scratch folder. Each review is made `gap` ms after the previous one.
function run(steps) {
  let c = F.createCard('x#1', 'x', T0);
  let now = T0;
  return steps.map(([grade, gap]) => {
    now = c.last === null ? T0 : c.last + gap;
    c = F.rate(c, grade, now);
    return c;
  });
}
const close = (a, b, tol = 1e-3) => assert.ok(Math.abs(a - b) <= tol, `${a} vs ${b}`);
const check = (cards, expected) =>
  expected.forEach(([s, d, i], k) => {
    close(cards[k].stability, s);
    close(cards[k].difficulty, d);
    assert.equal(Math.round((cards[k].due - cards[k].last) / DAY), i, `interval after review ${k + 1}`);
  });

test('good, good, good on the due days matches ts-fsrs', () => {
  const cards = run([[3, 0], [3, 2 * DAY], [3, 11 * DAY]]);
  check(cards, [[2.3065, 2.1181, 2], [10.9643, 2.1112, 11], [46.2802, 2.1043, 46]]);
});

test('again then good matches ts-fsrs', () => {
  check(run([[1, 0], [3, DAY]]), [[0.212, 6.4133, 1], [1.8868, 6.4021, 2]]);
});

test('hard then easy matches ts-fsrs', () => {
  check(run([[2, 0], [4, DAY]]), [[1.2931, 5.1122, 1], [7.3855, 3.4641, 7]]);
});

test('a lapse drops stability and raises difficulty (good, again, good)', () => {
  const cards = run([[3, 0], [1, 2 * DAY], [3, DAY]]);
  close(cards[1].stability, 0.6076);
  close(cards[1].difficulty, 7.3945);
  assert.equal(cards[1].lapses, 1);
  close(cards[2].stability, 2.4004);
});

test('a late review (30 days) grows stability more than an on-time one', () => {
  const late = run([[3, 0], [3, 30 * DAY]]);
  close(late[1].stability, 37.4206);
  assert.ok(late[1].stability > run([[3, 0], [3, 2 * DAY]])[1].stability);
});

test('an early again after easy (5 days) matches ts-fsrs', () => {
  const cards = run([[4, 0], [1, 5 * DAY]]);
  close(cards[0].stability, 8.2956);
  close(cards[0].difficulty, 1);
  close(cards[1].stability, 1.325);
  close(cards[1].difficulty, 7.027);
});

test('a same-day re-review uses the short-term formula', () => {
  const again = run([[1, 0], [3, HOUR]]);
  close(again[1].stability, 0.2467);
  close(again[1].difficulty, 6.4021);
  const hard = run([[3, 0], [2, HOUR]]);
  close(hard[1].stability, 2.3065, 1e-3); // a same-day Hard never shrinks stability
  close(hard[1].difficulty, 4.7529);
});

test('retrievability is 1 for new cards, 0.9 when t = S, and falls with time', () => {
  const c0 = F.createCard('x#1', 'x', T0);
  assert.equal(F.retrievability(c0, T0 + 99 * DAY), 1);
  const c = F.rate(c0, 3, T0);
  close(F.retrievability(c, T0), 1, 1e-12);
  close(F.retrievability(c, T0 + c.stability * DAY), 0.9, 1e-9);
  assert.ok(F.retrievability(c, T0 + 10 * DAY) < F.retrievability(c, T0 + 5 * DAY));
});

test('interval: retention 0.9 gives about S, lower retention gives longer, bounded 1..36500', () => {
  assert.equal(F.interval(10, 0.9), 10);
  assert.ok(F.interval(10, 0.85) > 10);
  assert.equal(F.interval(0.01), 1);
  assert.equal(F.interval(1e9), 36500);
});

test('rate sets due from the desired retention and counts reps', () => {
  const c0 = F.createCard('x#1', 'x', T0);
  assert.equal(c0.state, 'new');
  assert.equal(c0.due, T0);
  const c = F.rate(c0, 3, T0);
  assert.equal(c.state, 'review');
  assert.equal(c.reps, 1);
  assert.equal(c.due, T0 + 2 * DAY);
  const loose = F.rate(F.rate(c0, 3, T0), 3, T0 + 2 * DAY, { retention: 0.8 });
  const tight = F.rate(F.rate(c0, 3, T0), 3, T0 + 2 * DAY, { retention: 0.95 });
  assert.ok(loose.due > tight.due);
});

test('rate never mutates the card and the card stays JSON', () => {
  const c0 = F.createCard('x#1', 'x', T0);
  const snap = JSON.stringify(c0);
  const c1 = F.rate(c0, 3, T0);
  assert.equal(JSON.stringify(c0), snap);
  assert.deepEqual(JSON.parse(JSON.stringify(c1)), c1);
  assert.throws(() => F.rate(c0, 5, T0), /grade/);
});

test('gradeFromAnswer maps the judged answer to a grade', () => {
  assert.equal(F.gradeFromAnswer({ correct: false }), F.GRADE.again);
  assert.equal(F.gradeFromAnswer({ correct: true, hintLevel: 3 }), F.GRADE.again);
  assert.equal(F.gradeFromAnswer({ correct: true, hintLevel: 1 }), F.GRADE.hard);
  assert.equal(F.gradeFromAnswer({ correct: true, sure: false }), F.GRADE.hard);
  assert.equal(F.gradeFromAnswer({ correct: true }), F.GRADE.good);
  assert.equal(F.gradeFromAnswer({ correct: true, tooEasy: true }), F.GRADE.easy);
  assert.equal(F.gradeFromAnswer({ correct: false, tooEasy: true }), F.GRADE.again);
  assert.equal(F.FSRS_PARAMS.length, 21);
});
