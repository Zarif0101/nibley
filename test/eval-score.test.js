const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { scoreScript, summarize, SHAPES } = require('./eval/score');
const { loadStyles } = require('../src/styles');
const { STYLES } = require('../src/learn/style');

const items = JSON.parse(fs.readFileSync(path.join(__dirname, 'eval', 'questions.json'), 'utf8'));

test('30 well-formed eval questions on existing fixtures', () => {
  assert.equal(items.length, 30);
  assert.equal(new Set(items.map((i) => i.id)).size, 30);
  for (const it of items) {
    assert.ok(fs.existsSync(path.join(__dirname, 'fixtures', `${it.fixture}.png`)), it.id);
    assert.ok(['concept', 'formula', 'problem', 'visual', 'check', 'guide'].includes(it.kind), it.id);
    if (it.style) assert.ok(STYLES.includes(it.style), it.id);
    for (const [x, y, w, h] of it.box || []) assert.ok(x >= 0 && y >= 0 && x + w <= 1366 && y + h <= 768, it.id);
  }
});

test('a good concept answer scores full marks', () => {
  const s = scoreScript(['say It means force equals mass times acceleration.', 'ring 700 300 60 | the law',
    'say Think of pushing a shopping cart: a full one needs a bigger push.', 'title F = ma'].join('\n'),
  { kind: 'concept', box: [[650, 250, 100, 100]], mustMention: ['force'] });
  assert.deepEqual([s.S1, s.S2, s.S3, s.S4, s.S5, s.S6, s.S7], [1, 1, 1, 1, 1, null, 1]);
  assert.equal(s.score, 1);
});

test('rambling, filler, missed marks and banned words each lose their point', () => {
  const long = Array.from({ length: 25 }, () => 'word').join(' ');
  const s = scoreScript([`say Great question! ${long}`, 'ring 10 10 30', 'say It is obviously simple.', ...Array(5).fill('say more')].join('\n'),
    { kind: 'concept', box: [[600, 300, 50, 50]], mustMention: ['vector'] });
  assert.deepEqual([s.S1, s.S2, s.S3, s.S4, s.S5, s.S7], [0, 0, 0, 0, 0, 0]);
});

test('an empty or prose-only answer does not crash', () => {
  assert.equal(scoreScript('', { kind: 'concept' }).S1, 0);
  assert.ok(scoreScript('Just some prose.', { kind: 'concept' }).bad >= 1);
});

test('every gold example scores full marks on its own style shape (scorer and style files agree)', () => {
  for (const st of loadStyles()) {
    for (const ex of st.examples) {
      const script = ex.turns.map((t) => t.script).join('\n');
      const lastTurn = ex.turns[ex.turns.length - 1].script;
      // Question Buddy's shape is about the asking turn; the others about the whole answer.
      const s = scoreScript(st.id === 'question-buddy' ? ex.turns[0].script : script, { kind: 'problem', style: st.id });
      assert.equal(s.S6, 1, `${st.id} / ${ex.title}`);
      assert.equal(s.S7, 1, `${st.id} / ${ex.title}`);
      assert.equal(scoreScript(lastTurn, { kind: 'problem' }).S1, 1, `${st.id} / ${ex.title}`);
    }
  }
  assert.deepEqual(Object.keys(SHAPES).sort(), [...STYLES].sort());
});

test('summarize averages only the checks that apply', () => {
  const a = { scores: { S1: 1, S2: 1, S3: null, S4: 1, S5: null, S6: null, S7: 1, score: 1 } };
  const b = { scores: { S1: 0, S2: 1, S3: 1, S4: null, S5: null, S6: 0, S7: 1, score: 0.6 } };
  const sum = summarize([a, b]);
  assert.deepEqual(sum.scores, { S1: 0.5, S2: 1, S3: 1, S4: 1, S5: null, S6: 0, S7: 1 });
  assert.equal(sum.score, 0.8);
});
