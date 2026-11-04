// Nibley: app start, tray, wiring, turn loop.
const { app, BrowserWindow, Tray, Menu, nativeImage, desktopCapturer, screen, ipcMain, session, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const platform = require('./platform');
const brain = require('./brain');
const prompt = require('./prompt');
const { createParser, parseAll, SCREEN } = require('./script');
const gate = require('./gate');
const stt = require('./stt');
const tts = require('./tts');
const piper = require('./piper');
const memory = require('./memory');
const lessons = require('./lessons');
const { log, dir: logDir } = require('./log');

const ROOT = path.join(__dirname, '..');
const SETTINGS = process.env.NIBLEY_SETTINGS || path.join(ROOT, 'settings.json'); // tests use their own file
const IDLE_LEARN_MS = 5 * 60e3;

// ---------- settings + secrets ----------
function findClaude() {
  for (const d of (process.env.PATH || '').split(path.delimiter)) {
    const f = path.join(d, 'claude.exe');
    if (d && fs.existsSync(f)) return f;
  }
  return path.join(process.env.USERPROFILE || '', '.local', 'bin', 'claude.exe');
}
const DEFAULTS = { model: 'haiku', mode: 'ask', voice: 'en-US-AvaMultilingualNeural', ink: '#2F8BFF', apps: { chrome: 'chrome', notepad: 'notepad' }, claudePath: '', vaultPath: 'C:\\Users\\arko4\\Desktop\\Second Brain', pendingQuestion: null };
let settings = { ...DEFAULTS };
try { settings = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(SETTINGS, 'utf8')) }; } catch { /* first run */ }
if (!settings.claudePath || !fs.existsSync(settings.claudePath)) settings.claudePath = findClaude();
const saveSettings = () => fs.writeFileSync(SETTINGS, JSON.stringify(settings, null, 2));
saveSettings();

// Key from .env (gitignored); .env.example is the public template, checked as a fallback. Never logged.
function groqKey() {
  for (const f of ['.env', '.env.example']) {
    if (process.env.GROQ_API_KEY) break;
    try { process.loadEnvFile(path.join(ROOT, f)); } catch { /* file missing */ }
  }
  return process.env.GROQ_API_KEY || '';
}

// ---------- windows ----------
let overlay, tray, lessonsWin;
const events = new (require('node:events'))(); // test/e2e.js listens here
const send = (...a) => { if (overlay && !overlay.isDestroyed()) overlay.webContents.send(...a); events.emit('send', ...a); };

function createOverlay() {
  const { width, height } = screen.getPrimaryDisplay().bounds;
  overlay = new BrowserWindow({
    x: 0, y: 0, width, height, transparent: true, frame: false, focusable: false, skipTaskbar: true, hasShadow: false,
    resizable: false, movable: false, show: false, alwaysOnTop: true, backgroundColor: '#00000000',
    webPreferences: { nodeIntegration: true, contextIsolation: false, backgroundThrottling: false },
  });
  overlay.setIgnoreMouseEvents(true);
  overlay.setAlwaysOnTop(true, 'screen-saver');
  overlay.setContentProtection(!process.env.NIBLEY_NO_PROTECT); // not enough on its own here: captureClean() hides the overlay
  overlay.loadFile(path.join(__dirname, 'overlay', 'overlay.html'));
  overlay.once('ready-to-show', () => overlay.showInactive());
  overlay.webContents.on('did-finish-load', () => send('ink', settings.ink));
}
const reassertTop = () => overlay.setAlwaysOnTop(true, 'screen-saver');

