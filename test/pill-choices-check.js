// Live check for QUALITY-PLAN T12 (pill order + spot) and T13 (answer buttons), on the real screen.
// T12: 20 hotkey presses (fake hotkey, typed question, real screenshot, real Claude, Piper voice), half released before
//      the screenshot is done. Every press must show listening -> thinking -> speaking -> none, and no pill before the
//      screenshot. Saves pill pictures to test/out/pill-*.png.
// T13: "pause the video" in Ask-first mode (Claude stubbed: always the pause action), real helper for keys and clicks,
//      real mouse moves and key presses, a white test page under the overlay. 5 times each: click Yes, Enter, typing,
//      15 s timeout, click elsewhere. Then 3 real-Claude turns that should end with a choices line.
// Run: npx electron test/pill-choices-check.js [--skip-t12]
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFile } = require('node:child_process');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'nibley-pill-'));
const REAL = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'settings.json'), 'utf8'));
fs.cpSync(path.join(REAL.dataPath || path.join(process.env.APPDATA, 'nibley'), 'nibley'), path.join(TMP, 'vault', 'nibley'), { recursive: true });
fs.writeFileSync(path.join(TMP, 'settings.json'), JSON.stringify({ dataPath: path.join(TMP, 'vault'), mode: 'ask', voice: REAL.voice, pendingQuestion: null, ear: false }));
process.env.NIBLEY_FAKE = '1';
process.env.NIBLEY_SETTINGS = path.join(TMP, 'settings.json');

const { app, BrowserWindow, screen } = require('electron');
const main = require('../src/main');
const fake = require('../src/platform/fake');
const real = require('../src/platform/windows');
const brain = require('../src/brain');
const tts = require('../src/tts');
const stt = require('../src/stt');
tts.synth = () => Promise.reject(new Error('pill-check: Piper only')); // keeps Edge's free service out of it

