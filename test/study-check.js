// Study page check in the real app (fake platform plays the browser window, Claude replaced by fixed replies, no extension).
// A question lands with its video time, the 10-min recap adds ideas, the video's end opens the sidebar on Study with
// the quick check + cards, a wrong answer becomes a card, untick updates cards.json, a time link opens the video there.
// Second video: "Analyze this video" maps the whole lecture in one call and Nibley gets the map with questions.
// Run: npx electron test/study-check.js     Saves test/out/study-sidebar.png
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'nibley-study-app-'));
fs.mkdirSync(path.join(TMP, 'data', 'nibley'), { recursive: true });
fs.writeFileSync(path.join(TMP, 'settings.json'), JSON.stringify({ dataPath: path.join(TMP, 'data'), mode: 'ask', pendingQuestion: null, ear: false }));
process.env.NIBLEY_FAKE = '1';
process.env.NIBLEY_SETTINGS = path.join(TMP, 'settings.json');

const memory = require('../src/memory');
const REPLIES = {
  recap: { lecture: true, ideas: [{ t: 42, text: 'Oxidation means the carbon gains bonds to oxygen.' }, { t: 300, text: 'Reduction is the reverse: more bonds to hydrogen.' }] },
  end: { quiz: [{ q: 'Methanol becomes formaldehyde. What happened?', o: ['Oxidation', 'Reduction'], r: 0, why: 'It gained a bond to O.' },
    { q: 'Which has the most bonds to O?', o: ['Aldehyde', 'Carboxylic acid'], r: 1, why: 'The acid has three.' },
    { q: 'A ketone gains two H. Oxidation?', o: ['Yes', 'No'], r: 1, why: 'Gaining H is reduction.' }],
  cards: [{ f: 'Oxidation in organic chemistry?', b: 'Carbon gains bonds to O or loses bonds to H.', t: 42 },
    { f: 'Reduction in organic chemistry?', b: 'Carbon gains bonds to H or loses bonds to O.', t: 300 },
    { f: 'LEO GER', b: 'Losing electrons is oxidation, gaining electrons is reduction.', t: 308 }] },
};
REPLIES.analyze = { lecture: true, chapters: [{ t: 0, title: 'Gradients and slopes', ideas: ['A gradient points uphill.', 'Step the other way to go down.'] },
  { t: 300, title: 'Learning rate', ideas: ['Too big a step overshoots the minimum.'] }], prereqs: ['Derivatives of one variable'], tricky: [{ t: 330, text: 'Why a large learning rate makes the loss jump.' }] };
const calls = [];
memory.runClaude = async ({ system }) => {
  const kind = /exactly 3 questions/.test(system) ? 'end' : /map it for them/.test(system) ? 'analyze' : 'recap';
  calls.push(kind);
  return JSON.stringify(REPLIES[kind]);
};

const { app } = require('electron');
const brain = require('../src/brain');
const main = require('../src/main');
const sidebar = require('../src/sidebar');
const youtube = require('../src/youtube');
const platform = require('../src/platform'); // fake
const SAY = 'say LEO means losing electrons is oxidation.\n';
let asked = null;
brain.ask = ({ video, onText, onEnd }) => { asked = video; setTimeout(() => { onText(SAY); onEnd(SAY); }, 200); return { cancel() {} }; };

const results = [];
const check = (name, pass, detail = '') => { results.push(pass); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}  ${detail}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const VID = 'bJMUKNbAsTY', VID2 = 'IHZwWFHWa-w';
const LINES = Array.from({ length: 160 }, (_, i) => [i * 6, `line ${i}`]);
// The browser window Nibley reads (no extension): set what the fake YouTube tab shows, then read it.
const show = (id, t, paused = false, title = 'Organic oxidation-reduction reactions') => { platform.ytNow = { title: `${title} - YouTube - Brave`, url: `youtube.com/watch?v=${id}`, t, duration: 960, paused }; return youtube.poll(); };
const until = async (fn, ms = 9000) => { for (let i = 0; i < ms / 100; i++) { const v = await fn(); if (v) return v; await sleep(100); } return null; };
const dom = (js) => sidebar.win.webContents.executeJavaScript(js);

