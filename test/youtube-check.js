// YouTube check (in the real app, no extension): the fake platform plays the browser window Nibley reads, a fake
// fetch plays YouTube's caption API. The question sent to Claude must carry the video and the right transcript part.
// Run: npx electron test/youtube-check.js
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'nibley-yt-'));
fs.mkdirSync(path.join(TMP, 'vault', 'nibley'), { recursive: true });
fs.writeFileSync(path.join(TMP, 'settings.json'), JSON.stringify({ dataPath: path.join(TMP, 'vault'), mode: 'ask', pendingQuestion: null }));
process.env.NIBLEY_FAKE = '1';
process.env.NIBLEY_SETTINGS = path.join(TMP, 'settings.json');

const { app } = require('electron');
const brain = require('../src/brain');
const main = require('../src/main');
const youtube = require('../src/youtube');
const platform = require('../src/platform'); // fake: Brave on the video's page (NEXT-ROUND phase 1 step 5 source line)
platform.foregroundWin = { title: 'Gradient descent - YouTube - Brave', exe: 'brave' };
platform.browserUrlNow = 'youtube.com/watch?v=IHZwWFHWa-w';

let asked = null;
brain.ask = ({ text, video, onEnd }) => { asked = { text, video }; setTimeout(() => onEnd('say Okay.'), 300); return { cancel() {} }; };

const results = [];
const check = (name, pass, detail = '') => { results.push(pass); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}  ${detail}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const lines = Array.from({ length: 80 }, (_, i) => [i * 6, `gradient line ${i}`]); // every 6 s, 0:00-7:54

async function run() {
  await main.ready;
  let fetched = 0;
  await youtube.start({ platform, vaultPath: path.join(TMP, 'vault'), log: () => {}, fetchTranscript: async (id) => { fetched++; return id === 'IHZwWFHWa-w' ? { lines, lang: 'en', auto: false, title: 'Gradient descent', duration: 1233 } : { reason: 'no captions' }; } });
  check('no YouTube window: no video', youtube.current() === null);
  platform.ytNow = { title: '(2) Gradient descent - YouTube - Brave', url: 'youtube.com/watch?v=IHZwWFHWa-w', t: 252, duration: 1233, paused: true };
  await youtube.poll();
  await sleep(200);
  const v = youtube.current();
  check('video read from the browser window: id, clean title, time, paused', v?.videoId === 'IHZwWFHWa-w' && v.title === 'Gradient descent' && v.t === 252 && v.paused, JSON.stringify(v));
  check('transcript fetched once and saved in the app data', fetched === 1 && fs.existsSync(path.join(TMP, 'vault', 'nibley', 'videos', 'IHZwWFHWa-w.json')));
  await youtube.poll();
  check('second read: no second fetch', fetched === 1);

  main.testTurn('what did he just say?', fs.readFileSync(path.join(__dirname, 'fixtures', 'diagram.png')), { showShot: false });
  for (let i = 0; i < 50 && !asked; i++) await sleep(100);
  const block = asked?.video || '';
  check('question keeps his words only', asked?.text === 'what did he just say?', JSON.stringify(asked?.text));
  const vLines = block.split('\n'); // the teacher header ([nibley] style=...) comes first since C1
  const srcLine = vLines.find((l) => l.startsWith('[Source:')), videoLine = vLines.find((l) => l.startsWith('[Video:'));
  check('source line names page, link and video time', srcLine === '[Source: Gradient descent - YouTube | youtube.com/watch?v=IHZwWFHWa-w | 4:12 of 20:33]', srcLine);
  check('video block names the video and time', videoLine?.startsWith('[Video: "Gradient descent" at 4:12 of 20:33, paused]'), videoLine);
  check('transcript part is 2:12-4:42', block.includes('[Transcript 2:12-4:42]') && block.includes('2:12 gradient line 22') && block.includes('4:42 gradient line 47') && !block.includes('gradient line 48'), `${vLines.length} lines`);

  platform.calls.length = 0;
  check('time link opens the video at that time in a new tab', youtube.seek(125.7) && platform.calls.some((c) => c[0] === 'openUrl' && c[1] === 'https://www.youtube.com/watch?v=IHZwWFHWa-w&t=125s'), JSON.stringify(platform.calls));
  platform.ytNow = null;
  await youtube.poll();
  check('browser closed: video gone', youtube.current() === null);
  console.log(`\n${results.filter(Boolean).length}/${results.length} pass`);
  fs.rmSync(TMP, { recursive: true, force: true });
  app.quit();
}
run().catch((e) => { console.error('YOUTUBE CHECK CRASH', e); app.quit(); });
