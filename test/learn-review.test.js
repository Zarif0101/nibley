const test = require('node:test');
const assert = require('node:assert/strict');
const { loadLibrary } = require('../src/learn/library');
const M = require('../src/learn/model');
const F = require('../src/learn/fsrs');
const R = require('../src/learn/review');

const lib = loadLibrary();
const DAY = 86400000;
const T0 = Date.UTC(2026, 10, 4, 10);
const NOW = T0 + 30 * DAY;

// A card reviewed once at T0 with stability `s`, so its retrievability at NOW is set by s.
const reviewed = (id, s) => ({ ...F.rate(F.createCard(id, id.split('#')[0], T0), 3, T0), stability: s, due: T0 + DAY });
const dueCards = (n, topics = lib.topics.map((t) => t.id)) => Array.from({ length: n }, (_, i) => reviewed(`${topics[i % topics.length]}#${(i % 5) + 1}`, 1 + i));
const topicOf = (it) => (it.type === 'card' ? it.card.topic : it.topic);

test('an empty learner gets an empty queue', () => {
  const q = R.buildQueue(lib, M.createModel(), [], { now: NOW });
  assert.deepEqual(q, { items: [], backlog: 0, freshStart: false });
});

test('the queue never exceeds size and counts the leftover as backlog', () => {
  const cards = dueCards(25);
  const q = R.buildQueue(lib, M.createModel(), cards, { now: NOW });
  assert.equal(q.items.length, 10);
  assert.equal(q.backlog, 15);
  assert.equal(q.freshStart, false);
  assert.equal(R.buildQueue(lib, M.createModel(), cards, { now: NOW, size: 4 }).items.length, 4);
});

test('due cards come lowest retrievability first and not-yet-due cards are left out', () => {
  const topics = ['arithmetic-basics', 'fractions-decimals', 'ratios-percentages', 'powers-roots', 'scientific-notation'];
  const cards = topics.map((t, i) => reviewed(`${t}#1`, [5, 1, 9, 3, 7][i]));
  cards.push({ ...reviewed('algebra-basics#1', 2), due: NOW + DAY });
  const q = R.buildQueue(lib, M.createModel(), cards, { now: NOW });
  const r = q.items.map((it) => F.retrievability(it.card, NOW));
  assert.equal(q.items.length, 5);
  assert.deepEqual(r, [...r].sort((a, b) => a - b));
  assert.equal(q.items[0].card.stability, 1);
});

test('new cards come from topics he touched, at most maxNew, after due cards', () => {
  let m = M.noteAsked(M.createModel(), 'fractions-decimals', { at: NOW - 1000 });
  m = M.noteAsked(m, 'powers-roots', { at: NOW - 500 });
  m = M.noteAsked(m, 'scientific-notation', { at: NOW - 2000 });
  const q = R.buildQueue(lib, m, [reviewed('arithmetic-basics#1', 2)], { now: NOW });
  const kinds = q.items.map((it) => (it.card ? it.card.state : it.type));
  assert.equal(kinds.filter((k) => k === 'new').length, 2);
  assert.equal(q.items.length, 3);
  assert.deepEqual(q.items.filter((it) => it.card.state === 'new').map(topicOf).sort(), ['fractions-decimals', 'powers-roots']);
  assert.equal(R.buildQueue(lib, m, [], { now: NOW, maxNew: 1 }).items.length, 1);
  assert.equal(R.buildQueue(lib, m, [], { now: NOW, maxNew: 0 }).items.length, 0);
});

test('new cards are not offered twice and respect the size cap', () => {
  const m = M.noteAsked(M.createModel(), 'fractions-decimals', { at: NOW });
  const have = lib.cardsFor('fractions-decimals').map((c) => F.rate(F.createCard(c.id, c.topic, T0), 3, T0));
  assert.equal(R.buildQueue(lib, m, have.map((c) => ({ ...c, due: NOW + DAY })), { now: NOW }).items.length, 0);
  assert.equal(R.buildQueue(lib, m, dueCards(10), { now: NOW }).items.filter((it) => it.card && it.card.state === 'new').length, 0);
});

