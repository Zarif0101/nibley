const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../src/learn/curve');
const fsrs = require('../src/learn/fsrs');
const DAY = 86400000;

test('addPoint is pure and caps at 50 points', () => {
  let c = {};
  const first = C.addPoint(c, 'vectors', 0, 0.3);
  assert.deepEqual(c, {});
  for (let i = 0; i < 60; i++) c = C.addPoint(c, 'vectors', i, 0.3 + i / 100);
  assert.equal(c.vectors.length, 50);
  assert.deepEqual(first.vectors, [[0, 0.3]]);
});

test('week summary: topics that moved up a band, cards that are fading, no percentages', () => {
  const now = 30 * DAY;
  let curve = C.addPoint({}, 'vectors', now - 10 * DAY, 0.3);
  curve = C.addPoint(curve, 'vectors', now - DAY, 0.9);
  curve = C.addPoint(curve, 'fractions', now - 20 * DAY, 0.9);
  let card = fsrs.createCard('fractions#1', 'fractions', 0);
  card = fsrs.rate(card, 3, 0);
  const s = C.weekSummary({ curve, cards: [card] }, now);
  assert.deepEqual(s.stronger, ['vectors']);
  assert.deepEqual(s.fading, ['fractions']);
  assert.equal(s.text, '1 topic got stronger this week, 1 needs a refresh.');
  assert.ok(!/%/.test(s.text));
  assert.equal(C.weekSummary({}, now).text, '');
});

test('time to okay in days', () => {
  let c = C.addPoint({}, 'trig', 0, 0.3);
  c = C.addPoint(c, 'trig', 3 * DAY, 0.45);
  c = C.addPoint(c, 'trig', 5 * DAY, 0.6);
  assert.equal(C.timeToOkay(c, 'trig'), 5);
  assert.equal(C.timeToOkay(c, 'nothing'), null);
});
