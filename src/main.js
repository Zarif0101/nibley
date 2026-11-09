// Nibley: app start, tray, wiring, turn loop.
const { app, BrowserWindow, Tray, Menu, nativeImage, desktopCapturer, screen, ipcMain, session, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const platform = require('./platform');
const sidebar = require('./sidebar');
const styles = require('./styles');
const teacherMod = require('./teacher');
const claudeBrain = require('./brain');
const geminiBrain = require('./brain-gemini');
const prompt = require('./prompt');
const { createParser, parseAll, SCREEN } = require('./script');
const { createLint } = require('./lint');
const { pickSource } = require('./screen');
const { createPillSequencer } = require('./overlay/pill-sequence');
const gate = require('./gate');
const stt = require('./stt');
const tts = require('./tts');
const piper = require('./piper');
const memory = require('./memory');
const lessons = require('./lessons');
const youtube = require('./youtube');
const studyMod = require('./study');
const feedback = require('./feedback');
const updater = require('./updater');
const { sourceLine } = require('./source');
const ear = require('./ear');
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
// Christopher: classic Edge voices stayed under 0.9 s in Edge's slow periods; Ava/Andrew took 1.5-8 s (BUILD-LOG 2026-11-05 T1)
const DEFAULTS = { brain: 'claude', name: '', model: 'haiku', mode: 'ask', voice: 'en-US-ChristopherNeural', ink: '#2F8BFF', apps: { brave: 'brave', notepad: 'notepad' }, claudePath: '', pendingQuestion: null };
let settings = { ...DEFAULTS };
try { settings = { ...DEFAULTS, ...JSON.parse(fs.readFileSync(SETTINGS, 'utf8')) }; } catch { /* first run */ }
if (!settings.claudePath || !fs.existsSync(settings.claudePath)) settings.claudePath = findClaude();
const saveSettings = () => fs.writeFileSync(SETTINGS, JSON.stringify(settings, null, 2));
// Learner data (lessons, transcripts, memory, style scores) lives inside the app, not in a notes app (Zarif 2026-11-08).
// Folder: <DATA>/nibley. Tests set dataPath. Old installs kept it in settings.vaultPath: copied once, the old copy is left alone.
const DATA = settings.dataPath || app.getPath('userData');
if (settings.vaultPath) {
  const from = path.join(settings.vaultPath, 'nibley'), to = path.join(DATA, 'nibley');
  if (fs.existsSync(from) && !fs.existsSync(to)) { fs.cpSync(from, to, { recursive: true }); log({ ev: 'data_moved', from, to }); }
  delete settings.vaultPath;
}
delete settings.bridgeToken; // the YouTube extension is gone (Zarif 2026-11-08: learners install nothing)
saveSettings();
// Brain: Claude (Claude Code login) or Gemini (Google login via Gemini CLI). Picked in Settings; switching restarts Nibley.
const brain = settings.brain === 'gemini' ? geminiBrain : claudeBrain;
const runAI = (o) => (settings.brain === 'gemini' ? geminiBrain.once(o) : memory.runClaude({ claudePath: settings.claudePath, ...o })); // side calls

// Study page per lecture (brainstorms/2026-11-08-study-page-format.md): recaps every 10 min, quiz + cards at the end.
const study = studyMod.create({
  dir: DATA, log, transcript: youtube.transcript,
  run: runAI,
  onChange: (p) => { const w = sidebar.win; if (w && !w.isDestroyed()) w.webContents.send('study:page', p); },
});
const teacher = teacherMod.create(DATA); // teaching style per question + 'Makes sense?' limit (NEXT-ROUND C1)

// Key from .env (gitignored); .env.example is the public template, checked as a fallback. Never logged.
function groqKey() {
  for (const f of ['.env', '.env.example']) {
    if (process.env.GROQ_API_KEY) break;
    try { process.loadEnvFile(path.join(ROOT, f)); } catch { /* file missing */ }
  }
  return process.env.GROQ_API_KEY || '';
}

// ---------- windows ----------
let overlay, tray, quitting = false;
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
  overlay.webContents.on('did-finish-load', () => { send('ink', settings.ink); if (settings.ear !== false) send('ear:on'); });
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
  sidebar.win?.webContents.send('settings:changed');
  ttsBackup = false;
  await tts.init(id).catch((e) => log({ ev: 'tts_init_error', err: e.message }));
  log({ ev: 'voice', voice: id });
  speak('Hi, this is my new voice.');
}

