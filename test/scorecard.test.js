const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { parseLog, score, format } = require('../test/scorecard');

const turn = (up, audio, extra = {}) => ({ ev: 'turn', ptt_up: up, first_audio: audio, ...extra });
const get = (rows, id) => rows.find((r) => r.id === id);

test('parseLog skips torn lines', () => {
  assert.equal(parseLog('{"ev":"start"}\n{"ev":"tu\n\n{"ev":"turn"}\n').length, 2);
});

test('empty log: every row is no data except e2e-based ones', () => {
  const rows = score([]);
  assert.equal(rows.length, 10);
  assert.ok(rows.every((r) => r.status === 'no data'));
});

test('Q1 uses line_voice when present, ignoring offline lines', () => {
  const ev = [...Array(19).fill({ ev: 'line_voice', src: 'edge' }), { ev: 'line_voice', src: 'piper' }, { ev: 'line_voice', src: 'piper', offline: true }];
  assert.equal(get(score(ev), 'Q1').status, 'pass');
  assert.equal(get(score([{ ev: 'line_voice', src: 'piper' }, { ev: 'line_voice', src: 'edge' }]), 'Q1').status, 'fail');
});

test('Q1 falls back to backup_voice per turn on old logs', () => {
  const ev = [turn(100, 1500), turn(100, 1500), { ev: 'backup_voice', src: 'piper' }];
  const r = get(score(ev), 'Q1');
  assert.equal(r.status, 'fail');
  assert.match(r.value, /no line_voice yet/);
});

test('Q2 median and p90 from ptt_up to first audio; interrupted turns ignored', () => {
  const ev = [turn(0, 2000), turn(0, 2400), turn(0, 2200), turn(0, 9000, { interrupted: true })];
  assert.equal(get(score(ev), 'Q2').status, 'pass');
  assert.equal(get(score([turn(0, 3000), turn(0, 3100)]), 'Q2').status, 'fail');
});

test('Q5/Q10 read e2e results, Q6 compares eval to baseline', () => {
  const e2e = [{ name: 'PRD 1 explain', pass: true }, { name: 'PRD 2 step', pass: true }, { name: 'PRD 3 diagram', pass: false },
    { name: 'STT accuracy (10 phrases)', pass: true, detail: 'word errors 1/50, Groq time median 245 ms' }];
  const rows = score([], { e2e, evals: [{ score: 0.8, baseline: true }, { score: 0.79 }] });
  assert.equal(get(rows, 'Q5').status, 'fail');
  assert.equal(get(rows, 'Q10').status, 'pass');
  assert.equal(get(rows, 'Q6').status, 'pass');
  assert.equal(get(score([], { evals: [{ score: 0.8, baseline: true }, { score: 0.7 }] }), 'Q6').status, 'fail');
});

test('Q7 counts error events; Q9 needs the guard wired', () => {
  const ev = [{ ev: 'start', lint: true }, turn(0, 1000), turn(0, 1000), { ev: 'cmd_error' }, { ev: 'lint', rule: 'long_line', turn: 1 }];
  const rows = score(ev);
  assert.equal(get(rows, 'Q7').status, 'fail');
  assert.equal(get(rows, 'Q9').status, 'fail'); // 1 of 2 turns needed a fix
  assert.equal(get(score([turn(0, 1000)]), 'Q9').status, 'no data');
});

test('CLI prints a table for a given log file', () => {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'nb-')), 'nibley-2026-11-04.log');
  fs.writeFileSync(f, [turn(0, 1800), { ev: 'line_voice', src: 'edge' }].map((e) => JSON.stringify(e)).join('\n'));
  const out = execFileSync(process.execPath, [path.join(__dirname, 'scorecard.js'), f], { encoding: 'utf8' });
  assert.match(out, /Q1\s+Voice/);
  assert.match(out, /Q2\s+Speed.*PASS/);
  assert.ok(format(score([])).split('\n').length === 11);
});
