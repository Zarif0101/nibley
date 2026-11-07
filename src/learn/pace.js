// Pace dials (LEARNING-ENGINE 4.3): words per line, lines per answer, speaking rate, pause after the key line. Pure.
// Spoken commands move a dial at once; indirect signals need 2 in the same direction within 7 days (guess).
// 14 days without any signal: every dial drifts one step back toward its start (guess).

const DIALS = {
  words: { min: 12, max: 20, start: 16, step: 2 },
  lines: { min: 3, max: 6, start: 4, step: 1 },
  rate: { min: -15, max: 10, start: 0, step: 5 }, // percent, sent to TTS
  pauseMs: { min: 0, max: 500, start: 200, step: 100 },
};
const EFFECTS = {
  slower: [['rate', -1], ['words', -1], ['pauseMs', 1]],
  faster: [['rate', 1], ['pauseMs', -1]],
  more: [['lines', 1], ['words', 1]],
  shorter: [['lines', -1]],
  again: [['rate', -1]],
  lost: [['words', -1]],
  'barge-in': [['lines', -1]],
  reask: [['words', -1]],
};
const EXPLICIT = new Set(['slower', 'faster', 'more', 'shorter', 'again']);
const DAY = 86400000;
const PARAMS = { indirectNeeded: 2, indirectWindowDays: 7, driftDays: 14 };

function createPace(now = Date.now()) {
  const s = { version: 1, pending: [], lastSignal: now };
  for (const [k, d] of Object.entries(DIALS)) s[k] = d.start;
  return s;
}

const clamp = (k, v) => Math.min(DIALS[k].max, Math.max(DIALS[k].min, v));
function apply(state, name) {
  const next = { ...state };
  for (const [k, dir] of EFFECTS[name]) next[k] = clamp(k, next[k] + dir * DIALS[k].step);
  return next;
}

function signal(state, name, { at = Date.now() } = {}) {
  if (!EFFECTS[name]) return state;
  if (EXPLICIT.has(name)) return { ...apply(state, name), lastSignal: at };
  const since = at - PARAMS.indirectWindowDays * DAY;
  const pending = [...state.pending.filter((p) => p.at >= since), { name, at }];
  const same = pending.filter((p) => p.name === name);
  if (same.length >= PARAMS.indirectNeeded) return { ...apply(state, name), pending: pending.filter((p) => p.name !== name), lastSignal: at };
  return { ...state, pending, lastSignal: at };
}

function drift(state, now = Date.now()) {
  if (now - state.lastSignal < PARAMS.driftDays * DAY) return state;
  const next = { ...state, lastSignal: now };
  for (const [k, d] of Object.entries(DIALS)) next[k] = next[k] === d.start ? d.start : next[k] + Math.sign(d.start - next[k]) * d.step;
  return next;
}

// Numbers for the prompt header and TTS.
function paceFor(state) {
  const { words, lines, rate, pauseMs } = state;
  return { words, lines, rate, pauseMs, rateText: `${rate >= 0 ? '+' : ''}${rate}%` };
}

module.exports = { DIALS, EFFECTS, PARAMS, createPace, signal, drift, paceFor };
