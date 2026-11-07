// Mark placement check (2026-11-05, Zarif: "rings and boxes land in the wrong place").
// Puts known targets on the real primary screen, takes the screenshot with the app's own capture, asks real Claude
// "circle the X", lets the real overlay draw it, then measures in pixels:
//   aim  = Claude's coordinates vs the target, in the screenshot Claude saw (did Claude aim wrong?)
//   draw = where the overlay drew vs where Claude's coordinates belong on the real screen (did we map wrong?)
//   total = drawn mark vs the target on the real screen (what Zarif sees)
//   snap = total after moving the mark to the centre of the small UI Automation element under it (like clicks)
// Run:  npx electron test/aim-check.js [--trials 10] [--model haiku|sonnet] [--label before]
//       npx electron test/aim-check.js --replay test/out/aim-after --model sonnet   (same screenshots, no live screen)
//       npx electron test/aim-check.js --frames --label frames   (real YouTube lecture frames from test/aim-grab.js, targets in test/aim-targets.json)
// Writes test/out/aim-<label>/: shot-N.png (what Claude saw), proof-N.png (marks over the target), results.json.
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const TRIALS = Number(arg('trials', 10)), MODEL = arg('model', 'haiku'), REPLAY = arg('replay', null);
const FRAMES = process.argv.includes('--frames')
  ? JSON.parse(fs.readFileSync(path.join(__dirname, 'aim-targets.json'), 'utf8')).targets : null;
const FRAME_DIR = path.join(__dirname, 'out', 'aim-frames');
const LABEL = arg('label', REPLAY ? `${path.basename(REPLAY)}-${MODEL}` : MODEL);
const OUT = path.join(__dirname, 'out', `aim-${LABEL}`);
fs.mkdirSync(OUT, { recursive: true });

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'nibley-aim-'));
const REAL = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'settings.json'), 'utf8'));
fs.cpSync(path.join(REAL.vaultPath, 'nibley'), path.join(TMP, 'vault', 'nibley'), { recursive: true });
fs.writeFileSync(path.join(TMP, 'settings.json'), JSON.stringify({ vaultPath: path.join(TMP, 'vault'), mode: 'ask', model: MODEL, pendingQuestion: null, ear: false }));
process.env.NIBLEY_FAKE = '1'; // fake hotkey; the real helper is started below only for UI Automation
process.env.NIBLEY_SETTINGS = path.join(TMP, 'settings.json');

const { app, BrowserWindow, screen } = require('electron');
const main = require('../src/main');
const tts = require('../src/tts');
const uia = REPLAY ? null : require('../src/platform/windows');
tts.synth = () => Promise.reject(new Error('aim-check: Piper only')); // spares Edge's free service for the voice tests

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OBJECTS = [
  ['red triangle', '<svg width="56" height="50"><polygon points="28,2 54,48 2,48" fill="#E5484D"/></svg>'],
  ['blue circle', '<svg width="48" height="48"><circle cx="24" cy="24" r="22" fill="#2F6FEB"/></svg>'],
  ['word Velocity', '<span style="font:600 26px Georgia">Velocity</span>'],
  ['equation E = mc²', '<span style="font:28px Georgia">E = mc²</span>'],
  ['green star', '<svg width="50" height="48"><polygon points="25,2 31,18 48,18 34,29 39,46 25,36 11,46 16,29 2,18 19,18" fill="#30A46C"/></svg>'],
  ['Play button', '<button style="font:600 18px sans-serif;padding:10px 22px;border-radius:8px;border:0;background:#222;color:#fff">Play</button>'],
  ['orange square', '<svg width="44" height="44"><rect width="44" height="44" fill="#F76B15"/></svg>'],
  ['number 42', '<span style="font:700 34px sans-serif">42</span>'],
  ['word mitochondria', '<span style="font:20px sans-serif;color:#333">The cell gets energy from the <b>mitochondria</b> in it.</span>'],
  ['small purple dot', '<svg width="16" height="16"><circle cx="8" cy="8" r="7" fill="#8E4EC6"/></svg>'],
];

// Frames mode: lecture frame n stretched over the screen, with an invisible box over the labelled target (frame pixels 1584x861).
function framePage(n) {
  const { file, box: [x, y, w, h] } = FRAMES[n], pc = (v, of) => `${(v / of) * 100}%`;
  const src = `data:image/png;base64,${fs.readFileSync(path.join(FRAME_DIR, file)).toString('base64')}`;
  return `<!doctype html><body style="margin:0;background:#000;overflow:hidden"><img src="${src}" style="position:fixed;inset:0;width:100vw;height:100vh">
    <div style="position:fixed;left:0;top:0;width:6px;height:6px;background:#f0f"></div>
    <div id="o${n}" style="position:fixed;left:${pc(x, 1584)};top:${pc(y, 861)};width:${pc(w, 1584)};height:${pc(h, 861)}"></div></body>`;
}

