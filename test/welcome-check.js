// Welcome + daily report consent, in the real app (fake platform, canned answers; test runs never email, they record).
// First start: the welcome asks once (Yes / No thanks, "see exactly what's sent"), then 3 optional questions; the
// profile goes out once; under 18 means no automatic screenshots; the Settings switch turns reports off again.
// Run: npx electron test/welcome-check.js
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'nibley-wel-'));
fs.mkdirSync(path.join(TMP, 'data', 'nibley'), { recursive: true });
const SET = path.join(TMP, 'settings.json');
fs.writeFileSync(SET, JSON.stringify({ dataPath: path.join(TMP, 'data'), mode: 'ask', pendingQuestion: null, ear: false, name: 'Rafi', brain: 'claude' }));
process.env.NIBLEY_FAKE = '1';
process.env.NIBLEY_SETTINGS = SET;

const { app } = require('electron');
const brain = require('../src/brain');
const main = require('../src/main');
const sidebar = require('../src/sidebar');
const feedback = require('../src/feedback');
const SAY = 'say An answer.\n';
brain.ask = ({ onText, onEnd }) => { setTimeout(() => { onText(SAY); onEnd(SAY); }, 150); return { cancel() {} }; };

const results = [];
const check = (name, pass, detail = '') => { results.push(pass); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}  ${detail}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const dom = (js) => sidebar.win.webContents.executeJavaScript(js);
const saved = () => JSON.parse(fs.readFileSync(SET, 'utf8'));
const click = (sel, i = 0) => dom(`document.querySelectorAll(${JSON.stringify(sel)})[${i}].click()`);

async function run() {
  await main.ready;
  await sleep(400);
  sidebar.open('welcome', 'welcome');
  await sleep(500);
  const shown = await dom(`document.getElementById('p-welcome').classList.contains('on')`);
  await click('#w-ex-btn');
  const ex = await dom(`document.getElementById('w-ex').textContent`);
  check('welcome shows; "see exactly what\'s sent" shows a real report with counts only', shown && /Started \d+ times, \d+ questions/.test(ex) && !/title|detail/i.test(ex), ex.split('\n').slice(0, 3).join(' | '));
  check('nothing chosen yet: no consent saved', saved().shareReports === undefined);

  await click('#w-yes');
  await sleep(400);
  const step2 = await dom(`!document.getElementById('w-step2').hidden`);
  await click('[data-q="studying"] .chip', 0); // HSC
  await click('[data-q="age"] .chip', 0); // under 18
  await click('[data-q="heard"] .chip.skip');
  await click('#w-done');
  await sleep(800);
  const s = saved();
  check('Yes + 3 optional answers saved (skip = empty)', step2 && s.shareReports === true && s.profile.studying === 'HSC' && s.profile.age === 'under 18' && s.profile.heard === null, JSON.stringify(s.profile));
  const prof = feedback.sent.find((m) => m.kind === 'new user profile');
  check('profile goes out once, without the name', prof && /Studying for: HSC/.test(prof.text) && !/Rafi/.test(prof.text) && s.profileSent === true, prof?.text.replace(/\n/g, ' | '));
  const box = await dom(`document.getElementById('fb-shot').checked`);
  check('under 18: the Feedback screen picture starts unticked', box === false);

  const done = new Promise((r) => main.events.once('turn:done', r));
  main.testTurn('what is a gradient?', fs.readFileSync(path.join(__dirname, 'fixtures', 'lecture.png')), { showShot: false });
  await Promise.race([done, sleep(8000)]);
  await sleep(300);
  await main.handleText('Not helpful', main.state.turnId);
  await sleep(300);
  const nh = feedback.sent.filter((m) => m.kind === 'not helpful').at(-1);
  check('under 18: "Not helpful" goes without a screenshot', nh && nh.png === false, JSON.stringify(nh && { png: nh.png }));

  sidebar.open('test', 'settings');
  await sleep(300);
  await click('#rep');
  await sleep(400);
  check('Settings switch turns the daily report off', saved().shareReports === false && (await dom(`document.getElementById('rep').getAttribute('aria-checked')`)) === 'false');
  fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
  sidebar.open('test', 'welcome');
  await sleep(400);
  fs.writeFileSync(path.join(__dirname, 'out', 'welcome-panel.png'), (await sidebar.win.webContents.capturePage()).toPNG());
  console.log(`\n${results.filter(Boolean).length}/${results.length} pass`);
  app.exit(0);
}
run().catch((e) => { console.error('WELCOME CHECK CRASH', e); app.exit(1); });