// One place for settings changes: the tray menu and the sidebar both call it, and both show the result.
const SETTABLE = { brain: ['claude', 'gemini'], model: ['haiku', 'sonnet'], mode: ['ask', 'auto'], voice: VOICES.map(([, id]) => id), ear: [true, false] };
function setSetting(key, value) {
  if (!SETTABLE[key]?.includes(value) || settings[key] === value) return;
  settings[key] = value;
  saveSettings();
  if (key === 'model') brain.setModel(value);
  if (key === 'brain') { log({ ev: 'brain_switch', to: value }); app.relaunch(); app.exit(0); return; } // a different AI app: start fresh
  if (key === 'voice') setVoice(value);
  if (key === 'ear') { send(value ? 'ear:on' : 'ear:off'); log({ ev: 'ear_switch', on: value }); }
  buildMenu();
  sidebar.win?.webContents.send('settings:changed');
}

function buildMenu() {
  const radio = (label, key, value) => ({ label, type: 'radio', checked: settings[key] === value, click: () => setSetting(key, value) });
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Model', submenu: [radio('Haiku', 'model', 'haiku'), radio('Sonnet', 'model', 'sonnet')] },
    { label: 'Voice', submenu: VOICES.map(([label, id]) => radio(label, 'voice', id)) },
    { label: 'Actions', submenu: [radio('Ask first', 'mode', 'ask'), radio('Auto', 'mode', 'auto')] },
    { label: 'Listen to lecture sound', type: 'checkbox', checked: settings.ear !== false, click: (m) => setSetting('ear', m.checked) },
    { label: 'Lessons', click: () => sidebar.open('tray-menu', 'lessons') },
    { label: 'Undo last rule change', click: () => { const r = memory.undoLast(DATA); speak(r ? `Undone: I ${r}.` : 'There is no rule change to undo.'); } },
    { label: 'Open log folder', click: () => shell.openPath(logDir) },
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() },
  ]));
}

// ---------- screenshot ----------
async function capture() {
  const t = Date.now();
  const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: SCREEN.w, height: SCREEN.h } });
  const src = pickSource(sources.map((s) => ({ s, display_id: s.display_id, size: s.thumbnail.getSize() })), screen.getAllDisplays(), screen.getPrimaryDisplay()).s;
  const img = src.thumbnail;
  const { width, height } = img.getSize();
  // 1600x900 scales to 1365x768: 1 px short is fine
  if (Math.abs(width - SCREEN.w) > 2 || Math.abs(height - SCREEN.h) > 2) log({ ev: 'shot_size_mismatch', width, height, src: src.name });
  return { png: img.toPNG(), bmp: img.toBitmap(), w: width, ms: Date.now() - t };
}

// setContentProtection does not keep this transparent overlay out of desktopCapturer on Zarif's PC (tested
// 2026-10-28), so the overlay is hidden for the moment of the screenshot.
async function captureClean() {
  overlay.hide();
  sidebar.hideTab();
  await new Promise((r) => setTimeout(r, 60)); // let the compositor drop the window
  try { return await capture(); } finally { overlay.showInactive(); sidebar.showTab(); reassertTop(); }
}

