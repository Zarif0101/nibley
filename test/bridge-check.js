// Bridge check (ARCHITECTURE-v2 section 3, in the real app): play the extension's part over HTTP, then check that the
// question sent to Claude carries the video and the right transcript part. No Chrome, no Claude needed.
// Run: npx electron test/bridge-check.js
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'nibley-bridge-'));
fs.mkdirSync(path.join(TMP, 'vault', 'nibley'), { recursive: true });
fs.writeFileSync(path.join(TMP, 'settings.json'), JSON.stringify({ vaultPath: path.join(TMP, 'vault'), mode: 'ask', pendingQuestion: null }));
process.env.NIBLEY_FAKE = '1';
process.env.NIBLEY_SETTINGS = path.join(TMP, 'settings.json');

const { app } = require('electron');
const brain = require('../src/brain');
const main = require('../src/main');
const platform = require('../src/platform'); // fake: Brave on the video's page (NEXT-ROUND phase 1 step 5 source line)
platform.foregroundWin = { title: 'Gradient descent - YouTube - Brave', exe: 'brave' };
platform.browserUrlNow = 'youtube.com/watch?v=IHZwWFHWa-w';

let asked = null;
brain.ask = ({ text, video, onEnd }) => { asked = { text, video }; setTimeout(() => onEnd('say Okay.'), 300); return { cancel() {} }; };

const results = [];
const check = (name, pass, detail = '') => { results.push(pass); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}  ${detail}`); };
const post = (body, origin = 'chrome-extension://nibleytest') => fetch('http://127.0.0.1:47711/state', {
  method: 'POST', headers: { 'content-type': 'application/json', 'x-nibley-token': main.state.settings.bridgeToken, origin }, body: JSON.stringify(body),
}).then((r) => r.status);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function run() {
  await main.ready;
  await sleep(500);
  const configBefore = fs.existsSync(path.join(__dirname, '..', 'extension', 'config.js')) && fs.readFileSync(path.join(__dirname, '..', 'extension', 'config.js'), 'utf8');
  const lines = Array.from({ length: 80 }, (_, i) => [i * 6, `gradient line ${i}`]); // every 6 s, 0:00-7:54
  check('bridge accepts the extension', (await post({ kind: 'transcript', tabId: 7, videoId: 'IHZwWFHWa-w', title: 'Gradient descent', duration: 1233, lines })) === 200);
  check('bridge refuses a web page', (await post({ kind: 'gone', tabId: 7 }, 'https://www.youtube.com')) === 403);
  await post({ kind: 'state', tabId: 7, state: { videoId: 'IHZwWFHWa-w', title: 'Gradient descent', t: 252, paused: true, duration: 1233, rate: 1, visible: true } });
  main.testTurn('what did he just say?', fs.readFileSync(path.join(__dirname, 'fixtures', 'diagram.png')), { showShot: false });
  for (let i = 0; i < 50 && !asked; i++) await sleep(100);
  const v = asked?.video || '';
  check('question keeps his words only', asked?.text === 'what did he just say?', JSON.stringify(asked?.text));
  const [srcLine, videoLine] = v.split('\n');
  check('source line names page, link and video time', srcLine === '[Source: Gradient descent - YouTube | youtube.com/watch?v=IHZwWFHWa-w | 4:12 of 20:33]', srcLine);
  check('video block names the video and time', videoLine?.startsWith('[Video: "Gradient descent" at 4:12 of 20:33, paused]'), videoLine);
  check('transcript part is 2:12-4:42', v.includes('[Transcript 2:12-4:42]') && v.includes('2:12 gradient line 22') && v.includes('4:42 gradient line 47') && !v.includes('gradient line 48'), `${v.split('\n').length - 2} lines`);
  check('transcript saved in the vault', fs.existsSync(path.join(TMP, 'vault', 'nibley', 'videos', 'IHZwWFHWa-w.json')));
  const configAfter = fs.existsSync(path.join(__dirname, '..', 'extension', 'config.js')) && fs.readFileSync(path.join(__dirname, '..', 'extension', 'config.js'), 'utf8');
  check('test run left the real extension config alone', configBefore === configAfter);
  console.log(`\n${results.filter(Boolean).length}/${results.length} pass`);
  fs.rmSync(TMP, { recursive: true, force: true });
  app.quit();
}
run().catch((e) => { console.error('BRIDGE CHECK CRASH', e); app.quit(); });
