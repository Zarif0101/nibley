const test = require('node:test');
const assert = require('node:assert/strict');
const { createPillSequencer } = require('../src/overlay/pill-sequence');

// Fake clock with manual timers.
function harness(minMs = 350) {
  let t = 0, timers = [];
  const shown = [];
  const seq = createPillSequencer((kind) => shown.push([t, kind]), {
    minMs, now: () => t,
    setTimer: (fn, ms) => { const h = { at: t + ms, fn }; timers.push(h); return h; },
    clearTimer: (h) => { timers = timers.filter((x) => x !== h); },
  });
  const advance = (ms) => {
    const end = t + ms;
    for (;;) {
      const due = timers.filter((h) => h.at <= end).sort((a, b) => a.at - b.at)[0];
      if (!due) break;
      timers = timers.filter((h) => h !== due);
      t = due.at; due.fn();
    }
    t = end;
  };
  return { seq, shown, advance, kinds: () => shown.map(([, k]) => k) };
}

test('normal press: nothing before the screenshot, then listening, thinking, speaking, none', () => {
  const h = harness();
  h.seq.press();
  h.advance(450);
  assert.deepEqual(h.kinds(), []);
  h.seq.ready();
  assert.deepEqual(h.kinds(), ['listening']);
  h.advance(2000); h.seq.push('thinking', 'Thinking');
  h.advance(1200); h.seq.push('speaking', 'Speaking');
  h.advance(3000); h.seq.push('none');
  h.advance(400);
  assert.deepEqual(h.kinds(), ['listening', 'thinking', 'speaking', 'none']);
});

test('he lets go before the screenshot: listening still shows first, for at least 350 ms', () => {
  const h = harness();
  h.seq.press();
  h.advance(200); h.seq.push('thinking', 'Thinking');
  assert.deepEqual(h.kinds(), [], 'blocked until the screen is grabbed');
  h.advance(250); h.seq.ready();
  assert.deepEqual(h.kinds(), ['listening']);
  h.advance(349);
  assert.deepEqual(h.kinds(), ['listening']);
  h.advance(1);
  assert.deepEqual(h.kinds(), ['listening', 'thinking']);
});

test('fast answer: speaking waits until thinking has been visible, never skipped', () => {
  const h = harness();
  h.seq.press(); h.seq.ready();
  h.advance(400); h.seq.push('thinking');
  h.advance(50); h.seq.push('speaking');
  h.advance(299);
  assert.deepEqual(h.kinds(), ['listening', 'thinking']);
  h.advance(1);
  assert.deepEqual(h.kinds(), ['listening', 'thinking', 'speaking']);
});

test('never goes backwards or repeats a state', () => {
  const h = harness();
  h.seq.press(); h.seq.ready();
  h.advance(400); h.seq.push('speaking');
  h.advance(400); h.seq.push('thinking'); h.seq.push('speaking');
  h.advance(1000);
  assert.deepEqual(h.kinds(), ['listening', 'speaking']);
});

test('errors jump the queue at once; a new press clears the pill', () => {
  const h = harness();
  h.seq.press(); h.seq.ready(); h.seq.push('thinking');
  h.seq.push('error', 'No internet');
  assert.equal(h.seq.current, 'error');
  h.seq.press();
  assert.equal(h.seq.current, 'none');
  assert.deepEqual(h.seq.pending, []);
});