// Pen-stroke outline colour from the brightness under the mark (DESIGN.md `edge`).
function edgeFor(bmp, w, m) {
  if (!bmp) return '#2B3A4B';
  const cx = m.x ?? (m.x1 + m.x2) / 2, cy = m.y ?? (m.y1 + m.y2) / 2;
  const box = m.type === 'highlight' || m.type === 'note', x0 = box ? m.x + m.w / 2 : cx, y0 = box ? m.y + m.h / 2 : cy;
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
// Backup voice for the rest of one answer only (one voice per answer). Every new answer tries Edge again: the old
// "whole session on backup after 3 misses" rule kept Piper on all day (2026-11-04), because Edge's free service has
// slow minutes (3-7 s per sentence) between normal ones (0.2-0.35 s).
let ttsBackup = false;
// Edge budgets. First line 3 s: release -> first say line is ~1.5-2 s (STT + Claude), so the first word stays under
// PRD 8's 5 s. 1.2 s (before 2026-11-04) missed most healthy-but-slowish answers. Later lines are made while the
// previous one plays, so they can wait longer.
const EDGE_FIRST_MS = 3000, EDGE_NEXT_MS = 4000;
function sayLine(ctx, text) {
  const i = ctx.says++;
  send('item', ctx.id, { kind: 'say', i, text });
  // Edge voice, else Piper (offline), else the Windows voice.
  ctx.voice = ctx.voice.then(async () => {
    const t0 = Date.now(), ms = () => Date.now() - t0; // synth_ms for the line_voice log (T0)
    // First sentence: Piper starts at once in parallel, so it is ready the moment Edge's budget runs out
    const early = i === 0 ? piper.synth(text).catch(() => null) : null;
    if (!ttsBackup && !ctx.backup) {
      // Streamed (SPEED-TOKEN-PLAN P7): the overlay starts playing at the first MP3 piece, not the full sentence.
      let started = false;
      const onChunk = (c) => {
        if (!started) { started = true; send('item', ctx.id, { kind: 'audio', i, stream: true, mime: 'audio/mpeg', src: 'edge', synth_ms: ms() }); }
        send('audio:chunk', ctx.id, i, c);
      };
      try {
        await tts.synth(text, i === 0 ? EDGE_FIRST_MS : EDGE_NEXT_MS, onChunk);
        send('audio:end', ctx.id, i);
        return;
      } catch (e) {
        if (started) { send('audio:end', ctx.id, i); log({ ev: 'tts_cut', i, err: e.message }); return; } // already playing: keep what came
        ttsBackup = true; // backup voice for the rest of this answer
        log({ ev: 'tts_fallback', i, err: e.message });
        setTray();
      }
    }
    try {
      const buf = (await early) || await piper.synth(text);
      send('item', ctx.id, { kind: 'audio', i, buf, mime: 'audio/wav', src: 'piper', synth_ms: ms() });
    } catch (e) {
      log({ ev: 'piper_error', err: e.message });
      send('item', ctx.id, { kind: 'audio', i, fallback: true, src: 'windows', synth_ms: ms() });
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
// Status pill in a fixed order (QUALITY-PLAN T12): press -> (screen grabbed) Listening -> Thinking -> Speaking -> none.
const pill = createPillSequencer((kind, text) => send('status', kind, text));
const say = (kind, text) => pill.push(kind, text);

// ---------- turn loop ----------
let turnId = 0, active = null, lastDone = null, pendingAsk = null, timing = {};
let rec = { armed: false, ptt: false }, pttDownAt = 0, shot = null, source = null, replaying = false;

// "Now studying" (NEXT-ROUND phase 1 step 5): foreground window + browser address bar, read at the press.
async function sourceNow() {
  const fg = await platform.foreground();
  const url = /^(brave|chrome|msedge)$/i.test(fg.exe) ? await platform.browserUrl().catch(() => '') : '';
  return { ...fg, url };
}
let sessionTurns = [], lastActivity = Date.now(), learning = false, interview = { asked: false, open: false };
const rater = feedback.createRater(); // Helpful / Not helpful after some answers (Q11)
let pendingRating = null;
let actSeq = 0;
const acts = new Map();
let stopClicks = null;

function bargeIn() {
  turnId++;
  ttsBackup = false; // try the Edge voice again each answer
  tts.warm();
  if (active?.handle) active.handle.cancel();
  active = null;
  send('stop');
  stopClicks?.();
  stopClicks = null;
}

function onPtt(ev) {
  lastActivity = Date.now();
  if (ev === 'sidebar') { rec = { armed: false, ptt: false }; send('rec:cancel'); return sidebar.toggle('hotkey'); }
  if (ev === 'win_down') { rec = { armed: true, ptt: false }; send('rec:start'); } // starts early so the first word isn't cut
  else if (ev === 'ptt_down') {
    send('ear:cut'); // the lecture sound up to this moment goes to Groq while he talks
    rec.ptt = true;
    pttDownAt = Date.now();
    if (timing.ptt_down && !timing.logged) log({ ev: 'turn', interrupted: true, ...rel(timing) });
    timing = { ptt_down: pttDownAt };
    send('rec:start');
    if (replaying) closeReplay();
    bargeIn();
    reassertTop();
    pill.press(); // nothing on screen until the screenshot is taken, so the pill is never in it
    const id = turnId;
    shot = captureClean();
    source = sourceNow();
    const ready = () => { if (id !== turnId) return; timing.feedback_ms ??= Date.now() - pttDownAt; pill.ready(); };
    shot.then(ready, (e) => { log({ ev: 'shot_error', err: e.message }); ready(); });
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
  if (pendingRating) { // the Helpful / Not helpful buttons, or the same words said out loud
    const r = pendingRating;
    pendingRating = null;
    const m = Date.now() < r.until && text.match(/^\W*(not helpful|helpful)\W*$/i);
    if (m) {
      const good = m[1].toLowerCase() === 'helpful';
      log({ ev: 'rating', helpful: good, turn: r.turn });
      say('none');
      if (good) return;
      feedback.send({ kind: 'not helpful', message: `Question: ${r.q}\n\nNibley's answer: ${r.a}`, png: r.png, name: settings.name, brain: settings.brain, logDir })
        .then((res) => log({ ev: 'feedback_sent', kind: 'not helpful', ok: res.ok }));
      return speak("Thanks. I've sent that to Nibley's maker, so it gets fixed.");
    }
  }
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
  if (interview.open && /^\W*skip\W*$/i.test(text)) { // the Skip button: no answer, don't ask again
    interview.open = false;
    settings.pendingQuestion = null;
    saveSettings();
    return say('none');
  }
  if (interview.open) {
    interview.open = false;
    memory.addLearning(DATA, [`Asked "${settings.pendingQuestion}". He said: ${text}`]);
    settings.pendingQuestion = null;
    saveSettings();
    say('none');
    return speak("Thanks, I'll remember that.");
  }
  if (/^\W*(please\s+)?save (this|that)\b/i.test(text)) { say('none'); return saveLesson(); }
  if (/\b(show|open)( me)? my lessons\b/i.test(text)) { say('none'); return sidebar.open('voice', 'lessons'); }
  const side = text.match(/^\W*(?:please\s+)?(open|show|close|hide)\s+(?:the\s+)?side ?bar\W*$/i);
  if (side) { say('none'); return /open|show/i.test(side[1]) ? sidebar.open('voice') : sidebar.close('voice'); }
  await ask(text, id);
}

async function ask(text, id) {
  let s;
  try { s = await shot; } catch { s = {}; }
  await ear.settled(1500); // the lecture piece cut at the hotkey press is usually back from Groq by now
  if (id !== turnId) return;
  timing.shot_ms = s.ms;
  const src = sourceLine(await Promise.race([source?.catch(() => null), new Promise((r) => setTimeout(r, 1000))]), youtube.current());
  if (src) log({ ev: 'source', turn: id, line: src });
  const teach = teacher.before(text);
  const teachEv = { ev: 'teach', turn: id, kind: teach.kind, style: teach.style, check: teach.check, feedback: teach.feedback };
  log(teachEv);
  events.emit('teach', teachEv); // tests
  const ctx = { id, text, check: teach.check, checked: false, png: s.png, bmp: s.bmp, w: s.w, says: 0, voice: Promise.resolve(), asks: [], title: null, full: '', sayLines: [] };
  active = ctx;
  send('turn', id, { busy: busyMap(s.bmp, s.w) });
  let chain = Promise.resolve();
  const parser = createParser((cmd) => { chain = chain.then(() => onCmd(ctx, cmd)).catch((e) => log({ ev: 'cmd_error', err: e.message })); },
    { onBad: (b) => log({ ev: 'bad_line', line: b.line, why: b.why }) });
  ctx.handle = brain.ask({
    // What the lecturer said just now (ARCHITECTURE-v2 3): YouTube captions when there are any, else the sound
    png: s.png, text, turn: id, video: [teach.header, src, study.context(youtube.current()?.videoId), youtube.context() || ear.context()].filter(Boolean).join('\n'),
    onText: (d) => { timing.claude_first_token ||= Date.now(); parser.push(d); },
    onEnd: (full) => { ctx.full = full; parser.end(); chain = chain.then(() => endTurn(ctx)); },
    onError: (kind, detail) => { chain = chain.then(() => brainError(ctx, kind, detail)); },
  });
}

async function onCmd(ctx, cmd) {
  if (ctx.id !== turnId && !ctx.replay) return;
  if (cmd.prose) log({ ev: 'prose_line', text: cmd.text });
  // Answer guard (QUALITY-PLAN T6): long lines cut, max 5 say lines, max 2 marks on screen (oldest fades)
  const r = (ctx.lint ??= createLint()).check(cmd);
  r.fixes.forEach((rule) => log({ ev: 'lint', rule, turn: ctx.id }));
  if (!r.cmd) return;
  cmd = r.cmd;
  if (cmd.type === 'say') {
    if (!ctx.replay) timing.first_say ||= Date.now(); // SPEED-TOKEN-PLAN P0: first full say line parsed
    ctx.sayLines.push(cmd.text);
    return sayLine(ctx, cmd.text);
  }
  if (cmd.type === 'title') { ctx.title = cmd.text; return; }
  if (cmd.type === 'choices') {
    if (teacherMod.isCheck(cmd)) { // "Makes sense?" at most once in 3 answers (Q13)
      if (ctx.check !== 'ok') { log({ ev: 'lint', rule: 'check_not_allowed', turn: ctx.id }); return; }
      ctx.checked = true;
    }
    ctx.hadButtons = true;
    return send('item', ctx.id, { kind: 'choices', options: cmd.options });
  }
  if (cmd.type === 'clear') return send('item', ctx.id, { kind: 'clear' });
  if (cmd.type === 'wait_click') return ctx.replay || send('item', ctx.id, { kind: 'wait', x: cmd.x, y: cmd.y });
  if (cmd.type === 'action') return ctx.replay || onAction(ctx, cmd);
  send('item', ctx.id, { kind: 'mark', mark: { ...cmd, edge: edgeFor(ctx.bmp, ctx.w, cmd) }, fadeOldest: r.fadeOldest });
}

// Claude's coordinates are screenshot pixels (1366x768); clicks and UI Automation need real screen pixels (1600x900).
const toScreen = (x, y) => { const b = screen.getPrimaryDisplay().bounds; return [Math.round(b.x + x * b.width / SCREEN.w), Math.round(b.y + y * b.height / SCREEN.h)]; };

async function onAction(ctx, a) {
  let info = {};
  if (a.kind === 'click') { const [x, y] = toScreen(a.x, a.y); a = { ...a, x, y }; }
  if (a.kind === 'key' && PLAY_PAUSE.test(a.name)) a = { ...a, want: /\b(pause|stop|hold on)\b/i.test(ctx.text) ? 'pause' : /\b(play|resume|continue|unpause|start)\b/i.test(ctx.text) ? 'play' : null };
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

// The video pauses while Nibley explains and plays again after (NEXT-ROUND Q19, phase 1 step 8). Media key, like the
// pause action; only when the YouTube video on screen reads as playing, so it never starts a paused one.
const PLAY_PAUSE = /^(media_play_pause|k|space)$/;
let pausedByUs = false;
async function pauseVideo() {
  const v = youtube.current();
  if (pausedByUs || !v || v.paused) return;
  pausedByUs = true;
  await platform.key('media_play_pause').catch((e) => log({ ev: 'auto_pause_error', err: e.message }));
  log({ ev: 'auto_pause', videoId: v.videoId, t: Math.round(v.t) });
}
async function resumeVideo() {
  if (!pausedByUs) return;
  pausedByUs = false;
  const v = youtube.current();
  if (!v || !v.paused) return; // he played it himself, or the video is gone
  await platform.key('media_play_pause').catch((e) => log({ ev: 'auto_pause_error', err: e.message }));
  log({ ev: 'auto_resume', videoId: v.videoId, t: Math.round(v.t) });
}

async function runAction(a) {
  try {
    if (a.kind === 'key' && PLAY_PAUSE.test(a.name)) {
      pausedByUs = false; // he controls the video now: no auto resume
      const v = youtube.current(); // play/pause keys toggle: skip when the video is already how he wants it
      if (v && a.want && (a.want === 'pause') === v.paused) return log({ ev: 'action_skip', action: a, why: `already ${a.want === 'pause' ? 'paused' : 'playing'}` });
    }
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
    send('item', ctx.id, { kind: 'choices', options: ['Yes', 'No'] }); // QUALITY-PLAN T13: buttons Nibley's code adds
    pendingAsk = { actions: ctx.asks.map((x) => x.a), until: Date.now() + 20000 };
  } else if (ctx.says && settings.pendingQuestion && !interview.asked) {
    interview = { asked: true, open: true }; // mini-interview: at most once per session
    sayLine(ctx, `Quick question: ${settings.pendingQuestion}`);
    send('item', ctx.id, { kind: 'choices', options: ['Skip'] });
  } else if (ctx.says && rater.due({ hadButtons: ctx.hadButtons })) {
    send('item', ctx.id, { kind: 'choices', options: ['Helpful', 'Not helpful'] });
    pendingRating = { turn: ctx.id, q: ctx.text, a: ctx.sayLines.join(' '), png: ctx.png, until: Date.now() + 120e3 };
  }
  send('item', ctx.id, { kind: 'end' });
  if (ctx.says) teacher.after({ checked: ctx.checked });
  if (!ctx.says && !ctx.asks.length) say('none');
  timing.claude_end = Date.now();
  if (ctx.says) {
    lastDone = ctx;
    sessionTurns.push({ q: ctx.text, a: ctx.sayLines.join(' ') });
    study.addQuestion(youtube.current(), { q: ctx.text, a: ctx.sayLines.join(' ') }); // lands on the lecture's study page
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
    const dir = lessons.save({ vault: DATA, png: lastDone.png, script: lastDone.full, title, question: lastDone.text });
    log({ ev: 'lesson_saved', dir });
    speak(`Saved: ${title}.`);
  } catch (e) {
    log({ ev: 'lesson_error', err: e.message });
    speak("I couldn't save that lesson.");
  }
}

function playLesson(dir) {
  const { png, script } = lessons.load(dir);
  bargeIn();
  replaying = true;
  sidebar.close('replay');
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
  sidebar.open('replay-back', 'lessons');
}

// ---------- IPC ----------
ipcMain.on('rec:data', (_e, buf, dur) => onUtterance(buf, dur));
ipcMain.on('voice:start', (_e, { turn, i, src, synth_ms, wait_ms }) => {
  if (turn === turnId && i === 0 && !timing.first_audio) timing.first_audio = Date.now();
  // Claude's answer starts speaking (not a confirmation, not an Ask-first question): the video waits for him
  if (turn === turnId && i === 0 && active?.id === turn && !active.asks.length && !replaying) pauseVideo();
  // Speaking after Listening/Thinking or from nothing (spoken confirmations); an error or message stays up
  if (turn === turnId && !replaying && ['listening', 'thinking', 'none'].includes(pill.current)) say('speaking', 'Speaking');
  // One line per spoken sentence, so the log shows which voice really played (QUALITY-PLAN T0, scorecard Q1).
  log({ ev: 'line_voice', turn, i, src, voice: src === 'edge' ? settings.voice : undefined, synth_ms, wait_ms });
});
ipcMain.on('turn:done', (_e, id) => {
  events.emit('turn:done', id);
  if (id === turnId) resumeVideo(); // after a barge-in the old turn never ends: the next answer's end plays it again
  if (id === turnId && !['error', 'msg'].includes(pill.current)) say('none'); // the answer ended: the pill leaves
  if (id !== turnId || !timing.ptt_down || timing.logged) return;
  timing.turn_end = Date.now();
  timing.logged = true;
  log({ ev: 'turn', model: settings.model, ...rel(timing) });
});
ipcMain.on('waiting', (_e, at) => {
  stopClicks?.();
  const [x, y] = toScreen(at.x, at.y); // the mouse hook reports real screen pixels
  stopClicks = platform.onMouseClick((cx, cy) => { if (Math.hypot(cx - x, cy - y) <= 40) { stopClicks?.(); stopClicks = null; send('advance'); } });
});
ipcMain.on('waiting-done', () => { stopClicks?.(); stopClicks = null; });
// Answer buttons (QUALITY-PLAN T13). While they show: the mouse reaches the overlay only over the buttons, and the
// helper takes Enter, Esc, 1-3 (any other key lets go at once, so typing is never blocked).
let choicesOn = false, cardsOn = false;
const mouseThrough = () => overlay.setIgnoreMouseEvents(true, choicesOn || cardsOn ? { forward: true } : undefined); // forward: hover works
ipcMain.on('choices:shown', (_e, on) => {
  if (replaying) return;
  choicesOn = on;
  mouseThrough();
  platform.grabKeys(on).catch((e) => log({ ev: 'helper_error', err: e.message }));
});
ipcMain.on('choices:mouse', (_e, over) => { if (!replaying) (over ? overlay.setIgnoreMouseEvents(false) : mouseThrough()); });
// Note cards (NEXT-ROUND phase 3 v2). While marks show: the mouse over a card keeps them (hover needs forwarded moves),
// and they clear at once when he switches window or tab (the foreground title changes), so nothing lingers (Q3).
let screenWatch = null;
ipcMain.on('cards:shown', async (_e, on) => {
  if (replaying) return;
  cardsOn = on;
  mouseThrough();
  clearInterval(screenWatch);
  screenWatch = null;
  if (!on) return;
  const base = (await platform.foreground().catch(() => null))?.title;
  if (!cardsOn || base == null || screenWatch) return;
  screenWatch = setInterval(async () => {
    const now = (await platform.foreground().catch(() => null))?.title;
    if (now == null || now === base || !screenWatch) return;
    clearInterval(screenWatch);
    screenWatch = null;
    log({ ev: 'marks_cleared', why: 'window_changed' });
    send('marks:clear');
  }, 400);
});
ipcMain.on('choice', (_e, { text, how }) => {
  log({ ev: 'choice', text, how });
  bargeIn();
  timing = { ptt_down: Date.now(), ptt_up: Date.now(), stt_done: Date.now(), choice: how }; // first word is timed from the pick
  handleText(text, turnId);
});
ipcMain.on('act', (_e, id) => { const a = acts.get(id); acts.delete(id); if (a) runAction(a); });
ipcMain.on('replay:close', () => replaying && closeReplay());
ipcMain.on('ear', (_e, r) => log({ ev: 'ear', ...r }));
ipcMain.on('ear:piece', (_e, buf, meta) => { ear.onPiece({ buf: Buffer.from(buf), ...meta }); });
ipcMain.on('mic', (_e, r) => { log({ ev: 'mic', ...r }); if (!r.ok) { setTray('mic blocked', true); speak("I can't use the microphone. Check Windows privacy settings for microphone access.", true); } });
ipcMain.handle('lessons:list', () => lessons.list(DATA).map((l) => ({
  ...l, thumb: nativeImage.createFromPath(path.join(l.dir, 'shot.png')).resize({ width: 192 }).toDataURL(),
})));
ipcMain.handle('settings:get', () => ({ version: updater.version(ROOT), brain: settings.brain || 'claude', model: settings.model, mode: settings.mode, voice: settings.voice, ear: settings.ear !== false, voices: VOICES }));
ipcMain.handle('settings:set', (_e, key, value) => { setSetting(key, value); return { brain: settings.brain || 'claude', model: settings.model, mode: settings.mode, voice: settings.voice, ear: settings.ear !== false, voices: VOICES }; });
ipcMain.on('voice:sample', () => speak('Hi, this is how I sound.'));
ipcMain.on('sidebar:toggle', (_e, how) => sidebar.toggle(how));
ipcMain.on('lessons:play', (_e, dir) => {
  const rel = path.relative(lessons.root(DATA), path.resolve(dir));
  if (rel && !rel.startsWith('..') && !path.isAbsolute(rel)) playLesson(dir);
});

// ---------- automatic updates to marked releases (src/updater.js, brainstorm 2026-11-09-auto-update) ----------
let updating = false;
async function checkUpdate() {
  if (updating) return;
  updating = true;
  const r = await updater.check({ root: ROOT, log }).catch((e) => ({ state: 'failed', why: e.message }));
  log({ ev: 'update_check', state: r.state, from: r.from, to: r.to, why: r.why });
  if (r.state !== 'updated') { updating = false; return; }
  settings.whatsNew = { version: r.to, notes: r.notes };
  saveSettings();
  const restartWhenQuiet = setInterval(() => { // never in the middle of an answer or a lesson replay
    if (replaying || Date.now() - lastActivity < 60e3) return;
    clearInterval(restartWhenQuiet);
    log({ ev: 'update_restart', to: r.to });
    app.relaunch();
    app.exit(0);
  }, 5000);
}

// ---------- study page: every 5 s while a YouTube video is on screen ----------
let studying = false;
setInterval(async () => {
  const v = youtube.current();
  if (studying || !v) return;
  studying = true;
  try { if (await study.tick(v) === 'ended') sidebar.open('study-end', 'study'); } // the quick check waits in the sidebar
  catch (e) { log({ ev: 'study_error', kind: 'tick', err: e.message }); }
  studying = false;
}, 5000).unref();
ipcMain.handle('study:get', () => study.view());
ipcMain.on('study:answer', (_e, i, k) => study.answer(i, k));
ipcMain.on('study:card', (_e, i) => study.toggleCard(i));
ipcMain.on('study:analyze', () => study.analyze());
// "Send feedback" in the sidebar: his words, an optional screenshot of what's behind the sidebar, recent errors.
ipcMain.handle('feedback:send', async (_e, { message, screenshot }) => {
  let png = null;
  if (screenshot) {
    const open = sidebar.isOpen();
    sidebar.win.hide();
    try { png = (await captureClean()).png; } catch (e) { log({ ev: 'feedback_shot_error', err: e.message }); }
    if (open) sidebar.win.showInactive();
  }
  const r = await feedback.send({ kind: 'feedback', message, png, name: settings.name, brain: settings.brain, logDir });
  log({ ev: 'feedback_sent', kind: 'feedback', ok: r.ok, screenshot: !!png });
  return r;
});
ipcMain.on('study:seek', (_e, t) => { if (!youtube.seek(t)) log({ ev: 'study_seek_failed' }); });

// ---------- learner: after 5 min idle with 2+ turns ----------
setInterval(async () => {
  if (learning || sessionTurns.length < 2 || Date.now() - lastActivity < IDLE_LEARN_MS) return;
  learning = true;
  const turns = sessionTurns;
  sessionTurns = [];
  try {
    const r = await memory.learn({ vault: DATA, claudePath: settings.claudePath, turns, name: settings.name, run: runAI });
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
  log({ ev: 'start', display: d.bounds, scale: d.scaleFactor, settings: { model: settings.model, mode: settings.mode, voice: settings.voice }, lint: true }); // lint: answer guard wired (scorecard Q9)
  // Any 16:9 screen at 100% works (screenshot and marks scale); other shapes or scaling are untested.
  if (d.scaleFactor !== 1 || Math.abs(d.bounds.width / d.bounds.height - SCREEN.w / SCREEN.h) > 0.02) log({ ev: 'display_mismatch', note: 'Tested on 16:9 at 100%; marks may be off.' });
  if (screen.getAllDisplays().length > 1) log({ ev: 'displays', n: screen.getAllDisplays().length, note: 'Nibley sees and draws on the primary screen only.' });
  const isOverlay = (wc) => overlay && wc && wc.id === overlay.webContents.id;
  const allowed = (wc, perm) => ['media', 'display-capture'].includes(perm) && isOverlay(wc);
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => cb(allowed(wc, perm)));
  session.defaultSession.setPermissionCheckHandler((wc, perm) => allowed(wc, perm));
  // The lecture ear asks for the screen's sound; only the overlay gets it, as system audio (loopback), never a picture.
  session.defaultSession.setDisplayMediaRequestHandler((req, cb) => {
    if (!overlay || req.frame !== overlay.webContents.mainFrame) return cb({});
    desktopCapturer.getSources({ types: ['screen'] }).then((s) => cb({ video: s[0], audio: 'loopback' }), () => cb({}));
  });
  ear.start({
    transcribe: (buf, o) => stt.transcribe(buf, { key: groqKey(), mime: 'audio/webm', ...o }),
    micUsers: () => platform.micUsers(), foreground: () => platform.foreground(),
    ownMic: (name) => name.toLowerCase() === process.execPath.replaceAll('\\', '#').toLowerCase(), // Windows lists apps by path, # for each \
    enabled: () => settings.ear !== false, vaultPath: DATA, log,
  });
  createOverlay();
  screen.on('display-metrics-changed', reassertTop);
  sidebar.create({ settings, save: saveSettings, log, quitting: () => quitting });
  tray = new Tray(trayIcon());
  tray.on('click', () => sidebar.toggle('tray')); // right-click keeps the menu
  buildMenu();
  setTray('starting');
  platform.onError((e) => log({ ev: 'helper_error', err: String(e).slice(0, 300) }));
  platform.onPtt(onPtt);
  platform.onKey((name) => send('choices:key', name));
  brain.start({
    model: settings.model, claudePath: settings.claudePath,
    buildPrompt: () => [prompt.build({ vaultPath: DATA, apps: settings.apps, name: settings.name }), styles.section()].join('\n\n'), // same as the eval
    onFatal: (msg) => { setTray('Claude keeps crashing', true); speak(msg); },
  });
  youtube.start({ platform, vaultPath: DATA, log }); // reads YouTube from the browser window, no extension
  if (!piper.start(path.join(ROOT, 'piper', 'piper.exe'), path.join(ROOT, 'piper', 'voices', 'en_US-lessac-medium.onnx'))) log({ ev: 'piper_missing' });
  await Promise.all([
    platform.start(),
    tts.init(settings.voice).catch((e) => { ttsBackup = true; log({ ev: 'tts_fallback', err: e.message }); }),
  ]);
  setTray('ready', !groqKey());
  log({ ev: 'ready', ms: Math.round(process.uptime() * 1000) });
  events.emit('ready');
  if (settings.whatsNew) { // first start after an automatic update
    const w = settings.whatsNew;
    delete settings.whatsNew;
    saveSettings();
    setTimeout(() => speak(`I've been updated to version ${w.version}. ${String(w.notes || '').split(/(?<=[.!?])\s/)[0]}`), 3000);
  }
  if (!process.env.NIBLEY_SETTINGS) { setTimeout(checkUpdate, 30e3); setInterval(checkUpdate, 6 * 3600e3).unref(); } // tests never update
});
app.on('window-all-closed', () => {}); // keep running in the tray
app.on('before-quit', () => { quitting = true; brain.stop(); platform.stop(); tts.close(); piper.stop(); youtube.stop(); });


// Test entry: one turn with a given screenshot instead of the hotkey, mic and screen capture.
function testTurn(text, png, { showShot = true } = {}) {
  bargeIn();
  timing = { ptt_down: Date.now(), ptt_up: Date.now(), stt_done: Date.now() };
  const img = nativeImage.createFromBuffer(png);
  shot = Promise.resolve({ png, bmp: img.toBitmap(), w: img.getSize().width, ms: 0 });
  source = sourceNow();
  const showBg = (ch) => { if (ch !== 'turn') return; events.off('send', showBg); send('bg', `data:image/png;base64,${png.toString('base64')}`); };
  if (showShot) events.on('send', showBg);
  return handleText(text, turnId);
}

module.exports = { events, groqKey, study, testTurn, captureClean, setVoice, VOICES, handleText, playLesson, closeReplay, onPtt, ready: new Promise((r) => events.once('ready', r)),
  get overlay() { return overlay; }, get tray() { return tray; }, sidebar,
  get state() { return { turnId, lastDone, pendingAsk, replaying, timing, ttsBackup, settings }; } };
