// Pause-while-talking check (docs/NEXT-ROUND.md phase 1 step 8, Q19), in the real app with the fake platform: the
// extension's part is played over HTTP, keys are recorded instead of pressed. Canned answers (no Claude), real voice.
// Run: npx electron test/pause-check.js
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'nibley-pause-'));
fs.mkdirSync(path.join(TMP, 'vault', 'nibley'), { recursive: true });
fs.writeFileSync(path.join(TMP, 'settings.json'), JSON.stringify({ vaultPath: path.join(TMP, 'vault'), mode: 'ask', pendingQuestion: null, bridgeToken: 'pausecheck' }));
process.env.NIBLEY_FAKE = '1';
process.env.NIBLEY_SETTINGS = path.join(TMP, 'settings.json');

const { app } = require('electron');
const brain = require('../src/brain');
const main = require('../src/main');
const platform = require('../src/platform');

let answer = '';
brain.ask = ({ onText, onEnd }) => { const t = setTimeout(() => { onText(answer); onEnd(answer); }, 300); return { cancel() { clearTimeout(t); } }; };

const results = [];
const check = (name, pass, detail = '') => { results.push(pass); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}  ${detail}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = fs.readFileSync(path.join(__dirname, 'fixtures', 'player.png'));
let paused = false;
const state = () => fetch('http://127.0.0.1:47711/state', {
  method: 'POST', headers: { 'content-type': 'application/json', 'x-nibley-token': 'pausecheck', origin: 'chrome-extension://nibleytest' },
  body: JSON.stringify({ kind: 'state', tabId: 3, state: { videoId: 'IHZwWFHWa-w', title: 'Gradient descent', t: 100, paused, duration: 1233, rate: 1, visible: true } }),
});
// The fake media key flips the video like the real one would, and the extension reports it.
const realKey = platform.key;
platform.key = async (name) => { await realKey(name); if (name === 'media_play_pause') { paused = !paused; await state(); } };
const keys = () => platform.calls.filter((c) => c[0] === 'key').map((c) => c[1]);
const done = () => new Promise((r) => main.events.once('turn:done', r));

async function turn(q, script, { reply } = {}) {
  answer = script;
  platform.calls.length = 0;
  const end = done();
  main.testTurn(q, shot, { showShot: false });
  await end;
  if (reply) { await main.handleText(reply); await sleep(500); } // "yes" runs the asked actions, no new answer
  await sleep(300);
  return keys();
}

async function run() {
  await main.ready;
  await sleep(500);
  const EXPLAIN = 'say Gradient descent walks downhill one small step at a time.\nsay Each step follows the slope.\n';

  paused = false; await state();
  let k = await turn('what is gradient descent?', EXPLAIN);
  check('playing video: paused at the first line, played again at the end', k.join() === 'media_play_pause,media_play_pause' && !paused, `keys ${k.join() || 'none'}, paused now ${paused}`);

  paused = true; await state();
  k = await turn('what is gradient descent?', EXPLAIN);
  check('already paused: no key at all', k.length === 0 && paused, `keys ${k.join() || 'none'}`);

  paused = false; await state();
  answer = 'say This is a long first answer that keeps going for a while so he can cut in.\nsay And another line after it.\n';
  platform.calls.length = 0;
  main.testTurn('explain backprop', shot, { showShot: false });
  for (let i = 0; i < 60 && !keys().length; i++) await sleep(100); // wait for the auto pause
  await sleep(400);
  k = await turn('wait, what is a gradient?', EXPLAIN); // barge-in: a new question while he talks
  check('barge-in: stays paused in between, plays once at the end of the new answer', paused === false && k.join() === 'media_play_pause', `keys in new turn ${k.join() || 'none'}`);

  paused = false; await state();
  k = await turn('pause the video', 'action key media_play_pause\n', { reply: 'yes' });
  check('Ask-first "Should I pause": no auto pause; yes pauses once, no auto resume', k.join() === 'media_play_pause' && paused, `keys ${k.join() || 'none'}, paused now ${paused}`);

  paused = true; await state();
  k = await turn('pause the video', 'action key media_play_pause\n', { reply: 'yes' });
  check('"pause the video" when already paused: key skipped (toggle would play it)', k.length === 0 && paused, `keys ${k.join() || 'none'}`);

  console.log(`\n${results.filter(Boolean).length}/${results.length} pass`);
  fs.rmSync(TMP, { recursive: true, force: true });
  app.quit();
}
run().catch((e) => { console.error('PAUSE CHECK CRASH', e); app.quit(); });
