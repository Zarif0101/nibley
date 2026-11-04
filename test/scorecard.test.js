const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { parseLog, score, format, timeBreakdown } = require('../test/scorecard');

const turn = (up, audio, extra = {}) => ({ ev: 'turn', ptt_up: up, first_audio: audio, ...extra });
const get = (rows, id) => rows.find((r) => r.id === id);

test('parseLog skips torn lines', () => {
  assert.equal(parseLog('{"ev":"start"}\n{"ev":"tu\n\n{"ev":"turn"}\n').length, 2);
});

test('empty log: every row is no data except e2e-based ones', () => {
  const rows = score([]);
  assert.equal(rows.length, 13);
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
  assert.ok(format(score([])).split('\n').length === 14);
});

test('Q11-Q13: fresh tokens, cache share and free answers from usage logs', () => {
  const ev = [
    { ev: 'claude_usage', input: 1500, cache_write: 300, cache_read: 4000, output: 120 },
    { ev: 'claude_usage', input: 1400, cache_write: 0, cache_read: 5000, output: 90 },
    { ev: 'free_answer', kind: 'again' },
  ];
  const rows = score(ev);
  assert.equal(get(rows, 'Q11').status, 'pass');
  assert.equal(get(rows, 'Q12').status, 'pass');
  assert.match(get(rows, 'Q13').value, /1 of 3/);
  const cold = score([{ ev: 'claude_usage', input: 9000, cache_write: 6000, cache_read: 0 }]);
  assert.equal(get(cold, 'Q11').status, 'fail');
  assert.equal(get(cold, 'Q12').status, 'fail');
});

test('time breakdown gives the median of each step', () => {
  const t = (stt, claude, say, audio) => ({ ev: 'turn', ptt_up: 1000, stt_done: 1000 + stt, claude_first_token: 1000 + stt + claude, first_say: 1000 + stt + claude + say, first_audio: 1000 + stt + claude + say + audio });
  const tb = timeBreakdown([t(250, 900, 200, 600), t(300, 1100, 300, 700), t(200, 800, 100, 500)]);
  assert.deepEqual(tb, { n: 3, stt: 250, claude: 900, firstLine: 200, voice: 600 });
  const old = timeBreakdown([{ ev: 'turn', ptt_up: 1000, stt_done: 1250, claude_first_token: 2150, first_audio: 2750 }]);
  assert.equal(old.firstLine, null);
  assert.equal(old.voice, 600, 'without first_say, voice is measured from the first text');
});
