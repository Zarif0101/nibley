// Quality scorecard (QUALITY-PLAN section 1): reads Nibley's logs + test results, prints Q1-Q10 as pass / fail / no data.
//   node test/scorecard.js                 newest logs/nibley-*.log
//   node test/scorecard.js logs/a.log ...  these logs
// Reads test/out/e2e-results.json and the newest test/out/eval-*.json when present. Never fails the process unless --strict.
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const median = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const pct = (a, q) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.ceil(q * s.length) - 1)]; };
const row = (id, check, target, value, status) => ({ id, check, target, value, status });
const ERROR_EVENTS = new Set(['cmd_error', 'claude_error', 'piper_error', 'shot_error', 'action_error', 'lesson_error', 'learner_error', 'tts_init_error', 'uncaught']);

function parseLog(text) {
  const out = [];
  for (const line of String(text).split(/\r?\n/)) { if (!line.trim()) continue; try { out.push(JSON.parse(line)); } catch { /* torn line */ } }
  return out;
}

function score(events, { e2e = [], evals = [] } = {}) {
  const turns = events.filter((e) => e.ev === 'turn' && !e.interrupted);
  const rows = [];

  // Q1 voice: every spoken line (line_voice, T0); older logs only know about line 1 (backup_voice on line 0).
  const lines = events.filter((e) => e.ev === 'line_voice' && !e.offline);
  if (lines.length) {
    const share = lines.filter((e) => e.src === 'edge').length / lines.length;
    rows.push(row('Q1', 'Voice', 'chosen voice ≥ 95% of lines', `${Math.round(share * 100)}% of ${lines.length} lines`, share >= 0.95 ? 'pass' : 'fail'));
  } else if (turns.length) {
    const backup = events.filter((e) => e.ev === 'backup_voice').length;
    const share = Math.max(0, 1 - backup / turns.length);
    rows.push(row('Q1', 'Voice', 'chosen voice ≥ 95% of lines', `${Math.round(share * 100)}% of first lines (${turns.length} turns, no line_voice yet)`, share >= 0.95 ? 'pass' : 'fail'));
  } else rows.push(row('Q1', 'Voice', 'chosen voice ≥ 95% of lines', '-', 'no data'));

  // Q2 speed: first word after letting go of the hotkey.
  const lat = turns.filter((t) => t.first_audio != null && t.ptt_up != null).map((t) => t.first_audio - t.ptt_up);
  if (lat.length) {
    const m = median(lat), p = pct(lat, 0.9);
    rows.push(row('Q2', 'Speed', 'first word ≤ 2.5 s median, ≤ 4 s p90', `${(m / 1000).toFixed(2)} s median, ${(p / 1000).toFixed(2)} s p90 (${lat.length} turns)`, m <= 2500 && p <= 4000 ? 'pass' : 'fail'));
  } else rows.push(row('Q2', 'Speed', 'first word ≤ 2.5 s median, ≤ 4 s p90', '-', 'no data'));

  // Q3 feedback: feedback_ms logged at ptt_down (T3).
  const fb = events.filter((e) => e.feedback_ms != null).map((e) => e.feedback_ms);
  rows.push(fb.length
    ? row('Q3', 'Feedback', 'seen or heard ≤ 150 ms after press', `${median(fb)} ms median (${fb.length} presses)`, median(fb) <= 150 ? 'pass' : 'fail')
    : row('Q3', 'Feedback', 'seen or heard ≤ 150 ms after press', '-', 'no data'));

  const e2eRow = (re) => e2e.find((r) => re.test(r.name));
  // Q4 subtitles: an e2e check named "subtitle".
  const sub = e2eRow(/subtitle/i);
  rows.push(sub ? row('Q4', 'Understand', 'subtitle on every line, ±150 ms', sub.detail || '', sub.pass ? 'pass' : 'fail')
    : row('Q4', 'Understand', 'subtitle on every line, ±150 ms', '-', 'no data'));

  // Q5 aim: eval S3 when there is an eval run, else e2e PRD 1-3.
  const ev = evals.length ? evals[evals.length - 1] : null;
  if (ev && ev.scores && ev.scores.S3 != null) rows.push(row('Q5', 'Aim', 'marks on target ≥ 90%', `${Math.round(ev.scores.S3 * 100)}% (eval ${ev.date || ''})`.trim(), ev.scores.S3 >= 0.9 ? 'pass' : 'fail'));
  else {
    const aim = [/^PRD 1\b/, /^PRD 2\b/, /^PRD 3\b/].map(e2eRow).filter(Boolean);
    rows.push(aim.length ? row('Q5', 'Aim', 'marks on target ≥ 90%', `${aim.filter((r) => r.pass).length}/${aim.length} e2e fixtures`, aim.every((r) => r.pass) ? 'pass' : 'fail')
      : row('Q5', 'Aim', 'marks on target ≥ 90%', '-', 'no data'));
  }

  // Q6 teach: newest eval vs the baseline (first file marked baseline, else the oldest).
  if (evals.length >= 2) {
    const base = evals.find((e) => e.baseline) || evals[0], last = evals[evals.length - 1];
    rows.push(row('Q6', 'Teach', 'eval ≥ baseline − 0.02', `${last.score.toFixed(3)} vs ${base.score.toFixed(3)}`, last.score >= base.score - 0.02 ? 'pass' : 'fail'));
  } else rows.push(row('Q6', 'Teach', 'eval ≥ baseline − 0.02', evals.length ? `${evals[0].score.toFixed(3)} (baseline only)` : '-', 'no data'));

  // Q7 stable: errors per 50 turns.
  const errs = events.filter((e) => ERROR_EVENTS.has(e.ev)).length;
  rows.push(turns.length ? row('Q7', 'Stable', '0 errors per 50 turns', `${errs} errors in ${turns.length} turns`, errs === 0 ? 'pass' : 'fail')
    : row('Q7', 'Stable', '0 errors per 50 turns', '-', 'no data'));

  // Q8 light: idle samples (ev 'idle', cpu %, ram_mb), logged by the local session.
  const idle = events.filter((e) => e.ev === 'idle' && e.cpu != null);
  if (idle.length) {
    const cpu = median(idle.map((e) => e.cpu)), ram = Math.max(...idle.map((e) => e.ram_mb || 0));
    rows.push(row('Q8', 'Light', 'idle CPU < 2%, RAM < 900 MB', `${cpu}% CPU, ${ram} MB max`, cpu < 2 && ram < 900 ? 'pass' : 'fail'));
  } else rows.push(row('Q8', 'Light', 'idle CPU < 2%, RAM < 900 MB', '-', 'no data'));

  // Q9 calm: share of turns where the answer guard had to step in (lint wired = a start event with lint: true).
  const lintOn = events.some((e) => e.ev === 'start' && e.lint);
  if (lintOn && turns.length) {
    const fixedTurns = new Set(events.filter((e) => e.ev === 'lint').map((e) => e.turn ?? e.t)).size;
    const share = fixedTurns / turns.length;
    rows.push(row('Q9', 'Calm', 'guard steps in on < 20% of turns', `${Math.round(share * 100)}% of ${turns.length} turns`, share < 0.2 ? 'pass' : 'fail'));
  } else rows.push(row('Q9', 'Calm', 'guard steps in on < 20% of turns', '-', 'no data'));

  // Q10 hear: e2e STT row "word errors X/Y".
  const stt = e2eRow(/^STT/);
  const m = stt && /word errors (\d+)\/(\d+)/.exec(stt.detail || '');
  rows.push(m ? row('Q10', 'Hear', 'word errors ≤ 2%', `${m[1]}/${m[2]} words`, Number(m[1]) / Number(m[2]) <= 0.02 ? 'pass' : 'fail')
    : row('Q10', 'Hear', 'word errors ≤ 2%', '-', 'no data'));
  return rows;
}

