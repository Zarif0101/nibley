const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../src/learn/confusion');

const SEC = 1000;
const MIN = 60000;
const T0 = Date.UTC(2026, 10, 4, 10);

const feed = (events) => events.reduce((d, e) => C.addEvent(d, e), C.createDetector());
const back = (at, to, from = to + 10) => ({ type: 'seek-back', at, from, to });

test('empty detector scores 0 and never offers', () => {
  const d = C.createDetector();
  assert.equal(C.score(d, T0), 0);
  assert.equal(C.shouldOffer(d, T0), false);
});

test('score drops events older than 3 minutes', () => {
  const d = feed([{ type: 'wrong', at: T0 }, { type: 'speed-down', at: T0 + MIN }]);
  assert.equal(C.score(d, T0 + MIN), 3);
  assert.equal(C.score(d, T0 + 3 * MIN), 3, 'edge still counts');
  assert.equal(C.score(d, T0 + 3 * MIN + 1), 1, 'wrong aged out');
  assert.equal(C.score(d, T0 + 4 * MIN + 1), 0);
});

test('repeated seek-back into the same span scores higher', () => {
  const once = feed([back(T0, 100)]);
  const twice = feed([back(T0, 100), back(T0 + 20 * SEC, 105)]);
  const elsewhere = feed([back(T0, 100), back(T0 + 20 * SEC, 300)]);
  assert.equal(C.score(once, T0 + SEC), 1);
  assert.equal(C.score(twice, T0 + 30 * SEC), 3);
  assert.equal(C.score(elsewhere, T0 + 30 * SEC), 2);
});

test('a seek-back right after a slide change scores 0', () => {
  const d = feed([{ type: 'slide-change', at: T0 }, back(T0 + 1500, 100)]);
  assert.equal(C.score(d, T0 + 2 * SEC), 0);
  const late = feed([{ type: 'slide-change', at: T0 }, back(T0 + 2500, 100)]);
  assert.equal(C.score(late, T0 + 3 * SEC), 1);
  const slideRewatch = feed([{ type: 'slide-change', at: T0 }, back(T0 + 500, 100), back(T0 + 30 * SEC, 100)]);
  assert.equal(C.score(slideRewatch, T0 + 31 * SEC), 1, 'the slide re-read is not an earlier rewatch');
});

test('other signals: long pause, speed-down, wrong answer, long silence', () => {
  assert.equal(C.score(feed([{ type: 'pause', at: T0, duration: 25 * SEC }]), T0), 1);
  assert.equal(C.score(feed([{ type: 'pause', at: T0, duration: 10 * SEC }]), T0), 0);
  assert.equal(C.score(feed([{ type: 'speed-down', at: T0 }]), T0), 1);
  assert.equal(C.score(feed([{ type: 'wrong', at: T0 }]), T0), 2);
  assert.equal(C.score(feed([{ type: 'silence', at: T0, duration: 16 * SEC }]), T0), 1);
  assert.equal(C.score(feed([{ type: 'silence', at: T0, duration: 5 * SEC }]), T0), 0);
});

const confused = (at) => feed([{ type: 'wrong', at }, { type: 'speed-down', at: at + SEC }]); // score 3

test('offer respects the threshold', () => {
  assert.equal(C.shouldOffer(feed([{ type: 'wrong', at: T0 }]), T0 + SEC), false);
  assert.equal(C.shouldOffer(confused(T0), T0 + 2 * SEC), true);
});

test('offer respects the 5-minute gap', () => {
  let d = C.recordOffer(confused(T0), { at: T0 + 2 * SEC, accepted: true });
  d = [{ type: 'wrong', at: T0 + 4 * MIN }, { type: 'speed-down', at: T0 + 4 * MIN + SEC }].reduce(C.addEvent, d);
  assert.equal(C.shouldOffer(d, T0 + 4 * MIN + 2 * SEC), false);
  d = [{ type: 'wrong', at: T0 + 6 * MIN }, { type: 'speed-down', at: T0 + 6 * MIN + SEC }].reduce(C.addEvent, d);
  assert.equal(C.shouldOffer(d, T0 + 6 * MIN + 2 * SEC), true);
});

test('at most 3 offers per session', () => {
  let d = C.createDetector();
  for (let i = 0; i < 3; i++) d = C.recordOffer(d, { at: T0 + i * 10 * MIN, accepted: true });
  const at = T0 + 40 * MIN;
  d = [{ type: 'wrong', at }, { type: 'speed-down', at: at + SEC }].reduce(C.addEvent, d);
  assert.equal(C.shouldOffer(d, at + 2 * SEC), false);
});

test('cooldown of 15 minutes after two dismissals in a row', () => {
  let d = C.createDetector();
  d = C.recordOffer(d, { at: T0, accepted: false });
  d = C.recordOffer(d, { at: T0 + 6 * MIN, accepted: false });
  const at = T0 + 12 * MIN;
  d = [{ type: 'wrong', at }, { type: 'speed-down', at: at + SEC }].reduce(C.addEvent, d);
  assert.equal(C.shouldOffer(d, at + 2 * SEC), false, '6 min after the 2nd dismissal');
  const later = T0 + 6 * MIN + 15 * MIN;
  d = [{ type: 'wrong', at: later }, { type: 'speed-down', at: later + SEC }].reduce(C.addEvent, d);
  assert.equal(C.shouldOffer(d, later + 2 * SEC), true);
});

test('one dismissal, or a dismissal after an accept, does not trigger the cooldown', () => {
  let d = C.recordOffer(C.recordOffer(C.createDetector(), { at: T0, accepted: true }), { at: T0 + 6 * MIN, accepted: false });
  const at = T0 + 12 * MIN;
  d = [{ type: 'wrong', at }, { type: 'speed-down', at: at + SEC }].reduce(C.addEvent, d);
  assert.equal(C.shouldOffer(d, at + 2 * SEC), true);
});

test('inputs are not mutated and state stays JSON', () => {
  const d0 = C.createDetector();
  const d1 = C.addEvent(d0, { type: 'wrong', at: T0 });
  const d2 = C.recordOffer(d1, { at: T0, accepted: false });
  assert.deepEqual(d0, C.createDetector());
  assert.equal(d1.offers.length, 0);
  assert.equal(d1.events.length, 1);
  const snap = JSON.stringify(d2);
  C.score(d2, T0 + SEC);
  C.shouldOffer(d2, T0 + SEC);
  assert.equal(JSON.stringify(d2), snap);
  assert.deepEqual(JSON.parse(JSON.stringify(d2)), d2);
  const ev = { type: 'wrong', at: T0 };
  C.addEvent(d0, ev).events[0].at = 5;
  assert.equal(ev.at, T0);
});
