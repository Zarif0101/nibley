const test = require('node:test');
const assert = require('node:assert/strict');
const { loadLibrary } = require('../src/learn/library');
const model = require('../src/learn/model');
const { snapshot, addWorked, tokens, MAX_TOKENS } = require('../src/learn/snapshot');

const lib = loadLibrary();
const pace = { words: 16, lines: 4, rate: -5 };

test('full header: style, pace, topic level, key idea, weak basics, misconception, worked analogy', () => {
  let m = model.createModel();
  m = model.openGap(m, 'scalars-vectors', { at: 1 });
  m = model.observe(m, 'newtons-second-law', { correct: false, sure: true, at: 2 });
  const worked = addWorked([], { topic: 'newtons-second-law', analogy: 'pushing a full shopping cart', at: 3 });
  const s = snapshot({ style: 'board-builder', pace, topic: 'newtons-second-law', lib, model: m, worked, now: 4 });
  assert.match(s, /^\[nibley\] style=board-builder pace=words16,lines4,rate-5% topic=newtons-second-law\(shaky\)/);
  assert.match(s, /\nkey: /);
  assert.match(s, /weak basics: scalars-vectors \(gap\)/);
  assert.match(s, /misconception: /);
  assert.match(s, /worked before: "pushing a full shopping cart"/);
  assert.ok(tokens(s) <= MAX_TOKENS, `${tokens(s)} tokens`);
});

test('no empty fields when there is nothing to say', () => {
  const s = snapshot({ style: 'doodle-story', pace: { words: 16, lines: 4, rate: 0 }, topic: 'not-a-topic', lib, model: model.createModel() });
  assert.equal(s, '[nibley] style=doodle-story pace=words16,lines4');
  assert.ok(!/: *$/m.test(s));
});

test('every library topic fits the budget in the worst case', () => {
  let m = model.createModel();
  for (const t of lib.topics) m = model.openGap(m, t.id, { at: 1 });
  for (const t of lib.topics) {
    const mm = model.observe(m, t.id, { correct: false, sure: true, at: 2 });
    const worked = addWorked([], { topic: t.id, analogy: 'x'.repeat(200) });
    assert.ok(tokens(snapshot({ style: 'question-buddy', pace, topic: t.id, lib, model: mm, worked })) <= MAX_TOKENS, t.id);
  }
});

test('addWorked keeps the newest analogy per topic', () => {
  let w = addWorked([], { topic: 'a', analogy: 'one', at: 1 });
  w = addWorked(w, { topic: 'a', analogy: 'two', at: 2 });
  assert.deepEqual(w.map((x) => x.analogy), ['two']);
});
