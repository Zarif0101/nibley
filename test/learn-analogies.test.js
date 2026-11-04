const test = require('node:test');
const assert = require('node:assert/strict');
const { loadAnalogies, findAnalogies, analogyLine } = require('../src/learn/analogies');
const { snapshot, tokens, MAX_TOKENS } = require('../src/learn/snapshot');
const { loadLibrary } = require('../src/learn/library');
const model = require('../src/learn/model');

const list = loadAnalogies();

test('finds the right analogy for everyday questions on many subjects', () => {
  const cases = [
    ['what is a variable in python', 'variable-name-tag'], ['explain recursion to me', 'recursion-nesting-dolls'], ['what does an API do', 'api-waiter'],
    ['how does DNS work', 'dns-phone-contacts'], ['what is a hash map', 'dictionary-drawers'], ['why is there a cache', 'cache-fridge'],
    ['what is compound interest', 'compound-interest-snowball'], ['what is voltage', 'voltage-water-pressure'], ['how do enzymes work', 'enzyme-lock-key'],
    ['what is a derivative', 'derivative-speedometer'], ['what is a deadlock', 'deadlock-narrow-bridge'], ['what is working memory', 'working-memory-desk'],
  ];
  for (const [q, id] of cases) assert.equal(findAnalogies(list, q)[0]?.id, id, q);
});

test('a linked library topic beats keywords; domain and exclude filter', () => {
  assert.equal(findAnalogies(list, 'explain this', { topic: 'newtons-first-law' })[0].id, 'inertia-shopping-cart');
  assert.ok(findAnalogies(list, 'what is a function', { domain: 'maths' }).every((a) => a.domain === 'maths'));
  assert.notEqual(findAnalogies(list, 'what is a variable', { exclude: ['variable-name-tag'] })[0]?.id, 'variable-name-tag');
  assert.deepEqual(findAnalogies(list, 'tell me a joke'), []);
});

test('every analogy names where it breaks (Teaching-With-Analogies step 5)', () => {
  for (const a of list) assert.ok(a.breaks && a.breaks.length > 10, a.id);
});

test('the snapshot offers a fresh analogy only when none has worked yet, within budget', () => {
  const lib = loadLibrary();
  const a = findAnalogies(list, 'what is inertia', { topic: 'newtons-first-law' })[0];
  const s = snapshot({ style: 'doodle-story', pace: { words: 16, lines: 4, rate: 0 }, topic: 'newtons-first-law', lib, model: model.createModel(), analogy: a });
  assert.match(s, /try analogy: Inertia is a full shopping cart/);
  assert.ok(tokens(s) <= MAX_TOKENS);
  const w = snapshot({ style: 'doodle-story', topic: 'newtons-first-law', lib, analogy: a, worked: [{ topic: 'newtons-first-law', analogy: 'a bus braking', at: 1 }] });
  assert.ok(!/try analogy/.test(w) && /worked before/.test(w));
  assert.equal(analogyLine(null), '');
});
