// Daily usage report to Nibley's maker, only with the user's yes (brainstorm 2026-11-09-user-insights, Q1-Q3).
// Counts from one finished day's local log: no question text, no video titles, no topics, no name. Each install has a
// random id so reports from the same PC can be told apart. The optional profile (3 skippable answers) goes once.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const PROBLEM = /error|crash|fail|fatal|fallback|no_transcript|rolled_back/;
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };
const secs = (ms) => (ms == null ? '-' : `${(ms / 1000).toFixed(1)} s`);

// One day's log text -> numbers only.
function summarize(text) {
  const evs = [];
  for (const l of String(text).split('\n')) { try { evs.push(JSON.parse(l)); } catch { /* partial line */ } }
  const count = (name) => evs.filter((e) => e.ev === name).length;
  const waits = evs.filter((e) => e.ev === 'turn' && e.first_audio && e.ptt_up).map((e) => e.first_audio - e.ptt_up).filter((x) => x > 0);
  const problems = {};
  for (const e of evs) if (PROBLEM.test(e.ev || '')) { const k = e.kind ? `${e.ev} (${e.kind})` : e.ev; problems[k] = (problems[k] || 0) + 1; }
  const voices = {};
  for (const e of evs.filter((x) => x.ev === 'line_voice')) voices[e.src] = (voices[e.src] || 0) + 1;
  return {
    starts: count('start'), questions: count('turn'),
    wait: { median: median(waits), slowest: waits.length ? Math.max(...waits) : null },
    problems, voices,
    features: {
      'videos with a study page': new Set(evs.filter((e) => e.ev === 'study_open').map((e) => e.video)).size,
      'Analyze this video': count('study_analyzed'), 'quick checks finished': count('study_end'),
      'sidebar opened': evs.filter((e) => e.ev === 'sidebar' && e.open).length, 'lecture listening pieces': count('ear_sent'),
      'feedback sent': count('feedback_sent'), 'lessons saved': count('lesson_saved'),
    },
    ratings: { helpful: evs.filter((e) => e.ev === 'rating' && e.helpful).length, notHelpful: evs.filter((e) => e.ev === 'rating' && !e.helpful).length },
  };
}

const used = (s) => s.starts > 0 || s.questions > 0;

function reportText(day, s, { brain, version }) {
  const list = (o) => Object.entries(o).filter(([, n]) => n).map(([k, n]) => `${k}: ${n}`).join(', ') || 'none';
  return [
    `Day: ${day}`,
    `Nibley ${version}, brain: ${brain || 'claude'}`,
    `Started ${s.starts} times, ${s.questions} questions`,
    `Answer started after: ${secs(s.wait.median)} typical, ${secs(s.wait.slowest)} slowest`,
    `Problems: ${list(s.problems)}`,
    `Voices used (lines): ${list(s.voices)}`,
    `Features: ${list(s.features)}`,
    `Ratings: ${s.ratings.helpful} helpful, ${s.ratings.notHelpful} not helpful`,
  ].join('\n');
}

// Finished days with activity that weren't reported yet (oldest first, at most 3 per run).
function pendingDays(logDir, reported = [], today = new Date().toLocaleDateString('sv')) {
  let files = [];
  try { files = fs.readdirSync(logDir); } catch { return []; }
  return files.map((f) => (f.match(/^nibley-(\d{4}-\d{2}-\d{2})\.log$/) || [])[1]).filter(Boolean)
    .filter((d) => d < today && !reported.includes(d)).sort().slice(-3);
}

// settings: the app's settings object (consent, profile, installId, reportedDays). send(kind, message) -> {ok}.
async function sendDue({ settings, save, logDir, send, version, log = () => {} }) {
  if (settings.shareReports !== true) return 0;
  settings.installId ||= crypto.randomBytes(3).toString('hex');
  let sent = 0;
  if (settings.profile && !settings.profileSent) {
    const p = settings.profile;
    const r = await send('new user profile', [`Studying for: ${p.studying || 'skipped'}`, `Age range: ${p.age || 'skipped'}`, `Heard about Nibley from: ${p.heard || 'skipped'}`].join('\n'));
    if (r.ok) { settings.profileSent = true; save(); sent++; }
  }
  for (const day of pendingDays(logDir, settings.reportedDays || [])) {
    let text = '';
    try { text = fs.readFileSync(path.join(logDir, `nibley-${day}.log`), 'utf8'); } catch { continue; }
    const s = summarize(text);
    if (used(s)) {
      const r = await send('daily report', reportText(day, s, { brain: settings.brain, version }));
      log({ ev: 'report_sent', day, ok: r.ok });
      if (!r.ok) break; // offline: try again later
      sent++;
    }
    settings.reportedDays = [...(settings.reportedDays || []), day].slice(-14);
    save();
  }
  return sent;
}

// The exact text a report would have, for "See an example" (from the latest finished day, or an empty day).
function example(logDir, { brain, version }) {
  const day = pendingDays(logDir, []).at(-1);
  const s = summarize(day ? fs.readFileSync(path.join(logDir, `nibley-${day}.log`), 'utf8') : '');
  return reportText(day || new Date().toLocaleDateString('sv'), s, { brain, version });
}

module.exports = { summarize, reportText, pendingDays, sendDue, example };
