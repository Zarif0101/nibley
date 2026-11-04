const test = require('node:test');
const assert = require('node:assert/strict');
const { loadStyles, section, ORDER } = require('../src/styles');
const { STYLES } = require('../src/learn/style');
const { parseAll } = require('../src/script');
const { createLint } = require('../src/lint');

const styles = loadStyles();
const words = (s) => s.trim().split(/\s+/).length;

test('all five styles load, in the same order as the style picker', () => {
  assert.deepEqual(styles.map((s) => s.id), STYLES);
  assert.deepEqual(ORDER, STYLES);
});

test('each card starts with its STYLE id and stays under 120 words', () => {
  for (const s of styles) {
    assert.ok(s.card.startsWith(`STYLE ${s.id}:`), s.id);
    assert.ok(words(s.card) <= 120, `${s.id}: ${words(s.card)} words`);
  }
});

test('every gold example parses cleanly, needs no answer-guard fixes, and keeps the ten rules', () => {
  for (const s of styles) {
    assert.equal(s.examples.length, 2, s.id);
    for (const ex of s.examples) {
      assert.ok(ex.turns.length >= 1);
      for (const t of ex.turns) {
        const cmds = parseAll(t.script);
        assert.ok(cmds.every((c) => c.type !== 'bad' && !c.prose), `${s.id} / ${ex.title}: ${JSON.stringify(cmds.filter((c) => c.type === 'bad' || c.prose))}`);
        const lint = createLint();
        for (const c of cmds) assert.deepEqual(lint.check(c).fixes, [], `${s.id} / ${ex.title}: ${JSON.stringify(c)}`);
        const says = cmds.filter((c) => c.type === 'say');
        assert.ok(says.length >= 1 && says.length <= 5, `${s.id} / ${ex.title}: ${says.length} say lines`);
        assert.ok(words(says[0].text) <= 15, `${s.id} / ${ex.title}: first line ${words(says[0].text)} words`);
        for (const l of says) assert.ok(words(l.text) <= 20, `${s.id} / ${ex.title}: "${l.text}"`);
        assert.ok(cmds.some((c) => c.type === 'title'), `${s.id} / ${ex.title}: no title`);
      }
    }
  }
});

test('the prompt section contains every card and stays small', () => {
  const text = section();
  for (const s of styles) assert.ok(text.includes(s.card));
  assert.ok(words(text) <= 900, `${words(text)} words`);
  assert.ok(words(section({ examplesPerStyle: 2 })) > words(text));
});
