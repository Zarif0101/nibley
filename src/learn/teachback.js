// Teach-it-back (brainstorm Q3, research/2026-11-04-quizzes-hints-teachback-confusion.md). Pure.
// He explains a topic out loud; one Haiku call grades his words against 3-5 pre-written key points (library/teachback.json):
// each point is fine, missing or wrong. Unclear counts as missing (never punish a vague answer as wrong).
// Nibley then says what he got right first and fixes at most 2 things: wrong points before missing ones.
const fs = require('node:fs');
const path = require('node:path');
const model = require('./model');
const { GRADE } = require('./fsrs');

const FILE = path.join(__dirname, '..', '..', 'library', 'teachback.json');
const VERDICTS = new Set(['fine', 'missing', 'wrong']);

function loadTeachback(file = FILE) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return {}; }
}

// The one instruction sent with his transcript. Points are numbered so the reply is easy to parse.
function teachbackPrompt(title, points, transcript) {
  const list = points.map((p, i) => `${i + 1}. ${p.must}${p.common_wrong ? ` (a common wrong idea: ${p.common_wrong})` : ''}`).join('\n');
  return [
    `He is explaining "${title}" in his own words. Grade only what he said against these key points:`,
    list,
    'Reply with exactly one line per point, nothing else: "<number> fine", "<number> missing" or "<number> wrong".',
    'fine = he said it, in any words. wrong = he said something that contradicts it. If unsure, say missing.',
    `His explanation: "${String(transcript).slice(0, 1500)}"`,
  ].join('\n');
}

// "1 fine\n2 wrong" -> ['fine', 'wrong', 'missing'] (one per point; anything unclear or absent = missing)
function parseVerdicts(text, n) {
  const out = Array(n).fill('missing');
  for (const line of String(text || '').split(/\r?\n/)) {
    const m = /^\s*(\d+)[.):\s-]*\s*(fine|missing|wrong)\b/i.exec(line);
    if (!m) continue;
    const i = Number(m[1]) - 1, v = m[2].toLowerCase();
    if (i >= 0 && i < n && VERDICTS.has(v)) out[i] = v;
  }
  return out;
}

// -> {correct, fine, missing, wrong (point indexes), score 0..1, grade 1..4, fixes: [≤ 2 lines]}
function gradeTeachback(verdicts, points) {
  const idx = (v) => verdicts.map((x, i) => (x === v ? i : -1)).filter((i) => i >= 0);
  const fine = idx('fine'), missing = idx('missing'), wrong = idx('wrong');
  const correct = wrong.length === 0 && missing.length <= Math.floor(points.length / 4); // all or nearly all, nothing wrong
  const grade = wrong.length ? GRADE.again : missing.length === 0 ? GRADE.good : correct ? GRADE.hard : GRADE.again;
  const fixes = [...wrong, ...missing].slice(0, 2).map((i) => points[i].fix);
  return { correct, fine, missing, wrong, score: points.length ? fine.length / points.length : 0, grade, fixes };
}

// Feed the learner model: a teach-back is a graded answer. A wrong point counts as "sure and wrong" (a misconception).
function applyTeachback(m, topic, result, { at = Date.now() } = {}) {
  return model.observe(m, topic, { correct: result.correct, at, kind: 'teach-back', sure: result.wrong.length ? true : undefined });
}

// What Nibley says back: right things first (short), then the fixes. ≤ 3 say lines.
function feedbackScript(result, points, title) {
  const lines = [];
  if (result.fine.length === points.length) lines.push(`say That's all of it. You explained ${title} clearly.`);
  else if (result.fine.length) lines.push(`say You got ${result.fine.length} of ${points.length} key ideas right.`);
  else lines.push(`say Good try. Let's fix the main idea first.`);
  for (const f of result.fixes) lines.push(`say ${f}`);
  lines.push(`title Teach-back: ${title}`);
  return lines.join('\n');
}

module.exports = { loadTeachback, teachbackPrompt, parseVerdicts, gradeTeachback, applyTeachback, feedbackScript };