const OUT = path.join(__dirname, 'out');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const report = (name, pass, detail) => { results.push({ name, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}  ${detail}`); };
const ps = (cmd) => new Promise((r) => execFile('powershell.exe', ['-NoProfile', '-Command', cmd], { windowsHide: true }, () => r()));
// Key taps as a person makes them (keybd_event, not tagged as Nibley's own input). Not WScript SendKeys: it taps NumLock
// first, which counts as typing and ends the grab. Every tap is guarded: it is sent only while the test page has focus,
// so a test key never lands in another app (2026-11-05: SendKeys typed into the Claude window).
let inj = null;
function inject(line) {
  if (!inj) {
    const f = path.join(TMP, 'tap.ps1');
    fs.writeFileSync(f, [
      'Add-Type -TypeDefinition @"',
      'using System; using System.Runtime.InteropServices;',
      'public static class K { [DllImport("user32.dll")] static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);',
      '  [DllImport("user32.dll")] static extern void mouse_event(uint f, int x, int y, uint d, UIntPtr extra);',
      '  [DllImport("user32.dll")] static extern int GetSystemMetrics(int i);',
      '  public static void Tap(byte vk) { keybd_event(vk, 0, 0, UIntPtr.Zero); keybd_event(vk, 0, 2, UIntPtr.Zero); }',
      '  public static void Move(int x, int y) { mouse_event(0x8001, x * 65535 / (GetSystemMetrics(0) - 1), y * 65535 / (GetSystemMetrics(1) - 1), 0, UIntPtr.Zero); } }',
      '"@',
      '[Console]::Out.WriteLine("ready")',
      'while ($true) { $l = [Console]::In.ReadLine(); if ($l -eq $null) { break }; $a = $l.Split(" "); if ($a[0] -eq "m") { [K]::Move([int]$a[1], [int]$a[2]) } else { [K]::Tap([byte][int]$a[0]) }; [Console]::Out.WriteLine("ok") }',
    ].join('\n'));
    const p = require('node:child_process').spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', f], { windowsHide: true });
    inj = { p, wait: [] };
    require('node:readline').createInterface({ input: p.stdout }).on('line', () => inj.wait.shift()?.());
    inj.ready = new Promise((r) => inj.wait.push(r));
  }
  return inj.ready.then(() => new Promise((r) => { inj.wait.push(r); inj.p.stdin.write(`${line}\n`); }));
}
const tap = (vk) => inject(String(vk));
// A real pointer glide onto (x, y), like a hand on the mouse: 6 moves, 40 ms apart.
async function glide(x, y) { for (let i = 1; i <= 6; i++) { await inject(`m ${Math.round(x - 60 + i * 10)} ${y}`); await sleep(40); } }
const pageFocused = async () => /Nibley key test/.test((await real.foreground()).title);
async function safeTap(vk) {
  if (!(await pageFocused())) { console.log(`  key ${vk} NOT sent: test page has no focus (foreground: ${JSON.stringify(await real.foreground())})`); return false; }
  await tap(vk);
  return true;
}
const ov = (js) => main.overlay.webContents.executeJavaScript(js);
const until = async (fn, ms) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return true; await sleep(100); } return false; };
const turnDone = (ms = 60000) => new Promise((r) => { const t = setTimeout(() => r(false), ms); main.events.once('turn:done', () => { clearTimeout(t); r(true); }); });

async function pillCrop(name) {
  const img = await main.overlay.webContents.capturePage();
  const { width, height } = img.getSize();
  fs.writeFileSync(path.join(OUT, `pill-${name}.png`), img.crop({ x: Math.round(width * 0.25), y: Math.round(height * 0.55), width: Math.round(width * 0.5), height: Math.round(height * 0.45) }).toPNG());
}

async function t12() {
  stt.transcribe = async () => 'what does this mean?';
  const orders = [], gaps = [];
  for (let n = 0; n < 20; n++) {
    const early = n % 2 === 1;
    const seen = [];
    const t0 = Date.now();
    const onSend = (ch, kind) => { if (ch === 'status') seen.push([Date.now() - t0, kind]); };
    main.events.on('send', onSend);
    fake.emitPtt('win_down');
    fake.emitPtt('ptt_down');
    await sleep(early ? 450 : 1500); // early: let go before the screenshot is done (~0.5-0.9 s); 400 ms is the shortest clip
    fake.emitPtt('ptt_up');
    fake.emitPtt('win_up');
    if (n === 0) { await sleep(1300); await pillCrop('thinking'); }
    const done = await turnDone();
    if (n === 2) await pillCrop('after');
    await sleep(800);
    main.events.off('send', onSend);
    const kinds = seen.map(([, k]) => k).filter((k, i, a) => k !== a[i - 1]);
    while (kinds[0] === 'none') kinds.shift(); // press() clears the old pill first
    const order = kinds.join('>');
    orders.push(order);
    const firstPill = seen.find(([, k]) => k !== 'none'), shotEnd = 60 + (main.state.timing.shot_ms || 0);
    gaps.push(firstPill ? firstPill[0] - shotEnd : null); // >= 0: the pill came after the screenshot
    console.log(`press ${n + 1} ${early ? 'early' : 'held '} ${order} first pill at ${firstPill?.[0]} ms, screenshot done ~${shotEnd} ms ${done ? '' : '(turn timeout)'}`);
  }
  const want = 'listening>thinking>speaking>none';
  const same = orders.filter((o) => o === want).length;
  report('T12 same order on 20 presses', same === 20, `${same}/20 "${want}"; others: ${orders.filter((o) => o !== want).join(' | ') || '-'}`);
  const t = main.state.timing; // last turn
  report('T12 pill only after the screenshot', gaps.every((g) => g != null && g >= 0), `first pill ${Math.min(...gaps)} to ${Math.max(...gaps)} ms after the screenshot finished; last feedback_ms ${t.feedback_ms}`);
  const spot = await ov(`(() => { const b = document.getElementById('status-wrap').style; return [b.bottom, b.top]; })()`);
  report('T12 fixed spot', spot[0] === '184px', `status-wrap bottom ${spot[0]} top ${spot[1]}`);
}

async function t13() {
  const realAsk = brain.ask;
  brain.ask = ({ onText, onEnd }) => { setTimeout(() => { onText('action key media_play_pause\n'); onEnd('action key media_play_pause'); }, 300); return { cancel() {} }; };
  await real.start();
  real.onKey((name) => fake.emitKey(name)); // main listens on the fake platform; the real helper does the grabbing
  fake.grabKeys = async (on) => { fake.calls.push(['grabKeys', on]); await real.grabKeys(on); };
  const d = screen.getPrimaryDisplay().bounds;
  const win = new BrowserWindow({ ...d, frame: false, show: false, skipTaskbar: true, backgroundColor: '#ffffff' });
  win.setAlwaysOnTop(true, 'floating');
  await win.loadURL('data:text/html,' + encodeURIComponent('<title>Nibley key test</title><body style="margin:0;background:#fff"><input id="i" style="position:absolute;left:80px;top:80px;font-size:20px"><script>onmousedown=(e)=>{window.hit=[e.screenX,e.screenY]}</script></body>'));
  // Real clicks and keys follow: make sure they land on this page, not on Zarif's own windows.
  let white = 0;
  for (let tries = 0; tries < 5 && white < 0.85; tries++) {
    win.show(); win.moveTop(); win.focus();
    await sleep(800 + tries * 700);
    const s = await main.captureClean();
    let w = 0;
    for (let i = 0; i < s.bmp.length; i += 400) if (s.bmp[i] > 245 && s.bmp[i + 1] > 245 && s.bmp[i + 2] > 245) w++;
    white = w / (s.bmp.length / 400);
    console.log(`test page check ${tries + 1}: ${Math.round(white * 100)}% white`);
  }
  if (white < 0.85) { report('T13 test page on screen', false, 'not on top, no clicks sent'); win.destroy(); real.stop(); return; }
  const fixture = fs.readFileSync(path.join(__dirname, 'fixtures', 'player.png'));
  const paused = () => fake.calls.some((c) => c[0] === 'key' && c[1] === 'media_play_pause');
  const shown = () => ov(`!!document.querySelector('#choices.on')`);
  async function ask() {
    fake.reset();
    await win.webContents.executeJavaScript('window.hit = null; document.getElementById("i").value = ""');
    main.testTurn('pause the video', fixture, { showShot: false });
    return until(shown, 15000);
  }
  // Focus the test page the way a person would: click an empty spot on it.
  await glide(120, 450); await real.click(120, 450); await sleep(500);
  console.log(`test page focused: ${await pageFocused()}`);
  // Debug trail: overlay mouse events and every mouse-ignore switch.
  await ov(`window.__ev = []; for (const t of ['mouseover', 'mousedown', 'mouseup', 'click']) addEventListener(t, (e) => __ev.push([t, e.target.tagName, Math.round(e.clientX), Math.round(e.clientY)]), true)`);
  const ignores = [];
  const setIgnore = main.overlay.setIgnoreMouseEvents.bind(main.overlay);
  main.overlay.setIgnoreMouseEvents = (on, o) => { ignores.push(`${on}${o?.forward ? '+fwd' : ''}`); setIgnore(on, o); };
  const ONLY = (process.argv[process.argv.indexOf('--only') + 1] || '').split(',').filter((x) => process.argv.includes('--only'));
  const N = Number(process.argv.includes('--n') ? process.argv[process.argv.indexOf('--n') + 1] : 5);
  const want = (k) => !ONLY.length || ONLY.includes(k);
  const counts = Object.fromEntries(['click', 'enter', 'typing', 'timeout', 'elsewhere'].filter(want).map((k) => [k, 0]));
  for (let n = 0; n < N; n++) {
    // 1. click Yes: the overlay takes the click, the page under it doesn't
    if (want('click') && await ask()) {
      await ov('__ev.length = 0'); ignores.length = 0;
      const r = await ov(`(() => { const b = document.querySelector('#choices button').getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; })()`);
      if (n === 0) await pillCrop('choices');
      const [x, y] = r.map(Math.round);
      await glide(x, y); await sleep(300);
      await real.click(x, y);
      const ok = await until(async () => paused(), 3000);
      const hit = await win.webContents.executeJavaScript('window.hit');
      if (ok && !hit) counts.click++; else console.log(`click ${n}: at ${x},${y} paused=${ok} page got click=${JSON.stringify(hit)} overlay events ${JSON.stringify(await ov('__ev'))} ignore switches ${ignores.join(' ')}`);
    }
    await sleep(1500);
    // 2. Enter picks the first button (Yes)
    if (want('enter') && await ask()) {
      if (await safeTap(0x0D) && await until(async () => paused(), 3000)) counts.enter++; else console.log(`enter ${n}: not paused`);
    }
    await sleep(1500);
    // 3. typing: the letter reaches the page and the buttons go away
    if (want('typing') && await ask()) {
      await win.webContents.executeJavaScript('document.getElementById("i").focus()');
      await safeTap(0x41);
      const gone = await until(async () => !(await shown()), 3000);
      const typed = await win.webContents.executeJavaScript('document.getElementById("i").value');
      if (gone && typed === 'a' && !paused()) counts.typing++; else console.log(`typing ${n}: gone=${gone} typed=${JSON.stringify(typed)} paused=${paused()}`);
    }
    await sleep(1500);
    // 4. 15 s with no answer: gone, keys released, nothing paused
    if (want('timeout') && await ask()) {
      const t = Date.now();
      const gone = await until(async () => !(await shown()), 17000);
      const released = fake.calls.some((c) => c[0] === 'grabKeys' && c[1] === false);
      if (gone && released && !paused()) counts.timeout++; else console.log(`timeout ${n}: gone=${gone} after ${Date.now() - t} ms released=${released}`);
    }
    await sleep(1500);
    // 5. a click away from the buttons still reaches the page (YouTube in real use)
    if (want('elsewhere') && await ask()) {
      await glide(300, 300); await sleep(300);
      await real.click(300, 300);
      await sleep(500);
      const hit = await win.webContents.executeJavaScript('window.hit');
      const still = await shown();
      if (hit && still && !paused()) counts.elsewhere++; else console.log(`elsewhere ${n}: hit=${JSON.stringify(hit)} still=${still}`);
      await safeTap(0x1B);
      await until(async () => !(await shown()), 3000);
    }
    await sleep(1500);
  }
  for (const [k, v] of Object.entries(counts)) report(`T13 ${k}`, v === N, `${v}/${N}`);
  inj?.p.kill();
  if (ONLY.length) { win.destroy(); real.stop(); return; } // debug runs skip the Claude part
  win.destroy();
  // Real Claude: does it write a choices line after a yes/no question?
  brain.ask = realAsk;
  let withChoices = 0;
  const lecture = fs.readFileSync(path.join(__dirname, 'fixtures', 'lecture.png'));
  for (let n = 0; n < 3; n++) {
    let got = null;
    const onSend = (ch, _id, it) => { if (ch === 'item' && it?.kind === 'choices') got = it.options; };
    main.events.on('send', onSend);
    const done = turnDone();
    main.testTurn('quiz me: ask me one yes or no question about this slide', lecture, { showShot: false });
    await done;
    main.events.off('send', onSend);
    if (got) withChoices++;
    console.log(`claude quiz ${n + 1}: choices ${JSON.stringify(got)}`);
    await sleep(3000);
  }
  report('T13 Claude adds choices to a yes/no question', withChoices === 3, `${withChoices}/3`);
  real.stop();
}

async function run() {
  await main.ready;
  await sleep(4000);
  if (!process.argv.includes('--skip-t12')) await t12();
  await t13();
  fs.writeFileSync(path.join(OUT, 'pill-choices-results.json'), JSON.stringify(results, null, 2));
  console.log(`\n${results.filter((r) => r.pass).length}/${results.length} pass`);
  fs.rmSync(TMP, { recursive: true, force: true });
  app.quit();
}

run().catch((e) => { console.error('PILL CHECK CRASH', e); app.quit(); });
