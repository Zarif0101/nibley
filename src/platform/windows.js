// Windows platform: runs helper.ps1 and maps the contract (BUILD-PLAN 2b) to its text commands.
const { spawn } = require('node:child_process');
const path = require('node:path');
const readline = require('node:readline');

let proc, nextId = 1, readyResolve, crashes = [];
const pending = new Map();
const pttListeners = [], clickListeners = [];
let ready = new Promise((r) => (readyResolve = r));
let onError = () => {};

function start() {
  proc = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', path.join(__dirname, 'helper.ps1')], { shell: false, windowsHide: true });
  readline.createInterface({ input: proc.stdout }).on('line', (line) => {
    let m;
    try { m = JSON.parse(line); } catch { return onError(`helper said: ${line}`); }
    if (m.id) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      if (p) m.ok ? p.resolve(m) : p.reject(new Error(m.err));
    } else if (m.ev === 'ready') readyResolve();
    else if (m.ev === 'click') clickListeners.forEach((cb) => cb(m.x, m.y));
    else if (m.ev === 'error') onError(m.err);
    else pttListeners.forEach((cb) => cb(m.ev)); // win_down, ptt_down, ptt_up, win_up
  });
  proc.stderr.on('data', (d) => onError(String(d).trim()));
  proc.on('exit', (code) => {
    for (const p of pending.values()) p.reject(new Error('helper exited'));
    pending.clear();
    if (proc.stopping) return;
    crashes = crashes.filter((t) => Date.now() - t < 300000).concat(Date.now());
    onError(`helper exited (${code})`);
    if (crashes.length < 3) { ready = new Promise((r) => (readyResolve = r)); start(); }
  });
  return ready;
}

function send(...args) {
  const id = nextId++;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    proc.stdin.write(`${id} ${args.join(' ')}\n`);
    setTimeout(() => pending.has(id) && (pending.delete(id), reject(new Error(`helper timeout: ${args[0]}`))), 5000);
  });
}

const b64 = (s) => Buffer.from(s, 'utf8').toString('base64');

module.exports = {
  start,
  stop() { if (proc) { proc.stopping = true; proc.kill(); } },
  onError(cb) { onError = cb; },
  onPtt(cb) { pttListeners.push(cb); },
  async click(x, y) { await send('click', Math.round(x), Math.round(y)); },
  async type(text) { await send('type', b64(text)); },
  async key(name) { await send('key', name); },
  async scroll(dir, n) { await send('scroll', dir, n); },
  async elementAt(x, y) { const r = await send('uia_at', Math.round(x), Math.round(y)); return { name: r.name, role: r.role, isPassword: r.isPassword, box: r.box, pid: r.pid }; },
  async focusedIsPassword() { return (await send('uia_focused')).isPassword === true; },
  // Starts watching left clicks; returns a stop function.
  onMouseClick(cb) {
    clickListeners.push(cb);
    if (clickListeners.length === 1) send('watch_clicks', 1).catch(onError);
    return () => {
      const i = clickListeners.indexOf(cb);
      if (i >= 0) clickListeners.splice(i, 1);
      if (!clickListeners.length) send('watch_clicks', 0).catch(() => {});
    };
  },
  async openUrl(url) { await send('open', b64(url)); },
  async openApp(exe) { await send('open', b64(exe)); },
  async ping() { await send('ping'); },
};
