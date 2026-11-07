// Study library access (library/): topics, prerequisite graph and parsed teaching notes.
// loadLibrary() reads files; createLibrary() and parseNote() are pure.

const fs = require('fs');
const path = require('path');

const DEFAULT_DIR = path.join(__dirname, '..', '..', 'library');
const STOP = new Set('a an and are as at be by can do does for from how i if in into is it its me my of on or so than that the their then there this to was what when where which who why will with you your'.split(' '));

const tokens = (s) => (s.toLowerCase().match(/[\p{L}\p{N}]+/gu) || []).filter((w) => w.length > 1 && !STOP.has(w));
const stem = (w) => w.replace(/(ies|es|s|ing|ed)$/, '') || w;

function parseNote(md) {
  const lines = md.split(/\r?\n/);
  const title = (lines[0] || '').replace(/^#\s+/, '').trim();
  const sec = {};
  let cur = null;
  for (const line of lines.slice(1)) {
    const h = line.match(/^##\s+(.*?)\s*$/);
    if (h) sec[(cur = h[1])] = [];
    else if (cur && line.trim()) sec[cur].push(line);
  }
  const get = (k) => sec[k] || [];
  const bullets = (k) => get(k).map((l) => l.replace(/^-\s+/, '').trim());
  const checks = [];
  for (const l of get('Check questions')) {
    const q = l.match(/^\d+\.\s+(.*)$/);
    const a = l.match(/^\s+Answer:\s*(.*)$/);
    if (q) checks.push({ q: q[1].trim(), a: '' });
    else if (a && checks.length) checks[checks.length - 1].a = a[1].trim();
  }
  const flashcards = [];
  for (const l of get('Flashcards')) {
    if (/^Q:/.test(l)) flashcards.push({ q: l.slice(2).trim(), a: '' });
    else if (/^A:/.test(l) && flashcards.length) flashcards[flashcards.length - 1].a = l.slice(2).trim();
  }
  const rootChecks = [];
  for (const l of get('Root check')) {
    const m = l.match(/^-\s+([a-z0-9-]+):\s+(.*?)\s+Answer:\s*(.*)$/);
    if (m) rootChecks.push({ prereq: m[1], q: m[2].trim(), a: m[3].trim() });
  }
  return {
    title,
    idea: get('Simple idea').join(' ').trim(),
    formulas: bullets('Key formulas').filter((f) => !/^none\.?$/i.test(f)),
    picture: get('Picture it').map((l) => l.trim()),
    mistakes: bullets('Common mistakes'),
    checks,
    flashcards,
    rootChecks,
  };
}

function createLibrary(topics, readNote = () => null) {
  const byId = new Map(topics.map((t) => [t.id, t]));
  const dependents = new Map(topics.map((t) => [t.id, []]));
  for (const t of topics) for (const p of t.prereqs) if (dependents.has(p)) dependents.get(p).push(t.id);
  const noteCache = new Map();
  const depthCache = new Map();

  const get = (id) => byId.get(id) || null;
  const prereqs = (id) => (byId.get(id) ? byId.get(id).prereqs.filter((p) => byId.has(p)) : []);

  // Breadth-first closure, nearest first, the start topic excluded.
  const walk = (id, next) => {
    const seen = new Set([id]);
    const out = [];
    let frontier = [id];
    while (frontier.length) {
      const nextFrontier = [];
      for (const x of frontier) for (const y of next(x)) if (!seen.has(y)) { seen.add(y); out.push(y); nextFrontier.push(y); }
      frontier = nextFrontier;
    }
    return out;
  };
  const ancestors = (id) => walk(id, prereqs);
  const descendants = (id) => walk(id, (x) => dependents.get(x) || []);

  // Longest prerequisite chain down to a root (roots are 0).
  const depth = (id) => {
    if (depthCache.has(id)) return depthCache.get(id);
    const d = prereqs(id).reduce((m, p) => Math.max(m, depth(p) + 1), 0);
    depthCache.set(id, d);
    return d;
  };

  const note = (id) => {
    if (!noteCache.has(id)) {
      const md = byId.has(id) ? readNote(id) : null;
      noteCache.set(id, md ? parseNote(md) : null);
    }
    return noteCache.get(id);
  };

  // Questions that test topic `id`: root checks written in its dependents' notes first
  // (they were written to diagnose exactly this basic), then the topic's own check questions.
  const questionsFor = (id) => {
    const out = [];
    for (const d of dependents.get(id) || []) {
      const n = note(d);
      for (const r of n ? n.rootChecks : []) if (r.prereq === id) out.push({ topic: id, q: r.q, a: r.a, kind: 'root', source: d });
    }
    const own = note(id);
    for (const c of own ? own.checks : []) out.push({ topic: id, q: c.q, a: c.a, kind: 'check', source: id });
    return out;
  };

  const cardsFor = (id) => {
    const n = note(id);
    return n ? n.flashcards.map((c, i) => ({ id: `${id}#${i + 1}`, topic: id, q: c.q, a: c.a })) : [];
  };

  // Cheap keyword match from free text (a question, a video title) to topics. A prefilter:
  // the runtime model confirms the pick from this short list.
  const index = topics.map((t) => ({
    id: t.id,
    title: new Set(tokens(t.title).map(stem)),
    idw: new Set(t.id.split('-').filter((w) => !STOP.has(w)).map(stem)),
    summary: new Set(tokens(t.summary).map(stem)),
  }));
  const findTopics = (text, { limit = 5, subject } = {}) => {
    const words = new Set(tokens(text).map(stem));
    if (!words.size) return [];
    const scored = [];
    for (const e of index) {
      if (subject && byId.get(e.id).subject !== subject) continue;
      let score = 0;
      for (const w of words) score += (e.title.has(w) ? 3 : 0) + (e.idw.has(w) ? 2 : 0) + (e.summary.has(w) ? 1 : 0);
      if (score) scored.push({ id: e.id, score });
    }
    return scored.sort((a, b) => b.score - a.score || depth(a.id) - depth(b.id)).slice(0, limit);
  };

  return { topics, get, has: (id) => byId.has(id), prereqs, dependents: (id) => (dependents.get(id) || []).slice(), ancestors, descendants, depth, note, questionsFor, cardsFor, findTopics };
}

function loadLibrary(dir = DEFAULT_DIR) {
  const topics = JSON.parse(fs.readFileSync(path.join(dir, 'topics.json'), 'utf8'));
  const readNote = (id) => {
    try {
      return fs.readFileSync(path.join(dir, 'notes', `${id}.md`), 'utf8');
    } catch {
      return null;
    }
  };
  return createLibrary(topics, readNote);
}

module.exports = { loadLibrary, createLibrary, parseNote };
