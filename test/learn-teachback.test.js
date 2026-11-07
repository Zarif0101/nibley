const test = require('node:test');
const assert = require('node:assert/strict');
const T = require('../src/learn/teachback');
const model = require('../src/learn/model');
const { GRADE } = require('../src/learn/fsrs');
const { parseAll } = require('../src/script');
const { createLint } = require('../src/lint');
const { loadLibrary } = require('../src/learn/library');

const points = [
  { must: 'Net force equals mass times acceleration.', common_wrong: 'Force is needed to keep moving', fix: 'Force changes motion; F equals m times a.' },
  { must: 'More mass needs more force for the same acceleration.', fix: 'A heavier thing needs a bigger push to speed up the same.' },
  { must: 'Acceleration is in the direction of the net force.', fix: 'It speeds up in the direction of the total push.' },
  { must: 'Force is measured in newtons.', fix: 'Force is in newtons: one newton speeds 1 kg up by 1 metre per second, every second.' },
];

test('the prompt numbers every point and asks for one line each', () => {
  const p = T.teachbackPrompt("Newton's second law", points, 'force is mass times acceleration');
  for (let i = 1; i <= 4; i++) assert.match(p, new RegExp(`^${i}\\. `, 'm'));
  assert.match(p, /If unsure, say missing/);
  assert.ok(T.teachbackPrompt('x', points, 'y'.repeat(5000)).length < 2500, 'transcript is capped');
});

test('verdicts parse loosely; unclear or absent lines count as missing', () => {
  assert.deepEqual(T.parseVerdicts('1 fine\n2) wrong\n3: maybe\nblah', 4), ['fine', 'wrong', 'missing', 'missing']);
  assert.deepEqual(T.parseVerdicts('9 fine\n0 wrong', 2), ['missing', 'missing']);
  assert.deepEqual(T.parseVerdicts('', 3), ['missing', 'missing', 'missing']);
  assert.deepEqual(T.parseVerdicts('1. FINE\n2 - Fine', 2), ['fine', 'fine']);
});

test('grading: all fine is Good, a wrong point is Again, fixes put wrong before missing (max 2)', () => {
  const all = T.gradeTeachback(['fine', 'fine', 'fine', 'fine'], points);
  assert.equal(all.correct, true); assert.equal(all.grade, GRADE.good); assert.deepEqual(all.fixes, []);
  const one = T.gradeTeachback(['fine', 'fine', 'fine', 'missing'], points);
  assert.equal(one.correct, true); assert.equal(one.grade, GRADE.hard);
  const bad = T.gradeTeachback(['missing', 'fine', 'wrong', 'missing'], points);
  assert.equal(bad.correct, false); assert.equal(bad.grade, GRADE.again);
  assert.deepEqual(bad.fixes, [points[2].fix, points[0].fix]);
  assert.equal(bad.score, 0.25);
});

test('a wrong point marks a misconception in the learner model; a clean teach-back does not', () => {
  const m0 = model.createModel();
  const bad = T.applyTeachback(m0, 'newtons-second-law', T.gradeTeachback(['fine', 'wrong', 'fine', 'fine'], points), { at: 1 });
  assert.equal(bad.topics['newtons-second-law'].misconception, true);
  const good = T.applyTeachback(m0, 'newtons-second-law', T.gradeTeachback(['fine', 'fine', 'fine', 'fine'], points), { at: 1 });
  assert.equal(good.topics['newtons-second-law'].misconception, false);
  assert.ok(good.topics['newtons-second-law'].p > m0.topics['newtons-second-law']?.p || good.topics['newtons-second-law'].p > model.PARAMS.prior);
});

test('feedback is a clean Nibley script: right things first, at most 3 say lines, passes the answer guard', () => {
  for (const v of [['fine', 'fine', 'fine', 'fine'], ['fine', 'wrong', 'missing', 'fine'], ['missing', 'missing', 'missing', 'missing']]) {
    const s = T.feedbackScript(T.gradeTeachback(v, points), points, "Newton's second law");
    const cmds = parseAll(s);
    const says = cmds.filter((c) => c.type === 'say');
    assert.ok(says.length >= 1 && says.length <= 3, s);
    assert.ok(cmds.every((c) => c.type !== 'bad' && !c.prose), s);
    const lint = createLint();
    for (const c of cmds) assert.ok(!lint.check(c).fixes.includes('long_line'), s);
  }
});

test('library/teachback.json: every topic exists and has 3-5 complete points', () => {
  const tb = T.loadTeachback();
  const lib = loadLibrary();
  const ids = Object.keys(tb);
  assert.ok(ids.length >= 1, 'no teach-back content');
  for (const id of ids) {
    assert.ok(lib.has(id), `${id} is not a library topic`);
    const pts = tb[id];
    assert.ok(Array.isArray(pts) && pts.length >= 3 && pts.length <= 5, `${id}: ${pts.length} points`);
    for (const p of pts) {
      assert.ok(typeof p.must === 'string' && p.must.length > 5, `${id}: must`);
      assert.ok(typeof p.fix === 'string' && p.fix.split(/\s+/).length <= 20, `${id}: fix "${p.fix}"`);
      assert.ok(p.common_wrong === undefined || typeof p.common_wrong === 'string', `${id}: common_wrong`);
    }
  }
});