test('weak items: open gaps first, then misconceptions, then shaky; capped by maxWeak', () => {
  let m = M.createModel();
  m = M.observe(m, 'powers-roots', { correct: false, at: NOW - 3 * DAY });
  m = M.observe(m, 'algebra-basics', { correct: true, at: NOW - 2 * DAY });
  m = M.observe(m, 'algebra-basics', { correct: false, at: NOW - DAY, sure: true });
  m = M.observe(m, 'scientific-notation', { correct: false, at: NOW - DAY });
  m = M.observe(m, 'fractions-decimals', { correct: false, at: NOW - DAY });
  m = M.openGap(m, 'fractions-decimals', { at: NOW - DAY });
  m = M.openGap(m, 'arithmetic-basics', { at: NOW - 5 * DAY });
  const q = R.buildQueue(lib, m, [], { now: NOW });
  const weak = q.items.filter((it) => it.type === 'root');
  assert.equal(weak.length, 3);
  assert.deepEqual(weak.map((it) => it.topic).sort(), ['algebra-basics', 'arithmetic-basics', 'fractions-decimals']);
  for (const it of weak) assert.ok(it.question.q && it.question.topic === it.topic);
  assert.equal(R.buildQueue(lib, m, [], { now: NOW, maxWeak: 1, maxNew: 0 }).items.length, 1);
  assert.equal(R.buildQueue(lib, m, [], { now: NOW, maxWeak: 1, maxNew: 0 }).items[0].topic, 'arithmetic-basics', 'oldest gap first');
  const shakyOnly = M.observe(M.createModel(), 'powers-roots', { correct: false, at: NOW - DAY });
  assert.equal(R.buildQueue(lib, shakyOnly, [], { now: NOW }).items[0].topic, 'powers-roots');
});

test('weak questions keep their slots when many cards are due', () => {
  const m = M.openGap(M.createModel(), 'arithmetic-basics', { at: NOW - DAY });
  const q = R.buildQueue(lib, m, dueCards(30), { now: NOW });
  assert.equal(q.items.length, 10);
  assert.equal(q.items.filter((it) => it.type === 'root').length, 1);
  assert.equal(q.backlog, 21);
});

test('no two items of the same topic in a row when another order exists', () => {
  // 4 cards of topic A (lowest R) and 4 of B, C, D: naive order would put the A cards together.
  const mk = (t, n, s) => Array.from({ length: n }, (_, i) => reviewed(`${t}#${i + 1}`, s + i / 100));
  const cards = [...mk('arithmetic-basics', 4, 1), ...mk('fractions-decimals', 2, 5), ...mk('powers-roots', 2, 6), ...mk('algebra-basics', 2, 7)];
  const q = R.buildQueue(lib, M.createModel(), cards, { now: NOW });
  assert.equal(q.items.length, 10);
  for (let i = 1; i < q.items.length; i++) assert.notEqual(topicOf(q.items[i]), topicOf(q.items[i - 1]), `position ${i}`);
});

test('interleaving still finds an order when the greedy pick would dead-end', () => {
  const mk = (t, n, s) => Array.from({ length: n }, (_, i) => reviewed(`${t}#${i + 1}`, s + i / 100));
  const cards = [...mk('fractions-decimals', 1, 1), ...mk('powers-roots', 1, 2), ...mk('arithmetic-basics', 3, 3)];
  const q = R.buildQueue(lib, M.createModel(), cards, { now: NOW });
  for (let i = 1; i < q.items.length; i++) assert.notEqual(topicOf(q.items[i]), topicOf(q.items[i - 1]));
});

test('when only one topic exists the queue still serves it', () => {
  const cards = [1, 2, 3].map((n) => reviewed(`arithmetic-basics#${n}`, n));
  assert.equal(R.buildQueue(lib, M.createModel(), cards, { now: NOW }).items.length, 3);
});

