// Check the basics before a video: a few root questions on unknown prerequisites (graded),
// and a few warm-up questions from the video's own topics (pretesting, never graded).

const model = require('./model');

const RANK = { shaky: 0, 'not-started': 1, okay: 2, strong: 3 };

// Prerequisites up to 2 levels down from the video topics, nearest first, video topics excluded.
function basics(lib, topicIds) {
  const seen = new Set(topicIds);
  const out = [];
  let frontier = topicIds;
  for (let i = 0; i < 2; i++) {
    const nf = [];
    for (const x of frontier) for (const p of lib.prereqs(x)) if (!seen.has(p)) { seen.add(p); out.push(p); nf.push(p); }
    frontier = nf;
  }
  return out;
}

function preVideoCheck(lib, state, topicIds, { maxRoot = 3, maxWarmup = 3, now = Date.now() } = {}) {
  const ids = topicIds.filter((id) => lib.has(id));
  const rank = (id) => {
    const g = state.gaps[id];
    return g && g.status === 'open' ? -1 : RANK[model.level(state, id, { now })];
  };
  const roots = basics(lib, ids)
    .filter((id) => RANK[model.level(state, id, { now })] < RANK.okay) // okay or strong: don't nag before every video
    .map((id) => ({ id, q: lib.questionsFor(id)[0] }))
    .filter((c) => c.q)
    .sort((a, b) => rank(a.id) - rank(b.id) || lib.depth(a.id) - lib.depth(b.id))
    .slice(0, Math.max(0, maxRoot))
    .map((c) => ({ topic: c.id, q: c.q.q, a: c.q.a, kind: 'root' }));

  // Round-robin over the video topics so one topic does not take every slot.
  const lists = ids.map((id) => lib.questionsFor(id).filter((x) => x.kind === 'check' && x.source === id));
  const warmups = [];
  for (let i = 0; warmups.length < maxWarmup && lists.some((l) => i < l.length); i++) {
    for (const l of lists) if (i < l.length && warmups.length < maxWarmup) warmups.push({ topic: l[i].topic, q: l[i].q, a: l[i].a, kind: 'warmup' });
  }
  return { roots, warmups, skip: roots.length === 0 && warmups.length === 0 };
}

// answers: [{topic, kind: 'root' | 'warmup', correct, sure?}]. Warm-up answers change nothing.
function applyPreVideo(state, answers, { at = Date.now() } = {}) {
  return answers
    .filter((a) => a.kind === 'root' && typeof a.correct === 'boolean')
    .reduce((s, a) => model.observe(s, a.topic, { correct: a.correct, sure: a.sure, at, kind: 'pre-video' }), state);
}

module.exports = { preVideoCheck, applyPreVideo };
