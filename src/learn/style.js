// Teaching-style picker (LEARNING-ENGINE 4.2, TEACHING-BIBLE section 2). Thompson sampling with guardrails. Pure.
// Each (kind, style) pair has two counts on top of a prior: a = answers that landed, b = answers that didn't.
// Picking draws a random number from Beta(a, b) per allowed style and takes the biggest, so styles that work
// get picked more and untried ones still get a chance. Mode "auto" is the default (Zarif, 2026-11-04, Q2).

const STYLES = ['doodle-story', 'board-builder', 'exam-coach', 'picture-first', 'question-buddy'];
const HOME = { concept: 'doodle-story', formula: 'board-builder', problem: 'exam-coach', visual: 'picture-first', check: 'question-buddy' };
const PARAMS = {
  homePrior: 1, // extra head start for the kind's home style; 1 = none (a head start made it slower to learn, simulated)
  exploreEvery: 5, // after warm-up: at most 1 exploring pick in this many picks (guess)
  minTries: 1, // every allowed style is tried this many times per kind before scores are trusted (tuned on simulated learners)
  decayPerDay: 0.02, // landed counts shrink 2% a day toward the prior: taste can change (guess)
  threadMs: 2 * 60e3, // follow-up on the same topic within this time keeps the style
  history: 50,
};
const DAY = 86400000;

const createStyleState = (now = Date.now()) => ({ version: 1, scores: {}, picks: [], outcomes: [], decayedAt: now });

function counts(state, kind, style) {
  const c = state.scores[kind]?.[style] || { a: 0, b: 0 };
  return { a: 1 + (HOME[kind] === style ? PARAMS.homePrior - 1 : 0) + c.a, b: 1 + c.b };
}
const mean = (c) => c.a / (c.a + c.b);
// Measured on simulated learners (test/learn-style.test.js): a hidden favourite that lands 80% vs 35% is picked
// ≥ 7 of answers 21-30 in ~87-89% of runs; exploring picks ~20% of 30 answers (first tries included).

// Gamma(shape) via Marsaglia-Tsang; shape < 1 uses the boost trick. rand: () => [0, 1).
function sampleGamma(shape, rand) {
  if (shape < 1) return sampleGamma(shape + 1, rand) * Math.pow(rand() || 1e-12, 1 / shape);
  const d = shape - 1 / 3, c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x, v;
    do {
      const u1 = rand() || 1e-12, u2 = rand();
      x = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      v = 1 + c * x;
    } while (v <= 0);
    v = v * v * v;
    const u = rand() || 1e-12;
    if (u < 1 - 0.0331 * x ** 4 || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}
function sampleBeta(a, b, rand = Math.random) {
  const x = sampleGamma(a, rand), y = sampleGamma(b, rand);
  return x / (x + y);
}

// Question Buddy only for check questions or topics he already knows a bit (never for a brand-new topic).
function allowedStyles(kind, level) {
  return STYLES.filter((s) => s !== 'question-buddy' || kind === 'check' || level === 'okay' || level === 'strong');
}

// opts: {mode: 'auto'|'fixed', fixed, request, level, last: {style, topic, at}, topic, now, rand}
// -> {style, explore, reason}
function pickStyle(state, kind, opts = {}) {
  const { mode = 'auto', fixed, request, level, last, topic, now = Date.now(), rand = Math.random } = opts;
  if (request && STYLES.includes(request)) return { style: request, explore: false, reason: 'asked' };
  if (mode === 'fixed' && STYLES.includes(fixed)) return { style: fixed, explore: false, reason: 'fixed' };
  if (last && last.style && topic && last.topic === topic && now - last.at <= PARAMS.threadMs) return { style: last.style, explore: false, reason: 'same-thread' };
  const allowed = allowedStyles(kind, level);
  const ofKind = state.picks.filter((p) => p.kind === kind);
  const untried = allowed.filter((s) => ofKind.filter((p) => p.style === s).length < PARAMS.minTries);
  if (untried.length) {
    const s = untried.includes(HOME[kind]) ? HOME[kind] : untried[Math.floor(rand() * untried.length)];
    return { style: s, explore: s !== HOME[kind], reason: 'first-tries' };
  }
  let best = null, bestTheta = -1, greedy = null, greedyMean = -1;
  for (const s of allowed) {
    const c = counts(state, kind, s), th = sampleBeta(c.a, c.b, rand), m = mean(c);
    if (th > bestTheta) { bestTheta = th; best = s; }
    if (m > greedyMean) { greedyMean = m; greedy = s; }
  }
  let explore = best !== greedy;
  if (explore && ofKind.slice(-(PARAMS.exploreEvery - 1)).some((p) => p.explore)) { best = greedy; explore = false; }
  return { style: best, explore, reason: explore ? 'explore' : 'best' };
}

const recordPick = (state, { kind, style, explore = false, at = Date.now() }) =>
  ({ ...state, picks: [...state.picks, { kind, style, explore, at }].slice(-PARAMS.history) });

// value 0..1: 1 landed, 0.5 probably landed, 0 didn't (LEARNING-ENGINE 4.2 "Did it land?").
function landed(state, { kind, style, value, at = Date.now() }) {
  const v = Math.min(1, Math.max(0, Number(value) || 0));
  const c = state.scores[kind]?.[style] || { a: 0, b: 0 };
  return {
    ...state,
    scores: { ...state.scores, [kind]: { ...state.scores[kind], [style]: { a: c.a + v, b: c.b + 1 - v } } },
    outcomes: [...state.outcomes, { kind, style, value: v, at }].slice(-PARAMS.history),
  };
}

function decay(state, now = Date.now()) {
  const days = Math.floor((now - state.decayedAt) / DAY);
  if (days < 1) return state;
  const f = Math.pow(1 - PARAMS.decayPerDay, days), scores = {};
  for (const [k, per] of Object.entries(state.scores)) {
    scores[k] = {};
    for (const [s, c] of Object.entries(per)) scores[k][s] = { a: c.a * f, b: c.b * f };
  }
  return { ...state, scores, decayedAt: state.decayedAt + days * DAY };
}

// Fixed mode: after 2 answers in a row on this kind that didn't land with this style, suggest the best other style.
function suggestSwitch(state, kind, style, level) {
  const recent = state.outcomes.filter((o) => o.kind === kind).slice(-2);
  if (recent.length < 2 || !recent.every((o) => o.style === style && o.value < 0.5)) return null;
  const others = allowedStyles(kind, level).filter((s) => s !== style);
  return others.sort((x, y) => mean(counts(state, kind, y)) - mean(counts(state, kind, x)))[0] || null;
}

module.exports = { STYLES, HOME, PARAMS, createStyleState, pickStyle, recordPick, landed, decay, suggestSwitch, sampleBeta, allowedStyles, counts };
