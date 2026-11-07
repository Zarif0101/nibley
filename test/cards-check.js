// Note-card check (docs/NEXT-ROUND.md phase 3 v2, 2026-11-08), in the real app with the fake platform and canned
// answers (no Claude), real overlay. Checks: cards draw with a line and a soft mark, at most 2 stay, they fade ~5 s after
// the answer, and they clear at once when the foreground window changes. Saves test/out/cards-*.png.
// Run: npx electron test/cards-check.js
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'nibley-cards-'));
fs.mkdirSync(path.join(TMP, 'vault', 'nibley'), { recursive: true });
fs.writeFileSync(path.join(TMP, 'settings.json'), JSON.stringify({ vaultPath: path.join(TMP, 'vault'), mode: 'ask', pendingQuestion: null, ear: false }));
process.env.NIBLEY_FAKE = '1';
process.env.NIBLEY_SETTINGS = path.join(TMP, 'settings.json');

const { app } = require('electron');
const brain = require('../src/brain');
const main = require('../src/main');
const platform = require('../src/platform');
const tts = require('../src/tts');
tts.synth = () => Promise.reject(new Error('cards-check: no Edge')); // backup voice; spares Edge's free service

const ANSWER = `say LEO is a memory trick for oxidation.
note 640 120 60 30 | LEO | Lose Electrons = Oxidation
say This carbon gives up a bond to H and takes one to O.
note 300 320 70 60 | This carbon | Loses C–H, gains C–O: oxidised
say So the left molecule is oxidised.
note 640 175 60 30 | GER | Gain Electrons = Reduction
title LEO GER`;
brain.ask = ({ onText, onEnd }) => { const t = setTimeout(() => { onText(ANSWER); onEnd(ANSWER); }, 300); return { cancel() { clearTimeout(t); } }; };

const results = [];
const check = (name, pass, detail = '') => { results.push(pass); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}  ${detail}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const done = () => new Promise((r) => main.events.once('turn:done', r));
const frame = path.join(__dirname, 'out', 'aim-lecture', 'shot-2.png'); // 1365x768, as the app captures it
const shot = fs.readFileSync(fs.existsSync(frame) ? frame : path.join(__dirname, 'fixtures', 'lecture.png'));
const count = () => main.overlay.webContents.executeJavaScript(`({ cards: document.querySelectorAll('.card').length, strokes: document.querySelectorAll('#svg g').length })`);
const snap = async (name) => fs.writeFileSync(path.join(__dirname, 'out', `cards-${name}.png`), (await main.overlay.webContents.capturePage()).toPNG());

async function run() {
  await main.ready;
  await sleep(1500);
  // 1. Draw, cap at 2, fade after ~5 s
  let end = done();
  main.testTurn('what does LEO mean?', shot);
  await end;
  const t0 = Date.now();
  await sleep(1200);
  const a = await count();
  await snap('answer');
  check('cards drawn, max 2 on screen', a.cards === 2, JSON.stringify(a));
  check('each card has a line and a soft mark', a.strokes === 4, `${a.strokes} strokes`);
  await sleep(Math.max(0, 3500 - (Date.now() - t0)));
  check('still there 3.5 s after the answer', (await count()).cards === 2);
  await sleep(Math.max(0, 6500 - (Date.now() - t0)));
  const b = await count();
  check('gone ~5 s after the answer', b.cards === 0 && b.strokes === 0, JSON.stringify(b));
  // 2. Window switch clears at once
  end = done();
  main.testTurn('what does LEO mean?', shot);
  await end;
  await sleep(1200);
  const before = (await count()).cards;
  platform.foregroundWin = { title: 'WhatsApp - Brave', exe: 'brave' };
  const t1 = Date.now();
  let gone = false;
  while (Date.now() - t1 < 3000 && !gone) { await sleep(100); gone = (await count()).cards === 0; }
  check('cleared when the window changed', before > 0 && gone, `before ${before}, after ${Date.now() - t1} ms`);
  platform.foregroundWin = { title: 'Lecture - YouTube - Brave', exe: 'brave' };
  console.log(`\n${results.filter(Boolean).length}/${results.length} passed`);
  fs.rmSync(TMP, { recursive: true, force: true });
  app.quit();
}
run().catch((e) => { console.error('CARDS CHECK CRASH', e); app.quit(); });
