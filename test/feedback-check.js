// Feedback check in the real app (fake platform, canned answers, nothing emailed: test runs only record what would go).
// Helpful / Not helpful shows on the first plain answer and then 1 in 3; "Not helpful" sends the question, answer and
// screenshot; the sidebar's Feedback panel sends his words with a picture of the screen.
// Run: npx electron test/feedback-check.js
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'nibley-fb-'));
fs.mkdirSync(path.join(TMP, 'data', 'nibley'), { recursive: true });
fs.writeFileSync(path.join(TMP, 'settings.json'), JSON.stringify({ dataPath: path.join(TMP, 'data'), mode: 'ask', pendingQuestion: null, ear: false, name: 'Rafi', brain: 'claude' }));
process.env.NIBLEY_FAKE = '1';
process.env.NIBLEY_SETTINGS = path.join(TMP, 'settings.json');

const { app } = require('electron');
const brain = require('../src/brain');
const main = require('../src/main');
const sidebar = require('../src/sidebar');
const feedback = require('../src/feedback');
const SAY = 'say Gradient descent walks downhill one small step at a time.\n';
brain.ask = ({ onText, onEnd }) => { setTimeout(() => { onText(SAY); onEnd(SAY); }, 150); return { cancel() {} }; };

const results = [];
const check = (name, pass, detail = '') => { results.push(pass); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}  ${detail}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = fs.readFileSync(path.join(__dirname, 'fixtures', 'lecture.png'));
let rated = [];
main.events.on('send', (ch, id, item) => { if (ch === 'item' && item?.kind === 'choices' && item.options.join() === 'Helpful,Not helpful') rated.push(id); });
async function turn(q) {
  const done = new Promise((r) => main.events.once('turn:done', r));
  main.testTurn(q, shot, { showShot: false });
  await Promise.race([done, sleep(8000)]);
  await sleep(300);
  return main.state.turnId;
}

async function run() {
  await main.ready;
  await sleep(500);
  const ids = [];
  for (let i = 1; i <= 4; i++) ids.push(await turn(`question ${i}`));
  check('Helpful / Not helpful on answer 1, then on answer 4 only', rated.join() === `${ids[0]},${ids[3]}`, `rated ${rated.join()} of ${ids.join()}`);

  await main.handleText('Not helpful', main.state.turnId);
  await sleep(300);
  const nh = feedback.sent.find((s) => s.kind === 'not helpful');
  check('"Not helpful" sends the question, the answer and the screenshot', nh && /Question: question 4/.test(nh.text) && /walks downhill/.test(nh.text) && nh.png, JSON.stringify(nh));

  sidebar.open('test');
  await sleep(400);
  const dom = (js) => sidebar.win.webContents.executeJavaScript(js);
  await dom(`document.getElementById('fb-open').click()`);
  const shown = await dom(`document.getElementById('p-feedback').classList.contains('on')`);
  await dom(`document.getElementById('fb-text').value = 'The voice cut off in the middle.'; document.getElementById('fb-send').click()`);
  await sleep(1500);
  const status = await dom(`document.getElementById('fb-status').textContent`);
  const fb = feedback.sent.find((s) => s.kind === 'feedback');
  check('Feedback panel: opens, sends his words with a screen picture, says thanks', shown && fb && /voice cut off/.test(fb.text) && fb.png && /Thank you/.test(status), `${status} ${JSON.stringify(fb)}`);
  check('details name the brain and version', /Nibley \d+\.\d+\.\d+ \| Brain: claude/.test(fb?.details || ''), fb?.details);
  fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'out', 'feedback-panel.png'), (await sidebar.win.webContents.capturePage()).toPNG());
  console.log(`\n${results.filter(Boolean).length}/${results.length} pass`);
  app.exit(0);
}
run().catch((e) => { console.error('FEEDBACK CHECK CRASH', e); app.exit(1); });
