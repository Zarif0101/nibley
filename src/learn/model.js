// Learner model + gap tracker. Pure: state in, new state out, JSON-serialisable, no I/O.
// One score per topic, P(known), updated by Bayesian Knowledge Tracing with hand-set
// parameters (research/2026-11-04-learner-model-gap-finder.md; starting guesses, tune on real data).
// Only graded answers move the score. Asking about a topic only marks it "worth checking".

const PARAMS = {
  prior: 0.3, // P(known) before any evidence
  learn: 0.15, // chance of learning it at each graded attempt
  guess: 0.25, // right answer without knowing it
  guessUnsure: 0.4, // ... when he said he was not sure
  slip: 0.1, // wrong answer despite knowing it
  inferred: 0.8, // score given to a basic that a passed check implies
  known: 0.85, // at or above: counts as known
  shaky: 0.5, // below: shaky
  staleDays: 45, // no evidence for this long: "strong" drops to "okay"
};

const DAY = 86400000;
const dayKey = (at) => new Date(at).toISOString().slice(0, 10);

const createModel = () => ({ version: 1, topics: {}, gaps: {} });

const topicState = (state, id) => state.topics[id] || { p: PARAMS.prior, seen: 0, right: 0, days: [], last: null, asked: 0, inferred: false, misconception: false };

function bkt(p, correct, guess) {
  const { slip, learn } = PARAMS;
  const post = correct ? (p * (1 - slip)) / (p * (1 - slip) + (1 - p) * guess) : (p * slip) / (p * slip + (1 - p) * (1 - guess));
  return post + (1 - post) * learn;
}

function withTopic(state, id, t) {
  return { ...state, topics: { ...state.topics, [id]: t } };
}

function withGap(state, id, g) {
  return { ...state, gaps: { ...state.gaps, [id]: g } };
}

// A graded answer about topic `id`. sure: true | false | undefined (not asked).
function observe(state, id, { correct, at = Date.now(), sure, kind = 'answer' } = {}) {
  if (typeof correct !== 'boolean') throw new Error('observe: correct must be true or false');
  const t = topicState(state, id);
  const guess = correct && sure === false ? PARAMS.guessUnsure : PARAMS.guess;
  const day = dayKey(at);
  const next = {
    ...t,
    p: bkt(t.p, correct, guess),
    seen: t.seen + 1,
    right: t.right + (correct ? 1 : 0),
    days: correct && !t.days.includes(day) ? [...t.days, day].slice(-10) : t.days,
    last: at,
    lastKind: kind,
    inferred: false,
    misconception: correct ? (sure === true ? false : t.misconception) : sure === true ? true : t.misconception,
  };
  return trackGap(withTopic(state, id, next), id, { correct, at });
}

// Gap bookkeeping after an answer: close when fixed, reopen when it comes back.
function trackGap(state, id, { correct, at }) {
  const g = state.gaps[id];
  if (!g) return state;
  const t = state.topics[id];
  if (g.status === 'open' && correct && t.p >= PARAMS.known && dayKey(at) > dayKey(g.openedAt)) {
    return withGap(state, id, { ...g, status: 'closed', closedAt: at, history: [...g.history, { at, event: 'close', why: 'answered right on a later day' }] });
  }
  if (g.status === 'closed' && !correct && t.p < PARAMS.shaky) {
    return withGap(state, id, { ...g, status: 'open', openedAt: at, closedAt: null, history: [...g.history, { at, event: 'reopen', why: 'wrong again after it was fixed' }] });
  }
  return state;
}

// The gap finder (or a failed root check) found that `id` is a weak basic.
function openGap(state, id, { at = Date.now(), source = 'gap-finder', why = '', under } = {}) {
  const g = state.gaps[id];
  if (g && g.status === 'open') return state;
  const event = g ? 'reopen' : 'open';
  return withGap(state, id, {
    status: 'open',
    openedAt: at,
    closedAt: null,
    source,
    under: under || (g && g.under) || null,
    history: [...(g ? g.history : []), { at, event, why: why || source }],
  });
}

// A passed check on a harder topic implies this basic is known: raise it, mark as inferred.
function markKnown(state, id, { at = Date.now() } = {}) {
  const t = topicState(state, id);
  if (t.p >= PARAMS.inferred) return state;
  return withTopic(state, id, { ...t, p: PARAMS.inferred, inferred: t.seen === 0, last: t.last || at });
}

// He asked about the topic (chat, hotkey). Not evidence of a gap.
function noteAsked(state, id, { at = Date.now() } = {}) {
  const t = topicState(state, id);
  return withTopic(state, id, { ...t, asked: t.asked + 1, lastAsked: at });
}

// not-started | shaky | okay | strong
function level(state, id, { now = Date.now() } = {}) {
  const t = state.topics[id];
  const g = state.gaps[id];
  if (g && g.status === 'open') return 'shaky';
  if (!t || (t.seen === 0 && !t.inferred)) return 'not-started';
  if (t.p < PARAMS.shaky || t.misconception) return 'shaky';
  const fresh = t.last !== null && now - t.last <= PARAMS.staleDays * DAY;
  if (t.p >= PARAMS.known && t.days.length >= 2 && fresh) return 'strong';
  return 'okay';
}

function mastery(state, id, opts) {
  const t = topicState(state, id);
  const g = state.gaps[id];
  return { id, p: t.p, level: level(state, id, opts), seen: t.seen, inferred: t.inferred, misconception: t.misconception, asked: t.asked, gap: g ? g.status : null };
}

const isKnown = (state, id) => topicState(state, id).p >= PARAMS.known;

function gaps(state, { status = 'open' } = {}) {
  return Object.entries(state.gaps)
    .filter(([, g]) => status === 'all' || g.status === status)
    .map(([id, g]) => ({ id, ...g }))
    .sort((a, b) => a.openedAt - b.openedAt);
}

// Asked about at least twice but never graded right: offer a quick check, never mark a gap.
function worthChecking(state) {
  return Object.entries(state.topics)
    .filter(([, t]) => t.asked >= 2 && t.right === 0)
    .map(([id]) => id);
}

module.exports = { PARAMS, createModel, observe, openGap, markKnown, noteAsked, level, mastery, isKnown, gaps, worthChecking, dayKey };
