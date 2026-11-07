// Real turns for the scorecard (QUALITY-PLAN T0, SPEED-TOKEN-PLAN P0): real Claude, real Edge voice, real overlay,
// fixture screenshots instead of the screen, typed questions instead of the mic, scratch vault.
// Run: npx electron test/turns.js [count] [--switch N [--to voiceId]] [--offline N]   (GAP_S=20 between questions)
// Then: node test/scorecard.js
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'nibley-turns-'));
const REAL = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'settings.json'), 'utf8'));
fs.cpSync(path.join(REAL.vaultPath, 'nibley'), path.join(TMP, 'vault', 'nibley'), { recursive: true });
fs.writeFileSync(path.join(TMP, 'settings.json'), JSON.stringify({ vaultPath: path.join(TMP, 'vault'), mode: 'ask', voice: REAL.voice, model: REAL.model, pendingQuestion: null }));
process.env.NIBLEY_FAKE = '1';
process.env.NIBLEY_SETTINGS = path.join(TMP, 'settings.json');

const { app } = require('electron');
const main = require('../src/main');

const COUNT = Number(process.argv.find((a) => /^\d+$/.test(a)) || 5);
const GAP = Number(process.env.GAP_S || 20) * 1000;
const arg = (k) => (process.argv.includes(`--${k}`) ? process.argv[process.argv.indexOf(`--${k}`) + 1] : null);
const SWITCH = arg('switch') ? Number(arg('switch')) : -1; // switch voice (to --to <id>) before this turn
const { MsEdgeTTS } = require('msedge-tts');
const QS = [['what does this mean?', 'lecture'], ['explain this', 'diagram'], ['how do I turn on captions?', 'player'],
  ['can you say that again, even simpler?', 'lecture'], ['what is the part on the left?', 'diagram']];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function turn(text, fixture) {
  return new Promise((resolve) => {
    let id = null;
    const onSend = (ch, tid) => { if (ch === 'turn' && id === null) id = tid; };
    const finish = (why) => { main.events.off('send', onSend); main.events.off('turn:done', onDone); clearTimeout(timer); resolve(why); };
    const onDone = (tid) => tid === id && finish('done');
    const timer = setTimeout(() => finish('timeout'), 90000);
    main.events.on('send', onSend);
    main.events.on('turn:done', onDone);
    main.testTurn(text, fs.readFileSync(path.join(__dirname, 'fixtures', `${fixture}.png`)));
  });
}

async function run() {
  await main.ready;
  await sleep(4000); // both Claude processes finish their warm-up
  for (let i = 0; i < COUNT; i++) {
    if (i === SWITCH) { // QUALITY-PLAN T1: the voice picked in the tray must play right after a switch too
      const other = arg('to') || main.VOICES.map((v) => v[1]).find((v) => v !== main.state.settings.voice);
      console.log(`switch voice to ${other}`);
      await main.setVoice(other);
      await sleep(GAP);
    }
    const [q, f] = QS[i % QS.length];
    const t0 = Date.now();
    console.log(`turn ${i + 1}/${COUNT} "${q}" on ${f}: ${await turn(q, f)} in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    if (i < COUNT - 1) await sleep(GAP);
  }
  // --offline N: Edge unreachable (like no internet), N more turns; Piper must speak (logged as line_voice offline).
  for (let i = 0; i < Number(arg('offline') || 0); i++) {
    if (i === 0) { MsEdgeTTS.WSS_URL = 'wss://edge-offline.invalid/consumer/speech/synthesize/readaloud/edge/v1'; await require('../src/tts').init(main.state.settings.voice).catch(() => {}); }
    const [q, f] = QS[i % QS.length];
    console.log(`offline turn ${i + 1}: ${await turn(q, f)}`);
    await sleep(GAP);
  }
  fs.rmSync(TMP, { recursive: true, force: true });
  app.quit();
}

run().catch((e) => { console.error('TURNS CRASH', e); app.quit(); });
