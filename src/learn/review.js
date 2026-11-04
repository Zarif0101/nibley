// Daily review queue (~5 min on app start) and answer handling. Pure: state in, new state out.
// Order: due cards (lowest retrievability first), weak-basic questions, then new cards.

const fsrs = require('./fsrs');
const M = require('./model');

const BACKLOG_FRESH_START = 60; // (guess)

// `cards` may be an array or an id -> card map.
const cardList = (cards) => (Array.isArray(cards) ? cards : Object.values(cards || {}));

// Open gaps (oldest first), then misconceptions, then shaky topics. Topics with no question are skipped.
function weakTopics(lib, model, now) {
  const ids = [];
  const add = (id) => { if (!ids.includes(id) && lib.has(id)) ids.push(id); };
  for (const g of M.gaps(model)) add(g.id);
  for (const [id, t] of Object.entries(model.topics)) if (t.misconception) add(id);
  for (const id of Object.keys(model.topics)) if (M.level(model, id, { now }) === 'shaky') add(id);
  return ids;
}

// Topics he has touched, most recent first, whose flashcards have no card yet.
// One card per topic per round, so new cards spread across topics.
function newCards(lib, model, have, now) {
  const touched = (t) => Math.max(t.last || 0, t.lastAsked || 0);
  const ids = Object.keys(model.topics).sort((a, b) => touched(model.topics[b]) - touched(model.topics[a]));
  const lists = ids.map((id) => lib.cardsFor(id).filter((c) => !have.has(c.id)));
  const out = [];
  for (let round = 0; lists.some((l) => l.length > round); round++) {
    for (const l of lists) if (l[round]) out.push(fsrs.createCard(l[round].id, l[round].topic, now));
  }
  return out;
}

// Reorder so no two neighbours share a topic when another order exists. Keeps the original
// priority order as far as possible (depth-first, first choice = earliest item).
function interleave(items) {
  const topicOf = (it) => (it.type === 'card' ? it.card.topic : it.topic);
  const n = items.length;
  const used = new Array(n).fill(false);
  const out = [];
  let budget = 20000;
  const go = () => {
    if (out.length === n) return true;
    if (budget-- <= 0) return false;
    const prev = out.length ? topicOf(out[out.length - 1]) : null;
    for (let i = 0; i < n; i++) {
      if (used[i] || topicOf(items[i]) === prev) continue;
      used[i] = true;
      out.push(items[i]);
      if (go()) return true;
      out.pop();
      used[i] = false;
    }
    return false;
  };
  if (go()) return out;
  // No clash-free order (or search budget spent): keep priority order, best-effort spread.
  const rest = items.slice();
  const res = [];
  while (rest.length) {
    const prev = res.length ? topicOf(res[res.length - 1]) : null;
    const i = rest.findIndex((it) => topicOf(it) !== prev);
    res.push(...rest.splice(i < 0 ? 0 : i, 1));
  }
  return res;
}

function buildQueue(lib, model, cards, { now = Date.now(), size = 10, maxNew = 2, maxWeak = 3 } = {}) {
  const all = cardList(cards);
  const due = all
    .filter((c) => c.state !== 'new' && c.due <= now)
    .map((c) => ({ c, r: fsrs.retrievability(c, now) }))
    .sort((a, b) => a.r - b.r || a.c.due - b.c.due)
    .map((x) => x.c);

  const weak = [];
  for (const topic of weakTopics(lib, model, now)) {
    if (weak.length >= maxWeak) break;
    const qs = lib.questionsFor(topic);
    if (!qs.length) continue;
    const q = qs[(model.topics[topic] ? model.topics[topic].seen : 0) % qs.length];
    weak.push({ type: 'root', topic, question: q });
  }

  // Weak slots are reserved so a big backlog cannot crowd them out; new cards only fill what is left.
  const dueItems = due.slice(0, Math.max(0, size - weak.length)).map((card) => ({ type: 'card', card }));
  const weakItems = weak.slice(0, Math.max(0, size - dueItems.length));
  const room = size - dueItems.length - weakItems.length;
  const have = new Set(all.map((c) => c.id));
  const fresh = newCards(lib, model, have, now).slice(0, Math.max(0, Math.min(maxNew, room)));
  // Unreviewed cards already stored as 'new' count as new cards too, ahead of freshly made ones.
  const stored = all.filter((c) => c.state === 'new').slice(0, Math.max(0, Math.min(maxNew, room)));
  const newItems = [...stored, ...fresh].slice(0, Math.max(0, Math.min(maxNew, room))).map((card) => ({ type: 'card', card }));

  const backlog = due.length - dueItems.length;
  return { items: interleave([...dueItems, ...weakItems, ...newItems]), backlog, freshStart: backlog > BACKLOG_FRESH_START };
}

// judgement: {correct, hintLevel, sure, tooEasy} as judged by the runtime model.
function answerItem(lib, { model, cards }, item, judgement, { at = Date.now() } = {}) {
  const correct = !!judgement.correct && !((judgement.hintLevel || 0) >= 3);
  const observed = (topic) => M.observe(model, topic, { correct, at, sure: judgement.sure, kind: 'review' });
  if (item.type === 'root') return { model: observed(item.topic), cards };
  const next = fsrs.rate(item.card, fsrs.gradeFromAnswer(judgement), at);
  const list = cardList(cards);
  const known = list.some((c) => c.id === next.id);
  return {
    model: observed(item.card.topic),
    cards: known ? list.map((c) => (c.id === next.id ? next : c)) : [...list, next],
  };
}

module.exports = { buildQueue, answerItem, BACKLOG_FRESH_START };
