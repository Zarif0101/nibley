// Offline backup voice: Piper kept running with the model loaded, one WAV per sentence (Zarif, 2026-10-28:
// the Windows voice is too robotic). Measured on this laptop: 0.13-0.7 s per sentence once loaded.
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const readline = require('node:readline');

let proc = null, waits = [], seq = 0;

// Returns false when Piper isn't installed (then the caller keeps the Windows voice as backup).
function start(exe, model) {
  if (!fs.existsSync(exe) || !fs.existsSync(model)) return false;
  proc = spawn(exe, ['--model', model, '--json-input'], { shell: false, windowsHide: true });
  proc.stdin.on('error', () => {});
  proc.stderr.resume(); // info logs; unread they would fill the pipe
  readline.createInterface({ input: proc.stdout }).on('line', () => waits.shift()?.());
  proc.on('exit', () => { proc = null; waits = []; });
  synth('Ready.').catch(() => {}); // loads the model now (~1.5 s), not on the first real sentence
  return true;
}

// Piper prints one line per finished file, in order. A timed-out request keeps its place in the queue,
// so later sentences still match their own output line.
function synth(text, timeoutMs = 8000) {
  if (!proc) return Promise.reject(new Error('piper not running'));
  const file = path.join(os.tmpdir(), `nibley-piper-${process.pid}-${seq++ % 20}.wav`);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`piper: no audio in ${timeoutMs} ms`)), timeoutMs);
    waits.push(() => {
      clearTimeout(timer);
      try { resolve(fs.readFileSync(file)); } catch (e) { reject(e); }
      fs.rm(file, () => {});
    });
    proc.stdin.write(JSON.stringify({ text, output_file: file }) + '\n');
  });
}

module.exports = { start, synth, stop: () => proc?.kill() };
