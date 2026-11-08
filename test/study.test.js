const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const study = require('../src/study');

const LINES = Array.from({ length: 160 }, (_, i) => [i * 6, `line ${i}`]); // a 16-min lecture, a line every 6 s
const V = (t, extra = {}) => ({ videoId: 'abcdefghijk', title: 'Redox', t, duration: 960, ...extra });

function setup(replies) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nibley-study-'));
  const calls = [], changes = [];
  const s = study.create({
    dir, transcript: () => LINES, onChange: (p) => changes.push(p),
    run: async ({ system, input }) => { calls.push({ system, input }); return JSON.stringify(replies.shift()); },
  });
  const read = (f) => JSON.parse(fs.readFileSync(path.join(dir, 'nibley', f), 'utf8'));
  return { s, calls, changes, read };
}
const IDEAS = { lecture: true, ideas: [{ t: 42, text: 'Oxidation means more bonds to O.' }, { t: 300, text: 'Reduction is the reverse.' }] };
const END = { quiz: [{ q: 'Methanol to formaldehyde?', o: ['Oxidation', 'Reduction'], r: 0, why: 'Gains a bond to O.' },
  { q: 'Most bonds to O?', o: ['Aldehyde', 'Acid'], r: 1, why: 'Acid has three.' }, { q: 'Ketone gains H?', o: ['Yes', 'No'], r: 1, why: 'That is reduction.' }],
  cards: [{ f: 'Oxidation?', b: 'More bonds to O.', t: 42 }, { f: 'Reduction?', b: 'More bonds to H.', t: 300 }] };

test('no call before 10 min; at 10 min one recap with only that part of the transcript', async () => {
  const { s, calls, read } = setup([IDEAS]);
  await s.tick(V(30)); await s.tick(V(599));
  assert.equal(calls.length, 0);
  await s.tick(V(605));
  assert.equal(calls.length, 1);
  assert.match(calls[0].input, /^0 line 0/);
  assert.doesNotMatch(calls[0].input, /\n600 line 100/);
  const p = read('study/abcdefghijk.json');
  assert.equal(p.ideas.length, 2);
  assert.equal(p.recapTo, 600);
});

test('a question lands with its video time; another video gets its own page; no video, nothing', async () => {
  const { s, read } = setup([]);
  await s.tick(V(100));
  s.addQuestion(V(308.4), { q: 'What does LEO mean?', a: 'Losing electrons is oxidation.' });
  s.addQuestion(null, { q: 'no video', a: 'x' });
  assert.deepEqual(read('study/abcdefghijk.json').questions.map((q) => [q.t, q.q]), [[308, 'What does LEO mean?']]);
  s.addQuestion(V(5, { videoId: 'zzzzzzzzzzz', title: 'Other' }), { q: 'other video', a: 'x' }); // opens that video's page
  assert.equal(read('study/zzzzzzzzzzz.json').questions.length, 1);
});

test('end of video: last recap, then 3 quiz questions + cards; a miss becomes a card; untick drops it from cards.json', async () => {
  const { s, calls, read } = setup([IDEAS, IDEAS, END]);
  await s.tick(V(605));
  assert.equal(await s.tick(V(958)), 'ended');
  assert.equal(calls.length, 3);
  assert.match(calls[2].system, /exactly 3 questions/);
  assert.match(calls[2].system, /8 flashcards/); // 16 min -> 8 cards
  let p = read('study/abcdefghijk.json');
  assert.equal(p.quiz.length, 3);
  assert.equal(read('cards.json').length, 2);
  s.answer(0, 0); s.answer(1, 0); s.answer(1, 1); // right, wrong, second tap ignored
  p = read('study/abcdefghijk.json');
  assert.equal(p.quiz[1].picked, 0);
  assert.equal(p.cards.length, 3);
  assert.equal(p.cards[2].miss, true);
  s.toggleCard(0);
  const cards = read('cards.json');
  assert.deepEqual(cards.map((c) => c.front), ['Reduction?', 'Most bonds to O?']);
  assert.equal(cards[0].state, 'new'); // FSRS fields
  assert.equal(await s.tick(V(959)), null); // ends once
});

test('not a lecture: one call, then the page hides and no more calls', async () => {
  const { s, calls, changes } = setup([{ lecture: false, ideas: [] }]);
  await s.tick(V(605)); await s.tick(V(958)); await s.tick(V(959));
  assert.equal(calls.length, 1);
  assert.equal(changes.at(-1), null);
});

test('skipping far ahead recaps only the 10 min before where he is', async () => {
  const { s, calls } = setup([IDEAS]);
  await s.tick(V(10)); await s.tick(V(1300, { duration: 3600 }));
  assert.equal(calls.length, 1);
  assert.match(calls[0].input, /^702 line 117/);
});

test('bad Claude output is logged, nothing breaks, the next tick tries again', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nibley-study-'));
  const logs = [];
  let n = 0;
  const s = study.create({ dir, transcript: () => LINES, log: (e) => logs.push(e.ev), run: async () => (++n === 1 ? 'not json' : JSON.stringify(IDEAS)) });
  await s.tick(V(605));
  assert.ok(logs.includes('study_error'));
  await s.tick(V(610));
  assert.equal(s.view().ideas.length, 2);
});

const MAP = { lecture: true, chapters: [{ t: 0, title: 'What redox means', ideas: ['Oxidation: more bonds to O.', 'Reduction: more bonds to H.'] },
  { t: 480, title: 'Ranking by bonds to O', ideas: ['Alcohol < aldehyde < acid.'] }], prereqs: ['Counting bonds on carbon'], tricky: [{ t: 520, text: 'Why the C-O bond counts as losing electrons.' }] };

test('analyze: one call over the whole transcript; chapters, basics, tricky parts; recaps stop; lecture map for questions', async () => {
  const { s, calls, read } = setup([MAP]);
  await s.tick(V(30));
  assert.equal(s.view().canAnalyze, true);
  assert.equal(await s.analyze(), true);
  assert.equal(calls.length, 1);
  assert.match(calls[0].input, /\n954 line 159\n?$/); // the whole transcript went in
  const p = read('study/abcdefghijk.json');
  assert.equal(p.analyzed, true);
  assert.equal(p.analyzedTo, null);
  assert.deepEqual(p.chapters.map((c) => c.title), ['What redox means', 'Ranking by bonds to O']);
  assert.equal(p.tricky[0].t, 520);
  assert.equal(s.view().canAnalyze, false);
  assert.match(s.context('abcdefghijk'), /^\[Lecture map \(whole video\): 0:00 What redox means; 8:00 Ranking by bonds to O\]$/);
  assert.equal(s.context('zzzzzzzzzzz'), null);
  await s.tick(V(605)); await s.tick(V(900));
  assert.equal(calls.length, 1); // no recaps after the analysis
  assert.equal(await s.analyze(), false); // once
});

test('analyze: no transcript, nothing to analyze; a failed call puts the button back', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nibley-study-'));
  const none = study.create({ dir, transcript: () => null, run: async () => assert.fail('no call') });
  await none.tick(V(30));
  assert.equal(none.view().canAnalyze, false);
  assert.equal(await none.analyze(), false);
  const bad = study.create({ dir: fs.mkdtempSync(path.join(os.tmpdir(), 'nibley-study-')), transcript: () => LINES, run: async () => 'oops' });
  await bad.tick(V(30));
  assert.equal(await bad.analyze(), false);
  assert.equal(bad.view().analyzed, null);
  assert.equal(bad.view().canAnalyze, true);
});
