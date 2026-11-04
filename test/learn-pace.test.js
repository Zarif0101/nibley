const test = require('node:test');
const assert = require('node:assert/strict');
const P = require('../src/learn/pace');
const DAY = 86400000;

test('starts at the defaults', () => {
  assert.deepEqual(P.paceFor(P.createPace(0)), { words: 16, lines: 4, rate: 0, pauseMs: 200, rateText: '+0%' });
});

test('a spoken command moves its dials one step at once', () => {
  const s = P.signal(P.createPace(0), 'slower', { at: 1 });
  assert.equal(s.rate, -5); assert.equal(s.words, 14); assert.equal(s.pauseMs, 300);
  assert.equal(P.paceFor(s).rateText, '-5%');
});

test('dials stay inside their range', () => {
  let s = P.createPace(0);
  for (let i = 0; i < 20; i++) s = P.signal(s, 'slower', { at: i });
  assert.equal(s.rate, -15); assert.equal(s.words, 12); assert.equal(s.pauseMs, 500);
  for (let i = 0; i < 20; i++) s = P.signal(s, 'more', { at: 100 + i });
  assert.equal(s.lines, 6); assert.equal(s.words, 20);
});

test('indirect signals need two within 7 days', () => {
  let s = P.signal(P.createPace(0), 'barge-in', { at: 0 });
  assert.equal(s.lines, 4);
  s = P.signal(s, 'barge-in', { at: 8 * DAY });
  assert.equal(s.lines, 4, 'the first one expired');
  s = P.signal(s, 'barge-in', { at: 9 * DAY });
  assert.equal(s.lines, 3);
  assert.equal(s.pending.length, 0);
});

test('drifts one step back toward the start after 14 quiet days', () => {
  let s = P.signal(P.signal(P.createPace(0), 'slower', { at: 0 }), 'slower', { at: 0 });
  assert.equal(s.rate, -10);
  assert.equal(P.drift(s, 13 * DAY).rate, -10);
  s = P.drift(s, 14 * DAY);
  assert.equal(s.rate, -5); assert.equal(s.lines, 4);
  assert.equal(P.drift(s, 15 * DAY).rate, -5, 'next drift waits another 14 days');
});

test('unknown signals change nothing', () => {
  const s = P.createPace(0);
  assert.equal(P.signal(s, 'dance'), s);
});
