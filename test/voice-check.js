// Voice check (docs/briefs/local-app.md, Task 1). Real Claude, real Edge voice, fake hotkey, scratch vault.
// 3 questions on the current voice, switch voice in the tray code, 3 more, then Edge unreachable (like no internet):
// every line must be the chosen Edge voice while online, and Piper when Edge can't be reached.
// Run: npx electron test/voice-check.js   (about 3 minutes)
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'nibley-voice-'));
const REAL = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'settings.json'), 'utf8'));
fs.cpSync(path.join(REAL.vaultPath, 'nibley'), path.join(TMP, 'vault', 'nibley'), { recursive: true });
fs.writeFileSync(path.join(TMP, 'settings.json'), JSON.stringify({ vaultPath: path.join(TMP, 'vault'), mode: 'ask', voice: REAL.voice, pendingQuestion: null }));
process.env.NIBLEY_FAKE = '1';
process.env.NIBLEY_SETTINGS = path.join(TMP, 'settings.json');

const { app } = require('electron');
const { MsEdgeTTS } = require('msedge-tts');
const brain = require('../src/brain');
const main = require('../src/main');
const tts = require('../src/tts');

const GAP = Number(process.env.GAP_S || 20) * 1000; // pause between questions, like a real study session
const shot = (n) => fs.readFileSync(path.join(__dirname, 'fixtures', `${n}.png`));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rows = [];

// VOICE_STUB=1: a canned 4-line answer instead of Claude, so only the voice is tested (also works while Claude's
// login is expired). It starts after a talk time (3, 8, 12 s: the key is held while he speaks) plus 1.2 s for Claude.
if (process.env.VOICE_STUB) {
  const TALK = [3000, 8000, 12000];
  let n = 0;
  brain.ask = ({ onText, onEnd }) => {
    const lines = ['say This is the transpose of a matrix.\n', 'ring 683 384 60 rows\n', 'say Think of flipping the grid over its diagonal.\n',
      'say Each row becomes a column.\n', 'say So the first row turns into the first column.\n'];
    let stop = false;
    (async () => {
      await sleep(TALK[n++ % TALK.length] + 1200);
      for (const l of lines) { if (stop) return; onText(l); await sleep(150); }
      if (!stop) onEnd(lines.join(''));
    })();
    return { cancel() { stop = true; } };
  };
}

// One turn: the voice source of every say line, in order.
function turn(text, fixture) {
  return new Promise((resolve) => {
    const srcs = [];
    let id = null;
    const onSend = (ch, tid, it) => {
      if (ch === 'turn') id = tid;
      if (ch === 'item' && tid === id && it.kind === 'audio') srcs[it.i] = it.src;
    };
    const finish = () => { main.events.off('send', onSend); main.events.off('turn:done', onDone); clearTimeout(timer); resolve(srcs); };
    const onDone = (tid) => tid === id && finish();
    const timer = setTimeout(finish, 90000);
    main.events.on('send', onSend);
    main.events.on('turn:done', onDone);
    if (fixture) main.testTurn(text, shot(fixture)); else main.setVoice(text);
  });
}

async function step(label, text, fixture, want) {
  const srcs = await turn(text, fixture);
  const pass = srcs.length > 0 && srcs.every((s) => s === want);
  rows.push(pass);
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${label}: ${srcs.join(', ') || 'no audio'} (want ${want})`);
}

async function run() {
  await main.ready;
  await sleep(4000); // both Claude processes finish their warm-up
  const qs = [['what does this mean?', 'lecture'], ['what are these circles?', 'diagram'], ['what is this formula?', 'slide']];
  console.log(`voice ${REAL.voice}, ${GAP / 1000} s between questions`);
  for (const [i, [q, f]] of qs.entries()) { await step(`Q${i + 1} ${REAL.voice}`, q, f, 'edge'); await sleep(GAP); }
  const other = REAL.voice === 'en-GB-SoniaNeural' ? 'en-US-AvaMultilingualNeural' : 'en-GB-SoniaNeural';
  await step(`switch to ${other} (sample line)`, other, null, 'edge');
  for (const [i, [q, f]] of qs.entries()) { await sleep(GAP); await step(`Q${i + 4} ${other}`, q, f, 'edge'); }
  // Offline: Edge's address can't be found, same as no internet. Piper must speak every line.
  const url = MsEdgeTTS.WSS_URL;
  MsEdgeTTS.WSS_URL = 'wss://edge-offline.invalid/consumer/speech/synthesize/readaloud/edge/v1';
  await tts.init(other).catch(() => {});
  await step('offline Q7', 'what does this mean?', 'lecture', 'piper');
  // Back online: the failed connection must not block Edge for the next answer.
  MsEdgeTTS.WSS_URL = url;
  await sleep(GAP);
  await step('back online Q8', 'what is this formula?', 'slide', 'edge');
  console.log(`\n${rows.filter(Boolean).length}/${rows.length} pass. Log: logs/test/nibley-${new Date().toLocaleDateString('sv')}.log`);
  fs.rmSync(TMP, { recursive: true, force: true });
  app.quit();
}

run().catch((e) => { console.error('VOICE CHECK CRASH', e); app.quit(); });