function format(rows) {
  const w = [4, 11, 36, 46];
  const line = (c) => c.map((v, i) => String(v).padEnd(w[i] || 0)).join(' ');
  return [line(['#', 'Check', 'Target', 'Now']) + 'Result', ...rows.map((r) => line([r.id, r.check, r.target, r.value]) + r.status.toUpperCase())].join('\n');
}

function readJson(file, fallback) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; } }

function main(argv) {
  const files = argv.filter((a) => !a.startsWith('--'));
  const logDir = path.join(ROOT, 'logs');
  const logs = files.length ? files : (fs.existsSync(logDir) ? fs.readdirSync(logDir).filter((f) => /^nibley-.*\.log$/.test(f)).sort().slice(-1).map((f) => path.join(logDir, f)) : []);
  const events = logs.flatMap((f) => parseLog(fs.readFileSync(f, 'utf8')));
  const out = path.join(ROOT, 'test', 'out');
  const e2e = readJson(path.join(out, 'e2e-results.json'), []);
  const evals = fs.existsSync(out) ? fs.readdirSync(out).filter((f) => /^eval-.*\.json$/.test(f)).sort().map((f) => readJson(path.join(out, f), null)).filter((e) => e && typeof e.score === 'number') : [];
  const rows = score(events, { e2e, evals });
  console.log(`Logs: ${logs.map((f) => path.relative(ROOT, f)).join(', ') || 'none'}\n`);
  console.log(format(rows));
  if (argv.includes('--strict') && rows.some((r) => r.status === 'fail')) process.exitCode = 1;
}

if (require.main === module) main(process.argv.slice(2));
module.exports = { parseLog, score, format };
