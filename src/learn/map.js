// Knowledge map data: a small neighbourhood (or one subject) with levels, one "ready to learn"
// topic and a short plain "why" line per node. Pure; no percentages anywhere.

const model = require('./model');

const LEVELS = ['not-started', 'shaky', 'okay', 'strong'];
const SOLID = new Set(['okay', 'strong']);

// Topics within `n` steps from `id` along `next`, nearest first.
function within(id, n, next) {
  const seen = new Set([id]);
  const out = [];
  let frontier = [id];
  for (let i = 0; i < n && frontier.length; i++) {
    const nf = [];
    for (const x of frontier) for (const y of next(x)) if (!seen.has(y)) { seen.add(y); out.push(y); nf.push(y); }
    frontier = nf;
  }
  return out;
}

const emptyCounts = () => Object.fromEntries(LEVELS.map((l) => [l, 0]));

function why(lib, state, id, level, now) {
  const g = state.gaps[id];
  const t = state.topics[id];
  const title = (x) => (lib.get(x) ? lib.get(x).title : x);
  if (g && g.status === 'open') return g.under && lib.has(g.under) ? `Gap found while studying ${title(g.under)}` : 'Gap found, worth another look';
  if (level === 'strong') return `Right on ${t.days.length} different days`;
  if (level === 'okay') return t.inferred ? 'Worked out from a harder topic you passed' : t.p >= model.PARAMS.known ? 'Going well, one more good day makes it strong' : 'Going well, keep practising';
  if (level === 'shaky') return t && t.misconception ? 'Sure but wrong last time, worth a look' : 'Missed lately, worth another go';
  const need = lib.prereqs(id).find((p) => !SOLID.has(model.level(state, p, { now })));
  return need ? `Needs ${title(need)} first` : 'Not started yet, ready when you are';
}

function knowledgeMap(lib, state, { focus, subject, now = Date.now(), down = 2, up = 1 } = {}) {
  let ids;
  if (focus) {
    if (!lib.has(focus)) throw new Error(`knowledgeMap: unknown topic ${focus}`);
    ids = [focus, ...within(focus, down, lib.prereqs), ...within(focus, up, lib.dependents)];
  } else {
    ids = lib.topics.filter((t) => !subject || t.subject === subject).map((t) => t.id);
  }
  const inView = new Set(ids);
  const levels = new Map(ids.map((id) => [id, model.level(state, id, { now })]));

  const nodes = ids.map((id) => {
    const level = levels.get(id);
    const g = state.gaps[id];
    const t = state.topics[id];
    return {
      id,
      title: lib.get(id).title,
      subject: lib.get(id).subject,
      level,
      gap: !!(g && g.status === 'open'),
      inferred: !!(t && t.inferred),
      why: why(lib, state, id, level, now),
    };
  });

  const edges = [];
  for (const id of ids) for (const p of lib.prereqs(id)) if (inView.has(p)) edges.push({ from: p, to: id });

  // Not-started or shaky, and every prerequisite okay/strong. Open gaps first, then the most basic.
  const ready = nodes
    .filter((n) => (n.level === 'not-started' || n.level === 'shaky') && lib.prereqs(n.id).every((p) => SOLID.has(model.level(state, p, { now }))))
    .sort((a, b) => Number(b.gap) - Number(a.gap) || lib.depth(a.id) - lib.depth(b.id) || (a.id < b.id ? -1 : 1));

  const counts = emptyCounts();
  for (const n of nodes) counts[n.level]++;
  return { nodes, edges, readyToLearn: ready.length ? ready[0].id : null, counts };
}

function subjectSummary(lib, state, { now = Date.now() } = {}) {
  const out = {};
  for (const t of lib.topics) {
    if (!out[t.subject]) out[t.subject] = emptyCounts();
    out[t.subject][model.level(state, t.id, { now })]++;
  }
  return out;
}

module.exports = { knowledgeMap, subjectSummary };
