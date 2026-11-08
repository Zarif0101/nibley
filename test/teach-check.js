// Teacher-talk check (NEXT-ROUND C1, 2026-11-08), real Claude, fake platform, Windows/Piper voice.
// Asks a run of questions over a real lecture screenshot, then "explain again". Checks: every answer gets a style header,
// "Makes sense?" checks never come closer than once in 3 answers, "explain again" switches style, answers stay short.
// Run: npx electron test/teach-check.js
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'nibley-teach-'));
fs.mkdirSync(path.join(TMP, 'vault', 'nibley'), { recursive: true });
fs.writeFileSync(path.join(TMP, 'settings.json'), JSON.stringify({ dataPath: path.join(TMP, 'vault'), mode: 'ask', model: 'haiku', pendingQuestion: null, ear: false }));
process.env.NIBLEY_FAKE = '1';
process.env.NIBLEY_SETTINGS = path.join(TMP, 'settings.json');

const { app } = require('electron');
const main = require('../src/main');
const tts = require('../src/tts');
tts.synth = () => Promise.reject(new Error('teach-check: no Edge'));

const results = [];
const check = (name, pass, detail = '') => { results.push(pass); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}  ${detail}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shotFile = path.join(__dirname, 'out', 'aim-lecture', 'shot-2.png');
const shot = fs.readFileSync(fs.existsSync(shotFile) ? shotFile : path.join(__dirname, 'fixtures', 'lecture.png'));
const QS = ['what does oxidation mean here?', 'why does the carbon go from plus one to plus three?', 'what is an oxidation state?',
  'what does LEO GER stand for?', 'is the right molecule a carboxylic acid?', 'how do I find the oxidation state of a carbon?'];

function turn(text) {
  return new Promise((resolve) => {
    let id = null;
    const out = { says: [], choices: [], teach: null };
    const onSend = (ch, tid, it) => {
      if (ch === 'turn' && id === null) id = tid;
      if (ch !== 'item' || tid !== id) return;
      if (it.kind === 'say') out.says.push(it.text);
      if (it.kind === 'choices') out.choices.push(it.options);
    };
    const onLog = (e) => { out.teach = e; };
    const fin = () => { main.events.off('send', onSend); main.events.off('teach', onLog); clearTimeout(t); resolve(out); };
    const onDone = (tid) => tid === id && (main.events.off('turn:done', onDone), fin());
    const t = setTimeout(fin, 90000);
    main.events.on('send', onSend);
    main.events.on('teach', onLog);
    main.events.on('turn:done', onDone);
    main.testTurn(text, shot, { showShot: false });
  });
}

async function run() {
  await main.ready;
  await sleep(4000);
  const rows = [];
  for (const q of [...QS, 'explain that again, simpler']) {
    const r = await turn(q);
    const checked = r.choices.some((o) => o.some((x) => /explain again/i.test(x)));
    rows.push({ q, ...r, checked });
    console.log(`${r.teach?.style ?? '?'} check=${r.teach?.check ?? '?'}${checked ? ' CHECKED' : ''} | ${r.says.length} lines | ${q} -> ${r.says[0] ?? '(none)'}${r.choices.length ? ` [${r.choices.map((o) => o.join('|')).join('; ')}]` : ''}`);
    await sleep(800);
  }
  check('every answer got a style header', rows.every((r) => r.teach?.style), rows.map((r) => r.teach?.style).join(', '));
  const at = rows.map((r, i) => (r.checked ? i : -1)).filter((i) => i >= 0);
  check('checks never closer than once in 3 answers', at.every((v, i) => i === 0 || v - at[i - 1] >= 3), `checks at ${JSON.stringify(at)}`);
  check('checks only where the header allowed', rows.every((r) => !r.checked || r.teach?.check === 'ok'));
  const again = rows.at(-1), before = rows.at(-2);
  check('"explain again" switches style', again.teach?.style && again.teach.style !== before.teach?.style && again.teach.feedback === 0, `${before.teach?.style} -> ${again.teach?.style}`);
  check('answers stay short (<= 5 say lines)', rows.every((r) => r.says.length <= 5), rows.map((r) => r.says.length).join(','));
  console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
  fs.rmSync(TMP, { recursive: true, force: true });
  app.quit();
}
run().catch((e) => { console.error('TEACH CHECK CRASH', e); app.quit(); });