// ---------- tray ----------
let trayState = 'starting', trayError = false;
function trayIcon() {
  const name = trayError ? 'tray-dot' : 'tray';
  const img = nativeImage.createFromPath(path.join(__dirname, 'overlay', `${name}-16.png`));
  img.addRepresentation({ scaleFactor: 2, buffer: fs.readFileSync(path.join(__dirname, 'overlay', `${name}-32.png`)) });
  return img;
}
function setTray(state, error) {
  if (state) trayState = state;
  if (error !== undefined) trayError = error;
  if (!tray) return;
  tray.setImage(trayIcon());
  tray.setToolTip(`Nibley: ${trayState}${ttsBackup ? ' (backup voice)' : ''}`);
}
// Edge voices Zarif can switch between (samples: test/voice-samples).
const VOICES = [
  ['Ava (US, female)', 'en-US-AvaMultilingualNeural'], ['Andrew (US, male)', 'en-US-AndrewMultilingualNeural'],
  ['Emma (US, female)', 'en-US-EmmaMultilingualNeural'], ['Brian (US, male)', 'en-US-BrianMultilingualNeural'],
  ['Christopher (US, male)', 'en-US-ChristopherNeural'], ['Jenny (US, female)', 'en-US-JennyNeural'],
  ['Sonia (British, female)', 'en-GB-SoniaNeural'], ['Ryan (British, male)', 'en-GB-RyanNeural'],
  ['Neerja (Indian, female)', 'en-IN-NeerjaExpressiveNeural'], ['Prabhat (Indian, male)', 'en-IN-PrabhatNeural'],
  ['William (Australian, male)', 'en-AU-WilliamMultilingualNeural'],
];
async function setVoice(id) {
  settings.voice = id;
  saveSettings();
  ttsFails = 0;
  ttsBackup = false;
  await tts.init(id).catch((e) => log({ ev: 'tts_init_error', err: e.message }));
  log({ ev: 'voice', voice: id });
  speak('Hi, this is my new voice.');
}

function buildMenu() {
  const radio = (label, key, value, onPick) => ({ label, type: 'radio', checked: settings[key] === value, click: () => { settings[key] = value; saveSettings(); onPick?.(); } });
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Model', submenu: [radio('Haiku', 'model', 'haiku', () => brain.setModel('haiku')), radio('Sonnet', 'model', 'sonnet', () => brain.setModel('sonnet'))] },
    { label: 'Voice', submenu: VOICES.map(([label, id]) => radio(label, 'voice', id, () => setVoice(id))) },
    { label: 'Actions', submenu: [radio('Ask first', 'mode', 'ask'), radio('Auto', 'mode', 'auto')] },
    { label: 'Lessons', click: openLessons },
    { label: 'Undo last rule change', click: () => { const r = memory.undoLast(settings.vaultPath); speak(r ? `Undone: I ${r}.` : 'There is no rule change to undo.'); } },
    { label: 'Open log folder', click: () => shell.openPath(logDir) },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]));
}

// ---------- screenshot ----------
async function capture() {
  const t = Date.now();
  const [src] = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: SCREEN.w, height: SCREEN.h } });
  const img = src.thumbnail;
  const { width, height } = img.getSize();
  if (width !== SCREEN.w || height !== SCREEN.h) log({ ev: 'shot_size_mismatch', width, height });
  return { png: img.toPNG(), bmp: img.toBitmap(), w: width, ms: Date.now() - t };
}

// setContentProtection does not keep this transparent overlay out of desktopCapturer on Zarif's PC (tested
// 2026-10-28), so the overlay is hidden for the moment of the screenshot.
async function captureClean() {
  overlay.hide();
  await new Promise((r) => setTimeout(r, 60)); // let the compositor drop the window
  try { return await capture(); } finally { overlay.showInactive(); reassertTop(); }
}

// Pen-stroke outline colour from the brightness under the mark (DESIGN.md `edge`).
function edgeFor(bmp, w, m) {
  if (!bmp) return '#2B3A4B';
  const cx = m.x ?? (m.x1 + m.x2) / 2, cy = m.y ?? (m.y1 + m.y2) / 2;
  const x0 = m.type === 'highlight' ? m.x + m.w / 2 : cx, y0 = m.type === 'highlight' ? m.y + m.h / 2 : cy;
  let sum = 0, n = 0;
  for (let dy = -20; dy <= 20; dy += 5) for (let dx = -20; dx <= 20; dx += 5) {
    const x = Math.round(x0 + dx), y = Math.round(y0 + dy);
    if (x < 0 || y < 0 || x >= w || y * w * 4 >= bmp.length) continue;
    const i = (y * w + x) * 4; // BGRA
    sum += 0.0722 * bmp[i] + 0.7152 * bmp[i + 1] + 0.2126 * bmp[i + 2];
    n++;
  }
  return n && sum / n > 140 ? '#2B3A4B' : '#FFFFFF';
}