test('freshStart only when the backlog is over 60', () => {
  const ids = lib.topics.map((t) => t.id);
  const many = (n) => Array.from({ length: n }, (_, i) => reviewed(`${ids[i % ids.length]}#${Math.floor(i / ids.length) + 1}`, 1 + i / 50));
  assert.equal(R.buildQueue(lib, M.createModel(), many(70), { now: NOW }).freshStart, false); // backlog 60 exactly
  const q = R.buildQueue(lib, M.createModel(), many(71), { now: NOW });
  assert.equal(q.backlog, 61);
  assert.equal(q.freshStart, true);
  assert.equal(R.buildQueue(lib, M.createModel(), many(70), { now: NOW }).backlog, 60);
});

test('answerItem on a card updates both the card and the model', () => {
  const card = reviewed('fractions-decimals#1', 3);
  const out = R.answerItem(lib, { model: M.createModel(), cards: [card] }, { type: 'card', card }, { correct: true }, { at: NOW });
  assert.equal(out.cards.length, 1);
  assert.equal(out.cards[0].reps, 2);
  assert.equal(out.cards[0].last, NOW);
  assert.ok(out.cards[0].due > NOW);
  assert.equal(out.model.topics['fractions-decimals'].seen, 1);
  assert.ok(out.model.topics['fractions-decimals'].p > M.PARAMS.prior);
  assert.equal(out.model.topics['fractions-decimals'].lastKind, 'review');
});

test('a wrong card answer is a lapse and lowers the model', () => {
  const card = reviewed('fractions-decimals#1', 3);
  const out = R.answerItem(lib, { model: M.createModel(), cards: [card] }, { type: 'card', card }, { correct: false }, { at: NOW });
  assert.equal(out.cards[0].lapses, 1);
  assert.ok(out.cards[0].stability < card.stability);
  assert.ok(out.model.topics['fractions-decimals'].p < M.PARAMS.prior);
});

test('answering a new card adds it to the deck; a hint grades Hard', () => {
  const [c] = lib.cardsFor('powers-roots');
  const card = F.createCard(c.id, c.topic, NOW);
  const out = R.answerItem(lib, { model: M.createModel(), cards: [] }, { type: 'card', card }, { correct: true, hintLevel: 1 }, { at: NOW });
  assert.equal(out.cards.length, 1);
  assert.equal(out.cards[0].stability, F.FSRS_PARAMS[1]); // Hard first review
});

test('answerItem on a root question only updates the model', () => {
  const card = reviewed('x#1', 3);
  const m0 = M.createModel();
  const question = lib.questionsFor('fractions-decimals')[0];
  const out = R.answerItem(lib, { model: m0, cards: [card] }, { type: 'root', topic: 'fractions-decimals', question }, { correct: false, sure: true }, { at: NOW });
  assert.deepEqual(out.cards, [card]);
  assert.equal(out.model.topics['fractions-decimals'].misconception, true);
  assert.equal(out.model.topics['fractions-decimals'].lastKind, 'review');
});

test('inputs are never mutated, and a card map works as input', () => {
  const m = M.openGap(M.observe(M.createModel(), 'powers-roots', { correct: false, at: T0 }), 'powers-roots', { at: T0 });
  const cards = dueCards(12);
  const snap = JSON.stringify({ m, cards });
  const q = R.buildQueue(lib, m, cards, { now: NOW });
  assert.equal(JSON.stringify({ m, cards }), snap);
  const qSnap = JSON.stringify(q);
  const item = q.items.find((it) => it.type === 'card');
  const out = R.answerItem(lib, { model: m, cards }, item, { correct: true }, { at: NOW });
  assert.equal(JSON.stringify({ m, cards }), snap);
  assert.equal(JSON.stringify(q), qSnap);
  assert.notEqual(out.cards, cards);
  const map = Object.fromEntries(cards.map((c) => [c.id, c]));
  assert.equal(R.buildQueue(lib, m, map, { now: NOW }).items.length, 10);
});
