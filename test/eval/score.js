// Eval scores S1-S7 for one answer script (LEARNING-ENGINE section 6). Pure: script text + question item in, scores out.
// null = the check doesn't apply to this question (e.g. no target box). Score = average of the checks that apply.
const { parseAll } = require('../../src/script');
const { FILLER, BANNED } = require('../../src/lint');

const MARKS = new Set(['note', 'ring', 'point', 'arrow', 'highlight', 'label', 'step']);
const TOL = 30;
const words = (s) => s.trim().split(/\s+/).filter(Boolean).length;
const inBox = ([x, y], [bx, by, bw, bh]) => x >= bx - TOL && x <= bx + bw + TOL && y >= by - TOL && y <= by + bh + TOL;
function points(c) {
  if (c.type === 'arrow') return [[c.x1, c.y1], [c.x2, c.y2]];
  if (c.type === 'highlight' || c.type === 'note') return [[c.x + c.w / 2, c.y + c.h / 2]];
  return [[c.x, c.y]];
}

const SHAPES = {
  'doodle-story': (cmds, says) => says.some((s) => /\b(think of|imagine|picture|like a|story)\b/i.test(s.text)),
  'board-builder': (cmds, says) => cmds.filter((c) => c.type === 'step').length >= 2 || (says.length >= 3 && cmds.some((c) => c.type === 'ring')),
  'exam-coach': (cmds, says) => says.some((s) => /\b(trap|mistake|careful|watch out)\b/i.test(s.text)),
  'picture-first': (cmds) => {
    const firstMark = cmds.findIndex((c) => MARKS.has(c.type));
    const formula = cmds.findIndex((c) => c.type === 'say' && /=/.test(c.text));
    const secondSay = cmds.map((c, i) => [c, i]).filter(([c]) => c.type === 'say')[1]?.[1] ?? Infinity;
    return firstMark >= 0 && firstMark < (formula >= 0 ? formula : secondSay);
  },
  'question-buddy': (cmds, says) => says.length > 0 && /\?\s*$/.test(says[says.length - 1].text),
};

function scoreScript(text, item) {
  const cmds = parseAll(String(text || ''));
  const says = cmds.filter((c) => c.type === 'say');
  const first = cmds.find((c) => c.type !== 'title');
  const s = {};
  s.S1 = first && first.type === 'say' && words(first.text) <= 15 && !FILLER.test(first.text) ? 1 : 0;
  s.S2 = says.length >= 1 && says.length <= 5 && says.every((l) => words(l.text) <= 20) ? 1 : 0;
  s.S3 = item.box ? (cmds.filter((c) => MARKS.has(c.type)).some((c) => points(c).some((p) => item.box.some((b) => inBox(p, b)))) ? 1 : 0) : null;
  s.S4 = item.kind === 'concept' ? (says.some((l) => /\b(like|think of|imagine|picture)\b/i.test(l.text)) ? 1 : 0) : null;
  const said = says.map((l) => l.text.toLowerCase()).join(' ');
  s.S5 = item.mustMention && item.mustMention.length ? (item.mustMention.every((m) => said.includes(m.toLowerCase())) ? 1 : 0) : null;
  s.S6 = item.style && SHAPES[item.style] ? (SHAPES[item.style](cmds, says) ? 1 : 0) : null;
  s.S7 = says.some((l) => BANNED.test(l.text)) ? 0 : 1;
  const vals = Object.values(s).filter((v) => v !== null);
  return { ...s, score: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0, bad: cmds.filter((c) => c.type === 'bad' || c.prose).length };
}

// results: [{id, script, scores}] -> {scores: {S1..S7: mean over items where it applies}, score: mean of item scores}
function summarize(results) {
  const keys = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7'], scores = {};
  for (const k of keys) {
    const v = results.map((r) => r.scores[k]).filter((x) => x !== null && x !== undefined);
    scores[k] = v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 1000) / 1000 : null;
  }
  const score = results.length ? Math.round((results.reduce((a, r) => a + r.scores.score, 0) / results.length) * 1000) / 1000 : 0;
  return { scores, score };
}

module.exports = { scoreScript, summarize, SHAPES };