// How busy each 16 px cell of the screenshot is (mean brightness jump between neighbours), so notes go to calm areas.
function busyMap(bmp, w) {
  if (!bmp) return null;
  const cell = 16, h = bmp.length / 4 / w, cols = Math.ceil(w / cell), rows = Math.ceil(h / cell), data = new Array(cols * rows).fill(0);
  const lum = (i) => 0.0722 * bmp[i] + 0.7152 * bmp[i + 1] + 0.2126 * bmp[i + 2];
  for (let y = 0; y < h - 2; y += 2) for (let x = 0; x < w - 2; x += 2) {
    const i = (y * w + x) * 4;
    data[Math.floor(y / cell) * cols + Math.floor(x / cell)] += Math.abs(lum(i) - lum(i + 8)) + Math.abs(lum(i) - lum(i + w * 8));
  }
  return { cell, cols, data: data.map((v) => Math.round(v / 64)) }; // 64 samples per cell
}

// ---------- voice ----------
let ttsBackup = false, ttsFails = 0, ttsFailedAt = 0; // backup voice for the turn; for the session after 3 failed turns
function sayLine(ctx, text) {
  const i = ctx.says++;
  send('item', ctx.id, { kind: 'say', i, text });
  // Edge voice, else Piper (offline), else the Windows voice.
  ctx.voice = ctx.voice.then(async () => {
    // First sentence: Piper starts at once in parallel, so a slow Edge costs at most 1.2 s (first word within 5 s)
    const early = i === 0 ? piper.synth(text).catch(() => null) : null;
    if (!ttsBackup && !ctx.backup) {
      try {
        send('item', ctx.id, { kind: 'audio', i, buf: await tts.synth(text, i === 0 ? 1200 : 2500), mime: 'audio/mpeg', src: 'edge' });
        ttsFails = 0;
        return;
      } catch (e) {
        ttsBackup = true; // backup voice for the rest of this turn
        ttsFails++;
        ttsFailedAt = Date.now();
        log({ ev: 'tts_fallback', err: e.message, fails: ttsFails });
        setTray();
      }
    }
    try {
      send('item', ctx.id, { kind: 'audio', i, buf: (await early) || await piper.synth(text), mime: 'audio/wav', src: 'piper' });
    } catch (e) {
      log({ ev: 'piper_error', err: e.message });
      send('item', ctx.id, { kind: 'audio', i, fallback: true, src: 'windows' });
    }
  });
}
// A short spoken line outside a question (errors, confirmations).
function speak(text, backup = false) {
  const ctx = { id: ++turnId, says: 0, voice: Promise.resolve(), backup };
  send('turn', ctx.id);
  sayLine(ctx, text);
  send('item', ctx.id, { kind: 'end' });
}
const say = (kind, text) => { const c = screen.getCursorScreenPoint(); send('status', kind, text, c.x, c.y); };

// ---------- turn loop ----------
let turnId = 0, active = null, lastDone = null, pendingAsk = null, timing = {};
let rec = { armed: false, ptt: false }, pttDownAt = 0, shot = null, replaying = false;
let sessionTurns = [], lastActivity = Date.now(), learning = false, interview = { asked: false, open: false };
let actSeq = 0;
const acts = new Map();
let stopClicks = null;

function bargeIn() {
  turnId++;
  if (ttsFails >= 3 && Date.now() - ttsFailedAt > 5 * 60e3) ttsFails = 0; // Nibley runs all day: retry Edge after 5 min
  if (ttsFails < 3) ttsBackup = false; // try the Edge voice again each turn
  tts.warm();
  if (active?.handle) active.handle.cancel();
  active = null;
  send('stop');
  stopClicks?.();
  stopClicks = null;
}

function onPtt(ev) {
  lastActivity = Date.now();
  if (ev === 'win_down') { rec = { armed: true, ptt: false }; send('rec:start'); } // starts early so the first word isn't cut
  else if (ev === 'ptt_down') {
    rec.ptt = true;
    pttDownAt = Date.now();
    if (timing.ptt_down && !timing.logged) log({ ev: 'turn', interrupted: true, ...rel(timing) });
    timing = { ptt_down: pttDownAt };
    send('rec:start');
    if (replaying) closeReplay();
    bargeIn();
    reassertTop();
    const id = turnId;
    shot = captureClean();
    shot.then(() => { if (id === turnId && !timing.ptt_up) say('listening', 'Listening'); }, (e) => log({ ev: 'shot_error', err: e.message }));
    setTray('listening');
  } else if (ev === 'ptt_up') {
    timing.ptt_up = Date.now();
    if (Date.now() - pttDownAt < 250) { send('rec:cancel'); say('none'); setTray('ready'); return; } // accidental tap
    send('rec:stop');
    say('thinking', 'Thinking');
    setTray('thinking');
  } else if (ev === 'win_up') {
    if (!rec.ptt) send('rec:cancel');
    rec.armed = false;
  }
}

