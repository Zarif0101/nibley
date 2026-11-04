// Gap finder: after he fails a topic, ask a few well-chosen questions on its prerequisites
// to find the weak basic (binary search on the prerequisite graph, max 6 questions: in a simulation over every
// topic and every one of its basics this finds the weak basic 100% of the time, 4.3 questions on average).
// A session is plain JSON and carries a snapshot of the graph, so answer() and
// applyGapFinder() need no library. Spec: README.md, research/2026-11-04-learner-model-gap-finder.md.

const { PARAMS, isKnown, observe, markKnown, openGap } = require('./model');

// Replay the answers: which suspects are still open, which topics passed or failed.
function replay(session) {
  let suspects = session.suspects.slice();
  const passed = new Set();
  const failed = new Set();
  for (const { topic, correct } of session.asked) {
    const anc = session.graph[topic].ancestors;
    if (correct) {
      passed.add(topic);
      suspects = suspects.filter((x) => x !== topic && !anc.includes(x));
    } else {
      failed.add(topic);
      suspects = suspects.filter((x) => anc.includes(x));
    }
  }
  return { suspects, passed, failed };
}

// The suspect that leaves the fewest suspects on average. With no evidence every basic is
// 50/50, all averages tie, and the tie-break (smallest worst case) turns it into a binary
// search that halves the suspects each question. Then the deeper topic.
function choose(session, suspects) {
  const EPS = 1e-9;
  let best = null;
  for (const s of suspects) {
    const anc = session.graph[s].ancestors;
    const failLeft = suspects.filter((x) => anc.includes(x)).length;
    const passLeft = suspects.filter((x) => x !== s && !anc.includes(x)).length;
    const p = session.p[s];
    const c = { s, cost: (1 - p) * failLeft + p * passLeft, worst: Math.max(failLeft, passLeft), depth: session.graph[s].depth };
    const better = !best || c.cost < best.cost - EPS || (Math.abs(c.cost - best.cost) <= EPS && (c.worst < best.worst || (c.worst === best.worst && (c.depth > best.depth || (c.depth === best.depth && s < best.s)))));
    if (better) best = c;
  }
  return best && best.s;
}

function startGapFinder(lib, state, failedTopic, { maxQuestions = 6 } = {}) {
  const ancestors = lib.ancestors(failedTopic);
  const unknown = ancestors.filter((id) => !isKnown(state, id));
  const suspects = unknown.filter((id) => lib.questionsFor(id).length > 0);
  const graph = {};
  const p = {};
  for (const id of [failedTopic, ...ancestors]) graph[id] = { ancestors: lib.ancestors(id), prereqs: lib.prereqs(id), depth: lib.depth(id) };
  // Unseen basics are 50/50 here: the model's low prior would make it test the deepest roots first.
  for (const id of ancestors) {
    const t = state.topics[id];
    p[id] = t && (t.seen > 0 || t.inferred) ? t.p : 0.5;
  }
  const known = ancestors.filter((id) => isKnown(state, id));
  return { failedTopic, maxQuestions, suspects, untested: unknown.filter((id) => !suspects.includes(id)), known, graph, p, asked: [] };
}

// Weak basic = lowest-depth failure whose own prerequisites did not fail.
function outcome(session) {
  const { suspects, passed, failed } = replay(session);
  const { failedTopic, graph } = session;
  const roots = [...failed].filter((f) => !graph[f].prereqs.some((q) => failed.has(q)));
  roots.sort((a, b) => graph[a].depth - graph[b].depth || (a < b ? -1 : 1));
  const weak = roots.length ? roots[0] : failedTopic;
  const cleared = new Set(session.known);
  for (const t of passed) for (const a of [t, ...graph[t].ancestors]) cleared.add(a);
  const rootCause = graph[weak].prereqs.every((q) => cleared.has(q));
  return { suspects, weak, rootCause, failed };
}

function nextStep(lib, state, session) {
  const { suspects, weak, rootCause } = outcome(session);
  const checked = session.asked.map((a) => ({ topic: a.topic, correct: a.correct }));
  if (!suspects.length || session.asked.length >= session.maxQuestions) {
    return { done: true, weak, rootCause, checked, untested: session.untested.slice() };
  }
  const ask = choose(session, suspects);
  const near = new Set([session.failedTopic, ...session.graph[session.failedTopic].ancestors]);
  const qs = lib.questionsFor(ask);
  const question = qs.find((q) => q.kind === 'root' && near.has(q.source)) || qs[0];
  return { done: false, ask, question };
}

function answer(session, correct) {
  if (typeof correct !== 'boolean') throw new Error('answer: correct must be true or false');
  const { suspects } = replay(session);
  if (!suspects.length || session.asked.length >= session.maxQuestions) throw new Error('answer: the gap finder is already done');
  return { ...session, asked: [...session.asked, { topic: choose(session, suspects), correct }] };
}

function applyGapFinder(state, session, { at = Date.now() } = {}) {
  let next = state;
  for (const a of session.asked) next = observe(next, a.topic, { correct: a.correct, at, kind: 'root-check' });
  const { failed, weak } = outcome(session);
  for (const a of session.asked) {
    if (!a.correct) continue;
    for (const anc of session.graph[a.topic].ancestors) if (!failed.has(anc)) next = markKnown(next, anc, { at });
  }
  if (failed.size) next = openGap(next, weak, { at, source: 'gap-finder', under: session.failedTopic });
  return next;
}

module.exports = { startGapFinder, nextStep, answer, applyGapFinder };
