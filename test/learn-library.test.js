const test = require('node:test');
const assert = require('node:assert/strict');
const { loadLibrary, createLibrary, parseNote } = require('../src/learn/library');

const lib = loadLibrary();

test('loads every topic from the real library', () => {
  assert.equal(lib.topics.length, 229);
  assert.equal(lib.get('newtons-second-law').subject, 'physics');
  assert.equal(lib.get('nope'), null);
});

test('prerequisite graph walks both ways', () => {
  assert.deepEqual(lib.prereqs('newtons-second-law'), ['free-body-diagrams', 'acceleration']);
  const anc = lib.ancestors('newtons-second-law');
  assert.ok(anc.includes('arithmetic-basics'));
  assert.ok(!anc.includes('newtons-second-law'));
  assert.ok(anc.indexOf('acceleration') < anc.indexOf('arithmetic-basics'), 'nearest first');
  assert.ok(lib.dependents('acceleration').includes('newtons-second-law'));
  assert.ok(lib.descendants('fractions-decimals').includes('newtons-second-law'));
  assert.equal(lib.depth('arithmetic-basics'), 0);
  assert.ok(lib.depth('newtons-second-law') > lib.depth('acceleration'));
});

test('parses a note into its parts', () => {
  const n = lib.note('newtons-second-law');
  assert.equal(n.title, "Newton's second law");
  assert.equal(n.checks.length, 3);
  assert.ok(n.checks[0].a.startsWith('3 m/s'));
  assert.equal(n.flashcards.length, 5);
  assert.deepEqual(n.rootChecks.map((r) => r.prereq), ['free-body-diagrams', 'acceleration']);
  assert.equal(n.rootChecks[1].a, '2 m/s².');
  assert.equal(n.mistakes.length, 3);
});

test('every note in the library parses fully', () => {
  for (const t of lib.topics) {
    const n = lib.note(t.id);
    assert.ok(n, t.id);
    assert.equal(n.checks.length, 3, t.id);
    assert.ok(n.checks.every((c) => c.q && c.a), t.id);
    assert.equal(n.flashcards.length, 5, t.id);
    assert.deepEqual(n.rootChecks.map((r) => r.prereq).sort(), [...t.prereqs].sort(), t.id);
  }
});

test('questionsFor puts root checks from harder topics first', () => {
  const qs = lib.questionsFor('acceleration');
  assert.ok(qs.length > 3);
  assert.equal(qs[0].kind, 'root');
  assert.ok(qs.some((q) => q.source === 'newtons-second-law'));
  assert.equal(qs.filter((q) => q.kind === 'check').length, 3);
});

test('cardsFor gives stable card ids', () => {
  const cards = lib.cardsFor('ph-scale');
  assert.equal(cards.length, 5);
  assert.equal(cards[0].id, 'ph-scale#1');
  assert.ok(cards[0].q && cards[0].a);
});

test('findTopics matches free text to topics', () => {
  assert.equal(lib.findTopics("what is newton's second law")[0].id, 'newtons-second-law');
  assert.equal(lib.findTopics('integration by parts')[0].id, 'integration-by-parts');
  assert.equal(lib.findTopics('photosynthesis in leaves', { subject: 'biology' })[0].id, 'photosynthesis');
  assert.deepEqual(lib.findTopics('the and of'), []);
});

test('createLibrary works without notes', () => {
  const small = createLibrary([
    { id: 'a', subject: 'maths', level: 'foundation', title: 'A', summary: 's', prereqs: [], assets: [] },
    { id: 'b', subject: 'maths', level: '11', title: 'B', summary: 's', prereqs: ['a'], assets: [] },
  ]);
  assert.deepEqual(small.ancestors('b'), ['a']);
  assert.equal(small.note('b'), null);
  assert.deepEqual(small.questionsFor('a'), []);
  assert.equal(parseNote('# T\n## Root check\nnone\n').rootChecks.length, 0);
});