async function run() {
  await main.ready;
  await youtube.start({ platform, vaultPath: path.join(TMP, 'data'), log: () => {}, fetchTranscript: async () => ({ lines: LINES, lang: 'en', auto: false, duration: 960 }) });
  await sleep(300);

  await show(VID, 308, true);
  main.testTurn('what does LEO mean here?', fs.readFileSync(path.join(__dirname, 'fixtures', 'lecture.png')), { showShot: false });
  const q = await until(() => main.study.view()?.questions[0]);
  check('question lands on the page with its video time', q?.t === 308 && /LEO means/.test(q.a), JSON.stringify(q));

  await show(VID, 605);
  const ideas = await until(() => main.study.view()?.ideas.length === 2);
  check('10-min recap adds 2 ideas (one Claude call)', ideas && calls.join() === 'recap', calls.join());

  await show(VID, 958);
  const opened = await until(() => sidebar.isOpen() && main.study.view()?.ended);
  check('end of video: sidebar opens with the page finished', !!opened, calls.join());
  await sleep(400);
  const shown = await dom(`({ tab: document.getElementById('t-study').getAttribute('aria-selected'), quiz: document.querySelectorAll('.quiz').length,
    cards: document.querySelectorAll('.fc').length, ideas: document.querySelectorAll('.idea').length, qs: document.querySelectorAll('.qa').length })`);
  check('Study tab shows 4 ideas (2 recaps), question, 3 quiz questions, 3 cards', shown.tab === 'true' && shown.quiz === 3 && shown.cards === 3 && shown.ideas === 4 && shown.qs === 1, JSON.stringify(shown));

  await dom(`document.querySelectorAll('.quiz')[1].querySelectorAll('.o')[0].click()`);
  await sleep(300);
  const after = await dom(`({ wrong: document.querySelectorAll('.o.wrong').length, cards: document.querySelectorAll('.fc').length, fb: document.querySelectorAll('.fb')[0]?.textContent })`);
  check('wrong answer: marked, explained, added as a card', after.wrong === 1 && after.cards === 4 && /Added as a card/.test(after.fb), JSON.stringify(after));

  await dom(`document.querySelectorAll('.fc')[0].click()`);
  await sleep(300);
  const cards = JSON.parse(fs.readFileSync(path.join(TMP, 'data', 'nibley', 'cards.json'), 'utf8'));
  const foot = await dom(`document.querySelector('.foot').textContent`);
  check('untick: cards.json keeps 3, footer says 3', cards.length === 3 && !cards.some((c) => c.front.startsWith('Oxidation in')) && /^3 cards/.test(foot), foot);

  platform.calls.length = 0;
  await dom(`document.querySelector('.idea .t').click()`);
  await sleep(300);
  check('time link opens the video at 0:42 in a new tab', platform.calls.some((c) => c[0] === 'openUrl' && c[1] === `https://www.youtube.com/watch?v=${VID}&t=42s`), JSON.stringify(platform.calls));
  fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
  await dom(`document.getElementById('p-study').scrollTop = 0`);
  fs.writeFileSync(path.join(__dirname, 'out', 'study-sidebar.png'), (await sidebar.win.webContents.capturePage()).toPNG());

  // Second video: analyze it before watching
  calls.length = 0;
  await show(VID2, 5, true, 'Gradient descent');
  await until(() => main.study.view()?.id === VID2 && main.study.view().canAnalyze);
  sidebar.open('test', 'study');
  await sleep(400);
  const btn = await dom(`document.querySelector('.analyze .go')?.textContent`);
  check('new lecture: "Analyze this video" button shows', btn === 'Analyze this video', btn);
  await dom(`document.querySelector('.analyze .go').click()`);
  const mapped = await until(() => main.study.view()?.analyzed === true);
  await sleep(400);
  const page = await dom(`({ chapters: document.querySelectorAll('.chap').length, basics: document.querySelectorAll('.basics li').length, button: !!document.querySelector('.analyze'),
    tricky: [...document.querySelectorAll('h3')].some((h) => h.textContent === 'Tricky parts') })`);
  check('analysis: one call; 2 chapters, 1 basic, tricky parts; button gone', mapped && calls.join() === 'analyze' && page.chapters === 2 && page.basics === 1 && page.tricky && !page.button, `${calls.join()} ${JSON.stringify(page)}`);
  fs.writeFileSync(path.join(__dirname, 'out', 'study-analyzed.png'), (await sidebar.win.webContents.capturePage()).toPNG());

  asked = null;
  main.testTurn('will he explain the learning rate?', fs.readFileSync(path.join(__dirname, 'fixtures', 'lecture.png')), { showShot: false });
  await until(() => asked);
  check('questions now carry the lecture map', /\[Lecture map \(whole video\): 0:00 Gradients and slopes; 5:00 Learning rate\]/.test(asked || ''), (asked || '').split('\n').find((l) => l.startsWith('[Lecture map')));
  await show(VID2, 700);
  await sleep(6000);
  check('no 10-min recap after the analysis', !calls.includes('recap'), calls.join());
  check('study pages in the app data folder', fs.existsSync(path.join(TMP, 'data', 'nibley', 'study', `${VID}.json`)) && fs.existsSync(path.join(TMP, 'data', 'nibley', 'study', `${VID2}.json`)));
  console.log(`\n${results.filter(Boolean).length}/${results.length} pass`);
  app.exit(0);
}
run().catch((e) => { console.error('STUDY CHECK CRASH', e); app.exit(1); });
