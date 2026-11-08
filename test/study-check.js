// Study page check in the real app (fake platform, fake extension over HTTP, Claude replaced by fixed replies).
// A question lands with its video time, the 10-min recap adds ideas, the video's end opens the sidebar on Study with
// the quick check + cards, a wrong answer becomes a card, untick updates cards.json, a time link reaches the extension.
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
const calls = [];
memory.runClaude = async ({ system }) => { const kind = /exactly 3 questions/.test(system) ? 'end' : 'recap'; calls.push(kind); return JSON.stringify(REPLIES[kind]); };

const { app } = require('electron');
const brain = require('../src/brain');
const main = require('../src/main');
const sidebar = require('../src/sidebar');
const SAY = 'say LEO means losing electrons is oxidation.\n';
brain.ask = ({ onText, onEnd }) => { setTimeout(() => { onText(SAY); onEnd(SAY); }, 200); return { cancel() {} }; };

const results = [];
const check = (name, pass, detail = '') => { results.push(pass); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}  ${detail}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const VID = 'bJMUKNbAsTY';
const post = (body) => fetch('http://127.0.0.1:47712/state', {
  method: 'POST', headers: { 'content-type': 'application/json', 'x-nibley-token': main.state.settings.bridgeToken, origin: 'chrome-extension://nibleytest' }, body: JSON.stringify(body),
}).then((r) => r.json());
const state = (t, paused = false) => post({ kind: 'state', tabId: 3, state: { videoId: VID, title: 'Organic oxidation-reduction reactions', t, paused, duration: 960, rate: 1, visible: true } });
const until = async (fn, ms = 9000) => { for (let i = 0; i < ms / 100; i++) { const v = await fn(); if (v) return v; await sleep(100); } return null; };
const dom = (js) => sidebar.win.webContents.executeJavaScript(js);

async function run() {
  await main.ready;
  await sleep(500);
  await post({ kind: 'transcript', tabId: 3, videoId: VID, title: 'Organic oxidation-reduction reactions', duration: 960, lines: Array.from({ length: 160 }, (_, i) => [i * 6, `redox line ${i}`]) });

  await state(308, true);
  main.testTurn('what does LEO mean here?', fs.readFileSync(path.join(__dirname, 'fixtures', 'lecture.png')), { showShot: false });
  const q = await until(() => main.study.view()?.questions[0]);
  check('question lands on the page with its video time', q?.t === 308 && /LEO means/.test(q.a), JSON.stringify(q));

  await state(605);
  const ideas = await until(() => main.study.view()?.ideas.length === 2);
  check('10-min recap adds 2 ideas (one Claude call)', ideas && calls.join() === 'recap', calls.join());

  await state(958);
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

  await dom(`document.querySelector('.idea .t').click()`);
  await sleep(200);
  const reply = await state(958, true);
  check('time link: the extension gets {seek: 42} on its next report', reply.seek === 42, JSON.stringify(reply));

  fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
  await dom(`document.getElementById('p-study').scrollTop = 0`);
  fs.writeFileSync(path.join(__dirname, 'out', 'study-sidebar.png'), (await sidebar.win.webContents.capturePage()).toPNG());
  check('study page file in the app data folder', fs.existsSync(path.join(TMP, 'data', 'nibley', 'study', `${VID}.json`)));
  console.log(`\n${results.filter(Boolean).length}/${results.length} pass`);
  app.exit(0);
}
run().catch((e) => { console.error('STUDY CHECK CRASH', e); app.exit(1); });
