// Pause quizzes + hint ladder. Pure: state in, new state out, JSON-serialisable, no I/O.
// Research: research/2026-11-04-quizzes-hints-teachback-confusion.md. Numbers are starting guesses to tune.

const M = require('./model');

const PARAMS = {
  minGapMs: 3 * 60000, // no quiz sooner than this after the last quiz or the session start
  hourMs: 3600000, // rolling window for the cap
  maxPerHour: 4, // quizzes (shown, even if skipped) per rolling hour
  rapidMs: 3000, // a hint asked sooner than this after the last one is "rapid"
  maxLevel: 3,
};

const createQuizState = (sessionStart = Date.now()) => ({ version: 1, sessionStart, quizzes: [], asked: [] });

// Only at a natural segment end, not too soon, not over the hourly cap.
function shouldQuiz(qs, { now = Date.now(), segmentEnd = false } = {}) {
  if (!segmentEnd) return false;
  const last = qs.quizzes.length ? qs.quizzes[qs.quizzes.length - 1].at : qs.sessionStart;
  if (now - Math.max(last, qs.sessionStart) < PARAMS.minGapMs) return false;
  return qs.quizzes.filter((x) => now - x.at < PARAMS.hourMs).length < PARAMS.maxPerHour;
}

const key = (topic, q) => `${topic}|${q}`;

// The topic's own check questions not yet asked this session, then root checks (written in the
// topic's note) for its prerequisites, weakest first. null when nothing is left.
function pickQuestion(lib, model, qs, topic) {
  const fresh = (x) => !qs.asked.includes(key(x.topic, x.q));
  const own = lib.questionsFor(topic).find((x) => x.kind === 'check' && fresh(x));
  if (own) return own;
  const weakFirst = lib
    .prereqs(topic)
    .map((id, i) => ({ id, i, p: M.mastery(model, id).p }))
    .sort((a, b) => a.p - b.p || a.i - b.i);
  for (const { id } of weakFirst) {
    const root = lib.questionsFor(id).find((x) => x.kind === 'root' && x.source === topic && fresh(x));
    if (root) return root;
  }
  return null;
}

function recordQuiz(qs, { at = Date.now(), topic, q, correct, skipped = false }) {
  return {
    ...qs,
    quizzes: [...qs.quizzes, { at, topic, q, correct: skipped ? null : correct, skipped }],
    asked: [...qs.asked, key(topic, q)],
  };
}

// A second question only right after a wrong answer (not after a skip or a right answer).
function wantsFollowUp(qs) {
  const last = qs.quizzes[qs.quizzes.length - 1];
  return !!last && !last.skipped && last.correct === false;
}

// ---- hint ladder: 1 point to the idea, 2 show the first step, 3 the answer ----

const createHints = (question, at = Date.now()) => ({ question, level: 0, at, lastAt: at, rapid: false });

function nextHint(h, { at = Date.now() } = {}) {
  return { ...h, level: Math.min(PARAMS.maxLevel, h.level + 1), lastAt: at, rapid: h.level >= 1 && at - h.lastAt < PARAMS.rapidMs };
}

// 1 = Again, 2 = Hard, 3 = Good (for a right answer; a wrong answer is Again whatever the hints).
const hintGrade = (h) => (h.level >= PARAMS.maxLevel ? 1 : h.level >= 1 ? 2 : 3);

// Short instruction for the runtime model. Levels 1-2 never contain the answer.
function hintPrompt(lib, h) {
  if (h.level < 1) throw new Error('hintPrompt: no hint asked yet');
  const { q, a, topic } = h.question;
  const note = lib.note(topic);
  const lines = [`He is stuck on this question: ${q}`];
  if (note && note.idea) lines.push(`Idea behind it: ${note.idea}`);
  if (h.level === 1) {
    lines.push('Give hint 1: point to the idea or ask one cue question. No numbers, no steps, do not solve it. Keep it to two short sentences.');
  } else if (h.level === 2) {
    if (note && note.formulas.length) lines.push(`Useful formulas: ${note.formulas.join('; ')}`);
    lines.push('Give hint 2: show the setup or the first step only. Leave the calculation and the final answer to him. Keep it short.');
  } else {
    lines.push(`The answer is: ${a}`);
    lines.push('Give hint 3: say the answer, then one line on why it is true, then give a similar twin problem for him to try. No blame, keep it short.');
  }
  if (h.rapid) lines.push('He asked very quickly after the last hint. Answer calmly and slowly, and ask which part lost him.');
  return lines.join('\n');
}

module.exports = { PARAMS, createQuizState, shouldQuiz, pickQuestion, recordQuiz, wantsFollowUp, createHints, nextHint, hintGrade, hintPrompt };
