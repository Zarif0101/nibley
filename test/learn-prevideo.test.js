const test = require('node:test');
const assert = require('node:assert/strict');
const { loadLibrary } = require('../src/learn/library');
const M = require('../src/learn/model');
const { preVideoCheck, applyPreVideo } = require('../src/learn/prevideo');

const lib = loadLibrary();
const T0 = Date.UTC(2026, 10, 4, 10);
const VIDEO = ['speed-basics'];

function known(s, id) {
  for (let i = 0; i < 4; i++) s = M.observe(s, id, { correct: true, at: T0 + i });
  return s;
}

test('unknown basics give at most maxRoot root questions, one per topic', () => {
  const r = preVideoCheck(lib, M.createModel(), VIDEO, { now: T0 });
  assert.ok(r.roots.length > 0 && r.roots.length <= 3);
  assert.equal(new Set(r.roots.map((x) => x.topic)).size, r.roots.length);
  const near = new Set([...lib.prereqs(VIDEO[0]), ...lib.prereqs(VIDEO[0]).flatMap((p) => lib.prereqs(p))]);
  for (const x of r.roots) {
    assert.ok(near.has(x.topic));
    assert.ok(lib.questionsFor(x.topic).some((q) => q.q === x.q));
  }
  assert.equal(preVideoCheck(lib, M.createModel(), VIDEO, { maxRoot: 1 }).roots.length, 1);
});

test('open gaps first, then shaky, then not started', () => {
  let s = M.observe(M.createModel(), 'units-si', { correct: false, at: T0 });
  s = M.observe(s, 'ratios-percentages', { correct: false, at: T0 });
  s = M.openGap(s, 'ratios-percentages', { at: T0 });
  const r = preVideoCheck(lib, s, VIDEO, { maxRoot: 10, now: T0 });
  const order = r.roots.map((x) => x.topic);
  assert.equal(order[0], 'ratios-percentages');
  assert.equal(order[1], 'units-si');
  const lv = order.map((t) => M.level(s, t, { now: T0 }));
  assert.ok(lv.slice(2).every((l) => l === 'not-started'));
});

test('known basics are not asked', () => {
  let s = M.createModel();
  s = known(s, 'units-si');
  const r = preVideoCheck(lib, s, VIDEO, { maxRoot: 10, now: T0 });
  assert.ok(!r.roots.some((x) => x.topic === 'units-si'));
  for (const a of lib.ancestors(VIDEO[0])) s = known(s, a);
  assert.deepEqual(preVideoCheck(lib, s, VIDEO, { now: T0 }).roots, []);
});

test('warmups come from the video topics own check questions', () => {
  const r = preVideoCheck(lib, M.createModel(), VIDEO, { now: T0 });
  assert.ok(r.warmups.length >= 2 && r.warmups.length <= 3);
  const own = lib.note(VIDEO[0]).checks.map((c) => c.q);
  for (const w of r.warmups) {
    assert.equal(w.topic, VIDEO[0]);
    assert.ok(own.includes(w.q));
  }
  assert.equal(preVideoCheck(lib, M.createModel(), VIDEO, { maxWarmup: 1 }).warmups.length, 1);
});

test('applyPreVideo grades root answers and ignores warm-up answers', () => {
  const s0 = M.createModel();
  const r = preVideoCheck(lib, s0, VIDEO, { now: T0 });
  const answers = [
    { topic: r.roots[0].topic, kind: 'root', correct: false },
    ...r.warmups.map((w) => ({ topic: w.topic, kind: 'warmup', correct: false })),
  ];
  const s1 = applyPreVideo(s0, answers, { at: T0 });
  assert.equal(s1.topics[r.roots[0].topic].seen, 1);
  assert.equal(s1.topics[r.roots[0].topic].lastKind, 'pre-video');
  assert.ok(s1.topics[r.roots[0].topic].p < M.PARAMS.prior);
  assert.equal(s1.topics[VIDEO[0]], undefined, 'warm-ups leave the model alone');
});

test('skip when all basics are known and maxWarmup is 0', () => {
  let s = M.createModel();
  for (const a of lib.ancestors(VIDEO[0])) s = known(s, a);
  assert.equal(preVideoCheck(lib, s, VIDEO, { maxWarmup: 0, now: T0 }).skip, true);
  assert.equal(preVideoCheck(lib, s, VIDEO, { now: T0 }).skip, false, 'warm-ups remain');
  assert.equal(preVideoCheck(lib, M.createModel(), VIDEO, { maxWarmup: 0 }).skip, false);
});

test('inputs are not mutated', () => {
  let s = M.observe(M.createModel(), 'units-si', { correct: false, at: T0 });
  const sCopy = JSON.parse(JSON.stringify(s));
  const ids = ['speed-basics'];
  preVideoCheck(lib, s, ids, { now: T0 });
  const answers = [{ topic: 'units-si', kind: 'root', correct: true }];
  const aCopy = JSON.parse(JSON.stringify(answers));
  applyPreVideo(s, answers, { at: T0 });
  assert.deepEqual(s, sCopy);
  assert.deepEqual(answers, aCopy);
  assert.deepEqual(ids, ['speed-basics']);
});