const rel = (t) => Object.fromEntries(Object.entries(t).filter(([k, v]) => typeof v === 'number' && k !== 'ptt_down').map(([k, v]) => [k, k.endsWith('_ms') ? v : v - t.ptt_down]));
const didntCatch = () => { say('msg', "Didn't catch that"); setTray('ready'); };

async function onUtterance(buf, durMs) {
  const id = turnId;
  if (!buf || durMs < 400) return didntCatch();
  let text;
  try {
    text = await stt.transcribe(Buffer.from(buf), { key: groqKey(), durationMs: durMs });
  } catch (e) {
    log({ ev: 'stt_error', kind: e.kind, err: e.message });
    say('error', { nokey: 'Groq key missing', key: 'Groq key not working', rate: 'Too many questions', offline: 'No internet' }[e.kind] || 'Speech-to-text failed');
    if (e.kind === 'nokey') { setTray('ready', true); return speak('I need the Groq key in the .env file.'); }
    if (e.kind === 'key') { setTray('ready', true); return speak("The Groq key in the .env file doesn't work."); }
    if (e.kind === 'rate') return speak('Too many questions, wait a minute.');
    if (e.kind === 'offline') return speak('No internet.', true);
    return speak("I couldn't hear that properly. Try again.");
  }
  if (id !== turnId) return;
  timing.stt_done = Date.now();
  log({ ev: 'heard', text, clip_ms: Math.round(durMs) });
  if (!text) return didntCatch();
  await handleText(text, id);
}

