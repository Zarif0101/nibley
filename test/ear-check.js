// Lecture ear check (ARCHITECTURE-v2 section 3) in the real app: real system-audio loopback, real Groq, stubbed Claude.
// Plays a known lecture clip out loud (like any video would), presses the hotkey, and checks what Claude gets.
// Also: silence sends nothing, Nibley's own voice isn't transcribed, nothing is sent during a "call".
// Needs the Groq key. Run: npx electron test/ear-check.js   (about 2 minutes, plays sound)
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'nibley-ear-'));
fs.mkdirSync(path.join(TMP, 'vault', 'nibley'), { recursive: true });
fs.writeFileSync(path.join(TMP, 'settings.json'), JSON.stringify({ dataPath: path.join(TMP, 'vault'), mode: 'ask', pendingQuestion: null }));
process.env.NIBLEY_FAKE = '1';
process.env.NIBLEY_SETTINGS = path.join(TMP, 'settings.json');

const { app, BrowserWindow, ipcMain } = require('electron');
const brain = require('../src/brain');
const main = require('../src/main');
const fake = require('../src/platform/fake');
const ear = require('../src/ear');

const CLIP = path.join(__dirname, 'fixtures', 'lecture-clip.wav'); // Piper: "So the gradient tells you which direction is downhill..."
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let asked = null, answer = 'say Okay.';
brain.ask = ({ video, onEnd }) => { asked = video || ''; setTimeout(() => onEnd(answer), 200); return { cancel() {} }; };
let pieces = 0;
ipcMain.on('ear:piece', () => pieces++);
const results = [];
const check = (name, pass, detail = '') => { results.push(pass); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}  ${detail}`); };

// Plays the clip from a separate hidden window, the way a browser or player would.
async function playClip() {
  const w = new BrowserWindow({ show: false, webPreferences: { autoplayPolicy: 'no-user-gesture-required' } });
  const page = path.join(TMP, 'player.html'); // a file page may load a local file; a data: page may not
  fs.writeFileSync(page, `<audio id="a" src="${'file:///' + CLIP.replaceAll('\\', '/')}"></audio>`);
  await w.loadFile(page);
  const ms = await w.webContents.executeJavaScript(`new Promise((r) => { const a = document.getElementById('a'); a.onended = () => r(Math.round(a.duration * 1000)); a.onerror = () => r(-1); a.play().catch(() => r(-2)); setTimeout(() => r(-3), 20000); })`);
  w.destroy();
  return ms;
}
const tapHotkey = async () => { fake.emitPtt('ptt_down'); await sleep(100); fake.emitPtt('ptt_up'); }; // a tap: cuts the piece, no question
function turn(q) {
  asked = null;
  return new Promise((resolve) => {
    let id = null;
    const onSend = (ch, tid) => { if (ch === 'turn' && id === null) id = tid; };
    const done = (tid) => { if (tid !== id) return; main.events.off('send', onSend); main.events.off('turn:done', done); resolve(); };
    main.events.on('send', onSend);
    main.events.on('turn:done', done);
    main.testTurn(q, fs.readFileSync(path.join(__dirname, 'fixtures', 'slide.png')), { showShot: false });
    setTimeout(resolve, 30000);
  });
}

async function run() {
  const ready = new Promise((r) => ipcMain.once('ear', (_e, s) => r(s)));
  await main.ready;
  const status = await Promise.race([ready, sleep(10000).then(() => ({ ok: false, err: 'no answer from the overlay' }))]);
  check('overlay records the system sound', status.ok, status.err || '');
  if (!status.ok) return finish();

  await sleep(31000); // a full 30 s piece of (near) silence
  check('silence: nothing sent to Groq', pieces === 0, `${pieces} pieces sent`);

  const ms = await playClip();
  await tapHotkey();
  await turn('what did he just say?');
  check('the clip reaches Claude as "heard"', /gradient/i.test(asked) && /downhill/i.test(asked), JSON.stringify(asked).slice(0, 200));
  check('block names the window and says how long ago', /^\[On screen: "Lecture - YouTube - Brave"\]/.test(asked) && /\d:\d\d ago {2}/.test(asked), `clip ${ms} ms`);

  answer = 'say Bananas are a yellow fruit that grows in big bunches.';
  await turn('tell me about bananas');
  await sleep(1500);
  await tapHotkey();
  await ear.settled(3000);
  check("Nibley's own voice is not transcribed", !/banana/i.test(ear.context() || ''), JSON.stringify((ear.context() || '').split('\n').at(-1)));

  fake.micApps = ['C:#Program Files#Zoom#bin#Zoom.exe'];
  const lines = () => (ear.context() || '').split('\n').length; // "ago" times change, so count lines
  const before = lines();
  await playClip();
  await tapHotkey();
  await ear.settled(3000);
  check('during a call nothing new is transcribed', lines() === before, `${before} -> ${lines()} lines`);
  fake.micApps = [];
  finish();
}
function finish() {
  console.log(`\n${results.filter(Boolean).length}/${results.length} pass`);
  fs.rmSync(TMP, { recursive: true, force: true });
  app.quit();
}
run().catch((e) => { console.error('EAR CHECK CRASH', e); app.quit(); });