// Trial n: all 10 objects in shuffled cells of a 5x4 grid (seeded), so every screenshot differs.
function page(n) {
  let s = n * 9301 + 49297;
  const rand = () => (s = (s * 233280 + 49297) % 2147483647) / 2147483647;
  const cells = [...Array(20).keys()].sort(() => rand() - 0.5).slice(0, OBJECTS.length);
  const items = OBJECTS.map(([name, html], i) => {
    const c = cells[i], cx = 30 + (c % 5) * 312 + rand() * 150, cy = 110 + Math.floor(c / 5) * 190 + rand() * 90;
    return `<div id="o${i}" style="position:absolute;left:${Math.round(cx)}px;top:${Math.round(cy)}px">${html}</div>`;
  });
  return `<!doctype html><body style="margin:0;background:#fff;font-family:sans-serif;overflow:hidden">
    <h1 style="margin:28px 40px;font:600 30px Georgia;color:#222">Lecture ${n + 1}: Motion and energy</h1>${items.join('')}</body>`;
}

const centre = (m) => m.type === 'highlight' ? [m.x + m.w / 2, m.y + m.h / 2] : m.type === 'arrow' ? [m.x2, m.y2] : [m.x, m.y];
const dist = (a, b) => Math.round(Math.hypot(a[0] - b[0], a[1] - b[1]));

// One turn: Claude's first pointing mark (raw, screenshot pixels).
function ask(text, png) {
  return new Promise((resolve) => {
    let id = null;
    const marks = [], says = [];
    const onSend = (ch, tid, it) => {
      if (ch === 'turn' && id === null) id = tid;
      if (ch !== 'item' || tid !== id) return;
      if (it.kind === 'mark') marks.push(it.mark);
      if (it.kind === 'say') says.push(it.text);
    };
    const finish = () => { main.events.off('send', onSend); main.events.off('turn:done', onDone); clearTimeout(timer); resolve({ marks, says }); };
    const onDone = (tid) => tid === id && finish();
    const timer = setTimeout(finish, 60000);
    main.events.on('send', onSend);
    main.events.on('turn:done', onDone);
    main.testTurn(text, png, { showShot: false });
  });
}

// Centre of the ink-blue pen pixels the overlay really drew (real screen pixels).
async function inkCentre() {
  const img = await main.overlay.webContents.capturePage();
  const { width, height } = img.getSize(), bmp = img.toBitmap(); // BGRA
  let sx = 0, sy = 0, n = 0;
  for (let y = 0; y < height; y += 2) for (let x = 0; x < width; x += 2) {
    const i = (y * width + x) * 4;
    // ink #2F8BFF only; label chips are deep #1E6FEB (G 111), so G must sit near 139
    if (bmp[i + 3] > 200 && bmp[i] > 245 && Math.abs(bmp[i + 1] - 139) < 12 && Math.abs(bmp[i + 2] - 47) < 14) { sx += x; sy += y; n++; }
  }
  return { img, at: n > 20 ? [Math.round(sx / n), Math.round(sy / n)] : null };
}

