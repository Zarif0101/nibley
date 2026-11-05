// Subtitle check (docs/briefs/local-app.md, Task 2). Canned answers (no Claude), real voice, real overlay.
// Every say line must show as a subtitle while its audio plays, max 2 lines, never over a mark, cleared at the end.
// Runs on a white slide and a dark YouTube frame; saves screenshots to test/out/. Run: npx electron test/subtitle-check.js
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'nibley-sub-'));
const REAL = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'settings.json'), 'utf8'));
fs.cpSync(path.join(REAL.vaultPath, 'nibley'), path.join(TMP, 'vault', 'nibley'), { recursive: true });
fs.writeFileSync(path.join(TMP, 'settings.json'), JSON.stringify({ vaultPath: path.join(TMP, 'vault'), mode: 'ask', voice: REAL.voice, pendingQuestion: null }));
process.env.NIBLEY_FAKE = '1';
process.env.NIBLEY_SETTINGS = path.join(TMP, 'settings.json');

const { app, ipcMain } = require('electron');
const brain = require('../src/brain');
const main = require('../src/main');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// 24 words (the answer guard's max, src/lint.js) but wider than 2 subtitle lines, so it must split
const LONG = 'Here is a deliberately overlong subtitle sentence because the heavier shopping trolley needs considerably stronger pushing before anything starts moving while emptier trolleys accelerate.';
const ANSWERS = {
  slide: [
    "say Newton's second law says force equals mass times acceleration.",
    'say Think of pushing a shopping cart: a full cart needs a bigger push.',
    'ring 683 650 50', // sits where the bottom subtitle goes, so the subtitle must move to the top
    `say ${LONG}`,
  ],
  diagram: ['say Each white dot is a neuron.', 'say It holds a number between zero and one.'],
};
let script = [];
brain.ask = ({ onText, onEnd }) => {
  let stop = false;
  (async () => {
    await sleep(1200);
    for (const l of script) { if (stop) return; onText(l + '\n'); await sleep(150); }
    if (!stop) onEnd(script.join('\n'));
  })();
  return { cancel() { stop = true; } };
};

const overlaps = (a, b) => a[0] < b[0] + b[2] && a[0] + a[2] > b[0] && a[1] < b[1] + b[3] && a[1] + a[3] > b[1];
const state = () => main.overlay.webContents.executeJavaScript('({ d: sub.style.display, t: sub.textContent, r: subRect, h: sub.offsetHeight, p: placed.map((x) => x) })');
const results = [];
const check = (name, pass, detail) => { results.push({ name: `subtitle ${name}`, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}  ${detail}`); };
// Timing (scorecard Q4, +-150 ms): when each subtitle shows/hides vs when its audio starts/ends, measured in the overlay.
const HOOK = `window.__t = []; { const p0 = play, s0 = showSub, h0 = hideSub;
  play = (it, text) => { const h = p0(it, text); h.started.then(() => __t.push(['aplay', performance.now()])); h.ended.then(() => __t.push(['aend', performance.now()])); return h; };
  showSub = (...a) => { __t.push(['show', performance.now()]); return s0(...a); };
  hideSub = (now) => { if (sub.style.display === 'block' && !now) __t.push(['hide', performance.now()]); return h0(now); }; } 0`; // ends in 0: executeJavaScript must not return the function

async function turn(fixture) {
  script = ANSWERS[fixture];
  const says = script.filter((l) => l.startsWith('say ')).map((l) => l.slice(4));
  let id = null, done = false, shot = false, wentTop = false;
  const atStart = [], seen = new Set(), problems = [];
  const onSend = (ch, tid) => { if (ch === 'turn' && id === null) id = tid; };
  const onVoice = async (_e, v) => {
    if (v.turn !== id) return;
    const s = await state();
    atStart.push({ i: v.i, ok: s.d === 'block' && says[v.i].startsWith(s.t), t: s.t });
    if (v.i === 1 && !shot) { shot = true; await sleep(1500); fs.writeFileSync(path.join(__dirname, 'out', `sub-${fixture}.png`), (await main.overlay.webContents.capturePage()).toPNG()); }
  };
  const ended = new Promise((r) => main.events.on('turn:done', function f(tid) { if (tid === id) { main.events.off('turn:done', f); r(); } }));
  main.events.on('send', onSend);
  ipcMain.on('voice:start', onVoice);
  await main.overlay.webContents.executeJavaScript('__t.length = 0');
  main.testTurn('explain this', fs.readFileSync(path.join(__dirname, 'fixtures', `${fixture}.png`)));
  const poll = (async () => {
    while (!done) {
      const s = await state();
      if (s.d === 'block' && s.r) {
        seen.add(s.t);
        if (s.r[1] < 384) wentTop = true; // top half: moved up with the pill and buttons (T12 stack)
        if (s.h > 2 * 28 + 16) problems.push(`3+ lines: "${s.t.slice(0, 30)}..."`);
        const hit = s.p.find((b) => overlaps(s.r, b));
        if (hit) problems.push(`covers mark at ${hit.map(Math.round)}`);
      }
      await sleep(100);
    }
  })();
  await Promise.race([ended, sleep(90000)]);
  done = true;
  await poll;
  await sleep(300);
  const after = await state();
  main.events.off('send', onSend);
  ipcMain.off('voice:start', onVoice);
  check(`${fixture}: subtitle = spoken line at each audio start`, atStart.length === says.length && atStart.every((a) => a.ok), atStart.map((a) => `#${a.i} ${a.ok ? 'ok' : `wrong "${a.t}"`}`).join(', '));
  check(`${fixture}: max 2 lines, never over a mark`, problems.length === 0, problems.slice(0, 3).join('; ') || `${seen.size} subtitles shown`);
  if (says.includes(LONG)) check(`${fixture}: long line split into parts`, [...seen].filter((t) => LONG.includes(t)).length >= 2, [...seen].filter((t) => LONG.includes(t)).map((t) => `"${t.slice(0, 25)}..."`).join(' + '));
  if (fixture === 'slide') check(`${fixture}: moved to top over the ring`, wentTop, 'see test/out/sub-slide.png');
  check(`${fixture}: cleared after the answer`, after.d === 'none', `display=${after.d}`);
  // Pair each audio start with the next subtitle show, each audio end with the next hide.
  const t = await main.overlay.webContents.executeJavaScript('__t');
  const lag = (from, to) => t.filter((e) => e[0] === from).map(([, at]) => { const n = t.find((e) => e[0] === to && e[1] >= at - 150); return n ? Math.round(n[1] - at) : null; });
  const on = lag('aplay', 'show'), off = lag('aend', 'hide'), all = [...on, ...off];
  check(`${fixture}: in sync with the voice (+-150 ms)`, all.length >= 2 * says.length && all.every((d) => d != null && Math.abs(d) <= 150), `show after audio start ${on.join('/')} ms; hide after audio end ${off.join('/')} ms`);
}

async function run() {
  await main.ready;
  await sleep(3000);
  await main.overlay.webContents.executeJavaScript(HOOK);
  await turn('slide');
  await sleep(3000);
  await turn('diagram');
  fs.writeFileSync(path.join(__dirname, 'out', 'subtitle-results.json'), JSON.stringify(results, null, 2)); // scorecard Q4
  console.log(`\n${results.filter((r) => r.pass).length}/${results.length} pass. Screens: test/out/sub-slide.png, test/out/sub-diagram.png`);
  fs.rmSync(TMP, { recursive: true, force: true });
  app.quit();
}
run().catch((e) => { console.error('SUBTITLE CHECK CRASH', e); app.quit(); });