async function handleText(text, id) {
  if (pendingAsk) {
    const p = pendingAsk;
    pendingAsk = null;
    if (Date.now() < p.until) {
      if (gate.isYes(text)) { say('none'); setTray('ready'); for (const a of p.actions) await runAction(a); return; }
      if (/^\W*(no|nope|don'?t|do not|cancel|stop|never ?mind)\b/i.test(text)) { say('none'); return speak("Okay, I won't."); }
    }
  }
  // A new question instead of an answer just closes the interview.
  if (interview.open && /\?\s*$|^\W*(what|how|why|when|where|who|which|explain|can|could|show|tell|is|are|do|does)/i.test(text)) interview.open = false;
  if (interview.open) {
    interview.open = false;
    memory.addLearning(settings.vaultPath, [`Asked "${settings.pendingQuestion}". He said: ${text}`]);
    settings.pendingQuestion = null;
    saveSettings();
    say('none');
    return speak("Thanks, I'll remember that.");
  }
  if (/^\W*(please\s+)?save (this|that)\b/i.test(text)) { say('none'); return saveLesson(); }
  if (/\b(show|open)( me)? my lessons\b/i.test(text)) { say('none'); return openLessons(); }
  await ask(text, id);
}

async function ask(text, id) {
  let s;
  try { s = await shot; } catch { s = {}; }
  if (id !== turnId) return;
  timing.shot_ms = s.ms;
  const ctx = { id, text, png: s.png, bmp: s.bmp, w: s.w, says: 0, voice: Promise.resolve(), asks: [], title: null, full: '', sayLines: [] };
  active = ctx;
  send('turn', id, { busy: busyMap(s.bmp, s.w) });
  let chain = Promise.resolve();
  const parser = createParser((cmd) => { chain = chain.then(() => onCmd(ctx, cmd)).catch((e) => log({ ev: 'cmd_error', err: e.message })); },
    { onBad: (b) => log({ ev: 'bad_line', line: b.line, why: b.why }) });
  ctx.handle = brain.ask({
    png: s.png, text,
    onText: (d) => { timing.claude_first_token ||= Date.now(); parser.push(d); },
    onEnd: (full) => { ctx.full = full; parser.end(); chain = chain.then(() => endTurn(ctx)); },
    onError: (kind, detail) => { chain = chain.then(() => brainError(ctx, kind, detail)); },
  });
}

async function onCmd(ctx, cmd) {
  if (ctx.id !== turnId && !ctx.replay) return;
  if (cmd.prose) log({ ev: 'prose_line', text: cmd.text });
  if (cmd.type === 'say') { ctx.sayLines.push(cmd.text); return sayLine(ctx, cmd.text); }
  if (cmd.type === 'title') { ctx.title = cmd.text; return; }
  if (cmd.type === 'clear') return send('item', ctx.id, { kind: 'clear' });
  if (cmd.type === 'wait_click') return ctx.replay || send('item', ctx.id, { kind: 'wait', x: cmd.x, y: cmd.y });
  if (cmd.type === 'action') return ctx.replay || onAction(ctx, cmd);
  send('item', ctx.id, { kind: 'mark', mark: { ...cmd, edge: edgeFor(ctx.bmp, ctx.w, cmd) } });
}

async function onAction(ctx, a) {
  let info = {};
  try {
    if (a.kind === 'click') info = await platform.elementAt(a.x, a.y);
    if (a.kind === 'type') info = { isPassword: await platform.focusedIsPassword() };
  } catch (e) {
    log({ ev: 'uia_error', err: e.message });
    if (a.kind === 'type') info = { isPassword: true }; // can't check: treat as a password box
  }
  const d = gate.check(a, info, settings);
  log({ ev: 'action', action: a, element: info.name, role: info.role, decision: d });
  if (!d.ok) return sayLine(ctx, d.say);
  // Snap clicks to the centre of a small named UI element under the point (Claude can be a few px off).
  if (a.kind === 'click' && info.name && info.box && info.box[2] < 400 && info.box[3] < 200) {
    a = { ...a, x: Math.round(info.box[0] + info.box[2] / 2), y: Math.round(info.box[1] + info.box[3] / 2) };
  }
  if (d.ask) ctx.asks.push({ a, describe: d.describe });
  else { acts.set(++actSeq, a); send('item', ctx.id, { kind: 'act', id: actSeq }); }
}

async function runAction(a) {
  try {
    if (a.kind === 'click') await platform.click(a.x, a.y);
    else if (a.kind === 'type') {
      if (await platform.focusedIsPassword().catch(() => true)) return speak("I can't type into a password box, that's yours to do.");
      await platform.type(a.text);
    } else if (a.kind === 'key') await platform.key(a.name);
    else if (a.kind === 'scroll') await platform.scroll(a.dir, a.n);
    else if (a.kind === 'open_url') await platform.openUrl(a.url);
    else if (a.kind === 'open_app') await platform.openApp(settings.apps[a.name]);
    log({ ev: 'action_done', action: a });
  } catch (e) {
    log({ ev: 'action_error', action: a, err: e.message });
    speak("That didn't work.");
  }
}

function endTurn(ctx) {
  if (ctx.id !== turnId) return;
  if (ctx.asks.length) {
    sayLine(ctx, `Should I ${ctx.asks.map((x) => x.describe).join(', then ')}?`);
    pendingAsk = { actions: ctx.asks.map((x) => x.a), until: Date.now() + 20000 };
  } else if (ctx.says && settings.pendingQuestion && !interview.asked) {
    interview = { asked: true, open: true }; // mini-interview: at most once per session
    sayLine(ctx, `Quick question: ${settings.pendingQuestion}`);
  }
  send('item', ctx.id, { kind: 'end' });
  if (!ctx.says && !ctx.asks.length) say('none');
  timing.claude_end = Date.now();
  if (ctx.says) {
    lastDone = ctx;
    sessionTurns.push({ q: ctx.text, a: ctx.sayLines.join(' ') });
  }
  setTray('ready');
}

function brainError(ctx, kind, detail) {
  log({ ev: 'claude_error', kind, detail: String(detail).slice(0, 300) });
  if (ctx.id !== turnId) return;
  say('error', { limit: 'Claude limit reached', auth: 'Claude signed out', timeout: 'Claude is slow' }[kind] || 'Claude had a problem');
  if (kind === 'limit') {
    const reset = String(detail).match(/resets?\s+(?:at\s+)?([^.·|\n]+)/i);
    setTray('limit reached');
    return speak(`You've hit the Claude usage limit.${reset ? ` It resets at ${reset[1].trim()}.` : ' Try again later.'}`);
  }
  setTray('ready');
  if (kind === 'auth') return speak("Claude isn't signed in. Open Claude Code once and sign in.");
  if (kind === 'timeout') return speak("Claude didn't answer in time. Try again.");
  return speak('Something went wrong with Claude. Try again.');
}

// ---------- lessons ----------
function saveLesson() {
  if (!lastDone?.png) return speak("There's nothing to save yet.");
  const title = (lastDone.title || lastDone.text).slice(0, 80);
  try {
    const dir = lessons.save({ vault: settings.vaultPath, png: lastDone.png, script: lastDone.full, title, question: lastDone.text });
    log({ ev: 'lesson_saved', dir });
    speak(`Saved: ${title}.`);
  } catch (e) {
    log({ ev: 'lesson_error', err: e.message });
    speak("I couldn't save that lesson.");
  }
}

function openLessons() {
  if (lessonsWin && !lessonsWin.isDestroyed()) { lessonsWin.show(); lessonsWin.focus(); return; }
  lessonsWin = new BrowserWindow({ width: 980, height: 640, title: 'Nibley lessons', backgroundColor: '#F7FAFF', autoHideMenuBar: true, icon: path.join(__dirname, 'overlay', 'app-256.png'),
    webPreferences: { nodeIntegration: true, contextIsolation: false } });
  lessonsWin.loadFile(path.join(__dirname, 'overlay', 'lessons.html'), { query: { ink: settings.ink } });
}

function playLesson(dir) {
  const { png, script } = lessons.load(dir);
  bargeIn();
  replaying = true;
  lessonsWin?.hide();
  overlay.setIgnoreMouseEvents(false);
  overlay.setFocusable(true);
  overlay.focus();
  const img = nativeImage.createFromBuffer(png);
  const ctx = { id: turnId, says: 0, voice: Promise.resolve(), bmp: img.toBitmap(), w: img.getSize().width, replay: true, sayLines: [] };
  send('turn', ctx.id, { replay: true, bg: `data:image/png;base64,${png.toString('base64')}`, busy: busyMap(ctx.bmp, ctx.w) });
  for (const cmd of parseAll(script)) onCmd(ctx, cmd);
  send('item', ctx.id, { kind: 'end' });
  log({ ev: 'lesson_replay', dir });
}

function closeReplay() {
  replaying = false;
  send('stop');
  overlay.setIgnoreMouseEvents(true);
  overlay.setFocusable(false);
  if (lessonsWin && !lessonsWin.isDestroyed()) lessonsWin.show();
}

// ---------- IPC ----------
ipcMain.on('rec:data', (_e, buf, dur) => onUtterance(buf, dur));
ipcMain.on('voice:start', (_e, { turn, i, src }) => {
  if (turn === turnId && i === 0 && !timing.first_audio) timing.first_audio = Date.now(); // the overlay switches the pill to Speaking
  if (src !== 'edge' && i === 0) log({ ev: 'backup_voice', src });
});
ipcMain.on('turn:done', (_e, id) => {
  events.emit('turn:done', id);
  if (id !== turnId || !timing.ptt_down || timing.logged) return;
  timing.turn_end = Date.now();
  timing.logged = true;
  log({ ev: 'turn', model: settings.model, ...rel(timing) });
});
ipcMain.on('waiting', (_e, { x, y }) => {
  stopClicks?.();
  stopClicks = platform.onMouseClick((cx, cy) => { if (Math.hypot(cx - x, cy - y) <= 40) { stopClicks?.(); stopClicks = null; send('advance'); } });
});
ipcMain.on('waiting-done', () => { stopClicks?.(); stopClicks = null; });
ipcMain.on('act', (_e, id) => { const a = acts.get(id); acts.delete(id); if (a) runAction(a); });
ipcMain.on('replay:close', () => replaying && closeReplay());
ipcMain.on('mic', (_e, r) => { log({ ev: 'mic', ...r }); if (!r.ok) { setTray('mic blocked', true); speak("I can't use the microphone. Check Windows privacy settings for microphone access.", true); } });
ipcMain.handle('lessons:list', () => lessons.list(settings.vaultPath).map((l) => ({
  ...l, thumb: nativeImage.createFromPath(path.join(l.dir, 'shot.png')).resize({ width: 192 }).toDataURL(),
})));
ipcMain.on('lessons:play', (_e, dir) => {
  const rel = path.relative(lessons.root(settings.vaultPath), path.resolve(dir));
  if (rel && !rel.startsWith('..') && !path.isAbsolute(rel)) playLesson(dir);
});

// ---------- learner: after 5 min idle with 2+ turns ----------
setInterval(async () => {
  if (learning || sessionTurns.length < 2 || Date.now() - lastActivity < IDLE_LEARN_MS) return;
  learning = true;
  const turns = sessionTurns;
  sessionTurns = [];
  try {
    const r = await memory.learn({ vault: settings.vaultPath, claudePath: settings.claudePath, turns });
    if (r.ask) { settings.pendingQuestion = r.ask; saveSettings(); }
    log({ ev: 'learned', ...r });
  } catch (e) {
    log({ ev: 'learner_error', err: e.message });
  }
  learning = false;
}, 60e3).unref();

// ---------- start ----------
if (!app.requestSingleInstanceLock()) app.quit();
app.whenReady().then(async () => {
  const d = screen.getPrimaryDisplay();
  log({ ev: 'start', display: d.bounds, scale: d.scaleFactor, settings: { model: settings.model, mode: settings.mode, voice: settings.voice } });
  if (d.scaleFactor !== 1 || d.bounds.width !== SCREEN.w || d.bounds.height !== SCREEN.h) log({ ev: 'display_mismatch', note: 'Built for 1366x768 at 100%; marks may be off.' });
  const isOverlay = (wc) => overlay && wc && wc.id === overlay.webContents.id;
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => cb(perm === 'media' && isOverlay(wc)));
  session.defaultSession.setPermissionCheckHandler((wc, perm) => perm === 'media' && isOverlay(wc));
  createOverlay();
  screen.on('display-metrics-changed', reassertTop);
  tray = new Tray(trayIcon());
  buildMenu();
  setTray('starting');
  platform.onError((e) => log({ ev: 'helper_error', err: String(e).slice(0, 300) }));
  platform.onPtt(onPtt);
  brain.start({
    model: settings.model, claudePath: settings.claudePath,
    buildPrompt: () => prompt.build({ vaultPath: settings.vaultPath, apps: settings.apps }),
    onFatal: (msg) => { setTray('Claude keeps crashing', true); speak(msg); },
  });
  if (!piper.start(path.join(ROOT, 'piper', 'piper.exe'), path.join(ROOT, 'piper', 'voices', 'en_US-lessac-medium.onnx'))) log({ ev: 'piper_missing' });
  await Promise.all([
    platform.start(),
    tts.init(settings.voice).catch((e) => { ttsBackup = true; log({ ev: 'tts_fallback', err: e.message }); }),
  ]);
  setTray('ready', !groqKey());
  log({ ev: 'ready', ms: Math.round(process.uptime() * 1000) });
  events.emit('ready');
});
app.on('window-all-closed', () => {}); // keep running in the tray
app.on('before-quit', () => { brain.stop(); platform.stop(); tts.close(); piper.stop(); });

// Test entry: one turn with a given screenshot instead of the hotkey, mic and screen capture.
function testTurn(text, png, { showShot = true } = {}) {
  bargeIn();
  timing = { ptt_down: Date.now(), ptt_up: Date.now(), stt_done: Date.now() };
  const img = nativeImage.createFromBuffer(png);
  shot = Promise.resolve({ png, bmp: img.toBitmap(), w: img.getSize().width, ms: 0 });
  const showBg = (ch) => { if (ch !== 'turn') return; events.off('send', showBg); send('bg', `data:image/png;base64,${png.toString('base64')}`); };
  if (showShot) events.on('send', showBg);
  return handleText(text, turnId);
}

module.exports = { events, groqKey, testTurn, captureClean, setVoice, VOICES, handleText, playLesson, closeReplay, onPtt, ready: new Promise((r) => events.once('ready', r)),
  get overlay() { return overlay; }, get lessonsWin() { return lessonsWin; },
  get state() { return { turnId, lastDone, pendingAsk, replaying, timing, ttsBackup, settings }; } };