async function run() {
  await main.ready;
  if (uia) await uia.start();
  await sleep(4000); // Claude warm-up
  const d = screen.getPrimaryDisplay().bounds;
  const K = await main.overlay.webContents.executeJavaScript('K');
  const win = REPLAY ? null : new BrowserWindow({ ...d, frame: false, show: false, skipTaskbar: true, focusable: false, resizable: false, backgroundColor: '#ffffff' });
  if (win) win.setAlwaysOnTop(true, 'floating'); // over Zarif's windows, under the overlay (screen-saver level)
  const saved = REPLAY ? JSON.parse(fs.readFileSync(path.join(REPLAY, 'results.json'), 'utf8')).trials : null;
  const rows = [];
  for (let n = 0; n < (saved ? saved.length : FRAMES ? FRAMES.length : TRIALS); n++) {
    let png, truth, sw, sh;
    if (saved) {
      png = fs.readFileSync(path.join(REPLAY, `shot-${n}.png`));
      ({ truth } = saved[n]);
      [sw, sh] = saved[n].shot;
    } else {
      await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(FRAMES ? framePage(n) : page(n))}`);
      const r = await win.webContents.executeJavaScript(`(() => { const b = document.getElementById('o${n}').getBoundingClientRect(); return [b.x, b.y, b.width, b.height]; })()`);
      truth = { name: FRAMES ? FRAMES[n].name : OBJECTS[n][0], box: r.map(Math.round), at: [Math.round(r[0] + r[2] / 2), Math.round(r[1] + r[3] / 2)] };
      let s, white = 0;
      // the target page must really be on screen, over Zarif's windows (frames: a 6 px magenta corner dot proves it)
      for (let tries = 0; tries < 4 && white < 0.6; tries++) {
        win.showInactive();
        win.moveTop();
        await sleep(600 + tries * 600);
        s = await main.captureClean(); // the app's own screenshot path
        let w = 0;
        for (let i = 0; i < s.bmp.length; i += 400) if (s.bmp[i] > 245 && s.bmp[i + 1] > 245 && s.bmp[i + 2] > 245) w++;
        white = w / (s.bmp.length / 400);
        if (FRAMES) white = s.bmp[s.w * 4 * 2 + 8] > 200 && s.bmp[s.w * 4 * 2 + 9] < 60 && s.bmp[s.w * 4 * 2 + 10] > 200 ? 1 : 0; // BGRA at (2,2)
      }
      if (white < 0.6) console.log(`trial ${n}: target page not on screen (white ${Math.round(white * 100)}%, visible ${win.isVisible()}, bounds ${JSON.stringify(win.getBounds())}, shot ${s.w})`);
      png = s.png;
      ({ width: sw, height: sh } = require('electron').nativeImage.createFromBuffer(png).getSize());
      fs.writeFileSync(path.join(OUT, `shot-${n}.png`), png);
    }
    const t0 = Date.now();
    const { marks, says } = await ask(`circle the ${truth.name}`, png);
    const ms = Date.now() - t0;
    const m = marks.find((x) => ['ring', 'point', 'highlight', 'arrow', 'step'].includes(x.type));
    const row = { n, name: truth.name, shot: [sw, sh], truth, ms, says, mark: m || null };
    if (m) {
      const raw = centre(m);
      const want = [truth.at[0] * sw / d.width, truth.at[1] * sh / d.height]; // the target in the screenshot Claude saw
      const drawn = [raw[0] * K, raw[1] * K]; // overlay.js: everything is drawn at 1366x768 and scaled by K
      const belongs = [raw[0] * d.width / sw, raw[1] * d.height / sh]; // where Claude's point is on the real screen
      Object.assign(row, { raw, aim: dist(raw, want), draw: dist(drawn, belongs), total: dist(drawn, truth.at), drawn: drawn.map(Math.round) });
      const [bx, by, bw, bh] = truth.box;
      row.hit = drawn[0] >= bx - 30 && drawn[0] <= bx + bw + 30 && drawn[1] >= by - 30 && drawn[1] <= by + bh + 30;
      if (!saved) {
        await sleep(1200); // ring stroke finishes drawing
        const ink = await inkCentre();
        if (m.type === 'ring' && ink.at) row.inkCheck = dist(ink.at, drawn); // pixel proof of the draw maths
        fs.writeFileSync(path.join(OUT, `overlay-${n}.png`), ink.img.toPNG());
        // Composite: marks over the target page.
        await win.webContents.executeJavaScript(`(() => { const i = new Image(); i.id = 'ov'; Object.assign(i.style, { position: 'fixed', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9 }); document.body.append(i); return new Promise((r) => { i.onload = () => requestAnimationFrame(() => requestAnimationFrame(r)); i.src = ${JSON.stringify(ink.img.toDataURL())}; }); })()`);
        fs.writeFileSync(path.join(OUT, `proof-${n}.png`), (await win.webContents.capturePage()).toPNG());
        try { // UI Automation under the drawn point, snapped like clicks are (main.js onAction)
          const e = await uia.elementAt(Math.round(drawn[0]), Math.round(drawn[1]));
          row.uia = { name: e.name, role: e.role, box: e.box };
          if (e.name && e.box && e.box[2] < 400 && e.box[3] < 200) row.snap = dist([e.box[0] + e.box[2] / 2, e.box[1] + e.box[3] / 2], truth.at);
        } catch (err) { row.uia = { err: err.message }; }
      }
    }
    rows.push(row);
    console.log(`${n} ${truth.name.padEnd(18)} shot ${sw}x${sh} ${m ? `${m.type}@${row.raw.map(Math.round)} aim ${row.aim}px draw ${row.draw}px total ${row.total}px${row.hit ? ' HIT' : ' MISS'}${row.inkCheck != null ? ` ink ${row.inkCheck}px` : ''}${row.snap != null ? ` snap ${row.snap}px` : ''}` : `no mark (${says.join(' / ').slice(0, 80)})`} ${ms} ms`);
  }
  const med = (k) => { const v = rows.map((r) => r[k]).filter((x) => x != null).sort((a, b) => a - b); return v.length ? v[v.length >> 1] : null; };
  const summary = { label: LABEL, model: MODEL, display: d, K, trials: rows.length, marked: rows.filter((r) => r.mark).length, hits: rows.filter((r) => r.hit).length,
    median: { aim: med('aim'), draw: med('draw'), total: med('total'), snap: med('snap'), inkCheck: med('inkCheck') } };
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ summary, trials: rows }, null, 2));
  console.log(`\n${JSON.stringify(summary)}\nSaved: ${path.relative(path.join(__dirname, '..'), OUT)}`);
  win?.destroy();
  uia?.stop();
  fs.rmSync(TMP, { recursive: true, force: true });
  app.quit();
}

run().catch((e) => { console.error('AIM CHECK CRASH', e); app.quit(); });
